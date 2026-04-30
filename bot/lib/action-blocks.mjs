/*
 * Constrained JSON action-block validation and execution. Blocks are data, not
 * JavaScript, and failures return a step index plus normalized reason.
 */
import { executeAction } from "./action-router.mjs";

const SUPPORTED_STEP_TYPES = Object.freeze(new Set([
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
]));

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getInventoryCount(snapshot = {}, name = "") {
  const key = normalizeText(name).toLowerCase();
  if (!key) return 0;
  const items = Array.isArray(snapshot?.inventory?.items) ? snapshot.inventory.items : [];
  return items.reduce((sum, entry) => {
    const entryName = normalizeText(entry?.displayName || entry?.name || entry?.item?.name).toLowerCase();
    return entryName === key ? sum + Math.max(1, Math.trunc(Number(entry?.count ?? entry?.item?.count) || 1)) : sum;
  }, 0);
}

function evaluateCondition(condition = {}, context = {}) {
  if (!condition || typeof condition !== "object") return true;
  const snapshot = context.snapshot || {};
  const stats = snapshot.playerStats || {};
  switch (normalizeText(condition.field)) {
    case "hpPercent":
      return normalizeNumber(stats.healthPercent ?? stats.hpPercent, 100) <= normalizeNumber(condition.lte, 100);
    case "mpPercent":
      return normalizeNumber(stats.manaPercent ?? stats.mpPercent, 100) <= normalizeNumber(condition.lte, 100);
    case "capacity":
      return normalizeNumber(stats.capacity ?? stats.cap, 0) <= normalizeNumber(condition.lte, 0);
    case "inventory":
      return getInventoryCount(snapshot, condition.name) >= normalizeNumber(condition.gte, 1);
    case "nearbyMonsterCount":
      return (Array.isArray(snapshot.visibleCreatures) ? snapshot.visibleCreatures.length : 0) >= normalizeNumber(condition.gte, 1);
    case "nearbyPlayerCount":
      return (Array.isArray(snapshot.visiblePlayers) ? snapshot.visiblePlayers.length : 0) >= normalizeNumber(condition.gte, 1);
    case "routeIndex":
      return normalizeNumber(context.routeIndex ?? snapshot.routeIndex, 0) === normalizeNumber(condition.eq, 0);
    case "activeTargetProfile":
      return normalizeText(context.activeTargetProfile).toLowerCase() === normalizeText(condition.eq).toLowerCase();
    case "activeOwner":
      return normalizeText(context.activeOwner || context.decisionTrace?.current?.owner).toLowerCase() === normalizeText(condition.eq).toLowerCase();
    case "lastActionOk":
      return Boolean(context.lastResult?.ok) === Boolean(condition.eq ?? true);
    default:
      return false;
  }
}

function normalizeStep(step = {}, index = 0) {
  const type = normalizeText(step.type);
  if (!SUPPORTED_STEP_TYPES.has(type)) {
    return {
      ok: false,
      index,
      reason: `unsupported action block step "${type}"`,
    };
  }
  return {
    ok: true,
    index,
    step: {
      ...step,
      type,
    },
  };
}

export function validateActionBlock(block = {}) {
  const steps = Array.isArray(block?.steps) ? block.steps : [];
  const issues = [];
  if (!steps.length) {
    issues.push({ severity: "error", index: null, reason: "action block has no steps" });
  }
  steps.forEach((step, index) => {
    const normalized = normalizeStep(step, index);
    if (!normalized.ok) {
      issues.push({ severity: "error", index, reason: normalized.reason });
    }
  });
  return {
    ok: issues.length === 0,
    issues,
    stepCount: steps.length,
  };
}

function mapStepToAction(step = {}) {
  switch (step.type) {
    case "say":
      return { ...step, type: "cast", words: step.words || step.text };
    case "npcSay":
      return { ...step, type: "sayNpcKeyword", keyword: step.keyword || step.words || step.text };
    case "useHotbar":
      return { ...step, type: "useHotbarSlot", slotIndex: step.slotIndex };
    case "moveItem":
      return { ...step, type: "moveInventoryItem" };
    case "shopBuy":
      return { ...step, type: "buyItem" };
    case "shopSell":
      return { ...step, type: "sellItem" };
    case "travel":
      return { ...step, type: "travelToCity", city: step.city || step.destination };
    case "bank":
    case "deposit":
    case "withdraw":
      return { ...step, type: "runProgressionWorkflow", workflow: step.type };
    case "useItem":
    case "openContainer":
      return step;
    default:
      return null;
  }
}

export async function executeActionBlock(bot, block = {}, context = {}) {
  const validation = validateActionBlock(block);
  if (!validation.ok) {
    return {
      ok: false,
      stepIndex: validation.issues[0]?.index ?? null,
      reason: validation.issues[0]?.reason || "invalid action block",
      validation,
    };
  }

  const steps = Array.isArray(block.steps) ? block.steps : [];
  let lastResult = context.lastResult || null;
  for (let index = 0; index < steps.length; index += 1) {
    const step = normalizeStep(steps[index], index).step;
    const stepContext = {
      ...context,
      lastResult,
    };
    if (step.condition && !evaluateCondition(step.condition, stepContext)) {
      continue;
    }

    if (step.type === "wait") {
      const ms = Math.max(0, Math.trunc(normalizeNumber(step.ms, 0)));
      if (typeof bot?.sleep === "function") {
        await bot.sleep(ms);
      }
      lastResult = { ok: true, reason: "wait", ms };
      continue;
    }

    if (step.type === "branchIf") {
      lastResult = { ok: evaluateCondition(step.condition, stepContext), reason: "branch" };
      if (!lastResult.ok && step.pauseOnFalse !== false) {
        return { ok: false, stepIndex: index, reason: "branch condition false", lastResult };
      }
      continue;
    }

    if (step.type === "setOption") {
      if (typeof bot?.setOptions === "function") {
        bot.setOptions({ ...(bot.options || {}), [step.key]: step.value });
      }
      lastResult = { ok: true, reason: "option set", key: step.key };
      continue;
    }

    if (step.type === "gotoLabel" || step.type === "pauseRoute" || step.type === "emitAlert" || step.type === "recordMetric") {
      lastResult = { ok: true, reason: step.type, control: true, ...step };
      continue;
    }

    const action = mapStepToAction(step);
    const result = await executeAction(bot, action);
    lastResult = result;
    if (!result?.ok) {
      return {
        ok: false,
        stepIndex: index,
        reason: result?.reason || "action block step failed",
        lastResult,
      };
    }
  }

  return {
    ok: true,
    stepIndex: steps.length - 1,
    reason: "complete",
    lastResult,
  };
}
