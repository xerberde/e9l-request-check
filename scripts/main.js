import { E9LSettings } from './settings.js';
import { E9LUIPanel } from './ui-panel.js';
import { E9LSkillManager } from './skill-manager.js';
import { E9LChatHandler } from './chat-handler.js';

/**
 * Main module class for E9L Request Probe
 * @class
 */
class E9LRequestProbe {
    static ID = 'e9l-request-probe';
    static FLAGS = {
        SKILLS: 'skills'
    }
    
    static panel = null;
    static DEBUG = true; // Debug-Flag für Entwicklung temporär aktiviert
    
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
        this.log('Initialisierung');
        
        // System-Check
        if (game.system.id !== 'dsa5') {
            console.error('E9L: Nur DSA5 unterstützt');
            ui.notifications.error('E9L Request Probe: Nur für DSA5 System');
            return;
        }
        
        // Module registrieren
        game.modules.get(this.ID).api = {
            skillManager: E9LSkillManager,
            chatHandler: E9LChatHandler
        };
        
        // Settings initialisieren
        E9LSettings.registerSettings();
        
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
        
        // UI Panel erstellen aber nicht rendern
        this.panel = new E9LUIPanel();
        
        // Button direkt einfügen
        Hooks.on('renderSceneControls', this._handleSceneControls.bind(this));
        
        this.log('UI Panel bereit');
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
                    data-control="e9l-request-probe" 
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
        this.log('Button geklickt, Panel vorhanden:', !!this.panel);
        
        // Panel existiert und ist sichtbar -> schließen
        if (this.panel && this.panel.rendered) {
            this.log('Schließe Panel');
            await this.panel.close();
            this.panel = null;
            return;
        }
        
        // Altes Panel aufräumen
        if (this.panel) {
            try {
                await this.panel.close();
            } catch (e) {}
            this.panel = null;
        }
        
        // Neues Panel erstellen
        this.log('Erstelle neues Panel');
        this.panel = new E9LUIPanel();
        await this.panel.render(true);
        
        this.log('Panel gerendert, Element:', !!this.panel.element);
        
        // Position setzen
        if (buttonElement && this.panel.element) {
            const rect = buttonElement.getBoundingClientRect();
            this.panel.setPositionFromButton(rect);
            // Sicherstellen dass es sichtbar ist
            this.panel.element.show();
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
    }
}

// Hooks
Hooks.once('init', () => {
    E9LRequestProbe.initialize();
});

Hooks.once('ready', () => {
    E9LRequestProbe.ready();
});

// Cleanup bei Modul-Deaktivierung
Hooks.on('closeE9LUIPanel', () => {
    E9LRequestProbe.cleanup();
});

// Export für globalen Zugriff
window.E9LRequestProbe = E9LRequestProbe;