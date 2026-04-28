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
    FakeWebSocket.autoOpen = true;
    FakeWebSocket.respondToEvaluate = false;
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
    FakeWebSocket.autoOpen = true;
    FakeWebSocket.respondToEvaluate = false;
    globalThis.WebSocket = originalWebSocket;
  }
});
