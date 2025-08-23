# SWADE Classic HP System Module

A Foundry VTT module that adds classic Hit Points to the Savage Worlds Adventure Edition (SWADE) system.

## Features

### Classic Hit Point System
- **Vigor as Hit Die**: HP starts at the maximum roll of the character's Vigor die
- **Advancement System**: Each advance adds another hit die roll (using current Vigor value)
- **NPC Support**: NPCs can have arbitrary HP values set by the GM
- **Automatic Calculation**: New characters automatically get HP based on their Vigor

### User Interface
- **Custom Character Sheet**: Modified SWADE character sheet with integrated HP tracking
- **HP Counter**: Prominent HP display with current/max values and +/- buttons
- **Smaller Wounds**: Compact wounds display to make room for HP
- **Advance Button**: Manual HP advancement for characters
- **NPC Sheets**: HP input fields for easy GM management
- **Visual Integration**: Matches SWADE's existing UI style

### Game Master Tools
- **Module Settings**: Enable/disable HP system and auto-calculation
- **Chat Integration**: HP advancement rolls appear in chat with dice results
- **Notification System**: Clear feedback when HP changes occur

## Installation

### Automatic Installation (Recommended)

1. **Open Foundry VTT** and go to your world
2. **Go to Module Management** in your world settings
3. **Click "Install Module"**
4. **Enter the Manifest URL:**
   ```
   https://raw.githubusercontent.com/monsterfurby/swade-hp-module/main/module.json
   ```
5. **Click "Install"**
6. **Enable the module** in your world's Add-on Modules list
7. **Click "Save Changes"**

### Manual Installation (Alternative)

If automatic installation doesn't work:

1. **Download from GitHub:**
   - Go to: https://github.com/monsterfurby/swade-hp-module
   - Click the green "Code" button
   - Select "Download ZIP"
   - Extract the ZIP file to a temporary location

2. **Install in Foundry VTT:**
   - Copy the `swade-hp-module` folder (not the ZIP file)
   - Paste it into your Foundry VTT modules directory:
     - Windows: `%APPDATA%/FoundryVTT/Data/modules/`
     - macOS: `~/Library/Application Support/FoundryVTT/Data/modules/`
     - Linux: `~/.local/share/FoundryVTT/Data/modules/`

3. **Enable the module** as described above

### Alternative: Git Clone
If you have Git installed:
```bash
cd "path/to/FoundryVTT/Data/modules/"
git clone https://github.com/monsterfurby/swade-hp-module.git
```

### Module Settings
- **Enable Classic HP System**: Toggle the HP system on/off
- **Auto-calculate HP on creation**: Automatically set initial HP for new characters

## Usage

### For Players
1. **Character Creation**: HP is automatically calculated based on Vigor die
2. **HP Management**: Use +/- buttons or type directly in the HP field
3. **Advancement**: When you advance, HP automatically increases with a hit die roll
4. **Manual Advancement**: Use the "Roll HP for Advance" button for manual HP rolls
5. **Character Sheet**: The module provides a modified character sheet with integrated HP tracking

### For Game Masters
1. **NPC Management**: Set arbitrary HP values for NPCs using the input fields
2. **Module Control**: Enable/disable the system and auto-calculation in settings
3. **Monitoring**: HP changes and advancement rolls appear in chat

## How It Works

### Character HP Calculation
- **Starting HP**: Maximum value of Vigor die (e.g., d6 = 6 HP, d8 = 8 HP)
- **Advancement**: Each advance rolls the current Vigor die and adds to max HP
- **Example**: A character with d6 Vigor starts with 6 HP, advances to 7 HP, then 9 HP, etc.

### NPC HP
- **Arbitrary Values**: GMs can set any HP value for NPCs
- **No Auto-calculation**: NPCs don't automatically get HP based on attributes
- **Flexible Management**: Easy to adjust HP for different NPC types

### Data Structure
The module adds a `hitPoints` object to actor data:
```json
{
  "system": {
    "hitPoints": {
      "current": 6,
      "max": 6,
      "hitDie": 6
    }
  }
}
```

## Compatibility

- **Foundry VTT**: Version 13+
- **SWADE System**: Version 5.0.0+
- **Other Modules**: Should work with most SWADE-compatible modules

## Troubleshooting

### HP Not Appearing
1. Check that the module is enabled in world settings
2. Verify the "Enable Classic HP System" setting is turned on
3. Refresh character sheets after enabling the module

### HP Not Updating on Advance
1. Ensure the character has the HP data structure
2. Check that the advance is properly recorded in the character sheet
3. Use the manual "Roll HP for Advance" button if needed

### NPC HP Issues
1. NPCs need manual HP entry - they don't auto-calculate
2. Make sure to set both current and max HP values
3. Refresh the NPC sheet after making changes

## Development

### Extending the Module
The module exports `SWADEHPSystem` class for other modules to use:
```javascript
// Access the HP system
const hpSystem = window.SWADEHPSystem;

// Roll a hit die
const result = await hpSystem.rollHitDie(6);

// Calculate max HP for an actor
const maxHP = hpSystem.calculateMaxHP(actor);
```

### Customization
- Modify `hp-styles.css` to change the visual appearance
- Update `lang/en.json` to change text strings
- Extend `hp-system.js` to add new functionality

## License

This module is provided as-is for use with Foundry VTT and the SWADE system.

## Support

For issues, questions, or feature requests, please create an issue in the module repository.

## Changelog

### Version 1.0.0
- Initial release
- Classic HP system with Vigor-based hit dice
- Character and NPC support
- Automatic advancement integration
- UI integration with SWADE sheets
