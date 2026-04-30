#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateRouteConfig } from "../lib/config-store.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROUTE_DIRS = Object.freeze([
  path.join(APP_ROOT, "cavebots"),
  path.join(APP_ROOT, "storage", "home", "Minibot", "cavebots"),
]);

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    paths: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--path") {
      const value = argv[index + 1];
      if (value) {
        args.paths.push(path.resolve(value));
        index += 1;
      }
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    args.paths.push(path.resolve(arg));
  }

  return args;
}

async function listJsonFiles(targetPath) {
  const stats = await fs.stat(targetPath).catch(() => null);
  if (!stats) {
    return [];
  }
  if (stats.isFile()) {
    return targetPath.endsWith(".json") ? [targetPath] : [];
  }
  if (!stats.isDirectory()) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(path.join(targetPath, entry.name));
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function validateRouteFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(String(raw || "").trim() || "{}");
  const fallbackName = path.basename(filePath).replace(/\.json$/i, "");
  const routeName = String(payload?.name || payload?.cavebotName || fallbackName).trim() || fallbackName;
  return validateRouteConfig({
    ...payload,
    cavebotName: routeName,
  }, {
    sourceName: routeName,
    sourcePath: filePath,
    rawConfig: payload,
  });
}

export async function validateRoutePaths(paths = DEFAULT_ROUTE_DIRS) {
  const files = [];
  for (const targetPath of paths) {
    files.push(...await listJsonFiles(targetPath));
  }

  const uniqueFiles = [...new Set(files)].sort((left, right) => left.localeCompare(right));
  const reports = [];
  for (const filePath of uniqueFiles) {
    try {
      reports.push(await validateRouteFile(filePath));
    } catch (error) {
      reports.push({
        schemaVersion: 1,
        sourceName: path.basename(filePath).replace(/\.json$/i, ""),
        sourcePath: filePath,
        signature: "",
        checkedAt: Date.now(),
        ok: false,
        requiresAcknowledgement: true,
        summary: {
          ok: false,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          highestSeverity: "error",
          firstProblemWaypointIndex: null,
        },
        issues: [{
          severity: "error",
          code: "unreadable-route",
          message: error.message,
          waypointIndex: null,
          field: "",
          value: null,
          requiresAcknowledgement: true,
        }],
      });
    }
  }

  return {
    ok: reports.every((report) => report.ok),
    routeCount: reports.length,
    errorCount: reports.reduce((total, report) => total + (Number(report.summary?.errorCount) || 0), 0),
    warningCount: reports.reduce((total, report) => total + (Number(report.summary?.warningCount) || 0), 0),
    reports,
  };
}

function formatTextReport(report) {
  if (!report.routeCount) {
    return "No route JSON files found.";
  }

  const lines = [
    `Validated ${report.routeCount} route file${report.routeCount === 1 ? "" : "s"}: ${report.errorCount} error${report.errorCount === 1 ? "" : "s"}, ${report.warningCount} warning${report.warningCount === 1 ? "" : "s"}.`,
  ];
  for (const route of report.reports) {
    if (route.ok && !route.summary.warningCount) {
      continue;
    }
    lines.push(`${route.ok ? "WARN" : "FAIL"} ${route.sourceName} (${route.sourcePath})`);
    for (const issue of route.issues.slice(0, 8)) {
      const location = Number.isInteger(issue.waypointIndex) ? ` waypoint ${issue.waypointIndex + 1}` : "";
      lines.push(`  - ${issue.severity}${location}: ${issue.message}`);
    }
    if (route.issues.length > 8) {
      lines.push(`  - ... ${route.issues.length - 8} more issue${route.issues.length - 8 === 1 ? "" : "s"}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log("Usage: node scripts/validate-routes.mjs [--json] [--path <file-or-dir>]...");
    return;
  }

  const report = await validateRoutePaths(args.paths.length ? args.paths : DEFAULT_ROUTE_DIRS);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTextReport(report));
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
