/**
 * Settings Manager für E9L Request Probe
 * @class
 */
export class E9LSettings {
    static ID = 'e9l-request-probe';
    
    static SETTINGS = {
        SKILL_VISIBILITY: 'skillVisibility',
        SKILL_MODIFIERS: 'skillModifiers',
        DEBUG_MODE: 'debugMode',
        ENABLE_AUDIO: 'enableAudio',
        DEFAULT_VISIBLE: 'defaultVisible'
    }
    
    /**
     * Registriert alle Module-Settings
     */
    static registerSettings() {
        console.log('E9L Settings: Registrierung');
        
        // Debug Mode
        game.settings.register(this.ID, this.SETTINGS.DEBUG_MODE, {
            name: 'Debug Modus',
            hint: 'Aktiviert erweiterte Konsolen-Ausgaben für Debugging',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            onChange: value => {
                // Update Debug flags in allen Modulen
                if (window.E9LRequestProbe) window.E9LRequestProbe.DEBUG = value;
                const modules = ['E9LSkillManager', 'E9LChatHandler'];
                modules.forEach(mod => {
                    const module = game.modules.get(this.ID)?.api?.[mod.toLowerCase()];
                    if (module) module.DEBUG = value;
                });
            }
        });
        
        // Audio Feedback
        game.settings.register(this.ID, this.SETTINGS.ENABLE_AUDIO, {
            name: 'Audio-Feedback',
            hint: 'Spielt einen Sound beim Senden von Proben-Anforderungen',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });
        
        // Standard-Sichtbarkeit für neue Skills
        game.settings.register(this.ID, this.SETTINGS.DEFAULT_VISIBLE, {
            name: 'Neue Fähigkeiten standardmäßig sichtbar',
            hint: 'Legt fest, ob neue Fähigkeiten automatisch in der UI angezeigt werden',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });
        
        // Skill Sichtbarkeit (Hidden Setting)
        game.settings.register(this.ID, this.SETTINGS.SKILL_VISIBILITY, {
            name: 'Fähigkeiten Sichtbarkeit',
            hint: 'Welche Fähigkeiten sollen in der UI angezeigt werden',
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });
        
        // Skill Modifikatoren (Hidden Setting)
        game.settings.register(this.ID, this.SETTINGS.SKILL_MODIFIERS, {
            name: 'Fähigkeiten Modifikatoren',
            hint: 'Gespeicherte Modifikatoren für Fähigkeiten',
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });
    }
    
    /**
     * Holt Skill-Sichtbarkeit
     * @returns {Object} Visibility-Objekt
     */
    static getSkillVisibility() {
        return game.settings.get(this.ID, this.SETTINGS.SKILL_VISIBILITY) || {};
    }
    
    /**
     * Setzt Skill-Sichtbarkeit
     * @param {Object} visibility - Visibility-Objekt
     * @returns {Promise}
     */
    static async setSkillVisibility(visibility) {
        return game.settings.set(this.ID, this.SETTINGS.SKILL_VISIBILITY, visibility);
    }
    
    /**
     * Holt Skill-Modifikatoren
     * @returns {Object} Modifikatoren-Objekt
     */
    static getSkillModifiers() {
        return game.settings.get(this.ID, this.SETTINGS.SKILL_MODIFIERS) || {};
    }
    
    /**
     * Setzt Skill-Modifikatoren
     * @param {Object} modifiers - Modifikatoren-Objekt
     * @returns {Promise}
     */
    static async setSkillModifiers(modifiers) {
        return game.settings.set(this.ID, this.SETTINGS.SKILL_MODIFIERS, modifiers);
    }
    
    /**
     * Prüft ob Debug-Mode aktiv ist
     * @returns {boolean}
     */
    static isDebugMode() {
        return game.settings.get(this.ID, this.SETTINGS.DEBUG_MODE) || false;
    }
    
    /**
     * Prüft ob Audio-Feedback aktiviert ist
     * @returns {boolean}
     */
    static isAudioEnabled() {
        return game.settings.get(this.ID, this.SETTINGS.ENABLE_AUDIO) !== false;
    }
    
    /**
     * Holt Standard-Sichtbarkeit für neue Skills
     * @returns {boolean}
     */
    static getDefaultVisibility() {
        return game.settings.get(this.ID, this.SETTINGS.DEFAULT_VISIBLE) !== false;
    }
    
    /**
     * Reset alle Modifikatoren
     * @returns {Promise}
     */
    static async resetModifiers() {
        return this.setSkillModifiers({});
    }
    
    /**
     * Reset alle Sichtbarkeiten
     * @returns {Promise}
     */
    static async resetVisibility() {
        return this.setSkillVisibility({});
    }
    
    /**
     * Exportiert alle Settings als JSON
     * @returns {Object} Settings-Export
     */
    static exportSettings() {
        return {
            version: game.modules.get(this.ID).version,
            visibility: this.getSkillVisibility(),
            modifiers: this.getSkillModifiers(),
            debugMode: this.isDebugMode(),
            enableAudio: this.isAudioEnabled(),
            defaultVisible: this.getDefaultVisibility()
        };
    }
    
    /**
     * Importiert Settings aus JSON
     * @param {Object} data - Settings-Import
     * @returns {Promise<boolean>} Erfolg
     */
    static async importSettings(data) {
        try {
            if (data.visibility) {
                await this.setSkillVisibility(data.visibility);
            }
            if (data.modifiers) {
                await this.setSkillModifiers(data.modifiers);
            }
            ui.notifications.info('Settings erfolgreich importiert');
            return true;
        } catch (error) {
            console.error('E9L Settings: Import-Fehler', error);
            ui.notifications.error('Fehler beim Import der Settings');
            return false;
        }
    }
}