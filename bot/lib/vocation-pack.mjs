/*
 * Builds stable vocation profiles from vendored Minibia data.
 * Sustain, ammo, refill, and combat defaults should stay data-driven through
 * this file instead of growing new vocation branches elsewhere.
 */
import {
  MINIBIA_SUPPORTED_VOCATIONS,
  loadMinibiaVocationPack,
} from "./minibia-data.mjs";

export const MINIBIA_VOCATION_PROFILE_VERSION = 1;

const HEALING_TIER_KEYS = Object.freeze([
  "ultimate",
  "intense",
  "light",
]);

const HEALING_TIER_PATTERNS = Object.freeze({
  ultimate: Object.freeze([/\bultimate healing\b/i, /\bexura vita\b/i]),
  intense: Object.freeze([/\bintense healing\b/i, /\bexura gran\b/i]),
  light: Object.freeze([/\blight healing\b/i, /\bexura\b/i]),
});

const MANA_TRAINER_FALLBACK_WORD_KEYS = Object.freeze(new Set([
  "creature illusion",
  "light",
  "utevo res ina",
  "utevo lux",
]));

const VOCATION_SIGNATURE_SPELL_WORDS = Object.freeze({
  knight: Object.freeze([
    "exeta res",
    "exori",
  ]),
  paladin: Object.freeze([
    "exevo con",
    "exevo con pox",
    "exevo con mort",
    "exevo con flam",
    "exevo con vis",
    "exeta con",
  ]),
  sorcerer: Object.freeze([
    "adori vita vis",
    "exevo flam hur",
    "exevo vis lux",
    "exevo mort hur",
    "exevo gran vis lux",
    "exevo gran mas vis",
  ]),
  druid: Object.freeze([
    "exura sio",
    "exori frigo",
    "exevo frigo hur",
    "exevo gran mas pox",
    "exevo gran mas frigo",
    "exevo frigo gran vis",
  ]),
});

const DEFAULT_THRESHOLDS_BY_VOCATION = Object.freeze({
  knight: {
    healthPotionThresholdPercent: 60,
    emergencyHealthPercent: 32,
    manaPotionThresholdPercent: 25,
    supplyThresholds: { potions: 25, runes: 0, food: 6, ammo: 0 },
    ammoPolicy: { enabled: false, minimumCount: 0, warningCount: 0, preferredNames: [] },
    combatDefaults: { fightMode: "balanced", chaseMode: "follow" },
  },
  paladin: {
    healthPotionThresholdPercent: 55,
    emergencyHealthPercent: 28,
    manaPotionThresholdPercent: 35,
    supplyThresholds: { potions: 30, runes: 5, food: 6, ammo: 100 },
    ammoPolicy: {
      enabled: true,
      minimumCount: 50,
      warningCount: 100,
      preferredNames: ["Power Bolt", "Bolt", "Arrow", "Explosive Arrow", "Royal Spear"],
    },
    combatDefaults: { fightMode: "balanced", chaseMode: "stand" },
  },
  sorcerer: {
    healthPotionThresholdPercent: 42,
    emergencyHealthPercent: 24,
    manaPotionThresholdPercent: 55,
    supplyThresholds: { potions: 60, runes: 20, food: 6, ammo: 0 },
    ammoPolicy: { enabled: false, minimumCount: 0, warningCount: 0, preferredNames: [] },
    combatDefaults: { fightMode: "balanced", chaseMode: "stand" },
  },
  druid: {
    healthPotionThresholdPercent: 42,
    emergencyHealthPercent: 24,
    manaPotionThresholdPercent: 50,
    supplyThresholds: { potions: 55, runes: 20, food: 6, ammo: 0 },
    ammoPolicy: { enabled: false, minimumCount: 0, warningCount: 0, preferredNames: [] },
    combatDefaults: { fightMode: "balanced", chaseMode: "stand" },
  },
});

export const MINIBIA_HEALTH_POTION_NAMES = Object.freeze([
  "Supreme Health Potion",
  "Ultimate Health Potion",
  "Great Health Potion",
  "Strong Health Potion",
  "Health Potion",
]);

export const MINIBIA_MANA_POTION_NAMES = Object.freeze([
  "Strong Mana Potion",
  "Great Mana Potion",
  "Mana Potion",
]);

const DEFAULT_POLICY = Object.freeze({
  potionNames: Object.freeze({
    health: [...MINIBIA_HEALTH_POTION_NAMES],
    mana: [...MINIBIA_MANA_POTION_NAMES],
  }),
  runeNames: Object.freeze({
    paladin: ["Heavy Magic Missile Rune", "Fireball Rune"],
    sorcerer: ["Sudden Death Rune", "Heavy Magic Missile Rune", "Great Fireball Rune", "Fireball Rune"],
    druid: ["Sudden Death Rune", "Heavy Magic Missile Rune", "Great Fireball Rune", "Intense Healing Rune"],
  }),
});

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeSpellWordsKey(value = "") {
  return normalizeText(value).toLowerCase();
}

export function normalizeVocationName(value = "") {
  const normalized = normalizeText(value).toLowerCase();
  return MINIBIA_SUPPORTED_VOCATIONS.includes(normalized) ? normalized : "";
}

export function inferVocationFromText(value = "") {
  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return "";
  }

  if (text.includes("knight")) return "knight";
  if (text.includes("paladin")) return "paladin";
  if (text.includes("sorcerer")) return "sorcerer";
  if (text.includes("druid")) return "druid";
  return "";
}

export function inferVocationFromSpellWords(spellWords = []) {
  const words = (Array.isArray(spellWords) ? spellWords : [spellWords])
    .map((entry) => normalizeSpellWordsKey(entry))
    .filter(Boolean);
  if (!words.length) {
    return "";
  }

  let bestVocation = "";
  let bestScore = 0;
  for (const vocation of MINIBIA_SUPPORTED_VOCATIONS) {
    const signatureWords = VOCATION_SIGNATURE_SPELL_WORDS[vocation] || [];
    const signatureSet = new Set(signatureWords);
    const score = words.reduce((sum, entry) => sum + (signatureSet.has(entry) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestVocation = vocation;
    }
  }

  return bestScore > 0 ? bestVocation : "";
}

function normalizeSpellEntry(entry = {}) {
  return {
    id: entry?.id ?? null,
    name: normalizeText(entry?.name),
    words: normalizeText(entry?.words),
    level: Number.isFinite(Number(entry?.level)) ? Math.trunc(Number(entry.level)) : 0,
    mana: Number.isFinite(Number(entry?.mana)) ? Math.trunc(Number(entry.mana)) : 0,
    aggressive: entry?.aggressive === true,
    area: entry?.area === true,
  };
}

function findSpell(spells = [], patterns = []) {
  const matchers = (Array.isArray(patterns) ? patterns : [patterns])
    .map((pattern) => pattern instanceof RegExp ? pattern : new RegExp(String(pattern), "i"));

  return spells.find((spell) => {
    const haystack = [spell.name, spell.words].filter(Boolean).join(" ").toLowerCase();
    return matchers.some((matcher) => matcher.test(haystack));
  }) || null;
}

function buildHealSpells(spells = []) {
  return [
    findSpell(spells, /\bultimate healing\b|\bexura vita\b/i),
    findSpell(spells, /\bintense healing\b|\bexura gran\b/i),
    findSpell(spells, /\blight healing\b|\bexura\b/i),
  ].filter(Boolean);
}

function buildSupportSpells(spells = []) {
  return {
    light: findSpell(spells, [/\bgreat light\b/i, /\blight\b/i]),
    haste: findSpell(spells, [/\bstrong haste\b/i, /\bhaste\b/i]),
    magicShield: findSpell(spells, /\bmagic shield\b|\butamo vita\b/i),
    antidote: findSpell(spells, /\bantidote\b|\bexana pox\b/i),
    conjureFood: findSpell(spells, /\bfood\b|\bexevo pan\b/i),
    levitate: findSpell(spells, /\blevitate\b|\bexani hur\b/i),
    magicRope: findSpell(spells, /\bmagic rope\b|\bexani tera\b/i),
    healFriend: findSpell(spells, /\bheal friend\b|\bexura sio\b/i),
  };
}

function compactSpell(spell = null) {
  if (!spell) return null;
  return {
    id: spell.id,
    name: spell.name,
    words: spell.words,
    level: spell.level,
    mana: spell.mana,
  };
}

function classifyHealingTier(value = "") {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  for (const tier of HEALING_TIER_KEYS) {
    if (HEALING_TIER_PATTERNS[tier].some((pattern) => pattern.test(text))) {
      return tier;
    }
  }

  return "";
}

export function getVocationSpellByWords(vocationProfile = {}, words = "") {
  const targetKey = normalizeSpellWordsKey(words);
  if (!targetKey) {
    return null;
  }

  return (Array.isArray(vocationProfile?.spells) ? vocationProfile.spells : [])
    .find((spell) => normalizeSpellWordsKey(spell?.words) === targetKey) || null;
}

export function isVocationSpellAvailable(vocationProfile = {}, words = "") {
  return Boolean(getVocationSpellByWords(vocationProfile, words));
}

export function getVocationHealingSpells(vocationProfile = {}) {
  const spells = Array.isArray(vocationProfile?.sustain?.healSpells)
    ? vocationProfile.sustain.healSpells
    : [];
  const seen = new Set();

  return spells.filter((spell) => {
    const key = normalizeSpellWordsKey(spell?.words);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function resolveHealingSpell(vocationProfile = {}, preferredWords = "") {
  const healingSpells = getVocationHealingSpells(vocationProfile);
  if (!healingSpells.length) {
    return null;
  }

  const exactSpell = getVocationSpellByWords(vocationProfile, preferredWords);
  if (exactSpell) {
    const exactTier = classifyHealingTier(exactSpell.words) || classifyHealingTier(exactSpell.name);
    if (exactTier) {
      const matchedHealingSpell = healingSpells.find((spell) => (
        classifyHealingTier(spell?.words) === exactTier
        || classifyHealingTier(spell?.name) === exactTier
      ));
      if (matchedHealingSpell) {
        return matchedHealingSpell;
      }
    }
    return exactSpell;
  }

  const preferredTier = classifyHealingTier(preferredWords);
  if (preferredTier) {
    const tierIndex = HEALING_TIER_KEYS.indexOf(preferredTier);
    if (tierIndex >= 0) {
      return healingSpells[Math.min(tierIndex, healingSpells.length - 1)] || healingSpells[0];
    }
  }

  return healingSpells[0];
}

export function resolveSupportSpell(vocationProfile = {}, key = "", preferredWords = "") {
  const supportSpell = vocationProfile?.sustain?.supportSpells?.[key] || null;
  const exactSpell = getVocationSpellByWords(vocationProfile, preferredWords);
  if (exactSpell) {
    return exactSpell;
  }
  return supportSpell || null;
}

export function resolveManaTrainerSpell(vocationProfile = {}, preferredWords = "") {
  const exactSpell = getVocationSpellByWords(vocationProfile, preferredWords);
  if (exactSpell) {
    return exactSpell;
  }

  const preferredKey = normalizeSpellWordsKey(preferredWords);
  if (preferredKey && !MANA_TRAINER_FALLBACK_WORD_KEYS.has(preferredKey)) {
    return null;
  }

  for (const pattern of [/\butevo res ina\b/i, /\butevo lux\b/i]) {
    const matchedSpell = (Array.isArray(vocationProfile?.spells) ? vocationProfile.spells : [])
      .find((spell) => pattern.test(`${spell?.name || ""} ${spell?.words || ""}`));
    if (matchedSpell) {
      return matchedSpell;
    }
  }

  return resolveSupportSpell(vocationProfile, "light", preferredWords);
}

export function buildVocationProfile(vocationPack = {}, { overrides = {} } = {}) {
  const vocation = normalizeVocationName(vocationPack?.vocation);
  if (!vocation) {
    throw new Error(`Unknown Minibia vocation "${vocationPack?.vocation ?? ""}".`);
  }

  const thresholds = DEFAULT_THRESHOLDS_BY_VOCATION[vocation];
  const spells = (Array.isArray(vocationPack?.spells) ? vocationPack.spells : [])
    .map((entry) => normalizeSpellEntry(entry));
  const healSpells = buildHealSpells(spells).map((spell) => compactSpell(spell));
  const supportSpells = Object.fromEntries(
    Object.entries(buildSupportSpells(spells)).map(([key, spell]) => [key, compactSpell(spell)]),
  );

  return {
    schemaVersion: MINIBIA_VOCATION_PROFILE_VERSION,
    kind: "minibia-vocation-profile",
    generatedAt: normalizeText(vocationPack?.generatedAt) || null,
    vocation,
    source: vocationPack?.source || null,
    spellCount: spells.length,
    spells,
    sustain: {
      healSpells,
      supportSpells,
      potionPolicy: {
        healthThresholdPercent: thresholds.healthPotionThresholdPercent,
        emergencyHealthPercent: thresholds.emergencyHealthPercent,
        manaThresholdPercent: thresholds.manaPotionThresholdPercent,
        preferredHealthPotionNames: [...DEFAULT_POLICY.potionNames.health],
        preferredManaPotionNames: [...DEFAULT_POLICY.potionNames.mana],
      },
      runePolicy: {
        preferredRuneNames: [...(DEFAULT_POLICY.runeNames[vocation] || [])],
        preferredHealingRuneNames: ["Ultimate Healing Rune", "Intense Healing Rune"],
        selfHealSpell: compactSpell(findSpell(spells, /\bintense healing rune\b|\badura gran\b/i)),
      },
      ammoPolicy: { ...thresholds.ammoPolicy },
      supplyThresholds: { ...thresholds.supplyThresholds },
      defaults: { ...thresholds.combatDefaults },
    },
    looting: {
      priorities: vocation === "knight"
        ? ["gold", "potions", "food"]
        : vocation === "paladin"
          ? ["gold", "ammo", "potions", "runes", "food"]
          : ["gold", "potions", "runes", "food"],
    },
    economy: {
      bankingThresholds: vocation === "knight"
        ? { reserveGold: 2_000, depositExcessGold: 15_000, withdrawGoldForRefill: 5_000 }
        : vocation === "paladin"
          ? { reserveGold: 3_000, depositExcessGold: 20_000, withdrawGoldForRefill: 8_000 }
          : { reserveGold: 4_000, depositExcessGold: 25_000, withdrawGoldForRefill: 10_000 },
    },
    tasks: {
      preferredFamilies: vocation === "druid"
        ? ["magic", "hunting", "support"]
        : vocation === "sorcerer"
          ? ["magic", "hunting"]
          : ["hunting", "courier"],
    },
    pvpSafety: {
      safeMode: true,
      avoidSkulledPlayers: true,
      requirePzForLogout: true,
    },
    ...overrides,
  };
}

export async function loadVocationProfile(vocation, options = {}) {
  const pack = await loadMinibiaVocationPack(vocation, options);
  return buildVocationProfile(pack);
}
