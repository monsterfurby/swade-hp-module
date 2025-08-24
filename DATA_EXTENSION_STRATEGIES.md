# SWADE HP Module - Data Extension Strategies

## Overview

This document outlines different strategies for extending SWADE's actor data system to include Hit Points (HP) values. The challenge is to integrate our HP system with SWADE's existing data preparation without creating conflicts or parallel structures.

## The Problem

When extending SWADE's data system, we face several challenges:

1. **Parallel Data Structures**: Both SWADE core and our module trying to manage the same data
2. **Timing Conflicts**: Our data preparation conflicting with SWADE's `prepareData` method
3. **Data Persistence**: Ensuring HP values survive page refreshes and server updates
4. **Integration**: Making our HP system work seamlessly with SWADE's existing features

## Strategy Options

### Option 1: Man-in-the-Middle Interception (Recommended)

**Approach**: Intercept SWADE's `prepareData` method and inject our HP data at the right moment.

```javascript
extendDataSchema() {
    if (game.swade && game.swade.Actor) {
        const originalPrepareData = game.swade.Actor.prototype.prepareData;
        
        game.swade.Actor.prototype.prepareData = function() {
            // Call SWADE's original prepareData first
            const result = originalPrepareData.call(this);
            
            // Now inject our HP data AFTER SWADE has done its work
            if (this.type === 'character' && game.settings.get('swade-hp-module', 'enableHP')) {
                if (!this.system.hitPoints) {
                    this.system.hitPoints = {
                        current: 0,
                        max: 0,
                        hitDie: 0
                    };
                }
            }
            
            return result;
        };
    }
}
```

**Pros**:
- Works with SWADE's existing data flow
- Ensures our data is injected at the right time
- No parallel structures
- Most reliable approach

**Cons**:
- Requires understanding of SWADE's internal data flow
- May break if SWADE changes their `prepareData` implementation

**When to Use**: Primary approach for data integration

---

### Option 2: Hook into SWADE's Data Preparation

**Approach**: Use Foundry VTT hooks to inject data during SWADE's preparation process.

```javascript
// Hook into SWADE's data preparation
Hooks.on('prePrepareActorData', (actor) => {
    if (actor.type === 'character' && game.settings.get('swade-hp-module', 'enableHP')) {
        if (!actor.system.hitPoints) {
            actor.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }
});
```

**Pros**:
- Uses Foundry's official hook system
- Less likely to break with SWADE updates
- Clean separation of concerns

**Cons**:
- Depends on SWADE using the `prePrepareActorData` hook
- May not provide enough control over timing

**When to Use**: When SWADE provides appropriate hooks for data preparation

---

### Option 3: Extend Foundry's Data Schema

**Approach**: Extend the actor's data schema directly to include HP fields.

```javascript
// Extend the actor's data schema
if (game.swade && game.swade.Actor) {
    game.swade.Actor.prototype.schema = {
        ...game.swade.Actor.prototype.schema,
        system: {
            ...game.swade.Actor.prototype.schema.system,
            hitPoints: {
                current: { type: Number, default: 0 },
                max: { type: Number, default: 0 },
                hitDie: { type: Number, default: 0 }
            }
        }
    };
}
```

**Pros**:
- Integrates at the schema level
- Provides type safety and defaults
- Most "official" approach

**Cons**:
- Requires deep understanding of Foundry's schema system
- May conflict with SWADE's schema extensions
- Complex to implement correctly

**When to Use**: When you need type safety and schema-level integration

---

### Option 4: Hook into Actor Lifecycle Events

**Approach**: Ensure HP data exists during actor creation and updates.

```javascript
// Ensure HP data exists when actors are created
Hooks.on('preCreateActor', (actor, createData) => {
    if (actor.type === 'character' && game.settings.get('swade-hp-module', 'enableHP')) {
        if (!createData.system.hitPoints) {
            createData.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }
});

// Ensure HP data exists when actors are updated
Hooks.on('preUpdateActor', (actor, changeData) => {
    if (actor.type === 'character' && game.settings.get('swade-hp-module', 'enableHP')) {
        if (!changeData.system) changeData.system = {};
        if (!changeData.system.hitPoints && !actor.system.hitPoints) {
            changeData.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }
});
```

**Pros**:
- Works with Foundry's official actor lifecycle
- Ensures data exists at creation time
- Handles updates properly

**Cons**:
- May miss data preparation during other operations
- Requires handling multiple hook points

**When to Use**: As a backup or complementary approach

---

### Option 5: Template-Level Data Injection

**Approach**: Inject HP data only at the template level during `getData()`.

```javascript
async getData() {
    const data = await super.getData();
    
    // Ensure HP data structure exists in template data
    if (data.actor && data.actor.system) {
        if (!data.actor.system.hitPoints) {
            data.actor.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }
    
    return data;
}
```

**Pros**:
- Simple to implement
- No conflicts with SWADE's data preparation
- Works for display purposes

**Cons**:
- Data doesn't persist to server
- Requires separate persistence mechanism
- Not a complete solution

**When to Use**: Only for display purposes, must be combined with persistence strategy

---

## Recommended Implementation Strategy

### Primary Approach: Man-in-the-Middle + Lifecycle Hooks

1. **Use Option 1** (Man-in-the-Middle) as the primary data injection method
2. **Use Option 4** (Lifecycle Hooks) as a backup to ensure data exists during creation/updates
3. **Use Option 5** (Template Injection) for display purposes

### Implementation Order:

1. Implement lifecycle hooks first (safest)
2. Add man-in-the-middle interception
3. Ensure template data injection works
4. Test thoroughly with SWADE updates

### Fallback Strategy:

If man-in-the-middle approach fails:
1. Fall back to lifecycle hooks only
2. Use template injection for display
3. Implement robust error handling

## Testing Considerations

### What to Test:

1. **Data Persistence**: HP values survive page refresh
2. **SWADE Compatibility**: HP system works with SWADE features
3. **Update Conflicts**: HP updates don't break SWADE updates
4. **Performance**: No significant performance impact
5. **Error Handling**: Graceful degradation if SWADE changes

### Test Scenarios:

1. Create new character → Check HP data exists
2. Update HP values → Check persistence
3. Use SWADE features → Check no conflicts
4. Page refresh → Check HP values remain
5. SWADE update → Check compatibility

## Troubleshooting

### Common Issues:

1. **HP values reset to 0**: Data structure not being created on actor
2. **SWADE features break**: Our extension interfering with SWADE's data
3. **Performance issues**: Too many data preparation calls
4. **Update conflicts**: Parallel data structures

### Debug Steps:

1. Check if `prepareData` is being called
2. Verify HP data structure exists on actor
3. Test with SWADE features disabled
4. Monitor console for errors
5. Check Foundry VTT logs

## Future Considerations

### SWADE Updates:

- Monitor SWADE changelog for `prepareData` changes
- Test with SWADE beta versions
- Maintain compatibility matrix

### Foundry VTT Updates:

- Monitor Foundry VTT changelog for schema changes
- Test with Foundry VTT beta versions
- Update implementation as needed

### Alternative Approaches:

- Consider using SWADE's official extension points if available
- Monitor for new Foundry VTT data management features
- Evaluate if HP should be a core SWADE feature

## Conclusion

The man-in-the-middle approach provides the best balance of reliability and integration. However, a multi-layered approach using lifecycle hooks as backup provides the most robust solution. Always test thoroughly and maintain compatibility with both SWADE and Foundry VTT updates.
