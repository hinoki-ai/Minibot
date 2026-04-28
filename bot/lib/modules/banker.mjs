/*
 * Bank rule normalizer and dialogue state machine.
 * It converts banking rules plus snapshot state into nearby banker detection,
 * intent resolution, and deterministic conversation progression without direct
 * live-page side effects.
 */

import { getCarriedGoldValue, normalizeGoldValue } from "./economy.mjs";
import {
  findBankBalanceFromMessages,
  findMatchingDialogueMessage,
  hasSpeakerMatch,
  normalizeDialogueState,
} from "./npc-dialogue.mjs";

export const BANKING_OPERATION_TYPES = Object.freeze([
  "deposit-all",
  "deposit",
  "deposit-excess",
  "withdraw",
  "withdraw-up-to",
  "balance",
  "transfer",
]);

export const DEFAULT_BANKING_RULE = Object.freeze({
  enabled: true,
  label: "",
  bankerNames: [],
  operation: "deposit-all",
  amount: 0,
  reserveGold: 0,
  recipient: "",
  cooldownMs: 1400,
  requireNoTargets: true,
  requireStationary: true,
  maxNpcDistance: 3,
});

const GENERIC_FAILURE_PATTERNS = Object.freeze([
  /\bnot enough\b/i,
  /\binsufficient\b/i,
  /\byou do not have enough\b/i,
  /\bthere is not enough\b/i,
  /\bcan(?:not|'t) withdraw\b/i,
  /\bcan(?:not|'t) transfer\b/i,
  /\bdo not have any gold\b/i,
]);

const GENERIC_CONFIRMATION_PATTERNS = Object.freeze([
  /\bwould you really like\b/i,
  /\bplease confirm\b/i,
  /\bsay yes\b/i,
  /\bdo you really want\b/i,
]);

function normalizeStringArray(value = []) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
      .split(",");
  return source
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function normalizeBankingOperation(value = DEFAULT_BANKING_RULE.operation) {
  const normalized = String(value || "").trim().toLowerCase() || DEFAULT_BANKING_RULE.operation;
  return BANKING_OPERATION_TYPES.includes(normalized)
    ? normalized
    : DEFAULT_BANKING_RULE.operation;
}

function clampDistance(value, fallback = DEFAULT_BANKING_RULE.maxNpcDistance) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.max(1, Math.trunc(numericValue));
}

function getIntentSuccessPatterns(operation = "deposit-all") {
  switch (operation) {
    case "balance":
      return [/\baccount balance\b/i, /\bbalance(?: is|:)?\b/i];
    case "withdraw":
    case "withdraw-up-to":
      return [/\bwithdrawn\b/i, /\bhere you are\b/i, /\baccount balance\b/i];
    case "transfer":
      return [/\btransfer(?:red|ed)?\b/i, /\btransaction complete\b/i, /\baccount balance\b/i];
    case "deposit":
    case "deposit-excess":
    case "deposit-all":
    default:
      return [/\bdeposited\b/i, /\baccount balance\b/i, /\badded\b.*\baccount\b/i];
  }
}

function getEntryDistance(entry = {}, origin = null) {
  if (Number.isFinite(Number(entry?.chebyshevDistance))) {
    return Math.max(0, Math.trunc(Number(entry.chebyshevDistance)));
  }

  const position = entry?.position;
  if (!position || !origin || Number(position.z) !== Number(origin.z)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    Math.abs(Number(position.x) - Number(origin.x)),
    Math.abs(Number(position.y) - Number(origin.y)),
  );
}

export function normalizeBankingRule(rule = {}, fallback = DEFAULT_BANKING_RULE) {
  const bankerNames = normalizeStringArray(rule?.bankerNames ?? rule?.bankerName ?? fallback.bankerNames);
  return {
    enabled: rule?.enabled !== false,
    label: String(rule?.label ?? fallback.label ?? "").trim(),
    bankerNames,
    bankerName: bankerNames[0] || "",
    operation: normalizeBankingOperation(rule?.operation ?? fallback.operation),
    amount: normalizeGoldValue(rule?.amount ?? fallback.amount),
    reserveGold: normalizeGoldValue(rule?.reserveGold ?? fallback.reserveGold),
    recipient: String(rule?.recipient ?? fallback.recipient ?? "").trim(),
    cooldownMs: Math.max(
      0,
      Math.trunc(Number(rule?.cooldownMs ?? fallback.cooldownMs) || 0),
    ),
    requireNoTargets: rule?.requireNoTargets !== false,
    requireStationary: rule?.requireStationary !== false,
    maxNpcDistance: clampDistance(rule?.maxNpcDistance, fallback.maxNpcDistance),
  };
}

export function normalizeBankingRules(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map((rule) => normalizeBankingRule(rule));
}

export function matchesBankingRuleEnvironment(rule = DEFAULT_BANKING_RULE, snapshot = {}) {
  if (!snapshot?.ready) return false;
  const normalizedRule = normalizeBankingRule(rule);
  const visibleTargets = Array.isArray(snapshot?.visibleCreatures) ? snapshot.visibleCreatures : [];
  const candidates = Array.isArray(snapshot?.candidates) ? snapshot.candidates : [];
  if (normalizedRule.requireNoTargets && (visibleTargets.length > 0 || candidates.length > 0)) {
    return false;
  }
  if (normalizedRule.requireStationary && (snapshot?.isMoving || snapshot?.pathfinderAutoWalking)) {
    return false;
  }
  return true;
}

export function findNearbyBanker(snapshot = {}, rule = DEFAULT_BANKING_RULE) {
  const normalizedRule = normalizeBankingRule(rule);
  const visibleNpcs = Array.isArray(snapshot?.visibleNpcs) ? snapshot.visibleNpcs : [];
  const playerPosition = snapshot?.playerPosition || null;
  if (!visibleNpcs.length) {
    return null;
  }

  const allowedNames = normalizedRule.bankerNames.map((entry) => entry.toLowerCase());
  const candidates = visibleNpcs
    .filter((entry) => {
      const distance = getEntryDistance(entry, playerPosition);
      if (!Number.isFinite(distance) || distance > normalizedRule.maxNpcDistance) {
        return false;
      }
      if (!allowedNames.length) {
        return true;
      }
      return allowedNames.includes(String(entry?.name || "").trim().toLowerCase());
    })
    .sort((left, right) => (
      getEntryDistance(left, playerPosition) - getEntryDistance(right, playerPosition)
      || String(left?.name || "").localeCompare(String(right?.name || ""))
      || Number(left?.id || 0) - Number(right?.id || 0)
    ));

  if (allowedNames.length > 0) {
    return candidates[0] || null;
  }

  return candidates.length === 1 ? candidates[0] : null;
}

export function resolveBankingIntent(rule = DEFAULT_BANKING_RULE, snapshot = {}) {
  const normalizedRule = normalizeBankingRule(rule);
  const carriedGold = getCarriedGoldValue(snapshot);

  switch (normalizedRule.operation) {
    case "deposit-all": {
      const depositAmount = carriedGold - normalizedRule.reserveGold;
      if (depositAmount <= 0) return null;
      return {
        operation: depositAmount >= carriedGold && normalizedRule.reserveGold <= 0 ? "deposit-all" : "deposit",
        amount: depositAmount,
        command: depositAmount >= carriedGold && normalizedRule.reserveGold <= 0
          ? "deposit all"
          : `deposit ${depositAmount}`,
        successPatterns: getIntentSuccessPatterns("deposit-all"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    }
    case "deposit": {
      if (normalizedRule.amount <= 0 || carriedGold <= 0) return null;
      const depositAmount = Math.min(normalizedRule.amount, carriedGold);
      if (depositAmount <= 0) return null;
      return {
        operation: "deposit",
        amount: depositAmount,
        command: `deposit ${depositAmount}`,
        successPatterns: getIntentSuccessPatterns("deposit"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    }
    case "deposit-excess": {
      const depositAmount = carriedGold - normalizedRule.reserveGold;
      if (depositAmount <= 0) return null;
      return {
        operation: "deposit-excess",
        amount: depositAmount,
        command: depositAmount >= carriedGold && normalizedRule.reserveGold <= 0
          ? "deposit all"
          : `deposit ${depositAmount}`,
        successPatterns: getIntentSuccessPatterns("deposit-excess"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    }
    case "withdraw": {
      if (normalizedRule.amount <= 0) return null;
      return {
        operation: "withdraw",
        amount: normalizedRule.amount,
        command: `withdraw ${normalizedRule.amount}`,
        successPatterns: getIntentSuccessPatterns("withdraw"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    }
    case "withdraw-up-to": {
      const withdrawAmount = Math.max(0, normalizedRule.amount - carriedGold);
      if (withdrawAmount <= 0) return null;
      return {
        operation: "withdraw-up-to",
        amount: withdrawAmount,
        targetOnHand: normalizedRule.amount,
        command: `withdraw ${withdrawAmount}`,
        successPatterns: getIntentSuccessPatterns("withdraw-up-to"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    }
    case "balance":
      return {
        operation: "balance",
        amount: 0,
        command: "balance",
        successPatterns: getIntentSuccessPatterns("balance"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    case "transfer":
      if (normalizedRule.amount <= 0 || !normalizedRule.recipient) return null;
      return {
        operation: "transfer",
        amount: normalizedRule.amount,
        recipient: normalizedRule.recipient,
        command: `transfer ${normalizedRule.amount} to ${normalizedRule.recipient}`,
        successPatterns: getIntentSuccessPatterns("transfer"),
        failurePatterns: GENERIC_FAILURE_PATTERNS,
        confirmationPatterns: GENERIC_CONFIRMATION_PATTERNS,
      };
    default:
      return null;
  }
}

export function createBankingConversation({
  rule = DEFAULT_BANKING_RULE,
  ruleIndex = null,
  banker = null,
  snapshot = {},
  waypointKey = "",
  now = Date.now(),
} = {}) {
  const normalizedRule = normalizeBankingRule(rule);
  const normalizedDialogue = normalizeDialogueState(snapshot?.dialogue);
  const intent = resolveBankingIntent(normalizedRule, snapshot);
  if (!intent || !banker?.name) {
    return null;
  }

  return {
    waypointKey: String(waypointKey || "").trim(),
    ruleIndex: Number.isInteger(ruleIndex) ? ruleIndex : null,
    bankerName: String(banker.name || "").trim(),
    bankerId: banker?.id ?? null,
    playerName: String(snapshot?.playerName || "").trim(),
    maxNpcDistance: normalizedRule.maxNpcDistance,
    phase: "greet",
    intent,
    seenKeys: normalizedDialogue.recentMessages.map((message) => message.key),
    dialogueSignature: normalizedDialogue.signature,
    lastSentAt: 0,
    stepTimeoutMs: Math.max(1_200, normalizedRule.cooldownMs || 0),
    commandTimeoutMs: Math.max(4_000, normalizedRule.cooldownMs || 0),
    startedAt: Math.max(0, Number(now) || 0),
  };
}

function getNewDialogueMessages(dialogue = {}, state = {}) {
  const seenKeys = new Set(Array.isArray(state?.seenKeys) ? state.seenKeys : []);
  return (Array.isArray(dialogue?.recentMessages) ? dialogue.recentMessages : [])
    .filter((message) => message && !seenKeys.has(message.key));
}

function classifyBankingResponse(messages = [], state = {}) {
  const normalizedMessages = (Array.isArray(messages) ? messages : [])
    .filter((message) => !hasSpeakerMatch(message, [state?.playerName]));
  const bankBalance = findBankBalanceFromMessages(normalizedMessages);
  const failure = findMatchingDialogueMessage(normalizedMessages, state?.intent?.failurePatterns);
  if (failure) {
    return {
      done: true,
      success: false,
      reason: failure.text,
      bankBalance,
    };
  }

  const confirmation = findMatchingDialogueMessage(normalizedMessages, state?.intent?.confirmationPatterns);
  if (confirmation) {
    return {
      done: false,
      confirm: true,
      reason: confirmation.text,
      bankBalance,
    };
  }

  if (state?.intent?.operation === "balance" && bankBalance != null) {
    return {
      done: true,
      success: true,
      reason: "balance",
      bankBalance,
    };
  }

  const success = findMatchingDialogueMessage(normalizedMessages, state?.intent?.successPatterns);
  if (success) {
    return {
      done: true,
      success: true,
      reason: success.text,
      bankBalance,
    };
  }

  return null;
}

function withDialogueSnapshot(state = {}, dialogue = {}) {
  return {
    ...state,
    seenKeys: Array.isArray(dialogue?.recentMessages)
      ? dialogue.recentMessages.map((message) => message.key)
      : [],
    dialogueSignature: String(dialogue?.signature || ""),
  };
}

export function stepBankingConversation(state = null, snapshot = {}, now = Date.now()) {
  if (!state) {
    return { kind: "idle", state: null };
  }

  const banker = findNearbyBanker(snapshot, {
    bankerNames: [state.bankerName],
    maxNpcDistance: state.maxNpcDistance,
  });
  if (!banker) {
    return {
      kind: "done",
      success: false,
      reason: "banker unavailable",
      state: null,
    };
  }

  const dialogue = normalizeDialogueState(snapshot?.dialogue);
  const newMessages = getNewDialogueMessages(dialogue, state);
  const nextState = withDialogueSnapshot(state, dialogue);

  if (state.phase === "greet") {
    return {
      kind: "send",
      words: "hi",
      state: {
        ...nextState,
        phase: "await-greet",
        lastSentAt: Math.max(0, Number(now) || 0),
      },
    };
  }

  if (state.phase === "await-greet") {
    const greetedByBanker = newMessages.some((message) => hasSpeakerMatch(message, [state.bankerName]));
    if (greetedByBanker || newMessages.length > 0 || now - state.lastSentAt >= state.stepTimeoutMs) {
      return {
        kind: "continue",
        state: {
          ...nextState,
          phase: "command",
        },
      };
    }

    return { kind: "wait", state: nextState };
  }

  if (state.phase === "command") {
    return {
      kind: "send",
      words: state.intent.command,
      state: {
        ...nextState,
        phase: "await-command",
        lastSentAt: Math.max(0, Number(now) || 0),
      },
    };
  }

  if (state.phase === "confirm") {
    return {
      kind: "send",
      words: "yes",
      state: {
        ...nextState,
        phase: "await-confirm",
        lastSentAt: Math.max(0, Number(now) || 0),
      },
    };
  }

  if (state.phase === "await-command" || state.phase === "await-confirm") {
    const result = classifyBankingResponse(newMessages, state);
    if (result?.confirm) {
      return {
        kind: "continue",
        state: {
          ...nextState,
          phase: "confirm",
        },
      };
    }

    if (result?.done) {
      return {
        kind: "done",
        success: result.success !== false,
        reason: result.reason || "",
        bankBalance: result.bankBalance,
        state: null,
      };
    }

    if (now - state.lastSentAt >= state.commandTimeoutMs) {
      return {
        kind: "done",
        success: false,
        reason: "bank response timeout",
        state: null,
      };
    }

    return { kind: "wait", state: nextState };
  }

  return { kind: "wait", state: nextState };
}
