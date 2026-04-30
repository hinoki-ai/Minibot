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
  normalizeRefillSupplyPlan,
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
          { id: 3031, name: "Gold Coin", count: 50 },
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

test("normalizeRefillSupplyPlan preserves service metadata and nested item counts", () => {
  const plan = normalizeRefillSupplyPlan({
    desiredCounts: { potions: 40 },
    minimumHuntCounts: { potion: 8 },
    buyCaps: { "Health Potion": 20 },
    reserveGold: "500",
    protectedItems: "dragon ham, rope",
    sellItems: [{ operation: "sell-all", name: "Mace" }],
    npcName: "Uzgod",
    shopKeyword: "trade",
    city: "Thais",
    destination: "Venore",
    depotBranch: "Refill Start",
    returnWaypoint: "Resume Hunt",
    items: [
      { name: "Brown Mushroom", desiredCount: 30, minimumHuntCount: 5, buyCap: 10 },
    ],
  });

  assert.equal(plan.desiredCounts.potions, 40);
  assert.equal(plan.minimumHuntCounts.potions, 8);
  assert.equal(plan.buyCaps.potions, 20);
  assert.equal(plan.reserveGold, 500);
  assert.deepEqual(plan.protectedItems, ["dragon ham", "rope"]);
  assert.equal(plan.sellItems[0].name, "Mace");
  assert.deepEqual(plan.npcNames, ["Uzgod"]);
  assert.deepEqual(plan.shopKeywords, ["trade"]);
  assert.equal(plan.city, "Thais");
  assert.deepEqual(plan.travelDestinations, ["Venore"]);
  assert.equal(plan.depotBranch, "Refill Start");
  assert.equal(plan.returnWaypoint, "Resume Hunt");
  assert.equal(plan.desiredCounts["Brown Mushroom"], 30);
  assert.equal(plan.minimumHuntCounts["Brown Mushroom"], 5);
  assert.equal(plan.buyCaps["Brown Mushroom"], 10);
});

test("refill supply plan uses hunt minimums for branching and desired counts for shopping", () => {
  const profile = {
    sustain: {
      potionPolicy: {
        preferredHealthPotionNames: ["Health Potion"],
      },
    },
  };
  const options = {
    includeAmmo: false,
    includeTools: false,
    supplyPlan: {
      desiredCounts: { potions: 10 },
      minimumHuntCounts: { potions: 3 },
      buyCaps: { potions: 4 },
    },
  };
  const stockedSnapshot = {
    ready: true,
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 266, name: "Health Potion", count: 5 },
        ],
      },
    ],
  };
  const lowSnapshot = {
    ...stockedSnapshot,
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 266, name: "Health Potion", count: 2 },
        ],
      },
    ],
  };

  const requests = buildRefillRequests(stockedSnapshot, profile, options);

  assert.equal(hasRefillNeed(stockedSnapshot, profile, options), false);
  assert.equal(hasRefillNeed(lowSnapshot, profile, options), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].name, "Health Potion");
  assert.equal(requests[0].amount, 4);
  assert.equal(requests[0].desiredCount, 10);
  assert.equal(requests[0].minimumHuntCount, 3);
});

test("buildRefillRuntimePlan caps buys against the configured gold reserve", () => {
  const profile = {
    sustain: {
      potionPolicy: {
        preferredHealthPotionNames: ["Health Potion"],
      },
    },
  };
  const snapshot = {
    ready: true,
    currency: {
      totalGoldValue: 250,
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
        slots: [],
      },
    ],
  };
  const plan = buildRefillRuntimePlan(snapshot, profile, {
    includeAmmo: false,
    includeTools: false,
    supplyPlan: {
      reserveGold: 100,
      desiredCounts: { potions: 10 },
    },
  });

  assert.equal(plan.length, 1);
  assert.equal(plan[0].name, "Health Potion");
  assert.equal(plan[0].amount, 3);
  assert.equal(plan[0].reserveLimited, true);
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
