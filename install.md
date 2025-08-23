# Manual Installation Guide

Since automatic installation from GitHub may not work properly, here's how to install the module manually:

## Method 1: Direct Download from GitHub

1. **Download the module files:**
   - Go to: https://github.com/monsterfurby/swade-hp-module
   - Click the green "Code" button
   - Select "Download ZIP"
   - Extract the ZIP file

2. **Install in Foundry VTT:**
   - Copy the `swade-hp-module` folder (not the ZIP file)
   - Paste it into your Foundry VTT modules directory:
     - Windows: `%APPDATA%/FoundryVTT/Data/modules/`
     - macOS: `~/Library/Application Support/FoundryVTT/Data/modules/`
     - Linux: `~/.local/share/FoundryVTT/Data/modules/`

3. **Enable the module:**
   - Start/restart Foundry VTT
   - Go to your world settings
   - Navigate to "Add-on Modules"
   - Find "SWADE Classic HP System" and enable it
   - Click "Save Changes"

## Method 2: Clone from GitHub

If you have Git installed:

```bash
# Navigate to your Foundry VTT modules directory
cd "path/to/FoundryVTT/Data/modules/"

# Clone the repository
git clone https://github.com/monsterfurby/swade-hp-module.git

# Enable the module in Foundry VTT as described above
```

## Method 3: Manual File Copy

1. **Download individual files:**
   - Download each file from the GitHub repository
   - Create a folder named `swade-hp-module` in your modules directory
   - Copy the files maintaining the folder structure:
     ```
     swade-hp-module/
     ├── module.json
     ├── scripts/hp-system.js
     ├── styles/hp-styles.css
     ├── lang/en.json
     └── templates/character-summary-override.hbs
     ```

2. **Enable the module as described above**

## Troubleshooting

### Module Not Appearing
- Check that the folder is named exactly `swade-hp-module`
- Ensure `module.json` is in the root of the folder
- Restart Foundry VTT after installation

### HP Not Showing
- Verify the module is enabled in world settings
- Check that "Enable Classic HP System" is turned on in module settings
- Refresh character sheets after enabling

### Console Errors
- Check the browser console for any JavaScript errors
- Ensure all files are present and properly named
- Verify Foundry VTT and SWADE system versions are compatible

## File Structure Verification

Your module folder should look like this:
```
swade-hp-module/
├── module.json
├── scripts/
│   └── hp-system.js
├── styles/
│   └── hp-styles.css
├── lang/
│   └── en.json
└── templates/
    └── character-summary-override.hbs
```

## Support

If you continue to have issues:
1. Check the browser console for error messages
2. Verify all files are present and properly named
3. Try a fresh installation by removing the module folder and reinstalling
4. Create an issue on GitHub with your Foundry VTT and SWADE system versions
