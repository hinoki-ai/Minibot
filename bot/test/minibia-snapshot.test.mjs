import test from "node:test";
import assert from "node:assert/strict";
import {
  MINIBIA_SNAPSHOT_VERSION,
  collectSnapshotInventoryItems,
  normalizeMinibiaSnapshot,
  summarizeSnapshotSupplies,
} from "../lib/minibia-snapshot.mjs";

test("normalizeMinibiaSnapshot maps the current refresh payload into a stable runtime contract", () => {
  const normalized = normalizeMinibiaSnapshot({
    ready: true,
    reason: "",
    playerName: "Scout Beta",
    playerPosition: { x: 321, y: 654, z: 7 },
    playerStats: {
      health: 880,
      maxHealth: 1000,
      mana: 420,
      maxMana: 600,
      healthPercent: 88,
      manaPercent: 70,
      level: 48,
    },
    connection: {
      connected: true,
      canReconnect: false,
    },
    isMoving: false,
    pathfinderAutoWalking: true,
    pathfinderFinalDestination: { x: 322, y: 654, z: 7 },
    autoWalkStepsRemaining: 4,
    monsterNames: ["Larva", "Rotworm"],
    visibleCreatureNames: ["Larva"],
    visiblePlayerNames: ["Knight Alpha"],
    currentTarget: {
      id: 91,
      name: "Larva",
      position: { x: 323, y: 654, z: 7 },
      healthPercent: 32,
      isShootable: true,
      dx: 2,
      dy: 0,
      dz: 0,
      distance: 2,
      chebyshevDistance: 2,
      withinCombatWindow: true,
      withinCombatBox: true,
      reachableForCombat: true,
      isCurrentTarget: true,
      isAxisAligned: true,
      isDiagonalAligned: false,
    },
    visibleCreatures: [
      {
        id: 91,
        name: "Larva",
        position: { x: 323, y: 654, z: 7 },
        healthPercent: 32,
        isShootable: true,
        dx: 2,
        dy: 0,
        dz: 0,
      },
    ],
    visiblePlayers: [
      {
        id: 11,
        name: "Knight Alpha",
        position: { x: 320, y: 655, z: 7 },
        healthPercent: 100,
        isShootable: false,
        dx: -1,
        dy: 1,
        dz: 0,
      },
    ],
    hazardTiles: [
      {
        position: { x: 320, y: 654, z: 7 },
        categories: ["teleports", "traps"],
        labels: ["Town Portal"],
        ids: [1387],
      },
    ],
    walkableTiles: [
      { x: 320, y: 654, z: 7 },
      { x: 321, y: 654, z: 7 },
      { x: 322, y: 654, z: 7 },
    ],
    reachableWalkableTiles: [
      { x: 321, y: 654, z: 7 },
      { x: 322, y: 654, z: 7 },
    ],
    safeTiles: [
      { x: 321, y: 654, z: 7 },
      { x: 322, y: 654, z: 7 },
    ],
    reachableTiles: [
      { x: 321, y: 654, z: 7 },
    ],
    combatModes: {
      fightMode: "Balanced",
      chaseMode: "Stand",
    },
    progression: {
      blessings: ["Twist of Fate", "The Spark"],
      residence: "Thais",
      promotion: "Elite Knight",
    },
    dialogue: {
      playerName: "Scout Beta",
      open: true,
      npcName: "Sandra",
      prompt: "Do you want to travel to Thais?",
      options: [
        { index: 0, text: "Yes" },
        { index: 1, text: "No" },
      ],
      tradeState: {
        open: true,
        side: "buy",
        visibleBuyCount: 4,
      },
      recentMessages: [
        { id: "m1", speaker: "Sandra", text: "Do you want to travel to Thais?" },
      ],
    },
  });

  assert.equal(normalized.schemaVersion, MINIBIA_SNAPSHOT_VERSION);
  assert.equal(normalized.player.name, "Scout Beta");
  assert.deepEqual(normalized.player.position, { x: 321, y: 654, z: 7 });
  assert.equal(normalized.player.stats.level, 48);
  assert.equal(normalized.movement.autoWalking, true);
  assert.deepEqual(normalized.movement.destination, { x: 322, y: 654, z: 7 });
  assert.equal(normalized.combat.target?.name, "Larva");
  assert.equal(normalized.combat.modes.fightMode, "balanced");
  assert.equal(normalized.combat.modes.chaseMode, "stand");
  assert.deepEqual(normalized.combat.hazardTiles[0], {
    position: { x: 320, y: 654, z: 7 },
    categories: ["teleports", "traps"],
    labels: ["Town Portal"],
    ids: [1387],
  });
  assert.deepEqual(normalized.combat.walkableTiles[0], { x: 320, y: 654, z: 7 });
  assert.deepEqual(normalized.combat.reachableWalkableTiles[0], { x: 321, y: 654, z: 7 });
  assert.deepEqual(normalized.progression.blessings, ["The Spark", "Twist of Fate"]);
  assert.equal(normalized.progression.residence, "Thais");
  assert.equal(normalized.dialogue.open, true);
  assert.equal(normalized.dialogue.npcName, "Sandra");
  assert.equal(normalized.dialogue.options.length, 2);
  assert.equal(normalized.dialogue.tradeState.open, true);
  assert.equal(normalized.dialogue.travelState.pendingConfirmation, true);
});

test("normalizeMinibiaSnapshot preserves bootstrap connection lifecycle details", () => {
  const normalized = normalizeMinibiaSnapshot({
    ready: false,
    reason: "auth-failed",
    connection: {
      connected: true,
      reconnectMethodAvailable: false,
      canReconnect: false,
      loginWrapperVisible: true,
      loginModalVisible: false,
      characterSelectVisible: false,
      connectingModalVisible: true,
      connectingFooterVisible: true,
      connectingMessage: "The account name or password is incorrect.",
      authFailure: true,
      lifecycle: "auth-failed",
      lastCharacterName: "Knight Alpha",
    },
  });

  assert.equal(normalized.ready, false);
  assert.equal(normalized.reason, "auth-failed");
  assert.equal(normalized.connection.connected, true);
  assert.equal(normalized.connection.reconnectMethodAvailable, false);
  assert.equal(normalized.connection.loginWrapperVisible, true);
  assert.equal(normalized.connection.connectingModalVisible, true);
  assert.equal(normalized.connection.connectingFooterVisible, true);
  assert.equal(normalized.connection.connectingMessage, "The account name or password is incorrect.");
  assert.equal(normalized.connection.authFailure, true);
  assert.equal(normalized.connection.lifecycle, "auth-failed");
  assert.equal(normalized.connection.lastCharacterName, "Knight Alpha");
});

test("normalizeMinibiaSnapshot summarizes inventory, hotbar, ammo, and supplies", () => {
  const normalized = normalizeMinibiaSnapshot({
    equipment: {
      slotLabels: ["Helmet", "Armor", "Quiver"],
      slots: [
        { id: 2461, name: "Steel Helmet" },
        null,
        { id: 7368, name: "Royal Spear", count: 23 },
      ],
    },
    hotbar: {
      slots: [
        {
          index: 0,
          item: { id: 2268, name: "Sudden Death Rune", count: 9 },
        },
      ],
    },
    containers: [
      {
        runtimeId: 101,
        itemId: 2854,
        name: "Backpack",
        slots: [
          { id: 236, name: "Strong Mana Potion", count: 17 },
          { id: 3607, name: "Ham", count: 4 },
          { id: 3003, name: "Rope", count: 1 },
          { id: 3457, name: "Shovel", count: 1 },
        ],
      },
    ],
  });

  assert.equal(normalized.inventory.equipment.slots.length, 3);
  assert.equal(normalized.inventory.hotbar.slots[0].item?.name, "Sudden Death Rune");
  assert.equal(normalized.inventory.containers[0].runtimeId, 101);
  assert.equal(normalized.inventory.ammo?.count, 23);
  assert.equal(normalized.inventory.supplies.potions, 17);
  assert.equal(normalized.inventory.supplies.runes, 9);
  assert.equal(normalized.inventory.supplies.food, 4);
  assert.equal(normalized.inventory.supplies.rope, 1);
  assert.equal(normalized.inventory.supplies.shovel, 1);
  assert.equal(normalized.inventory.supplies.ammo, 23);
});

test("normalizeMinibiaSnapshot preserves hotbar spell metadata for shared action planning", () => {
  const normalized = normalizeMinibiaSnapshot({
    hotbar: {
      slots: [
        {
          index: 0,
          kind: "spell",
          label: "Ultimate Healing",
          words: "exura vita",
          spellId: 11,
          spellName: "Ultimate Healing",
          active: true,
          enabled: true,
        },
        {
          index: 1,
          kind: "item",
          hotkey: "F2",
          item: { id: 236, name: "Strong Mana Potion", count: 12 },
        },
      ],
    },
  });

  assert.equal(normalized.inventory.hotbar.slots[0].kind, "spell");
  assert.equal(normalized.inventory.hotbar.slots[0].words, "exura vita");
  assert.equal(normalized.inventory.hotbar.slots[0].spellName, "Ultimate Healing");
  assert.equal(normalized.inventory.hotbar.slots[0].empty, false);
  assert.equal(normalized.inventory.hotbar.slots[1].kind, "item");
  assert.equal(normalized.inventory.hotbar.slots[1].hotkey, "F2");
  assert.equal(normalized.inventory.hotbar.slots[1].item?.name, "Strong Mana Potion");
  assert.equal(normalized.inventory.hotbar.slots[1].empty, false);
});

test("normalizeMinibiaSnapshot preserves sparse container slot indexes from runtime payloads", () => {
  const normalized = normalizeMinibiaSnapshot({
    containers: [
      {
        runtimeId: 101,
        name: "Backpack",
        slots: [
          { slotIndex: 5, item: { id: 3582, name: "Dragon Ham", count: 12 } },
        ],
      },
    ],
  });

  assert.equal(normalized.inventory.containers[0].slots.length, 1);
  assert.equal(normalized.inventory.containers[0].slots[0].index, 5);

  const items = collectSnapshotInventoryItems(normalized);
  assert.equal(items.length, 1);
  assert.equal(items[0].slotIndex, 5);
  assert.equal(items[0].item.name, "Dragon Ham");
});

test("normalizeMinibiaSnapshot exposes npc, pvp, dialogue, trade, bank, task, and hotbar action state", () => {
  const normalized = normalizeMinibiaSnapshot({
    visibleNpcs: [
      {
        id: 31,
        name: "Sandra",
        position: { x: 322, y: 654, z: 7 },
        chebyshevDistance: 1,
      },
    ],
    visibleNpcNames: ["Sandra"],
    pvpState: {
      pkLockEnabled: true,
      pzLocked: true,
      skull: {
        key: "white",
        label: "White Skull",
      },
    },
    dialogue: {
      activeChannelName: "Default",
      defaultChannelName: "Default",
      defaultChannelActive: true,
      npcName: "Sandra",
      prompt: "Would you like to trade?",
      options: [
        { text: "Trade" },
        { text: "Balance" },
      ],
      recentMessages: [
        { id: "m1", speaker: "Sandra", text: "Hello there." },
        { id: "m2", speaker: "Sandra", text: "Your account balance is 12,050 gold." },
      ],
    },
    trade: {
      open: true,
      npcName: "Sandra",
      activeSide: "buy",
      selectedItem: { name: "Strong Mana Potion", itemId: 237, price: 80, side: "buy" },
      buyItems: [
        { itemId: 237, name: "Strong Mana Potion", price: 80 },
      ],
      sellItems: [
        { itemId: 3031, name: "Gold Coin", price: 1, side: "sell" },
      ],
    },
    task: {
      open: true,
      activeTaskType: "hunting",
      taskNpc: "Grizzly Adams",
      taskTarget: "Larva",
      progressCurrent: 12,
      progressRequired: 30,
      rewardReady: false,
    },
    hotbar: {
      slots: [
        {
          index: 0,
          kind: "action",
          label: "Attack Nearest",
          words: "attack nearest",
        },
      ],
    },
  });

  assert.equal(normalized.combat.visibleNpcs.length, 1);
  assert.equal(normalized.combat.visibleNpcs[0].name, "Sandra");
  assert.deepEqual(normalized.combat.visibleNpcNames, ["Sandra"]);
  assert.equal(normalized.pvp.pkLockEnabled, true);
  assert.equal(normalized.pvp.pzLocked, true);
  assert.equal(normalized.pvp.skull.key, "white");
  assert.equal(normalized.dialogue.npcName, "Sandra");
  assert.equal(normalized.dialogue.prompt, "Would you like to trade?");
  assert.equal(normalized.dialogue.options[0].text, "Trade");
  assert.equal(normalized.bank.bankBalance, 12050);
  assert.equal(normalized.trade.open, true);
  assert.equal(normalized.trade.buyItems[0].name, "Strong Mana Potion");
  assert.equal(normalized.task.activeTaskType, "hunting");
  assert.equal(normalized.task.progressCurrent, 12);
  assert.equal(normalized.inventory.hotbar.slots[0].kind, "action");
  assert.equal(normalized.inventory.hotbar.slots[0].actionType, "attack-nearest");
});

test("collectSnapshotInventoryItems and summarizeSnapshotSupplies accept already-normalized snapshots", () => {
  const normalized = normalizeMinibiaSnapshot({
    equipment: {
      slots: [
        { label: "Quiver", item: { id: 3447, name: "Assassin Star", count: 12 } },
      ],
    },
    containers: [
      {
        runtimeId: 88,
        slots: [
          { item: { id: 2261, name: "Destroy Field Rune", count: 3 } },
        ],
      },
    ],
  });

  const items = collectSnapshotInventoryItems(normalized);
  const supplies = summarizeSnapshotSupplies(normalized);

  assert.equal(items.length, 2);
  assert.equal(items[0].ownerType, "equipment");
  assert.equal(supplies.ammo, 12);
  assert.equal(supplies.runes, 3);
});
