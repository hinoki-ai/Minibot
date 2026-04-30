/*
 * Hunt ledger helpers turn runtime events into operator-facing economy and
 * progress reports. Keep this pure so the desktop, tests, and runtime can use
 * the same accounting without coupling to Electron.
 */
import { summarizeLootEconomics } from "./loot-economics.mjs";

const LEDGER_EVENT_LIMIT = 600;
const LEDGER_RARE_VALUE_GP = 1_000;

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function normalizeTimestamp(value, fallback = Date.now()) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function getSnapshotSupplyCounts(snapshot = {}) {
  const inventoryItems = Array.isArray(snapshot?.inventory?.items) ? snapshot.inventory.items : [];
  const counts = new Map();
  for (const entry of inventoryItems) {
    const name = normalizeText(entry?.displayName || entry?.name || entry?.item?.name);
    if (!name) continue;
    const key = normalizeKey(name);
    const count = Math.max(1, normalizeInteger(entry?.count ?? entry?.item?.count, 1));
    counts.set(key, (counts.get(key) || 0) + count);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => left[0].localeCompare(right[0])));
}

function diffSupplyBurn(previous = {}, next = {}) {
  const burned = {};
  const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
  for (const key of keys) {
    const delta = normalizeInteger(previous[key]) - normalizeInteger(next[key]);
    if (delta > 0) {
      burned[key] = delta;
    }
  }
  return burned;
}

function mergeCountMap(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    const count = normalizeInteger(value);
    if (count > 0) {
      target[key] = (target[key] || 0) + count;
    }
  }
}

export function createHuntLedger({ startedAt = Date.now() } = {}) {
  return {
    schemaVersion: 1,
    startedAt: normalizeTimestamp(startedAt),
    updatedAt: normalizeTimestamp(startedAt),
    events: [],
    lastSnapshot: null,
    lastSupplyCounts: {},
    xpStart: null,
    xpCurrent: null,
    supplyBurn: {},
  };
}

export function normalizeHuntLedgerEvent(event = {}, { now = Date.now() } = {}) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const type = normalizeText(event.type || event.kind);
  if (!type) {
    return null;
  }

  return {
    ...clone(event),
    type,
    at: normalizeTimestamp(event.at, now),
  };
}

export function recordHuntLedgerEvent(ledger = createHuntLedger(), event = {}, { now = Date.now() } = {}) {
  const normalizedLedger = ledger && typeof ledger === "object" ? ledger : createHuntLedger({ startedAt: now });
  const normalized = normalizeHuntLedgerEvent(event, { now });
  if (!normalized) {
    return normalizedLedger;
  }

  normalizedLedger.events = Array.isArray(normalizedLedger.events) ? normalizedLedger.events : [];
  normalizedLedger.events.push(normalized);
  normalizedLedger.events = normalizedLedger.events
    .sort((left, right) => left.at - right.at)
    .slice(-LEDGER_EVENT_LIMIT);
  normalizedLedger.updatedAt = Math.max(normalizeTimestamp(normalizedLedger.updatedAt, now), normalized.at);
  return normalizedLedger;
}

export function recordHuntLedgerSnapshot(ledger = createHuntLedger(), snapshot = {}, { now = Date.now() } = {}) {
  const normalizedLedger = ledger && typeof ledger === "object" ? ledger : createHuntLedger({ startedAt: now });
  const stats = snapshot?.playerStats || {};
  const experience = normalizeInteger(stats.experience ?? stats.xp, null);
  const supplyCounts = getSnapshotSupplyCounts(snapshot);

  if (Number.isFinite(experience)) {
    if (!Number.isFinite(normalizedLedger.xpStart)) {
      normalizedLedger.xpStart = experience;
    }
    normalizedLedger.xpCurrent = experience;
  }

  if (normalizedLedger.lastSnapshot) {
    mergeCountMap(normalizedLedger.supplyBurn, diffSupplyBurn(normalizedLedger.lastSupplyCounts, supplyCounts));
  }

  normalizedLedger.lastSnapshot = {
    at: normalizeTimestamp(now),
    playerName: normalizeText(snapshot?.playerName),
    playerStats: clone(stats),
    routeState: clone(snapshot?.routeState || null),
  };
  normalizedLedger.lastSupplyCounts = supplyCounts;
  normalizedLedger.updatedAt = normalizeTimestamp(now);
  return normalizedLedger;
}

export function buildHuntLedgerReport(ledger = createHuntLedger(), {
  now = Date.now(),
  routeTelemetry = {},
  tradeState = null,
  extraEvents = [],
} = {}) {
  const normalizedLedger = ledger && typeof ledger === "object" ? ledger : createHuntLedger({ startedAt: now });
  const events = [
    ...(Array.isArray(normalizedLedger.events) ? normalizedLedger.events : []),
    ...(Array.isArray(extraEvents) ? extraEvents.map((event) => normalizeHuntLedgerEvent(event, { now })).filter(Boolean) : []),
  ].sort((left, right) => left.at - right.at);
  const startedAt = normalizeTimestamp(normalizedLedger.startedAt, now);
  const elapsedMs = Math.max(1, normalizeTimestamp(now) - startedAt);
  const elapsedHours = elapsedMs / 3_600_000;
  const killCount = Math.max(0, normalizeInteger(routeTelemetry.killCount));
  const routeLoops = Math.max(0, normalizeInteger(routeTelemetry.lapCount));
  const lootGoldValue = Math.max(0, normalizeInteger(routeTelemetry.lootGoldValue));
  const lootItems = Array.isArray(routeTelemetry.lootItems)
    ? routeTelemetry.lootItems
    : [];
  const economics = summarizeLootEconomics({
    items: lootItems,
    goldValue: lootGoldValue,
    tradeState,
  });

  const eventCounts = {
    deaths: 0,
    pauses: 0,
    stucks: 0,
    refillCycles: 0,
    protectedItemDecisions: 0,
  };
  const lootRuleCounts = {};
  const rareDrops = [];

  for (const event of events) {
    switch (event.type) {
      case "death":
        eventCounts.deaths += 1;
        break;
      case "pause":
        eventCounts.pauses += 1;
        break;
      case "stuck":
        eventCounts.stucks += 1;
        break;
      case "refill-cycle":
        eventCounts.refillCycles += 1;
        break;
      case "protected-item":
        eventCounts.protectedItemDecisions += 1;
        break;
      case "loot-rule": {
        const decision = normalizeText(event.decision || event.reason || "unknown");
        lootRuleCounts[decision] = (lootRuleCounts[decision] || 0) + 1;
        break;
      }
      case "rare-drop": {
        rareDrops.push({
          name: normalizeText(event.name),
          count: Math.max(1, normalizeInteger(event.count, 1)),
          value: Math.max(0, normalizeInteger(event.value)),
          at: event.at,
        });
        break;
      }
      default:
        break;
    }
  }

  for (const item of economics.valuedItems || []) {
    if (Number(item.totalValue) >= LEDGER_RARE_VALUE_GP) {
      rareDrops.push({
        name: normalizeText(item.name),
        count: Math.max(1, normalizeInteger(item.count, 1)),
        value: Math.max(0, normalizeInteger(item.totalValue)),
        at: normalizeTimestamp(now),
      });
    }
  }

  const xpGained = Number.isFinite(normalizedLedger.xpStart) && Number.isFinite(normalizedLedger.xpCurrent)
    ? Math.max(0, normalizedLedger.xpCurrent - normalizedLedger.xpStart)
    : 0;
  const supplyBurnTotal = Object.values(normalizedLedger.supplyBurn || {})
    .reduce((sum, value) => sum + Math.max(0, normalizeInteger(value)), 0);
  const totalValue = Math.max(0, normalizeInteger(economics.totalGoldValue));
  const supplySpend = Math.max(0, normalizeInteger(economics.supplySpend));
  const profit = totalValue - supplySpend;

  return {
    schemaVersion: 1,
    startedAt,
    updatedAt: normalizeTimestamp(normalizedLedger.updatedAt, now),
    elapsedMs,
    xpGained,
    xpPerHour: Math.round(xpGained / elapsedHours),
    kills: killCount,
    killsPerHour: Math.round(killCount / elapsedHours),
    lootValue: totalValue,
    lootPerHour: Math.round(totalValue / elapsedHours),
    profit,
    profitPerHour: Math.round(profit / elapsedHours),
    supplyBurn: { ...(normalizedLedger.supplyBurn || {}) },
    supplyBurnTotal,
    rareDrops,
    deaths: eventCounts.deaths,
    pauses: eventCounts.pauses,
    stucks: eventCounts.stucks,
    routeLoops,
    refillCycles: eventCounts.refillCycles,
    unknownValueItems: (economics.unknownItems || []).map((entry) => ({
      name: entry.name,
      count: entry.count,
    })),
    protectedItemDecisions: eventCounts.protectedItemDecisions,
    lootRuleCounts,
  };
}
