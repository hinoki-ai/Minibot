created_at: 2026-04-30T00:00:00-04:00
timezone: America/Santiago
source_scope: Public WindBot forum pages and official WindBot docs fetched 2026-04-30.

# WindBot General Forum Analysis

This is a temporary research memo for Minibot learning. It summarizes product
and architecture patterns from the public WindBot forum without adopting
official-Tibia automation, anti-cheat bypass, stealth, packet hooks, memory
inspection, or staff-evasion behavior.

## Source Quality

- The General board has about 1,971 threads. The durable signal is in sticky
  threads and older high-view threads.
- Recent General activity is polluted by spam threads dated March-April 2026,
  so learning should prioritize stickies, sorted-by-views results, Tutorials,
  Scripting, Cavebot Scripts, Support, Announcements, and Releases.
- The site itself warns that WindBot does not work on anti-cheat-protected game
  servers. The 2017 announcement and release posts repeatedly moved the product
  toward OpenTibia/private-server compatibility after BattlEye-style client
  changes.

## High-Signal Threads

- General sticky: "Discussion: Botting Risks, Tips and Deletions"
  - 1,715 replies, 1,734,787 views.
  - Product lesson: even WindBot framed input simulation as risk-bearing, not
    undetectable. For Minibot, keep the boundary as allowed Minibia/private
    runtimes and operator-visible automation.
- General sticky: "Official WindBot Navigation Server."
  - 147 replies, 337,312 views.
  - Product lesson: navigation was not just pathing. It included shared rooms,
    real-time character state, ally/enemy/leader relations, HUD overlays, pings,
    private messages, and context-menu relation editing.
- General sticky: "Navigation Server (v1.0.1)"
  - 135 replies, 282,663 views.
  - Product lesson: party/multi-client support had server-side concepts:
    chat rooms, navigation rooms, friend/enemy update intervals, idle rooms,
    admin commands, server password, room defaults, and hosted/private servers.
- General sticky: "Walkable, Food and Field ID's"
  - 54 replies, 217,702 views.
  - Product lesson: serious route engines need curated item metadata for
    walkable furniture, food, fields, obstacles, and tile behavior. This maps
    directly to Minibot route validation, tile confidence, auto-eat, and
    stuck-recovery rules.
- Tutorials: "WindBot Detailed!", "How to make simple script?!", "Supplies
  (Checks, Resupply, Conditions)", and "Deposit items with depotaction()"
  - Product lesson: user expectations center on route profiles that include
    healer, cavebot, looting, depot deposit, bank, supply checks, NPC buy/sell,
    and return-to-hunt labels.
- Scripting: "List of Scripts and HUD's", community libraries, and script
  setup tutorials.
  - Product lesson: advanced users expected a reusable scripting layer,
    structured user options, HUD/analytics, alerts, friend healer, loot logger,
    safe reconnect, equipment switching, and supply buyers.

## Product Patterns To Learn

1. Route profiles should be complete hunt packs.
   - A useful route is not only waypoints. It bundles route sections, labels,
     targeting rules, looting destinations, supply thresholds, bank/depot/shop
     actions, healer rules, and user-facing setup options.

2. Waypoints need typed intent.
   - WindBot tutorials distinguish stand/node/action labels and direction
     offsets. For Minibot, each waypoint should retain role and confidence:
     walk, stand, floor transition, tool use, NPC, bank, shop, depot, branch,
     wait, label, or goto.

3. Refilling is a resumable loop.
   - The forum's supply/depot tutorials use checks like need-resupply, category
     groups, depot deposit, bank withdrawal, NPC buy, and then a label jump back
     to the hunt. This supports the existing Minibot P1 item to unify refill,
     banking, shopping, travel, and return context.

4. Looting needs category and destination semantics.
   - Forum examples route stackable and non-stackable loot to different depot
     containers, attach loot categories, and use item IDs. Minibot should keep
     explicit keep/sell/rare/trash/protected categories and show why an item was
     moved, skipped, deposited, or sold.

5. Healer rules are priority rules, not one-off triggers.
   - The tutorial material treats spell, potion, and condition healing as
     ordered rule families with requirements and priorities. Minibot already
     does confidence-gated healing; the next value is clearer UI around rule
     priority, blockers, and cooldowns.

6. Navigation is a multi-client feature.
   - WindBot navigation rooms exposed ally/enemy/leader relations, positions,
     mana, messages, pings, and HUDs. For Minibot, the safe equivalent is
     claims, follow chain, support roles, shared-spawn visibility, party
     telemetry, and operator alerts.

7. Good scripts expose typed options.
   - The script setup tutorial moved away from manual variable editing toward a
     JSON widget setup with line edits, checkboxes, combo boxes, and spinboxes.
     For Minibot, route packs and constrained action blocks should expose
     structured controls instead of requiring JSON edits.

8. Support issues identify fragile runtime surfaces.
   - Common forum questions involve unsupported client versions, looting stuck
     on browse-field behavior, deposit naming mistakes, targeting not acting,
     old-client support, and whether the bot still works. Minibot should treat
     these as UX requirements: compatibility checks, validation before save,
     visible action failures, and exact owner/reason messages.

## What To Ignore

- Bypass/anti-cheat threads.
- Official-server risk reduction as a product goal.
- Player/GM logout evasion.
- Packet or memory techniques.
- PvP combo/aimbot automation.
- Third-party binaries or old download links.
- Forum spam and inactive purchase/reseller content.

## Useful Sources

- General board:
  https://forums.tibiawindbot.com/forumdisplay.php?9-General
- Botting risks sticky:
  https://forums.tibiawindbot.com/showthread.php?1317-Discussion-Botting-Risks-Tips-and-Deletions
- Official Navigation Server:
  https://forums.tibiawindbot.com/showthread.php?31-Official-WindBot-Navigation-Server
- Navigation Server v1.0.1:
  https://forums.tibiawindbot.com/showthread.php?108409-Navigation-Server-(v1-0-1)
- Walkable, food, and field IDs:
  https://forums.tibiawindbot.com/showthread.php?1086-Walkable-Food-and-Field-ID-s
- Future releases announcement:
  https://forums.tibiawindbot.com/showthread.php?117663-Information-about-future-WindBot-releases
- WindBot 2.8.30 release:
  https://forums.tibiawindbot.com/showthread.php?124505-WindBot-2-8-30-(Protocol-11-47-Client-10-and-Client-11)
- Tutorials board:
  https://forums.tibiawindbot.com/forumdisplay.php?12-Tutorials
- WindBot Detailed tutorial:
  https://forums.tibiawindbot.com/showthread.php?1758-Tutorial-WindBot-Detailed!
- Simple script tutorial:
  https://forums.tibiawindbot.com/showthread.php?700-How-to-make-simple-script-!
- Supplies tutorial:
  https://forums.tibiawindbot.com/showthread.php?89-Supplies-(Checks-Resupply-Conditions)
- Depot action tutorial:
  https://forums.tibiawindbot.com/showthread.php?74-Deposit-items-with-depotaction()
- Official docs:
  https://www.tibiawindbot.com/docs.html
