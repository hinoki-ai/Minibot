#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_BASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_ROOT_DIR = path.resolve(APP_BASE_DIR, "..");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const CANONICAL_ROOT_MARKDOWN = Object.freeze([
  "README.md",
]);

export const CANONICAL_BOT_MARKDOWN = Object.freeze([
  "AGENTS.md",
  "README.md",
  "CANONICAL.md",
  "docs/ARCHITECTURE.md",
  "docs/MODULES.md",
  "docs/MINIBIA_RUNTIME_SURFACE.md",
  "docs/MINIBIA_ACTION_PRIMITIVES.md",
  "docs/UI_UX.md",
  "docs/OPERATIONS.md",
  "todo.md",
]);

export const REQUIRED_BOT_DIRECTORIES = Object.freeze([
  "bot/cavebots",
  "bot/data/minibia/current",
  "bot/data/minibia/snapshots",
  "bot/data/minibia/vocations",
  "bot/desktop",
  "bot/desktop/assets",
  "bot/docs",
  "bot/lib",
  "bot/lib/modules",
  "bot/scripts",
  "bot/storage/home",
  "bot/temporals",
  "bot/test",
]);

export const REQUIRED_BUNDLE_PATHS = Object.freeze([
  "README.md",
  "Minibia.desktop",
  "start-bot.sh",
  "start-bot.cmd",
  "start-client.sh",
  "start-client.cmd",
  "client/client-meta.json",
  "bot/package.json",
  "bot/package-lock.json",
  "bot/bb.mjs",
  "bot/onscreen_monster_bot.mjs",
  "bot/scripts/check-repo-structure.mjs",
  "bot/scripts/run-tests.mjs",
  "bot/test/repo-structure.test.mjs",
]);

const ROOT_FILE_ALLOWLIST = new Set([
  ".gitignore",
  "Minibia.desktop",
  "README.md",
  "bundle-manifest.json",
  "start-bot.cmd",
  "start-bot.sh",
  "start-client.cmd",
  "start-client.sh",
]);

const ROOT_DIRECTORY_ALLOWLIST = new Set([
  "bot",
  "client",
]);

const GENERATED_TRACKED_PATH_PREFIXES = Object.freeze([
  ".codex/",
  "dist/",
  "node_modules/",
  "bot/.codex/",
  "bot/artifacts/",
  "bot/dist/",
  "bot/node_modules/",
  "bot/storage/runtime/",
  "bot/storage/home/.cache/",
  "bot/storage/home/.pki/",
  "bot/storage/home/.config/Minibot/",
  "bot/storage/home/.config/minibot/accounts/",
  "bot/storage/home/.config/minibot/claims/",
  "bot/storage/home/.config/minibot/route-spacing/",
  "bot/storage/home/.config/minibot/session-state.json",
  "client/chrome-profile/",
]);

const TEMPORAL_FRONT_MATTER_KEYS = Object.freeze([
  "created_at",
  "expires_at",
  "timezone",
  "reason",
]);

function toPortablePath(value) {
  return String(value || "").replaceAll(path.sep, "/");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function listFilesFromDisk(rootDir) {
  const result = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        result.push(toPortablePath(path.relative(rootDir, absolutePath)));
      }
    }
  }

  walk(rootDir);
  return result;
}

function listTrackedFiles(rootDir) {
  try {
    const output = execFileSync("git", ["-C", rootDir, "ls-files", "--cached", "--others", "--exclude-standard"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const files = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (files.length) {
      return files;
    }
  } catch {
    // Fall back for unpacked bundles or tests that do not live inside a git tree.
  }

  return listFilesFromDisk(rootDir);
}

function hasTrackedPath(trackedFiles, relativePath) {
  const prefix = `${relativePath.replace(/\/$/, "")}/`;
  return trackedFiles.includes(relativePath) || trackedFiles.some((file) => file.startsWith(prefix));
}

function compareSets({
  actual,
  expected,
  label,
  issues,
}) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  for (const value of expectedSet) {
    if (!actualSet.has(value)) {
      issues.push(`${label} is missing ${value}`);
    }
  }

  for (const value of actualSet) {
    if (!expectedSet.has(value)) {
      issues.push(`${label} contains unexpected ${value}`);
    }
  }
}

function parseFrontMatter(text) {
  const lines = String(text || "").split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!match) {
      break;
    }
    values[match[1]] = match[2].trim();
  }

  return values;
}

function validateTemporalMarkdown({
  bundleRootDir,
  temporalFiles,
  issues,
}) {
  for (const file of temporalFiles) {
    const basename = path.basename(file);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(basename)) {
      issues.push(`temporal note ${file} must use lowercase kebab-case`);
    }

    let contents = "";
    try {
      contents = fs.readFileSync(path.join(bundleRootDir, file), "utf8");
    } catch (error) {
      issues.push(`temporal note ${file} could not be read: ${error.message}`);
      continue;
    }

    const frontMatter = parseFrontMatter(contents);
    for (const key of TEMPORAL_FRONT_MATTER_KEYS) {
      if (!frontMatter[key]) {
        issues.push(`temporal note ${file} is missing ${key}`);
      }
    }

    const createdAt = Date.parse(frontMatter.created_at || "");
    const expiresAt = Date.parse(frontMatter.expires_at || "");
    if (Number.isNaN(createdAt) || Number.isNaN(expiresAt)) {
      continue;
    }

    const windowMs = expiresAt - createdAt;
    if (windowMs <= 0 || windowMs > ONE_DAY_MS) {
      issues.push(`temporal note ${file} must expire within 24 hours of created_at`);
    }
  }
}

function validatePackageManifest({
  bundleRootDir,
  issues,
}) {
  const packageJsonPath = path.join(bundleRootDir, "bot", "package.json");
  let packageJson = null;

  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    issues.push(`bot/package.json could not be parsed: ${error.message}`);
    return;
  }

  if (packageJson.main !== "desktop/main.mjs") {
    issues.push("bot/package.json main must remain desktop/main.mjs");
  }

  if (packageJson.scripts?.["check:structure"] !== "node scripts/check-repo-structure.mjs") {
    issues.push("bot/package.json must expose npm run check:structure");
  }

  if (packageJson.scripts?.test !== "node scripts/run-tests.mjs smoke") {
    issues.push("bot/package.json test script must run the smoke test lane");
  }

  if (packageJson.scripts?.["test:all"] !== "node scripts/run-tests.mjs all") {
    issues.push("bot/package.json must expose npm run test:all for the full suite");
  }

  if (!Array.isArray(packageJson.files) || !packageJson.files.includes("scripts/**/*")) {
    issues.push("bot/package.json files must include scripts/**/* for portable tooling");
  }

  if (packageJson.build?.directories?.output !== "dist") {
    issues.push("electron-builder output directory must remain bot/dist");
  }
}

export function createRepoStructureReport({
  bundleRootDir = BUNDLE_ROOT_DIR,
} = {}) {
  const normalizedRootDir = path.resolve(bundleRootDir);
  const trackedFiles = uniqueSorted(listTrackedFiles(normalizedRootDir).map(toPortablePath));
  const issues = [];

  const rootMarkdown = trackedFiles
    .filter((file) => !file.includes("/") && file.endsWith(".md"));
  compareSets({
    actual: rootMarkdown,
    expected: CANONICAL_ROOT_MARKDOWN,
    label: "bundle-root markdown",
    issues,
  });

  const botMarkdown = trackedFiles
    .filter((file) => file.startsWith("bot/") && file.endsWith(".md"));
  const temporalMarkdown = botMarkdown.filter((file) => file.startsWith("bot/temporals/"));
  const durableBotMarkdown = botMarkdown
    .filter((file) => !file.startsWith("bot/temporals/"))
    .map((file) => file.slice("bot/".length));
  compareSets({
    actual: durableBotMarkdown,
    expected: CANONICAL_BOT_MARKDOWN,
    label: "bot canonical markdown",
    issues,
  });
  validateTemporalMarkdown({
    bundleRootDir: normalizedRootDir,
    temporalFiles: temporalMarkdown,
    issues,
  });

  for (const file of trackedFiles) {
    const firstSegment = file.split("/")[0] || "";
    if (!file.includes("/") && !ROOT_FILE_ALLOWLIST.has(file)) {
      issues.push(`bundle root contains unexpected tracked file ${file}`);
    }
    if (file.includes("/") && !ROOT_DIRECTORY_ALLOWLIST.has(firstSegment)) {
      issues.push(`bundle root contains unexpected tracked directory ${firstSegment}`);
    }
    if (GENERATED_TRACKED_PATH_PREFIXES.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix))) {
      issues.push(`generated or machine-local path is tracked: ${file}`);
    }
    if (/\.(?:cjs|js|mjs)$/.test(file) && !file.startsWith("bot/")) {
      issues.push(`JavaScript source must live under bot/: ${file}`);
    }
  }

  for (const directory of REQUIRED_BOT_DIRECTORIES) {
    if (!fs.existsSync(path.join(normalizedRootDir, directory))) {
      issues.push(`required directory is missing: ${directory}`);
    }
  }

  for (const relativePath of REQUIRED_BUNDLE_PATHS) {
    if (!hasTrackedPath(trackedFiles, relativePath)) {
      issues.push(`required tracked path is missing: ${relativePath}`);
    }
  }

  validatePackageManifest({
    bundleRootDir: normalizedRootDir,
    issues,
  });

  return {
    ok: issues.length === 0,
    issues: uniqueSorted(issues),
    sourceFileCount: trackedFiles.length,
    trackedFileCount: trackedFiles.length,
  };
}

function printReport(report) {
  if (report.ok) {
    console.log(`Repo structure OK (${report.sourceFileCount} source files checked).`);
    return;
  }

  console.error("Repo structure check failed:");
  for (const issue of report.issues) {
    console.error(`- ${issue}`);
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "")) {
  const report = createRepoStructureReport();
  printReport(report);
  if (!report.ok) {
    process.exitCode = 1;
  }
}
