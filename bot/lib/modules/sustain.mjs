/*
 * Vocation-aware emergency sustain planner used before the legacy healer path.
 * It summarizes sustain state and emits the first safe heal, potion, mana, or
 * food action for the runtime scheduler to arbitrate through shared helpers.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { getAmmoStatus } from "./ammo.mjs";
import { buildConsumableAction } from "./consumables.mjs";
import { buildHotbarSlotAction } from "./hotbar.mjs";

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function firstHealSpellWords(profile = {}) {
  return (Array.isArray(profile?.sustain?.healSpells) ? profile.sustain.healSpells : [])
    .map((spell) => String(spell?.words || "").trim())
    .find(Boolean) || "";
}

function hpPercent(snapshot = {}) {
  return normalizeInteger(snapshot?.player?.stats?.healthPercent);
}

function manaPercent(snapshot = {}) {
  return normalizeInteger(snapshot?.player?.stats?.manaPercent);
}

function getPreferredHealingRuneNames(vocationProfile = {}) {
  return Array.isArray(vocationProfile?.sustain?.runePolicy?.preferredHealingRuneNames)
    ? vocationProfile.sustain.runePolicy.preferredHealingRuneNames
    : [];
}

function buildEmergencyHealingRuneAction(snapshot = {}, vocationProfile = {}, {
  preferHotbar = true,
  moduleKey = null,
  ruleIndex = null,
} = {}) {
  for (const runeName of getPreferredHealingRuneNames(vocationProfile)) {
    const action = buildConsumableAction(snapshot, {
      category: "rune",
      name: runeName,
    }, {
      target: "self",
      preferHotbar,
      moduleKey,
      ruleIndex,
    });
    if (action) {
      return action;
    }
  }

  return null;
}

export function summarizeSustainStatus(snapshotLike = {}, vocationProfile = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const sustain = vocationProfile?.sustain || {};
  const thresholds = sustain?.supplyThresholds || {};
  const supplies = snapshot?.inventory?.supplies || {};
  const ammoStatus = getAmmoStatus(snapshot, sustain?.ammoPolicy);

  return {
    healthPercent: hpPercent(snapshot),
    manaPercent: manaPercent(snapshot),
    needsEmergencyHeal: hpPercent(snapshot) > 0 && hpPercent(snapshot) <= normalizeInteger(sustain?.potionPolicy?.emergencyHealthPercent),
    needsHealthPotion: hpPercent(snapshot) > 0 && hpPercent(snapshot) <= normalizeInteger(sustain?.potionPolicy?.healthThresholdPercent),
    needsManaPotion: manaPercent(snapshot) > 0 && manaPercent(snapshot) <= normalizeInteger(sustain?.potionPolicy?.manaThresholdPercent),
    lowSupplies: {
      potions: normalizeInteger(supplies?.potions) <= normalizeInteger(thresholds?.potions),
      runes: normalizeInteger(supplies?.runes) <= normalizeInteger(thresholds?.runes),
      food: normalizeInteger(supplies?.food) <= normalizeInteger(thresholds?.food),
      ammo: ammoStatus.enabled && ammoStatus.depleted,
    },
    ammo: ammoStatus,
  };
}

export function buildSustainAction(snapshotLike = {}, vocationProfile = {}, {
  moduleKey = "sustain",
  ruleIndex = null,
  preferHotbar = true,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const sustain = vocationProfile?.sustain || {};
  const status = summarizeSustainStatus(snapshot, vocationProfile);
  const healWords = firstHealSpellWords(vocationProfile);

  if (status.needsEmergencyHeal && healWords) {
    const hotbarAction = buildHotbarSlotAction(snapshot, {
      kind: "spell",
      words: healWords,
    }, {
      moduleKey,
      ruleIndex,
    });
    if (hotbarAction) {
      return {
        ...hotbarAction,
        sustainKind: "emergency-spell",
      };
    }
  }

  if (status.needsEmergencyHeal) {
    const runeAction = buildEmergencyHealingRuneAction(snapshot, vocationProfile, {
      preferHotbar,
      moduleKey,
      ruleIndex,
    });
    if (runeAction) {
      return {
        ...runeAction,
        sustainKind: "healing-rune",
      };
    }
  }

  if (status.needsHealthPotion) {
    const healthPotion = buildConsumableAction(snapshot, {
      category: "potion",
      name: sustain?.potionPolicy?.preferredHealthPotionNames?.[0] || "health potion",
    }, {
      target: "self",
      preferHotbar,
      moduleKey,
      ruleIndex,
    });
    if (healthPotion) {
      return {
        ...healthPotion,
        sustainKind: "health-potion",
      };
    }
  }

  if (status.needsManaPotion) {
    const manaPotion = buildConsumableAction(snapshot, {
      category: "potion",
      name: sustain?.potionPolicy?.preferredManaPotionNames?.[0] || "mana potion",
    }, {
      target: "self",
      preferHotbar,
      moduleKey,
      ruleIndex,
    });
    if (manaPotion) {
      return {
        ...manaPotion,
        sustainKind: "mana-potion",
      };
    }
  }

  if (normalizeInteger(snapshot?.inventory?.supplies?.food) <= normalizeInteger(sustain?.supplyThresholds?.food)) {
    const foodAction = buildConsumableAction(snapshot, {
      category: "food",
    }, {
      target: "",
      preferHotbar,
      moduleKey,
      ruleIndex,
    });
    return foodAction
      ? {
          ...foodAction,
          sustainKind: "food",
        }
      : null;
  }

  return null;
}
