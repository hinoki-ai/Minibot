/*
 * Protector alarm planner. It classifies runtime alarm conditions and maps
 * them to explicit operator actions without touching input automation.
 */

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePercent(value, fallback = 0) {
  return Math.max(0, Math.min(100, normalizeNumber(value, fallback)));
}

function normalizeList(value = []) {
  return (Array.isArray(value) ? value : String(value ?? "").split(/[\n,;]+/g))
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function getDistance(left = null, right = null) {
  if (!left || !right || Number(left.z) !== Number(right.z)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(
    Math.abs(Number(left.x) - Number(right.x)),
    Math.abs(Number(left.y) - Number(right.y)),
  );
}

function getFreeSlots(snapshot = {}) {
  const explicit = Number(snapshot?.inventory?.totalFreeContainerSlots);
  if (Number.isFinite(explicit)) {
    return Math.max(0, Math.trunc(explicit));
  }

  return (Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [])
    .reduce((sum, container) => {
      const capacity = Math.max(0, Math.trunc(Number(container?.capacity) || 0));
      const slots = Array.isArray(container?.slots) ? container.slots : [];
      const occupied = slots.filter((slot) => Boolean(slot?.item)).length;
      return sum + Math.max(0, capacity - occupied);
    }, 0);
}

function isStaffLike(name = "") {
  return /\b(?:gm|god|admin|tutor|cm)\b/i.test(normalizeText(name));
}

function hasPrivateMessage(snapshot = {}) {
  const messages = Array.isArray(snapshot?.messages)
    ? snapshot.messages
    : Array.isArray(snapshot?.dialogue?.recentMessages)
      ? snapshot.dialogue.recentMessages
      : [];
  return messages.some((message) => {
    const channel = normalizeKey(message?.channel || message?.type || "");
    return channel.includes("private") || channel.includes("whisper");
  });
}

function hasStaleTarget(snapshot = {}, now = Date.now()) {
  const target = snapshot?.currentTarget;
  if (!target) {
    return false;
  }
  const lastSeenAt = Number(target.lastSeenAt ?? target.updatedAt ?? snapshot.targetUpdatedAt);
  return Number.isFinite(lastSeenAt) && now - lastSeenAt > 5_000;
}

function makeEvent(type, severity, reason, {
  owner = "protector",
  actions = [],
  target = null,
  details = {},
} = {}) {
  return {
    type,
    severity,
    reason,
    owner,
    actions: Array.from(new Set(actions.filter(Boolean))),
    target,
    details,
  };
}

export function buildProtectorAlarmPlan(snapshot = {}, options = {}, {
  now = Date.now(),
  decisionTrace = null,
  ignoredPlayerKeys = [],
} = {}) {
  const enabled = options.alarmsEnabled !== false;
  const protectorEnabled = options.alarmsProtectorEnabled === true;
  const playerStats = snapshot?.playerStats || {};
  const playerPosition = snapshot?.playerPosition || null;
  const hpPercent = normalizePercent(playerStats.healthPercent ?? playerStats.hpPercent ?? playerStats.hp, 100);
  const mpPercent = normalizePercent(playerStats.manaPercent ?? playerStats.mpPercent ?? playerStats.mana, 100);
  const capacity = normalizeNumber(playerStats.capacity ?? playerStats.cap, Number.POSITIVE_INFINITY);
  const events = [];
  const basePauseActions = [];
  const criticalControlActions = [];

  if (protectorEnabled && options.alarmsPauseRoute === true) basePauseActions.push("pause-route");
  if (protectorEnabled && (options.alarmsPauseTargeter === true || options.alarmsStopTargeter === true)) basePauseActions.push("stop-targeter");
  if (protectorEnabled && options.alarmsRequireAcknowledgement === true) basePauseActions.push("require-acknowledgement");
  if (protectorEnabled) {
    criticalControlActions.push(...basePauseActions);
  }

  const append = (event) => {
    if (!enabled && event.type !== "death" && event.type !== "disconnect") {
      return;
    }
    events.push({
      ...event,
      actions: Array.from(new Set([...event.actions, ...basePauseActions])),
    });
  };

  if (snapshot?.ready === false || snapshot?.connection?.connected === false) {
    append(makeEvent("disconnect", "critical", snapshot?.reason || "session disconnected", {
      actions: ["sound", "desktop-notification", "log", ...criticalControlActions],
    }));
  }

  if (snapshot?.reason === "dead" || snapshot?.connection?.playerIsDead === true || snapshot?.connection?.deathModalVisible === true) {
    append(makeEvent("death", "critical", "character death detected", {
      actions: ["sound", "desktop-notification", "log", ...criticalControlActions],
    }));
  }

  if (protectorEnabled && hpPercent <= normalizePercent(options.alarmsLowHpPercent ?? options.alarmsLowHealthPercent, 25)) {
    append(makeEvent("low-hp", "critical", `HP at ${Math.round(hpPercent)}%`, {
      actions: ["sound", "log"],
    }));
  }

  if (protectorEnabled && mpPercent <= normalizePercent(options.alarmsLowMpPercent ?? options.alarmsLowManaPercent, 10)) {
    append(makeEvent("low-mp", "warning", `MP at ${Math.round(mpPercent)}%`, {
      actions: ["log"],
    }));
  }

  if (protectorEnabled && capacity <= normalizeNumber(options.alarmsNoCapacityAt, 0)) {
    append(makeEvent("no-capacity", "warning", "capacity is depleted", {
      actions: ["log", "pause-route"],
    }));
  }

  if (protectorEnabled && getFreeSlots(snapshot) <= normalizeNumber(options.alarmsFullBackpackFreeSlots, 0)) {
    append(makeEvent("full-backpack", "warning", "no free backpack slots", {
      actions: ["log", "pause-route"],
    }));
  }

  if (protectorEnabled && hasPrivateMessage(snapshot)) {
    append(makeEvent("private-message", "warning", "private message received", {
      actions: ["sound", "desktop-notification", "log"],
    }));
  }

  if (protectorEnabled && (snapshot?.routeState?.stuck === true || snapshot?.routeState?.state === "recovery")) {
    append(makeEvent("route-stuck", "warning", snapshot?.routeState?.blockedReason || "route is stuck", {
      actions: ["log", "pause-route"],
    }));
  }

  if (protectorEnabled && decisionTrace?.blocker?.owner === "route" && /no progress|stalled|blocked/i.test(decisionTrace.blocker.reason || "")) {
    append(makeEvent("no-progress", "warning", decisionTrace.blocker.reason || "route made no progress", {
      actions: ["log", "pause-route"],
    }));
  }

  if (protectorEnabled && hasStaleTarget(snapshot, now)) {
    append(makeEvent("stale-target", "warning", "target state is stale", {
      actions: ["log", "stop-targeter"],
    }));
  }

  const incomingDamage = normalizeNumber(snapshot?.combat?.incomingDamagePerSecond ?? snapshot?.incomingDamagePerSecond, 0);
  if (protectorEnabled && incomingDamage >= normalizeNumber(options.alarmsHighIncomingDamagePerSecond, 120)) {
    append(makeEvent("high-incoming-damage", "critical", `incoming damage ${Math.round(incomingDamage)}/s`, {
      actions: ["sound", "log", "pause-route"],
    }));
  }

  const ignoredPlayers = new Set(
    [
      snapshot?.playerName,
      ...(Array.isArray(ignoredPlayerKeys) ? ignoredPlayerKeys : []),
      ...normalizeList(options.alarmsIgnoredPlayerNames),
    ]
      .map(normalizeKey)
      .filter(Boolean),
  );
  const blacklist = new Set(normalizeList(options.alarmsBlacklistNames).map(normalizeKey));
  const visiblePlayers = Array.isArray(snapshot?.visiblePlayers) ? snapshot.visiblePlayers : [];
  for (const player of visiblePlayers) {
    const name = normalizeText(player?.name);
    if (!name || ignoredPlayers.has(normalizeKey(name))) {
      continue;
    }
    const distance = getDistance(playerPosition, player?.position);
    const floorDelta = playerPosition && player?.position ? Math.abs(Number(playerPosition.z) - Number(player.position.z)) : 0;
    const blacklisted = blacklist.has(normalizeKey(name));
    const staff = isStaffLike(name);
    const playerScope = blacklisted
      ? {
          enabled: options.alarmsBlacklistEnabled !== false,
          radius: normalizeNumber(options.alarmsBlacklistRadiusSqm, 9),
          floor: normalizeNumber(options.alarmsBlacklistFloorRange, 1),
          severity: "critical",
          type: "blacklist-player",
        }
      : staff
        ? {
            enabled: options.alarmsStaffEnabled !== false,
            radius: normalizeNumber(options.alarmsStaffRadiusSqm, 9),
            floor: normalizeNumber(options.alarmsStaffFloorRange, 1),
            severity: "critical",
            type: "staff-player",
          }
        : {
            enabled: options.alarmsPlayerEnabled !== false,
            radius: normalizeNumber(options.alarmsPlayerRadiusSqm, 8),
            floor: normalizeNumber(options.alarmsPlayerFloorRange, 0),
            severity: "warning",
            type: "nearby-player",
          };
    if (!playerScope.enabled || distance > playerScope.radius || floorDelta > playerScope.floor) {
      continue;
    }
    append(makeEvent(playerScope.type, playerScope.severity, `${name} visible nearby`, {
      actions: ["sound", "desktop-notification", "log"],
      target: { name, position: player.position || null, distance },
    }));
  }

  events.sort((left, right) => {
    const rank = { critical: 3, warning: 2, info: 1 };
    return (rank[right.severity] || 0) - (rank[left.severity] || 0)
      || String(left.type).localeCompare(String(right.type));
  });

  const activeActions = Array.from(new Set(events.flatMap((event) => event.actions || [])));
  return {
    active: events.length > 0,
    highestSeverity: events[0]?.severity || "clear",
    owner: events[0]?.owner || null,
    reason: events[0]?.reason || "",
    actions: activeActions,
    pausedModules: [
      activeActions.includes("pause-route") ? "route" : "",
      activeActions.includes("stop-targeter") ? "targeter" : "",
      ...normalizeList(options.alarmsPauseModules),
    ].filter(Boolean),
    acknowledgementRequired: activeActions.includes("require-acknowledgement"),
    events,
  };
}
