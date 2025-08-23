# PowerShell script to verify Foundry VTT module installation
# Run this script to check if the module is properly installed

Write-Host "SWADE HP Module Installation Verification" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if we're in the module directory
if (-not (Test-Path "module.json")) {
    Write-Host "❌ Error: module.json not found. Please run this script from the swade-hp-module directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found module.json" -ForegroundColor Green

# Check required files
$requiredFiles = @(
    "module.json",
    "scripts/hp-system.js",
    "styles/hp-styles.css",
    "lang/en.json",
    "templates/character-summary-override.hbs"
)

$allFilesPresent = $true

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing $file" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if ($allFilesPresent) {
    Write-Host "`n🎉 All required files are present!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Copy this entire folder to your Foundry VTT modules directory" -ForegroundColor White
    Write-Host "2. Restart Foundry VTT" -ForegroundColor White
    Write-Host "3. Enable the module in your world settings" -ForegroundColor White
    Write-Host "4. Configure module settings as desired" -ForegroundColor White
} else {
    Write-Host "`n❌ Some required files are missing. Please ensure all files are present." -ForegroundColor Red
    exit 1
}

# Show module.json content for verification
Write-Host "`n📋 Module Information:" -ForegroundColor Cyan
$moduleJson = Get-Content "module.json" | ConvertFrom-Json
Write-Host "  Name: $($moduleJson.title)" -ForegroundColor White
Write-Host "  Version: $($moduleJson.version)" -ForegroundColor White
Write-Host "  ID: $($moduleJson.id)" -ForegroundColor White
Write-Host "  Foundry VTT Compatibility: $($moduleJson.compatibility.minimum)+" -ForegroundColor White
