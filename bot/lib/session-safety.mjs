function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeOwner(value = "") {
  return normalizeText(value).toLowerCase();
}

function hasEntries(value) {
  return Array.isArray(value) && value.some(Boolean);
}

function getTargetName(entry = null) {
  return normalizeText(entry?.name || entry?.label || "");
}

function getRouteState(session = null, snapshot = null) {
  const directState = normalizeText(snapshot?.routeState?.state);
  if (directState) {
    return directState;
  }

  const telemetry = session?.bot?.getRouteStateTelemetry?.(snapshot);
  return normalizeText(telemetry?.state);
}

function getCombatDecisionReason(snapshot = null) {
  const trace = snapshot?.decisionTrace && typeof snapshot.decisionTrace === "object"
    ? snapshot.decisionTrace
    : {};
  const currentOwner = normalizeOwner(trace.current?.owner);
  const blockerOwner = normalizeOwner(trace.blocker?.owner);
  const combatOwners = new Set([
    "targeting",
    "targeter",
    "combat",
    "distancekeeper",
    "spellcaster",
    "pkassist",
    "followtrain",
  ]);

  if (combatOwners.has(currentOwner)) {
    return normalizeText(trace.current?.reason) || currentOwner;
  }
  if (combatOwners.has(blockerOwner)) {
    return normalizeText(trace.blocker?.reason) || blockerOwner;
  }
  return "";
}

function describeTargetList(snapshot = null) {
  const groups = [
    ["candidate target", snapshot?.candidates],
    ["fallback target", snapshot?.fallbackCandidates],
    ["combat match", snapshot?.allMatches],
    ["fallback combat match", snapshot?.fallbackMatches],
  ];

  for (const [label, entries] of groups) {
    if (hasEntries(entries)) {
      const firstName = getTargetName(entries.find(Boolean));
      return firstName ? `${label} ${firstName}` : label;
    }
  }

  return "";
}

function hasAttacker(snapshot = null) {
  const visible = [
    ...(Array.isArray(snapshot?.visibleCreatures) ? snapshot.visibleCreatures : []),
    ...(Array.isArray(snapshot?.visibleMonsters) ? snapshot.visibleMonsters : []),
    ...(Array.isArray(snapshot?.visiblePlayers) ? snapshot.visiblePlayers : []),
  ];
  return visible.find((entry) => entry?.isTargetingSelf === true) || null;
}

export function describeActiveKillMoment(session = null, {
  snapshot = session?.bot?.lastSnapshot || null,
} = {}) {
  if (!session || !snapshot || snapshot.ready === false) {
    return {
      active: false,
      reason: "",
      targetName: "",
    };
  }

  const currentTarget = snapshot.currentTarget || null;
  if (currentTarget) {
    const targetName = getTargetName(currentTarget);
    return {
      active: true,
      reason: targetName ? `current target ${targetName}` : "current target",
      targetName,
    };
  }

  const routeState = getRouteState(session, snapshot).toLowerCase();
  if (routeState === "combat-hold") {
    return {
      active: true,
      reason: "route is holding for combat",
      targetName: "",
    };
  }

  if (session?.bot?.hasRuntimeCombatActivity?.(snapshot) === true) {
    const reason = describeTargetList(snapshot) || "runtime combat activity";
    return {
      active: true,
      reason,
      targetName: "",
    };
  }

  const attacker = hasAttacker(snapshot);
  if (attacker) {
    const targetName = getTargetName(attacker);
    return {
      active: true,
      reason: targetName ? `${targetName} is targeting the character` : "a visible creature is targeting the character",
      targetName,
    };
  }

  const decisionReason = getCombatDecisionReason(snapshot);
  if (decisionReason) {
    return {
      active: true,
      reason: `combat decision ${decisionReason}`,
      targetName: "",
    };
  }

  return {
    active: false,
    reason: "",
    targetName: "",
  };
}

export function getSessionSafetyLabel(session = null) {
  return normalizeText(
    session?.binding?.characterName
    || session?.binding?.displayName
    || session?.instance?.characterName
    || session?.instance?.displayName
    || session?.id
    || "session",
  );
}

export function buildActiveKillMomentBlockMessage(session = null, {
  action = "close",
  reason = "",
} = {}) {
  const label = getSessionSafetyLabel(session);
  const detail = normalizeText(reason) || "active combat";
  return `Blocked ${action} for ${label}: active kill moment detected (${detail}). Stop combat or wait for the target to clear before closing.`;
}
