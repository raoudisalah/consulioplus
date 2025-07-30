/**
 * APIClient - Client HTTP per AI Co-Pilota Pro v2.0
 * 
 * Gestisce tutte le chiamate HTTP al backend con retry,
 * timeout, cache e gestione errori avanzata
 */

export class APIClient {
    constructor(options = {}) {
        this.options = {
            baseURL: options.baseURL || '',
            timeout: options.timeout || 30000,
            retries: options.retries || 3,
            retryDelay: options.retryDelay || 1000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            ...options
        };
        
        // CSRF Token
        this.csrfToken = this.getCSRFToken();
        if (this.csrfToken) {
            this.options.headers['X-CSRF-TOKEN'] = this.csrfToken;
        }
        
        // Cache per richieste GET
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        
        // Interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Stato
        this.pendingRequests = new Map();
        this.requestId = 0;
    }
    
    /**
     * Ottiene CSRF token
     */
    getCSRFToken() {
        // Da meta tag
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }
        
        // Da configurazione globale
        if (window.aiCopilotConfig && window.aiCopilotConfig.csrfToken) {
            return window.aiCopilotConfig.csrfToken;
        }
        
        return null;
    }
    
    /**
     * Aggiunge interceptor richiesta
     */
    addRequestInterceptor(interceptor) {
        if (typeof interceptor === 'function') {
            this.requestInterceptors.push(interceptor);
        }
    }
    
    /**
     * Aggiunge interceptor risposta
     */
    addResponseInterceptor(interceptor) {
        if (typeof interceptor === 'function') {
            this.responseInterceptors.push(interceptor);
        }
    }
    
    /**
     * Applica interceptors richiesta
     */
    async applyRequestInterceptors(config) {
        let modifiedConfig = { ...config };
        
        for (const interceptor of this.requestInterceptors) {
            try {
                modifiedConfig = await interceptor(modifiedConfig) || modifiedConfig;
            } catch (error) {
                console.warn('Errore request interceptor:', error);
            }
        }
        
        return modifiedConfig;
    }
    
    /**
     * Applica interceptors risposta
     */
    async applyResponseInterceptors(response) {
        let modifiedResponse = response;
        
        for (const interceptor of this.responseInterceptors) {
            try {
                modifiedResponse = await interceptor(modifiedResponse) || modifiedResponse;
            } catch (error) {
                console.warn('Errore response interceptor:', error);
            }
        }
        
        return modifiedResponse;
    }
    
    /**
     * Genera URL completo
     */
    buildURL(endpoint) {
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }
        
        const baseURL = this.options.baseURL.replace(/\/$/, '');
        const cleanEndpoint = endpoint.replace(/^\//, '');
        
        return `${baseURL}/${cleanEndpoint}`;
    }
    
    /**
     * Genera chiave cache
     */
    generateCacheKey(method, url, params) {
        const key = `${method.toUpperCase()}_${url}_${JSON.stringify(params || {})}`;
        return btoa(key).substring(0, 32);
    }
    
    /**
     * Ottiene da cache
     */
    getFromCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        // Rimuovi se scaduto
        if (cached) {
            this.cache.delete(cacheKey);
        }
        
        return null;
    }
    
    /**
     * Salva in cache
     */
    saveToCache(cacheKey, data) {
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        // Pulisci cache vecchia
        this.cleanupCache();
    }
    
    /**
     * Pulisce cache scaduta
     */
    cleanupCache() {
        const now = Date.now();
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }
    
    /**
     * Crea AbortController con timeout
     */
    createAbortController(timeout) {
        const controller = new AbortController();
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);
        
        // Cleanup timeout se richiesta completa
        const originalAbort = controller.abort.bind(controller);
        controller.abort = () => {
            clearTimeout(timeoutId);
            originalAbort();
        };
        
        return controller;
    }
    
    /**
     * Esegue richiesta HTTP
     */
    async request(config) {
        const requestId = ++this.requestId;
        
        try {
            // Applica interceptors richiesta
            const modifiedConfig = await this.applyRequestInterceptors(config);
            
            // Costruisci URL
            const url = this.buildURL(modifiedConfig.url);
            
            // Verifica cache per GET
            if (modifiedConfig.method === 'GET' && modifiedConfig.cache !== false) {
                const cacheKey = this.generateCacheKey(modifiedConfig.method, url, modifiedConfig.params);
                const cached = this.getFromCache(cacheKey);
                
                if (cached) {
                    console.log('Risposta da cache:', url);
                    return cached;
                }
            }
            
            // Prepara opzioni fetch
            const fetchOptions = {
                method: modifiedConfig.method || 'GET',
                headers: { ...this.options.headers, ...modifiedConfig.headers },
                signal: this.createAbortController(modifiedConfig.timeout || this.options.timeout).signal
            };
            
            // Aggiungi body per metodi che lo supportano
            if (['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
                if (modifiedConfig.data) {
                    if (modifiedConfig.data instanceof FormData) {
                        fetchOptions.body = modifiedConfig.data;
                        // Rimuovi Content-Type per FormData (browser lo imposta automaticamente)
                        delete fetchOptions.headers['Content-Type'];
                    } else {
                        fetchOptions.body = JSON.stringify(modifiedConfig.data);
                    }
                }
            }
            
            // Aggiungi query params per GET
            if (modifiedConfig.params && fetchOptions.method === 'GET') {
                const urlObj = new URL(url);
                Object.keys(modifiedConfig.params).forEach(key => {
                    urlObj.searchParams.append(key, modifiedConfig.params[key]);
                });
                url = urlObj.toString();
            }
            
            // Salva richiesta pendente
            this.pendingRequests.set(requestId, { url, config: modifiedConfig });
            
            // Esegui richiesta con retry
            const response = await this.executeWithRetry(url, fetchOptions, modifiedConfig);
            
            // Rimuovi da richieste pendenti
            this.pendingRequests.delete(requestId);
            
            // Applica interceptors risposta
            const finalResponse = await this.applyResponseInterceptors(response);
            
            // Salva in cache se GET e successo
            if (modifiedConfig.method === 'GET' && modifiedConfig.cache !== false && finalResponse.success) {
                const cacheKey = this.generateCacheKey(modifiedConfig.method, url, modifiedConfig.params);
                this.saveToCache(cacheKey, finalResponse);
            }
            
            return finalResponse;
            
        } catch (error) {
            // Rimuovi da richieste pendenti
            this.pendingRequests.delete(requestId);
            
            console.error('Errore richiesta API:', error);
            throw this.handleError(error, config);
        }
    }
    
    /**
     * Esegue richiesta con retry
     */
    async executeWithRetry(url, fetchOptions, config) {
        let lastError;
        const maxRetries = config.retries !== undefined ? config.retries : this.options.retries;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, fetchOptions);
                return await this.processResponse(response);
                
            } catch (error) {
                lastError = error;
                
                // Non fare retry per errori di abort o ultimo tentativo
                if (error.name === 'AbortError' || attempt === maxRetries) {
                    throw error;
                }
                
                // Delay prima del retry
                const delay = config.retryDelay !== undefined ? config.retryDelay : this.options.retryDelay;
                await this.sleep(delay * Math.pow(2, attempt)); // Exponential backoff
                
                console.warn(`Retry ${attempt + 1}/${maxRetries} per ${url}`);
            }
        }
        
        throw lastError;
    }
    
    /**
     * Processa risposta HTTP
     */
    async processResponse(response) {
        const contentType = response.headers.get('content-type');
        let data;
        
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        } catch (error) {
            console.warn('Errore parsing risposta:', error);
            data = null;
        }
        
        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: data,
            headers: this.headersToObject(response.headers),
            url: response.url
        };
        
        if (!response.ok) {
            result.error = data?.message || data?.error || response.statusText;
        }
        
        return result;
    }
    
    /**
     * Converte headers in oggetto
     */
    headersToObject(headers) {
        const obj = {};
        for (const [key, value] of headers.entries()) {
            obj[key] = value;
        }
        return obj;
    }
    
    /**
     * Gestisce errori
     */
    handleError(error, config) {
        const apiError = {
            name: error.name || 'APIError',
            message: error.message || 'Errore sconosciuto',
            config: config,
            timestamp: new Date().toISOString()
        };
        
        // Errori specifici
        if (error.name === 'AbortError') {
            apiError.message = 'Richiesta annullata (timeout)';
            apiError.timeout = true;
        } else if (!navigator.onLine) {
            apiError.message = 'Connessione internet non disponibile';
            apiError.offline = true;
        }
        
        return apiError;
    }
    
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * GET request
     */
    async get(url, config = {}) {
        return this.request({
            method: 'GET',
            url: url,
            ...config
        });
    }
    
    /**
     * POST request
     */
    async post(url, data = null, config = {}) {
        return this.request({
            method: 'POST',
            url: url,
            data: data,
            ...config
        });
    }
    
    /**
     * PUT request
     */
    async put(url, data = null, config = {}) {
        return this.request({
            method: 'PUT',
            url: url,
            data: data,
            ...config
        });
    }
    
    /**
     * PATCH request
     */
    async patch(url, data = null, config = {}) {
        return this.request({
            method: 'PATCH',
            url: url,
            data: data,
            ...config
        });
    }
    
    /**
     * DELETE request
     */
    async delete(url, config = {}) {
        return this.request({
            method: 'DELETE',
            url: url,
            ...config
        });
    }
    
    /**
     * Upload file
     */
    async upload(url, file, config = {}) {
        const formData = new FormData();
        
        if (file instanceof File) {
            formData.append('file', file);
        } else if (typeof file === 'object') {
            Object.keys(file).forEach(key => {
                formData.append(key, file[key]);
            });
        }
        
        return this.request({
            method: 'POST',
            url: url,
            data: formData,
            ...config
        });
    }
    
    /**
     * Download file
     */
    async download(url, filename = null, config = {}) {
        const response = await this.request({
            method: 'GET',
            url: url,
            cache: false,
            ...config
        });
        
        if (response.success && response.data) {
            // Crea blob e download
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);
        }
        
        return response;
    }
    
    /**
     * Annulla tutte le richieste pendenti
     */
    cancelAllRequests() {
        this.pendingRequests.forEach((request, id) => {
            console.log(`Annullamento richiesta ${id}: ${request.url}`);
        });
        
        this.pendingRequests.clear();
    }
    
    /**
     * Ottiene richieste pendenti
     */
    getPendingRequests() {
        return Array.from(this.pendingRequests.entries()).map(([id, request]) => ({
            id: id,
            url: request.url,
            config: request.config
        }));
    }
    
    /**
     * Pulisce cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache API pulita');
    }
    
    /**
     * Aggiorna header
     */
    setHeader(name, value) {
        this.options.headers[name] = value;
    }
    
    /**
     * Rimuove header
     */
    removeHeader(name) {
        delete this.options.headers[name];
    }
    
    /**
     * Aggiorna CSRF token
     */
    updateCSRFToken(token) {
        this.csrfToken = token;
        this.setHeader('X-CSRF-TOKEN', token);
    }
    
    /**
     * Ottiene statistiche
     */
    getStatistics() {
        return {
            cacheSize: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            requestInterceptors: this.requestInterceptors.length,
            responseInterceptors: this.responseInterceptors.length,
            lastRequestId: this.requestId
        };
    }
    
    /**
     * Debug info
     */
    getDebugInfo() {
        return {
            options: this.options,
            statistics: this.getStatistics(),
            pendingRequests: this.getPendingRequests()
        };
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.cancelAllRequests();
        this.clearCache();
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        console.log('APIClient distrutto');
    }
}

