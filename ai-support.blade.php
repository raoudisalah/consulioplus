@extends("vendors.layout")

@section("content")

{{-- TUTTO IL TUO CODICE HTML e <style> VA QUI, IDENTICO A PRIMA --}}
<style>
#pause-resume-btn {
        background-color: #ffc107;
        color: #212529;
    }
    #pause-resume-btn:hover {
        background-color: #e0a800;
    }
    #pause-resume-btn.paused {
        background-color: #28a745;
        color: white;
    }
    #pause-resume-btn.paused:hover {
        background-color: #218838;
    }
    /* Stili CSS originali (con le parti non necessarie rimosse) */
   .planning-input-area {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e9ecef;
}
.planning-input-area textarea {
    flex-grow: 1;
    min-height: 40px;
}
.planning-input-area button {
    padding: 10px 15px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    white-space: nowrap; /* Aggiunto per evitare che il testo vada a capo */
}
.planning-entry {
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
    .ai-copilot-container {
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding: 18px;
        background-color: #f0f2f5;
        border-radius: 8px;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        max-width: 950px;
        margin: 20px auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .start-meeting-button-container {
        display: flex;
        justify-content: center;
        margin-bottom: 10px;
    }

    #start-meeting-btn {
        padding: 12px 25px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: background-color 0.2s ease;
    }
    #start-meeting-btn:hover {
        background-color: #0056b3;
    }
    #start-meeting-btn.meeting-active {
        background-color: #dc3545;
    }
    #start-meeting-btn.meeting-active:hover {
        background-color: #c82333;
    }

    .main-content-area {
        display: flex;
        gap: 18px;
    }

    .left-column, .right-column {
        flex: 1;
        background-color: white;
        padding: 18px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .right-column {
        flex: 1.3;
    }

    .left-column h2, .right-column h2 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 20px;
        color: #007bff !important;
        border-bottom: 1px solid #e9ecef;
        padding-bottom: 8px;
    }

    .dynamic-summary-content, .ai-suggestions-content {
        flex-grow: 1;
        overflow-y: auto;
        max-height: 400px; 
        min-height: 300px;
        color: #000000;
        padding-right: 10px;
        border: 1px solid #eee;
    }
    .dynamic-summary-content > div, .ai-suggestions-content > div.ai-suggestion {
        padding: 8px;
        margin-bottom: 8px;
        border-bottom: 1px dashed #f1f1f1;
    }
    .dynamic-summary-content > div:last-child, .ai-suggestions-content > div.ai-suggestion:last-child {
        border-bottom: none;
    }

    .ai-suggestion strong {
        color: #0056b3;
        font-weight: 700;
        font-size: 17px;
        background-color: rgba(0, 123, 255, 0.08);
        padding: 0 3px;
        border-radius: 2px;
    }
    .ai-suggestion a {
        color: #0056b3;
        text-decoration: underline;
    }
    .ai-suggestion a:hover {
        color: #003d80;
    }
    .web-result-link-info {
        font-size: 0.9em;
        margin-top: 5px;
        color: #555;
    }

    .scroll-buttons {
        position: absolute;
        bottom: 20px; 
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 100; 
    }

    .scroll-buttons button {
        background-color: rgba(0, 123, 255, 0.6);
        color: white;
        border: none;
        border-radius: 50%; 
        width: 30px; 
        height: 30px;
        cursor: pointer;
        font-size: 16px; 
        line-height: 30px; 
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        transition: background-color 0.2s ease;
    }

    .scroll-buttons button:hover {
        background-color: rgba(0, 123, 255, 0.9);
    }

    .view-transcript-link {
        display: inline-block;
        margin-top: 15px;
        color: #007bff;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        padding: 5px 0;
    }
    .view-transcript-link:hover {
        text-decoration: underline;
    }
    .full-transcript-content {
        margin-top: 10px;
        padding: 10px;
        background-color: #f8f9fa;
        border-radius: 5px;
        font-size: 13px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        color: #000000;
    }

    .ai-suggestion {
        background-color: #f0f7ff;
        padding: 16px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 16px;
        line-height: 1.5;
        border-left: 4px solid #0056b3;
        color: #000000;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .ai-question-area {
        background-color: white;
        padding: 18px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }

    .ai-question-area textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ced4da;
        border-radius: 6px;
        min-height: 70px;
        box-sizing: border-box;
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 10px;
    }
    .ai-question-area textarea:focus {
        border-color: #80bdff;
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
    }
    .ai-question-controls {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-bottom: 10px;
    }
    .ai-question-controls button {
        padding: 8px 15px;
        font-size: 14px;
        border-radius: 5px;
        cursor: pointer;
        border: 1px solid transparent;
    }
    #send-ai-question-btn {
        background-color: #007bff;
        color: white;
        border-color: #007bff;
    }
    #send-ai-question-btn:hover {
        background-color: #0056b3;
    }
    #attach-file-btn {
        background-color: #6c757d;
        color: white;
        border-color: #6c757d;
    }
    #attach-file-btn:hover {
        background-color: #5a6268;
    }

    #ai-response-area {
        margin-top: 15px;
        padding: 15px;
        background-color: #e9f5ff;
        border-radius: 6px;
        color: #004085;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
        min-height: 50px;
        border: 1px solid #b8daff;
    }
    #ai-response-area:empty {
        display: none;
    }

    .bottom-bar {
        display: flex;
        justify-content: space-around;
        background-color: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }

    .bottom-bar button {
        padding: 10px 18px;
        background-color: #e9ecef;
        color: #495057;
        border: 1px solid #ced4da;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s ease, border-color 0.2s ease;
    }
    .bottom-bar button:hover {
        background-color: #dee2e6;
        border-color: #adb5bd;
    }
    .bottom-bar button.active-view {
        background-color: #007bff;
        color: white;
        border-color: #007bff;
    }

    .view-container {
        margin-top:15px; 
        padding:15px; 
        background-color:white; 
        border-radius:8px; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        font-size: 14px;
        white-space: pre-wrap;
        color: #000000;
    }
    .view-container h3 {
        margin-top: 0;
        font-size: 18px;
        color: #000000;
    }
    .view-container textarea, .view-container input[type="datetime-local"], .view-container input[type="text"] {
        width: 100%;
        padding: 10px;
        margin-bottom: 10px;
        border: 1px solid #ced4da;
        border-radius: 5px;
        box-sizing: border-box;
    }

    /* Stili aggiunti per la finestra "Co-Pilota Live" */
    .copilot-modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
    }
.copilot-content {
        background-color: #f8f9fa;
        margin: 5% auto;
        padding: 20px;
        border-radius: 10px;
        width: 80%;
        max-width: 1000px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
    .copilot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #dee2e6;
        padding-bottom: 15px;
        margin-bottom: 20px;
        position: relative;
    }
    .copilot-header h2 {
        margin: 0;
        color: #0d6efd !important;
        font-size: 24px;
    }
    .close-button {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #6c757d;
    }
    .copilot-body {
        padding: 20px 0;
    }
    .current-suggestion {
        font-size: 32px;
        line-height: 1.5;
        padding: 30px;
        margin-bottom: 20px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        min-height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        font-weight: 500;
        color: #212529;
    }
    .suggestion-title {
        font-size: 36px;
        font-weight: bold;
        color: #0d6efd;
        margin-bottom: 20px;
    }
    .suggestion-details {
        font-size: 24px;
        margin-bottom: 20px;
    }
    .suggestion-details ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .suggestion-details li {
        margin-bottom: 10px;
        padding: 5px 0;
        border-bottom: 1px solid #eee;
    }
    .suggestion-link {
        font-size: 20px;
        margin-top: 15px;
    }
    .suggestion-link a {
        color: #0d6efd;
        text-decoration: none;
        font-weight: 500;
    }
    .suggestion-link a:hover {
        text-decoration: underline;
    }
    .copilot-controls {
        display: flex;
        justify-content: center;
        gap: 20px;
    }
    .control-button {
        padding: 10px 20px;
        background-color: #0d6efd;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
    }
    .control-button:hover {
        background-color: #0b5ed7;
    }
    .control-button:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
    }
    #pause-resume-btn {
        background-color: #ffc107;
        color: #212529;
    }
    #pause-resume-btn:hover {
        background-color: #e0a800;
    }
    #pause-resume-btn.paused {
        background-color: #28a745;
        color: white;
    }
    #pause-resume-btn.paused:hover {
        background-color: #218838;
    }

    .ai-listening-indicator {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        color: #0d6efd;
        font-weight: 500;
        font-size: 16px;
        background-color: #f8f9fa;
        padding: 0 10px;
    }
    .listening-icon {
        display: inline-block;
        width: 20px;
        height: 20px;
        margin-right: 8px;
        position: relative;
    }
    .listening-icon span {
        position: absolute;
        bottom: 0;
        width: 3px;
        background-color: #0d6efd;
        animation: sound-wave 1s infinite ease-in-out;
    }
    .listening-icon span:nth-child(1) {
        left: 0;
        height: 8px;
        animation-delay: 0s;
    }
    .listening-icon span:nth-child(2) {
        left: 5px;
        height: 16px;
        animation-delay: 0.2s;
    }
    .listening-icon span:nth-child(3) {
        left: 10px;
        height: 10px;
        animation-delay: 0.4s;
    }
    .listening-icon span:nth-child(4) {
        left: 15px;
        height: 14px;
        animation-delay: 0.6s;
    }
@keyframes sound-wave {
        0% {transform: scaleY(0.5);}
        50% {transform: scaleY(1);}
        100% {transform: scaleY(0.5);}
    }

.status-message {
        padding: 10px;
        margin-bottom: 15px;
        border-radius: 5px;
        text-align: center;
        display: none;
    }
    .status-error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    .status-info {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }
    .status-warning {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeeba;
    }

    .web-search-indicator {
        padding: 10px 15px;
        margin: 15px 0;
        border-radius: 5px;
        text-align: center;
        background-color: #e2e3e5;
        color: #383d41;
        border: 1px solid #d6d8db;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 1.5s infinite;
    }
    .web-search-indicator.hidden {
        display: none;
    }
    .web-search-icon {
        margin-right: 10px;
        font-size: 18px;
    }
    @keyframes pulse {
        0% {background-color: #e2e3e5;}
        50% {background-color: #d6d8db;}
        100% {background-color: #e2e3e5;}
    }

    .copilot-searching {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 1001;
        display: none;
    }
    .copilot-searching.active {
        display: block;
    }
    .search-spinner {
        display: inline-block;
        width: 40px;
        height: 40px;
        margin: 10px auto;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .loading-message {
        text-align: center;
        padding: 20px;
        color: #6c757d;
        font-style: italic;
    }
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        margin-right: 10px;
        border: 3px solid rgba(0, 123, 255, 0.3);
        border-radius: 50%;
        border-top-color: #007bff;
        animation: spin 1s ease-in-out infinite;
        vertical-align: middle;
    }

    .print-button {
        background-color: #28a745;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 10px;
    }
    .print-button:hover {
        background-color: #218838;
    }
    /* Stili per la navigazione a schede */
.copilot-tabs {
    display: flex;
    border-bottom: 2px solid #dee2e6;
    margin-bottom: 20px;
}
.copilot-tab-btn {
    padding: 12px 20px;
    cursor: pointer;
    background: none;
    border: none;
    font-size: 16px;
    font-weight: 500;
    color: #6c757d;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px; /* Allinea il bordo inferiore */
}
.copilot-tab-btn.active {
    color: #0d6efd;
    border-bottom-color: #0d6efd;
}

/* Gestione dei pannelli di contenuto */
.copilot-tab-content {
    display: none; /* Nasconde tutti i pannelli di default */
}
.copilot-tab-content.active {
    display: block; /* Mostra solo il pannello attivo */
}

/* Stile per le liste di domande/documenti */
.strategic-list {
    font-size: 22px;
    line-height: 1.6;
    padding: 15px;
    background-color: #fff;
    border-radius: 8px;
    min-height: 300px;
    color: #212529;
}
.strategic-list ul {
    list-style-type: none;
    padding-left: 0;
}
.strategic-list li {
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
}
.strategic-list li:last-child {
    border-bottom: none;
}
</style>

<div class="ai-copilot-container">
    <div id="status-message-area" class="status-message"></div>

    <div id="web-search-indicator" class="web-search-indicator hidden">
        <span class="web-search-icon">🔍</span>
        <span>Ricerca web in corso...</span>
    </div>

    <div class="start-meeting-button-container">
        <button id="start-meeting-btn">Avvia Meeting</button>
    </div>

    <div class="main-content-area">
        <div class="left-column">
            <h2>Summary</h2>
            <div class="dynamic-summary-content" id="dynamic-summary-scroll-area">
                <p><em>Avvia il meeting per visualizzare il riepilogo dinamico.</em></p>
            </div>
            <div class="scroll-buttons">
                <button class="scroll-up-btn" data-target="dynamic-summary-scroll-area">↑</button>
                <button class="scroll-down-btn" data-target="dynamic-summary-scroll-area">↓</button>
            </div>
            <a href="#" class="view-transcript-link" id="view-full-transcript-btn">View full transcript</a>
            <div class="full-transcript-content" style="display:none;">
            </div>
        </div>
        <div class="right-column">
            <h2>AI Suggestions</h2>
            <div class="ai-suggestions-content" id="ai-suggestions-scroll-area">
                <p><em>Avvia il meeting per visualizzare i suggerimenti AI.</em></p>
            </div>
            <div class="scroll-buttons">
                <button class="scroll-up-btn" data-target="ai-suggestions-scroll-area">↑</button>
                <button class="scroll-down-btn" data-target="ai-suggestions-scroll-area">↓</button>
            </div>
        </div>
    </div>

    <div class="ai-question-area">
        <div class="ai-question-controls">
            <button id="attach-file-btn">Allega File</button>
            <button id="send-ai-question-btn">Invia Domanda</button>
        </div>
        <textarea id="ai-question-input" placeholder="Non esitare a chiedere ulteriori dettagli o chiarimenti su qualsiasi aspetto, inclusi i suggerimenti forniti dall'AI. Siamo qui per aiutarti ad approfondire ogni punto."></textarea>
        <div id="ai-response-area"></div>
    </div>

    <div class="bottom-bar">
      <button id="summary-btn" class="view-btn">Summary</button>
    <button id="tasks-btn" class="view-btn">Tasks</button>
    <button id="planning-btn" class="view-btn">Note</button> <button id="co-pilota-live-btn">Co-Pilota Live</button>
    <button id="print-report-btn">Stampa Report</button>
    </div>

    <div id="tasks-view" class="view-container" style="display:none;">
        <h3>Tasks Generati</h3>
        <div id="tasks-content">
            <p><em>Clicca su "Tasks" per generare una lista di azioni da intraprendere.</em></p>
        </div>
    </div>

    <div id="summary-view" class="view-container" style="display:none;">
    <h3>Meeting Summary</h3>
    <div id="summary-content" style="white-space: pre-wrap;">
        <p><em>Clicca su "Summary" per generare un riepilogo della conversazione.</em></p>
    </div>
</div>

<div id="planning-view" class="view-container" style="display:none;">
    <h3>Note del Consulente</h3>

    <div class="planning-input-area">
        <textarea id="planning-note" placeholder="Scrivi una nota o un promemoria..."></textarea>
        <button id="add-planning-entry-btn">Aggiungi Nota</button>
    </div>

    <div id="planning-content" style="margin-top: 20px;">
        <p><em>Nessuna nota aggiunta.</em></p>
    </div>
</div>
<div id="print-view" class="view-container" style="display:none;">
        <h3>Report Stampabile</h3>
        <div id="print-content">
            <p><em>Il report verrà generato automaticamente durante il meeting.</em></p>
        </div>
        <button class="print-button" onclick="printReport()">Stampa</button>
    </div>
</div>

<div id="copilot-modal" class="copilot-modal">
    <div class="copilot-content">
        <div id="copilot-context-bar" style="display: none; background-color: #e9f5ff; padding: 8px 15px; border-radius: 6px; margin-bottom: 15px; font-size: 13px; color: #004085; border: 1px solid #b8daff;"></div>
        <div class="copilot-header">
            <h2>Co-Pilota Live</h2>
            <div class="ai-listening-indicator" id="listening-indicator" style="display: none;">
                <div class="listening-icon"><span></span><span></span><span></span><span></span></div>
                <span>In ascolto...</span>
            </div>
            <button class="close-button">&times;</button>
        </div>

        <div class="copilot-tabs">
            <button class="copilot-tab-btn active" data-tab="live-suggestions-view">Suggerimenti Live</button>
            <button class="copilot-tab-btn" data-tab="questions-view">Domande Chiave</button>
            <button class="copilot-tab-btn" data-tab="documents-view">Documenti</button>
        </div>

        <div class="copilot-body">
            <div id="live-suggestions-view" class="copilot-tab-content active">
                <div class="current-suggestion" id="copilot-text">
                    <p>Avvia il meeting per ricevere suggerimenti in tempo reale.</p>
                </div>
                <div class="copilot-controls">
                    <button class="control-button" id="prev-suggestion-btn" onclick="previousSuggestion()" disabled>Precedente</button>
                    <button class="control-button" id="next-suggestion-btn" onclick="nextSuggestion()" disabled>Successivo</button>
                    <button class="control-button" id="pause-resume-btn">Pausa Trascrizione</button> </div>
            </div>

            <div id="questions-view" class="copilot-tab-content">
                <div class="strategic-list" id="questions-list">
                    <p>Nessuna domanda generata.</p>
                </div>
            </div>

            <div id="documents-view" class="copilot-tab-content">
                <div class="strategic-list" id="documents-list">
                    <p>Nessun documento suggerito.</p>
                </div>
            </div>
        </div>

        <div class="copilot-searching" id="copilot-searching">
            <div class="search-spinner"></div>
            <p>Elaborazione in corso...</p>
        </div>
    </div>
</div>

<meta name="csrf-token" content="{{ csrf_token() }}">

@endsection


@section('script')
{{-- QUI METTIAMO GLI SCRIPT SPECIFICI PER QUESTA PAGINA --}}

<script>
    // Definiamo le costanti globali che servono allo script
    const AI_COPILOT_ROUTES = {
        findClient: '{{ route("vendor.meeting.findClient") }}',
        createClient: '{{ route("vendor.meeting.createClient") }}',
        storeMeeting: '{{ route("vendor.meeting.store") }}'
    };
    const CONSULTANT_TYPE = @json($consultantType ?? 'Consulente');
</script>

{{-- Carichiamo i nostri script compilati e versionati, e SOLO QUESTI --}}
<script src="{{ mix('js/app.js') }}"></script>
<script src="{{ mix('js/ai_copilot_logic.js') }}"></script>

@endsection