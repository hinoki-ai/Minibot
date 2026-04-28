/*
 * Ammo policy normalization and quiver planning for sustain and refill.
 * It accepts raw or normalized Minibia snapshots, resolves carried-versus-equipped
 * ammo, and returns status plus reload or restock actions without touching the
 * live page directly.
 */

import {
  collectSnapshotInventoryItems,
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { planContainerMove } from "./container-routing.mjs";
import {
  buildInventorySourceRef,
  findInventoryEntries,
} from "./inventory.mjs";
import {
  buildExecutableShopAction,
  normalizeTradeState,
} from "./shopper.mjs";

export const DEFAULT_AMMO_RELOAD_AT_OR_BELOW = 25;
export const DEFAULT_AMMO_RELOAD_COOLDOWN_MS = 900;

const AMMO_SLOT_PATTERN = /\b(?:quiver|ammo|ammunition|arrow|bolt|power\s*bolt|spear|dart|throwing)\b/i;
const COIN_NAME_PATTERN = /\b(?:gold|platinum|crystal)\s+coin\b/i;
const COIN_ITEM_IDS = new Set([3031, 3035, 3043]);

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLookup(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function normalizeOptionalInteger(value) {
  if (value == null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function normalizeTextList(value = []) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[\n,;]+/);
  const normalized = [];
  const seen = new Set();

  for (const entry of source) {
    const text = normalizeText(entry);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

function normalizeBoolean(value, fallback = false) {
  if (value == null) {
    return Boolean(fallback);
  }
  return value === true;
}

function shouldRejectAmmoCoins(ammoPolicy = {}) {
  return ammoPolicy?.enabled === true;
}

function isAmmoLikeItem(item = {}, { rejectCoins = true } = {}) {
  const itemId = normalizeOptionalInteger(item?.id ?? item?.itemId);
  const itemName = normalizeText(item?.name);
  if (rejectCoins && ((itemId != null && COIN_ITEM_IDS.has(itemId)) || COIN_NAME_PATTERN.test(itemName))) {
    return false;
  }

  if (item?.flags?.ammo === true) {
    return true;
  }

  return AMMO_SLOT_PATTERN.test([
    item?.name,
    item?.slotType,
  ].filter(Boolean).join(" "));
}

function getCarriedAmmoCount(snapshot = {}, { rejectCoins = true } = {}) {
  return collectSnapshotInventoryItems(snapshot)
    .filter((entry) => isAmmoLikeItem(entry?.item, { rejectCoins }))
    .reduce((sum, entry) => sum + Math.max(0, normalizeInteger(entry?.item?.count)), 0);
}

function sameAmmoItem(left = {}, right = {}) {
  const leftId = normalizeInteger(left?.id);
  const rightId = normalizeInteger(right?.id);
  if (leftId > 0 && rightId > 0) {
    return leftId === rightId;
  }

  const leftName = normalizeLookup(left?.name);
  const rightName = normalizeLookup(right?.name);
  return Boolean(leftName) && leftName === rightName;
}

function findAmmoEquipmentSlot(snapshot = {}) {
  const slots = Array.isArray(snapshot?.inventory?.equipment?.slots)
    ? snapshot.inventory.equipment.slots
    : [];
  const explicitIndex = normalizeOptionalInteger(snapshot?.inventory?.ammo?.slotIndex);

  if (explicitIndex != null && explicitIndex >= 0) {
    const explicitSlot = slots.find((slot) => normalizeOptionalInteger(slot?.index) === explicitIndex) || null;
    if (explicitSlot) {
      return explicitSlot;
    }
  }

  return slots.find((slot) => {
    const text = [
      slot?.label,
      slot?.item?.name,
      slot?.item?.slotType,
    ].filter(Boolean).join(" ");
    return AMMO_SLOT_PATTERN.test(text);
  }) || null;
}

function buildEquipmentEntry(slot = {}) {
  return {
    ownerType: "equipment",
    ownerId: "equipment",
    slotIndex: normalizeOptionalInteger(slot?.index),
    slotLabel: normalizeText(slot?.label),
    item: slot?.item || null,
  };
}

function matchPreferredAmmoIndex(itemName = "", preferredNames = []) {
  const itemKey = normalizeLookup(itemName);
  if (!itemKey) {
    return Number.POSITIVE_INFINITY;
  }

  let partialMatch = Number.POSITIVE_INFINITY;
  for (let index = 0; index < preferredNames.length; index += 1) {
    const preferredKey = normalizeLookup(preferredNames[index]);
    if (!preferredKey) {
      continue;
    }
    if (itemKey === preferredKey) {
      return index;
    }
    if (partialMatch === Number.POSITIVE_INFINITY && itemKey.includes(preferredKey)) {
      partialMatch = index + 0.5;
    }
  }

  return partialMatch;
}

function sortAmmoEntries(entries = [], preferredNames = []) {
  return [...entries].sort((left, right) => {
    const leftPreferred = matchPreferredAmmoIndex(left?.item?.name, preferredNames);
    const rightPreferred = matchPreferredAmmoIndex(right?.item?.name, preferredNames);
    return leftPreferred - rightPreferred
      || normalizeInteger(right?.item?.count) - normalizeInteger(left?.item?.count)
      || normalizeLookup(left?.item?.name).localeCompare(normalizeLookup(right?.item?.name));
  });
}

function chooseAmmoSourceEntry(snapshot = {}, ammoSlot = null, preferredNames = [], {
  rejectCoins = true,
} = {}) {
  const sources = findInventoryEntries(snapshot, {
    category: "ammo",
  }, {
    ownerTypes: ["container"],
  }).filter((entry) => isAmmoLikeItem(entry?.item, { rejectCoins }));
  if (!sources.length) {
    return null;
  }

  const currentItem = ammoSlot?.item || null;
  if (currentItem) {
    const sameAmmoSources = sources.filter((entry) => sameAmmoItem(entry?.item, currentItem));
    if (sameAmmoSources.length) {
      return sortAmmoEntries(sameAmmoSources, preferredNames)[0] || null;
    }
  }

  const preferredMatches = sortAmmoEntries(sources, preferredNames)
    .filter((entry) => Number.isFinite(matchPreferredAmmoIndex(entry?.item?.name, preferredNames)));
  if (preferredMatches.length) {
    return preferredMatches[0];
  }

  return sortAmmoEntries(sources, preferredNames)[0] || null;
}

function resolveRestockName(snapshot = {}, ammoPolicy = {}, status = null) {
  const equippedName = normalizeText(status?.name);
  if (equippedName) {
    return equippedName;
  }

  const preferredName = normalizeText(ammoPolicy?.preferredNames?.[0]);
  if (preferredName) {
    return preferredName;
  }

  return "Arrow";
}

export function resolveAmmoPolicy(vocationProfile = {}, options = {}) {
  const basePolicy = vocationProfile?.sustain?.ammoPolicy || {};
  const configuredPreferredNames = normalizeTextList(options?.ammoPreferredNames);
  const basePreferredNames = normalizeTextList(basePolicy?.preferredNames);
  const preferredNames = configuredPreferredNames.length
    ? configuredPreferredNames
    : basePreferredNames;

  const configuredMinimumCount = normalizeInteger(options?.ammoMinimumCount);
  const configuredWarningCount = normalizeInteger(options?.ammoWarningCount);
  const baseMinimumCount = Math.max(0, normalizeInteger(basePolicy?.minimumCount));
  const baseWarningCount = Math.max(baseMinimumCount, normalizeInteger(basePolicy?.warningCount));
  const minimumCount = configuredMinimumCount > 0 ? configuredMinimumCount : baseMinimumCount;
  const warningCount = Math.max(
    minimumCount,
    configuredWarningCount > 0 ? configuredWarningCount : baseWarningCount,
  );
  const enabled = normalizeBoolean(options?.ammoEnabled, true) && (
    basePolicy?.enabled === true
    || minimumCount > 0
    || warningCount > 0
    || preferredNames.length > 0
  );

  return {
    enabled,
    restockEnabled: enabled && normalizeBoolean(options?.ammoRestockEnabled, true),
    reloadEnabled: enabled && normalizeBoolean(options?.ammoReloadEnabled, true),
    minimumCount,
    warningCount,
    preferredNames,
    reloadAtOrBelow: Math.max(
      0,
      normalizeInteger(options?.ammoReloadAtOrBelow) || DEFAULT_AMMO_RELOAD_AT_OR_BELOW,
    ),
    reloadCooldownMs: Math.max(
      0,
      normalizeInteger(options?.ammoReloadCooldownMs) || DEFAULT_AMMO_RELOAD_COOLDOWN_MS,
    ),
    requireNoTargets: normalizeBoolean(options?.ammoRequireNoTargets, false),
    requireStationary: normalizeBoolean(options?.ammoRequireStationary, false),
  };
}

export function applyAmmoPolicyToVocationProfile(vocationProfile = {}, options = {}) {
  if (!vocationProfile || typeof vocationProfile !== "object") {
    return vocationProfile;
  }

  return {
    ...vocationProfile,
    sustain: {
      ...(vocationProfile?.sustain || {}),
      ammoPolicy: resolveAmmoPolicy(vocationProfile, options),
    },
  };
}

export function getAmmoStatus(snapshotLike = {}, ammoPolicy = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const ammo = snapshot?.inventory?.ammo || null;
  const rejectCoins = shouldRejectAmmoCoins(ammoPolicy);
  const equippedAmmo = isAmmoLikeItem(ammo?.item ?? ammo, { rejectCoins })
    ? ammo
    : null;
  const count = normalizeInteger(equippedAmmo?.count);
  const carriedCount = getCarriedAmmoCount(snapshot, { rejectCoins });
  const minimumCount = normalizeInteger(ammoPolicy?.minimumCount);
  const warningCount = Math.max(minimumCount, normalizeInteger(ammoPolicy?.warningCount));
  const enabled = ammoPolicy?.enabled === true;
  const reloadAtOrBelow = Math.max(
    0,
    normalizeInteger(ammoPolicy?.reloadAtOrBelow) || DEFAULT_AMMO_RELOAD_AT_OR_BELOW,
  );
  const reloadEnabled = enabled && ammoPolicy?.reloadEnabled !== false;
  const restockEnabled = enabled && ammoPolicy?.restockEnabled !== false;

  return {
    enabled,
    reloadEnabled,
    restockEnabled,
    count,
    equippedCount: count,
    carriedCount,
    minimumCount,
    warningCount,
    reloadAtOrBelow,
    missing: enabled && carriedCount <= 0,
    low: restockEnabled && carriedCount > 0 && carriedCount <= warningCount,
    depleted: enabled && carriedCount < minimumCount,
    needsReload: reloadEnabled && count <= reloadAtOrBelow,
    itemId: equippedAmmo?.item?.id ?? equippedAmmo?.itemId ?? null,
    name: equippedAmmo?.item?.name ?? equippedAmmo?.name ?? "",
    slotIndex: normalizeOptionalInteger(ammo?.slotIndex),
    slotLabel: normalizeText(ammo?.slotLabel),
  };
}

export function buildAmmoReloadAction(snapshotLike = {}, ammoPolicy = {}, {
  preferredContainers = ["Backpack"],
  moduleKey = "ammo",
  ruleIndex = null,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const status = getAmmoStatus(snapshot, ammoPolicy);
  if (!status.enabled || !status.reloadEnabled) {
    return null;
  }

  const ammoSlot = findAmmoEquipmentSlot(snapshot);
  if (!ammoSlot) {
    return null;
  }
  const foreignOccupant = Boolean(ammoSlot?.item) && !isAmmoLikeItem(ammoSlot.item);
  if (!status.needsReload && !foreignOccupant) {
    return null;
  }

  const sourceEntry = chooseAmmoSourceEntry(snapshot, ammoSlot, ammoPolicy?.preferredNames, {
    rejectCoins: status.enabled,
  });
  if (!sourceEntry) {
    return null;
  }

  if (ammoSlot?.item && !sameAmmoItem(ammoSlot.item, sourceEntry.item)) {
    return planContainerMove(snapshot, buildEquipmentEntry(ammoSlot), {
      preferredContainers,
      allowMerge: true,
      moduleKey,
      ruleIndex,
    });
  }

  const from = buildInventorySourceRef(sourceEntry);
  if (!from) {
    return null;
  }

  return {
    type: "moveInventoryItem",
    from,
    to: {
      location: "equipment",
      slotIndex: normalizeInteger(ammoSlot.index),
    },
    count: Math.max(1, normalizeInteger(sourceEntry?.item?.count) || 1),
    itemId: sourceEntry?.item?.id ?? null,
    name: sourceEntry?.item?.name ?? "",
    label: sourceEntry?.item?.name ?? "",
    moduleKey,
    ruleIndex,
  };
}

export function buildAmmoRestockAction(snapshotLike = {}, ammoPolicy = {}, {
  moduleKey = "ammo",
  ruleIndex = null,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const status = getAmmoStatus(snapshot, ammoPolicy);
  if (!status.enabled || !status.restockEnabled || status.carriedCount >= status.warningCount) {
    return null;
  }

  const tradeState = normalizeTradeState(snapshot?.trade ?? snapshotLike?.trade ?? {});
  if (!tradeState.open) {
    return null;
  }

  return buildExecutableShopAction(tradeState, {
    operation: "buy",
    name: resolveRestockName(snapshot, ammoPolicy, status),
    amount: Math.max(0, status.warningCount - status.carriedCount),
    moduleKey,
    ruleIndex,
  });
}
