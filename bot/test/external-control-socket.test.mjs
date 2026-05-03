import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createExternalControlSocket } from "../lib/external-control-socket.mjs";

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "minibot-control-"));
}

function connectClient(info) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: info.host,
      port: info.port,
    });
    socket.setEncoding("utf8");
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

function readJsonLine(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    const onData = (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) {
        return;
      }

      cleanup();
      try {
        resolve(JSON.parse(buffer.slice(0, newlineIndex)));
      } catch (error) {
        reject(error);
      }
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };

    socket.on("data", onData);
    socket.once("error", onError);
  });
}

function writeRequest(socket, request) {
  socket.write(`${JSON.stringify(request)}\n`);
}

test("external control socket handles requests and broadcasts subscribed events", async () => {
  const configDir = await makeTempDir();
  const controller = createExternalControlSocket({
    configDir,
    env: {
      MINIBOT_CONTROL_PORT: "0",
    },
    dispatcher: async (method, params) => ({
      method,
      params,
    }),
    logger: {
      info() { },
      warn() { },
    },
  });

  const info = await controller.start();
  assert.equal(info.running, true);
  assert.equal(info.transport, "tcp");
  assert.ok(info.port > 0);

  const persistedInfo = JSON.parse(await fs.readFile(path.join(configDir, "control-socket.json"), "utf8"));
  assert.equal(persistedInfo.port, info.port);
  assert.equal(persistedInfo.token, undefined);

  const socket = await connectClient(info);
  try {
    writeRequest(socket, {
      id: "echo-1",
      method: "echo",
      params: { value: 7 },
    });
    assert.deepEqual(await readJsonLine(socket), {
      id: "echo-1",
      ok: true,
      result: {
        method: "echo",
        params: { value: 7 },
      },
    });

    writeRequest(socket, {
      id: "sub-1",
      method: "subscribe",
    });
    assert.deepEqual(await readJsonLine(socket), {
      id: "sub-1",
      ok: true,
      result: { subscribed: true },
    });

    controller.broadcast({
      type: "state",
      statePatch: true,
    });
    assert.deepEqual(await readJsonLine(socket), {
      event: "bb:event",
      data: {
        type: "state",
        statePatch: true,
      },
    });
  } finally {
    socket.destroy();
    await controller.stop();
    await fs.rm(configDir, { recursive: true, force: true });
  }
});

test("external control socket requires auth when a token is configured", async () => {
  const configDir = await makeTempDir();
  const controller = createExternalControlSocket({
    configDir,
    env: {
      MINIBOT_CONTROL_PORT: "0",
      MINIBOT_CONTROL_TOKEN: "secret-token",
    },
    dispatcher: async (method, params) => ({ method, params }),
    logger: {
      info() { },
      warn() { },
    },
  });

  const info = await controller.start();
  assert.equal(info.tokenRequired, true);

  const socket = await connectClient(info);
  try {
    writeRequest(socket, {
      id: 1,
      method: "echo",
    });
    const rejected = await readJsonLine(socket);
    assert.equal(rejected.id, 1);
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error.code, "unauthorized");

    writeRequest(socket, {
      id: 2,
      method: "auth",
      token: "secret-token",
    });
    assert.deepEqual(await readJsonLine(socket), {
      id: 2,
      ok: true,
      result: { authenticated: true },
    });

    writeRequest(socket, {
      id: 3,
      method: "echo",
      params: {
        token: "secret-token",
        value: 9,
      },
    });
    assert.deepEqual(await readJsonLine(socket), {
      id: 3,
      ok: true,
      result: {
        method: "echo",
        params: { value: 9 },
      },
    });
  } finally {
    socket.destroy();
    await controller.stop();
    await fs.rm(configDir, { recursive: true, force: true });
  }
});

test("external control socket removes stale discovery files when disabled", async () => {
  const configDir = await makeTempDir();
  const infoFilePath = path.join(configDir, "control-socket.json");
  await fs.writeFile(infoFilePath, "{}\n");

  const controller = createExternalControlSocket({
    configDir,
    env: {
      MINIBOT_CONTROL_SOCKET: "0",
    },
    dispatcher: async () => ({}),
    logger: {
      info() { },
      warn() { },
    },
  });

  const info = await controller.start();
  assert.equal(info.enabled, false);
  await assert.rejects(fs.stat(infoFilePath));
  await fs.rm(configDir, { recursive: true, force: true });
});
