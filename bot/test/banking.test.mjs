import test from "node:test";
import assert from "node:assert/strict";
import { MinibiaTargetBot } from "../lib/bot-core.mjs";
import { resolveBankingIntent } from "../lib/modules/banker.mjs";
import { normalizeDialogueState } from "../lib/modules/npc-dialogue.mjs";

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
    getComputedStyle() {
      return {
        display: "block",
        visibility: "visible",
        opacity: 1,
      };
    },
  }, {
    document,
    ConditionManager: class ConditionManager {},
    ...globalThisOverrides,
  });
}

function createBankingSnapshot({
  overflowSignature = "equipment:0:3031x50|container:7:3:3035x12",
  dialogueMessages = [],
} = {}) {
  return {
    ready: true,
    playerName: "Knight Alpha",
    playerPosition: { x: 100, y: 200, z: 7 },
    visibleCreatures: [],
    candidates: [],
    visibleNpcs: [
      {
        id: 31,
        name: "Sandra",
        position: { x: 101, y: 200, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    isMoving: false,
    pathfinderAutoWalking: false,
    currency: {
      overflowSignature,
    },
    dialogue: normalizeDialogueState({
      activeChannelName: "Default",
      defaultChannelName: "Default",
      defaultChannelActive: true,
      recentMessages: dialogueMessages,
    }),
  };
}

test("resolveBankingIntent uses carried coin overflow totals for deposit and withdraw planning", () => {
  const snapshot = createBankingSnapshot();

  const depositIntent = resolveBankingIntent({
    operation: "deposit-excess",
    reserveGold: 200,
  }, snapshot);
  const withdrawIntent = resolveBankingIntent({
    operation: "withdraw-up-to",
    amount: 2000,
  }, snapshot);

  assert.equal(depositIntent?.command, "deposit 1050");
  assert.equal(withdrawIntent?.command, "withdraw 750");
});

test("refresh exposes visible NPCs and normalizes default-channel dialogue state", async () => {
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
      { id: "m1", speaker: "Sandra", text: "Hello there." },
      { id: "m2", speaker: "Sandra", text: "Your account balance is 12,050 gold." },
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
          },
          interface: {
            hotbarManager: {
              __findFullCoinStack() {
                return null;
              },
            },
            dialogueManager: {
              open: true,
              npcName: "Sandra",
              prompt: "Do you want to travel to Thais?",
              options: [
                { text: "Yes" },
                { text: "No" },
              ],
            },
            modalManager: {
              __openedModal: null,
            },
            tradeManager: {
              open: true,
              side: "buy",
              buyItems: [
                { id: 237, name: "Strong Mana Potion" },
              ],
              selectedItem: {
                id: 237,
                name: "Strong Mana Potion",
              },
              quantity: 10,
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

  assert.deepEqual(snapshot.visibleNpcNames, ["Sandra"]);
  assert.equal(snapshot.visibleNpcs.length, 1);
  assert.equal(snapshot.visibleNpcs[0].name, "Sandra");
  assert.equal(snapshot.dialogue.defaultChannelActive, true);
  assert.equal(snapshot.dialogue.open, true);
  assert.equal(snapshot.dialogue.npcName, "Sandra");
  assert.equal(snapshot.dialogue.prompt, "Do you want to travel to Thais?");
  assert.deepEqual(snapshot.dialogue.options.map((option) => option.text), ["Yes", "No"]);
  assert.equal(snapshot.dialogue.recentMessages.length, 2);
  assert.equal(snapshot.dialogue.bankBalance, 12050);
  assert.equal(snapshot.dialogue.tradeState.open, true);
  assert.equal(snapshot.dialogue.tradeState.selectedItemName, "Strong Mana Potion");
  assert.equal(snapshot.dialogue.travelState.pendingConfirmation, true);
});

test("bank waypoints greet the banker, send the bank command, then advance on success", async () => {
  const bot = new MinibiaTargetBot({
    autowalkEnabled: true,
    bankingEnabled: true,
    bankingRules: [
      {
        enabled: true,
        bankerNames: ["Sandra"],
        operation: "deposit-all",
        cooldownMs: 1200,
      },
    ],
    waypoints: [
      { x: 100, y: 200, z: 7, type: "bank" },
      { x: 101, y: 200, z: 7, type: "walk" },
    ],
  });
  const spoken = [];

  bot.castWords = async (action) => {
    spoken.push(action.words);
    return { ok: true, words: action.words };
  };

  const bankRouteAction = bot.chooseRouteAction(createBankingSnapshot());
  assert.equal(bankRouteAction?.kind, "bank");

  bot.lastSnapshot = createBankingSnapshot();
  await bot.executeRouteAction(bankRouteAction);
  assert.deepEqual(spoken, ["hi"]);
  assert.equal(bot.routeIndex, 0);

  bot.lastSnapshot = createBankingSnapshot({
    dialogueMessages: [
      { id: "m1", speaker: "Sandra", text: "Hello there." },
    ],
  });
  await bot.executeRouteAction(bankRouteAction);
  assert.deepEqual(spoken, ["hi", "deposit all"]);
  assert.equal(bot.routeIndex, 0);

  bot.lastSnapshot = createBankingSnapshot({
    dialogueMessages: [
      { id: "m1", speaker: "Sandra", text: "Hello there." },
      { id: "m2", speaker: "Sandra", text: "Alright, your account balance is 12,050 gold." },
    ],
  });
  const result = await bot.executeRouteAction(bankRouteAction);

  assert.equal(result?.ok, true);
  assert.equal(result?.completed, true);
  assert.equal(result?.bankBalance, 12050);
  assert.equal(bot.routeIndex, 1);
  assert.equal(bot.getLastModuleActionAt("banking", 0) > 0, true);
});
