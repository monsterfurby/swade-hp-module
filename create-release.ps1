# PowerShell script to create a Foundry VTT module release ZIP
# Run this script from the swade-hp-module directory

$version = "1.0.0"
$zipName = "swade-hp-module-v$version.zip"

Write-Host "Creating Foundry VTT module release: $zipName" -ForegroundColor Green

# Remove existing ZIP if it exists
if (Test-Path $zipName) {
    Remove-Item $zipName
    Write-Host "Removed existing $zipName" -ForegroundColor Yellow
}

# Create ZIP with only the necessary files for Foundry VTT
Compress-Archive -Path @(
    "module.json",
    "scripts/",
    "styles/",
    "lang/",
    "templates/"
) -DestinationPath $zipName

Write-Host "Created $zipName successfully!" -ForegroundColor Green
Write-Host "Files included:" -ForegroundColor Cyan
Write-Host "  - module.json" -ForegroundColor White
Write-Host "  - scripts/hp-system.js" -ForegroundColor White
Write-Host "  - styles/hp-styles.css" -ForegroundColor White
Write-Host "  - lang/en.json" -ForegroundColor White
Write-Host "  - templates/character-summary-override.hbs" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Upload $zipName to your GitHub release" -ForegroundColor White
Write-Host "2. Update the download URL in module.json if needed" -ForegroundColor White
Write-Host "3. Test the module installation in Foundry VTT" -ForegroundColor White
