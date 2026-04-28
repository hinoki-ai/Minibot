/*
 * Hotbar selector and action-builder helpers for spell and item slots.
 * Shared modules should use these helpers instead of hardcoding slot-search
 * logic for spells, items, text entries, or action slots, and should emit
 * stable `useHotbarSlot` actions through this file.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeInteger(value) {
  if (value == null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

export function normalizeHotbarSelector(selector = {}) {
  return {
    slotIndex: normalizeInteger(selector?.slotIndex ?? selector?.index),
    kind: normalizeText(selector?.kind).toLowerCase(),
    actionType: normalizeText(selector?.actionType ?? selector?.action).toLowerCase(),
    name: normalizeText(selector?.name).toLowerCase(),
    label: normalizeText(selector?.label).toLowerCase(),
    words: normalizeText(selector?.words).toLowerCase(),
    spellName: normalizeText(selector?.spellName ?? selector?.name).toLowerCase(),
    itemId: normalizeInteger(selector?.itemId),
    category: normalizeText(selector?.category).toLowerCase(),
    enabled: selector?.enabled === true,
  };
}

export function hotbarSlotMatches(slot = {}, selector = {}) {
  const normalizedSelector = normalizeHotbarSelector(selector);
  const slotKind = normalizeText(slot?.kind).toLowerCase();
  const slotActionType = normalizeText(slot?.actionType).toLowerCase();
  const slotWords = normalizeText(slot?.words).toLowerCase();
  const slotSpellName = normalizeText(slot?.spellName).toLowerCase();
  const slotLabel = normalizeText(slot?.label).toLowerCase();
  const slotItemName = normalizeText(slot?.item?.name).toLowerCase();
  const slotItemId = normalizeInteger(slot?.itemId ?? slot?.item?.id);
  const slotNameHaystack = [slotItemName, slotLabel, slotSpellName, slotWords]
    .filter(Boolean)
    .join(" ");

  if (normalizedSelector.slotIndex != null && normalizeInteger(slot?.index) !== normalizedSelector.slotIndex) {
    return false;
  }
  if (normalizedSelector.kind && slotKind !== normalizedSelector.kind) {
    return false;
  }
  if (normalizedSelector.actionType && slotActionType !== normalizedSelector.actionType) {
    return false;
  }
  if (normalizedSelector.name && !slotNameHaystack.includes(normalizedSelector.name)) {
    return false;
  }
  if (normalizedSelector.label && !slotNameHaystack.includes(normalizedSelector.label)) {
    return false;
  }
  if (normalizedSelector.words && !slotWords.includes(normalizedSelector.words)) {
    return false;
  }
  if (normalizedSelector.spellName) {
    const haystack = [slotSpellName, slotLabel, slotItemName].filter(Boolean).join(" ");
    if (!haystack.includes(normalizedSelector.spellName)) {
      return false;
    }
  }
  if (normalizedSelector.itemId != null && slotItemId !== normalizedSelector.itemId) {
    return false;
  }
  if (normalizedSelector.category && slot?.item?.flags?.[normalizedSelector.category] !== true) {
    return false;
  }
  if (normalizedSelector.enabled && slot?.enabled !== true) {
    return false;
  }

  return slot?.empty !== true;
}

export function findHotbarSlot(snapshotLike = {}, selector = {}, { includeDisabled = false } = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const slots = Array.isArray(snapshot?.inventory?.hotbar?.slots) ? snapshot.inventory.hotbar.slots : [];
  return slots.find((slot) => {
    if (!includeDisabled && slot?.enabled === false) {
      return false;
    }
    return hotbarSlotMatches(slot, selector);
  }) || null;
}

export function buildHotbarSlotAction(snapshotLike = {}, selector = {}, extra = {}) {
  const slot = findHotbarSlot(snapshotLike, selector);
  if (!slot) {
    return null;
  }

  return {
    type: "useHotbarSlot",
    slotIndex: slot.index,
    kind: slot.kind,
    label: slot.label,
    words: slot.words,
    spellName: slot.spellName,
    actionType: slot.actionType,
    itemId: slot.itemId,
    ...extra,
  };
}
