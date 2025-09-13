#!/bin/bash
# PolyHarmony Staging Secrets Management
# Handles secure generation and management of staging environment secrets

set -e

# Configuration
SECRETS_DIR="/app/secrets"
ENV_FILE=".env.staging"
BACKUP_DIR="/app/backups/secrets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -hex $length
}

# Generate encryption key (64 characters for AES-256)
generate_encryption_key() {
    openssl rand -hex 32
}

# Generate JWT secret (minimum 32 characters)
generate_jwt_secret() {
    openssl rand -base64 32 | tr -d '=' | head -c 32
}

# Generate database password
generate_db_password() {
    openssl rand -base64 24 | tr -d '=' | head -c 20
}

# Create secrets directory
create_secrets_dir() {
    log "Creating secrets directory..."
    mkdir -p "$SECRETS_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$SECRETS_DIR"
    chmod 700 "$BACKUP_DIR"
}

# Backup existing secrets
backup_secrets() {
    if [ -f "$ENV_FILE" ]; then
        local backup_file="$BACKUP_DIR/env_backup_$(date +%Y%m%d_%H%M%S).env"
        log "Backing up existing secrets to: $backup_file"
        cp "$ENV_FILE" "$backup_file"
        chmod 600 "$backup_file"
    fi
}

# Generate all staging secrets
generate_staging_secrets() {
    log "Generating staging environment secrets..."

    # Create new environment file
    cat > "$ENV_FILE" << EOF
# PolyHarmony Staging Environment Secrets
# Generated on: $(date)
# DO NOT commit this file to version control

# =================================================================
# CORE SECURITY SECRETS
# =================================================================
STAGING_ENCRYPTION_KEY=$(generate_encryption_key)
ENCRYPTION_KEY=$(generate_encryption_key)
STAGING_JWT_SECRET=$(generate_jwt_secret)
JWT_SECRET=$(generate_jwt_secret)
SESSION_SECRET=$(generate_secret 32)

# =================================================================
# DATABASE SECRETS
# =================================================================
STAGING_DB_PASSWORD=$(generate_db_password)
STAGING_DATABASE_URL=postgresql://postgres:$(generate_db_password)@staging-db:5432/polyharmony_staging

# =================================================================
# REDIS SECRETS
# =================================================================
REDIS_PASSWORD=$(generate_secret 24)

# =================================================================
# EXTERNAL SERVICE SECRETS
# =================================================================
# Supabase (replace with your staging project values)
STAGING_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=your-staging-supabase-anon-key-replace-me
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-supabase-anon-key-replace-me
STAGING_SUPABASE_SERVICE_ROLE_KEY=your-staging-supabase-service-role-key-replace-me
SUPABASE_SERVICE_ROLE_KEY=your-staging-supabase-service-role-key-replace-me

# Email Service (replace with staging API keys)
STAGING_SENDGRID_API_KEY=your-staging-sendgrid-api-key-replace-me
SENDGRID_API_KEY=your-staging-sendgrid-api-key-replace-me

# Google Calendar Integration (staging/sandbox)
GOOGLE_CLIENT_ID=your-staging-google-client-id-replace-me
GOOGLE_CLIENT_SECRET=your-staging-google-client-secret-replace-me

# =================================================================
# MONITORING SECRETS
# =================================================================
GRAFANA_ADMIN_PASSWORD=$(generate_secret 16)

# =================================================================
# SSL/ACME SECRETS
# =================================================================
ACME_EMAIL=admin@polyharmony.app

# =================================================================
# WEBHOOK SECRETS
# =================================================================
WEBHOOK_SECRET=$(generate_secret 32)

# =================================================================
# API DOCUMENTATION SECRETS
# =================================================================
API_DOCS_PASSWORD=$(generate_secret 16)

# =================================================================
# BACKUP SECRETS (if using S3)
# =================================================================
# AWS_ACCESS_KEY_ID=your-staging-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-staging-aws-secret-key
EOF

    # Set proper permissions
    chmod 600 "$ENV_FILE"

    log "Staging secrets generated successfully"
    log "Environment file created: $ENV_FILE"
}

# Validate secrets format
validate_secrets() {
    log "Validating generated secrets..."

    local errors=0

    # Check encryption key length (should be 64 characters)
    local encryption_key=$(grep "^STAGING_ENCRYPTION_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    if [ ${#encryption_key} -ne 64 ]; then
        error "Encryption key length is incorrect: ${#encryption_key} (expected 64)"
        ((errors++))
    fi

    # Check JWT secret length (should be at least 32 characters)
    local jwt_secret=$(grep "^STAGING_JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2)
    if [ ${#jwt_secret} -lt 32 ]; then
        error "JWT secret length is too short: ${#jwt_secret} (minimum 32)"
        ((errors++))
    fi

    # Check for placeholder values that need to be replaced
    local placeholders=(
        "your-staging-project.supabase.co"
        "your-staging-supabase-anon-key-replace-me"
        "your-staging-supabase-service-role-key-replace-me"
        "your-staging-sendgrid-api-key-replace-me"
        "your-staging-google-client-id-replace-me"
        "your-staging-google-client-secret-replace-me"
    )

    for placeholder in "${placeholders[@]}"; do
        if grep -q "$placeholder" "$ENV_FILE"; then
            warn "Placeholder value found: $placeholder - needs to be replaced with actual values"
        fi
    done

    if [ $errors -eq 0 ]; then
        log "Secret validation completed successfully"
    else
        error "Secret validation failed with $errors errors"
        return 1
    fi
}

# Create GitHub secrets template
create_github_secrets_template() {
    log "Creating GitHub secrets template..."

    cat > "github-secrets-template.md" << 'EOF'
# GitHub Secrets for Staging Environment

Add these secrets to your GitHub repository for staging deployments:

## Required Secrets

### Database
```
STAGING_DB_PASSWORD: [generated database password]
STAGING_DATABASE_URL: [full database connection string]
```

### Application Security
```
STAGING_ENCRYPTION_KEY: [64-character hex string]
STAGING_JWT_SECRET: [32+ character string]
SESSION_SECRET: [32+ character string]
```

### Supabase
```
STAGING_SUPABASE_URL: https://your-staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY: [your staging supabase anon key]
STAGING_SUPABASE_SERVICE_ROLE_KEY: [your staging supabase service role key]
```

### Email Service
```
STAGING_SENDGRID_API_KEY: [your staging sendgrid API key]
```

### External Integrations
```
GOOGLE_CLIENT_ID: [staging google client ID]
GOOGLE_CLIENT_SECRET: [staging google client secret]
```

### Monitoring
```
GRAFANA_ADMIN_PASSWORD: [grafana admin password]
```

### Optional (for S3 backups)
```
AWS_ACCESS_KEY_ID: [staging AWS access key]
AWS_SECRET_ACCESS_KEY: [staging AWS secret key]
BACKUP_S3_BUCKET: polyharmony-staging-backups
```

## Setup Instructions

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add each secret with the name and value from above
4. Update the placeholder values with actual staging service credentials
EOF

    log "GitHub secrets template created: github-secrets-template.md"
}

# Main execution
main() {
    log "=== PolyHarmony Staging Secrets Manager ==="

    # Parse command line arguments
    case "${1:-generate}" in
        "generate")
            create_secrets_dir
            backup_secrets
            generate_staging_secrets
            validate_secrets
            create_github_secrets_template
            ;;
        "validate")
            validate_secrets
            ;;
        "backup")
            backup_secrets
            ;;
        "help")
            echo "Usage: $0 [generate|validate|backup|help]"
            echo "  generate: Generate new staging secrets (default)"
            echo "  validate: Validate existing secrets"
            echo "  backup:   Backup existing secrets"
            echo "  help:     Show this help message"
            ;;
        *)
            error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac

    log "Secrets management completed successfully"
}

# Run main function
main "$@"