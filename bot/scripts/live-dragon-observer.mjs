#!/usr/bin/env node

import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { CdpPage } from "../lib/bot-core.mjs";

const DEFAULT_CONTROL_INFO = "bot/storage/home/.config/minibot/control-socket.json";
const DEFAULT_OUT_DIR = "bot/tmp/live-dragon-observer";
const DEFAULT_INTERVAL_MS = 3_000;
const DEFAULT_SAMPLES = 40;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    controlInfo: DEFAULT_CONTROL_INFO,
    outDir: DEFAULT_OUT_DIR,
    intervalMs: DEFAULT_INTERVAL_MS,
    samples: DEFAULT_SAMPLES,
    routeName: "Venore Dragons East",
    port: 9224,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--control-info") {
      options.controlInfo = argv[++index] || options.controlInfo;
    } else if (arg === "--out-dir") {
      options.outDir = argv[++index] || options.outDir;
    } else if (arg === "--interval-ms") {
      options.intervalMs = Math.max(250, Math.trunc(Number(argv[++index]) || options.intervalMs));
    } else if (arg === "--samples") {
      options.samples = Math.max(1, Math.trunc(Number(argv[++index]) || options.samples));
    } else if (arg === "--route-name") {
      options.routeName = argv[++index] || options.routeName;
    } else if (arg === "--port") {
      options.port = Math.max(1, Math.trunc(Number(argv[++index]) || options.port));
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node bot/scripts/live-dragon-observer.mjs --samples 40 --interval-ms 3000

Options:
  --control-info <path>  Control socket discovery file.
  --out-dir <path>       Output directory for JSON and PNG captures.
  --interval-ms <ms>     Delay between samples, defaults to ${DEFAULT_INTERVAL_MS}.
  --samples <n>          Number of samples, defaults to ${DEFAULT_SAMPLES}.
  --route-name <name>    Route name to focus, defaults to Venore Dragons East.
  --port <port>          DevTools port, defaults to 9224.`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeSlug(value = "") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "session";
}

async function readControlInfo(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const info = JSON.parse(raw);
  if (info.transport && info.transport !== "tcp") {
    throw new Error(`Only TCP control sockets are supported by this observer, got ${info.transport}.`);
  }
  return {
    host: info.host || "127.0.0.1",
    port: Math.max(1, Math.trunc(Number(info.port) || 17373)),
  };
}

function controlRequest(address, request, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(address);
    let buffer = "";
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error(`Control request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    function settle(fn, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      socket.end();
      fn(value);
    }

    socket.setEncoding("utf8");
    socket.on("connect", () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      const line = buffer.slice(0, newline).trim();
      if (!line) return;
      try {
        const response = JSON.parse(line);
        if (!response.ok) {
          const message = response?.error?.message || "Control request failed.";
          settle(reject, new Error(message));
          return;
        }
        settle(resolve, response.result);
      } catch (error) {
        settle(reject, error);
      }
    });
    socket.on("error", (error) => settle(reject, error));
  });
}

async function getPageTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) {
    throw new Error(`DevTools target list failed with HTTP ${response.status}.`);
  }
  return response.json();
}

function summarizeSession(session = {}) {
  const trace = session.decisionTrace || {};
  const blocker = trace.blocker || trace.current || null;
  const follow = session.followTrainStatus || {};
  const target = session.currentTarget || session.targetScoring?.selectedTargetName || null;
  return {
    id: session.id,
    characterName: session.characterName,
    routeName: session.routeName,
    running: Boolean(session.running),
    routeIndex: Number.isInteger(session.routeIndex) ? session.routeIndex : null,
    overlayFocusIndex: Number.isInteger(session.overlayFocusIndex) ? session.overlayFocusIndex : null,
    routeState: session.routeState || null,
    position: session.playerPosition || null,
    healthPercent: session.playerStats?.healthPercent ?? null,
    manaPercent: session.playerStats?.manaPercent ?? null,
    visiblePlayers: session.visiblePlayerNames || [],
    currentTarget: typeof target === "string" ? target : target?.name || "",
    follow: {
      enabled: follow.enabled === true,
      active: follow.active === true,
      pilot: follow.pilot === true,
      selfIndex: Number.isInteger(follow.selfIndex) ? follow.selfIndex : null,
      leaderName: follow.leaderName || "",
      state: follow.currentState || "",
      nativeFollowActive: follow.nativeFollowActive === true,
      lastSeenPosition: follow.lastSeenPosition || null,
      desyncCount: Number.isInteger(follow.desyncCount) ? follow.desyncCount : null,
      rejoinAttempts: Number.isInteger(follow.rejoinAttempts) ? follow.rejoinAttempts : null,
    },
    blocker: blocker ? {
      owner: blocker.owner || "",
      state: blocker.state || "",
      reason: blocker.reason || "",
      action: blocker.action || null,
      result: blocker.result || null,
    } : null,
    stuck: {
      route: session.routeTelemetry?.stuck === true,
      waypointIndex: session.routeTelemetry?.stuckWaypointIndex ?? null,
      reason: session.routeTelemetry?.stuckReason || "",
      ledgerCount: session.huntLedger?.stucks ?? null,
      recent: Array.isArray(session.huntLedger?.recentEvents)
        ? session.huntLedger.recentEvents
          .filter((event) => event?.type === "stuck")
          .slice(0, 6)
        : [],
    },
    diagnostics: session.runtimeDiagnostics || null,
  };
}

async function captureScreenshot(target, filePath) {
  if (!target?.webSocketDebuggerUrl) return false;
  const cdp = new CdpPage(target.webSocketDebuggerUrl, { commandTimeoutMs: 8_000 });
  try {
    await cdp.connect();
    const result = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    }, { timeoutMs: 8_000 });
    if (!result?.data) return false;
    await fs.writeFile(filePath, Buffer.from(result.data, "base64"));
    return true;
  } finally {
    cdp.close();
  }
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const outDir = path.resolve(options.outDir);
  await fs.mkdir(outDir, { recursive: true });

  const controlInfo = await readControlInfo(options.controlInfo);
  const runStartedAt = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(outDir, runStartedAt);
  await fs.mkdir(runDir, { recursive: true });

  const metadata = {
    startedAt: new Date().toISOString(),
    intervalMs: options.intervalMs,
    samples: options.samples,
    routeName: options.routeName,
    controlInfo,
    devtoolsPort: options.port,
  };
  await fs.writeFile(path.join(runDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`live-dragon-observer writing ${options.samples} samples to ${runDir}`);

  for (let sample = 0; sample < options.samples; sample += 1) {
    const sampleAt = new Date();
    const sampleStamp = sampleAt.toISOString().replace(/[:.]/g, "-");
    const state = await controlRequest(controlInfo, { id: sample + 1, method: "sessions" });
    const targets = await getPageTargets(options.port).catch(() => []);
    const targetById = new Map(
      targets
        .filter((target) => target?.type === "page")
        .map((target) => [target.id, target]),
    );
    const sessions = Array.isArray(state?.sessions) ? state.sessions : [];
    const observed = sessions
      .filter((session) => String(session?.routeName || "").trim() === options.routeName)
      .map(summarizeSession);

    const samplePayload = {
      sample,
      capturedAt: sampleAt.toISOString(),
      activeSessionId: state?.activeSessionId || "",
      sessions: observed,
    };
    await fs.writeFile(
      path.join(runDir, `${String(sample).padStart(3, "0")}-${sampleStamp}.json`),
      `${JSON.stringify(samplePayload, null, 2)}\n`,
    );

    for (const session of observed) {
      const target = targetById.get(session.id);
      const screenshotPath = path.join(
        runDir,
        `${String(sample).padStart(3, "0")}-${safeSlug(session.characterName)}.png`,
      );
      await captureScreenshot(target, screenshotPath).catch((error) => {
        console.error(`screenshot failed for ${session.characterName}: ${error.message}`);
        return false;
      });
    }

    const line = observed.map((session) => {
      const pos = session.position
        ? `${session.position.x},${session.position.y},${session.position.z}`
        : "?, ?, ?";
      const route = `#${session.routeIndex}`;
      const follow = session.follow.enabled
        ? `${session.follow.pilot ? "pilot" : "follow"}:${session.follow.state || "?"}`
        : "solo";
      const stuck = session.stuck.recent?.[0]
        ? ` stuck@${session.stuck.recent[0].waypointIndex}:${session.stuck.recent[0].reason}`
        : "";
      return `${session.characterName} ${route} ${pos} ${follow}${stuck}`;
    }).join(" | ");
    console.log(`${String(sample).padStart(3, "0")} ${line}`);

    if (sample < options.samples - 1) {
      await delay(options.intervalMs);
    }
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
