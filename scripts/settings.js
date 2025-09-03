/**
 * Settings Manager für E9L Request Check
 * @class
 */
export class E9LSettings {
    static ID = 'e9l-request-check'; // KORRIGIERT: Muss mit module.json übereinstimmen!
    
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
        
        // Debug Mode - MUSS ZUERST registriert werden
        game.settings.register(this.ID, this.SETTINGS.DEBUG_MODE, {
            name: 'Debug Modus',
            hint: 'Aktiviert erweiterte Konsolen-Ausgaben für Debugging',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false, // Standardmäßig AUS
            onChange: value => {
                // Update Debug flags in allen Modulen
                if (window.E9LRequestCheck) {
                    window.E9LRequestCheck.DEBUG = value;
                    console.log('E9L: Debug-Modus ' + (value ? 'aktiviert' : 'deaktiviert'));
                }
                
                // Update in anderen Modulen
                const api = game.modules.get(this.ID)?.api;
                if (api) {
                    if (api.skillManager) api.skillManager.DEBUG = value;
                    if (api.chatHandler) api.chatHandler.DEBUG = value;
                }
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
        try {
            return game.settings.get(this.ID, this.SETTINGS.SKILL_VISIBILITY) || {};
        } catch (e) {
            // Falls Settings noch nicht registriert
            return {};
        }
    }
    
    /**
     * Setzt Skill-Sichtbarkeit
     * @param {Object} visibility - Visibility-Objekt
     * @returns {Promise}
     */
    static async setSkillVisibility(visibility) {
        try {
            return await game.settings.set(this.ID, this.SETTINGS.SKILL_VISIBILITY, visibility);
        } catch (error) {
            console.error('E9L Settings: Fehler beim Speichern der Sichtbarkeit', error);
        }
    }
    
    /**
     * Holt Skill-Modifikatoren
     * @returns {Object} Modifikatoren-Objekt
     */
    static getSkillModifiers() {
        try {
            return game.settings.get(this.ID, this.SETTINGS.SKILL_MODIFIERS) || {};
        } catch (e) {
            // Falls Settings noch nicht registriert
            return {};
        }
    }
    
    /**
     * Setzt Skill-Modifikatoren
     * @param {Object} modifiers - Modifikatoren-Objekt
     * @returns {Promise}
     */
    static async setSkillModifiers(modifiers) {
        try {
            return await game.settings.set(this.ID, this.SETTINGS.SKILL_MODIFIERS, modifiers);
        } catch (error) {
            console.error('E9L Settings: Fehler beim Speichern der Modifikatoren', error);
        }
    }
    
    /**
     * Prüft ob Debug-Mode aktiv ist
     * @returns {boolean}
     */
    static isDebugMode() {
        try {
            return game.settings.get(this.ID, this.SETTINGS.DEBUG_MODE) === true;
        } catch (e) {
            return false; // Standardmäßig aus
        }
    }
    
    /**
     * Prüft ob Audio-Feedback aktiviert ist
     * @returns {boolean}
     */
    static isAudioEnabled() {
        try {
            return game.settings.get(this.ID, this.SETTINGS.ENABLE_AUDIO) !== false;
        } catch (e) {
            return true; // Standardmäßig an
        }
    }
    
    /**
     * Holt Standard-Sichtbarkeit für neue Skills
     * @returns {boolean}
     */
    static getDefaultVisibility() {
        try {
            return game.settings.get(this.ID, this.SETTINGS.DEFAULT_VISIBLE) !== false;
        } catch (e) {
            return true; // Standardmäßig sichtbar
        }
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
            version: game.modules.get(this.ID)?.version || '1.0.0',
            visibility: this.getSkillVisibility(),
            modifiers: this.getSkillModifiers(),
            debugMode: this.isDebugMode(),
            defaultVisible: this.getDefaultVisibility(),
            exportDate: new Date().toISOString()
        };
    }
    
    /**
     * Importiert Settings aus JSON
     * @param {Object} data - Settings-Import
     * @returns {Promise<boolean>} Erfolg
     */
    static async importSettings(data) {
        try {
            // Version prüfen
            const currentVersion = game.modules.get(this.ID)?.version || '1.0.0';
            if (data.version && data.version !== currentVersion) {
                ui.notifications.warn(`Settings von Version ${data.version} importiert, aktuelle Version ist ${currentVersion}`);
            }
            
            // Settings importieren
            const promises = [];
            
            if (data.visibility !== undefined) {
                promises.push(this.setSkillVisibility(data.visibility));
            }
            if (data.modifiers !== undefined) {
                promises.push(this.setSkillModifiers(data.modifiers));
            }
            if (data.debugMode !== undefined) {
                promises.push(game.settings.set(this.ID, this.SETTINGS.DEBUG_MODE, data.debugMode));
            }
            if (data.defaultVisible !== undefined) {
                promises.push(game.settings.set(this.ID, this.SETTINGS.DEFAULT_VISIBLE, data.defaultVisible));
            }
            
            await Promise.all(promises);
            
            ui.notifications.info('Settings erfolgreich importiert');
            return true;
        } catch (error) {
            console.error('E9L Settings: Import-Fehler', error);
            ui.notifications.error('Fehler beim Import der Settings');
            return false;
        }
    }
}