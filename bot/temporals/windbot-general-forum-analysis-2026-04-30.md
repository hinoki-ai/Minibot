created_at: 2026-04-30T00:00:00-04:00
expires_at: 2026-04-30T23:59:00-04:00
timezone: America/Santiago
reason: Temporary WindBot forum research memo for Minibot product comparison requested during the current research pass.
source_scope: Public WindBot forum pages and official WindBot docs fetched 2026-04-30.

# WindBot General Forum Analysis

This is a temporary research memo for Minibot learning. It captures all
non-spam knowledge categories visible in the public WindBot forum, including
topics that remain out of scope for Minibot implementation. Research coverage
and implementation boundaries are separate: the project should understand every
historical pattern, but risky patterns are documented as context, constraints,
or failure modes rather than converted into features.

## Source Quality

- The General board crawl deduped to 1,976 thread ids on 2026-04-30, with
  1,960 non-spam threads and 16 spam/adult-ad threads detected by title/preview
  text. The forum's own pagination reports about 1,971 results, so minor count
  drift is likely from sticky duplication and current spam churn.
- Recent General activity is polluted by spam threads dated March-April 2026,
  so learning should prioritize stickies, sorted-by-views results, Tutorials,
  Scripting, Cavebot Scripts, Support, Announcements, and Releases.
- The site itself warns that WindBot does not work on anti-cheat-protected game
  servers. The 2017 announcement and release posts repeatedly moved the product
  toward OpenTibia/private-server compatibility after BattlEye-style client
  changes.

## Deep Crawl Pass

This pass was research-only. No Minibot runtime behavior, route schema, module
contract, UI, or roadmap item should be changed from these findings until a
separate implementation request is made.

- General index: pages 1-99 crawled and deduped by thread id.
- Botting risks/deletions: all 172 pages crawled, 1,716 posts seen, 3 spam
  posts detected.
- Official Navigation Server: all 15 pages crawled, 146 posts.
- Navigation Server v1.0.1: all 14 pages crawled, 136 posts.
- Walkable/Food/Field IDs: all 6 pages crawled, 55 posts.
- Future releases/BattlEye announcement: all 21 pages crawled, 209 posts.
- WindBot 2.8.30 release: all 13 pages crawled, 126 posts.
- iBot converter: all 12 pages crawled, 112 posts.

The 172-page botting-risk thread is not only a first-post safety warning. Across
the full thread it repeatedly covers deletion reports, mass reporting,
detectability claims, modified clients/MC, preview-world/manual-check concerns,
account/character rotation behavior, spawn/place risk, premium/license myths,
PvP/war side context, and long-tail support claims. This stays research
knowledge, not a Minibot feature source.

Top non-spam General threads by deduped view count:

- `1317` Discussion: Botting Risks, Tips and Deletions - 1,734,787 views.
- `31` Official WindBot Navigation Server - 337,312 views.
- `114530` Invitation for Beta Testing - WindBot for Client 11 - 300,322 views.
- `108409` Navigation Server v1.0.1 - 282,663 views.
- `2056` Full iBot -> WindBot Converter - 220,137 views.
- `1086` Walkable, Food and Field IDs - 217,702 views.
- `139506` wind bot ots? - 100,962 views.
- `130044` WindBOT for Taleon/TibiaBR Server - 95,125 views.
- `7` Ask me about Windbot! - 85,530 views.
- `129538` Bypassing BattlEye by using Linux - 66,882 views.

## Knowledge Capture Policy

- Do filter spam, duplicate spam replies, dead ad threads, and unrelated
  marketplace noise.
- Do not filter non-spam knowledge out of the research set. Track architecture,
  product UX, support failures, compatibility problems, anti-cheat disruption,
  official-server risk discussion, PvP/war tooling, community trade/reseller
  systems, scripting libraries, HUDs, and historical unsafe patterns.
- Keep a separate implementation boundary. Minibot may learn vocabulary,
  risks, UX expectations, and failure cases from unsafe historical features, but
  it must not implement anti-cheat bypass, stealth, packet hooks, memory
  inspection, staff evasion, official-server abuse, or PvP grief automation.

## Forum Map

- Announcements: product news, policy, client-transition messaging, payment and
  license changes, anti-cheat compatibility warnings.
- Releases: protocol/client compatibility, bug-fix cadence, addon dependencies,
  release notes, upgrade pressure after Tibia client changes.
- General: usage discussion, risk, navigation server, item IDs, compatibility
  questions, client support, official/private server questions, community
  norms.
- Suggestions: requested features and missing workflow pain points.
- Support: setup failures, client-version mismatch, looting/deposit bugs,
  targeting issues, license/account problems, OS/runtime problems.
- Bugs: regressions and broken behavior reports.
- WindBot for Client 11: beta testing, client 11 compatibility, DLL/graphics
  issues, reports from the migration era.
- Lua Scripts: hotkeys, persistents, HUDs, community libraries, utility scripts,
  alarms, reconnect/backpack reopeners, equipment switchers, friend healer,
  loot logger, market seller, supply buyer.
- Cavebot Scripts: route/profile sharing, hunting scripts, paid/free scripts,
  route quality expectations, support for route authors.
- Tutorials: beginner flow, healer, cavebot, supply checks, depot deposit,
  Lua, script setup widgets, client addons, VPS and runtime setup.
- Game Chat, Showcases, Game Guides, War Chat, Trade, Misc: broader community
  context, strategy, screenshots/HUD demos, trading, resellers, scam reports,
  and non-product chatter. These are lower priority for Minibot architecture
  but still useful for user expectations and abuse/risk context.

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

## Full Non-Spam Knowledge Taxonomy

- Core automation architecture: world snapshot, route state, action queue,
  event status, module ownership, profile save/load, and user setup.
- Cavebot: route recording, stand/node/action waypoints, labels, goto loops,
  floor changes, tool use, luring, route sections, depot legs, city/hunt
  branches, and recovery after accidental floor movement.
- Targeting: target profile order, monster filtering, stance/chase/hold
  behavior, ignore lists, target stickiness, and combat ownership.
- Healer/sustain: ordered spell/rune/potion rules, condition healing, vocation
  and level requirements, parallel potion/spell behavior, cooldown windows, and
  visible disabled/blocked rule states.
- Looting: corpse handling, browse-field fragility, category filters, stackable
  and non-stackable destinations, rare alerts, container naming, and depot
  routing.
- Refill/economy: supply categories, supply thresholds, bank withdrawal, NPC
  buy/sell, depot deposit, money spent/withdrawn counters, and return-to-hunt
  labels.
- Navigation/multi-client: chat rooms, navigation rooms, ally/enemy/leader
  relations, position/mana sharing, HUD radar, pings, private messages,
  hosted/private navigation servers, idle room policy, update intervals, admin
  controls, and room passwords.
- Scripting/API: Lua hotkeys, persistent scripts, events, variables, iterators,
  typed objects, bot-control functions, HUD drawing, user widgets, script
  metadata, community libraries, and converter/import workflows.
- HUD/operator UX: overlays, list-as status text, colors, alerts, tray messages,
  screenshots, loot logs, kill counters, route/debug visibility, and live
  status.
- Data catalogs: item IDs, item names, item values, weights, flags, spell/rune
  info, walkable furniture, edible items, field IDs, client/protocol support,
  and addon requirements.
- Compatibility: client version support, Tibia 10/11 migration, OpenTibia
  focus, DLL/graphics issues, Windows/Linux/VPS runtime concerns, launcher
  requirements, and unsupported old/custom clients.
- Community operations: paid/free scripts, resellers, license days, license
  pause/transfer, support policies, forum rules, scam reports, marketplace
  moderation, and user trust signals.
- War/PvP context: war strategy, relation lists, enemy/ally tagging, combo or
  shooter concepts, and player-alert behavior. This is knowledge for threat
  modeling and UX boundaries, not a Minibot feature target.
- Official-server and anti-cheat context: deletion risk, reporting, BattlEye
  disruption, "works/does not work" compatibility claims, and unsafe bypass
  discussion. This must be retained as historical context and product-boundary
  evidence, not converted into bypass implementation.
- Failure patterns: unsupported client, stale or missing containers, broken
  looting after server save, deposit action misconfiguration, targeting not
  attacking, old protocol questions, backpack/window state loss, NPC dialogue
  failures, and unclear script setup naming.
- Spam: unrelated adult dating/ad posts and repeated link spam from 2026 are
  the only content category to discard from research.

## Implementation Boundary Notes

- Do not erase risky topics from research. Keep them indexed, summarized, and
  available for comparison.
- Do not turn unsafe topics into implementation tasks. For Minibot, translate
  them into allowed equivalents:
  - anti-cheat/bypass knowledge -> compatibility warnings and allowed-runtime
    boundaries;
  - player/GM evasion -> operator alerts and transparent pause controls;
  - packet/memory/client tampering -> no-op historical context;
  - PvP combo/aimbot tooling -> threat-model notes and explicit non-goals;
  - third-party binaries/download links -> historical references only.

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
