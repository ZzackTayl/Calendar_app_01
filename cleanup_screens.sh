#!/bin/bash

# Screen cleanup script - organize migrated files

echo "=== MyOrbit Calendar Screen Cleanup ==="
echo ""

# Create archive directory for old Riverpod files
mkdir -p lib/ui/screens/archived_riverpod

echo "Step 1: Archiving old Riverpod screens that have BLoC versions..."

# List of screens that have been migrated to BLoC
MIGRATED_SCREENS=(
  "account_recovery_screen.dart"
  "activity_screen.dart"
  "add_contact_selection_screen.dart"
  "auth_screen.dart"
  "authentication_flow_screen.dart"
  "calendar_migration_screen.dart"
  "calendar_screen.dart"
  "calendar_sharing_screen.dart"
  "create_event_screen.dart"
  "dashboard_screen.dart"
  "email_verification_screen.dart"
  "event_invite_response_sheet.dart"
  "events_list_screen.dart"
  "notifications_screen.dart"
  "onboarding_screen.dart"
  "people_groups_screen.dart"
  "signal_availability_flow.dart"
)

for screen in "${MIGRATED_SCREENS[@]}"; do
  if [ -f "lib/ui/screens/$screen" ]; then
    echo "  Archiving: $screen"
    mv "lib/ui/screens/$screen" "lib/ui/screens/archived_riverpod/"
  fi
done

echo ""
echo "Step 2: Removing stub/placeholder files..."

# Remove stub files that are just placeholders
STUB_FILES=(
  "calendar_screen_refactored.dart"
  "dashboard_screen_refactored.dart"
)

for stub in "${STUB_FILES[@]}"; do
  if [ -f "lib/ui/screens/$stub" ]; then
    echo "  Removing stub: $stub"
    rm "lib/ui/screens/$stub"
  fi
done

echo ""
echo "Step 3: Summary of remaining files..."
echo ""
echo "BLoC Screens (migrated):"
ls -1 lib/ui/screens/*_bloc.dart 2>/dev/null | wc -l | xargs echo "  Count:"

echo ""
echo "Provider-free screens (no migration needed):"
PROVIDER_FREE=(
  "landing_screen.dart"
  "change_log_screen.dart"
  "upd"
dart filese _bloc.outing to usn rs iate importho "3. Upder"
ecfolderpod/ iv_rchivedte ardele you can orks,ing w If everythcho "2.s work"
ee all screento ensurthe app Test o "1. eps:"
echst "Next ho
echo "" ==="
ecleteCompCleanup ho "=== ec""
o 
echount:"
cho "  C xargs e| wc -l |ull dev/niverpod/ 2>/ed_rs/archiv/ui/screenls -1 libiles:"
iverpod fArchived Recho "
echo ""

done
een"
  fi ✓ $scrho " 
    ecen]; thcreen" screens/$s-f "lib/ui/  if [ @]}"; do
ER_FREE[${PROVIDn "en i

for scren.dart"
)ts_scree"
  "evendartcreen.ettings_srt"
  "s_screen.dasionist_permontacrt"
  "cd_screen.dahoacts_met  "add_cont"
tcreen.dars_sates_guide