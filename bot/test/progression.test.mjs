import test from "node:test";
import assert from "node:assert/strict";
import { MinibiaTargetBot } from "../lib/bot-core.mjs";
import {
  buildBuyAllMissingBlessingsStep,
  buildBuyBlessingStep,
  buildBuyPromotionStep,
  buildDailyTaskStep,
  buildCloseNpcDialogueStep,
  buildOpenNpcDialogueStep,
  buildProgressionWorkflowStep,
  buildSetResidenceStep,
  buildTravelToCityStep,
} from "../lib/modules/progression.mjs";

function createSnapshot(overrides = {}) {
  return {
    ready: true,
    playerName: "Knight Alpha",
    visibleNpcs: [
      {
        id: 31,
        name: "Sandra",
        position: { x: 101, y: 200, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    progression: {
      blessings: ["Twist of Fate"],
      residence: "Carlin",
      promotion: null,
    },
    dialogue: {
      open: false,
      npcName: "",
      prompt: "",
      options: [],
      recentMessages: [],
    },
    ...overrides,
  };
}

test("buildOpenNpcDialogueStep sends a greeting when the dialogue is closed", () => {
  const step = buildOpenNpcDialogueStep(createSnapshot(), {
    npcName: "Sandra",
  }, {
    moduleKey: "travel",
  });

  assert.equal(step.failed, false);
  assert.equal(step.phase, "greet");
  assert.equal(step.action?.type, "sayNpcKeyword");
  assert.equal(step.action?.keyword, "hi");
  assert.equal(step.action?.moduleKey, "travel");
});

test("buildCloseNpcDialogueStep prefers a visible farewell option", () => {
  const step = buildCloseNpcDialogueStep(createSnapshot({
    dialogue: {
      open: true,
      npcName: "Sandra",
      prompt: "Anything else?",
      options: [
        { index: 0, text: "Trade" },
        { index: 1, text: "Bye" },
      ],
      recentMessages: [],
    },
  }));

  assert.equal(step.failed, false);
  assert.equal(step.phase, "farewell-option");
  assert.equal(step.action?.type, "chooseNpcOption");
  assert.equal(step.action?.text, "Bye");
});

test("buildTravelToCityStep confirms travel when the dialogue asks for confirmation", () => {
  const step = buildTravelToCityStep(createSnapshot({
    dialogue: {
      open: true,
      npcName: "Sandra",
      prompt: "Do you want to travel to Thais?",
      options: [
        { index: 0, text: "Yes" },
        { index: 1, text: "No" },
      ],
      recentMessages: [
        { id: "m1", speaker: "Sandra", text: "Do you want to travel to Thais?" },
      ],
    },
  }), {
    npcName: "Sandra",
    city: "Thais",
  });

  assert.equal(step.failed, false);
  assert.equal(step.phase, "confirm");
  assert.equal(step.action?.type, "chooseNpcOption");
  assert.equal(step.action?.text, "Yes");
});

test("buildSetResidenceStep completes when the requested residence is already active", () => {
  const step = buildSetResidenceStep(createSnapshot({
    progression: {
      blessings: ["Twist of Fate"],
      residence: "Thais",
      promotion: null,
    },
  }), {
    city: "Thais",
  });

  assert.equal(step.completed, true);
  assert.equal(step.reason, "residence already set");
  assert.equal(step.action, null);
});

test("buildBuyBlessingStep skips blessings the character already owns", () => {
  const step = buildBuyBlessingStep(createSnapshot(), {
    blessing: "Twist of Fate",
  });

  assert.equal(step.completed, true);
  assert.equal(step.reason, "blessing already owned");
  assert.equal(step.action, null);
});

test("buildBuyAllMissingBlessingsStep targets the first visible missing blessing", () => {
  const step = buildBuyAllMissingBlessingsStep(createSnapshot({
    dialogue: {
      open: true,
      npcName: "Sandra",
      prompt: "Which blessing do you want?",
      options: [
        { index: 0, text: "Twist of Fate" },
        { index: 1, text: "Spiritual Shielding" },
      ],
      recentMessages: [],
    },
  }), {});

  assert.equal(step.failed, false);
  assert.equal(step.phase, "target-option");
  assert.equal(step.target, "Spiritual Shielding");
  assert.equal(step.action?.type, "chooseNpcOption");
  assert.equal(step.action?.text, "Spiritual Shielding");
});

test("buildBuyPromotionStep completes when promotion already exists", () => {
  const step = buildBuyPromotionStep(createSnapshot({
    progression: {
      blessings: ["Twist of Fate"],
      residence: "Carlin",
      promotion: "Elite Knight",
    },
  }), {});

  assert.equal(step.completed, true);
  assert.equal(step.reason, "promotion already owned");
  assert.equal(step.action, null);
});

test("buildDailyTaskStep claims ready rewards through the task NPC dialogue", () => {
  const step = buildDailyTaskStep(createSnapshot({
    visibleNpcs: [
      { id: 44, name: "Grizzly Adams", position: { x: 100, y: 200, z: 7 } },
    ],
    task: {
      open: true,
      activeTaskType: "daily",
      taskNpc: "Grizzly Adams",
      taskTarget: "Rotworm",
      progressCurrent: 100,
      progressRequired: 100,
      rewardReady: true,
    },
    dialogue: {
      open: true,
      npcName: "Grizzly Adams",
      prompt: "You completed your task.",
      options: [
        { index: 0, text: "Claim reward" },
      ],
      recentMessages: [],
    },
  }));

  assert.equal(step.failed, false);
  assert.equal(step.phase, "reward-option");
  assert.equal(step.action?.type, "chooseNpcOption");
  assert.equal(step.action?.text, "Claim reward");
});

test("buildDailyTaskStep accepts a target task from a visible task menu", () => {
  const step = buildDailyTaskStep(createSnapshot({
    visibleNpcs: [
      { id: 44, name: "Grizzly Adams", position: { x: 100, y: 200, z: 7 } },
    ],
    task: {
      open: false,
      activeTaskType: null,
      taskNpc: "Grizzly Adams",
      taskTarget: "",
      progressCurrent: null,
      progressRequired: null,
      rewardReady: false,
    },
    dialogue: {
      open: true,
      npcName: "Grizzly Adams",
      prompt: "Choose a daily task.",
      options: [
        { index: 0, text: "Rotworm" },
        { index: 1, text: "Cyclops" },
      ],
      recentMessages: [],
    },
  }), {
    taskTarget: "Rotworm",
  });

  assert.equal(step.failed, false);
  assert.equal(step.phase, "target-option");
  assert.equal(step.action?.type, "chooseNpcOption");
  assert.equal(step.action?.text, "Rotworm");
});

test("buildProgressionWorkflowStep skips completed steps and returns the first pending action", () => {
  const step = buildProgressionWorkflowStep(createSnapshot({
    visibleNpcs: [
      { id: 51, name: "King", position: { x: 100, y: 200, z: 7 } },
    ],
    progression: {
      blessings: ["Twist of Fate"],
      residence: "Thais",
      promotion: null,
    },
    dialogue: {
      open: true,
      npcName: "King",
      prompt: "Do you want to be promoted?",
      options: [
        { index: 0, text: "Yes" },
      ],
      recentMessages: [],
    },
  }), [
    { type: "set-residence", city: "Thais" },
    { type: "buy-promotion", npcName: "King" },
  ]);

  assert.equal(step.workflowIndex, 1);
  assert.equal(step.workflowAction, "buy-promotion");
  assert.equal(step.phase, "confirm");
  assert.equal(step.action?.type, "chooseNpcOption");
});

test("openNpcDialogue delegates to sayNpcKeyword when the dialogue is closed", async () => {
  const bot = new MinibiaTargetBot({});
  bot.attach = async () => ({ id: "page-1" });
  bot.inspectDialogueState = async () => ({
    open: false,
    npcName: "",
    prompt: "",
    options: [],
    recentMessages: [],
  });
  bot.lastSnapshot = createSnapshot();
  bot.sayNpcKeyword = async (action) => ({
    ok: true,
    keyword: action.keyword,
    transport: "packet",
  });

  const result = await bot.openNpcDialogue({ npcName: "Sandra" });

  assert.equal(result.ok, true);
  assert.equal(result.keyword, "hi");
  assert.equal(result.phase, "greet");
});

test("travelToCity falls back to opening the NPC dialogue first", async () => {
  const bot = new MinibiaTargetBot({});
  bot.attach = async () => ({ id: "page-1" });
  bot.inspectDialogueState = async () => ({
    open: false,
    npcName: "",
    prompt: "",
    options: [],
    recentMessages: [],
  });
  bot.lastSnapshot = createSnapshot();
  bot.sayNpcKeyword = async (action) => ({
    ok: true,
    keyword: action.keyword,
    transport: "packet",
  });

  const result = await bot.travelToCity({
    npcName: "Sandra",
    city: "Thais",
  });

  assert.equal(result.ok, true);
  assert.equal(result.keyword, "hi");
  assert.equal(result.phase, "greet");
  assert.equal(result.objective, "travel");
});
