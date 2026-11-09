# Social Wall — PR #6 integration

**Upload follow-up:** [WALL_UPLOADS.md](WALL_UPLOADS.md) supersedes this initial review's public-upload format, size/quota and runtime details. Public submissions are now photo/text only, with bounded WebP processing, mobile paste and early streaming guards on Bun.


Source: [Social wall with X.com collection and moderation, PR #6](https://github.com/ArimDev/dashhack/pull/6), by Matej-V. Reviewed revision: `e9b50d8ae7e5d390178db220c64d40c8606cbb6c`, targeting upstream `2026`. Ported as one separate feature commit onto our Bun/SQLite `feat_alby_design` branch, rather than merging its MongoDB-based backend or replacing our dashboard layout.

## Review recommendation and feature scope

Bring over the social-wall feature, with the adaptations below. Retained the PR's public masonry feed, automatic refresh, scrolling, full-screen/theme controls, QR submission link, text/photo/video submission, moderation tabs/statistics/sorting, approve/reject/undo/hide/pin/archive actions, event wall/upload toggles, time window, keyword/author filters and optional hashtag/account X collector. The supplied wall components and shared platform metadata retain their original styling and attribution through the source reference and commit co-author.

The PR had no automated tests. Its implementation needed these corrections for this branch:

- **Storage compatibility and persistence:** its routes use Mongoose, and uploads go into `src/public/uploads` resolved from the build machine. That does not preserve media through our Railway deployments. Schema 7 instead adds normalized `wall_settings`, `wall_posts` and `wall_media` tables. Upload bytes are stored as SQLite BLOBs on the existing volume. Full `VACUUM INTO` snapshots include posts, settings and attachments without a second storage service.
- **Permissions and visibility:** the PR exposes moderation settings on public responses and uploads through static URLs before approval. Public feeds now return only display/upload availability settings and approved visible posts. Pending/hidden/rejected/expired media require the matching event session. Moderation checks session expiry and event ownership, never just a cookie hint. Media responses have no-store/nosniff headers, support video byte ranges, and use stable event IDs so renaming an event preserves attachment links.
- **Bounds:** multipart streams are bounded before parsing, uploads are limited to 4 MiB and checked against supported MIME signatures; SVG/HTML are rejected. Each event is limited to 32 MiB of active media, with 64 MiB across the database. Deleting a post releases its attachment allocation. There are at most 1,000 active posts per event; public feeds load at most 200. Text, query lists, URLs and numeric settings are validated. An in-memory, bounded submission throttle allows ten submissions per minute per source IP; shared proxies can share that allowance. It resets on restart.
- **Atomic writes:** the PR saves the whole event after changing a post/settings, risking concurrent overwrites. Independent parameterized SQL mutations update only the target row, and settings/posts carry separate revisions. The UI reports failed saves and reloads current data after conflicts. Teams, notes, project fields, matrices and GitHub connections are untouched.
- **Approval semantics:** the PR exposes an auto/manual selector but always creates pending posts. Public submissions still always need manual approval. The now-labelled **X approval mode** controls only collected X posts: manual queues them, auto approves only posts passing filters. Walls default **disabled**, with manual approval, so the new feature requires an organizer to enable it explicitly.
- **X collection:** native `fetch`, one optional process-wide minute timer, sequential due events, no overlapping poll requests, startup reconciliation, persisted last-attempt/error status, 15-second request timeout and at least 15-minute backoff on HTTP 429. No timer is started without a token. Queries group hashtags and `from:account` terms before excluding reposts; the PR's `@account` term searches mentions instead. Read-only collected posts are deduplicated per event, including archived identifiers, and filters are checked before insertion. Provider response bodies/tokens are not exposed in errors.
- **UI integration:** added Social Wall to our existing sidebar and X collector to authenticated Settings; retained Kanban, Mentors, project fields and the GitHub App. Event names in URLs are encoded. Fixed ignored API errors, cleaned up the moderation key listener, bounded feed copies, lazy-loaded images, and connected rotation/idle controls to actual scrolling behavior.

The unrelated ApexCharts version bump was not imported; the social wall needs no new dependency. The unused legacy QueryHashtags settings component is retained with event scoping and revision checking; the X collector card provides the active hashtag editor.

## Use

1. Log into the event, open **Social Wall** and enable **Wall enabled**.
2. Open `/<encoded-event-name>/wall` on the display.
3. Give attendees `/<encoded-event-name>/wall/upload` or its QR code. No GitHub/event login is required to submit.
4. Refresh the moderation dashboard, approve incoming submissions, and hide/reject/archive as needed. Public displays refresh every 12 seconds.
5. Optional: set server-only `NUXT_X_BEARER_TOKEN`, restart the app, and configure **Settings → X social collector** with hashtags/accounts and a 1–180 minute interval. Enabling X collection does not enable a disabled wall. Changes are picked up on the next minute tick. The token is unrelated to the GitHub App and is never saved in event settings or SQLite.

## Limits and operational tradeoffs

- Small, single-instance private-event implementation. There is no new daemon, queue, external database, SDK or package dependency. Wall tables/methods remain separate from team workflows.
- The 128 MB Railway volume must hold SQLite, WAL and any on-volume snapshots. The media caps are logical allocations, not a guarantee that all files plus backups fit. SQLite reuses freed pages; removing a BLOB does not immediately shrink the main file. Keep external backups and check free space before media-heavy use. Videos must be short/compressed to fit 4 MiB; no resizing/transcoding is added.
- Archived rows retain text/metadata and X identifiers; their uploaded bytes are removed. This preserves deduplication but gradually grows metadata. There is no automatic retention/deletion job.
- The public per-event JSON backup keeps its existing behavior and does **not** include wall moderation or attachments. Use full SQLite snapshots to back up or move the wall. The legacy Mongo importer does not import this new PR's Mongo wall records; existing team/event imports retain their current behavior.
- X collection needs valid recent-search API access. Depending on the account/plan, X can charge or restrict access; enabling the collector without access will report an error. No paid API was called during verification. Each due poll reads up to the latest 100 matching posts, without pagination; very busy queries can miss posts between polls. Only the first media attachment is shown. Instagram is a supported manual attribution/source label, not an Instagram API integration.
- QR images use the PR's existing external `api.qrserver.com` endpoint and require internet access; the ordinary upload link works independently. External X media is displayed by the browser rather than downloaded into our volume.
- Full-screen requires browser permission; video codec support depends on the browser. Auto-scroll pauses on interaction, resumes after the configured idle wait, and can be disabled explicitly. Theme uses the app's existing color-mode preference.
- No student self-registration, individual mentor authentication or new repository provisioning is introduced by this feature.

## Validation

Storage and mocked-provider tests cover schema-6 migration with existing data/password preservation, owner/session/revision checks, media approval/hide/expiry/pin/rename/delete, MIME/URL/size/quota validation and atomic failures, non-disclosure of moderation data, SQLite snapshot restoration, X query construction, deduplication/archival, X-only auto approval, overlap/scheduling, absent tokens and redacted rate-limit errors. Browser tests exercise the public upload/approval flow and byte-range media, wall controls, disabled states, forged uploads, filters, guest/cross-event rejection, stale moderation and persisted X settings, alongside the existing event suite.

Verified: **38 unit tests (225 assertions)**, all **24 existing browser scenarios** plus **3 new wall browser scenarios**, and a production build. An isolated production runtime smoke check passed health/schema initialization, event login, wall settings, multipart PNG submission, pending-media privacy, approval, public feed and byte ranges. Build/test logs: `/tmp/dashhack-pr6-unit.log`, `/tmp/dashhack-pr6-e2e.log`, `/tmp/dashhack-pr6-wall-e2e.log`, `/tmp/dashhack-pr6-build.log`.

Live X credentials and an actual X API response were not exercised. This feature commit does not deploy or enable a production wall.

## Czech demo fixtures

Matej's PR contains no committed seed data or uploaded media fixtures. `scripts/seed-demo-wall.js` supplies ten clearly labelled fictional Czech examples for the existing **Student Hackathon Demo** only: six visible approved posts (two pinned), two pending, one hidden and one rejected. Three small original PNG illustrations total 6,137 bytes and are generated with built-in zlib; there are no external photos, real tweets or added dependencies. Full snapshots preserve them.

```sh
# Preview, then explicitly apply to the existing schema-7 database.
NUXT_SQLITE_PATH=/path/to/dashhack.sqlite bun scripts/seed-demo-wall.js
NUXT_SQLITE_PATH=/path/to/dashhack.sqlite bun scripts/seed-demo-wall.js --apply
```

The seed refuses an absent/wrong-schema database or an event missing the existing 15 teams/45 notes. Stable per-event post identifiers make reruns idempotent; it never replaces existing posts or moderation decisions. It creates/enables wall settings only if none exist, respecting an already-configured disabled wall. It never changes event credentials, teams, notes, mentors, GitHub connections or other events. The operational caller must take a full snapshot first. Locally, all ten posts were seeded after a consistent backup and schema upgrade.

Fixture follow-up validation: **39 unit tests / 241 assertions**, including dry-run behavior, event isolation, valid PNG media, retained teams/notes/settings and idempotence after an organizer rejects a post/disables the wall. The prior 27 browser checks, build and production smoke record above cover unchanged application code.

The later authorized Railway deployment is **SUCCESS**, with identical Czech fixtures seeded in production and original event/team/note/mentor fingerprints retained. See [deployment record and live links](RAILWAY.md#social-wall-deployment--pr-6).


## Polling and display access update — 2026-11-09

The X collector defaults to five minutes; event Settings → X social collector accepts 1–180 minutes and an explicit Automatic X polling on/off switch. The scheduler checks once a minute, including at startup, so a due request runs on the next tick. A 429 defers retries for at least 15 minutes. Turning polling off prevents new scheduled requests and preserves existing wall posts. A request already in progress may finish. The UI status reflects the last successfully saved settings, rather than an unsaved switch value. An existing enabled setting can still be turned off if the server token has been removed.

The public wall refreshes stored posts every 12 seconds without making an X API call. The floating display cogwheel now requires a live session belonging to that event, checked by the public wall API (no-store); anonymous visitors and sessions for other events cannot see it. The check repeats on wall refresh, including session expiry. These presentation controls remain browser-local. Server authorization already protects polling and moderation writes; the shared event login does not identify individual mentors.

The only token variable is server-only `NUXT_X_BEARER_TOKEN`, configured on the DashHack Railway service. Do not use plain `X_BEARER_TOKEN`, expose it through public runtime configuration, save it in SQLite or commit it. Add the token with polling off; choose the test hashtag/account, enable briefly for a collection attempt, then disable and read back `xEnabled: false` even if collection fails. Check the last attempt/error and imported posts. The current implementation requests at most 100 recent results per attempt and deduplicates existing posts. No live API test has been performed yet: the token and test query are pending.

Production read-only check found no token and no enabled X collection (effective defaults: disabled, five-minute interval). UI/access changes are prepared locally; deployment is pending separately from the volume expansion work. No production content/settings were changed by this check.

Validation: 48 unit tests (281 assertions), five Chromium social-wall scenarios, 19 desktop/iPhone WebKit social-wall/mobile scenarios and the production build pass. Ownership checks cover anonymous, wrong-event and correct-event sessions; scheduler tests verify disabling stops subsequent collection while approved posts remain.


## Query draft preservation — 2026-11-09

Hashtags/accounts and the interval now use an explicit Save queries action rather than blur autosave. Query parsing accepts whitespace, commas and new lines and removes duplicate terms. Fields cannot be edited before the initial load; an incoming save response only updates revision/saved status, never replaces the current text. Validation/network errors retain drafts. Revision conflicts retain drafts and require the user's explicit Reload saved settings action before reviewing/retrying; no silent overwrite or automatic reload. The independent polling switch patches only `xEnabled`, so it neither saves nor discards unfinished queries. Query saves patch only the three query/interval fields and cannot change polling. Existing backend event authorization/revisions still apply.

Chromium coverage: six scenarios pass, including blur without a write, space-separated queries, deduplication, reload persistence, validation failure, conflict retention and typing during a delayed save. Production release must retain the old storage profile while the 128 MB volume remains unchanged; the larger profile in fe79623 is still pending expansion. No X requests are needed to verify this editing fix.

Deployed and live-verified as release `f48445c` / Railway `bd42a185-3391-4c6b-8b81-e1f201948c98` (SUCCESS); see RAILWAY.md. Desktop/iPhone WebKit coverage completes 20 passing cases. The runtime token is now configured, collection is paused, and a real search still awaits the event hashtag/account.


## Full-post reader for scrolling copies — 2026-11-09

The repeating feed used inert/pointer-disabled copies, so a visible Read full post button could not receive clicks once a copy scrolled into view. Copies now accept pointer input while remaining hidden from the accessibility tree and omitted from keyboard navigation; focus returns to the corresponding original card. Videos in decorative copies omit controls; the original card and full reader retain them.

Read full post opens the existing DialogShell with complete escaped text and media, rather than expanding a moving masonry card below a clipped viewport. It scrolls independently, traps keyboard focus and supports Escape, close button and backdrop dismissal. Animation stops while the reader is open; closing preserves feed position and resumes auto-scroll after five seconds. Restored focus and passive pointer re-entry cannot extend that close delay. Manual-scroll mode remains manual. Pointer entry/movement and keyboard focus also pause motion so controls can be targeted. Mobile uses the same scrollable reader. No new library/service/schema or persistence change.

Regression coverage explicitly moves loop copy 2 into view and clicks it without forced actions, checks the full text, scrollability, frozen feed transform, Escape/close and focus restoration/keyboard reopen. Existing mobile read-full coverage now checks the reader rather than inline expansion.

Deployed final source `41406e3` / Railway `3bcfaf46-c12b-4e80-9d0e-112a7bb6a258` (SUCCESS). Seven Chromium and 21 desktop/iPhone WebKit wall/mobile checks pass; targeted Chromium/WebKit and live checks verify the five-second close delay. All production content fingerprints remain unchanged; see RAILWAY.md.


## Reliable X stop control — 2026-11-09

Stop X polling is an independent action outside the loading/disabled settings fieldset. It remains available during query load/save failures or pending requests, and only disables while its own stop is pending. Unchecking the polling switch uses the same stop action; when the last saved state is ON, the switch remains usable for OFF even while a query save is pending. Enabling may still wait for the save. Loads/saves/stops have bounded request timeouts. Unknown initial status says Checking rather than falsely claiming OFF; stop errors never show a confirmed pause.

Authenticated POST `/api/wall/:event/posts` action `pauseX` ignores a stale caller revision and patches only `xEnabled:false` using current stored state. Every stop advances the revision even if already OFF, invalidating delayed enable requests with older revisions. Enabling still requires a current revision. Server event ownership remains mandatory. A UI operation generation prevents responses from earlier loads/saves from replacing a confirmed OFF state. Draft queries are retained.

The scheduler already filters stored enabled walls, and syncEvent rechecks that setting before sending a request. Token presence and the public 12-second feed refresh do not enable collection. Stopping prevents new requests; a request already sent to X may finish and be billed. There is no claim of an account-wide monetary cap. Tests never call the real X API to verify stopping.

Deployed final source `ac54f89` / Railway `6d547563-c710-4c2b-b317-dcf6b512e357` (SUCCESS). Production OFF was verified repeatedly across restarts with last X attempt unchanged at 13:35 CET. Live stopping tests never enable collection and make no real X requests. Validation and backup details are in RAILWAY.md.

Approval semantics: the X approval mode applies at insertion of newly collected posts. It does not retrospectively change already-pending, rejected or hidden posts. On 2026-11-09 production was corrected from Manual to Auto through the real dropdown and 100 eligible existing X imports were explicitly approved; public uploads remain manual and polling remains OFF. See RAILWAY.md.

Query examples are placeholders, never defaults: Example only prefix, muted italic/normal-weight styling, and No handles entered guidance for an empty optional account list. Preserve this distinction in light and dark themes; saving an empty list must not store the example. Deployed in `dc47d0d`; see RAILWAY.md.
