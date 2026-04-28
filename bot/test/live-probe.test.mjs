import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDiff,
  normalizeDialogue,
  normalizeTrade,
  parseArgs,
  summarizeSnapshot,
} from "../scripts/live-probe.mjs";

test("parseArgs reads the live probe options", () => {
  const options = parseArgs([
    "--character", "Dark Knight",
    "--message", "/i 3422",
    "--channel-index", "0",
    "--wait-ms", "2500",
    "--port", "9333",
    "--url-prefix", "https://minibia.com/play?pwa=1",
  ]);

  assert.equal(options.character, "Dark Knight");
  assert.equal(options.message, "/i 3422");
  assert.equal(options.channelIndex, 0);
  assert.equal(options.waitMs, 2500);
  assert.equal(options.port, 9333);
  assert.equal(options.pageUrlPrefix, "https://minibia.com/play?pwa=1");
});

test("summarizers normalize snapshot, dialogue, and trade state", () => {
  const snapshot = summarizeSnapshot({
    ready: true,
    playerName: " Dark Knight ",
    playerPosition: { x: 100, y: 200, z: 7 },
    gold: "8100",
    isMoving: false,
    pathfinderAutoWalking: true,
    visibleNpcs: [
      { name: " H.L. ", chebyshevDistance: "1", position: { x: 101, y: 200, z: 7 } },
    ],
    containers: [
      {
        runtimeId: "55",
        itemId: "3503",
        name: " Parcel ",
        usedSlots: "1",
        freeSlots: "19",
        slots: [
          {
            slotIndex: "0",
            item: {
              itemId: "3422",
              name: " Great Shield ",
              count: "1",
            },
          },
        ],
      },
    ],
  });
  const dialogue = normalizeDialogue({
    open: true,
    npcName: " H.L. ",
    prompt: " Trade ",
    options: [{ index: "0", text: " Buy " }],
    recentMessages: [{ speaker: "H.L.", text: "hi", channelName: "" }],
  });
  const trade = normalizeTrade({
    open: true,
    npcName: " H.L. ",
    activeSide: " buy ",
    selectedItem: { index: "1", id: "3422", name: " Great Shield ", price: "480" },
    buyItems: [{ index: "1", id: "3422", name: " Great Shield ", price: "480" }],
    sellItems: [],
  });

  assert.deepEqual(snapshot, {
    ready: true,
    playerName: "Dark Knight",
    playerPosition: { x: 100, y: 200, z: 7 },
    gold: 8100,
    isMoving: false,
    pathfinderAutoWalking: true,
    visibleNpcs: [
      { name: "H.L.", position: { x: 101, y: 200, z: 7 }, distance: 1 },
    ],
    containers: [
      {
        runtimeId: 55,
        itemId: 3503,
        name: "Parcel",
        usedSlots: 1,
        freeSlots: 19,
        slots: [
          { slotIndex: 0, itemId: 3422, name: "Great Shield", count: 1 },
        ],
      },
    ],
  });
  assert.deepEqual(dialogue, {
    open: true,
    npcName: "H.L.",
    prompt: "Trade",
    options: [{ index: 0, text: "Buy" }],
    recentMessages: [{
      key: "H.L.|hi|",
      speaker: "H.L.",
      text: "hi",
      channelName: "",
    }],
  });
  assert.deepEqual(trade, {
    open: true,
    npcName: "H.L.",
    activeSide: "buy",
    selectedItem: { index: 1, itemId: 3422, name: "Great Shield", price: 480 },
    buyItems: [{ index: 1, itemId: 3422, name: "Great Shield", price: 480 }],
    sellItems: [],
  });
});

test("buildDiff reports new messages, notifications, and container changes", () => {
  const before = {
    snapshot: {
      containers: [
        {
          runtimeId: 55,
          name: "Parcel",
          slots: [],
        },
      ],
      playerPosition: { x: 100, y: 200, z: 7 },
    },
    dialogue: {
      recentMessages: [
        { key: "speaker|hello|", speaker: "Speaker", text: "hello", channelName: "" },
      ],
    },
    trade: {
      open: false,
    },
    pageState: {
      notifications: ["Old"],
      openModals: [],
    },
    floor: {
      tiles: [
        { position: { x: 100, y: 200, z: 7 }, items: [] },
      ],
    },
  };
  const after = {
    snapshot: {
      playerPosition: { x: 101, y: 200, z: 7 },
      containers: [
        {
          runtimeId: 55,
          name: "Parcel",
          slots: [
            { slotIndex: 0, name: "Great Shield", itemId: 3422, count: 1 },
          ],
        },
      ],
    },
    dialogue: {
      recentMessages: [
        { key: "speaker|hello|", speaker: "Speaker", text: "hello", channelName: "" },
        { key: "speaker|granted|", speaker: "Speaker", text: "granted", channelName: "" },
      ],
    },
    trade: {
      open: true,
    },
    pageState: {
      notifications: ["Old", "Granted"],
      openModals: ["offer-modal"],
    },
    floor: {
      tiles: [
        {
          position: { x: 100, y: 200, z: 7 },
          items: [{ itemId: 3422, name: "Great Shield", count: 1 }],
        },
      ],
    },
  };

  const diff = buildDiff(before, after);

  assert.equal(diff.positionChanged, true);
  assert.deepEqual(diff.newMessages, [
    { key: "speaker|granted|", speaker: "Speaker", text: "granted", channelName: "" },
  ]);
  assert.deepEqual(diff.notificationDelta, [
    { value: "Granted", count: 1 },
  ]);
  assert.deepEqual(diff.modalDelta, [
    { value: "offer-modal", count: 1 },
  ]);
  assert.deepEqual(diff.containerDelta, [
    { value: "Parcel#55|0|Great Shield|3422|1", count: 1 },
  ]);
  assert.deepEqual(diff.floorDelta, [
    { value: "100,200,7|3422|Great Shield|1", count: 1 },
  ]);
  assert.equal(diff.tradeChanged, true);
});
