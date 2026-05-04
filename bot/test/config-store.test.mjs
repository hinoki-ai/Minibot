import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeOptions } from "../lib/bot-core.mjs";

const minibiaMonsterCatalog = JSON.parse(
  await fs.readFile(new URL("../data/minibia/current/monsters.json", import.meta.url), "utf8"),
).items
  .map((entry) => String(entry?.name || "").trim())
  .filter(Boolean);

const previousPortableAuto = process.env.MINIBOT_DISABLE_PORTABLE_AUTO;
process.env.MINIBOT_DISABLE_PORTABLE_AUTO = "1";

after(() => {
  if (previousPortableAuto == null) {
    delete process.env.MINIBOT_DISABLE_PORTABLE_AUTO;
  } else {
    process.env.MINIBOT_DISABLE_PORTABLE_AUTO = previousPortableAuto;
  }
});

test("saveConfig writes a full cavebot profile into the route file and hydrates it back", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-config-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?route-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CONFIG_DIR,
      PROFILE_DIR,
      loadConfig,
      saveConfig,
    } = await import(moduleUrl.href);

    await saveConfig({
      cavebotName: "rot-route",
      cavebotPaused: true,
      trainerPartnerName: "Scout Beta",
      monster: "Rotworm, Larva",
      targetProfiles: [
        {
          name: "Rotworm",
          priority: 220,
          keepDistanceMin: 0,
          keepDistanceMax: 1,
          behavior: "kite",
          preferShootable: true,
          stickToTarget: true,
        },
      ],
      autowalkEnabled: true,
      autowalkLoop: false,
      reconnectEnabled: true,
      avoidElementalFields: false,
      avoidFieldCategories: {
        fire: true,
        energy: false,
        poison: true,
        holes: false,
        stairsLadders: true,
        teleports: false,
        traps: true,
        invisibleWalls: true,
      },
      healerEnabled: true,
      healerRules: [
        {
          enabled: true,
          label: "panic",
          words: "exura gran",
          minHealthPercent: 0,
          maxHealthPercent: 45,
          minMana: 120,
          minManaPercent: 0,
          cooldownMs: 900,
        },
      ],
      manaTrainerEnabled: true,
      manaTrainerRules: [
        {
          enabled: true,
          label: "idle",
          words: "utevo lux",
          minHealthPercent: 90,
          minManaPercent: 80,
          maxManaPercent: 100,
          cooldownMs: 1400,
          requireNoTargets: true,
          requireStationary: true,
        },
      ],
      waypoints: [
        { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
        { x: 101, y: 201, z: 7, label: "Hole", type: "shovel-hole", radius: 2 },
        { x: 102, y: 202, z: 7, label: "Loop", type: "action", action: "goto", targetIndex: 0 },
      ],
      tileRules: [
        { x: 99, y: 200, z: 7, label: "Trap", policy: "avoid", trigger: "approach" },
        { x: 100, y: 201, z: 7, label: "Door Hold", policy: "wait", trigger: "enter", waitMs: 1800, cooldownMs: 900 },
      ],
    }, {
      profileKey: "knight-alpha",
    });

    const characterRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json"), "utf8"));
    const routeRaw = JSON.parse(await fs.readFile(path.join(PROFILE_DIR, "rot-route.json"), "utf8"));

    assert.deepEqual(characterRaw, {
      cavebotName: "rot-route",
      cavebotPaused: true,
      alarmsEnabled: true,
      alarmsSoundEnabled: true,
      trainerPartnerName: "Scout Beta",
      creatureLedger: {
        monsters: [],
        players: [],
        npcs: [],
      },
      stopAggroHold: false,
    });
    assert.equal(routeRaw.name, "rot-route");
    assert.equal(routeRaw.monster, "Rotworm, Larva");
    assert.deepEqual(routeRaw.monsterNames, ["Rotworm", "Larva"]);
    assert.equal(routeRaw.autowalkEnabled, true);
    assert.equal(routeRaw.autowalkLoop, false);
    assert.equal(routeRaw.reconnectEnabled, true);
    assert.equal(routeRaw.avoidElementalFields, false);
    assert.deepEqual(routeRaw.avoidFieldCategories, {
      fire: true,
      energy: false,
      poison: true,
      holes: false,
      stairsLadders: true,
      teleports: false,
      traps: true,
      invisibleWalls: true,
    });
    assert.equal(routeRaw.healerEnabled, true);
    assert.equal(routeRaw.healerRules?.[0]?.words, "exura gran");
    assert.equal(routeRaw.manaTrainerEnabled, true);
    assert.equal(routeRaw.manaTrainerRules?.[0]?.words, "utevo lux");
    assert.equal(routeRaw.targetProfiles?.[0]?.name, "Rotworm");
    assert.equal(routeRaw.targetProfiles?.[0]?.priority, 220);
    assert.equal(Object.hasOwn(routeRaw, "trainerPartnerName"), false);
    assert.equal(Object.hasOwn(routeRaw, "monsterArchive"), false);
    assert.equal(Object.hasOwn(routeRaw, "playerArchive"), false);
    assert.equal(Object.hasOwn(routeRaw, "npcArchive"), false);
    assert.equal(Object.hasOwn(routeRaw, "creatureLedger"), false);
    assert.equal(Object.hasOwn(routeRaw, "cavebotPaused"), false);
    assert.equal(Object.hasOwn(routeRaw, "stopAggroHold"), false);
    assert.equal(Object.hasOwn(routeRaw, "alarmsEnabled"), false);
    assert.equal(Object.hasOwn(routeRaw, "alarmsSoundEnabled"), false);
    assert.deepEqual(routeRaw.waypoints, [
      { x: 100, y: 200, z: 7, type: "walk", label: "Entry" },
      { x: 101, y: 201, z: 7, type: "shovel-hole", label: "Hole", radius: 2 },
      { x: 102, y: 202, z: 7, type: "action", label: "Loop", action: "goto", targetIndex: 0 },
    ]);
    assert.deepEqual(routeRaw.tileRules, [
      {
        id: "tile-rule-001-avoid-approach-99-200-7",
        enabled: true,
        label: "Trap",
        shape: "tile",
        x: 99,
        y: 200,
        z: 7,
        trigger: "approach",
        policy: "avoid",
        priority: 100,
        exactness: "exact",
        vicinityRadius: 0,
        waitMs: 0,
        cooldownMs: 0,
      },
      {
        id: "tile-rule-002-wait-enter-100-201-7",
        enabled: true,
        label: "Door Hold",
        shape: "tile",
        x: 100,
        y: 201,
        z: 7,
        trigger: "enter",
        policy: "wait",
        priority: 100,
        exactness: "exact",
        vicinityRadius: 0,
        waitMs: 1800,
        cooldownMs: 900,
      },
    ]);

    const hydrated = await loadConfig({ profileKey: "knight-alpha" });
    assert.equal(hydrated.monster, "Rotworm, Larva");
    assert.deepEqual(hydrated.monsterNames, ["Rotworm", "Larva"]);
    assert.equal(hydrated.cavebotPaused, true);
    assert.equal(hydrated.autowalkEnabled, true);
    assert.equal(hydrated.autowalkLoop, false);
    assert.equal(hydrated.reconnectEnabled, true);
    assert.equal(hydrated.avoidElementalFields, false);
    assert.deepEqual(hydrated.avoidFieldCategories, {
      fire: true,
      energy: false,
      poison: true,
      holes: false,
      stairsLadders: true,
      teleports: false,
      traps: true,
      invisibleWalls: true,
    });
    assert.equal(hydrated.healerEnabled, true);
    assert.equal(hydrated.healerRules[0]?.words, "exura gran");
    assert.equal(hydrated.manaTrainerEnabled, true);
    assert.equal(hydrated.manaTrainerRules[0]?.words, "utevo lux");
    assert.equal(hydrated.trainerPartnerName, "Scout Beta");
    assert.equal(hydrated.targetProfiles[0]?.name, "Rotworm");
    assert.equal(hydrated.targetProfiles[0]?.priority, 220);
    assert.deepEqual(hydrated.waypoints, [
      { x: 100, y: 200, z: 7, label: "Entry", type: "walk", radius: null },
      { x: 101, y: 201, z: 7, label: "Hole", type: "shovel-hole", radius: 2 },
      { x: 102, y: 202, z: 7, label: "Loop", type: "action", radius: null, action: "goto", targetIndex: 0 },
    ]);
    assert.deepEqual(hydrated.tileRules, [
      {
        id: "tile-rule-001-avoid-approach-99-200-7",
        enabled: true,
        label: "Trap",
        shape: "tile",
        x: 99,
        y: 200,
        z: 7,
        width: 1,
        height: 1,
        scope: { mode: "all" },
        trigger: "approach",
        policy: "avoid",
        priority: 100,
        exactness: "exact",
        vicinityRadius: 0,
        waitMs: 0,
        cooldownMs: 0,
        note: "",
      },
      {
        id: "tile-rule-002-wait-enter-100-201-7",
        enabled: true,
        label: "Door Hold",
        shape: "tile",
        x: 100,
        y: 201,
        z: 7,
        width: 1,
        height: 1,
        scope: { mode: "all" },
        trigger: "enter",
        policy: "wait",
        priority: 100,
        exactness: "exact",
        vicinityRadius: 0,
        waitMs: 1800,
        cooldownMs: 900,
        note: "",
      },
    ]);

    await saveConfig({
      ...hydrated,
      cavebotName: "rot-route-renamed",
    }, {
      profileKey: "knight-alpha",
      previousCavebotName: "rot-route",
    });

    await assert.rejects(fs.access(path.join(PROFILE_DIR, "rot-route.json")));
    await fs.access(path.join(PROFILE_DIR, "rot-route-renamed.json"));
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("listCharacterConfigs enumerates hydrated saved character configs", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-character-list-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?character-list-test=${Date.now()}`, import.meta.url);
    const {
      listCharacterConfigs,
      saveConfig,
    } = await import(moduleUrl.href);

    await saveConfig({
      cavebotName: "Trainer",
      trainerEnabled: true,
      trainerPartnerName: "Scout Beta",
      autoEatEnabled: true,
    }, {
      profileKey: "czarnobrat",
    });

    await saveConfig({
      cavebotName: "rotworms",
      trainerPartnerName: "",
      autoEatEnabled: false,
    }, {
      profileKey: "rotworm-knight",
    });

    const listed = await listCharacterConfigs();
    assert.deepEqual(
      listed.map((entry) => entry.profileKey),
      ["czarnobrat", "rotworm-knight"],
    );

    const trainerEntry = listed.find((entry) => entry.profileKey === "czarnobrat");
    assert.ok(trainerEntry?.path.endsWith(path.join("characters", "czarnobrat.json")));
    assert.ok(Number.isFinite(Number(trainerEntry?.updatedAt)));
    assert.equal(trainerEntry?.options?.cavebotName, "Trainer");
    assert.equal(trainerEntry?.options?.trainerEnabled, true);
    assert.equal(trainerEntry?.options?.trainerPartnerName, "Scout Beta");
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("trainer partner stays character-specific when multiple characters share one route", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-config-trainer-partner-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?trainer-partner-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CONFIG_DIR,
      PROFILE_DIR,
      loadConfig,
      saveConfig,
    } = await import(moduleUrl.href);

    const sharedRouteConfig = {
      cavebotName: "monk-pair-route",
      waypoints: [
        { x: 100, y: 200, z: 7, label: "Start", type: "walk" },
      ],
    };

    await saveConfig({
      ...sharedRouteConfig,
      trainerPartnerName: "Scout Beta",
    }, {
      profileKey: "knight-alpha",
    });

    await saveConfig({
      ...sharedRouteConfig,
      trainerPartnerName: "Guide Gamma",
    }, {
      profileKey: "elder-druid",
    });

    const knightRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json"), "utf8"));
    const druidRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "elder-druid.json"), "utf8"));
    const routeRaw = JSON.parse(await fs.readFile(path.join(PROFILE_DIR, "monk-pair-route.json"), "utf8"));

    assert.equal(knightRaw.trainerPartnerName, "Scout Beta");
    assert.equal(druidRaw.trainerPartnerName, "Guide Gamma");
    assert.equal(Object.hasOwn(routeRaw, "trainerPartnerName"), false);

    const knightHydrated = await loadConfig({ profileKey: "knight-alpha" });
    const druidHydrated = await loadConfig({ profileKey: "elder-druid" });

    assert.equal(knightHydrated.trainerPartnerName, "Scout Beta");
    assert.equal(druidHydrated.trainerPartnerName, "Guide Gamma");
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("alarm power and sound stay character-specific when multiple characters share one route", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-config-alarm-local-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?alarm-local-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CONFIG_DIR,
      PROFILE_DIR,
      loadConfig,
      saveConfig,
    } = await import(moduleUrl.href);

    const sharedRouteConfig = {
      cavebotName: "shared-alarm-route",
      alarmsBlacklistNames: ["Bad Actor"],
      waypoints: [
        { x: 100, y: 200, z: 7, label: "Start", type: "walk" },
      ],
    };

    await saveConfig({
      ...sharedRouteConfig,
      alarmsEnabled: false,
      alarmsSoundEnabled: false,
    }, {
      profileKey: "knight-alpha",
    });

    await saveConfig({
      ...sharedRouteConfig,
      alarmsEnabled: true,
      alarmsSoundEnabled: true,
    }, {
      profileKey: "elder-druid",
    });

    const knightRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json"), "utf8"));
    const druidRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "elder-druid.json"), "utf8"));
    const routeRaw = JSON.parse(await fs.readFile(path.join(PROFILE_DIR, "shared-alarm-route.json"), "utf8"));

    assert.equal(knightRaw.alarmsEnabled, false);
    assert.equal(knightRaw.alarmsSoundEnabled, false);
    assert.equal(druidRaw.alarmsEnabled, true);
    assert.equal(druidRaw.alarmsSoundEnabled, true);
    assert.equal(Object.hasOwn(routeRaw, "alarmsEnabled"), false);
    assert.equal(Object.hasOwn(routeRaw, "alarmsSoundEnabled"), false);
    assert.deepEqual(routeRaw.alarmsBlacklistNames, ["Bad Actor"]);

    const knightHydrated = await loadConfig({ profileKey: "knight-alpha" });
    const druidHydrated = await loadConfig({ profileKey: "elder-druid" });

    assert.equal(knightHydrated.alarmsEnabled, false);
    assert.equal(knightHydrated.alarmsSoundEnabled, false);
    assert.equal(druidHydrated.alarmsEnabled, true);
    assert.equal(druidHydrated.alarmsSoundEnabled, true);
    assert.deepEqual(knightHydrated.alarmsBlacklistNames, ["Bad Actor"]);
    assert.deepEqual(druidHydrated.alarmsBlacklistNames, ["Bad Actor"]);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("loadConfig keeps a legacy trainer partner stored in the route profile", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-config-trainer-legacy-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?trainer-legacy-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CONFIG_DIR,
      PROFILE_DIR,
      loadConfig,
      saveConfig,
    } = await import(moduleUrl.href);

    await fs.mkdir(CHARACTER_CONFIG_DIR, { recursive: true });
    await fs.mkdir(PROFILE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json"),
      JSON.stringify({ cavebotName: "legacy-monk-route" }, null, 2) + "\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(PROFILE_DIR, "legacy-monk-route.json"),
      JSON.stringify({
        name: "legacy-monk-route",
        trainerPartnerName: "Scout Beta",
        waypoints: [
          { x: 100, y: 200, z: 7, label: "Start", type: "walk" },
        ],
      }, null, 2) + "\n",
      "utf8",
    );

    const hydrated = await loadConfig({ profileKey: "knight-alpha" });
    assert.equal(hydrated.trainerPartnerName, "Scout Beta");

    await saveConfig(hydrated, {
      profileKey: "knight-alpha",
    });

    const characterRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json"), "utf8"));
    const routeRaw = JSON.parse(await fs.readFile(path.join(PROFILE_DIR, "legacy-monk-route.json"), "utf8"));

    assert.equal(characterRaw.trainerPartnerName, "Scout Beta");
    assert.equal(Object.hasOwn(routeRaw, "trainerPartnerName"), false);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("saveConfig skips rewriting identical config and route payloads", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-config-unchanged-"));
  const previousHome = process.env.HOME;
  const creatureLedgerMonsters = minibiaMonsterCatalog.flatMap((name) => [name, `Alpha ${name}`]);
  const expectedStoredMonsters = creatureLedgerMonsters.slice(-200);

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?unchanged-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CONFIG_DIR,
      PROFILE_DIR,
      saveConfig,
    } = await import(moduleUrl.href);

    const config = normalizeOptions({
      cavebotName: "unchanged-route",
      monster: "Rotworm, Larva",
      waypoints: [
        { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
        { x: 101, y: 201, z: 7, label: "Loop", type: "walk" },
      ],
      creatureLedger: {
        monsters: creatureLedgerMonsters,
      },
    });

    const first = await saveConfig(config, { profileKey: "knight-alpha" });
    const configPath = path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json");
    const routePath = path.join(PROFILE_DIR, "unchanged-route.json");
    const configStatBefore = await fs.stat(configPath);
    const routeStatBefore = await fs.stat(routePath);

    await new Promise((resolve) => setTimeout(resolve, 25));

    const second = await saveConfig(config, { profileKey: "knight-alpha" });
    const configStatAfter = await fs.stat(configPath);
    const routeStatAfter = await fs.stat(routePath);
    const storedConfig = JSON.parse(await fs.readFile(configPath, "utf8"));

    assert.equal(first.configChanged, true);
    assert.equal(first.routeProfile?.changed, true);
    assert.equal(second.configChanged, false);
    assert.equal(second.routeProfile?.changed, false);
    assert.equal(configStatAfter.mtimeMs, configStatBefore.mtimeMs);
    assert.equal(routeStatAfter.mtimeMs, routeStatBefore.mtimeMs);
    assert.equal(expectedStoredMonsters.length, 200);
    assert.deepEqual(storedConfig.creatureLedger.monsters, expectedStoredMonsters);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("blank route drafts stay in the character config and route library CRUD reflects saved files", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-route-library-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?route-library-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CONFIG_DIR,
      PROFILE_DIR,
      deleteRouteProfile,
      listRouteProfiles,
      loadConfig,
      saveConfig,
    } = await import(moduleUrl.href);

    await saveConfig({
      cavebotName: "",
      monster: "Rotworm",
      waypoints: [
        { x: 330, y: 440, z: 7, label: "Draft Start", type: "node" },
      ],
    }, {
      profileKey: "knight-beta",
    });

    const blankDraftRaw = JSON.parse(await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "knight-beta.json"), "utf8"));
    assert.deepEqual(blankDraftRaw.waypoints, [
      { x: 330, y: 440, z: 7, label: "Draft Start", type: "node", radius: null },
    ]);
    assert.deepEqual(blankDraftRaw.tileRules, []);
    await assert.rejects(fs.access(path.join(PROFILE_DIR, "dararotworms.json")));

    const blankHydrated = await loadConfig({ profileKey: "knight-beta" });
    assert.equal(blankHydrated.cavebotName, "");
    assert.deepEqual(blankHydrated.waypoints, [
      { x: 330, y: 440, z: 7, label: "Draft Start", type: "node", radius: null },
    ]);
    assert.deepEqual(blankHydrated.tileRules, []);

    await saveConfig({
      cavebotName: "cyclops-loop",
      waypoints: [
        { x: 500, y: 600, z: 7, label: "Down", type: "stairs-down" },
        { x: 501, y: 600, z: 7, label: "Climb", type: "ladder" },
      ],
    }, {
      profileKey: "knight-gamma",
    });

    let profiles = await listRouteProfiles();
    assert.deepEqual(profiles.map((entry) => ({
      name: entry.name,
      waypointCount: entry.waypointCount,
      tileRuleCount: entry.tileRuleCount,
      fileName: entry.fileName,
    })), [
      {
        name: "cyclops-loop",
        waypointCount: 2,
        tileRuleCount: 0,
        fileName: "cyclops-loop.json",
      },
    ]);

    const deleteResult = await deleteRouteProfile("cyclops-loop");
    assert.equal(deleteResult.deleted, true);

    profiles = await listRouteProfiles();
    assert.deepEqual(profiles, []);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("saveConfig rejects unsafe route names before they can collide on disk", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-route-name-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?route-name-test=${Date.now()}`, import.meta.url);
    const {
      PROFILE_DIR,
      listRouteProfiles,
      saveConfig,
    } = await import(moduleUrl.href);

    await assert.rejects(
      saveConfig({
        cavebotName: "a/b",
        waypoints: [
          { x: 100, y: 200, z: 7, label: "Entry", type: "walk" },
        ],
      }, {
        profileKey: "unsafe-route",
      }),
      /Route names cannot contain/,
    );

    await assert.rejects(
      saveConfig({
        cavebotName: "CON",
        waypoints: [
          { x: 101, y: 201, z: 7, label: "Entry", type: "walk" },
        ],
      }, {
        profileKey: "reserved-route",
      }),
      /reserved Windows device names/i,
    );

    assert.deepEqual(await listRouteProfiles(), []);
    await assert.rejects(fs.access(path.join(PROFILE_DIR, "a-b.json")));
    await assert.rejects(fs.access(path.join(PROFILE_DIR, "CON.json")));
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("blank route profile files load as empty saved routes", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-empty-route-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?blank-route-test=${Date.now()}`, import.meta.url);
    const {
      PROFILE_DIR,
      listRouteProfiles,
      loadRouteProfile,
    } = await import(moduleUrl.href);

    await fs.mkdir(PROFILE_DIR, { recursive: true });
    await fs.writeFile(path.join(PROFILE_DIR, "dararotworms.json"), "", "utf8");

    const profiles = await listRouteProfiles();
    assert.deepEqual(profiles.map((entry) => ({
      name: entry.name,
      waypointCount: entry.waypointCount,
      tileRuleCount: entry.tileRuleCount,
      fileName: entry.fileName,
    })), [
      {
        name: "dararotworms",
        waypointCount: 0,
        tileRuleCount: 0,
        fileName: "dararotworms.json",
      },
    ]);

    const routeProfile = await loadRouteProfile("dararotworms");
    assert.deepEqual({
      ...routeProfile,
      validation: {
        ...routeProfile.validation,
        checkedAt: 0,
      },
    }, {
      name: "dararotworms",
      fileName: "dararotworms.json",
      path: path.join(PROFILE_DIR, "dararotworms.json"),
      exists: true,
      options: normalizeOptions({
        cavebotName: "dararotworms",
      }),
      validation: {
        schemaVersion: 1,
        sourceName: "dararotworms",
        sourcePath: path.join(PROFILE_DIR, "dararotworms.json"),
        signature: routeProfile.validation.signature,
        checkedAt: 0,
        ok: true,
        requiresAcknowledgement: false,
        summary: {
          ok: true,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
          highestSeverity: "clear",
          firstProblemWaypointIndex: null,
        },
        issues: [],
      },
    });
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("route profile packs export grouped settings and preview validation-first imports", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-route-pack-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?route-pack-test=${Date.now()}`, import.meta.url);
    const {
      PROFILE_PACK_DIR,
      ROUTE_PROFILE_PACK_SCHEMA,
      buildRouteProfilePack,
      exportRouteProfilePack,
      loadRouteProfilePackPreview,
      previewRouteProfilePack,
    } = await import(moduleUrl.href);

    const config = normalizeOptions({
      cavebotName: "scarab-pack",
      monster: "Scarab",
      targetProfiles: [
        { name: "Scarab", priority: 180, behavior: "kite" },
      ],
      sustainEnabled: true,
      lootingEnabled: true,
      lootWhitelist: ["gold coin", "scarab coin"],
      refillEnabled: true,
      refillNpcNames: ["Asima"],
      bankingEnabled: true,
      bankingRules: [{ enabled: true, npcName: "Asima", action: "deposit-all" }],
      alarmsEnabled: true,
      alarmsSoundEnabled: false,
      alarmsBlacklistNames: ["Bad Actor"],
      partyFollowEnabled: true,
      partyFollowMembers: ["Scout Beta"],
      cavebotPaused: true,
      creatureLedger: {
        monsters: ["Rotworm"],
        players: ["Scout Beta"],
        npcs: ["Asima"],
      },
      waypoints: [
        { x: 100, y: 100, z: 7, label: "Start", type: "walk" },
        { x: 101, y: 100, z: 7, label: "Loop", type: "action", action: "goto", targetLabel: "Start" },
      ],
    });

    const pack = buildRouteProfilePack(config, { notes: "Scarab test pack" });
    assert.equal(pack.schema, ROUTE_PROFILE_PACK_SCHEMA);
    assert.equal(pack.metadata.name, "scarab-pack");
    assert.equal(pack.metadata.notes, "Scarab test pack");
    assert.equal(pack.route.waypoints.length, 2);
    assert.equal(pack.targeting.monster, "Scarab");
    assert.equal(pack.sustain.sustainEnabled, true);
    assert.equal(pack.loot.lootingEnabled, true);
    assert.equal(pack.refill.refillEnabled, true);
    assert.equal(pack.banking.bankingEnabled, true);
    assert.equal(Object.hasOwn(pack.alarms, "alarmsEnabled"), false);
    assert.equal(Object.hasOwn(pack.alarms, "alarmsSoundEnabled"), false);
    assert.deepEqual(pack.alarms.alarmsBlacklistNames, ["Bad Actor"]);
    assert.equal(pack.party.teamEnabled, false);
    assert.deepEqual(pack.party.partyFollowMembers, ["Scout Beta"]);
    assert.equal(Object.hasOwn(pack.options, "creatureLedger"), false);
    assert.equal(Object.hasOwn(pack.options, "cavebotPaused"), false);

    const exportResult = await exportRouteProfilePack(config);
    assert.ok(exportResult.path.startsWith(PROFILE_PACK_DIR));
    const preview = await loadRouteProfilePackPreview(exportResult.path, {
      currentConfig: normalizeOptions({
        cavebotName: "old-route",
        monster: "Rotworm",
        waypoints: [
          { x: 1, y: 1, z: 7, type: "walk" },
        ],
      }),
    });

    assert.equal(preview.packName, "scarab-pack");
    assert.equal(preview.readOnly, false);
    assert.equal(preview.validation.ok, true);
    assert.equal(preview.diff.changed, true);
    assert.equal(preview.diff.changes.some((entry) => entry.key === "monster" && entry.scope === "targeting"), true);

    const futurePreview = previewRouteProfilePack({
      ...pack,
      schemaVersion: 999,
    }, {
      currentConfig: config,
    });
    assert.equal(futurePreview.readOnly, true);
    assert.match(futurePreview.migrationWarnings[0], /newer/i);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("account registry persists separate account files without leaking credentials into character configs", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-account-registry-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?account-registry-test=${Date.now()}`, import.meta.url);
    const {
      ACCOUNT_DIR,
      CHARACTER_CONFIG_DIR,
      deleteAccount,
      listAccounts,
      loadAccount,
      saveAccount,
      saveConfig,
    } = await import(moduleUrl.href);

    const saved = await saveAccount({
      label: "Main Pair",
      loginMethod: "account-password",
      loginName: "knight.alpha@example.com",
      password: "hunter2",
      characters: ["Knight Alpha", "Scout Beta"],
      preferredCharacter: "Knight Alpha",
      reconnectPolicy: "preferred-character",
      notes: "Main duo",
    });

    assert.equal(saved.account.id, "main-pair");
    assert.equal(saved.account.secretStorage, "local-file");
    assert.deepEqual(saved.account.characters, ["Knight Alpha", "Scout Beta"]);

    const rawAccount = JSON.parse(await fs.readFile(path.join(ACCOUNT_DIR, "main-pair.json"), "utf8"));
    assert.equal(rawAccount.loginName, "knight.alpha@example.com");
    assert.equal(rawAccount.password, "hunter2");
    assert.equal(rawAccount.preferredCharacter, "Knight Alpha");

    const loaded = await loadAccount("main-pair");
    assert.equal(loaded.label, "Main Pair");
    assert.equal(loaded.loginMethod, "account-password");
    assert.equal(loaded.password, "hunter2");
    assert.equal(loaded.reconnectPolicy, "preferred-character");

    const listed = await listAccounts();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, "main-pair");
    assert.equal(listed[0].label, "Main Pair");

    await saveConfig({
      cavebotName: "rot-route",
      trainerPartnerName: "Scout Beta",
    }, {
      profileKey: "knight-alpha",
    });

    const characterRaw = JSON.parse(
      await fs.readFile(path.join(CHARACTER_CONFIG_DIR, "knight-alpha.json"), "utf8"),
    );
    assert.equal(Object.hasOwn(characterRaw, "loginName"), false);
    assert.equal(Object.hasOwn(characterRaw, "password"), false);
    assert.equal(Object.hasOwn(characterRaw, "accountId"), false);

    const deleted = await deleteAccount("main-pair");
    assert.equal(deleted.deleted, true);
    assert.deepEqual(await listAccounts(), []);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("account registry normalizes manual-login drafts into metadata-only records", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-manual-account-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?manual-account-test=${Date.now()}`, import.meta.url);
    const {
      saveAccount,
    } = await import(moduleUrl.href);

    const saved = await saveAccount({
      label: "Bench Login",
      loginMethod: "manual",
      loginName: "manual@example.com",
      password: "should-not-persist",
      characters: "Scout Beta,\nKnight Alpha,\nScout Beta",
      preferredCharacter: "Scout Beta",
      reconnectPolicy: "last-character",
      secretStorage: "portable-file",
    });

    assert.equal(saved.account.loginMethod, "manual");
    assert.equal(saved.account.secretStorage, "none");
    assert.equal(saved.account.password, "");
    assert.deepEqual(saved.account.characters, ["Scout Beta", "Knight Alpha"]);
    assert.equal(saved.account.preferredCharacter, "Scout Beta");
    assert.equal(saved.account.reconnectPolicy, "last-character");
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("session state persists active desk state and unprofiled session configs", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-session-state-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?session-state-test=${Date.now()}`, import.meta.url);
    const {
      SESSION_STATE_PATH,
      loadSessionState,
      saveSessionState,
    } = await import(moduleUrl.href);

    const result = await saveSessionState({
      activeSessionId: "page-2",
      activeProfileKey: "scout-beta",
      activePageId: "page-2",
      activeCharacterName: "Scout Beta",
      activeViewportMode: "compact",
      alwaysOnTop: false,
      sessions: [
        {
          id: "page-2",
          profileKey: "page-temp",
          pageId: "page-2",
          characterName: "",
          displayName: "Loading Client",
          title: "Minibia",
          url: "https://minibia.com/play",
          running: true,
          routeIndex: 4,
          routeComplete: false,
          overlayFocusIndex: 2,
          config: {
            cavebotName: "",
            monster: "Rotworm",
            autowalkEnabled: true,
            healerEnabled: false,
            waypoints: [
              { x: 100, y: 200, z: 7, type: "walk" },
              { x: 101, y: 200, z: 7, type: "walk" },
            ],
          },
        },
        {
          id: "",
          profileKey: "",
          pageId: "",
          displayName: "",
        },
      ],
    });

    assert.equal(result.path, SESSION_STATE_PATH);
    assert.equal(result.state.activeViewportMode, "compact");
    assert.equal(result.state.alwaysOnTop, false);

    const raw = JSON.parse(await fs.readFile(SESSION_STATE_PATH, "utf8"));
    assert.equal(raw.version, 1);
    assert.equal(raw.sessions.length, 1);

    const loaded = await loadSessionState();
    assert.equal(loaded.activeSessionId, "page-2");
    assert.equal(loaded.activeProfileKey, "scout-beta");
    assert.equal(loaded.activePageId, "page-2");
    assert.equal(loaded.activeCharacterName, "Scout Beta");
    assert.equal(loaded.activeViewportMode, "compact");
    assert.equal(loaded.alwaysOnTop, false);
    assert.equal(loaded.sessions.length, 1);
    assert.equal(loaded.sessions[0].id, "page-2");
    assert.equal(loaded.sessions[0].profileKey, "page-temp");
    assert.equal(loaded.sessions[0].running, true);
    assert.equal(loaded.sessions[0].routeIndex, 4);
    assert.equal(loaded.sessions[0].overlayFocusIndex, 2);
    assert.equal(loaded.sessions[0].config.cavebotName, "");
    assert.equal(loaded.sessions[0].config.autowalkEnabled, true);
    assert.equal(loaded.sessions[0].config.healerEnabled, false);
    assert.deepEqual(loaded.sessions[0].config.monsterNames, ["Rotworm"]);
    assert.equal(loaded.sessions[0].config.waypoints.length, 2);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("route spacing leases track active peers and clean up stale members", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-route-spacing-"));
  const previousHome = process.env.HOME;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?route-spacing-test=${Date.now()}`, import.meta.url);
    const {
      ROUTE_SPACING_DIR,
      describeRouteSpacingGroup,
      listRouteSpacingLeases,
      releaseRouteSpacingLease,
      syncRouteSpacingLease,
    } = await import(moduleUrl.href);

    const options = {
      cavebotName: "scarab-loop",
      autowalkEnabled: true,
      waypoints: [
        { x: 100, y: 200, z: 7, type: "walk" },
        { x: 101, y: 200, z: 7, type: "walk" },
        { x: 102, y: 200, z: 7, type: "walk" },
      ],
    };
    const routeGroup = describeRouteSpacingGroup(options);
    const teamRouteGroup = describeRouteSpacingGroup({
      ...options,
      routeSpacingEnabled: false,
      teamEnabled: true,
    });
    const disabledRouteGroup = describeRouteSpacingGroup({
      ...options,
      routeSpacingEnabled: false,
      teamEnabled: false,
    });

    assert.equal(teamRouteGroup?.routeKey, routeGroup?.routeKey);
    assert.equal(disabledRouteGroup, null);

    const first = await syncRouteSpacingLease({
      options,
      instanceId: "desk-a:alpha",
      characterName: "Alpha",
      routeIndex: 0,
      confirmedIndex: 0,
      active: true,
    });
    const second = await syncRouteSpacingLease({
      options,
      instanceId: "desk-b:beta",
      characterName: "Beta",
      routeIndex: 1,
      confirmedIndex: 0,
      active: true,
    });

    assert.equal(first.routeKey, routeGroup?.routeKey);
    assert.equal(second.routeKey, routeGroup?.routeKey);

    let leases = await listRouteSpacingLeases({ routeKey: routeGroup?.routeKey });
    assert.deepEqual(leases.map((lease) => lease.characterName), ["Alpha", "Beta"]);

    const staleLeasePath = path.join(ROUTE_SPACING_DIR, routeGroup.routeKey, "stale-peer.json");
    await fs.mkdir(path.dirname(staleLeasePath), { recursive: true });
    await fs.writeFile(staleLeasePath, JSON.stringify({
      ...first.lease,
      instanceId: "stale-peer",
      characterName: "Stale",
      updatedAt: Date.now() - 60_000,
    }, null, 2) + "\n", "utf8");

    leases = await listRouteSpacingLeases({ routeKey: routeGroup.routeKey });
    assert.deepEqual(leases.map((lease) => lease.characterName), ["Alpha", "Beta"]);
    await assert.rejects(fs.access(staleLeasePath));

    await releaseRouteSpacingLease({
      routeKey: routeGroup.routeKey,
      instanceId: "desk-a:alpha",
    });
    leases = await listRouteSpacingLeases({ routeKey: routeGroup.routeKey });
    assert.deepEqual(leases.map((lease) => lease.characterName), ["Beta"]);
  } finally {
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});

test("stale character claim takeovers stay exclusive under a concurrent race", async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-claim-race-"));
  const previousHome = process.env.HOME;
  const originalReadFile = fs.readFile;

  try {
    process.env.HOME = tempHome;

    const moduleUrl = new URL(`../lib/config-store.mjs?claim-race-test=${Date.now()}`, import.meta.url);
    const {
      CHARACTER_CLAIM_DIR,
      claimCharacter,
    } = await import(moduleUrl.href);

    const claimPath = path.join(CHARACTER_CLAIM_DIR, "alpha.json");
    await fs.mkdir(CHARACTER_CLAIM_DIR, { recursive: true });
    await fs.writeFile(claimPath, JSON.stringify({
      profileKey: "alpha",
      characterName: "Stale",
      instanceId: "stale-owner",
      pageId: "page-1",
      pid: process.pid,
      title: "Minibot",
      startedAt: Date.now() - 60_000,
      updatedAt: Date.now() - 60_000,
    }, null, 2) + "\n", "utf8");

    let staleReadCount = 0;
    let releaseBarrier = null;
    const staleReadBarrier = new Promise((resolve) => {
      releaseBarrier = resolve;
    });

    fs.readFile = async function patchedReadFile(filePath, ...args) {
      const raw = await originalReadFile.call(this, filePath, ...args);
      if (
        String(filePath) === claimPath
        && raw.includes("\"instanceId\": \"stale-owner\"")
      ) {
        staleReadCount += 1;
        if (staleReadCount === 2) {
          releaseBarrier();
        }
        await staleReadBarrier;
      }
      return raw;
    };

    const results = await Promise.all([
      claimCharacter({
        profileKey: "alpha",
        characterName: "Alpha",
        instanceId: "desk-a",
        pageId: "page-a",
        title: "Minibot",
      }),
      claimCharacter({
        profileKey: "alpha",
        characterName: "Beta",
        instanceId: "desk-b",
        pageId: "page-b",
        title: "Minibot",
      }),
    ]);

    const winners = results.filter((result) => result.ok);
    const losers = results.filter((result) => !result.ok);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);

    const storedClaim = JSON.parse(await originalReadFile(claimPath, "utf8"));
    assert.equal(storedClaim.instanceId, winners[0].claim.instanceId);
    assert.equal(losers[0].claim.instanceId, winners[0].claim.instanceId);
  } finally {
    fs.readFile = originalReadFile;
    if (previousHome == null) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
  }
});
