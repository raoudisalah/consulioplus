/**
 * SuggestionPanel - Pannello suggerimenti AI
 * 
 * Gestisce visualizzazione e interazione con suggerimenti AI,
 * risultati web e insights per AI Co-Pilota Pro v2.0
 */

import { BaseComponent } from '../utils/BaseComponent.js';

export class SuggestionPanel extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        
        this.defaultOptions = {
            maxSuggestions: 50,
            autoRefresh: true,
            refreshInterval: 30000, // 30 secondi
            showPriority: true,
            enableActions: true,
            ...options
        };
        
        // Riferimenti servizi
        this.stateManager = options.stateManager;
        this.aiAssistant = options.aiAssistant;
        
        // Elementi DOM
        this.tabButtons = [];
        this.contentContainers = {};
        this.refreshButton = null;
        this.clearButton = null;
        
        // Stato interno
        this.activeTab = 'suggestions';
        this.suggestions = [];
        this.webResults = [];
        this.insights = [];
        this.refreshTimer = null;
        
        // Callbacks
        this.onSuggestionClick = null;
        this.onSuggestionRate = null;
        this.onWebResultClick = null;
    }
    
    /**
     * Inizializza componente
     */
    initialize() {
        super.initialize();
        
        // Trova elementi
        this.findElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Sottoscrivi ai cambiamenti di stato
        this.subscribeToStateChanges();
        
        // Setup auto-refresh se abilitato
        if (this.options.autoRefresh) {
            this.setupAutoRefresh();
        }
        
        console.log('SuggestionPanel inizializzato');
    }
    
    /**
     * Trova elementi DOM
     */
    findElements() {
        if (!this.element) {
            console.warn('Elemento suggestion panel non trovato');
            return;
        }
        
        // Tab buttons
        this.tabButtons = Array.from(this.element.querySelectorAll('.tab-btn'));
        
        // Content containers
        this.contentContainers = {
            suggestions: this.element.querySelector('#suggestions-content'),
            webResults: this.element.querySelector('#web-results-content'),
            insights: this.element.querySelector('#insights-content')
        };
        
        // Control buttons
        this.refreshButton = this.element.querySelector('#refresh-suggestions');
        this.clearButton = this.element.querySelector('#clear-suggestions');
        
        // Verifica elementi critici
        if (this.tabButtons.length === 0) {
            console.warn('Tab buttons non trovati');
        }
        
        if (!this.contentContainers.suggestions) {
            console.warn('Container suggerimenti non trovato');
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });
        
        // Refresh button
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => {
                this.refreshSuggestions();
            });
        }
        
        // Clear button
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearCurrentTab();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('suggestions');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('webResults');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('insights');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshSuggestions();
                        break;
                }
            }
        });
    }
    
    /**
     * Sottoscrivi ai cambiamenti di stato
     */
    subscribeToStateChanges() {
        if (!this.stateManager) return;
        
        // Sottoscrivi ai suggerimenti
        this.stateManager.subscribe('ai.suggestions', (suggestions) => {
            this.updateSuggestions(suggestions);
        });
        
        // Sottoscrivi ai risultati web
        this.stateManager.subscribe('ai.webResults', (webResults) => {
            this.updateWebResults(webResults);
        });
        
        // Sottoscrivi agli insights
        this.stateManager.subscribe('ai.insights', (insights) => {
            this.updateInsights(insights);
        });
        
        // Sottoscrivi al processing AI
        this.stateManager.subscribe('ai.processing', (processing) => {
            this.updateProcessingState(processing);
        });
    }
    
    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            if (this.activeTab === 'suggestions') {
                this.refreshSuggestions();
            }
        }, this.options.refreshInterval);
    }
    
    /**
     * Cambia tab attivo
     */
    switchTab(tabName) {
        if (!this.contentContainers[tabName]) {
            console.warn(`Tab non valido: ${tabName}`);
            return;
        }
        
        // Aggiorna stato tab
        this.activeTab = tabName;
        
        // Aggiorna UI tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });
        
        // Aggiorna contenuto
        Object.keys(this.contentContainers).forEach(key => {
            const container = this.contentContainers[key];
            if (container) {
                container.style.display = key === tabName ? 'block' : 'none';
            }
        });
        
        // Aggiorna badge count se necessario
        this.updateTabBadges();
        
        console.log(`Tab cambiato a: ${tabName}`);
    }
    
    /**
     * Aggiorna suggerimenti
     */
    updateSuggestions(suggestions) {
        if (!Array.isArray(suggestions)) return;
        
        this.suggestions = suggestions;
        this.renderSuggestions();
        this.updateTabBadges();
    }
    
    /**
     * Renderizza suggerimenti
     */
    renderSuggestions() {
        const container = this.contentContainers.suggestions;
        if (!container) return;
        
        // Pulisci container
        container.innerHTML = '';
        
        if (this.suggestions.length === 0) {
            container.appendChild(this.createEmptyState('suggestions'));
            return;
        }
        
        // Ordina suggerimenti per priorità e timestamp
        const sortedSuggestions = this.sortSuggestions(this.suggestions);
        
        // Renderizza ogni suggerimento
        sortedSuggestions.forEach(suggestion => {
            const suggestionElement = this.createSuggestionElement(suggestion);
            container.appendChild(suggestionElement);
        });
    }
    
    /**
     * Ordina suggerimenti
     */
    sortSuggestions(suggestions) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        
        return [...suggestions].sort((a, b) => {
            // Prima per priorità
            const priorityA = priorityOrder[a.priority] || 1;
            const priorityB = priorityOrder[b.priority] || 1;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            
            // Poi per timestamp (più recenti prima)
            const timeA = new Date(a.timestamp || 0);
            const timeB = new Date(b.timestamp || 0);
            
            return timeB - timeA;
        });
    }
    
    /**
     * Crea elemento suggerimento
     */
    createSuggestionElement(suggestion) {
        const card = document.createElement('div');
        card.className = `suggestion-card ${suggestion.priority || 'medium'}-priority`;
        card.dataset.suggestionId = suggestion.id;
        
        // Header
        const header = document.createElement('div');
        header.className = 'suggestion-header';
        
        const title = document.createElement('h4');
        title.className = 'suggestion-title';
        title.textContent = suggestion.title || 'Suggerimento';
        
        const priority = document.createElement('span');
        priority.className = `suggestion-priority ${suggestion.priority || 'medium'}`;
        priority.textContent = this.getPriorityLabel(suggestion.priority);
        
        header.appendChild(title);
        if (this.options.showPriority) {
            header.appendChild(priority);
        }
        
        // Content
        const content = document.createElement('div');
        content.className = 'suggestion-content';
        content.innerHTML = this.formatSuggestionContent(suggestion.content);
        
        // Actions
        const actions = this.createSuggestionActions(suggestion);
        
        // Metadata
        const metadata = this.createSuggestionMetadata(suggestion);
        
        card.appendChild(header);
        card.appendChild(content);
        if (actions) card.appendChild(actions);
        if (metadata) card.appendChild(metadata);
        
        return card;
    }
    
    /**
     * Ottiene label priorità
     */
    getPriorityLabel(priority) {
        const labels = {
            high: 'Alta',
            medium: 'Media',
            low: 'Bassa'
        };
        
        return labels[priority] || 'Media';
    }
    
    /**
     * Formatta contenuto suggerimento
     */
    formatSuggestionContent(content) {
        if (!content) return '';
        
        // Escape HTML
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Converti newlines
        return escaped.replace(/\n/g, '<br>');
    }
    
    /**
     * Crea azioni suggerimento
     */
    createSuggestionActions(suggestion) {
        if (!this.options.enableActions) return null;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'suggestion-actions';
        
        // Azione principale se presente
        if (suggestion.actionable) {
            const primaryBtn = document.createElement('button');
            primaryBtn.className = 'action-btn primary';
            primaryBtn.textContent = 'Applica';
            primaryBtn.addEventListener('click', () => {
                this.handleSuggestionAction(suggestion, 'apply');
            });
            actionsDiv.appendChild(primaryBtn);
        }
        
        // Azione copia
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn';
        copyBtn.textContent = 'Copia';
        copyBtn.addEventListener('click', () => {
            this.handleSuggestionAction(suggestion, 'copy');
        });
        actionsDiv.appendChild(copyBtn);
        
        // Rating se non già valutato
        if (!suggestion.rated) {
            const rateBtn = document.createElement('button');
            rateBtn.className = 'action-btn';
            rateBtn.textContent = 'Valuta';
            rateBtn.addEventListener('click', () => {
                this.showRatingModal(suggestion);
            });
            actionsDiv.appendChild(rateBtn);
        }
        
        // Dismiss
        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'action-btn';
        dismissBtn.textContent = 'Ignora';
        dismissBtn.addEventListener('click', () => {
            this.handleSuggestionAction(suggestion, 'dismiss');
        });
        actionsDiv.appendChild(dismissBtn);
        
        return actionsDiv;
    }
    
    /**
     * Crea metadata suggerimento
     */
    createSuggestionMetadata(suggestion) {
        const metadata = document.createElement('div');
        metadata.className = 'suggestion-metadata';
        
        // Timestamp
        if (suggestion.timestamp) {
            const time = document.createElement('span');
            time.className = 'suggestion-time';
            time.textContent = this.formatTimestamp(suggestion.timestamp);
            metadata.appendChild(time);
        }
        
        // Categoria
        if (suggestion.category) {
            const category = document.createElement('span');
            category.className = 'suggestion-category';
            category.textContent = suggestion.category;
            metadata.appendChild(category);
        }
        
        // Confidence se presente
        if (suggestion.confidence) {
            const confidence = document.createElement('span');
            confidence.className = 'suggestion-confidence';
            confidence.textContent = `${Math.round(suggestion.confidence * 100)}% sicurezza`;
            metadata.appendChild(confidence);
        }
        
        return metadata.children.length > 0 ? metadata : null;
    }
    
    /**
     * Gestisce azione suggerimento
     */
    handleSuggestionAction(suggestion, action) {
        try {
            switch (action) {
                case 'apply':
                    this.applySuggestion(suggestion);
                    break;
                    
                case 'copy':
                    this.copySuggestion(suggestion);
                    break;
                    
                case 'dismiss':
                    this.dismissSuggestion(suggestion);
                    break;
                    
                default:
                    console.warn(`Azione non riconosciuta: ${action}`);
            }
            
            // Callback
            if (this.onSuggestionClick) {
                this.onSuggestionClick(suggestion, action);
            }
            
            // Emetti evento
            if (window.AICoPilotEventBus) {
                window.AICoPilotEventBus.emit('suggestion:action', {
                    suggestion: suggestion,
                    action: action
                });
            }
            
        } catch (error) {
            console.error('Errore gestione azione suggerimento:', error);
        }
    }
    
    /**
     * Applica suggerimento
     */
    applySuggestion(suggestion) {
        // Copia contenuto negli appunti
        this.copyToClipboard(suggestion.content);
        
        // Marca come applicato
        this.markSuggestionAsUsed(suggestion.id);
        
        // Notifica
        if (this.stateManager) {
            this.stateManager.dispatch('SHOW_NOTIFICATION', {
                type: 'success',
                title: 'Suggerimento Applicato',
                message: 'Il suggerimento è stato copiato negli appunti'
            });
        }
    }
    
    /**
     * Copia suggerimento
     */
    copySuggestion(suggestion) {
        this.copyToClipboard(suggestion.content);
        
        // Notifica
        if (this.stateManager) {
            this.stateManager.dispatch('SHOW_NOTIFICATION', {
                type: 'info',
                title: 'Copiato',
                message: 'Suggerimento copiato negli appunti'
            });
        }
    }
    
    /**
     * Ignora suggerimento
     */
    dismissSuggestion(suggestion) {
        // Rimuovi dalla lista
        this.suggestions = this.suggestions.filter(s => s.id !== suggestion.id);
        
        // Aggiorna UI
        this.renderSuggestions();
        this.updateTabBadges();
        
        // Aggiorna stato
        if (this.stateManager) {
            this.stateManager.set('ai.suggestions', this.suggestions);
        }
    }
    
    /**
     * Copia negli appunti
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback per browser più vecchi
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
        } catch (error) {
            console.error('Errore copia negli appunti:', error);
        }
    }
    
    /**
     * Marca suggerimento come usato
     */
    markSuggestionAsUsed(suggestionId) {
        const suggestion = this.suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
            suggestion.used = true;
            suggestion.usedAt = new Date().toISOString();
            
            // Aggiorna UI
            const element = this.element.querySelector(`[data-suggestion-id="${suggestionId}"]`);
            if (element) {
                element.classList.add('used');
            }
        }
    }
    
    /**
     * Mostra modal rating
     */
    showRatingModal(suggestion) {
        // Implementazione semplificata - in un'app reale useresti un modal component
        const rating = prompt('Valuta questo suggerimento da 1 a 5:', '5');
        
        if (rating && !isNaN(rating)) {
            const ratingValue = Math.max(1, Math.min(5, parseInt(rating)));
            this.rateSuggestion(suggestion, ratingValue);
        }
    }
    
    /**
     * Valuta suggerimento
     */
    async rateSuggestion(suggestion, rating, feedback = '') {
        try {
            // Chiama AI Assistant per salvare rating
            if (this.aiAssistant) {
                await this.aiAssistant.rateSuggestion(suggestion.id, rating, feedback);
            }
            
            // Aggiorna suggerimento locale
            suggestion.rating = rating;
            suggestion.feedback = feedback;
            suggestion.rated = true;
            
            // Aggiorna UI
            this.renderSuggestions();
            
            // Callback
            if (this.onSuggestionRate) {
                this.onSuggestionRate(suggestion, rating, feedback);
            }
            
            // Notifica
            if (this.stateManager) {
                this.stateManager.dispatch('SHOW_NOTIFICATION', {
                    type: 'success',
                    title: 'Valutazione Salvata',
                    message: 'Grazie per il tuo feedback!'
                });
            }
            
        } catch (error) {
            console.error('Errore valutazione suggerimento:', error);
        }
    }
    
    /**
     * Aggiorna risultati web
     */
    updateWebResults(webResults) {
        if (!Array.isArray(webResults)) return;
        
        this.webResults = webResults;
        this.renderWebResults();
        this.updateTabBadges();
    }
    
    /**
     * Renderizza risultati web
     */
    renderWebResults() {
        const container = this.contentContainers.webResults;
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.webResults.length === 0) {
            container.appendChild(this.createEmptyState('webResults'));
            return;
        }
        
        this.webResults.forEach(result => {
            const resultElement = this.createWebResultElement(result);
            container.appendChild(resultElement);
        });
    }
    
    /**
     * Crea elemento risultato web
     */
    createWebResultElement(result) {
        const card = document.createElement('div');
        card.className = 'web-result-card';
        
        const title = document.createElement('h4');
        title.className = 'result-title';
        title.textContent = result.title || 'Risultato Web';
        
        const description = document.createElement('p');
        description.className = 'result-description';
        description.textContent = result.description || '';
        
        const url = document.createElement('a');
        url.className = 'result-url';
        url.href = result.url;
        url.target = '_blank';
        url.rel = 'noopener noreferrer';
        url.textContent = result.url;
        
        const actions = document.createElement('div');
        actions.className = 'result-actions';
        
        const openBtn = document.createElement('button');
        openBtn.className = 'action-btn primary';
        openBtn.textContent = 'Apri';
        openBtn.addEventListener('click', () => {
            window.open(result.url, '_blank');
            
            if (this.onWebResultClick) {
                this.onWebResultClick(result);
            }
        });
        
        actions.appendChild(openBtn);
        
        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(url);
        card.appendChild(actions);
        
        return card;
    }
    
    /**
     * Aggiorna insights
     */
    updateInsights(insights) {
        if (!Array.isArray(insights)) return;
        
        this.insights = insights;
        this.renderInsights();
        this.updateTabBadges();
    }
    
    /**
     * Renderizza insights
     */
    renderInsights() {
        const container = this.contentContainers.insights;
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.insights.length === 0) {
            container.appendChild(this.createEmptyState('insights'));
            return;
        }
        
        this.insights.forEach(insight => {
            const insightElement = this.createInsightElement(insight);
            container.appendChild(insightElement);
        });
    }
    
    /**
     * Crea elemento insight
     */
    createInsightElement(insight) {
        const card = document.createElement('div');
        card.className = 'insight-card';
        
        const category = document.createElement('div');
        category.className = 'insight-category';
        category.textContent = insight.category || 'Insight';
        
        const description = document.createElement('div');
        description.className = 'insight-description';
        description.textContent = insight.description || '';
        
        const confidence = document.createElement('div');
        confidence.className = 'insight-confidence';
        confidence.textContent = `Affidabilità: ${Math.round((insight.confidence || 0.8) * 100)}%`;
        
        card.appendChild(category);
        card.appendChild(description);
        card.appendChild(confidence);
        
        return card;
    }
    
    /**
     * Crea stato vuoto
     */
    createEmptyState(type) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        
        const messages = {
            suggestions: {
                icon: '💡',
                title: 'Nessun suggerimento',
                message: 'I suggerimenti AI appariranno qui durante la conversazione'
            },
            webResults: {
                icon: '🔍',
                title: 'Nessun risultato web',
                message: 'I risultati delle ricerche web appariranno qui'
            },
            insights: {
                icon: '📊',
                title: 'Nessun insight',
                message: 'Gli insights AI appariranno qui durante l\'analisi'
            }
        };
        
        const config = messages[type] || messages.suggestions;
        
        emptyDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">${config.icon}</div>
            <h4>${config.title}</h4>
            <p>${config.message}</p>
        `;
        
        return emptyDiv;
    }
    
    /**
     * Aggiorna badge tab
     */
    updateTabBadges() {
        const counts = {
            suggestions: this.suggestions.length,
            webResults: this.webResults.length,
            insights: this.insights.length
        };
        
        this.tabButtons.forEach(button => {
            const tab = button.dataset.tab;
            const count = counts[tab] || 0;
            
            // Rimuovi badge esistente
            const existingBadge = button.querySelector('.tab-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Aggiungi nuovo badge se count > 0
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'tab-badge';
                badge.textContent = count > 99 ? '99+' : count.toString();
                button.appendChild(badge);
            }
        });
    }
    
    /**
     * Aggiorna stato processing
     */
    updateProcessingState(processing) {
        if (this.refreshButton) {
            this.refreshButton.disabled = processing;
            
            if (processing) {
                this.refreshButton.classList.add('processing');
            } else {
                this.refreshButton.classList.remove('processing');
            }
        }
    }
    
    /**
     * Refresh suggerimenti
     */
    async refreshSuggestions() {
        try {
            if (this.aiAssistant && this.stateManager) {
                const sessionId = this.stateManager.get('session.id');
                const transcript = this.stateManager.get('conversation.transcript');
                
                if (sessionId && transcript) {
                    await this.aiAssistant.requestManualSuggestions(
                        'Aggiorna suggerimenti basati sulla conversazione corrente',
                        sessionId
                    );
                }
            }
        } catch (error) {
            console.error('Errore refresh suggerimenti:', error);
        }
    }
    
    /**
     * Pulisce tab corrente
     */
    clearCurrentTab() {
        switch (this.activeTab) {
            case 'suggestions':
                this.suggestions = [];
                this.renderSuggestions();
                if (this.stateManager) {
                    this.stateManager.set('ai.suggestions', []);
                }
                break;
                
            case 'webResults':
                this.webResults = [];
                this.renderWebResults();
                if (this.stateManager) {
                    this.stateManager.set('ai.webResults', []);
                }
                break;
                
            case 'insights':
                this.insights = [];
                this.renderInsights();
                if (this.stateManager) {
                    this.stateManager.set('ai.insights', []);
                }
                break;
        }
        
        this.updateTabBadges();
    }
    
    /**
     * Formatta timestamp
     */
    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '';
        }
    }
    
    /**
     * Ottiene statistiche pannello
     */
    getStatistics() {
        return {
            totalSuggestions: this.suggestions.length,
            highPrioritySuggestions: this.suggestions.filter(s => s.priority === 'high').length,
            usedSuggestions: this.suggestions.filter(s => s.used).length,
            ratedSuggestions: this.suggestions.filter(s => s.rated).length,
            totalWebResults: this.webResults.length,
            totalInsights: this.insights.length,
            activeTab: this.activeTab
        };
    }
    
    /**
     * Cleanup componente
     */
    destroy() {
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        // Clear callbacks
        this.onSuggestionClick = null;
        this.onSuggestionRate = null;
        this.onWebResultClick = null;
        
        super.destroy();
        
        console.log('SuggestionPanel distrutto');
    }
    
    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            activeTab: this.activeTab,
            statistics: this.getStatistics(),
            autoRefresh: !!this.refreshTimer,
            options: this.options
        };
    }
}

