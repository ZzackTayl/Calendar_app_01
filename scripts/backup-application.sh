#!/bin/bash

# PolyHarmony Application Backup Script
# 
# This script creates comprehensive backups of application files, configurations,
# and metadata that are not covered by database backups
# 
# Usage: ./scripts/backup-application.sh
# Cron: 0 2 * * * (Daily at 2 AM)

set -euo pipefail

# Configuration
BACKUP_ROOT="/Users/zackstewart/Calendar_app_01/backups"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/app_$BACKUP_DATE"
MAX_BACKUPS=30  # Keep 30 days of backups
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    if [[ ! -d "$PROJECT_ROOT" ]]; then
        error "Project root not found: $PROJECT_ROOT"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json not found in project root"
        exit 1
    fi
    
    # Check available disk space (require at least 1GB)
    available_space=$(df -h "$BACKUP_ROOT" 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G.*//')
    if [[ ${available_space:-0} -lt 1 ]]; then
        warning "Low disk space available: ${available_space}GB"
    fi
    
    success "Prerequisites check passed"
}

# Create backup directory structure
create_backup_structure() {
    log "📁 Creating backup directory structure..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/application"
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/configuration"
    mkdir -p "$BACKUP_DIR/scripts"
    mkdir -p "$BACKUP_DIR/documentation"
    
    success "Backup directory created: $BACKUP_DIR"
}

# Backup application code and critical files
backup_application_files() {
    log "📦 Backing up application files..."
    
    cd "$PROJECT_ROOT"
    
    # Core application directories
    if [[ -d "app" ]]; then
        cp -r app "$BACKUP_DIR/application/"
        log "  ✅ Copied app/ directory"
    fi
    
    if [[ -d "lib" ]]; then
        cp -r lib "$BACKUP_DIR/application/"
        log "  ✅ Copied lib/ directory"
    fi
    
    if [[ -d "components" ]]; then
        cp -r components "$BACKUP_DIR/application/"
        log "  ✅ Copied components/ directory"
    fi
    
    if [[ -d "hooks" ]]; then
        cp -r hooks "$BACKUP_DIR/application/"
        log "  ✅ Copied hooks/ directory"
    fi
    
    # Configuration files
    for file in package.json package-lock.json next.config.js tailwind.config.ts tsconfig.json; do
        if [[ -f "$file" ]]; then
            cp "$file" "$BACKUP_DIR/configuration/"
            log "  ✅ Copied $file"
        fi
    done
    
    # Vercel configuration
    if [[ -f "vercel.json" ]]; then
        cp vercel.json "$BACKUP_DIR/configuration/"
        log "  ✅ Copied vercel.json"
    fi
    
    success "Application files backed up"
}

# Backup database migrations and schemas
backup_database_files() {
    log "🗃️  Backing up database files..."
    
    cd "$PROJECT_ROOT"
    
    # Supabase migrations
    if [[ -d "supabase/migrations" ]]; then
        cp -r supabase/migrations "$BACKUP_DIR/database/"
        log "  ✅ Copied Supabase migrations"
    fi
    
    # Supabase configuration
    if [[ -f "supabase/config.toml" ]]; then
        cp supabase/config.toml "$BACKUP_DIR/database/"
        log "  ✅ Copied Supabase config"
    fi
    
    # Schema files
    if [[ -d "schemas" ]]; then
        cp -r schemas "$BACKUP_DIR/database/"
        log "  ✅ Copied schema files"
    fi
    
    success "Database files backed up"
}

# Backup scripts and automation
backup_scripts() {
    log "🔧 Backing up scripts and automation..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -d "scripts" ]]; then
        cp -r scripts "$BACKUP_DIR/scripts/"
        log "  ✅ Copied scripts directory"
    fi
    
    # Docker files
    for file in Dockerfile Dockerfile.dev docker-compose.yml docker-compose.dev.yml; do
        if [[ -f "$file" ]]; then
            cp "$file" "$BACKUP_DIR/scripts/"
            log "  ✅ Copied $file"
        fi
    done
    
    success "Scripts backed up"
}

# Backup documentation
backup_documentation() {
    log "📚 Backing up documentation..."
    
    cd "$PROJECT_ROOT"
    
    # Documentation directory
    if [[ -d "docs" ]]; then
        cp -r docs "$BACKUP_DIR/documentation/"
        log "  ✅ Copied docs directory"
    fi
    
    # Root documentation files
    for file in README.md CHANGELOG.md *.md; do
        if [[ -f "$file" ]]; then
            cp "$file" "$BACKUP_DIR/documentation/" 2>/dev/null || true
        fi
    done
    
    success "Documentation backed up"
}

# Create environment template (no secrets)
create_environment_template() {
    log "🔐 Creating environment template..."
    
    cat > "$BACKUP_DIR/configuration/env_template.txt" << EOF
# PolyHarmony Environment Variables Template
# Generated: $(date)
# 
# IMPORTANT: This template contains NO secrets or sensitive data
# Use this as a reference for setting up new environments

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application Configuration  
NEXT_PUBLIC_APP_NAME=PolyHarmony
NEXT_PUBLIC_APP_VERSION=

# Encryption (generate new key for each environment)
ENCRYPTION_KEY=

# Email Service (choose one)
SENDGRID_API_KEY=
RESEND_API_KEY=
NODEMAILER_HOST=
NODEMAILER_PORT=
NODEMAILER_USER=
NODEMAILER_PASS=

# Calendar Integrations
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# Development/Production flags
NODE_ENV=production
NEXT_PUBLIC_VERCEL_ENV=

# Optional: Analytics and Monitoring
NEXT_PUBLIC_ANALYTICS_ID=
SENTRY_DSN=
EOF
    
    log "  ✅ Environment template created"
}

# Create backup metadata
create_backup_metadata() {
    log "📋 Creating backup metadata..."
    
    # Get git information if available
    GIT_COMMIT=""
    GIT_BRANCH=""
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
        GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    fi
    
    # Get package.json version
    APP_VERSION=""
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        APP_VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null || echo "unknown")
    fi
    
    cat > "$BACKUP_DIR/BACKUP_METADATA.json" << EOF
{
  "backup_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_type": "application_files",
  "backup_version": "1.0",
  "application": {
    "name": "PolyHarmony",
    "version": "$APP_VERSION",
    "git_commit": "$GIT_COMMIT",
    "git_branch": "$GIT_BRANCH"
  },
  "system": {
    "hostname": "$(hostname)",
    "os": "$(uname -s)",
    "backup_user": "$(whoami)",
    "working_directory": "$PROJECT_ROOT"
  },
  "backup_contents": {
    "application_files": true,
    "database_migrations": true,
    "configuration_files": true,
    "scripts": true,
    "documentation": true,
    "environment_template": true
  },
  "verification": {
    "total_files": $(find "$BACKUP_DIR" -type f | wc -l),
    "total_size_bytes": $(du -sb "$BACKUP_DIR" | cut -f1),
    "checksum": "$(find "$BACKUP_DIR" -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)"
  }
}
EOF
    
    success "Backup metadata created"
}

# Compress backup
compress_backup() {
    log "📦 Compressing backup..."
    
    cd "$BACKUP_ROOT"
    
    ARCHIVE_NAME="polyharmony_app_backup_$BACKUP_DATE.tar.gz"
    
    tar -czf "$ARCHIVE_NAME" "app_$BACKUP_DATE"
    
    if [[ $? -eq 0 ]]; then
        # Remove uncompressed directory
        rm -rf "$BACKUP_DIR"
        
        # Get archive size
        ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
        
        success "Backup compressed: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
    else
        error "Failed to compress backup"
        exit 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "🧹 Cleaning up old backups..."
    
    cd "$BACKUP_ROOT"
    
    # Count current backups
    CURRENT_BACKUPS=$(ls -1 polyharmony_app_backup_*.tar.gz 2>/dev/null | wc -l)
    log "  Current backups: $CURRENT_BACKUPS"
    
    # Remove old backups if we exceed the limit
    if [[ $CURRENT_BACKUPS -gt $MAX_BACKUPS ]]; then
        BACKUPS_TO_DELETE=$((CURRENT_BACKUPS - MAX_BACKUPS))
        log "  Removing $BACKUPS_TO_DELETE old backups..."
        
        ls -1t polyharmony_app_backup_*.tar.gz | tail -n $BACKUPS_TO_DELETE | xargs rm -f
        
        success "Cleaned up $BACKUPS_TO_DELETE old backups"
    else
        log "  No cleanup needed (keeping last $MAX_BACKUPS backups)"
    fi
}

# Validate backup integrity
validate_backup() {
    log "✅ Validating backup integrity..."
    
    cd "$BACKUP_ROOT"
    
    ARCHIVE_NAME="polyharmony_app_backup_$BACKUP_DATE.tar.gz"
    
    # Test archive integrity
    if tar -tzf "$ARCHIVE_NAME" >/dev/null 2>&1; then
        success "Backup archive integrity verified"
    else
        error "Backup archive is corrupted!"
        exit 1
    fi
    
    # Get final statistics
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    FILE_COUNT=$(tar -tzf "$ARCHIVE_NAME" | wc -l)
    
    log "📊 Backup Statistics:"
    log "  Archive: $ARCHIVE_NAME"
    log "  Size: $ARCHIVE_SIZE"
    log "  Files: $FILE_COUNT"
    log "  Location: $BACKUP_ROOT"
}

# Main execution
main() {
    log "🚀 Starting PolyHarmony application backup..."
    
    # Ensure backup root directory exists
    mkdir -p "$BACKUP_ROOT"
    
    check_prerequisites
    create_backup_structure
    backup_application_files
    backup_database_files
    backup_scripts
    backup_documentation
    create_environment_template
    create_backup_metadata
    compress_backup
    cleanup_old_backups
    validate_backup
    
    success "🎉 Application backup completed successfully!"
    
    # Output final backup location
    echo ""
    echo "Backup Location: $BACKUP_ROOT/polyharmony_app_backup_$BACKUP_DATE.tar.gz"
    echo "To restore, extract the archive and refer to the BACKUP_METADATA.json file"
}

# Error handling
trap 'error "Backup script failed at line $LINENO"' ERR

# Execute main function
main "$@"