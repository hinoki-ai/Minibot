import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  APP_NAME,
  LINUX_DESKTOP_ENTRY_NAME,
  buildLinuxDesktopEntry,
  ensureLinuxDesktopShortcut,
  ensureLinuxDesktopEntry,
  resolveAppIconPath,
  resolveLinuxDesktopShortcutPath,
} from "../desktop/linux-integration.mjs";

test("linux desktop entry uses the Minibot launcher, icon, and window class", () => {
  const entry = buildLinuxDesktopEntry({
    baseDir: "/tmp/Minibot",
    launchScriptPath: "/tmp/Minibot/scripts/launch-minibot.sh",
    iconPath: "/tmp/Minibot/desktop/assets/favicon.png",
  });

  assert.match(entry, /^\[Desktop Entry\]\n/m);
  assert.match(entry, /\nName=Minibot\n/);
  assert.match(entry, /\nExec="\/tmp\/Minibot\/scripts\/launch-minibot\.sh" %U\n/);
  assert.match(entry, /\nIcon=\/tmp\/Minibot\/desktop\/assets\/favicon\.png\n/);
  assert.match(entry, new RegExp(`\\nStartupWMClass=${APP_NAME}\\n`));
  assert.match(entry, new RegExp(`\\nX-GNOME-WMClass=${APP_NAME}\\n`));
});

test("ensureLinuxDesktopEntry writes minibot.desktop to the XDG applications directory", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minibot-linux-entry-"));
  const baseDir = path.join(tempDir, "repo");
  const dataHome = path.join(tempDir, "xdg");

  fs.mkdirSync(path.join(baseDir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(baseDir, "desktop", "assets"), { recursive: true });
  fs.writeFileSync(path.join(baseDir, "scripts", "launch-minibot.sh"), "#!/usr/bin/env bash\n", "utf8");
  fs.writeFileSync(path.join(baseDir, "desktop", "assets", "icon.png"), "", "utf8");

  const desktopEntryPath = ensureLinuxDesktopEntry({
    baseDir,
    platform: "linux",
    env: {
      XDG_DATA_HOME: dataHome,
    },
    homeDir: path.join(tempDir, "home"),
  });

  assert.equal(
    desktopEntryPath,
    path.join(dataHome, "applications", LINUX_DESKTOP_ENTRY_NAME),
  );

  const desktopEntry = fs.readFileSync(desktopEntryPath, "utf8");
  assert.match(desktopEntry, /\nName=Minibot\n/);
  assert.match(desktopEntry, /\nTerminal=false\n/);
  assert.match(desktopEntry, /\nStartupNotify=true\n/);
});

test("resolveLinuxDesktopShortcutPath honors XDG user-dirs desktop overrides", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minibot-desktop-dir-"));
  const homeDir = path.join(tempDir, "home");
  const xdgConfigHome = path.join(tempDir, "xdg-config");
  fs.mkdirSync(xdgConfigHome, { recursive: true });
  fs.writeFileSync(
    path.join(xdgConfigHome, "user-dirs.dirs"),
    'XDG_DESKTOP_DIR="$HOME/Desk"\n',
    "utf8",
  );

  const shortcutPath = resolveLinuxDesktopShortcutPath({
    env: {
      XDG_CONFIG_HOME: xdgConfigHome,
    },
    homeDir,
    desktopEntryName: LINUX_DESKTOP_ENTRY_NAME,
  });

  assert.equal(shortcutPath, path.join(homeDir, "Desk", LINUX_DESKTOP_ENTRY_NAME));
});

test("ensureLinuxDesktopShortcut copies the Minibot launcher to the desktop when enabled", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "minibot-shortcut-"));
  const baseDir = path.join(tempDir, "repo");
  const homeDir = path.join(tempDir, "home");
  const dataHome = path.join(tempDir, "xdg-data");
  const desktopDir = path.join(tempDir, "Desktop");

  fs.mkdirSync(path.join(baseDir, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(baseDir, "desktop", "assets"), { recursive: true });
  fs.writeFileSync(path.join(baseDir, "scripts", "launch-minibot.sh"), "#!/usr/bin/env bash\n", "utf8");
  fs.writeFileSync(path.join(baseDir, "desktop", "assets", "icon.png"), "", "utf8");

  const desktopEntryPath = ensureLinuxDesktopEntry({
    baseDir,
    platform: "linux",
    env: {
      XDG_DATA_HOME: dataHome,
      XDG_DESKTOP_DIR: desktopDir,
    },
    homeDir,
  });
  const shortcutPath = ensureLinuxDesktopShortcut({
    desktopEntryPath,
    desktopEntryName: LINUX_DESKTOP_ENTRY_NAME,
    platform: "linux",
    env: {
      XDG_DATA_HOME: dataHome,
      XDG_DESKTOP_DIR: desktopDir,
    },
    homeDir,
    enabled: true,
  });

  assert.equal(shortcutPath, path.join(desktopDir, LINUX_DESKTOP_ENTRY_NAME));
  assert.equal(
    fs.readFileSync(shortcutPath, "utf8"),
    fs.readFileSync(desktopEntryPath, "utf8"),
  );
});

test("resolveAppIconPath prefers the recovered favicon for the desktop app icon", () => {
  const existingPaths = new Set([
    "/tmp/Minibot/desktop/assets/favicon.png",
  ]);

  const iconPath = resolveAppIconPath("/tmp/Minibot", {
    existsImpl(candidate) {
      return existingPaths.has(candidate);
    },
  });

  assert.equal(iconPath, "/tmp/Minibot/desktop/assets/favicon.png");
});
