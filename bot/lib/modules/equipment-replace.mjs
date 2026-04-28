/*
 * Ring and amulet replacement planner with vendored metadata fallback.
 * It reads normalized inventory state, locates the live equipment slot, finds
 * a compatible replacement in open containers, and returns one normalized move
 * action without direct page interaction.
 */

import fs from "node:fs";
import path from "node:path";
import {
  buildInventorySourceRef,
  findInventoryEntries,
} from "./inventory.mjs";
import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { MINIBIA_DATA_ROOT } from "../minibia-data.mjs";

const EQUIPMENT_REPLACE_SLOTS = Object.freeze({
  ring: Object.freeze({
    fallbackSlotIndex: 8,
    slotPattern: /\bring\b/i,
    sourcePattern: /\b(?:ring|bangle)\b/i,
  }),
  amulet: Object.freeze({
    fallbackSlotIndex: 7,
    slotPattern: /\b(?:amulet|necklace|shoulder|collar|pendant)\b/i,
    sourcePattern: /\b(?:amulet|necklace|scarf|collar|pendant|chain|symbol|talisman|tiara)\b/i,
  }),
});

const EQUIPMENT_REPLACE_CATALOG = Object.freeze({
  ring: Object.freeze([
    "axe ring",
    "club ring",
    "crystal ring",
    "dwarven ring",
    "emerald bangle",
    "energy ring",
    "gold ring",
    "life ring",
    "might ring",
    "power ring",
    "ring of healing",
    "ring of the sky",
    "ring of wishes",
    "stealth ring",
    "sword ring",
    "time ring",
    "wedding ring",
  ]),
  amulet: Object.freeze([
    "amulet of loss",
    "ancient amulet",
    "ancient tiara",
    "broken amulet",
    "bronze amulet",
    "bronzen necklace",
    "crystal necklace",
    "demonbone amulet",
    "dragon necklace",
    "elven amulet",
    "garlic necklace",
    "golden amulet",
    "platinum amulet",
    "protection amulet",
    "ruby necklace",
    "scarab amulet",
    "scarf",
    "silver amulet",
    "silver necklace",
    "star amulet",
    "starlight amulet",
    "stone skin amulet",
    "strange symbol",
    "strange talisman",
    "wolf tooth chain",
  ]),
});

const EQUIPMENT_REPLACE_SLOT_TYPES = Object.freeze({
  ring: new Set(["ring"]),
  amulet: new Set(["amulet", "necklace", "scarf", "collar", "pendant"]),
});

const EQUIPMENT_REPLACE_GENERIC_REQUEST_KEYS = Object.freeze({
  ring: new Set(["any", "any ring", "any rings", "bangle", "ring", "rings"]),
  amulet: new Set([
    "amulet",
    "amulets",
    "any",
    "any amulet",
    "any amulets",
    "any necklace",
    "chain",
    "chains",
    "collar",
    "collars",
    "necklace",
    "necklaces",
    "pendant",
    "pendants",
    "scarf",
    "scarves",
    "symbol",
    "symbols",
    "talisman",
    "talismans",
    "tiara",
    "tiaras",
  ]),
});

const EQUIPMENT_REPLACE_CATALOG_KEYS = Object.freeze(
  Object.fromEntries(
    Object.entries(EQUIPMENT_REPLACE_CATALOG).map(([slotKind, names]) => [
      slotKind,
      new Set(names.map((name) => name.toLowerCase())),
    ]),
  ),
);

const EQUIPMENT_REPLACE_ITEM_METADATA_BY_ID = (() => {
  try {
    const documentPath = path.join(MINIBIA_DATA_ROOT, "current", "items.json");
    const document = JSON.parse(fs.readFileSync(documentPath, "utf8"));
    const metadataById = new Map();

    for (const item of Array.isArray(document?.items) ? document.items : []) {
      const name = normalizeText(item?.name);
      const slotType = normalizeLookup(item?.slotType);
      if (!name && !slotType) {
        continue;
      }

      for (const candidateId of [item?.id, item?.sid, item?.cid]) {
        const itemId = Number(candidateId);
        if (!Number.isFinite(itemId)) {
          continue;
        }

        metadataById.set(Math.trunc(itemId), {
          name,
          nameKey: name.toLowerCase(),
          slotType,
        });
      }
    }

    return metadataById;
  } catch {
    return new Map();
  }
})();

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

function getItemNumericId(item = {}) {
  const itemId = Number(item?.id ?? item?.itemId ?? item?.clientId ?? item?.serverId);
  return Number.isFinite(itemId) ? Math.trunc(itemId) : null;
}

function isOpaqueRuntimeItemLabel(value = "") {
  const text = normalizeText(value);
  return Boolean(text) && /^\d+$/.test(text);
}

function resolveEquipmentReplaceItemInfo(item = {}) {
  const itemId = getItemNumericId(item);
  const metadata = itemId != null
    ? (EQUIPMENT_REPLACE_ITEM_METADATA_BY_ID.get(itemId) || null)
    : null;

  const name = normalizeText(item?.name);
  const slotType = normalizeLookup(item?.slotType);
  const useMetadataFallback = !name || isOpaqueRuntimeItemLabel(name);
  return {
    itemId,
    rawName: name,
    rawNameKey: name.toLowerCase(),
    rawSlotType: slotType,
    resolvedName: useMetadataFallback ? normalizeText(metadata?.name) : "",
    resolvedNameKey: useMetadataFallback ? normalizeLookup(metadata?.name) : "",
    resolvedSlotType: useMetadataFallback ? normalizeLookup(metadata?.slotType) : "",
  };
}

function collectResolvedItemNameKeys(item = {}) {
  const info = resolveEquipmentReplaceItemInfo(item);
  return [...new Set([
    info.rawNameKey,
    info.resolvedNameKey,
  ].filter(Boolean))];
}

function collectResolvedItemNames(item = {}) {
  const info = resolveEquipmentReplaceItemInfo(item);
  return [...new Set([
    info.rawName,
    info.resolvedName,
  ].map((value) => normalizeText(value)).filter(Boolean))];
}

function collectResolvedItemSlotTypes(item = {}) {
  const info = resolveEquipmentReplaceItemInfo(item);
  return [...new Set([
    info.rawSlotType,
    info.resolvedSlotType,
  ].filter(Boolean))];
}

function isGenericEquipmentReplaceRequest(slotKind = "ring", requestedName = "") {
  const genericKeys = EQUIPMENT_REPLACE_GENERIC_REQUEST_KEYS[slotKind];
  if (!genericKeys) {
    return false;
  }

  return genericKeys.has(normalizeLookup(requestedName));
}

function matchesEquipmentReplacementEntry(entry = {}, slotKind = "ring") {
  const config = EQUIPMENT_REPLACE_SLOTS[slotKind];
  if (!config) {
    return false;
  }

  const acceptedSlotTypes = EQUIPMENT_REPLACE_SLOT_TYPES[slotKind];
  const acceptedNames = EQUIPMENT_REPLACE_CATALOG_KEYS[slotKind];

  return collectResolvedItemSlotTypes(entry?.item).some((slotType) => acceptedSlotTypes?.has(slotType))
    || collectResolvedItemNameKeys(entry?.item).some((nameKey) => acceptedNames?.has(nameKey))
    || collectResolvedItemNames(entry?.item).some((name) => config.sourcePattern.test(name));
}

function getEquipmentSlots(snapshot = {}) {
  return Array.isArray(snapshot?.inventory?.equipment?.slots)
    ? snapshot.inventory.equipment.slots
    : [];
}

export function findEquipmentReplaceSlot(snapshotLike = {}, slotKind = "ring") {
  const snapshot = toSnapshot(snapshotLike);
  const config = EQUIPMENT_REPLACE_SLOTS[slotKind];
  if (!config) {
    return null;
  }

  const slots = getEquipmentSlots(snapshot);
  const labelledSlot = slots.find((slot) => {
    const text = normalizeText([
      slot?.label,
      slot?.item?.slotType,
      slot?.item?.name,
    ].filter(Boolean).join(" "));
    return text && config.slotPattern.test(text);
  });
  if (labelledSlot) {
    return labelledSlot;
  }

  return slots.find((slot) => Number(slot?.index) === config.fallbackSlotIndex) || null;
}

export function hasEmptyEquipmentReplaceSlot(snapshotLike = {}, slotKind = "ring") {
  const slot = findEquipmentReplaceSlot(snapshotLike, slotKind);
  return Boolean(slot && !slot.item);
}

function findEquipmentReplacementSource(snapshot = {}, slotKind = "ring", itemName = "") {
  const config = EQUIPMENT_REPLACE_SLOTS[slotKind];
  if (!config) {
    return null;
  }

  const containerEntries = findInventoryEntries(snapshot, {}, {
    ownerTypes: ["container"],
  });
  const requestedName = normalizeLookup(itemName);
  if (requestedName) {
    if (isGenericEquipmentReplaceRequest(slotKind, requestedName)) {
      return containerEntries.find((entry) => matchesEquipmentReplacementEntry(entry, slotKind)) || null;
    }

    return containerEntries.find((entry) => collectResolvedItemNameKeys(entry?.item).includes(requestedName))
      || containerEntries.find((entry) => collectResolvedItemNameKeys(entry?.item).some((nameKey) => nameKey.includes(requestedName)))
      || null;
  }

  return containerEntries.find((entry) => matchesEquipmentReplacementEntry(entry, slotKind)) || null;
}

export function buildEquipmentAutoReplaceAction(snapshotLike = {}, {
  slotKind = "ring",
  itemName = "",
  moduleKey = "ringAutoReplace",
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const slot = findEquipmentReplaceSlot(snapshot, slotKind);
  if (!slot || slot.item) {
    return null;
  }

  const sourceEntry = findEquipmentReplacementSource(snapshot, slotKind, itemName);
  const source = buildInventorySourceRef(sourceEntry);
  if (!source) {
    return null;
  }

  return {
    type: "moveInventoryItem",
    moduleKey,
    count: 1,
    from: source,
    to: {
      location: "equipment",
      slotIndex: Number(slot.index),
    },
    label: normalizeText(itemName) || slotKind,
  };
}
