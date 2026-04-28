#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CdpPage,
  discoverGamePages,
} from "../lib/bot-core.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 9224;
const DEFAULT_URL_PREFIX = "https://minibia.com/play";
const ITEMS_PATH = path.resolve(__dirname, "../data/minibia/current/items.json");

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLookup(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    character: "",
    item: "",
    container: "",
    count: 1,
    port: DEFAULT_PORT,
    pageUrlPrefix: DEFAULT_URL_PREFIX,
    visualOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--character" || argument === "-c") {
      options.character = normalizeText(argv[++index]);
    } else if (argument === "--item" || argument === "-i") {
      options.item = normalizeText(argv[++index]);
    } else if (argument === "--container") {
      options.container = normalizeText(argv[++index]);
    } else if (argument === "--count" || argument === "-n") {
      options.count = Math.max(1, Math.trunc(Number(argv[++index]) || 1));
    } else if (argument === "--port") {
      options.port = Math.max(1, Math.trunc(Number(argv[++index]) || DEFAULT_PORT));
    } else if (argument === "--url-prefix") {
      options.pageUrlPrefix = normalizeText(argv[++index]) || DEFAULT_URL_PREFIX;
    } else if (argument === "--visual-only") {
      options.visualOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (!options.item) {
      options.item = normalizeText(argument);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/god-create-item.mjs --character "Zlocimir" --item "great shield" --visual-only
  node scripts/god-create-item.mjs --character "Dark Knight" --item "magic longsword" --container parcel --visual-only
  node scripts/god-create-item.mjs -c "Zlocimir Wielkoportf" -i 3422 --count 1 --visual-only

WARNING:
  This script mutates only the live browser container model. It does not call a
  server-authoritative item grant hook, does not persist through server refresh,
  and cannot create items that can be traded or delivered.

Options:
  --character, -c <name>  Live character tab to target
  --item, -i <name|id>    Item name, sid, or cid from current Minibia data
  --container <name|id>   Optional open container target by item name, sid/cid, or runtime id
  --count, -n <count>     Item count, defaults to 1
  --port <port>           DevTools port, defaults to 9224
  --url-prefix <url>      Page URL prefix, defaults to ${DEFAULT_URL_PREFIX}
  --visual-only           Required acknowledgement for client-only injection`);
}

function loadItems() {
  const document = JSON.parse(fs.readFileSync(ITEMS_PATH, "utf8"));
  return Array.isArray(document?.items) ? document.items : [];
}

function resolveItem(items, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    throw new Error("Missing item name or id.");
  }

  const numericQuery = normalizeInteger(normalizedQuery);
  const queryKey = normalizeLookup(normalizedQuery);
  const exact = items.find((item) => (
    normalizeLookup(item?.name) === queryKey
    || normalizeInteger(item?.sid) === numericQuery
    || normalizeInteger(item?.cid) === numericQuery
  ));

  if (exact) {
    return exact;
  }

  const partial = items.filter((item) => normalizeLookup(item?.name).includes(queryKey));
  if (partial.length === 1) {
    return partial[0];
  }

  if (partial.length > 1) {
    throw new Error(`Ambiguous item "${query}": ${partial.slice(0, 8).map((item) => item.name).join(", ")}`);
  }

  throw new Error(`Item not found in ${ITEMS_PATH}: ${query}`);
}

function resolveContainerTarget(items, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return null;
  }

  const runtimeId = normalizeInteger(normalizedQuery);
  try {
    const item = resolveItem(items, normalizedQuery);
    return {
      query: normalizedQuery,
      runtimeId: null,
      itemName: normalizeText(item?.name),
      sid: normalizeInteger(item?.sid),
      cid: normalizeInteger(item?.cid),
    };
  } catch (error) {
    if (runtimeId == null) {
      throw error;
    }

    return {
      query: normalizedQuery,
      runtimeId,
      itemName: "",
      sid: null,
      cid: null,
    };
  }
}

function buildCreateItemExpression(item, count, targetContainer = null) {
  const sid = normalizeInteger(item?.sid);
  const cid = normalizeInteger(item?.cid);
  const itemName = normalizeText(item?.name);
  const itemCount = Math.max(1, Math.trunc(Number(count) || 1));
  const containerTarget = targetContainer
    ? {
      query: normalizeText(targetContainer?.query),
      runtimeId: normalizeInteger(targetContainer?.runtimeId),
      itemName: normalizeText(targetContainer?.itemName),
      sid: normalizeInteger(targetContainer?.sid),
      cid: normalizeInteger(targetContainer?.cid),
    }
    : null;

  if (sid == null || cid == null) {
    throw new Error(`Resolved item is missing sid/cid: ${itemName || JSON.stringify(item)}`);
  }

  return `(() => {
    const game = window.gameClient;
    const player = game?.player;
    const containers = Array.from(player?.__openedContainers?.values?.() || player?.__openedContainers || []);
    const targetContainer = ${JSON.stringify(containerTarget)};
    const normalizeText = (value = "") => String(value ?? "").replace(/\\s+/g, " ").trim();
    const normalizeLookup = (value = "") => normalizeText(value).toLowerCase();
    const normalizeInteger = (value) => {
      if (value == null || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) ? Math.trunc(number) : null;
    };
    const getItemId = (item) => {
      const value = Number(item?.id ?? item?.itemId ?? item?.clientId ?? item?.serverId);
      return Number.isFinite(value) ? Math.trunc(value) : null;
    };
    const getContainerRuntimeId = (container) => normalizeInteger(
      container?.__containerId ?? container?.runtimeId ?? container?.id
    );
    const getContainerName = (container) => normalizeText(
      container?.name ?? container?.label ?? container?.title
    );
    const getSlotItem = (container, slot) => (
      typeof container?.getSlotItem === "function" ? container.getSlotItem(slot) : container?.slots?.[slot]?.item ?? container?.slots?.[slot] ?? null
    );
    const getSlot = (container, slot) => (
      typeof container?.getSlot === "function" ? container.getSlot(slot) : container?.slots?.[slot] ?? null
    );
    const matchesTargetContainer = (container) => {
      if (!targetContainer) {
        return true;
      }

      const targetRuntimeId = normalizeInteger(targetContainer?.runtimeId);
      if (targetRuntimeId != null) {
        return getContainerRuntimeId(container) === targetRuntimeId;
      }

      const itemId = getItemId(container);
      const targetSid = normalizeInteger(targetContainer?.sid);
      const targetCid = normalizeInteger(targetContainer?.cid);
      if (targetSid != null && itemId === targetSid) {
        return true;
      }

      if (targetCid != null && itemId === targetCid) {
        return true;
      }

      const targetName = normalizeLookup(targetContainer?.itemName ?? targetContainer?.query);
      return !!targetName && normalizeLookup(getContainerName(container)).includes(targetName);
    };

    if (!game || !player) {
      return { ok: false, reason: "live player unavailable" };
    }

    if (typeof Item !== "function") {
      return { ok: false, reason: "Item constructor unavailable" };
    }

    const openContainers = containers
      .filter((container) => container && Array.isArray(container.slots));
    const candidateContainers = openContainers
      .filter((container) => matchesTargetContainer(container))
      .filter((container) => container && Array.isArray(container.slots))
      .sort((left, right) => {
        if (targetContainer) {
          return (getContainerRuntimeId(right) ?? 0) - (getContainerRuntimeId(left) ?? 0);
        }

        const leftIsBackpack = getItemId(left) === 2854 ? 0 : 1;
        const rightIsBackpack = getItemId(right) === 2854 ? 0 : 1;
        return leftIsBackpack - rightIsBackpack;
      });

    if (targetContainer && !candidateContainers.length) {
      return {
        ok: false,
        reason: "target container not open",
        targetContainer,
        openContainers: openContainers.map((container) => ({
          runtimeId: getContainerRuntimeId(container),
          itemId: getItemId(container),
          name: getContainerName(container),
        })),
      };
    }

    for (const container of candidateContainers) {
      for (let slot = 0; slot < container.slots.length; slot += 1) {
        if (getSlotItem(container, slot)) {
          continue;
        }

        const created = new Item(${cid}, ${itemCount});
        created.sid = ${sid};
        created.tintId = 0;

        if (typeof container.__setItem === "function") {
          container.__setItem(slot, created);
        } else {
          const targetSlot = getSlot(container, slot);
          if (targetSlot && typeof targetSlot.setItem === "function") {
            targetSlot.setItem(created);
          } else {
            container.slots[slot] = created;
          }
        }

        const targetSlot = getSlot(container, slot);
        try {
          targetSlot?.render?.();
        } catch {}
        try {
          container.__render?.();
        } catch {}

        return {
          ok: true,
          characterName: player.name || player.__name || "",
          itemName: ${JSON.stringify(itemName)},
          sid: ${sid},
          cid: ${cid},
          count: ${itemCount},
          containerId: getItemId(container),
          runtimeId: getContainerRuntimeId(container),
          containerName: getContainerName(container),
          targetContainer,
          slot,
          verifiedItemId: getItemId(getSlotItem(container, slot)),
        };
      }
    }

    return { ok: false, reason: "no open container slot", targetContainer };
  })()`;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.character) {
    throw new Error("Missing --character.");
  }

  if (!options.visualOnly) {
    throw new Error(
      "Refusing client-only item injection. This path is visual-only and is lost when the server refreshes the container. Use --visual-only only for rendering tests; real item creation requires a server-authoritative grant hook."
    );
  }

  const items = loadItems();
  const item = resolveItem(items, options.item);
  const targetContainer = resolveContainerTarget(items, options.container);
  const pages = await discoverGamePages(options.port, options.pageUrlPrefix);
  const characterKey = normalizeLookup(options.character);
  const page = pages.find((candidate) => normalizeLookup(candidate.characterName).includes(characterKey));

  if (!page) {
    throw new Error(`No live page found for character matching "${options.character}".`);
  }

  const cdp = new CdpPage(page.webSocketDebuggerUrl);
  await cdp.connect();
  try {
    const result = await cdp.evaluate(buildCreateItemExpression(item, options.count, targetContainer));
    console.log(JSON.stringify(result, null, 2));
    if (!result?.ok) {
      process.exitCode = 1;
    }
  } finally {
    cdp.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  buildCreateItemExpression,
  main,
  parseArgs,
  resolveContainerTarget,
  resolveItem,
};
