import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeOperationalTraversal,
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
