(() => {
  const SUPPLY_ORDER = Object.freeze(["potion", "rune", "ammo", "food", "rope", "shovel"]);
  const SUPPLY_LABELS = Object.freeze({
    potion: "pots",
    rune: "runes",
    ammo: "ammo",
    food: "food",
    rope: "rope",
    shovel: "shovel",
  });

  function normalizeTextList(value) {
    const raw = Array.isArray(value)
      ? value.flatMap((entry) => normalizeTextList(entry))
      : String(value || "")
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    const seen = new Set();
    const normalized = [];
    for (const entry of raw) {
      const key = entry.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      normalized.push(entry);
    }
    return normalized;
  }

  function normalizeNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeCount(value) {
    return Math.max(0, Math.trunc(normalizeNumber(value, 0) || 0));
  }

  function normalizePercent(value) {
    const number = normalizeNumber(value, null);
    if (number == null) return null;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function formatFollowTrainHeadline(value) {
    const chain = normalizeTextList(value);
    if (!chain.length) {
      return "No chain";
    }

    if (chain.length === 1) {
      return `Pilot ${chain[0]}`;
    }

    return `${chain.length} slots`;
  }

  function formatFollowTrainDetail(value, spacing = 0) {
    const chain = normalizeTextList(value);
    const gap = Math.max(0, Math.trunc(Number(spacing) || 0));

    if (!chain.length) {
      return `Gap ${gap} sqm`;
    }

    return `Pilot ${chain[0]} / gap ${gap} sqm`;
  }

  function formatFollowTrainStateLabel(status = null) {
    if (status?.pilot) return "Pilot";
    const stateKey = String(status?.currentState || "").trim().toUpperCase();
    switch (stateKey) {
      case "ACQUIRE_LEADER":
        return "Acquire Leader";
      case "FOLLOWING":
        return "Following";
      case "COMBAT_SUSPEND":
        return "Combat Suspend";
      case "COMBAT_ACTIVE":
        return "Combat Active";
      case "REJOIN_FOLLOW":
        return "Rejoin Follow";
      case "DESYNC_RECOVERY":
        return "Desync Recovery";
      case "SAFE_HOLD":
        return "Safe Hold";
      case "DISABLED":
      default:
        return status?.enabled ? "Idle" : "Inactive";
    }
  }

  function formatCompactNumber(value) {
    const number = normalizeCount(value);
    if (number >= 1_000_000) {
      return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}m`;
    }
    if (number >= 1_000) {
      return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
    }
    return String(number);
  }

  function formatCompactGoldValue(value) {
    const count = normalizeCount(value);
    return count > 0 ? `${formatCompactNumber(count)} gp` : "0 gp";
  }

  function getSessionName(session = null) {
    return String(
      session?.followTrainStatus?.selfName
      || session?.characterName
      || session?.label
      || session?.displayName
      || session?.profileKey
      || "",
    ).trim();
  }

  function getSessionKey(session = null) {
    return getSessionName(session).toLowerCase();
  }

  function getSessionStats(session = null) {
    return session?.playerStats || session?.snapshot?.playerStats || null;
  }

  function getSessionSupplyEntries(session = null) {
    if (Array.isArray(session?.supplies)) return session.supplies;
    if (Array.isArray(session?.supplySummary)) return session.supplySummary;
    if (Array.isArray(session?.inventory?.supplies)) return session.inventory.supplies;
    if (Array.isArray(session?.snapshot?.inventory?.supplies)) return session.snapshot.inventory.supplies;
    if (Array.isArray(session?.snapshot?.supplies)) return session.snapshot.supplies;
    return [];
  }

  function getSessionRouteTelemetry(session = null) {
    return session?.routeTelemetry
      || session?.snapshot?.routeTelemetry
      || session?.snapshot?.routeState?.routeTelemetry
      || null;
  }

  function normalizeSupplyCategory(value = "") {
    const key = String(value || "").trim().toLowerCase();
    if (key === "potions") return "potion";
    if (key === "runes") return "rune";
    if (key === "arrows" || key === "bolts" || key === "ammunition") return "ammo";
    if (SUPPLY_ORDER.includes(key)) return key;
    return "";
  }

  function summarizeSupplies(members = []) {
    const totals = Object.fromEntries(SUPPLY_ORDER.map((category) => [category, 0]));
    let countedEntries = 0;

    for (const member of members) {
      for (const entry of getSessionSupplyEntries(member.session)) {
        const category = normalizeSupplyCategory(entry?.category);
        if (!category) continue;
        const count = normalizeCount(entry?.count);
        if (count <= 0) continue;
        totals[category] += count;
        countedEntries += 1;
      }
    }

    const parts = SUPPLY_ORDER
      .filter((category) => totals[category] > 0)
      .map((category) => `${SUPPLY_LABELS[category]} ${formatCompactNumber(totals[category])}`);

    return {
      totals,
      countedEntries,
      hasCounts: parts.length > 0,
      headline: parts.length ? `${parts.length} types` : "Unknown",
      detail: parts.length ? parts.slice(0, 3).join(" / ") : "No shared supply counts",
      inline: parts.length ? parts.slice(0, 2).join(" / ") : "",
    };
  }

  function summarizeLoot(members = []) {
    let goldValue = 0;
    let killCount = 0;
    let lapCount = 0;
    const lootLines = [];

    for (const member of members) {
      const telemetry = getSessionRouteTelemetry(member.session);
      if (!telemetry) continue;
      goldValue += normalizeCount(telemetry.lootGoldValue);
      killCount += normalizeCount(telemetry.killCount);
      lapCount += normalizeCount(telemetry.lapCount);
      const lootLine = String(telemetry.lootLine || "").trim();
      if (lootLine && lootLine.toLowerCase() !== "none") {
        lootLines.push(lootLine);
      }
    }

    const parts = [];
    if (goldValue > 0) parts.push(formatCompactGoldValue(goldValue));
    if (killCount > 0) parts.push(`${killCount} kill${killCount === 1 ? "" : "s"}`);
    if (lapCount > 0) parts.push(`${lapCount} lap${lapCount === 1 ? "" : "s"}`);

    return {
      goldValue,
      killCount,
      lapCount,
      lootLines,
      hasLoot: parts.length > 0,
      headline: goldValue > 0 ? formatCompactGoldValue(goldValue) : "No loot",
      detail: parts.length ? parts.join(" / ") : "No shared loot yet",
      inline: parts.length ? parts.slice(0, 2).join(" / ") : "",
    };
  }

  function summarizeHealth(members = []) {
    const liveMembers = members.filter((member) => member.live);
    const percentages = liveMembers
      .map((member) => ({
        name: member.name,
        value: normalizePercent(getSessionStats(member.session)?.healthPercent),
      }))
      .filter((entry) => entry.value != null);

    if (!percentages.length) {
      return {
        averagePercent: null,
        minimumPercent: null,
        criticalNames: [],
        headline: "HP unknown",
        detail: liveMembers.length ? "No HP snapshot" : "No live chain members",
        inline: "",
      };
    }

    const total = percentages.reduce((sum, entry) => sum + entry.value, 0);
    const averagePercent = Math.round(total / percentages.length);
    const minimum = percentages.reduce((best, entry) => (entry.value < best.value ? entry : best), percentages[0]);
    const criticalNames = percentages
      .filter((entry) => entry.value <= 30)
      .map((entry) => entry.name);

    return {
      averagePercent,
      minimumPercent: minimum.value,
      criticalNames,
      headline: `HP ${averagePercent}%`,
      detail: `Min ${minimum.name || "member"} ${minimum.value}% / avg ${averagePercent}%`,
      inline: `HP ${averagePercent}%`,
    };
  }

  function buildPartySharedSummary({
    state = {},
    options = state?.options || {},
  } = {}) {
    const chain = normalizeTextList(options?.partyFollowMembers);
    const sessions = Array.isArray(state?.sessions) ? state.sessions : [];
    const sessionsByName = new Map();
    for (const session of sessions) {
      const key = getSessionKey(session);
      if (key && !sessionsByName.has(key)) {
        sessionsByName.set(key, session);
      }
    }

    const memberNames = chain.length
      ? chain
      : sessions.map(getSessionName).filter(Boolean);
    const members = memberNames.map((name, index) => {
      const session = sessionsByName.get(String(name || "").trim().toLowerCase()) || null;
      return {
        name,
        index,
        session,
        live: Boolean(session),
        running: session?.running === true,
        connected: session?.connected === true,
        status: session?.followTrainStatus || null,
      };
    });
    const liveMembers = members.filter((member) => member.live);
    const runningMembers = liveMembers.filter((member) => member.running);
    const health = summarizeHealth(members);
    const supply = summarizeSupplies(members);
    const loot = summarizeLoot(members);

    const inlineParts = [
      liveMembers.length && memberNames.length ? `${liveMembers.length}/${memberNames.length} live` : "",
      health.inline,
      supply.inline ? `supplies ${supply.inline}` : "",
      loot.inline ? `loot ${loot.inline}` : "",
    ].filter(Boolean);

    return {
      chain,
      members,
      liveCount: liveMembers.length,
      runningCount: runningMembers.length,
      expectedCount: memberNames.length,
      health,
      supply,
      loot,
      inline: inlineParts.join(" / "),
    };
  }

  globalThis.MinibotPartyFollowSummary = Object.freeze({
    buildPartySharedSummary,
    formatCompactGoldValue,
    formatFollowTrainDetail,
    formatFollowTrainHeadline,
    formatFollowTrainStateLabel,
    normalizeTextList,
  });
})();
