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

Only one public submission may read/process its body at a time; busy clients get a retry message, with no in-memory job queue. Body reading stops at the byte cap even without Content-Length and has a 20-second deadline. Admission is bounded to 5 attempts/browser/minute, 60/network/minute (shared school Wi-Fi), and 90/service/minute. A short-lived HttpOnly cookie identifies a browser; rotating it does not bypass network/global limits. Buckets contain hashed keys, expire and are capped at 1024 entries. Railway's edge-supplied X-Real-IP is used only in a Railway environment; arbitrary X-Forwarded-For values are ignored. Cross-site browser submissions are rejected. Existing JSON body-status error semantics are retained; rate failures include Retry-After.

These controls bound application work and storage; they are not an edge-level DDoS guarantee. Limits reset on app restart, and an attacker sharing the event Wi-Fi can exhaust that network's allowance temporarily.

## Storage and deployments

- 24 MiB per event and 32 MiB across **all** wall attachments, including pending/rejected/hidden items. The check and insert share a SQLite transaction.
- At least 16 MiB of actual filesystem free space is reserved, plus three times incoming stored bytes for page/WAL/checkpoint headroom. New wall posts also stop when the projected database reaches 64 MiB. Deletion/moderation remains available when uploads pause. A global 5,000-post cap includes archived identifiers; normal event active-post cap remains 1,000.
- Moderators see event/shared usage and actual volume free/reserved space. Rejecting or hiding alone does not free attachment storage; deleting releases BLOB quota and SQLite pages for reuse. File sizes may not shrink immediately. Do not VACUUM a busy production database just to make the file look smaller.
- Before and after deployment, inspect the exact DashHack volume. `NUXT_SQLITE_PATH=/data/dashhack.sqlite bun scripts/check-wall-storage.js` is a read-only check included in the image. It reports database/WAL sizes, backup usage, physical free space and budgets. Leave the web app running if uploads are paused; free space deliberately and recheck. Backups on the same volume count against physical free space and need enough headroom before `VACUUM INTO`; never prune or restore them implicitly.
- No schema migration, service or background queue. The existing Debian slim runtime remains. Sharp adds roughly 19 MiB of native runtime files; this is the cost of independently validating/re-encoding hostile images. `bun run build` runs `scripts/package-wall-images.js` after Nuxt because its tracer misses Sharp's ESM/native runtime. Only the current build architecture is copied, with no source tree or alternate-platform binary packages. Validate an isolated output, not an output accidentally resolving the workspace's node_modules.

## Validation

44 unit tests and all 39 browser scenarios against an isolated HTTPS production build pass, covering orientation, WebP bounds/metadata removal, fake/excess-pixel/oversized/video inputs, rate/concurrency limits and atomic shared/event/low-space guards. Browser coverage exercises larger phone photo selection, real Chrome clipboard reads, paste events, removal, invalid selection, server conversion, video/field/origin rejection, quota visibility and retry hints.

The Nuxt development proxy stalls raw multi-megabyte multipart requests on this Bun version; normal phone uploads arrive already compressed and pass. The extra production-only oversized-body case is enabled with `PLAYWRIGHT_LARGE_UPLOADS=1` against an isolated production server using HTTPS. The default dev suite skips that one case; the production suite runs all four upload cases, including a 1.5 MiB raw photo and pre-parse oversize rejection. A separate chunked 9 MiB request verifies the stream byte cap without Content-Length. Do not replace this production check with browser-only validation.

WebKit installation is unsupported on this Ubuntu 26.04 host. Mobile Chrome/picker/clipboard checks passed; physical iPhone Safari and HEIC clipboard behavior still need an on-device check.
