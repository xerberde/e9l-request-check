/**
 * Chat Handler für E9L Request Probe
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
            ui.notifications.error('Ungültige Eingabe für Skill-Request');
            return;
        }
        
        this.log(`Sende Request ${skillName} ${modifier}`);
        
        // Sanitize skill name für HTML
        const sanitizedSkillName = this._sanitizeForHTML(skillName);
        
        // Modifier Format - immer anzeigen, auch bei 0
        const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        const skillText = `${sanitizedSkillName} ${modifierText}`;
        
        // Chat Nachricht erstellen - Standard Foundry Styling
        const messageContent = `
            <h3><i class="fa-light fa-dice-d20"></i> ${game.i18n.localize('E9L.chat.requestTitle')}</h3>
            <p class="dice-formula">@Rq[${skillText}]</p>
        `;
        
        // Chat Message mit Fehlerbehandlung
        try {
            ChatMessage.create({
                user: game.user.id,
                content: messageContent,
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                speaker: ChatMessage.getSpeaker({
                    actor: null,
                    token: null,
                    alias: game.user.name || "GM"
                }),
                flags: {
                    "e9l-request-probe": {
                        skill: sanitizedSkillName,
                        modifier: modifier,
                        timestamp: Date.now()
                    }
                }
            });
            
            this.log('Nachricht gesendet');
            
        } catch (error) {
            console.error('E9L Chat: Fehler beim Senden der Nachricht', error);
            ui.notifications.error('Fehler beim Senden der Probe-Anforderung');
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
        
        if (skillName.length > 100) { // Max Länge
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
            ui.notifications.warn('Keine Skills ausgewählt');
            return;
        }
        
        const validRequests = skillRequests.filter(req => 
            this._validateInput(req.skillName, req.modifier)
        );
        
        if (validRequests.length === 0) {
            ui.notifications.error('Keine gültigen Skill-Requests');
            return;
        }
        
        // Sammelnachricht erstellen
        const requestList = validRequests.map(req => {
            const mod = parseInt(req.modifier) || 0;
            const modText = mod >= 0 ? `+${mod}` : `${mod}`;
            return mod !== 0 ? 
                `${this._sanitizeForHTML(req.skillName)} ${modText}` : 
                this._sanitizeForHTML(req.skillName);
        });
        
        const messageContent = `
            <h3><i class="fa-light fa-dice-d20"></i> ${game.i18n.localize('E9L.chat.multipleRequestTitle') || 'Mehrere Proben angefordert'}</h3>
            <ul>
                ${requestList.map(skill => `<li class="dice-formula">@Rq[${skill}]</li>`).join('')}
            </ul>
        `;
        
        try {
            ChatMessage.create({
                user: game.user.id,
                content: messageContent,
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                speaker: ChatMessage.getSpeaker({
                    actor: null,
                    token: null,
                    alias: game.user.name || "GM"
                }),
                flags: {
                    "e9l-request-probe": {
                        multiple: true,
                        requests: validRequests,
                        timestamp: Date.now()
                    }
                }
            });
            
            this.log(`${validRequests.length} Nachrichten gesendet`);
            
        } catch (error) {
            console.error('E9L Chat: Fehler beim Senden mehrerer Nachrichten', error);
            ui.notifications.error('Fehler beim Senden der Proben-Anforderungen');
        }
    }
}