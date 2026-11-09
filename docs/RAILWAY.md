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
| Latest verified deployment | `f9c9680e-406c-4ab9-a1df-c501b502a5e6` — SUCCESS, mobile polish / schema 7 |
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
