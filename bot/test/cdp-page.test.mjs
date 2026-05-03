import test from "node:test";
import assert from "node:assert/strict";
import { CdpPage } from "../lib/bot-core.mjs";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static autoOpen = true;
  static respondToEvaluate = false;
  static respondToCompile = false;
  static respondToRunScript = false;
  static compileScriptUnsupported = false;
  static sentMessages = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;

    if (FakeWebSocket.autoOpen) {
      queueMicrotask(() => {
        if (this.readyState !== FakeWebSocket.CONNECTING) {
          return;
        }

        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.();
      });
    }
  }

  send(payload) {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new Error("Socket is not open");
    }

    const message = JSON.parse(payload);
    FakeWebSocket.sentMessages.push(message);

    if (message.method === "Runtime.enable") {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            result: {},
          }),
        });
      });
      return;
    }

    if (message.method === "Runtime.compileScript" && FakeWebSocket.compileScriptUnsupported) {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            error: {
              message: "Runtime.compileScript wasn't found",
            },
          }),
        });
      });
      return;
    }

    if (message.method === "Runtime.compileScript" && FakeWebSocket.respondToCompile) {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            result: {
              scriptId: "compiled-script-1",
            },
          }),
        });
      });
      return;
    }

    if (message.method === "Runtime.runScript" && FakeWebSocket.respondToRunScript) {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            result: {
              result: {
                value: 84,
              },
            },
          }),
        });
      });
      return;
    }

    if (message.method === "Runtime.evaluate" && FakeWebSocket.respondToEvaluate) {
      queueMicrotask(() => {
        this.onmessage?.({
          data: JSON.stringify({
            id: message.id,
            result: {
              result: {
                value: 42,
              },
            },
          }),
        });
      });
    }
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }

    this.readyState = FakeWebSocket.CLOSED;
    queueMicrotask(() => {
      this.onclose?.();
    });
  }
}

function resetFakeWebSocket() {
  FakeWebSocket.autoOpen = true;
  FakeWebSocket.respondToEvaluate = false;
  FakeWebSocket.respondToCompile = false;
  FakeWebSocket.respondToRunScript = false;
  FakeWebSocket.compileScriptUnsupported = false;
  FakeWebSocket.sentMessages = [];
}

test("CdpPage times out stuck commands, closes the socket, and can reconnect", async () => {
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.autoOpen = true;
  FakeWebSocket.respondToEvaluate = false;

  try {
    const cdp = new CdpPage("ws://minibot.test/devtools/page/1", {
      commandTimeoutMs: 20,
    });

    await cdp.connect();
    assert.equal(cdp.isOpen(), true);

    await assert.rejects(
      cdp.evaluate("window.gameClient"),
      /CDP Runtime\.evaluate timed out after 20ms\./,
    );

    assert.equal(cdp.isOpen(), false);

    FakeWebSocket.respondToEvaluate = true;
    await cdp.connect();

    const value = await cdp.evaluate("40 + 2");
    assert.equal(value, 42);
    assert.equal(cdp.isOpen(), true);

    cdp.close();
    assert.equal(cdp.isOpen(), false);
  } finally {
    resetFakeWebSocket();
    globalThis.WebSocket = originalWebSocket;
  }
});

test("CdpPage times out stuck connects and closes the socket", async () => {
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.autoOpen = false;

  try {
    const cdp = new CdpPage("ws://minibot.test/devtools/page/2", {
      connectTimeoutMs: 20,
      commandTimeoutMs: 50,
    });

    await assert.rejects(
      cdp.connect(),
      /CDP connect timed out after 20ms\./,
    );

    assert.equal(cdp.isOpen(), false);
  } finally {
    resetFakeWebSocket();
    globalThis.WebSocket = originalWebSocket;
  }
});

test("CdpPage evaluateCached compiles repeated expressions once and reuses the script id", async () => {
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.autoOpen = true;
  FakeWebSocket.respondToCompile = true;
  FakeWebSocket.respondToRunScript = true;

  try {
    const cdp = new CdpPage("ws://minibot.test/devtools/page/3", {
      commandTimeoutMs: 50,
    });

    await cdp.connect();
    const firstValue = await cdp.evaluateCached("40 + 2", { sourceURL: "minibot://test/state.js" });
    const secondValue = await cdp.evaluateCached("40 + 2", { sourceURL: "minibot://test/state.js" });

    assert.equal(firstValue, 84);
    assert.equal(secondValue, 84);
    assert.equal(
      FakeWebSocket.sentMessages.filter((message) => message.method === "Runtime.compileScript").length,
      1,
    );
    assert.equal(
      FakeWebSocket.sentMessages.filter((message) => message.method === "Runtime.runScript").length,
      2,
    );
    assert.equal(
      FakeWebSocket.sentMessages.filter((message) => message.method === "Runtime.evaluate").length,
      0,
    );

    cdp.close();
  } finally {
    resetFakeWebSocket();
    globalThis.WebSocket = originalWebSocket;
  }
});

test("CdpPage evaluateCached falls back to direct evaluation when script caching is unsupported", async () => {
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = FakeWebSocket;
  FakeWebSocket.autoOpen = true;
  FakeWebSocket.compileScriptUnsupported = true;
  FakeWebSocket.respondToEvaluate = true;

  try {
    const cdp = new CdpPage("ws://minibot.test/devtools/page/4", {
      commandTimeoutMs: 50,
    });

    await cdp.connect();
    const value = await cdp.evaluateCached("40 + 2");

    assert.equal(value, 42);
    assert.equal(
      FakeWebSocket.sentMessages.filter((message) => message.method === "Runtime.compileScript").length,
      1,
    );
    assert.equal(
      FakeWebSocket.sentMessages.filter((message) => message.method === "Runtime.evaluate").length,
      1,
    );

    cdp.close();
  } finally {
    resetFakeWebSocket();
    globalThis.WebSocket = originalWebSocket;
  }
});
