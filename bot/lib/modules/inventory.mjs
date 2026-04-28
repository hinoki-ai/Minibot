/*
 * Flattened inventory selectors and source-reference builders.
 * This is the reusable read layer for equipment and open container state
 * consumed by the higher-level planner modules, turning snapshot inventory
 * state into selectors, source refs, container summaries, and merge or
 * empty-slot lookups.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  collectSnapshotInventoryItems,
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

export function normalizeItemSelector(selector = {}) {
  return {
    itemId: normalizeInteger(selector?.itemId),
    name: normalizeText(selector?.name).toLowerCase(),
    category: normalizeText(selector?.category).toLowerCase(),
    ownerType: normalizeText(selector?.ownerType).toLowerCase(),
    slotIndex: normalizeInteger(selector?.slotIndex),
    containerRuntimeId: normalizeInteger(
      selector?.containerRuntimeId
      ?? selector?.runtimeId,
    ),
  };
}

export function entryMatchesSelector(entry = {}, selector = {}) {
  const normalizedSelector = normalizeItemSelector(selector);
  const ownerType = normalizeText(entry?.ownerType).toLowerCase();
  const item = entry?.item || {};
  const itemId = normalizeInteger(item?.id);
  const itemName = normalizeText(item?.name).toLowerCase();
  const slotLabel = normalizeText(entry?.slotLabel).toLowerCase();
  const slotIndex = normalizeInteger(entry?.slotIndex);
  const ownerId = normalizeInteger(entry?.ownerId);

  if (normalizedSelector.ownerType && ownerType !== normalizedSelector.ownerType) {
    return false;
  }
  if (normalizedSelector.itemId != null && itemId !== normalizedSelector.itemId) {
    return false;
  }
  if (normalizedSelector.name) {
    const haystack = [itemName, slotLabel].filter(Boolean).join(" ");
    if (!haystack.includes(normalizedSelector.name)) {
      return false;
    }
  }
  if (normalizedSelector.category && item?.flags?.[normalizedSelector.category] !== true) {
    return false;
  }
  if (normalizedSelector.slotIndex != null && slotIndex !== normalizedSelector.slotIndex) {
    return false;
  }
  if (
    normalizedSelector.containerRuntimeId != null
    && ownerType === "container"
    && ownerId !== normalizedSelector.containerRuntimeId
  ) {
    return false;
  }

  return Boolean(item?.name || item?.id != null);
}

export function findInventoryEntries(snapshotLike = {}, selector = {}, { ownerTypes = null } = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const allowedOwnerTypes = Array.isArray(ownerTypes)
    ? ownerTypes.map((entry) => normalizeText(entry).toLowerCase()).filter(Boolean)
    : null;

  return collectSnapshotInventoryItems(snapshot)
    .filter((entry) => !allowedOwnerTypes || allowedOwnerTypes.includes(normalizeText(entry?.ownerType).toLowerCase()))
    .filter((entry) => entryMatchesSelector(entry, selector));
}

export function buildInventorySourceRef(entry = {}) {
  const ownerType = normalizeText(entry?.ownerType).toLowerCase();
  const slotIndex = normalizeInteger(entry?.slotIndex);
  if (slotIndex == null) {
    return null;
  }

  if (ownerType === "equipment") {
    return {
      location: "equipment",
      slotIndex,
    };
  }

  if (ownerType === "container") {
    const containerRuntimeId = normalizeInteger(entry?.ownerId);
    return {
      location: "container",
      containerRuntimeId,
      slotIndex,
    };
  }

  return null;
}

export function summarizeContainers(snapshotLike = {}) {
  const snapshot = toSnapshot(snapshotLike);
  return (Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [])
    .map((container) => {
      const slots = Array.isArray(container?.slots) ? container.slots : [];
      const usedSlotCount = slots.filter((slot) => slot?.item).length;
      return {
        runtimeId: normalizeInteger(container?.runtimeId),
        itemId: normalizeInteger(container?.itemId),
        name: normalizeText(container?.name),
        open: container?.open !== false,
        slotCount: slots.length,
        usedSlotCount,
        freeSlotCount: Math.max(0, slots.length - usedSlotCount),
      };
    });
}

function matchesContainer(container = {}, matcher = {}) {
  const wantedRuntimeId = normalizeInteger(matcher?.containerRuntimeId ?? matcher?.runtimeId);
  const wantedName = normalizeText(matcher?.name).toLowerCase();
  const containerRuntimeId = normalizeInteger(container?.runtimeId);
  const containerName = normalizeText(container?.name).toLowerCase();

  if (wantedRuntimeId != null && containerRuntimeId !== wantedRuntimeId) {
    return false;
  }
  if (wantedName && !containerName.includes(wantedName)) {
    return false;
  }
  return container?.open !== false;
}

export function findContainer(snapshotLike = {}, matcher = {}) {
  const snapshot = toSnapshot(snapshotLike);
  return (Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [])
    .find((container) => matchesContainer(container, matcher)) || null;
}

export function findFirstEmptyContainerSlot(snapshotLike = {}, matcher = {}) {
  const container = findContainer(snapshotLike, matcher);
  if (!container) {
    return null;
  }

  const slot = (Array.isArray(container?.slots) ? container.slots : [])
    .find((entry) => !entry?.item) || null;
  if (!slot) {
    return null;
  }

  return {
    location: "container",
    containerRuntimeId: normalizeInteger(container.runtimeId),
    slotIndex: normalizeInteger(slot.index),
  };
}

export function findStackTarget(snapshotLike = {}, entry = {}, matcher = {}) {
  const sourceItem = entry?.item || {};
  const sourceItemId = normalizeInteger(sourceItem?.id);
  const sourceItemName = normalizeText(sourceItem?.name).toLowerCase();
  if (sourceItemId == null && !sourceItemName) {
    return null;
  }

  const snapshot = toSnapshot(snapshotLike);
  const containers = Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [];
  for (const container of containers) {
    if (!matchesContainer(container, matcher)) {
      continue;
    }

    for (const slot of Array.isArray(container?.slots) ? container.slots : []) {
      const targetItem = slot?.item || null;
      if (!targetItem) continue;

      const targetItemId = normalizeInteger(targetItem?.id);
      const targetItemName = normalizeText(targetItem?.name).toLowerCase();
      if (
        (sourceItemId != null && targetItemId === sourceItemId)
        || (sourceItemName && targetItemName === sourceItemName)
      ) {
        return {
          location: "container",
          containerRuntimeId: normalizeInteger(container.runtimeId),
          slotIndex: normalizeInteger(slot.index),
        };
      }
    }
  }

  return null;
}
