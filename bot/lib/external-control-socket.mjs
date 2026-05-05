import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const DEFAULT_CONTROL_HOST = "127.0.0.1";
const DEFAULT_CONTROL_PORT = 17373;
const DEFAULT_INFO_FILE_NAME = "control-socket.json";
const DEFAULT_MAX_MESSAGE_BYTES = 4 * 1024 * 1024;

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function isFalsyEnvFlag(value) {
  const normalized = normalizeText(value).toLowerCase();
  return ["0", "false", "no", "off", "disabled"].includes(normalized);
}

function isTruthyEnvFlag(value) {
  const normalized = normalizeText(value).toLowerCase();
  return Boolean(normalized) && !isFalsyEnvFlag(normalized);
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeControlSocketOptions({
  configDir = process.cwd(),
  env = process.env,
  platform = process.platform,
} = {}) {
  const enabledValue = env.MINIBOT_CONTROL_SOCKET ?? env.MINIBIA_CONTROL_SOCKET ?? "1";
  const enabled = !isFalsyEnvFlag(enabledValue);
  const socketPath = normalizeText(env.MINIBOT_CONTROL_SOCKET_PATH || env.MINIBIA_CONTROL_SOCKET_PATH || "");
  const transport = socketPath ? "path" : "tcp";
  const defaultInfoFilePath = path.join(configDir, DEFAULT_INFO_FILE_NAME);
  const infoFilePath = path.resolve(normalizeText(env.MINIBOT_CONTROL_INFO_PATH || "") || defaultInfoFilePath);
  const host = normalizeText(env.MINIBOT_CONTROL_HOST || env.MINIBIA_CONTROL_HOST || "") || DEFAULT_CONTROL_HOST;
  const port = normalizePositiveInteger(
    env.MINIBOT_CONTROL_PORT ?? env.MINIBIA_CONTROL_PORT,
    DEFAULT_CONTROL_PORT,
  );

  return {
    enabled,
    transport,
    platform,
    host,
    port,
    socketPath: socketPath ? path.resolve(socketPath) : "",
    infoFilePath,
    token: normalizeText(env.MINIBOT_CONTROL_TOKEN || env.MINIBIA_CONTROL_TOKEN || ""),
    allowRawCdp: isTruthyEnvFlag(env.MINIBOT_CONTROL_ALLOW_RAW_CDP || ""),
    required: isTruthyEnvFlag(env.MINIBOT_CONTROL_REQUIRED || ""),
    maxMessageBytes: normalizePositiveInteger(env.MINIBOT_CONTROL_MAX_MESSAGE_BYTES, DEFAULT_MAX_MESSAGE_BYTES)
      || DEFAULT_MAX_MESSAGE_BYTES,
  };
}

function normalizeRequestId(value) {
  if (value == null) {
    return null;
  }
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return value;
  }
  return String(value);
}

function buildErrorPayload(error, fallbackCode = "error") {
  const code = normalizeText(error?.code || fallbackCode) || fallbackCode;
  const message = normalizeText(error?.message || error) || "External control command failed.";
  return {
    code,
    message,
  };
}

function getRequestToken(request = {}) {
  return normalizeText(request.token || request.authToken || request.params?.token || "");
}

function sanitizeDispatcherParams(params = {}) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return params;
  }

  const sanitized = { ...params };
  delete sanitized.token;
  delete sanitized.authToken;
  return sanitized;
}

function removeStaleSocketPath(socketPath) {
  if (!socketPath) {
    return;
  }

  try {
    fs.rmSync(socketPath, { force: true });
  } catch { }
}

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function safeJsonStringify(value) {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") {
      return entry.toString();
    }
    return entry;
  });
}

function normalizeAddress(server, options) {
  const address = server.address();
  if (typeof address === "string") {
    return {
      transport: "path",
      socketPath: address,
      host: "",
      port: null,
    };
  }

  return {
    transport: "tcp",
    socketPath: "",
    host: address?.address || options.host,
    port: Number.isInteger(address?.port) ? address.port : options.port,
  };
}

function listen(server, options) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);

    if (options.transport === "path") {
      fs.mkdirSync(path.dirname(options.socketPath), { recursive: true });
      server.listen(options.socketPath);
      return;
    }

    server.listen({
      host: options.host,
      port: options.port,
    });
  });
}

export function createExternalControlSocket({
  dispatcher,
  configDir,
  env = process.env,
  platform = process.platform,
  logger = console,
  getRuntimeInfo = () => ({}),
} = {}) {
  if (typeof dispatcher !== "function") {
    throw new TypeError("External control socket requires a dispatcher function.");
  }

  const options = normalizeControlSocketOptions({ configDir, env, platform });
  const clients = new Set();
  let server = null;
  let publicInfo = {
    enabled: options.enabled,
    running: false,
    transport: options.transport,
    host: options.host,
    port: options.transport === "tcp" ? options.port : null,
    socketPath: options.socketPath,
    infoFilePath: options.infoFilePath,
    tokenRequired: Boolean(options.token),
    allowRawCdp: Boolean(options.allowRawCdp),
    pid: process.pid,
  };

  function getPublicInfo() {
    return {
      ...publicInfo,
      ...getRuntimeInfo(),
      tokenRequired: Boolean(options.token),
      token: undefined,
    };
  }

  function send(socket, payload) {
    if (socket.destroyed) {
      return false;
    }

    try {
      socket.write(`${safeJsonStringify(payload)}\n`);
      return true;
    } catch {
      return false;
    }
  }

  function sendError(socket, id, error, code = "error") {
    return send(socket, {
      id,
      ok: false,
      error: buildErrorPayload(error, code),
    });
  }

  function buildClientContext(client) {
    return {
      authenticated: Boolean(client.authenticated),
      subscribed: Boolean(client.subscribed),
      remoteAddress: client.socket.remoteAddress || "",
      remotePort: client.socket.remotePort || null,
      info: getPublicInfo(),
    };
  }

  async function handleRequest(client, request) {
    const id = normalizeRequestId(request?.id);
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      sendError(client.socket, id, new Error("Request must be a JSON object."), "invalid-request");
      return;
    }

    const method = normalizeText(request.method || request.command || "");
    if (!method) {
      sendError(client.socket, id, new Error("Request method is required."), "invalid-request");
      return;
    }

    if (method === "ping") {
      send(client.socket, {
        id,
        ok: true,
        result: {
          pong: true,
          authenticated: Boolean(client.authenticated),
          ...getPublicInfo(),
        },
      });
      return;
    }

    if (method === "info") {
      send(client.socket, {
        id,
        ok: true,
        result: getPublicInfo(),
      });
      return;
    }

    if (method === "auth") {
      if (!options.token || getRequestToken(request) === options.token) {
        client.authenticated = true;
        send(client.socket, {
          id,
          ok: true,
          result: {
            authenticated: true,
          },
        });
        return;
      }

      sendError(client.socket, id, new Error("Invalid external control token."), "unauthorized");
      return;
    }

    if (options.token && !client.authenticated) {
      if (getRequestToken(request) === options.token) {
        client.authenticated = true;
      } else {
        sendError(client.socket, id, new Error("External control token is required."), "unauthorized");
        return;
      }
    }

    if (method === "subscribe") {
      client.subscribed = true;
      send(client.socket, {
        id,
        ok: true,
        result: {
          subscribed: true,
        },
      });
      return;
    }

    if (method === "unsubscribe") {
      client.subscribed = false;
      send(client.socket, {
        id,
        ok: true,
        result: {
          subscribed: false,
        },
      });
      return;
    }

    try {
      const result = await dispatcher(method, sanitizeDispatcherParams(request.params ?? {}), buildClientContext(client));
      send(client.socket, {
        id,
        ok: true,
        result,
      });
    } catch (error) {
      sendError(client.socket, id, error);
    }
  }

  function handleClient(socket) {
    const client = {
      socket,
      buffer: "",
      authenticated: !options.token,
      subscribed: false,
    };

    clients.add(client);
    socket.setEncoding("utf8");

    socket.on("data", (chunk) => {
      client.buffer += chunk;
      if (Buffer.byteLength(client.buffer, "utf8") > options.maxMessageBytes) {
        sendError(socket, null, new Error("External control message is too large."), "message-too-large");
        socket.destroy();
        return;
      }

      const lines = client.buffer.split(/\r?\n/);
      client.buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        let request;
        try {
          request = JSON.parse(trimmed);
        } catch (error) {
          sendError(socket, null, error, "parse-error");
          continue;
        }

        void handleRequest(client, request);
      }
    });

    socket.on("close", () => {
      clients.delete(client);
    });
    socket.on("error", () => {
      clients.delete(client);
    });
  }

  async function start() {
    if (!options.enabled) {
      try {
        fs.rmSync(options.infoFilePath, { force: true });
      } catch { }
      return getPublicInfo();
    }
    if (server) {
      return getPublicInfo();
    }

    server = net.createServer(handleClient);
    let listenOptions = options;
    if (options.transport === "path") {
      removeStaleSocketPath(options.socketPath);
    }

    try {
      await listen(server, listenOptions);
    } catch (error) {
      if (
        options.transport === "tcp"
        && options.port === DEFAULT_CONTROL_PORT
        && error?.code === "EADDRINUSE"
      ) {
        server = net.createServer(handleClient);
        listenOptions = {
          ...options,
          port: 0,
        };
        await listen(server, listenOptions);
      } else {
        server = null;
        if (options.required) {
          throw error;
        }
        logger.warn?.(`External control socket disabled: ${error.message}`);
        publicInfo = {
          ...publicInfo,
          running: false,
          error: error.message,
        };
        return getPublicInfo();
      }
    }

    const address = normalizeAddress(server, listenOptions);
    publicInfo = {
      enabled: true,
      running: true,
      pid: process.pid,
      infoFilePath: options.infoFilePath,
      tokenRequired: Boolean(options.token),
      allowRawCdp: Boolean(options.allowRawCdp),
      ...address,
    };
    writeJsonFile(options.infoFilePath, getPublicInfo());
    logger.info?.(
      address.transport === "tcp"
        ? `External control socket listening on ${address.host}:${address.port}`
        : `External control socket listening on ${address.socketPath}`,
    );
    return getPublicInfo();
  }

  async function stop() {
    for (const client of [...clients]) {
      try {
        client.socket.end();
      } catch { }
      try {
        client.socket.destroy();
      } catch { }
    }
    clients.clear();

    const activeServer = server;
    server = null;
    if (activeServer) {
      await new Promise((resolve) => {
        activeServer.close(() => resolve());
      }).catch(() => null);
    }

    try {
      fs.rmSync(options.infoFilePath, { force: true });
    } catch { }

    if (options.transport === "path") {
      removeStaleSocketPath(options.socketPath);
    }

    publicInfo = {
      ...publicInfo,
      running: false,
    };
    return getPublicInfo();
  }

  function broadcast(event) {
    const payload = {
      event: "bb:event",
      data: event,
    };

    for (const client of clients) {
      if (!client.subscribed || !client.authenticated) {
        continue;
      }
      send(client.socket, payload);
    }
  }

  function hasSubscribers() {
    for (const client of clients) {
      if (client.subscribed && client.authenticated) {
        return true;
      }
    }
    return false;
  }

  return {
    start,
    stop,
    broadcast,
    hasSubscribers,
    getPublicInfo,
  };
}
