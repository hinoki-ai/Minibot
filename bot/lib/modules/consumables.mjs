/*
 * Reusable consumable selectors and action builders.
 * Feature modules should come here before inventing their own potion, rune, or
 * food search logic across hotbar and inventory state. The file resolves
 * hotbar-first or inventory-backed consumables and emits normalized item-use
 * actions for self, target, tile, or generic flows.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import {
  buildInventorySourceRef,
  findInventoryEntries,
  normalizeItemSelector,
} from "./inventory.mjs";
import { buildHotbarSlotAction, findHotbarSlot } from "./hotbar.mjs";

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

export function findConsumableEntry(snapshotLike = {}, selector = {}, { preferHotbar = true } = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const normalizedSelector = normalizeItemSelector(selector);

  if (preferHotbar) {
    const hotbarSlot = findHotbarSlot(snapshot, normalizedSelector);
    if (hotbarSlot) {
      return {
        ownerType: "hotbar",
        slotIndex: hotbarSlot.index,
        slotLabel: hotbarSlot.label,
        item: hotbarSlot.item || null,
        hotbarSlot,
      };
    }
  }

  return findInventoryEntries(snapshot, normalizedSelector, {
    ownerTypes: ["equipment", "container"],
  })[0] || null;
}

export function buildConsumableAction(snapshotLike = {}, selector = {}, {
  target = "self",
  preferHotbar = true,
  moduleKey = null,
  ruleIndex = null,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const normalizedSelector = normalizeItemSelector(selector);
  const entry = findConsumableEntry(snapshot, normalizedSelector, { preferHotbar });
  if (!entry) {
    return null;
  }

  if (entry.hotbarSlot) {
    return buildHotbarSlotAction(snapshot, { slotIndex: entry.hotbarSlot.index }, {
      moduleKey,
      ruleIndex,
    });
  }

  const actionType = (() => {
    const normalizedTarget = normalizeText(target).toLowerCase();
    if (normalizedTarget === "target") return "useItemOnTarget";
    if (normalizedTarget === "tile") return "useItemOnTile";
    if (normalizedTarget === "self") return "useItemOnSelf";
    return "useItem";
  })();

  return {
    type: actionType,
    itemId: normalizedSelector.itemId,
    name: selector?.name || entry?.item?.name || "",
    category: normalizedSelector.category || "",
    source: buildInventorySourceRef(entry),
    moduleKey,
    ruleIndex,
  };
}
