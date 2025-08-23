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

        game.settings.register(this.id, 'autoCalculateHP', {
            name: 'Auto-calculate HP on creation',
            hint: 'Automatically calculate HP for new characters based on Vigor',
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
        
        // Add custom buttons and handlers
        Hooks.on('renderActorSheet', this.addHPControls.bind(this));
        
        // Override templates
        this.setupTemplateOverrides();
    }

    setupTemplateOverrides() {
        // Override the character summary template to include HP
        const originalSummaryTemplate = Handlebars.partials['swade.character-summary'];
        if (originalSummaryTemplate) {
            Handlebars.registerPartial('swade.character-summary', this.getCharacterSummaryTemplate());
        }
        
        // Override NPC sheet template to include HP
        this.overrideNPCTemplate();
    }

    getCharacterSummaryTemplate() {
        return `
            <div class='fatigue-wrapper'>
              <header class='counter-header'>
                <button type='button' class='adjust-counter' data-action='fatigue-minus'>
                  <i class='fa-solid fa-minus fa-lg'></i>
                </button>
                <span class='label'>{{localize 'SWADE.Fatigue'}}</span>
                <button type='button' class='adjust-counter' data-action='fatigue-plus'>
                  <i class='fa-solid fa-plus fa-lg'></i>
                </button>
              </header>
              <div class='fatigue'>
                <span class='values'>
                  <input
                    type='number'
                    min='0'
                    name='system.fatigue.value'
                    value='{{actor.system.fatigue.value}}'
                    data-dtype='Number'
                  />/{{actor.system.fatigue.max}}
                </span>
              </div>
            </div>
            <div class='wounds-wrapper'>
              <header class='counter-header'>
                <button type='button' class='adjust-counter' data-action='wounds-minus'>
                  <i class='fa-solid fa-minus fa-lg'></i>
                </button>
                <span class='label'>{{localize 'SWADE.Wounds'}}</span>
                <button type='button' class='adjust-counter' data-action='wounds-plus'>
                  <i class='fa-solid fa-plus fa-lg'></i>
                </button>
              </header>
              <div class='wounds'>
                <span class='values'>
                  <input
                    type='number'
                    min='0'
                    name='system.wounds.value'
                    value='{{actor.system.wounds.value}}'
                    data-dtype='Number'
                  />/{{actor.system.wounds.max}}
                </span>
              </div>
            </div>
            {{#if (and (eq actor.type "character") (or actor.system.hitPoints (eq actor.system.hitPoints undefined)))}}
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
                  />/{{actor.system.hitPoints.max}}
                </span>
              </div>
              <button type='button' class='hp-advance-button' data-action='roll-hp-advance' 
                      title="{{localize 'SWADE_HP.AdvanceButtonTooltip'}}">
                {{localize 'SWADE_HP.AdvanceButton'}}
              </button>
            </div>
            {{/if}}
            <div class='status'>
              <label class='check-container'>
                {{localize 'SWADE.Shaken'}}
                <input
                  type='checkbox'
                  data-id='shaken'
                  data-key='isShaken'
                  {{checked actor.system.status.isShaken}}
                />
                <span class='checkmark'></span>
              </label>
              <label class='check-container'>
                {{localize 'SWADE.Distr'}}
                <input
                  type='checkbox'
                  data-id='distracted'
                  data-key='isDistracted'
                  {{checked actor.system.status.isDistracted}}
                />
                <span class='checkmark'></span>
              </label>
              <label class='check-container'>
                {{localize 'SWADE.Vuln'}}
                <input
                  type='checkbox'
                  data-id='vulnerable'
                  data-key='isVulnerable'
                  {{checked actor.system.status.isVulnerable}}
                />
                <span class='checkmark'></span>
              </label>
            </div>
            <div class='status'>
              <label class='check-container'>
                {{localize 'SWADE.Stunned'}}
                <input
                  type='checkbox'
                  data-id='stunned'
                  data-key='isStunned'
                  {{checked actor.system.status.isStunned}}
                />
                <span class='checkmark'></span>
              </label>
              <label class='check-container'>
                {{localize 'SWADE.Entangled'}}
                <input
                  type='checkbox'
                  data-id='entangled'
                  data-key='isEntangled'
                  {{checked actor.system.status.isEntangled}}
                />
                <span class='checkmark'></span>
              </label>
              <label class='check-container'>
                {{localize 'SWADE.Bound'}}
                <input
                  type='checkbox'
                  data-id='bound'
                  data-key='isBound'
                  {{checked actor.system.status.isBound}}
                />
                <span class='checkmark'></span>
              </label>
            </div>
            {{#if actor.isWildcard}}
              <div class='bennies'>
                <header class='counter-header'>
                  <button type='button' class='adjust-counter' data-action='spend-benny'>
                    <i class='fa-solid fa-minus fa-lg'></i>
                  </button>
                  <span class='label'>{{actor.system.bennies.value}}
                    {{localize 'SWADE.Bennies'}}</span>
                  <button type='button' class='adjust-counter' data-action='get-benny'>
                    <i class='fa-solid fa-plus fa-lg'></i>
                  </button>
                </header>
                {{#each currentBennies as |benny|}}
                  {{#unless (gte @index 5)}}
                    <span
                      title='{{localize "SWADE.BenniesSpend"}}'
                      class='benny adjust-counter'
                      data-action='spend-benny'
                      style='z-index: {{@index}}; grid-column: {{benny}} / span 8; background-image: url({{@root.bennyImageURL}});'
                    ></span>
                  {{/unless}}
                {{/each}}
              </div>
            {{/if}}
        `;
    }

    overrideNPCTemplate() {
        // This would require more complex template manipulation
        // For now, we'll use the dynamic injection approach for NPCs
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

        // Auto-calculate initial HP if enabled
        if (game.settings.get(this.id, 'autoCalculateHP') && actor.type === 'character') {
            const vigorDie = createData.system.attributes?.vigor?.die?.sides || 6;
            createData.system.hitPoints.max = vigorDie;
            createData.system.hitPoints.current = vigorDie;
            createData.system.hitPoints.hitDie = vigorDie;
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
        
        // Add HP display to NPC sheets (characters use template override)
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
        
        if (actor.type !== 'character') {
            ui.notifications.warn('HP advances are only available for player characters.');
            return;
        }
        
        await this.rollHPForAdvance(actor);
    }

    async initializeExistingActors() {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Initialize HP for existing actors that don't have it
        const actors = game.actors.filter(actor => !actor.system.hitPoints);
        
        for (const actor of actors) {
            const hpData = {
                current: 0,
                max: 0,
                hitDie: 0
            };
            
            if (actor.type === 'character') {
                const vigorDie = actor.system.attributes?.vigor?.die?.sides || 6;
                hpData.max = vigorDie;
                hpData.current = vigorDie;
                hpData.hitDie = vigorDie;
            }
            
            await actor.update({ 'system.hitPoints': hpData });
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
    new SWADEHPSystem();
});

// Export for potential use by other modules
window.SWADEHPSystem = SWADEHPSystem;
