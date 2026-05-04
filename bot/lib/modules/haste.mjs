/*
 * Keeps the character hasted from live condition state. When mana is too low
 * for the configured haste spell, the planner can emit a self mana-fluid action
 * before trying the spell again on a later tick.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { buildConsumableAction } from "./consumables.mjs";
import { isVocationSpellAvailable } from "../vocation-pack.mjs";

export const HASTE_SPELLS = Object.freeze([
  Object.freeze({
    key: "haste",
    name: "Haste",
    words: "utani hur",
    mana: 60,
  }),
  Object.freeze({
    key: "strong-haste",
    name: "Strong Haste",
    words: "utani gran hur",
    mana: 100,
  }),
]);

export const DEFAULT_HASTE_WORDS = HASTE_SPELLS[0].words;
export const DEFAULT_HASTE_MANA_FLUID_NAME = "Mana Fluid";
export const DEFAULT_HASTE_MANA_FLUID_NAMES = Object.freeze([
  "Mana Fluid",
  "manafluid",
  "Mana Potion",
  "Strong Mana Potion",
  "Great Mana Potion",
]);

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function normalizePercent(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return Math.max(0, Math.min(100, Number(fallback) || 0));
  }
  return Math.max(0, Math.min(100, number));
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getHasteSpellByWords(words = "") {
  const key = normalizeLowerText(words);
  return HASTE_SPELLS.find((spell) => normalizeLowerText(spell.words) === key) || null;
}

function getRequestedHasteSpell(words = "") {
  return getHasteSpellByWords(words) || HASTE_SPELLS[0];
}

function resolveHasteSpell(words = "", vocationProfile = null) {
  const requested = getRequestedHasteSpell(words);
  if (!vocationProfile) {
    return requested;
  }

  if (isVocationSpellAvailable(vocationProfile, requested.words)) {
    return requested;
  }

  return HASTE_SPELLS.find((spell) => isVocationSpellAvailable(vocationProfile, spell.words)) || null;
}

function getVisibleTargetCount(snapshot = {}) {
  const visibleMonsters = Array.isArray(snapshot?.combat?.visibleMonsters)
    ? snapshot.combat.visibleMonsters
    : [];
  return (snapshot?.combat?.target ? 1 : 0) + visibleMonsters.length;
}

function getManaFluidNameCandidates(configuredName = "") {
  const names = [];
  const append = (name = "") => {
    const normalized = normalizeText(name);
    if (!normalized) return;
    if (!names.some((entry) => normalizeLowerText(entry) === normalizeLowerText(normalized))) {
      names.push(normalized);
    }
  };

  append(configuredName);
  if (/\s/.test(configuredName)) {
    append(configuredName.replace(/\s+/g, ""));
  }
  DEFAULT_HASTE_MANA_FLUID_NAMES.forEach(append);
  return names;
}

function buildManaFluidAction(snapshot = {}, options = {}, {
  preferHotbar = true,
} = {}) {
  const hotkey = normalizeText(options.hasteManaFluidHotkey);
  const name = normalizeText(options.hasteManaFluidName) || DEFAULT_HASTE_MANA_FLUID_NAME;
  if (hotkey) {
    return {
      type: "useHotkey",
      moduleKey: "hasteManaFluid",
      hotkey,
      target: "self",
      name,
      category: "potion",
      hasteKind: "mana-fluid",
      label: name,
    };
  }

  for (const candidateName of getManaFluidNameCandidates(name)) {
    const action = buildConsumableAction(snapshot, {
      category: "potion",
      name: candidateName,
    }, {
      target: "self",
      preferHotbar,
      moduleKey: "hasteManaFluid",
    });
    if (action) {
      return {
        ...action,
        hasteKind: "mana-fluid",
        label: candidateName,
      };
    }
  }

  return null;
}

export function buildHasteAction(snapshotLike = {}, options = {}, {
  vocationProfile = null,
  now = Date.now(),
  lastHasteAt = 0,
  lastManaFluidAt = 0,
  preferHotbar = true,
} = {}) {
  const snapshot = toSnapshot(snapshotLike);
  if (!snapshot?.ready || options?.hasteEnabled !== true) {
    return null;
  }

  if (options?.hasteRequireNoTargets === true && getVisibleTargetCount(snapshot) > 0) {
    return null;
  }

  if (
    options?.hasteRequireStationary === true
    && (snapshot?.movement?.moving || snapshot?.movement?.autoWalking)
  ) {
    return null;
  }

  const detection = snapshot?.player?.conditionDetection || {};
  const conditions = snapshot?.player?.conditions || {};
  if (detection.haste !== true) {
    return null;
  }
  if (conditions.haste === true) {
    return null;
  }

  const cooldownMs = Math.max(0, normalizeInteger(options?.hasteCooldownMs, 0));
  if (now - (Number(lastHasteAt) || 0) < cooldownMs) {
    return null;
  }

  const spell = resolveHasteSpell(options?.hasteWords, vocationProfile);
  const hotkey = normalizeText(options?.hasteHotkey);
  if (!spell && !hotkey) {
    return null;
  }

  const spellWords = normalizeText(spell?.words || options?.hasteWords || DEFAULT_HASTE_WORDS);
  const requiredMana = Math.max(
    0,
    normalizeInteger(options?.hasteMinMana, spell?.mana || HASTE_SPELLS[0].mana),
  );
  const requiredManaPercent = normalizePercent(options?.hasteMinManaPercent, 0);
  const mana = normalizeInteger(snapshot?.player?.stats?.mana, 0);
  const manaPercent = normalizePercent(snapshot?.player?.stats?.manaPercent, 0);
  const hasMana = mana >= requiredMana && manaPercent >= requiredManaPercent;

  if (hasMana) {
    return {
      type: "haste",
      moduleKey: "haste",
      words: spellWords,
      hotkey,
      label: spell?.name || spellWords,
      requiredMana,
      requiredManaPercent,
    };
  }

  if (normalizeBoolean(options?.hasteManaFluidEnabled, true) !== true) {
    return null;
  }

  const manaFluidCooldownMs = Math.max(0, normalizeInteger(options?.hasteManaFluidCooldownMs, 0));
  if (now - (Number(lastManaFluidAt) || 0) < manaFluidCooldownMs) {
    return null;
  }

  const manaFluidAction = buildManaFluidAction(snapshot, options, { preferHotbar });
  return manaFluidAction
    ? {
        ...manaFluidAction,
        hasteSpellWords: spellWords,
        requiredMana,
        requiredManaPercent,
      }
    : null;
}
