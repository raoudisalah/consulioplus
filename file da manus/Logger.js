/**
 * Logger - Sistema di logging avanzato
 * 
 * Fornisce logging strutturato con livelli, formattazione,
 * persistenza e filtering per debugging e monitoring
 */

export class Logger {
    constructor(name = 'Logger', options = {}) {
        this.name = name;
        this.options = {
            level: 'info', // debug, info, warn, error
            enableConsole: true,
            enableStorage: false,
            maxStorageEntries: 1000,
            timestampFormat: 'ISO', // ISO, locale, timestamp
            enableColors: true,
            enableTrace: false,
            ...options
        };
        
        // Livelli di log
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        // Colori per console
        this.colors = {
            debug: '#6B7280', // gray
            info: '#3B82F6',  // blue
            warn: '#F59E0B',  // amber
            error: '#EF4444'  // red
        };
        
        // Storage per log entries
        this.entries = [];
        this.storageKey = `logger_${name}`;
        
        // Statistiche
        this.stats = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            total: 0
        };
        
        // Carica entries da storage se abilitato
        if (this.options.enableStorage) {
            this.loadFromStorage();
        }
        
        this.info(`Logger '${name}' inizializzato`, { options: this.options });
    }
    
    /**
     * Log debug
     */
    debug(message, data = null) {
        this.log('debug', message, data);
    }
    
    /**
     * Log info
     */
    info(message, data = null) {
        this.log('info', message, data);
    }
    
    /**
     * Log warning
     */
    warn(message, data = null) {
        this.log('warn', message, data);
    }
    
    /**
     * Log error
     */
    error(message, data = null) {
        this.log('error', message, data);
    }
    
    /**
     * Log generico
     */
    log(level, message, data = null) {
        // Verifica livello
        if (!this.shouldLog(level)) {
            return;
        }
        
        // Crea entry
        const entry = this.createLogEntry(level, message, data);
        
        // Aggiungi a storage interno
        this.addEntry(entry);
        
        // Output su console se abilitato
        if (this.options.enableConsole) {
            this.outputToConsole(entry);
        }
        
        // Salva su storage se abilitato
        if (this.options.enableStorage) {
            this.saveToStorage();
        }
        
        // Aggiorna statistiche
        this.stats[level]++;
        this.stats.total++;
    }
    
    /**
     * Verifica se deve loggare per il livello
     */
    shouldLog(level) {
        const currentLevel = this.levels[this.options.level] || 1;
        const messageLevel = this.levels[level] || 1;
        
        return messageLevel >= currentLevel;
    }
    
    /**
     * Crea entry di log
     */
    createLogEntry(level, message, data) {
        const entry = {
            id: this.generateEntryId(),
            timestamp: new Date(),
            level: level,
            logger: this.name,
            message: message,
            data: data,
            stack: null
        };
        
        // Aggiungi stack trace se abilitato o per errori
        if (this.options.enableTrace || level === 'error') {
            entry.stack = this.captureStackTrace();
        }
        
        return entry;
    }
    
    /**
     * Genera ID univoco per entry
     */
    generateEntryId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Cattura stack trace
     */
    captureStackTrace() {
        try {
            const error = new Error();
            const stack = error.stack;
            
            if (stack) {
                // Rimuovi le prime righe relative al logger
                const lines = stack.split('\\n');
                return lines.slice(3).join('\\n');
            }
        } catch (e) {
            // Ignore
        }
        
        return null;
    }
    
    /**
     * Aggiunge entry al storage interno
     */
    addEntry(entry) {
        this.entries.push(entry);
        
        // Mantieni limite massimo
        if (this.entries.length > this.options.maxStorageEntries) {
            this.entries = this.entries.slice(-this.options.maxStorageEntries);
        }
    }
    
    /**
     * Output su console
     */
    outputToConsole(entry) {
        const { level, message, data, timestamp } = entry;
        
        // Formatta timestamp
        const timeStr = this.formatTimestamp(timestamp);
        
        // Formatta messaggio
        const logMessage = `[${timeStr}] [${this.name}] ${message}`;
        
        // Stile per console
        const style = this.options.enableColors ? 
            `color: ${this.colors[level]}; font-weight: ${level === 'error' ? 'bold' : 'normal'}` : 
            '';
        
        // Output basato su livello
        switch (level) {
            case 'debug':
                if (style) {
                    console.debug(`%c${logMessage}`, style, data);
                } else {
                    console.debug(logMessage, data);
                }
                break;
                
            case 'info':
                if (style) {
                    console.info(`%c${logMessage}`, style, data);
                } else {
                    console.info(logMessage, data);
                }
                break;
                
            case 'warn':
                if (style) {
                    console.warn(`%c${logMessage}`, style, data);
                } else {
                    console.warn(logMessage, data);
                }
                break;
                
            case 'error':
                if (style) {
                    console.error(`%c${logMessage}`, style, data);
                } else {
                    console.error(logMessage, data);
                }
                
                // Mostra stack trace per errori
                if (entry.stack) {
                    console.error('Stack trace:', entry.stack);
                }
                break;
                
            default:
                console.log(logMessage, data);
        }
    }
    
    /**
     * Formatta timestamp
     */
    formatTimestamp(timestamp) {
        switch (this.options.timestampFormat) {
            case 'ISO':
                return timestamp.toISOString();
                
            case 'locale':
                return timestamp.toLocaleString();
                
            case 'timestamp':
                return timestamp.getTime().toString();
                
            default:
                return timestamp.toISOString();
        }
    }
    
    /**
     * Carica entries da localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this.entries = parsed.map(entry => ({
                        ...entry,
                        timestamp: new Date(entry.timestamp)
                    }));
                }
            }
        } catch (error) {
            console.warn('Errore caricamento log da storage:', error);
        }
    }
    
    /**
     * Salva entries su localStorage
     */
    saveToStorage() {
        try {
            const toStore = this.entries.map(entry => ({
                ...entry,
                timestamp: entry.timestamp.toISOString()
            }));
            
            localStorage.setItem(this.storageKey, JSON.stringify(toStore));
        } catch (error) {
            console.warn('Errore salvataggio log su storage:', error);
        }
    }
    
    /**
     * Filtra entries per livello
     */
    filterByLevel(level) {
        return this.entries.filter(entry => entry.level === level);
    }
    
    /**
     * Filtra entries per periodo
     */
    filterByTimeRange(startTime, endTime) {
        return this.entries.filter(entry => {
            const time = entry.timestamp.getTime();
            return time >= startTime && time <= endTime;
        });
    }
    
    /**
     * Cerca entries per messaggio
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        
        return this.entries.filter(entry => {
            return entry.message.toLowerCase().includes(lowerQuery) ||
                   (entry.data && JSON.stringify(entry.data).toLowerCase().includes(lowerQuery));
        });
    }
    
    /**
     * Ottiene entries recenti
     */
    getRecent(count = 50) {
        return this.entries.slice(-count);
    }
    
    /**
     * Esporta entries come JSON
     */
    exportAsJSON() {
        return JSON.stringify(this.entries, null, 2);
    }
    
    /**
     * Esporta entries come CSV
     */
    exportAsCSV() {
        const headers = ['Timestamp', 'Level', 'Logger', 'Message', 'Data'];
        const rows = this.entries.map(entry => [
            this.formatTimestamp(entry.timestamp),
            entry.level,
            entry.logger,
            entry.message,
            entry.data ? JSON.stringify(entry.data) : ''
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\\n');
        
        return csvContent;
    }
    
    /**
     * Scarica log come file
     */
    downloadLogs(format = 'json') {
        let content, filename, mimeType;
        
        switch (format) {
            case 'json':
                content = this.exportAsJSON();
                filename = `${this.name}_logs_${Date.now()}.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':
                content = this.exportAsCSV();
                filename = `${this.name}_logs_${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
                
            default:
                throw new Error(`Formato non supportato: ${format}`);
        }
        
        // Crea e scarica file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Pulisce log
     */
    clear() {
        this.entries = [];
        this.stats = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            total: 0
        };
        
        if (this.options.enableStorage) {
            localStorage.removeItem(this.storageKey);
        }
        
        this.info('Log puliti');
    }
    
    /**
     * Imposta livello di log
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.options.level = level;
            this.info(`Livello log cambiato a: ${level}`);
        } else {
            this.warn(`Livello log non valido: ${level}`);
        }
    }
    
    /**
     * Abilita/disabilita storage
     */
    setStorage(enabled) {
        this.options.enableStorage = enabled;
        
        if (enabled) {
            this.saveToStorage();
        } else {
            localStorage.removeItem(this.storageKey);
        }
        
        this.info(`Storage log: ${enabled ? 'abilitato' : 'disabilitato'}`);
    }
    
    /**
     * Crea child logger
     */
    child(name, options = {}) {
        const childName = `${this.name}.${name}`;
        const childOptions = { ...this.options, ...options };
        
        return new Logger(childName, childOptions);
    }
    
    /**
     * Ottiene statistiche
     */
    getStats() {
        return {
            ...this.stats,
            entriesCount: this.entries.length,
            oldestEntry: this.entries.length > 0 ? this.entries[0].timestamp : null,
            newestEntry: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null
        };
    }
    
    /**
     * Ottiene configurazione
     */
    getConfig() {
        return {
            name: this.name,
            options: { ...this.options },
            levels: { ...this.levels }
        };
    }
    
    /**
     * Ottiene info debug
     */
    getDebugInfo() {
        return {
            config: this.getConfig(),
            stats: this.getStats(),
            recentEntries: this.getRecent(10)
        };
    }
    
    /**
     * Cleanup risorse
     */
    destroy() {
        if (this.options.enableStorage) {
            this.saveToStorage();
        }
        
        this.entries = [];
        this.info(`Logger '${this.name}' distrutto`);
    }
}

