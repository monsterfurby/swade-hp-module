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
        console.log('SWADE HP Module: Initializing with MITM approach...');
        
        // Register module settings
        this.registerSettings();
        console.log('SWADE HP Module: Settings registered');
        
        // Implement Man-in-the-Middle approach for data injection
        this.extendDataSchema();
        console.log('SWADE HP Module: MITM approach implemented');
        
        // Hook into SWADE system
        this.setupHooks();
        console.log('SWADE HP Module: Hooks set up');
        
        // Initialize HP for existing actors (backup approach)
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

    extendDataSchema() {
        console.log('SWADE HP Module: Setting up data injection...');
        
        // Override SWADE's CharacterSheet getData method to inject our HP data
        if (game.swade && game.swade.sheets && game.swade.sheets.CharacterSheet) {
            const originalGetData = game.swade.sheets.CharacterSheet.prototype.getData;
            
            game.swade.sheets.CharacterSheet.prototype.getData = async function() {
                // Call SWADE's original getData
                const data = await originalGetData.call(this);
                
                // Inject our HP data from flags into the template data
                if (data.actor && game.settings.get('swade-hp-module', 'enableHP')) {
                    // Get HP data from flags instead of system
                    const hpData = data.actor.flags['swade-hp-module']?.hitPoints || { current: 0, max: 0, hitDie: 0 };
                    data.actor.system.hitPoints = hpData;
                    console.log('SWADE HP Module: Injected HP data into SWADE getData:', data.actor.system.hitPoints);
                }
                
                return data;
            };
            
            console.log('SWADE HP Module: Successfully overrode SWADE getData');
        } else {
            console.warn('SWADE HP Module: Could not override getData - SWADE CharacterSheet not found');
        }
        
        // Also ensure HP data structure exists on the actor's actual data
        if (game.swade && game.swade.Actor) {
            const originalPrepareData = game.swade.Actor.prototype.prepareData;
            
            game.swade.Actor.prototype.prepareData = function() {
                // Call SWADE's original prepareData first
                const result = originalPrepareData.call(this);
                
                // Get HP data from flags instead of system
                if (this.type === 'character' && game.settings.get('swade-hp-module', 'enableHP')) {
                    const hpData = this.flags['swade-hp-module']?.hitPoints || { current: 0, max: 0, hitDie: 0 };
                    this.system.hitPoints = hpData;
                    console.log('SWADE HP Module: Created HP data structure on actor:', this.name);
                }
                
                return result;
            };
            
            console.log('SWADE HP Module: Successfully set up actor data structure');
        }
    }

    setupHooks() {
        console.log('SWADE HP Module: Setting up hooks...');
        
        // Register Handlebars partials
        this.registerPartials();
        
        // Hook into actor creation and updates
        Hooks.on('preCreateActor', this.onPreCreateActor.bind(this));
        Hooks.on('preUpdateActor', this.onPreUpdateActor.bind(this));
        
        // Hook into advance system
        Hooks.on('preUpdateActor', this.onAdvanceCheck.bind(this));
        
        // Debug: Monitor actor updates to see if HP data is being included
        Hooks.on('preUpdateActor', (actor, changeData, options, userId) => {
            if (actor.type === 'character') {
                console.log('SWADE HP Module: Actor update detected:', {
                    actorName: actor.name,
                    changeData: changeData,
                    hasHPData: !!changeData.system?.hitPoints
                });
            }
        });
        
        // Register custom sheet after a delay
        setTimeout(async () => {
            console.log('SWADE HP Module: Attempting to register custom sheet...');
            await this.registerCustomSheet();
        }, 1000); // Wait 1 second to ensure everything is loaded
    }

    registerPartials() {
        console.log('SWADE HP Module: Registering Handlebars partials...');
        
        // Register a helper to handle undefined HP values
        Handlebars.registerHelper('hpValue', function(value, defaultValue = 0) {
            return value !== undefined && value !== null ? value : defaultValue;
        });
        
        // Load and register the summary tab partial
        fetch('modules/swade-hp-module/templates/actors/character/tabs/summary.hbs')
            .then(response => {
                console.log('SWADE HP Module: Partial fetch response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Failed to fetch partial: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(template => {
                console.log('SWADE HP Module: Partial template content length:', template.length);
                Handlebars.registerPartial('swade-hp-module.character-tab-summary', template);
                console.log('SWADE HP Module: Successfully registered character-tab-summary partial');
                
                // Verify registration
                const registered = Handlebars.partials['swade-hp-module.character-tab-summary'];
                console.log('SWADE HP Module: Partial registration verified:', !!registered);
            })
            .catch(error => {
                console.error('SWADE HP Module: Failed to register partial:', error);
            });
    }

    async waitForSWADE() {
        // Enhanced detection - check multiple ways to find CharacterSheet (V13 + SWADE compatible)
        const detectCharacterSheet = () => {
            // Method 1: Check game.swade.sheets.CharacterSheet (SWADE v13 proper way)
            if (game.swade?.sheets?.CharacterSheet) {
                console.log('SWADE HP Module: Found CharacterSheet via game.swade.sheets.CharacterSheet');
                return game.swade.sheets.CharacterSheet;
            }
            
            // Method 2: Global CharacterSheet
            if (typeof CharacterSheet !== 'undefined') {
                console.log('SWADE HP Module: Found global CharacterSheet');
                return CharacterSheet;
            }
            
            // Method 3: Check CONFIG.Actor.sheetClasses.character
            if (CONFIG.Actor?.sheetClasses?.character) {
                const sheets = CONFIG.Actor.sheetClasses.character;
                console.log('SWADE HP Module: Available character sheets:', Object.keys(sheets));
                
                // Look for SWADE's character sheet
                for (const [key, sheetClass] of Object.entries(sheets)) {
                    if (key.includes('swade') || key.includes('character') || sheetClass.name === 'CharacterSheet') {
                        console.log('SWADE HP Module: Found SWADE character sheet:', key, sheetClass.name);
                        return sheetClass;
                    }
                }
            }
            
            // Method 4: Check window object
            if (window.CharacterSheet) {
                console.log('SWADE HP Module: Found CharacterSheet on window');
                return window.CharacterSheet;
            }
            
            return null;
        };

        // Check if CharacterSheet is already available
        const existingSheet = detectCharacterSheet();
        if (existingSheet) {
            console.log('SWADE HP Module: CharacterSheet already available, registering immediately...');
            await this.registerCustomSheet(existingSheet);
            return;
        }

        // If not ready, wait and check periodically
        console.log('SWADE HP Module: CharacterSheet not ready, waiting...');
        let checkCount = 0;
        const checkInterval = setInterval(async () => {
            checkCount++;
            console.log(`SWADE HP Module: Checking if CharacterSheet is ready... (attempt ${checkCount})`);
            
            const foundSheet = detectCharacterSheet();
            if (foundSheet) {
                console.log('SWADE HP Module: CharacterSheet is now ready!');
                clearInterval(checkInterval);
                await this.registerCustomSheet(foundSheet);
            }
        }, 500); // Check every 500ms instead of 100ms

        // Also listen for the ready hook as backup
        Hooks.once('ready', async () => {
            console.log('SWADE HP Module: ready hook fired!');
            const foundSheet = detectCharacterSheet();
            if (foundSheet) {
                clearInterval(checkInterval);
                await this.registerCustomSheet(foundSheet);
            }
        });

        // Fallback: stop checking after 15 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            console.error('SWADE HP Module: CharacterSheet did not become available within 15 seconds');
            console.log('SWADE HP Module: Final debug info:');
            console.log('- typeof CharacterSheet:', typeof CharacterSheet);
            console.log('- CONFIG.Actor.sheetClasses:', CONFIG.Actor?.sheetClasses);
            console.log('- window.CharacterSheet:', window.CharacterSheet);
        }, 15000);
    }

    async registerCustomSheet(CharacterSheetClass = null) {
        console.log('SWADE HP Module: Starting custom sheet registration...');
        
        // Use provided class or try to find it using V13 + SWADE proper method
        let BaseCharacterSheet = CharacterSheetClass;
        
        if (!BaseCharacterSheet) {
            // Method 1: Check game.swade.sheets.CharacterSheet (SWADE v13 proper way)
            if (game.swade?.sheets?.CharacterSheet) {
                BaseCharacterSheet = game.swade.sheets.CharacterSheet;
                console.log('SWADE HP Module: Found CharacterSheet via game.swade.sheets.CharacterSheet');
            }
            // Method 2: Check global CharacterSheet (fallback)
            else if (typeof CharacterSheet !== 'undefined') {
                BaseCharacterSheet = CharacterSheet;
                console.log('SWADE HP Module: Found CharacterSheet via global CharacterSheet');
            }
            // Method 3: Check CONFIG.Actor.sheetClasses (last resort)
            else if (CONFIG.Actor?.sheetClasses?.character) {
                const sheets = CONFIG.Actor.sheetClasses.character;
                for (const [key, sheetClass] of Object.entries(sheets)) {
                    if (sheetClass.name === 'CharacterSheet' || key.includes('swade')) {
                        BaseCharacterSheet = sheetClass;
                        console.log('SWADE HP Module: Found CharacterSheet via CONFIG.Actor.sheetClasses:', key);
                        break;
                    }
                }
            }
        }
        
        if (!BaseCharacterSheet) {
            console.error('SWADE HP Module: CharacterSheet class is not available!');
            console.log('SWADE HP Module: Debug info:');
            console.log('- game.swade:', game.swade);
            console.log('- game.swade?.sheets:', game.swade?.sheets);
            console.log('- typeof CharacterSheet:', typeof CharacterSheet);
            console.log('- CONFIG.Actor.sheetClasses.character:', CONFIG.Actor?.sheetClasses?.character);
            return;
        }
        
        console.log('SWADE HP Module: Using CharacterSheet class:', BaseCharacterSheet.name);
        
        // Register the partial before creating the sheet class
        console.log('SWADE HP Module: Registering partial before sheet creation...');
        const partialPath = 'modules/swade-hp-module/templates/actors/character/tabs/summary.hbs';
        console.log('SWADE HP Module: Attempting to fetch partial from:', partialPath);
        
        // Make this async and wait for completion
        await this.registerPartialAndCreateSheet(partialPath, BaseCharacterSheet);
    }

    async registerPartialAndCreateSheet(partialPath, BaseCharacterSheet) {
        try {
            console.log('SWADE HP Module: Starting proper template registration using Foundry VTT v13 method...');
            
            // Use Foundry VTT v13's proper template loading system (same as SWADE)
            const templatePaths = {
                'swade-hp-module.character-tab-summary': 'modules/swade-hp-module/templates/actors/character/tabs/summary.hbs'
            };
            
            console.log('SWADE HP Module: Template paths object:', templatePaths);
            console.log('SWADE HP Module: foundry.applications.handlebars available:', !!foundry.applications.handlebars);
            console.log('SWADE HP Module: loadTemplates method available:', !!foundry.applications.handlebars?.loadTemplates);
            
            console.log('SWADE HP Module: Loading templates with foundry.applications.handlebars.loadTemplates...');
            await foundry.applications.handlebars.loadTemplates(templatePaths);
            console.log('SWADE HP Module: Successfully loaded templates using Foundry VTT v13 method');
            
            // Verify registration
            const registered = Handlebars.partials['swade-hp-module.character-tab-summary'];
            console.log('SWADE HP Module: Partial registration verified:', !!registered);
            console.log('SWADE HP Module: Registered partial type:', typeof registered);
            
            // Now create the sheet class after partial is registered
            this.createCustomSheetClass(BaseCharacterSheet);
            
        } catch (error) {
            console.error('SWADE HP Module: Failed to register partial - Error details:', error);
            console.error('SWADE HP Module: Error name:', error.name);
            console.error('SWADE HP Module: Error message:', error.message);
            console.error('SWADE HP Module: Error stack:', error.stack);
            
            // Create sheet class anyway, but without partial
            this.createCustomSheetClass(BaseCharacterSheet);
        }
    }

    createCustomSheetClass(BaseCharacterSheet) {
        console.log('SWADE HP Module: Creating custom sheet class...');
        
        // Create a custom character sheet class that extends SWADE's character sheet
        class SWADEHPCharacterSheet extends BaseCharacterSheet {
                static get defaultOptions() {
                console.log('SWADE HP Module: Setting default options for custom sheet');
                const options = foundry.utils.mergeObject(super.defaultOptions, {
                    template: 'modules/swade-hp-module/templates/actors/character/sheet.hbs'
                });
                console.log('SWADE HP Module: Custom sheet template path:', options.template);
                return options;
            }

            get template() {
                console.log('SWADE HP Module: Template getter called');
                const templatePath = 'modules/swade-hp-module/templates/actors/character/sheet.hbs';
                console.log('SWADE HP Module: Forcing template path to:', templatePath);
                return templatePath;
            }

            async _renderInner(data) {
                console.log('SWADE HP Module: _renderInner called');
                console.log('SWADE HP Module: Template path in _renderInner:', this.template);
                
                // Force the template path
                const originalTemplate = this.options.template;
                this.options.template = 'modules/swade-hp-module/templates/actors/character/sheet.hbs';
                console.log('SWADE HP Module: Forced template to:', this.options.template);
                
                const result = await super._renderInner(data);
                
                // Restore original template
                this.options.template = originalTemplate;
                
                return result;
            }

            async getData() {
                console.log('SWADE HP Module: getData method called!');
                const data = await super.getData();
                
                console.log('SWADE HP Module: getData called, actor data:', {
                    actorName: data.actor?.name,
                    hasSystem: !!data.actor?.system,
                    hasHitPoints: !!data.actor?.system?.hitPoints,
                    hitPointsData: data.actor?.system?.hitPoints,
                    fullActorSystem: data.actor?.system
                });
                
                // Ensure HP data structure exists in template data (following SWADE's pattern)
                if (data.actor && data.actor.system) {
                    if (!data.actor.system.hitPoints) {
                        data.actor.system.hitPoints = {
                            current: 0,
                            max: 0,
                            hitDie: 0
                        };
                        console.log('SWADE HP Module: Created HP data in getData');
                    } else {
                        console.log('SWADE HP Module: HP data already exists in getData:', data.actor.system.hitPoints);
                    }
                }
                
                return data;
            }



            activateListeners(html) {
                super.activateListeners(html);
                
                console.log('SWADE HP Module: activateListeners called!');
                
                // Debug: Check if our HP inputs are being found
                const hpCurrentInput = html.find('input[name="system.hitPoints.current"]');
                const hpMaxInput = html.find('input[name="system.hitPoints.max"]');
                
                console.log('SWADE HP Module: Found HP inputs:', {
                    current: hpCurrentInput.length,
                    max: hpMaxInput.length,
                    currentValue: hpCurrentInput.val(),
                    maxValue: hpMaxInput.val()
                });
                
                // Add form submission debugging
                const form = html.find('form');
                if (form.length > 0) {
                    form.on('submit', (event) => {
                        console.log('SWADE HP Module: Form submission detected');
                        const formData = new FormData(event.target);
                        const hpCurrent = formData.get('system.hitPoints.current');
                        const hpMax = formData.get('system.hitPoints.max');
                        console.log('SWADE HP Module: Form data includes HP:', {
                            current: hpCurrent,
                            max: hpMax
                        });
                    });
                    
                    // Test: Add a button to manually trigger form submission
                    const testButton = $('<button type="button" style="position: absolute; top: 10px; right: 10px; z-index: 1000; background: red; color: white; padding: 5px;">Test Form</button>');
                    testButton.on('click', () => {
                        console.log('SWADE HP Module: Manual form submission test');
                        const formData = new FormData(form[0]);
                        const hpCurrent = formData.get('system.hitPoints.current');
                        const hpMax = formData.get('system.hitPoints.max');
                        console.log('SWADE HP Module: Manual form data includes HP:', {
                            current: hpCurrent,
                            max: hpMax
                        });
                    });
                    html.append(testButton);
                }
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
            // Use the same registration method as SWADE (foundry.documents.collections.Actors.registerSheet)
            console.log('SWADE HP Module: Attempting to register with foundry.documents.collections.Actors.registerSheet...');
            foundry.documents.collections.Actors.registerSheet('swade', SWADEHPCharacterSheet, {
                types: ['character'],
                makeDefault: true,
                label: 'SWADE HP Module Sheet'
            });
            console.log('SWADE HP Module: Registration successful!');
        } catch (error) {
            console.error('SWADE HP Module: Registration failed:', error);
            
            // Try fallback method
            try {
                console.log('SWADE HP Module: Trying CONFIG.Actor.sheetClasses fallback...');
                CONFIG.Actor.sheetClasses.character['swade-hp-module'] = SWADEHPCharacterSheet;
                console.log('SWADE HP Module: Fallback registration successful!');
            } catch (error2) {
                console.error('SWADE HP Module: All registration methods failed:', error2);
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
        
        // If HP values are being updated in system data, convert them to flags
        if (changeData.system && (changeData.system.hitPoints?.current !== undefined || changeData.system.hitPoints?.max !== undefined)) {
            console.log('SWADE HP Module: HP values being updated in system data:', changeData.system.hitPoints);
            
            // Get current HP data from flags
            const currentHPData = actor.flags['swade-hp-module']?.hitPoints || { current: 0, max: 0, hitDie: 0 };
            
            // Create new HP data by merging current flags with system updates
            const newHPData = {
                current: changeData.system.hitPoints.current !== undefined ? changeData.system.hitPoints.current : currentHPData.current,
                max: changeData.system.hitPoints.max !== undefined ? changeData.system.hitPoints.max : currentHPData.max,
                hitDie: changeData.system.hitPoints.hitDie !== undefined ? changeData.system.hitPoints.hitDie : currentHPData.hitDie
            };
            
            // Convert system update to flags update
            if (!changeData.flags) {
                changeData.flags = {};
            }
            if (!changeData.flags['swade-hp-module']) {
                changeData.flags['swade-hp-module'] = {};
            }
            changeData.flags['swade-hp-module'].hitPoints = newHPData;
            
            // Remove the system.hitPoints from the update to avoid conflicts
            delete changeData.system.hitPoints;
            
            console.log('SWADE HP Module: Converted system update to flags update:', newHPData);
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
        const hpData = actor.flags['swade-hp-module']?.hitPoints;
        if (!hpData) return;
        
        const vigorDie = actor.system.attributes.vigor.die.sides;
        const roll = new Roll(`1d${vigorDie}`);
        const result = await roll.evaluate();
        
        const newMaxHP = hpData.max + result.total;
        const newCurrentHP = Math.min(hpData.current + result.total, newMaxHP);
        
        await actor.update({
            'flags.swade-hp-module.hitPoints.max': newMaxHP,
            'flags.swade-hp-module.hitPoints.current': newCurrentHP
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

    ensureAllActorsHaveHPData() {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        console.log('SWADE HP Module: Ensuring HP data structure exists for all existing characters...');
        
        // Ensure HP data structure exists for all existing characters
        game.actors.forEach(actor => {
            if (actor.type === 'character') {
                console.log(`SWADE HP Module: Checking actor: ${actor.name}`);
                
                if (!actor.flags['swade-hp-module']?.hitPoints) {
                    console.log(`SWADE HP Module: Creating HP data structure for ${actor.name}`);
                    actor.update({
                        'flags.swade-hp-module.hitPoints': {
                            current: 0,
                            max: 0,
                            hitDie: 0
                        }
                    }).then(() => {
                        console.log(`SWADE HP Module: Successfully created HP data structure for ${actor.name}`);
                    }).catch(error => {
                        console.error(`SWADE HP Module: Failed to create HP data structure for ${actor.name}:`, error);
                    });
                } else {
                    console.log(`SWADE HP Module: HP data structure already exists for ${actor.name}:`, actor.flags['swade-hp-module'].hitPoints);
                }
            }
        });
        
        console.log('SWADE HP Module: Finished ensuring HP data structure for all actors');
    }

    initializeExistingActors() {
        if (!game.settings.get(this.id, 'enableHP')) return;
        
        // Initialize HP data structure for existing characters that don't have it
        game.actors.forEach(actor => {
            if (actor.type === 'character' && !actor.flags['swade-hp-module']?.hitPoints) {
                console.log(`SWADE HP Module: Initializing HP data structure for ${actor.name}`);
                actor.update({
                    'flags.swade-hp-module.hitPoints': {
                        current: 0,
                        max: 0,
                        hitDie: 0
                    }
                }).then(() => {
                    console.log(`SWADE HP Module: Successfully initialized HP data structure for ${actor.name}`);
                }).catch(error => {
                    console.error(`SWADE HP Module: Failed to initialize HP data structure for ${actor.name}:`, error);
                });
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
        const hpData = actor.flags['swade-hp-module']?.hitPoints;
        if (!hpData) return 0;
        
        const baseHP = hpData.hitDie || 0;
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