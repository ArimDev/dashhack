# DashHack on Railway

Updated 2026-11-09 for the SQLite branch and mobile UI. This project is separate from the school website in `../skola_boretice`.

## Prepared resources

| Resource | Value |
| --- | --- |
| Project | `DashHack` — `712b21fd-3995-473e-b0e5-c2b37feddc3d` |
| Environment | `production` — `7646006f-d5f1-4c62-a8b6-e540f0f26f96` |
| Web service | `dashhack` — `9960307b-3bd3-41a9-ade4-67a2ca421745` |
| Persistent volume | `dashhack-data` — `14d791fc-cdfd-4e1d-a177-6be2a8beab48`, 128 MB, `/data`, `sfo` |
| Dashboard | [DashHack project](https://railway.com/project/712b21fd-3995-473e-b0e5-c2b37feddc3d) |
| Git branch | `feat_alby_design`, rebased onto `master` release 1.0 |
| First deployment | `0fd0cc09-af75-4ae6-9059-28d71190aa1e` — historical SUCCESS |
| Latest verified deployment | `a2080dab-049d-4751-ad11-76ac1bdc0a95` — SUCCESS, lazy wall / saved speeds / schema 7 |
| Public domain | [dashhack-production.up.railway.app](https://dashhack-production.up.railway.app) → port 1020 |

The folder is linked to this project/environment/service. The web service uses the root `Dockerfile`, `PORT=1020`, `HOST=0.0.0.0`, and `NUXT_SQLITE_PATH=/data/dashhack.sqlite`. Healthcheck: `/api/health`, which opens/checks SQLite. Settings and the attached volume were read back after preparation. There is one web replica and no database service. The school project was not modified.

SQLite persists through restarts and redeploys **only when its files are on the volume**. Railway mounts volumes at runtime, so automatic schema initialization occurs on first database access in the running app. Do not run volume-dependent migrations during build or pre-deploy. See [Railway volumes](https://docs.railway.com/volumes).

## MCP and authentication

The existing machine-wide `~/.codex/config.toml` entry is:

```toml
[mcp_servers.railway]
command = "/home/alby/.railway/bin/railway"
args = ["mcp"]
```

The CLI is installed at that absolute path (verified version 5.69.0). MCP initialization, tool discovery and account reads passed, and direct Railway tools are available in this session. CLI and proxy reuse `railway login` authentication. No Railway credential belongs in this repository. See [Railway MCP](https://docs.railway.com/ai/mcp-server).

Use explicit DashHack IDs for remote operations. Relink if needed:

```sh
railway link \
  --project 712b21fd-3995-473e-b0e5-c2b37feddc3d \
  --environment 7646006f-d5f1-4c62-a8b6-e540f0f26f96 \
  --service 9960307b-3bd3-41a9-ade4-67a2ca421745
railway status --json
```

Agents using the Railway skill should set its `RAILWAY_CALLER` and a stable request-specific `RAILWAY_AGENT_SESSION` inline on CLI calls. Use direct MCP tools for platform reads/routine operations.

## Deployment record — 2026-11-07

Deployed the current uncommitted SQLite/Kanban/mentor/startup-matrix implementation through a clean CLI source upload. Exact deployment: `0fd0cc09-af75-4ae6-9059-28d71190aa1e`, observed **SUCCESS**. [Deployment dashboard](https://railway.com/project/712b21fd-3995-473e-b0e5-c2b37feddc3d/service/9960307b-3bd3-41a9-ade4-67a2ca421745?id=0fd0cc09-af75-4ae6-9059-28d71190aa1e).

Source package: 67 files, 403,488 bytes, SHA-256 `632950b9f63fada13eef1b76c631876d444709dd7c8328ea2ec72e73e63d0288`. It includes the pinned lockfile and application source, without local environment files, databases, generated output or node_modules. The temporary package is `/tmp/dashhack-railway-release-5lt7sx8v`. Git history was not pushed or committed.

Railway built the standard Bun 1.3.2 builder / Debian slim runtime successfully. SSH verification of this deployment returned `/api/health` status `ok`, database path `/data/dashhack.sqlite`, schema version 5 and `PRAGMA integrity_check` `ok`. Production starts with zero events; the local 15-team demo was not copied. Existing volume, single replica and healthcheck configuration were retained. The user explicitly approved public exposure after automatic review required separate authorization. Created `dashhack-production.up.railway.app` (domain ID `2c0b62bf-a957-4f6f-adbf-db58bcfc0e30`) targeting port 1020. HTTPS `/` returns HTTP 200 and `/api/health` returns `{"status":"ok"}`. Production still starts empty; the local demo was not copied.

## Demo data import — 2026-11-08

At the user's request, copied the local **Student Hackathon Demo** into the already-created empty production event `97c87fe6-f510-4117-9558-1e2380fdaa6a`. Imported **15 teams, 45 notes and one mentor** in one immediate SQLite transaction. Preserved existing event ID/password/settings and all other production events; no sessions, password hashes or GitHub credentials were copied. The source team/note IDs, public repositories, types, priorities, Kanban flags, creators, project fields and startup-matrix answers were retained. Event relationships were mapped to the existing production event.

Created the consistent pre-import snapshot `/data/backups/before-demo-1794092984619.sqlite`; SQLite integrity returned `ok`. Public HTTPS API comparison matched every imported team/project field and note, and the known demo password was verified. [Open demo teams](https://dashhack-production.up.railway.app/app/Student%20Hackathon%20Demo/teams).

## Czech demo translation — 2026-11-08

Translated the demo's 15 team names/descriptions and 45 note contents into Czech on both Railway and the local database. The event login identifier `Student Hackathon Demo`, password, mentor names, IDs, repository URLs, note types/statuses/priorities, authors, Kanban flags and project/matrix fields were preserved. Each database update ran transactionally with original-text checks and a backup. Remote snapshot: `/data/backups/before-czech-demo-1794093146427.sqlite`. SQLite integrity passed, and public-API comparison verified every translation and unchanged metadata. No app redeployment was needed.

## GitHub App integration deployment — 2026-11-08

Deployed `e269c475-0ae7-4a94-837b-f94f9815ccc0`, observed SUCCESS. Clean source package: 78 files / 429,465 bytes, SHA-256 `45fa4f72efb1f9f1f97ce61dc31207f6c904e4729254c13b7021869395a4d939` (`/tmp/dashhack-github-app-release-g3z_tyc1`). Pre-deploy SQLite snapshot: `/data/backups/before-github-app-20261108-first.sqlite`.

Verified HTTPS health, demo login, the new authorized GitHub status endpoint, callback no-referrer/no-store headers, schema 6 and SQLite integrity. All 15 Czech teams and 45 notes remain present. The organization `att-hackathon-junior-2026` and GitHub App registration are not provisioned; the connection is disabled until server credentials are supplied. Follow [GitHub setup](GITHUB_APP.md). No secrets were supplied, no GitHub account was connected, and no team repository links were changed by this deployment. Git history remains uncommitted/unpushed.

## Social Wall deployment — PR #6

Deployment [`0f41cc2e-49f1-44c1-ae3d-23b49c2d0070`](https://railway.com/project/712b21fd-3995-473e-b0e5-c2b37feddc3d/service/9960307b-3bd3-41a9-ade4-67a2ca421745?id=0f41cc2e-49f1-44c1-ae3d-23b49c2d0070) reached **SUCCESS**, with its runtime healthcheck and schema-7 initialization verified. Source commit `782f1b99dd0ec145a0ce10ad2e13645163d83030` includes separate feature commit `baa88a5` and the Czech demo seed follow-up; both were pushed to `origin/feat_alby_design` before uploading. The GitHub App registration remains pending; the confirmed organization `AT-T-Hackathon-Junior-2026` and its 15 private repositories already exist.

Clean source archive: `/tmp/dashhack-pr6-release-3moxvfox`, 100 files / 516,965 bytes, SHA-256 `657b13f2cdc5600d43ebd5943b5dc353c5253f156737a9505937b2aedffe375d`. No environment files, databases, dependencies or generated output were uploaded. Existing Debian slim image, Docker builder, single replica, `/data` volume, variables, port and public domain were retained. No X/GitHub credentials were added.

Before deployment, created consistent snapshot `/data/backups/before-social-wall-1794179381993.sqlite`. Its attempted optional download was rejected by automatic approval review because a full database includes credentials; that transfer requires explicit approval. The snapshot remains on Railway. The deployment and fixture writes proceeded without downloading it. The user later explicitly approved that transfer: `/tmp/dashhack-before-social-wall-production.sqlite` was downloaded with mode `0600` and verified (schema 6, integrity `ok`, 15 teams/45 notes). This temporary local snapshot contains credentials and must remain outside Git.

Matej's PR has no committed data/upload fixtures. Ran the committed, idempotent `scripts/seed-demo-wall.js` against the existing **Student Hackathon Demo** in production after successful migration: ten fictional Czech wall posts, comprising six visible approved (two pinned), two pending, one hidden and one rejected. Three original PNG illustrations occupy **6,137 bytes**. This demo wall is enabled; other events' walls retain their defaults. Equivalent fixtures are also present locally. Existing moderation decisions are not overwritten on reruns.

All pre/post fingerprints match for existing events (including credential/settings fields, excluding only the expected `updated_at`), teams, notes and mentors. **15 Czech teams, 45 notes and one mentor** remain unchanged; the second existing empty event is preserved. SQLite integrity is `ok`, schema is 7, and free volume space after seeding was 114,032,640 bytes.

Validated frozen install, **39 unit tests / 241 assertions**, **27 browser scenarios**, production build and live HTTPS health/login/data checks. The public feed returns six labelled demo posts, pending media is inaccessible anonymously but readable to the logged-in organizer, moderation stats match all ten posts, and page routes return HTTP 200. The optional X collector reports unconfigured and makes no API calls. Runtime logs show a healthy listener without application errors.

- [Public demo wall](https://dashhack-production.up.railway.app/Student%20Hackathon%20Demo/wall)
- [Attendee submission form](https://dashhack-production.up.railway.app/Student%20Hackathon%20Demo/wall/upload)
- [Organizer moderation](https://dashhack-production.up.railway.app/app/Student%20Hackathon%20Demo/social-wall)

## Mobile polish deployment — 2026-11-09

Latest deployment [`f9c9680e-406c-4ab9-a1df-c501b502a5e6`](https://railway.com/project/712b21fd-3995-473e-b0e5-c2b37feddc3d/service/9960307b-3bd3-41a9-ade4-67a2ca421745?id=f9c9680e-406c-4ab9-a1df-c501b502a5e6) reached **SUCCESS**, with its database-aware healthcheck passing. Source `7ae4989cfa9e50bfe7265d7e82fd541628f033e5` contains mobile feature commit `b037c64` and the current-event editing/login correction `7ae4989`; both were pushed before deployment. The first mobile deployment `b2b5d66d-9bef-4b32-aa34-404dd260d277` also reached SUCCESS and was superseded by this final revision.

Final clean source archive: `/tmp/dashhack-mobile-final-release-s9v_n8cb`, 101 files / 528,554 bytes, SHA-256 `f40e9477a80c2df9429e6adb9e2bf84a9b071cda849cf088cd6bbf96abe5381d`. No databases, local configuration, dependencies or generated files were uploaded. Existing Debian slim runtime, one replica, `/data` volume, environment variables and public domain were retained; no package or schema changes.

Pre-deployment consistent snapshot: `/data/backups/before-mobile-polish-1794216450888.sqlite`. Verified all eight production content-table fingerprints before/after: events (excluding only `updated_at`), teams, notes, mentors, GitHub connections, wall settings, posts and uploaded media. All match. Production retains **three events, 15 teams, 45 notes, one mentor, ten wall posts and three images**; no fixture reseeding or password/content changes were performed. Schema remains **7** and SQLite integrity is `ok`. Live login checks create ordinary temporary sessions, which are excluded from content fingerprints.

Validation: **39 unit tests (241 assertions)**, **34 desktop/mobile browser scenarios**, a hydration-aware sweep of ten routes at five viewport sizes, and the production build. Live Chrome touch checks passed on all ten routes at phone width, with a 320px landing check, safe team dialogs, navigation, manual wall scrolling, preserved six-post public feed and cross-event login availability. No production content was edited for verification. See [mobile behavior and limitations](MOBILE_POLISH.md). Test/runtime reports are in `/tmp/dashhack-mobile-*`; live phone screenshots include `/tmp/dashhack-mobile-live-teams.png` and `/tmp/dashhack-mobile-live-wall.png`.

## Deployment procedure

When deployment is requested:

1. Review the working tree and pushed commit. The user authorized and completed publishing the earlier rebase; `feat_alby_design` contains the current SQLite implementation. A CLI upload deploys eligible local files, including uncommitted changes; use a clean archive of the reviewed commit to make the release reproducible.
2. Run `bun install --frozen-lockfile`, `bun test tests/unit`, `bun run test:e2e`, and `bun run build`. Build and runtime use pinned Bun 1.3.2; update the Docker version deliberately after verification.
3. Confirm the `/data` volume, runtime SQLite path and single replica on the service. No MongoDB, Redis or extra web service is needed.
4. Upload the reviewed application. Ensure `bun.lock` is included: `.gitignore` currently lists it, so this deployment used a clean temporary package containing only release files and `--no-gitignore --path-as-root`. Do not use `--no-gitignore` on the unfiltered working tree, which contains local environment/database files. Upload the filtered package with explicit IDs:

   ```sh
   railway up /tmp/YOUR_FILTERED_RELEASE --path-as-root --no-gitignore \
     --project 712b21fd-3995-473e-b0e5-c2b37feddc3d \
     --environment 7646006f-d5f1-4c62-a8b6-e540f0f26f96 \
     --service 9960307b-3bd3-41a9-ade4-67a2ca421745 \
     --ci -m "Deploy SQLite DashHack"
   ```

5. Observe `SUCCESS` for the deployment's exact ID. Inspect bounded build/runtime logs on failure; upload success alone is insufficient.
6. Generate a public Railway domain targeting 1020 if wanted:

   ```sh
   railway domain --port 1020 \
     --project 712b21fd-3995-473e-b0e5-c2b37feddc3d \
     --environment 7646006f-d5f1-4c62-a8b6-e540f0f26f96 \
     --service 9960307b-3bd3-41a9-ade4-67a2ca421745 --json
   ```

7. Check HTTPS login/cookies, teams, note saves and persistence after restart. Set optional `NUXT_PUBLIC_DISCORD_INVITE` if needed. The SEO module and site URL setting have been removed; the private-event dashboard does not generate OG preview images.

`src/` is Nuxt's app root, **not** the deployment root; package.json, lockfile, Dockerfile and Nuxt config are at repository root. For later GitHub autodeploys, connect `ArimDev/dashhack` and `feat_alby_design` only after the rebased/migrated source is intentionally pushed. Source connection may start a deployment.

## Backups and limits

The runtime image includes `/app/scripts/backup-sqlite.js`. In a service SSH session, create a new snapshot:

```sh
bun /app/scripts/backup-sqlite.js /data/backups/UNIQUE_TIMESTAMP.sqlite
```

`VACUUM INTO` includes committed WAL contents and refuses an existing destination. Download/store snapshots outside the volume; snapshots alongside the database do not protect against losing the volume. Railway also documents [volume backups](https://docs.railway.com/volumes#backups). Verify restore by opening the snapshot and checking integrity/data before relying on it. A public per-event JSON download excludes password/token credentials and is not a complete application restore.

Keep one app instance. SQLite serializes writes; this setup is for a private event, not a multi-replica/high-availability deployment. Expect a brief restart interruption when updating the one instance. The 128 MB volume capacity is disk space, not RAM. Its capacity can be grown later. Local capped-container tests are described in [migration validation](SQLITE_MIGRATION.md); no hard Railway memory limit has been set from a short smoke test alone.

## Creating another app

From another repository, `railway init --name APP_NAME --workspace WORKSPACE_ID --json` creates/links a separate project, and `railway add --service WEB_NAME --json` adds an empty web service. Add persistent storage only if needed, set runtime variables, deploy and verify. To create-and-deploy immediately, `railway up --new --name APP_NAME` makes a fresh project. DashHack already exists, so use its explicit IDs instead.

For source-controlled infrastructure, use `.railway/railway.ts` and inspect a plan. Do not add deprecated `railway.json`/`railway.toml` for a new service; [Railway's current documentation](https://docs.railway.com/config-as-code) disallows new opt-ins and gives a 2026-12-01 cutoff for existing files.


## Projector wall controls — 2026-11-09

- Source commit `dbc1745`, Railway deployment `ad0ec598-8cf6-4609-9c90-862177cfcad8`: **SUCCESS** on the existing production service/volume.
- Desktop QR restored to the top-right header corner, without a separate sharing banner. Display controls now live behind a bottom-right cogwheel, closed initially; the persistent status footer was moved into the panel. Phone upload links/manual scrolling remain available.
- Validation: 35 browser scenarios and production build pass (2.06 MB / 527 kB gzip). Live 1920×1080, 1280×720 and 390×844 checks passed for initial collapsed controls, QR positioning/visibility, theme switching, Escape/focus restoration and no horizontal overflow.
- Consistent on-volume snapshot: `/data/backups/before-wall-display-1794222333809.sqlite`. Post-deployment integrity is `ok`, schema remains 7, and all eight content-table fingerprints match the snapshot baseline: 3 events, 15 teams, 45 notes, 1 mentor, 0 GitHub connections, 1 wall configuration, 10 posts and 3 media attachments. No demo reseed, settings mutation or data restore was performed.


## Bounded photo-only wall uploads — 2026-11-09

- Feature source `7c06329`, streaming correction `8a54f9e`; final Railway deployment `e67eccf7-4495-45f6-b7b0-117d441b329c`: **SUCCESS** on the existing service/volume. Initial upload deployment `f76c7b68-509d-4a2f-9131-a21d4d908f88` is superseded by the streaming correction.
- Public videos are rejected by the picker and API. Native photo selection, clipboard paste, preview/removal, 25 MiB phone originals, client resize, independent server WebP conversion and storage/rate guards are documented in [WALL_UPLOADS.md](WALL_UPLOADS.md).
- The app still runs Bun/SQLite in Debian slim, using Nitro's Node-compatible streaming entry. The stock Bun preset buffers the entire body before route admission, so it cannot enforce these protections early enough. The isolated production abuse test verifies responsive health during an incomplete request, concurrent rejection, 408 at 20 seconds and recovery; the chunked byte cap also passed without Content-Length.
- 47 unit tests pass. All 40 production browser scenarios pass (39 regular cases plus the runtime-entry slow-body case); targeted development upload/moderation tests also pass. The default development suite skips the two production-only runtime/body cases. The frozen lockfile install and production build pass. Only the current platform's Sharp runtime is packaged; no service, schema migration, video transcoder or Alpine image.
- Live phone check: a 6 MiB selected photo prepares as a small WebP preview; removal disables the empty submit action. No video is advertised, and a direct MP4 upload returns body status 415. Demo login and organizer storage usage work; no new production post was submitted.
- Live read-only volume check: 117,624,832 bytes capacity, 113,225,728 bytes available (~108 MiB), 868,352 bytes of backups, 6,137 bytes of existing media. Caps are 24 MiB/event, 32 MiB/shared and 16 MiB free reserve; uploads are not paused. The image includes `bun scripts/check-wall-storage.js` for future deployment checks.
- Pre-deployment consistent snapshot: `/data/backups/before-photo-uploads-1794223733821.sqlite`. Final schema remains 7, integrity is `ok`, and all eight content-table fingerprints match: 3 events, 15 teams, 45 notes, 1 mentor, 0 GitHub connections, 1 wall configuration, 10 posts and 3 media attachments. Existing credentials, media and moderation are preserved.
- Mobile Chrome and real browser clipboard checks passed. Physical iPhone Safari/HEIC remains an on-device verification item; unsupported formats get a clear Photo Library/JPEG/PNG fallback.


## Event capacity preparation — 2026-11-09

Requested existing-volume increase: 128 MB → 2 GiB (2048 MB), preserving the same `/data` mount and volume ID. No resize has yet been performed or verified. The public GraphQL schema, CLI and direct MCP expose no existing-volume size mutation; `sizeMB` on volume creation is not a safe substitute. Automatic approval review rejected use of the open-ended Railway agent because it could modify other production resources. The user was asked to perform the dashboard resize on this exact project/volume. No replacement/detach/delete was attempted.

Prepared app profile: 512 MiB/event media, 640 MiB/shared media, 768 MiB database guard, 128 MiB actual free reserve plus incoming-write headroom. Existing 25 MiB phone originals, 1 MiB stored WebP cap, one in-flight request and 5/browser, 60/network, 90/global attempts/minute remain. Do not deploy before the filesystem capacity is verified at the larger size; the new free-space reserve would pause uploads on the current 128 MB volume.

Storage is billed by used bytes/time at $0.15/GB-month; 2 GB fully used is about $0.30/month excluding other services/compute/egress. In-place shrinking is unsupported. No deletion or future cleanup is scheduled. Export/verify the complete SQLite database before any post-event deletion because all event content and credentials share this volume.

Preparation validation: 48 unit tests pass (279 assertions); production build passes. Desktop and iPhone WebKit upload coverage: six passed, four production-only cases intentionally skipped. Final read-only SSH check confirms production is still on the old caps, with 117,624,832 bytes filesystem capacity, 113,209,344 free and uploads active. No production data or infrastructure was changed for this preparation.


## X query editor release — 2026-11-09

- Railway `bd42a185-3391-4c6b-8b81-e1f201948c98`: **SUCCESS**. Exact release source `f48445c` on `release/x-query-fix-20261109`, based on `162158d` plus cherry-picked controls/query fixes. Feature equivalents are `041c441` and `d82d36e`; both branches are pushed. The feature branch still includes the pending larger storage profile; the release deliberately excludes `fe79623` because the existing volume remains 128 MB. Future deployments from the feature branch must verify expansion first.
- Queries now require Save queries; whitespace/comma/newline lists parse correctly. Validation/conflict/network errors preserve drafts, and save responses do not replace text typed in flight. Polling saves independently. Floating wall display controls now require a matching live event session.
- Exact release validation: 47 unit tests / 277 assertions and production build pass. Six Chromium wall scenarios and 20 desktop/iPhone WebKit wall/mobile scenarios pass. Live 390px browser verification confirms draft retention across a simulated conflict, correct query parsing, token recognition, paused polling and event-only cogwheel visibility. The live conflict is intercepted in the browser; no test query is saved to production.
- The user configured `NUXT_X_BEARER_TOKEN`; it is detected at runtime and remains server-only. Production polling was found enabled with empty hashtag/account arrays, so no search query could run. The flag was paused through the authorized event API, preserving both arrays. A real X search still awaits a user-supplied hashtag/account; no successful external API test is claimed.
- Consistent on-volume backup: `/data/backups/before-x-draft-fix-1794226519461.sqlite`. After deployment schema 7 and integrity `ok`; events/teams/notes/mentors/GitHub connections/posts/media fingerprints remain unchanged (3 events, 15 teams, 45 notes, 1 mentor, 10 wall posts, 3 media). Wall settings reflect the intentional pause/revision. No reseed or restore.


## Successful live X collection test — 2026-11-09

The user enabled collection with `#buildinpublic`, `#atthack` and `@openai`. The effective query is `(#buildinpublic OR #atthack OR from:openai) -is:retweet`; accounts select authored posts independently of hashtag matches. The real production collector succeeded at 12:35:11 UTC (13:35:11 Europe/Prague), with an empty error and 100 real X posts in the manual moderation queue. Their timestamps span 10:55:49–12:34:19 UTC that day. The two existing demo X posts remain separate. No mock content was used for this check, and no additional manual paid search was needed because the scheduled collector had already completed the test.

Polling was paused afterward through the event-authorized API as originally requested; hashtags, handles, interval and collected posts were retained. The current display window remains 1440 minutes (24 hours). Social Wall → Wall settings → Time window (minutes) accepts 10080 for seven-day visibility (pinned posts bypass display expiry); it does not change API retrieval. The collector uses X Recent Search, intrinsically limited to the last seven days, with at most 100 results per attempt. There is currently no separate configurable retrieval lookback. Official reference: https://docs.x.com/x-api/posts/search/introduction . No app deployment or schema change was needed for this live verification.


## Clickable full-post reader and five-second resume — 2026-11-09

- Final release `41406e3` on `release/x-query-fix-20261109`, Railway `3bcfaf46-c12b-4e80-9d0e-112a7bb6a258`: **SUCCESS**. Feature equivalents: `b35a8cf` (reader/click fix) and `0262482` (user-requested five-second close delay). Initial reader release `e8996c1` / `f6650fe9-797d-41b5-a7bb-dba1d59c943b` is superseded by the delay update. Both source branches are pushed. Existing 128 MB storage profile remains; pending volume-budget work was not deployed.
- Visible scrolling copies previously inherited inert/pointer-disabled wrappers. They now accept pointer input while their duplicate controls stay outside keyboard navigation/accessibility. Read full post opens the existing scrollable DialogShell; the feed stops while reading. Closing via Escape/button/backdrop resumes auto-scroll after **five seconds**, without focus restoration/passive pointer re-entry extending it to the generic 30-second idle delay. Previously selected manual-scroll mode remains manual.
- Validation: seven Chromium wall scenarios, 21 desktop/iPhone WebKit wall/mobile scenarios and the reader production build pass. The delay follow-up passes targeted Chromium and WebKit tests that assert four seconds of no movement followed by resumed animation. Live desktop original/copy and 390px reader checks pass using an existing real post, with browser-local feed isolation and no production writes. The deployed five-second delay was directly verified.
- Consistent snapshot: `/data/backups/before-wall-reader-1794228031332.sqlite`. Final integrity `ok`, schema 7; every content-table fingerprint is unchanged: 3 events, 15 teams, 45 notes, 1 mentor, 0 GitHub connections, 1 wall configuration, 110 posts and 3 media. No moderation, polling, token or query change was made for the reader release.


## Reliable OFF / stop controls — 2026-11-09

- Final source `ac54f89` on `release/x-query-fix-20261109`, Railway `6d547563-c710-4c2b-b317-dcf6b512e357`: **SUCCESS**. Feature equivalents `124eaec` and `6185b76`. Initial stop release `4ed4bc6` / `912495d9-e151-4949-91c1-586c5c7d1543` is superseded by the normal-switch busy-state fix. Both branches are pushed; existing storage quotas remain unchanged.
- Production was already OFF when the user reported a disabled control. Repeated reads throughout development and across both runtime restarts found the same last attempt: 2026-11-09 12:35:11.200 UTC / 13:35:11.200 CET. No real X API request was made to test stopping; collection was never enabled for these checks.
- The ordinary switch now permits OFF while query saves are pending. An independent Stop X polling button also works before settings finish loading. Both use authenticated `pauseX`, preserving queries and ignoring stale caller revisions. Every stop advances the revision even if already OFF to reject delayed older enable writes. Old load/save responses cannot replace the confirmed OFF UI status. Request timeouts prevent indefinite waits; failed stops display an explicit unconfirmed error rather than confirmation.
- Exact release unit coverage: 48 passed / 287 assertions (feature branch: 49 / 291). Chromium's seven existing wall scenarios and new stop scenario pass; 22 desktop/iPhone WebKit wall/mobile scenarios pass. The final switch change passes targeted Chromium and WebKit stop tests. Tests cover stop during delayed load/save, failed stop feedback, stale ON responses, event ownership, stale enable rejection, and zero mocked requests after pause through future scheduler ticks and a new collector instance. The production build passes.
- Live 390px checks use a browser-local fake delayed query-save response containing ON, then invoke the real Stop action; OFF remains confirmed after the stale response and reload. No test query is saved to production. Final live result: `xEnabled:false`, token still configured, original queries/interval preserved and last attempt unchanged. A stop prevents future collection requests; an already-sent request may finish and be billed. No account-wide monetary spending cap is claimed.
- Consistent snapshot `/data/backups/before-x-stop-1794228835834.sqlite`. Final integrity `ok`, schema 7. All content-table fingerprints except wall settings match; wall settings have identical JSON keys/values and only the intentional stop acknowledgements advance revision 10 → 12. Counts remain 3 events, 15 teams, 45 notes, 1 mentor, 110 posts and 3 media.


## X approval configuration and existing queue correction — 2026-11-09

Production was still saved as `moderationMode:manual` with all 100 real X imports pending. The current implementation applies auto approval when a new collected post is inserted; switching the setting does not retroactively approve already-queued or deduplicated posts. The production dropdown was exercised directly and its submitted/returned mode verified as `auto`; no frontend persistence defect was reproduced on a fresh page.

The saved mode is now Auto. The 100 pending, unhidden actual imports (`platform:x`, IDs `x-` plus digits) were approved through the existing event-authorized, revision-checked moderation API, respecting current keyword/author filters. No conflicts or filtered exclusions occurred. The public feed contains all 100; other manual/demo posts are unchanged. Previously hidden/rejected/deleted posts were not targeted. Future real X imports auto-approve when collection is deliberately re-enabled; public submissions remain manual.

Polling stays OFF and its query/interval were retained; last attempt remains 2026-11-09 12:35:11.200 UTC / 13:35 CET. This correction made no X API requests and did not deploy/restart the service. The existing mocked X-only auto-approval unit scenario passes (8 assertions). Consistent pre-correction snapshot: `/data/backups/before-x-approval-1794229385251.sqlite`.


## Distinct query examples — 2026-11-09

Release `dc47d0d` (feature `e5a076b`), Railway `a3300786-1a9b-4161-8094-93c5c2e3f62a`: **SUCCESS**. Hashtag/handle placeholders now explicitly say Example only and use muted, normal-weight italic text at 75% opacity in both themes; actual entered values retain their normal bold styling. Empty handles show No handles entered and optional hashtag-only guidance. The legacy hashtag field uses the same presentation. No saved example values are inserted.

Two existing Chromium query persistence/draft checks pass. Live 390px checks verify empty handles, the saved hashtag value, placeholder style after theme transitions, no horizontal overflow and unchanged server settings. Polling remains OFF, Auto approval remains saved, and no X requests or event-content/settings writes were made for this verification. Existing 128 MB storage settings remain unchanged.


## Hover-only five-second recovery — 2026-11-09

Release `47b9be2` (feature `1af5d3e`), Railway `90499ab7-06c6-49b4-8e44-c5ad3295d88a`: **SUCCESS**. Hover still used the stored 30-second interaction delay while reader close used a separate hardcoded five seconds. The Demo's `idleWaitSeconds` was changed to 5 through its authenticated, revision-checked settings API, preserving X queries, Auto approval and OFF polling. New events default to 5. Reader close now uses the same setting, and leaving the feed restarts that delay. A parked pointer resumes after five seconds of inactivity; no reader needs to be opened.

Validation: ten wall unit tests / 88 assertions pass, and targeted Chromium and WebKit hover-only/reader tests pass (two per engine). They assert four seconds of no movement and subsequent recovery with the pointer still inside a card, after pointer exit, and after closing the reader. Live production checks confirm both parked-pointer and pointer-exit recovery without opening a post or writing test content. The final settings read returns five seconds, polling OFF, original query/approval settings and the same last X attempt at 13:35 CET. Existing 128 MB storage allowances remain unchanged; no real X API request was made.


## Kanban card dragging and pending edits — 2026-11-09

Release `b55685b` (runtime behavior `5302682`; feature equivalents `6fe2c77`/`dcb4bb7`), Railway `3c9fdbe9-b770-47e5-9c05-b52db0c16652`: **SUCCESS**. Notes now drag from the card's non-interactive area as well as the labeled Move handle. Form fields/team links retain normal interaction. Native drag uses the full card image and explicit move drop feedback. A textarea blur save no longer disables the drag source: drop captures DataTransfer synchronously, awaits that pending save, then resolves the current team revision before sending only the status patch. Failed preceding saves abort the queued move; ownership/conflict checks remain server-side.

Seven distinct Chromium Kanban scenarios pass, including a regression that completes the drop while the text-save response remains held, then checks both text/status persistence after release/reload. Nine distinct WebKit/mobile checks pass, covering both native card/handle drag and the existing phone status-selector workflow. One WebKit test was adjusted from uncheck to click because the checkbox correctly disappears on completion, making post-click checked-state verification race its unmount. No drag dependency, schema change or new service.

Live 1440px verification confirms card-body and handle moves submit status-only patches. Event data/note-write responses are isolated within the browser; the selected real note is unchanged on a fresh server read. Production notes were not moved for this test. X polling remains OFF. Existing storage quotas and volume are unchanged; the release excludes the pending larger-budget profile.

## Teams grid, search and quick navigation — 2026-11-09

Release `372889c` (feature `2958779`), Railway `de66469b-5cea-42c3-b5bf-f52c8ff6404a`: **SUCCESS**. Teams fills the dashboard width with two columns at 1024px+, one below. Search matches names, descriptions, repositories and originality without case/diacritics. The right-hand native Jump to team dropdown lists all teams, clears filtering, focuses the stable team anchor and scrolls the dashboard container. Cards stay mounted while filtered to preserve open editors/drafts. Headers wrap and note grids adapt to the card width. The toolbar is sticky on wider screens and in normal flow on phones.

Five targeted Chromium checks pass (grid/search/jump, team CRUD, note persistence, project fields and matrix drafts). Five WebKit checks pass, including the new navigation scenario and both desktop Safari/iPhone runs of route-overflow and mobile editing/navigation tests. Live public-view checks verify all 15 demo teams, desktop two-column geometry, search, dropdown focus/scroll and 390px layout without overflow. No event content was written; X polling remains OFF. No schema/dependency/infrastructure change. Release retains existing 128 MB storage quotas and excludes the pending larger-budget profile.

## Latest PR #7 deployment and verified 5 GB volume — 2026-11-09

Final source **`834bc92` on feat_alby_design**, Railway **`88b9ac32-3428-47a9-8f51-326ffba897cf` — SUCCESS**. This deploys the complete rebased PR #7 Instagram collector, shared scheduler/approval, media/date enrichment, collector example/scoping fixes and all preceding Teams/Kanban/wall/mobile work. An intermediate storage-safe release `382c6c8` / `c909dad6-5599-4f13-83a1-42134bff748f` also reached SUCCESS before the resize was confirmed; the final deployment supersedes it.

The user requested expansion. Automatic approval review rejected the broad Railway-agent resize path despite explicit authorization, because it could mutate unrelated resources; no bypass was attempted. The user then performed the in-place dashboard resize to **5000 MB**. MCP verified the same volume `14d791fc-cdfd-4e1d-a177-6be2a8beab48`, service, `/data` mount and `sfo` region. SSH statfs verified capacity **4,689,936,384 bytes** and ~4.67 GB available before deploying the feature branch's prepared larger-budget profile. No replacement/detach/delete or other infrastructure change was made.

Active runtime limits verified with `bun scripts/check-wall-storage.js`: 512 MiB/event media, 640 MiB shared media, 768 MiB database guard, 128 MiB actual free reserve plus incoming-write/WAL headroom; uploadsPaused=false. Source originals remain 25 MiB, stored photos at most 1 MiB WebP. Existing rate and post limits remain. Feature deployments no longer require the historical old-quota release branch.

Consistent full on-volume snapshot: `/data/backups/before-pr7-deploy-1794244063205.sqlite`. SQLite schema remains 7, integrity `ok`. All eight content-table fingerprints match before/after: 3 events, 15 teams, 45 notes, 1 mentor, 0 GitHub connections, 1 wall-settings row, 110 wall posts and 3 media. No reseed, restore or production content/settings write was needed. Live health, existing demo login, Instagram settings and 390px settings overflow checks pass; X and Instagram polling both remain OFF. Both provider keys are configured but no real collection request was made for validation.

Validation carried forward from the exact feature source: 54 unit tests / 354 assertions, ten targeted Chromium scenarios, four WebKit scenarios, production build and isolated production runtime smoke check. The intermediate old-quota release separately passed its 53 unit tests / 350 assertions and production build. New source uses the existing one-replica Bun/SQLite service and volume.

## Guided GitHub App setup — 2026-11-09

Source `0eb62a8`, deployment **`7febb235-c528-406a-96d1-4dc8e317e49e` — SUCCESS**. Authenticated event Settings → GitHub App now provides a prefilled registration link for `AT-T-Hackathon-Junior-2026`, current-origin callback/base URL fields, a six-variable Set/Missing checklist and Refresh setup status. The status API returns missing variable names only. Guests remain unauthorized; no private key/secret values are rendered or editable in the browser.

Set server-only `NUXT_GITHUB_APP_BASE_URL=https://dashhack-production.up.railway.app` on the existing service with redeploy skipped, then deployed the tested source so it took effect. No other variable changed. Live authenticated status confirms only the five registration-derived values remain missing: App ID, Client ID, Client Secret, Private Key and slug. Actual GitHub App creation, installation and organization-owner authorization remain required; no real GitHub OAuth/provider operation was initiated or claimed verified. See docs/GITHUB_APP.md for the complete configuration instructions.

Validation: 56 unit tests / 370 assertions, three Chromium GitHub scenarios and five WebKit/Safari/iPhone scenarios (including all-route phone/tablet overflow) pass; production build succeeds. Live guest denial, checklist, exact production callback, read-only registration permissions and 390px layout pass. Both social collectors remain OFF. Existing verified 5000 MB volume and larger upload budgets are retained; no schema/dependency/service/replica/content change.

## Real event roster and repository mapping — 2026-11-09

The user explicitly requested clearing the existing teams and provided 15 real names, shirt labels and HEX colors. Target: existing Student Hackathon Demo event `97c87fe6-f510-4117-9558-1e2380fdaa6a`; its login name and credentials remain unchanged. Full consistent on-volume snapshot before replacement: `/data/backups/before-real-teams-1794255544253.sqlite`, permissions 0600.

A parameterized, event-scoped SQLite BEGIN IMMEDIATE transaction checked the exact existing demo roster, removed its 15 teams (cascading their 45 notes), and inserted all 15 supplied teams with new stable IDs, exact names/colors, actual organization URLs and Czech shirt descriptions. Team numbers remain unassigned. Originality/abstract/matrix/notes are empty. Fingerprints verify preserved event credentials/settings, other event teams/notes, mentors, GitHub connections and wall tables. Foreign-key and integrity checks pass. No code deployment, schema change, provider request, polling enable or other-event modification was needed.

All 15 GitHub placeholders were first verified to contain exactly one Initial commit and only their known README. They were renamed to actual team slugs with repository IDs/private visibility retained, and their placeholder READMEs were replaced with Czech team/HEX information. Read-back verified all IDs, private visibility and README contents. Public production API comparison verifies the complete exact roster/colors/URLs and empty notes/project fields. Live desktop two-column, search, jump and phone checks pass; X remains OFF.

See docs/EVENT_TEAMS_2026.md and docs/event-teams-2026.csv for the complete mapping and conditional invitation-acceptance links. No invitations have been sent: individual GitHub usernames/emails are still required. The links do not independently grant repository access. Do not reseed the removed demo teams or reuse the old generic repository names, which currently redirect to the renamed repositories.

## Reusable student repository invitations — 2026-11-09

Feature source **`e3c5299`**, Railway **`25b09c51-dac8-44ac-86bb-b5e0b5091b4c` — SUCCESS**. The user needs team links that work without collecting usernames or manually approving access during the event. Public `/join#SIGNED_TOKEN` lets students enter their own GitHub username, sends a Write invitation automatically to the bound repository, then presents GitHub acceptance. No event login or student OAuth; App remains private. Authenticated Settings → GitHub App → Student team invitation links supplies Get/Copy all links.

The user enabled App Repository Administration write and approved the installation update. JWT metadata read-back confirmed App 5686160 / installation 180287370, correct organization and new permission; Contents/Members remain read-only. Real preflight minted a one-repository administration token and revoked it successfully without an invitation. Organization policy permits outside collaborators and does not require 2FA. Normal cached activity/discovery tokens stay read-only. Student grants mint an uncached single-repository administration token, request only `push`, and attempt immediate revocation. Existing writers/admins are never downgraded. Current source also handles GitHub's 204 existing-collaborator upgrade response.

Added server-only random `NUXT_GITHUB_TEAM_INVITE_SECRET` directly on DashHack with deployment skipped, then shipped the code to apply it. No existing variable was overwritten. Links bind event/team/repository/installation for 30 days. Clear the key to disable claims; rotate it to invalidate old links. No new schema/service/SDK/worker. Public claim requests have origin, 4 KiB/ten-second body bounds, bounded memory/concurrency and per-network/team/username rate admission; no SQLite claim logs or persisted elevated tokens.

Backup before deployment: `/data/backups/before-team-invites-1794258162827.sqlite`, 0600. After deployment schema remains 7, integrity ok, all eight content-table fingerprints match: 3 events, 15 real teams, 0 notes, 1 mentor, 1 GitHub connection, 1 wall settings row, 110 posts, 3 media. Existing 5000 MB volume/budgets remain. X and Instagram polling remain OFF; no live collection request.

Private 0600 exports `.data/team-invites-2026.csv`, `.txt`, `.json` contain all 15 generated links (expires 2026-12-09T21:04:26.248Z), ignored by Git and Docker. Never commit their contents into this public repository. Every link anonymously preview-resolved to its correct real team/repository. Organizer Get/Copy UI and phone join layout pass. A real anonymous submission for the already-authorized organization owner returned alreadyHasAccess without changing permissions or sending a notification. New-recipient grants used mocked provider calls through the actual production server, so no unrelated test account was invited.

Validation: 64 unit tests / 403 assertions, five Chromium checks, four Safari/iPhone WebKit checks, production build and isolated production smoke pass. Smoke covers anonymous preview/grant, authenticated issuance, fixed repository/Write scope, tampering, foreign-origin/oversize rejection, throttling/Retry-After and privileged-token revocation. A legacy X fixture test was made deterministic by freezing its clock relative to its sample post; no X product behavior changed.

## Lazy wall startup and saved scroll speeds — 2026-11-09

Source **`149e4ef`** (feature `3fea60d`), deployment **`a2080dab-049d-4751-ad11-76ac1bdc0a95` — SUCCESS**. Public wall requests the first 12 posts, starts rendering/motion, then fetches the remainder and mounts cards in small idle batches. Media sources attach only near the viewport through a shared IntersectionObserver; reserved media boxes avoid scroll-height jumps. Long feeds need two loop copies instead of three. A stationary pointer no longer delays startup; actual interaction and reader dismissal retain the five-second resume delay. Background refresh failures preserve the visible feed.

Authenticated cogwheel and moderation settings offer Slow/Normal/Fast/Very fast (20/40/60/80 px/s). Default 40 px/s is independent of feed length. Revision-checked speed-only writes preserve provider polling/query/approval settings. Existing public requests remain compatible; paging is validated and still capped at 200 posts. No dependencies, schema, services, replicas or infrastructure changed.

Live Chromium check: first cards at 1,350 ms, motion at 1,368 ms with all image requests deliberately stalled. All 106 visible posts eventually mounted, with 212 loop cards instead of 318; only five unique image requests were started initially. These timings describe this run, not a controlled comparative benchmark. Owner UI presets and speed-only request shape passed using a browser-intercepted save; no live settings were modified for testing. Real persistence, guest denial, stale revisions and collector preservation passed against an isolated production server/database.

Consistent pre-deployment backup: `/data/backups/before-wall-lazy-1794259486471.sqlite`, 0600. Post-deployment SQLite integrity remains ok, schema 7; all eight content-table fingerprints match exactly (3 events, 15 real teams, 0 notes, 1 mentor, 1 GitHub connection, 1 wall settings row, 110 posts and 3 media). X and Instagram collectors remain OFF. No provider collection request, content replacement or production settings write was needed.

Validation: 66 unit tests / 427 assertions, targeted Chromium and WebKit/Safari/iPhone checks covering progressive startup, deferred media, speed persistence/authorization, reader/hover five-second resume and responsive routes; final production build and isolated production API smoke pass. Final loop-copy reduction was rechecked in both browser engines.
