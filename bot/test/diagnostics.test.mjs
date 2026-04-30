import test from "node:test";
import assert from "node:assert/strict";
import { buildRuntimeDiagnostics } from "../lib/diagnostics.mjs";

test("buildRuntimeDiagnostics reports common setup blockers without unsafe guidance", () => {
  const report = buildRuntimeDiagnostics({
    snapshot: {
      ready: true,
      inventory: {
        openBackpackCount: 0,
      },
    },
    options: {
      lootingEnabled: true,
      bankingEnabled: true,
      monsterNames: ["Dragon"],
    },
    decisionTrace: {
      blocker: {
        owner: "targeter",
        reason: "no reachable target",
      },
    },
    protectorStatus: {
      active: true,
      highestSeverity: "warning",
      reason: "low supplies",
    },
  });

  assert.equal(report.ok, true);
  assert.deepEqual(
    report.diagnostics.map((entry) => entry.code),
    [
      "backpack-window-state-loss",
      "targeting-not-firing",
      "protector-active",
    ],
  );
});
