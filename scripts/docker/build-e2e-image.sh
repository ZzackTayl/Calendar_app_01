#!/usr/bin/env bash
# Builds the Playwright E2E image with selectable browsers.
set -euo pipefail

BROWSERS="chromium firefox webkit"
IMAGE_TAG="polyharmony/e2e:latest"
EXTRA_ARGS=()

usage() {
  cat <<'USAGE'
Usage: build-e2e-image.sh [--browsers "list"] [--tag name] [additional docker build args]

Examples:
  build-e2e-image.sh --tag polyharmony/e2e:ci
  build-e2e-image.sh --browsers "chromium" --tag polyharmony/e2e:chromium
  build-e2e-image.sh --browsers none --no-cache

Specify browsers as a space-separated list (chromium firefox webkit). Use "none" to skip downloading browsers when
reusing a cached base image. The default installs all browsers for full coverage.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --browsers)
      BROWSERS="$2"
      shift 2
      ;;
    --tag|-t)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "Building E2E image '$IMAGE_TAG' (browsers: $BROWSERS)"

docker build \
  -f Dockerfile.e2e \
  --build-arg PLAYWRIGHT_INSTALL_BROWSERS="$BROWSERS" \
  -t "$IMAGE_TAG" \
  "${EXTRA_ARGS[@]}" \
  .
