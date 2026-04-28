import test from "node:test";
import assert from "node:assert/strict";
import { buildVocationProfile } from "../lib/vocation-pack.mjs";
import {
  buildRefillPlan,
  buildRefillReport,
  buildRefillRequests,
  buildRefillRuntimePlan,
  chooseRefillAction,
  hasRefillNeed,
} from "../lib/modules/refill.mjs";

function createProfile(vocation = "paladin") {
  return buildVocationProfile({
    vocation,
    spells: [
      { id: 2, name: "Light Healing", words: "exura", level: 1, mana: 25 },
      { id: 10, name: "Intense Healing", words: "exura gran", level: 2, mana: 40 },
      { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
    ],
  });
}

test("buildRefillPlan buys potion, food, and ammo deficits from the vocation profile", () => {
  const profile = createProfile("paladin");
  const plan = buildRefillPlan({
    ready: true,
    equipment: {
      slotLabels: ["Helmet", "Armor", "Quiver"],
      slots: [
        null,
        null,
        { id: 7368, name: "Royal Spear", count: 30 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 7618, name: "Health Potion", count: 5 },
          { id: 2666, name: "Meat", count: 1 },
        ],
      },
    ],
  }, profile);

  assert.deepEqual(plan, [
    {
      type: "buyItem",
      itemId: null,
      name: "Supreme Health Potion",
      amount: 25,
      moduleKey: "refill",
      ruleIndex: null,
    },
    {
      type: "buyItem",
      itemId: null,
      name: "Heavy Magic Missile Rune",
      amount: 5,
      moduleKey: "refill",
      ruleIndex: null,
    },
    {
      type: "buyItem",
      itemId: null,
      name: "Ham",
      amount: 5,
      moduleKey: "refill",
      ruleIndex: null,
    },
    {
      type: "buyItem",
      itemId: null,
      name: "Royal Spear",
      amount: 70,
      moduleKey: "refill",
      ruleIndex: null,
    },
    {
      type: "buyItem",
      itemId: null,
      name: "Rope",
      amount: 1,
      moduleKey: "refill",
      ruleIndex: null,
    },
    {
      type: "buyItem",
      itemId: null,
      name: "Shovel",
      amount: 1,
      moduleKey: "refill",
      ruleIndex: null,
    },
  ]);
});

test("buildRefillPlan counts carried reserve ammo before buying more", () => {
  const profile = createProfile("paladin");
  const plan = buildRefillPlan({
    ready: true,
    equipment: {
      slotLabels: ["Helmet", "Armor", "Quiver"],
      slots: [
        null,
        null,
        { id: 3446, name: "Arrow", count: 20 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 3446, name: "Arrow", count: 90 },
          { id: 236, name: "Supreme Health Potion", count: 30 },
          { id: 3180, name: "Heavy Magic Missile Rune", count: 5 },
          { id: 2671, name: "Ham", count: 6 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
  }, profile);

  assert.equal(plan.some((entry) => entry.name === "Arrow"), false);
});

test("buildRefillRequests keeps configured sell passes alongside buy restocks", () => {
  const profile = createProfile("sorcerer");
  const requests = buildRefillRequests({
    ready: true,
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 237, name: "Strong Mana Potion", count: 10 },
          { id: 3155, name: "Sudden Death Rune", count: 4 },
          { id: 2666, name: "Meat", count: 3 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
  }, profile, {
    sellRequests: [
      { operation: "sell-all", name: "Gold Coin" },
    ],
  });

  assert.equal(requests[0].operation, "buy");
  assert.equal(requests[0].name, "Strong Mana Potion");
  assert.equal(requests.at(-1).operation, "sell-all");
  assert.equal(requests.at(-1).name, "Gold Coin");
});

test("hasRefillNeed detects low-supply deficits before the hunt starts", () => {
  const profile = createProfile("paladin");

  assert.equal(hasRefillNeed({
    ready: true,
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 7618, name: "Health Potion", count: 2 },
        ],
      },
    ],
  }, profile), true);
});

test("buildRefillRuntimePlan prioritizes visible sell passes before visible buy passes", () => {
  const profile = createProfile("sorcerer");
  const plan = buildRefillRuntimePlan({
    ready: true,
    trade: {
      open: true,
      buyItems: [
        { itemId: 237, name: "Strong Mana Potion", price: 80 },
      ],
      sellItems: [
        { itemId: 3031, name: "Gold Coin", price: 1, side: "sell" },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 237, name: "Strong Mana Potion", count: 10 },
          { id: 3155, name: "Sudden Death Rune", count: 4 },
          { id: 2666, name: "Meat", count: 3 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
  }, profile, {
    sellRequests: [
      { operation: "sell-all", name: "Gold Coin" },
    ],
  });

  assert.equal(plan[0].type, "sellAllOfItem");
  assert.equal(plan[0].name, "Gold Coin");
  assert.equal(plan[1].type, "buyItem");
  assert.equal(plan[1].name, "Strong Mana Potion");
});

test("buildRefillRequests can prepend capacity-aware autosell requests before restocks", () => {
  const profile = createProfile("knight");
  const requests = buildRefillRequests({
    ready: true,
    trade: {
      open: true,
      sellItems: [
        { itemId: 3286, name: "Mace", price: 30, side: "sell" },
      ],
      buyItems: [
        { itemId: 236, name: "Supreme Health Potion", price: 190 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        capacity: 2,
        slots: [
          { id: 3286, name: "Mace", count: 1 },
          { id: 3031, name: "Gold Coin", count: 50 },
        ],
      },
    ],
  }, profile, {
    autoSell: true,
    autoSellMinFreeSlots: 1,
  });

  assert.equal(requests[0].operation, "sell-all");
  assert.equal(requests[0].name, "Mace");
  assert.equal(requests.some((request) => request.operation === "buy"), true);
});

test("buildRefillReport separates executable shop work from blocked requests", () => {
  const profile = createProfile("paladin");
  const report = buildRefillReport({
    ready: true,
    trade: {
      open: true,
      buyItems: [
        { itemId: 236, name: "Supreme Health Potion", price: 190 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 2666, name: "Meat", count: 10 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
  }, profile);

  assert.equal(report.tradeOpen, true);
  assert.equal(report.executableCount, 1);
  assert.equal(report.blockedCount > 0, true);
  assert.equal(report.estimatedBuyCost, 190 * 30);
});

test("chooseRefillAction returns the first executable live shop action only when trade is open", () => {
  const profile = createProfile("paladin");
  const action = chooseRefillAction({
    ready: true,
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
  }, profile);

  assert.equal(action?.type, "buyItem");
  assert.equal(action?.name, "Supreme Health Potion");
});
