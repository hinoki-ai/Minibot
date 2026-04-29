# Minibia Runtime Surface

This document describes the normalized module-facing snapshot exported by [`lib/minibia-snapshot.mjs`](../lib/minibia-snapshot.mjs).

Use this file when adding shared modules that need live game state. For the broader runtime around it, use [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

## Current Normalized Shape

The current normalized snapshot is nested. The stable top-level shape is:

```json
{
  "schemaVersion": 1,
  "ready": true,
  "reason": "",
  "player": {},
  "connection": {},
  "movement": {},
  "combat": {},
  "pvp": {},
  "inventory": {},
  "progression": {},
  "dialogue": {},
  "trade": {},
  "bank": {},
  "task": {},
  "sourceHints": []
}
```

### `player`

- `player.name`
- `player.position`
- `player.stats.health`
- `player.stats.maxHealth`
- `player.stats.mana`
- `player.stats.maxMana`
- `player.stats.healthPercent`
- `player.stats.manaPercent`
- `player.stats.level`

### `connection`

- `connection.connected`
- `connection.wasConnected`
- `connection.reconnecting`
- `connection.intentionalClose`
- `connection.canReconnect`
- `connection.reconnectOverlayVisible`
- `connection.reconnectButtonVisible`
- `connection.reconnectButtonDisabled`
- `connection.playerIsDead`
- `connection.deathModalVisible`
- `connection.connectingModalVisible`
- `connection.serverError`
- `connection.reconnectMessage`
- `connection.deathMessage`
- `connection.lastCharacterName`

### `movement`

- `movement.moving`
- `movement.autoWalking`
- `movement.autoWalkStepsRemaining`
- `movement.destination`

### `combat`

- `combat.monsterNames`
- `combat.target`
- `combat.followTarget`
- `combat.visibleMonsters`
- `combat.visiblePlayers`
- `combat.visibleNpcs`
- `combat.visibleMonsterNames`
- `combat.visiblePlayerNames`
- `combat.visibleNpcNames`
- `combat.elementalFields`
- `combat.safeTiles`
- `combat.reachableTiles`
- `combat.modes.fightMode`
- `combat.modes.chaseMode`
- `combat.modes.rawFightMode`
- `combat.modes.rawChaseMode`

### `pvp`

- `pvp.pkLockEnabled`
- `pvp.pzLocked`
- `pvp.skull.key`
- `pvp.skull.label`

### `inventory`

- `inventory.currency`
- `inventory.hotbar`
- `inventory.equipment`
- `inventory.containers`
- `inventory.ammo`
- `inventory.supplies`

### `progression`

- `progression.blessings`
- `progression.residence`
- `progression.promotion`

### `dialogue`

- `dialogue.activeChannelName`
- `dialogue.defaultChannelName`
- `dialogue.defaultChannelActive`
- `dialogue.npcName`
- `dialogue.prompt`
- `dialogue.options[]`
- `dialogue.recentMessages[]`
- `dialogue.signature`
- `dialogue.bankBalance`

### `trade`

- `trade.open`
- `trade.npcName`
- `trade.activeSide`
- `trade.selectedItem`
- `trade.buyItems[]`
- `trade.sellItems[]`

### `bank`

- `bank.open`
- `bank.npcName`
- `bank.bankBalance`
- `bank.prompt`

### `task`

- `task.open`
- `task.activeTaskType`
- `task.taskNpc`
- `task.taskTarget`
- `task.progressCurrent`
- `task.progressRequired`
- `task.rewardReady`

### `sourceHints`

- normalized text hints extracted from noisy raw inputs to help diagnose what source fields were seen during normalization

## Key Nested Records

### Positions

Positions normalize to:

```json
{ "x": 321, "y": 654, "z": 7 }
```

### Creature Entries

`combat.target`, `combat.followTarget`, `combat.visibleMonsters[]`, and `combat.visiblePlayers[]` use:

```json
{
  "id": 91,
  "name": "Larva",
  "position": { "x": 323, "y": 654, "z": 7 },
  "healthPercent": 32,
  "isShootable": true,
  "dx": 2,
  "dy": 0,
  "dz": 0,
  "distance": 2,
  "chebyshevDistance": 2,
  "withinCombatWindow": true,
  "withinCombatBox": true,
  "reachableForCombat": true,
  "isCurrentTarget": true,
  "isAxisAligned": true,
  "isDiagonalAligned": false
}
```

### Hotbar Slots

`inventory.hotbar.slots[]` use:

```json
{
  "index": 0,
  "label": "Attack Nearest",
  "kind": "action",
  "empty": false,
  "item": null,
  "itemId": null,
  "count": 0,
  "hotkey": "Shift+F1",
  "words": "attack nearest",
  "spellId": null,
  "spellName": null,
  "actionType": "attack-nearest",
  "active": true,
  "enabled": true
}
```

`kind` is currently normalized to values such as `spell`, `item`, `text`, `action`, or `unknown`.

`hotkey` is best-effort metadata sourced from live hotbar fields such as
`hotkey`, `keybind`, `shortcut`, `key`, or `binding`. It is preserved so module
actions and UI summaries can report the operator-facing binding even when the
slot is still addressed by index.

### Inventory Items

Normalized inventory items use:

```json
{
  "id": 236,
  "name": "Strong Mana Potion",
  "count": 17,
  "article": "",
  "slotType": "",
  "tags": [],
  "flags": {
    "potion": true,
    "rune": false,
    "food": false,
    "ammo": false,
    "rope": false,
    "shovel": false
  }
}
```

### Equipment And Containers

- `inventory.equipment.slots[]` preserves slot order and per-slot metadata
- `inventory.containers[]` preserve `runtimeId`, `itemId`, `name`, `capacity`, `open`, and normalized `slots[]`
- `inventory.ammo` points at the resolved ammo slot when one is identifiable

### Supply Summary

`inventory.supplies` aggregates recognized categories from equipment, hotbar, and containers:

- `potions`
- `runes`
- `food`
- `ammo`
- `rope`
- `shovel`
- `entries[]` with the contributing item records

This summary is meant for automation thresholds and refill planning, not as a replacement for the raw container view.

## Normalization Rules

- Snapshot values are plain serializable objects only. Internal client objects do not cross the CDP boundary.
- Unknown or partially missing fields normalize to `null`, `false`, empty arrays, or empty strings depending on field type.
- Combat modes normalize into stable identifiers plus raw values when available.
- Item flags are inferred heuristically from item names, slot labels, and tags. They are convenience hints, not authoritative official taxonomy.
- Container and equipment slot collections keep explicit slot structure so routing and refill code can reason about empty space.
- `collectSnapshotInventoryItems(...)` and `summarizeSnapshotSupplies(...)` accept either raw-ish snapshot input or an already-normalized snapshot.

## Relationship To The Raw Bot Snapshot

`lib/bot-core.mjs` still extracts more raw live state than this normalized contract exposes. Examples include:

- nearby unopened corpse tiles used by the looter
- additional route-specific fields used by the live route engine

That is intentional for now. Shared modules should prefer the normalized shape in this document unless they are actively extending the contract.

## Current Gaps

The normalized snapshot is materially stronger than the old combat-only surface, but it still does not cover everything the raw bot sees:

- unopened corpse tiles and other looter-only ground-item probes
- any local task ledger fields the bot may need when the client does not expose progress directly

When new shared behavior depends on those fields, extend `lib/minibia-snapshot.mjs` and update this document at the same time.
