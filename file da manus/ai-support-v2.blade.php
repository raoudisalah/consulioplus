@extends('layouts.app')

@section('title', 'AI Co-Pilota Pro v2.0')

@section('head')
<meta name="csrf-token" content="{{ csrf_token() }}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="{{ mix('css/ai-copilot.css') }}" rel="stylesheet">
@endsection

@section('content')
<div id="ai-copilot-app" class="ai-copilot-container">
    <!-- Header principale -->
    <header class="ai-copilot-header">
        <div class="header-content">
            <div class="header-left">
                <div class="logo-section">
                    <div class="logo-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="16" fill="url(#gradient1)"/>
                            <path d="M12 10h8v2h-8v-2zm0 4h8v2h-8v-2zm0 4h6v2h-6v-2z" fill="white"/>
                            <defs>
                                <linearGradient id="gradient1" x1="0" y1="0" x2="32" y2="32">
                                    <stop offset="0%" stop-color="#2563EB"/>
                                    <stop offset="100%" stop-color="#1D4ED8"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="logo-text">
                        <h1>AI Co-Pilota Pro</h1>
                        <span class="version">v2.0</span>
                    </div>
                </div>
            </div>
            
            <div class="header-center">
                <div id="session-status" class="session-status inactive">
                    <div class="status-indicator"></div>
                    <span>Sessione Inattiva</span>
                </div>
            </div>
            
            <div class="header-right">
                <div class="consultant-info">
                    <div class="consultant-avatar">
                        {{ substr($vendor->nome_azienda ?? 'C', 0, 1) }}
                    </div>
                    <div class="consultant-details">
                        <span class="consultant-name">{{ $vendor->nome_azienda ?? 'Consulente' }}</span>
                        <span class="consultant-type">{{ $consultantType }}</span>
                    </div>
                </div>
                
                <div class="header-actions">
                    <button id="settings-btn" class="header-btn" title="Impostazioni">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    
                    <button id="help-btn" class="header-btn" title="Aiuto">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Contenuto principale -->
    <main id="ai-copilot-main" class="ai-copilot-main">
        <!-- Setup Meeting Modal (inizialmente nascosto) -->
        <div id="meeting-setup" class="meeting-setup-container" style="display: none;">
            <div class="setup-card">
                <div class="setup-header">
                    <h2>Configura Sessione AI</h2>
                    <p>Configura i dettagli per iniziare una nuova sessione con il Co-Pilota AI</p>
                </div>
                
                <div class="setup-steps">
                    <div class="step-indicator">
                        <div class="step active" data-step="1">
                            <span>1</span>
                            <label>Cliente</label>
                        </div>
                        <div class="step" data-step="2">
                            <span>2</span>
                            <label>Conferma</label>
                        </div>
                        <div class="step" data-step="3">
                            <span>3</span>
                            <label>Avvio</label>
                        </div>
                    </div>
                    
                    <!-- Step 1: Ricerca/Creazione Cliente -->
                    <div id="step-1" class="setup-step active">
                        <div class="form-group">
                            <label for="client-search">P.IVA / Codice Fiscale Cliente</label>
                            <div class="input-with-button">
                                <input type="text" id="client-search" placeholder="Inserisci P.IVA o Codice Fiscale">
                                <button id="search-client-btn" class="btn btn-primary">Cerca</button>
                            </div>
                        </div>
                        
                        <div id="client-results" class="client-results" style="display: none;">
                            <!-- Risultati ricerca cliente -->
                        </div>
                        
                        <div class="divider">
                            <span>oppure</span>
                        </div>
                        
                        <button id="create-client-btn" class="btn btn-outline">Crea Nuovo Cliente</button>
                    </div>
                    
                    <!-- Step 2: Conferma Informazioni -->
                    <div id="step-2" class="setup-step">
                        <div id="client-info-card" class="info-card">
                            <!-- Informazioni cliente -->
                        </div>
                        
                        <div class="form-group">
                            <label for="meeting-type">Tipo di Consulenza</label>
                            <select id="meeting-type">
                                <option value="Consulenza Generale">Consulenza Generale</option>
                                <option value="Consulenza Lavoro">Consulenza del Lavoro</option>
                                <option value="Consulenza Medica">Consulenza Medica</option>
                                <option value="Consulenza Legale">Consulenza Legale</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="session-notes">Note Aggiuntive (opzionale)</label>
                            <textarea id="session-notes" placeholder="Aggiungi note o contesto per la sessione..."></textarea>
                        </div>
                    </div>
                    
                    <!-- Step 3: Avvio Sessione -->
                    <div id="step-3" class="setup-step">
                        <div class="start-session-card">
                            <div class="session-summary">
                                <h3>Riepilogo Sessione</h3>
                                <div id="session-summary-content">
                                    <!-- Riepilogo -->
                                </div>
                            </div>
                            
                            <div class="start-actions">
                                <button id="start-session-btn" class="btn btn-primary btn-large">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                                    </svg>
                                    Avvia Sessione AI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="setup-navigation">
                    <button id="prev-step-btn" class="btn btn-outline" style="display: none;">Indietro</button>
                    <button id="next-step-btn" class="btn btn-primary" style="display: none;">Avanti</button>
                </div>
            </div>
        </div>

        <!-- Interfaccia Chat Principale -->
        <div id="chat-interface" class="chat-interface" style="display: none;">
            <div class="chat-container">
                <!-- Sidebar Sinistra -->
                <aside id="ai-copilot-sidebar" class="chat-sidebar">
                    <div class="sidebar-header">
                        <h3>Sessione Attiva</h3>
                        <div class="session-timer">
                            <span id="session-duration">00:00</span>
                        </div>
                    </div>
                    
                    <div class="client-card">
                        <div class="client-avatar">
                            <span id="client-initial">C</span>
                        </div>
                        <div class="client-info">
                            <h4 id="client-name">Nome Cliente</h4>
                            <p id="client-details">Dettagli cliente</p>
                        </div>
                    </div>
                    
                    <div class="session-controls">
                        <button id="pause-session-btn" class="control-btn">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                            Pausa
                        </button>
                        
                        <button id="end-session-btn" class="control-btn end-btn">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"/>
                            </svg>
                            Termina
                        </button>
                    </div>
                    
                    <div class="session-stats">
                        <div class="stat-item">
                            <span class="stat-label">Messaggi</span>
                            <span id="message-count" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Suggerimenti</span>
                            <span id="suggestion-count" class="stat-value">0</span>
                        </div>
                    </div>
                </aside>

                <!-- Area Chat Centrale -->
                <div class="chat-main">
                    <div class="chat-header">
                        <div class="chat-title">
                            <h2>Conversazione AI</h2>
                            <div class="ai-status">
                                <div id="ai-indicator" class="ai-indicator ready">
                                    <div class="indicator-dot"></div>
                                    <span>AI Pronto</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="chat-messages" class="chat-messages">
                        <div class="welcome-message">
                            <div class="ai-avatar">
                                <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div class="message-content">
                                <h3>Benvenuto nel Co-Pilota AI Pro v2.0</h3>
                                <p>Sono pronto ad assisterti durante la consulenza. Inizia a parlare e ti fornirò suggerimenti in tempo reale, ricerche web pertinenti e insights professionali.</p>
                                <div class="features-list">
                                    <div class="feature">
                                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/>
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-4 4 2 2 0 104 0 4 4 0 00-4-4z" clip-rule="evenodd"/>
                                        </svg>
                                        Trascrizione in tempo reale
                                    </div>
                                    <div class="feature">
                                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                                        </svg>
                                        Suggerimenti AI specializzati
                                    </div>
                                    <div class="feature">
                                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                                        </svg>
                                        Ricerca web automatica
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-input-area">
                        <div id="audio-recorder" class="audio-recorder">
                            <div class="recorder-controls">
                                <button id="record-button" class="record-btn">
                                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
                                    </svg>
                                    <span>Inizia Registrazione</span>
                                </button>
                                
                                <div id="audio-visualizer" class="audio-visualizer" style="display: none;">
                                    <div class="visualizer-bars">
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                        <div class="bar"></div>
                                    </div>
                                    <span class="recording-text">Registrazione in corso...</span>
                                </div>
                            </div>
                            
                            <div class="recorder-status">
                                <div id="audio-level" class="audio-level">
                                    <div class="level-bar"></div>
                                </div>
                                <span id="recording-time" class="recording-time">00:00</span>
                            </div>
                        </div>
                        
                        <div class="manual-input" style="display: none;">
                            <div class="input-group">
                                <input type="text" id="manual-message" placeholder="Scrivi un messaggio o una domanda...">
                                <button id="send-message-btn" class="send-btn">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="input-toggle">
                            <button id="toggle-input-mode" class="toggle-btn">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clip-rule="evenodd"/>
                                </svg>
                                Modalità Testo
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Pannello Suggerimenti Destro -->
                <aside id="suggestion-panel" class="suggestion-panel">
                    <div class="panel-header">
                        <h3>Suggerimenti AI</h3>
                        <div class="panel-controls">
                            <button id="refresh-suggestions" class="panel-btn" title="Aggiorna">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                            
                            <button id="clear-suggestions" class="panel-btn" title="Pulisci">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"/>
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="panel-tabs">
                        <button class="tab-btn active" data-tab="suggestions">Suggerimenti</button>
                        <button class="tab-btn" data-tab="web-results">Web</button>
                        <button class="tab-btn" data-tab="insights">Insights</button>
                    </div>
                    
                    <div id="suggestions-content" class="panel-content">
                        <div class="empty-state">
                            <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                            </svg>
                            <h4>Nessun suggerimento</h4>
                            <p>I suggerimenti AI appariranno qui durante la conversazione</p>
                        </div>
                    </div>
                    
                    <div id="web-results-content" class="panel-content" style="display: none;">
                        <div class="empty-state">
                            <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                            </svg>
                            <h4>Nessun risultato web</h4>
                            <p>I risultati delle ricerche web appariranno qui</p>
                        </div>
                    </div>
                    
                    <div id="insights-content" class="panel-content" style="display: none;">
                        <div class="empty-state">
                            <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <h4>Nessun insight</h4>
                            <p>Gli insights AI appariranno qui durante l'analisi</p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </main>

    <!-- Status Bar -->
    <div id="status-indicator" class="status-bar">
        <div class="status-content">
            <div class="status-item">
                <span class="status-label">Stato:</span>
                <span id="app-status" class="status-value">Pronto</span>
            </div>
            
            <div class="status-item">
                <span class="status-label">Audio:</span>
                <span id="audio-status" class="status-value">Non attivo</span>
            </div>
            
            <div class="status-item">
                <span class="status-label">AI:</span>
                <span id="ai-status" class="status-value">Pronto</span>
            </div>
        </div>
    </div>

    <!-- Container Notifiche -->
    <div id="notification-container" class="notification-container"></div>
</div>

<!-- Modal per creazione cliente -->
<div id="create-client-modal" class="modal" style="display: none;">
    <div class="modal-backdrop">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Crea Nuovo Cliente</h3>
                <button class="modal-close">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="create-client-form">
                    <div class="form-group">
                        <label for="nome-azienda">Nome Azienda *</label>
                        <input type="text" id="nome-azienda" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="codice-fiscale">P.IVA / Codice Fiscale *</label>
                        <input type="text" id="codice-fiscale" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email-cliente">Email</label>
                        <input type="email" id="email-cliente">
                    </div>
                    
                    <div class="form-group">
                        <label for="settore-attivita">Settore Attività</label>
                        <input type="text" id="settore-attivita">
                    </div>
                    
                    <div class="form-group">
                        <label for="indirizzo-cliente">Indirizzo</label>
                        <textarea id="indirizzo-cliente"></textarea>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" data-dismiss="modal">Annulla</button>
                <button type="submit" form="create-client-form" class="btn btn-primary">Crea Cliente</button>
            </div>
        </div>
    </div>
</div>

@endsection

@section('scripts')
<script>
    // Configurazione globale
    window.aiCopilotConfig = {
        csrfToken: '{{ csrf_token() }}',
        vendor: @json($vendor),
        consultantType: '{{ $consultantType }}',
        apiBaseUrl: '{{ url("/") }}',
        version: '{{ $version ?? "2.0.0" }}'
    };
</script>
<script src="{{ mix('js/ai-copilot.js') }}"></script>
@endsection

