import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const APP_NAME = "Minibot";
export const APP_COMMENT = "Local desktop control panel for the live Minibia client.";
export const LINUX_DESKTOP_ENTRY_NAME = "minibot.desktop";
export const APP_LAUNCHER_RELATIVE_PATH = path.join("scripts", "launch-minibot.sh");

const APP_ICON_CANDIDATE_RELATIVE_PATHS = [
  path.join("desktop", "assets", "favicon.png"),
  path.join("desktop", "assets", "icon.png"),
  path.join("desktop", "assets", "icon.ico"),
];

function quoteDesktopExecArg(value) {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"")
    .replaceAll("$", "\\$")
    .replaceAll("`", "\\`")}"`;
}

function resolveIconPath(baseDir, candidates, { existsImpl = fs.existsSync } = {}) {
  return candidates
    .map((candidate) => path.join(baseDir, candidate))
    .find((candidate) => existsImpl(candidate)) || null;
}

export function resolveAppIconPath(baseDir, { existsImpl = fs.existsSync } = {}) {
  return resolveIconPath(baseDir, APP_ICON_CANDIDATE_RELATIVE_PATHS, { existsImpl });
}

function trimShellQuotedValue(value = "") {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function expandHomeDir(candidate = "", homeDir = os.homedir()) {
  const normalized = trimShellQuotedValue(candidate)
    .replaceAll("${HOME}", homeDir)
    .replaceAll("$HOME", homeDir);
  if (!normalized) {
    return "";
  }
  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.join(homeDir, normalized);
}

export function resolveLinuxDesktopEntryPath({
  env = process.env,
  homeDir = os.homedir(),
  desktopEntryName = LINUX_DESKTOP_ENTRY_NAME,
} = {}) {
  const dataHome = env.XDG_DATA_HOME?.trim() || path.join(homeDir, ".local", "share");
  return path.join(dataHome, "applications", desktopEntryName);
}

export function resolveLinuxDesktopDir({
  env = process.env,
  homeDir = os.homedir(),
  existsImpl = fs.existsSync,
  readFileImpl = fs.readFileSync,
} = {}) {
  const envDesktopDir = expandHomeDir(env.XDG_DESKTOP_DIR || "", homeDir);
  if (envDesktopDir) {
    return envDesktopDir;
  }

  const configHome = env.XDG_CONFIG_HOME?.trim() || path.join(homeDir, ".config");
  const userDirsPath = path.join(configHome, "user-dirs.dirs");
  if (existsImpl(userDirsPath)) {
    try {
      const userDirs = String(readFileImpl(userDirsPath, "utf8") || "");
      const match = userDirs.match(/^\s*XDG_DESKTOP_DIR\s*=\s*(.+?)\s*$/m);
      const desktopDir = expandHomeDir(match?.[1] || "", homeDir);
      if (desktopDir) {
        return desktopDir;
      }
    } catch {}
  }

  return path.join(homeDir, "Desktop");
}

export function resolveLinuxDesktopShortcutPath({
  env = process.env,
  homeDir = os.homedir(),
  desktopEntryName = LINUX_DESKTOP_ENTRY_NAME,
  existsImpl = fs.existsSync,
  readFileImpl = fs.readFileSync,
} = {}) {
  return path.join(
    resolveLinuxDesktopDir({
      env,
      homeDir,
      existsImpl,
      readFileImpl,
    }),
    desktopEntryName,
  );
}

export function buildLinuxLaunchEnv(
  env = process.env,
  platform = process.platform,
  desktopEntryName = LINUX_DESKTOP_ENTRY_NAME,
) {
  if (platform !== "linux" || env.CHROME_DESKTOP) {
    return env;
  }

  return {
    ...env,
    CHROME_DESKTOP: desktopEntryName,
  };
}

function buildLinuxDesktopEntryTemplate({
  baseDir,
  launchScriptPath,
  iconPath = resolveAppIconPath(baseDir),
  appName,
  comment,
  startupWmClass = appName,
  categories = ["Game", "Utility"],
} = {}) {
  const normalizedCategories = Array.isArray(categories)
    ? categories.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  return [
    "[Desktop Entry]",
    "Version=1.0",
    "Type=Application",
    `Name=${appName}`,
    `Comment=${comment}`,
    `Exec=${quoteDesktopExecArg(launchScriptPath)} %U`,
    `TryExec=${launchScriptPath}`,
    `Path=${baseDir}`,
    ...(iconPath ? [`Icon=${iconPath}`] : []),
    "Terminal=false",
    "StartupNotify=true",
    ...(normalizedCategories.length > 0
      ? [`Categories=${normalizedCategories.join(";")};`]
      : []),
    `StartupWMClass=${startupWmClass}`,
    `X-GNOME-WMClass=${startupWmClass}`,
    "",
  ].join("\n");
}

export function buildLinuxDesktopEntry({
  baseDir,
  launchScriptPath = path.join(baseDir, APP_LAUNCHER_RELATIVE_PATH),
  iconPath = resolveAppIconPath(baseDir),
  appName = APP_NAME,
  comment = APP_COMMENT,
  startupWmClass = appName,
  categories = ["Game", "Utility"],
} = {}) {
  return buildLinuxDesktopEntryTemplate({
    baseDir,
    launchScriptPath,
    iconPath,
    appName,
    comment,
    startupWmClass,
    categories,
  });
}

function ensureLinuxDesktopEntryFile({
  baseDir,
  desktopEntryName,
  buildDesktopEntryImpl,
  resolveIconPathImpl = resolveAppIconPath,
  launchScriptPath,
  platform = process.platform,
  env = process.env,
  homeDir = os.homedir(),
  existsImpl = fs.existsSync,
  mkdirImpl = fs.mkdirSync,
  readFileImpl = fs.readFileSync,
  writeFileImpl = fs.writeFileSync,
} = {}) {
  if (platform !== "linux") {
    return null;
  }

  if (!existsImpl(launchScriptPath)) {
    return null;
  }

  const iconPath = resolveIconPathImpl(baseDir, { existsImpl });
  const desktopEntryPath = resolveLinuxDesktopEntryPath({
    env,
    homeDir,
    desktopEntryName,
  });
  const nextContents = buildDesktopEntryImpl({
    baseDir,
    launchScriptPath,
    iconPath,
  });

  let currentContents = null;
  if (existsImpl(desktopEntryPath)) {
    try {
      currentContents = readFileImpl(desktopEntryPath, "utf8");
    } catch {}
  }

  if (currentContents !== nextContents) {
    mkdirImpl(path.dirname(desktopEntryPath), { recursive: true });
    writeFileImpl(desktopEntryPath, nextContents, "utf8");
  }

  return desktopEntryPath;
}

export function ensureLinuxDesktopEntry({
  baseDir,
  launchScriptPath = path.join(baseDir, APP_LAUNCHER_RELATIVE_PATH),
  platform = process.platform,
  env = process.env,
  homeDir = os.homedir(),
  existsImpl = fs.existsSync,
  mkdirImpl = fs.mkdirSync,
  readFileImpl = fs.readFileSync,
  writeFileImpl = fs.writeFileSync,
} = {}) {
  return ensureLinuxDesktopEntryFile({
    baseDir,
    desktopEntryName: LINUX_DESKTOP_ENTRY_NAME,
    buildDesktopEntryImpl: buildLinuxDesktopEntry,
    resolveIconPathImpl: resolveAppIconPath,
    launchScriptPath,
    platform,
    env,
    homeDir,
    existsImpl,
    mkdirImpl,
    readFileImpl,
    writeFileImpl,
  });
}

export function ensureLinuxDesktopShortcut({
  desktopEntryPath,
  platform = process.platform,
  env = process.env,
  homeDir = os.homedir(),
  enabled = false,
  desktopEntryName = LINUX_DESKTOP_ENTRY_NAME,
  existsImpl = fs.existsSync,
  mkdirImpl = fs.mkdirSync,
  readFileImpl = fs.readFileSync,
  writeFileImpl = fs.writeFileSync,
  chmodImpl = fs.chmodSync,
} = {}) {
  if (
    platform !== "linux"
    || !enabled
    || !desktopEntryPath
    || !existsImpl(desktopEntryPath)
  ) {
    return null;
  }

  const shortcutPath = resolveLinuxDesktopShortcutPath({
    env,
    homeDir,
    desktopEntryName,
    existsImpl,
    readFileImpl,
  });
  const nextContents = readFileImpl(desktopEntryPath, "utf8");

  let currentContents = null;
  if (existsImpl(shortcutPath)) {
    try {
      currentContents = readFileImpl(shortcutPath, "utf8");
    } catch {}
  }

  if (currentContents !== nextContents) {
    mkdirImpl(path.dirname(shortcutPath), { recursive: true });
    writeFileImpl(shortcutPath, nextContents, "utf8");
  }

  try {
    chmodImpl(shortcutPath, 0o755);
  } catch {}

  return shortcutPath;
}
