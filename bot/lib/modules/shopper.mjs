/*
 * Visible trade normalization and shop-action builder.
 * It converts loose buy or sell requests plus live trade state into executable
 * shop actions, keeps sell-before-buy prioritization consistent, and stays
 * intentionally ignorant of travel or broader NPC workflow policy.
 */

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

export const SHOP_OPERATION_TYPES = Object.freeze([
  "buy",
  "sell",
  "sell-all",
]);

export function normalizeShopRequest(request = {}) {
  const operation = String(request?.operation || "buy").trim().toLowerCase();
  return {
    operation: SHOP_OPERATION_TYPES.includes(operation) ? operation : "buy",
    itemId: Number.isFinite(Number(request?.itemId)) ? Math.trunc(Number(request.itemId)) : null,
    name: normalizeText(request?.name),
    amount: normalizeInteger(request?.amount),
    moduleKey: normalizeText(request?.moduleKey) || null,
    ruleIndex: Number.isInteger(request?.ruleIndex) ? request.ruleIndex : null,
  };
}

export function buildShopAction(request = {}) {
  const normalized = normalizeShopRequest(request);
  return {
    type: normalized.operation === "buy"
      ? "buyItem"
      : normalized.operation === "sell-all"
        ? "sellAllOfItem"
        : "sellItem",
    itemId: normalized.itemId,
    name: normalized.name,
    amount: normalized.operation === "sell-all" ? 0 : normalized.amount,
    moduleKey: normalized.moduleKey,
    ruleIndex: normalized.ruleIndex,
  };
}

function normalizeTradeEntry(entry = {}, index = 0, side = "buy") {
  if (!entry || (typeof entry !== "object" && typeof entry !== "string")) {
    return null;
  }

  const itemId = Number.isFinite(Number(entry?.itemId ?? entry?.id))
    ? Math.trunc(Number(entry.itemId ?? entry.id))
    : null;
  const name = normalizeText(entry?.name ?? entry?.label ?? entry?.title ?? entry);
  const price = normalizeInteger(entry?.price ?? entry?.cost ?? entry?.value);
  const normalizedSide = normalizeText(entry?.side ?? side).toLowerCase() === "sell" ? "sell" : "buy";
  if (itemId == null && !name) {
    return null;
  }

  return {
    index: Number.isInteger(entry?.index) ? entry.index : index,
    itemId,
    name,
    price,
    side: normalizedSide,
  };
}

export function normalizeTradeState(tradeState = {}) {
  const buyItems = (Array.isArray(tradeState?.buyItems) ? tradeState.buyItems : [])
    .map((entry, index) => normalizeTradeEntry(entry, index, "buy"))
    .filter(Boolean);
  const sellItems = (Array.isArray(tradeState?.sellItems) ? tradeState.sellItems : [])
    .map((entry, index) => normalizeTradeEntry(entry, index, "sell"))
    .filter(Boolean);
  const activeSide = normalizeText(tradeState?.activeSide).toLowerCase();

  return {
    open: tradeState?.open === true || buyItems.length > 0 || sellItems.length > 0,
    npcName: normalizeText(tradeState?.npcName),
    activeSide: activeSide === "sell" ? "sell" : activeSide === "buy" ? "buy" : "",
    selectedItem: normalizeTradeEntry(tradeState?.selectedItem, 0, activeSide || "buy"),
    buyItems,
    sellItems,
  };
}

function requestMatchesTradeEntry(request = {}, entry = {}) {
  const normalizedRequest = normalizeShopRequest(request);
  const requestName = normalizedRequest.name.toLowerCase();
  const entryName = normalizeText(entry?.name).toLowerCase();

  if (normalizedRequest.itemId != null && normalizedRequest.itemId === entry?.itemId) {
    return true;
  }
  if (requestName && entryName.includes(requestName)) {
    return true;
  }

  return false;
}

export function findTradeEntryForRequest(tradeState = {}, request = {}) {
  const normalizedTrade = normalizeTradeState(tradeState);
  const normalizedRequest = normalizeShopRequest(request);
  const entries = normalizedRequest.operation === "buy"
    ? normalizedTrade.buyItems
    : normalizedTrade.sellItems;

  return entries.find((entry) => requestMatchesTradeEntry(normalizedRequest, entry)) || null;
}

export function buildExecutableShopAction(tradeState = {}, request = {}) {
  const matchedEntry = findTradeEntryForRequest(tradeState, request);
  if (!matchedEntry) {
    return null;
  }

  return buildShopAction({
    ...request,
    itemId: matchedEntry.itemId ?? request?.itemId ?? null,
    name: matchedEntry.name || request?.name || "",
  });
}

export function prioritizeShopRequests(requests = [], tradeState = {}) {
  const normalizedTrade = normalizeTradeState(tradeState);
  const visible = [];
  const deferred = [];

  for (const request of Array.isArray(requests) ? requests : []) {
    const matchedEntry = findTradeEntryForRequest(normalizedTrade, request);
    if (matchedEntry) {
      visible.push({
        request,
        matchedEntry,
      });
    } else {
      deferred.push(request);
    }
  }

  visible.sort((left, right) => {
    const leftPriority = String(left.request?.operation || "").startsWith("sell") ? 0 : 1;
    const rightPriority = String(right.request?.operation || "").startsWith("sell") ? 0 : 1;
    return leftPriority - rightPriority
      || String(left.request?.name || "").localeCompare(String(right.request?.name || ""))
      || Number(left.matchedEntry?.index ?? 0) - Number(right.matchedEntry?.index ?? 0);
  });

  return [
    ...visible.map((entry) => entry.request),
    ...deferred,
  ];
}
