# Open Work

This is the only canonical open-work queue for `bot/`. Do not create parallel
handoff, roadmap, audit, or next-agent markdown.

Last verification baseline:

- date: 2026-04-28, America/Santiago
- full run: `npm test` -> `675` passed, `0` failed
- static renderer checks:
  - `desktop/index.html` has `409` IDs and `0` duplicate IDs
  - all `data-proxy-click`, `data-focus-target`, and
    `data-focus-route-builder` selectors resolved
  - `MODULE_RULE_SCHEMAS` and `MODULE_RULE_UI` module keys matched
- audit context: full feature-module and frontend ownership audit against the
  current dirty worktree; unrelated local changes were not reverted

Recommended execution depth:

- Use `xhigh` reasoning for P0 ownership-boundary work. These tasks touch
  renderer state, route/hunt/module persistence contracts, compact mirroring,
  and docs/tests at the same time.
- Use at least `high` reasoning for P1 runtime and visual polish work.
- Use normal/medium only for isolated mechanical fixes after a P0 owner has
  already defined the boundary and test plan.

## P0

No open P0 items remain after the 2026-04-28 ship-night boundary pass.

Completed in this pass:

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

Stability gates for this pass:

- `npm test` passed with `667` tests, `0` failures.
- `node --test --test-concurrency=1 test/desktop-renderer.test.mjs` passed with
  `110` tests, `0` failures.
- Static renderer shell checks found `409` IDs, `0` duplicate IDs, resolved
  proxy/focus selectors, and aligned module schema/UI keys.

## P1

1. Collect live baselines from the new desktop hot-path timing.
   - `desktop/main.mjs` currently sends live state patches every `750ms`, then
     backs off by `350ms` for each additional running session up to `2500ms`.
   - Tick, live patch, live-state serialization, renderer render, and log
     render timing now surface in the Logs modal.
   - `renderLogs()` still rebuilds the newest-first feed when log content
     changes, but the full log output now appends one-line growth instead of
     joining the entire feed for simple appends.
   - Remaining work is to capture real multi-client baselines, compare patches
     with and without logs, then tune cadence or payload width only if the
     timings justify it.
   - Primary files: `desktop/main.mjs`, `desktop/renderer.js`,
     `lib/bot-core.mjs`, `test/desktop-renderer.test.mjs`,
     `test/runtime-modules.test.mjs`.

2. Harden account and trainer bootstrap against live edge cases.
   - Automated coverage includes rate-limit text and hidden login-form cases.
   - Remaining work is live validation for multi-character launch groups,
     stored-secret handling, rate-limit recovery, and portable-client profile
     reuse on real machines.
   - Primary files: `lib/trainer-bootstrap.mjs`, `lib/browser-session.mjs`,
     `lib/config-store.mjs`, `desktop/main.mjs`, `desktop/renderer.js`,
     `test/trainer-bootstrap.test.mjs`, `test/browser-session.test.mjs`.

3. Prove long-running multi-client route reliability.
   - Automated tests cover route reset, corpse return, helper recovery,
     route-spacing leases, follow-chain stair recovery, and cavebot pause
     utility behavior.
   - Remaining work is live soak testing with multiple characters on the same
     route and real disconnect/reconnect events.
   - Record only durable findings in the owning canonical doc; temporary run
     notes belong in `temporals/` and must expire within 24 hours.

4. Refactor the renderer monolith only after ship blockers are resolved.
   - `desktop/renderer.js` is about 19k lines and currently owns dashboard,
     modal rendering, drafts, compact view, route tools, Hunt Studio, module
     schema, event wiring, and feedback state.
   - Do not start a broad rewrite tonight. After ship, split by existing
     ownership boundaries: route, hunt, module editor, compact mirror,
     sessions/alerts, and shared DOM utilities.
   - Primary files: `desktop/renderer.js`, `test/desktop-renderer.test.mjs`.

## P2

1. Build route-aware progression loops on top of the existing shared actions.
   - Current primitives cover NPC dialogue, travel, residence, blessings,
     missing-blessing purchase, and promotion purchase.
   - Missing work is orchestration: when to travel, when to refill, when to
     return to hunt, and how failures resume safely.

2. Complete end-to-end refill, shop, and autosell loops.
   - Current modules can build refill requests and execute visible trade
     actions.
   - Missing work is robust route/NPC/shop sequencing, autosell preparation, and
     operator-grade reporting for what was bought or sold.

3. Add daily-task automation only after progression orchestration is stable.
   - The normalized snapshot exposes task state.
   - Missing work is task discovery, task acceptance/turn-in policy, route
     handoff, and reward handling.

4. Improve loot economics.
   - Current looting opens corpses, filters items, routes kept items, and tracks
     loot telemetry from messages and corpse actions.
   - Missing work is alert-grade profit counters, item valuation,
     capacity-aware sell planning, and durable hunt summaries.

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
