import test from "node:test";
import assert from "node:assert/strict";
import { buildHuntPresetCatalog } from "../lib/hunt-presets.mjs";

test("buildHuntPresetCatalog joins monster data with achievements and derives targeting hints", () => {
  const presets = buildHuntPresetCatalog({
    monsters: [
      {
        name: "Rotworm",
        experience: 40,
        health: 95,
        speed: 65,
        attacks: [
          { name: "melee", max: 18, element: null },
        ],
        loot: [
          { name: "Gold Coin", probability: 0.9 },
          { name: "Ham", probability: 0.25 },
        ],
      },
      {
        name: "Beholder",
        experience: 500,
        health: 900,
        speed: 105,
        attacks: [
          { name: "beam", max: 180, element: "energy" },
          { name: "spell", max: 120, element: "fire" },
        ],
        loot: [
          { name: "Platinum Coin", probability: 0.6 },
          { name: "Stealth Ring", probability: 0.02 },
        ],
      },
    ],
    achievements: [
      {
        name: "Beholder Blinder",
        monster: "Beholder",
        required: 150,
      },
    ],
  });

  assert.equal(presets.length, 2);

  const rotworm = presets.find((preset) => preset.monsterName === "Rotworm");
  assert.ok(rotworm);
  assert.deepEqual(rotworm.tags, []);
  assert.equal(rotworm.taskName, "");
  assert.equal(rotworm.targetProfile.behavior, "hold");
  assert.equal(rotworm.targetProfile.avoidBeam, false);
  assert.deepEqual(rotworm.lootHighlights, ["Gold Coin", "Ham"]);

  const beholder = presets.find((preset) => preset.monsterName === "Beholder");
  assert.ok(beholder);
  assert.equal(beholder.taskName, "Beholder Blinder");
  assert.equal(beholder.requiredKills, 150);
  assert.equal(beholder.targetProfile.behavior, "kite");
  assert.equal(beholder.targetProfile.avoidBeam, true);
  assert.equal(beholder.targetProfile.killMode, "asap");
  assert.ok(beholder.targetProfile.dangerLevel >= 7);
  assert.ok(beholder.tags.includes("task"));
  assert.ok(beholder.tags.includes("beam"));
  assert.ok(beholder.tags.includes("ranged"));
  assert.match(beholder.searchText, /beholder blinder/);
});
