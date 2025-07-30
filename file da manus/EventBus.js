/**
 * EventBus - Sistema di eventi globale
 * 
 * Gestisce la comunicazione tra componenti tramite eventi
 * con supporto per namespace, wildcard e debugging
 */

export class EventBus {
    constructor(options = {}) {
        this.options = {
            maxListeners: 100,
            enableDebug: false,
            enableWildcard: true,
            ...options
        };
        
        // Storage eventi
        this.events = new Map();
        this.onceEvents = new Set();
        this.wildcardEvents = new Map();
        
        // Statistiche
        this.stats = {
            totalEvents: 0,
            totalListeners: 0,
            eventsEmitted: 0
        };
        
        // Debug
        this.debugMode = this.options.enableDebug;
        
        console.log('EventBus inizializzato');
    }
    
    /**
     * Registra listener per evento
     */
    on(eventName, listener, context = null) {
        if (!eventName || typeof listener !== 'function') {
            console.warn('EventBus.on: parametri invalidi');
            return this;
        }
        
        // Gestione wildcard
        if (this.options.enableWildcard && eventName.includes('*')) {
            return this.onWildcard(eventName, listener, context);
        }
        
        // Crea array se non esiste
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const listeners = this.events.get(eventName);
        
        // Verifica limite listeners
        if (listeners.length >= this.options.maxListeners) {
            console.warn(`EventBus: troppi listeners per evento '${eventName}' (max: ${this.options.maxListeners})`);
            return this;
        }
        
        // Aggiungi listener
        const listenerObj = {
            fn: listener,
            context: context,
            id: this.generateListenerId()
        };
        
        listeners.push(listenerObj);
        this.stats.totalListeners++;
        
        if (this.debugMode) {
            console.log(`EventBus: listener aggiunto per '${eventName}'`, listenerObj.id);
        }
        
        return this;
    }
    
    /**
     * Registra listener wildcard
     */
    onWildcard(pattern, listener, context = null) {
        if (!this.wildcardEvents.has(pattern)) {
            this.wildcardEvents.set(pattern, []);
        }
        
        const listenerObj = {
            fn: listener,
            context: context,
            pattern: pattern,
            regex: this.createWildcardRegex(pattern),
            id: this.generateListenerId()
        };
        
        this.wildcardEvents.get(pattern).push(listenerObj);
        this.stats.totalListeners++;
        
        if (this.debugMode) {
            console.log(`EventBus: wildcard listener aggiunto per '${pattern}'`, listenerObj.id);
        }
        
        return this;
    }
    
    /**
     * Registra listener per una sola esecuzione
     */
    once(eventName, listener, context = null) {
        const onceWrapper = (...args) => {
            this.off(eventName, onceWrapper);
            listener.apply(context, args);
        };
        
        // Marca come once per tracking
        this.onceEvents.add(onceWrapper);
        
        return this.on(eventName, onceWrapper, context);
    }
    
    /**
     * Rimuove listener
     */
    off(eventName, listener = null) {
        // Rimuovi tutti i listeners se non specificato
        if (!listener) {
            return this.removeAllListeners(eventName);
        }
        
        // Rimuovi listener specifico
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            const index = listeners.findIndex(l => l.fn === listener);
            
            if (index !== -1) {
                listeners.splice(index, 1);
                this.stats.totalListeners--;
                
                if (this.debugMode) {
                    console.log(`EventBus: listener rimosso per '${eventName}'`);
                }
                
                // Rimuovi evento se nessun listener
                if (listeners.length === 0) {
                    this.events.delete(eventName);
                }
            }
        }
        
        // Rimuovi da wildcard events
        this.wildcardEvents.forEach((listeners, pattern) => {
            const index = listeners.findIndex(l => l.fn === listener);
            if (index !== -1) {
                listeners.splice(index, 1);
                this.stats.totalListeners--;
                
                if (listeners.length === 0) {
                    this.wildcardEvents.delete(pattern);
                }
            }
        });
        
        // Rimuovi da once events
        this.onceEvents.delete(listener);
        
        return this;
    }
    
    /**
     * Rimuove tutti i listeners per evento
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            // Rimuovi listeners per evento specifico
            if (this.events.has(eventName)) {
                const count = this.events.get(eventName).length;
                this.events.delete(eventName);
                this.stats.totalListeners -= count;
                
                if (this.debugMode) {
                    console.log(`EventBus: rimossi ${count} listeners per '${eventName}'`);
                }
            }
        } else {
            // Rimuovi tutti i listeners
            const totalCount = this.stats.totalListeners;
            this.events.clear();
            this.wildcardEvents.clear();
            this.onceEvents.clear();
            this.stats.totalListeners = 0;
            
            if (this.debugMode) {
                console.log(`EventBus: rimossi tutti i ${totalCount} listeners`);
            }
        }
        
        return this;
    }
    
    /**
     * Emette evento
     */
    emit(eventName, ...args) {
        if (!eventName) {
            console.warn('EventBus.emit: nome evento richiesto');
            return false;
        }
        
        let listenersExecuted = 0;
        
        try {
            // Emetti per listeners diretti
            if (this.events.has(eventName)) {
                const listeners = [...this.events.get(eventName)]; // Copia per evitare modifiche durante iterazione
                
                listeners.forEach(listenerObj => {
                    try {
                        listenerObj.fn.apply(listenerObj.context, args);
                        listenersExecuted++;
                    } catch (error) {
                        console.error(`EventBus: errore in listener per '${eventName}':`, error);
                    }
                });
            }
            
            // Emetti per wildcard listeners
            if (this.options.enableWildcard) {
                this.wildcardEvents.forEach(listeners => {
                    listeners.forEach(listenerObj => {
                        if (listenerObj.regex.test(eventName)) {
                            try {
                                listenerObj.fn.apply(listenerObj.context, args);
                                listenersExecuted++;
                            } catch (error) {
                                console.error(`EventBus: errore in wildcard listener per '${eventName}':`, error);
                            }
                        }
                    });
                });
            }
            
            // Aggiorna statistiche
            this.stats.eventsEmitted++;
            
            if (this.debugMode) {
                console.log(`EventBus: evento '${eventName}' emesso per ${listenersExecuted} listeners`, args);
            }
            
            return listenersExecuted > 0;
            
        } catch (error) {
            console.error(`EventBus: errore durante emit di '${eventName}':`, error);
            return false;
        }
    }
    
    /**
     * Emette evento in modo asincrono
     */
    async emitAsync(eventName, ...args) {
        if (!eventName) {
            console.warn('EventBus.emitAsync: nome evento richiesto');
            return false;
        }
        
        let listenersExecuted = 0;
        const promises = [];
        
        try {
            // Raccogli tutti i listeners
            const allListeners = [];
            
            // Listeners diretti
            if (this.events.has(eventName)) {
                allListeners.push(...this.events.get(eventName));
            }
            
            // Wildcard listeners
            if (this.options.enableWildcard) {
                this.wildcardEvents.forEach(listeners => {
                    listeners.forEach(listenerObj => {
                        if (listenerObj.regex.test(eventName)) {
                            allListeners.push(listenerObj);
                        }
                    });
                });
            }
            
            // Esegui listeners
            allListeners.forEach(listenerObj => {
                const promise = Promise.resolve().then(() => {
                    return listenerObj.fn.apply(listenerObj.context, args);
                }).catch(error => {
                    console.error(`EventBus: errore in async listener per '${eventName}':`, error);
                });
                
                promises.push(promise);
                listenersExecuted++;
            });
            
            // Attendi tutti i listeners
            await Promise.allSettled(promises);
            
            // Aggiorna statistiche
            this.stats.eventsEmitted++;
            
            if (this.debugMode) {
                console.log(`EventBus: evento async '${eventName}' emesso per ${listenersExecuted} listeners`, args);
            }
            
            return listenersExecuted > 0;
            
        } catch (error) {
            console.error(`EventBus: errore durante emitAsync di '${eventName}':`, error);
            return false;
        }
    }
    
    /**
     * Crea regex per wildcard pattern
     */
    createWildcardRegex(pattern) {
        // Escape caratteri speciali eccetto *
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        
        // Sostituisci * con regex
        const regexPattern = escaped.replace(/\*/g, '.*');
        
        return new RegExp(`^${regexPattern}$`);
    }
    
    /**
     * Genera ID univoco per listener
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Verifica se ha listeners per evento
     */
    hasListeners(eventName) {
        if (this.events.has(eventName) && this.events.get(eventName).length > 0) {
            return true;
        }
        
        // Verifica wildcard
        if (this.options.enableWildcard) {
            for (const [pattern, listeners] of this.wildcardEvents) {
                if (listeners.length > 0) {
                    const regex = this.createWildcardRegex(pattern);
                    if (regex.test(eventName)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Ottiene lista eventi registrati
     */
    getEventNames() {
        const events = Array.from(this.events.keys());
        const wildcards = Array.from(this.wildcardEvents.keys());
        
        return [...events, ...wildcards];
    }
    
    /**
     * Ottiene numero listeners per evento
     */
    getListenerCount(eventName) {
        let count = 0;
        
        // Listeners diretti
        if (this.events.has(eventName)) {
            count += this.events.get(eventName).length;
        }
        
        // Wildcard listeners
        if (this.options.enableWildcard) {
            this.wildcardEvents.forEach((listeners, pattern) => {
                const regex = this.createWildcardRegex(pattern);
                if (regex.test(eventName)) {
                    count += listeners.length;
                }
            });
        }
        
        return count;
    }
    
    /**
     * Abilita/disabilita debug
     */
    setDebug(enabled) {
        this.debugMode = enabled;
        console.log(`EventBus debug: ${enabled ? 'abilitato' : 'disabilitato'}`);
    }
    
    /**
     * Ottiene statistiche
     */
    getStats() {
        return {
            ...this.stats,
            totalEventTypes: this.events.size + this.wildcardEvents.size,
            directEvents: this.events.size,
            wildcardEvents: this.wildcardEvents.size
        };
    }
    
    /**
     * Ottiene info debug
     */
    getDebugInfo() {
        const info = {
            stats: this.getStats(),
            events: {},
            wildcardEvents: {},
            options: this.options
        };
        
        // Eventi diretti
        this.events.forEach((listeners, eventName) => {
            info.events[eventName] = {
                listenerCount: listeners.length,
                listeners: listeners.map(l => ({
                    id: l.id,
                    hasContext: !!l.context
                }))
            };
        });
        
        // Eventi wildcard
        this.wildcardEvents.forEach((listeners, pattern) => {
            info.wildcardEvents[pattern] = {
                listenerCount: listeners.length,
                listeners: listeners.map(l => ({
                    id: l.id,
                    hasContext: !!l.context
                }))
            };
        });
        
        return info;
    }
    
    /**
     * Reset completo
     */
    reset() {
        this.removeAllListeners();
        this.stats = {
            totalEvents: 0,
            totalListeners: 0,
            eventsEmitted: 0
        };
        
        console.log('EventBus reset completato');
    }
    
    /**
     * Cleanup risorse
     */
    destroy() {
        this.reset();
        console.log('EventBus distrutto');
    }
}

