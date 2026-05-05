#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  discoverGamePages,
  MinibiaTargetBot,
} from "../lib/bot-core.mjs";
import { captureState } from "./live-probe.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const DEFAULT_PORT = 9224;
const DEFAULT_URL_PREFIX = "https://minibia.com/play";
const DEFAULT_WAIT_MS = 250;

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeInteger(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function parseLaneList(value = "") {
  return String(value || "")
    .split(",")
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    allSessions: false,
    allowSkip: false,
    character: "",
    help: false,
    json: false,
    pageUrlPrefix: DEFAULT_URL_PREFIX,
    port: DEFAULT_PORT,
    thenLanes: [],
    waitMs: DEFAULT_WAIT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--all-sessions") {
      options.allSessions = true;
    } else if (argument === "--allow-skip") {
      options.allowSkip = true;
    } else if (argument === "--character" || argument === "-c") {
      options.character = normalizeText(argv[++index]);
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--port") {
      options.port = Math.max(1, normalizeInteger(argv[++index], DEFAULT_PORT) ?? DEFAULT_PORT);
    } else if (argument === "--then") {
      options.thenLanes.push(...parseLaneList(argv[++index]));
    } else if (argument === "--url-prefix") {
      options.pageUrlPrefix = normalizeText(argv[++index]) || DEFAULT_URL_PREFIX;
    } else if (argument === "--wait-ms") {
      options.waitMs = Math.max(0, normalizeInteger(argv[++index], DEFAULT_WAIT_MS) ?? DEFAULT_WAIT_MS);
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.character && options.allSessions) {
    throw new Error("--character and --all-sessions cannot be used together.");
  }

  options.thenLanes = [...new Set(options.thenLanes)];
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-live-tests.mjs --all-sessions
  node scripts/run-live-tests.mjs --character "Dark Knight"
  node scripts/run-live-tests.mjs --all-sessions --then smoke

Options:
  --all-sessions        Validate every discovered live character tab
  --character, -c <n>   Validate one live character tab by exact name
  --then <lane[,lane]>  Run scripts/run-tests.mjs lanes after live validation
  --allow-skip          Exit successfully when no matching live tab is present
  --json                Print the live validation report as JSON
  --wait-ms <ms>        Delay between read-only captures, defaults to ${DEFAULT_WAIT_MS}
  --port <port>         DevTools port, defaults to ${DEFAULT_PORT}
  --url-prefix <url>    Page URL prefix, defaults to ${DEFAULT_URL_PREFIX}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasFinitePosition(position = {}) {
  return ["x", "y", "z"].every((key) => Number.isFinite(Number(position?.[key])));
}

function summarizeLiveState(state = {}) {
  const snapshot = state?.snapshot || {};
  return {
    capturedAt: normalizeText(state?.capturedAt),
    playerName: normalizeText(snapshot?.playerName),
    playerPosition: snapshot?.playerPosition || null,
    ready: snapshot?.ready === true,
    visibleNpcCount: Array.isArray(snapshot?.visibleNpcs) ? snapshot.visibleNpcs.length : 0,
    containerCount: Array.isArray(snapshot?.containers) ? snapshot.containers.length : 0,
    openModalCount: Array.isArray(state?.pageState?.openModals) ? state.pageState.openModals.length : 0,
    activeChannelName: normalizeText(state?.pageState?.activeChannelName),
    scannedTileCount: Array.isArray(state?.floor?.tiles) ? state.floor.tiles.length : 0,
  };
}

export function selectLivePages(pages = [], {
  allSessions = false,
  character = "",
} = {}) {
  const usablePages = pages
    .filter((page) => normalizeText(page?.id))
    .filter((page) => normalizeText(page?.characterName));

  if (character) {
    const requestedCharacter = normalizeText(character).toLowerCase();
    return usablePages.filter((page) => normalizeText(page?.characterName).toLowerCase() === requestedCharacter);
  }

  if (allSessions) {
    return usablePages;
  }

  return usablePages.slice(0, 1);
}

export function buildLiveValidationReport({
  page = {},
  before = {},
  after = {},
} = {}) {
  const issues = [];
  const beforeSummary = summarizeLiveState(before);
  const afterSummary = summarizeLiveState(after);
  const pageCharacterName = normalizeText(page?.characterName);
  const observedName = afterSummary.playerName || beforeSummary.playerName;
  const observedPosition = afterSummary.playerPosition || beforeSummary.playerPosition;

  if (!normalizeText(page?.id)) {
    issues.push("live page id missing");
  }

  if (!pageCharacterName) {
    issues.push("live page character name missing");
  }

  if (afterSummary.ready !== true && beforeSummary.ready !== true) {
    issues.push("live snapshot never became ready");
  }

  if (!observedName) {
    issues.push("live player name missing");
  }

  if (!hasFinitePosition(observedPosition)) {
    issues.push("live player position missing");
  }

  if (observedName && pageCharacterName && observedName.toLowerCase() !== pageCharacterName.toLowerCase()) {
    issues.push(`live snapshot character mismatch: page=${pageCharacterName} snapshot=${observedName}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    page: {
      id: normalizeText(page?.id),
      characterName: pageCharacterName,
      title: normalizeText(page?.title),
    },
    before: beforeSummary,
    after: afterSummary,
  };
}

async function captureLivePage(page, options = {}) {
  const bot = new MinibiaTargetBot({
    port: options.port,
    pageUrlPrefix: options.pageUrlPrefix,
    dryRun: false,
    autowalkEnabled: false,
    routeRecording: false,
  });

  try {
    await bot.attachToPage(page);
    bot.initialChatCleanupPending = false;
    const before = await captureState(bot);
    await delay(options.waitMs);
    const after = await captureState(bot);
    return buildLiveValidationReport({ page, before, after });
  } finally {
    await bot.detach().catch(() => {});
  }
}

export async function runLiveValidation(options = {}) {
  const pages = await discoverGamePages(options.port, options.pageUrlPrefix);
  const selectedPages = selectLivePages(pages, options);

  if (!selectedPages.length) {
    const selector = options.character
      ? `character "${options.character}"`
      : "live character tab";
    return {
      ok: false,
      skipped: options.allowSkip === true,
      issues: [`No matching ${selector} was found on DevTools port ${options.port}.`],
      results: [],
    };
  }

  const results = [];
  for (const page of selectedPages) {
    results.push(await captureLivePage(page, options));
  }

  const issues = results.flatMap((result) => result.issues.map((issue) => `${result.page.characterName || result.page.id}: ${issue}`));
  return {
    ok: issues.length === 0,
    skipped: false,
    issues,
    results,
  };
}

function printTextReport(report) {
  if (report.skipped) {
    console.log(`Live validation skipped: ${report.issues.join("; ")}`);
    return;
  }

  if (!report.ok) {
    console.error("Live validation failed:");
    for (const issue of report.issues) {
      console.error(`- ${issue}`);
    }
    return;
  }

  console.log(`Live validation passed for ${report.results.length} session${report.results.length === 1 ? "" : "s"}:`);
  for (const result of report.results) {
    const after = result.after;
    const position = after.playerPosition
      ? `${after.playerPosition.x},${after.playerPosition.y},${after.playerPosition.z}`
      : "unknown";
    console.log(`- ${result.page.characterName}: ready=${after.ready} pos=${position} npcs=${after.visibleNpcCount} containers=${after.containerCount} tiles=${after.scannedTileCount}`);
  }
}

function runSyntheticLanes(lanes = []) {
  if (!lanes.length) {
    return 0;
  }

  const result = spawnSync(process.execPath, [
    path.join("scripts", "run-tests.mjs"),
    ...lanes,
  ], {
    cwd: appRoot,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const report = await runLiveValidation(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }

  if (!report.ok && !report.skipped) {
    process.exitCode = 1;
    return;
  }

  const syntheticStatus = runSyntheticLanes(options.thenLanes);
  if (syntheticStatus !== 0) {
    process.exitCode = syntheticStatus;
  }
}

const isEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
