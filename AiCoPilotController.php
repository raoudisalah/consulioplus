<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\Vendor;
use App\Models\User;
use App\Models\Meeting;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\MeetingReport;
use Google\Cloud\Speech\V1\SpeechClient;
use Google\Cloud\Speech\V1\RecognitionConfig;
use Google\Cloud\Speech\V1\RecognitionConfig\AudioEncoding;
use Google\Cloud\Speech\V1\RecognitionAudio;

/**
 * AiCoPilotController - Controller dedicato per il sistema AI "Co-Pilota Pro"
 * 
 * Questo controller gestisce tutte le funzionalità del modulo AI Co-Pilota
 * in modo completamente isolato dall'AISupportController esistente.
 */
class AiCoPilotController extends Controller
{
    /**
     * Visualizza la pagina principale del Co-Pilota AI
     * 
     * @return \Illuminate\View\View
     */
    public function showPage()
    {
        
        try {
            // Verifica autenticazione utilizzando la sessione vendor
            if (!session()->has('vendor_id') && !auth()->guard('vendor')->check()) {
                return redirect()->route('admin.login')->with('error', 'Accesso richiesto per utilizzare il Co-Pilota AI');
            }

            // Ottieni il vendor dalla sessione o dall'auth guard
            $vendor = auth()->guard('vendor')->user() ?? Vendor::find(session('vendor_id'));
            
            if (!$vendor) {
                return redirect()->route('admin.login')->with('error', 'Vendor non trovato');
            }
            
            // Dati per la vista
            $data = [
                'vendor' => $vendor,
                'pageTitle' => 'AI Co-Pilota Pro',
                'websiteInfo' => $this->getWebsiteInfo(),
                'consultantType' => $vendor->specialization ?? 'Consulente' // Aggiungiamo questo
            ];

            return view('vendors.ai-support', $data);
            
        } catch (\Exception $e) {
            Log::error('Errore nel caricamento della pagina Co-Pilota AI: ' . $e->getMessage());
            return back()->with('error', 'Errore nel caricamento del Co-Pilota AI');
        }
    }

/**
     * Elabora le richieste AI e restituisce insights strutturati
     * * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
     private function getFullContext(string $sessionId, string $conversationHistory): string
{
    $sessionData = Cache::get("ai_copilot_session_{$sessionId}");
    $clientContext = $sessionData['client_info'] ?? '';
    // Unisce il contesto del cliente con la conversazione trascritta
    return $clientContext . "\n\nSTORICO CONVERSAZIONE:\n" . $conversationHistory;
}


public function streamSpeechToText(Request $request)
{
    try {
        // QUESTE DUE RIGHE DEVONO ESSERE QUI ALL'INIZIO DEL BLOCCO try
        $credentialsPath = env('GOOGLE_APPLICATION_CREDENTIALS');
        if (!file_exists($credentialsPath)) {
            \Log::error('File di credenziali Google Cloud non trovato: ' . $credentialsPath);
            return response()->json([
                'error' => 'File di credenziali Google Cloud non trovato'
            ], 500);
        }

        $audioData = $request->getContent();
        
        if (empty($audioData)) {
            \Log::warning('Nessun dato audio ricevuto nella richiesta');
            return response()->json([
                'error' => 'Nessun dato audio ricevuto'
            ], 400);
        }

        // Log RAW audio data for first 10 chunks (Mantieni questo blocco per debug)
        // Usiamo una variabile di sessione/cache per loggare solo i primi 5-10 chunk
        if (!Cache::has('logged_audio_chunk_count')) {
            Cache::put('logged_audio_chunk_count', 0, 60); // Logga per 60 secondi
        }
        $logCount = Cache::increment('logged_audio_chunk_count');

        if ($logCount <= 10) { // Logga solo i primi 10 chunk per non inondare i log
            \Log::info('Dati audio RAW ricevuti (chunk ' . $logCount . ')', [
                'length' => strlen($audioData),
                'hex_dump' => bin2hex(substr($audioData, 0, 100)), // Logga i primi 100 byte in esadecimale
                'mime_type_header' => $request->header('Content-Type') // Verifica l'header Content-Type
            ]);
        }

        $speechClient = new SpeechClient([
            'credentials' => $credentialsPath,
            'projectId' => env('GOOGLE_CLOUD_PROJECT_ID')
        ]);

        $recognitionConfig = new RecognitionConfig();
        $recognitionConfig->setEncoding(RecognitionConfig\AudioEncoding::LINEAR16);
        $recognitionConfig->setSampleRateHertz(16000);
        $recognitionConfig->setLanguageCode('it-IT');

        $audio = new RecognitionAudio();
        $audio->setContent($audioData);

        // Effettua la richiesta di trascrizione
        $response = $speechClient->recognize($recognitionConfig, $audio);
        
        $transcript = '';
        $results = $response->getResults(); // Ottieni i risultati

        // ** NUOVO LOGGING: Verifica cosa restituisce Google **
        if (empty($results)) {
            \Log::info('Google Speech-to-Text: Nessun risultato di trascrizione ottenuto.', [
                'audio_chunk_length' => strlen($audioData),
                'message' => 'L\'API di Google non ha riconosciuto alcuna voce o l\'audio era silenzioso/non chiaro.'
            ]);
        } else {
            foreach ($results as $result) {
                if ($result->getAlternatives()) {
                    $alternative = $result->getAlternatives()[0];
                    $currentTranscript = $alternative->getTranscript();
                    $transcript .= $currentTranscript;
                    // Logga la trascrizione parziale e la confidenza
                    \Log::info('Google Speech-to-Text: Trascrizione parziale riconosciuta', [
                        'transcript' => $currentTranscript,
                        'confidence' => $alternative->getConfidence() ?? 'N/A'
                    ]);
                } else {
                    \Log::info('Google Speech-to-Text: Risultato senza alternative di trascrizione.', [
                        'audio_chunk_length' => strlen($audioData)
                    ]);
                }
            }
        }

        // Chiudi il client
        $speechClient->close();

        // Log finale, sia che la trascrizione sia vuota o meno
        if (!empty($transcript)) {
            \Log::info('Trascrizione Speech-to-Text completata con successo', [
                'transcript_length' => strlen($transcript),
                'transcript_preview' => substr($transcript, 0, 100)
            ]);
        } else {
             \Log::info('Trascrizione finale vuota per questo chunk.', ['audio_length' => strlen($audioData)]);
        }

        return response()->json([
            'success' => true,
            'transcript' => $transcript
        ]);

    } catch (\Exception $e) {
        \Log::error('Errore Speech-to-Text (eccezione): ' . $e->getMessage(), [
            'exception' => $e
        ]);
        return response()->json([
            'error' => 'Errore nella trascrizione audio: ' . $e->getMessage()
        ], 500);
    }
}
 public function getInsights(Request $request)
{
    Log::info('--- getInsights INVOCATO ---', ['sessionId' => $request->input('sessionId')]);
    try {
        $validated = $request->validate([
            'sessionId' => 'required|string', // <-- AGGIUNTO
            'consultantType' => 'required|string|max:100',
            'conversationHistory' => 'nullable|string|max:10000',
            'latestUtterance' => 'required|string|max:1000',
        ]);

        // ========= INIZIO MODIFICHE =========
        // Recuperiamo il contesto del cliente dalla cache usando l'ID della sessione
        $sessionData = Cache::get("ai_copilot_session_{$validated['sessionId']}");
        Log::info('Dati di sessione recuperati dalla cache:', $sessionData ?? ['CACHE VUOTA O SCADUTA']); 
        $clientContext = $sessionData['client_info'] ?? '';

        // Creiamo il contesto completo unendo le info del cliente e la conversazione
        $fullContext = $clientContext . "\n\nSTORICO CONVERSAZIONE:\n" . ($validated['conversationHistory'] ?? '');
        // ========= FINE MODIFICHE =========

        // ========= INIZIO BLOCCO DI RICERCA WEB CON DEEPSEEK (SOSTITUZIONE performWebSearch) =========
        $webResults = [];
        try {
            $deepseekApiKey = env('DEEPSEEK_API_KEY');
            if (!$deepseekApiKey) {
                Log::warning('Chiave API DeepSeek non configurata per la ricerca web.');
                // Fallback o gestione errore
            } else {
                // Ottimizza la query per la ricerca
                $optimizedQuery = $this->optimizeSearchQuery($validated['latestUtterance'], $clientContext);
                Log::info('>>> TENTATIVO DI CHIAMATA A DEEPSEEK SEARCH API', ['query_inviata' => $optimizedQuery]);

                // Cache della ricerca per evitare chiamate duplicate
                $cacheKey = 'deepseek_web_search_' . md5($optimizedQuery);
                $cachedResults = Cache::get($cacheKey);

                if ($cachedResults) {
                    Log::info('Risultati DeepSeek recuperati dalla cache.');
                    $webResults = $cachedResults;
                } else {
                    $deepseekResponse = Http::timeout(15)
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . $deepseekApiKey,
                            'Content-Type' => 'application/json',
                        ])
                        ->post('https://api.deepseek.com/v1/chat/completions', [
                            'model' => 'deepseek-chat',
                            'messages' => [
                                ['role' => 'system', 'content' => 'You are a helpful assistant specialized in performing web searches. When asked to find information, use your search tool. Provide concise summaries of the search results.'],
                                ['role' => 'user', 'content' => "Perform a web search for: " . $optimizedQuery . ". Summarize the key information from the results. Focus on details about public tenders, grants, and financing opportunities, especially relevant for the client's sector mentioned in context if any. Provide links."],
                            ],
                            'tools' => [
                                [
                                    'type' => 'function',
                                    'function' => [
                                        'name' => 'search',
                                        'description' => 'Searches the web for information.',
                                        'parameters' => [
                                            'type' => 'object',
                                            'properties' => [
                                                'query' => [
                                                    'type' => 'string',
                                                    'description' => 'The search query.',
                                                ],
                                            ],
                                            'required' => ['query'],
                                        ],
                                    ],
                                ],
                            ],
                            'tool_choice' => 'auto',
                        ]);

                    if ($deepseekResponse->successful()) {
                        $deepseekData = $deepseekResponse->json();
                        $aiContent = $deepseekData['choices'][0]['message']['content'] ?? '';

                        // Tentativo di estrarre informazioni strutturate dal testo generato da DeepSeek
                        preg_match_all('/(?:Titolo|Title):\s*(.*?)\n(?:Estratto|Snippet):\s*(.*?)\n(?:URL|Link):\s*(.*?)(?:\n|$)/is', $aiContent, $matches, PREG_SET_ORDER);

                        if (!empty($matches)) {
                            foreach ($matches as $match) {
                                $webResults[] = [
                                    'title' => $match[1] ?? 'N/A',
                                    'snippet' => $match[2] ?? 'N/A',
                                    'link' => $match[3] ?? '#',
                                    'displayLink' => parse_url($match[3], PHP_URL_HOST) ?? 'N/A'
                                ];
                            }
                        } else {
                            // Se non troviamo il formato strutturato, consideriamo l'intero contenuto come un singolo snippet
                            $webResults[] = [
                                'title' => 'Riepilogo Ricerca DeepSeek',
                                'snippet' => $aiContent,
                                'link' => '#',
                                'displayLink' => 'deepseek.com'
                            ];
                        }

                        Cache::put($cacheKey, $webResults, 7200);

                        Log::info('Ricerca web DeepSeek completata', [
                            'query' => $optimizedQuery,
                            'results_count' => count($webResults),
                            'raw_deepseek_response' => $deepseekData
                        ]);
                    } else {
                        Log::error('Errore nella ricerca web DeepSeek: ' . $deepseekResponse->body() . ' Status: ' . $deepseekResponse->status());
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Errore durante l\'esecuzione della ricerca web DeepSeek: ' . $e->getMessage());
        }
        // ========= FINE BLOCCO DI RICERCA WEB CON DEEPSEEK =========


        $extractionPrompt = $this->buildOptimizedMegaPrompt(
            $validated['consultantType'], 
            $fullContext, // <-- Ora passiamo il contesto completo
            $validated['latestUtterance'], 
            $webResults
        );
        $extractionResponse = $this->callGeminiAPI($extractionPrompt);
        Log::info('RISPOSTA ESTRAZIONE DATI:', $extractionResponse ?? ['Nessun dato estratto']);

        $foundData = [];
        if ($extractionResponse && !empty($extractionResponse['extractedData'])) {
            $foundData = $extractionResponse['extractedData'];
        }

        $adviceResponse = $this->getStrategicAdvice($validated['consultantType'], $foundData);
        $foundAdvice = [];
        if ($adviceResponse && !empty($adviceResponse['actionableAdvice'])) {
            $foundAdvice = $adviceResponse['actionableAdvice'];
        }

        $finalResponse = [
            'extractedData' => $foundData,
            'actionableAdvice' => $foundAdvice
        ];

        return response()->json($finalResponse);

    } catch (\Exception $e) {
        Log::error('Errore getInsights: ' . $e->getMessage());
        return response()->json(['error' => 'Errore nell\'elaborazione della richiesta AI.'], 500);
    }
}
// AGGIUNGA QUESTO NUOVO METODO
/**
 * Genera un riepilogo strutturato dell'intera conversazione.
 */
// SOSTITUISCA questo metodo
public function getSummary(Request $request)
{
    $validated = $request->validate([
        'sessionId' => 'required|string',
        'conversationHistory' => 'required|string'
    ]);
    
    $fullContext = $this->getFullContext($validated['sessionId'], $validated['conversationHistory']);

    $prompt = "Sei un analista di business. Sintetizza la seguente conversazione in un oggetto JSON `meetingSummary` con campi: `obiettivi`, `problemi`, `decisioni`. CONVERSAZIONE: --- {$fullContext} ---. Rispondi SOLO con il JSON.";
    
    // Ora usiamo il nuovo metodo generico, puoi specificare 'gemini', 'deepseek', o 'openai'
    $summaryJsonString = $this->callAiModel($prompt, 'gemini', 0.5, 2048); // Utilizziamo Gemini per il sommario
    
    // Tentiamo di decodificare il JSON e lo restituiamo
    $decodedSummary = json_decode($summaryJsonString, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        return response()->json(['meetingSummary' => $decodedSummary]);
    } else {
        Log::error('Errore nel parsing JSON del sommario: ' . json_last_error_msg() . ' Raw: ' . $summaryJsonString);
        return response()->json(['error' => 'Impossibile generare un sommario strutturato.', 'rawResponse' => $summaryJsonString], 500);
    }
}
    /**
     * Genera tasks basati sulla cronologia della conversazione
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
   // SOSTITUISCA il vecchio metodo generateTasks con questo
public function generateTasks(Request $request)
{
    $validated = $request->validate([
        'sessionId' => 'required|string',
        'conversationHistory' => 'required|string'
    ]);

    $fullContext = $this->getFullContext($validated['sessionId'], $validated['conversationHistory']);

    $prompt = "Sei un project manager. Basandoti sulla conversazione, genera un oggetto JSON `tasks` che sia un array di oggetti con `title` e `description`. CONVERSAZIONE: --- {$fullContext} ---. Rispondi SOLO con il JSON.";
    
    // Utilizziamo il nuovo metodo generico. Puoi specificare 'gemini', 'deepseek', o 'openai'
    $tasksJsonString = $this->callAiModel($prompt, 'gemini', 0.7, 1024); // Utilizziamo Gemini per i tasks
    
    // Tentiamo di decodificare il JSON e lo restituiamo
    $decodedTasks = json_decode($tasksJsonString, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        return response()->json(['tasks' => $decodedTasks]);
    } else {
        Log::error('Errore nel parsing JSON dei tasks: ' . json_last_error_msg() . ' Raw: ' . $tasksJsonString);
        return response()->json(['error' => 'Impossibile generare tasks strutturati.', 'rawResponse' => $tasksJsonString], 500);
    }
}

    /**
     * Avvia una nuova sessione AI
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function startSession(Request $request)
    {
        try {
            $validated = $request->validate([
                'consultantType' => 'required|string|max:100',
                'clientInfo' => 'nullable|string|max:500'
            ]);

            $sessionId = 'ai_session_' . uniqid() . '_' . time();
            $vendorId = auth()->guard('vendor')->id() ?? session('vendor_id');
            
            // Memorizza i dati della sessione in cache
            Cache::put("ai_copilot_session_{$sessionId}", [
                'vendor_id' => $vendorId,
                'consultant_type' => $validated['consultantType'],
                'client_info' => $validated['clientInfo'] ?? '',
                'started_at' => now(),
                'status' => 'active'
            ], 7200); // 2 ore di durata

            Log::info('Nuova sessione Co-Pilota AI avviata', [
                'session_id' => $sessionId,
                'vendor_id' => $vendorId
            ]);

            return response()->json([
                'success' => true,
                'sessionId' => $sessionId,
                'message' => 'Sessione AI avviata con successo'
            ]);

        } catch (\Exception $e) {
            Log::error('Errore nell\'avvio della sessione AI: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Errore nell\'avvio della sessione',
                'message' => 'Impossibile avviare la sessione AI'
            ], 500);
        }
    }

    /**
     * Termina una sessione AI
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    

    // Sostituisci la tua funzione endSession con questa versione completa

// In app/Http/Controllers/AiCoPilotController.php

public function endSession(Request $request)
{
    try {
        $validatedData = $request->validate([
            'sessionId' => 'required|string',
            'conversationHistory' => 'nullable|string',
            'webResults' => 'nullable|json',
            'planningData' => 'nullable|json',
            'actionableAdvice' => 'nullable|json',
        ]);

        $sessionId = $validatedData['sessionId'];
        $sessionData = Cache::get("ai_copilot_session_{$sessionId}");

        if (!$sessionData) {
            Log::warning('Tentativo di chiudere una sessione non valida o scaduta', ['sessionId' => $sessionId]);
            return response()->json(['error' => 'Sessione non valida o scaduta'], 404);
        }

        $vendorId = $sessionData['vendor_id'];
        $lastMeeting = Meeting::where('id_consulente', $vendorId)->doesntHave('report')->latest()->first();

        if (!$lastMeeting) {
            Log::warning('Nessun meeting senza report trovato per il consulente al termine della sessione', ['vendor_id' => $vendorId, 'sessionId' => $sessionId]);
            return response()->json(['error' => 'Nessun meeting corrispondente da aggiornare'], 404);
        }

        // Usa la funzione helper per ottenere il contesto completo finale
        $fullContext = $this->getFullContext($sessionId, $validatedData['conversationHistory'] ?? '');

        // Prepara le variabili per il sommario e i task
        $summaryText = 'Non è stato possibile generare un sommario.';
        $tasksJson = '[]';

        // Genera sommario e task solo se c'è stata una conversazione
        if (!empty(trim($validatedData['conversationHistory'] ?? ''))) {
            $summaryPrompt = "Sintetizza la seguente conversazione in un sommario conciso (massimo 150 parole) che descriva la situazione del cliente e le decisioni prese. CONVERSAZIONE: --- {$fullContext} ---";
            $summaryText = $this->callGeminiForText($summaryPrompt);

            $tasksPrompt = "Sei un project manager. Basandoti sulla seguente conversazione, genera una lista JSON di massimo 4 tasks chiari e operativi. Rispondi solo con il JSON, nel formato [{\"title\": \"...\", \"description\": \"...\"}]. CONVERSAZIONE: --- {$fullContext} ---";
            $tasksJsonRaw = $this->callGeminiForText($tasksPrompt);
            $tasksJson = preg_replace('/^```json\s*|\s*```$/', '', trim($tasksJsonRaw));
        }

        $report = MeetingReport::updateOrCreate(
            ['meeting_id' => $lastMeeting->id],
            [
                'full_transcript' => $validatedData['conversationHistory'] ?? '',
                'summary' => $summaryText,
                'generated_tasks' => $tasksJson,
                'consultant_notes' => $validatedData['planningData'] ?? '[]',
                'web_results' => $validatedData['webResults'] ?? '[]',
                'actionable_advice' => $validatedData['actionableAdvice'] ?? '[]',
                'key_insights' => '[]', 
            ]
        );

        Cache::forget("ai_copilot_session_{$sessionId}");
        Log::info('Sessione terminata e report salvato/aggiornato con ID: ' . $report->id);

        // Restituisce l'URL del report appena creato al frontend
        return response()->json(['success' => true, 'reportUrl' => route('vendor.clients.report', $report->meeting_id)]);

    } catch (\Exception $e) {
        Log::error('Errore critico nella chiusura della sessione AI: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
        return response()->json(['error' => 'Errore interno del server durante il salvataggio del report.'], 500);
    }
}
    // ============================================

 
    /**
     * Esegue una ricerca web dinamica utilizzando Google Custom Search API
     * 
     * @param string $query
     * @return array
     */
   public function findClientByVatNumber(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codice_fiscale_partita_iva' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $vatNumber = $request->input('codice_fiscale_partita_iva');

        // Cerca tra gli utenti che NON sono vendor
        $client = User::where('codice_fiscale_partita_iva', $vatNumber)
                      ->where('is_vendor', 0) 
                      ->first();

        if ($client) {
            return response()->json(['client' => $client]);
        } else {
            // Se non viene trovato, restituisce un errore 404 come previsto dal workflow
            return response()->json(['message' => 'Cliente non trovato'], 404);
        }
    }

    /**
     * Crea un nuovo cliente "al volo" se non trovato nel database.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function createClientOnTheFly(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nome_azienda' => 'required|string|max:255',
            'codice_fiscale_partita_iva' => 'required|string|max:255|unique:users,codice_fiscale_partita_iva',
            'email' => 'nullable|email|unique:users,email',
            'settore_attivita' => 'nullable|string|max:255',
            'indirizzo' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Creazione del nuovo utente/cliente
        $newUser = new User();
        $newUser->nome_azienda = $request->input('nome_azienda');
        $newUser->codice_fiscale_partita_iva = $request->input('codice_fiscale_partita_iva');
        $newUser->email = $request->input('email');
        $newUser->settore_attivita = $request->input('settore_attivita');
        $newUser->indirizzo = $request->input('indirizzo');
        
        // Assegnamo un username e una password temporanei e sicuri
        $newUser->username = strtolower(Str::slug($request->input('nome_azienda')) . '_' . Str::random(4));
        $newUser->password = Hash::make(Str::random(16));

        $newUser->is_vendor = 0; // È un cliente, non un vendor
        $newUser->status = 1; // Attiviamo l'account
        $newUser->email_verified_at = now(); // Verifichiamo l'email per evitare problemi

        $newUser->save();

        return response()->json(['client' => $newUser], 201); // 201 = Created
    }

    /**
     * Salva il record del meeting nella tabella 'meetings'.
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
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => $temperature,
                        'maxOutputTokens' => $maxOutputTokens,
                    ]
                ];
            }

            $response = Http::timeout(60)->withHeaders($headers)->post($apiUrl, $requestBody);

            if ($response->successful()) {
                $data = $response->json();
                $aiText = '';

                if (isset($data['choices'][0]['message']['content'])) { // Deepseek, OpenAI
                    $aiText = $data['choices'][0]['message']['content'];
                } elseif (isset($data['candidates'][0]['content']['parts'][0]['text'])) { // Gemini
                    $aiText = $data['candidates'][0]['content']['parts'][0]['text'];
                } else {
                    Log::error("Struttura risposta AI ({$modelType}) non valida: " . json_encode($data));
                    return 'Spiacente, la risposta AI non è nel formato atteso.';
                }
                
                // Rimuovi blocchi di codice se presenti nell'output (e.g., ```json)
                $cleanedText = preg_replace('/^```(?:json|php|text)?\s*|\s*```$/s', '', trim($aiText));

                return $cleanedText;
            } else {
                Log::error("Errore nella chiamata API {$modelType}: " . $response->body() . " Status: " . $response->status());
                return 'Spiacente, si è verificato un errore nella comunicazione con l\'AI.';
            }

        } catch (\Exception $e) {
            Log::error("Eccezione nella chiamata API {$modelType}: " . $e->getMessage());
            return 'Spiacente, si è verificato un errore imprevisto.';
        }
    }
}