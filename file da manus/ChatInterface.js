/**
 * ChatInterface - Componente interfaccia chat
 * 
 * Gestisce visualizzazione messaggi, trascrizioni e interazioni chat
 * per AI Co-Pilota Pro v2.0
 */

import { BaseComponent } from '../utils/BaseComponent.js';

export class ChatInterface extends BaseComponent {
    constructor(selector, options = {}) {
        super(selector, options);
        
        this.defaultOptions = {
            autoScroll: true,
            showTimestamps: true,
            maxMessages: 1000,
            animateMessages: true,
            ...options
        };
        
        // Riferimenti servizi
        this.stateManager = options.stateManager;
        this.sessionManager = options.sessionManager;
        
        // Elementi DOM
        this.messagesContainer = null;
        this.welcomeMessage = null;
        
        // Stato interno
        this.messages = [];
        this.isScrolledToBottom = true;
        this.lastMessageTime = null;
        
        // Auto-scroll observer
        this.scrollObserver = null;
    }
    
    /**
     * Inizializza componente
     */
    initialize() {
        super.initialize();
        
        // Trova elementi
        this.findElements();
        
        // Setup scroll observer
        this.setupScrollObserver();
        
        // Sottoscrivi ai cambiamenti di stato
        this.subscribeToStateChanges();
        
        console.log('ChatInterface inizializzato');
    }
    
    /**
     * Trova elementi DOM
     */
    findElements() {
        if (!this.element) {
            console.warn('Elemento chat interface non trovato');
            return;
        }
        
        this.messagesContainer = this.element.querySelector('#chat-messages');
        this.welcomeMessage = this.element.querySelector('.welcome-message');
        
        if (!this.messagesContainer) {
            console.warn('Container messaggi non trovato');
        }
    }
    
    /**
     * Setup scroll observer
     */
    setupScrollObserver() {
        if (!this.messagesContainer) return;
        
        // Observer per rilevare quando l'utente scrolla
        this.messagesContainer.addEventListener('scroll', () => {
            this.checkScrollPosition();
        });
        
        // Intersection observer per auto-scroll
        if ('IntersectionObserver' in window) {
            const sentinel = document.createElement('div');
            sentinel.className = 'scroll-sentinel';
            this.messagesContainer.appendChild(sentinel);
            
            this.scrollObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.isScrolledToBottom = entry.isIntersecting;
                });
            }, {
                root: this.messagesContainer,
                threshold: 0.1
            });
            
            this.scrollObserver.observe(sentinel);
        }
    }
    
    /**
     * Verifica posizione scroll
     */
    checkScrollPosition() {
        if (!this.messagesContainer) return;
        
        const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
        const threshold = 50; // 50px dal bottom
        
        this.isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    }
    
    /**
     * Sottoscrivi ai cambiamenti di stato
     */
    subscribeToStateChanges() {
        if (!this.stateManager) return;
        
        // Sottoscrivi ai nuovi messaggi
        this.stateManager.subscribe('conversation.messages', (messages) => {
            this.updateMessages(messages);
        });
        
        // Sottoscrivi al reset conversazione
        this.stateManager.subscribe('conversation.transcript', (transcript) => {
            if (!transcript) {
                this.clearMessages();
            }
        });
    }
    
    /**
     * Aggiorna messaggi
     */
    updateMessages(messages) {
        if (!Array.isArray(messages)) return;
        
        // Trova nuovi messaggi
        const newMessages = messages.slice(this.messages.length);
        
        // Aggiungi nuovi messaggi
        newMessages.forEach(message => {
            this.renderMessage(message);
        });
        
        // Aggiorna array locale
        this.messages = [...messages];
        
        // Auto-scroll se necessario
        if (this.options.autoScroll && this.isScrolledToBottom) {
            this.scrollToBottom();
        }
        
        // Nascondi welcome message se ci sono messaggi
        if (messages.length > 0 && this.welcomeMessage) {
            this.hideWelcomeMessage();
        }
    }
    
    /**
     * Renderizza singolo messaggio
     */
    renderMessage(message) {
        if (!this.messagesContainer || !message) return;
        
        const messageElement = this.createMessageElement(message);
        
        // Animazione di entrata se abilitata
        if (this.options.animateMessages) {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateY(20px)';
        }
        
        this.messagesContainer.appendChild(messageElement);
        
        // Trigger animazione
        if (this.options.animateMessages) {
            requestAnimationFrame(() => {
                messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                messageElement.style.opacity = '1';
                messageElement.style.transform = 'translateY(0)';
            });
        }
        
        // Limita numero messaggi
        this.limitMessages();
    }
    
    /**
     * Crea elemento messaggio
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type || 'user'}`;
        messageDiv.dataset.messageId = message.id;
        
        // Avatar
        const avatar = this.createMessageAvatar(message);
        
        // Contenuto messaggio
        const content = this.createMessageContent(message);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        return messageDiv;
    }
    
    /**
     * Crea avatar messaggio
     */
    createMessageAvatar(message) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        // Determina contenuto avatar basato su tipo messaggio
        switch (message.type) {
            case 'ai':
            case 'ai-suggestion':
                avatar.innerHTML = `
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                `;
                avatar.style.background = 'var(--primary-600)';
                avatar.style.color = 'white';
                break;
                
            case 'transcription':
                avatar.innerHTML = `
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
                    </svg>
                `;
                avatar.style.background = 'var(--gray-600)';
                avatar.style.color = 'white';
                break;
                
            case 'user':
            default:
                // Usa iniziale utente o icona default
                const initial = this.getUserInitial();
                avatar.textContent = initial;
                avatar.style.background = 'var(--gray-400)';
                avatar.style.color = 'white';
                break;
        }
        
        return avatar;
    }
    
    /**
     * Ottiene iniziale utente
     */
    getUserInitial() {
        if (this.stateManager) {
            const consultant = this.stateManager.get('session.consultant');
            if (consultant && consultant.name) {
                return consultant.name.charAt(0).toUpperCase();
            }
        }
        
        return 'U'; // Default
    }
    
    /**
     * Crea contenuto messaggio
     */
    createMessageContent(message) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Bubble messaggio
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Contenuto del messaggio
        bubble.innerHTML = this.formatMessageContent(message.content);
        
        contentDiv.appendChild(bubble);
        
        // Timestamp se abilitato
        if (this.options.showTimestamps && message.timestamp) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = this.formatTimestamp(message.timestamp);
            contentDiv.appendChild(timeDiv);
        }
        
        // Azioni messaggio se presenti
        if (message.actions && message.actions.length > 0) {
            const actionsDiv = this.createMessageActions(message.actions, message.id);
            contentDiv.appendChild(actionsDiv);
        }
        
        return contentDiv;
    }
    
    /**
     * Formatta contenuto messaggio
     */
    formatMessageContent(content) {
        if (!content) return '';
        
        // Escape HTML per sicurezza
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // Converti newlines in <br>
        const withBreaks = escaped.replace(/\n/g, '<br>');
        
        // Evidenzia parole chiave (opzionale)
        return this.highlightKeywords(withBreaks);
    }
    
    /**
     * Evidenzia parole chiave
     */
    highlightKeywords(text) {
        // Lista parole chiave da evidenziare
        const keywords = [
            'bando', 'finanziamento', 'agevolazione', 'incentivo',
            'contratto', 'sicurezza', 'formazione', 'consulenza'
        ];
        
        let highlighted = text;
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        
        return highlighted;
    }
    
    /**
     * Formatta timestamp
     */
    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            
            // Se è oggi, mostra solo l'ora
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            // Altrimenti mostra data e ora
            return date.toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
        } catch (error) {
            console.warn('Errore formattazione timestamp:', error);
            return '';
        }
    }
    
    /**
     * Crea azioni messaggio
     */
    createMessageActions(actions, messageId) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'action-btn';
            button.textContent = action.label;
            button.addEventListener('click', () => {
                this.handleMessageAction(action, messageId);
            });
            
            actionsDiv.appendChild(button);
        });
        
        return actionsDiv;
    }
    
    /**
     * Gestisce azione messaggio
     */
    handleMessageAction(action, messageId) {
        try {
            if (action.action && typeof action.action === 'function') {
                action.action(messageId);
            }
            
            // Emetti evento per altri componenti
            if (window.AICoPilotEventBus) {
                window.AICoPilotEventBus.emit('message:action', {
                    action: action,
                    messageId: messageId
                });
            }
            
        } catch (error) {
            console.error('Errore esecuzione azione messaggio:', error);
        }
    }
    
    /**
     * Aggiunge messaggio manualmente
     */
    addMessage(message) {
        if (!message || !message.content) {
            console.warn('Messaggio invalido');
            return;
        }
        
        // Aggiungi tramite state manager se disponibile
        if (this.stateManager) {
            this.stateManager.dispatch('ADD_MESSAGE', message);
        } else {
            // Fallback: aggiungi direttamente
            this.renderMessage(message);
            this.messages.push(message);
        }
    }
    
    /**
     * Aggiunge trascrizione
     */
    addTranscription(transcript) {
        if (!transcript || !transcript.trim()) return;
        
        this.addMessage({
            type: 'transcription',
            content: transcript,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Aggiunge risposta AI
     */
    addAIResponse(response) {
        if (!response || !response.content) return;
        
        this.addMessage({
            type: 'ai',
            content: response.content,
            timestamp: new Date().toISOString(),
            actions: response.actions || []
        });
    }
    
    /**
     * Aggiunge messaggio utente
     */
    addUserMessage(content) {
        if (!content || !content.trim()) return;
        
        this.addMessage({
            type: 'user',
            content: content,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Pulisce messaggi
     */
    clearMessages() {
        if (this.messagesContainer) {
            // Mantieni welcome message
            const messages = this.messagesContainer.querySelectorAll('.message');
            messages.forEach(message => message.remove());
        }
        
        this.messages = [];
        this.showWelcomeMessage();
    }
    
    /**
     * Nascondi welcome message
     */
    hideWelcomeMessage() {
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }
    }
    
    /**
     * Mostra welcome message
     */
    showWelcomeMessage() {
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'flex';
        }
    }
    
    /**
     * Scroll al bottom
     */
    scrollToBottom(smooth = true) {
        if (!this.messagesContainer) return;
        
        const scrollOptions = {
            top: this.messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        };
        
        this.messagesContainer.scrollTo(scrollOptions);
    }
    
    /**
     * Limita numero messaggi
     */
    limitMessages() {
        if (!this.messagesContainer) return;
        
        const messages = this.messagesContainer.querySelectorAll('.message');
        const maxMessages = this.options.maxMessages;
        
        if (messages.length > maxMessages) {
            const toRemove = messages.length - maxMessages;
            
            for (let i = 0; i < toRemove; i++) {
                messages[i].remove();
            }
            
            // Aggiorna array locale
            this.messages = this.messages.slice(toRemove);
        }
    }
    
    /**
     * Cerca messaggi
     */
    searchMessages(query) {
        if (!query || !query.trim()) return [];
        
        const searchTerm = query.toLowerCase();
        
        return this.messages.filter(message => {
            return message.content && 
                   message.content.toLowerCase().includes(searchTerm);
        });
    }
    
    /**
     * Evidenzia messaggio
     */
    highlightMessage(messageId) {
        const messageElement = this.messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            messageElement.classList.add('highlighted');
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Rimuovi evidenziazione dopo 3 secondi
            setTimeout(() => {
                messageElement.classList.remove('highlighted');
            }, 3000);
        }
    }
    
    /**
     * Esporta conversazione
     */
    exportConversation(format = 'text') {
        const conversation = this.messages.map(message => {
            const timestamp = this.formatTimestamp(message.timestamp);
            const type = message.type === 'transcription' ? 'Trascrizione' : 
                        message.type === 'ai' ? 'AI' : 'Utente';
            
            return `[${timestamp}] ${type}: ${message.content}`;
        }).join('\n\n');
        
        if (format === 'json') {
            return JSON.stringify(this.messages, null, 2);
        }
        
        return conversation;
    }
    
    /**
     * Ottiene statistiche chat
     */
    getStatistics() {
        const stats = {
            totalMessages: this.messages.length,
            transcriptions: 0,
            aiResponses: 0,
            userMessages: 0,
            averageMessageLength: 0
        };
        
        let totalLength = 0;
        
        this.messages.forEach(message => {
            switch (message.type) {
                case 'transcription':
                    stats.transcriptions++;
                    break;
                case 'ai':
                case 'ai-suggestion':
                    stats.aiResponses++;
                    break;
                case 'user':
                    stats.userMessages++;
                    break;
            }
            
            if (message.content) {
                totalLength += message.content.length;
            }
        });
        
        if (this.messages.length > 0) {
            stats.averageMessageLength = Math.round(totalLength / this.messages.length);
        }
        
        return stats;
    }
    
    /**
     * Cleanup componente
     */
    destroy() {
        // Disconnetti scroll observer
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }
        
        // Pulisci messaggi
        this.clearMessages();
        
        super.destroy();
        
        console.log('ChatInterface distrutto');
    }
    
    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            messagesCount: this.messages.length,
            isScrolledToBottom: this.isScrolledToBottom,
            hasWelcomeMessage: !!this.welcomeMessage,
            statistics: this.getStatistics(),
            options: this.options
        };
    }
}

