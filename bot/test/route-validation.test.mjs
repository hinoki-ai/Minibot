import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { validateRouteConfig } from "../lib/config-store.mjs";

const execFileAsync = promisify(execFile);

test("validateRouteConfig reports malformed route control without rewriting the source", () => {
  const source = {
    cavebotName: "broken-goto",
    autowalkEnabled: true,
    monsterNames: ["Definitely Not A Minibia Monster"],
    lootWhitelist: ["Definitely Not An Item"],
    waypoints: [
      { x: 100, y: 100, z: 7, label: "Start", type: "walk", customField: true },
      { x: 101, y: 100, z: 7, label: "Start", type: "action", action: "goto", targetIndex: 9 },
    ],
  };

  const before = structuredClone(source);
  const report = validateRouteConfig(source, { rawConfig: source });

  assert.equal(report.ok, false);
  assert.equal(report.requiresAcknowledgement, true);
  assert.ok(report.signature);
  assert.equal(report.issues.some((issue) => issue.code === "broken-goto" && issue.severity === "error"), true);
  assert.equal(report.issues.some((issue) => issue.code === "duplicate-label"), true);
  assert.equal(report.issues.some((issue) => issue.code === "unknown-waypoint-field"), true);
  assert.equal(report.issues.some((issue) => issue.code === "unknown-monster"), true);
  assert.equal(report.issues.some((issue) => issue.code === "unknown-item"), true);
  assert.deepEqual(source, before);
});

test("validate-routes command checks route files deterministically", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "minibot-route-validation-"));
  try {
    await fs.writeFile(path.join(tempDir, "safe.json"), JSON.stringify({
      name: "safe",
      autowalkEnabled: true,
      waypoints: [
        { x: 100, y: 100, z: 7, type: "walk", label: "Start" },
        { x: 101, y: 100, z: 7, type: "walk", label: "Next" },
      ],
    }, null, 2), "utf8");

    const { stdout } = await execFileAsync(process.execPath, [
      new URL("../scripts/validate-routes.mjs", import.meta.url).pathname,
      "--json",
      "--path",
      tempDir,
    ], {
      cwd: new URL("..", import.meta.url).pathname,
    });
    const report = JSON.parse(stdout);

    assert.equal(report.ok, true);
    assert.equal(report.routeCount, 1);
    assert.equal(report.errorCount, 0);
    assert.equal(report.reports[0].sourceName, "safe");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
