/*
 * Corpse-source detection and loot-routing planner for route runtime.
 * It scores openable corpses, classifies kept versus skipped items, and builds
 * container-move plans while leaving raw inventory mechanics to shared helpers
 * such as inventory and container routing.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { resolveMinibiaItemInfo, resolveMinibiaItemName } from "../minibia-item-metadata.mjs";
import { findInventoryEntries } from "./inventory.mjs";
import { planContainerMove } from "./container-routing.mjs";

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

function normalizeTextList(value = []) {
  return (Array.isArray(value) ? value : [value])
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean);
}

function normalizeLootMatcher(value = "") {
  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return "";
  }

  if (text === "potions") return "potion";
  if (text === "runes") return "rune";
  if (text === "foods") return "food";
  if (text === "ammos") return "ammo";
  return text;
}

function getResolvedItemName(entry = {}) {
  return resolveMinibiaItemName(entry?.item || {});
}

function inferItemCategories(entry = {}) {
  const info = resolveMinibiaItemInfo(entry?.item || {});
  const text = [
    info.name,
    info.slotType,
    entry?.slotLabel,
    ...(Array.isArray(entry?.item?.tags) ? entry.item.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    /\bpotion\b/.test(text) ? "potion" : "",
    /\brune\b/.test(text) ? "rune" : "",
    /\b(?:food|ham|meat|fish|salmon|mushroom|bread|cheese|banana|apple|cookie)\b/.test(text) ? "food" : "",
    /\b(?:ammo|ammunition|quiver|arrow|bolt|dart|spear|throwing)\b/.test(text) ? "ammo" : "",
    /\brope\b/.test(text) ? "rope" : "",
    /\bshovel\b/.test(text) ? "shovel" : "",
  ].filter(Boolean);
}

function getItemCategories(entry = {}) {
  const categories = new Set(
    Object.entries(entry?.item?.flags || {})
      .filter(([, matched]) => matched === true)
      .map(([category]) => normalizeLootMatcher(category))
      .filter(Boolean),
  );

  for (const category of inferItemCategories(entry)) {
    categories.add(category);
  }

  return [...categories];
}

function matcherMatchesEntry(entry = {}, matcher = "") {
  const normalizedMatcher = normalizeLootMatcher(matcher);
  if (!normalizedMatcher) {
    return false;
  }

  const itemName = normalizeText(getResolvedItemName(entry)).toLowerCase();
  const categories = getItemCategories(entry);
  if (itemName.includes(normalizedMatcher)) {
    return true;
  }

  return categories.includes(normalizedMatcher);
}

function shouldLootEntry(entry = {}, whitelist = [], blacklist = []) {
  if (!normalizeText(getResolvedItemName(entry))) {
    return false;
  }
  if (blacklist.some((matcher) => matcherMatchesEntry(entry, matcher))) {
    return false;
  }
  if (!whitelist.length) {
    return true;
  }
  return whitelist.some((matcher) => matcherMatchesEntry(entry, matcher));
}

function isLikelyCorpseName(name = "") {
  const text = normalizeText(name).toLowerCase();
  if (!text) {
    return false;
  }

  return /\b(dead|corpse|remains|slain|body|carcass|cadaver)\b/.test(text);
}

function isLikelyStorageContainer(name = "", preferredContainers = []) {
  const text = normalizeText(name).toLowerCase();
  if (!text) {
    return false;
  }

  if (normalizeTextList(preferredContainers).some((entry) => text.includes(entry))) {
    return true;
  }

  return /\b(backpack|bag|satchel|pouch|quiver|locker|depot|chest|container)\b/.test(text);
}

function getCorpseBaseName(name = "") {
  return normalizeText(name)
    .toLowerCase()
    .replace(/\b(dead|corpse|remains|slain|body|carcass|cadaver)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCorpseEntry(entry = {}) {
  const name = normalizeText(entry?.name);
  const position = entry?.position
    && Number.isFinite(Number(entry.position.x))
    && Number.isFinite(Number(entry.position.y))
    && Number.isFinite(Number(entry.position.z))
      ? {
          x: Math.trunc(Number(entry.position.x)),
          y: Math.trunc(Number(entry.position.y)),
          z: Math.trunc(Number(entry.position.z)),
        }
      : null;

  if (!name || !position) {
    return null;
  }

  return {
    itemId: normalizeInteger(entry?.itemId ?? entry?.id),
    name,
    baseName: getCorpseBaseName(name),
    position,
    distance: normalizeInteger(entry?.distance),
    chebyshevDistance: normalizeInteger(entry?.chebyshevDistance),
  };
}

function scoreCorpseEntry(entry = {}, targetMonsterNames = []) {
  const normalizedTargets = normalizeTextList(targetMonsterNames);
  const matchesHuntTarget = normalizedTargets.some((targetName) => (
    entry.baseName === targetName
    || entry.baseName.includes(targetName)
    || targetName.includes(entry.baseName)
  ));

  return (matchesHuntTarget ? 1000 : 0)
    - Math.max(0, entry.chebyshevDistance ?? entry.distance ?? 0);
}

export function findLootSourceContainers(snapshotLike = {}, {
  preferredContainers = [],
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const containers = Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [];

  return containers.filter((container) => {
    const containerName = normalizeText(container?.name);
    if (!containerName || isLikelyStorageContainer(containerName, preferredContainers)) {
      return false;
    }

    return isLikelyCorpseName(containerName);
  });
}

export function findLootableCorpses(snapshotLike = {}, {
  targetMonsterNames = [],
} = {}) {
  const source = Array.isArray(snapshotLike?.lootableCorpses)
    ? snapshotLike.lootableCorpses
    : Array.isArray(snapshotLike?.loot?.corpses)
      ? snapshotLike.loot.corpses
      : [];

  return source
    .map((entry) => normalizeCorpseEntry(entry))
    .filter(Boolean)
    .sort((left, right) => (
      scoreCorpseEntry(right, targetMonsterNames) - scoreCorpseEntry(left, targetMonsterNames)
      || (left.chebyshevDistance ?? left.distance ?? 999999) - (right.chebyshevDistance ?? right.distance ?? 999999)
      || String(left.name || "").localeCompare(String(right.name || ""))
      || Number(left.itemId || 0) - Number(right.itemId || 0)
    ));
}

export function buildCorpseOpenAction(snapshotLike = {}, {
  targetMonsterNames = [],
  moduleKey = "looting",
  ruleIndex = null,
} = {}) {
  const corpse = findLootableCorpses(snapshotLike, {
    targetMonsterNames,
  })[0] || null;
  if (!corpse?.position) {
    return null;
  }

  return {
    type: "openContainer",
    position: corpse.position,
    itemId: corpse.itemId,
    name: corpse.name,
    moduleKey,
    ruleIndex,
  };
}

export function buildLootPlan(snapshotLike = {}, {
  sourceContainerRuntimeId,
  whitelist = [],
  blacklist = [],
  preferredContainers = [],
  moduleKey = "looting",
  ruleIndex = null,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const sourceEntries = findInventoryEntries(snapshot, {
    ownerType: "container",
    containerRuntimeId: sourceContainerRuntimeId,
  });
  const normalizedWhitelist = normalizeTextList(whitelist).map((entry) => normalizeLootMatcher(entry));
  const normalizedBlacklist = normalizeTextList(blacklist).map((entry) => normalizeLootMatcher(entry));

  return sourceEntries
    .filter((entry) => shouldLootEntry(entry, normalizedWhitelist, normalizedBlacklist))
    .map((entry) => {
      const plan = planContainerMove(snapshot, entry, {
        preferredContainers,
        allowMerge: true,
        moduleKey,
        ruleIndex,
      });
      if (!plan) {
        return null;
      }

      const resolvedName = normalizeText(getResolvedItemName(entry));
      if (resolvedName) {
        plan.name = resolvedName;
      }
      return plan;
    })
    .filter(Boolean);
}
