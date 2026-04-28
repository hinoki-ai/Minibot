import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCreateItemExpression,
  parseArgs,
  resolveContainerTarget,
} from "../scripts/god-create-item.mjs";

const FIXTURE_ITEMS = Object.freeze([
  {
    cid: 2390,
    name: "magic longsword",
    sid: 3278,
  },
  {
    cid: 2595,
    containerSize: 10,
    name: "parcel",
    sid: 3503,
  },
]);

test("parseArgs captures optional target container", () => {
  const options = parseArgs([
    "--character",
    "Dark Knight",
    "--item",
    "magic longsword",
    "--container",
    "parcel",
    "--visual-only",
  ]);

  assert.equal(options.character, "Dark Knight");
  assert.equal(options.item, "magic longsword");
  assert.equal(options.container, "parcel");
  assert.equal(options.visualOnly, true);
});

test("resolveContainerTarget prefers known container item ids", () => {
  assert.deepEqual(resolveContainerTarget(FIXTURE_ITEMS, "parcel"), {
    cid: 2595,
    itemName: "parcel",
    query: "parcel",
    runtimeId: null,
    sid: 3503,
  });
});

test("resolveContainerTarget falls back to runtime id when the query is numeric", () => {
  assert.deepEqual(resolveContainerTarget(FIXTURE_ITEMS, "419436"), {
    cid: null,
    itemName: "",
    query: "419436",
    runtimeId: 419436,
    sid: null,
  });
});

test("buildCreateItemExpression embeds the requested target container", () => {
  const expression = buildCreateItemExpression(
    FIXTURE_ITEMS[0],
    1,
    resolveContainerTarget(FIXTURE_ITEMS, "parcel"),
  );

  assert.match(expression, /"query":"parcel"/);
  assert.match(expression, /"sid":3503/);
  assert.match(expression, /target container not open/);
});
