# UI / UX Contract

This document defines the current desktop control surface and the rules future UI changes should respect. For architecture details, use [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md). For operator procedures, use [`docs/OPERATIONS.md`](./OPERATIONS.md).

## Purpose

The Minibot desktop is a dense operator desk, not a marketing UI. The priorities are:

- fast state reading
- low-friction control of a live session
- clear separation between summary views and edit surfaces
- safe handling of destructive or session-sensitive actions

## Screen Map

### Top Strip

The header owns session-level controls:

- live character tabs
- `New Session`
- `Close Session`
- `Scan All Tabs`
- `Close Client`
- `New Route`
- `Saved Files`
- `Accounts`
- `Route Panel`
- `Hunt Studio`
- `Compact View`
- `Desk Pinned`
- `Presets`

Every discovered character gets one tab. Busy characters remain visible but must present as read-only.

Each tab must expose its live state badge plus compact `HP`, `P`, and `WP` chips so operators can read health, nearby-player pressure, and route position without opening another surface.

Tab order is operator-controlled. Drag-reorder must survive live refreshes unless the operator changes it again.

### Left Column

The left rail is the module and utility desk.

Current summary cards and quick toggles cover:

- cavebot master stop
- session waypoint overlays
- healer
- trainer
- reconnect
- death heal
- mana trainer
- auto eat
- ring and amulet auto replace
- rune maker
- spell caster
- hunt summary
- field safety
- looting
- banking
- anti-idle
- alarms
- follow chain
- auto light
- auto convert
- rookiller

Not every card opens the shared module modal:

- `Hunt` opens the dedicated Hunt Studio modal
- `Field Safe` and waypoint overlay controls point into route-focused surfaces
- healer, death heal, trainer, mana trainer, auto eat, ring and amulet auto replace, rune maker, spell caster, auto light, auto convert, reconnect, alarms, anti-idle, looting, banking, and follow chain use the shared module modal

### Center Column

The center rail is the route desk.

It contains:

- route overview metrics for route name, waypoint count, tile-rule count, selected item, and saved-file count
- live route toggles for walk, loop, record, and route-persisted waypoint overlay
- quick actions for add waypoint, reconnect now, stop aggro, return to waypoint `1`, open route panel, quick save, and route off
- live route preview that mirrors waypoint order and state

The route builder modal is the canonical editor for route files, waypoint stacks, tile rules, route-danger actions, route-local sustain settings, and route-persisted waypoint overlay preference. The route surface may trigger the immediate `Reconnect Now` action, but reconnect retry policy belongs to the Reconnect module editor. Hunt-state editing belongs to Hunt Studio; the route surface may show hunt summaries and deep-link to Hunt Studio, but route save must not read hidden Hunt DOM state.

### Right Column

The right rail is the console:

- recent activity feed
- log modal entry point

It is the passive visibility surface for runtime state and operator feedback.

### Compact View

Compact view is an alternate presentation of the same desk. It mirrors:

- desk commands
- route toggles and quick actions
- module quick opens and power toggles
- route file access and logs entry points

Compact view must never introduce a second configuration model.

### Modal Set

Current modal surfaces are:

- hunt studio
- route builder
- route-library quick picker
- accounts
- shared module editor
- logs
- presets

The shared module editor is reused for:

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
- anti-idle
- looting
- banking
- follow chain

The Hunt Studio modal is the focused editor for persisted hunt state. Route Builder may summarize that state and open this modal, but Hunt Studio is the only UI owner for target queues, target profiles, shared-spawn policy, fallback combat rules, once, dry-run, runtime target polling fields, registry controls, and presets.

Modals are the canonical edit surfaces. Summary cards should open the relevant modal or focus the relevant control inside it.

## Interaction Rules

### Single Source Of Truth

- Every feature gets one canonical editor surface.
- Summary cards, quick toggles, compact cards, and live-preview widgets may open or mirror that surface, but they must not fork configuration state.
- If a new shortcut is added, it should point into the existing editor rather than create another copy of the same controls.

Current ownership split:

- route builder modal: route file, route-local vocation and sustain settings, waypoints, tile rules, route-persisted waypoint overlay preference, route danger actions, and route-context Hunt Studio entry points
- Hunt Studio modal: target queue, shared-spawn policy, target profiles, creature registry, player and NPC watch, fallback combat motion, once, dry-run, and presets
- shared module modal: healer, death heal, trainer, mana trainer, auto eat, ring and amulet auto replace, rune maker, spell caster, auto light, auto convert, reconnect, alarms, anti-idle, looting, banking, follow chain
- accounts modal: account registry records, login method, stored secret policy, preferred character, character list, reconnect policy, and notes

### Session Model

- Session tabs are character-centric, not raw page-centric in the UI wording.
- Active-session changes can reset session-scoped drafts.
- A busy claimed session stays visible so the operator understands why it cannot be edited.
- Starting and stopping the bot is a session action, not a global action.
- Compact view must respect the same claimed and detached-session states as the full desk.

### Draft Safety

- Background state refreshes must not overwrite focused form inputs.
- Unsaved route, targeting, and module edits should survive background events while the same session stays active.
- Switching to another active session is allowed to drop the previous session draft.

### Route Interactions

- Clicking a live route preview tile selects it and opens the route editor.
- Double-clicking a waypoint row opens the editor directly.
- Right-clicking a waypoint row or live preview tile resumes the route from that waypoint.
- The route preview and route stack should keep fixed square tiles and scroll rather than squeeze to fit.
- Quick insert-before, remove, mark, and batch-delete flows belong to the route stack and must stay in sync with the live preview.
- Live next-waypoint highlighting is separate from editor selection and should suppress itself while reset return is still active.
- Route overview metrics should deep-link into the route builder modal or the saved-route quick picker as appropriate.
- Waypoint quick-open shortcuts land on the relevant control inside the route builder modal.
- Route reset, clear, delete, and archive clear flows require explicit confirmation or undo paths.
- The route overview should show live metrics only. Placeholder cards or dead slots are not acceptable in the shipping desk.

### Module Interactions

- Module rules run top to bottom and the UI must communicate that ordering.
- Module cards may expose power toggles, but rule editing stays in the shared module modal unless the feature belongs to targeting or route surfaces.
- Full and compact module cards must mirror the same effective state. The
  Alarms card, in particular, mirrors `alarmsEnabled` and shows player
  proximity alarms as armed or off in both layouts.
- Healer messaging must preserve the downward-safe coverage model instead of implying isolated HP bands.
- Trainer messaging must make clear that it reuses anti-idle, auto-eat, healer, death-heal, and reconnect policy from their owning modules while keeping trainer-only partner, trainer mana, reconnect-while-training, and escape controls in the Trainer modal.
- Auto eat messaging must make clear that it can source food from hotbar, equipped slots, or open containers, and it should outrank anti-idle when both are ready.
- Ring and amulet replacement messaging must summarize both slot targets plus their repeat margin and combat or movement gates.
- Anti-idle messaging must make clear that it fires only after real inactivity crosses the configured delay and may use a non-visible keepalive path before any input-style fallback.
- Follow chain messaging must make the chain order clear: each member follows the name directly above it, and the default role can still be overridden per member.

### Utility Controls

- Session waypoint overlays are an all-live-tabs view control, not a second route editor; route waypoint overlay remains the route-persisted preference for the active character.
- `Cavebot Pause` pauses route and hunt automation across live tabs while keeping healer and utility rules available.
- `Compact View` is a layout toggle, not a stateful mode that changes session behavior.

### Alerts And Feedback

- Session tabs carry the strongest live alert states.
- The tab chips are part of that alert surface: `HP` shows current health, `P` shows nearby-player count or `P -` when clear, and `WP` shows the current waypoint index.
- Low-HP, player-watch, staff-like, stale, and death alerts must remain visually distinct from idle or normal running state.
- Staff-like names are a stronger player alert, not a separate hidden state; the tab must surface them visually and in accessible tab labeling.
- Continuous alarm states for low HP, nearby players, and GM/GOD visibility should survive rerenders until the live condition clears.
- Route reset completion should emit a takeover-ready signal.
- The recent activity console should stay pinned to the active tab context and keep newest events first.
- The Logs modal should include lightweight runtime timing for tick, live patch, live-state serialization, renderer render, and log rendering so hot-path changes can be based on live measurements.
- Busy buttons must stay visibly busy through rerenders while async actions are in flight.

### Accessibility And Keyboard

- Cards that act like buttons must expose button semantics.
- Modals must trap focus while open.
- Keyboard activation should work for route and targeting summary cards.
- Focus targets inside modals matter; quick-open actions should land on the relevant field when possible.
- Hover-only window controls still need brief readable tooltips.
- Checkbox controls inside modals should render as compact switch rows with
  readable text labels, visible focus/disabled states, and no badge-sized
  checked labels.

## Canonical Terminology

- `session`: one discovered live browser page represented inside Minibot
- `character tab`: the UI label for a session in the top strip
- `target queue`: ordered monster names to engage
- `target profile`: per-monster combat preference and spacing rules
- `route`: named saved route profile
- `waypoint`: route spine entry that advances progress
- `tile rule`: local spatial rule layered on top of the waypoint spine
- `route reset`: return to waypoint `1` and hold for takeover
- `stop aggro`: clear target lock and hold the character out of combat
- `busy`: character claimed by another Minibot desk
- `compact view`: alternate presentation of the same desk state

## Change Checklist

Before shipping a UI change, verify:

- the feature still has one canonical editor surface
- quick controls and modals stay in sync
- compact view mirrors the same state and actions as the full desk
- background refreshes do not clobber focused edits
- busy or detached session states remain understandable
- destructive flows still require deliberate confirmation
- renderer tests cover the new interaction or state
