/*
 * Shared action dispatch boundary.
 * Planner modules emit action objects; this file validates availability and
 * normalizes execution results for logs, tests, and recovery logic.
 */
import { probeActionCapabilities } from "./capability-probe.mjs";

export const ACTION_METHOD_BY_TYPE = Object.freeze({
  useHotbarSlot: "useHotbarSlot",
  useHotkey: "useHotkey",
  moveInventoryItem: "moveInventoryItem",
  useItem: "useItem",
  useItemOnSelf: "useItemOnSelf",
  useItemOnTarget: "useItemOnTarget",
  useItemOnTile: "useItemOnTile",
  openContainer: "openContainer",
  openNpcDialogue: "openNpcDialogue",
  closeNpcDialogue: "closeNpcDialogue",
  speakNpcKeyword: "speakNpcKeyword",
  sayNpcKeyword: "sayNpcKeyword",
  chooseNpcOption: "chooseNpcOption",
  chooseNpcTradeOption: "chooseNpcTradeOption",
  buyItem: "buyItem",
  sellItem: "sellItem",
  sellAllOfItem: "sellAllOfItem",
  travelToCity: "travelToCity",
  setResidence: "setResidence",
  buyBlessing: "buyBlessing",
  buyAllMissingBlessings: "buyAllMissingBlessings",
  buyPromotion: "buyPromotion",
  dailyTask: "dailyTask",
  runProgressionWorkflow: "runProgressionWorkflow",
  progressionWorkflow: "runProgressionWorkflow",
});

function inferDriver(result = {}) {
  const explicitDriver = String(result?.driver || "").trim().toLowerCase();
  if (explicitDriver) {
    return explicitDriver;
  }

  const transport = String(result?.transport || "").trim().toLowerCase();
  if (/mouse|click|dispatch|input|dom/.test(transport)) {
    return "input";
  }
  return "hook";
}

function stripControlKeys(action = {}) {
  const normalized = { ...action };
  delete normalized.type;
  delete normalized.driver;
  return normalized;
}

export function normalizeActionResult(action = {}, result = null) {
  const normalizedResult = result && typeof result === "object" ? result : {};
  const reason = normalizedResult.ok === false
    ? String(normalizedResult.reason || "action failed")
    : String(normalizedResult.reason || "");

  return {
    ok: normalizedResult.ok === true,
    driver: inferDriver(normalizedResult),
    reason,
    details: {
      actionType: String(action.type || "").trim(),
      ...normalizedResult,
    },
  };
}

export async function executeAction(bot, action = {}) {
  const type = String(action?.type || "").trim();
  const methodName = ACTION_METHOD_BY_TYPE[type];
  if (!methodName) {
    return {
      ok: false,
      driver: "hook",
      reason: `unsupported action "${type}"`,
      details: {
        actionType: type,
      },
    };
  }

  const capabilities = probeActionCapabilities(bot);
  if (capabilities.actions[methodName] !== true) {
    return {
      ok: false,
      driver: "hook",
      reason: `action "${type}" is unavailable`,
      details: {
        actionType: type,
        methodName,
      },
    };
  }

  const rawResult = await bot[methodName](stripControlKeys(action));
  return normalizeActionResult(action, rawResult);
}
