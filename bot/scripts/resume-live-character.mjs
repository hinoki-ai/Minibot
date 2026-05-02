#!/usr/bin/env node

import {
  discoverGamePages,
  formatMonsterNames,
  MinibiaTargetBot,
  normalizeOptions,
  sleep,
} from "../lib/bot-core.mjs";
import {
  loadConfig,
  releaseRouteSpacingLease,
  saveConfig,
  syncRouteSpacingLease,
} from "../lib/config-store.mjs";

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = String(argv[index] || "");
    const next = argv[index + 1];

    if ((arg === "--profile" || arg === "--profile-key") && next) {
      options.profileKey = String(next).trim();
      index += 1;
    } else if ((arg === "--character" || arg === "--name") && next) {
      options.characterName = String(next).trim();
      index += 1;
    } else if (arg === "--route-index" && next) {
      options.routeIndex = Math.max(0, Math.trunc(Number(next) || 0));
      index += 1;
    } else if (arg === "--port" && next) {
      options.port = Number(next);
      index += 1;
    } else if (arg === "--url" && next) {
      options.pageUrlPrefix = String(next).trim();
      index += 1;
    } else if (arg === "--once") {
      options.once = true;
    } else if (arg === "--no-save") {
      options.saveConfig = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node bot/scripts/resume-live-character.mjs --profile czarnobrat --character Czarnobrat [--route-index 42]

Options:
  --profile, --profile-key   Character profile key to load from Minibot config
  --character, --name        Live tab character name to attach to
  --route-index              Starting cavebot route index hint
  --port                     Chrome DevTools port, default from profile config
  --url                      Minibia page URL prefix, default from profile config
  --once                     Run one tick and exit
  --no-save                  Do not persist runtime safety normalization`);
}

function normalizeKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function shouldArmAutowalk(config = {}) {
  if (config?.autowalkEnabled === true || config?.routeRecording === true) {
    return false;
  }

  const routeName = String(config?.cavebotName || "").trim();
  const waypoints = Array.isArray(config?.waypoints) ? config.waypoints : [];
  return Boolean(routeName && waypoints.length);
}

function createRouteSpacingAdapter({
  profileKey,
  characterName,
  title = "",
}) {
  let activeRouteKey = null;
  let startedAt = 0;
  const instanceId = `live-resume-${process.pid}:${profileKey}`;

  return {
    async sync(context = {}) {
      const snapshot = context.snapshot || null;
      const result = await syncRouteSpacingLease({
        options: context.options,
        previousRouteKey: activeRouteKey,
        instanceId,
        characterName: characterName || snapshot?.playerName || profileKey,
        title,
        routeIndex: context.routeIndex,
        confirmedIndex: context.lastConfirmedWaypointIndex,
        playerPosition: context.playerPosition || snapshot?.playerPosition || null,
        startedAt,
        active: Boolean(
          context.running
          && context.autowalkEnabled
          && !context.routeResetActive
        ),
      });

      activeRouteKey = result.routeKey || null;
      startedAt = Number(result.lease?.startedAt) || 0;

      if (!result.routeKey) {
        return null;
      }

      return {
        selfInstanceId: instanceId,
        routeKey: result.routeKey,
        members: result.members,
      };
    },
    async release() {
      if (!activeRouteKey) {
        startedAt = 0;
        return null;
      }

      const routeKey = activeRouteKey;
      activeRouteKey = null;
      startedAt = 0;
      return releaseRouteSpacingLease({ routeKey, instanceId });
    },
  };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.profileKey) {
    throw new Error("--profile is required.");
  }

  const loadedConfig = await loadConfig({ profileKey: args.profileKey });
  if (!loadedConfig) {
    throw new Error(`Profile "${args.profileKey}" could not be loaded.`);
  }

  const safetyPatch = {};
  if (loadedConfig.cavebotPaused) safetyPatch.cavebotPaused = false;
  if (loadedConfig.stopAggroHold) safetyPatch.stopAggroHold = false;
  if (shouldArmAutowalk(loadedConfig)) safetyPatch.autowalkEnabled = true;

  const config = normalizeOptions({
    ...loadedConfig,
    ...safetyPatch,
    port: args.port || loadedConfig.port,
    pageUrlPrefix: args.pageUrlPrefix || loadedConfig.pageUrlPrefix,
    once: Boolean(args.once),
  });

  if (args.saveConfig !== false && Object.keys(safetyPatch).length > 0) {
    await saveConfig(config, { profileKey: args.profileKey });
  }

  const pages = await discoverGamePages(config.port, config.pageUrlPrefix);
  const requestedCharacterKey = normalizeKey(args.characterName);
  const page = pages.find((candidate) => (
    requestedCharacterKey
      ? normalizeKey(candidate.characterName || candidate.displayName) === requestedCharacterKey
      : normalizeKey(candidate.characterName || candidate.displayName) === normalizeKey(args.profileKey)
  ));

  if (!page) {
    throw new Error(`No ready page found for ${args.characterName || args.profileKey}.`);
  }

  const localPlayerNames = pages
    .map((candidate) => candidate.characterName || candidate.displayName)
    .filter(Boolean);
  const bot = new MinibiaTargetBot(config);
  bot.routeIndex = Math.max(0, Math.trunc(Number(args.routeIndex) || Number(bot.routeIndex) || 0));
  bot.lastConfirmedWaypointIndex = bot.routeIndex;
  bot.setRuntimeLoad({
    runningSessionCount: Math.max(1, localPlayerNames.length),
    sessionCount: Math.max(1, localPlayerNames.length),
    sessionIndex: Math.max(0, pages.findIndex((candidate) => candidate.id === page.id)),
    active: true,
    localPlayerNames,
  });
  bot.setRouteCoordinationAdapter(createRouteSpacingAdapter({
    profileKey: args.profileKey,
    characterName: page.characterName || args.characterName || args.profileKey,
    title: page.title || "Minibia",
  }));
  bot.on((event) => {
    if (event.type === "log") {
      console.log(event.payload.message);
    }
  });

  await bot.attachToPage(page);
  console.log(`Attached to ${page.characterName || page.displayName || page.title}`);
  console.log(`Monsters: ${formatMonsterNames(config.monsterNames)}`);
  console.log(`Route: ${config.cavebotName || "(none)"} at index ${bot.routeIndex}`);

  if (args.once) {
    await bot.tick();
    await bot.detach();
    return;
  }

  bot.start();

  const shutdown = async () => {
    bot.stop();
    await sleep(50);
    await bot.detach();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
