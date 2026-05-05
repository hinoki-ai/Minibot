#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const testRoot = path.join(appRoot, "test");

const laneDescriptions = Object.freeze({
  smoke: "Default daily gate: fast contracts that catch wiring, storage, route validation, runtime ordering, and packaging drift.",
  unit: "Small focused module tests. Excludes the monolithic core and renderer suites.",
  core: "Bot decision engine and tick ordering.",
  desktop: "Electron shell, renderer DOM, launcher, desktop integration, and trainer bootstrap.",
  integration: "Local socket, CDP, browser/session, reconnect click, and live-probe helpers.",
  release: "Portable layout, bundle, vendored data, repository shape, and package manifest checks.",
  all: "Every *.test.mjs file currently present under test/.",
  uncategorized: "Tests present on disk that are not assigned to a named lane yet.",
});

const lanes = {
  smoke: [
    "test/action-layer.test.mjs",
    "test/config-store.test.mjs",
    "test/diagnostics.test.mjs",
    "test/minibia-hotbar-seed.test.mjs",
    "test/minibia-snapshot.test.mjs",
    "test/package-manifest.test.mjs",
    "test/repo-structure.test.mjs",
    "test/route-validation.test.mjs",
    "test/runtime-modules.test.mjs",
    "test/session-safety.test.mjs",
  ],
  unit: [
    "test/ammo.test.mjs",
    "test/app-protocol.test.mjs",
    "test/banking.test.mjs",
    "test/bb-launcher.test.mjs",
    "test/diagnostics.test.mjs",
    "test/god-create-item.test.mjs",
    "test/haste.test.mjs",
    "test/hunt-presets.test.mjs",
    "test/live-probe.test.mjs",
    "test/loot-economics.test.mjs",
    "test/looter.test.mjs",
    "test/minibia-item-metadata.test.mjs",
    "test/minibia-hotbar-seed.test.mjs",
    "test/minibia-snapshot.test.mjs",
    "test/onscreen-cli.test.mjs",
    "test/power-save-blocker.test.mjs",
    "test/progression.test.mjs",
    "test/record-same-floor-route.test.mjs",
    "test/refill.test.mjs",
    "test/shopper.test.mjs",
    "test/session-safety.test.mjs",
    "test/sustain.test.mjs",
    "test/vocation-pack.test.mjs",
  ],
  core: [
    "test/action-layer.test.mjs",
    "test/bot-core.test.mjs",
    "test/runtime-modules.test.mjs",
  ],
  desktop: [
    "test/app-protocol.test.mjs",
    "test/bb-launcher.test.mjs",
    "test/desktop-renderer.test.mjs",
    "test/linux-integration.test.mjs",
    "test/power-save-blocker.test.mjs",
    "test/trainer-bootstrap.test.mjs",
  ],
  integration: [
    "test/browser-session.test.mjs",
    "test/cdp-page.test.mjs",
    "test/external-control-socket.test.mjs",
    "test/live-probe.test.mjs",
    "test/reconnect-real-click.test.mjs",
    "test/route-validation.test.mjs",
  ],
  release: [
    "test/config-store.test.mjs",
    "test/minibia-bundle.test.mjs",
    "test/minibia-data.test.mjs",
    "test/package-manifest.test.mjs",
    "test/portable-layout.test.mjs",
    "test/repo-structure.test.mjs",
    "test/vocation-pack.test.mjs",
  ],
};

function listTestFiles() {
  return fs.readdirSync(testRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => `test/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
}

function unique(values) {
  return [...new Set(values)];
}

function resolveLanes() {
  const allFiles = listTestFiles();
  const assignedFiles = new Set(Object.values(lanes).flat());

  return {
    ...lanes,
    all: allFiles,
    uncategorized: allFiles.filter((file) => !assignedFiles.has(file)),
  };
}

function printHelp(resolvedLanes) {
  console.log("Usage: node scripts/run-tests.mjs [lane...] [-- node-test-args]");
  console.log("");
  console.log("Lanes:");
  for (const [name, files] of Object.entries(resolvedLanes)) {
    const description = laneDescriptions[name] || "";
    console.log(`  ${name.padEnd(13)} ${String(files.length).padStart(2)} files  ${description}`);
  }
  console.log("");
  console.log("Examples:");
  console.log("  npm test");
  console.log("  npm run test:core");
  console.log("  node scripts/run-tests.mjs core -- --test-name-pattern route");
}

function printList(resolvedLanes) {
  for (const [name, files] of Object.entries(resolvedLanes)) {
    console.log(`${name}:`);
    for (const file of files) {
      console.log(`  ${file}`);
    }
  }
}

const resolvedLanes = resolveLanes();
const requestedLanes = [];
const nodeTestArgs = [];
let passthrough = false;
let shouldList = false;
let shouldHelp = false;

for (const arg of process.argv.slice(2)) {
  if (passthrough) {
    nodeTestArgs.push(arg);
    continue;
  }

  if (arg === "--") {
    passthrough = true;
  } else if (arg === "--list") {
    shouldList = true;
  } else if (arg === "--help" || arg === "-h") {
    shouldHelp = true;
  } else if (arg.startsWith("--")) {
    nodeTestArgs.push(arg);
  } else {
    requestedLanes.push(arg);
  }
}

if (shouldHelp) {
  printHelp(resolvedLanes);
  process.exit(0);
}

if (shouldList) {
  printList(resolvedLanes);
  process.exit(0);
}

const laneNames = requestedLanes.length ? requestedLanes : ["smoke"];
const unknownLanes = laneNames.filter((laneName) => !resolvedLanes[laneName]);
if (unknownLanes.length) {
  console.error(`Unknown test lane${unknownLanes.length === 1 ? "" : "s"}: ${unknownLanes.join(", ")}`);
  console.error(`Known lanes: ${Object.keys(resolvedLanes).join(", ")}`);
  process.exit(1);
}

const files = unique(laneNames.flatMap((laneName) => resolvedLanes[laneName]));
if (!files.length) {
  console.log(`No test files selected for lane${laneNames.length === 1 ? "" : "s"}: ${laneNames.join(", ")}`);
  process.exit(0);
}

const missingFiles = files.filter((file) => !fs.existsSync(path.join(appRoot, file)));
if (missingFiles.length) {
  console.error(`Missing test file${missingFiles.length === 1 ? "" : "s"}: ${missingFiles.join(", ")}`);
  process.exit(1);
}

const args = [
  "--test",
  "--test-concurrency=1",
  ...nodeTestArgs,
  ...files,
];
const result = spawnSync(process.execPath, args, {
  cwd: appRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
