#!/bin/bash
# PolyHarmony Staging Database Backup Script
# Creates sanitized backups of staging database

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_HOST=${STAGING_DB_HOST:-staging-db}
DB_PORT=${STAGING_DB_PORT:-5432}
DB_NAME=${STAGING_DB_NAME:-polyharmony_staging}
DB_USER=${STAGING_DB_USER:-postgres}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting staging database backup..."
log "Database: $DB_HOST:$DB_PORT/$DB_NAME"
log "Backup directory: $BACKUP_DIR"

# Test database connection
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
    log "ERROR: Cannot connect to database"
    exit 1
fi

# Create full backup
BACKUP_FILE="$BACKUP_DIR/staging_full_backup_$TIMESTAMP.sql"
log "Creating full backup: $BACKUP_FILE"

pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Full backup completed successfully"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
else
    log "ERROR: Full backup failed"
    exit 1
fi

# Create schema-only backup
SCHEMA_BACKUP_FILE="$BACKUP_DIR/staging_schema_backup_$TIMESTAMP.sql"
log "Creating schema-only backup: $SCHEMA_BACKUP_FILE"

pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --schema-only \
    --format=plain \
    > "$SCHEMA_BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Schema backup completed successfully"
else
    log "ERROR: Schema backup failed"
    exit 1
fi

# Create sanitized data backup (removes sensitive information)
SANITIZED_BACKUP_FILE="$BACKUP_DIR/staging_sanitized_backup_$TIMESTAMP.sql"
log "Creating sanitized backup: $SANITIZED_BACKUP_FILE"

# Sanitization queries
cat > /tmp/sanitization_queries.sql << 'EOF'
-- Sanitize sensitive user data
UPDATE profiles SET
    email = CONCAT('user_', id, '@example.com'),
    phone = NULL,
    avatar_url = NULL,
    bio = 'Sanitized user bio',
    location = 'Test City, Test State'
WHERE email NOT LIKE '%@example.com';

-- Sanitize calendar events
UPDATE events SET
    title = CASE
        WHEN title LIKE '%private%' OR title LIKE '%personal%' THEN 'Private Event'
        ELSE 'Test Event ' || id
    END,
    description = 'Sanitized event description',
    location = 'Test Location';

-- Sanitize relationships
UPDATE relationships SET
    notes = 'Test relationship notes',
    anniversary_date = NULL;

-- Remove sensitive attachments
UPDATE attachments SET
    file_name = 'test_file_' || id || '.txt',
    file_url = 'https://example.com/test_file_' || id,
    original_name = 'test_file_' || id || '.txt';

-- Sanitize invitations
UPDATE invitations SET
    email = CONCAT('invite_', id, '@example.com'),
    message = 'Test invitation message';
EOF

# Apply sanitization and create backup
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/sanitization_queries.sql

pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    > "$SANITIZED_BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Sanitized backup completed successfully"
    SANITIZED_SIZE=$(du -h "$SANITIZED_BACKUP_FILE" | cut -f1)
    log "Sanitized backup size: $SANITIZED_SIZE"
else
    log "ERROR: Sanitized backup failed"
    exit 1
fi

# Clean up old backups (keep last 30 days)
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "staging_*_backup_*.sql" -type f -mtime +30 -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "staging_*_backup_*.sql" -type f | wc -l)
log "Cleanup completed. Remaining backups: $REMAINING_BACKUPS"

# Create backup manifest
cat > "$BACKUP_DIR/backup_manifest_$TIMESTAMP.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "database": {
    "host": "$DB_HOST",
    "port": $DB_PORT,
    "name": "$DB_NAME",
    "user": "$DB_USER"
  },
  "backups": {
    "full": {
      "file": "staging_full_backup_$TIMESTAMP.sql",
      "size": "$BACKUP_SIZE",
      "type": "full",
      "compressed": true
    },
    "schema": {
      "file": "staging_schema_backup_$TIMESTAMP.sql",
      "size": "$(du -h "$SCHEMA_BACKUP_FILE" | cut -f1)",
      "type": "schema-only",
      "compressed": false
    },
    "sanitized": {
      "file": "staging_sanitized_backup_$TIMESTAMP.sql",
      "size": "$SANITIZED_SIZE",
      "type": "sanitized-data",
      "compressed": true
    }
  },
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
}
EOF

log "Backup manifest created: backup_manifest_$TIMESTAMP.json"

# Upload to S3 if configured
if [ -n "$BACKUP_S3_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
    log "Uploading backups to S3..."

    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        log "Installing AWS CLI..."
        apk add --no-cache aws-cli
    fi

    # Upload backups
    aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/staging/$(basename "$BACKUP_FILE")"
    aws s3 cp "$SANITIZED_BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/staging/$(basename "$SANITIZED_BACKUP_FILE")"
    aws s3 cp "$BACKUP_DIR/backup_manifest_$TIMESTAMP.json" "s3://$BACKUP_S3_BUCKET/staging/manifests/"

    log "Backups uploaded to S3 successfully"
fi

log "Staging database backup completed successfully"
log "Files created:"
log "  - Full backup: $BACKUP_FILE ($BACKUP_SIZE)"
log "  - Schema backup: $SCHEMA_BACKUP_FILE"
log "  - Sanitized backup: $SANITIZED_BACKUP_FILE ($SANITIZED_SIZE)"
log "  - Manifest: backup_manifest_$TIMESTAMP.json"