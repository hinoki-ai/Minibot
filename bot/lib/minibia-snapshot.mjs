/*
 * Canonical normalized snapshot for shared modules and tests.
 * Prefer extending this schema over teaching individual modules to depend on
 * raw tick-only fields from the live page integration.
 */
import { normalizeDialogueState } from "./modules/npc-dialogue.mjs";

export const MINIBIA_SNAPSHOT_VERSION = 1;

const FOOD_KEYWORDS = Object.freeze([
  "ham",
  "meat",
  "fish",
  "bread",
  "cheese",
  "apple",
  "banana",
  "cookie",
  "mushroom",
  "egg",
  "brownie",
  "cake",
  "pizza",
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Math.trunc(number);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const entry of value) {
    const text = normalizeText(entry);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(text);
  }

  return normalized.sort((left, right) => left.localeCompare(right, "en", {
    sensitivity: "base",
    numeric: true,
  }));
}

function normalizePosition(value) {
  if (!isRecord(value)) {
    return null;
  }

  const x = normalizeInteger(value.x);
  const y = normalizeInteger(value.y);
  const z = normalizeInteger(value.z);
  if (x == null || y == null || z == null) {
    return null;
  }

  return { x, y, z };
}

function normalizeStats(value) {
  if (!isRecord(value)) {
    return null;
  }

  const health = normalizeInteger(value.health);
  const maxHealth = normalizeInteger(value.maxHealth);
  const mana = normalizeInteger(value.mana);
  const maxMana = normalizeInteger(value.maxMana);
  const healthPercent = normalizeInteger(value.healthPercent);
  const manaPercent = normalizeInteger(value.manaPercent);
  const level = normalizeInteger(value.level);

  if (
    health == null
    && maxHealth == null
    && mana == null
    && maxMana == null
    && healthPercent == null
    && manaPercent == null
    && level == null
  ) {
    return null;
  }

  return {
    health,
    maxHealth,
    mana,
    maxMana,
    healthPercent,
    manaPercent,
    level,
  };
}

function normalizeConditionState(rawSnapshot) {
  const rawConditions = isRecord(rawSnapshot?.conditions)
    ? rawSnapshot.conditions
    : isRecord(rawSnapshot?.player?.conditions)
      ? rawSnapshot.player.conditions
      : {};
  const rawDetection = isRecord(rawSnapshot?.conditionDetection)
    ? rawSnapshot.conditionDetection
    : isRecord(rawSnapshot?.player?.conditionDetection)
      ? rawSnapshot.player.conditionDetection
      : {};
  const hasOwn = (value, key) => Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
  const firstBoolean = (...values) => {
    for (const entry of values) {
      if (typeof entry === "boolean") {
        return entry;
      }
    }
    return false;
  };

  return {
    conditions: {
      light: firstBoolean(rawSnapshot?.hasLightCondition, rawConditions.light),
      poison: firstBoolean(rawSnapshot?.hasPoisonCondition, rawConditions.poison, rawConditions.poisoned),
      magicShield: firstBoolean(rawSnapshot?.hasMagicShieldCondition, rawSnapshot?.hasManaShieldCondition, rawConditions.magicShield, rawConditions.manaShield),
      haste: firstBoolean(rawSnapshot?.hasHasteCondition, rawConditions.haste),
    },
    detection: {
      light: firstBoolean(rawDetection.light, hasOwn(rawSnapshot, "hasLightCondition") ? true : null, hasOwn(rawConditions, "light") ? true : null),
      poison: firstBoolean(
        rawDetection.poison,
        hasOwn(rawSnapshot, "hasPoisonCondition") ? true : null,
        hasOwn(rawConditions, "poison") || hasOwn(rawConditions, "poisoned") ? true : null,
      ),
      magicShield: firstBoolean(
        rawDetection.magicShield,
        hasOwn(rawSnapshot, "hasMagicShieldCondition") || hasOwn(rawSnapshot, "hasManaShieldCondition") ? true : null,
        hasOwn(rawConditions, "magicShield") || hasOwn(rawConditions, "manaShield") ? true : null,
      ),
      haste: firstBoolean(rawDetection.haste, hasOwn(rawSnapshot, "hasHasteCondition") ? true : null, hasOwn(rawConditions, "haste") ? true : null),
    },
  };
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeNameState(value) {
  if (!value && value !== 0) {
    return {
      key: null,
      label: null,
    };
  }

  if (typeof value === "string" || typeof value === "number") {
    const label = normalizeText(value);
    return {
      key: label ? label.toLowerCase().replace(/\s+/g, "-") : null,
      label: label || null,
    };
  }

  if (!isRecord(value)) {
    return {
      key: null,
      label: null,
    };
  }

  const key = normalizeNullableText(value.key ?? value.id ?? value.value);
  const label = normalizeNullableText(value.label ?? value.name ?? value.title ?? value.text ?? key);
  return {
    key: key ? key.toLowerCase().replace(/\s+/g, "-") : (label ? label.toLowerCase().replace(/\s+/g, "-") : null),
    label: label || null,
  };
}

function collectValues(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value instanceof Map || value instanceof Set) {
    return Array.from(value.values());
  }
  if (isRecord(value)) {
    return Object.values(value);
  }
  return [];
}

function collectTextCandidates(value, depth = 0, seen = new Set()) {
  if (value == null || depth > 2) {
    return [];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (!isRecord(value) || seen.has(value)) {
    return [];
  }
  seen.add(value);

  const collected = [];
  for (const [key, entry] of Object.entries(value)) {
    if (/^(?:item|items|slots)$/i.test(key)) {
      continue;
    }
    collected.push(String(key));
    collected.push(...collectTextCandidates(entry, depth + 1, seen));
  }
  return collected;
}

function normalizeModeIdentifier(value, synonyms) {
  if (value == null) {
    return null;
  }

  const numeric = normalizeInteger(value);
  if (numeric != null && typeof value !== "string") {
    return String(numeric);
  }

  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return null;
  }

  for (const [normalized, patterns] of Object.entries(synonyms)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      return normalized;
    }
  }

  return text;
}

function normalizeCombatModes(rawSnapshot) {
  const fightSource = rawSnapshot?.combatModes?.fightMode
    ?? rawSnapshot?.combat?.fightMode
    ?? rawSnapshot?.fightMode
    ?? rawSnapshot?.playerFightMode
    ?? null;
  const chaseSource = rawSnapshot?.combatModes?.chaseMode
    ?? rawSnapshot?.combat?.chaseMode
    ?? rawSnapshot?.chaseMode
    ?? rawSnapshot?.playerChaseMode
    ?? null;

  return {
    fightMode: normalizeModeIdentifier(fightSource, {
      offensive: [/\boff(?:ensive)?\b/, /\bfull\b/, /\battack\b/],
      balanced: [/\bbalance(?:d)?\b/, /\bshared\b/],
      defensive: [/\bdef(?:ensive|ense)?\b/, /\bsafe\b/],
    }),
    chaseMode: normalizeModeIdentifier(chaseSource, {
      follow: [/\bchase\b/, /\bfollow\b/, /\bon\b/],
      stand: [/\bstand\b/, /\boff\b/, /\bhold\b/, /\bstop\b/],
    }),
    rawFightMode: fightSource ?? null,
    rawChaseMode: chaseSource ?? null,
  };
}

function inferItemName(item) {
  for (const candidate of [
    item?.name,
    item?.title,
    item?.label,
    item?.type?.name,
    item?.itemType?.name,
    item?.definition?.name,
  ]) {
    const text = normalizeText(candidate);
    if (text) {
      return text;
    }
  }

  return "";
}

function inferItemTags(item) {
  const tags = [];
  for (const source of [
    item?.tags,
    item?.keywords,
    item?.categories,
  ]) {
    for (const entry of collectValues(source)) {
      const text = normalizeText(entry);
      if (text) {
        tags.push(text);
      }
    }
  }
  return normalizeStringArray(tags);
}

function inferItemFlags(item, slotLabel = "") {
  const text = [
    slotLabel,
    item?.name,
    item?.slotType,
    ...(item?.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    potion: /\bpotion\b/.test(text),
    rune: /\brune\b/.test(text),
    food: FOOD_KEYWORDS.some((keyword) => text.includes(keyword)),
    ammo: /\b(?:ammo|ammunition|quiver|arrow|bolt|dart|spear|throwing)\b/.test(text),
    rope: /\brope\b/.test(text),
    shovel: /\bshovel\b/.test(text),
  };
}

function normalizeInventoryItem(rawItem, { slotLabel = "" } = {}) {
  if (rawItem == null) {
    return null;
  }

  if (!isRecord(rawItem)) {
    const name = normalizeText(rawItem);
    if (!name) {
      return null;
    }

    const tags = [];
    const flags = inferItemFlags({ name, tags }, slotLabel);
    return {
      id: null,
      name,
      count: 1,
      article: "",
      slotType: "",
      tags,
      flags,
    };
  }

  const id = normalizeInteger(
    rawItem.id
    ?? rawItem.itemId
    ?? rawItem.clientId
    ?? rawItem.serverId,
  );
  const name = inferItemName(rawItem);
  const count = normalizeInteger(rawItem.count) ?? ((id != null || name) ? 1 : 0);
  const article = normalizeText(rawItem.article);
  const slotType = normalizeText(rawItem.slotType ?? rawItem.type?.slotType);
  const tags = inferItemTags(rawItem);

  if (id == null && !name) {
    return null;
  }

  const flags = inferItemFlags({ name, slotType, tags }, slotLabel);
  return {
    id,
    name,
    count,
    article,
    slotType,
    tags,
    flags,
  };
}

function normalizeHotbarKind(rawSlot) {
  const text = [
    rawSlot?.kind,
    rawSlot?.type,
    rawSlot?.actionType,
    rawSlot?.action,
    rawSlot?.label,
    rawSlot?.slotLabel,
    rawSlot?.title,
    rawSlot?.words,
    rawSlot?.text,
    rawSlot?.command,
    rawSlot?.message,
    rawSlot?.macro,
    rawSlot?.spellName,
    rawSlot?.spell?.name,
  ]
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (!text) {
    if (rawSlot?.item) {
      return "item";
    }
    if (rawSlot?.spell || rawSlot?.spellName || rawSlot?.spellId) {
      return "spell";
    }
    return "";
  }

  if (/attack nearest|nearest attack/.test(text)) return "action";
  if (/spell/.test(text)) return "spell";
  if (/item/.test(text)) return "item";
  if (/\baction\b/.test(text)) return "action";
  if (/text|macro|command/.test(text)) return "text";
  return text;
}

function normalizeHotbarActionType(rawSlot) {
  const text = [
    rawSlot?.actionType,
    rawSlot?.action,
    rawSlot?.kind,
    rawSlot?.type,
    rawSlot?.label,
    rawSlot?.slotLabel,
    rawSlot?.title,
    rawSlot?.words,
    rawSlot?.text,
    rawSlot?.command,
    rawSlot?.message,
    rawSlot?.macro,
  ]
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (/attack nearest|nearest attack/.test(text)) {
    return "attack-nearest";
  }

  const actionType = normalizeText(rawSlot?.actionType ?? rawSlot?.action).toLowerCase();
  return actionType || null;
}

function getSlotLabel(rawSlot, labelSource, index) {
  const direct = normalizeText(
    rawSlot?.label
    ?? rawSlot?.slotLabel
    ?? rawSlot?.title,
  );
  if (direct) {
    return direct;
  }

  if (Array.isArray(labelSource)) {
    return normalizeText(labelSource[index]);
  }

  if (isRecord(labelSource)) {
    return normalizeText(labelSource[index]);
  }

  return "";
}

function normalizeSlot(rawSlot, index, labelSource = null) {
  const structuredSlot = isRecord(rawSlot)
    && (
      Object.hasOwn(rawSlot, "item")
      || Object.hasOwn(rawSlot, "index")
      || Object.hasOwn(rawSlot, "slotIndex")
      || Object.hasOwn(rawSlot, "label")
      || Object.hasOwn(rawSlot, "slotLabel")
      || Object.hasOwn(rawSlot, "empty")
      || Object.hasOwn(rawSlot, "kind")
      || Object.hasOwn(rawSlot, "words")
      || Object.hasOwn(rawSlot, "spellName")
      || Object.hasOwn(rawSlot, "spellId")
    );
  const slotIndex = normalizeInteger(rawSlot?.index ?? rawSlot?.slotIndex) ?? index;
  const label = getSlotLabel(rawSlot, labelSource, index);
  const rawItem = structuredSlot ? (rawSlot.item ?? null) : rawSlot;
  const item = normalizeInventoryItem(rawItem, { slotLabel: label });
  const words = normalizeText(rawSlot?.words ?? rawSlot?.spell?.words);
  const spellName = normalizeText(rawSlot?.spellName ?? rawSlot?.spell?.name);
  const hotkey = normalizeText(rawSlot?.hotkey ?? rawSlot?.keybind ?? rawSlot?.shortcut ?? rawSlot?.key);
  const spellId = normalizeText(rawSlot?.spellId ?? rawSlot?.spell?.id);
  const kind = normalizeHotbarKind(rawSlot);
  const actionType = kind === "action" ? normalizeHotbarActionType(rawSlot) : null;
  const populated = Boolean(item || words || spellName || kind);

  return {
    index: slotIndex,
    label,
    kind,
    empty: !populated,
    item,
    itemId: item?.id ?? null,
    count: item?.count ?? 0,
    hotkey: hotkey || null,
    words: words || null,
    spellId: spellId || null,
    spellName: spellName || null,
    actionType,
    active: typeof rawSlot?.active === "boolean" ? rawSlot.active : false,
    enabled: typeof rawSlot?.enabled === "boolean"
      ? rawSlot.enabled
      : (rawSlot?.disabled === true ? false : true),
  };
}

function normalizeSlotCollection(rawSlots, labelSource = null) {
  return collectValues(rawSlots).map((slot, index) => normalizeSlot(slot, index, labelSource));
}

function normalizeCreatureEntry(entry) {
  if (!isRecord(entry)) {
    return null;
  }

  const id = normalizeInteger(entry.id) ?? normalizeInteger(entry.creatureId);
  const name = normalizeText(entry.name);
  const position = normalizePosition(entry.position);
  const healthPercent = normalizeInteger(entry.healthPercent);
  const isShootable = typeof entry.isShootable === "boolean" ? entry.isShootable : null;
  const dx = normalizeInteger(entry.dx);
  const dy = normalizeInteger(entry.dy);
  const dz = normalizeInteger(entry.dz);
  const distance = normalizeInteger(entry.distance);
  const chebyshevDistance = normalizeInteger(entry.chebyshevDistance);

  return {
    id,
    name,
    position,
    healthPercent,
    skull: normalizeNameState(entry.skull),
    isTargetingSelf: normalizeBoolean(entry.isTargetingSelf, false),
    isShootable,
    dx,
    dy,
    dz,
    distance,
    chebyshevDistance,
    withinCombatWindow: normalizeBoolean(entry.withinCombatWindow, false),
    withinCombatBox: normalizeBoolean(entry.withinCombatBox, false),
    reachableForCombat: normalizeBoolean(entry.reachableForCombat, false),
    isCurrentTarget: normalizeBoolean(entry.isCurrentTarget, false),
    isAxisAligned: normalizeBoolean(entry.isAxisAligned, false),
    isDiagonalAligned: normalizeBoolean(entry.isDiagonalAligned, false),
  };
}

function normalizeConnection(rawConnection) {
  const connection = isRecord(rawConnection) ? rawConnection : {};

  return {
    connected: normalizeBoolean(connection.connected, true),
    wasConnected: normalizeBoolean(connection.wasConnected, false),
    reconnecting: normalizeBoolean(connection.reconnecting, false),
    intentionalClose: normalizeBoolean(connection.intentionalClose, false),
    reconnectMethodAvailable: normalizeBoolean(connection.reconnectMethodAvailable, false),
    canReconnect: normalizeBoolean(connection.canReconnect, false),
    reconnectOverlayVisible: normalizeBoolean(connection.reconnectOverlayVisible, false),
    reconnectButtonVisible: normalizeBoolean(connection.reconnectButtonVisible, false),
    reconnectButtonDisabled: normalizeBoolean(connection.reconnectButtonDisabled, false),
    playerIsDead: normalizeBoolean(connection.playerIsDead, false),
    deathModalVisible: normalizeBoolean(connection.deathModalVisible, false),
    loginWrapperVisible: normalizeBoolean(connection.loginWrapperVisible, false),
    loginModalVisible: normalizeBoolean(connection.loginModalVisible, false),
    characterSelectVisible: normalizeBoolean(connection.characterSelectVisible, false),
    connectingModalVisible: normalizeBoolean(connection.connectingModalVisible, false),
    connectingFooterVisible: normalizeBoolean(connection.connectingFooterVisible, false),
    authFailure: normalizeBoolean(connection.authFailure, false),
    lifecycle: normalizeText(connection.lifecycle).toLowerCase() || "unknown",
    serverError: normalizeText(connection.serverError),
    reconnectMessage: normalizeText(connection.reconnectMessage),
    deathMessage: normalizeText(connection.deathMessage),
    connectingMessage: normalizeText(connection.connectingMessage),
    lastCharacterName: normalizeText(connection.lastCharacterName),
  };
}

function normalizeEquipment(rawEquipment) {
  const equipment = isRecord(rawEquipment) ? rawEquipment : {};
  return {
    slots: normalizeSlotCollection(
      equipment.slots ?? equipment.entries ?? rawEquipment,
      equipment.slotLabels ?? equipment.labels ?? null,
    ),
  };
}

function normalizeHotbar(rawHotbar) {
  const hotbar = isRecord(rawHotbar) ? rawHotbar : {};
  return {
    slots: normalizeSlotCollection(
      hotbar.slots ?? hotbar.entries ?? hotbar.buttons ?? rawHotbar,
      hotbar.slotLabels ?? hotbar.labels ?? null,
    ),
    selectedIndex: normalizeInteger(hotbar.selectedIndex),
  };
}

function normalizeContainers(rawContainers) {
  return collectValues(rawContainers).map((container) => {
    const slots = normalizeSlotCollection(container?.slots ?? container?.items ?? []);
    return {
      runtimeId: normalizeInteger(container?.runtimeId ?? container?.__containerId),
      itemId: normalizeInteger(container?.itemId ?? container?.id ?? container?.clientId ?? container?.serverId),
      name: normalizeText(container?.name ?? container?.label ?? container?.title),
      capacity: normalizeInteger(container?.capacity ?? container?.size ?? slots.length),
      open: container?.open !== false,
      slots,
    };
  });
}

function normalizePvpState(rawSnapshot) {
  const pvpState = isRecord(rawSnapshot?.pvpState)
    ? rawSnapshot.pvpState
    : isRecord(rawSnapshot?.pvp)
      ? rawSnapshot.pvp
      : {};

  return {
    pkLockEnabled: normalizeBoolean(
      pvpState.pkLockEnabled ?? pvpState.pkLock,
      false,
    ),
    pzLocked: normalizeBoolean(
      pvpState.pzLocked ?? pvpState.pzLock,
      false,
    ),
    skull: normalizeNameState(pvpState.skull),
  };
}

function normalizeDialogueContract(rawSnapshot) {
  const rawDialogue = isRecord(rawSnapshot?.dialogue)
    ? rawSnapshot.dialogue
    : isRecord(rawSnapshot?.dialogueState)
      ? rawSnapshot.dialogueState
      : {};
  const dialogue = normalizeDialogueState(rawDialogue);
  const options = Array.isArray(dialogue?.options)
    ? dialogue.options.map((option, index) => ({
      index: normalizeInteger(option?.index) ?? index,
      text: normalizeText(option?.text) || "",
    })).filter((option) => option.text)
    : [];

  return {
    playerName: normalizeNullableText(rawDialogue.playerName ?? dialogue.playerName),
    activeChannelName: dialogue.activeChannelName || "",
    defaultChannelName: dialogue.defaultChannelName || "",
    defaultChannelActive: dialogue.defaultChannelActive === true,
    open: dialogue.open === true,
    npcName: normalizeNullableText(rawDialogue.npcName ?? dialogue.npcName),
    prompt: normalizeNullableText(rawDialogue.prompt ?? dialogue.prompt),
    options,
    recentMessages: Array.isArray(dialogue.recentMessages)
      ? dialogue.recentMessages.map((message) => ({
        id: normalizeText(message?.id) || "",
        key: normalizeText(message?.key) || "",
        text: normalizeText(message?.text) || "",
        speaker: normalizeText(message?.speaker) || "",
        mode: normalizeText(message?.mode) || "",
        channelName: normalizeText(message?.channelName) || "",
        timestamp: normalizeInteger(message?.timestamp) ?? 0,
      })).filter((message) => message.text)
      : [],
    signature: normalizeText(dialogue.signature),
    bankBalance: normalizeInteger(rawDialogue.bankBalance ?? dialogue.bankBalance),
    bankState: {
      open: dialogue?.bankState?.open === true,
      balance: normalizeInteger(dialogue?.bankState?.balance),
    },
    tradeState: {
      open: dialogue?.tradeState?.open === true,
      side: normalizeNullableText(dialogue?.tradeState?.side),
      visibleBuyCount: normalizeInteger(dialogue?.tradeState?.visibleBuyCount) ?? 0,
      visibleSellCount: normalizeInteger(dialogue?.tradeState?.visibleSellCount) ?? 0,
      selectedItemId: normalizeInteger(dialogue?.tradeState?.selectedItemId),
      selectedItemName: normalizeNullableText(dialogue?.tradeState?.selectedItemName),
      quantity: normalizeInteger(dialogue?.tradeState?.quantity),
    },
    travelState: {
      open: dialogue?.travelState?.open === true,
      destination: normalizeNullableText(dialogue?.travelState?.destination),
      pendingConfirmation: dialogue?.travelState?.pendingConfirmation === true,
    },
  };
}

function normalizeTradeEntry(entry = {}, index = 0, fallbackSide = "buy") {
  if (!entry || (typeof entry !== "object" && typeof entry !== "string")) {
    return null;
  }

  const itemId = normalizeInteger(entry?.itemId ?? entry?.id ?? entry?.clientId ?? entry?.serverId);
  const name = normalizeText(entry?.name ?? entry?.label ?? entry?.title ?? entry?.itemName ?? entry);
  const price = normalizeInteger(entry?.price ?? entry?.cost ?? entry?.value) ?? 0;
  const side = normalizeText(entry?.side ?? fallbackSide).toLowerCase();

  if (itemId == null && !name) {
    return null;
  }

  return {
    index: normalizeInteger(entry?.index) ?? index,
    itemId,
    name,
    price,
    side: side === "sell" ? "sell" : "buy",
  };
}

function normalizeTradeState(rawSnapshot) {
  const rawTrade = isRecord(rawSnapshot?.trade)
    ? rawSnapshot.trade
    : isRecord(rawSnapshot?.tradeState)
      ? rawSnapshot.tradeState
      : {};
  const buyItems = collectValues(rawTrade.buyItems ?? rawTrade.buyList ?? rawTrade.buyEntries)
    .map((entry, index) => normalizeTradeEntry(entry, index, "buy"))
    .filter(Boolean);
  const sellItems = collectValues(rawTrade.sellItems ?? rawTrade.sellList ?? rawTrade.sellEntries)
    .map((entry, index) => normalizeTradeEntry(entry, index, "sell"))
    .filter(Boolean);
  const selectedItem = normalizeTradeEntry(
    rawTrade.selectedItem
    ?? rawTrade.currentItem
    ?? rawTrade.selectedEntry
    ?? null,
    0,
    rawTrade.activeSide,
  );
  const activeSide = normalizeText(rawTrade.activeSide ?? rawTrade.side).toLowerCase();

  return {
    open: normalizeBoolean(
      rawTrade.open,
      buyItems.length > 0 || sellItems.length > 0,
    ),
    npcName: normalizeNullableText(rawTrade.npcName ?? rawTrade.sellerName ?? rawTrade.shopName),
    activeSide: activeSide === "sell" ? "sell" : activeSide === "buy" ? "buy" : null,
    selectedItem,
    buyItems,
    sellItems,
  };
}

function normalizeBankState(rawSnapshot, dialogue = null) {
  const rawBank = isRecord(rawSnapshot?.bank)
    ? rawSnapshot.bank
    : isRecord(rawSnapshot?.bankState)
      ? rawSnapshot.bankState
      : {};
  const bankBalance = normalizeInteger(
    rawBank.bankBalance
    ?? rawBank.balance
    ?? dialogue?.bankBalance,
  );
  const npcName = normalizeNullableText(
    rawBank.npcName
    ?? rawBank.bankerName
    ?? dialogue?.npcName,
  );

  return {
    open: normalizeBoolean(rawBank.open, bankBalance != null || Boolean(npcName)),
    npcName,
    bankBalance,
    prompt: normalizeNullableText(rawBank.prompt ?? dialogue?.prompt),
  };
}

function normalizeTaskState(rawSnapshot) {
  const rawTask = isRecord(rawSnapshot?.task)
    ? rawSnapshot.task
    : isRecord(rawSnapshot?.taskState)
      ? rawSnapshot.taskState
      : isRecord(rawSnapshot?.tasks)
        ? rawSnapshot.tasks
        : {};

  return {
    open: normalizeBoolean(
      rawTask.open,
      rawTask.rewardReady === true
        || rawTask.progressCurrent != null
        || rawTask.progressRequired != null
        || rawTask.taskTarget != null
        || rawTask.activeTaskType != null,
    ),
    activeTaskType: normalizeNullableText(rawTask.activeTaskType ?? rawTask.type),
    taskNpc: normalizeNullableText(rawTask.taskNpc ?? rawTask.npcName),
    taskTarget: normalizeNullableText(rawTask.taskTarget ?? rawTask.target),
    progressCurrent: normalizeInteger(rawTask.progressCurrent ?? rawTask.current),
    progressRequired: normalizeInteger(rawTask.progressRequired ?? rawTask.required),
    rewardReady: normalizeBoolean(rawTask.rewardReady, false),
  };
}

function findAmmoSlot(equipment, explicitAmmo) {
  if (explicitAmmo && isRecord(explicitAmmo)) {
    const normalizedItem = normalizeInventoryItem(explicitAmmo.item ?? explicitAmmo, {
      slotLabel: explicitAmmo.label,
    });
    if (normalizedItem) {
      return {
        slotIndex: normalizeInteger(explicitAmmo.slotIndex),
        label: normalizeText(explicitAmmo.label),
        item: normalizedItem,
        count: normalizedItem.count,
      };
    }
  }

  const slot = equipment.slots.find((entry) => {
    const slotText = [entry.label, entry.item?.name, entry.item?.slotType]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return entry.item && /\b(?:quiver|ammo|ammunition)\b/.test(slotText);
  });

  if (!slot?.item) {
    return null;
  }

  return {
    slotIndex: slot.index,
    label: slot.label,
    item: slot.item,
    count: slot.item.count,
  };
}

export function collectSnapshotInventoryItems(snapshotLike) {
  const snapshot = snapshotLike?.schemaVersion === MINIBIA_SNAPSHOT_VERSION
    ? snapshotLike
    : normalizeMinibiaSnapshot(snapshotLike);
  const collected = [];

  const pushItems = (ownerType, ownerId, slots = []) => {
    for (const slot of slots) {
      if (!slot?.item) {
        continue;
      }
      collected.push({
        ownerType,
        ownerId,
        slotIndex: slot.index,
        slotLabel: slot.label,
        item: slot.item,
      });
    }
  };

  pushItems("equipment", "equipment", snapshot.inventory.equipment.slots);
  pushItems("hotbar", "hotbar", snapshot.inventory.hotbar.slots);
  for (const container of snapshot.inventory.containers) {
    pushItems("container", container.runtimeId ?? container.itemId ?? container.name, container.slots);
  }

  return collected;
}

export function summarizeSnapshotSupplies(snapshotLike) {
  const items = collectSnapshotInventoryItems(snapshotLike);
  const totals = {
    potions: 0,
    runes: 0,
    food: 0,
    ammo: 0,
    rope: 0,
    shovel: 0,
  };
  const entries = [];
  const totalKeyByCategory = {
    potion: "potions",
    rune: "runes",
    food: "food",
    ammo: "ammo",
    rope: "rope",
    shovel: "shovel",
  };

  for (const entry of items) {
    const { item } = entry;
    const count = Math.max(0, normalizeInteger(item?.count) ?? 0);
    const categories = Object.entries(item?.flags || {})
      .filter(([, matched]) => matched === true)
      .map(([category]) => category);

    if (!categories.length) {
      continue;
    }

    for (const category of categories) {
      const totalKey = totalKeyByCategory[category];
      if (totalKey && Object.hasOwn(totals, totalKey)) {
        totals[totalKey] += count;
      }
    }

    entries.push({
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      slotIndex: entry.slotIndex,
      slotLabel: entry.slotLabel,
      itemId: item?.id ?? null,
      name: item?.name ?? "",
      count,
      categories,
    });
  }

  return {
    ...totals,
    entries,
  };
}

function normalizeProgression(rawSnapshot) {
  const progression = isRecord(rawSnapshot?.progression) ? rawSnapshot.progression : rawSnapshot;
  return {
    blessings: normalizeStringArray(progression?.blessings),
    residence: normalizeText(progression?.residence) || null,
    promotion: normalizeText(progression?.promotion) || null,
    vocation: normalizeText(progression?.vocation) || null,
    vocationSource: normalizeText(progression?.vocationSource) || null,
  };
}

export function normalizeMinibiaSnapshot(rawSnapshot = {}) {
  const snapshot = isRecord(rawSnapshot) ? rawSnapshot : {};
  const equipment = normalizeEquipment(snapshot.equipment ?? snapshot.inventory?.equipment ?? null);
  const hotbar = normalizeHotbar(snapshot.hotbar ?? snapshot.inventory?.hotbar ?? null);
  const containers = normalizeContainers(snapshot.containers ?? snapshot.inventory?.containers ?? []);
  const conditionState = normalizeConditionState(snapshot);
  const dialogue = normalizeDialogueContract(snapshot);
  const trade = normalizeTradeState(snapshot);
  const bank = normalizeBankState(snapshot, dialogue);
  const task = normalizeTaskState(snapshot);
  const supplies = summarizeSnapshotSupplies({
    schemaVersion: MINIBIA_SNAPSHOT_VERSION,
    inventory: {
      equipment,
      hotbar,
      containers,
    },
  });

  return {
    schemaVersion: MINIBIA_SNAPSHOT_VERSION,
    ready: snapshot.ready === true,
    reason: normalizeText(snapshot.reason),
    player: {
      name: normalizeText(snapshot.playerName ?? snapshot.player?.name),
      position: normalizePosition(snapshot.playerPosition ?? snapshot.player?.position),
      stats: normalizeStats(snapshot.playerStats ?? snapshot.player?.stats),
      conditions: conditionState.conditions,
      conditionDetection: conditionState.detection,
    },
    connection: normalizeConnection(snapshot.connection),
    movement: {
      moving: normalizeBoolean(snapshot.isMoving, false),
      autoWalking: normalizeBoolean(snapshot.pathfinderAutoWalking, false),
      autoWalkStepsRemaining: normalizeInteger(snapshot.autoWalkStepsRemaining) ?? 0,
      destination: normalizePosition(snapshot.pathfinderFinalDestination),
    },
    combat: {
      monsterNames: normalizeStringArray(snapshot.monsterNames),
      target: normalizeCreatureEntry(snapshot.currentTarget),
      followTarget: normalizeCreatureEntry(snapshot.currentFollowTarget ?? snapshot.followTarget),
      visibleMonsters: collectValues(snapshot.visibleCreatures ?? snapshot.visibleMonsters)
        .map((entry) => normalizeCreatureEntry(entry))
        .filter(Boolean),
      visiblePlayers: collectValues(snapshot.visiblePlayers)
        .map((entry) => normalizeCreatureEntry(entry))
        .filter(Boolean),
      visibleNpcs: collectValues(snapshot.visibleNpcs)
        .map((entry) => normalizeCreatureEntry(entry))
        .filter(Boolean),
      visibleMonsterNames: normalizeStringArray(snapshot.visibleMonsterNames),
      visiblePlayerNames: normalizeStringArray(snapshot.visiblePlayerNames),
      visibleNpcNames: normalizeStringArray(snapshot.visibleNpcNames),
      elementalFields: collectValues(snapshot.elementalFields).map((entry) => ({
        position: normalizePosition(entry?.position),
        types: normalizeStringArray(entry?.types),
        ids: collectValues(entry?.ids)
          .map((value) => normalizeInteger(value))
          .filter((value) => value != null),
      })),
      hazardTiles: collectValues(snapshot.hazardTiles).map((entry) => ({
        position: normalizePosition(entry?.position),
        categories: normalizeStringArray(entry?.categories),
        labels: normalizeStringArray(entry?.labels),
        ids: collectValues(entry?.ids)
          .map((value) => normalizeInteger(value))
          .filter((value) => value != null),
      })),
      walkableTiles: collectValues(snapshot.walkableTiles)
        .map((entry) => normalizePosition(entry))
        .filter(Boolean),
      reachableWalkableTiles: collectValues(snapshot.reachableWalkableTiles)
        .map((entry) => normalizePosition(entry))
        .filter(Boolean),
      safeTiles: collectValues(snapshot.safeTiles)
        .map((entry) => normalizePosition(entry))
        .filter(Boolean),
      reachableTiles: collectValues(snapshot.reachableTiles)
        .map((entry) => normalizePosition(entry))
        .filter(Boolean),
      modes: normalizeCombatModes(snapshot),
    },
    pvp: normalizePvpState(snapshot),
    inventory: {
      currency: isRecord(snapshot.currency) ? { ...snapshot.currency } : {},
      hotbar,
      equipment,
      containers,
      ammo: findAmmoSlot(equipment, snapshot.inventory?.ammo ?? snapshot.ammo),
      supplies,
    },
    progression: normalizeProgression(snapshot),
    dialogue,
    trade,
    bank,
    task,
    sourceHints: normalizeStringArray(collectTextCandidates({
      hotbar: snapshot.hotbar,
      equipment: snapshot.equipment,
      progression: snapshot.progression,
      conditions: snapshot.conditions,
      conditionDetection: snapshot.conditionDetection,
      combatModes: snapshot.combatModes,
      pvpState: snapshot.pvpState,
      dialogue: snapshot.dialogue,
      trade: snapshot.trade,
      bank: snapshot.bank,
      task: snapshot.task,
    })),
  };
}
