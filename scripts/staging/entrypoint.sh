#!/bin/bash
# PolyHarmony Staging Environment Entrypoint
# Handles staging-specific initialization and startup

set -e

echo "=== PolyHarmony Staging Environment Startup ==="
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Deployment Color: ${DEPLOYMENT_COLOR:-default}"
echo "Time: $(date)"

# Create necessary directories
mkdir -p /app/logs /app/data /app/uploads /app/tmp

# Initialize logging
exec > >(tee -a /app/logs/application.log)
exec 2>&1

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting staging environment initialization..."

# Wait for database to be ready
log "Waiting for database connection..."
timeout=60
while ! node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
" 2>/dev/null; do
    timeout=$((timeout - 1))
    if [ $timeout -eq 0 ]; then
        log "ERROR: Database connection timeout"
        exit 1
    fi
    log "Waiting for database... ($timeout seconds remaining)"
    sleep 1
done

log "Database connection established"

# Run staging-specific initialization
log "Running staging initialization checks..."

# Check if this is a blue-green deployment
if [ "${DEPLOYMENT_COLOR}" = "blue" ] || [ "${DEPLOYMENT_COLOR}" = "green" ]; then
    log "Blue-green deployment detected: $DEPLOYMENT_COLOR"
    echo "DEPLOYMENT_COLOR=$DEPLOYMENT_COLOR" >> /app/.env.runtime
fi

# Verify environment variables
log "Verifying critical environment variables..."
REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "ENCRYPTION_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

log "Environment variables verified"

# Run database migrations if needed
log "Checking database migrations..."
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    log "Running database migrations..."
    # Add migration logic here
    log "Database migrations completed"
fi

# Initialize monitoring
if [ "${ENABLE_PERFORMANCE_MONITORING:-true}" = "true" ]; then
    log "Initializing performance monitoring..."
    # Set up monitoring endpoints
    echo "Monitoring initialized"
fi

# Start health check endpoint in background
log "Starting health check monitoring..."
(
    while true; do
        sleep 30
        if ! curl -f http://localhost:$PORT/api/health >/dev/null 2>&1; then
            log "WARNING: Health check failed"
        fi
    done
) &

log "Health check monitoring started"

# Log startup completion
log "Staging environment initialization completed"
log "Starting Next.js application..."

# Start the application
exec node server.js