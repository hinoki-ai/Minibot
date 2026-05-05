#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  discoverGamePages,
  MinibiaTargetBot,
} from "../lib/bot-core.mjs";

const DEFAULT_PORT = 9224;
const DEFAULT_URL_PREFIX = "https://minibia.com/play";
const DEFAULT_WAIT_MS = 1_200;

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeInteger(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    character: "",
    message: "",
    channelIndex: null,
    waitMs: DEFAULT_WAIT_MS,
    port: DEFAULT_PORT,
    pageUrlPrefix: DEFAULT_URL_PREFIX,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--character" || argument === "-c") {
      options.character = normalizeText(argv[++index]);
    } else if (argument === "--message" || argument === "-m") {
      options.message = String(argv[++index] ?? "");
    } else if (argument === "--channel-index") {
      options.channelIndex = normalizeInteger(argv[++index]);
    } else if (argument === "--wait-ms") {
      options.waitMs = Math.max(0, normalizeInteger(argv[++index], DEFAULT_WAIT_MS) ?? DEFAULT_WAIT_MS);
    } else if (argument === "--port") {
      options.port = Math.max(1, normalizeInteger(argv[++index], DEFAULT_PORT) ?? DEFAULT_PORT);
    } else if (argument === "--url-prefix") {
      options.pageUrlPrefix = normalizeText(argv[++index]) || DEFAULT_URL_PREFIX;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node bot/scripts/live-probe.mjs --character "Dark Knight"
  node bot/scripts/live-probe.mjs --character "Dark Knight" --message "/item great shield" --channel-index 0

Options:
  --character, -c <name>  Live character tab to target
  --message, -m <text>    Optional live chat text to send through channelManager
  --channel-index <n>     Optional channel index override, use 0 for Default
  --wait-ms <ms>          Delay after sending before recapturing, defaults to ${DEFAULT_WAIT_MS}
  --port <port>           DevTools port, defaults to ${DEFAULT_PORT}
  --url-prefix <url>      Page URL prefix, defaults to ${DEFAULT_URL_PREFIX}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function summarizeSnapshot(snapshot = {}) {
  const visibleNpcs = Array.isArray(snapshot?.visibleNpcs)
    ? snapshot.visibleNpcs.map((npc) => ({
      name: normalizeText(npc?.name),
      position: npc?.position || null,
      distance: normalizeInteger(npc?.chebyshevDistance),
    }))
    : [];
  const containers = Array.isArray(snapshot?.containers)
    ? snapshot.containers.map((container) => ({
      runtimeId: normalizeInteger(container?.runtimeId),
      itemId: normalizeInteger(container?.itemId),
      name: normalizeText(container?.name),
      usedSlots: normalizeInteger(container?.usedSlots, 0) ?? 0,
      freeSlots: normalizeInteger(container?.freeSlots, 0) ?? 0,
      slots: Array.isArray(container?.slots)
        ? container.slots.map((entry) => ({
          slotIndex: normalizeInteger(entry?.slotIndex),
          itemId: normalizeInteger(entry?.item?.itemId),
          name: normalizeText(entry?.item?.name),
          count: normalizeInteger(entry?.item?.count, 0) ?? 0,
        }))
        : [],
    }))
    : [];

  return {
    ready: snapshot?.ready === true,
    playerName: normalizeText(snapshot?.playerName),
    playerPosition: snapshot?.playerPosition || null,
    gold: normalizeInteger(snapshot?.gold),
    isMoving: snapshot?.isMoving === true,
    pathfinderAutoWalking: snapshot?.pathfinderAutoWalking === true,
    visibleNpcs,
    containers,
  };
}

function buildMessageSignature(message = {}) {
  return normalizeText(
    message?.key
    || `${normalizeText(message?.speaker)}|${normalizeText(message?.text)}|${normalizeText(message?.channelName)}`,
  );
}

export function normalizeDialogue(dialogue = {}) {
  const recentMessages = Array.isArray(dialogue?.recentMessages)
    ? dialogue.recentMessages.map((message) => ({
      key: buildMessageSignature(message),
      speaker: normalizeText(message?.speaker),
      text: normalizeText(message?.text),
      channelName: normalizeText(message?.channelName),
    }))
    : [];
  const options = Array.isArray(dialogue?.options)
    ? dialogue.options.map((option) => ({
      index: normalizeInteger(option?.index),
      text: normalizeText(option?.text),
    }))
    : [];

  return {
    open: dialogue?.open === true,
    npcName: normalizeText(dialogue?.npcName),
    prompt: normalizeText(dialogue?.prompt),
    options,
    recentMessages,
  };
}

export function normalizeTrade(trade = {}) {
  const normalizeEntry = (entry = {}) => ({
    index: normalizeInteger(entry?.index),
    itemId: normalizeInteger(entry?.itemId ?? entry?.id),
    name: normalizeText(entry?.name),
    price: normalizeInteger(entry?.price),
  });

  return {
    open: trade?.open === true,
    npcName: normalizeText(trade?.npcName),
    activeSide: normalizeText(trade?.activeSide),
    selectedItem: trade?.selectedItem && typeof trade.selectedItem === "object"
      ? normalizeEntry(trade.selectedItem)
      : null,
    buyItems: Array.isArray(trade?.buyItems) ? trade.buyItems.map(normalizeEntry) : [],
    sellItems: Array.isArray(trade?.sellItems) ? trade.sellItems.map(normalizeEntry) : [],
  };
}

function listMultisetDelta(before = [], after = []) {
  const counts = new Map();

  for (const value of before) {
    const key = normalizeText(value);
    counts.set(key, (counts.get(key) || 0) - 1);
  }

  for (const value of after) {
    const key = normalizeText(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count !== 0)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([value, count]) => ({ value, count }));
}

function flattenContainerItems(state = {}) {
  const entries = [];

  for (const container of state?.snapshot?.containers || []) {
    const containerPrefix = [
      normalizeText(container?.name) || "container",
      normalizeInteger(container?.runtimeId, 0) ?? 0,
    ].join("#");
    for (const slot of container?.slots || []) {
      entries.push([
        containerPrefix,
        normalizeInteger(slot?.slotIndex, 0) ?? 0,
        normalizeText(slot?.name) || "item",
        normalizeInteger(slot?.itemId, 0) ?? 0,
        normalizeInteger(slot?.count, 0) ?? 0,
      ].join("|"));
    }
  }

  return entries;
}

function flattenFloorItems(state = {}) {
  const entries = [];

  for (const tile of state?.floor?.tiles || []) {
    const position = tile?.position || null;
    const tilePrefix = [
      normalizeInteger(position?.x, 0) ?? 0,
      normalizeInteger(position?.y, 0) ?? 0,
      normalizeInteger(position?.z, 0) ?? 0,
    ].join(",");
    for (const item of tile?.items || []) {
      entries.push([
        tilePrefix,
        normalizeInteger(item?.itemId, 0) ?? 0,
        normalizeText(item?.name) || "item",
        normalizeInteger(item?.count, 0) ?? 0,
      ].join("|"));
    }
  }

  return entries;
}

function normalizeFloorScan(scan = {}) {
  const playerPosition = scan?.playerPosition || null;
  const tiles = Array.isArray(scan?.tiles)
    ? scan.tiles.map((tile) => ({
      position: tile?.position || null,
      tileId: normalizeInteger(tile?.tileId),
      tileName: normalizeText(tile?.tileName),
      items: Array.isArray(tile?.items)
        ? tile.items.map((item) => ({
          itemId: normalizeInteger(item?.id ?? item?.itemId),
          name: normalizeText(item?.name),
          count: normalizeInteger(item?.count, 0) ?? 0,
        }))
        : [],
    }))
    : [];

  return {
    playerPosition,
    tiles,
  };
}

function buildFloorScanExpression(radius = 2) {
  const normalizedRadius = Math.max(0, Math.trunc(Number(radius) || 0));
  return `(() => {
    const game = window.gameClient;
    const world = game?.world;
    const player = game?.player;
    const defs = game?.itemDefinitionsByCid || game?.itemDefinitions || {};
    const pos = player?.__position;
    if (!game || !world || !player || !pos) {
      return { ok: false, reason: "game not ready" };
    }

    const tiles = [];
    const seen = new Set();
    for (const chunk of Array.isArray(world?.chunks) ? world.chunks : []) {
      const floorTiles = typeof chunk?.getFloorTiles === "function" ? chunk.getFloorTiles(pos.z) : [];
      for (const tile of floorTiles || []) {
        const tilePos = tile?.getPosition?.() || tile?.__position || tile?.position || null;
        if (!tilePos) continue;
        const dx = Math.abs(Number(tilePos.x) - Number(pos.x));
        const dy = Math.abs(Number(tilePos.y) - Number(pos.y));
        if (dx > ${normalizedRadius} || dy > ${normalizedRadius} || Number(tilePos.z) !== Number(pos.z)) continue;
        const key = String(tilePos.x) + "," + String(tilePos.y) + "," + String(tilePos.z);
        if (seen.has(key)) continue;
        seen.add(key);
        const itemEntries = Array.isArray(tile?.items)
          ? tile.items
          : (tile?.items && typeof tile.items.values === "function" ? Array.from(tile.items.values()) : []);
        const items = itemEntries.filter(Boolean).map((item) => {
          const itemId = Number(item?.id);
          const itemDef = defs[itemId] || null;
          return {
            id: Number.isFinite(itemId) ? Math.trunc(itemId) : null,
            name: String(itemDef?.properties?.name || itemDef?.name || item?.name || item?.constructor?.name || "").trim(),
            count: Math.max(0, Math.trunc(Number(item?.count) || 0)),
          };
        });
        tiles.push({
          position: {
            x: Math.trunc(Number(tilePos.x) || 0),
            y: Math.trunc(Number(tilePos.y) || 0),
            z: Math.trunc(Number(tilePos.z) || 0),
          },
          tileId: Number.isFinite(Number(tile?.id)) ? Math.trunc(Number(tile.id)) : null,
          tileName: String(defs[tile?.id]?.properties?.name || defs[tile?.id]?.name || "").trim(),
          items,
        });
      }
    }

    tiles.sort((left, right) => (
      Number(left.position?.y || 0) - Number(right.position?.y || 0)
      || Number(left.position?.x || 0) - Number(right.position?.x || 0)
    ));

    return {
      ok: true,
      playerPosition: {
        x: Math.trunc(Number(pos.x) || 0),
        y: Math.trunc(Number(pos.y) || 0),
        z: Math.trunc(Number(pos.z) || 0),
      },
      tiles,
    };
  })()`;
}

export function buildDiff(before = {}, after = {}) {
  const beforeMessageKeys = new Set((before?.dialogue?.recentMessages || []).map((message) => message.key));
  const newMessages = (after?.dialogue?.recentMessages || [])
    .filter((message) => !beforeMessageKeys.has(message.key));
  const beforeNotifications = before?.pageState?.notifications || [];
  const afterNotifications = after?.pageState?.notifications || [];
  const beforeModalKeys = before?.pageState?.openModals || [];
  const afterModalKeys = after?.pageState?.openModals || [];

  return {
    positionChanged: JSON.stringify(before?.snapshot?.playerPosition || null) !== JSON.stringify(after?.snapshot?.playerPosition || null),
    newMessages,
    notificationDelta: listMultisetDelta(beforeNotifications, afterNotifications),
    modalDelta: listMultisetDelta(beforeModalKeys, afterModalKeys),
    containerDelta: listMultisetDelta(flattenContainerItems(before), flattenContainerItems(after)),
    floorDelta: listMultisetDelta(flattenFloorItems(before), flattenFloorItems(after)),
    tradeChanged: JSON.stringify(before?.trade || null) !== JSON.stringify(after?.trade || null),
  };
}

export async function capturePageState(bot) {
  return bot.cdp.evaluate(`(() => {
    const normalizeText = (value = "") => String(value ?? "").replace(/\\s+/g, " ").trim();
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
      if (!style) return true;
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect?.();
      return !rect || rect.width > 0 || rect.height > 0;
    };
    const notifications = [];
    const pushText = (value) => {
      const text = normalizeText(value);
      if (text) notifications.push(text);
    };
    const queryTexts = (selector) => Array.from(document.querySelectorAll(selector || ""))
      .map((element) => normalizeText(element?.textContent || element?.innerText || ""))
      .filter(Boolean);
    pushText(document.getElementById("notification")?.textContent || "");
    pushText(document.getElementById("server-message")?.textContent || "");
    pushText(document.getElementById("cancel-message")?.textContent || "");
    const modalManager = window.gameClient?.interface?.modalManager || null;
    const modalEntries = modalManager?.__modals && typeof modalManager.__modals === "object"
      ? Object.entries(modalManager.__modals)
      : [];
    const openModals = modalEntries
      .filter(([, modal]) => isVisible(modal?.element || null))
      .map(([name]) => normalizeText(name))
      .filter(Boolean)
      .sort();

    return {
      activeChannelName: normalizeText(window.gameClient?.interface?.channelManager?.getActiveChannel?.()?.name || ""),
      notifications: [...new Set([
        ...notifications,
        ...queryTexts("#notification, #server-message, #cancel-message, #status-message"),
      ])],
      openModals,
    };
  })()`);
}

export async function captureState(bot) {
  const [snapshot, dialogue, trade, pageState, floor] = await Promise.all([
    bot.refresh({ emitSnapshot: false }),
    bot.inspectDialogueState().catch(() => ({})),
    bot.inspectTradeState().catch(() => ({})),
    capturePageState(bot).catch(() => ({
      activeChannelName: "",
      notifications: [],
      openModals: [],
    })),
    bot.cdp.evaluate(buildFloorScanExpression(2)).catch(() => ({
      playerPosition: null,
      tiles: [],
    })),
  ]);

  return {
    capturedAt: new Date().toISOString(),
    snapshot: summarizeSnapshot(snapshot),
    dialogue: normalizeDialogue(dialogue),
    trade: normalizeTrade(trade),
    pageState: {
      activeChannelName: normalizeText(pageState?.activeChannelName),
      notifications: Array.isArray(pageState?.notifications)
        ? pageState.notifications.map((entry) => normalizeText(entry)).filter(Boolean)
        : [],
      openModals: Array.isArray(pageState?.openModals)
        ? pageState.openModals.map((entry) => normalizeText(entry)).filter(Boolean)
        : [],
    },
    floor: normalizeFloorScan(floor),
  };
}

export async function sendLiveMessage(bot, message, channelIndex = null) {
  return bot.cdp.evaluate(`(() => {
    const text = ${JSON.stringify(String(message ?? ""))};
    const requestedChannelIndex = ${channelIndex == null ? "null" : Math.trunc(channelIndex)};
    const normalized = String(text).trim();
    const channelManager = window.gameClient?.interface?.channelManager || null;
    if (!normalized) {
      return { ok: false, reason: "missing message" };
    }

    if (channelManager && typeof channelManager.sendMessageText === "function") {
      channelManager.sendMessageText(normalized, requestedChannelIndex == null ? undefined : requestedChannelIndex);
      return {
        ok: true,
        transport: "channelManager.sendMessageText",
        channelIndex: requestedChannelIndex,
        message: normalized,
      };
    }

    const ChannelMessagePacketCtor = globalThis.ChannelMessagePacket;
    const game = window.gameClient;
    if (game && typeof game.send === "function" && typeof ChannelMessagePacketCtor === "function") {
      game.send(new ChannelMessagePacketCtor(0x00, 0, normalized));
      return {
        ok: true,
        transport: "ChannelMessagePacket",
        channelIndex: 0,
        message: normalized,
      };
    }

    return { ok: false, reason: "no live message transport", message: normalized };
  })()`);
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.character) {
    throw new Error("Missing --character.");
  }

  const pages = await discoverGamePages(options.port, options.pageUrlPrefix);
  const requestedCharacter = normalizeText(options.character).toLowerCase();
  const page = pages.find((candidate) => normalizeText(candidate?.characterName).toLowerCase() === requestedCharacter);

  if (!page) {
    throw new Error(`Character "${options.character}" was not found on the live browser session.`);
  }

  const bot = new MinibiaTargetBot({
    port: options.port,
    pageUrlPrefix: options.pageUrlPrefix,
    dryRun: false,
    autowalkEnabled: false,
    routeRecording: false,
  });

  try {
    await bot.attachToPage(page);
    bot.initialChatCleanupPending = false;
    const before = await captureState(bot);
    let action = null;

    if (normalizeText(options.message)) {
      action = await sendLiveMessage(bot, options.message, options.channelIndex);
      await delay(options.waitMs);
    }

    const after = await captureState(bot);
    const diff = buildDiff(before, after);
    console.log(JSON.stringify({
      ok: true,
      page: {
        id: page.id,
        characterName: normalizeText(page.characterName),
        title: normalizeText(page.title),
      },
      action,
      before,
      after,
      diff,
    }, null, 2));
  } finally {
    await bot.detach().catch(() => {});
  }
}

const isEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
