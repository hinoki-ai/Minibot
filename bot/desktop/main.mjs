import { randomUUID } from "node:crypto";
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  net,
  powerSaveBlocker,
  protocol,
  screen,
  session as electronSession,
} from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_PROTOCOL_SCHEME,
  APP_WINDOW_URL,
  isTrustedAppUrl,
  registerAppProtocol,
} from "./app-protocol.mjs";
import {
  APP_NAME,
  LINUX_DESKTOP_ENTRY_NAME,
  ensureLinuxDesktopEntry,
} from "./linux-integration.mjs";
import { createPowerSaveController } from "./power-save-blocker.mjs";
import {
  CdpPage,
  diffMonsterNames,
  formatTileRulePolicyLabel,
  discoverGamePages,
  formatGeneratedWaypointLabel,
  formatWaypointTypeLabel,
  mergeMonsterNames,
  mergeOptions,
  MinibiaTargetBot,
  normalizeOptions,
  normalizeWaypointType,
  sleep,
  trimMonsterNames,
} from "../lib/bot-core.mjs";
import {
  buildManagedBrowserAppLaunchSpec,
  buildManagedBrowserLaunchSpec,
  extractCommandArgValue,
  getManagedBrowserWindowBounds,
  REMOVABLE_BROWSER_PROFILE_LOCK_PATHS,
  replaceCommandArgValue,
  resolveChromiumAppWindowBounds,
  resolveBrowserExecutable,
  resolveManagedBrowserAppLauncher,
  setManagedBrowserWindowBounds,
  waitForManagedBrowserSession,
} from "../lib/browser-session.mjs";
import {
  pruneBrowserProfile,
  shouldCopyBrowserProfilePath,
} from "../lib/browser-profile-privacy.mjs";
import {
  deleteAccount,
  buildCharacterKey,
  deleteRouteProfile,
  claimCharacter,
  describeRouteProfile,
  listAccounts,
  listCharacterConfigs,
  loadConfig,
  loadAccount,
  loadSessionState,
  loadRouteProfile,
  listRouteProfiles,
  ROUTE_SPACING_DIR,
  releaseCharacterClaim,
  saveAccount,
  saveConfig,
  saveSessionState,
  saveRouteProfile,
  syncRouteSpacingLease,
  releaseRouteSpacingLease,
  touchCharacterClaim,
  validateRouteConfig,
} from "../lib/config-store.mjs";
import { buildHuntPresetCatalog } from "../lib/hunt-presets.mjs";
import { resolveMinibiaItemName, resolveMinibiaItemSlotType } from "../lib/minibia-item-metadata.mjs";
import { loadMinibiaData } from "../lib/minibia-data.mjs";
import { resolveRuntimeLayout } from "../lib/runtime-layout.mjs";
import {
  buildTrainerBootstrapStepExpression,
  buildTrainerRoster,
  findTrainerRosterAccount,
  formatTrainerProfileDisplayName,
  resolveTrainerRosterLaunchGroup,
} from "../lib/trainer-bootstrap.mjs";
import {
  buildMinibiaPwaSessionUrl,
  buildPortableClientLaunchSpec,
} from "../scripts/launch-portable-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_LOGS = 80;
const MAX_LOG_MESSAGE_LENGTH = 240;
const APP_BASE_DIR = path.resolve(__dirname, "..");
const RUNTIME_LAYOUT = resolveRuntimeLayout({ baseDir: APP_BASE_DIR });
const APP_VIEWPORTS = Object.freeze({
  desk: Object.freeze({
    width: 1440,
    height: 875,
  }),
  compact: Object.freeze({
    width: 460,
    height: 960,
  }),
});
const DISCOVERY_INTERVAL_MS = 3_000;
const SESSION_SYNC_INTERVAL_MS = 3_000;
const IDLE_SESSION_SNAPSHOT_INTERVAL_MS = 12_000;
const LIVE_STATE_PATCH_INTERVAL_MS = 750;
const MULTI_SESSION_LIVE_STATE_PATCH_STEP_MS = 350;
const MULTI_SESSION_LIVE_STATE_PATCH_MAX_MS = 2_500;
const CLAIM_HEARTBEAT_MIN_INTERVAL_MS = 5_000;
const BROWSER_STORAGE_HYGIENE_INTERVAL_MS = 15 * 60_000;
const RUNNING_SESSION_STALE_MS = 12_000;
const RUNNING_SESSION_RECOVERY_MS = 20_000;
const RUNNING_SESSION_RECOVERY_COOLDOWN_MS = 15_000;
const CRASH_RECOVERY_ROUTE_LEASE_MAX_AGE_MS = 15 * 60_000;
const TRAINER_BOOTSTRAP_TIMEOUT_MS = 120_000;
const TRAINER_BOOTSTRAP_POLL_MS = 750;
const TRAINER_POST_LAUNCH_LOGIN_DELAY_MS = 120_000;
const RUNTIME_TIMING_EWMA_ALPHA = 0.18;
const SINGLE_INSTANCE_LOCK = app.requestSingleInstanceLock();
const WINDOW_ICON_CANDIDATE_RELATIVE_PATHS = [
  path.join("desktop", "assets", "favicon.png"),
  path.join("desktop", "assets", "icon.png"),
  path.join("desktop", "assets", "icon.ico"),
];

if (RUNTIME_LAYOUT.portable) {
  process.env.MINIBOT_PORTABLE_ROOT ||= RUNTIME_LAYOUT.rootDir;
  process.env.MINIBOT_MANAGED_BROWSER_USER_DATA_DIR ||= RUNTIME_LAYOUT.managedBrowserUserDataDir;
  app.setPath("userData", RUNTIME_LAYOUT.electronUserDataDir);
}

if (process.platform === "linux") {
  process.env.CHROME_DESKTOP ||= LINUX_DESKTOP_ENTRY_NAME;
  app.commandLine.appendSwitch("class", APP_NAME);
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.setName(APP_NAME);
if (process.platform === "win32") {
  app.setAppUserModelId(APP_NAME);
}

if (!SINGLE_INSTANCE_LOCK) {
  app.quit();
}

let mainWindow = null;
let defaultConfig = null;
let restoredSessionState = null;
let availableInstances = [];
let idleTimer = null;
let discoveryTimer = null;
let activeViewportMode = "desk";
let activeAlwaysOnTop = true;
const systemSleepController = createPowerSaveController(powerSaveBlocker);
let sessions = new Map();
let activeSessionId = null;
let routeLibrary = [];
let accountLibrary = [];
let trainerCharacterLibrary = [];
let huntPresetCatalog = [];
let minibiaMonsterCatalogNames = [];
let minibiaNpcCatalogNames = [];
let sessionSyncInFlight = false;
let discoveryInFlight = false;
let liveStatePatchTimer = null;
let lastStateDispatchAt = 0;
let lastIdleSessionSnapshotAt = 0;
let lastLivePatchLogSessionId = null;
let lastLivePatchLogRevision = -1;
let managedBrowserLayoutAssignments = new Map();
let sessionStateSaveChain = Promise.resolve();
let trainerRosterAutoStartTriggered = false;
const desktopRuntimeTiming = {};

const refreshingSessions = new Set();
const deskInstanceId = randomUUID();

function getMonotonicNowMs() {
  return typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();
}

function normalizeTimingDurationMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 10) / 10;
}

function recordRuntimeTimingSample(store, name, durationMs, details = {}) {
  const key = String(name || "").trim();
  if (!key) return null;

  const previous = store[key] || {};
  const count = Math.max(0, Math.trunc(Number(previous.count) || 0)) + 1;
  const lastMs = normalizeTimingDurationMs(durationMs);
  const previousAverage = Number(previous.avgMs);
  const avgMs = count === 1 || !Number.isFinite(previousAverage)
    ? lastMs
    : normalizeTimingDurationMs((previousAverage * (1 - RUNTIME_TIMING_EWMA_ALPHA)) + (lastMs * RUNTIME_TIMING_EWMA_ALPHA));
  const maxMs = normalizeTimingDurationMs(Math.max(Number(previous.maxMs) || 0, lastMs));

  store[key] = {
    ...details,
    count,
    lastMs,
    avgMs,
    maxMs,
    lastAt: Date.now(),
  };
  return store[key];
}

function serializeRuntimeTimingStore(store = {}) {
  return Object.fromEntries(
    Object.entries(store)
      .filter(([key]) => key)
      .map(([key, value]) => ([
        key,
        {
          ...value,
          count: Math.max(0, Math.trunc(Number(value?.count) || 0)),
          lastMs: normalizeTimingDurationMs(value?.lastMs),
          avgMs: normalizeTimingDurationMs(value?.avgMs),
          maxMs: normalizeTimingDurationMs(value?.maxMs),
          lastAt: Math.max(0, Math.trunc(Number(value?.lastAt) || 0)),
        },
      ])),
  );
}

function recordDesktopRuntimeTiming(name, durationMs, details = {}) {
  return recordRuntimeTimingSample(desktopRuntimeTiming, name, durationMs, details);
}

function resolveAppIcon() {
  const iconPath = WINDOW_ICON_CANDIDATE_RELATIVE_PATHS
    .map((candidate) => path.join(APP_BASE_DIR, candidate))
    .find((candidate) => fs.existsSync(candidate)) || null;
  if (!iconPath) return null;

  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? null : image;
}

function buildSessionId(instance) {
  const pageId = String(instance?.id || "").trim();
  return pageId || String(instance?.profileKey || "").trim() || randomUUID();
}

function buildClaimOwnerId(profileKey) {
  return `${deskInstanceId}:${profileKey}`;
}

function resolveInstanceProfileKey(instance, index = 0) {
  return buildCharacterKey(
    instance.characterName
    || instance.displayName
    || `page-${instance.id || index + 1}`,
  );
}

function buildBinding(instance = {}) {
  return {
    profileKey: instance.profileKey || "",
    pageId: String(instance.id || ""),
    url: instance.url || "",
    title: instance.title || "",
    characterName: instance.characterName || "",
    displayName: instance.displayName || "",
  };
}

function normalizeRestoreKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function scoreRestoredSessionRecord(record = {}, session = null, instance = null) {
  const binding = session?.binding || buildBinding(instance || {});
  const id = normalizeRestoreKey(session?.id || buildSessionId(instance || {}));
  const pageId = normalizeRestoreKey(binding.pageId || instance?.id);
  const profileKey = normalizeRestoreKey(session?.profileKey || instance?.profileKey);
  const characterName = normalizeRestoreKey(binding.characterName || instance?.characterName);
  const displayName = normalizeRestoreKey(binding.displayName || instance?.displayName);
  let score = 0;

  if (id && normalizeRestoreKey(record.id) === id) score += 100;
  if (pageId && normalizeRestoreKey(record.pageId) === pageId) score += 90;
  if (profileKey && normalizeRestoreKey(record.profileKey) === profileKey) score += 80;
  if (characterName && normalizeRestoreKey(record.characterName) === characterName) score += 70;
  if (displayName && normalizeRestoreKey(record.displayName) === displayName) score += 40;

  return score;
}

function findRestoredSessionRecord(session = null, instance = null) {
  const records = Array.isArray(restoredSessionState?.sessions)
    ? restoredSessionState.sessions
    : [];
  let bestRecord = null;
  let bestScore = 0;

  for (const record of records) {
    const score = scoreRestoredSessionRecord(record, session, instance);
    if (score > bestScore) {
      bestScore = score;
      bestRecord = record;
    }
  }

  return bestScore > 0 ? bestRecord : null;
}

function getRestoredConfig(record = null) {
  return record?.config && typeof record.config === "object"
    ? normalizeOptions(record.config)
    : null;
}

function applyRestoredSessionRecord(session, record = null) {
  if (!session) {
    return false;
  }

  session.restoredSessionRecord = record || null;
  if (!record) {
    return false;
  }

  const restoredConfig = getRestoredConfig(record);
  if (!restoredConfig || session.configLoaded) {
    return false;
  }

  session.config = restoredConfig;
  session.routeProfile = serializeRouteProfile(session.config);
  session.bot.setOptions(session.config);
  session.bot.resetRoute(Number(record.routeIndex) || 0);
  session.bot.setOverlayFocusIndex(record.overlayFocusIndex);
  return true;
}

function resolveRestoredActiveSessionId() {
  if (!restoredSessionState || !sessions.size) {
    return null;
  }

  const activeProbe = {
    id: restoredSessionState.activeSessionId,
    pageId: restoredSessionState.activePageId,
    profileKey: restoredSessionState.activeProfileKey,
    characterName: restoredSessionState.activeCharacterName,
    displayName: restoredSessionState.activeCharacterName,
  };
  let bestSession = null;
  let bestScore = 0;

  for (const session of sessions.values()) {
    const score = scoreRestoredSessionRecord(activeProbe, session, session.instance);
    if (score > bestScore) {
      bestScore = score;
      bestSession = session;
    }
  }

  return bestScore > 0 ? bestSession?.id || null : null;
}

function restoreActiveSessionIdFromState({ force = false } = {}) {
  if (!force && activeSessionId && sessions.has(activeSessionId)) {
    return false;
  }

  const restoredActiveSessionId = resolveRestoredActiveSessionId();
  if (!restoredActiveSessionId) {
    return false;
  }

  activeSessionId = restoredActiveSessionId;
  return true;
}

function serializeSessionForPersistence(session) {
  const config = normalizeOptions(session?.config || defaultConfig || {});
  return {
    id: String(session?.id || ""),
    profileKey: String(session?.profileKey || ""),
    pageId: String(session?.binding?.pageId || ""),
    characterName: getSessionCharacterName(session) || String(session?.binding?.characterName || ""),
    displayName: String(session?.binding?.displayName || ""),
    title: String(session?.binding?.title || ""),
    url: String(session?.binding?.url || ""),
    running: session?.bot?.running === true,
    routeIndex: Math.max(0, Math.trunc(Number(session?.bot?.routeIndex) || 0)),
    routeComplete: session?.bot?.routeComplete === true,
    overlayFocusIndex: Number.isFinite(Number(session?.bot?.overlayFocusIndex))
      ? Math.max(0, Math.trunc(Number(session.bot.overlayFocusIndex)))
      : null,
    config,
  };
}

function buildSessionStateSnapshot() {
  const activeSession = getActiveSession();
  const alwaysOnTop = mainWindow && !mainWindow.isDestroyed()
    ? mainWindow.isAlwaysOnTop()
    : activeAlwaysOnTop;
  activeAlwaysOnTop = alwaysOnTop;

  return {
    activeSessionId: activeSessionId || "",
    activeProfileKey: activeSession?.profileKey || "",
    activePageId: activeSession?.binding?.pageId || "",
    activeCharacterName: getSessionCharacterName(activeSession),
    activeViewportMode,
    alwaysOnTop,
    sessions: [...sessions.values()].map(serializeSessionForPersistence),
  };
}

function queueSessionStateSave() {
  const snapshot = buildSessionStateSnapshot();
  restoredSessionState = {
    ...restoredSessionState,
    ...snapshot,
  };

  sessionStateSaveChain = sessionStateSaveChain
    .catch(() => { })
    .then(() => saveSessionState(snapshot))
    .then((result) => {
      restoredSessionState = result.state;
      return result;
    })
    .catch((error) => {
      const activeSession = getActiveSession();
      if (activeSession) {
        pushSessionLog(activeSession, `Session state save failed: ${error.message}`);
      }
      return null;
    });

  return sessionStateSaveChain;
}

async function flushSessionStateSave() {
  await sessionStateSaveChain.catch(() => null);
}

function createRouteSpacingAdapter(session) {
  let activeRouteKey = null;
  let activeInstanceId = null;
  let startedAt = 0;

  return {
    async sync(context = {}) {
      const nextInstanceId = session.claimOwnerId;
      if (activeRouteKey && activeInstanceId && activeInstanceId !== nextInstanceId) {
        await releaseRouteSpacingLease({
          routeKey: activeRouteKey,
          instanceId: activeInstanceId,
        }).catch(() => { });
        activeRouteKey = null;
        startedAt = 0;
      }

      const snapshot = context.snapshot || session?.bot?.lastSnapshot || null;
      const result = await syncRouteSpacingLease({
        options: context.options,
        previousRouteKey: activeRouteKey,
        instanceId: nextInstanceId,
        characterName: getSessionLabel(session)
          || snapshot?.playerName
          || session.binding.characterName
          || session.binding.displayName,
        title: session.binding.title || session.bot.page?.title || "",
        routeIndex: context.routeIndex,
        confirmedIndex: context.lastConfirmedWaypointIndex,
        playerPosition: context.playerPosition || snapshot?.playerPosition || null,
        startedAt,
        active: Boolean(
          context.running
          && context.autowalkEnabled
          && !context.routeResetActive
        ),
      });

      activeRouteKey = result.routeKey || null;
      activeInstanceId = result.routeKey ? nextInstanceId : null;
      startedAt = Number(result.lease?.startedAt) || 0;

      if (!result.routeKey) {
        return null;
      }

      return {
        selfInstanceId: session.claimOwnerId,
        routeKey: result.routeKey,
        members: result.members,
      };
    },
    async release() {
      if (!activeRouteKey) {
        activeInstanceId = null;
        startedAt = 0;
        return null;
      }

      const routeKey = activeRouteKey;
      const instanceId = activeInstanceId || session.claimOwnerId;
      activeRouteKey = null;
      activeInstanceId = null;
      startedAt = 0;
      return releaseRouteSpacingLease({
        routeKey,
        instanceId,
      });
    },
  };
}

function normalizeSessionPlayerPosition(position = null) {
  if (!position
    || !Number.isFinite(Number(position.x))
    || !Number.isFinite(Number(position.y))
    || !Number.isFinite(Number(position.z))) {
    return null;
  }

  return {
    x: Math.trunc(Number(position.x)),
    y: Math.trunc(Number(position.y)),
    z: Math.trunc(Number(position.z)),
  };
}

function createFollowTrainCoordinationAdapter(session) {
  return {
    async sync(context = {}) {
      const chainKeys = new Set(
        mergeMonsterNames(context?.options?.partyFollowMembers || [])
          .map((name) => name.toLowerCase()),
      );
      const members = [];

      for (const peer of sessions.values()) {
        if (!canSyncSession(peer)) {
          continue;
        }

        const characterName = getSessionCharacterName(peer);
        if (!characterName || (chainKeys.size && !chainKeys.has(characterName.toLowerCase()))) {
          continue;
        }

        const snapshotAgeMs = Number(peer?.bot?.getSnapshotAgeMs?.());
        if (Number.isFinite(snapshotAgeMs) && snapshotAgeMs >= RUNNING_SESSION_STALE_MS) {
          continue;
        }

        const playerPosition = normalizeSessionPlayerPosition(
          peer?.bot?.lastSnapshot?.playerPosition
          || peer?.instance?.playerPosition
          || null,
        );
        if (!playerPosition) {
          continue;
        }

        const followTrainStatus = peer?.bot?.getFollowTrainStatus?.(peer?.bot?.lastSnapshot) || null;

        members.push({
          instanceId: peer.claimOwnerId,
          characterName,
          enabled: Boolean(followTrainStatus?.enabled),
          role: String(followTrainStatus?.role || ""),
          trainerEnabled: peer?.bot?.options?.trainerEnabled === true,
          trainerAutoPartyEnabled: peer?.bot?.options?.trainerAutoPartyEnabled !== false,
          trainerPartnerName: String(peer?.bot?.getTrainerPartnerName?.(peer?.bot?.lastSnapshot) || ""),
          currentState: String(followTrainStatus?.currentState || ""),
          followActive: followTrainStatus?.followActive === true,
          leaderName: String(followTrainStatus?.leaderName || ""),
          floorTransition: peer?.bot?.getFollowTrainFloorTransition?.() || null,
          recentActions: peer?.bot?.getFollowTrainRecentActions?.() || [],
          title: peer.binding.title || peer.bot.page?.title || "",
          playerPosition,
          updatedAt: Number(peer?.bot?.lastSnapshotAt) || 0,
        });
      }

      return {
        selfInstanceId: session.claimOwnerId,
        members,
      };
    },
    async release() {
      return null;
    },
  };
}

function createSession(instance) {
  const config = normalizeOptions(defaultConfig || {});
  const session = {
    id: buildSessionId(instance),
    profileKey: instance.profileKey,
    profileReady: Boolean(instance.profileReady),
    claimOwnerId: buildClaimOwnerId(instance.profileKey),
    instance: { ...instance },
    binding: buildBinding(instance),
    present: true,
    config,
    configLoaded: false,
    bot: new MinibiaTargetBot(config),
    logs: [],
    logRevision: 0,
    routeProfile: serializeRouteProfile(config),
    restoredSessionRecord: null,
    saveChain: Promise.resolve(),
    promotedProfileConfig: null,
    lastClaimHeartbeatAt: 0,
    lastStaleRecoveryAt: 0,
    staleRecoveryInFlight: false,
    browserStorageHygieneInFlight: false,
    browserStorageHygieneSupported: true,
    lastBrowserStorageHygieneAt: 0,
    lastBrowserStorageHygieneErrorAt: 0,
  };
  session.bot.setPageResolver(() => session.instance || null);
  session.bot.setRouteCoordinationAdapter(createRouteSpacingAdapter(session));
  session.bot.setFollowTrainCoordinationAdapter(createFollowTrainCoordinationAdapter(session));

  installSessionListeners(session);
  applySessionRuntimeLoad();
  return session;
}

function getSessionLabel(session) {
  return session?.bot?.lastSnapshot?.playerName
    || session?.binding?.characterName
    || session?.binding?.displayName
    || "";
}

function getSessionCharacterName(session) {
  return String(
    session?.bot?.lastSnapshot?.playerName
    || session?.binding?.characterName
    || "",
  ).trim();
}

function getLiveCharacterNames({
  excludeSession = null,
  syncableOnly = false,
} = {}) {
  const names = [];
  const seen = new Set();

  for (const session of sessions.values()) {
    if (!session || session === excludeSession) continue;
    if (syncableOnly && !canSyncSession(session)) continue;

    const name = getSessionCharacterName(session);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

function getLiveFollowTrainCharacterEntries() {
  const entries = [];
  const seen = new Set();

  for (const [index, session] of [...sessions.values()].entries()) {
    if (!canSyncSession(session)) continue;

    const name = getSessionCharacterName(session);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;

    const snapshot = session.bot?.lastSnapshot || null;
    seen.add(key);
    entries.push({
      index,
      key,
      name,
      followTargetName: String(
        snapshot?.currentFollowTarget?.name
        || snapshot?.followTarget?.name
        || session.bot?.getFollowTrainStatus?.(snapshot)?.leaderName
        || "",
      ).trim(),
    });
  }

  return entries;
}

function orderFollowTrainEntriesByLiveLinks(entries = []) {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return Array.isArray(entries) ? entries : [];
  }

  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const childrenByKey = new Map(entries.map((entry) => [entry.key, []]));
  const incoming = new Set();
  let liveLinkCount = 0;

  for (const entry of entries) {
    const targetKey = String(entry.followTargetName || "").trim().toLowerCase();
    if (!targetKey || targetKey === entry.key || !byKey.has(targetKey)) {
      continue;
    }

    childrenByKey.get(targetKey)?.push(entry);
    incoming.add(entry.key);
    liveLinkCount += 1;
  }

  if (!liveLinkCount) {
    return entries;
  }

  for (const children of childrenByKey.values()) {
    children.sort((left, right) => left.index - right.index);
  }

  const visited = new Set();
  const components = [];
  const visit = (entry, component) => {
    if (!entry || visited.has(entry.key)) return;
    visited.add(entry.key);
    component.push(entry);
    for (const child of childrenByKey.get(entry.key) || []) {
      visit(child, component);
    }
  };

  for (const entry of entries.filter((candidate) => !incoming.has(candidate.key))) {
    const component = [];
    visit(entry, component);
    if (component.length) components.push(component);
  }

  for (const entry of entries) {
    if (visited.has(entry.key)) continue;
    const component = [];
    visit(entry, component);
    if (component.length) components.push(component);
  }

  components.sort((left, right) => (
    right.length - left.length
    || left[0].index - right[0].index
  ));

  return components.flat();
}

function getAutomaticFollowTrainMemberNames() {
  return orderFollowTrainEntriesByLiveLinks(getLiveFollowTrainCharacterEntries())
    .map((entry) => entry.name);
}

const FOLLOW_TRAIN_OPTION_KEYS = new Set([
  "partyFollowEnabled",
  "partyFollowMembers",
  "partyFollowManualPlayers",
  "partyFollowMemberRoles",
  "partyFollowDistance",
  "partyFollowCombatMode",
]);

function isFollowTrainOnlyPatch(partial = {}) {
  if (!partial || typeof partial !== "object") {
    return false;
  }

  const keys = Object.keys(partial);
  return keys.length > 0 && keys.every((key) => FOLLOW_TRAIN_OPTION_KEYS.has(key));
}

function buildFollowTrainOptionsPatch(partial = {}) {
  const patch = {};
  for (const key of FOLLOW_TRAIN_OPTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(partial, key)) {
      patch[key] = partial[key];
    }
  }

  if (patch.partyFollowEnabled === true) {
    const requestedMembers = mergeMonsterNames(patch.partyFollowMembers || []);
    if (requestedMembers.length < 2) {
      const liveMembers = getAutomaticFollowTrainMemberNames();
      if (liveMembers.length >= 2) {
        patch.partyFollowMembers = liveMembers;
      }
    }
  }

  return patch;
}

async function persistFollowTrainOptionsForLiveSessions(activeSession, partial = {}) {
  const patch = buildFollowTrainOptionsPatch(partial);
  const targetSessions = [...sessions.values()].filter(canSyncSession);
  const selectedSessions = targetSessions.length
    ? targetSessions
    : [activeSession].filter(Boolean);

  for (const session of selectedSessions) {
    await ensureSessionConfig(session);
  }

  for (const session of selectedSessions) {
    await persistSessionConfig(session, mergeOptions(session.config, patch), { emitState: false });
    if (Object.prototype.hasOwnProperty.call(patch, "partyFollowEnabled")) {
      pushSessionLog(
        session,
        patch.partyFollowEnabled
          ? "Follow chain enabled from live tabs."
          : "Follow chain disabled.",
      );
    }
  }

  if (activeSession) {
    sendEvent("state", { sessionId: activeSession.id, scope: "follow-chain" });
  }
}

function sameMonsterNameList(left = [], right = []) {
  const leftNames = mergeMonsterNames(left).map((name) => name.toLowerCase());
  const rightNames = mergeMonsterNames(right).map((name) => name.toLowerCase());
  if (leftNames.length !== rightNames.length) return false;
  return leftNames.every((name, index) => name === rightNames[index]);
}

function getSessionById(sessionId) {
  if (!sessionId) return null;
  return sessions.get(String(sessionId)) || null;
}

function getActiveSession() {
  return getSessionById(activeSessionId) || [...sessions.values()][0] || null;
}

function ensureActiveSessionId() {
  if (activeSessionId && sessions.has(activeSessionId)) {
    return;
  }

  const candidate = [...sessions.values()].find((session) => session.bot.running)
    || [...sessions.values()].find((session) => session.present)
    || [...sessions.values()][0]
    || null;

  activeSessionId = candidate?.id || null;
}

function applySessionRuntimeLoad() {
  ensureActiveSessionId();
  const orderedSessions = [...sessions.values()];
  const runningSessionCount = orderedSessions.filter((session) => session?.bot?.running).length;
  const activeId = String(activeSessionId || "");

  orderedSessions.forEach((session, index) => {
    session?.bot?.setRuntimeLoad?.({
      runningSessionCount: Math.max(1, runningSessionCount),
      sessionCount: Math.max(1, orderedSessions.length),
      sessionIndex: index,
      active: String(session.id || "") === activeId,
    });
  });
}

function updateWindowTitle() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setTitle(APP_NAME);
}

function installAppSessionSecurity() {
  const defaultSession = electronSession.defaultSession;
  if (!defaultSession) {
    return;
  }

  defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  defaultSession.setPermissionCheckHandler(() => false);
  defaultSession.setDevicePermissionHandler?.(() => false);
}

function configureMainWindowSecurity(window) {
  const contents = window.webContents;

  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (event, url) => {
    if (!isTrustedAppUrl(url)) {
      event.preventDefault();
    }
  });
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
}

function assertTrustedIpcSender(event) {
  const trustedWindow = mainWindow && !mainWindow.isDestroyed()
    ? event.sender === mainWindow.webContents
    : false;

  if (trustedWindow && isTrustedAppUrl(event?.senderFrame?.url)) {
    return;
  }

  throw new Error("Blocked IPC from an untrusted renderer.");
}

function handleTrusted(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    assertTrustedIpcSender(event);
    return handler(event, ...args);
  });
}

function sanitizeUrlForLog(value = "") {
  const text = String(value || "");
  try {
    const url = new URL(text);
    return `${url.origin}${url.pathname || ""}`;
  } catch {
    return text.split(/[?#]/)[0] || text;
  }
}

function sanitizeLogMessage(message = "") {
  let text = String(message ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "";
  }

  text = text.replace(/\b(?:https?|wss?):\/\/[^\s)]+/gi, (match) => sanitizeUrlForLog(match));
  if (text.length > MAX_LOG_MESSAGE_LENGTH) {
    return `${text.slice(0, MAX_LOG_MESSAGE_LENGTH - 3)}...`;
  }
  return text;
}

function pushSessionLog(session, message) {
  if (!session) return;

  const sanitizedMessage = sanitizeLogMessage(message);
  if (!sanitizedMessage) return;

  const line = `[${new Date().toLocaleTimeString("en-GB", { hour12: false })}] ${sanitizedMessage}`;
  session.logs.push(line);
  session.logRevision = (Number(session.logRevision) || 0) + 1;
  const overflow = session.logs.length - MAX_LOGS;
  if (overflow > 0) {
    session.logs.splice(0, overflow);
  }
}

function serializePage(page) {
  if (!page) return null;

  return {
    id: page.id,
    title: page.title,
    url: page.url,
  };
}

function serializeInstance(instance) {
  return {
    id: instance.id,
    title: instance.title,
    url: instance.url,
    ready: instance.ready,
    characterName: instance.characterName,
    displayName: instance.displayName,
    playerPosition: instance.playerPosition || null,
    profileKey: instance.profileKey,
    claimed: instance.claimed,
    claimedBySelf: instance.claimedBySelf,
    available: instance.available,
    claim: instance.claim
      ? {
        instanceId: instance.claim.instanceId,
        pid: instance.claim.pid,
        updatedAt: instance.claim.updatedAt,
        title: instance.claim.title,
      }
      : null,
  };
}

function serializePlayerStats(playerStats) {
  if (!playerStats) return null;

  return {
    health: playerStats.health,
    maxHealth: playerStats.maxHealth,
    mana: playerStats.mana,
    maxMana: playerStats.maxMana,
    healthPercent: playerStats.healthPercent,
    manaPercent: playerStats.manaPercent,
    level: Number.isFinite(Number(playerStats.level))
      ? Number(playerStats.level)
      : null,
    levelPercent: Number.isFinite(Number(playerStats.levelPercent))
      ? Number(playerStats.levelPercent)
      : null,
  };
}

function serializePosition(position) {
  if (!position) return null;

  return {
    x: position.x,
    y: position.y,
    z: position.z,
  };
}

function serializeCreatureSummary(creature) {
  if (!creature) return null;

  return {
    id: creature.id,
    name: creature.name || "",
    position: serializePosition(creature.position),
    healthPercent: Number.isFinite(Number(creature.healthPercent))
      ? Number(creature.healthPercent)
      : null,
    isTargetingSelf: creature.isTargetingSelf === true,
    skull: serializeNamedState(creature.skull),
  };
}

function serializeConnectionState(connection) {
  if (!connection) return null;

  return {
    connected: connection.connected === true,
    wasConnected: connection.wasConnected === true,
    reconnecting: connection.reconnecting === true,
    intentionalClose: connection.intentionalClose === true,
    serverError: String(connection.serverError || ""),
    reconnectMethodAvailable: connection.reconnectMethodAvailable === true,
    reconnectOverlayVisible: connection.reconnectOverlayVisible === true,
    reconnectButtonVisible: connection.reconnectButtonVisible === true,
    reconnectButtonDisabled: connection.reconnectButtonDisabled === true,
    reconnectMessage: String(connection.reconnectMessage || ""),
    lastCharacterName: String(connection.lastCharacterName || ""),
    playerIsDead: connection.playerIsDead === true,
    deathModalVisible: connection.deathModalVisible === true,
    deathMessage: String(connection.deathMessage || ""),
    loginWrapperVisible: connection.loginWrapperVisible === true,
    loginModalVisible: connection.loginModalVisible === true,
    characterSelectVisible: connection.characterSelectVisible === true,
    connectingModalVisible: connection.connectingModalVisible === true,
    connectingFooterVisible: connection.connectingFooterVisible === true,
    connectingMessage: String(connection.connectingMessage || ""),
    authFailure: connection.authFailure === true,
    lifecycle: String(connection.lifecycle || ""),
    canReconnect: connection.canReconnect === true,
  };
}

function serializeNamedState(state) {
  if (!state) return null;

  return {
    key: state.key ? String(state.key) : null,
    label: state.label ? String(state.label) : "",
    rawValue: state.rawValue != null ? String(state.rawValue) : null,
  };
}

function serializeMessageEntry(message) {
  if (!message) return null;

  return {
    key: String(message.key || "").trim(),
    text: String(message.text || "").trim(),
    speaker: String(message.speaker || "").trim(),
    channelName: String(message.channelName || "").trim(),
    timestamp: Number.isFinite(Number(message.timestamp)) ? Number(message.timestamp) : 0,
  };
}

function serializeDialogueState(dialogue) {
  if (!dialogue) return null;

  return {
    recentMessages: Array.isArray(dialogue.recentMessages)
      ? dialogue.recentMessages
        .slice(-20)
        .map((message) => serializeMessageEntry(message))
        .filter((message) => message?.text)
      : [],
  };
}

function serializeInventoryItem(item) {
  if (!item) return null;

  const resolvedName = resolveMinibiaItemName(item);
  const resolvedSlotType = resolveMinibiaItemSlotType(item);
  return {
    itemId: Number.isFinite(Number(item.itemId ?? item.id)) ? Number(item.itemId ?? item.id) : null,
    name: resolvedName ? String(resolvedName) : "",
    slotType: resolvedSlotType ? String(resolvedSlotType) : "",
    count: Number.isFinite(Number(item.count)) ? Number(item.count) : 0,
    category: item.category ? String(item.category) : "",
    slotIndex: Number.isInteger(Number(item.slotIndex)) ? Number(item.slotIndex) : null,
    slotLabel: item.slotLabel ? String(item.slotLabel) : null,
    location: item.location ? String(item.location) : null,
  };
}

function serializeHotbarState(hotbar) {
  if (!hotbar) return null;

  return {
    slotCount: Number.isFinite(Number(hotbar.slotCount)) ? Number(hotbar.slotCount) : 0,
    slots: Array.isArray(hotbar.slots)
      ? hotbar.slots.map((slot) => ({
        index: Number.isFinite(Number(slot?.index)) ? Number(slot.index) : null,
        label: slot?.label ? String(slot.label) : "",
        kind: slot?.kind ? String(slot.kind) : "",
        hotkey: slot?.hotkey ? String(slot.hotkey) : null,
        words: slot?.words ? String(slot.words) : null,
        spellId: slot?.spellId != null ? String(slot.spellId) : null,
        spellName: slot?.spellName ? String(slot.spellName) : null,
        itemId: Number.isFinite(Number(slot?.itemId)) ? Number(slot.itemId) : null,
        itemName: slot?.itemName ? String(slot.itemName) : null,
        count: Number.isFinite(Number(slot?.count)) ? Number(slot.count) : 0,
        active: slot?.active === true,
        enabled: slot?.enabled === true,
      }))
      : [],
  };
}

function serializeInventoryState(inventory) {
  if (!inventory) return null;

  return {
    equipment: Array.isArray(inventory.equipment)
      ? inventory.equipment.map((entry) => ({
        slotIndex: Number.isFinite(Number(entry?.slotIndex)) ? Number(entry.slotIndex) : null,
        slotLabel: entry?.slotLabel ? String(entry.slotLabel) : "",
        isBackpackSlot: entry?.isBackpackSlot === true,
        isAmmoSlot: entry?.isAmmoSlot === true,
        occupied: entry?.occupied === true,
        item: serializeInventoryItem(entry?.item),
      }))
      : [],
    containers: Array.isArray(inventory.containers)
      ? inventory.containers.map((container) => ({
        index: Number.isFinite(Number(container?.index)) ? Number(container.index) : null,
        runtimeId: Number.isFinite(Number(container?.runtimeId)) ? Number(container.runtimeId) : null,
        itemId: Number.isFinite(Number(container?.itemId)) ? Number(container.itemId) : null,
        name: container?.name ? String(container.name) : "",
        capacity: Number.isFinite(Number(container?.capacity)) ? Number(container.capacity) : 0,
        usedSlots: Number.isFinite(Number(container?.usedSlots)) ? Number(container.usedSlots) : 0,
        freeSlots: Number.isFinite(Number(container?.freeSlots)) ? Number(container.freeSlots) : 0,
        slots: Array.isArray(container?.slots)
          ? container.slots.map((entry) => ({
            slotIndex: Number.isFinite(Number(entry?.slotIndex)) ? Number(entry.slotIndex) : null,
            item: serializeInventoryItem(entry?.item),
          }))
          : [],
      }))
      : [],
    openContainerCount: Number.isFinite(Number(inventory.openContainerCount)) ? Number(inventory.openContainerCount) : 0,
    totalFreeContainerSlots: Number.isFinite(Number(inventory.totalFreeContainerSlots)) ? Number(inventory.totalFreeContainerSlots) : 0,
    ammo: inventory.ammo
      ? {
        slotIndex: Number.isFinite(Number(inventory.ammo.slotIndex)) ? Number(inventory.ammo.slotIndex) : null,
        slotLabel: inventory.ammo.slotLabel ? String(inventory.ammo.slotLabel) : "",
        itemId: Number.isFinite(Number(inventory.ammo.itemId ?? inventory.ammo.id)) ? Number(inventory.ammo.itemId ?? inventory.ammo.id) : null,
        name: resolveMinibiaItemName(inventory.ammo) || "",
        count: Number.isFinite(Number(inventory.ammo.count)) ? Number(inventory.ammo.count) : 0,
      }
      : null,
    supplies: Array.isArray(inventory.supplies)
      ? inventory.supplies.map((entry) => ({
        category: entry?.category ? String(entry.category) : "",
        itemId: Number.isFinite(Number(entry?.itemId ?? entry?.id)) ? Number(entry.itemId ?? entry.id) : null,
        name: resolveMinibiaItemName(entry) || "",
        count: Number.isFinite(Number(entry?.count)) ? Number(entry.count) : 0,
      }))
      : [],
  };
}

function serializeProgressionState(progression) {
  if (!progression) return null;

  return {
    blessings: progression.blessings
      ? {
        count: Number.isFinite(Number(progression.blessings.count)) ? Number(progression.blessings.count) : 0,
        names: Array.isArray(progression.blessings.names)
          ? progression.blessings.names.map((entry) => String(entry))
          : [],
      }
      : null,
    promoted: progression.promoted == null ? null : progression.promoted === true,
    promotion: progression.promotion ? String(progression.promotion) : null,
    vocation: progression.vocation ? String(progression.vocation) : null,
    vocationSource: progression.vocationSource ? String(progression.vocationSource) : null,
    residence: progression.residence ? String(progression.residence) : null,
  };
}

function serializeSnapshot(snapshot) {
  if (!snapshot) return null;

  return {
    ready: snapshot.ready !== false,
    reason: snapshot.ready === false ? String(snapshot.reason || "") : "",
    confidence: snapshot.confidence && typeof snapshot.confidence === "object" ? snapshot.confidence : null,
    decisionTrace: snapshot.decisionTrace && typeof snapshot.decisionTrace === "object" ? snapshot.decisionTrace : null,
    routeState: snapshot.routeState && typeof snapshot.routeState === "object" ? snapshot.routeState : null,
    playerName: snapshot.playerName || "",
    playerPosition: serializePosition(snapshot.playerPosition),
    playerStats: serializePlayerStats(snapshot.playerStats),
    combatModes: snapshot.combatModes
      ? {
        fightMode: serializeNamedState(snapshot.combatModes.fightMode),
        chaseMode: serializeNamedState(snapshot.combatModes.chaseMode),
        safeMode: serializeNamedState(snapshot.combatModes.safeMode),
      }
      : null,
    pvpState: snapshot.pvpState
      ? {
        pkLockEnabled: snapshot.pvpState.pkLockEnabled == null ? null : snapshot.pvpState.pkLockEnabled === true,
        pzLocked: snapshot.pvpState.pzLocked === true,
        skull: serializeNamedState(snapshot.pvpState.skull),
      }
      : null,
    hotbar: serializeHotbarState(snapshot.hotbar),
    inventory: serializeInventoryState(snapshot.inventory),
    progression: serializeProgressionState(snapshot.progression),
    serverMessages: Array.isArray(snapshot.serverMessages)
      ? snapshot.serverMessages
        .slice(-20)
        .map((message) => serializeMessageEntry(message))
        .filter((message) => message?.text)
      : [],
    dialogue: serializeDialogueState(snapshot.dialogue),
    visibleMonsterNames: Array.isArray(snapshot.visibleMonsterNames) ? [...snapshot.visibleMonsterNames] : [],
    visibleCreatureNames: Array.isArray(snapshot.visibleCreatureNames) ? [...snapshot.visibleCreatureNames] : [],
    visiblePlayerNames: Array.isArray(snapshot.visiblePlayerNames) ? [...snapshot.visiblePlayerNames] : [],
    visibleNpcNames: Array.isArray(snapshot.visibleNpcNames) ? [...snapshot.visibleNpcNames] : [],
    visibleCreatures: Array.isArray(snapshot.visibleCreatures)
      ? snapshot.visibleCreatures.map(serializeCreatureSummary).filter(Boolean)
      : [],
    visiblePlayers: Array.isArray(snapshot.visiblePlayers)
      ? snapshot.visiblePlayers.map(serializeCreatureSummary).filter(Boolean)
      : [],
    visibleNpcs: Array.isArray(snapshot.visibleNpcs)
      ? snapshot.visibleNpcs.map(serializeCreatureSummary).filter(Boolean)
      : [],
    currentTarget: serializeCreatureSummary(snapshot.currentTarget),
    currentFollowTarget: serializeCreatureSummary(snapshot.currentFollowTarget || snapshot.followTarget),
    connection: serializeConnectionState(snapshot.connection),
  };
}

function serializeRouteProfile(config, routeProfile = null) {
  const cavebotName = String(config?.cavebotName || "").trim();
  if (!cavebotName) {
    return null;
  }

  if (routeProfile?.path) {
    return {
      ...routeProfile,
      exists: routeProfile.exists ?? fs.existsSync(routeProfile.path),
    };
  }

  const description = describeRouteProfile(cavebotName);
  return {
    ...description,
    exists: fs.existsSync(description.path),
  };
}

function getSessionRouteValidation(session = getActiveSession()) {
  if (!session?.config) {
    return null;
  }

  const routeProfile = serializeRouteProfile(session.config, session.routeProfile);
  return validateRouteConfig(session.config, {
    sourceName: session.config.cavebotName || routeProfile?.name || "",
    sourcePath: routeProfile?.path || "",
  });
}

function assertRouteValidationAcknowledged(session) {
  const validation = getSessionRouteValidation(session);
  if (!validation?.requiresAcknowledgement || session?.config?.autowalkEnabled !== true) {
    return validation;
  }

  if (session.routeValidationAcknowledgedSignature === validation.signature) {
    pushSessionLog(session, `Route validation acknowledged for ${validation.summary.errorCount} high-risk issue${validation.summary.errorCount === 1 ? "" : "s"}.`);
    return validation;
  }

  session.routeValidationAcknowledgedSignature = validation.signature;
  const firstIssue = validation.issues.find((issue) => issue.severity === "error")
    || validation.issues[0]
    || null;
  const location = Number.isInteger(firstIssue?.waypointIndex)
    ? ` at waypoint ${firstIssue.waypointIndex + 1}`
    : "";
  const message = firstIssue?.message || "route validation found high-risk issues";
  pushSessionLog(session, `Route validation blocked start${location}: ${message} Start again to acknowledge.`);
  throw new Error(`Route validation requires review${location}: ${message}. Start again to acknowledge.`);
}

async function refreshRouteLibrary() {
  try {
    routeLibrary = await listRouteProfiles();
  } catch {
    routeLibrary = [];
  }

  return routeLibrary;
}

async function refreshAccountLibrary() {
  try {
    accountLibrary = await listAccounts();
  } catch {
    accountLibrary = [];
  }

  return accountLibrary;
}

async function refreshTrainerCharacterLibrary() {
  try {
    trainerCharacterLibrary = buildTrainerRoster(await listCharacterConfigs());
  } catch {
    trainerCharacterLibrary = [];
  }

  return trainerCharacterLibrary;
}

function normalizeTrainerIdentityKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getTrainerCharacterSession(entry = {}) {
  const requestedKeys = new Set([
    normalizeTrainerIdentityKey(entry?.profileKey),
    normalizeTrainerIdentityKey(entry?.characterName),
    normalizeTrainerIdentityKey(entry?.displayName),
  ].filter(Boolean));
  if (!requestedKeys.size) {
    return null;
  }

  for (const session of sessions.values()) {
    const sessionKeys = [
      normalizeTrainerIdentityKey(session?.profileKey),
      normalizeTrainerIdentityKey(getSessionCharacterName(session)),
      normalizeTrainerIdentityKey(session?.binding?.displayName),
    ].filter(Boolean);
    if (sessionKeys.some((key) => requestedKeys.has(key))) {
      return session;
    }
  }

  return null;
}

function resolveTrainerCharacterName(entry = {}, session = null, account = null) {
  return String(
    getSessionCharacterName(session)
    || session?.binding?.displayName
    || account?.preferredCharacter
    || (Array.isArray(account?.characters) ? account.characters[0] : "")
    || entry?.characterName
    || entry?.displayName
    || formatTrainerProfileDisplayName(entry?.profileKey)
    || "",
  ).trim();
}

function hasTrainerLaunchCredentials(account = null) {
  return Boolean(
    account
    && account.loginMethod === "account-password"
    && String(account.loginName || "").trim()
    && String(account.password || "").trim(),
  );
}

function serializeTrainerCharacterLibrary() {
  return trainerCharacterLibrary.map((entry) => {
    const session = getTrainerCharacterSession(entry);
    const account = findTrainerRosterAccount(entry, accountLibrary);
    const characterName = resolveTrainerCharacterName(entry, session, account);
    const blockedByOtherDesk = Boolean(session?.instance?.claimed && !session?.instance?.claimedBySelf);
    const live = Boolean(session?.present && session?.instance);
    const running = Boolean(session?.bot?.running);
    const hasLaunchCredentials = Boolean(
      account
      && account.loginMethod === "account-password"
      && String(account.loginName || "").trim()
      && String(account.password || "").trim(),
    );

    return {
      ...entry,
      characterName,
      live,
      running,
      blockedByOtherDesk,
      accountId: String(account?.id || ""),
      hasAccount: Boolean(account),
      hasLaunchCredentials,
      launchReady: live || hasLaunchCredentials,
    };
  });
}

function shouldRefreshRouteLibraryAfterSave(saveResult = null) {
  const routeProfile = saveResult?.routeProfile;
  return Boolean(
    routeProfile
    && (
      routeProfile.changed
      || routeProfile.action === "created"
      || routeProfile.action === "renamed"
      || routeProfile.previousPath
    )
  );
}

function serializeRouteLibrary() {
  const activeRouteName = String(getActiveSession()?.config?.cavebotName || "").trim();

  return routeLibrary.map((entry) => ({
    ...entry,
    active: Boolean(activeRouteName && entry.name === activeRouteName),
  }));
}

function serializeAccountLibrary() {
  const activeCharacterName = String(getActiveSession()?.binding?.characterName || "").trim().toLowerCase();

  return accountLibrary.map((entry) => ({
    ...entry,
    hasPassword: Boolean(entry.password),
    characterCount: Array.isArray(entry.characters) ? entry.characters.length : 0,
    activeCharacterMatch: Boolean(
      activeCharacterName
      && Array.isArray(entry.characters)
      && entry.characters.some((name) => String(name || "").trim().toLowerCase() === activeCharacterName),
    ),
  }));
}

function serializeSession(session) {
  const snapshot = session.bot.lastSnapshot || null;
  const routeResetStatus = session.bot.getRouteResetStatus();
  const snapshotAgeMs = session.bot.getSnapshotAgeMs?.();
  const followTrainStatus = session.bot.getFollowTrainStatus?.(snapshot) || null;
  const stale = Boolean(
    session.bot.running
    && Number.isFinite(snapshotAgeMs)
    && snapshotAgeMs >= RUNNING_SESSION_STALE_MS
  );

  return {
    id: session.id,
    profileKey: session.profileKey,
    pageId: session.binding.pageId,
    title: session.binding.title,
    url: session.binding.url,
    characterName: session.binding.characterName,
    displayName: session.binding.displayName,
    label: getSessionLabel(session) || session.binding.displayName,
    playerPosition: snapshot?.playerPosition || session.instance?.playerPosition || null,
    playerStats: serializePlayerStats(snapshot?.playerStats),
    visiblePlayerNames: Array.isArray(snapshot?.visiblePlayerNames) ? [...snapshot.visiblePlayerNames] : [],
    visiblePlayers: Array.isArray(snapshot?.visiblePlayers)
      ? snapshot.visiblePlayers.map(serializeCreatureSummary).filter(Boolean)
      : [],
    currentFollowTarget: serializeCreatureSummary(snapshot?.currentFollowTarget || snapshot?.followTarget),
    lastSnapshotAt: Number(session.bot.lastSnapshotAt) || 0,
    snapshotAgeMs: Number.isFinite(snapshotAgeMs) ? snapshotAgeMs : null,
    stale,
    running: session.bot.running,
    connected: session.bot.hasUsableTransport?.() === true,
    ready: Boolean(session.instance?.ready),
    present: Boolean(session.present),
    claimed: Boolean(session.instance?.claimed && !session.instance?.claimedBySelf),
    claimedBySelf: Boolean(session.instance?.claimedBySelf),
    available: Boolean(session.instance?.available),
    cavebotPaused: Boolean(session.config?.cavebotPaused),
    stopAggroHold: Boolean(session.config?.stopAggroHold),
    routeIndex: session.bot.routeIndex || 0,
    routeComplete: session.bot.routeComplete || false,
    routeState: session.bot.getRouteStateTelemetry?.(snapshot) || null,
    decisionTrace: session.bot.getDecisionTrace?.() || null,
    routeResetActive: routeResetStatus.active,
    routeResetPhase: routeResetStatus.phase,
    routeResetTargetIndex: routeResetStatus.targetIndex,
    followTrainStatus,
    rookillerStatus: session.bot.getRookillerStatus?.() || null,
    reconnectStatus: session.bot.getReconnectStatus?.() || null,
    antiIdleStatus: session.bot.getAntiIdleStatus?.() || null,
    alarmOptions: {
      alarmsEnabled: session.config?.alarmsEnabled,
      alarmsPlayerEnabled: session.config?.alarmsPlayerEnabled,
      alarmsPlayerRadiusSqm: session.config?.alarmsPlayerRadiusSqm,
      alarmsPlayerFloorRange: session.config?.alarmsPlayerFloorRange,
      alarmsStaffEnabled: session.config?.alarmsStaffEnabled,
      alarmsStaffRadiusSqm: session.config?.alarmsStaffRadiusSqm,
      alarmsStaffFloorRange: session.config?.alarmsStaffFloorRange,
      alarmsBlacklistEnabled: session.config?.alarmsBlacklistEnabled,
      alarmsBlacklistNames: session.config?.alarmsBlacklistNames,
      alarmsBlacklistRadiusSqm: session.config?.alarmsBlacklistRadiusSqm,
      alarmsBlacklistFloorRange: session.config?.alarmsBlacklistFloorRange,
    },
    runtimeTiming: session.bot.getRuntimeTiming?.() || {},
    overlayFocusIndex: session.bot.overlayFocusIndex ?? null,
    routeName: session.config?.cavebotName || "",
    routeProfile: serializeRouteProfile(session.config, session.routeProfile),
    routeValidation: getSessionRouteValidation(session),
    page: serializePage(session.bot.page),
  };
}

function serializeRuntimeMetrics(activeSession = getActiveSession()) {
  return {
    desktop: serializeRuntimeTimingStore(desktopRuntimeTiming),
    activeSession: activeSession?.bot?.getRuntimeTiming?.() || {},
  };
}

function getRunningSessionStaleSignature(now = Date.now()) {
  return [...sessions.values()]
    .filter((session) => (
      session?.bot?.running
      && Number.isFinite(session.bot.getSnapshotAgeMs?.(now))
      && session.bot.getSnapshotAgeMs(now) >= RUNNING_SESSION_STALE_MS
    ))
    .map((session) => session.id)
    .sort()
    .join("|");
}

function canRecoverRunningSession(session, now = Date.now()) {
  const snapshotAgeMs = Number(session?.bot?.getSnapshotAgeMs?.(now));
  return Boolean(
    session
    && session.bot?.running
    && canSyncSession(session)
    && Number.isFinite(snapshotAgeMs)
    && snapshotAgeMs >= RUNNING_SESSION_RECOVERY_MS
    && !session.staleRecoveryInFlight
    && (now - (Number(session.lastStaleRecoveryAt) || 0)) >= RUNNING_SESSION_RECOVERY_COOLDOWN_MS
  );
}

function serializeState() {
  ensureActiveSessionId();
  const activeSession = getActiveSession();
  const routeResetStatus = activeSession?.bot?.getRouteResetStatus?.() || {
    active: false,
    phase: null,
    targetIndex: null,
  };

  return {
    ...serializeLiveState(activeSession, routeResetStatus),
    options: activeSession?.config || normalizeOptions(defaultConfig || {}),
    routeProfile: activeSession ? serializeRouteProfile(activeSession.config, activeSession.routeProfile) : null,
    routeValidation: activeSession ? getSessionRouteValidation(activeSession) : null,
    routeLibrary: serializeRouteLibrary(),
    accounts: serializeAccountLibrary(),
    trainerCharacters: serializeTrainerCharacterLibrary(),
    monsterCatalogNames: [...minibiaMonsterCatalogNames],
    npcCatalogNames: [...minibiaNpcCatalogNames],
    huntPresets: huntPresetCatalog.map((preset) => ({
      ...preset,
      lootHighlights: Array.isArray(preset.lootHighlights) ? [...preset.lootHighlights] : [],
      tags: Array.isArray(preset.tags) ? [...preset.tags] : [],
      targetProfile: preset.targetProfile ? { ...preset.targetProfile } : null,
    })),
    alwaysOnTop: mainWindow ? mainWindow.isAlwaysOnTop() : activeAlwaysOnTop,
    viewMode: activeViewportMode,
    windowTitle: APP_NAME,
    instances: availableInstances.map(serializeInstance),
  };
}

function serializeLiveState(
  activeSession = getActiveSession(),
  routeResetStatus = activeSession?.bot?.getRouteResetStatus?.() || {
    active: false,
    phase: null,
    targetIndex: null,
  },
  {
    includeLogs = true,
  } = {},
) {
  const serializeStartedAt = getMonotonicNowMs();
  ensureActiveSessionId();
  applySessionRuntimeLoad();

  const liveState = {
    activeSessionId,
    sessions: [...sessions.values()].map(serializeSession),
    running: activeSession?.bot.running || false,
    routeIndex: activeSession?.bot.routeIndex || 0,
    routeComplete: activeSession?.bot.routeComplete || false,
    routeResetActive: routeResetStatus.active,
    routeResetPhase: routeResetStatus.phase,
    routeResetTargetIndex: routeResetStatus.targetIndex,
    reconnectStatus: activeSession?.bot.getReconnectStatus?.() || null,
    antiIdleStatus: activeSession?.bot.getAntiIdleStatus?.() || null,
    overlayFocusIndex: activeSession?.bot.overlayFocusIndex ?? null,
    page: serializePage(activeSession?.bot.page),
    snapshot: serializeSnapshot(activeSession?.bot.lastSnapshot),
    logRevision: Number(activeSession?.logRevision) || 0,
    binding: activeSession
      ? {
        ...activeSession.binding,
        label: getSessionLabel(activeSession) || activeSession.binding.displayName,
      }
      : null,
    selectionRequired: sessions.size === 0,
  };

  if (includeLogs) {
    liveState.logs = activeSession?.logs || [];
  }

  recordDesktopRuntimeTiming("serializeLiveState", getMonotonicNowMs() - serializeStartedAt, {
    includeLogs: Boolean(includeLogs),
    logCount: includeLogs ? Math.max(0, activeSession?.logs?.length || 0) : 0,
    runningSessionCount: getRunningSessionCount(),
    sessionCount: sessions.size,
  });
  liveState.runtimeMetrics = serializeRuntimeMetrics(activeSession);

  return liveState;
}

function buildEventPayload(type, payload = {}) {
  const sessionId = payload?.sessionId ? String(payload.sessionId) : null;
  const base = sessionId ? { sessionId } : {};

  if (type === "error") {
    return {
      ...base,
      error: {
        message: sanitizeLogMessage(payload?.error?.message || payload?.message || "Unknown error") || "Unknown error",
      },
    };
  }

  if (type === "target-archive") {
    return {
      ...base,
      addedMonsters: Array.isArray(payload?.addedMonsters) ? [...payload.addedMonsters] : [],
      totalMonsters: Number(payload?.totalMonsters) || 0,
      addedPlayers: Array.isArray(payload?.addedPlayers) ? [...payload.addedPlayers] : [],
      totalPlayers: Number(payload?.totalPlayers) || 0,
    };
  }

  if (type === "route-recorded") {
    return {
      ...base,
      total: Number(payload?.total) || 0,
    };
  }

  if (type === "anti-idle") {
    return {
      ...base,
      dryRun: Boolean(payload?.dryRun),
      transport: String(payload?.result?.method || payload?.result?.transport || payload?.transport || ""),
      inactivityMs: Math.max(0, Math.trunc(Number(payload?.inactivityMs) || 0)),
    };
  }

  return base;
}

function getRunningSessionCount() {
  return [...sessions.values()].filter((session) => session?.bot?.running).length;
}

function getLiveStatePatchIntervalMs() {
  const runningSessionCount = getRunningSessionCount();
  if (runningSessionCount <= 1) {
    return LIVE_STATE_PATCH_INTERVAL_MS;
  }

  return Math.min(
    MULTI_SESSION_LIVE_STATE_PATCH_MAX_MS,
    LIVE_STATE_PATCH_INTERVAL_MS + ((runningSessionCount - 1) * MULTI_SESSION_LIVE_STATE_PATCH_STEP_MS),
  );
}

function clearLiveStatePatchTimer() {
  if (!liveStatePatchTimer) {
    return;
  }

  clearTimeout(liveStatePatchTimer);
  liveStatePatchTimer = null;
}

function dispatchEvent(type, payload = {}, {
  state = null,
  statePatch = false,
} = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const dispatchStartedAt = getMonotonicNowMs();
  const nextState = state || (statePatch ? serializeLiveState() : serializeState());
  updateWindowTitle();
  mainWindow.webContents.send("bb:event", {
    type,
    payload: buildEventPayload(type, payload),
    state: nextState,
    statePatch,
  });
  if (Array.isArray(nextState?.logs)) {
    lastLivePatchLogSessionId = String(nextState.activeSessionId || "");
    lastLivePatchLogRevision = Number(nextState.logRevision) || 0;
  }
  recordDesktopRuntimeTiming("eventDispatch", getMonotonicNowMs() - dispatchStartedAt, {
    type: String(type || ""),
    statePatch: Boolean(statePatch),
    stateKeyCount: nextState && typeof nextState === "object" ? Object.keys(nextState).length : 0,
  });
  lastStateDispatchAt = Date.now();
}

function shouldIncludeLogsInLivePatch(activeSession = getActiveSession()) {
  const sessionId = String(activeSession?.id || "");
  const revision = Number(activeSession?.logRevision) || 0;
  return sessionId !== lastLivePatchLogSessionId || revision !== lastLivePatchLogRevision;
}

function sendLiveStatePatch() {
  clearLiveStatePatchTimer();
  const patchStartedAt = getMonotonicNowMs();
  const activeSession = getActiveSession();
  const includeLogs = shouldIncludeLogsInLivePatch(activeSession);
  const nextState = serializeLiveState(activeSession, undefined, { includeLogs });
  recordDesktopRuntimeTiming("livePatch", getMonotonicNowMs() - patchStartedAt, {
    includeLogs,
    logCount: includeLogs ? Math.max(0, activeSession?.logs?.length || 0) : 0,
    runningSessionCount: getRunningSessionCount(),
    sessionCount: sessions.size,
  });
  nextState.runtimeMetrics = serializeRuntimeMetrics(activeSession);
  dispatchEvent("state", {}, {
    state: nextState,
    statePatch: true,
  });
}

function scheduleLiveStatePatch() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const waitMs = Math.max(0, getLiveStatePatchIntervalMs() - (Date.now() - lastStateDispatchAt));
  if (waitMs === 0) {
    sendLiveStatePatch();
    return;
  }

  if (liveStatePatchTimer) {
    return;
  }

  liveStatePatchTimer = setTimeout(() => {
    liveStatePatchTimer = null;
    sendLiveStatePatch();
  }, waitMs);
  liveStatePatchTimer.unref?.();
}

function sendEvent(type, payload = {}) {
  clearLiveStatePatchTimer();
  dispatchEvent(type, payload);
}

function chebyshevDistance(from, to) {
  if (!from || !to) return Number.POSITIVE_INFINITY;
  if (from.z !== to.z) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y));
}

function buildAutoWaypoint(position, index) {
  return buildAutoWaypointWithType(position, index, "walk");
}

function buildAutoWaypointWithType(position, index, type = "walk") {
  return {
    x: position.x,
    y: position.y,
    z: position.z,
    label: formatGeneratedWaypointLabel(index),
    type: normalizeWaypointType(type),
    radius: null,
  };
}

function buildAutoTileRule(position, index, policy = "avoid") {
  const normalizedPolicy = String(policy || "avoid").trim().toLowerCase() === "wait"
    ? "wait"
    : "avoid";

  return {
    id: `tile-rule-${index + 1}-${position.x}-${position.y}-${position.z}-${normalizedPolicy}`,
    enabled: true,
    label: `${formatTileRulePolicyLabel(normalizedPolicy)} Rule ${index + 1}`,
    shape: "tile",
    x: position.x,
    y: position.y,
    z: position.z,
    width: 1,
    height: 1,
    trigger: normalizedPolicy === "wait" ? "approach" : "approach",
    policy: normalizedPolicy,
    priority: 100,
    exactness: "exact",
    vicinityRadius: 0,
    waitMs: normalizedPolicy === "wait" ? 1200 : 0,
    cooldownMs: 0,
  };
}

function updateSessionFromInstance(session, instance) {
  const previousId = session.id;
  const previousProfileKey = session.profileKey;
  const previousProfileReady = Boolean(session.profileReady);
  const nextId = buildSessionId(instance);
  const nextProfileReady = Boolean(instance.profileReady);
  const resetProfileState = previousProfileKey !== instance.profileKey
    || previousProfileReady !== nextProfileReady;

  if (activeSessionId === previousId && previousId !== nextId) {
    activeSessionId = nextId;
  }

  session.id = nextId;
  session.instance = { ...instance };
  session.binding = buildBinding(instance);
  session.present = true;

  if (!previousProfileReady && nextProfileReady && session.configLoaded) {
    session.promotedProfileConfig = normalizeOptions(session.config || defaultConfig || {});
  }

  if (resetProfileState) {
    session.profileKey = instance.profileKey;
    session.profileReady = nextProfileReady;
    session.claimOwnerId = buildClaimOwnerId(instance.profileKey);
    session.config = normalizeOptions(defaultConfig || {});
    session.routeProfile = serializeRouteProfile(session.config);
    session.configLoaded = false;
    session.saveChain = Promise.resolve();
    session.lastClaimHeartbeatAt = 0;
    session.bot.setOptions(session.config);
  } else {
    session.profileKey = instance.profileKey;
    session.profileReady = nextProfileReady;
    session.claimOwnerId = buildClaimOwnerId(session.profileKey);
  }

  applyRestoredSessionRecord(session, findRestoredSessionRecord(session, instance));

  return {
    profilePromoted: !previousProfileReady && nextProfileReady,
  };
}

function resolveSessionReference(sessionOrId = null) {
  if (sessionOrId && typeof sessionOrId === "object") {
    return getSessionById(sessionOrId.id) || sessionOrId;
  }

  if (sessionOrId) {
    return getSessionById(sessionOrId);
  }

  return getActiveSession();
}

function findReusableSession(entries, matchedEntryKeys, instance) {
  const nextId = buildSessionId(instance);
  const instancePageId = String(instance?.id || "").trim();
  const instanceCharName = String(instance?.characterName || "").trim().toLowerCase();

  // Tier 1: exact session ID match (stable when page target ID doesn't change).
  for (const [entryKey, session] of entries) {
    if (matchedEntryKeys.has(entryKey)) continue;
    if (session.id === nextId) {
      matchedEntryKeys.add(entryKey);
      return session;
    }
  }

  // Tier 2: binding.pageId – the session was previously linked to this exact
  // browser tab but its session ID changed (e.g. the session was originally
  // keyed by profileKey and was later updated).
  if (instancePageId) {
    for (const [entryKey, session] of entries) {
      if (matchedEntryKeys.has(entryKey)) continue;
      if (String(session.binding?.pageId || "").trim() === instancePageId) {
        matchedEntryKeys.add(entryKey);
        return session;
      }
    }
  }

  // Tier 3: characterName – the page reports a logged-in character whose name
  // matches an existing session. This survives target-ID changes as long as the
  // identity probe succeeds.
  if (instanceCharName) {
    const charCandidates = entries.filter(([entryKey, session]) => (
      !matchedEntryKeys.has(entryKey)
      && String(session.binding?.characterName || "").trim().toLowerCase() === instanceCharName
    ));

    if (charCandidates.length === 1) {
      matchedEntryKeys.add(charCandidates[0][0]);
      return charCandidates[0][1];
    }
  }

  // Tier 4: profileKey – fallback to profile key. When there is exactly one
  // match this is unambiguous. When there are multiple, prefer a running
  // session (preserving active bot state is the highest priority), then the
  // first match for stable ordering.
  const profileCandidates = entries.filter(([entryKey, session]) => (
    !matchedEntryKeys.has(entryKey)
    && session.profileKey === instance.profileKey
  ));

  if (profileCandidates.length === 1) {
    matchedEntryKeys.add(profileCandidates[0][0]);
    return profileCandidates[0][1];
  }

  if (profileCandidates.length > 1) {
    // Prefer the session whose pageId still matches.
    const pageMatch = instancePageId
      ? profileCandidates.find(([, session]) => String(session.binding?.pageId || "").trim() === instancePageId)
      : null;
    if (pageMatch) {
      matchedEntryKeys.add(pageMatch[0]);
      return pageMatch[1];
    }

    // Prefer a running session so we don't discard active bot state.
    const runningMatch = profileCandidates.find(([, session]) => session.bot?.running);
    if (runningMatch) {
      matchedEntryKeys.add(runningMatch[0]);
      return runningMatch[1];
    }

    // Last resort: first candidate for stable ordering.
    matchedEntryKeys.add(profileCandidates[0][0]);
    return profileCandidates[0][1];
  }

  return null;
}

async function ensureSessionConfig(session) {
  if (!session) {
    throw new Error("No live character tabs found.");
  }

  if (session.configLoaded) {
    return session.config;
  }

  return reloadSessionConfig(session);
}

async function reloadSessionConfig(session) {
  if (!session) {
    throw new Error("No live character tabs found.");
  }

  const promotedProfileConfig = session.promotedProfileConfig
    ? normalizeOptions(session.promotedProfileConfig)
    : null;
  const restoredConfig = getRestoredConfig(session.restoredSessionRecord);
  const profileConfig = session.profileReady
    ? await loadConfig({ profileKey: session.profileKey })
    : null;
  await refreshRouteLibrary();
  const fallbackConfig = promotedProfileConfig || restoredConfig;
  session.config = normalizeOptions(profileConfig || fallbackConfig || defaultConfig || {});
  let promotedSaveResult = null;
  if (session.profileReady && !profileConfig && fallbackConfig) {
    promotedSaveResult = await saveConfig(session.config, {
      profileKey: session.profileKey,
    });
  }

  session.promotedProfileConfig = null;
  session.routeProfile = serializeRouteProfile(session.config, promotedSaveResult?.routeProfile);
  session.configLoaded = true;
  session.bot.setOptions(session.config);
  return session.config;
}

async function ensureSessionClaim(session) {
  if (!session?.profileKey || !session.instance) return null;

  if (session.instance.claimed && !session.instance.claimedBySelf) {
    return { ok: false, claim: session.instance.claim || null };
  }

  const label = getSessionLabel(session) || session.binding.displayName;
  const result = await claimCharacter({
    profileKey: session.profileKey,
    characterName: label,
    instanceId: session.claimOwnerId,
    pageId: session.binding.pageId,
    title: APP_NAME,
  });

  session.instance = {
    ...session.instance,
    claimed: !result.ok,
    claimedBySelf: result.ok,
    available: result.ok,
    claim: result.claim || null,
  };
  if (result.ok) {
    session.lastClaimHeartbeatAt = Date.now();
  }

  return result;
}

async function syncSessionClaimHeartbeat(session, { force = false } = {}) {
  if (!session?.profileKey || !session.instance?.claimedBySelf) {
    return;
  }

  const now = Date.now();
  if (!force && now - (Number(session.lastClaimHeartbeatAt) || 0) < CLAIM_HEARTBEAT_MIN_INTERVAL_MS) {
    return;
  }
  session.lastClaimHeartbeatAt = now;

  const label = getSessionLabel(session) || session.binding.displayName;
  const result = await touchCharacterClaim({
    profileKey: session.profileKey,
    characterName: label,
    instanceId: session.claimOwnerId,
    pageId: session.binding.pageId,
    title: APP_NAME,
  });

  if (result?.ok) {
    session.lastClaimHeartbeatAt = Date.now();
    session.instance = {
      ...session.instance,
      claimed: false,
      claimedBySelf: true,
      available: true,
      claim: result.claim || null,
    };
  }

  if (result?.ok && label !== session.binding.characterName) {
    session.binding = {
      ...session.binding,
      characterName: label,
      displayName: label,
    };
  }
}

async function releaseSessionClaim(session) {
  if (!session?.profileKey) return;

  await releaseCharacterClaim({
    profileKey: session.profileKey,
    instanceId: session.claimOwnerId,
  }).catch(() => { });
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

function resolveLeaseProfileKey(lease = {}) {
  const characterKey = buildCharacterKey(lease.characterName || "");
  if (characterKey && characterKey !== "client") {
    return characterKey;
  }

  const instanceTail = String(lease.instanceId || "").split(":").pop();
  const instanceKey = buildCharacterKey(instanceTail || "");
  return instanceKey && instanceKey !== "client"
    ? instanceKey
    : "";
}

async function listRecoverableRouteSpacingLeases(now = Date.now()) {
  const groups = await fs.promises.readdir(ROUTE_SPACING_DIR, { withFileTypes: true }).catch(() => []);
  const recoverableLeases = [];

  for (const group of groups) {
    if (!group.isDirectory()) {
      continue;
    }

    const groupDir = path.join(ROUTE_SPACING_DIR, group.name);
    const entries = await fs.promises.readdir(groupDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const leasePath = path.join(groupDir, entry.name);

      try {
        const lease = JSON.parse(await fs.promises.readFile(leasePath, "utf8"));
        const updatedAt = Number(lease?.updatedAt);
        const ageMs = now - updatedAt;
        if (!Number.isFinite(updatedAt) || ageMs < 0 || ageMs > CRASH_RECOVERY_ROUTE_LEASE_MAX_AGE_MS) {
          continue;
        }

        if (!lease?.running || !lease?.autowalkEnabled || lease?.routeResetActive) {
          continue;
        }

        if (isProcessAlive(lease?.pid)) {
          continue;
        }

        const profileKey = resolveLeaseProfileKey(lease);
        if (!profileKey) {
          continue;
        }

        recoverableLeases.push({
          ageMs,
          lease,
          profileKey,
        });
      } catch { }
    }
  }

  recoverableLeases.sort((left, right) => (
    (Number(right.lease?.updatedAt) || 0) - (Number(left.lease?.updatedAt) || 0)
  ));

  const newestLeaseByProfile = new Map();
  for (const candidate of recoverableLeases) {
    if (!newestLeaseByProfile.has(candidate.profileKey)) {
      newestLeaseByProfile.set(candidate.profileKey, candidate);
    }
  }

  return newestLeaseByProfile;
}

async function recoverRecentRunningSessions() {
  const recoverableLeases = await listRecoverableRouteSpacingLeases();
  if (!recoverableLeases.size) {
    return 0;
  }

  let resumedCount = 0;

  for (const candidateSession of sessions.values()) {
    let session = candidateSession;
    const recovery = recoverableLeases.get(session.profileKey);
    if (!recovery || session.bot.running || !canSyncSession(session)) {
      continue;
    }

    await ensureSessionConfig(session).catch(() => { });

    if (session.config?.cavebotPaused || !session.config?.autowalkEnabled) {
      continue;
    }

    const routeName = String(recovery.lease?.routeName || "").trim();
    const configRouteName = String(session.config?.cavebotName || "").trim();
    if (routeName && configRouteName && routeName !== configRouteName) {
      continue;
    }

    try {
      session = await attachSession(session);
      await refreshSession(session, { emitSnapshot: false, allowRecovery: false });
      session.bot.setOptions(session.config);
      session.bot.start();
      pushSessionLog(
        session,
        `Recovered previous live route after restart (${Math.max(1, Math.ceil(recovery.ageMs / 1000))}s old lease).`,
      );
      resumedCount += 1;
    } catch (error) {
      pushSessionLog(session, `Failed to recover previous live route: ${error.message}`);
    }
  }

  return resumedCount;
}

async function discoverInstances() {
  const sourceConfig = defaultConfig || normalizeOptions();
  const pages = await discoverGamePages(sourceConfig.port, sourceConfig.pageUrlPrefix);

  return pages.map((page, index) => {
    // When the identity probe fails (page loading, CDP timeout, etc.) the
    // page has no characterName and resolveInstanceProfileKey would generate
    // an index-based key that drifts between polls.  If we already have an
    // existing session bound to this exact browser tab (by page target ID),
    // reuse its profileKey so the session stays linked.
    const pageId = String(page?.id || "").trim();
    const hasIdentity = Boolean(String(page?.characterName || "").trim());
    let profileReady = hasIdentity;
    let profileKey = !hasIdentity && pageId
      ? buildCharacterKey(`page-${pageId}`)
      : resolveInstanceProfileKey(page, index);

    if (!hasIdentity && pageId) {
      for (const session of sessions.values()) {
        if (String(session.binding?.pageId || "").trim() === pageId && session.profileKey) {
          profileKey = session.profileKey;
          profileReady = Boolean(session.profileReady);
          break;
        }
      }
    }

    return {
      ...page,
      displayName: page.displayName || page.characterName || `Client ${index + 1}`,
      profileKey,
      profileReady,
      claimed: false,
      claimedBySelf: false,
      available: true,
      claim: null,
    };
  });
}

async function closeSessionPage(session) {
  const sourceConfig = defaultConfig || normalizeOptions();
  const pageId = String(session?.binding?.pageId || "").trim();
  if (!pageId) {
    throw new Error("This session is not linked to a live client tab.");
  }

  const response = await fetch(`http://127.0.0.1:${sourceConfig.port}/json/close/${encodeURIComponent(pageId)}`);
  if (!response.ok) {
    throw new Error(`Unable to close session tab (HTTP ${response.status}).`);
  }
}

async function closeLiveSession(session) {
  session.bot.stop();
  await session.bot.detach().catch(() => { });
  await closeSessionPage(session);
  await releaseSessionClaim(session);

  if (activeSessionId === session.id) {
    const fallbackSession = [...sessions.values()].find((candidate) => candidate.id !== session.id) || null;
    activeSessionId = fallbackSession?.id || null;
  }
  applySessionRuntimeLoad();
  queueSessionStateSave();

  await syncInstanceCatalog({ ensureClaims: true }).catch((error) => {
    pushSessionLog(session, error.message);
  });
  queueSessionStateSave();

  return serializeState();
}

async function syncInstanceCatalog({ ensureClaims = true } = {}) {
  const discovered = await discoverInstances();
  const claimResultsByProfile = new Map();

  if (ensureClaims) {
    for (const instance of discovered) {
      const synthetic = {
        profileKey: instance.profileKey,
        claimOwnerId: buildClaimOwnerId(instance.profileKey),
        binding: buildBinding(instance),
        instance,
        bot: { lastSnapshot: null },
      };

      const result = await ensureSessionClaim(synthetic).catch(() => null);
      if (result) {
        claimResultsByProfile.set(instance.profileKey, {
          ok: result.ok,
          claim: synthetic.instance.claim || result.claim || null,
        });
      }
    }
  }

  const entries = [...sessions.entries()];
  const matchedEntryKeys = new Set();
  const nextSessions = new Map();

  for (const instance of discovered) {
    const claimResult = claimResultsByProfile.get(instance.profileKey) || null;
    const nextInstance = claimResult
      ? {
        ...instance,
        claimed: !claimResult.ok,
        claimedBySelf: Boolean(claimResult.ok),
        available: Boolean(claimResult.ok),
        claim: claimResult.claim,
      }
      : instance;

    const existingSession = findReusableSession(entries, matchedEntryKeys, nextInstance);
    const session = existingSession || createSession(nextInstance);
    updateSessionFromInstance(session, nextInstance);
    nextSessions.set(session.id, session);
  }

  for (const [entryKey, session] of entries) {
    if (matchedEntryKeys.has(entryKey)) continue;

    session.present = false;
    session.instance = null;

    if (session.bot.running || activeSessionId === session.id) {
      nextSessions.set(session.id, session);
      continue;
    }

    await releaseSessionClaim(session);
  }

  sessions = nextSessions;
  syncManagedBrowserLayoutAssignments();
  restoreActiveSessionIdFromState();
  ensureActiveSessionId();
  applySessionRuntimeLoad();

  availableInstances = discovered.map((instance) => {
    const session = getSessionById(buildSessionId(instance));
    return session?.instance || instance;
  });

  updateWindowTitle();
  sendEvent("instances");
  return availableInstances;
}

function getManagedBrowserUserDataDir() {
  const explicitUserDataDir = String(process.env.MINIBOT_MANAGED_BROWSER_USER_DATA_DIR || "").trim();
  if (explicitUserDataDir) {
    return explicitUserDataDir;
  }

  return path.join(app.getPath("userData"), "managed-chrome-profile");
}

function resolveManagedBrowserLaunchUserDataDir(appLauncher = null) {
  const preferredUserDataDir = getManagedBrowserUserDataDir();
  const launcherUserDataDir = extractCommandArgValue(appLauncher?.args, "--user-data-dir=");

  if (
    preferredUserDataDir
    && launcherUserDataDir
    && path.resolve(preferredUserDataDir) === path.resolve(launcherUserDataDir)
  ) {
    return path.join(
      path.dirname(preferredUserDataDir),
      `${path.basename(preferredUserDataDir)}-runtime`,
    );
  }

  return preferredUserDataDir;
}

function extractManagedBrowserSessionOrder(value = null) {
  const url = String(value?.instance?.url || value?.binding?.url || value?.url || "").trim();
  if (url) {
    try {
      const sessionValue = Number(new URL(url).searchParams.get("session"));
      if (Number.isFinite(sessionValue) && sessionValue > 0) {
        return sessionValue;
      }
    } catch {}
  }

  const id = String(value?.id || "").trim();
  if (!id) {
    return Number.MAX_SAFE_INTEGER;
  }

  let hash = 0;
  for (const character of id) {
    hash = ((hash * 33) + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function compareManagedBrowserSessions(left, right) {
  const orderDelta = extractManagedBrowserSessionOrder(left) - extractManagedBrowserSessionOrder(right);
  if (orderDelta !== 0) {
    return orderDelta;
  }

  return String(left?.id || "").localeCompare(String(right?.id || ""));
}

function buildManagedBrowserLayoutBounds(slotIndex, preferredBounds = null) {
  const width = Math.max(1, Math.trunc(Number(preferredBounds?.width) || Number(preferredBounds?.right) - Number(preferredBounds?.left) || 740));
  const height = Math.max(1, Math.trunc(Number(preferredBounds?.height) || Number(preferredBounds?.bottom) - Number(preferredBounds?.top) || 647));
  const normalizedSlotIndex = Math.max(0, Math.trunc(Number(slotIndex) || 0));
  const overflowTier = Math.floor(normalizedSlotIndex / 6);
  const baseSlotIndex = normalizedSlotIndex % 6;

  const primaryDisplay = screen.getPrimaryDisplay?.() || null;
  const workArea = primaryDisplay?.workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const leftX = Math.trunc(workArea.x);
  const topY = Math.trunc(workArea.y);
  const centerX = Math.trunc(workArea.x + Math.max(0, (workArea.width - width) / 2));
  const rightX = Math.trunc(workArea.x + Math.max(0, workArea.width - width));
  const bottomY = Math.trunc(workArea.y + Math.max(0, workArea.height - height));

  const slotPositions = [
    { left: leftX, top: topY },
    { left: leftX, top: bottomY },
    { left: centerX, top: topY },
    { left: centerX, top: bottomY },
    { left: rightX, top: topY },
    { left: rightX, top: bottomY },
  ];
  const cascadeOffset = overflowTier * 28;
  const slotPosition = slotPositions[baseSlotIndex] || slotPositions[0];
  const boundedLeft = Math.min(rightX, Math.max(leftX, slotPosition.left + cascadeOffset));
  const boundedTop = Math.min(bottomY, Math.max(topY, slotPosition.top + cascadeOffset));

  return {
    left: boundedLeft,
    top: boundedTop,
    right: boundedLeft + width,
    bottom: boundedTop + height,
    width,
    height,
    maximized: false,
  };
}

function syncManagedBrowserLayoutAssignments() {
  const presentSessions = [...sessions.values()]
    .filter((session) => session.present)
    .sort(compareManagedBrowserSessions);
  const nextAssignments = new Map();
  const usedSlots = new Set();

  for (const session of presentSessions) {
    const existingSlot = managedBrowserLayoutAssignments.get(session.id);
    if (!Number.isInteger(existingSlot) || existingSlot < 0 || usedSlots.has(existingSlot)) {
      continue;
    }

    nextAssignments.set(session.id, existingSlot);
    usedSlots.add(existingSlot);
  }

  let nextFreeSlot = 0;
  for (const session of presentSessions) {
    if (nextAssignments.has(session.id)) {
      continue;
    }

    while (usedSlots.has(nextFreeSlot)) {
      nextFreeSlot += 1;
    }

    nextAssignments.set(session.id, nextFreeSlot);
    usedSlots.add(nextFreeSlot);
    nextFreeSlot += 1;
  }

  managedBrowserLayoutAssignments = nextAssignments;
  return nextAssignments;
}

function seedManagedBrowserProfile({
  sourceUserDataDir = "",
  targetUserDataDir = "",
  resetProfile = false,
} = {}) {
  const resolvedTargetUserDataDir = String(targetUserDataDir || "").trim();
  if (!resolvedTargetUserDataDir) {
    throw new Error("Managed browser user-data directory is required.");
  }

  const resolvedSourceUserDataDir = String(sourceUserDataDir || "").trim();
  const hasDistinctSource = (
    resolvedSourceUserDataDir
    && path.resolve(resolvedSourceUserDataDir) !== path.resolve(resolvedTargetUserDataDir)
  );

  if (resetProfile) {
    fs.rmSync(resolvedTargetUserDataDir, {
      force: true,
      recursive: true,
    });
  }

  if (!fs.existsSync(resolvedTargetUserDataDir)) {
    if (hasDistinctSource && fs.existsSync(resolvedSourceUserDataDir)) {
      fs.mkdirSync(path.dirname(resolvedTargetUserDataDir), { recursive: true });
      fs.cpSync(resolvedSourceUserDataDir, resolvedTargetUserDataDir, {
        recursive: true,
        force: true,
        filter: (sourcePath) => shouldCopyBrowserProfilePath(sourcePath, resolvedSourceUserDataDir),
      });
    } else {
      fs.mkdirSync(resolvedTargetUserDataDir, { recursive: true });
    }
  }

  for (const relativePath of REMOVABLE_BROWSER_PROFILE_LOCK_PATHS) {
    fs.rmSync(path.join(resolvedTargetUserDataDir, relativePath), {
      force: true,
      recursive: false,
    });
  }

  pruneBrowserProfile(resolvedTargetUserDataDir);

  return resolvedTargetUserDataDir;
}

function resolvePreferredManagedBrowserWindowBounds({
  pageUrlPrefix = "",
  userDataDir = "",
  profileDirectory = "Default",
  appId = "",
} = {}) {
  const resolvedUserDataDir = String(userDataDir || "").trim();
  if (!resolvedUserDataDir) {
    return null;
  }

  const resolvedProfileDirectory = String(profileDirectory || "").trim() || "Default";
  const preferredAppUrlBounds = resolveChromiumAppWindowBounds({
    userDataDir: resolvedUserDataDir,
    profileDirectory: resolvedProfileDirectory,
    appUrl: buildMinibiaPwaSessionUrl(pageUrlPrefix),
  });
  if (preferredAppUrlBounds) {
    return preferredAppUrlBounds;
  }

  const resolvedAppId = String(appId || "").trim();
  if (!resolvedAppId) {
    return null;
  }

  return resolveChromiumAppWindowBounds({
    userDataDir: resolvedUserDataDir,
    profileDirectory: resolvedProfileDirectory,
    appId: resolvedAppId,
  });
}

async function resolveOpenManagedBrowserWindowBounds(port) {
  const preferredSession = (
    (activeSessionId ? getSessionById(activeSessionId) : null)
    || [...sessions.values()].find((session) => session.present)
    || null
  );
  if (!preferredSession?.present || !preferredSession.id) {
    return null;
  }

  return getManagedBrowserWindowBounds({
    port,
    targetId: preferredSession.id,
  }).catch(() => null);
}


async function openManagedSessionTab({ returnSession = false } = {}) {
  const sourceConfig = defaultConfig || normalizeOptions();
  const previousSessionIds = new Set([...sessions.keys()]);
  let child = null;
  let expectedSessionId = "";
  let preferredWindowBounds = await resolveOpenManagedBrowserWindowBounds(sourceConfig.port);

  if (RUNTIME_LAYOUT.portable) {
    const launchSpec = buildPortableClientLaunchSpec({
      appBaseDir: APP_BASE_DIR,
      port: sourceConfig.port,
      pageUrl: buildMinibiaPwaSessionUrl(sourceConfig.pageUrlPrefix),
      // Existing profile locks may belong to a manually opened portable client.
      // The launcher already removes copied seed locks when it creates a fresh
      // runtime profile, so leave live-profile lock arbitration to Chromium.
      cleanupProfileLocks: false,
      env: {
        ...process.env,
        MINIBIA_PROFILE_DIRECTORY: "Default",
      },
    });

    preferredWindowBounds ||= resolvePreferredManagedBrowserWindowBounds({
      pageUrlPrefix: sourceConfig.pageUrlPrefix,
      userDataDir: extractCommandArgValue(launchSpec.args, "--user-data-dir="),
      profileDirectory: extractCommandArgValue(launchSpec.args, "--profile-directory=") || "Default",
      appId: extractCommandArgValue(launchSpec.args, "--app-id="),
    });
    child = spawn(launchSpec.command, launchSpec.args, launchSpec.options);
    child.unref();
  } else {
    const appLauncher = resolveManagedBrowserAppLauncher();

    if (appLauncher) {
      // Check if a browser is already running on the DevTools port.
      // If so, we spawn the app launcher with the SAME user-data-dir so
      // Chrome detects the existing process via SingletonLock and opens a
      // proper app window (with --app-id=) inside it.  The spawned process
      // exits with code 0.
      //
      // If no browser is running yet (first launch), we seed a fresh profile
      // and start the first process.
      const browserAlive = await fetch(`http://127.0.0.1:${sourceConfig.port}/json/version`)
        .then((res) => res.ok, () => false);

      const sourceUserDataDir = extractCommandArgValue(appLauncher.args, "--user-data-dir=");
      const userDataDir = resolveManagedBrowserLaunchUserDataDir(appLauncher);

      if (!browserAlive) {
        // First launch — seed a clean profile.
        seedManagedBrowserProfile({
          sourceUserDataDir,
          targetUserDataDir: userDataDir,
          resetProfile: true,
        });
      }

      const launchSpec = buildManagedBrowserAppLaunchSpec({
        command: appLauncher.command,
        args: replaceCommandArgValue(appLauncher.args, "--user-data-dir=", userDataDir),
        port: sourceConfig.port,
      });

      preferredWindowBounds ||= resolvePreferredManagedBrowserWindowBounds({
        pageUrlPrefix: sourceConfig.pageUrlPrefix,
        userDataDir,
        profileDirectory: extractCommandArgValue(launchSpec.args, "--profile-directory=") || "Default",
        appId: extractCommandArgValue(launchSpec.args, "--app-id="),
      });
      child = spawn(launchSpec.command, launchSpec.args, launchSpec.options);
      child.unref();
    } else {
      // No app launcher. Fall through to the generic browser launch below,
      // which still uses --app so the session is not opened as a browser tab.
    }
  }

  if (!child && !expectedSessionId) {
    const browserPath = resolveBrowserExecutable();
    if (!browserPath) {
      throw new Error("Chrome executable not found. Set MINIBOT_BROWSER_PATH, install Chrome/Chromium, or launch a browser on the configured DevTools port.");
    }

    const userDataDir = getManagedBrowserUserDataDir();
    fs.mkdirSync(userDataDir, { recursive: true });

    const launchSpec = buildManagedBrowserLaunchSpec({
      browserPath,
      userDataDir,
      port: sourceConfig.port,
      pageUrlPrefix: buildMinibiaPwaSessionUrl(sourceConfig.pageUrlPrefix),
      openAsApp: true,
    });

    preferredWindowBounds ||= resolvePreferredManagedBrowserWindowBounds({
      pageUrlPrefix: sourceConfig.pageUrlPrefix,
      userDataDir,
      profileDirectory: "Default",
    });
    child = spawn(launchSpec.command, launchSpec.args, launchSpec.options);
    child.unref();
  }

  try {
    const nextSessionId = await waitForManagedBrowserSession({
      childProcess: child,
      previousSessionIds,
      expectedSessionId,
      ignoreExitCodeZero: true,
      syncInstances: () => syncInstanceCatalog({ ensureClaims: true }),
      listSessionIds: () => [...sessions.values()]
        .filter((session) => session.present)
        .map((session) => session.id),
      pageUrlPrefix: sourceConfig.pageUrlPrefix,
      port: sourceConfig.port,
      sleepImpl: sleep,
    });

    const nextSession = getSessionById(nextSessionId)
      || [...sessions.values()].find((session) => (
        session.present && !previousSessionIds.has(String(session.id))
      ))
      || null;

    if (!nextSession) {
      throw new Error("Managed browser opened, but the new session was lost before Minibot could attach.");
    }

    const layoutSlotIndex = syncManagedBrowserLayoutAssignments().get(nextSession.id);
    const targetWindowBounds = Number.isInteger(layoutSlotIndex)
      ? buildManagedBrowserLayoutBounds(layoutSlotIndex, preferredWindowBounds)
      : preferredWindowBounds;

    if (targetWindowBounds) {
      await setManagedBrowserWindowBounds({
        port: sourceConfig.port,
        targetId: nextSession.id,
        bounds: targetWindowBounds,
      }).catch(() => false);
    }

    activeSessionId = nextSession.id;
    applySessionRuntimeLoad();
    await ensureSessionConfig(nextSession).catch(() => { });
    queueSessionStateSave();
    return returnSession ? nextSession : serializeState();
  } catch (error) {
    await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });
    throw error;
  }
}

async function attachSession(sessionOrId) {
  let session = resolveSessionReference(sessionOrId);

  if (!session) {
    throw new Error("No live character tabs found.");
  }

  await ensureSessionConfig(session);

  if (!session.instance) {
    await syncInstanceCatalog({ ensureClaims: true });
    session = getSessionById(session.id) || [...sessions.values()].find((candidate) => candidate.profileKey === session.profileKey) || null;
  }

  if (!session?.instance) {
    throw new Error("Selected game instance is no longer available.");
  }

  if (session.instance.claimed && !session.instance.claimedBySelf) {
    const label = getSessionLabel(session) || session.binding.displayName;
    throw new Error(`${label} is already linked to another Minibot window.`);
  }

  const claimResult = await ensureSessionClaim(session);
  if (claimResult && !claimResult.ok) {
    const label = getSessionLabel(session) || session.binding.displayName;
    throw new Error(`${label} is already linked to another Minibot window.`);
  }

  session.bot.setOptions(session.config);
  await session.bot.attachToPage(session.instance);
  await syncSessionClaimHeartbeat(session);
  return session;
}

function applySessionSnapshotIdentity(session, snapshot) {
  if (!session) return;

  const nextName = snapshot?.playerName ? String(snapshot.playerName).trim() : "";
  if (!nextName || nextName === session.binding.characterName) {
    return;
  }

  session.binding = {
    ...session.binding,
    characterName: nextName,
    displayName: nextName,
  };
}

async function maybeRecordWaypoint(session, snapshot) {
  if (!session?.config?.routeRecording) return false;
  if (session.bot.running && session.config.autowalkEnabled) return false;

  const position = snapshot?.playerPosition;
  if (!position) return false;

  const waypoints = Array.isArray(session.config.waypoints) ? session.config.waypoints : [];
  const lastWaypoint = waypoints[waypoints.length - 1] || null;
  const step = Math.max(1, Math.trunc(Number(session.config.routeRecordStep) || 1));

  if (lastWaypoint && chebyshevDistance(lastWaypoint, position) < step) {
    return false;
  }

  const waypoint = buildAutoWaypoint(position, waypoints.length);
  const nextConfig = {
    ...session.config,
    waypoints: [...waypoints, waypoint],
  };

  await persistSessionConfig(session, nextConfig);
  pushSessionLog(session, `Recorded waypoint ${waypoint.label}: ${waypoint.x},${waypoint.y},${waypoint.z}`);
  sendEvent("route-recorded", { sessionId: session.id, waypoint, total: nextConfig.waypoints.length });
  return true;
}

async function refreshSession(sessionOrId, {
  allowRecovery = true,
  emitSnapshot = true,
  background = false,
} = {}) {
  let session = resolveSessionReference(sessionOrId);
  if (!session) return null;

  const refreshKey = session.id;
  if (refreshingSessions.has(refreshKey)) {
    return session.bot.lastSnapshot || null;
  }

  refreshingSessions.add(refreshKey);
  try {
    session = await attachSession(session);

    const snapshot = await session.bot.refresh({ emitSnapshot, background });
    applySessionSnapshotIdentity(session, snapshot);
    await syncSessionClaimHeartbeat(session);
    return snapshot;
  } catch (error) {
    if (!allowRecovery) {
      throw error;
    }

    await session.bot.detach().catch(() => { });
    await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });

    session = getSessionById(refreshKey)
      || [...sessions.values()].find((candidate) => candidate.profileKey === session.profileKey)
      || null;

    if (!session?.instance) {
      throw error;
    }

    session = await attachSession(session);
    const snapshot = await session.bot.refresh({ emitSnapshot, background });
    applySessionSnapshotIdentity(session, snapshot);
    await syncSessionClaimHeartbeat(session);
    return snapshot;
  } finally {
    refreshingSessions.delete(refreshKey);
  }
}

async function startSessionBot(sessionOrId, {
  emitState = true,
  ensureTrainerEnabled = false,
} = {}) {
  let session = resolveSessionReference(sessionOrId);
  if (!session) {
    throw new Error("No live character tab selected.");
  }

  await ensureSessionConfig(session);
  if (session.bot.running) {
    if (emitState) {
      sendEvent("state", { sessionId: session.id });
    }
    return session;
  }

  await reloadSessionConfig(session);
  const startPatch = {};
  if (session.config?.cavebotPaused) {
    startPatch.cavebotPaused = false;
  }
  if (session.config?.stopAggroHold) {
    startPatch.stopAggroHold = false;
  }
  if (ensureTrainerEnabled && session.config?.trainerEnabled !== true) {
    startPatch.trainerEnabled = true;
  }

  if (Object.keys(startPatch).length > 0) {
    await persistSessionConfig(session, {
      ...session.config,
      ...startPatch,
    }, { emitState: false });

    const clearedStates = [
      startPatch.cavebotPaused === false ? "cavebot pause" : "",
      startPatch.stopAggroHold === false ? "aggro hold" : "",
      startPatch.trainerEnabled === true ? "trainer module" : "",
    ].filter(Boolean);
    if (clearedStates.length) {
      pushSessionLog(
        session,
        `Start armed ${clearedStates.join(" and ")} so the live loop resumes with the saved session config.`,
      );
    }
  }

  assertRouteValidationAcknowledged(session);

  session = await attachSession(session);
  await refreshSession(session);
  session.bot.setOptions(session.config);
  session.bot.start();
  applySessionRuntimeLoad();
  queueSessionStateSave();

  if (emitState) {
    sendEvent("state", { sessionId: session.id });
  }

  return session;
}

function findTrainerRosterEntry(reference = "", roster = trainerCharacterLibrary) {
  const requestedKey = normalizeTrainerIdentityKey(reference);
  if (!requestedKey) {
    return null;
  }

  return (Array.isArray(roster) ? roster : []).find((entry) => (
    normalizeTrainerIdentityKey(entry?.profileKey) === requestedKey
    || normalizeTrainerIdentityKey(entry?.characterName) === requestedKey
    || normalizeTrainerIdentityKey(entry?.displayName) === requestedKey
  )) || null;
}

function resolveTrainerDuoMember(member = null) {
  const requestedProfileKey = String(member?.profileKey || "").trim();
  const requestedName = String(member?.characterName || member?.displayName || member?.name || member || "").trim();
  const matchedEntry = findTrainerRosterEntry(requestedProfileKey || requestedName, trainerCharacterLibrary);
  const profileKey = String(matchedEntry?.profileKey || requestedProfileKey || buildCharacterKey(requestedName)).trim();
  const characterName = String(
    matchedEntry?.characterName
    || matchedEntry?.displayName
    || requestedName
    || formatTrainerProfileDisplayName(profileKey),
  ).trim();

  if (!profileKey || !characterName) {
    throw new Error("Trainer duo member requires a saved character name.");
  }

  return {
    profileKey,
    characterName,
  };
}

async function writeTrainerDuoMember(member, partnerName, {
  enabled = true,
} = {}) {
  const currentConfig = await loadConfig({ profileKey: member.profileKey }).catch(() => null);
  const nextConfig = normalizeOptions({
    ...(currentConfig || {}),
    cavebotName: "Trainer",
    cavebotPaused: false,
    trainerEnabled: enabled,
    trainerAutoPartyEnabled: true,
    trainerReconnectEnabled: true,
    trainerPartnerName: enabled ? partnerName : "",
  });

  await saveConfig(nextConfig, {
    profileKey: member.profileKey,
    previousCavebotName: currentConfig?.cavebotName || null,
  });
}

async function saveTrainerDuoPreset(duo = {}) {
  await refreshTrainerCharacterLibrary();
  const left = resolveTrainerDuoMember({
    profileKey: duo?.leftProfileKey,
    characterName: duo?.leftName || duo?.leftCharacterName,
  });
  const right = resolveTrainerDuoMember({
    profileKey: duo?.rightProfileKey,
    characterName: duo?.rightName || duo?.rightCharacterName,
  });

  if (normalizeTrainerIdentityKey(left.characterName) === normalizeTrainerIdentityKey(right.characterName)) {
    throw new Error("Trainer duo requires two different characters.");
  }

  await writeTrainerDuoMember(left, right.characterName, { enabled: true });
  await writeTrainerDuoMember(right, left.characterName, { enabled: true });
  await refreshTrainerCharacterLibrary();
}

async function deleteTrainerDuoPreset(duo = {}) {
  await refreshTrainerCharacterLibrary();
  const left = resolveTrainerDuoMember({
    profileKey: duo?.leftProfileKey,
    characterName: duo?.leftName || duo?.leftCharacterName,
  });
  const right = resolveTrainerDuoMember({
    profileKey: duo?.rightProfileKey,
    characterName: duo?.rightName || duo?.rightCharacterName,
  });

  await writeTrainerDuoMember(left, "", { enabled: false });
  await writeTrainerDuoMember(right, "", { enabled: false });
  await refreshTrainerCharacterLibrary();
}

async function automateTrainerSessionLogin(instance, account, characterName) {
  if (!instance?.webSocketDebuggerUrl) {
    throw new Error("Managed trainer session is missing a debugger socket.");
  }
  if (!account || account.loginMethod !== "account-password") {
    throw new Error(`${characterName} requires an account-password registry entry for cold-start login.`);
  }
  if (!String(account.loginName || "").trim() || !String(account.password || "").trim()) {
    throw new Error(`${characterName} is missing a stored login or password in the account registry.`);
  }

  const cdp = new CdpPage(instance.webSocketDebuggerUrl);
  const expression = buildTrainerBootstrapStepExpression({
    loginName: account.loginName,
    password: account.password,
    characterName,
  });
  let lastState = "";

  try {
    await cdp.connect();
    const deadline = Date.now() + TRAINER_BOOTSTRAP_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const result = await cdp.evaluate(expression);
      const state = String(result?.state || "").trim();
      if (state) {
        lastState = state;
      }

      if (state === "ready") {
        return result;
      }

      if (state === "wrong-character") {
        throw new Error(`Managed trainer session opened ${result?.inGameName || "another character"} instead of ${characterName}.`);
      }

      if (state === "character-missing") {
        throw new Error(`${characterName} was not found in the character selection list.`);
      }

      if (state === "login-rate-limited") {
        throw new Error(`${characterName} login is rate-limited: ${String(result?.message || "Too many login attempts.").trim()}`);
      }

      if (state === "login-error") {
        throw new Error(`${characterName} login failed: ${String(result?.message || "Authentication error.").trim()}`);
      }

      await sleep(TRAINER_BOOTSTRAP_POLL_MS);
    }
  } finally {
    cdp.close();
  }

  throw new Error(`Timed out while opening ${characterName}${lastState ? ` (${lastState})` : ""}.`);
}

async function waitForTrainerLaunchSettle(session, {
  delayMs = TRAINER_POST_LAUNCH_LOGIN_DELAY_MS,
  characterName = "",
} = {}) {
  const normalizedDelayMs = Math.max(0, Math.trunc(Number(delayMs) || 0));
  if (normalizedDelayMs <= 0) {
    return;
  }

  pushSessionLog(
    session,
    `Waiting ${Math.ceil(normalizedDelayMs / 1000)}s for ${characterName || "the launched trainer client"} to finish loading before login.`,
  );
  await sleep(normalizedDelayMs);
}

async function waitForTrainerCharacterSession(entry, {
  timeoutMs = TRAINER_BOOTSTRAP_TIMEOUT_MS,
} = {}) {
  const deadline = Date.now() + Math.max(1_000, Math.trunc(Number(timeoutMs) || TRAINER_BOOTSTRAP_TIMEOUT_MS));

  while (Date.now() < deadline) {
    await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });
    const session = getTrainerCharacterSession(entry);
    if (session?.instance) {
      return session;
    }

    await sleep(TRAINER_BOOTSTRAP_POLL_MS);
  }

  return null;
}

async function getTrainerCharacterBootstrapState(entry) {
  const session = getTrainerCharacterSession(entry);
  const account = findTrainerRosterAccount(entry, accountLibrary);
  const characterName = resolveTrainerCharacterName(entry, session, account);
  const hasLaunchCredentials = hasTrainerLaunchCredentials(account);

  if (session?.instance?.claimed && !session.instance.claimedBySelf) {
    throw new Error(`${characterName} is already linked to another Minibot window.`);
  }

  if (!session?.instance) {
    return {
      session,
      account,
      characterName,
      hasLaunchCredentials,
      snapshot: null,
      ready: false,
    };
  }

  const snapshot = await refreshSession(session, {
    emitSnapshot: false,
  }).catch(() => null);
  const desiredCharacterKey = normalizeTrainerIdentityKey(characterName);
  const liveCharacterKey = normalizeTrainerIdentityKey(snapshot?.playerName || "");

  return {
    session,
    account,
    characterName,
    hasLaunchCredentials,
    snapshot,
    ready: Boolean(snapshot?.ready && (!desiredCharacterKey || liveCharacterKey === desiredCharacterKey)),
  };
}

async function ensureTrainerCharacterSession(entry, {
  launchedSession = null,
  launchedAt = 0,
} = {}) {
  let {
    session,
    account,
    characterName,
    hasLaunchCredentials,
    snapshot,
    ready,
  } = await getTrainerCharacterBootstrapState(entry);

  if (ready && session?.instance) {
    return session;
  }

  session ||= launchedSession;

  if (!session?.instance && !hasLaunchCredentials) {
    throw new Error(`${characterName} has no stored account-password login, so Minibot cannot cold-start that trainer tab yet.`);
  }

  if (session?.instance?.claimed && !session.instance.claimedBySelf) {
    throw new Error(`${characterName} is already linked to another Minibot window.`);
  }

  if (session?.instance) {
    if (!hasLaunchCredentials) {
      throw new Error(`${characterName} is open, but it still needs a stored account-password login before trainer bootstrap can continue.`);
    }
  } else {
    session = await openManagedSessionTab({ returnSession: true });
    launchedAt = Date.now();
  }

  const settleRemainingMs = launchedAt > 0
    ? Math.max(0, TRAINER_POST_LAUNCH_LOGIN_DELAY_MS - (Date.now() - launchedAt))
    : 0;
  if (settleRemainingMs > 0) {
    await waitForTrainerLaunchSettle(session, {
      characterName,
      delayMs: settleRemainingMs,
    });
  }

  if (hasLaunchCredentials) {
    pushSessionLog(
      session,
      `Trainer bootstrap detected ${snapshot?.connection?.lifecycle || (launchedAt > 0 ? "a launched trainer client" : "an unfinished client load")} and is re-running login for ${characterName}.`,
    );
  }
  await automateTrainerSessionLogin(session?.instance || null, account, characterName);
  session = await waitForTrainerCharacterSession({
    ...entry,
    characterName,
  });

  if (!session?.instance) {
    throw new Error(`Managed trainer session opened for ${characterName}, but Minibot could not reattach it after login.`);
  }

  return session;
}

async function startTrainerCharacterGroup(reference) {
  await refreshAccountLibrary();
  await refreshTrainerCharacterLibrary();
  await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });

  const referenceEntry = findTrainerRosterEntry(reference, trainerCharacterLibrary);
  if (!referenceEntry) {
    throw new Error("Saved trainer character not found.");
  }

  const launchGroup = resolveTrainerRosterLaunchGroup(trainerCharacterLibrary, referenceEntry);
  if (!launchGroup.length) {
    throw new Error("No linked trainer characters were found for that saved trainer entry.");
  }

  const resolvedSessions = [];
  const pendingBootstrap = [];
  for (const entry of launchGroup) {
    const bootstrapState = await getTrainerCharacterBootstrapState(entry);
    if (bootstrapState.ready && bootstrapState.session?.instance) {
      resolvedSessions.push(bootstrapState.session);
      continue;
    }

    if (bootstrapState.session?.instance) {
      pendingBootstrap.push({
        entry,
        launchedSession: bootstrapState.session,
        launchedAt: 0,
      });
      continue;
    }

    if (!bootstrapState.hasLaunchCredentials) {
      throw new Error(`${bootstrapState.characterName} has no stored account-password login, so Minibot cannot cold-start that trainer tab yet.`);
    }

    pendingBootstrap.push({
      entry,
      launchedSession: await openManagedSessionTab({ returnSession: true }),
      launchedAt: Date.now(),
    });
  }

  for (const pendingEntry of pendingBootstrap) {
    resolvedSessions.push(await ensureTrainerCharacterSession(
      pendingEntry.entry,
      pendingEntry,
    ));
  }

  const startedSessions = [];
  for (const session of resolvedSessions) {
    startedSessions.push(await startSessionBot(session, {
      emitState: false,
      ensureTrainerEnabled: true,
    }));
  }

  const primarySession = startedSessions[0] || null;
  if (primarySession?.id) {
    activeSessionId = primarySession.id;
  }

  queueSessionStateSave();
  await refreshTrainerCharacterLibrary();
  await syncSessionSnapshots({
    candidateSessions: startedSessions,
    emitActiveSnapshot: true,
    background: true,
  }).catch(() => false);
  return serializeState();
}

function maybeAutoStartTrainerRoster() {
  if (trainerRosterAutoStartTriggered) {
    return;
  }

  const reference = String(process.env.MINIBOT_AUTO_START_TRAINER_ROSTER || "").trim();
  if (!reference) {
    return;
  }

  trainerRosterAutoStartTriggered = true;
  setTimeout(() => {
    startTrainerCharacterGroup(reference)
      .then(() => {
        sendEvent("state", { scope: "auto-start-trainer-roster" });
      })
      .catch((error) => {
        console.error(`[trainer-auto-start] ${error?.stack || error?.message || error}`);
      });
  }, 1_000);
}

async function maybeRepairSessionValueSlot(session, snapshot, { background = false } = {}) {
  if (background) return snapshot;
  if (!session || session.bot.running) return snapshot;
  if (!snapshot?.ready) return snapshot;

  const repairAction = session.bot.chooseUrgentValueSlotRepair(snapshot);
  if (!repairAction) {
    return snapshot;
  }

  const repairResult = await session.bot.convertCurrency(repairAction);
  if (!repairResult?.ok) {
    return snapshot;
  }

  return refreshSession(session, { emitSnapshot: false });
}

function canSyncSession(session) {
  return Boolean(
    session
    && session.present
    && session.instance
    && (!session.instance.claimed || session.instance.claimedBySelf),
  );
}

async function syncSessionSnapshots({
  candidateSessions = [...sessions.values()],
  emitActiveSnapshot = false,
  sendStateEvent = false,
  stateScope = "session-sync",
  background = false,
  repairValueSlot = true,
} = {}) {
  const syncableSessions = candidateSessions.filter(canSyncSession);
  if (!syncableSessions.length) {
    return false;
  }

  const activeId = String(activeSessionId || "");
  let updated = false;

  await Promise.all(
    syncableSessions.map(async (session) => {
      try {
        const snapshot = await refreshSession(session, {
          emitSnapshot: emitActiveSnapshot && String(session.id) === activeId,
          background,
        });
        if (repairValueSlot) {
          await maybeRepairSessionValueSlot(session, snapshot, { background });
        }
        updated = true;
      } catch (error) {
        pushSessionLog(session, error.message);
        sendEvent("error", { sessionId: session.id, error: { message: error.message } });
      }
    }),
  );

  if (updated && sendStateEvent) {
    sendEvent("state", { scope: stateScope });
  }

  return updated;
}

async function recoverRunningSession(sessionOrId, { now = Date.now() } = {}) {
  let session = resolveSessionReference(sessionOrId);
  if (!session || !canRecoverRunningSession(session, now)) {
    return false;
  }

  session.staleRecoveryInFlight = true;
  session.lastStaleRecoveryAt = now;
  const shouldRestart = session.bot.running;
  const label = getSessionLabel(session) || session.binding.displayName || session.id;

  try {
    pushSessionLog(session, `Session stale for ${Math.max(1, Math.ceil(session.bot.getSnapshotAgeMs(now) / 1000))}s; reattaching background transport.`);
    await session.bot.detach().catch(() => { });
    session = await attachSession(session);
    await refreshSession(session, { emitSnapshot: false });

    if (shouldRestart && !session.bot.running) {
      session.bot.start();
    }

    pushSessionLog(session, `Background session recovered for ${label}.`);
    return true;
  } catch (error) {
    pushSessionLog(session, `Background session recovery failed: ${error.message}`);
    sendEvent("error", { sessionId: session.id, error: { message: error.message } });
    return false;
  } finally {
    session.staleRecoveryInFlight = false;
  }
}

async function recoverStaleRunningSessions(now = Date.now()) {
  const recoverableSessions = [...sessions.values()].filter((session) => canRecoverRunningSession(session, now));
  if (!recoverableSessions.length) {
    return false;
  }

  const results = await Promise.all(
    recoverableSessions.map((session) => recoverRunningSession(session, { now })),
  );

  return results.some(Boolean);
}

async function persistSessionConfig(sessionOrId, nextConfig, { emitState = true, routeRenameFrom = undefined } = {}) {
  const session = resolveSessionReference(sessionOrId);
  if (!session) {
    throw new Error("No live character tab selected.");
  }

  const previousConfig = normalizeOptions(session.config || {});
  const previousCavebotName = routeRenameFrom === undefined
    ? previousConfig.cavebotName || null
    : routeRenameFrom;
  session.config = normalizeOptions(nextConfig);
  session.configLoaded = true;
  session.bot.setOptions(session.config);

  const snapshot = session.config;
  session.saveChain = session.saveChain
    .catch(() => { })
    .then(async () => {
      const saveResult = session.profileReady
        ? await saveConfig(snapshot, {
          profileKey: session.profileKey,
          previousCavebotName,
        })
        : await saveRouteProfile(snapshot, {
          previousName: previousCavebotName,
        });
      if (shouldRefreshRouteLibraryAfterSave(saveResult)) {
        await refreshRouteLibrary();
      }
      return saveResult;
    });

  const saveResult = await session.saveChain;
  session.routeProfile = serializeRouteProfile(session.config, saveResult?.routeProfile);
  await refreshTrainerCharacterLibrary();
  queueSessionStateSave();

  if (saveResult?.routeProfile?.action === "created") {
    pushSessionLog(session, `Created cavebot file ${saveResult.routeProfile.fileName}`);
  } else if (saveResult?.routeProfile?.action === "renamed") {
    pushSessionLog(session, `Renamed cavebot file to ${saveResult.routeProfile.fileName}`);
  }

  if (emitState) {
    sendEvent("state", { sessionId: session.id });
  }
}

async function maybeArchiveVisibleSightings(session, snapshot) {
  if (!session) {
    return {
      addedMonsters: [],
      addedPlayers: [],
    };
  }

  if (!session.configLoaded) {
    await ensureSessionConfig(session);
  }

  const livePlayerNames = getLiveCharacterNames({ excludeSession: session });
  const visibleMonsterNames = mergeMonsterNames(snapshot?.visibleMonsterNames || snapshot?.visibleCreatureNames || []);
  const visiblePlayerNames = mergeMonsterNames(snapshot?.visiblePlayerNames || [], livePlayerNames);
  const nextPlayerArchive = trimMonsterNames(mergeMonsterNames(session.config.playerArchive || [], visiblePlayerNames));
  const nextPlayerKeys = new Set(nextPlayerArchive.map((name) => name.toLowerCase()));
  const nextMonsterArchive = trimMonsterNames(
    mergeMonsterNames(session.config.monsterArchive || [], visibleMonsterNames)
      .filter((name) => !nextPlayerKeys.has(name.toLowerCase())),
  );
  const currentMonsterArchive = trimMonsterNames(
    mergeMonsterNames(session.config.monsterArchive || [])
      .filter((name) => !nextPlayerKeys.has(name.toLowerCase())),
  );
  const currentPlayerArchive = trimMonsterNames(session.config.playerArchive || []);
  const addedMonsters = diffMonsterNames(currentMonsterArchive, nextMonsterArchive);
  const addedPlayers = diffMonsterNames(session.config.playerArchive || [], nextPlayerArchive);
  const archiveChanged = !sameMonsterNameList(session.config.monsterArchive || [], nextMonsterArchive)
    || !sameMonsterNameList(currentPlayerArchive, nextPlayerArchive);

  if (!archiveChanged) {
    return {
      addedMonsters,
      addedPlayers,
    };
  }

  await persistSessionConfig(session, {
    ...session.config,
    monsterArchive: nextMonsterArchive,
    playerArchive: nextPlayerArchive,
  }, { emitState: false });

  if (addedMonsters.length) {
    pushSessionLog(
      session,
      `Archived seen monster${addedMonsters.length === 1 ? "" : "s"}: ${addedMonsters.join(", ")}`,
    );
  }

  if (addedPlayers.length) {
    pushSessionLog(
      session,
      `Archived seen player${addedPlayers.length === 1 ? "" : "s"}: ${addedPlayers.join(", ")}`,
    );
  }

  if (addedMonsters.length || addedPlayers.length) {
    sendEvent("target-archive", {
      sessionId: session.id,
      addedMonsters,
      totalMonsters: nextMonsterArchive.length,
      addedPlayers,
      totalPlayers: nextPlayerArchive.length,
    });
  } else {
    sendEvent("state", { sessionId: session.id });
  }

  return {
    addedMonsters,
    addedPlayers,
  };
}

async function maybeRunBrowserStorageHygiene(session, { force = false } = {}) {
  if (!session?.bot || session.browserStorageHygieneSupported === false) {
    return null;
  }

  if (session.browserStorageHygieneInFlight) {
    return null;
  }

  const now = Date.now();
  if (!force && now - (Number(session.lastBrowserStorageHygieneAt) || 0) < BROWSER_STORAGE_HYGIENE_INTERVAL_MS) {
    return null;
  }

  session.browserStorageHygieneInFlight = true;
  try {
    const result = await session.bot.performStorageHygiene();
    session.lastBrowserStorageHygieneAt = now;

    const methodUnavailable = result?.reason === "storage hygiene unavailable"
      || (Array.isArray(result?.errors) && result.errors.some((message) => /method not found/i.test(String(message))));
    if (methodUnavailable) {
      session.browserStorageHygieneSupported = false;
    }

    return result;
  } catch (error) {
    if (now - (Number(session.lastBrowserStorageHygieneErrorAt) || 0) >= BROWSER_STORAGE_HYGIENE_INTERVAL_MS) {
      pushSessionLog(session, `Browser storage trim failed: ${error instanceof Error ? error.message : String(error)}`);
      session.lastBrowserStorageHygieneErrorAt = now;
    }
    return null;
  } finally {
    session.browserStorageHygieneInFlight = false;
  }
}

function installSessionListeners(session) {
  session.bot.on((event) => {
    if (["attached", "detached", "started", "stopped"].includes(event.type)) {
      applySessionRuntimeLoad();
    }

    if (event.type === "log") {
      pushSessionLog(session, event.payload.message);
      scheduleLiveStatePatch();
      return;
    }

    if (event.type === "error") {
      pushSessionLog(session, event.payload.error.message);
    }

    if (event.type === "attached") {
      const attachedLabel = getSessionLabel(session) || session.binding.displayName || event.payload.page.url;
      pushSessionLog(session, `Attached to ${attachedLabel}`);
      void maybeRunBrowserStorageHygiene(session, { force: true }).catch(() => {});
    }

    if (event.type === "snapshot") {
      applySessionSnapshotIdentity(session, event.payload.snapshot);
      void maybeArchiveVisibleSightings(session, event.payload.snapshot).catch((error) => {
        pushSessionLog(session, error.message);
        sendEvent("error", { sessionId: session.id, error: { message: error.message } });
      });
      void maybeRecordWaypoint(session, event.payload.snapshot).catch((error) => {
        pushSessionLog(session, error.message);
        sendEvent("error", { sessionId: session.id, error: { message: error.message } });
      });
      void maybeRunBrowserStorageHygiene(session).catch(() => {});
      scheduleLiveStatePatch();
      return;
    }

    if (event.type === "rookiller-triggered") {
      void persistSessionConfig(session, {
        ...session.config,
        autowalkEnabled: false,
      }, { emitState: false }).catch((error) => {
        pushSessionLog(session, error.message);
        sendEvent("error", { sessionId: session.id, error: { message: error.message } });
      });
    }

    if (event.type === "rookiller-disconnect") {
      void closeLiveSession(session).catch((error) => {
        pushSessionLog(session, error.message);
        sendEvent("error", { sessionId: session.id, error: { message: error.message } });
      });
    }

    sendEvent(event.type, event.type === "error"
      ? {
        sessionId: session.id,
        error: { message: event.payload?.error?.message || "Unknown error" },
      }
      : {
        sessionId: session.id,
        ...(event.payload && typeof event.payload === "object" ? event.payload : {}),
      });
  });
}

function moveListItem(items, index, delta) {
  const next = [...items];
  const to = index + delta;

  if (index < 0 || index >= next.length || to < 0 || to >= next.length || delta === 0) {
    return {
      items: next,
      moved: false,
      nextIndex: index,
    };
  }

  const [item] = next.splice(index, 1);
  next.splice(to, 0, item);
  return {
    items: next,
    moved: true,
    nextIndex: to,
  };
}

function getViewport(mode = activeViewportMode) {
  return APP_VIEWPORTS[mode] || APP_VIEWPORTS.desk;
}

function applyViewportMode(mode = activeViewportMode) {
  const viewportMode = APP_VIEWPORTS[mode] ? mode : "desk";
  const viewport = getViewport(viewportMode);
  activeViewportMode = viewportMode;

  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  mainWindow.setMinimumSize(viewport.width, viewport.height);
  mainWindow.setMaximumSize(viewport.width, viewport.height);
  mainWindow.setContentSize(viewport.width, viewport.height);
  mainWindow.setAspectRatio(viewport.width / viewport.height);
  mainWindow.center();
  return true;
}

function createWindow() {
  const icon = resolveAppIcon();
  const viewport = getViewport();
  activeAlwaysOnTop = restoredSessionState?.alwaysOnTop !== false;

  mainWindow = new BrowserWindow({
    show: false,
    useContentSize: true,
    width: viewport.width,
    height: viewport.height,
    minWidth: viewport.width,
    minHeight: viewport.height,
    maxWidth: viewport.width,
    maxHeight: viewport.height,
    backgroundColor: "#00000000",
    transparent: true,
    autoHideMenuBar: true,
    title: APP_NAME,
    frame: false,
    alwaysOnTop: activeAlwaysOnTop,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
      webSecurity: true,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  configureMainWindowSecurity(mainWindow);

  if (icon) {
    mainWindow.setIcon(icon);
  }

  if (icon && process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }

  mainWindow.setAspectRatio(viewport.width / viewport.height);

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    updateWindowTitle();
  });

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.loadURL(APP_WINDOW_URL);

  mainWindow.on("close", () => {
    activeAlwaysOnTop = mainWindow && !mainWindow.isDestroyed()
      ? mainWindow.isAlwaysOnTop()
      : activeAlwaysOnTop;
    queueSessionStateSave();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  if (!app.isPackaged) {
    try {
      ensureLinuxDesktopEntry({ baseDir: APP_BASE_DIR });
    } catch { }
  }

  systemSleepController.start();
  registerAppProtocol({
    protocol,
    net,
    assetDir: __dirname,
  });
  installAppSessionSecurity();

  defaultConfig = normalizeOptions(await loadConfig());
  restoredSessionState = await loadSessionState().catch(() => null);
  if (APP_VIEWPORTS[restoredSessionState?.activeViewportMode]) {
    activeViewportMode = restoredSessionState.activeViewportMode;
  }
  activeAlwaysOnTop = restoredSessionState?.alwaysOnTop !== false;
  try {
    const minibiaData = await loadMinibiaData();
    minibiaMonsterCatalogNames = Array.isArray(minibiaData?.monsters)
      ? minibiaData.monsters
        .map((entry) => String(entry?.name || "").trim())
        .filter(Boolean)
      : [];
    minibiaNpcCatalogNames = Array.isArray(minibiaData?.npcs)
      ? minibiaData.npcs
        .map((entry) => String(entry?.name || "").trim())
        .filter(Boolean)
      : [];
    huntPresetCatalog = buildHuntPresetCatalog(minibiaData);
  } catch {
    minibiaMonsterCatalogNames = [];
    minibiaNpcCatalogNames = [];
    huntPresetCatalog = [];
  }
  await refreshRouteLibrary();
  await refreshAccountLibrary();
  await refreshTrainerCharacterLibrary();
  createWindow();

  try {
    await syncInstanceCatalog({ ensureClaims: true });
  } catch { }

  const activeSession = getActiveSession();
  if (activeSession) {
    await ensureSessionConfig(activeSession).catch(() => { });
  }

  const recoveredSessionCount = await recoverRecentRunningSessions().catch(() => 0);
  if (recoveredSessionCount > 0) {
    sendEvent("state", { scope: "bootstrap-session-recovery" });
  }
  maybeAutoStartTrainerRoster();

  idleTimer = setInterval(async () => {
    if (sessionSyncInFlight) {
      return;
    }

    sessionSyncInFlight = true;
    const staleSignatureBefore = getRunningSessionStaleSignature();
    const now = Date.now();
    const activeId = String(activeSessionId || "");
    const canIncludeIdleSessions = now - lastIdleSessionSnapshotAt >= IDLE_SESSION_SNAPSHOT_INTERVAL_MS;
    const candidateSessions = [...sessions.values()].filter((session) => (
      canSyncSession(session)
      && !session.bot?.running
      && (String(session.id) === activeId || canIncludeIdleSessions)
    ));

    try {
      await Promise.all(
        [...sessions.values()].map((session) => syncSessionClaimHeartbeat(session).catch(() => { })),
      );

      const synced = candidateSessions.length
        ? await syncSessionSnapshots({
          candidateSessions,
          sendStateEvent: true,
          stateScope: "session-sync",
          background: true,
          repairValueSlot: false,
        })
        : false;
      if (canIncludeIdleSessions) {
        lastIdleSessionSnapshotAt = now;
      }
      const recovered = await recoverStaleRunningSessions();

      const staleSignatureAfter = getRunningSessionStaleSignature();
      if (recovered) {
        sendEvent("state", { scope: "session-recovery" });
      } else if (!synced && staleSignatureBefore !== staleSignatureAfter) {
        sendEvent("state", { scope: "session-staleness" });
      }
    } finally {
      sessionSyncInFlight = false;
    }
  }, SESSION_SYNC_INTERVAL_MS);

  discoveryTimer = setInterval(async () => {
    if (discoveryInFlight) {
      return;
    }

    discoveryInFlight = true;
    try {
      await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });
    } finally {
      discoveryInFlight = false;
    }
  }, DISCOVERY_INTERVAL_MS);
}

function requireActiveSession() {
  const session = getActiveSession();
  if (!session) {
    throw new Error("No live character tab selected.");
  }

  return session;
}

if (SINGLE_INSTANCE_LOCK) {
  app.whenReady().then(bootstrap);
}

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
});

app.on("window-all-closed", async () => {
  clearInterval(idleTimer);
  clearInterval(discoveryTimer);
  queueSessionStateSave();
  await flushSessionStateSave();

  await Promise.all(
    [...sessions.values()].map(async (session) => {
      session.bot.stop();
      await session.bot.detach().catch(() => { });
      await releaseSessionClaim(session);
    }),
  );

  systemSleepController.stop();
  app.quit();
});

handleTrusted("bb:get-state", async () => {
  await refreshRouteLibrary();
  await refreshAccountLibrary();
  await refreshTrainerCharacterLibrary();
  await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });

  const activeSession = getActiveSession();
  if (activeSession) {
    await ensureSessionConfig(activeSession).catch(() => { });
  }

  await syncSessionSnapshots({ emitActiveSnapshot: true });
  return serializeState();
});

handleTrusted("bb:refresh", async () => {
  await refreshRouteLibrary();
  await refreshAccountLibrary();
  await refreshTrainerCharacterLibrary();
  await syncInstanceCatalog({ ensureClaims: true }).catch((error) => {
    const activeSession = getActiveSession();
    if (activeSession) {
      pushSessionLog(activeSession, error.message);
    }
  });

  await syncSessionSnapshots({ emitActiveSnapshot: true });
  return serializeState();
});

handleTrusted("bb:save-account", async (_event, account = {}) => {
  const existingAccount = String(account?.id || "").trim()
    ? await loadAccount(account.id).catch(() => null)
    : null;
  await saveAccount(account, {
    previousId: existingAccount?.id || null,
  });
  await refreshAccountLibrary();
  return serializeState();
});

handleTrusted("bb:delete-account", async (_event, accountId) => {
  const resolvedId = String(accountId || "").trim();
  if (!resolvedId) {
    throw new Error("Account id is required.");
  }

  await deleteAccount(resolvedId);
  await refreshAccountLibrary();
  return serializeState();
});

handleTrusted("bb:new-session", async () => openManagedSessionTab());

handleTrusted("bb:start-trainer-roster", async (_event, reference) => {
  const resolvedReference = String(reference || "").trim();
  if (!resolvedReference) {
    throw new Error("Trainer character reference is required.");
  }

  return startTrainerCharacterGroup(resolvedReference);
});

handleTrusted("bb:save-trainer-duo", async (_event, duo = {}) => {
  await saveTrainerDuoPreset(duo);
  return serializeState();
});

handleTrusted("bb:delete-trainer-duo", async (_event, duo = {}) => {
  await deleteTrainerDuoPreset(duo);
  return serializeState();
});

handleTrusted("bb:close-window", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  mainWindow.close();
  return true;
});

handleTrusted("bb:kill-session", async (_event, sessionId = null) => {
  const session = resolveSessionReference(sessionId) || requireActiveSession();
  return closeLiveSession(session);
});

handleTrusted("bb:select-session", async (_event, sessionId) => {
  await syncInstanceCatalog({ ensureClaims: true }).catch(() => { });

  const session = getSessionById(sessionId);
  if (!session) {
    throw new Error("Selected character is no longer available.");
  }

  activeSessionId = session.id;
  applySessionRuntimeLoad();
  queueSessionStateSave();
  if (session.bot.running) {
    await ensureSessionConfig(session);
  } else {
    await reloadSessionConfig(session);
  }

  sendEvent("active-session", { sessionId: session.id });

  if (!session.bot.running && (!session.instance?.claimed || session.instance?.claimedBySelf)) {
    void refreshSession(session).catch((error) => {
      pushSessionLog(session, error.message);
      sendEvent("error", { sessionId: session.id, error: { message: error.message } });
    });
  }

  return serializeState();
});

handleTrusted("bb:toggle-run", async (_event, sessionId = null) => {
  const session = resolveSessionReference(sessionId) || requireActiveSession();
  await ensureSessionConfig(session);

  if (session.bot.running) {
    session.bot.stop();
    applySessionRuntimeLoad();
    queueSessionStateSave();
    return serializeState();
  }

  await startSessionBot(session, { emitState: false });
  return serializeState();
});

handleTrusted("bb:stop-aggro", async (_event, sessionId = null) => {
  const session = resolveSessionReference(sessionId) || requireActiveSession();

  if (!session.instance?.claimedBySelf && session.instance?.claimed) {
    throw new Error("That character is already linked to another Minibot window.");
  }

  await ensureSessionConfig(session);
  const nextHold = !session.config.stopAggroHold;
  await persistSessionConfig(session, {
    ...session.config,
    stopAggroHold: nextHold,
  });

  if (nextHold) {
    const result = await session.bot.clearAggro();
    if (!result?.ok) {
      throw new Error("Unable to clear the active target.");
    }
  }

  await refreshSession(session).catch((error) => {
    pushSessionLog(session, error.message);
  });

  return serializeState();
});

handleTrusted("bb:toggle-cavebot-pause", async (_event, sessionId = null) => {
  if (sessionId != null) {
    const session = resolveSessionReference(sessionId) || requireActiveSession();

    if (!session.instance?.claimedBySelf && session.instance?.claimed) {
      throw new Error("That character is already linked to another Minibot window.");
    }

    await ensureSessionConfig(session);
    const nextPaused = !session.config.cavebotPaused;
    await persistSessionConfig(session, {
      ...session.config,
      cavebotPaused: nextPaused,
    });

    if (nextPaused) {
      pushSessionLog(session, "Cavebot paused; healing and utility modules stay live.");
      await session.bot.interruptAutoWalk().catch(() => { });
      await session.bot.clearAggro().catch(() => { });
    } else {
      pushSessionLog(session, "Cavebot resumed.");
    }

    await refreshSession(session).catch((error) => {
      pushSessionLog(session, error.message);
    });

    return serializeState();
  }

  const activeSession = requireActiveSession();
  const targetSessions = [...sessions.values()].filter(canSyncSession);
  if (!targetSessions.length) {
    throw new Error("No live character tabs are available for cavebot pause.");
  }

  for (const session of targetSessions) {
    await ensureSessionConfig(session);
  }

  const nextPaused = !targetSessions.every((session) => session.config?.cavebotPaused === true);

  for (const session of targetSessions) {
    const changed = Boolean(session.config?.cavebotPaused) !== nextPaused;
    if (changed) {
      await persistSessionConfig(session, {
        ...session.config,
        cavebotPaused: nextPaused,
      }, { emitState: false });
    }

    if (nextPaused) {
      if (changed) {
        pushSessionLog(session, "Cavebot paused; healing and utility modules stay live.");
      }
      await session.bot.interruptAutoWalk().catch(() => { });
      await session.bot.clearAggro().catch(() => { });
    } else if (changed) {
      pushSessionLog(session, "Cavebot resumed.");
    }
  }

  await syncSessionSnapshots({
    candidateSessions: targetSessions,
    emitActiveSnapshot: true,
  });
  sendEvent("state", { sessionId: activeSession.id, scope: "cavebot-pause" });
  return serializeState();
});

handleTrusted("bb:stop-all-bots", async () => {
  const targetSessions = [...sessions.values()].filter(canSyncSession);
  if (!targetSessions.length) {
    throw new Error("No live character tabs are available to stop.");
  }

  for (const session of targetSessions) {
    await ensureSessionConfig(session);
  }

  for (const session of targetSessions) {
    if (session.config?.cavebotPaused !== true) {
      await persistSessionConfig(session, {
        ...session.config,
        cavebotPaused: true,
      }, { emitState: false });
    }

    await session.bot.interruptAutoWalk().catch(() => { });
    await session.bot.clearAggro().catch(() => { });

    if (session.bot.getRouteResetStatus?.().active) {
      session.bot.resetRoute(session.bot.routeIndex);
    }

    if (session.bot.running) {
      session.bot.stop();
    }
  }

  applySessionRuntimeLoad();
  await syncSessionSnapshots({
    candidateSessions: targetSessions,
    emitActiveSnapshot: true,
  });
  const activeSession = getActiveSession() || targetSessions[0];
  queueSessionStateSave();
  sendEvent("state", { sessionId: activeSession.id, scope: "stop-all-bots" });
  return serializeState();
});

handleTrusted("bb:reconnect-session", async (_event, sessionId = null) => {
  let session = resolveSessionReference(sessionId) || requireActiveSession();

  if (!session.instance?.claimedBySelf && session.instance?.claimed) {
    throw new Error("That character is already linked to another Minibot window.");
  }

  await ensureSessionConfig(session);
  session = await attachSession(session);

  await refreshSession(session, { emitSnapshot: false }).catch((error) => {
    pushSessionLog(session, error.message);
  });

  const result = await session.bot.reconnectNow();
  if (!result?.ok) {
    if (result?.reason === "dead") {
      throw new Error("Reconnect is disabled while the death modal is active.");
    }
    if (result?.reason === "reconnect error") {
      throw new Error(result.message || "Reconnect failed.");
    }
    throw new Error("Reconnect is not available right now.");
  }

  await refreshSession(session, { emitSnapshot: false }).catch((error) => {
    pushSessionLog(session, error.message);
  });

  return serializeState();
});

handleTrusted("bb:update-options", async (_event, partial) => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);

  if (isFollowTrainOnlyPatch(partial)) {
    await persistFollowTrainOptionsForLiveSessions(session, partial);
    return serializeState();
  }

  await persistSessionConfig(session, mergeOptions(session.config, partial));
  const refreshPresenceClassification = partial && typeof partial === "object" && (
    Object.hasOwn(partial, "creatureLedger")
    || Object.hasOwn(partial, "monsterArchive")
    || Object.hasOwn(partial, "playerArchive")
    || Object.hasOwn(partial, "npcArchive")
  );
  if (refreshPresenceClassification) {
    await refreshSession(session, { emitSnapshot: false });
  }
  return serializeState();
});

handleTrusted("bb:test-anti-idle", async (_event, partial = {}) => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);
  const draft = partial && typeof partial === "object"
    ? mergeOptions(session.config, {
      antiIdleEnabled: Object.hasOwn(partial, "antiIdleEnabled")
        ? partial.antiIdleEnabled
        : session.config.antiIdleEnabled,
      antiIdleIntervalMs: Object.hasOwn(partial, "antiIdleIntervalMs")
        ? partial.antiIdleIntervalMs
        : session.config.antiIdleIntervalMs,
    })
    : session.config;
  const snapshot = await refreshSession(session, { emitSnapshot: false });
  const now = session.bot.getNow();
  const lastActivityAt = session.bot.getLatestGameplayActivityAt();
  const result = await session.bot.performAntiIdle({
    type: "anti-idle",
    moduleKey: "antiIdle",
    intervalMs: draft.antiIdleIntervalMs,
    inactivityMs: lastActivityAt ? now - lastActivityAt : 0,
    forced: true,
  }, snapshot);

  if (!result?.ok) {
    throw new Error(result?.message || result?.reason || "Anti-idle pulse failed.");
  }

  return serializeState();
});

handleTrusted("bb:set-session-waypoint-overlays", async (_event, value) => {
  const activeSession = requireActiveSession();
  const showWaypointOverlay = Boolean(value);
  const targetSessions = [...sessions.values()].filter(canSyncSession);

  if (!targetSessions.length) {
    throw new Error("No live character tabs are available for session overlays.");
  }

  for (const session of targetSessions) {
    await ensureSessionConfig(session);
    await persistSessionConfig(session, {
      ...session.config,
      showWaypointOverlay,
    }, { emitState: false });
  }

  await syncSessionSnapshots({
    candidateSessions: targetSessions,
    emitActiveSnapshot: true,
  });
  sendEvent("state", { sessionId: activeSession.id, scope: "session-waypoint-overlays" });
  return serializeState();
});

handleTrusted("bb:load-route", async (_event, name) => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);

  const routeProfile = await loadRouteProfile(name);
  const routeOptions = routeProfile?.options || null;
  if (!routeProfile || !routeOptions) {
    throw new Error("Selected route could not be loaded.");
  }

  const localOnlyConfig = {
    creatureLedger: session.config.creatureLedger,
    monsterArchive: session.config.monsterArchive,
    playerArchive: session.config.playerArchive,
    npcArchive: session.config.npcArchive,
    cavebotPaused: session.config.cavebotPaused,
    stopAggroHold: session.config.stopAggroHold,
  };

  await persistSessionConfig(session, {
    ...session.config,
    ...routeOptions,
    ...localOnlyConfig,
  }, {
    routeRenameFrom: null,
  });

  session.bot.resetRoute(0);
  session.bot.setOverlayFocusIndex(routeOptions.waypoints.length ? 0 : null);
  pushSessionLog(
    session,
    `Loaded cavebot ${routeProfile.name} (${routeOptions.waypoints.length} waypoint${routeOptions.waypoints.length === 1 ? "" : "s"})`,
  );
  return serializeState();
});

handleTrusted("bb:delete-route", async (_event, name) => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);

  const routeName = String(name || "").trim();
  if (!routeName) {
    throw new Error("Choose a saved route first.");
  }

  const activeRouteName = String(session.config.cavebotName || "").trim();
  const deleteResult = await deleteRouteProfile(routeName);
  await refreshRouteLibrary();

  if (activeRouteName && activeRouteName === routeName) {
    await persistSessionConfig(session, {
      ...session.config,
      cavebotName: "",
    }, {
      routeRenameFrom: null,
    });
  } else {
    sendEvent("state", { sessionId: session.id });
  }

  if (deleteResult?.deleted) {
    pushSessionLog(session, `Deleted cavebot file ${deleteResult.routeProfile.fileName}`);
  }

  return serializeState();
});

handleTrusted("bb:set-always-on-top", async (_event, value) => {
  activeAlwaysOnTop = Boolean(value);
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(activeAlwaysOnTop);
  }
  queueSessionStateSave();
  return serializeState();
});

handleTrusted("bb:set-view-mode", async (_event, mode = "desk") => {
  applyViewportMode(mode);
  queueSessionStateSave();
  return { mode: activeViewportMode };
});

handleTrusted("bb:set-overlay-focus", async (_event, index) => {
  const session = requireActiveSession();
  session.bot.setOverlayFocusIndex(index);
  queueSessionStateSave();
  return serializeState();
});

handleTrusted("bb:add-current-waypoint", async (_event, type = "walk") => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);
  const snapshot = await refreshSession(session);
  const position = snapshot?.playerPosition;

  if (!position) {
    throw new Error("Player position unavailable.");
  }

  const waypoint = buildAutoWaypointWithType(position, session.config.waypoints.length, type);
  const next = [...session.config.waypoints, waypoint];

  await persistSessionConfig(session, { ...session.config, waypoints: next });
  session.bot.resetRoute(session.bot.routeIndex);
  session.bot.setOverlayFocusIndex(next.length - 1);
  pushSessionLog(
    session,
    `Added ${formatWaypointTypeLabel(waypoint.type)} waypoint ${position.x},${position.y},${position.z}`,
  );
  return serializeState();
});

handleTrusted("bb:insert-current-waypoint", async (_event, beforeIndex, type = "walk") => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);
  const snapshot = await refreshSession(session);
  const position = snapshot?.playerPosition;

  if (!position) {
    throw new Error("Player position unavailable.");
  }

  const waypoints = Array.isArray(session.config.waypoints) ? session.config.waypoints : [];
  const insertIndex = Math.max(0, Math.min(Math.trunc(Number(beforeIndex) || 0), waypoints.length));
  const waypoint = buildAutoWaypointWithType(position, waypoints.length, type);
  const next = [...waypoints];
  next.splice(insertIndex, 0, waypoint);

  await persistSessionConfig(session, { ...session.config, waypoints: next });
  const nextRouteIndex = Math.max(
    0,
    Math.min(session.bot.routeIndex + (insertIndex <= session.bot.routeIndex ? 1 : 0), next.length - 1),
  );
  session.bot.resetRoute(nextRouteIndex);
  session.bot.setOverlayFocusIndex(insertIndex);
  pushSessionLog(
    session,
    `Inserted ${formatWaypointTypeLabel(waypoint.type)} waypoint before ${insertIndex + 1}: ${position.x},${position.y},${position.z}`,
  );
  return serializeState();
});

handleTrusted("bb:update-waypoint", async (_event, index, patch) => {
  const session = requireActiveSession();
  const next = [...session.config.waypoints];

  if (index < 0 || index >= next.length) {
    return serializeState();
  }

  next[index] = { ...next[index], ...patch };
  await persistSessionConfig(session, { ...session.config, waypoints: next });
  session.bot.resetRoute(Math.min(session.bot.routeIndex, next.length - 1));
  return serializeState();
});

handleTrusted("bb:remove-waypoint", async (_event, index) => {
  const session = requireActiveSession();
  const next = [...session.config.waypoints];

  if (index < 0 || index >= next.length) {
    return serializeState();
  }

  next.splice(index, 1);
  await persistSessionConfig(session, { ...session.config, waypoints: next });
  session.bot.resetRoute(Math.min(session.bot.routeIndex, Math.max(0, next.length - 1)));
  return serializeState();
});

handleTrusted("bb:move-waypoint", async (_event, index, delta) => {
  const session = requireActiveSession();
  const moveResult = moveListItem(session.config.waypoints, index, delta);
  if (!moveResult.moved) {
    return serializeState();
  }

  await persistSessionConfig(session, { ...session.config, waypoints: moveResult.items });
  session.bot.resetRoute(Math.max(0, Math.min(moveResult.nextIndex, moveResult.items.length - 1)));
  return serializeState();
});

handleTrusted("bb:add-current-tile-rule", async (_event, policy = "avoid") => {
  const session = requireActiveSession();
  await ensureSessionConfig(session);
  const snapshot = await refreshSession(session);
  const position = snapshot?.playerPosition;

  if (!position) {
    throw new Error("Player position unavailable.");
  }

  const nextRule = buildAutoTileRule(position, session.config.tileRules.length, policy);
  const nextRules = [...session.config.tileRules, nextRule];
  await persistSessionConfig(session, { ...session.config, tileRules: nextRules });
  pushSessionLog(
    session,
    `Added ${formatTileRulePolicyLabel(nextRule.policy).toLowerCase()} tile rule ${position.x},${position.y},${position.z}`,
  );
  return serializeState();
});

handleTrusted("bb:update-tile-rule", async (_event, index, patch) => {
  const session = requireActiveSession();
  const nextRules = [...session.config.tileRules];

  if (index < 0 || index >= nextRules.length) {
    return serializeState();
  }

  nextRules[index] = { ...nextRules[index], ...patch };
  await persistSessionConfig(session, { ...session.config, tileRules: nextRules });
  return serializeState();
});

handleTrusted("bb:remove-tile-rule", async (_event, index) => {
  const session = requireActiveSession();
  const nextRules = [...session.config.tileRules];

  if (index < 0 || index >= nextRules.length) {
    return serializeState();
  }

  nextRules.splice(index, 1);
  await persistSessionConfig(session, { ...session.config, tileRules: nextRules });
  return serializeState();
});

handleTrusted("bb:move-tile-rule", async (_event, index, delta) => {
  const session = requireActiveSession();
  const moveResult = moveListItem(session.config.tileRules, index, delta);
  if (!moveResult.moved) {
    return serializeState();
  }

  await persistSessionConfig(session, { ...session.config, tileRules: moveResult.items });
  return serializeState();
});

handleTrusted("bb:reset-route", async (_event, index = 0) => {
  const session = requireActiveSession();
  session.bot.resetRoute(index);
  queueSessionStateSave();
  return serializeState();
});

handleTrusted("bb:return-to-start", async () => {
  let session = requireActiveSession();
  await ensureSessionConfig(session);

  if (!session.bot.running) {
    await reloadSessionConfig(session);
    session = await attachSession(session);
    await refreshSession(session);
    session.bot.setOptions(session.config);
  }

  if (session.config.cavebotPaused || session.config.stopAggroHold) {
    await persistSessionConfig(session, {
      ...session.config,
      cavebotPaused: false,
      stopAggroHold: false,
    }, {
      emitState: false,
    });
  }

  if (session.bot.running) {
    await session.bot.interruptAutoWalk().catch(() => { });
    await session.bot.clearAggro().catch(() => { });
  }

  session.bot.startRouteReset(0);

  if (!session.bot.running) {
    session.bot.start();
  }

  queueSessionStateSave();
  return serializeState();
});
