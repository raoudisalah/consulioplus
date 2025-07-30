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