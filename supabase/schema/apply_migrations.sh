#!/bin/bash
# ======================================================================
# MyOrbit - Apply Supabase Migrations
# ======================================================================
# This script helps you apply all database migrations in the correct order

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  MyOrbit Calendar - Database Migration Tool${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install supabase/tap/supabase"
    echo "  Linux:   https://github.com/supabase/cli#installation"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"
echo ""

# Check if we're in a Supabase project
if [ ! -f "$SCRIPT_DIR/../../.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Please create a .env file with:"
    echo "  FLUTTER_ENV=dev"
    echo "  DEV_SUPABASE_URL=your_supabase_url"
    echo "  DEV_SUPABASE_ANON_KEY=your_anon_key"
    echo ""
fi

# Migration files in order
MIGRATIONS=(
    "001_profiles_contacts.sql"
    "002_calendars_events.sql"
    "003_availability_signals.sql"
    "004_functions.sql"
    "005_realtime.sql"
)

echo -e "${BLUE}Migration files to apply:${NC}"
for i in "${!MIGRATIONS[@]}"; do
    echo "  $((i+1)). ${MIGRATIONS[$i]}"
done
echo ""

# Ask for confirmation
read -p "Apply these migrations? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}  Applying Migrations via Supabase CLI${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Option 1: Use Supabase CLI push (recommended)
echo -e "${GREEN}Recommended: Use 'supabase db push'${NC}"
echo ""
echo "This will:"
echo "  1. Connect to your Supabase project"
echo "  2. Apply all pending migrations in order"
echo "  3. Track migration history"
echo ""

read -p "Use 'supabase db push'? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Running: supabase db push${NC}"
    echo ""
    
    cd "$SCRIPT_DIR/../.." || exit 1
    supabase db push
    
    echo ""
    echo -e "${GREEN}✅ Migrations applied successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Run validation: supabase db execute -f supabase/schema/validate_schema.sql"
    echo "  2. Check tables: supabase db dump --schema public | grep 'CREATE TABLE'"
    echo "  3. Test your app: flutter run"
    echo ""
    exit 0
fi

# Option 2: Manual application (for troubleshooting)
echo ""
echo -e "${YELLOW}==================================================${NC}"
echo -e "${YELLOW}  Manual Migration Instructions${NC}"
echo -e "${YELLOW}==================================================${NC}"
echo ""
echo "To apply migrations manually:"
echo ""
echo "1. Go to your Supabase Dashboard:"
echo "   https://app.supabase.com/project/YOUR_PROJECT_ID"
echo ""
echo "2. Navigate to: Database → SQL Editor"
echo ""
echo "3. Apply each migration file in order:"
for migration in "${MIGRATIONS[@]}"; do
    echo "   - Copy contents of: $SCRIPT_DIR/$migration"
    echo "     Paste into SQL Editor and click 'Run'"
    echo ""
done
echo "4. Verify with validation script:"
echo "   - Copy contents of: $SCRIPT_DIR/validate_schema.sql"
echo "   - Run in SQL Editor"
echo ""

echo -e "${BLUE}Migration files location:${NC}"
echo "  $SCRIPT_DIR"
echo ""

echo -e "${GREEN}Done! Review the instructions above.${NC}"
