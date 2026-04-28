import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  buildManagedBrowserAppLaunchSpec,
  buildManagedBrowserLaunchSpec,
  extractCommandArgValue,
  getManagedBrowserWindowBounds,
  openManagedBrowserTarget,
  REMOVABLE_BROWSER_PROFILE_LOCK_PATHS,
  replaceCommandArgValue,
  resolveBrowserExecutable,
  resolveChromiumAppWindowBounds,
  resolveManagedBrowserLaunchSpec,
  resolveManagedBrowserCommand,
  resolveManagedBrowserAppLauncher,
  setManagedBrowserWindowBounds,
  waitForManagedBrowserSession,
} from "../lib/browser-session.mjs";

test("resolveBrowserExecutable prefers explicit environment paths", () => {
  const browserPath = resolveBrowserExecutable({
    env: {
      MINIBOT_BROWSER_PATH: "/custom/chrome",
      CHROME_BIN: "/ignored/chrome",
    },
    existsImpl: (candidate) => candidate === "/custom/chrome",
  });

  assert.equal(browserPath, "/custom/chrome");
});

test("resolveBrowserExecutable resolves bare browser commands from PATH", () => {
  const browserPath = resolveBrowserExecutable({
    env: {
      MINIBOT_BROWSER_PATH: "google-chrome",
      PATH: "/snap/bin:/usr/bin",
    },
    existsImpl: (candidate) => candidate === "/snap/bin/google-chrome",
  });

  assert.equal(browserPath, "/snap/bin/google-chrome");
});

test("resolveBrowserExecutable resolves Windows browser installs from common roots", () => {
  const browserPath = resolveBrowserExecutable({
    platform: "win32",
    env: {
      ProgramFiles: "C:\\Program Files",
      "ProgramFiles(x86)": "C:\\Program Files (x86)",
      LOCALAPPDATA: "C:\\Users\\hinoki\\AppData\\Local",
    },
    existsImpl: (candidate) => candidate === "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  assert.equal(browserPath, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
});

test("resolveBrowserExecutable resolves Windows browser commands through PATH and PATHEXT", () => {
  const browserPath = resolveBrowserExecutable({
    platform: "win32",
    env: {
      MINIBOT_BROWSER_PATH: "chrome",
      PATH: "C:\\Browsers;C:\\Windows",
      PATHEXT: ".exe;.cmd",
    },
    existsImpl: (candidate) => candidate === "C:\\Browsers\\chrome.exe",
  });

  assert.equal(browserPath, "C:\\Browsers\\chrome.exe");
});

test("resolveBrowserExecutable resolves macOS app bundle binaries", () => {
  const browserPath = resolveBrowserExecutable({
    platform: "darwin",
    env: {
      HOME: "/Users/hinoki",
    },
    existsImpl: (candidate) => candidate === "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });

  assert.equal(browserPath, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
});

test("buildManagedBrowserLaunchSpec builds a detached Chrome launch", () => {
  const spec = buildManagedBrowserLaunchSpec({
    browserPath: "/usr/bin/google-chrome",
    userDataDir: "/tmp/minibot-chrome",
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
    env: {
      CHROME_DESKTOP: "minibot.desktop",
      PATH: "/usr/bin",
    },
  });

  assert.deepEqual(spec, {
    command: "/usr/bin/google-chrome",
    args: [
      "--user-data-dir=/tmp/minibot-chrome",
      "--remote-debugging-port=9224",
      "--no-first-run",
      "--no-default-browser-check",
      "--new-window",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-logging",
      "--disk-cache-size=1048576",
      "--media-cache-size=1048576",
      "https://minibia.com/play",
    ],
    options: {
      detached: true,
      env: {
        PATH: "/usr/bin",
      },
      stdio: "ignore",
    },
  });
});

test("buildManagedBrowserLaunchSpec can force an app-window launch", () => {
  const spec = buildManagedBrowserLaunchSpec({
    browserPath: "/usr/bin/google-chrome",
    userDataDir: "/tmp/minibot-chrome",
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play?pwa=1&session=123",
    openAsApp: true,
    env: {
      CHROME_DESKTOP: "minibot.desktop",
      PATH: "/usr/bin",
    },
  });

  assert.deepEqual(spec, {
    command: "/usr/bin/google-chrome",
    args: [
      "--user-data-dir=/tmp/minibot-chrome",
      "--remote-debugging-port=9224",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-logging",
      "--disk-cache-size=1048576",
      "--media-cache-size=1048576",
      "--app=https://minibia.com/play?pwa=1&session=123",
    ],
    options: {
      detached: true,
      env: {
        PATH: "/usr/bin",
      },
      stdio: "ignore",
    },
  });
});

test("buildManagedBrowserLaunchSpec can opt into always-active background browser flags", () => {
  const spec = buildManagedBrowserLaunchSpec({
    browserPath: "/usr/bin/google-chrome",
    userDataDir: "/tmp/minibot-chrome",
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
    env: {
      MINIBOT_KEEP_BROWSER_BACKGROUND_ACTIVE: "1",
      PATH: "/usr/bin",
    },
  });

  assert.ok(spec.args.includes("--disable-background-timer-throttling"));
  assert.ok(spec.args.includes("--disable-renderer-backgrounding"));
  assert.ok(spec.args.includes("--disable-backgrounding-occluded-windows"));
  assert.ok(spec.args.includes("--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling"));
});

test("resolveChromiumAppWindowBounds matches the saved Minibia app-url placement", () => {
  const preferencesPath = "/tmp/minibot-chrome/Default/Preferences";
  const bounds = resolveChromiumAppWindowBounds({
    userDataDir: "/tmp/minibot-chrome",
    appUrl: "https://minibia.com/play?pwa=1&session=123",
    existsImpl: (candidate) => candidate === preferencesPath,
    readFileImpl: (candidate) => {
      assert.equal(candidate, preferencesPath);
      return JSON.stringify({
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
      });
    },
  });

  assert.deepEqual(bounds, {
    left: 0,
    top: 0,
    right: 740,
    bottom: 647,
    width: 740,
    height: 647,
    maximized: false,
  });
});

test("buildManagedBrowserLaunchSpec reuses the saved Minibia app-window size", () => {
  const spec = buildManagedBrowserLaunchSpec({
    browserPath: "/usr/bin/google-chrome",
    userDataDir: "/tmp/minibot-chrome",
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play?pwa=1&session=123",
    openAsApp: true,
    existsImpl: (candidate) => candidate === "/tmp/minibot-chrome/Default/Preferences",
    readFileImpl: () => JSON.stringify({
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
    }),
  });

  assert.ok(spec.args.includes("--window-size=740,647"));
});

test("extractCommandArgValue returns the value for a prefixed Chromium arg", () => {
  assert.equal(
    extractCommandArgValue([
      "--profile-directory=Default",
      "--user-data-dir=/home/hinoki/.config/Minibot/chrome-profile",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
    ], "--user-data-dir="),
    "/home/hinoki/.config/Minibot/chrome-profile",
  );
});

test("replaceCommandArgValue swaps the existing user-data-dir without duplicating it", () => {
  assert.deepEqual(
    replaceCommandArgValue([
      "--profile-directory=Default",
      "--user-data-dir=/home/hinoki/.config/Minibot/chrome-profile",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
    ], "--user-data-dir=", "/home/hinoki/.config/Minibot/managed-chrome-profile"),
    [
      "--profile-directory=Default",
      "--user-data-dir=/home/hinoki/.config/Minibot/managed-chrome-profile",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
    ],
  );
});

test("browser profile lock list includes the DevTools and singleton files", () => {
  assert.deepEqual(REMOVABLE_BROWSER_PROFILE_LOCK_PATHS, [
    "SingletonCookie",
    "SingletonLock",
    "SingletonSocket",
    "DevToolsActivePort",
    "Default/LOCK",
  ]);
});

test("resolveManagedBrowserAppLauncher detects the installed Minibia desktop app", () => {
  const launcher = resolveManagedBrowserAppLauncher({
    env: {
      HOME: "/home/hinoki",
    },
    existsImpl: (candidate) => (
      candidate === "/home/hinoki/.local/share/applications"
      || candidate === "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
    ),
    readDirImpl: () => [
      "other.desktop",
      "chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    ],
    readFileImpl: (entryPath) => {
      assert.equal(entryPath, "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop");
      return `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/Minibot/chrome-profile --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`;
    },
  });

  assert.deepEqual(launcher, {
    path: "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    name: "Minibia",
    command: "/opt/google/chrome/google-chrome",
    args: [
      "--user-data-dir=/home/hinoki/.config/Minibot/chrome-profile",
      "--profile-directory=Default",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
    ],
    startupWmClass: "crx_bljemjimnpmhmoepcibjlbkldejdbeob",
  });
});

test("resolveManagedBrowserAppLauncher scans XDG application dirs and matches Minibia desktop entry variants", () => {
  const launcher = resolveManagedBrowserAppLauncher({
    env: {
      XDG_DATA_HOME: "/data-home",
      XDG_DATA_DIRS: "/vendor/share:/system/share",
    },
    existsImpl: (candidate) => (
      candidate === "/data-home/applications"
      || candidate === "/data-home/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
    ),
    readDirImpl: (directory) => {
      assert.equal(directory, "/data-home/applications");
      return ["chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"];
    },
    readFileImpl: () => `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=MiniBia Client
Comment=Open the live Minibia desktop client
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/chrome --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`,
  });

  assert.equal(launcher?.path, "/data-home/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop");
  assert.equal(launcher?.name, "MiniBia Client");
  assert.equal(launcher?.command, "/opt/google/chrome/google-chrome");
});

test("resolveManagedBrowserCommand falls back to the Minibia desktop app executable", () => {
  const browserPath = resolveManagedBrowserCommand({
    env: {
      HOME: "/home/hinoki",
      PATH: "/usr/bin",
    },
    existsImpl: (candidate) => (
      candidate === "/home/hinoki/.local/share/applications"
      || candidate === "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
      || candidate === "/opt/google/chrome/google-chrome"
    ),
    resolveCommandImpl: () => "",
    readDirImpl: () => [
      "chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    ],
    readFileImpl: () => `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/chrome --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`,
  });

  assert.equal(browserPath, "/opt/google/chrome/google-chrome");
});

test("resolveManagedBrowserCommand prefers the Minibia desktop app over auto-detected browsers on Linux", () => {
  const browserPath = resolveManagedBrowserCommand({
    env: {
      HOME: "/home/hinoki",
      PATH: "/usr/bin",
    },
    existsImpl: (candidate) => (
      candidate === "/home/hinoki/.local/share/applications"
      || candidate === "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
      || candidate === "/opt/google/chrome/google-chrome"
      || candidate === "/usr/bin/google-chrome"
    ),
    readDirImpl: () => [
      "chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    ],
    readFileImpl: () => `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/chrome --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`,
  });

  assert.equal(browserPath, "/opt/google/chrome/google-chrome");
});

test("buildManagedBrowserAppLaunchSpec adds DevTools and background-safe flags to the Minibia app launcher", () => {
  const spec = buildManagedBrowserAppLaunchSpec({
    command: "/opt/google/chrome/google-chrome",
    args: [
      "--user-data-dir=/home/hinoki/.config/Minibot/chrome-profile",
      "--profile-directory=Default",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
    ],
    port: 9224,
    env: {
      CHROME_DESKTOP: "minibot.desktop",
      PATH: "/usr/bin",
    },
  });

  assert.deepEqual(spec, {
    command: "/opt/google/chrome/google-chrome",
    args: [
      "--user-data-dir=/home/hinoki/.config/Minibot/chrome-profile",
      "--profile-directory=Default",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
      "--new-window",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-logging",
      "--disk-cache-size=1048576",
      "--media-cache-size=1048576",
      "--remote-debugging-port=9224",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    options: {
      detached: true,
      env: {
        PATH: "/usr/bin",
      },
      stdio: "ignore",
    },
  });
});

test("buildManagedBrowserAppLaunchSpec reuses the saved PWA desktop window size", () => {
  const spec = buildManagedBrowserAppLaunchSpec({
    command: "/opt/google/chrome/google-chrome",
    args: [
      "--user-data-dir=/home/hinoki/.config/Minibot/chrome-profile",
      "--profile-directory=Default",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
    ],
    port: 9224,
    existsImpl: (candidate) => candidate === "/home/hinoki/.config/Minibot/chrome-profile/Default/Preferences",
    readFileImpl: () => JSON.stringify({
      browser: {
        app_window_placement: {
          _crx_bljemjimnpmhmoepcibjlbkldejdbeob: {
            left: 0,
            top: 0,
            right: 1017,
            bottom: 636,
            maximized: false,
          },
        },
      },
    }),
  });

  assert.ok(spec.args.includes("--window-size=1017,636"));
});

test("resolveManagedBrowserLaunchSpec keeps the Minibia app launcher arguments when no direct browser path exists", () => {
  const spec = resolveManagedBrowserLaunchSpec({
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
    userDataDir: "/tmp/minibot-profile",
    env: {
      HOME: "/home/hinoki",
      PATH: "/usr/bin",
    },
    existsImpl: (candidate) => (
      candidate === "/home/hinoki/.local/share/applications"
      || candidate === "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
      || candidate === "/opt/google/chrome/google-chrome"
    ),
    resolveCommandImpl: () => "",
    readDirImpl: () => [
      "chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    ],
    readFileImpl: () => `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/chrome --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`,
  });

  assert.deepEqual(spec, {
    command: "/opt/google/chrome/google-chrome",
    args: [
      "--user-data-dir=/home/hinoki/.config/chrome",
      "--profile-directory=Default",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
      "--new-window",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-logging",
      "--disk-cache-size=1048576",
      "--media-cache-size=1048576",
      "--remote-debugging-port=9224",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    options: {
      detached: true,
      env: {
        HOME: "/home/hinoki",
        PATH: "/usr/bin",
      },
      stdio: "ignore",
    },
  });
});

test("resolveManagedBrowserLaunchSpec prefers the Minibia desktop app when browser detection is automatic", () => {
  const spec = resolveManagedBrowserLaunchSpec({
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
    userDataDir: "/tmp/minibot-profile",
    env: {
      HOME: "/home/hinoki",
      PATH: "/usr/bin",
    },
    existsImpl: (candidate) => (
      candidate === "/home/hinoki/.local/share/applications"
      || candidate === "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
      || candidate === "/opt/google/chrome/google-chrome"
      || candidate === "/usr/bin/google-chrome"
    ),
    readDirImpl: () => [
      "chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    ],
    readFileImpl: () => `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/chrome --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`,
  });

  assert.deepEqual(spec, {
    command: "/opt/google/chrome/google-chrome",
    args: [
      "--user-data-dir=/home/hinoki/.config/chrome",
      "--profile-directory=Default",
      "--app-id=bljemjimnpmhmoepcibjlbkldejdbeob",
      "--new-window",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-logging",
      "--disk-cache-size=1048576",
      "--media-cache-size=1048576",
      "--remote-debugging-port=9224",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    options: {
      detached: true,
      env: {
        HOME: "/home/hinoki",
        PATH: "/usr/bin",
      },
      stdio: "ignore",
    },
  });
});

test("resolveManagedBrowserLaunchSpec keeps an explicit browser override ahead of the Minibia app launcher", () => {
  const spec = resolveManagedBrowserLaunchSpec({
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
    userDataDir: "/tmp/minibot-profile",
    env: {
      HOME: "/home/hinoki",
      PATH: "/usr/bin",
      MINIBOT_BROWSER_PATH: "/custom/chrome",
    },
    existsImpl: (candidate) => (
      candidate === "/custom/chrome"
      || candidate === "/home/hinoki/.local/share/applications"
      || candidate === "/home/hinoki/.local/share/applications/chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop"
    ),
    readDirImpl: () => [
      "chrome-bljemjimnpmhmoepcibjlbkldejdbeob-Default.desktop",
    ],
    readFileImpl: () => `#!/usr/bin/env xdg-open
[Desktop Entry]
Version=1.0
Terminal=false
Type=Application
Name=Minibia
Exec=/opt/google/chrome/google-chrome --user-data-dir=/home/hinoki/.config/chrome --profile-directory=Default --app-id=bljemjimnpmhmoepcibjlbkldejdbeob %U
StartupWMClass=crx_bljemjimnpmhmoepcibjlbkldejdbeob
`,
  });

  assert.deepEqual(spec, {
    command: "/custom/chrome",
    args: [
      "--user-data-dir=/tmp/minibot-profile",
      "--remote-debugging-port=9224",
      "--no-first-run",
      "--no-default-browser-check",
      "--new-window",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-client-side-phishing-detection",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-logging",
      "--disk-cache-size=1048576",
      "--media-cache-size=1048576",
      "https://minibia.com/play",
    ],
    options: {
      detached: true,
      env: {
        HOME: "/home/hinoki",
        PATH: "/usr/bin",
        MINIBOT_BROWSER_PATH: "/custom/chrome",
      },
      stdio: "ignore",
    },
  });
});

test("openManagedBrowserTarget creates a new browser window on an existing DevTools session", async () => {
  const calls = [];

  const targetId = await openManagedBrowserTarget({
    port: 9224,
    pageUrl: "https://minibia.com/play",
    fetchImpl: async (url) => ({
      ok: true,
      async json() {
        calls.push(["fetch", url]);
        return {
          webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/browser/test-browser",
        };
      },
    }),
    createConnectionImpl: (wsUrl) => ({
      async connect() {
        calls.push(["connect", wsUrl]);
      },
      async send(method, params) {
        calls.push(["send", method, params]);
        return { targetId: "target-7" };
      },
      close() {
        calls.push(["close"]);
      },
    }),
  });

  assert.equal(targetId, "target-7");
  assert.deepEqual(calls, [
    ["fetch", "http://127.0.0.1:9224/json/version"],
    ["connect", "ws://127.0.0.1:9224/devtools/browser/test-browser"],
    ["send", "Target.createTarget", {
      url: "https://minibia.com/play",
      newWindow: true,
    }],
    ["close"],
  ]);
});

test("openManagedBrowserTarget returns empty when no DevTools browser is listening", async () => {
  const targetId = await openManagedBrowserTarget({
    port: 9224,
    pageUrl: "https://minibia.com/play",
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });

  assert.equal(targetId, "");
});

test("setManagedBrowserWindowBounds resizes the target app window through DevTools", async () => {
  const calls = [];

  const resized = await setManagedBrowserWindowBounds({
    port: 9224,
    targetId: "target-7",
    bounds: {
      left: 0,
      top: 0,
      right: 945,
      bottom: 1060,
      maximized: false,
    },
    fetchImpl: async (url) => ({
      ok: true,
      async json() {
        calls.push(["fetch", url]);
        return {
          webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/browser/test-browser",
        };
      },
    }),
    createConnectionImpl: (wsUrl) => ({
      async connect() {
        calls.push(["connect", wsUrl]);
      },
      async send(method, params) {
        calls.push(["send", method, params]);
        if (method === "Browser.getWindowForTarget") {
          return { windowId: 91 };
        }
        return {};
      },
      close() {
        calls.push(["close"]);
      },
    }),
  });

  assert.equal(resized, true);
  assert.deepEqual(calls, [
    ["fetch", "http://127.0.0.1:9224/json/version"],
    ["connect", "ws://127.0.0.1:9224/devtools/browser/test-browser"],
    ["send", "Browser.getWindowForTarget", {
      targetId: "target-7",
    }],
    ["send", "Browser.setWindowBounds", {
      windowId: 91,
      bounds: {
        left: 0,
        top: 0,
        width: 945,
        height: 1060,
        windowState: "normal",
      },
    }],
    ["close"],
  ]);
});

test("getManagedBrowserWindowBounds reads the current target window bounds through DevTools", async () => {
  const calls = [];

  const bounds = await getManagedBrowserWindowBounds({
    port: 9224,
    targetId: "target-7",
    fetchImpl: async (url) => ({
      ok: true,
      async json() {
        calls.push(["fetch", url]);
        return {
          webSocketDebuggerUrl: "ws://127.0.0.1:9224/devtools/browser/test-browser",
        };
      },
    }),
    createConnectionImpl: (wsUrl) => ({
      async connect() {
        calls.push(["connect", wsUrl]);
      },
      async send(method, params) {
        calls.push(["send", method, params]);
        return {
          windowId: 91,
          bounds: {
            left: 0,
            top: 0,
            width: 740,
            height: 647,
            windowState: "normal",
          },
        };
      },
      close() {
        calls.push(["close"]);
      },
    }),
  });

  assert.deepEqual(bounds, {
    left: 0,
    top: 0,
    right: 740,
    bottom: 647,
    width: 740,
    height: 647,
    maximized: false,
  });
  assert.deepEqual(calls, [
    ["fetch", "http://127.0.0.1:9224/json/version"],
    ["connect", "ws://127.0.0.1:9224/devtools/browser/test-browser"],
    ["send", "Browser.getWindowForTarget", {
      targetId: "target-7",
    }],
    ["close"],
  ]);
});

test("waitForManagedBrowserSession resolves once a new session appears", async () => {
  const childProcess = new EventEmitter();
  let sessions = ["existing"];
  let now = 0;

  const nextSessionId = await waitForManagedBrowserSession({
    childProcess,
    previousSessionIds: new Set(sessions),
    syncInstances: async () => {
      if (now >= 500) {
        sessions = ["existing", "fresh-session"];
      }
    },
    listSessionIds: () => sessions,
    sleepImpl: async (ms) => {
      now += ms;
    },
    nowImpl: () => now,
    timeoutMs: 2_000,
    pollMs: 500,
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
  });

  assert.equal(nextSessionId, "fresh-session");
});

test("waitForManagedBrowserSession waits for the expected DevTools target when provided", async () => {
  let sessions = ["existing"];
  let now = 0;

  const nextSessionId = await waitForManagedBrowserSession({
    previousSessionIds: new Set(sessions),
    expectedSessionId: "target-7",
    syncInstances: async () => {
      if (now >= 500 && now < 1_000) {
        sessions = ["existing", "other-session"];
        return;
      }

      if (now >= 1_000) {
        sessions = ["existing", "other-session", "target-7"];
      }
    },
    listSessionIds: () => sessions,
    sleepImpl: async (ms) => {
      now += ms;
    },
    nowImpl: () => now,
    timeoutMs: 2_000,
    pollMs: 500,
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
  });

  assert.equal(nextSessionId, "target-7");
});

test("waitForManagedBrowserSession surfaces managed browser launch errors", async () => {
  const childProcess = new EventEmitter();
  const waitPromise = waitForManagedBrowserSession({
    childProcess,
    previousSessionIds: new Set(),
    syncInstances: async () => {},
    listSessionIds: () => [],
    sleepImpl: async () => {},
    nowImpl: () => 0,
    timeoutMs: 1_000,
    pollMs: 0,
    port: 9224,
  });

  childProcess.emit("error", new Error("EACCES"));

  await assert.rejects(waitPromise, /Unable to launch managed browser: EACCES/);
});

test("waitForManagedBrowserSession rejects if the browser exits before a page appears", async () => {
  const childProcess = new EventEmitter();
  const waitPromise = waitForManagedBrowserSession({
    childProcess,
    previousSessionIds: new Set(),
    syncInstances: async () => {},
    listSessionIds: () => [],
    sleepImpl: async () => {},
    nowImpl: () => 0,
    timeoutMs: 1_000,
    pollMs: 0,
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
  });

  childProcess.emit("exit", 1, null);

  await assert.rejects(waitPromise, /Managed browser exited before a page starting with https:\/\/minibia\.com\/play appeared on DevTools port 9224 \(exit code 1\)\./);
});

test("waitForManagedBrowserSession keeps waiting after a clean launcher handoff exit", async () => {
  const childProcess = new EventEmitter();
  let sessions = ["existing"];
  let now = 0;

  const waitPromise = waitForManagedBrowserSession({
    childProcess,
    previousSessionIds: new Set(sessions),
    ignoreExitCodeZero: true,
    syncInstances: async () => {
      if (now >= 500) {
        sessions = ["existing", "fresh-session"];
      }
    },
    listSessionIds: () => sessions,
    sleepImpl: async (ms) => {
      now += ms;
    },
    nowImpl: () => now,
    timeoutMs: 2_000,
    pollMs: 500,
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
  });

  childProcess.emit("exit", 0, null);

  assert.equal(await waitPromise, "fresh-session");
});

test("waitForManagedBrowserSession tolerates transient sync errors while the browser comes up", async () => {
  let sessions = ["existing"];
  let now = 0;

  const nextSessionId = await waitForManagedBrowserSession({
    previousSessionIds: new Set(sessions),
    syncInstances: async () => {
      if (now < 500) {
        throw new Error("ECONNREFUSED");
      }
      sessions = ["existing", "fresh-session"];
    },
    listSessionIds: () => sessions,
    sleepImpl: async (ms) => {
      now += ms;
    },
    nowImpl: () => now,
    timeoutMs: 2_000,
    pollMs: 500,
    port: 9224,
    pageUrlPrefix: "https://minibia.com/play",
  });

  assert.equal(nextSessionId, "fresh-session");
});

test("waitForManagedBrowserSession times out with a clear discovery error", async () => {
  let now = 0;

  await assert.rejects(
    waitForManagedBrowserSession({
      previousSessionIds: new Set(["existing"]),
      syncInstances: async () => {},
      listSessionIds: () => ["existing"],
      sleepImpl: async (ms) => {
        now += ms;
      },
      nowImpl: () => now,
      timeoutMs: 1_000,
      pollMs: 500,
      port: 9224,
      pageUrlPrefix: "https://minibia.com/play",
    }),
    /Managed browser launched, but a page starting with https:\/\/minibia\.com\/play did not appear on DevTools port 9224 within 1s\./,
  );
});
