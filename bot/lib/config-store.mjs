/*
 * Persistence boundary for config, routes, claims, and route-spacing leases.
 * Keep filesystem schema changes, normalization, and storage ownership
 * centralized here instead of scattering them across runtime callers.
 */
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  DEFAULTS,
  normalizeOptions,
  serializeRouteWaypoint,
  serializeTileRule,
} from "./bot-core.mjs";
import { resolveRuntimeLayout } from "./runtime-layout.mjs";
import { validateRouteConfig } from "./route-validation.mjs";

export { validateRouteConfig };

const RUNTIME_LAYOUT = resolveRuntimeLayout({
  baseDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
});

export const CONFIG_DIR = RUNTIME_LAYOUT.configDir;
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
export const SESSION_STATE_PATH = path.join(CONFIG_DIR, "session-state.json");
export const LEGACY_CONFIG_PATHS = RUNTIME_LAYOUT.portable
  ? []
  : [
      path.join(RUNTIME_LAYOUT.homeDir, ".config", "minibia-bot", "config.json"),
    ];
export const CHARACTER_CONFIG_DIR = path.join(CONFIG_DIR, "characters");
export const CHARACTER_CLAIM_DIR = path.join(CONFIG_DIR, "claims");
export const CLAIM_STALE_MS = 15_000;
export const ACCOUNT_DIR = path.join(CONFIG_DIR, "accounts");
export const ROUTE_SPACING_DIR = path.join(CONFIG_DIR, "route-spacing");
export const ROUTE_SPACING_STALE_MS = 8_000;
export const PROFILE_DIR = RUNTIME_LAYOUT.routeProfileDir;
const SESSION_STATE_VERSION = 1;
const SESSION_STATE_MAX_SESSIONS = 32;
const SESSION_STATE_VIEW_MODES = new Set(["desk", "compact"]);
const INVALID_PROFILE_FILENAME_CHAR_PATTERN = /[<>:"/\\|?*\u0000-\u001f]/;
const INVALID_PROFILE_FILENAME_PATTERN = /[<>:"/\\|?*\u0000-\u001f]/g;
const WINDOWS_RESERVED_PROFILE_FILENAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const ACCOUNT_LOGIN_METHODS = new Set(["account-password", "google", "discord", "manual"]);
const ACCOUNT_RECONNECT_POLICIES = new Set(["preferred-character", "last-character", "manual"]);
const ACCOUNT_SECRET_STORAGE_MODES = new Set(["portable-file", "local-file", "none"]);
const ROUTE_PROFILE_LOCAL_ONLY_KEYS = new Set([
  "creatureLedger",
  "monsterArchive",
  "playerArchive",
  "npcArchive",
  "cavebotPaused",
  "stopAggroHold",
  "trainerPartnerName",
]);
const ROUTE_PROFILE_LEGACY_CHARACTER_KEYS = new Set([
  "trainerPartnerName",
]);
const ROUTE_PROFILE_METADATA_KEYS = new Set([
  "name",
  "cavebotName",
  "waypoints",
  "tileRules",
]);

function sanitizeProfileFileBase(name = DEFAULTS.cavebotName) {
  const trimmed = String(name || "").trim() || DEFAULTS.cavebotName;
  const safe = trimmed
    .replace(INVALID_PROFILE_FILENAME_PATTERN, "-")
    .replace(/\.+$/g, "")
    .trim();

  return safe || DEFAULTS.cavebotName;
}

function validateRouteProfileName(name = DEFAULTS.cavebotName) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return "Route name is required.";
  }

  if (INVALID_PROFILE_FILENAME_CHAR_PATTERN.test(trimmed)) {
    return "Route names cannot contain < > : \" / \\ | ? * or control characters.";
  }

  if (/[. ]$/.test(trimmed)) {
    return "Route names cannot end with a period or space.";
  }

  if (trimmed === "." || trimmed === "..") {
    return "Route names cannot be . or ..";
  }

  if (WINDOWS_RESERVED_PROFILE_FILENAME_PATTERN.test(trimmed)) {
    return "Route names cannot use reserved Windows device names like CON or LPT1.";
  }

  return null;
}

export function describeRouteProfile(name = DEFAULTS.cavebotName) {
  const routeName = String(name || "").trim() || DEFAULTS.cavebotName;
  const fileBase = sanitizeProfileFileBase(routeName);

  return {
    name: routeName,
    fileName: `${fileBase}.json`,
    path: path.join(PROFILE_DIR, `${fileBase}.json`),
  };
}

function profilePath(name) {
  return describeRouteProfile(name).path;
}

function characterConfigPath(profileKey) {
  return path.join(CHARACTER_CONFIG_DIR, `${profileKey}.json`);
}

function characterClaimPath(profileKey) {
  return path.join(CHARACTER_CLAIM_DIR, `${profileKey}.json`);
}

function accountPath(accountId) {
  return path.join(ACCOUNT_DIR, `${accountId}.json`);
}

function sanitizeRouteRuntimeKeyPart(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "route";
}

function routeSpacingMemberPath(routeKey, instanceId) {
  if (!String(routeKey || "").trim() || !String(instanceId || "").trim()) {
    return null;
  }

  const safeRouteKey = sanitizeRouteRuntimeKeyPart(routeKey);
  const safeInstanceId = sanitizeRouteRuntimeKeyPart(instanceId);
  return path.join(ROUTE_SPACING_DIR, safeRouteKey, `${safeInstanceId}.json`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function cloneConfigValue(value) {
  if (value == null) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeRouteSpacingPosition(position = null) {
  if (!position || typeof position !== "object") {
    return null;
  }

  const x = Number(position.x);
  const y = Number(position.y);
  const z = Number(position.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return {
    x: Math.trunc(x),
    y: Math.trunc(y),
    z: Math.trunc(z),
  };
}

function normalizeRouteSpacingIndex(value, totalWaypoints = 0) {
  const index = Number(value);
  if (!Number.isFinite(index)) {
    return null;
  }

  const bounded = Math.trunc(index);
  if (!Number.isInteger(totalWaypoints) || totalWaypoints <= 0) {
    return Math.max(0, bounded);
  }

  return Math.max(0, Math.min(bounded, totalWaypoints - 1));
}

function buildRouteSpacingSignature(options = {}) {
  const normalized = normalizeOptions(options);
  const signaturePayload = {
    cavebotName: normalized.cavebotName,
    autowalkLoop: normalized.autowalkLoop,
    waypoints: normalized.waypoints.map((waypoint, index) => ({
      index,
      x: waypoint.x,
      y: waypoint.y,
      z: waypoint.z,
      type: waypoint.type,
      radius: waypoint.radius ?? null,
      action: waypoint.action ?? null,
      targetIndex: waypoint.targetIndex ?? null,
    })),
  };

  return createHash("sha1")
    .update(JSON.stringify(signaturePayload))
    .digest("hex")
    .slice(0, 16);
}

export function describeRouteSpacingGroup(options = {}) {
  const normalized = normalizeOptions(options);
  const routeName = String(normalized.cavebotName || "").trim();
  if (!routeName || normalized.waypoints.length < 2) {
    return null;
  }

  const routeSignature = buildRouteSpacingSignature(normalized);
  const routeKey = `${sanitizeRouteRuntimeKeyPart(routeName)}-${routeSignature}`;
  const directory = path.join(ROUTE_SPACING_DIR, routeKey);

  return {
    routeKey,
    routeName,
    routeSignature,
    waypointCount: normalized.waypoints.length,
    directory,
  };
}

function buildRouteProfileSettingsPayload(config) {
  const normalized = normalizeOptions(config);
  const payload = cloneConfigValue(normalized);

  delete payload.cavebotName;
  delete payload.waypoints;
  delete payload.tileRules;

  for (const key of ROUTE_PROFILE_LOCAL_ONLY_KEYS) {
    delete payload[key];
  }

  return payload;
}

function buildStoredCharacterConfig(config) {
  const stored = { ...config };
  stored.creatureLedger = config?.creatureLedger && typeof config.creatureLedger === "object"
    ? {
        monsters: Array.isArray(config.creatureLedger.monsters) ? [...config.creatureLedger.monsters] : [],
        players: Array.isArray(config.creatureLedger.players) ? [...config.creatureLedger.players] : [],
        npcs: Array.isArray(config.creatureLedger.npcs) ? [...config.creatureLedger.npcs] : [],
      }
    : {
        monsters: Array.isArray(config?.monsterArchive) ? [...config.monsterArchive] : [],
        players: Array.isArray(config?.playerArchive) ? [...config.playerArchive] : [],
        npcs: Array.isArray(config?.npcArchive) ? [...config.npcArchive] : [],
      };
  delete stored.monsterArchive;
  delete stored.playerArchive;
  delete stored.npcArchive;
  if (String(config?.cavebotName || "").trim()) {
    delete stored.waypoints;
    delete stored.tileRules;

    const routeSettings = buildRouteProfileSettingsPayload(config);
    for (const key of Object.keys(routeSettings)) {
      delete stored[key];
    }
  }
  return stored;
}

function buildRouteProfilePayload(config) {
  const normalized = normalizeOptions(config);
  const routeSettings = buildRouteProfileSettingsPayload(normalized);
  const tileRules = normalized.tileRules
    .map((rule, index) => serializeTileRule(rule, index))
    .filter(Boolean);

  const payload = {
    name: normalized.cavebotName,
    ...routeSettings,
    waypoints: normalized.waypoints
      .map((waypoint, index) => serializeRouteWaypoint(waypoint, index))
      .filter(Boolean),
  };

  if (tileRules.length) {
    payload.tileRules = tileRules;
  }

  return payload;
}

function routeNameFromFileName(fileName = "") {
  return String(fileName || "").replace(/\.json$/i, "");
}

function parseRouteProfileSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const settings = cloneConfigValue(payload);

  for (const key of ROUTE_PROFILE_METADATA_KEYS) {
    delete settings[key];
  }

  for (const key of ROUTE_PROFILE_LOCAL_ONLY_KEYS) {
    delete settings[key];
  }

  return settings;
}

function parseRouteProfileLegacyCharacterSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const settings = {};
  for (const key of ROUTE_PROFILE_LEGACY_CHARACTER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      settings[key] = cloneConfigValue(payload[key]);
    }
  }

  return settings;
}

function normalizeRouteProfilePayload(payload, fallbackName) {
  const routeName = String(payload?.name || payload?.cavebotName || fallbackName).trim() || fallbackName;
  const routeSettings = parseRouteProfileSettings(payload);
  const legacyCharacterSettings = parseRouteProfileLegacyCharacterSettings(payload);
  const normalized = normalizeOptions({
    ...routeSettings,
    cavebotName: routeName,
    waypoints: Array.isArray(payload?.waypoints) ? payload.waypoints : [],
    tileRules: Array.isArray(payload?.tileRules) ? payload.tileRules : [],
  });

  return {
    routeName,
    options: normalized,
    legacyCharacterSettings,
  };
}

function parseRouteProfileRaw(raw, fallbackName) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return normalizeRouteProfilePayload({}, fallbackName);
  }

  return normalizeRouteProfilePayload(JSON.parse(trimmed), fallbackName);
}

export async function loadRouteProfile(name = DEFAULTS.cavebotName) {
  if (!String(name || "").trim()) {
    return null;
  }

  const description = describeRouteProfile(name);
  const raw = await fs.readFile(description.path, "utf8");
  const rawPayload = JSON.parse(String(raw || "").trim() || "{}");
  const normalizedProfile = normalizeRouteProfilePayload(rawPayload, description.name);
  const legacyCharacterSettings = normalizedProfile.legacyCharacterSettings
    && Object.keys(normalizedProfile.legacyCharacterSettings).length
      ? normalizedProfile.legacyCharacterSettings
      : null;
  const validation = validateRouteConfig(normalizedProfile.options, {
    sourceName: normalizedProfile.routeName,
    sourcePath: description.path,
    rawConfig: rawPayload,
  });

  return {
    ...describeRouteProfile(normalizedProfile.routeName),
    exists: true,
    options: normalizedProfile.options,
    validation,
    ...(legacyCharacterSettings ? { legacyCharacterSettings } : {}),
  };
}

export async function listRouteProfiles() {
  await fs.mkdir(PROFILE_DIR, { recursive: true });

  const entries = await fs.readdir(PROFILE_DIR, { withFileTypes: true }).catch(() => []);
  const profiles = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(PROFILE_DIR, entry.name);

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const rawPayload = JSON.parse(String(raw || "").trim() || "{}");
      const normalizedProfile = normalizeRouteProfilePayload(rawPayload, routeNameFromFileName(entry.name));
      const stats = await fs.stat(filePath);
      const validation = validateRouteConfig(normalizedProfile.options, {
        sourceName: normalizedProfile.routeName,
        sourcePath: filePath,
        rawConfig: rawPayload,
      });

      profiles.push({
        name: normalizedProfile.routeName,
        fileName: entry.name,
        path: filePath,
        exists: true,
        waypointCount: normalizedProfile.options.waypoints.length,
        tileRuleCount: normalizedProfile.options.tileRules.length,
        validation,
        updatedAt: stats.mtimeMs,
      });
    } catch {
      const stats = await fs.stat(filePath).catch(() => null);
      profiles.push({
        name: routeNameFromFileName(entry.name),
        fileName: entry.name,
        path: filePath,
        exists: true,
        waypointCount: 0,
        tileRuleCount: 0,
        updatedAt: stats?.mtimeMs || 0,
      });
    }
  }

  return profiles.sort((left, right) => left.name.localeCompare(right.name, undefined, {
    sensitivity: "base",
    numeric: true,
  }));
}

export async function deleteRouteProfile(name = DEFAULTS.cavebotName) {
  const routeName = String(name || "").trim();
  if (!routeName) {
    return { deleted: false, routeProfile: null };
  }

  const description = describeRouteProfile(routeName);
  const existed = await fileExists(description.path);
  await fs.rm(description.path, { force: true }).catch(() => {});

  return {
    deleted: existed,
    routeProfile: {
      ...description,
      exists: false,
    },
  };
}

async function hydrateConfigWithRouteProfile(config) {
  const normalized = normalizeOptions(config);

  if (!normalized.cavebotName) {
    return normalized;
  }

  try {
    const routeProfile = await loadRouteProfile(normalized.cavebotName);
    const localOnlyState = {};
    for (const key of ROUTE_PROFILE_LOCAL_ONLY_KEYS) {
      localOnlyState[key] = cloneConfigValue(normalized[key]);
    }
    const legacyTrainerPartnerName = String(routeProfile?.legacyCharacterSettings?.trainerPartnerName || "").trim();
    if (!String(localOnlyState.trainerPartnerName || "").trim() && legacyTrainerPartnerName) {
      localOnlyState.trainerPartnerName = legacyTrainerPartnerName;
    }
    return normalizeOptions({
      ...normalized,
      ...(routeProfile?.options || {}),
      ...localOnlyState,
    });
  } catch {
    return normalized;
  }
}

async function readNormalizedConfig(configPath) {
  const raw = await fs.readFile(configPath, "utf8");
  return hydrateConfigWithRouteProfile(JSON.parse(raw));
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function serializeJsonFile(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function normalizeSessionStateText(value = "") {
  return String(value || "").trim();
}

function normalizeStoredSessionEntry(entry = {}) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const id = normalizeSessionStateText(entry.id);
  const profileKey = normalizeSessionStateText(entry.profileKey);
  const pageId = normalizeSessionStateText(entry.pageId);
  const characterName = normalizeSessionStateText(entry.characterName);
  const displayName = normalizeSessionStateText(entry.displayName);
  if (!id && !profileKey && !pageId && !characterName && !displayName) {
    return null;
  }

  const routeIndex = Math.max(0, Math.trunc(Number(entry.routeIndex) || 0));
  const overlayFocusValue = Number(entry.overlayFocusIndex);
  const overlayFocusIndex = Number.isFinite(overlayFocusValue)
    ? Math.max(0, Math.trunc(overlayFocusValue))
    : null;
  const hasConfig = entry.config && typeof entry.config === "object";

  return {
    id,
    profileKey,
    pageId,
    characterName,
    displayName,
    title: normalizeSessionStateText(entry.title),
    url: normalizeSessionStateText(entry.url),
    running: entry.running === true,
    routeIndex,
    routeComplete: entry.routeComplete === true,
    overlayFocusIndex,
    config: hasConfig ? normalizeOptions(entry.config) : null,
  };
}

export function normalizeSessionState(state = {}) {
  const source = state && typeof state === "object" ? state : {};
  const sessions = Array.isArray(source.sessions)
    ? source.sessions
      .map((entry) => normalizeStoredSessionEntry(entry))
      .filter(Boolean)
      .slice(0, SESSION_STATE_MAX_SESSIONS)
    : [];
  const updatedAt = Number(source.updatedAt);
  const activeViewportMode = SESSION_STATE_VIEW_MODES.has(String(source.activeViewportMode || ""))
    ? String(source.activeViewportMode)
    : "desk";

  return {
    version: SESSION_STATE_VERSION,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0
      ? Math.trunc(updatedAt)
      : Date.now(),
    activeSessionId: normalizeSessionStateText(source.activeSessionId),
    activeProfileKey: normalizeSessionStateText(source.activeProfileKey),
    activePageId: normalizeSessionStateText(source.activePageId),
    activeCharacterName: normalizeSessionStateText(source.activeCharacterName),
    activeViewportMode,
    alwaysOnTop: source.alwaysOnTop !== false,
    sessions,
  };
}

export async function loadSessionState() {
  try {
    const raw = await fs.readFile(SESSION_STATE_PATH, "utf8");
    return normalizeSessionState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveSessionState(state = {}) {
  const normalized = normalizeSessionState({
    ...state,
    updatedAt: Date.now(),
  });
  const serializedState = serializeJsonFile(normalized);

  await fs.mkdir(path.dirname(SESSION_STATE_PATH), { recursive: true });
  const changed = await writeTextFileIfChanged(SESSION_STATE_PATH, serializedState);
  return {
    path: SESSION_STATE_PATH,
    changed,
    state: normalized,
  };
}

async function writeTextFileIfChanged(filePath, contents) {
  try {
    const existingContents = await fs.readFile(filePath, "utf8");
    if (existingContents === contents) {
      return false;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(filePath, contents, "utf8");
  return true;
}

async function writeJsonFile(filePath, value, { exclusive = false } = {}) {
  const options = exclusive
    ? {
        encoding: "utf8",
        flag: "wx",
      }
    : "utf8";
  await fs.writeFile(filePath, serializeJsonFile(value), options);
}

async function tryWriteJsonFileExclusive(filePath, value) {
  try {
    await writeJsonFile(filePath, value, { exclusive: true });
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") {
      return false;
    }
    throw error;
  }
}

function isProcessAlive(pid) {
  const numericPid = Number(pid);

  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }

  try {
    process.kill(numericPid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function buildCharacterKey(value = "") {
  const slug = slugifyStorageKey(value);
  return slug || "client";
}

export function buildAccountKey(value = "") {
  const slug = slugifyStorageKey(value);
  return slug || "account";
}

function slugifyStorageKey(value = "") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug;
}

function normalizeAccountCharacters(value = []) {
  const entries = Array.isArray(value)
    ? value
    : String(value || "").split(/[\n,]+/g);
  const seen = new Set();
  const characters = [];

  for (const entry of entries) {
    const name = normalizeSessionStateText(entry);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) {
      continue;
    }
    seen.add(key);
    characters.push(name);
  }

  return characters;
}

function normalizeAccountLoginMethod(value = "") {
  const method = normalizeSessionStateText(value).toLowerCase();
  return ACCOUNT_LOGIN_METHODS.has(method) ? method : "account-password";
}

function normalizeAccountReconnectPolicy(value = "") {
  const policy = normalizeSessionStateText(value).toLowerCase();
  return ACCOUNT_RECONNECT_POLICIES.has(policy) ? policy : "preferred-character";
}

function getDefaultAccountSecretStorage(loginMethod = "account-password") {
  if (loginMethod === "manual") {
    return "none";
  }

  return RUNTIME_LAYOUT.portable ? "portable-file" : "local-file";
}

function normalizeAccountSecretStorage(value = "", loginMethod = "account-password") {
  if (loginMethod === "manual") {
    return "none";
  }

  const storage = normalizeSessionStateText(value).toLowerCase();
  return ACCOUNT_SECRET_STORAGE_MODES.has(storage)
    ? storage
    : getDefaultAccountSecretStorage(loginMethod);
}

export function normalizeAccountRecord(record = {}, { now = Date.now() } = {}) {
  const source = record && typeof record === "object" ? record : {};
  const loginMethod = normalizeAccountLoginMethod(source.loginMethod);
  const preferredCharacter = normalizeSessionStateText(source.preferredCharacter);
  const characters = normalizeAccountCharacters(source.characters ?? source.characterNames);
  if (
    preferredCharacter
    && !characters.some((entry) => entry.toLowerCase() === preferredCharacter.toLowerCase())
  ) {
    characters.unshift(preferredCharacter);
  }

  const idSeed = [
    normalizeSessionStateText(source.id || source.accountId),
    normalizeSessionStateText(source.label || source.name),
    normalizeSessionStateText(source.loginName || source.accountName || source.email || source.username),
    preferredCharacter,
  ].find(Boolean) || "";
  const id = buildAccountKey(idSeed);
  const createdAtValue = Number(source.createdAt);
  const updatedAtValue = Number(source.updatedAt);
  const createdAt = Number.isFinite(createdAtValue) && createdAtValue > 0
    ? Math.trunc(createdAtValue)
    : now;
  const updatedAt = Number.isFinite(updatedAtValue) && updatedAtValue > 0
    ? Math.trunc(updatedAtValue)
    : now;
  const label = normalizeSessionStateText(
    source.label
    || source.name
    || source.loginName
    || source.accountName
    || preferredCharacter
    || id,
  );
  const password = loginMethod === "manual"
    ? ""
    : normalizeSessionStateText(source.password || source.secret);

  return {
    id,
    label: label || id,
    loginMethod,
    loginName: normalizeSessionStateText(
      source.loginName
      || source.accountName
      || source.email
      || source.username,
    ),
    password,
    secretStorage: normalizeAccountSecretStorage(source.secretStorage, loginMethod),
    characters,
    preferredCharacter,
    reconnectPolicy: normalizeAccountReconnectPolicy(source.reconnectPolicy),
    notes: String(source.notes ?? "").trim(),
    createdAt,
    updatedAt: Math.max(createdAt, updatedAt),
  };
}

export function isClaimActive(claim) {
  if (!claim || typeof claim !== "object") {
    return false;
  }

  const updatedAt = Number(claim.updatedAt);
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > CLAIM_STALE_MS) {
    return false;
  }

  return isProcessAlive(claim.pid);
}

export function isRouteSpacingLeaseActive(lease) {
  if (!lease || typeof lease !== "object") {
    return false;
  }

  const updatedAt = Number(lease.updatedAt);
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > ROUTE_SPACING_STALE_MS) {
    return false;
  }

  if (!lease.running || !lease.autowalkEnabled || lease.routeResetActive) {
    return false;
  }

  return isProcessAlive(lease.pid);
}

export async function loadConfig({ profileKey = null } = {}) {
  if (profileKey) {
    try {
      return await readNormalizedConfig(characterConfigPath(profileKey));
    } catch {
      return null;
    }
  }

  try {
    return await readNormalizedConfig(CONFIG_PATH);
  } catch {
    for (const legacyPath of LEGACY_CONFIG_PATHS) {
      try {
        return await readNormalizedConfig(legacyPath);
      } catch {}
    }
    return normalizeOptions();
  }
}

export async function listCharacterConfigs() {
  await fs.mkdir(CHARACTER_CONFIG_DIR, { recursive: true });

  const entries = await fs.readdir(CHARACTER_CONFIG_DIR, { withFileTypes: true }).catch(() => []);
  const characters = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const profileKey = String(entry.name || "").replace(/\.json$/i, "");
    if (!profileKey) {
      continue;
    }

    const filePath = path.join(CHARACTER_CONFIG_DIR, entry.name);

    try {
      const options = await readNormalizedConfig(filePath);
      const stats = await fs.stat(filePath);
      characters.push({
        profileKey,
        fileName: entry.name,
        path: filePath,
        updatedAt: Number(stats?.mtimeMs) || 0,
        options,
      });
    } catch { }
  }

  return characters.sort((left, right) => (
    String(left.profileKey || "").localeCompare(String(right.profileKey || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
  ));
}

export async function loadAccount(accountId) {
  const requestedId = normalizeSessionStateText(accountId);
  if (!requestedId) {
    return null;
  }

  const resolvedId = buildAccountKey(requestedId);
  const raw = await fs.readFile(accountPath(resolvedId), "utf8");
  return normalizeAccountRecord(JSON.parse(raw));
}

export async function listAccounts() {
  await fs.mkdir(ACCOUNT_DIR, { recursive: true });

  const entries = await fs.readdir(ACCOUNT_DIR, { withFileTypes: true }).catch(() => []);
  const accounts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(ACCOUNT_DIR, entry.name);
    try {
      const raw = await readJsonFile(filePath);
      accounts.push(normalizeAccountRecord(raw));
    } catch {
      await fs.rm(filePath, { force: true }).catch(() => {});
    }
  }

  return accounts.sort((left, right) => (
    String(left.label || left.id || "").localeCompare(String(right.label || right.id || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
    || String(left.id || "").localeCompare(String(right.id || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
  ));
}

export async function saveAccount(account, { previousId = null } = {}) {
  const source = account && typeof account === "object" ? account : {};
  const requestedPreviousId = normalizeSessionStateText(previousId || source.previousId || source.accountId);
  const requestedSourceId = normalizeSessionStateText(source.id);
  const existingAccount = requestedPreviousId
    ? await loadAccount(requestedPreviousId).catch(() => null)
    : requestedSourceId
      ? await loadAccount(requestedSourceId).catch(() => null)
      : null;
  const nextAccount = normalizeAccountRecord({
    ...(existingAccount || {}),
    ...source,
    id: source.id || requestedPreviousId || source.label || source.loginName || source.preferredCharacter,
    createdAt: existingAccount?.createdAt,
    updatedAt: Date.now(),
  });
  const nextPath = accountPath(nextAccount.id);
  const previousAccountId = requestedPreviousId ? buildAccountKey(requestedPreviousId) : null;
  const previousPath = previousAccountId && previousAccountId !== nextAccount.id
    ? accountPath(previousAccountId)
    : null;
  const nextExists = await fileExists(nextPath);
  const previousExists = previousPath ? await fileExists(previousPath) : false;
  const action = previousPath && previousExists
    ? "renamed"
    : nextExists
      ? "updated"
      : "created";

  await fs.mkdir(ACCOUNT_DIR, { recursive: true });
  const changed = await writeTextFileIfChanged(nextPath, serializeJsonFile(nextAccount));

  if (previousPath && previousPath !== nextPath) {
    await fs.rm(previousPath, { force: true }).catch(() => {});
  }

  return {
    account: nextAccount,
    path: nextPath,
    changed,
    action,
    previousPath: previousPath && previousPath !== nextPath ? previousPath : null,
  };
}

export async function deleteAccount(accountId) {
  const requestedId = normalizeSessionStateText(accountId);
  if (!requestedId) {
    return {
      deleted: false,
      account: null,
    };
  }

  const resolvedId = buildAccountKey(requestedId);
  const targetPath = accountPath(resolvedId);
  const existed = await fileExists(targetPath);
  await fs.rm(targetPath, { force: true }).catch(() => {});

  return {
    deleted: existed,
    account: {
      id: resolvedId,
      path: targetPath,
    },
  };
}

export async function saveRouteProfile(config, { previousName = null } = {}) {
  const normalized = normalizeOptions(config);
  if (!normalized.cavebotName) {
    return { routeProfile: null };
  }

  const routeNameError = validateRouteProfileName(normalized.cavebotName);
  if (routeNameError) {
    throw new Error(routeNameError);
  }

  const nextProfile = describeRouteProfile(normalized.cavebotName);
  const previousProfile = previousName ? describeRouteProfile(previousName) : null;
  const nextExists = await fileExists(nextProfile.path);
  const action = previousProfile && previousProfile.path !== nextProfile.path
    ? "renamed"
    : nextExists
      ? "updated"
      : "created";
  const serializedPayload = serializeJsonFile(buildRouteProfilePayload(normalized));
  const validation = validateRouteConfig(normalized, {
    sourceName: normalized.cavebotName,
    sourcePath: nextProfile.path,
  });

  await fs.mkdir(PROFILE_DIR, { recursive: true });
  const changed = await writeTextFileIfChanged(nextProfile.path, serializedPayload);

  if (previousProfile && previousProfile.path !== nextProfile.path) {
    await fs.rm(previousProfile.path, { force: true }).catch(() => {});
  }

  return {
    routeProfile: {
      ...nextProfile,
      exists: true,
      action,
      changed,
      previousPath: previousProfile && previousProfile.path !== nextProfile.path
        ? previousProfile.path
        : null,
      validation,
    },
  };
}

export async function saveConfig(config, { profileKey = null, previousCavebotName = null } = {}) {
  const normalized = normalizeOptions(config);
  const targetPath = profileKey ? characterConfigPath(profileKey) : CONFIG_PATH;
  const storedConfig = buildStoredCharacterConfig(normalized);
  const serializedConfig = serializeJsonFile(storedConfig);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const configChanged = await writeTextFileIfChanged(targetPath, serializedConfig);

  const { routeProfile } = await saveRouteProfile(normalized, { previousName: previousCavebotName });

  return {
    configPath: targetPath,
    configChanged,
    routeProfile,
  };
}

export async function listCharacterClaims() {
  await fs.mkdir(CHARACTER_CLAIM_DIR, { recursive: true });

  const entries = await fs.readdir(CHARACTER_CLAIM_DIR, { withFileTypes: true }).catch(() => []);
  const claims = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const claimFile = path.join(CHARACTER_CLAIM_DIR, entry.name);

    try {
      const claim = await readJsonFile(claimFile);

      if (!isClaimActive(claim)) {
        await fs.rm(claimFile, { force: true });
        continue;
      }

      claims.push(claim);
    } catch {
      await fs.rm(claimFile, { force: true }).catch(() => {});
    }
  }

  return claims;
}

export async function listRouteSpacingLeases({ routeKey } = {}) {
  if (!String(routeKey || "").trim()) {
    return [];
  }

  const safeRouteKey = sanitizeRouteRuntimeKeyPart(routeKey);
  const groupDir = path.join(ROUTE_SPACING_DIR, safeRouteKey);
  await fs.mkdir(groupDir, { recursive: true });

  const entries = await fs.readdir(groupDir, { withFileTypes: true }).catch(() => []);
  const leases = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const leaseFile = path.join(groupDir, entry.name);
    try {
      const lease = await readJsonFile(leaseFile);
      if (!isRouteSpacingLeaseActive(lease)) {
        await fs.rm(leaseFile, { force: true }).catch(() => {});
        continue;
      }

      leases.push(lease);
    } catch {
      await fs.rm(leaseFile, { force: true }).catch(() => {});
    }
  }

  return leases.sort((left, right) => (
    (Number(left.startedAt) || 0) - (Number(right.startedAt) || 0)
    || String(left.instanceId || "").localeCompare(String(right.instanceId || ""))
  ));
}

export async function releaseRouteSpacingLease({ routeKey, instanceId }) {
  if (!routeKey || !instanceId) {
    return;
  }

  const leaseFile = routeSpacingMemberPath(routeKey, instanceId);
  if (!leaseFile) {
    return;
  }
  await fs.rm(leaseFile, { force: true }).catch(() => {});
}

export async function syncRouteSpacingLease({
  options,
  previousRouteKey = null,
  instanceId,
  characterName = "",
  title = "",
  routeIndex = 0,
  confirmedIndex = null,
  playerPosition = null,
  startedAt = null,
  active = true,
} = {}) {
  const routeGroup = describeRouteSpacingGroup(options);
  const routeKey = routeGroup?.routeKey || null;

  if (previousRouteKey && previousRouteKey !== routeKey) {
    await releaseRouteSpacingLease({
      routeKey: previousRouteKey,
      instanceId,
    });
  }

  if (!routeGroup || !instanceId || !active) {
    if (routeKey) {
      await releaseRouteSpacingLease({ routeKey, instanceId });
    }

    return {
      routeKey: null,
      lease: null,
      members: [],
    };
  }

  const normalizedOptions = normalizeOptions(options);
  const leaseFile = routeSpacingMemberPath(routeGroup.routeKey, instanceId);
  if (!leaseFile) {
    return {
      routeKey: null,
      lease: null,
      members: [],
    };
  }
  let leaseStartedAt = Number(startedAt) || 0;

  try {
    const existingLease = await readJsonFile(leaseFile);
    if (existingLease?.routeKey === routeGroup.routeKey) {
      leaseStartedAt = Number(existingLease.startedAt) || leaseStartedAt;
    }
  } catch {}

  if (!leaseStartedAt) {
    leaseStartedAt = Date.now();
  }

  const nextLease = {
    routeKey: routeGroup.routeKey,
    routeName: routeGroup.routeName,
    routeSignature: routeGroup.routeSignature,
    waypointCount: routeGroup.waypointCount,
    instanceId: String(instanceId || ""),
    characterName: String(characterName || ""),
    title: String(title || ""),
    pid: process.pid,
    routeIndex: normalizeRouteSpacingIndex(routeIndex, routeGroup.waypointCount),
    confirmedIndex: normalizeRouteSpacingIndex(confirmedIndex, routeGroup.waypointCount),
    playerPosition: normalizeRouteSpacingPosition(playerPosition),
    startedAt: leaseStartedAt,
    updatedAt: Date.now(),
    running: true,
    autowalkEnabled: normalizedOptions.autowalkEnabled === true,
    routeResetActive: false,
  };

  await fs.mkdir(path.dirname(leaseFile), { recursive: true });
  await fs.writeFile(leaseFile, JSON.stringify(nextLease, null, 2) + "\n", "utf8");

  return {
    routeKey: routeGroup.routeKey,
    lease: nextLease,
    members: await listRouteSpacingLeases({ routeKey: routeGroup.routeKey }),
  };
}

export async function claimCharacter({
  profileKey,
  characterName = "",
  instanceId,
  pageId = "",
  title = "",
}) {
  if (!profileKey) {
    throw new Error("profileKey is required to claim a character.");
  }

  const claimFile = characterClaimPath(profileKey);
  await fs.mkdir(CHARACTER_CLAIM_DIR, { recursive: true });
  let startedAt = Date.now();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextClaim = {
      profileKey,
      characterName: String(characterName || ""),
      instanceId: String(instanceId || ""),
      pageId: String(pageId || ""),
      pid: process.pid,
      title: String(title || ""),
      startedAt,
      updatedAt: Date.now(),
    };

    if (await tryWriteJsonFileExclusive(claimFile, nextClaim)) {
      return { ok: true, claim: nextClaim };
    }

    try {
      const existingClaim = await readJsonFile(claimFile);

      if (existingClaim.instanceId === nextClaim.instanceId) {
        const refreshedClaim = {
          ...nextClaim,
          startedAt: Number(existingClaim.startedAt) || startedAt,
          updatedAt: Date.now(),
        };
        await writeJsonFile(claimFile, refreshedClaim);
        return { ok: true, claim: refreshedClaim };
      }

      if (isClaimActive(existingClaim)) {
        return { ok: false, claim: existingClaim };
      }

      startedAt = Number(existingClaim.startedAt) || startedAt;
    } catch {}

    await fs.rm(claimFile, { force: true }).catch(() => {});
  }

  const existingClaim = await readJsonFile(claimFile).catch(() => null);
  if (existingClaim && isClaimActive(existingClaim) && existingClaim.instanceId !== String(instanceId || "")) {
    return { ok: false, claim: existingClaim };
  }

  throw new Error("Unable to claim character after repeated retries.");
}

export async function touchCharacterClaim({
  profileKey,
  characterName = "",
  instanceId,
  pageId = "",
  title = "",
}) {
  if (!profileKey) {
    return { ok: false, claim: null };
  }

  const claimFile = characterClaimPath(profileKey);
  let startedAt = Date.now();

  const nextClaim = {
    profileKey,
    characterName: String(characterName || ""),
    instanceId: String(instanceId || ""),
    pageId: String(pageId || ""),
    pid: process.pid,
    title: String(title || ""),
    startedAt,
    updatedAt: Date.now(),
  };

  await fs.mkdir(CHARACTER_CLAIM_DIR, { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const createdClaim = {
      ...nextClaim,
      startedAt,
      updatedAt: Date.now(),
    };

    if (await tryWriteJsonFileExclusive(claimFile, createdClaim)) {
      return { ok: true, claim: createdClaim };
    }

    try {
      const existingClaim = await readJsonFile(claimFile);

      if (existingClaim.instanceId !== nextClaim.instanceId && isClaimActive(existingClaim)) {
        return { ok: false, claim: existingClaim };
      }

      startedAt = Number(existingClaim.startedAt) || startedAt;

      if (existingClaim.instanceId === nextClaim.instanceId) {
        const refreshedClaim = {
          ...nextClaim,
          startedAt,
          updatedAt: Date.now(),
        };
        await writeJsonFile(claimFile, refreshedClaim);
        return { ok: true, claim: refreshedClaim };
      }
    } catch {}

    await fs.rm(claimFile, { force: true }).catch(() => {});
  }

  const existingClaim = await readJsonFile(claimFile).catch(() => null);
  if (existingClaim && isClaimActive(existingClaim) && existingClaim.instanceId !== nextClaim.instanceId) {
    return { ok: false, claim: existingClaim };
  }

  throw new Error("Unable to refresh character claim after repeated retries.");
}

export async function releaseCharacterClaim({ profileKey, instanceId }) {
  if (!profileKey) {
    return;
  }

  const claimFile = characterClaimPath(profileKey);

  try {
    const existingClaim = await readJsonFile(claimFile);
    if (existingClaim.instanceId && existingClaim.instanceId !== String(instanceId || "")) {
      if (isClaimActive(existingClaim)) {
        return;
      }
    }
  } catch {}

  await fs.rm(claimFile, { force: true }).catch(() => {});
}
