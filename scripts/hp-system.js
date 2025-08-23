/**
 * SWADE Classic HP System Module
 * Adds classic hit points to the SWADE system using Vigor as the hit die
 * Compatible with Foundry VTT v13 ApplicationV2 framework
 */

class SWADEHPSystem {
    constructor() {
        this.id = 'swade-hp-module';
        this.init();
    }

    init() {
        console.log('SWADE HP Module: Initializing...');
        
        // Register module settings
        this.registerSettings();
        console.log('SWADE HP Module: Settings registered');
        
        // Hook into SWADE system
        this.setupHooks();
        console.log('SWADE HP Module: Hooks set up');
        
        // Initialize HP for existing actors
        this.initializeExistingActors();
        console.log('SWADE HP Module: Initialization complete');
    }

    registerSettings() {
        game.settings.register(this.id, 'enableHP', {
            name: 'Enable Classic HP System',
            hint: 'Adds classic hit points to characters and NPCs',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });
    }

    setupHooks() {
        console.log('SWADE HP Module: Setting up hooks...');
        
        // Hook into actor creation and updates
        Hooks.on('preCreateActor', this.onPreCreateActor.bind(this));
        Hooks.on('preUpdateActor', this.onPreUpdateActor.bind(this));
        
        // Hook into advance system
        Hooks.on('preUpdateActor', this.onAdvanceCheck.bind(this));
        
        // Register custom character sheet for v13 ApplicationV2
        console.log('SWADE HP Module: Registering swadeReady hook...');
        Hooks.once('swadeReady', this.registerCustomSheet.bind(this));
        
        // Also try registering on ready as fallback
        console.log('SWADE HP Module: Registering ready hook as fallback...');
        Hooks.once('ready', () => {
            console.log('SWADE HP Module: Ready hook fired, checking if SWADE is available...');
            if (game.swade && game.swade.CharacterSheet) {
                console.log('SWADE HP Module: SWADE available on ready, registering sheet...');
                this.registerCustomSheet();
            } else {
                console.log('SWADE HP Module: SWADE not available on ready, will wait for swadeReady...');
            }
        });
        
        // Initialize HP for existing characters
        this.initializeExistingActors();
    }

    registerCustomSheet() {
        console.log('SWADE HP Module: Starting custom sheet registration...');
        
        // Debug: Check if SWADE is available
        if (!game.swade) {
            console.error('SWADE HP Module: game.swade is not available!');
            return;
        }
        
        if (!game.swade.CharacterSheet) {
            console.error('SWADE HP Module: game.swade.CharacterSheet is not available!');
            return;
        }
        
        console.log('SWADE HP Module: SWADE system found, proceeding with registration...');
        
        // Create a custom character sheet class that extends SWADE's character sheet
        class SWADEHPCharacterSheet extends game.swade.CharacterSheet {
            static get defaultOptions() {
                console.log('SWADE HP Module: Setting default options for custom sheet');
                return mergeObject(super.defaultOptions, {
                    template: 'modules/swade-hp-module/templates/actors/character/sheet.hbs'
                });
            }

            getData() {
                console.log('SWADE HP Module: Getting data for custom sheet');
                const data = super.getData();
                // Ensure HP data is available
                if (!data.actor.system.hitPoints) {
                    data.actor.system.hitPoints = { current: 0, max: 0, hitDie: 0 };
                }
                return data;
            }

            activateListeners(html) {
                console.log('SWADE HP Module: Activating listeners for custom sheet');
                super.activateListeners(html);
                
                // Add HP-specific event listeners
                html.on('click', '[data-action="hp-minus"]', this._onHPDecrease.bind(this));
                html.on('click', '[data-action="hp-plus"]', this._onHPIncrease.bind(this));
                html.on('click', '[data-action="roll-hp-advance"]', this._onManualHPAdvance.bind(this));
            }

            async _onHPDecrease(event) {
                event.preventDefault();
                const currentHP = this.actor.system.hitPoints?.current || 0;
                const newHP = Math.max(0, currentHP - 1);
                await this.actor.update({ 'system.hitPoints.current': newHP });
            }

            async _onHPIncrease(event) {
                event.preventDefault();
                const currentHP = this.actor.system.hitPoints?.current || 0;
                const maxHP = this.actor.system.hitPoints?.max || 0;
                const newHP = Math.min(maxHP, currentHP + 1);
                await this.actor.update({ 'system.hitPoints.current': newHP });
            }

            async _onManualHPAdvance(event) {
                event.preventDefault();
                
                if (!this.actor.system.hitPoints) {
                    ui.notifications.error('HP system not initialized for this character.');
                    return;
                }
                
                const vigorDie = this.actor.system.attributes.vigor.die.sides;
                const roll = new Roll(`1d${vigorDie}`);
                const result = await roll.evaluate();
                
                const newMaxHP = this.actor.system.hitPoints.max + result.total;
                const newCurrentHP = Math.min(this.actor.system.hitPoints.current + result.total, newMaxHP);
                
                await this.actor.update({
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
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
        }

        // Debug: Check available registration methods
        console.log('SWADE HP Module: Available registration methods:');
        console.log('- Actors.registerSheet:', typeof Actors.registerSheet);
        console.log('- CONFIG.Actor.sheetClasses:', CONFIG.Actor.sheetClasses);
        console.log('- foundry.documents.collections.Actors.registerSheet:', typeof foundry?.documents?.collections?.Actors?.registerSheet);

        try {
            // Try the standard registration method
            console.log('SWADE HP Module: Attempting to register with Actors.registerSheet...');
            Actors.registerSheet('swade', SWADEHPCharacterSheet, {
                types: ['character'],
                makeDefault: false,
                label: 'SWADE HP Module Sheet'
            });
            console.log('SWADE HP Module: Registration successful with Actors.registerSheet');
        } catch (error) {
            console.error('SWADE HP Module: Actors.registerSheet failed:', error);
            
            try {
                // Try alternative registration method
                console.log('SWADE HP Module: Trying alternative registration method...');
                foundry.documents.collections.Actors.registerSheet('swade', SWADEHPCharacterSheet, {
                    types: ['character'],
                    makeDefault: false,
                    label: 'SWADE HP Module Sheet'
                });
                console.log('SWADE HP Module: Registration successful with foundry.documents.collections.Actors.registerSheet');
            } catch (error2) {
                console.error('SWADE HP Module: Alternative registration also failed:', error2);
                
                // Try the old method as fallback
                try {
                    console.log('SWADE HP Module: Trying CONFIG.Actor.sheetClasses method...');
                    CONFIG.Actor.sheetClasses.character['swade-hp-module'] = SWADEHPCharacterSheet;
                    console.log('SWADE HP Module: Registration successful with CONFIG.Actor.sheetClasses');
                } catch (error3) {
                    console.error('SWADE HP Module: All registration methods failed:', error3);
                }
            }
        }

        // Debug: List all registered sheets
        console.log('SWADE HP Module: Current registered sheets for character type:');
        if (CONFIG.Actor.sheetClasses.character) {
            Object.keys(CONFIG.Actor.sheetClasses.character).forEach(key => {
                console.log(`- ${key}:`, CONFIG.Actor.sheetClasses.character[key]);
            });
        }
    }

    onPreCreateActor(actor, createData, options, userId) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Initialize HP data structure
        if (!createData.system.hitPoints) {
            createData.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }

    onPreUpdateActor(actor, changeData, options, userId) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Ensure HP data structure exists
        if (!changeData.system.hitPoints && !actor.system.hitPoints) {
            changeData.system.hitPoints = {
                current: 0,
                max: 0,
                hitDie: 0
            };
        }
    }

    onAdvanceCheck(actor, changeData, options, userId) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        if (actor.type !== 'character') return;
        
        // Check if advances increased
        const oldAdvances = actor.system.advances?.value || 0;
        const newAdvances = changeData.system?.advances?.value || oldAdvances;
        
        if (newAdvances > oldAdvances) {
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

    initializeExistingActors() {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Initialize HP data structure for existing characters that don't have it
        game.actors.forEach(actor => {
            if (actor.type === 'character' && !actor.system.hitPoints) {
                actor.update({
                    'system.hitPoints': {
                        current: 0,
                        max: 0,
                        hitDie: 0
                    }
                });
                
                console.log(`SWADE HP Module: Initialized HP data structure for ${actor.name}`);
            }
        });
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
    new SWADEHPSystem();
});

// Export for potential use by other modules
window.SWADEHPSystem = SWADEHPSystem;
