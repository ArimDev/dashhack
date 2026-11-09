# WebKit / Safari-style browser checks

The Playwright config includes `webkit` (Desktop Safari device settings, all browser scenarios) and `webkit-iphone` (iPhone 13 settings, mobile and wall-upload scenarios). Chromium remains the default `bun run test:e2e` command, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` applies only to Chromium. One worker keeps browser/server memory bounded during tests.

## This Ubuntu 26.04 workstation

Playwright 1.56.1 has no Ubuntu 26.04 WebKit build. Its Ubuntu 24.04 fallback downloads, but this host lacks matching ICU/media/font libraries. Do not replace the host's system libraries or fake ABI symlinks.

Run:

```sh
bun run test:e2e:webkit:docker
```

The wrapper builds `tests/Dockerfile.webkit` from the official Playwright image matching the installed package version, adds the pinned Bun 1.3.2 executable, and runs both WebKit projects. The supported Ubuntu environment contains the browser's native dependencies. The container runs as the host UID/GID, mounts this workspace at `/work`, starts its own test Nuxt server, publishes no ports and is removed afterward. SQLite test data and failure artifacts stay in the existing ignored `.data/` and `test-results/` folders. No production/Railway credentials or CLI operations are used.

The first run downloads a large development-only browser image; later runs reuse Docker layers. This adds nothing to the Railway image, persistent volume, production dependencies or app RAM. It needs the current `bun install --frozen-lockfile` development installation on the host. Do not run a separate host dev/build against the same generated `src/.nuxt` directory at the same time.

Target just uploads:

```sh
bun run test:e2e:webkit:docker tests/e2e/wall-uploads.spec.ts
```

## A supported native development machine / CI

```sh
bunx playwright install --with-deps webkit
bun run test:e2e:webkit
```

`bun run test:e2e:all` selects Chromium and both WebKit projects; install all required browser binaries first. Production-only raw-body/runtime abuse tests still require the isolated production server and `PLAYWRIGHT_LARGE_UPLOADS=1`, as described in [WALL_UPLOADS.md](WALL_UPLOADS.md). They intentionally skip on the normal development server.

## What this proves

Desktop WebKit covers existing event/team/mentor/matrix/GitHub UI flows and public/moderation walls. The iPhone project covers all narrow layouts, navigation/dialogs, rich text, note controls, wall settings, photo selection/compression/preview/removal and image paste events. The upload test keeps real permission-granted clipboard read/write in Chromium; WebKit instead verifies permission-denied guidance and the image paste event path. It does not pretend WebKit supports Chromium's clipboard permission automation.

Linux WebKit plus device emulation does not exercise the physical iPhone Photo Library/Camera chooser, iOS paste permission sheet or Apple HEIC decoder. Keep those as an on-device acceptance check. Playwright also explains [how its WebKit builds differ from Safari](https://playwright.dev/docs/browsers#webkit).


## Verified run — 2026-11-09

The Docker wrapper completed both profiles: **48 passed, 4 intentionally skipped** (the two production-runtime abuse cases in each profile), with one worker. Desktop WebKit passed all 38 normal browser scenarios; the iPhone profile passed all 10 normal mobile/upload scenarios. No app behavior change was needed. Production remains on the existing Railway release; this change contains only development tooling, test coverage and documentation.
