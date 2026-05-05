# Open Work

This is the only canonical open-work queue for `bot/`. Do not create parallel
handoff, roadmap, audit, or next-agent markdown.

Last verification baseline:

- date: 2026-05-05, America/Santiago
- smoke run: `npm test` -> `106` passed, `0` failed
- route validation: `node scripts/validate-routes.mjs` -> `36` route files,
  `0` errors, `586` warnings
- structure check: `npm run check:structure` -> OK
- audit context: canonical documentation audit/update pass against the current
  dirty worktree; unrelated local changes were not reverted

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

Completed in the 2026-04-30 P1 second-half pass:

- Route profile packs now export/import route, targeting, sustain, loot,
  refill, banking, alarms, party, options, notes, schema version, and
  compatibility metadata through validation-first desktop controls.
- Route pack import shows a diff, route validation report, migration warnings,
  and read-only state for newer schema packs before an explicit apply. Local
  ledgers, claims, secrets, active pauses, and runtime leases are excluded.
- Route recorder diagnostics now write validation and warning sidecars,
  including unsafe/floor-change exclusions, disconnected safe tiles, missing
  coverage, generated-label notes, and incomplete recording reasons. Live
  route recording can infer one-floor stair transitions with landing anchors.
- Route validation and metadata diagnostics now surface generated-label-only
  routes, linear no-return routes, missing loot destinations, empty banking
  rules, empty follow-chain members, disabled alarm scopes, and item/tile
  categories for fields, food, furniture, obstacles, traps, stairs, ladders,
  holes, and blocked tiles.
- Stability gates for this pass:
  `npm test` -> `792` passed, `0` failed;
  `node --test --test-concurrency=1 test/config-store.test.mjs` -> `14`
  passed, `0` failed;
  `node --test --test-concurrency=1 test/route-validation.test.mjs` -> `5`
  passed, `0` failed;
  `node --test --test-concurrency=1 test/record-same-floor-route.test.mjs test/minibia-item-metadata.test.mjs`
  -> `6` passed, `0` failed;
  `node --test --test-concurrency=1 test/desktop-renderer.test.mjs` -> `117`
  passed, `0` failed;
  `npm run check:structure` -> OK;
  `node scripts/validate-routes.mjs` -> `36` route files, `0` errors,
  `586` warnings.

Completed in the 2026-04-30 P1 first-half pass:

- Hunt ledger and loot economy reporting now track XP, kills, loot value,
  profit rate, supply burn, rare drops, deaths, pauses, stucks, route loops,
  unknown-value items, protected loot decisions, recent events, and top loot
  rules from runtime state.
- Capacity-aware loot handling now emits explicit decisions for continue,
  sell branch, depot branch, drop-low-value, pause, or skip, with protected,
  unknown, sellable, and low-value item context for the operator.
- Targeting now emits a transparent target-scoring report with selected target,
  top candidates, score factors, skipped reasons, and movement intent shared
  with distance/stance behavior.
- Alarms now have a protector status path that can log, pause route, stop
  targeter, require acknowledgement, preserve route position, and resume from
  the desktop logs surface while healer and utility decisions remain available.
- Desktop state serialization and the Logs modal now expose Hunt Ledger, Loot
  Rules, Target Scores, Stance Intent, and Protector acknowledgement blocks.
- Targeted stability gates for this pass:
  `node --test --test-concurrency=1 test/loot-economics.test.mjs` -> `4`
  passed, `0` failed;
  `node --test --test-concurrency=1 test/bot-core.test.mjs` -> `443`
  passed, `0` failed;
  `node --test --test-concurrency=1 test/desktop-renderer.test.mjs` -> `118`
  passed, `0` failed;
  `npm test` -> `798` passed, `0` failed.

Completed in the 2026-04-30 open queue closure pass:

- Route recorder output now keeps structured intent hints for service NPCs,
  shop/trade windows, corpse pauses, and visible tool/floor-transition tiles in
  route knowledge and attached waypoint metadata.
- Runtime diagnostics now surface common setup blockers such as looting stuck,
  backpack/window state loss, depot/deposit naming mismatch, targeter blockers,
  NPC dialogue failures, route tile blockers, and active protector state through
  the serialized session and Logs surface.
- The remaining P1/P2 queue items were closed without changing the frozen work
  boundaries for refill orchestration, daily tasks, or trainer/runemaking
  productization.
- Stability gates for this pass:
  `npm test` -> `799` passed, `0` failed;
  `npm run check:structure` -> OK;
  `node scripts/validate-routes.mjs` -> `36` route files, `0` errors,
  `586` warnings.

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

No open P1 items remain in this queue after the 2026-04-30 open queue closure
pass. Add new P1 items here only when they are explicit, non-frozen work with
an owner surface, tests, and docs scope.

## P2

No open P2 items remain in this queue after the 2026-04-30 open queue closure
pass. Future renderer splits should be added as scoped follow-up work only when
they preserve the existing desktop renderer contracts.

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
