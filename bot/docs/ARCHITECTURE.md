# Architecture

This document describes the current Minibot runtime shape. For setup and
operator workflows, use [`docs/OPERATIONS.md`](./OPERATIONS.md). For
control-surface behavior, use [`docs/UI_UX.md`](./UI_UX.md). For the normalized
module-facing Minibia snapshot, use
[`docs/MINIBIA_RUNTIME_SURFACE.md`](./MINIBIA_RUNTIME_SURFACE.md).

## System Summary

Minibot is a local Electron and Node application that controls a live Minibia browser page through Chrome DevTools Protocol.

At a high level:

1. the desktop app discovers pages exposed on a DevTools port
2. it inspects each page to decide whether it is a live Minibia session
3. it binds a selected page into a Minibot session
4. it evaluates game-facing expressions inside that page
5. it runs targeting, movement, sustain, looting, banking, and utility decisions locally in Node
6. it persists config, claim, route, and route-spacing data under the user home directory

The core runtime lives in [`lib/bot-core.mjs`](../lib/bot-core.mjs). The desktop app is a control shell around that runtime.

## Process Breakdown

### Launch Layer

- [`bb.mjs`](../bb.mjs): desktop launcher
- [`onscreen_monster_bot.mjs`](../onscreen_monster_bot.mjs): narrow CLI runner

### Electron Desktop Layer

- [`desktop/main.mjs`](../desktop/main.mjs): window lifecycle, privileged app protocol setup, discovery loop, session ownership, IPC, persistence coordination, sleep blocking, and managed browser launch
- [`desktop/app-protocol.mjs`](../desktop/app-protocol.mjs): trusted `app://-/...` asset serving for the packaged renderer
- [`desktop/preload.mjs`](../desktop/preload.mjs) and [`desktop/preload.cjs`](../desktop/preload.cjs): preload bridge exposing `window.bbApi`
- [`desktop/renderer.js`](../desktop/renderer.js): desk rendering, dedicated Hunt Studio modal, route builder, route-library quick picker, quick controls, compact-view mirroring, editor drafts, and interaction wiring
- [`desktop/power-save-blocker.mjs`](../desktop/power-save-blocker.mjs): system sleep coordination while active sessions are running
- [`desktop/linux-integration.mjs`](../desktop/linux-integration.mjs): Linux desktop entry and icon resolution

The desktop app is the canonical control surface. It supports multiple live characters at once and keeps them isolated in separate session tabs.

### Bot Runtime Layer

[`lib/bot-core.mjs`](../lib/bot-core.mjs) owns:

- option defaults and normalization
- target profile normalization
- route waypoint and tile-rule normalization
- Chrome DevTools transport and page inspection
- raw live snapshot extraction from the Minibia page
- reconnect, death, and claim-sensitive session lifecycle handling
- target selection and combat sequencing
- autowalk, route resync, ambiguous-crossing recovery, route reset,
  follow-chain movement, route-spacing coordination, and tile-rule evaluation
- sustain, legacy healer, looting, banking, equipment replacement, and utility module dispatch
- overlay rendering for waypoint visualization inside the live page

The raw tick snapshot in `bot-core` is richer than the normalized module-facing snapshot. It already probes areas such as nearby NPCs and PvP state. Shared modules that need stable contracts should still prefer [`lib/minibia-snapshot.mjs`](../lib/minibia-snapshot.mjs) where possible.

### Shared Action And Module Layer

Shared action infrastructure:

- [`lib/action-primitives.mjs`](../lib/action-primitives.mjs): page-evaluated helpers for hotbar, inventory, item use, and NPC interactions
- [`lib/action-router.mjs`](../lib/action-router.mjs): normalized action dispatch and result shaping
- [`lib/capability-probe.mjs`](../lib/capability-probe.mjs): runtime capability checks for the shared action surface

Shared gameplay modules:

- [`lib/modules/sustain.mjs`](../lib/modules/sustain.mjs): vocation-aware sustain planning
- [`lib/modules/looter.mjs`](../lib/modules/looter.mjs): corpse filtering and container-routing plans
- [`lib/modules/equipment-replace.mjs`](../lib/modules/equipment-replace.mjs): ring and amulet replacement planning from live inventory state
- [`lib/modules/banker.mjs`](../lib/modules/banker.mjs): banking rule normalization and dialogue-state machine
- [`lib/modules/shopper.mjs`](../lib/modules/shopper.mjs): normalized buy, sell, and sell-all planning
- [`lib/modules/refill.mjs`](../lib/modules/refill.mjs): refill request planning from vocation policy and supply counts
- [`lib/modules/npc-dialogue.mjs`](../lib/modules/npc-dialogue.mjs): recent dialogue parsing and bank-balance extraction
- [`lib/modules/auto-eat.mjs`](../lib/modules/auto-eat.mjs), [`lib/modules/hotbar.mjs`](../lib/modules/hotbar.mjs), [`lib/modules/consumables.mjs`](../lib/modules/consumables.mjs), [`lib/modules/ammo.mjs`](../lib/modules/ammo.mjs), [`lib/modules/inventory.mjs`](../lib/modules/inventory.mjs), [`lib/modules/container-routing.mjs`](../lib/modules/container-routing.mjs), and [`lib/modules/economy.mjs`](../lib/modules/economy.mjs): shared support layers used by the higher-level modules

Per-module ownership, rule shapes, exports, action types, and primary tests live
in [`docs/MODULES.md`](./MODULES.md).

### Data Layer

- [`lib/minibia-data.mjs`](../lib/minibia-data.mjs): load and refresh helpers for vendored official Minibia data
- [`lib/minibia-item-metadata.mjs`](../lib/minibia-item-metadata.mjs): vendored item-name and slot-type fallback resolution for runtime item labels
- [`lib/vocation-pack.mjs`](../lib/vocation-pack.mjs): vocation profile generation from the vendored spell packs
- [`lib/hunt-presets.mjs`](../lib/hunt-presets.mjs): official hunt preset generation from monsters and achievements
- [`data/minibia/current/`](../data/minibia/current): normalized current spells, monsters, NPCs, items, runes, achievements, and server documents
- [`data/minibia/vocations/`](../data/minibia/vocations): vendored vocation packs
- [`data/minibia/snapshots/`](../data/minibia/snapshots): latest retained timestamped source snapshot

### Persistence Layer

[`lib/config-store.mjs`](../lib/config-store.mjs) owns:

- global config load and save
- per-character config load and save
- route profile load, list, save, rename, and delete
- live claim files used to prevent double control across Minibot desks
- route-spacing leases used to keep multiple characters on the same route from collapsing into each other

### Managed Browser Layer

[`lib/browser-session.mjs`](../lib/browser-session.mjs) resolves browser executables from:

- `MINIBOT_BROWSER_PATH`
- `CHROME_BIN`
- `GOOGLE_CHROME_BIN`
- `BROWSER`

If those are unset, it falls back to common Chrome, Chromium, Brave, and Edge install paths on Linux, Windows, and macOS. On Linux, an installed Minibia desktop-app launcher is preferred over auto-detected browser binaries so `New Session` opens the app window instead of a plain browser URL tab.

The managed launcher builds a detached launch spec with DevTools, managed-profile, and background-hygiene Chromium flags, then waits for the new session to appear on the configured DevTools port. The heavier always-active background flags are opt-in through `MINIBOT_KEEP_BROWSER_BACKGROUND_ACTIVE=1`.

## Runtime Flow

### Boot

1. Electron starts and loads the default global config.
2. The main process registers the trusted `app://-/...` protocol.
3. The main process opens the desktop window and loads the renderer.
4. Discovery and session-sync loops start polling the configured DevTools port.

### Discovery And Session Binding

1. discovered pages are inspected for Minibia-specific state
2. each qualifying page is normalized into an instance record
3. the main process maps that instance onto a session object
4. claim status is resolved per character so busy sessions can be shown as read-only
5. one session becomes active in the renderer

### Active Tick Loop

`MinibiaTargetBot.tick()` currently runs in roughly this order:

1. refresh the live snapshot
2. classify reconnect and death state
3. resolve the active vocation profile
4. run vocation-aware sustain before falling back to the legacy healer path
5. handle paused cavebot state and rookiller cutoffs
6. run utility modules such as death heal, trainer escape, auto eat, ring and amulet replacement, light, mana trainer, rune maker, and urgent coin handling
7. loot opened corpse containers before route movement
8. process pending route actions, including bank, helper recovery, and interaction waypoints
9. choose or clear combat targets, distance-keeper repositioning, offensive spell casting, shared-spawn policy, and follow-chain motion
10. record tick timing and serialize live state, logs, and summaries back to the renderer

That ordering matters. The tests intentionally lock in sustain-before-healer and looting-before-route behavior.

## Session Model

Each session owns:

- a page binding and identity record
- a `profileKey` used for config and claim files
- a normalized config snapshot
- a `MinibiaTargetBot` instance
- live logs and the last known raw snapshot
- lightweight runtime timing samples for the tick hot path
- route-profile metadata for the renderer

The main process keeps sessions in memory and refreshes them as page discovery changes. A session can remain visible even when the live page is detached so the operator can understand what happened.

## Data Model

### Config Layers

Minibot combines these persistence layers:

- global config: `~/.config/minibot/config.json`
- account registry: `~/.config/minibot/accounts/<accountId>.json`
- per-character overrides: `~/.config/minibot/characters/<profileKey>.json`
- claim files: `~/.config/minibot/claims/<profileKey>.json`
- route spacing leases: `~/.config/minibot/route-spacing/*`
- route profiles: `~/Minibot/cavebots/<routeName>.json`

Route names are persisted as filenames. Keep them filesystem-safe so the same saved route works on Linux, Windows, and macOS.

Route data is intentionally separate from character config:

- character config keeps local-only state such as seen creature ledgers, pause state, and selected route reference
- account records keep login method, stored secret, preferred character, reconnect policy, and multi-character ownership outside route or character files
- route JSON stores the full route-local build snapshot for that hunt, including targeting, shared-spawn policy, route settings, sustain, looting, banking, and shared module rules

### Claims

Claim files live in `~/.config/minibot/claims/<profileKey>.json`.

They contain process ownership metadata so another desk can detect that a character is already active elsewhere. Claims are treated as stale after a heartbeat timeout and are cleaned up when the owning process is gone.

### Route Assets

Routes are waypoint-centric.

- `waypoints` define route progression, reset anchors, and interactions
- `tileRules` define local movement or safety behavior without replacing the waypoint spine

Current supported waypoint types:

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

`avoid` and `danger-zone` waypoints are hard no-go coordinates: normal forward traversal skips them, and route or combat movement must not choose those SQMs as destinations. Helper waypoints are part of the saved schema, but normal forward traversal skips them unless blocked-route recovery or helper replay is active. Repeated route coordinates are treated as ambiguous crossings during recovery until local adjacency, recent confirmed route touches, or bridge evidence identifies the intended branch.

Current supported waypoint actions:

- `restart`
- `goto`

Current supported tile-rule values in code:

- shapes: `tile`, `rect`
- triggers: `approach`, `enter`
- policies: `avoid`, `wait`
- exactness: `exact`, `vicinity`
- scope mode: `all`

This is intentionally narrower than future backlog ideas in [`todo.md`](../todo.md).

## Browser Coupling

Minibot works against Minibia internals rather than a public API. Current integration points include:

- `window.gameClient.world.activeCreatures` for visible creature state
- `world.targetMonster(...)` for target selection
- `world.pathfinder.findPath(...)` and viewport tile clicks for route movement
- live hotbar, inventory, and dialogue managers for shared action execution,
  including target-aware use of item-backed hotbar slots
- Chrome DevTools keyboard dispatch for configured rule hotkeys
- Chrome DevTools input dispatch for mouse interaction and fallback keyboard
  paths
- in-page helpers for spell casting and currency conversion

That means behavioral assumptions are runtime-coupled and should be treated as fragile integration points.

## UI Boundary

The renderer talks to the main process only through `window.bbApi`.

The IPC surface covers:

- state fetch and refresh
- session selection, launch, close, view-mode, and run toggles
- config updates
- hunt-workspace target queue, target profile, registry, shared-spawn, and preset updates across the Hunt Studio and route builder surfaces
- route load, save, delete, and reset
- waypoint add, update, move, and remove
- tile-rule add, update, move, and remove
- session waypoint overlay visibility
- focus and desktop window controls

The renderer should stay presentation-oriented. Runtime behavior belongs in `lib/`.

## Testing Surface

The test suite currently covers:

- bot-core behavior, route logic, reconnect handling, and tick ordering
- config-store persistence, route profiles, claims, and route-spacing leases
- browser-session executable resolution and launch behavior
- desktop renderer interactions, accessibility, compact-view mirroring, modal flows, and Hunt Studio plus route-builder behavior
- app protocol and power-save behavior
- shared action layer and capability probing
- normalized snapshot extraction
- vendored data refresh and vocation pack generation
- hunt preset generation
- sustain, looting, banking, equipment replacement, refill, and shopping helpers

Run the full suite with:

```bash
npm test
```
