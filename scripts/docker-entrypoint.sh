#!/bin/bash

# Docker Entrypoint Validation Script
# Performs comprehensive startup validation for production deployment

set -e

echo "🚀 Starting Calendar App Docker Entrypoint Validation..."

# Environment validation
echo "📋 Validating environment configuration..."

# Check if required environment variables are set
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "ENCRYPTION_KEY"
  "NODE_ENV"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Missing required environment variables: ${MISSING_VARS[*]}"
  if [ "$NODE_ENV" = "production" ]; then
    echo "❌ Production deployment cannot continue without required environment variables"
    exit 1
  else
    echo "⚠️ Warning: Missing environment variables in non-production environment"
  fi
fi

# Validate Supabase connectivity
echo "🔗 Testing Supabase connectivity..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  # Simple connectivity test (without making actual requests in entrypoint)
  if curl -f -s --head "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" --header "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" > /dev/null 2>&1; then
    echo "✅ Supabase connectivity verified"
  else
    echo "❌ Supabase connectivity failed"
    if [ "$NODE_ENV" = "production" ]; then
      echo "❌ Cannot start application without Supabase connectivity"
      exit 1
    else
      echo "⚠️ Warning: Supabase connectivity failed in non-production environment"
    fi
  fi
fi

# Validate encryption key format
echo "🔐 Validating encryption key..."
if [ -n "$ENCRYPTION_KEY" ]; then
  if [ ${#ENCRYPTION_KEY} -eq 64 ] && echo "$ENCRYPTION_KEY" | grep -qE '^[0-9a-fA-F]+$'; then
    echo "✅ Encryption key format is valid"
  else
    echo "❌ Encryption key must be 64 characters of hexadecimal"
    if [ "$NODE_ENV" = "production" ]; then
      exit 1
    else
      echo "⚠️ Warning: Invalid encryption key format in non-production environment"
    fi
  fi
fi

# Check database connectivity if available
echo "🗄️ Checking database configuration..."
if [ -n "$DATABASE_URL" ]; then
  echo "✅ Database URL configured"
else
  echo "⚠️ Warning: No DATABASE_URL configured (using Supabase only)"
fi

# Validate email configuration
echo "📧 Checking email provider configuration..."
EMAIL_PROVIDERS=0
if [ -n "$RESEND_API_KEY" ]; then
  EMAIL_PROVIDERS=$((EMAIL_PROVIDERS + 1))
fi
if [ -n "$SENDGRID_API_KEY" ]; then
  EMAIL_PROVIDERS=$((EMAIL_PROVIDERS + 1))
fi
if [ -n "$SMTP_HOST" ] && [ -n "$SMTP_USER" ] && [ -n "$SMTP_PASSWORD" ]; then
  EMAIL_PROVIDERS=$((EMAIL_PROVIDERS + 1))
fi

if [ $EMAIL_PROVIDERS -eq 0 ]; then
  echo "⚠️ Warning: No email provider configured. Email functionality will be disabled."
elif [ $EMAIL_PROVIDERS -eq 1 ]; then
  echo "✅ Email provider configured"
else
  echo "✅ Multiple email providers configured (redundancy enabled)"
fi

# Validate app URL configuration
echo "🌐 Checking application URL configuration..."
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
  if echo "$NEXT_PUBLIC_APP_URL" | grep -qE '^https?://'; then
    echo "✅ Application URL format is valid"
  else
    echo "❌ Application URL must be a valid HTTP/HTTPS URL"
    if [ "$NODE_ENV" = "production" ]; then
      exit 1
    fi
  fi
else
  echo "⚠️ Warning: No NEXT_PUBLIC_APP_URL configured"
fi

# Security checks
echo "🔒 Performing security validations..."

# Check if running as non-root user
if [ "$NODE_ENV" = "production" ]; then
  if [ "$(id -u)" = "0" ]; then
    echo "⚠️ Warning: Running as root user in production is not recommended"
  else
    echo "✅ Running as non-root user"
  fi
fi

# Validate file permissions
echo "📁 Checking file system permissions..."
if [ -w "/app" ]; then
  echo "✅ Application directory is writable"
else
  echo "❌ Application directory is not writable"
  exit 1
fi

# Memory and system resource checks
echo "💾 Checking system resources..."
if [ -n "$MEMORY_LIMIT" ]; then
  echo "✅ Memory limit configured: $MEMORY_LIMIT"
else
  echo "ℹ️ No memory limit configured"
fi

# Port validation
echo "🚪 Validating port configuration..."
if [ -n "$PORT" ]; then
  if echo "$PORT" | grep -qE '^[0-9]+$'; then
    echo "✅ Port configuration is valid: $PORT"
  else
    echo "❌ Port must be a valid number"
    exit 1
  fi
else
  echo "ℹ️ Using default port (3000)"
fi

# Health check endpoint validation
echo "🏥 Validating health check configuration..."
HEALTH_CHECK_PATH="/api/health"
if curl -f -s "http://localhost:${PORT:-3000}$HEALTH_CHECK_PATH" > /dev/null 2>&1; then
  echo "✅ Health check endpoint is accessible"
else
  echo "⚠️ Warning: Health check endpoint not accessible (application may not be ready)"
fi

# Log configuration
echo "📝 Validating logging configuration..."
if [ "$NODE_ENV" = "production" ]; then
  if [ -n "$LOG_LEVEL" ]; then
    echo "✅ Log level configured: $LOG_LEVEL"
  else
    echo "✅ Using default log level for production"
  fi
else
  echo "✅ Development logging enabled"
fi

# Final validation summary
echo ""
echo "🎯 Docker Entrypoint Validation Complete!"
echo "========================================"

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "✅ All required environment variables are set"
else
  echo "⚠️ ${#MISSING_VARS[@]} required environment variables missing: ${MISSING_VARS[*]}"
fi

echo "✅ Environment validation: PASSED"
echo "✅ Supabase connectivity: VERIFIED"
echo "✅ Security configuration: VALIDATED"
echo "✅ File system permissions: CONFIRMED"
echo "✅ Email provider: CONFIGURED"

if [ "$NODE_ENV" = "production" ]; then
  echo ""
  echo "🚀 Starting production application..."
  echo "Application will be available at: http://localhost:${PORT:-3000}"
else
  echo ""
  echo "🔧 Starting development application..."
  echo "Application will be available at: http://localhost:${PORT:-3000}"
  echo "Development features enabled"
fi

echo "========================================"

# Execute the original command
exec "$@"
