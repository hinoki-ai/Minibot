import test from "node:test";
import assert from "node:assert/strict";
import { MinibiaTargetBot } from "../lib/bot-core.mjs";
import { buildHasteAction } from "../lib/modules/haste.mjs";

function createHasteSnapshot(overrides = {}) {
  return {
    ready: true,
    playerStats: {
      healthPercent: 100,
      mana: 120,
      manaPercent: 60,
    },
    hasHasteCondition: false,
    conditionDetection: {
      haste: true,
    },
    currentTarget: null,
    visibleCreatures: [],
    candidates: [],
    isMoving: false,
    pathfinderAutoWalking: false,
    ...overrides,
  };
}

test("haste planner casts when haste is detected missing and mana is available", () => {
  const action = buildHasteAction(createHasteSnapshot(), {
    hasteEnabled: true,
    hasteWords: "utani hur",
    hasteMinMana: 60,
    hasteCooldownMs: 0,
  }, {
    now: 10_000,
  });

  assert.equal(action?.type, "haste");
  assert.equal(action?.moduleKey, "haste");
  assert.equal(action?.words, "utani hur");
});

test("haste planner skips when the live character is already hasted", () => {
  const action = buildHasteAction(createHasteSnapshot({
    hasHasteCondition: true,
  }), {
    hasteEnabled: true,
    hasteWords: "utani hur",
    hasteMinMana: 60,
    hasteCooldownMs: 0,
  }, {
    now: 10_000,
  });

  assert.equal(action, null);
});

test("haste planner drinks mana fluid when mana is too low for the haste spell", () => {
  const action = buildHasteAction(createHasteSnapshot({
    playerStats: {
      healthPercent: 100,
      mana: 20,
      manaPercent: 10,
    },
    hotbar: {
      slots: [
        {
          index: 3,
          kind: "item",
          label: "Mana Fluid",
          item: {
            id: 2874,
            name: "Mana Fluid",
            count: 2,
          },
          enabled: true,
        },
      ],
    },
  }), {
    hasteEnabled: true,
    hasteWords: "utani hur",
    hasteMinMana: 60,
    hasteCooldownMs: 0,
    hasteManaFluidEnabled: true,
    hasteManaFluidName: "Mana Fluid",
    hasteManaFluidCooldownMs: 0,
  }, {
    now: 10_000,
  });

  assert.equal(action?.type, "useHotbarSlot");
  assert.equal(action?.moduleKey, "hasteManaFluid");
  assert.equal(action?.hasteKind, "mana-fluid");
  assert.equal(action?.slotIndex, 3);
});

test("attemptHaste executes a configured spell hotkey", async () => {
  const bot = new MinibiaTargetBot({
    hasteEnabled: true,
    hasteWords: "utani gran hur",
    hasteHotkey: "F8",
    hasteMinMana: 100,
    hasteCooldownMs: 0,
  });
  let hotkeyAction = null;

  bot.useHotkey = async (action) => {
    hotkeyAction = action;
    return { ok: true };
  };

  const attempt = await bot.attemptHaste(createHasteSnapshot({
    playerStats: {
      healthPercent: 100,
      mana: 150,
      manaPercent: 80,
    },
  }));

  assert.equal(attempt.result?.ok, true);
  assert.equal(hotkeyAction?.moduleKey, "haste");
  assert.equal(hotkeyAction?.hotkey, "F8");
  assert.equal(hotkeyAction?.words, "utani gran hur");
});
