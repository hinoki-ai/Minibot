import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { JSDOM } from "jsdom";
import { mergeOptions, normalizeOptions } from "../lib/bot-core.mjs";

const html = await fs.readFile(new URL("../desktop/index.html", import.meta.url), "utf8");
const partyFollowSummarySource = await fs.readFile(new URL("../desktop/party-follow-summary.js", import.meta.url), "utf8");
const rendererSource = await fs.readFile(new URL("../desktop/renderer.js", import.meta.url), "utf8");
const stylesSource = await fs.readFile(new URL("../desktop/styles.css", import.meta.url), "utf8");
const minibiaMonsterCatalog = JSON.parse(
  await fs.readFile(new URL("../data/minibia/current/monsters.json", import.meta.url), "utf8"),
).items
  .map((entry) => String(entry?.name || "").trim())
  .filter(Boolean);
const minibiaNpcCatalog = JSON.parse(
  await fs.readFile(new URL("../data/minibia/current/npcs.json", import.meta.url), "utf8"),
).items
  .map((entry) => String(entry?.name || "").trim())
  .filter(Boolean);
const SHARED_MODULE_MODAL_NAMES = new Set([
  "deathHeal",
  "healer",
  "manaTrainer",
  "runeMaker",
  "spellCaster",
  "distanceKeeper",
  "autoLight",
  "autoConvert",
  "trainer",
  "reconnect",
  "antiIdle",
  "alarms",
  "autoEat",
  "haste",
  "ammo",
  "ringAutoReplace",
  "looting",
  "banking",
  "team",
  "partyFollow",
  "pkAssist",
]);
const domCleanups = new Set();

function registerDomCleanup(cleanup) {
  domCleanups.add(cleanup);
  return async () => {
    if (!domCleanups.delete(cleanup)) return;
    await cleanup();
  };
}

async function cleanupRegisteredDoms() {
  const cleanups = [...domCleanups];
  domCleanups.clear();
  for (const cleanup of cleanups.reverse()) {
    await cleanup();
  }
}

function trackDom(dom, { beforeClose = null } = {}) {
  return registerDomCleanup(async () => {
    try {
      await beforeClose?.();
    } finally {
      try {
        await dom.window.__MINIBOT_RENDERER_DISPOSE__?.();
      } catch { }

      try {
        dom.window.close();
      } catch { }
    }
  });
}

test.afterEach(async () => {
  await cleanupRegisteredDoms();
  await flush(2);
});

function resolveModalName(name) {
  return SHARED_MODULE_MODAL_NAMES.has(name) ? "module" : name;
}

function resolveModalId(name) {
  return `modal-${resolveModalName(name)}`;
}

function clone(value) {
  return structuredClone(value);
}

function getCompactText(node) {
  return String(node?.textContent || "").replace(/\s+/g, "");
}

function getModuleCardState(node) {
  return node?.closest(".quick-module-card, .route-toggle-card, .compact-split-card")?.dataset.state;
}

function attachStyles(document) {
  const style = document.createElement("style");
  style.textContent = stylesSource;
  document.head.append(style);
}

function isElementInert(element) {
  return "inert" in element ? Boolean(element.inert) : element.hasAttribute("inert");
}

function buildBinding(instance, snapshotName = "") {
  if (!instance) return null;

  return {
    profileKey: instance.profileKey,
    pageId: instance.id,
    url: instance.url,
    title: instance.title,
    characterName: instance.characterName,
    displayName: instance.displayName,
    label: snapshotName || instance.characterName || instance.displayName,
  };
}

function buildSessionsFromTopLevel(nextState) {
  const instances = Array.isArray(nextState.instances) ? nextState.instances : [];
  const activeSessionId = String(nextState.activeSessionId || nextState.binding?.pageId || instances[0]?.id || "");

  return {
    activeSessionId: activeSessionId || null,
    sessions: instances.map((instance) => {
      const active = String(instance.id) === activeSessionId;
      return {
        id: instance.id,
        profileKey: instance.profileKey,
        pageId: instance.id,
        title: instance.title,
        url: instance.url,
        characterName: instance.characterName,
        displayName: instance.displayName,
        label: active
          ? nextState.binding?.label || nextState.snapshot?.playerName || instance.characterName || instance.displayName
          : instance.characterName || instance.displayName,
        playerPosition: active
          ? nextState.snapshot?.playerPosition || instance.playerPosition || null
          : instance.playerPosition || null,
        playerStats: active
          ? clone(nextState.snapshot?.playerStats || instance.playerStats || null)
          : clone(instance.playerStats || null),
        supplies: active
          ? clone(nextState.snapshot?.inventory?.supplies || instance.supplies || [])
          : clone(instance.supplies || []),
        routeTelemetry: active
          ? clone(nextState.snapshot?.routeTelemetry || instance.routeTelemetry || null)
          : clone(instance.routeTelemetry || null),
        visiblePlayers: active
          ? clone(nextState.snapshot?.visiblePlayers || instance.visiblePlayers || [])
          : clone(instance.visiblePlayers || []),
        visiblePlayerNames: active
          ? clone(nextState.snapshot?.visiblePlayerNames || instance.visiblePlayerNames || [])
          : clone(instance.visiblePlayerNames || []),
        running: active ? Boolean(nextState.running) : false,
        connected: active ? Boolean(nextState.page) : false,
        ready: instance.ready,
        present: true,
        claimed: instance.claimed,
        claimedBySelf: instance.claimedBySelf,
        available: instance.available,
        cavebotPaused: active ? Boolean(nextState.options?.cavebotPaused) : false,
        stopAggroHold: active ? Boolean(nextState.options?.stopAggroHold) : false,
        routeIndex: active ? Number(nextState.routeIndex) || 0 : 0,
        routeComplete: active ? Boolean(nextState.routeComplete) : false,
        routeResetActive: active ? Boolean(nextState.routeResetActive) : false,
        routeResetPhase: active ? nextState.routeResetPhase || null : null,
        routeResetTargetIndex: active
          ? (Number.isFinite(Number(nextState.routeResetTargetIndex)) ? Number(nextState.routeResetTargetIndex) : null)
          : null,
        antiIdleStatus: active ? clone(nextState.antiIdleStatus || null) : null,
        overlayFocusIndex: active
          ? (Number.isFinite(nextState.overlayFocusIndex) ? Number(nextState.overlayFocusIndex) : null)
          : null,
        routeName: active ? nextState.options?.cavebotName || "" : "",
        page: {
          id: instance.id,
          title: instance.title,
          url: instance.url,
        },
      };
    }),
  };
}

function createState(overrides = {}) {
  const state = {
    options: normalizeOptions({
      monster: "Rotworm",
      monsterNames: ["Rotworm"],
      monsterArchive: ["Rotworm", "Rat"],
      port: 9224,
      intervalMs: 250,
      retargetMs: 1200,
      rangeX: 7,
      rangeY: 5,
      floorTolerance: 1,
      pageUrlPrefix: "https://minibia.com/play",
      cavebotName: "dararotworms",
      autowalkEnabled: true,
      autowalkLoop: true,
      routeRecording: false,
      routeRecordStep: 5,
      showWaypointOverlay: true,
      waypointRadius: 1,
      walkRepathMs: 1200,
      waypoints: [
        { x: 100, y: 200, z: 7, label: "Entry", type: "walk", radius: null },
        { x: 101, y: 201, z: 7, label: "Center", type: "safe-zone", radius: 1 },
        { x: 102, y: 202, z: 7, label: "Exit", type: "exit-zone", radius: null },
      ],
      healerEnabled: true,
      healerEmergencyHealthPercent: 30,
      healerRules: [
        {
          enabled: true,
          label: "",
          words: "exura vita",
          minHealthPercent: 0,
          maxHealthPercent: 30,
          minMana: 80,
          minManaPercent: 0,
          cooldownMs: 900,
        },
        {
          enabled: true,
          label: "",
          words: "exura gran",
          minHealthPercent: 31,
          maxHealthPercent: 55,
          minMana: 60,
          minManaPercent: 0,
          cooldownMs: 900,
        },
        {
          enabled: true,
          label: "",
          words: "exura",
          minHealthPercent: 56,
          maxHealthPercent: 80,
          minMana: 20,
          minManaPercent: 0,
          cooldownMs: 900,
        },
      ],
      healerTiers: [
        {
          words: "exura vita",
          healthPercent: 30,
          minMana: 80,
          minManaPercent: 0,
        },
        {
          words: "exura gran",
          healthPercent: 55,
          minMana: 60,
          minManaPercent: 0,
        },
        {
          words: "exura",
          healthPercent: 80,
          minMana: 20,
          minManaPercent: 0,
        },
      ],
      manaTrainerEnabled: false,
      manaTrainerRules: [
        {
          enabled: true,
          label: "",
          words: "utevo res ina",
          minHealthPercent: 95,
          minManaPercent: 85,
          maxManaPercent: 100,
          cooldownMs: 1400,
          requireNoTargets: true,
          requireStationary: true,
        },
      ],
      manaTrainerWords: "utevo res ina",
      manaTrainerManaPercent: 85,
      manaTrainerMinHealthPercent: 95,
      autoLightEnabled: true,
      autoLightRules: [
        {
          enabled: true,
          label: "",
          words: "utevo lux",
          minManaPercent: 25,
          cooldownMs: 3000,
          requireNoLight: true,
          requireNoTargets: false,
          requireStationary: false,
        },
      ],
      autoLightWords: "utevo lux",
      autoLightMinManaPercent: 25,
      autoConvertEnabled: false,
      autoConvertRules: [
        {
          enabled: true,
          label: "",
          cooldownMs: 4000,
          requireNoTargets: true,
          requireStationary: true,
        },
      ],
      convertCooldownMs: 4000,
      once: false,
      dryRun: false,
    }),
    running: false,
    routeIndex: 1,
    routeComplete: false,
    routeResetActive: false,
    routeResetPhase: null,
    routeResetTargetIndex: null,
    overlayFocusIndex: 1,
    page: {
      id: "page-1",
      title: "Minibia",
      url: "https://minibia.com/play",
    },
    binding: {
      profileKey: "knight-alpha",
      pageId: "page-1",
      url: "https://minibia.com/play",
      title: "Minibia",
      characterName: "Knight Alpha",
      displayName: "Knight Alpha",
      label: "Knight Alpha",
    },
    instances: [
      {
        id: "page-1",
        title: "Minibia",
        url: "https://minibia.com/play",
        ready: true,
        characterName: "Knight Alpha",
        displayName: "Knight Alpha",
        playerPosition: { x: 100, y: 200, z: 7 },
        profileKey: "knight-alpha",
        claimed: false,
        claimedBySelf: true,
        available: true,
        claim: null,
      },
      {
        id: "page-2",
        title: "Minibia",
        url: "https://minibia.com/play?client=2",
        ready: true,
        characterName: "Scout Beta",
        displayName: "Scout Beta",
        playerPosition: { x: 105, y: 205, z: 7 },
        profileKey: "scout-beta",
        claimed: false,
        claimedBySelf: false,
        available: true,
        claim: null,
      },
    ],
    selectionRequired: false,
    activeSessionId: "page-1",
    windowTitle: "Minibot",
    snapshot: {
      playerName: "Knight Alpha",
      playerPosition: { x: 100, y: 200, z: 7 },
      playerStats: {
        health: 870,
        maxHealth: 1000,
        mana: 320,
        maxMana: 500,
        healthPercent: 87,
        manaPercent: 64,
      },
      currentTarget: {
        id: 99,
        name: "Rotworm",
        position: { x: 101, y: 200, z: 7 },
      },
      candidates: [
        {
          id: 99,
          name: "Rotworm",
          position: { x: 101, y: 200, z: 7 },
        },
      ],
      visibleMonsterNames: ["Rotworm", "Rat"],
      visibleCreatureNames: ["Rotworm", "Rat"],
      visiblePlayers: [],
      visiblePlayerNames: [],
      isMoving: false,
      pathfinderAutoWalking: false,
      pathfinderFinalDestination: null,
      autoWalkStepsRemaining: 0,
      hasLightCondition: false,
    },
    logs: [
      "[12:00:00] Attached to https://minibia.com/play",
      "[12:00:01] Bot started for Rotworm with autowalk",
    ],
    routeProfile: {
      name: "dararotworms",
      fileName: "dararotworms.json",
      path: "/home/test/Minibot/cavebots/dararotworms.json",
      exists: true,
    },
    routeLibrary: [
      {
        name: "dararotworms",
        fileName: "dararotworms.json",
        path: "/home/test/Minibot/cavebots/dararotworms.json",
        exists: true,
        waypointCount: 3,
        updatedAt: Date.parse("2026-04-10T10:00:00Z"),
        active: true,
      },
      {
        name: "cyclops-loop",
        fileName: "cyclops-loop.json",
        path: "/home/test/Minibot/cavebots/cyclops-loop.json",
        exists: true,
        waypointCount: 2,
        updatedAt: Date.parse("2026-04-09T09:00:00Z"),
        active: false,
      },
    ],
    accounts: [
      {
        id: "main-pair",
        label: "Main Pair",
        loginMethod: "account-password",
        loginName: "knight.alpha@example.com",
        password: "hunter2",
        secretStorage: "local-file",
        characters: ["Knight Alpha", "Scout Beta"],
        preferredCharacter: "Knight Alpha",
        reconnectPolicy: "preferred-character",
        notes: "Main duo",
        createdAt: Date.parse("2026-04-10T10:00:00Z"),
        updatedAt: Date.parse("2026-04-10T10:00:00Z"),
        hasPassword: true,
        characterCount: 2,
        activeCharacterMatch: true,
      },
    ],
    monsterCatalogNames: [...minibiaMonsterCatalog],
    npcCatalogNames: [...minibiaNpcCatalog],
    huntPresets: [
      {
        id: "rotworm",
        monsterName: "Rotworm",
        taskName: "Rotworm Purger",
        requiredKills: 150,
        experience: 40,
        health: 95,
        speed: 65,
        lootHighlights: ["Gold Coin", "Mace", "Ham"],
        tags: ["task"],
        targetProfile: {
          enabled: true,
          priority: 112,
          dangerLevel: 3,
          keepDistanceMin: 0,
          keepDistanceMax: 1,
          finishBelowPercent: 10,
          killMode: "normal",
          behavior: "hold",
          preferShootable: true,
          stickToTarget: true,
          avoidBeam: false,
          avoidWave: false,
        },
        searchText: "rotworm rotworm purger gold coin mace ham task",
      },
      {
        id: "beholder",
        monsterName: "Beholder",
        taskName: "Beholder Blinder",
        requiredKills: 150,
        experience: 500,
        health: 900,
        speed: 95,
        lootHighlights: ["Platinum Coin", "Wand", "Stealth Ring"],
        tags: ["task", "beam", "danger", "ranged"],
        targetProfile: {
          enabled: true,
          priority: 132,
          dangerLevel: 8,
          keepDistanceMin: 1,
          keepDistanceMax: 2,
          finishBelowPercent: 30,
          killMode: "asap",
          behavior: "kite",
          preferShootable: true,
          stickToTarget: true,
          avoidBeam: true,
          avoidWave: false,
        },
        searchText: "beholder beholder blinder platinum coin wand stealth ring task beam danger ranged",
      },
    ],
    alwaysOnTop: true,
  };

  return {
    ...state,
    ...overrides,
    options: normalizeOptions({
      ...state.options,
      ...(overrides.options || {}),
    }),
    page: overrides.page === null
      ? null
      : {
          ...state.page,
          ...(overrides.page || {}),
        },
    binding: overrides.binding === null
      ? null
      : {
          ...state.binding,
          ...(overrides.binding || {}),
        },
    instances: overrides.instances ? clone(overrides.instances) : clone(state.instances),
    accounts: overrides.accounts ? clone(overrides.accounts) : clone(state.accounts),
    snapshot: {
      ...state.snapshot,
      ...(overrides.snapshot || {}),
    },
  };
}

function clampState(currentState) {
  const nextState = clone(currentState);
  nextState.options = normalizeOptions(nextState.options || {});
  const waypoints = nextState.options.waypoints || [];
  nextState.instances = Array.isArray(nextState.instances) ? nextState.instances : [];

  if (!waypoints.length) {
    nextState.routeIndex = 0;
    nextState.overlayFocusIndex = null;
  } else {
    nextState.routeIndex = Math.max(0, Math.min(nextState.routeIndex || 0, waypoints.length - 1));
    if (Number.isFinite(nextState.overlayFocusIndex)) {
      nextState.overlayFocusIndex = Math.max(0, Math.min(nextState.overlayFocusIndex, waypoints.length - 1));
    } else {
      nextState.overlayFocusIndex = null;
    }
  }

  if (!Array.isArray(nextState.sessions) || !nextState.sessions.length) {
    const built = buildSessionsFromTopLevel(nextState);
    nextState.activeSessionId = built.activeSessionId;
    nextState.sessions = built.sessions;
  } else {
    nextState.sessions = clone(nextState.sessions);
    nextState.activeSessionId = String(nextState.activeSessionId || nextState.binding?.pageId || nextState.sessions[0]?.id || "");
  }

  const activeSession = nextState.sessions.find((session) => String(session.id) === String(nextState.activeSessionId))
    || nextState.sessions[0]
    || null;

  if (activeSession) {
    nextState.binding = buildBinding(activeSession, nextState.snapshot?.playerName || activeSession.label || "");
    nextState.running = Boolean(activeSession.running);
    nextState.routeIndex = Number(activeSession.routeIndex ?? nextState.routeIndex) || 0;
    nextState.routeComplete = Boolean(activeSession.routeComplete ?? nextState.routeComplete);
    nextState.routeResetActive = Boolean(activeSession.routeResetActive ?? nextState.routeResetActive);
    nextState.routeResetPhase = activeSession.routeResetPhase ?? nextState.routeResetPhase ?? null;
    nextState.routeResetTargetIndex = Number.isFinite(Number(activeSession.routeResetTargetIndex))
      ? Number(activeSession.routeResetTargetIndex)
      : (Number.isFinite(Number(nextState.routeResetTargetIndex)) ? Number(nextState.routeResetTargetIndex) : null);
    nextState.antiIdleStatus = clone(activeSession.antiIdleStatus || nextState.antiIdleStatus || null);
    nextState.overlayFocusIndex = Number.isFinite(activeSession.overlayFocusIndex)
      ? Number(activeSession.overlayFocusIndex)
      : nextState.overlayFocusIndex;
    nextState.page = activeSession.connected
      ? clone(activeSession.page || {
          id: activeSession.pageId,
          title: activeSession.title,
          url: activeSession.url,
        })
      : nextState.page || null;
  } else {
    nextState.binding = null;
    nextState.page = null;
    nextState.running = false;
  }

  nextState.windowTitle = nextState.windowTitle || "Minibot";
  nextState.accounts = Array.isArray(nextState.accounts) ? clone(nextState.accounts) : [];

  return nextState;
}

async function flush(turns = 5) {
  for (let index = 0; index < turns; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function waitFor(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function createDragTransfer() {
  const store = new Map();

  return {
    dropEffect: "move",
    effectAllowed: "all",
    setData(type, value) {
      store.set(type, String(value));
    },
    getData(type) {
      return store.get(type) || "";
    },
  };
}

function dispatchDrag(window, element, type, {
  dataTransfer = createDragTransfer(),
  clientX = 0,
  clientY = 0,
} = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(event, "clientX", { value: clientX });
  Object.defineProperty(event, "clientY", { value: clientY });
  element.dispatchEvent(event);
  return dataTransfer;
}

function getPixelValue(value, fallback = 0) {
  const numeric = Number.parseFloat(String(value || ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function installFakeAudioContext(window, beepLog) {
  class FakeAudioParam {
    setValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }

  class FakeGainNode {
    constructor() {
      this.gain = new FakeAudioParam();
    }

    connect() {}
    disconnect() {}
  }

  class FakeOscillatorNode {
    constructor() {
      this.frequency = new FakeAudioParam();
      this.type = "sine";
    }

    connect() {}
    disconnect() {}

    start(at) {
      beepLog.push({ type: "start", at, wave: this.type });
    }

    stop(at) {
      beepLog.push({ type: "stop", at, wave: this.type });
    }
  }

  window.AudioContext = class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = "running";
      this.destination = {};
    }

    createOscillator() {
      return new FakeOscillatorNode();
    }

    createGain() {
      return new FakeGainNode();
    }

    resume() {
      this.state = "running";
      return Promise.resolve();
    }
  };
}

async function createDesk({ initialState = createState(), initialStatePromise = null, beforeEval = null } = {}) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "http://localhost",
  });
  const { window } = dom;
  const listeners = new Set();
  const cleanup = trackDom(dom, {
    beforeClose: () => {
      listeners.clear();
    },
  });
  let currentState = clampState(initialState);

  const calls = {
    getState: 0,
    refresh: 0,
    closeWindow: 0,
    startTrainerRoster: [],
    saveTrainerDuo: [],
    deleteTrainerDuo: [],
    setAlwaysOnTop: [],
    setViewMode: [],
    killSession: [],
    selectSession: [],
    toggleCavebotPause: [],
    stopAllBots: [],
    stopAggro: [],
    reconnectSession: [],
    acknowledgeProtector: [],
    toggleRun: [],
    updateOptions: [],
    saveAccount: [],
    deleteAccount: [],
    testAntiIdle: [],
    setSessionWaypointOverlays: [],
    loadRoute: [],
    exportRoutePack: [],
    previewRoutePackImport: 0,
    applyRoutePackImport: 0,
    cancelRoutePackImport: 0,
    deleteRoute: [],
    returnToStart: [],
    setOverlayFocus: [],
    addCurrentWaypoint: [],
    insertCurrentWaypoint: [],
    updateWaypoint: [],
    removeWaypoint: [],
    moveWaypoint: [],
    resetRoute: [],
  };

  const loadState = initialStatePromise
    ? Promise.resolve(initialStatePromise).then((nextState) => {
        currentState = clampState(nextState);
        return clone(currentState);
      })
    : Promise.resolve(clone(currentState));

  function snapshot() {
    return clone(currentState);
  }

  function syncState(nextState) {
    currentState = clampState(nextState);
    return snapshot();
  }

  function reorder(array, index, delta) {
    const next = [...array];
    const targetIndex = index + delta;
    if (index < 0 || index >= next.length || targetIndex < 0 || targetIndex >= next.length) {
      return next;
    }
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    return next;
  }

  function buildAccountId(value = "") {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "account";
  }

  function normalizeAccountCharacters(value = []) {
    const entries = Array.isArray(value)
      ? value
      : String(value || "").split(/[\n,]+/g);
    const seen = new Set();
    const characters = [];

    for (const entry of entries) {
      const name = String(entry || "").trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) {
        continue;
      }
      seen.add(key);
      characters.push(name);
    }

    return characters;
  }

  function getSession(sessionId = currentState.activeSessionId) {
    return (currentState.sessions || []).find((candidate) => String(candidate.id) === String(sessionId)) || null;
  }

  function patchSessionList(sessionId, updater) {
    return (currentState.sessions || []).map((session) => (
      String(session.id) === String(sessionId)
        ? updater(clone(session))
        : clone(session)
    ));
  }

  window.bbApi = {
    async getState() {
      calls.getState += 1;
      return clone(await loadState);
    },
    async refresh() {
      calls.refresh += 1;
      const syncedSessions = (currentState.sessions || []).map((session) => ({
        ...clone(session),
        connected: true,
        page: {
          id: session.pageId,
          title: session.title,
          url: session.url,
        },
      }));
      const activeSession = syncedSessions.find((session) => (
        String(session.id) === String(currentState.activeSessionId || "")
      )) || syncedSessions[0] || null;

      if (!activeSession) {
        return snapshot();
      }

      return syncState({
        ...currentState,
        page: {
          id: activeSession.pageId,
          title: activeSession.title,
          url: activeSession.url,
        },
        snapshot: {
          ...currentState.snapshot,
          playerName: activeSession.characterName || activeSession.displayName,
        },
        sessions: syncedSessions,
      });
    },
    async startTrainerRoster(reference) {
      calls.startTrainerRoster.push(String(reference || ""));
      return snapshot();
    },
    async saveTrainerDuo(duo) {
      calls.saveTrainerDuo.push(clone(duo));
      return snapshot();
    },
    async deleteTrainerDuo(duo) {
      calls.deleteTrainerDuo.push(clone(duo));
      return snapshot();
    },
    async closeWindow() {
      calls.closeWindow += 1;
      return true;
    },
    async setAlwaysOnTop(value) {
      const pinned = Boolean(value);
      calls.setAlwaysOnTop.push(pinned);
      return syncState({
        ...currentState,
        alwaysOnTop: pinned,
      });
    },
    async setViewMode(mode) {
      calls.setViewMode.push(mode);
      return { mode };
    },
    async killSession(sessionId) {
      const targetId = String(sessionId || currentState.activeSessionId || "");
      calls.killSession.push(targetId);
      const remainingSessions = (currentState.sessions || [])
        .filter((session) => String(session.id) !== targetId)
        .map((session) => clone(session));
      const nextActiveSession = remainingSessions[0] || null;

      return syncState({
        ...currentState,
        activeSessionId: nextActiveSession?.id || null,
        instances: (currentState.instances || [])
          .filter((instance) => String(instance.id) !== targetId)
          .map((instance) => clone(instance)),
        sessions: remainingSessions,
        page: nextActiveSession?.connected
          ? clone(nextActiveSession.page || {
              id: nextActiveSession.pageId,
              title: nextActiveSession.title,
              url: nextActiveSession.url,
            })
          : null,
        snapshot: {
          ...currentState.snapshot,
          playerName: nextActiveSession?.characterName || nextActiveSession?.displayName || "",
          currentTarget: null,
        },
      });
    },
    async selectSession(sessionId) {
      calls.selectSession.push(sessionId);
      const session = getSession(sessionId);
      if (!session) {
        throw new Error("Selected session not found");
      }

      return syncState({
        ...currentState,
        page: {
          id: session.pageId,
          title: session.title,
          url: session.url,
        },
        activeSessionId: String(sessionId),
        sessions: patchSessionList(sessionId, (candidate) => ({
          ...candidate,
          connected: true,
          page: {
            id: candidate.pageId,
            title: candidate.title,
            url: candidate.url,
          },
        })),
        snapshot: {
          ...currentState.snapshot,
          playerName: session.characterName || session.displayName,
        },
      });
    },
    async toggleRun(sessionId) {
      const targetId = String(sessionId || currentState.activeSessionId || "");
      const session = getSession(targetId);
      if (!session) {
        throw new Error("Target session not found");
      }

      calls.toggleRun.push(targetId);
      const nextRunning = !session.running;
      const operationalPatch = nextRunning
        ? {
            cavebotPaused: false,
            stopAggroHold: false,
          }
        : {};
      if (nextRunning && !session.connected) {
        calls.refresh += 1;
      }

      return syncState({
        ...currentState,
        running: targetId === String(currentState.activeSessionId || "")
          ? nextRunning
          : currentState.running,
        options: targetId === String(currentState.activeSessionId || "")
          ? normalizeOptions({
              ...currentState.options,
              ...operationalPatch,
            })
          : currentState.options,
        page: targetId === String(currentState.activeSessionId || "")
          ? {
              id: session.pageId,
              title: session.title,
              url: session.url,
            }
          : currentState.page,
        sessions: patchSessionList(targetId, (candidate) => ({
          ...candidate,
          running: nextRunning,
          ...operationalPatch,
          connected: true,
          page: {
            id: candidate.pageId,
            title: candidate.title,
            url: candidate.url,
          },
        })),
      });
    },
    async toggleCavebotPause(sessionId) {
      const targetId = sessionId == null ? "__all__" : String(sessionId);
      calls.toggleCavebotPause.push(targetId);
      const nextPaused = !(currentState.sessions || []).every((session) => Boolean(session.cavebotPaused));
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          cavebotPaused: nextPaused,
        }),
        sessions: (currentState.sessions || []).map((session) => ({
          ...clone(session),
          cavebotPaused: nextPaused,
        })),
      });
    },
    async stopAllBots() {
      calls.stopAllBots.push("__all__");
      return syncState({
        ...currentState,
        running: false,
        options: normalizeOptions({
          ...currentState.options,
          cavebotPaused: true,
        }),
        routeResetActive: false,
        routeResetPhase: null,
        routeResetTargetIndex: null,
        snapshot: {
          ...currentState.snapshot,
          currentTarget: null,
        },
        sessions: (currentState.sessions || []).map((session) => ({
          ...clone(session),
          running: false,
          cavebotPaused: true,
          routeResetActive: false,
          routeResetPhase: null,
          routeResetTargetIndex: null,
        })),
      });
    },
    async stopAggro(sessionId) {
      const targetId = String(sessionId || currentState.activeSessionId || "");
      calls.stopAggro.push(targetId);
      const nextHold = !Boolean(currentState.options?.stopAggroHold);
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          stopAggroHold: nextHold,
        }),
        snapshot: {
          ...currentState.snapshot,
          currentTarget: null,
        },
        sessions: patchSessionList(targetId, (session) => ({
          ...session,
          stopAggroHold: nextHold,
        })),
      });
    },
    async reconnectSession(sessionId) {
      const targetId = String(sessionId || currentState.activeSessionId || "");
      calls.reconnectSession.push(targetId);
      return syncState({
        ...currentState,
        reconnectStatus: {
          enabled: true,
          active: true,
          phase: "attempting",
          reason: "disconnected",
          message: "Reconnecting",
          attempts: 1,
          maxAttempts: 0,
          retryDelayMs: 4000,
          activeSince: Date.now(),
          lastAttemptAt: Date.now(),
          nextAttemptAt: Date.now() + 4000,
          remainingMs: 4000,
          canReconnect: false,
          reconnecting: true,
        },
        snapshot: {
          ...currentState.snapshot,
          connection: {
            ...(currentState.snapshot?.connection || {}),
            connected: false,
            canReconnect: false,
            reconnecting: true,
          },
        },
        sessions: patchSessionList(targetId, (session) => ({
          ...session,
          reconnectStatus: {
            enabled: true,
            active: true,
            phase: "attempting",
            reason: "disconnected",
            message: "Reconnecting",
            attempts: 1,
            maxAttempts: 0,
            retryDelayMs: 4000,
            activeSince: Date.now(),
            lastAttemptAt: Date.now(),
            nextAttemptAt: Date.now() + 4000,
            remainingMs: 4000,
            canReconnect: false,
            reconnecting: true,
          },
        })),
      });
    },
    async acknowledgeProtector(sessionId, options = {}) {
      const targetId = String(sessionId || currentState.activeSessionId || "");
      calls.acknowledgeProtector.push({ sessionId: targetId, options: clone(options) });
      const nextProtectorStatus = {
        ...(currentState.snapshot?.protectorStatus || {}),
        active: false,
        acknowledged: true,
        pausedModules: [],
      };
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          cavebotPaused: false,
          stopAggroHold: false,
        }),
        snapshot: {
          ...currentState.snapshot,
          protectorStatus: nextProtectorStatus,
        },
        sessions: patchSessionList(targetId, (session) => ({
          ...session,
          cavebotPaused: false,
          stopAggroHold: false,
          protectorStatus: nextProtectorStatus,
        })),
      });
    },
    async updateOptions(partial) {
      calls.updateOptions.push(clone(partial));
      const nextOptions = mergeOptions(currentState.options, clone(partial));
      const nextRouteName = nextOptions.cavebotName || "";
      const nextWaypoints = nextOptions.waypoints || [];
      const nextRouteLibraryBase = (currentState.routeLibrary || []).filter((entry) => entry.name !== nextRouteName);
      return syncState({
        ...currentState,
        options: nextOptions,
        routeProfile: nextRouteName
          ? {
              name: nextRouteName,
              fileName: `${nextRouteName}.json`,
              path: `/home/test/Minibot/cavebots/${nextRouteName}.json`,
              exists: true,
            }
          : null,
        routeLibrary: nextRouteName
          ? [
              ...nextRouteLibraryBase,
              {
                name: nextRouteName,
                fileName: `${nextRouteName}.json`,
                path: `/home/test/Minibot/cavebots/${nextRouteName}.json`,
                exists: true,
                waypointCount: nextWaypoints.length,
                updatedAt: Date.parse("2026-04-10T10:00:00Z"),
                active: true,
              },
            ]
          : nextRouteLibraryBase.map((entry) => ({ ...entry, active: false })),
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeName: partial.cavebotName || nextRouteName,
        })),
      });
    },
    async saveAccount(account) {
      calls.saveAccount.push(clone(account || {}));
      const source = account && typeof account === "object" ? account : {};
      const loginMethod = String(source.loginMethod || "account-password").trim() || "account-password";
      const preferredCharacter = String(source.preferredCharacter || "").trim();
      const characters = normalizeAccountCharacters(source.characters || []);
      if (
        preferredCharacter
        && !characters.some((entry) => entry.toLowerCase() === preferredCharacter.toLowerCase())
      ) {
        characters.unshift(preferredCharacter);
      }
      const nextId = String(source.id || buildAccountId([
        source.label,
        source.loginName,
        source.preferredCharacter,
      ].filter(Boolean).join(" ")));
      const existing = (currentState.accounts || []).find((entry) => entry.id === nextId) || null;
      const nextAccount = {
        ...(existing ? clone(existing) : {}),
        id: nextId,
        label: String(source.label || source.loginName || preferredCharacter || nextId).trim(),
        loginMethod,
        loginName: String(source.loginName || "").trim(),
        password: loginMethod === "manual" ? "" : String(source.password || "").trim(),
        secretStorage: loginMethod === "manual"
          ? "none"
          : String(source.secretStorage || "local-file").trim(),
        characters,
        preferredCharacter,
        reconnectPolicy: String(source.reconnectPolicy || "preferred-character").trim(),
        notes: String(source.notes || "").trim(),
        createdAt: existing?.createdAt || Date.parse("2026-04-10T10:00:00Z"),
        updatedAt: Date.parse("2026-04-11T10:00:00Z"),
      };
      const accounts = [...(currentState.accounts || []).filter((entry) => entry.id !== nextId), nextAccount]
        .sort((left, right) => left.label.localeCompare(right.label, undefined, {
          sensitivity: "base",
          numeric: true,
        }));

      return syncState({
        ...currentState,
        accounts: accounts.map((entry) => ({
          ...entry,
          hasPassword: Boolean(entry.password),
          characterCount: entry.characters.length,
          activeCharacterMatch: entry.characters.includes(currentState.binding?.characterName || ""),
        })),
      });
    },
    async deleteAccount(accountId) {
      calls.deleteAccount.push(String(accountId || ""));
      return syncState({
        ...currentState,
        accounts: (currentState.accounts || []).filter((entry) => entry.id !== String(accountId || "")),
      });
    },
    async testAntiIdle(partial) {
      calls.testAntiIdle.push(clone(partial || {}));
      const now = Date.parse("2026-04-16T12:00:00Z");
      return syncState({
        ...currentState,
        antiIdleStatus: {
          enabled: true,
          moduleEnabled: true,
          trainerEnabled: false,
          connected: true,
          snapshotReady: true,
          ready: false,
          blocker: "waiting",
          intervalMs: Number(partial?.antiIdleIntervalMs) || currentState.options?.antiIdleIntervalMs || 60000,
          inactivityMs: 0,
          lastActivityAt: now,
          nextPulseAt: now + (Number(partial?.antiIdleIntervalMs) || currentState.options?.antiIdleIntervalMs || 60000),
          nextPulseInMs: Number(partial?.antiIdleIntervalMs) || currentState.options?.antiIdleIntervalMs || 60000,
          retryReadyAt: 0,
          blockedUntil: now + (Number(partial?.antiIdleIntervalMs) || currentState.options?.antiIdleIntervalMs || 60000),
          blockedForMs: Number(partial?.antiIdleIntervalMs) || currentState.options?.antiIdleIntervalMs || 60000,
          lastAttemptAt: now,
          lastPulseAt: now,
          lastTransport: "input-mouse-keyboard",
          lastInactivityMs: 0,
          lastError: "",
          lastOk: true,
        },
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          antiIdleStatus: {
            ...(currentState.antiIdleStatus || {}),
            enabled: true,
            moduleEnabled: true,
            connected: true,
            snapshotReady: true,
            ready: false,
            blocker: "waiting",
            lastPulseAt: now,
            lastTransport: "input-mouse-keyboard",
          },
        })),
      });
    },
    async setSessionWaypointOverlays(value) {
      const showWaypointOverlay = Boolean(value);
      calls.setSessionWaypointOverlays.push(showWaypointOverlay);
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          showWaypointOverlay,
        }),
        sessions: (currentState.sessions || []).map((session) => ({
          ...clone(session),
          showWaypointOverlay,
        })),
      });
    },
    async loadRoute(name) {
      calls.loadRoute.push(name);
      const routeEntry = (currentState.routeLibrary || []).find((entry) => entry.name === name) || null;
      if (!routeEntry) {
        throw new Error("Selected route not found");
      }

      const waypoints = name === "cyclops-loop"
        ? [
            { x: 320, y: 420, z: 7, label: "Ladder", type: "ladder", radius: null },
            { x: 321, y: 421, z: 8, label: "Lower", type: "stairs-down", radius: 1 },
          ]
        : currentState.options.waypoints;
      const overlayFocusIndex = waypoints.length ? 0 : null;

      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          cavebotName: name,
          waypoints,
        }),
        routeIndex: 0,
        overlayFocusIndex,
        routeProfile: {
          name,
          fileName: routeEntry.fileName,
          path: routeEntry.path,
          exists: true,
        },
        routeLibrary: (currentState.routeLibrary || []).map((entry) => ({
          ...entry,
          active: entry.name === name,
        })),
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeName: name,
          routeIndex: 0,
          overlayFocusIndex,
        })),
      });
    },
    async exportRoutePack(name) {
      calls.exportRoutePack.push(name);
      return snapshot();
    },
    async previewRoutePackImport() {
      calls.previewRoutePackImport += 1;
      return syncState({
        ...currentState,
        routePackImportPreview: {
          schema: "minibot.route-profile-pack",
          schemaVersion: 1,
          sourcePath: "/home/test/imported.minibot-route-pack.json",
          sourceName: "imported",
          legacy: false,
          importedSchemaVersion: 1,
          readOnly: false,
          migrationWarnings: [],
          packName: "imported-route",
          summary: {
            waypointCount: 2,
            tileRuleCount: 1,
            targetProfileCount: 1,
          },
          validation: {
            schemaVersion: 1,
            sourceName: "imported-route",
            signature: "pack-preview",
            ok: true,
            requiresAcknowledgement: false,
            summary: {
              ok: true,
              errorCount: 0,
              warningCount: 1,
              infoCount: 0,
              highestSeverity: "warning",
              firstProblemWaypointIndex: null,
            },
            issues: [
              {
                severity: "warning",
                code: "generated-labels-only",
                message: "Route uses generated labels.",
                waypointIndex: null,
                field: "label",
                requiresAcknowledgement: false,
              },
            ],
          },
          diff: {
            changed: true,
            changeCount: 2,
            changes: [
              { scope: "route", key: "waypoints", before: "3 entries", after: "2 entries" },
              { scope: "targeting", key: "monster", before: "Rotworm", after: "Cyclops" },
            ],
          },
        },
      });
    },
    async applyRoutePackImport() {
      calls.applyRoutePackImport += 1;
      return syncState({
        ...currentState,
        routePackImportPreview: null,
        options: normalizeOptions({
          ...currentState.options,
          cavebotName: "imported-route",
          monster: "Cyclops",
          waypoints: [
            { x: 310, y: 410, z: 7, label: "Entry", type: "walk", radius: null },
            { x: 311, y: 410, z: 7, label: "Loop", type: "walk", radius: null },
          ],
        }),
      });
    },
    async cancelRoutePackImport() {
      calls.cancelRoutePackImport += 1;
      return syncState({
        ...currentState,
        routePackImportPreview: null,
      });
    },
    async deleteRoute(name) {
      calls.deleteRoute.push(name);
      const nextRouteLibrary = (currentState.routeLibrary || [])
        .filter((entry) => entry.name !== name)
        .map((entry) => ({ ...entry, active: false }));
      const deletingActive = name === currentState.options.cavebotName;

      return syncState({
        ...currentState,
        options: deletingActive
          ? normalizeOptions({
              ...currentState.options,
              cavebotName: "",
            })
          : currentState.options,
        routeProfile: deletingActive ? null : currentState.routeProfile,
        routeLibrary: nextRouteLibrary,
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeName: deletingActive ? "" : session.routeName,
        })),
      });
    },
    async setOverlayFocus(index) {
      calls.setOverlayFocus.push(index);
      return syncState({
        ...currentState,
        overlayFocusIndex: Number.isFinite(Number(index)) ? Number(index) : null,
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          overlayFocusIndex: Number.isFinite(Number(index)) ? Number(index) : null,
        })),
      });
    },
    async addCurrentWaypoint(type = "walk") {
      calls.addCurrentWaypoint.push(type);
      const position = currentState.snapshot?.playerPosition || { x: 100, y: 200, z: 7 };
      const waypoints = [...currentState.options.waypoints];
      waypoints.push({
        x: position.x,
        y: position.y,
        z: position.z,
        label: `Waypoint ${String(waypoints.length + 1).padStart(3, "0")}`,
        type,
        radius: null,
      });
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          waypoints,
        }),
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeIndex: session.routeIndex || 0,
        })),
      });
    },
    async insertCurrentWaypoint(index, type = "walk") {
      calls.insertCurrentWaypoint.push({ index, type });
      const position = currentState.snapshot?.playerPosition || { x: 100, y: 200, z: 7 };
      const waypoints = [...currentState.options.waypoints];
      const insertIndex = Math.max(0, Math.min(Number(index) || 0, waypoints.length));
      const nextOrdinal = waypoints.length + 1;
      waypoints.splice(insertIndex, 0, {
        x: position.x,
        y: position.y,
        z: position.z,
        label: `Waypoint ${String(nextOrdinal).padStart(3, "0")}`,
        type,
        radius: null,
      });
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          waypoints,
        }),
        routeIndex: Math.max(0, Math.min((currentState.routeIndex || 0) + (insertIndex <= (currentState.routeIndex || 0) ? 1 : 0), waypoints.length - 1)),
        overlayFocusIndex: insertIndex,
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          overlayFocusIndex: insertIndex,
          routeIndex: Math.max(0, Math.min((session.routeIndex || 0) + (insertIndex <= (session.routeIndex || 0) ? 1 : 0), waypoints.length - 1)),
        })),
      });
    },
    async updateWaypoint(index, patch) {
      calls.updateWaypoint.push({ index, patch: clone(patch) });
      const waypoints = [...currentState.options.waypoints];
      if (index >= 0 && index < waypoints.length) {
        waypoints[index] = { ...waypoints[index], ...clone(patch) };
      }
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          waypoints,
        }),
      });
    },
    async removeWaypoint(index) {
      calls.removeWaypoint.push(index);
      const waypoints = [...currentState.options.waypoints];
      if (index >= 0 && index < waypoints.length) {
        waypoints.splice(index, 1);
      }
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          waypoints,
        }),
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeIndex: Math.max(0, Math.min(session.routeIndex || 0, Math.max(0, waypoints.length - 1))),
        })),
      });
    },
    async moveWaypoint(index, delta) {
      calls.moveWaypoint.push({ index, delta });
      return syncState({
        ...currentState,
        options: normalizeOptions({
          ...currentState.options,
          waypoints: reorder(currentState.options.waypoints, index, delta),
        }),
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeIndex: Math.max(0, Math.min(index + delta, Math.max(0, currentState.options.waypoints.length - 1))),
        })),
      });
    },
    async resetRoute(index) {
      calls.resetRoute.push(index);
      return syncState({
        ...currentState,
        routeIndex: Number(index) || 0,
        routeResetActive: false,
        routeResetPhase: null,
        routeResetTargetIndex: null,
        sessions: patchSessionList(currentState.activeSessionId, (session) => ({
          ...session,
          routeIndex: Number(index) || 0,
          routeResetActive: false,
          routeResetPhase: null,
          routeResetTargetIndex: null,
        })),
      });
    },
    async returnToStart() {
      const targetId = String(currentState.activeSessionId || "");
      calls.returnToStart.push(targetId);
      const nextOptions = normalizeOptions({
        ...currentState.options,
        cavebotPaused: false,
        stopAggroHold: false,
      });
      return syncState({
        ...currentState,
        running: true,
        options: nextOptions,
        routeIndex: 0,
        routeResetActive: true,
        routeResetPhase: "returning",
        routeResetTargetIndex: 0,
        sessions: patchSessionList(targetId, (session) => ({
          ...session,
          running: true,
          cavebotPaused: false,
          stopAggroHold: false,
          routeIndex: 0,
          routeResetActive: true,
          routeResetPhase: "returning",
          routeResetTargetIndex: 0,
        })),
      });
    },
    onEvent(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  };

  window.console = console;
  if (typeof beforeEval === "function") {
    beforeEval(window);
  }
  window.eval(partyFollowSummarySource);
  window.eval(rendererSource);
  await flush();

  return {
    calls,
    cleanup,
    document: window.document,
    window,
    currentState: () => currentState,
    emit(type, payload = {}, nextState = null, {
      state = null,
      statePatch = false,
    } = {}) {
      if (nextState) {
        currentState = clampState(nextState);
      }
      const event = {
        type,
        payload,
        state: state ?? snapshot(),
        statePatch,
      };
      listeners.forEach((listener) => listener(event));
    },
  };
}

test("renderer ids and modal targets stay aligned with the HTML shell", () => {
  const dom = new JSDOM(html);
  trackDom(dom);
  const { document } = dom.window;
  const ids = new Set([...rendererSource.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]));
  const modalNames = [...html.matchAll(/data-open-modal="([^"]+)"/g)].map((match) => match[1]);
  const optionalHeaderIds = new Set([
    "desk-title",
    "desk-character-tag",
    "desk-status",
    "front-status",
    "quick-summary",
    "route-summary",
    "kill-session",
    "new-route",
    "refresh",
    "stop-aggro",
  ]);

  for (const id of ids) {
    if (optionalHeaderIds.has(id)) continue;
    assert.ok(document.getElementById(id), `Missing #${id} in desktop/index.html`);
  }

  for (const name of modalNames) {
    assert.ok(
      document.querySelector(`[data-modal="${resolveModalName(name)}"]`),
      `Missing modal panel for "${name}"`,
    );
  }

  for (const meta of document.querySelectorAll(".modal-panel .section-meta")) {
    assert.notEqual(meta.textContent?.trim(), "", "Modal metadata should not be blank");
  }

  assert.equal(document.querySelector(".ops-card"), null);
  for (const removedLabel of ["Ops Deck / Panel Bank", "Editors And Utilities", "full control panels", "Module Sheet"]) {
    assert.ok(!document.body.textContent.includes(removedLabel), `Removed duplicate panel label returned: ${removedLabel}`);
  }
});

test("modal polish does not blanket-hide operational notes and live status text", () => {
  for (const blockedPattern of [
    /\.modal-panel\s+\.field-note[\s\S]{0,500}display:\s*none\s*!important/i,
    /\.modal-panel\s+small[\s\S]{0,500}display:\s*none\s*!important/i,
    /\.modal-panel\s+\.route-hunt-inline-note[\s\S]{0,500}display:\s*none\s*!important/i,
    /\.modal-head\s+\.module-state-line[\s\S]{0,500}display:\s*none\s*!important/i,
    /\.modal-head\s+\.module-current-line[\s\S]{0,500}display:\s*none\s*!important/i,
  ]) {
    assert.doesNotMatch(stylesSource, blockedPattern);
  }
});

test("modal footer actions keep red close buttons and green save buttons", () => {
  const dom = new JSDOM(html);
  trackDom(dom);
  const { document } = dom.window;
  attachStyles(document);

  const panels = [...document.querySelectorAll(".modal-panel")];
  assert.equal(panels.length, 7);

  for (const panel of panels) {
    const closeButton = panel.querySelector(".modal-actions [data-close-modal]");
    assert.ok(closeButton, `${panel.id} is missing a footer close button`);
    assert.ok(closeButton.classList.contains("modal-close-button"), `${panel.id} close button lost its modal class`);
    assert.ok(closeButton.classList.contains("danger"), `${panel.id} close button should use the danger treatment`);

    const closeStyle = dom.window.getComputedStyle(closeButton);
    assert.equal(closeStyle.borderColor, "rgb(214, 83, 69)", `${panel.id} close button should resolve red`);
    assert.equal(closeStyle.color, "rgb(255, 232, 227)", `${panel.id} close text should resolve red-tinted`);

    const saveButtons = [
      ...new Set(panel.querySelectorAll(".modal-actions .modal-save-button, .modal-actions [data-save-modules]")),
    ];
    for (const saveButton of saveButtons) {
      assert.ok(saveButton.classList.contains("primary"), `${panel.id} save action should stay primary`);
      assert.equal(saveButton.classList.contains("danger"), false, `${panel.id} save action should not be danger`);

      const saveStyle = dom.window.getComputedStyle(saveButton);
      assert.equal(saveStyle.borderColor, "rgb(114, 191, 79)", `${panel.id} save action should resolve green`);
      assert.equal(saveStyle.color, "rgb(244, 255, 232)", `${panel.id} save text should resolve green-tinted`);
    }
  }
});

test("stateful controls stay disabled until the first desk sync completes", async () => {
  const deferred = Promise.withResolvers();
  const desk = await createDesk({
    initialStatePromise: deferred.promise,
  });
  const { document } = desk;

  assert.equal(document.querySelectorAll("[data-session-select]").length, 0);
  assert.equal(document.getElementById("window-pin").disabled, true);
  assert.equal(document.getElementById("quick-toggle-healer").disabled, true);
  assert.equal(document.getElementById("quick-toggle-targeting").disabled, true);
  assert.equal(document.getElementById("save-targeting").disabled, true);
  assert.equal(document.getElementById("route-overlay-note"), null);

  deferred.resolve(createState());
  await flush();

  assert.equal(document.querySelectorAll("[data-session-select]").length, 2);
  assert.equal(document.getElementById("window-pin").disabled, false);
  assert.equal(document.querySelector('[data-session-toggle="page-1"]').disabled, false);
  assert.equal(document.getElementById("quick-toggle-healer").disabled, false);
  assert.equal(document.getElementById("quick-toggle-targeting").disabled, false);
  assert.equal(document.getElementById("save-targeting").disabled, false);
});

test("dashboard shows inherited trainer services and Team Hunt movement blockers", async () => {
  const initialState = createState({
    options: {
      autowalkEnabled: true,
      trainerEnabled: true,
      trainerReconnectEnabled: true,
      reconnectEnabled: false,
      autoEatEnabled: false,
      antiIdleEnabled: false,
      partyFollowEnabled: true,
      partyFollowMembers: ["Scout Beta", "Knight Alpha"],
    },
  });
  const builtSessions = buildSessionsFromTopLevel(initialState);
  initialState.sessions = builtSessions.sessions.map((session) => (
    String(session.id) === "page-1"
      ? {
          ...session,
          followTrainStatus: {
            enabled: true,
            active: true,
            pilot: false,
            selfName: "Knight Alpha",
            selfIndex: 1,
            leaderName: "Scout Beta",
          },
        }
      : session
  ));

  const desk = await createDesk({ initialState });
  const { document, emit, currentState } = desk;

  assert.equal(document.getElementById("quick-toggle-autowalk").closest(".route-toggle-card, .quick-module-card")?.dataset.state, "blocked");
  assert.equal(document.querySelector("#quick-toggle-autowalk strong")?.textContent?.trim(), "Follow");
  assert.equal(document.getElementById("quick-toggle-trainer").closest(".quick-module-card")?.dataset.state, "blocked");
  assert.equal(document.querySelector("#quick-toggle-trainer strong")?.textContent?.trim(), "Follow");
  assert.equal(document.getElementById("quick-toggle-reconnect").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#quick-toggle-reconnect strong")?.textContent?.trim(), "Off");
  assert.equal(document.getElementById("quick-toggle-auto-eat").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#quick-toggle-auto-eat strong")?.textContent?.trim(), "Off");
  assert.equal(document.getElementById("quick-toggle-anti-idle").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#quick-toggle-anti-idle strong")?.textContent?.trim(), "Off");

  assert.equal(document.getElementById("summary-trainer").textContent.trim(), "Follow");
  assert.match(document.getElementById("summary-trainer-detail").textContent, /Team Hunt owns movement/i);
  assert.notEqual(document.getElementById("summary-reconnect").textContent.trim(), "Off");
  assert.notEqual(document.getElementById("summary-auto-eat").textContent.trim(), "Off");
  assert.notEqual(document.getElementById("summary-anti-idle").textContent.trim(), "Off");

  const nextState = currentState();
  nextState.sessions = nextState.sessions.map((session) => (
    String(session.id) === "page-1"
      ? {
          ...session,
          followTrainStatus: {
            enabled: true,
            active: false,
            pilot: true,
            selfName: "Knight Alpha",
            selfIndex: 0,
            leaderName: "",
          },
        }
      : session
  ));
  emit("state", {}, nextState);
  await flush();

  assert.equal(document.getElementById("quick-toggle-autowalk").closest(".route-toggle-card, .quick-module-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#quick-toggle-autowalk strong")?.textContent?.trim(), "On");
});

test("route overview card background does not open the saved-route quick pick", async () => {
  const desk = await createDesk({
    beforeEval(window) {
      Object.defineProperty(window.HTMLSelectElement.prototype, "showPicker", {
        configurable: true,
        value() {
          this.dataset.showPickerCalls = String((Number(this.dataset.showPickerCalls) || 0) + 1);
        },
      });
    },
  });
  const { document } = desk;

  const routeOverviewCard = document.getElementById("route-overview-card");
  const routeLibraryQuickSelect = document.getElementById("route-library-quick-select");
  const routeOverviewNote = document.getElementById("route-overview-note");
  assert.equal(routeOverviewCard.getAttribute("role"), null);
  assert.equal(routeOverviewCard.hasAttribute("tabindex"), false);
  assert.match(routeOverviewCard.title, /route overview panel/i);
  assert.doesNotMatch(routeOverviewCard.title, /open saved routes/i);
  assert.equal(routeOverviewNote.hidden, true);
  assert.equal(routeOverviewNote.textContent, "");

  routeOverviewCard.click();
  await flush();

  assert.equal(document.getElementById("modal-route-library-picker").classList.contains("open"), false);
  assert.notEqual(document.activeElement, routeLibraryQuickSelect);
  assert.equal(routeLibraryQuickSelect.dataset.showPickerCalls, undefined);
});

test("route overview exposes live route metrics instead of placeholder slots", async () => {
  const desk = await createDesk();
  const { document } = desk;

  assert.equal(document.getElementById("route-overview-name").textContent.trim(), "dararotworms");
  assert.equal(document.getElementById("route-overview-count").textContent.trim(), "3");
  assert.equal(document.getElementById("route-overview-rules").textContent.trim(), "0");
  assert.equal(document.getElementById("route-overview-library").textContent.trim(), "2");
  assert.equal(document.getElementById("route-overview-focus").textContent.trim(), "001. Entry");
  assert.equal(document.querySelector(".route-overview-metric-button-placeholder"), null);
});

test("route overview metric shortcuts open route panel sections", async () => {
  const desk = await createDesk();
  const { document, window } = desk;

  document.getElementById("route-overview-open-name").click();
  await flush();
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "cavebotName");

  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();
  document.getElementById("route-overview-open-waypoints").click();
  await flush();
  assert.equal(document.activeElement.id, "add-current-waypoint");

  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();
  document.getElementById("route-overview-open-rules").click();
  await flush();
  assert.equal(document.activeElement.id, "add-current-tile-rule-wait");

  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();
  document.getElementById("route-overview-open-focus").click();
  await flush();
  assert.equal(document.activeElement.id, "route-item-label");
});

test("route overview file shortcuts open the saved-route picker", async () => {
  const desk = await createDesk({
    beforeEval(window) {
      Object.defineProperty(window.HTMLSelectElement.prototype, "showPicker", {
        configurable: true,
        value() {
          this.dataset.showPickerCalls = String((Number(this.dataset.showPickerCalls) || 0) + 1);
        },
      });
    },
  });
  const { document, window } = desk;

  const routeLibraryQuickSelect = document.getElementById("route-library-quick-select");

  const routeLibraryMetric = document.getElementById("route-overview-library-cell");
  assert.equal(routeLibraryMetric.tagName, "DIV");
  assert.equal(routeLibraryMetric.hasAttribute("data-open-route-library"), false);
  routeLibraryMetric.click();
  await flush();
  assert.equal(document.getElementById("modal-route-library-picker").classList.contains("open"), false);
  assert.notEqual(document.activeElement, routeLibraryQuickSelect);
  assert.equal(routeLibraryQuickSelect.dataset.showPickerCalls, undefined);

  document.getElementById("route-overview-open-files").click();
  await flush();
  assert.equal(document.getElementById("modal-route-library-picker").classList.contains("open"), true);
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), false);
  assert.equal(document.activeElement, routeLibraryQuickSelect);
  assert.equal(routeLibraryQuickSelect.dataset.showPickerCalls, "1");

  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();
  document.getElementById("desk-route-files").click();
  await flush();
  assert.equal(document.activeElement, routeLibraryQuickSelect);
  assert.equal(routeLibraryQuickSelect.dataset.showPickerCalls, "2");
});

test("saved-route picker loads the selected cavebot through the existing route bridge", async () => {
  const desk = await createDesk();
  const { document, window, calls, currentState } = desk;

  document.getElementById("route-overview-open-files").click();
  await flush();

  const quickSelect = document.getElementById("route-library-quick-select");
  quickSelect.value = "cyclops-loop";
  quickSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();

  document.getElementById("load-route-quick").click();
  await flush();

  assert.equal(calls.loadRoute.at(-1), "cyclops-loop");
  assert.equal(currentState().options.cavebotName, "cyclops-loop");
});

test("route panel button opens the route panel", async () => {
  const desk = await createDesk();
  const { document } = desk;

  const button = document.getElementById("route-panel-button");
  assert.equal(getCompactText(button), "RoutePanel");

  button.click();
  await flush();

  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "cavebotName");
});

test("route off disables the route controls it advertises", async () => {
  const desk = await createDesk();
  const { document, calls, currentState } = desk;

  document.getElementById("route-off-button").click();
  await flush();

  assert.deepEqual(calls.updateOptions.at(-1), {
    autowalkEnabled: false,
    autowalkLoop: false,
    routeRecording: false,
    showWaypointOverlay: false,
  });
  assert.equal(currentState().options.autowalkEnabled, false);
  assert.equal(currentState().options.autowalkLoop, false);
  assert.equal(currentState().options.routeRecording, false);
  assert.equal(currentState().options.showWaypointOverlay, false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "reconnectEnabled"), false);
});

test("waypoints control card opens the route builder and focuses waypoint settings", async () => {
  const desk = await createDesk();
  const { document, window } = desk;

  const card = document.getElementById("route-toggle-waypoints-card");
  assert.equal(card.getAttribute("role"), "button");

  card.click();
  await flush();

  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "add-current-waypoint");

  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();

  card.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await flush();

  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "add-current-waypoint");
});

test("route overview live preview tiles open the editor and can resume the route", async () => {
  const desk = await createDesk();
  const { document, window, calls, currentState } = desk;

  const preview = document.getElementById("route-live-preview");
  const toggleGrid = document.querySelector("#route-overview-card .route-toggle-grid");
  const previewShell = document.querySelector("#route-overview-card .route-live-preview-shell");
  const tiles = [...document.querySelectorAll("#route-live-preview .route-live-waypoint")];
  assert.equal(preview.classList.contains("waypoint-preview-live"), true);
  assert.equal(tiles.length, currentState().options.waypoints.length);
  assert.ok(toggleGrid.compareDocumentPosition(previewShell) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(document.getElementById("route-live-preview-copy"), null);

  tiles[1].click();
  await flush();

  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(calls.setOverlayFocus.at(-1), 1);
  assert.equal(document.getElementById("route-item-label").value, "Center");

  const refreshedTile = document.querySelectorAll("#route-live-preview .route-live-waypoint")[2];
  refreshedTile.dispatchEvent(new window.MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  }));
  await flush();

  assert.equal(calls.resetRoute.at(-1), 2);
  assert.equal(currentState().routeIndex, 2);
});

test("route overview live preview uses vertical scrolling without horizontal tile overflow", async () => {
  const desk = await createDesk();
  const { document } = desk;

  assert.equal(document.getElementById("route-live-preview")?.classList.contains("waypoint-preview-live"), true);
  assert.equal(document.getElementById("route-live-preview")?.classList.contains("waypoint-square-grid"), true);
  assert.equal(document.getElementById("route-live-preview-toggle")?.textContent, "Hide Grid");
  assert.equal(document.getElementById("route-live-preview")?.hidden, false);
  const portraitScrollSource = stylesSource.slice(stylesSource.lastIndexOf("/* Modal portrait scroll lock"));
  assert.match(portraitScrollSource, /\.waypoint-preview-live,\s*\.waypoint-preview\.waypoint-square-grid\s*\{[\s\S]*--route-waypoint-tile-min-size:\s*58px;/);
  assert.match(portraitScrollSource, /\.waypoint-preview-live,\s*\.waypoint-preview\.waypoint-square-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(var\(--route-waypoint-tile-min-size\),\s*1fr\)\);/);
  assert.match(portraitScrollSource, /\.waypoint-preview-live,\s*\.waypoint-preview\.waypoint-square-grid\s*\{[\s\S]*overflow-x:\s*hidden;[\s\S]*overflow-y:\s*auto;/);
  assert.match(stylesSource, /--app-max-width:\s*1460px;/);
  assert.match(stylesSource, /\.console-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(236px,\s*0\.68fr\)\s*minmax\(760px,\s*2fr\)\s*minmax\(194px,\s*0\.43fr\);/);
});

test("route overview live preview can be collapsed to skip the desk grid", async () => {
  const desk = await createDesk();
  const { document } = desk;

  const toggle = document.getElementById("route-live-preview-toggle");
  const preview = document.getElementById("route-live-preview");
  const collapsedNote = document.getElementById("route-live-preview-collapsed");

  toggle?.click();
  await flush();

  assert.equal(toggle?.getAttribute("aria-pressed"), "true");
  assert.equal(toggle?.textContent, "Show Grid");
  assert.equal(preview?.hidden, true);
  assert.equal(collapsedNote?.hidden, false);
  assert.match(collapsedNote?.textContent || "", /3 waypoints still loaded/i);

  toggle?.click();
  await flush();

  assert.equal(toggle?.getAttribute("aria-pressed"), "false");
  assert.equal(toggle?.textContent, "Hide Grid");
  assert.equal(preview?.hidden, false);
  assert.equal(collapsedNote?.hidden, true);
  assert.equal(document.querySelectorAll("#route-live-preview .route-live-waypoint").length, 3);
});

test("route overview live preview quick buttons insert before and remove waypoints", async () => {
  const desk = await createDesk();
  const { document, calls, currentState } = desk;

  const tiles = [...document.querySelectorAll("#route-live-preview .route-live-waypoint")];
  tiles[1].querySelector("[data-route-preview-insert]").click();
  await flush();

  assert.deepEqual(calls.insertCurrentWaypoint.at(-1), { index: 1, type: "walk" });
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), false);
  assert.equal(currentState().options.waypoints.length, 4);
  assert.equal(currentState().options.waypoints[1].x, 100);
  assert.equal(currentState().options.waypoints[1].y, 200);
  assert.equal(currentState().options.waypoints[1].z, 7);
  assert.equal(currentState().options.waypoints[1].type, "walk");
  assert.equal(currentState().options.waypoints[1].radius, null);
  assert.match(currentState().options.waypoints[1].label, /^Waypoint /);

  const refreshedTiles = [...document.querySelectorAll("#route-live-preview .route-live-waypoint")];
  refreshedTiles[1].querySelector("[data-route-preview-remove]").click();
  await flush();

  assert.equal(calls.removeWaypoint.at(-1), 1);
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), false);
  assert.equal(currentState().options.waypoints.length, 3);
  assert.equal(currentState().options.waypoints[1].label, "Center");
});

test("route overview batch marks sync into the modal and delete marked waypoints together", async () => {
  const desk = await createDesk();
  const { document, calls } = desk;

  document.querySelector('[data-route-preview-mark="0"]')?.click();
  document.querySelector('[data-route-preview-mark="2"]')?.click();
  await flush();

  assert.match(document.getElementById("route-live-selection-summary")?.textContent || "", /2 waypoints marked/i);
  assert.equal(document.getElementById("route-live-remove-selected")?.hidden, false);

  document.getElementById("open-route-panel").click();
  await flush();

  assert.equal(document.querySelector('[data-index="0"]')?.classList.contains("marked"), true);
  assert.equal(document.querySelector('[data-index="2"]')?.classList.contains("marked"), true);
  assert.match(document.getElementById("route-danger-selected")?.textContent || "", /2 marked waypoints/i);

  document.getElementById("route-live-remove-selected")?.click();
  await flush();

  assert.deepEqual(calls.removeWaypoint.slice(-2), [2, 0]);
  assert.equal(document.querySelectorAll("#route-live-preview .route-live-waypoint").length, 1);
  assert.equal(document.getElementById("route-live-remove-selected")?.hidden, true);
});

test("desktop buttons and modals remain clickable and wire to the backend bridge", async () => {
  const desk = await createDesk();
  const { document, window, calls, currentState } = desk;

  assert.match(document.getElementById("log-output").textContent, /Attached to/);
  assert.equal(document.getElementById("about-output"), null);
  assert.equal(document.getElementById("route-overlay-note"), null);
  assert.equal(document.querySelector(".desk-status-cluster"), null);
  assert.equal(document.querySelectorAll(".desk-actions > button").length, 12);
  assert.equal(document.getElementById("desk-about"), null);
  for (const id of ["desk-presets", "desk-hunt-studio", "desk-route-panel", "desk-route-files", "desk-accounts"]) {
    assert.ok(document.getElementById(id));
  }
  assert.equal(document.querySelector('[data-session-select="page-1"]').getAttribute("aria-selected"), "true");
  assert.equal(document.getElementById("quick-toggle-autowalk").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-loop").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-record").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-waypoints").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-session-waypoints").closest(".quick-module-card") !== null, true);
  assert.match(document.getElementById("quick-open-session-waypoints").textContent, /All tabs/);
  assert.equal(document.getElementById("quick-toggle-cavebot-pause").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-looting").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-banking").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-auto-eat").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-haste").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-ring-amulet-auto-replace").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("route-reconnect-panel").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("route-stop-aggro-panel").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("route-reset-panel").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("quick-reset-route").closest(".route-card") !== null, true);
  assert.equal(document.getElementById("route-panel-button").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("route-off-button").closest(".route-toggle-card") !== null, true);
  assert.equal(document.getElementById("quick-open-targeting").closest(".control-card") !== null, true);
  assert.equal(document.getElementById("quick-open-targeting").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("quick-open-targeting").closest(".quick-module-card-single"), null);
  assert.equal(document.getElementById("quick-open-anti-idle").closest(".control-card") !== null, true);
  assert.equal(document.getElementById("quick-open-party-follow").closest(".control-card") !== null, true);
  assert.equal(document.getElementById("quick-toggle-avoid-fields").closest(".control-card") !== null, true);
  assert.equal(document.getElementById("quick-open-distance"), null);
  assert.equal(document.getElementById("quick-open-once"), null);
  assert.equal(document.getElementById("quick-toggle-distance-keeper"), null);
  assert.equal(document.getElementById("quick-toggle-once"), null);
  assert.equal(document.getElementById("quick-toggle-targeting").closest(".quick-module-card") !== null, true);
  assert.equal(document.getElementById("route-toggle-open-dry-run"), null);
  assert.equal(document.getElementById("quick-toggle-dry-run"), null);
  assert.equal(document.querySelector(".targeting-card"), null);
  assert.equal(document.querySelectorAll(".quick-module-card-placeholder").length, 0);
  assert.equal(document.querySelectorAll(".quick-module-open-placeholder").length, 0);
  assert.equal(document.querySelectorAll(".quick-module-toggle-placeholder").length, 0);
  assert.equal(document.getElementById("refresh").textContent, "Sync All Tabs");
  assert.equal(document.getElementById("kill-session").textContent, "Close Session");
  assert.equal(document.getElementById("new-route").textContent, "New Route");
  assert.equal(document.getElementById("window-pin").textContent, "Desk Pinned");
  assert.equal(getCompactText(document.getElementById("compact-view")), "CompactView");
  assert.equal(document.getElementById("desk-presets").disabled, false);
  assert.equal(document.getElementById("desk-macros"), null);
  assert.equal(document.querySelectorAll(".compact-grid-label").length, 0);
  assert.equal(document.querySelectorAll(".compact-grid").length, 2);
  assert.equal(document.getElementById("compact-open-targeting").closest(".compact-grid") !== null, true);
  assert.equal(document.getElementById("compact-toggle-healer").closest(".compact-split-card") !== null, true);
  assert.equal(document.getElementById("compact-toggle-haste").closest(".compact-split-card") !== null, true);
  assert.equal(document.getElementById("compact-toggle-ring-amulet-auto-replace").closest(".compact-split-card") !== null, true);
  assert.ok(document.getElementById("open-logs"));
  assert.equal(document.getElementById("compact-open-logs").dataset.openModal, "logs");
  assert.equal(document.getElementById("compact-open-targeting-module"), null);
  assert.equal(document.getElementById("compact-open-distance"), null);
  assert.equal(document.getElementById("compact-open-once"), null);
  assert.equal(document.getElementById("compact-open-dry-run"), null);
  assert.equal(document.getElementById("compact-toggle-targeting").closest(".compact-split-card") !== null, true);
  assert.equal(document.getElementById("compact-toggle-distance-keeper"), null);
  assert.equal(document.getElementById("compact-toggle-once"), null);
  assert.equal(document.getElementById("compact-toggle-dry-run"), null);
  assert.equal(document.getElementById("compact-route-stop-aggro").closest(".compact-grid") !== null, true);
  assert.equal(getCompactText(document.getElementById("route-reconnect-panel")), "ReconnWait");
  assert.equal(getCompactText(document.getElementById("route-stop-aggro-panel")), "StopAggro");
  assert.equal(getCompactText(document.getElementById("route-panel-button")), "RoutePanel");
  assert.equal(getCompactText(document.getElementById("route-off-button")), "RouteOff");
  assert.equal(getCompactText(document.getElementById("quick-toggle-cavebot-pause")), "StatusStopped");
  assert.match(document.getElementById("refresh").title, /sync all character tabs/i);
  assert.equal(document.getElementById("quick-toggle-autowalk").closest(".route-toggle-card")?.dataset.state, "on");
  assert.equal(document.getElementById("quick-toggle-mana-trainer").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.getElementById("quick-toggle-anti-idle").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.getElementById("compact-toggle-anti-idle").closest(".compact-split-card")?.dataset.state, "off");
  assert.equal(document.getElementById("quick-toggle-ammo").closest(".quick-module-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#quick-toggle-ammo strong")?.textContent?.trim(), "On");
  assert.equal(document.getElementById("compact-toggle-ammo").closest(".compact-split-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#compact-toggle-ammo strong")?.textContent?.trim(), "On");
  assert.equal(document.getElementById("quick-toggle-alarms").closest(".quick-module-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#quick-toggle-alarms strong")?.textContent?.trim(), "On");
  assert.equal(document.getElementById("compact-toggle-alarms").closest(".compact-split-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#compact-toggle-alarms strong")?.textContent?.trim(), "On");
  assert.equal(document.getElementById("quick-toggle-party-follow").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.getElementById("compact-toggle-party-follow").closest(".compact-split-card")?.dataset.state, "off");
  assert.match(document.getElementById("route-toggle-open-record").title, /record/i);

  document.getElementById("refresh").click();
  await flush();
  assert.equal(calls.refresh, 1);
  assert.equal(currentState().sessions.every((session) => session.connected), true);

  document.getElementById("window-pin").click();
  await flush();
  assert.equal(calls.setAlwaysOnTop.at(-1), false);
  assert.equal(currentState().alwaysOnTop, false);
  assert.equal(document.getElementById("window-pin").textContent, "Pin Desk");
  assert.equal(document.getElementById("window-pin").getAttribute("aria-pressed"), "false");

  document.querySelector('[data-session-select="page-2"]').click();
  await flush();
  assert.equal(calls.selectSession.at(-1), "page-2");
  assert.equal(currentState().binding.characterName, "Scout Beta");
  assert.equal(document.querySelector('[data-session-select="page-2"]').getAttribute("aria-selected"), "true");

  for (const name of ["targeting", "autowalk", "healer", "trainer", "manaTrainer", "autoEat", "haste", "ammo", "ringAutoReplace", "runeMaker", "spellCaster", "autoLight", "autoConvert", "looting", "banking", "accounts", "presets", "logs"]) {
    document.querySelector(`[data-open-modal="${name}"]`).click();
    await flush();

    assert.equal(document.getElementById("modal-layer").hidden, false);
    assert.equal(document.querySelector(`[data-modal="${resolveModalName(name)}"]`).classList.contains("open"), true);

    const closeButton = document.querySelector(`#${resolveModalId(name)} [data-close-modal]`);
    if (closeButton) {
      closeButton.click();
    } else {
      document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    await flush();
    assert.equal(document.getElementById("modal-layer").hidden, true);
  }

  document.getElementById("quick-open-targeting").click();
  await flush();
  assert.equal(document.getElementById("modal-targeting").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "monster");
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();
  assert.equal(document.getElementById("modal-layer").hidden, true);

  document.querySelector('[data-session-toggle="page-2"]').click();
  await flush();
  assert.equal(calls.toggleRun.length, 1);
  assert.equal(currentState().running, true);
  assert.equal(getCompactText(document.getElementById("quick-toggle-cavebot-pause")), "StatusRunning");

  document.getElementById("route-stop-aggro-panel").click();
  await flush();
  assert.equal(calls.stopAggro.at(-1), "page-2");
  assert.equal(currentState().snapshot.currentTarget, null);
  assert.equal(currentState().options.stopAggroHold, true);
  assert.equal(getCompactText(document.getElementById("route-stop-aggro-panel")), "StopHeld");
  assert.equal(document.getElementById("route-stop-aggro-panel").classList.contains("active"), true);
  assert.equal(getCompactText(document.getElementById("quick-toggle-targeting")), "PowerOff");
  assert.equal(getCompactText(document.getElementById("compact-toggle-targeting")), "PowerOff");

  const waypointOverlayBeforeProxyClick = currentState().options.showWaypointOverlay;
  const proxySessionOverlayCallCount = calls.setSessionWaypointOverlays.length;
  const proxySessionOverlayUpdateCount = calls.updateOptions.length;
  document.getElementById("quick-open-session-waypoints").click();
  await flush();
  assert.equal(currentState().options.showWaypointOverlay, !waypointOverlayBeforeProxyClick);
  assert.equal(calls.setSessionWaypointOverlays.length, proxySessionOverlayCallCount + 1);
  assert.equal(calls.setSessionWaypointOverlays.at(-1), !waypointOverlayBeforeProxyClick);
  assert.equal(calls.updateOptions.length, proxySessionOverlayUpdateCount);

  document.getElementById("quick-toggle-cavebot-pause").click();
  await flush();
  assert.equal(calls.stopAllBots.at(-1), "__all__");
  assert.equal(currentState().running, false);
  assert.equal(currentState().options.cavebotPaused, true);
  assert.equal(currentState().sessions.every((session) => session.cavebotPaused), true);
  assert.equal(currentState().sessions.every((session) => !session.running), true);
  assert.equal(getCompactText(document.getElementById("quick-toggle-cavebot-pause")), "StatusStopped");

  const quickToggleCases = [
    ["quick-toggle-autowalk", "autowalkEnabled"],
    ["quick-toggle-loop", "autowalkLoop"],
    ["quick-toggle-record", "routeRecording"],
    ["quick-toggle-waypoints", "showWaypointOverlay"],
    ["quick-toggle-avoid-fields", "avoidElementalFields"],
    ["quick-toggle-healer", "healerEnabled"],
    ["quick-toggle-trainer", "trainerEnabled"],
    ["quick-toggle-mana-trainer", "manaTrainerEnabled"],
    ["quick-toggle-auto-eat", "autoEatEnabled"],
    ["quick-toggle-haste", "hasteEnabled"],
    ["quick-toggle-ammo", "ammoEnabled"],
    ["quick-toggle-ring-amulet-auto-replace", "ringAutoReplaceEnabled"],
    ["quick-toggle-rune-maker", "runeMakerEnabled"],
    ["quick-toggle-spell-caster", "spellCasterEnabled"],
    ["quick-toggle-auto-light", "autoLightEnabled"],
    ["quick-toggle-convert", "autoConvertEnabled"],
    ["quick-toggle-anti-idle", "antiIdleEnabled"],
    ["quick-toggle-alarms", "alarmsEnabled"],
    ["quick-toggle-team-hunt", "teamEnabled"],
    ["quick-toggle-party-follow", "partyFollowEnabled"],
  ];

  const routeWaypointSessionOverlayCallCount = calls.setSessionWaypointOverlays.length;
  for (const [id, key] of quickToggleCases) {
    const before = currentState().options[key];
    document.getElementById(id).click();
    await flush();
    assert.equal(currentState().options[key], !before, `${id} should toggle ${key}`);
    if (id === "quick-toggle-waypoints") {
      assert.equal(calls.setSessionWaypointOverlays.length, routeWaypointSessionOverlayCallCount);
    }
    if (id === "quick-toggle-ring-amulet-auto-replace") {
      assert.equal(currentState().options.amuletAutoReplaceEnabled, !before, `${id} should toggle amuletAutoReplaceEnabled`);
    }
  }
  const teamPayload = calls.updateOptions.find((payload) => Object.hasOwn(payload, "teamEnabled") && payload.teamEnabled === true);
  assert.equal(Object.hasOwn(teamPayload || {}, "partyFollowEnabled"), false);
  const followPayload = calls.updateOptions.find((payload) => Object.hasOwn(payload, "partyFollowEnabled") && payload.partyFollowEnabled === true);
  assert.equal(Object.hasOwn(followPayload || {}, "teamEnabled"), false);
  assert.equal(document.getElementById("quick-toggle-autowalk").closest(".route-toggle-card")?.dataset.state, "off");
  assert.equal(document.getElementById("quick-toggle-mana-trainer").closest(".quick-module-card")?.dataset.state, "on");
  assert.equal(document.getElementById("quick-toggle-anti-idle").closest(".quick-module-card")?.dataset.state, "on");
  assert.equal(document.getElementById("compact-toggle-anti-idle").closest(".compact-split-card")?.dataset.state, "on");
  assert.equal(document.getElementById("quick-toggle-ammo").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#quick-toggle-ammo strong")?.textContent?.trim(), "Off");
  assert.equal(document.getElementById("compact-toggle-ammo").closest(".compact-split-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#compact-toggle-ammo strong")?.textContent?.trim(), "Off");
  assert.equal(document.getElementById("quick-toggle-alarms").closest(".quick-module-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#quick-toggle-alarms strong")?.textContent?.trim(), "Off");
  assert.equal(document.getElementById("compact-toggle-alarms").closest(".compact-split-card")?.dataset.state, "off");
  assert.equal(document.querySelector("#compact-toggle-alarms strong")?.textContent?.trim(), "Off");
  assert.equal(document.getElementById("quick-toggle-party-follow").closest(".quick-module-card")?.dataset.state, "on");
  assert.equal(document.getElementById("compact-toggle-party-follow").closest(".compact-split-card")?.dataset.state, "on");

  const sessionWaypointsBeforeToggle = currentState().options.showWaypointOverlay;
  const sessionOverlayCallCount = calls.setSessionWaypointOverlays.length;
  const sessionOverlayUpdateCount = calls.updateOptions.length;
  document.getElementById("quick-toggle-session-waypoints").click();
  await flush();
  assert.equal(currentState().options.showWaypointOverlay, !sessionWaypointsBeforeToggle);
  assert.equal(calls.setSessionWaypointOverlays.length, sessionOverlayCallCount + 1);
  assert.equal(calls.setSessionWaypointOverlays.at(-1), !sessionWaypointsBeforeToggle);
  assert.equal(calls.updateOptions.length, sessionOverlayUpdateCount);

  document.getElementById("route-toggle-open-record").click();
  await flush();
  assert.equal(document.activeElement.id, "routeRecordStep");
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();

  document.getElementById("route-toggle-open-waypoints").click();
  await flush();
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "add-current-waypoint");
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();

  document.getElementById("route-reset-panel").click();
  await flush();
  assert.equal(calls.returnToStart.at(-1), "page-2");
  assert.equal(currentState().routeResetActive, true);
  assert.equal(currentState().routeResetPhase, "returning");

  document.getElementById("quick-open-avoid-fields").click();
  await flush();
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "avoidElementalFields");
  const avoidFieldFireToggle = document.getElementById("avoid-field-fire");
  const wasAvoidFieldFireDisabled = avoidFieldFireToggle.disabled;
  document.getElementById("avoidElementalFields").click();
  assert.equal(avoidFieldFireToggle.disabled, !wasAvoidFieldFireDisabled);
  document.getElementById("avoidElementalFields").click();
  assert.equal(avoidFieldFireToggle.disabled, wasAvoidFieldFireDisabled);
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await flush();

  document.getElementById("quick-open-targeting").click();
  await flush();
  document.getElementById("monster").value = "Dragon\nRat";
  document.getElementById("rangeX").value = "9";
  document.getElementById("save-targeting").click();
  await flush();
  assert.equal(calls.updateOptions.at(-1).monster, "Dragon\nRat");
  assert.equal(currentState().options.monster, "Dragon, Rat");
  assert.deepEqual(currentState().options.monsterNames, ["Dragon", "Rat"]);
  assert.equal(currentState().options.rangeX, 9);

  document.querySelector('[data-open-modal="healer"]').click();
  await flush();
  document.querySelector('[data-module-key="healer"][data-rule-index="1"][data-rule-field="words"]').value = "Ultimate Healing Rune";
  document.querySelector('[data-module-key="healer"][data-rule-index="1"][data-rule-field="hotkey"]').value = "F6";
  document.querySelector('[data-module-key="healer"][data-rule-index="1"][data-rule-field="maxHealthPercent"]').value = "50";
  document.querySelector('[data-module-key="healer"][data-module-option-field="healerEmergencyHealthPercent"]').value = "35";
  document.querySelector('[data-save-modules]').click();
  await flush();
  assert.equal(calls.updateOptions.at(-1).healerRules[1].words, "Ultimate Healing Rune");
  assert.equal(calls.updateOptions.at(-1).healerRules[1].hotkey, "F6");
  assert.equal(calls.updateOptions.at(-1).healerEmergencyHealthPercent, 35);
  assert.equal(calls.updateOptions.at(-1).healerRuneName, "");
  assert.equal(calls.updateOptions.at(-1).healerRuneHotkey, "");
  assert.equal(calls.updateOptions.at(-1).healerRuneHealthPercent, 0);
  assert.deepEqual(currentState().options.healerRules, [
    {
      enabled: true,
      label: "",
      words: "exura vita",
      hotkey: "",
      minHealthPercent: 0,
      maxHealthPercent: 30,
      minMana: 80,
      minManaPercent: 0,
      cooldownMs: 900,
    },
    {
      enabled: true,
      label: "",
      words: "Ultimate Healing Rune",
      hotkey: "F6",
      minHealthPercent: 31,
      maxHealthPercent: 50,
      minMana: 60,
      minManaPercent: 0,
      cooldownMs: 900,
    },
    {
      enabled: true,
      label: "",
      words: "exura",
      hotkey: "",
      minHealthPercent: 56,
      maxHealthPercent: 80,
      minMana: 20,
      minManaPercent: 0,
      cooldownMs: 900,
    },
  ]);
  assert.equal(currentState().options.healerEmergencyHealthPercent, 35);
  assert.equal(currentState().options.healerRuneName, "");
  assert.equal(currentState().options.healerRuneHotkey, "");
  assert.equal(currentState().options.healerRuneHealthPercent, 0);
  assert.deepEqual(currentState().options.healerTiers, [
    {
      words: "exura vita",
      healthPercent: 30,
      minMana: 80,
      minManaPercent: 0,
    },
    {
      words: "Ultimate Healing Rune",
      healthPercent: 50,
      minMana: 60,
      minManaPercent: 0,
    },
    {
      words: "exura",
      healthPercent: 80,
      minMana: 20,
      minManaPercent: 0,
    },
  ]);
  assert.ok(
    Array.from(document.querySelectorAll('[data-module-key="healer"][data-rule-index="0"][data-rule-field="words"] option'))
      .some((option) => option.textContent.trim() === "Ultimate Healing Rune / self"),
  );

  document.getElementById("open-route-panel").click();
  await flush();

  document.querySelectorAll(".waypoint-row")[1].click();
  await flush();
  assert.equal(calls.setOverlayFocus.at(-1), 1);

  document.getElementById("route-item-label").value = "Pull Spot";
  document.getElementById("waypoint-type").value = "stairs-up";
  document.getElementById("waypoint-step-radius").value = "2";
  document.getElementById("save-waypoint").click();
  await flush();
  assert.deepEqual(calls.updateWaypoint.at(-1), {
    index: 1,
    patch: {
      x: 101,
      y: 201,
      z: 7,
      label: "Pull Spot",
      type: "stairs-up",
      radius: 2,
    },
  });

  document.getElementById("move-waypoint-up").click();
  await flush();
  assert.deepEqual(calls.moveWaypoint.at(-1), { index: 1, delta: -1 });

  document.getElementById("move-waypoint-down").click();
  await flush();
  assert.deepEqual(calls.moveWaypoint.at(-1), { index: 0, delta: 1 });

  document.getElementById("reset-route").click();
  await flush();
  assert.equal(calls.resetRoute.at(-1), 1);

  document.getElementById("quick-reset-route").click();
  await flush();
  assert.equal(calls.returnToStart.at(-1), currentState().activeSessionId);
  assert.equal(currentState().options.cavebotPaused, false);
  assert.equal(currentState().sessions.find((session) => session.id === currentState().activeSessionId)?.cavebotPaused, false);
  assert.equal(getCompactText(document.getElementById("quick-toggle-cavebot-pause")), "StatusRunning");
  assert.equal(currentState().routeResetActive, true);

  document.getElementById("add-current-waypoint").click();
  await flush();
  assert.equal(document.getElementById("waypoint-add-panel").hidden, false);
  document.querySelector('[data-add-waypoint-type="helper"]').click();
  await flush();
  assert.deepEqual(calls.addCurrentWaypoint.at(-1), "helper");
  assert.equal(currentState().options.waypoints.at(-1).type, "helper");
  assert.equal(document.getElementById("waypoint-type").value, "helper");
  assert.match(document.getElementById("waypoint-type-help").textContent, /recovery/i);

  document.getElementById("add-current-waypoint").click();
  await flush();
  document.querySelector('[data-add-waypoint-type="rope"]').click();
  await flush();
  assert.deepEqual(calls.addCurrentWaypoint.at(-1), "rope");
  assert.equal(currentState().options.waypoints.at(-1).type, "rope");

  document.getElementById("add-current-waypoint").click();
  await flush();
  document.querySelector('[data-add-waypoint-type="action"]').click();
  await flush();
  assert.deepEqual(calls.addCurrentWaypoint.at(-1), "action");
  assert.equal(currentState().options.waypoints.at(-1).type, "action");
  assert.equal(document.getElementById("waypoint-action-fields").hidden, false);

  document.getElementById("waypoint-action").value = "goto";
  document.getElementById("waypoint-action").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("waypoint-action-target").value = "1";
  document.getElementById("save-waypoint").click();
  await flush();
  assert.deepEqual(calls.updateWaypoint.at(-1), {
    index: currentState().options.waypoints.length - 1,
    patch: {
      x: 100,
      y: 200,
      z: 7,
      label: `Waypoint ${String(currentState().options.waypoints.length).padStart(3, "0")}`,
      type: "action",
      radius: null,
      action: "goto",
      targetIndex: 1,
    },
  });
  assert.equal(document.getElementById("waypoint-step-radius").value, "");

  document.getElementById("remove-waypoint").click();
  await flush();
  assert.match(document.getElementById("route-danger-summary").textContent, /confirm waypoint delete/i);
  document.getElementById("remove-waypoint").click();
  await flush();
  assert.ok(calls.removeWaypoint.length >= 1);

  document.getElementById("cavebotName").value = "route-alpha";
  document.getElementById("routeStrictClear").checked = true;
  document.getElementById("avoid-field-teleports").checked = false;
  document.getElementById("avoid-field-holes").checked = false;
  document.getElementById("vocation").value = "paladin";
  document.getElementById("sustainEnabled").checked = false;
  document.getElementById("sustainCooldownMs").value = "1500";
  document.getElementById("preferHotbarConsumables").checked = false;
  document.getElementById("monster").value = "Hidden Dragon";
  document.getElementById("rangeX").value = "13";
  document.getElementById("save-autowalk").click();
  await flush();
  assert.equal(calls.updateOptions.at(-1).cavebotName, "route-alpha");
  assert.equal(calls.updateOptions.at(-1).routeStrictClear, true);
  assert.equal(calls.updateOptions.at(-1).avoidFieldCategories.teleports, false);
  assert.equal(calls.updateOptions.at(-1).avoidFieldCategories.holes, false);
  assert.equal(calls.updateOptions.at(-1).vocation, "paladin");
  assert.equal(calls.updateOptions.at(-1).sustainEnabled, false);
  assert.equal(calls.updateOptions.at(-1).sustainCooldownMs, 1500);
  assert.equal(calls.updateOptions.at(-1).preferHotbarConsumables, false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "monster"), false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "targetProfiles"), false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "sharedSpawnMode"), false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "rangeX"), false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "reconnectRetryDelayMs"), false);
  assert.equal(Object.hasOwn(calls.updateOptions.at(-1), "reconnectEnabled"), false);
  assert.equal(currentState().options.cavebotName, "route-alpha");
  assert.equal(currentState().options.routeStrictClear, true);
  assert.equal(currentState().options.avoidFieldCategories.teleports, false);
  assert.equal(currentState().options.avoidFieldCategories.holes, false);
  assert.equal(currentState().options.vocation, "paladin");
  assert.equal(currentState().options.sustainEnabled, false);
  assert.equal(currentState().options.sustainCooldownMs, 1500);
  assert.equal(currentState().options.preferHotbarConsumables, false);
  assert.equal(currentState().options.monster, "Dragon, Rat");
  assert.equal(currentState().options.rangeX, 9);
  assert.equal(document.getElementById("route-library-select").value, "route-alpha");

  document.getElementById("clear-route").click();
  await flush();
  assert.match(document.getElementById("route-danger-summary").textContent, /confirm clear/i);
  document.getElementById("clear-route").click();
  await flush();
  assert.equal(currentState().options.waypoints.length, 0);
  assert.equal(document.getElementById("save-waypoint").disabled, true);
  assert.equal(document.getElementById("remove-waypoint").disabled, true);
  assert.equal(document.getElementById("quick-reset-route").disabled, true);
  assert.equal(document.getElementById("route-reset-panel").disabled, true);
  assert.match(document.getElementById("route-file-path").textContent, /route-alpha\.json/i);

  document.getElementById("route-library-select").value = "cyclops-loop";
  document.getElementById("route-library-select").dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  assert.equal(calls.loadRoute.at(-1), undefined);
  document.getElementById("load-route").click();
  await flush();
  assert.equal(calls.loadRoute.at(-1), "cyclops-loop");
  assert.equal(currentState().options.cavebotName, "cyclops-loop");
  assert.equal(document.getElementById("waypoint-type").value, "ladder");
  assert.match(document.getElementById("waypoint-type-help").textContent, /floor change/i);

  document.getElementById("new-blank-route").click();
  await flush();
  assert.deepEqual(calls.updateOptions.at(-1), {
    cavebotName: "",
    waypoints: [],
    tileRules: [],
  });
  assert.equal(currentState().options.cavebotName, "");
  assert.equal(currentState().options.waypoints.length, 0);
  assert.match(document.getElementById("route-file-path").textContent, /blank draft/i);

  document.getElementById("route-library-select").value = "dararotworms";
  document.getElementById("route-library-select").dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  document.getElementById("delete-route").click();
  await flush();
  assert.match(document.getElementById("route-danger-summary").textContent, /confirm delete/i);
  document.getElementById("delete-route").click();
  await flush();
  assert.equal(calls.deleteRoute.at(-1), "dararotworms");
  assert.deepEqual(currentState().routeLibrary.map((entry) => entry.name), ["cyclops-loop", "route-alpha"]);
});

test("accounts modal saves manual-login drafts through the dedicated account registry bridge", async () => {
  const desk = await createDesk();
  const { document, window, calls, currentState } = desk;
  window.confirm = () => true;

  document.getElementById("desk-accounts").click();
  await flush();

  assert.equal(document.getElementById("modal-accounts").classList.contains("open"), true);
  assert.equal(document.getElementById("account-select").value, "main-pair");
  assert.match(document.getElementById("account-meta").textContent, /active character linked/i);

  document.getElementById("new-account").click();
  await flush();

  document.getElementById("account-label").value = "Bench Login";
  document.getElementById("account-label").dispatchEvent(new window.Event("input", { bubbles: true }));
  document.getElementById("account-login-method").value = "manual";
  document.getElementById("account-login-method").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("account-login-name").value = "bench@example.com";
  document.getElementById("account-login-name").dispatchEvent(new window.Event("input", { bubbles: true }));
  document.getElementById("account-preferred-character").value = "Scout Beta";
  document.getElementById("account-preferred-character").dispatchEvent(new window.Event("input", { bubbles: true }));
  document.getElementById("account-characters").value = "Scout Beta\nKnight Alpha";
  document.getElementById("account-characters").dispatchEvent(new window.Event("input", { bubbles: true }));
  document.getElementById("account-notes").value = "Manual fallback";
  document.getElementById("account-notes").dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.equal(document.getElementById("account-password").disabled, true);
  assert.equal(document.getElementById("account-secret-storage").value, "none");

  document.getElementById("save-account").click();
  await flush();

  assert.deepEqual(calls.saveAccount.at(-1), {
    id: "bench-login-bench-example-com-scout-beta",
    label: "Bench Login",
    loginMethod: "manual",
    loginName: "bench@example.com",
    password: "",
    secretStorage: "none",
    characters: ["Scout Beta", "Knight Alpha"],
    preferredCharacter: "Scout Beta",
    reconnectPolicy: "preferred-character",
    notes: "Manual fallback",
  });
  assert.equal(currentState().accounts.some((entry) => entry.id === "bench-login-bench-example-com-scout-beta"), true);
  assert.equal(document.getElementById("account-select").value, "bench-login-bench-example-com-scout-beta");

  document.getElementById("delete-account").click();
  await flush();

  assert.equal(calls.deleteAccount.at(-1), "bench-login-bench-example-com-scout-beta");
  assert.equal(currentState().accounts.some((entry) => entry.id === "bench-login-bench-example-com-scout-beta"), false);
});

test("starting a stopped session clears stale pause and aggro hold for that session", async () => {
  const initialState = createState();
  const built = buildSessionsFromTopLevel(initialState);
  initialState.activeSessionId = "page-2";
  initialState.running = false;
  initialState.options = normalizeOptions({
    ...initialState.options,
    cavebotPaused: true,
    stopAggroHold: true,
  });
  initialState.sessions = [
    {
      ...clone(built.sessions[0]),
      running: false,
      cavebotPaused: false,
      stopAggroHold: false,
    },
    {
      ...clone(built.sessions[1]),
      running: false,
      cavebotPaused: true,
      stopAggroHold: true,
    },
  ];

  const desk = await createDesk({ initialState });
  const { document, currentState, calls } = desk;

  document.querySelector('[data-session-toggle="page-2"]').click();
  await flush();

  assert.equal(calls.toggleRun.at(-1), "page-2");
  assert.equal(currentState().running, true);
  assert.equal(currentState().options.cavebotPaused, false);
  assert.equal(currentState().options.stopAggroHold, false);
  assert.equal(currentState().sessions.find((session) => session.id === "page-2")?.cavebotPaused, false);
  assert.equal(currentState().sessions.find((session) => session.id === "page-2")?.stopAggroHold, false);
});

test("master stop reflects running live sessions across the full desk, not only the active tab", async () => {
  const initialState = createState();
  const built = buildSessionsFromTopLevel(initialState);
  initialState.activeSessionId = "page-1";
  initialState.running = false;
  initialState.sessions = [
    {
      ...clone(built.sessions[0]),
      running: false,
      cavebotPaused: true,
    },
    {
      ...clone(built.sessions[1]),
      running: true,
      cavebotPaused: false,
    },
  ];

  const desk = await createDesk({ initialState });
  const { document } = desk;

  assert.equal(getCompactText(document.getElementById("quick-toggle-cavebot-pause")), "StatusRunning");
  assert.equal(document.getElementById("compact-cavebot-master-stop").textContent.trim(), "Stop 1");
  assert.match(document.getElementById("quick-open-cavebot-pause")?.title || "", /stop 1 tab/i);
});

test("hunt and trainer buttons open their panels", async () => {
  const desk = await createDesk();
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();
  assert.equal(document.getElementById("modal-targeting").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "monster");
  document.querySelector("#modal-targeting [data-close-modal]").click();
  await flush();

  document.getElementById("compact-open-targeting").click();
  await flush();
  assert.equal(document.getElementById("modal-targeting").classList.contains("open"), true);
  assert.equal(document.activeElement.id, "monster");
  document.querySelector("#modal-targeting [data-close-modal]").click();
  await flush();

  document.getElementById("quick-open-trainer").click();
  await flush();
  assert.equal(document.getElementById("modal-module").classList.contains("open"), true);
  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Trainer");
  assert.equal(document.querySelector('[data-module-key="partyFollow"]'), null);
  document.querySelector("#modal-module [data-close-modal]").click();
  await flush();

  document.getElementById("compact-open-trainer").click();
  await flush();
  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Trainer");
  assert.equal(document.querySelector('[data-module-key="partyFollow"]'), null);
  document.querySelector("#modal-module [data-close-modal]").click();
  await flush();

  document.getElementById("quick-open-party-follow").click();
  await flush();
  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Team Hunt");
  assert.equal(document.querySelector('[data-module-key="team"][data-module-option-field="teamEnabled"]') !== null, true);
  assert.equal(document.querySelector('[data-module-key="partyFollow"]') !== null, true);
  assert.equal(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerPartnerName"]'), null);
});

test("recent activity console shows active tab context and tagged newest events", async () => {
  const desk = await createDesk();
  const { document } = desk;

  assert.match(document.getElementById("event-feed-meta").textContent, /newest first/i);
  assert.match(document.getElementById("event-feed-summary").textContent, /Knight Alpha/);
  assert.match(document.getElementById("event-feed-summary").textContent, /Synced/i);

  const rows = [...document.querySelectorAll("#event-feed .feed-row")];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].classList.contains("latest"), true);
  assert.equal(rows[0].querySelector(".feed-row-badge")?.textContent, "Route");
  assert.match(rows[0].querySelector("strong")?.textContent || "", /Bot started/i);
  assert.equal(rows[1].querySelector(".feed-row-badge")?.textContent, "Sync");
});

test("recent activity console refreshes the active summary even when feed rows match", async () => {
  const initialState = createState({
    logs: ["[12:00:09] Session synced"],
  });
  const desk = await createDesk({ initialState });
  const { document, emit } = desk;

  assert.match(document.getElementById("event-feed-summary").textContent, /Knight Alpha/);

  emit("active-session", {}, createState({
    activeSessionId: "page-2",
    page: {
      id: "page-2",
      title: "Minibia",
      url: "https://minibia.com/play?client=2",
    },
    binding: {
      profileKey: "scout-beta",
      pageId: "page-2",
      url: "https://minibia.com/play?client=2",
      title: "Minibia",
      characterName: "Scout Beta",
      displayName: "Scout Beta",
      label: "Scout Beta",
    },
    snapshot: {
      playerName: "Scout Beta",
      visibleMonsterNames: ["Cyclops"],
      visibleCreatureNames: ["Cyclops"],
      visiblePlayerNames: [],
    },
    logs: ["[12:00:09] Session synced"],
  }));
  await flush();

  assert.match(document.getElementById("event-feed-summary").textContent, /Scout Beta/);
  assert.match(document.getElementById("event-feed-meta").textContent, /1 shown/i);
});

test("decision trace is visible in desktop, compact, and logs surfaces", async () => {
  const decisionTrace = {
    updatedAt: Date.parse("2026-04-28T12:00:00Z"),
    current: {
      owner: "looting",
      state: "acted",
      acted: true,
      reason: "move-item",
      action: {
        type: "loot",
        label: "Gold Coin",
        moduleKey: "looting",
        ruleIndex: null,
      },
      requiredSnapshotFamilies: ["self", "creatures", "inventory"],
      result: { ok: true, reason: "" },
    },
    blocker: {
      owner: "route",
      state: "blocked",
      acted: false,
      reason: "snapshot tiles stale",
      action: null,
      requiredSnapshotFamilies: ["self", "route", "tiles"],
      result: null,
    },
    records: [],
  };
  decisionTrace.records = [decisionTrace.current, decisionTrace.blocker];
  const desk = await createDesk({
    initialState: createState({
      snapshot: { decisionTrace },
    }),
  });
  const { document } = desk;

  assert.match(document.getElementById("event-feed-summary").textContent, /Decision\s+Looting/i);
  assert.match(document.getElementById("event-feed-summary").textContent, /Blocker\s+Route/i);
  assert.equal(document.getElementById("compact-decision-summary").textContent.trim(), "Looting");

  document.getElementById("open-logs").click();
  await flush();

  assert.match(document.getElementById("decision-trace-output").textContent, /Current\s+Looting/i);
  assert.match(document.getElementById("decision-trace-output").textContent, /Blocker\s+Route/i);
  assert.match(document.getElementById("decision-trace-output").textContent, /snapshot tiles stale/i);
});

test("logs surface hunt ledger, target scoring, and protector acknowledgement", async () => {
  const desk = await createDesk({
    initialState: createState({
      snapshot: {
        huntLedger: {
          kills: 12,
          lootGoldValue: 3_200,
          profitPerHour: 2_450,
          unknownValueItems: [],
          capacityDecision: {
            action: "sell-branch",
            reason: "capacity tight; sellable loot available",
          },
        },
        targetScoring: {
          selectedTargetName: "Dragon",
          selectedMovementIntent: "distance",
          candidates: [
            { id: 101, name: "Dragon", score: 3450, skippedReasons: [] },
            { id: 102, name: "Dragon Lord", score: 1180, skippedReasons: ["last profile"] },
          ],
        },
        protectorStatus: {
          active: true,
          highestSeverity: "critical",
          activeAlarms: [
            {
              type: "low-hp",
              reason: "HP at 20%",
              actions: ["pause-route", "stop-targeter", "require-acknowledgement"],
            },
          ],
          pausedModules: ["route", "targeter"],
          acknowledgementRequired: true,
          acknowledged: false,
        },
        runtimeDiagnostics: {
          ok: true,
          diagnostics: [
            {
              severity: "warning",
              code: "backpack-window-state-loss",
              message: "no open backpack containers were detected",
            },
          ],
        },
      },
    }),
  });
  const { document } = desk;

  document.getElementById("open-logs").click();
  await flush();

  const output = document.getElementById("decision-trace-output");
  assert.match(output.textContent, /Hunt Ledger/i);
  assert.match(output.textContent, /12 kills/i);
  assert.match(output.textContent, /Loot Rules/i);
  assert.match(output.textContent, /sell-branch/i);
  assert.match(output.textContent, /Target Scores/i);
  assert.match(output.textContent, /Dragon 3450/i);
  assert.match(output.textContent, /Stance Intent/i);
  assert.match(output.textContent, /distance/i);
  assert.match(output.textContent, /Protector/i);
  assert.match(output.textContent, /HP at 20%/i);
  assert.match(output.textContent, /Diagnostics/i);
  assert.match(output.textContent, /no open backpack containers/i);

  output.querySelector("[data-protector-ack]").click();
  await flush(8);

  assert.deepEqual(desk.calls.acknowledgeProtector, [
    { sessionId: "page-1", options: { resume: true } },
  ]);
  assert.equal(desk.currentState().snapshot.protectorStatus.active, false);
});

test("route validation report is visible and highlights broken waypoints", async () => {
  const routeValidation = {
    schemaVersion: 1,
    sourceName: "dararotworms",
    signature: "validation-test",
    ok: false,
    requiresAcknowledgement: true,
    summary: {
      ok: false,
      errorCount: 1,
      warningCount: 1,
      infoCount: 0,
      highestSeverity: "error",
      firstProblemWaypointIndex: 1,
    },
    issues: [
      {
        severity: "error",
        code: "broken-goto",
        message: "waypoint 2 has a goto action without a valid target waypoint.",
        waypointIndex: 1,
        field: "targetIndex",
        requiresAcknowledgement: true,
      },
      {
        severity: "warning",
        code: "duplicate-position",
        message: "waypoint 3 repeats the previous waypoint position.",
        waypointIndex: 2,
        field: "position",
        requiresAcknowledgement: false,
      },
    ],
  };
  const desk = await createDesk({
    initialState: createState({ routeValidation }),
  });
  const { document } = desk;

  const summary = document.getElementById("route-validation-summary");
  assert.equal(summary.hidden, false);
  assert.equal(summary.dataset.tone, "error");
  assert.match(summary.textContent, /Validation blocked at waypoint 2/i);
  assert.match(document.getElementById("route-overview-note").textContent, /Validation blocked/i);
  assert.equal(document.querySelector('.waypoint-row[data-index="1"]')?.classList.contains("validation-error"), true);
  assert.equal(document.querySelector('.waypoint-row[data-index="2"]')?.classList.contains("validation-warning"), true);
});

test("route pack import preview shows diff and requires explicit apply", async () => {
  const desk = await createDesk();
  const { document, calls, currentState } = desk;

  document.getElementById("import-route-pack").click();
  await flush();

  const preview = document.getElementById("route-pack-preview");
  assert.equal(calls.previewRoutePackImport, 1);
  assert.equal(preview.hidden, false);
  assert.match(preview.textContent, /imported-route/i);
  assert.match(preview.textContent, /2 changes?/i);
  assert.match(preview.textContent, /validation warning/i);
  assert.equal(document.getElementById("apply-route-pack-import").hidden, false);

  document.getElementById("apply-route-pack-import").click();
  await flush();

  assert.equal(calls.applyRoutePackImport, 1);
  assert.equal(currentState().routePackImportPreview, null);
  assert.equal(currentState().options.cavebotName, "imported-route");
});

test("main window controls expose brief informative tooltips", async () => {
  const desk = await createDesk();
  const { document } = desk;

  assert.match(document.getElementById("route-overview-card").title, /route overview panel/i);
  assert.match(document.querySelector(".quick-module-card")?.title || "", /module card with status summary/i);
  assert.match(document.querySelector(".route-overview-metric-button")?.title || "", /route panel/i);
  assert.match(document.getElementById("route-toggle-open-walk").title, /open route builder/i);
  assert.match(document.getElementById("route-toggle-waypoints-card").title, /waypoints route card/i);
  assert.match(document.querySelector(".compact-split-card")?.title || "", /compact card/i);
  assert.match(document.querySelector(".feed-summary-card")?.title || "", /recent activity summary/i);
  assert.match(document.getElementById("routeRecordStep").title, /set record step/i);
  assert.equal(document.querySelector("[data-module-enabled-toggle]"), null);
  assert.match(document.getElementById("window-pin").title, /pinned above other windows|let it float/i);
});

test("main window hover tooltips wait briefly before showing and hide on leave", async () => {
  const desk = await createDesk();
  const { document, window } = desk;
  const target = document.getElementById("new-session");
  const tooltip = document.getElementById("main-window-hover-tooltip");
  const initialTitle = target.title;

  target.dispatchEvent(new window.MouseEvent("mouseover", {
    bubbles: true,
    clientX: 40,
    clientY: 48,
  }));

  assert.equal(target.title, "");
  assert.equal(tooltip.hidden, true);

  await waitFor(420);
  assert.equal(tooltip.hidden, true);

  await waitFor(120);
  assert.equal(tooltip.hidden, false);
  assert.match(tooltip.textContent, /launch a new minibia client window/i);

  target.dispatchEvent(new window.MouseEvent("mouseout", {
    bubbles: true,
    relatedTarget: document.body,
  }));
  await flush();

  assert.equal(tooltip.hidden, true);
  assert.equal(target.title, initialTitle);
});

test("healer modal renders tier cards without repeated headers or summaries", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        healerRules: [
          {
            enabled: true,
            label: "",
            words: "exura vita",
            minHealthPercent: 10,
            maxHealthPercent: 30,
            minMana: 80,
            minManaPercent: 0,
            cooldownMs: 900,
          },
          {
            enabled: true,
            label: "",
            words: "exura gran",
            minHealthPercent: 40,
            maxHealthPercent: 60,
            minMana: 60,
            minManaPercent: 0,
            cooldownMs: 900,
          },
        ],
      },
    }),
  });
  const { document } = desk;

  document.querySelector('[data-open-modal="healer"]').click();
  await flush();

  assert.match(document.getElementById("module-note").textContent, /covers 0% hp/i);
  assert.equal(document.querySelector("#modal-module > .modal-head").hidden, true);
  assert.equal(document.getElementById("modal-module").classList.contains("module-modal-headless"), true);
  assert.equal(document.getElementById("add-module-rule").hidden, true);
  assert.equal(document.querySelector("#module-rule-list > .module-rule-inline-toolbar [data-add-module-rule='healer']")?.textContent.trim(), "Add Tier");

  const cards = [...document.querySelectorAll('[data-module-key="healer"].module-rule-card')];
  assert.equal(cards.length, 2);
  assert.equal(document.querySelector(".healer-priority-head"), null);

  for (const card of cards) {
    assert.equal(card.querySelector(".module-rule-head"), null);
    assert.equal(card.querySelector(".module-rule-name"), null);
    assert.equal(card.querySelector(".module-rule-summary"), null);
    assert.equal(card.querySelector(".module-rule-section-title"), null);
    assert.ok(card.querySelector(".module-rule-toolbar [data-delete-module-rule='healer']"));
    assert.ok(card.querySelector(".module-rule-corner-toggle input[data-rule-field='enabled']"));
    assert.equal(card.querySelector(".module-rule-check input[data-rule-field='enabled']"), null);
    assert.equal(card.querySelectorAll("input[data-rule-field='enabled']").length, 1);
    assert.ok(card.querySelector('[data-module-key="healer"][data-rule-field="words"]'));
    assert.equal(
      card.querySelector('[data-module-key="healer"][data-rule-field="hotkey"]')?.closest(".module-rule-section"),
      card.querySelector('[data-module-key="healer"][data-rule-field="label"]')?.closest(".module-rule-section"),
    );
    assert.deepEqual(
      [...card.querySelectorAll(".module-rule-section")]
        .map((section) => section.querySelectorAll("[data-rule-field]").length),
      [2, 2, 2, 2],
    );
    assert.ok(card.querySelector('[data-module-key="healer"][data-rule-field="minHealthPercent"]'));
    assert.ok(card.querySelector('[data-module-key="healer"][data-rule-field="maxHealthPercent"]'));
  }

  assert.match(stylesSource, /\.module-rule-toolbar[\s\S]*justify-content:\s*space-between/);
  assert.match(stylesSource, /\.module-rule-toolbar \.module-rule-actions[\s\S]*margin-left:\s*auto/);
});

test("route stack rows double click opens the editor and right click resumes from that waypoint", async () => {
  const desk = await createDesk({
    initialState: createState({
      routeIndex: 0,
      overlayFocusIndex: 0,
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.getElementById("open-route-panel").click();
  await flush();

  const targetRow = document.querySelectorAll("#waypoint-list .waypoint-row")[2];
  targetRow.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
  await flush();

  assert.equal(calls.setOverlayFocus.at(-1), 2);
  assert.notEqual(document.activeElement?.id, "route-item-label");

  const refreshedRow = document.querySelectorAll("#waypoint-list .waypoint-row")[2];
  refreshedRow.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, button: 0 }));
  await flush();

  assert.equal(document.activeElement?.id, "route-item-label");
  assert.equal(calls.setOverlayFocus.at(-1), 2);

  const contextmenuEvent = new window.MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    button: 2,
  });
  const latestRow = document.querySelectorAll("#waypoint-list .waypoint-row")[2];
  latestRow.dispatchEvent(contextmenuEvent);
  await flush();

  assert.equal(calls.resetRoute.at(-1), 2);
  assert.equal(calls.setOverlayFocus.at(-1), 2);
  assert.equal(currentState().routeIndex, 2);
  assert.equal(currentState().overlayFocusIndex, 2);
});

test("live route preview right click marks the resumed tile as the target highlight", async () => {
  const desk = await createDesk({
    initialState: createState({
      routeIndex: 0,
      overlayFocusIndex: 0,
    }),
  });
  const { document, window, calls, currentState } = desk;

  const targetTile = document.querySelectorAll("#route-live-preview .route-live-waypoint")[2];
  targetTile.dispatchEvent(new window.MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    button: 2,
  }));
  await flush();

  const resumedTile = document.querySelectorAll("#route-live-preview .route-live-waypoint")[2];
  assert.equal(calls.resetRoute.at(-1), 2);
  assert.equal(calls.setOverlayFocus.at(-1), 2);
  assert.equal(currentState().routeIndex, 2);
  assert.equal(currentState().overlayFocusIndex, 2);
  assert.equal(resumedTile?.classList.contains("resume-target"), true);
  assert.equal(resumedTile?.classList.contains("current"), true);
  assert.match(resumedTile?.querySelector(".waypoint-chip-flags")?.textContent || "", /Target/);

  const editTile = document.querySelectorAll("#route-live-preview .route-live-waypoint")[1];
  editTile.dispatchEvent(new window.MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
  }));
  await flush();

  assert.equal(document.querySelector("#route-live-preview .route-live-waypoint.resume-target"), null);
});

test("session actions reset routes, clear aggro, and close sessions", async () => {
  const desk = await createDesk({
    initialState: createState({
      snapshot: {
        connection: {
          connected: false,
          canReconnect: true,
          reconnecting: false,
        },
      },
    }),
  });
  const { document, calls, currentState } = desk;

  document.getElementById("route-stop-aggro-panel").click();
  await flush();
  assert.equal(calls.stopAggro.at(-1), "page-1");
  assert.equal(currentState().snapshot.currentTarget, null);
  assert.equal(currentState().options.stopAggroHold, true);
  assert.equal(getCompactText(document.getElementById("route-stop-aggro-panel")), "StopHeld");
  assert.equal(getCompactText(document.getElementById("compact-route-stop-aggro")), "StopAggroHeld");

  document.getElementById("route-reconnect-panel").click();
  await flush();
  assert.equal(calls.reconnectSession.at(-1), "page-1");
  assert.equal(currentState().reconnectStatus?.phase, "attempting");
  assert.equal(getCompactText(document.getElementById("route-reconnect-panel")), "ReconnLive");
  assert.equal(document.getElementById("route-reconnect-panel").classList.contains("active"), true);

  document.getElementById("new-route").click();
  await flush();
  assert.deepEqual(calls.updateOptions.at(-1), {
    cavebotName: "",
    waypoints: [],
    tileRules: [],
  });
  assert.equal(currentState().options.cavebotName, "");
  assert.deepEqual(currentState().options.waypoints, []);

  document.getElementById("kill-session").click();
  await flush();
  assert.equal(calls.killSession.at(-1), "page-1");
  assert.equal(currentState().activeSessionId, "page-2");
  assert.equal(currentState().sessions.some((session) => session.id === "page-1"), false);
});

test("targeting module toggle mirrors live aggro hold state", async () => {
  const desk = await createDesk();
  const { document, calls, currentState } = desk;
  const targetingToggle = document.getElementById("quick-toggle-targeting");
  const compactTargetingToggle = document.getElementById("compact-toggle-targeting");

  assert.equal(getCompactText(targetingToggle), "PowerOn");
  assert.equal(getCompactText(compactTargetingToggle), "PowerOn");
  assert.equal(targetingToggle.classList.contains("active"), true);
  assert.match(targetingToggle.title, /click to pause combat targeting/i);

  targetingToggle.click();
  await flush();

  assert.equal(calls.stopAggro.at(-1), "page-1");
  assert.equal(currentState().options.stopAggroHold, true);
  assert.equal(currentState().snapshot.currentTarget, null);
  assert.equal(getCompactText(targetingToggle), "PowerOff");
  assert.equal(getCompactText(compactTargetingToggle), "PowerOff");
  assert.equal(targetingToggle.classList.contains("active"), false);
  assert.match(targetingToggle.title, /click to resume combat targeting/i);
  assert.equal(getCompactText(document.getElementById("route-stop-aggro-panel")), "StopHeld");

  compactTargetingToggle.click();
  await flush();

  assert.equal(calls.stopAggro.at(-1), "page-1");
  assert.equal(currentState().options.stopAggroHold, false);
  assert.equal(getCompactText(targetingToggle), "PowerOn");
  assert.equal(getCompactText(compactTargetingToggle), "PowerOn");
  assert.equal(targetingToggle.classList.contains("active"), true);
  assert.equal(getCompactText(document.getElementById("route-stop-aggro-panel")), "StopAggro");
});

test("effective module cards surface follow-owned route control and blocked trainer state", async () => {
  const initialState = createState({
    activeSessionId: "page-2",
    page: {
      id: "page-2",
      title: "Minibia",
      url: "https://minibia.com/play?client=2",
    },
    snapshot: {
      playerName: "Scout Beta",
      playerPosition: { x: 105, y: 205, z: 7 },
      currentTarget: {
        id: 99,
        name: "Rotworm",
        position: { x: 106, y: 205, z: 7 },
      },
      candidates: [
        {
          id: 99,
          name: "Rotworm",
          position: { x: 106, y: 205, z: 7 },
        },
      ],
    },
    options: {
      autowalkEnabled: true,
      trainerEnabled: true,
      trainerPartnerName: "Guide Gamma",
      partyFollowEnabled: true,
      partyFollowMembers: ["Knight Alpha", "Scout Beta"],
      partyFollowCombatMode: "follow-only",
    },
  });

  initialState.sessions = [
    {
      id: "page-1",
      profileKey: "knight-alpha",
      pageId: "page-1",
      title: "Minibia",
      url: "https://minibia.com/play",
      characterName: "Knight Alpha",
      displayName: "Knight Alpha",
      label: "Knight Alpha",
      playerPosition: { x: 100, y: 200, z: 7 },
      visiblePlayers: [],
      visiblePlayerNames: [],
      running: true,
      connected: true,
      ready: true,
      present: true,
      claimed: false,
      claimedBySelf: true,
      available: true,
      cavebotPaused: false,
      stopAggroHold: false,
      routeIndex: 1,
      routeComplete: false,
      routeResetActive: false,
      routeResetPhase: null,
      routeResetTargetIndex: null,
      followTrainStatus: {
        enabled: true,
        active: false,
        pilot: true,
        selfName: "Knight Alpha",
        selfIndex: 0,
        role: "attack-and-follow",
        leaderName: "",
        currentState: "DISABLED",
        followActive: false,
      },
      antiIdleStatus: null,
      overlayFocusIndex: 1,
      routeName: "dararotworms",
      page: {
        id: "page-1",
        title: "Minibia",
        url: "https://minibia.com/play",
      },
    },
    {
      id: "page-2",
      profileKey: "scout-beta",
      pageId: "page-2",
      title: "Minibia",
      url: "https://minibia.com/play?client=2",
      characterName: "Scout Beta",
      displayName: "Scout Beta",
      label: "Scout Beta",
      playerPosition: { x: 105, y: 205, z: 7 },
      visiblePlayers: [],
      visiblePlayerNames: [],
      running: true,
      connected: true,
      ready: true,
      present: true,
      claimed: false,
      claimedBySelf: true,
      available: true,
      cavebotPaused: false,
      stopAggroHold: false,
      routeIndex: 1,
      routeComplete: false,
      routeResetActive: false,
      routeResetPhase: null,
      routeResetTargetIndex: null,
      followTrainStatus: {
        enabled: true,
        active: true,
        pilot: false,
        selfName: "Scout Beta",
        selfIndex: 1,
        role: "follow-only",
        leaderName: "Knight Alpha",
        currentState: "FOLLOWING",
        followActive: true,
      },
      antiIdleStatus: null,
      overlayFocusIndex: 1,
      routeName: "dararotworms",
      page: {
        id: "page-2",
        title: "Minibia",
        url: "https://minibia.com/play?client=2",
      },
    },
  ];

  const desk = await createDesk({ initialState });
  const { document } = desk;
  const autowalkToggle = document.getElementById("quick-toggle-autowalk");
  const trainerToggle = document.getElementById("quick-toggle-trainer");

  assert.equal(getCompactText(autowalkToggle), "StateFollow");
  assert.equal(autowalkToggle.classList.contains("active"), false);
  assert.equal(autowalkToggle.getAttribute("aria-pressed"), "true");
  assert.equal(getModuleCardState(autowalkToggle), "blocked");
  assert.match(autowalkToggle.title, /Team Hunt owns movement/i);

  assert.match(getCompactText(trainerToggle), /Follow$/);
  assert.equal(trainerToggle.classList.contains("active"), false);
  assert.equal(trainerToggle.getAttribute("aria-pressed"), "false");
  assert.equal(getModuleCardState(trainerToggle), "blocked");
  assert.match(trainerToggle.title, /trainer partner guide gamma stays saved/i);
  assert.equal(document.getElementById("summary-trainer").textContent.trim(), "Follow");
  assert.match(document.getElementById("summary-trainer-detail").textContent, /Team Hunt owns movement/i);
  assert.match(document.getElementById("summary-party-follow-detail").textContent, /passive follow suppresses combat/i);
});

test("effective module cards surface trainer-owned inherited services", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        trainerEnabled: true,
        trainerPartnerName: "Guide Gamma",
        autoEatEnabled: false,
        antiIdleEnabled: false,
        reconnectEnabled: false,
        healerEnabled: false,
        deathHealEnabled: false,
      },
    }),
  });
  const { document } = desk;
  await flush(10);

  for (const [toggleId, summaryId, pattern] of [
    ["quick-toggle-auto-eat", "summary-auto-eat", /food cadence/i],
    ["quick-toggle-reconnect", "summary-reconnect", /disconnect recovery/i],
    ["quick-toggle-anti-idle", "summary-anti-idle", /anti-idle keepalive/i],
    ["quick-toggle-healer", "summary-healer", /regular healing/i],
    ["quick-toggle-death-heal", "summary-death-heal", /emergency self-healing/i],
  ]) {
    const toggle = document.getElementById(toggleId);
    assert.match(getCompactText(toggle), /Trainer$/);
    assert.equal(toggle.classList.contains("active"), true);
    assert.equal(toggle.getAttribute("aria-pressed"), "false");
    assert.equal(getModuleCardState(toggle), "inherited");
    assert.match(toggle.title, pattern);
    assert.equal(document.getElementById(summaryId).textContent.trim(), "Trainer");
  }
});

test("compact view mirrors looting and banking summaries from the full desk", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        lootingEnabled: true,
        lootWhitelist: ["gold coin", "health potion"],
        lootBlacklist: ["worm"],
        lootPreferredContainers: ["Backpack"],
        bankingEnabled: true,
        bankingRules: [
          {
            enabled: true,
            bankerNames: ["Alice"],
            operation: "deposit-excess",
            reserveGold: 150,
            amount: 0,
            maxNpcDistance: 3,
            cooldownMs: 1000,
          },
        ],
      },
    }),
  });
  const { document } = desk;

  assert.equal(
    document.getElementById("compact-looting-summary").textContent,
    document.getElementById("summary-looting").textContent,
  );
  assert.equal(document.getElementById("compact-looting-summary").textContent.trim(), "2 keep");
  assert.equal(document.getElementById("compact-toggle-looting").closest(".compact-split-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#compact-toggle-looting strong")?.textContent?.trim(), "On");
  assert.equal(
    document.getElementById("compact-banking-summary").textContent,
    document.getElementById("summary-banking").textContent,
  );
  assert.equal(document.getElementById("compact-banking-summary").textContent.trim(), "1 rule");
  assert.equal(document.getElementById("compact-toggle-banking").closest(".compact-split-card")?.dataset.state, "on");
  assert.equal(document.querySelector("#compact-toggle-banking strong")?.textContent?.trim(), "On");
});

test("distance and ammo summaries disclose hidden owners instead of only raw toggles", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        distanceKeeperEnabled: false,
        targetProfiles: [
          {
            name: "Rotworm",
            enabled: true,
            keepDistanceMin: 2,
            keepDistanceMax: 4,
            behavior: "kite",
            preferShootable: true,
            stickToTarget: true,
            avoidBeam: false,
            avoidWave: false,
          },
        ],
        refillEnabled: true,
        ammoEnabled: true,
        ammoRestockEnabled: true,
        ammoPreferredNames: ["Arrow"],
        ammoMinimumCount: 50,
        ammoWarningCount: 100,
        ammoReloadAtOrBelow: 25,
      },
      snapshot: {
        currentTarget: {
          id: 99,
          name: "Rotworm",
          position: { x: 101, y: 200, z: 7 },
        },
        candidates: [
          {
            id: 99,
            name: "Rotworm",
            position: { x: 101, y: 200, z: 7 },
          },
        ],
        inventory: {
          containers: [
            {
              name: "Backpack",
              slots: [
                {
                  label: "Slot 1",
                  item: {
                    id: 3447,
                    name: "Arrow",
                    count: 25,
                    flags: { ammo: true },
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  });
  const { document } = desk;

  assert.match(document.getElementById("autowalk-distance-summary").textContent, /target profile/i);
  assert.match(document.getElementById("autowalk-distance-summary").textContent, /owns spacing/i);
  assert.match(document.getElementById("summary-ammo-detail").textContent, /ammo owns restock/i);
});

test("auto ranged fallback is surfaced when standalone distance rules are off", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        distanceKeeperEnabled: false,
        targetProfiles: [],
        chaseMode: "auto",
      },
      snapshot: {
        currentTarget: {
          id: 99,
          name: "Rotworm",
          position: { x: 101, y: 200, z: 7 },
        },
        candidates: [
          {
            id: 99,
            name: "Rotworm",
            position: { x: 101, y: 200, z: 7 },
          },
        ],
        progression: {
          vocation: "paladin",
          vocationSource: "snapshot",
        },
      },
    }),
  });
  const { document } = desk;

  assert.match(document.getElementById("autowalk-distance-summary").textContent, /auto ranged/i);
  assert.match(document.getElementById("autowalk-distance-summary").textContent, /owns spacing/i);
});

test("compact view switches to portrait mode and mirrors quick actions", async () => {
  const desk = await createDesk();
  const { document, window, calls, currentState } = desk;
  const appShell = document.getElementById("app-shell");
  const modalLayer = document.getElementById("modal-layer");

  document.getElementById("compact-view").click();
  await flush();

  assert.equal(calls.setViewMode.at(-1), "compact");
  assert.equal(appShell.dataset.viewMode, "compact");
  assert.equal(modalLayer.hasAttribute("data-view-mode"), false);
  assert.equal(document.getElementById("compact-view").getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelector(".compact-layout").hidden, false);
  assert.equal(document.querySelector(".console-layout").hidden, true);

  document.getElementById("compact-toggle-healer").click();
  await flush(10);

  assert.deepEqual(calls.updateOptions.at(-1), { healerEnabled: false });
  assert.equal(currentState().options.healerEnabled, false);
  assert.equal(getCompactText(document.getElementById("compact-toggle-healer")), "PowerOff");

  document.getElementById("compact-route-stop-aggro").click();
  await flush();

  assert.equal(calls.stopAggro.at(-1), "page-1");
  assert.equal(currentState().options.stopAggroHold, true);
  assert.equal(getCompactText(document.getElementById("compact-route-stop-aggro")), "StopAggroHeld");

  document.getElementById("compact-open-waypoints").click();
  await flush();

  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), true);
});

test("restored view mode from desk state applies without another IPC write", async () => {
  const desk = await createDesk({
    initialState: createState({ viewMode: "compact" }),
  });
  const { document, calls } = desk;

  assert.equal(document.getElementById("app-shell").dataset.viewMode, "compact");
  assert.equal(document.getElementById("compact-view").getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelector(".compact-layout").hidden, false);
  assert.equal(document.querySelector(".console-layout").hidden, true);
  assert.deepEqual(calls.setViewMode, []);
});

test("modal shell keeps polished spacing without compact-view runtime overrides", () => {
  const dom = new JSDOM(html);
  trackDom(dom);
  const { document } = dom.window;
  attachStyles(document);

  const modalLayer = document.getElementById("modal-layer");
  const modalPanel = document.getElementById("modal-targeting");
  const modalHead = modalPanel.querySelector(".modal-head");
  const modalBody = modalPanel.querySelector(".modal-body");
  const modalActions = modalPanel.querySelector(".modal-actions");

  const modalLayerStyle = dom.window.getComputedStyle(modalLayer);
  const modalPanelStyle = dom.window.getComputedStyle(modalPanel);
  const modalHeadStyle = dom.window.getComputedStyle(modalHead);
  const modalBodyStyle = dom.window.getComputedStyle(modalBody);
  const modalActionsStyle = dom.window.getComputedStyle(modalActions);

  assert.equal(modalLayerStyle.paddingTop, "12px");
  assert.equal(modalPanelStyle.paddingTop, "7px");
  assert.equal(modalPanelStyle.gap, "7px");
  assert.equal(modalHeadStyle.gap, "8px");
  assert.equal(modalBodyStyle.gap, "6px");
  assert.equal(modalActionsStyle.gap, "8px");
});

test("toggles keep the original checkbox-based switch contract", async () => {
  assert.doesNotMatch(stylesSource, /Final frontend audit polish/);
  assert.match(stylesSource, /input\[type="checkbox"\]\s*\{/);
  assert.match(stylesSource, /input\[type="checkbox"\]::before/);
  assert.doesNotMatch(stylesSource, /\.toggle-native\s*\{/);
  assert.doesNotMatch(stylesSource, /\.toggle-switch/);
  assert.doesNotMatch(stylesSource, /\.btn\.quick-module-toggle::before/);

  const desk = await createDesk();
  const { document, window } = desk;
  attachStyles(document);
  const routeToggle = document.getElementById("quick-toggle-autowalk");
  const moduleToggle = document.getElementById("quick-toggle-healer");
  const compactToggle = document.getElementById("compact-toggle-healer");
  const modalToggle = document.getElementById("targeting-distance-enabled");

  assert.equal(modalToggle.classList.contains("toggle-native"), false);
  assert.equal(modalToggle.nextElementSibling?.classList.contains("toggle-switch"), false);

  for (const toggle of [routeToggle, moduleToggle, compactToggle]) {
    assert.equal(toggle.getAttribute("role"), null);
    assert.equal(toggle.getAttribute("aria-checked"), null);
  }

  const routeStateLabel = routeToggle.querySelector("strong");
  const routeStateStyle = window.getComputedStyle(routeStateLabel);
  assert.equal(routeStateStyle.display, "none");

  const moduleStateLabel = moduleToggle.querySelector("strong");
  const moduleStateStyle = window.getComputedStyle(moduleStateLabel);
  assert.notEqual(moduleStateStyle.color, "transparent");
});

test("compact view does not propagate to the modal layer at runtime", async () => {
  const desk = await createDesk();
  const { document } = desk;
  const modalLayer = document.getElementById("modal-layer");

  document.getElementById("compact-view").click();
  await flush();

  assert.equal(modalLayer.hasAttribute("data-view-mode"), false);

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(document.getElementById("modal-targeting").classList.contains("open"), true);
  assert.equal(modalLayer.hasAttribute("data-view-mode"), false);
});

test("custom window close button calls the close-window bridge", async () => {
  const desk = await createDesk();
  const { document, calls } = desk;

  document.getElementById("window-close").click();
  await flush();

  assert.equal(calls.closeWindow, 1);
});

test("modals trap focus and route stacks use button semantics", async () => {
  const desk = await createDesk();
  const { document, window } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  const appShell = document.getElementById("app-shell");
  const targetingModal = document.getElementById("modal-targeting");
  const closeButton = targetingModal.querySelector("[data-close-modal]");

  assert.equal(appShell.getAttribute("aria-hidden"), "true");
  assert.equal(targetingModal.contains(document.activeElement), true);

  document.getElementById("refresh").focus();
  await flush();
  assert.equal(targetingModal.contains(document.activeElement), true);

  closeButton.click();
  await flush();
  assert.equal(appShell.hasAttribute("aria-hidden"), false);

  assert.equal(document.querySelector(".waypoint-row")?.tagName, "ARTICLE");
  assert.equal(document.querySelector(".waypoint-row .waypoint-row-main")?.tagName, "BUTTON");
});

test("inactive modal panels stay hidden when switching active dialogs", async () => {
  const desk = await createDesk();
  const { document } = desk;

  const targetingModal = document.getElementById("modal-targeting");
  const logsModal = document.getElementById("modal-logs");

  assert.equal(targetingModal.hidden, true);
  assert.equal(targetingModal.getAttribute("aria-hidden"), "true");
  assert.equal(isElementInert(targetingModal), true);
  assert.equal(logsModal.hidden, true);
  assert.equal(document.getElementById("modal-layer").getAttribute("aria-hidden"), "true");

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(targetingModal.hidden, false);
  assert.equal(targetingModal.classList.contains("open"), true);
  assert.equal(targetingModal.getAttribute("aria-hidden"), "false");
  assert.equal(isElementInert(targetingModal), false);
  assert.equal(logsModal.hidden, true);
  assert.equal(logsModal.getAttribute("aria-hidden"), "true");
  assert.equal(isElementInert(logsModal), true);
  assert.equal(document.getElementById("modal-layer").getAttribute("aria-hidden"), "false");

  document.getElementById("desk-presets").click();
  await flush();

  assert.equal(targetingModal.hidden, true);
  assert.equal(targetingModal.classList.contains("open"), false);
  assert.equal(targetingModal.getAttribute("aria-hidden"), "true");
  assert.equal(isElementInert(targetingModal), true);
  assert.equal(logsModal.hidden, true);
  assert.equal(logsModal.classList.contains("open"), false);
  assert.equal(logsModal.getAttribute("aria-hidden"), "true");

  document.querySelector("#modal-presets [data-close-modal]").click();
  await flush();

  for (const panel of document.querySelectorAll(".modal-panel")) {
    assert.equal(panel.hidden, true);
    assert.equal(panel.classList.contains("open"), false);
    assert.equal(panel.getAttribute("aria-hidden"), "true");
    assert.equal(isElementInert(panel), true);
  }
  assert.equal(document.getElementById("modal-layer").getAttribute("aria-hidden"), "true");
});

test("modal shells and route lists keep isolated scroll regions", () => {
  const dom = new JSDOM(html);
  trackDom(dom);
  const { document } = dom.window;
  attachStyles(document);

  const modalLayerStyle = dom.window.getComputedStyle(document.querySelector(".modal-layer"));
  assert.equal(modalLayerStyle.overflow, "hidden");
  assert.equal(modalLayerStyle.isolation, "isolate");

  const modalPanelStyle = dom.window.getComputedStyle(document.querySelector(".modal-panel"));
  assert.equal(modalPanelStyle.overflow, "hidden");
  assert.equal(modalPanelStyle.isolation, "isolate");
  assert.match(modalPanelStyle.contain, /\blayout\b/);
  assert.match(modalPanelStyle.contain, /\bpaint\b/);
  assert.equal(modalPanelStyle.minHeight, "0px");

  const huntWorkspaceStyle = dom.window.getComputedStyle(document.querySelector(".route-hunt-workspace"));
  assert.equal(huntWorkspaceStyle.overflow, "hidden");
  assert.ok(document.querySelector(".route-hunt-modal-summary"));
  assert.ok(document.querySelector("#modal-targeting .modal-actions [data-close-modal]"));

  const huntGrid = document.querySelector(".route-hunt-grid");
  assert.equal(huntGrid.children.length, 4);

  const targetingProfilesStyle = dom.window.getComputedStyle(document.querySelector(".route-hunt-profile-panel"));
  assert.equal(targetingProfilesStyle.display, "grid");
  assert.notEqual(targetingProfilesStyle.gridTemplateRows, "none");
  assert.equal(targetingProfilesStyle.overflow, "hidden");

  const targetingCenterStyle = dom.window.getComputedStyle(document.querySelector(".route-hunt-config-panel"));
  assert.equal(targetingCenterStyle.display, "grid");
  assert.notEqual(targetingCenterStyle.gridTemplateRows, "none");
  assert.equal(targetingCenterStyle.overflow, "hidden");

  const targetSourceStyle = dom.window.getComputedStyle(document.querySelector(".route-hunt-registry-panel"));
  assert.equal(targetSourceStyle.display, "grid");
  assert.notEqual(targetSourceStyle.gridTemplateRows, "none");
  assert.equal(targetSourceStyle.overflow, "hidden");

  const targetingWatchStyle = dom.window.getComputedStyle(document.querySelector(".route-hunt-presence-grid"));
  assert.equal(targetingWatchStyle.display, "grid");
  assert.notEqual(targetingWatchStyle.gridTemplateRows, "none");

  const targetProfileListStyle = dom.window.getComputedStyle(document.querySelector(".target-profile-list"));
  assert.equal(targetProfileListStyle.overflow, "auto");
  assert.match(targetProfileListStyle.contain, /\bpaint\b/);
  assert.equal(
    document.querySelector(".route-hunt-profile-panel").contains(
      document.getElementById("target-profile-list").closest(".target-profile-card"),
    ),
    true,
  );

  const routeStackStyle = dom.window.getComputedStyle(document.querySelector(".route-stack-card"));
  assert.equal(routeStackStyle.display, "grid");
  assert.notEqual(routeStackStyle.gridTemplateRows, "none");
  assert.equal(routeStackStyle.overflow, "hidden");

  const routeEditorStyle = dom.window.getComputedStyle(document.querySelector(".route-editor-card"));
  assert.equal(routeEditorStyle.display, "grid");
  assert.notEqual(routeEditorStyle.gridTemplateRows, "none");
  assert.equal(routeEditorStyle.overflow, "hidden");

  const routeEditorPanelStyle = dom.window.getComputedStyle(document.querySelector(".route-editor-panel"));
  assert.equal(routeEditorPanelStyle.overflowX, "hidden");
  assert.equal(routeEditorPanelStyle.overflowY, "auto");

  const waypointListStyle = dom.window.getComputedStyle(document.getElementById("waypoint-list"));
  assert.equal(waypointListStyle.overflowX, "hidden");
  assert.equal(waypointListStyle.overflowY, "auto");

  const tileRuleListStyle = dom.window.getComputedStyle(document.getElementById("tile-rule-list"));
  assert.equal(tileRuleListStyle.overflowX, "hidden");
  assert.equal(tileRuleListStyle.overflowY, "auto");
});

test("route builder renders every waypoint in the stack", async () => {
  const waypoints = Array.from({ length: 8 }, (_, index) => ({
    x: 32000 + index,
    y: 32600 + index,
    z: 8,
    label: `Waypoint ${String(index + 1).padStart(3, "0")}`,
    type: "walk",
    radius: null,
  }));
  const desk = await createDesk({
    initialState: createState({
      options: { waypoints },
      routeIndex: 7,
      overlayFocusIndex: 7,
    }),
  });
  const { document } = desk;

  const rows = [...document.querySelectorAll("#waypoint-list .waypoint-row")];
  const lastRow = rows.at(-1);

  assert.equal(rows.length, waypoints.length);
  assert.equal(document.getElementById("waypoint-list")?.classList.contains("waypoint-list-grid"), true);
  assert.equal(document.getElementById("waypoint-list")?.classList.contains("route-stack-waypoint-grid"), true);
  assert.equal(lastRow?.querySelector(".waypoint-chip-top") !== null, true);
  assert.equal(lastRow?.querySelector(".waypoint-row-index")?.textContent, "008");
  assert.match(lastRow?.querySelector("strong")?.textContent || "", /Waypoint 008/);
  assert.match(lastRow?.querySelector(".waypoint-chip-position")?.textContent || "", /32007,32607,8/);
  assert.match(lastRow?.querySelector(".waypoint-chip-detail")?.textContent || "", /Walk/);
  assert.equal(lastRow?.classList.contains("current"), true);
  assert.match(lastRow?.title || "", /Double-click edit/);
});

test("route builder mark controls drive shared batch delete state and the existing danger action", async () => {
  const desk = await createDesk();
  const { document, calls } = desk;

  document.getElementById("open-route-panel").click();
  await flush();

  document.querySelector('[data-waypoint-mark="0"]')?.click();
  document.querySelector('[data-waypoint-mark="1"]')?.click();
  await flush();

  assert.match(document.getElementById("route-stack-selection-summary")?.textContent || "", /2 waypoints marked/i);
  assert.equal(document.getElementById("clear-waypoint-marks")?.hidden, false);
  assert.match(document.getElementById("route-danger-selected")?.textContent || "", /2 marked waypoints/i);
  assert.match(document.getElementById("remove-waypoint")?.textContent || "", /Delete 2 Marked/i);
  assert.equal(document.querySelector('[data-route-preview-index="0"]')?.classList.contains("marked"), true);

  document.getElementById("remove-waypoint")?.click();
  await flush();
  assert.match(document.getElementById("remove-waypoint")?.textContent || "", /Confirm Delete 2/i);

  document.getElementById("remove-waypoint")?.click();
  await flush();

  assert.deepEqual(calls.removeWaypoint.slice(-2), [1, 0]);
  assert.equal(document.querySelectorAll(".waypoint-row").length, 1);
  assert.equal(document.getElementById("clear-waypoint-marks")?.hidden, true);
});

test("route builder keeps the waypoint stack as a vertical scroll grid without horizontal bars", async () => {
  const desk = await createDesk();
  const { document } = desk;

  document.getElementById("open-route-panel").click();
  await flush();

  assert.equal(document.getElementById("waypoint-list")?.classList.contains("route-stack-waypoint-grid"), true);
  assert.equal(document.getElementById("waypoint-list")?.classList.contains("waypoint-list-grid"), true);
  const portraitScrollSource = stylesSource.slice(stylesSource.lastIndexOf("/* Modal portrait scroll lock"));
  assert.match(portraitScrollSource, /\.route-main-column \.route-stack-waypoint-grid,\s*#modal-autowalk \.waypoint-list-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(portraitScrollSource, /\.route-main-column \.route-stack-waypoint-grid,\s*#modal-autowalk \.waypoint-list-grid\s*\{[\s\S]*overflow-x:\s*hidden;[\s\S]*overflow-y:\s*auto;/);
  assert.match(stylesSource, /\.route-main-column \.route-stack-waypoint-grid \.waypoint-row\s*\{[\s\S]*content-visibility:\s*auto;/);
  assert.match(portraitScrollSource, /\.route-main-column \.route-stack-waypoint-grid \.waypoint-row-main,\s*#modal-autowalk \.waypoint-list-grid \.waypoint-row-main\s*\{[\s\S]*grid-template-areas:/);
  assert.match(portraitScrollSource, /\.route-main-column \.route-stack-waypoint-grid \.waypoint-row-main>strong,\s*#modal-autowalk \.waypoint-list-grid \.waypoint-row-main>strong\s*\{[\s\S]*-webkit-line-clamp:\s*1;/);
});

test("route UI keeps the live next waypoint highlighted separately from editor selection", async () => {
  const desk = await createDesk({
    initialState: createState({
      routeIndex: 1,
    }),
  });
  const { document } = desk;

  const rows = [...document.querySelectorAll(".waypoint-row")];
  assert.equal(rows[1]?.classList.contains("current"), true);
  assert.equal(rows[0]?.classList.contains("selected"), true);
  assert.equal(rows[1]?.classList.contains("selected"), false);
  assert.equal(rows[0]?.querySelector(".waypoint-row-main")?.getAttribute("aria-pressed"), "true");
  assert.equal(rows[1]?.querySelector(".waypoint-row-main")?.getAttribute("aria-pressed"), "false");
});

test("route UI suppresses live waypoint highlights while reset is returning", async () => {
  const desk = await createDesk({
    initialState: createState({
      routeIndex: 1,
      overlayFocusIndex: 1,
      routeResetActive: true,
      routeResetPhase: "returning",
      routeResetTargetIndex: 0,
    }),
  });
  const { document } = desk;

  const rows = [...document.querySelectorAll(".waypoint-row")];
  const previewTiles = [...document.querySelectorAll("#route-live-preview .route-live-waypoint")];

  assert.equal(rows[1]?.classList.contains("current"), false);
  assert.equal(rows[1]?.classList.contains("focus"), false);
  assert.match(rows[0]?.querySelector(".waypoint-chip-flags")?.textContent || "", /Edit/);
  assert.doesNotMatch(rows[1]?.querySelector(".waypoint-chip-flags")?.textContent || "", /Next|Focus/);
  assert.equal(previewTiles[1]?.classList.contains("current"), false);
  assert.equal(previewTiles[1]?.classList.contains("focus"), false);
  assert.match(document.getElementById("route-reset-panel")?.textContent || "", /Returning/i);
});

test("route builder preserves unsaved edits across background state events", async () => {
  const desk = await createDesk();
  const { document, currentState, emit, window } = desk;

  document.getElementById("open-route-panel").click();
  await flush();

  const routeName = document.getElementById("cavebotName");
  routeName.focus();
  routeName.value = "draft-route";
  routeName.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelectorAll(".waypoint-row")[1].click();
  await flush();

  const waypointLabel = document.getElementById("route-item-label");
  waypointLabel.focus();
  waypointLabel.value = "Hold Here";
  waypointLabel.dispatchEvent(new window.Event("input", { bubbles: true }));

  const rowBeforeEvent = document.querySelectorAll(".waypoint-row")[1];
  emit("state", {}, {
    ...currentState(),
    logs: [...currentState().logs, "[12:00:09] Overlay tick"],
  });
  await flush();

  assert.equal(document.getElementById("cavebotName").value, "draft-route");
  assert.equal(document.getElementById("route-item-label").value, "Hold Here");
  assert.equal(document.querySelectorAll(".waypoint-row")[1], rowBeforeEvent);
});

test("route builder resets unsaved drafts when the active session changes", async () => {
  const desk = await createDesk();
  const { document, emit, window } = desk;

  document.getElementById("open-route-panel").click();
  await flush();

  const routeName = document.getElementById("cavebotName");
  routeName.focus();
  routeName.value = "draft-route";
  routeName.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelectorAll(".waypoint-row")[1].click();
  await flush();

  const waypointLabel = document.getElementById("route-item-label");
  waypointLabel.focus();
  waypointLabel.value = "Hold Here";
  waypointLabel.dispatchEvent(new window.Event("input", { bubbles: true }));

  emit("active-session", {}, createState({
    activeSessionId: "page-2",
    page: {
      id: "page-2",
      title: "Minibia",
      url: "https://minibia.com/play?client=2",
    },
    binding: {
      profileKey: "scout-beta",
      pageId: "page-2",
      url: "https://minibia.com/play?client=2",
      title: "Minibia",
      characterName: "Scout Beta",
      displayName: "Scout Beta",
      label: "Scout Beta",
    },
    options: {
      cavebotName: "cyclops-loop",
      waypoints: [
        { x: 320, y: 420, z: 7, label: "Ladder", type: "ladder", radius: null },
        { x: 321, y: 421, z: 8, label: "Lower", type: "stairs-down", radius: 1 },
      ],
    },
    routeIndex: 1,
    overlayFocusIndex: 1,
    routeProfile: {
      name: "cyclops-loop",
      fileName: "cyclops-loop.json",
      path: "/home/test/Minibot/cavebots/cyclops-loop.json",
      exists: true,
    },
    snapshot: {
      playerName: "Scout Beta",
      visibleMonsterNames: ["Cyclops"],
      visibleCreatureNames: ["Cyclops"],
      visiblePlayerNames: [],
    },
    logs: ["[12:00:09] Scout Beta synced"],
  }));
  await flush();

  assert.equal(document.getElementById("cavebotName").value, "cyclops-loop");
  assert.equal(document.getElementById("route-item-label").value, "Lower");
  assert.equal(document.querySelectorAll(".waypoint-row")[1]?.classList.contains("selected"), true);
});

test("module save gives button feedback before closing the active settings modal", async () => {
  const desk = await createDesk();
  const { document, calls, currentState } = desk;

  document.querySelector('[data-open-modal="healer"]').click();
  await flush();

  const saveButton = document.querySelector('#modal-module [data-save-modules]');
  document.querySelector('[data-module-key="healer"][data-rule-index="1"][data-rule-field="words"]').value = "Ultimate Healing Rune";
  saveButton.click();
  await flush();

  assert.equal(calls.updateOptions.at(-1).healerRules[1].words, "Ultimate Healing Rune");
  assert.equal(currentState().options.healerRules[1].words, "Ultimate Healing Rune");
  assert.equal(saveButton.dataset.feedback, "success");
  assert.equal(document.getElementById("modal-layer").hidden, false);
  assert.equal(document.getElementById("modal-module").classList.contains("open"), true);

  await waitFor(520);
  await flush();

  assert.equal(document.getElementById("modal-layer").hidden, true);
  assert.equal(document.getElementById("modal-module").classList.contains("open"), false);
  assert.equal(saveButton.dataset.feedback, undefined);
});

test("keyboard hotkey fields render for healing, rune, and spell actions", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        deathHealEnabled: true,
        healerEnabled: true,
        healerRules: [
          {
            enabled: true,
            label: "",
            words: "Ultimate Healing Rune",
            hotkey: "",
            minHealthPercent: 0,
            maxHealthPercent: 50,
            minMana: 0,
            minManaPercent: 0,
            cooldownMs: 900,
          },
        ],
        potionHealerEnabled: true,
        potionHealerRules: [
          {
            enabled: true,
            label: "",
            itemName: "Health Potion",
            hotkey: "",
            minHealthPercent: 0,
            maxHealthPercent: 65,
            minMana: 0,
            minManaPercent: 0,
            cooldownMs: 900,
          },
        ],
        conditionHealerEnabled: true,
        conditionHealerRules: [
          {
            enabled: true,
            label: "",
            condition: "poisoned",
            words: "exana pox",
            hotkey: "",
            minHealthPercent: 0,
            maxHealthPercent: 100,
            minMana: 0,
            minManaPercent: 0,
            cooldownMs: 900,
          },
        ],
        manaTrainerEnabled: true,
        manaTrainerRules: [
          {
            enabled: true,
            label: "",
            words: "utevo res ina",
            hotkey: "",
            minHealthPercent: 95,
            minManaPercent: 85,
            maxManaPercent: 100,
            cooldownMs: 1400,
            requireNoTargets: true,
            requireStationary: true,
          },
        ],
        runeMakerEnabled: true,
        runeMakerRules: [
          {
            enabled: true,
            label: "",
            words: "adori blank",
            hotkey: "",
            minHealthPercent: 95,
            minManaPercent: 90,
            maxManaPercent: 100,
            cooldownMs: 1800,
            requireNoTargets: true,
            requireStationary: true,
          },
        ],
        spellCasterEnabled: true,
        spellCasterRules: [
          {
            enabled: true,
            label: "",
            words: "exori frigo",
            hotkey: "",
            minManaPercent: 20,
            maxTargetDistance: 4,
            minTargetCount: 1,
            cooldownMs: 900,
            pattern: "any",
            requireTarget: true,
            requireStationary: false,
          },
        ],
        autoLightEnabled: true,
        autoLightRules: [
          {
            enabled: true,
            label: "",
            words: "utevo lux",
            hotkey: "",
            minManaPercent: 25,
            cooldownMs: 3000,
            requireNoLight: true,
            requireNoTargets: false,
            requireStationary: false,
          },
        ],
        trainerManaTrainerEnabled: true,
        trainerManaTrainerWords: "utevo res ina",
      },
    }),
  });
  const { document } = desk;

  const openModule = async (moduleName) => {
    document.querySelector(`[data-open-modal="${moduleName}"]`).click();
    await flush();
  };
  const assertHotkeySharesIdentitySection = (moduleName) => {
    const labelField = document.querySelector(`[data-module-key="${moduleName}"][data-rule-index="0"][data-rule-field="label"]`);
    const hotkeyField = document.querySelector(`[data-module-key="${moduleName}"][data-rule-index="0"][data-rule-field="hotkey"]`);
    assert.equal(
      hotkeyField?.closest(".module-rule-section"),
      labelField?.closest(".module-rule-section"),
      `${moduleName} should group hotkey with the rule name`,
    );
  };
  const assertNoCrowdedRuleSections = (moduleName) => {
    const card = document.querySelector(`[data-module-key="${moduleName}"].module-rule-card[data-rule-index="0"]`);
    for (const section of card.querySelectorAll(".module-rule-section")) {
      assert.ok(
        section.querySelectorAll("[data-rule-field]").length <= 2,
        `${moduleName} rule sections should stay capped at two controls`,
      );
    }
  };

  await openModule("deathHeal");
  assert.ok(document.querySelector('[data-module-key="deathHeal"][data-module-option-field="deathHealHotkey"]'));

  await openModule("healer");
  assert.ok(document.querySelector('[data-module-key="healer"][data-rule-index="0"][data-rule-field="hotkey"]'));
  assert.ok(document.querySelector('[data-module-key="potionHealer"][data-rule-index="0"][data-rule-field="hotkey"]'));
  assert.ok(document.querySelector('[data-module-key="conditionHealer"][data-rule-index="0"][data-rule-field="hotkey"]'));
  for (const moduleName of ["healer", "potionHealer", "conditionHealer"]) {
    assertHotkeySharesIdentitySection(moduleName);
    assertNoCrowdedRuleSections(moduleName);
  }

  for (const moduleName of ["manaTrainer", "runeMaker", "spellCaster", "autoLight"]) {
    await openModule(moduleName);
    assert.ok(
      document.querySelector(`[data-module-key="${moduleName}"][data-rule-index="0"][data-rule-field="hotkey"]`),
      `${moduleName} should render a rule hotkey input`,
    );
    assertHotkeySharesIdentitySection(moduleName);
    assertNoCrowdedRuleSections(moduleName);
  }

  await openModule("trainer");
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerHotkey"]'));
});

test("healer modal saves nested potion and condition healer rules through the shared module flow", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        potionHealerEnabled: true,
        potionHealerRules: [],
        conditionHealerEnabled: true,
        conditionHealerRules: [],
      },
      snapshot: {
        progression: {
          vocation: "druid",
          vocationSource: "snapshot",
        },
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="healer"]').click();
  await flush();

  document.querySelector('[data-add-module-rule="potionHealer"]').click();
  await flush();

  const potionSelect = document.querySelector('[data-module-key="potionHealer"][data-rule-index="0"][data-rule-field="itemName"]');
  const potionHotkey = document.querySelector('[data-module-key="potionHealer"][data-rule-index="0"][data-rule-field="hotkey"]');
  potionSelect.value = "Ultimate Health Potion";
  potionSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  potionHotkey.value = "F7";
  potionHotkey.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelector('[data-add-module-rule="conditionHealer"]').click();
  await flush();

  const conditionTrigger = document.querySelector('[data-module-key="conditionHealer"][data-rule-index="0"][data-rule-field="condition"]');
  conditionTrigger.value = "magic-shield-missing";
  conditionTrigger.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  const conditionHotkey = document.querySelector('[data-module-key="conditionHealer"][data-rule-index="0"][data-rule-field="hotkey"]');
  conditionHotkey.value = "F8";
  conditionHotkey.dispatchEvent(new window.Event("input", { bubbles: true }));

  const conditionAction = document.querySelector('[data-module-key="conditionHealer"][data-rule-index="0"][data-rule-field="words"]');
  const conditionOptions = Array.from(conditionAction.querySelectorAll("option")).map((option) => option.textContent.trim());

  assert.ok(conditionOptions.includes("Magic Shield / utamo vita"));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.potionHealerEnabled, true);
  assert.equal(payload.potionHealerRules[0].itemName, "Ultimate Health Potion");
  assert.equal(payload.potionHealerRules[0].hotkey, "F7");
  assert.equal(payload.conditionHealerEnabled, true);
  assert.equal(payload.conditionHealerRules[0].condition, "magic-shield-missing");
  assert.equal(payload.conditionHealerRules[0].words, "utamo vita");
  assert.equal(payload.conditionHealerRules[0].hotkey, "F8");
  assert.equal(currentState().options.potionHealerRules[0].itemName, "Ultimate Health Potion");
  assert.equal(currentState().options.potionHealerRules[0].hotkey, "F7");
  assert.equal(currentState().options.conditionHealerRules[0].condition, "magic-shield-missing");
  assert.equal(currentState().options.conditionHealerRules[0].words, "utamo vita");
  assert.equal(currentState().options.conditionHealerRules[0].hotkey, "F8");
});

test("healer action choices follow the detected session vocation", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        vocation: "druid",
      },
      snapshot: {
        progression: {
          vocation: "paladin",
          vocationSource: "snapshot",
        },
      },
    }),
  });
  const { document } = desk;

  document.querySelector('[data-open-modal="healer"]').click();
  await flush();

  const healerSelect = document.querySelector('[data-module-key="healer"][data-rule-index="0"][data-rule-field="words"]');
  const healerOptions = Array.from(healerSelect.querySelectorAll("option")).map((option) => option.textContent.trim());
  const healerGroups = Array.from(healerSelect.querySelectorAll("optgroup")).map((group) => group.label);
  const healerNote = healerSelect.closest("label")?.textContent || "";
  const healerCoverage = document.getElementById("module-extra-fields")?.textContent || "";

  assert.ok(healerOptions.includes("Light Healing / exura"));
  assert.ok(healerOptions.includes("Ultimate Healing Rune / self"));
  assert.ok(healerOptions.includes("Heal Friend / exura sio / druid"));
  assert.ok(healerOptions.includes("Mass Healing / exura gran mas res / druid"));
  assert.ok(healerGroups.includes("Recommended for Paladin"));
  assert.ok(healerGroups.includes("Team Support"));
  assert.match(healerNote, /Paladin/);
  assert.match(healerNote, /full healer actions stay available/i);
  assert.match(healerCoverage, /Potion Healer/i);
  assert.match(healerCoverage, /Condition Healer/i);
  assert.match(healerCoverage, /Healer Setup/i);
  assert.match(healerCoverage, /Rune Tiers/i);
  assert.equal(document.querySelector('[data-module-key="healer"][data-module-option-field="healerRuneHealthPercent"]'), null);
  assert.match(healerCoverage, /Enable potion healer/i);
  assert.match(healerCoverage, /Enable condition healer/i);
});

test("session toggle feedback lands on the rerendered live button", async () => {
  const desk = await createDesk();
  const { document } = desk;

  document.querySelector('[data-session-toggle="page-2"]').click();
  await flush();

  assert.equal(
    document.querySelector('[data-session-toggle="page-2"]').dataset.feedback,
    "success",
  );
});

test("busy buttons stay locked through rerenders while async actions are in flight", async () => {
  const deferred = Promise.withResolvers();
  const desk = await createDesk();
  const { document, window, emit, currentState } = desk;

  const originalToggleRun = window.bbApi.toggleRun;
  let toggleCalls = 0;
  window.bbApi.toggleRun = async (sessionId) => {
    toggleCalls += 1;
    await deferred.promise;
    return originalToggleRun(sessionId);
  };

  document.querySelector('[data-session-toggle="page-2"]').click();
  await flush();
  assert.equal(toggleCalls, 1);
  assert.equal(document.querySelector('[data-session-toggle="page-2"]').disabled, true);

  emit("state", {}, {
    ...currentState(),
    logs: [...currentState().logs, "[12:00:10] repaint while action pending"],
  });
  await flush();

  const rerenderedToggle = document.querySelector('[data-session-toggle="page-2"]');
  assert.equal(rerenderedToggle.disabled, true);
  rerenderedToggle.click();
  await flush();
  assert.equal(toggleCalls, 1);

  deferred.resolve();
  await flush();

  assert.equal(document.querySelector('[data-session-toggle="page-2"]').disabled, false);
});

test("duplicate character tabs are disambiguated and sync-start follows the active tab", async () => {
  const desk = await createDesk({
    initialState: createState({
      page: null,
      activeSessionId: "page-1",
      windowTitle: "Minibot",
      snapshot: {
        playerName: "",
        playerPosition: { x: 32073, y: 32232, z: 9 },
      },
      instances: [
        {
          id: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          ready: true,
          characterName: "Dark Knight",
          displayName: "Dark Knight",
          playerPosition: { x: 32073, y: 32232, z: 9 },
          profileKey: "dark-knight",
          claimed: false,
          claimedBySelf: false,
          available: true,
          claim: null,
        },
        {
          id: "page-2",
          title: "Minibia",
          url: "https://minibia.com/play?tab=2",
          ready: true,
          characterName: "Dark Knight",
          displayName: "Dark Knight",
          playerPosition: { x: 32091, y: 32209, z: 8 },
          profileKey: "dark-knight",
          claimed: false,
          claimedBySelf: false,
          available: true,
          claim: null,
        },
        {
          id: "page-3",
          title: "Minibia",
          url: "https://minibia.com/play?tab=3",
          ready: true,
          characterName: "Spells Of Regret",
          displayName: "Spells Of Regret",
          playerPosition: { x: 32928, y: 32210, z: 8 },
          profileKey: "spells-of-regret",
          claimed: false,
          claimedBySelf: false,
          available: true,
          claim: null,
        },
      ],
    }),
  });
  const { document, window, calls, currentState } = desk;

  const tabLabels = Array.from(document.querySelectorAll(".bot-tab-select strong")).map((node) => node.textContent);
  assert.deepEqual(tabLabels, [
    "Dark Knight @ 32073,32232,9",
    "Dark Knight @ 32091,32209,8",
    "Spells Of Regret",
  ]);
  assert.equal(document.querySelector('[data-session-select="page-1"] span').textContent, "sync needed");
  assert.equal(document.querySelector('[data-session-toggle="page-1"]').textContent, "Start");
  assert.equal(document.querySelector('[data-session-toggle="page-1"]').disabled, false);

  document.querySelector('[data-session-select="page-2"]').click();
  await flush();

  assert.deepEqual(
    Array.from(document.querySelectorAll(".bot-tab-select strong")).map((node) => node.textContent),
    tabLabels,
  );
  assert.equal(document.querySelector('[data-session-select="page-2"] span').textContent, "synced");

  document.querySelector('[data-session-toggle="page-2"]').click();
  await flush();

  assert.deepEqual(calls.selectSession, ["page-2"]);
  assert.equal(calls.refresh, 0);
  assert.equal(calls.toggleRun.length, 1);
  assert.equal(currentState().binding.pageId, "page-2");
  assert.equal(currentState().running, true);
});

test("session strip condenses once a sixth live tab appears", async () => {
  const makeSession = (index) => ({
    id: `page-${index + 1}`,
    profileKey: `profile-${index + 1}`,
    pageId: `page-${index + 1}`,
    title: "Minibia",
    url: `https://minibia.com/play?client=${index + 1}`,
    characterName: `Knight ${index + 1}`,
    displayName: `Knight ${index + 1}`,
    label: `Knight ${index + 1}`,
    playerPosition: { x: 100 + index, y: 200 + index, z: 7 },
    playerStats: {
      health: 800 - (index * 20),
      maxHealth: 1000,
      mana: 200,
      maxMana: 500,
      healthPercent: 80 - (index * 2),
      manaPercent: 40,
    },
    visiblePlayerNames: [],
    running: false,
    connected: index === 0,
    ready: true,
    present: true,
    claimed: false,
    claimedBySelf: index === 0,
    available: true,
    routeIndex: index,
    routeComplete: false,
    overlayFocusIndex: index,
    routeName: "larva-loop",
    page: {
      id: `page-${index + 1}`,
      title: "Minibia",
      url: `https://minibia.com/play?client=${index + 1}`,
    },
  });

  const desk = await createDesk({
    initialState: createState({
      activeSessionId: "page-1",
      sessions: Array.from({ length: 5 }, (_, index) => makeSession(index)),
    }),
  });
  const { document, emit, currentState } = desk;

  assert.equal(document.getElementById("bot-tabs").dataset.density, "regular");
  assert.match(document.querySelector('[data-session-select="page-1"]').textContent, /WP 1/);

  const nextState = clone(currentState());
  nextState.sessions.push(makeSession(5));

  emit("state", { sessionId: "page-1" }, nextState);
  await flush();

  assert.equal(document.getElementById("bot-tabs").dataset.density, "condensed");
  assert.equal(document.querySelectorAll(".bot-tab").length, 6);
  assert.match(document.querySelector('[data-session-select="page-6"]').textContent, /WP 6/);
});

test("connected session tags show the current cavebot name", async () => {
  const desk = await createDesk();
  const { document } = desk;

  const tag = document.querySelector('[data-session-select="page-1"] .bot-tab-state');
  const select = document.querySelector('[data-session-select="page-1"]');

  assert.equal(tag?.textContent, "dararotworms");
  assert.equal(tag?.classList.contains("route"), true);
  assert.equal(tag?.getAttribute("title"), "dararotworms / synced");
  assert.match(select?.getAttribute("aria-label") || "", /cavebot dararotworms/i);
});

test("session tabs can be dragged to reorder and keep that order across live updates", async () => {
  const desk = await createDesk({
    initialState: createState({
      page: null,
      activeSessionId: "page-1",
      windowTitle: "Minibot",
      snapshot: {
        playerName: "Knight Alpha",
        playerPosition: { x: 100, y: 200, z: 7 },
      },
      instances: [
        {
          id: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          ready: true,
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          profileKey: "knight-alpha",
          claimed: false,
          claimedBySelf: true,
          available: true,
          claim: null,
        },
        {
          id: "page-2",
          title: "Minibia",
          url: "https://minibia.com/play?client=2",
          ready: true,
          characterName: "Scout Beta",
          displayName: "Scout Beta",
          playerPosition: { x: 105, y: 205, z: 7 },
          profileKey: "scout-beta",
          claimed: false,
          claimedBySelf: false,
          available: true,
          claim: null,
        },
        {
          id: "page-3",
          title: "Minibia",
          url: "https://minibia.com/play?client=3",
          ready: true,
          characterName: "Paladin Gamma",
          displayName: "Paladin Gamma",
          playerPosition: { x: 110, y: 210, z: 7 },
          profileKey: "paladin-gamma",
          claimed: false,
          claimedBySelf: false,
          available: true,
          claim: null,
        },
      ],
    }),
  });
  const { document, window, emit, currentState } = desk;

  const getTabLabels = () => Array.from(document.querySelectorAll(".bot-tab-select strong")).map((node) => node.textContent);

  assert.deepEqual(getTabLabels(), [
    "Knight Alpha",
    "Scout Beta",
    "Paladin Gamma",
  ]);

  const dragTransfer = createDragTransfer();
  dispatchDrag(window, document.querySelector('[data-session-select="page-3"]'), "dragstart", { dataTransfer: dragTransfer });
  dispatchDrag(window, document.querySelector('[data-session-select="page-1"]'), "dragover", { dataTransfer: dragTransfer });
  dispatchDrag(window, document.querySelector('[data-session-select="page-1"]'), "drop", { dataTransfer: dragTransfer });
  dispatchDrag(window, document.querySelector('[data-session-select="page-3"]'), "dragend", { dataTransfer: dragTransfer });
  await flush();

  assert.deepEqual(getTabLabels(), [
    "Paladin Gamma",
    "Knight Alpha",
    "Scout Beta",
  ]);

  emit("state", {}, {
    ...currentState(),
    logs: [...currentState().logs, "[12:00:02] live refresh"],
  });
  await flush();

  assert.deepEqual(getTabLabels(), [
    "Paladin Gamma",
    "Knight Alpha",
    "Scout Beta",
  ]);
});

test("session tabs run a continuous emergency alarm for low HP and nearby players", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
        {
          id: "page-2",
          profileKey: "scout-beta",
          pageId: "page-2",
          title: "Minibia",
          url: "https://minibia.com/play?client=2",
          characterName: "Scout Beta",
          displayName: "Scout Beta",
          label: "Scout Beta",
          playerPosition: { x: 105, y: 205, z: 7 },
          playerStats: {
            health: 520,
            maxHealth: 1000,
            mana: 210,
            maxMana: 500,
            healthPercent: 52,
            manaPercent: 42,
          },
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: false,
          available: true,
          routeIndex: 0,
          routeComplete: false,
          overlayFocusIndex: null,
          routeName: "dararotworms",
          page: {
            id: "page-2",
            title: "Minibia",
            url: "https://minibia.com/play?client=2",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  assert.match(document.querySelector('[data-session-select="page-1"]').textContent, /HP 87%/);
  assert.match(document.querySelector('[data-session-select="page-2"]').textContent, /HP 52%/);
  assert.match(document.querySelector('[data-session-select="page-2"]').textContent, /WP 1/);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);

  const nextState = clone(currentState());
  nextState.sessions = nextState.sessions.map((session) => (
    session.id === "page-2"
      ? {
          ...session,
          playerStats: {
            ...session.playerStats,
            health: 190,
            healthPercent: 19,
          },
          visiblePlayerNames: ["Enemy One", "PK Two"],
        }
      : session
  ));

  emit("state", { sessionId: "page-2" }, nextState);
  await flush(8);

  assert.match(document.querySelector('[data-session-select="page-2"]').textContent, /HP 19%/);
  assert.match(document.querySelector('[data-session-select="page-2"]').textContent, /WP 1/);
  assert.match(document.querySelector('[data-session-select="page-2"]').getAttribute("aria-label"), /2 visible players/i);
  const alertedTab = document.querySelector('[data-session-select="page-2"]').closest(".bot-tab");
  assert.equal(alertedTab.classList.contains("health-alert"), true);
  assert.equal(alertedTab.classList.contains("player-alert"), true);
  assert.equal(alertedTab.classList.contains("hostile-alert"), false);
  assert.equal(alertedTab.classList.contains("staff-alert"), false);

  const startedWhileActive = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedWhileActive.length >= 2);
  assert.deepEqual([...new Set(startedWhileActive.map((entry) => entry.wave))], ["square"]);

  await waitFor(430);
  await flush(4);

  const startedAfterLoop = beepLog.filter((entry) => entry.type === "start").length;
  assert.ok(startedAfterLoop > startedWhileActive.length);

  const recoveredState = clone(currentState());
  recoveredState.sessions = recoveredState.sessions.map((session) => (
    session.id === "page-2"
      ? {
          ...session,
          playerStats: {
            ...session.playerStats,
            health: 520,
            healthPercent: 52,
          },
          visiblePlayerNames: [],
        }
      : session
  ));

  emit("state", { sessionId: "page-2" }, recoveredState);
  await flush(8);

  const stoppedAt = beepLog.filter((entry) => entry.type === "start").length;
  await waitFor(430);
  await flush(4);

  const recoveredTab = document.querySelector('[data-session-select="page-2"]').closest(".bot-tab");
  assert.equal(recoveredTab.classList.contains("health-alert"), false);
  assert.equal(recoveredTab.classList.contains("player-alert"), false);
  assert.equal(recoveredTab.classList.contains("hostile-alert"), false);
  assert.equal(recoveredTab.classList.contains("staff-alert"), false);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, stoppedAt);
});

test("session tabs ignore other live session characters when evaluating player alarms", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayerNames: ["Scout Beta"],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
        {
          id: "page-2",
          profileKey: "scout-beta",
          pageId: "page-2",
          title: "Minibia",
          url: "https://minibia.com/play?client=2",
          characterName: "Scout Beta",
          displayName: "Scout Beta",
          label: "Scout Beta",
          playerPosition: { x: 105, y: 205, z: 7 },
          playerStats: {
            health: 520,
            maxHealth: 1000,
            mana: 210,
            maxMana: 500,
            healthPercent: 52,
            manaPercent: 42,
          },
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 0,
          routeComplete: false,
          overlayFocusIndex: null,
          routeName: "dararotworms",
          page: {
            id: "page-2",
            title: "Minibia",
            url: "https://minibia.com/play?client=2",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const ownTabButton = document.querySelector('[data-session-select="page-1"]');
  const ownTab = ownTabButton.closest(".bot-tab");
  assert.match(ownTabButton.textContent, /P -/);
  assert.match(ownTabButton.getAttribute("aria-label"), /no visible players/i);
  assert.equal(ownTab.classList.contains("player-alert"), false);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);

  const nextState = clone(currentState());
  nextState.sessions = nextState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayers: [
            {
              id: 21,
              name: "Scout Beta",
              position: { x: 105, y: 205, z: 7 },
            },
            {
              id: 22,
              name: "PK Two",
              position: { x: 103, y: 200, z: 7 },
            },
          ],
          visiblePlayerNames: ["Scout Beta", "PK Two"],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, nextState);
  await flush(8);

  const updatedOwnTabButton = document.querySelector('[data-session-select="page-1"]');
  const updatedOwnTab = updatedOwnTabButton.closest(".bot-tab");
  assert.match(updatedOwnTabButton.textContent, /P 1/);
  assert.match(updatedOwnTabButton.getAttribute("aria-label"), /1 visible player/i);
  assert.equal(updatedOwnTab.classList.contains("player-alert"), true);
  await waitFor(430);
  await flush(4);
  const startedWhileActive = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedWhileActive.length > 0);
  assert.deepEqual([...new Set(startedWhileActive.map((entry) => entry.wave))], ["sine"]);
});

test("regular player alarms stay silent when the player is only one floor away under the default same-floor rule", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayers: [],
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const nextState = clone(currentState());
  nextState.sessions = nextState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayers: [
            {
              id: 61,
              name: "Kolakao",
              position: { x: 102, y: 195, z: 8 },
            },
          ],
          visiblePlayerNames: ["Kolakao"],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, nextState);
  await flush(8);
  await waitFor(430);
  await flush(4);

  const selectButton = document.querySelector('[data-session-select="page-1"]');
  const tab = selectButton.closest(".bot-tab");
  assert.equal(tab.classList.contains("player-alert"), true);
  assert.match(selectButton.getAttribute("aria-label"), /1 visible player/i);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);
});

test("session tab player alarm audio uses each session alarm settings", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      options: {
        alarmsEnabled: true,
        alarmsPlayerEnabled: true,
        alarmsPlayerRadiusSqm: 8,
        alarmsPlayerFloorRange: 0,
      },
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayers: [],
          visiblePlayerNames: [],
          alarmOptions: {
            alarmsEnabled: true,
            alarmsPlayerEnabled: true,
            alarmsPlayerRadiusSqm: 8,
            alarmsPlayerFloorRange: 0,
          },
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
        {
          id: "page-2",
          profileKey: "scout-beta",
          pageId: "page-2",
          title: "Minibia",
          url: "https://minibia.com/play?client=2",
          characterName: "Scout Beta",
          displayName: "Scout Beta",
          label: "Scout Beta",
          playerPosition: { x: 105, y: 205, z: 7 },
          playerStats: {
            health: 520,
            maxHealth: 1000,
            mana: 210,
            maxMana: 500,
            healthPercent: 52,
            manaPercent: 42,
          },
          visiblePlayers: [
            {
              id: 42,
              name: "PK Two",
              position: { x: 106, y: 205, z: 7 },
            },
          ],
          visiblePlayerNames: ["PK Two"],
          alarmOptions: {
            alarmsEnabled: false,
            alarmsPlayerEnabled: true,
            alarmsPlayerRadiusSqm: 8,
            alarmsPlayerFloorRange: 0,
          },
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 0,
          routeComplete: false,
          overlayFocusIndex: null,
          routeName: "dararotworms",
          page: {
            id: "page-2",
            title: "Minibia",
            url: "https://minibia.com/play?client=2",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { currentState, emit } = desk;

  await waitFor(430);
  await flush(4);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);

  const nextState = clone(currentState());
  nextState.sessions = nextState.sessions.map((session) => (
    session.id === "page-2"
      ? {
          ...session,
          alarmOptions: {
            ...session.alarmOptions,
            alarmsEnabled: true,
          },
        }
      : session
  ));

  emit("state", { sessionId: "page-2" }, nextState);
  await flush(8);
  await waitFor(430);
  await flush(4);

  const startedAfterSessionAlarmEnabled = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedAfterSessionAlarmEnabled.length > 0);
  assert.deepEqual([...new Set(startedAfterSessionAlarmEnabled.map((entry) => entry.wave))], ["sine"]);
});

test("session alarm power suppresses hostile audio while keeping the tab warning visible", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      options: {
        alarmsEnabled: false,
      },
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayerNames: ["God Minibia"],
          alarmOptions: {
            alarmsEnabled: true,
            alarmsStaffEnabled: true,
            alarmsStaffRadiusSqm: 9,
            alarmsStaffFloorRange: 1,
          },
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document } = desk;

  await waitFor(430);
  await flush(4);

  const tab = document.querySelector('[data-session-select="page-1"]').closest(".bot-tab");
  assert.equal(tab.classList.contains("hostile-alert"), true);
  assert.equal(tab.classList.contains("staff-alert"), true);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);
});

test("session alarm sound switch suppresses audio while keeping tab warnings visible", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      options: {
        alarmsEnabled: true,
        alarmsSoundEnabled: false,
        alarmsStaffEnabled: true,
        alarmsStaffRadiusSqm: 9,
        alarmsStaffFloorRange: 1,
      },
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayers: [
            {
              id: 78,
              name: "God Minibia",
              position: { x: 102, y: 200, z: 7 },
            },
          ],
          visiblePlayerNames: ["God Minibia"],
          alarmOptions: {
            alarmsEnabled: true,
            alarmsSoundEnabled: false,
            alarmsStaffEnabled: true,
            alarmsStaffRadiusSqm: 9,
            alarmsStaffFloorRange: 1,
          },
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document } = desk;

  await waitFor(430);
  await flush(4);

  const tab = document.querySelector('[data-session-select="page-1"]').closest(".bot-tab");
  assert.equal(tab.classList.contains("staff-alert"), true);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);
});

test("session tabs run a continuous GM/GOD alarm when a healthy session sees God Minibia", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  assert.equal(beepLog.filter((entry) => entry.type === "start").length, 0);

  const alertedState = clone(currentState());
  alertedState.sessions = alertedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayerNames: ["God Minibia"],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, alertedState);
  await flush(8);

  const selectButton = document.querySelector('[data-session-select="page-1"]');
  const tab = selectButton.closest(".bot-tab");
  assert.equal(tab.classList.contains("hostile-alert"), true);
  assert.equal(tab.classList.contains("staff-alert"), true);
  assert.equal(tab.classList.contains("health-alert"), false);
  assert.match(selectButton.getAttribute("aria-label"), /GM\/GOD visible: God Minibia/i);

  const startedWhileActive = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedWhileActive.length >= 3);
  assert.deepEqual([...new Set(startedWhileActive.map((entry) => entry.wave))], ["triangle"]);

  await waitFor(430);
  await flush(4);

  const startedAfterLoop = beepLog.filter((entry) => entry.type === "start").length;
  assert.ok(startedAfterLoop > startedWhileActive.length);

  const clearedState = clone(currentState());
  clearedState.sessions = clearedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayerNames: [],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, clearedState);
  await flush(8);

  const stoppedAt = beepLog.filter((entry) => entry.type === "start").length;
  await waitFor(430);
  await flush(4);

  const clearedTab = document.querySelector('[data-session-select="page-1"]').closest(".bot-tab");
  assert.equal(clearedTab.classList.contains("hostile-alert"), false);
  assert.equal(clearedTab.classList.contains("staff-alert"), false);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, stoppedAt);
});

test("session tabs run a stronger hostile alarm when a visible player targets the character", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayers: [],
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const alertedState = clone(currentState());
  alertedState.sessions = alertedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayers: [
            {
              id: 44,
              name: "PK Two",
              isTargetingSelf: true,
              skull: null,
            },
          ],
          visiblePlayerNames: ["PK Two"],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, alertedState);
  await flush(8);

  const selectButton = document.querySelector('[data-session-select="page-1"]');
  const tab = selectButton.closest(".bot-tab");
  assert.equal(tab.classList.contains("hostile-alert"), true);
  assert.equal(tab.classList.contains("staff-alert"), false);
  assert.match(selectButton.getAttribute("aria-label"), /Players targeting you: PK Two/i);
  const startedWhileActive = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedWhileActive.length >= 3);
  assert.deepEqual([...new Set(startedWhileActive.map((entry) => entry.wave))], ["triangle"]);

  const clearedState = clone(currentState());
  clearedState.sessions = clearedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayers: [],
          visiblePlayerNames: [],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, clearedState);
  await flush(8);

  const stoppedAt = beepLog.filter((entry) => entry.type === "start").length;
  await waitFor(430);
  await flush(4);

  assert.equal(document.querySelector('[data-session-select="page-1"]').closest(".bot-tab").classList.contains("hostile-alert"), false);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, stoppedAt);
});

test("session tabs run a stronger hostile alarm when a skulled player is visible", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayers: [],
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const alertedState = clone(currentState());
  alertedState.sessions = alertedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayers: [
            {
              id: 55,
              name: "Red Skull",
              isTargetingSelf: false,
              skull: {
                key: "red",
                label: "Red Skull",
              },
            },
          ],
          visiblePlayerNames: ["Red Skull"],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, alertedState);
  await flush(8);

  const selectButton = document.querySelector('[data-session-select="page-1"]');
  const tab = selectButton.closest(".bot-tab");
  assert.equal(tab.classList.contains("hostile-alert"), true);
  assert.equal(tab.classList.contains("staff-alert"), false);
  assert.match(selectButton.getAttribute("aria-label"), /Skulled players visible: Red Skull/i);
  const startedWhileActive = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedWhileActive.length >= 3);
  assert.deepEqual([...new Set(startedWhileActive.map((entry) => entry.wave))], ["triangle"]);
});

test("blacklisted players use the strongest alarm profile even when detected one floor away", async () => {
  const beepLog = [];

  const desk = await createDesk({
    initialState: createState({
      options: {
        alarmsBlacklistNames: ["God Minibia"],
      },
      sessions: [
        {
          id: "page-1",
          profileKey: "knight-alpha",
          pageId: "page-1",
          title: "Minibia",
          url: "https://minibia.com/play",
          characterName: "Knight Alpha",
          displayName: "Knight Alpha",
          label: "Knight Alpha",
          playerPosition: { x: 100, y: 200, z: 7 },
          playerStats: {
            health: 870,
            maxHealth: 1000,
            mana: 320,
            maxMana: 500,
            healthPercent: 87,
            manaPercent: 64,
          },
          visiblePlayers: [],
          visiblePlayerNames: [],
          running: false,
          connected: true,
          ready: true,
          present: true,
          claimed: false,
          claimedBySelf: true,
          available: true,
          routeIndex: 1,
          routeComplete: false,
          overlayFocusIndex: 1,
          routeName: "dararotworms",
          page: {
            id: "page-1",
            title: "Minibia",
            url: "https://minibia.com/play",
          },
        },
      ],
    }),
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const alertedState = clone(currentState());
  alertedState.sessions = alertedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          visiblePlayers: [
            {
              id: 71,
              name: "God Minibia",
              position: { x: 101, y: 201, z: 8 },
            },
          ],
          visiblePlayerNames: ["God Minibia"],
        }
      : session
  ));

  emit("state", { sessionId: "page-1" }, alertedState);
  await flush(8);

  const selectButton = document.querySelector('[data-session-select="page-1"]');
  const tab = selectButton.closest(".bot-tab");
  assert.equal(tab.classList.contains("hostile-alert"), true);
  assert.equal(tab.classList.contains("staff-alert"), true);
  const startedWhileActive = beepLog.filter((entry) => entry.type === "start");
  assert.ok(startedWhileActive.length >= 3);
  assert.deepEqual([...new Set(startedWhileActive.map((entry) => entry.wave))], ["sawtooth"]);
});

test("stale running sessions show a stale alarm state until fresh updates resume", async () => {
  const beepLog = [];

  const desk = await createDesk({
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const staleState = clone(currentState());
  staleState.sessions = staleState.sessions.map((session) => (
    session.id === "page-2"
      ? {
          ...session,
          running: true,
          connected: true,
          stale: true,
          snapshotAgeMs: 13_500,
        }
      : session
  ));

  emit("state", { sessionId: "page-2" }, staleState);
  await flush(8);

  const staleTab = document.querySelector('[data-session-select="page-2"]').closest(".bot-tab");
  assert.match(staleTab.textContent, /stale/i);
  assert.equal(staleTab.classList.contains("stale-alert"), true);
  assert.ok(beepLog.filter((entry) => entry.type === "start").length >= 1);

  const recoveredState = clone(currentState());
  recoveredState.sessions = recoveredState.sessions.map((session) => (
    session.id === "page-2"
      ? {
          ...session,
          stale: false,
          snapshotAgeMs: 400,
        }
      : session
  ));

  emit("state", { sessionId: "page-2" }, recoveredState);
  await flush(8);

  const stoppedAt = beepLog.filter((entry) => entry.type === "start").length;
  await waitFor(430);
  await flush(4);

  assert.equal(document.querySelector('[data-session-select="page-2"]').closest(".bot-tab").classList.contains("stale-alert"), false);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, stoppedAt);
});

test("session tabs keep a death alarm active until the character is alive again", async () => {
  const beepLog = [];

  const desk = await createDesk({
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });
  const { document, currentState, emit } = desk;

  const deathState = clone(currentState());
  deathState.sessions = deathState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          playerStats: {
            ...session.playerStats,
            health: 0,
            healthPercent: 0,
          },
        }
      : session
  ));
  deathState.snapshot = {
    ...deathState.snapshot,
    playerStats: {
      ...deathState.snapshot.playerStats,
      health: 0,
      healthPercent: 0,
    },
  };

  emit("state", { sessionId: "page-1" }, deathState);
  await flush(8);

  assert.match(document.querySelector('[data-session-select="page-1"]').textContent, /HP DEAD/);
  assert.equal(document.querySelector('[data-session-select="page-1"]').closest(".bot-tab").classList.contains("death-alert"), true);

  const startedOnDeath = beepLog.filter((entry) => entry.type === "start").length;
  assert.ok(startedOnDeath >= 2);

  await waitFor(470);
  await flush(4);

  const startedAfterDeathLoop = beepLog.filter((entry) => entry.type === "start").length;
  assert.ok(startedAfterDeathLoop > startedOnDeath);

  const revivedState = clone(currentState());
  revivedState.sessions = revivedState.sessions.map((session) => (
    session.id === "page-1"
      ? {
          ...session,
          playerStats: {
            ...session.playerStats,
            health: 420,
            healthPercent: 42,
          },
        }
      : session
  ));
  revivedState.snapshot = {
    ...revivedState.snapshot,
    playerStats: {
      ...revivedState.snapshot.playerStats,
      health: 420,
      healthPercent: 42,
    },
  };

  emit("state", { sessionId: "page-1" }, revivedState);
  await flush(8);

  const stoppedAt = beepLog.filter((entry) => entry.type === "start").length;
  await waitFor(470);
  await flush(4);

  assert.equal(document.querySelector('[data-session-select="page-1"]').closest(".bot-tab").classList.contains("death-alert"), false);
  assert.equal(beepLog.filter((entry) => entry.type === "start").length, stoppedAt);
});

test("route reset completion plays a 5 second alarm beep", async () => {
  const beepLog = [];

  const desk = await createDesk({
    beforeEval(window) {
      installFakeAudioContext(window, beepLog);
    },
  });

  desk.emit("route-reset-complete", { sessionId: "page-1" });
  await flush(8);

  const started = beepLog.filter((entry) => entry.type === "start");
  assert.ok(started.length >= 6);
  assert.ok(Math.max(...started.map((entry) => Number(entry.at) || 0)) >= 4.5);
});

test("live patch events keep static catalogs while updating the active session", async () => {
  const desk = await createDesk();
  const { document } = desk;
  const baseState = clone(desk.currentState());
  const liveLabel = "Knight Alpha Patched";

  desk.emit("state", {}, null, {
    statePatch: true,
    state: {
      activeSessionId: baseState.activeSessionId,
      sessions: baseState.sessions.map((session) => (
        String(session.id) === String(baseState.activeSessionId)
          ? {
              ...clone(session),
              label: liveLabel,
              running: true,
              playerStats: {
                ...(clone(session.playerStats) || {}),
                health: 380,
                healthPercent: 38,
              },
            }
          : clone(session)
      )),
      running: true,
      routeIndex: 2,
      routeComplete: false,
      routeResetActive: false,
      routeResetPhase: null,
      routeResetTargetIndex: null,
      reconnectStatus: clone(baseState.reconnectStatus),
      overlayFocusIndex: 2,
      page: clone(baseState.page),
      snapshot: {
        ...clone(baseState.snapshot),
        playerName: liveLabel,
        playerStats: {
          ...(clone(baseState.snapshot?.playerStats) || {}),
          health: 380,
          healthPercent: 38,
        },
      },
      logs: [...baseState.logs, "[12:00:02] Live patch tick"],
      binding: {
        ...clone(baseState.binding),
        label: liveLabel,
        characterName: liveLabel,
        displayName: liveLabel,
      },
      selectionRequired: false,
    },
  });
  await flush(8);

  assert.match(document.getElementById("event-feed").textContent, /Live patch tick/);
  assert.equal(desk.window.__MINIBOT_RENDERER_METRICS__?.renderer?.renderLogs?.outputMode, "append");
  assert.match(document.getElementById("route-file-path").textContent, /dararotworms\.json/);
  assert.match(document.getElementById("hunt-preset-list").textContent, /Rotworm/);
  assert.equal(document.querySelector('article[data-route-preview-index="2"]').classList.contains("current"), true);
  assert.equal(document.querySelector('article[data-route-preview-index="1"]').classList.contains("current"), false);
});

test("runtime metrics strip surfaces tick, patch, and renderer timing", async () => {
  const desk = await createDesk();
  const { document, window } = desk;
  const metrics = document.getElementById("runtime-metrics");

  document.getElementById("open-logs").click();
  await flush();

  desk.emit("state", {}, null, {
    statePatch: true,
    state: {
      activeSessionId: desk.currentState().activeSessionId,
      logRevision: Number(desk.currentState().logRevision) || 0,
      runtimeMetrics: {
        desktop: {
          livePatch: {
            count: 2,
            lastMs: 3.6,
            avgMs: 4.2,
            maxMs: 5.1,
            includeLogs: false,
          },
          serializeLiveState: {
            count: 3,
            lastMs: 1.2,
            avgMs: 1.4,
            maxMs: 2,
            includeLogs: false,
          },
        },
        activeSession: {
          tick: {
            count: 7,
            lastMs: 18.4,
            avgMs: 12.2,
            maxMs: 21.9,
            ready: true,
          },
        },
      },
    },
  });
  await flush(8);

  assert.match(metrics.textContent, /Tick/);
  assert.match(metrics.textContent, /18 ms/);
  assert.match(metrics.textContent, /Patch/);
  assert.match(metrics.textContent, /3\.6 ms/);
  assert.match(metrics.textContent, /Serialize/);
  assert.match(metrics.textContent, /logs skipped/);
  assert.ok(window.__MINIBOT_RENDERER_METRICS__?.renderer?.render?.count >= 1);
  assert.ok(window.__MINIBOT_RENDERER_METRICS__?.renderer?.renderLogs?.count >= 1);
});

test("detached active tabs show sync-first states and start with a refresh hop", async () => {
  const desk = await createDesk({
    initialState: createState({
      page: null,
    }),
  });
  const { document, calls, currentState } = desk;

  assert.equal(document.querySelector('[data-session-select="page-1"] span').textContent, "sync needed");
  assert.equal(document.querySelector('[data-session-toggle="page-1"]').textContent, "Start");
  assert.equal(document.querySelector('[data-session-toggle="page-1"]').disabled, false);

  document.querySelector('[data-session-toggle="page-1"]').click();
  await flush();

  assert.equal(calls.refresh, 1);
  assert.equal(calls.toggleRun.length, 1);
  assert.equal(currentState().page?.id, "page-1");
  assert.equal(currentState().running, true);
});

test("active tab lifecycle follows session connection instead of stale page metadata", async () => {
  const activeSession = {
    id: "page-1",
    profileKey: "knight-alpha",
    pageId: "page-1",
    title: "Minibia",
    url: "https://minibia.com/play",
    characterName: "Knight Alpha",
    displayName: "Knight Alpha",
    label: "Knight Alpha",
    playerPosition: { x: 100, y: 200, z: 7 },
    running: false,
    connected: false,
    ready: true,
    present: true,
    claimed: false,
    claimedBySelf: true,
    available: true,
    routeIndex: 1,
    routeComplete: false,
    overlayFocusIndex: 1,
    routeName: "dararotworms",
    page: {
      id: "page-1",
      title: "Minibia",
      url: "https://minibia.com/play",
    },
  };

  const desk = await createDesk({
    initialState: createState({
      sessions: [activeSession],
      page: {
        id: "page-1",
        title: "Minibia",
        url: "https://minibia.com/play",
      },
    }),
  });
  const { document } = desk;

  assert.equal(document.querySelector('[data-session-select="page-1"] span').textContent, "sync needed");
  assert.equal(document.getElementById("route-overlay-note"), null);
  assert.equal(document.getElementById("dashboard-cards"), null);
  assert.match(document.getElementById("summary-targeting-detail").textContent, /minibia\.com/);
});

test("hunt studio saves hunt queue, shared spawn mode, and fallback combat state", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm", "Rat"],
        targetProfiles: [
          { name: "Rotworm", priority: 140, dangerLevel: 4 },
          { name: "Rat", priority: 60, dangerLevel: 1 },
        ],
        sharedSpawnMode: "attack-all",
        distanceKeeperEnabled: false,
        distanceKeeperRules: [
          {
            enabled: true,
            label: "Fallback Spacing",
            minTargetDistance: 1,
            maxTargetDistance: 3,
            minMonsterCount: 1,
            cooldownMs: 300,
            behavior: "kite",
            dodgeBeams: false,
            dodgeWaves: true,
            requireTarget: true,
          },
        ],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="targeting"]').click();
  await flush();

  assert.equal(document.getElementById("monster").value, "Rotworm\nRat");
  assert.match(document.getElementById("autowalk-shared-spawn-summary").textContent, /Attack All/);

  document.getElementById("monster").value = "Dragon\nRat";
  document.getElementById("monster").dispatchEvent(new window.Event("input", { bubbles: true }));
  document.getElementById("autowalk-sharedSpawnMode").value = "respect-others";
  document.getElementById("autowalk-sharedSpawnMode").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("chaseMode").value = "aggressive";
  document.getElementById("chaseMode").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("targeting-distance-enabled").checked = true;
  document.getElementById("targeting-distance-enabled").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("once").checked = true;
  document.getElementById("once").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("dryRun").checked = true;
  document.getElementById("dryRun").dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("retargetMs").value = "900";
  document.getElementById("rangeX").value = "6";
  document.getElementById("rangeY").value = "4";
  document.getElementById("floorTolerance").value = "0";
  document.getElementById("save-targeting").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.monster, "Dragon\nRat");
  assert.equal(payload.sharedSpawnMode, "respect-others");
  assert.equal(payload.chaseMode, "aggressive");
  assert.equal(payload.distanceKeeperEnabled, true);
  assert.equal(payload.once, true);
  assert.equal(payload.dryRun, true);
  assert.equal(payload.retargetMs, 900);
  assert.equal(payload.rangeX, 6);
  assert.equal(payload.rangeY, 4);
  assert.equal(payload.floorTolerance, 0);
  assert.deepEqual(
    payload.targetProfiles.map((profile) => profile.name),
    ["Dragon", "Rat"],
  );
  assert.equal(currentState().options.sharedSpawnMode, "respect-others");
  assert.equal(currentState().options.chaseMode, "aggressive");
  assert.equal(currentState().options.distanceKeeperEnabled, true);
  assert.equal(currentState().options.once, true);
  assert.equal(currentState().options.dryRun, true);
  assert.equal(currentState().options.targetProfiles.find((profile) => profile.name === "Dragon")?.priority, 100);
  assert.equal(currentState().options.targetProfiles.some((profile) => profile.name === "Rotworm"), false);
  assert.match(document.getElementById("autowalk-shared-spawn-summary").textContent, /Respect Others/);
  await waitFor(460);
  await flush();
  assert.equal(document.getElementById("modal-targeting").classList.contains("open"), false);
  assert.equal(document.getElementById("modal-layer").hidden, true);
});

test("hunt target profiles skip DOM rebuilds for live creature-only patches", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm", "Rat"],
        targetProfiles: [
          { name: "Rotworm", priority: 140, dangerLevel: 4 },
          { name: "Rat", priority: 60, dangerLevel: 1 },
        ],
      },
    }),
  });
  const { document, emit } = desk;

  document.querySelector('[data-open-modal="targeting"]').click();
  await flush();

  const firstRow = document.querySelector("#target-profile-list [data-target-profile-name]");
  assert.equal(firstRow?.dataset.targetProfileName, "Rotworm");

  emit("state", {}, createState({
    options: {
      monsterNames: ["Rotworm", "Rat"],
      targetProfiles: [
        { name: "Rotworm", priority: 140, dangerLevel: 4 },
        { name: "Rat", priority: 60, dangerLevel: 1 },
      ],
    },
    snapshot: {
      visibleMonsterNames: ["Dragon"],
      visibleCreatureNames: ["Dragon"],
      visibleCreatures: [
        {
          id: 200,
          name: "Dragon",
          position: { x: 103, y: 200, z: 7 },
        },
      ],
    },
  }), { statePatch: true });
  await flush();

  assert.equal(document.querySelector("#target-profile-list [data-target-profile-name]"), firstRow);
});

test("route overview quick save persists route settings without opening the autowalk modal", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        cavebotName: "Scarabs 1",
        waypoints: [
          { x: 100, y: 200, z: 7, label: "Start", type: "walk" },
        ],
        tileRules: [
          { x: 101, y: 200, z: 7, policy: "avoid", label: "Trap" },
        ],
      },
    }),
  });
  const { document, calls, currentState } = desk;

  const quickSaveButton = document.getElementById("route-quick-save-button");
  assert.ok(quickSaveButton);
  assert.equal(document.getElementById("modal-layer").hidden, true);

  quickSaveButton.click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.cavebotName, "Scarabs 1");
  assert.ok(payload);
  assert.equal(currentState().options.cavebotName, "Scarabs 1");
  assert.equal(document.getElementById("modal-layer").hidden, true);
  assert.equal(document.getElementById("modal-autowalk").classList.contains("open"), false);
  assert.equal(quickSaveButton.dataset.feedback, "success");
});

test("hunt workspace shows one configured monster per line", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Swamp Troll", "Rat", "Bat"],
        monsterArchive: ["Swamp Troll", "Rat", "Bat", "Larva"],
      },
      snapshot: {
        visibleMonsterNames: ["Rat", "Larva"],
        visibleCreatureNames: ["Rat", "Larva"],
        visiblePlayerNames: ["Knight Alpha", "Scout Beta"],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(document.getElementById("monster").value, "Swamp Troll\nRat\nBat");
  assert.equal(document.getElementById("summary-targeting").textContent.trim(), "Swamp Troll, Rat, Bat");
  assert.match(document.getElementById("monster-archive").textContent, /Larva/);
  assert.match(document.getElementById("monster-archive").textContent, /Rat/);
  assert.equal(document.getElementById("monster-target-list").textContent.trim(), "");
  assert.match(document.getElementById("monster-visible-note").textContent, /Nearby now \(2\): Larva, Rat/);
  assert.match(document.getElementById("player-visible-note").textContent, /Nearby now \(2\): Knight Alpha, Scout Beta/);
  assert.match(document.getElementById("player-visible-list").textContent, /Knight Alpha/);
  assert.ok(!document.getElementById("monster-archive").textContent.includes("Knight Alpha"));
});

test("hunt workspace keeps the lean four-panel layout and shows nearby npcs", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm"],
        monsterArchive: ["Rotworm", "Rat"],
        playerArchive: ["Knight Alpha"],
      },
      snapshot: {
        visibleMonsterNames: ["Rotworm", "Rat"],
        visibleCreatureNames: ["Rotworm", "Rat"],
        visiblePlayerNames: ["Knight Alpha"],
        visibleNpcNames: ["Augusto", "Yaman"],
        visibleNpcs: [
          { name: "Augusto" },
          { name: "Yaman" },
        ],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(document.querySelectorAll(".route-hunt-grid > *").length, 4);
  assert.ok(document.querySelector("#modal-targeting .route-hunt-modal-summary"));
  assert.equal(document.getElementById("modal-targeting").textContent.includes("Merged Hunt Surface"), false);
  assert.match(document.getElementById("modal-targeting").textContent, /Players/);
  assert.match(document.getElementById("modal-targeting").textContent, /NPCs/);
  assert.match(document.getElementById("npc-visible-note").textContent, /Nearby now \(2\): Augusto, Yaman/);
  assert.match(document.getElementById("npc-visible-list").textContent, /Augusto/);
  assert.match(document.getElementById("npc-visible-list").textContent, /Yaman/);
});

test("hunt workspace blocks dragging player labels into the monster registry", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm"],
        monsterArchive: [],
      },
      snapshot: {
        visiblePlayerNames: ["Knight Alpha"],
        visibleMonsterNames: ["Rotworm"],
        visibleCreatureNames: ["Rotworm"],
      },
    }),
  });
  const { document, window, calls } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(document.querySelector("[data-target-watch-handle]"), null);
  assert.equal(document.querySelector("[data-target-watch-reset]"), null);
  const initialUpdateCount = calls.updateOptions.length;

  const dragTransfer = createDragTransfer();
  const source = document.querySelector('#player-visible-list [data-creature-registry-name="Knight Alpha"]');
  const target = document.getElementById("monster-archive");

  dispatchDrag(window, source, "dragstart", { dataTransfer: dragTransfer });
  dispatchDrag(window, target, "dragover", { dataTransfer: dragTransfer });
  dispatchDrag(window, target, "drop", { dataTransfer: dragTransfer });
  dispatchDrag(window, source, "dragend", { dataTransfer: dragTransfer });
  await flush();

  assert.equal(calls.updateOptions.length, initialUpdateCount);
  assert.ok(!document.getElementById("monster-archive").textContent.includes("Knight Alpha"));
});

test("presets modal filters vendored hunts and applies queue plus profile", async () => {
  const desk = await createDesk();
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="presets"]').click();
  await flush();

  assert.equal(document.getElementById("modal-presets").classList.contains("open"), true);
  assert.match(document.getElementById("hunt-preset-list").textContent, /Rotworm/);
  assert.match(document.getElementById("hunt-preset-list").textContent, /Beholder/);

  const search = document.getElementById("hunt-preset-search");
  search.value = "beam";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();

  assert.doesNotMatch(document.getElementById("hunt-preset-list").textContent, /Rotworm/);
  assert.match(document.getElementById("hunt-preset-list").textContent, /Beholder/);
  assert.equal(document.getElementById("hunt-preset-count").textContent.trim(), "1 / 2");
  assert.match(document.getElementById("hunt-preset-detail").textContent, /Beholder Blinder/);

  document.querySelector('[data-apply-hunt-preset="queue-profile"]').click();
  await flush();

  assert.deepEqual(calls.updateOptions.at(-1), {
    monster: "Beholder",
    targetProfiles: [
      {
        enabled: true,
        name: "Beholder",
        priority: 132,
        dangerLevel: 8,
        keepDistanceMin: 1,
        keepDistanceMax: 2,
        finishBelowPercent: 30,
        killMode: "asap",
        chaseMode: "auto",
        behavior: "kite",
        preferShootable: true,
        stickToTarget: true,
        avoidBeam: true,
        avoidWave: false,
      },
    ],
  });
  assert.equal(currentState().options.monster, "Beholder");
  assert.deepEqual(currentState().options.monsterNames, ["Beholder"]);
  assert.equal(currentState().options.targetProfiles[0].name, "Beholder");
  assert.equal(currentState().options.targetProfiles[0].avoidBeam, true);
  await waitFor(460);
  await flush();
  assert.equal(document.getElementById("modal-presets").classList.contains("open"), false);
  assert.equal(document.getElementById("modal-layer").hidden, true);
});

test("hunt workspace keeps player history visible even when nobody is nearby", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        playerArchive: ["Knight Alpha", "Scout Beta"],
      },
      snapshot: {
        visiblePlayerNames: [],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.match(document.getElementById("player-visible-note").textContent, /No players nearby\./);
  assert.match(document.getElementById("player-visible-list").textContent, /Knight Alpha/);
  assert.match(document.getElementById("player-visible-list").textContent, /Scout Beta/);
});

test("hunt workspace renders players and npcs as compact presence grids", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        playerArchive: ["Zulu Knight", "Knight Alpha"],
        npcArchive: ["Rashid"],
      },
      snapshot: {
        visiblePlayerNames: ["Scout Beta", "Knight Alpha"],
        visibleNpcNames: ["Yaman"],
        visibleNpcs: [{ name: "Yaman" }],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.match(
    stylesSource,
    /\.player-archive,\s*\.npc-archive\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(112px,\s*1fr\)\);/,
  );
  assert.match(
    stylesSource,
    /\.presence-chip\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto;/,
  );
  assert.deepEqual(
    [...document.querySelectorAll("#player-visible-list .presence-chip strong")].map((node) => node.textContent.trim()),
    ["Knight Alpha", "Scout Beta", "Zulu Knight"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#player-visible-list .presence-chip span")].map((node) => node.textContent.trim()),
    ["Nearby", "Nearby", "Seen"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#npc-visible-list .presence-chip strong")].map((node) => node.textContent.trim()),
    ["Rashid", "Yaman"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#npc-visible-list .presence-chip span")].map((node) => node.textContent.trim()),
    ["Seen", "Nearby"],
  );
  assert.doesNotMatch(document.getElementById("player-visible-list").textContent, /Seen recently Player|Nearby now Player|Tracked player/i);
  assert.doesNotMatch(document.getElementById("npc-visible-list").textContent, /Seen recently NPC|Nearby now NPC|Tracked NPC/i);
});

test("hunt workspace keeps registry entries alphabetical and target profiles in priority order", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Swamp Troll", "Rat", "Bat"],
        monsterArchive: ["Swamp Troll", "Rat", "Bat", "Larva", "Dragon"],
        playerArchive: ["Zulu Knight", "Alpha Knight"],
        targetProfiles: [
          { name: "Swamp Troll", priority: 180 },
          { name: "Rat", priority: 120 },
          { name: "Bat", priority: 80 },
        ],
      },
      snapshot: {
        visibleMonsterNames: ["Rat", "Dragon"],
        visibleCreatureNames: ["Rat", "Dragon"],
        visiblePlayerNames: ["Scout Beta", "Alpha Knight"],
        visibleCreatures: [
          { name: "Rat", healthPercent: 85 },
          { name: "Dragon", healthPercent: 40 },
        ],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.match(document.getElementById("monster-visible-note").textContent, /Nearby now \(2\): Dragon, Rat/);
  assert.match(document.getElementById("player-visible-note").textContent, /Nearby now \(2\): Alpha Knight, Scout Beta/);
  assert.deepEqual(
    [...document.querySelectorAll("#monster-archive [data-name]")].map((node) => node.textContent.trim()),
    ["Bat", "Dragon", "Larva", "Rat", "Swamp Troll"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#player-visible-list .player-chip strong")].map((node) => node.textContent.trim()),
    ["Alpha Knight", "Scout Beta", "Zulu Knight"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#target-profile-list [data-target-profile-name]")].map((node) => node.dataset.targetProfileName),
    ["Swamp Troll", "Rat", "Bat"],
  );
  assert.equal(
    document.querySelector("#target-profile-list [data-target-profile-name] .target-profile-priority")?.textContent?.trim(),
    undefined,
  );
  assert.equal(
    document.querySelector("#target-profile-list [data-target-profile-name] .target-profile-name")?.textContent?.trim(),
    "Swamp Troll",
  );
});

test("hunt workspace strips polluted target names and filters registry lists by search", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Swamp Troll", "Knight Alpha", "Rashid", "Alpha Rat", "Rat"],
        monsterArchive: ["Swamp Troll", "Knight Alpha", "Rashid", "Alpha Rat", "Rat", "Larva"],
        playerArchive: ["Knight Alpha"],
        targetProfiles: [
          { name: "Swamp Troll", priority: 180 },
          { name: "Knight Alpha", priority: 160 },
          { name: "Rashid", priority: 140 },
          { name: "Alpha Rat", priority: 120 },
          { name: "Rat", priority: 100 },
        ],
      },
      snapshot: {
        visibleMonsterNames: ["Rat", "Larva"],
        visibleCreatureNames: ["Rat", "Larva"],
        visiblePlayerNames: ["Knight Alpha"],
        visibleNpcNames: ["Rashid"],
        visibleNpcs: [{ name: "Rashid" }],
      },
    }),
  });
  const { document, window } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(document.getElementById("monster").value, "Swamp Troll\nAlpha Rat\nRat");
  assert.ok(!document.getElementById("monster-target-list").textContent.includes("Knight Alpha"));
  assert.ok(!document.getElementById("monster-target-list").textContent.includes("Rashid"));
  assert.ok(!document.getElementById("monster-archive").textContent.includes("Knight Alpha"));
  assert.ok(!document.getElementById("monster-archive").textContent.includes("Rashid"));
  assert.deepEqual(
    [...document.querySelectorAll("#target-profile-list [data-target-profile-name]")].map((node) => node.dataset.targetProfileName),
    ["Swamp Troll", "Alpha Rat", "Rat"],
  );

  const search = document.getElementById("creature-registry-search");
  search.value = "rat";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();

  assert.deepEqual(
    [...document.querySelectorAll("#monster-target-list [data-name]")].map((node) => node.textContent.trim()),
    [],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#monster-archive [data-name]")].map((node) => node.textContent.trim()),
    ["Alpha Rat", "Rat"],
  );
  assert.deepEqual(
    [...document.querySelectorAll("#target-profile-list [data-target-profile-name]")].map((node) => node.dataset.targetProfileName),
    ["Alpha Rat", "Rat"],
  );
  assert.match(document.getElementById("player-visible-list").textContent, /No matches for "rat"/i);
  assert.match(document.getElementById("npc-visible-list").textContent, /No matches for "rat"/i);
});

test("hunt workspace saves per-monster target profiles from the target panel", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Swamp Troll", "Rat"],
        distanceKeeperEnabled: false,
        distanceKeeperRules: [
          {
            enabled: true,
            label: "Fallback Spacing",
            minTargetDistance: 1,
            maxTargetDistance: 3,
            minMonsterCount: 1,
            cooldownMs: 300,
            behavior: "kite",
            dodgeBeams: false,
            dodgeWaves: true,
            requireTarget: true,
          },
        ],
        targetProfiles: [
          {
            name: "Swamp Troll",
            priority: 130,
            dangerLevel: 6,
            keepDistanceMin: 2,
            keepDistanceMax: 3,
            finishBelowPercent: 20,
            killMode: "asap",
            behavior: "kite",
            preferShootable: true,
            stickToTarget: true,
            avoidBeam: false,
            avoidWave: true,
          },
        ],
      },
      snapshot: {
        visibleMonsterNames: ["Swamp Troll", "Rat"],
        visibleCreatureNames: ["Swamp Troll", "Rat"],
        visibleCreatures: [
          { name: "Swamp Troll", healthPercent: 44 },
          { name: "Rat", healthPercent: 88 },
        ],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.match(document.getElementById("target-profile-list").textContent, /Swamp Troll/);
  assert.match(document.getElementById("target-profile-list").textContent, /Rat/);

  const ratRow = [...document.querySelectorAll("#target-profile-list [data-target-profile-name]")]
    .find((row) => row.dataset.targetProfileName === "Rat");
  assert.ok(ratRow, "Rat target profile row should render");

  const setField = (field, value, type = "input") => {
    const element = ratRow.querySelector(`[data-target-profile-field="${field}"]`);
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = String(value);
    }
    element.dispatchEvent(new window.Event(type, { bubbles: true }));
  };

  setField("priority", 220);
  setField("dangerLevel", 9);
  setField("keepDistanceMin", 3);
  setField("keepDistanceMax", 5);
  setField("finishBelowPercent", 35);
  setField("killMode", "last", "change");
  setField("chaseMode", "aggressive", "change");
  setField("behavior", "escape", "change");
  assert.equal(ratRow.querySelector('[data-target-profile-field="avoidWave"]'), null);
  setField("avoidHazards", true, "change");
  setField("stickToTarget", false, "change");

  document.getElementById("targeting-distance-enabled").checked = true;
  document.getElementById("targeting-distance-enabled").dispatchEvent(new window.Event("change", { bubbles: true }));

  const combatRule = document.querySelector('#targeting-distance-rule-list .module-rule-card[data-rule-index="0"]');
  assert.equal(combatRule.querySelector(".module-rule-head"), null);
  assert.equal(combatRule.querySelector(".module-rule-summary"), null);
  assert.equal(combatRule.querySelector(".module-rule-section-title"), null);
  assert.ok(combatRule.querySelector(".module-rule-toolbar [data-targeting-distance-delete]"));
  assert.ok(combatRule.querySelector(".module-rule-corner-toggle input[data-rule-field='enabled']"));
  assert.equal(combatRule.querySelector(".module-rule-check input[data-rule-field='enabled']"), null);
  assert.equal(combatRule.querySelectorAll("input[data-rule-field='enabled']").length, 1);
  const setCombatField = (field, value, type = "input") => {
    const element = combatRule.querySelector(`[data-rule-field="${field}"]`);
    if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = String(value);
    }
    element.dispatchEvent(new window.Event(type, { bubbles: true }));
  };

  setCombatField("minTargetDistance", 4);
  setCombatField("maxTargetDistance", 6);
  setCombatField("behavior", "escape", "change");
  setCombatField("dodgeBeams", true, "change");

  document.getElementById("save-targeting").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  const ratProfile = payload.targetProfiles.find((profile) => profile.name === "Rat");
  assert.equal(ratProfile.priority, 220);
  assert.equal(ratProfile.dangerLevel, 9);
  assert.equal(ratProfile.keepDistanceMin, 3);
  assert.equal(ratProfile.keepDistanceMax, 5);
  assert.equal(ratProfile.finishBelowPercent, 35);
  assert.equal(ratProfile.killMode, "last");
  assert.equal(ratProfile.chaseMode, "aggressive");
  assert.equal(ratProfile.behavior, "escape");
  assert.equal(ratProfile.avoidBeam, true);
  assert.equal(ratProfile.avoidWave, true);
  assert.equal(ratProfile.stickToTarget, false);
  assert.equal(payload.distanceKeeperEnabled, true);
  assert.equal(payload.distanceKeeperRules[0].minTargetDistance, 4);
  assert.equal(payload.distanceKeeperRules[0].maxTargetDistance, 6);
  assert.equal(payload.distanceKeeperRules[0].behavior, "escape");
  assert.equal(payload.distanceKeeperRules[0].dodgeBeams, true);
  assert.equal(currentState().options.targetProfiles.find((profile) => profile.name === "Rat")?.priority, 220);
  assert.equal(currentState().options.distanceKeeperEnabled, true);
  assert.equal(currentState().options.distanceKeeperRules[0]?.behavior, "escape");
});

test("mana trainer rules render as grouped rule cards", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        manaTrainerEnabled: true,
        manaTrainerRules: [
          {
            enabled: true,
            label: "",
            words: "utani hur",
            hotkey: "",
            minHealthPercent: 95,
            minManaPercent: 95,
            maxManaPercent: 100,
            cooldownMs: 1400,
            requireNoTargets: true,
            requireStationary: true,
          },
        ],
      },
    }),
  });
  const { document, window, calls } = desk;

  document.querySelector('[data-open-modal="manaTrainer"]').click();
  await flush();

  const card = document.querySelector("#module-rule-list .module-rule-card");
  assert.equal(document.querySelector("#modal-module > .modal-head").hidden, true);
  assert.equal(document.getElementById("modal-module").classList.contains("module-modal-headless"), true);
  assert.equal(document.getElementById("add-module-rule").hidden, true);
  assert.equal(document.querySelector("#module-rule-list > .module-rule-inline-toolbar [data-add-module-rule='manaTrainer']")?.textContent.trim(), "Add Window");
  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On - 1 active - 1 total");
  assert.match(document.getElementById("module-note").textContent, /first active window/i);
  assert.equal(card.querySelector(".module-rule-head"), null);
  assert.equal(card.querySelector(".module-rule-name"), null);
  assert.equal(card.querySelector(".module-rule-summary"), null);
  assert.equal(card.querySelector(".module-rule-section-title"), null);
  assert.ok(card.querySelector(".module-rule-toolbar [data-delete-module-rule='manaTrainer']"));
  assert.ok(card.querySelector('[data-module-key="manaTrainer"][data-rule-index="0"][data-rule-field="requireNoTargets"]'));

  const spellInput = card.querySelector('[data-module-key="manaTrainer"][data-rule-index="0"][data-rule-field="words"]');
  const hotkeyInput = card.querySelector('[data-module-key="manaTrainer"][data-rule-index="0"][data-rule-field="hotkey"]');
  spellInput.value = "utevo res";
  spellInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  hotkeyInput.value = "F9";
  hotkeyInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();

  assert.equal(spellInput.value, "utevo res");
  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();
  assert.equal(calls.updateOptions.at(-1).manaTrainerRules[0].words, "utevo res");
  assert.equal(calls.updateOptions.at(-1).manaTrainerRules[0].hotkey, "F9");

  document.querySelector('[data-open-modal="runeMaker"]').click();
  await flush();
  assert.equal(document.querySelector("#modal-module > .modal-head").hidden, false);
  assert.equal(document.getElementById("modal-module").classList.contains("module-modal-headless"), false);
  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Rune Maker");
});

test("light module renders live detail lines and saves edited light rules", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        autoLightEnabled: true,
        autoLightRules: [
          {
            enabled: true,
            label: "",
            words: "utevo gran lux",
            hotkey: "",
            minManaPercent: 40,
            cooldownMs: 4500,
            requireNoLight: false,
            requireNoTargets: true,
            requireStationary: true,
          },
        ],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  assert.match(document.getElementById("summary-light-detail").textContent, /utevo gran lux/i);
  assert.match(document.getElementById("summary-light-detail").textContent, /light ok/i);
  assert.match(document.getElementById("summary-light-detail").textContent, /no target/i);
  assert.match(document.getElementById("summary-light-detail").textContent, /idle only/i);

  document.querySelector('[data-open-modal="autoLight"]').click();
  await flush();

  const card = document.querySelector("#module-rule-list .module-rule-card");
  assert.equal(document.querySelector("#modal-module > .modal-head").hidden, true);
  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On - 1 active - 1 total");
  assert.equal(card.querySelector(".module-rule-head"), null);
  assert.equal(card.querySelector(".module-rule-summary"), null);
  assert.equal(card.querySelector(".module-rule-section-title"), null);
  assert.ok(document.querySelector("#module-rule-list > .module-rule-inline-toolbar [data-add-module-rule='autoLight']"));

  const wordsInput = card.querySelector('[data-module-key="autoLight"][data-rule-index="0"][data-rule-field="words"]');
  const hotkeyInput = card.querySelector('[data-module-key="autoLight"][data-rule-index="0"][data-rule-field="hotkey"]');
  const manaInput = card.querySelector('[data-module-key="autoLight"][data-rule-index="0"][data-rule-field="minManaPercent"]');
  const darkToggle = card.querySelector('[data-module-key="autoLight"][data-rule-index="0"][data-rule-field="requireNoLight"]');
  const targetToggle = card.querySelector('[data-module-key="autoLight"][data-rule-index="0"][data-rule-field="requireNoTargets"]');
  const movementToggle = card.querySelector('[data-module-key="autoLight"][data-rule-index="0"][data-rule-field="requireStationary"]');

  wordsInput.value = "utevo lux";
  wordsInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  hotkeyInput.value = "F11";
  hotkeyInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  manaInput.value = "25";
  manaInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  darkToggle.checked = true;
  darkToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  targetToggle.checked = false;
  targetToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  movementToggle.checked = false;
  movementToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();

  assert.equal(wordsInput.value, "utevo lux");
  assert.equal(targetToggle.checked, false);

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.autoLightEnabled, true);
  assert.equal(payload.autoLightRules[0].words, "utevo lux");
  assert.equal(payload.autoLightRules[0].hotkey, "F11");
  assert.equal(payload.autoLightRules[0].minManaPercent, 25);
  assert.equal(payload.autoLightRules[0].requireNoLight, true);
  assert.equal(payload.autoLightRules[0].requireNoTargets, false);
  assert.equal(payload.autoLightRules[0].requireStationary, false);
  assert.equal(currentState().options.autoLightRules[0].words, "utevo lux");
  assert.equal(currentState().options.autoLightRules[0].hotkey, "F11");
  assert.equal(currentState().options.autoLightRules[0].minManaPercent, 25);
  assert.equal(currentState().options.autoLightRules[0].requireNoLight, true);
  assert.equal(currentState().options.autoLightRules[0].requireNoTargets, false);
  assert.equal(currentState().options.autoLightRules[0].requireStationary, false);
  assert.match(document.getElementById("summary-light-detail").textContent, /utevo lux/i);
  assert.match(document.getElementById("summary-light-detail").textContent, /dark only/i);
  assert.doesNotMatch(document.getElementById("summary-light-detail").textContent, /no target/i);
  assert.doesNotMatch(document.getElementById("summary-light-detail").textContent, /idle only/i);
});

test("haste module renders a compact settings modal and saves mana-fluid options", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        hasteEnabled: true,
        hasteWords: "utani hur",
        hasteHotkey: "",
        hasteMinMana: 60,
        hasteMinManaPercent: 0,
        hasteCooldownMs: 1500,
        hasteManaFluidEnabled: true,
        hasteManaFluidName: "Mana Fluid",
        hasteManaFluidHotkey: "",
        hasteManaFluidCooldownMs: 900,
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  assert.equal(document.getElementById("summary-haste").textContent.trim(), "utani hur");
  assert.match(document.getElementById("summary-haste-detail").textContent, /utani hur/i);
  assert.match(document.getElementById("summary-haste-detail").textContent, /drink Mana Fluid/i);

  document.querySelector('[data-open-modal="haste"]').click();
  await flush();

  const modal = document.getElementById("modal-module");
  assert.equal(modal.classList.contains("module-modal-compact"), true);
  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Haste");

  const spellSelect = document.querySelector('[data-module-key="haste"][data-module-option-field="hasteWords"]');
  const hotkeyInput = document.querySelector('[data-module-key="haste"][data-module-option-field="hasteHotkey"]');
  const manaInput = document.querySelector('[data-module-key="haste"][data-module-option-field="hasteMinMana"]');
  const fluidSelect = document.querySelector('[data-module-key="haste"][data-module-option-field="hasteManaFluidName"]');
  const fluidHotkeyInput = document.querySelector('[data-module-key="haste"][data-module-option-field="hasteManaFluidHotkey"]');

  spellSelect.value = "utani gran hur";
  spellSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  hotkeyInput.value = "F8";
  hotkeyInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  manaInput.value = "100";
  manaInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  fluidSelect.value = "Mana Potion";
  fluidSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  fluidHotkeyInput.value = "F9";
  fluidHotkeyInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.hasteEnabled, true);
  assert.equal(payload.hasteWords, "utani gran hur");
  assert.equal(payload.hasteHotkey, "F8");
  assert.equal(payload.hasteMinMana, 100);
  assert.equal(payload.hasteManaFluidName, "Mana Potion");
  assert.equal(payload.hasteManaFluidHotkey, "F9");
  assert.equal(currentState().options.hasteWords, "utani gran hur");
});

test("gold transform renders live detail lines and saves edited coin rules", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        autoConvertEnabled: true,
        autoConvertRules: [
          {
            enabled: true,
            label: "",
            cooldownMs: 7000,
            requireNoTargets: true,
            requireStationary: false,
          },
        ],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  assert.match(document.getElementById("summary-convert-detail").textContent, /7000 ms/i);
  assert.match(document.getElementById("summary-convert-detail").textContent, /no target/i);
  assert.match(document.getElementById("summary-convert-detail").textContent, /move ok/i);

  document.querySelector('[data-open-modal="autoConvert"]').click();
  await flush();

  const card = document.querySelector("#module-rule-list .module-rule-card");
  assert.equal(document.querySelector("#modal-module > .modal-head").hidden, true);
  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On - 1 active - 1 total");
  assert.equal(card.querySelector(".module-rule-head"), null);
  assert.equal(card.querySelector(".module-rule-summary"), null);
  assert.equal(card.querySelector(".module-rule-section-title"), null);
  assert.ok(document.querySelector("#module-rule-list > .module-rule-inline-toolbar [data-add-module-rule='autoConvert']"));

  const cooldownInput = card.querySelector('[data-module-key="autoConvert"][data-rule-index="0"][data-rule-field="cooldownMs"]');
  const targetToggle = card.querySelector('[data-module-key="autoConvert"][data-rule-index="0"][data-rule-field="requireNoTargets"]');
  const movementToggle = card.querySelector('[data-module-key="autoConvert"][data-rule-index="0"][data-rule-field="requireStationary"]');

  cooldownInput.value = "2500";
  cooldownInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  targetToggle.checked = false;
  targetToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  movementToggle.checked = true;
  movementToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();

  assert.equal(cooldownInput.value, "2500");
  assert.equal(targetToggle.checked, false);
  assert.equal(movementToggle.checked, true);

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.autoConvertEnabled, true);
  assert.equal(payload.autoConvertRules[0].cooldownMs, 2500);
  assert.equal(payload.autoConvertRules[0].requireNoTargets, false);
  assert.equal(payload.autoConvertRules[0].requireStationary, true);
  assert.equal(currentState().options.autoConvertRules[0].cooldownMs, 2500);
  assert.equal(currentState().options.autoConvertRules[0].requireNoTargets, false);
  assert.equal(currentState().options.autoConvertRules[0].requireStationary, true);
  assert.match(document.getElementById("summary-convert-detail").textContent, /2500 ms/i);
  assert.match(document.getElementById("summary-convert-detail").textContent, /target ok/i);
  assert.match(document.getElementById("summary-convert-detail").textContent, /idle only/i);
});

test("rune maker opens its dedicated workspace and focuses the first rune spell field", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        runeMakerEnabled: true,
        runeMakerRules: [
          {
            enabled: true,
            label: "",
            words: "adori gran",
            hotkey: "",
            minHealthPercent: 80,
            minManaPercent: 60,
            maxManaPercent: 70,
            cooldownMs: 1800,
            requireNoTargets: false,
            requireStationary: true,
          },
        ],
      },
    }),
  });
  const { document } = desk;

  document.querySelector('[data-open-modal="runeMaker"]').click();
  await flush();

  assert.equal(document.getElementById("rune-maker-panel").hidden, false);
  assert.equal(document.querySelector('[data-module-panel="shared"]').hidden, true);
  assert.equal(document.activeElement?.dataset.moduleKey, "runeMaker");
  assert.equal(document.activeElement?.dataset.ruleField, "words");
  assert.ok(document.querySelector('[data-module-key="runeMaker"][data-rule-index="0"][data-rule-field="hotkey"]'));
  assert.match(document.getElementById("rune-maker-live-summary").textContent, /live right now/i);
  assert.equal(document.getElementById("rune-maker-rule-meta").textContent.trim(), "1 total / 1 active");
});

test("rune maker quick windows clone the latest rule and relax combat gates", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        runeMakerEnabled: true,
        runeMakerRules: [
          {
            enabled: true,
            label: "",
            words: "adori vita vis",
            hotkey: "",
            minHealthPercent: 92,
            minManaPercent: 88,
            maxManaPercent: 100,
            cooldownMs: 1800,
            requireNoTargets: true,
            requireStationary: true,
          },
        ],
      },
    }),
  });
  const { document, calls } = desk;

  document.querySelector('[data-open-modal="runeMaker"]').click();
  await flush();
  document.querySelector('[data-add-rune-template="combat"]').click();
  await flush();

  const wordsInput = document.querySelector('[data-module-key="runeMaker"][data-rule-index="1"][data-rule-field="words"]');
  const hotkeyInput = document.querySelector('[data-module-key="runeMaker"][data-rule-index="1"][data-rule-field="hotkey"]');
  const noTargetsToggle = document.querySelector('[data-module-key="runeMaker"][data-rule-index="1"][data-rule-field="requireNoTargets"]');
  const stationaryToggle = document.querySelector('[data-module-key="runeMaker"][data-rule-index="1"][data-rule-field="requireStationary"]');

  assert.equal(document.querySelectorAll('#rune-maker-rule-list .module-rule-card').length, 2);
  assert.equal(wordsInput.value, "adori vita vis");
  assert.equal(noTargetsToggle.checked, false);
  assert.equal(stationaryToggle.checked, false);
  assert.equal(document.activeElement, wordsInput);
  hotkeyInput.value = "F9";

  document.querySelector('#modal-module [data-save-modules]').click();
  await flush();
  assert.equal(calls.updateOptions.at(-1).runeMakerRules.length, 2);
  assert.equal(calls.updateOptions.at(-1).runeMakerRules[1].hotkey, "F9");
  assert.equal(calls.updateOptions.at(-1).runeMakerRules[1].requireNoTargets, false);
  assert.equal(calls.updateOptions.at(-1).runeMakerRules[1].requireStationary, false);
});

test("looting modal saves keep, skip, and container routing settings", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        lootingEnabled: true,
        lootWhitelist: ["gold", "potions"],
        lootBlacklist: ["worm"],
        lootPreferredContainers: ["Backpack", "Blue Backpack"],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="looting"]').click();
  await flush();

  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On - settings only");
  assert.equal(document.getElementById("add-module-rule").hidden, true);
  assert.equal(document.getElementById("module-rule-list").hidden, true);
  assert.match(document.getElementById("module-current-line").textContent, /keep list only/i);
  assert.ok(document.querySelector(".looting-shell"));
  assert.match(document.querySelector('[data-looting-summary="mode-label"]').textContent, /keep list only/i);

  const keepInput = document.querySelector('[data-module-key="looting"][data-module-option-field="lootWhitelist"]');
  const skipInput = document.querySelector('[data-module-key="looting"][data-module-option-field="lootBlacklist"]');
  const preferredInput = document.querySelector('[data-module-key="looting"][data-module-option-field="lootPreferredContainers"]');

  document.querySelector('[data-looting-field="lootWhitelist"][data-looting-add-token="runes"]').click();
  await flush();
  assert.equal(keepInput.value, "gold\npotions\nrunes");

  document.querySelector('[data-looting-field="lootWhitelist"][data-looting-remove-token="potions"]').click();
  await flush();
  assert.equal(keepInput.value, "gold\nrunes");
  assert.equal(document.querySelector('[data-looting-chip-strip="lootWhitelist"]').textContent.includes("potions"), false);

  skipInput.value = "dirty cape";
  skipInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  preferredInput.value = "Green Backpack";
  preferredInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.lootingEnabled, true);
  assert.equal(payload.lootWhitelist, "gold\nrunes");
  assert.equal(payload.lootBlacklist, "dirty cape");
  assert.equal(payload.lootPreferredContainers, "Green Backpack");
  assert.equal(currentState().options.lootingEnabled, true);
  assert.deepEqual(currentState().options.lootWhitelist, ["gold", "runes"]);
  assert.deepEqual(currentState().options.lootBlacklist, ["dirty cape"]);
  assert.deepEqual(currentState().options.lootPreferredContainers, ["Green Backpack"]);
});

test("looting modal learns recent drops and open corpse items as clickable keep chips", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        lootingEnabled: true,
        lootWhitelist: [],
        lootBlacklist: [],
        lootPreferredContainers: ["Backpack"],
      },
      snapshot: {
        serverMessages: [
          { key: "loot-1", text: "Loot of Orc: 3 gold coins, a health potion.", speaker: "server", channelName: "server-message", timestamp: 1 },
        ],
        inventory: {
          containers: [
            {
              name: "Backpack",
              slots: [],
            },
            {
              name: "Dead Orc",
              slots: [
                { slotIndex: 0, item: { name: "Royal Spear", count: 12 } },
              ],
            },
          ],
        },
      },
    }),
  });
  const { document, calls, currentState } = desk;

  document.querySelector('[data-open-modal="looting"]').click();
  await flush();

  const learnedStrip = document.querySelector('[data-looting-chip-strip="learnedDrops"]');
  assert.ok(learnedStrip);
  assert.match(learnedStrip.textContent, /Royal Spear/);
  assert.match(learnedStrip.textContent, /Health Potion/);
  assert.match(learnedStrip.textContent, /Gold Coin/);

  document.querySelector('[data-looting-chip-strip="learnedDrops"] [data-looting-add-token="Royal Spear"]').click();
  await flush();

  const keepInput = document.querySelector('[data-module-key="looting"][data-module-option-field="lootWhitelist"]');
  assert.equal(keepInput.value, "Royal Spear");

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  assert.equal(calls.updateOptions.at(-1).lootWhitelist, "Royal Spear");
  assert.deepEqual(currentState().options.lootWhitelist, ["Royal Spear"]);
});

test("auto eat modal sorts live food sources into eat-first and never-eat lists", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        autoEatEnabled: true,
        autoEatFoodName: ["brown mushroom"],
        autoEatForbiddenFoodNames: ["worm"],
        autoEatCooldownMs: 55000,
        autoEatRequireNoTargets: true,
        autoEatRequireStationary: true,
      },
      snapshot: {
        hotbar: {
          slots: [
            {
              hotkey: "F1",
              itemName: "Brown Mushroom",
              category: "food",
              count: 42,
            },
          ],
        },
        inventory: {
          containers: [
            {
              name: "Backpack",
              slots: [
                { slotIndex: 0, item: { name: "Seasoned Dragon Ham", count: 3, category: "food" } },
                { slotIndex: 1, item: { name: "Brown Mushroom", count: 18, category: "food" } },
              ],
            },
          ],
        },
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="autoEat"]').click();
  await flush();

  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Auto Eat");
  assert.match(document.getElementById("module-note").textContent, /Eat First/i);
  assert.match(document.getElementById("module-note").textContent, /Never Eat/i);
  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On");
  assert.ok(document.querySelector(".autoeat-shell"));
  assert.match(document.querySelector(".autoeat-source-bank").textContent, /Seasoned Dragon Ham/i);
  assert.match(document.querySelector(".autoeat-source-bank").textContent, /Brown Mushroom/i);

  const getFoodInput = () => document.querySelector('[data-module-key="autoEat"][data-module-option-field="autoEatFoodName"]');
  const getBlockedInput = () => document.querySelector('[data-module-key="autoEat"][data-module-option-field="autoEatForbiddenFoodNames"]');
  const getCooldownInput = () => document.querySelector('[data-module-key="autoEat"][data-module-option-field="autoEatCooldownMs"]');
  const getTargetToggle = () => document.querySelector('[data-module-key="autoEat"][data-module-option-field="autoEatRequireNoTargets"]');
  const getMovementToggle = () => document.querySelector('[data-module-key="autoEat"][data-module-option-field="autoEatRequireStationary"]');
  const foodInput = getFoodInput();
  const blockedInput = getBlockedInput();
  const cooldownInput = getCooldownInput();
  const targetToggle = getTargetToggle();
  const movementToggle = getMovementToggle();
  assert.equal(foodInput.value, "brown mushroom");
  assert.equal(blockedInput.value, "worm");
  assert.equal(cooldownInput.value, "55000");
  assert.equal(targetToggle.checked, true);
  assert.equal(movementToggle.checked, true);

  document.querySelector('[data-autoeat-field="autoEatForbiddenFoodNames"][data-autoeat-add-token="Brown Mushroom"]').click();
  await flush();
  assert.equal(getFoodInput().value, "");
  assert.equal(getBlockedInput().value, "worm\nBrown Mushroom");

  document.querySelector('[data-autoeat-field="autoEatFoodName"][data-autoeat-add-token="Brown Mushroom"]').click();
  await flush();
  assert.equal(getFoodInput().value, "Brown Mushroom");
  assert.equal(getBlockedInput().value, "worm");

  document.querySelector('[data-autoeat-field="autoEatFoodName"][data-autoeat-add-token="Seasoned Dragon Ham"]').click();
  await flush();
  assert.equal(getFoodInput().value, "Brown Mushroom\nSeasoned Dragon Ham");

  getCooldownInput().value = "45000";
  getCooldownInput().dispatchEvent(new window.Event("input", { bubbles: true }));
  getTargetToggle().checked = false;
  getTargetToggle().dispatchEvent(new window.Event("change", { bubbles: true }));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.autoEatEnabled, true);
  assert.deepEqual(payload.autoEatFoodName, ["Brown Mushroom", "Seasoned Dragon Ham"]);
  assert.deepEqual(payload.autoEatForbiddenFoodNames, ["worm"]);
  assert.equal(payload.autoEatCooldownMs, 45000);
  assert.equal(payload.autoEatRequireNoTargets, false);
  assert.equal(payload.autoEatRequireStationary, true);
  assert.equal(currentState().options.autoEatEnabled, true);
  assert.deepEqual(currentState().options.autoEatFoodName, ["Brown Mushroom", "Seasoned Dragon Ham"]);
  assert.deepEqual(currentState().options.autoEatForbiddenFoodNames, ["worm"]);
  assert.equal(currentState().options.autoEatCooldownMs, 45000);
  assert.equal(currentState().options.autoEatRequireNoTargets, false);
  assert.equal(currentState().options.autoEatRequireStationary, true);
});

test("ammo modal ignores quiver coins and only counts real carried ammo", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        vocation: "paladin",
        ammoEnabled: true,
        ammoPreferredNames: ["Arrow"],
        ammoMinimumCount: 50,
        ammoWarningCount: 100,
        ammoReloadAtOrBelow: 25,
      },
      snapshot: {
        inventory: {
          ammo: {
            name: "Platinum Coin",
            count: 100,
            slotLabel: "Quiver",
            item: {
              id: 3035,
              name: "Platinum Coin",
              count: 100,
              flags: { ammo: true },
            },
          },
          supplies: {
            ammo: 125,
          },
          equipment: {
            slots: [
              {
                index: 9,
                label: "Quiver",
                item: {
                  id: 3035,
                  name: "Platinum Coin",
                  count: 100,
                  flags: { ammo: true },
                },
              },
            ],
          },
          containers: [
            {
              name: "Blue Backpack",
              slots: [
                {
                  label: "Slot 1",
                  item: {
                    id: 3447,
                    name: "Arrow",
                    count: 25,
                    flags: { ammo: true },
                  },
                },
                {
                  label: "Slot 2",
                  item: {
                    id: 3031,
                    name: "Gold Coin",
                    count: 19,
                    flags: { ammo: true },
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  });
  const { document } = desk;

  assert.equal(document.getElementById("summary-ammo").textContent.trim(), "25 carried");
  assert.match(document.getElementById("summary-ammo-detail").textContent, /Arrow \/ Quiver \/ reload <= 25 \/ restock 100/);

  document.querySelector('[data-open-modal="ammo"]').click();
  await flush();

  assert.match(document.querySelector(".autoeat-overview-title")?.textContent || "", /Ammo waiting in bags/);
  assert.match(document.querySelector(".autoeat-overview-detail")?.textContent || "", /No ammo equipped\. Total carried: 25\./);
  assert.match(document.querySelector(".autoeat-source-grid")?.textContent || "", /Arrow/);
  assert.doesNotMatch(document.querySelector(".autoeat-source-grid")?.textContent || "", /Platinum Coin/);
  assert.doesNotMatch(document.querySelector(".autoeat-source-grid")?.textContent || "", /Gold Coin/);
});

test("ammo modal leaves quiver value-slot coins alone while ammo is disabled", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        vocation: "paladin",
        ammoEnabled: false,
      },
      snapshot: {
        inventory: {
          ammo: {
            name: "Platinum Coin",
            count: 100,
            slotLabel: "Quiver",
            item: {
              id: 3035,
              name: "Platinum Coin",
              count: 100,
              flags: { ammo: true },
            },
          },
          equipment: {
            slots: [
              {
                index: 9,
                label: "Quiver",
                item: {
                  id: 3035,
                  name: "Platinum Coin",
                  count: 100,
                  flags: { ammo: true },
                },
              },
            ],
          },
        },
      },
    }),
  });
  const { document } = desk;

  assert.notEqual(document.getElementById("summary-ammo").textContent.trim(), "Off");

  document.querySelector('[data-open-modal="ammo"]').click();
  await flush();

  assert.match(document.querySelector(".autoeat-overview-title")?.textContent || "", /Ammo paused/);
  assert.match(document.querySelector(".autoeat-overview-detail")?.textContent || "", /Runtime ammo state is clear/i);
  assert.doesNotMatch(document.querySelector(".autoeat-source-grid")?.textContent || "", /Platinum Coin/);
});

test("ring amulet modal saves both replacement names, repeat margins, and safety gates", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        ringAutoReplaceEnabled: true,
        ringAutoReplaceItemName: "stealth ring",
        ringAutoReplaceCooldownMs: 1000,
        ringAutoReplaceRequireNoTargets: false,
        ringAutoReplaceRequireStationary: false,
        amuletAutoReplaceEnabled: true,
        amuletAutoReplaceItemName: "bronze amulet",
        amuletAutoReplaceCooldownMs: 1200,
        amuletAutoReplaceRequireNoTargets: false,
        amuletAutoReplaceRequireStationary: false,
      },
      snapshot: {
        inventory: {
          containers: [
            {
              name: "Backpack",
              slots: [
                { slotIndex: 0, item: { name: "energy ring", slotType: "ring" } },
                { slotIndex: 1, item: { name: "life ring", slotType: "ring" } },
                { slotIndex: 2, item: { name: "dragon necklace", slotType: "necklace" } },
              ],
            },
          ],
        },
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="ringAutoReplace"]').click();
  await flush();

  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Ring Amulet");
  assert.match(document.getElementById("module-current-line").textContent, /stealth ring/i);
  assert.match(document.getElementById("module-current-line").textContent, /bronze amulet/i);
  assert.ok(document.querySelector('[data-equipment-replace-choice-module="ringAutoReplace"][data-equipment-replace-value="life ring"]'));
  assert.ok(document.querySelector('[data-equipment-replace-choice-module="amuletAutoReplace"][data-equipment-replace-value="dragon necklace"]'));
  const ringAnyButton = document.querySelector('[data-equipment-replace-choice-module="ringAutoReplace"][data-equipment-replace-value=""]');
  assert.ok(ringAnyButton);
  document.querySelector('[data-equipment-replace-choice-module="ringAutoReplace"][data-equipment-replace-value="energy ring"]').click();
  document.querySelector('[data-equipment-replace-choice-module="amuletAutoReplace"][data-equipment-replace-value="dragon necklace"]').click();
  await flush();
  const ringCooldownInput = document.querySelector('[data-module-key="ringAutoReplace"][data-module-option-field="ringAutoReplaceCooldownMs"]');
  const ringTargetToggle = document.querySelector('[data-module-key="ringAutoReplace"][data-module-option-field="ringAutoReplaceRequireNoTargets"]');
  const amuletMovementToggle = document.querySelector('[data-module-key="amuletAutoReplace"][data-module-option-field="amuletAutoReplaceRequireStationary"]');
  ringCooldownInput.value = "1500";
  ringCooldownInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  ringTargetToggle.checked = true;
  ringTargetToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  amuletMovementToggle.checked = true;
  amuletMovementToggle.dispatchEvent(new window.Event("change", { bubbles: true }));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.ringAutoReplaceEnabled, true);
  assert.equal(payload.ringAutoReplaceItemName, "energy ring");
  assert.equal(payload.ringAutoReplaceCooldownMs, 1500);
  assert.equal(payload.ringAutoReplaceRequireNoTargets, true);
  assert.equal(payload.amuletAutoReplaceEnabled, true);
  assert.equal(payload.amuletAutoReplaceItemName, "dragon necklace");
  assert.equal(payload.amuletAutoReplaceRequireStationary, true);
  assert.equal(currentState().options.ringAutoReplaceItemName, "energy ring");
  assert.equal(currentState().options.amuletAutoReplaceItemName, "dragon necklace");
});

test("trainer modal saves trainer-owned partner, trainer mana, reconnect, and escape settings", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        trainerEnabled: true,
        trainerReconnectEnabled: true,
        antiIdleIntervalMs: 60000,
        autoEatFoodName: "brown mushroom",
        autoEatCooldownMs: 55000,
        trainerManaTrainerEnabled: true,
        trainerManaTrainerWords: "exura",
        trainerManaTrainerHotkey: "",
        trainerManaTrainerManaPercent: 95,
        trainerManaTrainerMinHealthPercent: 40,
        trainerManaTrainerRules: [
          {
            enabled: true,
            words: "exura",
            hotkey: "",
            minHealthPercent: 40,
            minManaPercent: 95,
            maxManaPercent: 100,
            cooldownMs: 1400,
            requireNoTargets: false,
            requireStationary: false,
          },
        ],
        healerEmergencyHealthPercent: 30,
        deathHealHealthPercent: 20,
        trainerPartnerDistance: 2,
        trainerEscapeHealthPercent: 20,
        trainerEscapeDistance: 4,
        trainerEscapeCooldownMs: 600,
        partyFollowMembers: ["Knight Alpha", "Guide Gamma"],
        partyFollowManualPlayers: ["Guide Gamma"],
        partyFollowDistance: 3,
        partyFollowCombatMode: "follow-only",
      },
      snapshot: {
        visiblePlayerNames: ["Guide Gamma"],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="trainer"]').click();
  await flush();

  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Trainer");
  assert.match(document.getElementById("module-note").textContent, /separate from Team Hunt/i);
  assert.ok(document.querySelector(".trainer-shell"));
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerReconnectEnabled"]'));
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerAutoPartyEnabled"]'));
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerEnabled"]'));
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerWords"]'));
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerHotkey"]'));
  assert.ok(document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerEscapeHealthPercent"]'));
  assert.equal(document.querySelector('[data-module-key="trainer"][data-module-option-field="antiIdleIntervalMs"]'), null);
  assert.equal(document.querySelector('[data-module-key="trainer"][data-module-option-field="autoEatFoodName"]'), null);
  assert.equal(document.querySelector('[data-module-key="trainer"][data-module-option-field="autoEatCooldownMs"]'), null);
  assert.equal(document.querySelector('[data-module-key="trainer"][data-module-option-field="healerEmergencyHealthPercent"]'), null);
  assert.equal(document.querySelector('[data-module-key="trainer"][data-module-option-field="deathHealHealthPercent"]'), null);
  assert.match(document.querySelector(".trainer-inherited-services")?.textContent || "", /Anti Idle/);
  assert.match(document.querySelector(".trainer-inherited-services")?.textContent || "", /Auto Eat/);
  assert.match(document.querySelector(".trainer-inherited-services")?.textContent || "", /Open Owner/);
  assert.equal(document.querySelector('[data-module-key="partyFollow"]'), null);
  assert.equal(document.querySelector('[data-follow-train-source-name]'), null);
  assert.equal(document.querySelector('[data-trainer-partner-name="Scout Beta"]') !== null, true);
  assert.equal(document.querySelector('[data-trainer-partner-name="Guide Gamma"]') !== null, true);

  const partnerInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerPartnerName"]');
  const trainerReconnectToggle = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerReconnectEnabled"]');
  const trainerAutoPartyToggle = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerAutoPartyEnabled"]');
  const partnerDistanceInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerPartnerDistance"]');
  const trainerManaToggle = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerEnabled"]');
  const trainerManaWordsInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerWords"]');
  const trainerManaHotkeyInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerHotkey"]');
  assert.equal(partnerInput.value, "Guide Gamma");
  assert.equal(trainerReconnectToggle.checked, true);
  assert.equal(trainerAutoPartyToggle.checked, true);
  assert.equal(trainerManaToggle.checked, true);
  assert.equal(trainerManaWordsInput.value, "exura");

  trainerManaWordsInput.value = "utura gran";
  trainerManaWordsInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  trainerManaHotkeyInput.value = "F8";
  trainerManaHotkeyInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const trainerManaPercentInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerManaPercent"]');
  trainerManaPercentInput.value = "92";
  trainerManaPercentInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const trainerManaHealthInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerManaTrainerMinHealthPercent"]');
  trainerManaHealthInput.value = "55";
  trainerManaHealthInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  partnerDistanceInput.value = "3";
  partnerDistanceInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const escapeInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerEscapeHealthPercent"]');
  escapeInput.value = "16";
  escapeInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const escapeDistanceInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerEscapeDistance"]');
  escapeDistanceInput.value = "5";
  escapeDistanceInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const escapeCooldownInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerEscapeCooldownMs"]');
  escapeCooldownInput.value = "700";
  escapeCooldownInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  trainerReconnectToggle.checked = false;
  trainerReconnectToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  trainerAutoPartyToggle.checked = false;
  trainerAutoPartyToggle.dispatchEvent(new window.Event("change", { bubbles: true }));

  document.querySelector('[data-trainer-partner-name="Scout Beta"]').click();
  await flush();
  assert.equal(
    document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerPartnerName"]').value,
    "Scout Beta",
  );

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.trainerEnabled, true);
  assert.equal(payload.trainerReconnectEnabled, false);
  assert.equal(payload.trainerAutoPartyEnabled, false);
  assert.equal(payload.trainerPartnerName, "Scout Beta");
  assert.equal(payload.trainerPartnerDistance, 3);
  assert.equal(payload.antiIdleIntervalMs, 60000);
  assert.deepEqual(payload.autoEatFoodName, ["brown mushroom"]);
  assert.equal(payload.autoEatCooldownMs, 55000);
  assert.equal(payload.trainerManaTrainerEnabled, true);
  assert.equal(payload.trainerManaTrainerWords, "utura gran");
  assert.equal(payload.trainerManaTrainerHotkey, "F8");
  assert.equal(payload.trainerManaTrainerManaPercent, 92);
  assert.equal(payload.trainerManaTrainerMinHealthPercent, 55);
  assert.equal(payload.trainerManaTrainerRules[0]?.words, "utura gran");
  assert.equal(payload.trainerManaTrainerRules[0]?.hotkey, "F8");
  assert.equal(payload.trainerManaTrainerRules[0]?.minManaPercent, 92);
  assert.equal(payload.trainerManaTrainerRules[0]?.minHealthPercent, 55);
  assert.equal(payload.healerEmergencyHealthPercent, 30);
  assert.equal(payload.deathHealHealthPercent, 20);
  assert.equal(payload.trainerEscapeHealthPercent, 16);
  assert.equal(payload.trainerEscapeDistance, 5);
  assert.equal(payload.trainerEscapeCooldownMs, 700);
  assert.equal(currentState().options.trainerEnabled, true);
  assert.equal(currentState().options.trainerReconnectEnabled, false);
  assert.equal(currentState().options.trainerAutoPartyEnabled, false);
  assert.equal(currentState().options.trainerPartnerName, "Scout Beta");
  assert.equal(currentState().options.trainerPartnerDistance, 3);
  assert.equal(currentState().options.antiIdleIntervalMs, 60000);
  assert.deepEqual(currentState().options.autoEatFoodName, ["brown mushroom"]);
  assert.equal(currentState().options.autoEatCooldownMs, 55000);
  assert.equal(currentState().options.trainerManaTrainerHotkey, "F8");
  assert.equal(currentState().options.trainerManaTrainerRules[0]?.hotkey, "F8");
  assert.equal(currentState().options.healerEmergencyHealthPercent, 30);
  assert.equal(currentState().options.deathHealHealthPercent, 20);
  assert.equal(currentState().options.trainerEscapeHealthPercent, 16);
  assert.equal(currentState().options.trainerEscapeDistance, 5);
  assert.equal(currentState().options.trainerEscapeCooldownMs, 700);
  assert.deepEqual(currentState().options.partyFollowMembers, ["Knight Alpha", "Guide Gamma"]);
  assert.equal(currentState().options.partyFollowDistance, 3);
  assert.equal(currentState().options.partyFollowCombatMode, "follow-only");

  document.querySelector('[data-open-modal="trainer"]').click();
  await flush();
  document.querySelector('[data-trainer-service-module="autoEat"]').click();
  await flush();
  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Auto Eat");
  assert.ok(document.querySelector('[data-module-key="autoEat"][data-module-option-field="autoEatFoodName"]'));
});

test("trainer modal rejects the active character as a partner and falls back to another live tab", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        trainerEnabled: true,
        trainerPartnerName: "Knight Alpha",
      },
    }),
  });
  const { document, calls, currentState } = desk;

  document.querySelector('[data-open-modal="trainer"]').click();
  await flush();

  const partnerInput = document.querySelector('[data-module-key="trainer"][data-module-option-field="trainerPartnerName"]');
  assert.equal(partnerInput.value, "Scout Beta");
  assert.equal(document.querySelector('[data-trainer-partner-name="Knight Alpha"]'), null);

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.trainerPartnerName, "Scout Beta");
  assert.equal(currentState().options.trainerPartnerName, "Scout Beta");
});

test("trainer modal launches saved trainer characters even without a live bound session", async () => {
  const desk = await createDesk({
    initialState: createState({
      instances: [],
      sessions: [],
      activeSessionId: null,
      binding: null,
      page: null,
      selectionRequired: true,
      trainerCharacters: [
        {
          profileKey: "czarnobrat",
          characterName: "Czarnobrat",
          displayName: "Czarnobrat",
          partnerName: "Zlocimir Wielkoportf",
          cavebotName: "Trainer",
          live: false,
          running: false,
          blockedByOtherDesk: false,
          hasAccount: true,
          launchReady: true,
        },
        {
          profileKey: "zlocimir-wielkoportf",
          characterName: "Zlocimir Wielkoportf",
          displayName: "Zlocimir Wielkoportf",
          partnerName: "Czarnobrat",
          cavebotName: "Trainer",
          live: false,
          running: false,
          blockedByOtherDesk: false,
          hasAccount: true,
          launchReady: true,
        },
      ],
    }),
  });
  const { document, calls } = desk;

  document.getElementById("quick-open-trainer").click();
  await flush();

  const launchButton = document.querySelector('[data-trainer-launch-profile-key="czarnobrat"]');
  assert.ok(launchButton);
  launchButton.click();
  await flush();

  assert.equal(calls.startTrainerRoster.at(-1), "czarnobrat");
});

test("trainer modal manages duo presets from the trainer panel", async () => {
  const desk = await createDesk({
    initialState: createState({
      instances: [],
      sessions: [],
      activeSessionId: null,
      binding: null,
      page: null,
      selectionRequired: true,
      accounts: [
        {
          id: "trainer-a",
          label: "Trainer A",
          loginMethod: "account-password",
          preferredCharacter: "Czarnobrat",
          characters: ["Czarnobrat"],
        },
        {
          id: "trainer-b",
          label: "Trainer B",
          loginMethod: "account-password",
          preferredCharacter: "Zlocimir Wielkoportf",
          characters: ["Zlocimir Wielkoportf"],
        },
      ],
      trainerCharacters: [
        {
          profileKey: "czarnobrat",
          characterName: "Czarnobrat",
          displayName: "Czarnobrat",
          partnerName: "Zlocimir Wielkoportf",
          cavebotName: "Trainer",
          live: false,
          running: false,
          blockedByOtherDesk: false,
          hasAccount: true,
          launchReady: true,
        },
        {
          profileKey: "zlocimir-wielkoportf",
          characterName: "Zlocimir Wielkoportf",
          displayName: "Zlocimir Wielkoportf",
          partnerName: "Czarnobrat",
          cavebotName: "Trainer",
          live: false,
          running: false,
          blockedByOtherDesk: false,
          hasAccount: true,
          launchReady: true,
        },
      ],
    }),
  });
  const { document, window, calls } = desk;
  window.confirm = () => true;

  document.getElementById("quick-open-trainer").click();
  await flush();

  const startButton = document.querySelector('[data-trainer-duo-start-profile-key="czarnobrat"]');
  assert.ok(startButton);
  startButton.click();
  await flush();
  assert.equal(calls.startTrainerRoster.at(-1), "czarnobrat");

  document.getElementById("trainer-duo-left").value = "Czarnobrat";
  document.getElementById("trainer-duo-right").value = "Zlocimir Wielkoportf";
  document.querySelector("[data-trainer-duo-create]").click();
  await flush();
  assert.deepEqual(calls.saveTrainerDuo.at(-1), {
    leftName: "Czarnobrat",
    rightName: "Zlocimir Wielkoportf",
  });

  document.querySelector('[data-trainer-duo-disband-left="Czarnobrat"]').click();
  await flush();
  assert.equal(calls.deleteTrainerDuo.at(-1).leftName, "Czarnobrat");
  assert.equal(calls.deleteTrainerDuo.at(-1).rightName, "Zlocimir Wielkoportf");
});

test("reconnect modal saves reconnect retry settings and uses the standalone toggle", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        reconnectEnabled: true,
        reconnectRetryDelayMs: 4000,
        reconnectMaxAttempts: 0,
        trainerEnabled: true,
        trainerReconnectEnabled: true,
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.getElementById("quick-open-reconnect").click();
  await flush();

  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Reconnect");
  assert.match(document.getElementById("module-note").textContent, /Trainer can also keep reconnect armed/i);
  assert.ok(document.querySelector(".reconnect-workspace"));

  const retryInput = document.querySelector('[data-module-key="reconnect"][data-module-option-field="reconnectRetryDelayMs"]');
  const maxAttemptsInput = document.querySelector('[data-module-key="reconnect"][data-module-option-field="reconnectMaxAttempts"]');
  retryInput.value = "2500";
  retryInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  maxAttemptsInput.value = "5";
  maxAttemptsInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.reconnectEnabled, true);
  assert.equal(payload.reconnectRetryDelayMs, 2500);
  assert.equal(payload.reconnectMaxAttempts, 5);
  assert.equal(currentState().options.reconnectEnabled, true);
  assert.equal(currentState().options.reconnectRetryDelayMs, 2500);
  assert.equal(currentState().options.reconnectMaxAttempts, 5);
});

test("alarms modal saves per-category proximity settings and blacklist names", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        alarmsEnabled: true,
        alarmsPlayerEnabled: true,
        alarmsPlayerRadiusSqm: 8,
        alarmsPlayerFloorRange: 0,
        alarmsStaffEnabled: true,
        alarmsStaffRadiusSqm: 9,
        alarmsStaffFloorRange: 1,
        alarmsBlacklistEnabled: true,
        alarmsBlacklistNames: ["God Minibia"],
        alarmsBlacklistRadiusSqm: 9,
        alarmsBlacklistFloorRange: 1,
      },
      snapshot: {
        playerPosition: { x: 100, y: 200, z: 7 },
        visiblePlayers: [
          {
            id: 17,
            name: "Kolakao",
            position: { x: 104, y: 200, z: 7 },
          },
          {
            id: 18,
            name: "God Minibia",
            position: { x: 101, y: 201, z: 8 },
          },
        ],
        visiblePlayerNames: ["Kolakao", "God Minibia"],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="alarms"]').click();
  await flush();

  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Alarms");
  assert.ok(document.querySelector(".alarms-shell"));
  assert.match(document.querySelector(".alarms-live-strip").textContent, /Kolakao/);
  assert.match(document.querySelector(".alarms-live-strip").textContent, /God Minibia/);
  assert.equal(
    document.querySelector('[data-module-key="alarms"][data-module-option-field="alarmsBlacklistNames"]').value,
    "God Minibia",
  );

  document.querySelector('[data-alarms-add-blacklist="Kolakao"]').click();
  await flush();
  assert.equal(
    document.querySelector('[data-module-key="alarms"][data-module-option-field="alarmsBlacklistNames"]').value,
    "God Minibia\nKolakao",
  );

  const playerRadiusInput = document.querySelector('[data-module-key="alarms"][data-module-option-field="alarmsPlayerRadiusSqm"]');
  const playerFloorInput = document.querySelector('[data-module-key="alarms"][data-module-option-field="alarmsPlayerFloorRange"]');
  const staffToggle = document.querySelector('[data-module-key="alarms"][data-module-option-field="alarmsStaffEnabled"]');
  const blacklistRadiusInput = document.querySelector('[data-module-key="alarms"][data-module-option-field="alarmsBlacklistRadiusSqm"]');
  playerRadiusInput.value = "6";
  playerRadiusInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  playerFloorInput.value = "1";
  playerFloorInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  staffToggle.checked = false;
  staffToggle.dispatchEvent(new window.Event("change", { bubbles: true }));
  blacklistRadiusInput.value = "11";
  blacklistRadiusInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.alarmsEnabled, true);
  assert.equal(payload.alarmsPlayerEnabled, true);
  assert.equal(payload.alarmsPlayerRadiusSqm, 6);
  assert.equal(payload.alarmsPlayerFloorRange, 1);
  assert.equal(payload.alarmsStaffEnabled, false);
  assert.equal(payload.alarmsBlacklistRadiusSqm, 11);
  assert.equal(payload.alarmsBlacklistNames, "God Minibia\nKolakao");
  assert.equal(currentState().options.alarmsPlayerRadiusSqm, 6);
  assert.equal(currentState().options.alarmsPlayerFloorRange, 1);
  assert.equal(currentState().options.alarmsStaffEnabled, false);
  assert.equal(currentState().options.alarmsBlacklistRadiusSqm, 11);
  assert.deepEqual(currentState().options.alarmsBlacklistNames, ["God Minibia", "Kolakao"]);
});

test("anti-idle saves live keepalive timing and Team Hunt saves chain members from separated player sources", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        antiIdleEnabled: true,
        antiIdleIntervalMs: 60000,
        teamEnabled: true,
        partyFollowEnabled: true,
        partyFollowMembers: ["Knight Alpha"],
        partyFollowManualPlayers: [],
        partyFollowMemberChaseModes: {},
        partyFollowDistance: 2,
        partyFollowCombatMode: "follow-and-fight",
      },
      snapshot: {
        visiblePlayerNames: ["Guide Gamma"],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="antiIdle"]').click();
  await flush();

  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On");
  assert.ok(document.querySelector(".anti-idle-status-band"));
  assert.equal(document.querySelectorAll("[data-anti-idle-preset-ms]").length, 4);
  const antiIdleInput = document.querySelector('[data-module-key="antiIdle"][data-module-option-field="antiIdleIntervalMs"]');
  assert.ok(antiIdleInput);
  document.querySelector('[data-anti-idle-preset-ms="90000"]').click();
  await flush();
  assert.equal(antiIdleInput.value, "90000");

  document.querySelector("[data-test-anti-idle]").click();
  await flush();
  assert.equal(calls.testAntiIdle.at(-1).antiIdleEnabled, true);
  assert.equal(calls.testAntiIdle.at(-1).antiIdleIntervalMs, 90000);

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  let payload = calls.updateOptions.at(-1);
  assert.equal(payload.antiIdleEnabled, true);
  assert.equal(payload.antiIdleIntervalMs, 90000);
  assert.equal(currentState().options.antiIdleEnabled, true);
  assert.equal(currentState().options.antiIdleIntervalMs, 90000);

  document.querySelector('[data-open-modal="team"]').click();
  await flush();

  assert.equal(document.getElementById("module-modal-title").textContent.trim(), "Team Hunt");
  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On");
  assert.ok(document.querySelector(".follow-train-layout"));
  assert.equal(document.querySelector('[data-follow-train-source-name="Scout Beta"]') !== null, true);
  assert.equal(document.querySelector('[data-follow-train-source-name="Guide Gamma"]') !== null, true);
  assert.equal(document.querySelector('[data-follow-train-source-name="Rotworm"]'), null);

  const manualInput = document.querySelector('[data-module-key="partyFollow"][data-module-option-field="partyFollowManualPlayers"]');
  manualInput.value = "Manual Delta";
  manualInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  manualInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();

  document.querySelector('[data-follow-train-source-name="Guide Gamma"]').click();
  document.querySelector('[data-follow-train-source-name="Manual Delta"]').click();
  document.querySelector('[data-follow-train-move="2"][data-follow-train-delta="-1"]').click();
  const distanceInput = document.querySelector('[data-module-key="partyFollow"][data-module-option-field="partyFollowDistance"]');
  distanceInput.value = "3";
  distanceInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const followModeInput = document.querySelector('[data-module-key="partyFollow"][data-module-option-field="partyFollowCombatMode"]');
  followModeInput.value = "follow-only";
  followModeInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  const guideRoleInput = document.querySelector('[data-follow-train-role-name="Guide Gamma"]');
  assert.ok(guideRoleInput);
  guideRoleInput.value = "sio-healer";
  guideRoleInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  const leaderChaseInput = document.querySelector('[data-follow-train-chase-mode-name="Knight Alpha"]');
  assert.ok(leaderChaseInput);
  leaderChaseInput.value = "stand";
  leaderChaseInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  const guideChaseInput = document.querySelector('[data-follow-train-chase-mode-name="Guide Gamma"]');
  assert.ok(guideChaseInput);
  guideChaseInput.value = "aggressive";
  guideChaseInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  assert.match(document.querySelector("[data-follow-train-chain-list]").textContent, /Sio Healer/);
  assert.match(document.querySelector("[data-follow-train-chain-list]").textContent, /Knight Alpha[\s\S]*Stance Stand/);
  assert.match(document.querySelector("[data-follow-train-chain-list]").textContent, /Stance Aggressive/);

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  payload = calls.updateOptions.at(-1);
  assert.equal(payload.teamEnabled, true);
  assert.equal(payload.partyFollowEnabled, true);
  assert.equal(payload.partyFollowMembers, "Knight Alpha\nGuide Gamma\nScout Beta\nManual Delta");
  assert.equal(payload.partyFollowManualPlayers, "Manual Delta");
  assert.deepEqual(payload.partyFollowMemberRoles, {
    "Guide Gamma": "sio-healer",
  });
  assert.deepEqual(payload.partyFollowMemberChaseModes, {
    "Knight Alpha": "stand",
    "Guide Gamma": "aggressive",
  });
  assert.equal(payload.partyFollowDistance, 3);
  assert.equal(payload.partyFollowCombatMode, "follow-only");
  assert.equal(currentState().options.partyFollowEnabled, true);
  assert.deepEqual(currentState().options.partyFollowMembers, ["Knight Alpha", "Guide Gamma", "Scout Beta", "Manual Delta"]);
  assert.deepEqual(currentState().options.partyFollowManualPlayers, ["Manual Delta"]);
  assert.deepEqual(currentState().options.partyFollowMemberRoles, {
    "Guide Gamma": "sio-healer",
  });
  assert.deepEqual(currentState().options.partyFollowMemberChaseModes, {
    "Knight Alpha": "stand",
    "Guide Gamma": "aggressive",
  });
  assert.equal(currentState().options.partyFollowDistance, 3);
  assert.equal(currentState().options.partyFollowCombatMode, "follow-only");
});

test("Team Hunt surfaces shared HP supply and loot summaries", async () => {
  const initialState = createState({
    options: {
      partyFollowEnabled: true,
      partyFollowMembers: ["Knight Alpha", "Scout Beta"],
      partyFollowDistance: 2,
    },
    snapshot: {
      playerStats: {
        health: 870,
        maxHealth: 1000,
        mana: 320,
        maxMana: 500,
        healthPercent: 87,
        manaPercent: 64,
      },
      inventory: {
        supplies: [
          { category: "potion", name: "health potion", count: 12 },
          { category: "rune", name: "sudden death rune", count: 8 },
        ],
      },
      routeTelemetry: {
        lapCount: 1,
        killCount: 2,
        lootGoldValue: 1500,
        lootLine: "1.5k",
      },
    },
  });
  const builtSessions = buildSessionsFromTopLevel(initialState);
  initialState.sessions = builtSessions.sessions.map((session) => (
    String(session.id) === "page-1"
      ? {
          ...session,
          followTrainStatus: {
            enabled: true,
            active: false,
            pilot: true,
            selfName: "Knight Alpha",
            selfIndex: 0,
            role: "attack-and-follow",
            leaderName: "",
            currentState: "DISABLED",
          },
        }
      : {
          ...session,
          running: true,
          connected: true,
          playerStats: {
            health: 660,
            maxHealth: 1000,
            mana: 210,
            maxMana: 500,
            healthPercent: 66,
            manaPercent: 42,
          },
          supplies: [
            { category: "potion", name: "health potion", count: 18 },
            { category: "ammo", name: "arrow", count: 120 },
          ],
          routeTelemetry: {
            lapCount: 0,
            killCount: 3,
            lootGoldValue: 250,
            lootLine: "250",
          },
          followTrainStatus: {
            enabled: true,
            active: true,
            pilot: false,
            selfName: "Scout Beta",
            selfIndex: 1,
            role: "attack-and-follow",
            leaderName: "Knight Alpha",
            currentState: "FOLLOWING",
            followActive: true,
          },
        }
  ));

  const desk = await createDesk({ initialState });
  const { document } = desk;

  const quickDetail = document.getElementById("summary-party-follow-detail").textContent;
  assert.match(quickDetail, /2\/2 live/);
  assert.match(quickDetail, /HP 77%/);
  assert.match(quickDetail, /supplies pots 30 \/ runes 8/);
  assert.match(quickDetail, /loot 1\.8k gp \/ 5 kills/);

  document.querySelector('[data-open-modal="team"]').click();
  await flush();

  const overviewText = document.querySelector(".follow-train-overview").textContent;
  assert.match(overviewText, /Team HP/);
  assert.match(overviewText, /Min Scout Beta 66% \/ avg 77%/);
  assert.match(overviewText, /Supplies/);
  assert.match(overviewText, /pots 30 \/ runes 8 \/ ammo 120/);
  assert.match(overviewText, /Loot/);
  assert.match(overviewText, /1\.8k gp \/ 5 kills \/ 1 lap/);
});

test("Team Hunt quick toggle owns Team Roles", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        teamEnabled: false,
        partyFollowEnabled: false,
        partyFollowMembers: [],
      },
    }),
  });
  const { document, calls, currentState } = desk;

  assert.equal(document.querySelector("#quick-open-team-hunt span").textContent.trim(), "Team Hunt");
  assert.equal(document.getElementById("quick-open-party-follow").closest(".quick-module-card").hidden, true);

  document.getElementById("quick-toggle-team-hunt").click();
  await flush();

  assert.deepEqual(calls.updateOptions.at(-1), {
    teamEnabled: true,
    partyFollowEnabled: true,
    partyFollowMembers: "Knight Alpha\nScout Beta",
  });
  assert.equal(currentState().options.teamEnabled, true);
  assert.equal(currentState().options.partyFollowEnabled, true);
  assert.deepEqual(currentState().options.partyFollowMembers, ["Knight Alpha", "Scout Beta"]);

  document.getElementById("quick-toggle-party-follow").click();
  await flush();

  assert.deepEqual(calls.updateOptions.at(-1), {
    teamEnabled: false,
    partyFollowEnabled: false,
  });
  assert.equal(currentState().options.teamEnabled, false);
  assert.equal(currentState().options.partyFollowEnabled, false);
});

test("Team Hunt auto-fills live tabs when enabled and refreshes seen players while open", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        partyFollowEnabled: false,
        partyFollowMembers: [],
        partyFollowManualPlayers: [],
        partyFollowDistance: 2,
        playerArchive: [],
        creatureLedger: {
          monsters: ["Rotworm"],
          players: [],
        },
      },
      snapshot: {
        visiblePlayerNames: [],
      },
    }),
  });
  const { document, emit, currentState, calls } = desk;

  document.getElementById("quick-toggle-team-hunt").click();
  await flush();

  assert.equal(currentState().options.teamEnabled, true);
  assert.equal(currentState().options.partyFollowEnabled, true);
  assert.deepEqual(currentState().options.partyFollowMembers, ["Knight Alpha", "Scout Beta"]);
  assert.equal(calls.updateOptions.at(-1).teamEnabled, true);
  assert.equal(calls.updateOptions.at(-1).partyFollowEnabled, true);
  assert.equal(calls.updateOptions.at(-1).partyFollowMembers, "Knight Alpha\nScout Beta");

  document.querySelector('[data-open-modal="team"]').click();
  await flush();

  assert.equal(document.querySelector("[data-follow-train-chain-list]").textContent.includes("Knight Alpha"), true);
  assert.equal(document.querySelector("[data-follow-train-chain-list]").textContent.includes("Scout Beta"), true);

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  assert.equal(calls.updateOptions.at(-1).teamEnabled, true);
  assert.equal(calls.updateOptions.at(-1).partyFollowEnabled, true);
  assert.equal(calls.updateOptions.at(-1).partyFollowMembers, "Knight Alpha\nScout Beta");
  assert.deepEqual(currentState().options.partyFollowMembers, ["Knight Alpha", "Scout Beta"]);

  document.querySelector('[data-open-modal="team"]').click();
  await flush();

  assert.equal(document.querySelector('[data-follow-train-source-name="Guide Gamma"]'), null);

  emit("target-archive", { addedPlayers: ["Guide Gamma"] }, {
    ...currentState(),
    options: {
      ...currentState().options,
      playerArchive: ["Guide Gamma"],
      creatureLedger: {
        monsters: ["Rotworm"],
        players: ["Guide Gamma"],
      },
    },
  });
  await flush();

  assert.equal(document.querySelector('[data-follow-train-source-name="Guide Gamma"]') !== null, true);

  document.querySelector("[data-follow-train-use-live]").click();
  await flush();

  assert.match(document.querySelector("[data-follow-train-chain-list]").textContent, /Knight Alpha/);
  assert.match(document.querySelector("[data-follow-train-chain-list]").textContent, /Scout Beta/);
});

test("Team Hunt auto-fill keeps separate live follow components", async () => {
  const makeSession = ({
    id,
    name,
    profileKey,
    followTargetName = "",
    visiblePlayerNames = [],
  }) => ({
    id,
    profileKey,
    pageId: id,
    title: "Minibia",
    url: `https://minibia.com/play?client=${id}`,
    characterName: name,
    displayName: name,
    label: name,
    playerPosition: { x: 100, y: 200, z: 7 },
    playerStats: {
      health: 870,
      maxHealth: 1000,
      mana: 320,
      maxMana: 500,
      healthPercent: 87,
      manaPercent: 64,
    },
    visiblePlayerNames,
    currentFollowTarget: followTargetName ? { name: followTargetName } : null,
    running: false,
    connected: true,
    ready: true,
    present: true,
    claimed: false,
    claimedBySelf: true,
    available: true,
    routeIndex: 0,
    routeComplete: false,
    overlayFocusIndex: 0,
    routeName: "dararotworms",
    page: {
      id,
      title: "Minibia",
      url: `https://minibia.com/play?client=${id}`,
    },
  });
  const desk = await createDesk({
    initialState: createState({
      activeSessionId: "page-3",
      options: {
        partyFollowEnabled: false,
        partyFollowMembers: [],
        partyFollowManualPlayers: [],
      },
      snapshot: {
        playerName: "Druid Gamma",
        visiblePlayerNames: [],
      },
      sessions: [
        makeSession({ id: "page-1", name: "Knight Alpha", profileKey: "knight-alpha" }),
        makeSession({ id: "page-2", name: "Scout Beta", profileKey: "scout-beta", followTargetName: "Knight Alpha" }),
        makeSession({ id: "page-3", name: "Druid Gamma", profileKey: "druid-gamma" }),
        makeSession({
          id: "page-4",
          name: "Mule Delta",
          profileKey: "mule-delta",
          followTargetName: "Druid Gamma",
          visiblePlayerNames: ["Guide Gamma"],
        }),
      ],
    }),
  });
  const { document, calls, currentState } = desk;

  document.getElementById("quick-toggle-party-follow").click();
  await flush();

  assert.equal(calls.updateOptions.at(-1).partyFollowEnabled, true);
  assert.equal(calls.updateOptions.at(-1).partyFollowMembers, "Druid Gamma\nMule Delta");
  assert.deepEqual(currentState().options.partyFollowMembers, ["Druid Gamma", "Mule Delta"]);

  document.querySelector('[data-open-modal="team"]').click();
  await flush();

  assert.equal(document.querySelector('[data-follow-train-source-name="Guide Gamma"]') !== null, true);
});

test("banking modal renders banking rules and saves edited bank actions", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        bankingEnabled: true,
        bankingRules: [
          {
            enabled: true,
            label: "",
            bankerNames: ["Augusto"],
            operation: "deposit-excess",
            amount: 0,
            reserveGold: 2000,
            recipient: "",
            cooldownMs: 1400,
            requireNoTargets: true,
            requireStationary: true,
            maxNpcDistance: 4,
          },
        ],
      },
    }),
  });
  const { document, window, calls, currentState } = desk;

  document.querySelector('[data-open-modal="banking"]').click();
  await flush();

  const card = document.querySelector("#module-rule-list .module-rule-card");
  assert.equal(document.querySelector("#modal-module > .modal-head").hidden, true);
  assert.equal(document.getElementById("modal-module").classList.contains("module-modal-headless"), true);
  assert.equal(document.getElementById("add-module-rule").hidden, true);
  assert.equal(document.querySelector("#module-rule-list > .module-rule-inline-toolbar [data-add-module-rule='banking']")?.textContent.trim(), "Add Rule");
  assert.equal(document.getElementById("module-state-line").textContent.trim(), "On - 1 active - 1 total");
  assert.equal(card.querySelector(".module-rule-head"), null);
  assert.equal(card.querySelector(".module-rule-name"), null);
  assert.equal(card.querySelector(".module-rule-summary"), null);
  assert.equal(card.querySelector(".module-rule-section-title"), null);
  assert.ok(card.querySelector(".module-rule-toolbar [data-delete-module-rule='banking']"));

  const bankerInput = card.querySelector('[data-module-key="banking"][data-rule-index="0"][data-rule-field="bankerNames"]');
  const operationSelect = card.querySelector('[data-module-key="banking"][data-rule-index="0"][data-rule-field="operation"]');
  const amountInput = card.querySelector('[data-module-key="banking"][data-rule-index="0"][data-rule-field="amount"]');

  bankerInput.value = "Alice, Bob";
  bankerInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  operationSelect.value = "withdraw-up-to";
  operationSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  amountInput.value = "5000";
  amountInput.dispatchEvent(new window.Event("input", { bubbles: true }));

  document.querySelector("#modal-module [data-save-modules]").click();
  await flush();

  const payload = calls.updateOptions.at(-1);
  assert.equal(payload.bankingEnabled, true);
  assert.equal(payload.bankingRules[0].bankerNames, "Alice, Bob");
  assert.equal(payload.bankingRules[0].operation, "withdraw-up-to");
  assert.equal(payload.bankingRules[0].amount, 5000);
  assert.equal(currentState().options.bankingRules[0].operation, "withdraw-up-to");
  assert.deepEqual(currentState().options.bankingRules[0].bankerNames, ["Alice", "Bob"]);
  assert.equal(currentState().options.bankingRules[0].amount, 5000);
});

test("target archive buttons load nearby monsters while seen stays fallback-only", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm"],
        monsterArchive: ["Rotworm", "Rat", "Bat"],
      },
      snapshot: {
        visibleMonsterNames: ["Rat", "Bat"],
        visibleCreatureNames: ["Rat", "Bat"],
        visiblePlayerNames: ["Knight Alpha"],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  document.getElementById("monster-use-visible").click();
  await flush();
  assert.equal(document.getElementById("monster").value, "Bat\nRat");
  assert.ok(!document.getElementById("monster").value.includes("Knight Alpha"));

  document.getElementById("monster-use-archive").click();
  await flush();
  assert.equal(document.getElementById("monster").value, "Bat\nRat");
  assert.ok(!document.getElementById("monster").value.includes("Rotworm"));
});

test("target source chips support one-click add and remove flows", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm"],
        monsterArchive: ["Rotworm", "Rat"],
      },
      snapshot: {
        visibleMonsterNames: ["Rat", "Bat"],
        visibleCreatureNames: ["Rat", "Bat"],
        visiblePlayerNames: ["Knight Alpha"],
      },
    }),
  });
  const { document } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  document.querySelector('#monster-archive [data-name="Bat"]').click();
  await flush();
  assert.equal(document.getElementById("monster").value, "Rotworm\nBat");
  assert.match(document.getElementById("target-profile-list").textContent, /Bat/);

  document.querySelector('#monster-archive [data-name="Rotworm"]').click();
  await flush();
  assert.equal(document.getElementById("monster").value, "Bat");
  assert.ok(!document.getElementById("target-profile-list").textContent.includes("Rotworm"));
});

test("target archive supports create and delete flows without clobbering unsaved target edits", async () => {
  const desk = await createDesk({
    initialState: createState({
      options: {
        monsterNames: ["Rotworm"],
        monsterArchive: ["Rotworm", "Rat"],
      },
      snapshot: {
        visibleMonsterNames: ["Rat"],
        visibleCreatureNames: ["Rat"],
        visiblePlayerNames: ["Knight Alpha"],
      },
    }),
  });
  const { document, currentState, calls, emit, window } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  document.getElementById("monster").value = "Dragon\nRat";
  document.getElementById("monster").dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();

  document.getElementById("monster-archive-targets").click();
  await flush();
  assert.deepEqual(calls.updateOptions.at(-1).monsterArchive, ["Dragon", "Rat", "Rotworm"]);
  assert.deepEqual(currentState().options.monsterArchive, ["Dragon", "Rat", "Rotworm"]);

  currentState().options = normalizeOptions({
    ...currentState().options,
    monsterArchive: ["Rotworm", "Rat", "Dragon", "Larva"],
  });
  currentState().snapshot = {
    ...currentState().snapshot,
    visibleMonsterNames: ["Rat", "Larva"],
    visibleCreatureNames: ["Rat", "Larva"],
    visiblePlayerNames: ["Knight Alpha"],
  };
  emit("target-archive", { added: ["Larva"] });
  await flush();

  assert.equal(document.getElementById("monster").value, "Dragon\nRat");
  assert.match(document.getElementById("monster-archive").textContent, /Larva/);

  document.querySelector('[data-remove-name="Rat"]').click();
  await flush();
  assert.deepEqual(calls.updateOptions.at(-1).monsterArchive, ["Dragon", "Larva", "Rotworm"]);
  assert.deepEqual(currentState().options.monsterArchive, ["Dragon", "Larva", "Rotworm"]);

  document.getElementById("monster-clear-archive").click();
  await flush();
  assert.match(document.getElementById("archive-danger-copy").textContent, /confirm clearing/i);
  document.getElementById("monster-clear-archive").click();
  await flush();
  assert.deepEqual(calls.updateOptions.at(-1).monsterArchive, []);
  assert.deepEqual(currentState().options.monsterArchive, []);
});

test("hunt refreshes do not clobber focused monster edits", async () => {
  const desk = await createDesk();
  const { document, currentState, emit } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  const monsterInput = document.getElementById("monster");
  monsterInput.focus();
  monsterInput.value = "Dragon";

  currentState().snapshot = {
    ...currentState().snapshot,
    visibleMonsterNames: ["Rotworm", "Dragon"],
    visibleCreatureNames: ["Rotworm", "Dragon"],
  };
  emit("state");
  await flush();

  assert.equal(document.activeElement, monsterInput);
  assert.equal(document.getElementById("monster").value, "Dragon");
  assert.match(document.getElementById("monster-visible-note").textContent, /Dragon/);
});

test("loading a route clears stale targeting drafts so Hunt Studio shows the loaded hunt", async () => {
  const desk = await createDesk();
  const { document, window, currentState, emit } = desk;

  document.getElementById("quick-open-targeting").click();
  await flush();

  document.getElementById("monster").value = "Dragon\nRat";
  document.getElementById("monster").dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();

  document.querySelector("#modal-targeting [data-close-modal]").click();
  await flush();

  document.getElementById("route-overview-open-files").click();
  await flush();

  const quickSelect = document.getElementById("route-library-quick-select");
  quickSelect.value = "cyclops-loop";
  quickSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();

  document.getElementById("load-route-quick").click();
  await flush();

  const nextOptions = normalizeOptions({
    ...currentState().options,
    cavebotName: "cyclops-loop",
    monster: "Larva",
    monsterNames: ["Larva"],
    targetProfiles: [
      {
        name: "Larva",
        chaseMode: "aggressive",
        preferShootable: true,
        stickToTarget: true,
      },
    ],
  });
  emit("state", {}, {
    ...currentState(),
    options: nextOptions,
  });
  await flush();

  document.getElementById("quick-open-targeting").click();
  await flush();

  assert.equal(document.getElementById("monster").value, "Larva");
  assert.ok(!document.getElementById("monster").value.includes("Dragon"));
});

test("module refreshes do not replace focused spell inputs while editing", async () => {
  const desk = await createDesk();
  const { document, currentState, emit, window } = desk;

  document.querySelector('[data-open-modal="healer"]').click();
  await flush();

  const spellInput = document.querySelector('[data-module-key="healer"][data-rule-index="1"][data-rule-field="words"]');
  spellInput.focus();
  spellInput.value = "exura vita";
  spellInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();

  currentState().snapshot = {
    ...currentState().snapshot,
    playerStats: {
      ...currentState().snapshot.playerStats,
      healthPercent: 42,
    },
  };
  emit("state");
  await flush();

  assert.equal(document.activeElement, spellInput);
  assert.equal(
    document.querySelector('[data-module-key="healer"][data-rule-index="1"][data-rule-field="words"]'),
    spellInput,
  );
  assert.equal(spellInput.value, "exura vita");
  assert.match(document.getElementById("module-current-line").textContent, /exura vita/);
});
