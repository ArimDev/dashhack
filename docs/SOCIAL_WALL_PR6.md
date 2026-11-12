# Social Wall — PR #6 integration

## PR #8 integration — 2026-11-12

Merged `collector_settings` PR #8 through head `017f5304a8577b598446d37c55d44564f0805a5d` into feat_alby_design, retaining both Matej-V commits. Collector settings use the accessible UiSwitch and server-confirmed ON/OFF badges, with no redundant Stop button once status is known. A Stop fallback remains only during initial loading/load failure, when the switch cannot safely infer its current state. OFF remains available during pending query saves and stale responses cannot re-enable polling. Headers wrap on narrow phones. Saved-query drafts and the local Last attempt formatter are retained.

Public post headers show local time for today, Yesterday for the previous local day and localized dates for older posts. The existing feed refresh advances a shared date reference at local midnight without adding timers or replacing cards. Long handles truncate before the timestamp. Useful certificate and network diagnostics are preserved; arbitrary exception text/provider bodies/credentials remain redacted, rather than adopting the PR's unrestricted raw-error exposure. Existing backoff and request-ID behavior is retained.

Validation: clean production build with pinned Bun 1.3.2/Sharp packaging; 131 unit tests / 991 assertions; nine production HTTPS Chromium scenarios covering both collectors' loading/OFF/stale-response behavior, 320px/390px layout and keyboard focus, timestamp midnight rollover, photo focus/wide tiles, compact text and 24-hour/two-tab sessions. No dependency/schema/service changes; schema stays 15. Backup branch: backup/feat-alby-before-pr8-20261112. Production deployment details are in RAILWAY.md.

## Compact paragraph spacing — 2026-11-12

WallPostText omits empty/whitespace-only blocks from the rendered view, for every platform, so pinned organizer posts do not reserve blank lines between paragraphs or before their photos. Saved rich text and editor drafts remain unchanged. Formatted paragraphs inherit the same line-height as plain cards; pinned full-text behavior and the existing projector text sizing remain. Production build and two HTTPS Chromium scenarios pass organizer/X spacing equality, a bounded photo gap and retained full formatting/optional-media behavior. The shared browser helper now waits for loaded storage/settings before saving to avoid a stale initial revision race.

## Bare top-right QR and posting hashtag — 2026-11-12

At the user's request, sharing now uses a transparent top-right link with no card background/border/shadow or visible text; only the QR square is white. It retains gutter-filling desktop size and safe-area-aware 16px top/right spacing. An icon-only phone link preserves upload navigation without requesting a mobile QR. A wrapper hides the phone icon on desktop despite the icon component's own display style. The centered fullscreen QR modal is unchanged. The canonical ATT event's left title rail also displays #atthack, with reserved title height so both fit phones and short landscape; unrelated events have no hardcoded hashtag.

Validation: clean Bun 1.3.2 production build with native image packaging; three production HTTPS Chromium scenarios cover five desktop/projector sizes, transparent wrapper/white square, fullscreen behavior, mobile upload access, hashtag bounds at desktop/phone/short landscape and exclusion on unrelated events. No database/settings/schema change.

Deployment update: the picture-dragging/wide-tile follow-up below is now committed and pushed as `5963411`, deployed successfully as `900da65b-8fdf-476e-9f52-c4e8fe3626f5`. Live health/rendering and exact content preservation pass; Instagram ON / X OFF retained. See RAILWAY.md.

## Picture dragging and wide tiles — local follow-up, 2026-11-12

Photo framing now uses an on-picture focus marker instead of sliders: click/drag with pointer capture, tap on touchscreens, or use arrows (Shift for ten-point steps). Coordinates clamp to 0–100; capture release/cancel ends the gesture, and original-ratio images need no focal adjustment. Moderator Edit post also offers one-/two-column tile width, including posts without photos. The existing media_layout JSON accepts optional span 1/2; older records retain one-column behavior without a migration. Wide cards clamp to available columns, including one on phones; pinned text announcements retain full-wall width.

Validation: clean frozen install and production build with Bun 1.3.2/Sharp packaging; 28 targeted persistence tests / 305 assertions; production HTTPS Chromium scenarios pass real drag persistence, touch tapping, keyboard focus adjustment, two-column saved width, phone fallback and existing packed-layout behavior. A CSS test assertion was corrected to inspect grid-column-start for the span shorthand. Changes are local and not deployed.

Deployment validation update (2026-11-12): a clean source copy builds successfully with production-pinned Bun 1.3.2, including Sharp packaging. Local HTTPS production smoke and eight focused Chromium scenarios pass (reader, parked pointer, speed, pinned edits/formatting, student moderation, two-panel layout and phone wall). The default-reader test was corrected to disable animation before Playwright's stability-checked click. The complete unit suite passes on Windows Bun 1.4.4: 126 tests / 964 assertions. Bun 1.3.2's Windows test cleanup locks and streaming-test hang prevent claiming a full pinned-runtime suite pass; no runtime/dependency upgrade is included. This supersedes earlier local build/browser limitations below. Collector timestamps use the browser's locale/timezone with the original ISO value retained in the time element's title/datetime attributes.

## Per-post article preview (latest local follow-up, 2026-11-12)

Supersedes the full-text-only behavior below. Regular X, Instagram and student posts default to a 100-character preview and a Read full article dialog. Pinned organizer/community (`manual`) posts default to complete text, with or without photos. Edit post exposes a shortening toggle and integer character limit (1–5000); explicit per-post choices override defaults. Formatting is retained in previews. Full article view pauses scrolling and returns focus to the accessible original card; decorative loop copies remain pointer-readable. Schema 15 stores optional text-display settings independently of photo framing, preserving original text, media and moderation decisions. Older posts use computed defaults without rewriting their content.

Validation: 126 unit tests / 964 assertions passed, edited Vue components compile, and standalone Chromium checks passed default/custom previews, full article dialog, focus restoration, pinned organizer full text and existing mosaic/photo framing behavior. Full Nuxt browser/build limitations recorded below still apply. No deployment performed.

## Moderation photo framing and complete text (local follow-up, 2026-11-12)

Reviewed the original PR #6 diff via GitHub. It used CSS masonry columns, natural variable card heights, 420px media caps, object-cover images, object-contain videos and 100-character text truncation. The local implementation retains variable-height packing and original media proportions, prioritizes video over its thumbnail, and removes the read-more button/dialog and truncation entirely. QR modal and interaction pause remain.

Moderators can now edit captions/authors/photos on X and Instagram posts as well as student/community posts. Photo framing offers Original (default, no crop), square, 4:3, 3:4, 16:9 and 9:16, with horizontal/vertical focus sliders and live preview. Original bytes/URLs are preserved by framing; it does not approve a post implicitly. Schema 14 adds one media_layout JSON column with empty defaults; event ownership, post revision and framing bounds are validated transactionally.

Bun 1.4.4 was found in the WinGet package directory outside PATH. The updated 124-test unit suite passed; the subsequently added three-source framing test also passed (two layout tests / 47 assertions). Standalone Chromium checks passed complete text, absence of reader controls, layout settings, tall/wide photos, square framing/focus and restoring original proportions. Real Nuxt browser startup timed out with repeated dev-worker restarts. Production client/server compilation passed, but Nitro output preparation fails with EPERM removing the existing src/.output directory. Full build and real Nuxt editor browser tests remain unverified. Nothing deployed.

## Configurable mosaic (local follow-up, 2026-11-12)

The public wall shows complete post text and uses measured masonry rows instead of round-robin columns. Photos/videos keep intrinsic proportions instead of a fixed 4:3 letterbox. The existing 1800px wall cap and automatic column breakpoints remain. Cards retain their DOM identity as media loads and later batches append.

Authenticated display cogwheel and moderation settings expose Panels across (Automatic or 1–6), panel spacing (0–32px), content padding (0–32px), corner radius (0–32px) and post text size (14–32px). Two panels across supports larger cards; zero spacing/corners produces an edge-to-edge mosaic. Phones below 640px use one panel. Pinned text announcements continue spanning the whole feed. Natural photo proportions mean the final bottom edge can be uneven; interior cards stack without row-sized holes.

Settings are stored in existing wall-settings JSON, with defaults for older events and no schema change. `setLayout` permits only these five fields, checks event authorization/revision, returns a small settings response and cannot patch collectors. Browser layout validation passed in a standalone Chromium/Vite harness using actual Vue components and mocked API/media: full text, saved two-column layout, zero gaps/corners, tall/wide intrinsic ratios, packed columns and phone fallback. Vue compilation and diff checks pass. Bun-dependent storage tests and full Nuxt build remain unrun on this host because Bun is unavailable. No deployment or live settings changes performed.

**Upload follow-up:** [WALL_UPLOADS.md](WALL_UPLOADS.md) supersedes this initial review's public-upload format, size/quota and runtime details. Public submissions are now photo/text only, with bounded WebP processing, mobile paste and early streaming guards on Bun.


Source: [Social wall with X.com collection and moderation, PR #6](https://github.com/ArimDev/dashhack/pull/6), by Matej-V. Reviewed revision: `e9b50d8ae7e5d390178db220c64d40c8606cbb6c`, targeting upstream `2026`. Ported as one separate feature commit onto our Bun/SQLite `feat_alby_design` branch, rather than merging its MongoDB-based backend or replacing our dashboard layout.

## Review recommendation and feature scope

Bring over the social-wall feature, with the adaptations below. Retained the PR's public masonry feed, automatic refresh, scrolling, full-screen/theme controls, QR submission link, text/photo/video submission, moderation tabs/statistics/sorting, approve/reject/undo/hide/pin/archive actions, event wall/upload toggles, time window, keyword/author filters and optional hashtag/account X collector. The supplied wall components and shared platform metadata retain their original styling and attribution through the source reference and commit co-author.

The PR had no automated tests. Its implementation needed these corrections for this branch:

- **Storage compatibility and persistence:** its routes use Mongoose, and uploads go into `src/public/uploads` resolved from the build machine. That does not preserve media through our Railway deployments. Schema 7 instead adds normalized `wall_settings`, `wall_posts` and `wall_media` tables. Upload bytes are stored as SQLite BLOBs on the existing volume. Full `VACUUM INTO` snapshots include posts, settings and attachments without a second storage service.
- **Permissions and visibility:** the PR exposes moderation settings on public responses and uploads through static URLs before approval. Public feeds now return only display/upload availability settings and approved visible posts. Pending/hidden/rejected/expired media require the matching event session. Moderation checks session expiry and event ownership, never just a cookie hint. Media responses have no-store/nosniff headers, support video byte ranges, and use stable event IDs so renaming an event preserves attachment links.
- **Bounds:** multipart streams are bounded before parsing, uploads are limited to 4 MiB and checked against supported MIME signatures; SVG/HTML are rejected. Each event is limited to 32 MiB of active media, with 64 MiB across the database. Deleting a post releases its attachment allocation. There are at most 1,000 active posts per event; public feeds load at most 200. Text, query lists, URLs and numeric settings are validated. An in-memory, bounded submission throttle allows ten submissions per minute per source IP; shared proxies can share that allowance. It resets on restart.
- **Atomic writes:** the PR saves the whole event after changing a post/settings, risking concurrent overwrites. Independent parameterized SQL mutations update only the target row, and settings/posts carry separate revisions. The UI reports failed saves and reloads current data after conflicts. Teams, notes, project fields, matrices and GitHub connections are untouched.
- **Approval semantics:** public submissions always need manual approval. **Collector approval mode** controls newly collected X and Instagram posts: manual queues them, auto approves only posts passing filters. Walls default **disabled**, with manual collector approval, so the feature requires an organizer to enable it explicitly.
- **X collection:** native `fetch`, one optional process-wide minute timer, sequential due events, no overlapping poll requests, startup reconciliation, persisted last-attempt/error status, 15-second request timeout and at least 15-minute backoff on HTTP 429. No timer is started without a token. Queries group hashtags and `from:account` terms before excluding reposts; the PR's `@account` term searches mentions instead. Read-only collected posts are deduplicated per event, including archived identifiers, and filters are checked before insertion. Provider response bodies/tokens are not exposed in errors.
- **UI integration:** added Social Wall to our existing sidebar and X collector to authenticated Settings; retained Kanban, Mentors, project fields and the GitHub App. Event names in URLs are encoded. Fixed ignored API errors, cleaned up the moderation key listener, bounded feed copies, lazy-loaded images, and connected rotation/idle controls to actual scrolling behavior.

The unrelated ApexCharts version bump was not imported; the social wall needs no new dependency. The unused legacy QueryHashtags settings component is retained with event scoping and revision checking; the X collector card provides the active hashtag editor.

## Use

### Apify Instagram collector

Captapi was replaced by Apify on 2026-11-12 (Captapi kept failing with Instagram login_wall). Set server-only `NUXT_APIFY_API_KEY` and restart the app. Apify task `lvvaclavek/instagram-scraper-task` (`EfFPXy7N73Gc1JTMQ`, actor `apify/instagram-scraper`, hashtag `#atthack`, 10 posts) defines the hashtag and post count. The task ID is `APIFY_INSTAGRAM_TASK_ID` in `src/server/services/instagram-collector.js`.

The app drives scraping frequency through the event's 1-180 minute Polling interval. Each poll of the existing in-process minute scheduler checks `GET /runs/last` of the task; unless that run is still active (READY/RUNNING/TIMING-OUT/ABORTING) it starts one run with `POST /runs?waitForFinish=60`, then imports `GET /runs/last/dataset/items?status=SUCCEEDED&clean=true&limit=50`. A run that outlasts the 60-second wait is imported on the next poll. All calls use `Authorization: Bearer`, never a URL token. Runs take about 6-16 s and cost about $0.027 each, so the default 20-minute interval is about $1.9/day (5 minutes about $7.8/day). The Apify schedule `DgwiBFOqgoqC3zSDc` was disabled on 2026-11-12 so runs are not paid twice; do not re-enable it while app polling is on. Instagram polling defaults OFF; Settings shows only the interval and the ON/OFF switch. `instagramQueryHashtags` remains stored but is not used for Instagram. The shared collector approval mode still applies.

Item mapping: `url`/`shortCode` give the stable `instagram-<shortcode>` ID and source link; `ownerFullName`, `ownerUsername`, `caption` and `timestamp` map to author, handle, text and `createdAt`. Instagram CDN links expire, so each new post's `displayUrl` (carousel: first child) is downloaded once from an allowlisted `cdninstagram.com`/`fbcdn.net` host (no redirects, 20 s, at most 2 MiB), re-encoded by the existing `normalizeWallMedia` (WebP, 1920 px, at most 1 MiB) and stored as a SQLite BLOB counted in the normal media quotas. If the photo cannot be downloaded the post is skipped and retried on the next poll with fresh links. Videos are not stored; reels show their cover photo. Existing posts are never re-downloaded and only get the original placeholder text repairs.

Errors are mapped to safe messages (401/403 token, 402 credits, 404 no finished run yet, 429 rate limit, 5xx) with the existing persisted backoff and Retry-After handling. Provider bodies and the token are never logged or stored. A live read of the real task into a throwaway database imported all 10 posts with photos.

Stop Instagram polling remains available during query load/save, checks event ownership, advances settings revision even when already OFF, and preserves query drafts and stored posts. Stale enables fail. A request already sent may finish and be billed, but stopped walls reject its imports and no next hashtag request starts while OFF. Errors never expose provider bodies or keys. Collector tests use mocked responses only; browser settings tests keep polling OFF. Live Captapi responses and media availability remain unverified.

The earlier review below describes the pre-Instagram implementation; Instagram is no longer limited to manual attribution.

The shared type contract is [src/shared/wallPost.ts](../src/shared/wallPost.ts): `WallPost` describes persisted/API posts, `WallPostInput` describes validated write input, and `CollectedWallPost` describes X/Instagram mapping output. Storage normalization and writes, both collectors, and public/moderation cards reference it through JSDoc while retaining JavaScript runtime code. Runtime validation remains in `WallStore`; no ORM, schema change or media-expiry field is introduced.

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


## Unified hover/reader idle delay — 2026-11-09

Hover, pointer exit, keyboard focus and reader close now use the same event `idleWaitSeconds` setting. The default and the production Demo value are five seconds (the event had retained 30 seconds). A stationary pointer over a card does not keep the wall paused forever: it resumes after the last interaction's delay without opening a reader. Leaving the feed restarts that same delay. The reader stays paused while open; closing uses the same setting and guards focus restoration. Manual-scroll mode remains manual. The organizer control is Social Wall → Resume scrolling after interaction (seconds).

## PR #7 integration verification — 2026-11-09

Pulled remote merge `43c6604` and rebased `feat_alby_design` onto `origin/master` (`3fa3669`). The six PR commits were replayed above the existing app work; the resulting tree matched the remote merged tree exactly. Original merge history remains at local backup `backup/feat-alby-pr7-remote-merge-20261109`, with the pre-sync branch at `backup/feat-alby-before-pr7-sync-20261109`.

The new form duplicated X field/button labels, making existing global browser selectors ambiguous. Follow-up scopes X hashtag/reload selectors to the X form and gives Instagram the same muted, explicit example-only placeholder treatment. All 54 unit tests (354 assertions), ten targeted Chromium scenarios and four WebKit scenarios pass. Production build and isolated production runtime checks pass: health, login, fake-key configuration, both collectors OFF by default, and authenticated Instagram stop. No provider requests or production settings/data changes were needed. Logs are in `/tmp/dashhack-pr7-{unit,e2e-fixed,webkit,build}.log`. This integration has not been deployed to Railway; its storage-safe release branch remains separate.

## Fast wall startup, deferred media and speed presets

The public wall initially requests 12 posts, paints and animates them, then fetches the remainder of the existing 200-post feed cap in the background. Remaining cards are mounted in 12-card idle batches (timer fallback for browsers without requestIdleCallback). Stable per-column assignment avoids CSS column rebalance moving existing cards whenever a batch arrives. Long feeds render only the two copies required for a seamless loop, removing the redundant third copy; shorter feeds still repeat enough times within the existing cap. Unchanged post objects are reused across the normal 12-second stored-feed refresh. An eight-second fetch deadline and retaining the last successful feed prevent a failed refresh from replacing a running display with an error/loading screen. This does not query X/Instagram or change their collection intervals/settings.

Image/video containers reserve a 4:3 preview area so late media cannot continually reshape the loop. Images fit inside that area without cropping; the reader uses a natural-height contained view. One shared IntersectionObserver per viewport assigns media sources only near the viewport (600px preload margin), tracking transformed loop copies. Images decode asynchronously; videos use preload=none. Opening the full-post reader loads its media immediately. Native lazy loading remains a fallback. No image-load promise blocks scrolling.

A passive pointerenter from mounting the feed under a stationary mouse no longer starts the interaction pause. Real pointer movement/down, keyboard focus, wheel and pointer exit still pause/resume through the saved five-second interaction setting, and an open reader still pauses animation. Phone/touch/reduced-motion defaults stay manual.

The bottom-right authenticated cogwheel now offers **Slow 20 / Normal 40 / Fast 60 / Very fast 80 px/s**. Fixed pixel speeds work independently of feed size, unlike the former height/cycle formula, which saturated at its maximum on a long feed. The same presets appear in moderation settings. `scrollSpeed` defaults to 40, is validated as an integer 10–100 and is stored in existing wall-settings JSON (no schema migration). Legacy idleCycleSeconds remains accepted for compatibility but no longer drives the current display. Public settings include the speed/revision; owner-only POST posts action setSpeed patches only scrollSpeed with the current revision and returns a small settings response, avoiding the full moderation-post payload. Failed saves revert the optimistic speed and display an error; older refresh revisions cannot replace a newer speed. Collection flags/queries are never submitted by this control.

Public GET /api/wall/:event accepts bounded integer limit (1–200) and offset (0–199), returning total/hasMore plus the existing wall/posts fields. Omitted pagination still returns the former capped feed. Pending/hidden/deleted/expired filtering and pin order apply before pagination; temporary concurrent insertion/page-boundary differences reconcile on the next full refresh. No new service/SDK/dependency or volume change.

## Wall layout and moderation polish

The public wall uses the full height, with a slim bottom-to-top title rail on the left and a floating 160px QR card at the top right (16px edge spacing). The authenticated cogwheel has Expand QR code, opening a full-screen, focus-trapped modal that fits phone portrait/landscape. Closing resumes the feed after the existing five-second delay. The QR remains a direct upload link; the modal is a display control. Lazy feed/media loading and manual touch/reduced-motion defaults remain.

Optional `wall.title` (120 characters) controls the public wall, browser title and upload-page label, falling back to the event name. API/upload paths retain the event identifier. Production display title is AT&T Hackathon Junior 2026. The JSON settings extension needs no schema migration.

Moderation now requests server pages (10/20/50 per page, default 20; API maximum 100), with text/author/handle search, status tabs, newest/oldest sort and page clamping after changes. Search terms are bound parameters and wildcard characters are literal. Counts cover all undeleted posts; only the requested page is rendered. Queries are debounced and stale requests aborted. Mutations return the requested view; old no-query clients retain their previous response shape.

Blocked-word/author hints explain comma/newline delimiters, case-insensitive substring matches and that the rules block new posts. Existing approved posts are not retroactively hidden. X/Instagram hints describe their whitespace/comma/newline separators. The settings save includes scrollSpeed, fixing the moderation dropdown's previously omitted field. Collector flags are not part of this patch. GitHub join and organizer link instructions were shortened without changing OAuth or invitation semantics.

## Captapi login-wall diagnosis and social source footer — 2026-11-12

The organizer-reported 07:48 UTC Instagram failure was checked against Railway logs and Captapi's free account request-history endpoint, without issuing a new hashtag search or downloading the key. Captapi recorded HTTP 502, errorMessage login_wall, creditsUsed 0 (request 28d0bb8d-2c54-4bcf-a55e-d820af7d021a). Multiple scheduled attempts had the same provider-side failure. This is Instagram blocking Captapi's scraper, not an event-password, API-credit or local database failure. Restoring upstream collection still requires provider recovery; do not claim a successful live import from mocked recovery tests.

Collector now classifies safe provider errors, exposes the support request ID, persists failure count/next attempt, respects Retry-After and uses 15/30/60-minute backoff (at least the configured interval). Persistent/non-retryable errors wait at least one hour. Normal success clears the diagnostics. Polling flags, hashtags and existing posts are preserved; no immediate extra search or fallback provider is introduced. UI correctly states that successful nonempty searches cost 2 credits, while failed/empty searches are not charged. Provider response bodies and secrets are never logged.

Removed our added visible Open on X/Instagram footer. A keyboard-accessible whole-card source anchor remains, alongside independent hashtag/URL links, reader and video controls. Original URLs in imported captions remain original content, not an appended source footer.

Validation: 123 unit tests / 903 assertions; production build/native packaging; direct Chromium checks of visually hidden source label, whole-card/hashtag navigation, URL safety and full-post reader. Provider outage remains external; only existing scheduled requests may be used for live follow-up.

## Public display controls and matching hashtag size — 2026-11-12

The wall cogwheel is visible to every visitor, including guests and sessions for another event. Guest layout and speed changes apply locally until page reload and survive stored-feed refreshes. Theme, auto-scroll, fullscreen and QR controls remain available. Matching authenticated event sessions still save shared layout/speed with the existing revision checks; moderation, collectors and all server write permissions are unchanged.

The event's #atthack label uses the title's exact responsive font size, weight and tracking (36px desktop, 24px phone, 20px short landscape). The title reserves more vertical space for the larger hashtag. Other events do not receive this label. Feed cap, QR presentation and mosaic behavior are preserved.
