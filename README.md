# DashHack — hackathon monitoring dashboard

DashHack tracks teams, organizer notes, and GitHub activity during an event. It was originally created for the AT&T Hackathon Brno and is maintained by ArimDev.

This branch uses **Nuxt 4 / Vue 3, Tailwind CSS 4, Bun, and embedded SQLite**. It runs as one application process; no MongoDB service is required. Public event viewing and password-protected editing retain their existing behavior.

## Local development

Install Bun 1.3.2 or newer, then run from the repository root:

```sh
cp .env.example .env
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:5002>. The database is created automatically at `.data/dashhack.sqlite`. Override its location with `NUXT_SQLITE_PATH`. GitHub activity charts additionally need a per-event token saved in Settings.

Bun is required for the server because it uses `bun:sqlite`. Node-only `nuxt dev` is not supported. Package scripts run Nuxt with Bun for development and production builds.

## Team notes and Kanban

Create notes inside a team on the Teams page. Kanban gathers tracked notes across all teams into **To Do**, **In Progress** and **Done**. Filter by team, drag a note between columns, or use its status selector. Content, priority, color and deletion are available in both views; changes persist in the same notes. Public visitors can read the board; log in to edit. Conflicting edits refresh the board instead of overwriting another organizer's changes.

Use **New Help Request** for a team needing help, or **New Mentor Note** for an observation. New mentor notes stay on the team page; help requests start in Kanban. Toggle **Track in Kanban** on any note to choose where it belongs. Only tracked notes show priority and status controls. Turning tracking off keeps its content, creator and previous workflow values so it can be added back later. Both have a type selector and can be filtered by type in Kanban. On the **Mentors** page, log in with the event password and add your name. Your name then appears in each note's **Creator** dropdown. Names are shared event labels, without individual accounts or verified identity. Existing notes retain their content/status and become mentor notes with no creator selected.

Each team card includes **Originalita** (plain text) and **Project Abstract**, editable when adding or editing a team. Abstracts support bold, italic, paragraphs and bullet lists; paste brings in plain text. Both fields also appear for public viewers, and saving notes preserves the team's project details.

Each team also has a collapsible **Startupová matice** with ten CzechInvest questions: problem, solution, advantages, market/opportunity, risks, business model, clients, competition, team/advisors and go-to-market strategy. Open it and select **Upravit matici** after logging in. Mentors can select a responsible mentor and save any subset of rich-text answers with **Uložit matici**. Default question text is editable and untouched questions do not count as answers. Team members/public visitors can read saved responses and guidance. Conflicting saves retain the local draft and offer an explicit reload action.

## GitHub App

For the real event, use a dedicated GitHub organization with one repository per team. A read-only GitHub App lets the organizer connect the organization in Settings and select repositories directly in Add/Edit Team. It uses the existing Bun/SQLite process without an added SDK or service. Organization/App registration and server credentials must be configured before the connection becomes available. See [GitHub App setup](docs/GITHUB_APP.md) for the exact callback URLs, permissions and variables.

## Social Wall

The feature ported from [PR #6](https://github.com/ArimDev/dashhack/pull/6) adds a public event wall and moderated attendee text/photo/video submissions. Log in, open **Social Wall**, and enable it. Display `/<event>/wall` and share `/<event>/wall/upload` (also available by QR). Walls start disabled; public uploads always await approval. The moderation dashboard can approve, reject, hide, pin and archive posts.

Attachments live in the existing SQLite database: maximum 4 MiB per upload, 32 MiB per event and 64 MiB overall. Full SQLite snapshots include them; public JSON event downloads do not. Optional X hashtag/account collection uses server-only `NUXT_X_BEARER_TOKEN` and **Settings → X social collector**, without any added service or dependency. See [PR review, setup, Czech demo fixtures and limits](docs/SOCIAL_WALL_PR6.md).

## Mobile use

Phones have quick navigation, a full event menu and scrollable dialogs with reachable save/cancel actions. Kanban uses column tabs and status dropdowns for touch editing. Public walls start with manual scrolling on phones and include a direct upload link. Settings and rich-text forms adapt to narrow screens, landscape and dark mode. See [mobile behavior and validation](docs/MOBILE_POLISH.md).

## Tests

```sh
bun test tests/unit
bunx playwright install chromium
bun run test:e2e
```

The browser suite starts its own dev server at port 5010 and uses the separate `.data/playwright.sqlite` database. To use an existing Chrome executable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome`. No real GitHub credentials are needed by the tests.

## Production

```sh
bun run build
NUXT_SQLITE_PATH=/absolute/path/dashhack.sqlite bun src/.output/server/index.mjs
```

Or run the application with persistent Docker storage:

```sh
docker compose up --build -d
```

Compose binds to <http://localhost:1020> by default and stores SQLite in a named volume. `docker compose down` retains the data; `docker compose down -v` deletes it. The optional `docker-compose-dev.yml` runs development in a container, also with persistent storage.

For Railway, attach a persistent volume at `/data`, set `NUXT_SQLITE_PATH=/data/dashhack.sqlite`, keep one replica, and use `/api/health` as the readiness check. Create schema at application startup, when Railway mounts the volume. See [Railway setup](docs/RAILWAY.md).

## Existing MongoDB data and backups

The migration includes an offline importer for a private `mongoexport --jsonArray` dump of the `events` collection. It preserves password hashes, event/team/note IDs and tokens, rejects duplicate/conflicting records transactionally, and intentionally does not import sessions. Keep that export private: it contains credentials. The public per-event backup omits passwords/tokens and is not a full database migration source.

```sh
NUXT_SQLITE_PATH=./.data/dashhack.sqlite bun run db:import /private/path/events.json
bun run db:backup /private/path/new-snapshot.sqlite
```

The backup command creates a consistent SQLite snapshot, including committed WAL data, and refuses to overwrite an existing file. Store a copy outside the application volume and test restoring it. Event backup downloads remain available in Settings; backup upload remains a placeholder.

SQLite is appropriate for this private event's small, single-instance workload. Writes are serialized; this setup does not support multiple web replicas writing across machines. Persist the database and its WAL files on the volume, retain backups, and allow a brief restart during deployments. The dashboard now renders in the browser, so it requires JavaScript and no longer generates social-preview images.

See [migration details and validation](docs/SQLITE_MIGRATION.md), [agent guide](AGENTS.md), and [resource measurements](docs/MINIMUM_FOOTPRINT.md).

## Attribution

Author: [ArimDev](https://github.com/ArimDev) ([PetyXbron](https://github.com/PetyXbron)). License: [Apache License 2.0](LICENSE). Retain [NOTICE](NOTICE) in redistributions and the existing page credit.
