<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\Vendor;
use App\Models\User;
use App\Models\Meeting;
use App\Models\MeetingReport;
use Google\Cloud\Speech\V1\SpeechClient;
use Google\Cloud\Speech\V1\RecognitionConfig;
use Google\Cloud\Speech\V1\RecognitionConfig\AudioEncoding;
use Google\Cloud\Speech\V1\RecognitionAudio;

/**
 * AiCoPilotControllerV2 - Controller rifattorizzato per Laravel 9.x
 * 
 * Sistema AI Co-Pilota Pro v2.0 completamente rifattorizzato
 * con architettura modulare e compatibilità Laravel 9.x
 */
class AiCoPilotControllerV2 extends Controller
{
    /**
     * Servizi iniettati
     */
    protected $promptEngine;
    protected $aiOrchestrator;
    protected $sessionManager;
    
    public function __construct()
    {
        // Middleware di autenticazione per vendor
        $this->middleware('auth:vendor');
        
        // Inizializza servizi (dependency injection manuale per Laravel 9)
        $this->initializeServices();
    }
    
    /**
     * Inizializza i servizi necessari
     */
    private function initializeServices()
    {
        // Per Laravel 9.x usiamo inizializzazione manuale
        // In futuro si può migrare a Service Container
    }
    
    /**
     * Visualizza la pagina principale del Co-Pilota AI v2.0
     */
    public function showPage()
    {
        try {
            $vendor = Auth::guard('vendor')->user();
            
            if (!$vendor) {
                return redirect()->route('admin.login')
                    ->with('error', 'Accesso richiesto per utilizzare il Co-Pilota AI');
            }
            
            $data = [
                'vendor' => $vendor,
                'pageTitle' => 'AI Co-Pilota Pro v2.0',
                'websiteInfo' => $this->getWebsiteInfo(),
                'consultantType' => $vendor->specialization ?? 'Consulente Generico',
                'version' => '2.0.0'
            ];

            return view('vendors.ai-support-v2', $data);
            
        } catch (\Exception $e) {
            Log::error('Errore caricamento Co-Pilota AI v2.0: ' . $e->getMessage());
            return back()->with('error', 'Errore nel caricamento del Co-Pilota AI');
        }
    }
    
    /**
     * Avvia una nuova sessione AI
     */
    public function startSession(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'consultantType' => 'required|string|max:100',
                'clientInfo' => 'nullable|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $sessionId = 'ai_session_' . uniqid() . '_' . time();
            $vendorId = Auth::guard('vendor')->id();
            
            // Dati sessione per cache
            $sessionData = [
                'vendor_id' => $vendorId,
                'consultant_type' => $request->consultantType,
                'client_info' => $request->clientInfo ?? '',
                'started_at' => now()->toISOString(),
                'status' => 'active',
                'version' => '2.0.0'
            ];
            
            // Salva in cache con TTL di 4 ore
            Cache::put("ai_copilot_session_{$sessionId}", $sessionData, 14400);

            Log::info('Nuova sessione Co-Pilota AI v2.0 avviata', [
                'session_id' => $sessionId,
                'vendor_id' => $vendorId,
                'consultant_type' => $request->consultantType
            ]);

            return response()->json([
                'success' => true,
                'sessionId' => $sessionId,
                'message' => 'Sessione AI avviata con successo',
                'data' => [
                    'consultant_type' => $request->consultantType,
                    'session_start' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Errore avvio sessione AI v2.0: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Errore nell\'avvio della sessione',
                'message' => 'Impossibile avviare la sessione AI'
            ], 500);
        }
    }
    
    /**
     * Elabora chunk audio per Speech-to-Text
     */
    public function processAudioChunk(Request $request): JsonResponse
    {
        try {
            // Validazione richiesta
            $validator = Validator::make($request->all(), [
                'sessionId' => 'required|string',
                'chunkIndex' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verifica sessione attiva
            $sessionData = Cache::get("ai_copilot_session_{$request->sessionId}");
            if (!$sessionData) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sessione non valida o scaduta'
                ], 404);
            }

            // Ottieni dati audio dal body della richiesta
            $audioData = $request->getContent();
            
            if (empty($audioData)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Nessun dato audio ricevuto'
                ], 400);
            }

            // Elabora con Google Speech-to-Text
            $transcript = $this->transcribeAudio($audioData);

            // Se c'è trascrizione, elabora con AI
            $aiResponse = null;
            if (!empty($transcript)) {
                $aiResponse = $this->processWithAI($transcript, $sessionData);
            }

            return response()->json([
                'success' => true,
                'transcript' => $transcript,
                'aiResponse' => $aiResponse,
                'chunkIndex' => $request->chunkIndex,
                'timestamp' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error('Errore elaborazione audio chunk: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Errore nell\'elaborazione audio',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Trascrizione audio con Google Speech-to-Text
     */
    private function transcribeAudio(string $audioData): string
    {
        try {
            $credentialsPath = env('GOOGLE_APPLICATION_CREDENTIALS');
            
            if (!$credentialsPath || !file_exists($credentialsPath)) {
                Log::error('Credenziali Google Cloud non configurate correttamente');
                return '';
            }

            // Inizializza client Google Speech
            $speechClient = new SpeechClient([
                'credentials' => $credentialsPath,
                'projectId' => env('GOOGLE_CLOUD_PROJECT_ID')
            ]);

            // Configurazione riconoscimento
            $recognitionConfig = new RecognitionConfig();
            $recognitionConfig->setEncoding(RecognitionConfig\AudioEncoding::LINEAR16);
            $recognitionConfig->setSampleRateHertz(16000);
            $recognitionConfig->setLanguageCode('it-IT');
            $recognitionConfig->setEnableAutomaticPunctuation(true);

            // Audio da elaborare
            $audio = new RecognitionAudio();
            $audio->setContent($audioData);

            // Esegui riconoscimento
            $response = $speechClient->recognize($recognitionConfig, $audio);
            
            $transcript = '';
            foreach ($response->getResults() as $result) {
                $alternatives = $result->getAlternatives();
                if (!empty($alternatives)) {
                    $transcript .= $alternatives[0]->getTranscript();
                }
            }

            // Chiudi client
            $speechClient->close();

            if (!empty($transcript)) {
                Log::info('Trascrizione completata', [
                    'transcript_length' => strlen($transcript),
                    'preview' => substr($transcript, 0, 100)
                ]);
            }

            return trim($transcript);

        } catch (\Exception $e) {
            Log::error('Errore trascrizione Google Speech: ' . $e->getMessage());
            return '';
        }
    }
    
    /**
     * Elabora trascrizione con AI
     */
    private function processWithAI(string $transcript, array $sessionData): ?array
    {
        try {
            $consultantType = $sessionData['consultant_type'] ?? 'Consulente Generico';
            $clientInfo = $sessionData['client_info'] ?? '';
            
            // Genera prompt dinamico basato su specializzazione
            $prompt = $this->buildDynamicPrompt($transcript, $consultantType, $clientInfo);
            
            // Chiama servizio AI (Gemini come primario)
            $aiResponse = $this->callGeminiAPI($prompt);
            
            if ($aiResponse) {
                // Esegui ricerca web se necessario
                $webResults = $this->performWebSearch($transcript, $clientInfo);
                
                return [
                    'suggestions' => $aiResponse['suggestions'] ?? [],
                    'insights' => $aiResponse['insights'] ?? [],
                    'webResults' => $webResults,
                    'timestamp' => now()->toISOString()
                ];
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::error('Errore elaborazione AI: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Costruisce prompt dinamico basato su specializzazione
     */
    private function buildDynamicPrompt(string $transcript, string $consultantType, string $clientInfo): string
    {
        // Template base per diversi tipi di consulenti
        $templates = [
            'Consulente del Lavoro' => [
                'system' => 'Sei un esperto consulente del lavoro specializzato in diritto del lavoro, contratti, sicurezza sul lavoro e agevolazioni per le assunzioni.',
                'focus' => ['contratti di lavoro', 'sicurezza', 'agevolazioni', 'formazione'],
                'keywords' => ['bandi lavoro', 'incentivi assunzioni', 'contratti']
            ],
            'Medico' => [
                'system' => 'Sei un assistente medico specializzato che supporta professionisti sanitari con informazioni cliniche aggiornate.',
                'focus' => ['diagnosi', 'terapie', 'protocolli clinici', 'ricerca medica'],
                'keywords' => ['ricerca medica', 'protocolli clinici', 'linee guida']
            ],
            'Avvocato' => [
                'system' => 'Sei un assistente legale esperto in diritto italiano, giurisprudenza e normative vigenti.',
                'focus' => ['normative', 'giurisprudenza', 'contratti', 'contenzioso'],
                'keywords' => ['giurisprudenza', 'normative', 'codice civile']
            ],
            'Consulente Generico' => [
                'system' => 'Sei un assistente professionale che supporta consulenti in diverse aree di business.',
                'focus' => ['analisi', 'strategie', 'soluzioni', 'best practices'],
                'keywords' => ['business', 'strategie', 'soluzioni']
            ]
        ];
        
        $template = $templates[$consultantType] ?? $templates['Consulente Generico'];
        
        $prompt = "### SISTEMA AI CONSULENTE PROFESSIONALE ###\n\n";
        $prompt .= "RUOLO: {$template['system']}\n\n";
        $prompt .= "CONTESTO CLIENTE: {$clientInfo}\n\n";
        $prompt .= "TRASCRIZIONE CONVERSAZIONE: \"{$transcript}\"\n\n";
        $prompt .= "AREE DI FOCUS: " . implode(', ', $template['focus']) . "\n\n";
        $prompt .= "ISTRUZIONI:\n";
        $prompt .= "1. Analizza la trascrizione nel contesto della specializzazione {$consultantType}\n";
        $prompt .= "2. Genera suggerimenti pratici e actionable\n";
        $prompt .= "3. Identifica opportunità di approfondimento\n";
        $prompt .= "4. Suggerisci domande pertinenti da fare al cliente\n\n";
        $prompt .= "FORMATO RISPOSTA JSON:\n";
        $prompt .= "{\n";
        $prompt .= "  \"suggestions\": [\n";
        $prompt .= "    {\n";
        $prompt .= "      \"type\": \"immediate|followup|research\",\n";
        $prompt .= "      \"title\": \"Titolo suggerimento\",\n";
        $prompt .= "      \"content\": \"Contenuto dettagliato\",\n";
        $prompt .= "      \"priority\": \"high|medium|low\"\n";
        $prompt .= "    }\n";
        $prompt .= "  ],\n";
        $prompt .= "  \"insights\": [\n";
        $prompt .= "    {\n";
        $prompt .= "      \"category\": \"Categoria insight\",\n";
        $prompt .= "      \"description\": \"Descrizione insight\"\n";
        $prompt .= "    }\n";
        $prompt .= "  ]\n";
        $prompt .= "}\n\n";
        $prompt .= "Rispondi SOLO con il JSON valido.";
        
        return $prompt;
    }
    
    /**
     * Chiama API Gemini per elaborazione AI
     */
    private function callGeminiAPI(string $prompt): ?array
    {
        try {
            $apiKey = env('GEMINI_API_KEY');
            
            if (!$apiKey) {
                Log::warning('Chiave API Gemini non configurata');
                return null;
            }
            
            $response = Http::timeout(30)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'topK' => 40,
                        'topP' => 0.95,
                        'maxOutputTokens' => 2048
                    ]
                ]);
            
            if ($response->successful()) {
                $data = $response->json();
                $content = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
                
                // Pulisci e decodifica JSON
                $content = trim($content);
                $content = preg_replace('/^```json\s*|\s*```$/', '', $content);
                
                $decoded = json_decode($content, true);
                
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $decoded;
                } else {
                    Log::error('Errore parsing JSON Gemini: ' . json_last_error_msg());
                    return null;
                }
            } else {
                Log::error('Errore API Gemini: ' . $response->body());
                return null;
            }
            
        } catch (\Exception $e) {
            Log::error('Errore chiamata Gemini API: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Esegue ricerca web con DeepSeek
     */
    private function performWebSearch(string $query, string $clientContext): array
    {
        try {
            $deepseekApiKey = env('DEEPSEEK_API_KEY');
            
            if (!$deepseekApiKey) {
                Log::warning('Chiave API DeepSeek non configurata');
                return [];
            }
            
            // Ottimizza query per ricerca
            $optimizedQuery = $this->optimizeSearchQuery($query, $clientContext);
            
            // Cache per evitare ricerche duplicate
            $cacheKey = 'web_search_' . md5($optimizedQuery);
            $cachedResults = Cache::get($cacheKey);
            
            if ($cachedResults) {
                return $cachedResults;
            }
            
            $response = Http::timeout(20)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $deepseekApiKey,
                    'Content-Type' => 'application/json'
                ])
                ->post('https://api.deepseek.com/v1/chat/completions', [
                    'model' => 'deepseek-chat',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Sei un assistente specializzato in ricerche web per consulenti professionali. Quando richiesto, esegui ricerche mirate e fornisci risultati strutturati.'
                        ],
                        [
                            'role' => 'user',
                            'content' => "Esegui una ricerca web per: {$optimizedQuery}. Concentrati su bandi, finanziamenti, agevolazioni e opportunità per il settore specifico. Fornisci risultati strutturati con titoli, descrizioni e link."
                        ]
                    ],
                    'tools' => [
                        [
                            'type' => 'function',
                            'function' => [
                                'name' => 'search',
                                'description' => 'Esegue ricerche web',
                                'parameters' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'query' => [
                                            'type' => 'string',
                                            'description' => 'Query di ricerca'
                                        ]
                                    ],
                                    'required' => ['query']
                                ]
                            ]
                        ]
                    ],
                    'tool_choice' => 'auto'
                ]);
            
            if ($response->successful()) {
                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';
                
                // Estrai risultati strutturati
                $results = $this->parseWebSearchResults($content);
                
                // Cache risultati per 2 ore
                Cache::put($cacheKey, $results, 7200);
                
                Log::info('Ricerca web completata', [
                    'query' => $optimizedQuery,
                    'results_count' => count($results)
                ]);
                
                return $results;
            }
            
            return [];
            
        } catch (\Exception $e) {
            Log::error('Errore ricerca web DeepSeek: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Ottimizza query di ricerca
     */
    private function optimizeSearchQuery(string $query, string $clientContext): string
    {
        // Estrai settore dal contesto cliente
        $sector = '';
        if (preg_match('/Settore:\s*([^.]+)/i', $clientContext, $matches)) {
            $sector = trim($matches[1]);
        }
        
        // Rimuovi stop words
        $stopWords = ['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'in', 'con', 'su', 'da', 'come', 'del', 'della'];
        $words = explode(' ', strtolower($query));
        $filteredWords = array_filter($words, function($word) use ($stopWords) {
            return !in_array(trim($word, " \t\n\r\0\x0B,."), $stopWords) && strlen($word) > 2;
        });
        
        $baseQuery = implode(' ', $filteredWords);
        
        // Aggiungi settore se disponibile
        if ($sector) {
            $baseQuery = "{$sector} {$baseQuery}";
        }
        
        // Aggiungi termini specifici per bandi e finanziamenti
        $searchQuery = "{$baseQuery} bando OR finanziamento OR agevolazioni OR incentivi";
        
        return $searchQuery;
    }
    
    /**
     * Parsing risultati ricerca web
     */
    private function parseWebSearchResults(string $content): array
    {
        $results = [];
        
        // Pattern per estrarre risultati strutturati
        if (preg_match_all('/(?:Titolo|Title):\s*(.*?)\n(?:Descrizione|Description):\s*(.*?)\n(?:Link|URL):\s*(.*?)(?:\n|$)/is', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $results[] = [
                    'title' => trim($match[1]),
                    'description' => trim($match[2]),
                    'url' => trim($match[3]),
                    'source' => parse_url(trim($match[3]), PHP_URL_HOST) ?? 'N/A'
                ];
            }
        } else {
            // Fallback: considera tutto il contenuto come un singolo risultato
            $results[] = [
                'title' => 'Risultati Ricerca Web',
                'description' => $content,
                'url' => '#',
                'source' => 'DeepSeek Search'
            ];
        }
        
        return $results;
    }
    
    /**
     * Termina sessione e genera report
     */
    public function endSession(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'sessionId' => 'required|string',
                'conversationHistory' => 'nullable|string',
                'suggestions' => 'nullable|json',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $sessionId = $request->sessionId;
            $sessionData = Cache::get("ai_copilot_session_{$sessionId}");

            if (!$sessionData) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sessione non trovata'
                ], 404);
            }

            // Trova ultimo meeting del vendor
            $vendorId = $sessionData['vendor_id'];
            $meeting = Meeting::where('id_consulente', $vendorId)
                ->whereDoesntHave('report')
                ->latest()
                ->first();

            if ($meeting) {
                // Genera report finale
                $reportData = $this->generateFinalReport($request->all(), $sessionData);
                
                // Salva report
                MeetingReport::updateOrCreate(
                    ['meeting_id' => $meeting->id],
                    $reportData
                );
                
                Log::info('Report meeting salvato', [
                    'meeting_id' => $meeting->id,
                    'session_id' => $sessionId
                ]);
            }

            // Rimuovi sessione dalla cache
            Cache::forget("ai_copilot_session_{$sessionId}");

            return response()->json([
                'success' => true,
                'message' => 'Sessione terminata e report salvato',
                'reportId' => $meeting->id ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Errore chiusura sessione: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Errore nella chiusura della sessione'
            ], 500);
        }
    }
    
    /**
     * Genera report finale
     */
    private function generateFinalReport(array $sessionData, array $metadata): array
    {
        $conversationHistory = $sessionData['conversationHistory'] ?? '';
        $suggestions = $sessionData['suggestions'] ?? '[]';
        $notes = $sessionData['notes'] ?? '';
        
        // Genera summary con AI se c'è conversazione
        $summary = 'Nessuna conversazione registrata.';
        if (!empty(trim($conversationHistory))) {
            $summary = $this->generateSummary($conversationHistory, $metadata);
        }
        
        // Genera tasks
        $tasks = $this->generateTasks($conversationHistory, $metadata);
        
        return [
            'full_transcript' => $conversationHistory,
            'summary' => $summary,
            'generated_tasks' => json_encode($tasks),
            'consultant_notes' => $notes,
            'ai_suggestions' => $suggestions,
            'session_metadata' => json_encode([
                'consultant_type' => $metadata['consultant_type'] ?? '',
                'session_duration' => $this->calculateSessionDuration($metadata),
                'version' => '2.0.0'
            ])
        ];
    }
    
    /**
     * Genera summary con AI
     */
    private function generateSummary(string $conversation, array $metadata): string
    {
        try {
            $consultantType = $metadata['consultant_type'] ?? 'Consulente';
            
            $prompt = "Sei un {$consultantType} esperto. Sintetizza la seguente conversazione in un riassunto professionale di massimo 200 parole, evidenziando i punti chiave, le decisioni prese e i prossimi passi.\n\nCONVERSAZIONE:\n{$conversation}\n\nRiassunto:";
            
            $response = $this->callGeminiForText($prompt);
            
            return $response ?: 'Impossibile generare riassunto automatico.';
            
        } catch (\Exception $e) {
            Log::error('Errore generazione summary: ' . $e->getMessage());
            return 'Errore nella generazione del riassunto.';
        }
    }
    
    /**
     * Genera tasks
     */
    private function generateTasks(string $conversation, array $metadata): array
    {
        try {
            if (empty(trim($conversation))) {
                return [];
            }
            
            $consultantType = $metadata['consultant_type'] ?? 'Consulente';
            
            $prompt = "Basandoti sulla seguente conversazione di un {$consultantType}, genera una lista di massimo 4 task operativi e specifici. Rispondi SOLO con un array JSON nel formato: [{\"title\": \"Titolo task\", \"description\": \"Descrizione dettagliata\", \"priority\": \"alta|media|bassa\"}]\n\nCONVERSAZIONE:\n{$conversation}";
            
            $response = $this->callGeminiForText($prompt);
            
            if ($response) {
                // Pulisci risposta
                $response = preg_replace('/^```json\s*|\s*```$/', '', trim($response));
                $tasks = json_decode($response, true);
                
                if (json_last_error() === JSON_ERROR_NONE && is_array($tasks)) {
                    return $tasks;
                }
            }
            
            return [];
            
        } catch (\Exception $e) {
            Log::error('Errore generazione tasks: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Chiama Gemini per testo semplice
     */
    private function callGeminiForText(string $prompt): ?string
    {
        try {
            $apiKey = env('GEMINI_API_KEY');
            
            if (!$apiKey) {
                return null;
            }
            
            $response = Http::timeout(30)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.5,
                        'maxOutputTokens' => 1024
                    ]
                ]);
            
            if ($response->successful()) {
                $data = $response->json();
                return $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::error('Errore Gemini text: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Calcola durata sessione
     */
    private function calculateSessionDuration(array $metadata): string
    {
        try {
            $startTime = $metadata['started_at'] ?? null;
            if ($startTime) {
                $start = \Carbon\Carbon::parse($startTime);
                $duration = $start->diffInMinutes(now());
                return "{$duration} minuti";
            }
            return 'N/A';
        } catch (\Exception $e) {
            return 'N/A';
        }
    }
    
    /**
     * Cerca cliente per P.IVA/CF
     */
    public function findClient(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'codice_fiscale_partita_iva' => 'required|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $vatNumber = $request->codice_fiscale_partita_iva;

            $client = User::where('codice_fiscale_partita_iva', $vatNumber)
                          ->where('is_vendor', 0)
                          ->first();

            if ($client) {
                return response()->json([
                    'success' => true,
                    'client' => $client
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Cliente non trovato'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Errore ricerca cliente: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Errore nella ricerca del cliente'
            ], 500);
        }
    }
    
    /**
     * Crea nuovo cliente
     */
    public function createClient(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome_azienda' => 'required|string|max:255',
                'codice_fiscale_partita_iva' => 'required|string|max:255|unique:users,codice_fiscale_partita_iva',
                'email' => 'nullable|email|unique:users,email',
                'settore_attivita' => 'nullable|string|max:255',
                'indirizzo' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $client = User::create([
                'nome_azienda' => $request->nome_azienda,
                'codice_fiscale_partita_iva' => $request->codice_fiscale_partita_iva,
                'email' => $request->email,
                'settore_attivita' => $request->settore_attivita,
                'indirizzo' => $request->indirizzo,
                'username' => strtolower(Str::slug($request->nome_azienda) . '_' . Str::random(4)),
                'password' => Hash::make(Str::random(16)),
                'is_vendor' => 0,
                'status' => 1,
                'email_verified_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'client' => $client,
                'message' => 'Cliente creato con successo'
            ], 201);

        } catch (\Exception $e) {
            Log::error('Errore creazione cliente: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Errore nella creazione del cliente'
            ], 500);
        }
    }
    
    /**
     * Salva record meeting
     */
    public function storeMeeting(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'id_cliente' => 'required|exists:users,id',
                'tipo_meeting' => 'required|string|max:100',
                'settore_cliente' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $meeting = Meeting::create([
                'id_cliente' => $request->id_cliente,
                'id_consulente' => Auth::guard('vendor')->id(),
                'tipo_meeting' => $request->tipo_meeting,
                'settore_cliente' => $request->settore_cliente
            ]);

            return response()->json([
                'success' => true,
                'meeting' => $meeting,
                'message' => 'Meeting registrato con successo'
            ]);

        } catch (\Exception $e) {
            Log::error('Errore salvataggio meeting: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Errore nel salvataggio del meeting'
            ], 500);
        }
    }
    
    /**
     * Ottiene informazioni sito web
     */
    private function getWebsiteInfo(): object
    {
        return (object) [
            'website_title' => 'AI Co-Pilota Pro v2.0',
            'logo' => 'logo.png',
            'favicon' => 'favicon.png'
        ];
    }
}

