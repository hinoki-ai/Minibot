/*
 * Low-level page-side action expression builders.
 * Keep browser-coupled mechanics here and higher-level policy in planners or
 * bot-core so action semantics stay reusable and testable.
 */
function toIntegerLiteral(value, fallback = "Number.NaN") {
  if (value == null || value === "") {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.trunc(number)) : fallback;
}

function toPositionLiteral(position = null) {
  if (!position || typeof position !== "object") {
    return "{ x: Number.NaN, y: Number.NaN, z: Number.NaN }";
  }

  return `{ x: ${toIntegerLiteral(position.x)}, y: ${toIntegerLiteral(position.y)}, z: ${toIntegerLiteral(position.z)} }`;
}

function normalizeLocationRef(ref = {}) {
  if (!ref || typeof ref !== "object") {
    return {
      location: "",
      slotIndex: Number.NaN,
      containerRuntimeId: Number.NaN,
    };
  }

  return {
    location: String(ref.location || ref.kind || ref.ownerType || "").trim().toLowerCase(),
    slotIndex: Number(ref.slotIndex),
    containerRuntimeId: Number(ref.containerRuntimeId),
  };
}

function buildSharedActionHelpersExpression() {
  return `
    const game = window.gameClient;
    const player = game?.player;
    const world = game?.world;
    const ItemUsePacketCtor = globalThis.ItemUsePacket;
    const ItemUseOnCreaturePacketCtor = globalThis.ItemUseOnCreaturePacket || globalThis.ItemUseCreaturePacket;
    const ItemMovePacketCtor = globalThis.ItemMovePacket;
    const PositionCtor = globalThis.Position || player?.__position?.constructor;
    const collectValues = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value.values === "function") return Array.from(value.values());
      return Object.values(value);
    };
    const normalizeText = (value) => String(value || "").replace(/\\s+/g, " ").trim();
    const getItemId = (item) => {
      const value = Number(item?.id ?? item?.itemId ?? item?.clientId ?? item?.serverId);
      return Number.isFinite(value) ? value : null;
    };
    const getItemCount = (item) => {
      const rawCount = Number(item?.count ?? item?.amount ?? item?.charges ?? item?.quantity);
      if (Number.isFinite(rawCount) && rawCount > 0) {
        return Math.trunc(rawCount);
      }
      return item ? 1 : 0;
    };
    const getItemName = (item) => normalizeText(
      item?.name
      || item?.title
      || item?.label
      || item?.type?.name
      || item?.itemType?.name
      || item?.description
      || "",
    );
    const getItemCategory = (item) => {
      const label = getItemName(item).toLowerCase();
      if (!label) return "";
      if (/arrow|bolt|spear|ammunition|ammo/.test(label)) return "ammo";
      if (/potion|fluid/.test(label)) return "potion";
      if (/rune/.test(label)) return "rune";
      if (/\\brope\\b/.test(label)) return "rope";
      if (/shovel/.test(label)) return "shovel";
      if (/food|ham|meat|fish|salmon|mushroom|bread|cheese|banana|apple|cookie/.test(label)) return "food";
      if (/backpack|bag|satchel|pouch|container/.test(label)) return "container";
      return "";
    };
    const getContainers = () => Array.from(player?.__openedContainers || [])
      .filter((container) => container && Array.isArray(container.slots) && typeof container.getSlotItem === "function");
    const getEquipmentEntries = () => {
      const equipment = player?.equipment;
      const slots = Array.isArray(equipment?.slots) ? equipment.slots : [];
      const entries = [];
      if (!equipment || typeof equipment.getSlotItem !== "function") return entries;
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        const item = equipment.getSlotItem(slotIndex);
        if (!item) continue;
        entries.push({
          which: equipment,
          index: slotIndex,
          location: "equipment",
          containerRuntimeId: null,
          item,
        });
      }
      return entries;
    };
    const getContainerEntries = () => {
      const entries = [];
      for (const container of getContainers()) {
        for (let slotIndex = 0; slotIndex < container.slots.length; slotIndex += 1) {
          const item = container.getSlotItem(slotIndex);
          if (!item) continue;
          entries.push({
            which: container,
            index: slotIndex,
            location: "container",
            containerRuntimeId: Number(container?.__containerId) || null,
            item,
          });
        }
      }
      return entries;
    };
    const interruptAutoWalkForInventory = () => {
      const pathfinder = world?.pathfinder;
      const otcGame = globalThis.g_game;
      let interruptedWalk = false;
      for (const [owner, methodName] of [
        [player, "stopAutoWalk"],
        [player, "cancelAutoWalk"],
        [pathfinder, "stopAutoWalk"],
        [pathfinder, "cancelAutoWalk"],
        [game, "stop"],
        [otcGame, "stop"],
      ]) {
        if (!owner || typeof owner[methodName] !== "function") continue;
        try {
          owner[methodName]();
          interruptedWalk = true;
        } catch {}
      }
      return interruptedWalk;
    };
    const tryCall = (owner, methodNames, args = []) => {
      for (const methodName of methodNames) {
        if (typeof owner?.[methodName] !== "function") continue;
        try {
          owner[methodName](...args);
          return methodName;
        } catch {}
      }
      return "";
    };
    const resolveLocationOwner = (descriptor = {}) => {
      const location = normalizeText(descriptor?.location).toLowerCase();
      if (location === "equipment") {
        return player?.equipment || null;
      }
      if (location === "container") {
        const containers = getContainers();
        const runtimeId = Number(descriptor?.containerRuntimeId);
        if (Number.isFinite(runtimeId)) {
          return containers.find((container) => Number(container?.__containerId) === runtimeId) || null;
        }
        return containers.length === 1 ? containers[0] : null;
      }
      return null;
    };
    const resolveLocationEntry = (descriptor = {}) => {
      const owner = resolveLocationOwner(descriptor);
      const slotIndex = Math.trunc(Number(descriptor?.slotIndex));
      if (!owner || !Number.isInteger(slotIndex) || slotIndex < 0 || typeof owner.getSlotItem !== "function") {
        return null;
      }
      const slots = Array.isArray(owner?.slots) ? owner.slots : null;
      if (!slots || slotIndex >= slots.length) {
        return null;
      }
      return {
        which: owner,
        index: slotIndex,
        location: normalizeText(descriptor?.location).toLowerCase() || "container",
        containerRuntimeId: normalizeText(descriptor?.location).toLowerCase() === "container"
          ? (Number(owner?.__containerId) || null)
          : null,
        item: owner.getSlotItem(slotIndex),
      };
    };
    const findItemEntry = ({ source = null, itemId = Number.NaN, name = "", category = "" } = {}) => {
      if (source) {
        const entry = resolveLocationEntry(source);
        return entry?.item ? entry : null;
      }

      const requestedItemId = Number(itemId);
      const requestedName = normalizeText(name).toLowerCase();
      const requestedCategory = normalizeText(category).toLowerCase();
      const matchesRequest = (entry) => {
        const entryItemId = getItemId(entry?.item);
        const entryName = getItemName(entry?.item).toLowerCase();
        const entryCategory = getItemCategory(entry?.item);
        if (Number.isFinite(requestedItemId) && entryItemId !== requestedItemId) {
          return false;
        }
        if (requestedName && !entryName.includes(requestedName)) {
          return false;
        }
        if (requestedCategory && entryCategory !== requestedCategory) {
          return false;
        }
        return true;
      };

      return [...getEquipmentEntries(), ...getContainerEntries()].find(matchesRequest) || null;
    };
    const resolveTileTarget = (rawPosition = null) => {
      const x = Number(rawPosition?.x);
      const y = Number(rawPosition?.y);
      const z = Number(rawPosition?.z);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
      }

      const fallbackPosition = {
        x: Math.trunc(x),
        y: Math.trunc(y),
        z: Math.trunc(z),
      };
      const position = typeof PositionCtor === "function"
        ? new PositionCtor(fallbackPosition.x, fallbackPosition.y, fallbackPosition.z)
        : fallbackPosition;
      const tile = (
        [
          typeof world?.getTile === "function" ? world.getTile(position) : null,
          typeof world?.map?.getTile === "function" ? world.map.getTile(position) : null,
          typeof game?.map?.getTile === "function" ? game.map.getTile(position) : null,
        ].find(Boolean)
      ) || null;
      const topThing = tile?.getTopUseThing?.()
        || tile?.getTopThing?.()
        || tile?.getTopLookThing?.()
        || (Array.isArray(tile?.things) && tile.things.length ? tile.things[tile.things.length - 1] : null);
      return tile
        ? {
            tile,
            topThing,
            position: fallbackPosition,
          }
        : null;
    };
    const getNpcDialogueManagers = () => [
      game?.interface?.dialogueManager,
      game?.interface?.npcManager,
      game?.interface?.modalManager,
      game?.interface?.chatNpc,
    ].filter(Boolean);
    const getTradeManagers = () => [
      game?.interface?.tradeManager,
      game?.interface?.npcTradeManager,
      game?.interface?.shopManager,
      game?.interface?.tradeWindow,
    ].filter(Boolean);
    const normalizeOptionEntry = (entry, index = 0) => ({
      index,
      raw: entry,
      text: normalizeText(
        entry?.text
        || entry?.label
        || entry?.title
        || entry?.name
        || entry?.value
        || entry?.caption
        || entry?.element?.textContent
        || entry,
      ),
    });
    const collectDialogueOptions = () => {
      const collected = [];
      for (const manager of getNpcDialogueManagers()) {
        const sources = [
          manager?.options,
          manager?.buttons,
          manager?.choices,
          manager?.entries,
          manager?.menu?.options,
          manager?.currentOptions,
        ];
        for (const source of sources) {
          for (const entry of collectValues(source)) {
            if (entry && !collected.includes(entry)) {
              collected.push(entry);
            }
          }
        }
      }
      return collected.map((entry, index) => normalizeOptionEntry(entry, index)).filter((entry) => entry.text);
    };
    const chooseDialogueOption = (option) => {
      const managers = getNpcDialogueManagers();
      const directMethods = [
        ["chooseOption", [option.raw]],
        ["selectOption", [option.raw]],
        ["activateOption", [option.raw]],
        ["clickOption", [option.raw]],
        ["choose", [option.raw]],
        ["select", [option.raw]],
      ];
      for (const manager of managers) {
        for (const [methodName, args] of directMethods) {
          const chosenMethod = tryCall(manager, [methodName], args);
          if (chosenMethod) return chosenMethod;
        }
      }

      const rawMethod = tryCall(option.raw, ["click", "choose", "select", "activate"]);
      if (rawMethod) return rawMethod;

      return tryCall(option.raw?.element, ["click"]);
    };
    const collectTradeEntries = (side = "buy") => {
      const normalizedSide = side === "sell" ? "sell" : "buy";
      const sourceKeys = normalizedSide === "sell"
        ? ["sellItems", "sellList", "sellOffers", "sellEntries", "items"]
        : ["buyItems", "buyList", "buyOffers", "buyEntries", "items"];
      const collected = [];
      for (const manager of getTradeManagers()) {
        for (const key of sourceKeys) {
          for (const entry of collectValues(manager?.[key])) {
            if (entry && !collected.includes(entry)) {
              collected.push(entry);
            }
          }
        }
      }
      return collected.map((entry, index) => ({
        index,
        raw: entry,
        itemId: getItemId(entry),
        name: getItemName(entry),
        price: Number(entry?.price ?? entry?.cost ?? entry?.value ?? 0) || 0,
      })).filter((entry) => entry.itemId != null || entry.name);
    };
    const chooseTradeEntry = (side, option) => {
      const normalizedSide = side === "sell" ? "sell" : "buy";
      const managers = getTradeManagers();
      const perSideMethodNames = normalizedSide === "sell"
        ? ["selectSellItem", "chooseSellItem", "focusSellItem"]
        : ["selectBuyItem", "chooseBuyItem", "focusBuyItem"];

      for (const manager of managers) {
        const sideMethod = tryCall(manager, perSideMethodNames, [option.raw]);
        if (sideMethod) return sideMethod;

        const genericMethod = tryCall(manager, [
          "selectItem",
          "chooseItem",
          "focusItem",
          "setSelectedItem",
        ], [option.raw, normalizedSide]);
        if (genericMethod) return genericMethod;
      }

      const rawMethod = tryCall(option.raw, ["click", "select", "choose", "activate"]);
      if (rawMethod) return rawMethod;

      return tryCall(option.raw?.element, ["click"]);
    };
    const setTradeQuantity = (side, option, amount) => {
      const normalizedSide = side === "sell" ? "sell" : "buy";
      const quantity = Math.max(1, Math.trunc(Number(amount)));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return "";
      }

      const managers = getTradeManagers();
      const perSideMethodNames = normalizedSide === "sell"
        ? ["setSellAmount", "setSellCount", "setSellQuantity", "updateSellAmount"]
        : ["setBuyAmount", "setBuyCount", "setBuyQuantity", "updateBuyAmount"];

      for (const manager of managers) {
        for (const [methodNames, args] of [
          [perSideMethodNames, [quantity, option.raw]],
          [perSideMethodNames, [quantity]],
          [["setAmount", "setCount", "setQuantity", "updateAmount", "setTradeAmount"], [quantity, normalizedSide]],
          [["setAmount", "setCount", "setQuantity", "updateAmount", "setTradeAmount"], [quantity]],
        ]) {
          const method = tryCall(manager, methodNames, args);
          if (method) return method;
        }
      }

      try {
        if (option.raw?.element && "value" in option.raw.element) {
          option.raw.element.value = String(quantity);
          option.raw.element.dispatchEvent(new Event("input", { bubbles: true }));
          option.raw.element.dispatchEvent(new Event("change", { bubbles: true }));
          return "element.value";
        }
      } catch {}

      return "";
    };
    const executeTradeEntry = (side, option, amount, sellAll = false) => {
      const normalizedSide = side === "sell" ? "sell" : "buy";
      const quantity = Math.max(1, Math.trunc(Number(amount)));
      const managers = getTradeManagers();
      const attempts = normalizedSide === "sell"
        ? (
            sellAll
              ? [
                  [["sellAllOfItem", "sellAllItem", "sellAll"], [option.raw]],
                  [["sellAllOfItem", "sellAllItem", "sellAll"], [option.itemId]],
                  [["sellAllOfItem", "sellAllItem", "sellAll"], []],
                  [["sell"], [option.raw, "all"]],
                  [["sell"], ["all"]],
                ]
              : [
                  [["sellSelectedItem"], [quantity]],
                  [["sellSelectedItem"], [option.raw, quantity]],
                  [["sellItem"], [option.raw, quantity]],
                  [["sellItem"], [quantity]],
                  [["confirmSell"], [quantity]],
                  [["sell"], [option.raw, quantity]],
                  [["sell"], [quantity]],
                  [["confirmSell", "sell"], []],
                ]
          )
        : [
            [["buySelectedItem"], [quantity]],
            [["buySelectedItem"], [option.raw, quantity]],
            [["buyItem"], [option.raw, quantity]],
            [["buyItem"], [quantity]],
            [["confirmBuy"], [quantity]],
            [["buy"], [option.raw, quantity]],
            [["buy"], [quantity]],
            [["confirmBuy", "buy"], []],
          ];

      for (const manager of managers) {
        for (const [methodNames, args] of attempts) {
          const method = tryCall(manager, methodNames, args);
          if (method) return method;
        }
      }

      return tryCall(option.raw, normalizedSide === "sell" ? ["sell", "confirmSell"] : ["buy", "confirmBuy"], [quantity]);
    };
  `;
}

export function buildMoveInventoryItemExpression(options = {}) {
  const source = normalizeLocationRef(options.from ?? options.source);
  const destination = normalizeLocationRef(options.to ?? options.destination);
  const countLiteral = toIntegerLiteral(options.count, "Number.NaN");

  return `(async () => {
    ${buildSharedActionHelpersExpression()}
    const requestedFrom = ${JSON.stringify(source)};
    const requestedTo = ${JSON.stringify(destination)};
    const requestedCount = ${countLiteral};

    if (!game || !player) {
      return { ok: false, reason: "game unavailable" };
    }

    const from = resolveLocationEntry(requestedFrom);
    if (!from?.item) {
      return {
        ok: false,
        reason: "source item unavailable",
        fromLocation: requestedFrom.location || "",
        fromSlotIndex: Number.isInteger(requestedFrom.slotIndex) ? requestedFrom.slotIndex : null,
        fromContainerRuntimeId: Number.isFinite(requestedFrom.containerRuntimeId) ? requestedFrom.containerRuntimeId : null,
      };
    }

    const to = resolveLocationEntry(requestedTo)
      || (() => {
        const owner = resolveLocationOwner(requestedTo);
        const slotIndex = Math.trunc(Number(requestedTo?.slotIndex));
        if (!owner || !Number.isInteger(slotIndex) || slotIndex < 0) return null;
        const slots = Array.isArray(owner?.slots) ? owner.slots : null;
        if (!slots || slotIndex >= slots.length) return null;
        return {
          which: owner,
          index: slotIndex,
          location: normalizeText(requestedTo?.location).toLowerCase(),
          containerRuntimeId: normalizeText(requestedTo?.location).toLowerCase() === "container"
            ? (Number(owner?.__containerId) || null)
            : null,
          item: owner.getSlotItem(slotIndex),
        };
      })();
    if (!to) {
      return {
        ok: false,
        reason: "destination unavailable",
        toLocation: requestedTo.location || "",
        toSlotIndex: Number.isInteger(requestedTo.slotIndex) ? requestedTo.slotIndex : null,
        toContainerRuntimeId: Number.isFinite(requestedTo.containerRuntimeId) ? requestedTo.containerRuntimeId : null,
      };
    }

    const count = Number.isInteger(requestedCount) && requestedCount > 0
      ? requestedCount
      : Math.max(1, getItemCount(from.item));

    interruptAutoWalkForInventory();

    if (typeof game?.mouse?.sendItemMove === "function") {
      game.mouse.sendItemMove(from, to, count);
      return {
        ok: true,
        transport: "sendItemMove",
        itemId: getItemId(from.item),
        name: getItemName(from.item),
        count,
        fromLocation: from.location,
        fromSlotIndex: from.index,
        fromContainerRuntimeId: from.containerRuntimeId,
        toLocation: to.location,
        toSlotIndex: to.index,
        toContainerRuntimeId: to.containerRuntimeId,
      };
    }

    if (typeof game?.send === "function" && typeof ItemMovePacketCtor === "function") {
      game.send(new ItemMovePacketCtor(from, to, count));
      return {
        ok: true,
        transport: "item-move-packet",
        itemId: getItemId(from.item),
        name: getItemName(from.item),
        count,
        fromLocation: from.location,
        fromSlotIndex: from.index,
        fromContainerRuntimeId: from.containerRuntimeId,
        toLocation: to.location,
        toSlotIndex: to.index,
        toContainerRuntimeId: to.containerRuntimeId,
      };
    }

    return {
      ok: false,
      reason: "inventory transport unavailable",
      itemId: getItemId(from.item),
      name: getItemName(from.item),
      count,
      fromLocation: from.location,
      fromSlotIndex: from.index,
      fromContainerRuntimeId: from.containerRuntimeId,
      toLocation: to.location,
      toSlotIndex: to.index,
      toContainerRuntimeId: to.containerRuntimeId,
    };
  })()`;
}

export function buildUseItemExpression(options = {}) {
  const source = options.source ? normalizeLocationRef(options.source) : null;
  const itemIdLiteral = toIntegerLiteral(options.itemId, "Number.NaN");
  const nameLiteral = JSON.stringify(String(options.name || "").trim().toLowerCase());
  const categoryLiteral = JSON.stringify(String(options.category || "").trim().toLowerCase());
  const targetLiteral = JSON.stringify(String(options.target || "").trim().toLowerCase());
  const positionLiteral = toPositionLiteral(options.position);

  return `(async () => {
    ${buildSharedActionHelpersExpression()}
    const requestedSource = ${JSON.stringify(source)};
    const requestedItemId = ${itemIdLiteral};
    const requestedName = ${nameLiteral};
    const requestedCategory = ${categoryLiteral};
    const requestedTarget = ${targetLiteral};
    const requestedPosition = ${positionLiteral};

    if (!game || !player) {
      return { ok: false, reason: "game unavailable" };
    }

    const found = findItemEntry({
      source: requestedSource,
      itemId: requestedItemId,
      name: requestedName,
      category: requestedCategory,
    });
    if (!found?.item) {
      return {
        ok: false,
        reason: "item unavailable",
        itemId: Number.isFinite(requestedItemId) ? requestedItemId : null,
        name: requestedName || "",
        category: requestedCategory || "",
      };
    }

    interruptAutoWalkForInventory();

    const entryItemId = getItemId(found.item);
    const entryName = getItemName(found.item);
    const entryCategory = getItemCategory(found.item);

    if (requestedTarget === "self" || requestedTarget === "target") {
      const creatureTarget = requestedTarget === "self"
        ? player
        : player?.__target || null;
      if (!creatureTarget) {
        return {
          ok: false,
          reason: "target unavailable",
          itemId: entryItemId,
          name: entryName,
          category: entryCategory || null,
          target: requestedTarget,
        };
      }

      const mouseTargetMethod = tryCall(game?.mouse, [
        "useOnCreature",
        "sendItemUseOnCreature",
        "useItemOnCreature",
      ], [found, creatureTarget]);
      if (mouseTargetMethod) {
        return {
          ok: true,
          transport: mouseTargetMethod,
          itemId: entryItemId,
          name: entryName,
          count: getItemCount(found.item),
          category: entryCategory || null,
          location: found.location,
          slotIndex: found.index,
          containerRuntimeId: found.containerRuntimeId,
          target: requestedTarget,
        };
      }

      if (typeof game?.send === "function" && typeof ItemUseOnCreaturePacketCtor === "function") {
        game.send(new ItemUseOnCreaturePacketCtor(found, creatureTarget));
        return {
          ok: true,
          transport: "item-use-on-creature-packet",
          itemId: entryItemId,
          name: entryName,
          count: getItemCount(found.item),
          category: entryCategory || null,
          location: found.location,
          slotIndex: found.index,
          containerRuntimeId: found.containerRuntimeId,
          target: requestedTarget,
        };
      }
    }

    if (requestedTarget === "tile") {
      const tileTarget = resolveTileTarget(requestedPosition);
      if (!tileTarget?.tile) {
        return {
          ok: false,
          reason: "tile unavailable",
          itemId: entryItemId,
          name: entryName,
          category: entryCategory || null,
          target: "tile",
        };
      }

      const tileThing = tileTarget.topThing || tileTarget.tile;
      const mouseTileMethod = tryCall(game?.mouse, [
        "useWith",
        "sendItemUseWith",
        "useItemWith",
      ], [found, tileThing]);
      if (mouseTileMethod) {
        return {
          ok: true,
          transport: mouseTileMethod,
          itemId: entryItemId,
          name: entryName,
          count: getItemCount(found.item),
          category: entryCategory || null,
          location: found.location,
          slotIndex: found.index,
          containerRuntimeId: found.containerRuntimeId,
          target: "tile",
          position: tileTarget.position,
        };
      }

      const directTileMethod = tryCall(found.item, ["useWith", "onUseWith", "__useWith", "use"], [tileThing]);
      if (directTileMethod) {
        return {
          ok: true,
          transport: directTileMethod,
          itemId: entryItemId,
          name: entryName,
          count: getItemCount(found.item),
          category: entryCategory || null,
          location: found.location,
          slotIndex: found.index,
          containerRuntimeId: found.containerRuntimeId,
          target: "tile",
          position: tileTarget.position,
        };
      }

      for (const caller of [window.g_game, globalThis.g_game, game, game?.game, world].filter(Boolean)) {
        if (tileTarget.topThing && typeof caller.useInventoryItemWith === "function") {
          caller.useInventoryItemWith(entryItemId, tileTarget.topThing);
          return {
            ok: true,
            transport: "useInventoryItemWith",
            itemId: entryItemId,
            name: entryName,
            count: getItemCount(found.item),
            category: entryCategory || null,
            location: found.location,
            slotIndex: found.index,
            containerRuntimeId: found.containerRuntimeId,
            target: "tile",
            position: tileTarget.position,
          };
        }
        if (typeof caller.useWith === "function") {
          caller.useWith(entryItemId, tileTarget.tile);
          return {
            ok: true,
            transport: "useWith",
            itemId: entryItemId,
            name: entryName,
            count: getItemCount(found.item),
            category: entryCategory || null,
            location: found.location,
            slotIndex: found.index,
            containerRuntimeId: found.containerRuntimeId,
            target: "tile",
            position: tileTarget.position,
          };
        }
      }

      return {
        ok: false,
        reason: "tile use unavailable",
        itemId: entryItemId,
        name: entryName,
        category: entryCategory || null,
        location: found.location,
        slotIndex: found.index,
        containerRuntimeId: found.containerRuntimeId,
        target: "tile",
        position: tileTarget.position,
      };
    }

    const directItemMethod = tryCall(found.item, ["use", "onUse", "__use"]);
    if (directItemMethod) {
      return {
        ok: true,
        transport: directItemMethod,
        itemId: entryItemId,
        name: entryName,
        count: getItemCount(found.item),
        category: entryCategory || null,
        location: found.location,
        slotIndex: found.index,
        containerRuntimeId: found.containerRuntimeId,
        target: requestedTarget || null,
      };
    }

    for (const caller of [game, game?.game, window.g_game, globalThis.g_game].filter(Boolean)) {
      for (const [methodNames, args] of [
        [["useItem", "useInventoryItem", "useInventoryObject"], [found]],
        [["useItem", "useInventoryItem", "useInventoryObject"], [found.item]],
        ...(Number.isFinite(entryItemId)
          ? [[["useItem", "useInventoryItem", "useInventoryObject"], [entryItemId]]]
          : []),
        [["use"], [found.item]],
        [["use"], [found]],
        ...(Number.isFinite(entryItemId) ? [[["use"], [entryItemId]]] : []),
      ]) {
        const genericUseMethod = tryCall(caller, methodNames, args);
        if (genericUseMethod) {
          return {
            ok: true,
            transport: genericUseMethod,
            itemId: entryItemId,
            name: entryName,
            count: getItemCount(found.item),
            category: entryCategory || null,
            location: found.location,
            slotIndex: found.index,
            containerRuntimeId: found.containerRuntimeId,
            target: requestedTarget || null,
          };
        }
      }
    }

    if (typeof game?.mouse?.use === "function") {
      game.mouse.use(found);
      return {
        ok: true,
        transport: "mouse-use",
        itemId: entryItemId,
        name: entryName,
        count: getItemCount(found.item),
        category: entryCategory || null,
        location: found.location,
        slotIndex: found.index,
        containerRuntimeId: found.containerRuntimeId,
        target: requestedTarget || null,
      };
    }

    if (typeof game?.send === "function" && typeof ItemUsePacketCtor === "function") {
      game.send(new ItemUsePacketCtor(found));
      return {
        ok: true,
        transport: "item-use-packet",
        itemId: entryItemId,
        name: entryName,
        count: getItemCount(found.item),
        category: entryCategory || null,
        location: found.location,
        slotIndex: found.index,
        containerRuntimeId: found.containerRuntimeId,
        target: requestedTarget || null,
      };
    }

    return {
      ok: false,
      reason: "item use unavailable",
      itemId: entryItemId,
      name: entryName,
      category: entryCategory || null,
      location: found.location,
      slotIndex: found.index,
      containerRuntimeId: found.containerRuntimeId,
      target: requestedTarget || null,
    };
  })()`;
}

export function buildChooseNpcOptionExpression(options = {}) {
  const indexLiteral = toIntegerLiteral(options.index, "Number.NaN");
  const textLiteral = JSON.stringify(String(options.text ?? options.option ?? "").trim().toLowerCase());

  return `(async () => {
    ${buildSharedActionHelpersExpression()}
    const requestedIndex = ${indexLiteral};
    const requestedText = ${textLiteral};

    if (!game) {
      return { ok: false, reason: "game unavailable" };
    }

    const options = collectDialogueOptions();
    if (!options.length) {
      return { ok: false, reason: "npc option unavailable" };
    }

    const chosen = Number.isInteger(requestedIndex) && requestedIndex >= 0
      ? options.find((entry) => entry.index === requestedIndex) || null
      : options.find((entry) => entry.text.toLowerCase().includes(requestedText)) || null;
    if (!chosen) {
      return {
        ok: false,
        reason: "npc option not found",
        optionText: requestedText || "",
        optionIndex: Number.isInteger(requestedIndex) ? requestedIndex : null,
      };
    }

    const transport = chooseDialogueOption(chosen);
    if (!transport) {
      return {
        ok: false,
        reason: "npc option selection unavailable",
        optionText: chosen.text,
        optionIndex: chosen.index,
      };
    }

    return {
      ok: true,
      transport,
      optionText: chosen.text,
      optionIndex: chosen.index,
    };
  })()`;
}

export function buildChooseNpcTradeOptionExpression(options = {}) {
  const sideLiteral = JSON.stringify(String(options.side || "buy").trim().toLowerCase() === "sell" ? "sell" : "buy");
  const indexLiteral = toIntegerLiteral(options.index, "Number.NaN");
  const itemIdLiteral = toIntegerLiteral(options.itemId, "Number.NaN");
  const nameLiteral = JSON.stringify(String(options.name || options.text || "").trim().toLowerCase());

  return `(async () => {
    ${buildSharedActionHelpersExpression()}
    const requestedSide = ${sideLiteral};
    const requestedIndex = ${indexLiteral};
    const requestedItemId = ${itemIdLiteral};
    const requestedName = ${nameLiteral};

    if (!game) {
      return { ok: false, reason: "game unavailable" };
    }

    const options = collectTradeEntries(requestedSide);
    if (!options.length) {
      return {
        ok: false,
        reason: "npc trade unavailable",
        side: requestedSide,
      };
    }

    const chosen = Number.isInteger(requestedIndex) && requestedIndex >= 0
      ? options.find((entry) => entry.index === requestedIndex) || null
      : options.find((entry) => {
          if (Number.isFinite(requestedItemId) && entry.itemId !== requestedItemId) {
            return false;
          }
          if (requestedName && !entry.name.toLowerCase().includes(requestedName)) {
            return false;
          }
          return true;
        }) || null;
    if (!chosen) {
      return {
        ok: false,
        reason: "npc trade option not found",
        side: requestedSide,
        itemId: Number.isFinite(requestedItemId) ? requestedItemId : null,
        name: requestedName || "",
      };
    }

    const transport = chooseTradeEntry(requestedSide, chosen);
    if (!transport) {
      return {
        ok: false,
        reason: "npc trade selection unavailable",
        side: requestedSide,
        itemId: chosen.itemId,
        name: chosen.name,
      };
    }

    return {
      ok: true,
      transport,
      side: requestedSide,
      itemId: chosen.itemId,
      name: chosen.name,
      optionIndex: chosen.index,
    };
  })()`;
}

export function buildExecuteNpcTradeExpression(options = {}) {
  const sideLiteral = JSON.stringify(String(options.side || "buy").trim().toLowerCase() === "sell" ? "sell" : "buy");
  const indexLiteral = toIntegerLiteral(options.index, "Number.NaN");
  const itemIdLiteral = toIntegerLiteral(options.itemId, "Number.NaN");
  const amountLiteral = toIntegerLiteral(options.amount, "Number.NaN");
  const sellAllLiteral = options.sellAll === true ? "true" : "false";
  const nameLiteral = JSON.stringify(String(options.name || options.text || "").trim().toLowerCase());

  return `(async () => {
    ${buildSharedActionHelpersExpression()}
    const requestedSide = ${sideLiteral};
    const requestedIndex = ${indexLiteral};
    const requestedItemId = ${itemIdLiteral};
    const requestedAmount = ${amountLiteral};
    const requestedName = ${nameLiteral};
    const requestedSellAll = ${sellAllLiteral};

    if (!game) {
      return { ok: false, reason: "game unavailable" };
    }

    const options = collectTradeEntries(requestedSide);
    if (!options.length) {
      return {
        ok: false,
        reason: "npc trade unavailable",
        side: requestedSide,
      };
    }

    const chosen = Number.isInteger(requestedIndex) && requestedIndex >= 0
      ? options.find((entry) => entry.index === requestedIndex) || null
      : options.find((entry) => {
          if (Number.isFinite(requestedItemId) && entry.itemId !== requestedItemId) {
            return false;
          }
          if (requestedName && !entry.name.toLowerCase().includes(requestedName)) {
            return false;
          }
          return true;
        }) || null;
    if (!chosen) {
      return {
        ok: false,
        reason: "npc trade option not found",
        side: requestedSide,
        itemId: Number.isFinite(requestedItemId) ? requestedItemId : null,
        name: requestedName || "",
      };
    }

    const selectionTransport = chooseTradeEntry(requestedSide, chosen);
    if (!selectionTransport) {
      return {
        ok: false,
        reason: "npc trade selection unavailable",
        side: requestedSide,
        itemId: chosen.itemId,
        name: chosen.name,
      };
    }

    const quantity = Number.isInteger(requestedAmount) && requestedAmount > 0
      ? requestedAmount
      : 1;
    const quantityTransport = requestedSellAll
      ? ""
      : setTradeQuantity(requestedSide, chosen, quantity);
    const transport = executeTradeEntry(requestedSide, chosen, quantity, requestedSellAll);
    if (!transport) {
      return {
        ok: false,
        reason: "npc trade execution unavailable",
        side: requestedSide,
        itemId: chosen.itemId,
        name: chosen.name,
        amount: requestedSellAll ? null : quantity,
      };
    }

    return {
      ok: true,
      transport,
      selectionTransport,
      quantityTransport: quantityTransport || null,
      side: requestedSide,
      sellAll: requestedSellAll,
      itemId: chosen.itemId,
      name: chosen.name,
      price: chosen.price,
      optionIndex: chosen.index,
      amount: requestedSellAll ? null : quantity,
    };
  })()`;
}
