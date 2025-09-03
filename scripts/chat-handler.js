/**
 * Chat Handler für E9L Request Check
 * @class
 */
export class E9LChatHandler {
    static DEBUG = false;
    
    /**
     * Log-Funktion mit Debug-Flag
     * @param {...any} args - Log-Argumente
     */
    static log(...args) {
        if (this.DEBUG) {
            console.log('E9L Chat:', ...args);
        }
    }
    
    /**
     * Sendet eine Skill-Anforderung in den Chat
     * @param {string} skillName - Name der Fähigkeit
     * @param {number} modifier - Modifikator (-10 bis +10)
     */
    static sendSkillRequest(skillName, modifier) {
        // Input-Validierung
        if (!this._validateInput(skillName, modifier)) {
            ui.notifications.error(game.i18n.localize('E9L.errors.invalidInput'));
            return;
        }
        
        this.log(`Sende Request ${skillName} ${modifier}`);
        
        // Sanitize skill name für HTML
        const sanitizedSkillName = this._sanitizeForHTML(skillName);
        
        // Modifier Format - immer anzeigen, auch bei 0
        const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        
        // Erstelle das Makro-Text
        const macroText = `${sanitizedSkillName} ${modifierText}`;
        
        // Chat Nachricht erstellen - OHNE TextEditor.enrichHTML das ein Promise zurückgibt
        const messageContent = `
            <div class="e9l-skill-request">
                <h3><i class="fa-light fa-dice-d20"></i> ${game.i18n.localize('E9L.chat.requestTitle')}</h3>
                <p class="dice-formula">@Rq[${macroText}]</p>
            </div>
        `;
        
        // Chat Message mit Foundry v12 APIs
        try {
            ChatMessage.create({
                user: game.user.id,
                content: messageContent,
                // KEIN type field - das verursacht die rote Umrandung
                speaker: ChatMessage.getSpeaker({
                    actor: null,
                    token: null,
                    alias: game.user.name || "GM"
                }),
                flags: {
                    "e9l-request-check": {
                        skill: sanitizedSkillName,
                        modifier: modifier,
                        timestamp: Date.now()
                    }
                }
            });
            
            this.log('Nachricht gesendet');
            
        } catch (error) {
            console.error('E9L Chat: Fehler beim Senden der Nachricht', error);
            ui.notifications.error(game.i18n.localize('E9L.errors.sendError'));
        }
    }
    
    /**
     * Validiert Input-Parameter
     * @private
     * @param {string} skillName - Skill Name
     * @param {number} modifier - Modifikator
     * @returns {boolean} Ob Input valide ist
     */
    static _validateInput(skillName, modifier) {
        // Skill Name validieren
        if (!skillName || typeof skillName !== 'string' || skillName.trim().length === 0) {
            return false;
        }
        
        // Max Länge prüfen
        if (skillName.length > 100) {
            return false;
        }
        
        // Modifier validieren
        const mod = parseInt(modifier);
        if (isNaN(mod) || mod < -10 || mod > 10) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitisiert einen String für HTML-Ausgabe
     * @private
     * @param {string} str - Eingabestring
     * @returns {string} Sanitisierter String
     */
    static _sanitizeForHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    /**
     * Sendet mehrere Skill-Anforderungen
     * @param {Array} skillRequests - Array von {skillName, modifier} Objekten
     */
    static sendMultipleRequests(skillRequests) {
        if (!Array.isArray(skillRequests) || skillRequests.length === 0) {
            ui.notifications.warn(game.i18n.localize('E9L.errors.noSkillsSelected'));
            return;
        }
        
        // Maximal 10 Skills auf einmal
        if (skillRequests.length > 10) {
            ui.notifications.warn('Maximal 10 Proben gleichzeitig möglich');
            skillRequests = skillRequests.slice(0, 10);
        }
        
        const validRequests = skillRequests.filter(req => 
            this._validateInput(req.skillName, req.modifier)
        );
        
        if (validRequests.length === 0) {
            ui.notifications.error(game.i18n.localize('E9L.errors.invalidInput'));
            return;
        }
        
        // Sammelnachricht erstellen
        const requestList = validRequests.map(req => {
            const mod = parseInt(req.modifier) || 0;
            const modText = mod >= 0 ? `+${mod}` : `${mod}`;
            const sanitizedName = this._sanitizeForHTML(req.skillName);
            return mod !== 0 ? 
                `${sanitizedName} ${modText}` : 
                sanitizedName;
        });
        
        // Erstelle Listen-HTML
        const listItems = requestList.map(skill => 
            `<li class="dice-formula">@Rq[${skill}]</li>`
        ).join('');
        
        const messageContent = `
            <div class="e9l-skill-request">
                <h3><i class="fa-light fa-dice-d20"></i> ${game.i18n.localize('E9L.chat.multipleRequestTitle')}</h3>
                <ul>${listItems}</ul>
            </div>
        `;
        
        try {
            ChatMessage.create({
                user: game.user.id,
                content: messageContent,
                speaker: ChatMessage.getSpeaker({
                    actor: null,
                    token: null,
                    alias: game.user.name || "GM"
                }),
                flags: {
                    "e9l-request-check": {
                        multiple: true,
                        requests: validRequests,
                        timestamp: Date.now()
                    }
                }
            });
            
            this.log(`${validRequests.length} Nachrichten gesendet`);
            
        } catch (error) {
            console.error('E9L Chat: Fehler beim Senden mehrerer Nachrichten', error);
            ui.notifications.error(game.i18n.localize('E9L.errors.sendError'));
        }
    }
}