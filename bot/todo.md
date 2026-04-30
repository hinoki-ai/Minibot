# Open Work

This is the only canonical open-work queue for `bot/`. Do not create parallel
handoff, roadmap, audit, or next-agent markdown.

Last verification baseline:

- date: 2026-04-30, America/Santiago
- full run: `npm test` -> `778` passed, `0` failed
- route validation: `node scripts/validate-routes.mjs` -> `36` route files,
  `0` errors, `586` warnings
- structure check: `npm run check:structure` -> OK
- audit context: refill supply-plan progress pass against the current dirty
  worktree; unrelated local changes were not reverted

Recommended execution depth:

- Use `xhigh` reasoning for P0 ownership-boundary work. These tasks touch
  renderer state, route/hunt/module persistence contracts, compact mirroring,
  and docs/tests at the same time.
- Use at least `high` reasoning for P1 runtime and visual polish work.
- Use normal/medium only for isolated mechanical fixes after a P0 owner has
  already defined the boundary and test plan.

Readiness gate for new PRD work:

- New features may start hidden, experimental, or runtime-only, but they should
  not be presented as finished product until they have one owner module, one
  canonical editor surface, normalized action results, decision-trace reasons,
  failure states, tests, and documentation in the owning canonical doc.
- Any feature that depends on uncertain snapshot fields must expose
  `unknown/stale/confident` behavior before it can act automatically.
- Any route/profile schema change needs load compatibility, validation, and a
  migration or read-only warning path before routes can save the new shape.
- Any multi-client feature must respect claim files, route-spacing ownership,
  and support-role emergency self-heal priority before it is enabled by default.
- Do not introduce packet hooks, memory scanning, stealth, anti-cheat bypass,
  staff evasion, official Tibia automation, speed hacks, floor/wall spy, or PvP
  grief tooling.

## Recently Completed Boundary

Completed in the 2026-04-28 ship-night boundary pass:

- Compact view mirrors looting and banking summaries from the full desk.
- Route save no longer persists hidden Hunt Studio DOM state; Hunt Studio owns
  hunt saves and Route Builder deep-links to it.
- Reconnect retry policy has one canonical editor in the Reconnect module;
  Route keeps only the immediate `Reconnect Now` session action.
- Logs has visible desktop and compact entry points; the dead About modal and
  renderer state were removed.
- Modal polish no longer blanket-hides operational notes, live status lines, or
  general `small` text inside modal panels.
- Trainer shows inherited service status and deep-links to owner modules instead
  of editing shared anti-idle, auto-eat, healer, death-heal, or reconnect
  policy keys.
- Session waypoint overlays and route-persisted waypoint visibility are labeled
  and tested as separate controls.

Completed in the 2026-04-30 trace/confidence pass:

- Normalized snapshot confidence now reports `unknown`, `stale`, or
  `confident` for self, creatures, tiles, inventory, hotbar, NPC/trade,
  messages, route, and party families.
- Runtime decisions now emit a shared decision trace with current owner,
  blocker, required snapshot families, action/result reason, and derived route
  state telemetry.
- Condition healer, looting, refill, banking, targeter, spell caster, distance
  keeper, and route movement now skip confidence-blocked actions with
  normalized reasons instead of guessing.
- Desktop console, compact view, and logs modal now mirror the same decision
  trace from live session state.

Stability gates for this pass:

- `npm test` passed with `667` tests, `0` failures.
- `node --test --test-concurrency=1 test/desktop-renderer.test.mjs` passed with
  `110` tests, `0` failures.
- Static renderer shell checks found `409` IDs, `0` duplicate IDs, resolved
  proxy/focus selectors, and aligned module schema/UI keys.

Completed in the 2026-04-30 P0 completion pass:

- Decision trace, snapshot confidence, sustain/healer safety, cavebot route
  state telemetry, route validation, and live-stability gates are now covered by
  canonical code, renderer surfaces, tests, and docs.
- Route validation is a read-only library/CLI flow with desktop warnings,
  broken-waypoint highlighting, and high-risk start acknowledgement; current
  checked-in and portable routes validate with `0` errors and `584` warnings.
- Runtime tests cover confidence-blocked loot/route/target decisions, party
  confidence for friend heal, healer priority, looting/refill before movement,
  explicit route waypoint automation, anti-idle behavior while paused, and
  live-transport isolation for injected snapshots.
- A read-only live baseline was captured from three active local clients on
  port `9224`; all were ready with confident snapshot families. Temporary run
  details are in `temporals/live-stability-baseline-2026-04-30.md`.
- Stability gates for this pass:
  `npm test` -> `752` passed, `0` failed;
  `npm run check:structure` -> OK;
  `node scripts/validate-routes.mjs` -> `35` route files, `0` errors,
  `584` warnings.

Completed in the 2026-04-30 cavehunt stairhop/loop pass:

- Runtime route recovery now treats floor-changing waypoints as conservative
  bridges: missed stair advances can relatch only when forward route evidence
  reaches the player's current `z`, and wrong-direction floor changes remain in
  recovery instead of being counted as progress.
- Route control now persists, validates, and executes label-only `goto` loops
  through `targetLabel`, with `gotoLabel` and `labelTarget` retained as load
  aliases for older route JSON.
- Cavebot research findings were folded into the canonical module and
  architecture docs: typed floor-change waypoints, immediate landing anchors,
  and label-based retake loops are the documented route-design rules.
- Targeted stability gates for this pass:
  `node --test --test-concurrency=1 test/bot-core.test.mjs` -> `436` passed,
  `0` failed;
  `node --test --test-concurrency=1 test/route-validation.test.mjs` -> `4`
  passed, `0` failed;
  `node --test --test-concurrency=1 test/runtime-modules.test.mjs` -> `36`
  passed, `0` failed;
  `node scripts/validate-routes.mjs` -> `36` route files, `0` errors,
  `586` warnings;
  `npm test` -> `770` passed, `0` failed.

## P0

No open P0 items remain in this queue after the 2026-04-30 completion pass.
Future work that expands bot power should start from P1 or be added here only
if it blocks safe operation.

## Frozen

These items are intentionally frozen by operator direction on 2026-04-30. Do
not resume them unless they are explicitly unfrozen.

1. Refill, banking, shopping, and travel orchestration.
   - Scope frozen: the full resumable hunt -> low supply/cap/gold ->
     bank/sell/buy/travel -> return-to-hunt loop.
   - Existing runtime support may stay in place, but do not expand this into a
     larger product workflow while frozen.

2. Daily-task automation.
   - Scope frozen: task discovery, task acceptance/turn-in policy, route
     handoff, and reward handling.

3. Trainer, runemaking, and resource-gated utility hardening.
   - Scope frozen: trainer partner-productization, standalone utility-mode
     expansion, runemaking policy work, and enchanting-like utility flows.

Frozen context retained for later:

- Refill/bank/shop/travel:
   - Current modules can plan refill requests, visible trade actions, banking
     conversations, and NPC actions. Missing work is orchestration.
   - Started: runtime can now branch from a hunt waypoint into a hidden
     refill-loop service leg, preserve return context with `refillRole`, and
     pause with a reason when shop dialogue/trade retries or active loop
     bank/NPC service actions fail.
   - Advanced: hidden `refillPlan` now normalizes desired shop counts, minimum
     hunt counts, reserve gold, buy caps, protected items, sell lists, NPC
     names, shop keywords, city, travel destinations, depot branch, and return
     waypoint. Hunt branching uses the minimum counts while shop execution buys
     toward desired counts, enforces buy caps and carried-gold reserve, and uses
     plan NPC/keyword/branch/return metadata when waypoint-local values are not
     set.
   - Refill should branch from a hunt because supplies, cap, gold, or durability
     crossed thresholds, then return to the hunt through route waypoints.
   - Acceptance: a route can complete hunt -> low supply -> bank/sell/buy ->
     return; failed NPC dialogue pauses with a reason and never loops forever.
   - Primary files: `lib/modules/refill.mjs`, `lib/modules/shopper.mjs`,
     `lib/modules/banker.mjs`, `lib/modules/npc-dialogue.mjs`,
     `lib/bot-core.mjs`, `desktop/renderer.js`, `docs/MODULES.md`,
     `docs/OPERATIONS.md`, `test/refill.test.mjs`, `test/shopper.test.mjs`,
     `test/banking.test.mjs`.
- Daily tasks:
   - The normalized snapshot exposes task state.
   - Missing work is task discovery, task acceptance/turn-in policy, route
     handoff, and reward handling.
- Trainer/runemaking:
   - Trainer should keep partner detection, regrouping, low-HP escape, food,
     reconnect, and anti-idle as separate owned decisions with visible reasons.
   - Rune maker should stop clearly when mana, soul/resource state, blank runes,
     target state, movement state, or unsafe conditions are not satisfied.
   - Enchanting-like utilities should stay disabled unless vendored Minibia data
     declares the supported action and resource contract.
   - Acceptance: trainer can run without a selected route, and rune maker reports
     the exact missing resource or safety gate instead of silently idling.
   - Primary files: `lib/bot-core.mjs`, `lib/vocation-pack.mjs`,
     `desktop/renderer.js`, `docs/MODULES.md`,
     `test/bot-core.test.mjs`, `test/runtime-modules.test.mjs`.

## P1

1. Add hunt ledger and loot/economy reporting.
   - Track XP/hour, kills/hour, loot/hour, profit/hour, supply burn, rare drops,
     deaths, pauses, stucks, route loops, refill cycles, unknown-value items,
     and protected-item decisions.
   - Upgrade capacity-aware looting into explicit decisions: continue, skip,
     drop low-value, sell branch, depot branch, or pause.
   - Acceptance: operator can answer why the bot stopped, what it looted, what
     it spent, when it will refill, and which loot rules fired most.
   - Primary files: `lib/modules/looter.mjs`,
     `lib/modules/container-routing.mjs`, `lib/modules/loot-economics.mjs`,
     `lib/bot-core.mjs`, `desktop/renderer.js`, `docs/MODULES.md`,
     `docs/UI_UX.md`, `test/looter.test.mjs`,
     `test/loot-economics.test.mjs`.

2. Add transparent target scoring and stance unification.
   - Compute target scores from target profile order, danger, HP, distance,
     reachability, target count, ownership/shared-spawn policy, route role, and
     current target stickiness.
   - Unify target profile stance and distance-keeper output into one movement
     intent: hold, chase, approach, diagonal, distance, kite, lure, assist, or
     escape.
   - Acceptance: UI can show top target candidates, score breakdown, selected
     stance, and why higher rows were skipped.
   - Primary files: `lib/bot-core.mjs`, `desktop/renderer.js`,
     `lib/hunt-presets.mjs`, `docs/MODULES.md`, `docs/UI_UX.md`,
     `test/bot-core.test.mjs`, `test/hunt-presets.test.mjs`.

3. Expand alarms into a real protector system.
   - Add alarm types for low HP/MP, low supplies, no capacity, private message,
     disconnect, death, route stuck, no progress, stale target, rare loot, high
     incoming damage, and full backpack.
   - Add operator actions: sound, desktop notification, log, pause route, pause
     selected modules, stop targeter, and require acknowledgement.
   - Alarm pauses must record the alarm owner, paused modules, resume policy, and
     acknowledgement state without becoming staff-evasion or anti-detection
     behavior.
   - Acceptance: an alarm can pause route and targeter while healer remains
     active, and the operator can acknowledge/resume without losing route
     position.
   - Primary files: `lib/bot-core.mjs`, `desktop/renderer.js`,
     `docs/MODULES.md`, `docs/UI_UX.md`,
     `test/bot-core.test.mjs`, `test/desktop-renderer.test.mjs`.

4. Add route profile packs with validation-first import/export.
   - A pack should include route, targeting, sustain, loot, refill, banking,
     alarms, party, options, notes, schema version, and compatibility metadata.
   - Import must show a diff and validation report before replacing current
     state. Character-local ledgers, claims, secrets, active pauses, and runtime
     leases must never be exported.
   - Acceptance: operator can clone/import/export a route pack without editing
     JSON, and old packs load read-only with migration warnings when needed.
   - Primary files: `lib/config-store.mjs`, `desktop/renderer.js`,
     `docs/OPERATIONS.md`, `docs/UI_UX.md`, `test/config-store.test.mjs`,
     `test/desktop-renderer.test.mjs`.

5. Upgrade route recorder after validation exists.
   - Record walk nodes, floor changes, tool use, NPC open/travel/shop/bank
     hints, corpse pauses, safe-zone points, and route annotations.
   - The recorder should prefer useful route intent over raw noisy position
     spam, and it should attach warnings for inferred or uncertain actions.
   - Enhanced: runtime route recovery now relatches to the first forward
     floor-transition landing when a stair hop already changed `z`, and route
     validation warns when explicit floor-transition waypoints lack a nearby
     target-floor landing anchor. Transition waypoints now require the expected
     destination floor, so wrong-direction or extra-floor hops do not advance
     route state.
   - Acceptance: recorded routes need fewer manual edits for
     rope/shovel/ladder/travel/refill loops and pass route validation with
     actionable warnings.
   - Primary files: `scripts/record-same-floor-route.mjs`,
     `lib/bot-core.mjs`, `desktop/renderer.js`,
     `test/record-same-floor-route.test.mjs`.

6. Apply historical forum learnings as Minibot-native diagnostics and editors.
   - Use the forum research as pattern input only. Do not copy WindBot behavior,
     binaries, bypasses, official-server workflows, PvP abuse tools, or unsafe
     scripts.
   - Route quality: strengthen typed waypoint intent, label loops,
     floor-change landing anchors, helper/recovery points, route annotations,
     and validation-before-run feedback.
   - Navigation: expose leader/follower role, floor/position sync, route
     spacing, assist target, support status, shared supply/status summaries, and
     clear why-stopped telemetry for local multi-session Minibia control.
   - Targeting: show candidate monsters, score/reason breakdowns, skipped
     reasons, shared-spawn policy, distance window, stance intent, and the owner
     that blocked or selected the target.
   - Item and tile metadata: expand walkable furniture, fields, food, obstacle,
     trap, stair/ladder/hole, and blocked-tile diagnostics so stuck recovery can
     say which object or tile rule caused the decision.
   - Support hardening: turn repeated failure classes into validation and
     operator messages: unsupported client/runtime, looting stuck, depot/deposit
     naming mismatch, targeting not firing, backpack/window state loss, NPC
     dialogue failure, and route/profile compatibility mismatch.
   - Route packs and UI: make complete hunt profiles importable with route,
     targeting, sustain, loot, navigation/follow roles, notes, schema version,
     compatibility metadata, diff preview, validation report, and structured
     controls instead of raw JSON/script editing.
   - Acceptance: a route/profile author can load or import a hunt profile,
     understand every route/navigation/targeting blocker from visible reasons,
     diagnose common setup failures without reading logs, and start only after
     validation warnings are acknowledged.
   - Primary files: `lib/route-validation.mjs`, `lib/bot-core.mjs`,
     `lib/config-store.mjs`, `lib/minibia-item-metadata.mjs`,
     `desktop/renderer.js`, `docs/MODULES.md`, `docs/UI_UX.md`,
     `docs/OPERATIONS.md`, `test/route-validation.test.mjs`,
     `test/bot-core.test.mjs`, `test/config-store.test.mjs`,
     `test/desktop-renderer.test.mjs`.

## P2

1. Add a constrained JSON action-block system.
   - Support typed primitives first: `say`, `npcSay`, `wait`, `useItem`,
     `useHotbar`, `moveItem`, `openContainer`, `bank`, `shopBuy`, `shopSell`,
     `travel`, `deposit`, `withdraw`, `gotoLabel`, `pauseRoute`, `setOption`,
     `branchIf`, `emitAlert`, and `recordMetric`.
   - Conditions should use stable runtime fields only: HP/MP/cap/supply,
     inventory counts, nearby monster/player/NPC count, route position, recent
     normalized messages, active target profile, active owner, and last action
     result.
   - Acceptance: deposit/sell/refill blocks validate and execute without custom
     JavaScript; failed blocks pause with step index and reason.
   - Primary files: `lib/action-router.mjs`, `lib/action-primitives.mjs`,
     `lib/bot-core.mjs`, `docs/MINIBIA_ACTION_PRIMITIVES.md`,
     `test/action-layer.test.mjs`.

2. Add an AoE spell/rune solver only after target scoring and tile rules are
   shared.
   - Solver must respect target categories, monster count, player-safe policy,
     no-aoe zones, route no-go zones, cooldowns, mana, floor, line of sight, and
     target ownership.
   - Acceptance: solver can explain cast, skip due player, skip due count, skip
     due cooldown, skip due route tile rule, or skip due no safe tile.
   - Primary files: `lib/bot-core.mjs`, `docs/MODULES.md`,
     `docs/MINIBIA_RUNTIME_SURFACE.md`, `test/runtime-modules.test.mjs`.

3. Add party planner and shared summaries.
   - Productize follow chain into party roles, assist target, support allowlist,
     party pause/resume, regroup, spacing visualization, shared loot summary,
     and shared supply summary.
   - Acceptance: a two-character route keeps spacing, follows floor changes,
     assists targets, recovers from same-floor stalls, and never lets support
     rules override emergency self-heal.
   - Primary files: `lib/bot-core.mjs`, `desktop/renderer.js`,
     `docs/MODULES.md`, `docs/UI_UX.md`,
     `test/runtime-modules.test.mjs`, `test/desktop-renderer.test.mjs`.

4. Refactor the renderer monolith after P0 ownership and validation are stable.
   - `desktop/renderer.js` is about 19k lines and currently owns dashboard,
     modal rendering, drafts, compact view, route tools, Hunt Studio, module
     schema, event wiring, and feedback state.
   - Split by existing ownership boundaries: route, hunt, module editor,
     compact mirror, sessions/alerts, and shared DOM utilities.
   - Acceptance: no behavioral rewrite lands without tests preserving the
     existing renderer contracts.
   - Primary files: `desktop/renderer.js`, `test/desktop-renderer.test.mjs`.

## Guardrails

- Keep the desktop app as the canonical operator surface.
- Keep docs to the canonical set in `AGENTS.md`.
- Do not add another open-work or handoff document.
- Do not weaken runtime modules to hide UI cost.
- Do not add a second state model for existing UI surfaces.
- Do not let hidden modal DOM be the only owner of a save payload.
- Do not revert unrelated dirty-worktree changes.
- Treat a non-green `npm test` result as blocking unless the user explicitly
  asks for a narrower experiment.
