#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  BACKGROUND_SAFE_BROWSER_FLAGS,
  resolveBrowserExecutable,
  resolveChromiumWindowSizeArg,
} from "../lib/browser-session.mjs";
import {
  pruneBrowserProfile,
  shouldCopyBrowserProfilePath,
} from "../lib/browser-profile-privacy.mjs";
import { resolveRuntimeLayout } from "../lib/runtime-layout.mjs";

const APP_BASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_MINIBIA_PAGE_URL = "https://minibia.com/play";
const REMOVABLE_PROFILE_LOCK_PATHS = Object.freeze([
  "SingletonCookie",
  "SingletonLock",
  "SingletonSocket",
  "DevToolsActivePort",
  path.join("Default", "LOCK"),
]);

export function buildMinibiaPwaSessionUrl(pageUrl = DEFAULT_MINIBIA_PAGE_URL, {
  session = Date.now(),
} = {}) {
  const normalizedPageUrl = String(pageUrl || DEFAULT_MINIBIA_PAGE_URL).trim() || DEFAULT_MINIBIA_PAGE_URL;
  const sessionValue = String(session || Date.now());

  try {
    const url = new URL(normalizedPageUrl);
    url.searchParams.set("pwa", "1");
    url.searchParams.set("session", sessionValue);
    return url.toString();
  } catch {
    const separator = normalizedPageUrl.includes("?") ? "&" : "?";
    return `${normalizedPageUrl}${separator}pwa=1&session=${encodeURIComponent(sessionValue)}`;
  }
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

export function readPortableClientMeta({
  appBaseDir = APP_BASE_DIR,
  existsImpl = fs.existsSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
} = {}) {
  const runtimeLayout = resolveRuntimeLayout({ baseDir: appBaseDir });
  if (!runtimeLayout.portable) {
    throw new Error("Portable Minibia client launcher is only available inside a minibia/bot bundle.");
  }

  const metaPath = runtimeLayout.portableClientMetaPath;
  let meta = {};

  if (metaPath && existsImpl(metaPath)) {
    meta = JSON.parse(String(readFileImpl(metaPath) || "{}"));
  }

  return {
    runtimeLayout,
    metaPath,
    meta: meta && typeof meta === "object" ? meta : {},
  };
}

export function preparePortableClientProfile({
  profileDir,
  seedProfileDir = "",
  resetProfile = false,
  cleanupProfileLocks = false,
  existsImpl = fs.existsSync,
  cpImpl = fs.cpSync,
  mkdirImpl = fs.mkdirSync,
  rmImpl = fs.rmSync,
} = {}) {
  const resolvedProfileDir = String(profileDir || "").trim();
  if (!resolvedProfileDir) {
    throw new Error("Portable client profile directory is required.");
  }

  const resolvedSeedProfileDir = String(seedProfileDir || "").trim();
  const hasDistinctSeed = (
    resolvedSeedProfileDir
    && path.resolve(resolvedSeedProfileDir) !== path.resolve(resolvedProfileDir)
    && existsImpl(resolvedSeedProfileDir)
  );

  let shouldCleanupProfileLocks = cleanupProfileLocks === true;

  if (resetProfile) {
    rmImpl(resolvedProfileDir, {
      force: true,
      recursive: true,
    });
    shouldCleanupProfileLocks = true;
  }

  if (!existsImpl(resolvedProfileDir)) {
    if (hasDistinctSeed) {
      mkdirImpl(path.dirname(resolvedProfileDir), { recursive: true });
      cpImpl(resolvedSeedProfileDir, resolvedProfileDir, {
        recursive: true,
        force: true,
        filter: (sourcePath) => shouldCopyBrowserProfilePath(sourcePath, resolvedSeedProfileDir, {
          preserveSavedPasswords: true,
        }),
      });
      shouldCleanupProfileLocks = true;
    } else {
      mkdirImpl(resolvedProfileDir, { recursive: true });
    }
  } else {
    mkdirImpl(resolvedProfileDir, { recursive: true });
  }

  if (shouldCleanupProfileLocks) {
    for (const relativePath of REMOVABLE_PROFILE_LOCK_PATHS) {
      rmImpl(path.join(resolvedProfileDir, relativePath), {
        force: true,
        recursive: false,
      });
    }
  }

  pruneBrowserProfile(resolvedProfileDir, {
    existsImpl,
    rmImpl,
    preserveSavedPasswords: true,
  });

  return resolvedProfileDir;
}

export function buildPortableClientLaunchSpec({
  appBaseDir = APP_BASE_DIR,
  env = process.env,
  pageUrl = "",
  port = null,
  browserPath = "",
  cleanupProfileLocks = false,
  existsImpl = fs.existsSync,
  readFileImpl = (entryPath) => fs.readFileSync(entryPath, "utf8"),
  mkdirImpl = fs.mkdirSync,
  rmImpl = fs.rmSync,
} = {}) {
  const { runtimeLayout, meta } = readPortableClientMeta({
    appBaseDir,
    existsImpl,
  });
  const resetProfile = env.MINIBOT_RESET_PORTABLE_PROFILE === "1" || env.MINIBIA_RESET_PORTABLE_PROFILE === "1";
  const resolvedBrowserPath = String(
    browserPath || resolveBrowserExecutable({ env, existsImpl }) || "",
  ).trim();

  if (!resolvedBrowserPath) {
    throw new Error("Chrome executable not found. Set MINIBOT_BROWSER_PATH or install Chrome/Chromium.");
  }

  const profileDir = preparePortableClientProfile({
    profileDir: runtimeLayout.managedBrowserUserDataDir,
    seedProfileDir: runtimeLayout.portableClientSeedUserDataDir,
    resetProfile,
    cleanupProfileLocks,
    existsImpl,
    mkdirImpl,
    rmImpl,
  });
  const profileDirectory = String(env.MINIBIA_PROFILE_DIRECTORY || meta.profileDirectory || "Default").trim() || "Default";
  const appId = String(meta.appId || "").trim();
  const targetUrl = String(pageUrl || meta.pageUrl || DEFAULT_MINIBIA_PAGE_URL).trim() || DEFAULT_MINIBIA_PAGE_URL;
  const launchMode = String(meta.launchMode || env.MINIBIA_CLIENT_LAUNCH_MODE || "").trim().toLowerCase();
  const userAgent = String(meta.userAgent || env.MINIBIA_CLIENT_USER_AGENT || "").trim();
  const resolvedPort = Number(port);
  const args = [
    `--user-data-dir=${profileDir}`,
    `--profile-directory=${profileDirectory}`,
    ...BACKGROUND_SAFE_BROWSER_FLAGS.filter((flag) => flag !== "--new-window"),
    "--no-first-run",
    "--no-default-browser-check",
  ];

  if (Number.isInteger(resolvedPort) && resolvedPort > 0) {
    args.push(`--remote-debugging-port=${resolvedPort}`);
  }

  if (userAgent) {
    args.push(`--user-agent=${userAgent}`);
  }

  const savedWindowSize = resolveChromiumWindowSizeArg({
    userDataDir: profileDir,
    profileDirectory,
    appId: launchMode === "app-url" ? "" : appId,
    appUrl: launchMode === "app-url" ? targetUrl : "",
    existsImpl,
    readFileImpl,
  });
  if (savedWindowSize) {
    args.push(`--window-size=${savedWindowSize}`);
  }

  if (launchMode === "app-url") {
    args.push(`--app=${targetUrl}`);
  } else if (appId) {
    args.push(`--app-id=${appId}`);
  } else {
    args.push(targetUrl);
  }

  return {
    command: resolvedBrowserPath,
    args,
    options: {
      detached: true,
      stdio: "ignore",
      env: {
        ...env,
        MINIBOT_PORTABLE_ROOT: runtimeLayout.rootDir,
      },
    },
    runtimeLayout,
    meta,
  };
}

export function launchPortableClient({
  argv = process.argv.slice(2),
  appBaseDir = APP_BASE_DIR,
  env = process.env,
  spawnImpl = spawn,
  stderr = process.stderr,
} = {}) {
  const parsed = parseArgv(argv);
  const requestedPageUrl = String(parsed.flags["page-url"] || parsed.flags.url || "").trim();
  const requestedPort = String(
    parsed.flags["remote-debugging-port"]
    || parsed.flags.port
    || "",
  ).trim();
  const resetProfile = parsed.flags["reset-profile"] === true;

  let spec;
  try {
    spec = buildPortableClientLaunchSpec({
      appBaseDir,
      env: resetProfile
        ? {
            ...env,
            MINIBOT_RESET_PORTABLE_PROFILE: "1",
          }
        : env,
      pageUrl: requestedPageUrl,
      port: requestedPort ? Number(requestedPort) : null,
    });
  } catch (error) {
    stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    return null;
  }

  const child = spawnImpl(spec.command, spec.args, spec.options);
  child.on("error", (error) => {
    stderr.write(`Unable to launch the portable Minibia client: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.unref();
  return child;
}

function isDirectExecution() {
  const scriptPath = fileURLToPath(import.meta.url);
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fs.realpathSync(process.argv[1]) === scriptPath;
  } catch {
    return path.resolve(process.argv[1]) === scriptPath;
  }
}

if (isDirectExecution()) {
  launchPortableClient();
}
