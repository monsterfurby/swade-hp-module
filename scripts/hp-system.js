/**
 * SWADE Classic HP System Module
 * Adds classic hit points to the SWADE system using Vigor as the hit die
 */

class SWADEHPSystem {
    constructor() {
        this.id = 'swade-hp-module';
        this.init();
    }

    init() {
        // Register module settings
        this.registerSettings();
        
        // Register Handlebars partials
        this.registerPartials();
        
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

    registerPartials() {
        // Register a partial for the HP display
        Handlebars.registerPartial('hp-display', `
            {{#if (and actor.system.hitPoints (eq actor.type "character"))}}
            <div class='hp-wrapper'>
                <header class='counter-header'>
                    <button type='button' class='adjust-counter' data-action='hp-minus'>
                        <i class='fa-solid fa-minus fa-lg'></i>
                    </button>
                    <span class='label'>{{localize 'SWADE_HP.HitPoints'}}</span>
                    <button type='button' class='adjust-counter' data-action='hp-plus'>
                        <i class='fa-solid fa-plus fa-lg'></i>
                    </button>
                </header>
                <div class='hp-values'>
                    <span class='values'>
                        <input
                            type='number'
                            min='0'
                            name='system.hitPoints.current'
                            value='{{actor.system.hitPoints.current}}'
                            data-dtype='Number'
                            class='hp-input'
                            placeholder='Current'
                        />/
                        <input
                            type='number'
                            min='0'
                            name='system.hitPoints.max'
                            value='{{actor.system.hitPoints.max}}'
                            data-dtype='Number'
                            class='hp-input'
                            placeholder='Max'
                        />
                    </span>
                </div>
                <button type='button' class='hp-advance-button' data-action='roll-hp-advance' 
                        title="{{localize 'SWADE_HP.AdvanceButtonTooltip'}}">
                    {{localize 'SWADE_HP.AdvanceButton'}}
                </button>
            </div>
            {{/if}}
        `);
    }

    setupHooks() {
        // Hook into actor creation and updates
        Hooks.on('preCreateActor', this.onPreCreateActor.bind(this));
        Hooks.on('preUpdateActor', this.onPreUpdateActor.bind(this));
        
        // Hook into advance system
        Hooks.on('preUpdateActor', this.onAdvanceCheck.bind(this));
        
        // Add HP display and controls to character sheets
        Hooks.on('renderActorSheet', this.onRenderActorSheet.bind(this));
        
        // Initialize HP for existing characters
        this.initializeExistingActors();
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

    onRenderActorSheet(app, html, data) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Add HP display to character sheets using partial injection
        if (data.actor.type === 'character') {
            this.injectHPDisplay(html, data);
        }
        // Add HP display to NPC sheets
        else if (data.actor.type === 'npc') {
            this.addNPCHPDisplay(html, data);
        }
        
        // Add event listeners for HP controls
        this.addHPControls(app, html, data);
    }

    injectHPDisplay(html, data) {
        // Check if HP display already exists
        if (html.find('.hp-wrapper').length > 0) return;
        
        // Find the wounds section to insert HP after it
        const woundsSection = html.find('.wounds-wrapper');
        if (woundsSection.length > 0) {
            // Render the HP partial
            const hpHTML = Handlebars.compile('{{> hp-display}}')(data);
            woundsSection.after(hpHTML);
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

    addHPControls(app, html, data) {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Add event listeners for HP controls
        html.on('click', '[data-action="hp-minus"]', this.onHPDecrease.bind(this, app));
        html.on('click', '[data-action="hp-plus"]', this.onHPIncrease.bind(this, app));
        html.on('click', '[data-action="roll-hp-advance"]', this.onManualHPAdvance.bind(this, app));
    }

    onHPDecrease(app, event) {
        event.preventDefault();
        const actor = app.actor;
        const currentHP = actor.system.hitPoints?.current || 0;
        const newHP = Math.max(0, currentHP - 1);
        
        actor.update({ 'system.hitPoints.current': newHP });
    }

    onHPIncrease(app, event) {
        event.preventDefault();
        const actor = app.actor;
        const currentHP = actor.system.hitPoints?.current || 0;
        const maxHP = actor.system.hitPoints?.max || 0;
        const newHP = Math.min(maxHP, currentHP + 1);
        
        actor.update({ 'system.hitPoints.current': newHP });
    }

    async onManualHPAdvance(app, event) {
        event.preventDefault();
        
        const actor = app.actor;
        if (!actor.system.hitPoints) {
            ui.notifications.error('HP system not initialized for this character.');
            return;
        }
        
        await this.rollHPForAdvance(actor);
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
