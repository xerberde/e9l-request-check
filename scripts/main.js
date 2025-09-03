import { E9LSettings } from './settings.js';
import { E9LUIPanel } from './ui-panel.js';
import { E9LSkillManager } from './skill-manager.js';
import { E9LChatHandler } from './chat-handler.js';

/**
 * Main module class for E9L Request Check
 * @class
 */
class E9LRequestCheck {
    static ID = 'e9l-request-check'; // KORRIGIERT: Muss mit module.json übereinstimmen!
    static FLAGS = {
        SKILLS: 'skills'
    }
    
    static panel = null;
    static DEBUG = false;
    static isToggling = false;
    
    /**
     * Log-Funktion mit Debug-Flag
     * @param {...any} args - Log-Argumente
     */
    static log(...args) {
        if (this.DEBUG) {
            console.log('E9L:', ...args);
        }
    }
    
    /**
     * Initialisiert das Modul
     */
    static initialize() {
        // Debug-Mode aus Settings laden
        this.DEBUG = E9LSettings.isDebugMode();
        
        this.log('Initialisierung');
        
        // System-Check
        if (game.system.id !== 'dsa5') {
            console.error('E9L: Nur DSA5 unterstützt');
            ui.notifications.error('E9L Request Check: Nur für DSA5 System');
            return;
        }
        
        // Module registrieren
        game.modules.get(this.ID).api = {
            skillManager: E9LSkillManager,
            chatHandler: E9LChatHandler
        };
        
        // Settings initialisieren
        E9LSettings.registerSettings();
        
        // Debug-Mode nach Settings-Registrierung nochmal laden
        this.DEBUG = E9LSettings.isDebugMode();
        
        // Debug-Mode an andere Module weitergeben
        E9LSkillManager.DEBUG = this.DEBUG;
        E9LChatHandler.DEBUG = this.DEBUG;
        
        // Skill Manager initialisieren
        E9LSkillManager.initialize();
    }
    
    /**
     * Ready-Hook Handler
     */
    static ready() {
        this.log('Ready');
        
        // Nur für GM
        if (!game.user.isGM) return;
        
        // Button direkt einfügen
        Hooks.on('renderSceneControls', this._handleSceneControls.bind(this));
        
        this.log('UI bereit');
    }
    
    /**
     * Handler für Scene Controls
     * @private
     * @param {Application} app - Die SceneControls App
     * @param {jQuery} html - Das jQuery HTML Element
     */
    static _handleSceneControls(app, html) {
        if (!html.find('.e9l-control-button').length) {
            const button = $(`
                <li class="scene-control e9l-control-button" 
                    data-control="e9l-request-check" 
                    title="${game.i18n.localize('E9L.ui.toggleButton')}">
                    <i class="fa-solid fa-person-circle-question"></i>
                </li>
            `);
            
            button.click((e) => {
                e.preventDefault();
                e.stopPropagation();
                this._togglePanel(e.currentTarget);
            });
            
            html.find('.main-controls').append(button);
        }
    }
    
    /**
     * Toggle UI Panel
     * @private
     * @param {HTMLElement} buttonElement - Der Button Element
     */
    static async _togglePanel(buttonElement) {
        // Verhindere mehrfache Aufrufe
        if (this.isToggling) {
            this.log('Toggle bereits in Arbeit, ignoriere...');
            return;
        }
        
        this.isToggling = true;
        
        try {
            this.log('Button geklickt, Panel vorhanden:', !!this.panel);
            
            // Panel existiert und ist sichtbar -> schließen
            if (this.panel && this.panel.rendered) {
                this.log('Schließe Panel');
                await this.panel.close();
                this.panel = null;
                return;
            }
            
            // Altes Panel aufräumen falls vorhanden
            if (this.panel) {
                try {
                    await this.panel.close();
                } catch (e) {
                    this.log('Fehler beim Schließen des alten Panels:', e);
                }
                this.panel = null;
            }
            
            // Neues Panel erstellen
            this.log('Erstelle neues Panel');
            this.panel = new E9LUIPanel();
            
            // Position IMMER neu setzen bei jedem Öffnen
            if (buttonElement) {
                const rect = buttonElement.getBoundingClientRect();
                this.panel.buttonRect = rect;
                this.log('Button Position gesetzt:', rect);
            }
            
            await this.panel.render(true);
            
            this.log('Panel gerendert');
            
            // Debug: Panel-Status prüfen
            if (this.panel.element && this.panel.element.length > 0) {
                const el = this.panel.element[0];
                if (el && el instanceof Element) {
                    this.log('Panel in DOM:', document.body.contains(el));
                    this.log('Panel sichtbar:', $(el).is(':visible'));
                } else {
                    this.log('Panel element ist kein DOM-Element');
                }
            } else {
                this.log('Panel element nicht gefunden');
            }
            
        } catch (error) {
            console.error('E9L: Fehler beim Toggle des Panels:', error);
            ui.notifications.error('Fehler beim Öffnen des Request Check Panels');
            this.panel = null; // Reset bei Fehler
        } finally {
            this.isToggling = false;
        }
    }
    
    /**
     * Cleanup beim Modul-Deaktivierung
     */
    static cleanup() {
        if (this.panel) {
            this.panel.close();
            this.panel = null;
        }
        this.isToggling = false;
    }
}

// Hooks
Hooks.once('init', () => {
    E9LRequestCheck.initialize();
});

Hooks.once('ready', () => {
    E9LRequestCheck.ready();
});

// Cleanup bei Modul-Deaktivierung
Hooks.on('closeE9LUIPanel', () => {
    E9LRequestCheck.panel = null;
    E9LRequestCheck.isToggling = false;
});

// Export für globalen Zugriff
window.E9LRequestCheck = E9LRequestCheck;