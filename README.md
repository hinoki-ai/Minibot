# Minibia Bundle Root

This directory is the portable `minibia/` bundle root. The canonical Minibot
source and product documentation live in [`bot/`](./bot).

Documentation contract:

- this `README.md` is the only canonical markdown file at the bundle root
- Minibot canon lives under [`bot/AGENTS.md`](./bot/AGENTS.md)
- open work lives only in [`bot/todo.md`](./bot/todo.md)
- do not add top-level plans, audits, handoffs, or roadmap markdown beside `bot/`

Layout:

- `bot/`: Minibot source repo copy, tests, vendored Minibia data, and canonical docs
- `client/`: Minibia client launch metadata plus the optional sanitized Chrome profile seed
- `Minibia.desktop`: portable Linux client launcher
- `start-bot.sh` / `start-bot.cmd`: portable Minibot launchers
- `start-client.sh` / `start-client.cmd`: portable Minibia client launchers
- `bot/storage/home/`: portable config, accounts, character files, and saved routes
- `bot/storage/runtime/`: generated browser and Electron profile state

Requirements on the target machine:

- Node.js 22+
- npm dependencies installed inside `bot/`
- Chrome, Chromium, Brave, Edge, or the Minibia desktop app

Launch:

```bash
cd bot
npm install
npm run desktop
```

Portable launchers from this bundle root:

```bash
./start-bot.sh
./start-client.sh
```

To rebuild a sanitized transfer bundle, run this inside [`bot/`](./bot):

```bash
npm run bundle:minibia
```

The bundle builder omits `.git`, `node_modules`, `dist`, `artifacts`, stale
claims, route-spacing leases, transient page configs, logs, browser cache,
browser history, saved-password databases, machine-local account secrets, and
runtime locks.
