/*
 * Item metadata fallback resolver for opaque runtime labels.
 * Use this when the live client exposes incomplete item names or slot types
 * and a module needs stable matching against vendored item data.
 */
import fs from "node:fs";
import path from "node:path";
import { MINIBIA_DATA_ROOT } from "./minibia-data.mjs";

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLookup(value = "") {
  return normalizeText(value).toLowerCase();
}

function uniqueList(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

export function getMinibiaItemNumericId(item = {}) {
  return normalizeInteger(
    item?.id
    ?? item?.itemId
    ?? item?.clientId
    ?? item?.serverId,
  );
}

export function isOpaqueMinibiaItemLabel(value = "") {
  const text = normalizeText(value);
  return Boolean(text) && /^\d+$/.test(text);
}

const ITEM_METADATA_BY_ID = (() => {
  try {
    const documentPath = path.join(MINIBIA_DATA_ROOT, "current", "items.json");
    const document = JSON.parse(fs.readFileSync(documentPath, "utf8"));
    const metadataById = new Map();

    for (const item of Array.isArray(document?.items) ? document.items : []) {
      const name = normalizeText(item?.name);
      const slotType = normalizeText(item?.slotType);
      if (!name && !slotType) {
        continue;
      }

      for (const candidateId of [item?.id, item?.sid, item?.cid]) {
        const itemId = normalizeInteger(candidateId);
        if (itemId == null) {
          continue;
        }

        metadataById.set(itemId, {
          name,
          nameKey: normalizeLookup(name),
          slotType,
          slotTypeKey: normalizeLookup(slotType),
        });
      }
    }

    return metadataById;
  } catch {
    return new Map();
  }
})();

export function getMinibiaItemMetadata(item = {}) {
  const itemId = getMinibiaItemNumericId(item);
  return itemId != null ? (ITEM_METADATA_BY_ID.get(itemId) || null) : null;
}

export function resolveMinibiaItemInfo(item = {}) {
  const metadata = getMinibiaItemMetadata(item);
  const rawName = normalizeText(item?.name);
  const rawSlotType = normalizeText(item?.slotType);
  const useNameFallback = !rawName || isOpaqueMinibiaItemLabel(rawName);
  const useSlotTypeFallback = !rawSlotType;
  const name = useNameFallback ? normalizeText(metadata?.name) || rawName : rawName;
  const slotType = useSlotTypeFallback ? normalizeText(metadata?.slotType) || rawSlotType : rawSlotType;

  return {
    itemId: getMinibiaItemNumericId(item),
    rawName,
    rawNameKey: normalizeLookup(rawName),
    rawSlotType,
    rawSlotTypeKey: normalizeLookup(rawSlotType),
    resolvedName: useNameFallback ? normalizeText(metadata?.name) : "",
    resolvedNameKey: useNameFallback ? normalizeLookup(metadata?.name) : "",
    resolvedSlotType: useSlotTypeFallback ? normalizeText(metadata?.slotType) : "",
    resolvedSlotTypeKey: useSlotTypeFallback ? normalizeLookup(metadata?.slotType) : "",
    name,
    nameKey: normalizeLookup(name),
    slotType,
    slotTypeKey: normalizeLookup(slotType),
  };
}

export function resolveMinibiaItemName(item = {}) {
  return resolveMinibiaItemInfo(item).name;
}

export function resolveMinibiaItemSlotType(item = {}) {
  return resolveMinibiaItemInfo(item).slotType;
}

export function classifyMinibiaTileDiagnostic(item = {}) {
  const info = resolveMinibiaItemInfo(item);
  const name = normalizeLookup([
    info.name,
    item?.tileName,
    item?.description,
    item?.category,
    item?.slotType,
    item?.weaponType,
    item?.type?.name,
    item?.itemType?.name,
    item?.properties?.name,
    item?.properties?.description,
  ].filter(Boolean).join(" "));
  const categories = [];
  const reasons = [];
  const add = (category, reason) => {
    categories.push(category);
    reasons.push(reason);
  };

  if (/\b(?:fire|energy|poison|venom|electric)\b.*\b(?:field|wall|bomb)\b|\b(?:field|wall|bomb)\b.*\b(?:fire|energy|poison|venom|electric)\b/.test(name)) {
    add("field", "elemental field or field rune name");
  }
  if (/\b(?:mushroom|ham|meat|fish|bread|cheese|cookie|egg|carrot|blueberry|food)\b/.test(name)) {
    add("food", "food-like item name");
  }
  if (/\b(?:chair|table|stool|bench|trough|locker|drawer|crate|box|barrel|chest|counter)\b/.test(name)) {
    add("walkable-furniture", "furniture/container object name");
  }
  if (/\b(?:hole|pitfall|trapdoor|manhole|sewer grate)\b/.test(name)) {
    add("hole", "hole or trapdoor name");
  }
  if (/\b(?:stairs?|stairway|ramp)\b/.test(name)) {
    add("stair", "stair or ramp name");
  }
  if (/\bladder\b/.test(name)) {
    add("ladder", "ladder name");
  }
  if (/\b(?:trap(?!door)|snare|spike|mine|pressure ?plate)\b/.test(name)) {
    add("trap", "trap-like object name");
  }
  if (/\b(?:wall|fence|door|gate|pillar|rock|boulder|tree|debris|rubble|statue|anvil|forge)\b/.test(name)) {
    add("obstacle", "blocking object name");
  }

  const floorChange = Boolean(
    item?.floorchange
    || item?.floorChange
    || item?.properties?.floorchange
    || item?.properties?.floorChange
    || item?.properties?.floorChangeDown
    || item?.properties?.floorChangeUp
  );
  if (floorChange && !categories.some((entry) => ["hole", "stair", "ladder"].includes(entry))) {
    add("floor-change", "runtime floor-change flag");
  }
  if (item?.walkable === false || item?.isWalkable === false || item?.properties?.walkable === false) {
    add("blocked", "runtime walkable flag is false");
  }

  return {
    itemId: info.itemId,
    name: info.name,
    categories: uniqueList(categories),
    reasons: uniqueList(reasons),
    blocked: categories.includes("obstacle") || categories.includes("trap") || categories.includes("blocked"),
    floorChange: floorChange || categories.some((entry) => ["hole", "stair", "ladder", "floor-change"].includes(entry)),
  };
}
