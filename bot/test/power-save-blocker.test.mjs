import test from "node:test";
import assert from "node:assert/strict";
import { createPowerSaveController } from "../desktop/power-save-blocker.mjs";

test("power save controller starts a display-sleep blocker once", () => {
  const started = new Set();
  let nextId = 1;
  const calls = [];
  const blocker = {
    start(type) {
      calls.push(type);
      const id = nextId++;
      started.add(id);
      return id;
    },
    stop(id) {
      started.delete(id);
    },
    isStarted(id) {
      return started.has(id);
    },
  };

  const controller = createPowerSaveController(blocker);
  const firstId = controller.start();
  const secondId = controller.start();

  assert.equal(firstId, 1);
  assert.equal(secondId, 1);
  assert.deepEqual(calls, ["prevent-display-sleep"]);
  assert.equal(controller.isActive(), true);
});

test("power save controller stops the active blocker and clears state", () => {
  const started = new Set();
  const stopped = [];
  let nextId = 10;
  const blocker = {
    start() {
      const id = nextId++;
      started.add(id);
      return id;
    },
    stop(id) {
      stopped.push(id);
      started.delete(id);
    },
    isStarted(id) {
      return started.has(id);
    },
  };

  const controller = createPowerSaveController(blocker);
  const blockerId = controller.start();

  assert.equal(controller.stop(), true);
  assert.deepEqual(stopped, [blockerId]);
  assert.equal(controller.isActive(), false);
  assert.equal(controller.stop(), false);
});
