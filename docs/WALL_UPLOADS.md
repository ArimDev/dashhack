# Photo-only wall uploads

Public Share a moment accepts text and one photo. Videos are rejected by both the browser and API, including direct multipart requests. Existing collected X media and old attachments are not deleted.

## Phone flow

- The native `image/*` picker keeps Photo Library and Camera available. No forced `capture` attribute, so users can select existing photos.
- Photos up to 25 MiB are accepted locally, oriented by the browser, resized inside 1920×1920 and compressed to at most 1 MiB before upload. Harder images retry lower quality/1280 px. Browsers without WebP canvas encoding send JPEG; the server still stores WebP.
- Paste photo uses the browser clipboard API after a tap. Pasting an image into the story/form and dropping a photo also work. Plain text paste stays normal. If clipboard access is unavailable/denied, guidance points to Photo Library or normal Paste. A preview, processed size, remove action and preparing state precede submission; duplicate submits are disabled.
- HEIC depends on the browser's native decoder/Photo Library conversion. Unsupported originals get a JPEG/PNG/screenshot suggestion; no large HEIC/WASM conversion dependency was added.
- Canvas draws use the browser's EXIF orientation support. Server auto-orientation and metadata stripping apply independently.

## Server enforcement

All public attachments are signature-checked and decoded using pinned Sharp 0.35.5, resized to at most 1920 px and encoded as WebP before the SQLite transaction. EXIF/GPS/ICC metadata is stripped. Animation becomes a first-frame still. Server input is capped at 2 MiB plus 32 KiB multipart overhead; normalized output at 1 MiB. Direct API callers cannot skip conversion, submit video/SVG, supply external media URLs or add unknown/duplicate fields. A 4-million-pixel decode limit and eight-second image-processing timeout protect the native decoder. Normal phone images are resized locally first, including higher-resolution originals supported by that browser.

Nitro uses the `node-server` streaming entry, still executed by Bun for SQLite. The stock `bun` preset eagerly calls `req.arrayBuffer()` before dispatch, which bypasses handler-level size/admission/time guards; do not restore it without equivalent entry-level streaming protection. Only one public submission may read/process its body at a time; busy clients get a retry message, with no in-memory job queue. Body reading stops at the byte cap even without Content-Length and has a 20-second deadline. Admission is bounded to 5 attempts/browser/minute, 60/network/minute (shared school Wi-Fi), and 90/service/minute. A short-lived HttpOnly cookie identifies a browser; rotating it does not bypass network/global limits. Buckets contain hashed keys, expire and are capped at 1024 entries. Railway's edge-supplied X-Real-IP is used only in a Railway environment; arbitrary X-Forwarded-For values are ignored. Cross-site browser submissions are rejected. Existing JSON body-status error semantics are retained; rate failures include Retry-After.

These controls bound application work and storage; they are not an edge-level DDoS guarantee. Limits reset on app restart, and an attacker sharing the event Wi-Fi can exhaust that network's allowance temporarily.

## Storage and deployments

- Prepared 2 GiB volume profile: 512 MiB per event and 640 MiB across **all** wall attachments, including pending/rejected/hidden items. The check and insert share a SQLite transaction.
- At least 128 MiB of actual filesystem free space is reserved, plus three times incoming stored bytes for page/WAL/checkpoint headroom. New wall posts also stop when the projected database reaches 768 MiB. Deletion/moderation remains available when uploads pause. A global 5,000-post cap includes archived identifiers; normal event active-post cap remains 1,000.
- Moderators see event/shared usage and actual volume free/reserved space. Rejecting or hiding alone does not free attachment storage; deleting releases BLOB quota and SQLite pages for reuse. File sizes may not shrink immediately. Do not VACUUM a busy production database just to make the file look smaller.
- Before and after deployment, inspect the exact DashHack volume. `NUXT_SQLITE_PATH=/data/dashhack.sqlite bun scripts/check-wall-storage.js` is a read-only check included in the image. It reports database/WAL sizes, backup usage, physical free space and budgets. Leave the web app running if uploads are paused; free space deliberately and recheck. Backups on the same volume count against physical free space and need enough headroom before `VACUUM INTO`; never prune or restore them implicitly.
- No schema migration, service or background queue. The existing Debian slim runtime remains. Sharp adds roughly 19 MiB of native runtime files; this is the cost of independently validating/re-encoding hostile images. `bun run build` runs `scripts/package-wall-images.js` after Nuxt because its tracer misses Sharp's ESM/native runtime. Only the current build architecture is copied, with no source tree or alternate-platform binary packages. Validate an isolated output, not an output accidentally resolving the workspace's node_modules.

The larger profile must not be deployed before the existing Railway volume has been expanded to 2 GiB and verified: the 128 MiB reserve would intentionally pause submissions on the old 128 MB volume. A 512 MiB event budget fits 512 maximum-size 1 MiB photos or roughly 1,000 photos at 500 KiB each, subject to the 1,000 active-post event cap. Text-only posts share that post cap. These are event/global storage limits, not per-device allowances. Keep the unused volume space for a full SQLite snapshot, page/WAL overhead and free-space reserve.

Railway bills used volume storage at $0.15/GB-month, prorated over time (filesystem metadata also counts), rather than charging the full provisioned ceiling. Fully using 2 GB costs about $0.30/month in storage alone. Volumes can grow but cannot shrink in place. After the event, export and verify the entire database before deciding whether to remove the app/volume: this volume contains all events, credentials and notes, not just wall photos. See [Railway pricing](https://docs.railway.com/pricing) and [volume reference](https://docs.railway.com/volumes/reference).

## Validation

47 unit tests and all 40 browser scenarios against an isolated HTTPS production build pass, covering orientation, WebP bounds/metadata removal, fake/excess-pixel/oversized/video inputs, rate/concurrency limits and atomic shared/event/low-space guards. Browser coverage exercises larger phone photo selection, real Chrome clipboard reads, paste events, removal, invalid selection, server conversion, video/field/origin rejection, quota visibility and retry hints.

The Nuxt development proxy stalls raw multi-megabyte multipart requests on this Bun version; normal phone uploads arrive already compressed and pass. The extra production-only oversized-body and stalled-body cases are enabled with `PLAYWRIGHT_LARGE_UPLOADS=1` against an isolated production server using HTTPS. The default dev suite skips those two cases; the production suite runs all five upload cases, including a 1.5 MiB raw photo and pre-parse oversize rejection. A separate chunked 9 MiB request verifies the stream byte cap without Content-Length. A real incomplete request verifies early admission, responsive health during the stall, concurrent rejection, 408 after 20 seconds, and successful recovery. Do not replace this production check with browser-only validation.

WebKit runs through the supported, version-matched test container on this Ubuntu 26.04 host; see [WEBKIT_TESTING.md](WEBKIT_TESTING.md). Desktop Safari and iPhone-emulated projects cover the browser flows; physical iPhone Safari, Photo Library and HEIC clipboard behavior still need an on-device check.


Final deployed source: `8a54f9e`, Railway `e67eccf7-4495-45f6-b7b0-117d441b329c` (**SUCCESS**). Live preview/video rejection/storage usage and unchanged production content fingerprints were verified; see [deployment record](RAILWAY.md#bounded-photo-only-wall-uploads--2026-11-09).

## Capacity profile preparation — 2026-11-09

Raised media budgets, database guard and physical reserve together; unit tests inject small internal limits to exercise quota boundaries without allocating hundreds of MiB. The deployment checker reports the database guard as well as filesystem/media usage. Validation: 48 unit tests (279 assertions), production build and six targeted desktop/iPhone WebKit upload cases pass; four production-only cases are intentionally skipped in the development-server run. Production expansion/deployment is pending the dashboard-only resize; the last verified live release remains the earlier release above.
