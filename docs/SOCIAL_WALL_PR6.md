# Social Wall — PR #6 integration

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
