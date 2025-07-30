/**
 * UIController - Controllo interfaccia utente AI Co-Pilota
 * 
 * Gestisce stato UI, notifiche, modal, transizioni
 * e coordinamento tra componenti UI
 */

export class UIController {
    constructor(options = {}) {
        this.options = {
            animationDuration: 300,
            notificationTimeout: 5000,
            maxNotifications: 5,
            ...options
        };
        
        // Riferimento state manager
        this.stateManager = options.stateManager;
        
        // Elementi UI principali
        this.elements = {
            main: null,
            sidebar: null,
            chatArea: null,
            suggestionPanel: null,
            statusBar: null,
            notificationContainer: null
        };
        
        // Stato UI interno
        this.activeModal = null;
        this.notifications = [];
        this.loadingStates = new Set();
        
        // Callbacks
        this.onViewChange = null;
        this.onModalOpen = null;
        this.onModalClose = null;
    }
    
    /**
     * Inizializza UIController
     */
    initialize() {
        try {
            // Trova elementi UI principali
            this.findUIElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup notifiche
            this.setupNotificationSystem();
            
            // Setup responsive behavior
            this.setupResponsiveBehavior();
            
            // Sottoscrivi ai cambiamenti di stato
            this.subscribeToStateChanges();
            
            console.log('UIController inizializzato');
            
        } catch (error) {
            console.error('Errore inizializzazione UIController:', error);
            throw error;
        }
    }
    
    /**
     * Trova elementi UI principali
     */
    findUIElements() {
        this.elements = {
            main: document.querySelector('#ai-copilot-main'),
            sidebar: document.querySelector('#ai-copilot-sidebar'),
            chatArea: document.querySelector('#chat-interface'),
            suggestionPanel: document.querySelector('#suggestion-panel'),
            statusBar: document.querySelector('#status-indicator'),
            notificationContainer: document.querySelector('#notification-container') || this.createNotificationContainer()
        };
        
        // Verifica elementi critici
        if (!this.elements.main) {
            console.warn('Elemento main AI Co-Pilota non trovato');
        }
    }
    
    /**
     * Crea container notifiche se non esiste
     */
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'ai-copilot-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Gestione escape per modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
        
        // Gestione click fuori modal
        document.addEventListener('click', (e) => {
            if (this.activeModal && e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });
        
        // Gestione resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Gestione visibilità pagina
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }
    
    /**
     * Setup sistema notifiche
     */
    setupNotificationSystem() {
        // Sottoscrivi alle notifiche dallo stato
        if (this.stateManager) {
            this.stateManager.subscribe('ui.notifications', (notifications) => {
                this.updateNotifications(notifications);
            });
        }
    }
    
    /**
     * Setup comportamento responsive
     */
    setupResponsiveBehavior() {
        // Media query per mobile
        this.mobileMediaQuery = window.matchMedia('(max-width: 768px)');
        this.mobileMediaQuery.addListener((e) => {
            this.handleMobileChange(e.matches);
        });
        
        // Applica stato iniziale
        this.handleMobileChange(this.mobileMediaQuery.matches);
    }
    
    /**
     * Sottoscrivi ai cambiamenti di stato
     */
    subscribeToStateChanges() {
        if (!this.stateManager) return;
        
        // Sottoscrivi a cambiamenti UI
        this.stateManager.subscribe('ui.activeView', (view) => {
            this.switchView(view);
        });
        
        this.stateManager.subscribe('ui.loading', (loading) => {
            this.updateLoadingState(loading);
        });
        
        this.stateManager.subscribe('ui.modalOpen', (modalOpen) => {
            if (!modalOpen && this.activeModal) {
                this.closeModal();
            }
        });
        
        // Sottoscrivi a stato sessione
        this.stateManager.subscribe('session.active', (active) => {
            this.updateSessionUI(active);
        });
        
        // Sottoscrivi a stato audio
        this.stateManager.subscribe('audio.recording', (recording) => {
            this.updateAudioUI(recording);
        });
    }
    
    /**
     * Cambia vista attiva
     */
    switchView(viewName) {
        try {
            const views = ['chat', 'suggestions', 'settings', 'help'];
            
            if (!views.includes(viewName)) {
                console.warn(`Vista non valida: ${viewName}`);
                return;
            }
            
            // Nascondi tutte le viste
            views.forEach(view => {
                const element = document.querySelector(`#view-${view}`);
                if (element) {
                    element.classList.remove('active');
                    element.style.display = 'none';
                }
            });
            
            // Mostra vista attiva
            const activeView = document.querySelector(`#view-${viewName}`);
            if (activeView) {
                activeView.style.display = 'block';
                
                // Animazione di entrata
                setTimeout(() => {
                    activeView.classList.add('active');
                }, 10);
            }
            
            // Aggiorna navigazione
            this.updateNavigation(viewName);
            
            // Callback
            if (this.onViewChange) {
                this.onViewChange(viewName);
            }
            
            console.log(`Vista cambiata a: ${viewName}`);
            
        } catch (error) {
            console.error('Errore cambio vista:', error);
        }
    }
    
    /**
     * Aggiorna navigazione
     */
    updateNavigation(activeView) {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            
            if (item.dataset.view === activeView) {
                item.classList.add('active');
            }
        });
    }
    
    /**
     * Mostra notifica
     */
    showNotification(notification) {
        try {
            // Valida notifica
            if (!notification.message) {
                console.warn('Messaggio notifica richiesto');
                return;
            }
            
            // Crea elemento notifica
            const notificationElement = this.createNotificationElement(notification);
            
            // Aggiungi al container
            this.elements.notificationContainer.appendChild(notificationElement);
            
            // Animazione di entrata
            setTimeout(() => {
                notificationElement.classList.add('show');
            }, 10);
            
            // Auto-hide se configurato
            if (notification.autoHide !== false) {
                const timeout = notification.duration || this.options.notificationTimeout;
                
                setTimeout(() => {
                    this.hideNotification(notificationElement);
                }, timeout);
            }
            
            // Limita numero notifiche
            this.limitNotifications();
            
        } catch (error) {
            console.error('Errore mostra notifica:', error);
        }
    }
    
    /**
     * Crea elemento notifica
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type || 'info'}`;
        element.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            padding: 16px;
            transform: translateX(100%);
            transition: transform ${this.options.animationDuration}ms ease;
            pointer-events: auto;
            max-width: 100%;
            word-wrap: break-word;
        `;
        
        // Colori per tipo
        const colors = {
            info: '#2563EB',
            success: '#059669',
            warning: '#D97706',
            error: '#DC2626'
        };
        
        const color = colors[notification.type] || colors.info;
        element.style.borderLeft = `4px solid ${color}`;
        
        // Contenuto
        let content = '';
        
        if (notification.title) {
            content += `<div style="font-weight: 600; margin-bottom: 4px; color: ${color};">${notification.title}</div>`;
        }
        
        content += `<div style="color: #374151;">${notification.message}</div>`;
        
        // Azioni
        if (notification.actions && notification.actions.length > 0) {
            content += '<div style="margin-top: 12px; display: flex; gap: 8px;">';
            
            notification.actions.forEach(action => {
                content += `<button class="notification-action" data-action="${action.label}" style="
                    background: ${color};
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                ">${action.label}</button>`;
            });
            
            content += '</div>';
        }
        
        // Pulsante chiudi se non auto-hide
        if (notification.autoHide === false) {
            content += `<button class="notification-close" style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #9CA3AF;
            ">&times;</button>`;
            element.style.position = 'relative';
        }
        
        element.innerHTML = content;
        
        // Event listeners
        element.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-close')) {
                this.hideNotification(element);
            } else if (e.target.classList.contains('notification-action')) {
                const actionLabel = e.target.dataset.action;
                const action = notification.actions.find(a => a.label === actionLabel);
                
                if (action && action.action) {
                    action.action();
                }
                
                this.hideNotification(element);
            }
        });
        
        return element;
    }
    
    /**
     * Nascondi notifica
     */
    hideNotification(element) {
        element.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, this.options.animationDuration);
    }
    
    /**
     * Limita numero notifiche
     */
    limitNotifications() {
        const notifications = this.elements.notificationContainer.children;
        
        while (notifications.length > this.options.maxNotifications) {
            this.hideNotification(notifications[0]);
        }
    }
    
    /**
     * Aggiorna notifiche da stato
     */
    updateNotifications(notifications) {
        // Mostra nuove notifiche
        notifications.forEach(notification => {
            if (!notification.shown) {
                this.showNotification(notification);
                notification.shown = true;
            }
        });
    }
    
    /**
     * Mostra modal
     */
    showModal(modalConfig) {
        try {
            // Chiudi modal esistente
            if (this.activeModal) {
                this.closeModal();
            }
            
            // Crea modal
            const modal = this.createModal(modalConfig);
            document.body.appendChild(modal);
            
            // Animazione di entrata
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            this.activeModal = modal;
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.set('ui.modalOpen', true);
            }
            
            // Callback
            if (this.onModalOpen) {
                this.onModalOpen(modalConfig);
            }
            
        } catch (error) {
            console.error('Errore mostra modal:', error);
        }
    }
    
    /**
     * Crea modal
     */
    createModal(config) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity ${this.options.animationDuration}ms ease;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: ${config.maxWidth || '500px'};
            max-height: 90vh;
            overflow-y: auto;
            transform: scale(0.9);
            transition: transform ${this.options.animationDuration}ms ease;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        `;
        
        // Header
        if (config.title) {
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 20px 24px 0;
                border-bottom: 1px solid #E5E7EB;
                margin-bottom: 20px;
            `;
            
            header.innerHTML = `
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${config.title}</h3>
                <button class="modal-close" style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #9CA3AF;
                ">&times;</button>
            `;
            
            modalContent.appendChild(header);
            modalContent.style.position = 'relative';
        }
        
        // Body
        const body = document.createElement('div');
        body.style.cssText = 'padding: 0 24px 20px;';
        body.innerHTML = config.content || '';
        modalContent.appendChild(body);
        
        // Footer con azioni
        if (config.actions && config.actions.length > 0) {
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 20px 24px;
                border-top: 1px solid #E5E7EB;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            `;
            
            config.actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.label;
                button.className = `btn btn-${action.type || 'secondary'}`;
                button.style.cssText = `
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                `;
                
                if (action.type === 'primary') {
                    button.style.background = '#2563EB';
                    button.style.color = 'white';
                } else {
                    button.style.background = '#F3F4F6';
                    button.style.color = '#374151';
                }
                
                button.addEventListener('click', () => {
                    if (action.action) {
                        action.action();
                    }
                    this.closeModal();
                });
                
                footer.appendChild(button);
            });
            
            modalContent.appendChild(footer);
        }
        
        modal.appendChild(modalContent);
        
        // Event listener per chiusura
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                this.closeModal();
            }
        });
        
        return modal;
    }
    
    /**
     * Chiudi modal
     */
    closeModal() {
        if (!this.activeModal) return;
        
        this.activeModal.style.opacity = '0';
        this.activeModal.querySelector('.modal-content').style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            if (this.activeModal && this.activeModal.parentNode) {
                this.activeModal.parentNode.removeChild(this.activeModal);
            }
            this.activeModal = null;
        }, this.options.animationDuration);
        
        // Aggiorna stato
        if (this.stateManager) {
            this.stateManager.set('ui.modalOpen', false);
        }
        
        // Callback
        if (this.onModalClose) {
            this.onModalClose();
        }
    }
    
    /**
     * Aggiorna stato loading
     */
    updateLoadingState(loading) {
        const loadingIndicator = document.querySelector('#loading-indicator');
        
        if (loading) {
            if (!loadingIndicator) {
                this.createLoadingIndicator();
            }
        } else {
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    }
    
    /**
     * Crea indicatore loading
     */
    createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9998;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        indicator.innerHTML = `
            <div class="spinner" style="
                width: 20px;
                height: 20px;
                border: 2px solid #E5E7EB;
                border-top: 2px solid #2563EB;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span>Elaborazione in corso...</span>
        `;
        
        // Aggiungi CSS animation se non esiste
        if (!document.querySelector('#spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(indicator);
    }
    
    /**
     * Aggiorna UI sessione
     */
    updateSessionUI(active) {
        const sessionIndicator = document.querySelector('#session-status');
        
        if (sessionIndicator) {
            sessionIndicator.textContent = active ? 'Sessione Attiva' : 'Sessione Inattiva';
            sessionIndicator.className = `session-status ${active ? 'active' : 'inactive'}`;
        }
    }
    
    /**
     * Aggiorna UI audio
     */
    updateAudioUI(recording) {
        const recordButton = document.querySelector('#record-button');
        
        if (recordButton) {
            recordButton.classList.toggle('recording', recording);
            recordButton.textContent = recording ? 'Stop' : 'Registra';
        }
    }
    
    /**
     * Gestisce cambio mobile
     */
    handleMobileChange(isMobile) {
        document.body.classList.toggle('mobile', isMobile);
        
        if (this.stateManager) {
            this.stateManager.set('ui.mobile', isMobile);
        }
    }
    
    /**
     * Gestisce resize
     */
    handleResize() {
        // Aggiorna layout responsive
        this.handleMobileChange(this.mobileMediaQuery.matches);
    }
    
    /**
     * Gestisce cambio visibilità
     */
    handleVisibilityChange() {
        const isVisible = !document.hidden;
        
        if (this.stateManager) {
            this.stateManager.set('ui.visible', isVisible);
        }
    }
    
    /**
     * Cleanup risorse
     */
    cleanup() {
        // Chiudi modal se aperto
        if (this.activeModal) {
            this.closeModal();
        }
        
        // Rimuovi notifiche
        if (this.elements.notificationContainer) {
            this.elements.notificationContainer.innerHTML = '';
        }
        
        // Clear callbacks
        this.onViewChange = null;
        this.onModalOpen = null;
        this.onModalClose = null;
        
        console.log('UIController cleanup completato');
    }
    
    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            activeModal: !!this.activeModal,
            notificationCount: this.elements.notificationContainer?.children.length || 0,
            loadingStates: Array.from(this.loadingStates),
            isMobile: this.mobileMediaQuery?.matches,
            elements: Object.keys(this.elements).reduce((acc, key) => {
                acc[key] = !!this.elements[key];
                return acc;
            }, {})
        };
    }
}

