# Minimum-resource stack proposal

**Follow-up implemented:** the user selected a focused SQLite migration while retaining Nuxt/Vue. See [the migration report](SQLITE_MIGRATION.md) for the current implementation and final measurements. The Go options and temporary Nuxt experiments below are the earlier proposal, not the deployed stack.

2026-11-07. Goal: minimize the complete deployed system's resident memory, disk/image size, build cost, and browser download. Measurements below are local experiments, not Railway capacity guarantees. Application source and remote infrastructure were unchanged during this investigation.

## Recommendation

For a practical minimum, use **one Go process + SQLite + compiled static assets**, deployed as one Railway service with one persistent volume. Keep the existing Vue components initially, built by Vite instead of Nuxt; replace ApexCharts with a small SVG activity chart. Vue and Tailwind then run only in the browser/build pipeline. The Go process serves files and JSON APIs; SQLite runs inside that process. This removes both the Nuxt server runtime and the separate MongoDB service while retaining most design work.

If minimizing browser payload and runtime dependencies takes priority over retaining Vue, use Go `net/http` + `html/template`, compiled Tailwind CSS, inline SVG/icons, and small browser JavaScript modules. This is the smallest practical architecture proposed here; it is not a proven absolute minimum among all possible implementations. It needs a larger UI rewrite. Server-rendered HTML in Go is compatible with the resource goal; the overhead to remove is the existing Node/Bun/Nuxt rendering machinery, not rendering HTML itself.

Use direct parameterized SQL and migrations, without an ORM. Use the standard HTTP server rather than a separate Nginx process, Redis, worker service, or API framework. A small, maintained SQLite driver is the main database dependency; compare CGO/static versus pure-Go builds on the actual target before selecting by binary-size claims. Keep password hashing and session authorization intact.

No Go implementation was built here, so its RAM/image size is unmeasured. A **64 MiB whole-container limit** is a useful first acceptance target for the Go version, followed by attempts at 48/32 MiB if the realistic workload passes. These are test targets, not predictions or promises. SQLite fits the expected single-server, moderate-write dashboard model; [SQLite's own guidance](https://sqlite.org/whentouse.html) describes that use case.

## What was measured

| Metric | Original Nuxt/Mongo app | Temporary lean Nuxt/Mongo app |
| --- | --- | --- |
| Server build files, logical size | 24.51 MB | 5.53 MB |
| Public files, logical size | 1.37 MB | 1.05 MB |
| Initial dashboard JS downloaded, decoded | 889.7 KB | 281.1 KB |
| Dashboard JS after chart expansion, decoded | 889.7 KB | 858.2 KB |
| All emitted client JS, raw | 905.3 KB | 865.7 KB |
| All emitted client JS, separately gzip-compressed | 280.7 KB | 264.3 KB |
| App RSS after small database-read workload, normal Bun | 154.4–190.7 MiB | 132.0–145.6 MiB |
| App RSS after same workload, Bun `--smol` | 154.8–157.1 MiB | 136.7–139.8 MiB |

MB/KB use decimal bytes; MiB is 1024² bytes. File totals exclude the Bun executable, base image, and database files. They are **not Docker image sizes**. Browser numbers are decoded response-body sizes, not actual compressed network transfer. The largest original client chunk is 821 KB raw; the chart is a major contributor, moved into a separate 577 KB chunk by the experiment.

MongoDB 7's container used **76.44 MiB** at one idle snapshot with an almost empty local database. That is additional to app RSS, but Docker's memory accounting and process RSS are different metrics and should not be treated as an exact summed Railway limit. MongoDB had no container memory cap. WiredTiger cache size is a capacity setting, not a guaranteed resident-memory floor; MongoDB also uses memory beyond its storage-engine cache. See [MongoDB memory documentation](https://www.mongodb.com/docs/manual/core/wiredtiger/).

The installed development `node_modules` occupies approximately 358 MB. It is build/development storage, not the deployed server footprint: the existing Dockerfile already copies only the production output.

## Current-stack polish: measured alternative

The isolated `/tmp/dashhack-lean` experiment made these changes together:

1. Removed `@nuxtjs/seo`, `@nuxtjs/mdc`, and `nuxt-color-picker` from the Nuxt modules list. Removed `defineOgImageComponent` calls. The repository uses ordinary text notes and native color inputs; no MDC/color-picker component usage was found.
2. Set `ssr: false` and disabled devtools. The dashboard's team body was already client-only. This makes the landing page and shell client-rendered too, so preserve a useful loading state and assess public-link requirements before adopting it.
3. Removed global ApexCharts registration and registered an async chart component inside the team card. Charts load when expanded.
4. Preserved Public Sans, the existing CSS, icons, MongoDB/Mongoose, APIs, and Vue UI for a useful comparison.

Both production builds succeeded. A browser check created a disposable team, opened the dashboard, expanded a mocked activity graph, and navigated to Settings. Both versions rendered those views with no page errors. This was not full feature/security/concurrency acceptance. Source copies and production processes were isolated from the live dev server. Disposable benchmark events/sessions were removed.

The combined changes cut server-file bytes by **77%** and initial dashboard JS by **68%**. Total client JS fell by only **4%**: lazy loading defers the chart library; it does not eliminate it. To minimize the complete download, replace ApexCharts. First-party SVG suffices for the current two 24-point activity series; implement useful labels/tooltips and keyboard/accessibility behavior rather than reproducing its unused charting features.

Additional focused polish:

- Use system fonts if preserving Public Sans is optional. Use a small local SVG icon set rather than runtime icon fetching and extra icon machinery.
- Bound the Mongoose pool if retaining MongoDB, and serialize note saves. A default pool's configured maximum is not an allocation of that many live connections; measure actual behavior before claiming savings.
- Return only the event/team/note fields needed by each view; paginate large collections instead of loading every team's complete notes into a shared state blob.
- Stop repeated event reads from settings cards. Keep GitHub requests bounded, cache compact series with a short TTL and capped entry count, and reuse HTTP connections.
- Remove build source maps from release artifacts where supported, pin a tested Bun image, use frozen installs, and fix Docker-context exclusions. Measure the resulting image separately.
- Use one web process. Disable production debug instrumentation and avoid adding observability agents/background workers for this small deployment.
- Test `--smol` rather than assuming it helps: these short samples overlap normal Bun's results. [Bun documents](https://bun.sh/docs/runtime) that the flag trades more frequent collection for slower heap growth; it does not impose a hard process-memory cap.

This is the lowest-effort path, but keeping both Bun/Nuxt and MongoDB leaves the larger architecture costs in place.

## Stack choices

| Choice | Reuse | Main remaining cost | Fit |
| --- | --- | --- | --- |
| Lean Nuxt + MongoDB | Almost all code | JS server runtime and separate database | Quick measured reduction |
| Lean Nuxt + SQLite | Vue UI and most API structure | Nuxt/Bun server runtime | Intermediate migration; removes DB service |
| Vite/Vue + small Bun server + `bun:sqlite` | Most Vue UI and JavaScript skills | Bun runtime | Simple all-JS compromise |
| **Vite/Vue + Go + SQLite** | Most Vue UI | Browser Vue runtime | Recommended staged migration |
| **Go templates + SQLite + small JS/SVG** | Styles, product behavior, assets | UI rewrite | Recommended final minimum-payload option |

Bun includes a SQLite driver, so the all-JS alternative avoids a separate database driver/server; see [Bun SQLite](https://bun.sh/docs/runtime/sqlite). No Bun/SQLite or Go variant was benchmarked here. A Rust/SQLite server is another credible low-memory candidate, but rewriting into Rust solely to chase unmeasured differences is not justified before testing the Go design. The major first savings come from eliminating whole services and unused features.

## Migration plan

1. Keep the existing API contract and visible UI behavior as the acceptance baseline. First add reliable tests for event creation/login, public reads, ownership, settings targets, team IDs, notes, backup, and mocked GitHub errors; repair the known broken browser setup/locators. Carry the recorded authorization/HTML-injection fixes into the implementation.
2. Introduce relational `events`, `teams`, `notes`, and `sessions` tables with stable IDs, foreign keys, indexes, explicit session expiry, and transactions. Add a compact optional GitHub-series cache table; avoid storing raw commit responses. Replace whole-array note writes with atomic operations.
3. Implement the Go API and static file server alongside the current source until parity passes. Preserve password hashes when importing and verify login compatibility. Invalidate imported sessions deliberately. Keep event tokens server-side.
4. Move existing Vue SFCs to Vite. Replace Nuxt-specific auto-imports/state/routing, cookie helpers, runtime config, layout/meta helpers, and fetch behavior with explicit equivalents. The Vue templates/styles remain reusable, but this is not a zero-change frontend migration.
5. Replace ApexCharts and runtime asset fetching. Retain only the selected chart interactions and local assets. If final browser minimum is essential, migrate screens incrementally to Go templates and small JS modules.
6. Deploy one web replica with SQLite on a Railway volume mounted at `/data`, for example `/data/dashhack.sqlite`. Keep the database, WAL, and shared-memory files together. Use WAL, explicit foreign keys, a busy timeout, a small bounded connection count, and a deliberately bounded page cache. Keep transactions short. SQLite allows one writer at a time; [WAL documentation](https://sqlite.org/wal.html) explains the concurrency and filesystem constraints. Verify the volume supports the required local locking semantics; don't share the database over a network filesystem.
7. Back up using SQLite's supported backup mechanism and test restoration. Avoid copying only the main live database file while WAL is active. Build assets during the image build; the runtime image contains the executable, required libraries/CA certificates, and compiled assets.

The Railway project currently has **no database or deployed app**, so there is no production MongoDB data migration. Only local data needs an import if the owner wants to preserve it. The MongoDB provisioning recipe in `RAILWAY.md` applies only if retaining the original persistence design; delay provisioning it while choosing this stack.

Single-instance SQLite trades multi-replica write scalability and some deployment flexibility for lower resource usage. If the product later needs multiple active writers across machines or high availability, reassess storage rather than forcing shared-volume SQLite into that architecture. Railway volume behavior should be verified against [current volume documentation](https://docs.railway.com/volumes).

## Proving the minimum

The initial test used Bun 1.3.2, Linux x86-64, local MongoDB 7, two fresh processes per variant/mode, an initial landing request, 20 additional landing requests, and 100 missing-event database reads at concurrency 5. It sampled process `VmRSS`/`VmHWM` after a short settling period. It excludes password hashing, real GitHub calls, large event payloads, long-term growth, and hard container limits. Variance is substantial; do not extrapolate user capacity from this tiny read workload.

Next measure whole-container memory/CPU under actual cgroup limits, including page cache, native SQLite memory, password hashing, GitHub responses, and browser activity. Try 256/192/128/96/64/48/32 MiB where the implementation can start; select the lowest passing limit with usable headroom, not merely the lowest limit that boots. Compare normal and memory-tuned runtime configurations under the same workload. A Go runtime memory setting is a soft managed-memory target and excludes some native allocations; it is not a whole-container cap ([Go GC guide](https://go.dev/doc/gc-guide)).

Use representative fixtures such as 10/50/200 teams with 10 notes each, 1/5/20 concurrent viewers, bounded concurrent edits, and a login burst. Include a sustained soak, persistence across restart, and recovery after forced termination. Report peak cgroup memory, request latency, errors, CPU, database growth, image size, and browser compressed transfer. Choose explicit acceptable latency/error thresholds before declaring a limit usable. Build-time peak memory is separate from runtime memory and must also be recorded.

Raw local measurements: [build sizes](measurements/build-sizes-2026-11-07.json), [original runtime](measurements/runtime-baseline-2026-11-07.json), [lean runtime](measurements/runtime-lean-2026-11-07.json), and [browser checks](measurements/browser-2026-11-07.json). Temporary test scripts and logs remain under `/tmp/dashhack-*`; they are exploratory probes rather than a maintained benchmark suite.
