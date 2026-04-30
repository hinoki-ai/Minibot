#!/usr/bin/env node

import fs from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  MinibiaTargetBot,
  discoverGamePages,
  formatGeneratedWaypointLabel,
  sleep,
} from "../lib/bot-core.mjs";
import {
  buildCharacterKey,
  describeRouteProfile,
  listRouteProfiles,
  loadConfig,
  saveConfig,
  validateRouteConfig,
} from "../lib/config-store.mjs";

const DEFAULT_CHARACTER_NAME = "Spells Of Regret";
const DEFAULT_POLL_MS = 250;
const DEFAULT_MOVE_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_MINUTES = 20;
const DEFAULT_ROUTE_SPACING = 5;
const FLOOR_CHANGE_NAME_PATTERN = /\b(?:hole|pitfall|trapdoor|stairs|ladder)\b/i;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    characterName: DEFAULT_CHARACTER_NAME,
    routeName: "",
    maxMinutes: DEFAULT_MAX_MINUTES,
    pollMs: DEFAULT_POLL_MS,
    moveTimeoutMs: DEFAULT_MOVE_TIMEOUT_MS,
    silent: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [flag, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];

    if (flag === "--character" && nextValue) {
      options.characterName = String(nextValue).trim() || DEFAULT_CHARACTER_NAME;
      if (inlineValue == null) index += 1;
      continue;
    }

    if (flag === "--route" && nextValue) {
      options.routeName = String(nextValue).trim();
      if (inlineValue == null) index += 1;
      continue;
    }

    if (flag === "--max-minutes" && nextValue) {
      options.maxMinutes = Math.max(1, Number(nextValue) || DEFAULT_MAX_MINUTES);
      if (inlineValue == null) index += 1;
      continue;
    }

    if (flag === "--poll-ms" && nextValue) {
      options.pollMs = Math.max(100, Number(nextValue) || DEFAULT_POLL_MS);
      if (inlineValue == null) index += 1;
      continue;
    }

    if (flag === "--move-timeout-ms" && nextValue) {
      options.moveTimeoutMs = Math.max(2_000, Number(nextValue) || DEFAULT_MOVE_TIMEOUT_MS);
      if (inlineValue == null) index += 1;
      continue;
    }

    if (flag === "--silent") {
      options.silent = true;
      continue;
    }
  }

  return options;
}

function log(message, { silent = false } = {}) {
  if (!silent) {
    process.stdout.write(`${message}\n`);
  }
}

function positionKey(position) {
  return `${Number(position?.x) || 0},${Number(position?.y) || 0},${Number(position?.z) || 0}`;
}

function clonePosition(position) {
  if (!position) return null;

  return {
    x: Math.trunc(Number(position.x) || 0),
    y: Math.trunc(Number(position.y) || 0),
    z: Math.trunc(Number(position.z) || 0),
  };
}

function samePosition(left, right) {
  return Boolean(left && right
    && Number(left.x) === Number(right.x)
    && Number(left.y) === Number(right.y)
    && Number(left.z) === Number(right.z));
}

function chebyshevDistance(from, to) {
  if (!from || !to || Number(from.z) !== Number(to.z)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    Math.abs(Number(from.x) - Number(to.x)),
    Math.abs(Number(from.y) - Number(to.y)),
  );
}

function sanitizeNameMatch(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isFloorChangeDefinition(definition) {
  if (!definition || typeof definition !== "object") return false;

  const properties = definition.properties || {};
  const name = String(properties.name || definition.name || "").trim();
  if (properties.floorchange) {
    return true;
  }

  return FLOOR_CHANGE_NAME_PATTERN.test(name);
}

function buildVisibleFloorExpression() {
  return [
    "(() => {",
    "  const game = window.gameClient;",
    "  const world = game?.world;",
    "  const player = game?.player;",
    "  const defs = game?.itemDefinitionsByCid || game?.itemDefinitions || {};",
    "  const pos = player?.__position;",
    "  const unsafeNamePattern = /\\b(?:hole|pitfall|trapdoor|stairs|ladder)\\b/i;",
    "  if (!game || !world || !player || !pos) {",
    "    return { ok: false, reason: 'game not ready' };",
    "  }",
    "  const tiles = [];",
    "  const seen = new Set();",
    "  for (const chunk of Array.isArray(world?.chunks) ? world.chunks : []) {",
    "    const floorTiles = typeof chunk?.getFloorTiles === 'function' ? chunk.getFloorTiles(pos.z) : [];",
    "    for (const tile of floorTiles || []) {",
    "      const tilePos = tile?.getPosition?.() || tile?.__position || tile?.position || null;",
    "      if (!tilePos) continue;",
    "      const key = String(tilePos.x) + ',' + String(tilePos.y) + ',' + String(tilePos.z);",
    "      if (seen.has(key)) continue;",
    "      seen.add(key);",
    "      const tileDef = defs[tile.id] || null;",
    "      const tileName = String(tileDef?.properties?.name || tileDef?.name || '');",
    "      const tileUnsafe = Boolean(tileDef?.properties?.floorchange) || unsafeNamePattern.test(tileName);",
    "      const itemEntries = Array.isArray(tile?.items)",
    "        ? tile.items",
    "        : (tile?.items && typeof tile.items.values === 'function' ? Array.from(tile.items.values()) : []);",
    "      const itemSummaries = itemEntries.filter(Boolean).map((item) => {",
    "        const itemId = Number(item?.id);",
    "        const itemDef = defs[itemId] || null;",
    "        const itemName = String(itemDef?.properties?.name || itemDef?.name || '');",
    "        const itemUnsafe = Boolean(itemDef?.properties?.floorchange) || unsafeNamePattern.test(itemName);",
    "        return {",
    "          id: Number.isFinite(itemId) ? itemId : null,",
    "          name: itemName || item?.constructor?.name || '',",
    "          floorchange: itemDef?.properties?.floorchange || null,",
    "          unsafe: itemUnsafe,",
    "        };",
    "      });",
    "      tiles.push({",
    "        x: Number(tilePos.x),",
    "        y: Number(tilePos.y),",
    "        z: Number(tilePos.z),",
    "        tileId: Number(tile?.id) || null,",
    "        tileName,",
    "        tileFloorchange: tileDef?.properties?.floorchange || null,",
    "        unsafe: tileUnsafe || itemSummaries.some((item) => item.unsafe),",
    "        walkable: typeof tile?.isWalkable === 'function' ? tile.isWalkable() : false,",
    "        occupied: typeof tile?.isOccupied === 'function' ? tile.isOccupied() : false,",
    "        cost: typeof tile?.getCost === 'function' ? tile.getCost() : null,",
    "        friction: typeof tile?.getFriction === 'function' ? tile.getFriction() : null,",
    "        items: itemSummaries,",
    "      });",
    "    }",
    "  }",
    "  return {",
    "    ok: true,",
    "    playerPosition: { x: Number(pos.x), y: Number(pos.y), z: Number(pos.z) },",
    "    tiles,",
    "  };",
    "})()",
  ].join("\n");
}

function buildClearTargetExpression() {
  return [
    "(() => {",
    "  const game = window.gameClient;",
    "  const world = game?.world;",
    "  const player = game?.player;",
    "  if (!game || !world || !player) return { ok: false, reason: 'game not ready' };",
    "  if (!player.__target) return { ok: true, cleared: false };",
    "  if (typeof world.targetMonster === 'function') {",
    "    world.targetMonster(new Set());",
    "    return { ok: true, cleared: true, mode: 'targetMonster' };",
    "  }",
    "  if ('__target' in player) {",
    "    player.__target = null;",
    "    return { ok: true, cleared: true, mode: '__target' };",
    "  }",
    "  return { ok: false, reason: 'clear unavailable' };",
    "})()",
  ].join("\n");
}

function discoverTiles(scan, discovered, unsafeTiles) {
  let added = 0;

  for (const tile of scan.tiles || []) {
    const key = positionKey(tile);
    const normalizedTile = {
      x: Math.trunc(Number(tile.x) || 0),
      y: Math.trunc(Number(tile.y) || 0),
      z: Math.trunc(Number(tile.z) || 0),
      tileId: Number(tile.tileId) || null,
      tileName: String(tile.tileName || "").trim(),
      tileFloorchange: tile.tileFloorchange || null,
      unsafe: tile.unsafe === true,
      walkable: tile.walkable === true,
      occupied: tile.occupied === true,
      cost: Number.isFinite(Number(tile.cost)) ? Number(tile.cost) : null,
      friction: Number.isFinite(Number(tile.friction)) ? Number(tile.friction) : null,
      items: Array.isArray(tile.items) ? tile.items : [],
    };

    if (normalizedTile.unsafe) {
      unsafeTiles.set(key, normalizedTile);
      discovered.delete(key);
      continue;
    }

    if (!normalizedTile.walkable || normalizedTile.z !== scan.playerPosition.z) {
      continue;
    }

    if (!discovered.has(key)) {
      added += 1;
    }

    discovered.set(key, normalizedTile);
  }

  return added;
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeIntentKind(value = "") {
  const key = normalizeText(value).toLowerCase();
  if (key === "npc" || key === "npc-open" || key === "travel") return "npc-action";
  if (key === "trade") return "shop";
  if (key === "corpse" || key === "loot") return "corpse-pause";
  if (key === "shovel") return "shovel-hole";
  if (key === "tool") return "use-item";
  return key;
}

function inferIntentPosition(raw = {}, fallbackPosition = null) {
  return clonePosition(
    raw.position
    || raw.targetPosition
    || raw.sourcePosition
    || raw.corpsePosition
    || raw.playerPosition
    || fallbackPosition,
  );
}

function normalizeRecorderIntentHint(raw = {}, fallbackPosition = null) {
  if (!raw || typeof raw !== "object") return null;
  const kind = normalizeIntentKind(raw.kind || raw.type || raw.action || "");
  if (!kind) return null;

  const position = inferIntentPosition(raw, fallbackPosition);
  const normalized = {
    kind,
    reason: normalizeText(raw.reason || raw.message || ""),
    confidence: normalizeText(raw.confidence || "inferred") || "inferred",
  };
  if (position) normalized.position = position;

  for (const key of ["npcName", "keyword", "shopKeyword", "city", "destination", "tool", "itemName", "tileName", "progressionAction"]) {
    const text = normalizeText(raw[key]);
    if (text) normalized[key] = text;
  }

  return normalized;
}

function getRecorderIntentKey(intent = {}) {
  return [
    intent.kind || "",
    positionKey(intent.position || {}),
    normalizeText(intent.npcName || "").toLowerCase(),
    normalizeText(intent.keyword || intent.shopKeyword || intent.city || intent.destination || intent.tool || intent.itemName || intent.tileName || "").toLowerCase(),
  ].join("|");
}

export function mergeRecorderIntentHints(existing = [], next = []) {
  const merged = [];
  const seen = new Set();
  for (const intent of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(next) ? next : [])]) {
    const normalized = normalizeRecorderIntentHint(intent);
    if (!normalized) continue;
    const key = getRecorderIntentKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }
  return merged;
}

function collectOpenContainers(snapshot = {}) {
  return [
    ...(Array.isArray(snapshot?.openContainers) ? snapshot.openContainers : []),
    ...(Array.isArray(snapshot?.containers) ? snapshot.containers : []),
    ...(Array.isArray(snapshot?.inventory?.openContainers) ? snapshot.inventory.openContainers : []),
    ...(Array.isArray(snapshot?.loot?.openContainers) ? snapshot.loot.openContainers : []),
  ];
}

function hasBankingText(value = "") {
  return /\b(?:bank|balance|deposit|withdraw|transfer)\b/i.test(value);
}

function hasTravelText(value = "") {
  return /\b(?:travel|sail|passage|city|town|temple|destination|yes)\b/i.test(value);
}

function classifyFloorIntent(tile = {}) {
  const text = [
    tile.tileName,
    tile.name,
    tile.tileFloorchange,
    ...(Array.isArray(tile.items) ? tile.items.map((item) => `${item?.name || ""} ${item?.floorchange || ""}`) : []),
  ].join(" ");

  if (/\b(?:rope spot|hole|pit|pitfall)\b/i.test(text)) {
    return { kind: "rope", tool: "rope" };
  }
  if (/\b(?:shovel|loose stone pile|sand hole|mound)\b/i.test(text)) {
    return { kind: "shovel-hole", tool: "shovel" };
  }
  if (/\bladder\b/i.test(text)) {
    return { kind: "ladder" };
  }
  if (/\bup\b/i.test(text)) {
    return { kind: "stairs-up" };
  }
  if (/\bdown\b/i.test(text)) {
    return { kind: "stairs-down" };
  }
  if (/\bstairs?\b/i.test(text)) {
    return { kind: "stairs-down" };
  }
  return null;
}

export function buildRecorderIntentHintsFromSnapshot(snapshot = {}, scan = null) {
  const playerPosition = clonePosition(snapshot?.playerPosition || scan?.playerPosition);
  const hints = [];
  const add = (hint) => {
    const normalized = normalizeRecorderIntentHint(hint, playerPosition);
    if (normalized) hints.push(normalized);
  };

  const dialogue = snapshot?.dialogue && typeof snapshot.dialogue === "object" ? snapshot.dialogue : null;
  if (dialogue?.open || dialogue?.npcName || Array.isArray(dialogue?.options)) {
    const npcName = normalizeText(dialogue.npcName);
    const optionText = [
      dialogue.prompt,
      ...(Array.isArray(dialogue.options) ? dialogue.options.map((option) => option?.text || option?.label || option) : []),
      ...(Array.isArray(dialogue.messages) ? dialogue.messages.map((message) => message?.text || message) : []),
    ].join(" ");
    if (hasBankingText(optionText)) {
      add({ kind: "bank", npcName, reason: "bank dialogue visible", confidence: "inferred" });
    } else if (dialogue.travelState?.open || hasTravelText(optionText)) {
      add({ kind: "npc-action", npcName, progressionAction: "travel", reason: "travel dialogue visible", confidence: "inferred" });
    } else {
      add({ kind: "npc-action", npcName, progressionAction: "open-dialogue", reason: "npc dialogue visible", confidence: "inferred" });
    }
  }

  const trade = snapshot?.trade || snapshot?.shop || snapshot?.npcTrade;
  if (trade?.open || trade?.visible || trade?.npcName || trade?.shopName) {
    add({
      kind: "shop",
      npcName: normalizeText(trade.npcName || trade.shopName),
      shopKeyword: normalizeText(trade.keyword || trade.shopKeyword || "trade"),
      reason: "shop or trade window visible",
      confidence: "inferred",
    });
  }

  const visibleNpcs = [
    ...(Array.isArray(snapshot?.visibleNpcs) ? snapshot.visibleNpcs : []),
    ...(Array.isArray(snapshot?.npcs) ? snapshot.npcs : []),
  ];
  for (const npc of visibleNpcs) {
    const npcPosition = clonePosition(npc?.position);
    if (!npcPosition || !playerPosition || chebyshevDistance(npcPosition, playerPosition) > 2) continue;
    add({
      kind: "npc-action",
      position: npcPosition,
      npcName: normalizeText(npc?.name),
      progressionAction: "open-dialogue",
      reason: "nearby npc while recording",
      confidence: "low",
    });
  }

  for (const container of collectOpenContainers(snapshot)) {
    const name = normalizeText(container?.name || container?.label || container?.title);
    if (!/\b(?:dead|corpse|remains|slain|body|carcass|cadaver)\b/i.test(name)) continue;
    add({
      kind: "corpse-pause",
      position: inferIntentPosition(container, playerPosition),
      itemName: name,
      reason: "corpse container open while recording",
      confidence: "inferred",
    });
  }

  for (const corpse of Array.isArray(snapshot?.lootableCorpses) ? snapshot.lootableCorpses : []) {
    add({
      kind: "corpse-pause",
      position: corpse.position,
      itemName: normalizeText(corpse.name),
      reason: "lootable corpse visible while recording",
      confidence: "low",
    });
  }

  const floorTiles = [
    ...(Array.isArray(scan?.tiles) ? scan.tiles.filter((tile) => tile?.unsafe) : []),
    ...(Array.isArray(scan?.unsafeTiles) ? scan.unsafeTiles : []),
    ...(Array.isArray(snapshot?.tiles) ? snapshot.tiles.filter((tile) => tile?.unsafe) : []),
  ];
  for (const tile of floorTiles) {
    const floorIntent = classifyFloorIntent(tile);
    if (!floorIntent) continue;
    add({
      ...floorIntent,
      position: tile,
      tileName: normalizeText(tile.tileName || tile.name),
      reason: "floor-change or tool tile visible while recording",
      confidence: "inferred",
    });
  }

  return mergeRecorderIntentHints([], hints);
}

export function attachRecorderIntentHintsToWaypoints(waypoints = [], hints = [], { maxDistance = 2 } = {}) {
  const normalizedWaypoints = (Array.isArray(waypoints) ? waypoints : [])
    .map((waypoint) => ({ ...waypoint }));
  const normalizedHints = mergeRecorderIntentHints([], hints);
  if (!normalizedWaypoints.length || !normalizedHints.length) {
    return normalizedWaypoints;
  }

  for (const hint of normalizedHints) {
    if (!hint.position) continue;
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    normalizedWaypoints.forEach((waypoint, index) => {
      const distance = chebyshevDistance(waypoint, hint.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex < 0 || bestDistance > maxDistance) continue;

    const waypoint = normalizedWaypoints[bestIndex];
    const existing = Array.isArray(waypoint.recorderIntents) ? waypoint.recorderIntents : [];
    waypoint.recorderIntents = mergeRecorderIntentHints(existing, [{
      ...hint,
      waypointDistance: bestDistance,
    }]);
  }

  return normalizedWaypoints;
}

function getStepDirection(from, to) {
  return {
    dx: Math.sign(Number(to?.x) - Number(from?.x)),
    dy: Math.sign(Number(to?.y) - Number(from?.y)),
    dz: Math.sign(Number(to?.z) - Number(from?.z)),
  };
}

function sameDirection(left, right) {
  return Boolean(left && right
    && left.dx === right.dx
    && left.dy === right.dy
    && left.dz === right.dz);
}

export function buildRouteWaypoints(pathPositions, recordStep = DEFAULT_ROUTE_SPACING) {
  const uniquePositions = [];

  for (const position of pathPositions) {
    if (!position) continue;

    const cloned = clonePosition(position);
    const previous = uniquePositions[uniquePositions.length - 1] || null;

    if (samePosition(previous, cloned)) {
      continue;
    }

    uniquePositions.push(cloned);
  }

  if (uniquePositions.length > 2 && samePosition(uniquePositions[0], uniquePositions[uniquePositions.length - 1])) {
    uniquePositions.pop();
  }

  if (uniquePositions.length <= 2) {
    return uniquePositions.map((position, index) => ({
      x: position.x,
      y: position.y,
      z: position.z,
      type: "walk",
      label: formatGeneratedWaypointLabel(index),
    }));
  }

  const spacedPositions = [uniquePositions[0]];
  let pathDistanceSinceKeep = 0;

  for (let index = 1; index < uniquePositions.length - 1; index += 1) {
    const current = uniquePositions[index];
    const previous = uniquePositions[index - 1];
    const segmentDistance = chebyshevDistance(previous, current);
    if (Number.isFinite(segmentDistance)) {
      pathDistanceSinceKeep += segmentDistance;
    }

    if (pathDistanceSinceKeep >= Math.max(1, Math.trunc(Number(recordStep) || 1))) {
      spacedPositions.push(current);
      pathDistanceSinceKeep = 0;
    }
  }

  const lastPosition = uniquePositions[uniquePositions.length - 1];
  if (!samePosition(spacedPositions[spacedPositions.length - 1], lastPosition)) {
    spacedPositions.push(lastPosition);
  }

  const compactedPositions = [];
  for (const position of spacedPositions) {
    if (samePosition(compactedPositions[compactedPositions.length - 1], position)) {
      continue;
    }
    compactedPositions.push(position);
  }

  return compactedPositions.map((position, index) => ({
    x: position.x,
    y: position.y,
    z: position.z,
    type: "walk",
    label: formatGeneratedWaypointLabel(index),
  }));
}

export function buildRecordedRouteDiagnostics({
  routeName = "",
  waypoints = [],
  unsafeTiles = new Map(),
  traversalAnalysis = null,
  completed = false,
  routeSaveReason = "",
  intentHints = [],
} = {}) {
  const normalizedUnsafeTiles = unsafeTiles instanceof Map
    ? [...unsafeTiles.values()]
    : Array.isArray(unsafeTiles)
      ? unsafeTiles
      : [];
  const warnings = [];
  const addWarning = (code, message, detail = {}) => {
    warnings.push({
      code,
      message,
      ...detail,
    });
  };

  if (!completed) {
    addWarning("recording-incomplete", routeSaveReason || "Recorder did not prove a complete operational loop.");
  }
  if (normalizedUnsafeTiles.length) {
    addWarning(
      "floor-change-tiles-excluded",
      `${normalizedUnsafeTiles.length} visible floor-change or unsafe tile${normalizedUnsafeTiles.length === 1 ? "" : "s"} were excluded from the same-floor recording.`,
      {
        count: normalizedUnsafeTiles.length,
        positions: normalizedUnsafeTiles
          .slice(0, 12)
          .map((tile) => ({ x: tile.x, y: tile.y, z: tile.z, name: tile.tileName || "" })),
      },
    );
  }
  if (traversalAnalysis?.unreachableGraphTileKeys?.length) {
    addWarning(
      "disconnected-visible-safe-tiles",
      `${traversalAnalysis.unreachableGraphTileKeys.length} visible safe tile${traversalAnalysis.unreachableGraphTileKeys.length === 1 ? "" : "s"} were disconnected from the operational route graph.`,
      {
        count: traversalAnalysis.unreachableGraphTileKeys.length,
        tileKeys: traversalAnalysis.unreachableGraphTileKeys.slice(0, 20),
      },
    );
  }
  if (traversalAnalysis?.missingOperationalTileKeys?.length) {
    addWarning(
      "missing-operational-tiles",
      `${traversalAnalysis.missingOperationalTileKeys.length} reachable operational tile${traversalAnalysis.missingOperationalTileKeys.length === 1 ? "" : "s"} were not covered by the traversal.`,
      {
        count: traversalAnalysis.missingOperationalTileKeys.length,
        tileKeys: traversalAnalysis.missingOperationalTileKeys.slice(0, 20),
      },
    );
  }
  const normalizedIntentHints = mergeRecorderIntentHints([], intentHints);
  if (normalizedIntentHints.length) {
    const kinds = Array.from(new Set(normalizedIntentHints.map((intent) => intent.kind))).sort();
    addWarning(
      "recorder-intent-hints",
      `${normalizedIntentHints.length} structured recorder intent hint${normalizedIntentHints.length === 1 ? "" : "s"} were attached to the route knowledge.`,
      {
        count: normalizedIntentHints.length,
        kinds,
      },
    );
  }

  const routeConfig = {
    cavebotName: routeName || "recorded-route",
    autowalkEnabled: true,
    autowalkLoop: true,
    waypoints,
  };
  const validation = validateRouteConfig(routeConfig, {
    sourceName: routeName || "recorded-route",
    rawConfig: routeConfig,
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    routeName,
    waypointCount: waypoints.length,
    completed,
    routeSaveReason,
    warnings,
    intentHints: normalizedIntentHints,
    validation,
  };
}

function getStableEdgeKey(left, right) {
  const leftKey = positionKey(left);
  const rightKey = positionKey(right);
  return leftKey < rightKey ? `${leftKey}|${rightKey}` : `${rightKey}|${leftKey}`;
}

export function computeTerminalLeafKeys(discovered, startPosition) {
  const leaves = new Set();
  const startKey = positionKey(startPosition);

  for (const tile of discovered.values()) {
    const key = positionKey(tile);
    if (key === startKey) {
      continue;
    }

    const degree = getAdjacentSafeTiles(tile, discovered).length;
    if (degree <= 1) {
      leaves.add(key);
    }
  }

  return leaves;
}

export function buildOperationalGraph(startPosition, discovered, excludedKeys = new Set()) {
  const graph = new Map();

  for (const [key, tile] of discovered.entries()) {
    if (excludedKeys.has(key)) {
      continue;
    }

    graph.set(key, tile);
  }

  const startKey = positionKey(startPosition);
  if (!graph.has(startKey) && discovered.has(startKey)) {
    graph.set(startKey, discovered.get(startKey));
  }

  return graph;
}

export function collectReachableTileKeys(startPosition, graph) {
  const startKey = positionKey(startPosition);
  if (!graph.has(startKey)) {
    return new Set();
  }

  const reachable = new Set([startKey]);
  const queue = [startKey];

  while (queue.length > 0) {
    const currentKey = queue.shift();
    const currentTile = graph.get(currentKey);
    if (!currentTile) continue;

    for (const neighbor of getAdjacentSafeTiles(currentTile, graph)) {
      const neighborKey = positionKey(neighbor);
      if (reachable.has(neighborKey)) {
        continue;
      }

      reachable.add(neighborKey);
      queue.push(neighborKey);
    }
  }

  return reachable;
}

export function analyzeOperationalTraversal(startPosition, discovered, excludedKeys = new Set()) {
  const graph = buildOperationalGraph(startPosition, discovered, excludedKeys);
  const traversal = buildOperationalTraversal(startPosition, discovered, excludedKeys);
  const reachableTileKeys = collectReachableTileKeys(startPosition, graph);
  const traversalTileKeys = new Set(traversal.map((position) => positionKey(position)));
  const graphTileKeys = new Set(graph.keys());
  const missingOperationalTileKeys = [...reachableTileKeys].filter((key) => !traversalTileKeys.has(key)).sort();
  const unreachableGraphTileKeys = [...graphTileKeys].filter((key) => !reachableTileKeys.has(key)).sort();

  return {
    graph,
    traversal,
    reachableTileKeys,
    traversalTileKeys,
    missingOperationalTileKeys,
    unreachableGraphTileKeys,
  };
}

export function buildOperationalTraversal(startPosition, discovered, excludedKeys = new Set()) {
  const graph = buildOperationalGraph(startPosition, discovered, excludedKeys);
  const startKey = positionKey(startPosition);

  const startTile = graph.get(startKey);
  if (!startTile) {
    return [clonePosition(startPosition)];
  }

  const traversal = [clonePosition(startTile)];
  const visitedEdges = new Set();

  function walk(node) {
    const neighbors = getAdjacentSafeTiles(node, graph).sort((left, right) => (
      getFrontierScore(right, graph) - getFrontierScore(left, graph)
      || left.y - right.y
      || left.x - right.x
    ));

    for (const neighbor of neighbors) {
      const edgeKey = getStableEdgeKey(node, neighbor);
      if (visitedEdges.has(edgeKey)) {
        continue;
      }

      visitedEdges.add(edgeKey);
      traversal.push(clonePosition(neighbor));
      walk(neighbor);
      traversal.push(clonePosition(node));
    }
  }

  walk(startTile);
  return traversal;
}

function routePathToKnowledgePath(routePath = "") {
  return String(routePath || "").replace(/\.json$/i, ".knowledge.json");
}

function buildKnowledgePayload({
  characterName,
  profileKey,
  routeName,
  routePath,
  knowledgePath,
  floor,
  startPosition,
  currentPosition,
  saveStatus,
  completed,
  interruptedBy = null,
  routeSaved = false,
  routeSaveReason = "",
  discovered,
  unsafeTiles,
  terminalLeafKeys,
  pathPositions,
  operationalTraversal,
  waypoints,
  traversalAnalysis,
  diagnostics,
  recorderIntentHints = [],
}) {
  return {
    characterName,
    profileKey,
    routeName,
    routePath,
    knowledgePath,
    floor,
    startPosition,
    currentPosition,
    generatedAt: new Date().toISOString(),
    saveStatus,
    completed,
    interruptedBy,
    routeSaved,
    routeSaveReason,
    discoveredSafeTileCount: discovered.size,
    unsafeTileCount: unsafeTiles.size,
    prunedTerminalLeafTileCount: terminalLeafKeys.size,
    reachableOperationalTileCount: traversalAnalysis.reachableTileKeys.size,
    traversalTileCount: traversalAnalysis.traversalTileKeys.size,
    missingOperationalTileKeys: traversalAnalysis.missingOperationalTileKeys,
    disconnectedVisibleSafeTileCount: traversalAnalysis.unreachableGraphTileKeys.length,
    unreachableGraphTileKeys: traversalAnalysis.unreachableGraphTileKeys,
    waypointCount: waypoints.length,
    diagnostics,
    recorderIntentHints: mergeRecorderIntentHints([], recorderIntentHints),
    discoveredSafeTiles: [...discovered.values()].sort((left, right) => (
      left.z - right.z || left.y - right.y || left.x - right.x
    )),
    unsafeTiles: [...unsafeTiles.values()].sort((left, right) => (
      left.z - right.z || left.y - right.y || left.x - right.x
    )),
    prunedTerminalLeafTiles: [...terminalLeafKeys].sort(),
    rawExplorationTrace: pathPositions.map((position) => clonePosition(position)).filter(Boolean),
    operationalTraversal,
    waypoints,
  };
}

async function saveKnowledgePayload(knowledgePath, payload) {
  if (!knowledgePath) {
    return;
  }

  await fs.writeFile(knowledgePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

function suggestNextRouteName(currentName, existingNames) {
  const fallbackBase = "Larvas";
  const trimmed = String(currentName || "").trim();
  const match = trimmed.match(/^(.*?)(?:\s+(\d+))?$/);
  const base = String(match?.[1] || fallbackBase).trim() || fallbackBase;
  const initialNumber = match?.[2] ? Number(match[2]) + 1 : 1;
  let candidateNumber = Number.isFinite(initialNumber) ? initialNumber : 1;

  while (existingNames.has(`${base} ${candidateNumber}`.toLowerCase())) {
    candidateNumber += 1;
  }

  return `${base} ${candidateNumber}`;
}

function getAdjacentSafeTiles(currentPosition, discovered) {
  const adjacent = [];

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (dx === 0 && dy === 0) continue;

      const next = {
        x: currentPosition.x + dx,
        y: currentPosition.y + dy,
        z: currentPosition.z,
      };
      const nextKey = positionKey(next);
      if (!discovered.has(nextKey)) {
        continue;
      }

      if (dx !== 0 && dy !== 0) {
        const horizontalKey = `${currentPosition.x + dx},${currentPosition.y},${currentPosition.z}`;
        const verticalKey = `${currentPosition.x},${currentPosition.y + dy},${currentPosition.z}`;
        if (!discovered.has(horizontalKey) || !discovered.has(verticalKey)) {
          continue;
        }
      }

      adjacent.push(discovered.get(nextKey));
    }
  }

  return adjacent;
}

function getFrontierScore(tile, discovered) {
  let score = 0;

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      if (dx === 0 && dy === 0) continue;
      const neighborKey = `${tile.x + dx},${tile.y + dy},${tile.z}`;
      if (!discovered.has(neighborKey)) {
        score += 1;
      }
    }
  }

  return score;
}

function buildDistanceTree(startPosition, graph, blockedKeys = new Set()) {
  const startKey = positionKey(startPosition);
  if (!graph.has(startKey)) {
    return {
      distance: new Map(),
      previous: new Map(),
    };
  }

  const distance = new Map([[startKey, 0]]);
  const previous = new Map([[startKey, null]]);
  const queue = [startKey];

  while (queue.length > 0) {
    const currentKey = queue.shift();
    const currentTile = graph.get(currentKey);
    if (!currentTile) continue;

    const neighbors = getAdjacentSafeTiles(currentTile, graph).sort((left, right) => (
      left.y - right.y || left.x - right.x
    ));

    for (const neighbor of neighbors) {
      const neighborKey = positionKey(neighbor);
      if (blockedKeys.has(neighborKey)) {
        continue;
      }

      if (distance.has(neighborKey)) {
        continue;
      }

      distance.set(neighborKey, (distance.get(currentKey) || 0) + 1);
      previous.set(neighborKey, currentKey);
      queue.push(neighborKey);
    }
  }

  return { distance, previous };
}

function reconstructPath(goalKey, previous, graph) {
  if (!previous.has(goalKey)) {
    return null;
  }

  const keys = [];
  let currentKey = goalKey;
  while (currentKey != null) {
    keys.push(currentKey);
    currentKey = previous.get(currentKey) ?? null;
  }

  keys.reverse();
  return keys
    .map((key) => graph.get(key))
    .filter(Boolean)
    .map((tile) => clonePosition(tile));
}

function pickExplorationPlan({
  currentPosition,
  discovered,
  visited,
  failedTargets,
}) {
  const blockedKeys = new Set(
    [...failedTargets.entries()]
      .filter(([, count]) => count >= 4)
      .map(([key]) => key),
  );
  const { distance, previous } = buildDistanceTree(currentPosition, discovered, blockedKeys);
  let best = null;

  for (const tile of discovered.values()) {
    const key = positionKey(tile);
    if (visited.has(key)) {
      continue;
    }

    if (!distance.has(key)) {
      continue;
    }

    const path = reconstructPath(key, previous, discovered);
    if (!path || path.length === 0) {
      continue;
    }

    const frontierScore = getFrontierScore(tile, discovered);
    const candidate = {
      tile,
      path,
      distance: distance.get(key) || 0,
      frontierScore,
      priority: frontierScore > 0 ? 0 : 1,
    };

    if (!best) {
      best = candidate;
      continue;
    }

    const better = candidate.priority < best.priority
      || (candidate.priority === best.priority && candidate.distance < best.distance)
      || (candidate.priority === best.priority && candidate.distance === best.distance && candidate.frontierScore > best.frontierScore)
      || (candidate.priority === best.priority && candidate.distance === best.distance && candidate.frontierScore === best.frontierScore
        && (candidate.tile.y < best.tile.y || (candidate.tile.y === best.tile.y && candidate.tile.x < best.tile.x)));

    if (better) {
      best = candidate;
    }
  }

  return best;
}

async function waitForMovement({
  bot,
  target,
  startPosition,
  startFloor,
  pathPositions,
  visited,
  discovered,
  unsafeTiles,
  pollMs,
  moveTimeoutMs,
  silent,
}) {
  const startedAt = Date.now();
  let lastPosition = clonePosition(startPosition);
  let lastProgressAt = Date.now();

  while (Date.now() - startedAt < moveTimeoutMs) {
    const snapshot = await bot.refresh({ emitSnapshot: false });
    const scan = await bot.cdp.evaluate(buildVisibleFloorExpression());

    if (!scan?.ok) {
      await sleep(pollMs);
      continue;
    }

    discoverTiles(scan, discovered, unsafeTiles);

    const currentPosition = clonePosition(snapshot.playerPosition || scan.playerPosition);
    if (!currentPosition) {
      await sleep(pollMs);
      continue;
    }

    if (currentPosition.z !== startFloor) {
      return {
        ok: false,
        reason: "floor-change",
        currentPosition,
      };
    }

    const currentKey = positionKey(currentPosition);
    if (!samePosition(currentPosition, lastPosition)) {
      visited.add(currentKey);
      pathPositions.push(currentPosition);
      lastPosition = currentPosition;
      lastProgressAt = Date.now();
      log(`Step ${pathPositions.length}: ${currentPosition.x},${currentPosition.y},${currentPosition.z}`, { silent });
    }

    if (samePosition(currentPosition, target)) {
      return {
        ok: true,
        reached: true,
        currentPosition,
      };
    }

    if ((snapshot.isMoving || snapshot.pathfinderAutoWalking) === false && Date.now() - lastProgressAt > 4_000) {
      return {
        ok: false,
        reason: "stalled",
        currentPosition,
      };
    }

    await sleep(pollMs);
  }

  return {
    ok: false,
    reason: "timeout",
    currentPosition: lastPosition,
  };
}

async function walkSafePath({
  bot,
  destination,
  currentPosition,
  startFloor,
  pathPositions,
  visited,
  discovered,
  unsafeTiles,
  pollMs,
  moveTimeoutMs,
  silent,
}) {
  if (samePosition(currentPosition, destination)) {
    return {
      ok: true,
      reached: true,
      currentPosition: clonePosition(currentPosition),
      steps: 0,
    };
  }

  const { previous } = buildDistanceTree(currentPosition, discovered);
  const destinationKey = positionKey(destination);
  const path = reconstructPath(destinationKey, previous, discovered);

  if (!path || path.length < 2) {
    return {
      ok: false,
      reason: "no-safe-path",
      currentPosition: clonePosition(currentPosition),
      steps: 0,
    };
  }

  let lastPosition = clonePosition(currentPosition);

  for (let index = 1; index < path.length; index += 1) {
    const nextTarget = path[index];
    await bot.cdp.evaluate(buildClearTargetExpression()).catch(() => {});

    const walkResult = await bot.walk(nextTarget);
    if (!walkResult?.ok) {
      return {
        ok: false,
        reason: walkResult?.reason || "walk-failed",
        currentPosition: lastPosition,
        failedTarget: clonePosition(nextTarget),
        steps: index - 1,
      };
    }

    const moveResult = await waitForMovement({
      bot,
      target: nextTarget,
      startPosition: lastPosition,
      startFloor,
      pathPositions,
      visited,
      discovered,
      unsafeTiles,
      pollMs,
      moveTimeoutMs,
      silent,
    });

    const postScan = await bot.cdp.evaluate(buildVisibleFloorExpression()).catch(() => null);
    if (postScan?.ok) {
      discoverTiles(postScan, discovered, unsafeTiles);
    }

    if (!moveResult.ok) {
      return {
        ...moveResult,
        failedTarget: clonePosition(nextTarget),
        steps: index - 1,
      };
    }

    lastPosition = clonePosition(moveResult.currentPosition || nextTarget);
    visited.add(positionKey(lastPosition));
  }

  return {
    ok: true,
    reached: true,
    currentPosition: lastPosition,
    steps: path.length - 1,
  };
}

async function main() {
  const options = parseArgs();
  const profileKey = buildCharacterKey(options.characterName);
  const existingConfig = await loadConfig({ profileKey }) || {};
  const pages = await discoverGamePages(existingConfig.port || 9224, existingConfig.pageUrlPrefix || "https://minibia.com/play");
  const page = pages.find((candidate) => sanitizeNameMatch(candidate.characterName) === sanitizeNameMatch(options.characterName));

  if (!page) {
    throw new Error(`Character "${options.characterName}" was not found on the live browser session.`);
  }

  const existingProfiles = await listRouteProfiles();
  const existingProfileNames = new Set(existingProfiles.map((profile) => String(profile.name || "").trim().toLowerCase()).filter(Boolean));
  const routeName = String(options.routeName || "").trim()
    || suggestNextRouteName(existingConfig.cavebotName, existingProfileNames);
  const startPosition = clonePosition(page.playerPosition);
  const routeDescription = describeRouteProfile(routeName);
  const knowledgePath = routePathToKnowledgePath(routeDescription.path);

  if (!startPosition) {
    throw new Error(`Character "${options.characterName}" has no readable player position.`);
  }

  log(`Attaching to ${page.characterName} at ${startPosition.x},${startPosition.y},${startPosition.z}`, options);
  log(`Recording new same-floor route as "${routeName}"`, options);

  const bot = new MinibiaTargetBot({
    ...existingConfig,
    autowalkEnabled: false,
    routeRecording: false,
    dryRun: false,
  });
  let interruptedBy = null;
  const onInterrupt = (signal) => {
    if (!interruptedBy) {
      interruptedBy = signal;
      log(`Received ${signal}; stopping after the current safe step and saving knowledge.`, options);
    }
  };
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onInterrupt);

  try {
    await bot.attachToPage(page);
    await bot.cdp.evaluate(buildClearTargetExpression()).catch(() => {});

    const initialSnapshot = await bot.refresh({ emitSnapshot: false });
    const initialScan = await bot.cdp.evaluate(buildVisibleFloorExpression());

    if (!initialScan?.ok) {
      throw new Error(initialScan?.reason || "Unable to inspect the visible floor tiles.");
    }

    const startFloor = Number(initialSnapshot.playerPosition?.z ?? initialScan.playerPosition?.z);
    const discovered = new Map();
    const unsafeTiles = new Map();
    const visited = new Set();
    const failedTargets = new Map();
    const pathPositions = [clonePosition(initialSnapshot.playerPosition || initialScan.playerPosition)];
    let recorderIntentHints = mergeRecorderIntentHints(
      [],
      buildRecorderIntentHintsFromSnapshot(initialSnapshot, initialScan),
    );
    let stagnantCycles = 0;
    discoverTiles(initialScan, discovered, unsafeTiles);

    visited.add(positionKey(startPosition));

    log(`Initial visible safe tiles: ${discovered.size}`, options);
    if (unsafeTiles.size > 0) {
      log(`Unsafe floor-change tiles ignored: ${unsafeTiles.size}`, options);
    }

    const stopAt = Date.now() + options.maxMinutes * 60_000;
    let loopCount = 0;

    while (Date.now() < stopAt && !interruptedBy) {
      loopCount += 1;
      const currentPosition = clonePosition(bot.lastSnapshot?.playerPosition || pathPositions[pathPositions.length - 1] || startPosition);
      const plan = pickExplorationPlan({
        currentPosition,
        discovered,
        visited,
        failedTargets,
      });

      if (!plan) {
        stagnantCycles += 1;
        log(`No reachable unexplored safe tiles remain (${discovered.size} known, cycle ${stagnantCycles}).`, options);
        if (stagnantCycles >= 3) {
          break;
        }

        const scan = await bot.cdp.evaluate(buildVisibleFloorExpression());
        if (scan?.ok) {
          const added = discoverTiles(scan, discovered, unsafeTiles);
          recorderIntentHints = mergeRecorderIntentHints(
            recorderIntentHints,
            buildRecorderIntentHintsFromSnapshot(bot.lastSnapshot || {}, scan),
          );
          if (added > 0) {
            stagnantCycles = 0;
            log(`Discovered ${added} additional safe tiles while idle.`, options);
          }
        }

        await sleep(options.pollMs);
        continue;
      }

      stagnantCycles = 0;
      const nextTarget = plan.path[1] || plan.tile;
      const targetKey = positionKey(nextTarget);
      const planKey = positionKey(plan.tile);
      log(`Move ${loopCount}: toward ${planKey} via ${targetKey}`, options);

      await bot.cdp.evaluate(buildClearTargetExpression()).catch(() => {});
      const walkResult = await bot.walk(nextTarget);
      if (!walkResult?.ok) {
        failedTargets.set(targetKey, (failedTargets.get(targetKey) || 0) + 1);
        log(`Walk command failed for ${targetKey}: ${walkResult?.reason || "unknown error"}`, options);
        await sleep(options.pollMs);
        continue;
      }

      const moveResult = await waitForMovement({
        bot,
        target: nextTarget,
        startPosition: currentPosition,
        startFloor,
        pathPositions,
        visited,
        discovered,
        unsafeTiles,
        pollMs: options.pollMs,
        moveTimeoutMs: options.moveTimeoutMs,
        silent: options.silent,
      });

      const postScan = await bot.cdp.evaluate(buildVisibleFloorExpression()).catch(() => null);
      if (postScan?.ok) {
        const added = discoverTiles(postScan, discovered, unsafeTiles);
        recorderIntentHints = mergeRecorderIntentHints(
          recorderIntentHints,
          buildRecorderIntentHintsFromSnapshot(bot.lastSnapshot || {}, postScan),
        );
        if (added > 0) {
          log(`Discovered ${added} new safe tiles after reaching ${targetKey}`, options);
        }
      }

      if (!moveResult.ok) {
        failedTargets.set(targetKey, (failedTargets.get(targetKey) || 0) + 1);
        log(`Movement to ${targetKey} ended with ${moveResult.reason}`, options);

        if (moveResult.reason === "floor-change") {
          throw new Error(`Unexpected floor change detected at ${positionKey(moveResult.currentPosition)}. Recording aborted.`);
        }

        continue;
      }

      visited.add(targetKey);
      failedTargets.delete(targetKey);
    }

    const endSnapshot = await bot.refresh({ emitSnapshot: false });
    recorderIntentHints = mergeRecorderIntentHints(
      recorderIntentHints,
      buildRecorderIntentHintsFromSnapshot(endSnapshot, null),
    );
    let finalPosition = clonePosition(endSnapshot.playerPosition);

    if (!interruptedBy && !samePosition(finalPosition, startPosition)) {
      log(`Returning to start ${positionKey(startPosition)} via discovered safe graph`, options);
      const returnResult = await walkSafePath({
        bot,
        destination: startPosition,
        currentPosition: finalPosition,
        startFloor,
        pathPositions,
        visited,
        discovered,
        unsafeTiles,
        pollMs: options.pollMs,
        moveTimeoutMs: Math.max(options.moveTimeoutMs, 20_000),
        silent: options.silent,
      });

      if (!returnResult.ok) {
        log(`Return to start ended with ${returnResult.reason}`, options);
      } else {
        finalPosition = clonePosition(returnResult.currentPosition);
        recorderIntentHints = mergeRecorderIntentHints(
          recorderIntentHints,
          buildRecorderIntentHintsFromSnapshot(bot.lastSnapshot || {}, null),
        );
      }
    }

    const terminalLeafKeys = computeTerminalLeafKeys(discovered, startPosition);
    const traversalAnalysis = analyzeOperationalTraversal(startPosition, discovered, terminalLeafKeys);
    const operationalTraversal = traversalAnalysis.traversal.filter((position) => Number(position?.z) === startFloor);
    const waypoints = attachRecorderIntentHintsToWaypoints(
      buildRouteWaypoints(
        operationalTraversal,
        DEFAULT_ROUTE_SPACING,
      ),
      recorderIntentHints,
    );

    const completed = !interruptedBy
      && traversalAnalysis.missingOperationalTileKeys.length === 0
      && waypoints.length >= 2;
    const saveStatus = interruptedBy
      ? "interrupted"
      : completed
        ? "complete"
        : "incomplete";
    const routeSaveReason = completed
      ? traversalAnalysis.unreachableGraphTileKeys.length > 0
        ? "complete reachable traversal saved; disconnected visible tiles kept only in knowledge"
        : "complete traversal saved"
      : interruptedBy
        ? `interrupted by ${interruptedBy}`
        : traversalAnalysis.missingOperationalTileKeys.length > 0
          ? "missing reachable operational tiles"
          : waypoints.length < 2
            ? "fewer than two operational waypoints"
            : "recorder ended before a complete loop was proven";
    const diagnostics = buildRecordedRouteDiagnostics({
      routeName,
      waypoints,
      unsafeTiles,
      traversalAnalysis,
      completed,
      routeSaveReason,
      intentHints: recorderIntentHints,
    });

    const knowledgePayload = buildKnowledgePayload({
      characterName: options.characterName,
      profileKey,
      routeName,
      routePath: routeDescription.path,
      knowledgePath,
      floor: startFloor,
      startPosition,
      currentPosition: finalPosition,
      saveStatus,
      completed,
      interruptedBy,
      routeSaved: completed,
      routeSaveReason,
      discovered,
      unsafeTiles,
      terminalLeafKeys,
      pathPositions,
      operationalTraversal,
      waypoints,
      traversalAnalysis,
      diagnostics,
      recorderIntentHints,
    });
    await saveKnowledgePayload(knowledgePath, knowledgePayload);

    if (!completed) {
      throw new Error(`Recording did not produce a complete operational loop: ${routeSaveReason}. Knowledge saved to ${knowledgePath}`);
    }

    const nextConfig = {
      ...existingConfig,
      cavebotName: routeName,
      autowalkEnabled: true,
      autowalkLoop: true,
      routeRecording: false,
      routeRecordStep: DEFAULT_ROUTE_SPACING,
      waypoints,
    };

    const saveResult = await saveConfig(nextConfig, {
      profileKey,
      previousCavebotName: null,
    });

    const savedKnowledgePayload = {
      ...knowledgePayload,
      routeSaved: true,
      routeSaveReason,
      routePath: saveResult.routeProfile?.path || routeDescription.path,
      knowledgePath,
    };
    await saveKnowledgePayload(knowledgePath, savedKnowledgePayload);

    log(`Saved ${waypoints.length} waypoints to ${saveResult.routeProfile?.path || routeName}`, options);
    if (knowledgePath) {
      log(`Saved route knowledge to ${knowledgePath}`, options);
    }
      log(`Discovered ${discovered.size} safe tiles and ignored ${unsafeTiles.size} unsafe tiles on floor ${startFloor}`, options);
    if (diagnostics.validation?.summary?.warningCount || diagnostics.warnings.length) {
      log(`Recorder diagnostics: ${diagnostics.validation?.summary?.warningCount || 0} validation warning(s), ${diagnostics.warnings.length} recorder warning(s)`, options);
    }
    log(`Profile ${profileKey} now points to "${routeName}"`, options);
  } finally {
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onInterrupt);
    await bot.detach().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
