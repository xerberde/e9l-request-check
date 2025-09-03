import { E9LSettings } from './settings.js';
import { E9LSkillManager } from './skill-manager.js';
import { E9LChatHandler } from './chat-handler.js';

/**
 * UI Panel für E9L Request Check
 * @class
 */
export class E9LUIPanel extends Application {
    constructor() {
        super();
        this.collapsed = false;
        this.modifiers = E9LSettings.getSkillModifiers();
        this.visibility = E9LSettings.getSkillVisibility();
        this.showConfig = false;
        this.buttonRect = null;
        this._wheelHandlers = new WeakMap();
        this._keyHandlers = new WeakMap();
        this._updateTimer = null;
        this._clickOutsideHandler = null;
    }
    
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'e9l-ui-panel',
            title: '', // Kein Titel
            template: 'modules/e9l-request-check/templates/ui-panel.html',
            classes: ['e9l-ui-panel'],
            width: 280,
            height: 'auto',
            popOut: true,
            minimizable: false,
            resizable: false,
            dragDrop: [],
            tabs: []
        });
    }
    
    /**
     * Override _renderOuter um Titel-Leiste zu entfernen
     */
    async _renderOuter() {
        const html = await super._renderOuter();
        
        // Entferne Window-Header komplett
        html.find('.window-header').remove();
        
        // Entferne Resize-Handle
        html.find('.window-resizable-handle').remove();
        
        return html;
    }
    
    /**
     * Positioniere das Panel relativ zum Button
     */
    positionPanel() {
        if (!this.element || !this.element.length) {
            return; // Kein Warning mehr, da das beim ersten Render normal ist
        }
        
        if (this.buttonRect) {
            const rect = this.buttonRect;
            const panelWidth = 280;
            const maxHeight = Math.min(window.innerHeight * 0.8, 800);
            const offset = 10;
            
            let left = rect.right + offset;
            let top = rect.top - 20;
            
            // Prüfen ob Panel aus dem Fenster ragt
            if (left + panelWidth > window.innerWidth) {
                left = rect.left - panelWidth - offset;
            }
            
            if (top + maxHeight > window.innerHeight) {
                top = Math.max(10, window.innerHeight - maxHeight - 10);
            }
            
            // Position setzen
            this.setPosition({ left, top, height: 'auto', width: 280 });
        }
        
        // Stelle Sichtbarkeit sicher
        if (this.element) {
            this.element.show();
            this.element.css({
                'display': 'block',
                'visibility': 'visible',
                'opacity': '1'
            });
        }
    }
    
    /**
     * Override render
     */
    async _render(force = false, options = {}) {
        await super._render(force, options);
        
        // Positioniere nach dem Rendern - IMMER ganz oben
        setTimeout(() => {
            this.positionPanel();
            // Extra Sicherheit - force top position
            if (this.element && this.element.length) {
                this.element.css({
                    'position': 'fixed',
                    'top': '0px',
                    'z-index': '100'
                });
            }
        }, 0);
        
        // Setup Click-Outside Handler
        this._setupClickOutsideHandler();
        
        return this;
    }
    
    /**
     * Setup Handler für Klicks außerhalb des Panels
     */
    _setupClickOutsideHandler() {
        // Entferne alten Handler falls vorhanden
        if (this._clickOutsideHandler) {
            document.removeEventListener('click', this._clickOutsideHandler);
        }
        
        // Erstelle neuen Handler mit kleiner Verzögerung
        setTimeout(() => {
            this._clickOutsideHandler = (event) => {
                // Prüfe ob Klick außerhalb des Panels und nicht auf dem Toggle-Button
                const panel = this.element?.[0];
                const button = document.querySelector('.e9l-control-button');
                
                if (panel && !panel.contains(event.target) && 
                    button && !button.contains(event.target)) {
                    this.close();
                }
            };
            
            document.addEventListener('click', this._clickOutsideHandler);
        }, 100); // Kleine Verzögerung damit der aktuelle Klick nicht erfasst wird
    }
    
    /**
     * Bereitet Daten für das Template vor
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
     */
    activateListeners(html) {
        super.activateListeners(html);
        
        // Tab Switching
        html.find('.e9l-tab-button').click((e) => {
            e.preventDefault();
            e.stopPropagation();
            const tab = e.currentTarget.dataset.tab;
            
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
        
        // Skill Visibility Icons
        html.find('.skill-visibility-icon').click(async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const skillId = e.currentTarget.dataset.skillId;
            const isCurrentlyVisible = $(e.currentTarget).hasClass('fa-square-check');
            const visible = !isCurrentlyVisible;
            
            if (visible) {
                $(e.currentTarget).removeClass('fa-square').addClass('fa-square-check');
            } else {
                $(e.currentTarget).removeClass('fa-square-check').addClass('fa-square');
            }
            
            this.visibility[skillId] = visible;
            await E9LSettings.setSkillVisibility(this.visibility);
            
            await this._updateSkillList(html);
        });
        
        // Config-Item Klick
        html.find('.e9l-config-skill-item').click((e) => {
            if (!$(e.target).hasClass('skill-visibility-icon')) {
                e.preventDefault();
                e.stopPropagation();
                const icon = $(e.currentTarget).find('.skill-visibility-icon');
                icon.trigger('click');
            }
        });
        
        // Modifier und Request Listeners
        this._attachModifierListeners(html);
        this._attachRequestListeners(html);
        
        // Listen-Höhe für genau 20 Einträge
        // Talente-Liste braucht etwas mehr Platz wegen der Buttons
        // Bei 36px pro Eintrag + 1px Border = 37px pro Eintrag
        // 20 × 37px = 740px
        const maxListHeight = 740; // 20 Einträge mit Borders
        
        html.find('.e9l-skill-list').css({
            'max-height': `${maxListHeight}px`,
            'overflow-y': 'auto'
        });
        
        // Config-Section kann bei 720px bleiben
        html.find('.e9l-config-section').css({
            'max-height': '720px',
            'overflow-y': 'auto'
        });
    }
    
    /**
     * Aktualisiert nur die Skill-Liste
     */
    async _updateSkillList(html) {
        const skillsData = await E9LSkillManager.getVisibleSkills();
        skillsData.forEach(skill => {
            skill.modifier = this.modifiers[skill.id] || 0;
        });
        
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
        } else {
            html.find('.e9l-skill-list').html(`
                <div class="e9l-no-skills">
                    <i class="fas fa-info-circle"></i>
                    <p>${game.i18n.localize("E9L.info.noSkillsSelected")}</p>
                </div>
            `);
        }
        
        this._attachModifierListeners(html);
        this._attachRequestListeners(html);
    }
    
    /**
     * Modifier-Listener mit Cleanup
     */
    _attachModifierListeners(html) {
        const elements = html.find('.modifier-value');
        
        elements.each((i, el) => {
            const skillId = el.dataset.skillId;
            
            // Cleanup alte Handler
            this._removeModifierListeners(el);
            
            const wheelHandler = (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                this._updateModifier(skillId, delta, el);
            };
            
            const keyHandler = (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const delta = e.key === 'ArrowUp' ? 1 : -1;
                    this._updateModifier(skillId, delta, el);
                }
            };
            
            this._wheelHandlers.set(el, wheelHandler);
            this._keyHandlers.set(el, keyHandler);
            
            el.addEventListener('wheel', wheelHandler, { passive: false });
            el.addEventListener('keydown', keyHandler);
        });
    }
    
    /**
     * Entfernt Modifier-Listener
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
     * Update Modifier mit Throttling
     */
    _updateModifier(skillId, delta, element) {
        const current = this.modifiers[skillId] || 0;
        const newValue = Math.max(-10, Math.min(10, current + delta));
        
        if (current !== newValue) {
            this.modifiers[skillId] = newValue;
            
            const displayValue = newValue === 0 ? '0' : (newValue > 0 ? `+${newValue}` : `${newValue}`);
            element.value = displayValue;
            
            // Debounced save
            clearTimeout(this._updateTimer);
            this._updateTimer = setTimeout(() => {
                E9LSettings.setSkillModifiers(this.modifiers);
            }, 500);
        }
    }
    
    /**
     * Request-Button Listener
     */
    _attachRequestListeners(html) {
        html.find('.request-btn').off('click');
        
        html.find('.request-btn').on('click', (e) => {
            e.preventDefault();
            const skillId = e.currentTarget.dataset.skillId;
            const skillName = e.currentTarget.dataset.skillName;
            const modifier = this.modifiers[skillId] || 0;
            
            E9LChatHandler.sendSkillRequest(skillName, modifier);
            
            // Sound komplett entfernt
        });
    }
    
    /**
     * Cleanup beim Schließen
     */
    async close(options = {}) {
        // Entferne Click-Outside Handler
        if (this._clickOutsideHandler) {
            document.removeEventListener('click', this._clickOutsideHandler);
            this._clickOutsideHandler = null;
        }
        
        // Timer aufräumen
        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
            this._updateTimer = null;
        }
        
        // Event Listener aufräumen
        if (this.element) {
            this.element.find('.modifier-value').each((i, el) => {
                this._removeModifierListeners(el);
            });
        }
        
        // Informiere main.js dass Panel geschlossen wurde
        if (window.E9LRequestCheck) {
            window.E9LRequestCheck.panel = null;
        }
        
        return super.close(options);
    }
}