/*
 * Managed browser discovery and launch helpers.
 * Desktop session launch depends on these routines to keep dedicated profile
 * handling and background-safe browser flags consistent.
 */
import fs from "node:fs";
import path from "node:path";

const LINUX_BROWSER_EXECUTABLE_CANDIDATES = Object.freeze([
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "/usr/bin/brave-browser",
  "/snap/bin/brave",
  "/usr/bin/microsoft-edge",
  "/usr/bin/microsoft-edge-stable",
]);
const DARWIN_BROWSER_EXECUTABLE_SUFFIXES = Object.freeze([
  ["Google Chrome.app", "Contents", "MacOS", "Google Chrome"],
  ["Chromium.app", "Contents", "MacOS", "Chromium"],
  ["Brave Browser.app", "Contents", "MacOS", "Brave Browser"],
  ["Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"],
]);
const WINDOWS_BROWSER_EXECUTABLE_SUFFIXES = Object.freeze([
  ["Google", "Chrome", "Application", "chrome.exe"],
  ["Google", "Chrome Beta", "Application", "chrome.exe"],
  ["Chromium", "Application", "chrome.exe"],
  ["BraveSoftware", "Brave-Browser", "Application", "brave.exe"],
  ["Microsoft", "Edge", "Application", "msedge.exe"],
]);
const DEFAULT_BROWSER_COMMAND_CANDIDATES = Object.freeze([
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "brave-browser",
  "microsoft-edge",
  "microsoft-edge-stable",
]);
const WINDOWS_BROWSER_COMMAND_CANDIDATES = Object.freeze([
  "chrome",
  "chrome.exe",
  "msedge",
  "msedge.exe",
  "brave",
  "brave.exe",
  "chromium",
  "chromium.exe",
  ...DEFAULT_BROWSER_COMMAND_CANDIDATES,
]);
export const MANAGED_BROWSER_DISCOVERY_TIMEOUT_MS = 12_000;
const MANAGED_BROWSER_DISCOVERY_POLL_MS = 500;
const MANAGED_BROWSER_CDP_COMMAND_TIMEOUT_MS = 5_000;
const BACKGROUND_SAFE_BROWSER_FEATURES = Object.freeze([
  "CalculateNativeWinOcclusion",
  "IntensiveWakeUpThrottling",
]);
const KEEP_ACTIVE_BROWSER_FLAGS = Object.freeze([
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  `--disable-features=${BACKGROUND_SAFE_BROWSER_FEATURES.join(",")}`,
]);
const MANAGED_BROWSER_HYGIENE_FLAGS = Object.freeze([
  "--disable-logging",
  "--disk-cache-size=1048576",
  "--media-cache-size=1048576",
]);
const DESKTOP_ENTRY_EXEC_FIELD_CODES = new Set([
  "%f",
  "%F",
  "%u",
  "%U",
  "%i",
  "%c",
  "%k",
]);
const EXPLICIT_BROWSER_ENV_KEYS = Object.freeze([
  "MINIBOT_BROWSER_PATH",
  "CHROME_BIN",
  "GOOGLE_CHROME_BIN",
]);
export const BACKGROUND_SAFE_BROWSER_FLAGS = Object.freeze([
  "--new-window",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-component-update",
  "--disable-domain-reliability",
  "--disable-client-side-phishing-detection",
  "--disable-breakpad",
  "--disable-crash-reporter",
]);
export const REMOVABLE_BROWSER_PROFILE_LOCK_PATHS = Object.freeze([
  "SingletonCookie",
  "SingletonLock",
  "SingletonSocket",
  "DevToolsActivePort",
  path.join("Default", "LOCK"),
]);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asError(value, fallbackMessage) {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return new Error(value.trim());
  }

  if (value && typeof value.message === "string" && value.message.trim()) {
    return new Error(value.message.trim());
  }

  return new Error(fallbackMessage);
}

function normalizePlatform(platform = process.platform) {
  return String(platform || process.platform).trim().toLowerCase() || process.platform;
}

function getPlatformPathModule(platform = process.platform) {
  return normalizePlatform(platform) === "win32" ? path.win32 : path.posix;
}

function getPlatformPathDelimiter(platform = process.platform) {
  return normalizePlatform(platform) === "win32" ? ";" : ":";
}

function getHomeDir(env = process.env, platform = process.platform) {
  const home = String(env.HOME || "").trim();
  if (home) {
    return home;
  }

  if (normalizePlatform(platform) !== "win32") {
    return String(env.USERPROFILE || "").trim();
  }

  const userProfile = String(env.USERPROFILE || "").trim();
  if (userProfile) {
    return userProfile;
  }

  const homeDrive = String(env.HOMEDRIVE || "").trim();
  const homePath = String(env.HOMEPATH || "").trim();
  return homeDrive && homePath ? `${homeDrive}${homePath}` : "";
}

function isPathLikeCommand(candidate) {
  const normalizedCandidate = String(candidate || "").trim();
  return Boolean(
    normalizedCandidate
    && (
      path.isAbsolute(normalizedCandidate)
      || path.posix.isAbsolute(normalizedCandidate)
      || path.win32.isAbsolute(normalizedCandidate)
      || normalizedCandidate.startsWith("./")
      || normalizedCandidate.startsWith("../")
      || normalizedCandidate.startsWith(".\\")
      || normalizedCandidate.startsWith("..\\")
      || normalizedCandidate.includes("/")
      || normalizedCandidate.includes("\\")
    )
  );
}

function resolveCommandFromPath(candidate, {
  env = process.env,
  existsImpl = fs.existsSync,
  platform = process.platform,
} = {}) {
  const normalizedCandidate = String(candidate || "").trim();
  if (!normalizedCandidate) {
    return "";
  }

  const normalizedPlatform = normalizePlatform(platform);
  const pathModule = getPlatformPathModule(normalizedPlatform);
  const pathEntries = String(env.PATH || "")
    .split(getPlatformPathDelimiter(normalizedPlatform))
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  const pathExts = normalizedPlatform === "win32"
    ? String(env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
      .split(";")
      .map((extension) => String(extension || "").trim())
      .filter(Boolean)
    : [""];

  for (const entry of pathEntries) {
    const commandPath = pathModule.join(entry, normalizedCandidate);
    if (existsImpl(commandPath)) {
      return commandPath;
    }

    if (normalizedPlatform !== "win32" || pathModule.extname(commandPath)) {
      continue;
    }

    for (const extension of pathExts) {
      const extendedPath = `${commandPath}${extension}`;
      if (existsImpl(extendedPath)) {
        return extendedPath;
      }
    }
  }

  return "";
}

function parseDesktopEntryField(contents, key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    return "";
  }

  const prefix = `${normalizedKey}=`;
  for (const line of String(contents || "").split(/\r?\n/)) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }

  return "";
}

function tokenizeCommandLine(commandLine) {
  const tokens = [];
  let current = "";
  let quote = "";
  let escaped = false;

  for (const character of String(commandLine || "")) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = "";
      } else {
        current += character;
      }
      continue;
    }

    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (escaped) {
    current += "\\";
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function parseDesktopEntryExec(execLine) {
  const tokens = tokenizeCommandLine(execLine)
    .map((token) => String(token || "").trim())
    .filter(Boolean)
    .filter((token) => !DESKTOP_ENTRY_EXEC_FIELD_CODES.has(token));

  if (!tokens.length) {
    return null;
  }

  return {
    command: tokens[0],
    args: tokens.slice(1),
  };
}

export function extractCommandArgValue(args = [], prefix = "") {
  const normalizedPrefix = String(prefix || "").trim();
  if (!normalizedPrefix) {
    return "";
  }

  for (const candidate of Array.isArray(args) ? args : []) {
    const normalizedCandidate = String(candidate || "").trim();
    if (normalizedCandidate.startsWith(normalizedPrefix)) {
      return normalizedCandidate.slice(normalizedPrefix.length);
    }
  }

  return "";
}

export function replaceCommandArgValue(args = [], prefix = "", value = "") {
  const normalizedPrefix = String(prefix || "").trim();
  if (!normalizedPrefix) {
    return Array.isArray(args) ? [...args] : [];
  }

  const normalizedValue = String(value || "").trim();
  const nextArgs = [];
  let replaced = false;

  for (const candidate of Array.isArray(args) ? args : []) {
    const normalizedCandidate = String(candidate || "").trim();
    if (!normalizedCandidate) {
      continue;
    }

    if (normalizedCandidate.startsWith(normalizedPrefix)) {
      if (!replaced && normalizedValue) {
        nextArgs.push(`${normalizedPrefix}${normalizedValue}`);
        replaced = true;
      }
      continue;
    }

    nextArgs.push(normalizedCandidate);
  }

  if (!replaced && normalizedValue) {
    nextArgs.push(`${normalizedPrefix}${normalizedValue}`);
  }

  return nextArgs;
}

function normalizeWindowPlacementBounds(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const left = Math.trunc(Number(value.left));
  const top = Math.trunc(Number(value.top));
  const right = Math.trunc(Number(value.right));
  const bottom = Math.trunc(Number(value.bottom));
  const width = right - left;
  const height = bottom - top;

  if (![left, top, right, bottom, width, height].every(Number.isFinite)) {
    return null;
  }

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    maximized: value.maximized === true,
  };
}

function collectAppWindowPlacements(value, segments = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const directBounds = normalizeWindowPlacementBounds(value);
  if (directBounds) {
    return [{
      segments,
      bounds: directBounds,
    }];
  }

  const placements = [];
  for (const [key, childValue] of Object.entries(value)) {
    placements.push(...collectAppWindowPlacements(childValue, [...segments, String(key || "").trim().toLowerCase()]));
  }
  return placements;
}

function scoreAppWindowPlacementMatch(segments = [], { appId = "", appUrl = "" } = {}) {
  const searchable = segments
    .map((segment) => String(segment || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (!searchable) {
    return 0;
  }

  let score = 0;
  const normalizedAppId = String(appId || "").trim().toLowerCase();
  if (normalizedAppId && searchable.includes(normalizedAppId)) {
    score += 100;
  }

  const normalizedAppUrl = String(appUrl || "").trim();
  if (!normalizedAppUrl) {
    return score;
  }

  try {
    const url = new URL(normalizedAppUrl);
    const hostTokens = url.hostname
      .toLowerCase()
      .split(".")
      .map((token) => token.trim())
      .filter(Boolean);
    const pathTokens = url.pathname
      .toLowerCase()
      .split("/")
      .map((token) => token.trim())
      .filter(Boolean);

    for (const token of hostTokens) {
      if (searchable.includes(token)) {
        score += 10;
      }
    }

    for (const token of pathTokens) {
      if (searchable.includes(token)) {
        score += 15;
      }
    }
  } catch {}

  return score;
}

export function resolveChromiumAppWindowBounds({
  userDataDir,
  profileDirectory = "Default",
  appId = "",
  appUrl = "",
  existsImpl = fs.existsSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const resolvedUserDataDir = String(userDataDir || "").trim();
  if (!resolvedUserDataDir) {
    return null;
  }

  const resolvedProfileDirectory = String(profileDirectory || "").trim() || "Default";
  const preferencesPath = path.join(resolvedUserDataDir, resolvedProfileDirectory, "Preferences");
  if (!existsImpl(preferencesPath)) {
    return null;
  }

  let preferences = null;
  try {
    preferences = JSON.parse(String(readFileImpl(preferencesPath) || "{}"));
  } catch {
    return null;
  }

  const placements = preferences?.browser?.app_window_placement;
  if (!placements || typeof placements !== "object") {
    return null;
  }

  const normalizedAppId = String(appId || "").trim();
  if (normalizedAppId) {
    const appIdPlacement = normalizeWindowPlacementBounds(placements[`_crx_${normalizedAppId}`]);
    if (appIdPlacement) {
      return appIdPlacement;
    }
  }

  const flattenedPlacements = collectAppWindowPlacements(placements);
  let bestMatch = null;

  for (const placement of flattenedPlacements) {
    const score = scoreAppWindowPlacementMatch(placement.segments, {
      appId: normalizedAppId,
      appUrl,
    });
    if (score <= 0) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        score,
        bounds: placement.bounds,
      };
    }
  }

  return bestMatch?.bounds || null;
}

export function resolveChromiumWindowSizeArg(options = {}) {
  const bounds = resolveChromiumAppWindowBounds(options);
  if (!bounds) {
    return "";
  }

  return `${bounds.width},${bounds.height}`;
}

function getExplicitBrowserEnvCandidates(env = process.env) {
  return EXPLICIT_BROWSER_ENV_KEYS
    .map((key) => String(env[key] || "").trim())
    .filter(Boolean);
}

function getBrowserEnvCandidates(env = process.env) {
  const explicitCandidates = getExplicitBrowserEnvCandidates(env);
  const browserCandidate = String(env.BROWSER || "").trim();
  return browserCandidate
    ? [...explicitCandidates, browserCandidate]
    : explicitCandidates;
}

function listDesktopEntrySearchDirs(env = process.env) {
  const dirs = [];
  const homeDir = getHomeDir(env, "linux");
  const dataHome = String(env.XDG_DATA_HOME || "").trim();
  const dataDirs = String(env.XDG_DATA_DIRS || "").trim();

  if (dataHome) {
    dirs.push(path.join(dataHome, "applications"));
  } else if (homeDir) {
    dirs.push(path.join(homeDir, ".local", "share", "applications"));
  }

  if (dataDirs) {
    for (const entry of dataDirs.split(":")) {
      const normalizedEntry = String(entry || "").trim();
      if (!normalizedEntry) {
        continue;
      }

      dirs.push(path.join(normalizedEntry, "applications"));
    }
  } else {
    dirs.push("/usr/local/share/applications");
    dirs.push("/usr/share/applications");
  }

  return [...new Set(dirs)];
}

function getPlatformBrowserExecutableCandidates({
  env = process.env,
  platform = process.platform,
} = {}) {
  const normalizedPlatform = normalizePlatform(platform);
  const homeDir = getHomeDir(env, normalizedPlatform);

  if (normalizedPlatform === "win32") {
    const pathModule = getPlatformPathModule(normalizedPlatform);
    const roots = [
      String(env.ProgramFiles || "").trim(),
      String(env["ProgramFiles(x86)"] || "").trim(),
      String(env.LOCALAPPDATA || "").trim(),
    ].filter(Boolean);

    return [...new Set(
      roots.flatMap((root) => WINDOWS_BROWSER_EXECUTABLE_SUFFIXES.map((segments) => pathModule.join(root, ...segments))),
    )];
  }

  if (normalizedPlatform === "darwin") {
    const pathModule = getPlatformPathModule(normalizedPlatform);
    const appRoots = [
      "/Applications",
      homeDir ? pathModule.join(homeDir, "Applications") : "",
    ].filter(Boolean);

    return [...new Set(
      appRoots.flatMap((root) => DARWIN_BROWSER_EXECUTABLE_SUFFIXES.map((segments) => pathModule.join(root, ...segments))),
    )];
  }

  return LINUX_BROWSER_EXECUTABLE_CANDIDATES;
}

function getPlatformBrowserCommandCandidates(platform = process.platform) {
  return normalizePlatform(platform) === "win32"
    ? WINDOWS_BROWSER_COMMAND_CANDIDATES
    : DEFAULT_BROWSER_COMMAND_CANDIDATES;
}

function resolveBrowserExecutableFromCandidates(candidates, {
  env = process.env,
  existsImpl = fs.existsSync,
  platform = process.platform,
  resolveCommandImpl = (candidate, context) => resolveCommandFromPath(candidate, context),
} = {}) {
  for (const candidate of candidates) {
    if (!candidate) continue;

    if (isPathLikeCommand(candidate)) {
      if (existsImpl(candidate)) {
        return candidate;
      }
      continue;
    }

    const resolvedCandidate = resolveCommandImpl(candidate, { env, existsImpl, platform });
    if (resolvedCandidate) {
      return resolvedCandidate;
    }
  }

  return "";
}

function isLikelyMinibiaDesktopEntry({
  desktopEntryPath,
  name,
  comment,
  startupWmClass,
} = {}) {
  const haystacks = [
    name,
    comment,
    startupWmClass,
    path.basename(String(desktopEntryPath || "")),
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return haystacks.some((value) => value.includes("minibia"));
}

function buildDisableFeaturesArg(features) {
  return `--disable-features=${features.join(",")}`;
}

function mergeDisableFeaturesArg(args, requiredFeatures) {
  const nextArgs = [...args];
  const disableIndex = nextArgs.findIndex((arg) => arg.startsWith("--disable-features="));

  if (disableIndex < 0) {
    nextArgs.push(buildDisableFeaturesArg(requiredFeatures));
    return nextArgs;
  }

  const existingFeatures = new Set(
    String(nextArgs[disableIndex] || "")
      .slice("--disable-features=".length)
      .split(",")
      .map((feature) => String(feature || "").trim())
      .filter(Boolean),
  );

  for (const feature of requiredFeatures) {
    existingFeatures.add(feature);
  }

  nextArgs[disableIndex] = buildDisableFeaturesArg([...existingFeatures]);
  return nextArgs;
}

function isEnabledEnvValue(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function shouldKeepManagedBrowserFullyActive(env = process.env) {
  return isEnabledEnvValue(env.MINIBOT_KEEP_BROWSER_BACKGROUND_ACTIVE);
}

function mergeBackgroundSafeArgs(args, { includeNewWindow = true, env = process.env } = {}) {
  let nextArgs = [...args];
  const requiredFlags = [
    ...BACKGROUND_SAFE_BROWSER_FLAGS,
    ...(shouldKeepManagedBrowserFullyActive(env) ? KEEP_ACTIVE_BROWSER_FLAGS : []),
  ].filter((flag) => includeNewWindow || flag !== "--new-window");

  for (const flag of requiredFlags) {
    if (flag.startsWith("--disable-features=")) {
      nextArgs = mergeDisableFeaturesArg(nextArgs, BACKGROUND_SAFE_BROWSER_FEATURES);
      continue;
    }

    if (!nextArgs.includes(flag)) {
      nextArgs.push(flag);
    }
  }

  for (const flag of MANAGED_BROWSER_HYGIENE_FLAGS) {
    if (!nextArgs.includes(flag)) {
      nextArgs.push(flag);
    }
  }

  return nextArgs;
}

class BrowserDebuggerConnection {
  constructor(wsUrl, { commandTimeoutMs = MANAGED_BROWSER_CDP_COMMAND_TIMEOUT_MS } = {}) {
    this.wsUrl = wsUrl;
    this.commandTimeoutMs = Math.max(1, Math.trunc(Number(commandTimeoutMs) || MANAGED_BROWSER_CDP_COMMAND_TIMEOUT_MS));
    this.ws = null;
    this.nextId = 0;
    this.pending = new Map();
  }

  isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  rejectPending(error) {
    const normalizedError = asError(error, "CDP socket closed");

    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(normalizedError);
    }

    this.pending.clear();
    return normalizedError;
  }

  invalidate(error = new Error("CDP socket closed")) {
    const normalizedError = asError(error, "CDP socket closed");
    const ws = this.ws;
    this.ws = null;

    if (ws) {
      ws.onopen = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.onclose = null;

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {}
      }
    }

    this.rejectPending(normalizedError);
    return normalizedError;
  }

  async connect() {
    if (this.isOpen()) {
      return;
    }

    if (this.ws) {
      this.invalidate(new Error("CDP socket reset"));
    }

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let settled = false;

      this.ws = ws;

      ws.onopen = () => {
        settled = true;
        resolve();
      };
      ws.onerror = (event) => {
        const error = asError(event?.error || event, "CDP socket error");
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (!message.id) return;

        const pending = this.pending.get(message.id);
        if (!pending) return;

        this.pending.delete(message.id);
        clearTimeout(pending.timeoutId);

        if (message.error) {
          pending.reject(new Error(message.error.message || "CDP error"));
          return;
        }

        pending.resolve(message.result);
      };
      ws.onclose = () => {
        const error = new Error("CDP socket closed");
        if (this.ws === ws) {
          this.ws = null;
        }
        this.rejectPending(error);
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
    });
  }

  async send(method, params = {}, { timeoutMs = this.commandTimeoutMs } = {}) {
    if (!this.isOpen()) {
      throw new Error("CDP socket is not open.");
    }

    const id = ++this.nextId;
    const normalizedTimeoutMs = Math.max(1, Math.trunc(Number(timeoutMs) || this.commandTimeoutMs));

    return new Promise((resolve, reject) => {
      const pending = {
        timeoutId: null,
        resolve,
        reject,
      };

      const timeoutId = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.invalidate(new Error(`CDP ${method} timed out after ${normalizedTimeoutMs}ms.`));
      }, normalizedTimeoutMs);

      pending.timeoutId = timeoutId;
      this.pending.set(id, pending);

      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        this.invalidate(error);
      }
    });
  }

  close() {
    this.invalidate(new Error("CDP socket closed"));
  }
}

function buildManagedBrowserDiscoveryTarget({ pageUrlPrefix, port } = {}) {
  const normalizedUrl = String(pageUrlPrefix || "").trim();
  const normalizedPort = Math.max(1, Math.trunc(Number(port) || 0));
  const targetLabel = normalizedUrl
    ? `a page starting with ${normalizedUrl}`
    : "a Minibia page";

  return {
    targetLabel,
    portLabel: normalizedPort > 0 ? normalizedPort : "the configured",
  };
}

function buildManagedBrowserTimeoutErrorMessage({ timeoutMs, pageUrlPrefix, port } = {}) {
  const { targetLabel, portLabel } = buildManagedBrowserDiscoveryTarget({ pageUrlPrefix, port });
  return `Managed browser launched, but ${targetLabel} did not appear on DevTools port ${portLabel} within ${Math.ceil(timeoutMs / 1000)}s.`;
}

function buildManagedBrowserExitErrorMessage({ code, signal, pageUrlPrefix, port } = {}) {
  const { targetLabel, portLabel } = buildManagedBrowserDiscoveryTarget({ pageUrlPrefix, port });
  const exitLabel = signal
    ? `signal ${signal}`
    : `exit code ${Number.isInteger(code) ? code : 0}`;
  return `Managed browser exited before ${targetLabel} appeared on DevTools port ${portLabel} (${exitLabel}).`;
}

export function resolveBrowserExecutable({
  existsImpl = fs.existsSync,
  env = process.env,
  platform = process.platform,
  resolveCommandImpl = (candidate, context) => resolveCommandFromPath(candidate, context),
} = {}) {
  const candidates = [
    ...getBrowserEnvCandidates(env),
    ...getPlatformBrowserExecutableCandidates({ env, platform }),
    ...getPlatformBrowserCommandCandidates(platform),
  ];

  return resolveBrowserExecutableFromCandidates(candidates, {
    env,
    existsImpl,
    platform,
    resolveCommandImpl,
  });
}

export function resolveManagedBrowserCommand({
  env = process.env,
  existsImpl = fs.existsSync,
  platform = process.platform,
  resolveCommandImpl = (candidate, context) => resolveCommandFromPath(candidate, context),
  readDirImpl = fs.readdirSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const launchTarget = resolveManagedBrowserLaunchTarget({
    env,
    existsImpl,
    platform,
    resolveCommandImpl,
    readDirImpl,
    readFileImpl,
  });

  return String(launchTarget?.command || "");
}

function resolveManagedBrowserLaunchTarget({
  env = process.env,
  existsImpl = fs.existsSync,
  platform = process.platform,
  resolveCommandImpl = (candidate, context) => resolveCommandFromPath(candidate, context),
  readDirImpl = fs.readdirSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const explicitBrowserPath = resolveBrowserExecutableFromCandidates(getExplicitBrowserEnvCandidates(env), {
    env,
    existsImpl,
    platform,
    resolveCommandImpl,
  });

  if (explicitBrowserPath) {
    return {
      kind: "browser",
      command: explicitBrowserPath,
      args: [],
    };
  }

  const appLauncher = resolveManagedBrowserAppLauncher({
    env,
    existsImpl,
    platform,
    readDirImpl,
    readFileImpl,
  });
  const launcherCommand = String(appLauncher?.command || "").trim();

  if (launcherCommand) {
    if (isPathLikeCommand(launcherCommand)) {
      if (existsImpl(launcherCommand)) {
        return {
          kind: "app",
          command: launcherCommand,
          args: appLauncher.args || [],
          launcher: appLauncher,
        };
      }
    } else {
      return {
        kind: "app",
        command: resolveCommandImpl(launcherCommand, { env, existsImpl, platform }) || launcherCommand,
        args: appLauncher.args || [],
        launcher: appLauncher,
      };
    }
  }

  const browserPath = resolveBrowserExecutable({
    env,
    existsImpl,
    platform,
    resolveCommandImpl,
  });

  if (!browserPath) {
    return null;
  }

  return {
    kind: "browser",
    command: browserPath,
    args: [],
  };
}

export function resolveManagedBrowserLaunchSpec({
  userDataDir,
  port,
  pageUrlPrefix,
  env = process.env,
  existsImpl = fs.existsSync,
  platform = process.platform,
  resolveCommandImpl = (candidate, context) => resolveCommandFromPath(candidate, context),
  readDirImpl = fs.readdirSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const launchTarget = resolveManagedBrowserLaunchTarget({
    env,
    existsImpl,
    platform,
    resolveCommandImpl,
    readDirImpl,
    readFileImpl,
  });

  if (!launchTarget) {
    return null;
  }

  if (launchTarget.kind === "app") {
    return buildManagedBrowserAppLaunchSpec({
      command: launchTarget.command,
      args: launchTarget.args,
      port,
      env,
    });
  }

  return buildManagedBrowserLaunchSpec({
    browserPath: launchTarget.command,
    userDataDir,
    port,
    pageUrlPrefix,
    env,
  });
}

export function buildManagedBrowserLaunchSpec({
  browserPath,
  userDataDir,
  port,
  pageUrlPrefix,
  openAsApp = false,
  env = process.env,
  profileDirectory = "Default",
  existsImpl = fs.existsSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const resolvedBrowserPath = String(browserPath || "").trim();
  const resolvedUserDataDir = String(userDataDir || "").trim();
  const resolvedPort = Math.max(1, Math.trunc(Number(port) || 0));
  const targetUrl = String(pageUrlPrefix || "").trim();

  if (!resolvedBrowserPath) {
    throw new Error("Browser executable is required.");
  }

  if (!resolvedUserDataDir) {
    throw new Error("Browser user-data directory is required.");
  }

  if (!targetUrl) {
    throw new Error("A Minibia page URL is required.");
  }

  const args = mergeBackgroundSafeArgs([
    `--user-data-dir=${resolvedUserDataDir}`,
    `--remote-debugging-port=${resolvedPort}`,
    "--no-first-run",
    "--no-default-browser-check",
  ], { env }).filter((arg) => !(openAsApp === true && arg === "--new-window"));

  const savedWindowSize = resolveChromiumWindowSizeArg({
    userDataDir: resolvedUserDataDir,
    profileDirectory,
    appUrl: openAsApp === true ? targetUrl : "",
    existsImpl,
    readFileImpl,
  });
  if (savedWindowSize) {
    args.push(`--window-size=${savedWindowSize}`);
  }

  args.push(openAsApp === true ? `--app=${targetUrl}` : targetUrl);

  return {
    command: resolvedBrowserPath,
    args,
    options: {
      detached: true,
      env: buildManagedBrowserLaunchEnv(env),
      stdio: "ignore",
    },
  };
}

function buildManagedBrowserLaunchEnv(env = process.env) {
  const nextEnv = { ...env };
  delete nextEnv.CHROME_DESKTOP;
  return nextEnv;
}

export function resolveManagedBrowserAppLauncher({
  env = process.env,
  existsImpl = fs.existsSync,
  platform = process.platform,
  readDirImpl = fs.readdirSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  if (normalizePlatform(platform) !== "linux") {
    return null;
  }

  const explicitDesktopFile = String(
    env.MINIBOT_BROWSER_APP_DESKTOP_FILE
    || env.MINIBOT_MINIBIA_APP_DESKTOP_FILE
    || "",
  ).trim();

  const desktopEntryPaths = [];

  if (explicitDesktopFile) {
    desktopEntryPaths.push(explicitDesktopFile);
  } else {
    for (const directory of listDesktopEntrySearchDirs(env)) {
      if (!existsImpl(directory)) {
        continue;
      }

      for (const entryName of readDirImpl(directory)) {
        const normalizedName = String(entryName || "").trim();
        if (!normalizedName.endsWith(".desktop")) {
          continue;
        }

        desktopEntryPaths.push(path.join(directory, normalizedName));
      }
    }
  }

  for (const desktopEntryPath of desktopEntryPaths) {
    if (!existsImpl(desktopEntryPath)) {
      continue;
    }

    const desktopEntry = String(readFileImpl(desktopEntryPath) || "");
    const name = parseDesktopEntryField(desktopEntry, "Name");
    const comment = parseDesktopEntryField(desktopEntry, "Comment");
    const execLine = parseDesktopEntryField(desktopEntry, "Exec");
    const startupWmClass = parseDesktopEntryField(desktopEntry, "StartupWMClass");
    if (!execLine || !execLine.includes("--app-id=")) {
      continue;
    }

    if (!explicitDesktopFile && !isLikelyMinibiaDesktopEntry({
      desktopEntryPath,
      name,
      comment,
      startupWmClass,
    })) {
      continue;
    }

    const parsedExec = parseDesktopEntryExec(execLine);
    if (!parsedExec) {
      continue;
    }

    return {
      path: desktopEntryPath,
      name: String(name || "").trim() || "Minibia",
      command: parsedExec.command,
      args: parsedExec.args,
      startupWmClass,
    };
  }

  return null;
}

export function buildManagedBrowserAppLaunchSpec({
  command,
  args = [],
  port,
  env = process.env,
  existsImpl = fs.existsSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const resolvedCommand = String(command || "").trim();
  const resolvedPort = Math.max(1, Math.trunc(Number(port) || 0));
  let resolvedArgs = Array.isArray(args)
    ? args.map((arg) => String(arg || "").trim()).filter(Boolean)
    : [];

  if (!resolvedCommand) {
    throw new Error("App launcher command is required.");
  }

  if (resolvedPort <= 0) {
    throw new Error("A DevTools port is required.");
  }

  const savedWindowSize = resolveChromiumWindowSizeArg({
    userDataDir: extractCommandArgValue(resolvedArgs, "--user-data-dir="),
    profileDirectory: extractCommandArgValue(resolvedArgs, "--profile-directory=") || "Default",
    appId: extractCommandArgValue(resolvedArgs, "--app-id="),
    existsImpl,
    readFileImpl,
  });
  if (savedWindowSize) {
    resolvedArgs = replaceCommandArgValue(resolvedArgs, "--window-size=", savedWindowSize);
  }

  const nextArgs = mergeBackgroundSafeArgs(
    resolvedArgs.filter((arg) => !arg.startsWith("--remote-debugging-port=")),
    { env },
  );

  nextArgs.push(`--remote-debugging-port=${resolvedPort}`);

  if (!nextArgs.includes("--no-first-run")) {
    nextArgs.push("--no-first-run");
  }

  if (!nextArgs.includes("--no-default-browser-check")) {
    nextArgs.push("--no-default-browser-check");
  }

  return {
    command: resolvedCommand,
    args: nextArgs,
    options: {
      detached: true,
      env: buildManagedBrowserLaunchEnv(env),
      stdio: "ignore",
    },
  };
}

async function fetchJson(url, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch implementation is required.");
  }

  const response = await fetchImpl(url);
  if (!response?.ok) {
    throw new Error(`HTTP ${response?.status ?? 0} from ${url}`);
  }

  return response.json();
}

export async function openManagedBrowserTarget({
  port,
  pageUrl,
  newWindow = true,
  fetchImpl = globalThis.fetch,
  createConnectionImpl = (wsUrl, options) => new BrowserDebuggerConnection(wsUrl, options),
  commandTimeoutMs = MANAGED_BROWSER_CDP_COMMAND_TIMEOUT_MS,
} = {}) {
  const normalizedPageUrl = String(pageUrl || "").trim();
  const normalizedPort = Math.max(1, Math.trunc(Number(port) || 0));

  if (!normalizedPageUrl) {
    throw new Error("A Minibia page URL is required.");
  }

  if (normalizedPort <= 0) {
    throw new Error("A DevTools port is required.");
  }

  let browserInfo = null;
  try {
    browserInfo = await fetchJson(`http://127.0.0.1:${normalizedPort}/json/version`, { fetchImpl });
  } catch {
    return "";
  }

  const wsUrl = String(browserInfo?.webSocketDebuggerUrl || "").trim();
  if (!wsUrl) {
    return "";
  }

  const connection = createConnectionImpl(wsUrl, { commandTimeoutMs });

  try {
    await connection.connect();
    const result = await connection.send("Target.createTarget", {
      url: normalizedPageUrl,
      newWindow: newWindow === true,
    });
    const targetId = String(result?.targetId || "").trim();
    if (!targetId) {
      throw new Error("Chrome DevTools did not return a target id for the new session.");
    }
    return targetId;
  } finally {
    connection.close?.();
  }
}

export async function setManagedBrowserWindowBounds({
  port,
  targetId,
  bounds,
  fetchImpl = globalThis.fetch,
  createConnectionImpl = (wsUrl, options) => new BrowserDebuggerConnection(wsUrl, options),
  commandTimeoutMs = MANAGED_BROWSER_CDP_COMMAND_TIMEOUT_MS,
} = {}) {
  const normalizedPort = Math.max(1, Math.trunc(Number(port) || 0));
  const normalizedTargetId = String(targetId || "").trim();
  const normalizedBounds = normalizeWindowPlacementBounds(bounds);

  if (normalizedPort <= 0) {
    throw new Error("A DevTools port is required.");
  }

  if (!normalizedTargetId) {
    throw new Error("A DevTools target id is required.");
  }

  if (!normalizedBounds) {
    throw new Error("Valid window bounds are required.");
  }

  let browserInfo = null;
  try {
    browserInfo = await fetchJson(`http://127.0.0.1:${normalizedPort}/json/version`, { fetchImpl });
  } catch {
    return false;
  }

  const wsUrl = String(browserInfo?.webSocketDebuggerUrl || "").trim();
  if (!wsUrl) {
    return false;
  }

  const connection = createConnectionImpl(wsUrl, { commandTimeoutMs });

  try {
    await connection.connect();
    const { windowId } = await connection.send("Browser.getWindowForTarget", {
      targetId: normalizedTargetId,
    });
    await connection.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        left: normalizedBounds.left,
        top: normalizedBounds.top,
        width: normalizedBounds.width,
        height: normalizedBounds.height,
        windowState: normalizedBounds.maximized ? "maximized" : "normal",
      },
    });
    return true;
  } finally {
    connection.close?.();
  }
}

export async function getManagedBrowserWindowBounds({
  port,
  targetId,
  fetchImpl = globalThis.fetch,
  createConnectionImpl = (wsUrl, options) => new BrowserDebuggerConnection(wsUrl, options),
  commandTimeoutMs = MANAGED_BROWSER_CDP_COMMAND_TIMEOUT_MS,
} = {}) {
  const normalizedPort = Math.max(1, Math.trunc(Number(port) || 0));
  const normalizedTargetId = String(targetId || "").trim();

  if (normalizedPort <= 0) {
    throw new Error("A DevTools port is required.");
  }

  if (!normalizedTargetId) {
    throw new Error("A DevTools target id is required.");
  }

  let browserInfo = null;
  try {
    browserInfo = await fetchJson(`http://127.0.0.1:${normalizedPort}/json/version`, { fetchImpl });
  } catch {
    return null;
  }

  const wsUrl = String(browserInfo?.webSocketDebuggerUrl || "").trim();
  if (!wsUrl) {
    return null;
  }

  const connection = createConnectionImpl(wsUrl, { commandTimeoutMs });

  try {
    await connection.connect();
    const result = await connection.send("Browser.getWindowForTarget", {
      targetId: normalizedTargetId,
    });
    return normalizeWindowPlacementBounds({
      left: result?.bounds?.left,
      top: result?.bounds?.top,
      right: Number(result?.bounds?.left) + Number(result?.bounds?.width),
      bottom: Number(result?.bounds?.top) + Number(result?.bounds?.height),
      maximized: result?.bounds?.windowState === "maximized",
    });
  } finally {
    connection.close?.();
  }
}

export async function waitForManagedBrowserSession({
  childProcess = null,
  previousSessionIds = new Set(),
  syncInstances,
  listSessionIds,
  expectedSessionId = "",
  ignoreExitCodeZero = false,
  timeoutMs = MANAGED_BROWSER_DISCOVERY_TIMEOUT_MS,
  pollMs = MANAGED_BROWSER_DISCOVERY_POLL_MS,
  sleepImpl = wait,
  nowImpl = () => Date.now(),
  pageUrlPrefix = "",
  port = 0,
} = {}) {
  if (typeof syncInstances !== "function") {
    throw new Error("syncInstances is required.");
  }

  if (typeof listSessionIds !== "function") {
    throw new Error("listSessionIds is required.");
  }

  const normalizedTimeoutMs = Math.max(1, Math.trunc(Number(timeoutMs) || MANAGED_BROWSER_DISCOVERY_TIMEOUT_MS));
  const normalizedPollMs = Math.max(0, Math.trunc(Number(pollMs) || MANAGED_BROWSER_DISCOVERY_POLL_MS));
  const normalizedExpectedSessionId = String(expectedSessionId || "").trim();
  const shouldIgnoreExitCodeZero = ignoreExitCodeZero === true;
  const seenSessionIds = new Set(
    Array.from(previousSessionIds || [], (sessionId) => String(sessionId)),
  );

  let launchError = null;
  let launchExit = null;
  let syncError = null;

  const handleLaunchError = (error) => {
    const message = error instanceof Error
      ? error.message
      : String(error || "Unknown browser launch error.");
    launchError = new Error(`Unable to launch managed browser: ${message}`);
  };

  const handleLaunchExit = (code, signal) => {
    launchExit = { code, signal };
  };

  if (childProcess?.once) {
    childProcess.once("error", handleLaunchError);
    childProcess.once("exit", handleLaunchExit);
  }

  const shouldTreatLaunchExitAsError = () => {
    if (!launchExit) {
      return false;
    }

    if (shouldIgnoreExitCodeZero && !launchExit.signal && launchExit.code === 0) {
      return false;
    }

    return true;
  };

  const deadline = nowImpl() + normalizedTimeoutMs;

  try {
    while (true) {
      if (launchError) {
        throw launchError;
      }

      if (shouldTreatLaunchExitAsError()) {
        throw new Error(buildManagedBrowserExitErrorMessage({
          code: launchExit.code,
          signal: launchExit.signal,
          pageUrlPrefix,
          port,
        }));
      }

      try {
        await syncInstances();
        syncError = null;
      } catch (error) {
        syncError = error instanceof Error ? error : new Error(String(error || "Unknown session sync error."));
      }

      const discoveredSessionIds = Array.from(listSessionIds(), (sessionId) => String(sessionId));

      if (normalizedExpectedSessionId && discoveredSessionIds.includes(normalizedExpectedSessionId)) {
        return normalizedExpectedSessionId;
      }

      if (!normalizedExpectedSessionId) {
        const nextSessionId = discoveredSessionIds.find((sessionId) => !seenSessionIds.has(sessionId));
        if (nextSessionId) {
          return nextSessionId;
        }
      }

      if (nowImpl() >= deadline) {
        break;
      }

      await sleepImpl(normalizedPollMs);
    }

    if (launchError) {
      throw launchError;
    }

    if (shouldTreatLaunchExitAsError()) {
      throw new Error(buildManagedBrowserExitErrorMessage({
        code: launchExit.code,
        signal: launchExit.signal,
        pageUrlPrefix,
        port,
      }));
    }

    if (syncError && nowImpl() >= deadline) {
      throw syncError;
    }

    throw new Error(buildManagedBrowserTimeoutErrorMessage({
      timeoutMs: normalizedTimeoutMs,
      pageUrlPrefix,
      port,
    }));
  } finally {
    if (childProcess?.removeListener) {
      childProcess.removeListener("error", handleLaunchError);
      childProcess.removeListener("exit", handleLaunchExit);
    }
  }
}
