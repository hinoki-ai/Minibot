/*
 * Supply-threshold to shop-request planner.
 * It bridges vocation sustain policy, visible trade state, and executable
 * refill actions without owning travel or shop-opening orchestration.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { getAmmoStatus } from "./ammo.mjs";
import {
  buildExecutableShopAction,
  buildShopAction,
  findTradeEntryForRequest,
  normalizeTradeState,
  prioritizeShopRequests,
} from "./shopper.mjs";
import { buildCapacityAwareAutosellRequests } from "./loot-economics.mjs";
import { getCarriedGoldValue } from "./economy.mjs";

const DEFAULT_TOOL_TARGETS = Object.freeze({
  rope: 1,
  shovel: 1,
});

const DEFAULT_BUY_BY_CATEGORY = Object.freeze({
  food: "Ham",
  rope: "Rope",
  shovel: "Shovel",
});

const SUPPLY_PLAN_KEY_ALIASES = Object.freeze({
  potion: "potions",
  potions: "potions",
  healthpotion: "potions",
  healthpotions: "potions",
  manapotion: "potions",
  manapotions: "potions",
  rune: "runes",
  runes: "runes",
  food: "food",
  foods: "food",
  ammo: "ammo",
  ammunition: "ammo",
  arrow: "ammo",
  arrows: "ammo",
  bolt: "ammo",
  bolts: "ammo",
  spear: "ammo",
  spears: "ammo",
  rope: "rope",
  ropes: "rope",
  shovel: "shovel",
  shovels: "shovel",
});

const DEFAULT_REFILL_SUPPLY_PLAN = Object.freeze({
  desiredCounts: Object.freeze({}),
  minimumHuntCounts: Object.freeze({}),
  buyCaps: Object.freeze({}),
  reserveGold: 0,
  protectedItems: Object.freeze([]),
  sellItems: Object.freeze([]),
  npcNames: Object.freeze([]),
  shopKeywords: Object.freeze([]),
  city: "",
  travelDestinations: Object.freeze([]),
  depotBranch: "",
  returnWaypoint: "",
  items: Object.freeze([]),
});

function toSnapshot(snapshotLike = {}) {
  const snapshot = snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
  if (!snapshot?.currency && snapshotLike?.currency) {
    return {
      ...snapshot,
      currency: snapshotLike.currency,
    };
  }

  return snapshot;
}

function normalizeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeTextArray(value = []) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[\n,;]+/);
  const seen = new Set();
  const normalized = [];

  for (const entry of source) {
    const text = normalizeText(entry);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

function compactKey(value = "") {
  return normalizeText(value).toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeSupplyPlanKey(value = "") {
  const text = normalizeText(value);
  if (!text) return "";
  return SUPPLY_PLAN_KEY_ALIASES[compactKey(text)] || text;
}

function getMapCount(map = {}, key = "") {
  const normalizedKey = normalizeSupplyPlanKey(key);
  if (!normalizedKey) return null;
  if (Object.prototype.hasOwnProperty.call(map, normalizedKey)) {
    return map[normalizedKey];
  }

  const lowerKey = normalizedKey.toLowerCase();
  for (const [entryKey, value] of Object.entries(map || {})) {
    if (String(entryKey).toLowerCase() === lowerKey) {
      return value;
    }
  }

  return null;
}

function getFirstCount(value = {}, fields = []) {
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      return normalizeInteger(value[field]);
    }
  }

  return null;
}

function normalizeCountMap(value = {}, fields = ["count", "amount"]) {
  const counts = {};
  if (!value) {
    return counts;
  }

  const entries = Array.isArray(value)
    ? value.map((entry) => {
      const key = normalizeSupplyPlanKey(
        entry?.key
        ?? entry?.category
        ?? entry?.name
        ?? entry?.itemName
        ?? entry?.label
        ?? "",
      );
      const count = getFirstCount(entry, fields);
      return [key, count];
    })
    : Object.entries(value).map(([key, entry]) => {
      const normalizedKey = normalizeSupplyPlanKey(key);
      const count = entry && typeof entry === "object"
        ? getFirstCount(entry, fields)
        : normalizeInteger(entry);
      return [normalizedKey, count];
    });

  for (const [key, count] of entries) {
    if (!key || count == null) continue;
    counts[key] = normalizeInteger(count);
  }

  return counts;
}

function normalizeSellRequests(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((entry) => {
      const operation = String(entry?.operation || "sell").trim().toLowerCase();
      const name = normalizeText(entry?.name ?? entry?.itemName ?? entry?.label);
      const amount = normalizeInteger(entry?.amount ?? entry?.count);
      if (!name) {
        return null;
      }

      return {
        operation: operation === "sell-all" ? "sell-all" : "sell",
        name,
        amount,
        moduleKey: normalizeText(entry?.moduleKey) || undefined,
        ruleIndex: Number.isInteger(entry?.ruleIndex) ? entry.ruleIndex : undefined,
      };
    })
    .filter(Boolean);
}

function normalizePlanItem(entry = {}) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const name = normalizeText(entry?.name ?? entry?.itemName ?? entry?.label);
  const category = normalizeSupplyPlanKey(entry?.category ?? entry?.key ?? entry?.kind ?? "");
  if (!name && !category) {
    return null;
  }

  return {
    name,
    category,
    desiredCount: normalizeInteger(
      entry?.desiredCount
      ?? entry?.desired
      ?? entry?.targetCount
      ?? entry?.target
      ?? entry?.count,
    ),
    minimumHuntCount: normalizeInteger(
      entry?.minimumHuntCount
      ?? entry?.minHuntCount
      ?? entry?.minimum
      ?? entry?.min
      ?? entry?.floor,
    ),
    buyCap: normalizeInteger(
      entry?.buyCap
      ?? entry?.cap
      ?? entry?.maxBuy
      ?? entry?.maxAmount,
    ),
    protected: entry?.protected === true,
  };
}

export function normalizeRefillSupplyPlan(plan = {}) {
  if (!plan || typeof plan !== "object") {
    return { ...DEFAULT_REFILL_SUPPLY_PLAN };
  }

  const desiredCounts = normalizeCountMap(
    plan.desiredCounts
    ?? plan.desired
    ?? plan.targets
    ?? plan.targetCounts
    ?? {},
    ["desiredCount", "desired", "targetCount", "target", "count", "amount"],
  );
  const minimumHuntCounts = normalizeCountMap(
    plan.minimumHuntCounts
    ?? plan.minHuntCounts
    ?? plan.minimumCounts
    ?? plan.minimums
    ?? plan.floors
    ?? {},
    ["minimumHuntCount", "minHuntCount", "minimum", "min", "floor", "count", "amount"],
  );
  const buyCaps = normalizeCountMap(
    plan.buyCaps
    ?? plan.caps
    ?? {},
    ["buyCap", "cap", "maxBuy", "maxAmount", "count", "amount"],
  );
  const items = (Array.isArray(plan.items) ? plan.items : [])
    .map((entry) => normalizePlanItem(entry))
    .filter(Boolean);

  for (const item of items) {
    if (item.desiredCount > 0) {
      desiredCounts[item.name || item.category] = item.desiredCount;
    }
    if (item.minimumHuntCount > 0) {
      minimumHuntCounts[item.name || item.category] = item.minimumHuntCount;
    }
    if (item.buyCap > 0) {
      buyCaps[item.name || item.category] = item.buyCap;
    }
  }

  return {
    desiredCounts,
    minimumHuntCounts,
    buyCaps,
    reserveGold: normalizeInteger(plan.reserveGold ?? plan.goldReserve),
    protectedItems: normalizeTextArray(
      plan.protectedItems
      ?? plan.protectedNames
      ?? plan.autoSellProtectedNames
      ?? [],
    ),
    sellItems: normalizeSellRequests(
      plan.sellItems
      ?? plan.sellList
      ?? plan.sellRequests
      ?? [],
    ),
    npcNames: normalizeTextArray(plan.npcNames ?? plan.npcName ?? []),
    shopKeywords: normalizeTextArray(plan.shopKeywords ?? plan.shopKeyword ?? []),
    city: normalizeText(plan.city),
    travelDestinations: normalizeTextArray(
      plan.travelDestinations
      ?? plan.destinations
      ?? plan.destination
      ?? [],
    ),
    depotBranch: normalizeText(plan.depotBranch ?? plan.serviceBranch ?? plan.startWaypoint),
    returnWaypoint: normalizeText(plan.returnWaypoint ?? plan.resumeWaypoint),
    items,
  };
}

function getPrimaryPotionSelector(vocationProfile = {}) {
  const potionPolicy = vocationProfile?.sustain?.potionPolicy || {};
  const healthThresholdPercent = normalizeInteger(potionPolicy?.healthThresholdPercent);
  const manaThresholdPercent = normalizeInteger(potionPolicy?.manaThresholdPercent);
  const preferMana = manaThresholdPercent > healthThresholdPercent;

  return preferMana
    ? normalizeText(potionPolicy?.preferredManaPotionNames?.[0] || "Mana Potion")
    : normalizeText(potionPolicy?.preferredHealthPotionNames?.[0] || "Health Potion");
}

function getAmmoRestockName(snapshot = {}, sustain = {}) {
  const ammoStatus = getAmmoStatus(snapshot, sustain?.ammoPolicy);
  return normalizeText(ammoStatus.name)
    || normalizeText(sustain?.ammoPolicy?.preferredNames?.[0] || "Arrow");
}

function getSupplyCount(snapshot = {}, key = "") {
  return normalizeInteger(snapshot?.inventory?.supplies?.[key]);
}

function collectInventoryItems(snapshot = {}) {
  const items = [];
  const addItem = (item = null) => {
    if (!item || typeof item !== "object") return;
    const name = normalizeText(item?.name ?? item?.label ?? item?.title);
    if (!name) return;
    items.push(item);
  };

  const equipmentSlots = Array.isArray(snapshot?.equipment?.slots)
    ? snapshot.equipment.slots
    : [];
  equipmentSlots.forEach(addItem);

  for (const container of Array.isArray(snapshot?.containers) ? snapshot.containers : []) {
    for (const slot of Array.isArray(container?.slots) ? container.slots : []) {
      addItem(slot);
    }
  }

  return items;
}

function getInventoryItemCount(snapshot = {}, name = "") {
  const nameKey = normalizeText(name).toLowerCase();
  if (!nameKey) return 0;

  return collectInventoryItems(snapshot)
    .filter((item) => normalizeText(item?.name ?? item?.label ?? item?.title).toLowerCase() === nameKey)
    .reduce((sum, item) => sum + Math.max(1, normalizeInteger(item?.count ?? item?.amount ?? 1)), 0);
}

function hasInventorySources(snapshot = {}) {
  return Array.isArray(snapshot?.containers) || Array.isArray(snapshot?.equipment?.slots);
}

function getSupplyDefinitionCount(snapshot = {}, definition = {}) {
  if (definition.category && SUPPLY_PLAN_KEY_ALIASES[compactKey(definition.category)] === definition.category) {
    return getSupplyCount(snapshot, definition.category);
  }
  if (definition.category && ["potions", "runes", "food", "ammo", "rope", "shovel"].includes(definition.category)) {
    return getSupplyCount(snapshot, definition.category);
  }
  return getInventoryItemCount(snapshot, definition.name);
}

function resolveDesiredCount(plan = DEFAULT_REFILL_SUPPLY_PLAN, definition = {}, fallback = 0) {
  const keys = [definition.category, definition.name].filter(Boolean);
  for (const key of keys) {
    const planned = getMapCount(plan.desiredCounts, key);
    if (planned != null) {
      return normalizeInteger(planned);
    }
  }

  return normalizeInteger(fallback);
}

function resolveMinimumHuntCount(plan = DEFAULT_REFILL_SUPPLY_PLAN, definition = {}, desiredCount = 0) {
  const keys = [definition.category, definition.name].filter(Boolean);
  for (const key of keys) {
    const planned = getMapCount(plan.minimumHuntCounts, key);
    if (planned != null) {
      return normalizeInteger(planned);
    }
  }

  return normalizeInteger(desiredCount);
}

function resolveBuyCap(plan = DEFAULT_REFILL_SUPPLY_PLAN, definition = {}) {
  const keys = [definition.category, definition.name].filter(Boolean);
  for (const key of keys) {
    const planned = getMapCount(plan.buyCaps, key);
    if (planned != null) {
      return normalizeInteger(planned);
    }
  }

  return 0;
}

function mergeSellRequests(...groups) {
  const seen = new Set();
  const merged = [];
  for (const request of normalizeSellRequests(groups.flat())) {
    const key = [
      request.operation,
      request.name.toLowerCase(),
      request.amount,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(request);
  }

  return merged;
}

function shouldIncludeSellRequest(snapshot = {}, request = {}) {
  const operation = String(request?.operation || "").trim().toLowerCase();
  if (!operation.startsWith("sell")) {
    return true;
  }
  if (!hasInventorySources(snapshot)) {
    return true;
  }

  const carriedCount = getInventoryItemCount(snapshot, request?.name);
  if (operation === "sell-all") {
    return carriedCount > 0;
  }

  const amount = normalizeInteger(request?.amount);
  return amount > 0 ? carriedCount >= Math.min(amount, carriedCount || amount) : carriedCount > 0;
}

function hasKnownCarriedGold(snapshot = {}) {
  return Number.isFinite(Number(snapshot?.currency?.totalGoldValue))
    || typeof snapshot?.currency?.overflowSignature === "string";
}

function buildRefillDefinitions(snapshot = {}, vocationProfile = {}, options = {}, plan = DEFAULT_REFILL_SUPPLY_PLAN) {
  const sustain = vocationProfile?.sustain || {};
  const supplyThresholds = sustain?.supplyThresholds || {};
  const ammoStatus = getAmmoStatus(snapshot, sustain?.ammoPolicy);
  const definitions = [];
  const addDefinition = (definition = {}) => {
    const name = normalizeText(definition.name);
    const category = normalizeSupplyPlanKey(definition.category);
    if (!name && !category) return;

    const desiredCount = resolveDesiredCount(plan, { name, category }, definition.defaultDesiredCount);
    if (desiredCount <= 0) return;

    const currentCount = getSupplyDefinitionCount(snapshot, { name, category });
    const minimumHuntCount = resolveMinimumHuntCount(plan, { name, category }, desiredCount);
    definitions.push({
      name,
      category,
      currentCount,
      desiredCount,
      minimumHuntCount,
      buyCap: resolveBuyCap(plan, { name, category }),
    });
  };

  addDefinition({
    category: "potions",
    name: getPrimaryPotionSelector(vocationProfile),
    defaultDesiredCount: supplyThresholds?.potions,
  });
  addDefinition({
    category: "runes",
    name: normalizeText(sustain?.runePolicy?.preferredRuneNames?.[0] || "Sudden Death Rune"),
    defaultDesiredCount: supplyThresholds?.runes,
  });
  addDefinition({
    category: "food",
    name: DEFAULT_BUY_BY_CATEGORY.food,
    defaultDesiredCount: supplyThresholds?.food,
  });

  const plannedAmmoTarget = getMapCount(plan.desiredCounts, "ammo");
  if (
    options.includeAmmo !== false
    && (ammoStatus.enabled || plannedAmmoTarget != null)
  ) {
    addDefinition({
      category: "ammo",
      name: getAmmoRestockName(snapshot, sustain),
      defaultDesiredCount: plannedAmmoTarget != null ? plannedAmmoTarget : ammoStatus.warningCount,
    });
  }

  for (const [category, targetCount] of Object.entries(DEFAULT_TOOL_TARGETS)) {
    const plannedTarget = getMapCount(plan.desiredCounts, category);
    if (options.includeTools === false && plannedTarget == null) {
      continue;
    }
    addDefinition({
      category,
      name: DEFAULT_BUY_BY_CATEGORY[category],
      defaultDesiredCount: plannedTarget != null ? plannedTarget : targetCount,
    });
  }

  for (const item of plan.items) {
    if (!item.name && !item.category) continue;
    addDefinition({
      category: item.category,
      name: item.name || DEFAULT_BUY_BY_CATEGORY[item.category] || item.category,
      defaultDesiredCount: item.desiredCount,
    });
  }

  return definitions;
}

function buildBuyRequestsFromDefinitions(definitions = [], {
  moduleKey = "refill",
  ruleIndex = null,
} = {}) {
  const requests = [];
  for (const definition of definitions) {
    const deficit = definition.desiredCount - definition.currentCount;
    if (deficit <= 0) continue;

    const amount = definition.buyCap > 0
      ? Math.min(deficit, definition.buyCap)
      : deficit;
    const request = buildBuyRequest(definition.name, amount, { moduleKey, ruleIndex });
    if (!request) continue;

    requests.push({
      ...request,
      category: definition.category || "",
      currentCount: definition.currentCount,
      desiredCount: definition.desiredCount,
      minimumHuntCount: definition.minimumHuntCount,
      buyCap: definition.buyCap,
    });
  }

  return requests;
}

function getExecutableShopStates(snapshot = {}, requests = [], tradeState = {}, plan = DEFAULT_REFILL_SUPPLY_PLAN) {
  const normalizedTrade = normalizeTradeState(tradeState);
  const knownGold = hasKnownCarriedGold(snapshot) ? getCarriedGoldValue(snapshot) : null;
  let availableGold = knownGold == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, knownGold - plan.reserveGold);

  return requests.map((request) => {
    const matchedEntry = findTradeEntryForRequest(normalizedTrade, request);
    if (!matchedEntry) {
      return {
        request,
        matchedEntry: null,
        action: null,
        blockedReason: "not-visible",
      };
    }

    let action = buildExecutableShopAction(normalizedTrade, request);
    if (!action) {
      return {
        request,
        matchedEntry,
        action: null,
        blockedReason: "not-executable",
      };
    }

    if (String(request?.operation || "buy") === "buy") {
      const price = normalizeInteger(matchedEntry.price);
      const requestedAmount = normalizeInteger(action.amount);
      if (price > 0 && Number.isFinite(availableGold)) {
        const affordableAmount = Math.floor(availableGold / price);
        const actionAmount = Math.min(requestedAmount, affordableAmount);
        if (actionAmount <= 0) {
          return {
            request,
            matchedEntry,
            action: null,
            blockedReason: "reserve-gold",
          };
        }
        action = {
          ...action,
          amount: actionAmount,
          reserveLimited: actionAmount < requestedAmount,
        };
        availableGold -= actionAmount * price;
      }
    }

    return {
      request,
      matchedEntry,
      action,
      blockedReason: "",
    };
  });
}

function buildBuyRequest(name, amount, {
  moduleKey = "refill",
  ruleIndex = null,
} = {}) {
  const normalizedName = normalizeText(name);
  const normalizedAmount = normalizeInteger(amount);
  if (!normalizedName || normalizedAmount <= 0) {
    return null;
  }

  return {
    operation: "buy",
    name: normalizedName,
    amount: normalizedAmount,
    moduleKey,
    ruleIndex,
  };
}

export function buildRefillRequests(snapshotLike = {}, vocationProfile = {}, {
  moduleKey = "refill",
  ruleIndex = null,
  includeTools = true,
  includeAmmo = true,
  sellRequests = [],
  supplyPlan = {},
  refillPlan = null,
  autoSell = false,
  autoSellMinFreeSlots = 2,
  autoSellProtectedNames = [],
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const plan = normalizeRefillSupplyPlan(refillPlan || supplyPlan);
  const requests = [];

  requests.push(...buildCapacityAwareAutosellRequests(snapshot, {
    enabled: autoSell === true,
    minFreeSlots: autoSellMinFreeSlots,
    protectedNames: [
      ...normalizeTextArray(autoSellProtectedNames),
      ...plan.protectedItems,
    ],
    moduleKey,
    ruleIndex,
  }));

  requests.push(...buildBuyRequestsFromDefinitions(
    buildRefillDefinitions(snapshot, vocationProfile, { includeTools, includeAmmo }, plan),
    { moduleKey, ruleIndex },
  ));

  for (const sellRequest of mergeSellRequests(sellRequests, plan.sellItems)) {
    const operation = String(sellRequest?.operation || "sell").trim().toLowerCase();
    const name = normalizeText(sellRequest?.name);
    const amount = normalizeInteger(sellRequest?.amount);
    if (!name) {
      continue;
    }
    if (!shouldIncludeSellRequest(snapshot, sellRequest)) {
      continue;
    }

    requests.push({
      operation,
      name,
      amount,
      moduleKey,
      ruleIndex,
    });
  }

  return requests.filter(Boolean);
}

export function buildRefillPlan(snapshotLike = {}, vocationProfile = {}, options = {}) {
  return buildRefillRequests(snapshotLike, vocationProfile, options)
    .map((request) => buildShopAction(request))
    .filter(Boolean);
}

export function hasRefillNeed(snapshotLike = {}, vocationProfile = {}, options = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const plan = normalizeRefillSupplyPlan(options.refillPlan || options.supplyPlan);
  const definitions = buildRefillDefinitions(snapshot, vocationProfile, options, plan);
  if (definitions.some((definition) => (
    definition.desiredCount > definition.currentCount
    && definition.minimumHuntCount > definition.currentCount
  ))) {
    return true;
  }

  const autoSellRequests = buildCapacityAwareAutosellRequests(snapshot, {
    enabled: options.autoSell === true,
    minFreeSlots: options.autoSellMinFreeSlots,
    protectedNames: [
      ...normalizeTextArray(options.autoSellProtectedNames),
      ...plan.protectedItems,
    ],
    moduleKey: options.moduleKey || "refill",
    ruleIndex: Number.isInteger(options.ruleIndex) ? options.ruleIndex : null,
  });
  if (autoSellRequests.length > 0) {
    return true;
  }

  return mergeSellRequests(options.sellRequests || [], plan.sellItems)
    .some((request) => shouldIncludeSellRequest(snapshot, request));
}

export function buildRefillRuntimePlan(snapshotLike = {}, vocationProfile = {}, options = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const tradeState = normalizeTradeState(snapshot?.trade ?? snapshotLike?.trade ?? {});
  const plan = normalizeRefillSupplyPlan(options.refillPlan || options.supplyPlan);
  if (!tradeState.open) {
    return [];
  }

  const prioritizedRequests = prioritizeShopRequests(
    buildRefillRequests(snapshot, vocationProfile, options),
    tradeState,
  );

  return getExecutableShopStates(snapshot, prioritizedRequests, tradeState, plan)
    .map((state) => state.action)
    .filter(Boolean);
}

export function buildRefillReport(snapshotLike = {}, vocationProfile = {}, options = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const tradeState = normalizeTradeState(snapshot?.trade ?? snapshotLike?.trade ?? {});
  const plan = normalizeRefillSupplyPlan(options.refillPlan || options.supplyPlan);
  const requests = buildRefillRequests(snapshot, vocationProfile, options);
  const prioritizedRequests = prioritizeShopRequests(requests, tradeState);
  const executableStates = getExecutableShopStates(snapshot, prioritizedRequests, tradeState, plan);
  const executableRequests = executableStates
    .filter((state) => state.action)
    .map((state) => state.request);
  const blockedStates = executableStates.filter((state) => !state.action);
  const blockedRequests = blockedStates.map((state) => state.request);
  const estimate = (state) => {
    const entry = state?.matchedEntry;
    if (!entry?.price) return 0;
    const amount = String(state?.request?.operation || "").startsWith("sell")
      ? Math.max(1, normalizeInteger(state?.request?.amount || 1))
      : normalizeInteger(state?.action?.amount ?? state?.request?.amount);
    return Math.max(0, entry.price * amount);
  };
  const knownGold = hasKnownCarriedGold(snapshot) ? getCarriedGoldValue(snapshot) : null;

  return {
    tradeOpen: tradeState.open,
    requestCount: requests.length,
    executableCount: executableRequests.length,
    blockedCount: blockedRequests.length,
    buyCount: requests.filter((request) => String(request?.operation || "buy") === "buy").length,
    sellCount: requests.filter((request) => String(request?.operation || "").startsWith("sell")).length,
    estimatedBuyCost: prioritizedRequests
      .map((request) => executableStates.find((state) => state.request === request))
      .filter((state) => state?.action && String(state.request?.operation || "buy") === "buy")
      .reduce((sum, state) => sum + estimate(state), 0),
    estimatedSellValue: prioritizedRequests
      .map((request) => executableStates.find((state) => state.request === request))
      .filter((state) => state?.action && String(state.request?.operation || "").startsWith("sell"))
      .reduce((sum, state) => sum + estimate(state), 0),
    reserveGold: plan.reserveGold,
    availableGoldForBuys: knownGold == null ? null : Math.max(0, knownGold - plan.reserveGold),
    requests: prioritizedRequests,
    executableRequests,
    blockedRequests,
    blockedRequestReasons: blockedStates.map((state) => ({
      name: state.request?.name || "",
      operation: state.request?.operation || "buy",
      reason: state.blockedReason || "blocked",
    })),
  };
}

export function chooseRefillAction(snapshotLike = {}, vocationProfile = {}, options = {}) {
  return buildRefillRuntimePlan(snapshotLike, vocationProfile, options)[0] || null;
}
