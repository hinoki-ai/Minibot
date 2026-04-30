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

export const ACTION_BLOCK_PRIMITIVES = Object.freeze([
  "say",
  "npcSay",
  "wait",
  "useItem",
  "useHotbar",
  "moveItem",
  "openContainer",
  "bank",
  "shopBuy",
  "shopSell",
  "travel",
  "deposit",
  "withdraw",
  "gotoLabel",
  "pauseRoute",
  "setOption",
  "branchIf",
  "emitAlert",
  "recordMetric",
]);

const ACTION_BLOCK_PRIMITIVE_SET = new Set(ACTION_BLOCK_PRIMITIVES);
const ACTION_BLOCK_FORBIDDEN_KEYS = Object.freeze([
  "script",
  "javascript",
  "customJavaScript",
  "eval",
  "function",
  "sourceCode",
]);
const ACTION_BLOCK_MAX_STEPS = 500;

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
  delete normalized.snapshot;
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

function delay(ms = 0) {
  const durationMs = Math.max(0, Math.trunc(Number(ms) || 0));
  if (durationMs <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeStepType(step = {}) {
  return String(step?.type || step?.primitive || step?.action || "").trim();
}

function getActionBlockSteps(block = {}) {
  if (Array.isArray(block)) {
    return block;
  }
  if (Array.isArray(block?.steps)) {
    return block.steps;
  }
  if (Array.isArray(block?.actions)) {
    return block.actions;
  }
  return [];
}

function hasForbiddenActionBlockKeys(value = {}) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return ACTION_BLOCK_FORBIDDEN_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function buildActionBlockLabelMap(steps = []) {
  const labels = new Map();
  for (let index = 0; index < steps.length; index += 1) {
    const label = normalizeText(steps[index]?.label ?? steps[index]?.name ?? "");
    if (label && !labels.has(label.toLowerCase())) {
      labels.set(label.toLowerCase(), index);
    }
  }
  return labels;
}

function normalizeActionBlockValidationError(stepIndex, reason) {
  return {
    stepIndex: Number.isInteger(stepIndex) ? stepIndex : null,
    reason: String(reason || "invalid action block").trim(),
  };
}

function validateActionBlockSteps(steps = [], errors = [], path = []) {
  if (!Array.isArray(steps) || !steps.length) {
    errors.push(normalizeActionBlockValidationError(path[0] ?? null, "action block has no steps"));
    return errors;
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const stepPath = [...path, index];
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      errors.push(normalizeActionBlockValidationError(stepPath[0], "action block step must be an object"));
      continue;
    }
    if (hasForbiddenActionBlockKeys(step)) {
      errors.push(normalizeActionBlockValidationError(stepPath[0], "custom JavaScript is not allowed in action blocks"));
    }

    const type = normalizeStepType(step);
    if (!type) {
      errors.push(normalizeActionBlockValidationError(stepPath[0], "action block step is missing a type"));
      continue;
    }
    if (!ACTION_BLOCK_PRIMITIVE_SET.has(type)) {
      errors.push(normalizeActionBlockValidationError(stepPath[0], `unsupported action-block primitive "${type}"`));
      continue;
    }

    if (type === "branchIf") {
      if (!step.condition && !step.if) {
        errors.push(normalizeActionBlockValidationError(stepPath[0], "branchIf is missing a condition"));
      }
      for (const branchKey of ["then", "else"]) {
        if (step[branchKey] != null && !Array.isArray(step[branchKey])) {
          errors.push(normalizeActionBlockValidationError(stepPath[0], `${branchKey} branch must be an array`));
        } else if (Array.isArray(step[branchKey]) && step[branchKey].length) {
          validateActionBlockSteps(step[branchKey], errors, stepPath);
        }
      }
    }
  }

  return errors;
}

export function validateActionBlock(block = {}) {
  const steps = getActionBlockSteps(block);
  const errors = validateActionBlockSteps(steps);
  return {
    ok: errors.length === 0,
    errors,
    stepCount: steps.length,
  };
}

function getPathValue(source = null, path = "") {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  const parts = String(path || "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function collectItemEntries(value = null, entries = []) {
  if (!value) {
    return entries;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectItemEntries(entry, entries);
    }
    return entries;
  }
  if (typeof value !== "object") {
    return entries;
  }

  const itemId = Number(value.itemId ?? value.id ?? value.clientId ?? value.serverId);
  const name = normalizeText(value.name ?? value.label ?? value.title ?? value.itemName ?? "");
  const category = normalizeText(value.category ?? value.kind ?? value.type ?? "");
  if (Number.isFinite(itemId) || name || category) {
    entries.push(value);
  }

  for (const key of ["items", "slots", "contents", "entries"]) {
    if (Array.isArray(value[key])) {
      collectItemEntries(value[key], entries);
    }
  }
  return entries;
}

function getItemCount(item = {}) {
  const count = Number(item?.count ?? item?.amount ?? item?.quantity ?? item?.charges);
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 1;
}

function countInventoryItems(snapshot = {}, selector = {}) {
  const requestedItemId = Number(selector?.itemId ?? selector?.id);
  const requestedName = normalizeText(selector?.name ?? selector?.itemName ?? selector?.text ?? "").toLowerCase();
  const requestedCategory = normalizeText(selector?.category ?? selector?.kind ?? "").toLowerCase();
  const entries = collectItemEntries([
    snapshot?.inventory,
    snapshot?.containers,
    snapshot?.equipment,
    snapshot?.items,
  ]);

  return entries.reduce((sum, entry) => {
    const itemId = Number(entry?.itemId ?? entry?.id ?? entry?.clientId ?? entry?.serverId);
    const name = normalizeText(entry?.name ?? entry?.label ?? entry?.title ?? entry?.itemName ?? "").toLowerCase();
    const category = normalizeText(entry?.category ?? entry?.kind ?? entry?.type ?? "").toLowerCase();
    if (Number.isFinite(requestedItemId) && itemId !== Math.trunc(requestedItemId)) {
      return sum;
    }
    if (requestedName && !name.includes(requestedName)) {
      return sum;
    }
    if (requestedCategory && category !== requestedCategory) {
      return sum;
    }
    return sum + getItemCount(entry);
  }, 0);
}

function collectRecentMessageTexts(snapshot = {}) {
  const messages = [];
  const append = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    const text = normalizeText(
      value.text
      ?? value.message
      ?? value.normalizedText
      ?? value.normalized
      ?? value.line
      ?? value,
    );
    if (text) {
      messages.push(text);
    }
  };

  append(snapshot?.recentMessages);
  append(snapshot?.recentNormalizedMessages);
  append(snapshot?.messages);
  append(snapshot?.dialogue?.messages);
  append(snapshot?.chat?.messages);
  return messages;
}

function resolveActiveTargetProfile(bot = null, snapshot = {}) {
  if (snapshot?.activeTargetProfile) {
    return snapshot.activeTargetProfile;
  }
  const target = snapshot?.currentTarget
    || (Array.isArray(snapshot?.candidates) ? snapshot.candidates[0] : null)
    || null;
  if (target?.name && typeof bot?.getTargetProfile === "function") {
    return bot.getTargetProfile(target.name);
  }
  return null;
}

function resolveActionBlockField(field = "", context = {}) {
  const key = String(field || "").trim();
  const lowerKey = key.toLowerCase();
  const snapshot = context.snapshot || {};
  const bot = context.bot || null;
  const lastAction = context.lastActionResult || null;

  switch (lowerKey) {
    case "hp":
    case "health":
      return snapshot?.playerStats?.health ?? snapshot?.health ?? null;
    case "hppercent":
    case "healthpercent":
    case "health.percent":
      return snapshot?.playerStats?.healthPercent ?? snapshot?.healthPercent ?? null;
    case "mp":
    case "mana":
      return snapshot?.playerStats?.mana ?? snapshot?.mana ?? null;
    case "mppercent":
    case "manapercent":
    case "mana.percent":
      return snapshot?.playerStats?.manaPercent ?? snapshot?.manaPercent ?? null;
    case "cap":
    case "capacity":
    case "capacityfree":
      return snapshot?.playerStats?.capacity ?? snapshot?.playerStats?.cap ?? snapshot?.capacity ?? snapshot?.cap ?? null;
    case "nearby.monsters":
    case "nearby.monstercount":
    case "nearbymonstercount":
      return Array.isArray(snapshot?.visibleCreatures)
        ? snapshot.visibleCreatures.length
        : (Array.isArray(snapshot?.candidates) ? snapshot.candidates.length : 0);
    case "nearby.players":
    case "nearby.playercount":
    case "nearbyplayercount":
      return Array.isArray(snapshot?.visiblePlayers) ? snapshot.visiblePlayers.length : 0;
    case "nearby.npcs":
    case "nearby.npccount":
    case "nearbynpccount":
      return Array.isArray(snapshot?.visibleNpcs) ? snapshot.visibleNpcs.length : 0;
    case "route.index":
    case "routeindex":
      return Number.isInteger(bot?.routeIndex) ? bot.routeIndex : 0;
    case "route.position":
    case "player.position":
      return typeof bot?.getPositionKey === "function"
        ? bot.getPositionKey(snapshot?.playerPosition)
        : snapshot?.playerPosition;
    case "recentmessages":
    case "recent.messages":
      return collectRecentMessageTexts(snapshot);
    case "activeowner":
    case "active.owner":
      return context.activeOwner
        || bot?.lastDecisionTrace?.current?.owner
        || bot?.lastDecisionTrace?.blocker?.owner
        || "";
    case "activetargetprofile":
    case "active.targetprofile":
      return resolveActiveTargetProfile(bot, snapshot);
    case "lastaction.ok":
    case "lastactionresult.ok":
      return lastAction?.ok ?? null;
    case "lastaction.reason":
    case "lastactionresult.reason":
      return lastAction?.reason ?? lastAction?.details?.reason ?? "";
    case "lastaction.actiontype":
    case "lastactionresult.actiontype":
      return lastAction?.details?.actionType ?? lastAction?.actionType ?? "";
    default:
      break;
  }

  if (lowerKey === "inventory.count") {
    return countInventoryItems(snapshot, context.condition?.selector || context.condition?.item || context.condition);
  }
  if (lowerKey.startsWith("inventory.")) {
    return countInventoryItems(snapshot, { name: key.slice("inventory.".length) });
  }
  if (lowerKey.startsWith("supply.")) {
    const supplyKey = key.slice("supply.".length);
    return getPathValue(snapshot?.supply, supplyKey)
      ?? getPathValue(snapshot?.supplies, supplyKey)
      ?? getPathValue(snapshot?.sustain?.supplies, supplyKey);
  }
  if (lowerKey.startsWith("activetargetprofile.")) {
    return getPathValue(resolveActiveTargetProfile(bot, snapshot), key.slice("activeTargetProfile.".length));
  }
  if (lowerKey.startsWith("active.targetprofile.")) {
    return getPathValue(resolveActiveTargetProfile(bot, snapshot), key.slice("active.targetProfile.".length));
  }
  if (lowerKey.startsWith("lastaction.")) {
    return getPathValue(lastAction, key.slice("lastAction.".length));
  }
  if (lowerKey.startsWith("snapshot.")) {
    return getPathValue(snapshot, key.slice("snapshot.".length));
  }
  return getPathValue(snapshot, key);
}

function compareConditionValue(actual, operator = "truthy", expected = true) {
  const op = String(operator || "truthy").trim().toLowerCase();
  switch (op) {
    case "exists":
      return actual != null && actual !== "";
    case "notexists":
    case "missing":
      return actual == null || actual === "";
    case "truthy":
      return Boolean(actual);
    case "falsy":
      return !actual;
    case "eq":
    case "equals":
    case "==":
      return actual === expected || String(actual) === String(expected);
    case "ne":
    case "notequals":
    case "!=":
      return !(actual === expected || String(actual) === String(expected));
    case "gt":
    case ">":
      return Number(actual) > Number(expected);
    case "gte":
    case ">=":
      return Number(actual) >= Number(expected);
    case "lt":
    case "<":
      return Number(actual) < Number(expected);
    case "lte":
    case "<=":
      return Number(actual) <= Number(expected);
    case "includes":
    case "contains": {
      const needle = String(expected ?? "").toLowerCase();
      if (Array.isArray(actual)) {
        return actual.some((entry) => String(entry ?? "").toLowerCase().includes(needle));
      }
      return String(actual ?? "").toLowerCase().includes(needle);
    }
    case "matches": {
      try {
        return new RegExp(String(expected || ""), "i").test(String(actual ?? ""));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

export function evaluateActionBlockCondition(condition = null, context = {}) {
  if (Array.isArray(condition)) {
    return condition.every((entry) => evaluateActionBlockCondition(entry, context));
  }
  if (!condition || typeof condition !== "object") {
    return Boolean(condition);
  }
  if (Array.isArray(condition.all)) {
    return condition.all.every((entry) => evaluateActionBlockCondition(entry, context));
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some((entry) => evaluateActionBlockCondition(entry, context));
  }
  if (condition.not != null) {
    return !evaluateActionBlockCondition(condition.not, context);
  }

  const actual = resolveActionBlockField(condition.field ?? condition.path ?? "", {
    ...context,
    condition,
  });
  const operator = condition.op ?? condition.operator ?? (Object.prototype.hasOwnProperty.call(condition, "value") ? "eq" : "truthy");
  return compareConditionValue(actual, operator, condition.value);
}

function buildBankKeyword(step = {}) {
  const explicit = normalizeText(step.keyword ?? step.words ?? step.command ?? step.text ?? "");
  if (explicit) {
    return explicit;
  }
  const type = normalizeStepType(step);
  const operation = normalizeText(step.operation || type).toLowerCase();
  const amount = step.amount;
  const normalizedAmount = Number(amount);
  if (type === "deposit" || operation === "deposit" || operation === "deposit-all") {
    return operation === "deposit-all" || String(amount).trim().toLowerCase() === "all"
      ? "deposit all"
      : `deposit ${Math.max(0, Math.trunc(normalizedAmount || 0))}`;
  }
  if (type === "withdraw" || operation === "withdraw") {
    return `withdraw ${Math.max(0, Math.trunc(normalizedAmount || 0))}`;
  }
  if (operation === "balance") {
    return "balance";
  }
  if (operation === "transfer") {
    const recipient = normalizeText(step.recipient);
    return `transfer ${Math.max(0, Math.trunc(normalizedAmount || 0))}${recipient ? ` to ${recipient}` : ""}`;
  }
  return operation || "balance";
}

function buildRoutedActionFromPrimitive(step = {}) {
  const type = normalizeStepType(step);
  const payload = { ...step };
  delete payload.primitive;
  delete payload.action;

  switch (type) {
    case "npcSay":
      return {
        ...payload,
        type: "sayNpcKeyword",
        keyword: payload.keyword ?? payload.words ?? payload.text ?? "",
      };
    case "useHotbar":
      return {
        ...payload,
        type: "useHotbarSlot",
      };
    case "moveItem":
      return {
        ...payload,
        type: "moveInventoryItem",
      };
    case "shopBuy":
      return {
        ...payload,
        type: "buyItem",
        amount: Math.max(1, Math.trunc(Number(payload.amount) || 1)),
      };
    case "shopSell": {
      const amount = Number(payload.amount);
      const sellAll = payload.sellAll === true || !Number.isFinite(amount) || amount <= 0;
      return {
        ...payload,
        type: sellAll ? "sellAllOfItem" : "sellItem",
        amount: sellAll ? null : Math.trunc(amount),
      };
    }
    case "travel":
      return {
        ...payload,
        type: "travelToCity",
        city: payload.city ?? payload.destination ?? payload.name ?? "",
      };
    case "bank":
    case "deposit":
    case "withdraw":
      return {
        ...payload,
        type: "sayNpcKeyword",
        keyword: buildBankKeyword(step),
      };
    case "useItem":
    case "openContainer":
      return payload;
    default:
      return null;
  }
}

function normalizeVirtualActionResult(actionType, result = {}) {
  return normalizeActionResult({ type: actionType }, {
    ok: result?.ok !== false,
    driver: result?.driver || "hook",
    ...result,
  });
}

function pauseActionBlock(bot, reason, details = {}) {
  const normalizedReason = normalizeText(reason || "action block failed");
  if (typeof bot?.pauseCavebotForRouteFailure === "function") {
    return bot.pauseCavebotForRouteFailure(normalizedReason, details);
  }
  if (bot && typeof bot === "object") {
    bot.options = bot.options && typeof bot.options === "object" ? bot.options : {};
    bot.options.cavebotPaused = true;
    bot.lastRoutePauseReason = normalizedReason;
    if (typeof bot.emit === "function") {
      bot.emit("route-paused", { reason: normalizedReason, details });
    }
  }
  return {
    ok: false,
    paused: true,
    reason: normalizedReason,
    ...details,
  };
}

async function executeVirtualActionBlockStep(bot, step = {}, context = {}) {
  const type = normalizeStepType(step);
  switch (type) {
    case "say": {
      const words = normalizeText(step.words ?? step.text ?? step.keyword ?? "");
      if (!words) {
        return normalizeVirtualActionResult(type, { ok: false, reason: "missing words" });
      }
      if (typeof bot?.castWords !== "function") {
        return normalizeVirtualActionResult(type, { ok: false, reason: "say is unavailable" });
      }
      return normalizeActionResult({ type }, await bot.castWords({ ...step, type: "say", words }));
    }
    case "wait": {
      const durationMs = Math.max(0, Math.trunc(Number(step.durationMs ?? step.ms ?? step.waitMs) || 0));
      await delay(durationMs);
      return normalizeVirtualActionResult(type, { ok: true, durationMs });
    }
    case "pauseRoute": {
      const reason = normalizeText(step.reason || step.message || "action block pause");
      const result = pauseActionBlock(bot, reason, { actionBlock: true });
      return normalizeActionResult({ type }, {
        ...result,
        ok: true,
        paused: true,
      });
    }
    case "setOption": {
      const options = step.options && typeof step.options === "object"
        ? step.options
        : { [String(step.key || "").trim()]: step.value };
      if (!Object.keys(options).filter(Boolean).length) {
        return normalizeVirtualActionResult(type, { ok: false, reason: "missing option" });
      }
      if (typeof bot?.setOptions === "function") {
        bot.setOptions(options);
      } else if (bot && typeof bot === "object") {
        bot.options = {
          ...(bot.options && typeof bot.options === "object" ? bot.options : {}),
          ...options,
        };
      }
      return normalizeVirtualActionResult(type, { ok: true, options });
    }
    case "gotoLabel": {
      const target = normalizeText(step.targetLabel ?? step.gotoLabel ?? step.labelName ?? step.target ?? step.name ?? "");
      if (!target) {
        return normalizeVirtualActionResult(type, { ok: false, reason: "missing label" });
      }
      const blockTargetIndex = context.labels?.get(target.toLowerCase());
      if (Number.isInteger(blockTargetIndex)) {
        return {
          ...normalizeVirtualActionResult(type, { ok: true, target, blockTargetIndex }),
          control: {
            kind: "jump",
            index: blockTargetIndex,
          },
        };
      }
      const routeIndex = typeof bot?.findWaypointIndexBySelector === "function"
        ? bot.findWaypointIndexBySelector(target)
        : null;
      if (!Number.isInteger(routeIndex) || routeIndex < 0) {
        return normalizeVirtualActionResult(type, { ok: false, reason: "label not found", target });
      }
      if (typeof bot?.jumpWaypoint === "function") {
        bot.jumpWaypoint(routeIndex, "action block");
      } else if (bot && typeof bot === "object") {
        bot.routeIndex = routeIndex;
      }
      return normalizeVirtualActionResult(type, { ok: true, target, routeIndex });
    }
    case "emitAlert": {
      const alert = {
        kind: normalizeText(step.kind || step.alertKind || "action-block"),
        message: normalizeText(step.message || step.reason || "Action block alert"),
        severity: normalizeText(step.severity || "info"),
      };
      if (typeof bot?.emit === "function") {
        bot.emit("alert", alert);
      }
      if (typeof bot?.log === "function") {
        bot.log(alert.message);
      }
      return normalizeVirtualActionResult(type, { ok: true, alert });
    }
    case "recordMetric": {
      const name = normalizeText(step.name || step.metric || "actionBlock");
      const value = Number(step.value ?? step.durationMs ?? 0);
      const details = step.details && typeof step.details === "object" ? step.details : {};
      if (typeof bot?.recordRuntimeTiming === "function") {
        bot.recordRuntimeTiming(`actionBlock.${name}`, Number.isFinite(value) ? value : 0, details);
      } else if (bot && typeof bot === "object") {
        bot.actionBlockMetrics = bot.actionBlockMetrics && typeof bot.actionBlockMetrics === "object"
          ? bot.actionBlockMetrics
          : {};
        bot.actionBlockMetrics[name] = {
          value: Number.isFinite(value) ? value : 0,
          details,
        };
      }
      return normalizeVirtualActionResult(type, { ok: true, name, value: Number.isFinite(value) ? value : 0 });
    }
    default:
      return null;
  }
}

async function executeActionBlockStep(bot, step = {}, context = {}) {
  const type = normalizeStepType(step);
  if (step.enabled === false) {
    return normalizeVirtualActionResult(type, { ok: true, skipped: true, reason: "disabled" });
  }

  if (type === "branchIf") {
    const matched = evaluateActionBlockCondition(step.condition ?? step.if, context);
    const branch = matched ? step.then : step.else;
    const targetLabel = matched
      ? normalizeText(step.thenLabel ?? step.gotoLabel ?? "")
      : normalizeText(step.elseLabel ?? "");
    if (targetLabel) {
      const targetIndex = context.labels?.get(targetLabel.toLowerCase());
      if (!Number.isInteger(targetIndex)) {
        return normalizeVirtualActionResult(type, { ok: false, reason: "branch label not found", targetLabel });
      }
      return {
        ...normalizeVirtualActionResult(type, { ok: true, matched, targetLabel }),
        control: {
          kind: "jump",
          index: targetIndex,
        },
      };
    }
    if (Array.isArray(branch) && branch.length) {
      const nestedResult = await executeActionBlock(bot, {
        steps: branch,
        pauseOnFailure: false,
      }, {
        ...context,
        nested: true,
      });
      return normalizeVirtualActionResult(type, {
        ok: nestedResult.ok,
        reason: nestedResult.reason || "",
        matched,
        nested: nestedResult,
      });
    }
    return normalizeVirtualActionResult(type, { ok: true, matched });
  }

  const virtualResult = await executeVirtualActionBlockStep(bot, step, context);
  if (virtualResult) {
    return virtualResult;
  }

  const routedAction = buildRoutedActionFromPrimitive(step);
  if (!routedAction) {
    return normalizeVirtualActionResult(type, { ok: false, reason: `unsupported action-block primitive "${type}"` });
  }
  return executeAction(bot, routedAction);
}

export async function executeActionBlock(bot, block = {}, options = {}) {
  const validation = validateActionBlock(block);
  const steps = getActionBlockSteps(block);
  if (!validation.ok) {
    const firstError = validation.errors[0] || {};
    return {
      ok: false,
      completed: false,
      reason: firstError.reason || "invalid action block",
      stepIndex: firstError.stepIndex,
      errors: validation.errors,
      results: [],
    };
  }

  const labels = buildActionBlockLabelMap(steps);
  const results = [];
  let stepIndex = 0;
  let lastActionResult = options.lastActionResult || null;
  let executedSteps = 0;

  while (stepIndex < steps.length) {
    if (executedSteps >= ACTION_BLOCK_MAX_STEPS) {
      const reason = "action block step limit exceeded";
      const details = { stepIndex, executedSteps };
      const paused = block.pauseOnFailure === false || options.nested
        ? null
        : pauseActionBlock(bot, reason, details);
      return {
        ok: false,
        completed: false,
        paused: Boolean(paused?.paused),
        reason,
        stepIndex,
        executedSteps,
        results,
      };
    }

    const step = steps[stepIndex];
    const result = await executeActionBlockStep(bot, step, {
      ...options,
      bot,
      snapshot: options.snapshot || block.snapshot || bot?.lastSnapshot || {},
      labels,
      lastActionResult,
      activeOwner: options.activeOwner,
    });
    executedSteps += 1;
    results.push({
      stepIndex,
      type: normalizeStepType(step),
      result,
    });
    lastActionResult = result;

    if (!result?.ok) {
      const reason = normalizeText(result?.reason || result?.details?.reason || "action block step failed");
      const details = {
        stepIndex,
        actionType: normalizeStepType(step),
        actionBlock: true,
      };
      const paused = block.pauseOnFailure === false || options.nested
        ? null
        : pauseActionBlock(bot, reason, details);
      return {
        ok: false,
        completed: false,
        paused: Boolean(paused?.paused),
        reason,
        stepIndex,
        actionType: normalizeStepType(step),
        result,
        results,
      };
    }

    if (result.control?.kind === "jump" && Number.isInteger(result.control.index)) {
      stepIndex = result.control.index;
    } else {
      stepIndex += 1;
    }
  }

  return {
    ok: true,
    completed: true,
    reason: "",
    executedSteps,
    results,
    lastActionResult,
  };
}

export async function executeAction(bot, action = {}) {
  const type = String(action?.type || "").trim();
  if (type === "actionBlock" || type === "block") {
    return normalizeActionResult(action, await executeActionBlock(bot, action, {
      snapshot: action.snapshot || bot?.lastSnapshot || {},
    }));
  }

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
