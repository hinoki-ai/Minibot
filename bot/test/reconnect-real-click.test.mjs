import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CdpPage, MinibiaTargetBot } from "../lib/bot-core.mjs";

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findChromePath() {
  return CHROME_CANDIDATES.find((candidate) => existsSync(candidate)) || "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevToolsPort(userDataDir, stderrLines) {
  const file = path.join(userDataDir, "DevToolsActivePort");
  for (let index = 0; index < 100; index += 1) {
    if (existsSync(file)) {
      const [port] = String(await readFile(file, "utf8")).trim().split(/\n/);
      if (port) return Number(port);
    }
    await sleep(100);
  }
  throw new Error(`Chrome did not expose DevToolsActivePort. ${stderrLines.join("\n")}`);
}

async function waitForTestPage(port) {
  for (let index = 0; index < 100; index += 1) {
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const page = pages.find((entry) => (
      entry?.type === "page"
      && String(entry?.url || "").startsWith("data:text/html")
      && entry?.webSocketDebuggerUrl
    ));
    if (page) return page;
    await sleep(100);
  }
  throw new Error("Could not find Chrome reconnect test page.");
}

async function stopChrome(child) {
  if (child.exitCode != null || child.signalCode != null) {
    return;
  }

  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(1000)]);
  if (child.exitCode == null && child.signalCode == null) {
    child.kill("SIGKILL");
    await Promise.race([exited, sleep(1000)]);
  }
}

test("reconnectNow dispatches a trusted browser click when input control is enabled", {
  skip: findChromePath() ? false : "Chrome binary unavailable",
}, async () => {
  const chromePath = findChromePath();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "minibia-reconnect-chrome-"));
  const stderrLines = [];
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body { margin: 0; width: 800px; height: 600px; }
#reconnect-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.08); }
#reconnect-now-btn { position: absolute; left: 220px; top: 180px; width: 180px; height: 48px; }
</style></head><body>
<div id="reconnect-overlay">
  <button id="reconnect-now-btn">Reconnect</button>
  <div id="reconnect-message">Connection lost.</div>
</div>
<script>
window.__clickLog = [];
window.gameClient = {
  player: { isDead: false, state: { isDead: false } },
  networkManager: {
    state: { connected: false },
    __wasConnected: true,
    __reconnecting: false,
    __intentionalClose: false,
    __serverError: "",
    reconnectNow() { window.__clickLog.push({ type: "method" }); }
  }
};
document.getElementById("reconnect-now-btn").addEventListener("click", (event) => {
  window.__clickLog.push({
    type: "click",
    isTrusted: event.isTrusted,
    clientX: event.clientX,
    clientY: event.clientY,
  });
  window.gameClient.networkManager.__reconnecting = true;
  document.getElementById("reconnect-message").textContent = "Reconnecting...";
});
</script></body></html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  const child = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-sandbox",
    dataUrl,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let cdp = null;

  child.stderr.on("data", (chunk) => {
    stderrLines.push(String(chunk));
  });

  try {
    const port = await waitForDevToolsPort(userDataDir, stderrLines);
    const page = await waitForTestPage(port);
    cdp = new CdpPage(page.webSocketDebuggerUrl);
    await cdp.connect();

    const bot = new MinibiaTargetBot({ inputControlEnabled: true });
    bot.cdp = cdp;

    const result = await bot.reconnectNow();
    const clickLog = await cdp.evaluate("window.__clickLog");
    const firstClick = clickLog.find((entry) => entry.type === "click");

    assert.equal(result.ok, true);
    assert.equal(result.started, true);
    assert.equal(result.clicked, true);
    assert.equal(result.action, "input-mouse-click");
    assert.equal(result.reconnecting, true);
    assert.equal(result.message, "Reconnecting...");
    assert.equal(firstClick?.isTrusted, true);
    assert.equal(firstClick?.clientX, result.x);
    assert.equal(firstClick?.clientY, result.y);
    assert.equal(clickLog.some((entry) => entry.type === "method"), false);
  } finally {
    cdp?.close?.();
    await stopChrome(child);
    await rm(userDataDir, { recursive: true, force: true });
  }
});
