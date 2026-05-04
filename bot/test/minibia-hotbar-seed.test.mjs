import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildMinibiaHotbarSeedProfileCandidates,
  buildMinibiaHotbarStorageHydrationExpression,
  countHotbarStorageSlots,
  resolveMinibiaHotbarSeed,
} from "../lib/minibia-hotbar-seed.mjs";

const blankHotbar = JSON.stringify({
  version: 2,
  activePreset: 0,
  presets: [
    [{ action: "attackNearest" }, null, null],
    [null, null, null],
  ],
});

const populatedHotbar = JSON.stringify({
  version: 2,
  activePreset: 0,
  presets: [
    [
      { action: "attackLowestHp" },
      { action: "attackNearest" },
      { sid: 10, mode: "self" },
      { sid: 14, mode: "self" },
      null,
      { sid: 37, mode: "self" },
      { action: "convertCurrency" },
      { text: "utevo res \"monk" },
      { sid: 8, mode: "self" },
      { sid: 2, mode: "self" },
      { sid: 23, mode: "self" },
      { sid: 28, mode: "self" },
    ],
    [null, null, null],
  ],
});

const populatedKeybinds = JSON.stringify({
  version: 2,
  presets: [[112, 113, 114, 115, 220, 117, 118, 119, 120, 121, 122, 123]],
});

async function writeLocalStorageLog(userDataDir, contents) {
  const levelDbDir = path.join(userDataDir, "Default", "Local Storage", "leveldb");
  await fs.mkdir(levelDbDir, { recursive: true });
  await fs.writeFile(path.join(levelDbDir, "000003.log"), contents);
}

test("buildMinibiaHotbarSeedProfileCandidates can skip broad browser profile discovery", () => {
  const preferredUserDataDir = path.join("tmp", "preferred-profile");
  const discoveredUserDataDir = path.join("home", ".config", "google-chrome");
  let readdirCalls = 0;

  const candidates = buildMinibiaHotbarSeedProfileCandidates({
    preferredProfiles: [{ userDataDir: preferredUserDataDir, profileDirectory: "Default" }],
    includeDefaultBrowserProfiles: false,
    env: {},
    homeDir: "home",
    platform: "linux",
    existsImpl: (targetPath) => targetPath === discoveredUserDataDir,
    readdirImpl: () => {
      readdirCalls += 1;
      return [];
    },
  });

  assert.deepEqual(candidates, [
    {
      userDataDir: preferredUserDataDir,
      profileDirectory: "Default",
      label: "",
    },
  ]);
  assert.equal(readdirCalls, 0);
});

test("resolveMinibiaHotbarSeed extracts the populated Minibia hotbar from another Chrome profile", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibia-hotbar-seed-"));

  try {
    const managedProfile = path.join(tempRoot, "managed-chrome-profile");
    const chromeProfile = path.join(tempRoot, "google-chrome");
    await writeLocalStorageLog(managedProfile, `hotbar\0${blankHotbar}`);
    await writeLocalStorageLog(chromeProfile, [
      `hotbar\0${blankHotbar}`,
      `hotbarKeybinds\0${JSON.stringify({ version: 2, presets: [[112]] })}`,
      `hotbar\0${populatedHotbar}`,
      `hotbarKeybinds\0${populatedKeybinds}`,
    ].join("\0noise\0"));

    const seed = resolveMinibiaHotbarSeed({
      candidates: [
        { userDataDir: managedProfile, profileDirectory: "Default" },
        { userDataDir: chromeProfile, profileDirectory: "Default", label: "Google Chrome" },
      ],
      excludeUserDataDirs: [managedProfile],
    });

    assert.equal(seed?.sourceUserDataDir, chromeProfile);
    assert.equal(seed?.sourceLabel, "Google Chrome");
    assert.equal(seed?.hotbarSlotCount, 11);
    assert.equal(seed?.values.hotbar, populatedHotbar);
    assert.equal(seed?.values.hotbarKeybinds, populatedKeybinds);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildMinibiaHotbarStorageHydrationExpression only overwrites a less populated hotbar", () => {
  assert.equal(countHotbarStorageSlots(blankHotbar), 1);
  assert.equal(countHotbarStorageSlots(populatedHotbar), 11);

  const storage = new Map([
    ["hotbar", blankHotbar],
  ]);
  const previousLocation = globalThis.location;
  const previousLocalStorage = globalThis.localStorage;

  globalThis.location = {
    hostname: "minibia.com",
    href: "https://minibia.com/play?pwa=1&session=123",
  };
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => {
      storage.set(key, String(value));
    },
  };

  try {
    const expression = buildMinibiaHotbarStorageHydrationExpression({
      values: {
        hotbar: populatedHotbar,
        hotbarKeybinds: populatedKeybinds,
      },
      sourceLabel: "Google Chrome",
    });
    const result = eval(expression);

    assert.equal(result.changed, true);
    assert.equal(result.currentSlotCount, 1);
    assert.equal(result.sourceSlotCount, 11);
    assert.equal(storage.get("hotbar"), populatedHotbar);
    assert.equal(storage.get("hotbarKeybinds"), populatedKeybinds);

    const secondResult = eval(expression);
    assert.equal(secondResult.changed, false);
    assert.equal(secondResult.reason, "current hotbar already populated");
  } finally {
    if (previousLocation === undefined) {
      delete globalThis.location;
    } else {
      globalThis.location = previousLocation;
    }
    if (previousLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
  }
});
