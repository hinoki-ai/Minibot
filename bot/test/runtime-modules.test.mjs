import test from "node:test";
import assert from "node:assert/strict";
import { MinibiaTargetBot } from "../lib/bot-core.mjs";

function createBot(options = {}) {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: false,
    manaTrainerEnabled: false,
    runeMakerEnabled: false,
    autoConvertEnabled: false,
    spellCasterEnabled: false,
    distanceKeeperEnabled: false,
    deathHealEnabled: false,
    ...options,
  });

  bot.handleReconnect = async () => ({ handled: false });
  bot.handlePausedCavebotTick = async () => ({ handled: false });
  bot.handleRookiller = async () => ({ handled: false });
  return bot;
}

function installRefresh(bot, snapshot) {
  bot.refresh = async () => {
    bot.lastSnapshot = snapshot;
    bot.lastSnapshotAt = Date.now();
    return snapshot;
  };
}

test("tick records lightweight runtime timing samples", async () => {
  const bot = createBot();
  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    hotbar: {
      slotCount: 0,
      slots: [],
    },
    containers: [],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();
  const timing = bot.getRuntimeTiming();

  assert.equal(snapshot?.ready, true);
  assert.equal(timing.tick.count, 1);
  assert.equal(timing.tick.ready, true);
  assert.equal(timing.tick.failed, false);
  assert.equal(timing.tick.running, false);
  assert.equal(timing.tick.routeIndex, 0);
  assert.ok(Number.isFinite(timing.tick.lastMs));
  assert.ok(Number.isFinite(timing.tick.avgMs));
  assert.ok(Number.isFinite(timing.tick.maxMs));
  assert.ok(timing.tick.lastAt > 0);
});

test("tick uses the vocation sustain planner before falling back to the legacy healer", async () => {
  const bot = createBot({
    vocation: "paladin",
  });
  const usedHotbarSlots = [];
  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 60,
      maxHealth: 300,
      healthPercent: 20,
      mana: 100,
      maxMana: 120,
      manaPercent: 83,
    },
    hotbar: {
      slotCount: 1,
      slots: [
        {
          index: 0,
          kind: "spell",
          label: "Ultimate Healing",
          words: "exura vita",
          spellName: "Ultimate Healing",
          enabled: true,
        },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.useHotbarSlot = async (action) => {
    usedHotbarSlots.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, label: action.label };
  };
  bot.castWords = async () => {
    throw new Error("legacy healer should not run when the sustain hotbar action succeeds");
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(usedHotbarSlots.length, 1);
  assert.equal(usedHotbarSlots[0].slotIndex, 0);
  assert.equal(usedHotbarSlots[0].moduleKey, "sustain");
});

test("tick lets the configured healer rune threshold outrank sustain health potions", async () => {
  const bot = createBot({
    vocation: "druid",
    healerEnabled: true,
    healerRules: [],
    healerEmergencyHealthPercent: 0,
    healerRuneName: "Ultimate Healing Rune",
    healerRuneHealthPercent: 35,
  });
  const usedItems = [];

  bot.getActiveVocationProfile = async () => ({
    sustain: {
      healSpells: [],
      potionPolicy: {
        emergencyHealthPercent: 20,
        healthThresholdPercent: 45,
        manaThresholdPercent: 25,
        preferredHealthPotionNames: ["Health Potion"],
        preferredManaPotionNames: ["Strong Mana Potion"],
      },
      supplyThresholds: {
        food: 0,
      },
      ammoPolicy: {
        enabled: false,
      },
    },
    looting: {
      priorities: ["gold"],
    },
  });

  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 102,
      maxHealth: 300,
      healthPercent: 34,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    hotbar: {
      slotCount: 0,
      slots: [],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 2273, name: "Ultimate Healing Rune", count: 3 },
          { id: 7618, name: "Health Potion", count: 12 },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.useItemOnSelf = async (action) => {
    usedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name };
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(usedItems.length, 1);
  assert.equal(usedItems[0]?.category, "rune");
  assert.equal(usedItems[0]?.name, "Ultimate Healing Rune");
  assert.equal(usedItems[0]?.moduleKey, "healerRune");
});

test("tick automatically fires the configured healer rune hotkey before sustain or covered spell heals", async () => {
  const bot = createBot({
    vocation: "knight",
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
    healerRuneName: "Ultimate Healing Rune",
    healerRuneHotkey: "F5",
    healerRuneHealthPercent: 50,
  });
  const pressedHotkeys = [];
  let sustainCalled = false;

  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 130,
      maxHealth: 300,
      healthPercent: 43,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    hotbar: {
      slotCount: 0,
      slots: [],
    },
    containers: [],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.attemptSustain = async () => {
    sustainCalled = true;
    return { action: { type: "heal", moduleKey: "sustain" }, result: { ok: true } };
  };
  bot.castWords = async () => {
    throw new Error("covered spell healer should not run before the configured auto rune");
  };
  bot.useHotkey = async (action) => {
    pressedHotkeys.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, transport: "keyboard-hotkey", hotkey: action.hotkey };
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(sustainCalled, false);
  assert.equal(pressedHotkeys.length, 1);
  assert.equal(pressedHotkeys[0]?.moduleKey, "healerRune");
  assert.equal(pressedHotkeys[0]?.hotkey, "F5");
  assert.equal(pressedHotkeys[0]?.target, "self");
});

test("tick loots opened corpse containers before resuming route movement", async () => {
  const bot = createBot({
    vocation: "paladin",
    lootingEnabled: true,
  });
  const movedItems = [];
  const executedRouteActions = [];
  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 250,
      maxHealth: 300,
      healthPercent: 83,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3031, name: "Gold Coin", count: 10, flags: { gold: true } } },
          { index: 1, item: null },
        ],
      },
      {
        runtimeId: 90,
        name: "Dead Orc",
        slots: [
          { index: 0, item: { id: 7368, name: "Royal Spear", count: 12, flags: { ammo: true } } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.moveInventoryItem = async (action) => {
    movedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name };
  };
  bot.chooseRouteAction = () => ({
    kind: "walk",
    waypoint: { x: 101, y: 200, z: 7 },
    destination: { x: 101, y: 200, z: 7 },
  });
  bot.executeRouteAction = async (action) => {
    executedRouteActions.push(action);
    return { ok: true };
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(movedItems.length, 1);
  assert.equal(movedItems[0].name, "Royal Spear");
  assert.equal(movedItems[0].moduleKey, "looting");
  assert.equal(executedRouteActions.length, 0);
});

test("tick opens a nearby hunt corpse before resuming route movement", async () => {
  const bot = createBot({
    vocation: "paladin",
    lootingEnabled: true,
    monsterNames: ["Orc"],
  });
  const openedCorpses = [];
  const executedRouteActions = [];
  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 250,
      maxHealth: 300,
      healthPercent: 83,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [],
      },
    ],
    lootableCorpses: [
      {
        itemId: 5001,
        name: "Dead Rat",
        position: { x: 102, y: 200, z: 7 },
        chebyshevDistance: 2,
      },
      {
        itemId: 5002,
        name: "Dead Orc",
        position: { x: 101, y: 200, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.openContainer = async (action) => {
    openedCorpses.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, position: action.position };
  };
  bot.chooseRouteAction = () => ({
    kind: "walk",
    waypoint: { x: 101, y: 200, z: 7 },
    destination: { x: 101, y: 200, z: 7 },
  });
  bot.executeRouteAction = async (action) => {
    executedRouteActions.push(action);
    return { ok: true };
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(openedCorpses.length, 1);
  assert.deepEqual(openedCorpses[0].position, { x: 101, y: 200, z: 7 });
  assert.equal(openedCorpses[0].moduleKey, "looting");
  assert.equal(executedRouteActions.length, 0);
});

test("tick executes a live refill shop action before resuming route movement when trade is open", async () => {
  const bot = createBot({
    vocation: "paladin",
    refillEnabled: true,
  });
  const boughtItems = [];
  const executedRouteActions = [];
  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 250,
      maxHealth: 300,
      healthPercent: 83,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    trade: {
      open: true,
      buyItems: [
        { itemId: 237, name: "Supreme Health Potion", price: 190 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.buyItem = async (action) => {
    boughtItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name };
  };
  bot.chooseRouteAction = () => ({
    kind: "walk",
    waypoint: { x: 101, y: 200, z: 7 },
    destination: { x: 101, y: 200, z: 7 },
  });
  bot.executeRouteAction = async (action) => {
    executedRouteActions.push(action);
    return { ok: true };
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(boughtItems.length, 1);
  assert.equal(boughtItems[0].name, "Supreme Health Potion");
  assert.equal(boughtItems[0].moduleKey, "refill");
  assert.equal(executedRouteActions.length, 0);
});

test("chooseRouteAction returns route automation waypoint kinds when reached", () => {
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  for (const [type, kind] of [
    ["shop", "shop"],
    ["npc-action", "npc-action"],
    ["daily-task", "daily-task"],
  ]) {
    const bot = createBot({
      autowalkEnabled: true,
      waypoints: [
        { x: 100, y: 200, z: 7, type },
        { x: 101, y: 200, z: 7, type: "walk" },
      ],
    });

    const action = bot.chooseRouteAction(snapshot);
    assert.equal(action?.kind, kind);
    assert.equal(action?.waypoint?.type, type);
  }
});

test("executeShopWaypoint runs the refill plan while trade is open and advances when complete", async () => {
  const bot = createBot({
    autowalkEnabled: true,
    refillEnabled: true,
    waypoints: [
      { x: 100, y: 200, z: 7, type: "shop" },
      { x: 101, y: 200, z: 7, type: "walk" },
    ],
  });
  const boughtItems = [];
  const vocationProfile = {
    sustain: {
      supplyThresholds: {
        potions: 1,
      },
      potionPolicy: {
        preferredHealthPotionNames: ["Health Potion"],
      },
    },
  };
  const baseSnapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    trade: {
      open: true,
      buyItems: [
        { itemId: 266, name: "Health Potion", price: 45 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 2666, name: "Meat", count: 1 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
  };

  bot.getActiveVocationProfile = async () => vocationProfile;
  bot.buyItem = async (action) => {
    boughtItems.push(action);
    return { ok: true, name: action.name };
  };

  bot.lastSnapshot = baseSnapshot;
  const buyResult = await bot.executeRouteAction({
    kind: "shop",
    waypoint: bot.getCurrentWaypoint(),
  });

  assert.equal(buyResult?.ok, true);
  assert.equal(boughtItems.length, 1);
  assert.equal(boughtItems[0].name, "Health Potion");
  assert.equal(bot.routeIndex, 0);

  bot.lastSnapshot = {
    ...baseSnapshot,
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 266, name: "Health Potion", count: 1 },
          { id: 2666, name: "Meat", count: 1 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
  };
  const doneResult = await bot.executeRouteAction({
    kind: "shop",
    waypoint: bot.getCurrentWaypoint(),
  });

  assert.equal(doneResult?.ok, true);
  assert.equal(doneResult?.completed, true);
  assert.equal(bot.routeIndex, 1);
});

test("executeRouteAction advances completed NPC and daily task route automation", async () => {
  const bot = createBot({
    autowalkEnabled: true,
    waypoints: [
      { x: 100, y: 200, z: 7, type: "npc-action", progressionAction: "buy-promotion" },
      { x: 101, y: 200, z: 7, type: "daily-task", taskTarget: "rotworm" },
      { x: 102, y: 200, z: 7, type: "walk" },
    ],
  });
  bot.lastSnapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
  };
  bot.buyPromotion = async (action) => ({
    ok: true,
    completed: true,
    target: action.promotionName || "promotion",
  });
  bot.dailyTask = async (action) => ({
    ok: true,
    completed: true,
    target: action.taskTarget,
  });

  const npcResult = await bot.executeRouteAction({
    kind: "npc-action",
    waypoint: bot.getCurrentWaypoint(),
  });
  const taskResult = await bot.executeRouteAction({
    kind: "daily-task",
    waypoint: bot.getCurrentWaypoint(),
  });

  assert.equal(npcResult?.ok, true);
  assert.equal(npcResult?.kind, "npc-action");
  assert.equal(bot.routeIndex, 2);
  assert.equal(taskResult?.ok, true);
  assert.equal(taskResult?.kind, "daily-task");
  assert.equal(taskResult?.target, "rotworm");
});

test("tick sends an anti-idle keepalive pulse after the configured idle window", async () => {
  const bot = createBot({
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
  });
  const evaluated = [];
  installRefresh(bot, {
    ready: true,
    playerName: "Knight Alpha",
    playerStats: {
      health: 250,
      maxHealth: 300,
      healthPercent: 83,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.startedAt = Date.now() - 2000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async (expression) => {
      evaluated.push(expression);
      return { ok: true, transport: "game-keepalive", method: "networkManager.sendKeepAlive" };
    },
    send: async () => {
      throw new Error("fallback key pulse should not run when keepalive succeeds");
    },
  };

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(evaluated.length, 1);
  assert.equal(bot.getLastModuleActionAt("antiIdle") > 0, true);
});

test("tick falls back to a Shift key pulse when no anti-idle keepalive hook is exposed", async () => {
  const bot = createBot({
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
  });
  const sentEvents = [];
  installRefresh(bot, {
    ready: true,
    playerName: "Knight Alpha",
    playerStats: {
      health: 250,
      maxHealth: 300,
      healthPercent: 83,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.startedAt = Date.now() - 2000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => ({ ok: false, reason: "keepalive unavailable" }),
    send: async (method, payload) => {
      sentEvents.push({ method, payload });
      return { ok: true };
    },
  };

  const snapshot = await bot.tick();
  const keyEvents = sentEvents.filter((entry) => entry.method === "Input.dispatchKeyEvent");

  assert.equal(snapshot?.ready, true);
  assert.deepEqual(
    keyEvents.map((entry) => entry.method),
    ["Input.dispatchKeyEvent", "Input.dispatchKeyEvent"],
  );
  assert.equal(sentEvents.some((entry) => entry.method === "Input.dispatchMouseEvent"), true);
  assert.equal(keyEvents[0].payload.type, "rawKeyDown");
  assert.equal(keyEvents[0].payload.key, "Shift");
  assert.equal(keyEvents[1].payload.type, "keyUp");
  assert.equal(bot.getLastModuleActionAt("antiIdle") > 0, true);
});

test("anti-idle falls back when direct keepalive evaluation throws", async () => {
  const bot = createBot({
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
  });
  const sentEvents = [];
  installRefresh(bot, {
    ready: true,
    playerName: "Knight Alpha",
    playerStats: {
      health: 250,
      maxHealth: 300,
      healthPercent: 83,
      mana: 90,
      maxMana: 120,
      manaPercent: 75,
    },
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  bot.startedAt = Date.now() - 2000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async (expression) => {
      if (String(expression).includes("innerWidth")) {
        return { x: 22, y: 33 };
      }
      throw new Error("runtime crashed");
    },
    send: async (method, payload) => {
      sentEvents.push({ method, payload });
      return { ok: true };
    },
  };

  const snapshot = await bot.tick();
  const status = bot.getAntiIdleStatus(snapshot);

  assert.equal(snapshot?.ready, true);
  assert.equal(sentEvents.some((entry) => entry.method === "Input.dispatchKeyEvent"), true);
  assert.equal(bot.getLastModuleActionAt("antiIdle") > 0, true);
  assert.equal(status.lastOk, true);
  assert.equal(status.lastTransport, "input-mouse-keyboard");
});

test("anti-idle backs off briefly after a failed pulse", async () => {
  const bot = createBot({
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
  });
  let now = 2_000;
  let directEvaluations = 0;

  bot.getNow = () => now;
  bot.startedAt = 1;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async (expression) => {
      if (String(expression).includes("innerWidth")) {
        return { x: 10, y: 10 };
      }
      directEvaluations += 1;
      return { ok: false, reason: "keepalive unavailable" };
    },
    send: async () => {
      throw new Error("input unavailable");
    },
  };
  installRefresh(bot, {
    ready: true,
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  await bot.tick();
  now = 2_500;
  await bot.tick();
  const retryingStatus = bot.getAntiIdleStatus(bot.lastSnapshot);
  now = 7_100;
  await bot.tick();

  assert.equal(directEvaluations, 2);
  assert.equal(retryingStatus.blocker, "retry");
  assert.equal(bot.getLastModuleActionAt("antiIdle"), 0);
});

test("tick sends anti-idle keepalives only after the configured idle interval", async () => {
  const bot = createBot({
    antiIdleEnabled: true,
    antiIdleIntervalMs: 60_000,
  });
  const keepalives = [];
  let now = 61_000;

  bot.getNow = () => now;
  bot.startedAt = 1_000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => {
      keepalives.push(now);
      return { ok: true, transport: "game-keepalive", method: "networkManager.sendKeepAlive" };
    },
    send: async () => {},
  };
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  await bot.tick();
  await bot.tick();
  now = 121_000;
  await bot.tick();

  assert.equal(keepalives.length, 2);
  assert.equal(keepalives[0], 61_000);
  assert.equal(keepalives[1], 121_000);
});

test("tick sends anti-idle keepalives even while a training target is visible", async () => {
  const bot = createBot({
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
  });
  const keepalives = [];

  bot.getNow = () => 2_500;
  bot.startedAt = 1_000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => {
      keepalives.push("pulse");
      return { ok: true, transport: "game-keepalive", method: "networkManager.sendKeepAlive" };
    },
    send: async () => {},
  };
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    visibleCreatures: [
      { id: 77, name: "Training Monk", position: { x: 101, y: 200, z: 7 } },
    ],
    candidates: [],
    currentTarget: { id: 77, name: "Training Monk", position: { x: 101, y: 200, z: 7 } },
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  const tickSnapshot = await bot.tick();
  const status = bot.getAntiIdleStatus(tickSnapshot);

  assert.equal(tickSnapshot?.ready, true);
  assert.deepEqual(keepalives, ["pulse"]);
  assert.equal(status.targetActive, true);
  assert.equal(status.visibleCreatureCount, 1);
  assert.equal(bot.getLastModuleActionAt("antiIdle") > 0, true);
});

test("tick uses auto eat before anti-idle when food is available", async () => {
  const bot = createBot({
    autoEatEnabled: true,
    autoEatCooldownMs: 1000,
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
  });
  const usedItems = [];
  const antiIdleEvaluations = [];

  bot.startedAt = Date.now() - 2000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => {
      antiIdleEvaluations.push("pulse");
      return { ok: true };
    },
    send: async () => {},
  };
  bot.useItem = async (action) => {
    usedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name, category: action.category };
  };
  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3725, name: "Brown Mushroom", count: 42, flags: { food: true } } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  const tickSnapshot = await bot.tick();

  assert.equal(tickSnapshot?.ready, true);
  assert.equal(usedItems.length, 1);
  assert.equal(usedItems[0].moduleKey, "autoEat");
  assert.equal(usedItems[0].name, "brown mushroom");
  assert.equal(usedItems[0].category, "food");
  assert.deepEqual(usedItems[0].source, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 0,
  });
  assert.equal(antiIdleEvaluations.length, 0);
});

test("tick equips replacement rings and amulets from open containers when equipment slots are empty", async () => {
  const bot = createBot({
    ringAutoReplaceEnabled: true,
    ringAutoReplaceItemName: "stealth ring",
    ringAutoReplaceCooldownMs: 1000,
    ringAutoReplaceRequireNoTargets: false,
    ringAutoReplaceRequireStationary: false,
    amuletAutoReplaceEnabled: true,
    amuletAutoReplaceItemName: "bronze amulet",
    amuletAutoReplaceCooldownMs: 1000,
    amuletAutoReplaceRequireNoTargets: false,
    amuletAutoReplaceRequireStationary: false,
  });
  const movedItems = [];
  const equipmentSlots = Array.from({ length: 10 }, (_, index) => ({
    index,
    label: [
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
    ][index],
    item: index === 6 ? { id: 2854, name: "Backpack", count: 1 } : null,
  }));

  bot.moveInventoryItem = async (action) => {
    movedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.label };
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    equipment: {
      slots: equipmentSlots,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3052, name: "Bronze Amulet", count: 1 } },
          { index: 1, item: { id: 3049, name: "Stealth Ring", count: 1 } },
        ],
      },
    ],
    visibleCreatures: [{ id: 77, name: "Training Monk" }],
    candidates: [{ id: 77, name: "Training Monk" }],
    currentTarget: { id: 77, name: "Training Monk" },
    isMoving: true,
    pathfinderAutoWalking: true,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  await bot.tick();
  assert.equal(movedItems.length, 1);
  assert.equal(movedItems[0].moduleKey, "amuletAutoReplace");
  assert.deepEqual(movedItems[0].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 0,
  });
  assert.deepEqual(movedItems[0].to, {
    location: "equipment",
    slotIndex: 7,
  });

  equipmentSlots[7].item = { id: 3052, name: "Bronze Amulet", count: 1 };
  await bot.tick();
  assert.equal(movedItems.length, 2);
  assert.equal(movedItems[1].moduleKey, "ringAutoReplace");
  assert.deepEqual(movedItems[1].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 1,
  });
  assert.deepEqual(movedItems[1].to, {
    location: "equipment",
    slotIndex: 8,
  });
});

test("tick treats full ring and amulet catalogs as valid fallback matches", async () => {
  const bot = createBot({
    ringAutoReplaceEnabled: true,
    ringAutoReplaceItemName: "",
    ringAutoReplaceCooldownMs: 1000,
    ringAutoReplaceRequireNoTargets: false,
    ringAutoReplaceRequireStationary: false,
    amuletAutoReplaceEnabled: true,
    amuletAutoReplaceItemName: "",
    amuletAutoReplaceCooldownMs: 1000,
    amuletAutoReplaceRequireNoTargets: false,
    amuletAutoReplaceRequireStationary: false,
  });
  const movedItems = [];
  const equipmentSlots = Array.from({ length: 10 }, (_, index) => ({
    index,
    label: [
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
    ][index],
    item: index === 6 ? { id: 2854, name: "Backpack", count: 1 } : null,
  }));

  bot.moveInventoryItem = async (action) => {
    movedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.label };
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    equipment: {
      slots: equipmentSlots,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3052, name: "Wolf Tooth Chain", count: 1 } },
          { index: 1, item: { id: 3049, name: "Emerald Bangle", count: 1 } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  await bot.tick();
  assert.equal(movedItems.length, 1);
  assert.equal(movedItems[0].moduleKey, "amuletAutoReplace");
  assert.deepEqual(movedItems[0].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 0,
  });
  assert.deepEqual(movedItems[0].to, {
    location: "equipment",
    slotIndex: 7,
  });

  equipmentSlots[7].item = { id: 3052, name: "Wolf Tooth Chain", count: 1 };
  await bot.tick();
  assert.equal(movedItems.length, 2);
  assert.equal(movedItems[1].moduleKey, "ringAutoReplace");
  assert.deepEqual(movedItems[1].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 1,
  });
  assert.deepEqual(movedItems[1].to, {
    location: "equipment",
    slotIndex: 8,
  });
});

test("tick resolves numeric jewelry ids for life ring replacement and generic amulet matching", async () => {
  const bot = createBot({
    ringAutoReplaceEnabled: true,
    ringAutoReplaceItemName: "life ring",
    ringAutoReplaceCooldownMs: 1000,
    ringAutoReplaceRequireNoTargets: false,
    ringAutoReplaceRequireStationary: false,
    amuletAutoReplaceEnabled: true,
    amuletAutoReplaceItemName: "amulet",
    amuletAutoReplaceCooldownMs: 1000,
    amuletAutoReplaceRequireNoTargets: false,
    amuletAutoReplaceRequireStationary: false,
  });
  const movedItems = [];
  const equipmentSlots = Array.from({ length: 10 }, (_, index) => ({
    index,
    label: [
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
    ][index],
    item: index === 6 ? { id: 2854, name: "Backpack", count: 1 } : null,
  }));

  bot.moveInventoryItem = async (action) => {
    movedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.label };
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    equipment: {
      slots: equipmentSlots,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3572, name: "3572", count: 1 } },
          { index: 1, item: { id: 3052, name: "3052", count: 1 } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  await bot.tick();
  assert.equal(movedItems.length, 1);
  assert.equal(movedItems[0].moduleKey, "amuletAutoReplace");
  assert.deepEqual(movedItems[0].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 0,
  });
  assert.deepEqual(movedItems[0].to, {
    location: "equipment",
    slotIndex: 7,
  });

  equipmentSlots[7].item = { id: 3572, name: "3572", count: 1 };
  await bot.tick();
  assert.equal(movedItems.length, 2);
  assert.equal(movedItems[1].moduleKey, "ringAutoReplace");
  assert.deepEqual(movedItems[1].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 1,
  });
  assert.deepEqual(movedItems[1].to, {
    location: "equipment",
    slotIndex: 8,
  });
});

test("tick throttles empty-slot jewelry checks by the configured repeat margin", async () => {
  const bot = createBot({
    ringAutoReplaceEnabled: true,
    ringAutoReplaceItemName: "stealth ring",
    ringAutoReplaceCooldownMs: 1000,
    ringAutoReplaceRequireNoTargets: false,
    ringAutoReplaceRequireStationary: false,
  });
  const movedItems = [];
  const equipmentSlots = Array.from({ length: 10 }, (_, index) => ({
    index,
    label: [
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
    ][index],
    item: index === 6 ? { id: 2854, name: "Backpack", count: 1 } : null,
  }));
  let now = 1_000;
  bot.getNow = () => now;

  bot.moveInventoryItem = async (action) => {
    movedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, bot.getNow());
    return { ok: true, name: action.label };
  };

  const snapshot = {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    equipment: {
      slots: equipmentSlots,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  };
  installRefresh(bot, snapshot);

  await bot.tick();
  assert.equal(movedItems.length, 0);
  assert.equal(bot.getLastModuleActionAt("ringAutoReplace"), 1_000);

  now = 1_500;
  snapshot.containers[0].slots.push({
    index: 0,
    item: { id: 3049, name: "Stealth Ring", count: 1 },
  });
  await bot.tick();
  assert.equal(movedItems.length, 0);

  now = 2_100;
  await bot.tick();
  assert.equal(movedItems.length, 1);
  assert.equal(movedItems[0].moduleKey, "ringAutoReplace");
  assert.deepEqual(movedItems[0].to, {
    location: "equipment",
    slotIndex: 8,
  });
});

test("tick reloads low quiver ammo before downstream utility casts", async () => {
  const bot = createBot({
    vocation: "paladin",
    ammoEnabled: true,
    ammoReloadEnabled: true,
    ammoReloadAtOrBelow: 25,
    ammoReloadCooldownMs: 1000,
    ammoRequireNoTargets: false,
    ammoRequireStationary: false,
    autoLightEnabled: true,
  });
  const movedItems = [];
  let lightAttempts = 0;

  bot.moveInventoryItem = async (action) => {
    movedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name };
  };
  bot.castWords = async () => {
    lightAttempts += 1;
    return { ok: true };
  };

  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    equipment: {
      slotLabels: ["Head", "Armor", "Quiver"],
      slots: [
        null,
        null,
        { id: 3446, name: "Arrow", count: 10 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3446, name: "Arrow", count: 80 } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: false,
  });

  await bot.tick();

  assert.equal(movedItems.length, 1);
  assert.equal(movedItems[0].moduleKey, "ammo");
  assert.deepEqual(movedItems[0].from, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 0,
  });
  assert.deepEqual(movedItems[0].to, {
    location: "equipment",
    slotIndex: 2,
  });
  assert.equal(lightAttempts, 0);
});

test("tick can satisfy auto eat from a hotbar food slot", async () => {
  const bot = createBot({
    autoEatEnabled: true,
    autoEatCooldownMs: 1000,
    antiIdleEnabled: true,
    antiIdleIntervalMs: 1000,
    preferHotbarConsumables: true,
  });
  const usedHotbarSlots = [];
  const antiIdleEvaluations = [];

  bot.startedAt = Date.now() - 2000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => {
      antiIdleEvaluations.push("pulse");
      return { ok: true };
    },
    send: async () => {},
  };
  bot.useHotbarSlot = async (action) => {
    usedHotbarSlots.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, slotIndex: action.slotIndex };
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    hotbar: {
      slotCount: 1,
      slots: [
        {
          index: 0,
          kind: "item",
          hotkey: "F1",
          item: { id: 3725, name: "Brown Mushroom", count: 42 },
          enabled: true,
        },
      ],
    },
    containers: [],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(usedHotbarSlots.length, 1);
  assert.equal(usedHotbarSlots[0].moduleKey, "autoEat");
  assert.equal(usedHotbarSlots[0].slotIndex, 0);
  assert.equal(antiIdleEvaluations.length, 0);
});

test("tick preserves sparse backpack slot indexes for auto eat sources", async () => {
  const bot = createBot({
    autoEatEnabled: true,
    autoEatCooldownMs: 1000,
    autoEatFoodName: "dragon ham",
    preferHotbarConsumables: false,
  });
  const usedItems = [];

  bot.useItem = async (action) => {
    usedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name, category: action.category };
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { slotIndex: 5, item: { id: 3582, name: "Dragon Ham", count: 12 } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(usedItems.length, 1);
  assert.equal(usedItems[0].moduleKey, "autoEat");
  assert.equal(usedItems[0].name, "dragon ham");
  assert.deepEqual(usedItems[0].source, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 5,
  });
});

test("tick skips blocked foods and falls through the eat-first list", async () => {
  const bot = createBot({
    autoEatEnabled: true,
    autoEatCooldownMs: 1000,
    autoEatFoodName: ["dragon ham", "brown mushroom"],
    autoEatForbiddenFoodNames: ["dragon ham"],
    preferHotbarConsumables: false,
  });
  const usedItems = [];

  bot.useItem = async (action) => {
    usedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, Date.now());
    return { ok: true, name: action.name, category: action.category };
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { slotIndex: 2, item: { id: 3582, name: "Dragon Ham", count: 6, flags: { food: true } } },
          { slotIndex: 4, item: { id: 3725, name: "Brown Mushroom", count: 18, flags: { food: true } } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(usedItems.length, 1);
  assert.equal(usedItems[0].moduleKey, "autoEat");
  assert.equal(usedItems[0].name, "brown mushroom");
  assert.deepEqual(usedItems[0].source, {
    location: "container",
    containerRuntimeId: 10,
    slotIndex: 4,
  });
});

test("auto eat is not starved by mana trainer while cavebot pause is active", async () => {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: false,
    autoConvertEnabled: false,
    runeMakerEnabled: false,
    spellCasterEnabled: false,
    distanceKeeperEnabled: false,
    deathHealEnabled: false,
    autoEatEnabled: true,
    autoEatCooldownMs: 1000,
    manaTrainerEnabled: true,
    manaTrainerRules: [
      {
        enabled: true,
        words: "utevo res ina",
        minHealthPercent: 95,
        minManaPercent: 85,
        maxManaPercent: 100,
        cooldownMs: 1000,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
    cavebotPaused: true,
  });
  const usedItems = [];
  const casts = [];
  let now = 2000;

  bot.getNow = () => now;
  bot.handleReconnect = async () => ({ handled: false });
  bot.handleRookiller = async () => ({ handled: false });
  bot.useItem = async (action) => {
    usedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, bot.getNow());
    return { ok: true, name: action.name, category: action.category };
  };
  bot.castWords = async (action) => {
    casts.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, bot.getNow());
    return { ok: true, words: action.words };
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 321, y: 654, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3725, name: "Brown Mushroom", count: 42, flags: { food: true } } },
        ],
      },
    ],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  await bot.tick();
  now = 2500;
  await bot.tick();

  assert.equal(usedItems.length, 1);
  assert.equal(usedItems[0].moduleKey, "autoEat");
  assert.equal(casts.length, 1);
  assert.equal(casts[0].moduleKey, "manaTrainer");
});

test("training mode runs utility actions without requiring cavebot pause", async () => {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: false,
    autoConvertEnabled: false,
    runeMakerEnabled: false,
    spellCasterEnabled: false,
    distanceKeeperEnabled: false,
    deathHealEnabled: false,
    trainerEnabled: true,
    autoEatEnabled: true,
    autoEatCooldownMs: 1000,
    autoEatRequireNoTargets: true,
    manaTrainerEnabled: true,
    manaTrainerRules: [
      {
        enabled: true,
        words: "utevo res ina",
        minHealthPercent: 95,
        minManaPercent: 85,
        maxManaPercent: 100,
        cooldownMs: 1000,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
    cavebotPaused: false,
  });
  const usedItems = [];

  bot.handleReconnect = async () => ({ handled: false });
  bot.handleRookiller = async () => ({ handled: false });
  bot.clearAggro = async () => {
    throw new Error("training mode should not clear the training target");
  };
  bot.chooseRouteAction = () => {
    throw new Error("training mode should not route walk");
  };
  bot.chooseTarget = () => {
    throw new Error("training mode should not pick combat targets");
  };
  bot.useItem = async (action) => {
    usedItems.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, bot.getNow());
    return { ok: true, name: action.name, category: action.category };
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 321, y: 654, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { index: 0, item: { id: 3725, name: "Brown Mushroom", count: 42, flags: { food: true } } },
        ],
      },
    ],
    visibleCreatures: [
      { id: 77, name: "Training Monk", position: { x: 322, y: 654, z: 7 } },
    ],
    candidates: [],
    currentTarget: { id: 77, name: "Training Monk", position: { x: 322, y: 654, z: 7 } },
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(usedItems.length, 1);
  assert.equal(usedItems[0].moduleKey, "autoEat");
});

test("training mode uses the trainer mana trainer while the training target stays selected", async () => {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: false,
    autoConvertEnabled: false,
    runeMakerEnabled: false,
    spellCasterEnabled: false,
    distanceKeeperEnabled: false,
    deathHealEnabled: false,
    trainerEnabled: true,
    autoEatEnabled: false,
    manaTrainerEnabled: true,
    manaTrainerRules: [
      {
        enabled: true,
        words: "utevo res ina",
        minHealthPercent: 95,
        minManaPercent: 85,
        maxManaPercent: 100,
        cooldownMs: 1000,
        requireNoTargets: true,
        requireStationary: true,
      },
    ],
    trainerManaTrainerEnabled: true,
    trainerManaTrainerRules: [
      {
        enabled: true,
        words: "exura",
        minHealthPercent: 40,
        minManaPercent: 95,
        maxManaPercent: 100,
        cooldownMs: 1000,
        requireNoTargets: false,
        requireStationary: false,
      },
    ],
    cavebotPaused: false,
  });
  const casts = [];

  bot.handleReconnect = async () => ({ handled: false });
  bot.handleRookiller = async () => ({ handled: false });
  bot.clearAggro = async () => {
    throw new Error("training mode should not clear the training target");
  };
  bot.castWords = async (action) => {
    casts.push(action);
    bot.markModuleAction(action.moduleKey, action.ruleIndex, bot.getNow());
    return { ok: true, words: action.words };
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 321, y: 654, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [],
    visibleCreatures: [
      { id: 77, name: "Training Monk", position: { x: 322, y: 654, z: 7 } },
    ],
    candidates: [],
    currentTarget: { id: 77, name: "Training Monk", position: { x: 322, y: 654, z: 7 } },
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(casts.length, 1);
  assert.equal(casts[0].moduleKey, "trainerManaTrainer");
  assert.equal(casts[0].words, "exura");
});

test("tick keeps anti-idle live while cavebot pause is active", async () => {
  const bot = new MinibiaTargetBot({
    autoLightEnabled: false,
    manaTrainerEnabled: false,
    runeMakerEnabled: false,
    autoConvertEnabled: false,
    spellCasterEnabled: false,
    distanceKeeperEnabled: false,
    antiIdleEnabled: true,
    antiIdleIntervalMs: 60_000,
    cavebotPaused: true,
  });
  const keepalives = [];

  bot.getNow = () => 61_000;
  bot.startedAt = 1_000;
  bot.cdp = {
    isOpen: () => true,
    evaluate: async () => {
      keepalives.push("pulse");
      return { ok: true, transport: "game-keepalive", method: "networkManager.sendKeepAlive" };
    },
    send: async () => {},
  };
  installRefresh(bot, {
    ready: true,
    playerPosition: { x: 321, y: 654, z: 7 },
    playerStats: {
      health: 300,
      maxHealth: 300,
      healthPercent: 100,
      mana: 120,
      maxMana: 120,
      manaPercent: 100,
    },
    containers: [],
    visibleCreatures: [],
    candidates: [],
    currentTarget: null,
    isMoving: false,
    pathfinderAutoWalking: false,
    hasLightCondition: true,
  });

  const snapshot = await bot.tick();

  assert.equal(snapshot?.ready, true);
  assert.equal(keepalives.length, 1);
  assert.equal(keepalives[0], "pulse");
});
