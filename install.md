# Installation Guide

## Quick Installation

1. **Download the Module**
   - Download all files from the `swade-hp-module` folder
   - Ensure the folder structure is maintained

2. **Install in Foundry VTT**
   - Place the entire `swade-hp-module` folder in your Foundry VTT `modules` directory
   - The path should be: `[Foundry Data]/modules/swade-hp-module/`

3. **Enable the Module**
   - Start or restart Foundry VTT
   - Go to your world settings
   - Navigate to the "Add-on Modules" tab
   - Find "SWADE Classic HP System" and enable it
   - Click "Save Changes"

4. **Configure Settings**
   - Go to "Configure Settings" in the Game Settings menu
   - Find "SWADE Classic HP System" in the module settings
   - Configure the following options:
     - **Enable Classic HP System**: Set to true (default)
     - **Auto-calculate HP on creation**: Set to true (default)

5. **Initialize Existing Characters**
   - The module will automatically initialize HP for existing characters
   - New characters will get HP automatically
   - NPCs will need manual HP entry

## File Structure

Your module folder should look like this:
```
swade-hp-module/
├── module.json
├── README.md
├── install.md
├── scripts/
│   └── hp-system.js
├── styles/
│   └── hp-styles.css
├── lang/
│   └── en.json
└── templates/
    └── character-summary-override.hbs
```

## Troubleshooting

### Module Not Appearing
- Check that the folder is in the correct `modules` directory
- Ensure `module.json` is in the root of the module folder
- Restart Foundry VTT after installation

### HP Not Showing
- Verify the module is enabled in world settings
- Check that "Enable Classic HP System" is turned on
- Refresh character sheets after enabling

### Template Issues
- Clear your browser cache
- Restart Foundry VTT
- Check the browser console for any JavaScript errors

## Updating the Module

1. **Backup Your Data**
   - Always backup your world data before updating modules

2. **Replace Files**
   - Replace the old module folder with the new one
   - Keep the same folder name: `swade-hp-module`

3. **Restart Foundry**
   - Restart Foundry VTT to load the updated module

4. **Check Settings**
   - Verify module settings are still configured as desired

## Uninstalling

1. **Disable the Module**
   - Go to world settings
   - Disable "SWADE Classic HP System"
   - Save changes

2. **Remove Files**
   - Delete the `swade-hp-module` folder from your modules directory

3. **Clean Up Data**
   - The module doesn't modify core SWADE data
   - HP data will remain but won't be functional without the module

## Support

If you encounter issues:
1. Check this installation guide
2. Review the README.md file
3. Check the browser console for error messages
4. Verify Foundry VTT and SWADE system versions are compatible
