# PowerShell script to fix missing Next.js imports in API routes

Write-Host "=== FIXING NEXT.JS IMPORTS ACROSS ALL API ROUTES ===" -ForegroundColor Cyan

$apiRoutes = Get-ChildItem -Path "app\api" -Recurse -Filter "route.ts" | ForEach-Object { $_.FullName }
$fixedFiles = 0
$skippedFiles = 0

foreach ($file in $apiRoutes) {
    Write-Host "Processing: $($file.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Yellow
    
    $content = Get-Content $file -Raw
    $originalContent = $content
    
    # Check if file already has the imports
    $hasNextRequest = $content -match "import.*NextRequest.*from.*next/server"
    $hasNextResponse = $content -match "import.*NextResponse.*from.*next/server"
    
    # Check if file uses NextRequest or NextResponse
    $usesNextRequest = $content -match "NextRequest"
    $usesNextResponse = $content -match "NextResponse"
    
    $needsUpdate = $false
    
    # Build import statement
    $imports = @()
    if ($usesNextRequest -and -not $hasNextRequest) {
        $imports += "NextRequest"
        $needsUpdate = $true
    }
    if ($usesNextResponse -and -not $hasNextResponse) {
        $imports += "NextResponse"  
        $needsUpdate = $true
    }
    
    if ($needsUpdate -and $imports.Count -gt 0) {
        $importStatement = "import { $($imports -join ', ') } from 'next/server';"
        
        # Find where to insert the import
        if ($content -match "^import.*") {
            # Insert after last import
            $lines = $content -split "`n"
            $lastImportIndex = -1
            for ($i = 0; $i -lt $lines.Length; $i++) {
                if ($lines[$i] -match "^import.*") {
                    $lastImportIndex = $i
                }
            }
            if ($lastImportIndex -ge 0) {
                $lines = $lines[0..$lastImportIndex] + $importStatement + $lines[($lastImportIndex + 1)..($lines.Length - 1)]
                $content = $lines -join "`n"
            } else {
                $content = $importStatement + "`n" + $content
            }
        } else {
            # No imports found, add at the top
            $content = $importStatement + "`n" + $content
        }
        
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "  ✅ Added: $($imports -join ', ')" -ForegroundColor Green
        $fixedFiles++
    } else {
        Write-Host "  ⏭️  No changes needed" -ForegroundColor Gray
        $skippedFiles++
    }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Files processed: $($apiRoutes.Count)" -ForegroundColor White
Write-Host "Files fixed: $fixedFiles" -ForegroundColor Green
Write-Host "Files skipped: $skippedFiles" -ForegroundColor Yellow