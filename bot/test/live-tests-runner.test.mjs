import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveValidationReport,
  parseArgs,
  selectLivePages,
} from "../scripts/run-live-tests.mjs";

test("parseArgs reads live test runner options", () => {
  const options = parseArgs([
    "--all-sessions",
    "--allow-skip",
    "--json",
    "--wait-ms", "500",
    "--port", "9333",
    "--url-prefix", "https://minibia.com/play?pwa=1",
    "--then", "smoke,core",
    "--then", "release",
  ]);

  assert.equal(options.allSessions, true);
  assert.equal(options.allowSkip, true);
  assert.equal(options.json, true);
  assert.equal(options.waitMs, 500);
  assert.equal(options.port, 9333);
  assert.equal(options.pageUrlPrefix, "https://minibia.com/play?pwa=1");
  assert.deepEqual(options.thenLanes, ["smoke", "core", "release"]);
});

test("parseArgs rejects conflicting live selectors", () => {
  assert.throws(
    () => parseArgs(["--all-sessions", "--character", "Dark Knight"]),
    /cannot be used together/,
  );
});

test("selectLivePages can target all sessions, one character, or the first usable page", () => {
  const pages = [
    { id: "", characterName: "Missing Id" },
    { id: "1", characterName: "" },
    { id: "2", characterName: "Dark Knight" },
    { id: "3", characterName: "Druid Alpha" },
  ];

  assert.deepEqual(
    selectLivePages(pages, { allSessions: true }).map((page) => page.id),
    ["2", "3"],
  );
  assert.deepEqual(
    selectLivePages(pages, { character: "druid alpha" }).map((page) => page.id),
    ["3"],
  );
  assert.deepEqual(
    selectLivePages(pages).map((page) => page.id),
    ["2"],
  );
});

test("buildLiveValidationReport accepts a ready live snapshot", () => {
  const report = buildLiveValidationReport({
    page: {
      id: "page-1",
      characterName: "Dark Knight",
      title: "Minibia",
    },
    before: {
      capturedAt: "2026-05-05T00:00:00.000Z",
      snapshot: {
        ready: true,
        playerName: "Dark Knight",
        playerPosition: { x: 100, y: 200, z: 7 },
        visibleNpcs: [{ name: "H.L." }],
        containers: [{ name: "Backpack" }],
      },
      pageState: {
        activeChannelName: "Default",
        openModals: [],
      },
      floor: {
        tiles: [{ position: { x: 100, y: 200, z: 7 } }],
      },
    },
    after: {
      capturedAt: "2026-05-05T00:00:00.250Z",
      snapshot: {
        ready: true,
        playerName: "Dark Knight",
        playerPosition: { x: 100, y: 200, z: 7 },
        visibleNpcs: [],
        containers: [],
      },
      pageState: {
        activeChannelName: "Default",
        openModals: [],
      },
      floor: {
        tiles: [{ position: { x: 100, y: 200, z: 7 } }],
      },
    },
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
  assert.equal(report.after.playerName, "Dark Knight");
  assert.equal(report.after.scannedTileCount, 1);
});

test("buildLiveValidationReport fails synthetic or unusable live snapshots", () => {
  const report = buildLiveValidationReport({
    page: {
      id: "page-1",
      characterName: "Dark Knight",
    },
    before: {
      snapshot: {
        ready: false,
        playerName: "",
        playerPosition: null,
      },
    },
    after: {
      snapshot: {
        ready: false,
        playerName: "Other Character",
        playerPosition: null,
      },
    },
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.issues, [
    "live snapshot never became ready",
    "live player position missing",
    "live snapshot character mismatch: page=Dark Knight snapshot=Other Character",
  ]);
});
