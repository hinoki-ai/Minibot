import test from "node:test";
import assert from "node:assert/strict";
import {
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
