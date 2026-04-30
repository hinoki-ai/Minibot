created_at: 2026-04-29T21:54:12-04:00
expires_at: 2026-04-30T21:54:12-04:00
timezone: America/Santiago
reason: Master temporary PRD consolidating historical Tibia bot research, best-bot feature index, and Minibot product requirements requested by operator.

# Master Tibia Bot Research Index And Minibot PRD

This is the merged scratch PRD for Tibia bot feature research. It consolidates
the earlier `tibia-bot-index-prd.md` and `tibia-bot-research-prd.md` working
notes into one product document.

This document is not canonical. It does not redefine live Minibot behavior,
route schema, module contracts, UI contracts, or persistence. If any requirement
below becomes durable, fold it into the owning canonical doc listed in
`AGENTS.md`; put only undone implementation work in `todo.md`.

## Scope

Research target:

- Historical bots: Tibia Auto, BlackD Proxy, TibiaBot NG, ElfBot NG, NeoBot,
  MageBot, iBot, WindBot, XenoBot, BBot, RedBot.
- Modern OTClient/OTS bots: vBot, OTClient Bot, nExBot, ZeroBot, Shrouded Bot,
  R-BOT, and adjacent modern private-server automation patterns.
- Product target: Minibot for the controlled Minibia runtime in this repo.

The purpose is to extract product patterns: reliable routing, visible decision
logic, route profiles, safe module orchestration, reusable presets, and operator
analytics. It is not a plan to reproduce client tampering, packet manipulation,
official Tibia cheating, anti-cheat bypass, staff evasion, or PvP grief tooling.

## Guardrails

- Build for Minibia-owned sessions, local testing, and private-server contexts
  where automation is explicitly allowed.
- Do not automate official Tibia servers.
- Do not add memory injection, packet hooks, packet logging, process injection,
  speed hacks, wall/floor spy, hidden-client inspection, stealth, hardware
  evasion, anti-cheat bypass, GM/staff evasion, or "look human" randomization
  whose purpose is detection avoidance.
- Treat historical "logout on GM/player" and "anti-ban" features as alerting,
  pause, operator visibility, and compliance warnings only.
- Do not download, run, redistribute, or vendor third-party bot binaries.
- Keep action execution inside existing Minibia primitives:
  `lib/action-router.mjs`, `lib/action-primitives.mjs`, normalized snapshots,
  and browser-page control already documented by the repo.
- Every automated action needs an owner, reason code, cooldown, failure mode,
  and visible operator state.

## Research Notes

Official Tibia treats bots and macros as rule violations. TibiaWiki summarizes
bots as unofficial programs that control a character and warns of banishment or
account deletion. CipSoft announced BattlEye integration for Tibia on
March 21, 2017. The safe product boundary for this repo is therefore Minibia
and explicitly allowed private environments only.

Historical bots converged on the same architecture:

1. A durable world model: self state, creatures, tiles, containers, hotbar,
   messages, NPC/trade state, party, route progress, and alarms.
2. A route engine: waypoint recording, typed waypoint actions, floor changes,
   special areas, luring, blocked-tile handling, stuck recovery, and loops.
3. A combat engine: target profiles, target scoring, stance selection, distance
   rules, AoE rune/spell selection, and respect-player policy.
4. A sustain engine: ordered healing rules, potion rules, condition cures, mana
   windows, emergency fallback, and friend/party healing.
5. A loot/economy engine: corpse open policy, item filters, destination
   containers, rare alerts, value tracking, bank/shop/deposit/refill loops.
6. A scripting or recipe layer: enough power for advanced users without forcing
   normal users to script common hunts.
7. A multi-client layer: claims, leader/follower coordination, shared spawn
   rules, party roles, and logs that make many clients manageable.
8. Operator-grade UX: profile management, route library, live overlays, alarms,
   summaries, debug visibility, and fast pause/resume controls.

Minibot already has many of these pieces: Electron desk, multi-session claims,
route profiles, route recorder, Hunt Studio, sustain/healer families, looting,
banking, refill, follow chain, trainer, anti-idle, reconnect, alarms, vendored
Minibia data, vocation packs, and CDP-backed action primitives. The biggest
gaps are deeper world-model confidence, explicit route/progression
orchestration, better analytics, reusable profile libraries, and a constrained
recipe layer.

## Best Bot Index

### Tier 1: Architectural References

| Bot | Era / target | Useful product ideas | Exclude from Minibot |
| --- | --- | --- | --- |
| Tibia Auto | Early open-source all-in-one bot | Cavebot, runemaker, creature info, spell casting, auto healing; useful as the baseline "one world model feeds all modules" reference | Official-client automation and plugin-style client manipulation |
| BlackD Proxy | Early proxy/tool suite, old Tibia clients through 11.11 per project page | Cavebot, runemaker, trainer, fishing, healing, fluid drinker, autoresponder, alerts, relog, commands, position tools; useful command/event vocabulary | Proxying, packet logging, floor hack, invisible-creature display, staff evasion, anti-ban behavior |
| TibiaBot NG | Classic NGSoft bot | Multi-level cavebot, rope/hole/stair use, looting, auto healing, mana drinker, rune maker, mana trainer, alerts, macro recorder, hotkeys, relog, player info display | Floor/wall spy, client modification, GM/player logout evasion, combo PvP automation |
| ElfBot NG | Warbot evolved into cavebot | Advanced healing, hotkeys, on-screen displays, smart movement, advanced monster targeting, clickable icons, waypoint actions, luring, AoE and category targeting | War aimbot framing, anti-bot workarounds, staff/detection scripts |
| NeoBot | External-control successor around 2011 | Mouse/keyboard style action model, profiles, import/export, healer, cavebot, targeting, HUD, alarms, pausebot, navigation, autoconnect, script libraries | "Undetectable" marketing, official-client abuse, player/GM disconnect behavior |
| MageBot | Classic mage/PvP-heavy bot | Built-in cavebot scripts, script creation, lootbagging, mana-fluid recharge, cavebot modes, looter, autohealer, alerts, loot sorter/seller, gold changer, team remote control, runemaker | Speedhack, magebomb, PvP autofire/trapper, level spy, camouflage |
| iBot | Lua-heavy 2012-era bot | Healer, refiller, target, cavebot, friend healer, looting, Lua API over self/client/waypoints/creatures/tiles/containers/messages | Official-client automation and unsafe scripting with broad client access |
| WindBot | Post-NeoBot commercial bot | Rule-based healer families, waypoint tabs, special areas, action waypoints, Lua scripts, user options, item database, auto loot lists, supplies, loot counter, smart targeting, target profiles, HUDs, navigation/player relations | Official-client automation and detection-oriented externalization |
| XenoBot | Profile/HUD-heavy bot | Profile save/load by subsystem, Lua API classes, HUD analytics, recent loot, spell timers, kill counters, special areas for walker/targeter/looter, alarms, targeting priority/stance/count/proximity | Injection/admin guidance and official-client automation |
| BBot | Long-running all-in-one bot | Basic/protector/trade/friend-healer/healer/mana/re-user/trainer/killer/cavebot/looter/macros, route Learn recorder, floor-change detection, rope/shovel globals, player/field/furniture movement policies, smart loot modes, rare alarms, separate loot, depositable/dropable flags | War tooling and official-server automation |
| RedBot | Free/public bot family | Healer, mana restore, auto spells, condition/buff tools, fishing, mana trainer, cavebot action set, targeting, looting | Official-server automation and anti-ban framing |

### Tier 2: Modern OTClient / OTS References

| Bot | Target | Useful product ideas | Exclude from Minibot |
| --- | --- | --- | --- |
| vBot | OTClient/private-server ecosystem | Waypoints, actions, depositor, supply check, bank, travel, doors, lure, tasker, auto recording of walking/teleports/doors/stairs | Any server-disallowed automation |
| OTClient Bot | OTClient | Spell/item/condition healer tabs, configurable alerts, targeting profiles by vocation/level, target priorities, waypoint tabs/labels, Lua scripts, looting destinations, open-next-backpack | Force logout as evasion, arbitrary unsafe scripts |
| nExBot | OTClientV8/OpenTibiaBR | Unified TargetBot, CaveBot, HealBot, AttackBot, Hunt Analyzer, safety systems, target scoring, floor-change handling, field navigation, stuck recovery, analytics | Anti-cheat claims or third-party bypass work |
| ZeroBot | Modern Tibia/OTS bot | Healing priority, heal friend, condition renewals, targeting modes, magic shooter, cavebot auto recorder, debug HUD, equipment switching, helper utilities | Client interception details, PvP automation, hidden/evasion features |
| Shrouded Bot | Open Tibia servers | Hunting, looting, runemaking, healing, Lua scripting, waypoint recording, advanced hotkeys, party navigation, smart AoE runes | Stealth/detectability posture |
| R-BOT | Modern remote-control product | Web waypoints creator, remote dashboard, message management, multiple walking methods, Lua route scripts, best-rune tile selection | Hardware/evasion claims, remote stealth, AI auto-replies for evasion |

### Honorable Mentions / Lower Confidence

| Bot / family | Why it matters |
| --- | --- |
| Naver Bot and generic modern private products | Repeatedly advertise cavebot, healer, targeter, looter, and spells; useful only as confirmation that the core module set is still expected. |
| Pixel/macro bots after BattlEye | Useful as evidence that modern official-server botting shifted toward screen/input automation, but not a model for Minibot. |
| Discord/community bots such as CharmsBot/NabBot/Violent Bot | Not gameplay automation; useful for analytics, character management, loot split, charm/hunt optimization, and guild utility ideas. |

## Feature Matrix

Legend:

- `Core`: expected in a serious all-in-one Minibia automation desk.
- `Advanced`: differentiator for expert users, route authors, or multi-client
  operation.
- `Avoid`: historical feature must not be implemented in Minibot.

| Feature family | Historical evidence | Minibot requirement | Priority |
| --- | --- | --- | --- |
| World snapshot | Tibia Auto creature info; iBot/XenoBot Lua APIs; OTClient Bot options; nExBot unified systems | Normalize self, creatures, tiles, inventory, containers, NPC/trade, messages, route, and party with confidence/staleness | Core |
| Cavebot pathing | NG multi-level cavebot; ElfBot/NeoBot waypoints; WindBot waypoint tabs; BBot Learn; vBot auto recording; ZeroBot cavebot | Typed waypoint state machine with route validation, floor assertions, tool use, helper recovery, route preview | Core |
| Route recording | BBot Learn; vBot auto recorder; Shrouded waypoint recording; ZeroBot auto recorder | Record walks, floor transitions, tool use, NPC/shop/bank hints, corpse pauses, safe zones, route annotations | Core |
| Special areas / tile rules | WindBot special areas; XenoBot walker/targeter/looter areas; BBot special SQMs; ElfBot blocked tiles | One tile-rule layer for route, target movement, looting, AoE, wait, avoid, danger, safe zone | Core |
| Stuck recovery | Modern nExBot/ZeroBot emphasis; historical trap alerts | Structured stuck taxonomy, retry policy, helper pathing, skip policy, operator alert severity | Core |
| Target scoring | ElfBot targeting order/count; XenoBot priority/stance/count/proximity; OTClient Bot priorities; nExBot scoring | Transparent target scoring from profile order, danger, proximity, HP, count, ownership, route role | Core |
| Target stances | ElfBot smart movement; XenoBot stance; WindBot approach/keep away/lure; ZeroBot stand/chase/distance/diagonal | Per-target stance: hold, chase, approach, kite, diagonal, lure, assist, escape | Core |
| AoE solver | ElfBot category/AoE logic; WindBot categories; Shrouded smart AoE runes; nExBot AoE optimization | Safe rune/spell/tile/direction solver with player-safe policy, no-aoe zones, cooldowns, mana, line of sight | Advanced |
| Healing/sustain | WindBot healer families; NeoBot ordered rules; BBot priority tree; ZeroBot priorities | Ordered self spell/rune/potion/condition/friend-heal rules, emergency floor, hysteresis, cooldown gates | Core |
| Condition/buff manager | WindBot condition healer; ZeroBot condition renewals; RedBot anti-paralyze/mana shield | Only fire when snapshot truthfully detects condition; otherwise report unknown | Core |
| Rune maker / trainer | Tibia Auto, NG, MageBot, BBot, Shrouded | Separate training/runemaking modes with mana/soul/resource windows, safety pause, supply accounting | Core |
| Looting | BBot smart/before/after corpse modes; WindBot auto loot lists; XenoBot destinations; MageBot sorter/seller | Corpse queue, keep/skip/rare/sell/protected lists, container routing, capacity policy, rare alerts, value tracking | Core |
| Economy/refill | WindBot supplies; vBot bank/travel/buy; MageBot seller/gold changer; BBot depositable/dropable | Supply plan, bank/shop/sell/buy/travel state machine, hunt ledger, profit/supply burn | Core |
| Profiles/import/export | NeoBot/WindBot/XenoBot profile save-load; script communities | Route packs with route, target, sustain, loot, supply, alarms, party, schema validation, diff summary | Core |
| Scripting/recipes | BlackD commands; WindBot Lua; XenoBot/iBot APIs; OTClient Bot scripts; R-BOT Lua | Constrained typed action-block DSL before arbitrary scripts; optional sandbox later | Advanced |
| HUD/analytics | ElfBot displays/icons; WindBot/XenoBot HUDs; nExBot Hunt Analyzer | Electron-native decision trace, route timeline, XP/kills/loot/profit/supply counters, failure histogram | Advanced |
| Multi-client/party | MageBot team server; WindBot navigation/player relations; Minibot follow chain; R-BOT remote dashboard | Claims, party roles, follow chain, spacing leases, assist target, support allowlists, compact party dashboard | Advanced |
| PvP automation | Magebomb, aimbot, combo, auto-SSA, speedhack, trapper | Avoid except harmless private-server-only support policies with explicit allowlists; never speedhack/aimbot | Avoid |
| Anti-detection/bypass | Staff logout, stealth/hardware claims, packet logs, floor spy | Avoid; convert to transparent alert/pause/visibility only | Avoid |

## Product Principles

1. Route-first, not script-first.
   Normal hunts should be built with route profiles, target profiles, module
   rules, action waypoints, tile rules, and supply plans. Scripts are for gaps.

2. Truthful state over clever guesses.
   If the snapshot cannot reliably detect a condition, cooldown, corpse, tile,
   or NPC state, the module reports `unknown` and skips risky actions.

3. Every automated action has one owner.
   Healing owns heals, looting owns corpse/container moves, refill owns
   shop/bank requests, route owns movement, targeter owns target choice,
   progression owns NPC workflows.

4. Expert power must be inspectable.
   Target scores, healing decisions, route skips, refill choices, loot filters,
   and action failures need visible reasons in logs or UI summaries.

5. Multi-client work needs coordination, not duplicated control.
   Follow chain, claims, route spacing, party roles, and shared-spawn policy
   should make many sessions safe to operate from one desk.

6. Avoid historical bad patterns.
   No packet logging, speed hacks, official-client tampering, staff evasion,
   hidden automation, or anti-cheat bypass behavior.

## Required World Model

Minibot should converge on this module-facing model through the existing
normalized snapshot and live runtime surfaces.

### Self

- character name, vocation, level, experience, stamina, capacity
- HP/MP absolute and percent, max HP/MP
- position `x/y/z`, direction, movement state, tile anchor
- battle/PZ/skull/party state where Minibia exposes it
- conditions: poison, burning, energized, paralyzed, haste, mana shield, light
- equipment slots: weapon, shield, ammo/quiver, ring, amulet, boots
- hotbar slots: spell/item labels, category, target mode, enabled state
- cooldown observations: spell family, item family, last action timestamp
- confidence and last refresh timestamp per field family

### Creatures

- monsters, players, NPCs split into separate ledgers
- name, id/signature, HP percent, position, floor, distance, visibility
- target/follow/attack relationships
- reachability/shootability where detectable
- danger score, ownership status, party/friendly/blacklist state
- time seen, time damaged, time attacked, time corpse expected

### Tiles

- walkable, reachable, shootable, blocked, field category
- stairs/ladder/rope/shovel/hole/teleport/trap flags where detectable
- route annotations: avoid, danger, wait, no-target, no-loot, no-aoe, safe-zone
- dynamic blockers: players, monsters, furniture, fields, recent failed moves

### Inventory And Containers

- equipment slots
- open containers with item id/name/count/category/value
- empty slots, merge targets, destination preferences
- supply counts for potions, runes, food, ammo, tools
- loot categories: keep, sell, stack, rare, trash, quest/task, unknown

### NPC, Trade, And Messages

- visible NPCs and distance
- dialogue state, options, recent messages, success/failure signatures
- trade entries with buy/sell prices, stock, capacity/gold constraints
- bank balance last seen, transaction status, pending confirmations
- private/default/status/server messages for alarms and workflow parsing

### Route Runtime

- route id/name/version
- current waypoint index, last accepted waypoint, helper target
- active state, active owner, route action in progress
- retry count, blocked reason, skip reason, last failure reason
- floor transition expectation and confirmation
- corpse return state and remembered corpse positions
- route spacing lease and peer route positions
- pause reason, safe-zone intent, resume checkpoint

### Party Runtime

- member order, roles, leader/follower mapping
- distance to predecessor and leader
- shared-spawn policy and target ownership
- heal/buff allowlist
- per-member status chips: HP, pause, waypoint, alert

## PRD: Minibot Feature Requirements

### P0: Decision Trace And Snapshot Confidence

Required behavior:

- Show the last decision per module: why it acted, why it skipped, cooldown,
  needed state, and action result.
- Add stale/unknown/confident status to major snapshot families.
- Modules skip risky actions when required state is unknown.
- Module conflict reporting shows the winning owner and suppressed owners.

Acceptance criteria:

- When the bot fails to heal, loot, move, attack, refill, or bank, the operator
  can see the gating reason within one tick.
- Tests cover unknown snapshot families, stale state, action result propagation,
  and owner conflict reporting.

### P0: Cavebot State Machine

Required states:

- `idle`: route is stopped or not selected.
- `routing`: moving toward the next accepted waypoint.
- `combat-hold`: route pauses because target policy owns movement.
- `loot`: route pauses while corpse and container work is active.
- `refill`: route executes supply, sell, bank, or travel work.
- `recovery`: route is blocked, ambiguous, desynced, or replaying helpers.
- `paused`: operator or alarm paused route movement.
- `escape`: emergency movement away from a configured threat.
- `dead`: death modal or death-like terminal state.
- `disconnected`: reconnect policy owns control.

How it should work:

- Each tick records one active owner: route, targeter, looter, refill, sustain,
  follow, trainer, reconnect, or manual pause.
- A route cannot advance while a higher-priority owner is active.
- Waypoint acceptance records reason: reached, radius match, helper replay,
  blocked skip, action success, action failure policy, or operator skip.
- Recovery prefers recent confirmed route touches, local adjacency, and helper
  waypoints before skipping ahead.
- Tile rules apply consistently to route movement, combat repositioning,
  looting destinations, AoE, and emergency movement.

Acceptance criteria:

- UI shows active state, owner, waypoint index, last accepted waypoint, and last
  failure reason.
- Tests cover combat interruption, looting pause, blocked movement, floor
  change, refill branch, pause/resume, death, and disconnect.

### P0: Targeting Profiles And Scoring

Required fields:

- `name` or category
- priority: ignore, low, normal, high, urgent
- danger score
- min and max count
- HP percent window
- stance: hold, chase, approach, diagonal, distance, kite, lure, escape, assist
- desired range and floor tolerance
- attack rule references
- AoE eligibility and safe-player policy
- stale-target timeout and ignore-after-failed-damage policy

How it should work:

- Targeting scans ordered profile rows top to bottom.
- Category profiles can match mixed monster groups for AoE decisions.
- Player and shared-spawn rules can suppress AoE or target acquisition.
- Distance keeper and spell caster consume the selected target profile instead
  of duplicating monster-specific policy.
- Target failure reasons are surfaced: no visible target, protected by
  shared-spawn, outside floor, stale, unsafe AoE, no mana, cooldown, path
  blocked, route-owner lock.

Acceptance criteria:

- A mixed-monster group can trigger a category AoE rule only when safe.
- A single monster can have different behavior at different counts.
- Target selection logs the chosen profile and why higher rows were skipped.

### P0: Sustain And Healer

Required behavior:

- Ordered spell, rune, potion, condition, and friend-heal rules.
- Separate emergency self-heal floor that cannot be starved by support actions.
- Hysteresis: a heal can continue until a configured recovery target is reached.
- Vocation-aware defaults for HP, MP, spells, potions, runes, and supplies.
- Explicit condition support only when the snapshot can truthfully detect it.
- Friend heal rules tied to party roles and visible party state.

How it should work:

- Sustain/healer runs before offensive spells, looting, refill, route movement,
  and anti-idle.
- The first matching rule owns the action for that tick.
- Every skipped rule gets a machine-readable skip reason in debug state.
- Hotbar-backed consumables preserve target: self, friend, tile, or target.

Acceptance criteria:

- Emergency self-heal wins over friend heal and offensive casts.
- Potion and spell cooldown gates prevent action spam.
- Tests cover ordered priority, hysteresis, friend-heal suppression, and
  condition detection fallback.

### P0: Looter And Economy

Required behavior:

- Corpse queue with open modes: immediate, after current target, after pack, or
  route-safe only.
- Keep list, skip list, rare list, sell list, deposit list, and protected list.
- Preferred containers by item category, explicit name, or fallback container.
- Capacity-aware decisions: keep, drop low-value, skip, sell branch, depot, or
  pause.
- Corpse return after combat displacement.
- Loot value summary by item, category, source corpse, and route session.
- Rare loot alert with item, corpse, and destination.

How it should work:

- Looter owns route movement only while a reachable corpse or open corpse
  container still has actionable items.
- Container moves use `container-routing.mjs`; no renderer-only item moves.
- Capacity pressure triggers an explicit action: continue, sell, deposit, or
  pause.
- The operator sees what was looted, skipped, dropped, sold, or protected.

Acceptance criteria:

- Full backpack handling opens the next configured container or routes to a
  refill/sell branch.
- Rare loot is never dropped by capacity policy.
- Tests cover corpse queue ordering, preferred routing, full-container fallback,
  rare alerts, and capacity decisions.

### P0: Refill, Banking, Shopping, Travel

Required fields:

- Desired carried counts for potions, runes, food, ammo, tools, rings, amulets.
- Minimum hunt counts that trigger return.
- Maximum buy counts and budget.
- Reserve gold and bank withdrawal policy.
- Sell list and protected items.
- NPC names, city, shop keywords, travel destinations, depot branch, and
  return-to-hunt waypoint.

How it should work:

- Supply status is recomputed from visible inventory and vocation defaults.
- Route can branch to refill when supplies, cap, gold, or durability cross
  thresholds.
- Bank and shop actions are conversations with retry and failure states.
- Refill returns through route waypoints, not teleport-like jumps.

Acceptance criteria:

- A route can complete a full cycle: hunt, low supply, bank, sell, buy, return.
- Failed NPC dialogue pauses with a clear reason and does not loop forever.
- Tests cover buy deficit calculation, sell protection, bank reserve, and
  route branch return.

### P1: Route Studio And Profiles

Required behavior:

- Route profiles expose route-local sections: Waypoints, Targeting, Sustain,
  Loot, Supplies, Banking, Alarms, Party, and Options.
- Route options use typed controls: checkbox, select, number, string, item
  selector, spell selector, NPC selector, monster selector.
- Profiles can be cloned, renamed, imported, exported, validated, and dry-run.
- Import produces a validation report before replacing current state.

Acceptance criteria:

- Validation identifies missing NPCs, missing item names, impossible waypoint
  types, unknown monsters, broken goto labels, and unsupported floor changes.
- Operator can clone a route and change only supply options without editing raw
  JSON.

### P1: Script And Action System

Historical bots became powerful through scripting, but unrestricted scripting is
hard to test and easy to make unsafe. Minibot should first support typed action
blocks.

Required action block primitives:

- `say`, `npcSay`, `wait`, `useItem`, `useHotbar`, `moveItem`, `openContainer`
- `bank`, `shopBuy`, `shopSell`, `travel`, `deposit`, `withdraw`
- `setRouteLabel`, `gotoLabel`, `pauseRoute`, `resumeRoute`
- `setOption`, `incrementCounter`, `branchIf`, `branchUnless`
- `emitAlert`, `recordMetric`

Required condition primitives:

- HP/MP/cap/soul/supply thresholds
- inventory item count
- nearby monster/player/NPC count
- route position, waypoint label, floor, and distance
- recent message contains normalized event
- active target profile, active owner, and last action result

How it should work:

- Action blocks are JSON data with a schema, not arbitrary JS in route files.
- Execution is stepwise, cancellable, and logs each emitted action.
- Unsafe or unknown actions fail validation before a route starts.

Acceptance criteria:

- A deposit/sell/refill action block can be validated and executed without
  custom code.
- A failed action block pauses with the failing step index and reason.

### P1: Alarms And Protector

Required behavior:

- Alarms for low HP/MP, low supplies, no cap, player visible, staff-like name,
  blacklist, private message, disconnect, death, route stuck, no progress,
  target stale, rare loot, high incoming damage, and full backpack.
- Alarm actions: sound, desktop notification, log, pause selected modules,
  pause route, stop targeter, or require operator acknowledgement.
- Whitelist and party-aware suppression.

How it should work:

- Alarms never implement detection evasion.
- Alarm state is visible per session tab and compact view.
- A paused state records which alarm paused it and how to resume.

Acceptance criteria:

- An alarm can pause route and targeter while healer remains active.
- Operator can acknowledge and resume without losing route position.

### P1: HUD And Analytics

Required behavior:

- XP/hour, kills/hour, loot/hour, profit/hour, waste/hour.
- Kill counters by monster and route.
- Recent loot panel and rare loot ledger.
- Supply burn rate and time-to-refill estimate.
- Spell/potion/rune usage counts.
- Route state timeline and failure histogram.

How it should work:

- Analytics derive from runtime events when events are available.
- Metrics are route-session scoped and resettable.
- Export is local JSON or CSV only.

Acceptance criteria:

- Operator can answer: why did the bot stop, what did it loot, what did it
  spend, when will it refill, and which rule fired most.

### P2: Party And Team Coordination

Required behavior:

- Follow chain with leader, front guard, assist DPS, sio-healer, party buffer,
  rearguard, scout, and sweeper roles.
- Assist target rules.
- Friend heal and buff rules.
- Route spacing leases and live peer spacing.
- Party pause/resume and regroup.
- Shared loot and shared supply summaries.

How it should work:

- Party members respect claims and never double-control the same character.
- Followers can clear targets when passive roles require it.
- Party combat modes are route-local: follow-only, follow-and-fight, assist
  only, or support only.

Acceptance criteria:

- A two-character route can keep spacing, follow floor changes, assist targets,
  and recover from same-floor stalls.
- Support roles do not override emergency self-heal.

### P2: Training, Runemaking, Enchanting

Required behavior:

- Trainer mode with partner detection, safe regrouping, low-HP escape, auto eat,
  mana trainer, reconnect policy, and anti-idle.
- Rune maker with mana window, soul/resource checks, blank rune checks,
  stationary/no-target gates, and low-supply pause.
- Enchanter-like utilities for Minibia-supported ammunition/runes only when the
  official Minibia data bundle declares the action.

How it should work:

- Training and runemaking are separate modes from cavebot, but can reuse
  sustain, auto eat, anti-idle, reconnect, and inventory modules.
- Rules are ordered and logged like all other modules.

Acceptance criteria:

- Trainer can run without a selected route.
- Rune maker stops clearly when resources, blank runes, mana, or conditions are
  not satisfied.

## UI Requirements

Main dashboard:

- session tabs with HP, pause, waypoint, alert, and claim state
- compact multi-client table for party operation
- global pause/stop/resume with reason
- current top decision and current blocker

Route workspace:

- route map/list split view
- waypoint type picker
- tile-rule layer controls
- recorder timeline
- validation warnings
- recovery/stuck history

Hunt workspace:

- target profile table
- score preview for visible monsters
- stance editor
- AoE/rune/spell rules
- shared-spawn policy
- player/NPC/monster ledgers

Modules workspace:

- healer/sustain/potion/condition/death heal
- mana trainer/rune maker/spell caster
- auto eat/ammo/ring/amulet/light/convert
- looting/refill/banking/progression
- alarms/reconnect/follow/trainer
- each module shows last action, next eligible action, and blocked reason

Economy workspace:

- carried supplies
- desired supplies
- loot valuation
- unknown items
- NPC sell targets
- profit and burn rate
- refill plan preview

Party workspace:

- ordered members
- roles
- follow target per member
- spacing
- shared target policy
- friend heal/buff allowlist
- per-member route status

## Current Minibot Fit / Gap Analysis

Already strong:

- Electron desk with sessions, claims, compact view, route tools, module editor.
- CDP-based live browser control rather than embedded client replacement.
- Route profiles, route recording, overlays, waypoint actions, route reset.
- Hunt Studio, target queues, target profiles, shared-spawn policy.
- Healer, potion healer, condition healer, death heal, sustain.
- Rune maker, mana trainer, spell caster, distance keeper.
- Auto eat, ammo, ring/amulet replacement, auto light, auto convert.
- Looting, banking, refill, NPC dialogue, progression action primitives.
- Reconnect, alarms, anti-idle, follow chain, trainer, rookiller.
- Vendored Minibia data and vocation packs.

Main gaps:

- Decision trace is not yet the product center.
- Snapshot confidence/staleness is not visible enough.
- Route validation and stuck taxonomy need to be stronger.
- Refill/progression orchestration is not yet a complete state machine.
- Target scoring is not transparent enough for expert tuning.
- AoE spell/rune solver is not a first-class module.
- Loot/economy telemetry is not yet hunt-grade.
- Profile pack import/export is not formalized.
- Script/recipe layer is not yet designed.
- Party dashboard and multi-client analytics can go deeper.

## Implementation Order

Recommended engineering order:

1. Add decision trace and snapshot confidence across existing modules.
2. Upgrade route validation and stuck taxonomy.
3. Turn refill/shop/bank/travel into one resumable state machine.
4. Add hunt ledger and economy summaries.
5. Add target score preview and stance unification.
6. Add profile pack import/export.
7. Add route recorder 2.0.
8. Add constrained JSON action blocks.
9. Add AoE solver after target profiles and tile rules share one safety model.
10. Add party dashboard and shared summaries after route spacing is proven.

## Canonical Merge Map

If this PRD becomes durable, merge it as follows:

- Stable module rule contracts: `docs/MODULES.md`
- Runtime state, ownership, and route state machine: `docs/ARCHITECTURE.md`
- Snapshot fields and confidence/staleness: `docs/MINIBIA_RUNTIME_SURFACE.md`
- Action block primitives and action results: `docs/MINIBIA_ACTION_PRIMITIVES.md`
- Desktop surfaces, route studio, decision trace, analytics UI:
  `docs/UI_UX.md`
- Operator workflows, profile import/export, validation, route packs:
  `docs/OPERATIONS.md`
- Only unresolved implementation tasks: `todo.md`

Do not create another canonical PRD. This temporal file should be deleted after
durable requirements have been folded into canon and open work has been moved to
`todo.md`.

## Acceptance Criteria For World-Class Minibot

1. A route can be recorded, named, validated, run, paused, resumed, and exported
   without editing JSON.
2. A hunt can be configured from presets: targets, stance, loot, supplies,
   healing, refill, and alarms.
3. Every automated action explains why it fired.
4. Every skipped critical action explains why it did not fire.
5. Route movement, targeting, looting, and AoE all share the same tile rules.
6. Refill/bank/shop/travel workflows are resumable after disconnect or pause.
7. Multi-client sessions cannot accidentally claim the same character.
8. Party follow recovers after stairs, lag, and temporary floor mismatch.
9. Loot and supply economics can be audited per hunt.
10. Profile packs can be imported/exported with schema validation.
11. Tests cover core module decisions from recorded snapshot fixtures.
12. The bot stays inside the Minibia/private-server automation boundary and does
    not implement official-client tampering or anti-cheat bypass behavior.

## Bibliography

- CipSoft BattlEye announcement:
  https://www.cipsoft.com/en/122-cooperation-with-battleye-innovations
- TibiaWiki bot taxonomy and rule-risk summary:
  https://tibia.fandom.com/wiki/Bot
- Tibia Auto SourceForge wiki:
  https://sourceforge.net/p/tibiaauto/wiki/Home/
- BlackD Proxy feature page:
  https://blackdtools.com/blackdproxy.php
- BlackD cavebot detail:
  https://blackdtools.com/blackdproxytutorials/21374.php
- TibiaBot NG feature mirror:
  https://scriptstibia.webnode.page/tibiabot-ng/
- TibiaBot NG archive/download description:
  https://baixe.net/en/tibiabot-ng
- ElfBot NG historical page:
  https://elfbot.tibia.network/
- ElfBot targeting tutorial:
  https://www.elfbot.com.br/2023/01/como-configurar-aba-targeting-do-elfbot.html
- NeoBot guide and feature discussion:
  https://torg.pl/tibia/386386-neobot-antybanmode.html
- MageBot features:
  https://tibiadb.com/features.php
- WindBot features:
  https://tibiawindbot.com/features.html
- XenoBot documentation:
  https://xenobot.fandom.com/wiki/Documentation
- XenoBot tutorial:
  https://xenobot.net/tutorial/index.html
- BBot feature list:
  https://bbot.bmega.net/features.html
- BBot cavebot docs:
  https://wiki.bmega.net/doku.php?id=cavebot
- BBot looter docs:
  https://wiki.bmega.net/doku.php?id=looter
- vBot guide:
  https://wiki.neprenia.com/vbot
- OTClient Bot features:
  https://otclientbot.com/features
- OTClient Bot Lua/options docs:
  https://otclientbot.com/docs
- nExBot product page:
  https://www.nexbot.cc/
- ZeroBot general docs:
  https://docs.zerobot.net/general/
- ZeroBot cavebot docs:
  https://docs.zerobot.net/cavebot/getting_started/
- Shrouded Bot product page:
  https://www.shroudedbot.com/
- R-BOT product page:
  https://tibiarbot.com/
