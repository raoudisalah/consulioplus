/**
 * SessionManager - Gestione sessioni AI Co-Pilota
 * 
 * Gestisce il ciclo di vita delle sessioni, sincronizzazione con backend
 * e persistenza dello stato sessione
 */

export class SessionManager {
    constructor(options = {}) {
        this.options = {
            autoSave: true,
            saveInterval: 30000, // 30 secondi
            maxSessionDuration: 4 * 60 * 60 * 1000, // 4 ore
            ...options
        };
        
        // Riferimenti servizi
        this.stateManager = options.stateManager;
        this.apiClient = options.apiClient;
        
        // Stato sessione
        this.currentSession = null;
        this.sessionTimer = null;
        this.saveTimer = null;
        
        // Callbacks
        this.onSessionStart = null;
        this.onSessionEnd = null;
        this.onSessionUpdate = null;
        this.onError = null;
    }
    
    /**
     * Avvia nuova sessione
     */
    async startSession(sessionData) {
        try {
            // Verifica se c'è già una sessione attiva
            if (this.currentSession && this.currentSession.active) {
                console.warn('Sessione già attiva, termino quella precedente');
                await this.endSession();
            }
            
            // Valida dati sessione
            this.validateSessionData(sessionData);
            
            // Chiama backend per creare sessione
            const response = await this.apiClient.post('/ai-copilot-v2/session/start', {
                consultantType: sessionData.consultantType,
                clientInfo: sessionData.clientInfo || null
            });
            
            if (!response.success) {
                throw new Error(response.error || 'Errore creazione sessione');
            }
            
            // Crea oggetto sessione
            this.currentSession = {
                id: response.sessionId,
                active: true,
                startTime: new Date().toISOString(),
                consultantType: sessionData.consultantType,
                client: sessionData.client || null,
                consultant: sessionData.consultant || null,
                metadata: {
                    version: '2.0.0',
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                }
            };
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.dispatch('SESSION_START', {
                    sessionId: this.currentSession.id,
                    client: this.currentSession.client,
                    consultant: this.currentSession.consultant
                });
            }
            
            // Setup timer sessione
            this.setupSessionTimer();
            
            // Setup auto-save
            if (this.options.autoSave) {
                this.setupAutoSave();
            }
            
            // Callback
            if (this.onSessionStart) {
                this.onSessionStart(this.currentSession);
            }
            
            console.log('Sessione avviata:', this.currentSession.id);
            
            return this.currentSession;
            
        } catch (error) {
            console.error('Errore avvio sessione:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            // Notifica errore
            if (this.stateManager) {
                this.stateManager.dispatch('SHOW_NOTIFICATION', {
                    type: 'error',
                    title: 'Errore Sessione',
                    message: 'Impossibile avviare la sessione AI'
                });
            }
            
            throw error;
        }
    }
    
    /**
     * Termina sessione corrente
     */
    async endSession(saveReport = true) {
        try {
            if (!this.currentSession || !this.currentSession.active) {
                console.warn('Nessuna sessione attiva da terminare');
                return;
            }
            
            // Prepara dati per report finale
            const sessionData = this.prepareSessionData();
            
            // Chiama backend per terminare sessione
            if (saveReport) {
                const response = await this.apiClient.post('/ai-copilot-v2/session/end', {
                    sessionId: this.currentSession.id,
                    conversationHistory: sessionData.conversationHistory,
                    suggestions: JSON.stringify(sessionData.suggestions),
                    notes: sessionData.notes || ''
                });
                
                if (!response.success) {
                    console.warn('Errore salvataggio report:', response.error);
                }
            }
            
            // Cleanup timer
            this.cleanupTimers();
            
            // Aggiorna stato
            this.currentSession.active = false;
            this.currentSession.endTime = new Date().toISOString();
            
            if (this.stateManager) {
                this.stateManager.dispatch('SESSION_END', {
                    sessionId: this.currentSession.id,
                    duration: this.getSessionDuration()
                });
            }
            
            // Callback
            if (this.onSessionEnd) {
                this.onSessionEnd(this.currentSession);
            }
            
            console.log('Sessione terminata:', this.currentSession.id);
            
            // Reset sessione
            const endedSession = { ...this.currentSession };
            this.currentSession = null;
            
            return endedSession;
            
        } catch (error) {
            console.error('Errore termine sessione:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Pausa sessione
     */
    pauseSession() {
        if (!this.currentSession || !this.currentSession.active) {
            console.warn('Nessuna sessione attiva da pausare');
            return;
        }
        
        this.currentSession.paused = true;
        this.currentSession.pauseTime = new Date().toISOString();
        
        // Pausa timer
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // Aggiorna stato
        if (this.stateManager) {
            this.stateManager.set('session.status', 'paused');
        }
        
        console.log('Sessione in pausa');
    }
    
    /**
     * Riprende sessione
     */
    resumeSession() {
        if (!this.currentSession || !this.currentSession.paused) {
            console.warn('Nessuna sessione in pausa da riprendere');
            return;
        }
        
        this.currentSession.paused = false;
        this.currentSession.resumeTime = new Date().toISOString();
        
        // Riavvia timer
        this.setupSessionTimer();
        
        // Aggiorna stato
        if (this.stateManager) {
            this.stateManager.set('session.status', 'active');
        }
        
        console.log('Sessione ripresa');
    }
    
    /**
     * Valida dati sessione
     */
    validateSessionData(sessionData) {
        if (!sessionData) {
            throw new Error('Dati sessione richiesti');
        }
        
        if (!sessionData.consultantType) {
            throw new Error('Tipo consulente richiesto');
        }
        
        // Valida tipo consulente
        const validTypes = [
            'Consulente del Lavoro',
            'Medico',
            'Avvocato',
            'Consulente Generico'
        ];
        
        if (!validTypes.includes(sessionData.consultantType)) {
            throw new Error('Tipo consulente non valido');
        }
    }
    
    /**
     * Setup timer sessione
     */
    setupSessionTimer() {
        // Clear timer esistente
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        // Setup nuovo timer per durata massima
        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.options.maxSessionDuration);
    }
    
    /**
     * Gestisce timeout sessione
     */
    async handleSessionTimeout() {
        console.warn('Sessione scaduta per timeout');
        
        // Notifica utente
        if (this.stateManager) {
            this.stateManager.dispatch('SHOW_NOTIFICATION', {
                type: 'warning',
                title: 'Sessione Scaduta',
                message: 'La sessione è stata terminata automaticamente per durata massima raggiunta',
                persistent: true,
                actions: [{
                    label: 'Nuova Sessione',
                    action: () => {
                        window.AICoPilotEventBus?.emit('session:restart');
                    }
                }]
            });
        }
        
        // Termina sessione
        await this.endSession(true);
    }
    
    /**
     * Setup auto-save
     */
    setupAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }
        
        this.saveTimer = setInterval(() => {
            this.saveSessionState();
        }, this.options.saveInterval);
    }
    
    /**
     * Salva stato sessione
     */
    async saveSessionState() {
        try {
            if (!this.currentSession || !this.currentSession.active) {
                return;
            }
            
            const sessionData = this.prepareSessionData();
            
            // Salva in localStorage come backup
            localStorage.setItem('aiCopilot_currentSession', JSON.stringify({
                session: this.currentSession,
                data: sessionData,
                timestamp: Date.now()
            }));
            
            // Callback
            if (this.onSessionUpdate) {
                this.onSessionUpdate(this.currentSession, sessionData);
            }
            
        } catch (error) {
            console.error('Errore salvataggio stato sessione:', error);
        }
    }
    
    /**
     * Prepara dati sessione per salvataggio
     */
    prepareSessionData() {
        if (!this.stateManager) return {};
        
        return {
            conversationHistory: this.stateManager.get('conversation.transcript') || '',
            messages: this.stateManager.get('conversation.messages') || [],
            suggestions: this.stateManager.get('ai.suggestions') || [],
            insights: this.stateManager.get('ai.insights') || [],
            webResults: this.stateManager.get('ai.webResults') || [],
            notes: this.stateManager.get('session.notes') || ''
        };
    }
    
    /**
     * Recupera sessione da localStorage
     */
    async recoverSession() {
        try {
            const saved = localStorage.getItem('aiCopilot_currentSession');
            
            if (!saved) {
                return null;
            }
            
            const parsed = JSON.parse(saved);
            const sessionAge = Date.now() - parsed.timestamp;
            
            // Verifica se sessione non è troppo vecchia (1 ora)
            if (sessionAge > 60 * 60 * 1000) {
                localStorage.removeItem('aiCopilot_currentSession');
                return null;
            }
            
            // Verifica se sessione è ancora valida sul server
            const isValid = await this.validateSessionOnServer(parsed.session.id);
            
            if (isValid) {
                this.currentSession = parsed.session;
                
                // Ripristina stato
                if (this.stateManager && parsed.data) {
                    this.stateManager.update({
                        'conversation.transcript': parsed.data.conversationHistory,
                        'conversation.messages': parsed.data.messages,
                        'ai.suggestions': parsed.data.suggestions,
                        'ai.insights': parsed.data.insights,
                        'ai.webResults': parsed.data.webResults
                    });
                }
                
                // Setup timer
                this.setupSessionTimer();
                
                if (this.options.autoSave) {
                    this.setupAutoSave();
                }
                
                console.log('Sessione recuperata:', this.currentSession.id);
                return this.currentSession;
            } else {
                localStorage.removeItem('aiCopilot_currentSession');
                return null;
            }
            
        } catch (error) {
            console.error('Errore recupero sessione:', error);
            localStorage.removeItem('aiCopilot_currentSession');
            return null;
        }
    }
    
    /**
     * Valida sessione sul server
     */
    async validateSessionOnServer(sessionId) {
        try {
            const response = await this.apiClient.get(`/ai-copilot-v2/session/validate/${sessionId}`);
            return response.success && response.valid;
        } catch (error) {
            console.error('Errore validazione sessione:', error);
            return false;
        }
    }
    
    /**
     * Ottiene durata sessione
     */
    getSessionDuration() {
        if (!this.currentSession || !this.currentSession.startTime) {
            return 0;
        }
        
        const start = new Date(this.currentSession.startTime);
        const end = this.currentSession.endTime ? new Date(this.currentSession.endTime) : new Date();
        
        return end.getTime() - start.getTime();
    }
    
    /**
     * Ottiene durata formattata
     */
    getFormattedDuration() {
        const duration = this.getSessionDuration();
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Cleanup timer
     */
    cleanupTimers() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }
    
    /**
     * Ottiene info sessione corrente
     */
    getCurrentSession() {
        return this.currentSession;
    }
    
    /**
     * Verifica se sessione è attiva
     */
    isSessionActive() {
        return this.currentSession && this.currentSession.active && !this.currentSession.paused;
    }
    
    /**
     * Ottiene statistiche sessione
     */
    getSessionStats() {
        if (!this.currentSession) return null;
        
        const sessionData = this.prepareSessionData();
        
        return {
            id: this.currentSession.id,
            duration: this.getFormattedDuration(),
            messageCount: sessionData.messages.length,
            suggestionCount: sessionData.suggestions.length,
            insightCount: sessionData.insights.length,
            webResultCount: sessionData.webResults.length,
            active: this.currentSession.active,
            paused: this.currentSession.paused || false
        };
    }
    
    /**
     * Cleanup risorse
     */
    cleanup() {
        // Termina sessione se attiva
        if (this.currentSession && this.currentSession.active) {
            this.endSession(false); // Non salvare report durante cleanup
        }
        
        // Cleanup timer
        this.cleanupTimers();
        
        // Clear callbacks
        this.onSessionStart = null;
        this.onSessionEnd = null;
        this.onSessionUpdate = null;
        this.onError = null;
        
        console.log('SessionManager cleanup completato');
    }
    
    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            currentSession: this.currentSession,
            isActive: this.isSessionActive(),
            duration: this.getFormattedDuration(),
            stats: this.getSessionStats(),
            options: this.options
        };
    }
}

