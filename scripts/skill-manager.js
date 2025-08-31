import { E9LSettings } from './settings.js';

/**
 * Skill Manager für E9L Request Probe
 * @class
 */
export class E9LSkillManager {
    static skills = [];
    static DEBUG = false;
    
    /**
     * Log-Funktion mit Debug-Flag
     * @param {...any} args - Log-Argumente
     */
    static log(...args) {
        if (this.DEBUG) {
            console.log('E9L SkillManager:', ...args);
        }
    }
    
    /**
     * Initialisiert den Skill Manager
     */
    static initialize() {
        this.log('Init');
        this.loadSkills();
    }
    
    /**
     * Lädt Skills aus dem DSA5 System
     * @returns {Promise<Array>} Array von Skills
     */
    static async loadSkills() {
        this.log('Lade Skills');
        
        this.skills = [];
        
        try {
            // Versuche Skills aus dem DSA5 System zu laden
            const dsa5Skills = this._loadDSA5Skills();
            
            if (dsa5Skills.length > 0) {
                this.skills = dsa5Skills;
            } else {
                // Fallback: Lade aus Compendium oder Actor Template
                const compendiumSkills = await this._loadFromCompendium();
                if (compendiumSkills.length > 0) {
                    this.skills = compendiumSkills;
                } else {
                    this.log('Verwende Standard-Talente als Fallback');
                    this._loadDefaultSkills();
                }
            }
            
        } catch (error) {
            console.error('E9L SkillManager: Fehler beim Laden', error);
            this._loadDefaultSkills();
        }
        
        // Alphabetisch sortieren
        this.skills.sort((a, b) => a.name.localeCompare(b.name));
        
        this.log(`${this.skills.length} Talente geladen`);
        return this.skills;
    }
    
    /**
     * Lädt Skills aus DSA5 CONFIG
     * @private
     * @returns {Array} Array von Skills
     */
    static _loadDSA5Skills() {
        const skills = [];
        
        // Prüfe verschiedene mögliche Orte im DSA5 System
        const sources = [
            CONFIG.DSA5?.talent,
            CONFIG.DSA5?.skills,
            game.dsa5?.config?.talents,
            game.system?.config?.skills
        ];
        
        for (const source of sources) {
            if (source && typeof source === 'object') {
                for (const [key, value] of Object.entries(source)) {
                    // Filter für ungültige Einträge
                    if (this._isValidSkill(key, value)) {
                        const name = game.i18n.localize(value.label || value) || key;
                        skills.push({ 
                            id: key, 
                            name: name,
                            system: true 
                        });
                    }
                }
                if (skills.length > 0) break;
            }
        }
        
        return skills;
    }
    
    /**
     * Prüft ob ein Skill gültig ist
     * @private
     * @param {string} key - Skill Key
     * @param {any} value - Skill Value
     * @returns {boolean}
     */
    static _isValidSkill(key, value) {
        const excludePatterns = [
            'race', 'combat', 'currency', 'meleeweapon', 'rangeweapon',
            'kampftechnik', 'währung', 'rasse'
        ];
        
        const keyLower = key.toLowerCase();
        return !excludePatterns.some(pattern => keyLower.includes(pattern));
    }
    
    /**
     * Lädt Skills aus Compendium
     * @private
     * @returns {Promise<Array>} Array von Skills
     */
    static async _loadFromCompendium() {
        const skills = [];
        
        try {
            // Suche nach DSA5 Talent Compendium
            const pack = game.packs.find(p => 
                p.metadata.type === 'Item' && 
                p.metadata.system === 'dsa5' &&
                (p.metadata.name.includes('talent') || p.metadata.name.includes('skill'))
            );
            
            if (pack) {
                const items = await pack.getDocuments();
                for (const item of items) {
                    if (item.type === 'skill' || item.type === 'talent') {
                        skills.push({
                            id: item.id || item.name.toLowerCase().replace(/\s/g, '_'),
                            name: item.name,
                            compendium: true
                        });
                    }
                }
            }
        } catch (error) {
            this.log('Compendium nicht verfügbar', error);
        }
        
        return skills;
    }
    
    /**
     * Lädt Standard DSA5 Talente
     * @private
     */
    static _loadDefaultSkills() {
        const talente = [
            // Körpertalente
            'Fliegen', 'Gaukeleien', 'Klettern', 'Körperbeherrschung', 'Kraftakt', 
            'Reiten', 'Schwimmen', 'Selbstbeherrschung', 'Singen', 'Sinnesschärfe', 
            'Tanzen', 'Taschendiebstahl', 'Verbergen', 'Zechen',
            
            // Gesellschaftstalente  
            'Bekehren & Überzeugen', 'Betören', 'Einschüchtern', 'Etikette', 
            'Gassenwissen', 'Menschenkenntnis', 'Überreden', 'Verkleiden', 'Willenskraft',
            
            // Naturtalente
            'Fährtensuchen', 'Fesseln', 'Fischen & Angeln', 'Orientierung', 
            'Pflanzenkunde', 'Tierkunde', 'Wildnisleben',
            
            // Wissenstalente
            'Brett- & Glücksspiel', 'Geographie', 'Geschichtswissen', 'Götter & Kulte', 
            'Kriegskunst', 'Magiekunde', 'Mechanik', 'Rechnen', 'Rechtskunde', 
            'Sagen & Legenden', 'Sphärenkunde', 'Sternkunde',
            
            // Handwerkstalente
            'Alchimie', 'Boote & Schiffe', 'Fahrzeuge', 'Handel', 'Heilkunde Gift', 
            'Heilkunde Krankheiten', 'Heilkunde Seele', 'Heilkunde Wunden', 
            'Holzbearbeitung', 'Lebensmittelbearbeitung', 'Lederbearbeitung', 
            'Malen & Zeichnen', 'Metallbearbeitung', 'Musizieren', 'Schlösserknacken', 
            'Steinbearbeitung', 'Stoffbearbeitung'
        ];
        
        talente.forEach(name => {
            this.skills.push({
                id: this._sanitizeId(name),
                name: name,
                fallback: true
            });
        });
    }
    
    /**
     * Sanitisiert eine ID
     * @private
     * @param {string} str - Eingabestring
     * @returns {string} Sanitisierte ID
     */
    static _sanitizeId(str) {
        return str.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/&/g, 'und')
            .replace(/[äöüß]/g, (match) => {
                const replacements = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
                return replacements[match];
            });
    }
    
    /**
     * Gibt alle Skills zurück
     * @returns {Promise<Array>} Array aller Skills
     */
    static async getAllSkills() {
        if (this.skills.length === 0) {
            await this.loadSkills();
        }
        return this.skills;
    }
    
    /**
     * Gibt nur sichtbare Skills zurück
     * @returns {Promise<Array>} Array sichtbarer Skills
     */
    static async getVisibleSkills() {
        const allSkills = await this.getAllSkills();
        const visibility = E9LSettings.getSkillVisibility();
        
        // Standard: alle sichtbar wenn nicht anders konfiguriert
        const visibleSkills = allSkills.filter(skill => {
            return visibility[skill.id] !== false;
        });
        
        this.log(`${visibleSkills.length} sichtbare Skills`);
        return visibleSkills;
    }
    
    /**
     * Sucht Skill by ID
     * @param {string} skillId - Skill ID
     * @returns {Object|undefined} Skill Objekt
     */
    static getSkillById(skillId) {
        return this.skills.find(s => s.id === skillId);
    }
    
    /**
     * Sucht Skill by Name
     * @param {string} skillName - Skill Name
     * @returns {Object|undefined} Skill Objekt
     */
    static getSkillByName(skillName) {
        return this.skills.find(s => s.name === skillName);
    }
}