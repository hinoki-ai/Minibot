/*
 * NPC progression step builders for travel, residence, blessings, and
 * promotion. They inspect current snapshot and dialogue state and return
 * structured NPC interaction steps without performing side effects directly.
 */

import {
  MINIBIA_SNAPSHOT_VERSION,
  normalizeMinibiaSnapshot,
} from "../minibia-snapshot.mjs";
import { findDialogueOption } from "./npc-dialogue.mjs";

export const DEFAULT_NPC_GREETING = "hi";
export const DEFAULT_NPC_FAREWELL = "bye";
export const PROGRESSION_WORKFLOW_ACTIONS = Object.freeze([
  "open-dialogue",
  "close-dialogue",
  "travel",
  "set-residence",
  "buy-blessing",
  "buy-all-missing-blessings",
  "buy-promotion",
  "daily-task",
]);

function toSnapshot(snapshotLike = {}) {
  return snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
}

function normalizeText(value = "") {
  return String(value ?? "").trim();
}

function normalizeLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizePhrase(value = "") {
  return normalizeLowerText(value)
    .replace(/\b(?:the|a|an)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasesMatch(left = "", right = "") {
  const normalizedLeft = normalizePhrase(left);
  const normalizedRight = normalizePhrase(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

function normalizeRequestedNpcName(request = {}) {
  return normalizeText(
    request?.npcName
    ?? request?.name
    ?? request?.npc,
  );
}

function collectDialogueTexts(dialogue = {}) {
  const texts = [];

  const pushText = (value) => {
    const text = normalizeText(value);
    if (text) {
      texts.push(text);
    }
  };

  pushText(dialogue?.prompt);
  for (const option of Array.isArray(dialogue?.options) ? dialogue.options : []) {
    pushText(option?.text);
  }
  for (const message of Array.isArray(dialogue?.recentMessages) ? dialogue.recentMessages : []) {
    pushText(message?.text);
  }

  return texts;
}

function dialogueMentions(dialogue = {}, patterns = []) {
  const texts = collectDialogueTexts(dialogue);
  if (!texts.length) {
    return false;
  }

  const normalizedPatterns = (Array.isArray(patterns) ? patterns : [patterns]).filter(Boolean);
  if (!normalizedPatterns.length) {
    return false;
  }

  return texts.some((text) => normalizedPatterns.some((pattern) => (
    pattern instanceof RegExp
      ? pattern.test(text)
      : phrasesMatch(text, pattern)
  )));
}

function getYesDialogueAction(dialogue = {}, extra = {}) {
  const option = findDialogueOption(dialogue, [/^\s*yes\b/i, /\bconfirm\b/i, /\bok\b/i]);
  if (option) {
    return {
      type: "chooseNpcOption",
      text: option.text,
      ...extra,
    };
  }

  return {
    type: "sayNpcKeyword",
    keyword: "yes",
    ...extra,
  };
}

function dialogueRequiresConfirmation(dialogue = {}, patterns = []) {
  const prompt = normalizeText(dialogue?.prompt);
  const hasConfirmationOption = Boolean(findDialogueOption(dialogue, [
    /^\s*yes\b/i,
    /^\s*no\b/i,
    /\bconfirm\b/i,
  ]));
  const hasConfirmationPrompt = /\b(?:would you like|do you want(?: me)? to|confirm|are you sure)\b/i.test(prompt);
  if (!hasConfirmationOption && !hasConfirmationPrompt) {
    return false;
  }

  if (!patterns || (Array.isArray(patterns) && patterns.length === 0)) {
    return true;
  }

  return dialogueMentions(dialogue, patterns);
}

function normalizeVisibleNpcs(snapshot = {}) {
  return Array.isArray(snapshot?.combat?.visibleNpcs)
    ? snapshot.combat.visibleNpcs
    : [];
}

function validateExpectedNpc(snapshot = {}, request = {}) {
  const expectedNpcName = normalizeRequestedNpcName(request);
  if (!expectedNpcName) {
    return null;
  }

  const dialogueNpcName = normalizeText(snapshot?.dialogue?.npcName);
  if (snapshot?.dialogue?.open && dialogueNpcName && !phrasesMatch(dialogueNpcName, expectedNpcName)) {
    return {
      failed: true,
      reason: `npc dialogue already open for "${dialogueNpcName}"`,
      npcName: dialogueNpcName,
    };
  }

  const visibleNpcs = normalizeVisibleNpcs(snapshot);
  if (visibleNpcs.length > 0) {
    const match = visibleNpcs.find((entry) => phrasesMatch(entry?.name, expectedNpcName));
    if (!match) {
      return {
        failed: true,
        reason: `npc "${expectedNpcName}" unavailable`,
        npcName: expectedNpcName,
      };
    }
  }

  return null;
}

function createStepResult(step = {}) {
  return {
    completed: step.completed === true,
    failed: step.failed === true,
    waiting: step.waiting === true,
    phase: normalizeText(step.phase) || null,
    reason: normalizeText(step.reason) || "",
    objective: normalizeText(step.objective) || null,
    target: normalizeText(step.target) || null,
    action: step.action || null,
  };
}

function createActionStep(action = {}, meta = {}) {
  return createStepResult({
    ...meta,
    action,
  });
}

export function buildOpenNpcDialogueStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const dialogue = snapshot?.dialogue || {};
  const expectedNpcName = normalizeRequestedNpcName(request);
  const npcValidation = validateExpectedNpc(snapshot, request);
  if (npcValidation?.failed) {
    return createStepResult({
      ...npcValidation,
      objective: "open-npc-dialogue",
      target: expectedNpcName || npcValidation.npcName,
    });
  }

  if (dialogue.open) {
    return createStepResult({
      completed: true,
      phase: "already-open",
      reason: "npc dialogue already open",
      objective: "open-npc-dialogue",
      target: normalizeText(dialogue.npcName) || expectedNpcName,
    });
  }

  return createActionStep({
    type: "sayNpcKeyword",
    keyword: normalizeText(request.greeting) || DEFAULT_NPC_GREETING,
    ...extra,
  }, {
    waiting: true,
    phase: "greet",
    objective: "open-npc-dialogue",
    target: expectedNpcName || null,
  });
}

export function buildCloseNpcDialogueStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const dialogue = snapshot?.dialogue || {};
  if (!dialogue.open) {
    return createStepResult({
      completed: true,
      phase: "already-closed",
      reason: "npc dialogue already closed",
      objective: "close-npc-dialogue",
      target: normalizeText(request?.npcName) || normalizeText(dialogue.npcName) || null,
    });
  }

  const farewellOption = findDialogueOption(dialogue, [
    /^\s*bye\b/i,
    /\bfarewell\b/i,
    /\bgoodbye\b/i,
  ]);
  if (farewellOption) {
    return createActionStep({
      type: "chooseNpcOption",
      text: farewellOption.text,
      ...extra,
    }, {
      waiting: true,
      phase: "farewell-option",
      objective: "close-npc-dialogue",
      target: normalizeText(dialogue.npcName) || normalizeRequestedNpcName(request) || null,
    });
  }

  return createActionStep({
    type: "sayNpcKeyword",
    keyword: normalizeText(request.farewell) || DEFAULT_NPC_FAREWELL,
    ...extra,
  }, {
    waiting: true,
    phase: "farewell-keyword",
    objective: "close-npc-dialogue",
    target: normalizeText(dialogue.npcName) || normalizeRequestedNpcName(request) || null,
  });
}

function buildConfirmationAwareStep({
  snapshot,
  request,
  extra,
  objective,
  target,
  confirmPatterns,
  keyword,
  menuPatterns = [],
  menuKeyword = "",
}) {
  const dialogue = snapshot?.dialogue || {};
  const openStep = buildOpenNpcDialogueStep(snapshot, request, extra);
  if (openStep.action) {
    return createStepResult({
      ...openStep,
      objective,
      target,
    });
  }
  if (openStep.failed) {
    return createStepResult({
      ...openStep,
      objective,
      target,
    });
  }

  if (dialogueRequiresConfirmation(dialogue, confirmPatterns)) {
    return createActionStep(getYesDialogueAction(dialogue, extra), {
      waiting: true,
      phase: "confirm",
      objective,
      target,
    });
  }

  const targetOption = findDialogueOption(dialogue, [target]);
  if (targetOption) {
    return createActionStep({
      type: "chooseNpcOption",
      text: targetOption.text,
      ...extra,
    }, {
      waiting: true,
      phase: "target-option",
      objective,
      target,
    });
  }

  if (dialogueMentions(dialogue, menuPatterns)) {
    return createActionStep({
      type: "sayNpcKeyword",
      keyword,
      ...extra,
    }, {
      waiting: true,
      phase: "target-keyword",
      objective,
      target,
    });
  }

  const menuOption = menuPatterns.length > 0
    ? findDialogueOption(dialogue, menuPatterns)
    : null;
  if (menuOption) {
    return createActionStep({
      type: "chooseNpcOption",
      text: menuOption.text,
      ...extra,
    }, {
      waiting: true,
      phase: "menu-option",
      objective,
      target,
    });
  }

  if (menuKeyword) {
    return createActionStep({
      type: "sayNpcKeyword",
      keyword: menuKeyword,
      ...extra,
    }, {
      waiting: true,
      phase: "menu-keyword",
      objective,
      target,
    });
  }

  return createActionStep({
    type: "sayNpcKeyword",
    keyword,
    ...extra,
  }, {
    waiting: true,
    phase: "target-keyword",
    objective,
    target,
  });
}

export function buildTravelToCityStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const city = normalizeText(request?.city ?? request?.destination ?? request?.targetCity);
  if (!city) {
    return createStepResult({
      failed: true,
      reason: "missing destination city",
      objective: "travel",
    });
  }

  return buildConfirmationAwareStep({
    snapshot,
    request,
    extra,
    objective: "travel",
    target: city,
    confirmPatterns: [city, /\b(?:travel|sail|passage|destination)\b/i, /\b(?:would you like|do you want|confirm)\b/i],
    keyword: city,
    menuPatterns: [/\btravel\b/i, /\bsail\b/i, /\bpassage\b/i],
    menuKeyword: normalizeText(request?.travelKeyword) || "travel",
  });
}

export function buildSetResidenceStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const city = normalizeText(request?.city ?? request?.residence ?? request?.destination);
  if (!city) {
    return createStepResult({
      failed: true,
      reason: "missing residence city",
      objective: "set-residence",
    });
  }

  if (phrasesMatch(snapshot?.progression?.residence, city) && request?.force !== true) {
    return createStepResult({
      completed: true,
      phase: "already-set",
      reason: "residence already set",
      objective: "set-residence",
      target: city,
    });
  }

  return buildConfirmationAwareStep({
    snapshot,
    request,
    extra,
    objective: "set-residence",
    target: city,
    confirmPatterns: [city, /\b(?:residence|home|temple)\b/i, /\b(?:would you like|do you want|confirm)\b/i],
    keyword: city,
    menuPatterns: [/\bresidence\b/i, /\bhome\b/i, /\btemple\b/i],
    menuKeyword: normalizeText(request?.residenceKeyword) || "residence",
  });
}

export function buildBuyBlessingStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const blessing = normalizeText(request?.blessing ?? request?.name ?? request?.targetBlessing);
  if (!blessing) {
    return createStepResult({
      failed: true,
      reason: "missing blessing name",
      objective: "buy-blessing",
    });
  }

  const ownedBlessings = Array.isArray(snapshot?.progression?.blessings)
    ? snapshot.progression.blessings
    : [];
  if (ownedBlessings.some((entry) => phrasesMatch(entry, blessing)) && request?.force !== true) {
    return createStepResult({
      completed: true,
      phase: "already-owned",
      reason: "blessing already owned",
      objective: "buy-blessing",
      target: blessing,
    });
  }

  return buildConfirmationAwareStep({
    snapshot,
    request,
    extra,
    objective: "buy-blessing",
    target: blessing,
    confirmPatterns: [blessing, /\bbless(?:ing|ings)?\b/i, /\b(?:would you like|do you want|confirm)\b/i],
    keyword: blessing,
    menuPatterns: [/\bbless(?:ing|ings)?\b/i],
    menuKeyword: normalizeText(request?.blessingKeyword) || "blessing",
  });
}

export function buildBuyAllMissingBlessingsStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const dialogueOptions = Array.isArray(snapshot?.dialogue?.options)
    ? snapshot.dialogue.options
    : [];
  const requestedBlessings = Array.isArray(request?.blessings)
    ? request.blessings.map((entry) => normalizeText(entry)).filter(Boolean)
    : [];
  const visibleBlessings = dialogueOptions
    .map((option) => normalizeText(option?.text))
    .filter((text) => (
      text
      && !/^\s*(?:yes|no)\b/i.test(text)
      && /\b(?:bless|shielding|spark|twist|wisdom|embrace|sun)\b/i.test(text)
    ));
  const candidates = requestedBlessings.length > 0
    ? requestedBlessings
    : visibleBlessings;
  const ownedBlessings = Array.isArray(snapshot?.progression?.blessings)
    ? snapshot.progression.blessings
    : [];
  const nextBlessing = candidates.find((candidate) => (
    !ownedBlessings.some((entry) => phrasesMatch(entry, candidate))
  ));

  if (nextBlessing) {
    return createStepResult({
      ...buildBuyBlessingStep(snapshot, {
        ...request,
        blessing: nextBlessing,
      }, extra),
      objective: "buy-all-missing-blessings",
      target: nextBlessing,
    });
  }

  if (requestedBlessings.length > 0) {
    return createStepResult({
      completed: true,
      phase: "complete",
      reason: "all requested blessings already owned",
      objective: "buy-all-missing-blessings",
    });
  }

  const openStep = buildOpenNpcDialogueStep(snapshot, request, extra);
  if (openStep.action || openStep.failed) {
    return createStepResult({
      ...openStep,
      objective: "buy-all-missing-blessings",
    });
  }

  if (!dialogueMentions(snapshot?.dialogue, [/\bbless(?:ing|ings)?\b/i])) {
    return createActionStep({
      type: "sayNpcKeyword",
      keyword: normalizeText(request?.blessingKeyword) || "blessing",
      ...extra,
    }, {
      waiting: true,
      phase: "open-blessing-menu",
      objective: "buy-all-missing-blessings",
    });
  }

  return createStepResult({
    completed: true,
    phase: "complete",
    reason: "no missing blessings identified",
    objective: "buy-all-missing-blessings",
  });
}

export function buildBuyPromotionStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  if (normalizeText(snapshot?.progression?.promotion) && request?.force !== true) {
    return createStepResult({
      completed: true,
      phase: "already-promoted",
      reason: "promotion already owned",
      objective: "buy-promotion",
    });
  }

  return buildConfirmationAwareStep({
    snapshot,
    request,
    extra,
    objective: "buy-promotion",
    target: normalizeText(request?.promotionName) || "promotion",
    confirmPatterns: [/\bpromot/i, /\b(?:would you like|do you want|confirm)\b/i],
    keyword: normalizeText(request?.promotionKeyword) || "promotion",
    menuPatterns: [/\bpromot/i],
    menuKeyword: normalizeText(request?.promotionKeyword) || "promotion",
  });
}

function isTaskRewardReady(task = {}) {
  if (task?.rewardReady === true) {
    return true;
  }

  const current = Number(task?.progressCurrent);
  const required = Number(task?.progressRequired);
  return Number.isFinite(current)
    && Number.isFinite(required)
    && required > 0
    && current >= required;
}

export function buildDailyTaskStep(snapshotLike = {}, request = {}, extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const task = snapshot?.task || {};
  const mode = normalizeLowerText(request?.mode || request?.taskMode || "auto");
  const wantsClaimOnly = mode === "claim" || mode === "claim-reward" || mode === "turn-in";
  const wantsAcceptOnly = mode === "accept" || mode === "start";
  const npcName = normalizeText(request?.npcName ?? task.taskNpc);
  const target = normalizeText(request?.taskTarget ?? request?.target ?? task.taskTarget);
  const rewardReady = isTaskRewardReady(task);
  const objective = rewardReady || wantsClaimOnly ? "daily-task-reward" : "daily-task";

  if (wantsClaimOnly && !rewardReady) {
    return createStepResult({
      completed: true,
      phase: "not-ready",
      reason: "task reward is not ready",
      objective,
      target: target || null,
    });
  }

  if (task?.open && task.activeTaskType && !rewardReady && !wantsAcceptOnly) {
    return createStepResult({
      completed: true,
      phase: "in-progress",
      reason: "daily task is still in progress",
      objective,
      target: target || normalizeText(task.taskTarget) || null,
    });
  }

  const openStep = buildOpenNpcDialogueStep(snapshot, {
    ...request,
    npcName,
  }, extra);
  if (openStep.action || openStep.failed) {
    return createStepResult({
      ...openStep,
      objective,
      target: target || null,
    });
  }

  const dialogue = snapshot?.dialogue || {};
  if (dialogueRequiresConfirmation(dialogue, [
    /\b(?:task|mission|daily|reward|claim|complete)\b/i,
    target,
  ])) {
    return createActionStep(getYesDialogueAction(dialogue, extra), {
      waiting: true,
      phase: "confirm",
      objective,
      target: target || null,
    });
  }

  if (rewardReady) {
    const rewardOption = findDialogueOption(dialogue, [
      /\breward\b/i,
      /\bclaim\b/i,
      /\bcomplete\b/i,
      /\bturn\s*in\b/i,
    ]);
    if (rewardOption) {
      return createActionStep({
        type: "chooseNpcOption",
        text: rewardOption.text,
        ...extra,
      }, {
        waiting: true,
        phase: "reward-option",
        objective,
        target: target || null,
      });
    }

    return createActionStep({
      type: "sayNpcKeyword",
      keyword: normalizeText(request?.rewardKeyword) || "reward",
      ...extra,
    }, {
      waiting: true,
      phase: "reward-keyword",
      objective,
      target: target || null,
    });
  }

  const targetOption = target ? findDialogueOption(dialogue, [target]) : null;
  if (targetOption) {
    return createActionStep({
      type: "chooseNpcOption",
      text: targetOption.text,
      ...extra,
    }, {
      waiting: true,
      phase: "target-option",
      objective,
      target,
    });
  }

  const taskOption = findDialogueOption(dialogue, [
    /\bdaily\b/i,
    /\btask\b/i,
    /\bmission\b/i,
  ]);
  if (taskOption) {
    return createActionStep({
      type: "chooseNpcOption",
      text: taskOption.text,
      ...extra,
    }, {
      waiting: true,
      phase: "task-option",
      objective,
      target: target || null,
    });
  }

  return createActionStep({
    type: "sayNpcKeyword",
    keyword: normalizeText(request?.taskKeyword) || "task",
    ...extra,
  }, {
    waiting: true,
    phase: "task-keyword",
    objective,
    target: target || null,
  });
}

function normalizeWorkflowAction(value = "") {
  const normalized = normalizeLowerText(value);
  if (normalized === "open") return "open-dialogue";
  if (normalized === "close") return "close-dialogue";
  if (normalized === "residence") return "set-residence";
  if (normalized === "blessing") return "buy-blessing";
  if (normalized === "blessings") return "buy-all-missing-blessings";
  if (normalized === "promotion") return "buy-promotion";
  if (normalized === "task") return "daily-task";
  return PROGRESSION_WORKFLOW_ACTIONS.includes(normalized) ? normalized : "";
}

export function buildProgressionWorkflowStep(snapshotLike = {}, workflow = [], extra = {}) {
  const snapshot = toSnapshot(snapshotLike);
  const steps = Array.isArray(workflow)
    ? workflow
    : Array.isArray(workflow?.steps)
      ? workflow.steps
      : [];

  for (let index = 0; index < steps.length; index += 1) {
    const rawStep = steps[index];
    if (!rawStep || rawStep.enabled === false) {
      continue;
    }

    const action = normalizeWorkflowAction(rawStep.action ?? rawStep.type ?? rawStep.objective);
    const stepExtra = {
      moduleKey: extra.moduleKey || rawStep.moduleKey || "progression",
      ruleIndex: Number.isInteger(extra.ruleIndex) ? extra.ruleIndex : index,
    };
    let result = null;

    if (action === "open-dialogue") {
      result = buildOpenNpcDialogueStep(snapshot, rawStep, stepExtra);
    } else if (action === "close-dialogue") {
      result = buildCloseNpcDialogueStep(snapshot, rawStep, stepExtra);
    } else if (action === "travel") {
      result = buildTravelToCityStep(snapshot, rawStep, stepExtra);
    } else if (action === "set-residence") {
      result = buildSetResidenceStep(snapshot, rawStep, stepExtra);
    } else if (action === "buy-blessing") {
      result = buildBuyBlessingStep(snapshot, rawStep, stepExtra);
    } else if (action === "buy-all-missing-blessings") {
      result = buildBuyAllMissingBlessingsStep(snapshot, rawStep, stepExtra);
    } else if (action === "buy-promotion") {
      result = buildBuyPromotionStep(snapshot, rawStep, stepExtra);
    } else if (action === "daily-task") {
      result = buildDailyTaskStep(snapshot, rawStep, stepExtra);
    } else {
      result = createStepResult({
        failed: true,
        reason: "unsupported progression workflow action",
        objective: "progression-workflow",
      });
    }

    if (result?.completed === true) {
      continue;
    }

    return {
      ...result,
      workflowIndex: index,
      workflowAction: action || null,
    };
  }

  return createStepResult({
    completed: true,
    phase: "complete",
    reason: "progression workflow complete",
    objective: "progression-workflow",
  });
}
