#!/usr/bin/env bash
# Runs the production container with the same env file used at build time.
set -euo pipefail

ENV_FILE="config/production/.env.production"
IMAGE_TAG="polyharmony/app:latest"
CONTAINER_NAME="polyharmony-production"
EXTRA_ARGS=()

usage() {
  cat <<'USAGE'
Usage: run-production-container.sh [--env-file path] [--tag name] [--name container] [additional docker run args]

Examples:
  run-production-container.sh --tag polyharmony/app:v1 --name calendar-prod -p 80:3000
  run-production-container.sh --env-file ../secrets/prod.env --tag registry.example.com/calendar:latest

The env file must contain the same credentials used at build time.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --tag|-t)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --name)
      CONTAINER_NAME="$2"
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

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[run-production-container] Missing env file: $ENV_FILE" >&2
  echo "Create it from config/production/.env.production.example and fill in real credentials." >&2
  exit 1
fi

echo "Starting container '$CONTAINER_NAME' from image '$IMAGE_TAG' using env file '$ENV_FILE'"

docker run \
  --env-file "$ENV_FILE" \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3000:3000 \
  "${EXTRA_ARGS[@]}" \
  "$IMAGE_TAG"
