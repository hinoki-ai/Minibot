/*
 * Conservative AoE solver. It explains every cast/skip decision and avoids any
 * tile that would include players or no-AoE route zones.
 */

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sameFloor(left = null, right = null) {
  return left && right && Number(left.z) === Number(right.z);
}

function getDistance(left = null, right = null) {
  if (!sameFloor(left, right)) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(Number(left.x) - Number(right.x)), Math.abs(Number(left.y) - Number(right.y)));
}

function normalizeNameSet(value = []) {
  return new Set((Array.isArray(value) ? value : String(value ?? "").split(/[\n,;]+/g))
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean));
}

function tileKey(position = null) {
  return position ? `${Math.trunc(Number(position.x))},${Math.trunc(Number(position.y))},${Math.trunc(Number(position.z))}` : "";
}

export function solveAoeAction(snapshot = {}, rule = {}, {
  now = Date.now(),
  lastCastAt = 0,
  noAoeZones = [],
} = {}) {
  if (!snapshot?.ready) {
    return { ok: false, reason: "snapshot not ready" };
  }

  const words = normalizeText(rule.words || rule.runeName || rule.hotkey);
  if (!words) {
    return { ok: false, reason: "missing AoE spell or rune" };
  }

  const playerStats = snapshot.playerStats || {};
  const manaPercent = normalizeNumber(playerStats.manaPercent ?? playerStats.mpPercent, 100);
  if (manaPercent < normalizeNumber(rule.minManaPercent, 0)) {
    return { ok: false, reason: "skip due mana" };
  }

  const cooldownMs = Math.max(0, normalizeNumber(rule.cooldownMs, 0));
  if (now - normalizeNumber(lastCastAt, 0) < cooldownMs) {
    return { ok: false, reason: "skip due cooldown" };
  }

  const playerPosition = snapshot.playerPosition || null;
  const allowedNames = normalizeNameSet(rule.monsterNames || rule.targetNames || []);
  const radius = Math.max(1, Math.trunc(normalizeNumber(rule.radius, 2)));
  const maxDistance = Math.max(radius, Math.trunc(normalizeNumber(rule.maxDistance, 5)));
  const minCount = Math.max(1, Math.trunc(normalizeNumber(rule.minTargetCount, 2)));
  const candidates = (Array.isArray(snapshot.visibleCreatures) ? snapshot.visibleCreatures : [])
    .filter((entry) => entry?.position && sameFloor(playerPosition, entry.position))
    .filter((entry) => !allowedNames.size || allowedNames.has(normalizeText(entry?.name).toLowerCase()))
    .filter((entry) => getDistance(playerPosition, entry.position) <= maxDistance)
    .filter((entry) => entry?.reachableForCombat !== false);

  if (!candidates.length) {
    return { ok: false, reason: "skip due count", count: 0 };
  }

  const noAoeKeys = new Set((Array.isArray(noAoeZones) ? noAoeZones : [])
    .map((position) => tileKey(position))
    .filter(Boolean));
  const players = Array.isArray(snapshot.visiblePlayers) ? snapshot.visiblePlayers : [];
  let best = null;

  for (const center of candidates) {
    const centerKey = tileKey(center.position);
    if (noAoeKeys.has(centerKey)) {
      continue;
    }
    const hitTargets = candidates.filter((entry) => getDistance(center.position, entry.position) <= radius);
    const hitPlayers = players.filter((entry) => getDistance(center.position, entry.position) <= radius);
    if (rule.playerSafe !== false && hitPlayers.length) {
      continue;
    }
    const routeBlocked = (Array.isArray(rule.noAoeZones) ? rule.noAoeZones : [])
      .some((position) => getDistance(center.position, position) <= radius);
    if (routeBlocked) {
      continue;
    }
    const blockedOwnership = hitTargets.some((entry) => entry?.blockedBySharedSpawn || entry?.ownedByOther);
    if (blockedOwnership && rule.respectOwnership !== false) {
      continue;
    }
    const score = hitTargets.length * 100 - getDistance(playerPosition, center.position) * 5;
    if (!best || score > best.score) {
      best = {
        center: center.position,
        score,
        hitTargets,
        hitPlayers,
      };
    }
  }

  if (!best) {
    if (players.some((entry) => candidates.some((candidate) => getDistance(candidate.position, entry.position) <= radius))) {
      return { ok: false, reason: "skip due player" };
    }
    if (candidates.some((candidate) => noAoeKeys.has(tileKey(candidate.position)))) {
      return { ok: false, reason: "skip due route tile rule" };
    }
    return { ok: false, reason: "skip due no safe tile" };
  }

  if (best.hitTargets.length < minCount) {
    return { ok: false, reason: "skip due count", count: best.hitTargets.length };
  }

  return {
    ok: true,
    reason: "cast",
    action: {
      type: rule.hotkey ? "useHotkey" : "cast",
      moduleKey: "aoeSolver",
      words: rule.hotkey ? "" : words,
      hotkey: normalizeText(rule.hotkey),
      targetPosition: best.center,
      label: normalizeText(rule.label || words),
    },
    targetCount: best.hitTargets.length,
    targets: best.hitTargets.map((entry) => ({ id: entry.id ?? null, name: normalizeText(entry.name), position: entry.position })),
    center: best.center,
  };
}
