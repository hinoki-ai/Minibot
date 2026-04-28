import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  MINIBIA_BASE_URL,
  MINIBIA_DATA_ROOT,
  MINIBIA_LIBRARY_SOURCE_PATH,
  MINIBIA_SERVER_INFO_SOURCE_PATH,
  MINIBIA_SERVER_STATUS_SOURCE_PATH,
  MINIBIA_SNAPSHOT_RETENTION_COUNT,
  writeMinibiaDataBundle,
} from "../lib/minibia-data.mjs";

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Minibot Minibia Data Refresh",
    },
  });

  if (!response?.ok) {
    throw new Error(`Request failed for ${url}: ${response?.status} ${response?.statusText}`);
  }

  return response.json();
}

function resolveUrl(baseUrl, sourcePath) {
  return new URL(sourcePath, baseUrl).toString();
}

export async function fetchMinibiaSourceData({
  baseUrl = MINIBIA_BASE_URL,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required.");
  }

  const [rawLibrary, rawServerInfo, rawServerStatus] = await Promise.all([
    fetchJson(fetchImpl, resolveUrl(baseUrl, MINIBIA_LIBRARY_SOURCE_PATH)),
    fetchJson(fetchImpl, resolveUrl(baseUrl, MINIBIA_SERVER_INFO_SOURCE_PATH)),
    fetchJson(fetchImpl, resolveUrl(baseUrl, MINIBIA_SERVER_STATUS_SOURCE_PATH)),
  ]);

  return {
    rawLibrary,
    rawServerInfo,
    rawServerStatus,
  };
}

export async function refreshMinibiaData({
  baseUrl = MINIBIA_BASE_URL,
  dataRoot = MINIBIA_DATA_ROOT,
  generatedAt = new Date(),
  fetchImpl = globalThis.fetch,
  snapshotRetentionCount = MINIBIA_SNAPSHOT_RETENTION_COUNT,
} = {}) {
  const sourceData = await fetchMinibiaSourceData({
    baseUrl,
    fetchImpl,
  });

  return writeMinibiaDataBundle({
    dataRoot,
    generatedAt,
    baseUrl,
    snapshotRetentionCount,
    ...sourceData,
  });
}

function parseCliArguments(argv = process.argv.slice(2)) {
  const options = {
    baseUrl: MINIBIA_BASE_URL,
    dataRoot: MINIBIA_DATA_ROOT,
    generatedAt: new Date(),
    snapshotRetentionCount: MINIBIA_SNAPSHOT_RETENTION_COUNT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-url") {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${argument}`);
      }
      options.baseUrl = argv[index];
    } else if (argument === "--data-root") {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${argument}`);
      }
      options.dataRoot = path.resolve(argv[index]);
    } else if (argument === "--fetched-at") {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${argument}`);
      }
      options.generatedAt = argv[index];
    } else if (argument === "--snapshot-retention") {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${argument}`);
      }
      const retentionCount = Number(argv[index]);
      if (!Number.isInteger(retentionCount) || retentionCount < 1) {
        throw new Error(`${argument} must be a positive integer`);
      }
      options.snapshotRetentionCount = retentionCount;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function formatSummary(result) {
  const counts = result.currentDocuments;
  return [
    `generatedAt=${result.generatedAt}`,
    `dataRoot=${result.dataRoot}`,
    `snapshotDir=${result.snapshotDir}`,
    `spells=${counts.spells.count}`,
    `monsters=${counts.monsters.count}`,
    `npcs=${counts.npcs.count}`,
    `items=${counts.items.count}`,
    `runes=${counts.runes.count}`,
    `achievements=${counts.achievements.count}`,
    `prunedSnapshots=${Array.isArray(result.prunedSnapshotDirs) ? result.prunedSnapshotDirs.length : 0}`,
  ].join("\n");
}

function printHelp() {
  console.log(`Usage: node scripts/refresh-minibia-data.mjs [options]

Options:
  --base-url <url>     Override the Minibia base URL
  --data-root <path>   Override the output data directory
  --fetched-at <iso>   Use a fixed ISO timestamp for generated files
  --snapshot-retention <count>
                       Keep this many source snapshot directories
  --help               Show this help text`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseCliArguments();
    if (options.help) {
      printHelp();
    } else {
      const result = await refreshMinibiaData(options);
      console.log(formatSummary(result));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
