import test from "node:test";
import assert from "node:assert/strict";
import { classifyMinibiaTileDiagnostic } from "../lib/minibia-item-metadata.mjs";

test("classifyMinibiaTileDiagnostic explains common route-blocking tile categories", () => {
  const field = classifyMinibiaTileDiagnostic({ name: "fire field" });
  assert.equal(field.categories.includes("field"), true);
  assert.equal(field.floorChange, false);

  const ladder = classifyMinibiaTileDiagnostic({ name: "wooden ladder", properties: { floorchange: true } });
  assert.equal(ladder.categories.includes("ladder"), true);
  assert.equal(ladder.floorChange, true);

  const trap = classifyMinibiaTileDiagnostic({ name: "spike trap", walkable: false });
  assert.equal(trap.categories.includes("trap"), true);
  assert.equal(trap.categories.includes("blocked"), true);
  assert.equal(trap.blocked, true);

  const food = classifyMinibiaTileDiagnostic({ name: "brown mushroom" });
  assert.equal(food.categories.includes("food"), true);
});
