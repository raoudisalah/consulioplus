     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeMeetingRecord(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_cliente' => 'required|exists:users,id',
            'tipo_meeting' => 'required|string|max:100',
            'settore_cliente' => 'nullable|string|max:255',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // Otteniamo l'ID del consulente attualmente autenticato
        $idConsulente = Auth::guard('vendor')->id();

        if (!$idConsulente) {
            return response()->json(['message' => 'Consulente non autenticato'], 401);
        }

        $meeting = new Meeting();
        $meeting->id_cliente = $request->input('id_cliente');
        $meeting->id_consulente = $idConsulente;
        $meeting->tipo_meeting = $request->input('tipo_meeting');
        $meeting->settore_cliente = $request->input('settore_cliente');
        $meeting->save();

        return response()->json(['success' => true, 'message' => 'Meeting registrato con successo']);
    }
    private function performWebSearch($query, $clientContext = '')

    {
        try {
            $apiKey = env('GOOGLE_SEARCH_API_KEY');
            $engineId = env('GOOGLE_SEARCH_ENGINE_ID');

            if (!$apiKey || !$engineId) {
                Log::warning('Chiavi API Google Search non configurate');
                return [];
            }

            // Ottimizza la query per la ricerca
          $optimizedQuery = $this->optimizeSearchQuery($query, $clientContext);
          Log::info('>>> TENTATIVO DI CHIAMATA A GOOGLE SEARCH API', ['query_inviata' => $optimizedQuery]);
            
            // Cache della ricerca per evitare chiamate duplicate
            $cacheKey = 'web_search_' . md5($optimizedQuery);
            $cachedResults = Cache::get($cacheKey);
            
            if ($cachedResults) {
                return $cachedResults;
            }

            $response = Http::timeout(15)->get('https://www.googleapis.com/customsearch/v1', [
                'key' => $apiKey,
                'cx' => $engineId,
                'q' => $optimizedQuery,
                'num' => 10, // Aumentato a 10 risultati per maggiore qualità
                'safe' => 'active',
                'lr' => 'lang_it', // Priorità per risultati in italiano
                'gl' => 'it' // Geolocalizzazione Italia
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $results = [];

                if (isset($data['items'])) {
                    foreach ($data['items'] as $item) {
                        $results[] = [
                            'title' => $item['title'] ?? '',
                            'snippet' => $item['snippet'] ?? '',
                            'link' => $item['link'] ?? '',
                            'displayLink' => $item['displayLink'] ?? ''
                        ];
                    }
                }

                // Cache i risultati per 2 ore
                Cache::put($cacheKey, $results, 7200);
                
                Log::info('Ricerca web completata', [
                    'query' => $optimizedQuery,
                    'results_count' => count($results)
                ]);
                
                return $results;
            } else {
                Log::error('Errore nella ricerca web: ' . $response->body());
                return [];
            }

        } catch (\Exception $e) {
            Log::error('Errore nella ricerca web: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Ottimizza la query di ricerca per migliorare i risultati
     * 
     * @param string $query
     * @return string
     */
    /**
     * Ottimizza la query di ricerca per migliorare i risultati, rendendola specifica per bandi e finanziamenti.
     * * @param string $query
     * @return string
     */
    // SOSTITUISCI IL TUO METODO optimizeSearchQuery CON QUESTO

private function optimizeSearchQuery($query, $clientContext = '')
{
    $contextKeywords = '';
    
    // Metodo più sicuro per estrarre il settore dal contesto.
    // Cerca la parola "Settore:" e prende il testo che la segue.
    if (!empty($clientContext) && strpos($clientContext, 'Settore:') !== false) {
        $sectorString = substr($clientContext, strpos($clientContext, 'Settore:') + 8);
        // Pulisce il risultato da eventuali punti finali o spazi extra.
        $contextKeywords = trim(str_replace('.', '', $sectorString));
    }

    $stopWords = ['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 'come', 'del', 'della', 'buongiorno', 'dottore', 'volevo', 'sapere', 'avere', 'ho'];
    $words = explode(' ', strtolower($query));
    $filteredWords = array_filter($words, function($word) use ($stopWords) {
        $trimmedWord = trim($word, " \t\n\r\0\x0B,.");
        return !in_array($trimmedWord, $stopWords) && strlen($trimmedWord) > 2;
    });

    // Unisce le parole chiave del settore (se trovate) con quelle della frase pronunciata
    $significantTerms = trim($contextKeywords . ' ' . implode(' ', array_unique($filteredWords)));
    
    // Aggiungiamo un controllo di sicurezza: se per qualche motivo i termini sono vuoti, usiamo una ricerca di default.
    if (empty($significantTerms)) {
        $significantTerms = "bandi e finanziamenti PMI"; // Query di fallback per evitare ricerche vuote
    }

    $searchQuery = $significantTerms . ' bando OR finanziamento OR agevolazioni';

    Log::info('Query di ricerca ottimizzata:', ['original' => $query, 'context_found' => $contextKeywords, 'optimized' => $searchQuery]);

    return $searchQuery;
}
/**
     * Costruisce il Mega-Prompt ottimizzato per l'API Gemini
     * * @param string $consultantType
     * @param string $conversationHistory
     * @param string $latestUtterance
     * @param array $webResults
     * @return string
     */
private function buildOptimizedMegaPrompt($consultantType, $conversationHistory, $latestUtterance, $webResults)
{
    $webResultsText = "Nessun risultato web pertinente trovato.";
    if (!empty($webResults)) {
        $webResultsText = "### RISULTATI RICERCA WEB IN TEMPO REALE ###\n";
        foreach ($webResults as $index => $result) {
            $webResultsText .= "--- Risultato " . ($index + 1) . " ---\nTitolo: {$result['title']}\nEstratto: {$result['snippet']}\nURL: {$result['link']}\n\n";
        }
    }

    // ========= PROMPT CORRETTO =========
    return "### SISTEMA AI - CO-PILOTA PROFESSIONALE ADATTIVO ###
    # MISSIONE: Sei un assistente AI di élite per consulenti esperti. Il tuo compito è analizzare i risultati web forniti e estrarre le entità di informazione più importanti.
        # REGOLA FONDAMENTALE: DEVI dare la massima priorità al contesto del cliente (settore, nome) quando analizzi i risultati. I suggerimenti devono essere specifici per il settore del cliente.

    # CONTESTO GENERALE:
    # Il consulente è un/una `{$consultantType}`.
    # Il contesto del cliente e la conversazione fino ad ora sono:
    # ---
    # {$conversationHistory}
    # ---

    # ULTIMA FRASE DETTA DAL CLIENTE: \"{$latestUtterance}\"

    # DATI DI INPUT DALLA RICERCA WEB:
    {$webResultsText}

    # SCHEMA OUTPUT JSON RIGOROSO: La tua risposta DEVE essere un oggetto JSON con una chiave `extractedData`, che contiene un array di oggetti. Per ogni oggetto, popola i seguenti campi:
    {
      \"extractedData\": [
        {
          \"type\": \"[Identifica il tipo di dato, es: 'Bando Pubblico', 'Articolo Scientifico']\",
          \"title\": \"[Titolo del dato]\",
          \"summary\": \"[Sintesi di 1-2 frasi]\",
          \"source\": \"[Fonte o Ente Erogatore]\",
          \"details\": {
            \"info_chiave_1\": \"Valore 1\",
            \"info_chiave_2\": \"Valore 2\"
          },
          \"directLink\": \"[Link diretto alla risorsa]\"
        }
      ]
    }
    # ISTRUZIONI PER IL CAMPO 'details': Sii intelligente. Inserisci le informazioni più pertinenti. Per un bando, le chiavi potrebbero essere 'scadenza' e 'destinatari'. Adatta dinamicamente le chiavi.
    # REGOLE: Rispondi SOLO con il JSON. Sii fedele alla fonte.";
}

    /**
     * Chiama l'API Gemini per ottenere la risposta AI
     * 
     * @param string $prompt
     * @return array|null
     */
    /**
     * Chiama l'AI per ottenere una risposta JSON.
     * Questo metodo ora usa il callAiModel generico, specificando Gemini come default per risposte JSON strutturate.
     *
     * @param string $prompt
     * @return array|null
     */
    private function callGeminiAPI($prompt)
    {
        try {
            // Utilizziamo il nuovo metodo generico. Per i JSON, Gemini è spesso il più affidabile
            // nel seguire le istruzioni di output JSON.
            $jsonString = $this->callAiModel($prompt, 'gemini', 0.7, 8192);
            
            $decodedResponse = json_decode($jsonString, true);
            
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decodedResponse;
            } else {
                Log::error('Errore nel parsing JSON dalla risposta AI: ' . json_last_error_msg() . ' Raw: ' . $jsonString);
                return null;
            }
        } catch (\Exception $e) {
            Log::error('Errore nella chiamata API per JSON: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Costruisce il prompt per la generazione di tasks
     * 
     * @param string $conversationHistory
     * @return string
     */
    private function buildTasksPrompt($conversationHistory)
    {
        return "Analizza la seguente cronologia di conversazione e genera una lista di tasks actionable:

CRONOLOGIA:
{$conversationHistory}

Genera una risposta JSON con questa struttura:
{
    \"tasks\": [
        {
            \"title\": \"Titolo del task\",
            \"description\": \"Descrizione dettagliata\",
            \"priority\": \"alta|media|bassa\",
            \"deadline\": \"Scadenza suggerita\",
            \"assignee\": \"Chi dovrebbe occuparsene\"
        }
    ]
}";
    }

    /**
     * Genera tasks di base come fallback
     * 
     * @param string $conversationHistory
     * @return array
     */
    private function generateBasicTasks($conversationHistory)
    {
        return [
            [
                'title' => 'Follow-up Meeting',
                'description' => 'Programmare un incontro di follow-up per discutere i punti emersi',
                'priority' => 'media',
                'deadline' => 'Entro 1 settimana',
                'assignee' => 'Consulente'
            ],
            [
                'title' => 'Documentazione',
                'description' => 'Preparare la documentazione relativa agli argomenti discussi',
                'priority' => 'alta',
                'deadline' => 'Entro 3 giorni',
                'assignee' => 'Team'
            ]
        ];
    }

    /**
     * Ottiene le informazioni del sito web
     * 
     * @return object
     */
   private function getWebsiteInfo()
{
    // Implementazione di base - adatta secondo la tua struttura
    return (object) [
        'website_title' => 'Co-Pilota Pro',
        'logo' => 'logo.png',
        'favicon' => 'favicon.png' // <-- AGGIUNGA QUESTA RIGA
    ];
}

/**
 * Esegue una seconda chiamata all'AI per ottenere consigli strategici sui dati trovati.
 */
private function getStrategicAdvice($consultantType, $foundData)
{
    if (empty($foundData)) {
        return null;
    }

    $dataAsText = json_encode($foundData, JSON_PRETTY_PRINT);

    $prompt = "Sei un consulente strategico esperto di tipo `{$consultantType}`. Un ricercatore ti ha fornito le seguenti informazioni in formato JSON:
    
    DATI TROVATI:
    {$dataAsText}

    ISTRUZIONI:
    Basandoti su questi dati, genera un oggetto JSON con una chiave `actionableAdvice` che contenga:
    1. `questionsForClient`: Una lista di 3 domande chiave che un `{$consultantType}` dovrebbe fare al suo cliente in base a queste informazioni.
    2. `requiredDocuments`: Una lista di 3 documenti o dati essenziali che il cliente dovrebbe fornire.
    3. `nextSteps`: Una lista di 2-3 passi operativi suggeriti al consulente.
    
    SCHEMA JSON DI OUTPUT OBBLIGATORIO:
    {
        \"actionableAdvice\": {
            \"questionsForClient\": [\"Domanda 1...\", \"Domanda 2...\"],
            \"requiredDocuments\": [\"Documento 1...\", \"Documento 2...\"],
            \"nextSteps\": [\"Azione 1...\", \"Azione 2...\"]
        }
    }
    
    Rispondi solo con il JSON.";

    return $this->callGeminiAPI($prompt);
}
public function askQuestion(Request $request)
{
    $validated = $request->validate([
        'question' => 'required|string|max:2000',
        'context' => 'nullable|string'
    ]);

    $question = $validated['question'];
    $context = $validated['context'] ?? 'Nessun contesto fornito.';

    $prompt = "Sei un assistente AI Co-Pilota per consulenti professionisti.

    CONTESTO DELLA CONVERSAZIONE ATTUALE:
    ---
    {$context}
    ---

    DOMANDA DELL'UTENTE:
    ---
    {$question}
    ---

    ISTRUZIONI:
    1.  Analizza la domanda dell'utente alla luce del contesto fornito.
    2.  Se la domanda si riferisce a elementi nel contesto (es. 'dammi più dettagli sul primo bando'), fornisci una risposta dettagliata basata su quel contesto.
    3.  Se la domanda è generica e non legata al contesto (es. 'qual è la capitale del Marocco?'), rispondi direttamente alla domanda.
    4.  Fornisci una risposta chiara, professionale e concisa.";

    // Utilizziamo il nuovo metodo generico. Per le domande, useremo DeepSeek come AI generica.
    $answer = $this->callAiModel($prompt, 'deepseek', 0.7, 1024); // Puoi scegliere 'gemini', 'deepseek', o 'openai'

    Log::info('RISPOSTA FINALE INVIATA AL BROWSER:', ['answer' => $answer]);

    return response()->json(['answer' => $answer]);
}

    private function callAiModel(string $prompt, string $modelType = 'gemini', float $temperature = 0.7, int $maxOutputTokens = 8192): string
    {
        try {
            $apiKey = '';
            $apiUrl = '';
            $modelName = '';
            $headers = ['Content-Type' => 'application/json'];

            switch ($modelType) {
                case 'gemini':
                    $apiKey = env('GEMINI_API_KEY');
                    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={$apiKey}";
                    $modelName = 'gemini-1.5-flash-latest';
                    break;
                case 'deepseek':
                    $apiKey = env('DEEPSEEK_API_KEY');
                    $apiUrl = 'https://api.deepseek.com/v1/chat/completions';
                    $modelName = 'deepseek-chat';
                    $headers['Authorization'] = 'Bearer ' . $apiKey;
                    break;
                case 'openai':
                    $apiKey = env('OPENAI_API_KEY');
                    $apiUrl = 'https://api.openai.com/v1/chat/completions';
                    $modelName = 'gpt-4'; // Puoi scegliere il modello OpenAI che preferisci
                    $headers['Authorization'] = 'Bearer ' . $apiKey;
                    break;
                default:
                    Log::error("Tipo di modello AI non valido: {$modelType}");
                    return 'Spiacente, tipo di modello AI non supportato.';
            }

            if (empty($apiKey)) {
                Log::warning("Chiave API {$modelType} non configurata.");
                return 'Spiacente, la chiave API non è configurata.';
            }

            $requestBody = [
                'model' => $modelName,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $temperature,
                'max_tokens' => $maxOutputTokens, // OpenAI e DeepSeek usano 'max_tokens'
            ];

            // Gemini usa 'maxOutputTokens' nella generationConfig, non 'max_tokens' nel corpo principale
            if ($modelType === 'gemini') {
                $requestBody = [
                    'contents' => [
        
(Content truncated due to size limit. Use line ranges to read in chunks)