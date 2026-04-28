import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadMinibiaData,
  resolveMinibiaDataPaths,
} from "../lib/minibia-data.mjs";
import { refreshMinibiaData } from "../scripts/refresh-minibia-data.mjs";

function createJsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    async json() {
      return payload;
    },
  };
}

test("refreshMinibiaData writes normalized current data, vocation packs, and source snapshots", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-minibia-data-"));
  const staleSnapshotDir = path.join(tempRoot, "snapshots", "2026-04-11T00-00-00-000Z");
  await fs.mkdir(staleSnapshotDir, { recursive: true });
  await fs.writeFile(path.join(staleSnapshotDir, "metadata.json"), "{}\n");
  const baseUrl = "https://example.test";
  const generatedAt = "2026-04-12T10:11:12.000Z";
  const libraryPayload = {
    spells: [
      {
        id: 2,
        name: "Beta Strike",
        words: "beta hur",
        mana: 60,
        level: 5,
        vocations: ["knight", "paladin"],
        aggressive: true,
        area: false,
      },
      {
        id: 1,
        name: "Alpha Heal",
        words: "alpha vita",
        mana: 25,
        level: 2,
        vocations: ["druid", "sorcerer", "paladin", "knight"],
        aggressive: false,
        area: false,
      },
    ],
    monsters: [
      {
        name: "Zeta Beast",
        health: 120,
        experience: 60,
        speed: 90,
        armor: 12,
        attacks: [
          { name: "beam", min: 25, max: 40, element: "energy" },
          { name: "melee", min: 0, max: 30, element: null },
        ],
        loot: [
          { name: "gold coin", probability: 0.7, min: 1, max: 15 },
          { name: "rare gem", probability: 0.01, min: 1, max: 1 },
        ],
      },
    ],
    npcs: [
      {
        name: "Beta Trader",
        position: { x: 100, y: 200, z: 7 },
        keywords: ["supplies", "rope"],
        sells: [
          { name: "Rope", price: 50 },
          { name: "Backpack", price: 10 },
        ],
        buys: [
          { name: "Rope", price: 15 },
        ],
      },
    ],
    items: [
      {
        cid: 1988,
        sid: 2854,
        name: "backpack",
        article: "a",
        weight: 1800,
        attack: 0,
        defense: 0,
        armor: 0,
        weaponType: null,
        slotType: "backpack",
        description: "",
        containerSize: 20,
        category: "other",
      },
    ],
    runes: [
      {
        sid: 2268,
        name: "Sudden Death",
        magicLevel: 15,
        aggressive: true,
        area: false,
        vocations: null,
      },
    ],
    achievements: [
      {
        id: 1,
        name: "Alpha Hunter",
        monster: "Alpha Beast",
        required: 25,
        alpha: true,
      },
      {
        id: 2,
        name: "Rat Hunter",
        monster: "Rat",
        required: 100,
        alpha: false,
      },
    ],
  };
  const serverInfoPayload = {
    experienceRate: 2,
    lootRate: 1,
    goldRate: 2,
    runeChargesRate: 2,
    requireBlankRune: false,
    deathSkillLossPercent: 5,
    pvpEnabled: true,
    skillRates: {
      magic: 1.5,
      melee: 1.5,
      distance: 1.5,
      shielding: 1.5,
    },
  };
  const serverStatusPayload = {
    login: true,
    game: false,
  };

  const fetchImpl = async (url) => {
    if (url === `${baseUrl}/api/library`) return createJsonResponse(libraryPayload);
    if (url === `${baseUrl}/api/server-info`) return createJsonResponse(serverInfoPayload);
    if (url === `${baseUrl}/api/status`) return createJsonResponse(serverStatusPayload);
    throw new Error(`Unexpected URL ${url}`);
  };

  const result = await refreshMinibiaData({
    baseUrl,
    dataRoot: tempRoot,
    generatedAt,
    fetchImpl,
  });

  const paths = resolveMinibiaDataPaths(tempRoot);
  const spellDocument = JSON.parse(await fs.readFile(paths.current.spells, "utf8"));
  const serverInfoDocument = JSON.parse(await fs.readFile(paths.current.serverInfo, "utf8"));
  const statusSchemaDocument = JSON.parse(await fs.readFile(paths.current.statusSchema, "utf8"));
  const knightVocationDocument = JSON.parse(await fs.readFile(paths.vocations.knight, "utf8"));
  const snapshotMetadata = JSON.parse(await fs.readFile(path.join(result.snapshotDir, "metadata.json"), "utf8"));

  assert.equal(spellDocument.count, 2);
  assert.deepEqual(
    spellDocument.items.map((entry) => entry.name),
    ["Alpha Heal", "Beta Strike"],
  );
  assert.equal(serverInfoDocument.data.experienceRate, 2);
  assert.deepEqual(
    statusSchemaDocument.serverStatus.fields.map((field) => field.name),
    ["game", "login"],
  );
  assert.equal(knightVocationDocument.spellCount, 2);
  assert.deepEqual(knightVocationDocument.attackSpells, ["beta hur"]);
  assert.deepEqual(snapshotMetadata.counts, {
    spells: 2,
    monsters: 1,
    npcs: 1,
    items: 1,
    runes: 1,
    achievements: 2,
  });
  assert.match(result.snapshotDir, /2026-04-12T10-11-12-000Z$/);
  assert.deepEqual(result.prunedSnapshotDirs, [staleSnapshotDir]);
  await assert.rejects(() => fs.stat(staleSnapshotDir), /ENOENT/);
});

test("loadMinibiaData reads the vendored bundle", async () => {
  const bundle = await loadMinibiaData();

  assert.ok(bundle.spells.length > 0);
  assert.ok(bundle.monsters.length > 0);
  assert.ok(bundle.npcs.length > 0);
  assert.ok(bundle.items.length > 0);
  assert.ok(bundle.runes.length > 0);
  assert.ok(bundle.achievements.length > 0);
  assert.equal(bundle.documents.spells.count, bundle.spells.length);
  assert.equal(typeof bundle.serverStatus.login, "boolean");
  assert.equal(typeof bundle.serverStatus.game, "boolean");
  assert.ok(bundle.vocations.knight.spellCount > 0);
  assert.ok(bundle.vocations.druid.spellCount > 0);
});
