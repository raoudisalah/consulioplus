/**
 * AI Co-Pilota Pro v2.0 - Main Application
 * 
 * Sistema modulare per assistenza AI durante meeting professionali.
 * Architettura ottimizzata per eliminare conflitti JavaScript e
 * garantire performance elevate.
 */

// Import dei moduli core
import { StateManager } from './services/StateManager.js';
import { AudioManager } from './services/AudioManager.js';
import { AIAssistant } from './services/AIAssistant.js';
import { SessionManager } from './services/SessionManager.js';
import { UIController } from './services/UIController.js';

// Import dei componenti UI
import { ChatInterface } from './components/ChatInterface.js';
import { SuggestionPanel } from './components/SuggestionPanel.js';

// Import utilities
import { EventBus } from './utils/EventBus.js';
import { Logger } from './utils/Logger.js';
import { APIClient } from './utils/APIClient.js';

/**
 * Classe principale dell'applicazione AI Co-Pilota
 */
class AICoPilotApp {
    constructor() {
        this.version = '2.0.0';
        this.initialized = false;
        this.components = new Map();
        this.services = new Map();
        
        // Configurazione CSRF per tutte le richieste
        this.setupCSRF();
        
        // Inizializzazione logger
        this.logger = new Logger('AICoPilot', {
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        });
        
        this.logger.info(`AI Co-Pilota Pro v${this.version} - Inizializzazione`);
    }
    
    /**
     * Inizializza l'applicazione
     */
    async initialize() {
        try {
            this.logger.info('Avvio inizializzazione applicazione...');
            
            // 1. Inizializza EventBus globale
            window.AICoPilotEventBus = new EventBus();
            
            // 2. Inizializza State Manager
            await this.initializeStateManager();
            
            // 3. Inizializza servizi core
            await this.initializeServices();
            
            // 4. Inizializza componenti UI
            await this.initializeComponents();
            
            // 5. Setup event listeners globali
            this.setupGlobalEventListeners();
            
            // 6. Verifica compatibilità browser
            this.checkBrowserCompatibility();
            
            this.initialized = true;
            this.logger.info('Applicazione inizializzata con successo');
            
            // Emetti evento di inizializzazione completata
            window.AICoPilotEventBus.emit('app:initialized', {
                version: this.version,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error('Errore durante inizializzazione:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Inizializza il State Manager
     */
    async initializeStateManager() {
        const stateManager = new StateManager({
            persistKey: 'aiCopilot_state',
            autoSave: true
        });
        
        await stateManager.initialize();
        this.services.set('stateManager', stateManager);
        
        // Rendi disponibile globalmente per debug
        if (process.env.NODE_ENV !== 'production') {
            window.AICoPilotState = stateManager;
        }
    }
    
    /**
     * Inizializza i servizi core
     */
    async initializeServices() {
        const stateManager = this.services.get('stateManager');
        
        // API Client
        const apiClient = new APIClient({
            baseURL: window.location.origin,
            timeout: 30000,
            retries: 3
        });
        this.services.set('apiClient', apiClient);
        
        // Session Manager
        const sessionManager = new SessionManager({
            stateManager,
            apiClient
        });
        this.services.set('sessionManager', sessionManager);
        
        // Audio Manager
        const audioManager = new AudioManager({
            sampleRate: 16000,
            bufferSize: 4096,
            channels: 1,
            stateManager
        });
        await audioManager.initialize();
        this.services.set('audioManager', audioManager);
        
        // AI Assistant
        const aiAssistant = new AIAssistant({
            apiClient,
            stateManager
        });
        this.services.set('aiAssistant', aiAssistant);
        
        // UI Controller
        const uiController = new UIController({
            stateManager
        });
        this.services.set('uiController', uiController);
        
        this.logger.info('Servizi core inizializzati');
    }
    
    /**
     * Inizializza i componenti UI
     */
    async initializeComponents() {
        const services = Object.fromEntries(this.services);
        
        // Chat Interface
        const chatInterface = new ChatInterface('#chat-interface', {
            ...services,
            autoScroll: true,
            showTimestamps: true
        });
        this.components.set('chatInterface', chatInterface);
        
        // Suggestion Panel
        const suggestionPanel = new SuggestionPanel('#suggestion-panel', {
            ...services,
            maxSuggestions: 10
        });
        this.components.set('suggestionPanel', suggestionPanel);
        
        this.logger.info('Componenti UI inizializzati');
    }
    
    /**
     * Setup event listeners globali
     */
    setupGlobalEventListeners() {
        // Gestione errori globali
        window.addEventListener('error', (event) => {
            this.logger.error('Errore JavaScript globale:', event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Promise rejection non gestita:', event.reason);
        });
        
        // Gestione visibilità pagina
        document.addEventListener('visibilitychange', () => {
            const isVisible = !document.hidden;
            window.AICoPilotEventBus.emit('app:visibilityChange', { isVisible });
        });
        
        // Gestione beforeunload per salvare stato
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Event listeners specifici dell'app
        this.setupAppEventListeners();
    }
    
    /**
     * Setup event listeners specifici dell'applicazione
     */
    setupAppEventListeners() {
        const eventBus = window.AICoPilotEventBus;
        
        // Gestione sessioni
        eventBus.on('session:started', (data) => {
            this.logger.info('Sessione avviata:', data);
        });
        
        eventBus.on('session:ended', (data) => {
            this.logger.info('Sessione terminata:', data);
        });
        
        // Gestione audio
        eventBus.on('audio:transcribed', (data) => {
            this.handleAudioTranscription(data);
        });
        
        // Gestione AI
        eventBus.on('ai:suggestion', (data) => {
            this.handleAISuggestion(data);
        });
        
        // Gestione errori
        eventBus.on('error:critical', (error) => {
            this.handleCriticalError(error);
        });
    }
    
    /**
     * Verifica compatibilità browser
     */
    checkBrowserCompatibility() {
        const requirements = {
            webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
            mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            webSockets: 'WebSocket' in window,
            localStorage: 'localStorage' in window,
            fetch: 'fetch' in window
        };
        
        const unsupported = Object.entries(requirements)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);
        
        if (unsupported.length > 0) {
            const message = `Browser non compatibile. Funzionalità mancanti: ${unsupported.join(', ')}`;
            this.logger.error(message);
            this.showCompatibilityError(message);
            return false;
        }
        
        this.logger.info('Browser compatibile - tutte le funzionalità supportate');
        return true;
    }
    
    /**
     * Gestisce la trascrizione audio
     */
    handleAudioTranscription(data) {
        const { transcript, sessionId } = data;
        
        if (transcript && transcript.trim()) {
            // Aggiungi alla chat
            this.components.get('chatInterface')?.addMessage({
                type: 'transcription',
                content: transcript,
                timestamp: new Date()
            });
            
            // Invia all'AI per analisi
            this.services.get('aiAssistant')?.processTranscription(transcript, sessionId);
        }
    }
    
    /**
     * Gestisce i suggerimenti AI
     */
    handleAISuggestion(data) {
        const { suggestion, type } = data;
        
        // Aggiungi al pannello suggerimenti
        this.components.get('suggestionPanel')?.addSuggestion({
            ...suggestion,
            type,
            timestamp: new Date()
        });
        
        // Aggiorna chat se necessario
        if (type === 'immediate') {
            this.components.get('chatInterface')?.addMessage({
                type: 'ai-suggestion',
                content: suggestion.content,
                timestamp: new Date()
            });
        }
    }
    
    /**
     * Gestisce errori critici
     */
    handleCriticalError(error) {
        this.logger.error('Errore critico:', error);
        
        // Mostra notifica all'utente
        this.services.get('uiController')?.showNotification({
            type: 'error',
            title: 'Errore Sistema',
            message: 'Si è verificato un errore critico. Il sistema verrà riavviato.',
            persistent: true
        });
        
        // Tenta recovery automatico
        setTimeout(() => {
            this.attemptRecovery();
        }, 3000);
    }
    
    /**
     * Tenta il recovery automatico
     */
    async attemptRecovery() {
        try {
            this.logger.info('Tentativo di recovery automatico...');
            
            // Reset stato
            this.services.get('stateManager')?.reset();
            
            // Reinizializza servizi critici
            await this.initializeServices();
            
            this.logger.info('Recovery completato con successo');
            
        } catch (error) {
            this.logger.error('Recovery fallito:', error);
            
            // Suggerisci ricaricamento pagina
            this.services.get('uiController')?.showNotification({
                type: 'warning',
                title: 'Recovery Fallito',
                message: 'Si consiglia di ricaricare la pagina.',
                actions: [{
                    label: 'Ricarica',
                    action: () => window.location.reload()
                }]
            });
        }
    }
    
    /**
     * Setup CSRF token per richieste AJAX
     */
    setupCSRF() {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        if (token) {
            // Setup per jQuery se presente
            if (window.$ && window.$.ajaxSetup) {
                window.$.ajaxSetup({
                    headers: {
                        'X-CSRF-TOKEN': token
                    }
                });
            }
            
            // Setup per fetch
            window.csrfToken = token;
        }
    }
    
    /**
     * Gestisce errori di inizializzazione
     */
    handleInitializationError(error) {
        console.error('Errore critico durante inizializzazione:', error);
        
        // Mostra messaggio di errore all'utente
        const errorContainer = document.createElement('div');
        errorContainer.className = 'ai-copilot-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h3>Errore di Inizializzazione</h3>
                <p>Si è verificato un errore durante l'avvio del sistema AI Co-Pilota.</p>
                <button onclick="window.location.reload()">Ricarica Pagina</button>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }
    
    /**
     * Mostra errore di compatibilità
     */
    showCompatibilityError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'ai-copilot-compatibility-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h3>Browser Non Compatibile</h3>
                <p>${message}</p>
                <p>Si consiglia di utilizzare una versione recente di Chrome, Firefox o Safari.</p>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }
    
    /**
     * Cleanup risorse prima della chiusura
     */
    cleanup() {
        this.logger.info('Cleanup applicazione...');
        
        // Cleanup componenti
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        // Cleanup servizi
        this.services.forEach(service => {
            if (service.cleanup) {
                service.cleanup();
            }
        });
        
        // Salva stato finale
        this.services.get('stateManager')?.save();
    }
    
    /**
     * API pubblica per accesso esterno
     */
    getAPI() {
        return {
            version: this.version,
            initialized: this.initialized,
            services: this.services,
            components: this.components,
            logger: this.logger
        };
    }
}

// Inizializzazione automatica quando il DOM è pronto
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Crea istanza globale dell'applicazione
        window.AICoPilotApp = new AICoPilotApp();
        
        // Inizializza l'applicazione
        await window.AICoPilotApp.initialize();
        
        // Rendi disponibile API per debug
        if (process.env.NODE_ENV !== 'production') {
            window.AICoPilotAPI = window.AICoPilotApp.getAPI();
        }
        
    } catch (error) {
        console.error('Errore fatale durante inizializzazione AI Co-Pilota:', error);
    }
});

// Export per uso come modulo
export default AICoPilotApp;

