# Modules

This is the canonical module catalog for Minibot. It names the live module keys,
their ownership files, the config fields they use, and the features they
currently ship.

When this file disagrees with code or tests, code and tests win. Update this
file in the same change whenever a module key, rule shape, tick order, or
feature responsibility changes.

This file is both the operator module catalog and the implementation reference
for shared runtime modules. Do not add a second module guide.

## Working Rules

- Canonical names are the config and UI keys used by code. Do not rename them
  without a migration for saved character configs and route profiles.
- Rule-based modules evaluate ordered rule arrays from top to bottom.
- Disabled rule rows are persisted and skipped.
- Empty rule rows normalize to safe defaults and should not fire accidentally.
- Shared modules should consume the normalized snapshot from
  [`lib/minibia-snapshot.mjs`](../lib/minibia-snapshot.mjs).
- Mechanical actions should go through
  [`lib/action-router.mjs`](../lib/action-router.mjs) and return normalized
  `{ ok, driver, reason, details }` results.
- Risky modules should check snapshot confidence before acting. Unknown or
  stale required families must skip with a normalized reason such as
  `snapshot inventory unknown` instead of guessing.
- Runtime behavior belongs in [`lib/`](../lib), not renderer event handlers.

## Runtime Order

The main bot loop lives in [`lib/bot-core.mjs`](../lib/bot-core.mjs). Current
tick order is:

1. refresh the live page snapshot and restore preferred chase mode
2. handle disconnect-only reconnect
3. run death heal
4. run vocation sustain, then spell, potion, and condition healer families if sustain did not act
5. enforce follow-only and shared-spawn target clearing
6. refresh follow-chain runtime state
7. handle paused cavebot or trainer mode utilities
8. run trainer escape and rookiller
9. handle route-only rookiller branch when active
10. handle field or distance escape threats
11. run follow-chain suspend or follow actions
12. run auto eat, ammo reload, equipment replacement, light, mana trainer, and rune maker
13. run urgent coin conversion or value-slot repair
14. run ammo restock, refill, then looting
15. run pending route actions
16. choose combat target, distance keeper, and spell caster
17. run normal coin conversion, route movement, auto eat, equipment replacement,
    and anti-idle fallbacks

That ordering is intentional. In particular, sustain/healer must stay ahead of
non-heal casts during healing priority, and looting must happen before normal
route movement.

Every tick also records a decision trace. A record contains owner, action,
acted/skipped/blocked state, reason, required snapshot families, action result,
cooldown when known, and suppressed owners when a higher-priority owner wins the
tick. The trace is runtime state, not configuration.

## Operator Modules

These are the feature modules visible in the desktop app or route workspace.

| Canonical name | Source | State keys | Current feature contract |
| --- | --- | --- | --- |
| `route` / `autowalk` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`lib/config-store.mjs`](../lib/config-store.mjs), [`lib/route-validation.mjs`](../lib/route-validation.mjs), [`desktop/renderer.js`](../desktop/renderer.js) | `autowalkEnabled`, `autowalkLoop`, `routeRecording`, `showWaypointOverlay`, `waypoints`, `tileRules`, `waypointRadius`, `walkRepathMs`, `cavebotPaused`, `stopAggroHold`, `cavebotName` | Waypoint route execution, route recording, route library persistence, validation reporting, waypoint overlay, route reset, route resync, ambiguous-crossing recovery, floor-transition relatch/recovery, label-based route loops, helper recovery, corpse return, route spacing leases, route-local snapshots, route action execution, and route-owned bank/shop/NPC/daily-task waypoint dispatch. Route spacing uses live peer positions near the route spine before falling back to stored spacing indices. Plain same-floor walk/node/safe-zone runs may glide to a farther reachable waypoint, while automation, reset/recovery, wait-tile, blocked, floor-changing, or spacing-sensitive segments keep single-step destinations. |
| `avoidFields` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `avoidElementalFields`, `avoidFieldCategories` | Avoids configured field categories while choosing route and combat movement. Categories are `fire`, `energy`, `poison`, `holes`, `stairsLadders`, `teleports`, `traps`, and `invisibleWalls`. Route safety may keep native chase standing only while there is no reachable combat target. |
| `targeting` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js), [`lib/hunt-presets.mjs`](../lib/hunt-presets.mjs) | `monsterNames`, `targetProfiles`, `sharedSpawnMode`, `creatureLedger`, `rangeX`, `rangeY`, `combatRangeX`, `combatRangeY`, `floorTolerance`, `retargetMs` | Hunt queue, per-monster target profiles, shared-spawn policy, creature registry, visible monster/player/NPC ledgers, official hunt presets, target selection, target clearing, and fallback combat range rules. Reachable combat targets in the combat window suspend route movement and allow the configured or profile chase stance to be restored. |
| `sustain` | [`lib/modules/sustain.mjs`](../lib/modules/sustain.mjs), [`lib/vocation-pack.mjs`](../lib/vocation-pack.mjs) | `sustainEnabled`, `sustainCooldownMs`, `preferHotbarConsumables`, `vocation` | Vocation-aware emergency spell, health potion, mana potion, food, ammo, and supply status planning from vendored vocation packs. Health-potion fallback yields to live healer tiers and potion-healer rules. |
| `healer` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js) | `healerEnabled`, `healerRules`, `healerEmergencyHealthPercent` plus legacy `healerWords`, `healerHotkey`, `healerHealthPercent`, `healerMinMana`, `healerMinManaPercent`, `healerRuneName`, `healerRuneHotkey`, `healerRuneHealthPercent` | Ordered spell, healing-rune, mass-heal, and heal-friend tiers. Legacy auto-rune fields migrate into normal top-tier healer rules, so Ultimate Healing Rune is part of the same left-side priority stack instead of a separate fallback lane. Rules match HP bands and mana gates, then cast or use the configured self-heal. Hotbar-backed runes preserve self-targeting. The emergency threshold raises healing priority without reordering rules, and self emergency keeps friend-heal support behind self-heals. The lowest actionable tier covers down to `0%` HP. |
| `potionHealer` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js) | `potionHealerEnabled`, `potionHealerRules` | Ordered self-use healing potion rules inside the Healer modal. Rules match HP bands plus optional mana gates, prefer hotbar-first consumable resolution, preserve self-targeting for hotbar-backed potions, and run after spell self-heals but before support heals. Sustain still owns mana-potion behavior and health-potion fallback when no potion-healer rule matches. |
| `conditionHealer` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js), [`lib/minibia-snapshot.mjs`](../lib/minibia-snapshot.mjs) | `conditionHealerEnabled`, `conditionHealerRules` | Detectable condition reactions inside the Healer modal. Current live triggers are poison cure via `exana pox` and magic-shield renewal via `utamo vita` when the snapshot can detect the state and the current vocation supports the spell. Unsupported classics such as `utura` and `exana vita` stay explicitly unsupported until the runtime can truthfully drive them. |
| `deathHeal` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`lib/vocation-pack.mjs`](../lib/vocation-pack.mjs) | `deathHealEnabled`, `deathHealVocation`, `deathHealWords`, `deathHealHotkey`, `deathHealHealthPercent`, `deathHealCooldownMs` | Critical self-heal floor. Resolves spell by explicit words, configured vocation, active vocation, or route fallback, then prefers configured hotkey or matching hotbar spell before direct cast fallback. Also stays available to trainer mode. |
| `manaTrainer` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`lib/vocation-pack.mjs`](../lib/vocation-pack.mjs) | `manaTrainerEnabled`, `manaTrainerRules` plus legacy `manaTrainerWords`, `manaTrainerHotkey`, `manaTrainerManaPercent`, `manaTrainerMinHealthPercent` | Ordered mana windows for safe spell casting. Rules gate by HP min, MP min/max, cooldown, no-target requirement, and stationary requirement. |
| `trainer` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `trainerEnabled`, `trainerReconnectEnabled`, `trainerPartnerName`, `trainerPartnerDistance`, `trainerManaTrainerEnabled`, `trainerManaTrainerWords`, `trainerManaTrainerHotkey`, `trainerManaTrainerManaPercent`, `trainerManaTrainerMinHealthPercent`, `trainerEscapeHealthPercent`, `trainerEscapeDistance`, `trainerEscapeCooldownMs`; inherited anti-idle, auto-eat, healer, death-heal, and reconnect policy keys remain owned by their modules | Training mode with partner targeting, regrouping, trainer reconnect arming, trainer-only mana spell window, low-HP escape, and route-safe recovery. It reuses inherited service settings from their owning modules instead of exposing duplicate editors. Separate from follow chain. |
| `trainerEscape` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `trainerEscapeHealthPercent`, `trainerEscapeDistance`, `trainerEscapeCooldownMs` | Low-HP escape action used by trainer and paused cavebot handling. Steps away from threats or the training partner before resuming. |
| `autoEat` | [`lib/modules/auto-eat.mjs`](../lib/modules/auto-eat.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `autoEatEnabled`, `autoEatFoodName`, `autoEatForbiddenFoodNames`, `autoEatCooldownMs`, `autoEatRequireNoTargets`, `autoEatRequireStationary` | Food picker across hotbar, equipment, and open containers. Supports priority food names, blocked food names, no-target and stationary gates. Trainer can reuse the food cadence even when standalone auto eat is off. |
| `ammo` | [`lib/modules/ammo.mjs`](../lib/modules/ammo.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js) | `ammoEnabled`, `ammoPreferredNames`, `ammoMinimumCount`, `ammoWarningCount`, `ammoReloadAtOrBelow`, `ammoReloadCooldownMs`, `ammoReloadEnabled`, `ammoRestockEnabled`, `ammoRequireNoTargets`, `ammoRequireStationary` | Quiver-slot ammo handling. Resolves vocation-aware defaults, reloads arrows/bolts/power bolts from open containers into the detected quiver slot, can evict non-ammo junk out of the slot first, and buys ammo back up to the configured carried reserve when trade is open. |
| `ringAutoReplace` | [`lib/modules/equipment-replace.mjs`](../lib/modules/equipment-replace.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `ringAutoReplaceEnabled`, `ringAutoReplaceItemName`, `ringAutoReplaceCooldownMs`, `ringAutoReplaceRequireNoTargets`, `ringAutoReplaceRequireStationary` | Equips a replacement ring from open containers when the ring slot is empty. Matches explicit item names, generic ring requests, or vendored metadata when live labels are opaque. |
| `amuletAutoReplace` | [`lib/modules/equipment-replace.mjs`](../lib/modules/equipment-replace.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `amuletAutoReplaceEnabled`, `amuletAutoReplaceItemName`, `amuletAutoReplaceCooldownMs`, `amuletAutoReplaceRequireNoTargets`, `amuletAutoReplaceRequireStationary` | Equips a replacement amulet or necklace from open containers when the amulet slot is empty. Uses the same matching and metadata fallback as ring replacement. |
| `runeMaker` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `runeMakerEnabled`, `runeMakerRules` | Ordered rune windows. Rules gate by HP min, MP min/max, cooldown, no-target requirement, and stationary requirement. Supports template insertion from the desktop module editor. |
| `spellCaster` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `spellCasterEnabled`, `spellCasterRules` | Ordered offensive spell rules. Rules gate by MP min, max target distance, target count, cooldown, target requirement, stationary requirement, and pattern. Patterns are `any`, `adjacent`, `aligned`, `diagonal`, and `pack`. |
| `distanceKeeper` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), route hunt workspace | `distanceKeeperEnabled`, `distanceKeeperRules`, target-profile distance fields | Kiting and dodge movement. Rules gate by target distance window, monster count, cooldown, beam/wave dodge flags, and target requirement. Behaviors are `retreat`, `kite`, `hold`, and `escape`. Target profiles can also contribute distance behavior. |
| `autoLight` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `autoLightEnabled`, `autoLightRules` plus legacy `autoLightWords`, `autoLightHotkey`, `autoLightMinManaPercent` | Ordered light spell rules. Rules gate by spell words, MP min, cooldown, no-light requirement, no-target requirement, and stationary requirement. |
| `autoConvert` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`lib/modules/economy.mjs`](../lib/modules/economy.mjs) | `autoConvertEnabled`, `autoConvertRules`, legacy `convertCooldownMs` | Coin conversion and value-slot repair. Handles urgent overflow and remembered value-slot repair before normal conversion. Rules gate by cooldown, no-target requirement, and stationary requirement. |
| `refill` | [`lib/modules/refill.mjs`](../lib/modules/refill.mjs), [`lib/modules/shopper.mjs`](../lib/modules/shopper.mjs), [`lib/modules/loot-economics.mjs`](../lib/modules/loot-economics.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `refillEnabled`, `refillSellRequests`, `refillAutoSellEnabled`, `refillAutoSellMinFreeSlots`, `refillAutoSellProtectedNames`, `refillNpcNames`, `refillShopKeyword`, hidden loop keys `refillLoopEnabled`, `refillLoopStartWaypoint`, `refillLoopReturnWaypoint`, `refillShopDialogueMaxAttempts`, vocation sustain thresholds | Builds buy/sell requests from vocation supply thresholds, capacity-aware autosell planning, configured sell requests, and visible shop state. Buys potion, rune, food, ammo, rope, and shovel deficits; executes visible trade actions; can run from `shop` route waypoints; and can branch from a hunt waypoint into a refill service leg when the hidden refill loop is enabled. Shop dialogue retries are bounded, and active refill-loop bank or NPC service failures pause the cavebot with the failed service reason instead of retrying forever. |
| `looting` | [`lib/modules/looter.mjs`](../lib/modules/looter.mjs), [`lib/modules/container-routing.mjs`](../lib/modules/container-routing.mjs), [`lib/modules/loot-economics.mjs`](../lib/modules/loot-economics.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `lootingEnabled`, `lootWhitelist`, `lootBlacklist`, `lootPreferredContainers`, `corpseReturnEnabled` | Opens map corpses, identifies corpse containers, filters contents by keep/skip matchers, infers item categories, resolves vendored item names, routes kept items into preferred open containers or merge stacks, and can summarize item value from visible trade or vendored NPC buy prices. |
| `banking` | [`lib/modules/banker.mjs`](../lib/modules/banker.mjs), [`lib/modules/npc-dialogue.mjs`](../lib/modules/npc-dialogue.mjs), [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `bankingEnabled`, `bankingRules` | Ordered bank rules with banker matching, operation selection, nearby NPC checks, no-target/stationary gates, cooldowns, keyword dialogue, confirmation handling, recent-message success/failure parsing, and bank waypoint execution. |
| `reconnect` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `reconnectEnabled`, `reconnectRetryDelayMs`, `reconnectMaxAttempts`, `trainerReconnectEnabled` | Disconnect-only reconnect guard. Uses the real Minibia reconnect UI or exposed reconnect hook, handles retry ladders, server-save delay handling, exhaustion telemetry, and death-modal blocking. Trainer can keep reconnect armed independently. |
| `antiIdle` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `antiIdleEnabled`, `antiIdleIntervalMs` | Idle keepalive. Prefers direct keepalive hooks, then reversible inventory move pulse, then keyboard/input fallback. Trainer reuses the same pulse timing. |
| `alarms` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js) | `alarmsEnabled`, `alarmsPlayerEnabled`, `alarmsPlayerRadiusSqm`, `alarmsPlayerFloorRange`, `alarmsStaffEnabled`, `alarmsStaffRadiusSqm`, `alarmsStaffFloorRange`, `alarmsBlacklistEnabled`, `alarmsBlacklistNames`, `alarmsBlacklistRadiusSqm`, `alarmsBlacklistFloorRange` | Regular player, staff-like name, and explicit blacklist proximity alarms with separate radius and floor windows. Staff and blacklist alerts use stronger alarm treatment. |
| `partyFollow` | [`lib/bot-core.mjs`](../lib/bot-core.mjs), [`desktop/renderer.js`](../desktop/renderer.js) | `partyFollowEnabled`, `partyFollowMembers`, `partyFollowManualPlayers`, `partyFollowMemberRoles`, `partyFollowDistance`, `partyFollowCombatMode` plus legacy `followChain*` aliases | Ordered follow chain. Slot 1 leads; each later member follows the name above it. Supports live tabs, seen players, manual names, per-member roles, follow-and-fight, follow-only, stair recovery, same-floor stall recovery, and target clearing for passive roles. |
| `rookiller` | [`lib/bot-core.mjs`](../lib/bot-core.mjs) | `rookillerEnabled` | Rook guard that watches level progress, returns to waypoint 1 at the configured cap, and closes the live client. Can temporarily constrain runtime to route-only behavior. |

## Route Schema

Route profiles are full route-local build snapshots saved outside the repo under
`~/Minibot/cavebots/*.json` or the portable storage equivalent.

Supported waypoint types:

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

`avoid` and `danger-zone` waypoints are hard no-go markers. They are skipped as route steps and are excluded from route, distance-keeper, and emergency no-go escape destinations.
Accepted route walks that produce a recent blocked-movement server message or keep reporting movement without position progress are interrupted and counted as blocked walk failures. Rejected walk destinations are also avoided briefly so retry, helper recovery, or waypoint skipping can resume instead of bouncing back into the same blocked step.
Floor-changing waypoints should be followed by a same-floor landing waypoint
within two route steps. Runtime stairhop handling is `z`-gated: if the
character is already on the target floor of the first forward bridge, route
resync relatches to that landing segment; otherwise floor recovery walks to an
appropriate transition on the current floor and returns to the current
waypoint's intended `z`. Wrong-direction floor changes are not accepted as
progress, and extra-floor overshoots do not advance the transition waypoint.

Supported waypoint actions are `restart` and `goto`. `restart` loops to
waypoint 1. `goto` accepts either a numeric `targetIndex` or a label selector
saved as `targetLabel`; legacy `gotoLabel` and `labelTarget` aliases are
accepted on load. Label-based route loops are preferred for cavehunt retake
paths because inserted or reordered waypoints do not break the loop target.

### Cavehunt Stairhop Research Notes

External cavebot documentation converges on four route-design rules that
Minibot now mirrors:

- Use typed waypoint intent for floor-changing tiles instead of plain movement.
  ZeroBot documents separate rope, ladder, hole, use, teleport, hur-up, and
  hur-down waypoint types instead of relying only on ordinary coordinates.
- Keep a landing anchor immediately after a floor change. ZeroBot specifically
  recommends well-defined stand/node anchors on different floors and says
  accidental falls or climbs rely on the selected waypoint `z`; Minibot's route
  validation now warns when an explicit floor-changing waypoint has no nearby
  target-floor landing anchor.
- Loop by labels when retaking a hunt path. ZeroBot `Goto` jumps to a named
  label, and OTClientBot `gotolabel` exposes the same control pattern. Minibot
  therefore accepts label-only `goto` actions and keeps label targets in route
  signatures so a saved cavehunt loop is validated and re-evaluated when the
  label changes.
- Confirm transitions against `z`, not only against horizontal coordinates.
  OTClientBot's runtime API exposes position `{x, y, z}` and map-item use at
  positions, matching Minibot's target-floor confirmation.

Research references:

- [ZeroBot waypoint types](https://docs.zerobot.net/cavebot/interface/waypoint_types/)
- [ZeroBot CaveBot getting started recommendations](https://docs.zerobot.net/cavebot/getting_started/)
- [OTClientBot runtime position and map item API](https://otclientbot.com/docs)

Route automation waypoint fields are preserved in route JSON when present:
`npcName`, `keyword`, `shopKeyword`, `city`, `destination`, `residence`,
`blessing`, `promotionName`, `taskTarget`, `taskKeyword`, `rewardKeyword`,
`mode`, `progressionAction`, `refillRole`, `steps`, and `advanceOnBlocked`.

Route validation reports are generated by [`lib/route-validation.mjs`](../lib/route-validation.mjs).
They flag empty enabled routes, unsupported control fields, broken `goto`
targets, duplicate labels, floor jumps, missing NPC context, unknown catalog
names, required tool waypoints, floor-transition landing gaps, and helper gaps.
The report is read-only; save compatibility remains separate from validation
warnings.

Supported tile-rule values:

- shapes: `tile`, `rect`
- triggers: `approach`, `enter`
- policies: `avoid`, `wait`
- exactness: `exact`, `vicinity`
- scope mode: `all`

## Rule Shapes

These are the canonical rule arrays and fields used by the rule-based modules.

| Module | Rule array | Fields |
| --- | --- | --- |
| `healer` | `healerRules` | `enabled`, `label`, `words`, `hotkey`, `minHealthPercent`, `maxHealthPercent`, `minMana`, `minManaPercent`, `cooldownMs` |
| `potionHealer` | `potionHealerRules` | `enabled`, `label`, `itemName`, `hotkey`, `minHealthPercent`, `maxHealthPercent`, `minMana`, `minManaPercent`, `cooldownMs` |
| `conditionHealer` | `conditionHealerRules` | `enabled`, `label`, `condition`, `words`, `hotkey`, `minHealthPercent`, `maxHealthPercent`, `minMana`, `minManaPercent`, `cooldownMs` |
| `manaTrainer` | `manaTrainerRules` | `enabled`, `label`, `words`, `hotkey`, `minHealthPercent`, `minManaPercent`, `maxManaPercent`, `cooldownMs`, `requireNoTargets`, `requireStationary` |
| `runeMaker` | `runeMakerRules` | `enabled`, `label`, `words`, `hotkey`, `minHealthPercent`, `minManaPercent`, `maxManaPercent`, `cooldownMs`, `requireNoTargets`, `requireStationary` |
| `spellCaster` | `spellCasterRules` | `enabled`, `label`, `words`, `hotkey`, `minManaPercent`, `maxTargetDistance`, `minTargetCount`, `cooldownMs`, `pattern`, `requireTarget`, `requireStationary` |
| `distanceKeeper` | `distanceKeeperRules` | `enabled`, `label`, `minTargetDistance`, `maxTargetDistance`, `minMonsterCount`, `cooldownMs`, `behavior`, `dodgeBeams`, `dodgeWaves`, `requireTarget` |
| `autoLight` | `autoLightRules` | `enabled`, `label`, `words`, `hotkey`, `minManaPercent`, `cooldownMs`, `requireNoLight`, `requireNoTargets`, `requireStationary` |
| `autoConvert` | `autoConvertRules` | `enabled`, `label`, `cooldownMs`, `requireNoTargets`, `requireStationary` |
| `banking` | `bankingRules` | `enabled`, `label`, `bankerNames`, `operation`, `amount`, `reserveGold`, `recipient`, `cooldownMs`, `requireNoTargets`, `requireStationary`, `maxNpcDistance` |

Banking operations are:

- `deposit-all`
- `deposit`
- `deposit-excess`
- `withdraw`
- `withdraw-up-to`
- `balance`
- `transfer`

Spell-caster patterns are:

- `any`
- `adjacent`
- `aligned`
- `diagonal`
- `pack`

Distance-keeper behaviors are:

- `retreat`
- `kite`
- `hold`
- `escape`

Shared-spawn modes are:

- `attack-all`
- `respect-others`
- `watch-only`

Party-follow combat modes are:

- `follow-and-fight`
- `follow-only`

Party-follow roles are:

- `follow-only`
- `attack-and-follow`
- `assist-dps`
- `front-guard`
- `sweeper`
- `sio-healer`
- `party-buffer`
- `rearguard`
- `scout`

## Shared Library Modules

These files in [`lib/modules/`](../lib/modules) are reusable planners and
normalizers. Some are operator-facing through the modules above; others are
support layers.

| File | Exports | Feature ownership |
| --- | --- | --- |
| [`ammo.mjs`](../lib/modules/ammo.mjs) | `resolveAmmoPolicy`, `applyAmmoPolicyToVocationProfile`, `getAmmoStatus`, `buildAmmoReloadAction`, `buildAmmoRestockAction` | Resolves vocation-aware ammo policy, normalizes equipped-vs-carried ammo counts, plans quiver reload moves, and creates ammo-only shop restock actions. |
| [`auto-eat.mjs`](../lib/modules/auto-eat.mjs) | `buildAutoEatAction` | Selects food from hotbar, equipment, or containers; applies eat-first and never-eat name filters; emits hotbar or item-use actions. |
| [`banker.mjs`](../lib/modules/banker.mjs) | `BANKING_OPERATION_TYPES`, `DEFAULT_BANKING_RULE`, `normalizeBankingRule`, `normalizeBankingRules`, `matchesBankingRuleEnvironment`, `findNearbyBanker`, `resolveBankingIntent`, `createBankingConversation`, `stepBankingConversation` | Normalizes bank rules, finds bankers, resolves deposit/withdraw/balance/transfer commands, and steps keyword-based banking conversations. |
| [`consumables.mjs`](../lib/modules/consumables.mjs) | `findConsumableEntry`, `buildConsumableAction` | Finds matching hotbar or inventory consumables by item id, name, category, owner, and slot; emits use-on-self, use-on-target, use-on-tile, or generic use actions. Hotbar-backed consumables carry target, name, and category through the emitted `useHotbarSlot` action. |
| [`container-routing.mjs`](../lib/modules/container-routing.mjs) | `findContainerDestination`, `planContainerMove` | Chooses merge targets or empty slots in preferred containers and emits normalized inventory move actions. |
| [`economy.mjs`](../lib/modules/economy.mjs) | `GOLD_PER_PLATINUM`, `GOLD_PER_CRYSTAL`, `normalizeGoldValue`, `sumCoinCounts`, `describeCoinBreakdown`, `parseOverflowSignature`, `getCarriedGoldValue` | Coin value math, carried-gold calculation, coin breakdowns, and overflow signature parsing. |
| [`equipment-replace.mjs`](../lib/modules/equipment-replace.mjs) | `findEquipmentReplaceSlot`, `hasEmptyEquipmentReplaceSlot`, `buildEquipmentAutoReplaceAction` | Detects ring/amulet slots, checks emptiness, finds replacement items in containers, resolves opaque item labels through vendored metadata, and emits equipment move actions. |
| [`hotbar.mjs`](../lib/modules/hotbar.mjs) | `normalizeHotbarSelector`, `hotbarSlotMatches`, `findHotbarSlot`, `buildHotbarSlotAction` | Selects hotbar slots by index, kind, action type, label, words, spell name, item id, category, and enabled state; emits hotbar slot actions while preserving discovered hotkey metadata. |
| [`inventory.mjs`](../lib/modules/inventory.mjs) | `normalizeItemSelector`, `entryMatchesSelector`, `findInventoryEntries`, `buildInventorySourceRef`, `summarizeContainers`, `findContainer`, `findFirstEmptyContainerSlot`, `findStackTarget` | Normalized inventory selection, source-address building, container summaries, empty-slot lookup, and stack merge target lookup. |
| [`looter.mjs`](../lib/modules/looter.mjs) | `findLootSourceContainers`, `findLootableCorpses`, `buildCorpseOpenAction`, `buildLootPlan` | Corpse detection, corpse scoring, corpse open action creation, loot keep/skip filtering, category inference, item metadata resolution, and preferred-container routing. |
| [`loot-economics.mjs`](../lib/modules/loot-economics.mjs) | `getNpcBuyValue`, `getVisibleTradeSellValue`, `resolveLootSellValue`, `summarizeLootEconomics`, `buildCapacityAwareAutosellRequests` | Loot value lookup from visible trade or vendored NPC buy catalogs, total loot-value summaries, unknown-value tracking, and capacity-aware autosell request generation. |
| [`npc-dialogue.mjs`](../lib/modules/npc-dialogue.mjs) | `NPC_DIALOGUE_WINDOW`, `normalizeDialogueMessage`, `buildDialogueMessageSignature`, `findBankBalanceInText`, `findBankBalanceFromMessages`, `normalizeDialogueOption`, `normalizeDialogueState`, `findDialogueOption`, `hasSpeakerMatch`, `findMatchingDialogueMessage` | Dialogue message/option normalization, recent-message signatures, bank-balance parsing, option lookup, speaker matching, and text-pattern matching. |
| [`progression.mjs`](../lib/modules/progression.mjs) | `DEFAULT_NPC_GREETING`, `DEFAULT_NPC_FAREWELL`, `PROGRESSION_WORKFLOW_ACTIONS`, `buildOpenNpcDialogueStep`, `buildCloseNpcDialogueStep`, `buildTravelToCityStep`, `buildSetResidenceStep`, `buildBuyBlessingStep`, `buildBuyAllMissingBlessingsStep`, `buildBuyPromotionStep`, `buildDailyTaskStep`, `buildProgressionWorkflowStep` | NPC progression step builders for opening/closing dialogue, city travel, residence, blessings, missing-blessing purchase, promotion purchase, daily task accept/reward flows, and ordered progression workflows. |
| [`refill.mjs`](../lib/modules/refill.mjs) | `buildRefillRequests`, `buildRefillPlan`, `hasRefillNeed`, `buildRefillRuntimePlan`, `buildRefillReport`, `chooseRefillAction` | Supply deficit detection from vocation policy, buy/sell request generation, autosell request prepending, visible trade matching, runtime shop-plan creation, report summaries, and first executable refill action selection. |
| [`shopper.mjs`](../lib/modules/shopper.mjs) | `SHOP_OPERATION_TYPES`, `normalizeShopRequest`, `buildShopAction`, `normalizeTradeState`, `findTradeEntryForRequest`, `buildExecutableShopAction`, `prioritizeShopRequests` | Shop request normalization, buy/sell/sell-all action creation, trade-state normalization, visible item matching, and sell-before-buy prioritization. |
| [`sustain.mjs`](../lib/modules/sustain.mjs) | `summarizeSustainStatus`, `buildSustainAction` | Vocation sustain status and action planning for emergency spell, health potion, mana potion, food, low supplies, and ammo status. |

## Action Surface Used By Modules

Current shared action types in [`lib/action-router.mjs`](../lib/action-router.mjs):

- `useHotbarSlot`
- `useHotkey`
- `moveInventoryItem`
- `useItem`
- `useItemOnSelf`
- `useItemOnTarget`
- `useItemOnTile`
- `openContainer`
- `openNpcDialogue`
- `closeNpcDialogue`
- `speakNpcKeyword`
- `sayNpcKeyword`
- `chooseNpcOption`
- `chooseNpcTradeOption`
- `buyItem`
- `sellItem`
- `sellAllOfItem`
- `travelToCity`
- `setResidence`
- `buyBlessing`
- `buyAllMissingBlessings`
- `buyPromotion`
- `dailyTask`
- `runProgressionWorkflow`
- `progressionWorkflow`

Modules that need a new mechanical interaction should add it to the shared
action layer first, then call it from the module planner or bot-core runtime.

## Primary Tests

Use these tests when changing module behavior:

- [`test/runtime-modules.test.mjs`](../test/runtime-modules.test.mjs): tick ordering and runtime module execution
- [`test/bot-core.test.mjs`](../test/bot-core.test.mjs): core bot behavior, movement, conversion, sustain/healer ordering, anti-idle, and action execution
- [`test/sustain.test.mjs`](../test/sustain.test.mjs): sustain planner
- [`test/looter.test.mjs`](../test/looter.test.mjs): looting and container routing
- [`test/banking.test.mjs`](../test/banking.test.mjs): banking rules and bank waypoints
- [`test/refill.test.mjs`](../test/refill.test.mjs): refill requests and shop actions
- [`test/shopper.test.mjs`](../test/shopper.test.mjs): shop normalization and prioritization
- [`test/progression.test.mjs`](../test/progression.test.mjs): NPC progression step builders
- [`test/minibia-snapshot.test.mjs`](../test/minibia-snapshot.test.mjs): normalized module-facing snapshot
- [`test/action-layer.test.mjs`](../test/action-layer.test.mjs): shared actions and primitive execution
- [`test/desktop-renderer.test.mjs`](../test/desktop-renderer.test.mjs): desktop module editor, quick cards, modals, and payloads
