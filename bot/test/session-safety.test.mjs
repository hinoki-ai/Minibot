import test from "node:test";
import assert from "node:assert/strict";
import {
  buildActiveKillMomentBlockMessage,
  describeActiveKillMoment,
  getSessionSafetyLabel,
} from "../lib/session-safety.mjs";

function createSession(snapshot, botPatch = {}) {
  return {
    id: "page-1",
    binding: {
      characterName: "Knight Alpha",
      displayName: "Knight Alpha",
    },
    bot: {
      lastSnapshot: snapshot,
      ...botPatch,
    },
  };
}

test("describeActiveKillMoment blocks a live current target", () => {
  const session = createSession({
    ready: true,
    currentTarget: {
      id: 99,
      name: "Rotworm",
    },
  });

  const result = describeActiveKillMoment(session);

  assert.equal(result.active, true);
  assert.equal(result.targetName, "Rotworm");
  assert.match(result.reason, /current target Rotworm/);
});

test("describeActiveKillMoment blocks route combat hold telemetry", () => {
  const session = createSession({
    ready: true,
    routeState: {
      state: "combat-hold",
    },
  });

  const result = describeActiveKillMoment(session);

  assert.equal(result.active, true);
  assert.equal(result.reason, "route is holding for combat");
});

test("describeActiveKillMoment blocks bot-reported combat candidates", () => {
  const session = createSession({
    ready: true,
    candidates: [
      {
        id: 101,
        name: "Larva",
      },
    ],
  }, {
    hasRuntimeCombatActivity(snapshot) {
      return Array.isArray(snapshot?.candidates) && snapshot.candidates.length > 0;
    },
  });

  const result = describeActiveKillMoment(session);

  assert.equal(result.active, true);
  assert.equal(result.reason, "candidate target Larva");
});

test("describeActiveKillMoment blocks visible attackers targeting the character", () => {
  const session = createSession({
    ready: true,
    visibleCreatures: [
      {
        id: 7,
        name: "Scarab",
        isTargetingSelf: true,
      },
    ],
  });

  const result = describeActiveKillMoment(session);

  assert.equal(result.active, true);
  assert.equal(result.reason, "Scarab is targeting the character");
});

test("describeActiveKillMoment ignores missing and disconnected snapshots", () => {
  assert.equal(describeActiveKillMoment(createSession(null)).active, false);
  assert.equal(describeActiveKillMoment(createSession({ ready: false, currentTarget: { name: "Rotworm" } })).active, false);
});

test("buildActiveKillMomentBlockMessage includes the character and action", () => {
  const session = createSession({ ready: true });

  assert.equal(getSessionSafetyLabel(session), "Knight Alpha");
  assert.match(
    buildActiveKillMomentBlockMessage(session, {
      action: "close session",
      reason: "current target Rotworm",
    }),
    /^Blocked close session for Knight Alpha: active kill moment detected \(current target Rotworm\)\./,
  );
});
