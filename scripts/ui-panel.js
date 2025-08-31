import { E9LSettings } from './settings.js';
import { E9LSkillManager } from './skill-manager.js';
import { E9LChatHandler } from './chat-handler.js';

/**
 * UI Panel für E9L Request Probe
 * @class
 */
export class E9LUIPanel extends Application {
    constructor() {
        super();
        this.collapsed = false;
        this.modifiers = E9LSettings.getSkillModifiers();
        this.visibility = E9LSettings.getSkillVisibility();
        this.showConfig = false;
        this._wheelHandlers = new WeakMap();
        this._keyHandlers = new WeakMap();
    }
    
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'e9l-ui-panel',
            title: 'E9L Request Probe',
            template: 'modules/e9l-request-probe/templates/ui-panel.html',
            popOut: false,
            resizable: false,
            classes: ['e9l-ui-panel'],
            width: 280,
            height: 'auto'
        });
    }
    
    /**
     * Render the Application
     */
    async _render(force, options) {
        await super._render(force, options);
        
        // Log für Debug
        console.log('E9L Panel: _render aufgerufen, element:', this.element?.[0]);
        
        // Stelle sicher dass Panel sichtbar ist
        if (this.element) {
            this.element.css({
                'display': 'block',
                'visibility': 'visible'
            });
            
            // Füge zum Body hinzu falls nicht vorhanden
            if (!this.element.parent().length) {
                $('body').append(this.element);
            }
        }
    }
    
    /**
     * Bereitet Daten für das Template vor
     * @returns {Promise<Object>} Template-Daten
     */
    async getData() {
        const allSkills = await E9LSkillManager.getAllSkills();
        const visibleSkills = await E9LSkillManager.getVisibleSkills();
        
        // Modifikatoren hinzufügen
        visibleSkills.forEach(skill => {
            skill.modifier = this.modifiers[skill.id] || 0;
        });
        
        // Visibility für alle Skills
        allSkills.forEach(skill => {
            skill.visible = this.visibility[skill.id] !== false;
        });
        
        return {
            collapsed: this.collapsed,
            showConfig: this.showConfig,
            skills: visibleSkills,
            allSkills: allSkills
        };
    }
    
    /**
     * Aktiviert Event Listener
     * @param {jQuery} html - jQuery HTML Element
     */
    activateListeners(html) {
        super.activateListeners(html);
        
        // Tab Switching - ohne komplettes Re-render
        html.find('.e9l-tab-button').click((e) => {
            e.preventDefault();
            e.stopPropagation();
            const tab = e.currentTarget.dataset.tab;
            
            // Nur Tab-Inhalt wechseln, kein komplettes Re-render
            if (tab === 'config' && !this.showConfig) {
                this.showConfig = true;
                html.find('.e9l-tab-button').removeClass('active');
                $(e.currentTarget).addClass('active');
                html.find('.e9l-skill-list').hide();
                html.find('.e9l-config-section').show();
            } else if (tab === 'skills' && this.showConfig) {
                this.showConfig = false;
                html.find('.e9l-tab-button').removeClass('active');
                $(e.currentTarget).addClass('active');
                html.find('.e9l-config-section').hide();
                html.find('.e9l-skill-list').show();
            }
        });
        
        // Skill Visibility Icons (Custom Icons statt Checkboxen)
        html.find('.skill-visibility-icon').click(async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const skillId = e.currentTarget.dataset.skillId;
            const isCurrentlyVisible = $(e.currentTarget).hasClass('fa-square-check');
            const visible = !isCurrentlyVisible;
            
            // Icon-Klassen aktualisieren
            if (visible) {
                $(e.currentTarget).removeClass('fa-square').addClass('fa-square-check');
            } else {
                $(e.currentTarget).removeClass('fa-square-check').addClass('fa-square');
            }
            
            this.visibility[skillId] = visible;
            await E9LSettings.setSkillVisibility(this.visibility);
            
            // Nur die Skill-Liste aktualisieren, nicht das gesamte Panel
            const skillsData = await E9LSkillManager.getVisibleSkills();
            skillsData.forEach(skill => {
                skill.modifier = this.modifiers[skill.id] || 0;
            });
            
            // Skill-Liste neu rendern
            if (skillsData.length > 0) {
                let skillsHtml = '';
                skillsData.forEach(skill => {
                    const modText = skill.modifier >= 0 ? `+${skill.modifier}` : skill.modifier;
                    skillsHtml += `
                        <div class="e9l-skill-item" data-skill-id="${skill.id}">
                            <span class="skill-name" title="${skill.name}">${skill.name}</span>
                            <input type="text" 
                                   class="modifier-value" 
                                   data-skill-id="${skill.id}"
                                   value="${skill.modifier === 0 ? '0' : modText}"
                                   readonly
                                   tabindex="0">
                            <button class="request-btn" 
                                    data-skill-id="${skill.id}" 
                                    data-skill-name="${skill.name}">
                                <i class="fa-light fa-dice-d20"></i>
                            </button>
                        </div>
                    `;
                });
                html.find('.e9l-skill-list').html(skillsHtml);
                
                // Event Listener für neue Elemente aktivieren
                this._attachModifierListeners(html);
                this._attachRequestListeners(html);
            }
        });
        
        // Click auf Skill-Item zum Icon-Toggle  
        html.find('.e9l-config-skill-item').click((e) => {
            if (!$(e.target).hasClass('skill-visibility-icon')) {
                e.preventDefault();
                e.stopPropagation();
                const icon = $(e.currentTarget).find('.skill-visibility-icon');
                icon.trigger('click');
            }
        });
        
        // Modifier Controls mit Memory Leak Prevention
        this._attachModifierListeners(html);
        
        // Request Buttons
        this._attachRequestListeners(html);
        
        // Position festlegen
        this._setPosition();
    }
    
    /**
     * Fügt Modifier-Listener hinzu (mit Cleanup)
     * @private
     * @param {jQuery} html - jQuery HTML Element
     */
    _attachModifierListeners(html) {
        html.find('.modifier-value').each((i, el) => {
            const skillId = el.dataset.skillId;
            
            // Alte Handler entfernen falls vorhanden
            this._removeModifierListeners(el);
            
            // Wheel Handler
            const wheelHandler = (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                this._updateModifier(skillId, delta);
            };
            
            // Key Handler
            const keyHandler = (e) => {
                e.preventDefault();
                if (e.key === 'ArrowUp') {
                    this._updateModifier(skillId, 1);
                } else if (e.key === 'ArrowDown') {
                    this._updateModifier(skillId, -1);
                }
            };
            
            // Handler speichern für späteren Cleanup
            this._wheelHandlers.set(el, wheelHandler);
            this._keyHandlers.set(el, keyHandler);
            
            // Event Listener hinzufügen
            el.addEventListener('wheel', wheelHandler, { passive: false });
            el.addEventListener('keydown', keyHandler);
        });
    }
    
    /**
     * Entfernt Modifier-Listener
     * @private
     * @param {HTMLElement} el - DOM Element
     */
    _removeModifierListeners(el) {
        const wheelHandler = this._wheelHandlers.get(el);
        const keyHandler = this._keyHandlers.get(el);
        
        if (wheelHandler) {
            el.removeEventListener('wheel', wheelHandler);
            this._wheelHandlers.delete(el);
        }
        
        if (keyHandler) {
            el.removeEventListener('keydown', keyHandler);
            this._keyHandlers.delete(el);
        }
    }
    
    /**
     * Aktualisiert Modifier-Wert
     * @private
     * @param {string} skillId - Skill ID
     * @param {number} delta - Änderungswert
     */
    _updateModifier(skillId, delta) {
        const current = this.modifiers[skillId] || 0;
        const newValue = Math.max(-10, Math.min(10, current + delta));
        this._setModifier(skillId, newValue);
    }
    
    /**
     * Setzt Modifier-Wert
     * @private
     * @param {string} skillId - Skill ID
     * @param {number} value - Neuer Wert
     */
    _setModifier(skillId, value) {
        this.modifiers[skillId] = value;
        E9LSettings.setSkillModifiers(this.modifiers);
        
        // UI direkt aktualisieren ohne komplettes Re-render
        const input = this.element.find(`[data-skill-id="${skillId}"].modifier-value`);
        if (input.length) {
            input.val(value >= 0 ? `+${value}` : value);
        }
    }
    
    /**
     * Setzt Position vom Button aus
     * @param {DOMRect} buttonRect - Button Rectangle
     */
    setPositionFromButton(buttonRect) {
        const panelWidth = 280;
        // Dynamische Höhe - 80% der Viewport-Höhe, max 800px
        const maxHeight = Math.min(window.innerHeight * 0.8, 800);
        const panelHeight = maxHeight;
        const offset = 10;
        
        // Position rechts vom Button, 20px höher
        let left = buttonRect.right + offset;
        let top = buttonRect.top - 20;
        
        // Prüfen ob Panel rechts aus dem Fenster ragt
        if (left + panelWidth > window.innerWidth) {
            left = buttonRect.left - panelWidth - offset;
        }
        
        // Prüfen ob Panel unten aus dem Fenster ragt
        if (top + panelHeight > window.innerHeight) {
            top = Math.max(10, window.innerHeight - panelHeight - 10);
        }
        
        // Setze auch die max-height für die Listen
        const listHeight = panelHeight - 50; // 50px für Tabs
        
        this.element.css({
            position: 'fixed',
            left: `${left}px`,
            top: `${top}px`,
            bottom: 'auto',
            right: 'auto',
            'z-index': 100
        });
        
        // Dynamisch Listen-Höhe anpassen
        this.element.find('.e9l-skill-list, .e9l-config-section').css({
            'max-height': `${listHeight}px`
        });
    }
    
    /**
     * Setzt initiale Position
     * @private
     */
    _setPosition() {
        // Nutze die gleiche dynamische Höhe wie in setPositionFromButton
        const maxHeight = Math.min(window.innerHeight * 0.8, 800);
        const listHeight = maxHeight - 50;
        
        const position = {
            left: 80,
            top: 100
        };
        
        this.element.css({
            position: 'fixed',
            left: `${position.left}px`,
            top: `${position.top}px`,
            bottom: 'auto',
            right: 'auto',
            'z-index': 100
        });
        
        // Setze auch hier die dynamische Listen-Höhe
        this.element.find('.e9l-skill-list, .e9l-config-section').css({
            'max-height': `${listHeight}px`
        });
    }
    
    /**
     * Override _renderOuter for custom DOM handling
     * @private
     */
    async _renderOuter() {
        // Create container div
        const element = $('<div>')
            .attr('id', this.id)
            .addClass('app window-app e9l-ui-panel')
            .css({
                position: 'fixed',
                'z-index': 100
            });
        
        // Load and render template
        const html = await renderTemplate(this.template, await this.getData());
        element.html(html);
        
        // Add to body
        $('body').append(element);
        
        console.log('E9L: Panel DOM hinzugefügt');
        
        return element;
    }
    
    /**
     * Fügt Request-Button Listener hinzu
     * @private
     * @param {jQuery} html - jQuery HTML Element
     */
    _attachRequestListeners(html) {
        html.find('.request-btn').off('click').on('click', (e) => {
            const skillId = e.currentTarget.dataset.skillId;
            const skillName = e.currentTarget.dataset.skillName;
            const modifier = this.modifiers[skillId] || 0;
            
            E9LChatHandler.sendSkillRequest(skillName, modifier);
        });
    }
    
    /**
     * Cleanup beim Schließen
     * @param {Object} options - Close options
     */
    async close(options = {}) {
        // Event Listener aufräumen
        if (this.element) {
            this.element.find('.modifier-value').each((i, el) => {
                this._removeModifierListeners(el);
            });
        }
        
        // Normal schließen (zerstört das Panel)
        return super.close(options);
    }
}