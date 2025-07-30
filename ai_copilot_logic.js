// Questo file conterrà tutta la logica JavaScript del Co-Pilota.
// La variabile CONSULTANT_TYPE verrà passata globalmente dal file Blade.

// Variabili globali per la registrazione audio e Speech-to-Text
let audioContext;
let mediaStreamSource;
let analyser;
let audioProcessor;
let recordingBuffer = [];
const SAMPLE_RATE = 16000; // Sample rate richiesto da Google Cloud Speech-to-Text
const BUFFER_SIZE = 4096; // Dimensione del buffer per i chunk audio
let isRecording = false; // Stato della registrazione
let ws; // WebSocket per un futuro sviluppo (non useremo WebSocket in questa iterazione ma lo prevediamo)

// Variabili globali per la sessione
let meetingActive = false;
let currentSessionId = null;
let conversationHistory = '';
let isPaused = false;

// Variabili per il report finale
let planningData = [];
let allWebResults = [];
let allActionableAdvice = [];

// Variabili per i suggerimenti live
let currentSuggestions = [];
let currentSuggestionIndex = 0;

// Configurazione CSRF per tutte le richieste AJAX
$.ajaxSetup({
    headers: {
        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    }
});

// Inizializzazione quando il documento è pronto
$(document).ready(function() {
    initializeEventListeners();
    initializeAudioRecording();
});

// Inizializza tutti gli event listeners dell'interfaccia
function initializeEventListeners() {
    $('#start-meeting-btn').click(() => meetingActive ? endMeeting() : startMeetingWorkflow());
    $('#summary-btn').click(() => { toggleView('summary'); generateSummary(); });
    $('#tasks-btn').click(() => { toggleView('tasks'); generateAndDisplayTasks(); });
    $('#planning-btn').click(() => { toggleView('planning'); renderPlanningView(); });
    $('#add-planning-entry-btn').click(addPlanningEntry);
    $('#print-report-btn').click(printReport);
    $('#co-pilota-live-btn').click(openCopilotModal);
    $('#send-ai-question-btn').click(sendAIQuestion);

    $('.copilot-tab-btn').click(function() {
        const tabId = $(this).data('tab');
        $('.copilot-tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.copilot-tab-content').removeClass('active');
        $('#' + tabId).addClass('active');
    });

    $('#view-full-transcript-btn').click(e => {
        e.preventDefault();
        $('.full-transcript-content').toggle();
    });

    // Eventi per i pulsanti del Co-Pilota Live
    $('#prev-suggestion-btn').click(previousSuggestion);
    $('#next-suggestion-btn').click(nextSuggestion);
    $('.close-button').click(closeCopilotModal);
    $('#pause-resume-btn').click(toggleRecordingPause);
}

// Inizializza la registrazione audio e l'invio a Google Cloud Speech-to-Text
async function initializeAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        audioProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

        audioProcessor.onaudioprocess = async (event) => {
            if (!isRecording || isPaused) return;

            const inputBuffer = event.inputBuffer.getChannelData(0);

            let pcm16 = new Int16Array(inputBuffer.length);
            for (let i = 0; i < inputBuffer.length; i++) {
                const s = Math.max(-1, Math.min(1, inputBuffer[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            try {
                const response = await $.ajax({
                    url: '/ai-copilot/stream-speech-to-text',
                    method: 'POST',
                    contentType: 'application/octet-stream',
                    processData: false,
                    data: pcm16.buffer,
                    xhrFields: {
                        withCredentials: false
                    }
                });

                if (response.transcript && response.transcript.trim() !== '') {
                    addToConversation('user', response.transcript);
                    processWithAI(response.transcript);
                }
            } catch (error) {
                console.error('Errore nell\'invio del chunk audio:', error);
            }
        };

        mediaStreamSource.connect(audioProcessor);
        audioProcessor.connect(audioContext.destination);

        isRecording = false;
        showStatusMessage('Riconoscimento vocale pronto. Clicca Avvia Meeting.', 'info');

    } catch (error) {
        console.error('Errore accesso microfono:', error);
        showStatusMessage('Impossibile accedere al microfono: ' + error.message, 'error');
    }
}

// ===== WORKFLOW DI AVVIO MEETING =====

// 1. Funzione principale che avvia il workflow
async function startMeetingWorkflow() {
    const { value: pIva } = await Swal.fire({
        title: 'Inizia Meeting in Presenza',
        input: 'text',
        inputLabel: 'Partita IVA o Codice Fiscale del Cliente',
        inputPlaceholder: 'Inserisci P.IVA o CF...',
        showCancelButton: true,
        confirmButtonText: 'Cerca Cliente',
        cancelButtonText: 'Annulla',
        inputValidator: (value) => !value ? 'Questo campo è obbligatorio!' : null
    });

    if (!pIva) return;

    try {
        const response = await $.ajax({
            url: AI_COPILOT_ROUTES.findClient, // CORRETTO
            method: 'POST',
            data: { codice_fiscale_partita_iva: pIva }
        });
        initiateMeetingSession(response.client);
    } catch (error) {
        if (error.status === 404) {
            const result = await Swal.fire({
                title: 'Cliente Non Trovato',
                text: "Vuoi aggiungere questo cliente ora?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sì, aggiungi ora!',
                cancelButtonText: 'Annulla'
            });
            if (result.isConfirmed) {
                const newClient = await showCreateClientForm(pIva);
                if (newClient) initiateMeetingSession(newClient);
            }
        } else {
            Swal.fire('Errore', 'Si è verificato un errore imprevisto.', 'error');
        }
    }
}

// 2. Mostra il form di creazione cliente se non trovato
async function showCreateClientForm(pIva) {
    const { value: formValues } = await Swal.fire({
        title: 'Aggiungi Nuovo Cliente',
        html: `
            <input id="swal-nome_azienda" class="swal2-input" placeholder="Nome azienda (obbligatorio)">
            <input id="swal-settore_attivita" class="swal2-input" placeholder="Settore di attività">
            <input id="swal-indirizzo" class="swal2-input" placeholder="Indirizzo">
            <input id="swal-email" class="swal2-input" type="email" placeholder="Email (opzionale)">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Salva Cliente',
        preConfirm: () => {
            const nome_azienda = $('#swal-nome_azienda').val();
            if (!nome_azienda) {
                Swal.showValidationMessage('Il nome dell\'azienda è obbligatorio');
                return false;
            }
            return {
                codice_fiscale_partita_iva: pIva,
                nome_azienda: nome_azienda,
                settore_attivita: $('#swal-settore_attivita').val(),
                indirizzo: $('#swal-indirizzo').val(),
                email: $('#swal-email').val(),
            }
        }
    });

    if (formValues) {
        try {
            const response = await $.ajax({
                url: AI_COPILOT_ROUTES.createClient, // CORRETTO
                method: 'POST',
                data: formValues
            });
            Swal.fire('Creato!', 'Il nuovo cliente è stato salvato.', 'success');
            return response.client;
        } catch (error) {
            Swal.fire('Errore', 'Impossibile salvare il cliente.', 'error');
            return null;
        }
    }
}

// 3. Registra il meeting e avvia la sessione AI
function initiateMeetingSession(clientData) {
    showStatusMessage('Avvio sessione in corso...', 'info');

    $.ajax({
        url: AI_COPILOT_ROUTES.storeMeeting, // CORRETTO
        method: 'POST',
        data: {
            id_cliente: clientData.id,
            tipo_meeting: 'in presenza',
            settore_cliente: clientData.settore_attivita
        }
    }).done(() => console.log('Meeting registrato.')).fail(() => console.error('Errore registrazione meeting.'));

    const clientInfoForAI = `Cliente: ${clientData.nome_azienda}, Settore: ${clientData.settore_attivita}.`;
    $.ajax({
        url: '/api/ai-copilot/start-session',
        method: 'POST',
        data: {
            consultantType: CONSULTANT_TYPE, // Questa variabile ora viene passata globalmente dalla Blade
            clientInfo: clientInfoForAI
        },
       success: function(response) {
            if (response.success) {
                meetingActive = true;
                currentSessionId = response.sessionId;

                $('#copilot-context-bar').html(`<i class="fas fa-info-circle"></i> <b>Contesto AI Attivo:</b> ${clientInfoForAI}`).show();

                $('#start-meeting-btn').text('Termina Meeting').addClass('meeting-active');
                isRecording = true;
                isPaused = false;
                $('#listening-indicator').show();
                openCopilotModal();
                showStatusMessage('Meeting avviato con successo!', 'success');
                resetUIAndData();
            } else {
                // Gestione errore
            }
        },
        error: function() {
            showStatusMessage('Errore di comunicazione per avviare la sessione.', 'error');
        }
    });
}

// ===============================================

// Termina il meeting inviando tutti i dati raccolti
function endMeeting() {
    if (!meetingActive || !currentSessionId) return;
    showStatusMessage('Salvataggio report in corso...', 'info');

    isRecording = false;
    $('#listening-indicator').hide();

    $.ajax({
        url: '/api/ai-copilot/end-session',
        method: 'POST',
        data: {
            sessionId: currentSessionId,
            conversationHistory: conversationHistory,
            webResults: JSON.stringify(allWebResults),
            planningData: JSON.stringify(planningData),
            actionableAdvice: JSON.stringify(allActionableAdvice)
        },
        success: function(response) {
            finalizeMeetingEnd(true);
        },
        error: function() {
            finalizeMeetingEnd(false);
        }
    });
}

// Finalizza la chiusura del meeting e aggiorna la UI
function finalizeMeetingEnd(success) {
    meetingActive = false;
    currentSessionId = null;

    $('#start-meeting-btn').text('Avvia Meeting').removeClass('meeting-active');
    closeCopilotModal();

    if (success) {
        showStatusMessage('Meeting terminato. Report salvato con successo.', 'success');
    } else {
        showStatusMessage('Errore nel salvataggio del report. Il meeting è stato comunque terminato.', 'error');
    }
}


// Processa l'input vocale e chiama l'AI per ottenere insights
function processWithAI(transcript) {
    conversationHistory += transcript + ' ';
    $('.full-transcript-content').text(conversationHistory);
    $('#web-search-indicator').removeClass('hidden');
    $('#copilot-searching').addClass('active');

    $.ajax({
        url: '/api/ai-copilot/get-insights',
        method: 'POST',
        data: {
            sessionId: currentSessionId,
            consultantType: CONSULTANT_TYPE,
            conversationHistory: conversationHistory,
            latestUtterance: transcript
        },
        // Success e Error handlers per processWithAI
        success: function(response) {
            $('#web-search-indicator').addClass('hidden');
            $('#copilot-searching').removeClass('active');
            if (response.extractedData && response.extractedData.length > 0) {
                allWebResults = allWebResults.concat(response.extractedData); // Accumula i risultati web
                updateAISuggestions(response.extractedData);
                currentSuggestions = response.extractedData;
                currentSuggestionIndex = 0;
                updateCopilotDisplay();
            } else {
                $('#ai-suggestions-scroll-area').append('<div class="ai-suggestion">Nessun suggerimento AI pertinente trovato per questa frase.</div>');
            }
            if (response.actionableAdvice) {
                allActionableAdvice = response.actionableAdvice;
                $('#questions-list').html(formatStrategicList(response.actionableAdvice.questionsForClient, 'Domande chiave:'));
                $('#documents-list').html(formatStrategicList(response.actionableAdvice.requiredDocuments, 'Documenti Richiesti:'));
            }
        },
        error: function(xhr, status, error) {
            $('#web-search-indicator').addClass('hidden');
            $('#copilot-searching').removeClass('active');
            console.error('Errore nella richiesta get-insights:', xhr.responseText);
            // Non mostrare messaggi di errore troppo frequenti all'utente per non intasare l'interfaccia
        }
    });
}

// Formatta una lista strategica per la UI
function formatStrategicList(items, title) {
    if (!items || items.length === 0) {
        return `<p>Nessun ${title.toLowerCase().replace(':', '')} generato.</p>`;
    }
    let html = `<h3>${title}</h3><ul>`;
    items.forEach(item => {
        html += `<li>${item}</li>`;
    });
    html += `</ul>`;
    return html;
}

// ===== Funzioni per la gestione della UI e delle Viste (Summary, Tasks, etc.) =====

function updateAISuggestions(suggestions) {
    let html = '';
    suggestions.forEach(suggestion => {
        html += `<div class="ai-suggestion"><strong>${suggestion.title}</strong>`;
        if (suggestion.summary) {
            html += `<p>${suggestion.summary}</p>`;
        }
        if (suggestion.details && Object.keys(suggestion.details).length > 0) {
            html += `<ul>`;
            for (const [key, value] of Object.entries(suggestion.details)) {
                 html += `<li><b>${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</b> ${value}</li>`;
            }
            html += `</ul>`;
        }
        if (suggestion.directLink && suggestion.directLink !== '#') {
            html += `<div class="web-result-link-info"><a href="${suggestion.directLink}" target="_blank">Approfondisci Fonte</a></div>`;
        }
        html += `</div>`;
    });
    $('#ai-suggestions-scroll-area').append(html);
}

function updateCopilotDisplay() {
    if (currentSuggestions.length === 0) {
        $('#copilot-text').html(`<div class="suggestion-title">In attesa di suggerimenti...</div>`);
        return;
    }
    const suggestion = currentSuggestions[currentSuggestionIndex];
    let html = `<div class="suggestion-title">${suggestion.title}</div>`;
    if (suggestion.summary) {
        html += `<div class="suggestion-details">${suggestion.summary}</div>`;
    }
    if (suggestion.details && Object.keys(suggestion.details).length > 0) {
        html += `<div class="suggestion-details"><ul>`;
        for (const [key, value] of Object.entries(suggestion.details)) {
             html += `<li><b>${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</b> ${value}</li>`;
        }
        html += `</ul></div>`;
    }
    if (suggestion.directLink && suggestion.directLink !== '#') {
        html += `<div class="suggestion-link"><a href="${suggestion.directLink}" target="_blank">Vai alla fonte</a></div>`;
    }
    $('#copilot-text').html(html);
    $('#prev-suggestion-btn').prop('disabled', currentSuggestionIndex === 0);
    $('#next-suggestion-btn').prop('disabled', currentSuggestionIndex >= currentSuggestions.length - 1);
}

function previousSuggestion() {
    if (currentSuggestionIndex > 0) {
        currentSuggestionIndex--;
        updateCopilotDisplay();
    }
}

function nextSuggestion() {
    if (currentSuggestionIndex < currentSuggestions.length - 1) {
        currentSuggestionIndex++;
        updateCopilotDisplay();
    }
}

function generateSummary() {
    if (!conversationHistory) return $('#summary-content').html('<p><em>Nessuna conversazione da riepilogare.</em></p>');
    $('#summary-content').html('<div class="loading-message"><span class="loading-spinner"></span>Generazione riepilogo in corso...</div>');
    $.post('/api/ai-copilot/get-summary', { sessionId: currentSessionId, conversationHistory: conversationHistory }, function(response) {
        if (response.meetingSummary) {
            const s = response.meetingSummary;
            let html = '';
            if (s.obiettivi) html += `<strong>Obiettivi:</strong><br>${s.obiettivi}<br><br>`;
            if (s.problemi) html += `<strong>Problemi:</strong><br>${s.problemi}<br><br>`;
            if (s.decisioni) html += `<strong>Decisioni:</strong><br>${s.decisioni}`;
            $('#summary-content').html(html || '<p><em>Riepilogo non disponibile.</em></p>');
        } else {
             $('#summary-content').html('<p><em>Riepilogo non disponibile.</em></p>');
        }
    }).fail(function(xhr, status, error) {
        console.error("Errore generazione summary:", xhr.responseText);
        $('#summary-content').html('<p><em>Errore nella generazione del riepilogo.</em></p>');
    });
}

function generateAndDisplayTasks() {
    if (!conversationHistory) return $('#tasks-content').html('<p><em>Nessuna conversazione per generare tasks.</em></p>');
    $('#tasks-content').html('<div class="loading-message"><span class="loading-spinner"></span>Generazione tasks in corso...</div>');
    $.post('/api/ai-copilot/generate-tasks', { sessionId: currentSessionId, conversationHistory: conversationHistory }, function(response) {
        if (response.tasks && response.tasks.length > 0) {
            let html = '<ol>';
            response.tasks.forEach(task => { html += `<li><strong>${task.title}:</strong> ${task.description}</li>`; });
            html += '</ol>';
            $('#tasks-content').html(html);
        } else {
             $('#tasks-content').html('<p><em>Nessun task generato.</em></p>');
        }
    }).fail(function(xhr, status, error) {
        console.error("Errore generazione tasks:", xhr.responseText);
        $('#tasks-content').html('<p><em>Errore nella generazione dei tasks.</em></p>');
    });
}

function sendAIQuestion() {
    const question = $('#ai-question-input').val().trim();
    if (!question) return;
    $('#ai-response-area').html('<div class="loading-message"><span class="loading-spinner"></span>Elaborazione domanda...</div>').show();
    $.post('/api/ai-copilot/ask-question', { question, context: conversationHistory }, function(response) {
        $('#ai-response-area').html(response.answer.replace(/\n/g, '<br>'));
        $('#ai-question-input').val('');
    }).fail(function(xhr, status, error) {
        console.error("Errore invio domanda AI:", xhr.responseText);
        $('#ai-response-area').html('<div class="loading-message status-error">Errore nell\'elaborazione della domanda.</div>');
    });
}

function addPlanningEntry() {
    const note = $('#planning-note').val().trim();
    if (!note) return;
    planningData.push(note);
    $('#planning-note').val('');
    renderPlanningView();
}

function renderPlanningView() {
    if (planningData.length === 0) return $('#planning-content').html('<p><em>Nessuna nota aggiunta.</em></p>');
    let html = planningData.map(note => `<div class="planning-entry"><div>${note}</div></div>`).join('');
    $('#planning-content').html(html);
}

function toggleView(viewType) {
    $('.view-container').hide();
    $('.view-btn').removeClass('active-view');
    $('#' + viewType + '-view').show();
    $('#' + viewType + '-btn').addClass('active-view');
}

function resetUIAndData() {
    // Resetta le variabili globali
    conversationHistory = '';
    planningData = [];
    allWebResults = [];
    allActionableAdvice = [];
    currentSuggestions = [];
    currentSuggestionIndex = 0;

    // Resetta la UI
    $('.full-transcript-content').text('');
    $('#dynamic-summary-scroll-area').html('<p><em>Il meeting è iniziato. Parla per generare un riepilogo.</em></p>');
    $('#ai-suggestions-scroll-area').html('<p><em>In attesa di suggerimenti dall\'AI...</em></p>');
    $('#ai-response-area').empty().hide();
    $('#ai-question-input').val('');
    $('#tasks-content').html('<p><em>I tasks verranno generati alla fine del meeting o su richiesta.</em></p>');
    $('#summary-content').html('<p><em>Il riepilogo verrà generato alla fine del meeting o su richiesta.</em></p>');
    renderPlanningView();
    $('#questions-list').html('<p>Nessuna domanda generata.</p>');
    $('#documents-list').html('<p>Nessun documento suggerito.</p>');
    updateCopilotDisplay();
}

function openCopilotModal() { $('#copilot-modal').show(); }
function closeCopilotModal() { $('#copilot-modal').hide(); }
function showStatusMessage(message, type = 'info') {
    const $statusArea = $('#status-message-area');
    $statusArea.removeClass('status-error status-info status-warning status-success').addClass('status-' + type);
    $statusArea.text(message).show();
    setTimeout(() => $statusArea.fadeOut(), 5000);
}

// Funzione di stampa (semplificata, da adattare se necessario)
function printReport() {
    const printContent = `
        <h1>Report Meeting</h1>
        <h2>Riepilogo</h2>
        <div>${$('#summary-content').html()}</div>
        <h2>Tasks</h2>
        <div>${$('#tasks-content').html()}</div>
        <h2>Note Consulente</h2>
        <div>${$('#planning-content').html()}</div>
        <h2>Trascrizione</h2>
        <pre>${conversationHistory}</pre>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Stampa Report</title></head><body>' + printContent + '</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// Funzione per mettere in pausa/riprendere la trascrizione
function toggleRecordingPause() {
    isPaused = !isPaused;
    const btn = $('#pause-resume-btn');
    if (isPaused) {
        btn.text('Riprendi Trascrizione').addClass('paused');
        $('#listening-indicator').hide();
        showStatusMessage('Trascrizione in pausa.', 'info');
    } else {
        btn.text('Pausa Trascrizione').removeClass('paused');
        $('#listening-indicator').show();
        showStatusMessage('Trascrizione ripresa.', 'info');
    }
}