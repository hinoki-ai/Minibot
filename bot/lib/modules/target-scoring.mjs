/*
 * Transparent target scoring helpers. Runtime-specific callers provide target
 * facts; this module keeps the explanation shape stable for UI and tests.
 */

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePosition(position = null) {
  if (!position || typeof position !== "object") return null;
  const x = Number(position.x);
  const y = Number(position.y);
  const z = Number(position.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return { x: Math.trunc(x), y: Math.trunc(y), z: Math.trunc(z) };
}

function getDistance(left = null, right = null) {
  if (!left || !right || Number(left.z) !== Number(right.z)) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(Number(left.x) - Number(right.x)), Math.abs(Number(left.y) - Number(right.y)));
}

export function resolveTargetMovementIntent({
  profile = null,
  distanceKeeperAction = null,
  currentDistance = null,
  routeRole = "",
  supportRole = "",
} = {}) {
  const behavior = normalizeText(profile?.behavior).toLowerCase();
  const routeRoleKey = normalizeText(routeRole || supportRole).toLowerCase();
  const keeperReason = normalizeText(distanceKeeperAction?.reason).toLowerCase();

  if (routeRoleKey.includes("assist")) return "assist";
  if (behavior === "escape" || keeperReason === "escape") return "escape";
  if (behavior === "kite" || keeperReason === "retreat") return "kite";
  if (keeperReason === "dodge") return "diagonal";
  if (keeperReason === "approach") return "approach";
  if (Number(profile?.keepDistanceMin) > 0 || Number(profile?.keepDistanceMax) > 0) return "distance";
  if (Number.isFinite(Number(currentDistance)) && Number(currentDistance) > 1) return "chase";
  if (behavior === "hold") return "hold";
  return "lure";
}

export function buildTargetScoreBreakdown(entry = {}, {
  profile = null,
  playerPosition = null,
  currentTargetId = null,
  sharedSpawnBlocked = false,
  routeRole = "",
  reachable = true,
  targetCount = 1,
  ownership = "",
  baseThreatScore = 0,
} = {}) {
  const targetPosition = normalizePosition(entry?.position);
  const currentPosition = normalizePosition(playerPosition);
  const range = getDistance(currentPosition, targetPosition);
  const healthPercent = normalizeNumber(entry?.healthPercent, 100);
  const factors = [];
  const add = (name, value, reason) => {
    const score = Math.trunc(normalizeNumber(value));
    factors.push({ name, value: score, reason: normalizeText(reason) });
    return score;
  };

  let score = 0;
  const profilePriority = Math.max(0, normalizeNumber(profile?.priority));
  if (profilePriority) score += add("profile-order", profilePriority * 1000, "target profile priority");
  const danger = Math.max(0, normalizeNumber(profile?.dangerLevel));
  if (danger) score += add("danger", danger * 260, "profile danger level");
  const killMode = normalizeText(profile?.killMode || "normal").toLowerCase();
  if (killMode === "asap") score += add("kill-mode", 1200, "asap profile");
  if (killMode === "last") score += add("kill-mode", -1200, "last profile");
  if (Number(entry?.id) === Number(currentTargetId) && profile?.stickToTarget !== false) {
    score += add("stickiness", 4200, "current target stickiness");
  }
  if (entry?.isShootable === false && profile?.preferShootable !== false) {
    score += add("reachability", -600, "line is not shootable");
  }
  if (reachable === false || entry?.reachableForCombat === false) {
    score += add("reachability", -2000, "target is not reachable");
  }
  if (sharedSpawnBlocked) {
    score += add("ownership", -5000, "shared-spawn policy blocked target");
  } else if (ownership) {
    score += add("ownership", 120, ownership);
  }
  score += add("hp", Math.round((100 - healthPercent) * 4), "lower HP is easier to finish");
  score += add("threat", baseThreatScore, "monster threat score");
  score += add("distance", -Math.round((Number.isFinite(range) ? range : 999) * 60), "distance from character");
  score += add("target-count", Math.max(0, targetCount - 1) * 40, "nearby target pressure");
  if (normalizeText(routeRole)) {
    score += add("route-role", /assist|guard|sweeper/i.test(routeRole) ? 180 : 0, `route role ${routeRole}`);
  }

  const skippedReasons = [];
  if (sharedSpawnBlocked) skippedReasons.push("shared-spawn policy");
  if (reachable === false || entry?.reachableForCombat === false) skippedReasons.push("unreachable");
  if (!targetPosition) skippedReasons.push("missing position");

  return {
    id: entry?.id ?? null,
    name: normalizeText(entry?.name),
    score,
    factors,
    skipped: skippedReasons.length > 0,
    skippedReasons,
    stance: resolveTargetMovementIntent({
      profile,
      currentDistance: range,
      routeRole,
    }),
    distance: Number.isFinite(range) ? range : null,
  };
}

export function buildTargetScoringReport(entries = [], context = {}) {
  const candidates = (Array.isArray(entries) ? entries : [])
    .map((entry) => buildTargetScoreBreakdown(entry, {
      ...context,
      profile: typeof context.getProfile === "function" ? context.getProfile(entry) : context.profile,
      sharedSpawnBlocked: typeof context.isSharedSpawnBlocked === "function"
        ? context.isSharedSpawnBlocked(entry)
        : context.sharedSpawnBlocked,
      reachable: typeof context.isReachable === "function" ? context.isReachable(entry) : context.reachable,
      baseThreatScore: typeof context.getThreatScore === "function" ? context.getThreatScore(entry) : context.baseThreatScore,
    }))
    .sort((left, right) => right.score - left.score || String(left.name).localeCompare(String(right.name)));
  const selected = candidates.find((candidate) => !candidate.skipped) || null;
  return {
    selected,
    candidates,
    skipped: candidates.filter((candidate) => candidate.skipped),
  };
}
