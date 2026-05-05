# Minibot

Minibot is a local desktop automation toolkit for the live Minibia client at
`https://minibia.com/play`. The Electron desk is the canonical interface. A
narrow CLI runner remains available for direct target-only workflows.

## Shipping Today

The current repo ships:

- a multi-session Electron desk with per-character tabs, operator tab ordering,
  `HP` / `P` / `WP` tab chips, busy-claim protection, compact view, logs, and
  route quick actions
- an account registry for login method, local secret policy, preferred
  character, character list, reconnect policy, notes, and trainer bootstrap
- live DevTools discovery plus managed browser launch with a dedicated profile,
  managed-profile flags, browser-profile hygiene, optional always-active
  background flags, and Linux Minibia desktop-app preference
- Hunt Studio for target queues, target profiles, shared-spawn policy, creature
  registries, player/NPC watch, fallback combat rules, and vendored hunt presets
- route builder and route library support for saved route profiles, recording,
  waypoint overlays, route reset, helper recovery, tile rules, and waypoint
  interactions such as `bank`, `shop`, `npc-action`, `daily-task`, `use-item`,
  `rope`, `ladder`, and `shovel-hole`
- shared modules for sustain, healer, potion healer, condition healer, death
  heal, trainer, mana trainer, auto eat, haste, ammo, ring/amulet replacement,
  rune maker, spell caster, distance keeper, auto light, auto convert, refill,
  looting, banking, reconnect, alarms, anti-idle, Team Hunt, PK Assist, and
  rookiller
- shared action primitives for hotbar, inventory, item use, container, NPC
  dialogue, trade, travel, residence, blessing, and promotion interactions,
  including target-aware hotbar item use and hotkey dispatch for configured
  spell or consumable bindings
- vendored Minibia data, vocation packs, and official-hunt preset generation

The checked-in [`cavebots/`](./cavebots) directory is workspace route data. The
live app reads and writes saved routes in `~/Minibot/cavebots` or the portable
storage equivalent.

## Requirements

- Linux, Windows, or macOS desktop environment
- Node.js `>=22`
- npm
- Chrome, Chromium, Brave, Edge, or the Minibia desktop app on Linux
- access to the live Minibia play page

`New Session` auto-detects common Chrome-family installs. Set
`MINIBOT_BROWSER_PATH` when the browser is installed in a non-standard path.

## Quick Start

```bash
npm install
npm test
npm run desktop
```

Optional launcher link:

```bash
npm link
bb
```

Useful scripts:

```bash
npm run check:structure
npm run test:core
npm run test:desktop
npm run test:all
npm run refresh:minibia-data
npm run pack
npm run dist
npm run bundle:minibia
```

Primary entry points:

- `bb`: Electron desktop launcher after `npm link`
- `npm run desktop`: local Electron desk
- `node onscreen_monster_bot.mjs`: narrow CLI runner
- `npm run bundle:minibia`: sanitized portable bundle builder

## Operating Model

Minibot does not embed a game client. It attaches to live Minibia pages exposed
through Chrome DevTools Protocol.

- each discovered Minibia page becomes a session
- each character has per-character config and an active claim file
- a character claimed by another Minibot desk stays visible but read-only
- named route profiles are saved separately from character config
- route profiles carry route-local hunt, sustain, module, waypoint, and tile-rule
  state
- character config keeps the selected route reference plus local-only ledgers,
  pause state, and stop-aggro hold

Runtime persistence paths:

- global config: `~/.config/minibot/config.json`
- account registry: `~/.config/minibot/accounts/<accountId>.json`
- per-character config: `~/.config/minibot/characters/<profileKey>.json`
- claim files: `~/.config/minibot/claims/<profileKey>.json`
- route-spacing leases: `~/.config/minibot/route-spacing/*`
- route profiles: `~/Minibot/cavebots/<routeName>.json`

Route names become filenames. Avoid `<>:"/\\|?*`, trailing spaces or periods,
and reserved Windows names such as `CON` or `LPT1`.

Portable mode:

- when the repo lives at `minibia/bot` with a sibling `minibia/client`, portable
  mode is detected automatically
- config and routes are stored under `minibia/bot/storage/home/...`
- generated browser and Electron profile state is stored under
  `minibia/bot/storage/runtime/...`
- `client/client-meta.json` is the launch contract
- `client/chrome-profile` is only an optional sanitized seed for managed browser
  launches; transfer bundles strip browser cache/history/password databases and
  machine-local account secrets

## Common Workflows

### Desktop App

```bash
npm run desktop
```

Use the desktop desk for full operation:

- attach to existing live Minibia tabs on the configured DevTools port
- launch a managed browser session from the desk
- switch, reorder, start, stop, close, and inspect per-character sessions
- edit hunt state in Hunt Studio and route-local hunt surfaces
- build, load, save, rename, delete, record, and reset route profiles
- edit module rules through the shared module modal
- inspect logs, alerts, presets, route state, and compact view without changing
  the underlying state model

### Manual Browser Attach

```bash
google-chrome \
  --remote-debugging-port=9224 \
  --new-window \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling \
  https://minibia.com/play
```

Then start Minibot and attach to the discovered page. Use the equivalent
Chrome-family executable on Windows or macOS with the same DevTools and
always-active background flags.

### Direct CLI Runner

```bash
node onscreen_monster_bot.mjs --monster Rotworm
```

Examples:

```bash
node onscreen_monster_bot.mjs --monster "Swamp Troll,Rat" --dry-run
node onscreen_monster_bot.mjs --monster "Swamp Troll" --monster Rat --once
node onscreen_monster_bot.mjs --port 9224 --url https://minibia.com/play --autowalk
```

Supported flags: `--port`, `--monster`, `--monsters`, `--interval`,
`--retarget`, `--range-x`, `--range-y`, `--floor`, `--chase-mode`,
`--chase`, `--chase-stance`, `--url`, `--autowalk`, `--allow-input-control`,
`--once`, `--dry-run`, and `--help`.

### Route Recorder Helper

```bash
node scripts/record-same-floor-route.mjs --character "Spells Of Regret" --route "Larvas 3"
```

Useful flags: `--character`, `--route`, `--max-minutes`, `--poll-ms`,
`--move-timeout-ms`, and `--silent`.

## Project Layout

- [`desktop/`](./desktop): Electron main process, app protocol, preload bridge,
  renderer, renderer helpers, power-save handling, Linux integration, and static assets
- [`lib/`](./lib): runtime, CDP transport, persistence, data loading, item
  metadata, action router, and shared helpers
- [`lib/modules/`](./lib/modules): shared gameplay planners and normalizers
- [`data/minibia/`](./data/minibia): vendored normalized Minibia datasets,
  the latest retained source snapshot, and vocation packs
- [`scripts/`](./scripts): data refresh, portable bundle creation, route capture,
  structure checks, launch helpers, and brand asset generation
- [`test/`](./test): Node test suite
- [`cavebots/`](./cavebots): workspace route examples
- [`storage/`](./storage): portable bundle state when this repo is running from a
  `minibia/bot` layout
- [`temporals/`](./temporals): 24-hour scratch notes only

## Documentation

Start with [`AGENTS.md`](./AGENTS.md). The canonical docs are:

- [`AGENTS.md`](./AGENTS.md)
- [`README.md`](./README.md)
- [`CANONICAL.md`](./CANONICAL.md)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/MODULES.md`](./docs/MODULES.md)
- [`docs/MINIBIA_RUNTIME_SURFACE.md`](./docs/MINIBIA_RUNTIME_SURFACE.md)
- [`docs/MINIBIA_ACTION_PRIMITIVES.md`](./docs/MINIBIA_ACTION_PRIMITIVES.md)
- [`docs/UI_UX.md`](./docs/UI_UX.md)
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)
- [`todo.md`](./todo.md)

Open work belongs only in [`todo.md`](./todo.md). Short-lived notes belong only
in [`temporals/`](./temporals).

## Verification

```bash
npm run check:structure
npm test
```

`npm run check:structure` verifies the portable root boundary, canonical
markdown set, generated-state exclusions, and package entry points. `npm test`
runs the smoke lane only. Use `npm run test:core` for bot decision logic, `npm
run test:desktop` for the Electron renderer and shell, `npm run
test:integration` for local browser/socket/CDP behavior, `npm run test:release`
for bundle and repository checks, and `npm run test:all` only when the whole
suite is required.

`npm run pack` produces an unpacked release bundle. `npm run dist` creates
installable artifacts for the current platform.
