#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildLinuxLaunchEnv,
  ensureLinuxDesktopEntry,
} from "./desktop/linux-integration.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const LAUNCHER_HELP_TEXT = `Usage:
  bb
  bb [electron args]
  bb --help

Launch the local Minibot Electron desktop app from this workspace.`;

export function buildDesktopLaunchSpec({
  baseDir = __dirname,
  argv = [],
  nodePath = process.execPath,
  env = process.env,
  platform = process.platform,
} = {}) {
  const electronCliPath = path.join(baseDir, "node_modules", "electron", "cli.js");
  const launchEnv = buildLinuxLaunchEnv(env, platform);

  return {
    command: nodePath,
    args: [electronCliPath, baseDir, ...argv],
    options: {
      stdio: "inherit",
      ...(launchEnv === env ? {} : { env: launchEnv }),
    },
  };
}

function prepareDesktopLaunch({
  baseDir = __dirname,
  stderr = process.stderr,
  platform = process.platform,
  ensureLinuxDesktopEntryImpl = ensureLinuxDesktopEntry,
} = {}) {
  if (platform !== "linux") {
    return null;
  }

  try {
    return ensureLinuxDesktopEntryImpl({ baseDir, platform });
  } catch (error) {
    stderr.write(`Unable to refresh Minibot desktop entry: ${error.message}\n`);
    return null;
  }
}

export function launchDesktop({
  baseDir = __dirname,
  argv = process.argv.slice(2),
  nodePath = process.execPath,
  env = process.env,
  platform = process.platform,
  spawnImpl = spawn,
  existsImpl = fs.existsSync,
  stderr = process.stderr,
  prepareDesktopLaunchImpl = prepareDesktopLaunch,
} = {}) {
  prepareDesktopLaunchImpl({
    baseDir,
    stderr,
    platform,
  });

  const spec = buildDesktopLaunchSpec({
    baseDir,
    argv,
    nodePath,
    env,
    platform,
  });

  if (!existsImpl(spec.args[0])) {
    throw new Error(`Electron CLI not found at ${spec.args[0]}. Run npm install first.`);
  }

  if (!existsImpl(spec.args[1])) {
    throw new Error(`App root not found at ${spec.args[1]}.`);
  }

  return spawnImpl(spec.command, spec.args, spec.options);
}

export function wantsLauncherHelp(argv = process.argv.slice(2)) {
  return argv.some((arg) => arg === "--help" || arg === "-h");
}

export function printLauncherHelp(stdout = process.stdout) {
  stdout.write(`${LAUNCHER_HELP_TEXT}\n`);
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fs.realpathSync(process.argv[1]) === __filename;
  } catch {
    return path.resolve(process.argv[1]) === __filename;
  }
}

export function runLauncherCli({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  launchDesktopImpl = launchDesktop,
  launchOptions = {},
} = {}) {
  if (wantsLauncherHelp(argv)) {
    printLauncherHelp(stdout);
    return null;
  }

  let child;

  try {
    child = launchDesktopImpl({
      ...launchOptions,
      argv,
      stderr,
    });
  } catch (error) {
    stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    return null;
  }

  child.on("error", (error) => {
    stderr.write(`Unable to launch desktop app: ${error.message}\n`);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  return child;
}

function main() {
  return runLauncherCli();
}

if (isDirectExecution()) {
  main();
}
