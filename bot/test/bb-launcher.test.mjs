import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDesktopLaunchSpec,
  launchDesktop,
  LAUNCHER_HELP_TEXT,
  runLauncherCli,
  wantsLauncherHelp,
} from "../bb.mjs";

test("bb launcher builds the local electron desktop command", () => {
  const spec = buildDesktopLaunchSpec({
    baseDir: "/tmp/minibot",
    argv: ["--inspect"],
    nodePath: "/usr/bin/node",
    env: {
      DISPLAY: ":1",
    },
    platform: "linux",
  });

  assert.deepEqual(spec, {
    command: "/usr/bin/node",
    args: [
      "/tmp/minibot/node_modules/electron/cli.js",
      "/tmp/minibot",
      "--inspect",
    ],
    options: {
      env: {
        DISPLAY: ":1",
        CHROME_DESKTOP: "minibot.desktop",
        MINIBOT_DISABLE_VISIBLE_INPUT: "1",
      },
      stdio: "inherit",
    },
  });
});

test("bb launcher spawns the desktop app with inherited stdio", () => {
  let invocation = null;
  const child = { pid: 42 };

  const result = launchDesktop({
    baseDir: "/home/test/Minibot",
    argv: ["--trace-warnings"],
    nodePath: "/usr/bin/node",
    env: {
      DISPLAY: ":1",
    },
    platform: "linux",
    existsImpl: () => true,
    prepareDesktopLaunchImpl: ({ baseDir, platform }) => {
      invocation = {
        ...invocation,
        prepared: { baseDir, platform },
      };
      return null;
    },
    spawnImpl: (command, args, options) => {
      invocation = { ...invocation, command, args, options };
      return child;
    },
  });

  assert.equal(result, child);
  assert.deepEqual(invocation, {
    command: "/usr/bin/node",
    args: [
      "/home/test/Minibot/node_modules/electron/cli.js",
      "/home/test/Minibot",
      "--trace-warnings",
    ],
    options: {
      env: {
        DISPLAY: ":1",
        CHROME_DESKTOP: "minibot.desktop",
        MINIBOT_DISABLE_VISIBLE_INPUT: "1",
      },
      stdio: "inherit",
    },
    prepared: {
      baseDir: "/home/test/Minibot",
      platform: "linux",
    },
  });
});

test("bb launcher recognizes help flags", () => {
  assert.equal(wantsLauncherHelp([]), false);
  assert.equal(wantsLauncherHelp(["--help"]), true);
  assert.equal(wantsLauncherHelp(["-h"]), true);
});

test("bb launcher prints help without launching Electron", () => {
  let launched = false;
  let output = "";

  const result = runLauncherCli({
    argv: ["--help"],
    stdout: {
      write(chunk) {
        output += chunk;
      },
    },
    launchDesktopImpl: () => {
      launched = true;
      return null;
    },
  });

  assert.equal(result, null);
  assert.equal(launched, false);
  assert.equal(output, `${LAUNCHER_HELP_TEXT}\n`);
});
