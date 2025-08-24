/**
 * SWADE Classic HP System Module
 * Adds classic hit points to the SWADE system using Vigor as the hit die
 * Compatible with Foundry VTT v13 ApplicationV2 framework
 */

console.log('SWADE HP Module: Script file loaded!');
console.log('SWADE HP Module: About to register ready hook');

class SWADEHPSystem {
    constructor() {
        this.id = 'swade-hp-module';
    }

    init() {
        console.log('SWADE HP Module: Initializing...');
        
        // Register module settings
        this.registerSettings();
        
        // Extend SWADE's data schema to include HP data structure
        this.extendDataSchema();
        
        // Set up hooks for actor creation and updates
        this.setupHooks();
        
        // Register custom sheet after SWADE is ready
        this.waitForSWADE();
    }

    registerSettings() {
        game.settings.register(this.id, 'enableHP', {
            name: 'Enable Classic HP System',
            hint: 'Adds classic hit points to SWADE characters',
            scope: 'world',
            config: true,
            default: true,
            type: Boolean
        });
    }

    extendDataSchema() {
        console.log('SWADE HP Module: Extending SWADE data schema...');
        
        // Extend the SWADE actor data schema to include HP data structure
        if (game.swade && game.swade.Actor) {
            // Extend the actor data schema
            const originalPrepareData = game.swade.Actor.prototype.prepareData;
            game.swade.Actor.prototype.prepareData = function() {
                // Call the original method
                const result = originalPrepareData.call(this);
                
                // Ensure HP data structure exists in the system data
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
            
            console.log('SWADE HP Module: Successfully extended SWADE actor data schema');
        } else {
            console.warn('SWADE HP Module: Could not extend data schema - SWADE Actor not found');
        }
    }

    async waitForSWADE() {
        console.log('SWADE HP Module: Waiting for SWADE to be ready...');
        
        // Wait for SWADE to be ready
        await new Promise(resolve => {
            if (game.swade && game.swade.sheets && game.swade.sheets.CharacterSheet) {
                resolve();
            } else {
                Hooks.once('swadeReady', resolve);
            }
        });
        
        console.log('SWADE HP Module: SWADE is ready, registering custom sheet...');
        await this.registerCustomSheet();
    }

    async registerCustomSheet() {
        console.log('SWADE HP Module: Registering custom character sheet...');
        
        // Register the partial first
        await this.registerPartial();
        
        // Create and register the custom sheet class
        this.createCustomSheetClass();
    }

    async registerPartial() {
        console.log('SWADE HP Module: Registering custom partial...');
        
        try {
            // Use Foundry's template loading system
            await foundry.applications.handlebars.loadTemplates({
                'swade-hp-module.character-tab-summary': 'modules/swade-hp-module/templates/actors/character/tabs/summary.hbs'
            });
            
            console.log('SWADE HP Module: Successfully registered custom partial');
        } catch (error) {
            console.error('SWADE HP Module: Failed to register partial:', error);
        }
    }

    createCustomSheetClass() {
        console.log('SWADE HP Module: Creating custom sheet class...');
        
        // Create a custom character sheet that extends SWADE's character sheet
        class SWADEHPCharacterSheet extends game.swade.sheets.CharacterSheet {
            static get defaultOptions() {
                return foundry.utils.mergeObject(super.defaultOptions, {
                    template: 'modules/swade-hp-module/templates/actors/character/sheet.hbs'
                });
            }

            async getData() {
                const data = await super.getData();
                
                // Ensure HP data structure exists (this should now be handled by the data schema extension)
                if (data.actor && data.actor.system && !data.actor.system.hitPoints) {
                    data.actor.system.hitPoints = {
                        current: 0,
                        max: 0,
                        hitDie: 0
                    };
                }
                
                // Add HP data to the main data object for template access
                if (data.actor && data.actor.system && data.actor.system.hitPoints) {
                    data.hitPoints = data.actor.system.hitPoints;
                }
                
                return data;
            }

            activateListeners(html) {
                super.activateListeners(html);
                
                // Let Foundry handle form submission automatically - no custom overrides needed
                console.log('SWADE HP Module: Form listeners activated - using Foundry\'s built-in form handling');
            }
        }

        // Register the custom sheet
        foundry.documents.collections.Actors.registerSheet('character', SWADEHPCharacterSheet, {
            id: 'swade.SWADEHPCharacterSheet',
            label: 'SWADE HP Module Sheet',
            makeDefault: false
        });
        
        console.log('SWADE HP Module: Custom sheet registered successfully');
    }

    // Hook into actor creation to initialize HP data
    onPreCreateActor(actor, createData, options, userId) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        if (actor.type !== 'character') return;
        
        // Initialize HP data structure for new characters
        if (!createData.system) {
            createData.system = {};
        }
        
        if (!createData.system.hitPoints) {
            createData.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }

    // Hook into actor updates to ensure HP data exists
    onPreUpdateActor(actor, changeData, options, userId) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        if (actor.type !== 'character') return;
        
        // Ensure HP data structure exists in change data
        if (!changeData.system) {
            changeData.system = {};
        }
        
        if (!changeData.system.hitPoints && !actor.system.hitPoints) {
            changeData.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }

    // Hook into advance system
    onAdvanceCheck(actor, changeData, options, userId) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        if (actor.type !== 'character') return;
        
        // Check if advances increased
        if (changeData.system?.advances?.value && 
            changeData.system.advances.value > (actor.system.advances?.value || 0)) {
            
            // Schedule HP roll for after the update
            setTimeout(() => this.rollHPForAdvance(actor), 100);
        }
    }

    async rollHPForAdvance(actor) {
        if (!actor.system.hitPoints) return;
        
        const vigorDie = actor.system.attributes.vigor.die.sides;
        const roll = new Roll(`1d${vigorDie}`);
        const result = await roll.evaluate();
        
        const newMaxHP = actor.system.hitPoints.max + result.total;
        const newCurrentHP = Math.min(actor.system.hitPoints.current + result.total, newMaxHP);
        
        await actor.update({
            'system.hitPoints.max': newMaxHP,
            'system.hitPoints.current': newCurrentHP
        });
        
        // Show roll result
        const message = game.i18n.format('SWADE_HP.AdvanceHitPointsMessage', [vigorDie, result.total]);
        const totalMessage = game.i18n.format('SWADE_HP.AdvanceHitPointsTotal', [newMaxHP]);
        
        ui.notifications.info(`${message} ${totalMessage}`);
        
        // Create chat message with roll
        const chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: `<div class="hp-advance-roll">
                <h3>${game.i18n.localize('SWADE_HP.AdvanceHitPoints')}</h3>
                <p>${message}</p>
                <p><strong>${totalMessage}</strong></p>
                <div class="dice-roll">
                    <div class="dice-result">
                        <h4 class="dice-total">${result.total}</h4>
                    </div>
                </div>
            </div>`
        };
        
        ChatMessage.create(chatData);
    }

    // NPC HP display (simpler approach for NPCs)
    onRenderActorSheet(app, html, data) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Only handle NPCs here - characters use custom sheet
        if (data.actor.type === 'npc') {
            this.addNPCHPDisplay(html, data);
        }
    }

    addNPCHPDisplay(html, data) {
        const hpData = data.actor.system.hitPoints || { current: 0, max: 0 };
        
        // Find the vitals section to add HP
        const vitalsSection = html.find('.vitals');
        if (vitalsSection.length > 0) {
            const hpHTML = `
                <div class="npc-hp-container">
                    <span class="npc-hp-label">${game.i18n.localize('SWADE_HP.HitPoints')}</span>
                    <div class="npc-hp-inputs">
                        <input
                            type="number"
                            name="system.hitPoints.current"
                            value="${hpData.current}"
                            data-dtype="Number"
                            class="vitals-input"
                        />
                        <span class="seperator">/</span>
                        <input
                            type="number"
                            name="system.hitPoints.max"
                            value="${hpData.max}"
                            data-dtype="Number"
                            class="vitals-input"
                        />
                    </div>
                </div>
            `;
            
            vitalsSection.append(hpHTML);
        }
    }

    // Utility function to roll a hit die
    static async rollHitDie(sides) {
        const roll = new Roll(`1d${sides}`);
        const result = await roll.evaluate();
        return result.total;
    }

    // Utility function to calculate max HP for a character
    static calculateMaxHP(actor) {
        if (!actor.system.hitPoints) return 0;
        
        const baseHP = actor.system.hitPoints.hitDie || 0;
        const advances = actor.system.advances?.value || 0;
        
        // For simplicity, we'll assume each advance adds the current Vigor die
        // In practice, this should be tracked per advance
        return baseHP + (advances * (actor.system.attributes?.vigor?.die?.sides || 6));
    }
}

// Initialize the module when Foundry is ready
Hooks.once('ready', () => {
    console.log('SWADE HP Module: Ready hook fired, initializing module...');
    const system = new SWADEHPSystem();
    system.init();
});

// Export for potential use by other modules
window.SWADEHPSystem = SWADEHPSystem;