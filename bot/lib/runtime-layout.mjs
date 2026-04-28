import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function isTruthyEnvFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !["0", "false", "no", "off"].includes(normalized);
}

function normalizeCandidatePath(value = "") {
  const trimmed = String(value || "").trim();
  return trimmed ? path.resolve(trimmed) : "";
}

function resolveRepoBaseDir(baseDir, existsImpl = fs.existsSync) {
  const resolvedBaseDir = normalizeCandidatePath(baseDir) || process.cwd();
  if (existsImpl(path.join(resolvedBaseDir, "package.json"))) {
    return resolvedBaseDir;
  }

  const parentDir = path.resolve(resolvedBaseDir, "..");
  if (parentDir !== resolvedBaseDir && existsImpl(path.join(parentDir, "package.json"))) {
    return parentDir;
  }

  return resolvedBaseDir;
}

function resolvePortableRootFromExplicitValue(explicitValue, existsImpl = fs.existsSync) {
  const normalizedValue = normalizeCandidatePath(explicitValue);
  if (!normalizedValue) {
    return null;
  }

  const explicitBotDir = path.join(normalizedValue, "bot");
  const explicitClientDir = path.join(normalizedValue, "client");
  if (existsImpl(explicitBotDir) && existsImpl(explicitClientDir)) {
    return {
      rootDir: normalizedValue,
      botDir: explicitBotDir,
      clientDir: explicitClientDir,
    };
  }

  if (
    path.basename(normalizedValue).toLowerCase() === "bot"
    && existsImpl(path.join(normalizedValue, "package.json"))
    && existsImpl(path.join(path.dirname(normalizedValue), "client"))
  ) {
    return {
      rootDir: path.dirname(normalizedValue),
      botDir: normalizedValue,
      clientDir: path.join(path.dirname(normalizedValue), "client"),
    };
  }

  return null;
}

export function resolveRuntimeLayout({
  baseDir = process.cwd(),
  env = process.env,
  existsImpl = fs.existsSync,
} = {}) {
  const disablePortableAutoDetection = isTruthyEnvFlag(
    env.MINIBOT_DISABLE_PORTABLE_AUTO || env.MINIBIA_DISABLE_PORTABLE_AUTO || "",
  );
  const repoBaseDir = resolveRepoBaseDir(baseDir, existsImpl);
  const explicitPortableRoot = resolvePortableRootFromExplicitValue(
    env.MINIBOT_PORTABLE_ROOT || env.MINIBIA_PORTABLE_ROOT || "",
    existsImpl,
  );
  const autoPortableRoot = disablePortableAutoDetection
    ? null
    : (
    path.basename(repoBaseDir).toLowerCase() === "bot"
    && existsImpl(path.join(repoBaseDir, "package.json"))
    && existsImpl(path.join(path.dirname(repoBaseDir), "client"))
  )
    ? {
        rootDir: path.dirname(repoBaseDir),
        botDir: repoBaseDir,
        clientDir: path.join(path.dirname(repoBaseDir), "client"),
      }
    : null;
  const portableRoot = explicitPortableRoot || autoPortableRoot;
  const portable = Boolean(portableRoot);
  const botDir = portableRoot?.botDir || repoBaseDir;
  const rootDir = portableRoot?.rootDir || repoBaseDir;
  const clientDir = portableRoot?.clientDir || null;
  const storageDir = portable ? path.join(botDir, "storage") : null;
  const runtimeDir = portable && storageDir ? path.join(storageDir, "runtime") : null;
  const homeDir = portable
    ? path.join(storageDir, "home")
    : os.homedir();
  const configDir = path.join(homeDir, ".config", "minibot");
  const routeProfileDir = path.join(homeDir, "Minibot", "cavebots");
  const portableClientSeedUserDataDir = portable && clientDir
    ? path.join(clientDir, "chrome-profile")
    : null;
  const managedBrowserUserDataDir = portable
    ? path.join(runtimeDir, "browser", "managed-chrome-profile")
    : null;

  return {
    portable,
    rootDir,
    repoBaseDir,
    botDir,
    clientDir,
    storageDir,
    homeDir,
    runtimeDir,
    configDir,
    routeProfileDir,
    electronUserDataDir: portable ? path.join(runtimeDir, "electron", "Minibot") : null,
    managedBrowserUserDataDir,
    portableClientSeedUserDataDir,
    portableClientMetaPath: portable && clientDir
      ? path.join(clientDir, "client-meta.json")
      : null,
  };
}
