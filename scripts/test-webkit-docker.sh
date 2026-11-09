#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_root"
playwright_version="$(node -p 'require("@playwright/test/package.json").version')"
test_image="dashhack-webkit-tests:$playwright_version"
docker build --file tests/Dockerfile.webkit --build-arg "PLAYWRIGHT_VERSION=$playwright_version" --tag "$test_image" .
# One ephemeral container, no published port or Railway access. Keep artifacts owned by the host user.
docker run --rm --init --ipc=host --user "$(id -u):$(id -g)" \
  --volume "$project_root:/work" --workdir /work "$test_image" \
  node node_modules/@playwright/test/cli.js test --project=webkit --project=webkit-iphone "$@"
