# Operations

This document is the operator runbook for the current Minibot build. For
architecture details, use [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md). For UI
behavior and desk terminology, use [`docs/UI_UX.md`](./UI_UX.md).

## Setup

Install dependencies:

```bash
npm install
```

Minibot currently targets Node.js `>=22`.

Run the test suite:

```bash
npm test
```

Build an unpacked production bundle:

```bash
npm run pack
```

Build installer artifacts for the current platform:

```bash
npm run dist
```

Launch the desktop app:

```bash
npm run desktop
```

Optional global command install:

```bash
npm link
```

## Browser Launch Workflows

### Recommended: Managed Session

Launch Minibot and use `New Session` in the desktop app. Minibot will:

- prefer the installed Minibia desktop-app launcher on Linux when it is available
- otherwise resolve a Chrome-family browser executable
- create a dedicated user-data directory under the Electron app data directory
- launch the browser in a new window with remote debugging enabled
- apply managed-profile and background-hygiene Chromium flags
- open the configured Minibia page
- wait for the new live page to appear as a session tab

`New Session` stays on Minibot's dedicated browser profile. It does not reuse arbitrary browsers that already expose the DevTools port, because that can silently drop the managed launch flags and make session behavior depend on an unrelated browser window.

The managed launcher checks common Chrome, Chromium, Brave, and Edge install paths on Linux, Windows, and macOS. If auto-detection still fails, set `MINIBOT_BROWSER_PATH`.

Example:

```bash
MINIBOT_BROWSER_PATH=/usr/bin/google-chrome npm run desktop
```

If the live browser is still being throttled behind other windows, opt into the heavier always-active Chromium flags:

```bash
MINIBOT_KEEP_BROWSER_BACKGROUND_ACTIVE=1 npm run desktop
```

### Manual Attach

Open a browser yourself with remote debugging enabled:

```bash
google-chrome \
  --remote-debugging-port=9224 \
  --new-window \
  --disable-background-networking \
  --disable-sync \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling \
  https://minibia.com/play
```

Then start Minibot and attach to the discovered session.

The example above uses a Linux Chrome binary. Use the equivalent Chrome-family executable on Windows or macOS with the same DevTools flags. The `--disable-background-timer-throttling`, `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`, and `--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling` flags are the heavier always-active set; use them for manual attach when background tabs or windows freeze.

Do not omit the always-active flags when manually launched windows may sit behind other windows. Chromium can otherwise throttle or freeze background clients hard enough for Minibia to stop updating or disconnect.

If you use a non-default page or port, update Minibot config or pass custom flags to the CLI runner.

## External Agent Control

When the Electron desktop app is running, Minibot starts a local NDJSON control socket for trusted local agents. The socket lets agents operate the real in-memory bot sessions directly instead of driving the renderer as a fake user.

Default discovery file:

```bash
cat ~/.config/minibot/control-socket.json
```

In portable mode, the same file is under `bot/storage/home/.config/minibot/control-socket.json`.

Default transport is `127.0.0.1:17373`. If that default port is busy, Minibot binds an ephemeral local port and writes the actual address to the discovery file.

Useful environment flags:

- `MINIBOT_CONTROL_SOCKET=0`: disable the socket
- `MINIBOT_CONTROL_PORT=17373`: set a TCP port
- `MINIBOT_CONTROL_HOST=127.0.0.1`: set the TCP host
- `MINIBOT_CONTROL_SOCKET_PATH=/path/to/minibot.sock`: use a Unix socket path instead of TCP
- `MINIBOT_CONTROL_TOKEN=...`: require auth or a per-request token
- `MINIBOT_CONTROL_ALLOW_RAW_CDP=0`: disable raw `cdp.send` and `cdp.evaluate`

Protocol shape:

```json
{"id":1,"method":"state"}
{"id":2,"method":"selectSession","params":{"sessionId":"..."}}
{"id":3,"method":"startBot","params":{"sessionId":"..."}}
{"id":4,"method":"action","params":{"sessionId":"...","action":{"type":"useHotkey","hotkey":"F1"}}}
{"id":5,"method":"actionBlock","params":{"steps":[{"type":"say","words":"hi"},{"type":"wait","durationMs":500}]}}
```

Each line is one JSON request. Responses are one JSON line with `id`, `ok`, and either `result` or `error`. Use `subscribe` to receive renderer-style `bb:event` envelopes:

```json
{"id":6,"method":"subscribe"}
```

When a token is configured, authenticate once:

```json
{"id":1,"method":"auth","token":"..."}
```

or include `token` on each request.

## Desktop Workflow

The desk header exposes the session strip plus `New Session`, `Close Session`, `Scan All Tabs`, `Close Client`, `New Route`, `Saved Files`, `Accounts`, `Route Panel`, `Hunt Studio`, `Compact View`, `Desk Pinned`, and `Presets`.

### 1. Sync And Claim

- launch or discover the live browser page
- select the desired character tab
- use `Scan All Tabs` if the desk needs a fresh attach
- start the bot from the active tab when the session is available

If a tab is marked busy, another Minibot desk currently owns that character claim. The tab stays visible but read-only.

Each tab exposes compact `HP`, `P`, and `WP` chips for health, nearby-player pressure, and live route position. `P -` means no players are currently visible to that character.

### 2. Manage Accounts

Open `Accounts` when you need the account registry. Account records are separate from character configs and route files. They can store login method, login name, local-file password, preferred character, character list, reconnect policy, and notes. Manual-login account records keep metadata only and do not persist a password.

### 3. Configure Hunt Controls And Presets

Open `Hunt Studio` or the `Hunt` card from the desk when you want the focused hunt workspace. Open `Route` or `Route Panel` when you want route editing with route-local hunt summaries and a deep link into Hunt Studio. Route save does not read hidden Hunt Studio controls; use the Hunt Studio save action to edit:

- target queue
- poll and retarget timing
- scan range and floor tolerance
- shared-spawn mode: `Attack All`, `Respect Others`, or `Watch Only`
- `Once` and `Dry Run`
- per-monster target profiles
- fallback combat motion rules
- monster archive, player watch, and nearby NPC watch

Registry details:

- `Nearby` loads visible monsters into the queue
- `Seen` loads the saved monster ledger for this character
- `Save` pushes the current visible monsters into that character-local ledger
- archive clear is a deliberate flow with confirm plus undo, not a one-click destructive action

Open `Presets` when you want official hunt seeds from the vendored Minibia data bundle. The presets browser can:

- filter by monster name, task, loot, or tags
- apply an official monster queue entry
- optionally seed the matching target profile with danger, spacing, and beam or wave avoidance hints

Save hunt-workspace changes before switching sessions if you want them persisted for the active route or character.

### 4. Build Or Load A Route

Open `Route`, `Route Panel`, or `Saved Files` to:

- load a saved route file
- rename the active route
- tune repath, record step, reconnect delay, and reconnect max
- set the route-local vocation override
- tune sustain cadence and the `Prefer Hotbar Consumables` flag
- toggle `Walk`, `Loop`, `Record`, `Show Waypoints`, `Reconnect`, and `Avoid Fields`
- add waypoints from the live position
- add `avoid` or `wait` tile rules from the live position
- edit waypoint type, jump action, radius, tile-rule shape, trigger, exactness, vicinity radius, waits, and cooldowns
- mark, batch-delete, insert-before, and reorder waypoint tiles without leaving the route builder
- quick-save the active route from the desk without leaving the main layout
- reset to the selected waypoint or return to waypoint `1`

Current route waypoint types include:

- `walk`
- `action`
- `node`
- `stand`
- `helper`
- `safe-zone`
- `avoid`
- `danger-zone`
- `exit-zone`
- `stairs-up`
- `stairs-down`
- `use-item`
- `bank`
- `shop`
- `npc-action`
- `daily-task`
- `ladder`
- `exani-tera`
- `rope`
- `shovel-hole`

`avoid` and `danger-zone` waypoints are no-go markers. The bot skips them in route order and avoids their SQMs for route movement and combat repositioning. `helper` waypoints are saved route entries used for blocked-route recovery and helper replay. Normal forward traversal skips them.

Floor-changing route steps should be explicit. Use `stairs-up`, `stairs-down`,
`rope`, `shovel-hole`, `ladder`, `use-item`, or `exani-tera` on the transition
SQM and keep a normal landing waypoint on the target floor within the next two
route steps. Runtime treats the first forward floor bridge as route progress:
if the character has already stair-hopped onto that bridge's target `z`, it
relatches to the landing segment before trying to walk back to the old floor.
If the first bridge ahead does not match the live `z`, floor recovery still uses
the nearest valid transition on the current floor to return to the intended
route floor. A transition waypoint completes only on the expected destination
floor, so a wrong-direction hop or extra-floor overshoot does not advance the
route.

This matches the public cavebot patterns checked during the 2026-04-30 pass:
ZeroBot documents that cavebot waypoints depend on their `z` position after
accidental falls/climbs and recommends well-defined Stand/Node anchors before
different-floor actions ([Getting Started](https://docs.zerobot.net/cavebot/getting_started/)).
Its waypoint reference separates walk/stand/node, rope, ladder, use, label, and
goto behavior ([Waypoint Types](https://docs.zerobot.net/cavebot/interface/waypoint_types/)).
OTClientBot's runtime API documents map-item use at `{x, y, z}` positions and
the live `Position.z` field, matching the runtime rule that floor transitions
must be confirmed by the destination floor rather than only by horizontal
movement ([OTClientBot docs](https://otclientbot.com/docs)).

`shop` waypoints use the Refill module: the route opens NPC dialogue, says the configured shop keyword, executes visible buy/sell/autosell work, then advances when no refill requests remain. Hidden refill-loop settings can branch from a hunt waypoint to a refill service waypoint when supplies are low; `refillRole: "start"` and `refillRole: "return"` can mark the service leg in route JSON. Hidden `refillPlan` settings can override vocation thresholds with desired shop counts, lower hunt minimums, buy caps, reserve gold, protected autosell names, sell lists, NPC names, shop keywords, depot branch selectors, and return waypoint selectors. If shop dialogue/trade retries are exhausted, or an active refill-loop bank or NPC service action fails, the cavebot pauses with the failure reason instead of retrying forever. `npc-action` waypoints can run progression actions such as travel, residence, blessings, or promotion through `progressionAction` or an ordered `steps` array. `daily-task` waypoints run task accept or reward dialogue and advance when the task step reports completion.

Named cavebot files are saved separately from character config. Saving the route updates the active cavebot JSON under `~/Minibot/cavebots`, and the per-character config keeps only the selected cavebot reference plus character-local state.

Because the route name becomes the JSON filename, keep route names filesystem-safe. Avoid `<>:"/\\|?*`, trailing spaces or periods, and reserved Windows names such as `CON` or `LPT1`.

Use `Export Pack` in Route Builder to write a versioned route pack for sharing
or cloning a hunt. A pack groups route, targeting, sustain, loot, refill,
banking, alarms, party, compatibility metadata, and notes. Character-local
ledgers, claims, secrets, active pauses, and runtime leases are excluded. Use
`Import Pack` to pick a pack file; Minibot shows the diff and route validation
report before `Apply Import` can replace the active route state. Newer pack
schemas open read-only with a migration warning.

Validate saved routes without rewriting them:

```bash
node scripts/validate-routes.mjs
```

Use `--path <file-or-dir>` to validate a specific route file or directory, and
`--json` for machine-readable output. High-risk validation errors block starting
an enabled route until the operator repeats the start action for the same
validation signature.

### 5. Manage Shared Modules

Use the left-rail cards and the shared module modal to configure:

- healer
- death heal
- trainer
- mana trainer
- auto eat
- ring and amulet auto replace
- rune maker
- spell caster
- auto light
- auto convert
- reconnect
- alarms
- looting
- banking
- follow chain
- anti-idle

Important behavior notes:

- rules run top to bottom
- disabled rules remain stored but do not fire
- death heal is a separate safety layer from the ordered healer rules
- healing runes and potions can be resolved from the hotbar or inventory; when
  they come from the hotbar, Minibot still uses them on the player instead of
  triggering the slot generically
- rules that carry a configured hotkey use that binding through the live
  client before falling back to their normal cast, hotbar, or inventory path
- trainer keeps emergency heal, escape, mana-trainer, anti-idle, and follow-chain context aligned for training sessions
- when follow chain owns movement, trainer can stay configured for inherited reconnect, food cadence, and anti-idle behavior from their owning modules while the trainer movement loop itself remains blocked
- looting uses keep lists, skip lists, and preferred container routing
- refill can combine vocation restock thresholds, hidden supply-plan desired/minimum counts, buy caps, reserve gold, configured sell requests, protected autosell items, and capacity-aware autosell planning while a trade window is open; hidden loop settings can branch to a service leg and pause failed service actions with the owner reason
- auto eat uses the selected food source from hotbar, equipment, or open containers before anti-idle pulses
- ring and amulet replacement can target explicit names or generic slot matches and will fall back to vendored item metadata when runtime labels are numeric or opaque
- reconnect uses disconnect-only retry windows and the real Minibia reconnect surface; death still blocks it
- alarms own low-HP, player, staff-like, and blacklist proximity thresholds instead of hiding that alert policy in the tab strip alone
- banking uses banker-name matching, deposit or withdraw operations, and safety gates
- follow chain uses an ordered character chain where each follower native-follows the name directly above it
- follow chain supports `Follow and fight` plus `Follow only`, with optional per-member tactical role overrides like `front-guard`, `assist-dps`, `sio-healer`, `party-buffer`, `rearguard`, and `scout`
- visible same-floor combat threats suspend native follow so each follower can target, fight, and then reform the chain
- anti-idle sends a guarded keepalive pulse after real gameplay inactivity crosses the configured delay

`Combat` and `Once` live in Hunt Studio, not in the shared module modal or Route Builder. `Field Safe`, `Session Waypoints`, `Cavebot Pause`, and `Rookiller` are quick controls on the desk.

### 6. Review Logs And Alerts

The `Console` panel shows recent activity. Use `Logs` for the longer log view.

Important alert behavior:

- session tabs can alarm for low HP, nearby players, staff-like conditions, and death
- the `Alarms` modal is where proximity thresholds and blacklist names are tuned
- the top-strip `P` chip rises from `P -` to `P <count>` when players are visible and follows the stronger staff alert styling when staff-like names are detected
- route reset beeps once the character reaches waypoint `1` and is ready for takeover
- route reset temporarily forces stand-style combat spacing, so chase or kite profiles do not drag the character away while returning
- route recovery avoids relatching to ambiguous repeated crossing tiles unless
  recent route continuity proves the intended branch
- multi-character route spacing uses live peer positions near the route before
  falling back to stored route indices, so followers do not park against stale
  peer progress
- reconnect automation only arms on real disconnects, not on death

### 7. Compact View

`Compact View` swaps the layout to a condensed board, but it does not create a second state model.

Use it when you want:

- the same route and module toggles in a narrower layout
- quick access to desk actions on smaller screens
- the same modals and route panel without the full three-column desk visible

## Commands

### Desktop

```bash
bb
```

Equivalent local script:

```bash
npm run desktop
```

### Data Refresh And Packaging

Refresh the vendored official Minibia data bundle:

```bash
npm run refresh:minibia-data
```

Packaging commands:

```bash
npm run pack
npm run dist
```

Platform-specific installer commands:

```bash
npm run dist:linux
npm run dist:win
npm run dist:mac
```

`npm run pack` is the fastest release smoke test because it produces the unpacked app directory without creating installers.

### Direct CLI Runner

```bash
node onscreen_monster_bot.mjs --monster Rotworm
```

Examples:

```bash
node onscreen_monster_bot.mjs --monster "Swamp Troll,Rat" --dry-run
node onscreen_monster_bot.mjs --monster "Swamp Troll" --monster Rat --once
node onscreen_monster_bot.mjs --port 9224 --url https://minibia.com/play --range-x 7 --range-y 5
```

Accepted flags:

- `--port`
- `--monster` or `--monsters`
- `--interval`
- `--retarget`
- `--range-x`
- `--range-y`
- `--floor`
- `--url`
- `--autowalk`
- `--once`
- `--dry-run`
- `--help`

This runner is intentionally narrow. Route editing, tile-rule management, session ownership, presets, and module editing remain desktop-first workflows.

### Route Recorder Helper

The repository also includes a same-floor route recorder helper:

```bash
node scripts/record-same-floor-route.mjs --character "Spells Of Regret" --route "Larvas 3"
```

Useful flags:

- `--character`
- `--route`
- `--max-minutes`
- `--poll-ms`
- `--move-timeout-ms`
- `--silent`

This script is an advanced route-capture helper, not the primary runtime.
It writes a `.knowledge.json` sidecar with recorder diagnostics, route
validation, excluded floor-change tiles, disconnected visible tiles, and
coverage warnings so the captured route can be edited from intent instead of
raw position spam.

## Portable Transfer Bundle

Build the transfer-ready `minibia/` bundle next to this repo:

```bash
npm run bundle:minibia
```

The generated layout is:

- `minibia/bot`: Minibot repo copy with dependencies
- `minibia/client`: Minibia client metadata plus the optional sanitized Chrome profile seed
- `minibia/bot/storage/home`: copied runtime config and cavebots, without stale claims, route-spacing leases, logs, or browser state
- `minibia/bot/storage/runtime`: generated browser and Electron profile state

Use the generated launchers from the bundle root:

- `./start-bot.sh`
- `./start-client.sh`
- `start-bot.cmd`
- `start-client.cmd`

Transfer checklist:

1. run `npm run bundle:minibia`
2. copy the generated `minibia/` directory to the target machine or USB drive
3. on the target machine, run `npm install` inside `minibia/bot` if
   `node_modules/` is absent
4. launch Minibot with the bundle-root bot launcher or `npm run desktop` inside
   `minibia/bot`
5. launch the Minibia client with the bundle-root client launcher when you want
   the managed portable client metadata path

The builder intentionally omits `.git`, `node_modules`, `dist`, `artifacts`,
stale claims, route-spacing leases, transient page configs, logs, browser cache,
and runtime lock files.

## Persistence Paths

Minibot writes runtime data outside the repository:

- global config: `~/.config/minibot/config.json`
- account registry: `~/.config/minibot/accounts/<accountId>.json`
- per-character config: `~/.config/minibot/characters/<profileKey>.json`
- claim files: `~/.config/minibot/claims/<profileKey>.json`
- route spacing leases: `~/.config/minibot/route-spacing/*`
- external-control discovery: `~/.config/minibot/control-socket.json`
- route pack exports: chosen by the operator, with default working storage under `~/.config/minibot/route-packs`
- route profiles: `~/Minibot/cavebots/<routeName>.json`

Claim files are treated as stale after a short heartbeat timeout and are cleaned up when the owning process is gone.

Portable mode exception:

- when the repo is inside `minibia/bot` with a sibling `minibia/client`, Minibot switches to portable paths
- in that layout, app config, account registry, and route state live under `minibia/bot/storage/home/...`
- generated browser and Electron profile state lives under ignored `minibia/bot/storage/runtime/...`
- `client/chrome-profile` is only an optional sanitized seed for managed client launches; `client/client-meta.json` is the source-controlled launch contract

## Route Profile Format

Current route profiles store the route name plus the full normalized route-local build snapshot for that hunt. That includes targeting, shared-spawn policy, route settings, sustain settings, shared module rules, waypoints, and tile rules. Character-local creature ledgers stay in the per-character config.

Example excerpt:

```json
{
  "name": "Larvas 3",
  "monsterNames": ["Larva"],
  "targetProfiles": [
    {
      "enabled": true,
      "name": "Larva",
      "priority": 108,
      "dangerLevel": 2,
      "keepDistanceMin": 0,
      "keepDistanceMax": 1,
      "finishBelowPercent": 10,
      "killMode": "normal",
      "behavior": "hold",
      "preferShootable": true,
      "stickToTarget": true,
      "avoidBeam": false,
      "avoidWave": false
    }
  ],
  "vocation": "paladin",
  "sustainEnabled": true,
  "sustainCooldownMs": 900,
  "preferHotbarConsumables": true,
  "lootingEnabled": true,
  "lootWhitelist": ["gold", "ammo", "potions", "food"],
  "bankingEnabled": true,
  "bankingRules": [
    {
      "enabled": true,
      "label": "deposit excess",
      "bankerNames": ["Augusto"],
      "operation": "deposit-excess",
      "amount": 0,
      "reserveGold": 3000,
      "recipient": "",
      "cooldownMs": 1400,
      "requireNoTargets": true,
      "requireStationary": true,
      "maxNpcDistance": 3
    }
  ],
  "waypoints": [
    {
      "x": 100,
      "y": 200,
      "z": 8,
      "type": "walk",
      "label": "Waypoint 001"
    },
    {
      "x": 104,
      "y": 201,
      "z": 8,
      "type": "bank",
      "label": "Waypoint 002"
    }
  ],
  "tileRules": [
    {
      "id": "tile-rule-001-wait-approach-104-201-8",
      "enabled": true,
      "label": "Tile Rule 001",
      "shape": "tile",
      "x": 104,
      "y": 201,
      "z": 8,
      "trigger": "approach",
      "policy": "wait",
      "priority": 100,
      "exactness": "exact",
      "vicinityRadius": 0,
      "waitMs": 1200,
      "cooldownMs": 0
    }
  ]
}
```

Current parser limits:

- tile-rule scope is currently `all` only
- tile-rule policies are currently `avoid` and `wait` only
- tile-rule triggers are currently `approach` and `enter` only

Do not treat backlog-only notes from [`todo.md`](../todo.md) as current runtime schema.

## Repository Files vs Runtime Files

The checked-in [`cavebots/`](../cavebots) directory is useful as workspace data and examples, but it is not the runtime persistence directory used by the app.

The live app reads and writes saved route profiles in `~/Minibot/cavebots`.

## Troubleshooting

### No Pages Discovered

Check:

- the browser was launched with `--remote-debugging-port`
- the configured port matches the browser port
- the open page URL starts with the configured Minibia page prefix

### Managed Session Launch Fails

Check:

- the browser exists in a known install path for your platform
- the Linux Minibia desktop app is installed if you expect Minibot to use that fallback
- `MINIBOT_BROWSER_PATH` points to the correct executable if auto-detection fails

### Character Shows As Busy

A claim file is active for that character in another Minibot process. Close the other process cleanly or wait for the claim heartbeat to expire if the process crashed.

### Reconnect Never Starts

Check:

- `Reconnect` is enabled in the route settings
- the live page shows the real Minibia reconnect overlay
- the character is disconnected rather than dead

### Route Name Refuses To Save

Check that the route name does not contain filesystem-invalid characters, trailing spaces or periods, or reserved Windows names such as `CON` or `LPT1`.

### Route Validation Blocks Start

Open Route Builder and review the validation summary. The affected waypoint row
is highlighted when the issue points to a specific waypoint. If the route is
intentionally risky, repeat the start action after reviewing the warning; a
config change creates a new validation signature and requires review again.

### Presets Modal Is Empty

Refresh the vendored Minibia data bundle:

```bash
npm run refresh:minibia-data
```

The presets browser depends on `data/minibia/current` and `data/minibia/vocations`.
The refresh keeps the latest source snapshot under `data/minibia/snapshots` and prunes older generated snapshots by default.

### Follow Chain Does Not Move

Check:

- `Follow Chain` is enabled
- the active character name exists in the configured follow chain
- the character is not the first name in the chain
- the configured follow distance and default or per-member role fit the current session

### Anti-Idle Does Nothing

Check:

- `Anti Idle` is enabled
- the configured delay is long enough to be reachable during your current route or module activity
- another utility is not continuously firing before the idle timer can mature
- cavebot pause and training targets do not disable anti-idle by themselves, so focus on cadence and recent module activity first
- if the direct client keepalive hook is unavailable, Minibot can still send the fallback Shift pulse through CDP

### Background Clients Stall

Check that the browser was launched with the always-active Chromium flags shown above. Without them, hidden windows can be throttled aggressively.

If this happens right after upgrading Minibot, fully close older Minibia or managed Chrome windows once so the dedicated Minibot profile restarts with the current launch flags. Manual attach sessions still require the flags in the launch command.
