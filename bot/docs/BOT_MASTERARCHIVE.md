# Bot Master Archive

Research snapshot: 2026-04-30. This file is for Minibia design reference only. It documents public, real-world Tibia bot patterns at a product/capability level and deliberately avoids anti-detection instructions, bypass details, official-server cheating recipes, packet manipulation, or copyable third-party scripts.

## Ground Rules

- Official Tibia treats bots/macros/unofficial software as rule violations. TibiaWiki summarizes bots as unofficial software that controls a character and warns that use can lead to banishment or deletion: https://tibia.fandom.com/wiki/Bot
- CipSoft integrated BattlEye into the Tibia Client on March 21, 2017, describing it as a protective shield against in-game cheats: https://www.cipsoft.com/en/122-cooperation-with-battleye-innovations
- This project should treat the public bot scene as UX and systems research for Minibia-controlled clients, not as a blueprint for evasion or use on official Tibia.

## Historical Products And Patterns

- BlackD Proxy: old commercial cheat suite advertised cavebot, runemaker, combo/magebomb tools, trainer, fishing, healing, packet log, relog, floor hack, GUI, and compatibility across many old Tibia C++ clients. Its own page calls it an advanced set of cheats and warns of detection/deletion risk on real Tibia servers. Source: https://blackdtools.com/blackdproxy.php
- ElfBot NG: historical warbot/cavebot lineage. Its preserved site frames it as an all-around Tibia bot with war/PvP coordination, hotkeys, advanced healing, on-screen displays, cavebot movement, monster targeting, and clickable display icons. Source: https://elfbot.tibia.network/
- WindBot: later polished automation product. Public feature pages emphasized waypoint tabs, special/no-go areas, action waypoints, Lua cavebot scripts, fast looting setup, supplies/refiller lists, loot counters, targeting profiles, distance/beam/wave behavior, HUDs, and navigation/player relation features. Source: https://tibiawindbot.com/features.html
- Modern OTS-focused bots: Shrouded Bot advertises hunting, looting, runemaking, healing, waypoint recording, Lua scripting, advanced hotkeys, party navigation, and smart AoE rune selection for Open Tibia servers. Source: https://shroudedbot.com/
- Modern OTClient bots: nExBot advertises TargetBot, CaveBot, HealBot, AttackBot, Hunt Analyzer, safety systems, multi-client support, stuck/floor/field handling, priority scoring, condition handlers, equipment management, and analytics. Source: https://www.nexbot.cc/
- Remote/web-control products: R-BOT advertises web/phone remote control, PM replies, auto-safety, web waypoint creation, multiple walking methods, Lua scripting, auto-updates, and AI auto-replies. Its public page also markets hardware separation and low-risk modes; keep that only as market awareness, not as a Minibia implementation target. Source: https://tibiarbot.com/

## Capability Taxonomy

- Cavebot/routing: waypoint recording, reusable route files, route tabs/sections, start-from-anywhere behavior, action waypoints, shovel/rope/door/deposit/withdraw actions, special areas/no-go zones, field handling, floor-change detection, stuck recovery, refill loops, and return-to-start controls.
- Targeting/combat: target queues, target profiles, priority scores, danger scores, distance bands, chase/stand/hold/kite modes, per-creature spells/runes, AoE tile selection, wave/beam avoidance, lure positions, and PvP/friend/enemy relation concepts.
- Sustain/healing: HP/MP thresholds, spell priority ladders, rune and potion fallback, condition cures, mana training, anti-paralyze-style legacy concepts, cooldowns, vocation-aware defaults, and emergency priority so healing cannot be starved by lower-priority actions.
- Looting/economics: keep/skip lists, corpse ownership checks, body priority, rare-drop alerts, auto-generated loot lists from monster databases, container routing, supplies tracking, loot counters, XP/h, kills/h, profit/h, and hunt scoring.
- Safety/operations: player/staff/PK alarms, low-supply exit, death/reconnect detection, server-save handling, session runtime caps, message alerts, pause/stop-all controls, audit logs, and human takeover states.
- UX/configuration: clear on/off toggles, visible live state, per-module modals, route recorders, searchable saved scripts, profile switching, import/export, script marketplaces, real-time logs, HUD overlays, and compact dashboards for repeated actions.

## What Applies To Minibia

- Use route files, waypoints, tile rules, and refiller loops as first-class domain objects.
- Keep modules independent but observable through one runtime snapshot and one action router.
- Prefer deterministic rules over opaque behavior: explicit HP/MP thresholds, target priority, cooldowns, and safety gates.
- Treat every module as a state machine with a reason string: `ready`, `waiting`, `blocked`, `executing`, `cooldown`, `failed`.
- Design for recovery: stuck detection, reconnect, route reset, low-supply exit, and manual takeover must be visible and testable.
- Keep analytics local: XP/h, kills/h, profit/h, supply burn, rule hit counts, and recent failures are useful for tuning without adding evasion.
- Keep toggles boring and obvious: native state in the DOM, visible switch track, visible text state, no hidden state-only color.

## What Not To Copy

- Do not implement official Tibia anti-cheat bypasses, stealth claims, hardware separation for evasion, packet tampering, memory inspection, GM/CM avoidance tricks, or ban-avoidance workflows.
- Do not copy third-party scripts or exposed product code. Use public descriptions only to identify product patterns.
- Do not make account-risk claims. Minibia can document intended behavior for its own environment, not safety on official servers.

## Academic And Industry Notes

- De Paoli and Kerr’s case study describes Tibia botting as a real cheating economy with commercial vendors, customer demand for stealth, and an arms race with anti-cheat efforts. It also notes the risk and market instability around trying to make bots undetectable. Source: https://rke.abertay.ac.uk/files/23591093/DePaoli_WeWillAlwaysBeOneStepAhead_Published_2010.pdf
- A 2019 Devcom report quoted CipSoft discussion of the business tradeoffs around bots and BattlEye, including a claim that roughly a quarter of users had been using bots before the anti-cheat strategy. Source: https://www.pcgamesinsider.biz/news/69548/devcom-2019-heres-why-cipsoft-isnt-banning-cheaters-from-mmo-tibia/
- General MMORPG bot detection research points at behavior similarity, ground-truth maintenance, model drift, and business constraints as recurring anti-bot realities. Source: https://www.ndss-symposium.org/wp-content/uploads/2017/09/you-are-game-bot-uncovering-game-bots-mmorpgs-via-self-similarity-wild.pdf

## Minibia Backlog Seeds

- Route Studio: waypoint tabs, route labels, action waypoint templates, refiller branches, and route health checks.
- Hunt Studio: target profiles with priority/danger/spacing, AoE opportunity scoring, creature history, and fallback combat rules.
- Sustain Studio: spell/potion/rune ladders with emergency priority, condition handling, cooldown proof, and vocation presets.
- Loot Studio: keep/skip/container routing, learned drops, rare alerts, supply burn, profit/h, and rule hit counters.
- Operations: stop-all, pause route only, reconnect, route reset to waypoint 1, low-supply exit, staff/player alarms, and exportable run logs.
