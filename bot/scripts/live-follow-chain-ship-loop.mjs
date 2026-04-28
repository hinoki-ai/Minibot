#!/usr/bin/env node

import {
  discoverGamePages,
  MinibiaTargetBot,
  sleep,
} from "../lib/bot-core.mjs";

const PORT = 9224;
const URL_PREFIX = "https://minibia.com/play";
const CHAIN = ["Lord Larva", "Holy Rat", "Dark Knight"];
const ROLE = "attack-and-follow";
const CITY_CAPTAINS = Object.freeze({
  ankrahmun: "Captain Sinbeard",
  edron: "Captain Seahorse",
  thais: "Captain Bluebear",
  venore: "Captain Fearless",
});
const DEFAULT_ROUTE = ["thais", "edron", "venore"];

function normalizeText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNameKey(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizePosition(position = null) {
  if (!position) {
    return null;
  }

  const x = Number(position.x);
  const y = Number(position.y);
  const z = Number(position.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return {
    x: Math.trunc(x),
    y: Math.trunc(y),
    z: Math.trunc(z),
  };
}

function getPositionKey(position = null) {
  const normalized = normalizePosition(position);
  return normalized
    ? `${normalized.x},${normalized.y},${normalized.z}`
    : "";
}

function getPositionDistance(left = null, right = null) {
  const a = normalizePosition(left);
  const b = normalizePosition(right);
  if (!a || !b || a.z !== b.z) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
  );
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    route: [...DEFAULT_ROUTE],
    align: "venore",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = String(argv[index] || "").trim();
    if (argument === "--route") {
      options.route = String(argv[++index] || "")
        .split(",")
        .map((value) => normalizeText(value).toLowerCase())
        .filter(Boolean);
    } else if (argument === "--align") {
      options.align = normalizeText(argv[++index]).toLowerCase();
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
  node bot/scripts/live-follow-chain-ship-loop.mjs
  node bot/scripts/live-follow-chain-ship-loop.mjs --align venore --route thais,edron,venore

This script attaches to the live Lord Larva / Holy Rat / Dark Knight pages,
manually aligns them to one dock if needed, then pumps the real follow-chain
logic on followers while the leader performs live ship travel.`);
}

function summarizeSnapshot(snapshot = null) {
  const captain = getNearestVisibleCaptain(snapshot);
  return {
    position: normalizePosition(snapshot?.playerPosition),
    moving: snapshot?.isMoving === true || snapshot?.pathfinderAutoWalking === true,
    captain: captain
      ? {
          name: captain.name,
          position: normalizePosition(captain.position),
          distance: Number.isFinite(Number(captain.chebyshevDistance))
            ? Math.max(0, Math.trunc(Number(captain.chebyshevDistance)))
            : null,
        }
      : null,
    dialogue: {
      open: snapshot?.dialogue?.open === true,
      npcName: normalizeText(snapshot?.dialogue?.npcName),
      prompt: normalizeText(snapshot?.dialogue?.prompt),
      tail: (Array.isArray(snapshot?.dialogue?.recentMessages) ? snapshot.dialogue.recentMessages : [])
        .slice(-6)
        .map((message) => `${normalizeText(message?.speaker)}: ${normalizeText(message?.text)}`),
    },
  };
}

function logStep(message, details = null) {
  const prefix = `[${new Date().toISOString()}]`;
  if (details == null) {
    console.log(`${prefix} ${message}`);
    return;
  }

  console.log(`${prefix} ${message} ${JSON.stringify(details)}`);
}

function getNearestVisibleCaptain(snapshot = null) {
  const visibleNpcs = Array.isArray(snapshot?.visibleNpcs) ? snapshot.visibleNpcs : [];
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const npc of visibleNpcs) {
    const name = normalizeText(npc?.name);
    if (!name || !/^captain\b/i.test(name)) {
      continue;
    }

    const distance = Number.isFinite(Number(npc?.chebyshevDistance))
      ? Math.max(0, Number(npc.chebyshevDistance))
      : Number.POSITIVE_INFINITY;
    if (distance < bestDistance) {
      best = npc;
      bestDistance = distance;
    }
  }

  return best || null;
}

function isAtCity(snapshot = null, city = "") {
  const captainName = CITY_CAPTAINS[normalizeText(city).toLowerCase()] || "";
  if (!captainName) {
    return false;
  }

  const captainKey = normalizeNameKey(captainName);
  const visibleNpcs = Array.isArray(snapshot?.visibleNpcs) ? snapshot.visibleNpcs : [];
  if (visibleNpcs.some((npc) => normalizeNameKey(npc?.name) === captainKey)) {
    return true;
  }

  const dialogueNpcKey = normalizeNameKey(snapshot?.dialogue?.npcName);
  return Boolean(dialogueNpcKey) && dialogueNpcKey === captainKey;
}

async function attachChainBots() {
  const pages = await discoverGamePages(PORT, URL_PREFIX);
  const bots = [];
  for (const characterName of CHAIN) {
    const page = pages.find((entry) => normalizeText(entry?.characterName) === characterName);
    if (!page) {
      throw new Error(`Live page not found for ${characterName}`);
    }

    const bot = new MinibiaTargetBot({
      partyFollowEnabled: true,
      partyFollowMembers: CHAIN,
      partyFollowDistance: 1,
      partyFollowCombatMode: "follow-and-fight",
      trainerEnabled: false,
      dryRun: false,
    });
    await bot.attachToPage(page);
    await bot.refresh({ emitSnapshot: false });
    bots.push({
      name: characterName,
      page,
      bot,
    });
  }

  return bots;
}

async function detachChainBots(chainBots = []) {
  for (const entry of chainBots) {
    try {
      await entry.bot.detach();
    } catch {}
  }
}

async function refreshChain(chainBots = []) {
  return Promise.all(
    chainBots.map(async (entry) => ({
      ...entry,
      snapshot: await entry.bot.refresh({ emitSnapshot: false }),
    })),
  );
}

function syncCoordination(chainState = []) {
  const now = Date.now();
  const members = chainState.map((entry) => ({
    instanceId: String(entry.page?.id || entry.name),
    characterName: entry.name,
    enabled: true,
    role: ROLE,
    trainerEnabled: false,
    trainerAutoPartyEnabled: true,
    trainerPartnerName: "",
    currentState: String(entry.bot.followTrainState?.currentState || "").trim() || null,
    followActive: Boolean(entry.snapshot?.currentFollowTarget || entry.snapshot?.followTarget),
    leaderName: normalizeText(entry.bot.followTrainState?.leaderName),
    playerPosition: normalizePosition(entry.snapshot?.playerPosition),
    floorTransition: entry.bot.getFollowTrainFloorTransition(now),
    recentActions: entry.bot.getFollowTrainRecentActions(now),
    updatedAt: now,
  }));

  for (const entry of chainState) {
    entry.bot.followTrainCoordinationState = {
      selfInstanceId: String(entry.page?.id || entry.name),
      members,
    };
  }
}

async function waitForStablePosition(entry, {
  timeoutMs = 8_000,
  settleMs = 700,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastStableKey = "";
  let stableSince = 0;
  while (Date.now() < deadline) {
    const snapshot = await entry.bot.refresh({ emitSnapshot: false });
    const positionKey = getPositionKey(snapshot?.playerPosition);
    const moving = snapshot?.isMoving === true || snapshot?.pathfinderAutoWalking === true;
    if (!moving && positionKey) {
      if (positionKey === lastStableKey) {
        if (stableSince > 0 && Date.now() - stableSince >= settleMs) {
          return snapshot;
        }
      } else {
        lastStableKey = positionKey;
        stableSince = Date.now();
      }
    } else {
      lastStableKey = "";
      stableSince = 0;
    }

    await sleep(180);
  }

  return entry.bot.lastSnapshot;
}

async function approachVisibleCaptain(entry, {
  maxAttempts = 10,
} = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const snapshot = await entry.bot.refresh({ emitSnapshot: false });
    const captain = getNearestVisibleCaptain(snapshot);
    if (!captain?.position) {
      throw new Error(`${entry.name} cannot see a ship captain`);
    }

    const distance = Number.isFinite(Number(captain?.chebyshevDistance))
      ? Math.max(0, Number(captain.chebyshevDistance))
      : getPositionDistance(snapshot?.playerPosition, captain.position);
    if (distance <= 1) {
      return snapshot;
    }

    const plan = entry.bot.findFollowTrainDestination(snapshot, captain.position, {
      spacing: 1,
      allowExactTarget: false,
    });
    if (!plan?.destination) {
      throw new Error(`${entry.name} cannot find a path to ${normalizeText(captain.name)}`);
    }

    logStep(`${entry.name} approaches ${normalizeText(captain.name)}`, {
      from: normalizePosition(snapshot?.playerPosition),
      to: normalizePosition(plan.destination),
    });
    const result = await entry.bot.followTrainWalk({
      destination: plan.destination,
      progressKey: plan.progressKey || getPositionKey(plan.destination),
      reason: "npc-replay-approach",
      targetName: normalizeText(captain.name),
      origin: normalizePosition(snapshot?.playerPosition),
    });
    if (!result?.ok) {
      throw new Error(`${entry.name} failed to approach ${normalizeText(captain.name)}: ${result?.reason || "unknown error"}`);
    }

    await waitForStablePosition(entry);
  }

  throw new Error(`${entry.name} did not reach captain adjacency in time`);
}

async function castNpcKeyword(entry, words) {
  const result = await entry.bot.castWords({
    type: "npc-keyword",
    words,
    moduleKey: "manual-live-ship",
  });
  if (!result?.ok) {
    throw new Error(`${entry.name} failed to say "${words}": ${result?.reason || "unknown error"}`);
  }

  logStep(`${entry.name} said ${words}`);
  await sleep(320);
  return result;
}

async function waitForCity(entry, city, {
  timeoutMs = 8_000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = await entry.bot.refresh({ emitSnapshot: false });
    if (isAtCity(snapshot, city) && !(snapshot?.isMoving === true || snapshot?.pathfinderAutoWalking === true)) {
      return snapshot;
    }
    await sleep(220);
  }

  return entry.bot.lastSnapshot;
}

async function manualTravel(entry, destination, {
  attempts = 4,
} = {}) {
  const destinationKey = normalizeText(destination).toLowerCase();
  if (!CITY_CAPTAINS[destinationKey]) {
    throw new Error(`Unsupported destination: ${destination}`);
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await approachVisibleCaptain(entry);
    await castNpcKeyword(entry, "hi");
    await castNpcKeyword(entry, destinationKey);
    await castNpcKeyword(entry, "yes");
    const arrivalSnapshot = await waitForCity(entry, destinationKey);
    if (isAtCity(arrivalSnapshot, destinationKey)) {
      logStep(`${entry.name} arrived in ${destinationKey}`, summarizeSnapshot(arrivalSnapshot));
      return arrivalSnapshot;
    }

    logStep(`${entry.name} did not confirm ${destinationKey} on attempt ${attempt}`, summarizeSnapshot(arrivalSnapshot));
    await sleep(500);
  }

  throw new Error(`${entry.name} failed to travel to ${destinationKey}`);
}

function followersAtLeaderDock(chainState = []) {
  const leader = chainState[0] || null;
  if (!leader?.snapshot?.playerPosition) {
    return false;
  }

  const leaderPosition = normalizePosition(leader.snapshot.playerPosition);
  return chainState.slice(1).every((entry) => {
    const position = normalizePosition(entry.snapshot?.playerPosition);
    if (!position || position.z !== leaderPosition.z) {
      return false;
    }

    return getPositionDistance(position, leaderPosition) <= 8;
  });
}

async function pumpFollowers(chainBots, {
  destination,
  timeoutMs = 45_000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let iteration = 0;
  while (Date.now() < deadline) {
    let chainState = await refreshChain(chainBots);
    syncCoordination(chainState);

    if (followersAtLeaderDock(chainState) && chainState.every((entry) => isAtCity(entry.snapshot, destination))) {
      return chainState;
    }

    let progressed = false;
    for (let index = 1; index < chainState.length; index += 1) {
      const entry = chainState[index];
      const action = entry.bot.chooseFollowTrainAction(entry.snapshot);
      if (!action) {
        continue;
      }

      logStep(`${entry.name} follow action`, {
        kind: action.kind,
        words: normalizeText(action.words),
        actionType: normalizeText(action.actionType),
        destination: normalizePosition(action.destination),
        position: normalizePosition(action.position),
        targetName: normalizeText(action.targetName || action.leaderName),
        reason: normalizeText(action.reason),
      });
      const result = await entry.bot.executeFollowTrainAction(action);
      if (!result?.ok) {
        throw new Error(`${entry.name} failed ${action.kind}: ${result?.reason || "unknown error"}`);
      }
      progressed = true;
      await sleep(action.kind === "follow-train-cast" ? 350 : 260);

      chainState = await refreshChain(chainBots);
      syncCoordination(chainState);
      if (followersAtLeaderDock(chainState) && chainState.every((state) => isAtCity(state.snapshot, destination))) {
        return chainState;
      }
    }

    if ((iteration % 8) === 0) {
      logStep(`Follower pump ${destination}`, chainState.map((entry) => ({
        name: entry.name,
        ...summarizeSnapshot(entry.snapshot),
      })));
    }
    iteration += 1;
    await sleep(progressed ? 220 : 320);
  }

  const finalState = await refreshChain(chainBots);
  syncCoordination(finalState);
  throw new Error(`Followers did not finish ${destination} before timeout: ${JSON.stringify(finalState.map((entry) => ({
    name: entry.name,
    ...summarizeSnapshot(entry.snapshot),
  })))}`);
}

async function alignToCity(chainBots, city) {
  const destinationKey = normalizeText(city).toLowerCase();
  logStep(`Aligning chain to ${destinationKey}`);
  for (const entry of chainBots) {
    const snapshot = await entry.bot.refresh({ emitSnapshot: false });
    if (isAtCity(snapshot, destinationKey)) {
      logStep(`${entry.name} already at ${destinationKey}`, summarizeSnapshot(snapshot));
      continue;
    }

    await manualTravel(entry, destinationKey);
  }

  const chainState = await refreshChain(chainBots);
  syncCoordination(chainState);
  logStep(`Alignment complete`, chainState.map((entry) => ({
    name: entry.name,
    ...summarizeSnapshot(entry.snapshot),
  })));
}

async function run() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  if (!CITY_CAPTAINS[options.align]) {
    throw new Error(`Unsupported align city: ${options.align}`);
  }
  if (!options.route.length || options.route.some((city) => !CITY_CAPTAINS[city])) {
    throw new Error(`Unsupported route: ${options.route.join(", ")}`);
  }

  const chainBots = await attachChainBots();
  try {
    logStep("Attached live chain", chainBots.map((entry) => entry.name));
    await alignToCity(chainBots, options.align);

    for (const destination of options.route) {
      logStep(`Leader hop begins`, {
        leader: chainBots[0].name,
        destination,
      });
      await manualTravel(chainBots[0], destination);
      const finalState = await pumpFollowers(chainBots, { destination });
      logStep(`Hop complete ${destination}`, finalState.map((entry) => ({
        name: entry.name,
        ...summarizeSnapshot(entry.snapshot),
      })));
    }
  } finally {
    await detachChainBots(chainBots);
  }
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
