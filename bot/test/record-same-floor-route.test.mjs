import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeOperationalTraversal,
  attachRecorderIntentHintsToWaypoints,
  buildRecordedRouteDiagnostics,
  buildRecorderIntentHintsFromSnapshot,
  buildRouteWaypoints,
  computeTerminalLeafKeys,
} from "../scripts/record-same-floor-route.mjs";

function buildTileMap(positions) {
  return new Map(positions.map((position) => [
    `${position.x},${position.y},${position.z}`,
    { ...position },
  ]));
}

test("buildRouteWaypoints keeps true 5-sqm spacing instead of preserving every turn in a loop", () => {
  const waypoints = buildRouteWaypoints([
    { x: 10, y: 10, z: 7 },
    { x: 11, y: 10, z: 7 },
    { x: 12, y: 10, z: 7 },
    { x: 12, y: 11, z: 7 },
    { x: 11, y: 11, z: 7 },
    { x: 10, y: 11, z: 7 },
    { x: 10, y: 10, z: 7 },
  ], 5);

  assert.deepEqual(
    waypoints.map(({ x, y, z }) => ({ x, y, z })),
    [
      { x: 10, y: 10, z: 7 },
      { x: 10, y: 11, z: 7 },
    ],
  );
});

test("buildRouteWaypoints removes consecutive duplicate waypoints created by distant revisits", () => {
  const waypoints = buildRouteWaypoints([
    { x: 0, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 2, y: 0, z: 7 },
    { x: 3, y: 0, z: 7 },
    { x: 4, y: 0, z: 7 },
    { x: 5, y: 0, z: 7 },
    { x: 4, y: 0, z: 7 },
    { x: 3, y: 0, z: 7 },
    { x: 2, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 0, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 2, y: 0, z: 7 },
    { x: 3, y: 0, z: 7 },
    { x: 4, y: 0, z: 7 },
    { x: 5, y: 0, z: 7 },
  ], 5);

  assert.deepEqual(
    waypoints.map(({ x, y, z }) => ({ x, y, z })),
    [
      { x: 0, y: 0, z: 7 },
      { x: 5, y: 0, z: 7 },
      { x: 0, y: 0, z: 7 },
      { x: 5, y: 0, z: 7 },
    ],
  );
});

test("computeTerminalLeafKeys prunes only non-start leaf tiles", () => {
  const discovered = buildTileMap([
    { x: 0, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 2, y: 0, z: 7 },
  ]);

  const leaves = computeTerminalLeafKeys(discovered, { x: 0, y: 0, z: 7 });

  assert.deepEqual([...leaves], ["2,0,7"]);
});

test("analyzeOperationalTraversal flags disconnected safe tiles instead of silently treating them as complete", () => {
  const discovered = buildTileMap([
    { x: 0, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 10, y: 10, z: 7 },
  ]);

  const analysis = analyzeOperationalTraversal({ x: 0, y: 0, z: 7 }, discovered);

  assert.deepEqual(analysis.missingOperationalTileKeys, []);
  assert.deepEqual(analysis.unreachableGraphTileKeys, ["10,10,7"]);
});

test("buildRecordedRouteDiagnostics carries validation and recorder warnings", () => {
  const discovered = buildTileMap([
    { x: 0, y: 0, z: 7 },
    { x: 1, y: 0, z: 7 },
    { x: 10, y: 10, z: 7 },
  ]);
  const traversalAnalysis = analyzeOperationalTraversal({ x: 0, y: 0, z: 7 }, discovered);
  const unsafeTiles = new Map([
    ["2,0,7", { x: 2, y: 0, z: 7, tileName: "hole", unsafe: true }],
  ]);

  const diagnostics = buildRecordedRouteDiagnostics({
    routeName: "recorded",
    waypoints: buildRouteWaypoints([
      { x: 0, y: 0, z: 7 },
      { x: 1, y: 0, z: 7 },
    ], 1),
    unsafeTiles,
    traversalAnalysis,
    completed: true,
    routeSaveReason: "complete traversal saved",
  });

  assert.equal(diagnostics.validation.ok, true);
  assert.equal(diagnostics.warnings.some((warning) => warning.code === "floor-change-tiles-excluded"), true);
  assert.equal(diagnostics.warnings.some((warning) => warning.code === "disconnected-visible-safe-tiles"), true);
});

test("recorder intent hints capture service, tool, and corpse context", () => {
  const hints = buildRecorderIntentHintsFromSnapshot({
    playerPosition: { x: 100, y: 100, z: 7 },
    dialogue: {
      open: true,
      npcName: "Captain Bluebear",
      travelState: { open: true },
      options: [{ text: "Travel to Venore" }],
    },
    trade: {
      open: true,
      npcName: "Lily",
    },
    inventory: {
      openContainers: [
        { name: "dead rotworm", position: { x: 101, y: 100, z: 7 } },
      ],
    },
  }, {
    playerPosition: { x: 100, y: 100, z: 7 },
    tiles: [
      {
        x: 102,
        y: 100,
        z: 7,
        unsafe: true,
        tileName: "rope spot",
        items: [],
      },
    ],
  });

  assert.equal(hints.some((hint) => hint.kind === "npc-action" && hint.progressionAction === "travel"), true);
  assert.equal(hints.some((hint) => hint.kind === "shop"), true);
  assert.equal(hints.some((hint) => hint.kind === "corpse-pause"), true);
  assert.equal(hints.some((hint) => hint.kind === "rope" && hint.tool === "rope"), true);

  const annotated = attachRecorderIntentHintsToWaypoints([
    { x: 100, y: 100, z: 7, type: "walk", label: "start" },
    { x: 102, y: 100, z: 7, type: "walk", label: "rope" },
  ], hints);

  assert.equal(annotated.some((waypoint) => Array.isArray(waypoint.recorderIntents) && waypoint.recorderIntents.length > 0), true);
  assert.equal(annotated[1].recorderIntents.some((intent) => intent.kind === "rope"), true);
});
