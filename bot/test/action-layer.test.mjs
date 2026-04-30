import test from "node:test";
import assert from "node:assert/strict";
import { MinibiaTargetBot } from "../lib/bot-core.mjs";
import {
  evaluateActionBlockCondition,
  executeAction,
  executeActionBlock,
  validateActionBlock,
} from "../lib/action-router.mjs";
import { probeActionCapabilities } from "../lib/capability-probe.mjs";

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

function createSlotOwner(items = [], { runtimeId = null } = {}) {
  return {
    __containerId: runtimeId,
    slots: Array.from({ length: items.length }, () => null),
    getSlotItem(index) {
      return items[index] || null;
    },
  };
}

function createBotWithEvaluate(evaluate) {
  const bot = new MinibiaTargetBot({});
  bot.page = { id: "page-1", title: "Minibia" };
  bot.cdp = {
    async evaluate(expression) {
      return evaluate(expression);
    },
  };
  return bot;
}

test("moveInventoryItem moves a resolved container slot into equipment", async () => {
  let moveInvocation = null;
  const equipment = createSlotOwner([null, null]);
  const container = createSlotOwner([
    { id: 3031, name: "Gold Coin", count: 12 },
    null,
  ], { runtimeId: 101 });

  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      player: {
        equipment,
        __openedContainers: [container],
        stopAutoWalk() {},
      },
      world: {
        pathfinder: {},
      },
      mouse: {
        sendItemMove(from, to, count) {
          moveInvocation = { from, to, count };
        },
      },
    },
  }));

  const result = await bot.moveInventoryItem({
    from: { location: "container", containerRuntimeId: 101, slotIndex: 0 },
    to: { location: "equipment", slotIndex: 1 },
    count: 7,
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "sendItemMove");
  assert.equal(result?.count, 7);
  assert.equal(result?.fromLocation, "container");
  assert.equal(result?.toLocation, "equipment");
  assert.equal(moveInvocation?.from.index, 0);
  assert.equal(moveInvocation?.to.index, 1);
  assert.equal(moveInvocation?.count, 7);
});

test("useItemOnTile routes a matching item through tile-use helpers", async () => {
  let useInvocation = null;
  const container = createSlotOwner([
    { id: 3003, name: "Rope", count: 1 },
  ], { runtimeId: 55 });
  const targetThing = { id: "hole" };

  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      player: {
        equipment: createSlotOwner([]),
        __openedContainers: [container],
        stopAutoWalk() {},
      },
      world: {
        pathfinder: {},
        getTile(position) {
          return {
            position,
            getTopUseThing() {
              return targetThing;
            },
          };
        },
      },
      mouse: {
        useWith(found, thing) {
          useInvocation = { found, thing };
        },
      },
    },
  }));

  const result = await bot.useItemOnTile({
    name: "rope",
    position: { x: 101, y: 200, z: 7 },
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "useWith");
  assert.equal(result?.target, "tile");
  assert.deepEqual(result?.position, { x: 101, y: 200, z: 7 });
  assert.equal(useInvocation?.found.index, 0);
  assert.equal(useInvocation?.thing, targetThing);
});

test("useItem falls back to generic game.use when mouse helpers are unavailable", async () => {
  let usedRef = null;
  const container = createSlotOwner([
    { id: 3725, name: "Brown Mushroom", count: 42 },
  ], { runtimeId: 77 });

  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      player: {
        equipment: createSlotOwner([]),
        __openedContainers: [container],
        stopAutoWalk() {},
      },
      world: {
        pathfinder: {},
      },
      use(entry) {
        usedRef = entry;
      },
    },
  }));

  const result = await bot.useItem({
    name: "brown mushroom",
    category: "food",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "use");
  assert.equal(result?.category, "food");
  assert.equal(usedRef?.name, "Brown Mushroom");
});

test("openContainer can open a ground corpse by tile position", async () => {
  let usedThing = null;
  const topThing = { id: 5002, name: "Dead Orc" };

  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      use(thing) {
        usedThing = thing;
      },
      world: {
        getTile(position) {
          return {
            position,
            getTopUseThing() {
              return topThing;
            },
          };
        },
      },
    },
  }));

  const result = await bot.openContainer({
    position: { x: 101, y: 200, z: 7 },
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.mode, "useThing");
  assert.deepEqual(result?.position, { x: 101, y: 200, z: 7 });
  assert.equal(usedThing, topThing);
});

test("performStorageHygiene clears disposable browser caches without touching durable origin state", async () => {
  const invocations = [];
  const bot = new MinibiaTargetBot({});
  bot.page = { id: "page-1", title: "Minibia", url: "https://minibia.com/play?pwa=1" };
  bot.cdp = {
    async send(method, params) {
      invocations.push({ method, params });
      return {};
    },
  };

  const result = await bot.performStorageHygiene();

  assert.equal(result?.ok, true);
  assert.equal(result?.origin, "https://minibia.com");
  assert.equal(result?.clearedBrowserCache, true);
  assert.equal(result?.clearedOriginStorage, true);
  assert.deepEqual(result?.storageTypes, ["cache_storage", "shader_cache"]);
  assert.deepEqual(invocations, [
    { method: "Network.clearBrowserCache", params: {} },
    {
      method: "Storage.clearDataForOrigin",
      params: {
        origin: "https://minibia.com",
        storageTypes: "cache_storage,shader_cache",
      },
    },
  ]);
});

test("chooseNpcOption selects a visible dialogue option by text", async () => {
  let chosenOption = null;
  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      interface: {
        dialogueManager: {
          options: [
            { text: "Trade" },
            { text: "Bless" },
          ],
          chooseOption(option) {
            chosenOption = option.text;
          },
        },
      },
    },
  }));

  const result = await bot.chooseNpcOption({ text: "trade" });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "chooseOption");
  assert.equal(result?.optionText, "Trade");
  assert.equal(chosenOption, "Trade");
});

test("chooseNpcTradeOption selects a buy entry by name", async () => {
  let chosenTrade = null;
  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      interface: {
        tradeManager: {
          buyItems: [
            { id: 237, name: "Strong Mana Potion" },
            { id: 3003, name: "Rope" },
          ],
          selectBuyItem(entry) {
            chosenTrade = entry.name;
          },
        },
      },
    },
  }));

  const result = await bot.chooseNpcTradeOption({
    side: "buy",
    name: "mana potion",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "selectBuyItem");
  assert.equal(result?.name, "Strong Mana Potion");
  assert.equal(result?.side, "buy");
  assert.equal(chosenTrade, "Strong Mana Potion");
});

test("buyItem selects a trade row, sets quantity, and confirms the purchase", async () => {
  let selectedName = null;
  let selectedQuantity = null;
  let bought = null;
  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      interface: {
        tradeManager: {
          buyItems: [
            { id: 237, name: "Strong Mana Potion", price: 80 },
          ],
          selectBuyItem(entry) {
            selectedName = entry.name;
          },
          setBuyAmount(amount) {
            selectedQuantity = amount;
          },
          buySelectedItem(amount) {
            bought = { amount, selectedName };
          },
        },
      },
    },
  }));

  const result = await bot.buyItem({
    name: "mana potion",
    amount: 25,
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "buySelectedItem");
  assert.equal(result?.selectionTransport, "selectBuyItem");
  assert.equal(result?.quantityTransport, "setBuyAmount");
  assert.equal(result?.amount, 25);
  assert.equal(selectedName, "Strong Mana Potion");
  assert.equal(selectedQuantity, 25);
  assert.deepEqual(bought, {
    amount: 25,
    selectedName: "Strong Mana Potion",
  });
});

test("sellAllOfItem executes a sell-all flow after selecting the matching trade row", async () => {
  let soldName = null;
  const bot = createBotWithEvaluate((expression) => evaluatePageExpression(expression, {
    gameClient: {
      interface: {
        tradeManager: {
          sellItems: [
            { id: 3031, name: "Gold Coin", price: 1 },
          ],
          selectSellItem(entry) {
            soldName = entry.name;
          },
          sellAll(entry) {
            soldName = `${soldName}:${entry.name}`;
          },
        },
      },
    },
  }));

  const result = await bot.sellAllOfItem({
    name: "gold coin",
  });

  assert.equal(result?.ok, true);
  assert.equal(result?.transport, "sellAll");
  assert.equal(result?.side, "sell");
  assert.equal(result?.sellAll, true);
  assert.equal(soldName, "Gold Coin:Gold Coin");
});

test("probeActionCapabilities reflects the shared action surface", () => {
  const bot = new MinibiaTargetBot({});
  const capabilities = probeActionCapabilities(bot);

  assert.equal(capabilities.actions.useHotbarSlot, true);
  assert.equal(capabilities.actions.moveInventoryItem, true);
  assert.equal(capabilities.actions.useItemOnTile, true);
  assert.equal(capabilities.actions.openNpcDialogue, true);
  assert.equal(capabilities.actions.closeNpcDialogue, true);
  assert.equal(capabilities.actions.sayNpcKeyword, true);
  assert.equal(capabilities.actions.chooseNpcTradeOption, true);
  assert.equal(capabilities.actions.buyItem, true);
  assert.equal(capabilities.actions.sellAllOfItem, true);
  assert.equal(capabilities.actions.travelToCity, true);
  assert.equal(capabilities.actions.setResidence, true);
  assert.equal(capabilities.actions.buyBlessing, true);
  assert.equal(capabilities.actions.buyAllMissingBlessings, true);
  assert.equal(capabilities.actions.buyPromotion, true);
  assert.equal(capabilities.actions.dailyTask, true);
  assert.equal(capabilities.actions.runProgressionWorkflow, true);
});

test("executeAction routes aliases and normalizes driver metadata", async () => {
  const bot = {
    async sayNpcKeyword(action) {
      return {
        ok: true,
        words: action.keyword,
        transport: "packet",
      };
    },
  };

  const result = await executeAction(bot, {
    type: "sayNpcKeyword",
    keyword: "trade",
  });

  assert.deepEqual(result, {
    ok: true,
    driver: "hook",
    reason: "",
    details: {
      actionType: "sayNpcKeyword",
      ok: true,
      words: "trade",
      transport: "packet",
    },
  });
});

test("executeAction routes progression-facing NPC actions", async () => {
  const bot = {
    async travelToCity(action) {
      return {
        ok: true,
        city: action.city,
        transport: "packet",
        phase: "request-city",
      };
    },
  };

  const result = await executeAction(bot, {
    type: "travelToCity",
    city: "Thais",
  });

  assert.deepEqual(result, {
    ok: true,
    driver: "hook",
    reason: "",
    details: {
      actionType: "travelToCity",
      ok: true,
      city: "Thais",
      transport: "packet",
      phase: "request-city",
    },
  });
});

test("executeAction routes daily task and progression workflow entry points", async () => {
  const calls = [];
  const bot = {
    async dailyTask(action) {
      calls.push(["dailyTask", action.taskTarget]);
      return {
        ok: true,
        completed: true,
        target: action.taskTarget,
      };
    },
    async runProgressionWorkflow(action) {
      calls.push(["runProgressionWorkflow", action.steps?.length || 0]);
      return {
        ok: true,
        completed: true,
        workflowLength: action.steps?.length || 0,
      };
    },
  };

  const taskResult = await executeAction(bot, {
    type: "dailyTask",
    taskTarget: "rotworm",
  });
  const workflowResult = await executeAction(bot, {
    type: "progressionWorkflow",
    steps: [{ action: "buy-promotion" }],
  });

  assert.deepEqual(calls, [
    ["dailyTask", "rotworm"],
    ["runProgressionWorkflow", 1],
  ]);
  assert.equal(taskResult.ok, true);
  assert.equal(taskResult.details.actionType, "dailyTask");
  assert.equal(workflowResult.ok, true);
  assert.equal(workflowResult.details.actionType, "progressionWorkflow");
  assert.equal(workflowResult.details.workflowLength, 1);
});

test("executeActionBlock validates and runs deposit sell refill primitives", async () => {
  const calls = [];
  const bot = {
    lastSnapshot: {
      ready: true,
      inventory: {
        items: [
          { id: 3031, name: "Gold Coin", count: 120 },
          { id: 237, name: "Strong Mana Potion", count: 5 },
        ],
      },
    },
    async sayNpcKeyword(action) {
      calls.push(["npc", action.keyword]);
      return { ok: true, keyword: action.keyword };
    },
    async sellAllOfItem(action) {
      calls.push(["sell-all", action.name]);
      return { ok: true, name: action.name };
    },
    async buyItem(action) {
      calls.push(["buy", action.name, action.amount]);
      return { ok: true, name: action.name, amount: action.amount };
    },
  };
  const block = {
    steps: [
      { type: "deposit", amount: "all" },
      { type: "shopSell", name: "Plate Armor", sellAll: true },
      {
        type: "branchIf",
        condition: {
          field: "inventory.strong mana potion",
          op: "lt",
          value: 20,
        },
        then: [
          { type: "shopBuy", name: "Strong Mana Potion", amount: 15 },
        ],
      },
    ],
  };

  assert.equal(validateActionBlock(block).ok, true);
  const result = await executeActionBlock(bot, block);

  assert.equal(result.ok, true);
  assert.equal(result.completed, true);
  assert.deepEqual(calls, [
    ["npc", "deposit all"],
    ["sell-all", "Plate Armor"],
    ["buy", "Strong Mana Potion", 15],
  ]);
});

test("executeActionBlock pauses failed blocks with step index and reason", async () => {
  const paused = [];
  const bot = {
    async buyItem() {
      return { ok: false, reason: "trade row missing" };
    },
    pauseCavebotForRouteFailure(reason, details) {
      paused.push({ reason, details });
      return { ok: false, paused: true, reason, ...details };
    },
  };

  const result = await executeActionBlock(bot, {
    steps: [
      { type: "shopBuy", name: "Great Fireball Rune", amount: 10 },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.paused, true);
  assert.equal(result.stepIndex, 0);
  assert.equal(result.reason, "trade row missing");
  assert.deepEqual(paused, [
    {
      reason: "trade row missing",
      details: {
        stepIndex: 0,
        actionType: "shopBuy",
        actionBlock: true,
      },
    },
  ]);
});

test("evaluateActionBlockCondition reads stable runtime fields", () => {
  const bot = {
    routeIndex: 7,
    lastDecisionTrace: {
      current: {
        owner: "spellCaster",
      },
    },
    getPositionKey(position) {
      return `${position.x},${position.y},${position.z}`;
    },
  };
  const snapshot = {
    playerStats: {
      healthPercent: 72,
      manaPercent: 45,
    },
    playerPosition: { x: 100, y: 200, z: 7 },
    visiblePlayers: [{ name: "Visitor" }],
    visibleNpcs: [{ name: "Sandra" }],
    recentMessages: [{ text: "You deposited 100 gold." }],
  };

  assert.equal(evaluateActionBlockCondition({ field: "hpPercent", op: "gte", value: 70 }, { bot, snapshot }), true);
  assert.equal(evaluateActionBlockCondition({ field: "nearby.players", op: "eq", value: 1 }, { bot, snapshot }), true);
  assert.equal(evaluateActionBlockCondition({ field: "route.index", op: "eq", value: 7 }, { bot, snapshot }), true);
  assert.equal(evaluateActionBlockCondition({ field: "recentMessages", op: "contains", value: "deposited" }, { bot, snapshot }), true);
  assert.equal(evaluateActionBlockCondition({ field: "activeOwner", op: "eq", value: "spellCaster" }, { bot, snapshot }), true);
});
