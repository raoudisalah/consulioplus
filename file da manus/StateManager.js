/**
 * StateManager - Gestione centralizzata dello stato dell'applicazione
 * 
 * Sistema di gestione stato per AI Co-Pilota Pro v2.0
 * Compatibile con Laravel 9.x e browser moderni
 */

export class StateManager {
    constructor(options = {}) {
        this.options = {
            persistKey: 'aiCopilot_state',
            autoSave: true,
            saveInterval: 5000, // 5 secondi
            ...options
        };
        
        // Stato iniziale dell'applicazione
        this.state = {
            // Informazioni sessione
            session: {
                id: null,
                active: false,
                client: null,
                consultant: null,
                startTime: null,
                status: 'idle' // idle, starting, active, paused, ending
            },
            
            // Stato audio
            audio: {
                recording: false,
                paused: false,
                level: 0,
                context: null,
                supported: false,
                error: null
            },
            
            // Stato AI
            ai: {
                processing: false,
                suggestions: [],
                currentIndex: 0,
                lastUpdate: null,
                webResults: [],
                insights: []
            },
            
            // Stato UI
            ui: {
                activeView: 'chat',
                modalOpen: false,
                loading: false,
                notifications: [],
                theme: 'light'
            },
            
            // Conversazione
            conversation: {
                messages: [],
                transcript: '',
                lastMessage: null,
                messageCount: 0
            },
            
            // Configurazione
            config: {
                audioSampleRate: 16000,
                audioBufferSize: 4096,
                maxMessages: 1000,
                autoScroll: true,
                showTimestamps: true
            }
        };
        
        // Subscribers per reattività
        this.subscribers = new Map();
        
        // Timer per auto-save
        this.saveTimer = null;
        
        // Flag di inizializzazione
        this.initialized = false;
    }
    
    /**
     * Inizializza il StateManager
     */
    async initialize() {
        try {
            // Carica stato persistente se disponibile
            await this.loadPersistedState();
            
            // Setup auto-save se abilitato
            if (this.options.autoSave) {
                this.setupAutoSave();
            }
            
            // Setup event listeners per persistenza
            this.setupPersistenceListeners();
            
            this.initialized = true;
            
            console.log('StateManager inizializzato', {
                persistKey: this.options.persistKey,
                autoSave: this.options.autoSave
            });
            
        } catch (error) {
            console.error('Errore inizializzazione StateManager:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene valore dallo stato usando path notation
     * @param {string} path - Path del valore (es. 'session.id', 'audio.recording')
     * @returns {*} Valore richiesto
     */
    get(path) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, this.state);
    }
    
    /**
     * Imposta valore nello stato
     * @param {string} path - Path del valore
     * @param {*} value - Nuovo valore
     * @param {boolean} notify - Se notificare i subscribers (default: true)
     */
    set(path, value, notify = true) {
        if (!path) {
            console.warn('StateManager.set: path richiesto');
            return;
        }
        
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        // Naviga fino al parent object
        const parent = keys.reduce((obj, key) => {
            if (!obj[key] || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            return obj[key];
        }, this.state);
        
        // Salva valore precedente per confronto
        const oldValue = parent[lastKey];
        
        // Imposta nuovo valore
        parent[lastKey] = value;
        
        // Notifica subscribers se il valore è cambiato
        if (notify && oldValue !== value) {
            this.notifySubscribers(path, value, oldValue);
        }
        
        // Trigger auto-save se abilitato
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
    }
    
    /**
     * Aggiorna stato con oggetto parziale
     * @param {object} updates - Oggetto con aggiornamenti
     */
    update(updates) {
        Object.keys(updates).forEach(path => {
            this.set(path, updates[path], false);
        });
        
        // Notifica una volta sola per tutti gli aggiornamenti
        this.notifySubscribers('*', this.state, null);
    }
    
    /**
     * Sottoscrive ai cambiamenti di stato
     * @param {string} path - Path da monitorare ('*' per tutti)
     * @param {function} callback - Callback da chiamare
     * @returns {function} Funzione per annullare sottoscrizione
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);
        
        // Ritorna funzione per unsubscribe
        return () => {
            const pathSubscribers = this.subscribers.get(path);
            if (pathSubscribers) {
                pathSubscribers.delete(callback);
                if (pathSubscribers.size === 0) {
                    this.subscribers.delete(path);
                }
            }
        };
    }
    
    /**
     * Notifica subscribers dei cambiamenti
     */
    notifySubscribers(path, newValue, oldValue) {
        // Notifica subscribers specifici del path
        const pathSubscribers = this.subscribers.get(path);
        if (pathSubscribers) {
            pathSubscribers.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('Errore in subscriber callback:', error);
                }
            });
        }
        
        // Notifica subscribers globali
        const globalSubscribers = this.subscribers.get('*');
        if (globalSubscribers) {
            globalSubscribers.forEach(callback => {
                try {
                    callback(this.state, { path, newValue, oldValue });
                } catch (error) {
                    console.error('Errore in global subscriber callback:', error);
                }
            });
        }
    }
    
    /**
     * Dispatch di azioni per modifiche complesse
     * @param {string} action - Nome azione
     * @param {*} payload - Dati azione
     */
    dispatch(action, payload) {
        switch (action) {
            case 'SESSION_START':
                this.handleSessionStart(payload);
                break;
                
            case 'SESSION_END':
                this.handleSessionEnd(payload);
                break;
                
            case 'AUDIO_START_RECORDING':
                this.handleAudioStartRecording(payload);
                break;
                
            case 'AUDIO_STOP_RECORDING':
                this.handleAudioStopRecording(payload);
                break;
                
            case 'ADD_MESSAGE':
                this.handleAddMessage(payload);
                break;
                
            case 'ADD_SUGGESTION':
                this.handleAddSuggestion(payload);
                break;
                
            case 'SHOW_NOTIFICATION':
                this.handleShowNotification(payload);
                break;
                
            case 'CLEAR_NOTIFICATIONS':
                this.handleClearNotifications();
                break;
                
            case 'RESET_STATE':
                this.handleResetState();
                break;
                
            default:
                console.warn(`Azione sconosciuta: ${action}`);
        }
    }
    
    /**
     * Handler per avvio sessione
     */
    handleSessionStart(payload) {
        this.update({
            'session.id': payload.sessionId,
            'session.active': true,
            'session.client': payload.client,
            'session.consultant': payload.consultant,
            'session.startTime': new Date().toISOString(),
            'session.status': 'active',
            'conversation.messages': [],
            'conversation.transcript': '',
            'ai.suggestions': [],
            'ai.webResults': []
        });
    }
    
    /**
     * Handler per fine sessione
     */
    handleSessionEnd(payload) {
        this.update({
            'session.active': false,
            'session.status': 'idle',
            'audio.recording': false,
            'audio.paused': false,
            'ai.processing': false
        });
    }
    
    /**
     * Handler per inizio registrazione audio
     */
    handleAudioStartRecording(payload) {
        this.update({
            'audio.recording': true,
            'audio.paused': false,
            'audio.context': payload.context,
            'audio.supported': true,
            'audio.error': null
        });
    }
    
    /**
     * Handler per stop registrazione audio
     */
    handleAudioStopRecording(payload) {
        this.update({
            'audio.recording': false,
            'audio.paused': false,
            'audio.level': 0
        });
    }
    
    /**
     * Handler per aggiunta messaggio
     */
    handleAddMessage(payload) {
        const messages = this.get('conversation.messages') || [];
        const newMessage = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...payload
        };
        
        // Aggiungi messaggio
        messages.push(newMessage);
        
        // Mantieni solo gli ultimi N messaggi
        const maxMessages = this.get('config.maxMessages') || 1000;
        if (messages.length > maxMessages) {
            messages.splice(0, messages.length - maxMessages);
        }
        
        this.update({
            'conversation.messages': messages,
            'conversation.lastMessage': newMessage,
            'conversation.messageCount': messages.length
        });
        
        // Aggiorna transcript se è una trascrizione
        if (payload.type === 'transcription') {
            const currentTranscript = this.get('conversation.transcript') || '';
            this.set('conversation.transcript', currentTranscript + ' ' + payload.content);
        }
    }
    
    /**
     * Handler per aggiunta suggerimento
     */
    handleAddSuggestion(payload) {
        const suggestions = this.get('ai.suggestions') || [];
        const newSuggestion = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...payload
        };
        
        suggestions.push(newSuggestion);
        
        this.update({
            'ai.suggestions': suggestions,
            'ai.lastUpdate': new Date().toISOString()
        });
    }
    
    /**
     * Handler per notifiche
     */
    handleShowNotification(payload) {
        const notifications = this.get('ui.notifications') || [];
        const notification = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            type: 'info',
            autoHide: true,
            duration: 5000,
            ...payload
        };
        
        notifications.push(notification);
        this.set('ui.notifications', notifications);
        
        // Auto-hide se configurato
        if (notification.autoHide) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, notification.duration);
        }
    }
    
    /**
     * Rimuove notifica
     */
    removeNotification(notificationId) {
        const notifications = this.get('ui.notifications') || [];
        const filtered = notifications.filter(n => n.id !== notificationId);
        this.set('ui.notifications', filtered);
    }
    
    /**
     * Handler per clear notifiche
     */
    handleClearNotifications() {
        this.set('ui.notifications', []);
    }
    
    /**
     * Handler per reset stato
     */
    handleResetState() {
        // Mantieni solo configurazione
        const config = this.get('config');
        
        this.state = {
            session: {
                id: null,
                active: false,
                client: null,
                consultant: null,
                startTime: null,
                status: 'idle'
            },
            audio: {
                recording: false,
                paused: false,
                level: 0,
                context: null,
                supported: false,
                error: null
            },
            ai: {
                processing: false,
                suggestions: [],
                currentIndex: 0,
                lastUpdate: null,
                webResults: [],
                insights: []
            },
            ui: {
                activeView: 'chat',
                modalOpen: false,
                loading: false,
                notifications: [],
                theme: 'light'
            },
            conversation: {
                messages: [],
                transcript: '',
                lastMessage: null,
                messageCount: 0
            },
            config: config
        };
        
        this.notifySubscribers('*', this.state, null);
    }
    
    /**
     * Setup auto-save
     */
    setupAutoSave() {
        this.saveTimer = setInterval(() => {
            this.save();
        }, this.options.saveInterval);
    }
    
    /**
     * Schedule auto-save (debounced)
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this.save();
        }, 1000); // Salva dopo 1 secondo di inattività
    }
    
    /**
     * Setup listeners per persistenza
     */
    setupPersistenceListeners() {
        // Salva prima di chiudere pagina
        window.addEventListener('beforeunload', () => {
            this.save();
        });
        
        // Salva quando la pagina diventa nascosta
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.save();
            }
        });
    }
    
    /**
     * Carica stato persistente
     */
    async loadPersistedState() {
        try {
            const persistedData = localStorage.getItem(this.options.persistKey);
            
            if (persistedData) {
                const parsed = JSON.parse(persistedData);
                
                // Merge con stato default (mantieni struttura corrente)
                this.state = this.deepMerge(this.state, parsed);
                
                console.log('Stato persistente caricato');
            }
        } catch (error) {
            console.warn('Errore caricamento stato persistente:', error);
            // Continua con stato default
        }
    }
    
    /**
     * Salva stato corrente
     */
    save() {
        try {
            // Non salvare dati sensibili o temporanei
            const stateToSave = {
                ...this.state,
                session: {
                    ...this.state.session,
                    id: null, // Non persistere session ID
                    active: false // Reset stato attivo
                },
                audio: {
                    ...this.state.audio,
                    recording: false,
                    context: null // Non persistere context audio
                },
                ui: {
                    ...this.state.ui,
                    notifications: [] // Non persistere notifiche
                }
            };
            
            localStorage.setItem(this.options.persistKey, JSON.stringify(stateToSave));
            
        } catch (error) {
            console.warn('Errore salvataggio stato:', error);
        }
    }
    
    /**
     * Deep merge di oggetti
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    /**
     * Cleanup risorse
     */
    cleanup() {
        // Ferma auto-save
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }
        
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Salva stato finale
        this.save();
        
        // Clear subscribers
        this.subscribers.clear();
        
        console.log('StateManager cleanup completato');
    }
    
    /**
     * Debug: ottieni stato completo
     */
    getDebugInfo() {
        return {
            state: this.state,
            subscribers: Array.from(this.subscribers.keys()),
            options: this.options,
            initialized: this.initialized
        };
    }
}

