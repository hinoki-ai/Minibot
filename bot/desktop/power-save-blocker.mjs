export function createPowerSaveController(blocker) {
  if (!blocker || typeof blocker.start !== "function" || typeof blocker.stop !== "function") {
    throw new TypeError("A valid power save blocker is required.");
  }

  let blockerId = null;

  function hasActiveBlocker() {
    return blockerId !== null
      && (typeof blocker.isStarted !== "function" || blocker.isStarted(blockerId));
  }

  function start() {
    if (hasActiveBlocker()) {
      return blockerId;
    }

    blockerId = blocker.start("prevent-display-sleep");
    return blockerId;
  }

  function stop() {
    if (!hasActiveBlocker()) {
      blockerId = null;
      return false;
    }

    blocker.stop(blockerId);
    blockerId = null;
    return true;
  }

  function isActive() {
    return hasActiveBlocker();
  }

  return {
    start,
    stop,
    isActive,
  };
}
