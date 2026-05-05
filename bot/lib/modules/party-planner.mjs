/*
 * Party planner summaries for local multi-session control. This is a planner
 * and diagnostic surface only; emergency self-heal remains owned by healer.
 */

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeList(value = []) {
  return (Array.isArray(value) ? value : String(value ?? "").split(/[\n,;]+/g))
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function getDistance(left = null, right = null) {
  if (!left || !right || Number(left.z) !== Number(right.z)) return null;
  return Math.max(Math.abs(Number(left.x) - Number(right.x)), Math.abs(Number(left.y) - Number(right.y)));
}

function getMemberPosition(snapshot = {}, name = "") {
  const key = normalizeText(name).toLowerCase();
  return (Array.isArray(snapshot.visiblePlayers) ? snapshot.visiblePlayers : [])
    .find((entry) => normalizeText(entry?.name).toLowerCase() === key)?.position || null;
}

export function buildPartyPlannerSummary(snapshot = {}, options = {}, {
  routeTelemetryByMember = {},
  supplySummaryByMember = {},
} = {}) {
  const members = normalizeList(options.partyFollowMembers);
  const selfName = normalizeText(snapshot.playerName);
  const chain = selfName && !members.some((entry) => entry.toLowerCase() === selfName.toLowerCase())
    ? [selfName, ...members]
    : members;
  const spacing = Math.max(0, Math.trunc(Number(options.partyFollowDistance) || 0));
  const selfIndex = chain.findIndex((entry) => entry.toLowerCase() === selfName.toLowerCase());
  const enabled = options.partyFollowEnabled === true || (options.teamEnabled === true && chain.length >= 2);
  const predecessor = selfIndex > 0 ? chain[selfIndex - 1] : "";
  const predecessorPosition = predecessor ? getMemberPosition(snapshot, predecessor) : null;
  const selfPosition = snapshot.playerPosition || null;
  const distanceToLeader = predecessorPosition ? getDistance(selfPosition, predecessorPosition) : null;
  const regroupNeeded = Number.isFinite(distanceToLeader) && distanceToLeader > spacing;
  const assistTarget = snapshot.currentTarget
    ? {
        id: snapshot.currentTarget.id ?? null,
        name: normalizeText(snapshot.currentTarget.name),
      }
    : null;
  const roleMap = options.partyFollowMemberRoles && typeof options.partyFollowMemberRoles === "object"
    ? options.partyFollowMemberRoles
    : {};
  const supportAllowlist = chain.filter((name) => /healer|support|sio|buffer/i.test(roleMap[name] || ""));
  const routeMembers = Object.entries(routeTelemetryByMember || {}).map(([name, telemetry]) => ({
    name,
    killCount: Math.max(0, Math.trunc(Number(telemetry?.killCount) || 0)),
    lootGoldValue: Math.max(0, Math.trunc(Number(telemetry?.lootGoldValue) || 0)),
    lapCount: Math.max(0, Math.trunc(Number(telemetry?.lapCount) || 0)),
  }));

  return {
    enabled,
    role: roleMap[selfName] || (selfIndex <= 0 ? "leader" : "follower"),
    members: chain,
    predecessor,
    spacing,
    distanceToLeader,
    regroupNeeded,
    assistTarget,
    supportAllowlist,
    pauseState: options.cavebotPaused ? "paused" : "running",
    emergencySelfHealPriority: true,
    spacingVisualization: chain.map((name, index) => ({
      name,
      role: roleMap[name] || (index === 0 ? "leader" : "follower"),
      position: name === selfName ? selfPosition : getMemberPosition(snapshot, name),
      targetSpacing: spacing,
    })),
    sharedLootSummary: {
      goldValue: routeMembers.reduce((sum, entry) => sum + entry.lootGoldValue, 0),
      kills: routeMembers.reduce((sum, entry) => sum + entry.killCount, 0),
      loops: routeMembers.reduce((sum, entry) => sum + entry.lapCount, 0),
    },
    sharedSupplySummary: { ...(supplySummaryByMember || {}) },
  };
}
