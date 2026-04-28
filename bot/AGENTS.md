# AGENTS.md - Minibot

Critical AI-facing repository contract. Keep documentation lean: edit canon
before adding prose, and delete stale working notes after their durable truth is
folded into canon.

## Canon

This repository has exactly ten canonical markdown files inside `bot/`:

1. `AGENTS.md` - repository operating contract and documentation policy
2. `README.md` - product overview, setup, entry points, and repo layout
3. `CANONICAL.md` - stable engineering invariants and precedence
4. `docs/ARCHITECTURE.md` - runtime shape and ownership boundaries
5. `docs/MODULES.md` - module keys, rule arrays, tick order, and tests
6. `docs/MINIBIA_RUNTIME_SURFACE.md` - normalized module-facing snapshot contract
7. `docs/MINIBIA_ACTION_PRIMITIVES.md` - shared action-layer contract
8. `docs/UI_UX.md` - desktop control-surface contract
9. `docs/OPERATIONS.md` - operator procedures, persistence, and transfer behavior
10. `todo.md` - the only canonical open-work queue

The bundle root has one additional canonical file: `../README.md`. It describes
the portable `minibia/` wrapper only.

No other markdown or documentation JSON files are canonical. Do not create
parallel research, audit, roadmap, handoff, or "next agent" documents.

## Precedence

When documentation and implementation disagree, use this order:

1. code and tests
2. `AGENTS.md`
3. `CANONICAL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/MODULES.md`
6. `docs/MINIBIA_RUNTIME_SURFACE.md`
7. `docs/MINIBIA_ACTION_PRIMITIVES.md`
8. `docs/UI_UX.md`
9. `docs/OPERATIONS.md`
10. `todo.md` for open work only

`todo.md` cannot redefine runtime contracts, UI behavior, persistence schema, or
module rule shapes. It only records work that is not done yet.

## Working Notes

`temporals/` is the only allowed scratch-doc tier.

Rules:

- filenames must be lowercase kebab-case `.md`
- each temporal must start with `created_at`, `expires_at`, `timezone`, and `reason`
- the expiry window is 24 hours from creation
- temporals never override code or canonical docs
- if a temporal gains durable truth, fold that truth into canon and delete it

## Immediate Rules

1. Run `git status --short` before edits and preserve unrelated local changes.
2. Update the owning canonical doc in the same change that alters a contract,
   workflow, module surface, UI rule, launch flow, or persistence path.
3. Prefer editing an existing canonical doc over adding a new file.
4. Move open work into `todo.md`, not a new handoff file.
5. Move stable runtime or product truth into the owning canonical doc, not into
   `todo.md`.
6. Delete stale duplicate documentation once canon is updated.
7. Runtime behavior belongs in `lib/`; renderer event handlers should stay
   presentation-oriented.

## Task Entry Points

- setup and layout: `README.md`
- invariants and doc precedence: `CANONICAL.md`
- runtime structure: `docs/ARCHITECTURE.md`
- module behavior and rule shapes: `docs/MODULES.md`
- shared snapshot fields: `docs/MINIBIA_RUNTIME_SURFACE.md`
- action mechanics: `docs/MINIBIA_ACTION_PRIMITIVES.md`
- UI and editor behavior: `docs/UI_UX.md`
- operator flows, persistence, and transfer: `docs/OPERATIONS.md`
- open work: `todo.md`
