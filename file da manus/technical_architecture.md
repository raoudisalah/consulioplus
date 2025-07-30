# Architettura Tecnica - AI Co-Pilota Pro v2.0

## Panoramica Architetturale

Il nuovo sistema AI Co-Pilota Pro è progettato seguendo principi di architettura moderna, scalabile e manutenibile. L'architettura è basata su pattern consolidati dell'industria e best practices per applicazioni enterprise.

## Stack Tecnologico

### Frontend Stack
- **Framework Base**: Laravel Blade Templates con componenti modulari
- **JavaScript**: ES6+ con moduli nativi
- **CSS Framework**: Tailwind CSS per design system consistente
- **Build Tool**: Laravel Mix con Webpack 5
- **State Management**: Custom State Manager (no framework pesanti)
- **Audio Processing**: Web Audio API nativa
- **Real-time Communication**: Laravel Echo + Pusher

### Backend Stack
- **Framework**: Laravel 9.x
- **PHP Version**: 8.1+
- **Database**: MySQL 8.0+
- **Cache**: Redis per sessioni e cache distribuita
- **Queue System**: Laravel Queues con Redis driver
- **File Storage**: Laravel Storage con S3 compatibility
- **API Documentation**: OpenAPI 3.0 specification

### External Services
- **Speech-to-Text**: Google Cloud Speech-to-Text API
- **AI Services**: 
  - Google Gemini (analisi e suggerimenti)
  - DeepSeek (ricerche web specializzate)
  - OpenAI GPT-4 (fallback e tasks specifici)
- **Search**: Google Custom Search API
- **Monitoring**: Laravel Telescope + Sentry

## Architettura del Sistema

### Layered Architecture Pattern

#### 1. Presentation Layer
```
Controllers/
├── AiCoPilotController.php      # Main API endpoints
├── SessionController.php        # Session management
├── ClientController.php         # Client operations
├── ReportController.php         # Report generation
└── WebhookController.php        # External webhooks
```

#### 2. Application Layer (Services)
```
Services/
├── AI/
│   ├── AIOrchestrationService.php    # AI services coordinator
│   ├── PromptEngineService.php       # Dynamic prompt generation
│   ├── SpeechToTextService.php       # Audio transcription
│   └── WebSearchService.php          # Intelligent web search
├── Session/
│   ├── SessionManagerService.php     # Session lifecycle
│   └── StateManagerService.php       # Application state
├── Client/
│   └── ClientManagementService.php   # Client operations
└── Report/
    └── ReportGenerationService.php   # Report creation
```

#### 3. Domain Layer (Models & Business Logic)
```
Models/
├── Vendor.php                   # Consultant model
├── User.php                     # Client model
├── Meeting.php                  # Meeting sessions
├── MeetingReport.php            # Generated reports
├── AIPromptTemplate.php         # Dynamic prompts
└── SessionData.php              # Session state
```

#### 4. Infrastructure Layer
```
Infrastructure/
├── Adapters/
│   ├── GoogleSpeechAdapter.php      # Google Speech API
│   ├── GeminiAdapter.php            # Google Gemini API
│   ├── DeepSeekAdapter.php          # DeepSeek API
│   └── OpenAIAdapter.php            # OpenAI API
├── Repositories/
│   ├── SessionRepository.php        # Session persistence
│   ├── ClientRepository.php         # Client data access
│   └── ReportRepository.php         # Report storage
└── Cache/
    └── CacheManager.php             # Distributed cache
```

## Frontend Architecture

### Modular JavaScript Structure

#### Core Modules
```javascript
// Core application modules
const AppModules = {
    AudioManager: {
        // Audio recording and processing
        initialize: () => {},
        startRecording: () => {},
        stopRecording: () => {},
        processAudioChunk: () => {}
    },
    
    AIAssistant: {
        // AI interactions and suggestions
        sendTranscription: () => {},
        getInsights: () => {},
        askQuestion: () => {}
    },
    
    SessionManager: {
        // Session lifecycle management
        startSession: () => {},
        endSession: () => {},
        updateState: () => {}
    },
    
    UIController: {
        // UI state and interactions
        updateInterface: () => {},
        showModal: () => {},
        updateStatus: () => {}
    }
};
```

#### State Management System
```javascript
// Centralized state management
const AppState = {
    // Session state
    session: {
        id: null,
        active: false,
        client: null,
        consultant: null,
        startTime: null
    },
    
    // Audio state
    audio: {
        recording: false,
        paused: false,
        level: 0,
        context: null
    },
    
    // AI state
    ai: {
        processing: false,
        suggestions: [],
        currentIndex: 0,
        lastUpdate: null
    },
    
    // UI state
    ui: {
        activeView: 'chat',
        modalOpen: false,
        loading: false,
        notifications: []
    }
};

// State management functions
const StateManager = {
    get: (path) => {},
    set: (path, value) => {},
    subscribe: (path, callback) => {},
    dispatch: (action, payload) => {}
};
```

### Component Architecture

#### Base Component Class
```javascript
class BaseComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.defaultOptions, ...options };
        this.state = {};
        this.initialize();
    }
    
    initialize() {
        this.bindEvents();
        this.render();
    }
    
    bindEvents() {
        // Override in subclasses
    }
    
    render() {
        // Override in subclasses
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }
    
    destroy() {
        // Cleanup
    }
}
```

#### Specific Components
```javascript
// Chat Interface Component
class ChatInterface extends BaseComponent {
    defaultOptions = {
        autoScroll: true,
        showTimestamps: true,
        maxMessages: 1000
    };
    
    addMessage(message) {}
    addSuggestion(suggestion) {}
    scrollToBottom() {}
}

// Audio Recorder Component
class AudioRecorder extends BaseComponent {
    defaultOptions = {
        sampleRate: 16000,
        bufferSize: 4096,
        channels: 1
    };
    
    start() {}
    stop() {}
    pause() {}
    resume() {}
}

// Suggestion Card Component
class SuggestionCard extends BaseComponent {
    defaultOptions = {
        expandable: true,
        saveable: true,
        shareable: true
    };
    
    expand() {}
    collapse() {}
    save() {}
    share() {}
}
```

## Backend Architecture Dettagliata

### Service Layer Implementation

#### AI Orchestration Service
```php
<?php

namespace App\Services\AI;

class AIOrchestrationService
{
    private $speechService;
    private $promptEngine;
    private $webSearchService;
    private $adapters;
    
    public function __construct(
        SpeechToTextService $speechService,
        PromptEngineService $promptEngine,
        WebSearchService $webSearchService,
        array $adapters
    ) {
        $this->speechService = $speechService;
        $this->promptEngine = $promptEngine;
        $this->webSearchService = $webSearchService;
        $this->adapters = $adapters;
    }
    
    public function processAudioChunk(string $audioData, string $sessionId): array
    {
        // Transcribe audio
        $transcript = $this->speechService->transcribe($audioData);
        
        if (empty($transcript)) {
            return ['transcript' => '', 'suggestions' => []];
        }
        
        // Get session context
        $context = $this->getSessionContext($sessionId);
        
        // Generate AI insights
        $insights = $this->generateInsights($transcript, $context);
        
        // Perform web search if needed
        $webResults = $this->webSearchService->search($transcript, $context);
        
        return [
            'transcript' => $transcript,
            'insights' => $insights,
            'webResults' => $webResults
        ];
    }
    
    private function generateInsights(string $transcript, array $context): array
    {
        $prompt = $this->promptEngine->buildPrompt($transcript, $context);
        
        // Try primary AI service (Gemini)
        try {
            return $this->adapters['gemini']->generateResponse($prompt);
        } catch (Exception $e) {
            // Fallback to secondary service
            return $this->adapters['deepseek']->generateResponse($prompt);
        }
    }
}
```

#### Dynamic Prompt Engine
```php
<?php

namespace App\Services\AI;

class PromptEngineService
{
    private $templates;
    
    public function __construct()
    {
        $this->loadTemplates();
    }
    
    public function buildPrompt(string $input, array $context): string
    {
        $specialization = $context['consultant_type'] ?? 'general';
        $template = $this->getTemplate($specialization);
        
        return $this->interpolateTemplate($template, [
            'input' => $input,
            'context' => $context,
            'timestamp' => now()->toISOString()
        ]);
    }
    
    private function getTemplate(string $specialization): array
    {
        return $this->templates[$specialization] ?? $this->templates['general'];
    }
    
    private function loadTemplates(): void
    {
        $this->templates = [
            'consulente_lavoro' => [
                'system_prompt' => 'Sei un esperto consulente del lavoro...',
                'search_keywords' => ['bandi lavoro', 'agevolazioni'],
                'focus_areas' => ['contratti', 'sicurezza', 'formazione']
            ],
            'medico' => [
                'system_prompt' => 'Sei un assistente medico...',
                'search_keywords' => ['ricerca medica', 'protocolli'],
                'focus_areas' => ['diagnosi', 'terapie', 'prevenzione']
            ],
            'avvocato' => [
                'system_prompt' => 'Sei un assistente legale...',
                'search_keywords' => ['giurisprudenza', 'normative'],
                'focus_areas' => ['contratti', 'contenzioso', 'consulenza']
            ]
        ];
    }
}
```

### Database Schema Ottimizzato

#### Tabelle Principali
```sql
-- Sessioni AI ottimizzate
CREATE TABLE ai_sessions (
    id VARCHAR(255) PRIMARY KEY,
    vendor_id BIGINT UNSIGNED NOT NULL,
    client_id BIGINT UNSIGNED,
    consultant_type VARCHAR(100) NOT NULL,
    status ENUM('active', 'paused', 'completed', 'error') DEFAULT 'active',
    context_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    INDEX idx_vendor_status (vendor_id, status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Template prompt dinamici
CREATE TABLE ai_prompt_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    specialization VARCHAR(100) NOT NULL,
    template_type ENUM('system', 'extraction', 'summary', 'tasks') NOT NULL,
    content TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_spec_type (specialization, template_type, version),
    INDEX idx_specialization (specialization),
    INDEX idx_active (is_active)
);

-- Cache sessioni per performance
CREATE TABLE session_cache (
    session_id VARCHAR(255) PRIMARY KEY,
    data_type ENUM('transcript', 'suggestions', 'context') NOT NULL,
    data_content LONGTEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_type (session_id, data_type),
    INDEX idx_expires (expires_at)
);
```

## Performance e Scalabilità

### Caching Strategy

#### Multi-Level Caching
```php
// 1. Application Level Cache
Cache::remember("session_{$sessionId}", 3600, function() {
    return $this->getSessionData($sessionId);
});

// 2. Database Query Cache
DB::table('ai_sessions')
    ->where('vendor_id', $vendorId)
    ->remember(1800)
    ->get();

// 3. API Response Cache
$cacheKey = "ai_response_" . md5($prompt);
Cache::remember($cacheKey, 7200, function() use ($prompt) {
    return $this->callAIService($prompt);
});
```

#### Cache Invalidation Strategy
```php
class CacheManager
{
    public function invalidateSession(string $sessionId): void
    {
        $tags = ["session_{$sessionId}", "user_sessions"];
        Cache::tags($tags)->flush();
    }
    
    public function invalidateUserData(int $userId): void
    {
        Cache::tags(["user_{$userId}"])->flush();
    }
}
```

### Queue System per Performance

#### Background Job Processing
```php
// Audio processing job
class ProcessAudioChunkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function handle(AIOrchestrationService $aiService): void
    {
        $result = $aiService->processAudioChunk(
            $this->audioData, 
            $this->sessionId
        );
        
        // Broadcast results via WebSocket
        broadcast(new AudioProcessedEvent($this->sessionId, $result));
    }
}

// Report generation job
class GenerateReportJob implements ShouldQueue
{
    public function handle(ReportGenerationService $reportService): void
    {
        $report = $reportService->generateReport($this->sessionData);
        
        // Notify user of completion
        broadcast(new ReportGeneratedEvent($this->sessionId, $report));
    }
}
```

### Real-time Communication

#### WebSocket Events
```php
// Session events
class SessionStartedEvent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel("session.{$this->sessionId}")];
    }
}

class AudioProcessedEvent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel("session.{$this->sessionId}")];
    }
}

class SuggestionGeneratedEvent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel("session.{$this->sessionId}")];
    }
}
```

#### Frontend WebSocket Handling
```javascript
// Echo configuration
window.Echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.MIX_PUSHER_APP_KEY,
    cluster: process.env.MIX_PUSHER_APP_CLUSTER,
    forceTLS: true
});

// Session channel subscription
const sessionChannel = Echo.private(`session.${sessionId}`)
    .listen('AudioProcessedEvent', (e) => {
        ChatInterface.addTranscription(e.transcript);
        if (e.suggestions.length > 0) {
            SuggestionPanel.addSuggestions(e.suggestions);
        }
    })
    .listen('SuggestionGeneratedEvent', (e) => {
        SuggestionPanel.addSuggestion(e.suggestion);
    })
    .listen('SessionEndedEvent', (e) => {
        SessionManager.handleSessionEnd(e.report);
    });
```

## Security e Compliance

### Data Protection

#### Audio Data Encryption
```php
class AudioEncryptionService
{
    public function encryptAudioChunk(string $audioData): string
    {
        return encrypt($audioData, [
            'cipher' => 'AES-256-GCM',
            'key' => config('app.audio_encryption_key')
        ]);
    }
    
    public function decryptAudioChunk(string $encryptedData): string
    {
        return decrypt($encryptedData);
    }
}
```

#### GDPR Compliance
```php
class GDPRComplianceService
{
    public function anonymizeSessionData(string $sessionId): void
    {
        DB::transaction(function() use ($sessionId) {
            // Remove personal identifiers
            DB::table('ai_sessions')
                ->where('id', $sessionId)
                ->update([
                    'context_data' => $this->anonymizeContext($context),
                    'anonymized_at' => now()
                ]);
                
            // Schedule data deletion
            DeleteSessionDataJob::dispatch($sessionId)
                ->delay(now()->addDays(30));
        });
    }
}
```

### API Security

#### Rate Limiting
```php
// routes/api.php
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/ai-copilot/process-audio', [AiCoPilotController::class, 'processAudio']);
    Route::post('/ai-copilot/get-insights', [AiCoPilotController::class, 'getInsights']);
});

// Custom rate limiter for AI endpoints
RateLimiter::for('ai-processing', function (Request $request) {
    return Limit::perMinute(30)->by($request->user()->id);
});
```

#### Input Validation
```php
class ProcessAudioRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'audio_data' => 'required|string|max:1048576', // 1MB max
            'session_id' => 'required|string|exists:ai_sessions,id',
            'chunk_index' => 'required|integer|min:0'
        ];
    }
    
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (!$this->isValidAudioData($this->audio_data)) {
                $validator->errors()->add('audio_data', 'Invalid audio format');
            }
        });
    }
}
```

## Monitoring e Observability

### Application Monitoring
```php
// Custom metrics collection
class MetricsCollector
{
    public function recordAudioProcessingTime(float $duration): void
    {
        Metrics::histogram('audio_processing_duration_seconds')
            ->observe($duration);
    }
    
    public function recordAIResponseTime(string $service, float $duration): void
    {
        Metrics::histogram('ai_response_duration_seconds')
            ->labels(['service' => $service])
            ->observe($duration);
    }
    
    public function incrementSessionCount(): void
    {
        Metrics::counter('active_sessions_total')->inc();
    }
}
```

### Error Tracking
```php
// Custom error handler
class AIErrorHandler
{
    public function handleAIServiceError(Exception $e, array $context): void
    {
        Log::error('AI Service Error', [
            'exception' => $e->getMessage(),
            'context' => $context,
            'trace' => $e->getTraceAsString()
        ]);
        
        // Send to Sentry
        app('sentry')->captureException($e, $context);
        
        // Trigger fallback mechanism
        $this->triggerFallback($context);
    }
}
```

Questa architettura tecnica fornisce una base solida per implementare il nuovo sistema AI Co-Pilota Pro, garantendo scalabilità, performance e manutenibilità a lungo termine.

