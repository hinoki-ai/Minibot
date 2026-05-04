/*
 * Validation-first import/export for complete hunt route packs. Packs are
 * portable route-owned state; character ledgers, claims, leases, and secrets
 * stay outside this payload.
 */
import { createHash } from "node:crypto";
import {
  DEFAULTS,
  normalizeOptions,
  serializeRouteWaypoint,
  serializeTileRule,
} from "./bot-core.mjs";
import { validateRouteConfig } from "./route-validation.mjs";

export const ROUTE_PACK_SCHEMA_VERSION = 1;

const ROUTE_PACK_SECTION_KEYS = Object.freeze({
  targeting: [
    "monster",
    "monsterNames",
    "targetProfiles",
    "sharedSpawnMode",
    "chaseMode",
    "rangeX",
    "rangeY",
    "combatRangeX",
    "combatRangeY",
  ],
  sustain: [
    "sustainEnabled",
    "sustainCooldownMs",
    "healerEnabled",
    "healerRules",
    "potionHealerEnabled",
    "potionHealerRules",
    "conditionHealerEnabled",
    "conditionHealerRules",
    "deathHealEnabled",
    "deathHealVocation",
    "deathHealWords",
    "deathHealHotkey",
    "deathHealHealthPercent",
    "hasteEnabled",
    "hasteWords",
    "hasteHotkey",
    "hasteMinMana",
    "hasteMinManaPercent",
    "hasteCooldownMs",
    "hasteRequireNoTargets",
    "hasteRequireStationary",
    "hasteManaFluidEnabled",
    "hasteManaFluidName",
    "hasteManaFluidHotkey",
    "hasteManaFluidCooldownMs",
  ],
  loot: [
    "lootingEnabled",
    "lootWhitelist",
    "lootBlacklist",
    "lootPreferredContainers",
    "corpseReturnEnabled",
    "refillAutoSellEnabled",
    "refillAutoSellMinFreeSlots",
    "refillAutoSellProtectedNames",
  ],
  refill: [
    "refillEnabled",
    "refillPlan",
    "refillSellRequests",
    "refillNpcNames",
    "refillShopKeyword",
    "refillLoopEnabled",
    "refillLoopStartWaypoint",
    "refillLoopReturnWaypoint",
  ],
  banking: [
    "bankingEnabled",
    "bankingRules",
  ],
  alarms: [
    "alarmsEnabled",
    "alarmsPlayerEnabled",
    "alarmsPlayerRadiusSqm",
    "alarmsPlayerFloorRange",
    "alarmsStaffEnabled",
    "alarmsStaffRadiusSqm",
    "alarmsStaffFloorRange",
    "alarmsBlacklistEnabled",
    "alarmsBlacklistNames",
    "alarmsBlacklistRadiusSqm",
    "alarmsBlacklistFloorRange",
    "alarmsPauseRoute",
    "alarmsPauseTargeter",
    "alarmsRequireAcknowledgement",
  ],
  party: [
    "partyFollowEnabled",
    "partyFollowMembers",
    "partyFollowManualPlayers",
    "partyFollowMemberRoles",
    "partyFollowMemberChaseModes",
    "partyFollowDistance",
    "partyFollowCombatMode",
    "pkAssistEnabled",
    "pkAssistMode",
    "pkAssistAllies",
    "pkAssistRadiusSqm",
    "pkAssistRetreatHealthPercent",
    "pkAssistRetreatDistance",
    "pkAssistCooldownMs",
  ],
  options: [
    "autowalkLoop",
    "routeStrictClear",
    "routeFollowExactWaypoints",
    "routeRecordStep",
    "avoidElementalFields",
    "avoidFieldCategories",
    "distanceKeeperEnabled",
    "distanceKeeperRules",
    "spellCasterEnabled",
    "spellCasterRules",
    "aoeSolverEnabled",
    "aoeSolverRules",
  ],
});

const LOCAL_ONLY_KEYS = new Set([
  "creatureLedger",
  "monsterArchive",
  "playerArchive",
  "npcArchive",
  "cavebotPaused",
  "stopAggroHold",
  "trainerPartnerName",
  "account",
  "password",
  "secret",
  "claims",
  "routeSpacing",
  "routeSpacingLeases",
  "activePauses",
]);

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function pickOptions(options = {}, keys = []) {
  const picked = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(options, key) && !LOCAL_ONLY_KEYS.has(key)) {
      picked[key] = clone(options[key]);
    }
  }
  return picked;
}

function flattenPackOptions(pack = {}) {
  const source = pack && typeof pack === "object" ? pack : {};
  return normalizeOptions({
    ...(source.route || {}),
    ...(source.targeting || {}),
    ...(source.sustain || {}),
    ...(source.loot || {}),
    ...(source.refill || {}),
    ...(source.banking || {}),
    ...(source.alarms || {}),
    ...(source.party || {}),
    ...(source.options || {}),
  });
}

function buildPackSignature(pack = {}) {
  return createHash("sha1")
    .update(JSON.stringify({
      schemaVersion: pack.schemaVersion,
      route: pack.route,
      targeting: pack.targeting,
      sustain: pack.sustain,
      loot: pack.loot,
      refill: pack.refill,
      banking: pack.banking,
      alarms: pack.alarms,
      party: pack.party,
      options: pack.options,
      compatibility: pack.compatibility,
    }))
    .digest("hex")
    .slice(0, 16);
}

export function buildRoutePack(config = {}, {
  name = "",
  notes = "",
  createdAt = new Date().toISOString(),
} = {}) {
  const normalized = normalizeOptions(config);
  const routeName = normalizeText(name || normalized.cavebotName || DEFAULTS.cavebotName);
  const pack = {
    schemaVersion: ROUTE_PACK_SCHEMA_VERSION,
    name: routeName,
    createdAt,
    route: {
      cavebotName: routeName,
      waypoints: normalized.waypoints.map((waypoint, index) => serializeRouteWaypoint(waypoint, index)).filter(Boolean),
      tileRules: normalized.tileRules.map((rule, index) => serializeTileRule(rule, index)).filter(Boolean),
    },
    targeting: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.targeting),
    sustain: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.sustain),
    loot: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.loot),
    refill: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.refill),
    banking: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.banking),
    alarms: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.alarms),
    party: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.party),
    options: pickOptions(normalized, ROUTE_PACK_SECTION_KEYS.options),
    notes: normalizeText(notes),
    compatibility: {
      minibotRoutePack: ROUTE_PACK_SCHEMA_VERSION,
      routeValidationSchema: 1,
      generatedBy: "Minibot",
    },
  };
  return {
    ...pack,
    signature: buildPackSignature(pack),
  };
}

export function validateRoutePack(pack = {}) {
  const schemaVersion = Number(pack?.schemaVersion);
  const readOnly = schemaVersion !== ROUTE_PACK_SCHEMA_VERSION;
  const options = flattenPackOptions(pack);
  const validation = validateRouteConfig(options, {
    sourceName: pack?.name || options.cavebotName,
    rawConfig: {
      ...(pack?.route || {}),
      ...(pack?.targeting || {}),
      ...(pack?.options || {}),
    },
  });
  const warnings = [];
  if (readOnly) {
    warnings.push(`Route pack schema ${schemaVersion || "unknown"} is not writable by this build.`);
  }

  return {
    ok: validation.ok && !readOnly,
    readOnly,
    warnings,
    validation,
    options,
  };
}

export function diffRoutePack(currentConfig = {}, pack = {}) {
  const current = normalizeOptions(currentConfig);
  const incoming = flattenPackOptions(pack);
  const changes = [];
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(incoming)]))
    .filter((key) => !LOCAL_ONLY_KEYS.has(key))
    .sort();
  for (const key of keys) {
    const before = JSON.stringify(current[key] ?? null);
    const after = JSON.stringify(incoming[key] ?? null);
    if (before !== after) {
      changes.push({
        key,
        before: clone(current[key] ?? null),
        after: clone(incoming[key] ?? null),
      });
    }
  }
  return changes;
}

export function importRoutePack(pack = {}, {
  currentConfig = {},
  targetName = "",
} = {}) {
  const preview = validateRoutePack(pack);
  const diff = diffRoutePack(currentConfig, pack);
  const nextOptions = normalizeOptions({
    ...currentConfig,
    ...preview.options,
    cavebotName: normalizeText(targetName || preview.options.cavebotName || pack?.name || DEFAULTS.cavebotName),
  });

  return {
    ...preview,
    diff,
    options: nextOptions,
  };
}
