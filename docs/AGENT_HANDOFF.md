# DashHack: product, development, and code review

**Historical baseline:** the app was subsequently rebased onto master 1.0 and migrated to SQLite. Use [SQLITE_MIGRATION.md](SQLITE_MIGRATION.md), [README.md](../README.md) and [RAILWAY.md](RAILWAY.md) for current instructions. The MongoDB setup and several findings below describe the pre-migration source.

Reviewed 2026-11-07 from `ArimDev/dashhack`, branch `feat_alby_design`, commit `159925a` (`Fixed styles, missing buttons for all expand, styling, design...`). Package version: 0.6.5. This document describes the checked-out implementation; findings are not application fixes.

Follow-up on the same date: [Railway setup](RAILWAY.md) records the verified MCP connection and newly created empty DashHack project/web service, plus the remaining first-deployment procedure.

## What the app does

DashHack helps hackathon organizers monitor teams. An event name doubles as its route slug and shared login identity. There are no individual organizer accounts or role records. An event has a bcrypt-hashed password, optional GitHub token and logo, and embedded teams. Each team has a name, color, description, repository URL, and sticky notes.

The landing page checks name availability as the user types. A new name and password create an event, then log in and redirect to its teams page. An existing name with a password logs in; leaving the password empty opens the event as a public viewer. Direct event links also work without login. The server protects team writes using a session and event ownership check.

| Route | Current behavior |
| --- | --- |
| `/` | Create/open an event; light/dark mode toggle |
| `/app/:event` | Named middleware loads event data and redirects to Teams |
| `/app/:event/teams` | Vertical list of team cards, add/edit/delete dialogs, independent activity and notes toggles |
| `/app/:event/settings` | Autosave event name, password, logo URL, GitHub token; JSON backup download |
| `/app/:event/log` | Placeholder text only |
| `/app/:event/kanban` | Linked in sidebar, but no page exists |

Team cards show a color stripe, title, collapsed description, activity toggle, notes toggle, edit, and delete controls. The notes area lays out colored notes responsively; long content spans more columns/rows. Text saves on blur, priority on change, and color on input. New notes default to yellow, medium priority, and `To Do`; status is stored but has no UI workflow. Notes and all editing controls currently remain visible to public viewers; failed writes are rejected by the server.

Captured during local verification: [desktop dashboard](screenshots/dashboard-desktop.png) and [390px phone viewport](screenshots/dashboard-mobile.png). These show disposable review data, not production event data.

The dashboard has a collapsible 240px/80px sidebar, top header with event name and permission hint, GitHub quota, theme and Discord controls, and fixed toasts/add-team button. Public Sans, `bluey-*` colors, zinc/gray surfaces, rounded cards/dialogs, and Tailwind dark variants form the visual system. The sidebar is not automatically collapsed on phones. The logo setting is persisted but the shell displays the static `/logo.png`; event `color` is stored/read but has no settings editor. The layout contains a `#tools` target, but the teams page does not populate it with expand-all controls despite the baseline commit message.

## Architecture and data flow

| Location | Responsibility |
| --- | --- |
| `nuxt.config.ts` | Nuxt root `src/`, SSR, modules, port 5002, Bun Nitro preset, runtime configuration, Tailwind Vite plugin |
| `src/app/app.vue` | Layout/page outlet and browser debug logging |
| `src/app/middleware/routes.js` | Parse event slug, fetch public event data, populate `currentEvent`/`eventData`, redirect event root |
| `src/app/layouts/Dashboard.vue` | Shared shell, permission hint from cookie, login/logout, GitHub rate limit request |
| `src/app/pages/app/[event]/teams.vue` | Team dialogs and refresh; optimistic note mutation and persistence |
| `src/app/components/card/Team.vue` | Card, expansion state, lazy graph loading, chart configuration |
| `src/app/components/card/StickyNote.vue` | Local editable note fields; emits update/delete |
| `src/app/components/dialog/` | Shared create/edit team, confirm delete/logout, and password login |
| `src/app/components/setting/` | Separate settings cards; several independently refetch event data |
| `src/app/composables/fetchGithub.js` | Client Nuxt-state cache of GitHub series keyed by repository URL |
| `src/app/composables/useToast.js` | Module-scoped toast state and expiry timers |
| `src/server/models/Event.js` | Event schema, nested teams/notes, password hashing on save |
| `src/server/models/Session.js` | UUID session tied to event username, MongoDB TTL index |
| `src/server/utils/db.js` | Lazy Mongoose connection with process-local connected flag |
| `src/server/utils/githubSeries.js` | GitHub commit/detail requests and 24 hourly activity buckets |
| `src/app/plugins/apexcharts.client.js` | Register ApexCharts on the client |
| `tests/e2e/scenarios.spec.ts` | Five Playwright scenarios: team creation, notes lifecycle, chart success and two errors |

The repository uses Nuxt auto-imports, plain JavaScript server handlers and composables, and Vue `<script setup>`. SSR is enabled, but team content/charts are wrapped in `ClientOnly`. There is no separate backend service, store library, job queue, polling service, or database seed command.

Event data is loaded by middleware and refreshed after team dialogs close. Notes update shared client state optimistically, then send the team's complete fields and notes array to `/api/team/edit`. On failure the page shows a toast and refetches the event. There is no request serialization, revision check, or real-time synchronization.

Chart data is loaded on first expansion. The server loads the event token, requests the repository's first commits page, then serially fetches details for commits within its hourly buckets. It sums changed lines (additions plus deletions), not net additions. The newest bucket is the current partial hour; the oldest starts 23 hours earlier. Arrays are returned newest first and reversed by the client. Hours are server-local labels without dates or timezone. Successful results remain cached for the lifetime of client state; there is no refresh interval or server cache.

## API map and permission model

Paths below are relative to `/api`. Most errors are JSON body statuses while the actual HTTP status remains 200. Files lack HTTP method suffixes; only some handlers check methods themselves.

| Endpoint | Request and behavior |
| --- | --- |
| `auth/available` | Query `username`; public existence check |
| `auth/create` | Body `username,password`; public event creation |
| `auth/login` | Body `username,password`; creates session and cookies |
| `auth/password` | Body `username,password`; public password check |
| `auth/logout` | Deletes supplied session and clears cookies; client uses DELETE |
| `auth/update` | Body `setting,value`, plus `oldPassword` for password; updates event belonging to session |
| `event/:event` | Public event, teams, notes, metadata, masked token indicator; no password/token plaintext |
| `event/backup` | Public GET with query `event`; JSON attachment, excludes password/token |
| `team/add` | POST with `username,teamName,teamColor,teamGithub,teamDescription`; session must own event |
| `team/edit` | PUT/POST with the above, `oldName`, optionally complete `stickyNotes`; ownership checked |
| `team/delete` | DELETE with `username,teamName`; ownership checked |
| `github/series` | Public query `event,url`; uses event token to fetch repository activity |
| `github/rateLimit` | Public query `event`; uses event token to query quota |

Login sets an HttpOnly `session` cookie and readable `sessionExists` hint, both SameSite Strict, Secure outside development, with one-hour max-age. Session documents have a three-hour TTL. UI permission state uses only the readable hint, not a server-confirmed identity for the current route.

## Local development

### Fresh setup

Run commands from the repository root. Prefer Bun because `bun.lock` is tracked and the production runtime targets Bun. Node can run the dev command; initial verification used Node v24.20.0 and Bun 1.3.2. The lock installed Nuxt 4.2.1, Vue 3.5.24, and Playwright 1.56.1. No engine constraint or Bun version pin exists in the repository.

```sh
cp .env.example .env
# Edit .env with the values below.
bun install --frozen-lockfile
```

```dotenv
MONGO_URI_LOCAL=mongodb://127.0.0.1:27017/dashhack_dev
url=http://localhost:5002
discord=
webPort=1020
```

`mongoUri` takes precedence over `MONGO_URI_LOCAL`; do not leave a remote URI populated when intending to use the local database. The fallback `mongodb://mongo:27017/dashhack_dev` resolves only on a Docker network with a MongoDB service named `mongo`. `url` configures site/SEO URLs, not the listening address. `discord` is optional; `webPort` is used by production Compose, not Nuxt development. The SEO module warns about localhost in `url`; this does not prevent local development.

One local database option, bound only to loopback:

```sh
docker run -d --name dashhack-dev-mongo \
  -p 127.0.0.1:27017:27017 \
  -v dashhack-dev-mongo-data:/data/db mongo:7
docker exec dashhack-dev-mongo mongosh --quiet --eval 'db.runCommand({ping:1})'
bun run dev --host 127.0.0.1
```

Open `http://localhost:5002`. Create a new event with a disposable local password. Add a team, expand Notes, add/edit a note, blur the field, and reload to check persistence. GitHub charts require an event token saved in Settings; no token is required for teams/notes.

Alternatively, the repository provides `docker compose --env-file .env -f docker-compose.dev.yml up -d` for MongoDB. It currently uses `mongo:latest` and publishes port 27017 on all interfaces. On this review machine, `mongo:8` refused to start with a kernel compatibility error; use the tested local container option above rather than assuming `latest` works. Upstream tracks the allocator/kernel issue in [SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912).

### Build and browser checks

```sh
bun run build
bun src/.output/server/index.mjs

# In another terminal, with the dev server and database running:
bunx playwright install chromium
bunx playwright test
# Discover without executing:
bunx playwright test --list
```

The checked-in Playwright config targets `http://localhost:5002` and has no `webServer` block; it does not start Nuxt or MongoDB. Tests create disposable events and do not clean them up. Use a separate local database, never a production URI. Browser binaries must be installed separately. There are no lint/unit/typecheck scripts. Root `tsconfig.json` extends `./.nuxt/tsconfig.json`, but preparation generates `src/.nuxt/tsconfig.json`, so editor/type tooling needs follow-up before relying on it.

Production Compose is not a verified development path: Dockerfile listens on fixed port 1020 but Compose maps `${webPort}:${webPort}` and passes an unused build arg. Set `webPort=1020` if using it as written. It expects an external `NuxtEr` network and contains no MongoDB service. The Dockerfile copies `src/.output`, which matches `rootDir`. `.dockerignore` only excludes root `.nuxt/.output`, so generated `src/` output can enter the build context.

## Code review findings

Findings below are based on source tracing unless runtime evidence is explicitly stated. Priorities are suggested follow-up order, not changes made during onboarding.

### P1: Stored HTML injection in team deletion confirmation

`src/app/components/dialog/Confirm.vue:10` renders `message` using `v-html`; lines 37–39 insert a stored team name into that HTML without escaping. Team names accepted by `src/server/api/team/add.js` and `edit.js` have no HTML restriction. A name containing an element with an event handler can execute when the confirmation is rendered. The dialog is mounted with `v-show`, so hidden state is not a security boundary. A disposable local team containing an image error handler successfully set a harmless browser marker during confirmation: **runtime confirmed**. Render the message using Vue text interpolation and a separate `<strong>` node for the name. This matters for shared event links even though creating a team requires event write access.

### P1: Public GitHub proxy uses event credentials for arbitrary repositories

`src/server/api/github/series.js:1–8` accepts caller-supplied `event` and `url` without session validation. `src/server/utils/githubSeries.js:7–11,30–38` then loads that event's token and uses it for the selected repository. The repository need not belong to a team in that event. Anyone knowing an event name can consume its token quota and request activity for private repositories accessible to that token. Token plaintext is not returned, but aggregate private activity can be exposed. Restrict repositories to the configured event teams and define whether token-backed private data is public; add appropriate authorization, caching, and request limits. GitHub rate-limit lookup is also public. No real token was used in this review.

### P1: Settings can target a different event from the one shown

The settings cards derive labels/current values from `route.params.event`, but `src/server/api/auth/update.js:49,63,73,86` selects the target from `session.username`. A user logged into event A can view public event B's settings and edit B's displayed logo/token/name, yet the server changes A. This is an incorrect-target write, not permission to modify B. The shell's global `sessionExists` hint also misleadingly says changes are allowed on B. A local API reproduction with two events confirmed that the route-independent settings payload updates A and leaves B unchanged. Tie settings requests to an explicit event, check ownership, and expose a current-event permission state.

### P2: Duplicate team names make operations ambiguous

`src/server/api/team/add.js:38–44` permits duplicates; edit and delete use the first matching name. Client note functions also use `findIndex` by name. Two identically named teams cannot be reliably edited or deleted independently. Use embedded team `_id` consistently, or enforce unique names per event and validate rename operations.

### P2: Concurrent note saves can overwrite or lose edits

`src/app/pages/app/[event]/teams.vue` sends the complete notes array for every change; `src/server/api/team/edit.js` replaces it and saves the Event document. Blur/color/add/delete operations can overlap; multiple organizers edit independent copies. Stale full-array writes can lose changes or encounter Mongoose version conflicts. Serialize local saves and use atomic note operations with stable IDs/revision handling. Team editing also sends its existing notes snapshot, potentially overwriting newer notes.

### P2: Activity is truncated and can remain stale across events

`src/server/utils/githubSeries.js:34,53` fetches only the first commits page, without pagination or a `since` bound. Busy repositories therefore lose commits beyond GitHub's default first page. It makes one detail request per included commit, serially, with no server cache. `src/app/composables/fetchGithub.js:2–10` keys cache only by repository URL, not event/token, and has no expiry. `Team.vue` retains a successful chart indefinitely. Changing event, token, repository, or waiting through the hackathon does not reliably refresh the data. Key cache by event/repository and invalidate or expire it; fetch a complete bounded time range with a request budget.

### P2: Application input, error, and session handling need strengthening

- Handlers destructure unvalidated bodies/query values and pass them to database filters. Validate scalar types, lengths, event slug format, team identifiers, colors, and note structures; several inputs are currently only constrained by browser attributes or Mongoose required fields. Event names containing path/query characters break raw string URL construction in the UI.
- Auth/password endpoints have no attempt throttling. `githubSeries.js:26` assumes `error.response._data.message` exists; a network error can throw inside error handling, while individual detail failures may silently produce partial line counts.
- Auth/team failures generally return HTTP 200 with body status 401/403/etc. This weakens HTTP-level monitoring and differs from mocked test responses. Any fix must update existing client error handling.
- The server finds sessions by ID without checking age; browser cookies expire after one hour while MongoDB removes records after three hours plus TTL sweep delay. Explicitly enforce an expiry policy on each authorized request rather than using TTL deletion as the only server-side expiry mechanism.
- `connectDB()` uses a boolean without an in-flight connection promise or disconnect recovery. Database failure becomes a long request error rather than a controlled UI state.

### P2: Existing browser suite cannot establish regression coverage yet

`tests/e2e/scenarios.spec.ts:94,97,100` uses `getByDisplayValue`, which Playwright locators do not implement. Use the note textarea locator with `toHaveValue`. The chart error tests expect `Unable to load chart data: ...`, but `Team.vue` displays a body-status message directly or `Network error` for thrown HTTP failures. Mocked HTTP 401/404 responses therefore do not match current server behavior or client output.

The login helper waits for button visibility, not hydration or completion of the availability request. The button is already visible in SSR markup. Early clicks can submit before event state is ready; rapid availability responses can also arrive out of order in the application itself. Wait for readiness and the specific availability response; add an app loading state and serialize/debounce lookup. The test event constant is recomputed on worker restart, so shared-state assumptions are brittle. The suite has no cleanup and no meaningful authorization, multi-event, or concurrency coverage.

### P2: Phone layout leaves the dashboard largely unusable

At a 390px viewport, the expanded 240px sidebar leaves roughly 150px for the dashboard, with content padding narrowing the card further. The team name disappears and header controls are clipped. This was confirmed in the [phone screenshot](screenshots/dashboard-mobile.png). Add a mobile navigation mode and responsive header/card controls before treating phone support as complete.

### P3: Navigation, responsive layout, and incomplete UI

- Kanban link leads to a missing page; Log and backup Upload are unfinished. Legal links are empty and the sidebar law button has no action.
- Public viewers see edit/add/delete controls they cannot use. Disable or gate writes using server-confirmed event permissions while retaining public reading where intended.
- Sidebar starts expanded on small screens; login/confirmation dialogs use fixed half-viewport dimensions and `gap-70`, likely causing narrow-screen usability problems. Several icon-only controls lack accessible names and modals lack focus trapping/Escape behavior.
- Settings cards use fixed heights and a two-column base grid, with no one-column phone breakpoint. Labels are not consistently connected to input IDs.
- Changing a stored logo has no visible effect in the shell. Header quota is fetched at layout setup, not refreshed after token edits.
- Root TypeScript config points at the wrong generated path. Production port/network assumptions and unpinned Docker tags should be made explicit before container deployment.

## Initial verification record

The checkout and application source remain at the reviewed baseline; only onboarding documentation/screenshots and ignored local environment/generated files were added.

- **Passed:** locked dependency installation and Nuxt preparation; discovery of all five existing tests; HTTP 200 landing-page response; MongoDB 7 ping; event creation/login; team creation; note persistence across a browser load; Settings rendering; public note reads; unauthenticated write rejection with body status 401. Dashboard and Settings produced no browser page errors in the smoke check.
- **Passed:** landing-page registration/navigation when explicitly waiting for Vue hydration and the event availability response.
- **Passed:** production build using Bun 1.3.2 in `/tmp/dashhack-review`, sharing installed dependencies but keeping generated build output separate from the live dev server. Output: `/tmp/dashhack-review/src/.output`. Build log: `/tmp/dashhack-build.log`.
- **Failed:** all five checked-in Playwright scenarios, rerun after MongoDB was healthy. Failures occurred in setup (landing navigation and graph-team setup), before the intended feature assertions. Waiting for hydration/availability in a separate smoke check resolved landing navigation; the unsupported notes locator and stale chart error assertions remain additional source-confirmed defects, not failures reached by this run.
- **Confirmed:** stored HTML execution using a harmless browser marker; session-selected settings update target; absent `getByDisplayValue` Playwright method; unusable initial phone layout.
- **Not exercised:** real GitHub API/token behavior, production server/container runtime, event concurrency, and production deployment. GitHub findings come from source tracing.

### Current machine setup

Repository: `/home/alby/Coding/DashHack`. Dependencies are installed in `node_modules`; ignored root `.env` points exclusively to local `dashhack_dev`. No external credentials were added.

The development server was left running on `http://localhost:5002`, logging to `/tmp/dashhack-dev.log`. MongoDB runs as `dashhack-review-mongo` using `mongo:7`, published only at `127.0.0.1:27017`. This review container has no named data volume: stop/start preserves its writable layer, removing it deletes that database. For longer-term work, use the named-volume setup above. The failed MongoDB 8 container was removed.

To resume after stopping the existing processes:

```sh
docker start dashhack-review-mongo
npm run dev -- --host 127.0.0.1
```

Bun was not globally installed. The review used the temporary binary `/tmp/dashhack-tooling/node_modules/@oven/bun-linux-x64/bin/bun`. Use that path for locked install/build on this machine while it exists, or install Bun normally. `npm run dev` works with the already installed dependencies.

The original test suite was run with a temporary config at `/tmp/dashhack-playwright.config.mjs` selecting installed `/usr/bin/google-chrome` and keeping artifacts under `/tmp/dashhack-test-results`; tracked tests/config were not changed. Its log is `/tmp/dashhack-e2e.log`. Smoke scripts and logs are temporary `/tmp/dashhack-*` files. Durable visual evidence is in `docs/screenshots/`.

The four disposable review events and their sessions were removed after verification, including the HTML-injection reproduction. Create a fresh event through the landing page for further development.
