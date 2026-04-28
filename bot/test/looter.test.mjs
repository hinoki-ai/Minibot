import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCorpseOpenAction,
  buildLootPlan,
  findLootableCorpses,
  findLootSourceContainers,
} from "../lib/modules/looter.mjs";
import { planContainerMove } from "../lib/modules/container-routing.mjs";

function createLootSnapshot() {
  return {
    containers: [
      {
        runtimeId: 10,
        name: "Blue Backpack",
        slots: [
          { id: 3031, name: "Gold Coin", count: 40 },
          null,
          null,
        ],
      },
      {
        runtimeId: 90,
        name: "Dead Rat",
        slots: [
          { id: 3031, name: "Gold Coin", count: 12 },
          { id: 3607, name: "Ham", count: 2 },
          { id: 3003, name: "Rope", count: 1 },
        ],
      },
      {
        runtimeId: 91,
        name: "Dead Orc",
        slots: [
          { id: 7368, name: "Royal Spear", count: 12 },
        ],
      },
    ],
  };
}

test("planContainerMove prefers same-item merges before empty backpack slots", () => {
  const move = planContainerMove(createLootSnapshot(), {
    ownerType: "container",
    ownerId: 90,
    slotIndex: 0,
    item: { id: 3031, name: "Gold Coin", count: 12 },
  }, {
    preferredContainers: ["Backpack"],
  });

  assert.equal(move?.type, "moveInventoryItem");
  assert.equal(move?.to?.containerRuntimeId, 10);
  assert.equal(move?.to?.slotIndex, 0);
});

test("buildLootPlan filters the corpse contents and routes kept items into preferred containers", () => {
  const plan = buildLootPlan(createLootSnapshot(), {
    sourceContainerRuntimeId: 90,
    whitelist: ["gold", "ham"],
    blacklist: ["rope"],
    preferredContainers: ["Backpack"],
  });

  assert.equal(plan.length, 2);
  assert.equal(plan[0].name, "Gold Coin");
  assert.equal(plan[0].to.slotIndex, 0);
  assert.equal(plan[1].name, "Ham");
  assert.equal(plan[1].to.slotIndex, 1);
});

test("buildLootPlan accepts category-style whitelist entries from vocation loot priorities", () => {
  const plan = buildLootPlan(createLootSnapshot(), {
    sourceContainerRuntimeId: 91,
    whitelist: ["ammo"],
    preferredContainers: ["Backpack"],
  });

  assert.equal(plan.length, 1);
  assert.equal(plan[0].name, "Royal Spear");
});

test("buildLootPlan resolves numeric corpse labels through item metadata", () => {
  const plan = buildLootPlan({
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 3031, name: "Gold Coin", count: 40 },
          null,
        ],
      },
      {
        runtimeId: 91,
        name: "Dead Orc",
        slots: [
          { clientId: 2165, name: "2165", count: 1 },
        ],
      },
    ],
  }, {
    sourceContainerRuntimeId: 91,
    whitelist: ["stealth ring"],
    preferredContainers: ["Backpack"],
  });

  assert.equal(plan.length, 1);
  assert.equal(plan[0].name, "stealth ring");
});

test("findLootSourceContainers ignores storage containers and keeps corpse-like sources", () => {
  const sources = findLootSourceContainers(createLootSnapshot(), {
    preferredContainers: ["Backpack"],
  });

  assert.deepEqual(sources.map((entry) => entry.name), ["Dead Rat", "Dead Orc"]);
});

test("findLootableCorpses prefers hunt-target corpses over nearby trash bodies", () => {
  const corpses = findLootableCorpses({
    lootableCorpses: [
      {
        itemId: 5001,
        name: "Dead Rat",
        position: { x: 100, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
      {
        itemId: 5002,
        name: "Dead Orc",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 2,
      },
    ],
  }, {
    targetMonsterNames: ["Orc"],
  });

  assert.equal(corpses[0].name, "Dead Orc");
});

test("buildCorpseOpenAction emits a map-position container open action", () => {
  const action = buildCorpseOpenAction({
    lootableCorpses: [
      {
        itemId: 5002,
        name: "Dead Orc",
        position: { x: 101, y: 100, z: 7 },
        chebyshevDistance: 1,
      },
    ],
  }, {
    targetMonsterNames: ["Orc"],
  });

  assert.equal(action?.type, "openContainer");
  assert.deepEqual(action?.position, { x: 101, y: 100, z: 7 });
  assert.equal(action?.name, "Dead Orc");
});
