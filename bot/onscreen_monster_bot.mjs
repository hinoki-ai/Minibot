#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatMonsterNames,
  MinibiaTargetBot,
  formatTarget,
  parseArgs,
  sleep,
} from "./lib/bot-core.mjs";

const __filename = fileURLToPath(import.meta.url);

export const CLI_HELP_TEXT = `Usage:
  node onscreen_monster_bot.mjs [--port 9224] [--monster Rotworm] [--monster Rat] [--interval 250] [--retarget 1200] [--range-x 7] [--range-y 5] [--floor 1] [--chase-mode auto|stand|chase|aggressive] [--url https://minibia.com/play] [--autowalk] [--allow-input-control] [--once] [--dry-run]

Examples:
  node onscreen_monster_bot.mjs
  node onscreen_monster_bot.mjs --monster "Swamp Troll,Rat" --dry-run
  node onscreen_monster_bot.mjs --monster "Swamp Troll" --monster Rat --once
  node onscreen_monster_bot.mjs --port 9224 --url https://minibia.com/play --autowalk
`;

export function printHelp(stdout = process.stdout) {
  stdout.write(CLI_HELP_TEXT);
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fs.realpathSync(process.argv[1]) === __filename;
  } catch {
    return path.resolve(process.argv[1]) === __filename;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return;
  }

  const bot = new MinibiaTargetBot(options);
  bot.on((event) => {
    if (event.type === "log") {
      console.log(event.payload.message);
    }
  });

  await bot.attach();
  console.log(`Attached to ${bot.page.title || bot.page.url}`);
  console.log(`Monsters: ${formatMonsterNames(options.monsterNames || options.monster)}`);
  console.log(`Mode: ${options.dryRun ? "dry-run" : "live"}`);

  if (options.once) {
    const snapshot = await bot.tick();
    if (snapshot?.currentTarget && snapshot.candidates?.some((candidate) => candidate.id === snapshot.currentTarget.id)) {
      console.log(`Already targeting ${formatTarget(snapshot.currentTarget)}.`);
    }
    await bot.detach();
    return;
  }

  bot.start();

  process.on("SIGINT", async () => {
    bot.stop();
    await sleep(50);
    await bot.detach();
    process.exit(0);
  });
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
