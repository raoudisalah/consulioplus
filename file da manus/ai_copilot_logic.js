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