/*
 * Loot valuation and autosell planning.
 * Uses visible trade prices first, then vendored NPC buy prices, so refill and
 * hunt summaries can make capacity decisions without hard-coded item tables.
 */
import fs from "node:fs";
import path from "node:path";
import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
  collectSnapshotInventoryItems,
} from "../minibia-snapshot.mjs";
import { MINIBIA_DATA_ROOT } from "../minibia-data.mjs";
import { resolveMinibiaItemName } from "../minibia-item-metadata.mjs";
import { normalizeTradeState } from "./shopper.mjs";

const GOLD_COIN_VALUE = 1;
const PLATINUM_COIN_VALUE = 100;
const CRYSTAL_COIN_VALUE = 10_000;
const DEFAULT_AUTOSELL_PROTECTED_MATCHERS = Object.freeze([
  "gold coin",
  "platinum coin",
  "crystal coin",
  "health potion",
  "mana potion",
  "rune",
  "arrow",
  "bolt",
  "spear",
  "rope",
  "shovel",
  "backpack",
  "bag",
]);

let cachedNpcBuyValues = null;

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNameKey(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function getCoinUnitValue(name = "") {
  const key = normalizeNameKey(name);
  if (key === "gold coin") return GOLD_COIN_VALUE;
  if (key === "platinum coin") return PLATINUM_COIN_VALUE;
  if (key === "crystal coin") return CRYSTAL_COIN_VALUE;
  return 0;
}

function loadNpcBuyValueCatalog() {
  if (cachedNpcBuyValues) {
    return cachedNpcBuyValues;
  }

  const values = new Map();
  try {
    const documentPath = path.join(MINIBIA_DATA_ROOT, "current", "npcs.json");
    const document = JSON.parse(fs.readFileSync(documentPath, "utf8"));
    for (const npc of Array.isArray(document?.items) ? document.items : []) {
      for (const entry of Array.isArray(npc?.buys) ? npc.buys : []) {
        const key = normalizeNameKey(entry?.name);
        const price = normalizeInteger(entry?.price);
        if (!key || price <= 0) {
          continue;
        }

        const previous = values.get(key);
        if (!previous || price > previous.price) {
          values.set(key, {
            name: normalizeText(entry.name),
            price,
            npcName: normalizeText(npc?.name),
          });
        }
      }
    }
  } catch {
    // Missing vendored data should make valuation conservative, not fatal.
  }

  cachedNpcBuyValues = values;
  return values;
}

export function getNpcBuyValue(name = "", {
  valueCatalog = loadNpcBuyValueCatalog(),
} = {}) {
  const key = normalizeNameKey(name);
  return key ? (valueCatalog.get(key) || null) : null;
}

export function getVisibleTradeSellValue(name = "", tradeState = {}) {
  const key = normalizeNameKey(name);
  if (!key) return null;

  const trade = normalizeTradeState(tradeState);
  const match = trade.sellItems.find((entry) => {
    const entryKey = normalizeNameKey(entry?.name);
    return entryKey === key || entryKey.includes(key) || key.includes(entryKey);
  });

  return match && match.price > 0
    ? {
        name: match.name,
        price: normalizeInteger(match.price),
        npcName: trade.npcName || "",
        visible: true,
      }
    : null;
}

export function resolveLootSellValue(item = {}, {
  tradeState = {},
  valueCatalog = loadNpcBuyValueCatalog(),
} = {}) {
  const name = normalizeText(
    typeof item === "string"
      ? item
      : resolveMinibiaItemName(item?.item || item) || item?.name,
  );
  if (!name) return null;

  const coinValue = getCoinUnitValue(name);
  if (coinValue > 0) {
    return {
      name,
      price: coinValue,
      source: "coin",
    };
  }

  const visibleValue = getVisibleTradeSellValue(name, tradeState);
  if (visibleValue) {
    return {
      ...visibleValue,
      source: "visible-trade",
    };
  }

  const catalogValue = getNpcBuyValue(name, { valueCatalog });
  return catalogValue
    ? {
        ...catalogValue,
        source: "npc-catalog",
      }
    : null;
}

export function summarizeLootEconomics({
  goldValue = 0,
  items = [],
  tradeState = {},
  valueCatalog = loadNpcBuyValueCatalog(),
} = {}) {
  const itemEntries = Array.isArray(items) ? items : [];
  let itemGoldValue = 0;
  const valuedItems = [];
  const unknownItems = [];

  for (const entry of itemEntries) {
    const count = Math.max(1, normalizeInteger(entry?.count || 1));
    const name = normalizeText(entry?.displayName || entry?.name);
    if (!name) {
      continue;
    }

    const resolved = resolveLootSellValue({ name }, { tradeState, valueCatalog });
    if (!resolved?.price) {
      unknownItems.push({ name, count });
      continue;
    }

    const total = resolved.price * count;
    itemGoldValue += total;
    valuedItems.push({
      name,
      count,
      unitValue: resolved.price,
      totalValue: total,
      source: resolved.source,
      npcName: resolved.npcName || "",
    });
  }

  valuedItems.sort((left, right) => (
    right.totalValue - left.totalValue
    || String(left.name).localeCompare(String(right.name), "en", { sensitivity: "base", numeric: true })
  ));

  const normalizedGoldValue = normalizeInteger(goldValue);
  return {
    goldValue: normalizedGoldValue,
    itemGoldValue,
    totalGoldValue: normalizedGoldValue + itemGoldValue,
    valuedItems,
    unknownItems,
    unknownItemCount: unknownItems.length,
  };
}

function isProtectedAutosellItem(entry = {}, protectedMatchers = []) {
  const name = normalizeNameKey(resolveMinibiaItemName(entry?.item || {}) || entry?.item?.name);
  if (!name) return true;
  if (getCoinUnitValue(name) > 0) return true;

  const flags = entry?.item?.flags || {};
  if (flags.potion || flags.rune || flags.food || flags.ammo || flags.rope || flags.shovel) {
    return true;
  }

  return protectedMatchers.some((matcher) => {
    const key = normalizeNameKey(matcher);
    return key && (name === key || name.includes(key));
  });
}

function getFreeContainerSlotCount(snapshot = {}) {
  const explicit = normalizeInteger(snapshot?.inventory?.totalFreeContainerSlots);
  if (explicit > 0) return explicit;

  return (Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [])
    .reduce((sum, container) => {
      const capacity = normalizeInteger(container?.capacity);
      const slots = Array.isArray(container?.slots) ? container.slots : [];
      const occupied = slots.filter((slot) => Boolean(slot?.item)).length;
      return sum + Math.max(0, capacity - occupied);
    }, 0);
}

export function buildCapacityAwareAutosellRequests(snapshotLike = {}, {
  enabled = true,
  minFreeSlots = 2,
  protectedNames = [],
  includeUnvalued = false,
  maxRequests = 16,
  moduleKey = "refill",
  ruleIndex = null,
  tradeState = null,
  valueCatalog = loadNpcBuyValueCatalog(),
} = {}) {
  if (enabled === false) {
    return [];
  }

  const snapshot = toSnapshot(snapshotLike);
  const freeSlots = getFreeContainerSlotCount(snapshot);
  const threshold = normalizeInteger(minFreeSlots);
  if (freeSlots > threshold) {
    return [];
  }

  const protectedMatchers = [
    ...DEFAULT_AUTOSELL_PROTECTED_MATCHERS,
    ...(Array.isArray(protectedNames) ? protectedNames : [protectedNames]),
  ];
  const trade = tradeState || snapshot.trade || snapshotLike?.trade || {};
  const grouped = new Map();

  for (const entry of collectSnapshotInventoryItems(snapshot)) {
    if (entry.ownerType !== "container" || !entry.item) {
      continue;
    }
    if (isProtectedAutosellItem(entry, protectedMatchers)) {
      continue;
    }

    const name = normalizeText(resolveMinibiaItemName(entry.item) || entry.item.name);
    if (!name) {
      continue;
    }

    const value = resolveLootSellValue(entry.item, { tradeState: trade, valueCatalog });
    if (!value && includeUnvalued !== true) {
      continue;
    }

    const key = normalizeNameKey(name);
    const existing = grouped.get(key) || {
      operation: "sell-all",
      name,
      amount: 0,
      unitValue: value?.price || 0,
      estimatedValue: 0,
      moduleKey,
      ruleIndex,
      reason: "capacity",
    };
    const count = Math.max(1, normalizeInteger(entry.item.count || 1));
    existing.amount += count;
    existing.estimatedValue += (value?.price || 0) * count;
    existing.unitValue = Math.max(existing.unitValue, value?.price || 0);
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .sort((left, right) => (
      right.estimatedValue - left.estimatedValue
      || String(left.name).localeCompare(String(right.name), "en", { sensitivity: "base", numeric: true })
    ))
    .slice(0, Math.max(1, normalizeInteger(maxRequests) || 1))
    .map((entry) => ({
      operation: entry.operation,
      name: entry.name,
      amount: entry.amount,
      moduleKey: entry.moduleKey,
      ruleIndex: entry.ruleIndex,
      reason: entry.reason,
      estimatedValue: entry.estimatedValue,
    }));
}
