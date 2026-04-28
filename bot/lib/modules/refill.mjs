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

const DEFAULT_TOOL_TARGETS = Object.freeze({
  rope: 1,
  shovel: 1,
});

const DEFAULT_BUY_BY_CATEGORY = Object.freeze({
  food: "Ham",
  rope: "Rope",
  shovel: "Shovel",
});

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function normalizeText(value = "") {
  return String(value ?? "").trim();
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
  autoSell = false,
  autoSellMinFreeSlots = 2,
  autoSellProtectedNames = [],
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const sustain = vocationProfile?.sustain || {};
  const supplyThresholds = sustain?.supplyThresholds || {};
  const ammoStatus = getAmmoStatus(snapshot, sustain?.ammoPolicy);
  const requests = [];

  requests.push(...buildCapacityAwareAutosellRequests(snapshot, {
    enabled: autoSell === true,
    minFreeSlots: autoSellMinFreeSlots,
    protectedNames: autoSellProtectedNames,
    moduleKey,
    ruleIndex,
  }));

  const potionTarget = normalizeInteger(supplyThresholds?.potions);
  const potionCount = getSupplyCount(snapshot, "potions");
  if (potionTarget > potionCount) {
    requests.push(buildBuyRequest(
      getPrimaryPotionSelector(vocationProfile),
      potionTarget - potionCount,
      { moduleKey, ruleIndex },
    ));
  }

  const runeTarget = normalizeInteger(supplyThresholds?.runes);
  const runeCount = getSupplyCount(snapshot, "runes");
  if (runeTarget > runeCount) {
    requests.push(buildBuyRequest(
      normalizeText(sustain?.runePolicy?.preferredRuneNames?.[0] || "Sudden Death Rune"),
      runeTarget - runeCount,
      { moduleKey, ruleIndex },
    ));
  }

  const foodTarget = normalizeInteger(supplyThresholds?.food);
  const foodCount = getSupplyCount(snapshot, "food");
  if (foodTarget > foodCount) {
    requests.push(buildBuyRequest(
      DEFAULT_BUY_BY_CATEGORY.food,
      foodTarget - foodCount,
      { moduleKey, ruleIndex },
    ));
  }

  if (includeAmmo !== false && ammoStatus.enabled && ammoStatus.carriedCount < ammoStatus.warningCount) {
    requests.push(buildBuyRequest(
      getAmmoRestockName(snapshot, sustain),
      ammoStatus.warningCount - ammoStatus.carriedCount,
      { moduleKey, ruleIndex },
    ));
  }

  if (includeTools) {
    for (const [category, targetCount] of Object.entries(DEFAULT_TOOL_TARGETS)) {
      const currentCount = getSupplyCount(snapshot, category);
      if (targetCount > currentCount) {
        requests.push(buildBuyRequest(
          DEFAULT_BUY_BY_CATEGORY[category],
          targetCount - currentCount,
          { moduleKey, ruleIndex },
        ));
      }
    }
  }

  for (const sellRequest of Array.isArray(sellRequests) ? sellRequests : []) {
    const operation = String(sellRequest?.operation || "sell").trim().toLowerCase();
    const name = normalizeText(sellRequest?.name);
    const amount = normalizeInteger(sellRequest?.amount);
    if (!name) {
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
  return buildRefillRequests(snapshotLike, vocationProfile, options).length > 0;
}

export function buildRefillRuntimePlan(snapshotLike = {}, vocationProfile = {}, options = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const tradeState = normalizeTradeState(snapshot?.trade ?? snapshotLike?.trade ?? {});
  if (!tradeState.open) {
    return [];
  }

  return prioritizeShopRequests(
    buildRefillRequests(snapshot, vocationProfile, options),
    tradeState,
  )
    .map((request) => buildExecutableShopAction(tradeState, request))
    .filter(Boolean);
}

export function buildRefillReport(snapshotLike = {}, vocationProfile = {}, options = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const tradeState = normalizeTradeState(snapshot?.trade ?? snapshotLike?.trade ?? {});
  const requests = buildRefillRequests(snapshot, vocationProfile, options);
  const prioritizedRequests = prioritizeShopRequests(requests, tradeState);
  const executableRequests = prioritizedRequests.filter((request) => findTradeEntryForRequest(tradeState, request));
  const blockedRequests = prioritizedRequests.filter((request) => !findTradeEntryForRequest(tradeState, request));
  const estimate = (request) => {
    const entry = findTradeEntryForRequest(tradeState, request);
    if (!entry?.price) return 0;
    const amount = String(request?.operation || "").startsWith("sell")
      ? Math.max(1, normalizeInteger(request?.amount || 1))
      : normalizeInteger(request?.amount);
    return Math.max(0, entry.price * amount);
  };

  return {
    tradeOpen: tradeState.open,
    requestCount: requests.length,
    executableCount: executableRequests.length,
    blockedCount: blockedRequests.length,
    buyCount: requests.filter((request) => String(request?.operation || "buy") === "buy").length,
    sellCount: requests.filter((request) => String(request?.operation || "").startsWith("sell")).length,
    estimatedBuyCost: prioritizedRequests
      .filter((request) => String(request?.operation || "buy") === "buy")
      .reduce((sum, request) => sum + estimate(request), 0),
    estimatedSellValue: prioritizedRequests
      .filter((request) => String(request?.operation || "").startsWith("sell"))
      .reduce((sum, request) => sum + estimate(request), 0),
    requests: prioritizedRequests,
    executableRequests,
    blockedRequests,
  };
}

export function chooseRefillAction(snapshotLike = {}, vocationProfile = {}, options = {}) {
  return buildRefillRuntimePlan(snapshotLike, vocationProfile, options)[0] || null;
}
