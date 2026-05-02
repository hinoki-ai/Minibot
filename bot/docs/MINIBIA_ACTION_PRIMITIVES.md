# Minibia Action Primitives

This document defines the shared action layer Minibot should converge on before larger MMORPG loops are added. For the normalized module-facing state that drives these actions, use [`docs/MINIBIA_RUNTIME_SURFACE.md`](./MINIBIA_RUNTIME_SURFACE.md).

## Why This Exists

Looting, banking, refill, shopping, blessings, travel, and daily tasks all depend on a small set of mechanical actions. If those actions are not centralized, each feature grows its own brittle CDP path.

The rule is simple:

- build shared actions first
- build behavior modules second

## Current Shared Action Surface

The repo now has a real shared action surface exposed through [`lib/action-router.mjs`](../lib/action-router.mjs).
The Electron external-control socket can execute the same action objects through
its `action` and `actionBlock` methods, so trusted agents should use this shared
surface instead of clicking the desktop UI.

Current action types:

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
- `actionBlock` / `block` for constrained JSON action blocks

Supporting files:

- [`lib/action-primitives.mjs`](../lib/action-primitives.mjs)
- [`lib/action-router.mjs`](../lib/action-router.mjs)
- [`lib/capability-probe.mjs`](../lib/capability-probe.mjs)
- [`lib/bot-core.mjs`](../lib/bot-core.mjs)

## What Already Uses It

The current repo already routes real behavior through the shared layer:

- vocation-aware sustain uses hotbar and consumable actions
- rule-based spell and consumable modules can use configured hotkeys before
  falling back to direct cast or hotbar/inventory execution
- looting uses shared inventory move planning
- route interaction actions reuse shared item-use paths
- NPC trade support uses row selection plus `buyItem`, `sellItem`, and `sellAllOfItem`
- refill planning emits normalized shop actions
- progression step builders emit travel, residence, blessing, promotion, daily-task, and workflow actions

Banking is slightly different today. The bank module currently layers a dialogue state machine on top of keyword send and recent-message parsing rather than exposing dedicated `depositAmount` or `withdrawAmount` action types through the router.

## Constrained Action Blocks

`executeActionBlock(...)` runs ordered JSON-only blocks. Blocks reject script-like
fields and support only typed primitives:

- `say`
- `npcSay`
- `wait`
- `useItem`
- `useHotbar`
- `moveItem`
- `openContainer`
- `bank`
- `shopBuy`
- `shopSell`
- `travel`
- `deposit`
- `withdraw`
- `gotoLabel`
- `pauseRoute`
- `setOption`
- `branchIf`
- `emitAlert`
- `recordMetric`

Conditions may read only stable runtime fields: HP/MP/capacity, supply and
inventory counts, nearby monster/player/NPC counts, route index or position,
recent normalized messages, active target profile, active decision owner, and
the last action result. A failed block pauses the route by default and reports
the failing `stepIndex`, primitive type, and reason. `pauseOnFailure: false` is
allowed for nested or exploratory blocks.

## Normalized Result Shape

Every routed action should return:

- `ok`
- `driver`
- `reason`
- `details`

Example:

```json
{
  "ok": true,
  "driver": "hook",
  "reason": "",
  "details": {
    "actionType": "buyItem",
    "transport": "buySelectedItem",
    "name": "Strong Mana Potion",
    "amount": 25
  }
}
```

This shape is produced by [`lib/action-router.mjs`](../lib/action-router.mjs) and matters because retry, fallback, and UI logging depend on it.

## Driver Model

The current driver model is lightweight but already explicit:

1. the router verifies that the requested action method exists on the bot
2. the bot method executes through the page-evaluated helper layer
3. the router normalizes the result and infers `driver`

Current `driver` values:

- `hook`: internal client hooks or non-input transports
- `input`: visible input-style transports such as mouse dispatch

The inference is based on result transport metadata today. If more explicit multi-driver execution lands later, keep the normalized result shape stable.

## Current Primitive Expectations

### Hotbar

Shared hotbar actions already support:

- slot addressing by index
- spell-word matching
- item-backed hotbar use
- `self` and `target` use-on-creature handling for item-backed slots
- carried hotkey metadata from the live snapshot
- normalized slot metadata from the snapshot layer

When a consumable planner resolves an item from the hotbar, it should keep the
requested `target`, `name`, and `category` on the emitted `useHotbarSlot`
action. Healing runes and potions must not lose self-targeting just because the
item came from a hotbar slot.

### Hotkeys

Shared hotkey actions already support:

- normalized key names such as `F1`, `Shift+F1`, `Control+F2`, `Space`, `Enter`, `Escape`, and `Tab`
- modifier ordering and aliases such as `Ctrl`, `Command`, `Option`, and `Win`
- CDP keyboard dispatch with modifiers held and released around the primary key

Hotkey actions are input-style actions. They should carry the same module,
rule, words, target, item, name, and category metadata as the rule that emitted
them so logs and cooldown tracking remain attributable.

### Inventory Moves

Shared inventory actions already support:

- source and destination addresses
- container-runtime targeting
- count-aware moves
- normalized source and destination metadata in results

### Item Use

Shared use actions already support:

- self
- target creature
- ground tile
- generic open-container flows

### NPC Dialogue And Trade

Shared NPC actions already support:

- dialogue open and close steps
- keyword send
- dialogue option selection
- trade-row selection
- buy
- sell
- sell-all
- daily task accept/reward intents
- ordered progression workflows

## Remaining Gaps

The biggest missing shared actions are now:

1. dedicated bank transaction actions if banking logic needs to be reused outside the current banker dialogue engine
2. richer completion signals for one-shot travel actions when the live client does not expose destination state
3. route-aware policy orchestration for deciding when to travel, refill, return to hunt, or hand in tasks

Do not add feature-local shop, travel, blessing, or task automation paths outside the current router and primitive surface.

## What Should Not Happen

- no one-off hunt scripts with their own hidden input paths
- no direct NPC automation embedded inside unrelated feature modules
- no feature-specific inventory drag logic duplicated across files
- no runtime fetches of official data during bot ticks

If a new feature needs a new mechanical action, add the primitive first and document it here.
