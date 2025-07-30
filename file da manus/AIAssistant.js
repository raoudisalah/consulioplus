/**
 * AIAssistant - Servizio per interazioni AI
 * 
 * Gestisce comunicazione con backend AI, elaborazione suggerimenti
 * e coordinamento tra diversi servizi AI
 */

export class AIAssistant {
    constructor(options = {}) {
        this.options = {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 30000,
            ...options
        };
        
        // Riferimenti ai servizi
        this.apiClient = options.apiClient;
        this.stateManager = options.stateManager;
        
        // Stato interno
        this.processing = false;
        this.lastRequest = null;
        this.requestQueue = [];
        
        // Cache per evitare richieste duplicate
        this.responseCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        
        // Callbacks
        this.onSuggestion = null;
        this.onInsight = null;
        this.onWebResult = null;
        this.onError = null;
    }
    
    /**
     * Elabora trascrizione con AI
     */
    async processTranscription(transcript, sessionId) {
        try {
            if (!transcript || !transcript.trim()) {
                console.warn('Trascrizione vuota, skip elaborazione AI');
                return;
            }
            
            // Verifica se già in elaborazione
            if (this.processing) {
                this.requestQueue.push({ transcript, sessionId });
                return;
            }
            
            this.processing = true;
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.set('ai.processing', true);
            }
            
            // Ottieni contesto sessione
            const sessionContext = this.getSessionContext(sessionId);
            
            // Elabora con AI
            const result = await this.callAIService(transcript, sessionContext);
            
            if (result) {
                // Processa risultati
                await this.processAIResults(result, sessionId);
            }
            
            // Processa queue se presente
            await this.processQueue();
            
        } catch (error) {
            console.error('Errore elaborazione trascrizione AI:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            // Notifica errore
            if (this.stateManager) {
                this.stateManager.dispatch('SHOW_NOTIFICATION', {
                    type: 'error',
                    title: 'Errore AI',
                    message: 'Errore nell\'elaborazione AI della trascrizione'
                });
            }
            
        } finally {
            this.processing = false;
            
            if (this.stateManager) {
                this.stateManager.set('ai.processing', false);
            }
        }
    }
    
    /**
     * Ottiene contesto sessione
     */
    getSessionContext(sessionId) {
        if (!this.stateManager) return {};
        
        return {
            sessionId: sessionId,
            consultantType: this.stateManager.get('session.consultant.type') || 'Consulente Generico',
            clientInfo: this.stateManager.get('session.client') || {},
            conversationHistory: this.stateManager.get('conversation.transcript') || '',
            previousSuggestions: this.stateManager.get('ai.suggestions') || [],
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Chiama servizio AI backend
     */
    async callAIService(transcript, context) {
        try {
            // Verifica cache
            const cacheKey = this.generateCacheKey(transcript, context);
            const cached = this.responseCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('Risposta AI da cache');
                return cached.data;
            }
            
            // Prepara richiesta
            const requestData = {
                transcript: transcript,
                sessionId: context.sessionId,
                consultantType: context.consultantType,
                clientInfo: context.clientInfo,
                conversationHistory: context.conversationHistory
            };
            
            // Chiama backend con retry
            const response = await this.apiClient.post('/ai-copilot-v2/ai/get-insights', requestData, {
                timeout: this.options.timeout,
                retries: this.options.maxRetries
            });
            
            if (response.success && response.data) {
                // Salva in cache
                this.responseCache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now()
                });
                
                // Pulisci cache vecchia
                this.cleanupCache();
                
                return response.data;
            }
            
            return null;
            
        } catch (error) {
            console.error('Errore chiamata servizio AI:', error);
            throw error;
        }
    }
    
    /**
     * Genera chiave cache
     */
    generateCacheKey(transcript, context) {
        const key = `${transcript}_${context.consultantType}_${context.sessionId}`;
        return btoa(key).substring(0, 32); // Hash semplice
    }
    
    /**
     * Pulisce cache vecchia
     */
    cleanupCache() {
        const now = Date.now();
        
        for (const [key, value] of this.responseCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.responseCache.delete(key);
            }
        }
    }
    
    /**
     * Processa risultati AI
     */
    async processAIResults(results, sessionId) {
        try {
            // Processa suggerimenti
            if (results.suggestions && Array.isArray(results.suggestions)) {
                for (const suggestion of results.suggestions) {
                    await this.processSuggestion(suggestion, sessionId);
                }
            }
            
            // Processa insights
            if (results.insights && Array.isArray(results.insights)) {
                for (const insight of results.insights) {
                    await this.processInsight(insight, sessionId);
                }
            }
            
            // Processa risultati web
            if (results.webResults && Array.isArray(results.webResults)) {
                await this.processWebResults(results.webResults, sessionId);
            }
            
            // Aggiorna timestamp ultimo aggiornamento
            if (this.stateManager) {
                this.stateManager.set('ai.lastUpdate', new Date().toISOString());
            }
            
        } catch (error) {
            console.error('Errore processing risultati AI:', error);
        }
    }
    
    /**
     * Processa singolo suggerimento
     */
    async processSuggestion(suggestion, sessionId) {
        try {
            // Valida suggerimento
            if (!suggestion.title || !suggestion.content) {
                console.warn('Suggerimento invalido:', suggestion);
                return;
            }
            
            // Arricchisci suggerimento
            const enrichedSuggestion = {
                id: Date.now() + Math.random(),
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                type: suggestion.type || 'general',
                priority: suggestion.priority || 'medium',
                title: suggestion.title,
                content: suggestion.content,
                category: suggestion.category || 'Suggerimento',
                actionable: suggestion.actionable !== false,
                status: 'new'
            };
            
            // Aggiungi allo stato
            if (this.stateManager) {
                this.stateManager.dispatch('ADD_SUGGESTION', enrichedSuggestion);
            }
            
            // Callback
            if (this.onSuggestion) {
                this.onSuggestion(enrichedSuggestion);
            }
            
            // Notifica se priorità alta
            if (suggestion.priority === 'high') {
                this.notifyHighPrioritySuggestion(enrichedSuggestion);
            }
            
        } catch (error) {
            console.error('Errore processing suggerimento:', error);
        }
    }
    
    /**
     * Processa insight
     */
    async processInsight(insight, sessionId) {
        try {
            const enrichedInsight = {
                id: Date.now() + Math.random(),
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                category: insight.category || 'Insight',
                description: insight.description,
                confidence: insight.confidence || 0.8,
                source: 'AI Analysis'
            };
            
            // Aggiungi agli insights
            const currentInsights = this.stateManager?.get('ai.insights') || [];
            currentInsights.push(enrichedInsight);
            
            if (this.stateManager) {
                this.stateManager.set('ai.insights', currentInsights);
            }
            
            // Callback
            if (this.onInsight) {
                this.onInsight(enrichedInsight);
            }
            
        } catch (error) {
            console.error('Errore processing insight:', error);
        }
    }
    
    /**
     * Processa risultati web
     */
    async processWebResults(webResults, sessionId) {
        try {
            const enrichedResults = webResults.map(result => ({
                id: Date.now() + Math.random(),
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                title: result.title,
                description: result.description,
                url: result.url,
                source: result.source || 'Web Search',
                relevance: result.relevance || 0.7,
                type: 'web_result'
            }));
            
            // Aggiungi ai risultati web
            if (this.stateManager) {
                this.stateManager.set('ai.webResults', enrichedResults);
            }
            
            // Callback
            if (this.onWebResult) {
                this.onWebResult(enrichedResults);
            }
            
            // Crea suggerimento per risultati web se rilevanti
            if (enrichedResults.length > 0) {
                const webSuggestion = {
                    type: 'web_search',
                    priority: 'medium',
                    title: 'Risultati Ricerca Web',
                    content: `Trovati ${enrichedResults.length} risultati rilevanti dalla ricerca web`,
                    category: 'Ricerca Web',
                    actionable: true,
                    webResults: enrichedResults
                };
                
                await this.processSuggestion(webSuggestion, sessionId);
            }
            
        } catch (error) {
            console.error('Errore processing risultati web:', error);
        }
    }
    
    /**
     * Notifica suggerimento alta priorità
     */
    notifyHighPrioritySuggestion(suggestion) {
        if (this.stateManager) {
            this.stateManager.dispatch('SHOW_NOTIFICATION', {
                type: 'warning',
                title: 'Suggerimento Importante',
                message: suggestion.title,
                persistent: true,
                actions: [{
                    label: 'Visualizza',
                    action: () => {
                        // Scroll al suggerimento o apri pannello
                        window.AICoPilotEventBus?.emit('suggestion:focus', suggestion.id);
                    }
                }]
            });
        }
    }
    
    /**
     * Processa queue richieste
     */
    async processQueue() {
        if (this.requestQueue.length === 0) return;
        
        // Prendi prossima richiesta
        const nextRequest = this.requestQueue.shift();
        
        // Elabora con delay per evitare spam
        setTimeout(() => {
            this.processTranscription(nextRequest.transcript, nextRequest.sessionId);
        }, this.options.retryDelay);
    }
    
    /**
     * Richiede suggerimenti manuali
     */
    async requestManualSuggestions(query, sessionId) {
        try {
            if (this.processing) {
                console.warn('AI già in elaborazione, richiesta ignorata');
                return;
            }
            
            this.processing = true;
            
            if (this.stateManager) {
                this.stateManager.set('ai.processing', true);
            }
            
            const context = this.getSessionContext(sessionId);
            context.manualQuery = query;
            
            const result = await this.callAIService(query, context);
            
            if (result) {
                await this.processAIResults(result, sessionId);
            }
            
        } catch (error) {
            console.error('Errore richiesta suggerimenti manuali:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
        } finally {
            this.processing = false;
            
            if (this.stateManager) {
                this.stateManager.set('ai.processing', false);
            }
        }
    }
    
    /**
     * Esegue ricerca web
     */
    async performWebSearch(query, sessionId) {
        try {
            const response = await this.apiClient.post('/ai-copilot-v2/ai/web-search', {
                query: query,
                sessionId: sessionId,
                context: this.getSessionContext(sessionId)
            });
            
            if (response.success && response.data) {
                await this.processWebResults(response.data, sessionId);
                return response.data;
            }
            
            return [];
            
        } catch (error) {
            console.error('Errore ricerca web:', error);
            throw error;
        }
    }
    
    /**
     * Valuta suggerimento (feedback)
     */
    async rateSuggestion(suggestionId, rating, feedback = '') {
        try {
            await this.apiClient.post('/ai-copilot-v2/ai/rate-suggestion', {
                suggestionId: suggestionId,
                rating: rating, // 1-5
                feedback: feedback
            });
            
            // Aggiorna stato locale
            const suggestions = this.stateManager?.get('ai.suggestions') || [];
            const suggestion = suggestions.find(s => s.id === suggestionId);
            
            if (suggestion) {
                suggestion.rating = rating;
                suggestion.feedback = feedback;
                suggestion.rated = true;
                
                if (this.stateManager) {
                    this.stateManager.set('ai.suggestions', suggestions);
                }
            }
            
        } catch (error) {
            console.error('Errore valutazione suggerimento:', error);
        }
    }
    
    /**
     * Ottiene statistiche AI
     */
    getStatistics() {
        if (!this.stateManager) return {};
        
        const suggestions = this.stateManager.get('ai.suggestions') || [];
        const insights = this.stateManager.get('ai.insights') || [];
        const webResults = this.stateManager.get('ai.webResults') || [];
        
        return {
            totalSuggestions: suggestions.length,
            highPrioritySuggestions: suggestions.filter(s => s.priority === 'high').length,
            totalInsights: insights.length,
            totalWebResults: webResults.length,
            lastUpdate: this.stateManager.get('ai.lastUpdate'),
            processing: this.processing,
            cacheSize: this.responseCache.size
        };
    }
    
    /**
     * Reset stato AI
     */
    reset() {
        // Clear cache
        this.responseCache.clear();
        
        // Reset queue
        this.requestQueue = [];
        
        // Reset stato
        this.processing = false;
        this.lastRequest = null;
        
        // Reset stato manager
        if (this.stateManager) {
            this.stateManager.update({
                'ai.processing': false,
                'ai.suggestions': [],
                'ai.insights': [],
                'ai.webResults': [],
                'ai.lastUpdate': null
            });
        }
        
        console.log('AIAssistant reset completato');
    }
    
    /**
     * Cleanup risorse
     */
    cleanup() {
        this.reset();
        
        // Clear callbacks
        this.onSuggestion = null;
        this.onInsight = null;
        this.onWebResult = null;
        this.onError = null;
        
        console.log('AIAssistant cleanup completato');
    }
    
    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            processing: this.processing,
            queueLength: this.requestQueue.length,
            cacheSize: this.responseCache.size,
            lastRequest: this.lastRequest,
            statistics: this.getStatistics(),
            options: this.options
        };
    }
}

