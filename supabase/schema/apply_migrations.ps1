# ======================================================================
# MyOrbit Calendar - Apply Supabase Migrations (Windows)
# ======================================================================
# This PowerShell script mirrors the Bash helper and guides you through
# running Supabase migrations from a Windows development environment.

param(
    [switch]$Force
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  MyOrbit Calendar - Database Migration Tool" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with one of the following options:"
    Write-Host "  winget install Supabase.CLI"
    Write-Host "  npm install -g supabase"
    Write-Host "  https://github.com/supabase/cli#installation"
    Write-Host ""
    exit 1
}

Write-Host "Supabase CLI found." -ForegroundColor Green
Write-Host ""

$envPath = Join-Path $projectRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Warning: .env file not found at $envPath" -ForegroundColor Yellow
    Write-Host "Ensure SUPABASE_URL and SUPABASE_ANON_KEY are configured."
    Write-Host ""
}

$migrations = @(
    "001_profiles_contacts.sql"
    "002_calendars_events.sql"
    "003_availability_signals.sql"
    "004_functions.sql"
    "005_realtime.sql"
)

Write-Host "Migration files to apply:" -ForegroundColor Cyan
$index = 1
foreach ($migration in $migrations) {
    Write-Host ("  {0}. {1}" -f $index, $migration)
    $index++
}
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Apply these migrations? (y/n)"
    if ($confirm -notmatch "^[Yy]") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

if ($Force) {
    $usePush = $true
} else {
    $answer = Read-Host "Use 'supabase db push'? (y/n)"
    $usePush = $answer -match "^[Yy]"
}

if ($usePush) {
    Write-Host ""
    Write-Host "Running 'supabase db push' from $projectRoot" -ForegroundColor Cyan
    Write-Host ""
    Push-Location $projectRoot
    try {
        supabase db push
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "Migrations applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. supabase db execute -f supabase/schema/validate_schema.sql"
    Write-Host "  2. Verify tables and policies via the Supabase Dashboard."
    Write-Host "  3. Run the app: flutter run"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "Manual migration instructions:" -ForegroundColor Yellow
Write-Host "1. Open https://app.supabase.com/project/YOUR_PROJECT_ID"
Write-Host "2. Navigate to Database -> SQL Editor"
Write-Host "3. Apply each migration in order from:"
Write-Host ("     {0}" -f $scriptDir)
foreach ($migration in $migrations) {
    Write-Host ("   - {0}" -f (Join-Path $scriptDir $migration))
}
Write-Host "4. Run supabase/schema/validate_schema.sql to verify."
Write-Host ""
Write-Host "Done. Review the instructions above." -ForegroundColor Green
