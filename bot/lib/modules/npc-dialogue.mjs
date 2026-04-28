/*
 * Dialogue normalization helpers for bank and progression flows.
 * Keep message, option, signature, match, and balance parsing generic here so
 * higher-level NPC modules can share the same dialogue contract and stay
 * resilient to minor UI text drift.
 */

export const NPC_DIALOGUE_WINDOW = 40;

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function collectValues(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value.values === "function") {
    return Array.from(value.values());
  }
  if (value && typeof value === "object") {
    return Object.values(value);
  }
  return [];
}

function escapeRegExp(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPatternMatcher(pattern) {
  if (pattern instanceof RegExp) {
    return pattern;
  }

  return new RegExp(escapeRegExp(String(pattern || "")), "i");
}

function parseNumericText(value = "") {
  const normalized = String(value || "").replace(/[^0-9]/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDialogueMessage(message = {}, index = 0) {
  const isStringMessage = typeof message === "string";
  const text = normalizeText(
    isStringMessage
      ? message
      : (
        message?.text
        ?? message?.message
        ?? message?.content
        ?? message?.value
        ?? message?.plainText
        ?? message?.renderedText
        ?? message?.element?.textContent
        ?? ""
      ),
  );
  const speaker = normalizeText(
    isStringMessage
      ? ""
      : (
        message?.speaker
        ?? message?.author
        ?? message?.sender
        ?? message?.name
        ?? message?.creatureName
        ?? message?.from
        ?? ""
      ),
  );
  const mode = normalizeText(
    isStringMessage
      ? ""
      : (
        message?.mode
        ?? message?.type
        ?? message?.talkType
        ?? message?.channelMode
        ?? ""
      ),
  );
  const channelName = normalizeText(
    isStringMessage
      ? ""
      : (
        message?.channelName
        ?? message?.channel
        ?? ""
      ),
  );
  const timestamp = Number(message?.timestamp ?? message?.time ?? message?.createdAt ?? 0) || 0;
  const rawId = isStringMessage
    ? ""
    : String(
      message?.id
      ?? message?.uid
      ?? message?.messageId
      ?? message?.key
      ?? "",
    ).trim();
  const lowerSpeaker = speaker.toLowerCase();
  const lowerChannelName = channelName.toLowerCase();
  const lowerText = text.toLowerCase();
  const identity = rawId
    ? `id:${rawId}`
    : timestamp > 0
      ? `ts:${timestamp}`
      : "msg";
  const key = [
    identity,
    lowerSpeaker,
    lowerChannelName,
    lowerText,
    rawId ? String(timestamp || 0) : "",
  ].join("|");

  return {
    id: rawId,
    key,
    text,
    lowerText,
    speaker,
    lowerSpeaker,
    mode,
    channelName,
    timestamp,
  };
}

export function buildDialogueMessageSignature(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message, index) => normalizeDialogueMessage(message, index).key)
    .join("||");
}

export function findBankBalanceInText(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const patterns = [
    /\b(?:account balance(?: is|:)?|balance(?: is|:)?|you have(?: a)? balance of)\s+([\d.,]+)\s+gold\b/i,
    /\byou (?:have|now have)\s+([\d.,]+)\s+gold in (?:your|the) account\b/i,
    /\bthere (?:is|are)\s+([\d.,]+)\s+gold in (?:your|the) account\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const parsed = parseNumericText(match[1]);
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

export function findBankBalanceFromMessages(messages = []) {
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
    const balance = findBankBalanceInText(normalizedMessages[index]?.text);
    if (balance != null) {
      return balance;
    }
  }

  return null;
}

export function normalizeDialogueOption(option = {}, index = 0) {
  const isStringOption = typeof option === "string";
  const text = normalizeText(
    isStringOption
      ? option
      : (
        option?.text
        ?? option?.label
        ?? option?.title
        ?? option?.name
        ?? option?.value
        ?? option?.caption
        ?? option?.element?.textContent
        ?? ""
      ),
  );
  const normalizedIndex = Number.isInteger(option?.index) ? option.index : index;

  return {
    index: normalizedIndex,
    text,
    lowerText: text.toLowerCase(),
    key: `${normalizedIndex}|${text.toLowerCase()}`,
  };
}

function collectDialogueOptions(dialogue = {}) {
  const sources = [
    dialogue?.options,
    dialogue?.buttons,
    dialogue?.choices,
    dialogue?.entries,
  ];
  const collected = [];
  for (const source of sources) {
    for (const option of collectValues(source)) {
      if (option && !collected.includes(option)) {
        collected.push(option);
      }
    }
  }

  return collected
    .map((option, index) => normalizeDialogueOption(option, index))
    .filter((option) => option.text);
}

function getLatestDialogueSpeaker(messages = [], playerName = "") {
  const normalizedPlayerName = normalizeText(playerName).toLowerCase();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const speaker = normalizeText(messages[index]?.speaker);
    if (speaker && speaker.toLowerCase() !== normalizedPlayerName) {
      return speaker;
    }
  }

  return "";
}

function getLatestDialoguePrompt(messages = [], speakerName = "", playerName = "") {
  const normalizedSpeaker = normalizeText(speakerName).toLowerCase();
  const normalizedPlayerName = normalizeText(playerName).toLowerCase();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const text = normalizeText(message?.text);
    const speaker = normalizeText(message?.speaker);
    if (!text) {
      continue;
    }
    if (normalizedSpeaker && speaker.toLowerCase() === normalizedSpeaker) {
      return text;
    }
    if (!normalizedSpeaker && speaker.toLowerCase() !== normalizedPlayerName) {
      return text;
    }
  }

  return normalizeText(messages.at(-1)?.text);
}

function firstNonEmptyText(...values) {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function normalizeTradeState(tradeState = {}, options = []) {
  const side = firstNonEmptyText(
    tradeState?.side,
    tradeState?.selectedSide,
    tradeState?.mode,
  ).toLowerCase();
  const visibleBuyCount = Math.max(
    0,
    collectValues(
      tradeState?.buyItems
      ?? tradeState?.buyEntries
      ?? tradeState?.buyList,
    ).length,
  );
  const visibleSellCount = Math.max(
    0,
    collectValues(
      tradeState?.sellItems
      ?? tradeState?.sellEntries
      ?? tradeState?.sellList,
    ).length,
  );
  const selectedItemId = Number(
    tradeState?.selectedItemId
    ?? tradeState?.itemId
    ?? tradeState?.selectedItem?.id
    ?? tradeState?.selectedItem?.itemId,
  );
  const quantity = Number(
    tradeState?.quantity
    ?? tradeState?.amount
    ?? tradeState?.count
    ?? tradeState?.selectedAmount,
  );
  const open = tradeState?.open === true
    || visibleBuyCount > 0
    || visibleSellCount > 0
    || Boolean(
      options.some((option) => /\b(?:buy|sell|trade)\b/i.test(option?.text || "")),
    );

  return {
    open,
    side: side === "sell" ? "sell" : (side === "buy" ? "buy" : ""),
    visibleBuyCount,
    visibleSellCount,
    selectedItemId: Number.isFinite(selectedItemId) ? Math.trunc(selectedItemId) : null,
    selectedItemName: firstNonEmptyText(
      tradeState?.selectedItemName,
      tradeState?.itemName,
      tradeState?.selectedItem?.name,
      tradeState?.selectedItem?.label,
    ) || null,
    quantity: Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : null,
  };
}

function normalizeTravelState(travelState = {}, prompt = "", options = []) {
  const destination = firstNonEmptyText(
    travelState?.destination,
    travelState?.city,
    travelState?.targetCity,
  );
  const lowerPrompt = normalizeText(prompt).toLowerCase();
  const lowerOptions = options.map((option) => String(option?.lowerText || "").trim());
  const open = travelState?.open === true
    || /\b(?:travel|sail|passage|destination|residence)\b/.test(lowerPrompt)
    || lowerOptions.some((option) => /\b(?:travel|sail|passage|residence)\b/.test(option));
  const pendingConfirmation = travelState?.pendingConfirmation === true
    || (
      /\b(?:would you like|do you want|confirm|yes|no)\b/.test(lowerPrompt)
      && (
        /\b(?:travel|sail|passage|residence|city|town|temple)\b/.test(lowerPrompt)
        || lowerOptions.includes("yes")
      )
    );

  return {
    open,
    destination: destination || null,
    pendingConfirmation,
  };
}

function inferDialogueOpen(dialogue = {}, options = [], prompt = "", npcName = "") {
  if (dialogue?.open === true) {
    return true;
  }
  if (options.length) {
    return true;
  }
  return Boolean(
    normalizeText(
      dialogue?.npcName
      ?? dialogue?.activeNpcName
      ?? dialogue?.openNpcName
      ?? "",
    ) || npcName,
  ) && Boolean(normalizeText(prompt));
}

export function normalizeDialogueState(dialogue = {}, { windowSize = NPC_DIALOGUE_WINDOW } = {}) {
  const messagesSource = Array.isArray(dialogue?.recentMessages)
    ? dialogue.recentMessages
    : Array.isArray(dialogue?.messages)
      ? dialogue.messages
      : [];
  const normalizedMessages = messagesSource
    .map((message, index) => normalizeDialogueMessage(message, index))
    .filter((message) => message.text)
    .slice(-Math.max(1, Math.trunc(Number(windowSize) || NPC_DIALOGUE_WINDOW)));
  const signature = buildDialogueMessageSignature(normalizedMessages);
  const options = collectDialogueOptions(dialogue);
  const playerName = normalizeText(dialogue?.playerName);
  const npcName = firstNonEmptyText(
    dialogue?.npcName,
    dialogue?.activeNpcName,
    dialogue?.openNpcName,
    getLatestDialogueSpeaker(normalizedMessages, playerName),
  );
  const prompt = firstNonEmptyText(
    dialogue?.prompt,
    dialogue?.currentPrompt,
    dialogue?.message,
    getLatestDialoguePrompt(normalizedMessages, npcName, playerName),
  );
  const tradeState = normalizeTradeState(
    dialogue?.tradeState ?? dialogue?.trade ?? {},
    options,
  );
  const bankBalance = (
    Number.isFinite(Number(dialogue?.bankBalance))
      ? Math.max(0, Math.trunc(Number(dialogue.bankBalance)))
      : findBankBalanceFromMessages(normalizedMessages)
  );
  const travelState = normalizeTravelState(
    dialogue?.travelState ?? dialogue?.travel ?? {},
    prompt,
    options,
  );
  const open = inferDialogueOpen(dialogue, options, prompt, npcName);

  return {
    playerName,
    activeChannelName: normalizeText(dialogue?.activeChannelName),
    defaultChannelName: normalizeText(dialogue?.defaultChannelName),
    defaultChannelActive: dialogue?.defaultChannelActive === true,
    open,
    npcName,
    prompt,
    options,
    recentMessages: normalizedMessages,
    signature,
    bankBalance,
    bankState: {
      open: bankBalance != null,
      balance: bankBalance,
    },
    tradeState,
    travelState,
  };
}

export function findDialogueOption(dialogue = {}, patterns = []) {
  const normalizedOptions = Array.isArray(dialogue?.options)
    ? dialogue.options
    : collectDialogueOptions(dialogue);
  const matchers = (Array.isArray(patterns) ? patterns : [patterns])
    .filter(Boolean)
    .map(toPatternMatcher);
  if (!matchers.length) {
    return null;
  }

  return normalizedOptions.find((option) => (
    matchers.some((matcher) => matcher.test(option?.text || ""))
  )) || null;
}

export function hasSpeakerMatch(message = {}, speakerNames = []) {
  const lowerSpeaker = String(message?.lowerSpeaker || message?.speaker || "").trim().toLowerCase();
  if (!lowerSpeaker) return false;

  const normalizedNames = (Array.isArray(speakerNames) ? speakerNames : [speakerNames])
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean);
  if (!normalizedNames.length) return false;

  return normalizedNames.includes(lowerSpeaker);
}

export function findMatchingDialogueMessage(messages = [], patterns = []) {
  const candidates = Array.isArray(messages) ? messages : [];
  const matchers = (Array.isArray(patterns) ? patterns : [patterns])
    .filter(Boolean)
    .map(toPatternMatcher);
  if (!matchers.length) return null;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const message = normalizeDialogueMessage(candidates[index], index);
    if (matchers.some((matcher) => matcher.test(message.text))) {
      return message;
    }
  }

  return null;
}
