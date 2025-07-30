/**
 * BaseComponent - Classe base per componenti UI
 * 
 * Fornisce funzionalità comuni per tutti i componenti
 * del sistema AI Co-Pilota Pro v2.0
 */

export class BaseComponent {
    constructor(selector, options = {}) {
        this.selector = selector;
        this.options = { ...this.defaultOptions, ...options };
        this.element = null;
        this.initialized = false;
        this.destroyed = false;
        
        // Event listeners per cleanup
        this.eventListeners = [];
        
        // Trova elemento DOM
        this.findElement();
    }
    
    /**
     * Opzioni di default (da sovrascrivere nelle sottoclassi)
     */
    get defaultOptions() {
        return {};
    }
    
    /**
     * Trova elemento DOM
     */
    findElement() {
        if (typeof this.selector === 'string') {
            this.element = document.querySelector(this.selector);
        } else if (this.selector instanceof HTMLElement) {
            this.element = this.selector;
        }
        
        if (!this.element) {
            console.warn(`Elemento non trovato per selector: ${this.selector}`);
        }
    }
    
    /**
     * Inizializza componente
     */
    initialize() {
        if (this.initialized) {
            console.warn('Componente già inizializzato');
            return;
        }
        
        if (!this.element) {
            throw new Error('Elemento DOM richiesto per inizializzazione');
        }
        
        this.initialized = true;
        console.log(`${this.constructor.name} inizializzato`);
    }
    
    /**
     * Aggiunge event listener con auto-cleanup
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) {
            console.warn('Parametri event listener incompleti');
            return;
        }
        
        element.addEventListener(event, handler, options);
        
        // Salva per cleanup
        this.eventListeners.push({
            element: element,
            event: event,
            handler: handler,
            options: options
        });
    }
    
    /**
     * Rimuove event listener
     */
    removeEventListener(element, event, handler) {
        if (!element || !event || !handler) return;
        
        element.removeEventListener(event, handler);
        
        // Rimuovi dalla lista
        this.eventListeners = this.eventListeners.filter(listener => 
            listener.element !== element || 
            listener.event !== event || 
            listener.handler !== handler
        );
    }
    
    /**
     * Emette evento personalizzato
     */
    emit(eventName, detail = {}) {
        if (!this.element) return;
        
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });
        
        this.element.dispatchEvent(event);
    }
    
    /**
     * Ascolta evento personalizzato
     */
    on(eventName, handler) {
        if (!this.element || !eventName || !handler) return;
        
        this.addEventListener(this.element, eventName, handler);
    }
    
    /**
     * Ascolta evento una sola volta
     */
    once(eventName, handler) {
        if (!this.element || !eventName || !handler) return;
        
        const onceHandler = (event) => {
            handler(event);
            this.removeEventListener(this.element, eventName, onceHandler);
        };
        
        this.addEventListener(this.element, eventName, onceHandler);
    }
    
    /**
     * Mostra elemento
     */
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.element.classList.remove('hidden');
            this.emit('component:show');
        }
    }
    
    /**
     * Nascondi elemento
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.emit('component:hide');
        }
    }
    
    /**
     * Toggle visibilità
     */
    toggle() {
        if (!this.element) return;
        
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Verifica se elemento è visibile
     */
    isVisible() {
        if (!this.element) return false;
        
        const style = window.getComputedStyle(this.element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }
    
    /**
     * Abilita elemento
     */
    enable() {
        if (this.element) {
            this.element.disabled = false;
            this.element.classList.remove('disabled');
            this.emit('component:enable');
        }
    }
    
    /**
     * Disabilita elemento
     */
    disable() {
        if (this.element) {
            this.element.disabled = true;
            this.element.classList.add('disabled');
            this.emit('component:disable');
        }
    }
    
    /**
     * Verifica se elemento è abilitato
     */
    isEnabled() {
        if (!this.element) return false;
        return !this.element.disabled && !this.element.classList.contains('disabled');
    }
    
    /**
     * Aggiunge classe CSS
     */
    addClass(className) {
        if (this.element && className) {
            this.element.classList.add(className);
        }
    }
    
    /**
     * Rimuove classe CSS
     */
    removeClass(className) {
        if (this.element && className) {
            this.element.classList.remove(className);
        }
    }
    
    /**
     * Toggle classe CSS
     */
    toggleClass(className) {
        if (this.element && className) {
            this.element.classList.toggle(className);
        }
    }
    
    /**
     * Verifica se ha classe CSS
     */
    hasClass(className) {
        if (!this.element || !className) return false;
        return this.element.classList.contains(className);
    }
    
    /**
     * Imposta attributo
     */
    setAttribute(name, value) {
        if (this.element && name) {
            this.element.setAttribute(name, value);
        }
    }
    
    /**
     * Ottiene attributo
     */
    getAttribute(name) {
        if (!this.element || !name) return null;
        return this.element.getAttribute(name);
    }
    
    /**
     * Rimuove attributo
     */
    removeAttribute(name) {
        if (this.element && name) {
            this.element.removeAttribute(name);
        }
    }
    
    /**
     * Imposta stile CSS
     */
    setStyle(property, value) {
        if (this.element && property) {
            this.element.style[property] = value;
        }
    }
    
    /**
     * Ottiene stile CSS
     */
    getStyle(property) {
        if (!this.element || !property) return null;
        return window.getComputedStyle(this.element)[property];
    }
    
    /**
     * Trova elemento figlio
     */
    find(selector) {
        if (!this.element || !selector) return null;
        return this.element.querySelector(selector);
    }
    
    /**
     * Trova tutti gli elementi figli
     */
    findAll(selector) {
        if (!this.element || !selector) return [];
        return Array.from(this.element.querySelectorAll(selector));
    }
    
    /**
     * Ottiene elemento padre
     */
    getParent(selector = null) {
        if (!this.element) return null;
        
        if (!selector) {
            return this.element.parentElement;
        }
        
        return this.element.closest(selector);
    }
    
    /**
     * Ottiene dimensioni elemento
     */
    getDimensions() {
        if (!this.element) return { width: 0, height: 0 };
        
        const rect = this.element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        };
    }
    
    /**
     * Scroll a elemento
     */
    scrollIntoView(options = {}) {
        if (this.element) {
            this.element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                ...options
            });
        }
    }
    
    /**
     * Focus su elemento
     */
    focus() {
        if (this.element && typeof this.element.focus === 'function') {
            this.element.focus();
        }
    }
    
    /**
     * Blur da elemento
     */
    blur() {
        if (this.element && typeof this.element.blur === 'function') {
            this.element.blur();
        }
    }
    
    /**
     * Aggiorna opzioni
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.emit('component:options-updated', { options: this.options });
    }
    
    /**
     * Ottiene opzione
     */
    getOption(key, defaultValue = null) {
        return this.options[key] !== undefined ? this.options[key] : defaultValue;
    }
    
    /**
     * Imposta opzione
     */
    setOption(key, value) {
        this.options[key] = value;
        this.emit('component:option-changed', { key: key, value: value });
    }
    
    /**
     * Valida stato componente
     */
    validate() {
        if (this.destroyed) {
            throw new Error('Componente distrutto');
        }
        
        if (!this.initialized) {
            throw new Error('Componente non inizializzato');
        }
        
        if (!this.element) {
            throw new Error('Elemento DOM non disponibile');
        }
        
        return true;
    }
    
    /**
     * Refresh componente
     */
    refresh() {
        if (!this.initialized) return;
        
        this.emit('component:refresh');
        console.log(`${this.constructor.name} refreshed`);
    }
    
    /**
     * Reset componente
     */
    reset() {
        if (!this.initialized) return;
        
        this.emit('component:reset');
        console.log(`${this.constructor.name} reset`);
    }
    
    /**
     * Cleanup event listeners
     */
    cleanupEventListeners() {
        this.eventListeners.forEach(listener => {
            try {
                listener.element.removeEventListener(
                    listener.event, 
                    listener.handler, 
                    listener.options
                );
            } catch (error) {
                console.warn('Errore rimozione event listener:', error);
            }
        });
        
        this.eventListeners = [];
    }
    
    /**
     * Distrugge componente
     */
    destroy() {
        if (this.destroyed) {
            console.warn('Componente già distrutto');
            return;
        }
        
        // Cleanup event listeners
        this.cleanupEventListeners();
        
        // Emetti evento prima della distruzione
        this.emit('component:destroy');
        
        // Reset stato
        this.initialized = false;
        this.destroyed = true;
        this.element = null;
        this.options = {};
        
        console.log(`${this.constructor.name} distrutto`);
    }
    
    /**
     * Ottiene info debug
     */
    getDebugInfo() {
        return {
            selector: this.selector,
            initialized: this.initialized,
            destroyed: this.destroyed,
            hasElement: !!this.element,
            isVisible: this.isVisible(),
            isEnabled: this.isEnabled(),
            eventListeners: this.eventListeners.length,
            options: this.options
        };
    }
    
    /**
     * Log debug
     */
    debug(message, data = {}) {
        console.log(`[${this.constructor.name}] ${message}`, data);
    }
    
    /**
     * Log warning
     */
    warn(message, data = {}) {
        console.warn(`[${this.constructor.name}] ${message}`, data);
    }
    
    /**
     * Log error
     */
    error(message, error = null) {
        console.error(`[${this.constructor.name}] ${message}`, error);
    }
}

