# SQLite migration and resource reduction

Completed locally on 2026-11-07 for a small private event. The app retains Nuxt/Vue and the existing design, using Bun's embedded SQLite instead of MongoDB. No Go rewrite was performed.

## Rebase

The repository has no `main`: its default branch is **`master`**. Fetched the latest remote refs and rebased `feat_alby_design` onto `origin/master` release `3fa3669` (1.0.0). The rebased design tip is `f68256c`.

All three design commits replayed without conflicts, and `git range-diff` reported them unchanged in content. The original tip `159925a` is preserved at `backup/feat-alby-design-before-rebase-20261107`. Local onboarding documents were preserved. On 2026-11-08 the user authorized committing the accumulated implementation and publishing this rebased branch. A fresh fetch confirmed `origin/master` remains at `3fa3669` and the remote design tip remains `159925a`; range-diff again confirmed all three design commits are content-equivalent. The source snapshot and all existing refs were backed up in `/tmp/dashhack-before-final-rebase-pgvadnqf` (binary tracked patch, untracked source archive and verified Git bundle) before committing. The implementation is preserved in a dedicated commit after the three design commits. See Git history for the resulting commit IDs.

Upstream 1.0 supplies the Apache 2.0 license/NOTICE, README updates, dev Compose rename, and safe text rendering for team names in the confirmation dialog. That upstream security fix is retained.

## Implemented improvements

- **One application, no MongoDB service.** `bun:sqlite` is built into the existing Bun runtime; Mongoose and MongoDB driver dependencies are removed.
- **Direct normalized storage.** Events, teams, notes and sessions have explicit tables, primary keys, foreign keys, indexes and transactions. Schema version 1 is created at runtime. An app refuses a database with a newer unsupported schema version.
- **Conservative durability.** WAL permits readers alongside the single writer; `synchronous=FULL`, a 5-second busy timeout, one connection, a 2 MiB page-cache target, and disabled mmap keep behavior simple. Database files use private permissions. These settings are not hard whole-process memory bounds.
- **Stable identities and conflict handling.** Team operations use IDs; team names are unique within an event. Edit requests carry a revision. A stale revision returns body status 409 instead of overwriting newer data. Local note saves are serialized; a failed queue skips stale snapshots and refetches current data. Conflict resolution is reload/retry, not automatic merging.
- **Explicit session expiry.** Server-side sessions expire after one hour, matching cookies. Password changes invalidate old sessions and issue a new one; renames preserve the current session and invalidate others. Session records refer to event IDs rather than mutable names.
- **Correct settings scope.** Settings requests include the displayed event name, which must match the session's event. Viewing event B while logged into A cannot accidentally change A's settings through B's form.
- **Existing passwords preserved.** Bun's built-in bcrypt implementation uses cost 10, matching the old implementation. Legacy npm-bcrypt hashes are tested. New passwords are limited to 72 UTF-8 bytes; legacy verification retains bcrypt's old truncation behavior. Removing the native addon also avoids a dev-worker hot-reload failure found during validation. See [Bun password hashing](https://bun.sh/docs/runtime/hashing).
- **Smaller frontend/server build.** Removed unused SEO/OG generation, MDC and color-picker modules. The dashboard uses client-side rendering, with ApexCharts imported only when opened. Existing fonts, colors and chart interactions remain.
- **Simpler deployment.** Pinned Bun 1.3.2 standard build image and Debian slim runtime, frozen installs, scoped Docker context exclusions, persistent Compose volume, no external Docker network or separate DB container. Port mapping now consistently targets internal port 1020.
- **Usable operational tools.** `/api/health` opens/checks SQLite. The private Mongo JSON importer preserves IDs/hashes/tokens atomically, refuses conflicts, and omits sessions. `db:backup` uses `VACUUM INTO` to snapshot committed WAL data and refuses overwrite. The runtime image includes the backup script.
- **Reliable tests.** Storage tests cover durability, expiry/ownership, settings scope, sessions, revisions, rollback/import and snapshots. Browser tests wait for lookup readiness, use supported locators, and match the app's existing JSON-status contract.

API response shapes and public-view behavior are preserved, except that team edits now require a revision. The bundled UI has been updated accordingly. Public per-event backup downloads still exclude passwords and GitHub tokens. Settings backup upload and Log remain unfinished; broader GitHub caching/pagination and mobile layout work remain separate.

Kanban was completed after the migration: it gathers existing team notes, supports team filtering, three statuses, native drag-and-drop, editing and deletion. Note-specific writes check the session, event ownership and team revision transactionally. Status changes also work from Teams. Public viewing remains read-only on the board. This adds no dependencies, tables or background processes; legacy custom statuses are shown under To Do until explicitly reassigned.

Kanban validation: 10 storage tests (55 assertions) and 13 browser scenarios pass, covering persistence, filtering, drag-and-drop, editing, deletion, public viewing, stale writes, event names with spaces and dashboard login. The earlier migration test counts below describe that earlier checkpoint.

## Mentor roster and note types follow-up

Schema version 2 adds one small event-scoped `mentors` table plus note `type` and nullable `creator_id` columns. The version 1 upgrade runs transactionally at startup, preserving existing data. Old notes become mentor notes with no creator. Both whole-team saves and individual note updates validate that a selected creator belongs to the same event; invalid assignments roll back. Public event backups include the roster and note metadata; full SQLite snapshots preserve them. The Mongo importer remains for legacy Mongo data, whose notes use the new defaults.

Mentors add their name using the existing shared event login. Creator selection is attribution, not authentication or a separate help-request assignee. Help requests retain the existing To Do / In Progress / Done workflow; mentor observations remain supported alongside them, with a type filter on Kanban. No new dependencies or services are introduced.

Validated with 13 storage tests (70 assertions), 15 browser scenarios, a production build and production-browser checks for mentor registration and persisted note attribution. The storage suite includes upgrading a populated version 1 database, preserving credentials and notes, cross-event rejection, duplicate names and both note save paths.

## Optional Kanban tracking follow-up

Schema version 3 adds one checked integer `in_kanban` column, exposed as a boolean `inKanban`. Existing notes retain their board membership on upgrade. New mentor notes are plain team observations by default; new help requests are tracked. Users can toggle either kind in Teams or remove a card from Kanban by turning tracking off. Plain notes remain readable/editable in Teams without status or priority controls. Stored workflow values are retained when hidden and restored on re-enabling tracking. No new dependencies or processes are needed.

Validation: 15 storage tests (76 assertions) and 16 browser scenarios pass, including upgrades from versions 1 and 2, plain-note persistence and invalid flag rejection on both save paths, and opting into/out of Kanban across navigation and reloads.

## Team project fields follow-up

Schema version 4 adds `originality` and `project_abstract` to teams, with empty defaults for existing records. These fields belong only to teams, not individual notes/help requests. Originalita is plain text; Project Abstract stores validated paragraph/bullet blocks with text runs and bold/italic marks. It does not accept HTML strings. Both fields use the existing team revision and event authorization checks. Missing fields in older update payloads retain stored data; explicit empty values clear them. Note saves preserve the new fields.

The native browser editor adds no dependencies. It supports bold, italic, paragraphs and bullet lists; paste accepts plain text. Rendering creates known DOM nodes in the editor and escaped Vue text for read-only cards. Formatting uses browser editing commands, tested in Chrome; advanced document editing, links, images and tables are outside this small editor's scope. Public event backups and full SQLite snapshots include the project details. The legacy Mongo importer leaves the new fields empty.

Validated with 18 storage tests (88 assertions) and 18 browser scenarios. These include migration from version 3, persistence through note saves/reopening, clearing fields, rejecting malformed/oversized abstract documents, formatting through team creation/editing, public viewing and safely pasting HTML-looking text.

## Startupová matice follow-up

Schema version 5 adds team `startup_matrix` (JSON object, default `{}`) and nullable `matrix_mentor_id`. Each team can store ten independent rich-text responses using the existing validated document format. Shared field definitions retain the supplied CzechInvest questions; KLIENTI and KONKURENCE are separate fields. The editor displays default question text for missing answers and saves only changed fields. Empty answers and partially completed matrices are supported; untouched questions do not count as completed answers. Question strings are shared constants rather than repeated database content.

The dedicated PATCH `/api/team/matrix` validates the session, event/team scope, field names, document bounds, optional event mentor and team revision. It merges only the supplied answers and leaves notes, originality and abstract unchanged. Normal team/note edits do not replace the matrix. Mentor attribution is an optional responsible mentor label; any participant with the shared event login may help edit, as on the existing mentor/note pages. This adds no individual accounts or permissions system.

Matrix editors mount on the first expansion of a team section. Collapsing preserves a draft until navigation, explicit cancellation or save. Conflicts keep unsaved answers, with a clearly labelled action to discard them and load current server data. Matrices are publicly readable under the existing event-viewing rules and are included in event backups and SQLite snapshots. Existing data and legacy Mongo imports receive empty matrix defaults. No dependencies or background processes are added.

Validation: 21 storage tests (107 assertions) and 21 browser scenarios pass. Matrix coverage includes populated version 4 upgrades, partial patches/reopening, preservation during team/note edits, validation and event ownership, all ten defaults, formatted responses, optional mentor attribution, public viewing, collapse/reopen drafts and explicit conflict recovery. The rich-text editor also restores its DOM when returning from a temporary read-only saving state.

## GitHub App follow-up

Schema version 6 adds event-scoped GitHub installation connections and temporary session-bound OAuth flow records. No GitHub user/installation access tokens are written to SQLite. Private keys and client secrets remain in server runtime configuration; read-only installation tokens are minted lazily and cached in memory with a 16-installation cap. Public event reads show only a connection boolean. The settings card and repository picker use authorized server endpoints, and chart requests are restricted to team-assigned repositories. Existing personal tokens remain available as a fallback for events without an App connection.

The flow verifies active organization ownership (or personal-account ownership) before allowing a whole installation to be shared with the event. State is bound to an HttpOnly browser cookie and the event session, with PKCE and ten-minute single-use flow records. The callback page completes with a same-origin POST so Strict session cookies remain unchanged. See [setup, security and deliberate limits](GITHUB_APP.md). No new dependency or service was added. The event organization and 15 private team repositories now exist. App registration and credentials are still required; mocked provider tests are not a live GitHub authorization test.

GitHub App validation: 29 unit tests (149 assertions), 24 browser scenarios and a production build pass. Coverage includes populated schema-5 upgrades, session/event binding, expiry/replay rejection, owner checks, read-only token minting/refresh/coalescing, PKCE and JWT signatures, repository pagination/selection, callback state rejection and existing event flows.

## Social Wall from PR #6

Schema version 7 adds separate wall settings, post and BLOB media tables, retaining all prior event/team/mentor/GitHub data. This is the SQLite adaptation of upstream PR #6, with no dependency or infrastructure additions. Walls default disabled; organizer moderation, bounded uploads and optional X collection are isolated from team workflows. See [review, behavior, quotas, backup differences and validation](SOCIAL_WALL_PR6.md). Full SQLite snapshots now include uploaded attachments; public per-event JSON exports do not. The authorized Social Wall deployment `0f41cc2e-49f1-44c1-ae3d-23b49c2d0070` is now SUCCESS at schema 7; ten fictional Czech wall posts are seeded alongside the unchanged original demo. See [deployment verification](RAILWAY.md).

## Resource evidence

| Local measurement | Original Nuxt/Mongo baseline | Migrated branch |
| --- | --- | --- |
| Server files, logical bytes | 24,509,643 | 1,980,836 |
| Public files, logical bytes | 1,365,266 | 1,046,688 |
| App RSS after small read workload, normal Bun | 154–191 MiB | 86–102 MiB |
| Separate database process | MongoDB snapshot ~76 MiB | None |

Server-file bytes decreased by about **92%**. The selected runtime is Debian slim, per the owner’s preference for a conventional base image. Its earlier image-size measurement was approximately 264 MB uncompressed. The discarded Alpine experiment measured approximately 163 MB; that figure does not describe the selected image. Runtime files are not image size: the image also includes Bun and its operating-system base. Build-time memory and a long-lived production workload were not capacity-tested.

The local RSS experiment uses the same tiny workload described in [the original resource investigation](MINIMUM_FOOTPRINT.md), with substantial run-to-run variance. [Final raw samples](measurements/runtime-sqlite-2026-11-07.json) and [build-byte counts](measurements/build-sqlite-2026-11-07.json) are retained. These measurements are not a guarantee for Railway.

The earlier Alpine experiment also passed a hard **64 MiB RAM / 1 CPU** smoke test: registration/login, 50 teams, 500 notes, 100 event reads at concurrency 10, and event backup download. Cgroup peak was **62,619,648 bytes** (~59.7 MiB); OOM counters were zero. This leaves little margin and was a short test, not a soak or simultaneous-login stress test. Use **128 MiB as an initial operating budget**, then lower it only after representative longer tests. No hard Railway RAM limit has been imposed. A previous 128 MiB container test also passed and persisted all 50 teams/500 notes across restart.

`--smol` did not show a consistent advantage in the short local samples, so it is not enabled by default. Charts still contain the ApexCharts library when opened; lazy loading improves initial download but does not eliminate it.

## Railway readiness

Railway supports persistent application volumes; SQLite is deployed as part of this one web service, not as a managed database product. [Railway's volume documentation](https://docs.railway.com/volumes) confirms runtime mounts and persistence.

Prepared and verified on the existing DashHack service:

- `dashhack-data`, 128 MB disk capacity, mounted at `/data`.
- `NUXT_SQLITE_PATH=/data/dashhack.sqlite`, `HOST=0.0.0.0`, `PORT=1020`.
- Root Dockerfile and database-aware `/api/health` readiness check.
- One replica, no MongoDB service, no application deployment/domain yet.

See [resource IDs and deployment/backup commands](RAILWAY.md). A 128 MB **disk volume** and a 128 MiB **RAM budget** are independent. The volume is configured; the RAM figure is a suggested starting budget.

## Drawbacks and deliberate limits

1. **Single instance.** SQLite has one writer at a time. Short writes for a private event fit this design, but there is no multi-machine write scaling or high availability. Keep one replica; reassess storage if that requirement changes. See [SQLite WAL concurrency](https://sqlite.org/wal.html).
2. **Persistence depends on the volume.** An ephemeral container path loses data on replacement. Keep the SQLite database, WAL and shared-memory files together on `/data`; never include them in the image/Git.
3. **Backups remain necessary.** Use consistent snapshots and keep a copy outside the active volume. Public JSON downloads omit credentials and cannot fully restore the app. Snapshot copies on the same volume do not protect against volume loss.
4. **Brief deployment interruption.** The single service must restart for updates. This implementation does not provide overlapping writers or a seamless failover mechanism.
5. **Bun is required.** Node-only execution no longer works because SQLite/password support uses Bun built-ins. Bun 1.3.2 is pinned in Docker and was installed in the local user's existing `~/.local/bin` for reproducible development commands.
6. **JavaScript is required in the browser.** Removing SSR/OG tooling reduces server work and files but also removes server-rendered content and generated social-preview images. That is suitable for this private dashboard; reconsider if public search/share previews become a requirement.
7. **Conflicts require retry.** A second organizer with stale data receives a conflict and current data is reloaded. No collaborative automatic merge is implemented.
8. **This does not make events private by itself.** Existing public reads remain available; knowing the URL still permits viewing. Passwords protect edits. No new identity/access system was added for this private-event scope.

## Data and validation record

The old local `dashhack-review-mongo` database contained **zero events**, so there was no local event data to import. Its source data was not overwritten. Railway had no deployed database or event data. Future private exports can be imported explicitly; the importer was exercised with legacy bcrypt fixtures and rollback cases.

Completed checks:

- Clean local rebase; master ancestry verified; all three design commits content-equivalent via range-diff.
- **8 storage tests, 38 assertions passed.** Includes an old npm-bcrypt password fixture and legacy long-password handling.
- **8 Playwright browser tests passed.** Registration/login, team create/edit/delete, note persistence/priority/delete, mocked chart success/errors, settings persistence/rename, public reading and unauthenticated write rejection.
- Bun production builds and both Debian slim and experimental Alpine Docker builds passed. The selected Dockerfile uses Debian slim.
- Production runtime path override and `/api/health` worked.
- Live SQLite backup command produced a snapshot; unit checks verified snapshot integrity and data. The image's included backup script was also exercised.
- Capped-container workload passed; persistence checked across restart. No real GitHub token/API or Railway deployment was exercised.
- Railway volume, runtime variable names and healthcheck were read back through MCP.

Development is at <http://localhost:5002> using local `.data/dashhack.sqlite`. Browser tests use the separate `.data/playwright.sqlite` at port 5010. Relevant temporary logs remain under `/tmp/dashhack-sqlite-*`. Application data, exports and snapshots stay outside source control.
