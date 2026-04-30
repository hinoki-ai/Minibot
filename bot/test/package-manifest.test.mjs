import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const iconPngPath = path.join(__dirname, "..", "desktop", "assets", "icon.png");
const desktopMainPath = path.join(__dirname, "..", "desktop", "main.mjs");
const preloadCjsPath = path.join(__dirname, "..", "desktop", "preload.cjs");
const preloadMjsPath = path.join(__dirname, "..", "desktop", "preload.mjs");
const desktopRuntimePackageFiles = [
  "desktop/app-protocol.mjs",
  "desktop/assets/**/*",
  "desktop/index.html",
  "desktop/linux-integration.mjs",
  "desktop/main.mjs",
  "desktop/party-follow-summary.js",
  "desktop/power-save-blocker.mjs",
  "desktop/preload.cjs",
  "desktop/preload.mjs",
  "desktop/renderer.js",
  "desktop/styles.css",
];

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function extractBridgeMethodNames(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return [...source.matchAll(/^\s{2}([a-zA-Z]\w*):\s*\(/gm)]
    .map((match) => match[1])
    .sort();
}

function extractIpcInvokeChannels(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return [...source.matchAll(/ipcRenderer\.invoke\(\s*["']([^"']+)["']/g)]
    .map((match) => match[1])
    .sort();
}

function extractTrustedHandlerChannels(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  return [...source.matchAll(/handleTrusted\(\s*["']([^"']+)["']/g)]
    .map((match) => match[1])
    .sort();
}

test("package manifest is valid for packaging", () => {
  assert.match(packageJson.version, /^\d+\.\d+\.\d+(-[\w.-]+)?$/);
  assert.equal(packageJson.main, "desktop/main.mjs");
  assert.deepEqual(packageJson.bin, {
    bb: "./bb.mjs",
  });
  assert.equal(typeof packageJson.scripts.pack, "string");
  assert.equal(typeof packageJson.scripts.dist, "string");
  assert.deepEqual(Object.keys(packageJson.scripts).sort(), [
    "bundle:minibia",
    "check:structure",
    "clean",
    "cli",
    "desktop",
    "dist",
    "dist:linux",
    "dist:mac",
    "dist:win",
    "generate:brand",
    "pack",
    "refresh:minibia-data",
    "start",
    "test",
  ]);
  for (const file of desktopRuntimePackageFiles) {
    assert.ok(packageJson.files.includes(file), `Missing package file ${file}`);
  }
  assert.equal(packageJson.files.includes("desktop/**/*"), false);
  assert.ok(packageJson.files.includes("lib/**/*"));
  assert.ok(packageJson.files.includes("data/**/*"));
  assert.equal(typeof packageJson.scripts["refresh:minibia-data"], "string");
  assert.equal(typeof packageJson.scripts["bundle:minibia"], "string");
  assert.equal(packageJson.dependencies.electron, undefined);
  assert.equal(typeof packageJson.devDependencies.electron, "string");
  assert.equal(typeof packageJson.devDependencies["electron-builder"], "string");
});

test("electron-builder only ships the desktop runtime", () => {
  assert.equal(packageJson.build.appId, "com.hinoki.minibot");
  assert.equal(packageJson.build.asar, true);
  assert.equal(packageJson.build.directories.output, "dist");
  assert.deepEqual(packageJson.build.files, [
    ...desktopRuntimePackageFiles,
    "lib/**/*",
    "data/**/*",
    "package.json",
    "!desktop/**/*.map",
    "!**/*.log",
  ]);
});

test("desktop packaging icon stays large enough for electron-builder", () => {
  const { width, height } = readPngDimensions(iconPngPath);
  assert.equal(width, height);
  assert.ok(width >= 256, `desktop/assets/icon.png must be at least 256x256, received ${width}x${height}`);
});

test("desktop preload bridges expose the same bbApi methods", () => {
  const mainSource = fs.readFileSync(desktopMainPath, "utf8");
  assert.match(mainSource, /preload:\s*path\.join\(__dirname,\s*"preload\.cjs"\)/);
  assert.deepEqual(
    extractBridgeMethodNames(preloadCjsPath),
    extractBridgeMethodNames(preloadMjsPath),
  );
});

test("desktop preload invokes are backed by trusted main handlers", () => {
  const trustedHandlers = extractTrustedHandlerChannels(desktopMainPath);
  assert.deepEqual(extractIpcInvokeChannels(preloadCjsPath), trustedHandlers);
  assert.deepEqual(extractIpcInvokeChannels(preloadMjsPath), trustedHandlers);
});
