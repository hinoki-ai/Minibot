import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  MAX_CREATURE_LEDGER_ENTRIES_PER_KIND,
  MinibiaTargetBot,
  discoverGamePages,
  findPage,
  inspectPageIdentity,
  normalizeOptions,
  normalizeWaypointType,
  parseLootMessageText,
} from "../lib/bot-core.mjs";

const KNOWN_MINIBIA_MONSTER_NAMES = JSON.parse(
  readFileSync(new URL("../data/minibia/current/monsters.json", import.meta.url), "utf8"),
).items
  .map((entry) => String(entry?.name || "").trim())
  .filter(Boolean);
const KNOWN_MINIBIA_MONSTER_AND_ALPHA_NAMES = KNOWN_MINIBIA_MONSTER_NAMES.flatMap((name) => [name, `Alpha ${name}`]);

const MAIN_BACKPACK_ID = 2854;
const VALUE_SLOT_INDEX = 1;
const QUIVER_SLOT_INDEX = 9;
const GREAT_FIREBALL_RUNE_ID = 2304;
const GREAT_FIREBALL_RUNE_NAME = "Great Fireball Rune";

class IdentityWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static evaluateValue = null;

  constructor() {
    this.readyState = IdentityWebSocket.CONNECTING;
    queueMicrotask(() => {
      if (this.readyState !== IdentityWebSocket.CONNECTING) {
        return;
      }

      this.readyState = IdentityWebSocket.OPEN;
      this.onopen?.();
    });
  }

  send(payload) {
    const message = JSON.parse(payload);

    if (message.method === "Runtime.enable") {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            result: {},
          }),
        });
      });
      return;
    }

    if (message.method === "Runtime.evaluate") {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            result: {
              result: {
                value: IdentityWebSocket.evaluateValue,
              },
            },
          }),
        });
      });
    }
  }

  close() {
    this.readyState = IdentityWebSocket.CLOSED;
    queueMicrotask(() => {
      this.onclose?.();
    });
  }
}

function createDomElement({
  textContent = "",
  display = "block",
  visibility = "visible",
  opacity = 1,
  hidden = false,
  disabled = false,
  parentElement = null,
  attributes = {},
  rect = null,
  click = null,
  dispatchEvent = null,
  focus = null,
  scrollIntoView = null,
} = {}) {
  const element = {
    textContent,
    hidden,
    disabled,
    parentElement,
    style: {
      display,
      visibility,
      opacity,
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    getBoundingClientRect() {
      const normalized = rect || {
        left: 20,
        top: 30,
        width: 120,
        height: 32,
      };
      const left = Number(normalized.left) || 0;
      const top = Number(normalized.top) || 0;
      const width = Number(normalized.width) || Math.max(0, (Number(normalized.right) || 0) - left);
      const height = Number(normalized.height) || Math.max(0, (Number(normalized.bottom) || 0) - top);
      return {
        left,
        top,
        width,
        height,
        right: Number(normalized.right) || left + width,
        bottom: Number(normalized.bottom) || top + height,
      };
    },
  };
  element.contains = (candidate) => candidate === element;
  if (typeof click === "function") {
    element.click = click;
  }
  if (typeof dispatchEvent === "function") {
    element.dispatchEvent = dispatchEvent;
  }
  if (typeof focus === "function") {
    element.focus = focus;
  }
  if (typeof scrollIntoView === "function") {
    element.scrollIntoView = scrollIntoView;
  }
  return element;
}

function evaluatePageExpression(expression, {
  gameClient,
  elements = {},
  globalThisOverrides = {},
} = {}) {
  const document = {
    getElementById(id) {
      return elements[id] || null;
    },
  };

  return Function("window", "globalThis", `return ${expression};`)({
    gameClient,
    document,
    innerWidth: 1280,
    innerHeight: 720,
    getComputedStyle(element) {
      return {
        display: element?.style?.display ?? "block",
        visibility: element?.style?.visibility ?? "visible",
        opacity: element?.style?.opacity ?? 1,
      };
    },
  }, {
    document,
    ConditionManager: class ConditionManager {},
    ...globalThisOverrides,
  });
}

function createModuleSnapshot(overrides = {}) {
  return {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    playerStats: {
      healthPercent: 100,
      mana: 200,
      manaPercent: 90,
    },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: false,
    ...overrides,
  };
}

function createVocationProfile(overrides = {}) {
  return {
    sustain: {
      healSpells: [],
      potionPolicy: {
        emergencyHealthPercent: 0,
        healthThresholdPercent: 0,
        manaThresholdPercent: 0,
        preferredHealthPotionNames: ["Health Potion"],
        preferredManaPotionNames: ["Strong Mana Potion"],
      },
      supplyThresholds: {
        food: 0,
      },
      ammoPolicy: {
        enabled: false,
      },
      ...(overrides.sustain || {}),
    },
    looting: {
      priorities: ["gold"],
      ...(overrides.looting || {}),
    },
    ...overrides,
  };
}

test("normalizeOptions defaults the route recorder to 3 SQM and shows waypoint overlays", () => {
  const options = normalizeOptions({});
  assert.equal(options.routeRecordStep, 3);
  assert.equal(options.showWaypointOverlay, true);
  assert.equal(options.routeFollowExactWaypoints, true);
  assert.equal(options.cavebotPaused, false);
  assert.equal(options.healerEmergencyHealthPercent, 30);
  assert.equal(options.healerRuneName, "");
  assert.equal(options.healerRuneHealthPercent, 0);
  assert.equal(options.healerRules[0]?.words, "Ultimate Healing Rune");
  assert.equal(options.rookillerEnabled, false);
  assert.equal(options.antiIdleEnabled, false);
  assert.equal(options.antiIdleIntervalMs, 60000);
  assert.equal(options.trainerAutoPartyEnabled, true);
  assert.equal(options.alarmsEnabled, true);
  assert.equal(options.alarmsPlayerEnabled, true);
  assert.equal(options.alarmsPlayerRadiusSqm, 8);
  assert.equal(options.alarmsPlayerFloorRange, 0);
  assert.equal(options.alarmsStaffEnabled, true);
  assert.equal(options.alarmsStaffRadiusSqm, 9);
  assert.equal(options.alarmsStaffFloorRange, 1);
  assert.equal(options.alarmsBlacklistEnabled, true);
  assert.deepEqual(options.alarmsBlacklistNames, []);
  assert.equal(options.alarmsBlacklistRadiusSqm, 9);
  assert.equal(options.alarmsBlacklistFloorRange, 1);
  assert.equal(options.trainerEnabled, false);
  assert.equal(options.trainerReconnectEnabled, true);
  assert.equal(options.trainerPartnerName, "");
  assert.equal(options.trainerPartnerDistance, 1);
  assert.equal(options.trainerManaTrainerEnabled, false);
  assert.equal(options.trainerManaTrainerWords, "utevo res ina");
  assert.equal(options.trainerManaTrainerManaPercent, 85);
  assert.equal(options.trainerManaTrainerMinHealthPercent, 95);
  assert.equal(options.trainerEscapeHealthPercent, 20);
  assert.equal(options.trainerEscapeDistance, 4);
  assert.equal(options.trainerEscapeCooldownMs, 600);
  assert.equal(options.autoEatEnabled, false);
  assert.deepEqual(options.autoEatFoodName, ["brown mushroom"]);
  assert.deepEqual(options.autoEatForbiddenFoodNames, []);
  assert.equal(options.autoEatCooldownMs, 55000);
  assert.equal(options.autoEatRequireNoTargets, false);
  assert.equal(options.autoEatRequireStationary, true);
  assert.equal(options.corpseReturnEnabled, true);
  assert.equal(options.ringAutoReplaceEnabled, false);
  assert.equal(options.ringAutoReplaceItemName, "stealth ring");
  assert.equal(options.ringAutoReplaceCooldownMs, 1000);
  assert.equal(options.ringAutoReplaceRequireNoTargets, false);
  assert.equal(options.ringAutoReplaceRequireStationary, false);
  assert.equal(options.amuletAutoReplaceEnabled, false);
  assert.equal(options.amuletAutoReplaceItemName, "amulet");
  assert.equal(options.amuletAutoReplaceCooldownMs, 1000);
  assert.equal(options.amuletAutoReplaceRequireNoTargets, false);
  assert.equal(options.amuletAutoReplaceRequireStationary, false);
  assert.equal(options.partyFollowEnabled, false);
  assert.deepEqual(options.partyFollowMembers, []);
  assert.deepEqual(options.partyFollowManualPlayers, []);
  assert.deepEqual(options.partyFollowMemberChaseModes, {});
  assert.equal(options.partyFollowDistance, 2);
  assert.equal(options.partyFollowCombatMode, "follow-and-fight");
  assert.equal(options.chaseMode, "auto");
  assert.equal(options.sharedSpawnMode, "respect-others");
  assert.equal(options.reconnectEnabled, false);
  assert.equal(options.reconnectRetryDelayMs, 4000);
  assert.equal(options.reconnectMaxAttempts, 0);
  assert.deepEqual(options.avoidFieldCategories, {
    fire: true,
    energy: true,
    poison: true,
    holes: true,
    stairsLadders: true,
    teleports: true,
    traps: true,
    invisibleWalls: true,
  });
});

test("multi-session runtime load backs off stable loops but keeps critical health fast", () => {
  const bot = new MinibiaTargetBot({
    intervalMs: 250,
    healerEmergencyHealthPercent: 30,
  });

  const stableSnapshot = {
    ready: true,
    playerStats: {
      healthPercent: 100,
    },
  };
  const criticalSnapshot = {
    ready: true,
    playerStats: {
      healthPercent: 25,
    },
  };

  assert.equal(bot.getLoopDelayMs(stableSnapshot), 250);

  bot.setRuntimeLoad({
    runningSessionCount: 3,
    sessionCount: 3,
    sessionIndex: 1,
    active: false,
  });

  assert.equal(bot.getLoopDelayMs(stableSnapshot), 650);
  assert.equal(bot.getLoopJitterMs(stableSnapshot), 20);
  assert.equal(bot.getLoopDelayMs(criticalSnapshot), 250);
  assert.equal(bot.getLoopJitterMs(criticalSnapshot), 0);
});

test("normalizeOptions clamps alarm ranges and splits blacklist names into exact entries", () => {
  const options = normalizeOptions({
    alarmsPlayerRadiusSqm: "6.8",
    alarmsPlayerFloorRange: -2,
    alarmsStaffRadiusSqm: "11",
    alarmsStaffFloorRange: "2.9",
    alarmsBlacklistNames: "God Minibia,\nKolakao",
    alarmsBlacklistRadiusSqm: "12.4",
    alarmsBlacklistFloorRange: "1",
  });

  assert.equal(options.alarmsPlayerRadiusSqm, 6);
  assert.equal(options.alarmsPlayerFloorRange, 0);
  assert.equal(options.alarmsStaffRadiusSqm, 11);
  assert.equal(options.alarmsStaffFloorRange, 2);
  assert.deepEqual(options.alarmsBlacklistNames, ["God Minibia", "Kolakao"]);
  assert.equal(options.alarmsBlacklistRadiusSqm, 12);
  assert.equal(options.alarmsBlacklistFloorRange, 1);
});

test("normalizeOptions preserves granular avoid-field category toggles", () => {
  const options = normalizeOptions({
    avoidFieldCategories: {
      fire: false,
      holes: false,
      teleports: true,
    },
  });

  assert.deepEqual(options.avoidFieldCategories, {
    fire: false,
    energy: true,
    poison: true,
    holes: false,
    stairsLadders: true,
    teleports: true,
    traps: true,
    invisibleWalls: true,
  });
});

test("normalizeOptions accepts follow-chain alias option names", () => {
  const options = normalizeOptions({
    followChainEnabled: true,
    followChainMembers: "Knight Alpha\nScout Beta",
    followChainManualPlayers: "Guide Gamma",
    followChainMemberChaseModes: {
      "Scout Beta": "aggressive chase",
    },
    followChainDistance: 3,
    followChainCombatMode: "follow-only",
  });

  assert.equal(options.partyFollowEnabled, true);
  assert.deepEqual(options.partyFollowMembers, ["Knight Alpha", "Scout Beta"]);
  assert.deepEqual(options.partyFollowManualPlayers, ["Guide Gamma"]);
  assert.deepEqual(options.partyFollowMemberChaseModes, {
    "Scout Beta": "aggressive",
  });
  assert.equal(options.partyFollowDistance, 3);
  assert.equal(options.partyFollowCombatMode, "follow-only");
  assert.equal(Object.hasOwn(options, "followChainEnabled"), false);
  assert.equal(Object.hasOwn(options, "followChainMembers"), false);
  assert.equal(Object.hasOwn(options, "followChainManualPlayers"), false);
  assert.equal(Object.hasOwn(options, "followChainMemberChaseModes"), false);
  assert.equal(Object.hasOwn(options, "followChainDistance"), false);
  assert.equal(Object.hasOwn(options, "followChainCombatMode"), false);
});

test("normalizeOptions accepts chase stance names and legacy aliases", () => {
  assert.equal(normalizeOptions({ chaseMode: "stand" }).chaseMode, "stand");
  assert.equal(normalizeOptions({ chaseMode: "aggressive chase" }).chaseMode, "aggressive");
  assert.equal(normalizeOptions({ chaseMode: "follow" }).chaseMode, "chase");

  const aliased = normalizeOptions({ chaseStance: "do not chase" });
  assert.equal(aliased.chaseMode, "stand");
  assert.equal(Object.hasOwn(aliased, "chaseStance"), false);
});

test("normalizeWaypointType keeps danger-zone aliases as hard no-go markers", () => {
  assert.equal(normalizeWaypointType("danger-zone"), "danger-zone");
  assert.equal(normalizeWaypointType("danger"), "danger-zone");
  assert.equal(normalizeWaypointType("no-go-zone"), "danger-zone");
  assert.equal(normalizeWaypointType("no go"), "danger-zone");
  assert.equal(normalizeWaypointType("danger zone"), "danger-zone");
  assert.equal(normalizeWaypointType("avoid sqm"), "avoid");
});

test("normalizeOptions keeps only target profiles that belong to the route monster list", () => {
  const options = normalizeOptions({
    monster: "Larva, Alpha Larva, Scarab",
    targetProfiles: [
      { name: "Larva", chaseMode: "aggressive" },
      { name: "Guide Gamma", chaseMode: "stand" },
      { name: "Scarab", chaseMode: "aggressive" },
      { name: "Captain Bluebear", chaseMode: "stand" },
    ],
  });

  assert.deepEqual(
    options.targetProfiles.map((profile) => profile.name),
    ["Larva", "Scarab"],
  );
  assert.equal(options.targetProfiles[0]?.chaseMode, "aggressive");
  assert.equal(options.targetProfiles[1]?.chaseMode, "aggressive");
});

test("normalizeOptions gives bare target profiles neutral spacing defaults", () => {
  const options = normalizeOptions({
    monster: "Larva",
    targetProfiles: [
      { name: "Larva" },
    ],
  });

  assert.equal(options.targetProfiles[0]?.keepDistanceMin, 0);
  assert.equal(options.targetProfiles[0]?.keepDistanceMax, 0);
  assert.equal(options.targetProfiles[0]?.behavior, "hold");
  assert.equal(options.targetProfiles[0]?.chaseMode, "auto");
});

test("normalizeOptions reuses legacy trainer spacing from follow-chain distance when trainer spacing is unset", () => {
  const options = normalizeOptions({
    trainerEnabled: true,
    partyFollowDistance: 4,
  });

  assert.equal(options.trainerPartnerDistance, 4);
});

test("normalizeOptions disables live trainer mode when follow chain is enabled", () => {
  const options = normalizeOptions({
    trainerEnabled: true,
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });

  assert.equal(options.partyFollowEnabled, true);
  assert.equal(options.trainerEnabled, false);
  assert.equal(options.trainerConfigured, true);
});

test("normalizeOptions keeps trainer settings when follow chain disables live trainer mode", () => {
  const options = normalizeOptions({
    trainerEnabled: true,
    partyFollowEnabled: true,
    trainerReconnectEnabled: false,
    trainerPartnerName: "Guide Gamma",
    trainerPartnerDistance: 3,
    trainerEscapeHealthPercent: 17,
    trainerEscapeDistance: 5,
    trainerEscapeCooldownMs: 750,
    autoEatFoodName: ["ham"],
    autoEatCooldownMs: 45000,
    antiIdleIntervalMs: 90000,
  });

  assert.equal(options.trainerEnabled, false);
  assert.equal(options.trainerConfigured, true);
  assert.equal(options.partyFollowEnabled, true);
  assert.equal(options.trainerReconnectEnabled, false);
  assert.equal(options.trainerPartnerName, "Guide Gamma");
  assert.equal(options.trainerPartnerDistance, 3);
  assert.equal(options.trainerEscapeHealthPercent, 17);
  assert.equal(options.trainerEscapeDistance, 5);
  assert.equal(options.trainerEscapeCooldownMs, 750);
  assert.deepEqual(options.autoEatFoodName, ["ham"]);
  assert.equal(options.autoEatCooldownMs, 45000);
  assert.equal(options.antiIdleIntervalMs, 90000);
});

test("normalizeOptions keeps trainer mana trainer separate from the standalone mana trainer", () => {
  const options = normalizeOptions({
    trainerEnabled: true,
    manaTrainerEnabled: false,
    trainerManaTrainerEnabled: true,
    trainerManaTrainerWords: "exura",
    trainerManaTrainerManaPercent: 95,
    trainerManaTrainerMinHealthPercent: 40,
  });

  assert.equal(options.manaTrainerEnabled, false);
  assert.equal(options.trainerManaTrainerEnabled, true);
  assert.equal(options.trainerManaTrainerWords, "exura");
  assert.equal(options.trainerManaTrainerManaPercent, 95);
  assert.equal(options.trainerManaTrainerMinHealthPercent, 40);
  assert.equal(options.trainerManaTrainerRules[0]?.words, "exura");
  assert.equal(options.trainerManaTrainerRules[0]?.minManaPercent, 95);
  assert.equal(options.trainerManaTrainerRules[0]?.minHealthPercent, 40);
  assert.equal(options.trainerManaTrainerRules[0]?.requireNoTargets, false);
  assert.equal(options.trainerManaTrainerRules[0]?.requireStationary, false);
});

test("normalizeOptions does not let the standalone mana trainer leak into trainer defaults", () => {
  const options = normalizeOptions({
    manaTrainerEnabled: true,
    manaTrainerWords: "adura vita",
    manaTrainerManaPercent: 92,
    manaTrainerMinHealthPercent: 40,
  });

  assert.equal(options.manaTrainerEnabled, true);
  assert.equal(options.manaTrainerWords, "adura vita");
  assert.equal(options.manaTrainerManaPercent, 92);
  assert.equal(options.manaTrainerMinHealthPercent, 40);
  assert.equal(options.trainerManaTrainerEnabled, false);
  assert.equal(options.trainerManaTrainerWords, "utevo res ina");
  assert.equal(options.trainerManaTrainerManaPercent, 85);
  assert.equal(options.trainerManaTrainerMinHealthPercent, 95);
  assert.equal(options.trainerManaTrainerRules[0]?.words, "utevo res ina");
  assert.equal(options.trainerManaTrainerRules[0]?.minManaPercent, 85);
  assert.equal(options.trainerManaTrainerRules[0]?.minHealthPercent, 95);
});

test("normalizeOptions preserves trainer settings when follow chain normalizes trainer mode off", () => {
  const options = normalizeOptions({
    trainerEnabled: true,
    trainerReconnectEnabled: false,
    trainerPartnerName: "Guide Gamma",
    trainerPartnerDistance: 4,
    trainerEscapeHealthPercent: 16,
    trainerEscapeDistance: 6,
    trainerEscapeCooldownMs: 900,
    autoEatFoodName: "ham",
    autoEatCooldownMs: 45000,
    healerEmergencyHealthPercent: 35,
    deathHealHealthPercent: 18,
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });

  assert.equal(options.trainerEnabled, false);
  assert.equal(options.trainerConfigured, true);
  assert.equal(options.trainerReconnectEnabled, false);
  assert.equal(options.trainerPartnerName, "Guide Gamma");
  assert.equal(options.trainerPartnerDistance, 4);
  assert.equal(options.trainerEscapeHealthPercent, 16);
  assert.equal(options.trainerEscapeDistance, 6);
  assert.equal(options.trainerEscapeCooldownMs, 900);
  assert.deepEqual(options.autoEatFoodName, ["ham"]);
  assert.equal(options.autoEatCooldownMs, 45000);
  assert.equal(options.healerEmergencyHealthPercent, 35);
  assert.equal(options.deathHealHealthPercent, 18);
});

test("normalizeOptions preserves per-member follow roles for the current chain", () => {
  const options = normalizeOptions({
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Mule Gamma"],
    partyFollowCombatMode: "follow-and-fight",
    partyFollowMemberRoles: {
      "Scout Beta": "sio-healer",
      "Mule Gamma": "assist-dps",
      "Outsider Delta": "follow-only",
    },
  });

  assert.deepEqual(options.partyFollowMemberRoles, {
    "Scout Beta": "sio-healer",
    "Mule Gamma": "assist-dps",
  });
});

test("normalizeOptions preserves per-member follow chase modes for the current chain", () => {
  const options = normalizeOptions({
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Mule Gamma"],
    partyFollowMemberChaseModes: {
      "Scout Beta": "aggressive chase",
      "Mule Gamma": "stand",
      "Outsider Delta": "chase",
      "Knight Alpha": "auto",
    },
  });

  assert.deepEqual(options.partyFollowMemberChaseModes, {
    "Scout Beta": "aggressive",
    "Mule Gamma": "stand",
  });
});

test("normalizeOptions keeps player archive names out of monster archive", () => {
  const options = normalizeOptions({
    creatureLedger: {
      monsters: ["Larva", "Knight Alpha", "Scout Beta"],
      players: ["Scout Beta", "Knight Alpha"],
      npcs: ["Rashid", "Scout Beta"],
    },
  });

  assert.deepEqual(options.playerArchive, ["Knight Alpha"]);
  assert.deepEqual(options.npcArchive, ["Rashid", "Scout Beta"]);
  assert.deepEqual(options.monsterArchive, ["Larva"]);
});

test("normalizeOptions keeps only official monsters and alpha variants in target queues", () => {
  const options = normalizeOptions({
    monster: "Larva, Knight Alpha, Rashid, alpha larva, Alpha Rashid",
    creatureLedger: {
      monsters: ["Larva", "Knight Alpha", "Rashid", "alpha larva", "Alpha Rashid"],
      players: ["Knight Alpha"],
      npcs: ["Rashid"],
    },
  });

  assert.deepEqual(options.monsterNames, ["Larva", "alpha larva"]);
  assert.deepEqual(options.monsterArchive, ["Larva", "alpha larva"]);
  assert.deepEqual(options.playerArchive, ["Knight Alpha"]);
  assert.deepEqual(options.npcArchive, ["Rashid"]);
});

test("normalizeOptions caps creature ledgers and keeps the most recent entries", () => {
  const total = MAX_CREATURE_LEDGER_ENTRIES_PER_KIND + 5;
  assert.ok(KNOWN_MINIBIA_MONSTER_AND_ALPHA_NAMES.length > MAX_CREATURE_LEDGER_ENTRIES_PER_KIND);
  const monsterNames = KNOWN_MINIBIA_MONSTER_AND_ALPHA_NAMES.slice(0, total);
  const buildNames = (prefix, totalNames) => Array.from({ length: totalNames }, (_, index) => `${prefix} ${index + 1}`);
  const options = normalizeOptions({
    creatureLedger: {
      monsters: monsterNames,
      players: buildNames("Player", total),
      npcs: buildNames("Npc", total),
    },
  });

  assert.equal(options.monsterArchive.length, MAX_CREATURE_LEDGER_ENTRIES_PER_KIND);
  assert.equal(options.playerArchive.length, MAX_CREATURE_LEDGER_ENTRIES_PER_KIND);
  assert.equal(options.npcArchive.length, MAX_CREATURE_LEDGER_ENTRIES_PER_KIND);
  assert.equal(options.monsterArchive[0], monsterNames[5]);
  assert.equal(options.playerArchive[0], "Player 6");
  assert.equal(options.npcArchive[0], "Npc 6");
  assert.equal(options.monsterArchive.at(-1), monsterNames.at(-1));
  assert.equal(options.playerArchive.at(-1), `Player ${total}`);
  assert.equal(options.npcArchive.at(-1), `Npc ${total}`);
});

test("chooseFollowTrainAction starts native follow on the previous train member", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
      },
    ],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(action?.fallbackAction, undefined);
});

test("chooseFollowTrainAction still follows when the predecessor is misclassified as a creature", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visiblePlayers: [],
    visibleCreatures: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(bot.chooseFollowTrainSuspendAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: null,
    visiblePlayers: [],
    visibleCreatures: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
  }), null);
});

test("trainer mode uses trainer partner settings instead of follow-chain assignments when the player is pushed", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: false,
    trainerPartnerName: "Knight Alpha",
    trainerPartnerDistance: 2,
    partyFollowEnabled: false,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });

  const targetAction = bot.chooseTrainerPartnerTarget({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
      },
    ],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  const regroupAction = bot.chooseTrainerPartnerRegroupAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 105, y: 100, z: 7 },
    },
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
      },
    ],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(bot.getFollowTrainAssignment({
    ready: true,
    playerName: "Scout Beta",
  }), null);
  assert.equal(targetAction?.chosen?.name, "Knight Alpha");
  assert.equal(regroupAction?.kind, "trainer-partner-walk");
  assert.deepEqual(regroupAction?.destination, { x: 103, y: 100, z: 7 });
});

test("trainer auto party blocks retargeting until the partner is in the same party", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Knight Alpha",
    trainerPartnerDistance: 1,
  });

  const baseSnapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.chooseTrainerPartnerTarget({
    ...baseSnapshot,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
        partyShield: {
          key: "none",
          relation: "none",
        },
      },
    ],
  }), null);

  assert.equal(bot.chooseTrainerPartnerTarget({
    ...baseSnapshot,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
        partyShield: {
          key: "yellow",
          relation: "same-party",
        },
      },
    ],
  })?.chosen?.name, "Knight Alpha");
});

test("trainer auto party elects the central trainer as leader and invites visible members", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Scout Beta",
  });
  bot.followTrainCoordinationState = {
    selfInstanceId: "knight-alpha",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        trainerEnabled: true,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 7 },
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        trainerEnabled: true,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "Knight Alpha",
        playerPosition: { x: 101, y: 100, z: 7 },
      },
      {
        instanceId: "mage-gamma",
        characterName: "Mage Gamma",
        trainerEnabled: true,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "Knight Alpha",
        playerPosition: { x: 102, y: 100, z: 7 },
      },
    ],
  };
  bot.castWords = async () => ({ ok: true });
  bot.castWords = async () => ({ ok: true });

  const action = bot.chooseTrainerPartyAction({
    ready: true,
    playerName: "Knight Alpha",
    visiblePlayers: [
      {
        id: 10,
        name: "Scout Beta",
        position: { x: 101, y: 100, z: 7 },
        partyShield: {
          key: "none",
          relation: "none",
        },
      },
      {
        id: 11,
        name: "Mage Gamma",
        position: { x: 102, y: 100, z: 7 },
        partyShield: {
          key: "none",
          relation: "none",
        },
      },
    ],
  });

  assert.equal(action?.kind, "trainer-party-invite");
  assert.equal(action?.targetName, "Scout Beta");
  assert.equal(action?.leaderName, "Knight Alpha");
});

test("trainer auto party elects one leader for a two-character pair without coordination", () => {
  const leaderBot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Zlocimir Wielkoportf",
  });

  const inviteAction = leaderBot.chooseTrainerPartyAction({
    ready: true,
    playerName: "Czarnobrat",
    visiblePlayers: [
      {
        id: 10,
        name: "Zlocimir Wielkoportf",
        position: { x: 100, y: 101, z: 7 },
        partyShield: {
          key: "none",
          relation: "none",
        },
      },
    ],
  });

  assert.equal(inviteAction?.kind, "trainer-party-invite");
  assert.equal(inviteAction?.targetName, "Zlocimir Wielkoportf");
  assert.equal(inviteAction?.leaderName, "Czarnobrat");

  const followerBot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Czarnobrat",
  });

  const joinAction = followerBot.chooseTrainerPartyAction({
    ready: true,
    playerName: "Zlocimir Wielkoportf",
    visiblePlayers: [
      {
        id: 11,
        name: "Czarnobrat",
        position: { x: 100, y: 100, z: 7 },
        partyShield: {
          key: "white-yellow",
          relation: "incoming-invite",
        },
      },
    ],
  });

  assert.equal(joinAction?.kind, "trainer-party-join");
  assert.equal(joinAction?.targetName, "Czarnobrat");
  assert.equal(joinAction?.leaderName, "Czarnobrat");
});

test("trainer auto party joins when the client stores a pending invite without a shield update", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Czarnobrat",
  });

  const snapshot = {
    ready: true,
    playerName: "Zlocimir Wielkoportf",
    playerPendingPartyInviteId: 11,
    visiblePlayers: [
      {
        id: 11,
        name: "Czarnobrat",
        position: { x: 100, y: 100, z: 7 },
        partyShield: {
          key: "none",
          relation: "none",
        },
      },
    ],
  };

  const status = bot.getTrainerPartnerPartyStatus(snapshot);
  const action = bot.chooseTrainerPartyAction(snapshot);

  assert.equal(status.relation, "incoming-invite");
  assert.equal(action?.kind, "trainer-party-join");
  assert.equal(action?.targetName, "Czarnobrat");
  assert.equal(action?.leaderName, "Czarnobrat");
});

test("trainer auto party treats live leader/member shields as same party", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Czarnobrat",
  });

  const snapshot = {
    ready: true,
    playerName: "Zlocimir Wielkoportf",
    playerPendingPartyInviteId: 0,
    visiblePlayers: [
      {
        id: 11,
        name: "Czarnobrat",
        position: { x: 100, y: 100, z: 7 },
        partyShield: {
          key: "leader",
          relation: "same-party",
        },
      },
    ],
  };

  assert.equal(bot.getTrainerPartnerPartyStatus(snapshot).relation, "same-party");
  assert.equal(bot.isTrainerPartnerPartyReady(snapshot), true);
  assert.equal(bot.chooseTrainerPartyAction(snapshot), null);
});

test("trainer auto party joins the elected leader when an incoming invite is visible", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "Knight Alpha",
  });
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        trainerEnabled: true,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "Knight Alpha",
        playerPosition: { x: 100, y: 100, z: 7 },
      },
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        trainerEnabled: true,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        playerPosition: { x: 101, y: 100, z: 7 },
      },
    ],
  };

  const action = bot.chooseTrainerPartyAction({
    ready: true,
    playerName: "Scout Beta",
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
        partyShield: {
          key: "white-yellow",
          relation: "incoming-invite",
        },
      },
    ],
  });

  assert.equal(action?.kind, "trainer-party-join");
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(action?.leaderName, "Knight Alpha");
});

test("chooseFollowTrainAction re-engages native follow immediately after a combat suspend", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });
  bot.getNow = () => 1_000;
  bot.markModuleAction("partyFollow-direct", null, 600);
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    lastSeenAt: 1_000,
    lastSeenPosition: { x: 105, y: 100, z: 7 },
    lastStairAttemptAt: 0,
    activeFollowTargetId: null,
    activeFollowTargetKey: "",
    lastFollowAttemptAt: 600,
    lastSuspendAt: 950,
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
      },
    ],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
  assert.equal(action?.targetName, "Knight Alpha");
});

test("chooseFollowTrainAction reissues native follow when snapshot follow state is gone", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    lastSeenAt: Date.now(),
    lastSeenPosition: { x: 105, y: 100, z: 7 },
    lastStairAttemptAt: 0,
    activeFollowTargetId: 10,
    activeFollowTargetKey: "knight alpha",
    lastFollowAttemptAt: Date.now(),
    lastSuspendAt: 0,
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 105, y: 100, z: 7 },
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
  assert.equal(action?.targetName, "Knight Alpha");
});

test("chooseTrainerEscape steps away from the trainer target at very low health", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerEscapeHealthPercent: 20,
    trainerEscapeDistance: 4,
    trainerEscapeCooldownMs: 600,
  });
  bot.getNow = () => 10_000;

  const action = bot.chooseTrainerEscape({
    ready: true,
    playerName: "Scout Beta",
    playerStats: {
      healthPercent: 12,
    },
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: {
      id: 99,
      name: "Training Monk",
      position: { x: 100, y: 101, z: 7 },
    },
    visibleCreatures: [
      {
        id: 99,
        name: "Training Monk",
        position: { x: 100, y: 101, z: 7 },
      },
    ],
    candidates: [],
    visiblePlayers: [],
    reachableTiles: [
      { x: 99, y: 99, z: 7 },
      { x: 100, y: 99, z: 7 },
      { x: 101, y: 99, z: 7 },
      { x: 99, y: 100, z: 7 },
      { x: 101, y: 100, z: 7 },
      { x: 99, y: 101, z: 7 },
      { x: 101, y: 101, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "trainer-escape");
  assert.equal(action?.reason, "escape");
  assert.equal(action?.moduleKey, "trainerEscape");
  assert.equal(action?.healthPercent, 12);
  assert.ok(action?.nextDistance > action?.currentDistance);
});

test("trainer mode arms anti-idle even when the standalone anti-idle module is off", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    antiIdleEnabled: false,
    antiIdleIntervalMs: 1000,
  });
  bot.startedAt = 1;
  bot.getNow = () => 2_000;
  bot.cdp = { isOpen: () => true };

  const action = bot.chooseAntiIdle({
    ready: true,
    playerStats: {
      healthPercent: 100,
      manaPercent: 100,
    },
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "anti-idle");
  assert.equal(action?.moduleKey, "antiIdle");
});

test("trainer reconnect keeps reconnect armed even when the standalone reconnect module is off", () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: false,
    trainerEnabled: true,
    trainerReconnectEnabled: true,
  });

  assert.equal(bot.isReconnectEnabled(), true);
  assert.equal(bot.getReconnectStatus().enabled, true);
  assert.equal(bot.getReconnectStatus().moduleEnabled, false);
  assert.equal(bot.getReconnectStatus().trainerEnabled, true);
  assert.equal(bot.getReconnectStatus().trainerOnly, true);
});

test("trainer reconnect stays optional inside trainer mode", () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: false,
    trainerEnabled: true,
    trainerReconnectEnabled: false,
  });

  assert.equal(bot.isReconnectEnabled(), false);
  assert.equal(bot.getReconnectStatus().enabled, false);
  assert.equal(bot.getReconnectStatus().trainerEnabled, false);
  assert.equal(bot.getReconnectStatus().trainerOnly, false);
});

test("tick auto-starts reconnect from trainer mode even when the standalone reconnect module is off", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: false,
    trainerEnabled: true,
    trainerReconnectEnabled: true,
    reconnectRetryDelayMs: 4000,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  let reconnectCalls = 0;
  let autoEatCalls = 0;

  bot.refresh = async () => disconnectedSnapshot;
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      reconnecting: true,
      message: "Reconnecting...",
    };
  };
  bot.attemptAutoEat = async () => {
    autoEatCalls += 1;
    return { action: null, result: null };
  };
  bot.getActiveVocationProfile = async () => null;
  bot.attemptDeathHeal = async () => ({ action: null, result: null });
  bot.attemptSustain = async () => ({ action: null, result: null });
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.attemptTrainerEscape = async () => ({ action: null, result: null });
  bot.handleRookiller = async () => ({ active: false, handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.attemptEquipmentAutoReplace = async () => ({ action: null, result: null });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptRefill = async () => ({ action: null, result: null });
  bot.chooseFollowTrainSuspendAction = () => null;
  bot.chooseFollowTrainAction = () => null;
  bot.attemptLoot = async () => ({ action: null, result: null });
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.chooseRouteAction = () => null;

  await bot.tick();

  assert.equal(reconnectCalls, 1);
  assert.equal(autoEatCalls, 0);
  assert.equal(bot.getReconnectStatus().enabled, true);
  assert.equal(bot.getReconnectStatus().trainerOnly, true);
  assert.equal(bot.getReconnectStatus().phase, "attempting");
});

test("anti-idle inventory pulse chooses a reversible stack split in an open container", () => {
  const bot = new MinibiaTargetBot({});

  const plan = bot.getAntiIdleInventoryPulsePlan(createModuleSnapshot({
    inventory: {
      containers: [
        {
          runtimeId: 88,
          capacity: 4,
          slots: [
            {
              index: 0,
              item: {
                name: "Backpack",
                count: 1,
                slotType: "backpack",
                flags: {
                  container: true,
                },
              },
            },
            {
              index: 1,
              item: {
                name: "gold coin",
                count: 37,
              },
            },
            {
              index: 3,
              item: {
                name: "brown mushroom",
                count: 3,
                flags: {
                  food: true,
                },
              },
            },
          ],
        },
      ],
    },
  }));

  assert.deepEqual(plan?.forward, {
    from: {
      location: "container",
      containerRuntimeId: 88,
      slotIndex: 1,
    },
    to: {
      location: "container",
      containerRuntimeId: 88,
      slotIndex: 2,
    },
    count: 1,
  });
  assert.deepEqual(plan?.restore, {
    from: {
      location: "container",
      containerRuntimeId: 88,
      slotIndex: 2,
    },
    to: {
      location: "container",
      containerRuntimeId: 88,
      slotIndex: 1,
    },
    count: 1,
  });
});

test("performAntiIdle uses the inventory pulse before the keyboard fallback", async () => {
  const bot = new MinibiaTargetBot({});
  const evaluations = [];
  bot.getNow = () => 10_000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async (expression) => {
      evaluations.push(expression);
      if (evaluations.length === 1) {
        return { ok: false, reason: "keepalive unavailable" };
      }
      if (evaluations.length === 2 || evaluations.length === 3) {
        return {
          ok: true,
          transport: "sendItemMove",
          itemId: 3031,
          name: "gold coin",
        };
      }
      throw new Error(`Unexpected anti-idle evaluate call ${evaluations.length}`);
    },
    send: async () => {
      assert.fail("keyboard fallback should not run when the inventory pulse succeeds");
    },
  };

  const result = await bot.performAntiIdle({
    type: "anti-idle",
    moduleKey: "antiIdle",
    inactivityMs: 540_000,
  }, createModuleSnapshot({
    inventory: {
      containers: [
        {
          runtimeId: 77,
          capacity: 3,
          slots: [
            {
              index: 0,
              item: {
                name: "gold coin",
                count: 37,
              },
            },
          ],
        },
      ],
    },
  }));

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "inventory-move-pulse");
  assert.equal(result?.directResult?.ok, false);
  assert.equal(bot.lastAntiIdleStatus?.transport, "inventory-move-pulse");
  assert.equal(bot.getLastModuleActionAt("antiIdle"), 10_000);
  assert.equal(evaluations.length, 3);
});

test("performAntiIdle falls back to the keyboard pulse when no inventory pulse is available", async () => {
  const bot = new MinibiaTargetBot({});
  const sendCalls = [];
  let evaluateCount = 0;
  bot.getNow = () => 20_000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => {
      evaluateCount += 1;
      if (evaluateCount === 1) {
        return { ok: false, reason: "keepalive unavailable" };
      }
      return { x: 10, y: 12 };
    },
    send: async (method) => {
      sendCalls.push(method);
      return {};
    },
  };

  const result = await bot.performAntiIdle({
    type: "anti-idle",
    moduleKey: "antiIdle",
    inactivityMs: 540_000,
  }, createModuleSnapshot());

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "input-mouse-keyboard");
  assert.equal(result?.inventoryPulseResult?.ok, false);
  assert.deepEqual(sendCalls, [
    "Page.bringToFront",
    "Input.dispatchMouseEvent",
    "Input.dispatchMouseEvent",
    "Input.dispatchKeyEvent",
    "Input.dispatchKeyEvent",
  ]);
});

test("trainer mode reuses auto eat even when the standalone auto-eat module is off", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    autoEatEnabled: false,
    autoEatFoodName: "brown mushroom",
    autoEatCooldownMs: 1000,
  });
  bot.getNow = () => 2_000;

  const action = bot.chooseAutoEat(createModuleSnapshot({
    currentTarget: {
      id: 55,
      name: "Guide Gamma",
      position: { x: 101, y: 100, z: 8 },
    },
    inventory: {
      containers: [
        {
          runtimeId: 1,
          name: "Backpack",
          slots: [
            {
              index: 0,
              item: {
                id: 3577,
                name: "brown mushroom",
                flags: {
                  food: true,
                },
              },
            },
          ],
        },
      ],
    },
  }));

  assert.equal(action?.moduleKey, "autoEat");
});

test("trainer partner targeting and regroup stay separate from follow-chain assignments", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: false,
    trainerPartnerName: "Guide Gamma",
    trainerPartnerDistance: 1,
    partyFollowEnabled: false,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });

  const snapshot = {
    ready: true,
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: {
      id: 22,
      name: "Guide Gamma",
      position: { x: 102, y: 100, z: 7 },
    },
    visiblePlayers: [
      {
        id: 22,
        name: "Guide Gamma",
        position: { x: 102, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.getFollowTrainAssignment(snapshot), null);
  assert.equal(bot.chooseTrainerPartnerTarget({
    ...snapshot,
    currentTarget: null,
  })?.chosen?.name, "Guide Gamma");
  assert.deepEqual(bot.chooseTrainerPartnerRegroupAction(snapshot)?.destination, { x: 101, y: 100, z: 7 });
});

test("trainer mode yields space instead of retargeting or regrouping on a low-health partner", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerPartnerName: "Guide Gamma",
    trainerPartnerDistance: 1,
    trainerEscapeHealthPercent: 30,
    healerEmergencyHealthPercent: 30,
  });

  const snapshot = {
    ready: true,
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visiblePlayers: [
      {
        id: 22,
        name: "Guide Gamma",
        position: { x: 102, y: 100, z: 7 },
        healthPercent: 18,
      },
    ],
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.shouldYieldTrainerPartner(snapshot), true);
  assert.equal(bot.chooseTrainerPartnerTarget(snapshot), null);
  assert.equal(bot.chooseTrainerPartnerRegroupAction(snapshot), null);
});

test("handlePausedCavebotTick clears trainer aggro when the partner is in the emergency band", async () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerPartnerName: "Guide Gamma",
    trainerEscapeHealthPercent: 30,
    healerEmergencyHealthPercent: 30,
    autoLightEnabled: false,
    manaTrainerEnabled: false,
    runeMakerEnabled: false,
    autoConvertEnabled: false,
    autoEatEnabled: false,
    cavebotPaused: false,
  });
  const snapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    currentTarget: {
      id: 22,
      name: "Guide Gamma",
      position: { x: 101, y: 100, z: 8 },
      healthPercent: 18,
    },
    visiblePlayers: [
      {
        id: 22,
        name: "Guide Gamma",
        position: { x: 101, y: 100, z: 8 },
        healthPercent: 18,
      },
    ],
  });
  let clearAggroCalls = 0;

  bot.clearAggro = async () => {
    clearAggroCalls += 1;
    return { ok: true };
  };
  bot.attemptAutoEat = async () => ({ action: null, result: null });
  bot.attemptEquipmentAutoReplace = async () => ({ action: null, result: null });
  bot.attemptAmmoReload = async () => ({ action: null, result: null });
  bot.attemptAmmoRestock = async () => ({ action: null, result: null });
  bot.attemptRefill = async () => ({ action: null, result: null });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseConvert = () => null;
  bot.chooseAntiIdle = () => null;

  const result = await bot.handlePausedCavebotTick(snapshot, {
    healingPriorityActive: false,
    vocationProfile: null,
  });

  assert.deepEqual(result, { handled: true, mode: "training" });
  assert.equal(clearAggroCalls, 1);
});

test("trainer mode ignores a self-selected live-session partner and falls back to another character", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: false,
    trainerPartnerName: "Scout Beta",
    trainerPartnerDistance: 1,
    partyFollowEnabled: false,
  });
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 7 },
        updatedAt: 1_000,
      },
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 101, y: 100, z: 7 },
        updatedAt: 1_000,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.getTrainerPartnerName(snapshot), "Knight Alpha");
  assert.equal(bot.chooseTrainerPartnerTarget(snapshot)?.chosen?.name, "Knight Alpha");
});

test("trainer mode infers the only live-session partner when trainer buddy is blank", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: false,
    trainerPartnerName: "",
    trainerPartnerDistance: 1,
    partyFollowEnabled: false,
  });
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 7 },
        updatedAt: 1_000,
      },
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 101, y: 100, z: 7 },
        updatedAt: 1_000,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.getTrainerPartnerName(snapshot), "Knight Alpha");
  assert.equal(bot.chooseTrainerPartnerTarget(snapshot)?.chosen?.name, "Knight Alpha");
});

test("trainer mode infers the only visible attacker when trainer buddy is blank", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: false,
    trainerPartnerName: "",
    trainerPartnerDistance: 1,
    partyFollowEnabled: false,
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
        isTargetingSelf: true,
      },
    ],
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.getTrainerPartnerName(snapshot), "Knight Alpha");
  assert.equal(bot.chooseTrainerPartnerTarget(snapshot)?.chosen?.name, "Knight Alpha");
});

test("trainer mode does not infer a random visible player when trainer buddy is blank", () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerPartnerName: "",
    trainerPartnerDistance: 1,
    partyFollowEnabled: false,
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
        isTargetingSelf: false,
      },
    ],
    visibleCreatures: [],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.getTrainerPartnerName(snapshot), "");
  assert.equal(bot.chooseTrainerPartnerTarget(snapshot), null);
});

test("chooseFollowTrainAction waits for a short desync window before using shared live chain coordinates to recover", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  let now = 1_000;
  bot.getNow = () => now;
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 105, y: 100, z: 7 },
        updatedAt: now,
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 7 },
        updatedAt: now,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
      { x: 104, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  const firstAction = bot.chooseFollowTrainAction(snapshot);
  assert.equal(firstAction, null);

  now = 2_700;
  const action = bot.chooseFollowTrainAction(snapshot);

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 104, y: 100, z: 7 });
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(action?.reason, "recovery");
});

test("chooseFollowTrainAction keeps regrouping far strays with shared leader coordinates", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    currentState: "DESYNC_RECOVERY",
    lastStateChangeAt: 4_000,
    lastSeenAt: 4_900,
    lastSeenPosition: { x: 112, y: 100, z: 7 },
    lastLeaderSource: "shared",
    lastStairAttemptAt: 0,
    activeFollowTargetId: null,
    activeFollowTargetKey: "",
    lastFollowAttemptAt: 3_500,
    lastSuspendAt: 0,
    lastDesyncAt: 3_000,
    lastRejoinAt: 0,
    lastRecoveryWalkAt: 4_700,
    desyncCount: 1,
    rejoinAttempts: 0,
    recoveryWalkAttempts: 4,
  };
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 112, y: 100, z: 7 },
        updatedAt: 5_000,
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 7 },
        updatedAt: 5_000,
      },
    ],
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
      { x: 104, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 104, y: 100, z: 7 });
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(action?.reason, "recovery");
});

test("chooseFollowTrainAction can walk a stray follower back using recent leader memory", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    currentState: "DESYNC_RECOVERY",
    lastStateChangeAt: 4_000,
    lastSeenAt: 4_800,
    lastSeenPosition: { x: 110, y: 100, z: 7 },
    lastLeaderSource: "visible",
    lastStairAttemptAt: 0,
    activeFollowTargetId: 10,
    activeFollowTargetKey: "knight alpha",
    lastFollowAttemptAt: 3_500,
    lastSuspendAt: 0,
    lastDesyncAt: 3_000,
    lastRejoinAt: 0,
    lastRecoveryWalkAt: 0,
    desyncCount: 1,
    rejoinAttempts: 1,
    recoveryWalkAttempts: 0,
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
      { x: 104, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 104, y: 100, z: 7 });
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(action?.reason, "recovery");
});

test("chooseFollowTrainAction uses a nearby shared stair tile to recover an off-floor leader", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 110, y: 100, z: 7 },
        updatedAt: 5_000,
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 110, y: 100, z: 8 },
        updatedAt: 5_000,
      },
    ],
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 110, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [],
    candidates: [],
    reachableTiles: [
      { x: 110, y: 99, z: 8 },
      { x: 111, y: 99, z: 8 },
    ],
    safeTiles: [],
    hazardTiles: [
      {
        position: { x: 110, y: 99, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 110, y: 99, z: 8 });
  assert.equal(action?.progressKey, "110,99,8");
  assert.equal(action?.reason, "floor-change");
  assert.equal(action?.targetName, "Knight Alpha");
});

test("chooseFollowTrainAction uses an adjacent ladder tile when the shared leader is upstairs", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 100, y: 99, z: 7 },
        updatedAt: 5_000,
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 8 },
        updatedAt: 5_000,
      },
    ],
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [],
    candidates: [],
    walkableTiles: [
      { x: 100, y: 100, z: 8 },
    ],
    safeTiles: [],
    hazardTiles: [
      {
        position: { x: 100, y: 99, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ladder"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.deepEqual(action, {
    kind: "follow-train-use-item",
    position: { x: 100, y: 99, z: 8 },
    targetName: "Knight Alpha",
  });
});

test("chooseFollowTrainAction treats stale off-floor native follow as floor-change recovery", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 110, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 110, y: 100, z: 7 },
    },
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [],
    candidates: [],
    reachableTiles: [
      { x: 110, y: 99, z: 8 },
      { x: 111, y: 99, z: 8 },
    ],
    safeTiles: [],
    hazardTiles: [
      {
        position: { x: 110, y: 99, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 110, y: 99, z: 8 });
  assert.equal(action?.reason, "floor-change");
  assert.equal(action?.targetName, "Knight Alpha");
});

test("chooseFollowTrainAction prefers the ramp segment closer to the off-floor leader", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 98, y: 100, z: 7 },
    },
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [],
    candidates: [],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 100, z: 8 },
    ],
    safeTiles: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
      {
        position: { x: 99, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 99, y: 100, z: 8 });
  assert.equal(action?.reason, "floor-change");
});

test("chooseFollowTrainAction ignores stale pathfinder autowalk while off-floor native follow is stuck", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 98, y: 100, z: 7 },
    },
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [],
    candidates: [],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 100, z: 8 },
    ],
    safeTiles: [],
    hazardTiles: [
      {
        position: { x: 99, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: true,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 99, y: 100, z: 8 });
  assert.equal(action?.reason, "floor-change");
});

test("chooseFollowTrainAction walks to the projected same-floor leader tile when stair markers are missing", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 0 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 103, y: 99, z: 1 },
    },
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 103, y: 99, z: 1 },
      },
    ],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 0 },
      { x: 102, y: 99, z: 0 },
      { x: 103, y: 99, z: 0 },
    ],
    safeTiles: [],
    hazardTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 103, y: 99, z: 0 });
  assert.equal(action?.progressKey, "103,99,0");
  assert.equal(action?.reason, "floor-change");
});

test("chooseFollowTrainAction prefers live shared leader coordinates over a stale same-floor native follow marker", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 1,
  });
  bot.getNow = () => 5_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "scout-beta",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        playerPosition: { x: 98, y: 100, z: 7 },
        updatedAt: 5_000,
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        playerPosition: { x: 100, y: 100, z: 8 },
        updatedAt: 5_000,
      },
    ],
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 100, y: 100, z: 8 },
    },
    visibleCreatures: [],
    visibleMonsters: [],
    visiblePlayers: [],
    candidates: [],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 100, z: 8 },
    ],
    safeTiles: [],
    hazardTiles: [
      {
        position: { x: 99, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 99, y: 100, z: 8 });
  assert.equal(action?.reason, "floor-change");
});

test("chooseFollowTrainAction rechains to the next live leader when the middle member is gone", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Mule Gamma"],
    partyFollowDistance: 2,
  });

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Mule Gamma",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 102, y: 100, z: 7 },
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
  assert.equal(action?.targetName, "Knight Alpha");
});

test("chooseFollowTrainAction keeps downstream members chained to a middle member while that link reforms", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Mule Gamma"],
    partyFollowDistance: 2,
  });
  bot.followTrainCoordinationState = {
    selfInstanceId: "mule-gamma",
    members: [
      {
        instanceId: "knight-alpha",
        characterName: "Knight Alpha",
        currentState: "DISABLED",
        followActive: false,
        playerPosition: { x: 102, y: 100, z: 7 },
        updatedAt: 1_000,
      },
      {
        instanceId: "scout-beta",
        characterName: "Scout Beta",
        currentState: "DESYNC_RECOVERY",
        followActive: false,
        playerPosition: { x: 101, y: 100, z: 7 },
        updatedAt: 1_000,
      },
      {
        instanceId: "mule-gamma",
        characterName: "Mule Gamma",
        currentState: "SAFE_HOLD",
        followActive: false,
        playerPosition: { x: 100, y: 100, z: 7 },
        updatedAt: 1_000,
      },
    ],
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Mule Gamma",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: null,
    visibleCreatures: [],
    candidates: [],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 102, y: 100, z: 7 },
      },
      {
        id: 11,
        name: "Scout Beta",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 11);
  assert.equal(action?.targetName, "Scout Beta");
});

test("chooseFollowTrainAction does not reform the chain while combat threats are visible", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 101, y: 100, z: 7 },
    },
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 102, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    reachableTiles: [
      { x: 101, y: 100, z: 7 },
      { x: 102, y: 100, z: 7 },
    ],
    safeTiles: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.chooseFollowTrainAction(snapshot), null);

  const suspendAction = bot.chooseFollowTrainSuspendAction(snapshot);
  assert.equal(suspendAction?.kind, "follow-train-stop");
  assert.equal(suspendAction?.targetName, "Knight Alpha");
});

test("attack-and-follow followers target live on-screen monsters outside the saved queue", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
    monsterNames: ["Rotworm"],
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 101, y: 100, z: 7 },
    },
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 102, y: 100, z: 7 },
        withinCombatWindow: true,
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  const selection = bot.chooseTarget(snapshot);
  assert.equal(selection?.chosen?.id, 77);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.name), ["Rat"]);
});

test("chooseFollowTrainAction ignores stale current target state and resumes follow", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
    monsterNames: ["Rat"],
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: {
      id: 77,
      name: "Rat",
      position: { x: 120, y: 120, z: 7 },
      withinCombatWindow: false,
      reachableForCombat: false,
    },
    currentFollowTarget: null,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.chooseFollowTrainSuspendAction(snapshot), null);
  const action = bot.chooseFollowTrainAction(snapshot);
  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
});

test("chooseFollowTrainAction reissues native follow when a same-floor follower is stuck far from the leader", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
  });
  bot.getNow = () => 3_000;
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    currentState: "FOLLOWING",
    lastStateChangeAt: 500,
    lastSeenAt: 2_900,
    lastSeenPosition: { x: 107, y: 100, z: 7 },
    lastLeaderSource: "visible",
    activeFollowTargetId: 10,
    activeFollowTargetKey: "knight alpha",
    lastFollowAttemptAt: 1_000,
    lastRejoinAt: 1_000,
  };

  const action = bot.chooseFollowTrainAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 107, y: 100, z: 7 },
    },
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 107, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
  assert.equal(action?.targetName, "Knight Alpha");
  assert.equal(action?.force, true);
});

test("follow-only followers keep reforming the chain instead of entering combat", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
    partyFollowCombatMode: "follow-only",
    monsterNames: ["Rat"],
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: {
      id: 77,
      name: "Rat",
      position: { x: 102, y: 100, z: 7 },
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    currentFollowTarget: null,
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 102, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 77,
        name: "Rat",
        position: { x: 102, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.chooseFollowTrainSuspendAction(snapshot), null);
  assert.equal(bot.chooseTarget(snapshot), null);
  const action = bot.chooseFollowTrainAction(snapshot);
  assert.equal(action?.kind, "follow-train-creature");
  assert.equal(action?.targetId, 10);
});

test("per-member follow roles override the legacy combat mode fallback", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowCombatMode: "follow-and-fight",
    partyFollowMemberRoles: {
      "Scout Beta": "follow-only",
    },
    monsterNames: ["Rat"],
  });

  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: {
      id: 77,
      name: "Rat",
      position: { x: 102, y: 100, z: 7 },
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 101, y: 100, z: 7 },
    },
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 101, y: 100, z: 7 },
      },
    ],
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 102, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 77,
        name: "Rat",
        position: { x: 102, y: 100, z: 7 },
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(bot.isFollowTrainFollowOnly(snapshot), true);
  assert.equal(bot.chooseFollowTrainSuspendAction(snapshot), null);
  assert.equal(bot.chooseTarget(snapshot), null);
});

test("specialized follow roles keep their mapped combat behavior", () => {
  const healerBot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowCombatMode: "follow-and-fight",
    partyFollowMemberRoles: {
      "Scout Beta": "sio-healer",
    },
  });
  const dpsBot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowCombatMode: "follow-only",
    partyFollowMemberRoles: {
      "Scout Beta": "assist-dps",
    },
  });
  const snapshot = {
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  assert.equal(healerBot.getFollowTrainRole("Scout Beta"), "sio-healer");
  assert.equal(healerBot.isFollowTrainFollowOnly(snapshot), true);
  assert.equal(dpsBot.getFollowTrainRole("Scout Beta"), "assist-dps");
  assert.equal(dpsBot.isFollowTrainAttackAndFollow(snapshot), true);
});

test("chooseRouteAction lets follow-train followers use the chain instead of route walking", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    waypoints: [
      { x: 101, y: 100, z: 7, type: "walk" },
    ],
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
});

test("normalizeOptions defaults the healer emergency threshold to the primary heal rule", () => {
  const options = normalizeOptions({
    healerRules: [
      {
        enabled: true,
        words: "exura gran ico",
        minHealthPercent: 0,
        maxHealthPercent: 42,
        minMana: 100,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura gran",
        minHealthPercent: 43,
        maxHealthPercent: 65,
        minMana: 70,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  assert.equal(options.healerEmergencyHealthPercent, 42);
});

test("discoverGamePages matches downloaded Minibia app targets by inspected page href", async () => {
  const pages = await discoverGamePages(9224, "https://minibia.com/play", {
    fetchJsonImpl: async () => [
      {
        id: "app-1",
        type: "other",
        title: "MiniBia Client",
        url: "chrome-extension://bljemjimnpmhmoepcibjlbkldejdbeob/app.html",
        webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/app-1",
      },
      {
        id: "docs-1",
        type: "page",
        title: "Docs",
        url: "https://example.com/docs",
        webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/docs-1",
      },
    ],
    inspectPageImpl: async (page) => (
      page.id === "app-1"
        ? {
            ...page,
            title: "Minibia",
            url: "https://minibia.com/play?pwa=1",
            characterName: "Knight Alpha",
            ready: true,
          }
        : page
    ),
  });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].id, "app-1");
  assert.equal(pages[0].url, "https://minibia.com/play?pwa=1");
  assert.equal(pages[0].characterName, "Knight Alpha");
});

test("discoverGamePages keeps Minibia app targets when identity inspection falls back to the app target", async () => {
  const pages = await discoverGamePages(9224, "https://minibia.com/play", {
    fetchJsonImpl: async () => [
      {
        id: "app-3",
        type: "other",
        title: "",
        url: "chrome-extension://bljemjimnpmhmoepcibjlbkldejdbeob/app.html",
        webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/app-3",
      },
      {
        id: "docs-2",
        type: "page",
        title: "Docs",
        url: "https://example.com/docs",
        webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/docs-2",
      },
    ],
    inspectPageImpl: async (page) => page,
  });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].id, "app-3");
  assert.equal(pages[0].url, "chrome-extension://bljemjimnpmhmoepcibjlbkldejdbeob/app.html");
  assert.equal(pages[0].ready, false);
});

test("inspectPageIdentity keeps the live Minibia href for Chrome app targets", async () => {
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = IdentityWebSocket;
  IdentityWebSocket.evaluateValue = {
    ready: true,
    characterName: "Knight Beta",
    playerPosition: { x: 100, y: 200, z: 7 },
    title: "Minibia",
    href: "https://minibia.com/play?pwa=1",
  };

  try {
    const page = await inspectPageIdentity({
      id: "app-identity-1",
      type: "other",
      title: "MiniBia Client",
      url: "chrome-extension://bljemjimnpmhmoepcibjlbkldejdbeob/app.html",
      webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/app-identity-1",
    });

    assert.equal(page.url, "https://minibia.com/play?pwa=1");
    assert.equal(page.title, "Minibia");
    assert.equal(page.characterName, "Knight Beta");
  } finally {
    IdentityWebSocket.evaluateValue = null;
    globalThis.WebSocket = originalWebSocket;
  }
});

test("findPage returns a downloaded Minibia app target after inspection", async () => {
  const page = await findPage(9224, "https://minibia.com/play", {
    fetchJsonImpl: async () => [
      {
        id: "app-2",
        type: "other",
        title: "",
        url: "chrome-extension://bljemjimnpmhmoepcibjlbkldejdbeob/app.html",
        webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/app-2",
      },
      {
        id: "tab-1",
        type: "page",
        title: "Other Site",
        url: "https://example.com",
        webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/tab-1",
      },
    ],
    inspectPageImpl: async (candidate) => (
      candidate.id === "app-2"
        ? {
            ...candidate,
            title: "Minibia",
            url: "https://minibia.com/play?pwa=1",
            ready: true,
          }
        : candidate
    ),
  });

  assert.equal(page?.id, "app-2");
  assert.equal(page?.url, "https://minibia.com/play?pwa=1");
});

test("refresh marks the genuine reconnect overlay state as disconnected and recoverable", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: null,
            },
          },
          networkManager: {
            state: { connected: false },
            __wasConnected: true,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
            reconnectNow() {},
          },
        },
        elements: {
          "reconnect-overlay": createDomElement(),
          "reconnect-now-btn": createDomElement(),
          "reconnect-message": createDomElement({ textContent: "Connection lost." }),
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.reason, "disconnected");
  assert.equal(snapshot.connection.connected, false);
  assert.equal(snapshot.connection.wasConnected, true);
  assert.equal(snapshot.connection.reconnectOverlayVisible, true);
  assert.equal(snapshot.connection.canReconnect, true);
  assert.equal(snapshot.connection.reconnectMessage, "Connection lost.");
});

test("refresh installs a background activity guard before reading page state", async () => {
  const bot = new MinibiaTargetBot({});
  const windowListeners = [];
  const documentListeners = [];
  const document = {
    getElementById() {
      return null;
    },
    addEventListener(type, listener, capture) {
      documentListeners.push({ type, listener, capture });
    },
    hasFocus() {
      return false;
    },
  };
  const windowObject = {
    document,
    addEventListener(type, listener, capture) {
      windowListeners.push({ type, listener, capture });
    },
    getComputedStyle() {
      return {
        display: "block",
        visibility: "visible",
        opacity: 1,
      };
    },
  };

  Object.defineProperty(document, "hidden", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: true,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: "hidden",
  });

  bot.page = { id: "page-guard", title: "Minibia" };
  bot.initialChatCleanupPending = false;
  bot.syncRouteCoordination = async () => null;
  bot.syncWaypointOverlay = async () => null;
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)(windowObject, {
        document,
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, false);
  assert.equal(document.hidden, false);
  assert.equal(document.visibilityState, "visible");
  assert.equal(document.hasFocus(), true);
  assert.deepEqual(
    windowListeners.map(({ type, capture }) => [type, capture]),
    [
      ["blur", true],
      ["visibilitychange", true],
    ],
  );
  assert.deepEqual(
    documentListeners.map(({ type, capture }) => [type, capture]),
    [["visibilitychange", true]],
  );
});

test("attach reuses the session page resolver before falling back to generic discovery", async () => {
  const bot = new MinibiaTargetBot({});
  const preferredPage = {
    id: "page-2",
    title: "Minibia",
    url: "https://minibia.com/play?client=2",
    webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/page/page-2",
  };
  const attachedPages = [];

  bot.setPageResolver(() => preferredPage);
  bot.connectToPage = async (page) => {
    attachedPages.push(page);
    bot.page = page;
    return page;
  };

  const page = await bot.attach();

  assert.equal(page.id, preferredPage.id);
  assert.deepEqual(attachedPages, [preferredPage]);
});

test("refresh marks the death modal state as dead and blocks reconnect", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    isDead: true,
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 0,
      maxHealth: 300,
      mana: 0,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: {
                element: { id: "death-modal" },
              },
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
            reconnectNow() {},
          },
        },
        elements: {
          "death-modal": createDomElement(),
          "death-message": createDomElement({ textContent: "Click OK to continue your journey." }),
          "reconnect-overlay": createDomElement(),
          "reconnect-now-btn": createDomElement(),
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.reason, "dead");
  assert.equal(snapshot.connection.playerIsDead, true);
  assert.equal(snapshot.connection.deathModalVisible, true);
  assert.equal(snapshot.connection.canReconnect, false);
});

test("refresh detects the login bootstrap state before the game client is live", async () => {
  const bot = new MinibiaTargetBot({});

  bot.page = { id: "page-login", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: {
                element: { id: "floater-enter" },
              },
            },
          },
          networkManager: {
            state: {},
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
        elements: {
          "login-wrapper": createDomElement(),
          "floater-enter": createDomElement(),
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.reason, "login-screen");
  assert.equal(snapshot.connection.lifecycle, "login");
  assert.equal(snapshot.connection.loginWrapperVisible, true);
  assert.equal(snapshot.connection.loginModalVisible, true);
  assert.equal(snapshot.connection.characterSelectVisible, false);
  assert.equal(snapshot.connection.authFailure, false);
});

test("refresh detects the character-select bootstrap state before a character enters the world", async () => {
  const bot = new MinibiaTargetBot({});

  bot.page = { id: "page-character-select", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: {
                element: { id: "character-select-modal" },
              },
            },
          },
          networkManager: {
            state: {},
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
        elements: {
          "login-wrapper": createDomElement(),
          "character-select-modal": createDomElement(),
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.reason, "character-select");
  assert.equal(snapshot.connection.lifecycle, "character-select");
  assert.equal(snapshot.connection.characterSelectVisible, true);
  assert.equal(snapshot.connection.loginWrapperVisible, true);
  assert.equal(snapshot.connection.authFailure, false);
});

test("refresh detects auth-failure bootstrap state from the live Minibia login modal", async () => {
  const bot = new MinibiaTargetBot({});

  bot.page = { id: "page-auth-failure", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: {
                element: { id: "floater-connecting" },
              },
            },
          },
          networkManager: {
            state: {},
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
        elements: {
          "login-wrapper": createDomElement(),
          "floater-connecting": createDomElement(),
          "floater-connecting-footer": createDomElement(),
          "serve-feedback": createDomElement({ textContent: "The account name or password is incorrect." }),
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.reason, "auth-failed");
  assert.equal(snapshot.connection.lifecycle, "auth-failed");
  assert.equal(snapshot.connection.connectingModalVisible, true);
  assert.equal(snapshot.connection.connectingFooterVisible, true);
  assert.equal(snapshot.connection.connectingMessage, "The account name or password is incorrect.");
  assert.equal(snapshot.connection.authFailure, true);
});

test("refresh ignores reconnect controls inside a hidden reconnect overlay", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const reconnectOverlay = createDomElement({ display: "none" });

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: null,
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
            reconnectNow() {},
          },
        },
        elements: {
          "reconnect-overlay": reconnectOverlay,
          "reconnect-now-btn": createDomElement({ parentElement: reconnectOverlay }),
          "reconnect-message": createDomElement({ textContent: "Reconnecting...", parentElement: reconnectOverlay }),
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.ready, true);
  assert.equal(snapshot.connection.reconnectOverlayVisible, false);
  assert.equal(snapshot.connection.reconnectButtonVisible, false);
  assert.equal(snapshot.connection.canReconnect, false);
});

test("refresh separates players and npcs from monsters and sorts visible names alphabetically", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const zuluPlayer = {
    id: 21,
    name: "Zulu Knight",
    __position: { x: 101, y: 200, z: 7 },
    state: {},
  };
  const alphaPlayer = {
    id: 20,
    name: "Alpha Knight",
    __position: { x: 99, y: 200, z: 7 },
    state: {},
  };
  const npc = {
    id: 31,
    name: "Yaman",
    __position: { x: 100, y: 201, z: 7 },
    state: {},
  };
  const dragon = {
    id: 11,
    name: "Dragon",
    __position: { x: 100, y: 199, z: 7 },
    state: {},
  };
  const bat = {
    id: 10,
    name: "Bat",
    __position: { x: 101, y: 199, z: 7 },
    state: {},
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [zuluPlayer.id, zuluPlayer],
              [npc.id, npc],
              [dragon.id, dragon],
              [alphaPlayer.id, alphaPlayer],
              [bat.id, bat],
            ]),
            playerList: ["Zulu Knight", "Alpha Knight"],
            npcList: { 31: true },
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.visiblePlayerNames, ["Alpha Knight", "Zulu Knight"]);
  assert.deepEqual(snapshot.visibleMonsterNames, ["Bat", "Dragon"]);
  assert.deepEqual(snapshot.visibleCreatureNames, ["Bat", "Dragon"]);
  assert.equal(snapshot.visiblePlayers.length, 2);
  assert.equal(snapshot.visibleCreatures.length, 2);
  assert.deepEqual(
    snapshot.visiblePlayers.map((entry) => entry.name).sort((left, right) => left.localeCompare(right)),
    ["Alpha Knight", "Zulu Knight"],
  );
  assert.deepEqual(
    snapshot.visibleCreatures.map((entry) => entry.name).sort((left, right) => left.localeCompare(right)),
    ["Bat", "Dragon"],
  );
  assert.ok(!snapshot.visiblePlayerNames.includes("Rashid"));
  assert.ok(!snapshot.visibleMonsterNames.includes("Rashid"));
});

test("refresh classifies configured follow-chain members as players without client player markers", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  const player = {
    id: 1,
    name: "Scout Beta",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const chainLead = {
    id: 21,
    name: "Knight Alpha",
    __position: { x: 101, y: 200, z: 7 },
    state: {},
  };
  const bat = {
    id: 10,
    name: "Bat",
    __position: { x: 101, y: 199, z: 7 },
    state: {},
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [chainLead.id, chainLead],
              [bat.id, bat],
            ]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.visiblePlayerNames, ["Knight Alpha"]);
  assert.deepEqual(snapshot.visibleMonsterNames, ["Bat"]);
  assert.equal(snapshot.visiblePlayers[0]?.name, "Knight Alpha");
  assert.equal(snapshot.visibleCreatures[0]?.name, "Bat");
});

test("refresh annotates visible players with skull state and whether they target the local player", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Scout Beta",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const hostilePlayer = {
    id: 21,
    name: "PK Two",
    __position: { x: 101, y: 200, z: 7 },
    __target: player,
    getShield() {
      return 1;
    },
    state: {
      skull: "Red Skull",
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [hostilePlayer.id, hostilePlayer],
            ]),
            playerList: ["PK Two"],
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.visiblePlayerNames, ["PK Two"]);
  assert.equal(snapshot.visiblePlayers[0]?.name, "PK Two");
  assert.equal(snapshot.visiblePlayers[0]?.isTargetingSelf, true);
  assert.equal(snapshot.visiblePlayers[0]?.skull?.key, "red");
  assert.equal(snapshot.visiblePlayers[0]?.partyShield?.key, "leader");
  assert.equal(snapshot.visiblePlayers[0]?.partyShield?.relation, "same-party");
});

test("refresh classifies archived player names as players without client player markers", async () => {
  const bot = new MinibiaTargetBot({
    playerArchive: ["Knight Alpha"],
    monsterArchive: ["Knight Alpha", "Bat"],
  });
  const player = {
    id: 1,
    name: "Scout Beta",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const archivedPlayer = {
    id: 21,
    name: "Knight Alpha",
    __position: { x: 101, y: 200, z: 7 },
    state: {},
  };
  const bat = {
    id: 10,
    name: "Bat",
    __position: { x: 101, y: 199, z: 7 },
    state: {},
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [archivedPlayer.id, archivedPlayer],
              [bat.id, bat],
            ]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.visiblePlayerNames, ["Knight Alpha"]);
  assert.deepEqual(snapshot.visibleMonsterNames, ["Bat"]);
  assert.equal(snapshot.visiblePlayers[0]?.name, "Knight Alpha");
});

test("refresh classifies known Minibia monsters and alpha variants while defaulting unknown names to players", async () => {
  const bot = new MinibiaTargetBot({
    monster: "Bat",
  });
  const player = {
    id: 1,
    name: "Scout Beta",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const unknownPlayer = {
    id: 21,
    name: "Knight Alpha",
    __position: { x: 101, y: 200, z: 7 },
    state: {},
  };
  const npc = {
    id: 31,
    name: "Yaman",
    __position: { x: 100, y: 201, z: 7 },
    state: {},
  };
  const monster = {
    id: 10,
    name: "Bat",
    __position: { x: 101, y: 199, z: 7 },
    state: {},
  };
  const alphaMonster = {
    id: 11,
    name: "Alpha Bat",
    __position: { x: 102, y: 199, z: 7 },
    state: {},
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [unknownPlayer.id, unknownPlayer],
              [npc.id, npc],
              [monster.id, monster],
              [alphaMonster.id, alphaMonster],
            ]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.visiblePlayerNames, ["Knight Alpha"]);
  assert.deepEqual(snapshot.visibleNpcNames, ["Yaman"]);
  assert.deepEqual(snapshot.visibleMonsterNames, ["Alpha Bat", "Bat"]);
  assert.deepEqual(snapshot.allMatches.map((entry) => entry.name), ["Bat", "Alpha Bat"]);
});

test("refresh reads creature names from state and private name fields before classification", async () => {
  const bot = new MinibiaTargetBot({
    monster: "Dragon",
  });
  const player = {
    id: 1,
    __name: "Dark Knight",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const dragon = {
    id: 10,
    __position: { x: 101, y: 200, z: 7 },
    state: {
      name: "Dragon",
    },
  };

  bot.page = { id: "page-state-name", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [dragon.id, dragon],
            ]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.playerName, "Dark Knight");
  assert.deepEqual(snapshot.visibleMonsterNames, ["Dragon"]);
  assert.equal(snapshot.allMatches[0]?.name, "Dragon");
});

test("alpha monster variants inherit base target tracking and profile settings", () => {
  const bot = new MinibiaTargetBot({
    monster: "Bat",
    targetProfiles: [
      {
        name: "Bat",
        priority: 220,
      },
    ],
  });

  assert.equal(bot.isTrackedMonsterName("Alpha Bat"), true);
  assert.equal(bot.getTargetProfile("Alpha Bat")?.name, "Bat");
});

test("refresh applies manual creature ledger npc and monster overrides without client markers", async () => {
  const bot = new MinibiaTargetBot({
    creatureLedger: {
      monsters: ["Larva"],
      players: [],
      npcs: ["Quest Broker"],
    },
  });
  const player = {
    id: 1,
    name: "Scout Beta",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const manualNpc = {
    id: 21,
    name: "Quest Broker",
    __position: { x: 101, y: 200, z: 7 },
    state: {},
  };
  const manualMonster = {
    id: 22,
    name: "Larva",
    __position: { x: 101, y: 199, z: 7 },
    state: {},
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [manualNpc.id, manualNpc],
              [manualMonster.id, manualMonster],
            ]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.visibleNpcNames, ["Quest Broker"]);
  assert.deepEqual(snapshot.visibleMonsterNames, ["Larva"]);
});

test("refresh extracts combat modes, pvp state, hotbar slots, inventory summaries, and progression when exposed", async () => {
  const bot = new MinibiaTargetBot({});
  const equipment = createEquipment();
  equipment.slotLabels = [
    "Head",
    "Armor",
    "Legs",
    "Boots",
    "Right Hand",
    "Left Hand",
    "Backpack",
    "Shoulder",
    "Ring",
    "Ammo",
  ];
  equipment.slots[0].item = { id: 2461, name: "Steel Helmet", count: 1 };
  equipment.slots[9].item = { id: 2544, name: "Arrow", count: 80 };

  const backpack = createContainer([
    { id: 7618, name: "Health Potion", count: 15 },
    createGreatFireballRune(6),
    { id: 3003, name: "Rope", count: 1 },
    { id: 2554, name: "Shovel", count: 1 },
    { id: 3582, name: "Ham", count: 4 },
  ], MAIN_BACKPACK_ID, 202);
  backpack.name = "Backpack";

  const pzConditionId = 77;
  const ConditionManager = class ConditionManager {};
  ConditionManager.prototype.PZ_LOCK = pzConditionId;

  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    equipment,
    __openedContainers: [backpack],
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
      experiencePercent: 72,
      skull: "White Skull",
      blessings: ["Spiritual Shielding", "Twist of Fate"],
      promotion: "Elite Knight",
      residence: "Thais",
    },
    isMoving() {
      return false;
    },
    hasCondition(conditionId) {
      return conditionId === pzConditionId;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              slots: [
                {
                  index: 0,
                  hotkey: "F1",
                  spell: {
                    id: 10,
                    name: "Light Healing",
                    words: "exura",
                  },
                  active: true,
                },
                {
                  index: 1,
                  hotkey: "F2",
                  item: {
                    id: 7618,
                    name: "Health Potion",
                    count: 3,
                  },
                },
                {
                  index: 2,
                  hotkey: "Shift+F1",
                  text: "attack nearest",
                },
              ],
              __findFullCoinStack() {
                return null;
              },
            },
            fightModeManager: {
              currentMode: { label: "Balanced" },
            },
            chaseModeManager: {
              selectedMode: { label: "Stand" },
            },
            safeModeManager: {
              activeMode: { label: "Safe" },
            },
          },
        },
        globalThisOverrides: {
          ConditionManager,
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });
  const containerItemNames = snapshot.inventory.containers[0].slots.map((entry) => entry.item.name).sort((left, right) => left.localeCompare(right));

  assert.equal(snapshot.combatModes.fightMode.key, "balanced");
  assert.equal(snapshot.combatModes.chaseMode.key, "stand");
  assert.equal(snapshot.combatModes.safeMode.key, "safe");
  assert.equal(snapshot.pvpState.pkLockEnabled, true);
  assert.equal(snapshot.pvpState.pzLocked, true);
  assert.equal(snapshot.pvpState.skull.key, "white");

  assert.equal(snapshot.hotbar.slotCount, 3);
  assert.deepEqual(snapshot.hotbar.slots.map((entry) => entry.kind), ["spell", "item", "action"]);
  assert.equal(snapshot.hotbar.slots[0].spellName, "Light Healing");
  assert.equal(snapshot.hotbar.slots[1].itemName, "Health Potion");
  assert.equal(snapshot.hotbar.slots[2].label, "attack nearest");
  assert.equal(snapshot.hotbar.slots[2].words, "attack nearest");

  assert.equal(snapshot.inventory.equipment.length, 10);
  assert.equal(snapshot.inventory.openContainerCount, 1);
  assert.equal(snapshot.inventory.containers[0].name, "Backpack");
  assert.equal(snapshot.inventory.containers[0].usedSlots, 5);
  assert.equal(snapshot.inventory.ammo.name, "Arrow");
  assert.equal(snapshot.inventory.ammo.count, 80);
  assert.deepEqual(containerItemNames, ["Great Fireball Rune", "Ham", "Health Potion", "Rope", "Shovel"]);
  assert.ok(snapshot.inventory.supplies.length >= 2);

  assert.equal(snapshot.progression.blessings.count, 2);
  assert.deepEqual(snapshot.progression.blessings.names, ["Spiritual Shielding", "Twist of Fate"]);
  assert.equal(snapshot.progression.promotion, "Elite Knight");
  assert.equal(snapshot.progression.residence, "Thais");
  assert.equal(snapshot.playerStats.levelPercent, 72);
});

test("refresh extracts numeric combat modes from FightModeSelector", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            fightModeSelector: {
              currentFightMode: 0,
              currentChaseMode: 2,
              __pkLockActive: true,
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.combatModes.fightMode.key, "offensive");
  assert.equal(snapshot.combatModes.fightMode.label, "Offensive");
  assert.equal(snapshot.combatModes.fightMode.rawValue, "0");
  assert.equal(snapshot.combatModes.chaseMode.key, "chase");
  assert.equal(snapshot.combatModes.chaseMode.label, "Aggressive");
  assert.equal(snapshot.combatModes.chaseMode.rawValue, "2");
  assert.equal(snapshot.combatModes.safeMode.key, "safe");
  assert.equal(snapshot.pvpState.pkLockEnabled, true);
  assert.equal(bot.preferredChaseMode, 2);
});

test("refresh resolves numeric inventory labels from live item definitions for food planning", async () => {
  const bot = new MinibiaTargetBot({});
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3725, count: 7 },
    { id: 3583, count: 3 },
    { id: 3031, count: 37 },
  ], MAIN_BACKPACK_ID, 202);

  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    equipment,
    __openedContainers: [backpack],
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          itemDefinitionsByCid: {
            [MAIN_BACKPACK_ID]: { name: "Backpack" },
            3725: { name: "Roasted Brown Mushroom" },
            3583: { name: "Seasoned Dragon Ham" },
            3031: { name: "Gold Coin" },
          },
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              slots: [
                {
                  index: 9,
                  hotkey: "F9",
                  item: {
                    id: 3725,
                    count: 12,
                  },
                },
              ],
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });
  const containerItemNames = snapshot.inventory.containers[0].slots.map((entry) => entry.item.name);
  const supplyFoodNames = snapshot.inventory.supplies
    .filter((entry) => entry.category === "food")
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  assert.equal(snapshot.hotbar.slots[0].itemName, "Roasted Brown Mushroom");
  assert.equal(snapshot.inventory.containers[0].name, "Backpack");
  assert.deepEqual(containerItemNames, ["Roasted Brown Mushroom", "Seasoned Dragon Ham", "Gold Coin"]);
  assert.deepEqual(supplyFoodNames, ["Roasted Brown Mushroom", "Seasoned Dragon Ham"]);
});

test("refresh captures dialogue options, trade state, task state, and nearby corpse tiles when exposed", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const npc = {
    id: 31,
    name: "Sandra",
    __position: { x: 101, y: 200, z: 7 },
    state: {},
  };
  const defaultChannel = {
    id: 0,
    name: "Default",
    messages: [
      { id: "m1", speaker: "Sandra", text: "Would you like to trade?" },
      { id: "m2", speaker: "Sandra", text: "Your account balance is 12,050 gold." },
    ],
  };
  const corpseTile = {
    __position: { x: 102, y: 200, z: 7 },
    position: { x: 102, y: 200, z: 7 },
    isWalkable() {
      return true;
    },
    getPosition() {
      return this.__position;
    },
    getTopUseThing() {
      return {
        id: 5001,
        name: "Dead Orc",
      };
    },
    things: [
      {
        id: 5001,
        name: "Dead Orc",
      },
    ],
    items: [
      {
        id: 5001,
        name: "Dead Orc",
      },
    ],
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([
              [player.id, player],
              [npc.id, npc],
            ]),
            npcList: { 31: true },
            pathfinder: {},
            chunks: [
              {
                getFloorTiles() {
                  return [corpseTile];
                },
              },
            ],
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            modalManager: {
              __openedModal: null,
            },
            channelManager: {
              channels: [defaultChannel],
              getChannelById(id) {
                return id === 0 ? defaultChannel : null;
              },
              getChannel(name) {
                return name === "Default" ? defaultChannel : null;
              },
              getActiveChannel() {
                return defaultChannel;
              },
            },
            dialogueManager: {
              options: [
                { text: "Trade" },
                { text: "Balance" },
              ],
            },
            tradeManager: {
              open: true,
              npcName: "Sandra",
              activeSide: "buy",
              buyItems: [
                { id: 237, name: "Strong Mana Potion", price: 80 },
              ],
              sellItems: [
                { id: 3031, name: "Gold Coin", price: 1 },
              ],
            },
            taskManager: {
              open: true,
              activeTaskType: "hunting",
              taskNpc: "Grizzly Adams",
              taskTarget: "Larva",
              progressCurrent: 12,
              progressRequired: 30,
              rewardReady: false,
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.dialogue.options.length, 2);
  assert.equal(snapshot.dialogue.options[0].text, "Trade");
  assert.equal(snapshot.trade.open, true);
  assert.equal(snapshot.trade.buyItems[0].name, "Strong Mana Potion");
  assert.equal(snapshot.task.activeTaskType, "hunting");
  assert.equal(snapshot.task.taskTarget, "Larva");
});

test("refresh falls back to the active chat channel when Default is unavailable", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const serverLogChannel = {
    id: 5,
    name: "Server Log",
    messages: [
      { speaker: "Loot", text: "Loot of a larva: 3 gold coins and a ham." },
    ],
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            npcList: {},
            pathfinder: {},
            chunks: [],
          },
          interface: {
            modalManager: {
              __openedModal: null,
            },
            channelManager: {
              channels: [serverLogChannel],
              getChannelById() {
                return null;
              },
              getChannel() {
                return null;
              },
              getActiveChannel() {
                return serverLogChannel;
              },
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.dialogue.activeChannelName, "Server Log");
  assert.equal(snapshot.dialogue.defaultChannelName, "Server Log");
  assert.equal(snapshot.dialogue.defaultChannelActive, true);
  assert.equal(snapshot.dialogue.recentMessages.length, 1);
  assert.equal(snapshot.dialogue.recentMessages[0].text, "Loot of a larva: 3 gold coins and a ham.");
});

test("refresh merges default and active chat tails when npc dialogue is active", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const defaultChannel = {
    id: 0,
    name: "Default",
    messages: [
      { id: "d1", speaker: "System", text: "Welcome to Minibia." },
    ],
  };
  const npcChannel = {
    id: 9,
    name: "NPCs",
    messages: [
      { id: "n1", speaker: "Knight Alpha", text: "hi" },
      { id: "n2", speaker: "Captain Bluebear", text: "Where do you want to go?" },
    ],
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            npcList: {},
            pathfinder: {},
            chunks: [],
          },
          interface: {
            modalManager: {
              __openedModal: null,
            },
            channelManager: {
              channels: [defaultChannel, npcChannel],
              getChannelById(id) {
                return id === 0 ? defaultChannel : null;
              },
              getChannel(name) {
                return name === "Default" ? defaultChannel : null;
              },
              getActiveChannel() {
                return npcChannel;
              },
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.dialogue.defaultChannelName, "Default");
  assert.equal(snapshot.dialogue.activeChannelName, "NPCs");
  assert.deepEqual(
    snapshot.dialogue.recentMessages.map((message) => ({
      speaker: message.speaker,
      text: message.text,
      channelName: message.channelName,
    })),
    [
      { speaker: "System", text: "Welcome to Minibia.", channelName: "Default" },
      { speaker: "Knight Alpha", text: "hi", channelName: "NPCs" },
      { speaker: "Captain Bluebear", text: "Where do you want to go?", channelName: "NPCs" },
    ],
  );
});

test("refresh keeps a deeper noisy default chat tail for ship replay capture", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const defaultChannel = {
    id: 0,
    name: "Default",
    messages: Array.from({ length: 20 }, (_entry, index) => ({
      id: `d${index + 1}`,
      speaker: index === 4 ? "Knight Alpha" : `Passenger ${index + 1}`,
      text: index === 4 ? "ankrahmun" : `noise ${index + 1}`,
    })),
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            npcList: {},
            pathfinder: {},
            chunks: [],
          },
          interface: {
            modalManager: {
              __openedModal: null,
            },
            channelManager: {
              channels: [defaultChannel],
              getChannelById(id) {
                return id === 0 ? defaultChannel : null;
              },
              getChannel(name) {
                return name === "Default" ? defaultChannel : null;
              },
              getActiveChannel() {
                return defaultChannel;
              },
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.dialogue.recentMessages.length, 20);
  assert(snapshot.dialogue.recentMessages.some((message) => (
    message.speaker === "Knight Alpha"
    && message.text === "ankrahmun"
  )));
});

test("refresh reads live channel __contents entries when channel history arrays are empty", async () => {
  const bot = new MinibiaTargetBot({});
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  const defaultChannel = {
    id: 0,
    name: "Default",
    __contents: [
      { name: "Knight Alpha", message: "utani hur" },
      { name: "", message: "Loot of larva: 24 gold coin" },
    ],
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            npcList: {},
            pathfinder: {},
            chunks: [],
          },
          interface: {
            modalManager: {
              __openedModal: null,
            },
            channelManager: {
              channels: [defaultChannel],
              getChannelById(id) {
                return id === 0 ? defaultChannel : null;
              },
              getChannel(name) {
                return name === "Default" ? defaultChannel : null;
              },
              getActiveChannel() {
                return defaultChannel;
              },
            },
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(
    snapshot.dialogue.recentMessages.map((message) => message.text),
    ["utani hur", "Loot of larva: 24 gold coin"],
  );
});

test("refresh scans visible floor tiles once while building combat tile state", async () => {
  const bot = new MinibiaTargetBot({});
  let getFloorTilesCalls = 0;
  let isWalkableCalls = 0;
  const fireField = {
    id: 1487,
    name: "Fire Field",
  };
  const fireTile = {
    __position: { x: 101, y: 200, z: 7 },
    position: { x: 101, y: 200, z: 7 },
    isWalkable() {
      isWalkableCalls += 1;
      return true;
    },
    getPosition() {
      return this.__position;
    },
    getThings() {
      return [fireField];
    },
    things: [fireField],
  };
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-tiles", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
            chunks: [
              {
                getFloorTiles() {
                  getFloorTilesCalls += 1;
                  return [fireTile];
                },
              },
            ],
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(getFloorTilesCalls, 1);
  assert.equal(isWalkableCalls, 1);
  assert.equal(snapshot.hazardTiles.length, 1);
  assert.deepEqual(snapshot.elementalFields, [
    {
      position: { x: 101, y: 200, z: 7 },
      types: ["fire"],
      ids: [1487],
    },
  ]);
  assert.ok(snapshot.walkableTiles.some((tile) => tile.x === 101 && tile.y === 200 && tile.z === 7));
  assert.ok(!snapshot.safeTiles.some((tile) => tile.x === 101 && tile.y === 200 && tile.z === 7));
  assert.ok(snapshot.safeTiles.some((tile) => tile.x === 100 && tile.y === 200 && tile.z === 7));
});

test("refresh trusts explicit field labels over ambiguous elemental field ids", async () => {
  const bot = new MinibiaTargetBot({});
  const fireField = {
    id: 2124,
    name: "fire field",
  };
  const fireTile = {
    __position: { x: 101, y: 200, z: 7 },
    position: { x: 101, y: 200, z: 7 },
    isWalkable() {
      return true;
    },
    getPosition() {
      return this.__position;
    },
    getThings() {
      return [fireField];
    },
    things: [fireField],
  };
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-tiles", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
            chunks: [
              {
                getFloorTiles() {
                  return [fireTile];
                },
              },
            ],
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.hazardTiles[0]?.categories, ["fire"]);
  assert.deepEqual(snapshot.hazardTiles[0]?.elementalTypes, ["fire"]);
  assert.deepEqual(snapshot.elementalFields, [
    {
      position: { x: 101, y: 200, z: 7 },
      types: ["fire"],
      ids: [2124],
    },
  ]);
});

test("refresh detects stair and ramp tile names as floor-transition hazards", async () => {
  const bot = new MinibiaTargetBot({});
  const stairTile = {
    tileId: 469,
    tileName: "stairs",
    __position: { x: 101, y: 200, z: 7 },
    isWalkable() {
      return true;
    },
    getPosition() {
      return this.__position;
    },
    getThings() {
      return [];
    },
  };
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-stairs", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
            chunks: [
              {
                getFloorTiles() {
                  return [stairTile];
                },
              },
            ],
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.deepEqual(snapshot.hazardTiles[0]?.position, { x: 101, y: 200, z: 7 });
  assert.deepEqual(snapshot.hazardTiles[0]?.categories, ["stairsLadders"]);
  assert.ok(!snapshot.safeTiles.some((tile) => tile.x === 101 && tile.y === 200 && tile.z === 7));
});

test("reconnectNow only triggers from a visible reconnect overlay", async () => {
  const bot = new MinibiaTargetBot({});
  const reconnectOverlay = createDomElement({ display: "none" });
  let reconnectCalls = 0;

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player: {
            isDead: false,
          },
          networkManager: {
            state: { connected: true },
            __wasConnected: false,
            __reconnecting: false,
            __intentionalClose: false,
            __serverError: "",
            reconnectNow() {
              reconnectCalls += 1;
            },
          },
        },
        elements: {
          "reconnect-overlay": reconnectOverlay,
          "reconnect-now-btn": createDomElement({ parentElement: reconnectOverlay }),
          "reconnect-message": createDomElement({ textContent: "Reconnecting...", parentElement: reconnectOverlay }),
        },
      });
    },
  };

  const result = await bot.reconnectNow();

  assert.equal(result.ok, false);
  assert.equal(result.reason, "reconnect unavailable");
  assert.equal(result.reconnectOverlayVisible, false);
  assert.equal(result.reconnectButtonVisible, false);
  assert.equal(reconnectCalls, 0);
});

test("reconnectNow starts from the visible reconnect overlay by falling back to the DOM reconnect button", async () => {
  const bot = new MinibiaTargetBot({});
  let buttonClicks = 0;
  let directReconnectCalls = 0;
  const networkManager = {
    state: { connected: false },
    __wasConnected: true,
    __reconnecting: false,
    __intentionalClose: false,
    __serverError: "",
    reconnectNow() {
      directReconnectCalls += 1;
      throw new Error("direct reconnect method should not be called");
    },
  };
  const reconnectButton = createDomElement({
    click() {
      buttonClicks += 1;
      networkManager.__reconnecting = true;
    },
  });

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player: {
            isDead: false,
          },
          networkManager,
        },
        elements: {
          "reconnect-overlay": createDomElement(),
          "reconnect-now-btn": reconnectButton,
          "reconnect-message": createDomElement({ textContent: "Connection lost." }),
        },
      });
    },
  };

  const result = await bot.reconnectNow();

  assert.equal(result.ok, true);
  assert.equal(result.started, true);
  assert.equal(result.reconnecting, true);
  assert.equal(result.reconnectOverlayVisible, true);
  assert.equal(result.reconnectButtonVisible, true);
  assert.equal(result.action, "button-click");
  assert.equal(result.clicked, true);
  assert.equal(buttonClicks, 1);
  assert.equal(directReconnectCalls, 0);
});

test("reconnectNow uses CDP mouse input on the real reconnect button before DOM fallback", async () => {
  const bot = new MinibiaTargetBot({});
  const sentEvents = [];
  let buttonClicks = 0;
  let directReconnectCalls = 0;
  const networkManager = {
    state: { connected: false },
    __wasConnected: true,
    __reconnecting: false,
    __intentionalClose: false,
    __serverError: "",
    reconnectNow() {
      directReconnectCalls += 1;
      throw new Error("direct reconnect method should not be called");
    },
  };
  const rect = {
    left: 40,
    top: 50,
    width: 140,
    height: 36,
  };
  const reconnectButton = createDomElement({
    rect,
    click() {
      buttonClicks += 1;
      networkManager.__reconnecting = true;
    },
  });
  const elements = {
    "reconnect-overlay": createDomElement(),
    "reconnect-now-btn": reconnectButton,
    "reconnect-message": createDomElement({ textContent: "Connection lost." }),
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player: {
            isDead: false,
          },
          networkManager,
        },
        elements,
      });
    },
    async send(method, params = {}) {
      sentEvents.push({ method, params });
      if (method === "Input.dispatchMouseEvent" && params.type === "mouseReleased") {
        const inside = params.x >= rect.left
          && params.x <= rect.left + rect.width
          && params.y >= rect.top
          && params.y <= rect.top + rect.height;
        if (inside) reconnectButton.click();
      }
      return {};
    },
  };

  const result = await bot.reconnectNow();

  assert.equal(result.ok, true);
  assert.equal(result.started, true);
  assert.equal(result.clicked, true);
  assert.equal(result.action, "input-mouse-click");
  assert.equal(result.inputClick, true);
  assert.equal(result.reconnecting, true);
  assert.equal(result.x, 110);
  assert.equal(result.y, 68);
  assert.equal(buttonClicks, 1);
  assert.equal(directReconnectCalls, 0);
  assert.deepEqual(
    sentEvents.map((event) => `${event.method}:${event.params.type || ""}`),
    [
      "Page.bringToFront:",
      "Input.dispatchMouseEvent:mouseMoved",
      "Input.dispatchMouseEvent:mousePressed",
      "Input.dispatchMouseEvent:mouseReleased",
    ],
  );
});

test("closeNonDefaultChats removes every non-default channel and focuses Default", async () => {
  const bot = new MinibiaTargetBot({});
  const defaultChannel = { id: 0, name: "Default" };
  const consoleChannel = { id: null, name: "Console" };
  const worldChannel = { id: 1, name: "World" };
  const tradeChannel = { id: 2, name: "Trade" };
  const closed = [];
  let activeChannel = tradeChannel;
  const channelManager = {
    channels: [defaultChannel, consoleChannel, worldChannel, tradeChannel],
    getChannelById(id) {
      return this.channels.find((channel) => channel.id === id) || null;
    },
    getChannel(name) {
      return this.channels.find((channel) => channel.name === name) || null;
    },
    getActiveChannel() {
      return activeChannel;
    },
    setActiveChannelElement(channel) {
      activeChannel = channel;
    },
    closeChannel(channel) {
      const index = this.channels.indexOf(channel);
      if (index === -1 || this.channels[index].id === 0) {
        return;
      }

      closed.push(this.channels[index].name);
      this.channels.splice(index, 1);

      if (!this.channels.includes(activeChannel)) {
        activeChannel = this.channels[Math.max(0, index - 1)] || null;
      }
    },
  };

  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            channelManager,
          },
        },
      });
    },
  };

  const result = await bot.closeNonDefaultChats();

  assert.equal(result.ok, true);
  assert.equal(result.closedCount, 3);
  assert.deepEqual(result.closedChannelNames, ["Console", "World", "Trade"]);
  assert.deepEqual(channelManager.channels.map((channel) => channel.name), ["Default"]);
  assert.equal(activeChannel?.name, "Default");
  assert.equal(result.activeChannelName, "Default");
});

test("refresh closes non-default chats only once after a fresh attach becomes ready", async () => {
  const bot = new MinibiaTargetBot({});
  const snapshots = [
    {
      ready: false,
      reason: "gameClient not ready",
      connection: {},
    },
    createModuleSnapshot({ connection: {} }),
    createModuleSnapshot({ connection: {} }),
  ];
  let cleanupCalls = 0;

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      if (expression.includes("closedChannelNames")) {
        cleanupCalls += 1;
        return {
          ok: true,
          closedCount: 2,
          closedChannelNames: ["Console", "World"],
          remainingChannelNames: ["Default"],
          activeChannelName: "Default",
        };
      }

      return snapshots.shift() || createModuleSnapshot({ connection: {} });
    },
  };
  bot.initialChatCleanupPending = true;
  bot.syncRouteCoordination = async () => {};
  bot.syncWaypointOverlay = async () => {};

  await bot.refresh({ emitSnapshot: false });
  assert.equal(cleanupCalls, 0);

  await bot.refresh({ emitSnapshot: false });
  assert.equal(cleanupCalls, 1);

  await bot.refresh({ emitSnapshot: false });
  assert.equal(cleanupCalls, 1);
  assert.equal(bot.initialChatCleanupPending, false);
});

test("running refresh throttles auxiliary dialogue, trade, and task inspection", async () => {
  const bot = new MinibiaTargetBot({});
  let now = 1_000;
  let dialogueCalls = 0;
  let tradeCalls = 0;
  let taskCalls = 0;

  bot.page = { id: "page-1", title: "Minibia" };
  bot.running = true;
  bot.getNow = () => now;
  bot.cdp = {
    async evaluate() {
      return createModuleSnapshot({ connection: {} });
    },
  };
  bot.inspectDialogueState = async () => {
    dialogueCalls += 1;
    return {
      open: false,
      recentMessages: [],
    };
  };
  bot.inspectTradeState = async () => {
    tradeCalls += 1;
    return {
      open: false,
      npcName: "",
      activeSide: "",
      selectedItem: null,
      buyItems: [],
      sellItems: [],
    };
  };
  bot.inspectTaskState = async () => {
    taskCalls += 1;
    return {
      open: false,
      activeTaskType: "",
      taskNpc: "",
      taskTarget: "",
      progressCurrent: null,
      progressRequired: null,
      rewardReady: false,
    };
  };
  bot.syncRouteCoordination = async () => null;
  bot.syncWaypointOverlay = async () => null;

  await bot.refresh({ emitSnapshot: false });
  assert.equal(dialogueCalls, 1);
  assert.equal(tradeCalls, 1);
  assert.equal(taskCalls, 1);

  now += 250;
  await bot.refresh({ emitSnapshot: false });
  assert.equal(dialogueCalls, 1);
  assert.equal(tradeCalls, 1);
  assert.equal(taskCalls, 1);

  now += 1_000;
  await bot.refresh({ emitSnapshot: false });
  assert.equal(dialogueCalls, 2);
  assert.equal(tradeCalls, 2);
  assert.equal(taskCalls, 2);
});

test("running refresh throttles route coordination sync writes", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 8, label: "Entry", type: "walk", radius: null },
    ],
  });
  let now = 10_000;
  let coordinationCalls = 0;

  bot.page = { id: "page-1", title: "Minibia" };
  bot.running = true;
  bot.getNow = () => now;
  bot.cdp = {
    async evaluate() {
      return createModuleSnapshot({ connection: {} });
    },
  };
  bot.inspectDialogueState = async () => ({ open: false, recentMessages: [] });
  bot.inspectTradeState = async () => ({
    open: false,
    npcName: "",
    activeSide: "",
    selectedItem: null,
    buyItems: [],
    sellItems: [],
  });
  bot.inspectTaskState = async () => ({
    open: false,
    activeTaskType: "",
    taskNpc: "",
    taskTarget: "",
    progressCurrent: null,
    progressRequired: null,
    rewardReady: false,
  });
  bot.routeCoordinationAdapter = {
    async sync() {
      coordinationCalls += 1;
      return {
        selfInstanceId: "self",
        members: [],
      };
    },
  };
  bot.syncWaypointOverlay = async () => null;

  await bot.refresh({ emitSnapshot: false });
  assert.equal(coordinationCalls, 1);

  now += 250;
  await bot.refresh({ emitSnapshot: false });
  assert.equal(coordinationCalls, 1);

  now += 800;
  await bot.refresh({ emitSnapshot: false });
  assert.equal(coordinationCalls, 2);
});

test("hidden waypoint overlay keys stay stable while the player moves", () => {
  const bot = new MinibiaTargetBot({
    showWaypointOverlay: false,
  });

  const first = bot.getWaypointOverlaySyncKey(createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
  }));
  const second = bot.getWaypointOverlaySyncKey(createModuleSnapshot({
    playerPosition: { x: 104, y: 103, z: 8 },
  }));

  assert.equal(first, second);
});

test("chooseHeal keeps healer rules top to bottom even inside healing priority", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerEmergencyHealthPercent: 35,
    healerRules: [
      {
        enabled: true,
        words: "exura gran san",
        minHealthPercent: 0,
        maxHealthPercent: 35,
        minMana: 50,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 35,
        minMana: 90,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal({
    ready: true,
    playerStats: {
      healthPercent: 24,
      mana: 160,
      manaPercent: 60,
    },
  });

  assert.equal(action?.ruleIndex, 0);
  assert.equal(action?.words, "exura gran san");
});

test("chooseHeal extends the most urgent active tier down to 0 percent HP", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 10,
        maxHealthPercent: 20,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura gran",
        minHealthPercent: 21,
        maxHealthPercent: 45,
        minMana: 50,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal({
    ready: true,
    playerStats: {
      healthPercent: 5,
      mana: 160,
      manaPercent: 60,
    },
  });

  assert.equal(action?.ruleIndex, 0);
  assert.equal(action?.words, "exura vita");
});

test("chooseHeal auto-fills uncovered gaps with the next healer tier above", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 20,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura gran",
        minHealthPercent: 30,
        maxHealthPercent: 50,
        minMana: 50,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal({
    ready: true,
    playerStats: {
      healthPercent: 25,
      mana: 160,
      manaPercent: 60,
    },
  });

  assert.equal(action?.ruleIndex, 1);
  assert.equal(action?.words, "exura gran");
});

test("chooseHeal turns heal friend rules into named exura sio casts for the visible partner", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    trainerEnabled: true,
    trainerPartnerName: "Knight Alpha",
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura sio",
        minHealthPercent: 0,
        maxHealthPercent: 65,
        minMana: 70,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerName: "Druid Beta",
    playerStats: {
      healthPercent: 82,
      mana: 220,
      manaPercent: 90,
    },
    visiblePlayers: [
      {
        id: 7,
        name: "Knight Alpha",
        healthPercent: 48,
        position: { x: 101, y: 100, z: 8 },
      },
    ],
  }), createVocationProfile({
    spells: [
      { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
      { id: 21, name: "Heal Friend", words: "exura sio", level: 7, mana: 70 },
    ],
  }));

  assert.equal(action?.type, "heal-friend");
  assert.equal(action?.words, 'exura sio "Knight Alpha"');
  assert.equal(action?.targetName, "Knight Alpha");
});

test("chooseHeal keeps self-heals ahead of heal friend rules during a self emergency", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    trainerEnabled: true,
    trainerPartnerName: "Knight Alpha",
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura sio",
        minHealthPercent: 0,
        maxHealthPercent: 80,
        minMana: 70,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 35,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerName: "Druid Beta",
    playerStats: {
      healthPercent: 24,
      mana: 220,
      manaPercent: 90,
    },
    visiblePlayers: [
      {
        id: 7,
        name: "Knight Alpha",
        healthPercent: 22,
        position: { x: 101, y: 100, z: 8 },
      },
    ],
  }), createVocationProfile({
    spells: [
      { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
      { id: 21, name: "Heal Friend", words: "exura sio", level: 7, mana: 70 },
    ],
  }));

  assert.equal(action?.type, "heal");
  assert.equal(action?.words, "exura vita");
});

test("chooseHeal resolves healing rune rules into consumable self-use actions", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "Ultimate Healing Rune",
        minHealthPercent: 0,
        maxHealthPercent: 35,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 18,
      mana: 220,
      manaPercent: 90,
    },
    containers: [
      {
        runtimeId: 1,
        name: "Backpack",
        slots: [
          { id: 2273, name: "Ultimate Healing Rune", count: 12 },
        ],
      },
    ],
  }));

  assert.equal(action?.type, "useItemOnSelf");
  assert.equal(action?.category, "rune");
  assert.equal(action?.name, "Ultimate Healing Rune");
});

test("chooseHeal resolves UH aliases and Minibia rune item ids without a Rune suffix", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "UH",
        minHealthPercent: 0,
        maxHealthPercent: 50,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 50,
      mana: 220,
      manaPercent: 90,
    },
    containers: [
      {
        runtimeId: 1,
        name: "Backpack",
        slots: [
          { id: 2273, name: "Ultimate Healing", count: 12 },
        ],
      },
    ],
  }));

  assert.equal(action?.type, "useItemOnSelf");
  assert.equal(action?.itemId, 2273);
  assert.equal(action?.category, "rune");
  assert.equal(action?.name, "Ultimate Healing Rune");
});

test("chooseHeal falls through to lower tiers when a higher rune tier has no usable action", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "Ultimate Healing Rune",
        minHealthPercent: 0,
        maxHealthPercent: 50,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura",
        minHealthPercent: 70,
        maxHealthPercent: 80,
        minMana: 20,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 43,
      mana: 220,
      manaPercent: 90,
    },
    containers: [],
  }));

  assert.equal(action?.type, "heal");
  assert.equal(action?.words, "exura");
  assert.equal(action?.ruleIndex, 1);
});

test("chooseHeal uses the default UH rune tier at fifty percent before potion healing", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    potionHealerEnabled: true,
    potionHealerRules: [
      {
        enabled: true,
        itemName: "Health Potion",
        minHealthPercent: 0,
        maxHealthPercent: 65,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const actions = bot.chooseHealActions(createModuleSnapshot({
    playerStats: {
      healthPercent: 50,
      mana: 220,
      manaPercent: 90,
    },
    containers: [
      {
        runtimeId: 1,
        name: "Backpack",
        slots: [
          { id: 2273, name: "Ultimate Healing", count: 12 },
          { id: 7618, name: "Health Potion", count: 8 },
        ],
      },
    ],
  }));

  assert.equal(actions[0]?.itemId, 2273);
  assert.equal(actions[0]?.category, "rune");
  assert.equal(actions[0]?.name, "Ultimate Healing Rune");
  assert.equal(actions[1]?.category, "potion");
  assert.equal(actions[1]?.name, "Health Potion");
});

test("chooseHeal preserves self-targeting for hotbar healing runes", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "Ultimate Healing Rune",
        minHealthPercent: 0,
        maxHealthPercent: 50,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 48,
      mana: 220,
      manaPercent: 90,
    },
    hotbar: {
      slotCount: 1,
      slots: [
        {
          index: 0,
          kind: "item",
          label: "Ultimate Healing Rune",
          itemId: 2273,
          hotkey: "F5",
          item: { id: 2273, name: "Ultimate Healing Rune", count: 3 },
          enabled: true,
        },
      ],
    },
    containers: [],
  }));

  assert.equal(action?.type, "useHotbarSlot");
  assert.equal(action?.target, "self");
  assert.equal(action?.category, "rune");
  assert.equal(action?.name, "Ultimate Healing Rune");
  assert.equal(action?.hotkey, "F5");
});

test("chooseHeal migrates the configured legacy rune hotkey into a healer tier", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [],
    healerRuneHotkey: "f5",
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 48,
      mana: 220,
      manaPercent: 90,
    },
    hotbar: {
      slotCount: 0,
      slots: [],
    },
    containers: [],
  }));

  assert.equal(action?.type, "useHotkey");
  assert.equal(action?.moduleKey, "healer");
  assert.equal(action?.ruleIndex, 0);
  assert.equal(action?.hotkey, "F5");
  assert.equal(action?.target, "self");
  assert.equal(action?.category, "rune");
  assert.equal(action?.name, "Ultimate Healing Rune");
});

test("chooseHeal prioritizes the migrated rune tier before covered spell tiers", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [
      {
        enabled: true,
        words: "exura",
        minHealthPercent: 70,
        maxHealthPercent: 80,
        minMana: 20,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
    healerRuneHotkey: "F5",
    healerRuneHealthPercent: 50,
  });

  const actions = bot.chooseHealActions(createModuleSnapshot({
    playerStats: {
      healthPercent: 43,
      mana: 220,
      manaPercent: 90,
    },
    containers: [],
  }));

  assert.equal(actions[0]?.type, "useHotkey");
  assert.equal(actions[0]?.moduleKey, "healer");
  assert.equal(actions[0]?.ruleIndex, 0);
  assert.equal(actions[0]?.hotkey, "F5");
  assert.equal(actions.length, 1);
});

test("chooseHeal inserts the configured legacy rune as a top tier before potion healing", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerRules: [],
    healerRuneName: "Ultimate Healing Rune",
    healerRuneHealthPercent: 35,
    potionHealerEnabled: true,
    potionHealerRules: [
      {
        enabled: true,
        itemName: "Health Potion",
        minHealthPercent: 0,
        maxHealthPercent: 40,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const actions = bot.chooseHealActions(createModuleSnapshot({
    playerStats: {
      healthPercent: 28,
      mana: 220,
      manaPercent: 90,
    },
    containers: [
      {
        runtimeId: 1,
        name: "Backpack",
        slots: [
          { id: 2273, name: "Ultimate Healing Rune", count: 12 },
          { id: 7618, name: "Health Potion", count: 8 },
        ],
      },
    ],
  }));

  assert.equal(actions[0]?.category, "rune");
  assert.equal(actions[0]?.name, "Ultimate Healing Rune");
  assert.equal(actions[1]?.category, "potion");
  assert.equal(actions[1]?.name, "Health Potion");
});

test("attemptHeal runs potion healer rules in order and falls through local potion cooldowns", async () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: false,
    potionHealerEnabled: true,
    potionHealerRules: [
      {
        enabled: true,
        itemName: "Supreme Health Potion",
        minHealthPercent: 0,
        maxHealthPercent: 40,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        itemName: "Ultimate Health Potion",
        minHealthPercent: 0,
        maxHealthPercent: 60,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const snapshot = createModuleSnapshot({
    playerStats: {
      healthPercent: 24,
      mana: 220,
      manaPercent: 90,
    },
    containers: [
      {
        runtimeId: 1,
        name: "Backpack",
        slots: [
          { id: 236, name: "Supreme Health Potion", count: 6 },
          { id: 237, name: "Ultimate Health Potion", count: 10 },
        ],
      },
    ],
  });
  const usedItems = [];

  bot.useItemOnSelf = async (action) => {
    usedItems.push(action?.name);
    if (usedItems.length === 1) {
      return { ok: false, reason: "cooldown", cooldownScope: "module" };
    }
    return { ok: true };
  };

  const chosen = bot.chooseHealActions(snapshot);
  const attempt = await bot.attemptHeal(snapshot);

  assert.deepEqual(chosen.map((action) => action?.name), [
    "Supreme Health Potion",
    "Ultimate Health Potion",
  ]);
  assert.deepEqual(usedItems, [
    "Supreme Health Potion",
    "Ultimate Health Potion",
  ]);
  assert.equal(attempt.action?.name, "Ultimate Health Potion");
  assert.equal(attempt.result?.ok, true);
});

test("chooseSustain yields to a live potion healer rule but keeps sustain fallback when no potion rule matches", () => {
  const vocationProfile = createVocationProfile({
    sustain: {
      potionPolicy: {
        emergencyHealthPercent: 20,
        healthThresholdPercent: 40,
        manaThresholdPercent: 25,
        preferredHealthPotionNames: ["Health Potion"],
        preferredManaPotionNames: ["Strong Mana Potion"],
      },
    },
  });
  const snapshot = createModuleSnapshot({
    playerStats: {
      healthPercent: 34,
      mana: 180,
      manaPercent: 80,
    },
    containers: [
      {
        runtimeId: 1,
        name: "Backpack",
        slots: [
          { id: 7618, name: "Health Potion", count: 8 },
        ],
      },
    ],
  });
  const botWithLivePotionRule = new MinibiaTargetBot({
    sustainEnabled: true,
    potionHealerEnabled: true,
    potionHealerRules: [
      {
        enabled: true,
        itemName: "Health Potion",
        minHealthPercent: 0,
        maxHealthPercent: 40,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });
  const botWithNoMatchingPotionRule = new MinibiaTargetBot({
    sustainEnabled: true,
    potionHealerEnabled: true,
    potionHealerRules: [
      {
        enabled: true,
        itemName: "Health Potion",
        minHealthPercent: 0,
        maxHealthPercent: 20,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  assert.equal(botWithLivePotionRule.chooseSustainAction(snapshot, vocationProfile), null);

  const sustainFallback = botWithNoMatchingPotionRule.chooseSustainAction(snapshot, vocationProfile);
  assert.equal(sustainFallback?.moduleKey, "sustain");
  assert.equal(sustainFallback?.name, "Health Potion");
});

test("chooseHeal turns a detectable poison state into a condition-heal cast", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: false,
    conditionHealerEnabled: true,
    conditionHealerRules: [
      {
        enabled: true,
        condition: "poisoned",
        words: "exana pox",
        minHealthPercent: 0,
        maxHealthPercent: 100,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 76,
      mana: 120,
      manaPercent: 55,
    },
    hasPoisonCondition: true,
  }), createVocationProfile({
    spells: [
      { id: 31, name: "Antidote", words: "exana pox", level: 10, mana: 30 },
    ],
    sustain: {
      supportSpells: {
        antidote: { id: 31, name: "Antidote", words: "exana pox", level: 10, mana: 30 },
      },
    },
  }));

  assert.equal(action?.type, "condition-heal");
  assert.equal(action?.words, "exana pox");
  assert.equal(action?.condition, "poisoned");
});

test("chooseHeal renews magic shield when the detectable support condition is missing", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: false,
    conditionHealerEnabled: true,
    conditionHealerRules: [
      {
        enabled: true,
        condition: "magic-shield-missing",
        words: "utamo vita",
        minHealthPercent: 0,
        maxHealthPercent: 100,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerStats: {
      healthPercent: 82,
      mana: 180,
      manaPercent: 85,
    },
    hasMagicShieldCondition: false,
  }), createVocationProfile({
    spells: [
      { id: 41, name: "Magic Shield", words: "utamo vita", level: 14, mana: 50 },
    ],
    sustain: {
      supportSpells: {
        magicShield: { id: 41, name: "Magic Shield", words: "utamo vita", level: 14, mana: 50 },
      },
    },
  }));

  assert.equal(action?.type, "condition-heal");
  assert.equal(action?.words, "utamo vita");
  assert.equal(action?.condition, "magic-shield-missing");
});

test("chooseHeal keeps self-emergency ahead of condition renewals and heal friend support", () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    trainerEnabled: true,
    trainerPartnerName: "Knight Alpha",
    conditionHealerEnabled: true,
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura sio",
        minHealthPercent: 0,
        maxHealthPercent: 80,
        minMana: 70,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 35,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
    conditionHealerRules: [
      {
        enabled: true,
        condition: "magic-shield-missing",
        words: "utamo vita",
        minHealthPercent: 0,
        maxHealthPercent: 100,
        minMana: 0,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const action = bot.chooseHeal(createModuleSnapshot({
    playerName: "Druid Beta",
    playerStats: {
      healthPercent: 20,
      mana: 220,
      manaPercent: 90,
    },
    hasMagicShieldCondition: false,
    visiblePlayers: [
      {
        id: 7,
        name: "Knight Alpha",
        healthPercent: 22,
        position: { x: 101, y: 100, z: 8 },
      },
    ],
  }), createVocationProfile({
    spells: [
      { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
      { id: 21, name: "Heal Friend", words: "exura sio", level: 7, mana: 70 },
      { id: 41, name: "Magic Shield", words: "utamo vita", level: 14, mana: 50 },
    ],
    sustain: {
      supportSpells: {
        magicShield: { id: 41, name: "Magic Shield", words: "utamo vita", level: 14, mana: 50 },
      },
    },
  }));

  assert.equal(action?.type, "heal");
  assert.equal(action?.words, "exura vita");
});

test("tick retries the same emergency heal on the next cycle after a global cooldown failure", async () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 30,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerStats: {
      healthPercent: 24,
      mana: 160,
      manaPercent: 60,
    },
    candidates: [],
  };
  const evaluations = [];

  bot.refresh = async () => {
    bot.lastSnapshot = snapshot;
    return snapshot;
  };
  bot.cdp = {
    async evaluate(expression) {
      evaluations.push(expression);
      return evaluations.length === 1
        ? { ok: false, reason: "cooldown", cooldownScope: "global" }
        : { ok: true, words: "exura vita" };
    },
  };
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  await bot.tick();
  assert.equal(bot.getLastModuleActionAt("healer", 0), 0);

  await bot.tick();
  assert.equal(evaluations.length, 2);
  assert.equal(bot.getLastModuleActionAt("healer", 0) > 0, true);
});

test("tick falls through to the next heal tier when the top heal fails requirements", async () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 30,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
      {
        enabled: true,
        words: "exura gran",
        minHealthPercent: 0,
        maxHealthPercent: 30,
        minMana: 50,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerStats: {
      healthPercent: 18,
      mana: 160,
      manaPercent: 60,
    },
    candidates: [],
  };
  const evaluations = [];

  bot.refresh = async () => {
    bot.lastSnapshot = snapshot;
    return snapshot;
  };
  bot.cdp = {
    async evaluate(expression) {
      evaluations.push(expression);
      if (expression.includes("\"exura vita\"")) {
        return { ok: false, reason: "requirements" };
      }
      if (expression.includes("\"exura gran\"")) {
        return { ok: true, words: "exura gran" };
      }
      return { ok: false, reason: "unexpected expression" };
    },
  };
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(evaluations.length, 2);
  assert.match(evaluations[0], /exura vita/);
  assert.match(evaluations[1], /exura gran/);
  assert.equal(bot.getLastModuleActionAt("healer", 0), 0);
  assert.equal(bot.getLastModuleActionAt("healer", 1) > 0, true);
});

test("tick lets the healer tier stack run before vocation sustain during healing priority", async () => {
  const bot = new MinibiaTargetBot({
    vocation: "paladin",
    deathHealEnabled: false,
    sustainEnabled: true,
    healerEnabled: true,
  });
  const snapshot = createModuleSnapshot({
    playerStats: {
      healthPercent: 18,
      mana: 160,
      manaPercent: 80,
    },
  });
  const vocationProfile = createVocationProfile({
    sustain: {
      potionPolicy: {
        emergencyHealthPercent: 20,
        healthThresholdPercent: 35,
        manaThresholdPercent: 25,
        preferredHealthPotionNames: ["Health Potion"],
        preferredManaPotionNames: ["Strong Mana Potion"],
      },
    },
  });
  let healCalled = false;

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.getActiveVocationProfile = async (receivedSnapshot) => {
    assert.equal(receivedSnapshot, snapshot);
    return vocationProfile;
  };
  bot.attemptSustain = async (receivedSnapshot, receivedProfile) => {
    assert.equal(receivedSnapshot, snapshot);
    assert.equal(receivedProfile, vocationProfile);
    return {
      action: {
        type: "useHotbarSlot",
      },
      result: {
        ok: true,
      },
    };
  };
  bot.attemptHeal = async () => {
    healCalled = true;
    return { action: null, result: null };
  };

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(healCalled, true);
});

test("attemptSustain records module cooldown after a successful consumable action", async () => {
  const bot = new MinibiaTargetBot({
    sustainEnabled: true,
  });
  const snapshot = {
    ready: true,
    playerStats: {
      healthPercent: 92,
      manaPercent: 18,
    },
    containers: [
      {
        runtimeId: 22,
        name: "Backpack",
        slots: [
          { id: 237, name: "Strong Mana Potion", count: 12 },
        ],
      },
    ],
  };
  const vocationProfile = createVocationProfile({
    sustain: {
      potionPolicy: {
        emergencyHealthPercent: 20,
        healthThresholdPercent: 40,
        manaThresholdPercent: 30,
        preferredHealthPotionNames: ["Health Potion"],
        preferredManaPotionNames: ["Strong Mana Potion"],
      },
    },
  });

  bot.useItemOnSelf = async () => ({
    ok: true,
    transport: "useOnCreature",
  });

  const sustainAttempt = await bot.attemptSustain(snapshot, vocationProfile);

  assert.equal(sustainAttempt.result?.ok, true);
  assert.equal(bot.getLastModuleActionAt("sustain") > 0, true);
  assert.equal(bot.chooseSustainAction(snapshot, vocationProfile), null);
});

test("tick uses the active vocation profile for looting before route movement", async () => {
  const bot = new MinibiaTargetBot({
    vocation: "paladin",
    lootingEnabled: true,
  });
  const snapshot = createModuleSnapshot();
  const vocationProfile = createVocationProfile({
    looting: {
      priorities: ["gold", "ammo"],
    },
  });
  let routeCalled = false;

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.getActiveVocationProfile = async () => vocationProfile;
  bot.attemptSustain = async () => ({ action: null, result: null });
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.handleRookiller = async () => ({ handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptLoot = async (receivedSnapshot, receivedProfile) => {
    assert.equal(receivedSnapshot, snapshot);
    assert.equal(receivedProfile, vocationProfile);
    return {
      action: {
        type: "moveInventoryItem",
      },
      result: {
        ok: true,
      },
    };
  };
  bot.chooseRouteAction = () => {
    routeCalled = true;
    return { kind: "walk" };
  };

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(routeCalled, false);
});

test("tick regroups follow chain before looting when combat is clear", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    lootingEnabled: true,
  });
  const snapshot = createModuleSnapshot({
    playerName: "Scout Beta",
  });
  const vocationProfile = createVocationProfile();
  let lootCalled = false;
  let followCalled = false;

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.getActiveVocationProfile = async () => vocationProfile;
  bot.attemptSustain = async () => ({ action: null, result: null });
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.attemptTrainerEscape = async () => ({ action: null, result: null });
  bot.handleRookiller = async () => ({ handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.attemptAutoEat = async () => ({ action: null, result: null });
  bot.attemptEquipmentAutoReplace = async () => ({ action: null, result: null });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptRefill = async () => ({ action: null, result: null });
  bot.chooseFollowTrainSuspendAction = () => null;
  bot.chooseFollowTrainAction = () => ({
    kind: "follow-train-walk",
    destination: { x: 101, y: 100, z: 8 },
    progressKey: "101,100,8",
    targetName: "Knight Alpha",
    reason: "regroup",
    origin: snapshot.playerPosition,
  });
  bot.executeFollowTrainAction = async () => {
    followCalled = true;
    return { ok: true };
  };
  bot.attemptLoot = async () => {
    lootCalled = true;
    return { action: null, result: null };
  };
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(followCalled, true);
  assert.equal(lootCalled, false);
});

test("normalizeOptions normalizes tile rules into the route state", () => {
  const options = normalizeOptions({
    tileRules: [
      { x: 100, y: 200, z: 7, policy: "avoid", trigger: "approach" },
      { x: 101, y: 201, z: 7, label: "Wait", policy: "wait", trigger: "enter", waitMs: 1600, cooldownMs: 400 },
      { x: "bad", y: 0, z: 0, policy: "avoid" },
    ],
  });

  assert.equal(options.tileRules.length, 2);
  assert.deepEqual(options.tileRules[0], {
    id: "tile-rule-001-avoid-approach-100-200-7",
    enabled: true,
    label: "Tile Rule 001",
    shape: "tile",
    x: 100,
    y: 200,
    z: 7,
    width: 1,
    height: 1,
    scope: { mode: "all" },
    trigger: "approach",
    policy: "avoid",
    priority: 100,
    exactness: "exact",
    vicinityRadius: 0,
    waitMs: 0,
    cooldownMs: 0,
    note: "",
  });
});

test("normalizeOptions preserves helper waypoints in the route state", () => {
  const options = normalizeOptions({
    waypoints: [
      { x: 100, y: 200, z: 7, type: "helper" },
    ],
  });

  assert.equal(options.waypoints.length, 1);
  assert.deepEqual(options.waypoints[0], {
    x: 100,
    y: 200,
    z: 7,
    label: "Waypoint 001",
    type: "helper",
    radius: null,
  });
});

test("syncWaypointOverlay skips redundant overlay renders until the tracked route state changes", async () => {
  const bot = new MinibiaTargetBot({
    showWaypointOverlay: true,
    waypoints: [
      { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
      { x: 101, y: 200, z: 7, label: "Pull", type: "walk" },
    ],
  });

  let evaluateCount = 0;
  bot.cdp = {
    async evaluate() {
      evaluateCount += 1;
      return { ok: true };
    },
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
  };

  await bot.syncWaypointOverlay(snapshot);
  await bot.syncWaypointOverlay(snapshot);
  assert.equal(evaluateCount, 1);

  await bot.syncWaypointOverlay({
    ...snapshot,
    playerPosition: { x: 101, y: 200, z: 7 },
  });
  assert.equal(evaluateCount, 2);
});

test("syncWaypointOverlay injects a creature-aware ground-layer overlay instead of an always-on-top viewport mask", async () => {
  const bot = new MinibiaTargetBot({
    showWaypointOverlay: true,
    waypoints: [
      { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
      { x: 100, y: 200, z: 7, label: "Pull", type: "action" },
      { x: 101, y: 201, z: 7, type: "walk" },
    ],
    tileRules: [
      { x: 101, y: 200, z: 7, policy: "avoid", trigger: "approach" },
    ],
  });

  let expression = "";
  bot.cdp = {
    async evaluate(code) {
      expression = String(code);
      return { ok: true };
    },
  };

  await bot.syncWaypointOverlay({
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
  });

  assert.match(expression, /activeCreatures/);
  assert.match(expression, /destination-out/);
  assert.match(expression, /screen\.nextSibling/);
  assert.match(expression, /"label":"Entry"/);
  assert.match(expression, /"tinyLabel":"WP"/);
  assert.match(expression, /stackCount/);
  assert.match(expression, /stepTexts/);
  assert.match(expression, /displayLabel/);
  assert.match(expression, /buildStepBadgeLayout/);
  assert.match(expression, /STEP_TINT_PALETTE/);
  assert.match(expression, /getStepTintSequence/);
  assert.match(expression, /stepLayout\.forEach/);
  assert.doesNotMatch(expression, /stackText/);
  assert.doesNotMatch(expression, /drawCapsule/);
  assert.match(expression, /occupiedTileHash/);
  assert.doesNotMatch(expression, /occupiedTileKeys\]\.sort\(\)\.join/);
  assert.doesNotMatch(expression, /2147483646/);
});

test("syncWaypointOverlay suppresses route highlight previews while route reset is returning", async () => {
  const bot = new MinibiaTargetBot({
    showWaypointOverlay: true,
    waypoints: [
      { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
      { x: 101, y: 200, z: 7, label: "Pull", type: "walk" },
    ],
  });

  let expression = "";
  bot.routeResetState = {
    targetIndex: 0,
    phase: "returning",
    pathIndices: [1, 0],
    pathStep: 0,
    alerted: false,
  };
  bot.routeIndex = 1;
  bot.cdp = {
    async evaluate(code) {
      expression = String(code);
      return { ok: true };
    },
  };

  await bot.syncWaypointOverlay({
    ready: true,
    playerPosition: { x: 101, y: 200, z: 7 },
  });

  assert.match(expression, /"suppressRouteHighlights":true/);
});

test("syncWaypointOverlay serializes lap and stuck telemetry for the top-right counter", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    showWaypointOverlay: true,
    walkRepathMs: 600,
    waypoints: [
      { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
      { x: 101, y: 200, z: 7, label: "Pull", type: "walk" },
    ],
  });

  let expression = "";
  bot.running = true;
  bot.routeIndex = 1;
  bot.routeLapCount = 2;
  bot.routeKillCount = 3;
  bot.routeLootGoldValue = 203;
  bot.routeLootItems = new Map([
    ["ham", { name: "ham", displayName: "Ham", count: 2 }],
    ["mace", { name: "mace", displayName: "Mace", count: 1 }],
  ]);
  bot.getNow = () => 1700;
  bot.setLastWalkAttempt("101,200,7", { x: 100, y: 200, z: 7 }, {
    now: 1000,
    pendingProgress: true,
  });
  bot.cdp = {
    async evaluate(code) {
      expression = String(code);
      return { ok: true };
    },
  };

  await bot.syncWaypointOverlay({
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.match(expression, /"routeTelemetry":\{"lapCount":2,"killCount":3,"lootGoldValue":203,"lootLine":"203 \| Ham x2 \| Mace","stuck":true,"stuckWaypointIndex":1,"stuckReason":"stalled"\}/);
  assert.match(expression, /KILLS/);
  assert.match(expression, /LOOT /);
  assert.match(expression, /STUCK /);
});

test("clearWaypointOverlay tears down animation frames and resize observers", async () => {
  const bot = new MinibiaTargetBot({});
  let expression = "";
  bot.cdp = {
    async evaluate(code) {
      expression = String(code);
      return { ok: true };
    },
  };

  await bot.clearWaypointOverlay();

  assert.match(expression, /cancelAnimationFrame/);
  assert.match(expression, /resizeObserver/);
  assert.match(expression, /removeViewportResizeListener/);
});

test("route telemetry counts completed laps, marks blocked stalls, and resets on route reset", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.running = true;
  bot.advanceWaypoint("reached");
  bot.advanceWaypoint("reached");
  bot.advanceWaypoint("reached");
  assert.equal(bot.routeLapCount, 1);

  bot.options.autowalkLoop = false;
  bot.routeIndex = 0;
  bot.beginBlockedWaypointRecoveryCycle("100,100,8");
  const telemetry = bot.refreshRouteTelemetry({
    ready: true,
    playerPosition: { x: 95, y: 95, z: 8 },
    isMoving: false,
    pathfinderAutoWalking: false,
  }, 2000);
  assert.deepEqual(telemetry, {
    lapCount: 1,
    killCount: 0,
    lootGoldValue: 0,
    lootLine: "none",
    lootSignature: "0",
    stuck: true,
    stuckWaypointIndex: 0,
    stuckReason: "blocked",
  });

  bot.resetRoute(1);
  assert.equal(bot.routeLapCount, 0);
  assert.equal(bot.routeStallState, null);
});

test("route telemetry counts laps when route loops back to waypoint one before the physical tail", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "action", action: "goto", targetIndex: 0 },
      { x: 103, y: 100, z: 8, type: "helper" },
    ],
  });

  bot.running = true;
  bot.jumpWaypoint(0, "jump");
  assert.equal(bot.routeLapCount, 0);

  bot.routeIndex = 2;
  bot.jumpWaypoint(0, "jump");
  assert.equal(bot.routeLapCount, 1);
});

test("chooseRouteAction resolves goto action targets by waypoint label", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk", label: "Hunt Start" },
      { x: 101, y: 100, z: 8, type: "action", action: "goto", targetLabel: "Hunt Start" },
    ],
  });

  bot.resetRoute(1);
  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.options.waypoints[1].targetLabel, "Hunt Start");
  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.equal(action?.waypoint?.label, "Hunt Start");
});

test("parseLootMessageText extracts gold value and item entries from loot chat lines", () => {
  assert.deepEqual(
    parseLootMessageText("Loot of a larva: 3 gold coins, 2 platinum coins, a ham and a mace."),
    {
      creatureName: "a larva",
      killCount: 1,
      goldValue: 203,
      items: [
        { count: 1, name: "ham", displayName: "Ham" },
        { count: 1, name: "mace", displayName: "Mace" },
      ],
    },
  );

  assert.deepEqual(
    parseLootMessageText("Loot of a larva: nothing (due to low stamina)."),
    {
      creatureName: "a larva",
      killCount: 1,
      goldValue: 0,
      items: [],
    },
  );

  assert.deepEqual(
    parseLootMessageText("Loot of a scarab: 12 gold coins, 2 emeralds and 3 small amethysts."),
    {
      creatureName: "a scarab",
      killCount: 1,
      goldValue: 12,
      items: [
        { count: 2, name: "emerald", displayName: "Emerald" },
        { count: 3, name: "small amethyst", displayName: "Small Amethyst" },
      ],
    },
  );
});

test("syncRouteLootTelemetry counts only appended loot messages from the default-channel tail", () => {
  const bot = new MinibiaTargetBot({});
  bot.running = true;

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { id: "m1", text: "Loot of a larva: nothing." },
      ],
    },
  });

  let telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 0);
  assert.equal(telemetry.lootGoldValue, 0);
  assert.equal(telemetry.lootLine, "none");

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { id: "m1", text: "Loot of a larva: nothing." },
        { id: "m2", text: "Loot of a larva: 3 gold coins, 2 platinum coins, a ham." },
      ],
    },
  });

  telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 1);
  assert.equal(telemetry.lootGoldValue, 203);
  assert.equal(telemetry.lootLine, "203 | Ham");

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { id: "m1", text: "Loot of a larva: nothing." },
        { id: "m2", text: "Loot of a larva: 3 gold coins, 2 platinum coins, a ham." },
      ],
    },
  });

  telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 1);
  assert.equal(telemetry.lootGoldValue, 203);
  assert.equal(telemetry.lootLine, "203 | Ham");
});

test("syncRouteLootTelemetry tolerates sliding chat tails without stable message ids", () => {
  const bot = new MinibiaTargetBot({});
  bot.running = true;

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { speaker: "System", text: "Using one of 2 mana potions." },
        { speaker: "Loot", text: "Loot of a larva: nothing." },
      ],
    },
  });

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { speaker: "Loot", text: "Loot of a larva: nothing." },
        { speaker: "Loot", text: "Loot of a larva: 3 gold coins and a ham." },
      ],
    },
  });

  const telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 1);
  assert.equal(telemetry.lootGoldValue, 3);
  assert.equal(telemetry.lootLine, "3 | Ham");
});

test("syncRouteLootTelemetry reads live server-message entries before chat history", () => {
  const bot = new MinibiaTargetBot({});
  bot.running = true;

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { id: "chat-1", text: "Loot of a larva: nothing." },
      ],
    },
    serverMessages: [
      { key: "server:1", text: "Loot of a larva: nothing." },
    ],
  });

  bot.syncRouteLootTelemetry({
    dialogue: {
      recentMessages: [
        { id: "chat-1", text: "Loot of a larva: nothing." },
        { id: "chat-2", text: "Loot of a larva: 99 gold coins." },
      ],
    },
    serverMessages: [
      { key: "server:1", text: "Loot of a larva: nothing." },
      { key: "server:2", text: "Loot of a larva: 16 gold coin and a ham." },
    ],
  });

  const telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 1);
  assert.equal(telemetry.lootGoldValue, 16);
  assert.equal(telemetry.lootLine, "16 | Ham");
});

test("syncRouteLootTelemetry counts repeated identical loot server messages with unique keys", () => {
  const bot = new MinibiaTargetBot({});
  bot.running = true;

  bot.syncRouteLootTelemetry({
    serverMessages: [],
  });

  bot.syncRouteLootTelemetry({
    serverMessages: [
      { key: "server:1", text: "Loot of a larva: 3 gold coins." },
      { key: "server:2", text: "Loot of a larva: 3 gold coins." },
    ],
  });

  const telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 2);
  assert.equal(telemetry.lootGoldValue, 6);
  assert.equal(telemetry.lootLine, "6");
});

test("route telemetry merges opened corpse, picked loot, and loot chat without double-counting", () => {
  const bot = new MinibiaTargetBot({});
  bot.running = true;

  bot.syncRouteLootTelemetry({
    serverMessages: [],
  });

  bot.noteRouteLootKill({
    moduleKey: "looting",
    position: { x: 100, y: 200, z: 7 },
  }, { ok: true });
  bot.noteRouteLootAction({
    moduleKey: "looting",
    name: "Gold Coin",
    count: 12,
  }, {
    ok: true,
    name: "Gold Coin",
    count: 12,
  });

  bot.syncRouteLootTelemetry({
    serverMessages: [
      { key: "server:1", text: "Loot of a larva: 12 gold coins and an emerald." },
    ],
  });

  const telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 1);
  assert.equal(telemetry.lootGoldValue, 12);
  assert.equal(telemetry.lootLine, "12 | Emerald");
});

test("looting actions update route telemetry from opened corpses and picked items", async () => {
  const bot = new MinibiaTargetBot({});
  bot.running = true;
  bot.cdp = {
    isOpen() {
      return true;
    },
    async evaluate() {
      return { ok: true };
    },
  };

  let moveResult = { ok: true, name: "Gold Coin", count: 24 };
  bot.cdp.evaluate = async () => moveResult;

  await bot.openContainer({
    moduleKey: "looting",
    position: { x: 100, y: 200, z: 7 },
    name: "Dead Larva",
  });
  await bot.moveInventoryItem({
    moduleKey: "looting",
    from: { location: "container", slotIndex: 0, containerRuntimeId: 1 },
    to: { location: "container", slotIndex: 1, containerRuntimeId: 2 },
  });

  moveResult = { ok: true, name: "Ham", count: 2 };
  await bot.moveInventoryItem({
    moduleKey: "looting",
    from: { location: "container", slotIndex: 0, containerRuntimeId: 1 },
    to: { location: "container", slotIndex: 1, containerRuntimeId: 2 },
  });

  const telemetry = bot.refreshRouteTelemetry({ ready: false }, 0);
  assert.equal(telemetry.killCount, 1);
  assert.equal(telemetry.lootGoldValue, 24);
  assert.equal(telemetry.lootLine, "24 | Ham x2");
});

function createConvertBot() {
  return new MinibiaTargetBot({
    autoConvertEnabled: true,
    autoConvertRules: [
      {
        enabled: true,
        label: "coins",
        requireNoTargets: true,
        requireStationary: true,
        cooldownMs: 900,
      },
    ],
  });
}

function createGreatFireballRune(count = 1) {
  return {
    id: GREAT_FIREBALL_RUNE_ID,
    name: GREAT_FIREBALL_RUNE_NAME,
    count,
  };
}

function createEquipment() {
  const equipment = {
    BACKGROUNDS: [
      "./png/head.png",
      "./png/armor.png",
      "./png/legs.png",
      "./png/boots.png",
      "./png/right.png",
      "./png/left.png",
      "./png/backpack.png",
      "./png/shoulder.png",
      "./png/ring.png",
      "./png/quiver.png",
    ],
    slots: Array.from({ length: 10 }, () => ({ item: null })),
    getSlotItem(index) {
      return this.slots[index]?.item || null;
    },
  };
  equipment.slots[6].item = { id: MAIN_BACKPACK_ID, count: 1 };
  return equipment;
}

function createContainer(items, id = MAIN_BACKPACK_ID, runtimeId = 1) {
  return {
    id,
    __containerId: runtimeId,
    count: 0,
    size: Math.max(items.length, 20),
    slots: items.map((item) => ({ item })),
    getSlotItem(index) {
      return this.slots[index]?.item || null;
    },
  };
}

function getItemId(item) {
  const itemId = Number(item?.id ?? item?.itemId ?? item?.clientId ?? item?.serverId);
  return Number.isFinite(itemId) ? itemId : null;
}

function getItemCount(item) {
  return Math.max(1, Math.trunc(Number(item?.count) || 0));
}

function moveItem(from, to, count) {
  const fromSlot = from.which?.slots?.[from.index];
  const toSlot = to.which?.slots?.[to.index];
  const sourceItem = from.which?.getSlotItem?.(from.index) || fromSlot?.item || null;

  assert.ok(fromSlot, "missing move source slot");
  assert.ok(toSlot, "missing move destination slot");
  assert.ok(sourceItem, "missing move source item");

  const sourceId = getItemId(sourceItem);
  const sourceCount = getItemCount(sourceItem);
  const moveCount = Math.min(Math.max(1, Math.trunc(Number(count) || 0)), sourceCount);
  const targetItem = to.which?.getSlotItem?.(to.index) || toSlot.item || null;
  const acceptedCount = targetItem
    ? Math.min(moveCount, Math.max(0, 100 - getItemCount(targetItem)))
    : moveCount;

  if (targetItem) {
    assert.equal(getItemId(targetItem), sourceId, "move target item mismatch");
    if (acceptedCount > 0) {
      targetItem.count = getItemCount(targetItem) + acceptedCount;
    }
  } else {
    toSlot.item = { ...sourceItem, count: acceptedCount };
  }

  if (acceptedCount <= 0) {
    return;
  }

  if (sourceCount === acceptedCount) {
    fromSlot.item = null;
  } else {
    sourceItem.count = sourceCount - acceptedCount;
  }
}

function rememberContainerValueSlot(bot, runtimeId = 1, slotIndex = VALUE_SLOT_INDEX) {
  bot.lastSnapshot = {
    currency: {
      valueSlotKind: "container",
      valueSlotIndex: slotIndex,
      valueContainerRuntimeId: runtimeId,
    },
  };
}

function rememberEquipmentValueSlot(bot, slotIndex = QUIVER_SLOT_INDEX) {
  bot.lastSnapshot = {
    currency: {
      valueSlotKind: "equipment",
      valueSlotIndex: slotIndex,
      valueContainerRuntimeId: null,
    },
  };
}

function stubAttachedValueSlotRefresh(bot, {
  equipment,
  containers,
  valueSlotKind,
  valueSlotIndex,
  valueContainerRuntimeId = null,
}) {
  bot.page = { targetId: 1 };
  bot.refresh = async () => {
    const valueContainer = valueSlotKind === "container"
      ? containers.find((container) => Number(container?.__containerId) === Number(valueContainerRuntimeId)) || containers[0] || null
      : null;
    const valueItem = valueSlotKind === "equipment"
      ? equipment.getSlotItem(valueSlotIndex)
      : valueContainer?.getSlotItem(valueSlotIndex) || null;
    const hasOpenBackpackPlatinumStack = containers.some((container) => {
      for (let slotIndex = 0; slotIndex < container.slots.length; slotIndex += 1) {
        if (valueSlotKind === "container" && container === valueContainer && slotIndex === valueSlotIndex) continue;
        const item = container.getSlotItem(slotIndex);
        if (getItemId(item) === 3035 && getItemCount(item) > 0) return true;
      }
      return false;
    });
    const quiverItem = equipment.getSlotItem(QUIVER_SLOT_INDEX);
    const hasLegacyCurrencySlotPlatinumStack = !(
      valueSlotKind === "equipment" && valueSlotIndex === QUIVER_SLOT_INDEX
    ) && getItemId(quiverItem) === 3035 && getItemCount(quiverItem) > 0;
    const snapshot = {
      ready: true,
      page: bot.page,
      currency: {
        valueSlotKind,
        valueSlotIndex,
        valueContainerRuntimeId: valueSlotKind === "container" ? valueContainerRuntimeId : null,
        valueSlotItemId: getItemId(valueItem),
        valueSlotCount: valueItem ? getItemCount(valueItem) : 0,
        needsValueSlotRepair: hasOpenBackpackPlatinumStack || hasLegacyCurrencySlotPlatinumStack,
      },
    };
    bot.lastSnapshot = snapshot;
    return snapshot;
  };
}

test("chooseUrgentConvert ignores non-full value-slot signals without backpack coins", () => {
  const bot = createConvertBot();

  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: false,
      hasFullPlatinumStack: false,
      hasFullPlatinumPlaceholderStack: false,
      canStackPlatinumPlaceholder: true,
    },
  });

  assert.equal(action, null);
});

test("chooseUrgentConvert requests platinum conversion from a full platinum value-slot stack", () => {
  const bot = createConvertBot();

  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: false,
      hasFullPlatinumStack: false,
      hasFullPlatinumPlaceholderStack: true,
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "platinum-overflow");
});

test("chooseUrgentConvert ignores open backpack platinum without a full overflow stack", () => {
  const bot = createConvertBot();

  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: false,
      hasFullPlatinumStack: false,
      hasFullPlatinumValueSlotStack: false,
      hasOpenBackpackPlatinumStack: true,
      canStackPlatinumValueSlot: true,
    },
  });

  assert.equal(action, null);
});

test("chooseUrgentValueSlotRepair flags misplaced value coins even without a full stack", () => {
  const bot = createConvertBot();

  const action = bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "value-slot-repair");
});

test("chooseUrgentValueSlotRepair waits for combat or active movement, but may preempt queued autowalk", () => {
  const bot = createConvertBot();

  assert.equal(bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
    },
    visibleCreatures: [{ id: 10, name: "Larva" }],
    isMoving: false,
    pathfinderAutoWalking: false,
  }), null);

  const queuedAutowalkAction = bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
    },
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: true,
  });

  assert.equal(queuedAutowalkAction?.urgent, true);
  assert.equal(queuedAutowalkAction?.reason, "value-slot-repair");

  assert.equal(bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
    },
    visibleCreatures: [],
    isMoving: true,
    pathfinderAutoWalking: true,
  }), null);
});

test("chooseUrgentValueSlotRepair can still run during combat or movement when the auto-convert rule allows it", () => {
  const bot = new MinibiaTargetBot({
    autoConvertEnabled: true,
    autoConvertRules: [
      {
        enabled: true,
        label: "coins",
        requireNoTargets: false,
        requireStationary: false,
        cooldownMs: 60_000,
      },
    ],
  });

  const action = bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
    },
    visibleCreatures: [{ id: 10, name: "Larva" }],
    isMoving: true,
    pathfinderAutoWalking: true,
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "value-slot-repair");
});

test("chooseUrgentValueSlotRepair backs off the same failed repair signature for 15 seconds", () => {
  const bot = createConvertBot();
  let now = 10_000;
  bot.getNow = () => now;
  bot.rememberFailedValueSlotRepair({
    currency: {
      repairSignature: "equipment:9::nonex0::plain::container:202:1:3035x64|container:202:2:3035x64",
    },
  }, { at: now });

  now += 1_000;
  assert.equal(bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::nonex0::plain::container:202:1:3035x64|container:202:2:3035x64",
    },
  }), null);

  now += 15_001;
  const action = bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::nonex0::plain::container:202:1:3035x64|container:202:2:3035x64",
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "value-slot-repair");
});

test("chooseUrgentValueSlotRepair resumes immediately when the repair signature changes", () => {
  const bot = createConvertBot();
  let now = 10_000;
  bot.getNow = () => now;
  bot.rememberFailedValueSlotRepair({
    currency: {
      repairSignature: "equipment:9::nonex0::plain::container:202:1:3035x64|container:202:2:3035x64",
    },
  }, { at: now });

  now += 1_000;
  const action = bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::3035x64::plain::equipment:9:3035x64|container:202:2:3035x64",
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "value-slot-repair");
});

test("chooseUrgentConvert backs off the same failed gold overflow signature for a short window", () => {
  const bot = createConvertBot();
  let now = 10_000;
  bot.getNow = () => now;
  bot.rememberFailedUrgentConvert({
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  }, {
    reason: "gold-overflow",
    at: now,
  });

  now += 1_000;
  assert.equal(bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  }), null);

  now += 5_001;
  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "gold-overflow");
});

test("chooseUrgentConvert resumes immediately when the gold overflow signature changes", () => {
  const bot = createConvertBot();
  let now = 10_000;
  bot.getNow = () => now;
  bot.rememberFailedUrgentConvert({
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  }, {
    reason: "gold-overflow",
    at: now,
  });

  now += 1_000;
  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:2:3031x100|container:101:4:3031x87",
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "gold-overflow");
});

test("chooseUrgentConvert resumes immediately when the overflow reason changes", () => {
  const bot = createConvertBot();
  let now = 10_000;
  bot.getNow = () => now;
  bot.rememberFailedUrgentConvert({
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
    },
  }, {
    reason: "gold-overflow",
    at: now,
  });

  now += 1_000;
  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: false,
      hasFullPlatinumStack: true,
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "platinum-overflow");
});

test("failed urgent value-slot repair backs off on the auto-convert cooldown", async () => {
  const bot = createConvertBot();
  let evaluateCalls = 0;

  bot.cdp = {
    async evaluate() {
      evaluateCalls += 1;
      return { ok: false, reason: "inventory transport unavailable" };
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, false);
  assert.equal(bot.getLastModuleActionAt("autoConvert", 0) > 0, true);
  assert.equal(evaluateCalls, 1);
  assert.equal(bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
    },
  }), null);
});

test("failed urgent value-slot repair remembers the stuck repair signature beyond the normal module cooldown", async () => {
  const bot = createConvertBot();
  let now = 1_000_000;
  bot.getNow = () => now;
  bot.lastSnapshot = {
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::nonex0::plain::container:202:1:3035x64|container:202:2:3035x64",
    },
  };

  bot.cdp = {
    async evaluate() {
      return { ok: false, reason: "inventory transport unavailable" };
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, false);

  now += 1_000;
  assert.equal(bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::nonex0::plain::container:202:1:3035x64|container:202:2:3035x64",
    },
  }), null);

  const changedAction = bot.chooseUrgentValueSlotRepair({
    ready: true,
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::3035x64::plain::equipment:9:3035x64|container:202:2:3035x64",
    },
  });

  assert.equal(changedAction?.urgent, true);
  assert.equal(changedAction?.reason, "value-slot-repair");
});

test("chooseUrgentConvert requests platinum conversion from a real full platinum stack", () => {
  const bot = createConvertBot();

  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: false,
      hasFullPlatinumStack: true,
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "platinum-overflow");
});

test("refresh reports quiver-slot value-slot repair details when platinum is still in a backpack", async () => {
  const bot = createConvertBot();
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 42 },
    { id: 3035, count: 12 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh();

  assert.equal(snapshot.currency.hasFullPlatinumValueSlotStack, false);
  assert.equal(snapshot.currency.hasCrystalValueSlotStack, false);
  assert.equal(snapshot.currency.hasFullPlatinumPlaceholderStack, false);
  assert.equal(snapshot.currency.hasCrystalPlaceholderStack, false);
  assert.equal(snapshot.currency.hasOpenBackpackPlatinumStack, true);
  assert.equal(snapshot.currency.hasOpenBackpackCrystalStack, false);
  assert.equal(snapshot.currency.hasLegacyCurrencySlotPlatinumStack, false);
  assert.equal(snapshot.currency.hasLegacyCurrencySlotCrystalStack, false);
  assert.equal(snapshot.currency.hasAnyStrayPlatinumValueCoins, true);
  assert.equal(snapshot.currency.hasAnyStrayCrystalValueCoins, false);
  assert.equal(snapshot.currency.needsValueSlotRepair, true);
  assert.equal(snapshot.currency.canStackPlatinumValueSlot, true);
  assert.equal(snapshot.currency.canStackCrystalValueSlot, false);
  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueEquipmentSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotCount, 0);
  assert.equal(snapshot.currency.valueSlotItemId, null);
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueContainerId, null);
  assert.equal(snapshot.currency.valueContainerRuntimeId, null);
  assert.equal(snapshot.currency.canStackPlatinumPlaceholder, true);
  assert.equal(snapshot.currency.placeholderCount, 0);
  assert.equal(snapshot.currency.placeholderItemId, null);
  assert.equal(snapshot.currency.placeholderSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(
    snapshot.currency.repairSignature,
    "equipment:9::nonex0::plain::container:1:1:3035x42|container:1:2:3035x12",
  );
});

test("refresh ignores stale preferred backpack value-slot state when the quiver slot is the value slot", async () => {
  const bot = createConvertBot();
  rememberContainerValueSlot(bot, 202);
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 64 };
  const wrongBackpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 12 },
  ], MAIN_BACKPACK_ID, 101);
  const mainBackpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 64 },
  ], MAIN_BACKPACK_ID, 202);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [wrongBackpack, mainBackpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueContainerRuntimeId, null);
  assert.equal(snapshot.currency.valueSlotCount, 64);
});

test("refresh uses the current equipment marker slot as the value slot", async () => {
  const bot = createConvertBot();
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3457, count: 1 };
  const backpack = createContainer([
    { id: 3031, count: 4 },
    { id: 3035, count: 84 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueEquipmentSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotItemId, 3457);
  assert.equal(snapshot.currency.valueContainerRuntimeId, null);
  assert.equal(snapshot.currency.hasOpenBackpackPlatinumStack, true);
  assert.equal(snapshot.currency.hasLegacyCurrencySlotPlatinumStack, false);
  assert.equal(snapshot.currency.needsValueSlotRepair, true);
});

test("refresh relearns the current equipment marker slot on a fresh attach despite a stale remembered backpack value slot", async () => {
  const bot = createConvertBot();
  rememberContainerValueSlot(bot, 1);
  bot.hasFreshAttach = true;
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3457, count: 1 };
  const backpack = createContainer([
    null,
    { id: 3035, count: 84 },
    { id: 3031, count: 17 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Dark Knight",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueEquipmentSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotItemId, 3457);
  assert.equal(snapshot.currency.hasOpenBackpackPlatinumStack, true);
  assert.equal(snapshot.currency.needsValueSlotRepair, true);
  assert.equal(bot.hasFreshAttach, false);
});

test("refresh on a fresh attach keeps the quiver slot as the value slot even with a parked backpack marker", async () => {
  const bot = createConvertBot();
  bot.hasFreshAttach = true;
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 84 };
  const backpack = createContainer([
    null,
    createGreatFireballRune(),
    null,
  ]);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotItemId, 3035);
  assert.equal(snapshot.currency.valueSlotCount, 84);
  assert.equal(snapshot.currency.hasLegacyCurrencySlotPlatinumStack, false);
  assert.equal(snapshot.currency.hasOpenBackpackPlatinumStack, false);
  assert.equal(snapshot.currency.needsValueSlotRepair, false);
});

test("refresh on a fresh attach keeps the quiver slot as the value slot over backpack platinum", async () => {
  const bot = createConvertBot();
  bot.hasFreshAttach = true;
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 84 };
  const backpack = createContainer([
    null,
    { id: 3035, count: 12 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotItemId, 3035);
  assert.equal(snapshot.currency.valueSlotCount, 84);
  assert.equal(snapshot.currency.hasLegacyCurrencySlotPlatinumStack, false);
  assert.equal(snapshot.currency.hasOpenBackpackPlatinumStack, true);
  assert.equal(snapshot.currency.needsValueSlotRepair, true);
});

test("refresh on a fresh attach keeps the quiver slot empty and flags backpack crystal for repair", async () => {
  const bot = createConvertBot();
  bot.hasFreshAttach = true;
  const equipment = createEquipment();
  const backpack = createContainer([
    createGreatFireballRune(),
    { id: 3043, count: 2 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotItemId, null);
  assert.equal(snapshot.currency.valueSlotCount, 0);
  assert.equal(snapshot.currency.hasOpenBackpackCrystalStack, true);
  assert.equal(snapshot.currency.needsValueSlotRepair, true);
});

test("refresh keeps the remembered equipment value slot after the shovel is displaced by coins", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 84 };
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3031, count: 4 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Knight Alpha",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.currency.valueSlotKind, "equipment");
  assert.equal(snapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);
  assert.equal(snapshot.currency.valueSlotCount, 84);
  assert.equal(snapshot.currency.valueSlotItemId, 3035);
});

test("convertCurrency uses the hotbar converter for a full backpack platinum stack before routing crystal into the quiver value slot", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  let convertCalls = 0;
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    null,
    { id: 3035, count: 100 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3035 && item?.id === 3035 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          convertCalls += 1;
          backpack.slots[2].item = { id: 3043, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "platinum-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.deepEqual(result?.convertedCoinIds, [3035]);
  assert.equal(result?.stacked, true);
  assert.equal(result?.stackMove?.coinId, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 1);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(convertCalls, 1);
  assert.equal(moves.length, 1);
});

test("convertCurrency routes new platinum into the quiver value slot after gold conversion", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 37 },
    { id: 3031, count: 100 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          if (itemId === 3035 && getItemId(item) === 3035 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.deepEqual(result?.convertedCoinIds, [3031]);
  assert.equal(result?.stacked, true);
  assert.equal(result?.stackMove?.coinId, 3035);
  assert.equal(result?.stackMove?.placeholderCount, 0);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 38);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(moves.length, 2);
});

test("convertCurrency routes value coins from every open backpack into the quiver value slot", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const wrongBackpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 8 },
  ], MAIN_BACKPACK_ID, 101);
  const mainBackpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 37 },
    { id: 3031, count: 100 },
    null,
  ], MAIN_BACKPACK_ID, 202);
  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = mainBackpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: mainBackpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          mainBackpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [wrongBackpack, mainBackpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 46);
  assert.equal(wrongBackpack.getSlotItem(1), null);
  assert.equal(mainBackpack.getSlotItem(1), null);
  assert.equal(mainBackpack.getSlotItem(2), null);
  assert.equal(moves.length, 3);
});

test("convertCurrency fills the quiver value slot directly from split platinum stacks", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const wrongBackpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 88 },
    null,
  ], MAIN_BACKPACK_ID, 101);
  const mainBackpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 37 },
    { id: 3031, count: 100 },
    null,
  ], MAIN_BACKPACK_ID, 202);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = mainBackpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: mainBackpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          mainBackpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [wrongBackpack, mainBackpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(result?.stackMove?.coinId, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 100);
  assert.equal(mainBackpack.getSlotItem(1), null);
  assert.equal(mainBackpack.getSlotItem(2), null);
  assert.equal(wrongBackpack.getSlotItem(1)?.id, 3035);
  assert.equal(wrongBackpack.getSlotItem(1)?.count, 26);
  assert.equal(moves.length, 3);
  assert.equal(moves[0]?.from.which, mainBackpack);
  assert.equal(moves[0]?.from.index, 1);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[1]?.from.which, mainBackpack);
  assert.equal(moves[1]?.from.index, 2);
  assert.equal(moves[1]?.to.which, equipment);
  assert.equal(moves[1]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[2]?.from.which, wrongBackpack);
  assert.equal(moves[2]?.from.index, 1);
  assert.equal(moves[2]?.to.which, equipment);
  assert.equal(moves[2]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency uses a full-source drag when backpack platinum only merges by stacking the whole pile", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 64 },
    { id: 3035, count: 64 },
    null,
  ], MAIN_BACKPACK_ID, 202);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone repair should not invoke the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              const targetItem = to.which?.getSlotItem?.(to.index) || null;
              const sourceItem = from.which?.getSlotItem?.(from.index) || null;
              if (
                getItemId(targetItem) === 3035
                && getItemId(sourceItem) === 3035
                && count < getItemCount(sourceItem)
              ) {
                return;
              }
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(result?.attempts, 0);
  assert.equal(result?.stackMove?.moveCount, 2);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 100);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2)?.id, 3035);
  assert.equal(backpack.getSlotItem(2)?.count, 28);
  assert.equal(moves.length, 2);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 1);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[0]?.count, 64);
  assert.equal(moves[1]?.from.which, backpack);
  assert.equal(moves[1]?.from.index, 2);
  assert.equal(moves[1]?.to.which, equipment);
  assert.equal(moves[1]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[1]?.count, 64);
});

test("convertCurrency routes new platinum into the equipment marker value slot", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3457, count: 1 };
  const backpack = createContainer([
    null,
    null,
    { id: 3031, count: 100 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const convertResult = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(convertResult?.ok, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 1);
  assert.equal(backpack.getSlotItem(0)?.id, 3457);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(moves.length, 2);
});

test("convertCurrency relearns the equipment marker value slot on a fresh attach before routing converted platinum", async () => {
  const bot = createConvertBot();
  rememberContainerValueSlot(bot, 1);
  bot.hasFreshAttach = true;
  const moves = [];
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3457, count: 1 };
  const backpack = createContainer([
    null,
    { id: 3035, count: 84 },
    { id: 3031, count: 100 },
    null,
  ]);
  const player = {
    id: 1,
    name: "Dark Knight",
    __position: { x: 100, y: 200, z: 7 },
    state: {
      health: 250,
      maxHealth: 300,
      mana: 90,
      maxMana: 120,
    },
    equipment,
    __openedContainers: [backpack],
    isMoving() {
      return false;
    },
    hasCondition() {
      return false;
    },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          if (itemId === 3035 && getItemId(item) === 3035 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            activeCreatures: new Map([[player.id, player]]),
            pathfinder: {},
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {
        ConditionManager: class ConditionManager {},
      });
    },
  };

  const learnedSnapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(learnedSnapshot.currency.valueSlotKind, "equipment");
  assert.equal(learnedSnapshot.currency.valueSlotIndex, QUIVER_SLOT_INDEX);

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.valueSlotRepairSettled, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 85);
  assert.equal(backpack.getSlotItem(0)?.id, 3457);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(moves.length, 3);
});

test("convertCurrency on a fresh attach keeps the quiver value slot and ignores a backpack marker", async () => {
  const bot = createConvertBot();
  bot.hasFreshAttach = true;
  const moves = [];
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 84 };
  const backpack = createContainer([
    null,
    createGreatFireballRune(),
    { id: 3031, count: 100 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 85);
  assert.equal(backpack.getSlotItem(1)?.id, GREAT_FIREBALL_RUNE_ID);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(moves.length, 1);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 2);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency on a fresh attach keeps routing platinum into the quiver value slot over backpack platinum", async () => {
  const bot = createConvertBot();
  bot.hasFreshAttach = true;
  const moves = [];
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 70 };
  const backpack = createContainer([
    null,
    { id: 3035, count: 12 },
    { id: 3031, count: 100 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 83);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(moves.length, 2);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 1);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[1]?.from.which, backpack);
  assert.equal(moves[1]?.from.index, 2);
  assert.equal(moves[1]?.to.which, equipment);
  assert.equal(moves[1]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency prioritizes converting a full platinum quiver value-slot stack into crystal", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const equipment = createEquipment();
  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 100 };
  const backpack = createContainer([
    { id: 3035, count: 100 },
    null,
  ]);
  let convertCalls = 0;
  let useCalls = 0;

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(0);
          if (itemId === 3035 && getItemId(item) === 3035 && item.count === 100) {
            return { which: backpack, index: 0 };
          }
          return null;
        },
        __convertCurrency() {
          convertCalls += 1;
          backpack.slots[0].item = { id: 3043, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            use(target) {
              useCalls += 1;
              assert.equal(target?.which, equipment);
              assert.equal(target?.index, QUIVER_SLOT_INDEX);
              equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3043, count: 1 };
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "platinum-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.equal(result?.stacked, false);
  assert.equal(convertCalls, 0);
  assert.equal(useCalls, 1);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 1);
  assert.equal(backpack.getSlotItem(0)?.id, 3035);
  assert.equal(backpack.getSlotItem(0)?.count, 100);
});

test("convertCurrency routes newly created crystal into the quiver value slot after platinum conversion", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3043, count: 2 },
    { id: 3035, count: 100 },
    { id: 3035, count: 40 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3035 && getItemId(item) === 3035 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3043, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "platinum-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.equal(result?.stacked, true);
  assert.equal(result?.stackMove?.coinId, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 3);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(backpack.getSlotItem(3)?.count, 40);
  assert.equal(moves.length, 2);
});

test("convertCurrency keeps the highest-value crystal stack in the quiver value slot while merging new platinum elsewhere", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3043, count: 2 },
    { id: 3043, count: 60 },
    { id: 3035, count: 40 },
    { id: 3031, count: 100 },
    null,
  ]);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(4);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 4 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[4].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.equal(result?.stacked, true);
  assert.deepEqual(result?.stackMove?.coinIds, [3043, 3035]);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 62);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(backpack.getSlotItem(3)?.id, 3035);
  assert.equal(backpack.getSlotItem(3)?.count, 41);
  assert.equal(backpack.getSlotItem(4), null);
  assert.equal(moves.length, 3);
});

test("convertCurrency urgently repairs misplaced platinum into the quiver value slot without a new conversion", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3035, count: 1 },
    { id: 3457, count: 1 },
    { id: 3174, count: 20 },
    { id: 3031, count: 48 },
    null,
  ]);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 74 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone value-slot repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 0);
  assert.equal(result?.stackMove?.preparationMoveCount, 0);
  assert.equal(result?.stackMove?.moveCount, 1);
  assert.equal(backpack.getSlotItem(0), null);
  assert.equal(backpack.getSlotItem(1)?.id, 3457);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 75);
  assert.equal(moves.length, 1);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 0);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency can evict quiver platinum into a packed backpack stack before routing crystal into the value slot", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3035, count: 76 },
    { id: 3043, count: 17 },
  ]);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 24 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone value-slot repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(result?.attempts, 0);
  assert.equal(result?.stackMove?.coinId, 3043);
  assert.equal(result?.stackMove?.preparationMoveCount, 1);
  assert.equal(result?.stackMove?.moveCount, 1);
  assert.equal(backpack.getSlotItem(0)?.id, 3035);
  assert.equal(backpack.getSlotItem(0)?.count, 100);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 17);
  assert.equal(moves.length, 2);
  assert.equal(moves[0]?.from.which, equipment);
  assert.equal(moves[0]?.from.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[0]?.to.which, backpack);
  assert.equal(moves[0]?.to.index, 0);
  assert.equal(moves[0]?.count, 24);
  assert.equal(moves[1]?.from.which, backpack);
  assert.equal(moves[1]?.from.index, 1);
  assert.equal(moves[1]?.to.which, equipment);
  assert.equal(moves[1]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[1]?.count, 17);
});

test("convertCurrency can merge a single platinum coin out of the quiver when the backpack is packed", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3035, count: 1 },
    { id: 3043, count: 17 },
  ]);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 1 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone value-slot repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(result?.stackMove?.coinId, 3043);
  assert.equal(result?.stackMove?.preparationMoveCount, 1);
  assert.equal(result?.stackMove?.moveCount, 1);
  assert.equal(backpack.getSlotItem(0)?.id, 3035);
  assert.equal(backpack.getSlotItem(0)?.count, 2);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3043);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 17);
  assert.equal(moves.length, 2);
});

test("convertCurrency directly merges backpack platinum into the occupied quiver value slot", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 64 },
    null,
  ], MAIN_BACKPACK_ID, 202);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 74 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone value-slot repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(result?.attempts, 0);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 100);
  assert.equal(backpack.getSlotItem(1)?.id, 3035);
  assert.equal(backpack.getSlotItem(1)?.count, 38);
  assert.equal(moves.length, 1);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 1);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[0]?.count, 64);
});

test("convertCurrency stops repeating the same cursed value-slot repair when the repair signature never changes", async () => {
  const bot = createConvertBot();
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3035, count: 2 },
    null,
  ], MAIN_BACKPACK_ID, 202);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 24 };
  bot.page = { targetId: 1 };
  bot.lastSnapshot = {
    ready: true,
    page: bot.page,
    currency: {
      valueSlotKind: "equipment",
      valueSlotIndex: QUIVER_SLOT_INDEX,
      valueSlotItemId: 3035,
      valueSlotCount: 24,
      needsValueSlotRepair: true,
      repairSignature: "equipment:9::3035x24::plain::container:202:0:3035x2|equipment:9:3035x24",
    },
  };
  bot.refresh = async () => {
    const snapshot = {
      ready: true,
      page: bot.page,
      currency: {
        valueSlotKind: "equipment",
        valueSlotIndex: QUIVER_SLOT_INDEX,
        valueSlotItemId: 3035,
        valueSlotCount: 24,
        needsValueSlotRepair: true,
        repairSignature: "equipment:9::3035x24::plain::container:202:0:3035x2|equipment:9:3035x24",
      },
    };
    bot.lastSnapshot = snapshot;
    return snapshot;
  };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone value-slot repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, false);
  assert.equal(result?.reason, "value-slot-repair-stuck");
  assert.equal(result?.valueSlotRepairPasses, 0);
  assert.equal(moves.length, 1);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 0);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[0]?.count, 2);
});

test("convertCurrency limits a single value-slot repair call to one follow-up pass", async () => {
  const bot = createConvertBot();
  let evaluateCalls = 0;
  let refreshCalls = 0;

  bot.page = { targetId: 1 };
  bot.lastSnapshot = {
    ready: true,
    page: bot.page,
    currency: {
      needsValueSlotRepair: true,
      repairSignature: "repair:0",
    },
  };
  bot.refresh = async () => {
    refreshCalls += 1;
    const snapshot = {
      ready: true,
      page: bot.page,
      currency: {
        needsValueSlotRepair: true,
        repairSignature: `repair:${refreshCalls}`,
      },
    };
    bot.lastSnapshot = snapshot;
    return snapshot;
  };

  bot.cdp = {
    async evaluate() {
      evaluateCalls += 1;
      return {
        ok: true,
        attempts: 0,
        stacked: false,
        stackMove: null,
      };
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, false);
  assert.equal(result?.reason, "value-slot-repair-pending");
  assert.equal(result?.valueSlotRepairPasses, 1);
  assert.equal(evaluateCalls, 2);
  assert.equal(refreshCalls, 1);
});

test("convertCurrency directly fills the quiver when a remembered container value slot is stale", async () => {
  const bot = createConvertBot();
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 74 },
    { id: 3035, count: 64 },
    null,
  ], MAIN_BACKPACK_ID, 202);

  rememberContainerValueSlot(bot, 202, 1);

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("standalone repair should not invoke the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              const targetItem = to.which?.getSlotItem?.(to.index) || null;
              const sourceItem = from.which?.getSlotItem?.(from.index) || null;
              if (
                getItemId(targetItem) === 3035
                && getItemId(sourceItem) === 3035
                && count < getItemCount(sourceItem)
              ) {
                return;
              }
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.stacked, true);
  assert.equal(result?.attempts, 0);
  assert.equal(result?.stackMove?.moveCount, 2);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2)?.id, 3035);
  assert.equal(backpack.getSlotItem(2)?.count, 38);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 100);
  assert.equal(moves.length, 2);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 1);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[0]?.count, 74);
  assert.equal(moves[1]?.from.which, backpack);
  assert.equal(moves[1]?.from.index, 2);
  assert.equal(moves[1]?.to.which, equipment);
  assert.equal(moves[1]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[1]?.count, 64);
});

test("convertCurrency repairs the quiver value slot with one direct stack move", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3035, count: 1 },
    null,
  ]);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 74 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("cursed value-slot repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 75);
  assert.equal(backpack.getSlotItem(0), null);
  assert.equal(moves.length, 1);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 0);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency directly fills the quiver from the largest same-id backpack stack", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const equippedBackpack = createContainer([
    { id: 3035, count: 1 },
    null,
  ], MAIN_BACKPACK_ID, 101);
  const laterSameIdBackpack = createContainer([
    { id: 3035, count: 40 },
    null,
  ], MAIN_BACKPACK_ID, 202);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 74 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("same-id backpack repair should not call the hotbar converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [equippedBackpack, laterSameIdBackpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 100);
  assert.equal(equippedBackpack.getSlotItem(0)?.id, 3035);
  assert.equal(equippedBackpack.getSlotItem(0)?.count, 1);
  assert.equal(laterSameIdBackpack.getSlotItem(0)?.id, 3035);
  assert.equal(laterSameIdBackpack.getSlotItem(0)?.count, 14);
  assert.equal(moves.length, 1);
  assert.equal(moves[0]?.from.which, laterSameIdBackpack);
  assert.equal(moves[0]?.from.index, 0);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency interrupts autowalk before repairing the quiver value slot", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    null,
    { id: 3174, count: 10 },
    { id: 3035, count: 1 },
    { id: 3031, count: 88 },
    { id: 3457, count: 1 },
  ], MAIN_BACKPACK_ID, 269079);
  let stopCalls = 0;
  let moving = true;
  const pathfinder = {
    __isAutoWalking: true,
    __finalDestination: { x: 33145, y: 32608, z: 8 },
    __autoWalkStepsRemaining: 2,
    stopAutoWalk() {
      stopCalls += 1;
      this.__isAutoWalking = false;
      this.__finalDestination = null;
      this.__autoWalkStepsRemaining = 0;
      moving = false;
    },
  };

  equipment.isMoving = () => moving;
  equipment.stopAutoWalk = () => {
    stopCalls += 1;
    moving = false;
    pathfinder.__isAutoWalking = false;
    pathfinder.__finalDestination = null;
    pathfinder.__autoWalkStepsRemaining = 0;
  };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("autowalk repair should not invoke the converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            isMoving: () => moving,
            stopAutoWalk() {
              equipment.stopAutoWalk();
            },
            __openedContainers: [backpack],
          },
          world: {
            pathfinder,
          },
          mouse: {
            sendItemMove(from, to, count) {
              if (pathfinder.__isAutoWalking || moving) {
                return;
              }
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 1);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(backpack.getSlotItem(4)?.id, 3457);
  assert.ok(stopCalls >= 1);
  assert.equal(pathfinder.__isAutoWalking, false);
  assert.equal(moving, false);
  assert.equal(moves.length, 1);
});

test("convertCurrency fully settles an attached quiver value-slot repair in one call", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 93 },
    null,
    null,
  ], MAIN_BACKPACK_ID, 1);

  stubAttachedValueSlotRefresh(bot, {
    equipment,
    containers: [backpack],
    valueSlotKind: "equipment",
    valueSlotIndex: QUIVER_SLOT_INDEX,
  });

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack() {
          return null;
        },
        __convertCurrency() {
          assert.fail("attached repair follow-up should not invoke the converter");
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "value-slot-repair",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.valueSlotRepairSettled, true);
  assert.equal(result?.valueSlotRepairPasses, 0);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 93);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(0)?.id, 3457);
  assert.equal(moves.length, 1);
});

test("convertCurrency repairs backpack platinum into the quiver value slot after gold conversion", async () => {
  const bot = createConvertBot();
  rememberEquipmentValueSlot(bot, QUIVER_SLOT_INDEX);
  const moves = [];
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 3457, count: 1 },
    { id: 3035, count: 1 },
    { id: 3031, count: 100 },
    null,
  ]);

  equipment.slots[QUIVER_SLOT_INDEX].item = { id: 3035, count: 70 };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          const item = backpack.getSlotItem(2);
          if (itemId === 3031 && getItemId(item) === 3031 && item.count === 100) {
            return { which: backpack, index: 2 };
          }
          return null;
        },
        __convertCurrency() {
          backpack.slots[2].item = { id: 3035, count: 1 };
        },
      };

      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {
            equipment,
            __openedContainers: [backpack],
          },
          mouse: {
            sendItemMove(from, to, count) {
              moves.push({ from, to, count });
              moveItem(from, to, count);
            },
          },
          interface: {
            hotbarManager,
          },
        },
      }, {});
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.equal(result?.stacked, true);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.id, 3035);
  assert.equal(equipment.getSlotItem(QUIVER_SLOT_INDEX)?.count, 72);
  assert.equal(backpack.getSlotItem(1), null);
  assert.equal(backpack.getSlotItem(2), null);
  assert.equal(moves.length, 2);
  assert.equal(moves[0]?.from.which, backpack);
  assert.equal(moves[0]?.from.index, 1);
  assert.equal(moves[0]?.to.which, equipment);
  assert.equal(moves[0]?.to.index, QUIVER_SLOT_INDEX);
  assert.equal(moves[1]?.from.which, backpack);
  assert.equal(moves[1]?.from.index, 2);
  assert.equal(moves[1]?.to.which, equipment);
  assert.equal(moves[1]?.to.index, QUIVER_SLOT_INDEX);
});

test("convertCurrency limits urgent gold conversion to a single attempt per pass", async () => {
  const bot = createConvertBot();
  let convertCalls = 0;

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          if (itemId === 3031) {
            return convertCalls < 2 ? { itemId, count: 100 } : null;
          }
          return null;
        },
        __convertCurrency() {
          convertCalls += 1;
        },
      };

      return Function("window", `return ${expression};`)({
        gameClient: {
          interface: {
            hotbarManager,
          },
        },
      });
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.attempts, 1);
  assert.equal(convertCalls, 1);
});

test("convertCurrency backs off repeated urgent gold overflow retries when the visible coin layout stays stuck", async () => {
  const bot = createConvertBot();
  let now = 1_000_000;
  let convertCalls = 0;
  bot.getNow = () => now;
  bot.page = { targetId: 1 };
  bot.lastSnapshot = {
    ready: true,
    page: bot.page,
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  };
  bot.refresh = async () => {
    const snapshot = {
      ready: true,
      page: bot.page,
      currency: {
        hasFullGoldStack: true,
        hasFullPlatinumStack: false,
        overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
      },
    };
    bot.lastSnapshot = snapshot;
    return snapshot;
  };

  bot.cdp = {
    async evaluate(expression) {
      const hotbarManager = {
        __findFullCoinStack(itemId) {
          if (itemId === 3031) {
            return convertCalls < 1 ? { itemId, count: 100 } : null;
          }
          return null;
        },
        __convertCurrency() {
          convertCalls += 1;
        },
      };

      return Function("window", `return ${expression};`)({
        gameClient: {
          interface: {
            hotbarManager,
          },
        },
      });
    },
  };

  const result = await bot.convertCurrency({
    moduleKey: "autoConvert",
    ruleIndex: 0,
    urgent: true,
    reason: "gold-overflow",
  });

  assert.equal(result?.ok, true);
  assert.equal(convertCalls, 1);

  now += 1_000;
  assert.equal(bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  }), null);

  now += 5_001;
  const action = bot.chooseUrgentConvert({
    ready: true,
    currency: {
      hasFullGoldStack: true,
      hasFullPlatinumStack: false,
      overflowSignature: "container:101:1:3031x100|container:101:2:3031x87",
    },
  });

  assert.equal(action?.urgent, true);
  assert.equal(action?.reason, "gold-overflow");
});

test("useHotbarSlot routes spell slots through the hotbar spell handler", async () => {
  const bot = new MinibiaTargetBot({});
  let invocation = null;

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            hotbarManager: {
              slots: [
                {
                  slotIndex: 0,
                  spell: { id: 11, name: "Ultimate Healing", words: "exura vita" },
                },
              ],
              __canPlayerCastSpell() {
                return true;
              },
              __handleSpellUseWithMode(payload, mode) {
                invocation = { payload, mode };
              },
            },
          },
        },
      });
    },
  };

  const result = await bot.useHotbarSlot({
    slotIndex: 0,
    mode: "bot",
    moduleKey: "sustain",
    ruleIndex: 0,
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "hotbar-spell");
  assert.equal(result?.sid, 11);
  assert.equal(result?.words, "exura vita");
  assert.deepEqual(invocation, {
    payload: { sid: 11, words: "exura vita" },
    mode: "bot",
  });
});

test("useHotbarSlot routes item slots through the hotbar slot handler", async () => {
  const bot = new MinibiaTargetBot({});
  const invocations = [];

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            hotbarManager: {
              slots: [
                {
                  slotIndex: 0,
                  item: { id: 7618, name: "Health Potion", count: 3 },
                },
              ],
              useSlot(slotIndex, mode, slot) {
                invocations.push({ slotIndex, mode, slot });
              },
            },
          },
        },
      });
    },
  };

  const result = await bot.useHotbarSlot({
    slotIndex: 0,
    mode: "bot",
    moduleKey: "sustain",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "useSlot");
  assert.equal(result?.kind, "item");
  assert.equal(result?.itemId, 7618);
  assert.equal(invocations.length, 1);
  assert.equal(invocations[0].slotIndex, 0);
});

test("useHotkey dispatches configured function-key input", async () => {
  const bot = new MinibiaTargetBot({});
  const sentEvents = [];

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async send(method, params = {}) {
      sentEvents.push({ method, params });
      return {};
    },
  };

  const result = await bot.useHotkey({
    type: "heal",
    moduleKey: "healer",
    ruleIndex: 0,
    hotkey: "f5",
    words: "exura vita",
    target: "self",
  });

  const keyEvents = sentEvents.filter((event) => event.method === "Input.dispatchKeyEvent");
  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "keyboard-hotkey");
  assert.equal(result?.hotkey, "F5");
  assert.equal(result?.words, "exura vita");
  assert.equal(result?.target, "self");
  assert.equal(sentEvents[0]?.method, "Page.bringToFront");
  assert.deepEqual(keyEvents.map((event) => event.params.type), ["rawKeyDown", "keyUp"]);
  assert.deepEqual(keyEvents.map((event) => event.params.key), ["F5", "F5"]);
  assert.deepEqual(keyEvents.map((event) => event.params.code), ["F5", "F5"]);
  assert.deepEqual(keyEvents.map((event) => event.params.windowsVirtualKeyCode), [116, 116]);
});

test("useHotbarSlot prefers configured hotkeys over hotbar clicks", async () => {
  const bot = new MinibiaTargetBot({});
  const sentEvents = [];

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate() {
      throw new Error("hotbar evaluate should not be used when a hotkey is configured");
    },
    async send(method, params = {}) {
      sentEvents.push({ method, params });
      return {};
    },
  };

  const result = await bot.useHotbarSlot({
    slotIndex: 0,
    hotkey: "F5",
    target: "self",
    mode: "bot",
    moduleKey: "healerRune",
  });

  const keyEvents = sentEvents.filter((event) => event.method === "Input.dispatchKeyEvent");
  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "keyboard-hotkey");
  assert.equal(result?.hotkey, "F5");
  assert.equal(result?.target, "self");
  assert.deepEqual(keyEvents.map((event) => event.params.key), ["F5", "F5"]);
});

test("useHotbarSlot self-targets item hotbar slots before generic activation", async () => {
  const bot = new MinibiaTargetBot({});
  let consumed = null;
  let genericActivations = 0;
  const player = { id: 1, name: "Dark Knight" };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          mouse: {
            useOnCreature(ref, target) {
              consumed = { ref, target };
            },
          },
          interface: {
            hotbarManager: {
              slots: [
                {
                  slotIndex: 0,
                  item: { id: 2273, name: "Ultimate Healing Rune", count: 3 },
                },
              ],
              useSlot() {
                genericActivations += 1;
              },
            },
          },
        },
      });
    },
  };

  const result = await bot.useHotbarSlot({
    slotIndex: 0,
    target: "self",
    mode: "bot",
    moduleKey: "healerRune",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "useOnCreature");
  assert.equal(result?.target, "self");
  assert.equal(result?.itemId, 2273);
  assert.equal(consumed?.target, player);
  assert.equal(consumed?.ref?.location, "hotbar");
  assert.equal(genericActivations, 0);
});

test("useHotbarSlot sends text macro slots through the default channel packet path", async () => {
  const bot = new MinibiaTargetBot({});
  const sentPackets = [];

  class ChannelMessagePacket {
    constructor(channelId, mode, text) {
      this.channelId = channelId;
      this.mode = mode;
      this.text = text;
    }
  }

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          send(packet) {
            sentPackets.push(packet);
          },
          interface: {
            hotbarManager: {
              slots: [
                {
                  slotIndex: 0,
                  text: "hi",
                  label: "Greeting",
                },
              ],
            },
          },
        },
        globalThisOverrides: {
          ChannelMessagePacket,
          CONST: {
            CHANNEL: {
              DEFAULT: 0,
            },
          },
        },
      });
    },
  };

  const result = await bot.useHotbarSlot({
    slotIndex: 0,
    mode: "bot",
    moduleKey: "hotbar",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "packet");
  assert.equal(result?.kind, "text");
  assert.equal(sentPackets.length, 1);
  assert.equal(sentPackets[0].text, "hi");
});

test("castWords routes plain npc keywords through channelManager when packet transport is unavailable", async () => {
  const bot = new MinibiaTargetBot({});
  const sentMessages = [];

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player: {
            state: {
              mana: 100,
            },
          },
          interface: {
            channelManager: {
              sendMessageText(text, channelId) {
                sentMessages.push({ text, channelId });
              },
            },
            SPELLS: new Map(),
          },
        },
      });
    },
  };

  const result = await bot.castWords({
    type: "npc-keyword",
    words: "hi",
    moduleKey: "partyFollow-replay",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "channelManager");
  assert.equal(sentMessages.length, 1);
  assert.deepEqual(sentMessages[0], {
    text: "hi",
    channelId: undefined,
  });
});

test("useHotbarSlot executes attack-nearest action slots through the battle manager", async () => {
  const bot = new MinibiaTargetBot({});
  let attackNearestCalls = 0;

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          battleManager: {
            attackNearest() {
              attackNearestCalls += 1;
            },
          },
          interface: {
            hotbarManager: {
              slots: [
                {
                  slotIndex: 0,
                  text: "attack nearest",
                  label: "Attack Nearest",
                },
              ],
            },
          },
        },
      });
    },
  };

  const result = await bot.useHotbarSlot({
    slotIndex: 0,
    mode: "bot",
    moduleKey: "hotbar",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.kind, "attack-nearest");
  assert.equal(attackNearestCalls, 1);
});

test("useConsumable finds a matching self-target consumable in open containers", async () => {
  const bot = new MinibiaTargetBot({});
  const equipment = createEquipment();
  const backpack = createContainer([
    { id: 7618, name: "health potion", count: 9 },
    { id: 2666, name: "meat", count: 3 },
  ]);
  let consumed = null;
  const player = {
    id: 1,
    name: "Knight Alpha",
    equipment,
    __openedContainers: [backpack],
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player,
          world: {
            pathfinder: {},
          },
          mouse: {
            useOnCreature(ref, target) {
              consumed = { ref, target };
            },
          },
        },
      });
    },
  };

  const result = await bot.useConsumable({
    category: "potion",
    target: "self",
    moduleKey: "sustain",
    ruleIndex: 1,
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "useOnCreature");
  assert.equal(result?.itemId, 7618);
  assert.equal(result?.category, "potion");
  assert.equal(result?.location, "container");
  assert.equal(result?.slotIndex, 0);
  assert.equal(result?.containerRuntimeId, 1);
  assert.equal(consumed?.ref?.which, backpack);
  assert.equal(consumed?.ref?.index, 0);
  assert.equal(consumed?.target, player);
});

test("chooseTarget ignores off-floor monsters and route combat hold ignores stale off-floor targets", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 101, z: 9 },
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 101, z: 9 },
        dx: 1,
        dy: 1,
        dz: 1,
      },
    ],
  };

  assert.equal(bot.chooseTarget(snapshot), null);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), false);
});

test("chooseTarget ignores unreachable and out-of-window monsters", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 2,
    combatRangeY: 2,
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      reachableForCombat: false,
      withinCombatBox: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        reachableForCombat: false,
        withinCombatBox: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 108, y: 100, z: 8 },
        dx: 8,
        dy: 0,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: false,
      },
    ],
  };

  assert.equal(bot.chooseTarget(snapshot), null);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), false);
});

test("chooseTarget keeps only reachable monsters inside the local combat box", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 2,
    combatRangeY: 2,
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        reachableForCombat: false,
        withinCombatBox: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 102, y: 101, z: 8 },
        dx: 2,
        dy: 1,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: true,
      },
      {
        id: 12,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        dx: 4,
        dy: 0,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: false,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 11);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [11]);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), true);
});

test("chooseTarget expands the local combat box by 1 sqm on each axis", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 2,
    combatRangeY: 2,
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 103, z: 8 },
        dx: 3,
        dy: 3,
        dz: 0,
        reachableForCombat: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 104, y: 104, z: 8 },
        dx: 4,
        dy: 4,
        dz: 0,
        reachableForCombat: true,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 10);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [10]);
});

test("chooseTarget can reach-attack a tracked monster inside the wider combat window", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 1,
    combatRangeY: 1,
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        dx: 4,
        dy: 0,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: false,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 10);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [10]);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), true);
});

test("chooseTarget respects foreign-engaged monsters when shared spawn mode is set to respect others", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva", "Rat"],
    sharedSpawnMode: "respect-others",
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  const foreignPlayer = {
    id: 900,
    name: "Knight Alpha",
    position: { x: 103, y: 100, z: 8 },
  };
  const foreignTarget = {
    id: 10,
    name: "Larva",
    position: { x: 101, y: 100, z: 8 },
    dx: 1,
    dy: 0,
    dz: 0,
    distance: 1,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    engagedPlayerIds: ["900"],
    engagedPlayerNames: ["Knight Alpha"],
    engagedPlayerCount: 1,
  };
  const freeTarget = {
    id: 11,
    name: "Rat",
    position: { x: 99, y: 100, z: 8 },
    dx: -1,
    dy: 0,
    dz: 0,
    distance: 1,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    engagedPlayerIds: [],
    engagedPlayerNames: [],
    engagedPlayerCount: 0,
  };

  const mixedSnapshot = {
    ready: true,
    playerName: "Own Knight",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visiblePlayers: [foreignPlayer],
    visibleCreatures: [foreignTarget, freeTarget],
    candidates: [foreignTarget, freeTarget],
  };

  const selection = bot.chooseTarget(mixedSnapshot);
  assert.equal(selection?.chosen?.id, 11);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [11]);

  const foreignOnlySnapshot = {
    ...mixedSnapshot,
    visibleCreatures: [foreignTarget],
    candidates: [foreignTarget],
  };
  assert.equal(bot.chooseTarget(foreignOnlySnapshot), null);
  assert.equal(bot.shouldHoldRouteForCombat(foreignOnlySnapshot), false);
});

test("chooseTarget infers nearby foreign-player claims and lets the route keep walking", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    sharedSpawnMode: "respect-others",
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const claimedByProximity = {
    id: 10,
    name: "Larva",
    position: { x: 100, y: 100, z: 8 },
    dx: 1,
    dy: 0,
    dz: 0,
    distance: 1,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    engagedPlayerIds: [],
    engagedPlayerNames: [],
    engagedPlayerCount: 0,
  };
  const snapshot = {
    ready: true,
    playerName: "Own Knight",
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    visiblePlayers: [
      {
        id: 900,
        name: "Knight Alpha",
        position: { x: 100, y: 101, z: 8 },
      },
    ],
    visibleCreatures: [claimedByProximity],
    candidates: [claimedByProximity],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseTarget(snapshot), null);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), false);

  const routeAction = bot.chooseRouteAction(snapshot);
  assert.equal(bot.routeIndex, 1);
  assert.equal(routeAction?.kind, "walk");
  assert.deepEqual(routeAction?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(routeAction?.destination, bot.options.waypoints[1]);
});

test("chooseTarget blocks foreign-engaged monsters by default even when the player row is gone", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva", "Rat"],
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  const foreignTarget = {
    id: 10,
    name: "Larva",
    position: { x: 101, y: 100, z: 8 },
    dx: 1,
    dy: 0,
    dz: 0,
    distance: 1,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    engagedPlayerIds: ["900"],
    engagedPlayerNames: ["Knight Alpha"],
    engagedPlayerCount: 1,
  };
  const ownTarget = {
    ...foreignTarget,
    id: 11,
    name: "Rat",
    position: { x: 102, y: 100, z: 8 },
    dx: 2,
    distance: 2,
    chebyshevDistance: 2,
    engagedPlayerIds: [],
    engagedPlayerNames: ["Own Knight"],
  };

  const snapshot = {
    ready: true,
    playerName: "Own Knight",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visiblePlayers: [],
    visibleCreatures: [foreignTarget, ownTarget],
    candidates: [foreignTarget, ownTarget],
  };

  const selection = bot.chooseTarget(snapshot);
  assert.equal(selection?.chosen?.id, 11);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [11]);

  const attackAllBot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    sharedSpawnMode: "attack-all",
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });
  assert.equal(attackAllBot.chooseTarget({
    ...snapshot,
    visibleCreatures: [foreignTarget],
    candidates: [foreignTarget],
  }), null);
});

test("target command refuses a stale foreign-engaged target before sending the live click", async () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    sharedSpawnMode: "attack-all",
  });
  const player = {
    id: 1,
    name: "Own Knight",
  };
  const monster = {
    id: 10,
    name: "Larva",
    __position: { x: 101, y: 100, z: 8 },
    target: {
      id: 900,
      name: "Knight Alpha",
    },
  };
  let targetCalls = 0;
  const context = {
    window: {
      gameClient: {
        player,
        world: {
          activeCreatures: new Map([
            [1, player],
            [10, monster],
          ]),
          targetMonster() {
            targetCalls += 1;
          },
        },
      },
    },
  };

  bot.lastSnapshot = {
    ready: true,
    playerName: "Own Knight",
    playerId: 1,
  };
  bot.cdp = {
    evaluate: async (expression) => vm.runInNewContext(expression, context),
  };

  const result = await bot.target({
    chosen: { id: 10, name: "Larva" },
    candidates: [{ id: 10, name: "Larva" }],
  });

  assert.equal(result?.ok, false);
  assert.equal(result?.blockedBySharedSpawn, true);
  assert.equal(result?.reason, "shared spawn reserved");
  assert.equal(targetCalls, 0);
  assert.equal(bot.lastRetargetId, null);
});

test("target command refuses a stale proximity-claimed target before sending the live click", async () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    sharedSpawnMode: "respect-others",
  });
  const player = {
    id: 1,
    name: "Own Knight",
    __position: { x: 99, y: 100, z: 8 },
  };
  const foreignPlayer = {
    id: 900,
    name: "Knight Alpha",
    __position: { x: 100, y: 101, z: 8 },
  };
  const monster = {
    id: 10,
    name: "Larva",
    __position: { x: 100, y: 100, z: 8 },
  };
  let targetCalls = 0;
  const context = {
    window: {
      gameClient: {
        player,
        world: {
          activeCreatures: new Map([
            [1, player],
            [900, foreignPlayer],
            [10, monster],
          ]),
          targetMonster() {
            targetCalls += 1;
          },
        },
      },
    },
  };

  bot.lastSnapshot = {
    ready: true,
    playerName: "Own Knight",
    playerId: 1,
    playerPosition: { x: 99, y: 100, z: 8 },
    visiblePlayers: [
      {
        id: 900,
        name: "Knight Alpha",
        position: { x: 100, y: 101, z: 8 },
      },
    ],
  };
  bot.cdp = {
    evaluate: async (expression) => vm.runInNewContext(expression, context),
  };

  const result = await bot.target({
    chosen: { id: 10, name: "Larva" },
    candidates: [{ id: 10, name: "Larva" }],
  });

  assert.equal(result?.ok, false);
  assert.equal(result?.blockedBySharedSpawn, true);
  assert.equal(result?.reason, "shared spawn reserved");
  assert.equal(targetCalls, 0);
  assert.equal(bot.lastRetargetId, null);
});

test("tick resumes route immediately when a live target attempt finds a reserved monster", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });
  const staleCandidate = {
    id: 10,
    name: "Larva",
    position: { x: 101, y: 100, z: 8 },
    dx: 1,
    dy: 0,
    dz: 0,
    distance: 1,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
  };
  const snapshot = createModuleSnapshot({
    playerName: "Own Knight",
    playerId: 1,
    visibleCreatures: [staleCandidate],
    candidates: [staleCandidate],
  });
  const routeSnapshots = [];
  let targetAttempts = 0;
  let executedRouteAction = null;

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.getActiveVocationProfile = async () => null;
  bot.restorePreferredChaseMode = async () => ({ ok: true });
  bot.attemptDeathHeal = async () => ({ result: { ok: false } });
  bot.chooseHealerRuneActions = () => [];
  bot.isHealingPriorityActive = () => false;
  bot.attemptSustain = async () => ({ result: { ok: false } });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.attemptTrainerEscape = async () => ({ result: { ok: false } });
  bot.handleRookiller = async () => ({ handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.chooseFollowTrainSuspendAction = () => null;
  bot.chooseFollowTrainAction = () => null;
  bot.attemptAutoEat = async () => ({ result: { ok: false } });
  bot.attemptEquipmentAutoReplace = async () => ({ result: { ok: false } });
  bot.attemptAmmoReload = async () => ({ result: { ok: false } });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptAmmoRestock = async () => ({ result: { ok: false } });
  bot.attemptRefill = async () => ({ result: { ok: false } });
  bot.attemptLoot = async () => ({ result: { ok: false } });
  bot.chooseRouteAction = (nextSnapshot) => {
    routeSnapshots.push(nextSnapshot);
    return nextSnapshot.candidates?.length
      ? null
      : {
          kind: "walk",
          waypoint: { x: 101, y: 100, z: 8, type: "walk" },
          destination: { x: 101, y: 100, z: 8 },
        };
  };
  bot.target = async () => {
    targetAttempts += 1;
    return {
      ok: false,
      reason: "shared spawn reserved",
      blockedBySharedSpawn: true,
      blockedTargets: [
        {
          target: {
            id: 10,
            name: "Larva",
            position: { x: 101, y: 100, z: 8 },
          },
        },
      ],
    };
  };
  bot.executeRouteAction = async (action) => {
    executedRouteAction = action;
    return { ok: true };
  };
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.chooseAntiIdle = () => null;

  const result = await bot.tick();

  assert.equal(targetAttempts, 1);
  assert.equal(executedRouteAction?.kind, "walk");
  assert.equal(routeSnapshots.length, 1);
  assert.deepEqual(routeSnapshots[0].candidates, []);
  assert.equal(result.currentTarget, null);
  assert.deepEqual(result.candidates, []);
});

test("tick targets a visible combat monster before route walking near stairs", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    routeStrictClear: false,
    monsterNames: ["Dragon"],
    waypoints: [
      { x: 32824, y: 32143, z: 7, type: "stairs-down" },
    ],
  });
  const dragon = {
    id: 570812,
    name: "Dragon",
    position: { x: 32823, y: 32144, z: 7 },
    dx: -1,
    dy: 1,
    dz: 0,
    distance: 2,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
  };
  const snapshot = createModuleSnapshot({
    playerPosition: { x: 32824, y: 32143, z: 7 },
    currentTarget: null,
    visibleCreatures: [dragon],
    candidates: [dragon],
    hazardTiles: [
      {
        position: { x: 32824, y: 32143, z: 7 },
        categories: ["stairsLadders"],
        labels: ["ramp"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });
  const calls = [];

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.getActiveVocationProfile = async () => null;
  bot.restorePreferredChaseMode = async () => ({ ok: true });
  bot.attemptDeathHeal = async () => ({ result: { ok: false } });
  bot.isHealingPriorityActive = () => false;
  bot.attemptSustain = async () => ({ result: { ok: false } });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.chooseNoGoZoneEscape = () => null;
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.attemptTrainerEscape = async () => ({ result: { ok: false } });
  bot.handleRookiller = async () => ({ handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.chooseFollowTrainSuspendAction = () => null;
  bot.chooseFollowTrainAction = () => null;
  bot.attemptAutoEat = async () => ({ result: { ok: false } });
  bot.attemptEquipmentAutoReplace = async () => ({ result: { ok: false } });
  bot.attemptAmmoReload = async () => ({ result: { ok: false } });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptAmmoRestock = async () => ({ result: { ok: false } });
  bot.attemptRefill = async () => ({ result: { ok: false } });
  bot.attemptLoot = async () => ({ result: { ok: false } });
  bot.chooseRouteAction = () => ({
    kind: "walk",
    waypoint: bot.options.waypoints[0],
    destination: bot.options.waypoints[0],
    walkReason: "stair-recovery",
  });
  bot.target = async (selection) => {
    calls.push(`target:${selection?.chosen?.id}`);
    return { ok: true };
  };
  bot.executeRouteAction = async () => {
    calls.push("route");
    return { ok: true };
  };
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.chooseAntiIdle = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.deepEqual(calls, ["target:570812"]);
});

test("chooseTarget can fully suspend combat when watch-only shared spawn mode sees another player", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    sharedSpawnMode: "watch-only",
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  const currentTarget = {
    id: 10,
    name: "Larva",
    position: { x: 101, y: 100, z: 8 },
    dx: 1,
    dy: 0,
    dz: 0,
    distance: 1,
    chebyshevDistance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    engagedPlayerIds: [],
    engagedPlayerNames: [],
    engagedPlayerCount: 0,
  };
  const snapshot = {
    ready: true,
    playerName: "Own Knight",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget,
    visiblePlayers: [
      {
        id: 900,
        name: "Knight Alpha",
        position: { x: 103, y: 100, z: 8 },
      },
    ],
    visibleCreatures: [currentTarget],
    candidates: [currentTarget],
  };

  assert.equal(bot.chooseTarget(snapshot), null);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), false);
});

test("chooseTarget uses target profiles to prefer danger and finish windows over raw distance", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva", "Rotworm"],
    targetProfiles: [
      {
        name: "Larva",
        priority: 140,
        dangerLevel: 8,
        finishBelowPercent: 35,
        killMode: "asap",
      },
      {
        name: "Rotworm",
        priority: 60,
        dangerLevel: 1,
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Rotworm",
      position: { x: 101, y: 100, z: 8 },
      chebyshevDistance: 1,
      distance: 1,
      withinCombatBox: true,
      reachableForCombat: true,
      isCurrentTarget: true,
      healthPercent: 92,
      isShootable: true,
    },
    candidates: [
      {
        id: 10,
        name: "Rotworm",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isCurrentTarget: true,
        healthPercent: 92,
        isShootable: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 102, y: 101, z: 8 },
        dx: 2,
        dy: 1,
        dz: 0,
        chebyshevDistance: 2,
        distance: 3,
        withinCombatBox: true,
        reachableForCombat: true,
        isCurrentTarget: false,
        healthPercent: 18,
        isShootable: true,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 11);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [11, 10]);
});

test("chooseTarget lets dragon profile intent beat raw dragon-lord threat but keeps the current fight", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Dragon", "Dragon Lord"],
    targetProfiles: [
      {
        name: "Dragon",
        killMode: "asap",
        keepDistanceMin: 1,
        keepDistanceMax: 1,
        behavior: "kite",
        stickToTarget: true,
        avoidBeam: true,
        avoidWave: true,
      },
      {
        name: "Dragon Lord",
        killMode: "last",
        keepDistanceMin: 1,
        keepDistanceMax: 1,
        behavior: "kite",
        stickToTarget: true,
        avoidBeam: true,
        avoidWave: true,
      },
    ],
  });
  const dragon = {
    id: 10,
    name: "Dragon",
    position: { x: 99, y: 101, z: 8 },
    chebyshevDistance: 1,
    distance: 2,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };
  const dragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 101, y: 100, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const firstSelection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [dragon, dragonLord],
    candidates: [dragonLord, dragon],
  });

  assert.equal(firstSelection?.chosen?.name, "Dragon");

  const stickySelection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      ...dragonLord,
    },
    visibleCreatures: [
      dragon,
      dragonLord,
    ],
    candidates: [
      dragon,
      dragonLord,
    ],
  });

  assert.equal(stickySelection, null);
});

test("chooseTarget keeps a sticky damaged reach target over a fresh close dragon", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Dragon", "Dragon Lord"],
    combatRangeX: 1,
    combatRangeY: 1,
    targetProfiles: [
      {
        name: "Dragon",
        priority: 100,
        stickToTarget: true,
      },
      {
        name: "Dragon Lord",
        priority: 100,
        stickToTarget: true,
      },
    ],
  });
  const currentDragon = {
    id: 10,
    name: "Dragon",
    position: { x: 103, y: 101, z: 8 },
    chebyshevDistance: 3,
    distance: 4,
    withinCombatBox: false,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 22,
  };
  const freshDragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 101, y: 100, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const selection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: currentDragon,
    visibleCreatures: [freshDragonLord, currentDragon],
    candidates: [freshDragonLord],
  });

  assert.equal(selection, null);
});

test("chooseTarget uses finish windows as a standalone directive only below the threshold", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Dragon", "Dragon Lord"],
    targetProfiles: [
      {
        name: "Dragon",
        finishBelowPercent: 80,
      },
    ],
  });
  const makeDragon = (healthPercent) => ({
    id: 10,
    name: "Dragon",
    position: { x: 101, y: 100, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent,
  });
  const dragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 100, y: 101, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const lowHealthSelection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [dragonLord, makeDragon(79)],
    visibleCreatures: [dragonLord, makeDragon(79)],
  });
  assert.equal(lowHealthSelection?.chosen?.name, "Dragon");

  const aboveWindowSelection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [makeDragon(81), dragonLord],
    visibleCreatures: [makeDragon(81), dragonLord],
  });
  assert.equal(aboveWindowSelection?.chosen?.name, "Dragon Lord");
});

test("chooseTarget applies finish windows to reach-attack candidates", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Dragon", "Dragon Lord"],
    combatRangeX: 0,
    combatRangeY: 0,
    targetProfiles: [
      {
        name: "Dragon",
        finishBelowPercent: 80,
      },
    ],
  });
  const dragon = {
    id: 10,
    name: "Dragon",
    position: { x: 102, y: 100, z: 8 },
    chebyshevDistance: 2,
    distance: 2,
    withinCombatBox: false,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 30,
  };
  const dragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 103, y: 100, z: 8 },
    chebyshevDistance: 3,
    distance: 3,
    withinCombatBox: false,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const selection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [dragonLord, dragon],
  });

  assert.equal(selection?.chosen?.name, "Dragon");
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.name), ["Dragon", "Dragon Lord"]);
});

test("chooseTarget applies base finish windows to alpha variants", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Dragon", "Dragon Lord"],
    targetProfiles: [
      {
        name: "Dragon",
        finishBelowPercent: 80,
      },
    ],
  });
  const alphaDragon = {
    id: 10,
    name: "Alpha Dragon",
    position: { x: 101, y: 100, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 50,
  };
  const dragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 100, y: 101, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const selection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [dragonLord, alphaDragon],
    visibleCreatures: [dragonLord, alphaDragon],
  });

  assert.equal(selection?.chosen?.name, "Alpha Dragon");
});

test("follow-train attack targeting applies finish windows", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
    partyFollowDistance: 2,
    monsterNames: ["Dragon", "Dragon Lord"],
    targetProfiles: [
      {
        name: "Dragon",
        finishBelowPercent: 80,
      },
    ],
  });
  const dragon = {
    id: 10,
    name: "Dragon",
    position: { x: 101, y: 100, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 45,
  };
  const dragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 100, y: 101, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const selection = bot.chooseTarget({
    ready: true,
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    currentFollowTarget: {
      id: 1,
      name: "Knight Alpha",
      position: { x: 99, y: 100, z: 8 },
    },
    visiblePlayers: [
      {
        id: 1,
        name: "Knight Alpha",
        position: { x: 99, y: 100, z: 8 },
      },
    ],
    visibleCreatures: [dragonLord, dragon],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(selection?.chosen?.name, "Dragon");
});

test("rookiller targeting applies finish windows through the shared target sorter", () => {
  const bot = new MinibiaTargetBot({
    targetProfiles: [
      {
        name: "Dragon",
        finishBelowPercent: 80,
      },
    ],
  });
  const dragon = {
    id: 10,
    name: "Dragon",
    position: { x: 101, y: 100, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 20,
  };
  const dragonLord = {
    id: 11,
    name: "Dragon Lord",
    position: { x: 100, y: 101, z: 8 },
    chebyshevDistance: 1,
    distance: 1,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    healthPercent: 100,
  };

  const selection = bot.chooseRookillerTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [dragonLord, dragon],
    candidates: [dragonLord, dragon],
  });

  assert.equal(selection?.chosen?.name, "Dragon");
});

test("chooseTarget targets alpha variants and stronger Minibia monsters before weaker nearby monsters", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva", "Scarab"],
  });
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 100,
      },
      {
        id: 11,
        name: "Scarab",
        position: { x: 102, y: 102, z: 8 },
        dx: 2,
        dy: 2,
        dz: 0,
        chebyshevDistance: 2,
        distance: 4,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 100,
      },
      {
        id: 12,
        name: "Alpha Larva",
        position: { x: 103, y: 102, z: 8 },
        dx: 3,
        dy: 2,
        dz: 0,
        chebyshevDistance: 3,
        distance: 5,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 100,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.name, "Alpha Larva");
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.name), [
    "Alpha Larva",
    "Scarab",
    "Larva",
  ]);
});

test("chooseTarget suppresses combat targeting while an escape-profile creature is visible", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Dragon", "Rat"],
    targetProfiles: [
      {
        name: "Dragon",
        behavior: "escape",
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
      {
        id: 11,
        name: "Rat",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
      {
        id: 11,
        name: "Rat",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
  };

  assert.equal(bot.chooseTarget(snapshot), null);
  assert.equal(bot.shouldHoldRouteForCombat(snapshot), true);
});

test("chooseTarget prefers the unscreened front monster over a weaker monster directly behind it", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 102, y: 100, z: 8 },
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isCurrentTarget: false,
        healthPercent: 100,
        isShootable: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isCurrentTarget: false,
        healthPercent: 8,
        isShootable: true,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 10);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [10, 11]);
});

test("chooseTarget retargets away from a screened current target when the blocker is now visible", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
  });

  bot.lastRetargetAt = Date.now() - 1500;
  bot.lastRetargetId = 11;
  bot.lastTargetSignature = "11";

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 11,
      name: "Larva",
      position: { x: 102, y: 100, z: 8 },
      dx: 2,
      dy: 0,
      dz: 0,
      chebyshevDistance: 2,
      distance: 2,
      withinCombatBox: true,
      reachableForCombat: true,
      isCurrentTarget: true,
      healthPercent: 8,
      isShootable: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 102, y: 100, z: 8 },
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isCurrentTarget: false,
        healthPercent: 100,
        isShootable: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isCurrentTarget: true,
        healthPercent: 8,
        isShootable: true,
      },
    ],
  };

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 10);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [10, 11]);
});

test("tick keeps defensive movement alive while reserving non-heal casts below the healing threshold", async () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 30,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
    spellCasterEnabled: true,
    spellCasterRules: [
      {
        enabled: true,
        words: "exori frigo",
        minManaPercent: 20,
        maxTargetDistance: 4,
        minTargetCount: 1,
        cooldownMs: 900,
        pattern: "any",
        requireTarget: true,
        requireStationary: false,
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerStats: {
      healthPercent: 24,
      mana: 160,
      manaPercent: 60,
    },
    candidates: [],
  };
  let healAttempts = 0;
  let spellAttempts = 0;
  let repositionAttempts = 0;

  bot.refresh = async () => snapshot;
  bot.castWords = async (action) => {
    if (action?.type === "heal") {
      healAttempts += 1;
      return { ok: false, reason: "cooldown" };
    }
    spellAttempts += 1;
    return { ok: true };
  };
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => ({ type: "reposition", moduleKey: "distanceKeeper" });
  bot.reposition = async () => {
    repositionAttempts += 1;
    return { ok: true };
  };
  bot.chooseSpellCaster = () => ({
    type: "attack-spell",
    moduleKey: "spellCaster",
    ruleIndex: 0,
    words: "exori frigo",
  });

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(healAttempts, 1);
  assert.equal(spellAttempts, 0);
  assert.equal(repositionAttempts, 1);
});

test("tick clears aggro and suppresses offensive actions while escape threats are visible", async () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: false,
    distanceKeeperEnabled: false,
    monsterNames: ["Dragon"],
    targetProfiles: [
      {
        name: "Dragon",
        behavior: "escape",
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 99,
      name: "Rat",
      position: { x: 100, y: 101, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
  };

  let clearAggroCalls = 0;
  let chooseTargetCalls = 0;
  let repositionCalls = 0;

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.handleRookiller = async () => ({ handled: false });
  bot.clearAggro = async () => {
    clearAggroCalls += 1;
    return { ok: true };
  };
  bot.chooseDistanceKeeper = () => ({
    type: "distance-keeper",
    moduleKey: "targetProfile:dragon",
    destination: { x: 99, y: 100, z: 8 },
    reason: "escape",
  });
  bot.reposition = async () => {
    repositionCalls += 1;
    return { ok: true };
  };
  bot.chooseTarget = () => {
    chooseTargetCalls += 1;
    return null;
  };

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(clearAggroCalls, 1);
  assert.equal(repositionCalls, 1);
  assert.equal(chooseTargetCalls, 0);
});

test("tick skips route spell casts while healing priority is active", async () => {
  const bot = new MinibiaTargetBot({
    healerEnabled: true,
    healerEmergencyHealthPercent: 30,
    healerRules: [
      {
        enabled: true,
        words: "exura vita",
        minHealthPercent: 0,
        maxHealthPercent: 30,
        minMana: 80,
        minManaPercent: 0,
        cooldownMs: 900,
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerStats: {
      healthPercent: 24,
      mana: 160,
      manaPercent: 60,
    },
    candidates: [],
  };
  let routeExecutions = 0;

  bot.refresh = async () => snapshot;
  bot.castWords = async (action) => {
    if (action?.type === "heal") {
      return { ok: false, reason: "cooldown" };
    }
    return { ok: true };
  };
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => ({
    kind: "cast",
    actionType: "route",
    words: "exani tera",
  });
  bot.executeRouteAction = async () => {
    routeExecutions += 1;
    return { ok: true };
  };
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(routeExecutions, 0);
});

test("chooseTarget and chooseRouteAction stop while cavebot pause is active", () => {
  const bot = new MinibiaTargetBot({
    cavebotPaused: true,
    autowalkEnabled: true,
    monsterNames: ["Dragon"],
    waypoints: [
      { x: 100, y: 100, z: 8, label: "Entry", type: "walk" },
      { x: 101, y: 100, z: 8, label: "North", type: "walk" },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
  };

  assert.equal(bot.chooseTarget(snapshot), null);
  assert.equal(bot.chooseRouteAction(snapshot), null);
});

test("chooseRouteAction still returns the route reset path while autowalk is off and cavebot pause is active", () => {
  const bot = new MinibiaTargetBot({
    cavebotPaused: true,
    autowalkEnabled: false,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, label: "Entry", type: "walk" },
      { x: 101, y: 100, z: 8, label: "North", type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.startRouteReset(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
});

test("chooseTarget still returns a combat target while route reset is active under cavebot pause", () => {
  const bot = new MinibiaTargetBot({
    cavebotPaused: true,
    autowalkEnabled: false,
    monsterNames: ["Dragon"],
    waypoints: [
      { x: 100, y: 100, z: 8, label: "Entry", type: "walk" },
      { x: 101, y: 100, z: 8, label: "North", type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.startRouteReset(0);

  const chosen = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 102, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 102, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
  });

  assert.equal(chosen?.chosen?.id, 10);
});

test("tick keeps utility modules live while cavebot pause is active", async () => {
  const bot = new MinibiaTargetBot({
    cavebotPaused: true,
    autoLightEnabled: true,
  });
  const snapshot = createModuleSnapshot({
    currentTarget: {
      id: 77,
      name: "Rat",
      position: { x: 101, y: 100, z: 8 },
    },
  });
  let clearAggroCalls = 0;
  let handleRookillerCalls = 0;
  let chooseTargetCalls = 0;
  let chooseRouteActionCalls = 0;
  let castCalls = 0;

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.clearAggro = async () => {
    clearAggroCalls += 1;
    return { ok: true };
  };
  bot.handleRookiller = async () => {
    handleRookillerCalls += 1;
    return { handled: false };
  };
  bot.chooseLight = () => ({
    type: "light",
    moduleKey: "autoLight",
    ruleIndex: 0,
    words: "utevo lux",
  });
  bot.castWords = async () => {
    castCalls += 1;
    return { ok: true };
  };
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseConvert = () => null;
  bot.chooseTarget = () => {
    chooseTargetCalls += 1;
    return null;
  };
  bot.chooseRouteAction = () => {
    chooseRouteActionCalls += 1;
    return null;
  };

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.equal(clearAggroCalls, 1);
  assert.equal(castCalls, 1);
  assert.equal(handleRookillerCalls, 0);
  assert.equal(chooseTargetCalls, 0);
  assert.equal(chooseRouteActionCalls, 0);
});

test("handlePausedCavebotTick ignores cavebot pause while route reset is active", async () => {
  const bot = new MinibiaTargetBot({
    cavebotPaused: true,
    autowalkEnabled: false,
    waypoints: [
      { x: 100, y: 100, z: 8, label: "Entry", type: "walk" },
      { x: 101, y: 100, z: 8, label: "North", type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.startRouteReset(0);

  const snapshot = createModuleSnapshot({
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    pathfinderAutoWalking: false,
    isMoving: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
  });

  const result = await bot.handlePausedCavebotTick(snapshot);

  assert.deepEqual(result, { handled: false });
});

test("tick casts auto light before downstream utility modules when darkness conditions match", async () => {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: true,
    autoLightRules: [
      {
        enabled: true,
        words: "utevo lux",
        minManaPercent: 25,
        cooldownMs: 3000,
        requireNoLight: true,
        requireNoTargets: false,
        requireStationary: false,
      },
    ],
    manaTrainerEnabled: true,
    manaTrainerRules: [
      {
        enabled: true,
        words: "utevo res ina",
        minHealthPercent: 95,
        minManaPercent: 85,
        maxManaPercent: 100,
        cooldownMs: 1400,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
    runeMakerEnabled: true,
    runeMakerRules: [
      {
        enabled: true,
        words: "adori blank",
        minHealthPercent: 95,
        minManaPercent: 80,
        maxManaPercent: 100,
        cooldownMs: 1400,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
  });

  const snapshot = createModuleSnapshot({
    hasLightCondition: false,
  });
  const calls = [];

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.handleRookiller = async () => ({ handled: false });
  bot.castWords = async (action) => {
    calls.push(action?.type || "cast");
    return { ok: true };
  };
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.deepEqual(calls, ["light"]);
});

test("tick can reach rune maker after light and mana trainer do not match", async () => {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: true,
    autoLightRules: [
      {
        enabled: true,
        words: "utevo lux",
        minManaPercent: 25,
        cooldownMs: 3000,
        requireNoLight: true,
        requireNoTargets: false,
        requireStationary: false,
      },
    ],
    manaTrainerEnabled: true,
    manaTrainerRules: [
      {
        enabled: true,
        words: "utevo res ina",
        minHealthPercent: 95,
        minManaPercent: 40,
        maxManaPercent: 60,
        cooldownMs: 1400,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
    runeMakerEnabled: true,
    runeMakerRules: [
      {
        enabled: true,
        words: "adori blank",
        minHealthPercent: 90,
        minManaPercent: 80,
        maxManaPercent: 100,
        cooldownMs: 1400,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
  });

  const snapshot = createModuleSnapshot({
    hasLightCondition: true,
    playerStats: {
      healthPercent: 100,
      mana: 220,
      manaPercent: 92,
    },
  });
  const calls = [];

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.handleRookiller = async () => ({ handled: false });
  bot.castWords = async (action) => {
    calls.push(action?.type || "cast");
    return { ok: true };
  };
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.deepEqual(calls, ["rune"]);
});

test("chooseTarget keeps a stable current target instead of re-targeting it after the retarget window expires", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    retargetMs: 800,
  });

  bot.lastRetargetAt = Date.now() - 1200;
  bot.lastTargetSignature = "10";

  const selection = bot.chooseTarget({
    ready: true,
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(selection, null);
});

test("chooseTarget keeps the current focus when lower-priority candidates change around it", () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva", "Rat"],
  });

  bot.lastRetargetAt = Date.now() - 1200;
  bot.lastTargetSignature = "10";

  const selection = bot.chooseTarget({
    ready: true,
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
      healthPercent: 70,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 70,
      },
      {
        id: 20,
        name: "Rat",
        position: { x: 103, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 100,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 70,
      },
      {
        id: 20,
        name: "Rat",
        position: { x: 103, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        healthPercent: 100,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(selection, null);
});

test("tick clears a foreign-engaged target before route and target selection under respect-others mode", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    sharedSpawnMode: "respect-others",
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });
  const calls = [];
  const snapshot = createModuleSnapshot({
    playerName: "Own Knight",
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
      engagedPlayerIds: ["900"],
      engagedPlayerNames: ["Knight Alpha"],
      engagedPlayerCount: 1,
    },
    visiblePlayers: [
      {
        id: 900,
        name: "Knight Alpha",
        position: { x: 103, y: 100, z: 8 },
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        engagedPlayerIds: ["900"],
        engagedPlayerNames: ["Knight Alpha"],
        engagedPlayerCount: 1,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        engagedPlayerIds: ["900"],
        engagedPlayerNames: ["Knight Alpha"],
        engagedPlayerCount: 1,
      },
    ],
  });

  bot.refresh = async () => snapshot;
  bot.handleReconnect = async () => ({ handled: false });
  bot.getActiveVocationProfile = async () => null;
  bot.attemptDeathHeal = async () => ({ result: { ok: false } });
  bot.isHealingPriorityActive = () => false;
  bot.attemptSustain = async () => ({ result: { ok: false } });
  bot.attemptHeal = async () => ({ result: { ok: false } });
  bot.clearAggro = async () => {
    calls.push("clear");
    return { ok: true };
  };
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.attemptTrainerEscape = async () => ({ result: { ok: false } });
  bot.handleRookiller = async () => ({ handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.attemptAutoEat = async () => ({ result: { ok: false } });
  bot.attemptEquipmentAutoReplace = async () => ({ result: { ok: false } });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptRefill = async () => ({ result: { ok: false } });
  bot.chooseFollowTrainSuspendAction = () => null;
  bot.chooseFollowTrainAction = () => null;
  bot.attemptLoot = async () => ({ result: { ok: false } });
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = (nextSnapshot) => {
    calls.push(nextSnapshot.currentTarget ? "target-with-current" : "target-cleared");
    return null;
  };
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.chooseAntiIdle = () => null;
  bot.performAntiIdle = async () => ({ ok: false });

  const result = await bot.tick();

  assert.equal(result?.currentTarget, null);
  assert.deepEqual(calls, ["clear", "target-cleared"]);
});

test("tick keeps retargeting available after a non-emergency heal succeeds", async () => {
  const bot = new MinibiaTargetBot({});
  const calls = [];
  const snapshot = {
    ready: true,
    currentTarget: null,
    candidates: [],
  };

  bot.refresh = async () => snapshot;
  bot.chooseHeal = () => ({
    type: "heal",
    moduleKey: "healer",
    ruleIndex: 0,
    words: "exura",
  });
  bot.isHealingPriorityActive = () => false;
  bot.castWords = async (action) => {
    calls.push(action?.type || "cast");
    return { ok: true };
  };
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => ({
    chosen: { id: 10, name: "Larva", position: { x: 101, y: 100, z: 8 } },
    candidates: [{ id: 10, name: "Larva", position: { x: 101, y: 100, z: 8 } }],
    signature: "10",
  });
  bot.target = async () => {
    calls.push("target");
    return { ok: true };
  };
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.deepEqual(calls, ["heal", "target"]);
});

test("tick can cast an attack spell after locking a fresh target in the same cycle", async () => {
  const bot = new MinibiaTargetBot({});
  const calls = [];
  const snapshot = {
    ready: true,
    currentTarget: null,
    candidates: [
      { id: 10, name: "Larva", position: { x: 101, y: 100, z: 8 } },
    ],
  };

  bot.refresh = async () => snapshot;
  bot.chooseHeal = () => null;
  bot.isHealingPriorityActive = () => false;
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => ({
    chosen: { id: 10, name: "Larva", position: { x: 101, y: 100, z: 8 } },
    candidates: [{ id: 10, name: "Larva", position: { x: 101, y: 100, z: 8 } }],
    signature: "10",
  });
  bot.target = async () => {
    calls.push("target");
    return { ok: true };
  };
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => ({
    type: "attack-spell",
    moduleKey: "spellCaster",
    ruleIndex: 0,
    words: "exori frigo",
  });
  bot.castWords = async (action) => {
    calls.push(action?.type || "cast");
    return { ok: true };
  };
  bot.chooseConvert = () => null;

  const result = await bot.tick();

  assert.equal(result, snapshot);
  assert.deepEqual(calls, ["target", "attack-spell"]);
});

test("chooseTarget preempts an in-progress route walk when a reachable monster enters the combat box", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 2,
    combatRangeY: 2,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.lastWalkKey = "101,100,8";
  bot.lastWalkAt = Date.now();

  const selection = bot.chooseTarget({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 101, z: 8 },
        dx: 1,
        dy: 1,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: true,
      },
    ],
    isMoving: true,
    pathfinderAutoWalking: true,
    pathfinderFinalDestination: { x: 101, y: 100, z: 8 },
  });

  assert.equal(selection?.chosen?.id, 10);
  assert.deepEqual(selection?.candidates.map((candidate) => candidate.id), [10]);
});

test("chooseDistanceKeeper can use target profile spacing even when the distance module is off", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        keepDistanceMin: 3,
        keepDistanceMax: 4,
        behavior: "kite",
        avoidWave: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 101, y: 100, z: 8 },
      dx: 1,
      dy: 0,
      dz: 0,
      chebyshevDistance: 1,
      distance: 1,
      withinCombatBox: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.match(String(action?.moduleKey || ""), /^targetProfile:/);
  assert.equal(
    action?.destination?.x !== 100 || action?.destination?.y !== 100,
    true,
  );
  assert.match(String(action?.reason || ""), /^(?:retreat|dodge)$/);
});

test("chooseDistanceKeeper uses escape target profiles to run away from configured creatures", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    monsterNames: ["Dragon"],
    targetProfiles: [
      {
        name: "Dragon",
        behavior: "escape",
      },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    safeTiles: [
      { x: 99, y: 99, z: 8 },
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 101, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 99, z: 8 },
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 101, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  const action = bot.chooseDistanceKeeper(snapshot);

  assert.equal(action?.type, "distance-keeper");
  assert.equal(action?.reason, "escape");
  assert.equal(action?.destination?.x, 99);
  assert.ok(Math.abs(Number(action?.destination?.y) - 100) <= 1);
});

test("normalizeOptions maps external chase and stand behavior names onto the runtime model", () => {
  const options = normalizeOptions({
    distanceKeeperRules: [
      {
        minTargetDistance: 2,
        maxTargetDistance: 3,
        behavior: "chase",
      },
    ],
    targetProfiles: [
      {
        name: "Dragon",
        stance: "aggressive chase",
        behavior: "stand",
      },
      {
        name: "Dragon Lord",
        behavior: "run",
      },
    ],
  });

  assert.equal(options.distanceKeeperRules[0]?.behavior, "kite");
  assert.equal(options.targetProfiles[0]?.chaseMode, "aggressive");
  assert.equal(options.targetProfiles[0]?.behavior, "hold");
  assert.equal(options.targetProfiles[1]?.behavior, "escape");
});

test("auto ranged distance keeper retreats for paladins without custom rules", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "auto",
    vocation: "paladin",
    monsterNames: ["Rat"],
    distanceKeeperEnabled: false,
    distanceKeeperRules: [],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerName: "Paladin Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 101, y: 100, z: 7 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    reachableTiles: [
      { x: 99, y: 99, z: 7 },
      { x: 99, y: 100, z: 7 },
      { x: 99, y: 101, z: 7 },
      { x: 100, y: 100, z: 7 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.equal(action?.moduleKey, "autoRangedDistanceKeeper");
  assert.ok(["dodge", "retreat"].includes(action?.reason));
  assert.ok(action.nextDistance > action.currentDistance);
});

test("auto ranged distance keeper also protects non-knight follow-train followers", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "auto",
    vocation: "sorcerer",
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Mage Beta"],
    partyFollowCombatMode: "follow-only",
    monsterNames: ["Rat"],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerName: "Mage Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    currentFollowTarget: {
      id: 10,
      name: "Knight Alpha",
      position: { x: 100, y: 101, z: 7 },
    },
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 101, y: 100, z: 7 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    visiblePlayers: [
      {
        id: 10,
        name: "Knight Alpha",
        position: { x: 100, y: 101, z: 7 },
      },
    ],
    candidates: [],
    reachableTiles: [
      { x: 99, y: 99, z: 7 },
      { x: 99, y: 100, z: 7 },
      { x: 99, y: 101, z: 7 },
      { x: 100, y: 100, z: 7 },
      { x: 101, y: 99, z: 7 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(bot.isFollowTrainFollowOnly({ ready: true, playerName: "Mage Beta" }), true);
  assert.equal(action?.moduleKey, "autoRangedDistanceKeeper");
  assert.ok(action.nextDistance > action.currentDistance);
});

test("route reset forces chase-style target spacing to stand still instead of re-approaching", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    distanceKeeperEnabled: false,
    monsterNames: ["Dragon"],
    targetProfiles: [
      {
        name: "Dragon",
        keepDistanceMin: 1,
        keepDistanceMax: 2,
        behavior: "kite",
      },
    ],
    waypoints: [
      { x: 200, y: 200, z: 8, type: "walk" },
    ],
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 103, y: 100, z: 8 },
      dx: 3,
      dy: 0,
      dz: 0,
      chebyshevDistance: 3,
      distance: 3,
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 103, y: 100, z: 8 },
        dx: 3,
        dy: 0,
        dz: 0,
        chebyshevDistance: 3,
        distance: 3,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 103, y: 100, z: 8 },
        dx: 3,
        dy: 0,
        dz: 0,
        chebyshevDistance: 3,
        distance: 3,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    reachableTiles: [
      { x: 99, y: 99, z: 8 },
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 101, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  const chaseAction = bot.chooseDistanceKeeper(snapshot);
  assert.equal(chaseAction?.type, "distance-keeper");
  assert.equal(chaseAction?.reason, "approach");
  assert.equal(chaseAction?.destination?.x, 101);

  bot.startRouteReset(0);

  const standAction = bot.chooseDistanceKeeper(snapshot);
  assert.equal(standAction, null);
});

test("chooseDistanceKeeper treats diagonal monster positions as wave-safe and stays put", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon Lord",
        avoidWave: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon Lord",
      position: { x: 101, y: 99, z: 8 },
      dx: 1,
      dy: -1,
      dz: 0,
      chebyshevDistance: 1,
      distance: 2,
      withinCombatBox: true,
      reachableForCombat: true,
      isDiagonalAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon Lord",
        position: { x: 101, y: 99, z: 8 },
        dx: 1,
        dy: -1,
        dz: 0,
        chebyshevDistance: 1,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isDiagonalAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon Lord",
        position: { x: 101, y: 99, z: 8 },
        dx: 1,
        dy: -1,
        dz: 0,
        chebyshevDistance: 1,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isDiagonalAligned: true,
      },
    ],
    safeTiles: [
      { x: 99, y: 99, z: 8 },
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 101, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 99, z: 8 },
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 101, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action, null);
});

test("chooseDistanceKeeper closes dragons to adjacent diagonal melee range", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        keepDistanceMin: 1,
        keepDistanceMax: 1,
        behavior: "kite",
        avoidBeam: true,
        avoidWave: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 102, y: 100, z: 8 },
      dx: 2,
      dy: 0,
      dz: 0,
      chebyshevDistance: 2,
      distance: 2,
      withinCombatBox: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    safeTiles: [
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.equal(action?.destination?.x, 101);
  assert.equal(Math.abs(Number(action?.destination?.y) - 100), 1);
  assert.equal(action?.nextDistance, 1);
  assert.equal(action?.reason, "approach");
});

test("chooseDistanceKeeper plans toward a reachable alternate diagonal edge instead of forcing the near axis", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        keepDistanceMin: 1,
        keepDistanceMax: 1,
        behavior: "kite",
        avoidBeam: true,
        avoidWave: true,
      },
    ],
  });

  const target = {
    id: 10,
    name: "Dragon",
    position: { x: 103, y: 100, z: 8 },
    dx: 3,
    dy: 0,
    dz: 0,
    chebyshevDistance: 3,
    distance: 3,
    withinCombatBox: true,
    withinCombatWindow: true,
    reachableForCombat: true,
    isAxisAligned: true,
  };
  const reachableTiles = [
    { x: 100, y: 100, z: 8 },
    { x: 101, y: 100, z: 8 },
    { x: 100, y: 101, z: 8 },
    { x: 101, y: 101, z: 8 },
    { x: 102, y: 101, z: 8 },
  ];

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: target,
    candidates: [target],
    visibleCreatures: [target],
    safeTiles: reachableTiles,
    reachableTiles,
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.notDeepEqual(action?.destination, { x: 101, y: 100, z: 8 });
  assert.deepEqual(action?.destination, { x: 101, y: 101, z: 8 });
  assert.deepEqual(action?.plannedStance, { x: 102, y: 101, z: 8 });
  assert.equal(action?.reason, "approach");
});

test("chooseDistanceKeeper hard-chases melee hold profiles instead of freezing on far beam risk", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "aggressive",
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        behavior: "hold",
        avoidBeam: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 103, y: 100, z: 8 },
      dx: 3,
      dy: 0,
      dz: 0,
      chebyshevDistance: 3,
      distance: 3,
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 103, y: 100, z: 8 },
        dx: 3,
        dy: 0,
        dz: 0,
        chebyshevDistance: 3,
        distance: 3,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 103, y: 100, z: 8 },
        dx: 3,
        dy: 0,
        dz: 0,
        chebyshevDistance: 3,
        distance: 3,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.equal(action?.reason, "approach");
  assert.deepEqual(action?.destination, { x: 101, y: 100, z: 8 });
});

test("chooseDistanceKeeper advances one safe tile toward reach-window melee targets outside the combat box", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "aggressive",
    distanceKeeperEnabled: false,
    monsterNames: ["Dragon"],
    targetProfiles: [
      {
        name: "Dragon",
        behavior: "hold",
        avoidBeam: true,
        stickToTarget: false,
      },
    ],
  });

  const currentTarget = {
    id: 10,
    name: "Dragon",
    position: { x: 106, y: 101, z: 8 },
    dx: 6,
    dy: 1,
    dz: 0,
    chebyshevDistance: 6,
    distance: 7,
    withinCombatBox: false,
    withinCombatWindow: true,
    reachableForCombat: true,
    isCurrentTarget: true,
  };

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget,
    candidates: [],
    visibleCreatures: [currentTarget],
    hazardTiles: [
      {
        position: { x: 101, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Stairs"],
      },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.equal(action?.reason, "approach");
  assert.equal(action?.currentDistance, 6);
  assert.equal(action?.nextDistance, 6);
  assert.deepEqual(action?.destination, { x: 100, y: 101, z: 8 });
});

test("chooseDistanceKeeper does not diagonal-step through avoid tile rules", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        keepDistanceMin: 1,
        keepDistanceMax: 1,
        behavior: "kite",
        avoidBeam: true,
        avoidWave: true,
      },
    ],
    tileRules: [
      { x: 101, y: 100, z: 8, policy: "avoid", trigger: "approach" },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 102, y: 100, z: 8 },
      dx: 2,
      dy: 0,
      dz: 0,
      chebyshevDistance: 2,
      distance: 2,
      withinCombatBox: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 102, y: 100, z: 8 },
        dx: 2,
        dy: 0,
        dz: 0,
        chebyshevDistance: 2,
        distance: 2,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    safeTiles: [
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.notEqual(action?.destination?.x, 101);
});

test("chooseDistanceKeeper only steps onto reachable unoccupied dodge tiles", () => {
  const bot = new MinibiaTargetBot({
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        avoidBeam: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 101, y: 100, z: 8 },
      dx: 1,
      dy: 0,
      dz: 0,
      chebyshevDistance: 1,
      distance: 1,
      withinCombatBox: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
      {
        id: 11,
        name: "Larva",
        position: { x: 100, y: 99, z: 8 },
        dx: 0,
        dy: -1,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action?.type, "distance-keeper");
  assert.deepEqual(action?.destination, { x: 100, y: 101, z: 8 });
  assert.equal(action?.reason, "dodge");
});

test("chooseDistanceKeeper never dodges onto holes even when hole avoidance is disabled", () => {
  const bot = new MinibiaTargetBot({
    avoidElementalFields: false,
    avoidFieldCategories: {
      holes: false,
      stairsLadders: false,
    },
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        avoidBeam: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 101, y: 100, z: 8 },
      dx: 1,
      dy: 0,
      dz: 0,
      chebyshevDistance: 1,
      distance: 1,
      withinCombatBox: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    hazardTiles: [
      {
        position: { x: 99, y: 100, z: 8 },
        categories: ["holes"],
        labels: ["Hole"],
      },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 99, y: 100, z: 8 },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action, null);
});

test("chooseDistanceKeeper never dodges onto stairs or ladders even when stair avoidance is disabled", () => {
  const bot = new MinibiaTargetBot({
    avoidElementalFields: false,
    avoidFieldCategories: {
      stairsLadders: false,
    },
    distanceKeeperEnabled: false,
    targetProfiles: [
      {
        name: "Dragon",
        avoidBeam: true,
      },
    ],
  });

  const action = bot.chooseDistanceKeeper({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 101, y: 100, z: 8 },
      dx: 1,
      dy: 0,
      dz: 0,
      chebyshevDistance: 1,
      distance: 1,
      withinCombatBox: true,
      reachableForCombat: true,
      isAxisAligned: true,
    },
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
    ],
    hazardTiles: [
      {
        position: { x: 99, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Ladder"],
      },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 99, y: 100, z: 8 },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
  });

  assert.equal(action, null);
});

test("chooseDistanceKeeper avoids route floor-transition waypoints while wave dodging", () => {
  for (const type of ["stairs-down", "shovel-hole"]) {
    const bot = new MinibiaTargetBot({
      autowalkEnabled: true,
      autowalkLoop: true,
      chaseMode: "aggressive",
      avoidElementalFields: false,
      avoidFieldCategories: {
        holes: false,
        stairsLadders: false,
      },
      distanceKeeperEnabled: false,
      monsterNames: ["Dragon"],
      targetProfiles: [
        {
          name: "Dragon",
          avoidWave: true,
        },
      ],
      waypoints: [
        { x: 100, y: 99, z: 8, type },
      ],
    });

    const action = bot.chooseDistanceKeeper({
      ready: true,
      playerPosition: { x: 100, y: 100, z: 8 },
      currentTarget: {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
        chebyshevDistance: 1,
        distance: 1,
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
        isAxisAligned: true,
      },
      candidates: [
        {
          id: 10,
          name: "Dragon",
          position: { x: 101, y: 100, z: 8 },
          dx: 1,
          dy: 0,
          dz: 0,
          chebyshevDistance: 1,
          distance: 1,
          withinCombatBox: true,
          withinCombatWindow: true,
          reachableForCombat: true,
          isAxisAligned: true,
        },
      ],
      visibleCreatures: [
        {
          id: 10,
          name: "Dragon",
          position: { x: 101, y: 100, z: 8 },
          dx: 1,
          dy: 0,
          dz: 0,
          chebyshevDistance: 1,
          distance: 1,
          withinCombatBox: true,
          withinCombatWindow: true,
          reachableForCombat: true,
          isAxisAligned: true,
        },
      ],
      hazardTiles: [],
      reachableWalkableTiles: [
        { x: 100, y: 100, z: 8 },
        { x: 100, y: 99, z: 8 },
        { x: 100, y: 101, z: 8 },
      ],
      safeTiles: [
        { x: 100, y: 100, z: 8 },
        { x: 100, y: 99, z: 8 },
        { x: 100, y: 101, z: 8 },
      ],
      isMoving: false,
      pathfinderAutoWalking: false,
    });

    assert.equal(action?.type, "distance-keeper", type);
    assert.deepEqual(action?.destination, { x: 100, y: 101, z: 8 }, type);
    assert.equal(action?.reason, "dodge", type);
  }
});

test("chooseRouteAction holds the route while the current target is still a visible tracked monster outside the local combat box", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 1,
    combatRangeY: 1,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.lastTargetSignature = "10";
  bot.lastRetargetId = 10;

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 103, y: 100, z: 8 },
      dx: 3,
      dy: 0,
      dz: 0,
      reachableForCombat: true,
      withinCombatBox: false,
    },
    allMatches: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 100, z: 8 },
        dx: 3,
        dy: 0,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: false,
      },
    ],
    candidates: [],
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 100, z: 8 },
        dx: 3,
        dy: 0,
        dz: 0,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.shouldHoldRouteForCombat(snapshot), true);
  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.blockedWaypointRetryKey, "101,100,8");
});

test("chooseRouteAction keeps the original waypoint when the route target is still walkable", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 105, y: 100, z: 8, type: "walk" },
      { x: 106, y: 100, z: 8, type: "walk" },
      { x: 107, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(1);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 106, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
});

test("chooseRouteAction recovers to the closest waypoint even when it falls outside the forward lookahead", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: Array.from({ length: 60 }, (_entry, index) => ({
      x: 100 + (index * 3),
      y: 100,
      z: 8,
      type: "walk",
    })),
  });

  bot.resetRoute(30);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 107, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
});

test("resyncRouteProgress hard-reanchors from the live reachable waypoint after 2 seconds stationary", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 1_000;
  bot.getNow = () => now;
  bot.resetRoute(5);
  bot.markWaypointConfirmed(6, now - 100);

  const snapshot = {
    ready: true,
    playerPosition: { x: 6, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.resyncRouteProgress(snapshot), false);
  assert.equal(bot.routeIndex, 5);
  assert.equal(bot.lastConfirmedWaypointIndex, 6);

  now += 2_001;
  snapshot.reachableTiles = [
    { x: 6, y: 0, z: 8 },
    { x: 6, y: 2, z: 8 },
  ];

  assert.equal(bot.resyncRouteProgress(snapshot), true);
  assert.equal(bot.routeIndex, 2);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
});

test("resyncRouteProgress keeps the recorded route after 2 seconds stationary when exact waypoint following is enabled", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 1_000;
  bot.getNow = () => now;
  bot.resetRoute(5);
  bot.markWaypointConfirmed(6, now - 100);

  const snapshot = {
    ready: true,
    playerPosition: { x: 6, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.resyncRouteProgress(snapshot), false);
  assert.equal(bot.routeIndex, 5);

  now += 2_001;
  snapshot.reachableTiles = [
    { x: 6, y: 0, z: 8 },
    { x: 6, y: 2, z: 8 },
  ];

  assert.equal(bot.resyncRouteProgress(snapshot), true);
  assert.equal(bot.routeIndex, 5);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
});

test("resyncRouteProgress clears stale route progress after 2 seconds stationary even without reachable-tile proof", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 1_000;
  bot.getNow = () => now;
  bot.resetRoute(5);
  bot.markWaypointConfirmed(6, now - 100);
  bot.lastWalkAt = now - 50;
  bot.lastWalkKey = "110,100,8";
  bot.lastWalkOriginKey = "6,0,8";
  bot.lastWalkProgressPending = true;

  const snapshot = {
    ready: true,
    playerPosition: { x: 6, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.resyncRouteProgress(snapshot), false);

  now += 2_001;

  assert.equal(bot.resyncRouteProgress(snapshot), true);
  assert.equal(bot.routeIndex, 5);
  assert.equal(bot.lastWalkAt, 0);
  assert.equal(bot.lastWalkKey, null);
  assert.equal(bot.lastWalkProgressPending, false);
  assert.equal(bot.lastWalkFailureCount, 0);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
});

test("chooseRouteAction ignores long walk repath cooldowns after 2 seconds stationary on the same tile", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    walkRepathMs: 10_000,
    waypoints: [
      { x: 10, y: 0, z: 8, type: "walk" },
    ],
  });

  let now = 1_000;
  const realDateNow = Date.now;
  Date.now = () => now;
  bot.getNow = () => now;
  bot.resetRoute(0);
  bot.lastWalkAt = now - 100;
  bot.lastWalkKey = "10,0,8";
  bot.lastWalkOriginKey = "0,0,8";
  bot.lastWalkProgressPending = true;

  const snapshot = {
    ready: true,
    playerPosition: { x: 0, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  try {
    assert.equal(bot.chooseRouteAction(snapshot), null);

    now += 2_001;

    const action = bot.chooseRouteAction(snapshot);
    assert.equal(action?.kind, "walk");
    assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
    assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  } finally {
    Date.now = realDateNow;
  }
});

test("chooseRouteAction immediately reissues a route walk after the last click made progress", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    walkRepathMs: 10_000,
    waypoints: [
      { x: 10, y: 0, z: 8, type: "walk" },
    ],
  });

  let now = 1_000;
  const realDateNow = Date.now;
  Date.now = () => now;
  bot.getNow = () => now;
  bot.resetRoute(0);
  bot.lastWalkAt = now - 100;
  bot.lastWalkKey = "10,0,8";
  bot.lastWalkDestinationKey = "4,0,8";
  bot.lastWalkOriginKey = "0,0,8";
  bot.lastWalkProgressPending = false;

  try {
    const action = bot.chooseRouteAction({
      ready: true,
      playerPosition: { x: 3, y: 0, z: 8 },
      currentTarget: null,
      candidates: [],
      visibleCreatures: [],
      isMoving: false,
      pathfinderAutoWalking: false,
      pathfinderFinalDestination: null,
    });

    assert.equal(action?.kind, "walk");
    assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
    assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  } finally {
    Date.now = realDateNow;
  }
});

test("chooseRouteAction glides to the farthest safe reachable waypoint on a plain route segment", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 105, y: 100, z: 8, type: "walk" },
    ],
  });

  assert.equal(bot.options.routeFollowExactWaypoints, true);
  bot.resetRoute(0);
  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
      { x: 103, y: 100, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.deepEqual(action?.destination, bot.options.waypoints[3]);
  assert.equal(action?.progressKey, "101,100,8");
  assert.equal(action?.walkReason, "glide");
  assert.equal(action?.glideTargetIndex, 3);
});

test("chooseRouteAction does not glide through route automation waypoints", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "bank" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
      { x: 103, y: 100, z: 8 },
    ],
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  assert.equal(action?.walkReason, "direct");
  assert.equal(action?.glideTargetIndex, null);
});

test("resyncRouteProgress relatches exact route state to a recently accepted glide destination", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 105, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 5_000;
  bot.getNow = () => now;
  assert.equal(bot.options.routeFollowExactWaypoints, true);
  bot.resetRoute(0);
  bot.setLastWalkAttempt("101,100,8", { x: 100, y: 100, z: 8 }, {
    destination: bot.options.waypoints[4],
    glideTargetIndex: 4,
    now: now - 500,
    pendingProgress: false,
  });

  const resynced = bot.resyncRouteProgress({
    ready: true,
    playerPosition: { x: 105, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(resynced, true);
  assert.equal(bot.routeIndex, 4);
});

test("chooseRouteAction chains the next waypoint while the movement flag is settling", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    walkRepathMs: 1200,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: true,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(action?.destination, bot.options.waypoints[1]);
});

test("resyncRouteProgress relatches to the exact confirmed waypoint even without reachable-tile proof", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(5);
  bot.markWaypointConfirmed(2, Date.now() - 100);

  const snapshot = {
    ready: true,
    playerPosition: { x: 6, y: 2, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.resyncRouteProgress(snapshot), true);
  assert.equal(bot.routeIndex, 2);
  assert.equal(bot.lastConfirmedWaypointIndex, 2);
});

test("resyncRouteProgress lets a nearby reachable candidate override a stale wrapped anchor", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 0, z: 8, type: "walk" },
      { x: 10, y: 0, z: 8, type: "walk" },
      { x: 20, y: 0, z: 8, type: "walk" },
      { x: 30, y: 0, z: 8, type: "walk" },
      { x: 40, y: 0, z: 8, type: "walk" },
      { x: 50, y: 0, z: 8, type: "walk" },
      { x: 60, y: 0, z: 8, type: "walk" },
      { x: 70, y: 0, z: 8, type: "walk" },
      { x: 80, y: 0, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(8);
  bot.markWaypointConfirmed(0, Date.now() - 100);

  const snapshot = {
    ready: true,
    playerPosition: { x: 41, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 41, y: 0, z: 8 },
      { x: 40, y: 0, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.resyncRouteProgress(snapshot), true);
  assert.equal(bot.routeIndex, 4);
});

test("chooseRouteAction keeps the original branch when a stale anchor still has a valid route back", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 20, z: 8, type: "walk" },
      { x: 2, y: 20, z: 8, type: "walk" },
      { x: 4, y: 20, z: 8, type: "walk" },
      { x: 6, y: 20, z: 8, type: "walk" },
      { x: 8, y: 20, z: 8, type: "walk" },
      { x: 0, y: 0, z: 8, type: "walk" },
      { x: 1, y: 0, z: 8, type: "walk" },
      { x: 2, y: 0, z: 8, type: "walk" },
      { x: 3, y: 0, z: 8, type: "walk" },
      { x: 4, y: 0, z: 8, type: "walk" },
      { x: 5, y: 0, z: 8, type: "walk" },
      { x: 6, y: 0, z: 8, type: "walk" },
      { x: 7, y: 0, z: 8, type: "walk" },
      { x: 8, y: 0, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.markWaypointConfirmed(5, Date.now() - 100);
  bot.noteWaypointTouch(10);
  bot.noteWaypointTouch(11);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 7, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
});

test("chooseRouteAction force-full-sweeps to a reachable wrapped branch without fresh waypoint touches", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(5);
  bot.markWaypointConfirmed(6, Date.now() - 100);
  bot.resolveRouteWalkDestination = (_snapshot, waypoint) => {
    if (waypoint === bot.options.waypoints[2]) {
      return {
        destination: waypoint,
        reason: "recovery",
        progressKey: `${waypoint.x},${waypoint.y},${waypoint.z}`,
      };
    }

    return null;
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 6, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 6, y: 0, z: 8 },
      { x: 6, y: 2, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(action?.destination, bot.options.waypoints[2]);
});

test("chooseRouteAction keeps the recorded route instead of force-full-sweeping onto a later reachable branch in exact mode", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(5);
  bot.markWaypointConfirmed(6, Date.now() - 100);
  bot.resolveRouteWalkDestination = (_snapshot, waypoint) => {
    if (waypoint === bot.options.waypoints[2]) {
      return {
        destination: waypoint,
        reason: "recovery",
        progressKey: `${waypoint.x},${waypoint.y},${waypoint.z}`,
      };
    }

    return null;
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 6, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 6, y: 0, z: 8 },
      { x: 6, y: 2, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 5);
  assert.equal(action, null);
});

test("chooseRouteAction force-full-sweeps to an equal-distance reachable forward branch", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 10, y: 0, z: 8, type: "walk" },
      { x: 10, y: 10, z: 8, type: "walk" },
      { x: 0, y: 10, z: 8, type: "walk" },
      { x: -10, y: 10, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.markWaypointConfirmed(1, Date.now() - 100);
  bot.resolveRouteWalkDestination = (_snapshot, waypoint) => {
    if (waypoint === bot.options.waypoints[2]) {
      return {
        destination: waypoint,
        reason: "recovery",
        progressKey: `${waypoint.x},${waypoint.y},${waypoint.z}`,
      };
    }

    return null;
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 0, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 0, y: 0, z: 8 },
      { x: 0, y: 10, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(action?.destination, bot.options.waypoints[2]);
});

test("chooseRouteAction does not force-full-sweep to a closer branch without reachable-tile proof", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 0, y: 8, z: 8, type: "walk" },
      { x: 3, y: 5, z: 8, type: "walk" },
      { x: 6, y: 2, z: 8, type: "walk" },
      { x: 9, y: 0, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 110, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 130, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(5);
  bot.markWaypointConfirmed(6, Date.now() - 100);
  bot.resolveRouteWalkDestination = (_snapshot, waypoint) => {
    if (waypoint === bot.options.waypoints[2]) {
      return {
        destination: waypoint,
        reason: "recovery",
        progressKey: `${waypoint.x},${waypoint.y},${waypoint.z}`,
      };
    }

    return null;
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 6, y: 0, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 5);
  assert.equal(action, null);
});

test("chooseRouteAction prefers a reachable forward recovery waypoint over a closer unreachable branch", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 90, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(action?.destination, bot.options.waypoints[1]);
});

test("chooseRouteAction does not relatch forward just because the player is standing on the next waypoint", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.deepEqual(action?.destination, bot.options.waypoints[0]);
});

test("chooseRouteAction force-swipes the route forward when a stalled stale waypoint has a reachable next node", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    walkRepathMs: 50,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.lastWalkKey = "100,100,8";
  bot.lastWalkAt = Date.now() - 500;
  bot.lastWalkOriginKey = "101,100,8";
  bot.lastWalkProgressPending = true;

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    reachableTiles: [
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
      { x: 103, y: 100, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(action?.destination, bot.options.waypoints[1]);
});

test("chooseRouteAction skips helper waypoints during normal traversal", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "helper" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(action?.destination, bot.options.waypoints[2]);
});

test("chooseRouteAction can enter a helper trail after combat drift leaves the main route off-screen", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 108, y: 100, z: 8, type: "helper" },
      { x: 112, y: 100, z: 8, type: "helper" },
      { x: 116, y: 100, z: 8, type: "helper" },
      { x: 120, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 111, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.deepEqual(bot.helperWaypointRecoveryState?.helperIndices, [2, 3]);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(action?.destination, bot.options.waypoints[2]);
});

test("chooseRouteAction returns to the interrupted waypoint after a long combat chase", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 108, y: 100, z: 8, type: "walk" },
      { x: 116, y: 100, z: 8, type: "walk" },
      { x: 124, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.noteBlockedWaypointCombat(bot.options.waypoints[0], {
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 100, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 100, y: 100, z: 8 },
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 119, y: 100, z: 8 },
    currentTarget: null,
    allMatches: [],
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.equal(bot.blockedWaypointRetryKey, "100,100,8");
});

test("chooseRouteAction does not skip forward from combat vicinity onto a later waypoint", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.noteBlockedWaypointCombat(bot.options.waypoints[0], {
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 100, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 100, y: 100, z: 8 },
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    allMatches: [],
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.equal(bot.blockedWaypointRetryKey, "100,100,8");
});

test("chooseRouteAction keeps the anchored route when a later self-crossing waypoint overlaps the current location", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 108, y: 100, z: 8, type: "walk" },
      { x: 112, y: 100, z: 8, type: "walk" },
      { x: 112, y: 104, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 100, y: 104, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(2);
  bot.markWaypointConfirmed(1);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 104, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(bot.lastConfirmedWaypointIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
});

test("chooseRouteAction does not wrap backward through a shared tile after a recent confirmation", () => {
  const waypoints = Array.from({ length: 80 }, (_entry, index) => ({
    x: 1000 + (index * 10),
    y: 100,
    z: 8,
    type: "walk",
  }));

  waypoints[49] = { x: 99, y: 100, z: 8, type: "walk" };
  waypoints[50] = { x: 100, y: 100, z: 8, type: "walk" };
  waypoints[51] = { x: 101, y: 100, z: 8, type: "walk" };
  waypoints[60] = { x: 100, y: 100, z: 8, type: "walk" };
  waypoints[61] = { x: 110, y: 100, z: 8, type: "walk" };

  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints,
  });

  bot.resetRoute(61);
  bot.markWaypointConfirmed(60, Date.now() - 50);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 61);
  assert.equal(bot.lastConfirmedWaypointIndex, 60);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[61]);
});

test("chooseRouteAction keeps the live branch on a shared tile even before a fresh confirmation", () => {
  const waypoints = Array.from({ length: 80 }, (_entry, index) => ({
    x: 1000 + (index * 10),
    y: 100,
    z: 8,
    type: "walk",
  }));

  waypoints[49] = { x: 99, y: 100, z: 8, type: "walk" };
  waypoints[50] = { x: 100, y: 100, z: 8, type: "walk" };
  waypoints[51] = { x: 101, y: 100, z: 8, type: "walk" };
  waypoints[59] = { x: 99, y: 100, z: 8, type: "walk" };
  waypoints[60] = { x: 100, y: 100, z: 8, type: "walk" };
  waypoints[61] = { x: 110, y: 100, z: 8, type: "walk" };

  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints,
  });

  bot.resetRoute(61);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 61);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[61]);
});

test("chooseRouteAction does not relatch onto an ambiguous crossing without route continuity", () => {
  const waypoints = Array.from({ length: 64 }, (_entry, index) => ({
    x: 1000 + (index * 10),
    y: 500,
    z: 8,
    type: "walk",
  }));
  waypoints[0] = { x: 0, y: 0, z: 8, type: "walk" };
  waypoints[20] = { x: 50, y: 50, z: 8, type: "walk" };
  waypoints[44] = { x: 50, y: 50, z: 8, type: "walk" };

  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints,
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 50, y: 50, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.lastConfirmedWaypointIndex, null);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
});

test("chooseRouteAction keeps the anchored waypoint when recent route touches still allow the original route", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 108, y: 100, z: 8, type: "walk" },
      { x: 112, y: 100, z: 8, type: "walk" },
      { x: 116, y: 100, z: 8, type: "walk" },
      { x: 120, y: 100, z: 8, type: "walk" },
      { x: 124, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(2);
  bot.markWaypointConfirmed(1);
  bot.noteWaypointTouch(3);
  bot.noteWaypointTouch(4);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 120, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(bot.lastConfirmedWaypointIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
});

test("refresh resyncs the route index to the closest waypoint from the live player position", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 1,
    waypoints: Array.from({ length: 60 }, (_entry, index) => ({
      x: 100 + index,
      y: 100,
      z: 8,
      type: "walk",
    })),
  });

  bot.resetRoute(30);
  bot.page = { id: "page-1", url: "https://minibia.com/play" };
  bot.cdp = {
    async evaluate() {
      return {
        ready: true,
        playerPosition: { x: 102, y: 100, z: 8 },
        currentTarget: null,
        candidates: [],
        visibleCreatures: [],
      };
    },
  };
  bot.syncWaypointOverlay = async () => null;

  const snapshot = await bot.refresh({ emitSnapshot: false });

  assert.equal(snapshot.playerPosition.x, 102);
  assert.equal(bot.routeIndex, 2);
});

test("startRouteReset prefers the recorded waypoint spine when the loop wrap is a worse return", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(3);
  bot.startRouteReset(0);

  assert.deepEqual(bot.routeResetState?.pathIndices, [3, 2, 1, 0]);
  assert.equal(bot.routeIndex, 3);

  const stepThreeAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 103, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(stepThreeAction?.kind, "walk");
  assert.deepEqual(stepThreeAction?.waypoint, bot.options.waypoints[2]);

  const stepTwoAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 102, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(stepTwoAction?.kind, "walk");
  assert.deepEqual(stepTwoAction?.waypoint, bot.options.waypoints[1]);

  const stepOneAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(stepOneAction?.kind, "walk");
  assert.deepEqual(stepOneAction?.waypoint, bot.options.waypoints[0]);

  const holdAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(holdAction, null);
  assert.equal(bot.routeResetState?.phase, "holding");
  assert.equal(bot.routeResetState?.alerted, true);
});

test("startRouteReset still uses a loop wrap when the end of the route closes near waypoint 1", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 104, y: 104, z: 8, type: "walk" },
      { x: 100, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(3);
  bot.startRouteReset(0);

  assert.deepEqual(bot.routeResetState?.pathIndices, [3, 0]);
});

test("startRouteReset immediately releases route spacing coordination while returning", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  let releaseCalls = 0;
  bot.setRouteCoordinationAdapter({
    sync() {
      return null;
    },
    async release() {
      releaseCalls += 1;
      return null;
    },
  });
  bot.routeCoordinationState = {
    selfInstanceId: "alpha",
    members: [
      {
        instanceId: "alpha",
        routeIndex: 2,
        confirmedIndex: 1,
        startedAt: 1,
      },
      {
        instanceId: "beta",
        routeIndex: 0,
        confirmedIndex: 0,
        startedAt: 2,
      },
    ],
  };
  bot.routeSpacingHold = {
    peerInstanceId: "beta",
    startedAt: 1,
    lastLogAt: 1,
    reason: "gap",
    currentGap: 1,
    nextGap: 0,
  };
  bot.routeSpacingBypass = {
    createdAt: 1,
    peerInstanceId: "beta",
    routeIndex: 2,
    until: 10,
  };

  bot.resetRoute(2);
  bot.startRouteReset(0);

  assert.equal(releaseCalls, 1);
  assert.equal(bot.routeCoordinationState, null);
  assert.equal(bot.routeSpacingHold, null);
  assert.equal(bot.routeSpacingBypass, null);
  assert.equal(bot.routeResetState?.phase, "returning");
});

test("setOptions preserves active route reset when the route shape is unchanged", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    lootingEnabled: false,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(3);
  bot.startRouteReset(0);
  assert.deepEqual(bot.routeResetState?.pathIndices, [3, 2, 1, 0]);

  bot.setOptions({ ...bot.options, lootingEnabled: true });

  assert.equal(bot.options.lootingEnabled, true);
  assert.equal(bot.routeResetState?.phase, "returning");
  assert.deepEqual(bot.routeResetState?.pathIndices, [3, 2, 1, 0]);
  assert.equal(bot.routeIndex, 3);

  const returnAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 103, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(returnAction?.kind, "walk");
  assert.deepEqual(returnAction?.waypoint, bot.options.waypoints[2]);
});

test("setOptions clears active route reset when the route shape changes", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(3);
  bot.startRouteReset(0);
  assert.equal(bot.routeResetState?.phase, "returning");

  bot.setOptions({
    ...bot.options,
    waypoints: bot.options.waypoints.map((waypoint, index) => (
      index === 2 ? { ...waypoint, x: 112 } : waypoint
    )),
  });

  assert.equal(bot.routeResetState, null);
});

test("chooseRouteAction in route reset can retreat through an action waypoint without firing its jump", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "action", action: "goto", targetIndex: 3 },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.startRouteReset(0);

  assert.deepEqual(bot.routeResetState?.pathIndices, [1, 0]);

  const returnAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(returnAction?.kind, "walk");
  assert.deepEqual(returnAction?.waypoint, bot.options.waypoints[0]);
});

test("chooseRouteAction in reset hold mode returns to waypoint 1 after combat drift", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    monsterNames: ["Larva"],
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.startRouteReset(0);
  bot.holdRouteReset();

  const combatHoldAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 102, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 102, y: 100, z: 8 },
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 102, y: 100, z: 8 },
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(combatHoldAction, null);

  const returnAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(returnAction?.kind, "walk");
  assert.deepEqual(returnAction?.waypoint, bot.options.waypoints[0]);
  assert.deepEqual(returnAction?.destination, bot.options.waypoints[0]);
});

test("chooseRouteAction in reset hold mode interrupts lingering movement once waypoint 1 is reached", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.startRouteReset(0);
  bot.holdRouteReset();

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: true,
    pathfinderFinalDestination: { x: 100, y: 100, z: 8 },
  });

  assert.equal(action?.kind, "hold-route");
  assert.equal(action?.reason, "route-reset");
  assert.equal(action?.interrupt, true);
});

test("chooseRouteAction logs that route reset hold is still active every 30 seconds", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });
  const logs = [];
  let now = 1_000;

  bot.getNow = () => now;
  bot.on((event) => {
    if (event.type === "log") {
      logs.push(event.payload?.message || "");
    }
  });

  bot.startRouteReset(0);
  bot.holdRouteReset();
  logs.length = 0;

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  now += 30_000;
  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.ok(logs.includes("Return still holding waypoint 1 after 30s"));

  now += 10_000;
  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(logs.filter((message) => message === "Return still holding waypoint 1 after 30s").length, 1);

  now += 20_000;
  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.ok(logs.includes("Return still holding waypoint 1 after 60s"));
});

test("recordCorpseReturnDeath arms a corpse return from the last live position", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 102, y: 100, z: 7, type: "walk" },
    ],
  });

  const armed = bot.recordCorpseReturnDeath(
    {
      ready: false,
      reason: "dead",
      connection: {
        playerIsDead: true,
        deathModalVisible: true,
      },
    },
    createModuleSnapshot({
      playerPosition: { x: 102, y: 100, z: 7 },
      connection: {
        playerIsDead: false,
        deathModalVisible: false,
      },
    }),
  );

  assert.equal(armed?.phase, "armed");
  assert.deepEqual(bot.getCorpseReturnStatus().deathPosition, { x: 102, y: 100, z: 7 });
  assert.equal(bot.getCorpseReturnStatus().targetWaypointIndex, 1);
});

test("chooseRouteAction holds corpse return until the character is back near the cave route", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 102, y: 100, z: 7, type: "walk" },
    ],
  });

  bot.armCorpseReturn({ x: 102, y: 100, z: 7 });

  const farSnapshot = createModuleSnapshot({
    playerPosition: { x: 200, y: 200, z: 7 },
  });
  bot.lastSnapshot = farSnapshot;

  assert.equal(bot.chooseRouteAction(farSnapshot), null);
  assert.equal(bot.getCorpseReturnStatus().phase, "armed");
  assert.equal(bot.getRouteResetStatus().active, false);

  const routeSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 7 },
  });
  bot.lastSnapshot = routeSnapshot;

  const action = bot.chooseRouteAction(routeSnapshot);

  assert.equal(bot.getCorpseReturnStatus().phase, "returning-route");
  assert.equal(bot.getRouteResetStatus().active, true);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
});

test("chooseRouteAction switches corpse return from route reset to the recorded death tile", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 102, y: 100, z: 7, type: "walk" },
    ],
  });

  bot.armCorpseReturn({ x: 104, y: 100, z: 7 });

  const startSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 7 },
  });
  bot.lastSnapshot = startSnapshot;
  bot.chooseRouteAction(startSnapshot);

  const waypointSnapshot = createModuleSnapshot({
    playerPosition: { x: 102, y: 100, z: 7 },
  });
  bot.lastSnapshot = waypointSnapshot;

  const finalAction = bot.chooseRouteAction(waypointSnapshot);

  assert.equal(bot.getRouteResetStatus().active, false);
  assert.equal(bot.getCorpseReturnStatus().phase, "returning-corpse");
  assert.equal(finalAction?.kind, "walk");
  assert.deepEqual(finalAction?.waypoint, { x: 104, y: 100, z: 7 });

  const deathTileSnapshot = createModuleSnapshot({
    playerPosition: { x: 104, y: 100, z: 7 },
  });
  bot.lastSnapshot = deathTileSnapshot;

  assert.equal(bot.chooseRouteAction(deathTileSnapshot), null);
  assert.equal(bot.getCorpseReturnStatus().phase, "holding");
});

test("chooseRouteAction keeps the current waypoint when it is still nearby even if the route overlaps later", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 1,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: -2, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 98, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
});

test("chooseRouteAction advances a pass-through waypoint from vicinity after a recent walk attempt", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.lastWalkKey = "100,100,8";
  bot.lastWalkAt = Date.now();

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 101, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
});

test("chooseRouteAction does not advance a nearby waypoint from vicinity without movement evidence", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 101, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
});

test("chooseRouteAction keeps an exact walk waypoint on the recorded sqm after a recent adjacent walk attempt", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.lastWalkKey = "100,100,8";
  bot.lastWalkAt = Date.now();

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 101, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action, null);
});

test("chooseRouteAction keeps exact-tile requirements for interaction waypoints even after a nearby walk attempt", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "use-item" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.lastWalkKey = "100,100,8";
  bot.lastWalkAt = Date.now();

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 101, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action, null);
});

test("chooseRouteAction detours to a safe adjacent tile when an avoid rule blocks the exact waypoint sqm", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
    tileRules: [
      { x: 100, y: 100, z: 8, policy: "avoid", trigger: "approach" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    elementalFields: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, { x: 100, y: 99, z: 8 });
  assert.equal(action?.progressKey, "100,100,8");
});

test("chooseRouteAction holds an exact walk waypoint when an avoid rule blocks the recorded sqm", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
    tileRules: [
      { x: 100, y: 100, z: 8, policy: "avoid", trigger: "approach" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    elementalFields: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
  assert.equal(bot.routeIndex, 0);
});

test("avoid and danger-zone waypoints are hard no-go positions", () => {
  const bot = new MinibiaTargetBot({
    waypoints: [
      { x: 101, y: 100, z: 8, type: "avoid" },
      { x: 110, y: 110, z: 8, type: "danger-zone", radius: 1 },
    ],
  });

  assert.equal(bot.shouldAvoidPosition(createModuleSnapshot(), { x: 101, y: 100, z: 8 }), true);
  assert.equal(bot.shouldAvoidPosition(createModuleSnapshot(), { x: 111, y: 110, z: 8 }), true);
  assert.equal(bot.shouldAvoidPosition(createModuleSnapshot(), { x: 112, y: 110, z: 8 }), false);
});

test("chooseNoGoZoneEscape steps off a marked no-go sqm even when autowalk is disabled", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: false,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "danger-zone" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  const action = bot.chooseNoGoZoneEscape({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    visibleCreatures: [],
    visiblePlayers: [],
    candidates: [],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 99, y: 100, z: 8 },
    ],
  });

  assert.equal(action?.type, "danger-zone-escape");
  assert.deepEqual(action?.destination, { x: 101, y: 100, z: 8 });
});

test("chooseRouteAction detours around a rectangular avoid zone instead of walking into it", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 102, y: 101, z: 8, type: "walk" },
    ],
    tileRules: [
      { x: 102, y: 101, z: 8, shape: "rect", width: 2, height: 2, policy: "avoid", trigger: "approach" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
      { x: 101, y: 102, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
      { x: 101, y: 102, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.equal(bot.shouldAvoidPosition({
    playerPosition: { x: 100, y: 100, z: 8 },
  }, action?.destination), false);
  assert.equal(action?.progressKey, "102,101,8");
  assert.equal(action?.walkReason, "tile-rule-avoid");
});

test("chooseRouteAction clicks the first safe step when a no-go waypoint blocks the client path", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "danger-zone" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
      { x: 102, y: 101, z: 8 },
      { x: 103, y: 101, z: 8 },
      { x: 104, y: 101, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
      { x: 102, y: 101, z: 8 },
      { x: 103, y: 101, z: 8 },
      { x: 104, y: 101, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, { x: 100, y: 101, z: 8 });
  assert.equal(action?.progressKey, "104,100,8");
});

test("route safety constraints block native pathfinder fallback when no safe step is connected", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 102, y: 100, z: 8, type: "stairs-up" },
    ],
    tileRules: [
      { x: 101, y: 100, z: 8, policy: "avoid", trigger: "approach" },
    ],
  });

  bot.resetRoute(0);

  const walkPlan = bot.resolveRouteWalkDestination({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  }, bot.getCurrentWaypoint());

  assert.equal(walkPlan?.destination, null);
  assert.equal(walkPlan?.nativePathfinder, false);
  assert.equal(walkPlan?.reason, "viewport-no-step");
});

test("chooseRouteAction detours around a temporarily occupied walk waypoint using a reachable forward lane", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 100, y: 100, z: 8 },
      },
    ],
    visiblePlayers: [],
    elementalFields: [],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, { x: 101, y: 100, z: 8 });
  assert.equal(action?.progressKey, "100,100,8");
  assert.equal(action?.walkReason, "occupied-detour");
});

test("chooseRouteAction bypasses an exact walk waypoint occupied by another player", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerName: "Own Knight",
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [
      {
        id: 900,
        name: "Knight Alpha",
        position: { x: 100, y: 100, z: 8 },
      },
    ],
    elementalFields: [],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(action?.destination, bot.options.waypoints[1]);
});

test("chooseRouteAction keeps exact interaction waypoints on hold when the exact tile is occupied", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "use-item" },
      { x: 101, y: 101, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 100, y: 100, z: 8 },
      },
    ],
    visiblePlayers: [],
    elementalFields: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction lets a stand waypoint click the final hole sqm even when safe tiles exclude it", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "stand" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["holes"],
        labels: ["Hole"],
      },
    ],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 100);
  assert.equal(action?.destination?.y, 100);
  assert.equal(action?.destination?.z, 8);
  assert.equal(action?.progressKey, "100,100,8");
  assert.equal(action?.walkReason, "direct");
});

test("chooseRouteAction lets a use-item waypoint click a walkable hole sqm even when hole avoidance excludes it", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "use-item" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["holes"],
        labels: ["Hole"],
      },
    ],
    walkableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  assert.equal(action?.progressKey, "100,100,8");
  assert.equal(action?.walkReason, "direct");
});

test("chooseRouteAction still attempts an adjacent walk waypoint when reachable tiles lag", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction advances an adjacent walk waypoint from route continuity when reachable tiles lag behind", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 99, y: 100, z: 8, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.markWaypointConfirmed(0, Date.now());

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(action?.destination, bot.options.waypoints[2]);
});

test("chooseRouteAction keeps routing under repeated lagging reachability without piling up walk failures", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeFollowExactWaypoints: false,
    waypointRadius: 0,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.attach = async () => ({ id: "page" });
  bot.cdp = {
    async evaluate() {
      return {
        ok: true,
        transport: "native-pathfinder",
      };
    },
    async send() {
      return null;
    },
  };

  let playerPosition = { x: 100, y: 100, z: 8 };
  let walks = 0;

  for (let step = 0; step < 120; step += 1) {
    const action = bot.chooseRouteAction({
      ready: true,
      playerPosition,
      currentTarget: null,
      candidates: [],
      visibleCreatures: [],
      visiblePlayers: [],
      elementalFields: [],
      safeTiles: [
        playerPosition,
      ],
      reachableTiles: [
        playerPosition,
      ],
      isMoving: false,
      pathfinderAutoWalking: false,
      pathfinderFinalDestination: null,
    });

    assert.equal(action?.kind, "walk");
    const result = await bot.executeRouteAction(action);
    assert.equal(result?.ok, true);
    walks += 1;

    playerPosition = { ...action.destination };
    bot.reconcileWalkProgress({
      ready: true,
      playerPosition,
      isMoving: false,
      pathfinderAutoWalking: false,
    });
    bot.markWaypointConfirmed(bot.routeIndex);
    bot.advanceWaypoint("test");
  }

  assert.equal(walks, 120);
  assert.equal(bot.lastWalkFailureCount, 0);
});

test("chooseRouteAction lets a stair waypoint click the final stair sqm even when safe tiles exclude it", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "stairs-down" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Stairs"],
      },
    ],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 100);
  assert.equal(action?.destination?.y, 100);
  assert.equal(action?.destination?.z, 8);
  assert.equal(action?.progressKey, "100,100,8");
  assert.equal(action?.walkReason, "direct");
});

test("chooseRouteAction uses direct stair routing outside combat instead of one-tile hazard detours", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 103, y: 100, z: 8, type: "stairs-down" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 101, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Ramp"],
      },
      {
        position: { x: 103, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Stairs"],
      },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
      { x: 102, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
      { x: 102, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  assert.equal(action?.progressKey, "103,100,8");
  assert.equal(action?.walkReason, "direct");
});

test("chooseRouteAction treats stairs as no-go during combat even in strict clear mode", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeStrictClear: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "stairs-down" },
    ],
  });

  bot.resetRoute(0);

  const combatSnapshot = {
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 99, y: 101, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Stairs"],
      },
    ],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(combatSnapshot), null);
  assert.equal(bot.routeIndex, 0);

  const clearAction = bot.chooseRouteAction({
    ...combatSnapshot,
    currentTarget: null,
  });

  assert.equal(clearAction?.kind, "walk");
  assert.deepEqual(clearAction?.destination, bot.options.waypoints[0]);
  assert.equal(clearAction?.walkReason, "direct");
});

test("chooseNoGoZoneEscape steps off a visible stair tile during combat", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: false,
    waypoints: [
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  const action = bot.chooseNoGoZoneEscape({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 102, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    visibleCreatures: [],
    visiblePlayers: [],
    candidates: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Stairs"],
      },
    ],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 100, y: 101, z: 8 },
    ],
  });

  assert.equal(action?.type, "danger-zone-escape");
  assert.notDeepEqual(action?.destination, { x: 100, y: 100, z: 8 });
});

test("chooseRouteAction uses a non-walkable use-item waypoint from an adjacent tile", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "use-item" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["holes"],
        labels: ["Hole"],
      },
    ],
    walkableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "use-item");
  assert.equal(action?.advanceOnSuccess, true);
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
});

test("chooseRouteAction uses a non-walkable rope waypoint from an adjacent tile", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "rope" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["holes"],
        labels: ["Rope Spot"],
      },
    ],
    walkableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    safeTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 99, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "use-tool");
  assert.equal(action?.tool, "rope");
  assert.equal(action?.advanceOnSuccess, false);
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
});

test("chooseRouteAction skips teleport hazard waypoints when the category is enabled", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["teleports"],
        labels: ["Town Portal"],
      },
    ],
    walkableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 99, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 99, y: 99, z: 8 },
      { x: 100, y: 99, z: 8 },
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 99, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(action?.destination, { x: 99, y: 99, z: 8 });
});

test("chooseRouteAction can route through teleport hazard waypoints when that category is disabled", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    avoidFieldCategories: {
      teleports: false,
    },
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["teleports"],
        labels: ["Town Portal"],
      },
    ],
    walkableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 99, y: 100, z: 8 },
      { x: 100, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 100);
  assert.equal(action?.destination?.y, 100);
  assert.equal(action?.destination?.z, 8);
  assert.equal(action?.progressKey, "100,100,8");
});

test("chooseRouteAction waits once on approach tile rules and then releases the route", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
    tileRules: [
      { x: 101, y: 100, z: 8, policy: "wait", trigger: "approach", waitMs: 25, cooldownMs: 0 },
    ],
  });

  bot.resetRoute(0);
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    elementalFields: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  const waitAction = bot.chooseRouteAction(snapshot);
  assert.equal(waitAction?.kind, "wait");

  await bot.executeRouteAction(waitAction);
  assert.equal(bot.chooseRouteAction(snapshot), null);

  bot.activeTileRuleWait.until = Date.now() - 1;
  const walkAction = bot.chooseRouteAction(snapshot);
  assert.equal(walkAction?.kind, "walk");
});

test("chooseRouteAction can hold on a rectangular vicinity wait rule before entering the zone", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 104, y: 100, z: 8, type: "walk" },
    ],
    tileRules: [
      {
        x: 102,
        y: 100,
        z: 8,
        shape: "rect",
        width: 2,
        height: 1,
        policy: "wait",
        trigger: "approach",
        exactness: "vicinity",
        vicinityRadius: 1,
        waitMs: 40,
        cooldownMs: 0,
      },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    elementalFields: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "wait");
  assert.equal(action?.durationMs, 40);
  assert.equal(action?.rule.shape, "rect");
  assert.equal(action?.rule.exactness, "vicinity");
  assert.equal(action?.rule.vicinityRadius, 1);
});

test("chooseRouteAction advances loop progress at a reached endpoint even while combat pauses movement", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 1,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 102, y: 102, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(1);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 102, y: 102, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 103, y: 102, z: 8 },
      dx: 1,
      dy: 0,
      dz: 0,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 102, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 102, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction in strict clear mode forces the current walk waypoint before fighting", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeStrictClear: true,
    waypointRadius: 0,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    waypoints: [
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 101, z: 8 },
        dx: 1,
        dy: 1,
        dz: 0,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 101, z: 8 },
        dx: 1,
        dy: 1,
        dz: 0,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction in strict clear mode holds a reached waypoint until combat clears", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeStrictClear: true,
    waypointRadius: 0,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(1);

  const combatSnapshot = {
    ready: true,
    playerPosition: { x: 102, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 103, y: 100, z: 8 },
      dx: 1,
      dy: 0,
      dz: 0,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 103, y: 100, z: 8 },
        dx: 1,
        dy: 0,
        dz: 0,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(combatSnapshot), null);
  assert.equal(bot.routeIndex, 1);

  const clearAction = bot.chooseRouteAction({
    ...combatSnapshot,
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
  });

  assert.equal(clearAction?.kind, "walk");
  assert.deepEqual(clearAction?.waypoint, bot.options.waypoints[0]);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction in strict clear mode does not leave a room with visible tracked monsters still in reach", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    routeStrictClear: true,
    waypointRadius: 0,
    monsterNames: ["Larva"],
    rangeX: 7,
    rangeY: 5,
    combatRangeX: 1,
    combatRangeY: 1,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        dx: 4,
        dy: 0,
        dz: 0,
        reachableForCombat: true,
        withinCombatBox: false,
      },
    ],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeIndex, 0);

  const selection = bot.chooseTarget(snapshot);

  assert.equal(selection?.chosen?.id, 10);
});

test("chooseRouteAction keeps a follower parked until the predecessor opens enough route spacing", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 100 + index,
    y: 200,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeCoordinationState = {
    selfInstanceId: "follower",
    members: [
      {
        instanceId: "leader",
        characterName: "Leader",
        routeIndex: 20,
        confirmedIndex: 19,
        startedAt: 1,
      },
      {
        instanceId: "follower",
        characterName: "Follower",
        routeIndex: 0,
        confirmedIndex: 0,
        startedAt: 2,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeIndex, 0);

  bot.routeCoordinationState.members[0].routeIndex = 31;
  bot.routeCoordinationState.members[0].confirmedIndex = 30;

  const action = bot.chooseRouteAction(snapshot);
  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 101);
  assert.equal(action?.destination?.y, 200);
  assert.equal(action?.destination?.z, 8);
  assert.equal(bot.routeIndex, 1);
});

test("chooseRouteAction pauses a follower before it walks into a predecessor's spacing window", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 100 + index,
    y: 200,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeIndex = 20;
  bot.routeCoordinationState = {
    selfInstanceId: "follower",
    members: [
      {
        instanceId: "leader",
        characterName: "Leader",
        routeIndex: 41,
        confirmedIndex: 40,
        startedAt: 1,
      },
      {
        instanceId: "follower",
        characterName: "Follower",
        routeIndex: 20,
        confirmedIndex: 19,
        startedAt: 2,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 119, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeIndex, 20);

  bot.routeCoordinationState.members[0].routeIndex = 51;
  bot.routeCoordinationState.members[0].confirmedIndex = 50;

  const action = bot.chooseRouteAction(snapshot);
  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 120);
  assert.equal(action?.destination?.y, 200);
  assert.equal(action?.destination?.z, 8);
  assert.equal(bot.routeIndex, 20);
});

test("chooseRouteAction can retroactively hold an earlier-started bot behind a wrapped peer", () => {
  const waypoints = Array.from({ length: 219 }, (_, index) => ({
    x: 33000 + index,
    y: 32500,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeIndex = 146;
  bot.routeCoordinationState = {
    selfInstanceId: "early",
    members: [
      {
        instanceId: "early",
        characterName: "Early",
        routeIndex: 146,
        confirmedIndex: 145,
        startedAt: 1,
      },
      {
        instanceId: "late",
        characterName: "Late",
        routeIndex: 177,
        confirmedIndex: 176,
        startedAt: 2,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 33146, y: 32500, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeIndex, 146);
});

test("chooseRouteAction breaks a stale wrapped route-spacing stalemate for the earlier session", () => {
  const waypoints = Array.from({ length: 219 }, (_, index) => ({
    x: 33000 + index,
    y: 32500,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  let now = 1_000;
  bot.getNow = () => now;
  bot.routeIndex = 146;
  bot.routeCoordinationState = {
    selfInstanceId: "early",
    members: [
      {
        instanceId: "early",
        characterName: "Early",
        routeIndex: 146,
        confirmedIndex: 145,
        startedAt: 1,
      },
      {
        instanceId: "late",
        characterName: "Late",
        routeIndex: 177,
        confirmedIndex: 176,
        startedAt: 2,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 33146, y: 32500, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeSpacingHold?.peerInstanceId, "late");

  now += 6_001;

  const action = bot.chooseRouteAction(snapshot);
  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 33147);
  assert.equal(action?.destination?.y, 32500);
  assert.equal(action?.destination?.z, 8);
  assert.equal(bot.routeIndex, 147);
  assert.equal(bot.routeSpacingHold, null);
  assert.equal(bot.routeSpacingBypass?.peerInstanceId, "late");
});

test("chooseRouteAction keeps the lower-priority session parked during a stale route-spacing hold", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 100 + index,
    y: 200,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  let now = 1_000;
  bot.getNow = () => now;
  bot.routeCoordinationState = {
    selfInstanceId: "follower",
    members: [
      {
        instanceId: "leader",
        characterName: "Leader",
        routeIndex: 20,
        confirmedIndex: 19,
        startedAt: 1,
      },
      {
        instanceId: "follower",
        characterName: "Follower",
        routeIndex: 0,
        confirmedIndex: 0,
        startedAt: 2,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeSpacingHold?.peerInstanceId, "leader");

  now += 6_001;

  assert.equal(bot.chooseRouteAction(snapshot), null);
  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.routeSpacingHold?.peerInstanceId, "leader");
  assert.equal(bot.routeSpacingBypass, null);
});

test("chooseRouteAction lets a wrapped later-started bot keep moving when that widens the live gap", () => {
  const waypoints = Array.from({ length: 219 }, (_, index) => ({
    x: 33000 + index,
    y: 32500,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeIndex = 177;
  bot.routeCoordinationState = {
    selfInstanceId: "late",
    members: [
      {
        instanceId: "early",
        characterName: "Early",
        routeIndex: 146,
        confirmedIndex: 145,
        startedAt: 1,
      },
      {
        instanceId: "late",
        characterName: "Late",
        routeIndex: 177,
        confirmedIndex: 176,
        startedAt: 2,
      },
    ],
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 33177, y: 32500, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  const action = bot.chooseRouteAction(snapshot);
  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 33178);
  assert.equal(action?.destination?.y, 32500);
  assert.equal(action?.destination?.z, 8);
  assert.equal(bot.routeIndex, 178);
});

test("chooseRouteAction uses a local peer live route position before the peer's stored spacing index", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 100 + index,
    y: 200,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeIndex = 10;
  bot.routeCoordinationState = {
    selfInstanceId: "follower",
    members: [
      {
        instanceId: "leader",
        characterName: "Leader",
        routeIndex: 40,
        confirmedIndex: 39,
        playerPosition: { x: 120, y: 200, z: 8 },
        startedAt: 1,
      },
      {
        instanceId: "follower",
        characterName: "Follower",
        routeIndex: 10,
        confirmedIndex: 9,
        playerPosition: { x: 110, y: 200, z: 8 },
        startedAt: 2,
      },
    ],
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 110, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
  assert.equal(bot.routeIndex, 10);
  assert.equal(bot.routeSpacingHold?.peerInstanceId, "leader");
});

test("chooseRouteAction ignores a far peer live route projection at a crossing", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 100 + index,
    y: 200,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeIndex = 10;
  bot.routeCoordinationState = {
    selfInstanceId: "follower",
    members: [
      {
        instanceId: "leader",
        characterName: "Leader",
        routeIndex: 80,
        confirmedIndex: 79,
        playerPosition: { x: 120, y: 200, z: 8 },
        startedAt: 1,
      },
      {
        instanceId: "follower",
        characterName: "Follower",
        routeIndex: 10,
        confirmedIndex: 9,
        playerPosition: { x: 110, y: 200, z: 8 },
        startedAt: 2,
      },
    ],
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 110, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 111);
  assert.equal(bot.routeIndex, 11);
  assert.equal(bot.routeSpacingHold, null);
});

test("chooseRouteAction keeps a spaced session anchored instead of relatching to a far crossing waypoint", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 1000 + (index * 10),
    y: 200,
    z: 8,
    type: "walk",
  }));
  waypoints[80] = { x: 200, y: 200, z: 8, type: "walk" };

  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints,
  });

  bot.routeIndex = 20;
  bot.routeCoordinationState = {
    selfInstanceId: "alpha",
    members: [
      {
        instanceId: "alpha",
        characterName: "Alpha",
        routeIndex: 20,
        confirmedIndex: null,
        playerPosition: { x: 200, y: 200, z: 8 },
        startedAt: 1,
      },
      {
        instanceId: "beta",
        characterName: "Beta",
        routeIndex: 70,
        confirmedIndex: 69,
        playerPosition: { x: 1700, y: 200, z: 8 },
        startedAt: 2,
      },
    ],
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 200, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 1200);
  assert.equal(bot.routeIndex, 20);
});

test("chooseRouteAction constrains far crossing recovery before the first spacing sync returns peers", () => {
  const waypoints = Array.from({ length: 100 }, (_, index) => ({
    x: 1000 + (index * 10),
    y: 200,
    z: 8,
    type: "walk",
  }));
  waypoints[80] = { x: 200, y: 200, z: 8, type: "walk" };

  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints,
  });

  bot.routeIndex = 20;
  bot.running = true;
  bot.setRuntimeLoad({ runningSessionCount: 2, sessionCount: 2 });
  bot.setRouteCoordinationAdapter({
    async sync() {
      return null;
    },
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 200, y: 200, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action?.kind, "walk");
  assert.equal(action?.destination?.x, 1200);
  assert.equal(bot.routeIndex, 20);
});

test("chooseRouteAction interrupts an in-progress walk when route spacing collapses", () => {
  const waypoints = Array.from({ length: 72 }, (_, index) => ({
    x: 33000 + index,
    y: 32600,
    z: 8,
    type: "walk",
  }));
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  });

  bot.routeIndex = 34;
  bot.routeCoordinationState = {
    selfInstanceId: "holy-rat",
    members: [
      {
        instanceId: "lord-larva",
        characterName: "Lord Larva",
        routeIndex: 36,
        confirmedIndex: 35,
        startedAt: 1,
      },
      {
        instanceId: "holy-rat",
        characterName: "Holy Rat",
        routeIndex: 34,
        confirmedIndex: 33,
        startedAt: 2,
      },
    ],
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 33034, y: 32600, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: true,
    pathfinderFinalDestination: { x: 33035, y: 32600, z: 8 },
  });

  assert.equal(action?.kind, "hold-route");
  assert.equal(action?.interrupt, true);
});

test("walk keeps retrying blocked waypoints in strict clear mode instead of skipping them", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    routeStrictClear: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.executeNativeWalk = async () => ({ ok: false, reason: "native pathfinder unavailable" });

  for (let index = 0; index < 4; index += 1) {
    await bot.walk(bot.options.waypoints[0]);
  }

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.lastWalkFailureCount, 4);
});

test("walk uses viewport clicks directly instead of invoking client autopath", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  let evaluateCalls = 0;
  bot.clickViewportWalk = async (destination) => ({
    ok: true,
    transport: "viewport-click",
    destination,
  });
  bot.cdp = {
    async evaluate() {
      evaluateCalls += 1;
      throw new Error("walk should not call cdp.evaluate");
    },
    async send() {
      return null;
    },
  };

  const result = await bot.walk(bot.options.waypoints[0], {
    origin: { x: 99, y: 100, z: 8 },
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "viewport-click");
  assert.equal(evaluateCalls, 0);
});

test("walk falls back to the client pathfinder when viewport walking fails", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  let evaluateCalls = 0;
  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.attach = async () => ({ id: "page" });
  bot.cdp = {
    async evaluate() {
      evaluateCalls += 1;
      return {
        ok: true,
        transport: "native-pathfinder",
        destination: { x: 100, y: 100, z: 8 },
      };
    },
    async send() {
      return null;
    },
  };

  const result = await bot.walk(bot.options.waypoints[0], {
    origin: { x: 99, y: 100, z: 8 },
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "native-pathfinder");
  assert.equal(evaluateCalls, 1);
  assert.equal(bot.lastWalkProgressPending, true);
});

test("chooseRouteAction retries an unreachable waypoint a couple times before dropping it", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    walkRepathMs: 250,
    intervalMs: 100,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 10_000;
  const realDateNow = Date.now;
  Date.now = () => now;
  bot.getNow = () => now;
  bot.clickViewportWalk = async (destination) => ({
    ok: true,
    transport: "viewport-click",
    destination,
  });

  const snapshot = {
    ready: true,
    playerPosition: { x: 98, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  };

  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const action = bot.chooseRouteAction(snapshot);
      assert.equal(action?.kind, "walk");
      await bot.executeRouteAction(action);
      now += 251;
    }

    const firstRecovery = bot.chooseRouteAction(snapshot);
    assert.equal(firstRecovery, null);
    assert.equal(bot.routeIndex, 0);
    assert.equal(bot.blockedWaypointRecoveryState?.blockedIndex, 0);
    assert.equal(bot.blockedWaypointRecoveryState?.recoveryCycles, 1);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const action = bot.chooseRouteAction(snapshot);
      assert.equal(action?.kind, "walk");
      await bot.executeRouteAction(action);
      now += 251;
    }

    const secondRecovery = bot.chooseRouteAction(snapshot);
    assert.equal(secondRecovery, null);
    assert.equal(bot.routeIndex, 0);
    assert.equal(bot.blockedWaypointRecoveryState?.blockedIndex, 0);
    assert.equal(bot.blockedWaypointRecoveryState?.recoveryCycles, 2);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const action = bot.chooseRouteAction(snapshot);
      assert.equal(action?.kind, "walk");
      await bot.executeRouteAction(action);
      now += 251;
    }

    const stalledAction = bot.chooseRouteAction(snapshot);
    assert.equal(stalledAction, null);
    assert.equal(bot.routeIndex, 1);
    assert.equal(bot.blockedWaypointRecoveryState, null);
    assert.equal(bot.lastWalkFailureCount, 0);
  } finally {
    Date.now = realDateNow;
  }
});

test("chooseRouteAction recovers stale accepted walks even while the client still reports movement", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    walkRepathMs: 1200,
    intervalMs: 250,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 10_000;
  const realDateNow = Date.now;
  Date.now = () => now;
  bot.getNow = () => now;
  bot.lastWalkAt = now - 300;
  bot.lastWalkKey = "100,100,8";
  bot.lastWalkOriginKey = "99,100,8";
  bot.lastWalkProgressPending = true;
  bot.attach = async () => ({ id: "page" });
  bot.cdp = {
    async evaluate() {
      return { ok: true, interruptedWalk: true };
    },
  };

  try {
    const action = bot.chooseRouteAction({
      ready: true,
      playerPosition: { x: 99, y: 100, z: 8 },
      currentTarget: null,
      visibleCreatures: [],
      visiblePlayers: [],
      candidates: [],
      isMoving: true,
      pathfinderAutoWalking: true,
      pathfinderFinalDestination: { x: 100, y: 100, z: 8 },
      autoWalkStepsRemaining: 1,
      serverMessages: [
        {
          text: "There is no way.",
          timestamp: now - 50,
        },
      ],
    });

    assert.equal(action?.kind, "recover-stale-walk");
    assert.equal(action?.walkKey, "100,100,8");
    assert.equal(action?.reason, "blocked-message");

    const result = await bot.executeRouteAction(action);
    assert.equal(result?.ok, true);
    assert.equal(result?.kind, "recover-stale-walk");
    assert.equal(result?.interruptedWalk, true);
    assert.equal(bot.lastWalkProgressPending, false);
    assert.equal(bot.lastWalkFailureKey, "100,100,8");
    assert.equal(bot.lastWalkFailureCount, 1);
  } finally {
    Date.now = realDateNow;
  }
});

test("chooseRouteAction does not reuse a route step recently rejected by the client", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    walkRepathMs: 1200,
    waypoints: [
      { x: 102, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.getNow = () => 10_000;
  bot.rememberBlockedWalkDestination({ x: 101, y: 100, z: 8 }, { now: 10_000 });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    visiblePlayers: [],
    candidates: [],
    safeTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
});

test("chooseRouteAction breaks a distant waypoint into a visible reachable viewport step", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 108, y: 100, z: 8, type: "walk" },
      { x: 109, y: 100, z: 8, type: "walk" },
    ],
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
      { x: 103, y: 100, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, { x: 104, y: 100, z: 8 });
  assert.equal(action?.progressKey, "108,100,8");
});

test("chooseRouteAction keeps the recorded stride when a no-go sqm is off the current route segment", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 108, y: 100, z: 8, type: "walk" },
      { x: 100, y: 104, z: 8, type: "danger-zone" },
    ],
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
      { x: 103, y: 100, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, { x: 104, y: 100, z: 8 });
  assert.equal(action?.progressKey, "108,100,8");
});

test("chooseRouteAction keeps the recorded stride when a visible stair hazard is off the current route segment", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 108, y: 100, z: 8, type: "walk" },
    ],
  });

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    hazardTiles: [
      {
        position: { x: 100, y: 104, z: 8 },
        categories: ["stairsLadders"],
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
      { x: 103, y: 100, z: 8 },
      { x: 104, y: 100, z: 8 },
    ],
  });

  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.destination, { x: 104, y: 100, z: 8 });
  assert.equal(action?.progressKey, "108,100,8");
});

test("walk keeps retrying a blocked waypoint after nearby reachable combat clears", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    walkRepathMs: 250,
    intervalMs: 100,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.noteBlockedWaypointCombat(bot.options.waypoints[0], {
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 100, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 100, y: 100, z: 8 },
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
  });

  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.executeNativeWalk = async () => ({ ok: false, reason: "native pathfinder unavailable" });

  for (let index = 0; index < 4; index += 1) {
    await bot.walk(bot.options.waypoints[0]);
  }

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.lastWalkFailureCount, 4);
});

test("executeRouteAction keeps a shovel-hole waypoint active after a successful adjacent dig", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "shovel-hole" },
      { x: 101, y: 100, z: 9, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.useToolOnWaypoint = async () => ({ ok: true });

  const result = await bot.executeRouteAction({
    kind: "use-tool",
    tool: "shovel",
    waypoint: bot.options.waypoints[0],
    actionKey: "tool:shovel:0:100,100,8",
    advanceOnSuccess: false,
  });

  assert.equal(result?.ok, true);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction advances a shovel-hole waypoint after the floor drops", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "shovel-hole" },
      { x: 101, y: 100, z: 9, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 9 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 100, y: 100, z: 9 },
      { x: 101, y: 100, z: 9 },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 9 },
      { x: 101, y: 100, z: 9 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 9 },
      { x: 101, y: 100, z: 9 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
});

test("chooseRouteAction relatches to the current-floor route after a missed stair advance", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 101, y: 100, z: 7, type: "stairs-down" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "stairs-up" },
      { x: 102, y: 100, z: 7, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 101, y: 100, z: 8 },
      { x: 102, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 3);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[3]);
  assert.deepEqual(action?.destination, bot.options.waypoints[3]);
  assert.equal(action?.walkReason, "direct");
});

test("chooseRouteAction does not advance a stair waypoint after an unexpected extra floor hop", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "stairs-down" },
      { x: 100, y: 101, z: 9, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  assert.equal(bot.hasWaypointFloorTransition({ x: 100, y: 100, z: 9 }, bot.options.waypoints[0], 0), true);
  assert.equal(bot.hasWaypointFloorTransition({ x: 100, y: 100, z: 10 }, bot.options.waypoints[0], 0), false);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 10 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 100, y: 100, z: 10 },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 10 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 10 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
  assert.equal(bot.routeIndex, 0);
});

test("chooseRouteAction routes back up after an accidental lower-floor drop", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 101, y: 100, z: 7, type: "stairs-up" },
      { x: 101, y: 99, z: 6, type: "walk" },
      { x: 101, y: 100, z: 6, type: "stairs-down" },
      { x: 101, y: 101, z: 7, type: "stairs-down" },
      { x: 100, y: 101, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 101, y: 101, z: 8, type: "stairs-up" },
      { x: 100, y: 101, z: 7, type: "walk" },
    ],
  });

  bot.resetRoute(1);
  bot.markWaypointConfirmed(0, 1_000);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 101, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 101, z: 8 },
      { x: 101, y: 101, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[7]);
  assert.deepEqual(action?.destination, bot.options.waypoints[7]);
  assert.match(action?.progressKey, /^floor-recovery:7:/);

  const resumedAction = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 101, z: 7 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 101, y: 101, z: 7 },
      { x: 101, y: 100, z: 7 },
    ],
    reachableWalkableTiles: [
      { x: 101, y: 101, z: 7 },
      { x: 101, y: 100, z: 7 },
    ],
    reachableTiles: [
      { x: 101, y: 101, z: 7 },
      { x: 101, y: 100, z: 7 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(resumedAction?.kind, "walk");
  assert.deepEqual(resumedAction?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(resumedAction?.destination, bot.options.waypoints[1]);
});

test("chooseRouteAction relatches forward when a stair hop already reached the landing floor", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "stairs-up" },
      { x: 103, y: 100, z: 7, type: "walk" },
      { x: 104, y: 100, z: 7, type: "walk" },
      { x: 101, y: 100, z: 7, type: "stairs-down" },
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 102, y: 100, z: 7 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
      { x: 101, y: 100, z: 7 },
    ],
    reachableWalkableTiles: [
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
      { x: 101, y: 100, z: 7 },
    ],
    reachableTiles: [
      { x: 102, y: 100, z: 7 },
      { x: 103, y: 100, z: 7 },
      { x: 101, y: 100, z: 7 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(action?.destination, bot.options.waypoints[2]);
  assert.notDeepEqual(action?.waypoint, bot.options.waypoints[4]);
});

test("chooseRouteAction relatches forward through an untagged first floor bridge", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 9, type: "walk" },
      { x: 104, y: 100, z: 9, type: "walk" },
      { x: 101, y: 100, z: 9, type: "stairs-up" },
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 102, y: 100, z: 9 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 102, y: 100, z: 9 },
      { x: 103, y: 100, z: 9 },
      { x: 101, y: 100, z: 9 },
    ],
    reachableWalkableTiles: [
      { x: 102, y: 100, z: 9 },
      { x: 103, y: 100, z: 9 },
      { x: 101, y: 100, z: 9 },
    ],
    reachableTiles: [
      { x: 102, y: 100, z: 9 },
      { x: 103, y: 100, z: 9 },
      { x: 101, y: 100, z: 9 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 1);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(action?.destination, bot.options.waypoints[1]);
});

test("chooseRouteAction does not advance a ladder after a wrong-direction floor change", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "ladder" },
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);

  assert.equal(bot.hasWaypointFloorTransition({ x: 100, y: 100, z: 8 }, bot.options.waypoints[0], 0), true);
  assert.equal(bot.hasWaypointFloorTransition({ x: 100, y: 100, z: 6 }, bot.options.waypoints[0], 0), false);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 6 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 100, y: 100, z: 6 },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 6 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 6 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(action, null);
  assert.equal(bot.routeIndex, 0);
});

test("hasWaypointFloorTransition requires the expected destination floor", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "stairs-up" },
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 101, y: 100, z: 7, type: "stairs-down" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  assert.equal(bot.hasWaypointFloorTransition({ x: 100, y: 100, z: 7 }, bot.options.waypoints[0], 0), true);
  assert.equal(bot.hasWaypointFloorTransition({ x: 100, y: 100, z: 6 }, bot.options.waypoints[0], 0), false);
  assert.equal(bot.hasWaypointFloorTransition({ x: 101, y: 100, z: 8 }, bot.options.waypoints[2], 2), true);
  assert.equal(bot.hasWaypointFloorTransition({ x: 101, y: 100, z: 9 }, bot.options.waypoints[2], 2), false);
});

test("chooseRouteAction uses an adjacent recovery ladder before relatching to a lower route segment", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 101, y: 100, z: 8, type: "ladder" },
      { x: 101, y: 100, z: 7, type: "walk" },
      { x: 100, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.markWaypointConfirmed(0, 1_000);

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    visiblePlayers: [],
    elementalFields: [],
    walkableTiles: [
      { x: 100, y: 100, z: 8 },
    ],
    reachableWalkableTiles: [
      { x: 100, y: 100, z: 8 },
    ],
    reachableTiles: [
      { x: 100, y: 100, z: 8 },
      { x: 101, y: 100, z: 8 },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "use-item");
  assert.equal(action?.floorRecovery, true);
  assert.equal(action?.advanceOnSuccess, false);
  assert.deepEqual(action?.waypoint, bot.options.waypoints[1]);
});

test("walk keeps the original blocked route after the nearby-combat retry grace expires", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    monsterNames: ["Larva"],
    walkRepathMs: 250,
    intervalMs: 100,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
    ],
  });

  let now = 10_000;
  bot.getNow = () => now;

  bot.noteBlockedWaypointCombat(bot.options.waypoints[0], {
    ready: true,
    playerPosition: { x: 99, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 100, y: 100, z: 8 },
      withinCombatBox: true,
      reachableForCombat: true,
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 100, y: 100, z: 8 },
        withinCombatBox: true,
        reachableForCombat: true,
      },
    ],
  }, now);

  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.executeNativeWalk = async () => ({ ok: false, reason: "native pathfinder unavailable" });

  for (let index = 0; index < 3; index += 1) {
    await bot.walk(bot.options.waypoints[0]);
    now += 50;
  }

  now += bot.getBlockedWaypointRetryWindowMs() + 1;
  await bot.walk(bot.options.waypoints[0]);

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.blockedWaypointRecoveryState?.blockedIndex, 0);
  assert.equal(bot.blockedWaypointRecoveryState?.recoveryCycles, 1);
});

test("walk rewinds a few waypoints before finally dropping a repeatedly blocked route node", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(3);
  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.executeNativeWalk = async () => ({ ok: false, reason: "native pathfinder unavailable" });

  for (let index = 0; index < 4; index += 1) {
    await bot.walk(bot.options.waypoints[3]);
  }

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.blockedWaypointRecoveryState?.blockedIndex, 3);
  assert.equal(bot.blockedWaypointRecoveryState?.recoveryCycles, 1);

  bot.routeIndex = 3;
  for (let index = 0; index < 4; index += 1) {
    await bot.walk(bot.options.waypoints[3]);
  }

  assert.equal(bot.routeIndex, 0);
  assert.equal(bot.blockedWaypointRecoveryState?.blockedIndex, 3);
  assert.equal(bot.blockedWaypointRecoveryState?.recoveryCycles, 2);

  bot.routeIndex = 3;
  for (let index = 0; index < 4; index += 1) {
    await bot.walk(bot.options.waypoints[3]);
  }

  assert.equal(bot.routeIndex, 4);
  assert.equal(bot.blockedWaypointRecoveryState, null);
  assert.equal(bot.lastWalkFailureCount, 0);
});

test("walk routes blocked recovery through helper waypoints before returning to the blocked route node", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: false,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "helper" },
      { x: 102, y: 100, z: 8, type: "helper" },
      { x: 103, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(3);
  bot.clickViewportWalk = async () => ({ ok: false, reason: "viewport unavailable" });
  bot.executeNativeWalk = async () => ({ ok: false, reason: "native pathfinder unavailable" });

  for (let index = 0; index < 4; index += 1) {
    await bot.walk(bot.options.waypoints[3]);
  }

  assert.equal(bot.routeIndex, 1);
  assert.deepEqual(bot.helperWaypointRecoveryState?.helperIndices, [1, 2]);
  assert.equal(bot.blockedWaypointRecoveryState?.blockedIndex, 3);
  assert.equal(bot.blockedWaypointRecoveryState?.recoveryCycles, 1);

  const helperStepOne = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(helperStepOne?.kind, "walk");
  assert.deepEqual(helperStepOne?.waypoint, bot.options.waypoints[1]);
  assert.deepEqual(helperStepOne?.destination, bot.options.waypoints[1]);

  const helperStepTwo = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 101, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 2);
  assert.equal(helperStepTwo?.kind, "walk");
  assert.deepEqual(helperStepTwo?.waypoint, bot.options.waypoints[2]);
  assert.deepEqual(helperStepTwo?.destination, bot.options.waypoints[2]);

  const rejoinStep = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 102, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 3);
  assert.equal(bot.helperWaypointRecoveryState, null);
  assert.equal(rejoinStep?.kind, "walk");
  assert.deepEqual(rejoinStep?.waypoint, bot.options.waypoints[3]);
  assert.deepEqual(rejoinStep?.destination, bot.options.waypoints[3]);
});

test("chooseRouteAction does not resync ahead while a blocked route recovery is replaying the original spine", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    waypointRadius: 0,
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "walk" },
      { x: 102, y: 100, z: 8, type: "walk" },
      { x: 103, y: 100, z: 8, type: "walk" },
      { x: 104, y: 100, z: 8, type: "walk" },
      { x: 105, y: 100, z: 8, type: "walk" },
      { x: 106, y: 100, z: 8, type: "walk" },
    ],
  });

  bot.resetRoute(0);
  bot.blockedWaypointRecoveryState = {
    blockedIndex: 3,
    blockedWaypointKey: "103,100,8",
    walkKey: "103,100,8",
    recoveryCycles: 1,
  };

  const action = bot.chooseRouteAction({
    ready: true,
    playerPosition: { x: 106, y: 100, z: 8 },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    pathfinderFinalDestination: null,
  });

  assert.equal(bot.routeIndex, 0);
  assert.equal(action?.kind, "walk");
  assert.deepEqual(action?.waypoint, bot.options.waypoints[0]);
  assert.deepEqual(action?.destination, bot.options.waypoints[0]);
  assert.equal(bot.lastWalkFailureCount, 0);
});

test("target interrupts autowalk before locking a new target", async () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
  });
  const pathfinder = {
    __isAutoWalking: true,
    __finalDestination: { x: 101, y: 100, z: 8 },
    __autoWalkStepsRemaining: 4,
    stopCalls: 0,
    stopAutoWalk() {
      this.stopCalls += 1;
      this.__isAutoWalking = false;
      this.__finalDestination = null;
      this.__autoWalkStepsRemaining = 0;
    },
  };
  const player = {
    __target: null,
    isAutoWalking() {
      return pathfinder.__isAutoWalking;
    },
  };
  const creature = {
    id: 10,
    name: "Larva",
    __position: { x: 101, y: 100, z: 8 },
  };
  let gameStopCalls = 0;
  let targetCalls = 0;

  bot.lastWalkAt = Date.now();
  bot.lastWalkKey = "101,100,8";
  bot.lastWalkOriginKey = "100,100,8";
  bot.lastWalkProgressPending = true;
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          world: {
            pathfinder,
            activeCreatures: new Map([[10, creature]]),
            targetMonster(targets) {
              targetCalls += 1;
              player.__target = [...targets][0] || null;
            },
          },
        },
      }, {
        g_game: {
          stop() {
            gameStopCalls += 1;
          },
        },
      });
    },
  };

  const result = await bot.target({
    chosen: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
      },
    ],
    signature: "10",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.interruptedWalk, true);
  assert.equal(targetCalls, 1);
  assert.equal(pathfinder.stopCalls, 1);
  assert.equal(gameStopCalls, 1);
  assert.equal(bot.lastWalkAt, 0);
  assert.equal(bot.lastWalkOriginKey, null);
  assert.equal(bot.lastWalkProgressPending, false);
});

test("target clears native follow before locking a combat target", async () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  const leader = {
    id: 22,
    name: "Knight Alpha",
    __position: { x: 100, y: 100, z: 8 },
  };
  const player = {
    __target: null,
    __followTarget: leader,
    setFollowTarget(creature) {
      this.__followTarget = creature;
    },
  };
  const creature = {
    id: 10,
    name: "Larva",
    __position: { x: 101, y: 100, z: 8 },
  };
  const sentPackets = [];

  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    lastSeenAt: Date.now(),
    lastSeenPosition: { x: 100, y: 100, z: 8 },
    lastStairAttemptAt: 0,
    activeFollowTargetId: 22,
    activeFollowTargetKey: "knight alpha",
    lastFollowAttemptAt: Date.now(),
    lastSuspendAt: 0,
  };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          send(packet) {
            sentPackets.push(packet);
          },
          world: {
            pathfinder: {},
            activeCreatures: new Map([[10, creature], [22, leader]]),
            targetMonster(targets) {
              player.__target = [...targets][0] || null;
            },
          },
        },
      }, {
        FollowPacket: class FollowPacket {
          constructor(id) {
            this.id = id;
          }
        },
      });
    },
  };

  const result = await bot.target({
    chosen: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
      },
    ],
    signature: "10",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.interruptedFollow, true);
  assert.equal(player.__followTarget, null);
  assert.equal(sentPackets.length, 1);
  assert.equal(sentPackets[0].id, 0);
  assert.equal(bot.followTrainState.activeFollowTargetKey, "");
});

test("target immediately reapplies aggressive chase when the client drops to stand during retarget", async () => {
  const bot = new MinibiaTargetBot({
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
      },
    ],
  });
  const selector = {
    currentChaseMode: 2,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  const player = {
    __target: null,
  };
  const creature = {
    id: 10,
    name: "Larva",
    __position: { x: 101, y: 100, z: 8 },
  };

  bot.lastSnapshot = {
    ready: true,
    playerName: "Knight Solo",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          interface: {
            fightModeSelector: selector,
          },
          world: {
            pathfinder: {},
            activeCreatures: new Map([[10, creature]]),
            targetMonster(targets) {
              player.__target = [...targets][0] || null;
              selector.currentChaseMode = 0;
            },
          },
        },
      }, {});
    },
  };

  const result = await bot.target({
    chosen: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
      },
    ],
    signature: "10",
  });

  assert.equal(result?.ok, true);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "chase");
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.label, "Aggressive");
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.rawValue, "2");
});

test("target reapplies aggressive chase for a Larva selected from the wider reach window", async () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "stand",
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
      },
    ],
  });
  const selector = {
    currentChaseMode: 2,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  const player = {
    __target: null,
  };
  const creature = {
    id: 10,
    name: "Larva",
    __position: { x: 104, y: 100, z: 8 },
  };

  bot.lastSnapshot = {
    ready: true,
    playerName: "Knight Solo",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        withinCombatBox: false,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    allMatches: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        withinCombatBox: false,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          interface: {
            fightModeSelector: selector,
          },
          world: {
            pathfinder: {},
            activeCreatures: new Map([[10, creature]]),
            targetMonster(targets) {
              player.__target = [...targets][0] || null;
              selector.currentChaseMode = 0;
            },
          },
        },
      }, {});
    },
  };

  const result = await bot.target({
    chosen: {
      id: 10,
      name: "Larva",
      position: { x: 104, y: 100, z: 8 },
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
      },
    ],
    signature: "10",
  });

  assert.equal(result?.ok, true);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "chase");
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.label, "Aggressive");
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.rawValue, "2");
});

test("target keeps the reach-window focus in the runtime snapshot for later chase restores", async () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "stand",
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
      },
    ],
  });
  const selector = {
    currentChaseMode: 2,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  const player = {
    __target: null,
  };
  const creature = {
    id: 10,
    name: "Larva",
    __position: { x: 104, y: 100, z: 8 },
  };

  bot.page = { id: "page-1", title: "Minibia" };
  bot.lastSnapshot = {
    ready: true,
    playerName: "Knight Solo",
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: null,
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        withinCombatBox: false,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    allMatches: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
        withinCombatBox: false,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          interface: {
            fightModeSelector: selector,
          },
          world: {
            pathfinder: {},
            activeCreatures: new Map([[10, creature]]),
            targetMonster(targets) {
              player.__target = [...targets][0] || null;
              selector.currentChaseMode = 0;
            },
          },
        },
      }, {});
    },
  };

  const targetResult = await bot.target({
    chosen: {
      id: 10,
      name: "Larva",
      position: { x: 104, y: 100, z: 8 },
    },
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 104, y: 100, z: 8 },
      },
    ],
    signature: "10",
  });

  assert.equal(targetResult?.ok, true);
  assert.equal(bot.lastSnapshot.currentTarget?.name, "Larva");
  assert.equal(bot.lastSnapshot.currentTarget?.position?.x, 104);

  selector.currentChaseMode = 0;
  bot.lastSnapshot = {
    ...bot.lastSnapshot,
    combatModes: {
      ...(bot.lastSnapshot.combatModes || {}),
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };

  const restoreResult = await bot.restorePreferredChaseMode({ force: true });

  assert.equal(restoreResult?.ok, true);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.preferredChaseMode, 2);
});

test("walk does not spend follow recovery attempts during ordinary route movement", async () => {
  const bot = new MinibiaTargetBot();
  bot.getNow = () => 1_000;
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    currentState: "DESYNC_RECOVERY",
    lastStateChangeAt: 900,
    lastSeenAt: 800,
    lastSeenPosition: { x: 102, y: 100, z: 7 },
    lastLeaderSource: "shared",
    lastStairAttemptAt: 0,
    activeFollowTargetId: null,
    activeFollowTargetKey: "",
    lastFollowAttemptAt: 700,
    lastSuspendAt: 650,
    lastDesyncAt: 900,
    lastRejoinAt: 0,
    lastRecoveryWalkAt: 500,
    desyncCount: 2,
    rejoinAttempts: 1,
    recoveryWalkAttempts: 2,
  };
  bot.clickViewportWalk = async () => ({ ok: true });

  const result = await bot.walk(
    { x: 101, y: 100, z: 7 },
    {
      destination: { x: 101, y: 100, z: 7 },
      origin: { x: 100, y: 100, z: 7 },
    },
  );

  assert.equal(result?.ok, true);
  assert.equal(bot.followTrainState.recoveryWalkAttempts, 2);
  assert.equal(bot.followTrainState.lastRecoveryWalkAt, 500);
});

test("rememberPreferredChaseMode keeps aggressive chase after a stand reset snapshot", () => {
  const bot = new MinibiaTargetBot();

  bot.rememberPreferredChaseMode({
    combatModes: {
      chaseMode: {
        key: "chase",
        label: "Aggressive",
        rawValue: "2",
      },
    },
  });
  bot.rememberPreferredChaseMode({
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  });

  assert.equal(bot.preferredChaseMode, 2);
});

test("explicit stand chase mode is remembered and restored", async () => {
  const bot = new MinibiaTargetBot({ chaseMode: "stand" });
  const selector = {
    currentChaseMode: 2,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            fightModeSelector: selector,
          },
        },
      });
    },
  };
  bot.lastSnapshot = {
    combatModes: {
      chaseMode: {
        key: "chase",
        label: "Aggressive",
        rawValue: "2",
      },
    },
  };

  bot.rememberPreferredChaseMode(bot.lastSnapshot);
  const result = await bot.restorePreferredChaseMode();

  assert.equal(bot.preferredChaseMode, 0);
  assert.equal(result?.ok, true);
  assert.equal(selector.currentChaseMode, 0);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "stand");
});

test("recent Larva target profile chase survives a brief no-target gap", async () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "stand",
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
      },
    ],
  });
  bot.getNow = () => 2_000;
  const selector = {
    currentChaseMode: 0,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  const focusedSnapshot = {
    ready: true,
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };

  bot.lastRetargetAt = 1_200;
  bot.lastRetargetId = 10;
  bot.rememberRecentTargetProfileChaseMode(focusedSnapshot, { now: 1_200 });

  const gapSnapshot = {
    ready: true,
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };

  assert.equal(bot.getPreferredChaseModeValue(gapSnapshot), 2);

  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            fightModeSelector: selector,
          },
        },
      });
    },
  };
  bot.lastSnapshot = gapSnapshot;

  const result = await bot.restorePreferredChaseMode({
    snapshot: bot.lastSnapshot,
    force: true,
  });

  assert.equal(result?.ok, true);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "chase");
});

test("recent Larva target profile chase expires after the grace window", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "stand",
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
      },
    ],
  });
  const combatSnapshot = {
    ready: true,
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };

  bot.lastRetargetAt = 1_000;
  bot.lastRetargetId = 10;
  bot.rememberRecentTargetProfileChaseMode(combatSnapshot, { now: 1_000 });
  assert.equal(bot.lastTargetProfileChaseMode?.value, 2);

  const idleSnapshot = {
    ready: true,
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };

  bot.getNow = () => 4_500;

  assert.equal(bot.getPreferredChaseModeValue(idleSnapshot), 0);
  assert.equal(bot.lastTargetProfileChaseMode, null);
});

test("auto chase mode uses vocation defaults", () => {
  const paladin = new MinibiaTargetBot({ chaseMode: "auto", vocation: "paladin" });
  const knight = new MinibiaTargetBot({ chaseMode: "auto", vocation: "knight" });

  assert.equal(paladin.getPreferredChaseModeValue({ ready: true }), 0);
  assert.equal(knight.getPreferredChaseModeValue({ ready: true }), 1);
});

test("auto chase mode keeps non-knight follow-train followers standing", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "auto",
    vocation: "druid",
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Druid Beta"],
    partyFollowCombatMode: "follow-and-fight",
  });

  const snapshot = {
    ready: true,
    playerName: "Druid Beta",
  };

  assert.equal(bot.isFollowTrainAttackAndFollow(snapshot), true);
  assert.equal(bot.getPreferredChaseModeValue(snapshot), 0);
});

test("auto chase mode honors per-member follow-train chase overrides", () => {
  const druid = new MinibiaTargetBot({
    chaseMode: "auto",
    vocation: "druid",
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Druid Beta"],
    partyFollowCombatMode: "follow-and-fight",
    partyFollowMemberChaseModes: {
      "Knight Alpha": "stand",
      "Druid Beta": "aggressive chase",
    },
  });
  const knight = new MinibiaTargetBot({
    chaseMode: "auto",
    vocation: "knight",
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Knight Beta"],
    partyFollowCombatMode: "follow-and-fight",
    partyFollowMemberChaseModes: {
      "Knight Beta": "stand",
    },
  });

  assert.equal(druid.getPreferredChaseModeValue({
    ready: true,
    playerName: "Knight Alpha",
  }), 0);
  assert.equal(druid.getPreferredChaseModeValue({
    ready: true,
    playerName: "Druid Beta",
  }), 2);
  assert.equal(knight.getPreferredChaseModeValue({
    ready: true,
    playerName: "Knight Beta",
  }), 0);
});

test("explicit follow-train stance overrides the targeting default stance", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "aggressive",
    vocation: "knight",
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Knight Beta"],
    partyFollowCombatMode: "follow-and-fight",
    partyFollowMemberChaseModes: {
      "Knight Beta": "stand",
    },
  });

  assert.equal(bot.getPreferredChaseModeValue({
    ready: true,
    playerName: "Knight Beta",
  }), 0);
});

test("target profile stance overrides the targeting default when the target modal selects it", () => {
  const bot = new MinibiaTargetBot({
    chaseMode: "stand",
    vocation: "knight",
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
      },
    ],
  });

  assert.equal(bot.getPreferredChaseModeValue({
    ready: true,
    playerName: "Knight Solo",
    currentTarget: {
      id: 10,
      name: "Larva",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Larva",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
  }), 2);
});

test("restorePreferredChaseMode reapplies aggressive chase and patches the snapshot", async () => {
  const bot = new MinibiaTargetBot();
  const selector = {
    currentChaseMode: 0,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            fightModeSelector: selector,
          },
        },
      });
    },
  };
  bot.preferredChaseMode = 2;
  bot.lastSnapshot = {
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  };

  const result = await bot.restorePreferredChaseMode();

  assert.equal(result?.ok, true);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "chase");
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.label, "Aggressive");
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.rawValue, "2");
});

test("restorePreferredChaseMode keeps native chase standing on route safety constraints", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    chaseMode: "aggressive",
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "danger-zone" },
    ],
  });
  const selector = {
    currentChaseMode: 2,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            fightModeSelector: selector,
          },
        },
      });
    },
  };
  bot.lastSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
    combatModes: {
      chaseMode: {
        key: "chase",
        label: "Aggressive",
        rawValue: "2",
      },
    },
  });

  const result = await bot.restorePreferredChaseMode();

  assert.equal(result?.ok, true);
  assert.equal(result?.routeSafetyClamped, true);
  assert.equal(result?.preferredMode, 2);
  assert.equal(result?.appliedMode, 0);
  assert.equal(selector.currentChaseMode, 0);
  assert.equal(bot.preferredChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "stand");
});

test("restorePreferredChaseMode keeps aggressive chase during route-safe combat", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    chaseMode: "aggressive",
    monsterNames: ["Dragon"],
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "danger-zone" },
    ],
  });
  const selector = {
    currentChaseMode: 0,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            fightModeSelector: selector,
          },
        },
      });
    },
  };
  bot.lastSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 104, y: 100, z: 8 },
      withinCombatBox: false,
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 104, y: 100, z: 8 },
        withinCombatBox: false,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  });

  const result = await bot.restorePreferredChaseMode();

  assert.equal(result?.ok, true);
  assert.equal(result?.routeSafetyClamped, false);
  assert.equal(result?.preferredMode, 2);
  assert.equal(result?.appliedMode, 2);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "chase");
});

test("restorePreferredChaseMode keeps aggressive chase during combat near stairs", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    chaseMode: "aggressive",
    monsterNames: ["Dragon"],
    waypoints: [
      { x: 103, y: 100, z: 8, type: "stairs-down" },
    ],
  });
  const selector = {
    currentChaseMode: 0,
    setChaseMode(mode) {
      this.currentChaseMode = mode;
    },
  };
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          interface: {
            fightModeSelector: selector,
          },
        },
      });
    },
  };
  bot.lastSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    hazardTiles: [
      {
        position: { x: 101, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Ramp"],
      },
      {
        position: { x: 103, y: 100, z: 8 },
        categories: ["stairsLadders"],
        labels: ["Stairs"],
      },
    ],
    combatModes: {
      chaseMode: {
        key: "stand",
        label: "Stand",
        rawValue: "0",
      },
    },
  });

  const result = await bot.restorePreferredChaseMode();

  assert.equal(result?.ok, true);
  assert.equal(result?.routeSafetyClamped, false);
  assert.equal(result?.preferredMode, 2);
  assert.equal(result?.appliedMode, 2);
  assert.equal(selector.currentChaseMode, 2);
  assert.equal(bot.preferredChaseMode, 2);
  assert.equal(bot.lastSnapshot.combatModes.chaseMode.key, "chase");
});

test("route-safe combat hold still holds for reach targets and close targets", () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    chaseMode: "aggressive",
    monsterNames: ["Dragon"],
    waypoints: [
      { x: 100, y: 100, z: 8, type: "walk" },
      { x: 101, y: 100, z: 8, type: "danger-zone" },
    ],
  });

  const farSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 104, y: 100, z: 8 },
        withinCombatBox: false,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [],
  });
  const closeSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
    visibleCreatures: [],
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
  });

  assert.equal(bot.getReachCombatCandidates(farSnapshot).length, 1);
  assert.equal(bot.shouldKeepNativeChaseStandingForRouteSafety(farSnapshot), false);
  assert.equal(bot.shouldHoldRouteForCombat(farSnapshot), true);
  assert.equal(bot.shouldHoldRouteForCombat(closeSnapshot), true);
});

test("walk restores preferred chase mode after a successful bot move", async () => {
  const bot = new MinibiaTargetBot();
  let restoreCalls = 0;
  bot.clickViewportWalk = async () => ({ ok: true });
  bot.restorePreferredChaseMode = async ({ force = false } = {}) => {
    restoreCalls += 1;
    return { ok: true, force };
  };

  const result = await bot.walk(
    { x: 101, y: 100, z: 7 },
    {
      destination: { x: 101, y: 100, z: 7 },
      origin: { x: 100, y: 100, z: 7 },
    },
  );

  assert.equal(result?.ok, true);
  assert.equal(restoreCalls, 1);
});

test("walk uses a keyboard step before viewport click when standing in an elemental field", async () => {
  const bot = new MinibiaTargetBot();
  const destination = { x: 100, y: 101, z: 8 };
  const events = [];
  let clickCalls = 0;
  let keyboardCalls = 0;
  let nativeCalls = 0;

  bot.on((event) => events.push(event));
  bot.lastSnapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
    hazardTiles: [
      {
        position: { x: 100, y: 100, z: 8 },
        categories: ["fire"],
        labels: ["fire field"],
      },
    ],
    elementalFields: [],
  };
  bot.clickViewportWalk = async () => {
    clickCalls += 1;
    return { ok: true, transport: "viewport-click" };
  };
  bot.executeKeyboardStep = async (target, origin) => {
    keyboardCalls += 1;
    assert.deepEqual(target, destination);
    assert.deepEqual(origin, { x: 100, y: 100, z: 8 });
    return { ok: true, transport: "keyboard-step", key: "ArrowDown", destination: target };
  };
  bot.executeNativeWalk = async () => {
    nativeCalls += 1;
    return { ok: false, reason: "native pathfinder should not run" };
  };
  bot.restorePreferredChaseMode = async () => ({ ok: true });

  const result = await bot.walk(
    destination,
    {
      destination,
      origin: { x: 100, y: 100, z: 8 },
    },
  );

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "keyboard-step");
  assert.equal(keyboardCalls, 1);
  assert.equal(clickCalls, 0);
  assert.equal(nativeCalls, 0);
  assert.equal(events.find((event) => event.type === "walk")?.payload?.transport, "keyboard-step");
});

test("reposition uses a viewport click for one-sqm combat setup steps", async () => {
  const bot = new MinibiaTargetBot();
  const destination = { x: 101, y: 100, z: 8 };
  const events = [];
  let nativeCalls = 0;
  let restoreCalls = 0;

  bot.on((event) => events.push(event));
  bot.clickViewportWalk = async (target) => ({
    ok: true,
    transport: "viewport-click",
    destination: target,
  });
  bot.executeNativeWalk = async () => {
    nativeCalls += 1;
    return { ok: false, reason: "native pathfinder should not run" };
  };
  bot.restorePreferredChaseMode = async ({ force = false } = {}) => {
    restoreCalls += 1;
    return { ok: true, force };
  };

  const result = await bot.reposition({
    type: "distance-keeper",
    moduleKey: "targetProfile:dragon",
    destination,
    reason: "approach",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "viewport-click");
  assert.equal(nativeCalls, 0);
  assert.equal(restoreCalls, 1);
  assert.equal(bot.lastWalkKey, "101,100,8");
  assert.equal(events.find((event) => event.type === "move")?.payload?.transport, "viewport-click");
});

test("reposition refuses combat floor-transition no-go destinations before clicking", async () => {
  const destination = { x: 100, y: 99, z: 8 };
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    autowalkLoop: true,
    chaseMode: "aggressive",
    monsterNames: ["Dragon"],
    waypoints: [
      { ...destination, type: "shovel-hole" },
    ],
  });
  let clickCalls = 0;
  let keyboardCalls = 0;
  let nativeCalls = 0;

  bot.lastSnapshot = createModuleSnapshot({
    playerPosition: { x: 100, y: 100, z: 8 },
    currentTarget: {
      id: 10,
      name: "Dragon",
      position: { x: 101, y: 100, z: 8 },
      withinCombatBox: true,
      withinCombatWindow: true,
      reachableForCombat: true,
    },
    visibleCreatures: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
    candidates: [
      {
        id: 10,
        name: "Dragon",
        position: { x: 101, y: 100, z: 8 },
        withinCombatBox: true,
        withinCombatWindow: true,
        reachableForCombat: true,
      },
    ],
  });
  bot.clickViewportWalk = async () => {
    clickCalls += 1;
    return { ok: true };
  };
  bot.executeKeyboardStep = async () => {
    keyboardCalls += 1;
    return { ok: true };
  };
  bot.executeNativeWalk = async () => {
    nativeCalls += 1;
    return { ok: true };
  };

  const result = await bot.reposition({
    type: "distance-keeper",
    moduleKey: "targetProfile:dragon",
    destination,
    reason: "dodge",
  });

  assert.equal(result?.ok, false);
  assert.equal(result?.reason, "floor transition no-go");
  assert.equal(clickCalls, 0);
  assert.equal(keyboardCalls, 0);
  assert.equal(nativeCalls, 0);
});

test("reposition falls back to native pathfinder when viewport click is unavailable", async () => {
  const bot = new MinibiaTargetBot();
  const destination = { x: 101, y: 100, z: 8 };
  const events = [];
  let nativeCalls = 0;

  bot.on((event) => events.push(event));
  bot.clickViewportWalk = async () => ({ ok: false, reason: "target outside viewport" });
  bot.executeNativeWalk = async (target) => {
    nativeCalls += 1;
    return {
      ok: true,
      transport: "native-pathfinder",
      destination: target,
    };
  };
  bot.restorePreferredChaseMode = async () => ({ ok: true });

  const result = await bot.reposition({
    type: "distance-keeper",
    moduleKey: "targetProfile:dragon",
    destination,
    reason: "approach",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "native-pathfinder");
  assert.equal(nativeCalls, 1);
  assert.equal(events.find((event) => event.type === "move")?.payload?.transport, "native-pathfinder");
  assert.equal(events.find((event) => event.type === "move")?.payload?.fallbackReason, "target outside viewport");
});

test("executeKeyboardStep sends a cardinal arrow pulse", async () => {
  const bot = new MinibiaTargetBot();
  const sentEvents = [];

  bot.cdp = {
    isOpen: () => true,
    send: async (method, params) => {
      sentEvents.push({ method, params });
      return {};
    },
  };
  bot.attach = async () => ({ id: "test-page" });

  const result = await bot.executeKeyboardStep(
    { x: 100, y: 101, z: 8 },
    { x: 100, y: 100, z: 8 },
  );
  const keyEvents = sentEvents.filter((event) => event.method === "Input.dispatchKeyEvent");

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "keyboard-step");
  assert.equal(result?.key, "ArrowDown");
  assert.equal(keyEvents.length, 2);
  assert.equal(keyEvents[0]?.params?.type, "rawKeyDown");
  assert.equal(keyEvents[0]?.params?.key, "ArrowDown");
  assert.equal(keyEvents[1]?.params?.type, "keyUp");
  assert.equal(keyEvents[1]?.params?.key, "ArrowDown");
});

test("reposition uses keyboard step before another click when the same one-sqm move did not progress", async () => {
  const bot = new MinibiaTargetBot({ intervalMs: 250 });
  const destination = { x: 100, y: 101, z: 8 };
  const events = [];
  let clickCalls = 0;
  let keyboardCalls = 0;
  let nativeCalls = 0;

  bot.on((event) => events.push(event));
  bot.lastSnapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 8 },
  };
  bot.lastWalkOriginKey = "100,100,8";
  bot.lastWalkKey = "100,101,8";
  bot.lastWalkDestinationKey = "100,101,8";
  bot.lastWalkAt = Date.now() - 1_000;
  bot.clickViewportWalk = async () => {
    clickCalls += 1;
    return { ok: true, transport: "viewport-click" };
  };
  bot.executeKeyboardStep = async (target) => {
    keyboardCalls += 1;
    return { ok: true, transport: "keyboard-step", key: "ArrowDown", destination: target };
  };
  bot.executeNativeWalk = async () => {
    nativeCalls += 1;
    return { ok: false, reason: "native pathfinder should not run" };
  };
  bot.restorePreferredChaseMode = async () => ({ ok: true });

  const result = await bot.reposition({
    type: "distance-keeper",
    moduleKey: "targetProfile:dragon",
    destination,
    reason: "approach",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "keyboard-step");
  assert.equal(keyboardCalls, 1);
  assert.equal(clickCalls, 0);
  assert.equal(nativeCalls, 0);
  assert.equal(bot.lastWalkOriginKey, "100,100,8");
  assert.equal(events.find((event) => event.type === "move")?.payload?.transport, "keyboard-step");
  assert.equal(events.find((event) => event.type === "move")?.payload?.fallbackReason, "same step did not move");
});

test("followTrainWalk records recovery telemetry on regroup moves", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 1_000;
  bot.followTrainState = {
    leaderName: "Knight Alpha",
    leaderKey: "knight alpha",
    currentState: "DESYNC_RECOVERY",
    lastStateChangeAt: 900,
    lastSeenAt: 800,
    lastSeenPosition: { x: 102, y: 100, z: 7 },
    lastLeaderSource: "shared",
    lastStairAttemptAt: 0,
    activeFollowTargetId: null,
    activeFollowTargetKey: "",
    lastFollowAttemptAt: 700,
    lastSuspendAt: 650,
    lastDesyncAt: 900,
    lastRejoinAt: 0,
    lastRecoveryWalkAt: 500,
    desyncCount: 2,
    rejoinAttempts: 1,
    recoveryWalkAttempts: 2,
  };
  bot.clickViewportWalk = async () => ({ ok: true });

  const result = await bot.followTrainWalk({
    kind: "follow-train-walk",
    destination: { x: 101, y: 100, z: 7 },
    progressKey: "101,100,7",
    origin: { x: 100, y: 100, z: 7 },
    targetName: "Knight Alpha",
    reason: "recovery",
  });

  assert.equal(result?.ok, true);
  assert.equal(bot.followTrainState.recoveryWalkAttempts, 3);
  assert.equal(bot.followTrainState.lastRecoveryWalkAt, 1_000);
});

test("refreshFollowTrainRuntime clears stale follower telemetry when the session becomes the pilot", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 1_000;
  bot.followTrainState = {
    leaderName: "Scout Beta",
    leaderKey: "scout beta",
    currentState: "FOLLOWING",
    lastStateChangeAt: 900,
    lastSeenAt: 850,
    lastSeenPosition: { x: 101, y: 100, z: 7 },
    lastLeaderSource: "visible",
    lastStairAttemptAt: 0,
    activeFollowTargetId: 22,
    activeFollowTargetKey: "scout beta",
    lastFollowAttemptAt: 880,
    lastSuspendAt: 0,
    lastDesyncAt: 0,
    lastRejoinAt: 890,
    lastRecoveryWalkAt: 0,
    desyncCount: 1,
    rejoinAttempts: 2,
    recoveryWalkAttempts: 1,
  };

  const runtimeState = bot.refreshFollowTrainRuntime({
    ready: true,
    playerName: "Knight Alpha",
  });
  const status = bot.getFollowTrainStatus({
    ready: true,
    playerName: "Knight Alpha",
  }, 1_000);

  assert.equal(runtimeState?.currentState, "DISABLED");
  assert.equal(runtimeState?.leaderName, "");
  assert.equal(runtimeState?.lastSeenPosition, null);
  assert.equal(runtimeState?.activeFollowTargetKey, "");
  assert.equal(runtimeState?.desyncCount, 0);
  assert.equal(runtimeState?.rejoinAttempts, 0);
  assert.equal(runtimeState?.recoveryWalkAttempts, 0);
  assert.equal(status?.pilot, true);
  assert.equal(status?.leaderName, "");
  assert.equal(status?.desyncCount, 0);
  assert.equal(status?.rejoinAttempts, 0);
  assert.equal(status?.recoveryWalkAttempts, 0);
});

test("followTrainFollowCreature uses the native FollowPacket path", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  const leader = {
    id: 22,
    name: "Knight Alpha",
    __position: { x: 101, y: 100, z: 7 },
  };
  const player = {
    __followTarget: null,
    setFollowTarget(creature) {
      this.__followTarget = creature;
    },
    isCreatureFollowTarget(creature) {
      return this.__followTarget === creature;
    },
  };
  const sentPackets = [];
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          send(packet) {
            sentPackets.push(packet);
          },
          world: {
            pathfinder: {},
            activeCreatures: new Map([[22, leader]]),
          },
        },
      }, {
        FollowPacket: class FollowPacket {
          constructor(id) {
            this.id = id;
          }
        },
        g_game: {},
      });
    },
  };

  const result = await bot.followTrainFollowCreature({
    kind: "follow-train-creature",
    targetId: 22,
    targetName: "Knight Alpha",
    targetPosition: leader.__position,
  });

  assert.equal(result?.ok, true);
  assert.equal(player.__followTarget, leader);
  assert.equal(sentPackets.length, 1);
  assert.equal(sentPackets[0].id, 22);
  assert.equal(bot.followTrainState.activeFollowTargetKey, "knight alpha");
});

test("followTrainFollowCreature can force a native FollowPacket even when the client already has the target", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  const leader = {
    id: 22,
    name: "Knight Alpha",
    __position: { x: 107, y: 100, z: 7 },
  };
  const player = {
    __followTarget: leader,
    setFollowTarget(creature) {
      this.__followTarget = creature;
    },
    isCreatureFollowTarget(creature) {
      return this.__followTarget === creature;
    },
  };
  const sentPackets = [];
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player,
          send(packet) {
            sentPackets.push(packet);
          },
          world: {
            pathfinder: {},
            activeCreatures: new Map([[22, leader]]),
          },
        },
      }, {
        FollowPacket: class FollowPacket {
          constructor(id) {
            this.id = id;
          }
        },
        g_game: {},
      });
    },
  };

  const result = await bot.followTrainFollowCreature({
    kind: "follow-train-creature",
    targetId: 22,
    targetName: "Knight Alpha",
    targetPosition: leader.__position,
    force: true,
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.packetSent, true);
  assert.equal(sentPackets.length, 1);
  assert.equal(sentPackets[0].id, 22);
});

test("followTrainFollowCreature fails when the native FollowPacket path is unavailable", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  const leader = {
    id: 22,
    name: "Knight Alpha",
    __position: { x: 101, y: 100, z: 7 },
  };
  bot.cdp = {
    async evaluate(expression) {
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient: {
          player: {},
          world: {
            pathfinder: {},
            activeCreatures: new Map([[22, leader]]),
          },
        },
      }, {
        g_game: {},
      });
    },
  };

  const result = await bot.followTrainFollowCreature({
    kind: "follow-train-creature",
    targetId: 22,
    targetName: "Knight Alpha",
    targetPosition: leader.__position,
  });

  assert.equal(result?.ok, false);
  assert.equal(result?.reason, "native follow packet unavailable");
  assert.equal(bot.followTrainState, null);
});

test("recordFollowTrainSpeechFromSnapshot keeps ship dialogue at the dock after travel", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Druid Gamma"],
  });
  bot.getNow = () => 5_000;

  const previousSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });
  const currentSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 350, y: 420, z: 7 },
    dialogue: {
      open: false,
      npcName: "",
      recentMessages: [
        { id: "m1", speaker: "Knight Alpha", text: "hi" },
        { id: "m2", speaker: "Knight Alpha", text: "ankrahmun" },
        { id: "m3", speaker: "Knight Alpha", text: "yes" },
      ],
    },
    visibleNpcs: [],
    visibleNpcNames: [],
  });

  const recorded = bot.recordFollowTrainSpeechFromSnapshot(currentSnapshot, previousSnapshot, 5_000);

  assert.deepEqual(recorded.map((action) => action?.words), ["hi", "ankrahmun", "yes"]);
  assert.deepEqual(
    recorded.map((action) => action?.position),
    [
      { x: 100, y: 100, z: 7 },
      { x: 100, y: 100, z: 7 },
      { x: 100, y: 100, z: 7 },
    ],
  );
  assert.deepEqual(recorded.map((action) => action?.npcName), [
    "Captain Bluebear",
    "Captain Bluebear",
    "Captain Bluebear",
  ]);
});

test("recordFollowTrainSpeechFromSnapshot ignores the existing chat tail on the first ready snapshot", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Druid Gamma"],
  });
  bot.getNow = () => 5_000;

  const currentSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [
        { id: "m1", speaker: "Knight Alpha", text: "hi" },
        { id: "m2", speaker: "Knight Alpha", text: "ankrahmun" },
        { id: "m3", speaker: "Knight Alpha", text: "yes" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });

  const recorded = bot.recordFollowTrainSpeechFromSnapshot(currentSnapshot, null, 5_000);

  assert.deepEqual(recorded, []);
  assert.deepEqual(bot.getFollowTrainRecentActions(5_000), []);
});

test("recordFollowTrainSpeechFromSnapshot ignores remote npc channel chatter while a ship captain is nearby", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Druid Gamma"],
  });
  bot.getNow = () => 5_000;

  const snapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 350, y: 420, z: 7 },
    dialogue: {
      open: true,
      npcName: "Beowulf",
      recentMessages: [
        {
          id: "m1",
          speaker: "Knight Alpha",
          text: "save us",
          channelName: "Beowulf",
        },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Sinbeard",
        position: { x: 351, y: 420, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Sinbeard"],
  });

  const recorded = bot.recordFollowTrainSpeechFromSnapshot(snapshot, createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 350, y: 420, z: 7 },
    dialogue: {
      open: true,
      npcName: "Beowulf",
      recentMessages: [],
    },
    visibleNpcs: [
      {
        name: "Captain Sinbeard",
        position: { x: 351, y: 420, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Sinbeard"],
  }), 5_000);

  assert.deepEqual(recorded, []);
});

test("recordFollowTrainSpeechFromSnapshot diffs only the local player's ship keywords through interleaved chatter", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Druid Gamma"],
  });
  bot.getNow = () => 5_000;

  const previousSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [
        { id: "m1", speaker: "Knight Alpha", text: "hi" },
        { id: "m2", speaker: "Captain Bluebear", text: "Where can I sail you today?" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });
  const currentSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [
        { id: "m9", speaker: "Scout Beta", text: "hi" },
        { id: "m1", speaker: "Knight Alpha", text: "hi" },
        { id: "m2", speaker: "Captain Bluebear", text: "Where can I sail you today?" },
        { id: "m10", speaker: "Druid Gamma", text: "venore" },
        { id: "m3", speaker: "Knight Alpha", text: "venore" },
        { id: "m4", speaker: "Captain Bluebear", text: "Do you seek a passage to Venore?" },
        { id: "m5", speaker: "Knight Alpha", text: "yes" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });

  const recorded = bot.recordFollowTrainSpeechFromSnapshot(currentSnapshot, previousSnapshot, 5_000);

  assert.deepEqual(recorded.map((action) => action?.words), ["venore", "yes"]);
});

test("recordFollowTrainSpeechFromSnapshot tracks the last local ship keyword to avoid resurrecting an old route", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Druid Gamma"],
  });
  bot.getNow = () => 5_000;

  const previousSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [
        { id: "m1", speaker: "Knight Alpha", text: "hi" },
        { id: "m2", speaker: "Knight Alpha", text: "ankrahmun" },
        { id: "m3", speaker: "Knight Alpha", text: "yes" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });
  const currentSnapshot = createModuleSnapshot({
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [
        { id: "m1", speaker: "Knight Alpha", text: "hi" },
        { id: "m2", speaker: "Knight Alpha", text: "ankrahmun" },
        { id: "m3", speaker: "Knight Alpha", text: "yes" },
        { id: "m4", speaker: "Knight Alpha", text: "hi" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });

  bot.followTrainLastSelfMessageKey = bot.getDialogueMessageKey({ id: "m3", speaker: "Knight Alpha", text: "yes" });
  const recorded = bot.recordFollowTrainSpeechFromSnapshot(currentSnapshot, previousSnapshot, 5_000);

  assert.deepEqual(recorded.map((action) => action?.words), ["hi"]);
  assert.equal(bot.followTrainLastSelfMessageKey, bot.getDialogueMessageKey({ id: "m4", speaker: "Knight Alpha", text: "hi" }));
});

test("chooseFollowTrainAction replays ship travel dialogue in leader order", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta", "Druid Gamma"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 400, y: 500, z: 7 },
        floorTransition: null,
        recentActions: [
          {
            id: "travel-1",
            kind: "npc-keyword",
            words: "hi",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_000,
          },
          {
            id: "travel-2",
            kind: "npc-keyword",
            words: "ankrahmun",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_200,
          },
          {
            id: "travel-3",
            kind: "npc-keyword",
            words: "yes",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_400,
          },
        ],
        updatedAt: 9_500,
      },
      {
        instanceId: "beta",
        characterName: "Scout Beta",
        enabled: true,
        role: "follow-only",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "DESYNC_RECOVERY",
        followActive: false,
        leaderName: "Knight Alpha",
        playerPosition: { x: 100, y: 100, z: 7 },
        floorTransition: null,
        recentActions: [],
        updatedAt: 9_500,
      },
    ],
  };

  const castCalls = [];
  bot.castWords = async (action) => {
    castCalls.push(action);
    return { ok: true };
  };

  const closedDialogueSnapshot = createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: false,
      npcName: "",
      recentMessages: [],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });
  const openDialogueSnapshot = createModuleSnapshot({
    ...closedDialogueSnapshot,
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [],
    },
  });

  const firstAction = bot.chooseFollowTrainAction(closedDialogueSnapshot);
  assert.equal(firstAction?.kind, "follow-train-cast");
  assert.equal(firstAction?.words, "hi");
  assert.equal((await bot.executeFollowTrainAction(firstAction))?.ok, true);

  const secondAction = bot.chooseFollowTrainAction(openDialogueSnapshot);
  assert.equal(secondAction?.kind, "follow-train-cast");
  assert.equal(secondAction?.words, "ankrahmun");
  assert.equal((await bot.executeFollowTrainAction(secondAction))?.ok, true);

  const thirdAction = bot.chooseFollowTrainAction(openDialogueSnapshot);
  assert.equal(thirdAction?.kind, "follow-train-cast");
  assert.equal(thirdAction?.words, "yes");
  assert.equal((await bot.executeFollowTrainAction(thirdAction))?.ok, true);

  assert.deepEqual(
    castCalls.map((action) => ({ type: action.type, words: action.words })),
    [
      { type: "npc-keyword", words: "hi" },
      { type: "npc-keyword", words: "ankrahmun" },
      { type: "npc-keyword", words: "yes" },
    ],
  );
});

test("chooseFollowTrainAction uses the latest coherent ship dialogue sequence from the leader", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 400, y: 500, z: 7 },
        floorTransition: null,
        recentActions: [
          {
            id: "travel-old-1",
            kind: "npc-keyword",
            words: "hi",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 8_900,
          },
          {
            id: "travel-old-2",
            kind: "npc-keyword",
            words: "venore",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_000,
          },
          {
            id: "travel-old-3",
            kind: "npc-keyword",
            words: "yes",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_100,
          },
          {
            id: "travel-new-1",
            kind: "npc-keyword",
            words: "hi",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_500,
          },
          {
            id: "travel-new-2",
            kind: "npc-keyword",
            words: "edron",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_600,
          },
          {
            id: "travel-new-3",
            kind: "npc-keyword",
            words: "yes",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_700,
          },
        ],
        updatedAt: 9_800,
      },
    ],
  };
  bot.castWords = async () => ({ ok: true });

  const closedDialogueSnapshot = createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: false,
      npcName: "",
      recentMessages: [],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });
  const openDialogueSnapshot = createModuleSnapshot({
    ...closedDialogueSnapshot,
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [],
    },
  });

  const firstAction = bot.chooseFollowTrainAction(closedDialogueSnapshot);
  assert.equal(firstAction?.kind, "follow-train-cast");
  assert.equal(firstAction?.words, "hi");
  assert.equal((await bot.executeFollowTrainAction(firstAction))?.ok, true);

  const secondAction = bot.chooseFollowTrainAction(openDialogueSnapshot);
  assert.equal(secondAction?.kind, "follow-train-cast");
  assert.equal(secondAction?.words, "edron");
  assert.equal((await bot.executeFollowTrainAction(secondAction))?.ok, true);

  const thirdAction = bot.chooseFollowTrainAction(openDialogueSnapshot);
  assert.equal(thirdAction?.kind, "follow-train-cast");
  assert.equal(thirdAction?.words, "yes");
});

test("chooseFollowTrainAction synthesizes a greeting when only destination and confirmation keywords were captured", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 400, y: 500, z: 7 },
        floorTransition: null,
        recentActions: [
          {
            id: "travel-2",
            kind: "npc-keyword",
            words: "ankrahmun",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_200,
          },
          {
            id: "travel-3",
            kind: "npc-keyword",
            words: "yes",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_400,
          },
        ],
        updatedAt: 9_500,
      },
    ],
  };
  bot.castWords = async () => ({ ok: true });

  const closedDialogueSnapshot = createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: false,
      npcName: "",
      recentMessages: [],
    },
    visibleNpcs: [
      {
        name: "Captain Bluebear",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Bluebear"],
  });
  const openDialogueSnapshot = createModuleSnapshot({
    ...closedDialogueSnapshot,
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      recentMessages: [],
    },
  });

  const firstAction = bot.chooseFollowTrainAction(closedDialogueSnapshot);
  assert.equal(firstAction?.kind, "follow-train-cast");
  assert.equal(firstAction?.words, "hi");
  assert.equal(firstAction?.syntheticGreeting, true);
  assert.equal((await bot.executeFollowTrainAction(firstAction))?.ok, true);

  const secondAction = bot.chooseFollowTrainAction(openDialogueSnapshot);
  assert.equal(secondAction?.kind, "follow-train-cast");
  assert.equal(secondAction?.words, "ankrahmun");

  bot.noteConsumedFollowTrainAction("Knight Alpha", "travel-2", 10_000);
  const thirdAction = bot.chooseFollowTrainAction(openDialogueSnapshot);
  assert.equal(thirdAction?.kind, "follow-train-cast");
  assert.equal(thirdAction?.words, "yes");
});

test("chooseFollowTrainAction still synthesizes a greeting when public captain chatter leaves dialogue open", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 400, y: 500, z: 7 },
        floorTransition: null,
        recentActions: [
          {
            id: "travel-2",
            kind: "npc-keyword",
            words: "ankrahmun",
            npcName: "Captain Fearless",
            position: { x: 100, y: 100, z: 7 },
            at: 9_200,
          },
          {
            id: "travel-3",
            kind: "npc-keyword",
            words: "yes",
            npcName: "Captain Fearless",
            position: { x: 100, y: 100, z: 7 },
            at: 9_400,
          },
        ],
        updatedAt: 9_500,
      },
    ],
  };
  bot.castWords = async () => ({ ok: true });

  const noisyOpenDialogueSnapshot = createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Fearless",
      prompt: "Here we are. Good bye and welcome back.",
      recentMessages: [
        { id: "m1", speaker: "Passenger One", text: "hi", channelName: "Default" },
        { id: "m2", speaker: "Passenger One", text: "thais", channelName: "Default" },
        { id: "m3", speaker: "Passenger One", text: "yes", channelName: "Default" },
        { id: "m4", speaker: "Captain Fearless", text: "Here we are. Good bye and welcome back.", channelName: "Default" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Fearless",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Fearless"],
  });

  const firstAction = bot.chooseFollowTrainAction(noisyOpenDialogueSnapshot);
  assert.equal(firstAction?.kind, "follow-train-cast");
  assert.equal(firstAction?.words, "hi");
  assert.equal(firstAction?.syntheticGreeting, true);
  assert.equal((await bot.executeFollowTrainAction(firstAction))?.ok, true);

  const secondAction = bot.chooseFollowTrainAction(noisyOpenDialogueSnapshot);
  assert.equal(secondAction?.kind, "follow-train-cast");
  assert.equal(secondAction?.words, "ankrahmun");
});

test("chooseFollowTrainAction approaches the recorded ship tile before replaying captain dialogue", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 400, y: 500, z: 7 },
        floorTransition: null,
        recentActions: [
          {
            id: "travel-1",
            kind: "npc-keyword",
            words: "hi",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_000,
          },
          {
            id: "travel-2",
            kind: "npc-keyword",
            words: "ankrahmun",
            npcName: "Captain Bluebear",
            position: { x: 100, y: 100, z: 7 },
            at: 9_200,
          },
        ],
        updatedAt: 9_500,
      },
    ],
  };
  bot.findFollowTrainDestination = () => ({
    destination: { x: 100, y: 100, z: 7 },
    progressKey: "100,100,7",
  });

  const action = bot.chooseFollowTrainAction(createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 96, y: 100, z: 7 },
    dialogue: {
      open: false,
      npcName: "",
      recentMessages: [],
    },
    visibleNpcs: [],
    visibleNpcNames: [],
  }));

  assert.equal(action?.kind, "follow-train-walk");
  assert.equal(action?.reason, "npc-replay-approach");
  assert.deepEqual(action?.destination, { x: 100, y: 100, z: 7 });
  assert.equal(action?.progressKey, "100,100,7");
});

test("chooseFollowTrainAction ignores stale foreign dialogue and still greets the visible ship captain", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 400, y: 500, z: 7 },
        floorTransition: null,
        recentActions: [
          {
            id: "travel-2",
            kind: "npc-keyword",
            words: "ankrahmun",
            npcName: "Captain Fearless",
            position: { x: 100, y: 100, z: 7 },
            at: 9_200,
          },
          {
            id: "travel-3",
            kind: "npc-keyword",
            words: "yes",
            npcName: "Captain Fearless",
            position: { x: 100, y: 100, z: 7 },
            at: 9_400,
          },
        ],
        updatedAt: 9_500,
      },
    ],
  };
  bot.castWords = async () => ({ ok: true });

  const staleDialogueSnapshot = createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Nudzgor",
      prompt: "yes",
      recentMessages: [
        { id: "m1", speaker: "Scout Beta", text: "hi", channelName: "Default" },
        { id: "m2", speaker: "Nudzgor", text: "carlin", channelName: "Default" },
        { id: "m3", speaker: "Scout Beta", text: "utani hur", channelName: "Default" },
        { id: "m4", speaker: "Nudzgor", text: "yes", channelName: "Default" },
      ],
    },
    visibleNpcs: [
      {
        name: "Captain Fearless",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Captain Fearless"],
  });

  const action = bot.chooseFollowTrainAction(staleDialogueSnapshot);
  assert.equal(action?.kind, "follow-train-cast");
  assert.equal(action?.words, "hi");
  assert.equal(action?.syntheticGreeting, true);
  assert.equal((await bot.executeFollowTrainAction(action))?.ok, true);
});

test("buildFollowTrainBreadcrumbFloorTransitionAction walks onto the exani tera tile instead of using it from adjacent sqm", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 100, y: 100, z: 7 },
        floorTransition: {
          fromPosition: { x: 100, y: 100, z: 8 },
          toPosition: { x: 100, y: 100, z: 7 },
          accessPosition: { x: 100, y: 100, z: 8 },
          path: [{ x: 100, y: 100, z: 8 }],
          at: 9_900,
        },
        recentActions: [
          {
            id: "tera-1",
            kind: "spell",
            words: "exani tera",
            position: { x: 100, y: 100, z: 8 },
            npcName: "",
            at: 9_850,
          },
        ],
        updatedAt: 9_950,
      },
    ],
  };
  bot.findFollowTrainDestination = () => ({
    destination: { x: 100, y: 100, z: 8 },
    progressKey: "100,100,8",
  });

  const action = bot.buildFollowTrainBreadcrumbFloorTransitionAction(
    createModuleSnapshot({
      playerName: "Scout Beta",
      playerPosition: { x: 99, y: 100, z: 8 },
    }),
    {
      name: "Knight Alpha",
      position: { x: 100, y: 100, z: 7 },
    },
    10_000,
  );

  assert.equal(action?.kind, "follow-train-walk");
  assert.deepEqual(action?.destination, { x: 100, y: 100, z: 8 });
  assert.equal(action?.progressKey, "100,100,8");
});

test("chooseFollowTrainAction replays leader exani tera once the follower reaches the transition tile", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 100, y: 100, z: 7 },
        floorTransition: {
          fromPosition: { x: 100, y: 100, z: 8 },
          toPosition: { x: 100, y: 100, z: 7 },
          accessPosition: { x: 100, y: 100, z: 8 },
          path: [{ x: 100, y: 100, z: 8 }],
          at: 9_900,
        },
        recentActions: [
          {
            id: "tera-1",
            kind: "spell",
            words: "exani tera",
            position: { x: 100, y: 100, z: 8 },
            npcName: "",
            at: 9_850,
          },
        ],
        updatedAt: 9_950,
      },
    ],
  };

  const action = bot.chooseFollowTrainAction(createModuleSnapshot({
    playerName: "Scout Beta",
    playerPosition: { x: 100, y: 100, z: 8 },
  }));

  assert.equal(action?.kind, "follow-train-cast");
  assert.equal(action?.actionType, "spell");
  assert.equal(action?.words, "exani tera");
});

test("breadcrumb ramp recovery retries the exact walk tile instead of using it as an item", () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  bot.getNow = () => 10_000;
  bot.followTrainCoordinationState = {
    selfInstanceId: "beta",
    members: [
      {
        instanceId: "alpha",
        characterName: "Knight Alpha",
        enabled: true,
        role: "attack-and-follow",
        trainerEnabled: false,
        trainerAutoPartyEnabled: true,
        trainerPartnerName: "",
        currentState: "FOLLOWING",
        followActive: true,
        leaderName: "",
        playerPosition: { x: 100, y: 100, z: 7 },
        floorTransition: {
          fromPosition: { x: 100, y: 100, z: 8 },
          toPosition: { x: 100, y: 100, z: 7 },
          accessPosition: { x: 100, y: 100, z: 8 },
          path: [{ x: 100, y: 100, z: 8 }],
          at: 9_900,
        },
        recentActions: [],
        updatedAt: 9_950,
      },
    ],
  };
  bot.setLastWalkAttempt("100,100,8", { x: 99, y: 100, z: 8 }, {
    now: 9_000,
    pendingProgress: true,
  });
  bot.findFollowTrainDestination = () => ({
    destination: { x: 100, y: 100, z: 8 },
    progressKey: "100,100,8",
  });

  const action = bot.buildFollowTrainBreadcrumbFloorTransitionAction(
    createModuleSnapshot({
      playerName: "Scout Beta",
      playerPosition: { x: 99, y: 100, z: 8 },
      hazardTiles: [
        {
          position: { x: 100, y: 100, z: 8 },
          categories: ["stairsLadders"],
          labels: ["ramp"],
        },
      ],
    }),
    {
      name: "Knight Alpha",
      position: { x: 100, y: 100, z: 7 },
    },
    10_000,
  );

  assert.equal(action?.kind, "follow-train-walk");
  assert.equal(action?.reason, "floor-breadcrumb");
  assert.deepEqual(action?.destination, { x: 100, y: 100, z: 8 });
});

test("executeFollowTrainAction dispatches ladder recovery through followTrainUseMapItem", async () => {
  const bot = new MinibiaTargetBot({
    partyFollowEnabled: true,
    partyFollowMembers: ["Knight Alpha", "Scout Beta"],
  });
  let received = null;
  bot.followTrainUseMapItem = async (action) => {
    received = action;
    return { ok: true, mode: "use-item" };
  };

  const action = {
    kind: "follow-train-use-item",
    position: { x: 100, y: 99, z: 8 },
    targetName: "Knight Alpha",
  };
  const result = await bot.executeFollowTrainAction(action);

  assert.deepEqual(received, action);
  assert.deepEqual(result, { ok: true, mode: "use-item" });
});

test("executeTrainerPartyAction dispatches invite and join through the party bridge", async () => {
  const bot = new MinibiaTargetBot({
    trainerEnabled: true,
    trainerAutoPartyEnabled: true,
  });
  const partyCalls = [];
  const events = [];
  let now = 10_000;

  bot.getNow = () => now;
  bot.on((event) => events.push(event));
  bot.attach = async () => null;
  bot.cdp = {
    async evaluate(expression) {
      const gameClient = {
        world: {
          activeCreatures: new Map([
            [22, { id: 22, name: "Scout Beta", __position: { x: 101, y: 100, z: 7 } }],
            [23, { id: 23, name: "Knight Alpha", __position: { x: 102, y: 100, z: 7 } }],
          ]),
        },
      };
      const g_game = {
        partyInvite(target) {
          partyCalls.push({ method: "partyInvite", target });
        },
        partyJoin(target) {
          partyCalls.push({ method: "partyJoin", target });
        },
      };
      return Function("window", "globalThis", `return ${expression};`)({
        gameClient,
        g_game,
      }, {
        g_game,
      });
    },
  };

  const inviteResult = await bot.executeTrainerPartyAction({
    kind: "trainer-party-invite",
    actionKey: "trainer-party-invite:22",
    targetId: 22,
    targetName: "Scout Beta",
  });

  assert.equal(inviteResult?.ok, true);
  assert.equal(inviteResult?.action, "invite");
  assert.equal(inviteResult?.transport, "partyInvite");
  assert.deepEqual(partyCalls[0], {
    method: "partyInvite",
    target: 22,
  });
  assert.equal(bot.getLastModuleActionAt("trainer-party-invite:22"), 10_000);
  assert.ok(events.some((event) => event.type === "route-action" && event.payload?.action === "trainer-party-invite"));

  now = 12_500;
  const joinResult = await bot.executeTrainerPartyAction({
    kind: "trainer-party-join",
    actionKey: "trainer-party-join:23",
    targetId: 23,
    targetName: "Knight Alpha",
    leaderName: "Knight Alpha",
  });

  assert.equal(joinResult?.ok, true);
  assert.equal(joinResult?.action, "join");
  assert.equal(joinResult?.transport, "partyJoin");
  assert.deepEqual(partyCalls[1], {
    method: "partyJoin",
    target: 23,
  });
  assert.equal(bot.getLastModuleActionAt("trainer-party-join:23"), 12_500);
  assert.ok(events.some((event) => event.type === "route-action" && event.payload?.action === "trainer-party-join"));
});

test("tick waits for rookiller level 8 and 90% before activating", async () => {
  const bot = new MinibiaTargetBot({
    rookillerEnabled: true,
    autowalkEnabled: true,
  });
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 7 },
    playerStats: {
      healthPercent: 100,
      mana: 100,
      manaPercent: 100,
      level: 8,
      levelPercent: 89,
    },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
  };

  bot.refresh = async () => snapshot;
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  await bot.tick();

  assert.equal(bot.options.autowalkEnabled, true);
  assert.equal(bot.getRookillerStatus().active, false);
});

test("tick activates rookiller at level 8 and 90%, disables autowalk, and returns without targeting nearby threats", async () => {
  const bot = new MinibiaTargetBot({
    rookillerEnabled: true,
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 102, y: 100, z: 7, type: "walk" },
    ],
  });
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 7 },
    playerStats: {
      healthPercent: 100,
      mana: 100,
      manaPercent: 100,
      level: 8,
      levelPercent: 90,
    },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [
      {
        id: 77,
        name: "Rat",
        position: { x: 101, y: 100, z: 7 },
        withinCombatBox: true,
        reachableForCombat: true,
        distance: 1,
        chebyshevDistance: 1,
      },
    ],
  };
  const events = [];
  const targeted = [];
  let interrupted = 0;

  bot.on((event) => events.push(event.type));
  bot.refresh = async () => snapshot;
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.interruptAutoWalk = async () => {
    interrupted += 1;
    return { ok: true, interruptedWalk: true };
  };
  bot.target = async (selection) => {
    targeted.push(selection?.chosen?.id ?? null);
    return { ok: true };
  };
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  await bot.tick();

  assert.equal(bot.options.autowalkEnabled, false);
  assert.equal(bot.getRookillerStatus().active, true);
  assert.equal(bot.getRookillerStatus().phase, "returning");
  assert.equal(bot.getRouteResetStatus().active, true);
  assert.equal(bot.getRouteResetStatus().targetIndex, 0);
  assert.deepEqual(targeted, []);
  assert.equal(interrupted, 1);
  assert.ok(events.includes("rookiller-triggered"));
  assert.ok(events.includes("rookiller-return-started"));
});

test("tick starts rookiller return to waypoint 1 after reaching the experience cap", async () => {
  const bot = new MinibiaTargetBot({
    rookillerEnabled: true,
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
      { x: 102, y: 100, z: 7, type: "walk" },
    ],
  });
  const snapshot = {
    ready: true,
    playerPosition: { x: 102, y: 100, z: 7 },
    playerStats: {
      healthPercent: 100,
      mana: 100,
      manaPercent: 100,
      level: 8,
      levelPercent: 90,
    },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
  };
  const events = [];

  bot.on((event) => events.push(event.type));
  bot.refresh = async () => snapshot;
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.interruptAutoWalk = async () => ({ ok: true, interruptedWalk: true });
  bot.target = async () => ({ ok: true });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.running = true;

  await bot.tick();

  assert.equal(bot.getRookillerStatus().phase, "returning");
  assert.equal(bot.getRouteResetStatus().active, true);
  assert.equal(bot.getRouteResetStatus().targetIndex, 0);
  assert.equal(bot.running, true);
  assert.ok(events.includes("rookiller-return-started"));
});

test("tick closes the client at waypoint 1 after the rookiller return completes", async () => {
  const bot = new MinibiaTargetBot({
    rookillerEnabled: true,
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 100, z: 7, type: "walk" },
    ],
  });
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 7 },
    playerStats: {
      healthPercent: 100,
      mana: 100,
      manaPercent: 100,
      level: 8,
      levelPercent: 90,
    },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
  };
  const events = [];

  bot.on((event) => events.push(event));
  bot.refresh = async () => {
    bot.lastSnapshot = snapshot;
    return snapshot;
  };
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.interruptAutoWalk = async () => ({ ok: true, interruptedWalk: true });
  bot.target = async () => ({ ok: true });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.running = true;

  await bot.tick();

  assert.equal(bot.getRookillerStatus().phase, "disconnecting");
  assert.equal(bot.getRouteResetStatus().active, false);
  assert.equal(bot.running, false);
  assert.ok(events.some((event) => event.type === "rookiller-disconnect" && event.payload?.reason === "waypoint-return-complete"));
});

test("tick falls back to disconnect when rookiller has no route to waypoint 1", async () => {
  const bot = new MinibiaTargetBot({
    rookillerEnabled: true,
    autowalkEnabled: true,
  });
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 100, z: 7 },
    playerStats: {
      healthPercent: 100,
      mana: 100,
      manaPercent: 100,
      level: 8,
      levelPercent: 90,
    },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
  };
  const events = [];

  bot.on((event) => events.push(event.type));
  bot.refresh = async () => snapshot;
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.interruptAutoWalk = async () => ({ ok: true, interruptedWalk: true });
  bot.target = async () => ({ ok: true });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.running = true;

  await bot.tick();

  assert.equal(bot.getRookillerStatus().phase, "disconnecting");
  assert.equal(bot.running, false);
  assert.ok(events.includes("rookiller-disconnect"));
});

test("tick auto-starts reconnect for unexpected disconnects and resumes once live again", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 4000,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  const liveSnapshot = {
    ready: true,
    reason: "",
    connection: {
      connected: true,
    },
    playerPosition: { x: 100, y: 100, z: 7 },
    playerStats: {
      healthPercent: 100,
      mana: 100,
      manaPercent: 100,
      level: 20,
    },
    currentTarget: null,
    candidates: [],
    visibleCreatures: [],
  };
  const events = [];
  let refreshCount = 0;
  let reconnectCalls = 0;
  let healCalls = 0;

  bot.on((event) => events.push(event.type));
  bot.refresh = async () => {
    refreshCount += 1;
    return refreshCount === 1 ? disconnectedSnapshot : liveSnapshot;
  };
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      reconnecting: true,
      message: "Reconnecting...",
    };
  };
  bot.attemptHeal = async () => {
    healCalls += 1;
    return { action: null, result: null };
  };
  bot.handleRookiller = async () => ({ active: false, handled: false });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  await bot.tick();
  assert.equal(reconnectCalls, 1);
  assert.equal(healCalls, 0);
  assert.equal(bot.getReconnectStatus().active, true);
  assert.equal(bot.getReconnectStatus().attempts, 1);
  assert.equal(bot.getReconnectStatus().phase, "attempting");

  await bot.tick();
  assert.equal(bot.getReconnectStatus().active, false);
  assert.equal(healCalls, 1);
  assert.ok(events.includes("reconnect-detected"));
  assert.ok(events.includes("reconnect-attempt"));
  assert.ok(events.includes("reconnect-restored"));
});

test("handleReconnect keeps retrying reconnect button attempts until the session is live", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
    reconnectMaxAttempts: 0,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  const liveSnapshot = {
    ready: true,
    reason: "",
    connection: {
      connected: true,
    },
  };
  const events = [];
  let now = 10_000;
  let reconnectCalls = 0;

  bot.getNow = () => now;
  bot.on((event) => events.push(event));
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      clicked: true,
      action: "button-click",
      reconnecting: false,
      message: `Restore session ${reconnectCalls}`,
    };
  };

  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).attempts, 1);
  assert.equal(bot.getReconnectStatus(now).phase, "attempting");

  now += 999;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).phase, "cooldown");

  now += 1;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 2);
  assert.equal(bot.getReconnectStatus(now).attempts, 2);

  now += 1000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 3);
  assert.equal(bot.getReconnectStatus(now).attempts, 3);

  await bot.handleReconnect(liveSnapshot);
  assert.equal(bot.getReconnectStatus(now).active, false);
  assert.equal(events.filter((event) => event.type === "reconnect-attempt").length, 3);
  assert.equal(events.find((event) => event.type === "reconnect-restored")?.payload?.attempts, 3);
});

test("handleReconnect preserves reconnect attempts through transient gameClient bootstrap windows", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
    reconnectMaxAttempts: 2,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  const bootstrapSnapshot = {
    ready: false,
    reason: "gameClient not ready",
    connection: {
      connected: true,
      wasConnected: false,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: false,
      reconnectOverlayVisible: false,
      reconnectMessage: "Reconnecting...",
    },
  };
  const events = [];
  let now = 25_000;
  let reconnectCalls = 0;

  bot.getNow = () => now;
  bot.on((event) => events.push(event));
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      clicked: true,
      action: "button-click",
      reconnecting: true,
      message: "Reconnecting...",
    };
  };

  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).attempts, 1);
  assert.equal(bot.getReconnectStatus(now).phase, "attempting");

  now += 500;
  await bot.handleReconnect(bootstrapSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).active, true);
  assert.equal(bot.getReconnectStatus(now).attempts, 1);
  assert.equal(bot.getReconnectStatus(now).phase, "attempting");

  now += 500;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 2);
  assert.equal(bot.getReconnectStatus(now).attempts, 2);
  assert.equal(bot.getReconnectStatus(now).phase, "attempting");

  now += 500;
  await bot.handleReconnect(bootstrapSnapshot);
  assert.equal(reconnectCalls, 2);
  assert.equal(bot.getReconnectStatus(now).active, true);
  assert.equal(bot.getReconnectStatus(now).attempts, 2);
  assert.equal(bot.getReconnectStatus(now).phase, "attempting");

  now += 500;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 2);
  assert.equal(bot.getReconnectStatus(now).phase, "exhausted");
  assert.equal(events.filter((event) => event.type === "reconnect-attempt").length, 2);
  assert.equal(events.find((event) => event.type === "reconnect-exhausted")?.payload?.attempts, 2);
});

test("handleReconnect keeps regular disconnects on the normal fast retry path", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
    dialogue: {
      recentMessages: [
        { id: "m1", speaker: "Server", text: "Connection lost." },
      ],
    },
  };
  let now = 60_000;
  let reconnectCalls = 0;

  bot.getNow = () => now;
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      clicked: true,
      action: "button-click",
      reconnecting: false,
      message: "Reconnect now.",
    };
  };

  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).shutdownSaveAware, false);
  assert.equal(bot.getReconnectStatus(now).attempts, 1);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + 1000);
});

test("handleReconnect uses the shutdown-only 10/5/3/2/1 minute reconnect ladder", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
    dialogue: {
      recentMessages: [
        { id: "shutdown-10", speaker: "Server", text: "The server is shutting down in 10 minutes." },
      ],
    },
  };
  let now = 100_000;
  let reconnectCalls = 0;

  bot.getNow = () => now;
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: false,
      message: `Server save still in progress ${reconnectCalls}`,
    };
  };

  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 0);
  assert.equal(bot.getReconnectStatus(now).shutdownSaveAware, true);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 0);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (10 * 60_000));

  now += 10 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 1);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (5 * 60_000));

  now += 5 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 2);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 2);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (3 * 60_000));

  now += 3 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 3);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 3);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (2 * 60_000));

  now += 2 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 4);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 4);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (1 * 60_000));

  now += 1 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 5);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 5);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (1 * 60_000));

  now += 1 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 6);
  assert.equal(bot.getReconnectStatus(now).shutdownRetryStep, 6);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (1 * 60_000));
});

test("trainer reconnect uses the same shutdown-only reconnect ladder", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: false,
    trainerEnabled: true,
    trainerReconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
    dialogue: {
      recentMessages: [
        { id: "shutdown-5", speaker: "Server", text: "Server is shutting down in 5 minutes." },
      ],
    },
  };
  let now = 200_000;
  let reconnectCalls = 0;

  bot.getNow = () => now;
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      clicked: true,
      action: "button-click",
      reconnecting: false,
      message: "Reconnect pressed.",
    };
  };

  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 0);
  assert.equal(bot.getReconnectStatus(now).trainerOnly, true);
  assert.equal(bot.getReconnectStatus(now).shutdownSaveAware, true);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (10 * 60_000));

  now += 10 * 60_000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus(now).attempts, 1);
  assert.equal(bot.getReconnectStatus(now).nextAttemptAt, now + (5 * 60_000));
});

test("handleReconnect retries the real reconnect button through CDP mouse clicks until the session is live", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
    reconnectMaxAttempts: 3,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  const liveSnapshot = {
    ready: true,
    reason: "",
    connection: {
      connected: true,
    },
  };
  const rect = {
    left: 60,
    top: 75,
    width: 120,
    height: 42,
  };
  const events = [];
  const sentEvents = [];
  let now = 50_000;
  let buttonClicks = 0;
  let directReconnectCalls = 0;
  const networkManager = {
    state: { connected: false },
    __wasConnected: true,
    __reconnecting: false,
    __intentionalClose: false,
    __serverError: "",
    reconnectNow() {
      directReconnectCalls += 1;
      throw new Error("direct reconnect method should not be called");
    },
  };
  const reconnectButton = createDomElement({
    rect,
    click() {
      buttonClicks += 1;
    },
  });
  const elements = {
    "reconnect-overlay": createDomElement(),
    "reconnect-now-btn": reconnectButton,
    "reconnect-message": createDomElement({ textContent: "Connection lost." }),
  };

  bot.getNow = () => now;
  bot.on((event) => events.push(event));
  bot.cdp = {
    async evaluate(expression) {
      return evaluatePageExpression(expression, {
        gameClient: {
          player: {
            isDead: false,
          },
          networkManager,
        },
        elements,
      });
    },
    async send(method, params = {}) {
      sentEvents.push({ method, params });
      if (method === "Input.dispatchMouseEvent" && params.type === "mouseReleased") {
        const inside = params.x >= rect.left
          && params.x <= rect.left + rect.width
          && params.y >= rect.top
          && params.y <= rect.top + rect.height;
        if (inside) reconnectButton.click();
      }
      return {};
    },
  };

  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(buttonClicks, 1);
  assert.equal(bot.getReconnectStatus(now).attempts, 1);

  now += 1000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(buttonClicks, 2);
  assert.equal(bot.getReconnectStatus(now).attempts, 2);

  now += 1000;
  await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(buttonClicks, 3);
  assert.equal(bot.getReconnectStatus(now).attempts, 3);

  await bot.handleReconnect(liveSnapshot);

  assert.equal(directReconnectCalls, 0);
  assert.equal(bot.getReconnectStatus(now).active, false);
  assert.equal(events.filter((event) => event.type === "reconnect-attempt").length, 3);
  assert.equal(events.find((event) => event.type === "reconnect-restored")?.payload?.attempts, 3);
  assert.equal(sentEvents.filter((event) => event.method === "Input.dispatchMouseEvent" && event.params.type === "mousePressed").length, 3);
  assert.equal(sentEvents.filter((event) => event.method === "Input.dispatchMouseEvent" && event.params.type === "mouseReleased").length, 3);
});

test("tick never triggers reconnect on death", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 4000,
  });
  let reconnectCalls = 0;
  let healCalls = 0;

  bot.refresh = async () => ({
    ready: false,
    reason: "dead",
    connection: {
      connected: true,
      wasConnected: false,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: false,
      playerIsDead: true,
      deathModalVisible: true,
    },
  });
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return { ok: true };
  };
  bot.attemptHeal = async () => {
    healCalls += 1;
    return { action: null, result: null };
  };
  bot.handleRookiller = async () => ({ active: false, handled: false });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.chooseRouteAction = () => null;
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;

  await bot.tick();

  assert.equal(reconnectCalls, 0);
  assert.equal(bot.getReconnectStatus().active, false);
  assert.equal(healCalls, 0);
});

test("tick resumes autonomous route work once reconnect restores the live session", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 1000,
    reconnectMaxAttempts: 3,
  });
  const snapshots = [
    {
      ready: false,
      reason: "gameClient not ready",
      connection: {
        connected: false,
        wasConnected: true,
        reconnecting: false,
        intentionalClose: false,
        canReconnect: true,
        reconnectOverlayVisible: true,
        reconnectMessage: "Reconnect failed (server error). Try again.",
      },
    },
    {
      ready: false,
      reason: "gameClient not ready",
      connection: {
        connected: true,
        wasConnected: false,
        reconnecting: false,
        intentionalClose: false,
        canReconnect: false,
        reconnectOverlayVisible: false,
        reconnectMessage: "Reconnecting...",
      },
    },
    {
      ready: false,
      reason: "gameClient not ready",
      connection: {
        connected: false,
        wasConnected: true,
        reconnecting: false,
        intentionalClose: false,
        canReconnect: true,
        reconnectOverlayVisible: true,
        reconnectMessage: "Session expired. Please log in again.",
      },
    },
    {
      ready: true,
      reason: "",
      connection: {
        connected: true,
        reconnecting: false,
      },
      playerPosition: { x: 100, y: 100, z: 7 },
      playerStats: {
        healthPercent: 100,
        mana: 100,
        manaPercent: 100,
        level: 20,
      },
      currentTarget: null,
      candidates: [],
      visibleCreatures: [],
    },
  ];
  const events = [];
  let now = 40_000;
  let refreshIndex = 0;
  let reconnectCalls = 0;
  let routeActionCalls = 0;

  bot.running = true;
  bot.getNow = () => now;
  bot.on((event) => events.push(event));
  bot.refresh = async () => snapshots[Math.min(refreshIndex++, snapshots.length - 1)];
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return {
      ok: true,
      started: true,
      clicked: true,
      action: "input-mouse-click",
      reconnecting: true,
      message: "Reconnecting...",
    };
  };
  bot.getActiveVocationProfile = async () => null;
  bot.attemptDeathHeal = async () => ({ action: null, result: null });
  bot.attemptSustain = async () => ({ action: null, result: null });
  bot.attemptHeal = async () => ({ action: null, result: null });
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.attemptTrainerEscape = async () => ({ action: null, result: null });
  bot.handleRookiller = async () => ({ active: false, handled: false });
  bot.getVisibleEscapeThreats = () => [];
  bot.attemptAutoEat = async () => ({ action: null, result: null });
  bot.attemptEquipmentAutoReplace = async () => ({ action: null, result: null });
  bot.chooseLight = () => null;
  bot.chooseManaTrainer = () => null;
  bot.chooseRuneMaker = () => null;
  bot.chooseUrgentConvert = () => null;
  bot.chooseUrgentValueSlotRepair = () => null;
  bot.attemptRefill = async () => ({ action: null, result: null });
  bot.chooseFollowTrainSuspendAction = () => null;
  bot.chooseFollowTrainAction = () => null;
  bot.attemptLoot = async () => ({ action: null, result: null });
  bot.chooseTarget = () => null;
  bot.chooseDistanceKeeper = () => null;
  bot.chooseSpellCaster = () => null;
  bot.chooseConvert = () => null;
  bot.chooseRouteAction = (snapshot) => (snapshot?.ready
    ? { kind: "walk", waypoint: { x: 101, y: 100, z: 7 }, destination: { x: 101, y: 100, z: 7 } }
    : null);
  bot.executeRouteAction = async () => {
    routeActionCalls += 1;
    return { ok: true };
  };

  await bot.tick();
  now += 500;
  await bot.tick();
  now += 500;
  await bot.tick();
  now += 500;
  const liveSnapshot = await bot.tick();

  assert.equal(reconnectCalls, 2);
  assert.equal(routeActionCalls, 1);
  assert.equal(liveSnapshot?.ready, true);
  assert.equal(bot.getReconnectStatus(now).active, false);
  assert.equal(events.filter((event) => event.type === "reconnect-attempt").length, 2);
  assert.equal(events.find((event) => event.type === "reconnect-restored")?.payload?.attempts, 2);
});

test("tick stays passive while reconnect is death-blocked", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 0,
  });
  const deadSnapshot = {
    ready: false,
    reason: "dead",
    connection: {
      connected: true,
      wasConnected: false,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: false,
      playerIsDead: true,
      deathModalVisible: true,
    },
  };
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  let refreshCount = 0;
  let reconnectCalls = 0;
  let vocationLoads = 0;

  bot.refresh = async () => (refreshCount++ === 0 ? deadSnapshot : disconnectedSnapshot);
  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return { ok: true };
  };
  bot.getActiveVocationProfile = async () => {
    vocationLoads += 1;
    return null;
  };

  await bot.tick();
  await bot.tick();

  assert.equal(reconnectCalls, 0);
  assert.equal(vocationLoads, 0);
  assert.equal(bot.getReconnectStatus().deathBlocked, true);
});

test("handleReconnect blocks future auto reconnect attempts once a reconnect click detects death", async () => {
  const bot = new MinibiaTargetBot({
    reconnectEnabled: true,
    reconnectRetryDelayMs: 0,
  });
  const disconnectedSnapshot = {
    ready: false,
    reason: "disconnected",
    connection: {
      connected: false,
      wasConnected: true,
      reconnecting: false,
      intentionalClose: false,
      canReconnect: true,
      reconnectOverlayVisible: true,
      reconnectMessage: "Connection lost.",
    },
  };
  let reconnectCalls = 0;

  bot.reconnectNow = async () => {
    reconnectCalls += 1;
    return { ok: false, reason: "dead" };
  };

  const firstResult = await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(firstResult.phase, "dead");
  assert.equal(reconnectCalls, 1);
  assert.equal(bot.getReconnectStatus().active, false);
  assert.equal(bot.getReconnectStatus().deathBlocked, true);

  const secondResult = await bot.handleReconnect(disconnectedSnapshot);
  assert.equal(secondResult.phase, "death-blocked");
  assert.equal(reconnectCalls, 1);

  await bot.handleReconnect({
    ready: true,
    reason: "",
    connection: { connected: true },
  });
  assert.equal(bot.getReconnectStatus().deathBlocked, false);
});
