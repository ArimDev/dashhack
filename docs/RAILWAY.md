# DashHack on Railway

## PR #8 collector switches and wall timestamps — 2026-11-12

Merged PR #8 head `017f5304a8577b598446d37c55d44564f0805a5d` into `feat_alby_design` as two-parent merge `bda0de4` (parents `bd70c1e` and `017f530`), preserving both Matej-V commits. Source and integration refinements were pushed normally. GitHub reports the PR closed without its merged flag; the exact PR head is verified as an ancestor of the pushed branch, and no PR reopening/status mutation was performed. Local backup branch: `backup/feat-alby-before-pr8-20261112`.

Deployment `e996e87a-76cc-4e7e-9821-136086e69ad0` reached **SUCCESS**. The source-only archive's SHA-256 is `9ecaa8d5d1509ced28066e281c5e32298d6cf6db0d8696091d27c689f32e2f26`; runtime source matches the tested build. Accessible collector switches/server-confirmed badges replace redundant loaded-state Stop buttons. An unknown/loading-state Stop fallback preserves existing stop guarantees. Header wrapping supports phones. Wall timestamps use browser-local today/Yesterday/older-date labels, roll over at midnight via the existing refresh, and keep long handles from hiding the date. Useful certificate/network errors are retained without persisting arbitrary credential-bearing exception text. See SOCIAL_WALL_PR6.md for integration details.

Validation: pinned Bun 1.3.2 production build/Sharp packaging; 131 unit tests / 991 assertions; nine production HTTPS Chromium scenarios covering switching, load/save stop races, drafts, phone/keyboard accessibility, midnight rollover, photo focus/two-column tiles, compact copy and 24-hour/two-tab sessions. Live health and all four public timestamps pass; deployed collector components/badges were inspected using browser-only responses, with zero browser errors and no production writes/provider test calls.

On-volume snapshot: `/data/backups/before-pr8-20261112-1794480695258.sqlite`; baseline `/data/backups/pr8-20261112-baseline.json`. Post-deploy schema **15**, integrity **ok**, and all recorded table fingerprints match exactly (sessions excluded). Instagram remains ON and X OFF. No data restoration/reseed, schema/dependency/runtime/service/replica/volume change; one web replica and the existing 5000 MB volume are retained.

## Compact organizer-post spacing — 2026-11-12

Source `0d2c960` was committed/pushed and deployed as `f2a4dbb8-8fb6-4702-b78c-327c15240e13` (**SUCCESS**). Wall rendering skips empty/whitespace-only paragraph blocks and formatted copy inherits standard card line-height. Organizer posts therefore match X spacing without rewriting stored rich text; full text/formatting and projector sizing remain. Clean pinned-Bun build and two production HTTPS Chromium scenarios pass. The existing browser setup helper now waits for loaded settings before revision-checked saves, fixing an initial-load test race.

Live verification: original pinned post retains all five stored blocks, renders two nonempty paragraphs, and has a 16px gap before its photo; health ok and zero browser errors. All recorded database table fingerprints match the snapshot exactly (sessions excluded), schema remains 15/integrity ok, Instagram ON and X OFF. Snapshot `/data/backups/before-wall-spacing-20261112-1794478229692.sqlite`; source-only archive SHA-256 `74956650d8d518f1b7e793e51a8045ebdd9307d54e0646002a7b4e31b8779210`. No stored content/settings/schema/infrastructure changes.

## Bare top-right QR and #atthack — 2026-11-12

Source `d85344f` was committed/pushed and deployed as `f6cd69ca-30aa-4d4d-bde8-ba61c92c94c1` (**SUCCESS**). The sharing link has a transparent surround with no card, shadow, border or visible label; only its square QR is white. It sits 16px from the safe-area-aware top/right edges and retains gutter-filling desktop sizing. Phones retain an icon-only upload link. The canonical ATT event's title rail now displays #atthack without changing unrelated events. The centered fullscreen QR remains unchanged.

Validation: clean pinned-Bun production build/Sharp packaging; three HTTPS Chromium scenarios across five projector sizes, phones and short landscape; live Chromium verifies white QR/transparent wrapper in light/dark mode, top/right geometry, hashtag, phone link and zero browser errors. Source-only archive SHA-256 `b8c03905e84992cfe65bc40a4ec42fbb50095a97ea520b638c44c22598135709`; runtime source matches the tested build. Snapshot: `/data/backups/before-wall-bare-qr-20261112-1794476720815.sqlite`. Schema remains 15; integrity ok and zero foreign-key violations. No release content/settings/schema/runtime/infrastructure writes. Concurrent live activity changed wall posts/media, panelColumns, Instagram polling metadata, Discord and GitHub audit/flow records; these were preserved rather than restored. Event credentials and all event fields except the active event's updated_at match the snapshot, as do teams/notes/mentors/connections/invitation links. Instagram stays ON and X OFF.

## 24-hour sessions and cross-tab wall login — 2026-11-12

Source `2ba71df` was committed and pushed to `origin/feat_alby_design`. Deployment `a3873031-5419-4619-b924-e20f5eb91cce` reached **SUCCESS**. New event sessions and both cookies use the same 24-hour lifetime; old sessions/cookies keep their existing deadlines until a fresh login. Login/logout/password/rename actions notify other same-origin tabs with a credential-free local-storage hint. Walls recheck matching-event permission on that hint, focus and pageshow, queueing a recheck if an earlier feed request is still running. Auth-dependent event responses and wall reads use no-store. Different hostnames still have separate cookies; this fix addresses the user's confirmed same-domain/two-tab workflow.

Pre-deploy snapshot: `/data/backups/before-wall-session-20261112-1794476336836.sqlite`; baseline `/data/backups/wall-session-20261112-baseline.json`. Post-deploy schema 15/integrity ok; all recorded table fingerprints match exactly (sessions excluded). Instagram remains ON, X OFF. No stored content/settings, schema, dependency, runtime or infrastructure change. Source-only archive SHA-256: `6e91585866264e93f30cbe664a3bd9f74696895366b918768d1db2aa9c6748cc`; packaged runtime source matches the tested production build.

Validation: production build with pinned Bun 1.3.2/Sharp packaging; 127 unit tests / 974 assertions; production HTTPS Chromium tests cover a guest wall tab followed by login in another tab, immediate cogwheel access, 24-hour cookie expiry, restored browser storage, cross-tab logout and matching-event permission denial. Live verification confirms the deployed server/cookie lifetime constant is shared at 24 hours, both hostnames return no-store and guest denial, and the public wall renders without browser errors. Refresh existing tabs and log in once after deployment to receive the longer-lived cookie.

## Draggable photo focus and wide tiles — 2026-11-12

Source `5963411` was committed and pushed to `origin/feat_alby_design`, including all preceding local wall changes. Deployment `900da65b-8fdf-476e-9f52-c4e8fe3626f5` reached **SUCCESS** with its database-aware healthcheck. Photo focus uses direct pointer dragging/touch tapping and keyboard arrows; Edit post supports one-/two-column tiles, clamped to one on phones. No schema/runtime/dependency/infrastructure changes; schema remains 15. Clean source archive SHA-256: `b9e7cd5b97493ebc287528aad7b94b34b303849e1acfcb9ce5837cf60b02b039`; runtime source matched the tested clean production build before upload.

On-volume snapshot: `/data/backups/before-wall-drag-20261112-1794475616549.sqlite`; fingerprint baseline `/data/backups/wall-drag-20261112-baseline.json`. Post-deploy integrity is **ok** and every recorded table fingerprint matches exactly (sessions excluded). Instagram remains ON and X OFF, as requested. No production content/settings writes or provider tests were performed. Local validation: frozen install/build with Bun 1.3.2 including Sharp; 28 targeted unit tests / 305 assertions; production HTTPS Chromium scenarios for actual drag, touch tap, keyboard focus, saved width, responsive fallback and existing mosaic. Live Chromium verifies health and two-column/phone rendering with browser-only fixtures and zero browser errors.

## Configurable wall deployment — 2026-11-12

Deployment [`cc253c65-d0d4-4aaf-bfaa-0f4b5e3a5850`](https://railway.com/project/712b21fd-3995-473e-b0e5-c2b37feddc3d/service/9960307b-3bd3-41a9-ade4-67a2ca421745?id=cc253c65-d0d4-4aaf-bfaa-0f4b5e3a5850) reached **SUCCESS** from source commit `95c8dc4`. It includes configurable mosaic columns/spacing/padding/corners/text size, natural photo/video proportions, moderator editing of all three post sources, photo framing/focal-point preview, per-post article shortening/character limits (100 default; pinned organizer posts default to full text), and browser-local X/Instagram Last attempt timestamps. Schema 14/15 add optional presentation columns only. No dependency, runtime, service, replica, volume, password, seed or restore change.

Source-only Git archive: ignored `.data/wall-upload-20261112.zip`, SHA-256 `698d82d2ab1ff4582852f4ccdea0e7242302810fa3c090262c7013f9a133f387`. Runtime source was checked against the tested clean build before upload. No local environment files, databases, dependencies or generated output were uploaded. The authenticated Railway CLI was used because Railway MCP/skill was not installed in this session; explicit DashHack project/environment/service IDs were supplied for upload, logs and SSH. The school project was not accessed.

Pre-deploy consistent on-volume snapshot: `/data/backups/before-wall-layout-20261112-1794473927039.sqlite` (0600). Fingerprint baseline is `/data/backups/wall-layout-20261112-baseline.json`. Post-deploy: schema **15**, SQLite integrity **ok**, zero foreign-key violations. All original teams (15), notes (2), mentors (3), GitHub connection (1), invitation links (15), posts (4) and media (1) retain exact fingerprints; events retain all fields except the active event's updated_at. Existing content and credentials were preserved. The added presentation columns retain empty defaults on existing posts.

Concurrent live activity changed the active wall-settings revision 36→38 during the release: Instagram was enabled and its poll-at/failure/next-at/request-ID metadata changed; X stayed OFF. Both collectors were OFF at snapshot time. The release issued no settings or provider collection requests, and does not overwrite this concurrent state. Other wall settings and the second event's wall row are unchanged. Discord audit and temporary GitHub invitation/audit rows also changed during the deployment window; they were not restored or overwritten. Do not claim every table fingerprint is identical or silently pause a collector another user just enabled.

Validation: frozen install and production build with pinned Bun 1.3.2 including Sharp packaging; 126 unit tests / 964 assertions on Windows Bun 1.4.4; eight focused Chromium scenarios against the clean production build over local HTTPS (one reader test rerun after correcting animation-sensitive clicking); separate HTTPS production smoke for public reader, layout persistence, moderation framing and preview controls. Bun 1.3.2 Windows test teardown reports EBUSY cleanup failures and a pre-existing streaming test hangs; a complete pinned-runtime unit pass is not claimed. Railway's Linux Docker build and database-aware healthcheck both pass. Live Chromium verifies both existing hostnames' health, the two public posts, complete pinned-organizer text, original photo ratio, guest settings denial, one-column phone layout and zero browser errors. Live verification made no content/settings changes.

Updated 2026-11-10 for schema 9 and Discord setup. This project is separate from the school website in `../skola_boretice`.

## Prepared resources

| Resource | Value |
| --- | --- |
| Project | `DashHack` — `712b21fd-3995-473e-b0e5-c2b37feddc3d` |
| Environment | `production` — `7646006f-d5f1-4c62-a8b6-e540f0f26f96` |
| Web service | `dashhack` — `9960307b-3bd3-41a9-ade4-67a2ca421745` |
| Persistent volume | `dashhack-data` — `14d791fc-cdfd-4e1d-a177-6be2a8beab48`, 5000 MB, `/data`, `sfo` |
| Dashboard | [DashHack project](https://railway.com/project/712b21fd-3995-473e-b0e5-c2b37feddc3d) |
| Git branch | `feat_alby_design`, rebased onto `master` release 1.0 |
| First deployment | `0fd0cc09-af75-4ae6-9059-28d71190aa1e` — historical SUCCESS |
| Latest verified deployment | `014d6328-e2dc-4c2f-b54a-497d445bf533` — SUCCESS, mentor notification cards / schema 10 |
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

## Recipient invitation inbox and email acceptance — 2026-11-09

Source **`b74f9e8`** (with `293f732`), deployment **`062f6046-4993-414c-b10c-d41bc345f3bb` — SUCCESS**. The student success screen now directs recipients to their own **https://github.com/notifications**, not the private repository `/invitations` page. Czech steps explicitly explain checking email/spam, confirming the invited account and accepting the email invitation. The repository link is labelled for use after acceptance. GitHub itself returned the reported `/invitations` URL for the non-expired pending test invitation; delivery was confirmed, recipient browser acceptance was not. The service preserves a valid provider invitation URL for API compatibility, but the UI does not expose it as the acceptance destination.

Validation: 67 unit tests / 432 assertions; two targeted Chromium plus four Safari/iPhone WebKit checks; final production build. Live 390px browser verification used a real anonymous team preview and a browser-intercepted submission: email steps, notifications button, zero `/invitations` links and no horizontal overflow pass. No additional real invitation was sent. Real recipient acceptance still requires their GitHub account.

Backup `/data/backups/before-invite-guidance-1794261366267.sqlite`, 0600. All eight content-table fingerprints match before/after deployment; integrity ok, schema 7, X/Instagram polling OFF. Current counts include the user-requested temporary test team and intervening user notes: 3 events, 16 teams, 3 notes, 1 mentor, 1 GitHub connection, 1 wall-settings row, 110 posts, 3 media. The 15 real teams and existing pending invitations are preserved. Temporary team/repository cleanup record is private and ignored at `.data/test-team-invitation.json`; wait until the user finishes testing. No schema, dependency or infrastructure change.

## Reusable team links with verified GitHub accounts — 2026-11-09

Source **`73a02bf`**, deployment **`cf1b7634-8ec5-4592-a893-975f075fceda` — SUCCESS**. Final user requirement is one reusable link per team with GitHub account selection, not single-use student links or separate codes. Every member uses the same link, verifies their own GitHub account via browser-bound state/PKCE, then explicitly confirms access for that account. No username text field or username-only API bypass. Existing callback registration is reused with separate organizer/student endpoints and cookies. Temporary user OAuth tokens are not persisted and are revoked after identification; invitation installation tokens retain one-repository Write scope and immediate revocation. Exact numeric GitHub identity is checked again before granting.

The user confirmed the unexpected `jirik` invitation was a friend's typo. Historic proxy logs showed both test submissions from the same IP/browser, not proof of a leak or a verified submitter. Containment cleared the invitation key and redeployed the prior source as `08ae00b4-2dc8-4a83-8218-7e57b98088ea` SUCCESS. A sweep of all 16 organization repositories found no pending App invitations at that point; the temporary test repository had only the owner's admin access. No collaborator permissions were removed. The user made the App public to permit outside students to authorize; Contents/Members/Administration permissions remain unchanged. A fresh random invitation key was supplied via CLI stdin with deploy skipped, then activated with this source deployment. The old key was not retained and every old stateless claim is rejected.

Schema 8 adds small link/OAuth/audit tables transactionally. Team links last seven days, are reusable/retrievable, individually/all revocable, and absent from public event exports. Audit records include verified numeric GitHub ID/login, request outcome/time, team/link IDs, validated client IP, bounded browser UA and request ID; organizer issuance identifies a hashed shared event session. Limits and raw-secret exclusions are described in docs/GITHUB_APP.md. OAuth verifies account identity; team-link possession authorizes the team request and can still be forwarded. No new dependency, service, background worker, replica or volume.

Full consistent backup: `/data/backups/before-student-oauth-1794262590285.sqlite`, 0600. Post-deployment schema 8, integrity ok. Seven content-table fingerprints match exactly: events, teams, notes, mentors, GitHub connections, wall posts and media. Wall settings changed concurrently only in `scrollSpeed` (now 20) and revision; that change was preserved. Both collectors remain OFF. Counts: 3 events, 16 teams (15 real + temporary test), 3 notes, 1 mentor, 1 GitHub connection, 1 wall settings row, 110 posts and 3 media. Do not roll back to schema-7-only app code against schema 8; a database rollback would require deliberate reconciliation with the private backup and any later writes.

Validation: **74 unit tests / 484 assertions**, three Chromium and six WebKit/Safari/iPhone checks, production build and isolated production API smoke. Smoke drives two verified identities through one team link, checks PKCE/cookies, callback replay, wrong-browser rejection, forged username/repository fields, authenticated audit, per-event revocation and user/admin token revocation with a mocked GitHub provider. Live verification confirms all 16 correct previews, stable repeated link retrieval, invalid old test link, username-only bypass rejection, actual GitHub account-picker handoff with PKCE/secure HttpOnly cookie, 16 owner links and phone audit layout. No extra real repository invitation was sent during verification. Real recipient consent and invitation acceptance remain for the student's signed-in account.

Fresh 0600 ignored `.data/team-invites-2026.{csv,txt,json}` exports contain the 15 real-team links; `.data/test-team-invitation.json` has the separate replacement test link. Old exports carry `revoked-before-oauth` suffixes. Links expire 2026-11-16 around 23:20 Prague time. Current links are also in authenticated event Settings. Never commit the raw URLs. The public roster CSV/docs now point acceptance actions to personal GitHub notifications, removing the old private repository invitations links.

## Projector layout, QR modal and moderation search — 2026-11-09

Source **`600417b`**, deployment **`03e38078-fc20-4b62-a6e7-7d9916188c10` — SUCCESS**. Public wall replaces the top header with a narrow bottom-to-top left title rail. A 160px QR floats over the feed at the top-right edge; the collapsed authenticated cogwheel opens a full-screen QR modal, with square sizing that fits phone landscape. Lazy media/startup, accessible dialogs and five-second resume remain. The optional JSON setting `title` is used by the wall, browser tab and upload label, while the event API identifier still determines submission routes.

Production title was set to **AT&T Hackathon Junior 2026** through a revision-checked title-only API patch after deployment. Every other wall setting was compared and retained, including scroll speed and disabled X/Instagram polling. No provider collection request was needed. Existing GitHub team capabilities remain valid; join text now simply asks students to sign in with GitHub. Organizer link instructions and join success/help text were shortened too.

Moderation requests server pages of 10/20/50 posts (default 20, API maximum 100), searches text/names/handles, combines search with existing tabs/sort, and retains/clamps the current page after mutations. Pending reads are debounced/cancelled. SQL uses bound search terms and literal wildcard handling. Counts cover all undeleted posts rather than only the loaded page. Existing API clients without paging/view parameters keep their legacy response shape. Blocklist hints explain new-post substring matching and comma/newline separators; X/Instagram query hints state their supported separators. The moderation scroll-speed field is now included in settings saves.

Validation: **76 unit tests / 503 assertions**, eight distinct Chromium scenarios and ten Safari/iPhone WebKit checks covering paging/search, header/QR geometry/modal, original/loop-copy reader, progressive media/startup, five-second hover resume, saved speeds, concise OAuth, responsive routes and phone QR landscape. Production build and isolated production API smoke pass. Live tests verify title, paged/search results and 20-row rendering, floating QR/vertical rail, full-screen modal, guest cogwheel absence, concise join text and the current test-team capability. Live screenshots were inspected locally; no screenshots/private links were committed.

Backup: `/data/backups/before-wall-layout-1794264018260.sqlite`, 0600. SQLite schema remains 8, integrity ok. All seven core content fingerprints outside wall settings match: 3 events, 16 teams, 3 notes, 1 mentor, 1 GitHub connection, 110 wall posts and 3 media. Wall settings changed only for the authorized title/revision. Other wall fields and both OFF polling flags were verified directly before/after the patch. Existing volume, budgets, one replica, dependencies and schema are unchanged.

## Profile invitation destination — 2026-11-09

Source `60f4ae8`, deployment **`65f904ea-797a-4a08-82da-d2f208c09118` — SUCCESS**. At the user's explicit request, the student success button now opens `https://github.com/settings/organizations` and reads “Otevřít pozvánky na GitHubu”; inbox wording/links in the current student UI and public roster were updated. Email remains an acceptance option. This is navigation/copy only, with no change to OAuth, invitation type/permissions, team links, variables, schema or infrastructure. Targeted Chromium OAuth UI check and production build pass. Live phone UI confirmed the exact URL and no remaining inbox link, using browser-only mocked callback/claim responses; no real invitation or content change was made.

## Larger wall title and clearer cogwheel — 2026-11-09

Source `0101aa2`, deployment **`4407f97e-2350-4877-9774-1c0bd18d38ed` — SUCCESS**. Vertical title is 36px desktop, 24px phone, and 20px on short screens; rail/feed padding increased to match. Bottom-right cogwheel is a solid, higher-contrast 48px button with a hover label. It still requires the matching event password session; GitHub student authorization does not grant event editing. Three targeted Chromium scenarios, production build and live desktop/portrait/landscape typography plus authenticated/guest button checks pass. No production data, settings, variables, permissions, schema or infrastructure changed.

## Proper event URI and compatibility — 2026-11-10

Canonical wall: **https://dashhack-production.up.railway.app/ATT%20Hackathon%20Junior%202026/wall**. Event URI/login name is now **ATT Hackathon Junior 2026**; the display title remains **AT&T Hackathon Junior 2026** and password is unchanged. Stable event ID remains `97c87fe6-f510-4117-9558-1e2380fdaa6a`.

Source `c402f19`, deployment **`7d8eb0c1-bcb6-4b96-9662-ef9c04a19622` — SUCCESS**. Deployed compatibility before renaming. Guarded server middleware redirects old demo wall/upload/dashboard/event/wall-API paths with HTTP 307 and no-store, preserving suffixes/query and upload methods/bodies. The guard requires the exact production ID/new name, so the old event continued working before the rename and unrelated local events are unaffected. Dashboard route middleware also canonicalizes names returned by redirected API reads. Existing QR codes therefore keep working; new QR codes use the canonical upload path.

Full consistent private backup: `/data/backups/before-event-uri-1794265680800.sqlite`, 0600. A parameterized BEGIN IMMEDIATE transaction verified the exact old name and unoccupied new name, then changed only `events.name` and `updated_at`. Password/hash, other event fields and all eleven checked tables matched within the transaction: teams, notes, mentors, GitHub connection, wall settings/posts/media, team links/flows/audit, and sessions. Existing sessions were intentionally preserved for this URI-only operation. Schema remains 8, integrity/foreign keys ok; 16 teams retained and both collectors OFF. No new schema/service/variable or provider request.

Validation: **77 unit tests / 513 assertions**, production build and isolated production HTTP smoke (guard inactive before rename, old wall/upload/dashboard/API compatibility, query preservation, real redirected text submission, unchanged session and new-name password login). Live checks verify canonical wall, old wall/upload/dashboard redirects, QR upload target, new login with existing password, stable ID/16 teams and all 16 existing GitHub team capabilities. Private JSON export metadata was updated to the new name; tokens were not regenerated. Use the new name in future event API payloads and logins; do not recreate the former demo event.


## Responsive sharing and monitor layout — 2026-11-10

Sources `a02f126` and tablet sizing refinement `ace870f`. “Share a moment” is centered in the full-screen QR dialog and upload-page header. The QR grows with available viewport width/height instead of stopping at 640px. The feed no longer has an 1800px width cap; displays wider than 1920px gain columns while retaining readable card widths. Existing phone/tablet breakpoints, vertical title, floating corner QR and authenticated cogwheel remain.

Validation: two Chromium and three Safari/WebKit/iPhone checks cover phone portrait/landscape, tall portrait tablets, 720p/1080p, 3440px ultrawide and 3840px 4K, centered dialog title, full-width feed, additional columns, growing square QR and keyboard dismissal. Production build passes. No dependencies, schema, settings or infrastructure changes.


Final deployment **`215966a0-51c1-411c-9330-db20a439f3e8` — SUCCESS**, source `ace870f`. Live checks passed at 1920×1080 (4 columns, 856px QR), 3440×1440 (7 columns, 1216px QR), 3840×2160 (8 columns, 1936px QR), phone portrait/landscape and 768×1366 portrait tablet. Every QR remains square and inside the viewport; dialog and upload headings are centered. Live screenshot inspected locally. Existing production data and collector settings were not modified.


## Wall QR placement correction — 2026-11-10

Source `72106de` corrects the preceding responsive-wall interpretation. The user wanted the existing floating QR vertically centered and filling its own column, while retaining the header/bar size. The feed is restored to its original 1800px cap and one/two/three/four-column breakpoints; no ultrawide columns. The desktop sharing card stays 186px wide (160px content), centered vertically at the right edge, and its square image fills the content width. The left header sizing is unchanged. The user explicitly approved the full-screen modal, so its centered title and viewport-sized QR remain. Upload header centering remains too.

Validation: targeted Chromium checks pass; three Safari/WebKit/iPhone checks also pass, covering the corrected wall at 1280/1920/3440/3840px, original card width/full-content QR, centered card, capped feed, unchanged modal, and phone/tablet QR fit. Production build passes. No schema, data, collector settings, dependencies or infrastructure changes.


Deployment **`7bb9a908-4165-4af8-a001-68969ff8fba0` — SUCCESS**, source `72106de`. Live verification confirms the 1800px feed cap, four columns on ultrawide/4K, 186px desktop sharing card with full-content square QR at the vertical center, phone/tablet fit, and preserved approved modal. Live wall screenshot inspected locally. No production data/settings were modified.


## QR fills the actual right gutter — 2026-11-10

Source `a15739e` removes the fixed desktop sharing-card width from the preceding correction. The user's screenshot showed that “column” means the empty right-hand gutter outside the 1800px feed. The vertically centered card now fills that gutter with 16px padding at both edges. Its width falls back to 186px where the gutter is narrow and is bounded by viewport height to keep the card visible on short monitors. The square QR fills the card's content width. At the supplied 2488×1298 viewport the card is 312px wide instead of 186px. Feed width/columns, vertical header and approved modal remain unchanged.

Targeted Chromium and Safari/WebKit projector checks pass at 1280, 1920, the exact 2488×1298 screenshot size, 3440 and 3840px. Assertions measure both gutter edges rather than only the image inside a fixed card. Production build passes. No data, settings, dependencies, schema or infrastructure changes.


Deployment **`2a2e2dcc-7396-445b-97eb-8ccbfd83520d` — SUCCESS**, source `a15739e`. Live measurements confirm 312px card at 2488×1298, 788px at 3440×1440 and 988px at 3840×2160, each filling the right gutter with 16px side padding, while the feed remains 1800px/four columns. Phone/tablet and unchanged modal checks pass. Screenshot at the user's exact dimensions inspected locally. No production content/settings changed.


## Event wall cleanup and editable placeholders — 2026-11-10

At the user's request, cleared downloaded test feeds for event `97c87fe6-f510-4117-9558-1e2380fdaa6a` / ATT Hackathon Junior 2026. Full consistent on-volume snapshot: `/data/backups/before-wall-cleanup-1794305826073.sqlite`, permissions 0600. A scoped transaction removed 102 X posts and six unpinned, explicitly identified manual demo fixtures; both pinned manual event placeholders were retained byte-for-byte, with their media. Media foreign keys cascade for removed posts. All nine other checked tables match within the transaction: events, teams, notes, mentors, GitHub connections, team invite links/flows/audit and sessions. Integrity and foreign keys pass.

Cleared shared/X/Instagram query hashtags and X handles, including the old test #atthack query. Both collectors are OFF; every other setting is preserved and revision advances to reject stale settings writes. No provider calls, credentials changes, reseed or new query guesses. Actual event tags remain for the user to supply/configure.

Feature source `382729a` adds “Edit post” for manual/community posts in authenticated Social Wall moderation. Organizers can change author and text, retaining pin/status/hidden state, timestamp, media and source links. Server enforces matching event ownership, manual-only platform, text limits and post revision. Text remains escaped. Conflicts retain the modal draft and require cancellation/reopening against fresh data. Imported social posts cannot be rewritten. No schema or dependency change.

Validation: **78 unit tests / 522 assertions**, targeted Chromium and Safari/WebKit editor scenarios (saved pin/author/text, escaped HTML, conflicting edit retains draft), and production build pass.


Deployment **`67719072-540e-498a-8d0e-df04e58b6574` — SUCCESS**, source `382729a`. Live authenticated checks confirm exactly two pinned manual posts, no downloaded feed, all query lists empty and both collectors OFF. Desktop and 390px phone edit dialogs open with the original author/text and fit the viewport; both were canceled and full post/settings API comparison confirms no incidental writes.


## Team-colored notes, Critical priority and confirmed event tag — 2026-11-10

Source `beb740e`. Both Teams and Kanban derive note surface tint/border from the current team color, so old notes inherit immediately and a team's color change follows through automatically. New UI notes store the current team color; legacy note.color is retained in persistence/backups but no longer independently editable in the card. Light and dark surfaces use team tints with appropriate text colors. Priority headers remain independent: low neutral, medium blue, high amber, new critical solid red/uppercase with a warning icon and prominent red outline. Plain notes outside Kanban have no priority header or outline; their saved priority is retained for future reuse.

Both whole-team and per-note save paths accept `critical` through shared NOTE_PRIORITIES validation. The existing TEXT column requires no migration; schema remains 8. Critical priority persists across reopening. Note content/media ownership/revision behavior is unchanged. No dependencies or services added. Safari note selects use explicit appearance/arrow styling to avoid invisible text on native controls in dark themes.

Validation: **79 unit tests / 525 assertions**; three existing Chromium note/Kanban scenarios plus the new inheritance/priority/persistence/dark/phone scenario, and the new Safari/WebKit scenario. Critical is saved through both API paths, body color is retained when priority changes, warnings remain visible and mobile cards fit. Production build passes; Safari screenshots inspected locally.

The user confirmed `#atthack` as the intended event hashtag. A revision-checked production settings patch configures shared, X and Instagram hashtag lists to that one tag, while explicitly retaining both collectors OFF. X handles remain empty. Full wall-settings comparison confirms every other setting is unchanged. No provider fetch or imported post was generated.


Deployment **`e65d5ec2-7fbf-4192-a65e-c9d9d327d2e4` — SUCCESS**, source `beb740e`. Live desktop/phone verification confirms team colors in both Teams and Kanban, red critical header and themed selects. Visual preview notes were injected only into browser GET responses; all note/team write requests were blocked, and full real team API comparison confirms production notes unchanged. Screenshot inspected locally. Existing wall/tag configuration remains separate from this deployment.


## Kanban team-name card headers — 2026-11-10

Source `04bb1a6` moves the team name into each Kanban card's colored header, with larger bold wrapping text and the existing desktop drag handle. The priority warning follows on its own line; critical cards retain the red header/icon/outline. A StickyNote header slot keeps the Teams view's existing priority header intact. No notes, fields, permissions, grouping or status behavior changed.

Validation: three Chromium scenarios (cross-view moves/filtering, body drag after pending save, team colors/critical/header containment/dark/phone), two Safari/WebKit scenarios, and production build pass. Safari screenshots inspected locally. Data, schema, dependencies, poll settings and infrastructure unchanged.


Deployment **`b64961c6-bbe1-4a26-b6b4-35742c6dc9bb` — SUCCESS**, source `04bb1a6`. Live browser-only preview checks confirm the team name is nested inside the card header on desktop and phone, alongside the preserved priority warning. Team/critical styling and the Teams view still work. Note/team write requests were blocked during preview; the real team API data matches before/after. Discord integration remains a proposal only; no Discord app, endpoint, installation or messages were created by this change.


## Startup matrix Excel template exports — 2026-11-10

Source `259bd07` adds saved matrix `.xlsx` exports: each expanded team matrix has Exportovat matici (.xlsx), and Teams has Export všech matic (.xlsx), covering all teams regardless of search. One team uses one template worksheet; all-team export uses a sheet per team. This is a read-only export of already publicly readable matrix data; no new authorization bypass or write endpoint.

The user supplied `/home/alby/Downloads/Startupová matice.xlsx`. The tracked 49 KB template manifest preserves its exact five-by-two question layout, colored fills, borders, column widths, row heights, merged heading, CzechInvest logo, theme and landscape print setup. Team name goes into the heading, saved rich-text answers follow each original question, mentor/event go into the print footer. Unanswered fields remain explicitly unanswered. Rich bold/italic/line/bullet formatting is retained. Workbook names are sanitized/unique; cells are literal strings, so formula-looking input cannot execute as formulas. Original author/local-path/printer-device metadata is excluded by `scripts/prepare-startup-matrix-template.py`.

Generation uses a lazy browser module and a small STORE-only ZIP packager; no spreadsheet runtime, Python service or new package dependency on Railway. The only Python dependency used was openpyxl under /tmp for independent validation. Existing app/SQLite/schema 8/poll settings are unchanged. Cells exceeding Excel's safe length use clearly labelled continuation worksheets with all answer text retained; UTF-16 chunking keeps emoji intact. Original fixed box heights are retained, so long answers may require row-height adjustment when reading/printing. Only the first sheet is selected, avoiding accidental grouped edits across teams.

Validation: **82 unit tests / 573 assertions**, four Chromium matrix scenarios and one Safari/WebKit download scenario, including real per-team/all-team XLSX downloads at phone width. Independent openpyxl validation opens without warnings and verifies fills/borders/wrapping/merges/landscape/logo against the original template, bold/italic text, and a complete 50,000-character continuation answer. ZIP CRCs and every XML part validate. Production build passes.


Deployment **`426b0070-94a2-4955-a5ae-2aeb21805445` — SUCCESS**, source `259bd07`. Live production frontend checks used two explicitly synthetic teams, intercepting every API request (no production payload read). Actual single-team phone and combined desktop downloads opened in openpyxl without warnings, with correct sheet names, synthetic Czech answers, logo and valid ZIP CRCs.

Automatic approval review rejected the optional download of real production matrix answers to local /tmp files because that destination/payload transfer lacked specific authorization. It was not retried or bypassed; no real workbook/data was copied locally. Users can export through the deployed buttons. Do not run `/tmp/dashhack-matrix-export-live.mjs` without explicit authorization for that transfer; `/tmp/dashhack-matrix-export-synthetic-live.mjs` is the API-intercepted synthetic check.

## Discord setup preparation — 2026-11-10

The user chose a separate Discord channel per team and has not created the Discord application yet. Schema 9 adds three empty Discord tables; existing content remains intact. Organizer Settings → Discord accepts the public application/server/channel IDs and a public verification key, exposes the signed HTTP endpoint/install link, and registers `/mentor` and `/matice` using a transient bot token. Student access is separate from event login. See [setup, scopes, limits and security](DISCORD.md). No Discord provider traffic is generated until configured/registered by the organizer; no poller or extra service was added.

Before deployment, created consistent private on-volume snapshot `/data/backups/before-discord-1794317578873.sqlite` (0600). Integrity is `ok`, schema 8; table counts/hashes recorded locally without transferring any credentials or content. Snapshot includes 15 teams, three notes and two retained wall posts at that point. Existing collectors remain OFF. Migration is additive; rolling back to code that rejects schema 9 requires a schema-compatible release or an explicitly reviewed database recovery, not blindly reverting to the old binary.


Deployment **`50aaa328-2dac-4bd8-b086-f0260f62c2d6` — SUCCESS**, source `ce54d0d`, pushed to `feat_alby_design`. Production schema is 9 and integrity `ok`. All thirteen existing tables match the pre-deploy snapshot byte-for-byte by deterministic row hashes, including teams, notes, matrices, credentials, sessions, invitations and wall settings. Three new Discord tables were empty immediately after migration. Public health, real invalid-signature HTTP 401, guest matrix/settings denials, and production phone rendering of the setup panel/ten-editor student form pass. Frontend preview used only synthetic intercepted API responses; screenshots were inspected. No real matrix answers were downloaded.

The user then created Discord application `1569701943780057230`, supplied its public verification key, and server `1285378042478329867`. Saved these through the owner-authorized API using an existing on-volume event session (no credential transferred). Commands remain **disabled**, channel map empty. No Discord interaction/install/registration has been performed yet. Next: user validates `https://dashhack-production.up.railway.app/api/discord/interactions` in Discord Developer Portal; install the commands-only app, register using the transient UI token field, map team channel IDs and enable/test. Both social collectors remain OFF and existing wall/team data are unchanged.

## Printable matrix layout and answer limits — 2026-11-10

The user approved five Excel rows (title, questions, answers, questions, answers), then requested more answer space. Current maximum is **600 characters per answer**, with an 18-line conservative print budget to prevent pathological line breaks/wide text. Both organizer and Discord forms show counters and reject invalid drafts, with the same server-side validation. Project Abstract keeps its independent 50,000-character allowance. Older oversized saved answers are preserved but must be shortened before export; nothing is truncated or moved to continuation sheets.

Each team uses exactly one colored template sheet, separate answer cells on rows 3 and 5, 85pt question rows and 160pt answer rows. Answer text uses 9/8/7pt as required. Landscape A4 print area A1:E5 fits one page wide/high. CzechInvest logo, field colors, original question wording, rich styles, mentor footer and literal-string safety are preserved. Template regeneration is reproducible from the original workbook. No dependencies, services, schema or production data writes.

Validation: **92 unit tests / 654 assertions**, five targeted Chromium and five Safari/WebKit matrix/student scenarios, and production build pass. The synthetic `.data/examples/startupova-matice-tisk.xlsx` contains two full 600-character answers and independently opens in openpyxl without warnings, with one sheet, correct question/answer rows, matching fills, logo, print area/settings and valid ZIP CRCs. No native Excel/PDF printer rendering was available; text fit uses the shared conservative estimate and fixed row geometry.


Deployment **`3f8b32dc-e62f-46a6-85fe-cb9f6de38dda` — SUCCESS**, source `1be220f`, committed/pushed to `feat_alby_design`. Production frontend generated both single-team phone and combined desktop downloads using entirely synthetic intercepted API data. Independent openpyxl validation confirms exactly one five-row sheet per synthetic team, a complete 600-character answer only in its answer cell, matching colors/logo, one-page landscape print area and no continuation sheets or parser warnings. No production answers were read/downloaded or modified; existing Discord configuration, social collection settings, schema and infrastructure were not changed.

## Discord Terms and Privacy pages — 2026-11-10

Added public static `/terms.html` and `/privacy.html` with shared `/legal.css`; no JavaScript or login is required. They explicitly cover only this DashHack deployment and Discord application for the private AT&T Hackathon Junior 2026 event, its organizers, mentors and invited teams. Terms cover permitted event use and submissions. Privacy describes actual Discord/event/cookie/optional integration data, event-only purpose, shared-login audit visibility, existing event-URL public reading, Railway's SFO hosting, cleanup/backup limits and organizer contact for correction/deletion. No unsupported confidentiality, automatic deletion or legal-compliance guarantee is made. Policy URLs are also shown as copyable read-only fields in organizer Discord Settings. Existing access rules, stored data, app registration, command enablement and infrastructure are unchanged.

Build passed; both HTML documents have one heading, valid local stylesheet/navigation links and no scripts. Generated production public assets are present. Actual Discord Developer Portal URL entry remains the user's action; no portal setting was changed automatically.


Deployment **`4937bde6-66b3-4b27-bd37-e8b1d8077665` — SUCCESS**, source `9b77020`, committed/pushed. Both live policy URLs return HTTP 200 HTML without authentication or JavaScript. Live Chromium checks confirm the private-event/mentor/organizer scope, phone layout without horizontal overflow, working stylesheet and healthy app endpoint. Privacy phone screenshot inspected. No schema, data, provider or permission changes.


## Recreated Team 16 for Discord testing — 2026-11-10

At the user's request, added **Team 16 - TEST**, ID `96173152-c894-477f-ba4c-c8da7655207d`, as the sixteenth team in the existing event. Purple `#8B5CF6`, short Czech test description, existing `AT-T-Hackathon-Junior-2026/test-team-invitation` repository URL reused (no GitHub repository or invitation operation). Mapped Discord channel `1569708054633775166` and enabled Discord commands so `/mentor` and `/matice` can be tried in that channel. Application `1569701943780057230` and server `1285378042478329867` were checked before writing; no other channel mapping existed. The owner's API authorization and configuration revision checks were used; no credentials left Railway.

Consistent on-volume backup `/data/backups/before-team16-1794318987690.sqlite`, 0600. All original 15 team rows, every note and all wall settings matched before/after; SQLite integrity `ok`. Exactly one mapped team, 16 total teams. No test notes or matrix answers were added, no social polling setting changed. Config save rotates/revokes Discord form flows as documented. Actual Discord installation/command registration/delivery remains unverified until the user runs the commands. Cleanup metadata: ignored 0600 `.data/discord-test-team.json`; old invitation test record refers to the deleted previous team. No application deployment was necessary for this data-only change.


## Discord GitHub link and in-form urgency — 2026-11-10

`/github` returns a private button to the mapped team's existing organizer-issued GitHub OAuth joining link. It never directly grants repository access, generates a new invitation or revives a revoked link. Active/expiry/repository/installation checks run on every response, including Discord retries. Only the mapped team's ID is used. Audit stores verified Discord identity and link ID without the capability URL; the ten-minute rate allowance is 10/user, 20/team. `/mentor` now takes no arguments and asks Běžná/Naléhavá in its text modal; high/medium only, with validation and legacy open-form compatibility. Registration upserts three definitions and explicitly clears the old `urgent` slash option. Settings wording and event Terms reflect `/github`. No SDK, service, database migration, new GitHub permission or provider polling.

Prepared the new Team 16 GitHub joining link through the owner API, reusing its configured test repository. No collaborator invitation was sent or GitHub API called. Private raw link stayed on Railway. Consistent backup `/data/backups/before-discord-github-1794319874139.sqlite`, 0600; all team rows, notes and wall settings unchanged, integrity `ok`. Existing fifteen-team links were retained.

Validation: **95 unit tests / 675 assertions**, three Chromium and three Safari/WebKit Discord scenarios, production build, and isolated production-runtime smoke all pass. The smoke used synthetic SQLite/keys/config and actual signed HTTP requests: correct private team OAuth link, urgency form/high-priority persistence, duplicate suppression and revoked-link denial, with zero external provider calls. Actual new Discord command registration is pending the organizer's transient bot token; no claim is made that the updated definitions are already published to Discord.


Deployment **`28f9ddbd-61b7-4c38-8c3e-f5d041b17613` — SUCCESS**, source `2dcb11c`, committed/pushed. Live health and SQLite integrity `ok`; 16 teams remain, Discord enabled only for the configured test-team channel. On-volume HMAC/expiry/repository/installation checks confirm Team 16's joining link is valid without downloading its token. Production phone preview uses fully synthetic intercepted API data and shows the updated three-command panel; real guest access and bad-signature denials pass. No actual student invitation or synthetic Discord note was generated in production. The user must register the three updated commands with the transient bot token field before `/github` appears; actual Discord delivery remains unverified.

## Kanban To Do priority ordering — 2026-11-10

To Do displays Critical, High, Medium, Low in that order. Stable sorting preserves equal-priority order, filters still apply, and missing/unknown legacy priorities fall back to medium. Only a freshly filtered display array is sorted; no team/note positions or persistence/API data are rewritten. In Progress and Done retain their original order. Existing priority warning/color/drag behavior remains intact. No dependencies, migration, settings or infrastructure changes.

Validation: three existing Chromium scenarios (moves/filtering, pending-save drag and priority/team-color/header styling), two existing Safari/WebKit Kanban scenarios, and production build pass. No new persistence tests or packages were added for this display-only change.


Deployment **`b32df033-e09f-42b9-b5a2-0550af14db41` — SUCCESS**, source `b9a01c9`, committed/pushed. Live production frontend verification used seven entirely synthetic notes across two synthetic teams, intercepting every API request. To Do order is Critical → High → Medium → Low, equal-priority order is stable across teams, team filters and phone layout pass, and In Progress order remains intact. Phone screenshot inspected. No real production note/team content was read or changed by the preview.


## Mentor-chat notification preparation — 2026-11-10

New tracked help requests from `/mentor` and DashHack enqueue a styled mentor-channel notification with team, priority, author, problem excerpt and a link to the highlighted Kanban card. Ordinary mentor notes, historical notes and edits are excluded. Stable per-note markers survive whole-team note replacement. Schema 10 adds only the bounded `discord_notifications` table. Runtime token stays in Railway, never SQLite/client output. Sender checks current bot app/channel guild, disables user-supplied mentions, escapes Markdown and uses a stable enforced nonce. Persistent claims plus no automatic retry of uncertain sends favor no duplicates over guaranteed delivery; known 429s and metadata failures are bounded at three attempts. Settings exposes safe counts/errors and a minimal-permission bot installation link. Policies disclose Discord copies and their separate cleanup.

Set non-secret `NUXT_DISCORD_MENTOR_CHANNEL_ID=1285378043099086852` through Railway MCP with deploy skipped, for this release. The runtime bot token was absent at the pre-migration backup check; the user was asked to set `NUXT_DISCORD_BOT_TOKEN` directly in Railway and install the bot with View Channel, Send Messages and Embed Links in mentor-chat. Commands-only installation/transient registration token is insufficient for ongoing posts. No new package/service/replica or paid social-provider polling.

Created consistent private on-volume backup `/data/backups/before-mentor-notifications-1794321293231.sqlite`, 0600, schema 9/integrity ok. Snapshot holds 16 teams, four notes, two Discord actions and existing settings/invitations; row hashes were recorded without downloading contents or credentials. Schema upgrade preserves existing content and does not enqueue historical requests.

Validation: **103 unit tests / 725 assertions**, four Chromium and four Safari/WebKit Discord/deep-link scenarios, production build and isolated production-runtime smoke pass. Unit checks cover app/Discord enqueue, replacement-save deduplication, wrong server/app, disabled integration, concurrency, uncertain-send/restart behavior, bounded 429/metadata retries, missing credentials, deleted notes, schema 9 preservation and Unicode/embed/mention limits. Built-runtime signed requests queue exactly once, keep private replies responsive and expose safe owner-only status with synthetic local data and zero provider calls. Live mentor-chat delivery is pending runtime credentials/installation and is not claimed yet.


The user subsequently set `NUXT_DISCORD_BOT_TOKEN`, confirmed notifications for both sources and requested an @Mentor ping. A server-only read verified the token's application `1569701943780057230`, and guild roles identified Mentor `1285378042478329872` with `mentionable=true`. Mentor-chat GET returned HTTP 403; user was asked to grant the bot channel access/send/embed permissions. Set non-secret `NUXT_DISCORD_MENTOR_ROLE_ID=1285378042478329872` with deploy skipped. The sender verifies role membership/mentionability in the channel's guild and permits only this explicit role; user-submitted mentions and @everyone remain disabled, with no new Mention Everyone permission.


Final validation after adding the requested Mentor ping: **104 unit tests / 731 assertions** (including one-role-only allowed mentions and receipt confirmation), four Chromium/four Safari flows and the final production runtime smoke/build pass. The user fixed channel permissions; read-only verification now returns HTTP 200 for mentor-chat in the correct guild and confirms the same mentionable Mentor role. A clearly marked Team 16 request will be used for live delivery verification after deployment.


Deployment **`014d6328-e2dc-4c2f-b54a-497d445bf533` — SUCCESS**, source `6d675fe`, committed/pushed. Schema 10 and integrity `ok`; all sixteen pre-existing table hashes exactly matched the private pre-deployment snapshot before the live test, with an empty new queue. Runtime bot/channel/role were configured, and the user-fixed mentor-chat/role checks returned HTTP 200 with the correct guild/application.

Created one clearly marked high-priority help request only in **Team 16 - TEST** through the owner API. It queued atomically and posted one styled Discord message on the first attempt. The Discord receipt included the intended Mentor role; no error or duplicate. The card links to the exact new Kanban note. Other team rows and all prior test notes were preserved. No historical help requests were replayed. Local ignored 0600 `.data/discord-test-team.json` records the synthetic test-note/message IDs for later user-authorized cleanup; no actual tokens/capability links were copied. User can review the live card in mentor-chat. Existing social wall settings/collectors and infrastructure were not changed.


## Reversible Kanban / Discord status controls — 2026-11-10

Source **7480250**, deployment **110d459d-fdbb-4f38-a093-e185eadaa458** observed **SUCCESS**. Schema **11** and SQLite integrity/HTTPS health pass. Consistent private backup `/data/backups/before-mentor-status-1794323110624.sqlite` (0600) remains on the volume. Before testing, all seventeen pre-existing tables matched their snapshot columns/rows exactly; migration preserved the existing message ID and installed buttons by PATCH without a replacement announcement.

The existing clearly marked Team 16 test request was moved through the production note API **Done → In Progress → To Do**, confirming each change updated the same mentor-chat message with one original send attempt, no extra announcement, no role re-ping and no other team/note changes. Restored its initial To Do state. Discord button authorization/reopening/replay/student-denial were exercised through real signed HTTP requests against an isolated built server; a real human Discord button click is left for the organizer to try. The current live card already has the buttons, requires the configured Mentor role, and needs no new installation permissions or command registration.

Validation: **109 unit tests / 774 assertions**, five Chromium scenarios and the same five Safari/WebKit scenarios (including desktop/phone completion and reopening), production build and isolated signed-runtime smoke pass. No package/service/replica added. Settings and private runtime configuration remain unchanged. See [Discord status controls](DISCORD.md).


## Discord /github registration and /help alias — 2026-11-10

Source **a1c41fc**, deployment **07c121a8-f3f6-4a3a-a71b-a65f7ce3d1c9** observed **SUCCESS**; public health passes, schema unchanged at 11. Live Discord inspection found only mentor/matice registered. After deploying the alias handler, ran the source's four non-destructive command upserts inside Railway using the runtime token, verified bot application/guild, and read back mentor/matice/help/github with default member permissions null. Existing mentor/matice IDs retained; new help `1569732108287475833`, github `1569732109583519914`. No note/team changes, alerts or extra permissions. Token never left Railway.

`/help` shares the exact `/mentor` modal, urgency validation, request persistence, audit/rate-limit bucket and notification queue. **110 unit tests / 784 assertions**, five Chromium integration scenarios, production build and isolated signed built-runtime smoke pass (including exact alias equality, scoped GitHub link, replay and role-protected status controls). Discord clients may need to reload their command picker after registration.


## Table numbering and repository prefixes — 2026-11-10

The user supplied the seating-plan image and explicitly approved the transcribed map after automatic review required confirmation. Applied names and repository prefixes for all fifteen real teams, in display rows **11/21/31, 12/22/32, 13/23/33, 14/24/34, 15/25/35**. Example: `11 - Detrio` → `AT-T-Hackathon-Junior-2026/11-detrio`. Stable team/repository IDs, private visibility, default branches, notes, matrices, colors and Team 16 were preserved. Preflight checked all repository identities and target-name collisions before mutations. Each provider-confirmed rename updated only that team's name/path/position/revision and same-repository invitation bindings in a SQLite transaction; on-volume progress records support interrupted-run recovery. Existing sixteen active capability hashes/expiry/state still validate against their current repository bindings; none were reissued.

Private consistent backup `/data/backups/before-table-numbering-1794324997278.sqlite` and adjacent progress JSON remain on the volume. Integrity passed. Public roster/CSV updated. This was a targeted production data change; the three-column source layout remains 7d950d9. See [table mapping](EVENT_TEAMS_2026.md).


## Done tickets thread and reopening — 2026-11-10

Source **c355ab3**, deployment **61687168-54b6-4918-a180-a9cc4387b22f** observed **SUCCESS**. Private runtime `NUXT_DISCORD_DONE_THREAD_ID=1569737661193785394` points to the verified public **Done tickets** thread under mentor-chat `1285378043099086852`, guild `1285378042478329867`. The bot already had Create Public Threads and Send Messages in Threads; no permission changes, reinstall or slash registration were required. No new package/service/replica. Private consistent snapshot `/data/backups/before-done-thread-1794325279929.sqlite` (schema 11, 0600) remains on the volume. Schema 12, integrity and public HTTPS health pass; all sixteen pre-existing content/config/security tables matched the snapshot after upgrade, with expected notification-render metadata changes only.

Live verification used only the existing clearly marked Team 16 request. **Done** created a green compact card in the thread with **Znovu otevřít**, then removed the original mentor-chat bot card. **To Do** returned it to mentor-chat and removed the thread copy. Read-back of the actual Discord messages confirmed green/reopen controls where appropriate, empty mention content, no Mentor role ping and completed cleanup. Restored the original **In Progress** status; that edit reused the new parent card. Notes/matrices and all other team records were preserved, including all ten 600-character test matrix answers. Discord message IDs necessarily changed; current test-card cleanup metadata was updated only in ignored 0600 `.data/discord-test-team.json`. Signed built-runtime tests separately verify a real Discord-type Reopen payload and deny stale/unauthorized buttons; no human click was impersonated.

Validation: **118 unit tests / 864 assertions**, five Chromium Discord/settings/desktop/phone scenarios, production build and isolated signed production-runtime smoke pass. Thread transfer uses copy-before-delete with durable current-message binding and cleanup; ambiguous POSTs stop for organizer review, known rejections/backoff and DELETE cleanup are bounded. Human replies stay in their original locations. See [Done thread behavior](DISCORD.md).


## Matrix visibility and clean Team 16 sample — 2026-11-10

Source **213aa69**, deployment **d97ce9f9-331f-4c21-9afb-705fa3abae44** observed **SUCCESS**; HTTPS health passes, schema stays 12. Diagnosis: SQLite and the live event API already held identical ten-answer Team 16 matrices, but an open Teams tab kept its initial route snapshot. Teams now refreshes on matrix expand/focus/manual action and every 15 seconds with a visible open matrix, preserving active/collapsed drafts, pending saves and newer revisions.

Removed TEST EXPORTU headings and numeric padding only from the exact original synthetic Team 16 fixture, replacing them with readable Czech while keeping all ten answers at **600 characters** and within 16–17 conservative print lines. Newer user responses would fail the fixture-identity guard rather than be overwritten. Private consistent backup `/data/backups/before-team16-clean-matrix-1794326010908.sqlite` remains on the volume. Notes/other teams/mentor attribution were preserved. Post-deploy actual API comparison confirms all ten clean answers match storage, with neither marker remaining.

Five targeted Chromium scenarios and the same five Safari/WebKit scenarios pass, including rich-text persistence, read-only access, collapsed/conflict drafts, Excel export, externally saved answers on expand and rejection of delayed reads after a newer save. Production build passes. A browser using **deployed assets with entirely synthetic intercepted event responses** independently verified refresh-on-expand, all ten 600-character answers, mobile fit and a downloadable XLSX. No real event workbook/data was downloaded. The regenerated ignored local example retains colored A1:E5 landscape layout; schema/infrastructure/dependencies unchanged.


## Complete live Team 16 cleanup — 2026-11-10

At the user's explicit request, removed production **Team 16 - TEST** (96173152-c894-477f-ba4c-c8da7655207d), its three notes and matrix, invitation links/flows/test audit, Discord actions/matrix sessions/notification bindings and channel mapping. The known GitHub test repository **AT-T-Hackathon-Junior-2026/test-team-invitation**, stable ID **1451904909**, was verified and deleted using an installation token scoped only to that repository. A separate read-only installation check confirmed all fifteen real numbered repositories still exist. Both current Team 16 bot cards in Done tickets were verified by author/title and deleted; read-back returns 404. No human messages or Discord channels were deleted; the user-provided team-16 channel remains unmapped. Shared mentor-chat/Done tickets and their runtime configuration remain.

Private consistent snapshot `/data/backups/before-remove-team16-1794332590455.sqlite` and a non-secret provider cleanup manifest `/data/backups/team16-removal-progress.json` remain on-volume. Historical event backups were retained. Verified no live test rows in teams, notes, team_invite_links/audit, discord_actions/matrix_flows/notifications; matrix/session/invitation capabilities no longer resolve. Public API reports exactly **15 real teams**, with **15 active real-team invitations**. Hash comparison preserved all real-team content, notes, mentors, wall data and invitation records; integrity and foreign-key checks pass. Removed ignored local Team 16 invitation metadata and its synthetic example workbook, replacing them with a non-secret removal receipt `.data/removed-team16.json`. No application code, schema or deployment was changed; production remains release 213aa69 / deployment d97ce9f9-331f-4c21-9afb-705fa3abae44.


## Real team Discord channel mappings — 2026-11-10

Linked all fifteen numbered teams to their new team-NN channels in the active Teams category through the organizer settings API (revision 5, enabled). See DISCORD.md for exact IDs and the private-channel access caveat. Team/notes/invitation/wall hashes are preserved; integrity passes. Private consistent backup: `/data/backups/before-link-team-channels-1794346593548.sqlite`. No deployment or infrastructure change.

## Additional event hostname — 2026-11-11

Added `https://att-hackathon-2026.up.railway.app` at the user's request as a second Railway service domain, ID `35d699fc-d0bf-44e9-b032-8e1c5745a227`, targeting port 1020. HTTPS landing page returned 200 and `/api/health` returned `{"status":"ok"}`. The existing `dashhack-production.up.railway.app` domain remains active and healthy. No redeployment, database changes or runtime variable changes were needed.

GitHub App base URL and registered OAuth callback remain on the existing hostname. Use that hostname for GitHub connection/student invitation flows until callbacks and browser cookie handling have been migrated and verified; OAuth initiated from the new hostname has not been validated.

## Optional organizer photos and formatted announcements — 2026-11-11

Deployment `00254b4b-8ffa-454a-8a4c-dad044212731` reached SUCCESS from a clean source-only upload of the local feature working tree. Organizer Edit post now supports bold/italic/bullets and optional photo removal/replacement. Pinned text-only cards show complete, larger text. See WALL_UPLOADS.md for schema 13 and validation/storage behavior. No existing announcement was edited or image removed automatically.

Validation: 120 unit tests / 881 assertions; two focused Chromium scenarios covering existing draft/conflict behavior and formatting, optional media, full guest-visible text and photo replacement; production build including native Sharp packaging. Windows setup now includes Node.js and Chromium; the native packaging helper handles bundled Windows libvips while preserving Linux packaging.

Pre-deploy on-volume snapshot: `/data/backups/before-rich-wall-20261111-1794431972872.sqlite`. Post-deploy schema 13, integrity ok, zero foreign-key violations; exact content fingerprints preserved across events, teams, notes, mentors, GitHub connections, wall settings, posts and media (excluding only the newly added empty rich_text column). Preserved counts: 4 events, 15 teams, 3 notes, 1 mentor, 1 GitHub connection, 2 wall-settings rows, 3 posts, 2 media attachments. New-host HTTPS health and live event login/editor controls verified; editor canceled without saving. Git changes remain local/uncommitted.


Projector follow-up 2026-11-11: deployment 284d69c6-4225-4ffd-8b05-e02abb5a67f4 SUCCESS. Pinned image/video-free announcements span the feed width and use responsive 32/28/24/20 px type based on text/line length; full content remains visible without truncation. Build and two Chromium announcement scenarios pass, including 1920x1080 and 390px layouts. Live HTTPS health passes; browser-only long-text fixture verified the deployed card at 1688px wide, 24px type and no clipping. No production content was changed; existing organizer photo remains until explicitly removed in Edit post. No schema/API change in this follow-up.

## Clickable social cards and hashtag links — 2026-11-12

Deployment `60fb7918-bc9c-4165-a20a-064e10248d19` SUCCESS. Existing renderer previously treated post text as plain text and only linked the source footer. WallPostText now safely tokenizes URLs and Unicode hashtags while retaining structured bold/italic/bullets. Source footer stretches over the card; inline links, reader button and video controls remain independently interactive. Loop-copy anchors remain outside keyboard tab order. No X requests, provider scripts, schema changes or post mutations were needed.

Validation: link-token unit test (6 assertions), production build/native packaging, direct Chromium checks against isolated built app for hashtag/source popups, URL links, escaped HTML and full-post reader. The existing live Jemmotar X card `2120603599218569529` and #atthack navigation both verified. External X navigation was intercepted only in the verification browser; no production state changed. The broader Windows Playwright runs encountered dev-server restart/login timeouts and production HTTP secure-cookie fixture failures, so those runs are not claimed passing; direct built-app and live checks supplied navigation evidence.

Source finalization — 2026-11-12: complete unit suite passes (121 tests, 887 assertions). Production build and direct isolated/live Chromium navigation checks passed as recorded above. The deployed wall editor, full-width projector announcements, link renderer, Windows build/test portability fixes and deployment notes are being committed together on feat_alby_design. No provider polling, production data edits or additional deployment is required for this source finalization.

## Captapi provider outage handling and source-footer removal — 2026-11-12

Source 2f461e2 deployed successfully as 48c6f836-d5f0-44c9-bec9-7db4c078172e. Public health and the actual Jemmotar card/hashtag navigation pass. The added visible source footer is removed; keyboard/card navigation remains. Caption URLs are not fabricated or removed speculatively.

Captapi's free request history confirmed repeated Instagram hashtag-search HTTP 502/login_wall responses at 0 credits, including the organizer-reported request 28d0bb8d-2c54-4bcf-a55e-d820af7d021a. No diagnostic hashtag search was forced and the key stayed inside Railway. A subsequent existing scheduled attempt on the new deployment confirmed the same upstream login_wall, request cbcc1fac-45f8-4b85-884c-4818ef0151b1; the provider marked it persistent. New code recorded the precise explanation and deferred the next automatic attempt to 2026-11-12T09:05:40.783Z (10:05 CET). Existing polling enable/queries/posts are preserved. Provider access remains blocked; do not claim live Instagram recovery until a real scheduled success is observed.

Validation: 123 unit tests / 903 assertions, build/native packaging, direct Chromium built-app and live card-navigation checks. Error parsing, Retry-After, persistence across restart, no secret-body logging and mocked successful recovery are covered. No schema or infrastructure change.


Modal drag fix — 2026-11-12: source dce1d2c, deployment 08c86722-9e0e-4eb3-8a0c-f7702ac77105 SUCCESS. Shared DialogShell now requires a primary pointer gesture beginning/ending on the backdrop with <=8px movement before dismissing. Selection drags beginning inside the editor preserve modal/draft even if released outside. Production build and isolated Chromium checks pass for drag retention, genuine backdrop click, Escape and Cancel. Live organizer modal verified with a temporary unsaved draft and canceled; no post saved, health ok. No schema, settings, collector or stored-content changes.

## Rebuilt event QR poster — 2026-11-12

At the user's request, generated one combined image and published exactly one approved/pinned organizer wall post: `996b6347-53cb-4f73-ba28-9d15d6fc7147`. The three codes cover the original event website, printed Discord invite and Wi-Fi settings; original link/SSID/password text remains below each code and in the caption. QR patterns use black/white modules, high error correction, six-module white borders and no center logos. All existing posts were retained; no application deployment was required.

Shareable PNG, vector SVG, printable landscape A4 PDF, actual published WebP, receipts and verification records are stored in ignored `.data/share/atthack-2026-qrs/`. Do not commit these artifacts or repeat their Wi-Fi credential in source documentation. Original full-resolution files are separate from the prepared 1920px upload.

Independent jsQR decoding passed for every code in individual PNG/WebP images, combined compressed images at 1920/1280/900/640/390px width, and the actual downloaded public wall image. Discord's public invite API confirms the original invite is valid, non-expiring and targets the event's established guild; no server join or message was sent. iPhone-sized browser verified the pinned post/full reader and preserved caption. The event website target is correct and readable through web retrieval, but direct automated mobile browser navigation returned 455 Blocked, so physical phone navigation is not claimed. Actual on-site Wi-Fi association/password acceptance cannot be tested remotely. No collectors were enabled or queried.

## Compact mentoring cards and explicit note saves — 2026-11-12

Source `a6a3a08` on `feat_alby_design` is pushed and deployed as `39908e0c-438e-411b-a524-c02c208f43f0` (SUCCESS). Clean source-only archive SHA-256: `b3af1fe5f7402887a9d7b876b707dcc14537bfb399130244ae8d22acfe6ef8e5`. Unrelated staged student-project submodules, Docker ignore edits and mentoring review were excluded from the commit and deployment. See COMPACT_NOTES.md for the layout and acknowledgement behavior.

Validation: 131 unit tests / 991 assertions, production build/native image packaging and 17 distinct Chromium scenarios. Live HTTPS health passes on both domains. Browser verification confirms four desktop Teams columns, two Kanban cards per status row, prominent team names, explicit Save controls, 44px phone controls and no phone overflow or browser errors. Editable live UI was checked using browser-only event responses; no production login or write was sent.

Consistent private on-volume snapshot: `/data/backups/before-compact-notes-20261112-1794484709181.sqlite`. Post-deploy schema remains 15, integrity ok, zero foreign-key violations. Both X and Instagram were ON before deployment and remain ON; no collector settings were changed. All table fingerprints except events/teams/notes match. Those three differences are one concurrently added note, its team's revision advancing from 1 to 2 and the owning event's updated_at; no existing note changed or disappeared, and team/event counts remain 15/4. The live addition was preserved.

## Public wall cogwheel and header-sized hashtag — 2026-11-12

Source `e24060f` is pushed on `feat_alby_design`, deployed as `dd3b2f4e-bc0e-4233-92ca-5a434648312e` (SUCCESS). Clean source archive SHA-256: `0c68cc95dbc5ac21a2d571e177f7aa355194ff23be472e78904d9b6e1e3adf6b`. Every visitor can open and use display controls; guest speed/layout changes stay on their screen until reload and survive feed refresh. Existing authenticated shared saves and all server authorization remain unchanged. #atthack now matches the title's responsive font size and weight.

Validation: production build/native packaging; six focused Chromium scenarios pass together (guest local controls/refresh/QR, responsive hashtag, shared-speed persistence and write denial, matching-event collector permissions, cross-tab 24-hour login/logout and phone wall/upload/moderation). Live anonymous Chromium confirms a usable cogwheel, local speed/layout changes, equal title/hashtag sizes of 36px desktop, 24px phone and 20px short landscape, no overflow of the hashtag and no browser errors. Both hostnames pass HTTPS health. Live checks sent zero production writes.

Pre-deploy snapshot: `/data/backups/before-wall-public-controls-20261112-1794488731646.sqlite`. Schema 15, integrity ok, zero foreign-key violations. X and Instagram remain ON; wall settings JSON is unchanged, with only last_poll_at advancing. Active event traffic changed note text/creator attribution, added two notes, updated team revisions/matrices, added Discord action/matrix flows and invitation audit/temporary flows. Events changed only updated_at; no event/team/note rows were removed. Other table fingerprints match. No schema, dependency, infrastructure or server-code changes; concurrent work and live activity were preserved.
