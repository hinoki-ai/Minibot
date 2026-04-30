import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCapacityAwareLootDecision,
  buildCapacityAwareAutosellRequests,
  resolveLootSellValue,
  summarizeLootEconomics,
} from "../lib/modules/loot-economics.mjs";

test("resolveLootSellValue prefers visible shop sell prices before vendored NPC prices", () => {
  const visible = resolveLootSellValue({ name: "Mace" }, {
    tradeState: {
      sellItems: [
        { name: "Mace", price: 42, side: "sell" },
      ],
    },
  });
  assert.equal(visible?.price, 42);
  assert.equal(visible?.source, "visible-trade");

  const vendored = resolveLootSellValue({ name: "Mace" });
  assert.equal(vendored?.price, 30);
  assert.equal(vendored?.source, "npc-catalog");
});

test("summarizeLootEconomics adds known item values to observed coin loot", () => {
  const summary = summarizeLootEconomics({
    goldValue: 203,
    items: [
      { name: "Mace", count: 2 },
      { name: "Unknown Trophy", count: 1 },
    ],
  });

  assert.equal(summary.goldValue, 203);
  assert.equal(summary.itemGoldValue, 60);
  assert.equal(summary.totalGoldValue, 263);
  assert.equal(summary.valuedItems[0].name, "Mace");
  assert.equal(summary.unknownItems[0].name, "Unknown Trophy");
});

test("buildCapacityAwareAutosellRequests sells valued junk only when containers are tight", () => {
  const snapshot = {
    ready: true,
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        capacity: 4,
        slots: [
          { id: 3286, name: "Mace", count: 1 },
          { id: 3607, name: "Ham", count: 3 },
          { id: 3031, name: "Gold Coin", count: 40 },
          null,
        ],
      },
    ],
  };

  assert.deepEqual(
    buildCapacityAwareAutosellRequests(snapshot, { minFreeSlots: 0 }),
    [],
  );

  const requests = buildCapacityAwareAutosellRequests(snapshot, { minFreeSlots: 1 });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].operation, "sell-all");
  assert.equal(requests[0].name, "Mace");
  assert.equal(requests[0].estimatedValue, 30);
});

test("buildCapacityAwareLootDecision explains sell, continue, and protected pause branches", () => {
  const roomySnapshot = {
    containers: [
      {
        name: "Backpack",
        capacity: 3,
        slots: [
          { name: "Mace", count: 1 },
          null,
          null,
        ],
      },
    ],
  };
  assert.equal(buildCapacityAwareLootDecision(roomySnapshot, { minFreeSlots: 1 }).action, "continue");

  const tightSnapshot = {
    containers: [
      {
        name: "Backpack",
        capacity: 2,
        slots: [
          { name: "Mace", count: 1 },
          { name: "Unknown Trophy", count: 1 },
        ],
      },
    ],
  };
  const sellDecision = buildCapacityAwareLootDecision(tightSnapshot, { minFreeSlots: 1 });
  assert.equal(sellDecision.action, "sell-branch");
  assert.equal(sellDecision.autosellRequests[0].name, "Mace");
  assert.equal(sellDecision.unknownValueItems[0].name, "Unknown Trophy");

  const protectedDecision = buildCapacityAwareLootDecision({
    containers: [
      {
        name: "Backpack",
        capacity: 1,
        slots: [
          { name: "Demon Shield", count: 1 },
        ],
      },
    ],
  }, {
    minFreeSlots: 1,
    protectedNames: ["Demon Shield"],
    sellBranchAvailable: false,
  });
  assert.equal(protectedDecision.action, "pause");
  assert.equal(protectedDecision.protectedItems[0].name, "Demon Shield");

  const dropDecision = buildCapacityAwareLootDecision(tightSnapshot, {
    minFreeSlots: 1,
    sellBranchAvailable: false,
    allowDropLowValue: true,
  });
  assert.equal(dropDecision.action, "drop-low-value");
  assert.equal(dropDecision.lowValueDropItems[0].name, "Mace");
});
