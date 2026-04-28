import test from "node:test";
import assert from "node:assert/strict";
import { buildVocationProfile } from "../lib/vocation-pack.mjs";
import {
  buildSustainAction,
  summarizeSustainStatus,
} from "../lib/modules/sustain.mjs";

function createProfile(vocation = "sorcerer") {
  const baseSpells = vocation === "paladin"
    ? [
        { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
        { id: 10, name: "Intense Healing", words: "exura gran", level: 2, mana: 40 },
        { id: 2, name: "Light Healing", words: "exura", level: 1, mana: 25 },
      ]
    : [
        { id: 11, name: "Ultimate Healing", words: "exura vita", level: 8, mana: 80 },
        { id: 10, name: "Intense Healing", words: "exura gran", level: 2, mana: 40 },
        { id: 2, name: "Light Healing", words: "exura", level: 1, mana: 25 },
      ];
  return buildVocationProfile({
    vocation,
    spells: baseSpells,
  });
}

test("buildSustainAction prefers a hotbar heal spell when health is in the emergency band", () => {
  const profile = createProfile("paladin");
  const action = buildSustainAction({
    ready: true,
    playerStats: {
      healthPercent: 20,
      manaPercent: 80,
    },
    hotbar: {
      slots: [
        {
          index: 0,
          kind: "spell",
          label: "Ultimate Healing",
          words: "exura vita",
          spellName: "Ultimate Healing",
        },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 236, name: "Strong Mana Potion", count: 8 },
        ],
      },
    ],
  }, profile);

  assert.equal(action?.type, "useHotbarSlot");
  assert.equal(action?.slotIndex, 0);
});

test("buildSustainAction falls back to shared consumable routing for mana recovery", () => {
  const profile = createProfile("sorcerer");
  const action = buildSustainAction({
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
  }, profile);

  assert.equal(action?.type, "useItemOnSelf");
  assert.equal(action?.category, "potion");
  assert.equal(action?.source?.location, "container");
  assert.equal(action?.source?.containerRuntimeId, 22);
});

test("buildSustainAction falls back to a healing rune before potions in the emergency band", () => {
  const profile = createProfile("druid");
  const action = buildSustainAction({
    ready: true,
    playerStats: {
      healthPercent: 19,
      manaPercent: 40,
    },
    containers: [
      {
        runtimeId: 33,
        name: "Backpack",
        slots: [
          { id: 2273, name: "Ultimate Healing Rune", count: 4 },
          { id: 7618, name: "Health Potion", count: 12 },
        ],
      },
    ],
  }, profile);

  assert.equal(action?.type, "useItemOnSelf");
  assert.equal(action?.category, "rune");
  assert.equal(action?.name, "Ultimate Healing Rune");
  assert.equal(action?.source?.containerRuntimeId, 33);
});

test("summarizeSustainStatus surfaces low ammo and low supplies from the normalized snapshot", () => {
  const profile = createProfile("paladin");
  const status = summarizeSustainStatus({
    ready: true,
    playerStats: {
      healthPercent: 75,
      manaPercent: 70,
    },
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
        runtimeId: 22,
        name: "Backpack",
        slots: [
          { id: 7618, name: "Health Potion", count: 5 },
          { id: 2666, name: "Meat", count: 1 },
        ],
      },
    ],
  }, profile);

  assert.equal(status.lowSupplies.potions, true);
  assert.equal(status.lowSupplies.ammo, true);
  assert.equal(status.ammo.count, 30);
});
