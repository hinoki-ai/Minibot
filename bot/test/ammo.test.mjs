import test from "node:test";
import assert from "node:assert/strict";
import { buildVocationProfile } from "../lib/vocation-pack.mjs";
import {
  buildAmmoReloadAction,
  buildAmmoRestockAction,
  getAmmoStatus,
  resolveAmmoPolicy,
} from "../lib/modules/ammo.mjs";

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

test("resolveAmmoPolicy keeps paladin defaults and leaves sorcerers idle until configured", () => {
  const paladinPolicy = resolveAmmoPolicy(createProfile("paladin"), {
    ammoEnabled: true,
  });
  const sorcererPolicy = resolveAmmoPolicy(createProfile("sorcerer"), {
    ammoEnabled: true,
  });
  const configuredSorcererPolicy = resolveAmmoPolicy(createProfile("sorcerer"), {
    ammoEnabled: true,
    ammoPreferredNames: ["Arrow"],
    ammoWarningCount: 60,
  });

  assert.equal(paladinPolicy.enabled, true);
  assert.deepEqual(paladinPolicy.preferredNames.slice(0, 3), ["Power Bolt", "Bolt", "Arrow"]);
  assert.equal(sorcererPolicy.enabled, false);
  assert.equal(configuredSorcererPolicy.enabled, true);
  assert.deepEqual(configuredSorcererPolicy.preferredNames, ["Arrow"]);
});

test("getAmmoStatus separates equipped quiver ammo from total carried reserve", () => {
  const status = getAmmoStatus({
    ready: true,
    equipment: {
      slotLabels: ["Helmet", "Quiver"],
      slots: [
        null,
        { id: 3446, name: "Arrow", count: 10 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 3446, name: "Arrow", count: 120 },
        ],
      },
    ],
  }, {
    enabled: true,
    minimumCount: 50,
    warningCount: 100,
    reloadEnabled: true,
    reloadAtOrBelow: 25,
  });

  assert.equal(status.equippedCount, 10);
  assert.equal(status.carriedCount, 130);
  assert.equal(status.needsReload, true);
  assert.equal(status.depleted, false);
});

test("getAmmoStatus clears live ammo counts while ammo is disabled", () => {
  const status = getAmmoStatus({
    ready: true,
    equipment: {
      slotLabels: ["Helmet", "Quiver"],
      slots: [
        null,
        { id: 3035, name: "Platinum Coin", count: 50 },
      ],
    },
  }, {
    enabled: false,
    reloadEnabled: false,
    restockEnabled: false,
  });

  assert.equal(status.enabled, false);
  assert.equal(status.equippedCount, 0);
  assert.equal(status.carriedCount, 0);
  assert.equal(status.needsReload, false);
  assert.equal(status.name, "");
});

test("buildAmmoReloadAction merges matching container ammo into the quiver slot", () => {
  const action = buildAmmoReloadAction({
    ready: true,
    equipment: {
      slotLabels: ["Helmet", "Quiver"],
      slots: [
        null,
        { id: 3446, name: "Arrow", count: 10 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 3446, name: "Arrow", count: 80 },
        ],
      },
    ],
  }, {
    enabled: true,
    reloadEnabled: true,
    reloadAtOrBelow: 25,
    preferredNames: ["Arrow"],
  });

  assert.deepEqual(action, {
    type: "moveInventoryItem",
    from: {
      location: "container",
      containerRuntimeId: 10,
      slotIndex: 0,
    },
    to: {
      location: "equipment",
      slotIndex: 1,
    },
    count: 80,
    itemId: 3446,
    name: "Arrow",
    label: "Arrow",
    moduleKey: "ammo",
    ruleIndex: null,
  });
});

test("buildAmmoReloadAction first evicts non-ammo junk from the quiver slot", () => {
  const action = buildAmmoReloadAction({
    ready: true,
    equipment: {
      slotLabels: ["Helmet", "Quiver"],
      slots: [
        null,
        { id: 3035, name: "Platinum Coin", count: 50 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 3446, name: "Arrow", count: 100 },
          null,
        ],
      },
    ],
  }, {
    enabled: true,
    reloadEnabled: true,
    reloadAtOrBelow: 25,
    preferredNames: ["Arrow"],
  });

  assert.deepEqual(action, {
    type: "moveInventoryItem",
    from: {
      location: "equipment",
      slotIndex: 1,
    },
    to: {
      location: "container",
      containerRuntimeId: 10,
      slotIndex: 1,
    },
    count: 50,
    itemId: 3035,
    name: "Platinum Coin",
    moduleKey: "ammo",
    ruleIndex: null,
  });
});

test("buildAmmoRestockAction buys preferred ammo up to the warning count when trade is open", () => {
  const action = buildAmmoRestockAction({
    ready: true,
    trade: {
      open: true,
      buyItems: [
        { itemId: 3446, name: "Arrow", price: 3 },
      ],
    },
    equipment: {
      slotLabels: ["Helmet", "Quiver"],
      slots: [
        null,
        { id: 3446, name: "Arrow", count: 20 },
      ],
    },
    containers: [
      {
        runtimeId: 10,
        name: "Backpack",
        slots: [
          { id: 3446, name: "Arrow", count: 30 },
        ],
      },
    ],
  }, {
    enabled: true,
    restockEnabled: true,
    warningCount: 100,
    preferredNames: ["Arrow"],
  });

  assert.deepEqual(action, {
    type: "buyItem",
    itemId: 3446,
    name: "Arrow",
    amount: 50,
    moduleKey: "ammo",
    ruleIndex: null,
  });
});

test("buildAmmoRestockAction ignores quiver value-slot coins when ammo is enabled", () => {
  const action = buildAmmoRestockAction({
    ready: true,
    trade: {
      open: true,
      buyItems: [
        { itemId: 3446, name: "Arrow", price: 3 },
      ],
    },
    equipment: {
      slotLabels: ["Helmet", "Quiver"],
      slots: [
        null,
        { id: 3035, name: "Platinum Coin", count: 50 },
      ],
    },
  }, {
    enabled: true,
    restockEnabled: true,
    warningCount: 100,
    preferredNames: ["Arrow"],
  });

  assert.deepEqual(action, {
    type: "buyItem",
    itemId: 3446,
    name: "Arrow",
    amount: 100,
    moduleKey: "ammo",
    ruleIndex: null,
  });
});
