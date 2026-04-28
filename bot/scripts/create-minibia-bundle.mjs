#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolveManagedBrowserAppLauncher } from "../lib/browser-session.mjs";
import {
  BROWSER_PROFILE_COPY_EXCLUDED_BASENAMES,
  matchesBrowserProfileExcludedName,
  shouldCopyBrowserProfilePath,
} from "../lib/browser-profile-privacy.mjs";
import { resolveRuntimeLayout } from "../lib/runtime-layout.mjs";

const APP_BASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT_DIR = path.join(path.dirname(APP_BASE_DIR), "minibia");
const CLIENT_META_FILE_NAME = "client-meta.json";
const PORTABLE_CLIENT_LAUNCH_MODE = "app-url";
const PORTABLE_CLIENT_PAGE_URL = "https://minibia.com/play?pwa=1";
const REMOVABLE_PROFILE_LOCK_PATHS = Object.freeze([
  "SingletonCookie",
  "SingletonLock",
  "SingletonSocket",
  "DevToolsActivePort",
  path.join("Default", "LOCK"),
]);
const COPY_EXCLUDED_BASENAMES = new Set([
  ".git",
  "artifacts",
  "dist",
  "node_modules",
]);
const BOT_REPO_COPY_EXCLUDED_RELATIVE_PATHS = Object.freeze([
  "storage/runtime",
  "storage/home/.config/Minibot",
  "storage/home/.config/minibot/accounts",
  "storage/home/.config/minibot/claims",
  "storage/home/.config/minibot/route-spacing",
  "storage/home/.config/minibot/session-state.json",
]);
const TRANSIENT_CHARACTER_CONFIG_BASENAME_PATTERN = /^page-[a-f0-9]{16,}\.json$/i;
export const ELECTRON_USER_DATA_COPY_EXCLUDED_BASENAMES = Object.freeze([
  ...new Set([
    ...BROWSER_PROFILE_COPY_EXCLUDED_BASENAMES,
    "Local Storage",
    "chrome-profile",
    "managed-chrome-profile",
    "managed-chrome-profile-runtime",
  ]),
]);

export function resolveBundleSourceLayout({
  appBaseDir = APP_BASE_DIR,
  env = process.env,
  existsImpl = fs.existsSync,
  homeDir = os.homedir(),
} = {}) {
  const runtimeLayout = resolveRuntimeLayout({
    baseDir: appBaseDir,
    env,
    existsImpl,
  });
  const fallbackElectronUserDataDir = path.join(homeDir, ".config", "Minibot");
  const electronUserDataDir = runtimeLayout.electronUserDataDir || fallbackElectronUserDataDir;

  return {
    portable: runtimeLayout.portable,
    runtimeLayout,
    botConfigDir: runtimeLayout.configDir || path.join(homeDir, ".config", "minibot"),
    routeProfileDir: runtimeLayout.routeProfileDir || path.join(homeDir, "Minibot", "cavebots"),
    electronUserDataDir,
    clientProfileDir: runtimeLayout.portableClientSeedUserDataDir || path.join(electronUserDataDir, "chrome-profile"),
  };
}

const DEFAULT_SOURCE_LAYOUT = resolveBundleSourceLayout();
const DEFAULT_ELECTRON_USER_DATA_DIR = DEFAULT_SOURCE_LAYOUT.electronUserDataDir;
const DEFAULT_BOT_CONFIG_DIR = DEFAULT_SOURCE_LAYOUT.botConfigDir;
const DEFAULT_ROUTE_PROFILE_DIR = DEFAULT_SOURCE_LAYOUT.routeProfileDir;
const DEFAULT_CLIENT_PROFILE_DIR = DEFAULT_SOURCE_LAYOUT.clientProfileDir;

function getRelativePathSegments(sourcePath, rootPath) {
  const normalizedSourcePath = path.resolve(String(sourcePath || ""));
  const normalizedRootPath = path.resolve(String(rootPath || ""));
  if (!normalizedRootPath || normalizedSourcePath === normalizedRootPath) {
    return [];
  }

  const relativePath = path.relative(normalizedRootPath, normalizedSourcePath);
  if (!relativePath || relativePath === "." || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return [];
  }

  return relativePath.split(path.sep).filter(Boolean);
}

function parseArgv(argv = []) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = String(argv[index] || "");
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue != null) {
      flags[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || String(next).startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return {
    flags,
    positionals,
  };
}

function extractFlagValue(args = [], prefix = "") {
  const normalizedPrefix = String(prefix || "");
  for (const candidate of Array.isArray(args) ? args : []) {
    const normalizedCandidate = String(candidate || "").trim();
    if (!normalizedCandidate.startsWith(normalizedPrefix)) {
      continue;
    }
    return normalizedCandidate.slice(normalizedPrefix.length);
  }
  return "";
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removePath(targetPath) {
  await fsp.rm(targetPath, {
    recursive: true,
    force: true,
  }).catch(() => {});
}

async function copyDirectory(sourcePath, targetPath, {
  filter = null,
} = {}) {
  if (!(await pathExists(sourcePath))) {
    return false;
  }

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: filter || undefined,
  });
  return true;
}

export function shouldCopyPortableElectronUserDataPath(sourcePath, userDataRoot, {
  excludedBasenames = ELECTRON_USER_DATA_COPY_EXCLUDED_BASENAMES,
} = {}) {
  const segments = getRelativePathSegments(sourcePath, userDataRoot);
  if (!segments.length) {
    return true;
  }

  const excludedNameSet = new Set(
    (Array.isArray(excludedBasenames) ? excludedBasenames : [...excludedBasenames])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  const firstSegment = segments[0] || "";
  if (excludedNameSet.has(firstSegment) || firstSegment.startsWith("managed-chrome-profile.")) {
    return false;
  }

  return !matchesBrowserProfileExcludedName(firstSegment, {
    excludedBasenames: excludedNameSet,
  });
}

export function shouldCopyPortableBotConfigPath(sourcePath, configRoot = DEFAULT_BOT_CONFIG_DIR) {
  const segments = getRelativePathSegments(sourcePath, configRoot);
  if (!segments.length) {
    return true;
  }

  const firstSegment = segments[0] || "";
  const basename = path.basename(String(sourcePath || ""));
  return firstSegment !== "claims"
    && firstSegment !== "route-spacing"
    && !(firstSegment === "characters" && TRANSIENT_CHARACTER_CONFIG_BASENAME_PATTERN.test(basename))
    && !basename.endsWith(".log");
}

export function shouldCopyBotRepoPath(sourcePath, repoRoot = APP_BASE_DIR) {
  const segments = getRelativePathSegments(sourcePath, repoRoot);
  if (!segments.length) {
    return true;
  }

  const basename = path.basename(String(sourcePath || ""));
  const firstSegment = segments[0] || "";
  if (COPY_EXCLUDED_BASENAMES.has(basename) || COPY_EXCLUDED_BASENAMES.has(firstSegment) || basename.endsWith(".log")) {
    return false;
  }

  const relativePath = segments.join("/");
  const transientRepoCharacterConfig = relativePath.startsWith("storage/home/.config/minibot/characters/")
    && TRANSIENT_CHARACTER_CONFIG_BASENAME_PATTERN.test(basename);
  return !BOT_REPO_COPY_EXCLUDED_RELATIVE_PATHS.some((excludedPath) => (
    relativePath === excludedPath || relativePath.startsWith(`${excludedPath}/`)
  )) && !transientRepoCharacterConfig;
}

async function writeTextFile(filePath, contents, {
  mode = undefined,
} = {}) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, contents, "utf8");
  if (mode != null) {
    await fsp.chmod(filePath, mode);
  }
}

export async function sanitizePortableAccountSecrets(configDir) {
  const accountDir = path.join(configDir, "accounts");
  if (!(await pathExists(accountDir))) {
    return {
      sanitized: 0,
      retainedPortable: 0,
    };
  }

  const entries = await fsp.readdir(accountDir, { withFileTypes: true }).catch(() => []);
  let sanitized = 0;
  let retainedPortable = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(accountDir, entry.name);
    let account = null;
    try {
      account = JSON.parse(await fsp.readFile(filePath, "utf8"));
    } catch {
      await removePath(filePath);
      sanitized += 1;
      continue;
    }

    const secretStorage = String(account?.secretStorage || "").trim();
    if (secretStorage === "portable-file") {
      retainedPortable += account?.password ? 1 : 0;
      continue;
    }

    if (account && typeof account === "object" && account.password) {
      await writeTextFile(filePath, `${JSON.stringify({ ...account, password: "" }, null, 2)}\n`);
      sanitized += 1;
    }
  }

  return {
    sanitized,
    retainedPortable,
  };
}

function buildShellLauncher(targetCommand) {
  return `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f -- "\${BASH_SOURCE[0]}" 2>/dev/null || printf '%s' "\${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd -- "$(dirname -- "$SCRIPT_PATH")" && pwd)"
cd "$ROOT_DIR/bot"
exec ${targetCommand} "$@"
`;
}

function buildCmdLauncher(targetCommand) {
  return `@echo off
setlocal
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%bot"
${targetCommand} %*
`;
}

export function buildMinibiaDesktopLauncher({
  commandPath = "start-client.sh",
} = {}) {
  const normalizedCommandPath = String(commandPath || "start-client.sh").trim() || "start-client.sh";
  return `[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=sh -lc 'DIR="$(dirname "$1")"; exec "$DIR/${normalizedCommandPath}"' dummy %k
Icon=applications-internet
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`;
}

export function buildBundleReadme({ outputDir }) {
  return `# Minibia Transfer Bundle

This folder is the portable Minibia bundle.

Layout:

- \`bot/\`: Minibot source repo copy for transfer
- \`client/\`: Minibia client metadata plus the copied Chrome profile seed
- \`Minibia.desktop\`: portable Minibia launcher for Linux desktops
- \`bot/storage/home/\`: copied bot config and cavebots, without stale claims, route-spacing leases, logs, or browser state
- \`bot/storage/runtime/\`: generated browser and Electron profile state

Launchers:

- \`./Minibia.desktop\`
- \`./start-bot.sh\` or \`start-bot.cmd\`
- \`./start-client.sh\` or \`start-client.cmd\`

Requirements on the target machine:

- Node.js 22+
- Chrome, Chromium, Brave, or Edge installed

This bundle intentionally omits \`.git\`, \`node_modules\`, \`dist\`,
\`artifacts\`, stale claims, route-spacing leases, transient page configs, and
runtime lock files. If \`bot/node_modules/\` is absent on the target machine,
run \`npm install\` inside \`bot/\` before launching.

The bot auto-detects this portable layout when it runs from \`minibia/bot\`, so saved routes and configs stay inside this bundle instead of writing back to the machine home directory.

Bundle path:

- \`${outputDir}\`
`;
}

export function buildBundleManifest(payload = {}) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function buildPortableClientMeta(clientProfileSource = {}) {
  return {
    appId: clientProfileSource.appId,
    launchMode: PORTABLE_CLIENT_LAUNCH_MODE,
    profileDirectory: clientProfileSource.profileDirectory,
    pageUrl: PORTABLE_CLIENT_PAGE_URL,
    sourceDesktopEntryPath: null,
    createdAt: new Date().toISOString(),
  };
}

async function removePortableProfileLocks(profileDir) {
  for (const relativePath of REMOVABLE_PROFILE_LOCK_PATHS) {
    await removePath(path.join(profileDir, relativePath));
  }
}

export async function listPortableProfileLocks(profileDir, {
  pathExistsImpl = pathExists,
} = {}) {
  const resolvedProfileDir = path.resolve(String(profileDir || ""));
  const activeLocks = [];

  for (const relativePath of REMOVABLE_PROFILE_LOCK_PATHS) {
    const candidatePath = path.join(resolvedProfileDir, relativePath);
    if (await pathExistsImpl(candidatePath)) {
      activeLocks.push(candidatePath);
    }
  }

  return activeLocks;
}

function resolveClientProfileSource() {
  const launcher = resolveManagedBrowserAppLauncher();
  const sourceProfilePath = extractFlagValue(launcher?.args, "--user-data-dir=");
  const profileDirectory = extractFlagValue(launcher?.args, "--profile-directory=") || "Default";
  const appId = extractFlagValue(launcher?.args, "--app-id=");

  return {
    sourceProfilePath: sourceProfilePath || DEFAULT_CLIENT_PROFILE_DIR,
    profileDirectory,
    appId,
    pageUrl: PORTABLE_CLIENT_PAGE_URL,
    sourceDesktopEntryPath: launcher?.path || null,
  };
}

function assertSafeOutputDir(outputDir) {
  const resolvedOutputDir = path.resolve(outputDir);
  const resolvedRepoDir = path.resolve(APP_BASE_DIR);
  if (resolvedOutputDir === resolvedRepoDir) {
    throw new Error("The output directory cannot overwrite the current repo.");
  }
  if (resolvedOutputDir.startsWith(`${resolvedRepoDir}${path.sep}`)) {
    throw new Error("The output directory cannot live inside the current repo.");
  }
  return resolvedOutputDir;
}

async function writeBundleLaunchers(outputDir) {
  await writeTextFile(
    path.join(outputDir, "start-bot.sh"),
    buildShellLauncher("node ./bb.mjs"),
    { mode: 0o755 },
  );
  await writeTextFile(
    path.join(outputDir, "start-client.sh"),
    buildShellLauncher("node ./scripts/launch-portable-client.mjs"),
    { mode: 0o755 },
  );
  await writeTextFile(
    path.join(outputDir, "start-bot.cmd"),
    buildCmdLauncher("node .\\bb.mjs"),
  );
  await writeTextFile(
    path.join(outputDir, "start-client.cmd"),
    buildCmdLauncher("node .\\scripts\\launch-portable-client.mjs"),
  );
  await writeTextFile(
    path.join(outputDir, "Minibia.desktop"),
    buildMinibiaDesktopLauncher(),
    { mode: 0o755 },
  );
  await writeTextFile(
    path.join(outputDir, "client", "Minibia.desktop"),
    buildMinibiaDesktopLauncher({
      commandPath: "../start-client.sh",
    }),
    { mode: 0o755 },
  );
}

export async function createMinibiaBundle({
  outputDir = DEFAULT_OUTPUT_DIR,
  force = false,
  stdout = process.stdout,
} = {}) {
  const resolvedOutputDir = assertSafeOutputDir(outputDir);
  const botTargetDir = path.join(resolvedOutputDir, "bot");
  const clientTargetDir = path.join(resolvedOutputDir, "client");
  const portableHomeDir = path.join(botTargetDir, "storage", "home");
  const portableRuntimeDir = path.join(botTargetDir, "storage", "runtime");
  const portableBotConfigDir = path.join(portableHomeDir, ".config", "minibot");
  const portableElectronUserDataDir = path.join(portableRuntimeDir, "electron", "Minibot");
  const portableRouteProfileDir = path.join(portableHomeDir, "Minibot", "cavebots");
  const portableClientProfileDir = path.join(clientTargetDir, "chrome-profile");
  const clientProfileSource = resolveClientProfileSource();

  if (await pathExists(resolvedOutputDir)) {
    if (!force) {
      throw new Error(`Output directory already exists: ${resolvedOutputDir}`);
    }
    stdout.write(`Removing existing bundle at ${resolvedOutputDir}\n`);
    await removePath(resolvedOutputDir);
  }

  stdout.write(`Copying bot repo to ${botTargetDir}\n`);
  await copyDirectory(APP_BASE_DIR, botTargetDir, {
    filter: (sourcePath) => shouldCopyBotRepoPath(sourcePath),
  });

  stdout.write(`Copying sanitized Minibia client profile to ${portableClientProfileDir}\n`);
  const sourceProfileLocks = await listPortableProfileLocks(clientProfileSource.sourceProfilePath);
  if (sourceProfileLocks.length) {
    throw new Error(
      `Minibia client profile appears to be in use at ${clientProfileSource.sourceProfilePath}. `
      + `Close Chrome/Minibia for that profile and rebuild the bundle. Active locks: ${sourceProfileLocks.join(", ")}`,
    );
  }
  const copiedClientProfile = await copyDirectory(clientProfileSource.sourceProfilePath, portableClientProfileDir, {
    filter: (sourcePath) => shouldCopyBrowserProfilePath(sourcePath, clientProfileSource.sourceProfilePath),
  });
  if (!copiedClientProfile) {
    throw new Error(`Minibia client profile not found at ${clientProfileSource.sourceProfilePath}`);
  }
  await removePortableProfileLocks(portableClientProfileDir);

  stdout.write(`Copying live bot config to ${portableBotConfigDir}\n`);
  await copyDirectory(DEFAULT_BOT_CONFIG_DIR, portableBotConfigDir, {
    filter: (sourcePath) => shouldCopyPortableBotConfigPath(sourcePath, DEFAULT_BOT_CONFIG_DIR),
  });
  const accountSecretResult = await sanitizePortableAccountSecrets(portableBotConfigDir);
  if (accountSecretResult.sanitized) {
    stdout.write(`Removed ${accountSecretResult.sanitized} machine-local account secret${accountSecretResult.sanitized === 1 ? "" : "s"} from portable bot config\n`);
  }

  stdout.write(`Copying cavebot routes to ${portableRouteProfileDir}\n`);
  await copyDirectory(DEFAULT_ROUTE_PROFILE_DIR, portableRouteProfileDir);

  stdout.write(`Copying Electron app data to ${portableElectronUserDataDir}\n`);
  await copyDirectory(DEFAULT_ELECTRON_USER_DATA_DIR, portableElectronUserDataDir, {
    filter: (sourcePath) => shouldCopyPortableElectronUserDataPath(
      sourcePath,
      DEFAULT_ELECTRON_USER_DATA_DIR,
    ),
  });
  await removePortableProfileLocks(portableElectronUserDataDir);

  await writeTextFile(
    path.join(clientTargetDir, CLIENT_META_FILE_NAME),
    buildBundleManifest(buildPortableClientMeta(clientProfileSource)),
  );

  await writeBundleLaunchers(resolvedOutputDir);
  await writeTextFile(
    path.join(resolvedOutputDir, "README.md"),
    buildBundleReadme({ outputDir: resolvedOutputDir }),
  );
  await writeTextFile(
    path.join(resolvedOutputDir, "bundle-manifest.json"),
    buildBundleManifest({
      createdAt: new Date().toISOString(),
      sourceRepoDir: APP_BASE_DIR,
      outputDir: resolvedOutputDir,
      botTargetDir,
      clientTargetDir,
      portableHomeDir,
      portableRuntimeDir,
      clientProfile: {
        profileDirectory: clientProfileSource.profileDirectory,
        sourceDesktopEntryPath: null,
        sanitized: true,
      },
    }),
  );

  stdout.write(`Portable bundle ready at ${resolvedOutputDir}\n`);
  return {
    outputDir: resolvedOutputDir,
    botTargetDir,
    clientTargetDir,
  };
}

async function main() {
  const parsed = parseArgv(process.argv.slice(2));
  const outputDir = String(parsed.flags.output || parsed.positionals[0] || DEFAULT_OUTPUT_DIR).trim() || DEFAULT_OUTPUT_DIR;
  const force = parsed.flags.force === true;

  try {
    await createMinibiaBundle({
      outputDir,
      force,
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectExecution = (() => {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fs.realpathSync(process.argv[1]) === scriptPath;
  } catch {
    return path.resolve(process.argv[1]) === scriptPath;
  }
})();

if (isDirectExecution) {
  await main();
}
