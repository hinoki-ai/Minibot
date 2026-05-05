# Canonical Engineering Notes

This file records stable engineering truths. It is not a user guide and it is
not an open-work queue.

## Documentation Scope

`AGENTS.md` defines the canonical doc set. `todo.md` is the only canonical
open-work queue. Deleted audits, transfer notes, research files, and roadmap
documents do not define current behavior.

When documents disagree, follow the precedence in [`AGENTS.md`](./AGENTS.md).
Roadmap or backlog notes must never silently redefine the live parser, desktop
UI, action surface, module rule shape, or persistence schema.

## Repository Boundary

- The bundle root is a portable wrapper. It owns only the root README, launchers,
  desktop entry, client metadata/assets, bundle manifest, and the `bot/` source
  package.
- The `bot/` directory is the canonical source package. Application JavaScript,
  tests, docs, vendored Minibia data, route examples, packaging configuration,
  and maintenance scripts live there.
- Generated or machine-local state must stay out of tracked source paths unless
  it is an intentional portable seed under `bot/storage/home`. Runtime browser
  state, Electron user data, account secrets, active claims, route-spacing
  leases, logs, build output, and dependency installs are ignored.
- `npm run check:structure` is the executable guard for this boundary and should
  pass before structural changes are considered complete.

## Product Invariants

- The Electron desktop app is the canonical interface.
- The external-control socket is a local agent interface owned by the Electron
  main process; it must reuse live sessions, claims, persistence, and shared
  action dispatch rather than becoming a separate bot runtime.
- The direct CLI runner is a narrow secondary target-only surface.
- Minibot controls a live browser page through Chrome DevTools Protocol. It
  does not embed, emulate, or replace the Minibia client.
- One discovered Minibia page maps to one Minibot session.
- One character can be actively controlled by only one Minibot desk at a time;
  claim files enforce that across processes.

## Testing Invariants

- Live validation is the first proof for runtime, session, interaction, movement,
  combat, persistence, and UI changes whenever a live Minibia session is
  available and safe to exercise.
- `npm test` is live-first: it attempts the live gate when live character tabs
  are present, skips only that gate when none are available, and then runs the
  smoke lane.
- `npm run test:live` is the strict canonical live validation gate. It attaches
  to discovered live character tabs through CDP, captures real normalized state,
  and validates that live snapshots are ready, named, positioned, and tied to the
  expected character.
- `npm run test:live:smoke` runs the strict live gate first, then the smoke lane.
  Use direct synthetic lanes only when the live gate is unavailable, unsafe, or
  the change is purely deterministic.
- Mocked, fake-user, fixture-only, and synthetic tests are regression coverage.
  They must not be presented as the only proof for behavior that depends on the
  real Minibia client, browser DOM, CDP transport, or in-memory game state unless
  the live path is impossible or unsafe and that reason is stated.
- Live validation must be read-only unless the operator deliberately chooses a
  mutating probe. It must not close sessions, kill clients, send visible input,
  or change combat-critical state as part of the default gate.

## Data Invariants

- Official Minibia data is vendored under [`data/minibia/`](./data/minibia).
- Bot ticks must not fetch official site data live.
- Vocation packs and hunt presets derive from the vendored data bundle.
- Creature ledgers are character-local, capped, and split into `monsters`,
  `players`, and `npcs`.
- Saved route files must not persist character-local ledgers.

## UI Invariants

- Each feature gets one canonical editor surface.
- Quick toggles, compact cards, summary widgets, and previews are mirrors or
  entry points, not alternate configuration systems.
- Compact view mirrors the same state and actions as the full desk.
- Character tabs are operator-ordered and must keep that order across discovery
  refreshes.
- Session tabs surface the strongest alert state plus compact `HP`, `P`, and
  `WP` chips.
- Background refreshes must not clobber focused user edits.
- Busy claimed sessions remain visible but read-only.
- Destructive route and archive flows require confirmation, undo, or an
  equivalent deliberate step.

## Route Invariants

- `waypoints` are the route spine.
- `tileRules` are a separate spatial rule layer and must not be collapsed into
  waypoint `type`.
- Existing routes must load when `tileRules` is empty or omitted.
- Route profiles are full route-local build snapshots. Character config keeps
  the selected route reference plus local-only state.
- Checked-in [`cavebots/`](./cavebots) are workspace data. Runtime profiles are
  saved under `~/Minibot/cavebots` or the portable storage equivalent.

Current waypoint types:

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

Current waypoint actions are `restart` and `goto`.

`node` waypoints default to radius `2`, meaning the checkpoint is reached from
any SQM in the 5x5 square centered on the marker. A waypoint-local `radius`
overrides that default.

`avoid` and `danger-zone` waypoints are hard no-go markers. They are skipped
as route spine entries and their coordinates are forbidden for route movement
and combat repositioning.

Current tile-rule values:

- shapes: `tile`, `rect`
- triggers: `approach`, `enter`
- policies: `avoid`, `wait`
- exactness: `exact`, `vicinity`
- scope mode: `all`

Do not document backlog-only route fields as current runtime schema.

## Targeting Invariants

- Monster queue, target profiles, fallback combat motion, shared-spawn mode, and
  creature-registry surfaces are route-local hunt state.
- Shared-spawn modes are `attack-all`, `respect-others`, and `watch-only`.
- The dedicated Hunt Studio modal is the focused hunt editor. Route-builder hunt
  controls must stay synchronized with the same saved state.

## Module Invariants

- Combat and utility modules evaluate ordered rules, not one flat field per
  module.
- Disabled rules remain persisted but never fire.
- Empty rule rows normalize to safe defaults and are skipped.
- Sustain runs before the legacy healer path when a vocation profile is
  available.
- Healer rules run top to bottom. The emergency threshold raises healing
  priority only; it must not reorder rules.
- Healer coverage is downward-safe: the first active heal covers `0%` HP, and
  later tiers fill lower uncovered bands beneath their configured minimums.
- Death heal, trainer escape, auto eat, and anti-idle are shared utility layers
  with their own thresholds and cooldown gates.
- Auto eat can source food from hotbar, equipment, or open containers and should
  fire before anti-idle when both are due.
- Hotbar-backed consumable actions must preserve their intended target. A
  self-heal rune or potion resolved from a hotbar slot must use the item on the
  player, not activate the slot as a generic action.
- Ring and amulet replacement are separate inventory utilities that may match
  explicit names, generic slot requests, or vendored item metadata.
- Looting uses keep lists, skip lists, and preferred container routing rather
  than one-off corpse scripts.
- Team Hunt is the visible owner for route sync and ordered roles. The runtime
  still uses `partyFollow*` keys for compatibility, and old Follow Chain entry
  points must alias to the Team Hunt modal. When `teamEnabled` is true and
  `partyFollowMembers` has at least two names, the ordered follow train is
  active even if `partyFollowEnabled` is false. Multiple independent chains may
  run at once. Slot 1 leads; each later member follows the name directly above
  it.
- Team Hunt members may be live tabs, seen players, or manual player names.
- Team Hunt supports `follow-and-fight` and `follow-only` plus per-member
  tactical roles such as `front-guard`, `assist-dps`, `sio-healer`,
  `party-buffer`, `rearguard`, and `scout`.

## Runtime Invariants

- Reconnect automation is disconnect-only and must not auto-reconnect from the
  death modal path.
- Manual and automatic reconnect both depend on the real Minibia reconnect UI or
  exposed client reconnect hook being present.
- The renderer talks to the main process only through `window.bbApi`.
- Runtime behavior belongs in `lib/`, not DOM event handlers.
- Session and client shutdown is combat-sensitive. `Close Session`, `Close
  Client`, external-control close calls, and automatic live-tab teardown must be
  blocked when the target session has a current target, combat hold, runtime
  combat candidates, or a visible attacker targeting the character.
- Shared action features should converge on [`lib/action-router.mjs`](./lib/action-router.mjs)
  and return normalized `{ ok, driver, reason, details }` results.
- Named route profiles are stored outside the repo under `~/Minibot/cavebots`
  unless portable mode redirects them to `storage/home/Minibot/cavebots`.
- Portable transfer bundles sanitize Chromium profile state and local account
  secrets. Browser cache, history, saved-password databases, stale locks, and
  `local-file` account passwords are not canonical transfer state; explicit
  `portable-file` account secrets may remain portable by design.
- External-control requests use top-level `id` only as the request/response
  correlation value. Session selection should be documented and sent as
  `params.sessionId`.

## Live Movement Notes

- Direct pathfinder calls can report failure while still mutating the final
  destination when Minibia internals differ from the expected `Position`
  constructor.
- Arrow-key movement through CDP works, but it is too granular for reliable
  cavebot routing.
- For same-floor cavebot and Team Hunt recovery movement inside the visible
  game area, prefer viewport tile clicks from the live player anchor.
- Safe same-floor routes should use nearby checkpoints around holes rather than
  floor-change waypoint types unless the route intentionally changes floors.
- Short checkpoint spacing, `radius: 1`, and a lower `walkRepathMs` such as
  `300` reduce false stalls on blocked tiles.
- Route recovery must not relatch to a repeated crossing coordinate unless
  recent route continuity, local adjacency, or bridge touches disambiguate the
  intended index.
- A recent accepted route glide is explicit progress evidence for its plain
  walk/node/safe-zone segment. If live snapshots reach or closely pass an
  intermediate glide waypoint, recovery advances past that intermediate point
  instead of forcing the character to walk back over skipped SQMs.
- When a stale route index is on the wrong floor after a floor change, route
  recovery first tries to relatch to a plausible same-floor waypoint using the
  normal route disambiguation gates, then falls back to a stair, ladder, or tool
  waypoint that moves back toward the intended floor.
- Floor-change waypoints only count as reached after landing on their expected
  destination floor; overshooting farther in the same z direction must not
  advance the route.
- Visible floor-transition hazards, including stairs, ramps, ladders, and holes,
  are one unified 3x3 danger area centered on the transition SQM. Route movement
  should only switch to cautious visible steps when the player or destination is
  near that bounded area; combat movement must not choose tiles inside it, except
  for the explicit one-step escape used to leave the center transition SQM.
- Multi-character route spacing should prefer a peer's live route position when
  it is near the waypoint spine, falling back to stored spacing indices only
  when live position is unavailable or implausible.
- Multi-character loop spacing targets a large loose gap, not a perfect split.
  For two sessions on the same looping cavebot, one session should park long
  enough to avoid overlap and crowding, then release before the peer reaches the
  exact opposite half. If both sessions are tied on the same waypoint, only the
  higher-priority lease opens the split and the other waits.
- A route-spacing hold should act like soft repulsion, not a long hard stall:
  when the local gap is still cramped and a previous route tile is visibly
  reachable, the held session may click a bounded backward route step, then let
  normal route spacing resume.
