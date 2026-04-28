import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveRuntimeLayout } from "../lib/runtime-layout.mjs";

test("resolveRuntimeLayout auto-detects the minibia/bot portable layout", () => {
  const layout = resolveRuntimeLayout({
    baseDir: "/tmp/minibia/bot",
    existsImpl: (candidate) => (
      candidate === "/tmp/minibia/bot/package.json"
      || candidate === "/tmp/minibia/client"
    ),
  });

  assert.equal(layout.portable, true);
  assert.equal(layout.rootDir, "/tmp/minibia");
  assert.equal(layout.botDir, "/tmp/minibia/bot");
  assert.equal(layout.clientDir, "/tmp/minibia/client");
  assert.equal(layout.storageDir, "/tmp/minibia/bot/storage");
  assert.equal(layout.configDir, "/tmp/minibia/bot/storage/home/.config/minibot");
  assert.equal(layout.routeProfileDir, "/tmp/minibia/bot/storage/home/Minibot/cavebots");
  assert.equal(layout.runtimeDir, "/tmp/minibia/bot/storage/runtime");
  assert.equal(layout.electronUserDataDir, "/tmp/minibia/bot/storage/runtime/electron/Minibot");
  assert.equal(layout.managedBrowserUserDataDir, "/tmp/minibia/bot/storage/runtime/browser/managed-chrome-profile");
  assert.equal(layout.portableClientSeedUserDataDir, "/tmp/minibia/client/chrome-profile");
});

test("resolveRuntimeLayout can disable portable auto-detection when requested", () => {
  const layout = resolveRuntimeLayout({
    baseDir: "/tmp/minibia/bot",
    env: {
      MINIBOT_DISABLE_PORTABLE_AUTO: "1",
    },
    existsImpl: (candidate) => (
      candidate === "/tmp/minibia/bot/package.json"
      || candidate === "/tmp/minibia/client"
    ),
  });

  assert.equal(layout.portable, false);
  assert.equal(layout.rootDir, "/tmp/minibia/bot");
  assert.equal(layout.botDir, "/tmp/minibia/bot");
  assert.equal(layout.clientDir, null);
});

test("config-store switches to portable bundle storage when MINIBOT_PORTABLE_ROOT is set", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-config-bundle-"));
  const previousPortableRoot = process.env.MINIBOT_PORTABLE_ROOT;

  try {
    await fs.mkdir(path.join(tempRoot, "bot"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "client"), { recursive: true });
    process.env.MINIBOT_PORTABLE_ROOT = tempRoot;

    const moduleUrl = new URL(`../lib/config-store.mjs?portable=${Date.now()}`, import.meta.url);
    const configStore = await import(moduleUrl.href);

    assert.equal(configStore.CONFIG_DIR, path.join(tempRoot, "bot", "storage", "home", ".config", "minibot"));
    assert.equal(configStore.PROFILE_DIR, path.join(tempRoot, "bot", "storage", "home", "Minibot", "cavebots"));
    assert.deepEqual(configStore.LEGACY_CONFIG_PATHS, []);
  } finally {
    if (previousPortableRoot == null) {
      delete process.env.MINIBOT_PORTABLE_ROOT;
    } else {
      process.env.MINIBOT_PORTABLE_ROOT = previousPortableRoot;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildPortableClientLaunchSpec targets the bundled client profile and app id", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-client-bundle-"));

  try {
    const botDir = path.join(tempRoot, "bot");
    const clientDir = path.join(tempRoot, "client");
    await fs.mkdir(botDir, { recursive: true });
    await fs.mkdir(clientDir, { recursive: true });
    await fs.writeFile(
      path.join(botDir, "package.json"),
      '{ "name": "minibot" }\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(clientDir, "client-meta.json"),
      `${JSON.stringify({
        appId: "portable-app-id",
        profileDirectory: "Portable",
        pageUrl: "https://minibia.com/play?pwa=1",
      }, null, 2)}\n`,
      "utf8",
    );

    const moduleUrl = new URL(`../scripts/launch-portable-client.mjs?portable=${Date.now()}`, import.meta.url);
    const portableClient = await import(moduleUrl.href);
    const spec = portableClient.buildPortableClientLaunchSpec({
      appBaseDir: botDir,
      browserPath: "/usr/bin/google-chrome",
      port: 9224,
    });

    assert.equal(spec.command, "/usr/bin/google-chrome");
    assert.ok(spec.args.includes(`--user-data-dir=${path.join(botDir, "storage", "runtime", "browser", "managed-chrome-profile")}`));
    assert.ok(spec.args.includes("--profile-directory=Portable"));
    assert.ok(spec.args.includes("--app-id=portable-app-id"));
    assert.ok(spec.args.includes("--remote-debugging-port=9224"));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildPortableClientLaunchSpec honors bundled app-url metadata by default", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-client-app-url-"));

  try {
    const botDir = path.join(tempRoot, "bot");
    const clientDir = path.join(tempRoot, "client");
    await fs.mkdir(botDir, { recursive: true });
    await fs.mkdir(clientDir, { recursive: true });
    await fs.writeFile(
      path.join(botDir, "package.json"),
      '{ "name": "minibot" }\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(clientDir, "client-meta.json"),
      `${JSON.stringify({
        appId: "portable-app-id",
        launchMode: "app-url",
        profileDirectory: "Default",
        pageUrl: "https://minibia.com/play?pwa=1",
      }, null, 2)}\n`,
      "utf8",
    );

    const moduleUrl = new URL(`../scripts/launch-portable-client.mjs?portable-app-url=${Date.now()}`, import.meta.url);
    const portableClient = await import(moduleUrl.href);
    const spec = portableClient.buildPortableClientLaunchSpec({
      appBaseDir: botDir,
      browserPath: "/usr/bin/google-chrome",
      port: 9224,
    });

    assert.ok(spec.args.includes("--app=https://minibia.com/play?pwa=1"));
    assert.equal(spec.args.some((arg) => arg.startsWith("--app-id=")), false);
    assert.equal(spec.args.includes("https://minibia.com/play"), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildPortableClientLaunchSpec reuses the saved live-client window size", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-client-window-size-"));

  try {
    const botDir = path.join(tempRoot, "bot");
    const clientDir = path.join(tempRoot, "client");
    const profileDir = path.join(botDir, "storage", "runtime", "browser", "managed-chrome-profile");
    await fs.mkdir(path.join(botDir, "storage", "runtime", "browser", "managed-chrome-profile", "Default"), { recursive: true });
    await fs.mkdir(clientDir, { recursive: true });
    await fs.writeFile(
      path.join(botDir, "package.json"),
      '{ "name": "minibot" }\n',
      "utf8",
    );
    await fs.writeFile(
      path.join(clientDir, "client-meta.json"),
      `${JSON.stringify({
        launchMode: "app-url",
        profileDirectory: "Default",
        pageUrl: "https://minibia.com/play?pwa=1",
      }, null, 2)}\n`,
      "utf8",
    );
    await fs.writeFile(
      path.join(profileDir, "Default", "Preferences"),
      `${JSON.stringify({
        browser: {
          app_window_placement: {
            minibia: {
              "com_/play": {
                left: 0,
                top: 0,
                right: 740,
                bottom: 647,
                maximized: false,
              },
            },
          },
        },
      })}\n`,
      "utf8",
    );

    const moduleUrl = new URL(`../scripts/launch-portable-client.mjs?portable-window-size=${Date.now()}`, import.meta.url);
    const portableClient = await import(moduleUrl.href);
    const spec = portableClient.buildPortableClientLaunchSpec({
      appBaseDir: botDir,
      browserPath: "/usr/bin/google-chrome",
      port: 9224,
    });

    assert.ok(spec.args.includes("--window-size=740,647"));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildMinibiaPwaSessionUrl keeps secondary launches inside the PWA URL", async () => {
  const moduleUrl = new URL(`../scripts/launch-portable-client.mjs?pwa-url=${Date.now()}`, import.meta.url);
  const portableClient = await import(moduleUrl.href);

  assert.equal(
    portableClient.buildMinibiaPwaSessionUrl("https://minibia.com/play", { session: 123 }),
    "https://minibia.com/play?pwa=1&session=123",
  );
  assert.equal(
    portableClient.buildMinibiaPwaSessionUrl("https://minibia.com/play?world=main&pwa=0", { session: "abc" }),
    "https://minibia.com/play?world=main&pwa=1&session=abc",
  );
});

test("preparePortableClientProfile preserves active profile locks unless cleanup is requested", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-client-locks-"));

  try {
    const targetDir = path.join(tempRoot, "managed-chrome-profile");
    await fs.mkdir(path.join(targetDir, "Default"), { recursive: true });
    await fs.writeFile(path.join(targetDir, "SingletonLock"), "active\n", "utf8");
    await fs.writeFile(path.join(targetDir, "SingletonSocket"), "active\n", "utf8");
    await fs.writeFile(path.join(targetDir, "Default", "LOCK"), "active\n", "utf8");
    await fs.writeFile(path.join(targetDir, "Default", "History"), "history\n", "utf8");

    const moduleUrl = new URL(`../scripts/launch-portable-client.mjs?portable-locks=${Date.now()}`, import.meta.url);
    const portableClient = await import(moduleUrl.href);

    portableClient.preparePortableClientProfile({
      profileDir: targetDir,
    });

    assert.equal(await fs.readFile(path.join(targetDir, "SingletonLock"), "utf8"), "active\n");
    assert.equal(await fs.readFile(path.join(targetDir, "SingletonSocket"), "utf8"), "active\n");
    assert.equal(await fs.readFile(path.join(targetDir, "Default", "LOCK"), "utf8"), "active\n");
    await assert.rejects(fs.access(path.join(targetDir, "Default", "History")));

    portableClient.preparePortableClientProfile({
      profileDir: targetDir,
      cleanupProfileLocks: true,
    });

    await assert.rejects(fs.access(path.join(targetDir, "SingletonLock")));
    await assert.rejects(fs.access(path.join(targetDir, "SingletonSocket")));
    await assert.rejects(fs.access(path.join(targetDir, "Default", "LOCK")));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("preparePortableClientProfile seeds a runtime-managed profile from the bundled client profile", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-client-seed-"));

  try {
    const seedDir = path.join(tempRoot, "client", "chrome-profile");
    const targetDir = path.join(tempRoot, "bot", "storage", "runtime", "browser", "managed-chrome-profile");
    await fs.mkdir(path.join(seedDir, "Default"), { recursive: true });
    await fs.mkdir(path.join(seedDir, "Default", "Cache"), { recursive: true });
    await fs.mkdir(path.join(seedDir, "Default", "Service Worker", "CacheStorage"), { recursive: true });
    await fs.mkdir(path.join(seedDir, "Default", "Sessions"), { recursive: true });
    await fs.writeFile(path.join(seedDir, "Local State"), '{"seed":true}\n', "utf8");
    await fs.writeFile(path.join(seedDir, "Default", "Preferences"), '{"profile":"seed"}\n', "utf8");
    await fs.writeFile(path.join(seedDir, "Default", "History"), "history\n", "utf8");
    await fs.writeFile(path.join(seedDir, "Default", "Cache", "entry"), "cache\n", "utf8");
    await fs.writeFile(path.join(seedDir, "Default", "Service Worker", "CacheStorage", "entry"), "cache-storage\n", "utf8");
    await fs.writeFile(path.join(seedDir, "Default", "Sessions", "Session_1"), "session\n", "utf8");

    const moduleUrl = new URL(`../scripts/launch-portable-client.mjs?portable-seed=${Date.now()}`, import.meta.url);
    const portableClient = await import(moduleUrl.href);
    portableClient.preparePortableClientProfile({
      profileDir: targetDir,
      seedProfileDir: seedDir,
    });

    assert.equal(await fs.readFile(path.join(targetDir, "Local State"), "utf8"), '{"seed":true}\n');
    assert.equal(await fs.readFile(path.join(targetDir, "Default", "Preferences"), "utf8"), '{"profile":"seed"}\n');
    await assert.rejects(fs.access(path.join(targetDir, "Default", "History")));
    await assert.rejects(fs.access(path.join(targetDir, "Default", "Cache", "entry")));
    await assert.rejects(fs.access(path.join(targetDir, "Default", "Service Worker", "CacheStorage", "entry")));
    await assert.rejects(fs.access(path.join(targetDir, "Default", "Sessions", "Session_1")));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
