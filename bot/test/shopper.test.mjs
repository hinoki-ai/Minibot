import test from "node:test";
import assert from "node:assert/strict";
import {
  buildShopAction,
  normalizeShopRequest,
} from "../lib/modules/shopper.mjs";

test("normalizeShopRequest keeps only the supported trade operations", () => {
  const request = normalizeShopRequest({
    operation: "sell-all",
    name: "Gold Coin",
    amount: "999",
  });

  assert.equal(request.operation, "sell-all");
  assert.equal(request.name, "Gold Coin");
  assert.equal(request.amount, 999);
});

test("buildShopAction maps sell-all requests onto the shared sellAllOfItem action", () => {
  const action = buildShopAction({
    operation: "sell-all",
    name: "Gold Coin",
  });

  assert.deepEqual(action, {
    type: "sellAllOfItem",
    itemId: null,
    name: "Gold Coin",
    amount: 0,
    moduleKey: null,
    ruleIndex: null,
  });
});
