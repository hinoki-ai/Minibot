const logOutput = document.getElementById("log-output");
const runtimeMetricsOutput = document.getElementById("runtime-metrics");
const eventFeed = document.getElementById("event-feed");
const eventFeedMeta = document.getElementById("event-feed-meta");
const eventFeedSummary = document.getElementById("event-feed-summary");
const routeFileStatus = document.getElementById("route-file-status");
const routeFilePath = document.getElementById("route-file-path");
const routeLibrarySelect = document.getElementById("route-library-select");
const routeLibraryMeta = document.getElementById("route-library-meta");
const routeLibraryQuickSelect = document.getElementById("route-library-quick-select");
const routeLibraryQuickMeta = document.getElementById("route-library-quick-meta");
const accountSelect = document.getElementById("account-select");
const accountMeta = document.getElementById("account-meta");
const accountIdField = document.getElementById("account-id");
const accountLabelField = document.getElementById("account-label");
const accountLoginMethodField = document.getElementById("account-login-method");
const accountLoginNameField = document.getElementById("account-login-name");
const accountPasswordField = document.getElementById("account-password");
const accountPreferredCharacterField = document.getElementById("account-preferred-character");
const accountReconnectPolicyField = document.getElementById("account-reconnect-policy");
const accountSecretStorageField = document.getElementById("account-secret-storage");
const accountCharactersField = document.getElementById("account-characters");
const accountNotesField = document.getElementById("account-notes");
const routeBuilder = document.getElementById("route-builder");
const routeEditorTitle = document.getElementById("route-editor-title");
const routeEditorCopy = document.getElementById("route-editor-copy");
const routeEditorSharedHelp = document.getElementById("route-editor-shared-help");
const routeEditorModeButtons = {
  waypoint: document.getElementById("route-editor-mode-waypoint"),
  tileRule: document.getElementById("route-editor-mode-tile-rule"),
};
const waypointEditorPanel = document.getElementById("waypoint-editor-panel");
const tileRuleEditorPanel = document.getElementById("tile-rule-editor-panel");
const waypointTypeHelp = document.getElementById("waypoint-type-help");
const waypointActionFields = document.getElementById("waypoint-action-fields");
const waypointActionHelp = document.getElementById("waypoint-action-help");
const routeOverviewCard = document.getElementById("route-overview-card");
const routeToggleWaypointsCard = document.getElementById("route-toggle-waypoints-card");
const routeLivePreviewShell = document.querySelector("#route-overview-card .route-live-preview-shell");
const routeOverviewFields = {
  name: document.getElementById("route-overview-name"),
  count: document.getElementById("route-overview-count"),
  rules: document.getElementById("route-overview-rules"),
  focus: document.getElementById("route-overview-focus"),
  library: document.getElementById("route-overview-library"),
  note: document.getElementById("route-overview-note"),
  preview: document.getElementById("route-live-preview"),
  selectionSummary: document.getElementById("route-live-selection-summary"),
};
const routeLivePreviewCollapsedNote = document.getElementById("route-live-preview-collapsed");
const botTabs = document.getElementById("bot-tabs");
const windowPinButton = document.getElementById("window-pin");
const windowCloseButton = document.getElementById("window-close");
const targetingOpenButtons = [
  document.getElementById("quick-open-targeting"),
  document.getElementById("compact-open-targeting"),
].filter(Boolean);
const newSessionButton = document.getElementById("new-session");
const killSessionButton = document.getElementById("kill-session");
const newRouteButton = document.getElementById("new-route");
const refreshButton = document.getElementById("refresh");
const compactViewButton = document.getElementById("compact-view");
const appShell = document.getElementById("app-shell");
const consoleLayout = document.querySelector(".console-layout");
const compactLayout = document.querySelector(".compact-layout");
const modalLayer = document.getElementById("modal-layer");
const modalPanels = Array.from(document.querySelectorAll(".modal-panel"));
const waypointList = document.getElementById("waypoint-list");
const tileRuleList = document.getElementById("tile-rule-list");
const waypointAddPanel = document.getElementById("waypoint-add-panel");
const monsterArchive = document.getElementById("monster-archive");
const monsterTargetList = document.getElementById("monster-target-list");
const targetProfileList = document.getElementById("target-profile-list");
const targetingDistanceRuleList = document.getElementById("targeting-distance-rule-list");
const targetingDistanceEnabledToggle = document.getElementById("targeting-distance-enabled");
const targetingDistanceState = document.getElementById("targeting-distance-state");
const targetingAddDistanceRuleButton = document.getElementById("targeting-add-distance-rule");
const huntPresetSearch = document.getElementById("hunt-preset-search");
const creatureRegistrySearch = document.getElementById("creature-registry-search");
const huntPresetCount = document.getElementById("hunt-preset-count");
const huntPresetList = document.getElementById("hunt-preset-list");
const huntPresetDetail = document.getElementById("hunt-preset-detail");
const monsterVisibleNote = document.getElementById("monster-visible-note");
const playerVisibleNote = document.getElementById("player-visible-note");
const playerVisibleList = document.getElementById("player-visible-list");
const npcVisibleNote = document.getElementById("npc-visible-note");
const npcVisibleList = document.getElementById("npc-visible-list");
const targetingLayout = document.querySelector("#modal-targeting .route-hunt-grid, #modal-targeting .route-hunt-grid-3col, #modal-targeting .targeting-layout");
const targetWatchPanel = document.querySelector("[data-target-watch-panel]");
const targetWatchHandle = document.querySelector("[data-target-watch-handle]");
const targetWatchResetButton = document.querySelector("[data-target-watch-reset]");
const targetingRegistryFields = {
  queue: document.getElementById("targeting-queue-count"),
  profiles: document.getElementById("targeting-profile-count"),
  monsterHistory: document.getElementById("targeting-monster-history-count"),
  playerHistory: document.getElementById("targeting-player-history-count"),
};
const waypointSelectionSummary = document.getElementById("waypoint-selection-summary");
const waypointStackSelectionSummary = document.getElementById("route-stack-selection-summary");
const routeLivePreviewToolbar = document.getElementById("route-live-preview-toolbar");
const routeLivePreviewToggleButton = document.getElementById("route-live-preview-toggle");
const routeStackSelectionBar = document.getElementById("route-stack-selection-bar");
const tileRuleSelectionSummary = document.getElementById("tile-rule-selection-summary");
const tileRulePolicyHelp = document.getElementById("tile-rule-policy-help");
const sharedModulePanel = document.querySelector('[data-module-panel="shared"]');
const moduleModalTitle = document.getElementById("module-modal-title");
const moduleModalMeta = document.getElementById("module-modal-meta");
const moduleCardTitle = document.getElementById("module-card-title");
const moduleStateLine = document.getElementById("module-state-line");
const moduleCurrentLine = document.getElementById("module-current-line");
const moduleNote = document.getElementById("module-note");
const moduleRuleList = document.getElementById("module-rule-list");
const moduleExtraFields = document.getElementById("module-extra-fields");
const addModuleRuleButton = document.getElementById("add-module-rule");
const runeMakerPanel = document.getElementById("rune-maker-panel");
const runeMakerStateLine = document.getElementById("rune-maker-state-line");
const runeMakerCurrentLine = document.getElementById("rune-maker-current-line");
const runeMakerNote = document.getElementById("rune-maker-note");
const runeMakerRuleMeta = document.getElementById("rune-maker-rule-meta");
const runeMakerRuleList = document.getElementById("rune-maker-rule-list");
const runeMakerLiveSummary = document.getElementById("rune-maker-live-summary");
const runeMakerLiveBadges = document.getElementById("rune-maker-live-badges");
const runeMakerAddRuleButton = document.getElementById("rune-maker-add-rule");
const routeDangerSummary = document.getElementById("route-danger-summary");
const routeDangerSelected = document.getElementById("route-danger-selected");
const routeDangerClear = document.getElementById("route-danger-clear");
const routeDangerDeleteFile = document.getElementById("route-danger-delete-file");
const undoRouteChangeButton = document.getElementById("undo-route-change");
const cancelRouteDangerButton = document.getElementById("cancel-route-danger");
const archiveDangerCopy = document.getElementById("archive-danger-copy");
const undoArchiveButton = document.getElementById("monster-undo-archive");
const cancelArchiveDangerButton = document.getElementById("monster-cancel-archive");
const modalOpenButtons = Array.from(document.querySelectorAll("[data-open-modal]"));
const routeBuilderFocusButtons = Array.from(document.querySelectorAll("[data-focus-route-builder]"));
const routeLibraryOpenButtons = Array.from(document.querySelectorAll("[data-open-route-library]"));
const proxyClickButtons = Array.from(document.querySelectorAll("[data-proxy-click]"));
const waypointAddTypeButtons = Array.from(document.querySelectorAll("[data-add-waypoint-type]"));
const summaryFields = {
  targeting: document.getElementById("summary-targeting"),
  targetingDetail: document.getElementById("summary-targeting-detail"),
  healer: document.getElementById("summary-healer"),
  healWords: document.getElementById("summary-heal-words"),
  deathHeal: document.getElementById("summary-death-heal"),
  deathHealDetail: document.getElementById("summary-death-heal-detail"),
  mana: document.getElementById("summary-mana"),
  manaWords: document.getElementById("summary-mana-words"),
  autoEat: document.getElementById("summary-auto-eat"),
  autoEatDetail: document.getElementById("summary-auto-eat-detail"),
  ammo: document.getElementById("summary-ammo"),
  ammoDetail: document.getElementById("summary-ammo-detail"),
  ringAmuletAutoReplace: document.getElementById("summary-ring-amulet-auto-replace"),
  ringAmuletAutoReplaceDetail: document.getElementById("summary-ring-amulet-auto-replace-detail"),
  rune: document.getElementById("summary-rune"),
  runeWords: document.getElementById("summary-rune-words"),
  spell: document.getElementById("summary-spell"),
  spellWords: document.getElementById("summary-spell-words"),
  light: document.getElementById("summary-light"),
  lightDetail: document.getElementById("summary-light-detail"),
  convert: document.getElementById("summary-convert"),
  convertDetail: document.getElementById("summary-convert-detail"),
  fieldSafe: document.getElementById("summary-field-safe"),
  fieldSafeDetail: document.getElementById("summary-field-safe-detail"),
  looting: document.getElementById("summary-looting"),
  lootingDetail: document.getElementById("summary-looting-detail"),
  banking: document.getElementById("summary-banking"),
  bankingDetail: document.getElementById("summary-banking-detail"),
  trainer: document.getElementById("summary-trainer"),
  trainerDetail: document.getElementById("summary-trainer-detail"),
  reconnect: document.getElementById("summary-reconnect"),
  reconnectDetail: document.getElementById("summary-reconnect-detail"),
  antiIdle: document.getElementById("summary-anti-idle"),
  antiIdleDetail: document.getElementById("summary-anti-idle-detail"),
  alarms: document.getElementById("summary-alarms"),
  alarmsDetail: document.getElementById("summary-alarms-detail"),
  partyFollow: document.getElementById("summary-party-follow"),
  partyFollowDetail: document.getElementById("summary-party-follow-detail"),
  rookiller: document.getElementById("summary-rookiller"),
  rookillerDetail: document.getElementById("summary-rookiller-detail"),
};

const compactPanelFields = {
  targeting: document.getElementById("compact-targeting-summary"),
  waypointCount: document.getElementById("compact-waypoint-count"),
  healer: document.getElementById("compact-healer-summary"),
  deathHeal: document.getElementById("compact-death-heal-summary"),
  mana: document.getElementById("compact-mana-summary"),
  autoEat: document.getElementById("compact-auto-eat-summary"),
  ammo: document.getElementById("compact-ammo-summary"),
  ringAmuletAutoReplace: document.getElementById("compact-ring-amulet-auto-replace-summary"),
  rune: document.getElementById("compact-rune-summary"),
  spell: document.getElementById("compact-spell-summary"),
  light: document.getElementById("compact-light-summary"),
  convert: document.getElementById("compact-convert-summary"),
  fieldSafe: document.getElementById("compact-field-safe-summary"),
  looting: document.getElementById("compact-looting-summary"),
  banking: document.getElementById("compact-banking-summary"),
  trainer: document.getElementById("compact-trainer-summary"),
  reconnect: document.getElementById("compact-reconnect-summary"),
  antiIdle: document.getElementById("compact-anti-idle-summary"),
  alarms: document.getElementById("compact-alarms-summary"),
  partyFollow: document.getElementById("compact-party-follow-summary"),
  rookiller: document.getElementById("compact-rookiller-summary"),
};

const sessionWaypointVisibilityButton = document.getElementById("quick-toggle-session-waypoints");
const cavebotPauseOpenButton = document.getElementById("quick-open-cavebot-pause");
const cavebotMasterStopSummary = document.getElementById("summary-cavebot-master-stop");
const cavebotMasterStopDetail = document.getElementById("summary-cavebot-master-stop-detail");

const quickButtons = {
  autowalk: document.getElementById("quick-toggle-autowalk"),
  cavebotPause: document.getElementById("quick-toggle-cavebot-pause"),
  targeting: document.getElementById("quick-toggle-targeting"),
  loop: document.getElementById("quick-toggle-loop"),
  record: document.getElementById("quick-toggle-record"),
  waypoints: document.getElementById("quick-toggle-waypoints"),
  avoidFields: document.getElementById("quick-toggle-avoid-fields"),
  healer: document.getElementById("quick-toggle-healer"),
  deathHeal: document.getElementById("quick-toggle-death-heal"),
  manaTrainer: document.getElementById("quick-toggle-mana-trainer"),
  autoEat: document.getElementById("quick-toggle-auto-eat"),
  ammo: document.getElementById("quick-toggle-ammo"),
  ringAmuletAutoReplace: document.getElementById("quick-toggle-ring-amulet-auto-replace"),
  runeMaker: document.getElementById("quick-toggle-rune-maker"),
  spellCaster: document.getElementById("quick-toggle-spell-caster"),
  autoLight: document.getElementById("quick-toggle-auto-light"),
  autoConvert: document.getElementById("quick-toggle-convert"),
  looting: document.getElementById("quick-toggle-looting"),
  banking: document.getElementById("quick-toggle-banking"),
  rookiller: document.getElementById("quick-toggle-rookiller"),
  trainer: document.getElementById("quick-toggle-trainer"),
  reconnect: document.getElementById("quick-toggle-reconnect"),
  antiIdle: document.getElementById("quick-toggle-anti-idle"),
  alarms: document.getElementById("quick-toggle-alarms"),
  partyFollow: document.getElementById("quick-toggle-party-follow"),
};

const compactQuickButtons = {
  autowalk: document.getElementById("compact-toggle-autowalk"),
  targeting: document.getElementById("compact-toggle-targeting"),
  loop: document.getElementById("compact-toggle-loop"),
  record: document.getElementById("compact-toggle-record"),
  waypoints: document.getElementById("compact-toggle-waypoints"),
  avoidFields: document.getElementById("compact-toggle-avoid-fields"),
  healer: document.getElementById("compact-toggle-healer"),
  deathHeal: document.getElementById("compact-toggle-death-heal"),
  manaTrainer: document.getElementById("compact-toggle-mana-trainer"),
  autoEat: document.getElementById("compact-toggle-auto-eat"),
  ammo: document.getElementById("compact-toggle-ammo"),
  ringAmuletAutoReplace: document.getElementById("compact-toggle-ring-amulet-auto-replace"),
  runeMaker: document.getElementById("compact-toggle-rune-maker"),
  spellCaster: document.getElementById("compact-toggle-spell-caster"),
  autoLight: document.getElementById("compact-toggle-auto-light"),
  autoConvert: document.getElementById("compact-toggle-convert"),
  trainer: document.getElementById("compact-toggle-trainer"),
  reconnect: document.getElementById("compact-toggle-reconnect"),
  alarms: document.getElementById("compact-toggle-alarms"),
  rookiller: document.getElementById("compact-toggle-rookiller"),
};

const compactActionButtons = {
  routeAddWaypoint: document.getElementById("compact-route-add-waypoint"),
  routeReconnect: document.getElementById("compact-route-reconnect"),
  routeStopAggro: document.getElementById("compact-route-stop-aggro"),
  routeReset: document.getElementById("compact-route-reset"),
  routeOff: document.getElementById("compact-route-off"),
};

const actionButtons = {
  saveTargeting: document.getElementById("save-targeting"),
  saveModules: Array.from(document.querySelectorAll("[data-save-modules]")),
  saveAccount: document.getElementById("save-account"),
  deleteAccount: document.getElementById("delete-account"),
  newAccount: document.getElementById("new-account"),
  saveAutowalk: document.getElementById("save-autowalk"),
  quickSaveAutowalk: document.getElementById("route-quick-save-button"),
  saveWaypoint: document.getElementById("save-waypoint"),
  saveTileRule: document.getElementById("save-tile-rule"),
  addCurrentWaypoint: document.getElementById("add-current-waypoint"),
  addCurrentTileRuleAvoid: document.getElementById("add-current-tile-rule-avoid"),
  addCurrentTileRuleWait: document.getElementById("add-current-tile-rule-wait"),
  newBlankRoute: document.getElementById("new-blank-route"),
  loadRoute: document.getElementById("load-route"),
  loadRouteQuick: document.getElementById("load-route-quick"),
  moveWaypointUp: document.getElementById("move-waypoint-up"),
  moveWaypointDown: document.getElementById("move-waypoint-down"),
  moveTileRuleUp: document.getElementById("move-tile-rule-up"),
  moveTileRuleDown: document.getElementById("move-tile-rule-down"),
  removeWaypoint: document.getElementById("remove-waypoint"),
  clearWaypointMarks: document.getElementById("clear-waypoint-marks"),
  removeSelectedWaypoints: document.getElementById("route-live-remove-selected"),
  clearLiveSelectedWaypoints: document.getElementById("route-live-clear-selection"),
  removeTileRule: document.getElementById("remove-tile-rule"),
  deleteRoute: document.getElementById("delete-route"),
  clearRoute: document.getElementById("clear-route"),
  resetRoute: document.getElementById("reset-route"),
  quickResetRoute: document.getElementById("quick-reset-route"),
  routeAddWaypointPanel: document.getElementById("route-add-waypoint-panel"),
  routeReconnectPanel: document.getElementById("route-reconnect-panel"),
  routeStopAggroPanel: document.getElementById("route-stop-aggro-panel"),
  routeResetPanel: document.getElementById("route-reset-panel"),
  routeOffButton: document.getElementById("route-off-button"),
  useVisibleCreatures: document.getElementById("monster-use-visible"),
  useArchiveCreatures: document.getElementById("monster-use-archive"),
  archiveTargetCreatures: document.getElementById("monster-archive-targets"),
  clearArchiveCreatures: document.getElementById("monster-clear-archive"),
  undoRouteChange: undoRouteChangeButton,
  cancelRouteDanger: cancelRouteDangerButton,
  undoArchive: undoArchiveButton,
  cancelArchiveDanger: cancelArchiveDangerButton,
};

const MODULE_VIEW_ELEMENTS = {
  shared: {
    panel: sharedModulePanel,
    modalTitle: moduleModalTitle,
    modalMeta: moduleModalMeta,
    cardTitle: moduleCardTitle,
    stateLine: moduleStateLine,
    currentLine: moduleCurrentLine,
    note: moduleNote,
    ruleList: moduleRuleList,
    extraFields: moduleExtraFields,
    addRuleButton: addModuleRuleButton,
  },
  rune: {
    panel: runeMakerPanel,
    modalTitle: moduleModalTitle,
    modalMeta: moduleModalMeta,
    stateLine: runeMakerStateLine,
    currentLine: runeMakerCurrentLine,
    note: runeMakerNote,
    ruleList: runeMakerRuleList,
    addRuleButton: runeMakerAddRuleButton,
    liveSummary: runeMakerLiveSummary,
    liveBadges: runeMakerLiveBadges,
    ruleMeta: runeMakerRuleMeta,
  },
};

const AVOID_FIELD_CATEGORY_LABELS = Object.freeze({
  fire: "Fire",
  energy: "Energy",
  poison: "Poison",
  holes: "Holes",
  stairsLadders: "Stairs & ladders",
  teleports: "Teleports",
  traps: "Traps",
  invisibleWalls: "Invisible walls",
});

const AVOID_FIELD_CATEGORY_INPUT_IDS = Object.freeze({
  fire: "avoid-field-fire",
  energy: "avoid-field-energy",
  poison: "avoid-field-poison",
  holes: "avoid-field-holes",
  stairsLadders: "avoid-field-stairs-ladders",
  teleports: "avoid-field-teleports",
  traps: "avoid-field-traps",
  invisibleWalls: "avoid-field-invisible-walls",
});

const SHARED_SPAWN_MODE_LABELS = Object.freeze({
  "attack-all": "Attack All",
  "respect-others": "Respect Others",
  "watch-only": "Watch Only",
});

const SHARED_SPAWN_MODE_COPY = Object.freeze({
  "attack-all": "Engage free tracked monsters even if another player is sharing the screen.",
  "respect-others": "Skip monsters that are engaged with non-trusted players and keep walking.",
  "watch-only": "If a non-trusted player is visible, suspend combat and keep walking.",
});

const CHASE_MODE_LABELS = Object.freeze({
  auto: "Auto",
  stand: "Stand",
  chase: "Chase",
  aggressive: "Aggressive",
});

const AUTOWALK_SETTING_FIELD_IDS = [
  "cavebotName",
  "autowalkEnabled",
  "autowalkLoop",
  "routeStrictClear",
  "routeFollowExactWaypoints",
  "routeRecording",
  "showWaypointOverlay",
  "avoidElementalFields",
  ...Object.values(AVOID_FIELD_CATEGORY_INPUT_IDS),
  "vocation",
  "sustainEnabled",
  "sustainCooldownMs",
  "preferHotbarConsumables",
  "routeRecordStep",
  "waypointRadius",
  "walkRepathMs",
];

const ROUTE_ITEM_SHARED_FIELD_IDS = [
  "route-item-label",
  "route-item-x",
  "route-item-y",
  "route-item-z",
];

const WAYPOINT_EDITOR_FIELD_IDS = [
  "waypoint-type",
  "waypoint-step-radius",
  "waypoint-action",
  "waypoint-action-target",
];

const TILE_RULE_EDITOR_FIELD_IDS = [
  "tile-rule-enabled",
  "tile-rule-shape",
  "tile-rule-width",
  "tile-rule-height",
  "tile-rule-trigger",
  "tile-rule-policy",
  "tile-rule-wait-ms",
  "tile-rule-cooldown-ms",
  "tile-rule-exactness",
  "tile-rule-vicinity-radius",
];

const ANTI_IDLE_PRESET_MS = [30_000, 60_000, 90_000, 120_000];

let state = null;
let uiViewMode = "desk";
let selectedWaypointIndex = 0;
let markedWaypointIndexes = new Set();
let selectedTileRuleIndex = 0;
let routeLiveResumeTargetKey = "";
let routeLivePreviewCollapsed = false;
let activeModalName = null;
let routeEditorMode = "waypoint";
let activeModuleKey = null;
let statusOverride = null;
let statusTimer = null;
let lastFocusedElement = null;
let targetingDirty = false;
let targetQueueDraft = null;
let targetProfilesDraft = null;
let targetProfilesRenderedKey = "";
let targetingCombatDraft = null;
let targetingCombatRenderedKey = "";
let modulesDraft = null;
let modulesRenderedKey = "";
let autowalkDirty = false;
let accountDraft = null;
let accountDraftDirty = false;
let accountDraftNewEntry = false;
let waypointEditorDirty = false;
let waypointEditorDirtyIndex = 0;
let waypointEditorDraft = null;
let tileRuleEditorDirty = false;
let tileRuleEditorDirtyIndex = 0;
let tileRuleEditorDraft = null;
let selectedRouteLibraryName = "";
let selectedAccountId = "";
let selectedHuntPresetId = "";
let dashboardRenderedKey = "";
let routeLibraryRenderedKey = "";
let accountRegistryRenderedKey = "";
let accountDraftRenderedKey = "";
let routeOverviewRenderedKey = "";
let waypointListStructureRenderedKey = "";
let waypointListStateRenderedKey = "";
let routeLivePreviewRenderedKey = "";
let botTabsRenderedKey = "";
let botTabsStructureRenderedKey = "";
let sessionTabOrderIds = [];
let sessionTabDragState = null;
let suppressSessionTabClickUntil = 0;
let monsterArchiveRenderedKey = "";
let huntPresetsRenderedKey = "";
let creatureRegistryDragState = null;
let targetWatchDockState = {
  x: null,
  y: null,
  pointerOffsetX: 0,
  pointerOffsetY: 0,
  dragging: false,
};
let logsRenderedKey = "";
let logOutputRenderedSessionId = "";
let logOutputRenderedFirst = "";
let logOutputRenderedLast = "";
let logOutputRenderedLength = 0;
let logOutputRenderedText = "";
let runtimeMetricsRenderedKey = "";
let pendingDangerAction = null;
let pendingDangerTimer = null;
let routeUndoState = null;
let archiveUndoState = null;
let sessionContextResetPending = false;
let renderScheduled = false;
let scheduledRenderScope = "full";
let mainWindowTooltipsDirty = true;
let rendererDisposed = false;
let unsubscribeFromEvents = null;
const ACTION_FEEDBACK_MS = 420;
const ERROR_FEEDBACK_MS = 260;
const DANGER_CONFIRM_MS = 9000;
const SESSION_TAB_CLICK_SUPPRESS_MS = 220;
const RUNTIME_TIMING_EWMA_ALPHA = 0.18;
const rendererRuntimeTiming = {};
const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "input:not(:disabled)",
  "textarea:not(:disabled)",
  "select:not(:disabled)",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");
const buttonFeedbackTimers = new WeakMap();
const buttonFeedbackRegistry = new Map();
const busyControlRegistry = new Map();
let pressedButton = null;
let lastSaveModulesClickButton = null;
const SESSION_EMERGENCY_HEALTH_PERCENT = 20;
const STAFF_PLAYER_NAME_PATTERN = /\b(?:gm|god|gamemaster|game master)\b/i;
const ROUTE_RESET_ALERT_DURATION_MS = 5_000;
const ALERT_KIND_PRIORITY = {
  emergency: 1,
  player: 2,
  staff: 3,
  blacklist: 4,
  death: 5,
};
const PLAYER_ALERT_BEEP_PROFILE = [
  { frequency: 720, durationMs: 90, delayMs: 0, gain: 0.03, type: "sine" },
  { frequency: 560, durationMs: 120, delayMs: 135, gain: 0.034, type: "sine" },
];
const STAFF_ALERT_BEEP_PROFILE = [
  { frequency: 1120, durationMs: 85, delayMs: 0, gain: 0.04, type: "triangle" },
  { frequency: 1460, durationMs: 100, delayMs: 110, gain: 0.042, type: "triangle" },
  { frequency: 1120, durationMs: 120, delayMs: 250, gain: 0.04, type: "triangle" },
];
const BLACKLIST_ALERT_BEEP_PROFILE = [
  { frequency: 1380, durationMs: 95, delayMs: 0, gain: 0.048, type: "sawtooth" },
  { frequency: 980, durationMs: 110, delayMs: 130, gain: 0.05, type: "sawtooth" },
  { frequency: 1480, durationMs: 120, delayMs: 280, gain: 0.05, type: "sawtooth" },
];

function buildRouteResetAlertProfile(totalDurationMs = ROUTE_RESET_ALERT_DURATION_MS) {
  const profile = [];

  for (let delayMs = 0; delayMs < totalDurationMs; delayMs += 500) {
    profile.push(
      { frequency: 660, durationMs: 120, delayMs, gain: 0.045, type: "square" },
      { frequency: 990, durationMs: 130, delayMs: delayMs + 170, gain: 0.045, type: "square" },
    );
  }

  return profile;
}

const ALERT_BEEP_PROFILES = {
  emergency: [
    { frequency: 740, durationMs: 110, delayMs: 0, gain: 0.04, type: "square" },
    { frequency: 580, durationMs: 140, delayMs: 150, gain: 0.045, type: "square" },
  ],
  player: PLAYER_ALERT_BEEP_PROFILE,
  hostile: STAFF_ALERT_BEEP_PROFILE,
  staff: STAFF_ALERT_BEEP_PROFILE,
  blacklist: BLACKLIST_ALERT_BEEP_PROFILE,
  death: [
    { frequency: 420, durationMs: 160, delayMs: 0, gain: 0.045, type: "sawtooth" },
    { frequency: 320, durationMs: 220, delayMs: 190, gain: 0.05, type: "sawtooth" },
  ],
  reset: buildRouteResetAlertProfile(),
};
const ALARM_CATEGORY_UI = Object.freeze({
  player: Object.freeze({
    title: "Regular Players",
    shortTitle: "Players",
    sound: "Soft beep",
    tone: "player",
  }),
  staff: Object.freeze({
    title: "GM / GOD",
    shortTitle: "GM / GOD",
    sound: "Strong beep",
    tone: "staff",
  }),
  blacklist: Object.freeze({
    title: "Blacklist",
    shortTitle: "Blacklist",
    sound: "Max beep",
    tone: "blacklist",
  }),
});
const ALARM_MODULE_FIELD_KEYS = Object.freeze({
  player: Object.freeze({
    enabled: "alarmsPlayerEnabled",
    radius: "alarmsPlayerRadiusSqm",
    floor: "alarmsPlayerFloorRange",
  }),
  staff: Object.freeze({
    enabled: "alarmsStaffEnabled",
    radius: "alarmsStaffRadiusSqm",
    floor: "alarmsStaffFloorRange",
  }),
  blacklist: Object.freeze({
    enabled: "alarmsBlacklistEnabled",
    radius: "alarmsBlacklistRadiusSqm",
    floor: "alarmsBlacklistFloorRange",
    names: "alarmsBlacklistNames",
  }),
});
const VOCATION_OPTIONS = Object.freeze([
  { value: "", label: "Auto Detect Live" },
  { value: "knight", label: "Knight" },
  { value: "paladin", label: "Paladin" },
  { value: "sorcerer", label: "Sorcerer" },
  { value: "druid", label: "Druid" },
]);

const DEATH_HEAL_SPELL_OPTIONS_BY_VOCATION = Object.freeze({
  default: Object.freeze([
    { value: "exura", label: "Light Healing / exura" },
    { value: "exura gran", label: "Intense Healing / exura gran" },
    { value: "exura vita", label: "Ultimate Healing / exura vita" },
  ]),
  knight: Object.freeze([
    { value: "exura", label: "Light Healing / exura" },
  ]),
  paladin: Object.freeze([
    { value: "exura", label: "Light Healing / exura" },
    { value: "exura gran", label: "Intense Healing / exura gran" },
    { value: "exura vita", label: "Ultimate Healing / exura vita" },
  ]),
  sorcerer: Object.freeze([
    { value: "exura", label: "Light Healing / exura" },
    { value: "exura gran", label: "Intense Healing / exura gran" },
    { value: "exura vita", label: "Ultimate Healing / exura vita" },
  ]),
  druid: Object.freeze([
    { value: "exura", label: "Light Healing / exura" },
    { value: "exura gran", label: "Intense Healing / exura gran" },
    { value: "exura vita", label: "Ultimate Healing / exura vita" },
  ]),
});
const HEALING_RUNE_ACTION_CANONICAL_VALUE_BY_KEY = Object.freeze({
  "intense healing": "Intense Healing Rune",
  "intense healing rune": "Intense Healing Rune",
  "ih rune": "Intense Healing Rune",
  ih: "Intense Healing Rune",
  "ultimate healing": "Ultimate Healing Rune",
  "ultimate healing rune": "Ultimate Healing Rune",
  "uh rune": "Ultimate Healing Rune",
  uh: "Ultimate Healing Rune",
});
const HEALER_AUTO_RUNE_OPTIONS = Object.freeze([
  { value: "", label: "Auto strongest available" },
  { value: "Ultimate Healing Rune", label: "Ultimate Healing Rune / self" },
  { value: "Intense Healing Rune", label: "Intense Healing Rune / self" },
]);
const HEALER_HEAL_FRIEND_ACTION_PATTERN = /\bheal friend\b|\bexura sio\b/i;
const HEALER_MASS_HEAL_ACTION_PATTERN = /\bmass healing\b|\bexura gran mas res\b/i;
const HEALER_ACTION_GROUPS = Object.freeze([
  { key: "self-spell", label: "Self Spells" },
  { key: "support-spell", label: "Team Support" },
  { key: "rune", label: "Healing Runes" },
]);
const HEALER_ACTION_LIBRARY = Object.freeze([
  {
    value: "exura",
    label: "Light Healing / exura",
    group: "self-spell",
    supportedVocations: Object.freeze(["knight", "paladin", "sorcerer", "druid"]),
  },
  {
    value: "exura gran",
    label: "Intense Healing / exura gran",
    group: "self-spell",
    supportedVocations: Object.freeze(["paladin", "sorcerer", "druid"]),
  },
  {
    value: "exura vita",
    label: "Ultimate Healing / exura vita",
    group: "self-spell",
    supportedVocations: Object.freeze(["paladin", "sorcerer", "druid"]),
  },
  {
    value: "exura gran mas res",
    label: "Mass Healing / exura gran mas res / druid",
    group: "support-spell",
    supportedVocations: Object.freeze(["druid"]),
  },
  {
    value: "exura sio",
    label: "Heal Friend / exura sio / druid",
    group: "support-spell",
    supportedVocations: Object.freeze(["druid"]),
  },
  {
    value: "Intense Healing Rune",
    label: "Intense Healing Rune / self",
    group: "rune",
    supportedVocations: Object.freeze(["knight", "paladin", "sorcerer", "druid"]),
  },
  {
    value: "Ultimate Healing Rune",
    label: "Ultimate Healing Rune / self",
    group: "rune",
    supportedVocations: Object.freeze(["knight", "paladin", "sorcerer", "druid"]),
  },
]);
const POTION_HEALER_ITEM_OPTIONS = Object.freeze([
  { value: "Supreme Health Potion", label: "Supreme Health Potion / self" },
  { value: "Ultimate Health Potion", label: "Ultimate Health Potion / self" },
  { value: "Great Health Potion", label: "Great Health Potion / self" },
  { value: "Strong Health Potion", label: "Strong Health Potion / self" },
  { value: "Health Potion", label: "Health Potion / self" },
]);
const CONDITION_HEALER_TRIGGER_OPTIONS = Object.freeze([
  { value: "poisoned", label: "Poisoned / cure poison" },
  { value: "magic-shield-missing", label: "Magic Shield Missing / renew utamo vita" },
]);
const CONDITION_HEALER_ACTION_OPTIONS_BY_TRIGGER = Object.freeze({
  poisoned: Object.freeze([
    {
      value: "exana pox",
      label: "Antidote / exana pox",
      supportedVocations: Object.freeze(["knight", "paladin", "sorcerer", "druid"]),
    },
  ]),
  "magic-shield-missing": Object.freeze([
    {
      value: "utamo vita",
      label: "Magic Shield / utamo vita",
      supportedVocations: Object.freeze(["paladin", "sorcerer", "druid"]),
    },
  ]),
});
const AMMO_DEFAULTS_BY_VOCATION = Object.freeze({
  paladin: Object.freeze({
    enabled: true,
    minimumCount: 50,
    warningCount: 100,
    preferredNames: Object.freeze(["Power Bolt", "Bolt", "Arrow", "Explosive Arrow", "Royal Spear"]),
  }),
  sorcerer: Object.freeze({
    enabled: false,
    minimumCount: 0,
    warningCount: 0,
    preferredNames: Object.freeze([]),
  }),
  druid: Object.freeze({
    enabled: false,
    minimumCount: 0,
    warningCount: 0,
    preferredNames: Object.freeze([]),
  }),
  knight: Object.freeze({
    enabled: false,
    minimumCount: 0,
    warningCount: 0,
    preferredNames: Object.freeze([]),
  }),
});
const AMMO_FALLBACK_CHOICES = Object.freeze([
  "Power Bolt",
  "Bolt",
  "Arrow",
  "Explosive Arrow",
  "Royal Spear",
]);
const AMMO_COIN_NAME_PATTERN = /\b(?:gold|platinum|crystal)\s+coin\b/i;
const AMMO_COIN_IDS = new Set([3031, 3035, 3043]);
let alertAudioContext = null;
let alertBeepChain = Promise.resolve();
const continuousAlertState = {
  kind: null,
  token: 0,
  timerId: null,
  nodes: new Set(),
};
const MODULE_RULE_SCHEMAS = {
  deathHeal: {
    enabledKey: "deathHealEnabled",
    allowRules: false,
    moduleFields: [
      { key: "deathHealVocation", label: "Vocation", type: "select" },
      { key: "deathHealWords", label: "Healing spell", type: "select" },
      { key: "deathHealHotkey", label: "Hotkey", type: "text", placeholder: "F5" },
      { key: "deathHealHealthPercent", label: "HP threshold %", type: "number" },
      { key: "deathHealCooldownMs", label: "Repeat ms", type: "number" },
    ],
  },
  healer: {
    enabledKey: "healerEnabled",
    rulesKey: "healerRules",
    emptyRule: {
      enabled: true,
      label: "",
      words: "exura",
      hotkey: "",
      minHealthPercent: 0,
      maxHealthPercent: 80,
      minMana: 20,
      minManaPercent: 0,
      cooldownMs: 900,
    },
    fields: [
      { key: "words", label: "Heal action", type: "text" },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F5" },
      { key: "minHealthPercent", label: "HP min", type: "number" },
      { key: "maxHealthPercent", label: "HP max", type: "number" },
      { key: "minMana", label: "Mana min", type: "number" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    moduleFields: [
      {
        key: "healerEmergencyHealthPercent",
        label: "Healing priority at/below HP %",
        type: "number",
        help: "Below this HP the bot prioritizes healer rules and delays other spell casts so they do not starve healing. Set 0 to disable.",
      },
      {
        key: "healerRuneName",
        label: "Auto rune",
        type: "select",
        options: HEALER_AUTO_RUNE_OPTIONS,
        help: "Leave on Auto to try Ultimate Healing Rune first, then Intense Healing Rune.",
      },
      {
        key: "healerRuneHotkey",
        label: "Auto rune hotkey",
        type: "text",
        placeholder: "F5",
        help: "Optional keyboard key for the dedicated auto rune. Use the same key bound in the game hotbar.",
      },
      {
        key: "healerRuneHealthPercent",
        label: "Auto rune at/below HP %",
        type: "number",
        help: "Dedicated self-rune fallback after spell tiers and before potion healer. Set 0 to disable.",
      },
    ],
    flags: [],
  },
  potionHealer: {
    enabledKey: "potionHealerEnabled",
    rulesKey: "potionHealerRules",
    emptyRule: {
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
    fields: [
      { key: "itemName", label: "Potion", type: "select", options: POTION_HEALER_ITEM_OPTIONS },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F6" },
      { key: "minHealthPercent", label: "HP min", type: "number" },
      { key: "maxHealthPercent", label: "HP max", type: "number" },
      { key: "minMana", label: "Mana min", type: "number" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    moduleFields: [
      {
        key: "potionHealerEnabled",
        label: "Enable potion healer",
        type: "checkbox",
        help: "Ordered self-healing potion rules live here. Sustain still owns mana potions and health-potion fallback when no potion rule matches.",
      },
    ],
    flags: [],
  },
  conditionHealer: {
    enabledKey: "conditionHealerEnabled",
    rulesKey: "conditionHealerRules",
    emptyRule: {
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
    fields: [
      { key: "condition", label: "Condition", type: "select", options: CONDITION_HEALER_TRIGGER_OPTIONS },
      { key: "words", label: "Condition action", type: "select" },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F7" },
      { key: "minHealthPercent", label: "HP min", type: "number" },
      { key: "maxHealthPercent", label: "HP max", type: "number" },
      { key: "minMana", label: "Mana min", type: "number" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    moduleFields: [
      {
        key: "conditionHealerEnabled",
        label: "Enable condition healer",
        type: "checkbox",
        help: "Only conditions the snapshot can truly drive belong here. Poison cure and magic-shield renewal are live; unsupported classics stay explicit below.",
      },
    ],
    flags: [],
  },
  manaTrainer: {
    enabledKey: "manaTrainerEnabled",
    rulesKey: "manaTrainerRules",
    emptyRule: {
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
    fields: [
      { key: "words", label: "Spell", type: "text" },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F8" },
      { key: "minHealthPercent", label: "HP min", type: "number" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "maxManaPercent", label: "MP max", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    flags: [
      { key: "requireNoTargets", label: "Only with no target" },
      { key: "requireStationary", label: "Only while idle" },
    ],
  },
  runeMaker: {
    enabledKey: "runeMakerEnabled",
    rulesKey: "runeMakerRules",
    emptyRule: {
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
    fields: [
      { key: "words", label: "Spell", type: "text" },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F9" },
      { key: "minHealthPercent", label: "HP min", type: "number" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "maxManaPercent", label: "MP max", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    flags: [
      { key: "requireNoTargets", label: "Only with no target" },
      { key: "requireStationary", label: "Only while idle" },
    ],
  },
  spellCaster: {
    enabledKey: "spellCasterEnabled",
    rulesKey: "spellCasterRules",
    emptyRule: {
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
    fields: [
      { key: "words", label: "Spell", type: "text" },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F10" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "maxTargetDistance", label: "Range max", type: "number" },
      { key: "minTargetCount", label: "Target count", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
      {
        key: "pattern",
        label: "Pattern",
        type: "select",
        options: [
          { value: "any", label: "Any" },
          { value: "adjacent", label: "Adjacent" },
          { value: "aligned", label: "Aligned" },
          { value: "diagonal", label: "Diagonal" },
          { value: "pack", label: "Pack" },
        ],
      },
    ],
    flags: [
      { key: "requireTarget", label: "Require target" },
      { key: "requireStationary", label: "Only while idle" },
    ],
  },
  distanceKeeper: {
    enabledKey: "distanceKeeperEnabled",
    rulesKey: "distanceKeeperRules",
    emptyRule: {
      enabled: true,
      label: "",
      minTargetDistance: 2,
      maxTargetDistance: 3,
      minMonsterCount: 1,
      cooldownMs: 300,
      behavior: "kite",
      dodgeBeams: false,
      dodgeWaves: true,
      requireTarget: true,
    },
    fields: [
      { key: "minTargetDistance", label: "Range min", type: "number" },
      { key: "maxTargetDistance", label: "Range max", type: "number" },
      { key: "minMonsterCount", label: "Threat count", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
      {
        key: "behavior",
        label: "Behavior",
        type: "select",
        options: [
          { value: "retreat", label: "Retreat" },
          { value: "kite", label: "Kite" },
          { value: "hold", label: "Hold" },
          { value: "escape", label: "Run Away" },
        ],
      },
    ],
    flags: [
      { key: "dodgeBeams", label: "Dodge beams" },
      { key: "dodgeWaves", label: "Dodge aligned waves" },
      { key: "requireTarget", label: "Require target" },
    ],
  },
  autoLight: {
    enabledKey: "autoLightEnabled",
    rulesKey: "autoLightRules",
    emptyRule: {
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
    fields: [
      { key: "words", label: "Spell", type: "text" },
      { key: "hotkey", label: "Hotkey", type: "text", placeholder: "F11" },
      { key: "minManaPercent", label: "MP min", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    flags: [
      { key: "requireNoLight", label: "Only when dark" },
      { key: "requireNoTargets", label: "Only with no target" },
      { key: "requireStationary", label: "Only while idle" },
    ],
  },
  autoConvert: {
    enabledKey: "autoConvertEnabled",
    rulesKey: "autoConvertRules",
    emptyRule: {
      enabled: true,
      label: "",
      cooldownMs: 4000,
      requireNoTargets: true,
      requireStationary: true,
    },
    fields: [
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    flags: [
      { key: "requireNoTargets", label: "Only with no target" },
      { key: "requireStationary", label: "Only while idle" },
    ],
  },
  antiIdle: {
    enabledKey: "antiIdleEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "antiIdleIntervalMs",
        label: "Delay ms",
        type: "number",
        help: "Direct keepalive is attempted first, with input fallback only when the client hook is unavailable.",
      },
    ],
  },
  alarms: {
    enabledKey: "alarmsEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "alarmsPlayerEnabled",
        label: "Player alarm",
        type: "checkbox",
        help: "Regular players use a same-floor proximity box by default so the desk does not scream at every nearby name.",
      },
      {
        key: "alarmsPlayerRadiusSqm",
        label: "Player range sqm",
        type: "number",
        help: "Chebyshev box around your character for regular player beeps.",
      },
      {
        key: "alarmsPlayerFloorRange",
        label: "Player floors",
        type: "number",
        help: "How many floors above or below count for regular player alarms.",
      },
      {
        key: "alarmsStaffEnabled",
        label: "GM/GOD alarm",
        type: "checkbox",
        help: "Staff-like names use a stronger alarm profile than regular players.",
      },
      {
        key: "alarmsStaffRadiusSqm",
        label: "GM/GOD range sqm",
        type: "number",
        help: "Priority box for names like GM, GOD, or Game Master.",
      },
      {
        key: "alarmsStaffFloorRange",
        label: "GM/GOD floors",
        type: "number",
        help: "How many floors above or below count for staff alarms.",
      },
      {
        key: "alarmsBlacklistEnabled",
        label: "Blacklist alarm",
        type: "checkbox",
        help: "Named blacklist entries override regular player handling and use the strongest alarm profile.",
      },
      {
        key: "alarmsBlacklistRadiusSqm",
        label: "Blacklist range sqm",
        type: "number",
        help: "Priority box for explicit blacklist names.",
      },
      {
        key: "alarmsBlacklistFloorRange",
        label: "Blacklist floors",
        type: "number",
        help: "How many floors above or below count for blacklist alarms.",
      },
      {
        key: "alarmsBlacklistNames",
        label: "Blacklist names",
        type: "textarea",
        rows: 4,
        placeholder: "God Minibia\nTroublemaker",
        help: "One name per line or comma-separated. Exact names only.",
      },
    ],
  },
  reconnect: {
    enabledKey: "reconnectEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "reconnectRetryDelayMs",
        label: "Retry delay ms",
        type: "number",
        help: "Delay between automatic reconnect attempts after an unexpected disconnect.",
      },
      {
        key: "reconnectMaxAttempts",
        label: "Attempt limit",
        type: "number",
        help: "Set 0 for unlimited reconnect attempts.",
      },
    ],
  },
  autoEat: {
    enabledKey: "autoEatEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "autoEatFoodName",
        label: "Eat first",
        type: "text",
        placeholder: "brown mushroom",
        help: "Priority list. Leave blank to allow any detected food except blocked items.",
      },
      {
        key: "autoEatForbiddenFoodNames",
        label: "Never eat",
        type: "text",
        placeholder: "worm, junk food",
        help: "Blocked foods are always skipped, even if they also appear in the eat-first list.",
      },
      {
        key: "autoEatCooldownMs",
        label: "Eat every ms",
        type: "number",
        help: "Auto Eat is checked before mana trainer and anti-idle so food use can keep both loops active.",
      },
      {
        key: "autoEatRequireNoTargets",
        label: "Only with no target",
        type: "checkbox",
        help: "Optional safety gate outside Trainer. Trainer still allows eating while the training target stays selected.",
      },
      {
        key: "autoEatRequireStationary",
        label: "Only while idle",
        type: "checkbox",
        help: "Avoids interrupting active pathfinder movement with inventory use.",
      },
    ],
  },
  ammo: {
    enabledKey: "ammoEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "ammoPreferredNames",
        label: "Preferred ammo",
        type: "textarea",
        rows: 4,
        placeholder: "Power Bolt\nBolt\nArrow",
        help: "Top-down ammo preference. Leave blank to keep the live quiver ammo or the vocation default when one exists.",
      },
      {
        key: "ammoMinimumCount",
        label: "Minimum carried",
        type: "number",
        help: "Low-ammo warning floor across the quiver plus open bags.",
      },
      {
        key: "ammoWarningCount",
        label: "Restock to",
        type: "number",
        help: "When trade is open, the ammo module buys back up to this carried count.",
      },
      {
        key: "ammoReloadAtOrBelow",
        label: "Reload quiver at/below",
        type: "number",
        help: "When the equipped stack reaches this count, Minibot pulls a fresh stack from open containers.",
      },
      {
        key: "ammoReloadCooldownMs",
        label: "Reload cooldown ms",
        type: "number",
        help: "Throttle between quiver reload and ammo shop restock attempts.",
      },
      {
        key: "ammoReloadEnabled",
        label: "Reload quiver",
        type: "checkbox",
        help: "Moves preferred ammo from open bags into the detected quiver slot.",
      },
      {
        key: "ammoRestockEnabled",
        label: "Restock in shop",
        type: "checkbox",
        help: "Buys preferred ammo when the NPC trade window is already open and carried ammo is below the target.",
      },
      {
        key: "ammoRequireNoTargets",
        label: "Only with no target",
        type: "checkbox",
        help: "Blocks quiver reload and ammo restock while a target is active or visible.",
      },
      {
        key: "ammoRequireStationary",
        label: "Only while idle",
        type: "checkbox",
        help: "Avoids ammo moves while the character is walking or the pathfinder is still moving.",
      },
    ],
  },
  ringAutoReplace: {
    enabledKey: "ringAutoReplaceEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "ringAutoReplaceItemName",
        label: "Replacement ring",
        type: "text",
        placeholder: "stealth ring",
        help: "Matched by item name in open containers. Leave blank to use the first ring found.",
      },
      {
        key: "ringAutoReplaceCooldownMs",
        label: "Repeat margin ms",
        type: "number",
        help: "Throttle for empty-slot checks and replacement moves. Timed rings are usually clean at 1000-3000 ms.",
      },
      {
        key: "ringAutoReplaceRequireNoTargets",
        label: "Only with no target",
        type: "checkbox",
        help: "Waits until target lock and visible targets are clear before equipping.",
      },
      {
        key: "ringAutoReplaceRequireStationary",
        label: "Only while idle",
        type: "checkbox",
        help: "Avoids interrupting active route movement with the equipment move.",
      },
    ],
  },
  amuletAutoReplace: {
    enabledKey: "amuletAutoReplaceEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "amuletAutoReplaceItemName",
        label: "Replacement amulet",
        type: "text",
        placeholder: "amulet",
        help: "Matched by item name in open containers. Leave blank to use the first amulet or necklace found.",
      },
      {
        key: "amuletAutoReplaceCooldownMs",
        label: "Repeat margin ms",
        type: "number",
        help: "Throttle for empty-slot checks and replacement moves. Timed amulets are usually clean at 1000-3000 ms.",
      },
      {
        key: "amuletAutoReplaceRequireNoTargets",
        label: "Only with no target",
        type: "checkbox",
        help: "Waits until target lock and visible targets are clear before equipping.",
      },
      {
        key: "amuletAutoReplaceRequireStationary",
        label: "Only while idle",
        type: "checkbox",
        help: "Avoids interrupting active route movement with the equipment move.",
      },
    ],
  },
  trainer: {
    enabledKey: "trainerEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "trainerReconnectEnabled",
        label: "Reconnect while training",
        type: "checkbox",
        help: "Trainer can keep reconnect armed even when the standalone Reconnect module is off.",
      },
      {
        key: "trainerPartnerName",
        label: "Partner name",
        type: "text",
        placeholder: "Knight Alpha",
        help: "Trainer keeps this player targeted and walks back into range when spacing breaks. Leave blank to disable partner regrouping.",
      },
      {
        key: "trainerPartnerDistance",
        label: "Keep close sqm",
        type: "number",
        help: "When farther than this many SQM from the training partner, Trainer walks back toward them.",
      },
      {
        key: "trainerAutoPartyEnabled",
        label: "Auto party shield",
        type: "checkbox",
        help: "Creates or joins a party before Trainer retargets the partner, so training stays inside party PvP rules.",
      },
      {
        key: "trainerManaTrainerEnabled",
        label: "Trainer mana trainer",
        type: "checkbox",
        help: "Separate from the standalone Mana Trainer. Trainer uses this spell window while the training target stays selected.",
      },
      {
        key: "trainerManaTrainerWords",
        label: "Trainer mana spell",
        type: "text",
        placeholder: "exura",
        help: "Spell Trainer repeats for mana training. This does not use the standalone Mana Trainer module.",
      },
      {
        key: "trainerManaTrainerHotkey",
        label: "Trainer mana hotkey",
        type: "text",
        placeholder: "F8",
        help: "Optional keyboard key bound to the trainer mana spell in the game hotbar.",
      },
      {
        key: "trainerManaTrainerManaPercent",
        label: "Open at mana %",
        type: "number",
        help: "Trainer starts the mana spell once mana reaches this percent.",
      },
      {
        key: "trainerManaTrainerMinHealthPercent",
        label: "Min HP % for mana spell",
        type: "number",
        help: "Trainer only mana-trains while HP stays at or above this floor.",
      },
      {
        key: "trainerEscapeHealthPercent",
        label: "Escape HP %",
        type: "number",
        help: "At or below this HP, Trainer steps away from the target or training partner before resuming the chain.",
      },
      {
        key: "trainerEscapeDistance",
        label: "Escape range",
        type: "number",
        help: "Preferred SQM gap after the low-HP escape move.",
      },
      {
        key: "trainerEscapeCooldownMs",
        label: "Escape cooldown ms",
        type: "number",
        help: "Minimum delay between low-HP escape steps.",
      },
    ],
  },
  looting: {
    enabledKey: "lootingEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "lootWhitelist",
        label: "Keep items",
        type: "textarea",
        rows: 3,
        placeholder: "gold, potions, runes, food",
        help: "Optional keep list. Split names with commas, semicolons, or new lines.",
      },
      {
        key: "lootBlacklist",
        label: "Skip items",
        type: "textarea",
        rows: 3,
        placeholder: "worm, dirty cape",
        help: "Optional deny list. Matches stay in the corpse.",
      },
      {
        key: "lootPreferredContainers",
        label: "Preferred containers",
        type: "text",
        placeholder: "Backpack, Green Backpack",
        help: "Loot is routed into matching open containers first. Leave blank to use the default Backpack preference.",
      },
    ],
  },
  banking: {
    enabledKey: "bankingEnabled",
    rulesKey: "bankingRules",
    emptyRule: {
      enabled: true,
      label: "",
      bankerNames: "",
      operation: "deposit-all",
      amount: 0,
      reserveGold: 0,
      recipient: "",
      cooldownMs: 1400,
      requireNoTargets: true,
      requireStationary: true,
      maxNpcDistance: 3,
    },
    fields: [
      { key: "bankerNames", label: "Banker names", type: "text", placeholder: "Augusto, Grizzly" },
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { value: "deposit-all", label: "Deposit All" },
          { value: "deposit", label: "Deposit" },
          { value: "deposit-excess", label: "Deposit Excess" },
          { value: "withdraw", label: "Withdraw" },
          { value: "withdraw-up-to", label: "Withdraw Up To" },
          { value: "balance", label: "Balance" },
          { value: "transfer", label: "Transfer" },
        ],
      },
      { key: "amount", label: "Amount", type: "number" },
      { key: "reserveGold", label: "Reserve gold", type: "number" },
      { key: "recipient", label: "Recipient", type: "text", placeholder: "Character name" },
      { key: "maxNpcDistance", label: "Banker range", type: "number" },
      { key: "cooldownMs", label: "Cooldown ms", type: "number" },
    ],
    flags: [
      { key: "requireNoTargets", label: "Only with no target" },
      { key: "requireStationary", label: "Only while idle" },
    ],
  },
  partyFollow: {
    enabledKey: "partyFollowEnabled",
    allowRules: false,
    moduleFields: [
      {
        key: "partyFollowManualPlayers",
        label: "Manual players",
        type: "textarea",
        rows: 3,
        placeholder: "Knight Alpha, Scout Beta",
        help: "Extra names not present in live tabs or seen history. Split with commas or new lines.",
      },
      {
        key: "partyFollowDistance",
        label: "Spacing sqm",
        type: "number",
        help: "Each follower keeps this many SQM behind the member directly above it in the follow chain.",
      },
      {
        key: "partyFollowCombatMode",
        label: "Default stance",
        type: "select",
        options: [
          { value: "follow-and-fight", label: "Aggressive follow" },
          { value: "follow-only", label: "Passive follow" },
        ],
        help: "Fallback combat stance for followers without an explicit row role. Row role selections override this default with a sharper tactical lane.",
      },
    ],
  },
};

const MODULE_RULE_UI = {
  deathHeal: {
    modalTitle: "Death Heal",
    modalMeta: "critical self-heal",
    cardTitle: "Death Heal",
    note: "Strongest self-heal at the HP floor. Priority: live detect, module override, route fallback.",
    settingsOnly: true,
  },
  healer: {
    fallbackName: "Heal Tier",
    modalTitle: "Healer",
    modalMeta: "heal tiers",
    cardTitle: "Healer",
    addLabel: "Add Tier",
    note: "Top-down priority. Lowest active band auto-covers 0% HP.",
    multipleActiveSummary: "Active heal tiers run top to bottom. Lowest active band auto-covers 0% HP.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Cast", fields: ["words", "hotkey", "cooldownMs"] },
      { title: "Configured HP Band", fields: ["minHealthPercent", "maxHealthPercent"] },
      { title: "Mana Gate", fields: ["minMana", "minManaPercent"] },
    ],
  },
  potionHealer: {
    fallbackName: "Potion Rule",
    addLabel: "Add Potion Rule",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Potion", fields: ["itemName", "hotkey", "cooldownMs"] },
      { title: "HP Band", fields: ["minHealthPercent", "maxHealthPercent"] },
      { title: "Mana Gate", fields: ["minMana", "minManaPercent"] },
    ],
  },
  conditionHealer: {
    fallbackName: "Condition Rule",
    addLabel: "Add Condition Rule",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Trigger", fields: ["condition", "words", "hotkey", "cooldownMs"] },
      { title: "HP Band", fields: ["minHealthPercent", "maxHealthPercent"] },
      { title: "Mana Gate", fields: ["minMana", "minManaPercent"] },
    ],
  },
  manaTrainer: {
    fallbackName: "Mana Window",
    modalTitle: "Mana Trainer",
    modalMeta: "mana windows",
    cardTitle: "Mana Windows",
    addLabel: "Add Window",
    note: "First active window that matches casts.",
    multipleActiveSummary: "Active mana windows run top to bottom. Put tighter windows first.",
    sections: [
      { title: "Window Identity", fields: ["label", "enabled"] },
      { title: "Cast Cadence", fields: ["words", "hotkey", "cooldownMs"] },
      { title: "Mana Band", fields: ["minManaPercent", "maxManaPercent"] },
      { title: "Safety Gates", fields: ["minHealthPercent", "requireNoTargets", "requireStationary"] },
    ],
  },
  runeMaker: {
    fallbackName: "Rune Window",
    modalTitle: "Rune Maker",
    modalMeta: "rune windows",
    cardTitle: "Rune Maker Rules",
    addLabel: "Add Rune",
    note: "Top-down priority. Use separate windows for different rune spells.",
    multipleActiveSummary: "Active rune windows run top to bottom.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Cast", fields: ["words", "hotkey", "cooldownMs"] },
      { title: "Mana Window", fields: ["minManaPercent", "maxManaPercent"] },
      { title: "Safety Gates", fields: ["minHealthPercent", "requireNoTargets", "requireStationary"] },
    ],
  },
  spellCaster: {
    fallbackName: "Spell Rule",
    modalTitle: "Spell Caster",
    modalMeta: "spell priority",
    cardTitle: "Spell Caster Rules",
    addLabel: "Add Spell",
    note: "Top-down priority. Put stricter wave or pack casts first.",
    multipleActiveSummary: "Active spell rules run top to bottom. Put stricter patterns first.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Cast", fields: ["words", "hotkey", "cooldownMs", "pattern"] },
      { title: "Target Gate", fields: ["maxTargetDistance", "minTargetCount", "minManaPercent"] },
      { title: "Safety Gates", fields: ["requireTarget", "requireStationary"] },
    ],
  },
  distanceKeeper: {
    fallbackName: "Distance Rule",
    modalTitle: "Distance Keeper",
    modalMeta: "kite and dodge",
    cardTitle: "Distance Keeper Rules",
    addLabel: "Add Rule",
    note: "Top-down priority. Hold sidesteps, retreat backs off, kite steps back in.",
    multipleActiveSummary: "Active distance rules run top to bottom. Use hold for sidesteps and kite for full spacing control.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Range Window", fields: ["minTargetDistance", "maxTargetDistance", "behavior"] },
      { title: "Threat Gate", fields: ["minMonsterCount", "cooldownMs"] },
      { title: "Safety Gates", fields: ["dodgeBeams", "dodgeWaves", "requireTarget"] },
    ],
  },
  autoLight: {
    fallbackName: "Light Rule",
    modalTitle: "Light",
    modalMeta: "light trigger",
    cardTitle: "Light",
    addLabel: "Add Rule",
    note: "Rules run top to bottom. Put stricter light checks first.",
    multipleActiveSummary: "Active light rules run top to bottom.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Cast", fields: ["words", "hotkey", "cooldownMs"] },
      { title: "Mana Gate", fields: ["minManaPercent"] },
      { title: "Safety Gates", fields: ["requireNoLight", "requireNoTargets", "requireStationary"] },
    ],
  },
  autoConvert: {
    fallbackName: "Coin Rule",
    modalTitle: "Gold Transform",
    modalMeta: "coin convert",
    cardTitle: "Gold",
    addLabel: "Add Rule",
    note: "Top-down priority. Safety gates keep conversions safer.",
    multipleActiveSummary: "Active coin rules run top to bottom.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Timing", fields: ["cooldownMs"] },
      { title: "Safety Gates", fields: ["requireNoTargets", "requireStationary"] },
    ],
  },
  antiIdle: {
    modalTitle: "Anti Idle",
    modalMeta: "idle pulse",
    cardTitle: "Anti Idle",
    note: "Pulses after the idle delay when the character is standing still.",
    settingsOnly: false,
  },
  alarms: {
    modalTitle: "Alarms",
    modalMeta: "player proximity",
    cardTitle: "Alarms",
    note: "Regular players can stay tighter than staff or blacklist names. GM/GOD and blacklist alarms use stronger beeps.",
    settingsOnly: false,
  },
  trainer: {
    modalTitle: "Trainer",
    modalMeta: "training guardrails",
    cardTitle: "Trainer",
    note: "Trainer mode is separate from Follow Chain and the standalone Mana Trainer. It keeps training anchored with auto-party, reconnect, anti-idle, food cadence, its own mana spell, heals, escape, and follow-chain recovery.",
    settingsOnly: false,
  },
  reconnect: {
    modalTitle: "Reconnect",
    modalMeta: "disconnect recovery",
    cardTitle: "Reconnect",
    note: "Standalone reconnect recovers unexpected disconnects. Trainer can also keep reconnect armed from inside the Trainer modal.",
    settingsOnly: false,
  },
  autoEat: {
    modalTitle: "Auto Eat",
    modalMeta: "food cadence",
    cardTitle: "Auto Eat",
    note: "Live food sources can be sorted into Eat First and Never Eat. Hotbar, equipment, and open containers all feed the same picker.",
    settingsOnly: false,
  },
  ammo: {
    modalTitle: "Ammunition",
    modalMeta: "quiver reload",
    cardTitle: "Ammo",
    note: "Paladins default to power bolts, bolts, and arrows. Sorcerers stay idle until you define ammo names or thresholds here.",
    settingsOnly: false,
  },
  ringAutoReplace: {
    modalTitle: "Ring Amulet",
    modalMeta: "",
    cardTitle: "Ring Amulet",
    note: "",
    settingsOnly: false,
  },
  amuletAutoReplace: {
    modalTitle: "Amulet Replace",
    modalMeta: "bag refill",
    cardTitle: "Amulet Replace",
    note: "Empty slot -> selected amulet from open bags.",
    settingsOnly: false,
  },
  looting: {
    modalTitle: "Looting",
    modalMeta: "filters and routing",
    cardTitle: "Looting",
    note: "Empty keep list loots everything except blocked items.",
  },
  banking: {
    fallbackName: "Bank Rule",
    modalTitle: "Banking",
    modalMeta: "bank flows",
    cardTitle: "Banking",
    addLabel: "Add Rule",
    note: "Top-down priority. Match banker names only when needed.",
    multipleActiveSummary: "Active banking rules run top to bottom.",
    sections: [
      { title: "Priority", fields: ["label", "enabled"] },
      { title: "Banker", fields: ["bankerNames", "maxNpcDistance"] },
      { title: "Action", fields: ["operation", "amount", "reserveGold", "recipient"] },
      { title: "Safety Gates", fields: ["cooldownMs", "requireNoTargets", "requireStationary"] },
    ],
  },
  partyFollow: {
    modalTitle: "Follow Chain",
    modalMeta: "follow chain",
    cardTitle: "Follow Chain",
    note: "Build a chain from live tabs, seen players, or manual names. Slot 1 leads; each next slot follows the member above with its own role and fight stance.",
    settingsOnly: false,
  },
};

const MODULE_RULE_FIELD_LABELS = {
  label: "Rule name",
  enabled: "Rule active",
  deathHealVocation: "Vocation",
  deathHealWords: "Healing spell",
  deathHealHotkey: "Hotkey",
  deathHealHealthPercent: "HP threshold %",
  deathHealCooldownMs: "Repeat ms",
  words: "Spell words",
  hotkey: "Hotkey",
  minHealthPercent: "HP min %",
  maxHealthPercent: "HP max %",
  minMana: "Mana min",
  minManaPercent: "MP min %",
  maxManaPercent: "MP max %",
  maxTargetDistance: "Range max",
  minTargetCount: "Target count",
  minTargetDistance: "Range min",
  minMonsterCount: "Threat count",
  cooldownMs: "Cooldown ms",
  pattern: "Pattern",
  behavior: "Behavior",
  requireTarget: "Require target",
  dodgeBeams: "Dodge beams",
  dodgeWaves: "Dodge aligned waves",
  requireNoLight: "Only when dark",
  requireNoTargets: "Only with no target",
  requireStationary: "Only while idle",
  healerEmergencyHealthPercent: "Healing priority at/below HP %",
  healerRuneName: "Auto rune",
  healerRuneHotkey: "Auto rune hotkey",
  healerRuneHealthPercent: "Auto rune at/below HP %",
  potionHealerEnabled: "Enable potion healer",
  conditionHealerEnabled: "Enable condition healer",
  itemName: "Potion",
  condition: "Condition",
  bankerNames: "Banker names",
  operation: "Operation",
  amount: "Amount",
  reserveGold: "Reserve gold",
  recipient: "Recipient",
  maxNpcDistance: "Banker range",
  lootWhitelist: "Keep items",
  lootBlacklist: "Skip items",
  lootPreferredContainers: "Preferred containers",
  antiIdleIntervalMs: "Delay ms",
  autoEatFoodName: "Eat first",
  autoEatForbiddenFoodNames: "Never eat",
  autoEatCooldownMs: "Eat every ms",
  autoEatRequireNoTargets: "Only with no target",
  autoEatRequireStationary: "Only while idle",
  ammoPreferredNames: "Preferred ammo",
  ammoMinimumCount: "Minimum carried",
  ammoWarningCount: "Restock to",
  ammoReloadAtOrBelow: "Reload quiver at/below",
  ammoReloadCooldownMs: "Reload cooldown ms",
  ammoReloadEnabled: "Reload quiver",
  ammoRestockEnabled: "Restock in shop",
  ammoRequireNoTargets: "Only with no target",
  ammoRequireStationary: "Only while idle",
  alarmsPlayerEnabled: "Player alarm",
  alarmsPlayerRadiusSqm: "Player range sqm",
  alarmsPlayerFloorRange: "Player floors",
  alarmsStaffEnabled: "GM/GOD alarm",
  alarmsStaffRadiusSqm: "GM/GOD range sqm",
  alarmsStaffFloorRange: "GM/GOD floors",
  alarmsBlacklistEnabled: "Blacklist alarm",
  alarmsBlacklistRadiusSqm: "Blacklist range sqm",
  alarmsBlacklistFloorRange: "Blacklist floors",
  alarmsBlacklistNames: "Blacklist names",
  reconnectRetryDelayMs: "Retry delay ms",
  reconnectMaxAttempts: "Attempt limit",
  ringAutoReplaceItemName: "Replacement ring",
  ringAutoReplaceCooldownMs: "Repeat margin ms",
  ringAutoReplaceRequireNoTargets: "Only with no target",
  ringAutoReplaceRequireStationary: "Only while idle",
  amuletAutoReplaceItemName: "Replacement amulet",
  amuletAutoReplaceCooldownMs: "Repeat margin ms",
  amuletAutoReplaceRequireNoTargets: "Only with no target",
  amuletAutoReplaceRequireStationary: "Only while idle",
  trainerEscapeHealthPercent: "Escape HP %",
  trainerReconnectEnabled: "Reconnect while training",
  trainerPartnerName: "Partner name",
  trainerPartnerDistance: "Keep close sqm",
  trainerAutoPartyEnabled: "Auto party shield",
  trainerManaTrainerEnabled: "Trainer mana trainer",
  trainerManaTrainerWords: "Trainer mana spell",
  trainerManaTrainerHotkey: "Trainer mana hotkey",
  trainerManaTrainerManaPercent: "Open at mana %",
  trainerManaTrainerMinHealthPercent: "Min HP % for mana spell",
  trainerEscapeDistance: "Escape range",
  trainerEscapeCooldownMs: "Escape cooldown ms",
  partyFollowMembers: "Follow chain",
  partyFollowManualPlayers: "Manual players",
  partyFollowDistance: "Spacing sqm",
  partyFollowCombatMode: "Default stance",
};

const LOOTING_KEEP_SHORTCUTS = [
  { value: "potions", label: "Potions" },
  { value: "runes", label: "Runes" },
  { value: "food", label: "Food" },
  { value: "ammo", label: "Ammo" },
];

const LOOTING_ROUTE_SHORTCUTS = [
  { value: "Backpack", label: "Backpack" },
  { value: "Main Backpack", label: "Main Backpack" },
];

const EQUIPMENT_REPLACE_PICKERS = Object.freeze({
  ringAutoReplace: Object.freeze({
    slotKind: "ring",
    itemField: "ringAutoReplaceItemName",
    cooldownField: "ringAutoReplaceCooldownMs",
    requireNoTargetsField: "ringAutoReplaceRequireNoTargets",
    requireStationaryField: "ringAutoReplaceRequireStationary",
    anyLabel: "Any ring",
    liveEmpty: "No rings in open bags",
    catalogTitle: "All rings",
    catalog: Object.freeze([
      "axe ring",
      "club ring",
      "crystal ring",
      "dwarven ring",
      "emerald bangle",
      "energy ring",
      "gold ring",
      "life ring",
      "might ring",
      "power ring",
      "ring of healing",
      "ring of the sky",
      "ring of wishes",
      "stealth ring",
      "sword ring",
      "time ring",
      "wedding ring",
    ]),
  }),
  amuletAutoReplace: Object.freeze({
    slotKind: "amulet",
    itemField: "amuletAutoReplaceItemName",
    cooldownField: "amuletAutoReplaceCooldownMs",
    requireNoTargetsField: "amuletAutoReplaceRequireNoTargets",
    requireStationaryField: "amuletAutoReplaceRequireStationary",
    anyLabel: "Any amulet",
    liveEmpty: "No amulets in open bags",
    catalogTitle: "All amulets",
    catalog: Object.freeze([
      "amulet of loss",
      "ancient amulet",
      "ancient tiara",
      "broken amulet",
      "bronze amulet",
      "bronzen necklace",
      "crystal necklace",
      "demonbone amulet",
      "dragon necklace",
      "elven amulet",
      "garlic necklace",
      "golden amulet",
      "platinum amulet",
      "protection amulet",
      "ruby necklace",
      "scarab amulet",
      "scarf",
      "silver amulet",
      "silver necklace",
      "star amulet",
      "starlight amulet",
      "stone skin amulet",
      "strange symbol",
      "strange talisman",
      "wolf tooth chain",
    ]),
  }),
});

const EQUIPMENT_REPLACE_SLOT_TYPES = Object.freeze({
  ring: new Set(["ring"]),
  amulet: new Set(["amulet", "necklace", "scarf", "collar", "pendant"]),
});

const EQUIPMENT_REPLACE_NAME_KEYS = Object.freeze({
  ring: new Set(EQUIPMENT_REPLACE_PICKERS.ringAutoReplace.catalog.map((name) => name.toLowerCase())),
  amulet: new Set(EQUIPMENT_REPLACE_PICKERS.amuletAutoReplace.catalog.map((name) => name.toLowerCase())),
});

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}
const GENERATED_WAYPOINT_LABEL_PATTERN = /^(?:wp|auto|point|waypoint)\s*\d+$/i;
const WAYPOINT_TYPE_LABELS = {
  walk: "Walk",
  action: "Action",
  node: "Node",
  stand: "Stand",
  helper: "Helper",
  "safe-zone": "Safe Zone",
  avoid: "Avoid",
  "no-go-zone": "Avoid",
  "exit-zone": "Exit Zone",
  "stairs-up": "Go Up Stairs",
  "stairs-down": "Go Down Stairs",
  "use-item": "Use Item",
  bank: "Bank NPC",
  shop: "Shop NPC",
  "npc-action": "NPC Action",
  "daily-task": "Daily Task",
  ladder: "Ladder",
  "exani-tera": "Exani Tera Up",
  rope: "Rope Up",
  "shovel-hole": "Open Hole With Shovel",
};

const WAYPOINT_TYPE_HELP = {
  walk: "Walk: default movement waypoint. Use this for normal SQM-to-SQM routing.",
  action: "Action: route control waypoint. Use Restart Route to loop back to waypoint 1, or Go To Waypoint to jump to an earlier checkpoint marker.",
  node: "Node: classic cavebot checkpoint. Minibot currently walks it like a normal waypoint, but it stays tagged for route editing and future skip logic.",
  stand: "Stand: classic stop tile for stairs, doors, and teleports. Minibot keeps the marker type even when the movement target is the same SQM.",
  helper: "Helper: hidden recovery tile. Normal traversal skips it, but combat drift or blocked-route recovery can route through helper chains to rejoin the main loop.",
  "safe-zone": "Safe Zone: marks a defensive tile in the loop. Stored with the route and highlighted in the overlay.",
  avoid: "Avoid: skip marker. The walker ignores this waypoint and advances to the next usable point.",
  "no-go-zone": "Avoid: skip marker. The walker ignores this waypoint and advances to the next usable point.",
  "exit-zone": "Exit Zone: stops autowalk when the route reaches this waypoint.",
  "stairs-up": "Go Up Stairs: reaches the tile and waits for the floor change before advancing.",
  "stairs-down": "Go Down Stairs: reaches the tile and waits for the floor change before advancing.",
  "use-item": "Use Item: walks onto the tile when it is walkable, otherwise uses the map item from an adjacent SQM, then advances.",
  bank: "Bank NPC: reaches the tile and runs the configured banker dialogue before advancing.",
  shop: "Shop NPC: reaches the tile, opens the trade dialogue, and runs the refill buy/sell plan before advancing.",
  "npc-action": "NPC Action: reaches the tile and runs a configured progression action such as travel, residence, blessing, or promotion.",
  "daily-task": "Daily Task: reaches the tile and runs daily task accept or reward dialogue before advancing.",
  ladder: "Ladder: walks onto the tile when it is walkable, otherwise uses it from an adjacent SQM and waits for the floor change before advancing.",
  "exani-tera": "Exani Tera Up: reaches the tile, casts exani tera, and waits for the floor change before advancing.",
  rope: "Rope Up: walks onto the tile when it is walkable, otherwise uses rope from an adjacent SQM and waits for the floor change before advancing.",
  "shovel-hole": "Open Hole With Shovel: shovels the tile from an adjacent SQM when needed, then walks onto the opened hole and waits for the floor change.",
};

const WAYPOINT_ACTION_LABELS = {
  restart: "Restart Route",
  goto: "Go To Waypoint",
};

const TILE_RULE_POLICY_LABELS = {
  avoid: "Avoid",
  wait: "Wait",
};

const TILE_RULE_TRIGGER_LABELS = {
  approach: "Approach",
  enter: "Enter",
};

const TILE_RULE_SHAPE_LABELS = {
  tile: "Tile",
  rect: "Rectangle",
};

const TILE_RULE_POLICY_HELP = {
  avoid: "Avoid blocks matching tiles from route movement. Use this for stairs, traps, or no-go SQMs that should stay out of path targets.",
  wait: "Wait holds the route once per approach or entry, then releases after the wait time and cooldown gates are satisfied.",
};

const TARGET_PROFILE_DEFAULTS = Object.freeze({
  enabled: true,
  priority: 100,
  dangerLevel: 0,
  keepDistanceMin: 0,
  keepDistanceMax: 0,
  finishBelowPercent: 0,
  killMode: "normal",
  chaseMode: "auto",
  behavior: "hold",
  preferShootable: true,
  stickToTarget: true,
  avoidBeam: false,
  avoidWave: false,
});

const TARGET_PROFILE_KILL_MODE_LABELS = {
  normal: "Normal Focus",
  asap: "Burst First",
  last: "Save For Last",
};

const TARGET_PROFILE_BEHAVIOR_LABELS = {
  kite: "Kite",
  retreat: "Retreat",
  hold: "Hold",
  escape: "Run Away",
};

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (!input) return;

  const nextValue = value == null ? "" : String(value);
  if (input.value !== nextValue) {
    input.value = nextValue;
  }
}

function setCheckboxValue(id, value) {
  const input = document.getElementById(id);
  if (!input) return;

  const nextValue = Boolean(value);
  if (input.checked !== nextValue) {
    input.checked = nextValue;
  }
}

function getTrimmedFieldValue(id) {
  const input = document.getElementById(id);
  return String(input?.value ?? "").trim();
}

function getCheckboxValue(id, fallback = false) {
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
    return Boolean(fallback);
  }
  return input.checked;
}

function normalizeAvoidFieldCategories(value = null) {
  const normalized = {};
  for (const key of Object.keys(AVOID_FIELD_CATEGORY_LABELS)) {
    normalized[key] = true;
  }

  if (!value || typeof value !== "object") {
    return normalized;
  }

  for (const key of Object.keys(AVOID_FIELD_CATEGORY_LABELS)) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      normalized[key] = value[key] !== false;
    }
  }

  return normalized;
}

function getAvoidFieldDraft(fallbackOptions = state?.options || {}) {
  const categories = normalizeAvoidFieldCategories(fallbackOptions?.avoidFieldCategories);
  for (const [key, id] of Object.entries(AVOID_FIELD_CATEGORY_INPUT_IDS)) {
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) {
      categories[key] = input.checked;
    }
  }

  const payload = {
    avoidElementalFields: getCheckboxValue("avoidElementalFields", fallbackOptions?.avoidElementalFields),
    avoidFieldCategories: categories,
  };

  return payload;
}

function describeAvoidFieldSettings(options = state?.options || {}) {
  const categories = normalizeAvoidFieldCategories(options?.avoidFieldCategories);
  const enabledKeys = Object.keys(AVOID_FIELD_CATEGORY_LABELS)
    .filter((key) => categories[key] !== false);
  const labels = enabledKeys.map((key) => AVOID_FIELD_CATEGORY_LABELS[key]);

  if (options?.avoidElementalFields === false) {
    return {
      enabled: false,
      enabledKeys,
      labels,
      headline: "Fields live",
      detail: "Guard off.",
      routeCopy: "Guard off.",
    };
  }

  if (!enabledKeys.length) {
    return {
      enabled: true,
      enabledKeys,
      labels,
      headline: "No hazard lanes",
      detail: "Guard on / no groups.",
      routeCopy: "Guard on / no groups.",
    };
  }

  const preview = labels.slice(0, 3).join(", ");
  return {
    enabled: true,
    enabledKeys,
    labels,
    headline: `${enabledKeys.length} hazard lane${enabledKeys.length === 1 ? "" : "s"}`,
    detail: enabledKeys.length <= 3
      ? `Skip ${labels.join(", ")}.`
      : `Skip ${preview} +${enabledKeys.length - 3}.`,
    routeCopy: enabledKeys.length <= 3
      ? `Skip ${labels.join(", ")}.`
      : `Skip ${preview} +${enabledKeys.length - 3}.`,
  };
}

function renderAvoidFieldControls(options = state?.options || {}) {
  const summary = describeAvoidFieldSettings(options);
  const masterEnabled = options?.avoidElementalFields !== false;
  const categoryGrid = document.getElementById("route-avoid-category-grid");
  const categorySummary = document.getElementById("route-avoid-category-summary");
  const summaryCopy = document.getElementById("route-avoid-summary-copy");

  if (summaryCopy) {
    summaryCopy.textContent = summary.routeCopy;
  }
  if (categorySummary) {
    categorySummary.textContent = summary.detail;
  }
  if (categoryGrid) {
    categoryGrid.setAttribute("aria-disabled", masterEnabled ? "false" : "true");
  }

  for (const [key, id] of Object.entries(AVOID_FIELD_CATEGORY_INPUT_IDS)) {
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement)) continue;

    const enabled = options?.avoidFieldCategories?.[key] !== false;
    input.checked = enabled;
    input.disabled = !masterEnabled;
    input.setAttribute("aria-label", `${AVOID_FIELD_CATEGORY_LABELS[key]} hazard guard`);
  }
}

function getNumberFieldValue(id, {
  fallback = null,
  integer = true,
  minimum = null,
  maximum = null,
} = {}) {
  const input = document.getElementById(id);
  const rawValue = String(input?.value ?? "").trim();

  if (!rawValue) {
    return fallback;
  }

  let numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (integer) {
    numeric = Math.trunc(numeric);
  }

  if (minimum != null) {
    numeric = Math.max(minimum, numeric);
  }

  if (maximum != null) {
    numeric = Math.min(maximum, numeric);
  }

  return numeric;
}

function focusField(id) {
  const input = document.getElementById(id);
  if (input instanceof HTMLElement && !input.hasAttribute("disabled")) {
    input.focus();
  }
}

function getModalPanelName(name) {
  return isModuleModalName(name) ? "module" : name;
}

function isElementInsideModal(name, element = document.activeElement) {
  const modal = modalPanels.find((panel) => panel.dataset.modal === getModalPanelName(name));
  return Boolean(modal && element && modal.contains(element));
}

function getOpenModalPanel() {
  return modalPanels.find((panel) => panel.dataset.modal === getModalPanelName(activeModalName)) || null;
}

function setModalPanelState(panel, open) {
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const isOpen = Boolean(open);
  panel.classList.toggle("open", isOpen);
  panel.hidden = !isOpen;
  panel.setAttribute("aria-hidden", isOpen ? "false" : "true");

  if ("inert" in panel) {
    panel.inert = !isOpen;
  } else if (isOpen) {
    panel.removeAttribute("inert");
  } else {
    panel.setAttribute("inert", "");
  }
}

function syncModalPanels(openPanelName = null) {
  modalPanels.forEach((panel) => {
    setModalPanelState(panel, openPanelName != null && panel.dataset.modal === openPanelName);
  });
}

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => element instanceof HTMLElement && !element.hasAttribute("disabled"));
}

function syncModalState(open) {
  hideMainWindowHoverTooltip();
  modalLayer.hidden = !open;
  modalLayer.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("modal-open", open);

  if (!appShell) {
    return;
  }

  if ("inert" in appShell) {
    appShell.inert = open;
  } else if (open) {
    appShell.setAttribute("inert", "");
  } else {
    appShell.removeAttribute("inert");
  }

  if (open) {
    appShell.setAttribute("aria-hidden", "true");
  } else {
    appShell.removeAttribute("aria-hidden");
  }
}

function isTargetWatchDockFloatingLayout() {
  const viewportWidth = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 0;
  return viewportWidth > 1180;
}

function hasTargetWatchDockCustomPosition() {
  return Number.isFinite(targetWatchDockState.x) && Number.isFinite(targetWatchDockState.y);
}

function syncTargetWatchDockFlags() {
  const hasCustomPosition = hasTargetWatchDockCustomPosition();
  if (targetingLayout instanceof HTMLElement) {
    targetingLayout.dataset.watchDockCustom = hasCustomPosition ? "true" : "false";
  }
  if (targetWatchPanel instanceof HTMLElement) {
    targetWatchPanel.dataset.watchDockCustom = hasCustomPosition ? "true" : "false";
  }
}

function getTargetWatchDockRects() {
  if (!(targetingLayout instanceof HTMLElement) || !(targetWatchPanel instanceof HTMLElement)) {
    return null;
  }

  return {
    layoutRect: targetingLayout.getBoundingClientRect(),
    panelRect: targetWatchPanel.getBoundingClientRect(),
  };
}

function clampTargetWatchDockPosition(x, y) {
  const rects = getTargetWatchDockRects();
  if (!rects) {
    return {
      x: Math.max(0, Number(x) || 0),
      y: Math.max(0, Number(y) || 0),
    };
  }

  const panelWidth = rects.panelRect.width || targetWatchPanel.offsetWidth || 320;
  const panelHeight = rects.panelRect.height || targetWatchPanel.offsetHeight || 280;
  const maxX = Math.max(0, (rects.layoutRect.width || 0) - panelWidth);
  const maxY = Math.max(0, (rects.layoutRect.height || 0) - panelHeight);

  return {
    x: Math.min(Math.max(0, Number(x) || 0), maxX),
    y: Math.min(Math.max(0, Number(y) || 0), maxY),
  };
}

function getCurrentTargetWatchDockPosition() {
  if (hasTargetWatchDockCustomPosition()) {
    return {
      x: Number(targetWatchDockState.x) || 0,
      y: Number(targetWatchDockState.y) || 0,
    };
  }

  const rects = getTargetWatchDockRects();
  if (!rects) {
    return { x: 0, y: 0 };
  }

  return {
    x: (rects.panelRect.left || 0) - (rects.layoutRect.left || 0),
    y: (rects.panelRect.top || 0) - (rects.layoutRect.top || 0),
  };
}

function syncTargetWatchDockPosition({ clamp = false } = {}) {
  syncTargetWatchDockFlags();
  if (!(targetWatchPanel instanceof HTMLElement)) {
    return;
  }

  if (!isTargetWatchDockFloatingLayout()) {
    targetWatchPanel.style.left = "";
    targetWatchPanel.style.top = "";
    targetWatchPanel.style.right = "";
    return;
  }

  if (!hasTargetWatchDockCustomPosition()) {
    targetWatchPanel.style.left = "";
    targetWatchPanel.style.top = "";
    targetWatchPanel.style.right = "";
    return;
  }

  const nextPosition = clamp
    ? clampTargetWatchDockPosition(targetWatchDockState.x, targetWatchDockState.y)
    : {
      x: Number(targetWatchDockState.x) || 0,
      y: Number(targetWatchDockState.y) || 0,
    };
  targetWatchDockState.x = nextPosition.x;
  targetWatchDockState.y = nextPosition.y;
  targetWatchPanel.style.right = "auto";
  targetWatchPanel.style.left = `${Math.round(nextPosition.x)}px`;
  targetWatchPanel.style.top = `${Math.round(nextPosition.y)}px`;
}

function endTargetWatchDockDrag() {
  targetWatchDockState.dragging = false;
  document.removeEventListener("mousemove", handleTargetWatchDockDragMove);
  document.removeEventListener("mouseup", endTargetWatchDockDrag);
  targetWatchPanel?.classList.remove("dragging");
  document.body.classList.remove("target-watch-dragging");
  syncTargetWatchDockPosition({ clamp: true });
}

function handleTargetWatchDockDragMove(event) {
  if (!targetWatchDockState.dragging) {
    return;
  }

  const rects = getTargetWatchDockRects();
  if (!rects) {
    return;
  }

  const nextPosition = clampTargetWatchDockPosition(
    event.clientX - rects.layoutRect.left - targetWatchDockState.pointerOffsetX,
    event.clientY - rects.layoutRect.top - targetWatchDockState.pointerOffsetY,
  );
  targetWatchDockState.x = nextPosition.x;
  targetWatchDockState.y = nextPosition.y;
  syncTargetWatchDockPosition();
}

function beginTargetWatchDockDrag(event) {
  if (!(targetWatchPanel instanceof HTMLElement) || event.button !== 0 || !isTargetWatchDockFloatingLayout()) {
    return;
  }

  const rects = getTargetWatchDockRects();
  if (!rects) {
    return;
  }

  const currentPosition = getCurrentTargetWatchDockPosition();
  targetWatchDockState.pointerOffsetX = event.clientX - rects.panelRect.left;
  targetWatchDockState.pointerOffsetY = event.clientY - rects.panelRect.top;
  targetWatchDockState.x = currentPosition.x;
  targetWatchDockState.y = currentPosition.y;
  targetWatchDockState.dragging = true;
  targetWatchPanel.classList.add("dragging");
  document.body.classList.add("target-watch-dragging");
  document.addEventListener("mousemove", handleTargetWatchDockDragMove);
  document.addEventListener("mouseup", endTargetWatchDockDrag);
  syncTargetWatchDockPosition({ clamp: true });
  event.preventDefault();
}

function resetTargetWatchDockPosition() {
  targetWatchDockState.x = null;
  targetWatchDockState.y = null;
  targetWatchDockState.pointerOffsetX = 0;
  targetWatchDockState.pointerOffsetY = 0;
  syncTargetWatchDockPosition();
}

function trapActiveModalFocus(event) {
  const panel = getOpenModalPanel();
  if (!panel) {
    return;
  }

  const focusable = getFocusableElements(panel);
  if (!focusable.length) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const movingBackward = event.shiftKey;

  if (movingBackward && (active === first || !panel.contains(active))) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!movingBackward && (active === last || !panel.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function isActiveField(ids = []) {
  const active = document.activeElement;
  return ids.some((id) => document.getElementById(id) === active);
}

function isAutowalkSettingFieldActive() {
  return isActiveField(AUTOWALK_SETTING_FIELD_IDS);
}

function isRouteItemSharedFieldActive() {
  return isActiveField(ROUTE_ITEM_SHARED_FIELD_IDS);
}

function isWaypointEditorFieldActive() {
  return isActiveField(WAYPOINT_EDITOR_FIELD_IDS);
}

function isTileRuleEditorFieldActive() {
  return isActiveField(TILE_RULE_EDITOR_FIELD_IDS);
}

function resetAutowalkDraft({ route = true, waypoint = true, routeLibrary = false } = {}) {
  if (route) {
    autowalkDirty = false;
    targetingDirty = false;
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    targetProfilesRenderedKey = "";
    resetTargetingCombatDraft();
  }
  if (waypoint) {
    waypointEditorDirty = false;
    waypointEditorDirtyIndex = selectedWaypointIndex;
    waypointEditorDraft = null;
    tileRuleEditorDirty = false;
    tileRuleEditorDirtyIndex = selectedTileRuleIndex;
    tileRuleEditorDraft = null;
  }
  if (routeLibrary) {
    selectedRouteLibraryName = "";
  }
}

function getMarkedWaypointIndexes(waypoints = getWaypoints()) {
  const length = Array.isArray(waypoints) ? waypoints.length : 0;
  return [...markedWaypointIndexes]
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < length)
    .sort((a, b) => a - b);
}

function getMarkedWaypointCount(waypoints = getWaypoints()) {
  return getMarkedWaypointIndexes(waypoints).length;
}

function hasMarkedWaypoints(waypoints = getWaypoints()) {
  return getMarkedWaypointCount(waypoints) > 0;
}

function isWaypointMarked(index, waypoints = getWaypoints()) {
  return getMarkedWaypointIndexes(waypoints).includes(Math.max(0, Number(index) || 0));
}

function setMarkedWaypointIndexes(indexes = [], waypoints = getWaypoints()) {
  const previous = [...markedWaypointIndexes]
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index))
    .sort((a, b) => a - b);
  const next = new Set(
    (Array.isArray(indexes) ? indexes : [])
      .map((index) => Number(index))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < (Array.isArray(waypoints) ? waypoints.length : 0)),
  );
  const nextList = [...next].sort((a, b) => a - b);
  const changed = previous.length !== nextList.length || previous.some((index, offset) => index !== nextList[offset]);

  if (!changed) {
    return false;
  }

  markedWaypointIndexes = next;
  waypointListStructureRenderedKey = "";
  waypointListStateRenderedKey = "";
  routeLivePreviewRenderedKey = "";
  return true;
}

function clearMarkedWaypoints(waypoints = getWaypoints()) {
  return setMarkedWaypointIndexes([], waypoints);
}

function toggleMarkedWaypoint(index, waypoints = getWaypoints()) {
  const targetIndex = Math.max(0, Number(index) || 0);
  const next = new Set(getMarkedWaypointIndexes(waypoints));
  if (next.has(targetIndex)) {
    next.delete(targetIndex);
  } else {
    next.add(targetIndex);
  }
  return setMarkedWaypointIndexes([...next], waypoints);
}

function formatMarkedWaypointSummary(waypoints = getWaypoints()) {
  const indexes = getMarkedWaypointIndexes(waypoints);
  if (!indexes.length) {
    return "Mark route tiles to stage a batch delete.";
  }

  const preview = indexes
    .slice(0, 3)
    .map((index) => formatWaypointOrdinal(index))
    .join(", ");
  const remaining = Math.max(0, indexes.length - 3);
  return `${indexes.length} waypoint${indexes.length === 1 ? "" : "s"} marked for batch delete${preview ? `: ${preview}${remaining ? ` +${remaining}` : ""}` : ""}.`;
}

function getOverlayFocusIndex(waypoints = state?.options?.waypoints || [], sourceState = state) {
  if (!waypoints.length) return null;
  if (shouldSuppressLiveWaypointHighlights(sourceState)) {
    return null;
  }
  if (
    Number.isInteger(sourceState?.overlayFocusIndex)
    && sourceState.overlayFocusIndex >= 0
    && sourceState.overlayFocusIndex < waypoints.length
  ) {
    return sourceState.overlayFocusIndex;
  }
  return Math.max(0, Math.min(sourceState?.routeIndex || 0, waypoints.length - 1));
}

function getWaypointIdentityKey(waypoint, index = 0) {
  if (!waypoint) return "";
  return [
    index,
    waypoint.x,
    waypoint.y,
    waypoint.z,
    waypoint.label,
    waypoint.type,
    waypoint.action,
    waypoint.targetIndex,
    waypoint.radius,
  ].join(":");
}

function clearRouteLiveResumeTarget() {
  routeLiveResumeTargetKey = "";
}

function markRouteLiveResumeTarget(index, waypoints = getWaypoints()) {
  const boundedIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(0, waypoints.length - 1)));
  routeLiveResumeTargetKey = getWaypointIdentityKey(waypoints[boundedIndex], boundedIndex);
}

function isRouteLiveResumeTarget(waypoint, index = 0) {
  return Boolean(routeLiveResumeTargetKey)
    && index === selectedWaypointIndex
    && getWaypointIdentityKey(waypoint, index) === routeLiveResumeTargetKey;
}

function formatPosition(pos) {
  if (!pos) return "-";
  return `${pos.x},${pos.y},${pos.z}`;
}

function formatWaypointOrdinal(index) {
  return String(Math.max(0, Number(index) || 0) + 1).padStart(3, "0");
}

function isGeneratedWaypointLabel(label = "") {
  return GENERATED_WAYPOINT_LABEL_PATTERN.test(String(label || "").trim());
}

function getWaypointTypeLabel(type = "walk") {
  return WAYPOINT_TYPE_LABELS[String(type || "walk").trim().toLowerCase()] || "Walk";
}

function normalizeWaypointActionType(action = "restart") {
  const normalized = String(action || "").trim().toLowerCase();
  return Object.hasOwn(WAYPOINT_ACTION_LABELS, normalized) ? normalized : "restart";
}

function normalizeWaypointTargetIndex(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.trunc(parsed);
}

function getWaypointActionLabel(action = "restart") {
  return WAYPOINT_ACTION_LABELS[normalizeWaypointActionType(action)] || WAYPOINT_ACTION_LABELS.restart;
}

function getWaypointActionTarget(waypoint, waypoints = getWaypoints()) {
  const targetIndex = normalizeWaypointTargetIndex(waypoint?.targetIndex);
  if (targetIndex == null || targetIndex < 0 || targetIndex >= waypoints.length) {
    return null;
  }

  return {
    index: targetIndex,
    waypoint: waypoints[targetIndex] || null,
  };
}

function formatWaypointActionMeta(waypoint, waypoints = getWaypoints()) {
  if (!waypoint || String(waypoint.type || "").trim().toLowerCase() !== "action") {
    return "";
  }

  const actionType = normalizeWaypointActionType(waypoint.action);
  if (actionType === "restart") {
    return "restart route";
  }

  const target = getWaypointActionTarget(waypoint, waypoints);
  if (!target) {
    return "jump target missing";
  }

  return `jump wp ${target.index + 1}`;
}

function getWaypointDisplayLabel(waypoint, index = 0) {
  const label = String(waypoint?.label || "").trim();
  if (!label || isGeneratedWaypointLabel(label)) {
    return `Waypoint ${formatWaypointOrdinal(index)}`;
  }

  return label;
}

function formatWaypointHeading(waypoint, index = 0) {
  return `${formatWaypointOrdinal(index)}. ${getWaypointDisplayLabel(waypoint, index)}`;
}

function formatWaypointMeta(waypoint) {
  if (!waypoint) return "-";

  const parts = [formatPosition(waypoint), getWaypointTypeLabel(waypoint.type)];
  const actionMeta = formatWaypointActionMeta(waypoint);
  if (actionMeta) {
    parts.push(actionMeta);
  }
  const radius = Number(waypoint.radius);
  if (Number.isFinite(radius) && radius > 0) {
    parts.push(`r ${Math.trunc(radius)}`);
  }

  return parts.join(" / ");
}

function getWaypointCardTone(type = "walk") {
  const normalizedType = String(type || "walk").trim().toLowerCase();
  if (normalizedType === "action" || normalizedType === "use-item" || normalizedType === "bank") {
    return "utility";
  }
  if (
    normalizedType === "stairs-up"
    || normalizedType === "stairs-down"
    || normalizedType === "ladder"
    || normalizedType === "exani-tera"
    || normalizedType === "rope"
    || normalizedType === "shovel-hole"
  ) {
    return "floor";
  }
  if (
    normalizedType === "safe-zone"
    || normalizedType === "node"
    || normalizedType === "stand"
    || normalizedType === "helper"
  ) {
    return "anchor";
  }
  if (normalizedType === "avoid" || normalizedType === "no-go-zone" || normalizedType === "exit-zone") {
    return "danger";
  }
  return "";
}

function formatWaypointCardDetail(waypoint, waypoints = getWaypoints()) {
  if (!waypoint) return "-";

  const normalizedType = String(waypoint.type || "walk").trim().toLowerCase();
  let detail = getWaypointTypeLabel(normalizedType);

  if (normalizedType === "action") {
    const actionType = normalizeWaypointActionType(waypoint.action);
    detail = getWaypointActionLabel(actionType);
    if (actionType === "goto") {
      const target = getWaypointActionTarget(waypoint, waypoints);
      if (target) {
        detail = `${detail} ${formatWaypointOrdinal(target.index)}`;
      }
    }
  }

  const radius = Number(waypoint.radius);
  if (Number.isFinite(radius) && radius > 0) {
    detail = `${detail} / r${Math.trunc(radius)}`;
  }

  return detail;
}

function renderWaypointTypePill(type = "walk") {
  return `<span class="waypoint-pill waypoint-type-pill">${escapeHtml(getWaypointTypeLabel(type))}</span>`;
}

function renderWaypointStatePills(index, focusIndex = null) {
  const pills = [];
  if (!shouldSuppressLiveWaypointHighlights() && index === state?.routeIndex) {
    pills.push('<span class="waypoint-pill waypoint-state-pill current">Next</span>');
  }
  if (!shouldSuppressLiveWaypointHighlights() && index === focusIndex && index !== state?.routeIndex) {
    pills.push('<span class="waypoint-pill waypoint-state-pill focus">Focus</span>');
  }
  if (index === selectedWaypointIndex) {
    pills.push('<span class="waypoint-pill waypoint-state-pill selected">Edit</span>');
  }
  return pills.join("");
}

function renderWaypointCardStatePills(index, focusIndex = null, { resumeTarget = false } = {}) {
  if (resumeTarget) {
    return '<span class="waypoint-pill waypoint-state-pill resume-target">Target</span>';
  }
  if (!shouldSuppressLiveWaypointHighlights() && index === state?.routeIndex) {
    return '<span class="waypoint-pill waypoint-state-pill current">Next</span>';
  }
  if (index === selectedWaypointIndex) {
    return '<span class="waypoint-pill waypoint-state-pill selected">Edit</span>';
  }
  if (!shouldSuppressLiveWaypointHighlights() && index === focusIndex) {
    return '<span class="waypoint-pill waypoint-state-pill focus">Focus</span>';
  }
  return "";
}

function getRouteLivePreviewRenderKey(waypoints = getWaypoints()) {
  const waypointKey = waypoints
    .map((waypoint, index) => getWaypointIdentityKey(waypoint, index))
    .join("|");
  const markedKey = getMarkedWaypointIndexes(waypoints).join(",");

  return [
    state?.routeIndex ?? -1,
    state?.overlayFocusIndex ?? -1,
    shouldSuppressLiveWaypointHighlights() ? "reset-returning" : "live-highlight",
    selectedWaypointIndex,
    markedKey,
    routeLiveResumeTargetKey,
    state?.binding?.profileKey || "",
    "preview",
    waypointKey,
  ].join("::");
}

function syncRouteLivePreviewVisibility(waypoints = getWaypoints()) {
  const waypointCount = Array.isArray(waypoints) ? waypoints.length : 0;
  const collapsed = Boolean(routeLivePreviewCollapsed);

  if (routeLivePreviewShell) {
    routeLivePreviewShell.dataset.collapsed = collapsed ? "true" : "false";
  }

  if (routeLivePreviewToggleButton instanceof HTMLElement) {
    const label = collapsed ? "Show Grid" : "Hide Grid";
    const title = collapsed
      ? `Show the live route grid. ${waypointCount} waypoint${waypointCount === 1 ? "" : "s"} loaded.`
      : "Hide the live route grid for a lighter desk view.";
    routeLivePreviewToggleButton.textContent = label;
    routeLivePreviewToggleButton.classList.toggle("active", collapsed);
    routeLivePreviewToggleButton.setAttribute("aria-pressed", collapsed ? "true" : "false");
    routeLivePreviewToggleButton.dataset.titleDefault = title;
    routeLivePreviewToggleButton.title = title;
    routeLivePreviewToggleButton.setAttribute("aria-label", title);
  }

  if (routeLivePreviewCollapsedNote instanceof HTMLElement) {
    const note = collapsed
      ? waypointCount
        ? `Live route grid hidden. ${waypointCount} waypoint${waypointCount === 1 ? "" : "s"} still loaded.`
        : "Live route grid hidden. No waypoints in route."
      : "";
    routeLivePreviewCollapsedNote.hidden = !collapsed;
    routeLivePreviewCollapsedNote.textContent = note || "Live route grid hidden.";
    routeLivePreviewCollapsedNote.title = note;
  }

  if (routeOverviewFields.preview instanceof HTMLElement) {
    routeOverviewFields.preview.hidden = collapsed;
    routeOverviewFields.preview.setAttribute("aria-hidden", collapsed ? "true" : "false");
  }
}

function setRouteLivePreviewCollapsed(nextCollapsed) {
  const collapsed = Boolean(nextCollapsed);
  if (routeLivePreviewCollapsed === collapsed) {
    return;
  }

  routeLivePreviewCollapsed = collapsed;
  routeLivePreviewRenderedKey = "";
  markMainWindowTooltipsDirty();
  render();
}

function renderRouteLivePreview(waypoints = getWaypoints()) {
  const preview = routeOverviewFields.preview;
  syncRouteLivePreviewVisibility(waypoints);
  if (!preview) return;

  if (routeLivePreviewCollapsed) {
    const collapsedKey = `collapsed::${waypoints.length}`;
    if (routeLivePreviewRenderedKey !== collapsedKey) {
      preview.innerHTML = "";
      routeLivePreviewRenderedKey = collapsedKey;
      markMainWindowTooltipsDirty();
    }
    return;
  }

  const renderKey = getRouteLivePreviewRenderKey(waypoints);
  if (routeLivePreviewRenderedKey === renderKey) {
    return;
  }

  const previousScrollTop = preview.scrollTop;
  const previousScrollLeft = preview.scrollLeft;
  const focusIndex = getOverlayFocusIndex(waypoints);
  const suppressLiveHighlights = shouldSuppressLiveWaypointHighlights();

  preview.innerHTML = waypoints.length
    ? waypoints
      .map((waypoint, index) => {
        const isCurrent = !suppressLiveHighlights && index === state?.routeIndex;
        const isFocus = !suppressLiveHighlights && index === focusIndex;
        const isSelected = index === selectedWaypointIndex;
        const isMarked = isWaypointMarked(index, waypoints);
        const isResumeTarget = isRouteLiveResumeTarget(waypoint, index);
        const tone = getWaypointCardTone(waypoint.type);
        const detail = formatWaypointCardDetail(waypoint, waypoints);
        const heading = formatWaypointHeading(waypoint, index);
        const title = `${heading} / ${formatWaypointMeta(waypoint)} / Click opens editor / Right-click resumes route / Mark stages batch delete / + inserts your live tile before / x removes`;

        return `
          <article
            class="waypoint-chip route-live-waypoint ${isCurrent ? "current active" : ""} ${isFocus ? "focus" : ""} ${isSelected ? "selected" : ""} ${isMarked ? "marked" : ""} ${isResumeTarget ? "resume-target" : ""}"
            data-route-preview-index="${index}"
            title="${escapeHtml(title)}"
            ${tone ? `data-tone="${tone}"` : ""}
          >
            <button
              type="button"
              class="route-live-waypoint-main"
              data-route-preview-index="${index}"
              aria-pressed="${isSelected ? "true" : "false"}"
              aria-label="${escapeHtml(`${heading}. Click to edit this waypoint.`)}"
              title="${escapeHtml(title)}"
            >
              <div class="waypoint-chip-top">
                <span class="waypoint-chip-index">${formatWaypointOrdinal(index)}</span>
                <div class="waypoint-chip-flags">
                  ${renderWaypointCardStatePills(index, focusIndex, { resumeTarget: isResumeTarget })}
                </div>
              </div>
              <strong>${escapeHtml(getWaypointDisplayLabel(waypoint, index))}</strong>
              <span class="waypoint-chip-position">${escapeHtml(formatPosition(waypoint))}</span>
              <span class="waypoint-chip-detail">${escapeHtml(detail)}</span>
            </button>
            <div class="route-live-waypoint-actions">
              <button
                type="button"
                class="btn route-live-mini-btn route-live-mini-btn-mark"
                data-route-preview-mark="${index}"
                aria-pressed="${isMarked ? "true" : "false"}"
                aria-label="${escapeHtml(`${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`)}"
                title="${escapeHtml(`${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`)}"
              >M</button>
              <button
                type="button"
                class="btn route-live-mini-btn route-live-mini-btn-add"
                data-route-preview-insert="${index}"
                aria-label="${escapeHtml(`Insert your live tile before ${heading}`)}"
                title="${escapeHtml(`Insert your live tile before ${heading}`)}"
              >+</button>
              <button
                type="button"
                class="btn route-live-mini-btn route-live-mini-btn-remove"
                data-route-preview-remove="${index}"
                aria-label="${escapeHtml(`Remove ${heading}`)}"
                title="${escapeHtml(`Remove ${heading}`)}"
              >x</button>
            </div>
          </article>
        `;
      })
      .join("")
    : '<div class="empty-state">No live waypoints in route</div>';

  preview.scrollTop = previousScrollTop;
  preview.scrollLeft = previousScrollLeft;
  routeLivePreviewRenderedKey = renderKey;
  markMainWindowTooltipsDirty();
}

function normalizeTileRulePolicy(policy = "avoid") {
  const normalized = String(policy || "avoid").trim().toLowerCase();
  return Object.hasOwn(TILE_RULE_POLICY_LABELS, normalized) ? normalized : "avoid";
}

function normalizeTileRuleTrigger(trigger = "approach") {
  const normalized = String(trigger || "approach").trim().toLowerCase();
  return Object.hasOwn(TILE_RULE_TRIGGER_LABELS, normalized) ? normalized : "approach";
}

function normalizeTileRuleShape(shape = "tile") {
  const normalized = String(shape || "tile").trim().toLowerCase();
  return Object.hasOwn(TILE_RULE_SHAPE_LABELS, normalized) ? normalized : "tile";
}

function normalizeTileRuleExactness(exactness = "exact") {
  return String(exactness || "exact").trim().toLowerCase() === "vicinity" ? "vicinity" : "exact";
}

function getTileRulePolicyLabel(policy = "avoid") {
  return TILE_RULE_POLICY_LABELS[normalizeTileRulePolicy(policy)] || TILE_RULE_POLICY_LABELS.avoid;
}

function getTileRuleTriggerLabel(trigger = "approach") {
  return TILE_RULE_TRIGGER_LABELS[normalizeTileRuleTrigger(trigger)] || TILE_RULE_TRIGGER_LABELS.approach;
}

function getTileRuleShapeLabel(shape = "tile") {
  return TILE_RULE_SHAPE_LABELS[normalizeTileRuleShape(shape)] || TILE_RULE_SHAPE_LABELS.tile;
}

function getTileRuleDisplayLabel(rule, index = 0) {
  const label = String(rule?.label || "").trim();
  return label || `Tile Rule ${formatWaypointOrdinal(index)}`;
}

function formatTileRuleMeta(rule) {
  if (!rule) return "-";

  const shape = normalizeTileRuleShape(rule.shape);
  const size = shape === "rect"
    ? `${Math.max(1, Number(rule.width) || 1)}x${Math.max(1, Number(rule.height) || 1)}`
    : "1x1";
  const parts = [
    formatPosition(rule),
    getTileRulePolicyLabel(rule.policy),
    getTileRuleTriggerLabel(rule.trigger),
    getTileRuleShapeLabel(shape),
    size,
  ];

  if (normalizeTileRulePolicy(rule.policy) === "wait") {
    parts.push(`${Math.max(0, Number(rule.waitMs) || 0)} ms`);
  }

  return parts.join(" / ");
}

function normalizeMonsterNames(value) {
  const collected = [];

  const append = (entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(append);
      return;
    }

    for (const part of String(entry ?? "").split(/[\n,;]+/)) {
      const name = part.trim();
      if (name) {
        collected.push(name);
      }
    }
  };

  append(value?.monsterNames ?? value?.monster ?? value);

  const unique = [];
  const seen = new Set();

  for (const name of collected) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }

  return unique;
}

function buildKnownTargetMonsterNameKeys(monsterNames = []) {
  const knownNames = new Set();

  for (const name of normalizeMonsterNames(monsterNames)) {
    const key = name.toLowerCase();
    if (!key) continue;
    knownNames.add(key);
    if (!/^alpha\s+/i.test(name)) {
      knownNames.add(`alpha ${key}`);
    }
  }

  return knownNames;
}

function getKnownTargetMonsterNameKeys() {
  return buildKnownTargetMonsterNameKeys(
    Array.isArray(state?.monsterCatalogNames) && state.monsterCatalogNames.length
      ? state.monsterCatalogNames
      : getHuntPresets().map((preset) => preset?.monsterName),
  );
}

function isKnownTargetMonsterName(name = "") {
  const key = String(name || "").trim().toLowerCase();
  if (!key) {
    return false;
  }

  const knownNames = getKnownTargetMonsterNameKeys();
  return knownNames.size
    ? knownNames.has(key)
    : true;
}

function sanitizeTargetMonsterNames(value) {
  return normalizeMonsterNames(value).filter((name) => isKnownTargetMonsterName(name));
}

function compareDisplayNames(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function sortMonsterNames(value) {
  return normalizeMonsterNames(value).sort(compareDisplayNames);
}

function getCreatureRegistrySearchQuery() {
  return String(creatureRegistrySearch?.value || "").trim().toLowerCase();
}

function getCreatureRegistrySearchTerms(query = getCreatureRegistrySearchQuery()) {
  return String(query || "")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function matchesCreatureRegistrySearch(name = "", terms = getCreatureRegistrySearchTerms()) {
  if (!terms.length) {
    return true;
  }

  const key = String(name || "").trim().toLowerCase();
  return terms.every((term) => key.includes(term));
}

function filterNamesByCreatureRegistrySearch(names = [], terms = getCreatureRegistrySearchTerms()) {
  return normalizeMonsterNames(names).filter((name) => matchesCreatureRegistrySearch(name, terms));
}

function filterCreatureRegistryEntriesBySearch(entries = [], terms = getCreatureRegistrySearchTerms()) {
  if (!terms.length) {
    return entries;
  }

  return entries.filter((entry) => matchesCreatureRegistrySearch(entry?.name, terms));
}

function formatCreatureSearchEmptyState(defaultLabel = "No entries yet", query = getCreatureRegistrySearchQuery()) {
  const trimmed = String(query || "").trim();
  return trimmed
    ? `No matches for "${trimmed}"`
    : defaultLabel;
}

function normalizeEquipmentReplaceName(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getEquipmentReplaceConfig(moduleKey) {
  return EQUIPMENT_REPLACE_PICKERS[moduleKey] || null;
}

function getEquipmentReplaceSelectionLabel(moduleKey, value) {
  const config = getEquipmentReplaceConfig(moduleKey);
  const selectedName = normalizeEquipmentReplaceName(value);
  if (!config) {
    return selectedName || "Any";
  }
  return selectedName || config.anyLabel;
}

function getEquipmentReplaceGateSummary(moduleKey, modulesState = ensureModulesDraft()) {
  const config = getEquipmentReplaceConfig(moduleKey);
  if (!config) return "open";

  const requireNoTargets = modulesState?.[config.requireNoTargetsField] === true;
  const requireStationary = modulesState?.[config.requireStationaryField] === true;
  if (requireNoTargets && requireStationary) return "clear / idle";
  if (requireNoTargets) return "clear";
  if (requireStationary) return "idle";
  return "open";
}

function isEquipmentReplaceItem(slotKind, item = {}) {
  const normalizedSlotKind = String(slotKind || "").trim().toLowerCase() === "amulet" ? "amulet" : "ring";
  const name = normalizeEquipmentReplaceName(item?.name);
  const nameKey = name.toLowerCase();
  const slotType = normalizeEquipmentReplaceName(item?.slotType).toLowerCase();
  if (slotType && EQUIPMENT_REPLACE_SLOT_TYPES[normalizedSlotKind]?.has(slotType)) {
    return true;
  }
  if (nameKey && EQUIPMENT_REPLACE_NAME_KEYS[normalizedSlotKind]?.has(nameKey)) {
    return true;
  }
  return normalizedSlotKind === "ring"
    ? /\b(?:ring|bangle)\b/i.test(name)
    : /\b(?:amulet|necklace|scarf|collar|pendant|chain|symbol|talisman|tiara)\b/i.test(name);
}

function getEquipmentReplaceLiveChoices(moduleKey, snapshot = state?.snapshot) {
  const config = getEquipmentReplaceConfig(moduleKey);
  if (!config) return [];

  const containers = Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [];
  const seen = new Set();
  const choices = [];

  containers.forEach((container) => {
    (container?.slots || []).forEach((entry) => {
      const name = normalizeEquipmentReplaceName(entry?.item?.name);
      if (!name || !isEquipmentReplaceItem(config.slotKind, entry?.item)) {
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      choices.push(name);
    });
  });

  return choices.sort(compareDisplayNames);
}

function getEquipmentReplaceLiveChoiceSignature(moduleKey, snapshot = state?.snapshot) {
  return getEquipmentReplaceLiveChoices(moduleKey, snapshot).join("|");
}

function getEquipmentReplaceEnabled(moduleKey, modulesState = ensureModulesDraft()) {
  return Boolean(modulesState?.[`${moduleKey}Enabled`]);
}

function getEquipmentReplaceCombinedEnabled(modulesState = ensureModulesDraft()) {
  return getEquipmentReplaceEnabled("ringAutoReplace", modulesState)
    || getEquipmentReplaceEnabled("amuletAutoReplace", modulesState);
}

function getEquipmentReplaceCombinedStatus(modulesState = ensureModulesDraft()) {
  const activeKeys = ["ringAutoReplace", "amuletAutoReplace"]
    .filter((moduleKey) => getEquipmentReplaceEnabled(moduleKey, modulesState));
  return {
    activeKeys,
    enabledCount: activeKeys.length,
    activeLabel: activeKeys.length
      ? `${activeKeys.length} armed`
      : "Off",
  };
}

function formatEquipmentReplaceSectionLine(moduleKey, modulesState = ensureModulesDraft(), prefix = "") {
  const label = prefix || (getEquipmentReplaceConfig(moduleKey)?.slotKind === "amulet" ? "Amulet" : "Ring");
  const itemName = getEquipmentReplaceSelectionLabel(moduleKey, modulesState?.[getEquipmentReplaceConfig(moduleKey)?.itemField]);
  const gates = getEquipmentReplaceGateSummary(moduleKey, modulesState);
  const repeatMargin = formatDurationMs(modulesState?.[getEquipmentReplaceConfig(moduleKey)?.cooldownField]);
  return getEquipmentReplaceEnabled(moduleKey, modulesState)
    ? `${label} ${itemName} / ${repeatMargin} / ${gates}`
    : `${label} off / ${itemName}`;
}

function renderEquipmentReplaceChoiceButtons(moduleKey, choices = [], selectedName = "") {
  const selectedKey = normalizeEquipmentReplaceName(selectedName).toLowerCase();

  return choices.map((choice) => {
    const selected = choice.toLowerCase() === selectedKey;
    return `
      <button
        type="button"
        class="equipment-replace-choice ${selected ? "active" : ""}"
        data-equipment-replace-choice-module="${escapeAttributeValue(moduleKey)}"
        data-equipment-replace-value="${escapeAttributeValue(choice)}"
        aria-pressed="${selected ? "true" : "false"}"
      >
        ${escapeHtml(choice)}
      </button>
    `;
  }).join("");
}

function renderEquipmentReplaceSlotFields(moduleKey, modulesState = ensureModulesDraft(), {
  showPowerToggle = false,
} = {}) {
  const config = getEquipmentReplaceConfig(moduleKey);
  if (!config) return "";

  const selectedName = normalizeEquipmentReplaceName(modulesState?.[config.itemField]);
  const selectedLabel = getEquipmentReplaceSelectionLabel(moduleKey, selectedName);
  const liveChoices = getEquipmentReplaceLiveChoices(moduleKey, state?.snapshot);
  const allChoices = Array.from(new Set([selectedName, ...config.catalog].filter(Boolean))).sort(compareDisplayNames);
  const hiddenInputData = `data-module-key="${moduleKey}" data-module-option-field="${config.itemField}"`;
  const cooldownValue = escapeHtml(formatFieldValueForInput(modulesState?.[config.cooldownField], { type: "number" }));
  const retryLabel = formatDurationMs(modulesState?.[config.cooldownField]);
  const enabled = getEquipmentReplaceEnabled(moduleKey, modulesState);
  const slotLabel = config.slotKind === "amulet" ? "Amulet" : "Ring";

  return `
    <section class="equipment-replace-slot ${enabled ? "" : "is-off"}" data-slot-kind="${escapeAttributeValue(config.slotKind)}">
      <div class="equipment-replace-slot-head">
        <div class="equipment-replace-slot-copy">
          <strong>${escapeHtml(slotLabel)}</strong>
          <span>${escapeHtml(selectedLabel)}</span>
        </div>
        ${showPowerToggle ? `
          <label class="equipment-replace-power">
            <input
              type="checkbox"
              ${enabled ? "checked" : ""}
              data-module-key="${moduleKey}"
              data-module-option-field="${moduleKey}Enabled"
            />
            <span>${enabled ? "Armed" : "Off"}</span>
          </label>
        ` : ""}
      </div>
      <div class="equipment-replace-shell" data-slot-kind="${escapeAttributeValue(config.slotKind)}">
      <input type="hidden" value="${escapeHtml(selectedName)}" ${hiddenInputData} />
      <section class="equipment-replace-overview">
        <article class="equipment-replace-stat">
          <span>Pick</span>
          <strong>${escapeHtml(selectedLabel)}</strong>
        </article>
        <article class="equipment-replace-stat">
          <span>Bag</span>
          <strong>${String(liveChoices.length)}</strong>
        </article>
        <article class="equipment-replace-stat">
          <span>Retry</span>
          <strong>${escapeHtml(retryLabel)}</strong>
        </article>
      </section>
      <div class="equipment-replace-layout">
        <section class="equipment-replace-panel">
          <div class="equipment-replace-panel-head">
            <strong>Bag</strong>
            <span>${String(liveChoices.length)}</span>
          </div>
          <div class="equipment-replace-chip-grid">
            ${liveChoices.length
      ? renderEquipmentReplaceChoiceButtons(moduleKey, liveChoices, selectedName)
      : `<div class="equipment-replace-empty">${escapeHtml(config.liveEmpty)}</div>`}
          </div>
        </section>
        <section class="equipment-replace-panel">
          <div class="equipment-replace-panel-head">
            <strong>Pool</strong>
            <span>${String(allChoices.length + 1)}</span>
          </div>
          <div class="equipment-replace-chip-grid">
            <button
              type="button"
              class="equipment-replace-choice ${selectedName ? "" : "active"}"
              data-equipment-replace-choice-module="${escapeAttributeValue(moduleKey)}"
              data-equipment-replace-value=""
              aria-pressed="${selectedName ? "false" : "true"}"
            >
              ${escapeHtml(config.anyLabel)}
            </button>
            ${renderEquipmentReplaceChoiceButtons(moduleKey, allChoices, selectedName)}
          </div>
        </section>
      </div>
      <section class="equipment-replace-controls">
        <label class="equipment-replace-field">
          <span>Repeat margin</span>
          <input
            type="number"
            inputmode="numeric"
            value="${cooldownValue}"
            data-module-key="${moduleKey}"
            data-module-option-field="${config.cooldownField}"
          />
        </label>
        <label class="equipment-replace-toggle">
          <input
            type="checkbox"
            ${modulesState?.[config.requireNoTargetsField] ? "checked" : ""}
            data-module-key="${moduleKey}"
            data-module-option-field="${config.requireNoTargetsField}"
          />
          <span>No target</span>
        </label>
        <label class="equipment-replace-toggle">
          <input
            type="checkbox"
            ${modulesState?.[config.requireStationaryField] ? "checked" : ""}
            data-module-key="${moduleKey}"
            data-module-option-field="${config.requireStationaryField}"
          />
          <span>Idle only</span>
        </label>
      </section>
      </div>
    </section>
  `;
}

function renderEquipmentReplaceFields(moduleKey, modulesState = ensureModulesDraft()) {
  if (moduleKey !== "ringAutoReplace") {
    return renderEquipmentReplaceSlotFields(moduleKey, modulesState);
  }

  return `
    <div class="equipment-replace-workbench">
      <div class="equipment-replace-slot-grid">
        ${renderEquipmentReplaceSlotFields("ringAutoReplace", modulesState, { showPowerToggle: true })}
        ${renderEquipmentReplaceSlotFields("amuletAutoReplace", modulesState, { showPowerToggle: true })}
      </div>
    </div>
  `;
}

function normalizeTargetProfile(profile = {}, fallbackName = "") {
  const name = String(profile?.name || fallbackName || "").trim();
  const keepDistanceMin = Math.max(0, Number(profile?.keepDistanceMin ?? TARGET_PROFILE_DEFAULTS.keepDistanceMin) || 0);
  const keepDistanceMaxRaw = Math.max(0, Number(profile?.keepDistanceMax ?? TARGET_PROFILE_DEFAULTS.keepDistanceMax) || 0);
  const keepDistanceMax = Math.max(keepDistanceMin, keepDistanceMaxRaw);
  const priority = Math.max(0, Number(profile?.priority ?? TARGET_PROFILE_DEFAULTS.priority) || 0);
  const dangerLevel = Math.max(0, Math.min(10, Number(profile?.dangerLevel ?? TARGET_PROFILE_DEFAULTS.dangerLevel) || 0));
  const finishBelowPercent = Math.max(0, Math.min(100, Number(profile?.finishBelowPercent ?? TARGET_PROFILE_DEFAULTS.finishBelowPercent) || 0));
  const killMode = TARGET_PROFILE_KILL_MODE_LABELS[String(profile?.killMode || "").trim().toLowerCase()]
    ? String(profile.killMode).trim().toLowerCase()
    : TARGET_PROFILE_DEFAULTS.killMode;
  const chaseMode = normalizeCombatStanceValue(
    profile?.chaseMode ?? profile?.stance ?? profile?.chaseStance,
    TARGET_PROFILE_DEFAULTS.chaseMode,
  );
  const behavior = TARGET_PROFILE_BEHAVIOR_LABELS[String(profile?.behavior || "").trim().toLowerCase()]
    ? String(profile.behavior).trim().toLowerCase()
    : TARGET_PROFILE_DEFAULTS.behavior;

  return {
    enabled: profile?.enabled !== false,
    name,
    priority,
    dangerLevel,
    keepDistanceMin,
    keepDistanceMax,
    finishBelowPercent,
    killMode,
    chaseMode,
    behavior,
    preferShootable: profile?.preferShootable !== false,
    stickToTarget: profile?.stickToTarget !== false,
    avoidBeam: Boolean(profile?.avoidBeam),
    avoidWave: Boolean(profile?.avoidWave),
  };
}

function normalizeTargetProfiles(value = []) {
  if (!Array.isArray(value)) return [];

  const normalized = [];
  const seen = new Set();

  for (const entry of value) {
    const profile = normalizeTargetProfile(entry);
    const key = profile.name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(profile);
  }

  return normalized;
}

function syncTargetProfilesToNames(names, profiles = []) {
  const normalizedNames = sanitizeTargetMonsterNames(names);
  const profileMap = new Map(
    normalizeTargetProfiles(profiles)
      .map((profile) => [profile.name.toLowerCase(), profile]),
  );

  return normalizedNames.map((name) => normalizeTargetProfile(profileMap.get(name.toLowerCase()), name));
}

function getTargetProfilesDraft() {
  if (targetProfilesDraft == null) {
    targetProfilesDraft = syncTargetProfilesToNames(
      getMonsterInputNames(),
      state?.options?.targetProfiles || [],
    );
  }

  return targetProfilesDraft;
}

function resetTargetProfilesDraft() {
  targetProfilesDraft = null;
}

function syncTargetProfilesDraftToTargetNames(names = getMonsterInputNames()) {
  targetProfilesDraft = syncTargetProfilesToNames(names, getTargetProfilesDraft());
  return targetProfilesDraft;
}

function normalizeTargetingDistanceRule(rule = {}, fallbackRule = createModuleRule("distanceKeeper") || {}) {
  const fallback = fallbackRule || {};
  const minTargetDistance = Math.max(0, Number(rule?.minTargetDistance ?? fallback.minTargetDistance) || 0);
  const maxTargetDistanceRaw = Math.max(0, Number(rule?.maxTargetDistance ?? fallback.maxTargetDistance) || 0);
  const behavior = TARGET_PROFILE_BEHAVIOR_LABELS[String(rule?.behavior || fallback.behavior || "").trim().toLowerCase()]
    ? String(rule.behavior || fallback.behavior).trim().toLowerCase()
    : (fallback.behavior || "kite");

  return {
    enabled: rule?.enabled !== false,
    label: String(rule?.label ?? fallback.label ?? "").trim(),
    minTargetDistance,
    maxTargetDistance: Math.max(minTargetDistance, maxTargetDistanceRaw),
    minMonsterCount: Math.max(1, Number(rule?.minMonsterCount ?? fallback.minMonsterCount) || 1),
    cooldownMs: Math.max(0, Number(rule?.cooldownMs ?? fallback.cooldownMs) || 0),
    behavior,
    dodgeBeams: Boolean(rule?.dodgeBeams ?? fallback.dodgeBeams),
    dodgeWaves: Boolean(rule?.dodgeWaves ?? fallback.dodgeWaves),
    requireTarget: rule?.requireTarget !== false,
  };
}

function normalizeTargetingDistanceRules(value = []) {
  if (!Array.isArray(value)) return [];

  return value.map((rule) => normalizeTargetingDistanceRule(rule));
}

function getTargetingCombatDraft() {
  if (targetingCombatDraft == null) {
    targetingCombatDraft = {
      distanceKeeperEnabled: Boolean(state?.options?.distanceKeeperEnabled),
      distanceKeeperRules: normalizeTargetingDistanceRules(cloneValue(state?.options?.distanceKeeperRules || [])),
    };
  }

  return targetingCombatDraft;
}

function resetTargetingCombatDraft() {
  targetingCombatDraft = null;
  targetingCombatRenderedKey = "";
}

function captureTargetingCombatDraftFromDom() {
  const draft = getTargetingCombatDraft();
  draft.distanceKeeperEnabled = Boolean(targetingDistanceEnabledToggle?.checked);

  if (!targetingDistanceRuleList) {
    return draft;
  }

  const rows = Array.from(targetingDistanceRuleList.querySelectorAll('.module-rule-card[data-module-key="distanceKeeper"]'));
  const previousRules = Array.isArray(draft.distanceKeeperRules)
    ? draft.distanceKeeperRules
    : [];

  draft.distanceKeeperRules = rows.map((row, index) => {
    const fallback = previousRules[index] || createModuleRule("distanceKeeper") || {};
    const nextRule = { ...fallback };

    row.querySelectorAll('[data-module-key="distanceKeeper"][data-rule-field]').forEach((input) => {
      const field = input.dataset.ruleField;
      if (!field) return;
      nextRule[field] = input.type === "checkbox" ? input.checked : input.value;
    });

    return normalizeTargetingDistanceRule(nextRule, fallback);
  });

  return draft;
}

function getTargetingCombatRenderKey(draft = getTargetingCombatDraft()) {
  return [
    draft.distanceKeeperEnabled ? "1" : "0",
    ...(draft.distanceKeeperRules || []).map((rule) => [
      rule?.enabled !== false ? "1" : "0",
      rule?.label || "",
      rule?.minTargetDistance,
      rule?.maxTargetDistance,
      rule?.minMonsterCount,
      rule?.cooldownMs,
      rule?.behavior,
      rule?.dodgeBeams ? "1" : "0",
      rule?.dodgeWaves ? "1" : "0",
      rule?.requireTarget ? "1" : "0",
    ].join(":")),
  ].join("|");
}

function mergeMonsterNames(...values) {
  return normalizeMonsterNames(values);
}

function formatMonsterNames(value) {
  const monsterNames = normalizeMonsterNames(value);
  return monsterNames.length ? monsterNames.join(", ") : "-";
}

function getTargetQueueDraft() {
  if (targetQueueDraft == null) {
    targetQueueDraft = sanitizeTargetMonsterNames(state?.options?.monsterNames || state?.options?.monster || []);
  }
  return targetQueueDraft;
}

function resetTargetQueueDraft() {
  targetQueueDraft = null;
}

function setMonsterInputNames(names) {
  setInputValue("monster", sanitizeTargetMonsterNames(names).join("\n"));
}

function setTargetQueueDraft(names, { syncField = true } = {}) {
  targetQueueDraft = sanitizeTargetMonsterNames(names);
  if (syncField) {
    setMonsterInputNames(targetQueueDraft);
  }
  return targetQueueDraft;
}

function updateTargetQueueDraftFromDom(value = document.getElementById("monster")?.value || "") {
  targetQueueDraft = sanitizeTargetMonsterNames(value);
  return targetQueueDraft;
}

function getMonsterInputNames() {
  return targetQueueDraft == null
    ? sanitizeTargetMonsterNames(document.getElementById("monster").value)
    : [...targetQueueDraft];
}

function getCreatureLedger() {
  const ledger = normalizeCreatureLedgerDraft(state?.options?.creatureLedger, {
    monsterArchive: state?.options?.monsterArchive,
    playerArchive: state?.options?.playerArchive,
    npcArchive: state?.options?.npcArchive,
  });
  return {
    monsters: sortMonsterNames(ledger?.monsters ?? []),
    players: sortMonsterNames(ledger?.players ?? []),
    npcs: sortMonsterNames(ledger?.npcs ?? []),
  };
}

function getCreatureLedgerArchiveBaseline() {
  return normalizeCreatureLedgerDraft(null, {
    monsterArchive: state?.options?.monsterArchive,
    playerArchive: state?.options?.playerArchive,
    npcArchive: state?.options?.npcArchive,
  });
}

function buildCreatureLedgerOverrides(nextLedger, baseline = getCreatureLedgerArchiveBaseline()) {
  const normalizedNext = normalizeCreatureLedgerDraft(nextLedger);
  const normalizedBaseline = normalizeCreatureLedgerDraft(baseline);
  const baselineCategoryByName = new Map();

  normalizedBaseline.monsters.forEach((name) => baselineCategoryByName.set(name.toLowerCase(), "monster"));
  normalizedBaseline.players.forEach((name) => baselineCategoryByName.set(name.toLowerCase(), "player"));
  normalizedBaseline.npcs.forEach((name) => baselineCategoryByName.set(name.toLowerCase(), "npc"));

  const overrides = {
    monsters: normalizedNext.monsters.filter((name) => baselineCategoryByName.get(name.toLowerCase()) !== "monster"),
    players: normalizedNext.players.filter((name) => baselineCategoryByName.get(name.toLowerCase()) !== "player"),
    npcs: normalizedNext.npcs.filter((name) => baselineCategoryByName.get(name.toLowerCase()) !== "npc"),
  };

  return normalizeCreatureLedgerDraft(overrides);
}

function getArchivedMonsterNames() {
  return sortMonsterNames(sanitizeTargetMonsterNames(getCreatureLedger().monsters));
}

function getArchivedPlayerNames() {
  return getCreatureLedger().players;
}

function getArchivedNpcNames() {
  return getCreatureLedger().npcs;
}

function getVisibleMonsterNames() {
  return sortMonsterNames(sanitizeTargetMonsterNames(
    state?.snapshot?.visibleMonsterNames ?? state?.snapshot?.visibleCreatureNames ?? [],
  ));
}

function getVisiblePlayerNames() {
  return sortMonsterNames(state?.snapshot?.visiblePlayerNames || []);
}

function getVisibleNpcNames() {
  if (Array.isArray(state?.snapshot?.visibleNpcNames) && state.snapshot.visibleNpcNames.length) {
    return sortMonsterNames(state.snapshot.visibleNpcNames);
  }

  if (Array.isArray(state?.snapshot?.visibleNpcs) && state.snapshot.visibleNpcs.length) {
    return sortMonsterNames(state.snapshot.visibleNpcs.map((entry) => entry?.name));
  }

  return [];
}

function getFollowTrainLiveCharacterEntries(sourceState = state) {
  const orderedSessions = getOrderedSessions(sourceState?.sessions || []);
  const unique = [];
  const seen = new Set();

  orderedSessions.forEach((session, index) => {
    const name = String(
      session?.characterName
      || session?.label
      || session?.displayName
      || "",
    ).trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    unique.push({
      index,
      key,
      name,
      position: session?.playerPosition || null,
      followTargetName: String(
        session?.currentFollowTarget?.name
        || session?.followTarget?.name
        || session?.followTrainStatus?.leaderName
        || "",
      ).trim(),
    });
  });

  return unique;
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
    if (!entry || visited.has(entry.key)) {
      return;
    }

    visited.add(entry.key);
    component.push(entry);
    for (const child of childrenByKey.get(entry.key) || []) {
      visit(child, component);
    }
  };

  for (const entry of entries.filter((candidate) => !incoming.has(candidate.key))) {
    const component = [];
    visit(entry, component);
    if (component.length) {
      components.push(component);
    }
  }

  for (const entry of entries) {
    if (visited.has(entry.key)) {
      continue;
    }

    const component = [];
    visit(entry, component);
    if (component.length) {
      components.push(component);
    }
  }

  components.sort((left, right) => (
    right.length - left.length
    || left[0].index - right[0].index
  ));

  return components.flat();
}

function getFollowTrainLiveCharacterNames(sourceState = state) {
  return orderFollowTrainEntriesByLiveLinks(getFollowTrainLiveCharacterEntries(sourceState))
    .map((entry) => entry.name);
}

function getAutomaticFollowTrainMembers(modulesState = null, sourceState = state) {
  const configured = normalizeTextListSummary(modulesState?.partyFollowMembers);
  if (configured.length >= 2) {
    return configured;
  }

  const liveNames = getFollowTrainLiveCharacterNames(sourceState);
  return liveNames.length >= 2
    ? liveNames
    : configured;
}

function ensureFollowTrainAutoChainDraft(draft = ensureModulesDraft()) {
  if (!draft || normalizeTextListSummary(draft.partyFollowMembers).length >= 2) {
    return draft;
  }

  const liveNames = getFollowTrainLiveCharacterNames();
  if (liveNames.length >= 2) {
    draft.partyFollowMembers = liveNames;
    draft.partyFollowMemberRoles = pruneFollowTrainMemberRoles(
      draft.partyFollowMemberRoles,
      draft.partyFollowMembers,
      draft.partyFollowCombatMode,
    );
    draft.partyFollowMemberChaseModes = pruneFollowTrainMemberChaseModes(
      draft.partyFollowMemberChaseModes,
      draft.partyFollowMembers,
    );
  }

  return draft;
}

function getCurrentSessionNameKeys(sourceState = state) {
  const keys = new Set();
  const addName = (value) => {
    const key = String(value || "").trim().toLowerCase();
    if (key) {
      keys.add(key);
    }
  };

  addName(sourceState?.snapshot?.playerName);
  addName(sourceState?.binding?.characterName);
  addName(sourceState?.binding?.displayName);
  addName(sourceState?.binding?.label);

  const activeSessionId = String(
    sourceState?.activeSessionId
    || sourceState?.binding?.pageId
    || "",
  ).trim();
  const activeSession = (sourceState?.sessions || [])
    .find((session) => String(session?.id || "") === activeSessionId)
    || null;
  addName(activeSession?.characterName);
  addName(activeSession?.displayName);
  addName(activeSession?.label);

  return keys;
}

function buildFollowTrainSourceEntries(modulesState = ensureModulesDraft()) {
  const chainKeys = new Set(normalizeTextListSummary(modulesState?.partyFollowMembers).map((name) => name.toLowerCase()));
  const currentNameKey = String(
    state?.snapshot?.playerName
    || state?.binding?.characterName
    || state?.binding?.label
    || "",
  ).trim().toLowerCase();
  const liveCharacterNames = getFollowTrainLiveCharacterNames();
  const manualPlayerNames = normalizeTextListSummary(modulesState?.partyFollowManualPlayers);
  const visiblePlayerNames = getVisiblePlayerNames();
  const archivedPlayerNames = getArchivedPlayerNames();
  const liveNameKeys = new Set(liveCharacterNames.map((name) => name.toLowerCase()));
  const playerRegistry = new Map();

  const addPlayerEntry = (name, tag) => {
    const trimmedName = String(name || "").trim();
    const key = trimmedName.toLowerCase();
    if (!trimmedName || liveNameKeys.has(key)) return;

    const existing = playerRegistry.get(key) || {
      key,
      name: trimmedName,
      selected: chainKeys.has(key),
      current: key === currentNameKey,
      visible: false,
      archived: false,
      manual: false,
    };
    if (tag === "visible") existing.visible = true;
    if (tag === "archived") existing.archived = true;
    if (tag === "manual") existing.manual = true;
    existing.selected = chainKeys.has(key);
    existing.current = key === currentNameKey;
    playerRegistry.set(key, existing);
  };

  archivedPlayerNames.forEach((name) => addPlayerEntry(name, "archived"));
  visiblePlayerNames.forEach((name) => addPlayerEntry(name, "visible"));
  manualPlayerNames.forEach((name) => addPlayerEntry(name, "manual"));

  const characterEntries = liveCharacterNames.map((name) => {
    const key = name.toLowerCase();
    return {
      key,
      name,
      selected: chainKeys.has(key),
      current: key === currentNameKey,
      visible: false,
      archived: false,
      manual: manualPlayerNames.some((entry) => entry.toLowerCase() === key),
    };
  });

  return {
    characterEntries,
    playerEntries: [...playerRegistry.values()].sort((left, right) => compareDisplayNames(left.name, right.name)),
  };
}

function buildTrainerPartnerSourceEntries(modulesState = ensureModulesDraft()) {
  const selectedKey = getResolvedTrainerPartnerName(modulesState).toLowerCase();
  const currentNameKeys = getCurrentSessionNameKeys();
  const liveCharacterNames = getFollowTrainLiveCharacterNames();
  const visiblePlayerNames = getVisiblePlayerNames();
  const archivedPlayerNames = getArchivedPlayerNames();
  const liveNameKeys = new Set(liveCharacterNames.map((name) => name.toLowerCase()));
  const playerRegistry = new Map();

  const characterEntries = liveCharacterNames
    .filter((name) => !currentNameKeys.has(name.toLowerCase()))
    .map((name) => {
      const key = name.toLowerCase();
      return {
        key,
        name,
        selected: key === selectedKey,
        visible: false,
        archived: false,
      };
    });

  const addPlayerEntry = (name, tag) => {
    const trimmedName = String(name || "").trim();
    const key = trimmedName.toLowerCase();
    if (!trimmedName || currentNameKeys.has(key) || liveNameKeys.has(key)) return;

    const existing = playerRegistry.get(key) || {
      key,
      name: trimmedName,
      selected: key === selectedKey,
      visible: false,
      archived: false,
    };
    if (tag === "visible") existing.visible = true;
    if (tag === "archived") existing.archived = true;
    existing.selected = key === selectedKey;
    playerRegistry.set(key, existing);
  };

  archivedPlayerNames.forEach((name) => addPlayerEntry(name, "archived"));
  visiblePlayerNames.forEach((name) => addPlayerEntry(name, "visible"));

  return {
    characterEntries,
    playerEntries: [...playerRegistry.values()].sort((left, right) => compareDisplayNames(left.name, right.name)),
  };
}

function getFollowTrainSourceSignature() {
  return [
    getFollowTrainLiveCharacterNames().join(","),
    getVisiblePlayerNames().join(","),
    getArchivedPlayerNames().join(","),
  ].join("|");
}

const FOLLOW_TRAIN_ROLE_OPTIONS = Object.freeze([
  {
    value: "attack-and-follow",
    label: "Attack + Follow",
    behavior: "attack-and-follow",
    tone: "attack",
    slot: "Flexible",
    description: "Generic aggressive follower that suspends native follow to help clear threats.",
    doctrine: "Use when you want simple aggressive pressure with no narrower duty.",
  },
  {
    value: "assist-dps",
    label: "Assist DPS",
    behavior: "attack-and-follow",
    tone: "attack",
    slot: "Mid chain",
    description: "Primary damage lane for tabs that should stay close to the box and dump damage fast.",
    doctrine: "Best fit for RP or MS tabs riding behind the front line.",
  },
  {
    value: "front-guard",
    label: "Front Guard",
    behavior: "attack-and-follow",
    tone: "pilot",
    slot: "2nd slot",
    description: "Closest helper to the pilot. Peels retargets, holds tight spacing, and helps protect the box edge.",
    doctrine: "Strong second slot for another EK lane or an aggressive RP.",
  },
  {
    value: "sweeper",
    label: "Sweeper",
    behavior: "attack-and-follow",
    tone: "attack",
    slot: "Flex or tail",
    description: "Cleans side pulls and stragglers while the chain reforms after combat breaks.",
    doctrine: "Useful when hunts regularly leave loose mobs outside the main box.",
  },
  {
    value: "follow-only",
    label: "Follow Only",
    behavior: "follow-only",
    tone: "support",
    slot: "Flexible",
    description: "Generic passive follower that prioritizes chain integrity instead of dropping into combat.",
    doctrine: "Safest option when a tab should stay glued to formation.",
  },
  {
    value: "sio-healer",
    label: "Sio Healer",
    behavior: "follow-only",
    tone: "support",
    slot: "Backline",
    description: "Keeps the healing lane clean for sio cadence, mass heals, and safe line-of-sight control.",
    doctrine: "Ideal for ED-style tabs that should not grab threat during teamhunts.",
  },
  {
    value: "party-buffer",
    label: "Party Buffer",
    behavior: "follow-only",
    tone: "support",
    slot: "Mid or back",
    description: "Stays stable for party buffs, UH support, and utility timing without breaking native follow.",
    doctrine: "Fits MS and RP utility tabs that should stay clean for buff uptime.",
  },
  {
    value: "rearguard",
    label: "Rearguard",
    behavior: "follow-only",
    tone: "route",
    slot: "Last slot",
    description: "Anchors the tail for safer loot support, recovery, and low-risk trailing duty.",
    doctrine: "Good place for support or lower-trust tabs that should stay out of the front.",
  },
  {
    value: "scout",
    label: "Scout",
    behavior: "follow-only",
    tone: "route",
    slot: "Tail or flex",
    description: "Light-touch shadow role for route confirmation, seen-player pickup, and manual intervention.",
    doctrine: "Useful for recon tabs, low-commitment followers, or extra route awareness.",
  },
]);

const FOLLOW_TRAIN_ROLE_LOOKUP = Object.freeze(
  Object.fromEntries(FOLLOW_TRAIN_ROLE_OPTIONS.map((option) => [option.value, option])),
);

const FOLLOW_TRAIN_ROLE_ALIASES = Object.freeze({
  "follow-and-fight": "attack-and-follow",
  assist: "assist-dps",
  dps: "assist-dps",
  guard: "front-guard",
  healer: "sio-healer",
  sio: "sio-healer",
  support: "party-buffer",
  buffer: "party-buffer",
  "rear-guard": "rearguard",
  looter: "rearguard",
});

const FOLLOW_TRAIN_ROLE_GROUPS = Object.freeze([
  {
    label: "Aggressive lane",
    options: FOLLOW_TRAIN_ROLE_OPTIONS
      .filter((option) => option.behavior === "attack-and-follow")
      .map((option) => option.value),
  },
  {
    label: "Passive lane",
    options: FOLLOW_TRAIN_ROLE_OPTIONS
      .filter((option) => option.behavior === "follow-only")
      .map((option) => option.value),
  },
]);

function normalizeFollowTrainRoleBehaviorValue(value = "", fallbackBehavior = "attack-and-follow") {
  const normalized = String(value || "").trim().toLowerCase();
  const canonical = FOLLOW_TRAIN_ROLE_ALIASES[normalized] || normalized;
  const config = FOLLOW_TRAIN_ROLE_LOOKUP[canonical];
  if (config?.behavior) {
    return config.behavior;
  }

  return String(fallbackBehavior || "attack-and-follow").trim().toLowerCase() === "follow-only"
    ? "follow-only"
    : "attack-and-follow";
}

function getFollowTrainRoleConfig(role = "", fallbackRole = "attack-and-follow") {
  const normalized = String(role || "").trim().toLowerCase();
  const canonical = FOLLOW_TRAIN_ROLE_ALIASES[normalized] || normalized;
  if (FOLLOW_TRAIN_ROLE_LOOKUP[canonical]) {
    return FOLLOW_TRAIN_ROLE_LOOKUP[canonical];
  }

  return FOLLOW_TRAIN_ROLE_LOOKUP[
    normalizeFollowTrainRoleBehaviorValue(fallbackRole) === "follow-only"
      ? "follow-only"
      : "attack-and-follow"
  ];
}

function normalizeFollowTrainRoleValue(value = "", fallbackRole = "attack-and-follow") {
  const normalized = String(value || "").trim().toLowerCase();
  const canonical = FOLLOW_TRAIN_ROLE_ALIASES[normalized] || normalized;
  if (FOLLOW_TRAIN_ROLE_LOOKUP[canonical]) {
    return canonical;
  }

  return normalizeFollowTrainRoleBehaviorValue(fallbackRole) === "follow-only"
    ? "follow-only"
    : "attack-and-follow";
}

function formatFollowTrainBehaviorLabel(role = "", fallbackRole = "attack-and-follow") {
  return normalizeFollowTrainRoleBehaviorValue(role, fallbackRole) === "follow-only"
    ? "Passive"
    : "Aggressive";
}

function renderFollowTrainRoleSelectOptions(selectedValue = "") {
  return FOLLOW_TRAIN_ROLE_GROUPS
    .map((group) => `
      <optgroup label="${escapeAttributeValue(group.label)}">
        ${group.options.map((value) => {
      const option = FOLLOW_TRAIN_ROLE_LOOKUP[value];
      return `
          <option value="${escapeAttributeValue(option.value)}" ${option.value === selectedValue ? "selected" : ""}>
            ${escapeHtml(option.label)}
          </option>
        `;
    }).join("")}
      </optgroup>
    `)
    .join("");
}

function normalizeCombatStanceValue(value = "", fallbackMode = "auto") {
  const normalized = String(value || "").trim().toLowerCase();
  const fallback = CHASE_MODE_LABELS[String(fallbackMode || "").trim().toLowerCase()]
    ? String(fallbackMode || "").trim().toLowerCase()
    : "auto";

  if (!normalized) {
    return fallback;
  }

  if (["auto", "default", "profile", "role", "follow-train-default"].includes(normalized)) {
    return "auto";
  }

  const numeric = Number(normalized);
  if (Number.isInteger(numeric)) {
    if (numeric === 0) return "stand";
    if (numeric === 1) return "chase";
    if (numeric === 2) return "aggressive";
  }

  if (/(stand|hold|don.?t chase|do not chase)/.test(normalized)) {
    return "stand";
  }
  if (/(aggressive|full chase|hard chase)/.test(normalized)) {
    return "aggressive";
  }
  if (/(chase|follow)/.test(normalized)) {
    return "chase";
  }

  return fallback;
}

function formatCombatStanceLabel(mode = "auto") {
  return CHASE_MODE_LABELS[normalizeCombatStanceValue(mode)] || CHASE_MODE_LABELS.auto;
}

function renderCombatStanceSelectOptions(selectedValue = "auto") {
  const resolvedValue = normalizeCombatStanceValue(selectedValue);
  return ["auto", "stand", "chase", "aggressive"]
    .map((value) => `
      <option value="${escapeAttributeValue(value)}" ${value === resolvedValue ? "selected" : ""}>
        ${escapeHtml(CHASE_MODE_LABELS[value] || CHASE_MODE_LABELS.auto)}
      </option>
    `)
    .join("");
}

function normalizeFollowTrainChaseModeValue(value = "", fallbackMode = "auto") {
  return normalizeCombatStanceValue(value, fallbackMode);
}

function formatFollowTrainChaseModeLabel(mode = "auto") {
  return formatCombatStanceLabel(mode);
}

function renderFollowTrainChaseModeSelectOptions(selectedValue = "auto") {
  return renderCombatStanceSelectOptions(selectedValue);
}

function renderFollowTrainRuntimeItem(label, value) {
  return `
    <div class="follow-train-runtime-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "-"))}</strong>
    </div>
  `;
}

function renderFollowTrainMetricCard(label, value, detail, tone = "neutral") {
  return `
    <article class="follow-train-metric-card tone-${escapeAttributeValue(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function buildFollowTrainRoleMetrics(modulesState = ensureModulesDraft()) {
  const chain = normalizeTextListSummary(modulesState?.partyFollowMembers);
  let aggressiveCount = 0;
  let passiveCount = 0;

  chain.slice(1).forEach((memberName) => {
    if (normalizeFollowTrainRoleBehaviorValue(
      getFollowTrainMemberRole(modulesState, memberName),
      modulesState?.partyFollowCombatMode,
    ) === "follow-only") {
      passiveCount += 1;
      return;
    }

    aggressiveCount += 1;
  });

  return {
    chain,
    aggressiveCount,
    passiveCount,
  };
}

function renderFollowTrainDoctrine() {
  return `
    <aside class="follow-train-doctrine-panel">
      <div class="follow-train-doctrine-note">
        <strong>OTS Teamhunt Doctrine</strong>
        <p>Best-practice chains center on an EK tempo lead, an ED backline that stays clean for sio, and RP or MS tabs filling damage or buff lanes around the box.</p>
        <div class="follow-train-doctrine-vocations">
          <span><strong>EK</strong> Pilot or Front Guard</span>
          <span><strong>ED</strong> Sio Healer</span>
          <span><strong>RP</strong> Assist DPS or Rearguard</span>
          <span><strong>MS</strong> Assist DPS, Sweeper, or Party Buffer</span>
        </div>
      </div>
      <div class="follow-train-doctrine-list">
        ${FOLLOW_TRAIN_ROLE_OPTIONS.map((option) => `
          <article class="follow-train-doctrine-card tone-${escapeAttributeValue(option.tone || "neutral")}">
            <div class="follow-train-doctrine-head">
              <strong>${escapeHtml(option.label)}</strong>
              <span class="follow-train-badge tone-${escapeAttributeValue(option.tone || "neutral")}">${escapeHtml(formatFollowTrainBehaviorLabel(option.value))}</span>
            </div>
            <span class="follow-train-doctrine-slot">${escapeHtml(option.slot)}</span>
            <p class="follow-train-doctrine-copy">${escapeHtml(option.description)}</p>
            <p class="follow-train-doctrine-copy subtle">${escapeHtml(option.doctrine)}</p>
          </article>
        `).join("")}
      </div>
    </aside>
  `;
}

function pruneFollowTrainMemberRoles(roles = {}, members = [], fallbackRole = "attack-and-follow") {
  const normalizedMembers = normalizeTextListSummary(members);
  const normalizedRoles = {};

  for (const memberName of normalizedMembers) {
    const key = memberName.toLowerCase();
    const explicitEntry = Object.entries(roles || {}).find(([entryName]) => entryName.toLowerCase() === key);
    if (!explicitEntry) {
      continue;
    }

    normalizedRoles[memberName] = normalizeFollowTrainRoleValue(explicitEntry[1], fallbackRole);
  }

  return normalizedRoles;
}

function pruneFollowTrainMemberChaseModes(chaseModes = {}, members = []) {
  const normalizedMembers = normalizeTextListSummary(members);
  const normalizedChaseModes = {};

  for (const memberName of normalizedMembers) {
    const key = memberName.toLowerCase();
    const explicitEntry = Object.entries(chaseModes || {}).find(([entryName]) => entryName.toLowerCase() === key);
    if (!explicitEntry) {
      continue;
    }

    const chaseMode = normalizeFollowTrainChaseModeValue(explicitEntry[1], "auto");
    if (chaseMode === "auto") {
      continue;
    }

    normalizedChaseModes[memberName] = chaseMode;
  }

  return normalizedChaseModes;
}

function getFollowTrainMemberRole(modulesState = ensureModulesDraft(), name = "") {
  const requestedKey = String(name || "").trim().toLowerCase();
  if (!requestedKey) {
    return normalizeFollowTrainRoleValue(modulesState?.partyFollowCombatMode);
  }

  const roles = modulesState?.partyFollowMemberRoles && typeof modulesState.partyFollowMemberRoles === "object"
    ? modulesState.partyFollowMemberRoles
    : {};
  const explicitEntry = Object.entries(roles).find(([entryName]) => entryName.toLowerCase() === requestedKey);
  return normalizeFollowTrainRoleValue(explicitEntry?.[1], modulesState?.partyFollowCombatMode);
}

function getFollowTrainMemberChaseMode(modulesState = ensureModulesDraft(), name = "") {
  const requestedKey = String(name || "").trim().toLowerCase();
  if (!requestedKey) {
    return "auto";
  }

  const chaseModes = modulesState?.partyFollowMemberChaseModes && typeof modulesState.partyFollowMemberChaseModes === "object"
    ? modulesState.partyFollowMemberChaseModes
    : {};
  const explicitEntry = Object.entries(chaseModes).find(([entryName]) => entryName.toLowerCase() === requestedKey);
  return normalizeFollowTrainChaseModeValue(explicitEntry?.[1], "auto");
}

function getFollowTrainRuntimeEntry(name = "", sourceState = state) {
  const requestedKey = String(name || "").trim().toLowerCase();
  if (!requestedKey) {
    return null;
  }

  return getOrderedSessions(sourceState?.sessions || [])
    .find((session) => {
      const sessionName = String(
        session?.followTrainStatus?.selfName
        || session?.characterName
        || session?.label
        || session?.displayName
        || "",
      ).trim().toLowerCase();
      return sessionName === requestedKey;
    }) || null;
}

function getFollowTrainRuntimeSignature(sourceState = state) {
  return getOrderedSessions(sourceState?.sessions || [])
    .map((session) => {
      const status = session?.followTrainStatus || null;
      return [
        String(status?.selfName || session?.characterName || session?.label || ""),
        String(status?.role || ""),
        String(status?.leaderName || ""),
        String(status?.currentState || ""),
        status?.followActive ? "1" : "0",
        String(status?.desyncCount || 0),
        String(status?.rejoinAttempts || 0),
        String(status?.lastRejoinAt || 0),
      ].join(":");
    })
    .join("|");
}

function formatFollowTrainRoleLabel(role = "", { pilot = false } = {}) {
  if (pilot) return "Chain Pilot";
  return getFollowTrainRoleConfig(role).label;
}

function formatFollowTrainStateLabel(status = null) {
  if (status?.pilot) return "Pilot";
  const stateKey = String(status?.currentState || "").trim().toUpperCase();
  switch (stateKey) {
    case "ACQUIRE_LEADER":
      return "Acquire Leader";
    case "FOLLOWING":
      return "Following";
    case "COMBAT_SUSPEND":
      return "Combat Suspend";
    case "COMBAT_ACTIVE":
      return "Combat Active";
    case "REJOIN_FOLLOW":
      return "Rejoin Follow";
    case "DESYNC_RECOVERY":
      return "Desync Recovery";
    case "SAFE_HOLD":
      return "Safe Hold";
    case "DISABLED":
    default:
      return status?.enabled ? "Idle" : "Inactive";
  }
}

function renderFollowTrainSourceRows(entries = [], group = "player") {
  if (!entries.length) {
    return `<div class="empty-state">${group === "character" ? "No live characters ready" : "No player names available yet"}</div>`;
  }

  return entries
    .map((entry) => {
      const badges = [];
      if (entry.current) badges.push("This character");
      if (group === "character") badges.push("Character tab");
      if (entry.visible) badges.push("Visible");
      if (entry.archived) badges.push("Seen");
      if (entry.manual) badges.push("Manual");
      return `
        <button
          type="button"
          class="follow-train-source-button ${entry.selected ? "selected" : ""}"
          data-follow-train-source-name="${escapeAttributeValue(entry.name)}"
          ${entry.selected ? 'disabled aria-disabled="true"' : ""}
        >
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${badges.map((badge) => `<span class="follow-train-badge">${escapeHtml(badge)}</span>`).join("")}</span>
        </button>
      `;
    })
    .join("");
}

function renderTrainerPartnerSourceRows(entries = [], group = "player") {
  if (!entries.length) {
    return `<div class="empty-state">${group === "character" ? "No live characters ready" : "No player names available yet"}</div>`;
  }

  return entries
    .map((entry) => {
      const badges = [];
      if (group === "character") badges.push("Character tab");
      if (entry.visible) badges.push("Visible");
      if (entry.archived) badges.push("Seen");
      return `
        <button
          type="button"
          class="follow-train-source-button ${entry.selected ? "selected" : ""}"
          data-trainer-partner-name="${escapeAttributeValue(entry.name)}"
          ${entry.selected ? 'disabled aria-disabled="true"' : ""}
        >
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${badges.map((badge) => `<span class="follow-train-badge">${escapeHtml(badge)}</span>`).join("")}</span>
        </button>
      `;
    })
    .join("");
}

function getTrainerCharacterRoster(sourceState = state) {
  return Array.isArray(sourceState?.trainerCharacters) ? sourceState.trainerCharacters : [];
}

function getTrainerCharacterDisplayName(entry = {}) {
  return String(entry?.characterName || entry?.displayName || entry?.profileKey || "").trim();
}

function normalizeTrainerDuoKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function findTrainerCharacterByName(name = "", entries = getTrainerCharacterRoster()) {
  const requestedKey = normalizeTrainerDuoKey(name);
  if (!requestedKey) return null;

  return (Array.isArray(entries) ? entries : []).find((entry) => (
    normalizeTrainerDuoKey(entry?.profileKey) === requestedKey
    || normalizeTrainerDuoKey(entry?.characterName) === requestedKey
    || normalizeTrainerDuoKey(entry?.displayName) === requestedKey
  )) || null;
}

function getTrainerDuoCandidateNames() {
  const names = [];
  const addName = (value = "") => {
    const name = String(value || "").trim();
    if (name) names.push(name);
  };

  getTrainerCharacterRoster().forEach((entry) => addName(getTrainerCharacterDisplayName(entry)));
  getAccountRegistry().forEach((account) => {
    addName(account?.preferredCharacter);
    (Array.isArray(account?.characters) ? account.characters : []).forEach(addName);
  });
  getFollowTrainLiveCharacterNames().forEach(addName);

  const seen = new Set();
  return names
    .filter((name) => {
      const key = normalizeTrainerDuoKey(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }));
}

function buildTrainerDuoPresets(entries = getTrainerCharacterRoster()) {
  const roster = Array.isArray(entries) ? entries : [];
  const seen = new Set();
  const presets = [];

  for (const entry of roster) {
    const leftName = getTrainerCharacterDisplayName(entry);
    const rightName = String(entry?.partnerName || "").trim();
    if (!leftName || !rightName) continue;

    const sortedKey = [normalizeTrainerDuoKey(leftName), normalizeTrainerDuoKey(rightName)].sort().join("::");
    if (!sortedKey || seen.has(sortedKey)) continue;
    seen.add(sortedKey);

    const partnerEntry = findTrainerCharacterByName(rightName, roster);
    const partnerPartnerName = String(partnerEntry?.partnerName || "").trim();
    const mutual = Boolean(partnerEntry && normalizeTrainerDuoKey(partnerPartnerName) === normalizeTrainerDuoKey(leftName));
    const knownEntries = [entry, partnerEntry].filter(Boolean);
    const runningCount = knownEntries.filter((candidate) => candidate?.running).length;
    const liveCount = knownEntries.filter((candidate) => candidate?.live).length;
    const hasBothAccounts = knownEntries.length >= 2 && knownEntries.every((candidate) => candidate?.launchReady);
    const blocked = knownEntries.some((candidate) => candidate?.blockedByOtherDesk);

    presets.push({
      leftName,
      rightName,
      leftProfileKey: String(entry?.profileKey || "").trim(),
      rightProfileKey: String(partnerEntry?.profileKey || "").trim(),
      launchProfileKey: String(entry?.profileKey || partnerEntry?.profileKey || leftName).trim(),
      mutual,
      runningCount,
      liveCount,
      hasBothAccounts,
      blocked,
    });
  }

  return presets.sort((left, right) => (
    `${left.leftName} ${left.rightName}`.localeCompare(`${right.leftName} ${right.rightName}`, undefined, {
      sensitivity: "base",
      numeric: true,
    })
  ));
}

function getTrainerDuoPresetSignature() {
  return buildTrainerDuoPresets()
    .map((preset) => [
      preset.leftName,
      preset.rightName,
      preset.mutual ? "1" : "0",
      preset.hasBothAccounts ? "1" : "0",
      preset.runningCount,
      preset.liveCount,
    ].join(":"))
    .join("|");
}

function renderTrainerDuoPresetRows(presets = []) {
  if (!presets.length) {
    return '<div class="empty-state">No duo presets yet. Create one below to save reciprocal trainer partners.</div>';
  }

  return presets
    .map((preset) => {
      const badges = [
        preset.mutual ? "Reciprocal" : "One-way",
        preset.hasBothAccounts ? "Stored logins" : "Needs account",
        preset.runningCount ? `${preset.runningCount}/2 running` : "",
        preset.liveCount ? `${preset.liveCount}/2 live` : "",
      ].filter(Boolean);
      const disabled = !preset.launchProfileKey || preset.blocked || !preset.mutual || !preset.hasBothAccounts;
      const detail = preset.mutual
        ? "Starts both clients, logs in, enables Trainer, and uses one elected party inviter."
        : "Save this duo again to make both partner links reciprocal.";

      return `
        <article class="trainer-duo-card ${preset.mutual ? "" : "warning"}">
          <div class="trainer-duo-card-copy">
            <strong>${escapeHtml(preset.leftName)} <span>+</span> ${escapeHtml(preset.rightName)}</strong>
            <div class="follow-train-row-badges">
              ${badges.map((badge) => `<span class="follow-train-badge">${escapeHtml(badge)}</span>`).join("")}
            </div>
            <small>${escapeHtml(detail)}</small>
          </div>
          <div class="trainer-duo-card-actions">
            <button
              type="button"
              class="btn primary compact"
              data-trainer-duo-start-profile-key="${escapeAttributeValue(preset.launchProfileKey)}"
              ${disabled ? "disabled aria-disabled=\"true\"" : ""}
            >Start Duo</button>
            <button
              type="button"
              class="btn compact danger"
              data-trainer-duo-disband-left="${escapeAttributeValue(preset.leftName)}"
              data-trainer-duo-disband-right="${escapeAttributeValue(preset.rightName)}"
              data-trainer-duo-disband-left-profile="${escapeAttributeValue(preset.leftProfileKey)}"
              data-trainer-duo-disband-right-profile="${escapeAttributeValue(preset.rightProfileKey)}"
            >Disband</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTrainerDuoCreator() {
  const candidates = getTrainerDuoCandidateNames();
  const options = candidates
    .map((name) => `<option value="${escapeAttributeValue(name)}"></option>`)
    .join("");

  return `
    <div class="trainer-duo-create">
      <datalist id="trainer-duo-candidates">${options}</datalist>
      <label class="route-picker-field">
        <span>Character A</span>
        <input id="trainer-duo-left" type="text" list="trainer-duo-candidates" placeholder="Czarnobrat" />
      </label>
      <label class="route-picker-field">
        <span>Character B</span>
        <input id="trainer-duo-right" type="text" list="trainer-duo-candidates" placeholder="Zlocimir Wielkoportf" />
      </label>
      <button type="button" class="btn primary trainer-duo-create-button" data-trainer-duo-create>Create Duo</button>
    </div>
  `;
}

function renderTrainerRosterRows(entries = []) {
  if (!entries.length) {
    return '<div class="empty-state">No saved trainer characters yet. Save trainer configs first, then they will appear here.</div>';
  }

  return entries
    .map((entry) => {
      const characterName = String(entry?.characterName || entry?.displayName || entry?.profileKey || "").trim();
      const partnerName = String(entry?.partnerName || "").trim();
      const badges = [];
      if (entry?.live) badges.push("Live tab");
      if (entry?.running) badges.push("Running");
      if (entry?.hasAccount) badges.push("Stored account");
      if (entry?.blockedByOtherDesk) badges.push("Busy");
      if (!entry?.launchReady) badges.push("Needs account");
      const detail = [
        partnerName ? `Partner ${partnerName}` : "No saved partner",
        entry?.cavebotName ? `Route ${entry.cavebotName}` : "No saved route",
      ].join(" / ");

      return `
        <button
          type="button"
          class="follow-train-source-button"
          data-trainer-launch-profile-key="${escapeAttributeValue(entry?.profileKey || "")}"
          ${entry?.launchReady && !entry?.blockedByOtherDesk ? "" : 'disabled aria-disabled="true"'}
        >
          <strong>${escapeHtml(characterName || "Trainer Character")}</strong>
          <span>${badges.map((badge) => `<span class="follow-train-badge">${escapeHtml(badge)}</span>`).join("")}</span>
          <small>${escapeHtml(detail)}</small>
        </button>
      `;
    })
    .join("");
}

function renderFollowTrainChainRows(modulesState = ensureModulesDraft()) {
  const chain = normalizeTextListSummary(modulesState?.partyFollowMembers);
  const currentNameKey = String(
    state?.snapshot?.playerName
    || state?.binding?.characterName
    || state?.binding?.label
    || "",
  ).trim().toLowerCase();

  if (!chain.length) {
    return '<div class="empty-state">No chain yet. Add names from the left column.</div>';
  }

  return chain
    .map((name, index) => {
      const isCurrent = name.toLowerCase() === currentNameKey;
      const runtimeSession = getFollowTrainRuntimeEntry(name);
      const runtime = runtimeSession?.followTrainStatus || null;
      const roleValue = getFollowTrainMemberRole(modulesState, name);
      const chaseModeValue = getFollowTrainMemberChaseMode(modulesState, name);
      const roleConfig = getFollowTrainRoleConfig(roleValue, modulesState?.partyFollowCombatMode);
      const roleLabel = index === 0
        ? "Chain Pilot"
        : formatFollowTrainRoleLabel(roleValue);
      const followLabel = index === 0
        ? "Leads the chain"
        : `Follows ${chain[index - 1]}`;
      const runtimeLeaderName = String(runtime?.leaderName || (index > 0 ? chain[index - 1] : "")).trim();
      const stateLabel = runtimeSession
        ? formatFollowTrainStateLabel(runtime)
        : index === 0
          ? "Pilot"
          : "No live runtime";
      const behaviorLabel = index === 0
        ? "Tempo"
        : formatFollowTrainBehaviorLabel(roleValue, modulesState?.partyFollowCombatMode);
      const chaseLabel = formatFollowTrainChaseModeLabel(chaseModeValue);
      const followState = index === 0
        ? "Lead"
        : runtimeSession
          ? (runtime?.followActive ? "Locked" : "Idle")
          : "-";
      const desyncCount = index === 0
        ? "-"
        : String(Math.max(0, Number(runtime?.desyncCount) || 0));
      const rejoinValue = index === 0 ? "-" : formatClockTime(runtime?.lastRejoinAt);
      const roleNote = index === 0
        ? "Pilot sets pace, pathing, and shared-exp reach for the entire chain."
        : roleConfig.description;
      const desyncBadge = (desyncCount !== "-" && Number(desyncCount) > 0)
        ? `<span class="follow-train-badge tone-attack">Desync: ${escapeHtml(desyncCount)}</span>`
        : "";
      const rejoinBadge = (rejoinValue !== "-" && rejoinValue !== "00:00" && rejoinValue !== "0")
        ? `<span class="follow-train-badge tone-attack">Rejoin: ${escapeHtml(rejoinValue)}</span>`
        : "";

      return `
        <div class="follow-train-row compact ${isCurrent ? "current" : ""} tone-${escapeAttributeValue(index === 0 ? "pilot" : roleConfig.tone || "neutral")}" data-follow-train-chain-index="${index}">
          <div class="follow-train-row-head">
            <div class="follow-train-slot-wrap">
              <span class="follow-train-slot-index">${String(index + 1).padStart(2, "0")}</span>
              <div class="follow-train-row-copy">
                <div class="follow-train-row-title">
                  <strong>${escapeHtml(name)}</strong>
                  <span class="follow-train-row-link">${escapeHtml(followLabel)}</span>
                </div>
                <div class="follow-train-row-badges">
                  <span class="follow-train-badge tone-${escapeAttributeValue(index === 0 ? "pilot" : roleConfig.tone || "neutral")}">${escapeHtml(roleLabel)}</span>
                  <span class="follow-train-badge subtle">${escapeHtml(behaviorLabel)}</span>
                  <span class="follow-train-badge subtle">${escapeHtml(`Stance ${chaseLabel}`)}</span>
                  <span class="follow-train-badge runtime">${escapeHtml(stateLabel)}</span>
                  ${isCurrent ? '<span class="follow-train-badge current">This character</span>' : ""}
                  ${desyncBadge}
                  ${rejoinBadge}
                </div>
              </div>
            </div>
            <div class="follow-train-row-actions">
              ${index === 0 ? `
                <span class="follow-train-badge tone-pilot">Pilot</span>
                <label class="follow-train-role-field compact-role">
                  <select data-follow-train-chase-mode-name="${escapeAttributeValue(name)}">
                    ${renderFollowTrainChaseModeSelectOptions(chaseModeValue)}
                  </select>
                </label>
              ` : `
                <label class="follow-train-role-field compact-role">
                  <select data-follow-train-role-name="${escapeAttributeValue(name)}">
                    ${renderFollowTrainRoleSelectOptions(roleValue)}
                  </select>
                </label>
                <label class="follow-train-role-field compact-role">
                  <select data-follow-train-chase-mode-name="${escapeAttributeValue(name)}">
                    ${renderFollowTrainChaseModeSelectOptions(chaseModeValue)}
                  </select>
                </label>
              `}
              <div class="follow-train-row-buttons">
                <button type="button" class="btn mini" data-follow-train-move="${index}" data-follow-train-delta="-1" ${index === 0 ? "disabled" : ""}>Up</button>
                <button type="button" class="btn mini" data-follow-train-move="${index}" data-follow-train-delta="1" ${index === chain.length - 1 ? "disabled" : ""}>Down</button>
                <button type="button" class="btn mini danger" data-follow-train-remove="${index}">Remove</button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderFollowTrainFields(modulesState = ensureModulesDraft()) {
  ensureFollowTrainAutoChainDraft(modulesState);
  const { characterEntries, playerEntries } = buildFollowTrainSourceEntries(modulesState);
  const { chain, aggressiveCount, passiveCount } = buildFollowTrainRoleMetrics(modulesState);
  const manualField = getModuleOptionFieldSpec("partyFollow", "partyFollowManualPlayers");
  const distanceField = getModuleOptionFieldSpec("partyFollow", "partyFollowDistance");
  const combatModeField = getModuleOptionFieldSpec("partyFollow", "partyFollowCombatMode");

  return `
    <div class="follow-train-shell">
      <div class="follow-train-layout">
        <section class="follow-train-column follow-train-source-column">
          <div class="section-head target-sources-head">
            <div>
              <strong>Available Players</strong>
              <div class="section-meta">Live tabs stay separate from seen and manual names.</div>
            </div>
          </div>
          <div class="follow-train-source-stack">
            <section class="follow-train-source-card">
              <div class="follow-train-source-title">Character Tabs</div>
              <div class="follow-train-source-list" data-follow-train-character-list>
                ${renderFollowTrainSourceRows(characterEntries, "character")}
              </div>
            </section>
            <section class="follow-train-source-card">
              <div class="follow-train-source-title">Seen and Manual Players</div>
              <div class="follow-train-source-list" data-follow-train-player-list>
                ${renderFollowTrainSourceRows(playerEntries, "player")}
              </div>
            </section>
          </div>
          ${manualField ? renderModuleOptionField("partyFollow", manualField, modulesState?.partyFollowManualPlayers) : ""}
        </section>
        <section class="follow-train-column follow-train-chain-column">
          <div class="section-head target-sources-head">
            <div>
              <strong>Follow Chain</strong>
              <div class="section-meta">Slot 1 leads. Every follower gets a role lane plus its own fight stance.</div>
            </div>
            <div class="inline-actions">
              <button type="button" class="btn mini" data-follow-train-use-live ${characterEntries.length ? "" : "disabled"}>Use Live Tabs</button>
              <button type="button" class="btn mini" data-follow-train-add-seen ${playerEntries.length ? "" : "disabled"}>Add Seen</button>
              <button type="button" class="btn mini" data-follow-train-clear ${chain.length ? "" : "disabled"}>Clear Chain</button>
            </div>
          </div>
          <div class="follow-train-overview">
            ${renderFollowTrainMetricCard(
    "Pilot",
    chain[0] || "Unset",
    chain.length ? "Tempo lead / box owner" : "Set slot 1 first",
    chain.length ? "pilot" : "neutral",
  )}
            ${renderFollowTrainMetricCard(
    "Members",
    String(chain.length),
    chain.length > 1 ? `${chain.length - 1} follower${chain.length - 1 === 1 ? "" : "s"}` : "Need at least 2",
    chain.length >= 2 ? "route" : "neutral",
  )}
            ${renderFollowTrainMetricCard(
    "Aggressive",
    String(aggressiveCount),
    "Break follow to fight threats",
    aggressiveCount ? "attack" : "neutral",
  )}
            ${renderFollowTrainMetricCard(
    "Passive",
    String(passiveCount),
    "Hold line for sio or support",
    passiveCount ? "support" : "neutral",
  )}
          </div>
          <div class="follow-train-workspace">
            <div class="follow-train-chain-list" data-follow-train-chain-list>
              ${renderFollowTrainChainRows(modulesState)}
            </div>
            ${renderFollowTrainDoctrine()}
          </div>
          <div class="follow-train-footer">
            <div class="follow-train-status-card">
              <span>Current Chain</span>
              <strong>${escapeHtml(formatFollowTrainHeadline(chain))}</strong>
              <small>${escapeHtml(formatFollowTrainDetail(chain, modulesState?.partyFollowDistance))}</small>
            </div>
            ${distanceField ? renderModuleOptionField("partyFollow", distanceField, modulesState?.partyFollowDistance) : ""}
            ${combatModeField ? renderModuleOptionField("partyFollow", combatModeField, modulesState?.partyFollowCombatMode) : ""}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderTrainerMetricCard(label, value, detail, tone = "neutral") {
  return `
    <article class="trainer-metric-card tone-${escapeAttributeValue(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderTrainerServiceCard(label, value, detail, moduleKey, tone = "neutral") {
  return `
    <article class="trainer-metric-card trainer-service-card tone-${escapeAttributeValue(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
      <button type="button" class="btn mini" data-trainer-service-module="${escapeAttributeValue(moduleKey)}">Open Owner</button>
    </article>
  `;
}

function renderTrainerFields(modulesState = ensureModulesDraft()) {
  const field = (key) => getModuleOptionFieldSpec("trainer", key);
  const resolvedPartnerName = getResolvedTrainerPartnerName(modulesState);
  const resolvedPartnerDistance = Math.max(1, Math.trunc(Number(modulesState?.trainerPartnerDistance) || 0));
  const foodChoices = normalizeTextListSummary(modulesState?.autoEatFoodName);
  const foodName = foodChoices.length ? foodChoices.join(" -> ") : "brown mushroom";
  const trainerManaHeadline = formatTrainerManaTrainerHeadline(modulesState);
  const trainerManaDetail = formatTrainerManaTrainerDetail(modulesState, {
    empty: "Standalone Mana Trainer stays separate",
  });
  const { characterEntries, playerEntries } = buildTrainerPartnerSourceEntries(modulesState);
  const trainerCharacterEntries = getTrainerCharacterRoster();
  const trainerDuoPresets = buildTrainerDuoPresets(trainerCharacterEntries);
  const trainerFields = [
    "trainerReconnectEnabled",
    "trainerPartnerName",
    "trainerPartnerDistance",
    "trainerAutoPartyEnabled",
    "trainerManaTrainerEnabled",
    "trainerManaTrainerWords",
    "trainerManaTrainerHotkey",
    "trainerManaTrainerManaPercent",
    "trainerManaTrainerMinHealthPercent",
    "trainerEscapeHealthPercent",
    "trainerEscapeDistance",
    "trainerEscapeCooldownMs",
  ]
    .map(field)
    .filter(Boolean)
    .map((spec) => {
      const value = spec.key === "trainerPartnerName"
        ? resolvedPartnerName
        : modulesState?.[spec.key];
      return renderModuleOptionField("trainer", spec, value);
    })
    .join("");

  return `
    <div class="trainer-shell">
      <section class="trainer-overview">
        ${renderTrainerMetricCard(
    "Idle",
    formatMs(modulesState?.antiIdleIntervalMs),
    "Transport keepalive",
    modulesState?.trainerEnabled ? "safe" : "neutral",
  )}
        ${renderTrainerMetricCard(
    "Reconnect",
    modulesState?.trainerReconnectEnabled !== false ? "On" : "Off",
    modulesState?.trainerReconnectEnabled !== false
      ? `Policy from Reconnect / retry ${formatMs(modulesState?.reconnectRetryDelayMs)}`
      : "Standalone module only",
    modulesState?.trainerReconnectEnabled !== false ? "safe" : "neutral",
  )}
        ${renderTrainerMetricCard(
    "Food",
    formatMs(modulesState?.autoEatCooldownMs),
    foodName,
    "safe",
  )}
        ${renderTrainerMetricCard(
    "Mana",
    trainerManaHeadline,
    trainerManaDetail,
    modulesState?.trainerManaTrainerEnabled ? "gate" : "neutral",
  )}
        ${renderTrainerMetricCard(
    "Healing",
    `<= ${formatPercent(modulesState?.healerEmergencyHealthPercent)}`,
    `Critical ${formatPercent(modulesState?.deathHealHealthPercent)}`,
    "safe",
  )}
        ${renderTrainerMetricCard(
    "Escape",
    `<= ${formatPercent(modulesState?.trainerEscapeHealthPercent)}`,
    `${Math.max(1, Math.trunc(Number(modulesState?.trainerEscapeDistance) || 0))} SQM target`,
    "danger",
  )}
        ${renderTrainerMetricCard(
    "Partner",
    formatTrainerPartnerHeadline(resolvedPartnerName),
    formatTrainerPartnerDetail(resolvedPartnerName, resolvedPartnerDistance),
    "route",
  )}
      </section>
      <section class="trainer-inherited-services">
        <div class="section-head target-sources-head">
          <div>
            <strong>Inherited Services</strong>
            <div class="section-meta">Trainer reuses these service settings without editing them here.</div>
          </div>
        </div>
        <div class="trainer-overview">
          ${renderTrainerServiceCard(
    "Anti Idle",
    formatMs(modulesState?.antiIdleIntervalMs),
    "Delay owned by Anti Idle",
    "antiIdle",
    modulesState?.antiIdleEnabled || modulesState?.trainerEnabled ? "safe" : "neutral",
  )}
          ${renderTrainerServiceCard(
    "Auto Eat",
    formatMs(modulesState?.autoEatCooldownMs),
    `Food owned by Auto Eat / ${foodName}`,
    "autoEat",
    modulesState?.autoEatEnabled || modulesState?.trainerEnabled ? "safe" : "neutral",
  )}
          ${renderTrainerServiceCard(
    "Healer",
    `<= ${formatPercent(modulesState?.healerEmergencyHealthPercent)}`,
    "Priority owned by Healer",
    "healer",
    modulesState?.healerEnabled || modulesState?.trainerEnabled ? "safe" : "neutral",
  )}
          ${renderTrainerServiceCard(
    "Death Heal",
    `<= ${formatPercent(modulesState?.deathHealHealthPercent)}`,
    "Critical floor owned by Death Heal",
    "deathHeal",
    modulesState?.deathHealEnabled || modulesState?.trainerEnabled ? "safe" : "neutral",
  )}
          ${renderTrainerServiceCard(
    "Reconnect Policy",
    formatMs(modulesState?.reconnectRetryDelayMs),
    "Retry policy owned by Reconnect",
    "reconnect",
    modulesState?.reconnectEnabled || modulesState?.trainerReconnectEnabled !== false ? "safe" : "neutral",
  )}
        </div>
      </section>
      <section class="trainer-duo-presets">
        <div class="section-head target-sources-head">
          <div>
            <strong>Preset Trainer Duos</strong>
            <div class="section-meta">Click Start Duo to open exactly the saved pair, wait for client load, log both in, auto-party with one elected inviter, and begin Trainer mode.</div>
          </div>
        </div>
        <div class="trainer-duo-list">
          ${renderTrainerDuoPresetRows(trainerDuoPresets)}
        </div>
        ${renderTrainerDuoCreator()}
      </section>
      <section class="trainer-settings">
        <div class="section-head target-sources-head">
          <div>
            <strong>Trainer Loop</strong>
            <div class="section-meta">These fields drive reconnect, partner spacing, auto-party, anti-idle, food, heals, and low-HP escape.</div>
          </div>
        </div>
        <div class="form-grid trainer-settings-grid">
          ${trainerFields}
        </div>
      </section>
      <section class="trainer-partner">
        <div class="follow-train-shell">
          <div class="follow-train-layout">
            <section class="follow-train-column follow-train-source-column">
              <div class="section-head target-sources-head">
                <div>
                  <strong>Training Partner</strong>
                  <div class="section-meta">Pick one player for skill training. Trainer stays on that target, auto-parties before retargeting when enabled, and walks back into range without using Follow Chain.</div>
                </div>
              </div>
              <div class="follow-train-source-stack">
                <section class="follow-train-source-card">
                  <div class="follow-train-source-title">My Trainer Characters</div>
                  <div class="follow-train-source-list" data-trainer-character-list>
                    ${renderTrainerRosterRows(trainerCharacterEntries)}
                  </div>
                </section>
                <section class="follow-train-source-card">
                  <div class="follow-train-source-title">Character Tabs</div>
                  <div class="follow-train-source-list">
                    ${renderTrainerPartnerSourceRows(characterEntries, "character")}
                  </div>
                </section>
                <section class="follow-train-source-card">
                  <div class="follow-train-source-title">Seen Players</div>
                  <div class="follow-train-source-list">
                    ${renderTrainerPartnerSourceRows(playerEntries, "player")}
                  </div>
                </section>
              </div>
            </section>
            <section class="follow-train-column follow-train-chain-column">
              <div class="section-head target-sources-head">
                <div>
                  <strong>Trainer Status</strong>
                  <div class="section-meta">Trainer keeps the selected player targeted, waits for a same-party shield before retargeting when auto-party is on, allows mana training while the partner is targeted, and only regroups when the gap exceeds your keep-close setting.</div>
                </div>
              </div>
              <div class="follow-train-footer">
                <div class="follow-train-status-card">
                  <span>Current Partner</span>
                  <strong>${escapeHtml(formatTrainerPartnerHeadline(resolvedPartnerName))}</strong>
                  <small>${escapeHtml(formatTrainerPartnerDetail(resolvedPartnerName, resolvedPartnerDistance))}</small>
                </div>
                <div class="follow-train-status-card">
                  <span>Saved Trainer Roster</span>
                  <strong>${escapeHtml(String(trainerCharacterEntries.length || 0))}</strong>
                  <small>${escapeHtml(trainerCharacterEntries.length ? "Click a saved trainer character above to reuse or cold-start its linked trainer group." : "Saved trainer characters appear here even when there is no live tab selected.")}</small>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  `;
}

function getHuntPresets() {
  return Array.isArray(state?.huntPresets) ? state.huntPresets : [];
}

function getHuntPresetSearchQuery() {
  return String(huntPresetSearch?.value || "").trim().toLowerCase();
}

function getFilteredHuntPresets(query = getHuntPresetSearchQuery()) {
  const presets = getHuntPresets();
  const terms = String(query || "").split(/\s+/).map((term) => term.trim()).filter(Boolean);
  if (!terms.length) {
    return presets;
  }

  return presets.filter((preset) => {
    const haystack = String(
      preset?.searchText
      || [
        preset?.monsterName,
        preset?.taskName,
        ...(Array.isArray(preset?.lootHighlights) ? preset.lootHighlights : []),
        ...(Array.isArray(preset?.tags) ? preset.tags : []),
      ].join(" "),
    ).toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function getSelectedHuntPreset(filteredPresets = getFilteredHuntPresets()) {
  if (!filteredPresets.length) {
    selectedHuntPresetId = "";
    return null;
  }

  const selected = filteredPresets.find((preset) => preset.id === selectedHuntPresetId) || filteredPresets[0];
  selectedHuntPresetId = selected?.id || "";
  return selected || null;
}

function formatHuntPresetMetric(value, suffix = "") {
  return Number.isFinite(Number(value))
    ? `${Math.round(Number(value)).toLocaleString("en-US")}${suffix}`
    : "-";
}

function getHuntPresetTagTone(tag = "") {
  const normalized = String(tag || "").trim().toLowerCase();
  if (normalized === "task") {
    return "task";
  }
  if (normalized === "danger") {
    return "danger";
  }
  return "combat";
}

function formatHuntPresetProfileSummary(profile = {}) {
  const minDistance = Math.round(Number(profile.keepDistanceMin) || 0);
  const maxDistance = Math.round(Number(profile.keepDistanceMax) || 0);
  const distanceLabel = minDistance > 0 || maxDistance > 1
    ? `${minDistance}-${maxDistance} sqm`
    : "melee/default";
  const stanceLabel = normalizeCombatStanceValue(profile?.chaseMode ?? profile?.stance ?? profile?.chaseStance) === "auto"
    ? "stance default"
    : `stance ${formatCombatStanceLabel(profile?.chaseMode ?? profile?.stance ?? profile?.chaseStance)}`;

  return [
    `prio ${Math.round(Number(profile.priority) || 0)}`,
    `danger ${Math.round(Number(profile.dangerLevel) || 0)}`,
    stanceLabel,
    TARGET_PROFILE_BEHAVIOR_LABELS[profile.behavior] || TARGET_PROFILE_BEHAVIOR_LABELS.kite,
    TARGET_PROFILE_KILL_MODE_LABELS[profile.killMode] || TARGET_PROFILE_KILL_MODE_LABELS.normal,
    distanceLabel,
    Number(profile.finishBelowPercent) > 0
      ? `finish <= ${Math.round(Number(profile.finishBelowPercent) || 0)}%`
      : "finish off",
  ].join(" / ");
}

function buildHuntPresetTargetProfile(preset = {}) {
  return normalizeTargetProfile({
    name: preset.monsterName || "",
    ...(preset.targetProfile || {}),
  }, preset.monsterName || "");
}

function buildHuntPresetPatch(preset = {}, { includeProfile = false } = {}) {
  const monsterName = String(preset?.monsterName || "").trim();
  if (!monsterName) {
    return null;
  }

  const patch = {
    monster: monsterName,
  };

  if (includeProfile) {
    patch.targetProfiles = [buildHuntPresetTargetProfile(preset)];
  }

  return patch;
}

function removeMonsterName(names, name) {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return normalizeMonsterNames(names);
  return normalizeMonsterNames(names).filter((entry) => entry.toLowerCase() !== key);
}

function toggleMonsterName(names, name) {
  const nextName = String(name || "").trim();
  if (!nextName) return normalizeMonsterNames(names);

  const current = normalizeMonsterNames(names);
  const key = nextName.toLowerCase();
  const exists = current.some((entry) => entry.toLowerCase() === key);

  return exists
    ? current.filter((entry) => entry.toLowerCase() !== key)
    : [...current, nextName];
}

function normalizeCreatureLedgerDraft(value = {}, fallback = {}) {
  const fallbackMonsters = sanitizeTargetMonsterNames(fallback?.monsters || fallback?.monsterArchive || []);
  const fallbackPlayers = normalizeMonsterNames(fallback?.players || fallback?.playerArchive || []);
  const fallbackNpcs = normalizeMonsterNames(fallback?.npcs || fallback?.npcArchive || []);

  if (!value || typeof value !== "object") {
    const npcs = fallbackNpcs;
    const npcKeys = new Set(npcs.map((name) => name.toLowerCase()));
    const players = fallbackPlayers.filter((name) => !npcKeys.has(name.toLowerCase()));
    const playerKeys = new Set(players.map((name) => name.toLowerCase()));
    return {
      monsters: fallbackMonsters.filter((name) => !playerKeys.has(name.toLowerCase()) && !npcKeys.has(name.toLowerCase())),
      players,
      npcs,
    };
  }

  const explicitMonsters = sanitizeTargetMonsterNames(value.monsters || []);
  const explicitPlayers = normalizeMonsterNames(value.players || []);
  const explicitNpcs = normalizeMonsterNames(value.npcs || []);
  const explicitMonsterKeys = new Set(explicitMonsters.map((name) => name.toLowerCase()));
  const explicitPlayerKeys = new Set(explicitPlayers.map((name) => name.toLowerCase()));
  const npcs = normalizeMonsterNames([...fallbackNpcs, ...explicitNpcs]);
  const npcKeys = new Set(npcs.map((name) => name.toLowerCase()));
  const players = normalizeMonsterNames([
    ...fallbackPlayers.filter((name) => {
      const key = name.toLowerCase();
      return !explicitMonsterKeys.has(key) || explicitPlayerKeys.has(key);
    }),
    ...explicitPlayers,
  ]).filter((name) => !npcKeys.has(name.toLowerCase()));
  const playerKeys = new Set(players.map((name) => name.toLowerCase()));

  return {
    monsters: sanitizeTargetMonsterNames([...fallbackMonsters, ...explicitMonsters])
      .filter((name) => !playerKeys.has(name.toLowerCase()) && !npcKeys.has(name.toLowerCase())),
    players,
    npcs,
  };
}

function setCreatureLedgerEntryCategory(ledger, name, targetKind = "monster") {
  const nextName = String(name || "").trim();
  if (!nextName) {
    return normalizeCreatureLedgerDraft(ledger);
  }

  const normalized = normalizeCreatureLedgerDraft(ledger);
  const nextKey = nextName.toLowerCase();
  const nextLedger = {
    monsters: normalized.monsters.filter((entry) => entry.toLowerCase() !== nextKey),
    players: normalized.players.filter((entry) => entry.toLowerCase() !== nextKey),
    npcs: normalized.npcs.filter((entry) => entry.toLowerCase() !== nextKey),
  };

  if (targetKind === "player") {
    nextLedger.players.push(nextName);
  } else if (targetKind === "npc") {
    nextLedger.npcs.push(nextName);
  } else {
    nextLedger.monsters.push(nextName);
  }

  return normalizeCreatureLedgerDraft(nextLedger);
}

function getCreatureLedgerRenderKey(ledger = {}) {
  const normalized = normalizeCreatureLedgerDraft(ledger);
  return [
    normalized.monsters.join(","),
    normalized.players.join(","),
    normalized.npcs.join(","),
  ].join("::");
}

function buildCreatureRegistryEntries({
  selectedNames = [],
  archivedNames = [],
  visibleNames = [],
} = {}) {
  const registry = new Map();

  const ingest = (names, flags = {}) => {
    for (const name of normalizeMonsterNames(names)) {
      const key = name.toLowerCase();
      const previous = registry.get(key) || {
        key,
        name,
        selected: false,
        archived: false,
        visible: false,
      };
      registry.set(key, {
        ...previous,
        name: previous.name || name,
        selected: previous.selected || flags.selected === true,
        archived: previous.archived || flags.archived === true,
        visible: previous.visible || flags.visible === true,
      });
    }
  };

  ingest(archivedNames, { archived: true });
  ingest(visibleNames, { visible: true });
  ingest(selectedNames, { selected: true });

  return [...registry.values()].sort((left, right) => compareDisplayNames(left.name, right.name));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPage(url) {
  if (!url) return "-";
  try {
    const parsed = new URL(url);
    return parsed.hostname || parsed.pathname || url;
  } catch {
    return url;
  }
}

function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function formatMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${Math.round(parsed)} ms`;
}

function formatDurationMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  const ms = Math.round(parsed);
  if (ms >= 60_000) {
    const minutes = ms / 60_000;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
  }
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
  }
  return `${ms} ms`;
}

function formatRuntimeTimingMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "-";
  if (parsed > 0 && parsed < 10) return `${parsed.toFixed(1)} ms`;
  return `${Math.round(parsed)} ms`;
}

function formatClockTime(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return new Date(parsed).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getSessionHealthPercent(session) {
  const healthPercent = Number(session?.playerStats?.healthPercent);
  return Number.isFinite(healthPercent) ? Math.round(healthPercent) : null;
}

function isSessionDead(session) {
  const health = Number(session?.playerStats?.health);
  if (Number.isFinite(health)) {
    return health <= 0;
  }

  const healthPercent = Number(session?.playerStats?.healthPercent);
  return Number.isFinite(healthPercent) ? healthPercent <= 0 : false;
}

function getLiveCharacterNameKeys() {
  return new Set(
    getFollowTrainLiveCharacterNames()
      .map((name) => String(name || "").trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeAlarmRangeValue(value, fallback = 0) {
  return Math.max(0, Math.trunc(Number(value) || fallback || 0));
}

function getAlarmSettings(source = state?.options || {}) {
  const alarmsEnabled = source?.alarmsEnabled !== false;
  const blacklistNames = normalizeMonsterNames(source?.alarmsBlacklistNames || []);
  const blacklistNameKeys = new Set(blacklistNames.map((name) => name.toLowerCase()));
  return {
    enabled: alarmsEnabled,
    player: {
      enabled: alarmsEnabled && source?.alarmsPlayerEnabled !== false,
      radiusSqm: normalizeAlarmRangeValue(source?.alarmsPlayerRadiusSqm, 8),
      floorRange: normalizeAlarmRangeValue(source?.alarmsPlayerFloorRange, 0),
    },
    staff: {
      enabled: alarmsEnabled && source?.alarmsStaffEnabled !== false,
      radiusSqm: normalizeAlarmRangeValue(source?.alarmsStaffRadiusSqm, 9),
      floorRange: normalizeAlarmRangeValue(source?.alarmsStaffFloorRange, 1),
    },
    blacklist: {
      enabled: alarmsEnabled && source?.alarmsBlacklistEnabled !== false,
      names: blacklistNames,
      nameKeys: blacklistNameKeys,
      radiusSqm: normalizeAlarmRangeValue(source?.alarmsBlacklistRadiusSqm, 9),
      floorRange: normalizeAlarmRangeValue(source?.alarmsBlacklistFloorRange, 1),
    },
  };
}

function getSessionAlarmSettings(session) {
  const activeSessionId = String(state?.activeSessionId || "");
  const sessionId = String(session?.id || "");
  const source = session?.alarmOptions && typeof session.alarmOptions === "object"
    ? session.alarmOptions
    : sessionId && sessionId === activeSessionId
      ? state?.options || {}
      : {};
  return getAlarmSettings(source);
}

function classifyAlarmPlayerEntry(entry, settings = getAlarmSettings()) {
  const nameKey = String(entry?.name || "").trim().toLowerCase();
  if (nameKey && settings.blacklist.nameKeys.has(nameKey)) {
    return "blacklist";
  }
  if (STAFF_PLAYER_NAME_PATTERN.test(String(entry?.name || "").trim())) {
    return "staff";
  }
  return "player";
}

function getAlarmCategoryConfig(kind, settings = getAlarmSettings()) {
  if (kind === "blacklist") return settings.blacklist;
  if (kind === "staff") return settings.staff;
  return settings.player;
}

function getSessionPlayerOffset(entry, session) {
  const from = session?.playerPosition || null;
  const to = entry?.position || null;
  if (!from || !to) {
    return {
      dx: null,
      dy: null,
      dz: null,
      horizontalSqm: null,
      floorDelta: null,
      hasGeometry: false,
    };
  }

  const dx = Number(to.x) - Number(from.x);
  const dy = Number(to.y) - Number(from.y);
  const dz = Number(to.z) - Number(from.z);
  return {
    dx,
    dy,
    dz,
    horizontalSqm: Math.max(Math.abs(dx), Math.abs(dy)),
    floorDelta: Math.abs(dz),
    hasGeometry: Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz),
  };
}

function isAlarmEntryWithinConfig(entry, session, kind, settings = getAlarmSettings()) {
  const config = getAlarmCategoryConfig(kind, settings);
  if (!config?.enabled) return false;

  const offset = getSessionPlayerOffset(entry, session);
  if (!offset.hasGeometry) {
    return kind !== "player";
  }

  return offset.horizontalSqm <= config.radiusSqm
    && offset.floorDelta <= config.floorRange;
}

function getSessionPlayerAlarmState(session, settings = getAlarmSettings()) {
  const visiblePlayerEntries = getSessionVisiblePlayers(session);
  const blacklistedPlayers = [];
  const audibleEntries = [];

  for (const entry of visiblePlayerEntries) {
    const kind = classifyAlarmPlayerEntry(entry, settings);
    if (kind === "blacklist") {
      blacklistedPlayers.push(entry.name);
    }

    if (!isAlarmEntryWithinConfig(entry, session, kind, settings)) {
      continue;
    }

    audibleEntries.push({
      ...entry,
      kind,
      offset: getSessionPlayerOffset(entry, session),
    });
  }

  let audibleKind = null;
  for (const entry of audibleEntries) {
    audibleKind = selectHigherPriorityAlertKind(audibleKind, entry.kind);
  }

  return {
    blacklistedPlayers: normalizeMonsterNames(blacklistedPlayers),
    audibleEntries,
    audibleKind,
  };
}

function getAlarmCategoryUi(kind = "player") {
  return ALARM_CATEGORY_UI[kind] || ALARM_CATEGORY_UI.player;
}

function formatAlarmFloorRangeLabel(floorRange = 0) {
  const normalized = normalizeAlarmRangeValue(floorRange, 0);
  return normalized > 0
    ? `+/-${normalized} floor${normalized === 1 ? "" : "s"}`
    : "same floor";
}

function formatAlarmScope(radiusSqm = 0, floorRange = 0) {
  return `${normalizeAlarmRangeValue(radiusSqm, 0)} sqm / ${formatAlarmFloorRangeLabel(floorRange)}`;
}

function formatAlarmOffsetLabel(offset = null) {
  if (!offset?.hasGeometry) {
    return "no position";
  }

  const horizontalSqm = Math.max(0, Math.trunc(Number(offset.horizontalSqm) || 0));
  const dz = Math.trunc(Number(offset.dz) || 0);
  const floorLabel = dz === 0
    ? "same floor"
    : `z${dz > 0 ? "+" : "-"}${Math.abs(dz)}`;
  return `${horizontalSqm} sqm / ${floorLabel}`;
}

function getAlarmSessionLabel(session = getBoundInstance()) {
  return getInstanceDisplayName(session)
    || String(session?.label || session?.characterName || session?.displayName || "").trim()
    || "No live session";
}

function buildAlarmModuleView(source = state?.options || {}, session = getBoundInstance()) {
  const settings = getAlarmSettings(source);
  const sessionLabel = getAlarmSessionLabel(session);
  const visibleEntries = getSessionVisiblePlayers(session)
    .map((entry) => {
      const kind = classifyAlarmPlayerEntry(entry, settings);
      const config = getAlarmCategoryConfig(kind, settings);
      const offset = getSessionPlayerOffset(entry, session);
      const audible = isAlarmEntryWithinConfig(entry, session, kind, settings);
      return {
        ...entry,
        kind,
        config,
        offset,
        audible,
      };
    })
    .sort((left, right) => (
      Number(right.audible) - Number(left.audible)
      || (ALERT_KIND_PRIORITY[right.kind] || 0) - (ALERT_KIND_PRIORITY[left.kind] || 0)
      || compareDisplayNames(left.name, right.name)
    ));
  const audibleEntries = visibleEntries.filter((entry) => entry.audible);
  const counts = {
    player: { visible: 0, audible: 0 },
    staff: { visible: 0, audible: 0 },
    blacklist: { visible: 0, audible: 0 },
  };

  visibleEntries.forEach((entry) => {
    counts[entry.kind].visible += 1;
    if (entry.audible) {
      counts[entry.kind].audible += 1;
    }
  });

  let audibleKind = null;
  audibleEntries.forEach((entry) => {
    audibleKind = selectHigherPriorityAlertKind(audibleKind, entry.kind);
  });

  let headline = "Off";
  let detail = "All player proximity alarms are disabled.";
  let tone = "off";

  if (settings.enabled) {
    if (!session) {
      headline = "Ready";
      detail = "Select a live session to preview the current alarm reach.";
      tone = "quiet";
    } else if (audibleEntries.length) {
      const strongestEntries = audibleEntries.filter((entry) => entry.kind === audibleKind);
      const names = strongestEntries.map((entry) => entry.name);
      const preview = names.slice(0, 3).join(", ");
      headline = audibleKind === "blacklist"
        ? `${formatRuleLabel(names.length, "blacklist target")} in range`
        : audibleKind === "staff"
          ? `${formatRuleLabel(names.length, "staff target")} in range`
          : `${formatRuleLabel(names.length, "player")} in range`;
      detail = `${sessionLabel}: ${preview}${names.length > 3 ? ` +${names.length - 3}` : ""}`;
      tone = audibleKind;
    } else if (visibleEntries.length) {
      const nearestEntry = visibleEntries
        .filter((entry) => entry.offset?.hasGeometry)
        .sort((left, right) => (
          Number(left.offset.horizontalSqm) - Number(right.offset.horizontalSqm)
          || Number(left.offset.floorDelta) - Number(right.offset.floorDelta)
          || compareDisplayNames(left.name, right.name)
        ))[0];
      headline = `${formatRuleLabel(visibleEntries.length, "nearby player")} muted`;
      detail = nearestEntry
        ? `${sessionLabel}: nearest ${nearestEntry.name} at ${formatAlarmOffsetLabel(nearestEntry.offset)}`
        : `${sessionLabel}: visible names are outside the active alarm boxes`;
      tone = "quiet";
    } else {
      headline = "Clear";
      detail = `${sessionLabel}: no nearby players detected.`;
      tone = "clear";
    }
  }

  return {
    settings,
    session,
    sessionLabel,
    visibleEntries,
    audibleEntries,
    audibleKind,
    counts,
    headline,
    detail,
    tone,
  };
}

function getAlarmSummaryData(source = state?.options || {}, session = getBoundInstance()) {
  const view = buildAlarmModuleView(source, session);
  const { settings } = view;
  const headline = settings.enabled
    ? (view.audibleKind === "blacklist"
      ? "Blacklist"
      : view.audibleKind === "staff"
        ? "GM / GOD"
        : view.audibleKind === "player"
          ? `${view.audibleEntries.length} near`
          : view.visibleEntries.length
            ? `${view.visibleEntries.length} seen`
            : "Clear")
    : "Off";
  const detail = [
    settings.player.enabled ? `P ${formatAlarmScope(settings.player.radiusSqm, settings.player.floorRange)}` : "P off",
    settings.staff.enabled ? `GM ${formatAlarmScope(settings.staff.radiusSqm, settings.staff.floorRange)}` : "GM off",
    settings.blacklist.enabled
      ? `BL ${settings.blacklist.names.length} name${settings.blacklist.names.length === 1 ? "" : "s"}`
      : "BL off",
  ].join(" / ");

  return {
    ...view,
    headline,
    detail,
  };
}

function mergeSessionVisiblePlayerEntry(existing, incoming) {
  return {
    id: existing?.id ?? incoming?.id ?? null,
    name: String(existing?.name || incoming?.name || "").trim(),
    position: existing?.position || incoming?.position || null,
    healthPercent: Number.isFinite(Number(existing?.healthPercent))
      ? Number(existing.healthPercent)
      : (Number.isFinite(Number(incoming?.healthPercent)) ? Number(incoming.healthPercent) : null),
    skull: existing?.skull || incoming?.skull || null,
    isTargetingSelf: existing?.isTargetingSelf === true || incoming?.isTargetingSelf === true,
  };
}

function getSessionVisiblePlayers(session) {
  const liveCharacterNameKeys = getLiveCharacterNameKeys();
  const playersByNameKey = new Map();
  const appendPlayer = (entry) => {
    const name = String(entry?.name || "").trim();
    if (!name) return;

    const nameKey = name.toLowerCase();
    if (liveCharacterNameKeys.has(nameKey)) {
      return;
    }

    const normalized = {
      id: entry?.id ?? null,
      name,
      position: entry?.position || null,
      healthPercent: Number.isFinite(Number(entry?.healthPercent)) ? Number(entry.healthPercent) : null,
      skull: entry?.skull || null,
      isTargetingSelf: entry?.isTargetingSelf === true,
    };
    const existing = playersByNameKey.get(nameKey);
    playersByNameKey.set(nameKey, existing ? mergeSessionVisiblePlayerEntry(existing, normalized) : normalized);
  };

  for (const entry of Array.isArray(session?.visiblePlayers) ? session.visiblePlayers : []) {
    appendPlayer(entry);
  }

  for (const name of normalizeMonsterNames(session?.visiblePlayerNames || [])) {
    appendPlayer({ name });
  }

  return Array.from(playersByNameKey.values())
    .sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || "")));
}

function getSessionVisiblePlayerNames(session) {
  return getSessionVisiblePlayers(session).map((entry) => entry.name);
}

function getSessionStaffPlayerNames(session) {
  return getSessionVisiblePlayers(session)
    .filter((entry) => STAFF_PLAYER_NAME_PATTERN.test(String(entry?.name || "").trim()))
    .map((entry) => entry.name);
}

function isSessionVisiblePlayerSkulled(entry) {
  const skullKey = String(entry?.skull?.key || "").trim().toLowerCase();
  return Boolean(skullKey && skullKey !== "none");
}

function getSessionAlertFlags(session) {
  const healthPercent = getSessionHealthPercent(session);
  const visiblePlayerEntries = getSessionVisiblePlayers(session);
  const visiblePlayers = visiblePlayerEntries.map((entry) => entry.name);
  const alarmSettings = getSessionAlarmSettings(session);
  const staffPlayers = getSessionStaffPlayerNames(session);
  const playersTargetingSelf = visiblePlayerEntries
    .filter((entry) => entry?.isTargetingSelf === true)
    .map((entry) => entry.name);
  const skulledPlayers = visiblePlayerEntries
    .filter((entry) => isSessionVisiblePlayerSkulled(entry))
    .map((entry) => entry.name);
  const playerAlarmState = getSessionPlayerAlarmState(session, alarmSettings);
  const hostilePlayers = normalizeMonsterNames([
    ...playersTargetingSelf,
    ...staffPlayers,
    ...skulledPlayers,
    ...playerAlarmState.blacklistedPlayers,
  ]);
  const dead = isSessionDead(session);
  const stale = session?.stale === true;
  const lowHealth = !dead && healthPercent != null && healthPercent < SESSION_EMERGENCY_HEALTH_PERCENT;
  const hasPlayers = visiblePlayers.length > 0;
  const hasStaff = staffPlayers.length > 0;
  const hasHostilePlayers = hostilePlayers.length > 0;
  const hostileAudioKind = playerAlarmState.audibleKind === "blacklist"
    ? "blacklist"
    : (playersTargetingSelf.length || skulledPlayers.length || hasStaff)
      ? "staff"
      : null;
  const alertKind = dead
    ? "death"
    : hasHostilePlayers
      ? "hostile"
      : (stale || lowHealth || hasPlayers)
        ? "emergency"
        : null;
  const audioAlertKind = dead
    ? "death"
    : hostileAudioKind
      ? hostileAudioKind
      : playerAlarmState.audibleKind
        ? playerAlarmState.audibleKind
        : (stale || lowHealth)
          ? "emergency"
          : null;

  return {
    stale,
    lowHealth,
    hasPlayers,
    hasStaff,
    hasHostilePlayers,
    dead,
    healthPercent,
    visiblePlayers,
    staffPlayers,
    playersTargetingSelf,
    skulledPlayers,
    blacklistedPlayers: playerAlarmState.blacklistedPlayers,
    hostilePlayers,
    alertKind,
    audioAlertKind,
    emergency: Boolean(alertKind),
  };
}

function getAlertAudioContext() {
  if (alertAudioContext) return alertAudioContext;

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;

  try {
    alertAudioContext = new AudioContextCtor();
  } catch {
    alertAudioContext = null;
  }

  return alertAudioContext;
}

async function prepareAlertAudioContext() {
  const audioContext = getAlertAudioContext();
  if (!audioContext) return null;

  if (typeof audioContext.resume === "function" && audioContext.state === "suspended") {
    await audioContext.resume().catch(() => { });
  }

  if (typeof audioContext.createOscillator !== "function" || typeof audioContext.createGain !== "function") {
    return null;
  }

  return audioContext;
}

function scheduleAlertProfile(audioContext, kind, trackedNodes = null) {
  const profile = ALERT_BEEP_PROFILES[kind];
  if (!profile?.length || !audioContext) return 0;

  const startAt = (audioContext.currentTime || 0) + 0.01;
  let totalDurationMs = 0;

  for (const tone of profile) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const offsetSeconds = (tone.delayMs || 0) / 1000;
    const durationSeconds = (tone.durationMs || 120) / 1000;
    const beganAt = startAt + offsetSeconds;
    const endedAt = beganAt + durationSeconds;
    const peakGain = Number(tone.gain) || 0.035;

    oscillator.type = tone.type || "sine";
    if (oscillator.frequency?.setValueAtTime) {
      oscillator.frequency.setValueAtTime(Number(tone.frequency) || 880, beganAt);
    }

    if (gainNode.gain?.setValueAtTime && gainNode.gain?.exponentialRampToValueAtTime) {
      gainNode.gain.setValueAtTime(0.0001, beganAt);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, beganAt + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endedAt);
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(beganAt);
    oscillator.stop(endedAt + 0.02);

    if (trackedNodes) {
      trackedNodes.add({ oscillator, gainNode });
    }

    totalDurationMs = Math.max(totalDurationMs, (tone.delayMs || 0) + (tone.durationMs || 120));
  }

  return totalDurationMs;
}

function stopContinuousAlertNodes() {
  for (const node of continuousAlertState.nodes) {
    try {
      node?.oscillator?.stop?.(0);
    } catch { }

    try {
      node?.oscillator?.disconnect?.();
    } catch { }

    try {
      node?.gainNode?.disconnect?.();
    } catch { }
  }

  continuousAlertState.nodes.clear();
}

function stopContinuousAlertBeep() {
  if (continuousAlertState.timerId != null) {
    window.clearTimeout(continuousAlertState.timerId);
    continuousAlertState.timerId = null;
  }

  continuousAlertState.kind = null;
  continuousAlertState.token += 1;
  stopContinuousAlertNodes();
}

async function startContinuousAlertLoop(kind, token) {
  const audioContext = await prepareAlertAudioContext();
  if (!audioContext) return;

  if (continuousAlertState.token !== token || continuousAlertState.kind !== kind) {
    return;
  }

  const cycleMs = scheduleAlertProfile(audioContext, kind, continuousAlertState.nodes);
  if (cycleMs <= 0) return;

  continuousAlertState.timerId = window.setTimeout(() => {
    if (continuousAlertState.token !== token || continuousAlertState.kind !== kind) {
      return;
    }

    continuousAlertState.nodes.clear();
    void startContinuousAlertLoop(kind, token);
  }, cycleMs + 40);
}

function setContinuousAlertKind(kind) {
  const nextKind = kind || null;
  if (nextKind && continuousAlertState.kind === nextKind && continuousAlertState.timerId != null) {
    return;
  }

  stopContinuousAlertBeep();
  if (!nextKind) return;

  continuousAlertState.kind = nextKind;
  continuousAlertState.token += 1;
  const token = continuousAlertState.token;
  void startContinuousAlertLoop(nextKind, token);
}

function selectHigherPriorityAlertKind(currentKind, candidateKind) {
  if (!candidateKind) return currentKind;
  if (!currentKind) return candidateKind;
  return (ALERT_KIND_PRIORITY[candidateKind] || 0) > (ALERT_KIND_PRIORITY[currentKind] || 0)
    ? candidateKind
    : currentKind;
}

async function playAlertBeep(kind) {
  if (!ALERT_BEEP_PROFILES[kind]?.length) return;

  alertBeepChain = alertBeepChain
    .catch(() => { })
    .then(async () => {
      const audioContext = await prepareAlertAudioContext();
      if (!audioContext) return;

      const totalDurationMs = scheduleAlertProfile(audioContext, kind);
      if (totalDurationMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, totalDurationMs + 40));
      }
    });

  return alertBeepChain;
}

function syncSessionAlerts() {
  let activeAlertKind = null;

  for (const session of state?.sessions || []) {
    const nextFlags = getSessionAlertFlags(session);
    activeAlertKind = selectHigherPriorityAlertKind(activeAlertKind, nextFlags.audioAlertKind);
  }

  setContinuousAlertKind(activeAlertKind);
}

function getSessionContextKey(sourceState = state) {
  const sessionId = String(sourceState?.activeSessionId || "");
  const profileKey = String(
    sourceState?.binding?.profileKey
    || getBoundInstance(sourceState)?.profileKey
    || "",
  );

  if (!sessionId && !profileKey) {
    return "";
  }

  return `${sessionId}::${profileKey}`;
}

function getSessionResetWaypointIndex(sourceState = state) {
  const waypoints = sourceState?.options?.waypoints || [];
  if (!waypoints.length) {
    return 0;
  }

  const preferredIndex = Number.isFinite(Number(sourceState?.overlayFocusIndex))
    ? Number(sourceState.overlayFocusIndex)
    : Number(sourceState?.routeIndex);

  return Math.max(
    0,
    Math.min(
      Number.isFinite(preferredIndex) ? Math.trunc(preferredIndex) : 0,
      waypoints.length - 1,
    ),
  );
}

function resetSessionScopedUiState(nextState) {
  sessionContextResetPending = true;
  targetingDirty = false;
  resetTargetQueueDraft();
  resetTargetProfilesDraft();
  targetProfilesRenderedKey = "";
  resetModulesDraft();
  resetAutowalkDraft({ routeLibrary: true });
  clearPendingDangerAction();
  clearRouteUndoState();
  clearArchiveUndoState();
  closeWaypointAddPanel();
  routeLibraryRenderedKey = "";
  waypointListStructureRenderedKey = "";
  waypointListStateRenderedKey = "";
  monsterArchiveRenderedKey = "";
  logsRenderedKey = "";
  runtimeMetricsRenderedKey = "";
  resetLogOutputRenderCache();
  selectedWaypointIndex = getSessionResetWaypointIndex(nextState);
  markedWaypointIndexes = new Set();
  routeLiveResumeTargetKey = "";
}

function applyState(nextState, { patch = false } = {}) {
  const applyStartedAt = getMonotonicNowMs();
  if (!nextState) return null;

  try {
    const previousContextKey = getSessionContextKey(state);
    const resolvedState = patch && state
      ? { ...state, ...nextState }
      : nextState;
    const nextContextKey = getSessionContextKey(resolvedState);
    state = resolvedState;
    if (Object.prototype.hasOwnProperty.call(resolvedState, "viewMode")) {
      const nextViewMode = normalizeViewMode(resolvedState.viewMode);
      if (nextViewMode !== uiViewMode) {
        uiViewMode = nextViewMode;
        syncViewModeUi();
      }
    }
    setMarkedWaypointIndexes(getMarkedWaypointIndexes(state?.options?.waypoints || []), state?.options?.waypoints || []);
    if (routeLiveResumeTargetKey) {
      const waypoints = state?.options?.waypoints || [];
      const selectedWaypoint = waypoints[selectedWaypointIndex] || null;
      const selectedKey = selectedWaypoint ? getWaypointIdentityKey(selectedWaypoint, selectedWaypointIndex) : "";
      const focusIndex = getOverlayFocusIndex(waypoints, state);
      const resumeTargetActive = selectedKey === routeLiveResumeTargetKey
        && (selectedWaypointIndex === state?.routeIndex || selectedWaypointIndex === focusIndex);

      if (!resumeTargetActive) {
        routeLiveResumeTargetKey = "";
      }
    }
    if (previousContextKey && nextContextKey && previousContextKey !== nextContextKey) {
      resetSessionScopedUiState(state);
    }
    syncSessionAlerts();
    return state;
  } finally {
    recordRendererRuntimeTiming("applyState", getMonotonicNowMs() - applyStartedAt, {
      patch: Boolean(patch),
      stateKeyCount: nextState && typeof nextState === "object" ? Object.keys(nextState).length : 0,
    });
  }
}

function getActiveRules(rules = []) {
  return Array.isArray(rules) ? rules.filter((rule) => rule?.enabled !== false) : [];
}

function formatRuleCount(rules = []) {
  const count = getActiveRules(rules).length;
  if (!count) {
    return "no rules";
  }

  return `${count} rule${count === 1 ? "" : "s"}`;
}

function formatHealerRuleSummary(rules = []) {
  const activeRules = getActiveRules(rules).filter((rule) => rule?.words);
  const resolvedVocation = getHealerResolvedVocation();

  if (!activeRules.length) {
    return "-";
  }

  return activeRules
    .map((rule) => `${formatPercent(rule.maxHealthPercent)} ${formatHealerActionLabel(rule.words, resolvedVocation)}`)
    .join("; ");
}

function formatSpellRuleSummary(rules = [], formatter = null) {
  const activeRules = getActiveRules(rules).filter((rule) => rule?.words);

  if (!activeRules.length) {
    return "-";
  }

  return activeRules
    .map((rule) => (typeof formatter === "function" ? formatter(rule) : rule.words))
    .join("; ");
}

function formatRulePreview(rules = [], formatter = null, {
  empty = "-",
  limit = 2,
} = {}) {
  const activeRules = getActiveRules(rules);

  if (!activeRules.length) {
    return empty;
  }

  const preview = activeRules
    .slice(0, Math.max(1, limit))
    .map((rule) => (typeof formatter === "function" ? formatter(rule) : ""))
    .filter(Boolean);

  if (!preview.length) {
    return empty;
  }

  const remaining = Math.max(0, activeRules.length - preview.length);
  return remaining > 0
    ? `${preview.join("; ")}; +${remaining} more`
    : preview.join("; ");
}

function formatAutoLightQuickDetail(rules = []) {
  return formatRulePreview(rules, (rule) => formatRuleParts([
    formatRuleSpell(rule.words),
    `MP ${formatPercent(rule.minManaPercent)}+`,
    rule.requireNoLight ? "dark only" : "light ok",
    rule.requireNoTargets ? "no target" : null,
    rule.requireStationary ? "idle only" : null,
  ]), {
    empty: "No light spell rules",
  });
}

function formatAutoConvertQuickDetail(rules = []) {
  return formatRulePreview(rules, (rule) => formatRuleParts([
    formatMs(rule.cooldownMs),
    rule.requireNoTargets ? "no target" : "target ok",
    rule.requireStationary ? "idle only" : "move ok",
  ]), {
    empty: "No coin convert rules",
  });
}

function formatRuleLabel(count, singular = "rule", plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatModuleStatusLine(enabled, rules = []) {
  const totalRules = Array.isArray(rules) ? rules.length : 0;
  const activeRules = getActiveRules(rules).length;
  const modeLabel = enabled ? "On" : "Off";

  if (!totalRules) {
    return `${modeLabel} - no rules`;
  }

  return `${modeLabel} - ${formatRuleLabel(activeRules, "active", "active")} - ${formatRuleLabel(totalRules, "total", "total")}`;
}

function formatHealthWindow(minPercent, maxPercent) {
  return `${formatPercent(minPercent)}-${formatPercent(maxPercent)}`;
}

function buildHealerCoverageWindows(rules = []) {
  if (!Array.isArray(rules)) return [];

  const windows = new Array(rules.length).fill(null);
  let coveredThrough = -1;

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];
    if (!rule) continue;

    const configuredMin = Math.max(0, Math.min(100, Number(rule.minHealthPercent) || 0));
    const configuredMax = Math.max(0, Math.min(100, Number(rule.maxHealthPercent) || 0));
    const safeFloor = Math.max(0, Math.min(100, coveredThrough + 1));
    const effectiveMin = Math.max(0, Math.min(configuredMax, Math.min(configuredMin, safeFloor)));

    windows[index] = {
      min: effectiveMin,
      max: configuredMax,
      expanded: effectiveMin < configuredMin,
    };

    if (rule.enabled !== false) {
      coveredThrough = Math.max(coveredThrough, configuredMax);
    }
  }

  return windows;
}

function formatManaWindow(minPercent, maxPercent) {
  return `${formatPercent(minPercent)}-${formatPercent(maxPercent)}`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getManaWindowTrackMetrics(rule = {}) {
  const minPercent = clampPercent(rule.minManaPercent);
  const maxPercent = clampPercent(rule.maxManaPercent);
  const start = Math.min(minPercent, maxPercent);
  const end = Math.max(minPercent, maxPercent);
  let left = start;
  let width = end - start;

  if (width < 4) {
    left = Math.max(0, Math.min(96, start - ((4 - width) / 2)));
    width = 4;
  }

  if (left + width > 100) {
    left = Math.max(0, 100 - width);
  }

  return {
    minPercent,
    maxPercent,
    left,
    width,
  };
}

function formatRuleSpell(words) {
  const spell = String(words || "").trim();
  return spell || "No spell set";
}

function formatSpellPattern(pattern = "any") {
  switch (String(pattern || "any").trim().toLowerCase()) {
    case "adjacent":
      return "Adjacent";
    case "aligned":
      return "Aligned";
    case "diagonal":
      return "Diagonal";
    case "pack":
      return "Pack";
    case "any":
    default:
      return "Any";
  }
}

function formatDistanceBehavior(behavior = "kite") {
  switch (String(behavior || "kite").trim().toLowerCase()) {
    case "escape":
      return "Run Away";
    case "retreat":
      return "Retreat";
    case "hold":
      return "Hold";
    case "kite":
    default:
      return "Kite";
  }
}

function normalizeTextListSummary(value) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[\n,;]+/);
  const normalized = [];
  const seen = new Set();

  for (const entry of source) {
    const text = String(entry ?? "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

function formatTextListSummary(value, {
  empty = "-",
  separator = ", ",
} = {}) {
  const entries = normalizeTextListSummary(value);
  return entries.length ? entries.join(separator) : empty;
}

function formatFollowTrainHeadline(value) {
  const chain = normalizeTextListSummary(value);
  if (!chain.length) {
    return "No chain";
  }

  if (chain.length === 1) {
    return `Pilot ${chain[0]}`;
  }

  return `${chain.length} slots`;
}

function formatFollowTrainDetail(value, spacing = 0) {
  const chain = normalizeTextListSummary(value);
  const gap = Math.max(0, Math.trunc(Number(spacing) || 0));

  if (!chain.length) {
    return `Gap ${gap} sqm`;
  }

  return `Pilot ${chain[0]} / gap ${gap} sqm`;
}

function getResolvedTrainerPartnerName(modulesState = ensureModulesDraft(), sourceState = state) {
  const configuredName = String(modulesState?.trainerPartnerName || "").trim();
  const currentNameKeys = getCurrentSessionNameKeys(sourceState);
  if (configuredName && !currentNameKeys.has(configuredName.toLowerCase())) {
    return configuredName;
  }

  if (!modulesState?.trainerEnabled || modulesState?.partyFollowEnabled) {
    return "";
  }

  if (configuredName) {
    return getFollowTrainLiveCharacterNames(sourceState)
      .find((name) => !currentNameKeys.has(name.toLowerCase()))
      || normalizeTextListSummary(modulesState?.partyFollowMembers)
        .find((name) => !currentNameKeys.has(name.toLowerCase()))
      || "";
  }

  return normalizeTextListSummary(modulesState?.partyFollowMembers)
    .find((name) => !currentNameKeys.has(name.toLowerCase())) || "";
}

function formatTrainerPartnerHeadline(name = "") {
  const partnerName = String(name || "").trim();
  return partnerName || "No partner";
}

function formatTrainerPartnerDetail(name = "", spacing = 0) {
  const partnerName = String(name || "").trim();
  const gap = Math.max(1, Math.trunc(Number(spacing) || 0));
  return partnerName
    ? `${partnerName} / keep within ${gap} sqm`
    : `Set partner / keep within ${gap} sqm`;
}

function getTrainerManaTrainerRule(options = {}) {
  const rules = Array.isArray(options?.trainerManaTrainerRules) ? options.trainerManaTrainerRules : [];
  const rule = rules.find((entry) => String(entry?.words || "").trim());
  if (rule) {
    return rule;
  }

  const words = String(options?.trainerManaTrainerWords || "").trim();
  if (!words) {
    return null;
  }

  return {
    words,
    minManaPercent: Number(options?.trainerManaTrainerManaPercent) || 0,
    minHealthPercent: Number(options?.trainerManaTrainerMinHealthPercent) || 0,
    maxManaPercent: 100,
  };
}

function formatTrainerManaTrainerHeadline(options = {}) {
  if (options?.trainerManaTrainerEnabled !== true) {
    return "Off";
  }

  const rule = getTrainerManaTrainerRule(options);
  return rule ? formatRuleSpell(rule.words) : "Set spell";
}

function formatTrainerManaTrainerDetail(options = {}, { empty = "Off" } = {}) {
  if (options?.trainerManaTrainerEnabled !== true) {
    return empty;
  }

  const rule = getTrainerManaTrainerRule(options);
  if (!rule) {
    return "Set spell / trainer target stays allowed";
  }

  return `${formatRuleSpell(rule.words)} / MP ${formatPercent(rule.minManaPercent)}+ / HP ${formatPercent(rule.minHealthPercent)}+`;
}

function formatBankingOperation(operation = "deposit-all") {
  switch (String(operation || "deposit-all").trim().toLowerCase()) {
    case "deposit":
      return "Deposit";
    case "deposit-excess":
      return "Deposit Excess";
    case "withdraw":
      return "Withdraw";
    case "withdraw-up-to":
      return "Withdraw Up To";
    case "balance":
      return "Balance";
    case "transfer":
      return "Transfer";
    case "deposit-all":
    default:
      return "Deposit All";
  }
}

function formatVocationLabel(vocation = "") {
  const normalized = String(vocation || "").trim().toLowerCase();
  if (!normalized) {
    return "Auto";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getDetectedVocationInfo(sourceState = state) {
  const progression = sourceState?.snapshot?.progression || null;
  return {
    vocation: String(progression?.vocation || "").trim().toLowerCase(),
    source: String(progression?.vocationSource || "").trim().toLowerCase(),
  };
}

function getDeathHealResolvedVocation(modulesState = ensureModulesDraft(), sourceState = state) {
  const overrideVocation = String(modulesState?.deathHealVocation || "").trim().toLowerCase();
  if (overrideVocation) {
    return overrideVocation;
  }

  const detected = getDetectedVocationInfo(sourceState);
  if (detected.vocation) {
    return detected.vocation;
  }

  return String(sourceState?.options?.vocation || "").trim().toLowerCase();
}

function getDeathHealSpellOptions(vocation = "") {
  const normalizedVocation = String(vocation || "").trim().toLowerCase();
  return DEATH_HEAL_SPELL_OPTIONS_BY_VOCATION[normalizedVocation]
    || DEATH_HEAL_SPELL_OPTIONS_BY_VOCATION.default;
}

function formatDeathHealSpellLabel(words = "", vocation = "") {
  const normalizedWords = String(words || "").trim().toLowerCase();
  if (!normalizedWords) {
    const strongest = getDeathHealSpellOptions(vocation)[0];
    return strongest ? `Auto strongest (${strongest.value})` : "Auto strongest";
  }

  const matchedOption = getDeathHealSpellOptions(vocation)
    .find((option) => String(option.value || "").trim().toLowerCase() === normalizedWords)
    || DEATH_HEAL_SPELL_OPTIONS_BY_VOCATION.default
      .find((option) => String(option.value || "").trim().toLowerCase() === normalizedWords);

  return matchedOption?.label || normalizedWords;
}

function normalizeHealerActionValue(value = "") {
  const raw = String(value || "").trim();
  const canonicalRuneValue = HEALING_RUNE_ACTION_CANONICAL_VALUE_BY_KEY[raw.toLowerCase()];
  return canonicalRuneValue || raw;
}

function isHealerRuneActionValue(value = "") {
  return Boolean(HEALING_RUNE_ACTION_CANONICAL_VALUE_BY_KEY[String(value || "").trim().toLowerCase()]);
}

function getHealerResolvedVocation(sourceState = state) {
  const detected = getDetectedVocationInfo(sourceState);
  if (detected.vocation) {
    return detected.vocation;
  }

  return String(sourceState?.options?.vocation || "").trim().toLowerCase();
}

function getHealerActionOptions(vocation = "") {
  return HEALER_ACTION_LIBRARY;
}

function getHealerRecommendedActionOptions(vocation = "") {
  const normalizedVocation = String(vocation || "").trim().toLowerCase();
  if (!normalizedVocation) {
    return [];
  }

  return HEALER_ACTION_LIBRARY.filter((option) => (
    Array.isArray(option.supportedVocations)
    && option.supportedVocations.includes(normalizedVocation)
  ));
}

function buildHealerActionOptionGroups(options = []) {
  return HEALER_ACTION_GROUPS
    .map((group) => ({
      label: group.label,
      options: options.filter((option) => option.group === group.key),
    }))
    .filter((group) => group.options.length > 0);
}

function findHealerActionOption(value = "", vocation = "") {
  const normalizedValue = normalizeHealerActionValue(value).toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  return getHealerActionOptions(vocation)
    .find((option) => String(option.value || "").trim().toLowerCase() === normalizedValue)
    || null;
}

function formatHealerActionLabel(value = "", vocation = "") {
  const normalizedValue = normalizeHealerActionValue(value);
  if (!normalizedValue) {
    return "No heal action set";
  }

  return findHealerActionOption(normalizedValue, vocation)?.label || normalizedValue;
}

function formatHealerActionScope(value = "") {
  const normalizedValue = normalizeHealerActionValue(value);
  if (HEALER_HEAL_FRIEND_ACTION_PATTERN.test(normalizedValue)) {
    return "Partner";
  }
  if (HEALER_MASS_HEAL_ACTION_PATTERN.test(normalizedValue)) {
    return "Area";
  }
  return "Self";
}

function getHealerAutoRuneConfig(options = state?.options || {}) {
  const configuredName = normalizeHealerActionValue(options?.healerRuneName);
  const threshold = Math.max(0, Math.trunc(Number(options?.healerRuneHealthPercent) || 0));
  return {
    name: isHealerRuneActionValue(configuredName) ? configuredName : "",
    threshold,
    enabled: threshold > 0,
  };
}

function formatHealerAutoRuneSummary(options = state?.options || {}, { short = false } = {}) {
  const config = getHealerAutoRuneConfig(options);
  if (!config.enabled) {
    return short ? "Off" : "Auto rune off";
  }

  const runeLabel = config.name
    ? formatHealerActionLabel(config.name)
    : (short ? "Auto strongest" : "Auto strongest healing rune");
  return `${runeLabel} <= ${formatPercent(config.threshold)}`;
}

function formatPotionHealerItemLabel(value = "") {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return "No potion set";
  }

  return POTION_HEALER_ITEM_OPTIONS.find((option) => option.value === normalizedValue)?.label || normalizedValue;
}

function buildPotionHealerItemOptions(currentValue = "") {
  const normalizedValue = String(currentValue || "").trim();
  const options = [];

  if (
    normalizedValue
    && !POTION_HEALER_ITEM_OPTIONS.some((option) => option.value === normalizedValue)
  ) {
    options.push({
      value: normalizedValue,
      label: `Current custom / ${normalizedValue}`,
    });
  }

  return options.concat(POTION_HEALER_ITEM_OPTIONS);
}

function normalizeConditionHealerTriggerValue(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "poison") return "poisoned";
  if (normalized === "venom") return "poisoned";
  if (normalized === "magicshieldmissing") return "magic-shield-missing";
  if (normalized === "mana-shield-missing") return "magic-shield-missing";
  return normalized;
}

function formatConditionHealerTriggerLabel(value = "") {
  switch (normalizeConditionHealerTriggerValue(value)) {
    case "poisoned":
      return "Poisoned";
    case "magic-shield-missing":
      return "Magic Shield Missing";
    default:
      return String(value || "").trim() || "No trigger";
  }
}

function buildConditionHealerTriggerOptions(currentValue = "") {
  const normalizedValue = normalizeConditionHealerTriggerValue(currentValue);
  const options = [];

  if (
    normalizedValue
    && !CONDITION_HEALER_TRIGGER_OPTIONS.some((option) => option.value === normalizedValue)
  ) {
    options.push({
      value: normalizedValue,
      label: `Current custom / ${normalizedValue}`,
    });
  }

  return options.concat(CONDITION_HEALER_TRIGGER_OPTIONS);
}

function getConditionHealerActionOptions(trigger = "", vocation = "", currentValue = "") {
  const normalizedTrigger = normalizeConditionHealerTriggerValue(trigger);
  const normalizedVocation = String(vocation || "").trim().toLowerCase();
  const baseOptions = CONDITION_HEALER_ACTION_OPTIONS_BY_TRIGGER[normalizedTrigger] || [];
  const filteredOptions = normalizedVocation
    ? baseOptions.filter((option) => (
      !Array.isArray(option.supportedVocations)
      || option.supportedVocations.includes(normalizedVocation)
    ))
    : baseOptions;
  const normalizedValue = String(currentValue || "").trim();

  if (
    normalizedValue
    && !filteredOptions.some((option) => option.value === normalizedValue)
  ) {
    return [
      {
        value: normalizedValue,
        label: `Current custom / ${normalizedValue}`,
      },
      ...filteredOptions,
    ];
  }

  return filteredOptions;
}

function getPreferredConditionHealerActionValue(trigger = "", vocation = "", currentValue = "") {
  const normalizedValue = String(currentValue || "").trim();
  const options = getConditionHealerActionOptions(trigger, vocation);
  if (normalizedValue && options.some((option) => option.value === normalizedValue)) {
    return normalizedValue;
  }
  return options[0]?.value || normalizedValue;
}

function formatConditionHealerActionLabel(value = "", trigger = "", vocation = "") {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return "No action set";
  }

  return getConditionHealerActionOptions(trigger, vocation, normalizedValue)
    .find((option) => option.value === normalizedValue)?.label || normalizedValue;
}

function conditionHealerTriggerSupportsVocation(trigger = "", vocation = "") {
  const normalizedTrigger = normalizeConditionHealerTriggerValue(trigger);
  const normalizedVocation = String(vocation || "").trim().toLowerCase();
  const options = CONDITION_HEALER_ACTION_OPTIONS_BY_TRIGGER[normalizedTrigger] || [];
  if (!options.length) {
    return false;
  }

  if (!normalizedVocation) {
    return true;
  }

  return options.some((option) => (
    !Array.isArray(option.supportedVocations)
    || option.supportedVocations.includes(normalizedVocation)
  ));
}

function getHealerDraftSourceState(modulesState = ensureModulesDraft()) {
  return {
    ...state,
    options: {
      ...(state?.options || {}),
      ...(modulesState || {}),
    },
  };
}

function formatPotionHealerRuleSummary(rules = []) {
  return formatRulePreview(rules, (rule) => formatRuleParts([
    formatPotionHealerItemLabel(rule.itemName),
    `HP ${formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent)}`,
    `MP ${formatPercent(rule.minManaPercent)}+`,
  ]), {
    empty: "No active potion rules",
  });
}

function formatConditionHealerRuleSummary(rules = [], vocation = "") {
  return formatRulePreview(rules, (rule) => formatRuleParts([
    formatConditionHealerTriggerLabel(rule.condition),
    formatConditionHealerActionLabel(rule.words, rule.condition, vocation),
    `HP ${formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent)}`,
  ]), {
    empty: "No active condition rules",
  });
}

function getHealerFamilyCounts(options = state?.options || {}) {
  const autoRune = getHealerAutoRuneConfig(options);
  return {
    spell: getActiveRules(options?.healerRules || []).length,
    rune: autoRune.enabled ? 1 : 0,
    potion: getActiveRules(options?.potionHealerRules || []).length,
    condition: getActiveRules(options?.conditionHealerRules || []).length,
  };
}

function formatHealerFamilyCountSummary(options = state?.options || {}) {
  const counts = getHealerFamilyCounts(options);
  const segments = [];

  if (counts.spell) segments.push(`Spell ${counts.spell}`);
  if (counts.rune) segments.push("Rune");
  if (counts.potion) segments.push(`Potion ${counts.potion}`);
  if (counts.condition) segments.push(`Condition ${counts.condition}`);

  return segments.length ? segments.join(" / ") : "no rules";
}

function formatHealerCombinedDetail(options = state?.options || {}, sourceState = state) {
  const resolvedVocation = getHealerResolvedVocation({
    ...sourceState,
    options: {
      ...(sourceState?.options || {}),
      ...(options || {}),
    },
  });
  const segments = [];

  if (getActiveRules(options?.healerRules || []).length) {
    segments.push(`Spell ${formatHealerRuleSummary(options.healerRules)}`);
  }
  if (getHealerAutoRuneConfig(options).enabled) {
    segments.push(`Rune ${formatHealerAutoRuneSummary(options)}`);
  }
  if (getActiveRules(options?.potionHealerRules || []).length) {
    segments.push(`Potion ${formatPotionHealerRuleSummary(options.potionHealerRules)}`);
  }
  if (getActiveRules(options?.conditionHealerRules || []).length) {
    segments.push(`Condition ${formatConditionHealerRuleSummary(options.conditionHealerRules, resolvedVocation)}`);
  }

  return segments.length
    ? segments.join(" / ")
    : "No active spell, potion, or condition rules";
}

function getHealerFamilyStatus(moduleKey, modulesState = ensureModulesDraft()) {
  const schema = getModuleSchema(moduleKey);
  const rules = schema?.rulesKey && Array.isArray(modulesState?.[schema.rulesKey])
    ? modulesState[schema.rulesKey]
    : [];
  const enabled = Boolean(modulesState?.[schema?.enabledKey]);
  const sourceState = getHealerDraftSourceState(modulesState);
  const resolvedVocation = getHealerResolvedVocation(sourceState);

  return {
    enabled,
    rules,
    statusLine: formatModuleStatusLine(enabled, rules),
    currentLine: moduleKey === "potionHealer"
      ? formatPotionHealerRuleSummary(rules)
      : formatConditionHealerRuleSummary(rules, resolvedVocation),
  };
}

function buildHealerActionSelectOptions(vocation = "", currentValue = "") {
  const selectedValue = normalizeHealerActionValue(currentValue);
  const recommended = getHealerRecommendedActionOptions(vocation);
  const recommendedKeys = new Set(
    recommended.map((option) => String(option.value || "").trim().toLowerCase()),
  );
  const groups = [];

  if (
    selectedValue
    && !HEALER_ACTION_LIBRARY.some((option) => String(option.value || "").trim().toLowerCase() === selectedValue.toLowerCase())
  ) {
    groups.push({
      label: "Current Custom",
      options: [
        {
          value: selectedValue,
          label: `Current custom / ${selectedValue}`,
          group: "custom",
        },
      ],
    });
  }

  if (recommended.length) {
    groups.push({
      label: `Recommended for ${formatVocationLabel(vocation)}`,
      options: recommended,
    });
  }

  const remaining = HEALER_ACTION_LIBRARY.filter((option) => !recommendedKeys.has(String(option.value || "").trim().toLowerCase()));
  if (remaining.length) {
    return groups.concat(buildHealerActionOptionGroups(remaining));
  }

  return groups.length
    ? groups
    : buildHealerActionOptionGroups(HEALER_ACTION_LIBRARY);
}

function getHealerActionFieldNote(vocation = "", sourceState = state) {
  const detected = getDetectedVocationInfo(sourceState);
  if (detected.vocation) {
    return `Showing ${formatVocationLabel(vocation)}-ready actions first from ${detected.source || "live data"}. Full healer actions stay available below.`;
  }

  if (sourceState?.options?.vocation) {
    return `Showing ${formatVocationLabel(vocation)}-ready actions first from the route fallback vocation. Full healer actions stay available below.`;
  }

  return "No live vocation detected yet. Full healer actions stay visible.";
}

function renderHealerMetricCard(label, value, detail, tone = "safe") {
  return `
    <article class="healer-metric-card tone-${escapeAttributeValue(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderHealerLaneCard(title, status, detail, tone = "neutral") {
  return `
    <article class="healer-lane-card tone-${escapeAttributeValue(tone)}">
      <span class="healer-lane-kicker">${escapeHtml(status)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function renderHealerFamilyPanel(moduleKey, {
  title = "Family",
  kicker = "Configured",
  detail = "",
  cards = [],
  addLabel = "Add Rule",
} = {}, modulesState = ensureModulesDraft()) {
  const schema = getModuleSchema(moduleKey);
  const enabledField = schema?.enabledKey
    ? getModuleOptionFieldSpec(moduleKey, schema.enabledKey)
    : null;
  const familyStatus = getHealerFamilyStatus(moduleKey, modulesState);

  return `
    <section class="healer-family-panel" data-healer-family="${escapeAttributeValue(moduleKey)}">
      <div class="healer-family-head">
        <div class="healer-family-copy">
          <span class="healer-family-kicker">${escapeHtml(kicker)}</span>
          <strong class="healer-family-title">${escapeHtml(title)}</strong>
          ${detail ? `<p class="healer-family-detail">${escapeHtml(detail)}</p>` : ""}
        </div>
        <div class="healer-family-toggle">
          ${enabledField ? renderModuleOptionField(moduleKey, enabledField, modulesState?.[schema.enabledKey]) : ""}
        </div>
      </div>
      <div class="healer-family-status-row">
        <span data-healer-family-meta="${escapeAttributeValue(moduleKey)}">${escapeHtml(familyStatus.statusLine)}</span>
        <span data-healer-family-current="${escapeAttributeValue(moduleKey)}">${escapeHtml(familyStatus.currentLine)}</span>
      </div>
      ${cards.length ? `
        <div class="healer-family-card-grid">
          ${cards.join("")}
        </div>
      ` : ""}
      <div class="healer-family-rule-list" data-healer-family-rule-list="${escapeAttributeValue(moduleKey)}">
        ${renderModuleRuleList(moduleKey, familyStatus.rules)}
      </div>
      <div class="healer-family-toolbar">
        <button type="button" class="btn mini" data-add-module-rule="${escapeAttributeValue(moduleKey)}">${escapeHtml(addLabel)}</button>
      </div>
    </section>
  `;
}

function renderHealerFields(modulesState = ensureModulesDraft()) {
  const sourceState = getHealerDraftSourceState(modulesState);
  const detected = getDetectedVocationInfo(sourceState);
  const resolvedVocation = getHealerResolvedVocation(sourceState);
  const emergencyField = getModuleOptionFieldSpec("healer", "healerEmergencyHealthPercent");
  const runeNameField = getModuleOptionFieldSpec("healer", "healerRuneName");
  const runeHotkeyField = getModuleOptionFieldSpec("healer", "healerRuneHotkey");
  const runeThresholdField = getModuleOptionFieldSpec("healer", "healerRuneHealthPercent");
  const potionEnabledField = getModuleOptionFieldSpec("potionHealer", "potionHealerEnabled");
  const conditionEnabledField = getModuleOptionFieldSpec("conditionHealer", "conditionHealerEnabled");
  const threshold = Math.max(0, Math.trunc(Number(modulesState?.healerEmergencyHealthPercent) || 0));
  const autoRune = getHealerAutoRuneConfig(modulesState);
  const runtimeLabel = detected.vocation
    ? `${formatVocationLabel(detected.vocation)} via ${detected.source || "live data"}`
    : (state?.options?.vocation ? `Route fallback ${formatVocationLabel(state.options.vocation)}` : "No live vocation detected yet");
  const activeSpellRules = getActiveRules(modulesState?.healerRules || []);
  const spellSummary = activeSpellRules.length
    ? formatHealerRuleSummary(modulesState?.healerRules || [])
    : "No active spell tiers";
  const emergencySummary = threshold > 0
    ? `Heals stay ahead of non-heal casts at ${threshold}% HP and below.`
    : "Priority is off; rules still run top to bottom.";
  const magicShieldLive = conditionHealerTriggerSupportsVocation("magic-shield-missing", resolvedVocation);

  return `
    <div class="healer-shell">
      <section class="healer-setup-panel">
        <div class="healer-setup-head">
          <div class="healer-setup-copy">
            <span class="healer-overview-kicker">Healer Setup</span>
            <h3 class="healer-overview-title">${escapeHtml(resolvedVocation ? `${formatVocationLabel(resolvedVocation)} healer quick setup` : "Healer quick setup")}</h3>
            <p class="healer-overview-detail">Set the priority floor, arm the auto-rune threshold, then tune spell tiers below.</p>
          </div>
          <div class="healer-setup-stats">
            ${renderHealerMetricCard("Runtime", formatVocationLabel(resolvedVocation), runtimeLabel, "safe")}
            ${renderHealerMetricCard("Spell Tiers", `${activeSpellRules.length} active`, spellSummary, activeSpellRules.length ? "gate" : "timing")}
            ${renderHealerMetricCard("Auto Rune", autoRune.enabled ? `<= ${autoRune.threshold}%` : "Off", formatHealerAutoRuneSummary(modulesState), autoRune.enabled ? "trigger" : "timing")}
            ${renderHealerMetricCard("Support", "Target routing", "Partner -> current target -> solo visible player", "open")}
          </div>
        </div>

        <div class="form-grid healer-setup-grid">
          ${emergencyField ? renderModuleOptionField("healer", emergencyField, modulesState?.healerEmergencyHealthPercent) : ""}
          ${runeNameField ? renderModuleOptionField("healer", runeNameField, modulesState?.healerRuneName) : ""}
          ${runeHotkeyField ? renderModuleOptionField("healer", runeHotkeyField, modulesState?.healerRuneHotkey) : ""}
          ${runeThresholdField ? renderModuleOptionField("healer", runeThresholdField, modulesState?.healerRuneHealthPercent) : ""}
          ${potionEnabledField ? renderModuleOptionField("potionHealer", potionEnabledField, modulesState?.potionHealerEnabled) : ""}
          ${conditionEnabledField ? renderModuleOptionField("conditionHealer", conditionEnabledField, modulesState?.conditionHealerEnabled) : ""}
        </div>

        <div class="healer-setup-note">
          <div class="field-note">${escapeHtml(emergencySummary)}</div>
          <div class="field-note">Auto rune is a self-heal fallback after spell tiers and before potion healer or friend-heal.</div>
        </div>
      </section>

      <div class="healer-family-grid">
        ${renderHealerFamilyPanel("potionHealer", {
    title: "Potion Healer",
    kicker: "Self Potions",
    detail: "Ordered self-healing potions. Mana potions and generic fallback still stay in sustain.",
    addLabel: "Add Potion Rule",
  }, modulesState)}
        ${renderHealerFamilyPanel("conditionHealer", {
    title: "Condition Healer",
    kicker: "Detectable Only",
    detail: magicShieldLive
      ? "Poison cure and magic shield renewal are supported here."
      : `${formatVocationLabel(resolvedVocation)} supports poison cure here. Magic shield renewal is unavailable for the current runtime vocation.`,
    addLabel: "Add Condition Rule",
  }, modulesState)}
      </div>
    </div>
  `;
}

function renderDeathHealFields(modulesState = ensureModulesDraft()) {
  const detected = getDetectedVocationInfo();
  const resolvedVocation = getDeathHealResolvedVocation(modulesState);
  const configuredWords = String(modulesState?.deathHealWords || "").trim().toLowerCase();
  const spellOptions = getDeathHealSpellOptions(resolvedVocation);
  const selectedWords = configuredWords && spellOptions.some((option) => option.value === configuredWords)
    ? configuredWords
    : configuredWords;
  const detectedLabel = detected.vocation
    ? `${formatVocationLabel(detected.vocation)} via ${detected.source || "live data"}`
    : (state?.options?.vocation ? `Route fallback ${formatVocationLabel(state.options.vocation)}` : "No live vocation detected yet");

  return `
    <label class="module-rule-control">
      <span>${escapeHtml(MODULE_RULE_FIELD_LABELS.deathHealVocation)}</span>
      <select data-module-key="deathHeal" data-module-option-field="deathHealVocation">
        ${VOCATION_OPTIONS
      .map((option) => `
            <option value="${escapeHtml(option.value)}" ${String(modulesState?.deathHealVocation || "") === option.value ? "selected" : ""}>
              ${escapeHtml(option.label)}
            </option>
          `)
      .join("")}
      </select>
      <div class="field-note">Live detection: ${escapeHtml(detectedLabel)}. Runtime pick: ${escapeHtml(formatVocationLabel(resolvedVocation))}.</div>
    </label>
    <label class="module-rule-control">
      <span>${escapeHtml(MODULE_RULE_FIELD_LABELS.deathHealWords)}</span>
      <select data-module-key="deathHeal" data-module-option-field="deathHealWords">
        <option value="" ${selectedWords ? "" : "selected"}>Auto strongest for runtime vocation</option>
        ${spellOptions
      .map((option) => `
            <option value="${escapeHtml(option.value)}" ${selectedWords === option.value ? "selected" : ""}>
              ${escapeHtml(option.label)}
            </option>
          `)
      .join("")}
      </select>
      <div class="field-note">Shown from the current runtime vocation. If live detection is missing, set the vocation above.</div>
    </label>
    <label class="module-rule-control">
      <span>${escapeHtml(MODULE_RULE_FIELD_LABELS.deathHealHotkey)}</span>
      <input
        type="text"
        value="${escapeHtml(formatFieldValueForInput(modulesState?.deathHealHotkey, { type: "text" }))}"
        placeholder="F5"
        data-module-key="deathHeal"
        data-module-option-field="deathHealHotkey"
      />
      <div class="field-note">Optional keyboard key bound to this heal in the game hotbar.</div>
    </label>
    <label class="module-rule-control">
      <span>${escapeHtml(MODULE_RULE_FIELD_LABELS.deathHealHealthPercent)}</span>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        max="100"
        value="${escapeHtml(formatFieldValueForInput(modulesState?.deathHealHealthPercent, { type: "number" }))}"
        data-module-key="deathHeal"
        data-module-option-field="deathHealHealthPercent"
      />
    </label>
    <label class="module-rule-control">
      <span>${escapeHtml(MODULE_RULE_FIELD_LABELS.deathHealCooldownMs)}</span>
      <input
        type="number"
        inputmode="numeric"
        min="0"
        step="100"
        value="${escapeHtml(formatFieldValueForInput(modulesState?.deathHealCooldownMs, { type: "number" }))}"
        data-module-key="deathHeal"
        data-module-option-field="deathHealCooldownMs"
      />
      <div class="field-note">Hotbar is tried first when the spell is slotted. Plain spell casting is the fallback.</div>
    </label>
  `;
}

function formatFieldValueForInput(value, field = {}) {
  if (Array.isArray(value)) {
    return field.type === "textarea" ? value.join("\n") : value.join(", ");
  }

  return value ?? "";
}

function formatRuleDisplayName(moduleKey, rule = {}, index = 0) {
  const label = String(rule?.label || "").trim();
  if (label) return label;

  const fallbackName = MODULE_RULE_UI[moduleKey]?.fallbackName || "Rule";
  return `${fallbackName} ${index + 1}`;
}

function formatPriorityRankLabel(index = 0) {
  const rank = Math.max(1, Math.trunc(Number(index) || 0) + 1);
  return rank === 1 ? "Priority 1 - Highest" : `Priority ${rank}`;
}

function formatSafetyGate(rule = {}, key, enabledText, disabledText) {
  return rule?.[key] ? enabledText : disabledText;
}

function escapeAttributeValue(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function isControlDescriptor(value) {
  return Boolean(
    value
    && typeof value === "object"
    && !(value instanceof HTMLElement)
    && ("key" in value || "id" in value || "attr" in value || "saveModules" in value || "element" in value),
  );
}

function captureControlTarget(control) {
  if (isControlDescriptor(control)) {
    return control;
  }

  if (!(control instanceof HTMLElement)) {
    return null;
  }

  if (control.id) {
    return {
      key: `id:${control.id}`,
      id: control.id,
      element: control,
    };
  }

  const attrTargets = [
    ["data-session-toggle", control.dataset.sessionToggle],
    ["data-session-select", control.dataset.sessionSelect],
    ["data-add-waypoint-type", control.dataset.addWaypointType],
    ["data-open-modal", control.dataset.openModal],
    ["data-focus-route-builder", control.dataset.focusRouteBuilder],
  ];

  for (const [attr, value] of attrTargets) {
    if (!value) continue;
    return {
      key: `${attr}:${value}`,
      attr,
      value,
      element: control,
    };
  }

  if (control.hasAttribute("data-save-modules")) {
    const modalName = control.closest("[data-modal]")?.dataset.modal;
    if (modalName) {
      return {
        key: `modal-save:${modalName}`,
        saveModules: true,
        modalName,
        element: control,
      };
    }
  }

  return { element: control };
}

function normalizeControlTargets(controls) {
  if (!controls) return [];
  return (Array.isArray(controls) ? controls : [controls])
    .flat()
    .map(captureControlTarget)
    .filter(Boolean);
}

function resolveControlElement(control) {
  if (control instanceof HTMLElement) {
    return control;
  }

  if (!isControlDescriptor(control)) {
    return null;
  }

  if (control.id) {
    return document.getElementById(control.id);
  }

  if (control.attr && control.value != null) {
    return document.querySelector(`[${control.attr}="${escapeAttributeValue(control.value)}"]`);
  }

  if (control.saveModules && control.modalName) {
    return document.querySelector(`[data-modal="${escapeAttributeValue(control.modalName)}"] [data-save-modules]`);
  }

  return control.element instanceof HTMLElement ? control.element : null;
}

function rememberBusyTargets(targets, busy) {
  for (const target of targets) {
    if (!target?.key) continue;

    const current = busyControlRegistry.get(target.key);
    if (busy) {
      busyControlRegistry.set(target.key, {
        count: (current?.count || 0) + 1,
        target: current?.target || target,
      });
      continue;
    }

    if (!current) continue;

    if (current.count <= 1) {
      busyControlRegistry.delete(target.key);
    } else {
      busyControlRegistry.set(target.key, {
        ...current,
        count: current.count - 1,
      });
    }
  }
}

function clearPressedButton(target = pressedButton) {
  if (!(target instanceof HTMLElement)) {
    if (target == null || target === pressedButton) {
      pressedButton = null;
    }
    return;
  }

  delete target.dataset.pressed;
  if (target === pressedButton) {
    pressedButton = null;
  }
}

function setPressedButton(target) {
  if (!(target instanceof HTMLElement) || target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") {
    clearPressedButton();
    return;
  }

  if (pressedButton && pressedButton !== target) {
    clearPressedButton(pressedButton);
  }

  pressedButton = target;
  target.dataset.pressed = "true";
}

function applyElementDisabledState(element, disabled) {
  if (!(element instanceof HTMLElement)) return;

  if ("disabled" in element && typeof element.disabled === "boolean") {
    element.disabled = disabled;
  }

  element.setAttribute("aria-disabled", disabled ? "true" : "false");
}

function formatRuleParts(parts = []) {
  return parts.filter(Boolean).join(", ");
}

function formatModuleRuleLine(moduleKey, rule = {}) {
  switch (moduleKey) {
    case "healer":
      return `${formatRuleSpell(rule.words)} when HP ${formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent)}; mana ${Math.round(Number(rule.minMana) || 0)}+, MP ${formatPercent(rule.minManaPercent)}+; cooldown ${formatMs(rule.cooldownMs)}`;
    case "potionHealer":
      return `${formatPotionHealerItemLabel(rule.itemName)} when HP ${formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent)}; mana ${Math.round(Number(rule.minMana) || 0)}+, MP ${formatPercent(rule.minManaPercent)}+; cooldown ${formatMs(rule.cooldownMs)}`;
    case "conditionHealer":
      return `${formatConditionHealerActionLabel(rule.words, rule.condition, getHealerResolvedVocation())} on ${formatConditionHealerTriggerLabel(rule.condition)} when HP ${formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent)}; mana ${Math.round(Number(rule.minMana) || 0)}+, MP ${formatPercent(rule.minManaPercent)}+; cooldown ${formatMs(rule.cooldownMs)}`;
    case "manaTrainer": {
      const gates = formatRuleParts([
        formatSafetyGate(rule, "requireNoTargets", "no target", "target allowed"),
        formatSafetyGate(rule, "requireStationary", "idle only", "movement allowed"),
      ]);
      return `${formatRuleSpell(rule.words)} when HP ${formatPercent(rule.minHealthPercent)}+ and MP ${formatManaWindow(rule.minManaPercent, rule.maxManaPercent)}; ${gates}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    case "runeMaker": {
      const gates = formatRuleParts([
        formatSafetyGate(rule, "requireNoTargets", "no target", "target allowed"),
        formatSafetyGate(rule, "requireStationary", "idle only", "movement allowed"),
      ]);
      return `${formatRuleSpell(rule.words)} when HP ${formatPercent(rule.minHealthPercent)}+ and MP ${formatManaWindow(rule.minManaPercent, rule.maxManaPercent)}; ${gates}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    case "spellCaster": {
      const gates = formatRuleParts([
        `${formatSpellPattern(rule.pattern)} pattern`,
        formatSafetyGate(rule, "requireTarget", "target required", "target optional"),
        formatSafetyGate(rule, "requireStationary", "idle only", "movement allowed"),
      ]);
      return `${formatRuleSpell(rule.words)} within ${Math.round(Number(rule.maxTargetDistance) || 0)} SQM; MP ${formatPercent(rule.minManaPercent)}+; ${Math.round(Number(rule.minTargetCount) || 1)}+ target; ${gates}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    case "distanceKeeper": {
      const gates = formatRuleParts([
        `${formatDistanceBehavior(rule.behavior)} behavior`,
        formatSafetyGate(rule, "dodgeBeams", "beam dodge", "beam ignore"),
        formatSafetyGate(rule, "dodgeWaves", "wave dodge", "wave ignore"),
        formatSafetyGate(rule, "requireTarget", "target required", "target optional"),
      ]);
      return `Keep ${Math.round(Number(rule.minTargetDistance) || 0)}-${Math.round(Number(rule.maxTargetDistance) || 0)} SQM; ${Math.round(Number(rule.minMonsterCount) || 1)}+ threat; ${gates}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    case "autoLight": {
      const gates = formatRuleParts([
        formatSafetyGate(rule, "requireNoLight", "dark only", "light allowed"),
        formatSafetyGate(rule, "requireNoTargets", "no target", "target allowed"),
        formatSafetyGate(rule, "requireStationary", "idle only", "movement allowed"),
      ]);
      return `${formatRuleSpell(rule.words)} when MP ${formatPercent(rule.minManaPercent)}+; ${gates}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    case "autoConvert": {
      const gates = formatRuleParts([
        formatSafetyGate(rule, "requireNoTargets", "no target", "target allowed"),
        formatSafetyGate(rule, "requireStationary", "idle only", "movement allowed"),
      ]);
      return `Convert coins; ${gates}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    case "banking": {
      const bankerNames = formatTextListSummary(rule.bankerNames, { empty: "Any banker" });
      const amount = Math.max(0, Math.trunc(Number(rule.amount) || 0));
      const reserveGold = Math.max(0, Math.trunc(Number(rule.reserveGold) || 0));
      const maxNpcDistance = Math.max(1, Math.trunc(Number(rule.maxNpcDistance) || 0));
      const gates = formatRuleParts([
        `${bankerNames}`,
        `range ${maxNpcDistance} SQM`,
        formatSafetyGate(rule, "requireNoTargets", "no target", "target allowed"),
        formatSafetyGate(rule, "requireStationary", "idle only", "movement allowed"),
      ]);
      const detail = rule.operation === "deposit-all" || rule.operation === "balance"
        ? gates
        : rule.operation === "deposit-excess"
          ? formatRuleParts([`reserve ${reserveGold} gp`, gates])
          : rule.operation === "transfer"
            ? formatRuleParts([`${amount} gp to ${String(rule.recipient || "").trim() || "recipient"}`, gates])
            : formatRuleParts([`${amount} gp`, gates]);
      return `${formatBankingOperation(rule.operation)}; ${detail}; cooldown ${formatMs(rule.cooldownMs)}`;
    }
    default:
      return formatRuleSpell(rule.words);
  }
}

function getModuleRuleSummaryItems(moduleKey, rule = {}, context = {}) {
  switch (moduleKey) {
    case "healer": {
      const coverageWindow = buildHealerCoverageWindows(context.rules || [rule])[context.index ?? 0]
        || { min: rule.minHealthPercent, max: rule.maxHealthPercent, expanded: false };
      return [
        { label: "Target", value: formatHealerActionScope(rule.words), tone: "timing" },
        { label: "Configured band", value: formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent), tone: "trigger" },
        { label: "Live coverage", value: formatHealthWindow(coverageWindow.min, coverageWindow.max), tone: coverageWindow.expanded ? "safe" : "trigger" },
        { label: "Mana gate", value: `${Math.round(Number(rule.minMana) || 0)}+`, tone: "gate" },
        { label: "MP gate", value: `${formatPercent(rule.minManaPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
      ];
    }
    case "potionHealer":
      return [
        { label: "Potion", value: formatPotionHealerItemLabel(rule.itemName), tone: "timing" },
        { label: "HP band", value: formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent), tone: "trigger" },
        { label: "Mana gate", value: `${Math.round(Number(rule.minMana) || 0)}+`, tone: "gate" },
        { label: "MP gate", value: `${formatPercent(rule.minManaPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
      ];
    case "conditionHealer":
      return [
        { label: "Condition", value: formatConditionHealerTriggerLabel(rule.condition), tone: "trigger" },
        { label: "Action", value: formatConditionHealerActionLabel(rule.words, rule.condition, getHealerResolvedVocation()), tone: "timing" },
        { label: "HP band", value: formatHealthWindow(rule.minHealthPercent, rule.maxHealthPercent), tone: "trigger" },
        { label: "Mana gate", value: `${Math.round(Number(rule.minMana) || 0)}+`, tone: "gate" },
        { label: "MP gate", value: `${formatPercent(rule.minManaPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
      ];
    case "manaTrainer":
      return [
        { label: "Mana window", value: formatManaWindow(rule.minManaPercent, rule.maxManaPercent), tone: "trigger" },
        { label: "Health gate", value: `${formatPercent(rule.minHealthPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireNoTargets", "No target", "Target allowed"),
          tone: rule.requireNoTargets ? "safe" : "open",
        },
        {
          label: "Movement",
          value: formatSafetyGate(rule, "requireStationary", "Idle only", "Movement allowed"),
          tone: rule.requireStationary ? "safe" : "open",
        },
      ];
    case "runeMaker":
      return [
        { label: "Mana window", value: formatManaWindow(rule.minManaPercent, rule.maxManaPercent), tone: "trigger" },
        { label: "Health gate", value: `${formatPercent(rule.minHealthPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireNoTargets", "No target", "Target allowed"),
          tone: rule.requireNoTargets ? "safe" : "open",
        },
        {
          label: "Movement",
          value: formatSafetyGate(rule, "requireStationary", "Idle only", "Movement allowed"),
          tone: rule.requireStationary ? "safe" : "open",
        },
      ];
    case "spellCaster":
      return [
        { label: "Pattern", value: formatSpellPattern(rule.pattern), tone: "trigger" },
        { label: "Range max", value: `${Math.round(Number(rule.maxTargetDistance) || 0)} SQM`, tone: "trigger" },
        { label: "Target count", value: `${Math.round(Number(rule.minTargetCount) || 1)}+`, tone: "gate" },
        { label: "MP gate", value: `${formatPercent(rule.minManaPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireTarget", "Target required", "Target optional"),
          tone: rule.requireTarget ? "safe" : "open",
        },
        {
          label: "Movement",
          value: formatSafetyGate(rule, "requireStationary", "Idle only", "Movement allowed"),
          tone: rule.requireStationary ? "safe" : "open",
        },
      ];
    case "distanceKeeper":
      return [
        {
          label: "Range window",
          value: `${Math.round(Number(rule.minTargetDistance) || 0)}-${Math.round(Number(rule.maxTargetDistance) || 0)} SQM`,
          tone: "trigger",
        },
        { label: "Behavior", value: formatDistanceBehavior(rule.behavior), tone: "timing" },
        { label: "Threat gate", value: `${Math.round(Number(rule.minMonsterCount) || 1)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Beam dodge",
          value: formatSafetyGate(rule, "dodgeBeams", "On", "Off"),
          tone: rule.dodgeBeams ? "safe" : "open",
        },
        {
          label: "Wave dodge",
          value: formatSafetyGate(rule, "dodgeWaves", "On", "Off"),
          tone: rule.dodgeWaves ? "safe" : "open",
        },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireTarget", "Target required", "Target optional"),
          tone: rule.requireTarget ? "safe" : "open",
        },
      ];
    case "autoLight":
      return [
        { label: "MP gate", value: `${formatPercent(rule.minManaPercent)}+`, tone: "gate" },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Light gate",
          value: formatSafetyGate(rule, "requireNoLight", "Dark only", "Light allowed"),
          tone: rule.requireNoLight ? "safe" : "open",
        },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireNoTargets", "No target", "Target allowed"),
          tone: rule.requireNoTargets ? "safe" : "open",
        },
        {
          label: "Movement",
          value: formatSafetyGate(rule, "requireStationary", "Idle only", "Movement allowed"),
          tone: rule.requireStationary ? "safe" : "open",
        },
      ];
    case "autoConvert":
      return [
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireNoTargets", "No target", "Target allowed"),
          tone: rule.requireNoTargets ? "safe" : "open",
        },
        {
          label: "Movement",
          value: formatSafetyGate(rule, "requireStationary", "Idle only", "Movement allowed"),
          tone: rule.requireStationary ? "safe" : "open",
        },
      ];
    case "banking":
      return [
        { label: "Operation", value: formatBankingOperation(rule.operation), tone: "trigger" },
        {
          label: "Banker",
          value: formatTextListSummary(rule.bankerNames, { empty: "Any nearby banker" }),
          tone: "gate",
        },
        {
          label: "Amount",
          value: rule.operation === "deposit-excess"
            ? `Reserve ${Math.max(0, Math.trunc(Number(rule.reserveGold) || 0))} gp`
            : `${Math.max(0, Math.trunc(Number(rule.amount) || 0))} gp`,
          tone: "timing",
        },
        {
          label: "Range",
          value: `${Math.max(1, Math.trunc(Number(rule.maxNpcDistance) || 0))} SQM`,
          tone: "gate",
        },
        { label: "Cooldown", value: formatMs(rule.cooldownMs), tone: "timing" },
        {
          label: "Target gate",
          value: formatSafetyGate(rule, "requireNoTargets", "No target", "Target allowed"),
          tone: rule.requireNoTargets ? "safe" : "open",
        },
        {
          label: "Movement",
          value: formatSafetyGate(rule, "requireStationary", "Idle only", "Movement allowed"),
          tone: rule.requireStationary ? "safe" : "open",
        },
      ];
    default:
      return [];
  }
}

function formatModuleRuleAction(moduleKey, rule = {}) {
  if (moduleKey === "autoConvert") {
    return "Convert coins";
  }

  if (moduleKey === "healer") {
    const label = formatHealerActionLabel(rule.words, getHealerResolvedVocation());
    return `${isHealerRuneActionValue(rule.words) ? "Use" : "Cast"} ${label}`;
  }

  if (moduleKey === "potionHealer") {
    return `Use ${formatPotionHealerItemLabel(rule.itemName)}`;
  }

  if (moduleKey === "conditionHealer") {
    return `Cast ${formatConditionHealerActionLabel(rule.words, rule.condition, getHealerResolvedVocation())}`;
  }

  if (moduleKey === "distanceKeeper") {
    return `Keep ${Math.round(Number(rule.minTargetDistance) || 0)}-${Math.round(Number(rule.maxTargetDistance) || 0)} SQM`;
  }

  if (moduleKey === "banking") {
    return formatBankingOperation(rule.operation);
  }

  return `Cast ${formatRuleSpell(rule.words)}`;
}

function renderModuleRulePills(items = []) {
  return items
    .map((item) => `
      <span class="module-rule-pill ${item.tone ? `tone-${item.tone}` : ""}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </span>
    `)
    .join("");
}

function renderManaTrainerRuleSummary(rule = {}, context = {}) {
  const { minPercent, maxPercent, left, width } = getManaWindowTrackMetrics(rule);
  const pills = renderModuleRulePills(getModuleRuleSummaryItems("manaTrainer", rule, context).filter((item) => item.label !== "Mana Window"));

  return `
    <div class="mana-rule-summary-shell">
      <div class="mana-rule-summary-top">
        <div>
          <div class="module-rule-action-line">${escapeHtml(formatModuleRuleAction("manaTrainer", rule))}</div>
          <div class="mana-rule-summary-copy">Arms at ${escapeHtml(formatPercent(minPercent))}, stops above ${escapeHtml(formatPercent(maxPercent))}, and repeats while the safety gates stay valid.</div>
        </div>
        <div class="mana-rule-kicker">
          <span>HP Floor</span>
          <strong>${escapeHtml(formatPercent(rule.minHealthPercent))}+</strong>
        </div>
      </div>
      <div class="mana-rule-window">
        <div class="mana-rule-window-head">
          <span>Mana Band</span>
          <strong class="mana-rule-window-value">${escapeHtml(formatManaWindow(minPercent, maxPercent))}</strong>
        </div>
        <div class="mana-rule-window-track" aria-hidden="true">
          <span class="mana-rule-window-fill" style="left: ${left}%; width: ${width}%"></span>
        </div>
        <div class="mana-rule-window-scale">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div class="mana-rule-window-meta">
          <span>Open at ${escapeHtml(formatPercent(minPercent))}</span>
          <span>Close at ${escapeHtml(formatPercent(maxPercent))}</span>
        </div>
      </div>
      <div class="module-rule-pills">${pills}</div>
    </div>
  `;
}

function renderModuleRuleSummary(moduleKey, rule = {}, context = {}) {
  if (moduleKey === "manaTrainer") {
    return renderManaTrainerRuleSummary(rule, context);
  }

  const pills = renderModuleRulePills(getModuleRuleSummaryItems(moduleKey, rule, context));
  const tierLine = moduleKey === "healer"
    ? (() => {
      const minHp = Math.max(0, Math.round(Number(rule?.minHealthPercent) || 0));
      const maxHp = Math.max(minHp, Math.round(Number(rule?.maxHealthPercent) || 0));
      const manaParts = [];
      if (Number(rule?.minMana) > 0) manaParts.push(`mana ${Math.round(Number(rule.minMana))}+`);
      if (Number(rule?.minManaPercent) > 0) manaParts.push(`MP ${Math.round(Number(rule.minManaPercent))}%+`);
      return `<div class="module-rule-tier-line">HP ${escapeHtml(formatPercent(minHp))}-${escapeHtml(formatPercent(maxHp))}${manaParts.length ? ` / ${escapeHtml(manaParts.join(" / "))}` : ""}</div>`;
    })()
    : "";

  return `
    <div class="module-rule-action-line">${escapeHtml(formatModuleRuleAction(moduleKey, rule))}</div>
    ${tierLine}
    <div class="module-rule-pills">${pills}</div>
  `;
}

function formatModuleCurrentLine(moduleKey, rules = [], modulesState = null) {
  const activeRules = getActiveRules(rules);
  const sourceState = modulesState || state?.options || {};
  const effectiveState = getModuleEffectiveState(moduleKey, sourceState, state);

  if (moduleKey === "healer" && effectiveState.state === "inherited") {
    return `Trainer owns regular healing / ${formatHealerCombinedDetail(sourceState, state)}`;
  }

  if (moduleKey === "distanceKeeper" && effectiveState.state === "hidden-owner") {
    return `${effectiveState.detail} / ${effectiveState.owner === "targetProfile" ? "Targeting profile wins over the standalone distance toggle" : "Standalone distance rules stay off until you enable them"}`;
  }

  if (!activeRules.length) {
    switch (moduleKey) {
      case "deathHeal": {
        const resolvedVocation = getDeathHealResolvedVocation(sourceState);
        const threshold = Math.max(0, Math.trunc(Number(sourceState?.deathHealHealthPercent) || 0));
        const cooldownMs = Math.max(0, Math.trunc(Number(sourceState?.deathHealCooldownMs) || 0));
        if (effectiveState.state === "inherited") {
          return `Trainer owns emergency self-healing / ${formatDeathHealSpellLabel(sourceState?.deathHealWords, resolvedVocation)} at ${threshold}% HP / ${formatMs(cooldownMs)} / ${formatVocationLabel(resolvedVocation)}`;
        }
        return sourceState?.deathHealEnabled
          ? `${formatDeathHealSpellLabel(sourceState?.deathHealWords, resolvedVocation)} at ${threshold}% HP / ${formatMs(cooldownMs)} / ${formatVocationLabel(resolvedVocation)}`
          : "Critical self-heal disabled";
      }
      case "healer":
        return formatHealerCombinedDetail(sourceState, state);
      case "manaTrainer":
        return "No active mana rules";
      case "runeMaker":
        return "No active rune rules";
      case "spellCaster":
        return "No active attack spell rules";
      case "distanceKeeper":
        return "No active distance rules";
      case "autoLight":
        return "No active light rules";
      case "autoConvert":
        return "No active coin rules";
      case "antiIdle": {
        const status = getAntiIdleRuntimeStatus();
        const { enabled, trainerOnly } = getAntiIdleModeState(modulesState);
        if (!enabled) return "Idle keepalive is off";
        if (status?.ready) return `Ready after ${formatDurationMs(status.inactivityMs)} idle`;
        if (status?.blocker === "waiting") return `Next keepalive in ${formatDurationMs(status.nextPulseInMs)}`;
        return `${trainerOnly ? "Trainer keepalive / " : ""}${getAntiIdleBlockerLabel(status?.blocker || "snapshot")} / delay ${formatDurationMs(modulesState.antiIdleIntervalMs)}`;
      }
      case "alarms": {
        const settings = getAlarmSettings(modulesState || state?.options || {});
        if (!settings.enabled) {
          return "Player proximity alarms are off";
        }

        const segments = [];
        if (settings.player.enabled) {
          segments.push(`Players ${formatAlarmScope(settings.player.radiusSqm, settings.player.floorRange)}`);
        }
        if (settings.staff.enabled) {
          segments.push(`GM/GOD ${formatAlarmScope(settings.staff.radiusSqm, settings.staff.floorRange)}`);
        }
        if (settings.blacklist.enabled) {
          segments.push(`Blacklist ${formatAlarmScope(settings.blacklist.radiusSqm, settings.blacklist.floorRange)} / ${settings.blacklist.names.length} name${settings.blacklist.names.length === 1 ? "" : "s"}`);
        }

        return segments.length
          ? segments.join(" | ")
          : "All alarm tracks are muted";
      }
      case "reconnect": {
        const runtime = getReconnectRuntimeStatus(modulesState || state?.options || {});
        if (!runtime.enabled && !runtime.manualAvailable) return "Reconnect guard is off";
        return `${runtime.trainerOnly ? "Trainer reconnect / " : ""}${runtime.detail} / ${runtime.configDetail}`;
      }
      case "trainer":
        if (effectiveState.state === "blocked") {
          return effectiveState.detail;
        }
        return sourceState?.trainerEnabled
          ? `Partner ${formatTrainerPartnerDetail(getResolvedTrainerPartnerName(sourceState, state), sourceState?.trainerPartnerDistance)}, party ${sourceState?.trainerAutoPartyEnabled !== false ? "auto" : "manual"}, trainer reconnect ${sourceState?.trainerReconnectEnabled !== false ? "on" : "off"}, food ${formatMs(sourceState.autoEatCooldownMs)}, heals <= ${formatPercent(sourceState.healerEmergencyHealthPercent)}, trainer mana ${formatTrainerManaTrainerDetail(sourceState, { empty: "off" })}, escapes <= ${formatPercent(sourceState.trainerEscapeHealthPercent)}`
          : "Trainer guardrails are off";
      case "autoEat": {
        const allowedFoods = normalizeTextListSummary(sourceState?.autoEatFoodName);
        const blockedFoods = normalizeTextListSummary(sourceState?.autoEatForbiddenFoodNames);
        const foodName = allowedFoods.length ? allowedFoods.join(" -> ") : "any food";
        const targetGate = sourceState?.autoEatRequireNoTargets !== false
          ? (sourceState?.trainerEnabled ? "Trainer target allowed" : "no target")
          : "target allowed";
        const gates = [
          targetGate,
          sourceState?.autoEatRequireStationary !== false ? "idle only" : "movement allowed",
        ].join(" / ");
        const blocked = blockedFoods.length ? ` / block ${blockedFoods.join(", ")}` : "";
        if (!sourceState?.autoEatEnabled && sourceState?.trainerEnabled) {
          return `Trainer food ${foodName} every ${formatMs(sourceState.autoEatCooldownMs)} / ${gates}${blocked}`;
        }
        return sourceState?.autoEatEnabled
          ? `Eat ${foodName} every ${formatMs(sourceState.autoEatCooldownMs)} / ${gates}${blocked}`
          : `Auto eat off / ${foodName}${blocked}`;
      }
      case "ammo": {
        const summary = buildAmmoSummary(sourceState);
        if (!summary.enabled) {
          return "Ammo handling is off";
        }
        return `${summary.preferredValue} / ${summary.slotLabel} ${summary.equippedCount} equipped / ${summary.carriedCount} carried / reload <= ${summary.reloadAtOrBelow} / restock ${summary.restockEnabled ? summary.warningCount : "off"}${sourceState?.refillEnabled && summary.restockEnabled ? " / ammo owns restock" : ""}`;
      }
      case "ringAutoReplace": {
        return [
          formatEquipmentReplaceSectionLine("ringAutoReplace", modulesState, "Ring"),
          formatEquipmentReplaceSectionLine("amuletAutoReplace", modulesState, "Amulet"),
        ].join(" | ");
      }
      case "amuletAutoReplace": {
        return formatEquipmentReplaceSectionLine("amuletAutoReplace", modulesState, "Amulet");
      }
      case "looting": {
        const lootSummary = buildLootingSummary(modulesState);
        return `${lootSummary.modeLabel} / ${lootSummary.skipValue} blocked / to ${lootSummary.routeValue}`;
      }
      case "banking":
        return "No active banking rules";
      case "partyFollow":
        return modulesState?.partyFollowEnabled
          ? formatFollowTrainDetail(modulesState.partyFollowMembers, modulesState.partyFollowDistance)
          : "Follow chain disabled";
      default:
        return "No active rules";
    }
  }

  if (moduleKey === "healer") {
    return formatHealerCombinedDetail(sourceState, state);
  }

  if (activeRules.length === 1) {
    return formatModuleRuleLine(moduleKey, activeRules[0]);
  }

  const activeSummary = activeRules
    .map((rule) => formatModuleRuleAction(moduleKey, rule))
    .join("; ");

  return `${formatRuleLabel(activeRules.length, "active rule")}: ${activeSummary}. ${MODULE_RULE_UI[moduleKey]?.multipleActiveSummary || "Rules run top to bottom."}`;
}

function getRuneMakerLiveState(snapshot = state?.snapshot) {
  const healthPercent = Number(snapshot?.playerStats?.healthPercent);
  const manaPercent = Number(snapshot?.playerStats?.manaPercent);
  const targetName = String(snapshot?.currentTarget?.name || "").trim();
  const moving = snapshot?.isMoving === true
    || snapshot?.pathfinderAutoWalking === true
    || Number(snapshot?.autoWalkStepsRemaining) > 0;

  return {
    healthPercent: Number.isFinite(healthPercent) ? Math.round(healthPercent) : null,
    manaPercent: Number.isFinite(manaPercent) ? Math.round(manaPercent) : null,
    hasTarget: Boolean(targetName),
    targetName: targetName || "No target",
    moving,
  };
}

function getRuneMakerGateFailures(rule = {}, liveState = getRuneMakerLiveState()) {
  const failures = [];
  const healthFloor = Math.max(0, Math.round(Number(rule?.minHealthPercent) || 0));
  const manaFloor = Math.max(0, Math.round(Number(rule?.minManaPercent) || 0));
  const manaCeiling = Math.max(manaFloor, Math.round(Number(rule?.maxManaPercent) || 0));

  if (liveState.healthPercent == null) {
    failures.push("Need live HP");
  } else if (liveState.healthPercent < healthFloor) {
    failures.push(`HP ${formatPercent(healthFloor)}+`);
  }

  if (liveState.manaPercent == null) {
    failures.push("Need live MP");
  } else if (liveState.manaPercent < manaFloor || liveState.manaPercent > manaCeiling) {
    failures.push(`MP ${formatManaWindow(manaFloor, manaCeiling)}`);
  }

  if (rule?.requireNoTargets && liveState.hasTarget) {
    failures.push("Drop target");
  }

  if (rule?.requireStationary && liveState.moving) {
    failures.push("Stop moving");
  }

  return failures;
}

function getRuneMakerLiveOverview(rules = [], snapshot = state?.snapshot) {
  const activeRules = getActiveRules(rules);
  const liveState = getRuneMakerLiveState(snapshot);
  const statuses = activeRules.map((rule, index) => ({
    title: formatRuleDisplayName("runeMaker", rule, index),
    failures: getRuneMakerGateFailures(rule, liveState),
  }));
  const readyStatuses = statuses.filter((status) => status.failures.length === 0);
  const anyHpOpen = activeRules.some((rule) => (
    liveState.healthPercent != null
    && liveState.healthPercent >= Math.max(0, Math.round(Number(rule?.minHealthPercent) || 0))
  ));
  const anyMpOpen = activeRules.some((rule) => {
    const manaFloor = Math.max(0, Math.round(Number(rule?.minManaPercent) || 0));
    const manaCeiling = Math.max(manaFloor, Math.round(Number(rule?.maxManaPercent) || 0));
    return liveState.manaPercent != null
      && liveState.manaPercent >= manaFloor
      && liveState.manaPercent <= manaCeiling;
  });
  const anyTargetOpen = activeRules.some((rule) => !rule?.requireNoTargets || !liveState.hasTarget);
  const anyMovementOpen = activeRules.some((rule) => !rule?.requireStationary || !liveState.moving);
  const blockers = [...new Set(statuses.flatMap((status) => status.failures))];

  let summary = "Add a rune window to start building the cast stack.";
  if (activeRules.length) {
    if (readyStatuses.length) {
      summary = readyStatuses.length === 1
        ? `${readyStatuses[0].title} is live right now.`
        : `${readyStatuses.length} rune windows are live right now.`;
    } else {
      summary = `Blocked now: ${blockers.slice(0, 3).join(" / ")}${blockers.length > 3 ? " / ..." : ""}.`;
    }
  }

  return {
    summary,
    badges: [
      {
        label: "Ready now",
        value: activeRules.length ? `${readyStatuses.length} / ${activeRules.length}` : "0 / 0",
        tone: readyStatuses.length ? "safe" : "trigger",
      },
      {
        label: "HP",
        value: liveState.healthPercent == null ? "Unknown" : formatPercent(liveState.healthPercent),
        tone: liveState.healthPercent == null ? "timing" : (anyHpOpen ? "safe" : "trigger"),
      },
      {
        label: "MP",
        value: liveState.manaPercent == null ? "Unknown" : formatPercent(liveState.manaPercent),
        tone: liveState.manaPercent == null ? "timing" : (anyMpOpen ? "gate" : "trigger"),
      },
      {
        label: "Target",
        value: liveState.targetName,
        tone: liveState.hasTarget ? (anyTargetOpen ? "open" : "trigger") : "safe",
      },
      {
        label: "Movement",
        value: liveState.moving ? "Moving" : "Idle",
        tone: liveState.moving ? (anyMovementOpen ? "open" : "trigger") : "safe",
      },
    ],
    totalRules: rules.length,
    activeRules: activeRules.length,
  };
}

function syncRuneMakerLiveDashboard(rules = [], snapshot = state?.snapshot) {
  const view = MODULE_VIEW_ELEMENTS.rune;
  if (!view.liveSummary || !view.liveBadges || !view.ruleMeta) {
    return;
  }

  const live = getRuneMakerLiveOverview(rules, snapshot);
  setTextContent(view.liveSummary, live.summary);
  view.liveBadges.innerHTML = live.badges
    .map((badge) => `
      <span class="module-rule-pill ${badge.tone ? `tone-${badge.tone}` : ""}">
        <span>${escapeHtml(badge.label)}</span>
        <strong>${escapeHtml(badge.value)}</strong>
      </span>
    `)
    .join("");
  setTextContent(view.ruleMeta, `${live.totalRules} total / ${live.activeRules} active`);
}

function cloneModuleOptions(options = {}) {
  return {
    deathHealEnabled: Boolean(options.deathHealEnabled),
    deathHealVocation: String(options.deathHealVocation || "").trim(),
    deathHealWords: String(options.deathHealWords || "").trim(),
    deathHealHotkey: String(options.deathHealHotkey || "").trim(),
    deathHealHealthPercent: Number(options.deathHealHealthPercent) || 0,
    deathHealCooldownMs: Number(options.deathHealCooldownMs) || 0,
    healerEnabled: Boolean(options.healerEnabled),
    healerRules: cloneValue(options.healerRules || []),
    healerEmergencyHealthPercent: Number(options.healerEmergencyHealthPercent) || 0,
    healerRuneName: normalizeHealerActionValue(options.healerRuneName),
    healerRuneHotkey: String(options.healerRuneHotkey || "").trim(),
    healerRuneHealthPercent: Number(options.healerRuneHealthPercent) || 0,
    potionHealerEnabled: Boolean(options.potionHealerEnabled),
    potionHealerRules: cloneValue(options.potionHealerRules || []),
    conditionHealerEnabled: Boolean(options.conditionHealerEnabled),
    conditionHealerRules: cloneValue(options.conditionHealerRules || []),
    manaTrainerEnabled: Boolean(options.manaTrainerEnabled),
    manaTrainerRules: cloneValue(options.manaTrainerRules || []),
    trainerManaTrainerEnabled: Boolean(options.trainerManaTrainerEnabled),
    trainerManaTrainerWords: String(options.trainerManaTrainerWords || "").trim(),
    trainerManaTrainerHotkey: String(options.trainerManaTrainerHotkey || "").trim(),
    trainerManaTrainerManaPercent: Number(options.trainerManaTrainerManaPercent) || 0,
    trainerManaTrainerMinHealthPercent: Number(options.trainerManaTrainerMinHealthPercent) || 0,
    trainerManaTrainerRules: cloneValue(options.trainerManaTrainerRules || []),
    runeMakerEnabled: Boolean(options.runeMakerEnabled),
    runeMakerRules: cloneValue(options.runeMakerRules || []),
    spellCasterEnabled: Boolean(options.spellCasterEnabled),
    spellCasterRules: cloneValue(options.spellCasterRules || []),
    distanceKeeperEnabled: Boolean(options.distanceKeeperEnabled),
    distanceKeeperRules: cloneValue(options.distanceKeeperRules || []),
    autoLightEnabled: Boolean(options.autoLightEnabled),
    autoLightRules: cloneValue(options.autoLightRules || []),
    autoConvertEnabled: Boolean(options.autoConvertEnabled),
    autoConvertRules: cloneValue(options.autoConvertRules || []),
    antiIdleEnabled: Boolean(options.antiIdleEnabled),
    antiIdleIntervalMs: Number(options.antiIdleIntervalMs) || 0,
    alarmsEnabled: options.alarmsEnabled !== false,
    alarmsPlayerEnabled: options.alarmsPlayerEnabled !== false,
    alarmsPlayerRadiusSqm: Number(options.alarmsPlayerRadiusSqm) || 0,
    alarmsPlayerFloorRange: Number(options.alarmsPlayerFloorRange) || 0,
    alarmsStaffEnabled: options.alarmsStaffEnabled !== false,
    alarmsStaffRadiusSqm: Number(options.alarmsStaffRadiusSqm) || 0,
    alarmsStaffFloorRange: Number(options.alarmsStaffFloorRange) || 0,
    alarmsBlacklistEnabled: options.alarmsBlacklistEnabled !== false,
    alarmsBlacklistNames: cloneValue(options.alarmsBlacklistNames || []),
    alarmsBlacklistRadiusSqm: Number(options.alarmsBlacklistRadiusSqm) || 0,
    alarmsBlacklistFloorRange: Number(options.alarmsBlacklistFloorRange) || 0,
    reconnectEnabled: Boolean(options.reconnectEnabled),
    reconnectRetryDelayMs: Number(options.reconnectRetryDelayMs) || 0,
    reconnectMaxAttempts: Number(options.reconnectMaxAttempts) || 0,
    trainerEnabled: Boolean(options.trainerEnabled),
    trainerReconnectEnabled: options.trainerReconnectEnabled !== false,
    trainerPartnerName: String(options.trainerPartnerName || "").trim(),
    trainerPartnerDistance: Number(options.trainerPartnerDistance) || 0,
    trainerAutoPartyEnabled: options.trainerAutoPartyEnabled !== false,
    trainerEscapeHealthPercent: Number(options.trainerEscapeHealthPercent) || 0,
    trainerEscapeDistance: Number(options.trainerEscapeDistance) || 0,
    trainerEscapeCooldownMs: Number(options.trainerEscapeCooldownMs) || 0,
    autoEatEnabled: Boolean(options.autoEatEnabled),
    autoEatFoodName: cloneValue(options.autoEatFoodName || []),
    autoEatForbiddenFoodNames: cloneValue(options.autoEatForbiddenFoodNames || []),
    autoEatCooldownMs: Number(options.autoEatCooldownMs) || 0,
    autoEatRequireNoTargets: options.autoEatRequireNoTargets !== false,
    autoEatRequireStationary: options.autoEatRequireStationary !== false,
    ammoEnabled: options.ammoEnabled !== false,
    ammoPreferredNames: cloneValue(options.ammoPreferredNames || []),
    ammoMinimumCount: Number(options.ammoMinimumCount) || 0,
    ammoWarningCount: Number(options.ammoWarningCount) || 0,
    ammoReloadAtOrBelow: Number(options.ammoReloadAtOrBelow) || 0,
    ammoReloadCooldownMs: Number(options.ammoReloadCooldownMs) || 0,
    ammoReloadEnabled: options.ammoReloadEnabled !== false,
    ammoRestockEnabled: options.ammoRestockEnabled !== false,
    ammoRequireNoTargets: options.ammoRequireNoTargets === true,
    ammoRequireStationary: options.ammoRequireStationary === true,
    ringAutoReplaceEnabled: Boolean(options.ringAutoReplaceEnabled),
    ringAutoReplaceItemName: String(options.ringAutoReplaceItemName || "").trim(),
    ringAutoReplaceCooldownMs: Number(options.ringAutoReplaceCooldownMs) || 0,
    ringAutoReplaceRequireNoTargets: options.ringAutoReplaceRequireNoTargets === true,
    ringAutoReplaceRequireStationary: options.ringAutoReplaceRequireStationary === true,
    amuletAutoReplaceEnabled: Boolean(options.amuletAutoReplaceEnabled),
    amuletAutoReplaceItemName: String(options.amuletAutoReplaceItemName || "").trim(),
    amuletAutoReplaceCooldownMs: Number(options.amuletAutoReplaceCooldownMs) || 0,
    amuletAutoReplaceRequireNoTargets: options.amuletAutoReplaceRequireNoTargets === true,
    amuletAutoReplaceRequireStationary: options.amuletAutoReplaceRequireStationary === true,
    lootingEnabled: Boolean(options.lootingEnabled),
    lootWhitelist: cloneValue(options.lootWhitelist || []),
    lootBlacklist: cloneValue(options.lootBlacklist || []),
    lootPreferredContainers: cloneValue(options.lootPreferredContainers || []),
    bankingEnabled: Boolean(options.bankingEnabled),
    bankingRules: cloneValue(options.bankingRules || []),
    partyFollowEnabled: Boolean(options.partyFollowEnabled),
    partyFollowMembers: cloneValue(options.partyFollowMembers || []),
    partyFollowManualPlayers: cloneValue(options.partyFollowManualPlayers || []),
    partyFollowMemberRoles: cloneValue(options.partyFollowMemberRoles || {}),
    partyFollowMemberChaseModes: cloneValue(options.partyFollowMemberChaseModes || {}),
    partyFollowDistance: Number(options.partyFollowDistance) || 0,
    partyFollowCombatMode: String(options.partyFollowCombatMode || "follow-and-fight"),
  };
}

function ensureModulesDraft(force = false) {
  if (!modulesDraft || force) {
    modulesDraft = cloneModuleOptions(state?.options || {});
  }

  return modulesDraft;
}

function resetModulesDraft() {
  modulesDraft = null;
  modulesRenderedKey = "";
}

function getModuleSchema(moduleKey) {
  return MODULE_RULE_SCHEMAS[moduleKey] || null;
}

function isModuleModalName(name) {
  return Boolean(getModuleSchema(name));
}

function getModuleUi(moduleKey) {
  return MODULE_RULE_UI[moduleKey] || {};
}

function getModuleViewKey(moduleKey = getActiveModuleKey()) {
  return moduleKey === "runeMaker" ? "rune" : "shared";
}

function getModuleView(moduleKey = getActiveModuleKey()) {
  return MODULE_VIEW_ELEMENTS[getModuleViewKey(moduleKey)] || MODULE_VIEW_ELEMENTS.shared;
}

function syncModuleViewPanels(moduleKey = getActiveModuleKey()) {
  const activeViewKey = getModuleViewKey(moduleKey);

  Object.entries(MODULE_VIEW_ELEMENTS).forEach(([key, view]) => {
    if (!(view?.panel instanceof HTMLElement)) {
      return;
    }

    const visible = key === activeViewKey;
    view.panel.hidden = !visible;
    view.panel.setAttribute("aria-hidden", visible ? "false" : "true");
  });

  const sharedHeadGroup = document.getElementById("shared-module-head-group");
  const runeHeadGroup = document.getElementById("rune-module-head-group");
  const sharedHeadTools = document.getElementById("shared-module-head-tools");
  const runeHeadTools = document.getElementById("rune-module-head-tools");

  if (sharedHeadGroup) sharedHeadGroup.hidden = activeViewKey !== "shared";
  if (runeHeadGroup) runeHeadGroup.hidden = activeViewKey !== "rune";
  if (sharedHeadTools) sharedHeadTools.hidden = activeViewKey !== "shared";
  if (runeHeadTools) runeHeadTools.hidden = activeViewKey !== "rune";
}

function getActiveModuleKey() {
  if (isModuleModalName(activeModuleKey)) {
    return activeModuleKey;
  }
  return isModuleModalName(activeModalName) ? activeModalName : null;
}

function getModuleRuleList(moduleKey) {
  const schema = getModuleSchema(moduleKey);
  if (!schema || schema.allowRules === false || !schema.rulesKey) return [];
  const draft = ensureModulesDraft();
  if (!Array.isArray(draft[schema.rulesKey])) {
    draft[schema.rulesKey] = [];
  }
  return draft[schema.rulesKey];
}

function createModuleRule(moduleKey) {
  const schema = getModuleSchema(moduleKey);
  if (!schema || schema.allowRules === false || !schema.rulesKey) return null;

  const rules = getModuleRuleList(moduleKey);
  const template = rules.length
    ? { ...rules[rules.length - 1], label: "" }
    : schema.emptyRule;

  return cloneValue(template);
}

function getModuleRuleFieldSpec(moduleKey, key) {
  const schema = getModuleSchema(moduleKey);
  if (!schema || !key) return null;

  if (key === "label") {
    return { key, label: MODULE_RULE_FIELD_LABELS.label, type: "text", placeholder: "Optional" };
  }

  if (key === "enabled") {
    return { key, label: MODULE_RULE_FIELD_LABELS.enabled, type: "checkbox" };
  }

  const source = [
    ...(schema.fields || []),
    ...(schema.flags || []).map((flag) => ({ ...flag, type: "checkbox" })),
  ].find((field) => field.key === key);

  if (!source) return null;

  return {
    ...source,
    label: MODULE_RULE_FIELD_LABELS[key] || source.label || key,
  };
}

function renderModuleRuleField(moduleKey, index, field, value) {
  const sharedData = `data-module-key="${moduleKey}" data-rule-index="${index}" data-rule-field="${field.key}"`;
  const normalizedValue = normalizeHealerActionValue(value);

  if (field.type === "checkbox") {
    return `
      <label class="module-rule-control module-rule-check compact-rule-control">
        <input type="checkbox" ${value ? "checked" : ""} ${sharedData} />
        <span>${escapeHtml(field.label)}</span>
      </label>
    `;
  }

  if (moduleKey === "healer" && field.key === "words") {
    const resolvedVocation = getHealerResolvedVocation();
    const groups = buildHealerActionSelectOptions(resolvedVocation, normalizedValue);
    const note = index === 0
      ? `<div class="field-note">${escapeHtml(getHealerActionFieldNote(resolvedVocation))}</div>`
      : "";
    return `
      <label class="module-rule-control compact-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <select ${sharedData}>
          ${groups
        .map((group) => `
              <optgroup label="${escapeAttributeValue(group.label)}">
                ${group.options
            .map((option) => `
                    <option value="${escapeHtml(option.value)}" ${normalizeHealerActionValue(option.value) === normalizedValue ? "selected" : ""}>
                      ${escapeHtml(option.label)}
                    </option>
                  `)
            .join("")}
              </optgroup>
            `)
        .join("")}
        </select>
        ${note}
      </label>
    `;
  }

  if (moduleKey === "potionHealer" && field.key === "itemName") {
    const options = buildPotionHealerItemOptions(value);
    const note = index === 0
      ? '<div class="field-note">Healing potion rules are self-use only. Hotbar slots are preferred before open-container matches.</div>'
      : "";
    return `
      <label class="module-rule-control compact-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <select ${sharedData}>
          ${options
        .map((option) => `
              <option value="${escapeHtml(option.value)}" ${String(value ?? "") === String(option.value) ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `)
        .join("")}
        </select>
        ${note}
      </label>
    `;
  }

  if (moduleKey === "conditionHealer" && field.key === "condition") {
    const options = buildConditionHealerTriggerOptions(value);
    const note = index === 0
      ? '<div class="field-note">Only runtime-detectable conditions are configurable here. Unsupported classics stay listed in the coverage panel instead of getting fake toggles.</div>'
      : "";
    return `
      <label class="module-rule-control compact-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <select ${sharedData}>
          ${options
        .map((option) => `
              <option value="${escapeHtml(option.value)}" ${normalizeConditionHealerTriggerValue(value) === option.value ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `)
        .join("")}
        </select>
        ${note}
      </label>
    `;
  }

  if (moduleKey === "conditionHealer" && field.key === "words") {
    const conditionRule = getModuleRuleList("conditionHealer")[index] || {};
    const trigger = conditionRule?.condition || "";
    const resolvedVocation = getHealerResolvedVocation();
    const options = getConditionHealerActionOptions(trigger, resolvedVocation, value);
    const unsupported = !options.length && !conditionHealerTriggerSupportsVocation(trigger, resolvedVocation);
    const fallbackOptions = options.length
      ? options
      : [
        {
          value: String(value || "").trim(),
          label: String(value || "").trim()
            ? `Saved custom / ${String(value || "").trim()}`
            : `No supported action for ${formatVocationLabel(resolvedVocation)}`,
        },
      ];
    const note = unsupported
      ? `<div class="field-note">${escapeHtml(`${formatVocationLabel(resolvedVocation)} does not ship a supported spell for ${formatConditionHealerTriggerLabel(trigger).toLowerCase()} in the current vendored data.`)}</div>`
      : '<div class="field-note">Condition actions resolve from the current runtime vocation when the vendored spell list supports them.</div>';
    return `
      <label class="module-rule-control compact-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <select ${sharedData}>
          ${fallbackOptions
        .map((option) => `
              <option value="${escapeHtml(option.value)}" ${String(value ?? "") === String(option.value) ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `)
        .join("")}
        </select>
        ${note}
      </label>
    `;
  }

  if (field.type === "select") {
    const options = Array.isArray(field.options) ? field.options : [];
    return `
      <label class="module-rule-control compact-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <select ${sharedData}>
          ${options
        .map((option) => `
              <option value="${escapeHtml(option.value)}" ${String(value ?? "") === String(option.value) ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `)
        .join("")}
        </select>
      </label>
    `;
  }

  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
  const inputMode = field.type === "number" ? ' inputmode="numeric"' : "";

  return `
    <label class="module-rule-control compact-rule-control">
      <span>${escapeHtml(field.label)}</span>
      <input type="${field.type}" value="${escapeHtml(value ?? "")}"${placeholder}${inputMode} ${sharedData} />
    </label>
  `;
}

function getModuleOptionFieldSpec(moduleKey, key) {
  const schema = getModuleSchema(moduleKey);
  if (!schema || !key) return null;

  const source = (schema.moduleFields || []).find((field) => field.key === key);
  if (!source) return null;

  return {
    ...source,
    label: MODULE_RULE_FIELD_LABELS[key] || source.label || key,
  };
}

function renderModuleOptionField(moduleKey, field, value) {
  const sharedData = `data-module-key="${moduleKey}" data-module-option-field="${field.key}"`;
  const inputMode = field.type === "number" ? ' inputmode="numeric"' : "";
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
  const help = field.help
    ? `<div class="field-note">${escapeHtml(field.help)}</div>`
    : "";

  if (field.type === "select") {
    const options = Array.isArray(field.options) ? field.options : [];
    return `
      <label class="module-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <select ${sharedData}>
          ${options
        .map((option) => `
              <option value="${escapeHtml(option.value)}" ${String(value ?? "") === String(option.value) ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `)
        .join("")}
        </select>
        ${help}
      </label>
    `;
  }

  if (field.type === "textarea") {
    const rows = Number.isFinite(Number(field.rows))
      ? Math.max(2, Math.trunc(Number(field.rows)))
      : 3;
    return `
      <label class="module-rule-control">
        <span>${escapeHtml(field.label)}</span>
        <textarea rows="${rows}" ${sharedData}${placeholder}>${escapeHtml(formatFieldValueForInput(value, field))}</textarea>
        ${help}
      </label>
    `;
  }

  if (field.type === "checkbox") {
    return `
      <label class="module-rule-control module-rule-check">
        <input type="checkbox" ${value ? "checked" : ""} ${sharedData} />
        <span>${escapeHtml(field.label)}</span>
        ${help}
      </label>
    `;
  }

  return `
    <label class="module-rule-control">
      <span>${escapeHtml(field.label)}</span>
      <input type="${field.type}" value="${escapeHtml(formatFieldValueForInput(value, field))}"${placeholder}${inputMode} ${sharedData} />
      ${help}
    </label>
  `;
}

function renderAlarmCheckboxField(field, checked) {
  if (!field) return "";

  return `
    <label class="module-rule-control module-rule-check alarms-toggle-field">
      <input type="checkbox" ${checked ? "checked" : ""} data-module-key="alarms" data-module-option-field="${escapeAttributeValue(field.key)}" />
      <span>${escapeHtml(field.label)}</span>
    </label>
  `;
}

function renderAlarmNumberField(field, value) {
  if (!field) return "";

  return `
    <label class="module-rule-control alarms-number-field">
      <span>${escapeHtml(field.label)}</span>
      <input
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        value="${escapeHtml(formatFieldValueForInput(value, field))}"
        data-module-key="alarms"
        data-module-option-field="${escapeAttributeValue(field.key)}"
      />
    </label>
  `;
}

function renderAlarmBlacklistTokens(names = []) {
  const normalized = normalizeTextListSummary(names);
  if (!normalized.length) {
    return '<span class="alarms-token alarms-token-empty">No blacklist names yet</span>';
  }

  return normalized
    .map((name) => `
      <button
        type="button"
        class="alarms-token alarms-token-active"
        data-alarms-remove-blacklist="${escapeAttributeValue(name)}"
        aria-label="Remove ${escapeHtml(name)} from blacklist"
      >
        <span>${escapeHtml(name)}</span>
        <span aria-hidden="true">x</span>
      </button>
    `)
    .join("");
}

function renderAlarmLiveEntries(view = buildAlarmModuleView()) {
  if (!view.visibleEntries.length) {
    return '<span class="alarms-live-entry alarms-live-entry-empty">No nearby players in the current snapshot</span>';
  }

  return view.visibleEntries
    .map((entry) => {
      const categoryUi = getAlarmCategoryUi(entry.kind);
      const summary = entry.audible
        ? `Beeping now / ${formatAlarmOffsetLabel(entry.offset)}`
        : `Muted / ${formatAlarmOffsetLabel(entry.offset)}`;

      return `
        <article class="alarms-live-entry tone-${escapeAttributeValue(categoryUi.tone)} ${entry.audible ? "active" : ""}">
          <div class="alarms-live-copy">
            <strong>${escapeHtml(entry.name)}</strong>
            <span>${escapeHtml(categoryUi.shortTitle)} / ${escapeHtml(summary)}</span>
          </div>
          ${entry.kind === "blacklist"
          ? '<span class="alarms-live-action locked">Blacklisted</span>'
          : `
            <button
              type="button"
              class="btn mini"
              data-alarms-add-blacklist="${escapeAttributeValue(entry.name)}"
            >Blacklist</button>
          `}
        </article>
      `;
    })
    .join("");
}

function renderAlarmSettingCard(kind, modulesState = ensureModulesDraft()) {
  const fieldKeys = ALARM_MODULE_FIELD_KEYS[kind] || ALARM_MODULE_FIELD_KEYS.player;
  const categoryUi = getAlarmCategoryUi(kind);
  const settings = getAlarmSettings(modulesState);
  const config = getAlarmCategoryConfig(kind, settings);
  const enabledField = getModuleOptionFieldSpec("alarms", fieldKeys.enabled);
  const radiusField = getModuleOptionFieldSpec("alarms", fieldKeys.radius);
  const floorField = getModuleOptionFieldSpec("alarms", fieldKeys.floor);
  const countLabel = kind === "blacklist"
    ? `${settings.blacklist.names.length} name${settings.blacklist.names.length === 1 ? "" : "s"}`
    : config.enabled
      ? "Live"
      : "Muted";

  return `
    <section class="alarms-card tone-${escapeAttributeValue(categoryUi.tone)}">
      <div class="alarms-card-head">
        <div class="alarms-card-copy">
          <span class="alarms-card-kicker">${escapeHtml(categoryUi.sound)}</span>
          <strong class="alarms-card-title">${escapeHtml(categoryUi.title)}</strong>
        </div>
        <span class="alarms-card-badge" data-alarms-card-state="${escapeAttributeValue(kind)}">${escapeHtml(config.enabled ? "On" : "Off")}</span>
      </div>
      <div class="alarms-card-grid">
        ${renderAlarmCheckboxField(enabledField, config.enabled)}
        ${renderAlarmNumberField(radiusField, config.radiusSqm)}
        ${renderAlarmNumberField(floorField, config.floorRange)}
      </div>
      <div class="alarms-card-note" data-alarms-scope="${escapeAttributeValue(kind)}">${escapeHtml(`${formatAlarmScope(config.radiusSqm, config.floorRange)} / ${countLabel}`)}</div>
    </section>
  `;
}

function renderAlarmFields(modulesState = ensureModulesDraft()) {
  const view = buildAlarmModuleView(modulesState);
  const blacklistField = getModuleOptionFieldSpec("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.names);

  return `
    <div class="alarms-shell">
      <section class="alarms-overview" data-alarms-overview data-tone="${escapeAttributeValue(view.tone)}">
        <div class="alarms-overview-copy">
          <span class="alarms-overview-kicker">${escapeHtml(view.sessionLabel)}</span>
          <h3 class="alarms-overview-title" data-alarms-summary="headline">${escapeHtml(view.headline)}</h3>
          <p class="alarms-overview-detail" data-alarms-summary="detail">${escapeHtml(view.detail)}</p>
        </div>
        <div class="alarms-overview-stats">
          ${["player", "staff", "blacklist"].map((kind) => {
    const categoryUi = getAlarmCategoryUi(kind);
    return `
              <article class="alarms-stat-card tone-${escapeAttributeValue(categoryUi.tone)}">
                <span>${escapeHtml(categoryUi.shortTitle)}</span>
                <strong data-alarms-stat="${escapeAttributeValue(kind)}-visible">${escapeHtml(`${view.counts[kind].visible} seen`)}</strong>
                <small data-alarms-stat="${escapeAttributeValue(kind)}-audible">${escapeHtml(`${view.counts[kind].audible} beeping`)}</small>
              </article>
            `;
  }).join("")}
        </div>
      </section>

      <div class="alarms-grid">
        ${renderAlarmSettingCard("player", modulesState)}
        ${renderAlarmSettingCard("staff", modulesState)}
        <section class="alarms-card alarms-card-blacklist tone-blacklist">
          <div class="alarms-card-head">
            <div class="alarms-card-copy">
              <span class="alarms-card-kicker">${escapeHtml(getAlarmCategoryUi("blacklist").sound)}</span>
              <strong class="alarms-card-title">Blacklist</strong>
            </div>
            <span class="alarms-card-badge" data-alarms-card-state="blacklist">${escapeHtml(view.settings.blacklist.enabled ? "On" : "Off")}</span>
          </div>
          <div class="alarms-card-grid">
            ${renderAlarmCheckboxField(getModuleOptionFieldSpec("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.enabled), view.settings.blacklist.enabled)}
            ${renderAlarmNumberField(getModuleOptionFieldSpec("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.radius), view.settings.blacklist.radiusSqm)}
            ${renderAlarmNumberField(getModuleOptionFieldSpec("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.floor), view.settings.blacklist.floorRange)}
          </div>
          <div class="alarms-card-note" data-alarms-scope="blacklist">${escapeHtml(`${formatAlarmScope(view.settings.blacklist.radiusSqm, view.settings.blacklist.floorRange)} / ${view.settings.blacklist.names.length} name${view.settings.blacklist.names.length === 1 ? "" : "s"}`)}</div>
          <div class="alarms-token-strip" data-alarms-blacklist-strip>
            ${renderAlarmBlacklistTokens(view.settings.blacklist.names)}
          </div>
          <label class="module-rule-control alarms-blacklist-field">
            <span>${escapeHtml(blacklistField?.label || "Blacklist names")}</span>
            <textarea
              rows="${Math.max(3, Math.trunc(Number(blacklistField?.rows) || 4))}"
              data-module-key="alarms"
              data-module-option-field="${escapeAttributeValue(ALARM_MODULE_FIELD_KEYS.blacklist.names)}"
              placeholder="${escapeHtml(blacklistField?.placeholder || "")}"
            >${escapeHtml(formatFieldValueForInput(modulesState?.alarmsBlacklistNames, blacklistField || {}))}</textarea>
          </label>
          <div class="field-note">One exact name per line. Visible players can be promoted into the blacklist with one click.</div>
        </section>
      </div>

      <section class="alarms-live-band">
        <div class="alarms-live-head">
          <strong>Nearby Players</strong>
          <span>Current snapshot around ${escapeHtml(view.sessionLabel)}</span>
        </div>
        <div class="alarms-live-strip" data-alarms-live-strip>
          ${renderAlarmLiveEntries(view)}
        </div>
      </section>
    </div>
  `;
}

function syncAlarmModuleView(modulesState = ensureModulesDraft()) {
  if (getActiveModuleKey() !== "alarms" || !moduleExtraFields) {
    return;
  }

  const view = buildAlarmModuleView(modulesState);
  const overview = moduleExtraFields.querySelector("[data-alarms-overview]");
  if (overview) {
    overview.dataset.tone = view.tone;
  }

  const textValues = {
    '[data-alarms-summary="headline"]': view.headline,
    '[data-alarms-summary="detail"]': view.detail,
    '[data-alarms-stat="player-visible"]': `${view.counts.player.visible} seen`,
    '[data-alarms-stat="player-audible"]': `${view.counts.player.audible} beeping`,
    '[data-alarms-stat="staff-visible"]': `${view.counts.staff.visible} seen`,
    '[data-alarms-stat="staff-audible"]': `${view.counts.staff.audible} beeping`,
    '[data-alarms-stat="blacklist-visible"]': `${view.counts.blacklist.visible} seen`,
    '[data-alarms-stat="blacklist-audible"]': `${view.counts.blacklist.audible} beeping`,
  };

  Object.entries(textValues).forEach(([selector, value]) => {
    const element = moduleExtraFields.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  });

  ["player", "staff", "blacklist"].forEach((kind) => {
    const badge = moduleExtraFields.querySelector(`[data-alarms-card-state="${kind}"]`);
    if (badge) {
      badge.textContent = view.settings[kind].enabled ? "On" : "Off";
    }
    const scope = moduleExtraFields.querySelector(`[data-alarms-scope="${kind}"]`);
    if (scope) {
      const extra = kind === "blacklist"
        ? `${view.settings.blacklist.names.length} name${view.settings.blacklist.names.length === 1 ? "" : "s"}`
        : (view.settings[kind].enabled ? "Live" : "Muted");
      scope.textContent = `${formatAlarmScope(view.settings[kind].radiusSqm, view.settings[kind].floorRange)} / ${extra}`;
    }
  });

  const blacklistStrip = moduleExtraFields.querySelector("[data-alarms-blacklist-strip]");
  if (blacklistStrip) {
    blacklistStrip.innerHTML = renderAlarmBlacklistTokens(view.settings.blacklist.names);
  }

  const liveStrip = moduleExtraFields.querySelector("[data-alarms-live-strip]");
  if (liveStrip) {
    liveStrip.innerHTML = renderAlarmLiveEntries(view);
  }
}

function getAntiIdleRuntimeStatus() {
  return state?.antiIdleStatus || getBoundInstance()?.antiIdleStatus || null;
}

function isTrainerConfigured(options = state?.options || {}) {
  return Boolean(options?.trainerConfigured || options?.trainerEnabled);
}

function getTrainerModeState(options = state?.options || {}) {
  const configured = isTrainerConfigured(options);
  const enabled = Boolean(options?.trainerEnabled);
  const blockedByFollow = configured && Boolean(options?.partyFollowEnabled) && !enabled;
  return {
    configured,
    enabled,
    blockedByFollow,
  };
}

function getAutoEatModeState(options = state?.options || {}) {
  const moduleEnabled = Boolean(options?.autoEatEnabled);
  const trainerOnly = !moduleEnabled && Boolean(options?.trainerEnabled);
  return {
    enabled: moduleEnabled || trainerOnly,
    moduleEnabled,
    trainerOnly,
  };
}

function getAntiIdleModeState(options = state?.options || {}) {
  const moduleEnabled = Boolean(options?.antiIdleEnabled);
  const trainerOnly = !moduleEnabled && Boolean(options?.trainerEnabled);
  return {
    enabled: moduleEnabled || trainerOnly,
    moduleEnabled,
    trainerOnly,
  };
}

function isFollowTrainFollower(status = null) {
  return Boolean(status && (status.active || Number(status.selfIndex) > 0));
}

function getAutowalkModeState(options = state?.options || {}, sourceState = state) {
  const moduleEnabled = Boolean(options?.autowalkEnabled);
  const followTrainStatus = getBoundInstance(sourceState)?.followTrainStatus || null;
  const followOwned = moduleEnabled
    && Boolean(options?.partyFollowEnabled)
    && isFollowTrainFollower(followTrainStatus);
  return {
    enabled: moduleEnabled && !followOwned,
    moduleEnabled,
    followOwned,
    followTrainStatus,
  };
}

function getAntiIdleBlockerLabel(blocker) {
  switch (blocker) {
    case "disabled":
      return "Off";
    case "transport":
      return "Transport offline";
    case "snapshot":
      return "Waiting for snapshot";
    case "target":
      return "Target active";
    case "visible-creatures":
      return "Creatures nearby";
    case "movement":
      return "Movement active";
    case "retry":
      return "Retry cooling down";
    case "warming-up":
      return "Warming up";
    case "waiting":
      return "Idle timer running";
    default:
      return "Ready";
  }
}

function getAntiIdleStatusTone(status, enabled) {
  if (!enabled) return "off";
  if (status?.ready) return "ready";
  if (["transport", "snapshot", "retry"].includes(status?.blocker)) return "warn";
  return "waiting";
}

function formatAntiIdleDetail(status, enabled, { trainerOnly = false } = {}) {
  const prefix = trainerOnly ? "Trainer keepalive: " : "";
  if (!enabled) return "Module disabled";
  if (!status) return state?.running ? "Waiting for live status" : "Loop stopped / manual pulse available";
  if (status.ready) return `${prefix}Idle ${formatDurationMs(status.inactivityMs)} / pulse can fire`;
  if (status.blocker === "waiting") return `${prefix}Next pulse in ${formatDurationMs(status.nextPulseInMs)}`;
  if (status.blocker === "retry") return `${prefix}Retry in ${formatDurationMs(status.blockedForMs)}`;
  if (status.lastError && status.blocker === "transport") return status.lastError;
  return `${prefix}${getAntiIdleBlockerLabel(status.blocker)}`;
}

function renderAntiIdleMetric(label, value) {
  return `
    <div class="anti-idle-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderAntiIdleFields(modulesState = ensureModulesDraft()) {
  const intervalField = getModuleOptionFieldSpec("antiIdle", "antiIdleIntervalMs");
  const status = getAntiIdleRuntimeStatus();
  const { enabled, trainerOnly } = getAntiIdleModeState(modulesState);
  const intervalMs = Math.max(1000, Math.trunc(Number(modulesState?.antiIdleIntervalMs) || 60_000));
  const statusTone = getAntiIdleStatusTone(status, enabled);
  const headline = enabled
    ? (status?.ready ? "Ready" : getAntiIdleBlockerLabel(status?.blocker || "snapshot"))
    : "Off";
  const detail = formatAntiIdleDetail(status, enabled, { trainerOnly });
  const lastPulse = status?.lastPulseAt ? formatClockTime(status.lastPulseAt) : "-";
  const transport = status?.lastTransport || "-";
  const idleFor = status?.inactivityMs != null ? formatDurationMs(status.inactivityMs) : "-";
  const waitMs = Math.max(0, Number(status?.blockedForMs) || Number(status?.nextPulseInMs) || 0);
  const nextPulse = enabled
    ? (status?.ready ? "Now" : (waitMs ? formatDurationMs(waitMs) : "-"))
    : "-";

  return `
    <div class="anti-idle-workspace">
      <section class="anti-idle-status-band" data-tone="${escapeHtml(statusTone)}">
        <div class="anti-idle-status-copy">
          <span>Readiness</span>
          <strong>${escapeHtml(headline)}</strong>
          <small>${escapeHtml(detail)}</small>
        </div>
        <div class="anti-idle-metric-grid">
          ${renderAntiIdleMetric("Delay", formatDurationMs(intervalMs))}
          ${renderAntiIdleMetric("Idle", idleFor)}
          ${renderAntiIdleMetric("Next", nextPulse)}
          ${renderAntiIdleMetric("Last", lastPulse)}
          ${renderAntiIdleMetric("Path", transport)}
        </div>
      </section>
      <div class="anti-idle-control-grid">
        ${intervalField ? renderModuleOptionField("antiIdle", intervalField, intervalMs) : ""}
        <div class="anti-idle-preset-group" role="group" aria-label="Anti-idle delay presets">
          ${ANTI_IDLE_PRESET_MS.map((presetMs) => `
            <button
              type="button"
              class="btn mini ${Math.abs(intervalMs - presetMs) < 1 ? "active" : ""}"
              data-anti-idle-preset-ms="${presetMs}"
              aria-pressed="${Math.abs(intervalMs - presetMs) < 1 ? "true" : "false"}"
            >${escapeHtml(formatDurationMs(presetMs))}</button>
          `).join("")}
        </div>
        <button type="button" class="btn anti-idle-test" data-test-anti-idle>Test Pulse</button>
      </div>
    </div>
  `;
}

function isTrainerReconnectEnabled(options = state?.options || {}) {
  return Boolean(options?.trainerEnabled) && options?.trainerReconnectEnabled !== false;
}

function getReconnectModeState(options = state?.options || {}) {
  const moduleEnabled = Boolean(options?.reconnectEnabled);
  const trainerEnabled = isTrainerReconnectEnabled(options);
  return {
    enabled: moduleEnabled || trainerEnabled,
    moduleEnabled,
    trainerEnabled,
    trainerOnly: !moduleEnabled && trainerEnabled,
  };
}

function formatReconnectAttemptLimit(maxAttempts = 0) {
  const normalized = Math.max(0, Math.trunc(Number(maxAttempts) || 0));
  return normalized > 0 ? `${normalized} max` : "Unlimited";
}

function formatReconnectAttemptStatus(status = null, maxAttempts = 0) {
  const attempts = Math.max(0, Math.trunc(Number(status?.attempts) || 0));
  const normalizedMaxAttempts = Math.max(0, Math.trunc(Number(maxAttempts) || 0));
  return normalizedMaxAttempts > 0
    ? `${attempts} / ${normalizedMaxAttempts}`
    : `${attempts} / inf`;
}

function getReconnectRuntimeStatus(options = state?.options || {}, sourceState = state) {
  const reconnectStatus = sourceState?.reconnectStatus || null;
  const connection = sourceState?.snapshot?.connection || null;
  const { enabled, moduleEnabled, trainerEnabled, trainerOnly } = getReconnectModeState(options);
  const retryDelayMs = Math.max(0, Math.trunc(Number(options?.reconnectRetryDelayMs) || 0));
  const maxAttempts = Math.max(0, Math.trunc(Number(options?.reconnectMaxAttempts) || 0));
  const dead = sourceState?.snapshot?.reason === "dead"
    || connection?.playerIsDead === true
    || connection?.deathModalVisible === true
    || reconnectStatus?.deathBlocked === true;
  const liveReconnectState = Boolean(
    reconnectStatus?.active
    || connection?.canReconnect
    || connection?.reconnecting,
  );
  let headline = "Off";
  let detail = "Unexpected disconnects ignored";
  let tone = "off";

  if (!enabled && !liveReconnectState) {
    return {
      enabled,
      moduleEnabled,
      trainerEnabled,
      trainerOnly,
      retryDelayMs,
      maxAttempts,
      reconnectStatus,
      connection,
      dead,
      tone,
      headline,
      detail,
      configDetail: `Retry ${formatDurationMs(retryDelayMs)} / ${formatReconnectAttemptLimit(maxAttempts)} attempts`,
      nextValue: "-",
      lastAttemptValue: reconnectStatus?.lastAttemptAt
        ? formatClockTime(reconnectStatus.lastAttemptAt)
        : "-",
      attemptValue: formatReconnectAttemptStatus(reconnectStatus, maxAttempts),
      sourceValue: "Off",
      manualAvailable: false,
    };
  }

  if (dead) {
    headline = "Dead";
    detail = "Death modal blocks reconnect";
    tone = "warn";
  } else if (reconnectStatus?.active) {
    if (reconnectStatus.phase === "cooldown") {
      headline = `${Math.max(1, Math.ceil((Number(reconnectStatus.remainingMs) || 0) / 1000))}s`;
      detail = `Next retry in ${formatDurationMs(reconnectStatus.remainingMs)}`;
      tone = "warn";
    } else if (reconnectStatus.phase === "attempting") {
      headline = "Live";
      detail = "Restoring the live client now";
      tone = "live";
    } else if (reconnectStatus.phase === "exhausted") {
      headline = "Stop";
      detail = `Stopped after ${Math.max(0, Number(reconnectStatus.attempts) || 0)} attempt${Number(reconnectStatus.attempts) === 1 ? "" : "s"}`;
      tone = "warn";
    } else if (reconnectStatus.phase === "waiting") {
      headline = "Wait";
      detail = "Armed and waiting for the reconnect window";
      tone = "ready";
    } else {
      headline = trainerOnly ? "Trainer" : "Armed";
      detail = "Unexpected disconnect detected";
      tone = "ready";
    }
  } else if (connection?.reconnecting) {
    headline = "Live";
    detail = "Minibia is reconnecting now";
    tone = "live";
  } else if (connection?.canReconnect) {
    headline = "Now";
    detail = "Reconnect window ready";
    tone = "warn";
  } else if (enabled) {
    headline = trainerOnly ? "Trainer" : "On";
    detail = trainerOnly
      ? "Trainer owns disconnect recovery"
      : "Reconnect guard armed";
    tone = "ready";
  }

  return {
    enabled,
    moduleEnabled,
    trainerEnabled,
    trainerOnly,
    retryDelayMs,
    maxAttempts,
    reconnectStatus,
    connection,
    dead,
    tone,
    headline,
    detail,
    configDetail: `Retry ${formatDurationMs(retryDelayMs)} / ${formatReconnectAttemptLimit(maxAttempts)} attempts`,
    nextValue: reconnectStatus?.phase === "cooldown"
      ? formatDurationMs(reconnectStatus.remainingMs)
      : connection?.canReconnect
        ? "Now"
        : reconnectStatus?.phase === "attempting" || connection?.reconnecting
          ? "Live"
          : reconnectStatus?.phase === "waiting"
            ? "Waiting"
            : "-",
    lastAttemptValue: reconnectStatus?.lastAttemptAt
      ? formatClockTime(reconnectStatus.lastAttemptAt)
      : "-",
    attemptValue: formatReconnectAttemptStatus(reconnectStatus, maxAttempts),
    sourceValue: moduleEnabled && trainerEnabled
      ? "Both"
      : trainerOnly
        ? "Trainer"
        : moduleEnabled
          ? "Module"
          : "Off",
    manualAvailable: Boolean(
      reconnectStatus?.active
      || connection?.canReconnect
      || connection?.reconnecting,
    ),
  };
}

function renderReconnectMetric(label, value) {
  return `
    <div class="reconnect-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderReconnectFields(modulesState = ensureModulesDraft()) {
  const retryField = getModuleOptionFieldSpec("reconnect", "reconnectRetryDelayMs");
  const maxAttemptsField = getModuleOptionFieldSpec("reconnect", "reconnectMaxAttempts");
  const runtime = getReconnectRuntimeStatus(modulesState);

  return `
    <div class="reconnect-workspace">
      <section class="reconnect-status-band" data-tone="${escapeHtml(runtime.tone)}">
        <div class="reconnect-status-copy">
          <span>Recovery</span>
          <strong>${escapeHtml(runtime.headline)}</strong>
          <small>${escapeHtml(`${runtime.detail} / ${runtime.configDetail}`)}</small>
        </div>
        <div class="reconnect-metric-grid">
          ${renderReconnectMetric("Retry", formatDurationMs(runtime.retryDelayMs))}
          ${renderReconnectMetric("Attempts", runtime.attemptValue)}
          ${renderReconnectMetric("Next", runtime.nextValue)}
          ${renderReconnectMetric("Last", runtime.lastAttemptValue)}
          ${renderReconnectMetric("Owner", runtime.sourceValue)}
        </div>
      </section>
      <div class="reconnect-control-grid">
        ${retryField ? renderModuleOptionField("reconnect", retryField, runtime.retryDelayMs) : ""}
        ${maxAttemptsField ? renderModuleOptionField("reconnect", maxAttemptsField, runtime.maxAttempts) : ""}
        <button type="button" class="btn reconnect-manual-action" data-trigger-reconnect ${runtime.manualAvailable ? "" : "disabled"}>Reconnect Now</button>
      </div>
    </div>
  `;
}

function titleCaseAutoEatLabel(value = "") {
  return String(value || "").replace(/\b\w/g, (character) => character.toUpperCase());
}

function isAutoEatFoodItem(item = {}) {
  const category = String(item?.category || "").trim().toLowerCase();
  if (category === "food") {
    return true;
  }

  const label = [
    item?.name,
    item?.slotType,
    item?.slotLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(?:food|ham|meat|fish|salmon|mushroom|bread|cheese|banana|apple|cookie|cake|pizza|egg)\b/.test(label);
}

function getAutoEatLiveChoices(snapshot = state?.snapshot) {
  const registry = new Map();
  const upsertChoice = (name = "", {
    source = "",
    count = 0,
  } = {}) => {
    const label = String(name || "").trim();
    const key = label.toLowerCase();
    if (!label) {
      return;
    }

    const existing = registry.get(key);
    if (!existing) {
      registry.set(key, {
        key,
        label,
        count: Math.max(0, Math.trunc(Number(count) || 0)),
        sources: source ? [source] : [],
      });
      return;
    }

    existing.count += Math.max(0, Math.trunc(Number(count) || 0));
    if (source && !existing.sources.includes(source)) {
      existing.sources.push(source);
    }
  };

  const hotbarSlots = Array.isArray(snapshot?.hotbar?.slots) ? snapshot.hotbar.slots : [];
  hotbarSlots.forEach((slot) => {
    const item = {
      name: slot?.itemName,
      category: slot?.category,
      count: slot?.count,
    };
    if (!isAutoEatFoodItem(item)) {
      return;
    }

    const source = slot?.hotkey
      ? `Hotbar ${slot.hotkey}`
      : "Hotbar";
    upsertChoice(item.name, {
      source,
      count: item.count || 1,
    });
  });

  const equipmentEntries = Array.isArray(snapshot?.inventory?.equipment) ? snapshot.inventory.equipment : [];
  equipmentEntries.forEach((entry) => {
    const item = entry?.item || null;
    if (!isAutoEatFoodItem(item)) {
      return;
    }

    const source = entry?.slotLabel
      ? `Equipment ${titleCaseAutoEatLabel(entry.slotLabel)}`
      : "Equipment";
    upsertChoice(item.name, {
      source,
      count: item.count || 1,
    });
  });

  const containers = Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [];
  containers.forEach((container) => {
    const containerName = String(container?.name || "").trim() || "Container";
    (container?.slots || []).forEach((entry) => {
      const item = entry?.item || null;
      if (!isAutoEatFoodItem(item)) {
        return;
      }

      upsertChoice(item.name, {
        source: containerName,
        count: item.count || 1,
      });
    });
  });

  return [...registry.values()]
    .sort((left, right) => (
      compareDisplayNames(left.label, right.label)
      || left.sources.length - right.sources.length
    ));
}

function getAutoEatLiveChoiceSignature(snapshot = state?.snapshot) {
  return getAutoEatLiveChoices(snapshot)
    .map((choice) => `${choice.label}:${choice.count}:${choice.sources.join("|")}`)
    .join("::");
}

function buildAutoEatSummary(modulesState = ensureModulesDraft()) {
  const allowed = normalizeTextListSummary(modulesState?.autoEatFoodName);
  const blocked = normalizeTextListSummary(modulesState?.autoEatForbiddenFoodNames);
  const choices = getAutoEatLiveChoices(state?.snapshot);
  const enabled = Boolean(modulesState?.autoEatEnabled);
  const fallbackAny = allowed.length === 0;

  return {
    enabled,
    allowed,
    blocked,
    choices,
    headline: enabled
      ? (fallbackAny ? "Any detected food is allowed" : "Priority food list is armed")
      : "Auto eat is paused",
    detail: enabled
      ? (fallbackAny
        ? "Blank Eat First means the first non-blocked food source can be used."
        : "Eat First is checked top to bottom. Never Eat always wins over the priority list.")
      : "The food lists stay saved, but no eating happens until the module is turned back on.",
    modeValue: fallbackAny ? "Any food" : formatRuleLabel(allowed.length, "priority pick"),
    modeDetail: fallbackAny
      ? "First detected non-blocked food wins."
      : allowed.join(" -> "),
    blockedValue: blocked.length ? formatRuleLabel(blocked.length, "blocked item") : "Clear",
    blockedDetail: blocked.length ? blocked.join(", ") : "Nothing is blocked right now.",
    sourceValue: formatRuleLabel(choices.length, "source"),
    sourceDetail: choices.length
      ? `${choices[0].label}${choices.length > 1 ? ` +${choices.length - 1} more` : ""}`
      : "Open a backpack or populate a hotbar food slot.",
  };
}

function formatAutoEatNote(modulesState = ensureModulesDraft(), baseNote = "") {
  const summary = buildAutoEatSummary(modulesState);
  const allowedText = summary.allowed.length
    ? summary.allowed.join(" -> ")
    : "any detected food";
  const blockedText = summary.blocked.length
    ? summary.blocked.join(", ")
    : "none";
  const liveText = summary.choices.length
    ? `${summary.choices.slice(0, 3).map((choice) => choice.label).join(", ")}${summary.choices.length > 3 ? ` +${summary.choices.length - 3} more` : ""}`
    : "no live food sources detected yet";
  const segments = [
    String(baseNote || "").trim(),
    `Eat First: ${allowedText}.`,
    `Never Eat: ${blockedText}.`,
    `Live: ${liveText}.`,
  ].filter(Boolean);
  return segments.join(" ");
}

function renderAutoEatActiveTokens(fieldKey, entries = [], {
  emptyLabel = "No food selected",
  tone = "safe",
} = {}) {
  const normalized = normalizeTextListSummary(entries);
  if (!normalized.length) {
    return `<span class="looting-chip looting-chip-empty">${escapeHtml(emptyLabel)}</span>`;
  }

  return normalized
    .map((entry) => `
      <button
        type="button"
        class="looting-chip looting-chip-token tone-${escapeAttributeValue(tone)}"
        data-autoeat-field="${escapeAttributeValue(fieldKey)}"
        data-autoeat-remove-token="${escapeAttributeValue(entry)}"
        aria-label="Remove ${escapeHtml(entry)}"
      >
        <span>${escapeHtml(entry)}</span>
        <span class="looting-chip-dismiss" aria-hidden="true">x</span>
      </button>
    `)
    .join("");
}

function renderAutoEatSourceCards(choices = [], {
  allowed = [],
  blocked = [],
} = {}) {
  const allowedKeys = new Set(normalizeTextListSummary(allowed).map((entry) => entry.toLowerCase()));
  const blockedKeys = new Set(normalizeTextListSummary(blocked).map((entry) => entry.toLowerCase()));

  if (!choices.length) {
    return '<div class="empty-state">No live food sources detected yet. Open the backpack or keep a food slot on the hotbar.</div>';
  }

  return choices
    .map((choice) => {
      const stateLabel = blockedKeys.has(choice.key)
        ? "blocked"
        : allowedKeys.has(choice.key)
          ? "priority"
          : "available";
      return `
        <article class="autoeat-source-card" data-state="${escapeAttributeValue(stateLabel)}">
          <div class="autoeat-source-head">
            <strong>${escapeHtml(choice.label)}</strong>
            <span class="autoeat-source-count">x${escapeHtml(String(Math.max(1, choice.count || 1)))}</span>
          </div>
          <div class="autoeat-source-meta">${escapeHtml(choice.sources.join(" / ") || "Detected source")}</div>
          <div class="autoeat-source-actions">
            <button
              type="button"
              class="btn mini ${allowedKeys.has(choice.key) ? "active" : ""}"
              data-autoeat-field="autoEatFoodName"
              data-autoeat-add-token="${escapeAttributeValue(choice.label)}"
              aria-pressed="${allowedKeys.has(choice.key) ? "true" : "false"}"
            >Eat</button>
            <button
              type="button"
              class="btn mini danger ${blockedKeys.has(choice.key) ? "active" : ""}"
              data-autoeat-field="autoEatForbiddenFoodNames"
              data-autoeat-add-token="${escapeAttributeValue(choice.label)}"
              aria-pressed="${blockedKeys.has(choice.key) ? "true" : "false"}"
            >Never</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateAutoEatFieldToken(fieldKey, token, action = "add") {
  const normalizedToken = String(token || "").trim();
  if (!fieldKey) {
    return;
  }

  if (action === "clear") {
    setModuleOptionInputValue("autoEat", fieldKey, "", { focus: true });
    return;
  }

  if (!normalizedToken) {
    return;
  }

  const input = getModuleOptionInput("autoEat", fieldKey);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    return;
  }

  const currentEntries = normalizeTextListSummary(input.value);
  const tokenKey = normalizedToken.toLowerCase();
  const nextEntries = action === "remove"
    ? currentEntries.filter((entry) => entry.toLowerCase() !== tokenKey)
    : (currentEntries.some((entry) => entry.toLowerCase() === tokenKey)
      ? currentEntries
      : [...currentEntries, normalizedToken]);

  setModuleOptionInputValue("autoEat", fieldKey, nextEntries.join("\n"), {
    focus: action !== "remove",
  });

  if (action !== "add") {
    return;
  }

  const siblingFieldKey = fieldKey === "autoEatFoodName"
    ? "autoEatForbiddenFoodNames"
    : fieldKey === "autoEatForbiddenFoodNames"
      ? "autoEatFoodName"
      : "";
  if (!siblingFieldKey) {
    return;
  }

  const siblingInput = getModuleOptionInput("autoEat", siblingFieldKey);
  if (!(siblingInput instanceof HTMLInputElement || siblingInput instanceof HTMLTextAreaElement)) {
    return;
  }

  const siblingEntries = normalizeTextListSummary(siblingInput.value);
  const nextSiblingEntries = siblingEntries.filter((entry) => entry.toLowerCase() !== tokenKey);
  if (nextSiblingEntries.length === siblingEntries.length) {
    return;
  }

  setModuleOptionInputValue("autoEat", siblingFieldKey, nextSiblingEntries.join("\n"));
}

function renderAutoEatFields(modulesState = ensureModulesDraft()) {
  const priorityField = getModuleOptionFieldSpec("autoEat", "autoEatFoodName");
  const blockedField = getModuleOptionFieldSpec("autoEat", "autoEatForbiddenFoodNames");
  const cooldownField = getModuleOptionFieldSpec("autoEat", "autoEatCooldownMs");
  const targetField = getModuleOptionFieldSpec("autoEat", "autoEatRequireNoTargets");
  const idleField = getModuleOptionFieldSpec("autoEat", "autoEatRequireStationary");
  const summary = buildAutoEatSummary(modulesState);
  const allowedValue = normalizeTextListSummary(modulesState?.autoEatFoodName).join("\n");
  const blockedValue = normalizeTextListSummary(modulesState?.autoEatForbiddenFoodNames).join("\n");

  return `
    <div class="autoeat-shell">
      <input type="hidden" value="${escapeHtml(allowedValue)}" data-module-key="autoEat" data-module-option-field="autoEatFoodName" />
      <input type="hidden" value="${escapeHtml(blockedValue)}" data-module-key="autoEat" data-module-option-field="autoEatForbiddenFoodNames" />

      <section class="autoeat-overview">
        <div class="autoeat-overview-copy">
          <span class="autoeat-overview-kicker">${summary.enabled ? "Enabled" : "Paused"}</span>
          <h3 class="autoeat-overview-title">${escapeHtml(summary.headline)}</h3>
          <p class="autoeat-overview-detail">${escapeHtml(summary.detail)}</p>
        </div>
        <div class="autoeat-overview-stats">
          <article class="autoeat-stat-card tone-safe">
            <span>Mode</span>
            <strong>${escapeHtml(summary.modeValue)}</strong>
            <small>${escapeHtml(summary.modeDetail)}</small>
          </article>
          <article class="autoeat-stat-card tone-danger">
            <span>Never Eat</span>
            <strong>${escapeHtml(summary.blockedValue)}</strong>
            <small>${escapeHtml(summary.blockedDetail)}</small>
          </article>
          <article class="autoeat-stat-card tone-route">
            <span>Sources</span>
            <strong>${escapeHtml(summary.sourceValue)}</strong>
            <small>${escapeHtml(summary.sourceDetail)}</small>
          </article>
          <article class="autoeat-stat-card tone-neutral">
            <span>Cadence</span>
            <strong>${escapeHtml(formatDurationMs(modulesState?.autoEatCooldownMs))}</strong>
            <small>${escapeHtml(modulesState?.autoEatRequireStationary !== false ? "idle gated" : "movement allowed")}</small>
          </article>
        </div>
      </section>

      <section class="autoeat-source-bank">
        <div class="autoeat-section-head">
          <div>
            <div class="autoeat-section-kicker">Detected Food Sources</div>
            <div class="autoeat-section-title">Live Items</div>
          </div>
          <span class="autoeat-section-meta">${escapeHtml(summary.sourceValue)}</span>
        </div>
        <div class="autoeat-source-grid">
          ${renderAutoEatSourceCards(summary.choices, {
    allowed: summary.allowed,
    blocked: summary.blocked,
  })}
        </div>
      </section>

      <div class="autoeat-columns">
        <section class="autoeat-column autoeat-column-priority">
          <div class="autoeat-section-head">
            <div>
              <div class="autoeat-section-kicker">Allowed</div>
              <div class="autoeat-section-title">Eat First</div>
            </div>
            <button type="button" class="btn mini" data-autoeat-clear-field="autoEatFoodName">Clear</button>
          </div>
          <p class="autoeat-column-copy">${escapeHtml(priorityField?.help || "")}</p>
          <div class="looting-token-strip autoeat-token-strip">
            ${renderAutoEatActiveTokens("autoEatFoodName", summary.allowed, {
    emptyLabel: "Blank means any non-blocked food can be used.",
    tone: "safe",
  })}
          </div>
        </section>

        <section class="autoeat-column autoeat-column-blocked">
          <div class="autoeat-section-head">
            <div>
              <div class="autoeat-section-kicker">Denied</div>
              <div class="autoeat-section-title">Never Eat</div>
            </div>
            <button type="button" class="btn mini" data-autoeat-clear-field="autoEatForbiddenFoodNames">Clear</button>
          </div>
          <p class="autoeat-column-copy">${escapeHtml(blockedField?.help || "")}</p>
          <div class="looting-token-strip autoeat-token-strip">
            ${renderAutoEatActiveTokens("autoEatForbiddenFoodNames", summary.blocked, {
    emptyLabel: "Nothing is blocked right now.",
    tone: "danger",
  })}
          </div>
        </section>
      </div>

      <section class="autoeat-controls">
        ${cooldownField ? renderModuleOptionField("autoEat", cooldownField, modulesState?.autoEatCooldownMs) : ""}
        ${targetField ? renderModuleOptionField("autoEat", targetField, modulesState?.autoEatRequireNoTargets) : ""}
        ${idleField ? renderModuleOptionField("autoEat", idleField, modulesState?.autoEatRequireStationary) : ""}
      </section>
    </div>
  `;
}

function getAmmoDefaultConfig(vocation = "") {
  return AMMO_DEFAULTS_BY_VOCATION[String(vocation || "").trim().toLowerCase()]
    || AMMO_DEFAULTS_BY_VOCATION.knight;
}

function getAmmoSlotLabel(snapshot = state?.snapshot) {
  const directLabel = String(snapshot?.inventory?.ammo?.slotLabel || "").trim();
  if (directLabel) {
    return directLabel;
  }

  const equipmentSlots = Array.isArray(snapshot?.inventory?.equipment?.slots)
    ? snapshot.inventory.equipment.slots
    : [];
  const detectedSlot = equipmentSlots.find((slot) => /\b(?:quiver|ammo|ammunition|arrow|bolt)\b/i.test([
    slot?.label,
    slot?.item?.name,
    slot?.item?.slotType,
  ].filter(Boolean).join(" "))) || null;

  return String(detectedSlot?.label || "Quiver").trim() || "Quiver";
}

function isDetectedAmmoItem(item = {}, sourceLabel = "", {
  rejectCoins = true,
} = {}) {
  const itemId = Number(item?.id ?? item?.itemId);
  const itemName = String(item?.name || "").trim();
  if (rejectCoins && ((Number.isFinite(itemId) && AMMO_COIN_IDS.has(Math.trunc(itemId))) || AMMO_COIN_NAME_PATTERN.test(itemName))) {
    return false;
  }

  if (item?.flags?.ammo === true) {
    return true;
  }

  return /\b(?:ammo|ammunition|arrow|bolt|power\s*bolt|spear|dart|throwing)\b/i.test([
    item?.name,
    item?.slotType,
    sourceLabel,
  ].filter(Boolean).join(" "));
}

function buildAmmoLiveChoices(snapshot = state?.snapshot, {
  rejectCoins = true,
} = {}) {
  const choicesByKey = new Map();
  const addChoice = (name, count = 0, source = "", { equipped = false } = {}) => {
    const label = String(name || "").trim();
    const key = label.toLowerCase();
    if (!label) {
      return;
    }

    const existing = choicesByKey.get(key) || {
      key,
      label,
      carriedCount: 0,
      equippedCount: 0,
      sources: new Set(),
    };
    existing.carriedCount += Math.max(0, Math.trunc(Number(count) || 0));
    if (equipped) {
      existing.equippedCount += Math.max(0, Math.trunc(Number(count) || 0));
    }
    if (source) {
      existing.sources.add(String(source).trim());
    }
    choicesByKey.set(key, existing);
  };

  const equippedAmmo = snapshot?.inventory?.ammo || null;
  const equippedAmmoItem = equippedAmmo?.item || equippedAmmo;
  if (isDetectedAmmoItem(equippedAmmoItem, equippedAmmo?.slotLabel || getAmmoSlotLabel(snapshot), { rejectCoins })) {
    addChoice(
      equippedAmmoItem?.name || equippedAmmo?.name,
      equippedAmmo?.count ?? equippedAmmoItem?.count,
      getAmmoSlotLabel(snapshot),
      { equipped: true },
    );
  }

  const containers = Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [];
  for (const container of containers) {
    const containerName = String(container?.name || "Container").trim() || "Container";
    for (const slot of Array.isArray(container?.slots) ? container.slots : []) {
      const item = slot?.item || null;
      if (!item) {
        continue;
      }

      const label = [
        item?.name,
        item?.slotType,
        slot?.label,
      ].filter(Boolean).join(" ");
      if (!isDetectedAmmoItem(item, label, { rejectCoins })) {
        continue;
      }

      addChoice(item?.name, item?.count, containerName);
    }
  }

  return [...choicesByKey.values()]
    .map((choice) => ({
      ...choice,
      sources: [...choice.sources],
    }))
    .sort((left, right) => right.equippedCount - left.equippedCount
      || right.carriedCount - left.carriedCount
      || left.label.localeCompare(right.label));
}

function getAmmoEffectiveConfig(modulesState = ensureModulesDraft(), sourceState = state) {
  const detected = getDetectedVocationInfo(sourceState);
  const fallbackVocation = String(sourceState?.options?.vocation || "").trim().toLowerCase();
  const vocation = detected.vocation || fallbackVocation;
  const defaults = getAmmoDefaultConfig(vocation);
  const preferred = normalizeTextListSummary(modulesState?.ammoPreferredNames);
  const minimumCount = Math.max(
    0,
    Math.trunc(Number(modulesState?.ammoMinimumCount) || 0),
  ) || defaults.minimumCount;
  const warningCount = Math.max(
    minimumCount,
    Math.trunc(Number(modulesState?.ammoWarningCount) || 0),
  ) || Math.max(minimumCount, defaults.warningCount);
  const enabled = modulesState?.ammoEnabled !== false
    && (defaults.enabled || preferred.length > 0 || minimumCount > 0 || warningCount > 0);

  return {
    vocation,
    defaults,
    preferred,
    minimumCount,
    warningCount,
    enabled,
    reloadEnabled: enabled && modulesState?.ammoReloadEnabled !== false,
    restockEnabled: enabled && modulesState?.ammoRestockEnabled !== false,
    reloadAtOrBelow: Math.max(0, Math.trunc(Number(modulesState?.ammoReloadAtOrBelow) || 0)) || 25,
    reloadCooldownMs: Math.max(0, Math.trunc(Number(modulesState?.ammoReloadCooldownMs) || 0)) || 900,
    requireNoTargets: modulesState?.ammoRequireNoTargets === true,
    requireStationary: modulesState?.ammoRequireStationary === true,
    sourceLabel: detected.vocation
      ? `${formatVocationLabel(detected.vocation)} via ${detected.source || "live data"}`
      : (fallbackVocation ? `Route fallback ${formatVocationLabel(fallbackVocation)}` : "No live vocation detected yet"),
  };
}

function buildAmmoSummary(modulesState = ensureModulesDraft(), sourceState = state) {
  const config = getAmmoEffectiveConfig(modulesState, sourceState);
  const liveChoices = buildAmmoLiveChoices(sourceState?.snapshot, {
    rejectCoins: config.enabled,
  });
  const slotLabel = getAmmoSlotLabel(sourceState?.snapshot);
  const equippedAmmo = sourceState?.snapshot?.inventory?.ammo || null;
  const equippedAmmoItem = equippedAmmo?.item || equippedAmmo;
  const equippedCount = isDetectedAmmoItem(equippedAmmoItem, equippedAmmo?.slotLabel || slotLabel, {
    rejectCoins: config.enabled,
  })
    ? Math.max(0, Math.trunc(Number(equippedAmmo?.count ?? equippedAmmoItem?.count) || 0))
    : 0;
  const carriedCount = liveChoices.reduce(
    (sum, choice) => sum + Math.max(0, Math.trunc(Number(choice?.carriedCount) || 0)),
    0,
  );
  const defaultPreferred = Array.isArray(config.defaults?.preferredNames)
    ? [...config.defaults.preferredNames]
    : [];
  const preferred = config.preferred.length ? config.preferred : defaultPreferred;
  const preferredKeys = new Set(preferred.map((entry) => entry.toLowerCase()));
  const choiceByKey = new Map(liveChoices.map((choice) => [choice.key, choice]));

  for (const fallbackName of [...preferred, ...AMMO_FALLBACK_CHOICES]) {
    const label = String(fallbackName || "").trim();
    const key = label.toLowerCase();
    if (!label || choiceByKey.has(key)) {
      continue;
    }
    choiceByKey.set(key, {
      key,
      label,
      carriedCount: 0,
      equippedCount: 0,
      sources: [],
    });
  }

  const choices = [...choiceByKey.values()]
    .sort((left, right) => right.equippedCount - left.equippedCount
      || right.carriedCount - left.carriedCount
      || Number(preferredKeys.has(right.key)) - Number(preferredKeys.has(left.key))
      || left.label.localeCompare(right.label));
  const preferredValue = preferred.length
    ? preferred.join(" -> ")
    : "Any detected ammo";
  const liveValue = carriedCount > 0
    ? `${carriedCount} carried`
    : "No carried ammo";

  return {
    ...config,
    choices,
    preferred,
    preferredValue,
    equippedName: equippedCount > 0 ? String(equippedAmmoItem?.name || equippedAmmo?.name || "").trim() : "",
    equippedCount,
    carriedCount,
    slotLabel,
    headline: !config.enabled
      ? "Ammo paused"
      : equippedCount > 0
        ? `${String(equippedAmmo?.name || "Ammo").trim()} in ${slotLabel}`
        : (carriedCount > 0 ? "Ammo waiting in bags" : "Quiver dry"),
    detail: !config.enabled
      ? (defaultPreferred.length
        ? `Defaults ready for ${formatVocationLabel(config.vocation || "paladin")}. Enable the module or edit the queue below.`
        : "Set ammo names or thresholds to arm this module.")
      : (equippedCount > 0
        ? `${slotLabel} has ${equippedCount}. Total carried: ${carriedCount}.`
        : `No ammo equipped. Total carried: ${carriedCount}.`),
    modeValue: config.reloadEnabled ? "Reloading" : "Watch only",
    modeDetail: config.reloadEnabled
      ? `${slotLabel} reloads at ${config.reloadAtOrBelow} or lower`
      : "Quiver moves are disabled",
    reserveValue: String(config.warningCount || 0),
    reserveDetail: config.restockEnabled
      ? `Shop target / floor ${config.minimumCount}`
      : `Shop restock off / floor ${config.minimumCount}`,
    sourceValue: liveValue,
    sourceDetail: equippedCount > 0
      ? `${equippedCount} equipped in ${slotLabel}`
      : "Bag-only ammo reserve",
    cadenceValue: formatDurationMs(config.reloadCooldownMs),
    cadenceDetail: [
      config.requireNoTargets ? "no target" : "target allowed",
      config.requireStationary ? "idle only" : "movement allowed",
    ].join(" / "),
  };
}

function getAmmoRestockHandoffText(options = state?.options || {}, sourceState = state) {
  const summary = buildAmmoSummary(options, sourceState);
  return options?.refillEnabled && summary.restockEnabled
    ? "ammo owns restock"
    : "";
}

function getRendererFocusTarget(sourceState = state) {
  const snapshot = sourceState?.snapshot || null;
  const currentTarget = snapshot?.currentTarget || null;
  if (currentTarget?.name) {
    return currentTarget;
  }

  const visibleEntries = Array.isArray(snapshot?.visibleCreatures) && snapshot.visibleCreatures.length
    ? snapshot.visibleCreatures
    : (Array.isArray(snapshot?.candidates) ? snapshot.candidates : []);

  return visibleEntries.find((entry) => String(entry?.name || "").trim()) || null;
}

function getRendererTargetProfile(name = "", options = state?.options || {}) {
  const requestedKey = String(name || "").trim().toLowerCase();
  if (!requestedKey) {
    return null;
  }

  return normalizeTargetProfiles(options?.targetProfiles || [])
    .find((profile) => profile.name.toLowerCase() === requestedKey)
    || null;
}

function hasSavedTrainerSetup(options = state?.options || {}) {
  return Boolean(options?.trainerConfigured || String(options?.trainerPartnerName || "").trim());
}

function getFollowTrainRuntimeContext(sourceState = state, options = sourceState?.options || state?.options || {}) {
  const session = getBoundInstance(sourceState);
  const liveStatus = session?.followTrainStatus || null;
  let followTrainStatus = liveStatus;

  if (!Number.isInteger(followTrainStatus?.selfIndex) && options?.partyFollowEnabled) {
    const members = normalizeTextListSummary(options?.partyFollowMembers);
    const currentNameKeys = getCurrentSessionNameKeys(sourceState);
    const selfIndex = members.findIndex((name) => currentNameKeys.has(String(name || "").trim().toLowerCase()));
    if (selfIndex >= 0) {
      const role = selfIndex > 0
        ? getFollowTrainMemberRole(options, members[selfIndex])
        : normalizeFollowTrainRoleValue(options?.partyFollowCombatMode);
      followTrainStatus = {
        ...(liveStatus || {}),
        active: selfIndex > 0,
        selfIndex,
        leaderName: selfIndex > 0 ? members[selfIndex - 1] || "" : "",
        role,
      };
    }
  }

  const roleConfig = getFollowTrainRoleConfig(
    followTrainStatus?.role,
    options?.partyFollowCombatMode,
  );

  return {
    session,
    followTrainStatus,
    routeResetActive: Boolean(session?.routeResetActive ?? sourceState?.routeResetActive),
    follower: Boolean(followTrainStatus?.active),
    passiveFollower: Boolean(
      followTrainStatus?.active
      && roleConfig?.behavior === "follow-only",
    ),
    roleConfig,
  };
}

function getDistanceKeeperOwnerState(options = state?.options || {}, sourceState = state) {
  const focusTarget = getRendererFocusTarget(sourceState);
  const profile = getRendererTargetProfile(focusTarget?.name, options);
  const hasProfileOwner = Boolean(
    focusTarget
    && profile?.enabled
    && (
      Number(profile.keepDistanceMin) > 0
      || Number(profile.keepDistanceMax) > 1
      || String(profile.behavior || "").trim().toLowerCase() === "escape"
      || profile.avoidBeam
      || profile.avoidWave
    ),
  );

  if (hasProfileOwner) {
    return {
      state: "hidden-owner",
      label: "Target Profile",
      shortLabel: "Profile",
      detail: `${profile.name} target profile owns spacing`,
      effectiveEnabled: true,
      owner: "targetProfile",
    };
  }

  const chaseMode = String(options?.chaseMode || "auto").trim().toLowerCase();
  if (!focusTarget || chaseMode !== "auto") {
    return null;
  }

  const followContext = getFollowTrainRuntimeContext(sourceState, options);
  const detected = getDetectedVocationInfo(sourceState);
  const fallbackVocation = String(options?.vocation || "").trim().toLowerCase();
  const vocation = detected.vocation || fallbackVocation;
  const autoRanged = followContext.follower
    ? (vocation ? vocation !== "knight" : followContext.passiveFollower)
    : ["paladin", "sorcerer", "druid"].includes(vocation);

  if (!autoRanged) {
    return null;
  }

  const vocationLabel = vocation ? formatVocationLabel(vocation) : "ranged";
  return {
    state: "hidden-owner",
    label: "Auto Ranged",
    shortLabel: "Ranged",
    detail: `Auto-ranged fallback owns spacing for ${vocationLabel}`,
    effectiveEnabled: true,
    owner: "autoRangedDistanceKeeper",
  };
}

function getModuleEffectiveState(moduleKey, options = state?.options || {}, sourceState = state) {
  const rawEnabledKey = {
    autowalk: "autowalkEnabled",
    ammo: "ammoEnabled",
    healer: "healerEnabled",
    deathHeal: "deathHealEnabled",
    autoEat: "autoEatEnabled",
    trainer: "trainerEnabled",
    reconnect: "reconnectEnabled",
    antiIdle: "antiIdleEnabled",
    distanceKeeper: "distanceKeeperEnabled",
    alarms: "alarmsEnabled",
    partyFollow: "partyFollowEnabled",
  }[moduleKey];
  const rawEnabled = rawEnabledKey ? Boolean(options?.[rawEnabledKey]) : false;
  const baseState = {
    rawEnabled,
    effectiveEnabled: rawEnabled,
    state: rawEnabled ? "on" : "off",
    label: rawEnabled ? "On" : "Off",
    shortLabel: rawEnabled ? "On" : "Off",
    detail: rawEnabled ? "Module active" : "Module off",
  };

  switch (moduleKey) {
    case "partyFollow": {
      const effectiveState = getPartyFollowEffectiveState(options, sourceState);
      return {
        ...baseState,
        ...effectiveState,
        shortLabel: String(effectiveState?.shortLabel || effectiveState?.label || "Off").trim() || "Off",
      };
    }
    case "trainer": {
      if (options?.partyFollowEnabled && (rawEnabled || hasSavedTrainerSetup(options))) {
        const partnerName = getResolvedTrainerPartnerName(options, sourceState);
        return {
          ...baseState,
          effectiveEnabled: false,
          state: "blocked",
          label: "Follow",
          shortLabel: "Follow",
          detail: partnerName
            ? `Follow Chain owns movement. Trainer partner ${partnerName} stays saved.`
            : "Follow Chain owns movement. Trainer settings stay saved.",
        };
      }
      return {
        ...baseState,
        detail: rawEnabled
          ? "Trainer owns reconnect, food cadence, healing, and partner regrouping"
          : "Trainer safeguards are off",
      };
    }
    case "autowalk": {
      const followContext = getFollowTrainRuntimeContext(sourceState, options);
      const cavebotPaused = Boolean(followContext.session?.cavebotPaused ?? options?.cavebotPaused);
      if (rawEnabled && !followContext.routeResetActive && followContext.follower) {
        return {
          ...baseState,
          effectiveEnabled: false,
          state: "blocked",
          label: "Follow",
          shortLabel: "Follow",
          detail: "Follow Chain owns movement for this follower",
        };
      }
      if (rawEnabled && !followContext.routeResetActive && cavebotPaused) {
        return {
          ...baseState,
          effectiveEnabled: false,
          state: "blocked",
          label: "Pause",
          shortLabel: "Pause",
          detail: "Cavebot pause blocks route movement",
        };
      }
      return {
        ...baseState,
        detail: rawEnabled ? "Route movement armed" : "Route movement off",
      };
    }
    case "reconnect": {
      const runtime = getReconnectRuntimeStatus(options, sourceState);
      if (runtime.trainerOnly) {
        return {
          ...baseState,
          effectiveEnabled: true,
          state: "inherited",
          label: "Trainer",
          shortLabel: "Trainer",
          detail: "Trainer owns disconnect recovery",
        };
      }
      return {
        ...baseState,
        effectiveEnabled: runtime.enabled,
        state: rawEnabled ? "on" : "off",
        label: rawEnabled ? "On" : "Off",
        shortLabel: rawEnabled ? "On" : "Off",
        detail: runtime.detail,
      };
    }
    case "autoEat":
      if (!rawEnabled && options?.trainerEnabled) {
        return {
          ...baseState,
          effectiveEnabled: true,
          state: "inherited",
          label: "Trainer",
          shortLabel: "Trainer",
          detail: "Trainer owns food cadence",
        };
      }
      return {
        ...baseState,
        detail: rawEnabled ? "Food cadence armed" : "Food cadence off",
      };
    case "ammo": {
      const summary = buildAmmoSummary(options, sourceState);
      return {
        ...baseState,
        rawEnabled,
        effectiveEnabled: summary.enabled,
        state: summary.enabled ? "on" : "off",
        label: summary.enabled ? "On" : "Off",
        shortLabel: summary.enabled ? "On" : "Off",
        detail: summary.enabled
          ? (options?.refillEnabled && summary.restockEnabled
            ? "Ammo owns ammo restock while refill handles the rest of the shop loop"
            : "Ammo reload and reserve monitoring are armed")
          : "Ammo handling is off",
      };
    }
    case "antiIdle":
      if (!rawEnabled && options?.trainerEnabled) {
        return {
          ...baseState,
          effectiveEnabled: true,
          state: "inherited",
          label: "Trainer",
          shortLabel: "Trainer",
          detail: "Trainer owns anti-idle keepalive",
        };
      }
      return {
        ...baseState,
        detail: rawEnabled ? "Idle keepalive armed" : "Idle keepalive off",
      };
    case "alarms":
      return {
        ...baseState,
        detail: rawEnabled ? "Player proximity alarms armed" : "Player proximity alarms off",
      };
    case "healer":
      {
        const autoRuneEnabled = rawEnabled && getHealerAutoRuneConfig(options).enabled;
        const anyHealerFamilyEnabled = Boolean(
          rawEnabled
          || autoRuneEnabled
          || options?.potionHealerEnabled
          || options?.conditionHealerEnabled,
        );
        if (!anyHealerFamilyEnabled && options?.trainerEnabled) {
          return {
            ...baseState,
            effectiveEnabled: true,
            state: "inherited",
            label: "Trainer",
            shortLabel: "Trainer",
            detail: "Trainer owns regular healing",
          };
        }
        return {
          ...baseState,
          rawEnabled: anyHealerFamilyEnabled,
          effectiveEnabled: anyHealerFamilyEnabled,
          state: anyHealerFamilyEnabled ? "on" : "off",
          label: anyHealerFamilyEnabled ? "On" : "Off",
          shortLabel: anyHealerFamilyEnabled ? "On" : "Off",
          detail: anyHealerFamilyEnabled
            ? "Spell, rune, potion, or condition healing armed"
            : "Regular healing off",
        };
      }
    case "deathHeal":
      if (!rawEnabled && options?.trainerEnabled) {
        return {
          ...baseState,
          effectiveEnabled: true,
          state: "inherited",
          label: "Trainer",
          shortLabel: "Trainer",
          detail: "Trainer owns emergency self-healing",
        };
      }
      return {
        ...baseState,
        detail: rawEnabled ? "Emergency self-heal armed" : "Emergency self-heal off",
      };
    case "distanceKeeper": {
      const ownerState = getDistanceKeeperOwnerState(options, sourceState);
      if (ownerState) {
        return {
          ...baseState,
          ...ownerState,
          rawEnabled,
        };
      }
      return {
        ...baseState,
        detail: rawEnabled ? "Standalone distance rules armed" : "Standalone distance rules off",
      };
    }
    default:
      return baseState;
  }
}

function getAutowalkEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("autowalk", options, sourceState);
}

function getHealerEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("healer", options, sourceState);
}

function getDeathHealEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("deathHeal", options, sourceState);
}

function getAutoEatEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("autoEat", options, sourceState);
}

function getTrainerEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("trainer", options, sourceState);
}

function getReconnectEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("reconnect", options, sourceState);
}

function getAntiIdleEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("antiIdle", options, sourceState);
}

function getDistanceKeeperEffectiveState(options = state?.options || {}, sourceState = state) {
  return getModuleEffectiveState("distanceKeeper", options, sourceState);
}

function getTargetingEffectiveState(options = state?.options || {}, sourceState = state) {
  const session = getBoundInstance(sourceState);
  const aggroHoldActive = Boolean(session?.stopAggroHold ?? options?.stopAggroHold);
  const followContext = getFollowTrainRuntimeContext(sourceState, options);
  const cavebotPaused = Boolean(session?.cavebotPaused ?? options?.cavebotPaused);

  if (aggroHoldActive) {
    return {
      rawEnabled: true,
      effectiveEnabled: false,
      state: "blocked",
      label: "Held",
      detail: "Aggro hold blocks combat targeting",
    };
  }

  if (followContext.passiveFollower) {
    return {
      rawEnabled: true,
      effectiveEnabled: false,
      state: "blocked",
      label: "Passive",
      detail: "Passive follow suppresses combat targeting",
    };
  }

  if (cavebotPaused && !followContext.routeResetActive) {
    return {
      rawEnabled: true,
      effectiveEnabled: false,
      state: "blocked",
      label: "Pause",
      detail: "Cavebot pause blocks combat targeting",
    };
  }

  return {
    rawEnabled: true,
    effectiveEnabled: true,
    state: "on",
    label: "On",
    detail: "Combat targeting armed",
  };
}

function getPartyFollowEffectiveState(options = state?.options || {}, sourceState = state) {
  const followContext = getFollowTrainRuntimeContext(sourceState, options);
  const enabled = Boolean(options?.partyFollowEnabled);
  const shortLabel = !enabled
    ? "Off"
    : followContext.passiveFollower
      ? "Passive"
      : followContext.follower
        ? "Follow"
        : Number.isInteger(followContext.followTrainStatus?.selfIndex) && followContext.followTrainStatus.selfIndex === 0
          ? "Pilot"
          : "On";
  return {
    rawEnabled: enabled,
    effectiveEnabled: enabled,
    state: enabled ? "on" : "off",
    label: enabled
      ? formatFollowTrainHeadline(options?.partyFollowMembers)
      : "Off",
    shortLabel,
    detail: enabled
      ? `${formatFollowTrainDetail(options?.partyFollowMembers, options?.partyFollowDistance)}${followContext.passiveFollower ? " / Passive follow suppresses combat" : ""}`
      : "No follow chain active",
  };
}

function formatEffectiveModuleStatusLine(effectiveState = null, rules = [], {
  settingsOnly = false,
  plainWhenEmpty = false,
} = {}) {
  const label = String(effectiveState?.label || "Off").trim() || "Off";
  const totalRules = Array.isArray(rules) ? rules.length : 0;
  if (!totalRules) {
    if (settingsOnly) {
      return `${label} - settings only`;
    }
    return plainWhenEmpty ? label : `${label} - no rules`;
  }

  return `${label} - ${formatRuleLabel(getActiveRules(rules).length, "active", "active")} - ${formatRuleLabel(totalRules, "total", "total")}`;
}

function setEffectiveModuleTileState(key, effectiveState = null) {
  const nextState = effectiveState || getModuleEffectiveState(key);
  [quickButtons[key], compactQuickButtons[key]].forEach((button) => {
    setDetailedTileState(button, {
      active: Boolean(nextState?.effectiveEnabled),
      pressed: Boolean(nextState?.rawEnabled),
      label: String(nextState?.shortLabel || nextState?.label || (nextState?.effectiveEnabled ? "On" : "Off")),
      state: String(nextState?.state || (nextState?.effectiveEnabled ? "on" : "off")),
      title: nextState?.detail || "",
    });
  });
}

function renderAmmoActiveTokens(entries = [], {
  emptyLabel = "No preferred ammo selected",
} = {}) {
  const normalized = normalizeTextListSummary(entries);
  if (!normalized.length) {
    return `<span class="looting-chip looting-chip-empty">${escapeHtml(emptyLabel)}</span>`;
  }

  return normalized
    .map((entry) => `
      <button
        type="button"
        class="looting-chip looting-chip-token tone-safe"
        data-ammo-remove-token="${escapeAttributeValue(entry)}"
        aria-label="Remove ${escapeHtml(entry)}"
      >
        <span>${escapeHtml(entry)}</span>
        <span class="looting-chip-dismiss" aria-hidden="true">x</span>
      </button>
    `)
    .join("");
}

function renderAmmoSourceCards(choices = [], preferred = []) {
  const preferredKeys = new Set(normalizeTextListSummary(preferred).map((entry) => entry.toLowerCase()));
  if (!choices.length) {
    return '<div class="empty-state">No live ammo detected yet. Open the backpack or keep arrows, bolts, or power bolts visible in a bag.</div>';
  }

  return choices
    .map((choice) => {
      const preferredNow = preferredKeys.has(choice.key);
      const sourceMeta = choice.sources.length
        ? choice.sources.join(" / ")
        : (choice.carriedCount > 0 ? "Detected carry source" : "Preset choice");
      return `
        <article class="autoeat-source-card" data-state="${preferredNow ? "priority" : (choice.carriedCount > 0 ? "available" : "blocked")}">
          <div class="autoeat-source-head">
            <strong>${escapeHtml(choice.label)}</strong>
            <span class="autoeat-source-count">x${escapeHtml(String(Math.max(0, choice.carriedCount || 0)))}</span>
          </div>
          <div class="autoeat-source-meta">${escapeHtml(sourceMeta)}</div>
          <div class="autoeat-source-actions">
            <button
              type="button"
              class="btn mini ${preferredNow ? "active" : ""}"
              data-ammo-add-token="${escapeAttributeValue(choice.label)}"
              aria-pressed="${preferredNow ? "true" : "false"}"
            >Prefer</button>
            ${preferredNow
          ? `
              <button
                type="button"
                class="btn mini danger"
                data-ammo-remove-token="${escapeAttributeValue(choice.label)}"
              >Drop</button>
            `
          : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function updateAmmoPreferredToken(token, action = "add") {
  const normalizedToken = String(token || "").trim();
  const fieldKey = "ammoPreferredNames";
  const input = getModuleOptionInput("ammo", fieldKey);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    return;
  }

  if (action === "clear") {
    setModuleOptionInputValue("ammo", fieldKey, "", { focus: true });
    return;
  }

  if (!normalizedToken) {
    return;
  }

  const currentEntries = normalizeTextListSummary(input.value);
  const tokenKey = normalizedToken.toLowerCase();
  const nextEntries = action === "remove"
    ? currentEntries.filter((entry) => entry.toLowerCase() !== tokenKey)
    : (currentEntries.some((entry) => entry.toLowerCase() === tokenKey)
      ? currentEntries
      : [...currentEntries, normalizedToken]);

  setModuleOptionInputValue("ammo", fieldKey, nextEntries.join("\n"), {
    focus: action !== "remove",
  });
}

function renderAmmoFields(modulesState = ensureModulesDraft()) {
  const preferredField = getModuleOptionFieldSpec("ammo", "ammoPreferredNames");
  const minimumField = getModuleOptionFieldSpec("ammo", "ammoMinimumCount");
  const warningField = getModuleOptionFieldSpec("ammo", "ammoWarningCount");
  const reloadAtField = getModuleOptionFieldSpec("ammo", "ammoReloadAtOrBelow");
  const cooldownField = getModuleOptionFieldSpec("ammo", "ammoReloadCooldownMs");
  const reloadField = getModuleOptionFieldSpec("ammo", "ammoReloadEnabled");
  const restockField = getModuleOptionFieldSpec("ammo", "ammoRestockEnabled");
  const targetField = getModuleOptionFieldSpec("ammo", "ammoRequireNoTargets");
  const idleField = getModuleOptionFieldSpec("ammo", "ammoRequireStationary");
  const summary = buildAmmoSummary(modulesState);
  const preferredValue = normalizeTextListSummary(modulesState?.ammoPreferredNames).join("\n");

  return `
    <div class="autoeat-shell ammo-shell">
      <input type="hidden" value="${escapeHtml(preferredValue)}" data-module-key="ammo" data-module-option-field="ammoPreferredNames" />

      <section class="autoeat-overview">
        <div class="autoeat-overview-copy">
          <span class="autoeat-overview-kicker">${summary.enabled ? "Enabled" : "Paused"}</span>
          <h3 class="autoeat-overview-title">${escapeHtml(summary.headline)}</h3>
          <p class="autoeat-overview-detail">${escapeHtml(summary.detail)}</p>
        </div>
        <div class="autoeat-overview-stats">
          <article class="autoeat-stat-card tone-safe">
            <span>Mode</span>
            <strong>${escapeHtml(summary.modeValue)}</strong>
            <small>${escapeHtml(summary.modeDetail)}</small>
          </article>
          <article class="autoeat-stat-card tone-danger">
            <span>Reserve</span>
            <strong>${escapeHtml(summary.reserveValue)}</strong>
            <small>${escapeHtml(summary.reserveDetail)}</small>
          </article>
          <article class="autoeat-stat-card tone-route">
            <span>Carry</span>
            <strong>${escapeHtml(summary.sourceValue)}</strong>
            <small>${escapeHtml(summary.sourceDetail)}</small>
          </article>
          <article class="autoeat-stat-card tone-neutral">
            <span>Cooldown</span>
            <strong>${escapeHtml(summary.cadenceValue)}</strong>
            <small>${escapeHtml(summary.cadenceDetail)}</small>
          </article>
        </div>
      </section>

      <section class="autoeat-source-bank">
        <div class="autoeat-section-head">
          <div>
            <div class="autoeat-section-kicker">Detected Ammo</div>
            <div class="autoeat-section-title">Quiver + Bags</div>
          </div>
          <span class="autoeat-section-meta">${escapeHtml(summary.sourceValue)}</span>
        </div>
        <div class="field-note">Vocation source: ${escapeHtml(summary.sourceLabel)}. Current slot: ${escapeHtml(summary.slotLabel)}.</div>
        <div class="autoeat-source-grid">
          ${renderAmmoSourceCards(summary.choices, summary.preferred)}
        </div>
      </section>

      <div class="autoeat-columns">
        <section class="autoeat-column autoeat-column-priority">
          <div class="autoeat-section-head">
            <div>
              <div class="autoeat-section-kicker">Priority Queue</div>
              <div class="autoeat-section-title">Preferred Ammo</div>
            </div>
            <button type="button" class="btn mini" data-ammo-clear-preferred="true">Clear</button>
          </div>
          <p class="autoeat-column-copy">${escapeHtml(preferredField?.help || "")}</p>
          <div class="looting-token-strip autoeat-token-strip">
            ${renderAmmoActiveTokens(summary.preferred, {
    emptyLabel: "Blank means current quiver ammo wins first, with vocation defaults as fallback.",
  })}
          </div>
        </section>

        <section class="autoeat-column autoeat-column-blocked">
          <div class="autoeat-section-head">
            <div>
              <div class="autoeat-section-kicker">Runtime</div>
              <div class="autoeat-section-title">Current Policy</div>
            </div>
          </div>
          <p class="autoeat-column-copy">Preferred queue: ${escapeHtml(summary.preferredValue)}.</p>
          <div class="field-note">Reloads the detected ${escapeHtml(summary.slotLabel)} when the stack falls to ${escapeHtml(String(summary.reloadAtOrBelow))} or lower. Shop restock target: ${escapeHtml(String(summary.warningCount))}. Minimum reserve floor: ${escapeHtml(String(summary.minimumCount))}.</div>
        </section>
      </div>

      <section class="autoeat-controls">
        ${minimumField ? renderModuleOptionField("ammo", minimumField, modulesState?.ammoMinimumCount) : ""}
        ${warningField ? renderModuleOptionField("ammo", warningField, modulesState?.ammoWarningCount) : ""}
        ${reloadAtField ? renderModuleOptionField("ammo", reloadAtField, modulesState?.ammoReloadAtOrBelow) : ""}
        ${cooldownField ? renderModuleOptionField("ammo", cooldownField, modulesState?.ammoReloadCooldownMs) : ""}
        ${reloadField ? renderModuleOptionField("ammo", reloadField, modulesState?.ammoReloadEnabled) : ""}
        ${restockField ? renderModuleOptionField("ammo", restockField, modulesState?.ammoRestockEnabled) : ""}
        ${targetField ? renderModuleOptionField("ammo", targetField, modulesState?.ammoRequireNoTargets) : ""}
        ${idleField ? renderModuleOptionField("ammo", idleField, modulesState?.ammoRequireStationary) : ""}
      </section>
    </div>
  `;
}

function summarizeLootingEntries(entries = [], {
  empty = "None",
  maxEntries = 2,
} = {}) {
  const normalized = normalizeTextListSummary(entries);
  if (!normalized.length) {
    return empty;
  }
  if (normalized.length <= maxEntries) {
    return normalized.join(", ");
  }
  return `${normalized.slice(0, maxEntries).join(", ")} +${normalized.length - maxEntries}`;
}

function buildLootingSummary(modulesState = ensureModulesDraft()) {
  const whitelist = normalizeTextListSummary(modulesState?.lootWhitelist);
  const blacklist = normalizeTextListSummary(modulesState?.lootBlacklist);
  const preferredContainers = normalizeTextListSummary(modulesState?.lootPreferredContainers);
  const enabled = Boolean(modulesState?.lootingEnabled);

  return {
    enabled,
    whitelist,
    blacklist,
    preferredContainers,
    headline: !enabled
      ? "Looting paused"
      : whitelist.length
        ? "Strict corpse pickup is active"
        : "Wildcard corpse pickup is active",
    detail: !enabled
      ? "Filters stay saved, but corpse items will not move until the module is turned back on."
      : whitelist.length
        ? "Only items matching the keep list can leave the corpse. Skip filters still block matches before routing."
        : "Every corpse item is eligible unless the skip list blocks it before routing.",
    modeLabel: whitelist.length ? "Keep List Only" : "Loot All Except Skip",
    modeDetail: whitelist.length
      ? `${formatRuleLabel(whitelist.length, "keep filter")} define what may leave the corpse.`
      : "Blank keep list means every non-blocked item is eligible.",
    statusValue: enabled ? "Live" : "Paused",
    statusDetail: enabled
      ? "Corpse routing can move items now."
      : "Settings saved, module power is off.",
    keepValue: whitelist.length ? formatRuleLabel(whitelist.length, "filter") : "Wildcard",
    keepDetail: whitelist.length
      ? summarizeLootingEntries(whitelist, { empty: "No keep filters" })
      : "Empty keep list loots everything",
    skipValue: blacklist.length ? formatRuleLabel(blacklist.length, "filter") : "Clear",
    skipDetail: blacklist.length
      ? summarizeLootingEntries(blacklist, { empty: "Nothing blocked" })
      : "Nothing is blocked right now",
    routeValue: preferredContainers.length
      ? formatTextListSummary(preferredContainers, { separator: " -> " })
      : "Backpack",
    routeDetail: preferredContainers.length
      ? "Matching open containers are tried from left to right."
      : "Blank route falls back to the default Backpack target.",
  };
}

function renderLootingShortcutButtons(fieldKey, shortcuts = []) {
  return shortcuts
    .map((shortcut) => `
      <button
        type="button"
        class="looting-chip looting-chip-action"
        data-looting-field="${escapeAttributeValue(fieldKey)}"
        data-looting-add-token="${escapeAttributeValue(shortcut.value)}"
      >${escapeHtml(shortcut.label)}</button>
    `)
    .join("");
}

function titleCaseLootLabel(value = "") {
  return String(value || "").replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeLootingLearnedName(value = "") {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]+$/g, "")
    .replace(/\s+\([^)]*\)\s*$/g, "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "";
  }
  if (/^gold coins?$/.test(normalized)) return "gold coin";
  if (/^platinum coins?$/.test(normalized)) return "platinum coin";
  if (/^crystal coins?$/.test(normalized)) return "crystal coin";
  if (normalized.endsWith("ies") && normalized.length > 3) {
    return `${normalized.slice(0, -3)}y`;
  }
  if (/(ches|shes|xes|zes|sses)$/.test(normalized)) {
    return normalized.replace(/es$/, "");
  }
  if (normalized.endsWith("s") && !/(ss|us|is)$/.test(normalized)) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function parseLootingLearnedMessageEntry(value = "") {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]+$/g, "")
    .replace(/\s+\([^)]*\)\s*$/g, "")
    .trim();
  if (!normalized || /^nothing(?:\b|$)/i.test(normalized)) {
    return null;
  }

  let count = 1;
  let itemName = normalized;
  const numericMatch = normalized.match(/^(\d+)\s+(.+)$/);
  if (numericMatch) {
    count = Math.max(1, Math.trunc(Number(numericMatch[1]) || 1));
    itemName = numericMatch[2];
  } else {
    const articleMatch = normalized.match(/^(?:an?|one|some)\s+(.+)$/i);
    if (articleMatch) {
      itemName = articleMatch[1];
    }
  }

  const canonicalName = normalizeLootingLearnedName(itemName);
  if (!canonicalName) {
    return null;
  }

  return {
    key: canonicalName,
    label: titleCaseLootLabel(canonicalName),
    count,
  };
}

function parseLootingLearnedMessageText(text = "") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const match = normalized.match(/^loot of\s+(.+?):\s*(.+)$/i);
  if (!match) {
    return [];
  }

  const body = String(match[2] || "").trim().replace(/[.;]+$/g, "");
  if (!body || /^nothing(?:\b|$)/i.test(body)) {
    return [];
  }

  return body
    .replace(/\s+\band\b\s+/gi, ", ")
    .split(/\s*,\s*/)
    .map((entry) => parseLootingLearnedMessageEntry(entry))
    .filter(Boolean);
}

function getLootingObservedMessages(snapshot = state?.snapshot) {
  const serverMessages = Array.isArray(snapshot?.serverMessages)
    ? snapshot.serverMessages.filter((message) => String(message?.text || "").trim())
    : [];
  if (serverMessages.length) {
    return serverMessages;
  }

  return Array.isArray(snapshot?.dialogue?.recentMessages)
    ? snapshot.dialogue.recentMessages.filter((message) => String(message?.text || "").trim())
    : [];
}

function isLootingCorpseContainer(name = "", preferredContainers = []) {
  const text = String(name || "").trim().toLowerCase();
  if (!text) {
    return false;
  }

  const normalizedPreferred = normalizeTextListSummary(preferredContainers)
    .map((entry) => entry.toLowerCase());
  if (normalizedPreferred.some((entry) => text.includes(entry))) {
    return false;
  }

  if (/\b(backpack|bag|satchel|pouch|quiver|locker|depot|chest|container)\b/.test(text)) {
    return false;
  }

  return /\b(dead|corpse|remains|slain|body|carcass|cadaver)\b/.test(text);
}

function getLootingLearnedChoices(snapshot = state?.snapshot, preferredContainers = []) {
  const registry = new Map();
  let priority = 10_000;

  const upsertChoice = (choice = {}) => {
    const key = String(choice.key || choice.value || "").trim().toLowerCase();
    const value = String(choice.value || choice.label || "").trim();
    if (!key || !value) {
      return;
    }

    const existing = registry.get(key);
    if (!existing) {
      registry.set(key, {
        key,
        value,
        label: value,
        count: Math.max(1, Math.trunc(Number(choice.count) || 1)),
        priority: Number.isFinite(Number(choice.priority)) ? Number(choice.priority) : 0,
        source: String(choice.source || "").trim(),
      });
      return;
    }

    existing.count = Math.max(existing.count, Math.max(1, Math.trunc(Number(choice.count) || 1)));
    existing.priority = Math.max(existing.priority, Number.isFinite(Number(choice.priority)) ? Number(choice.priority) : 0);
    if (!existing.source && choice.source) {
      existing.source = String(choice.source).trim();
    }
  };

  const containers = Array.isArray(snapshot?.inventory?.containers) ? snapshot.inventory.containers : [];
  containers.forEach((container) => {
    if (!isLootingCorpseContainer(container?.name, preferredContainers)) {
      return;
    }

    (container?.slots || []).forEach((entry) => {
      const itemName = String(entry?.item?.name || "").trim();
      if (!itemName) {
        return;
      }

      upsertChoice({
        key: itemName,
        value: itemName,
        count: Math.max(1, Math.trunc(Number(entry?.item?.count) || 1)),
        priority,
        source: "Open corpse",
      });
      priority -= 1;
    });
  });

  const messages = getLootingObservedMessages(snapshot);
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const parsedEntries = parseLootingLearnedMessageText(message?.text || "");
    parsedEntries.forEach((entry) => {
      upsertChoice({
        key: entry.key,
        value: entry.label,
        count: entry.count,
        priority,
        source: "Recent loot",
      });
      priority -= 1;
    });
  }

  return [...registry.values()]
    .sort((left, right) => (
      Number(right.priority || 0) - Number(left.priority || 0)
      || compareDisplayNames(left.label, right.label)
    ))
    .slice(0, 24);
}

function renderLootingLearnedChoiceButtons(choices = [], activeEntries = []) {
  const activeKeys = new Set(normalizeTextListSummary(activeEntries).map((entry) => entry.toLowerCase()));
  if (!choices.length) {
    return '<span class="looting-chip looting-chip-empty">Kill or open a corpse to learn drops here</span>';
  }

  return choices
    .map((choice) => {
      const selected = activeKeys.has(String(choice.value || "").trim().toLowerCase());
      const countLabel = Number(choice.count) > 1 ? `x${Math.trunc(Number(choice.count) || 1)}` : "";
      const sourceLabel = String(choice.source || "").trim();
      const title = sourceLabel
        ? `${choice.label} from ${sourceLabel.toLowerCase()}`
        : choice.label;

      return `
        <button
          type="button"
          class="looting-chip looting-chip-action looting-chip-learned ${selected ? "active" : ""}"
          data-looting-field="lootWhitelist"
          data-looting-add-token="${escapeAttributeValue(choice.value)}"
          aria-pressed="${selected ? "true" : "false"}"
          title="${escapeAttributeValue(title)}"
        >
          <span>${escapeHtml(choice.label)}</span>
          ${countLabel ? `<span class="looting-chip-badge">${escapeHtml(countLabel)}</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function renderLootingActiveTokens(fieldKey, entries = [], {
  emptyLabel = "No filters yet",
  tone = "neutral",
} = {}) {
  const normalized = normalizeTextListSummary(entries);
  if (!normalized.length) {
    return `<span class="looting-chip looting-chip-empty">${escapeHtml(emptyLabel)}</span>`;
  }

  const fieldLabel = MODULE_RULE_FIELD_LABELS[fieldKey] || fieldKey;
  return normalized
    .map((entry) => `
      <button
        type="button"
        class="looting-chip looting-chip-token tone-${escapeAttributeValue(tone)}"
        data-looting-field="${escapeAttributeValue(fieldKey)}"
        data-looting-remove-token="${escapeAttributeValue(entry)}"
        aria-label="Remove ${escapeHtml(entry)} from ${escapeHtml(fieldLabel)}"
      >
        <span>${escapeHtml(entry)}</span>
        <span class="looting-chip-dismiss" aria-hidden="true">x</span>
      </button>
    `)
    .join("");
}

function renderLootingRouteNodes(preferredContainers = []) {
  const containers = normalizeTextListSummary(preferredContainers);
  const nodes = containers.length ? containers : ["Backpack"];

  return nodes
    .map((entry, index) => `
      ${index ? '<span class="looting-route-arrow" aria-hidden="true">-&gt;</span>' : ""}
      <span class="looting-route-node">${escapeHtml(entry)}</span>
    `)
    .join("");
}

function renderLootingPreviewSteps(summary = buildLootingSummary()) {
  const steps = [
    {
      title: "Scan",
      detail: "Each open corpse container is checked item by item before any move is planned.",
    },
    {
      title: "Block",
      detail: summary.blacklist.length
        ? `${formatRuleLabel(summary.blacklist.length, "skip filter")} win first. Matching items stay in the corpse even if the keep list also matches.`
        : "No skip filters are active, so nothing is blocked at the deny stage.",
    },
    {
      title: summary.whitelist.length ? "Match" : "Wildcard",
      detail: summary.whitelist.length
        ? `Only items matching ${formatRuleLabel(summary.whitelist.length, "keep filter")} are eligible to move.`
        : "Keep list is blank, so every non-blocked item can be moved.",
    },
    {
      title: "Route",
      detail: summary.routeDetail,
    },
  ];

  return steps
    .map((step, index) => `
      <div class="looting-preview-step">
        <span class="looting-preview-step-index">${index + 1}</span>
        <div class="looting-preview-step-copy">
          <strong>${escapeHtml(step.title)}</strong>
          <span>${escapeHtml(step.detail)}</span>
        </div>
      </div>
    `)
    .join("");
}

function renderLootingFields(modulesState = ensureModulesDraft()) {
  const keepField = getModuleOptionFieldSpec("looting", "lootWhitelist");
  const skipField = getModuleOptionFieldSpec("looting", "lootBlacklist");
  const routeField = getModuleOptionFieldSpec("looting", "lootPreferredContainers");
  const summary = buildLootingSummary(modulesState);
  const learnedChoices = getLootingLearnedChoices(state?.snapshot, summary.preferredContainers);

  return `
    <div class="looting-shell">
      <section class="looting-overview">
        <div class="looting-overview-copy">
          <span class="looting-overview-kicker">${summary.enabled ? "Enabled" : "Paused"}</span>
          <h3 class="looting-overview-title" data-looting-summary="headline">${escapeHtml(summary.headline)}</h3>
          <p class="looting-overview-detail" data-looting-summary="detail">${escapeHtml(summary.detail)}</p>
        </div>
        <div class="looting-overview-stats">
          <article class="looting-stat-card tone-neutral">
            <span>Status</span>
            <strong data-looting-stat="status-value">${escapeHtml(summary.statusValue)}</strong>
            <small data-looting-stat="status-detail">${escapeHtml(summary.statusDetail)}</small>
          </article>
          <article class="looting-stat-card tone-safe">
            <span>Keep</span>
            <strong data-looting-stat="keep-value">${escapeHtml(summary.keepValue)}</strong>
            <small data-looting-stat="keep-detail">${escapeHtml(summary.keepDetail)}</small>
          </article>
          <article class="looting-stat-card tone-danger">
            <span>Skip</span>
            <strong data-looting-stat="skip-value">${escapeHtml(summary.skipValue)}</strong>
            <small data-looting-stat="skip-detail">${escapeHtml(summary.skipDetail)}</small>
          </article>
          <article class="looting-stat-card tone-route">
            <span>Route</span>
            <strong data-looting-stat="route-value">${escapeHtml(summary.routeValue)}</strong>
            <small data-looting-stat="route-detail">${escapeHtml(summary.routeDetail)}</small>
          </article>
        </div>
      </section>

      <div class="looting-layout">
        <div class="looting-column">
          <section class="looting-card looting-card-keep">
            <div class="looting-card-head">
              <div>
                <div class="looting-card-kicker">Pickup Filters</div>
                <div class="looting-card-title">Keep List</div>
              </div>
              <span class="looting-card-count" data-looting-count="lootWhitelist">${escapeHtml(summary.keepValue)}</span>
            </div>
            <p class="looting-card-copy">Leave blank to loot everything except blocked items.</p>
            <label class="module-rule-control looting-field">
              <span>${escapeHtml(keepField?.label || "Keep items")}</span>
              <textarea rows="${Math.max(2, Math.trunc(Number(keepField?.rows) || 3))}" data-module-key="looting" data-module-option-field="lootWhitelist" placeholder="${escapeHtml(keepField?.placeholder || "")}">${escapeHtml(formatFieldValueForInput(modulesState?.lootWhitelist, keepField || {}))}</textarea>
            </label>
            <div class="looting-shortcut-bar">
              <span class="looting-shortcut-label">Quick Add</span>
              <div class="looting-shortcut-row">
                ${renderLootingShortcutButtons("lootWhitelist", LOOTING_KEEP_SHORTCUTS)}
              </div>
            </div>
            <div class="looting-token-group">
              <div class="looting-token-group-head">
                <span class="looting-token-label">Learned Drops</span>
                <span class="looting-token-meta" data-looting-count="learnedDrops">${escapeHtml(String(learnedChoices.length))}</span>
              </div>
              <div class="looting-token-strip" data-looting-chip-strip="learnedDrops">
                ${renderLootingLearnedChoiceButtons(learnedChoices, summary.whitelist)}
              </div>
            </div>
            <div class="looting-token-group">
              <div class="looting-token-group-head">
                <span class="looting-token-label">Active Keep Filters</span>
                <button type="button" class="btn mini" data-looting-clear-field="lootWhitelist">Clear</button>
              </div>
              <div class="looting-token-strip" data-looting-chip-strip="lootWhitelist">
                ${renderLootingActiveTokens("lootWhitelist", summary.whitelist, {
    emptyLabel: "No keep filters yet",
    tone: "safe",
  })}
              </div>
            </div>
            <div class="field-note">Categories like potions, runes, food, and ammo follow runtime loot flags. Learned drops come from recent loot text and open corpses.</div>
          </section>

          <section class="looting-card looting-card-skip">
            <div class="looting-card-head">
              <div>
                <div class="looting-card-kicker">Deny Filters</div>
                <div class="looting-card-title">Skip List</div>
              </div>
              <span class="looting-card-count" data-looting-count="lootBlacklist">${escapeHtml(summary.skipValue)}</span>
            </div>
            <p class="looting-card-copy">Skip matches always win, even when the keep list also matches.</p>
            <label class="module-rule-control looting-field">
              <span>${escapeHtml(skipField?.label || "Skip items")}</span>
              <textarea rows="${Math.max(2, Math.trunc(Number(skipField?.rows) || 3))}" data-module-key="looting" data-module-option-field="lootBlacklist" placeholder="${escapeHtml(skipField?.placeholder || "")}">${escapeHtml(formatFieldValueForInput(modulesState?.lootBlacklist, skipField || {}))}</textarea>
            </label>
            <div class="looting-token-group">
              <div class="looting-token-group-head">
                <span class="looting-token-label">Blocked Matches</span>
                <button type="button" class="btn mini" data-looting-clear-field="lootBlacklist">Clear</button>
              </div>
              <div class="looting-token-strip" data-looting-chip-strip="lootBlacklist">
                ${renderLootingActiveTokens("lootBlacklist", summary.blacklist, {
    emptyLabel: "No blocked entries",
    tone: "danger",
  })}
              </div>
            </div>
            <div class="field-note">Use names, fragments, or categories. Split entries with commas, semicolons, or new lines.</div>
          </section>
        </div>

        <div class="looting-column">
          <section class="looting-card looting-card-route">
            <div class="looting-card-head">
              <div>
                <div class="looting-card-kicker">Container Routing</div>
                <div class="looting-card-title">Preferred Containers</div>
              </div>
              <span class="looting-card-count" data-looting-count="lootPreferredContainers">${escapeHtml(summary.routeValue)}</span>
            </div>
            <p class="looting-card-copy">Minibot tries matching open containers in order. Leave this blank to fall back to the default Backpack preference.</p>
            <label class="module-rule-control looting-field looting-field-route">
              <span>${escapeHtml(routeField?.label || "Preferred containers")}</span>
              <input type="text" value="${escapeHtml(formatFieldValueForInput(modulesState?.lootPreferredContainers, routeField || {}))}" placeholder="${escapeHtml(routeField?.placeholder || "")}" data-module-key="looting" data-module-option-field="lootPreferredContainers" />
            </label>
            <div class="looting-shortcut-bar">
              <span class="looting-shortcut-label">Routing Shortcuts</span>
              <div class="looting-shortcut-row">
                ${renderLootingShortcutButtons("lootPreferredContainers", LOOTING_ROUTE_SHORTCUTS)}
                <button type="button" class="looting-chip looting-chip-action looting-chip-secondary" data-looting-clear-field="lootPreferredContainers">Use Default Backpack</button>
              </div>
            </div>
            <div class="looting-route-line" data-looting-route-line>
              ${renderLootingRouteNodes(summary.preferredContainers)}
            </div>
            <div class="looting-token-group">
              <div class="looting-token-group-head">
                <span class="looting-token-label">Active Route Matches</span>
              </div>
              <div class="looting-token-strip" data-looting-chip-strip="lootPreferredContainers">
                ${renderLootingActiveTokens("lootPreferredContainers", summary.preferredContainers, {
    emptyLabel: "Default Backpack target",
    tone: "route",
  })}
              </div>
            </div>
          </section>

          <section class="looting-card looting-card-preview">
            <div class="looting-card-head">
              <div>
                <div class="looting-card-kicker">Runtime Preview</div>
                <div class="looting-card-title" data-looting-summary="mode-label">${escapeHtml(summary.modeLabel)}</div>
              </div>
            </div>
            <p class="looting-card-copy" data-looting-summary="mode-detail">${escapeHtml(summary.modeDetail)}</p>
            <div class="looting-preview-list" data-looting-preview-list>
              ${renderLootingPreviewSteps(summary)}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function syncLootingModuleView(modulesState = ensureModulesDraft()) {
  if (getActiveModuleKey() !== "looting" || !moduleExtraFields) {
    return;
  }

  const summary = buildLootingSummary(modulesState);
  const learnedChoices = getLootingLearnedChoices(state?.snapshot, summary.preferredContainers);
  const textValues = {
    '[data-looting-summary="headline"]': summary.headline,
    '[data-looting-summary="detail"]': summary.detail,
    '[data-looting-summary="mode-label"]': summary.modeLabel,
    '[data-looting-summary="mode-detail"]': summary.modeDetail,
    '[data-looting-stat="status-value"]': summary.statusValue,
    '[data-looting-stat="status-detail"]': summary.statusDetail,
    '[data-looting-stat="keep-value"]': summary.keepValue,
    '[data-looting-stat="keep-detail"]': summary.keepDetail,
    '[data-looting-stat="skip-value"]': summary.skipValue,
    '[data-looting-stat="skip-detail"]': summary.skipDetail,
    '[data-looting-stat="route-value"]': summary.routeValue,
    '[data-looting-stat="route-detail"]': summary.routeDetail,
    '[data-looting-count="lootWhitelist"]': summary.keepValue,
    '[data-looting-count="lootBlacklist"]': summary.skipValue,
    '[data-looting-count="lootPreferredContainers"]': summary.routeValue,
    '[data-looting-count="learnedDrops"]': String(learnedChoices.length),
  };

  Object.entries(textValues).forEach(([selector, value]) => {
    const element = moduleExtraFields.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  });

  const keepStrip = moduleExtraFields.querySelector('[data-looting-chip-strip="lootWhitelist"]');
  if (keepStrip) {
    keepStrip.innerHTML = renderLootingActiveTokens("lootWhitelist", summary.whitelist, {
      emptyLabel: "No keep filters yet",
      tone: "safe",
    });
  }

  const learnedStrip = moduleExtraFields.querySelector('[data-looting-chip-strip="learnedDrops"]');
  if (learnedStrip) {
    learnedStrip.innerHTML = renderLootingLearnedChoiceButtons(learnedChoices, summary.whitelist);
  }

  const skipStrip = moduleExtraFields.querySelector('[data-looting-chip-strip="lootBlacklist"]');
  if (skipStrip) {
    skipStrip.innerHTML = renderLootingActiveTokens("lootBlacklist", summary.blacklist, {
      emptyLabel: "No blocked entries",
      tone: "danger",
    });
  }

  const routeStrip = moduleExtraFields.querySelector('[data-looting-chip-strip="lootPreferredContainers"]');
  if (routeStrip) {
    routeStrip.innerHTML = renderLootingActiveTokens("lootPreferredContainers", summary.preferredContainers, {
      emptyLabel: "Default Backpack target",
      tone: "route",
    });
  }

  const routeLine = moduleExtraFields.querySelector("[data-looting-route-line]");
  if (routeLine) {
    routeLine.innerHTML = renderLootingRouteNodes(summary.preferredContainers);
  }

  const previewList = moduleExtraFields.querySelector("[data-looting-preview-list]");
  if (previewList) {
    previewList.innerHTML = renderLootingPreviewSteps(summary);
  }
}

function getModuleOptionInput(moduleKey, fieldKey) {
  return document.querySelector(
    `[data-module-key="${escapeAttributeValue(moduleKey)}"][data-module-option-field="${escapeAttributeValue(fieldKey)}"]`,
  );
}

function setModuleOptionInputValue(moduleKey, fieldKey, nextValue, {
  focus = false,
} = {}) {
  const input = getModuleOptionInput(moduleKey, fieldKey);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) {
    return;
  }

  const nextText = String(nextValue ?? "");
  if (input.value !== nextText) {
    input.value = nextText;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  } else {
    const draft = syncModulesDraftFromDom();
    syncModuleStatusDisplays(draft);
  }

  if (focus) {
    input.focus();
  }
}

function updateLootingFieldToken(fieldKey, token, action = "add") {
  const normalizedToken = String(token || "").trim();
  if (!fieldKey) {
    return;
  }

  if (action === "clear") {
    setModuleOptionInputValue("looting", fieldKey, "", { focus: true });
    return;
  }

  if (!normalizedToken) {
    return;
  }

  const input = getModuleOptionInput("looting", fieldKey);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    return;
  }

  const currentEntries = normalizeTextListSummary(input.value);
  const tokenKey = normalizedToken.toLowerCase();
  const nextEntries = action === "remove"
    ? currentEntries.filter((entry) => entry.toLowerCase() !== tokenKey)
    : (currentEntries.some((entry) => entry.toLowerCase() === tokenKey)
      ? currentEntries
      : [...currentEntries, normalizedToken]);

  setModuleOptionInputValue("looting", fieldKey, nextEntries.join("\n"), {
    focus: action !== "remove",
  });
}

function updateAlarmBlacklistToken(token, action = "add") {
  const normalizedToken = String(token || "").trim();
  const input = getModuleOptionInput("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.names);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    return;
  }

  if (action === "clear") {
    setModuleOptionInputValue("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.names, "", { focus: true });
    return;
  }

  if (!normalizedToken) {
    return;
  }

  const currentEntries = normalizeTextListSummary(input.value);
  const tokenKey = normalizedToken.toLowerCase();
  const nextEntries = action === "remove"
    ? currentEntries.filter((entry) => entry.toLowerCase() !== tokenKey)
    : (currentEntries.some((entry) => entry.toLowerCase() === tokenKey)
      ? currentEntries
      : [...currentEntries, normalizedToken]);

  setModuleOptionInputValue("alarms", ALARM_MODULE_FIELD_KEYS.blacklist.names, nextEntries.join("\n"), {
    focus: action !== "remove",
  });
}

function renderModuleOptionFields(moduleKey, modulesState = ensureModulesDraft()) {
  const schema = getModuleSchema(moduleKey);
  if (!schema) return "";
  if (moduleKey === "healer") {
    return renderHealerFields(modulesState);
  }
  if (moduleKey === "deathHeal") {
    return renderDeathHealFields(modulesState);
  }
  if (moduleKey === "alarms") {
    return renderAlarmFields(modulesState);
  }
  if (moduleKey === "autoEat") {
    return renderAutoEatFields(modulesState);
  }
  if (moduleKey === "ammo") {
    return renderAmmoFields(modulesState);
  }
  if (moduleKey === "looting") {
    return renderLootingFields(modulesState);
  }
  if (moduleKey === "trainer") {
    return renderTrainerFields(modulesState);
  }
  if (moduleKey === "partyFollow") {
    return renderFollowTrainFields(modulesState);
  }
  if (moduleKey === "antiIdle") {
    return renderAntiIdleFields(modulesState);
  }
  if (moduleKey === "reconnect") {
    return renderReconnectFields(modulesState);
  }
  if (moduleKey === "ringAutoReplace" || moduleKey === "amuletAutoReplace") {
    return renderEquipmentReplaceFields(moduleKey, modulesState);
  }

  return (schema.moduleFields || [])
    .map((field) => getModuleOptionFieldSpec(moduleKey, field.key))
    .filter(Boolean)
    .map((field) => renderModuleOptionField(moduleKey, field, modulesState?.[field.key]))
    .join("");
}

function renderModuleRuleFieldSection(moduleKey, index, rule = {}, section = {}) {
  const fields = (section.fields || [])
    .map((key) => getModuleRuleFieldSpec(moduleKey, key))
    .filter(Boolean)
    .map((field) => renderModuleRuleField(moduleKey, index, field, rule?.[field.key]))
    .join("");

  if (!fields) return "";

  return `
    <section class="module-rule-section">
      <div class="module-rule-section-title">${escapeHtml(section.title || "Fields")}</div>
      <div class="form-grid module-rule-grid">${fields}</div>
    </section>
  `;
}

function renderModuleRuleList(moduleKey, rules = []) {
  const schema = getModuleSchema(moduleKey);
  if (!schema) return "";
  if (schema.allowRules === false) return "";

  if (!rules.length) {
    return '<div class="empty-state">No rules yet</div>';
  }

  const listHead = moduleKey === "healer"
    ? `
      <div class="module-rule-list-head healer-priority-head">
        <span>Applied Healing Priority</span>
        <strong>Top rule runs first</strong>
      </div>
    `
    : "";

  return listHead + rules
    .map((rule, index) => {
      const enabled = rule?.enabled !== false;
      const ui = MODULE_RULE_UI[moduleKey] || {};
      const title = formatRuleDisplayName(moduleKey, rule, index);
      const sections = (ui.sections || [])
        .map((section) => renderModuleRuleFieldSection(moduleKey, index, rule, section))
        .join("");

      return `
        <div class="module-rule-card ${enabled ? "" : "module-rule-card-disabled"}" data-module-key="${moduleKey}" data-rule-index="${index}">
          <div class="module-rule-head">
            <div class="module-rule-title-row">
              <span class="module-rule-index">${escapeHtml(formatPriorityRankLabel(index))}</span>
              <strong class="module-rule-name">${escapeHtml(title)}</strong>
              <span class="module-rule-badge ${enabled ? "active" : "off"}">${enabled ? "Active" : "Off"}</span>
            </div>
            <div class="module-rule-actions">
              <button type="button" class="btn mini" data-move-module-rule="${moduleKey}" data-rule-index="${index}" data-rule-delta="-1" ${index === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(title)} up">Move Up</button>
              <button type="button" class="btn mini" data-move-module-rule="${moduleKey}" data-rule-index="${index}" data-rule-delta="1" ${index === rules.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(title)} down">Move Down</button>
              <button type="button" class="btn mini danger" data-delete-module-rule="${moduleKey}" data-rule-index="${index}" aria-label="Delete ${escapeHtml(title)}">Delete Rule</button>
            </div>
          </div>
          <div class="module-rule-summary">${renderModuleRuleSummary(moduleKey, rule, { rules, index })}</div>
          <div class="module-rule-sections">${sections}</div>
        </div>
      `;
    })
    .join("");
}

function getModulesRenderKey(modulesState) {
  const moduleKey = getActiveModuleKey();
  const schema = getModuleSchema(moduleKey);
  if (!schema) return "";
  const rules = schema.allowRules === false || !schema.rulesKey
    ? []
    : (Array.isArray(modulesState?.[schema.rulesKey]) ? modulesState[schema.rulesKey] : []);
  const moduleFieldValues = (schema.moduleFields || [])
    .map((field) => `${field.key}:${String(modulesState?.[field.key] ?? "")}`)
    .join("|");
  const enabledValue = moduleKey === "ammo"
    ? buildAmmoSummary(modulesState).enabled
    : Boolean(modulesState?.[schema.enabledKey]);
  const customValues = moduleKey === "partyFollow"
    ? `:${normalizeTextListSummary(modulesState?.partyFollowMembers).join(",")}:${String(modulesState?.partyFollowCombatMode || "")}:${JSON.stringify(pruneFollowTrainMemberRoles(modulesState?.partyFollowMemberRoles, modulesState?.partyFollowMembers, modulesState?.partyFollowCombatMode))}:${JSON.stringify(pruneFollowTrainMemberChaseModes(modulesState?.partyFollowMemberChaseModes, modulesState?.partyFollowMembers))}:${getFollowTrainSourceSignature()}:${getFollowTrainRuntimeSignature()}`
    : moduleKey === "trainer"
      ? `:${getResolvedTrainerPartnerName(modulesState)}:${String(state?.snapshot?.playerName || "")}:${getFollowTrainSourceSignature()}:${getTrainerDuoPresetSignature()}`
      : moduleKey === "healer"
        ? (() => {
          const detected = getDetectedVocationInfo();
          return `:${detected.vocation}:${detected.source}:${String(state?.options?.vocation || "").trim().toLowerCase()}:${String(modulesState?.healerRuneName || "")}:${Number(modulesState?.healerRuneHealthPercent) || 0}:${Boolean(modulesState?.potionHealerEnabled) ? "1" : "0"}:${JSON.stringify(modulesState?.potionHealerRules || [])}:${Boolean(modulesState?.conditionHealerEnabled) ? "1" : "0"}:${JSON.stringify(modulesState?.conditionHealerRules || [])}`;
        })()
        : moduleKey === "deathHeal"
          ? (() => {
            const detected = getDetectedVocationInfo();
            return `:${detected.vocation}:${detected.source}:${String(state?.options?.vocation || "").trim().toLowerCase()}`;
          })()
          : moduleKey === "autoEat"
            ? `:${getAutoEatLiveChoiceSignature(state?.snapshot)}`
            : moduleKey === "ammo"
              ? (() => {
                const summary = buildAmmoSummary(modulesState);
                return `:${summary.headline}:${summary.detail}:${summary.equippedName}:${summary.equippedCount}:${summary.carriedCount}:${summary.slotLabel}:${summary.preferredValue}:${summary.sourceLabel}:${summary.choices.map((choice) => `${choice.label}:${choice.carriedCount}:${choice.equippedCount}:${choice.sources.join("/")}`).join("|")}`;
              })()
              : moduleKey === "antiIdle"
                ? (() => {
                  const status = getAntiIdleRuntimeStatus();
                  return `:${status?.ready ? "1" : "0"}:${status?.blocker || ""}:${status?.lastPulseAt || 0}:${status?.lastTransport || ""}:${status?.lastOk == null ? "" : String(status.lastOk)}`;
                })()
                : moduleKey === "reconnect"
                  ? (() => {
                    const runtime = getReconnectRuntimeStatus(modulesState, state);
                    return `:${runtime.enabled ? "1" : "0"}:${runtime.headline}:${runtime.tone}:${runtime.reconnectStatus?.phase || ""}:${Number(runtime.reconnectStatus?.remainingMs) || 0}:${Number(runtime.reconnectStatus?.attempts) || 0}:${runtime.connection?.canReconnect ? "1" : "0"}:${runtime.connection?.reconnecting ? "1" : "0"}:${runtime.dead ? "1" : "0"}`;
                  })()
                  : moduleKey === "ringAutoReplace"
                    ? `:${[
                      "ringAutoReplace",
                      "amuletAutoReplace",
                    ].map((equipmentModuleKey) => {
                      const config = getEquipmentReplaceConfig(equipmentModuleKey);
                      return [
                        equipmentModuleKey,
                        getEquipmentReplaceEnabled(equipmentModuleKey, modulesState) ? "1" : "0",
                        normalizeEquipmentReplaceName(modulesState?.[config?.itemField]),
                        String(modulesState?.[config?.cooldownField] ?? ""),
                        modulesState?.[config?.requireNoTargetsField] ? "1" : "0",
                        modulesState?.[config?.requireStationaryField] ? "1" : "0",
                        getEquipmentReplaceLiveChoiceSignature(equipmentModuleKey),
                      ].join(",");
                    }).join("|")}`
                    : moduleKey === "amuletAutoReplace"
                      ? `:${getEquipmentReplaceLiveChoiceSignature(moduleKey)}`
                      : "";
  return `${moduleKey}:${enabledValue ? "1" : "0"}:${rules.length}:${rules.map((rule) => rule?.enabled !== false ? "1" : "0").join("")}:${moduleFieldValues}${customValues}`;
}

function syncRenderedModuleRuleCards(container, moduleKey, rules = []) {
  container
    ?.querySelectorAll(`.module-rule-card[data-module-key="${moduleKey}"]`)
    .forEach((card) => {
      const ruleIndex = Number(card.dataset.ruleIndex);
      const rule = rules[ruleIndex] || {};
      const ruleEnabled = rule?.enabled !== false;
      const badge = card.querySelector(".module-rule-badge");
      const name = card.querySelector(".module-rule-name");
      const summary = card.querySelector(".module-rule-summary");

      card.classList.toggle("module-rule-card-disabled", !ruleEnabled);
      if (name) {
        name.textContent = formatRuleDisplayName(moduleKey, rule, ruleIndex);
      }
      if (badge) {
        badge.textContent = ruleEnabled ? "Active" : "Off";
        badge.classList.toggle("active", ruleEnabled);
        badge.classList.toggle("off", !ruleEnabled);
      }
      if (summary) {
        summary.innerHTML = renderModuleRuleSummary(moduleKey, rule, { rules, index: ruleIndex });
      }
    });
}

function syncHealerFamilyViews(modulesState = ensureModulesDraft()) {
  if (getActiveModuleKey() !== "healer" || !moduleExtraFields) {
    return;
  }

  ["potionHealer", "conditionHealer"].forEach((familyKey) => {
    const familyStatus = getHealerFamilyStatus(familyKey, modulesState);
    const meta = moduleExtraFields.querySelector(`[data-healer-family-meta="${familyKey}"]`);
    const current = moduleExtraFields.querySelector(`[data-healer-family-current="${familyKey}"]`);
    const ruleList = moduleExtraFields.querySelector(`[data-healer-family-rule-list="${familyKey}"]`);

    if (meta) {
      meta.textContent = familyStatus.statusLine;
    }
    if (current) {
      current.textContent = familyStatus.currentLine;
    }
    syncRenderedModuleRuleCards(ruleList, familyKey, familyStatus.rules);
  });
}

function syncModuleStatusDisplays(modulesState = ensureModulesDraft()) {
  const moduleKey = getActiveModuleKey();
  const schema = getModuleSchema(moduleKey);
  if (!schema) return;

  syncModuleViewPanels(moduleKey);

  const ui = getModuleUi(moduleKey);
  const view = getModuleView(moduleKey);
  const enabled = moduleKey === "ringAutoReplace"
    ? getEquipmentReplaceCombinedEnabled(modulesState)
    : moduleKey === "ammo"
      ? buildAmmoSummary(modulesState).enabled
      : moduleKey === "reconnect"
        ? getReconnectModeState(modulesState).enabled
        : Boolean(modulesState?.[schema.enabledKey]);
  const rules = schema.allowRules === false || !schema.rulesKey
    ? []
    : (Array.isArray(modulesState?.[schema.rulesKey]) ? modulesState[schema.rulesKey] : []);

  view.panel?.classList.toggle("module-card-disabled", !enabled);
  if (view.panel) {
    view.panel.dataset.moduleKey = moduleKey;
  }
  if (view.ruleList) {
    view.ruleList.hidden = schema.allowRules === false;
    view.ruleList.dataset.moduleKey = moduleKey;
  }
  if (view.extraFields) {
    view.extraFields.hidden = !Array.isArray(schema.moduleFields) || schema.moduleFields.length === 0;
    view.extraFields.dataset.moduleKey = moduleKey;
    view.extraFields.classList.toggle("module-extra-fields-healer", moduleKey === "healer");
    view.extraFields.classList.toggle("module-extra-fields-looting", moduleKey === "looting");
    view.extraFields.classList.toggle("module-extra-fields-alarms", moduleKey === "alarms");
  }
  if (view.addRuleButton) {
    view.addRuleButton.hidden = schema.allowRules === false;
    view.addRuleButton.dataset.addModuleRule = moduleKey;
  }
  const settingsOnly = schema.allowRules === false
    ? ui.settingsOnly !== false
    : false;
  const effectiveState = getModuleEffectiveState(moduleKey, modulesState || state?.options || {}, state);
  const statusLine = schema.allowRules === false
    ? (moduleKey === "ringAutoReplace"
      ? getEquipmentReplaceCombinedStatus(modulesState).activeLabel
      : ["trainer", "reconnect", "antiIdle", "autoEat", "ammo", "partyFollow", "deathHeal"].includes(moduleKey)
        ? formatEffectiveModuleStatusLine(effectiveState, [], { settingsOnly, plainWhenEmpty: !settingsOnly })
        : (settingsOnly ? `${enabled ? "On" : "Off"} - settings only` : (enabled ? "On" : "Off")))
    : ["healer", "distanceKeeper"].includes(moduleKey)
      ? formatEffectiveModuleStatusLine(effectiveState, rules)
      : formatModuleStatusLine(enabled, rules);
  const currentLine = schema.allowRules === false
    ? formatModuleCurrentLine(moduleKey, [], modulesState)
    : formatModuleCurrentLine(moduleKey, rules, modulesState);
  const modalMetaText = ui.modalMeta || "";
  const noteText = moduleKey === "autoEat"
    ? formatAutoEatNote(modulesState, ui.note || "")
    : (ui.note || "");
  setTextContent(view.modalTitle, ui.modalTitle || "Module");
  setTextContent(view.modalMeta, modalMetaText);
  setTextContent(view.cardTitle, ui.cardTitle || ui.modalTitle || "Module");
  setTextContent(view.stateLine, statusLine);
  setTextContent(view.currentLine, currentLine);
  setTextContent(view.note, noteText);
  setTextContent(view.addRuleButton, ui.addLabel || "Add Rule");
  if (view.modalMeta) {
    view.modalMeta.hidden = !modalMetaText;
  }
  if (view.note) {
    view.note.hidden = !noteText;
  }
  view.panel?.classList.toggle("module-card-looting", moduleKey === "looting");

  if (moduleKey === "alarms") {
    syncAlarmModuleView(modulesState);
  }
  if (moduleKey === "looting") {
    syncLootingModuleView(modulesState);
  }
  if (moduleKey === "runeMaker") {
    syncRuneMakerLiveDashboard(rules, state?.snapshot);
  }
  syncRenderedModuleRuleCards(view.ruleList, moduleKey, rules);
  if (moduleKey === "healer") {
    syncHealerFamilyViews(modulesState);
  }
}

function syncModulesDraftFromDom() {
  const draft = ensureModulesDraft();
  const moduleKey = getActiveModuleKey();
  const schema = getModuleSchema(moduleKey);
  const view = getModuleView(moduleKey);
  const scope = view?.panel || document;
  scope.querySelectorAll("[data-module-key][data-rule-index][data-rule-field]").forEach((input) => {
    const moduleKey = input.dataset.moduleKey;
    const ruleIndex = Number(input.dataset.ruleIndex);
    const ruleField = input.dataset.ruleField;
    const schema = getModuleSchema(moduleKey);
    if (!schema || !Number.isInteger(ruleIndex) || ruleIndex < 0 || !ruleField) return;

    const rules = getModuleRuleList(moduleKey);
    if (!rules[ruleIndex]) {
      rules[ruleIndex] = createModuleRule(moduleKey) || {};
    }

    rules[ruleIndex][ruleField] = input.type === "checkbox"
      ? input.checked
      : input.type === "number"
        ? Number(input.value)
        : input.value;
  });

  scope.querySelectorAll("[data-module-key][data-module-option-field]").forEach((input) => {
    const moduleKey = input.dataset.moduleKey;
    const fieldKey = input.dataset.moduleOptionField;
    const field = getModuleOptionFieldSpec(moduleKey, fieldKey);
    if (!field) return;

    draft[fieldKey] = input.type === "checkbox"
      ? input.checked
      : input.type === "number"
        ? Number(input.value)
        : input.value;
  });

  return draft;
}

function setTextContent(element, value) {
  if (!element) return;
  element.textContent = value;
}

function getMonotonicNowMs() {
  return typeof window?.performance?.now === "function" ? window.performance.now() : Date.now();
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

function recordRendererRuntimeTiming(name, durationMs, details = {}) {
  const metric = recordRuntimeTimingSample(rendererRuntimeTiming, name, durationMs, details);
  window.__MINIBOT_RENDERER_METRICS__ = {
    renderer: serializeRuntimeTimingStore(rendererRuntimeTiming),
  };
  return metric;
}

function scheduleRender(scope = "full") {
  if (rendererDisposed) return;

  const nextScope = scope === "live" ? "live" : "full";
  scheduledRenderScope = renderScheduled
    ? (scheduledRenderScope === "full" || nextScope === "full" ? "full" : "live")
    : nextScope;
  if (renderScheduled) return;
  renderScheduled = true;

  const flushRender = () => {
    const flushScope = scheduledRenderScope === "live" ? "live" : "full";
    renderScheduled = false;
    scheduledRenderScope = "full";
    if (rendererDisposed) return;
    render(flushScope);
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(flushRender);
    return;
  }

  window.setTimeout(flushRender, 0);
}

function renderRouteFileInfo(routeProfile = state?.routeProfile) {
  if (!routeFileStatus || !routeFilePath) return;

  if (!routeProfile?.path) {
    const draft = !state?.options?.cavebotName;
    const statusText = draft ? "Blank draft" : "Pending save";
    const pathText = draft
      ? "Blank draft. Name it, then save."
      : "Pending save. Save to write the file.";
    setTextContent(routeFileStatus, statusText);
    setTextContent(routeFilePath, pathText);
    routeFileStatus.dataset.state = draft ? "draft" : "pending";
    routeFilePath.title = pathText;
    return;
  }

  const statusText = routeProfile.exists ? "Route file ready" : "Pending save";
  setTextContent(routeFileStatus, statusText);
  setTextContent(routeFilePath, routeProfile.path);
  routeFileStatus.dataset.state = routeProfile.exists ? "ready" : "pending";
  routeFilePath.title = routeProfile.path;
}

function getDashboardRenderKey(
  lifecycle = getDeskLifecycle(),
  options = state?.options || {},
  waypoints = options.waypoints || [],
  waypoint = waypoints[state?.routeIndex] || null,
) {
  const routeResetStatus = getRouteResetStatus();
  const reconnectStatus = state?.reconnectStatus || null;
  const connection = state?.snapshot?.connection || null;
  const deskCavebotControlState = getDeskCavebotControlState(state);
  const followTrainStatus = getBoundInstance()?.followTrainStatus || null;
  const autowalkState = getAutowalkEffectiveState(options, state);
  const healerState = getHealerEffectiveState(options, state);
  const deathHealState = getDeathHealEffectiveState(options, state);
  const autoEatState = getAutoEatEffectiveState(options, state);
  const trainerState = getTrainerEffectiveState(options, state);
  const reconnectState = getReconnectEffectiveState(options, state);
  const antiIdleState = getAntiIdleEffectiveState(options, state);
  const followContext = getFollowTrainRuntimeContext(state, options);
  const partyFollowState = {
    label: !options.partyFollowEnabled
      ? "Off"
      : followContext.passiveFollower
        ? "Passive"
        : followContext.follower
          ? "Follow"
          : Number.isInteger(followContext.followTrainStatus?.selfIndex) && followContext.followTrainStatus.selfIndex === 0
            ? "Pilot"
            : "On",
    detail: !options.partyFollowEnabled
      ? ""
      : followContext.passiveFollower
        ? "Passive follow role suppresses combat."
        : followContext.follower
          ? "Following the live chain."
          : "Follow Chain armed.",
  };

  return [
    lifecycle.phase,
    lifecycle.tone,
    getFrontStatusText(lifecycle, options),
    getQuickSummaryText(lifecycle, options),
    getRouteSummaryText(lifecycle, waypoints, waypoint),
    hasSessionTabs() ? "1" : "0",
    options.autowalkEnabled ? "1" : "0",
    autowalkState.state,
    autowalkState.label,
    options.cavebotPaused ? "1" : "0",
    deskCavebotControlState.liveCount,
    deskCavebotControlState.runningCount,
    deskCavebotControlState.allPaused ? "1" : "0",
    options.autowalkLoop ? "1" : "0",
    options.routeRecording ? "1" : "0",
    options.showWaypointOverlay ? "1" : "0",
    options.avoidElementalFields ? "1" : "0",
    options.healerEnabled ? "1" : "0",
    healerState.state,
    healerState.label,
    options.deathHealEnabled ? "1" : "0",
    deathHealState.state,
    deathHealState.label,
    options.manaTrainerEnabled ? "1" : "0",
    options.trainerManaTrainerEnabled ? "1" : "0",
    String(options.trainerManaTrainerWords || ""),
    Number(options.trainerManaTrainerManaPercent) || 0,
    Number(options.trainerManaTrainerMinHealthPercent) || 0,
    options.autoEatEnabled ? "1" : "0",
    autoEatState.state,
    autoEatState.label,
    options.ringAutoReplaceEnabled ? "1" : "0",
    options.amuletAutoReplaceEnabled ? "1" : "0",
    options.runeMakerEnabled ? "1" : "0",
    options.spellCasterEnabled ? "1" : "0",
    options.autoLightEnabled ? "1" : "0",
    options.autoConvertEnabled ? "1" : "0",
    options.lootingEnabled ? "1" : "0",
    options.bankingEnabled ? "1" : "0",
    options.rookillerEnabled ? "1" : "0",
    options.trainerEnabled ? "1" : "0",
    trainerState.state,
    trainerState.label,
    options.trainerReconnectEnabled !== false ? "1" : "0",
    options.reconnectEnabled ? "1" : "0",
    reconnectState.state,
    reconnectState.label,
    Number(options.reconnectRetryDelayMs) || 0,
    Number(options.reconnectMaxAttempts) || 0,
    options.antiIdleEnabled ? "1" : "0",
    antiIdleState.state,
    antiIdleState.label,
    options.alarmsEnabled ? "1" : "0",
    options.partyFollowEnabled ? "1" : "0",
    partyFollowState.label,
    partyFollowState.detail,
    routeResetStatus.active ? "1" : "0",
    routeResetStatus.phase || "",
    routeResetStatus.targetIndex ?? -1,
    Boolean(getBoundInstance()?.stopAggroHold) ? "1" : "0",
    reconnectStatus?.active ? "1" : "0",
    reconnectStatus?.phase || "",
    Number(reconnectStatus?.remainingMs) || 0,
    Number(reconnectStatus?.attempts) || 0,
    connection?.reconnecting ? "1" : "0",
    connection?.canReconnect ? "1" : "0",
    connection?.playerIsDead ? "1" : "0",
    connection?.deathModalVisible ? "1" : "0",
    followTrainStatus?.active ? "1" : "0",
    Number.isInteger(followTrainStatus?.selfIndex) ? followTrainStatus.selfIndex : -1,
    String(followTrainStatus?.leaderName || ""),
  ].join("::");
}

function getRouteLibrary() {
  return Array.isArray(state?.routeLibrary) ? state.routeLibrary : [];
}

function getCurrentRouteName() {
  return String(state?.options?.cavebotName || "").trim();
}

function getSelectedRouteLibraryName(routeLibrary = getRouteLibrary()) {
  const currentRouteName = getCurrentRouteName();
  const existingNames = new Set(routeLibrary.map((entry) => entry.name));

  if (selectedRouteLibraryName && existingNames.has(selectedRouteLibraryName)) {
    return selectedRouteLibraryName;
  }

  if (currentRouteName && existingNames.has(currentRouteName)) {
    return currentRouteName;
  }

  return routeLibrary[0]?.name || "";
}

function getSelectedWaypoint(waypoints = getWaypoints()) {
  if (!waypoints.length) return null;
  return waypoints[Math.max(0, Math.min(selectedWaypointIndex, waypoints.length - 1))] || null;
}

function getSelectedTileRule(tileRules = getTileRules()) {
  if (!tileRules.length) return null;
  return tileRules[Math.max(0, Math.min(selectedTileRuleIndex, tileRules.length - 1))] || null;
}

function normalizeRouteEditorMode(mode) {
  return mode === "tileRule" ? "tileRule" : "waypoint";
}

function getResolvedRouteEditorMode(waypoints = getWaypoints(), tileRules = getTileRules()) {
  const preferred = normalizeRouteEditorMode(routeEditorMode);
  if (preferred === "tileRule" && tileRules.length) return preferred;
  if (preferred === "waypoint" && waypoints.length) return preferred;
  if (waypoints.length) return "waypoint";
  if (tileRules.length) return "tileRule";
  return preferred;
}

function getWaypointEditorEmptyValue() {
  return {
    x: "",
    y: "",
    z: "",
    label: "",
    type: "walk",
    radius: "",
    action: "restart",
    targetIndex: "",
  };
}

function getTileRuleEditorEmptyValue() {
  return {
    enabled: true,
    label: "",
    x: "",
    y: "",
    z: "",
    shape: "tile",
    width: 1,
    height: 1,
    trigger: "approach",
    policy: "avoid",
    waitMs: 1200,
    cooldownMs: 0,
    exactness: "exact",
    vicinityRadius: 0,
  };
}

function captureWaypointEditorDraftFromDom() {
  waypointEditorDirty = true;
  waypointEditorDirtyIndex = selectedWaypointIndex;
  waypointEditorDraft = {
    label: document.getElementById("route-item-label")?.value ?? "",
    x: document.getElementById("route-item-x")?.value ?? "",
    y: document.getElementById("route-item-y")?.value ?? "",
    z: document.getElementById("route-item-z")?.value ?? "",
    type: document.getElementById("waypoint-type")?.value ?? "walk",
    radius: document.getElementById("waypoint-step-radius")?.value ?? "",
    action: document.getElementById("waypoint-action")?.value ?? "restart",
    targetIndex: document.getElementById("waypoint-action-target")?.value ?? "",
  };
}

function captureTileRuleEditorDraftFromDom() {
  tileRuleEditorDirty = true;
  tileRuleEditorDirtyIndex = selectedTileRuleIndex;
  tileRuleEditorDraft = {
    enabled: document.getElementById("tile-rule-enabled")?.checked !== false,
    label: document.getElementById("route-item-label")?.value ?? "",
    x: document.getElementById("route-item-x")?.value ?? "",
    y: document.getElementById("route-item-y")?.value ?? "",
    z: document.getElementById("route-item-z")?.value ?? "",
    shape: document.getElementById("tile-rule-shape")?.value ?? "tile",
    width: document.getElementById("tile-rule-width")?.value ?? "1",
    height: document.getElementById("tile-rule-height")?.value ?? "1",
    trigger: document.getElementById("tile-rule-trigger")?.value ?? "approach",
    policy: document.getElementById("tile-rule-policy")?.value ?? "avoid",
    waitMs: document.getElementById("tile-rule-wait-ms")?.value ?? "1200",
    cooldownMs: document.getElementById("tile-rule-cooldown-ms")?.value ?? "0",
    exactness: document.getElementById("tile-rule-exactness")?.value ?? "exact",
    vicinityRadius: document.getElementById("tile-rule-vicinity-radius")?.value ?? "0",
  };
}

function getWaypointEditorValue(waypoints = getWaypoints()) {
  const selected = getSelectedWaypoint(waypoints);
  const base = selected ? { ...getWaypointEditorEmptyValue(), ...selected } : getWaypointEditorEmptyValue();
  if (waypointEditorDirty && waypointEditorDirtyIndex === selectedWaypointIndex && waypointEditorDraft) {
    return { ...base, ...waypointEditorDraft };
  }
  return base;
}

function getTileRuleEditorValue(tileRules = getTileRules()) {
  const selected = getSelectedTileRule(tileRules);
  const base = selected ? { ...getTileRuleEditorEmptyValue(), ...selected } : getTileRuleEditorEmptyValue();
  if (tileRuleEditorDirty && tileRuleEditorDirtyIndex === selectedTileRuleIndex && tileRuleEditorDraft) {
    return { ...base, ...tileRuleEditorDraft };
  }
  return base;
}

function setRouteEditorMode(mode, { renderNow = true } = {}) {
  routeEditorMode = normalizeRouteEditorMode(mode);
  if (renderNow && state?.options) {
    renderAutowalk();
  }
}

function formatWaypointDangerLabel(index = selectedWaypointIndex, waypoints = getWaypoints()) {
  const waypoint = waypoints[index];
  if (!waypoint) return "No waypoint selected.";
  return formatWaypointHeading(waypoint, index);
}

function clearPendingDangerAction(type = null) {
  if (type && pendingDangerAction?.type !== type) {
    return;
  }

  pendingDangerAction = null;
  window.clearTimeout(pendingDangerTimer);
  pendingDangerTimer = null;
}

function armDangerAction(type, context = {}) {
  pendingDangerAction = { type, ...context };
  window.clearTimeout(pendingDangerTimer);
  pendingDangerTimer = window.setTimeout(() => {
    pendingDangerAction = null;
    pendingDangerTimer = null;
    if (state?.options) {
      renderAutowalk();
      renderMonsterArchive();
    }
  }, DANGER_CONFIRM_MS);
}

function isDangerActionArmed(type) {
  return pendingDangerAction?.type === type;
}

function clearRouteUndoState() {
  routeUndoState = null;
}

function clearArchiveUndoState() {
  archiveUndoState = null;
}

function doesRouteDeleteConfirmationMatch(routeName = getSelectedRouteLibraryName()) {
  return Boolean(routeName);
}

function renderRouteEditorFrame(mode = getResolvedRouteEditorMode(), waypoints = getWaypoints(), tileRules = getTileRules()) {
  const resolvedMode = normalizeRouteEditorMode(mode);
  const waypointActive = resolvedMode === "waypoint";
  const tileRuleActive = resolvedMode === "tileRule";

  if (routeEditorTitle) {
    routeEditorTitle.textContent = waypointActive ? "Waypoint Editor" : "Tile Rule Editor";
  }
  if (routeEditorCopy) {
    routeEditorCopy.textContent = waypointActive
      ? "one source of truth for waypoint position, label, and action details"
      : "one source of truth for tile rule position, label, and policy details";
  }
  if (routeEditorSharedHelp) {
    routeEditorSharedHelp.textContent = waypointActive
      ? "Shared label and coordinates for the selected waypoint."
      : "Shared label and coordinates for the selected tile rule.";
  }
  if (waypointEditorPanel) {
    waypointEditorPanel.hidden = !waypointActive;
  }
  if (tileRuleEditorPanel) {
    tileRuleEditorPanel.hidden = !tileRuleActive;
  }

  Object.entries(routeEditorModeButtons).forEach(([key, button]) => {
    if (!button) return;
    const active = (key === "tileRule" ? tileRuleActive : waypointActive);
    const available = key === "tileRule" ? tileRules.length > 0 : waypoints.length > 0;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.disabled = !available;
  });
}

function renderWaypointSelectionSummary(waypoints = getWaypoints(), mode = getResolvedRouteEditorMode(waypoints, getTileRules())) {
  if (!waypointSelectionSummary) return;
  const markedCount = getMarkedWaypointCount(waypoints);

  if (normalizeRouteEditorMode(mode) === "tileRule") {
    const rule = getSelectedTileRule(getTileRules());
    if (!rule) {
      waypointSelectionSummary.textContent = "No tile rule selected.";
      waypointSelectionSummary.title = waypointSelectionSummary.textContent;
      return;
    }

    const summary = `${formatWaypointOrdinal(selectedTileRuleIndex)}. ${getTileRuleDisplayLabel(rule, selectedTileRuleIndex)} / ${formatTileRuleMeta(rule)}`;
    waypointSelectionSummary.textContent = summary;
    waypointSelectionSummary.title = summary;
    return;
  }

  const waypoint = getSelectedWaypoint(waypoints);
  if (!waypoint) {
    waypointSelectionSummary.textContent = markedCount
      ? `${formatMarkedWaypointSummary(waypoints)} No editor waypoint selected.`
      : "No waypoint selected.";
    waypointSelectionSummary.title = waypointSelectionSummary.textContent;
    return;
  }

  const summary = `${formatWaypointHeading(waypoint, selectedWaypointIndex)} / ${formatWaypointMeta(waypoint)}${markedCount ? ` / ${markedCount} marked` : ""}`;
  waypointSelectionSummary.textContent = summary;
  waypointSelectionSummary.title = summary;
}

function renderWaypointBatchSelection(waypoints = getWaypoints()) {
  const summary = formatMarkedWaypointSummary(waypoints);
  const markedCount = getMarkedWaypointCount(waypoints);

  if (routeOverviewFields.selectionSummary) {
    routeOverviewFields.selectionSummary.textContent = summary;
    routeOverviewFields.selectionSummary.title = summary;
  }

  if (waypointStackSelectionSummary) {
    waypointStackSelectionSummary.textContent = summary;
    waypointStackSelectionSummary.title = summary;
  }

  if (routeLivePreviewToolbar) {
    routeLivePreviewToolbar.hidden = false;
  }

  if (routeStackSelectionBar) {
    routeStackSelectionBar.hidden = !markedCount;
  }

  if (actionButtons.clearWaypointMarks) {
    actionButtons.clearWaypointMarks.hidden = !markedCount;
  }

  if (actionButtons.clearLiveSelectedWaypoints) {
    actionButtons.clearLiveSelectedWaypoints.hidden = !markedCount;
  }

  if (actionButtons.removeSelectedWaypoints) {
    actionButtons.removeSelectedWaypoints.hidden = !markedCount;
    actionButtons.removeSelectedWaypoints.textContent = markedCount > 1 ? `Delete ${markedCount}` : "Delete Selected";
  }
}

function renderTileRuleSelectionSummary(tileRules = getTileRules()) {
  if (!tileRuleSelectionSummary) return;

  const rule = getSelectedTileRule(tileRules);
  if (!rule) {
    tileRuleSelectionSummary.hidden = true;
    tileRuleSelectionSummary.textContent = "No tile rule selected.";
    tileRuleSelectionSummary.title = tileRuleSelectionSummary.textContent;
    return;
  }

  tileRuleSelectionSummary.hidden = false;
  const summary = `${formatWaypointOrdinal(selectedTileRuleIndex)}. ${getTileRuleDisplayLabel(rule, selectedTileRuleIndex)} / ${formatTileRuleMeta(rule)}`;
  tileRuleSelectionSummary.textContent = summary;
  tileRuleSelectionSummary.title = summary;
}

function renderRouteDangerZone(waypoints = getWaypoints()) {
  const tileRuleCount = getTileRules().length;
  const selectedRouteName = getSelectedRouteLibraryName();
  const selectedRouteEntry = getRouteLibrary().find((entry) => entry.name === selectedRouteName) || null;
  const markedIndexes = getMarkedWaypointIndexes(waypoints);
  const markedCount = markedIndexes.length;
  const selectedWaypointLabel = formatWaypointDangerLabel(selectedWaypointIndex, waypoints);
  const markedWaypointLabel = markedCount
    ? `${markedCount} marked waypoint${markedCount === 1 ? "" : "s"}${markedIndexes.length ? ` (${markedIndexes.slice(0, 4).map((index) => formatWaypointOrdinal(index)).join(", ")}${markedIndexes.length > 4 ? ", ..." : ""})` : ""}`
    : "";
  const waypointCount = waypoints.length;
  const removeArmed = isDangerActionArmed("remove-waypoint");
  const clearArmed = isDangerActionArmed("clear-route");
  const deleteArmed = isDangerActionArmed("delete-route");

  if (routeDangerSummary) {
    routeDangerSummary.textContent = removeArmed
      ? markedCount
        ? `Confirm batch delete / ${markedWaypointLabel}`
        : `Confirm waypoint delete / ${selectedWaypointLabel}`
      : clearArmed
        ? `Confirm clear / ${waypointCount} wp / ${tileRuleCount} rules`
        : deleteArmed
          ? selectedRouteEntry
            ? `Confirm delete / ${selectedRouteEntry.fileName || selectedRouteEntry.name}`
            : "No saved file selected."
          : markedCount
            ? `${markedCount} marked for delete.`
            : "Delete, clear, or remove file.";
    routeDangerSummary.title = routeDangerSummary.textContent;
  }

  if (routeDangerSelected) {
    routeDangerSelected.textContent = markedCount ? markedWaypointLabel : selectedWaypointLabel;
    routeDangerSelected.title = routeDangerSelected.textContent;
  }

  if (routeDangerClear) {
    const clearText = waypointCount || tileRuleCount
      ? `${waypointCount} wp / ${tileRuleCount} rules`
      : "Draft empty.";
    routeDangerClear.textContent = clearText;
    routeDangerClear.title = clearText;
  }

  if (routeDangerDeleteFile) {
    const deleteText = selectedRouteEntry
      ? `${selectedRouteEntry.fileName || selectedRouteEntry.name} / ${Math.max(0, Number(selectedRouteEntry.waypointCount) || 0)} wp`
      : "No saved file selected.";
    routeDangerDeleteFile.textContent = deleteText;
    routeDangerDeleteFile.title = deleteText;
  }

  if (actionButtons.removeWaypoint) {
    actionButtons.removeWaypoint.textContent = removeArmed
      ? markedCount ? `Confirm Delete ${markedCount}` : "Confirm Delete"
      : markedCount ? `Delete ${markedCount} Marked` : "Delete Waypoint";
    actionButtons.removeWaypoint.classList.toggle("active", removeArmed);
  }

  if (actionButtons.clearRoute) {
    actionButtons.clearRoute.textContent = clearArmed ? "Confirm Clear" : "Clear Route";
    actionButtons.clearRoute.classList.toggle("active", clearArmed);
  }

  if (actionButtons.deleteRoute) {
    actionButtons.deleteRoute.textContent = deleteArmed ? "Confirm Delete File" : "Delete File";
    actionButtons.deleteRoute.classList.toggle("active", deleteArmed);
  }

  if (cancelRouteDangerButton) {
    cancelRouteDangerButton.hidden = !pendingDangerAction || !["remove-waypoint", "clear-route", "delete-route"].includes(pendingDangerAction.type);
  }

  if (undoRouteChangeButton) {
    undoRouteChangeButton.hidden = !routeUndoState;
  }
}

function renderTargetArchiveDanger() {
  const archivedCount = getArchivedMonsterNames().length;
  const clearArmed = isDangerActionArmed("clear-archive");
  const hasUndo = Boolean(archiveUndoState);
  const copy = archivedCount
    ? `Seen: ${archivedCount} monster${archivedCount === 1 ? "" : "s"}.`
    : "Seen: 0 monsters.";

  if (archiveDangerCopy) {
    archiveDangerCopy.textContent = clearArmed
      ? `Confirm clearing ${archivedCount} seen monster${archivedCount === 1 ? "" : "s"}.`
      : copy;
    archiveDangerCopy.title = archiveDangerCopy.textContent;
  }

  if (actionButtons.clearArchiveCreatures) {
    actionButtons.clearArchiveCreatures.textContent = clearArmed ? "Confirm Clear Archive" : "Clear Monster Archive";
  }

  if (cancelArchiveDangerButton) {
    cancelArchiveDangerButton.hidden = !clearArmed;
  }

  if (undoArchiveButton) {
    undoArchiveButton.hidden = !hasUndo;
  }
}

function formatRouteLibraryMeta(routeEntry = null) {
  if (!routeEntry) {
    return "No saved cavebot files yet.";
  }

  const waypointCount = Number(routeEntry.waypointCount) || 0;
  const updatedAt = Number(routeEntry.updatedAt);
  const updatedLabel = Number.isFinite(updatedAt) && updatedAt > 0
    ? new Date(updatedAt).toLocaleString()
    : "unknown";
  return `${waypointCount} waypoint${waypointCount === 1 ? "" : "s"} / ${routeEntry.fileName} / ${updatedLabel}`;
}

function getRouteLibraryRenderKey(routeLibrary = getRouteLibrary()) {
  const selectedName = getSelectedRouteLibraryName(routeLibrary);
  const currentRouteName = getCurrentRouteName();
  const entriesKey = routeLibrary
    .map((entry) => [
      entry.name,
      entry.fileName,
      entry.path,
      entry.waypointCount,
      entry.updatedAt,
      entry.active ? "1" : "0",
    ].join(":"))
    .join("|");

  return `${currentRouteName}::${selectedName}::${entriesKey}`;
}

function renderRouteLibrary() {
  if (!routeLibrarySelect || !routeLibraryMeta || !routeLibraryQuickSelect || !routeLibraryQuickMeta) return;

  const routeLibrary = getRouteLibrary();
  const selectedName = getSelectedRouteLibraryName(routeLibrary);
  const renderKey = getRouteLibraryRenderKey(routeLibrary);
  selectedRouteLibraryName = selectedName;

  if (!routeLibrary.length) {
    if (routeLibraryRenderedKey !== renderKey) {
      routeLibrarySelect.innerHTML = '<option value="">No saved routes</option>';
      routeLibraryQuickSelect.innerHTML = '<option value="">No saved routes</option>';
      markMainWindowTooltipsDirty();
    }
    if (routeLibrarySelect.value !== "") {
      routeLibrarySelect.value = "";
    }
    if (routeLibraryQuickSelect.value !== "") {
      routeLibraryQuickSelect.value = "";
    }
    const emptyText = getCurrentRouteName()
      ? "The current cavebot name is not backed by a saved file yet."
      : "No saved cavebot files yet.";
    routeLibraryMeta.textContent = emptyText;
    routeLibraryMeta.title = emptyText;
    routeLibraryQuickMeta.textContent = emptyText;
    routeLibraryQuickMeta.title = emptyText;
    routeLibraryRenderedKey = renderKey;
    return;
  }

  if (routeLibraryRenderedKey !== renderKey) {
    const routeOptions = routeLibrary
      .map((entry) => `
        <option value="${escapeHtml(entry.name)}">
          ${escapeHtml(entry.active ? `${entry.name} / active` : entry.name)}
        </option>
      `)
      .join("");
    routeLibrarySelect.innerHTML = routeOptions;
    routeLibraryQuickSelect.innerHTML = routeOptions;
    markMainWindowTooltipsDirty();
  }
  if (routeLibrarySelect.value !== selectedName) {
    routeLibrarySelect.value = selectedName;
  }
  if (routeLibraryQuickSelect.value !== selectedName) {
    routeLibraryQuickSelect.value = selectedName;
  }
  const selectedRouteMeta = formatRouteLibraryMeta(
    routeLibrary.find((entry) => entry.name === selectedName) || null,
  );
  routeLibraryMeta.textContent = selectedRouteMeta;
  routeLibraryMeta.title = selectedRouteMeta;
  routeLibraryQuickMeta.textContent = selectedRouteMeta;
  routeLibraryQuickMeta.title = selectedRouteMeta;
  routeLibraryRenderedKey = renderKey;
}

function getAccountRegistry() {
  return Array.isArray(state?.accounts) ? state.accounts : [];
}

function buildAccountStorageKey(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "account";
}

function normalizeAccountCharacterList(value = []) {
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

function getBlankAccountDraft() {
  const preferredCharacter = String(
    state?.binding?.characterName
    || state?.binding?.displayName
    || "",
  ).trim();

  return {
    id: "",
    label: "",
    loginMethod: "account-password",
    loginName: "",
    password: "",
    secretStorage: "local-file",
    characters: preferredCharacter ? [preferredCharacter] : [],
    preferredCharacter,
    reconnectPolicy: "preferred-character",
    notes: "",
  };
}

function syncAccountMethodFieldState(loginMethod = "account-password", secretStorage = "local-file") {
  const manual = String(loginMethod || "").trim() === "manual";

  if (accountPasswordField) {
    accountPasswordField.disabled = manual;
    if (manual && accountPasswordField.value !== "") {
      accountPasswordField.value = "";
    }
  }

  if (accountSecretStorageField) {
    accountSecretStorageField.disabled = manual;
    if (manual) {
      accountSecretStorageField.value = "none";
    } else if (!accountSecretStorageField.value || accountSecretStorageField.value === "none") {
      accountSecretStorageField.value = secretStorage || "local-file";
    }
  }
}

function applyAccountDraftToDom(draft = getBlankAccountDraft()) {
  if (accountIdField) accountIdField.value = String(draft.id || "");
  if (accountLabelField) accountLabelField.value = String(draft.label || "");
  if (accountLoginMethodField) accountLoginMethodField.value = String(draft.loginMethod || "account-password");
  if (accountLoginNameField) accountLoginNameField.value = String(draft.loginName || "");
  if (accountPasswordField) accountPasswordField.value = String(draft.password || "");
  if (accountPreferredCharacterField) accountPreferredCharacterField.value = String(draft.preferredCharacter || "");
  if (accountReconnectPolicyField) accountReconnectPolicyField.value = String(draft.reconnectPolicy || "preferred-character");
  if (accountSecretStorageField) accountSecretStorageField.value = String(draft.secretStorage || "local-file");
  if (accountCharactersField) accountCharactersField.value = normalizeAccountCharacterList(draft.characters || []).join("\n");
  if (accountNotesField) accountNotesField.value = String(draft.notes || "");
  syncAccountMethodFieldState(draft.loginMethod, draft.secretStorage);
}

function captureAccountDraftFromDom() {
  const loginMethod = String(accountLoginMethodField?.value || "account-password").trim();
  const manual = loginMethod === "manual";
  const preferredCharacter = String(accountPreferredCharacterField?.value || "").trim();
  const characters = normalizeAccountCharacterList(accountCharactersField?.value || "");
  if (
    preferredCharacter
    && !characters.some((entry) => entry.toLowerCase() === preferredCharacter.toLowerCase())
  ) {
    characters.unshift(preferredCharacter);
  }

  accountDraftDirty = true;
  accountDraft = {
    id: String(accountIdField?.value || "").trim(),
    label: String(accountLabelField?.value || "").trim(),
    loginMethod,
    loginName: String(accountLoginNameField?.value || "").trim(),
    password: manual ? "" : String(accountPasswordField?.value || "").trim(),
    secretStorage: manual
      ? "none"
      : String(accountSecretStorageField?.value || "local-file").trim(),
    characters,
    preferredCharacter,
    reconnectPolicy: String(accountReconnectPolicyField?.value || "preferred-character").trim(),
    notes: String(accountNotesField?.value || "").trim(),
  };
  return accountDraft;
}

function resolveSelectedAccountId(accounts = getAccountRegistry()) {
  if (accountDraftNewEntry) {
    return "";
  }

  const accountIds = new Set(accounts.map((entry) => String(entry.id || "")));
  if (selectedAccountId && accountIds.has(selectedAccountId)) {
    return selectedAccountId;
  }

  const activeMatch = accounts.find((entry) => entry.activeCharacterMatch);
  if (activeMatch?.id) {
    return String(activeMatch.id);
  }

  return String(accounts[0]?.id || "");
}

function getSelectedAccountEntry(accounts = getAccountRegistry()) {
  const selectedId = resolveSelectedAccountId(accounts);
  return accounts.find((entry) => String(entry.id || "") === selectedId) || null;
}

function formatAccountMeta(account = null) {
  if (!account) {
    return "No saved account registry entries yet.";
  }

  const parts = [];
  if (account.activeCharacterMatch) {
    parts.push("active character linked");
  }
  parts.push(
    `${Number(account.characterCount ?? account.characters?.length ?? 0)} character${Number(account.characterCount ?? account.characters?.length ?? 0) === 1 ? "" : "s"}`,
  );
  parts.push(account.loginMethod === "manual" ? "manual login" : account.loginMethod);
  parts.push(account.preferredCharacter ? `preferred ${account.preferredCharacter}` : "no preferred character");
  parts.push(account.hasPassword || account.password ? account.secretStorage : "no stored secret");
  return parts.join(" / ");
}

function getAccountRegistryRenderKey(accounts = getAccountRegistry()) {
  const selectedId = resolveSelectedAccountId(accounts);
  const entriesKey = accounts
    .map((entry) => [
      entry.id,
      entry.label,
      entry.loginMethod,
      entry.loginName,
      entry.secretStorage,
      entry.preferredCharacter,
      entry.reconnectPolicy,
      Array.isArray(entry.characters) ? entry.characters.join(",") : "",
      entry.activeCharacterMatch ? "1" : "0",
      entry.hasPassword || entry.password ? "1" : "0",
      entry.updatedAt,
    ].join(":"))
    .join("|");

  return `${selectedId}::${entriesKey}`;
}

function renderAccountRegistry() {
  if (!accountSelect || !accountMeta) {
    return;
  }

  const accounts = getAccountRegistry();
  const selectedId = resolveSelectedAccountId(accounts);
  const renderKey = getAccountRegistryRenderKey(accounts);
  selectedAccountId = selectedId;

  if (accountRegistryRenderedKey !== renderKey) {
    const accountOptions = accounts
      .map((entry) => `
          <option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label || entry.id)}</option>
        `)
      .join("");
    accountSelect.innerHTML = `
      <option value="">New account draft</option>
      ${accountOptions}
    `;
    markMainWindowTooltipsDirty();
  }

  if (accountSelect.value !== selectedId) {
    accountSelect.value = selectedId;
  }

  const selectedAccount = getSelectedAccountEntry(accounts);
  const metaText = formatAccountMeta(selectedAccount);
  accountMeta.textContent = metaText;
  accountMeta.title = metaText;

  if (!accountDraft || (!accountDraftDirty && String(accountDraft.id || "") !== selectedId)) {
    accountDraft = selectedAccount ? cloneValue(selectedAccount) : getBlankAccountDraft();
    accountDraftDirty = false;
    accountDraftRenderedKey = "";
  }

  const draftRenderKey = JSON.stringify({
    ...accountDraft,
    characters: normalizeAccountCharacterList(accountDraft?.characters || []),
  });
  if (!accountDraftDirty && accountDraftRenderedKey !== draftRenderKey) {
    applyAccountDraftToDom(accountDraft);
    accountDraftRenderedKey = draftRenderKey;
  } else {
    syncAccountMethodFieldState(
      accountLoginMethodField?.value || accountDraft?.loginMethod || "account-password",
      accountSecretStorageField?.value || accountDraft?.secretStorage || "local-file",
    );
  }

  if (actionButtons.deleteAccount) {
    actionButtons.deleteAccount.disabled = !selectedAccount;
  }

  accountRegistryRenderedKey = renderKey;
}

function renderRouteOverview(routeProfile = state?.routeProfile, waypoints = getWaypoints(), {
  livePreview = true,
} = {}) {
  const tileRules = getTileRules();
  const routeName = getCurrentRouteName();
  const savedRouteCount = getRouteLibrary().length;
  const routeResetStatus = getRouteResetStatus();
  const autowalkState = getAutowalkEffectiveState(state?.options || {}, state);
  const focusIndex = waypoints.length
    ? Math.max(0, Math.min(selectedWaypointIndex, waypoints.length - 1))
    : null;

  const renderKey = [
    routeName,
    waypoints.length,
    tileRules.length,
    focusIndex == null ? "" : formatWaypointHeading(waypoints[focusIndex], focusIndex),
    savedRouteCount,
    routeResetStatus.active ? "1" : "0",
    routeResetStatus.phase || "",
    routeResetStatus.targetIndex ?? -1,
    autowalkState.state,
    autowalkState.label,
    autowalkState.detail,
  ].join("::");

  if (routeOverviewRenderedKey !== renderKey) {
    setTextContent(routeOverviewFields.name, routeName || "Blank draft");
    setTextContent(
      routeOverviewFields.count,
      String(waypoints.length),
    );
    setTextContent(
      routeOverviewFields.rules,
      String(tileRules.length),
    );
    setTextContent(
      routeOverviewFields.focus,
      focusIndex == null ? "No waypoint" : formatWaypointHeading(waypoints[focusIndex], focusIndex),
    );
    setTextContent(
      routeOverviewFields.library,
      String(savedRouteCount),
    );

    if (routeOverviewCard) {
      const titleParts = [
        "Route",
        routeName || "Blank draft",
        `${waypoints.length} waypoint${waypoints.length === 1 ? "" : "s"}`,
        `${tileRules.length} tile rule${tileRules.length === 1 ? "" : "s"}`,
        savedRouteCount
          ? `${savedRouteCount} saved route file${savedRouteCount === 1 ? "" : "s"}`
          : "No saved route files",
        focusIndex == null ? "No waypoint selected" : `Selected ${formatWaypointHeading(waypoints[focusIndex], focusIndex)}`,
        "Open saved routes quick pick",
      ];
      routeOverviewCard.dataset.titleDefault = titleParts.join(" / ");
      routeOverviewCard.title = routeOverviewCard.dataset.titleDefault;
      routeOverviewCard.setAttribute("aria-label", titleParts.join(", "));
    }

    if (routeOverviewFields.note) {
      const routeResetNote = routeResetStatus.active && routeResetStatus.phase !== "holding"
        ? `Return active. Returning to waypoint ${routeResetStatus.targetIndex + 1}; alarm will beep on arrival.`
        : "";
      const blockerNote = autowalkState.state === "blocked"
        ? autowalkState.detail
        : "";
      const noteText = routeResetNote || blockerNote;
      routeOverviewFields.note.hidden = !noteText;
      routeOverviewFields.note.textContent = noteText;
    }

    routeOverviewRenderedKey = renderKey;
    markMainWindowTooltipsDirty();
  }

  if (livePreview) {
    renderRouteLivePreview(waypoints);
  }
}

function renderWaypointTypeHelp(type = document.getElementById("waypoint-type")?.value || "walk") {
  if (!waypointTypeHelp) return;
  waypointTypeHelp.textContent = WAYPOINT_TYPE_HELP[String(type || "walk").trim().toLowerCase()]
    || WAYPOINT_TYPE_HELP.walk;
}

function renderRouteItemSharedFields(item = {}) {
  setInputValue("route-item-label", item?.label ?? "");
  setInputValue("route-item-x", item?.x ?? "");
  setInputValue("route-item-y", item?.y ?? "");
  setInputValue("route-item-z", item?.z ?? "");
}

function renderWaypointActionEditor(waypoint, waypoints = getWaypoints()) {
  if (!waypointActionFields || !waypointActionHelp) return;

  const type = String(waypoint?.type || "walk").trim().toLowerCase();
  const isAction = type === "action";
  waypointActionFields.hidden = !isAction;
  waypointActionHelp.hidden = !isAction;

  if (!isAction) {
    return;
  }

  const actionType = normalizeWaypointActionType(waypoint?.action);
  const targetIndex = normalizeWaypointTargetIndex(waypoint?.targetIndex);

  setInputValue("waypoint-action", actionType);
  const targetSelect = document.getElementById("waypoint-action-target");
  if (!targetSelect) return;

  const options = [
    '<option value="">Select waypoint</option>',
    ...waypoints
      .map((entry, index) => {
        if (index === selectedWaypointIndex) {
          return "";
        }
        const label = `${formatWaypointOrdinal(index)}. ${getWaypointDisplayLabel(entry, index)} / ${formatPosition(entry)}`;
        return `
          <option value="${index}" ${targetIndex === index ? "selected" : ""}>
            ${escapeHtml(label)}
          </option>
        `;
      })
      .filter(Boolean),
  ];

  targetSelect.innerHTML = options.join("");
  targetSelect.disabled = actionType !== "goto";
  if (actionType !== "goto") {
    targetSelect.value = "";
  } else if (targetIndex == null || targetIndex === selectedWaypointIndex) {
    targetSelect.value = "";
  }
}

function renderWaypointEditorDetails(waypoint, waypoints = getWaypoints()) {
  renderWaypointTypeHelp(waypoint?.type || "walk");
  renderWaypointActionEditor(waypoint, waypoints);
}

function renderTileRulePolicyHelp(policy = document.getElementById("tile-rule-policy")?.value || "avoid") {
  if (!tileRulePolicyHelp) return;
  tileRulePolicyHelp.textContent = TILE_RULE_POLICY_HELP[normalizeTileRulePolicy(policy)] || TILE_RULE_POLICY_HELP.avoid;
}

function getTileRuleListRenderKey(tileRules = getTileRules()) {
  const tileRuleKey = tileRules
    .map((rule, index) => [
      index,
      rule.id,
      rule.enabled !== false ? 1 : 0,
      rule.label,
      rule.x,
      rule.y,
      rule.z,
      rule.shape,
      rule.width,
      rule.height,
      rule.trigger,
      rule.policy,
      rule.waitMs,
      rule.cooldownMs,
    ].join(":"))
    .join("|");

  return `tile::${selectedTileRuleIndex}::${tileRuleKey}`;
}

function renderTileRuleList(tileRules = getTileRules()) {
  if (!tileRuleList) return;

  const renderKey = getTileRuleListRenderKey(tileRules);
  if (tileRuleList.dataset.renderKey === renderKey) {
    return;
  }

  const previousScrollTop = tileRuleList.scrollTop;
  tileRuleList.innerHTML = tileRules.length
    ? tileRules
      .map((rule, index) => `
        <button
          type="button"
          class="waypoint-row ${index === selectedTileRuleIndex ? "selected" : ""}"
          data-tile-rule-index="${index}"
          aria-pressed="${index === selectedTileRuleIndex ? "true" : "false"}"
        >
          <div class="waypoint-row-head">
            <span class="waypoint-row-index">${formatWaypointOrdinal(index)}</span>
            <strong>${escapeHtml(getTileRuleDisplayLabel(rule, index))}</strong>
            <div class="waypoint-row-flags">
              <span class="waypoint-pill waypoint-type-pill">${escapeHtml(getTileRulePolicyLabel(rule.policy))}</span>
              ${rule.enabled !== false ? "" : '<span class="waypoint-pill waypoint-state-pill selected">Off</span>'}
            </div>
          </div>
          <div class="meta">${escapeHtml(formatTileRuleMeta(rule))}</div>
        </button>
      `)
      .join("")
    : '<div class="empty-state">No tile rules in route stack</div>';
  tileRuleList.scrollTop = previousScrollTop;
  tileRuleList.dataset.renderKey = renderKey;
  markMainWindowTooltipsDirty();
}

function renderTileRuleEditor(rule = getSelectedTileRule(getTileRules()), tileRules = getTileRules()) {
  const selected = rule || {
    enabled: true,
    shape: "tile",
    width: 1,
    height: 1,
    trigger: "approach",
    policy: "avoid",
    waitMs: 1200,
    cooldownMs: 0,
    exactness: "exact",
    vicinityRadius: 0,
  };

  setCheckboxValue("tile-rule-enabled", selected.enabled !== false);
  setInputValue("tile-rule-shape", normalizeTileRuleShape(selected.shape));
  setInputValue("tile-rule-width", Math.max(1, Number(selected.width) || 1));
  setInputValue("tile-rule-height", Math.max(1, Number(selected.height) || 1));
  setInputValue("tile-rule-trigger", normalizeTileRuleTrigger(selected.trigger));
  setInputValue("tile-rule-policy", normalizeTileRulePolicy(selected.policy));
  setInputValue("tile-rule-wait-ms", Math.max(0, Number(selected.waitMs) || 0));
  setInputValue("tile-rule-cooldown-ms", Math.max(0, Number(selected.cooldownMs) || 0));
  setInputValue("tile-rule-exactness", normalizeTileRuleExactness(selected.exactness));
  setInputValue("tile-rule-vicinity-radius", Math.max(0, Number(selected.vicinityRadius) || 0));

  const shape = normalizeTileRuleShape(selected.shape);
  const widthField = document.getElementById("tile-rule-width");
  const heightField = document.getElementById("tile-rule-height");
  if (widthField) widthField.disabled = shape !== "rect";
  if (heightField) heightField.disabled = shape !== "rect";
  renderTileRulePolicyHelp(selected.policy);
  renderTileRuleSelectionSummary(tileRules);
}

function getTileRuleEditorPatch() {
  const x = getNumberFieldValue("route-item-x");
  const y = getNumberFieldValue("route-item-y");
  const z = getNumberFieldValue("route-item-z");

  if (x == null) return { error: "Tile rule X must be a valid number.", fieldId: "route-item-x" };
  if (y == null) return { error: "Tile rule Y must be a valid number.", fieldId: "route-item-y" };
  if (z == null) return { error: "Tile rule Z must be a valid number.", fieldId: "route-item-z" };

  const shape = normalizeTileRuleShape(document.getElementById("tile-rule-shape")?.value);
  const policy = normalizeTileRulePolicy(document.getElementById("tile-rule-policy")?.value);

  return {
    patch: {
      enabled: document.getElementById("tile-rule-enabled")?.checked !== false,
      label: getTrimmedFieldValue("route-item-label"),
      x,
      y,
      z,
      shape,
      width: shape === "rect" ? getNumberFieldValue("tile-rule-width", { fallback: 1, minimum: 1 }) : 1,
      height: shape === "rect" ? getNumberFieldValue("tile-rule-height", { fallback: 1, minimum: 1 }) : 1,
      trigger: normalizeTileRuleTrigger(document.getElementById("tile-rule-trigger")?.value),
      policy,
      waitMs: policy === "wait" ? getNumberFieldValue("tile-rule-wait-ms", { fallback: 1200, minimum: 0 }) : 0,
      cooldownMs: getNumberFieldValue("tile-rule-cooldown-ms", { fallback: 0, minimum: 0 }),
      exactness: normalizeTileRuleExactness(document.getElementById("tile-rule-exactness")?.value),
      vicinityRadius: getNumberFieldValue("tile-rule-vicinity-radius", { fallback: 0, minimum: 0 }),
    },
  };
}

function getWaypointEditorPatch() {
  const x = getNumberFieldValue("route-item-x");
  const y = getNumberFieldValue("route-item-y");
  const z = getNumberFieldValue("route-item-z");

  if (x == null) {
    return { error: "Waypoint X must be a valid number.", fieldId: "route-item-x" };
  }
  if (y == null) {
    return { error: "Waypoint Y must be a valid number.", fieldId: "route-item-y" };
  }
  if (z == null) {
    return { error: "Waypoint Z must be a valid number.", fieldId: "route-item-z" };
  }

  const waypointType = getTrimmedFieldValue("waypoint-type") || "walk";
  const radius = getNumberFieldValue("waypoint-step-radius", { fallback: null, minimum: 0 });
  const patch = {
    x,
    y,
    z,
    label: getTrimmedFieldValue("route-item-label"),
    type: waypointType,
    radius: radius != null && radius > 0 ? radius : null,
  };

  if (waypointType !== "action") {
    return { patch };
  }

  const actionType = normalizeWaypointActionType(document.getElementById("waypoint-action")?.value);
  patch.action = actionType;

  if (actionType !== "goto") {
    patch.targetIndex = null;
    return { patch };
  }

  const targetIndex = getNumberFieldValue("waypoint-action-target", { fallback: null, minimum: 0 });
  if (targetIndex == null || targetIndex === selectedWaypointIndex) {
    return {
      error: "Choose another waypoint as the jump target.",
      fieldId: "waypoint-action-target",
    };
  }

  patch.targetIndex = targetIndex;
  return { patch };
}

function setDetailedTileState(button, {
  active = false,
  pressed = active,
  label = active ? "On" : "Off",
  state = active ? "on" : "off",
  title = "",
} = {}) {
  if (!button) return;
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  const status = button.querySelector("strong");
  if (status) {
    status.textContent = label;
  }
  const card = button.closest(".quick-module-card, .route-toggle-card, .compact-split-card");
  if (card) {
    card.dataset.state = state;
  }
  const titleLabel = card?.querySelector(".quick-module-open span, .route-toggle-open span, .compact-card-open span")?.textContent?.trim()
    || button.querySelector("span")?.textContent?.trim()
    || "State";
  button.dataset.titleDefault = title || `${titleLabel}: ${label}`;
  button.title = button.dataset.titleDefault;
  button.setAttribute("aria-label", button.dataset.titleDefault);
}

function setTileState(button, enabled, onLabel = "On", offLabel = "Off") {
  if (enabled && typeof enabled === "object" && !Array.isArray(enabled)) {
    const pressed = Boolean(enabled.pressed ?? enabled.rawEnabled ?? enabled.effectiveEnabled ?? enabled.enabled);
    const effectiveEnabled = Boolean(enabled.effectiveEnabled ?? enabled.enabled ?? pressed);
    const label = String(enabled.label || (effectiveEnabled ? onLabel : offLabel)).trim() || offLabel;
    const state = String(enabled.state || (effectiveEnabled ? "on" : "off")).trim().toLowerCase() || "off";
    const detail = String(enabled.detail || "").trim();
    const titleLabel = button.closest(".quick-module-card, .route-toggle-card, .compact-split-card")
      ?.querySelector(".quick-module-open span, .route-toggle-open span, .compact-card-open span")
      ?.textContent?.trim()
      || button.querySelector("span")?.textContent?.trim()
      || "State";
    setDetailedTileState(button, {
      active: state === "on",
      pressed,
      label,
      state,
      title: `${titleLabel}: ${label}${detail ? ` / ${detail}` : ""}`,
    });
    return;
  }

  setDetailedTileState(button, {
    active: Boolean(enabled),
    pressed: Boolean(enabled),
    label: Boolean(enabled) ? onLabel : offLabel,
    state: Boolean(enabled) ? "on" : "off",
  });
}

function setMirroredTileState(key, enabled, onLabel = "On", offLabel = "Off") {
  [quickButtons[key], compactQuickButtons[key]].forEach((button) => {
    setTileState(button, enabled, onLabel, offLabel);
  });
}

function syncTextTitle(element) {
  if (!(element instanceof HTMLElement)) return;
  const text = String(element.textContent || "").trim();
  element.title = text;
}

function markMainWindowTooltipsDirty() {
  mainWindowTooltipsDirty = true;
}

function syncActionCardTitles() {
  document.querySelectorAll(".quick-module-open, .route-toggle-open, .compact-card-open").forEach((button) => {
    const parts = Array.from(button.querySelectorAll("span, strong"))
      .map((node) => node.textContent?.trim() || "")
      .filter(Boolean);
    const headline = parts[0] || "Settings";
    const summary = parts.slice(1).join(" / ");
    const action = button.classList.contains("route-toggle-open") || button.hasAttribute("data-focus-route-builder")
      ? `Open route builder and focus ${headline.toLowerCase()} settings.`
      : button.hasAttribute("data-proxy-click")
        ? `${headline}.`
        : `Open ${headline.toLowerCase()} settings.`;
    button.dataset.titleDefault = summary ? `${action} ${summary}` : action;
    button.title = button.dataset.titleDefault;
  });
}

function normalizeViewMode(mode) {
  return mode === "compact" ? "compact" : "desk";
}

function syncViewModeUi() {
  uiViewMode = normalizeViewMode(uiViewMode);
  const compact = uiViewMode === "compact";

  if (appShell) {
    appShell.dataset.viewMode = uiViewMode;
  }

  if (modalLayer) {
    modalLayer.removeAttribute("data-view-mode");
  }

  if (consoleLayout) {
    consoleLayout.toggleAttribute("hidden", compact);
    consoleLayout.style.display = compact ? "none" : "grid";
  }

  if (compactLayout) {
    compactLayout.toggleAttribute("hidden", !compact);
    compactLayout.style.display = compact ? "grid" : "none";
  }

  if (compactViewButton) {
    compactViewButton.classList.toggle("active", compact);
    compactViewButton.setAttribute("aria-pressed", compact ? "true" : "false");
  }

  syncDeskActionTitles();
}

async function setViewMode(mode, { syncWindow = true } = {}) {
  const previousMode = uiViewMode;
  uiViewMode = normalizeViewMode(mode);
  syncViewModeUi();

  if (!syncWindow || typeof window.bbApi?.setViewMode !== "function") {
    return true;
  }

  setBusy(compactViewButton, true);
  try {
    await window.bbApi.setViewMode(uiViewMode);
    return true;
  } catch (error) {
    console.error(error);
    uiViewMode = previousMode;
    syncViewModeUi();
    flashStatus(`Unable to switch view: ${error.message}`, "error", 3600);
    return false;
  } finally {
    setBusy(compactViewButton, false);
  }
}

function renderCompactPanel() {
  const options = state?.options || {};
  const monsterCount = sanitizeTargetMonsterNames(options.monster).length;
  const waypoints = options.waypoints || [];
  const alarmSummary = getAlarmSummaryData(options);

  setTextContent(
    compactPanelFields.targeting,
    monsterCount ? `${monsterCount} mob${monsterCount === 1 ? "" : "s"}` : "No queue",
  );
  setTextContent(
    compactPanelFields.waypointCount,
    `${waypoints.length} pt${waypoints.length === 1 ? "" : "s"}`,
  );
  setTextContent(compactPanelFields.healer, summaryFields.healer?.textContent || "-");
  setTextContent(compactPanelFields.deathHeal, summaryFields.deathHeal?.textContent || "-");
  setTextContent(compactPanelFields.mana, summaryFields.mana?.textContent || "-");
  setTextContent(compactPanelFields.autoEat, summaryFields.autoEat?.textContent || "-");
  setTextContent(compactPanelFields.ammo, summaryFields.ammo?.textContent || "-");
  setTextContent(compactPanelFields.ringAmuletAutoReplace, summaryFields.ringAmuletAutoReplace?.textContent || "-");
  setTextContent(compactPanelFields.rune, summaryFields.rune?.textContent || "-");
  setTextContent(compactPanelFields.spell, summaryFields.spell?.textContent || "-");
  setTextContent(compactPanelFields.light, summaryFields.light?.textContent || "-");
  setTextContent(compactPanelFields.convert, summaryFields.convert?.textContent || "-");
  setTextContent(compactPanelFields.fieldSafe, summaryFields.fieldSafe?.textContent || "-");
  setTextContent(compactPanelFields.looting, summaryFields.looting?.textContent || "-");
  setTextContent(compactPanelFields.banking, summaryFields.banking?.textContent || "-");
  setTextContent(compactPanelFields.trainer, summaryFields.trainer?.textContent || "-");
  setTextContent(compactPanelFields.reconnect, summaryFields.reconnect?.textContent || "-");
  setTextContent(compactPanelFields.antiIdle, summaryFields.antiIdle?.textContent || "-");
  setTextContent(compactPanelFields.alarms, alarmSummary.headline || "-");
  setTextContent(compactPanelFields.partyFollow, summaryFields.partyFollow?.textContent || "-");
  setTextContent(compactPanelFields.rookiller, summaryFields.rookiller?.textContent || "-");

  Object.values(compactPanelFields).forEach(syncTextTitle);
}

const MAIN_WINDOW_TOOLTIP_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='tab']",
  ".panel-card",
  ".quick-module-card",
  ".route-toggle-card",
  ".compact-split-card",
  ".feed-summary-card",
  ".summary-cell",
].join(", ");

const MAIN_WINDOW_TOOLTIP_OVERRIDES = {
  "compact-view": "Switch between the full desk and the portrait compact quick-actions desk.",
  "compact-open-rookiller": "Toggle rookiller. Stops at level 8 and 90%, returns to waypoint 1, then closes the live client.",
  "window-close": "Close the Minibot desktop window.",
  "route-overview-card": "Route overview panel. Open saved route files, live preview, and route controls.",
  "route-toggle-waypoints-card": "Waypoints route card. Open the route builder and focus waypoint controls.",
  "route-add-waypoint-card": "Add Waypoint card. Insert a new route step from the live character position.",
  "route-reset-card": "Return Route card. Return the runner to a chosen waypoint and hold route position.",
  "quick-open-rookiller": "Open rookiller status. Stops at level 8 and 90%, returns to waypoint 1, then closes the live client.",
};

const MAIN_WINDOW_HOVER_TOOLTIP_ID = "main-window-hover-tooltip";
const MAIN_WINDOW_HOVER_TOOLTIP_DELAY_MS = 500;
const MAIN_WINDOW_HOVER_TOOLTIP_OFFSET_X = 16;
const MAIN_WINDOW_HOVER_TOOLTIP_OFFSET_Y = 20;
const mainWindowHoverTooltipState = {
  node: null,
  timer: 0,
  trigger: null,
  visible: false,
  pointerX: 0,
  pointerY: 0,
  hasPointer: false,
};

function toSentenceCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function humanizeIdentifier(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNodeText(node) {
  if (!(node instanceof HTMLElement)) return "";
  const clone = node.cloneNode(true);
  clone.querySelectorAll("input, select, textarea, button").forEach((child) => child.remove());
  return String(clone.textContent || "").replace(/\s+/g, " ").trim();
}

function getFieldLabelText(field) {
  if (!(field instanceof HTMLElement)) return "";
  const labels = field.labels ? Array.from(field.labels) : [];
  for (const label of labels) {
    const text = getNodeText(label);
    if (text) return text;
  }
  const nearestLabel = field.closest("label");
  if (nearestLabel instanceof HTMLElement) {
    const text = getNodeText(nearestLabel);
    if (text) return text;
  }
  return "";
}

function getElementHeadingText(element) {
  if (!(element instanceof HTMLElement)) return "";
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return String(ariaLabel).trim();

  const labelledBy = String(element.getAttribute("aria-labelledby") || "").trim();
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    const labelText = getFieldLabelText(element);
    if (labelText) return labelText;
    if (element.placeholder) return element.placeholder.trim();
  }

  if (element.matches("fieldset")) {
    const legend = element.querySelector("legend");
    if (legend) {
      const text = legend.textContent?.trim() || "";
      if (text) return text;
    }
  }

  const summaryParts = Array.from(element.querySelectorAll(":scope > span, :scope > strong"))
    .map((node) => node.textContent?.trim() || "")
    .filter(Boolean);
  if (summaryParts.length) {
    return summaryParts.join(" / ");
  }

  const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text;

  if (element.id) return humanizeIdentifier(element.id);
  return humanizeIdentifier(element.className);
}

function buildMainWindowTooltip(element) {
  if (!(element instanceof HTMLElement)) return "";
  if (element.classList.contains("visually-hidden")) return "";

  const override = element.id ? MAIN_WINDOW_TOOLTIP_OVERRIDES[element.id] : "";
  if (override) return override;

  if (element.dataset.titleDefault) return element.dataset.titleDefault;
  if (element.getAttribute("title")) return element.getAttribute("title") || "";

  const label = getElementHeadingText(element);

  if (element.matches(".interactive-summary-card")) {
    return label ? `${label} panel. Open settings and live summary details.` : "Open settings and live summary details.";
  }

  if (element.matches(".quick-module-card")) {
    const heading = element.querySelector(".quick-module-open span")?.textContent?.trim() || label;
    return heading ? `${heading} module card with status summary and power toggle.` : "Module card with status summary and power toggle.";
  }

  if (element.matches(".route-toggle-card")) {
    const heading = element.querySelector(".route-toggle-open span, #route-add-waypoint-panel span")?.textContent?.trim() || label;
    return heading ? `${heading} route card with live action controls.` : "Route card with live action controls.";
  }

  if (element.matches(".compact-split-card")) {
    const heading = element.querySelector(".compact-card-open span")?.textContent?.trim() || label;
    const hasToggle = Boolean(element.querySelector(".compact-card-toggle"));
    if (heading) {
      return hasToggle
        ? `${heading} compact card with open and live toggle controls.`
        : `${heading} compact quick-action card.`;
    }
    return hasToggle
      ? "Compact card with open and live toggle controls."
      : "Compact quick-action card.";
  }

  if (element.matches(".feed-summary-card")) {
    return label ? `${toSentenceCase(label)}. Recent activity summary.` : "Recent activity summary.";
  }

  if (element.matches(".route-overview-metric-button")) {
    return label ? `${label} route summary metric. Opens the route builder.` : "Route summary metric. Opens the route builder.";
  }

  if (element.matches("[data-open-modal]")) {
    const modalName = humanizeIdentifier(element.dataset.openModal || label || "panel").toLowerCase();
    return `Open ${modalName} settings.`;
  }

  if (element.matches("[data-focus-route-builder]")) {
    return label
      ? `Open the route builder and focus ${label.toLowerCase()} settings.`
      : "Open the route builder and focus a related route setting.";
  }

  if (element.matches("input[type='checkbox']")) {
    const heading = getFieldLabelText(element) || label || "setting";
    return `Toggle ${heading.toLowerCase()}.`;
  }

  if (element.matches("input[type='number']")) {
    const heading = getFieldLabelText(element) || label || "value";
    return `Set ${heading.toLowerCase()}.`;
  }

  if (element.matches("input[type='text'], input:not([type]), input[type='search']")) {
    const heading = getFieldLabelText(element) || label || "text";
    return `Enter ${heading.toLowerCase()}.`;
  }

  if (element.matches("select")) {
    const heading = getFieldLabelText(element) || label || "option";
    return `Choose ${heading.toLowerCase()}.`;
  }

  if (element.matches("textarea")) {
    const heading = getFieldLabelText(element) || label || "text";
    return `Edit ${heading.toLowerCase()}.`;
  }

  if (element.matches("button")) {
    if (
      element.classList.contains("quick-module-toggle")
      || element.classList.contains("route-toggle-button")
      || element.classList.contains("compact-card-toggle")
    ) {
      return label ? `${label}. Click to change this live toggle.` : "Click to change this live toggle.";
    }
    if (label) return `${toSentenceCase(label)}.`;
    return "Button control.";
  }

  if (element.matches("[role='tab']")) {
    return label ? `${label}. Switches the active editor tab.` : "Switches the active editor tab.";
  }

  if (element.matches("[role='button']")) {
    return label ? `${toSentenceCase(label)}.` : "Interactive panel.";
  }

  if (element.matches(".summary-cell")) {
    return label ? `${toSentenceCase(label)} summary.` : "Summary component.";
  }

  if (element.matches(".panel-card")) {
    return label ? `${toSentenceCase(label)} panel.` : "Panel component.";
  }

  return "";
}

function syncMainWindowTooltips(root = document.body) {
  if (!(root instanceof HTMLElement || root instanceof Document)) return;
  if (mainWindowHoverTooltipState.trigger instanceof HTMLElement && !mainWindowHoverTooltipState.trigger.isConnected) {
    hideMainWindowHoverTooltip({ restoreTitle: false });
  }
  if (!mainWindowTooltipsDirty) {
    return;
  }
  root.querySelectorAll(MAIN_WINDOW_TOOLTIP_SELECTOR).forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    const tooltip = buildMainWindowTooltip(element);
    if (!tooltip) {
      delete element.dataset.hoverTooltip;
      if (mainWindowHoverTooltipState.trigger !== element) {
        element.removeAttribute("title");
      }
      return;
    }
    element.dataset.hoverTooltip = tooltip;
    if (mainWindowHoverTooltipState.trigger !== element && element.title !== tooltip) {
      element.title = tooltip;
    }
    if (mainWindowHoverTooltipState.visible && mainWindowHoverTooltipState.trigger === element) {
      const node = ensureMainWindowHoverTooltipNode();
      node.textContent = tooltip;
      positionMainWindowHoverTooltip();
    }
  });
  mainWindowTooltipsDirty = false;
}

function ensureMainWindowHoverTooltipNode() {
  if (mainWindowHoverTooltipState.node instanceof HTMLElement && mainWindowHoverTooltipState.node.isConnected) {
    return mainWindowHoverTooltipState.node;
  }

  const tooltip = document.createElement("div");
  tooltip.id = MAIN_WINDOW_HOVER_TOOLTIP_ID;
  tooltip.className = "hover-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "tooltip");
  tooltip.setAttribute("aria-hidden", "true");
  document.body.append(tooltip);
  mainWindowHoverTooltipState.node = tooltip;
  return tooltip;
}

function clearMainWindowHoverTooltipTimer() {
  if (!mainWindowHoverTooltipState.timer) return;
  window.clearTimeout(mainWindowHoverTooltipState.timer);
  mainWindowHoverTooltipState.timer = 0;
}

function getMainWindowTooltipText(element) {
  if (!(element instanceof HTMLElement)) return "";
  return String(element.dataset.hoverTooltip || buildMainWindowTooltip(element) || "").trim();
}

function restoreMainWindowTooltipTitle(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) return;
  const tooltip = getMainWindowTooltipText(element);
  if (tooltip) {
    element.title = tooltip;
  } else {
    element.removeAttribute("title");
  }
}

function suppressMainWindowTooltipTitle(element) {
  if (!(element instanceof HTMLElement)) return;
  element.removeAttribute("title");
}

function updateMainWindowHoverPointer(event) {
  const x = Number(event?.clientX);
  const y = Number(event?.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  mainWindowHoverTooltipState.pointerX = x;
  mainWindowHoverTooltipState.pointerY = y;
  mainWindowHoverTooltipState.hasPointer = true;
}

function isMainWindowTooltipTargetVisible(element) {
  if (!(element instanceof HTMLElement)) return false;

  for (let current = element; current instanceof HTMLElement; current = current.parentElement) {
    if (current.hidden || current.classList.contains("visually-hidden")) {
      return false;
    }
    if (current.getAttribute("aria-hidden") === "true") {
      return false;
    }
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    if (current === appShell) {
      break;
    }
  }

  return true;
}

function getMainWindowTooltipTrigger(target) {
  if (!(target instanceof Element)) return null;
  const trigger = target.closest(MAIN_WINDOW_TOOLTIP_SELECTOR);
  if (!(trigger instanceof HTMLElement)) return null;
  if (!(appShell instanceof HTMLElement) || !appShell.contains(trigger)) return null;
  if (modalLayer?.contains(trigger) || trigger.closest("[data-modal]")) return null;
  if (appShell.getAttribute("aria-hidden") === "true") return null;
  if (!isMainWindowTooltipTargetVisible(trigger)) return null;
  return getMainWindowTooltipText(trigger) ? trigger : null;
}

function positionMainWindowHoverTooltip() {
  if (!(mainWindowHoverTooltipState.trigger instanceof HTMLElement)) return;

  const tooltip = ensureMainWindowHoverTooltipNode();
  const tooltipRect = tooltip.getBoundingClientRect();
  const triggerRect = mainWindowHoverTooltipState.trigger.getBoundingClientRect();
  const viewportWidth = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 0;
  const viewportHeight = Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 0;
  const tooltipWidth = tooltipRect.width || Math.min(320, Math.max(180, tooltip.textContent.length * 6));
  const tooltipHeight = tooltipRect.height || 42;

  let left = mainWindowHoverTooltipState.hasPointer
    ? mainWindowHoverTooltipState.pointerX + MAIN_WINDOW_HOVER_TOOLTIP_OFFSET_X
    : triggerRect.left + (triggerRect.width / 2);
  let top = mainWindowHoverTooltipState.hasPointer
    ? mainWindowHoverTooltipState.pointerY + MAIN_WINDOW_HOVER_TOOLTIP_OFFSET_Y
    : triggerRect.bottom + 12;

  if (viewportWidth > 0) {
    left = Math.min(left, viewportWidth - tooltipWidth - 8);
  }
  left = Math.max(8, left);

  if (viewportHeight > 0 && top + tooltipHeight > viewportHeight - 8) {
    top = mainWindowHoverTooltipState.hasPointer
      ? mainWindowHoverTooltipState.pointerY - tooltipHeight - MAIN_WINDOW_HOVER_TOOLTIP_OFFSET_Y
      : triggerRect.top - tooltipHeight - 12;
  }
  top = Math.max(8, top);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hideMainWindowHoverTooltip({ restoreTitle = true } = {}) {
  clearMainWindowHoverTooltipTimer();
  const previousTrigger = mainWindowHoverTooltipState.trigger;
  mainWindowHoverTooltipState.trigger = null;
  mainWindowHoverTooltipState.visible = false;
  mainWindowHoverTooltipState.hasPointer = false;

  if (restoreTitle) {
    restoreMainWindowTooltipTitle(previousTrigger);
  }

  const tooltip = ensureMainWindowHoverTooltipNode();
  tooltip.hidden = true;
  tooltip.dataset.visible = "false";
  tooltip.setAttribute("aria-hidden", "true");
  tooltip.textContent = "";
}

function showMainWindowHoverTooltip() {
  clearMainWindowHoverTooltipTimer();
  const trigger = mainWindowHoverTooltipState.trigger;
  if (!(trigger instanceof HTMLElement) || !trigger.isConnected) {
    hideMainWindowHoverTooltip({ restoreTitle: false });
    return;
  }

  const tooltipText = getMainWindowTooltipText(trigger);
  if (!tooltipText || !isMainWindowTooltipTargetVisible(trigger)) {
    hideMainWindowHoverTooltip();
    return;
  }

  const tooltip = ensureMainWindowHoverTooltipNode();
  tooltip.textContent = tooltipText;
  tooltip.hidden = false;
  tooltip.dataset.visible = "true";
  tooltip.setAttribute("aria-hidden", "false");
  mainWindowHoverTooltipState.visible = true;
  positionMainWindowHoverTooltip();
}

function scheduleMainWindowHoverTooltip(trigger, event) {
  if (!(trigger instanceof HTMLElement)) {
    hideMainWindowHoverTooltip();
    return;
  }

  const tooltipText = getMainWindowTooltipText(trigger);
  if (!tooltipText) {
    hideMainWindowHoverTooltip();
    return;
  }

  updateMainWindowHoverPointer(event);

  if (mainWindowHoverTooltipState.trigger === trigger) {
    if (mainWindowHoverTooltipState.visible) {
      positionMainWindowHoverTooltip();
    }
    return;
  }

  hideMainWindowHoverTooltip();
  mainWindowHoverTooltipState.trigger = trigger;
  suppressMainWindowTooltipTitle(trigger);
  mainWindowHoverTooltipState.timer = window.setTimeout(() => {
    if (mainWindowHoverTooltipState.trigger !== trigger) return;
    showMainWindowHoverTooltip();
  }, MAIN_WINDOW_HOVER_TOOLTIP_DELAY_MS);
}

function initMainWindowHoverTooltips() {
  ensureMainWindowHoverTooltipNode();

  document.addEventListener("mouseover", (event) => {
    const trigger = getMainWindowTooltipTrigger(event.target);
    if (!trigger) return;
    scheduleMainWindowHoverTooltip(trigger, event);
  });

  document.addEventListener("mousemove", (event) => {
    const trigger = getMainWindowTooltipTrigger(event.target);
    if (!trigger || trigger !== mainWindowHoverTooltipState.trigger) return;
    updateMainWindowHoverPointer(event);
    if (mainWindowHoverTooltipState.visible) {
      positionMainWindowHoverTooltip();
    }
  });

  document.addEventListener("mouseout", (event) => {
    const currentTrigger = getMainWindowTooltipTrigger(event.target);
    if (!currentTrigger || currentTrigger !== mainWindowHoverTooltipState.trigger) return;
    const relatedTrigger = getMainWindowTooltipTrigger(event.relatedTarget);
    if (relatedTrigger === currentTrigger) return;
    hideMainWindowHoverTooltip();
  });

  document.addEventListener("mousedown", () => {
    hideMainWindowHoverTooltip();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideMainWindowHoverTooltip();
    }
  });

  document.addEventListener("scroll", () => {
    hideMainWindowHoverTooltip();
  }, true);

  window.addEventListener("blur", () => {
    hideMainWindowHoverTooltip();
  });

  window.addEventListener("resize", () => {
    hideMainWindowHoverTooltip();
  });
}

function syncDeskActionTitles(lifecycle = getDeskLifecycle()) {
  const hasTabs = hasSessionTabs();
  const pinned = Boolean(state?.alwaysOnTop ?? true);

  if (newSessionButton) {
    newSessionButton.dataset.titleDefault = "Launch a new Minibia client window.";
    newSessionButton.title = newSessionButton.dataset.titleDefault;
  }

  if (killSessionButton) {
    killSessionButton.dataset.titleDefault = lifecycle.bound
      ? "Close the active live character tab."
      : "Select a live character tab first.";
    killSessionButton.title = killSessionButton.dataset.titleDefault;
  }

  if (newRouteButton) {
    newRouteButton.dataset.titleDefault = lifecycle.bound
      ? "Start a fresh blank route for the active character."
      : "Select a live character tab first.";
    newRouteButton.title = newRouteButton.dataset.titleDefault;
  }

  if (refreshButton) {
    refreshButton.dataset.titleDefault = hasTabs
      ? "Sync all character tabs with the live clients."
      : "Scan for live Minibia client tabs.";
    refreshButton.title = refreshButton.dataset.titleDefault;
  }

  if (compactViewButton) {
    compactViewButton.dataset.titleDefault = uiViewMode === "compact"
      ? "Compact quick-actions desk is active. Click to return to the full landscape desk."
      : "Switch to the portrait compact quick-actions desk.";
    compactViewButton.title = compactViewButton.dataset.titleDefault;
  }

  if (windowPinButton) {
    windowPinButton.dataset.titleDefault = pinned
      ? "Desk is pinned above other windows. Click to let it float normally."
      : "Keep the Minibot desk pinned above other windows.";
    windowPinButton.title = windowPinButton.dataset.titleDefault;
  }

}

function syncWindowPinControls() {
  const pinned = Boolean(state?.alwaysOnTop ?? true);

  if (windowPinButton) {
    setTextContent(windowPinButton, pinned ? "Desk Pinned" : "Pin Desk");
    windowPinButton.classList.toggle("active", pinned);
    windowPinButton.setAttribute("aria-pressed", pinned ? "true" : "false");
  }
}

function resolveButtons(buttons) {
  const resolved = [];
  for (const target of normalizeControlTargets(buttons)) {
    const candidates = [
      resolveControlElement(target),
      target?.element,
    ];
    for (const element of candidates) {
      if (!(element instanceof HTMLElement) || resolved.includes(element)) continue;
      resolved.push(element);
    }
  }
  return resolved;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForFeedbackCloseDelay(durationMs = ACTION_FEEDBACK_MS) {
  await wait(0);
  await wait(durationMs);
}

function cancelFeedbackTimer(timer) {
  if (!timer) return;
  if (typeof timer.cancel === "function") {
    timer.cancel();
    return;
  }
  window.clearTimeout(timer);
}

function deferFeedbackTimer(callback, durationMs) {
  let expiryTimer = null;
  const armTimer = window.setTimeout(() => {
    expiryTimer = window.setTimeout(callback, durationMs);
  }, 0);

  return {
    cancel() {
      window.clearTimeout(armTimer);
      if (expiryTimer) {
        window.clearTimeout(expiryTimer);
      }
    },
  };
}

function clearButtonFeedback(button) {
  const timer = buttonFeedbackTimers.get(button);
  cancelFeedbackTimer(timer);
  buttonFeedbackTimers.delete(button);
  delete button.dataset.feedback;
}

function clearButtonFeedbackTarget(target) {
  if (target?.key) {
    const current = buttonFeedbackRegistry.get(target.key);
    cancelFeedbackTimer(current?.timer);
    buttonFeedbackRegistry.delete(target.key);
  }

  const button = resolveControlElement(target);
  if (button instanceof HTMLElement) {
    clearButtonFeedback(button);
  }
}

function syncButtonFeedbackState() {
  for (const entry of buttonFeedbackRegistry.values()) {
    const button = resolveControlElement(entry.target);
    if (button instanceof HTMLElement) {
      button.dataset.feedback = entry.feedback;
    }
  }
}

function showButtonFeedback(buttons, feedback, durationMs) {
  const targets = normalizeControlTargets(buttons);
  for (const target of targets) {
    if (!target?.key) continue;
    const current = buttonFeedbackRegistry.get(target.key);
    if (current?.timer) {
      cancelFeedbackTimer(current.timer);
    }
    const timer = deferFeedbackTimer(() => {
      buttonFeedbackRegistry.delete(target.key);
      const button = resolveControlElement(target);
      if (button instanceof HTMLElement && button.dataset.feedback === feedback) {
        delete button.dataset.feedback;
      }
    }, durationMs);
    buttonFeedbackRegistry.set(target.key, { target, feedback, timer });
  }

  for (const button of resolveButtons(targets)) {
    clearButtonFeedback(button);
    void button.offsetWidth;
    button.dataset.feedback = feedback;
    buttonFeedbackTimers.set(button, deferFeedbackTimer(() => {
      if (button.dataset.feedback === feedback) {
        delete button.dataset.feedback;
      }
      buttonFeedbackTimers.delete(button);
    }, durationMs));
  }
}

function applyBusyState(button, busy) {
  if (!(button instanceof HTMLElement)) return;

  if (busy) {
    clearButtonFeedback(button);
    clearPressedButton(button);
  }

  applyElementDisabledState(button, busy);
  button.dataset.busy = busy ? "true" : "false";
  button.setAttribute("aria-busy", busy ? "true" : "false");
}

function syncPersistentBusyState() {
  if (pressedButton && !pressedButton.isConnected) {
    pressedButton = null;
  }

  for (const { target } of busyControlRegistry.values()) {
    const element = resolveControlElement(target);
    if (!(element instanceof HTMLElement)) continue;
    applyBusyState(element, true);
  }
}

function setBusy(buttons, busy) {
  const targets = normalizeControlTargets(buttons);
  if (busy) {
    targets.forEach(clearButtonFeedbackTarget);
  }
  rememberBusyTargets(targets, busy);

  for (const button of resolveButtons(targets)) {
    applyBusyState(button, busy);
  }
}

function setDisabled(buttons, disabled, reason = "") {
  for (const button of resolveButtons(buttons)) {
    if (button.dataset.busy === "true") {
      applyElementDisabledState(button, true);
      continue;
    }

    applyElementDisabledState(button, disabled);
    button.title = disabled ? reason : button.dataset.titleDefault || "";
  }
}

function setWaypointAddExpanded(expanded) {
  for (const button of [actionButtons.addCurrentWaypoint]) {
    if (!button) continue;
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
}

function isWaypointAddPanelOpen() {
  return Boolean(waypointAddPanel && !waypointAddPanel.hidden);
}

function closeWaypointAddPanel() {
  if (!waypointAddPanel) return;
  waypointAddPanel.hidden = true;
  setWaypointAddExpanded(false);
}

function openWaypointAddPanel() {
  if (!waypointAddPanel) return;
  waypointAddPanel.hidden = false;
  setWaypointAddExpanded(true);
}

function toggleWaypointAddPanel(force = null) {
  if (!waypointAddPanel) return;
  const shouldOpen = force == null ? waypointAddPanel.hidden : Boolean(force);
  if (shouldOpen) {
    openWaypointAddPanel();
  } else {
    closeWaypointAddPanel();
  }
}

document.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  const target = event.target?.closest?.("button, [role='button']");
  if (!(target instanceof HTMLElement) || target.getAttribute("aria-disabled") === "true") return;

  setPressedButton(target);
});

document.addEventListener("pointerup", () => {
  clearPressedButton();
});

document.addEventListener("pointercancel", () => {
  clearPressedButton();
});

window.addEventListener("blur", () => {
  clearPressedButton();
});

document.addEventListener("keydown", (event) => {
  const target = event.target?.closest?.("[role='button']");
  if (!(target instanceof HTMLElement) || target instanceof HTMLButtonElement) {
    return;
  }

  if (target.getAttribute("aria-disabled") === "true") {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    setPressedButton(target);
    target.click();
    clearPressedButton(target);
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    setPressedButton(target);
  }
});

document.addEventListener("keyup", (event) => {
  const target = event.target?.closest?.("[role='button']");
  if (!(target instanceof HTMLElement) || target instanceof HTMLButtonElement) {
    return;
  }

  if (event.key !== " ") {
    return;
  }

  event.preventDefault();
  if (target.getAttribute("aria-disabled") !== "true") {
    target.click();
  }
  clearPressedButton(target);
});

function focusRouteBuilder(targetSelector = null) {
  const panel = activeModalName === "autowalk"
    ? getOpenModalPanel()
    : openModal("autowalk");
  routeBuilder?.scrollIntoView?.({ block: "nearest" });

  if (!targetSelector) {
    return;
  }

  const target = panel?.querySelector(targetSelector) || document.querySelector(targetSelector);
  if (target instanceof HTMLElement && !target.hasAttribute("disabled")) {
    target.focus();
  }
}

function openRouteLibraryQuickPick() {
  const panel = activeModalName === "routeLibraryPicker"
    ? getOpenModalPanel()
    : openModal("routeLibraryPicker");
  const target = panel?.querySelector("#route-library-quick-select") || routeLibraryQuickSelect;
  if (!(target instanceof HTMLElement) || target.hasAttribute("disabled")) {
    return;
  }

  target.focus();
  if (typeof target.showPicker === "function") {
    try {
      target.showPicker();
    } catch { }
  }
}

function hasUnsavedRouteChanges() {
  return autowalkDirty || waypointEditorDirty || tileRuleEditorDirty;
}

function isStateReady() {
  return Boolean(state?.options);
}

function isDeskBound() {
  return Boolean(state?.binding?.profileKey);
}

function getWaypoints() {
  return state?.options?.waypoints || [];
}

function hasWaypoints() {
  return getWaypoints().length > 0;
}

function getTileRules() {
  return state?.options?.tileRules || [];
}

function hasTileRules() {
  return getTileRules().length > 0;
}

function getInstanceBaseName(instance) {
  if (!instance) return "";
  return instance.characterName || instance.displayName || formatPage(instance.url);
}

function getInstanceGroupKey(instance) {
  if (!instance) return "";
  return String(instance.profileKey || getInstanceBaseName(instance)).trim().toLowerCase();
}

function getInstanceDuplicateCount(instance) {
  const key = getInstanceGroupKey(instance);
  if (!key) return 0;

  let count = 0;
  for (const candidate of state?.sessions || state?.instances || []) {
    if (getInstanceGroupKey(candidate) === key) {
      count += 1;
    }
  }

  return count;
}

function getInstanceDisplayName(instance) {
  if (!instance) return "";

  const name = getInstanceBaseName(instance);
  if (getInstanceDuplicateCount(instance) < 2) {
    return name;
  }

  const locator = formatPosition(instance.playerPosition);
  if (locator !== "-") {
    return `${name} @ ${locator}`;
  }

  const id = String(instance.id || "").trim();
  return id ? `${name} / ${id.slice(-6)}` : name;
}

function getBoundInstance(sourceState = state) {
  if (!sourceState?.sessions?.length) return null;
  if (!sourceState.activeSessionId) return sourceState.sessions[0] || null;
  return sourceState.sessions.find((session) => String(session.id) === String(sourceState.activeSessionId)) || sourceState.sessions[0] || null;
}

function hasSessionTabs(sourceState = state) {
  return Boolean(sourceState?.sessions?.length);
}

function isSessionAttached(session = getBoundInstance()) {
  return Boolean(session?.connected);
}

function getSelectedPageUrl(session = getBoundInstance()) {
  if (!session) return "";
  return session.page?.url || session.url || "";
}

function getBindingLabel() {
  return getInstanceDisplayName(getBoundInstance())
    || state?.binding?.label
    || state?.snapshot?.playerName
    || state?.binding?.displayName
    || "";
}

function buildEquipmentReplaceMasterTogglePayload(enabled) {
  return {
    ringAutoReplaceEnabled: enabled,
    amuletAutoReplaceEnabled: enabled,
  };
}

function isInstanceBusy(instance) {
  return Boolean(instance?.claimed && !instance?.claimedBySelf);
}

function countAvailableInstances() {
  return (state?.sessions || []).filter((instance) => instance.available).length;
}

function getModuleSummaryText(options = state?.options || {}) {
  const enabled = [];
  if (options.cavebotPaused) enabled.push("pause");
  if (options.healerEnabled) enabled.push("heal");
  if (options.manaTrainerEnabled) enabled.push("mana");
  if (options.autoEatEnabled) enabled.push("food");
  if (options.ringAutoReplaceEnabled || options.amuletAutoReplaceEnabled) enabled.push("jewel");
  if (options.runeMakerEnabled) enabled.push("runes");
  if (options.spellCasterEnabled) enabled.push("spells");
  if (options.distanceKeeperEnabled) enabled.push("kite");
  if (options.autoLightEnabled) enabled.push("light");
  if (options.autoConvertEnabled) enabled.push("coin");
  if (options.trainerEnabled) enabled.push("trainer");
  if (options.reconnectEnabled || isTrainerReconnectEnabled(options)) enabled.push("reconnect");
  if (options.antiIdleEnabled) enabled.push("anti-idle");
  if (options.partyFollowEnabled) enabled.push("follow");
  if (options.chaseMode && options.chaseMode !== "auto") enabled.push(`chase:${options.chaseMode}`);
  if (options.rookillerEnabled) enabled.push("rook8");
  if (options.once) enabled.push("once");
  if (options.dryRun) enabled.push("dry");
  if (options.avoidElementalFields === false) enabled.push("field-risk");
  return enabled.length ? enabled.join(" ") : "modules idle";
}

function getDeskLifecycle() {
  if (!state || !isStateReady()) {
    return {
      ready: false,
      bound: false,
      attached: false,
      running: false,
      phase: "loading",
      tone: "warn",
      freeClients: 0,
      hasInstances: false,
      activeSession: null,
      activeLabel: "",
      activeIsBusy: false,
      present: false,
      bindingLabel: "",
    };
  }

  const activeSession = getBoundInstance();
  const bound = isDeskBound();
  const attached = isSessionAttached(activeSession);
  const running = Boolean(state.running);
  const freeClients = countAvailableInstances();
  const hasInstances = (state.sessions || []).length > 0;
  const bindingLabel = getBindingLabel();
  const activeLabel = getInstanceDisplayName(activeSession);
  const activeIsBusy = isInstanceBusy(activeSession);
  const present = activeSession?.present !== false;

  let phase = "no-client";
  if (!hasInstances) {
    phase = "no-client";
  } else if (activeIsBusy) {
    phase = "busy";
  } else if (!present) {
    phase = "missing";
  } else if (bound && attached && running) {
    phase = "running";
  } else if (bound && attached) {
    phase = "synced";
  } else if (bound) {
    phase = "sync-needed";
  } else if (hasInstances) {
    phase = "selection-needed";
  }

  const tone = phase === "running"
    ? "live"
    : phase === "synced"
      ? "ready"
      : phase === "no-client" || phase === "missing"
        ? "error"
        : "warn";

  return {
    ready: true,
    bound,
    attached,
    running,
    phase,
    tone,
    freeClients,
    hasInstances,
    activeSession,
    activeLabel,
    activeIsBusy,
    present,
    bindingLabel,
  };
}

function getDeskIdentityTag(lifecycle = getDeskLifecycle()) {
  if (!lifecycle.ready) return "sync pending";
  if (lifecycle.running) return "bot live";
  if (lifecycle.phase === "busy") return "read only";
  if (lifecycle.phase === "missing") return "client missing";
  if (lifecycle.bound && lifecycle.attached) return "character linked";
  if (lifecycle.bound) return "sync required";
  if (lifecycle.hasInstances) return "character tabs ready";
  return "waiting for client";
}

function getDeskStatusText(lifecycle = getDeskLifecycle(), options = state?.options || {}) {
  const route = options.cavebotName || "route";
  const pauseSuffix = options.cavebotPaused ? " / paused" : "";

  switch (lifecycle.phase) {
    case "loading":
      return "Loading / sync pending";
    case "no-client":
      return "idle / waiting for live clients";
    case "selection-needed":
      return lifecycle.freeClients
        ? `idle / select character tab / ${lifecycle.freeClients} ready`
        : "idle / waiting for character tab";
    case "busy":
      return `${lifecycle.bindingLabel} / busy in another desk`;
    case "missing":
      return `${lifecycle.bindingLabel} / live client missing`;
    case "running":
      return `${lifecycle.bindingLabel} / running / attached / ${route}${pauseSuffix}`;
    case "sync-needed":
      return `${lifecycle.bindingLabel} / linked / sync needed / ${route}${pauseSuffix}`;
    case "synced":
    default:
      return `${lifecycle.bindingLabel} / linked / synced / ${route}${pauseSuffix}`;
  }
}

function getFrontStatusText(lifecycle = getDeskLifecycle(), options = state?.options || {}) {
  const walkMode = options.cavebotPaused
    ? "paused"
    : (options.autowalkLoop ? "loop" : "single");

  switch (lifecycle.phase) {
    case "loading":
      return "sync pending";
    case "no-client":
      return "no live client / open Minibia";
    case "selection-needed":
      return "select character tab / detached / idle";
    case "busy":
      return `${lifecycle.bindingLabel} / busy / ${walkMode}`;
    case "missing":
      return `${lifecycle.bindingLabel} / missing / ${walkMode}`;
    case "running":
      return `${lifecycle.bindingLabel} / running / ${walkMode}`;
    case "sync-needed":
      return `${lifecycle.bindingLabel} / sync needed / ${walkMode}`;
    case "synced":
    default:
      return `${lifecycle.bindingLabel} / synced / ${walkMode}`;
  }
}

function getQuickSummaryText(lifecycle = getDeskLifecycle(), options = state?.options || {}) {
  switch (lifecycle.phase) {
    case "loading":
      return "waiting for state";
    case "no-client":
      return "waiting for live client";
    case "selection-needed":
      return "select a character tab first";
    case "busy":
      return "active tab is locked by another desk";
    case "missing":
      return "reopen the live client to resume this tab";
    case "sync-needed":
      return `${getModuleSummaryText(options)} / sync needed`;
    case "running":
    case "synced":
    default:
      return getModuleSummaryText(options);
  }
}

function getDeskCavebotControlState(sourceState = state) {
  const liveSessions = (Array.isArray(sourceState?.sessions) ? sourceState.sessions : [])
    .filter((session) => session && session.present !== false && !session.claimed);
  const runningCount = liveSessions.filter((session) => session.running === true).length;
  const pausedCount = liveSessions.filter((session) => session.cavebotPaused === true).length;

  return {
    liveCount: liveSessions.length,
    runningCount,
    pausedCount,
    anyRunning: runningCount > 0,
    allPaused: liveSessions.length > 0 && pausedCount === liveSessions.length,
  };
}

function getRouteResetStatus(sourceState = state) {
  if (!sourceState?.routeResetActive) {
    return {
      active: false,
      phase: null,
      targetIndex: null,
    };
  }

  return {
    active: true,
    phase: String(sourceState.routeResetPhase || "").trim().toLowerCase() || "returning",
    targetIndex: Number.isFinite(Number(sourceState.routeResetTargetIndex))
      ? Number(sourceState.routeResetTargetIndex)
      : 0,
  };
}

function shouldSuppressLiveWaypointHighlights(sourceState = state) {
  const routeResetStatus = getRouteResetStatus(sourceState);
  return routeResetStatus.active && routeResetStatus.phase === "returning";
}

function getRouteSummaryText(lifecycle = getDeskLifecycle(), waypoints = getWaypoints()) {
  const waypoint = waypoints[state?.routeIndex || 0] || null;
  const base = `${waypoints.length} pt / ${waypoint ? `wp ${state.routeIndex + 1}` : "no wp"}`;
  const routeResetStatus = getRouteResetStatus();
  const reconnectStatus = state?.reconnectStatus || null;
  const liveStatus = state?.options?.cavebotPaused
    ? "cavebot paused"
    : routeResetStatus.active
      ? (routeResetStatus.phase === "holding"
        ? `holding wp ${routeResetStatus.targetIndex + 1}`
        : `return -> wp ${routeResetStatus.targetIndex + 1}`)
      : reconnectStatus?.active
        ? (reconnectStatus.phase === "cooldown"
          ? `reconnect in ${Math.max(1, Math.ceil((Number(reconnectStatus.remainingMs) || 0) / 1000))}s`
          : reconnectStatus.phase === "attempting"
            ? "reconnecting"
            : reconnectStatus.phase === "exhausted"
              ? "reconnect stopped"
              : "reconnect waiting")
        : "overlay live";

  switch (lifecycle.phase) {
    case "loading":
      return "overlay pending";
    case "no-client":
      return "no live client";
    case "selection-needed":
      return "no character selected";
    case "busy":
      return "overlay locked / tab is busy";
    case "missing":
      return `${base} / reopen client`;
    case "sync-needed":
      return `${base} / sync needed`;
    case "running":
    case "synced":
    default:
      return `${base} / ${liveStatus}`;
  }
}

function syncControlAvailability() {
  const lifecycle = getDeskLifecycle();
  const ready = lifecycle.ready;
  const bound = lifecycle.bound;
  const waypoints = getWaypoints();
  const tileRules = getTileRules();
  const routeLibrary = getRouteLibrary();
  const accounts = getAccountRegistry();
  const hasSavedRoutes = routeLibrary.length > 0;
  const hasSavedAccounts = accounts.length > 0;
  const hasRoute = waypoints.length > 0;
  const hasTileRuleStack = tileRules.length > 0;
  const canMoveUp = hasRoute && selectedWaypointIndex > 0;
  const canMoveDown = hasRoute && selectedWaypointIndex < waypoints.length - 1;
  const canMoveTileRuleUp = hasTileRuleStack && selectedTileRuleIndex > 0;
  const canMoveTileRuleDown = hasTileRuleStack && selectedTileRuleIndex < tileRules.length - 1;
  const stateReason = "Wait for the desk to finish syncing.";
  const bindingReason = lifecycle.hasInstances
    ? "Select a live character tab first."
    : "Open a live Minibia client first.";
  const busyReason = "That character is already linked to another Minibot window.";
  const missingReason = "This character tab is no longer connected to a live client.";
  const canOperate = ready && bound && !lifecycle.activeIsBusy && lifecycle.present;
  const operationReason = !ready
    ? stateReason
    : !bound
      ? bindingReason
      : lifecycle.activeIsBusy
        ? busyReason
        : !lifecycle.present
          ? missingReason
          : "";
  const reconnectStatus = state?.reconnectStatus || null;
  const connection = state?.snapshot?.connection || null;
  const reconnectAvailable = Boolean(
    reconnectStatus?.active
    || connection?.canReconnect
    || connection?.reconnecting,
  );

  setDisabled(newSessionButton, !ready, stateReason);
  setDisabled(refreshButton, !ready, stateReason);
  setDisabled(windowPinButton, !ready, stateReason);
  setDisabled(
    [actionButtons.saveAccount, actionButtons.newAccount],
    !ready,
    stateReason,
  );
  setDisabled(
    actionButtons.deleteAccount,
    !ready || !hasSavedAccounts || !resolveSelectedAccountId(accounts),
    !ready
      ? stateReason
      : !hasSavedAccounts
        ? "No saved account entries are available."
        : "Select a saved account to delete it.",
  );
  setDisabled(
    [
      killSessionButton,
      newRouteButton,
      cavebotPauseOpenButton,
      actionButtons.routeOffButton,
      actionButtons.routeStopAggroPanel,
      compactActionButtons.routeStopAggro,
      compactActionButtons.routeOff,
    ],
    !canOperate,
    operationReason,
  );
  setDisabled(
    [actionButtons.routeReconnectPanel, compactActionButtons.routeReconnect],
    !canOperate || !reconnectAvailable,
    !ready
      ? stateReason
      : !canOperate
        ? operationReason
        : "Reconnect is only available when the Minibia reconnect window is live.",
  );

  setDisabled(
    [...Object.values(quickButtons), ...Object.values(compactQuickButtons), sessionWaypointVisibilityButton],
    !canOperate,
    operationReason,
  );
  setDisabled(
    [
      actionButtons.saveModules,
      [actionButtons.saveAutowalk, actionButtons.quickSaveAutowalk],
      actionButtons.addCurrentWaypoint,
      actionButtons.routeAddWaypointPanel,
      compactActionButtons.routeAddWaypoint,
      actionButtons.addCurrentTileRuleAvoid,
      actionButtons.addCurrentTileRuleWait,
      actionButtons.newBlankRoute,
    ],
    !canOperate,
    operationReason,
  );
  setDisabled(waypointAddTypeButtons, !canOperate, operationReason);
  if (!canOperate) {
    closeWaypointAddPanel();
  }

  setDisabled(
    [actionButtons.loadRoute, actionButtons.loadRouteQuick],
    !canOperate || !hasSavedRoutes,
    !ready
      ? stateReason
      : !canOperate
        ? operationReason || bindingReason
        : "No saved route files are available.",
  );
  setDisabled(
    actionButtons.deleteRoute,
    !canOperate || !hasSavedRoutes || !doesRouteDeleteConfirmationMatch(),
    !ready
      ? stateReason
      : !canOperate
        ? operationReason || bindingReason
        : !hasSavedRoutes
          ? "No saved route files are available."
          : "Select a saved route file to delete it.",
  );

  const routeReason = !ready
    ? stateReason
    : !canOperate
      ? operationReason || bindingReason
      : "Add at least one waypoint or tile rule to use route actions.";
  setDisabled(
    [
      actionButtons.saveWaypoint,
      actionButtons.removeWaypoint,
      actionButtons.clearRoute,
      actionButtons.resetRoute,
      actionButtons.quickResetRoute,
      actionButtons.routeResetPanel,
      compactActionButtons.routeReset,
    ],
    !canOperate || !hasRoute,
    routeReason,
  );

  setDisabled(
    [
      actionButtons.saveTileRule,
      actionButtons.removeTileRule,
    ],
    !canOperate || !hasTileRuleStack,
    routeReason,
  );

  setDisabled(
    actionButtons.clearRoute,
    !canOperate || (!hasRoute && !hasTileRuleStack),
    routeReason,
  );

  setDisabled(
    actionButtons.moveWaypointUp,
    !canOperate || !canMoveUp,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "Select a waypoint below the first row to move it up.",
  );
  setDisabled(
    actionButtons.moveWaypointDown,
    !canOperate || !canMoveDown,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "Select a waypoint above the last row to move it down.",
  );

  setDisabled(
    actionButtons.moveTileRuleUp,
    !canOperate || !canMoveTileRuleUp,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "Select a tile rule below the first row to move it up.",
  );
  setDisabled(
    actionButtons.moveTileRuleDown,
    !canOperate || !canMoveTileRuleDown,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "Select a tile rule above the last row to move it down.",
  );

  syncTargetingActionAvailability({
    ready,
    canOperate,
    stateReason,
    bindingReason,
    operationReason,
  });
}

function syncTargetingActionAvailability({
  ready = isStateReady(),
  canOperate = ready && isDeskBound(),
  stateReason = "Wait for the desk to finish syncing.",
  bindingReason = "Open a live Minibia client first.",
  operationReason = !ready ? stateReason : !canOperate ? bindingReason : "",
} = {}) {
  const visibleNames = getVisibleMonsterNames();
  const archivedNames = getArchivedMonsterNames();
  const targetNames = getMonsterInputNames();

  setDisabled(actionButtons.saveTargeting, !canOperate, operationReason);
  setDisabled(
    actionButtons.useVisibleCreatures,
    !canOperate || !visibleNames.length,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "No nearby monsters available.",
  );
  setDisabled(
    actionButtons.useArchiveCreatures,
    !canOperate || !archivedNames.length,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "No seen monsters available yet.",
  );
  setDisabled(
    actionButtons.archiveTargetCreatures,
    !canOperate || !targetNames.length,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "Add at least one target first.",
  );
  setDisabled(
    actionButtons.clearArchiveCreatures,
    !canOperate || !archivedNames.length,
    !ready ? stateReason : !canOperate ? operationReason || bindingReason : "No seen monsters available yet.",
  );
}

function flashStatus(message, tone = "ready", timeoutMs = 3200) {
  if (rendererDisposed) return;

  statusOverride = { message, tone };
  renderDeskStatus();

  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusOverride = null;
    renderDeskStatus();
  }, timeoutMs);
}

async function disposeRenderer() {
  if (rendererDisposed) return;

  rendererDisposed = true;
  renderScheduled = false;
  scheduledRenderScope = "full";

  try {
    unsubscribeFromEvents?.();
  } catch { }
  unsubscribeFromEvents = null;

  stopContinuousAlertBeep();
  clearMainWindowHoverTooltipTimer();
  hideMainWindowHoverTooltip();
  pendingDangerAction = null;
  window.clearTimeout(pendingDangerTimer);
  pendingDangerTimer = null;
  window.clearTimeout(statusTimer);
  statusTimer = null;
  statusOverride = null;

  if (alertAudioContext && typeof alertAudioContext.close === "function") {
    try {
      await alertAudioContext.close();
    } catch { }
  }
  alertAudioContext = null;
}

function buildInstanceLabel(instance) {
  if (!instance) return "No client";

  const name = getInstanceDisplayName(instance) || getInstanceBaseName(instance);
  const suffix = instance.claimedBySelf
    ? "this desk"
    : instance.claimed
      ? "busy"
      : instance.ready
        ? "live"
        : "loading";

  return `${name} / ${suffix}`;
}

function getTabStateLabel(session, active = false) {
  if (!session) return "offline";
  if (session.reconnectStatus?.active) return "reconnecting";
  if (session.stale) return "stale";
  if (session.running) return "running";
  if (session.claimed && !session.claimedBySelf) return "busy";
  if (session.present === false) return "missing";
  if (active && session.connected) return "synced";
  if (active) return "sync needed";
  if (session.connected) return "linked";
  if (session.ready) return "ready";
  return "loading";
}

function getTabBadgeView(session, active = false) {
  const stateLabel = getTabStateLabel(session, active);
  const routeName = String(session?.routeName || "").trim();
  const showRouteName = Boolean(
    routeName
    && session?.connected
    && !session?.reconnectStatus?.active
    && !session?.stale
    && !(session?.claimed && !session?.claimedBySelf)
    && session?.present !== false
  );

  return {
    label: showRouteName ? routeName : stateLabel,
    title: showRouteName ? `${routeName} / ${stateLabel}` : stateLabel,
    routeName,
    showRouteName,
    stateLabel,
  };
}

function getTabToggleLabel(session) {
  if (!session) return "Start";
  if (session.running) return "Stop";
  if (session.claimed && !session.claimedBySelf) return "Busy";
  return "Start";
}

function renderSessionMetrics(session) {
  const {
    stale,
    lowHealth,
    dead,
    healthPercent,
    hasPlayers,
    hasStaff,
    hasHostilePlayers,
    visiblePlayers,
    staffPlayers,
    playersTargetingSelf,
    skulledPlayers,
  } = getSessionAlertFlags(session);
  const healthLabel = dead
    ? "DEAD"
    : (healthPercent == null ? "--" : `${healthPercent}%`);
  const routeName = String(session?.routeName || "").trim();
  const routeIndex = Number(session?.routeIndex);
  const snapshotAgeSeconds = Number.isFinite(Number(session?.snapshotAgeMs))
    ? Math.max(1, Math.ceil(Number(session.snapshotAgeMs) / 1000))
    : null;
  const hasWaypoint = Number.isFinite(routeIndex);
  const waypointLabel = hasWaypoint ? `WP ${routeIndex + 1}` : "WP -";
  const routeLabel = routeName
    ? `${routeName}${hasWaypoint ? ` / ${waypointLabel}` : ""}`
    : (hasWaypoint ? waypointLabel : "No route");
  const healthClasses = ["bot-tab-metric"];

  if (dead) {
    healthClasses.push("alert");
  } else if (healthPercent == null) {
    healthClasses.push("muted");
  } else if (lowHealth) {
    healthClasses.push("alert");
  } else if (healthPercent < 60) {
    healthClasses.push("warn");
  } else {
    healthClasses.push("live");
  }

  const playerClasses = ["bot-tab-metric"];
  if (hasHostilePlayers) {
    playerClasses.push("staff");
  } else if (hasPlayers) {
    playerClasses.push("warn");
  } else {
    playerClasses.push("muted");
  }
  const playerLabel = hasPlayers ? `P ${visiblePlayers.length}` : "P -";
  const playerTitle = playersTargetingSelf.length
    ? `Players targeting you: ${playersTargetingSelf.join(", ")}`
    : hasStaff
      ? `GM/GOD visible: ${staffPlayers.join(", ")}`
      : skulledPlayers.length
        ? `Skulled players visible: ${skulledPlayers.join(", ")}`
        : hasPlayers
          ? `Visible players: ${visiblePlayers.join(", ")}`
          : "No visible players";

  return `
    <div class="bot-tab-metrics">
      <span class="${healthClasses.join(" ")}" title="${escapeHtml(
    dead
      ? "Character dead"
      : stale && snapshotAgeSeconds != null
        ? `Session stale for ${snapshotAgeSeconds}s. Last known health ${healthLabel}`
        : `Health ${healthLabel}`
  )}">HP ${escapeHtml(healthLabel)}</span>
      <span class="${playerClasses.join(" ")}" title="${escapeHtml(playerTitle)}">${escapeHtml(playerLabel)}</span>
      <span class="bot-tab-metric waypoint" title="${escapeHtml(routeLabel)}">${escapeHtml(waypointLabel)}</span>
    </div>
  `;
}

function getBotTabsDensity(sessions = state?.sessions || []) {
  return sessions.length > 5 ? "condensed" : "regular";
}

function getBotTabsRenderKey(sessions = state?.sessions || [], activeId = String(state?.activeSessionId || "")) {
  if (!state) return "__loading";
  if (!sessions.length) return "__empty";

  const orderedSessions = getOrderedSessions(sessions);

  return `${activeId}::${orderedSessions.map((session) => {
    const alertFlags = getSessionAlertFlags(session);
    return [
      session.id,
      session.label,
      session.displayName,
      session.running ? 1 : 0,
      session.connected ? 1 : 0,
      session.ready ? 1 : 0,
      session.present === false ? 0 : 1,
      session.claimed ? 1 : 0,
      session.claimedBySelf ? 1 : 0,
      session.available ? 1 : 0,
      session.routeName,
      session.routeIndex,
      session.stale ? 1 : 0,
      alertFlags.alertKind || "",
      alertFlags.healthPercent ?? "",
      alertFlags.visiblePlayers.join(","),
      alertFlags.playersTargetingSelf.join(","),
      alertFlags.skulledPlayers.join(","),
    ].join(":");
  }).join("|")}`;
}

function getBotTabsStructureKey(sessions = state?.sessions || []) {
  if (!state) return "__loading";
  if (!sessions.length) return "__empty";
  return getOrderedSessions(sessions)
    .map((session) => String(session?.id || ""))
    .join("|");
}

function renderBotTabs() {
  if (!botTabs) return;

  if (!state) {
    delete botTabs.dataset.density;
    delete botTabs.dataset.sessionCount;
    if (botTabsRenderedKey !== "__loading") {
      botTabs.innerHTML = '<div class="empty-state">Scanning live clients...</div>';
      botTabsRenderedKey = "__loading";
      botTabsStructureRenderedKey = "__loading";
      markMainWindowTooltipsDirty();
    }
    sessionTabDragState = null;
    return;
  }

  const sessions = getOrderedSessions(state?.sessions || []);
  const activeId = String(state?.activeSessionId || "");
  botTabs.dataset.density = getBotTabsDensity(sessions);
  botTabs.dataset.sessionCount = String(sessions.length);
  const renderKey = getBotTabsRenderKey(sessions, activeId);
  const structureKey = getBotTabsStructureKey(sessions);

  if (!sessions.length) {
    if (botTabsRenderedKey !== renderKey) {
      botTabs.innerHTML = '<div class="empty-state">No live sessions yet. Click New Session.</div>';
      botTabsRenderedKey = renderKey;
      botTabsStructureRenderedKey = structureKey;
      markMainWindowTooltipsDirty();
    }
    sessionTabDragState = null;
    return;
  }

  if (botTabsRenderedKey === renderKey) {
    syncSessionTabDragClasses();
    return;
  }

  const animateLayout = botTabsStructureRenderedKey
    && botTabsStructureRenderedKey !== "__loading"
    && botTabsStructureRenderedKey !== "__empty"
    && botTabsStructureRenderedKey !== structureKey;
  const previousRects = animateLayout ? captureBotTabRects() : new Map();
  botTabs.innerHTML = sessions
    .map((session) => {
      const sessionId = String(session.id || "");
      const active = sessionId === activeId;
      const label = getInstanceDisplayName(session) || session.label || session.displayName || "Client";
      const tabBadge = getTabBadgeView(session, active);
      const stateLabel = tabBadge.stateLabel;
      const toggleDisabled = session.claimed && !session.claimedBySelf;
      const alertFlags = getSessionAlertFlags(session);
      const routeStatus = tabBadge.routeName ? `cavebot ${tabBadge.routeName}` : "no cavebot";
      const healthStatus = alertFlags.dead
        ? "dead"
        : (alertFlags.healthPercent == null ? "health unknown" : `health ${alertFlags.healthPercent}%`);
      const playerStatus = alertFlags.hasPlayers
        ? `${alertFlags.visiblePlayers.length} visible player${alertFlags.visiblePlayers.length === 1 ? "" : "s"}`
        : "no visible players";
      const alertStatus = alertFlags.dead
        ? "death alarm active"
        : alertFlags.playersTargetingSelf.length
          ? `Players targeting you: ${alertFlags.playersTargetingSelf.join(", ")}`
          : alertFlags.hasStaff
            ? `GM/GOD visible: ${alertFlags.staffPlayers.join(", ")}`
            : alertFlags.skulledPlayers.length
              ? `Skulled players visible: ${alertFlags.skulledPlayers.join(", ")}`
              : alertFlags.stale
                ? "session updates stalled"
                : alertFlags.lowHealth
                  ? `critical health below ${SESSION_EMERGENCY_HEALTH_PERCENT}%`
                  : alertFlags.hasPlayers
                    ? "player alarm active"
                    : "no emergency alert";
      const tabAriaLabel = `${label}, ${stateLabel}, ${routeStatus}, ${healthStatus}, ${playerStatus}, ${alertStatus}`;
      const toggleLabel = getTabToggleLabel(session);

      return `
        <div class="bot-tab ${active ? "active" : ""} ${session.running ? "running" : ""} ${toggleDisabled ? "locked" : ""} ${alertFlags.stale ? "stale-alert" : ""} ${alertFlags.lowHealth ? "health-alert" : ""} ${alertFlags.hasPlayers ? "player-alert" : ""} ${alertFlags.hasHostilePlayers ? "hostile-alert" : ""} ${alertFlags.hasStaff ? "staff-alert" : ""} ${alertFlags.dead ? "death-alert" : ""}" data-session-id="${escapeHtml(sessionId)}">
          <button
            type="button"
            class="bot-tab-select"
            data-session-select="${escapeHtml(sessionId)}"
            role="tab"
            aria-selected="${active ? "true" : "false"}"
            aria-label="${escapeHtml(tabAriaLabel)}"
            title="${escapeHtml(tabAriaLabel)}"
            draggable="true"
          >
            <div class="bot-tab-head">
              <span class="bot-tab-state${tabBadge.showRouteName ? " route" : ""}" title="${escapeHtml(tabBadge.title)}">${escapeHtml(tabBadge.label)}</span>
              <strong>${escapeHtml(label)}</strong>
            </div>
            ${renderSessionMetrics(session)}
          </button>
          <button
            type="button"
            class="btn mini bot-tab-toggle ${session.running ? "active" : ""}"
            data-session-toggle="${escapeHtml(sessionId)}"
            aria-label="${escapeHtml(`${toggleLabel} bot for ${label}`)}"
            title="${escapeHtml(`${toggleLabel} bot for ${label}`)}"
            ${toggleDisabled ? "disabled" : ""}
          >${escapeHtml(toggleLabel)}</button>
        </div>
      `;
    })
    .join("");
  botTabsRenderedKey = renderKey;
  botTabsStructureRenderedKey = structureKey;
  markMainWindowTooltipsDirty();
  if (animateLayout) {
    animateBotTabLayout(previousRects);
  }
  syncSessionTabDragClasses();
}

function getSessionSelectButtons() {
  return Array.from(botTabs?.querySelectorAll("[data-session-select]") || []);
}

function focusSessionSelect(sessionId) {
  const target = getSessionSelectButtons().find((button) => String(button.dataset.sessionSelect) === String(sessionId));
  target?.focus();
}

function focusRelativeSessionSelect(currentButton, key) {
  const buttons = getSessionSelectButtons();
  const currentIndex = buttons.indexOf(currentButton);
  if (currentIndex < 0 || !buttons.length) return false;

  let nextIndex = currentIndex;
  if (key === "Home") {
    nextIndex = 0;
  } else if (key === "End") {
    nextIndex = buttons.length - 1;
  } else if (key === "ArrowLeft" || key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  } else if (key === "ArrowRight" || key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % buttons.length;
  } else {
    return false;
  }

  buttons[nextIndex]?.focus();
  return true;
}

function scheduleNextPaint(callback) {
  if (typeof window?.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(callback, 0);
}

function normalizeSessionTabId(value) {
  return String(value || "");
}

function reconcileSessionTabOrder(sessions = state?.sessions || []) {
  const availableIds = sessions
    .map((session) => normalizeSessionTabId(session?.id))
    .filter(Boolean);

  if (!availableIds.length) {
    sessionTabOrderIds = [];
    return [];
  }

  const availableIdSet = new Set(availableIds);
  const nextOrder = sessionTabOrderIds.filter((sessionId) => availableIdSet.has(sessionId));

  for (const sessionId of availableIds) {
    if (!nextOrder.includes(sessionId)) {
      nextOrder.push(sessionId);
    }
  }

  sessionTabOrderIds = nextOrder;
  return nextOrder;
}

function getOrderedSessions(sessions = state?.sessions || []) {
  const orderedIds = reconcileSessionTabOrder(sessions);
  if (!orderedIds.length) {
    return [];
  }

  const sessionMap = new Map(
    sessions.map((session) => [normalizeSessionTabId(session?.id), session]),
  );

  return orderedIds
    .map((sessionId) => sessionMap.get(sessionId))
    .filter(Boolean);
}

function getBotTabElements() {
  return Array.from(botTabs?.querySelectorAll(".bot-tab[data-session-id]") || []);
}

function getBotTabElement(sessionId) {
  return getBotTabElements()
    .find((element) => normalizeSessionTabId(element.dataset.sessionId) === normalizeSessionTabId(sessionId))
    || null;
}

function captureBotTabRects() {
  const rects = new Map();

  for (const element of getBotTabElements()) {
    const sessionId = normalizeSessionTabId(element.dataset.sessionId);
    if (!sessionId) continue;
    rects.set(sessionId, element.getBoundingClientRect());
  }

  return rects;
}

function animateBotTabLayout(previousRects = new Map()) {
  if (!previousRects.size) {
    return;
  }

  for (const element of getBotTabElements()) {
    const sessionId = normalizeSessionTabId(element.dataset.sessionId);
    const previousRect = previousRects.get(sessionId);
    if (!previousRect) continue;

    const nextRect = element.getBoundingClientRect();
    const deltaX = previousRect.left - nextRect.left;
    const deltaY = previousRect.top - nextRect.top;

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      continue;
    }

    element.style.setProperty("--bot-tab-offset-x", `${deltaX}px`);
    element.style.setProperty("--bot-tab-offset-y", `${deltaY}px`);
    element.getBoundingClientRect();
    scheduleNextPaint(() => {
      element.style.setProperty("--bot-tab-offset-x", "0px");
      element.style.setProperty("--bot-tab-offset-y", "0px");
    });
  }
}

function syncSessionTabDragClasses() {
  for (const element of getBotTabElements()) {
    element.classList.remove("dragging", "drop-before", "drop-after");
  }

  if (!sessionTabDragState) {
    return;
  }

  const draggedElement = getBotTabElement(sessionTabDragState.sessionId);
  draggedElement?.classList.add("dragging");

  if (!sessionTabDragState.overSessionId || sessionTabDragState.overSessionId === sessionTabDragState.sessionId) {
    return;
  }

  const targetElement = getBotTabElement(sessionTabDragState.overSessionId);
  if (!targetElement) {
    return;
  }

  targetElement.classList.add(sessionTabDragState.placement === "after" ? "drop-after" : "drop-before");
}

function getSessionTabDropPlacement(targetElement, clientX = 0, clientY = 0) {
  const rect = targetElement?.getBoundingClientRect?.();
  if (!rect) {
    return "before";
  }

  const targetId = normalizeSessionTabId(targetElement.dataset.sessionId);
  const orderedIds = reconcileSessionTabOrder(state?.sessions || []);
  const sourceIndex = orderedIds.indexOf(normalizeSessionTabId(sessionTabDragState?.sessionId));
  const targetIndex = orderedIds.indexOf(targetId);

  if (rect.width < 2 || rect.height < 2) {
    return sourceIndex < targetIndex ? "after" : "before";
  }

  const centerX = rect.left + (rect.width / 2);
  const centerY = rect.top + (rect.height / 2);
  const horizontalDelta = Math.abs(clientX - centerX);
  const verticalDelta = Math.abs(clientY - centerY);

  if (verticalDelta > horizontalDelta) {
    return clientY < centerY ? "before" : "after";
  }

  return clientX < centerX ? "before" : "after";
}

function moveSessionTabOrder(sourceId, targetId, placement = "before") {
  const sourceSessionId = normalizeSessionTabId(sourceId);
  const targetSessionId = normalizeSessionTabId(targetId);
  if (!sourceSessionId || !targetSessionId || sourceSessionId === targetSessionId) {
    return false;
  }

  const orderedIds = [...reconcileSessionTabOrder(state?.sessions || [])];
  const sourceIndex = orderedIds.indexOf(sourceSessionId);
  const targetIndex = orderedIds.indexOf(targetSessionId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return false;
  }

  let nextIndex = targetIndex + (placement === "after" ? 1 : 0);
  if (sourceIndex < nextIndex) {
    nextIndex -= 1;
  }

  if (sourceIndex === nextIndex) {
    return false;
  }

  orderedIds.splice(sourceIndex, 1);
  orderedIds.splice(nextIndex, 0, sourceSessionId);
  sessionTabOrderIds = orderedIds;
  return true;
}

function reorderSessionTabDom(sourceId, targetId, placement = "before") {
  if (!botTabs || !moveSessionTabOrder(sourceId, targetId, placement)) {
    return false;
  }

  const sourceElement = getBotTabElement(sourceId);
  const targetElement = getBotTabElement(targetId);
  if (!sourceElement || !targetElement || sourceElement === targetElement) {
    return false;
  }

  const previousRects = captureBotTabRects();
  botTabs.insertBefore(
    sourceElement,
    placement === "after" ? targetElement.nextSibling : targetElement,
  );
  botTabsRenderedKey = getBotTabsRenderKey(state?.sessions || [], String(state?.activeSessionId || ""));
  botTabsStructureRenderedKey = getBotTabsStructureKey(state?.sessions || []);
  animateBotTabLayout(previousRects);
  syncSessionTabDragClasses();
  return true;
}

function finishSessionTabDrag() {
  if (!sessionTabDragState) {
    return;
  }

  const { sessionId, moved } = sessionTabDragState;
  sessionTabDragState = null;
  syncSessionTabDragClasses();

  if (moved) {
    suppressSessionTabClickUntil = Date.now() + SESSION_TAB_CLICK_SUPPRESS_MS;
    scheduleNextPaint(() => focusSessionSelect(sessionId));
  }
}

function renderDeskIdentity() {
  if (!state) {
    document.title = "Minibot";
    renderBotTabs();
    return;
  }

  document.title = state.windowTitle || "Minibot";
  renderBotTabs();
}

function renderDeskStatus() {
}

function focusRuneMakerPrimaryControl(panel) {
  const firstSpellInput = panel?.querySelector?.('[data-module-key="runeMaker"][data-rule-index="0"][data-rule-field="words"]');
  if (firstSpellInput instanceof HTMLElement && !firstSpellInput.hasAttribute("disabled")) {
    firstSpellInput.focus();
    if (typeof firstSpellInput.select === "function") {
      firstSpellInput.select();
    }
    return true;
  }

  const addButton = getModuleView("runeMaker")?.addRuleButton;
  if (addButton instanceof HTMLElement && !addButton.hidden && !addButton.hasAttribute("disabled")) {
    addButton.focus();
    return true;
  }

  return false;
}

function openModal(name) {
  const panelName = getModalPanelName(name);
  const targetPanel = modalPanels.find((panel) => panel.dataset.modal === panelName);
  if (!targetPanel) {
    flashStatus(`Unknown panel: ${name}`, "error", 3200);
    return null;
  }

  if (activeModalName === "targeting" && name !== "targeting") {
    targetingDirty = false;
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    targetProfilesRenderedKey = "";
    resetTargetingCombatDraft();
  }

  if (isModuleModalName(name)) {
    activeModuleKey = name;
    ensureModulesDraft(true);
    if (name === "partyFollow") {
      ensureFollowTrainAutoChainDraft(modulesDraft);
    }
  }

  closeWaypointAddPanel();

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeModalName = name;
  syncModalState(true);
  syncModalPanels(panelName);
  if (name === "targeting") {
    targetingDirty = false;
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    targetProfilesRenderedKey = "";
    resetTargetingCombatDraft();
    renderTargeting();
    syncTargetWatchDockPosition({ clamp: true });
  }

  if (isModuleModalName(name)) {
    renderModules({ force: true });
  }

  if (name === "runeMaker" && focusRuneMakerPrimaryControl(targetPanel)) {
    return targetPanel;
  }

  const firstFocusable = getFocusableElements(targetPanel)[0];
  (firstFocusable || targetPanel).focus();
  return targetPanel;
}

function closeModal() {
  if (activeModalName === "targeting") {
    targetingDirty = false;
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    targetProfilesRenderedKey = "";
    resetTargetingCombatDraft();
  }

  if (isModuleModalName(activeModalName)) {
    resetModulesDraft();
    activeModuleKey = null;
  }

  closeWaypointAddPanel();
  clearPendingDangerAction();
  endTargetWatchDockDrag();

  activeModalName = null;
  syncModalState(false);
  syncModalPanels(null);
  if (lastFocusedElement instanceof HTMLElement && !lastFocusedElement.closest("[hidden]")) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function closeModalIfActive(names, { preserveDangerAction = false } = {}) {
  if (preserveDangerAction && pendingDangerAction) {
    return;
  }

  const allowedNames = Array.isArray(names) ? names : [names];
  if (activeModalName && allowedNames.includes(activeModalName)) {
    closeModal();
  }
}

function renderSummarySheets() {
  const options = state?.options || {};
  const targetingState = getTargetingEffectiveState(options, state);
  const targetNames = sanitizeTargetMonsterNames(options.monster);
  const targetCount = targetNames.length;
  const targetingSummary = targetingState.effectiveEnabled
    ? (targetCount ? formatTextListSummary(targetNames) : "No targets")
    : targetingState.label;
  const targetingRuntimeDetail = [
    formatMs(options.intervalMs),
    formatMs(options.retargetMs),
    `${Number(options.rangeX) || 0} x ${Number(options.rangeY) || 0}`,
    `F${String(Number(options.floorTolerance) || 0)}`,
    formatPage(options.pageUrlPrefix),
  ].join(" / ");
  const targetingDetail = targetingState.effectiveEnabled
    ? targetingRuntimeDetail
    : `${targetingState.detail} / ${targetingRuntimeDetail}`;

  setTextContent(summaryFields.targeting, targetingSummary);
  setTextContent(summaryFields.targetingDetail, targetingDetail);
  targetingOpenButtons.forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    const titleParts = [
      "Hunt",
      !targetingState.effectiveEnabled ? targetingState.detail : null,
      targetCount ? `${targetCount} monster${targetCount === 1 ? "" : "s"}` : "No monsters",
      `Poll ${formatMs(options.intervalMs)}`,
      `Retarget ${formatMs(options.retargetMs)}`,
      `Range ${Number(options.rangeX) || 0}x${Number(options.rangeY) || 0}`,
      "Open settings",
    ].filter(Boolean);
    button.dataset.titleDefault = titleParts.join(" / ");
    button.title = button.dataset.titleDefault;
    button.setAttribute("aria-label", titleParts.join(", "));
  });

  const healerState = getModuleEffectiveState("healer", options, state);
  setTextContent(
    summaryFields.healer,
    healerState.state === "inherited"
      ? healerState.label
      : formatHealerFamilyCountSummary(options),
  );
  setTextContent(
    summaryFields.healWords,
    healerState.state === "inherited"
      ? `${healerState.detail} / ${formatHealerCombinedDetail(options, state)}`
      : formatHealerCombinedDetail(options, state),
  );
  const deathHealVocation = getDeathHealResolvedVocation(options, state);
  const deathHealThreshold = Math.max(0, Math.trunc(Number(options.deathHealHealthPercent) || 0));
  const deathHealState = getModuleEffectiveState("deathHeal", options, state);
  setTextContent(
    summaryFields.deathHeal,
    deathHealState.state === "inherited"
      ? deathHealState.label
      : (options.deathHealEnabled ? `<= ${deathHealThreshold}%` : "Off"),
  );
  setTextContent(
    summaryFields.deathHealDetail,
    deathHealState.state === "inherited"
      ? `${deathHealState.detail} / ${formatVocationLabel(deathHealVocation)} / ${formatDeathHealSpellLabel(options.deathHealWords, deathHealVocation)}`
      : `${formatVocationLabel(deathHealVocation)} / ${formatDeathHealSpellLabel(options.deathHealWords, deathHealVocation)}`,
  );
  setTextContent(
    summaryFields.mana,
    `${formatRuleCount(options.manaTrainerRules)}`,
  );
  setTextContent(summaryFields.manaWords, formatSpellRuleSummary(
    options.manaTrainerRules,
    (rule) => `${formatRuleSpell(rule.words)} at MP ${formatPercent(rule.minManaPercent)}-${formatPercent(rule.maxManaPercent)}`,
  ));
  const autoEatFoodChoices = normalizeTextListSummary(options.autoEatFoodName);
  const autoEatBlockedChoices = normalizeTextListSummary(options.autoEatForbiddenFoodNames);
  const autoEatFoodName = autoEatFoodChoices.length ? autoEatFoodChoices.join(" -> ") : "any food";
  const autoEatState = getModuleEffectiveState("autoEat", options, state);
  const autoEatMode = getAutoEatModeState(options);
  setTextContent(
    summaryFields.autoEat,
    autoEatState.state === "inherited"
      ? autoEatState.label
      : autoEatMode.moduleEnabled
        ? formatMs(options.autoEatCooldownMs)
        : "Off",
  );
  setTextContent(
    summaryFields.autoEatDetail,
    autoEatState.state === "inherited"
      ? `Trainer owns food cadence / ${autoEatFoodName} / cadence ${formatMs(options.autoEatCooldownMs)}`
      : autoEatMode.moduleEnabled
        ? `${autoEatFoodName} / hotbar + equipment + containers${autoEatBlockedChoices.length ? ` / block ${autoEatBlockedChoices.join(", ")}` : ""}`
        : `${autoEatFoodName} ready`,
  );
  const ammoSummary = buildAmmoSummary(options, state);
  setTextContent(
    summaryFields.ammo,
    ammoSummary.enabled
      ? (ammoSummary.equippedCount > 0
        ? `${ammoSummary.equippedCount} / ${ammoSummary.carriedCount}`
        : (ammoSummary.carriedCount > 0 ? `${ammoSummary.carriedCount} carried` : "Dry"))
      : "Off",
  );
  setTextContent(
    summaryFields.ammoDetail,
    ammoSummary.enabled
      ? `${ammoSummary.equippedName || ammoSummary.preferredValue} / ${ammoSummary.slotLabel} / reload <= ${ammoSummary.reloadAtOrBelow}${ammoSummary.restockEnabled ? ` / restock ${ammoSummary.warningCount}` : " / shop off"}${getAmmoRestockHandoffText(options, state) ? ` / ${getAmmoRestockHandoffText(options, state)}` : ""}`
      : ammoSummary.detail,
  );
  const ringAutoReplaceName = String(options.ringAutoReplaceItemName || "any ring").trim() || "any ring";
  const amuletAutoReplaceName = String(options.amuletAutoReplaceItemName || "any amulet").trim() || "any amulet";
  const equipmentReplaceSummary = getEquipmentReplaceCombinedStatus(options);
  setTextContent(
    summaryFields.ringAmuletAutoReplace,
    equipmentReplaceSummary.activeLabel,
  );
  setTextContent(
    summaryFields.ringAmuletAutoReplaceDetail,
    `Ring ${ringAutoReplaceName} / ${formatMs(options.ringAutoReplaceCooldownMs)} | Amulet ${amuletAutoReplaceName} / ${formatMs(options.amuletAutoReplaceCooldownMs)}`,
  );
  setTextContent(
    summaryFields.rune,
    `${formatRuleCount(options.runeMakerRules)}`,
  );
  setTextContent(summaryFields.runeWords, formatSpellRuleSummary(
    options.runeMakerRules,
    (rule) => `${formatRuleSpell(rule.words)} at MP ${formatPercent(rule.minManaPercent)}-${formatPercent(rule.maxManaPercent)}`,
  ));
  setTextContent(
    summaryFields.spell,
    `${formatRuleCount(options.spellCasterRules)}`,
  );
  setTextContent(summaryFields.spellWords, formatSpellRuleSummary(
    options.spellCasterRules,
    (rule) => `${formatRuleSpell(rule.words)} / ${formatSpellPattern(rule.pattern)} / ${Math.round(Number(rule.maxTargetDistance) || 0)} SQM`,
  ));
  setTextContent(
    summaryFields.light,
    `${formatRuleCount(options.autoLightRules)}`,
  );
  setTextContent(
    summaryFields.lightDetail,
    formatAutoLightQuickDetail(options.autoLightRules),
  );
  setTextContent(
    summaryFields.convert,
    `${formatRuleCount(options.autoConvertRules)}`,
  );
  setTextContent(
    summaryFields.convertDetail,
    formatAutoConvertQuickDetail(options.autoConvertRules),
  );
  const avoidFieldSummary = describeAvoidFieldSettings(options);
  setTextContent(summaryFields.fieldSafe, avoidFieldSummary.headline);
  setTextContent(summaryFields.fieldSafeDetail, avoidFieldSummary.detail);
  const lootWhitelist = normalizeTextListSummary(options.lootWhitelist);
  const lootBlacklist = normalizeTextListSummary(options.lootBlacklist);
  const lootPreferredContainers = normalizeTextListSummary(options.lootPreferredContainers);
  setTextContent(
    summaryFields.looting,
    options.lootingEnabled
      ? (lootWhitelist.length ? `${lootWhitelist.length} keep` : "All items")
      : "Paused",
  );
  setTextContent(
    summaryFields.lootingDetail,
    lootBlacklist.length
      ? `Skip ${lootBlacklist.length} / ${formatTextListSummary(lootPreferredContainers, { empty: "Backpack" })}`
      : `To ${formatTextListSummary(lootPreferredContainers, { empty: "Backpack" })}`,
  );
  const activeBankingRules = getActiveRules(options.bankingRules || []);
  setTextContent(
    summaryFields.banking,
    activeBankingRules.length ? `${activeBankingRules.length} rule${activeBankingRules.length === 1 ? "" : "s"}` : "Idle",
  );
  setTextContent(
    summaryFields.bankingDetail,
    activeBankingRules.length
      ? activeBankingRules
        .slice(0, 2)
        .map((rule) => `${formatBankingOperation(rule.operation)} / ${formatTextListSummary(rule.bankerNames, { empty: "Any banker" })}`)
        .join("; ")
      : "No bank route rules",
  );
  const partyFollowMembers = normalizeTextListSummary(options.partyFollowMembers);
  const trainerPartnerName = getResolvedTrainerPartnerName(options);
  const followTrainStatus = getBoundInstance()?.followTrainStatus || null;
  const reconnectRuntime = getReconnectRuntimeStatus(options);
  const trainerState = getModuleEffectiveState("trainer", options, state);
  const followContext = getFollowTrainRuntimeContext(state, options);
  setTextContent(
    summaryFields.trainer,
    trainerState.state === "blocked"
      ? trainerState.label
      : trainerState.effectiveEnabled
        ? formatTrainerPartnerHeadline(trainerPartnerName)
        : "Off",
  );
  setTextContent(
    summaryFields.trainerDetail,
    trainerState.state === "blocked"
      ? trainerState.detail
      : trainerState.effectiveEnabled
        ? `Keep ${Math.max(1, Math.trunc(Number(options.trainerPartnerDistance) || 0))} sqm / party ${options.trainerAutoPartyEnabled !== false ? "auto" : "manual"} / trainer reconnect ${options.trainerReconnectEnabled !== false ? "on" : "off"} / idle ${formatDurationMs(options.antiIdleIntervalMs)} / food ${autoEatFoodName} ${formatDurationMs(options.autoEatCooldownMs)} / mana ${formatTrainerManaTrainerDetail(options, { empty: "off" })} / heal <= ${formatPercent(options.healerEmergencyHealthPercent)} / escape <= ${formatPercent(options.trainerEscapeHealthPercent)}`
        : "Target, trainer reconnect, keep-close, food, and escape off",
  );
  setTextContent(summaryFields.reconnect, reconnectRuntime.headline);
  setTextContent(
    summaryFields.reconnectDetail,
    `${reconnectRuntime.detail} / ${reconnectRuntime.configDetail}`,
  );
  const antiIdleStatus = getAntiIdleRuntimeStatus();
  const antiIdleState = getModuleEffectiveState("antiIdle", options, state);
  const antiIdleMode = getAntiIdleModeState(options);
  setTextContent(
    summaryFields.antiIdle,
    antiIdleState.state === "inherited"
      ? antiIdleState.label
      : antiIdleMode.moduleEnabled
        ? formatDurationMs(options.antiIdleIntervalMs)
        : "Off",
  );
  setTextContent(
    summaryFields.antiIdleDetail,
    antiIdleState.effectiveEnabled
      ? formatAntiIdleDetail(antiIdleStatus, antiIdleMode.enabled, { trainerOnly: antiIdleMode.trainerOnly })
      : "Idle keepalive off",
  );
  const alarmSummary = getAlarmSummaryData(options);
  setTextContent(summaryFields.alarms, alarmSummary.headline);
  setTextContent(summaryFields.alarmsDetail, alarmSummary.detail);
  setTextContent(
    summaryFields.partyFollow,
    options.partyFollowEnabled
      ? formatFollowTrainHeadline(partyFollowMembers)
      : "Off",
  );
  setTextContent(
    summaryFields.partyFollowDetail,
    options.partyFollowEnabled
      ? `${formatFollowTrainDetail(partyFollowMembers, options.partyFollowDistance)}${followTrainStatus?.active || followTrainStatus?.pilot
        ? ` / ${formatFollowTrainStateLabel(followTrainStatus)}${followTrainStatus?.leaderName ? ` -> ${followTrainStatus.leaderName}` : ""}`
        : ""}${followContext.passiveFollower ? " / Passive follow suppresses combat" : ""}`
      : "No follow chain active",
  );
  const rookillerStatus = getBoundInstance()?.rookillerStatus || null;
  const rookillerLevel = Number(rookillerStatus?.level);
  const rookillerLevelPercent = Number(rookillerStatus?.levelPercent);
  const hasRookillerLevel = Number.isFinite(rookillerLevel);
  const hasRookillerLevelPercent = Number.isFinite(rookillerLevelPercent);
  let rookillerHeadline = hasRookillerLevel
    ? `Lvl ${Math.trunc(rookillerLevel)}${hasRookillerLevelPercent ? ` / ${Math.round(rookillerLevelPercent)}%` : ""}`
    : "Stop at 8 / 90%";
  let rookillerDetail = options.rookillerEnabled
    ? "Return WP1, close client"
    : "Disabled";

  if (rookillerStatus?.active) {
    if (rookillerStatus.phase === "clearing") {
      rookillerHeadline = "Arming";
      rookillerDetail = "Preparing return to waypoint 1";
    } else if (rookillerStatus.phase === "returning") {
      rookillerHeadline = "Returning";
      rookillerDetail = "Return active: waypoint 1";
    } else if (rookillerStatus.phase === "ready") {
      rookillerHeadline = "Ready";
      rookillerDetail = "Waypoint 1 reached";
    } else if (rookillerStatus.phase === "disconnecting") {
      rookillerHeadline = "Logout";
      rookillerDetail = "Closing the live session";
    }
  }

  setTextContent(summaryFields.rookiller, rookillerHeadline);
  setTextContent(summaryFields.rookillerDetail, rookillerDetail);
  setTextContent(
    compactPanelFields.deathHeal,
    summaryFields.deathHeal?.textContent || "Off",
  );

  Object.values(summaryFields).forEach(syncTextTitle);
}

function renderRouteToggleCards() {
  const routeResetStatus = getRouteResetStatus();
  const targetIndex = routeResetStatus.targetIndex == null ? 0 : routeResetStatus.targetIndex;
  const idleLabel = getWaypoints().length ? `WP ${targetIndex + 1}` : "No route";
  const activeLabel = routeResetStatus.phase === "holding" ? "Holding" : "Returning";
  [actionButtons.routeResetPanel, compactActionButtons.routeReset].forEach((button) => {
    setTileState(button, routeResetStatus.active, activeLabel, idleLabel);
  });
  [actionButtons.routeResetPanel, compactActionButtons.routeReset].forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    button.dataset.titleDefault = routeResetStatus.active
      ? (routeResetStatus.phase === "holding"
        ? `Return: holding waypoint ${targetIndex + 1}`
        : `Return: returning to waypoint ${targetIndex + 1}`)
      : `Return: return to waypoint ${targetIndex + 1} and hold position`;
    button.title = button.dataset.titleDefault;
  });

  const aggroHoldActive = Boolean(getBoundInstance()?.stopAggroHold);
  [actionButtons.routeStopAggroPanel, compactActionButtons.routeStopAggro].forEach((button) => {
    setTileState(button, aggroHoldActive, "Held", "Aggro");
  });
  [actionButtons.routeStopAggroPanel, compactActionButtons.routeStopAggro].forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    button.dataset.titleDefault = aggroHoldActive
      ? "Aggro hold is active. Click to restore bot combat targeting."
      : "Hold the character out of combat and keep clearing target lock.";
    button.title = button.dataset.titleDefault;
    button.setAttribute("aria-label", button.dataset.titleDefault);
  });
  setMirroredTileState("targeting", !aggroHoldActive, "On", "Off");
  [quickButtons.targeting, compactQuickButtons.targeting].forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    button.dataset.titleDefault = aggroHoldActive
      ? "Targeting is paused. Click to resume combat targeting."
      : "Targeting is live. Click to pause combat targeting.";
    button.title = button.dataset.titleDefault;
    button.setAttribute("aria-label", button.dataset.titleDefault);
  });

  const reconnectStatus = state?.reconnectStatus || null;
  const connection = state?.snapshot?.connection || null;
  const dead = state?.snapshot?.reason === "dead"
    || connection?.playerIsDead === true
    || connection?.deathModalVisible === true;
  let reconnectActive = false;
  let reconnectLabel = dead ? "Dead" : "Wait";
  let reconnectTitle = dead
    ? "Reconnect stays off while the death modal is active."
    : "Reconnect is waiting for the Minibia disconnect window.";

  if (reconnectStatus?.active) {
    reconnectActive = reconnectStatus.phase !== "exhausted";
    if (reconnectStatus.phase === "cooldown") {
      reconnectLabel = `${Math.max(1, Math.ceil((Number(reconnectStatus.remainingMs) || 0) / 1000))}s`;
      reconnectTitle = `Reconnect armed: next retry in ${reconnectLabel}.`;
    } else if (reconnectStatus.phase === "attempting") {
      reconnectLabel = "Live";
      reconnectTitle = "Reconnect is trying to restore the live client now.";
    } else if (reconnectStatus.phase === "exhausted") {
      reconnectLabel = "Stop";
      reconnectTitle = `Reconnect stopped after ${Math.max(0, Number(reconnectStatus.attempts) || 0)} attempt${Number(reconnectStatus.attempts) === 1 ? "" : "s"}.`;
    } else if (reconnectStatus.phase === "waiting") {
      reconnectLabel = "Wait";
      reconnectTitle = "Reconnect is armed and waiting for the Minibia reconnect button.";
    } else {
      reconnectLabel = "Armed";
      reconnectTitle = "Reconnect guard is armed for an unexpected disconnect.";
    }
  } else if (connection?.reconnecting) {
    reconnectActive = true;
    reconnectLabel = "Live";
    reconnectTitle = "Reconnect is trying to restore the live client now.";
  } else if (connection?.canReconnect) {
    reconnectLabel = "Now";
    reconnectTitle = "Minibia shows a reconnect window. Click to retry now.";
  }

  [actionButtons.routeReconnectPanel, compactActionButtons.routeReconnect].forEach((button) => {
    setTileState(button, reconnectActive, reconnectLabel, reconnectLabel);
  });
  [actionButtons.routeReconnectPanel, compactActionButtons.routeReconnect].forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    button.dataset.titleDefault = reconnectTitle;
    button.title = reconnectTitle;
    button.setAttribute("aria-label", reconnectTitle);
  });
}

function renderDashboard() {
  const lifecycle = getDeskLifecycle();
  const options = state?.options || {};
  const waypoints = options.waypoints || [];
  const waypoint = waypoints[state.routeIndex] || null;
  const deskCavebotControlState = getDeskCavebotControlState(state);
  const renderKey = getDashboardRenderKey(lifecycle, options, waypoints, waypoint);
  if (dashboardRenderedKey === renderKey) {
    return;
  }

  if (refreshButton) {
    refreshButton.textContent = hasSessionTabs() ? "Sync All Tabs" : "Scan All Tabs";
  }

  syncDeskActionTitles(lifecycle);

  setEffectiveModuleTileState("autowalk", getModuleEffectiveState("autowalk", options, state));
  setMirroredTileState("cavebotPause", deskCavebotControlState.anyRunning, "Running", "Stopped");
  setMirroredTileState("loop", options.autowalkLoop);
  setMirroredTileState("record", options.routeRecording, "On", "Off");
  setMirroredTileState("waypoints", options.showWaypointOverlay, "On", "Off");
  setTileState(sessionWaypointVisibilityButton, options.showWaypointOverlay, "Shown", "Hidden");
  setMirroredTileState("avoidFields", options.avoidElementalFields, "On", "Off");
  setEffectiveModuleTileState("healer", getModuleEffectiveState("healer", options, state));
  setEffectiveModuleTileState("deathHeal", getModuleEffectiveState("deathHeal", options, state));
  setMirroredTileState("manaTrainer", options.manaTrainerEnabled);
  setEffectiveModuleTileState("autoEat", getModuleEffectiveState("autoEat", options, state));
  setEffectiveModuleTileState("ammo", getModuleEffectiveState("ammo", options, state));
  setMirroredTileState("ringAmuletAutoReplace", options.ringAutoReplaceEnabled || options.amuletAutoReplaceEnabled);
  setMirroredTileState("runeMaker", options.runeMakerEnabled);
  setMirroredTileState("spellCaster", options.spellCasterEnabled);
  setMirroredTileState("autoLight", options.autoLightEnabled);
  setMirroredTileState("autoConvert", options.autoConvertEnabled);
  setMirroredTileState("looting", options.lootingEnabled);
  setMirroredTileState("banking", options.bankingEnabled);
  setMirroredTileState("rookiller", options.rookillerEnabled);
  setEffectiveModuleTileState("trainer", getModuleEffectiveState("trainer", options, state));
  setEffectiveModuleTileState("reconnect", getModuleEffectiveState("reconnect", options, state));
  setEffectiveModuleTileState("antiIdle", getModuleEffectiveState("antiIdle", options, state));
  setEffectiveModuleTileState("alarms", getModuleEffectiveState("alarms", options, state));
  setEffectiveModuleTileState("partyFollow", getModuleEffectiveState("partyFollow", options, state));
  if (cavebotMasterStopSummary instanceof HTMLElement) {
    setTextContent(
      cavebotMasterStopSummary,
      deskCavebotControlState.anyRunning
        ? `Stop ${deskCavebotControlState.runningCount} live character${deskCavebotControlState.runningCount === 1 ? "" : "s"}`
        : "All live characters stopped",
    );
    syncTextTitle(cavebotMasterStopSummary);
  }
  if (cavebotMasterStopDetail instanceof HTMLElement) {
    setTextContent(
      cavebotMasterStopDetail,
      deskCavebotControlState.liveCount
        ? deskCavebotControlState.anyRunning
          ? "Hard stop bot loops, autowalk, route return, and aggro across every live tab in this desk."
          : deskCavebotControlState.allPaused
            ? "All live tabs are halted and cavebot-paused until you resume them manually."
            : "No live bot loops are active in this desk."
        : "Open or sync a live character tab to arm the desk-wide stop.",
    );
    syncTextTitle(cavebotMasterStopDetail);
  }
  if (cavebotPauseOpenButton instanceof HTMLElement) {
    cavebotPauseOpenButton.dataset.titleDefault = !deskCavebotControlState.liveCount
      ? "Master stop is unavailable until a live character tab is linked."
      : deskCavebotControlState.anyRunning
        ? `Master stop ${deskCavebotControlState.runningCount} live character${deskCavebotControlState.runningCount === 1 ? "" : "s"}: stop bot loops, autowalk, route return, and aggro across every live tab in this desk.`
        : deskCavebotControlState.allPaused
          ? "All live character tabs are stopped and cavebot-paused until you resume them manually."
          : "All live character tabs are currently stopped.";
    cavebotPauseOpenButton.title = cavebotPauseOpenButton.dataset.titleDefault;
    cavebotPauseOpenButton.setAttribute("aria-label", cavebotPauseOpenButton.dataset.titleDefault);
  }
  if (quickButtons.cavebotPause instanceof HTMLElement) {
    quickButtons.cavebotPause.dataset.titleDefault = !deskCavebotControlState.liveCount
      ? "Master stop unavailable"
      : deskCavebotControlState.anyRunning
        ? `Running: ${deskCavebotControlState.runningCount} live character${deskCavebotControlState.runningCount === 1 ? "" : "s"} active`
        : "Stopped: all live characters halted";
    quickButtons.cavebotPause.title = quickButtons.cavebotPause.dataset.titleDefault;
    quickButtons.cavebotPause.setAttribute("aria-label", quickButtons.cavebotPause.dataset.titleDefault);
  }
  renderRouteToggleCards();
  dashboardRenderedKey = renderKey;
  markMainWindowTooltipsDirty();
}

async function stopAllCavebots(buttons = quickButtons.cavebotPause) {
  if (!isStateReady() || !isDeskBound()) {
    flashStatus("No live character tab selected.", "warn", 3200);
    render();
    return;
  }

  await runAction(() => window.bbApi.stopAllBots(), {
    buttons,
    successMessage: (nextState) => {
      const deskCavebotControlState = getDeskCavebotControlState(nextState);
      return deskCavebotControlState.liveCount
        ? `Stopped ${deskCavebotControlState.liveCount} live character${deskCavebotControlState.liveCount === 1 ? "" : "s"}`
        : "All live characters already stopped";
    },
    tone: "warn",
    errorMessage: "Unable to stop all live characters",
  });
}

async function toggleAggroHold(buttons = [
  quickButtons.targeting,
  compactQuickButtons.targeting,
  actionButtons.routeStopAggroPanel,
  compactActionButtons.routeStopAggro,
]) {
  if (!isStateReady() || !isDeskBound()) {
    flashStatus("No live character tab selected.", "warn", 3200);
    render();
    return;
  }

  await runAction(() => window.bbApi.stopAggro(), {
    buttons,
    successMessage: (nextState) => {
      const activeSession = (nextState?.sessions || [])
        .find((session) => String(session.id) === String(nextState?.activeSessionId || ""));
      return activeSession?.stopAggroHold ? "Aggro hold enabled" : "Aggro hold disabled";
    },
    errorMessage: "Unable to stop aggro",
    tone: "warn",
  });
}

async function triggerReconnect(buttons = actionButtons.routeReconnectPanel) {
  if (!isStateReady() || !isDeskBound()) {
    flashStatus("No live character tab selected.", "warn", 3200);
    render();
    return;
  }

  await runAction(() => window.bbApi.reconnectSession(), {
    buttons,
    successMessage: (nextState) => {
      const reconnectStatus = nextState?.reconnectStatus || null;
      if (reconnectStatus?.phase === "attempting") {
        return "Reconnect started";
      }
      if (reconnectStatus?.phase === "cooldown") {
        return "Reconnect armed";
      }
      return "Reconnect requested";
    },
    errorMessage: "Unable to reconnect",
    tone: "warn",
  });
}

function formatTargetProfileSummary(profile, visibleEntries = []) {
  const keepLabel = Number(profile.keepDistanceMin) > 0 || Number(profile.keepDistanceMax) > 1
    ? `${Math.round(Number(profile.keepDistanceMin) || 0)}-${Math.round(Number(profile.keepDistanceMax) || 0)} sqm`
    : "melee/default";
  const finishLabel = Number(profile.finishBelowPercent) > 0
    ? `finish <= ${Math.round(Number(profile.finishBelowPercent) || 0)}%`
    : "finish off";
  const stanceLabel = normalizeCombatStanceValue(profile?.chaseMode) === "auto"
    ? "stance default"
    : `stance ${formatCombatStanceLabel(profile?.chaseMode)}`;
  const visibleLowHp = visibleEntries
    .map((entry) => Number(entry?.healthPercent))
    .filter((value) => Number.isFinite(value));
  const visibleLabel = visibleEntries.length
    ? `${visibleEntries.length} visible${visibleLowHp.length ? ` / hp ${visibleLowHp.map((value) => `${Math.round(value)}%`).join(", ")}` : ""}`
    : "not visible";

  return [
    `priority score ${Math.round(Number(profile.priority) || 0)}`,
    `danger ${Math.round(Number(profile.dangerLevel) || 0)}`,
    `focus ${TARGET_PROFILE_KILL_MODE_LABELS[profile.killMode] || TARGET_PROFILE_KILL_MODE_LABELS.normal}`,
    stanceLabel,
    `spacing ${TARGET_PROFILE_BEHAVIOR_LABELS[profile.behavior] || TARGET_PROFILE_BEHAVIOR_LABELS.kite}`,
    keepLabel,
    finishLabel,
    visibleLabel,
  ].join(" / ");
}

function readTargetProfilesFromDom() {
  if (!targetProfileList) {
    return normalizeTargetProfiles(targetProfilesDraft || []);
  }

  const rows = Array.from(targetProfileList.querySelectorAll("[data-target-profile-name]"));
  if (!rows.length) {
    return normalizeTargetProfiles(targetProfilesDraft || []);
  }

  const renderedProfiles = new Map(rows.map((row) => {
    const getField = (field) => row.querySelector(`[data-target-profile-field="${field}"]`);
    const profile = normalizeTargetProfile({
      name: row.dataset.targetProfileName || "",
      enabled: getField("enabled")?.checked,
      priority: getField("priority")?.value,
      dangerLevel: getField("dangerLevel")?.value,
      keepDistanceMin: getField("keepDistanceMin")?.value,
      keepDistanceMax: getField("keepDistanceMax")?.value,
      finishBelowPercent: getField("finishBelowPercent")?.value,
      killMode: getField("killMode")?.value,
      chaseMode: getField("chaseMode")?.value,
      behavior: getField("behavior")?.value,
      preferShootable: getField("preferShootable")?.checked,
      stickToTarget: getField("stickToTarget")?.checked,
      avoidBeam: getField("avoidBeam")?.checked,
      avoidWave: getField("avoidWave")?.checked,
    });
    return [profile.name.toLowerCase(), profile];
  }));

  return normalizeTargetProfiles(
    syncTargetProfilesToNames(getMonsterInputNames(), targetProfilesDraft || [])
      .map((profile) => renderedProfiles.get(profile.name.toLowerCase()) || profile),
  );
}

function captureTargetProfilesDraftFromDom() {
  targetProfilesDraft = readTargetProfilesFromDom();
  return targetProfilesDraft;
}

function sortTargetProfilesByName(profiles = []) {
  return [...profiles].sort((left, right) => compareDisplayNames(left?.name, right?.name));
}

function sortTargetProfilesByPriority(profiles = []) {
  return [...profiles].sort((left, right) => (
    (Number(right?.priority) || 0) - (Number(left?.priority) || 0)
    || compareDisplayNames(left?.name, right?.name)
  ));
}

function rebalanceTargetProfilePriorities(profiles = []) {
  const step = 100;
  return profiles.map((profile, index) => ({
    ...profile,
    priority: Math.max(step, (profiles.length - index) * step),
  }));
}

function moveTargetProfilePriority(profileName, delta) {
  const nameKey = String(profileName || "").trim().toLowerCase();
  const direction = Math.trunc(Number(delta));
  if (!nameKey || !direction) return;

  const ordered = sortTargetProfilesByPriority(readTargetProfilesFromDom());
  const currentIndex = ordered.findIndex((profile) => profile.name.toLowerCase() === nameKey);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;

  [ordered[currentIndex], ordered[nextIndex]] = [ordered[nextIndex], ordered[currentIndex]];
  targetProfilesDraft = rebalanceTargetProfilePriorities(ordered);
  targetProfilesRenderedKey = "";
  markTargetingDirty();
  renderTargetProfiles({ force: true });
}

function getTargetProfilesRenderKey(profiles, visibleCreatures, searchQuery = "") {
  const profileKey = profiles.map((p) => [
    p.name, p.enabled, p.priority, p.dangerLevel, p.keepDistanceMin, p.keepDistanceMax,
    p.finishBelowPercent, p.killMode, p.chaseMode, p.behavior, p.preferShootable, p.stickToTarget, p.avoidBeam, p.avoidWave,
  ].join(":")).join("|");
  const visibleKey = visibleCreatures.map((e) => String(e?.name || "")).join(",");
  return `${profileKey}::${visibleKey}::${String(searchQuery || "").trim().toLowerCase()}`;
}

function renderTargetingDistanceRuleList(rules = []) {
  if (!rules.length) {
    return '<div class="empty-state">No fallback combat rules yet. Creature profiles still handle per-creature priority, danger, focus, spacing, and escape behavior.</div>';
  }

  return rules
    .map((rule, index) => {
      const enabled = rule?.enabled !== false;
      const title = formatRuleDisplayName("distanceKeeper", rule, index);
      const sections = (MODULE_RULE_UI.distanceKeeper?.sections || [])
        .map((section) => renderModuleRuleFieldSection("distanceKeeper", index, rule, section))
        .join("");

      return `
        <div class="module-rule-card ${enabled ? "" : "module-rule-card-disabled"}" data-module-key="distanceKeeper" data-rule-index="${index}">
          <div class="module-rule-head">
            <div class="module-rule-title-row">
              <span class="module-rule-index">${escapeHtml(formatPriorityRankLabel(index))}</span>
              <strong class="module-rule-name">${escapeHtml(title)}</strong>
              <span class="module-rule-badge ${enabled ? "active" : "off"}">${enabled ? "Active" : "Off"}</span>
            </div>
            <div class="module-rule-actions">
              <button type="button" class="btn mini" data-targeting-distance-move="${index}" data-rule-delta="-1" ${index === 0 ? "disabled" : ""} aria-label="Raise priority for ${escapeHtml(title)}">Higher</button>
              <button type="button" class="btn mini" data-targeting-distance-move="${index}" data-rule-delta="1" ${index === rules.length - 1 ? "disabled" : ""} aria-label="Lower priority for ${escapeHtml(title)}">Lower</button>
              <button type="button" class="btn mini danger" data-targeting-distance-delete="${index}" aria-label="Delete ${escapeHtml(title)}">Delete Rule</button>
            </div>
          </div>
          <div class="module-rule-summary">${renderModuleRuleSummary("distanceKeeper", rule, { rules, index })}</div>
          <div class="module-rule-sections">${sections}</div>
        </div>
      `;
    })
    .join("");
}

function syncTargetingCombatSummaryLine(draft = getTargetingCombatDraft()) {
  if (!targetingDistanceEnabledToggle || !targetingDistanceState) {
    return;
  }

  targetingDistanceEnabledToggle.checked = Boolean(draft.distanceKeeperEnabled);
  const effectiveState = getDistanceKeeperEffectiveState({
    ...(state?.options || {}),
    ...draft,
  }, state);
  targetingDistanceState.textContent = [
    formatEffectiveModuleStatusLine(
      effectiveState,
      effectiveState.state === "on" ? (draft.distanceKeeperRules || []) : [],
    ),
    effectiveState.state === "on"
      ? formatModuleCurrentLine("distanceKeeper", draft.distanceKeeperRules || [], {
        ...(state?.options || {}),
        ...draft,
      })
      : effectiveState.detail,
  ].join(" / ");
  syncTextTitle(targetingDistanceState);
}

function renderTargetingCombatRules({ force = false } = {}) {
  if (!targetingDistanceRuleList || !targetingDistanceEnabledToggle || !targetingDistanceState) {
    return;
  }

  const draft = getTargetingCombatDraft();
  const renderKey = getTargetingCombatRenderKey(draft);
  const listHasFocus = targetingDistanceRuleList.contains(document.activeElement);

  syncTargetingCombatSummaryLine(draft);

  if (!force && listHasFocus) {
    return;
  }

  if (!force && targetingCombatRenderedKey === renderKey) {
    return;
  }

  targetingDistanceRuleList.innerHTML = renderTargetingDistanceRuleList(draft.distanceKeeperRules || []);
  targetingCombatRenderedKey = renderKey;
  markMainWindowTooltipsDirty();
}

function renderTargetProfiles({ force = false } = {}) {
  if (!targetProfileList) return;

  const profiles = sortTargetProfilesByPriority(syncTargetProfilesDraftToTargetNames(getMonsterInputNames()));
  const visibleCreatures = Array.isArray(state?.snapshot?.visibleCreatures) ? state.snapshot.visibleCreatures : [];
  const searchQuery = getCreatureRegistrySearchQuery();
  const searchTerms = getCreatureRegistrySearchTerms(searchQuery);
  const filteredProfiles = searchTerms.length
    ? profiles.filter((profile) => matchesCreatureRegistrySearch(profile.name, searchTerms))
    : profiles;

  if (!profiles.length) {
    if (targetProfilesRenderedKey !== "__empty") {
      targetProfileList.innerHTML = '<div class="empty-state">Add target monsters to tune priority order, danger, focus, spacing, avoidance, and run-away behavior.</div>';
      targetProfilesRenderedKey = "__empty";
    }
    return;
  }

  const renderKey = getTargetProfilesRenderKey(profiles, visibleCreatures, searchQuery);
  // Skip re-render if nothing changed and the user is actively editing inside the profile list.
  const profileListHasFocus = targetProfileList.contains(document.activeElement);
  if (!force && renderKey === targetProfilesRenderedKey && profileListHasFocus) {
    return;
  }
  if (!force && profileListHasFocus) {
    // Content changed but user is actively editing — defer the re-render
    return;
  }

  targetProfilesRenderedKey = renderKey;

  if (!filteredProfiles.length) {
    targetProfileList.innerHTML = `<div class="empty-state">${escapeHtml(formatCreatureSearchEmptyState("No target profiles yet", searchQuery))}</div>`;
    markMainWindowTooltipsDirty();
    return;
  }

  targetProfileList.innerHTML = filteredProfiles.map((profile, index) => {
    const visibleEntries = visibleCreatures.filter((entry) => String(entry?.name || "").trim().toLowerCase() === profile.name.toLowerCase());
    const summary = formatTargetProfileSummary(profile, visibleEntries);
    const activeBadge = profile.enabled ? "Active" : "Off";
    const rankedIndex = profiles.findIndex((entry) => entry.name.toLowerCase() === profile.name.toLowerCase());
    const priorityIndex = rankedIndex >= 0 ? rankedIndex : index;

    return `
      <section class="target-profile-row ${profile.enabled ? "" : "off"}" data-target-profile-name="${escapeHtml(profile.name)}" data-target-profile-index="${priorityIndex}">
        <div class="target-profile-head">
          <div class="target-profile-title">
            <span class="target-profile-priority">${escapeHtml(formatPriorityRankLabel(priorityIndex))}</span>
            <strong>${escapeHtml(profile.name)}</strong>
            <span class="target-profile-badge ${profile.enabled ? "active" : ""}">${activeBadge}</span>
          </div>
          <div class="target-profile-actions">
            <button type="button" class="btn mini" data-move-target-profile="${escapeHtml(profile.name)}" data-profile-delta="-1" ${priorityIndex === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(profile.name)} up">Move Up</button>
            <button type="button" class="btn mini" data-move-target-profile="${escapeHtml(profile.name)}" data-profile-delta="1" ${priorityIndex === profiles.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(profile.name)} down">Move Down</button>
            <label class="module-rule-control module-rule-check target-profile-check">
              <input type="checkbox" data-target-profile-field="enabled" ${profile.enabled ? "checked" : ""} />
              <span>Enabled</span>
            </label>
          </div>
        </div>
        <div class="target-profile-summary">${escapeHtml(summary)}</div>
        <div class="target-profile-grid compact-profile-grid">
          <label class="module-rule-control compact-rule-control">
            <span>Priority score</span>
            <input type="number" min="0" step="1" value="${escapeHtml(profile.priority)}" data-target-profile-field="priority" />
          </label>
          <label class="module-rule-control compact-rule-control">
            <span>Danger</span>
            <input type="number" min="0" max="10" step="1" value="${escapeHtml(profile.dangerLevel)}" data-target-profile-field="dangerLevel" />
          </label>
          <label class="module-rule-control compact-rule-control">
            <span>Spacing Min</span>
            <input type="number" min="0" step="1" value="${escapeHtml(profile.keepDistanceMin)}" data-target-profile-field="keepDistanceMin" />
          </label>
          <label class="module-rule-control compact-rule-control">
            <span>Spacing Max</span>
            <input type="number" min="0" step="1" value="${escapeHtml(profile.keepDistanceMax)}" data-target-profile-field="keepDistanceMax" />
          </label>
          <label class="module-rule-control compact-rule-control">
            <span>Finish <= %</span>
            <input type="number" min="0" max="100" step="1" value="${escapeHtml(profile.finishBelowPercent)}" data-target-profile-field="finishBelowPercent" />
          </label>
          <label class="module-rule-control compact-rule-control">
            <span>Focus Intensity</span>
            <select data-target-profile-field="killMode">
              ${Object.entries(TARGET_PROFILE_KILL_MODE_LABELS)
        .map(([value, label]) => `<option value="${escapeHtml(value)}" ${profile.killMode === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
        .join("")}
            </select>
          </label>
          <label class="module-rule-control compact-rule-control">
            <span>Stance</span>
            <select data-target-profile-field="chaseMode">
              ${renderCombatStanceSelectOptions(profile.chaseMode)}
            </select>
          </label>
          <label class="module-rule-control compact-rule-control target-intent-field">
            <span>Spacing</span>
            <select data-target-profile-field="behavior">
              ${Object.entries(TARGET_PROFILE_BEHAVIOR_LABELS)
        .map(([value, label]) => `<option value="${escapeHtml(value)}" ${profile.behavior === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
        .join("")}
            </select>
          </label>
        </div>
        <div class="target-profile-flags compact-profile-flags">
          <label class="module-rule-control module-rule-check target-profile-check compact-rule-control">
            <input type="checkbox" data-target-profile-field="preferShootable" ${profile.preferShootable ? "checked" : ""} />
            <span>Prefer shootable</span>
          </label>
          <label class="module-rule-control module-rule-check target-profile-check compact-rule-control">
            <input type="checkbox" data-target-profile-field="stickToTarget" ${profile.stickToTarget ? "checked" : ""} />
            <span>Stick to target</span>
          </label>
          <label class="module-rule-control module-rule-check target-profile-check compact-rule-control">
            <input type="checkbox" data-target-profile-field="avoidBeam" ${profile.avoidBeam ? "checked" : ""} />
            <span>Avoid beams</span>
          </label>
          <label class="module-rule-control module-rule-check target-profile-check compact-rule-control">
            <input type="checkbox" data-target-profile-field="avoidWave" ${profile.avoidWave ? "checked" : ""} />
            <span>Avoid waves</span>
          </label>
        </div>
      </section>
    `;
  }).join("");
  markMainWindowTooltipsDirty();
}

function renderTargeting() {
  const options = state.options;
  const hasDraftState = targetQueueDraft != null || targetProfilesDraft != null || targetingCombatDraft != null;
  const preserveDraft = !sessionContextResetPending && activeModalName === "targeting" && (targetingDirty || hasDraftState);
  const targetNames = preserveDraft
    ? getTargetQueueDraft()
    : sanitizeTargetMonsterNames(options.monsterNames || options.monster);

  if (!preserveDraft) {
    targetProfilesRenderedKey = "";
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    resetTargetingCombatDraft();
    setTargetQueueDraft(options.monsterNames || options.monster);
    setInputValue("port", options.port);
    setInputValue("intervalMs", options.intervalMs);
    setInputValue("retargetMs", options.retargetMs);
    setInputValue("rangeX", options.rangeX);
    setInputValue("rangeY", options.rangeY);
    setInputValue("floorTolerance", options.floorTolerance);
    setInputValue("pageUrlPrefix", options.pageUrlPrefix);
    setInputValue("autowalk-sharedSpawnMode", options.sharedSpawnMode || "respect-others");
    setInputValue("chaseMode", options.chaseMode || "auto");
    setCheckboxValue("once", options.once);
    setCheckboxValue("dryRun", options.dryRun);
  } else if (!targetingDirty) {
    setInputValue("autowalk-sharedSpawnMode", options.sharedSpawnMode || "respect-others");
    setInputValue("chaseMode", options.chaseMode || "auto");
    setCheckboxValue("once", options.once);
    setCheckboxValue("dryRun", options.dryRun);
  }

  syncTargetProfilesDraftToTargetNames(targetNames);
  renderMonsterArchive();
  renderTargetingCombatRules();
  renderTargetProfiles();
  renderAutowalkHuntSummary();
}

function renderTargetSourceRows({
  entries = [],
  removableKeys = null,
} = {}) {
  if (!entries.length) {
    return '<div class="empty-state">No monsters seen yet</div>';
  }

  return entries
    .map((entry) => {
      const rowClasses = ["monster-chip-row"];
      const classes = ["monster-chip"];
      if (entry.selected) classes.push("active");
      if (entry.visible) {
        classes.push("visible");
        rowClasses.push("visible");
      }
      const removable = removableKeys instanceof Set ? removableKeys.has(entry.key) : Boolean(removableKeys);
      const escapedName = escapeHtml(entry.name);
      return `
        <div class="${rowClasses.join(" ")}" draggable="true" data-creature-registry-name="${escapedName}" data-creature-registry-kind="monster">
          <button type="button" class="${classes.join(" ")}" data-name="${escapedName}" draggable="false">${escapedName}</button>
          ${removable
          ? `<button type="button" class="monster-chip-remove" data-remove-name="${escapedName}" aria-label="Remove ${escapedName} from monster archive" draggable="false">x</button>`
          : ""}
        </div>
      `;
    })
    .join("");
}

function renderPresenceRows(entries = [], {
  emptyState = "No entries yet",
  kind = "player",
} = {}) {
  if (!entries.length) {
    return `<div class="empty-state">${escapeHtml(emptyState)}</div>`;
  }

  return entries
    .map((entry) => {
      const classes = ["presence-chip", kind === "npc" ? "npc-chip" : "player-chip"];
      if (entry.visible) {
        classes.push("live");
      } else if (entry.archived) {
        classes.push("history");
      }
      const status = entry.visible
        ? "Nearby now"
        : entry.archived
          ? "Seen recently"
          : kind === "npc"
            ? "Tracked NPC"
            : "Tracked player";
      const label = kind === "npc" ? "NPC" : "Player";
      return `
        <div class="${classes.join(" ")}" draggable="true" data-creature-registry-name="${escapeHtml(entry.name)}" data-creature-registry-kind="${escapeHtml(kind)}">
          <strong>${escapeHtml(entry.name)}</strong>
          <span>${escapeHtml(status)} ${escapeHtml(label)}</span>
        </div>
      `;
    })
    .join("");
}

function renderMonsterArchive() {
  if (
    !monsterArchive
    || !monsterTargetList
    || !monsterVisibleNote
    || !playerVisibleNote
    || !playerVisibleList
    || !npcVisibleNote
    || !npcVisibleList
  ) {
    return;
  }

  const archivedNames = getArchivedMonsterNames();
  const visibleNames = getVisibleMonsterNames();
  const archivedPlayerNames = getArchivedPlayerNames();
  const archivedNpcNames = getArchivedNpcNames();
  const visiblePlayerNames = getVisiblePlayerNames();
  const visibleNpcNames = getVisibleNpcNames();
  const targetNames = getTargetQueueDraft();
  const searchQuery = getCreatureRegistrySearchQuery();
  const searchTerms = getCreatureRegistrySearchTerms(searchQuery);
  const monsterEntries = buildCreatureRegistryEntries({
    selectedNames: targetNames,
    archivedNames,
    visibleNames,
  });
  const playerEntries = buildCreatureRegistryEntries({
    archivedNames: archivedPlayerNames,
    visibleNames: visiblePlayerNames,
  });
  const npcEntries = buildCreatureRegistryEntries({
    archivedNames: archivedNpcNames,
    visibleNames: visibleNpcNames,
  });
  const archivedKeys = new Set(archivedNames.map((name) => name.toLowerCase()));
  const renderKey = [
    targetNames.join(","),
    visibleNames.join(","),
    visiblePlayerNames.join(","),
    visibleNpcNames.join(","),
    archivedNames.join(","),
    archivedPlayerNames.join(","),
    archivedNpcNames.join(","),
    searchQuery,
  ].join("::");

  if (monsterArchiveRenderedKey === renderKey) {
    renderTargetArchiveDanger();
    syncTargetingActionAvailability();
    return;
  }

  monsterVisibleNote.textContent = visibleNames.length
    ? `Nearby now (${visibleNames.length}): ${visibleNames.join(", ")}`
    : archivedNames.length
      ? `No monsters nearby. ${archivedNames.length} seen for this character.`
      : "No monsters seen yet for this character.";
  playerVisibleNote.textContent = visiblePlayerNames.length
    ? `Nearby now (${visiblePlayerNames.length}): ${visiblePlayerNames.join(", ")}`
    : playerEntries.length
      ? `No players nearby. ${playerEntries.length} seen for this character.`
      : "No players seen yet for this character.";
  npcVisibleNote.textContent = visibleNpcNames.length
    ? `Nearby now (${visibleNpcNames.length}): ${visibleNpcNames.join(", ")}`
    : npcEntries.length
      ? `No NPCs nearby. ${npcEntries.length} tracked for this character.`
      : "No NPCs nearby.";

  setTextContent(targetingRegistryFields.queue, String(targetNames.length));
  setTextContent(targetingRegistryFields.profiles, String(syncTargetProfilesDraftToTargetNames(targetNames).length));
  setTextContent(targetingRegistryFields.monsterHistory, String(monsterEntries.length));
  setTextContent(targetingRegistryFields.playerHistory, String(playerEntries.length));
  Object.values(targetingRegistryFields).forEach(syncTextTitle);

  const filteredTargetNames = filterNamesByCreatureRegistrySearch(targetNames, searchTerms);
  const filteredMonsterEntries = filterCreatureRegistryEntriesBySearch(monsterEntries, searchTerms);
  const filteredPlayerEntries = filterCreatureRegistryEntriesBySearch(playerEntries, searchTerms);
  const filteredNpcEntries = filterCreatureRegistryEntriesBySearch(npcEntries, searchTerms);

  monsterTargetList.innerHTML = filteredTargetNames.length
    ? filteredTargetNames
      .map((name) => `<button type="button" class="monster-chip active" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
      .join("")
    : `<div class="empty-state">${escapeHtml(formatCreatureSearchEmptyState("No targets selected", searchQuery))}</div>`;

  monsterArchive.innerHTML = filteredMonsterEntries.length
    ? renderTargetSourceRows({
      entries: filteredMonsterEntries,
      removableKeys: archivedKeys,
    })
    : `<div class="empty-state">${escapeHtml(formatCreatureSearchEmptyState("No monsters seen yet for this character", searchQuery))}</div>`;

  playerVisibleList.innerHTML = renderPresenceRows(filteredPlayerEntries, {
    emptyState: formatCreatureSearchEmptyState("No players seen yet", searchQuery),
    kind: "player",
  });
  npcVisibleList.innerHTML = renderPresenceRows(filteredNpcEntries, {
    emptyState: formatCreatureSearchEmptyState("No NPCs nearby", searchQuery),
    kind: "npc",
  });

  monsterArchiveRenderedKey = renderKey;
  markMainWindowTooltipsDirty();
  renderTargetArchiveDanger();
  syncTargetingActionAvailability();
  if (activeModalName === "targeting") {
    syncTargetWatchDockPosition({ clamp: true });
  }
}

function renderModules({ force = false } = {}) {
  const moduleKey = getActiveModuleKey();
  const schema = getModuleSchema(moduleKey);
  if (!schema) return;

  syncModuleViewPanels(moduleKey);

  const editingModules = !sessionContextResetPending && isModuleModalName(activeModalName) && modulesDraft;
  const modulesState = editingModules
    ? ensureModulesDraft()
    : cloneModuleOptions(state.options);
  const renderKey = getModulesRenderKey(modulesState);
  const shouldRenderLists = force || !editingModules || modulesRenderedKey !== renderKey;
  const view = getModuleView(moduleKey);

  if (shouldRenderLists && view.ruleList) {
    view.ruleList.innerHTML = renderModuleRuleList(moduleKey, modulesState[schema.rulesKey]);
  }
  if (shouldRenderLists && view.extraFields) {
    view.extraFields.innerHTML = renderModuleOptionFields(moduleKey, modulesState);
  }

  if (shouldRenderLists) {
    modulesRenderedKey = renderKey;
    markMainWindowTooltipsDirty();
  }

  syncModuleStatusDisplays(modulesState);
}

function getWaypointListStructureKey(waypoints = getWaypoints()) {
  const waypointKey = waypoints
    .map((waypoint, index) => [
      index,
      waypoint.x,
      waypoint.y,
      waypoint.z,
      waypoint.label,
      waypoint.type,
      waypoint.action,
      waypoint.targetIndex,
      waypoint.radius,
    ].join(":"))
    .join("|");

  return waypointKey;
}

function getWaypointListStateKey(waypoints = getWaypoints(), markedKey = getMarkedWaypointIndexes(waypoints).join(",")) {
  return `${state?.routeIndex ?? -1}::${state?.overlayFocusIndex ?? -1}::${shouldSuppressLiveWaypointHighlights() ? "reset-returning" : "live-highlight"}::${selectedWaypointIndex}::${markedKey}`;
}

function isWaypointListGridLayout() {
  return waypointList?.classList.contains("waypoint-list-grid");
}

function getWaypointListItemTitle(waypoint, index) {
  const heading = formatWaypointHeading(waypoint, index);
  return {
    heading,
    title: `${heading} / ${formatWaypointMeta(waypoint)} / Click select / Double-click edit / Right-click resume / Mark stages batch delete`,
  };
}

function renderWaypointListRow(waypoint, index, {
  focusIndex,
  suppressLiveHighlights,
  gridLayout = false,
} = {}) {
  const isCurrent = !suppressLiveHighlights && index === state?.routeIndex;
  const isFocus = !suppressLiveHighlights && index === focusIndex;
  const isSelected = index === selectedWaypointIndex;
  const isMarked = isWaypointMarked(index);
  const tone = getWaypointCardTone(waypoint.type);
  const detail = formatWaypointCardDetail(waypoint);
  const { heading, title } = getWaypointListItemTitle(waypoint, index);

  if (gridLayout) {
    return `
      <article
        class="waypoint-row ${isCurrent ? "current active" : ""} ${isFocus ? "focus" : ""} ${isSelected ? "selected" : ""} ${isMarked ? "marked" : ""}"
        data-index="${index}"
        title="${escapeHtml(title)}"
        ${tone ? `data-tone="${tone}"` : ""}
      >
        <button
          type="button"
          class="waypoint-row-main"
          data-index="${index}"
          aria-pressed="${isSelected ? "true" : "false"}"
          aria-label="${escapeHtml(`${heading}. Click to select this waypoint.`)}"
          title="${escapeHtml(title)}"
        >
          <div class="waypoint-chip-top">
            <span class="waypoint-row-index">${formatWaypointOrdinal(index)}</span>
            <span class="waypoint-chip-flags">
              ${renderWaypointCardStatePills(index, focusIndex)}
            </span>
          </div>
          <strong>${escapeHtml(getWaypointDisplayLabel(waypoint, index))}</strong>
          <span class="waypoint-chip-position">${escapeHtml(formatPosition(waypoint))}</span>
          <span class="waypoint-chip-detail">${escapeHtml(detail)}</span>
        </button>
        <div class="waypoint-row-actions">
          <button
            type="button"
            class="btn waypoint-mark-btn"
            data-waypoint-mark="${index}"
            aria-pressed="${isMarked ? "true" : "false"}"
            aria-label="${escapeHtml(`${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`)}"
            title="${escapeHtml(`${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`)}"
          >M</button>
        </div>
      </article>
    `;
  }

  return `
    <article
      class="waypoint-row ${isCurrent ? "current active" : ""} ${isFocus ? "focus" : ""} ${isSelected ? "selected" : ""} ${isMarked ? "marked" : ""}"
      data-index="${index}"
      title="${escapeHtml(title)}"
      ${tone ? `data-tone="${tone}"` : ""}
    >
      <button
        type="button"
        class="waypoint-row-main"
        data-index="${index}"
        aria-pressed="${isSelected ? "true" : "false"}"
        aria-label="${escapeHtml(`${heading}. Click to select this waypoint.`)}"
        title="${escapeHtml(title)}"
      >
        <span class="waypoint-row-index">${formatWaypointOrdinal(index)}</span>
        <strong>${escapeHtml(getWaypointDisplayLabel(waypoint, index))}</strong>
        <span class="waypoint-chip-position">${escapeHtml(formatPosition(waypoint))}</span>
        <span class="waypoint-chip-detail">${escapeHtml(detail)}</span>
        <span class="waypoint-chip-flags">
          ${renderWaypointCardStatePills(index, focusIndex)}
        </span>
      </button>
      <div class="waypoint-row-actions">
        <button
          type="button"
          class="btn waypoint-mark-btn"
          data-waypoint-mark="${index}"
          aria-pressed="${isMarked ? "true" : "false"}"
          aria-label="${escapeHtml(`${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`)}"
          title="${escapeHtml(`${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`)}"
        >M</button>
      </div>
    </article>
  `;
}

function syncWaypointListRowState(waypoints = getWaypoints()) {
  const rows = Array.from(waypointList?.querySelectorAll(".waypoint-row") || []);
  const focusIndex = getOverlayFocusIndex(waypoints);
  const suppressLiveHighlights = shouldSuppressLiveWaypointHighlights();

  rows.forEach((row) => {
    const index = Number(row.dataset.index);
    const waypoint = waypoints[index];
    if (!waypoint) return;

    const isCurrent = !suppressLiveHighlights && index === state?.routeIndex;
    const isFocus = !suppressLiveHighlights && index === focusIndex;
    const isSelected = index === selectedWaypointIndex;
    const isMarked = isWaypointMarked(index, waypoints);
    const tone = getWaypointCardTone(waypoint.type);
    const { heading, title } = getWaypointListItemTitle(waypoint, index);
    const mainButton = row.querySelector(".waypoint-row-main");
    const markButton = row.querySelector("[data-waypoint-mark]");

    row.classList.toggle("current", isCurrent);
    row.classList.toggle("active", isCurrent);
    row.classList.toggle("focus", isFocus);
    row.classList.toggle("selected", isSelected);
    row.classList.toggle("marked", isMarked);
    row.title = title;
    if (tone) {
      row.dataset.tone = tone;
    } else {
      delete row.dataset.tone;
    }

    if (mainButton instanceof HTMLElement) {
      mainButton.setAttribute("aria-pressed", isSelected ? "true" : "false");
      mainButton.setAttribute("aria-label", `${heading}. Click to select this waypoint.`);
      mainButton.title = title;
    }

    if (markButton instanceof HTMLElement) {
      const markLabel = `${isMarked ? "Unmark" : "Mark"} ${heading} for batch delete`;
      markButton.setAttribute("aria-pressed", isMarked ? "true" : "false");
      markButton.setAttribute("aria-label", markLabel);
      markButton.title = markLabel;
    }
  });
}

function invalidateWaypointListRender() {
  waypointListStructureRenderedKey = "";
  waypointListStateRenderedKey = "";
}

function renderWaypointList(waypoints) {
  const structureKey = `${isWaypointListGridLayout() ? "grid" : "simple"}::${getWaypointListStructureKey(waypoints)}`;
  const stateKey = getWaypointListStateKey(waypoints);
  if (waypointListStructureRenderedKey === structureKey && waypointListStateRenderedKey === stateKey) {
    return;
  }

  if (waypointListStructureRenderedKey !== structureKey) {
    const previousScrollTop = waypointList.scrollTop;
    const previousScrollLeft = waypointList.scrollLeft;
    const focusIndex = getOverlayFocusIndex(waypoints);
    const suppressLiveHighlights = shouldSuppressLiveWaypointHighlights();
    const gridLayout = isWaypointListGridLayout();

    waypointList.innerHTML = waypoints.length
      ? waypoints
        .map((waypoint, index) => renderWaypointListRow(waypoint, index, {
          focusIndex,
          suppressLiveHighlights,
          gridLayout,
        }))
        .join("")
      : '<div class="empty-state">No waypoints in route stack</div>';

    waypointList.scrollTop = previousScrollTop;
    waypointList.scrollLeft = previousScrollLeft;
    waypointListStructureRenderedKey = structureKey;
  } else {
    syncWaypointListRowState(waypoints);
  }

  waypointListStateRenderedKey = stateKey;
  markMainWindowTooltipsDirty();
}

function getAutowalkMonsterNames() {
  const field = document.getElementById("monster");
  return field
    ? sanitizeTargetMonsterNames(field.value)
    : sanitizeTargetMonsterNames(state?.options?.monsterNames || state?.options?.monster);
}

function getAutowalkSharedSpawnMode() {
  const value = String(
    document.getElementById("autowalk-sharedSpawnMode")?.value
    || state?.options?.sharedSpawnMode
    || "respect-others",
  )
    .trim()
    .toLowerCase();
  return SHARED_SPAWN_MODE_LABELS[value]
    ? value
    : "respect-others";
}

function getChaseModeValue() {
  const value = String(
    document.getElementById("chaseMode")?.value
    || state?.options?.chaseMode
    || "auto",
  )
    .trim()
    .toLowerCase();
  return CHASE_MODE_LABELS[value] ? value : "auto";
}

function renderAutowalkHuntSummary() {
  if (!state?.options) {
    return;
  }

  const monsterNames = getAutowalkMonsterNames();
  const targetProfiles = syncTargetProfilesToNames(monsterNames, readTargetProfilesFromDom());
  const combatDraft = captureTargetingCombatDraftFromDom();
  const distanceRules = normalizeTargetingDistanceRules(cloneValue(combatDraft.distanceKeeperRules || []));
  const distanceEnabled = Boolean(combatDraft.distanceKeeperEnabled);
  const sharedSpawnMode = getAutowalkSharedSpawnMode();
  const chaseMode = getChaseModeValue();
  const countTargets = [
    ["autowalk-target-queue-count", monsterNames.length],
    ["autowalk-target-profile-count", targetProfiles.length],
    ["autowalk-distance-rule-count", distanceRules.length],
    ["route-hunt-launchpad-queue-count", monsterNames.length],
    ["route-hunt-launchpad-profile-count", targetProfiles.length],
    ["route-hunt-launchpad-distance-rule-count", distanceRules.length],
  ];
  const sharedSpawnSummaryText = [
    `${SHARED_SPAWN_MODE_LABELS[sharedSpawnMode]}: ${SHARED_SPAWN_MODE_COPY[sharedSpawnMode]}`,
    sharedSpawnMode === "attack-all"
      ? "Reserved monsters are still protected."
      : "Trusted party-follow names stay eligible and will not block your hunt.",
  ].join(" ");
  const distanceSummaryText = [
    `Stance ${CHASE_MODE_LABELS[chaseMode] || CHASE_MODE_LABELS.auto}`,
    formatEffectiveModuleStatusLine(
      getModuleEffectiveState("distanceKeeper", {
        ...(state?.options || {}),
        ...combatDraft,
        distanceKeeperEnabled: distanceEnabled,
        distanceKeeperRules: distanceRules,
        chaseMode,
      }, state),
      distanceRules,
    ),
    formatModuleCurrentLine("distanceKeeper", distanceRules),
  ].join(" / ");

  for (const [id, value] of countTargets) {
    setTextContent(document.getElementById(id), String(value));
  }

  for (const id of ["autowalk-shared-spawn-summary", "route-hunt-launchpad-shared-spawn-summary"]) {
    const summary = document.getElementById(id);
    if (summary) {
      summary.textContent = sharedSpawnSummaryText;
      syncTextTitle(summary);
    }
  }

  for (const id of ["autowalk-distance-summary", "route-hunt-launchpad-distance-summary"]) {
    const summary = document.getElementById(id);
    if (summary) {
      summary.textContent = distanceSummaryText;
      syncTextTitle(summary);
    }
  }
}

function renderAutowalk({ liveOnly = false } = {}) {
  const options = state.options;
  const waypoints = options.waypoints || [];
  const tileRules = options.tileRules || [];
  const activeMode = getResolvedRouteEditorMode(waypoints, tileRules);
  const autowalkModalActive = activeModalName === "autowalk";
  routeEditorMode = activeMode;

  if (selectedWaypointIndex >= waypoints.length) {
    selectedWaypointIndex = Math.max(0, waypoints.length - 1);
  }
  if (selectedTileRuleIndex >= tileRules.length) {
    selectedTileRuleIndex = Math.max(0, tileRules.length - 1);
  }

  const preserveRouteDraft = !liveOnly && !sessionContextResetPending && (autowalkDirty || isAutowalkSettingFieldActive());

  if (!liveOnly && !preserveRouteDraft) {
    setInputValue("cavebotName", options.cavebotName);
    setCheckboxValue("autowalkEnabled", options.autowalkEnabled);
    setCheckboxValue("autowalkLoop", options.autowalkLoop);
    setCheckboxValue("routeStrictClear", options.routeStrictClear);
    setCheckboxValue("routeFollowExactWaypoints", options.routeFollowExactWaypoints);
    setCheckboxValue("routeRecording", options.routeRecording);
    setCheckboxValue("showWaypointOverlay", options.showWaypointOverlay);
    setCheckboxValue("avoidElementalFields", options.avoidElementalFields);
    for (const [key, id] of Object.entries(AVOID_FIELD_CATEGORY_INPUT_IDS)) {
      setCheckboxValue(id, options.avoidFieldCategories?.[key] !== false);
    }
    setInputValue("vocation", options.vocation || "");
    setCheckboxValue("sustainEnabled", options.sustainEnabled);
    setInputValue("sustainCooldownMs", options.sustainCooldownMs);
    setCheckboxValue("preferHotbarConsumables", options.preferHotbarConsumables);
    setInputValue("routeRecordStep", options.routeRecordStep);
    setInputValue("waypointRadius", options.waypointRadius);
    setInputValue("walkRepathMs", options.walkRepathMs);
  }

  if (!liveOnly) {
    renderAvoidFieldControls(preserveRouteDraft ? getAvoidFieldDraft(options) : options);
    renderRouteFileInfo(state.routeProfile);
    renderRouteLibrary();
  }

  renderRouteOverview(state.routeProfile, waypoints, {
    livePreview: !liveOnly || autowalkModalActive || getDeskCavebotControlState(state).runningCount <= 1,
  });
  if (liveOnly && !autowalkModalActive) {
    return;
  }

  renderWaypointBatchSelection(waypoints);
  renderWaypointList(waypoints);
  renderRouteDangerZone(waypoints);

  if (liveOnly) {
    return;
  }

  renderTileRuleList(tileRules);

  const waypointEditorValue = getWaypointEditorValue(waypoints);
  const tileRuleEditorValue = getTileRuleEditorValue(tileRules);

  renderRouteEditorFrame(activeMode, waypoints, tileRules);
  renderWaypointSelectionSummary(waypoints, activeMode);
  renderTileRuleSelectionSummary(tileRules);

  if (activeMode === "tileRule") {
    renderRouteItemSharedFields(tileRuleEditorValue);
    renderTileRuleEditor(tileRuleEditorValue, tileRules);
  } else {
    renderRouteItemSharedFields(waypointEditorValue);
    setInputValue("waypoint-type", waypointEditorValue.type || "walk");
    setInputValue("waypoint-step-radius", waypointEditorValue.radius ?? "");
    renderWaypointEditorDetails(waypointEditorValue, waypoints);
  }

  renderAutowalkHuntSummary();
}

function renderHuntPresets() {
  if (!huntPresetList || !huntPresetDetail || !huntPresetCount) {
    return;
  }

  const allPresets = getHuntPresets();
  const filteredPresets = getFilteredHuntPresets();
  const selectedPreset = getSelectedHuntPreset(filteredPresets);
  const query = getHuntPresetSearchQuery();

  setTextContent(
    huntPresetCount,
    query ? `${filteredPresets.length} / ${allPresets.length}` : String(filteredPresets.length),
  );

  if (!allPresets.length) {
    const renderKey = "__empty-all__";
    if (huntPresetsRenderedKey !== renderKey) {
      huntPresetList.innerHTML = '<div class="empty-state">No vendored hunt presets available.</div>';
      huntPresetDetail.innerHTML = '<div class="empty-state">Refresh the Minibia data bundle to repopulate official hunt presets.</div>';
      huntPresetsRenderedKey = renderKey;
      markMainWindowTooltipsDirty();
    }
    return;
  }

  if (!filteredPresets.length) {
    const renderKey = `__empty-filtered__::${query}`;
    if (huntPresetsRenderedKey !== renderKey) {
      huntPresetList.innerHTML = '<div class="empty-state">No official hunts match this search.</div>';
      huntPresetDetail.innerHTML = '<div class="empty-state">Try a monster name, task keyword, or loot item.</div>';
      huntPresetsRenderedKey = renderKey;
      markMainWindowTooltipsDirty();
    }
    return;
  }

  const lifecycle = getDeskLifecycle();
  const canApply = lifecycle.ready && lifecycle.bound && !lifecycle.activeIsBusy && lifecycle.present;
  const applyReason = !lifecycle.ready
    ? "Wait for the desk to finish syncing."
    : !lifecycle.bound
      ? (lifecycle.hasInstances ? "Select a live character tab first." : "Open a live Minibia client first.")
      : lifecycle.activeIsBusy
        ? "That character is already linked to another Minibot window."
        : !lifecycle.present
          ? "This character tab is no longer connected to a live client."
          : "Load this official hunt into the active character tab.";
  const renderKey = [
    query,
    allPresets.length,
    filteredPresets.length,
    filteredPresets[0]?.id || "",
    filteredPresets.at(-1)?.id || "",
    selectedPreset?.id || "",
    canApply ? "1" : "0",
    applyReason,
  ].join("::");

  if (huntPresetsRenderedKey === renderKey) {
    return;
  }

  huntPresetList.innerHTML = filteredPresets
    .map((preset) => {
      const selected = preset.id === selectedPreset?.id;
      const taskLabel = preset.requiredKills
        ? `${preset.taskName || "Task"} / ${preset.requiredKills} kills`
        : (preset.taskName || "Free hunt preset");
      const tags = Array.isArray(preset.tags) ? preset.tags : [];
      return `
        <button
          type="button"
          class="hunt-preset-row ${selected ? "selected" : ""}"
          data-hunt-preset-id="${escapeHtml(preset.id)}"
          aria-pressed="${selected ? "true" : "false"}"
        >
          <div class="hunt-preset-row-head">
            <strong>${escapeHtml(preset.monsterName || "-")}</strong>
            <span class="hunt-preset-tag" data-tone="${preset.requiredKills ? "task" : "combat"}">${escapeHtml(formatHuntPresetMetric(preset.experience, " xp"))}</span>
          </div>
          <div class="hunt-preset-row-meta">${escapeHtml(taskLabel)}</div>
          <div class="hunt-preset-tag-row">
            ${tags.map((tag) => `<span class="hunt-preset-tag" data-tone="${getHuntPresetTagTone(tag)}">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="hunt-preset-row-meta">${escapeHtml(formatHuntPresetProfileSummary(preset.targetProfile || {}))}</div>
        </button>
      `;
    })
    .join("");

  const lootHighlights = Array.isArray(selectedPreset?.lootHighlights) ? selectedPreset.lootHighlights : [];
  const tags = Array.isArray(selectedPreset?.tags) ? selectedPreset.tags : [];
  const taskCopy = selectedPreset?.requiredKills
    ? `${selectedPreset.taskName || "Task"} needs ${selectedPreset.requiredKills} kills.`
    : (selectedPreset?.taskName || "No linked task achievement for this monster.");

  huntPresetDetail.innerHTML = selectedPreset
    ? `
      <div class="hunt-preset-detail-panel">
        <div class="hunt-preset-detail-card">
          <div class="hunt-preset-detail-head">
            <div>
              <strong>${escapeHtml(selectedPreset.monsterName || "-")}</strong>
              <div class="hunt-preset-detail-copy">${escapeHtml(taskCopy)}</div>
            </div>
            <div class="hunt-preset-tag-row">
              ${tags.map((tag) => `<span class="hunt-preset-tag" data-tone="${getHuntPresetTagTone(tag)}">${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="hunt-preset-summary-grid">
            <div class="summary-cell">
              <span>XP</span>
              <strong>${escapeHtml(formatHuntPresetMetric(selectedPreset.experience))}</strong>
            </div>
            <div class="summary-cell">
              <span>HP</span>
              <strong>${escapeHtml(formatHuntPresetMetric(selectedPreset.health))}</strong>
            </div>
            <div class="summary-cell">
              <span>Speed</span>
              <strong>${escapeHtml(formatHuntPresetMetric(selectedPreset.speed))}</strong>
            </div>
            <div class="summary-cell">
              <span>Danger</span>
              <strong>${escapeHtml(formatHuntPresetMetric(selectedPreset.targetProfile?.dangerLevel))}</strong>
            </div>
          </div>
        </div>

        <div class="hunt-preset-detail-card">
          <div class="section-title">Suggested Target Profile</div>
          <div class="section-meta">${escapeHtml(formatHuntPresetProfileSummary(selectedPreset.targetProfile || {}))}</div>
          <div class="hunt-preset-detail-note">Queues the monster and can seed the matching target profile.</div>
        </div>

        <div class="hunt-preset-detail-card">
          <div class="section-title">Loot Highlights</div>
          <div class="hunt-preset-tag-row">
            ${(lootHighlights.length ? lootHighlights : ["No loot snapshot"]).map((item) => `<span class="hunt-preset-tag">${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>

        <div class="hunt-preset-detail-card">
          <div class="section-title">Apply</div>
          <div class="section-meta">${escapeHtml(applyReason)}</div>
          <div class="hunt-preset-detail-actions">
            <button
              type="button"
              class="btn"
              data-apply-hunt-preset="queue"
              ${canApply ? "" : "disabled"}
              title="${escapeHtml(applyReason)}"
            >Queue Monster</button>
            <button
              type="button"
              class="btn primary"
              data-apply-hunt-preset="queue-profile"
              ${canApply ? "" : "disabled"}
              title="${escapeHtml(applyReason)}"
            >Queue + Profile</button>
          </div>
        </div>
      </div>
    `
    : '<div class="empty-state">Select a hunt preset to inspect the official task and monster snapshot.</div>';
  huntPresetsRenderedKey = renderKey;
  markMainWindowTooltipsDirty();
}

function parseLogLine(line) {
  const text = String(line || "").trim();
  const parts = text.match(/^\[(.*?)\]\s?(.*)$/);
  return {
    time: String(parts?.[1] || "--:--:--").trim() || "--:--:--",
    message: String(parts?.[2] || text || "No details").trim() || "No details",
  };
}

function getFeedLifecycleLabel(lifecycle = getDeskLifecycle()) {
  switch (lifecycle.phase) {
    case "running":
      return "Running";
    case "synced":
      return "Synced";
    case "sync-needed":
      return "Sync Needed";
    case "busy":
      return "Read Only";
    case "missing":
      return "Missing";
    case "selection-needed":
      return "Select Tab";
    case "no-client":
      return "Waiting";
    case "loading":
    default:
      return "Loading";
  }
}

function getFeedSummaryCopy(lifecycle = getDeskLifecycle(), options = state?.options || {}, visibleCount = 0) {
  const routeName = String(options?.cavebotName || "").trim();

  switch (lifecycle.phase) {
    case "running":
      return routeName
        ? `Live on ${routeName}. ${visibleCount ? "Newest events stay pinned here." : "Waiting for the first live event."}`
        : (visibleCount ? "Bot live. Newest events stay pinned here." : "Bot live. Waiting for the first event.");
    case "synced":
      return routeName
        ? `${routeName} is linked. ${visibleCount ? "Newest events stay pinned here." : "Waiting for recent activity."}`
        : (visibleCount ? "Character linked. Newest events stay pinned here." : "Character linked. Waiting for recent activity.");
    case "sync-needed":
      return routeName ? `${routeName} is selected but needs a fresh sync.` : "Selected tab needs a fresh sync.";
    case "busy":
      return "This character is locked by another desk.";
    case "missing":
      return "The selected live client is missing.";
    case "selection-needed":
      return "Select a live character tab to populate the feed.";
    case "no-client":
      return "Open a live Minibia client to start the feed.";
    case "loading":
    default:
      return "Loading console activity.";
  }
}

function getFeedEmptyCopy(lifecycle = getDeskLifecycle()) {
  switch (lifecycle.phase) {
    case "running":
    case "synced":
      return "New logs from the active tab appear here.";
    case "sync-needed":
      return "Refresh the active tab to resume recent activity.";
    case "busy":
      return "This tab is visible, but another desk currently owns it.";
    case "selection-needed":
      return "Select a live character tab to start the feed.";
    case "no-client":
      return "Open a live Minibia client to start the feed.";
    case "missing":
      return "Reconnect the missing live client to restore activity.";
    case "loading":
    default:
      return "Waiting for recent activity.";
  }
}

function getFeedEventKind(message = "") {
  const text = String(message || "").toLowerCase();

  if (/\b(error|failed|unable|missing|stale|busy|locked|dead|alarm)\b/.test(text)) {
    return { label: "Alert", tone: "alert" };
  }

  if (/\b(created|renamed|deleted|saved|loaded)\b/.test(text) || /\bfile\b/.test(text)) {
    return { label: "File", tone: "file" };
  }

  if (/\b(cavebot|route|waypoint|autowalk|reconnect|aggro|return active|returning)\b/.test(text)) {
    return { label: "Route", tone: "route" };
  }

  if (/\b(started|stopped|paused|resumed|enabled|disabled|running)\b/.test(text)) {
    return { label: "State", tone: "live" };
  }

  if (/\b(attached|linked|sync|synced|recovered|refresh)\b/.test(text)) {
    return { label: "Sync", tone: "ready" };
  }

  return { label: "Event", tone: "neutral" };
}

function resetLogOutputRenderCache() {
  logOutputRenderedSessionId = "";
  logOutputRenderedFirst = "";
  logOutputRenderedLast = "";
  logOutputRenderedLength = 0;
  logOutputRenderedText = "";
}

function syncLogOutput(logs = []) {
  const sessionId = String(state?.activeSessionId || "");
  const first = logs[0] || "";
  const last = logs.at(-1) || "";
  const canAppend = Boolean(
    logOutputRenderedSessionId === sessionId
    && logs.length === logOutputRenderedLength + 1
    && logs.length > 0
    && first === logOutputRenderedFirst
    && logs.at(-2) === logOutputRenderedLast
    && logOutputRenderedText
  );

  if (!logs.length) {
    logOutputRenderedText = "";
  } else if (canAppend) {
    logOutputRenderedText = `${logOutputRenderedText}\n${last}`;
  } else {
    logOutputRenderedText = logs.join("\n");
  }

  logOutput.textContent = logOutputRenderedText;
  logOutput.scrollTop = logOutput.scrollHeight;
  logOutputRenderedSessionId = sessionId;
  logOutputRenderedFirst = first;
  logOutputRenderedLast = last;
  logOutputRenderedLength = logs.length;
  return canAppend ? "append" : "replace";
}

function normalizeRuntimeMetric(metric = null) {
  return metric && typeof metric === "object" ? metric : null;
}

function formatRuntimeMetricDetail(metric = null) {
  if (!metric) return "waiting for samples";

  const parts = [
    `avg ${formatRuntimeTimingMs(metric.avgMs)}`,
    `max ${formatRuntimeTimingMs(metric.maxMs)}`,
    `${Math.max(0, Math.trunc(Number(metric.count) || 0))} sample${Number(metric.count) === 1 ? "" : "s"}`,
  ];

  if (Object.prototype.hasOwnProperty.call(metric, "includeLogs")) {
    parts.push(metric.includeLogs ? "logs included" : "logs skipped");
  }

  if (Object.prototype.hasOwnProperty.call(metric, "scope")) {
    parts.push(`${metric.scope || "full"} scope`);
  }

  if (Object.prototype.hasOwnProperty.call(metric, "outputMode")) {
    parts.push(`log ${metric.outputMode || "skip"}`);
  }

  return parts.join(" / ");
}

function renderRuntimeMetrics() {
  if (!runtimeMetricsOutput) return;
  if (activeModalName !== "logs") {
    runtimeMetricsRenderedKey = "";
    return;
  }

  const runtimeMetrics = state?.runtimeMetrics && typeof state.runtimeMetrics === "object"
    ? state.runtimeMetrics
    : {};
  const activeSession = (state?.sessions || []).find((session) => (
    String(session.id || "") === String(state?.activeSessionId || "")
  )) || null;
  const desktopMetrics = runtimeMetrics.desktop || {};
  const botMetrics = runtimeMetrics.activeSession || activeSession?.runtimeTiming || {};
  const rendererMetrics = serializeRuntimeTimingStore(rendererRuntimeTiming);
  const items = [
    { label: "Tick", metric: normalizeRuntimeMetric(botMetrics.tick) },
    { label: "Patch", metric: normalizeRuntimeMetric(desktopMetrics.livePatch) },
    { label: "Serialize", metric: normalizeRuntimeMetric(desktopMetrics.serializeLiveState) },
    { label: "Render", metric: normalizeRuntimeMetric(rendererMetrics.render) },
    { label: "Logs", metric: normalizeRuntimeMetric(rendererMetrics.renderLogs) },
  ];
  const renderKey = items
    .map(({ label, metric }) => [
      label,
      metric?.count || 0,
      metric?.lastMs || 0,
      metric?.avgMs || 0,
      metric?.maxMs || 0,
      metric?.includeLogs == null ? "" : String(metric.includeLogs),
      metric?.scope || "",
      metric?.outputMode || "",
    ].join(":"))
    .join("|");

  if (runtimeMetricsRenderedKey === renderKey) {
    return;
  }

  runtimeMetricsOutput.innerHTML = items
    .map(({ label, metric }) => `
      <div class="runtime-metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(metric ? formatRuntimeTimingMs(metric.lastMs) : "-")}</strong>
        <small>${escapeHtml(formatRuntimeMetricDetail(metric))}</small>
      </div>
    `)
    .join("");
  runtimeMetricsRenderedKey = renderKey;
}

function renderLogs() {
  const renderStartedAt = getMonotonicNowMs();
  let updated = false;
  let outputMode = "skip";
  const logs = state.logs || [];
  const latest = logs.slice(-8).reverse();
  const lifecycle = getDeskLifecycle();
  const activeLabel = getBindingLabel() || "No Live Character";
  const renderKey = [
    String(state?.activeSessionId || ""),
    lifecycle.phase,
    lifecycle.tone,
    activeLabel,
    String(state?.options?.cavebotName || ""),
    String(state?.logRevision ?? ""),
    logs.length,
    logs[0] || "",
    logs.at(-1) || "",
  ].join("::");

  try {
    if (logsRenderedKey === renderKey) {
      return;
    }

    const latestEntry = latest.length ? parseLogLine(latest[0]) : null;
    const summaryCopy = getFeedSummaryCopy(lifecycle, state?.options || {}, latest.length);
    const visibleLabel = logs.length > latest.length ? `${latest.length} of ${logs.length} shown` : `${latest.length} shown`;

    if (eventFeedMeta) {
      setTextContent(
        eventFeedMeta,
        latest.length ? `Newest first / ${visibleLabel}` : "Waiting for recent activity",
      );
    }

    if (eventFeedSummary) {
      eventFeedSummary.innerHTML = `
        <div class="feed-summary-card" data-tone="${escapeHtml(lifecycle.tone)}">
          <div class="feed-summary-top">
            <div class="feed-summary-copy">
              <span class="feed-summary-kicker">Active Tab</span>
              <strong title="${escapeHtml(activeLabel)}">${escapeHtml(activeLabel)}</strong>
              <span class="feed-summary-note">${escapeHtml(summaryCopy)}</span>
            </div>
            <span class="feed-status-badge" data-tone="${escapeHtml(lifecycle.tone)}">${escapeHtml(getFeedLifecycleLabel(lifecycle))}</span>
          </div>
          <div class="feed-summary-grid">
            <div class="feed-summary-metric">
              <span>Feed</span>
              <strong>${escapeHtml(logs.length ? visibleLabel : "Idle")}</strong>
            </div>
            <div class="feed-summary-metric">
              <span>Last</span>
              <strong>${escapeHtml(latestEntry?.time || "--:--:--")}</strong>
            </div>
          </div>
        </div>
      `;
    }

    if (!latest.length) {
      eventFeed.innerHTML = `
        <div class="empty-state feed-empty-state">
          <strong>No recent activity</strong>
          <span>${escapeHtml(getFeedEmptyCopy(lifecycle))}</span>
        </div>
      `;
    } else {
      eventFeed.innerHTML = latest
        .map((line, index) => {
          const { time, message } = parseLogLine(line);
          const eventKind = getFeedEventKind(message);
          return `
            <article class="feed-row ${index === 0 ? "latest" : ""}" data-tone="${escapeHtml(eventKind.tone)}">
              <div class="feed-row-head">
                <time>${escapeHtml(time)}</time>
                <span class="feed-row-badge" data-tone="${escapeHtml(eventKind.tone)}">${escapeHtml(eventKind.label)}</span>
              </div>
              <strong title="${escapeHtml(message)}">${escapeHtml(message)}</strong>
            </article>
          `;
        })
        .join("");
    }

    outputMode = syncLogOutput(logs);
    logsRenderedKey = renderKey;
    updated = true;
    markMainWindowTooltipsDirty();
  } finally {
    recordRendererRuntimeTiming("renderLogs", getMonotonicNowMs() - renderStartedAt, {
      updated,
      outputMode,
      logCount: logs.length,
    });
  }
}

function renderLoadingSummarySheets() {
  Object.values(summaryFields).forEach((element) => {
    setTextContent(element, "-");
  });
}

function renderLoadingState() {
  dashboardRenderedKey = "";
  botTabsRenderedKey = "";
  monsterArchiveRenderedKey = "";
  huntPresetsRenderedKey = "";
  accountRegistryRenderedKey = "";
  accountDraftRenderedKey = "";
  logsRenderedKey = "";
  runtimeMetricsRenderedKey = "";
  resetLogOutputRenderCache();
  routeOverviewRenderedKey = "";
  Object.values(targetingRegistryFields).forEach((field) => setTextContent(field, "-"));
  renderDeskIdentity();
  setTextContent(refreshButton, "Scan All Tabs");
  setTextContent(killSessionButton, "Close Session");
  setTextContent(newRouteButton, "New Route");
  setTextContent(routeOverviewFields.name, "-");
  setTextContent(routeOverviewFields.count, "-");
  setTextContent(routeOverviewFields.focus, "-");
  setTextContent(huntPresetCount, "-");
  if (routeOverviewFields.note) {
    routeOverviewFields.note.textContent = "Waiting for route state.";
  }
  if (routeOverviewFields.preview) {
    routeOverviewFields.preview.innerHTML = '<div class="empty-state">Waiting for live route state</div>';
  }
  syncRouteLivePreviewVisibility([]);
  if (huntPresetList) {
    huntPresetList.innerHTML = '<div class="empty-state">Waiting for vendored hunt data</div>';
  }
  if (huntPresetDetail) {
    huntPresetDetail.innerHTML = '<div class="empty-state">Waiting for vendored hunt data</div>';
  }
  invalidateWaypointListRender();
  routeLivePreviewRenderedKey = "";
  if (eventFeedMeta) {
    setTextContent(eventFeedMeta, "Waiting for recent activity");
  }
  if (eventFeedSummary) {
    eventFeedSummary.innerHTML = `
      <div class="feed-summary-card" data-tone="warn">
        <div class="feed-summary-top">
          <div class="feed-summary-copy">
            <span class="feed-summary-kicker">Active Tab</span>
            <strong>Loading console</strong>
            <span class="feed-summary-note">Waiting for live session details.</span>
          </div>
          <span class="feed-status-badge" data-tone="warn">Loading</span>
        </div>
        <div class="feed-summary-grid">
          <div class="feed-summary-metric">
            <span>Feed</span>
            <strong>-</strong>
          </div>
          <div class="feed-summary-metric">
            <span>Last</span>
            <strong>--:--:--</strong>
          </div>
        </div>
      </div>
    `;
  }
  eventFeed.innerHTML = '<div class="empty-state">Waiting for log feed</div>';
  logOutput.textContent = "Waiting for log output...";
  if (accountSelect) {
    accountSelect.innerHTML = '<option value="">Waiting for saved accounts</option>';
  }
  if (accountMeta) {
    accountMeta.textContent = "Waiting for account registry.";
    accountMeta.title = accountMeta.textContent;
  }
  renderLoadingSummarySheets();
  renderCompactPanel();
  syncDeskActionTitles();
  syncWindowPinControls();
  markMainWindowTooltipsDirty();
}

function render(renderScope = "full") {
  const renderStartedAt = getMonotonicNowMs();
  const normalizedRenderScope = renderScope === "live" ? "live" : "full";

  try {
    if (!state) {
      renderLoadingState();
      renderDeskStatus();
      syncControlAvailability();
      syncPersistentBusyState();
      syncButtonFeedbackState();
      syncMainWindowTooltips();
      sessionContextResetPending = false;
      return;
    }

    renderDeskIdentity();
    renderDashboard();
    renderAutowalk({ liveOnly: normalizedRenderScope === "live" });
    if (normalizedRenderScope === "full" || activeModalName === "targeting") {
      renderTargeting();
    }
    if (normalizedRenderScope === "full" || isModuleModalName(activeModalName)) {
      renderModules();
    }
    if (normalizedRenderScope === "full" || activeModalName === "presets") {
      renderHuntPresets();
    }
    if (normalizedRenderScope === "full" || activeModalName === "accounts") {
      renderAccountRegistry();
    }
    renderLogs();
    if (normalizedRenderScope === "full") {
      renderSummarySheets();
      renderCompactPanel();
    }
    renderDeskStatus();
    syncActionCardTitles();
    syncWindowPinControls();
    syncControlAvailability();
    syncPersistentBusyState();
    syncButtonFeedbackState();
    syncMainWindowTooltips();
    sessionContextResetPending = false;
  } finally {
    recordRendererRuntimeTiming("render", getMonotonicNowMs() - renderStartedAt, {
      scope: normalizedRenderScope,
      stateReady: Boolean(state),
    });
    renderRuntimeMetrics();
  }
}

async function runAction(action, { buttons, successMessage, errorMessage, tone = "ready", feedbackDurationMs = null } = {}) {
  const controlTargets = normalizeControlTargets(buttons);
  setBusy(controlTargets, true);
  let feedback = null;

  try {
    const nextState = await action();
    applyState(nextState);
    if (successMessage) {
      flashStatus(typeof successMessage === "function" ? successMessage(nextState) : successMessage, tone);
      feedback = "success";
    }
    return nextState;
  } catch (error) {
    console.error(error);
    flashStatus(errorMessage ? `${errorMessage}: ${error.message}` : error.message || "Action failed", "error", 4200);
    feedback = "error";
    return null;
  } finally {
    setBusy(controlTargets, false);
    scheduleRender();
    if (feedback) {
      const explicitFeedbackMs = Math.trunc(Number(feedbackDurationMs));
      const feedbackMs = Number.isFinite(explicitFeedbackMs) && explicitFeedbackMs > 0
        ? explicitFeedbackMs
        : (feedback === "success" ? ACTION_FEEDBACK_MS : ERROR_FEEDBACK_MS);
      showButtonFeedback(
        controlTargets,
        feedback,
        feedbackMs,
      );
    }
  }
}

function updateOptions(partial, options = {}) {
  return runAction(() => window.bbApi.updateOptions(partial), options);
}

async function startTrainerRosterLaunch(reference, button = null) {
  const resolvedReference = String(reference || "").trim();
  if (!resolvedReference) {
    return null;
  }
  if (typeof window.bbApi.startTrainerRoster !== "function") {
    flashStatus("Trainer roster launch is unavailable in this build.", "error", 4200);
    return null;
  }

  return runAction(() => window.bbApi.startTrainerRoster(resolvedReference), {
    buttons: button,
    successMessage: "Trainer roster launched",
    errorMessage: "Unable to launch trainer roster",
    tone: "live",
  });
}

function getTrainerDuoFormValue(id = "") {
  const input = document.getElementById(id);
  return input instanceof HTMLInputElement ? input.value.trim() : "";
}

async function saveTrainerDuoFromForm(button = null) {
  const leftName = getTrainerDuoFormValue("trainer-duo-left");
  const rightName = getTrainerDuoFormValue("trainer-duo-right");

  if (!leftName || !rightName) {
    flashStatus("Pick two trainer characters before creating a duo.", "warn", 3200);
    return null;
  }

  if (normalizeTrainerDuoKey(leftName) === normalizeTrainerDuoKey(rightName)) {
    flashStatus("A trainer duo needs two different characters.", "warn", 3200);
    return null;
  }

  if (typeof window.bbApi.saveTrainerDuo !== "function") {
    flashStatus("Trainer duo presets are unavailable in this build.", "error", 4200);
    return null;
  }

  return runAction(() => window.bbApi.saveTrainerDuo({ leftName, rightName }), {
    buttons: button,
    successMessage: `Saved duo ${leftName} + ${rightName}`,
    errorMessage: "Unable to save trainer duo",
    tone: "ready",
  });
}

async function deleteTrainerDuoPresetFromButton(button = null) {
  const leftName = String(button?.dataset?.trainerDuoDisbandLeft || "").trim();
  const rightName = String(button?.dataset?.trainerDuoDisbandRight || "").trim();
  if (!leftName || !rightName) {
    flashStatus("Trainer duo selection is incomplete.", "warn", 3200);
    return null;
  }

  if (!window.confirm(`Disband trainer duo ${leftName} + ${rightName}?`)) {
    return null;
  }

  if (typeof window.bbApi.deleteTrainerDuo !== "function") {
    flashStatus("Trainer duo presets are unavailable in this build.", "error", 4200);
    return null;
  }

  return runAction(() => window.bbApi.deleteTrainerDuo({
    leftName,
    rightName,
    leftProfileKey: button?.dataset?.trainerDuoDisbandLeftProfile || "",
    rightProfileKey: button?.dataset?.trainerDuoDisbandRightProfile || "",
  }), {
    buttons: button,
    successMessage: `Disbanded duo ${leftName} + ${rightName}`,
    errorMessage: "Unable to disband trainer duo",
    tone: "warn",
  });
}

async function testAntiIdlePulse(button) {
  if (!isStateReady() || !isDeskBound()) {
    flashStatus("No live character tab selected.", "warn", 3200);
    return null;
  }
  if (typeof window.bbApi.testAntiIdle !== "function") {
    flashStatus("Anti-idle test is unavailable.", "error", 4200);
    return null;
  }

  const draft = syncModulesDraftFromDom();
  return runAction(() => window.bbApi.testAntiIdle({
    antiIdleEnabled: Boolean(draft.antiIdleEnabled),
    antiIdleIntervalMs: Number(draft.antiIdleIntervalMs) || 0,
  }), {
    buttons: button,
    successMessage: "Anti-idle pulse sent",
    errorMessage: "Anti-idle test failed",
  });
}

async function syncOverlayFocus() {
  if (!state || !isDeskBound()) return null;

  const waypoints = state.options?.waypoints || [];
  const nextIndex = waypoints.length
    ? Math.max(0, Math.min(selectedWaypointIndex, waypoints.length - 1))
    : null;

  try {
    const nextState = await window.bbApi.setOverlayFocus(nextIndex);
    applyState(nextState);
    return nextState;
  } catch (error) {
    console.error(error);
    flashStatus(`Overlay focus sync failed: ${error.message}`, "error", 3200);
    return null;
  } finally {
    scheduleRender();
  }
}

async function refreshState() {
  const nextState = await runAction(() => window.bbApi.getState(), {
    buttons: refreshButton,
    errorMessage: "Unable to load desk state",
  });

  if (nextState && isDeskBound()) {
    await syncOverlayFocus();
  }
}

async function selectSession(sessionId, {
  buttons = refreshButton,
  successMessage = null,
  errorMessage = "Unable to switch character tab",
} = {}) {
  const nextState = await runAction(() => window.bbApi.selectSession(sessionId), {
    buttons,
    successMessage,
    errorMessage,
  });

  if (nextState && isDeskBound()) {
    await syncOverlayFocus();
  }

  return nextState;
}

function targetingPayload() {
  const monsterNames = updateTargetQueueDraftFromDom();
  const combatDraft = captureTargetingCombatDraftFromDom();
  return {
    monster: monsterNames.join("\n"),
    targetProfiles: readTargetProfilesFromDom(),
    distanceKeeperEnabled: combatDraft.distanceKeeperEnabled,
    distanceKeeperRules: cloneValue(combatDraft.distanceKeeperRules),
    port: getNumberFieldValue("port", { fallback: state?.options?.port ?? null, minimum: 1 }),
    intervalMs: getNumberFieldValue("intervalMs", { fallback: state?.options?.intervalMs ?? null, minimum: 1 }),
    retargetMs: getNumberFieldValue("retargetMs", { fallback: state?.options?.retargetMs ?? null, minimum: 1 }),
    rangeX: getNumberFieldValue("rangeX", { fallback: state?.options?.rangeX ?? null, minimum: 0 }),
    rangeY: getNumberFieldValue("rangeY", { fallback: state?.options?.rangeY ?? null, minimum: 0 }),
    floorTolerance: getNumberFieldValue("floorTolerance", { fallback: state?.options?.floorTolerance ?? null, minimum: 0 }),
    pageUrlPrefix: getTrimmedFieldValue("pageUrlPrefix"),
    sharedSpawnMode: getAutowalkSharedSpawnMode(),
    chaseMode: getChaseModeValue(),
    once: document.getElementById("once").checked,
    dryRun: document.getElementById("dryRun").checked,
  };
}

function markTargetingDirty() {
  targetingDirty = true;
}

async function updateCreatureLedger(nextLedger, {
  buttons,
  successMessage = "Creature registry updated",
  errorMessage = "Unable to update creature registry",
} = {}) {
  return updateOptions({
    creatureLedger: normalizeCreatureLedgerDraft(nextLedger),
  }, {
    buttons,
    successMessage,
    errorMessage,
  });
}

async function updateMonsterArchive(nextArchive, {
  buttons,
  successMessage = "Monster archive updated",
  errorMessage = "Unable to update monster archive",
} = {}) {
  return updateOptions({
    monsterArchive: sortMonsterNames(sanitizeTargetMonsterNames(nextArchive)),
  }, {
    buttons,
    successMessage,
    errorMessage,
  });
}

function autowalkPayload() {
  const avoidFieldDraft = getAvoidFieldDraft();
  return {
    cavebotName: getTrimmedFieldValue("cavebotName"),
    autowalkEnabled: getCheckboxValue("autowalkEnabled", state?.options?.autowalkEnabled),
    autowalkLoop: getCheckboxValue("autowalkLoop", state?.options?.autowalkLoop),
    routeStrictClear: getCheckboxValue("routeStrictClear", state?.options?.routeStrictClear),
    routeFollowExactWaypoints: getCheckboxValue("routeFollowExactWaypoints", state?.options?.routeFollowExactWaypoints),
    routeRecording: getCheckboxValue("routeRecording", state?.options?.routeRecording),
    showWaypointOverlay: getCheckboxValue("showWaypointOverlay", state?.options?.showWaypointOverlay),
    avoidElementalFields: avoidFieldDraft.avoidElementalFields,
    avoidFieldCategories: cloneValue(avoidFieldDraft.avoidFieldCategories),
    vocation: getTrimmedFieldValue("vocation"),
    sustainEnabled: getCheckboxValue("sustainEnabled", state?.options?.sustainEnabled),
    sustainCooldownMs: getNumberFieldValue("sustainCooldownMs", { fallback: state?.options?.sustainCooldownMs ?? null, minimum: 0 }),
    preferHotbarConsumables: getCheckboxValue("preferHotbarConsumables", state?.options?.preferHotbarConsumables),
    routeRecordStep: getNumberFieldValue("routeRecordStep", { fallback: state?.options?.routeRecordStep ?? null, minimum: 1 }),
    waypointRadius: getNumberFieldValue("waypointRadius", { fallback: state?.options?.waypointRadius ?? null, minimum: 0 }),
    walkRepathMs: getNumberFieldValue("walkRepathMs", { fallback: state?.options?.walkRepathMs ?? null, minimum: 1 }),
  };
}

function modulesPayload() {
  const draft = syncModulesDraftFromDom();
  const trainerPartnerName = getResolvedTrainerPartnerName(draft);
  const partyFollowMembers = normalizeTextListSummary(draft.partyFollowMembers);
  const trainerManaTrainerRules = (() => {
    const sourceRules = Array.isArray(draft.trainerManaTrainerRules) ? draft.trainerManaTrainerRules : [];
    const sourceRule = sourceRules.find((rule) => String(rule?.words || "").trim()) || null;
    const words = String(draft.trainerManaTrainerWords || "").trim();
    const hotkey = String(draft.trainerManaTrainerHotkey || sourceRule?.hotkey || "").trim();
    const minManaPercent = Number(draft.trainerManaTrainerManaPercent) || 0;
    if (!words) {
      return [];
    }

    return [
      {
        enabled: true,
        label: String(sourceRule?.label || "").trim(),
        words,
        hotkey,
        minHealthPercent: Number(draft.trainerManaTrainerMinHealthPercent) || 0,
        minManaPercent,
        maxManaPercent: Math.max(minManaPercent, Math.round(Number(sourceRule?.maxManaPercent) || 100)),
        cooldownMs: Math.max(0, Math.trunc(Number(sourceRule?.cooldownMs) || 1400)),
        requireNoTargets: sourceRule ? sourceRule.requireNoTargets === true : false,
        requireStationary: sourceRule ? sourceRule.requireStationary === true : false,
      },
    ];
  })();

  return {
    deathHealEnabled: draft.deathHealEnabled,
    deathHealVocation: draft.deathHealVocation,
    deathHealWords: draft.deathHealWords,
    deathHealHotkey: draft.deathHealHotkey,
    deathHealHealthPercent: draft.deathHealHealthPercent,
    deathHealCooldownMs: draft.deathHealCooldownMs,
    healerEnabled: draft.healerEnabled,
    healerRules: cloneValue(draft.healerRules),
    healerEmergencyHealthPercent: draft.healerEmergencyHealthPercent,
    healerRuneName: draft.healerRuneName,
    healerRuneHotkey: draft.healerRuneHotkey,
    healerRuneHealthPercent: draft.healerRuneHealthPercent,
    potionHealerEnabled: draft.potionHealerEnabled,
    potionHealerRules: cloneValue(draft.potionHealerRules),
    conditionHealerEnabled: draft.conditionHealerEnabled,
    conditionHealerRules: cloneValue(draft.conditionHealerRules),
    manaTrainerEnabled: draft.manaTrainerEnabled,
    manaTrainerRules: cloneValue(draft.manaTrainerRules),
    trainerManaTrainerEnabled: draft.trainerManaTrainerEnabled,
    trainerManaTrainerWords: draft.trainerManaTrainerWords,
    trainerManaTrainerHotkey: draft.trainerManaTrainerHotkey,
    trainerManaTrainerManaPercent: draft.trainerManaTrainerManaPercent,
    trainerManaTrainerMinHealthPercent: draft.trainerManaTrainerMinHealthPercent,
    trainerManaTrainerRules,
    runeMakerEnabled: draft.runeMakerEnabled,
    runeMakerRules: cloneValue(draft.runeMakerRules),
    spellCasterEnabled: draft.spellCasterEnabled,
    spellCasterRules: cloneValue(draft.spellCasterRules),
    distanceKeeperEnabled: draft.distanceKeeperEnabled,
    distanceKeeperRules: cloneValue(draft.distanceKeeperRules),
    autoLightEnabled: draft.autoLightEnabled,
    autoLightRules: cloneValue(draft.autoLightRules),
    autoConvertEnabled: draft.autoConvertEnabled,
    autoConvertRules: cloneValue(draft.autoConvertRules),
    antiIdleEnabled: draft.antiIdleEnabled,
    antiIdleIntervalMs: draft.antiIdleIntervalMs,
    alarmsEnabled: draft.alarmsEnabled,
    alarmsPlayerEnabled: draft.alarmsPlayerEnabled,
    alarmsPlayerRadiusSqm: draft.alarmsPlayerRadiusSqm,
    alarmsPlayerFloorRange: draft.alarmsPlayerFloorRange,
    alarmsStaffEnabled: draft.alarmsStaffEnabled,
    alarmsStaffRadiusSqm: draft.alarmsStaffRadiusSqm,
    alarmsStaffFloorRange: draft.alarmsStaffFloorRange,
    alarmsBlacklistEnabled: draft.alarmsBlacklistEnabled,
    alarmsBlacklistNames: normalizeTextListSummary(draft.alarmsBlacklistNames).join("\n"),
    alarmsBlacklistRadiusSqm: draft.alarmsBlacklistRadiusSqm,
    alarmsBlacklistFloorRange: draft.alarmsBlacklistFloorRange,
    reconnectEnabled: draft.reconnectEnabled,
    reconnectRetryDelayMs: draft.reconnectRetryDelayMs,
    reconnectMaxAttempts: draft.reconnectMaxAttempts,
    trainerEnabled: draft.trainerEnabled,
    trainerReconnectEnabled: draft.trainerReconnectEnabled,
    trainerPartnerName,
    trainerPartnerDistance: draft.trainerPartnerDistance,
    trainerAutoPartyEnabled: draft.trainerAutoPartyEnabled,
    trainerEscapeHealthPercent: draft.trainerEscapeHealthPercent,
    trainerEscapeDistance: draft.trainerEscapeDistance,
    trainerEscapeCooldownMs: draft.trainerEscapeCooldownMs,
    autoEatEnabled: draft.autoEatEnabled,
    autoEatFoodName: normalizeTextListSummary(draft.autoEatFoodName),
    autoEatForbiddenFoodNames: normalizeTextListSummary(draft.autoEatForbiddenFoodNames),
    autoEatCooldownMs: draft.autoEatCooldownMs,
    autoEatRequireNoTargets: draft.autoEatRequireNoTargets,
    autoEatRequireStationary: draft.autoEatRequireStationary,
    ammoEnabled: draft.ammoEnabled,
    ammoPreferredNames: normalizeTextListSummary(draft.ammoPreferredNames),
    ammoMinimumCount: draft.ammoMinimumCount,
    ammoWarningCount: draft.ammoWarningCount,
    ammoReloadAtOrBelow: draft.ammoReloadAtOrBelow,
    ammoReloadCooldownMs: draft.ammoReloadCooldownMs,
    ammoReloadEnabled: draft.ammoReloadEnabled,
    ammoRestockEnabled: draft.ammoRestockEnabled,
    ammoRequireNoTargets: draft.ammoRequireNoTargets,
    ammoRequireStationary: draft.ammoRequireStationary,
    ringAutoReplaceEnabled: draft.ringAutoReplaceEnabled,
    ringAutoReplaceItemName: draft.ringAutoReplaceItemName,
    ringAutoReplaceCooldownMs: draft.ringAutoReplaceCooldownMs,
    ringAutoReplaceRequireNoTargets: draft.ringAutoReplaceRequireNoTargets,
    ringAutoReplaceRequireStationary: draft.ringAutoReplaceRequireStationary,
    amuletAutoReplaceEnabled: draft.amuletAutoReplaceEnabled,
    amuletAutoReplaceItemName: draft.amuletAutoReplaceItemName,
    amuletAutoReplaceCooldownMs: draft.amuletAutoReplaceCooldownMs,
    amuletAutoReplaceRequireNoTargets: draft.amuletAutoReplaceRequireNoTargets,
    amuletAutoReplaceRequireStationary: draft.amuletAutoReplaceRequireStationary,
    lootingEnabled: draft.lootingEnabled,
    lootWhitelist: cloneValue(draft.lootWhitelist),
    lootBlacklist: cloneValue(draft.lootBlacklist),
    lootPreferredContainers: cloneValue(draft.lootPreferredContainers),
    bankingEnabled: draft.bankingEnabled,
    bankingRules: cloneValue(draft.bankingRules),
    partyFollowEnabled: draft.partyFollowEnabled,
    partyFollowMembers: partyFollowMembers.join("\n"),
    partyFollowManualPlayers: normalizeTextListSummary(draft.partyFollowManualPlayers).join("\n"),
    partyFollowMemberRoles: cloneValue(
      pruneFollowTrainMemberRoles(
        draft.partyFollowMemberRoles,
        partyFollowMembers,
        draft.partyFollowCombatMode,
      ),
    ),
    partyFollowMemberChaseModes: cloneValue(
      pruneFollowTrainMemberChaseModes(
        draft.partyFollowMemberChaseModes,
        partyFollowMembers,
      ),
    ),
    partyFollowDistance: draft.partyFollowDistance,
    partyFollowCombatMode: draft.partyFollowCombatMode,
  };
}

function followTrainPayload() {
  const draft = syncModulesDraftFromDom();
  ensureFollowTrainAutoChainDraft(draft);
  const partyFollowMembers = getAutomaticFollowTrainMembers(draft);

  return {
    partyFollowEnabled: draft.partyFollowEnabled,
    partyFollowMembers: partyFollowMembers.join("\n"),
    partyFollowManualPlayers: normalizeTextListSummary(draft.partyFollowManualPlayers).join("\n"),
    partyFollowMemberRoles: cloneValue(
      pruneFollowTrainMemberRoles(
        draft.partyFollowMemberRoles,
        partyFollowMembers,
        draft.partyFollowCombatMode,
      ),
    ),
    partyFollowMemberChaseModes: cloneValue(
      pruneFollowTrainMemberChaseModes(
        draft.partyFollowMemberChaseModes,
        partyFollowMembers,
      ),
    ),
    partyFollowDistance: draft.partyFollowDistance,
    partyFollowCombatMode: draft.partyFollowCombatMode,
  };
}

function getModulePrimaryRuleField(moduleKey) {
  switch (moduleKey) {
    case "potionHealer":
      return "itemName";
    case "conditionHealer":
      return "condition";
    default:
      return "words";
  }
}

function addModuleRule(moduleKey) {
  const nextRule = createModuleRule(moduleKey);
  if (!nextRule) return;

  const rules = getModuleRuleList(moduleKey);
  rules.push(nextRule);
  renderModules({ force: true });
  focusModuleRuleField(moduleKey, rules.length - 1, getModulePrimaryRuleField(moduleKey));
}

function focusModuleRuleField(moduleKey, index, fieldKey = "words") {
  scheduleNextPaint(() => {
    const selector = `[data-module-key="${escapeAttributeValue(moduleKey)}"][data-rule-index="${index}"][data-rule-field="${escapeAttributeValue(fieldKey)}"]`;
    const input = document.querySelector(selector);
    if (input instanceof HTMLElement && !input.hasAttribute("disabled")) {
      input.focus();
      if (typeof input.select === "function") {
        input.select();
      }
    }
  });
}

function buildRuneMakerTemplateRule(templateKey) {
  const rules = getModuleRuleList("runeMaker");
  const schema = getModuleSchema("runeMaker");
  const fallbackRule = cloneValue(schema?.emptyRule || {});
  const seedRule = rules.length
    ? cloneValue({ ...rules[rules.length - 1], label: "" })
    : fallbackRule;

  switch (templateKey) {
    case "clone":
      return seedRule;
    case "moving":
      return {
        ...seedRule,
        requireNoTargets: true,
        requireStationary: false,
      };
    case "combat":
      return {
        ...seedRule,
        requireNoTargets: false,
        requireStationary: false,
      };
    case "safe":
    default:
      return {
        ...seedRule,
        requireNoTargets: true,
        requireStationary: true,
      };
  }
}

function addRuneMakerTemplate(templateKey) {
  const rules = getModuleRuleList("runeMaker");
  rules.push(buildRuneMakerTemplateRule(templateKey));
  renderModules({ force: true });
  focusModuleRuleField("runeMaker", rules.length - 1);
}

function moveModuleRule(moduleKey, index, delta) {
  const rules = getModuleRuleList(moduleKey);
  const currentIndex = Math.trunc(Number(index));
  const nextIndex = currentIndex + Math.trunc(Number(delta));

  if (!Number.isInteger(currentIndex) || !Number.isInteger(nextIndex)) return;
  if (currentIndex < 0 || currentIndex >= rules.length) return;
  if (nextIndex < 0 || nextIndex >= rules.length) return;

  const [rule] = rules.splice(currentIndex, 1);
  rules.splice(nextIndex, 0, rule);
  renderModules({ force: true });
}

function deleteModuleRule(moduleKey, index) {
  const rules = getModuleRuleList(moduleKey);
  const currentIndex = Math.trunc(Number(index));
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= rules.length) return;

  const rule = rules[currentIndex] || {};
  const label = formatRuleDisplayName(moduleKey, rule, currentIndex);
  if (!window.confirm(`Delete ${label}?`)) {
    return;
  }

  rules.splice(currentIndex, 1);
  renderModules({ force: true });
}

function setTrainerPartnerName(nextName = "") {
  setModuleOptionInputValue("trainer", "trainerPartnerName", String(nextName || "").trim());
  renderModules({ force: true });
}

function setFollowTrainMembers(nextMembers = []) {
  const draft = ensureModulesDraft();
  draft.partyFollowMembers = normalizeTextListSummary(nextMembers);
  draft.partyFollowMemberRoles = pruneFollowTrainMemberRoles(
    draft.partyFollowMemberRoles,
    draft.partyFollowMembers,
    draft.partyFollowCombatMode,
  );
  draft.partyFollowMemberChaseModes = pruneFollowTrainMemberChaseModes(
    draft.partyFollowMemberChaseModes,
    draft.partyFollowMembers,
  );
  renderModules({ force: true });
}

function setFollowTrainMemberRole(name = "", role = "") {
  const memberName = String(name || "").trim();
  if (!memberName) return;

  const draft = ensureModulesDraft();
  const nextRoles = {
    ...(draft.partyFollowMemberRoles || {}),
    [memberName]: normalizeFollowTrainRoleValue(role, draft.partyFollowCombatMode),
  };
  draft.partyFollowMemberRoles = pruneFollowTrainMemberRoles(
    nextRoles,
    draft.partyFollowMembers,
    draft.partyFollowCombatMode,
  );
  renderModules({ force: true });
}

function setFollowTrainMemberChaseMode(name = "", chaseMode = "") {
  const memberName = String(name || "").trim();
  if (!memberName) return;

  const draft = ensureModulesDraft();
  const normalizedMode = normalizeFollowTrainChaseModeValue(chaseMode, "auto");
  const nextChaseModes = {
    ...(draft.partyFollowMemberChaseModes || {}),
  };

  if (normalizedMode === "auto") {
    delete nextChaseModes[memberName];
  } else {
    nextChaseModes[memberName] = normalizedMode;
  }

  draft.partyFollowMemberChaseModes = pruneFollowTrainMemberChaseModes(
    nextChaseModes,
    draft.partyFollowMembers,
  );
  renderModules({ force: true });
}

function addFollowTrainMember(name = "") {
  const nextName = String(name || "").trim();
  if (!nextName) return;

  const draft = ensureModulesDraft();
  const currentMembers = Array.isArray(draft.partyFollowMembers) ? draft.partyFollowMembers : [];
  setFollowTrainMembers([...currentMembers, nextName]);
}

function useLiveFollowTrainMembers() {
  const liveNames = getFollowTrainLiveCharacterNames();
  if (liveNames.length < 2) return;
  setFollowTrainMembers(liveNames);
}

function addSeenFollowTrainMembers() {
  const draft = ensureModulesDraft();
  const { playerEntries } = buildFollowTrainSourceEntries(draft);
  if (!playerEntries.length) return;

  setFollowTrainMembers([
    ...normalizeTextListSummary(draft.partyFollowMembers),
    ...playerEntries.map((entry) => entry.name),
  ]);
}

function buildPartyFollowTogglePayload(enabled) {
  const payload = { partyFollowEnabled: enabled };
  if (enabled) {
    const partyFollowMembers = getAutomaticFollowTrainMembers(state?.options || {});
    if (partyFollowMembers.length >= 2) {
      payload.partyFollowMembers = partyFollowMembers.join("\n");
    }
  }
  return payload;
}

function moveFollowTrainMember(index, delta) {
  const draft = ensureModulesDraft();
  const members = normalizeTextListSummary(draft.partyFollowMembers);
  const currentIndex = Math.trunc(Number(index));
  const nextIndex = currentIndex + Math.trunc(Number(delta));

  if (!Number.isInteger(currentIndex) || !Number.isInteger(nextIndex)) return;
  if (currentIndex < 0 || currentIndex >= members.length) return;
  if (nextIndex < 0 || nextIndex >= members.length) return;

  const [member] = members.splice(currentIndex, 1);
  members.splice(nextIndex, 0, member);
  setFollowTrainMembers(members);
}

function removeFollowTrainMember(index) {
  const draft = ensureModulesDraft();
  const members = normalizeTextListSummary(draft.partyFollowMembers);
  const currentIndex = Math.trunc(Number(index));
  if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= members.length) return;

  members.splice(currentIndex, 1);
  setFollowTrainMembers(members);
}

async function selectWaypoint(index, { openEditor = false } = {}) {
  if (!hasWaypoints()) return;
  clearRouteLiveResumeTarget();
  selectedWaypointIndex = Math.max(0, index);
  routeEditorMode = "waypoint";
  clearPendingDangerAction("remove-waypoint");
  resetAutowalkDraft({ route: false, waypoint: true });
  if (openEditor) {
    focusRouteBuilder("#route-item-label");
  }
  renderAutowalk();
  await syncOverlayFocus();
}

async function resumeRouteFromWaypoint(index, { buttons = null } = {}) {
  if (!hasWaypoints()) return null;

  selectedWaypointIndex = Math.max(0, index);
  markRouteLiveResumeTarget(selectedWaypointIndex);
  routeEditorMode = "waypoint";
  clearPendingDangerAction("remove-waypoint");
  resetAutowalkDraft({ route: false, waypoint: true });
  renderAutowalk();

  const nextState = await runAction(() => window.bbApi.resetRoute(selectedWaypointIndex), {
    buttons,
    successMessage: `Route resumed from waypoint ${selectedWaypointIndex + 1}`,
    errorMessage: "Unable to resume route",
    tone: "live",
  });

  if (nextState) {
    await syncOverlayFocus();
  } else {
    clearRouteLiveResumeTarget();
    renderAutowalk();
  }

  return nextState;
}

async function addWaypointOfType(type, buttons = []) {
  clearRouteLiveResumeTarget();
  clearMarkedWaypoints();
  const waypointType = String(type || "walk").trim().toLowerCase() || "walk";
  const typeLabel = getWaypointTypeLabel(waypointType);
  const nextState = await runAction(() => window.bbApi.addCurrentWaypoint(waypointType), {
    buttons: [actionButtons.addCurrentWaypoint, ...resolveButtons(buttons)],
    successMessage: `${typeLabel} waypoint added from live position`,
    errorMessage: `Unable to add ${typeLabel.toLowerCase()} waypoint`,
  });

  if (nextState) {
    clearPendingDangerAction();
    clearRouteUndoState();
    selectedWaypointIndex = Math.max(0, (nextState.options.waypoints?.length || 1) - 1);
    routeEditorMode = "waypoint";
    resetAutowalkDraft({ route: false, waypoint: true });
    closeWaypointAddPanel();
    await syncOverlayFocus();
  }
}

async function insertWaypointBefore(index, { type = "walk", buttons = [] } = {}) {
  clearRouteLiveResumeTarget();
  clearMarkedWaypoints();
  const waypointType = String(type || "walk").trim().toLowerCase() || "walk";
  const typeLabel = getWaypointTypeLabel(waypointType);
  const targetIndex = Math.max(0, Math.min(Number(index) || 0, getWaypoints().length));
  const nextState = await runAction(() => window.bbApi.insertCurrentWaypoint(targetIndex, waypointType), {
    buttons: resolveButtons(buttons),
    successMessage: `${typeLabel} waypoint inserted from your live tile before ${targetIndex + 1}`,
    errorMessage: `Unable to insert ${typeLabel.toLowerCase()} waypoint`,
  });

  if (nextState) {
    clearPendingDangerAction();
    clearRouteUndoState();
    selectedWaypointIndex = Math.max(0, Math.min(targetIndex, (nextState.options.waypoints?.length || 1) - 1));
    routeEditorMode = "waypoint";
    resetAutowalkDraft({ route: false, waypoint: true });
    closeWaypointAddPanel();
    await syncOverlayFocus();
  }

  return nextState;
}

async function removeWaypointAt(index, { buttons = [] } = {}) {
  clearRouteLiveResumeTarget();
  clearMarkedWaypoints();
  const waypoints = getWaypoints();
  const targetIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(0, waypoints.length - 1)));
  const targetLabel = formatWaypointDangerLabel(targetIndex, waypoints);
  const previousWaypoints = cloneValue(waypoints);
  const previousSelectedIndex = selectedWaypointIndex;

  clearPendingDangerAction("remove-waypoint");
  const nextState = await runAction(() => window.bbApi.removeWaypoint(targetIndex), {
    buttons: resolveButtons(buttons),
    successMessage: `Deleted ${targetLabel}`,
    errorMessage: "Unable to remove waypoint",
  });

  if (nextState) {
    routeUndoState = {
      waypoints: previousWaypoints,
      selectedWaypointIndex: previousSelectedIndex,
    };
    const nextLength = nextState.options.waypoints?.length || 0;
    selectedWaypointIndex = nextLength
      ? Math.min(targetIndex, nextLength - 1)
      : 0;
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }

  return nextState;
}

async function removeMarkedWaypoints({ buttons = [] } = {}) {
  const waypoints = getWaypoints();
  const indexes = getMarkedWaypointIndexes(waypoints);
  if (!indexes.length) return null;

  clearRouteLiveResumeTarget();
  const previousWaypoints = cloneValue(waypoints);
  const previousSelectedIndex = selectedWaypointIndex;
  const descendingIndexes = [...indexes].sort((a, b) => b - a);

  clearPendingDangerAction("remove-waypoint");
  const nextState = await runAction(async () => {
    let latestState = null;
    for (const index of descendingIndexes) {
      latestState = await window.bbApi.removeWaypoint(index);
    }
    return latestState;
  }, {
    buttons: resolveButtons(buttons),
    successMessage: `Deleted ${indexes.length} waypoint${indexes.length === 1 ? "" : "s"}`,
    errorMessage: "Unable to remove selected waypoints",
  });

  if (nextState) {
    routeUndoState = {
      waypoints: previousWaypoints,
      selectedWaypointIndex: previousSelectedIndex,
    };
    clearMarkedWaypoints(nextState.options?.waypoints || []);
    const nextLength = nextState.options?.waypoints?.length || 0;
    const firstRemovedIndex = indexes[0] || 0;
    selectedWaypointIndex = nextLength
      ? Math.min(firstRemovedIndex, nextLength - 1)
      : 0;
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }

  return nextState;
}

async function addTileRuleOfPolicy(policy, buttons = []) {
  const normalizedPolicy = normalizeTileRulePolicy(policy);
  const nextState = await runAction(() => window.bbApi.addCurrentTileRule(normalizedPolicy), {
    buttons: resolveButtons(buttons),
    successMessage: `${getTileRulePolicyLabel(normalizedPolicy)} tile rule added from live position`,
    errorMessage: `Unable to add ${normalizedPolicy} tile rule`,
  });

  if (nextState) {
    selectedTileRuleIndex = Math.max(0, (nextState.options.tileRules?.length || 1) - 1);
    routeEditorMode = "tileRule";
    tileRuleEditorDirty = false;
    tileRuleEditorDirtyIndex = selectedTileRuleIndex;
    tileRuleEditorDraft = null;
    renderAutowalk();
  }
}

async function loadRouteSelection(routeName = getSelectedRouteLibraryName(), {
  buttons = actionButtons.loadRoute,
  respectDirty = false,
} = {}) {
  if (!routeName) {
    return null;
  }

  if (respectDirty && routeName !== getCurrentRouteName() && hasUnsavedRouteChanges()) {
    flashStatus("Save or discard the current route edits before switching cavebots.", "warn", 3200);
    return null;
  }

  clearRouteLiveResumeTarget();
  const nextState = await runAction(() => window.bbApi.loadRoute(routeName), {
    buttons,
    successMessage: `Loaded ${routeName}`,
    errorMessage: "Unable to load route",
  });

  if (nextState) {
    clearPendingDangerAction();
    clearRouteUndoState();
    selectedWaypointIndex = 0;
    selectedTileRuleIndex = 0;
    targetingDirty = false;
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    targetProfilesRenderedKey = "";
    resetTargetingCombatDraft();
    resetAutowalkDraft();
    selectedRouteLibraryName = routeName;
    await syncOverlayFocus();
  }

  return nextState;
}

modalOpenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panel = openModal(button.dataset.openModal);
    const focusTarget = button.dataset.focusTarget;
    if (!panel || !focusTarget) return;

    const target = panel.querySelector(focusTarget);
    if (target instanceof HTMLElement && !target.hasAttribute("disabled")) {
      target.focus();
    }
  });
});

routeBuilderFocusButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWaypointAddPanel();
    focusRouteBuilder(button.dataset.focusRouteBuilder || null);
  });
});

routeLibraryOpenButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWaypointAddPanel();
    openRouteLibraryQuickPick();
  });
});

proxyClickButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const selector = button.dataset.proxyClick || "";
    if (!selector) return;

    const target = document.querySelector(selector);
    if (!(target instanceof HTMLButtonElement) || target.disabled) {
      return;
    }

    target.click();
  });
});

function openWaypointSettingsCard() {
  closeWaypointAddPanel();
  focusRouteBuilder("#add-current-waypoint");
}

routeToggleWaypointsCard?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (event.target?.closest?.(".route-toggle-button")) {
    return;
  }

  openWaypointSettingsCard();
});

routeToggleWaypointsCard?.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openWaypointSettingsCard();
});

routeOverviewCard?.addEventListener("click", (event) => {
  if (event.target?.closest?.("button, input, select, textarea, a, #route-toggle-waypoints-card")) {
    return;
  }
  closeWaypointAddPanel();
  openRouteLibraryQuickPick();
});

routeOverviewFields.preview?.addEventListener("click", async (event) => {
  const markButton = event.target.closest("[data-route-preview-mark]");
  if (markButton) {
    event.stopPropagation();
    if (!isStateReady() || !isDeskBound() || !hasWaypoints()) return;
    toggleMarkedWaypoint(Number(markButton.dataset.routePreviewMark));
    clearPendingDangerAction("remove-waypoint");
    renderAutowalk();
    return;
  }

  const insertButton = event.target.closest("[data-route-preview-insert]");
  if (insertButton) {
    event.stopPropagation();
    if (!isStateReady() || !isDeskBound()) return;
    closeWaypointAddPanel();
    await insertWaypointBefore(Number(insertButton.dataset.routePreviewInsert), { buttons: insertButton });
    return;
  }

  const removeButton = event.target.closest("[data-route-preview-remove]");
  if (removeButton) {
    event.stopPropagation();
    if (!isStateReady() || !isDeskBound() || !hasWaypoints()) return;
    closeWaypointAddPanel();
    await removeWaypointAt(Number(removeButton.dataset.routePreviewRemove), { buttons: removeButton });
    return;
  }

  const card = event.target.closest("[data-route-preview-index]");
  if (!card) return;

  event.stopPropagation();
  closeWaypointAddPanel();
  await selectWaypoint(Number(card.dataset.routePreviewIndex), { openEditor: true });
});

routeOverviewFields.preview?.addEventListener("contextmenu", async (event) => {
  if (event.target.closest("[data-route-preview-insert], [data-route-preview-remove], [data-route-preview-mark]")) {
    return;
  }

  const card = event.target.closest("[data-route-preview-index]");
  if (!card) return;

  event.preventDefault();
  event.stopPropagation();
  closeWaypointAddPanel();
  await resumeRouteFromWaypoint(Number(card.dataset.routePreviewIndex), { buttons: card });
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeModal);
});

targetWatchHandle?.addEventListener("mousedown", beginTargetWatchDockDrag);
targetWatchHandle?.addEventListener("dragstart", (event) => {
  event.preventDefault();
});
targetWatchResetButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  endTargetWatchDockDrag();
  resetTargetWatchDockPosition();
});
window.addEventListener("resize", () => {
  syncTargetWatchDockPosition({ clamp: true });
});

document.addEventListener("keydown", (event) => {
  if (!activeModalName) {
    return;
  }

  if (event.key === "Escape") {
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    trapActiveModalFocus(event);
  }
});

document.addEventListener("focusin", (event) => {
  if (!activeModalName) {
    return;
  }

  const activePanel = getOpenModalPanel();
  if (!activePanel || activePanel.contains(event.target)) {
    return;
  }

  const firstFocusable = getFocusableElements(activePanel)[0];
  (firstFocusable || activePanel).focus();
});

document.addEventListener("click", (event) => {
  lastSaveModulesClickButton = event.target.closest("[data-save-modules]");
}, true);

document.addEventListener("click", (event) => {
  if (
    isWaypointAddPanelOpen()
    && !event.target.closest(".waypoint-add-stack")
    && !event.target.closest("#add-current-waypoint")
  ) {
    closeWaypointAddPanel();
  }

  if (!event.target.closest("[data-module-panel]")) return;

  const lootingAddButton = event.target.closest("[data-looting-add-token]");
  if (lootingAddButton) {
    updateLootingFieldToken(
      lootingAddButton.dataset.lootingField || "",
      lootingAddButton.dataset.lootingAddToken || "",
      "add",
    );
    return;
  }

  const lootingRemoveButton = event.target.closest("[data-looting-remove-token]");
  if (lootingRemoveButton) {
    updateLootingFieldToken(
      lootingRemoveButton.dataset.lootingField || "",
      lootingRemoveButton.dataset.lootingRemoveToken || "",
      "remove",
    );
    return;
  }

  const lootingClearButton = event.target.closest("[data-looting-clear-field]");
  if (lootingClearButton) {
    updateLootingFieldToken(lootingClearButton.dataset.lootingClearField || "", "", "clear");
    return;
  }

  const autoEatAddButton = event.target.closest("[data-autoeat-add-token]");
  if (autoEatAddButton) {
    updateAutoEatFieldToken(
      autoEatAddButton.dataset.autoeatField || "",
      autoEatAddButton.dataset.autoeatAddToken || "",
      "add",
    );
    renderModules({ force: true });
    return;
  }

  const autoEatRemoveButton = event.target.closest("[data-autoeat-remove-token]");
  if (autoEatRemoveButton) {
    updateAutoEatFieldToken(
      autoEatRemoveButton.dataset.autoeatField || "",
      autoEatRemoveButton.dataset.autoeatRemoveToken || "",
      "remove",
    );
    renderModules({ force: true });
    return;
  }

  const autoEatClearButton = event.target.closest("[data-autoeat-clear-field]");
  if (autoEatClearButton) {
    updateAutoEatFieldToken(autoEatClearButton.dataset.autoeatClearField || "", "", "clear");
    renderModules({ force: true });
    return;
  }

  const ammoAddButton = event.target.closest("[data-ammo-add-token]");
  if (ammoAddButton) {
    updateAmmoPreferredToken(ammoAddButton.dataset.ammoAddToken || "", "add");
    renderModules({ force: true });
    return;
  }

  const ammoRemoveButton = event.target.closest("[data-ammo-remove-token]");
  if (ammoRemoveButton) {
    updateAmmoPreferredToken(ammoRemoveButton.dataset.ammoRemoveToken || "", "remove");
    renderModules({ force: true });
    return;
  }

  const ammoClearButton = event.target.closest("[data-ammo-clear-preferred]");
  if (ammoClearButton) {
    updateAmmoPreferredToken("", "clear");
    renderModules({ force: true });
    return;
  }

  const alarmAddButton = event.target.closest("[data-alarms-add-blacklist]");
  if (alarmAddButton) {
    updateAlarmBlacklistToken(alarmAddButton.dataset.alarmsAddBlacklist || "", "add");
    return;
  }

  const alarmRemoveButton = event.target.closest("[data-alarms-remove-blacklist]");
  if (alarmRemoveButton) {
    updateAlarmBlacklistToken(alarmRemoveButton.dataset.alarmsRemoveBlacklist || "", "remove");
    return;
  }

  const trainerDuoStartButton = event.target.closest("[data-trainer-duo-start-profile-key]");
  if (trainerDuoStartButton) {
    void startTrainerRosterLaunch(
      trainerDuoStartButton.dataset.trainerDuoStartProfileKey || "",
      trainerDuoStartButton,
    );
    return;
  }

  const trainerDuoCreateButton = event.target.closest("[data-trainer-duo-create]");
  if (trainerDuoCreateButton) {
    void saveTrainerDuoFromForm(trainerDuoCreateButton);
    return;
  }

  const trainerDuoDisbandButton = event.target.closest("[data-trainer-duo-disband-left]");
  if (trainerDuoDisbandButton) {
    void deleteTrainerDuoPresetFromButton(trainerDuoDisbandButton);
    return;
  }

  const trainerLaunchButton = event.target.closest("[data-trainer-launch-profile-key]");
  if (trainerLaunchButton) {
    void startTrainerRosterLaunch(
      trainerLaunchButton.dataset.trainerLaunchProfileKey || "",
      trainerLaunchButton,
    );
    return;
  }

  const trainerPartnerButton = event.target.closest("[data-trainer-partner-name]");
  if (trainerPartnerButton) {
    setTrainerPartnerName(trainerPartnerButton.dataset.trainerPartnerName || "");
    return;
  }

  const trainerServiceButton = event.target.closest("[data-trainer-service-module]");
  if (trainerServiceButton) {
    openModal(trainerServiceButton.dataset.trainerServiceModule || "");
    return;
  }

  const followTrainSourceButton = event.target.closest("[data-follow-train-source-name]");
  if (followTrainSourceButton) {
    addFollowTrainMember(followTrainSourceButton.dataset.followTrainSourceName || "");
    return;
  }

  const followTrainMoveButton = event.target.closest("[data-follow-train-move]");
  if (followTrainMoveButton) {
    moveFollowTrainMember(
      Number(followTrainMoveButton.dataset.followTrainMove),
      Number(followTrainMoveButton.dataset.followTrainDelta),
    );
    return;
  }

  const followTrainRemoveButton = event.target.closest("[data-follow-train-remove]");
  if (followTrainRemoveButton) {
    removeFollowTrainMember(Number(followTrainRemoveButton.dataset.followTrainRemove));
    return;
  }

  const followTrainClearButton = event.target.closest("[data-follow-train-clear]");
  if (followTrainClearButton) {
    setFollowTrainMembers([]);
    return;
  }

  const followTrainUseLiveButton = event.target.closest("[data-follow-train-use-live]");
  if (followTrainUseLiveButton) {
    useLiveFollowTrainMembers();
    return;
  }

  const followTrainAddSeenButton = event.target.closest("[data-follow-train-add-seen]");
  if (followTrainAddSeenButton) {
    addSeenFollowTrainMembers();
    return;
  }

  const antiIdlePresetButton = event.target.closest("[data-anti-idle-preset-ms]");
  if (antiIdlePresetButton) {
    setModuleOptionInputValue("antiIdle", "antiIdleIntervalMs", Number(antiIdlePresetButton.dataset.antiIdlePresetMs) || 60_000, {
      focus: true,
    });
    renderModules({ force: true });
    return;
  }

  const antiIdleTestButton = event.target.closest("[data-test-anti-idle]");
  if (antiIdleTestButton) {
    void testAntiIdlePulse(antiIdleTestButton);
    return;
  }

  const reconnectButton = event.target.closest("[data-trigger-reconnect]");
  if (reconnectButton) {
    void triggerReconnect(reconnectButton);
    return;
  }

  const equipmentReplaceChoiceButton = event.target.closest("[data-equipment-replace-choice-module]");
  if (equipmentReplaceChoiceButton) {
    const moduleKey = equipmentReplaceChoiceButton.dataset.equipmentReplaceChoiceModule || "";
    const config = getEquipmentReplaceConfig(moduleKey);
    if (config) {
      setModuleOptionInputValue(moduleKey, config.itemField, equipmentReplaceChoiceButton.dataset.equipmentReplaceValue || "");
      renderModules({ force: true });
    }
    return;
  }

  const addButton = event.target.closest("[data-add-module-rule]");
  if (addButton) {
    addModuleRule(addButton.dataset.addModuleRule);
    return;
  }

  const runeTemplateButton = event.target.closest("[data-add-rune-template]");
  if (runeTemplateButton) {
    addRuneMakerTemplate(runeTemplateButton.dataset.addRuneTemplate || "safe");
    return;
  }

  const moveButton = event.target.closest("[data-move-module-rule]");
  if (moveButton) {
    moveModuleRule(
      moveButton.dataset.moveModuleRule,
      Number(moveButton.dataset.ruleIndex),
      Number(moveButton.dataset.ruleDelta),
    );
    return;
  }

  const deleteButton = event.target.closest("[data-delete-module-rule]");
  if (deleteButton) {
    deleteModuleRule(deleteButton.dataset.deleteModuleRule, Number(deleteButton.dataset.ruleIndex));
  }
});

document.addEventListener("input", (event) => {
  if (!event.target.closest("[data-module-panel]")) return;

  if (event.target.matches("[data-module-key][data-rule-index][data-rule-field]")
    || event.target.matches("[data-module-key][data-module-option-field]")) {
    const draft = syncModulesDraftFromDom();
    syncModuleStatusDisplays(draft);
  }
});

document.addEventListener("change", (event) => {
  if (!event.target.closest("[data-module-panel]")) return;

  if (event.target.matches("[data-follow-train-role-name]")) {
    setFollowTrainMemberRole(
      event.target.dataset.followTrainRoleName || "",
      event.target.value || "",
    );
    return;
  }

  if (event.target.matches("[data-follow-train-chase-mode-name]")) {
    setFollowTrainMemberChaseMode(
      event.target.dataset.followTrainChaseModeName || "",
      event.target.value || "",
    );
    return;
  }

  if (event.target.matches("[data-module-key][data-rule-index][data-rule-field]")
    || event.target.matches("[data-module-key][data-module-option-field]")) {
    const draft = syncModulesDraftFromDom();
    syncModuleStatusDisplays(draft);
    if (event.target.matches('[data-module-key="partyFollow"][data-module-option-field="partyFollowManualPlayers"]')) {
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="partyFollow"][data-module-option-field="partyFollowCombatMode"]')) {
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="autoEat"][data-module-option-field]')) {
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="ammo"][data-module-option-field]')) {
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="deathHeal"][data-module-option-field="deathHealVocation"]')) {
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="conditionHealer"][data-rule-field="condition"]')) {
      const ruleIndex = Number(event.target.dataset.ruleIndex);
      const rules = getModuleRuleList("conditionHealer");
      if (Number.isInteger(ruleIndex) && ruleIndex >= 0 && rules[ruleIndex]) {
        rules[ruleIndex].condition = normalizeConditionHealerTriggerValue(event.target.value);
        rules[ruleIndex].words = getPreferredConditionHealerActionValue(
          rules[ruleIndex].condition,
          getHealerResolvedVocation(),
          rules[ruleIndex].words,
        );
      }
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="antiIdle"][data-module-option-field="antiIdleIntervalMs"]')) {
      renderModules({ force: true });
    }
    if (event.target.matches('[data-module-key="reconnect"][data-module-option-field]')) {
      renderModules({ force: true });
    }
  }
});

[
  "port",
  "intervalMs",
  "retargetMs",
  "rangeX",
  "rangeY",
  "floorTolerance",
  "pageUrlPrefix",
].forEach((id) => {
  document.getElementById(id).addEventListener("input", markTargetingDirty);
});

document.getElementById("once").addEventListener("change", markTargetingDirty);
document.getElementById("dryRun").addEventListener("change", markTargetingDirty);

document.getElementById("monster").addEventListener("input", () => {
  captureTargetProfilesDraftFromDom();
  markTargetingDirty();
  const nextQueue = updateTargetQueueDraftFromDom();
  syncTargetProfilesDraftToTargetNames(nextQueue);
  renderMonsterArchive();
  renderTargetProfiles();
});

function handleTargetChipToggle(event) {
  const chip = event.target.closest("[data-name]");
  if (!chip) return false;

  const name = chip.dataset.name || "";
  captureTargetProfilesDraftFromDom();
  markTargetingDirty();
  const nextQueue = setTargetQueueDraft(toggleMonsterName(getTargetQueueDraft(), name));
  syncTargetProfilesDraftToTargetNames(nextQueue);
  renderMonsterArchive();
  renderTargetProfiles();
  return true;
}

function clearCreatureRegistryDropTargets() {
  [monsterArchive, playerVisibleList, npcVisibleList].forEach((element) => {
    element?.classList.remove("drag-drop-target");
  });
}

function getCreatureRegistryDragPayload(dataTransfer = null) {
  const payload = dataTransfer?.getData?.("application/x-minibot-creature-registry");
  if (!payload) {
    return creatureRegistryDragState;
  }

  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed : creatureRegistryDragState;
  } catch {
    return creatureRegistryDragState;
  }
}

async function moveCreatureRegistryEntry(name, targetKind = "monster") {
  const nextName = String(name || "").trim();
  if (!nextName || !isStateReady() || !isDeskBound()) {
    return null;
  }

  if (targetKind === "monster" && !isKnownTargetMonsterName(nextName)) {
    flashStatus(`"${nextName}" is not an official monster target. Keep it in Players or NPCs.`, "warn", 2800);
    return null;
  }

  const baselineLedger = getCreatureLedgerArchiveBaseline();
  const currentLedger = getCreatureLedger();
  const nextLedger = setCreatureLedgerEntryCategory(currentLedger, nextName, targetKind);
  const nextOverrides = buildCreatureLedgerOverrides(nextLedger, baselineLedger);
  const currentOverrides = buildCreatureLedgerOverrides(currentLedger, baselineLedger);
  if (getCreatureLedgerRenderKey(currentOverrides) === getCreatureLedgerRenderKey(nextOverrides)) {
    return null;
  }

  const targetLabel = targetKind === "player"
    ? "Players"
    : targetKind === "npc"
      ? "NPCs"
      : "Creature Registry";
  return updateCreatureLedger(nextOverrides, {
    successMessage: `Moved ${nextName} to ${targetLabel}`,
    errorMessage: `Unable to move ${nextName}`,
  });
}

function handleCreatureRegistryDragStart(event) {
  const source = event.target.closest("[data-creature-registry-name][data-creature-registry-kind]");
  if (!source) {
    return;
  }

  const payload = {
    name: source.dataset.creatureRegistryName || "",
    kind: source.dataset.creatureRegistryKind || "",
  };
  if (!payload.name || !payload.kind) {
    return;
  }

  creatureRegistryDragState = payload;
  source.classList.add("dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-minibot-creature-registry", JSON.stringify(payload));
  }
}

function handleCreatureRegistryDragEnd(event) {
  const source = event.target.closest("[data-creature-registry-name][data-creature-registry-kind]");
  source?.classList.remove("dragging");
  creatureRegistryDragState = null;
  clearCreatureRegistryDropTargets();
}

function handleCreatureRegistryDragOver(event) {
  const dropList = event.currentTarget;
  const payload = getCreatureRegistryDragPayload(event.dataTransfer);
  if (!dropList || !payload?.name || !payload?.kind) {
    return;
  }

  const targetKind = dropList.dataset.creatureRegistryDropKind || "";
  if (!targetKind || targetKind === payload.kind || (targetKind === "monster" && !isKnownTargetMonsterName(payload.name))) {
    dropList.classList.remove("drag-drop-target");
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  clearCreatureRegistryDropTargets();
  dropList.classList.add("drag-drop-target");
}

function handleCreatureRegistryDragLeave(event) {
  const dropList = event.currentTarget;
  if (!(dropList instanceof HTMLElement)) {
    return;
  }

  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && dropList.contains(nextTarget)) {
    return;
  }

  dropList.classList.remove("drag-drop-target");
}

async function handleCreatureRegistryDrop(event) {
  const dropList = event.currentTarget;
  const payload = getCreatureRegistryDragPayload(event.dataTransfer);
  clearCreatureRegistryDropTargets();
  if (!dropList || !payload?.name || !payload?.kind) {
    return;
  }

  const targetKind = dropList.dataset.creatureRegistryDropKind || "";
  if (!targetKind || targetKind === payload.kind) {
    return;
  }

  event.preventDefault();
  await moveCreatureRegistryEntry(payload.name, targetKind);
}

monsterTargetList?.addEventListener("click", (event) => {
  handleTargetChipToggle(event);
});

monsterArchive.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-name]");
  if (removeButton) {
    if (!isStateReady() || !isDeskBound()) return;
    const name = removeButton.dataset.removeName || "";
    clearArchiveUndoState();
    clearPendingDangerAction("clear-archive");
    const nextArchive = removeMonsterName(getArchivedMonsterNames(), name);
    await updateMonsterArchive(nextArchive, {
      successMessage: `Removed ${name} from monster archive`,
    });
    return;
  }

  handleTargetChipToggle(event);
});

[monsterArchive, playerVisibleList, npcVisibleList].forEach((element) => {
  element?.addEventListener("dragstart", handleCreatureRegistryDragStart);
  element?.addEventListener("dragend", handleCreatureRegistryDragEnd);
  element?.addEventListener("dragover", handleCreatureRegistryDragOver);
  element?.addEventListener("dragleave", handleCreatureRegistryDragLeave);
  element?.addEventListener("drop", (event) => {
    void handleCreatureRegistryDrop(event);
  });
});

targetProfileList?.addEventListener("input", (event) => {
  if (!event.target.matches("[data-target-profile-field]")) return;
  markTargetingDirty();
  captureTargetProfilesDraftFromDom();
});

targetProfileList?.addEventListener("click", (event) => {
  const moveButton = event.target.closest("[data-move-target-profile]");
  if (!moveButton) return;
  moveTargetProfilePriority(moveButton.dataset.moveTargetProfile, Number(moveButton.dataset.profileDelta));
});

targetProfileList?.addEventListener("change", (event) => {
  if (!event.target.matches("[data-target-profile-field]")) return;
  markTargetingDirty();
  captureTargetProfilesDraftFromDom();

  if (event.target.dataset.targetProfileField === "enabled") {
    renderTargetProfiles();
  }
});

targetingAddDistanceRuleButton?.addEventListener("click", () => {
  const draft = getTargetingCombatDraft();
  draft.distanceKeeperRules.push(normalizeTargetingDistanceRule(createModuleRule("distanceKeeper") || {}));
  targetingCombatRenderedKey = "";
  markTargetingDirty();
  renderTargetingCombatRules({ force: true });
});

targetingDistanceRuleList?.addEventListener("click", (event) => {
  const moveButton = event.target.closest("[data-targeting-distance-move]");
  if (moveButton) {
    const index = Number(moveButton.dataset.targetingDistanceMove);
    const delta = Number(moveButton.dataset.ruleDelta);
    const draft = captureTargetingCombatDraftFromDom();
    const rules = Array.isArray(draft.distanceKeeperRules) ? draft.distanceKeeperRules : [];
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= rules.length) {
      return;
    }
    [rules[index], rules[nextIndex]] = [rules[nextIndex], rules[index]];
    targetingCombatRenderedKey = "";
    markTargetingDirty();
    renderTargetingCombatRules({ force: true });
    return;
  }

  const deleteButton = event.target.closest("[data-targeting-distance-delete]");
  if (deleteButton) {
    const index = Number(deleteButton.dataset.targetingDistanceDelete);
    const draft = captureTargetingCombatDraftFromDom();
    const rules = Array.isArray(draft.distanceKeeperRules) ? draft.distanceKeeperRules : [];
    if (index < 0 || index >= rules.length) {
      return;
    }
    rules.splice(index, 1);
    targetingCombatRenderedKey = "";
    markTargetingDirty();
    renderTargetingCombatRules({ force: true });
  }
});

targetingDistanceRuleList?.addEventListener("input", (event) => {
  if (!event.target.matches('[data-module-key="distanceKeeper"][data-rule-index][data-rule-field]')) return;
  markTargetingDirty();
  syncTargetingCombatSummaryLine(captureTargetingCombatDraftFromDom());
});

targetingDistanceRuleList?.addEventListener("change", (event) => {
  if (!event.target.matches('[data-module-key="distanceKeeper"][data-rule-index][data-rule-field]')) return;
  markTargetingDirty();
  syncTargetingCombatSummaryLine(captureTargetingCombatDraftFromDom());
  if (event.target.dataset.ruleField === "enabled") {
    targetingCombatRenderedKey = "";
    renderTargetingCombatRules({ force: true });
  }
});

targetingDistanceEnabledToggle?.addEventListener("change", () => {
  markTargetingDirty();
  syncTargetingCombatSummaryLine(captureTargetingCombatDraftFromDom());
});

creatureRegistrySearch?.addEventListener("input", () => {
  monsterArchiveRenderedKey = "";
  targetProfilesRenderedKey = "";
  renderMonsterArchive();
  renderTargetProfiles({ force: true });
});

huntPresetSearch?.addEventListener("input", () => {
  renderHuntPresets();
});

huntPresetList?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-hunt-preset-id]");
  if (!row) {
    return;
  }

  selectedHuntPresetId = row.dataset.huntPresetId || "";
  renderHuntPresets();
});

huntPresetDetail?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-apply-hunt-preset]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const preset = getSelectedHuntPreset(getFilteredHuntPresets());
  const includeProfile = button.dataset.applyHuntPreset === "queue-profile";
  const patch = buildHuntPresetPatch(preset, { includeProfile });
  if (!preset || !patch || !isStateReady() || !isDeskBound()) {
    return;
  }

  const nextState = await runAction(() => window.bbApi.updateOptions(patch), {
    buttons: button,
    successMessage: includeProfile
      ? `Loaded ${preset.monsterName} with official target profile`
      : `Queued ${preset.monsterName}`,
    errorMessage: "Unable to apply hunt preset",
  });

  if (nextState) {
    await waitForFeedbackCloseDelay();
    closeModalIfActive("presets", { preserveDangerAction: true });
  }
});

actionButtons.useVisibleCreatures.addEventListener("click", () => {
  clearPendingDangerAction("clear-archive");
  const visibleNames = getVisibleMonsterNames();
  captureTargetProfilesDraftFromDom();
  markTargetingDirty();
  setTargetQueueDraft(visibleNames);
  syncTargetProfilesDraftToTargetNames(visibleNames);
  renderMonsterArchive();
  renderTargetProfiles();
  flashStatus(visibleNames.length ? "Loaded nearby monsters into target queue" : "No nearby monsters to load", visibleNames.length ? "ready" : "warn", 2200);
});

actionButtons.useArchiveCreatures.addEventListener("click", () => {
  clearPendingDangerAction("clear-archive");
  const archivedNames = getArchivedMonsterNames();
  captureTargetProfilesDraftFromDom();
  markTargetingDirty();
  setTargetQueueDraft(archivedNames);
  syncTargetProfilesDraftToTargetNames(archivedNames);
  renderMonsterArchive();
  renderTargetProfiles();
  flashStatus(archivedNames.length ? "Loaded seen monsters into target queue" : "No seen monsters to load", archivedNames.length ? "ready" : "warn", 2200);
});

actionButtons.archiveTargetCreatures.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;

  clearArchiveUndoState();
  clearPendingDangerAction("clear-archive");
  const targetNames = getMonsterInputNames();
  const nextArchive = mergeMonsterNames(getArchivedMonsterNames(), targetNames);
  await updateMonsterArchive(nextArchive, {
    buttons: actionButtons.archiveTargetCreatures,
    successMessage: `Saved ${targetNames.length} target monster${targetNames.length === 1 ? "" : "s"} to seen history`,
  });
});

actionButtons.clearArchiveCreatures.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  const archivedNames = getArchivedMonsterNames();
  if (!archivedNames.length) return;

  if (!isDangerActionArmed("clear-archive")) {
    clearPendingDangerAction();
    armDangerAction("clear-archive");
    renderTargetArchiveDanger();
    flashStatus(`Confirm clear for ${archivedNames.length} archived monster${archivedNames.length === 1 ? "" : "s"}.`, "warn", 2600);
    return;
  }

  clearPendingDangerAction("clear-archive");
  await updateMonsterArchive([], {
    buttons: actionButtons.clearArchiveCreatures,
    successMessage: "Monster archive cleared",
  });

  archiveUndoState = { archive: archivedNames };
  renderTargetArchiveDanger();
});

undoArchiveButton?.addEventListener("click", async () => {
  if (!archiveUndoState || !isStateReady() || !isDeskBound()) return;

  const snapshot = cloneValue(archiveUndoState.archive);
  const nextState = await updateMonsterArchive(snapshot, {
    buttons: undoArchiveButton,
    successMessage: `Restored ${snapshot.length} archived monster${snapshot.length === 1 ? "" : "s"}`,
    errorMessage: "Unable to restore monster archive",
  });

  if (nextState) {
    clearArchiveUndoState();
    renderTargetArchiveDanger();
  }
});

cancelArchiveDangerButton?.addEventListener("click", () => {
  clearPendingDangerAction("clear-archive");
  renderTargetArchiveDanger();
});

routeLibrarySelect?.addEventListener("change", () => {
  selectedRouteLibraryName = routeLibrarySelect.value || "";
  clearPendingDangerAction();
  renderRouteLibrary();
  renderRouteDangerZone();
  syncControlAvailability();
});

routeLibraryQuickSelect?.addEventListener("change", () => {
  selectedRouteLibraryName = routeLibraryQuickSelect.value || "";
  clearPendingDangerAction();
  renderRouteLibrary();
  renderRouteDangerZone();
  syncControlAvailability();
});

accountSelect?.addEventListener("change", () => {
  selectedAccountId = accountSelect.value || "";
  accountDraftNewEntry = selectedAccountId === "";
  accountDraft = getSelectedAccountEntry() ? cloneValue(getSelectedAccountEntry()) : getBlankAccountDraft();
  accountDraftDirty = false;
  accountDraftRenderedKey = "";
  renderAccountRegistry();
});

[
  accountLabelField,
  accountLoginMethodField,
  accountLoginNameField,
  accountPasswordField,
  accountPreferredCharacterField,
  accountReconnectPolicyField,
  accountSecretStorageField,
  accountCharactersField,
  accountNotesField,
].forEach((field) => {
  field?.addEventListener("input", () => {
    captureAccountDraftFromDom();
    if (field === accountLoginMethodField || field === accountSecretStorageField) {
      syncAccountMethodFieldState(
        accountLoginMethodField?.value || "account-password",
        accountSecretStorageField?.value || "local-file",
      );
    }
  });

  field?.addEventListener("change", () => {
    captureAccountDraftFromDom();
    if (field === accountLoginMethodField || field === accountSecretStorageField) {
      syncAccountMethodFieldState(
        accountLoginMethodField?.value || "account-password",
        accountSecretStorageField?.value || "local-file",
      );
    }
  });
});

AUTOWALK_SETTING_FIELD_IDS.forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;

  const markDirty = () => {
    autowalkDirty = true;
  };

  field.addEventListener("input", markDirty);
  field.addEventListener("change", markDirty);
});

[
  "monster",
  "autowalk-sharedSpawnMode",
  "chaseMode",
  "targeting-distance-enabled",
].forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;

  field.addEventListener("input", () => {
    renderAutowalkHuntSummary();
  });
  field.addEventListener("change", () => {
    renderAutowalkHuntSummary();
  });
});

[
  "avoidElementalFields",
  ...Object.values(AVOID_FIELD_CATEGORY_INPUT_IDS),
].forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;

  field.addEventListener("change", () => {
    renderAvoidFieldControls(getAvoidFieldDraft());
  });
});

ROUTE_ITEM_SHARED_FIELD_IDS.forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;

  const markDirty = () => {
    if (getResolvedRouteEditorMode() === "tileRule") {
      captureTileRuleEditorDraftFromDom();
    } else {
      captureWaypointEditorDraftFromDom();
    }
  };

  field.addEventListener("input", markDirty);
  field.addEventListener("change", markDirty);
});

WAYPOINT_EDITOR_FIELD_IDS.forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;

  const markDirty = () => {
    captureWaypointEditorDraftFromDom();
  };

  field.addEventListener("input", markDirty);
  field.addEventListener("change", markDirty);
});

TILE_RULE_EDITOR_FIELD_IDS.forEach((id) => {
  const field = document.getElementById(id);
  if (!field) return;

  const markDirty = () => {
    captureTileRuleEditorDraftFromDom();
  };

  field.addEventListener("input", markDirty);
  field.addEventListener("change", markDirty);
});

routeEditorModeButtons.waypoint?.addEventListener("click", () => {
  if (!getWaypoints().length) return;
  setRouteEditorMode("waypoint");
});

routeEditorModeButtons.tileRule?.addEventListener("click", () => {
  if (!getTileRules().length) return;
  setRouteEditorMode("tileRule");
});

document.getElementById("waypoint-type")?.addEventListener("change", (event) => {
  routeEditorMode = "waypoint";
  const editorWaypoint = {
    ...getWaypointEditorValue(getWaypoints()),
    type: event.target.value,
    action: document.getElementById("waypoint-action")?.value,
    targetIndex: document.getElementById("waypoint-action-target")?.value,
  };
  renderWaypointEditorDetails(editorWaypoint);
});

document.getElementById("waypoint-action")?.addEventListener("change", (event) => {
  routeEditorMode = "waypoint";
  renderWaypointActionEditor({
    ...getWaypointEditorValue(getWaypoints()),
    type: "action",
    action: event.target.value,
    targetIndex: document.getElementById("waypoint-action-target")?.value,
  });
});

document.getElementById("tile-rule-policy")?.addEventListener("change", (event) => {
  renderTileRulePolicyHelp(event.target.value);
});

document.getElementById("tile-rule-shape")?.addEventListener("change", (event) => {
  const isRect = normalizeTileRuleShape(event.target.value) === "rect";
  const widthField = document.getElementById("tile-rule-width");
  const heightField = document.getElementById("tile-rule-height");
  if (widthField) widthField.disabled = !isRect;
  if (heightField) heightField.disabled = !isRect;
});

waypointList.addEventListener("click", async (event) => {
  const markButton = event.target.closest("[data-waypoint-mark]");
  if (markButton) {
    if (!hasWaypoints()) return;
    toggleMarkedWaypoint(Number(markButton.dataset.waypointMark));
    clearPendingDangerAction("remove-waypoint");
    renderAutowalk();
    return;
  }

  const row = event.target.closest(".waypoint-row");
  if (!row) return;
  await selectWaypoint(Number(row.dataset.index));
});

waypointList.addEventListener("dblclick", async (event) => {
  if (event.target.closest("[data-waypoint-mark]")) return;
  const row = event.target.closest(".waypoint-row");
  if (!row || event.button !== 0) return;
  await selectWaypoint(Number(row.dataset.index), { openEditor: true });
});

waypointList.addEventListener("contextmenu", async (event) => {
  if (event.target.closest("[data-waypoint-mark]")) {
    return;
  }

  const row = event.target.closest(".waypoint-row");
  if (!row) return;

  event.preventDefault();
  await resumeRouteFromWaypoint(Number(row.dataset.index), { buttons: row });
});

tileRuleList?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-tile-rule-index]");
  if (!row) return;
  selectedTileRuleIndex = Number(row.dataset.tileRuleIndex);
  routeEditorMode = "tileRule";
  renderAutowalk();
});

botTabs?.addEventListener("dragstart", (event) => {
  const select = event.target.closest("[data-session-select]");
  if (!select) return;

  const sessionId = normalizeSessionTabId(select.dataset.sessionSelect);
  if (!sessionId || getOrderedSessions(state?.sessions || []).length < 2) {
    event.preventDefault();
    return;
  }

  sessionTabDragState = {
    sessionId,
    overSessionId: null,
    placement: "before",
    moved: false,
  };
  event.dataTransfer?.setData("text/plain", sessionId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
  syncSessionTabDragClasses();
});

botTabs?.addEventListener("dragover", (event) => {
  if (!sessionTabDragState) return;

  const targetTab = event.target.closest(".bot-tab[data-session-id]");
  if (!targetTab) {
    event.preventDefault();
    return;
  }

  const targetSessionId = normalizeSessionTabId(targetTab.dataset.sessionId);
  const placement = getSessionTabDropPlacement(targetTab, event.clientX, event.clientY);
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  sessionTabDragState.overSessionId = targetSessionId;
  sessionTabDragState.placement = placement;
  if (targetSessionId && targetSessionId !== sessionTabDragState.sessionId) {
    const moved = reorderSessionTabDom(sessionTabDragState.sessionId, targetSessionId, placement);
    sessionTabDragState.moved = sessionTabDragState.moved || moved;
  }
  syncSessionTabDragClasses();
});

botTabs?.addEventListener("drop", (event) => {
  if (!sessionTabDragState) return;
  event.preventDefault();
  finishSessionTabDrag();
});

botTabs?.addEventListener("dragend", () => {
  finishSessionTabDrag();
});

botTabs?.addEventListener("click", async (event) => {
  const toggle = event.target.closest("[data-session-toggle]");
  if (toggle) {
    event.preventDefault();
    event.stopPropagation();

    const sessionId = toggle.dataset.sessionToggle;
    const session = (state?.sessions || []).find((candidate) => String(candidate.id) === String(sessionId)) || null;
    if (!session || isInstanceBusy(session)) return;

    await runAction(() => window.bbApi.toggleRun(sessionId), {
      buttons: toggle,
      successMessage: (nextState) => {
        const nextSession = (nextState?.sessions || []).find((candidate) => String(candidate.id) === String(sessionId)) || session;
        const label = getInstanceDisplayName(nextSession) || nextSession.label || "character";
        return `${label} ${nextSession.running ? "started" : "stopped"}`;
      },
      errorMessage: `Unable to toggle ${getInstanceDisplayName(session) || session.label || "character"}`,
      tone: session.running ? "warn" : "live",
    });
    return;
  }

  const select = event.target.closest("[data-session-select]");
  if (!select) return;
  if (Date.now() < suppressSessionTabClickUntil) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const sessionId = select.dataset.sessionSelect;
  if (!sessionId || String(sessionId) === String(state?.activeSessionId || "")) {
    return;
  }

  const nextState = await selectSession(sessionId, {
    buttons: [select, refreshButton, killSessionButton],
  });

  if (nextState) {
    focusSessionSelect(sessionId);
  }
});

botTabs?.addEventListener("keydown", (event) => {
  const select = event.target.closest("[data-session-select]");
  if (!select) return;

  if (focusRelativeSessionSelect(select, event.key)) {
    event.preventDefault();
  }
});

windowCloseButton?.addEventListener("click", async () => {
  setBusy(windowCloseButton, true);
  try {
    await window.bbApi.closeWindow();
  } catch (error) {
    console.error(error);
    flashStatus(`Unable to close window: ${error.message}`, "error", 4200);
    render();
  } finally {
    setBusy(windowCloseButton, false);
  }
});

newSessionButton?.addEventListener("click", async () => {
  await runAction(() => window.bbApi.newSession(), {
    buttons: [newSessionButton, refreshButton],
    successMessage: (nextState) => {
      const activeSession = (nextState?.sessions || [])
        .find((session) => String(session.id) === String(nextState?.activeSessionId || ""));
      return activeSession
        ? `${getInstanceDisplayName(activeSession) || activeSession.label || "Session"} linked`
        : "New Minibia session opened";
    },
    errorMessage: "Unable to open new session",
  });
});

killSessionButton?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) {
    flashStatus("No live character tab selected.", "warn", 3200);
    render();
    return;
  }

  await runAction(() => window.bbApi.killSession(), {
    buttons: [killSessionButton, refreshButton],
    successMessage: "Session closed",
    errorMessage: "Unable to close session",
    tone: "warn",
  });
});

newRouteButton?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;

  clearPendingDangerAction();
  clearRouteUndoState();
  const nextState = await updateOptions({
    cavebotName: "",
    waypoints: [],
    tileRules: [],
  }, {
    buttons: newRouteButton,
    successMessage: "Blank route draft ready",
    errorMessage: "Unable to start a blank route",
  });

  if (nextState) {
    selectedWaypointIndex = 0;
    selectedTileRuleIndex = 0;
    resetAutowalkDraft({ routeLibrary: true });
    await syncOverlayFocus();
    focusRouteBuilder("#cavebotName");
  }
});

refreshButton?.addEventListener("click", async () => {
  await runAction(() => window.bbApi.refresh(), {
    buttons: refreshButton,
    successMessage: (nextState) => hasSessionTabs(nextState) ? "Tab sync complete" : "Character tabs scanned",
    errorMessage: "Sync failed",
  });
});

windowPinButton?.addEventListener("click", async () => {
  if (!isStateReady()) return;

  await runAction(() => window.bbApi.setAlwaysOnTop(!Boolean(state?.alwaysOnTop)), {
    buttons: windowPinButton,
    successMessage: (nextState) => nextState?.alwaysOnTop
      ? "Desk pinned above other windows"
      : "Desk can float behind other windows",
    errorMessage: "Unable to change desk pin state",
  });
});

compactViewButton?.addEventListener("click", async () => {
  await setViewMode(uiViewMode === "compact" ? "desk" : "compact");
  render();
});

routeLivePreviewToggleButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  setRouteLivePreviewCollapsed(!routeLivePreviewCollapsed);
});

[
  { button: quickButtons.autowalk, optionKey: "autowalkEnabled", label: "Autowalk" },
  { button: quickButtons.loop, optionKey: "autowalkLoop", label: "Loop" },
  { button: quickButtons.record, optionKey: "routeRecording", label: "Route record" },
  { button: quickButtons.waypoints, optionKey: "showWaypointOverlay", label: "Waypoint overlay" },
  { button: quickButtons.avoidFields, optionKey: "avoidElementalFields", label: "Field avoidance" },
  { button: quickButtons.healer, optionKey: "healerEnabled", label: "Healer" },
  { button: quickButtons.deathHeal, optionKey: "deathHealEnabled", label: "Death heal" },
  { button: quickButtons.manaTrainer, optionKey: "manaTrainerEnabled", label: "Mana module" },
  { button: quickButtons.autoEat, optionKey: "autoEatEnabled", label: "Auto eat" },
  { button: quickButtons.ammo, optionKey: "ammoEnabled", label: "Ammo" },
  {
    button: quickButtons.ringAmuletAutoReplace,
    optionKey: "ringAutoReplaceEnabled",
    label: "Ring amulet replace",
    getCurrentEnabled: () => Boolean(state?.options?.ringAutoReplaceEnabled || state?.options?.amuletAutoReplaceEnabled),
    buildPayload: (nextEnabled) => buildEquipmentReplaceMasterTogglePayload(nextEnabled),
  },
  { button: quickButtons.runeMaker, optionKey: "runeMakerEnabled", label: "Rune module" },
  { button: quickButtons.spellCaster, optionKey: "spellCasterEnabled", label: "Spell module" },
  { button: quickButtons.autoLight, optionKey: "autoLightEnabled", label: "Light module" },
  { button: quickButtons.autoConvert, optionKey: "autoConvertEnabled", label: "Coin module" },
  { button: quickButtons.looting, optionKey: "lootingEnabled", label: "Looting" },
  { button: quickButtons.banking, optionKey: "bankingEnabled", label: "Banking" },
  { button: quickButtons.rookiller, optionKey: "rookillerEnabled", label: "Rookiller" },
  { button: quickButtons.trainer, optionKey: "trainerEnabled", label: "Trainer" },
  { button: quickButtons.reconnect, optionKey: "reconnectEnabled", label: "Reconnect" },
  { button: quickButtons.antiIdle, optionKey: "antiIdleEnabled", label: "Anti Idle" },
  { button: quickButtons.alarms, optionKey: "alarmsEnabled", label: "Alarms" },
  { button: quickButtons.partyFollow, optionKey: "partyFollowEnabled", label: "Follow Chain" },
].forEach(({ button, optionKey, label, getCurrentEnabled, buildPayload }) => {
  button?.addEventListener("click", async () => {
    if (!isStateReady() || !isDeskBound()) return;
    const currentEnabled = typeof getCurrentEnabled === "function"
      ? getCurrentEnabled()
      : Boolean(state.options?.[optionKey]);
    const nextEnabled = !currentEnabled;
    const payload = typeof buildPayload === "function"
      ? buildPayload(nextEnabled)
      : optionKey === "partyFollowEnabled"
        ? buildPartyFollowTogglePayload(nextEnabled)
        : { [optionKey]: nextEnabled };
    await updateOptions(payload, {
      buttons: button,
      successMessage: (nextState) => {
        const enabled = typeof buildPayload === "function"
          ? Boolean(nextState?.options?.ringAutoReplaceEnabled || nextState?.options?.amuletAutoReplaceEnabled)
          : Boolean(nextState?.options?.[optionKey]);
        return `${label} ${enabled ? "enabled" : "disabled"}`;
      },
    });
  });
});

sessionWaypointVisibilityButton?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  await runAction(() => window.bbApi.setSessionWaypointOverlays(!state.options?.showWaypointOverlay), {
    buttons: [sessionWaypointVisibilityButton, quickButtons.waypoints, compactQuickButtons.waypoints],
    successMessage: (nextState) => `Session waypoints ${nextState?.options?.showWaypointOverlay ? "shown" : "hidden"}`,
  });
});

quickButtons.cavebotPause?.addEventListener("click", async () => {
  await stopAllCavebots(quickButtons.cavebotPause);
});

quickButtons.targeting?.addEventListener("click", async () => {
  await toggleAggroHold();
});

actionButtons.saveTargeting?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  const nextState = await updateOptions(targetingPayload(), {
    buttons: actionButtons.saveTargeting,
    successMessage: "Targeting settings saved",
    errorMessage: "Unable to save targeting settings",
  });

  if (nextState) {
    targetingDirty = false;
    resetTargetQueueDraft();
    resetTargetProfilesDraft();
    await waitForFeedbackCloseDelay();
    closeModalIfActive("targeting", { preserveDangerAction: true });
  }
});

actionButtons.saveModules.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!isStateReady() || !isDeskBound()) return;
    const savedModuleName = activeModalName;
    const payload = savedModuleName === "partyFollow"
      ? followTrainPayload()
      : modulesPayload();
    const nextState = await updateOptions(payload, {
      buttons: button,
      successMessage: "Module settings saved",
      errorMessage: "Unable to save module settings",
      feedbackDurationMs: ACTION_FEEDBACK_MS,
    });

    const clickedButton = lastSaveModulesClickButton instanceof HTMLElement
      ? lastSaveModulesClickButton
      : null;
    const feedbackButtons = [button, clickedButton]
      .filter((entry, index, entries) => entry instanceof HTMLElement && entries.indexOf(entry) === index);
    if (nextState !== null) {
      for (const feedbackButton of feedbackButtons) {
        feedbackButton.dataset.feedback = "success";
      }
    }

    if (nextState) {
      modulesDraft = cloneModuleOptions(nextState.options || {});
      await waitForFeedbackCloseDelay();
      closeModalIfActive(savedModuleName, { preserveDangerAction: true });
    }
  });
});

actionButtons.newBlankRoute.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;

  clearPendingDangerAction();
  clearRouteUndoState();
  clearMarkedWaypoints();
  const nextState = await updateOptions({
    cavebotName: "",
    waypoints: [],
    tileRules: [],
  }, {
    buttons: actionButtons.newBlankRoute,
    successMessage: "Blank route draft ready",
    errorMessage: "Unable to start a blank route",
  });

  if (nextState) {
    selectedWaypointIndex = 0;
    selectedTileRuleIndex = 0;
    resetAutowalkDraft({ routeLibrary: true });
    await syncOverlayFocus();
    focusRouteBuilder("#cavebotName");
  }
});

actionButtons.loadRoute.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;

  const routeName = getSelectedRouteLibraryName();
  if (!routeName) return;
  clearPendingDangerAction();
  clearRouteUndoState();
  clearMarkedWaypoints();
  const nextState = await loadRouteSelection(routeName, {
    buttons: actionButtons.loadRoute,
    respectDirty: true,
  });
  if (nextState) {
    await waitForFeedbackCloseDelay();
    closeModalIfActive("autowalk", { preserveDangerAction: true });
  }
});

actionButtons.loadRouteQuick?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;

  const routeName = getSelectedRouteLibraryName();
  if (!routeName) return;
  clearPendingDangerAction();
  clearRouteUndoState();
  clearMarkedWaypoints();
  const nextState = await loadRouteSelection(routeName, {
    buttons: actionButtons.loadRouteQuick,
    respectDirty: true,
  });
  if (nextState) {
    await waitForFeedbackCloseDelay();
    closeModalIfActive("routeLibraryPicker", { preserveDangerAction: true });
  }
});

actionButtons.deleteRoute.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;

  const routeName = getSelectedRouteLibraryName();
  if (!routeName || !doesRouteDeleteConfirmationMatch(routeName)) return;

  const selectedRouteEntry = getRouteLibrary().find((entry) => entry.name === routeName) || null;

  if (!isDangerActionArmed("delete-route")) {
    clearPendingDangerAction();
    armDangerAction("delete-route", { routeName });
    renderRouteDangerZone();
    flashStatus(`Confirm delete for ${selectedRouteEntry?.fileName || routeName}.`, "warn", 2600);
    return;
  }

  clearPendingDangerAction("delete-route");
  clearRouteUndoState();
  clearMarkedWaypoints();
  const nextState = await runAction(() => window.bbApi.deleteRoute(routeName), {
    buttons: actionButtons.deleteRoute,
    successMessage: `Deleted ${routeName}`,
    errorMessage: "Unable to delete route",
  });

  if (nextState) {
    const remaining = Array.isArray(nextState.routeLibrary) ? nextState.routeLibrary : [];
    resetAutowalkDraft();
    selectedRouteLibraryName = remaining.find((entry) => entry.active)?.name || remaining[0]?.name || "";
    await syncOverlayFocus();
  }
});

actionButtons.newAccount?.addEventListener("click", () => {
  selectedAccountId = "";
  accountDraftNewEntry = true;
  accountDraft = getBlankAccountDraft();
  accountDraftDirty = false;
  accountDraftRenderedKey = "";
  renderAccountRegistry();
  focusField("account-label");
});

actionButtons.saveAccount?.addEventListener("click", async () => {
  if (!isStateReady()) return;

  const draft = captureAccountDraftFromDom();
  if (!draft.label && !draft.loginName && !draft.preferredCharacter && !draft.characters.length) {
    flashStatus("Set a label, login name, or preferred character before saving.", "warn", 3200);
    focusField("account-label");
    return;
  }

  const predictedId = draft.id || buildAccountStorageKey([
    draft.label,
    draft.loginName,
    draft.preferredCharacter,
  ].filter(Boolean).join(" "));
  const payload = {
    ...draft,
    id: predictedId,
  };
  const nextState = await runAction(() => window.bbApi.saveAccount(payload), {
    buttons: actionButtons.saveAccount,
    successMessage: `Saved ${draft.label || draft.loginName || predictedId}`,
    errorMessage: "Unable to save account",
  });

  if (nextState) {
    selectedAccountId = predictedId;
    accountDraftNewEntry = false;
    accountDraft = null;
    accountDraftDirty = false;
    accountDraftRenderedKey = "";
    renderAccountRegistry();
  }
});

actionButtons.deleteAccount?.addEventListener("click", async () => {
  if (!isStateReady()) return;

  const selectedAccount = getSelectedAccountEntry();
  if (!selectedAccount?.id) {
    flashStatus("No saved account selected.", "warn", 2600);
    return;
  }

  const label = selectedAccount.label || selectedAccount.id;
  if (!window.confirm(`Delete account ${label}?`)) {
    return;
  }

  const nextState = await runAction(() => window.bbApi.deleteAccount(selectedAccount.id), {
    buttons: actionButtons.deleteAccount,
    successMessage: `Deleted ${label}`,
    errorMessage: "Unable to delete account",
    tone: "warn",
  });

  if (nextState) {
    selectedAccountId = "";
    accountDraftNewEntry = false;
    accountDraft = null;
    accountDraftDirty = false;
    accountDraftRenderedKey = "";
    renderAccountRegistry();
  }
});

async function saveAutowalkSettings() {
  if (!isStateReady() || !isDeskBound()) return;
  const nextState = await updateOptions(autowalkPayload(), {
    buttons: [actionButtons.saveAutowalk, actionButtons.quickSaveAutowalk],
    successMessage: (savedState) => savedState?.routeProfile?.path
      ? "Route settings saved"
      : "Route draft saved locally",
    errorMessage: "Unable to save route settings",
  });

  if (nextState) {
    clearPendingDangerAction();
    resetAutowalkDraft({ route: true, waypoint: false });
    selectedRouteLibraryName = String(nextState?.options?.cavebotName || "").trim();
    renderAutowalk();
    await waitForFeedbackCloseDelay();
    closeModalIfActive("autowalk", { preserveDangerAction: true });
  }
}

actionButtons.saveAutowalk.addEventListener("click", saveAutowalkSettings);
actionButtons.quickSaveAutowalk?.addEventListener("click", saveAutowalkSettings);

actionButtons.saveWaypoint.addEventListener("click", async () => {
  if (!hasWaypoints()) return;

  const { patch, error, fieldId } = getWaypointEditorPatch();
  if (!patch) {
    flashStatus(error || "Waypoint data is incomplete.", "error", 3200);
    if (fieldId) {
      focusField(fieldId);
    }
    return;
  }

  const nextState = await runAction(
    () => window.bbApi.updateWaypoint(selectedWaypointIndex, patch),
    {
      buttons: actionButtons.saveWaypoint,
      successMessage: "Waypoint saved",
      errorMessage: "Unable to save waypoint",
    },
  );

  if (nextState) {
    clearPendingDangerAction();
    resetAutowalkDraft({ route: false, waypoint: true });
  }
});

actionButtons.addCurrentTileRuleAvoid?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  await addTileRuleOfPolicy("avoid", [actionButtons.addCurrentTileRuleAvoid]);
});

actionButtons.addCurrentTileRuleWait?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  await addTileRuleOfPolicy("wait", [actionButtons.addCurrentTileRuleWait]);
});

actionButtons.saveTileRule?.addEventListener("click", async () => {
  if (!hasTileRules()) return;

  const { patch, error, fieldId } = getTileRuleEditorPatch();
  if (!patch) {
    flashStatus(error || "Tile rule data is incomplete.", "error", 3200);
    if (fieldId) {
      focusField(fieldId);
    }
    return;
  }

  const nextState = await runAction(
    () => window.bbApi.updateTileRule(selectedTileRuleIndex, patch),
    {
      buttons: actionButtons.saveTileRule,
      successMessage: "Tile rule saved",
      errorMessage: "Unable to save tile rule",
    },
  );

  if (nextState) {
    tileRuleEditorDirty = false;
    tileRuleEditorDirtyIndex = selectedTileRuleIndex;
    renderAutowalk();
  }
});

actionButtons.addCurrentWaypoint.addEventListener("click", () => {
  if (!isStateReady() || !isDeskBound()) return;
  toggleWaypointAddPanel();
});

waypointAddTypeButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!isStateReady() || !isDeskBound()) return;
    await addWaypointOfType(button.dataset.addWaypointType, [button]);
  });
});

actionButtons.removeWaypoint.addEventListener("click", async () => {
  if (!hasWaypoints()) return;
  const waypoints = getWaypoints();
  const markedCount = getMarkedWaypointCount(waypoints);
  const targetLabel = formatWaypointDangerLabel(selectedWaypointIndex, waypoints);
  const deleteLabel = markedCount
    ? `${markedCount} marked waypoint${markedCount === 1 ? "" : "s"}`
    : targetLabel;

  if (!isDangerActionArmed("remove-waypoint")) {
    clearPendingDangerAction();
    armDangerAction("remove-waypoint", { index: selectedWaypointIndex });
    renderRouteDangerZone(waypoints);
    flashStatus(`Confirm waypoint delete for ${deleteLabel}.`, "warn", 2600);
    return;
  }

  if (markedCount) {
    await removeMarkedWaypoints({ buttons: [actionButtons.removeWaypoint, actionButtons.removeSelectedWaypoints] });
    return;
  }

  await removeWaypointAt(selectedWaypointIndex, { buttons: actionButtons.removeWaypoint });
});

actionButtons.clearWaypointMarks?.addEventListener("click", () => {
  if (!clearMarkedWaypoints()) return;
  clearPendingDangerAction("remove-waypoint");
  renderAutowalk();
});

actionButtons.clearLiveSelectedWaypoints?.addEventListener("click", () => {
  if (!clearMarkedWaypoints()) return;
  clearPendingDangerAction("remove-waypoint");
  renderAutowalk();
});

actionButtons.removeSelectedWaypoints?.addEventListener("click", async () => {
  if (!hasMarkedWaypoints()) return;
  await removeMarkedWaypoints({
    buttons: [actionButtons.removeSelectedWaypoints, actionButtons.removeWaypoint],
  });
});

actionButtons.moveWaypointUp.addEventListener("click", async () => {
  if (!hasWaypoints() || selectedWaypointIndex <= 0) return;
  clearPendingDangerAction();
  clearRouteUndoState();
  clearMarkedWaypoints();

  const nextState = await runAction(() => window.bbApi.moveWaypoint(selectedWaypointIndex, -1), {
    buttons: actionButtons.moveWaypointUp,
    successMessage: "Waypoint moved up",
    errorMessage: "Unable to move waypoint",
  });

  if (nextState) {
    selectedWaypointIndex -= 1;
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }
});

actionButtons.moveWaypointDown.addEventListener("click", async () => {
  if (!hasWaypoints() || selectedWaypointIndex >= getWaypoints().length - 1) return;
  clearPendingDangerAction();
  clearRouteUndoState();
  clearMarkedWaypoints();

  const nextState = await runAction(() => window.bbApi.moveWaypoint(selectedWaypointIndex, 1), {
    buttons: actionButtons.moveWaypointDown,
    successMessage: "Waypoint moved down",
    errorMessage: "Unable to move waypoint",
  });

  if (nextState) {
    selectedWaypointIndex += 1;
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }
});

actionButtons.removeTileRule?.addEventListener("click", async () => {
  if (!hasTileRules()) return;

  const label = getTileRuleDisplayLabel(getSelectedTileRule(), selectedTileRuleIndex);
  if (!window.confirm(`Delete ${label}?`)) {
    return;
  }

  const nextState = await runAction(() => window.bbApi.removeTileRule(selectedTileRuleIndex), {
    buttons: actionButtons.removeTileRule,
    successMessage: `Deleted ${label}`,
    errorMessage: "Unable to remove tile rule",
  });

  if (nextState) {
    selectedTileRuleIndex = Math.max(0, selectedTileRuleIndex - 1);
    tileRuleEditorDirty = false;
    tileRuleEditorDirtyIndex = selectedTileRuleIndex;
    renderAutowalk();
  }
});

actionButtons.moveTileRuleUp?.addEventListener("click", async () => {
  if (!hasTileRules() || selectedTileRuleIndex <= 0) return;

  const nextState = await runAction(() => window.bbApi.moveTileRule(selectedTileRuleIndex, -1), {
    buttons: actionButtons.moveTileRuleUp,
    successMessage: "Tile rule moved up",
    errorMessage: "Unable to move tile rule",
  });

  if (nextState) {
    selectedTileRuleIndex -= 1;
    tileRuleEditorDirty = false;
    tileRuleEditorDirtyIndex = selectedTileRuleIndex;
    renderAutowalk();
  }
});

actionButtons.moveTileRuleDown?.addEventListener("click", async () => {
  if (!hasTileRules() || selectedTileRuleIndex >= getTileRules().length - 1) return;

  const nextState = await runAction(() => window.bbApi.moveTileRule(selectedTileRuleIndex, 1), {
    buttons: actionButtons.moveTileRuleDown,
    successMessage: "Tile rule moved down",
    errorMessage: "Unable to move tile rule",
  });

  if (nextState) {
    selectedTileRuleIndex += 1;
    tileRuleEditorDirty = false;
    tileRuleEditorDirtyIndex = selectedTileRuleIndex;
    renderAutowalk();
  }
});

actionButtons.resetRoute.addEventListener("click", async () => {
  if (!hasWaypoints()) return;
  clearRouteLiveResumeTarget();
  clearPendingDangerAction();
  const nextState = await runAction(() => window.bbApi.resetRoute(selectedWaypointIndex), {
    buttons: actionButtons.resetRoute,
    successMessage: `Live route moved to waypoint ${selectedWaypointIndex + 1}`,
    errorMessage: "Unable to move live route",
  });

  if (nextState) {
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }
});

async function triggerRouteReset(buttons = [actionButtons.quickResetRoute, actionButtons.routeResetPanel]) {
  if (!hasWaypoints()) return;
  clearRouteLiveResumeTarget();
  clearPendingDangerAction();
  selectedWaypointIndex = 0;
  const nextState = await runAction(() => window.bbApi.returnToStart(), {
    buttons,
    successMessage: "Return active: returning to waypoint 1",
    errorMessage: "Unable to start return",
  });

  if (nextState) {
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }
}

actionButtons.quickResetRoute.addEventListener("click", async () => {
  await triggerRouteReset([actionButtons.quickResetRoute, actionButtons.routeResetPanel]);
});

actionButtons.routeResetPanel?.addEventListener("click", async () => {
  await triggerRouteReset([actionButtons.routeResetPanel, actionButtons.quickResetRoute]);
});

actionButtons.routeOffButton?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  await updateOptions({
    autowalkEnabled: false,
    autowalkLoop: false,
    routeRecording: false,
    showWaypointOverlay: false,
  }, {
    buttons: actionButtons.routeOffButton,
    successMessage: "Route controls disabled",
    errorMessage: "Unable to disable route controls",
    tone: "warn",
  });
});

actionButtons.routeAddWaypointPanel?.addEventListener("click", async () => {
  if (!isStateReady() || !isDeskBound()) return;
  await addWaypointOfType("walk", [actionButtons.routeAddWaypointPanel, actionButtons.addCurrentWaypoint]);
});

actionButtons.routeReconnectPanel?.addEventListener("click", async () => {
  await triggerReconnect(actionButtons.routeReconnectPanel);
});

actionButtons.routeStopAggroPanel?.addEventListener("click", async () => {
  await toggleAggroHold();
});

actionButtons.clearRoute.addEventListener("click", async () => {
  if (!hasWaypoints() && !hasTileRules()) return;
  const previousWaypoints = cloneValue(getWaypoints());
  const previousTileRules = cloneValue(getTileRules());
  const waypointCount = previousWaypoints.length;
  const tileRuleCount = previousTileRules.length;
  const previousTileRuleIndex = selectedTileRuleIndex;

  if (!isDangerActionArmed("clear-route")) {
    clearPendingDangerAction();
    armDangerAction("clear-route");
    renderRouteDangerZone(previousWaypoints);
    flashStatus(
      `Confirm clear for ${waypointCount} waypoint${waypointCount === 1 ? "" : "s"} and ${tileRuleCount} tile rule${tileRuleCount === 1 ? "" : "s"}.`,
      "warn",
      2600,
    );
    return;
  }

  const previousSelectedIndex = selectedWaypointIndex;
  clearPendingDangerAction("clear-route");
  const nextState = await updateOptions({ waypoints: [], tileRules: [] }, {
    buttons: actionButtons.clearRoute,
    successMessage: "Route cleared",
    errorMessage: "Unable to clear route",
  });

  if (nextState) {
    routeUndoState = {
      waypoints: previousWaypoints,
      tileRules: previousTileRules,
      selectedWaypointIndex: previousSelectedIndex,
      selectedTileRuleIndex: previousTileRuleIndex,
    };
    clearMarkedWaypoints();
    selectedWaypointIndex = 0;
    selectedTileRuleIndex = 0;
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }
});

undoRouteChangeButton?.addEventListener("click", async () => {
  if (!routeUndoState || !isStateReady() || !isDeskBound()) return;

  const snapshot = cloneValue(routeUndoState);
  const nextState = await updateOptions({ waypoints: snapshot.waypoints, tileRules: snapshot.tileRules || [] }, {
    buttons: undoRouteChangeButton,
    successMessage: `Restored ${snapshot.waypoints.length} waypoint${snapshot.waypoints.length === 1 ? "" : "s"}`,
    errorMessage: "Unable to restore route",
  });

  if (nextState) {
    clearMarkedWaypoints(snapshot.waypoints || []);
    selectedWaypointIndex = Math.max(0, Math.min(snapshot.selectedWaypointIndex, snapshot.waypoints.length - 1));
    selectedTileRuleIndex = Math.max(0, Math.min(snapshot.selectedTileRuleIndex || 0, (snapshot.tileRules || []).length - 1));
    clearRouteUndoState();
    resetAutowalkDraft({ route: false, waypoint: true });
    await syncOverlayFocus();
  }
});

cancelRouteDangerButton?.addEventListener("click", () => {
  clearPendingDangerAction();
  renderRouteDangerZone();
});

unsubscribeFromEvents = window.bbApi.onEvent((event) => {
  if (rendererDisposed) return;

  applyState(event.state, {
    patch: event.statePatch === true,
  });

  if (event.type === "attached") {
    flashStatus(`Attached to ${getBindingLabel() || "live client"}`, "ready", 2200);
  } else if (event.type === "active-session") {
    flashStatus(`Switched to ${getBindingLabel() || "character tab"}`, "ready", 2200);
  } else if (event.type === "started") {
    flashStatus("Bot loop started", "live", 2200);
  } else if (event.type === "stopped") {
    flashStatus("Bot loop stopped", "warn", 2200);
  } else if (event.type === "route-recorded") {
    flashStatus("Waypoint recorded", "ready", 2200);
  } else if (event.type === "route-reset-complete") {
    void playAlertBeep("reset");
    const targetIndex = Number.isFinite(Number(event.payload?.index))
      ? Math.max(0, Math.trunc(Number(event.payload.index)))
      : 0;
    flashStatus(`Return complete: holding waypoint ${targetIndex + 1}`, "warn", 3200);
  } else if (event.type === "rookiller-ready") {
    flashStatus("Rookiller ready: waypoint 1 reached", "warn", 3200);
  } else if (event.type === "rookiller-disconnect") {
    flashStatus("Rookiller closing: waypoint 1 reached", "warn", 3200);
  } else if (event.type === "target-archive") {
    const legacyAdded = Array.isArray(event.payload?.added) ? event.payload.added.length : 0;
    const addedMonsters = Array.isArray(event.payload?.addedMonsters) ? event.payload.addedMonsters.length : legacyAdded;
    const addedPlayers = Array.isArray(event.payload?.addedPlayers) ? event.payload.addedPlayers.length : 0;
    let message = "Target registry updated";
    if (addedMonsters && addedPlayers) {
      message = `Archived ${addedMonsters} monster${addedMonsters === 1 ? "" : "s"} and ${addedPlayers} player${addedPlayers === 1 ? "" : "s"}`;
    } else if (addedMonsters) {
      message = `Archived ${addedMonsters} seen monster${addedMonsters === 1 ? "" : "s"}`;
    } else if (addedPlayers) {
      message = `Archived ${addedPlayers} seen player${addedPlayers === 1 ? "" : "s"}`;
    }
    flashStatus(message, "ready", 2200);
  } else if (event.type === "anti-idle") {
    const transport = String(event.payload?.transport || "").trim();
    flashStatus(transport ? `Anti-idle pulse via ${transport}` : "Anti-idle pulse sent", "ready", 2200);
  } else if (event.type === "error") {
    flashStatus(event.payload?.error?.message || "Bot error", "error", 4200);
  }

  scheduleRender(event.statePatch === true ? "live" : "full");
});

window.__MINIBOT_RENDERER_DISPOSE__ = disposeRenderer;
window.addEventListener("beforeunload", () => {
  void disposeRenderer();
}, { once: true });

syncModalPanels(null);
syncModalState(false);
syncTargetWatchDockPosition();
syncViewModeUi();
initMainWindowHoverTooltips();
render();
refreshState();
