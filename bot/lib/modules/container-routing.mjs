/*
 * Container destination planner for looting and inventory cleanup.
 * It keeps loot and inventory moves deterministic by picking merge targets or
 * empty slots from the normalized snapshot and returns one normalized
 * inventory-move action without mutating snapshot state.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import {
  buildInventorySourceRef,
  findFirstEmptyContainerSlot,
  findStackTarget,
} from "./inventory.mjs";

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

function buildContainerMatchers(preferredContainers = []) {
  const names = Array.isArray(preferredContainers) ? preferredContainers : [preferredContainers];
  return names
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
    .map((name) => ({ name }));
}

export function findContainerDestination(snapshotLike = {}, entry = {}, {
  preferredContainers = [],
  allowMerge = true,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const matchers = buildContainerMatchers(preferredContainers);
  const attempts = matchers.length ? matchers : [{}];

  if (allowMerge) {
    for (const matcher of attempts) {
      const mergeTarget = findStackTarget(snapshot, entry, matcher);
      if (mergeTarget) {
        return mergeTarget;
      }
    }
  }

  for (const matcher of attempts) {
    const emptySlot = findFirstEmptyContainerSlot(snapshot, matcher);
    if (emptySlot) {
      return emptySlot;
    }
  }

  return null;
}

export function planContainerMove(snapshotLike = {}, entry = {}, {
  preferredContainers = [],
  allowMerge = true,
  count = null,
  moduleKey = "inventory",
  ruleIndex = null,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const from = buildInventorySourceRef(entry);
  if (!from) {
    return null;
  }

  const to = findContainerDestination(snapshot, entry, {
    preferredContainers,
    allowMerge,
  });
  if (!to) {
    return null;
  }

  return {
    type: "moveInventoryItem",
    from,
    to,
    count: normalizeInteger(count) ?? normalizeInteger(entry?.item?.count) ?? 1,
    itemId: entry?.item?.id ?? null,
    name: entry?.item?.name ?? "",
    moduleKey,
    ruleIndex,
  };
}
