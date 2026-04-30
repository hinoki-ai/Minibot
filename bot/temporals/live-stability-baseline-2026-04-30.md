created_at: 2026-04-29T23:49:10-04:00
expires_at: 2026-04-30T22:49:10-04:00
timezone: America/Santiago
reason: P0 live stability baseline captured from the currently running local Minibia clients.

# Live Stability Baseline

Captured by a read-only DevTools attach/background-refresh/detach pass against
port `9224`. No messages, movement, route starts, or account actions were sent.

| Character | Ready | Refresh ms | Confidence | Position | HP% | MP% |
| --- | --- | ---: | --- | --- | ---: | ---: |
| Dark Knight | yes | 70.91 | all confident | `32781,32145,7` | 89.43 | 21.71 |
| Czarnobrat | yes | 34.34 | all confident | `32102,32335,9` | 100 | 84.21 |
| Zlocimir Wielkoportf | yes | 43.27 | all confident | `32172,32341,9` | 100 | 83 |

Durable gates for this pass are in tests and docs. This note is only the local
live observation from the active clients and should expire with the temporal
queue.
