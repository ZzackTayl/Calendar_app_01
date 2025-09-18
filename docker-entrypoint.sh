#!/bin/sh
set -e

# Production Security Entrypoint for PolyHarmony Calendar
# Validates environment and enforces security policies before startup

echo "🔒 Production Security Validation Starting..."

# Security: Validate critical environment variables
if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ CRITICAL: ENCRYPTION_KEY is not set"
    exit 1
fi

if [ ${#ENCRYPTION_KEY} -ne 64 ]; then
    echo "❌ CRITICAL: ENCRYPTION_KEY must be 64 characters"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set"
    exit 1
fi

# Security: Ensure HTTPS in production
if [ "$NODE_ENV" = "production" ]; then
    case "$NEXT_PUBLIC_SUPABASE_URL" in
        https://*)
            echo "✅ Supabase URL uses HTTPS"
            ;;
        *)
            echo "❌ CRITICAL: Supabase URL must use HTTPS in production"
            exit 1
            ;;
    esac
fi

# Security: Check for dangerous environment variables
if [ "$NEXT_PUBLIC_DEV_AUTH_BYPASS" = "true" ]; then
    echo "❌ CRITICAL: Authentication bypass is enabled"
    exit 1
fi

if [ "$NODE_ENV" = "production" ] && [ "$ENABLE_DEMO_MODE" = "true" ]; then
    echo "❌ CRITICAL: Demo mode cannot be enabled in production"
    exit 1
fi

# Security: Validate file permissions
echo "🔧 Validating file permissions..."
find /app -type f -perm /o+w -exec echo "❌ World-writable file: {}" \;
if find /app -type f -perm /o+w | grep -q .; then
    echo "❌ CRITICAL: World-writable files detected"
    exit 1
fi

# Security: Check for unauthorized SUID/SGID binaries
echo "🔧 Checking for unauthorized SUID/SGID binaries..."
if find /app -type f \( -perm -4000 -o -perm -2000 \) | grep -q .; then
    echo "❌ WARNING: SUID/SGID binaries detected in application directory"
fi

# Security: Remove any temporary or cache files
rm -rf /tmp/* 2>/dev/null || true
rm -rf /app/.npm 2>/dev/null || true
rm -rf /app/.cache 2>/dev/null || true

echo "✅ Security validation completed successfully"
echo "🚀 Starting PolyHarmony Calendar in production mode..."

# Execute the main command
exec "$@"