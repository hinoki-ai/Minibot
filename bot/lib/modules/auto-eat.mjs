/*
 * Routine food selection planner shared by the normal runtime and trainer-owned
 * food cadence. It searches hotbar, equipment, and open containers for food
 * and emits one normalized use action when hunger handling is due.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import {
  buildInventorySourceRef,
  findInventoryEntries,
} from "./inventory.mjs";
import {
  buildHotbarSlotAction,
  findHotbarSlot,
} from "./hotbar.mjs";

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeTextList(value = "") {
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

function collectCandidateTexts(candidate = {}) {
  if (candidate?.kind === "hotbar") {
    return [
      normalizeText(candidate?.slot?.item?.name),
      normalizeText(candidate?.slot?.label),
    ].filter(Boolean);
  }

  return [
    normalizeText(candidate?.entry?.item?.name),
    normalizeText(candidate?.entry?.slotLabel),
  ].filter(Boolean);
}

function candidateMatchesToken(candidate = {}, token = "") {
  const normalizedToken = normalizeText(token).toLowerCase();
  if (!normalizedToken) {
    return true;
  }

  return collectCandidateTexts(candidate).some((value) => value.toLowerCase().includes(normalizedToken));
}

function buildActionFromCandidate(snapshot, candidate = {}, {
  moduleKey = "autoEat",
  preferredName = "",
  ruleIndex = null,
} = {}) {
  if (candidate?.kind === "hotbar") {
    return buildHotbarSlotAction(snapshot, { slotIndex: candidate.slot.index }, {
      moduleKey,
      ruleIndex,
    });
  }

  const entry = candidate?.entry || null;
  const itemName = normalizeText(preferredName) || normalizeText(entry?.item?.name);
  return entry
    ? {
        type: "useItem",
        itemId: null,
        name: itemName,
        category: "food",
        source: buildInventorySourceRef(entry),
        moduleKey,
        ruleIndex,
      }
    : null;
}

function collectFoodCandidates(snapshotLike = {}, { preferHotbar = true } = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const hotbarCandidates = [];
  const inventoryCandidates = [];

  const hotbarSlots = Array.isArray(snapshot?.inventory?.hotbar?.slots)
    ? snapshot.inventory.hotbar.slots
    : [];
  hotbarSlots.forEach((slot) => {
    if (slot?.enabled === false || slot?.empty === true || slot?.item?.flags?.food !== true) {
      return;
    }
    hotbarCandidates.push({
      kind: "hotbar",
      slot,
    });
  });

  findInventoryEntries(snapshot, { category: "food" }, {
    ownerTypes: ["equipment", "container"],
  }).forEach((entry) => {
    inventoryCandidates.push({
      kind: "inventory",
      entry,
    });
  });

  return preferHotbar
    ? [...hotbarCandidates, ...inventoryCandidates]
    : [...inventoryCandidates, ...hotbarCandidates];
}

export function buildAutoEatAction(snapshotLike = {}, {
  foodName = "brown mushroom",
  forbiddenFoodNames = [],
  moduleKey = "autoEat",
  preferHotbar = true,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const names = normalizeTextList(foodName);
  const blockedNames = normalizeTextList(forbiddenFoodNames);
  const candidates = collectFoodCandidates(snapshot, { preferHotbar })
    .filter((candidate) => !blockedNames.some((token) => candidateMatchesToken(candidate, token)));

  if (!candidates.length) {
    return null;
  }

  if (names.length) {
    for (const name of names) {
      const matchedCandidate = candidates.find((candidate) => candidateMatchesToken(candidate, name));
      if (matchedCandidate) {
        return buildActionFromCandidate(snapshot, matchedCandidate, {
          moduleKey,
          preferredName: name,
        });
      }
    }
    return null;
  }

  return buildActionFromCandidate(snapshot, candidates[0], { moduleKey });
}
