#!/usr/bin/env bash
# Builds the hardened production image while sourcing secrets from a managed env file.
set -euo pipefail

ENV_FILE="config/production/.env.production"
IMAGE_TAG="polyharmony/app:latest"
EXTRA_ARGS=()

usage() {
  cat <<'USAGE'
Usage: build-production-image.sh [--env-file path] [--tag name] [additional docker build args]

Examples:
  build-production-image.sh --tag polyharmony/app:v1
  build-production-image.sh --env-file ../secrets/prod.env --no-cache

By default the script reads config/production/.env.production (ignored by git).
Create it from config/production/.env.production.example and provide real values.
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
  echo "[build-production-image] Missing env file: $ENV_FILE" >&2
  echo "Create it from config/production/.env.production.example and fill in real credentials." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -o allexport
source "$ENV_FILE"
set +o allexport

required_vars=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY ENCRYPTION_KEY)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "[build-production-image] Required variable $var is missing in $ENV_FILE" >&2
    exit 1
  fi
done

if [[ ${#ENCRYPTION_KEY} -ne 64 ]]; then
  echo "[build-production-image] ENCRYPTION_KEY must be 64 characters; current length is ${#ENCRYPTION_KEY}" >&2
  exit 1
fi

echo "Building production image '$IMAGE_TAG' using env file '$ENV_FILE'"

docker build \
  -f Dockerfile.production \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  -t "$IMAGE_TAG" \
  "${EXTRA_ARGS[@]}" \
  .
