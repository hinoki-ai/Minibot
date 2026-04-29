export const ACTION_CAPABILITY_KEYS = Object.freeze([
  "useHotbarSlot",
  "useHotkey",
  "moveInventoryItem",
  "useItem",
  "useItemOnSelf",
  "useItemOnTarget",
  "useItemOnTile",
  "openContainer",
  "openNpcDialogue",
  "closeNpcDialogue",
  "speakNpcKeyword",
  "sayNpcKeyword",
  "chooseNpcOption",
  "chooseNpcTradeOption",
  "buyItem",
  "sellItem",
  "sellAllOfItem",
  "travelToCity",
  "setResidence",
  "buyBlessing",
  "buyAllMissingBlessings",
  "buyPromotion",
  "dailyTask",
  "runProgressionWorkflow",
]);

function hasMethod(target, key) {
  return typeof target?.[key] === "function";
}

export function probeActionCapabilities(bot = null) {
  const actions = Object.fromEntries(
    ACTION_CAPABILITY_KEYS.map((key) => [key, hasMethod(bot, key)]),
  );

  const hasTransport = hasMethod(bot, "attach")
    || hasMethod(bot?.cdp, "evaluate");

  return {
    actions,
    drivers: {
      hook: hasTransport,
      input: hasTransport,
    },
  };
}
