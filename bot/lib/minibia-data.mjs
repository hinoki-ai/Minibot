/*
 * Vendored Minibia data loader and refresh helper.
 * Runtime code should consume checked-in official data through this file
 * rather than reaching out to live endpoints during bot execution.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MINIBIA_DOCUMENT_VERSION = 1;
export const MINIBIA_BASE_URL = "https://minibia.com";
export const MINIBIA_LIBRARY_SOURCE_PATH = "/api/library";
export const MINIBIA_SERVER_INFO_SOURCE_PATH = "/api/server-info";
export const MINIBIA_SERVER_STATUS_SOURCE_PATH = "/api/status";
export const MINIBIA_SNAPSHOT_RETENTION_COUNT = 1;
export const MINIBIA_LIBRARY_DATASETS = Object.freeze([
  "spells",
  "monsters",
  "npcs",
  "items",
  "runes",
  "achievements",
]);
export const MINIBIA_SUPPORTED_VOCATIONS = Object.freeze([
  "knight",
  "paladin",
  "sorcerer",
  "druid",
]);
export const MINIBIA_CURRENT_DOCUMENTS = Object.freeze([
  { key: "spells", fileName: "spells.json", valueKey: "items" },
  { key: "monsters", fileName: "monsters.json", valueKey: "items" },
  { key: "npcs", fileName: "npcs.json", valueKey: "items" },
  { key: "items", fileName: "items.json", valueKey: "items" },
  { key: "runes", fileName: "runes.json", valueKey: "items" },
  { key: "achievements", fileName: "achievements.json", valueKey: "items" },
  { key: "serverInfo", fileName: "server-info.json", valueKey: "data" },
  { key: "serverStatus", fileName: "server-status.json", valueKey: "data" },
  { key: "statusSchema", fileName: "status-schema.json", valueKey: null },
]);
export const MINIBIA_DATA_ROOT = fileURLToPath(new URL("../data/minibia", import.meta.url));

const CURRENT_DOCUMENT_BY_KEY = new Map(
  MINIBIA_CURRENT_DOCUMENTS.map((descriptor) => [descriptor.key, descriptor]),
);

function cloneValue(value) {
  if (value == null) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeGeneratedAt(generatedAt = new Date()) {
  const parsed = new Date(generatedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid generatedAt value: ${generatedAt}`);
  }
  return parsed.toISOString();
}

function compareStrings(left, right) {
  return String(left || "").localeCompare(String(right || ""), "en", {
    sensitivity: "base",
    numeric: true,
  });
}

function sortObjectKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeysDeep(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const normalized = {};
  for (const key of Object.keys(value).sort(compareStrings)) {
    normalized[key] = sortObjectKeysDeep(value[key]);
  }
  return normalized;
}

function normalizeVocations(vocations) {
  if (!Array.isArray(vocations)) {
    return [];
  }

  const input = new Set(
    vocations
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const normalized = [];
  for (const vocation of MINIBIA_SUPPORTED_VOCATIONS) {
    if (input.has(vocation)) {
      normalized.push(vocation);
      input.delete(vocation);
    }
  }

  const extras = [...input].sort(compareStrings);
  normalized.push(...extras);
  return normalized;
}

function normalizeNamedTradeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => sortObjectKeysDeep(cloneValue(entry)))
    .sort((left, right) => (
      compareStrings(left?.name, right?.name)
      || Number(left?.price || 0) - Number(right?.price || 0)
    ));
}

function normalizeMonsterLoot(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => sortObjectKeysDeep(cloneValue(entry)))
    .sort((left, right) => (
      Number(right?.probability || 0) - Number(left?.probability || 0)
      || compareStrings(left?.name, right?.name)
    ));
}

function normalizeMonsterAttacks(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => sortObjectKeysDeep(cloneValue(entry)))
    .sort((left, right) => (
      compareStrings(left?.name, right?.name)
      || Number(left?.min || 0) - Number(right?.min || 0)
      || Number(left?.max || 0) - Number(right?.max || 0)
    ));
}

function normalizeSpell(entry) {
  const normalized = sortObjectKeysDeep(cloneValue(entry));
  normalized.vocations = normalizeVocations(entry?.vocations);
  return normalized;
}

function normalizeMonster(entry) {
  const normalized = sortObjectKeysDeep(cloneValue(entry));
  normalized.attacks = normalizeMonsterAttacks(entry?.attacks);
  normalized.loot = normalizeMonsterLoot(entry?.loot);
  return normalized;
}

function normalizeNpc(entry) {
  const normalized = sortObjectKeysDeep(cloneValue(entry));
  normalized.keywords = Array.isArray(entry?.keywords)
    ? [...entry.keywords].map((keyword) => String(keyword || "")).sort(compareStrings)
    : [];
  normalized.sells = normalizeNamedTradeEntries(entry?.sells);
  normalized.buys = normalizeNamedTradeEntries(entry?.buys);
  return normalized;
}

function normalizeItem(entry) {
  return sortObjectKeysDeep(cloneValue(entry));
}

function normalizeRune(entry) {
  const normalized = sortObjectKeysDeep(cloneValue(entry));
  if (entry?.vocations == null) {
    normalized.vocations = null;
  } else {
    normalized.vocations = normalizeVocations(entry.vocations);
  }
  return normalized;
}

function normalizeAchievement(entry) {
  return sortObjectKeysDeep(cloneValue(entry));
}

function normalizeServerInfo(serverInfo = {}) {
  return sortObjectKeysDeep(cloneValue(serverInfo));
}

function normalizeServerStatus(serverStatus = {}) {
  return sortObjectKeysDeep(cloneValue(serverStatus));
}

function buildCollectionDocument(kind, items, generatedAt, baseUrl, sourcePath) {
  return {
    schemaVersion: MINIBIA_DOCUMENT_VERSION,
    kind,
    generatedAt,
    source: {
      baseUrl,
      path: sourcePath,
    },
    count: items.length,
    items,
  };
}

function buildValueDocument(kind, data, generatedAt, baseUrl, sourcePath) {
  return {
    schemaVersion: MINIBIA_DOCUMENT_VERSION,
    kind,
    generatedAt,
    source: {
      baseUrl,
      path: sourcePath,
    },
    data,
  };
}

function describeField(name, value) {
  if (Array.isArray(value)) {
    return {
      name,
      type: "array",
      itemType: value.length > 0 ? describeValueType(value[0]) : "unknown",
      example: cloneValue(value[0] ?? null),
    };
  }

  if (value && typeof value === "object") {
    return {
      name,
      type: "object",
      fields: Object.keys(value)
        .sort(compareStrings)
        .map((key) => describeField(key, value[key])),
    };
  }

  return {
    name,
    type: describeValueType(value),
    example: cloneValue(value),
  };
}

function describeValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function buildStatusSchemaDocument({ generatedAt, baseUrl, serverInfo, serverStatus }) {
  const normalizedServerInfo = normalizeServerInfo(serverInfo);
  const normalizedServerStatus = normalizeServerStatus(serverStatus);

  return {
    schemaVersion: MINIBIA_DOCUMENT_VERSION,
    kind: "minibia-status-schema",
    generatedAt,
    sources: [
      {
        name: "serverStatus",
        baseUrl,
        path: MINIBIA_SERVER_STATUS_SOURCE_PATH,
      },
      {
        name: "serverInfo",
        baseUrl,
        path: MINIBIA_SERVER_INFO_SOURCE_PATH,
      },
    ],
    serverStatus: {
      fields: Object.keys(normalizedServerStatus)
        .sort(compareStrings)
        .map((key) => describeField(key, normalizedServerStatus[key])),
    },
    serverInfo: {
      fields: Object.keys(normalizedServerInfo)
        .sort(compareStrings)
        .map((key) => describeField(key, normalizedServerInfo[key])),
    },
  };
}

function buildVocationPack(vocation, spells, generatedAt, baseUrl) {
  const vocationSpells = spells
    .filter((spell) => Array.isArray(spell?.vocations) && spell.vocations.includes(vocation))
    .sort((left, right) => (
      Number(left?.level || 0) - Number(right?.level || 0)
      || Number(left?.mana || 0) - Number(right?.mana || 0)
      || compareStrings(left?.name, right?.name)
    ));

  return {
    schemaVersion: MINIBIA_DOCUMENT_VERSION,
    kind: "minibia-vocation-pack",
    generatedAt,
    vocation,
    source: {
      baseUrl,
      path: MINIBIA_LIBRARY_SOURCE_PATH,
    },
    spellCount: vocationSpells.length,
    spells: vocationSpells.map((spell) => ({
      id: spell.id ?? null,
      name: spell.name ?? "",
      words: spell.words ?? "",
      level: spell.level ?? 0,
      mana: spell.mana ?? 0,
      aggressive: spell.aggressive === true,
      area: spell.area === true,
    })),
    attackSpells: vocationSpells
      .filter((spell) => spell.aggressive === true)
      .map((spell) => spell.words ?? ""),
    supportSpells: vocationSpells
      .filter((spell) => spell.aggressive !== true)
      .map((spell) => spell.words ?? ""),
  };
}

export function resolveMinibiaDataPaths(dataRoot = MINIBIA_DATA_ROOT) {
  const root = path.resolve(String(dataRoot || MINIBIA_DATA_ROOT));
  const currentDir = path.join(root, "current");
  const vocationsDir = path.join(root, "vocations");
  const snapshotsDir = path.join(root, "snapshots");

  return {
    root,
    currentDir,
    vocationsDir,
    snapshotsDir,
    current: Object.fromEntries(
      MINIBIA_CURRENT_DOCUMENTS.map((descriptor) => [
        descriptor.key,
        path.join(currentDir, descriptor.fileName),
      ]),
    ),
    vocations: Object.fromEntries(
      MINIBIA_SUPPORTED_VOCATIONS.map((vocation) => [
        vocation,
        path.join(vocationsDir, `${vocation}.json`),
      ]),
    ),
  };
}

export function normalizeLibraryDocuments(rawLibrary, {
  generatedAt = new Date(),
  baseUrl = MINIBIA_BASE_URL,
} = {}) {
  const normalizedGeneratedAt = normalizeGeneratedAt(generatedAt);
  if (!rawLibrary || typeof rawLibrary !== "object" || Array.isArray(rawLibrary)) {
    throw new TypeError("Library payload must be an object.");
  }

  for (const dataset of MINIBIA_LIBRARY_DATASETS) {
    if (!Array.isArray(rawLibrary[dataset])) {
      throw new TypeError(`Library payload is missing array dataset "${dataset}".`);
    }
  }

  const spells = rawLibrary.spells
    .map((entry) => normalizeSpell(entry))
    .sort((left, right) => (
      Number(left?.level || 0) - Number(right?.level || 0)
      || Number(left?.mana || 0) - Number(right?.mana || 0)
      || compareStrings(left?.name, right?.name)
    ));
  const monsters = rawLibrary.monsters
    .map((entry) => normalizeMonster(entry))
    .sort((left, right) => compareStrings(left?.name, right?.name));
  const npcs = rawLibrary.npcs
    .map((entry) => normalizeNpc(entry))
    .sort((left, right) => compareStrings(left?.name, right?.name));
  const items = rawLibrary.items
    .map((entry) => normalizeItem(entry))
    .sort((left, right) => compareStrings(left?.name, right?.name));
  const runes = rawLibrary.runes
    .map((entry) => normalizeRune(entry))
    .sort((left, right) => (
      Number(left?.magicLevel || 0) - Number(right?.magicLevel || 0)
      || compareStrings(left?.name, right?.name)
    ));
  const achievements = rawLibrary.achievements
    .map((entry) => normalizeAchievement(entry))
    .sort((left, right) => (
      Number(left?.alpha === true) - Number(right?.alpha === true)
      || Number(left?.required || 0) - Number(right?.required || 0)
      || compareStrings(left?.name, right?.name)
    ));

  return {
    generatedAt: normalizedGeneratedAt,
    spells: buildCollectionDocument("minibia-spells", spells, normalizedGeneratedAt, baseUrl, MINIBIA_LIBRARY_SOURCE_PATH),
    monsters: buildCollectionDocument("minibia-monsters", monsters, normalizedGeneratedAt, baseUrl, MINIBIA_LIBRARY_SOURCE_PATH),
    npcs: buildCollectionDocument("minibia-npcs", npcs, normalizedGeneratedAt, baseUrl, MINIBIA_LIBRARY_SOURCE_PATH),
    items: buildCollectionDocument("minibia-items", items, normalizedGeneratedAt, baseUrl, MINIBIA_LIBRARY_SOURCE_PATH),
    runes: buildCollectionDocument("minibia-runes", runes, normalizedGeneratedAt, baseUrl, MINIBIA_LIBRARY_SOURCE_PATH),
    achievements: buildCollectionDocument("minibia-achievements", achievements, normalizedGeneratedAt, baseUrl, MINIBIA_LIBRARY_SOURCE_PATH),
  };
}

export function buildVocationPackDocuments(spellEntries, {
  generatedAt = new Date(),
  baseUrl = MINIBIA_BASE_URL,
} = {}) {
  const normalizedGeneratedAt = normalizeGeneratedAt(generatedAt);
  const spells = Array.isArray(spellEntries) ? spellEntries.map((entry) => normalizeSpell(entry)) : [];

  return Object.fromEntries(
    MINIBIA_SUPPORTED_VOCATIONS.map((vocation) => [
      vocation,
      buildVocationPack(vocation, spells, normalizedGeneratedAt, baseUrl),
    ]),
  );
}

function buildSnapshotDirectoryName(generatedAt) {
  return generatedAt
    .replace(/:/g, "-")
    .replace(/\./g, "-");
}

function isMinibiaSourceSnapshotDirectoryName(name) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(String(name || ""));
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function writeJsonFile(filePath, value) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function pruneMinibiaSourceSnapshots(snapshotsDir, {
  currentSnapshotDirName = "",
  retentionCount = MINIBIA_SNAPSHOT_RETENTION_COUNT,
} = {}) {
  const retentionLimit = Math.max(1, Math.trunc(Number(retentionCount) || MINIBIA_SNAPSHOT_RETENTION_COUNT));
  const entries = await fs.readdir(snapshotsDir, { withFileTypes: true }).catch(() => []);
  const snapshotNames = entries
    .filter((entry) => entry.isDirectory() && isMinibiaSourceSnapshotDirectoryName(entry.name))
    .map((entry) => entry.name)
    .sort(compareStrings)
    .reverse();

  const retainedNames = new Set();
  if (isMinibiaSourceSnapshotDirectoryName(currentSnapshotDirName)) {
    retainedNames.add(currentSnapshotDirName);
  }

  for (const snapshotName of snapshotNames) {
    if (retainedNames.size >= retentionLimit) {
      break;
    }
    retainedNames.add(snapshotName);
  }

  const prunedSnapshotDirs = [];
  for (const snapshotName of snapshotNames) {
    if (retainedNames.has(snapshotName)) {
      continue;
    }
    const snapshotPath = path.join(snapshotsDir, snapshotName);
    await fs.rm(snapshotPath, { recursive: true, force: true });
    prunedSnapshotDirs.push(snapshotPath);
  }

  return prunedSnapshotDirs.sort(compareStrings);
}

export async function writeMinibiaDataBundle({
  dataRoot = MINIBIA_DATA_ROOT,
  generatedAt = new Date(),
  baseUrl = MINIBIA_BASE_URL,
  rawLibrary,
  rawServerInfo,
  rawServerStatus,
  snapshotRetentionCount = MINIBIA_SNAPSHOT_RETENTION_COUNT,
} = {}) {
  const normalizedGeneratedAt = normalizeGeneratedAt(generatedAt);
  const paths = resolveMinibiaDataPaths(dataRoot);

  const libraryDocuments = normalizeLibraryDocuments(rawLibrary, {
    generatedAt: normalizedGeneratedAt,
    baseUrl,
  });
  const serverInfoDocument = buildValueDocument(
    "minibia-server-info",
    normalizeServerInfo(rawServerInfo),
    normalizedGeneratedAt,
    baseUrl,
    MINIBIA_SERVER_INFO_SOURCE_PATH,
  );
  const serverStatusDocument = buildValueDocument(
    "minibia-server-status",
    normalizeServerStatus(rawServerStatus),
    normalizedGeneratedAt,
    baseUrl,
    MINIBIA_SERVER_STATUS_SOURCE_PATH,
  );
  const statusSchemaDocument = buildStatusSchemaDocument({
    generatedAt: normalizedGeneratedAt,
    baseUrl,
    serverInfo: serverInfoDocument.data,
    serverStatus: serverStatusDocument.data,
  });
  const vocationDocuments = buildVocationPackDocuments(libraryDocuments.spells.items, {
    generatedAt: normalizedGeneratedAt,
    baseUrl,
  });

  const currentDocuments = {
    spells: libraryDocuments.spells,
    monsters: libraryDocuments.monsters,
    npcs: libraryDocuments.npcs,
    items: libraryDocuments.items,
    runes: libraryDocuments.runes,
    achievements: libraryDocuments.achievements,
    serverInfo: serverInfoDocument,
    serverStatus: serverStatusDocument,
    statusSchema: statusSchemaDocument,
  };

  await ensureDirectory(paths.currentDir);
  await ensureDirectory(paths.vocationsDir);
  await ensureDirectory(paths.snapshotsDir);

  for (const descriptor of MINIBIA_CURRENT_DOCUMENTS) {
    await writeJsonFile(paths.current[descriptor.key], currentDocuments[descriptor.key]);
  }

  for (const vocation of MINIBIA_SUPPORTED_VOCATIONS) {
    await writeJsonFile(paths.vocations[vocation], vocationDocuments[vocation]);
  }

  const snapshotDirName = buildSnapshotDirectoryName(normalizedGeneratedAt);
  const snapshotDir = path.join(paths.snapshotsDir, snapshotDirName);
  await ensureDirectory(snapshotDir);
  await writeJsonFile(path.join(snapshotDir, "library.json"), sortObjectKeysDeep(cloneValue(rawLibrary)));
  await writeJsonFile(path.join(snapshotDir, "server-info.json"), sortObjectKeysDeep(cloneValue(rawServerInfo)));
  await writeJsonFile(path.join(snapshotDir, "status.json"), sortObjectKeysDeep(cloneValue(rawServerStatus)));
  await writeJsonFile(path.join(snapshotDir, "metadata.json"), {
    schemaVersion: MINIBIA_DOCUMENT_VERSION,
    kind: "minibia-source-snapshot",
    generatedAt: normalizedGeneratedAt,
    baseUrl,
    sources: [
      MINIBIA_LIBRARY_SOURCE_PATH,
      MINIBIA_SERVER_INFO_SOURCE_PATH,
      MINIBIA_SERVER_STATUS_SOURCE_PATH,
    ],
    counts: {
      spells: currentDocuments.spells.count,
      monsters: currentDocuments.monsters.count,
      npcs: currentDocuments.npcs.count,
      items: currentDocuments.items.count,
      runes: currentDocuments.runes.count,
      achievements: currentDocuments.achievements.count,
    },
  });
  const prunedSnapshotDirs = await pruneMinibiaSourceSnapshots(paths.snapshotsDir, {
    currentSnapshotDirName: snapshotDirName,
    retentionCount: snapshotRetentionCount,
  });

  return {
    dataRoot: paths.root,
    generatedAt: normalizedGeneratedAt,
    currentDocuments,
    vocationDocuments,
    snapshotDir,
    prunedSnapshotDirs,
  };
}

export async function loadMinibiaDocument(key, { dataRoot = MINIBIA_DATA_ROOT } = {}) {
  const descriptor = CURRENT_DOCUMENT_BY_KEY.get(key);
  if (!descriptor) {
    throw new Error(`Unknown Minibia document "${key}".`);
  }

  const paths = resolveMinibiaDataPaths(dataRoot);
  return readJsonFile(paths.current[key]);
}

export async function loadMinibiaVocationPack(vocation, { dataRoot = MINIBIA_DATA_ROOT } = {}) {
  const normalizedVocation = String(vocation || "").trim().toLowerCase();
  if (!MINIBIA_SUPPORTED_VOCATIONS.includes(normalizedVocation)) {
    throw new Error(`Unknown Minibia vocation "${vocation}".`);
  }

  const paths = resolveMinibiaDataPaths(dataRoot);
  return readJsonFile(paths.vocations[normalizedVocation]);
}

export async function loadMinibiaData({ dataRoot = MINIBIA_DATA_ROOT } = {}) {
  const documents = {};
  for (const descriptor of MINIBIA_CURRENT_DOCUMENTS) {
    documents[descriptor.key] = await loadMinibiaDocument(descriptor.key, { dataRoot });
  }

  const vocations = {};
  for (const vocation of MINIBIA_SUPPORTED_VOCATIONS) {
    vocations[vocation] = await loadMinibiaVocationPack(vocation, { dataRoot });
  }

  return {
    generatedAt: documents.spells.generatedAt,
    spells: documents.spells.items,
    monsters: documents.monsters.items,
    npcs: documents.npcs.items,
    items: documents.items.items,
    runes: documents.runes.items,
    achievements: documents.achievements.items,
    serverInfo: documents.serverInfo.data,
    serverStatus: documents.serverStatus.data,
    statusSchema: documents.statusSchema,
    vocations,
    documents,
  };
}
