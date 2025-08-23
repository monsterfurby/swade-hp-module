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
        // Register module settings
        this.registerSettings();
        
        // Hook into SWADE system
        this.setupHooks();
        
        // Initialize HP for existing actors
        this.initializeExistingActors();
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
        // Hook into actor creation and updates
        Hooks.on('preCreateActor', this.onPreCreateActor.bind(this));
        Hooks.on('preUpdateActor', this.onPreUpdateActor.bind(this));
        
        // Hook into advance system
        Hooks.on('preUpdateActor', this.onAdvanceCheck.bind(this));
        
        // Register custom character sheet for v13 ApplicationV2
        Hooks.once('swadeReady', this.registerCustomSheet.bind(this));
        
        // Initialize HP for existing characters
        this.initializeExistingActors();
    }

    registerCustomSheet() {
        // Create a custom character sheet class that extends SWADE's character sheet
        class SWADEHPCharacterSheet extends game.swade.CharacterSheet {
            static get defaultOptions() {
                return mergeObject(super.defaultOptions, {
                    template: 'modules/swade-hp-module/templates/actors/character/sheet.hbs'
                });
            }

            getData() {
                const data = super.getData();
                // Ensure HP data is available
                if (!data.actor.system.hitPoints) {
                    data.actor.system.hitPoints = { current: 0, max: 0, hitDie: 0 };
                }
                return data;
            }

            activateListeners(html) {
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

        // Register the custom character sheet
        Actors.registerSheet('swade', SWADEHPCharacterSheet, {
            types: ['character'],
            makeDefault: false,
            label: 'SWADE HP Module Sheet'
        });

        console.log('SWADE HP Module: Custom character sheet registered');
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
