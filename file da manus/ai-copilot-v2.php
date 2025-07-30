<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AiCoPilotControllerV2;

/*
|--------------------------------------------------------------------------
| AI Co-Pilota Pro v2.0 Routes
|--------------------------------------------------------------------------
|
| Route dedicate per il nuovo sistema AI Co-Pilota Pro v2.0
| Compatibile con Laravel 9.x
|
*/

// Gruppo route con middleware vendor auth
Route::middleware(['auth:vendor'])->prefix('ai-copilot-v2')->name('ai-copilot-v2.')->group(function () {
    
    // Pagina principale
    Route::get('/', [AiCoPilotControllerV2::class, 'showPage'])->name('index');
    
    // Gestione sessioni
    Route::post('/session/start', [AiCoPilotControllerV2::class, 'startSession'])->name('session.start');
    Route::post('/session/end', [AiCoPilotControllerV2::class, 'endSession'])->name('session.end');
    
    // Elaborazione audio
    Route::post('/process-audio-chunk', [AiCoPilotControllerV2::class, 'processAudioChunk'])->name('audio.process');
    
    // Gestione clienti
    Route::post('/client/find', [AiCoPilotControllerV2::class, 'findClient'])->name('client.find');
    Route::post('/client/create', [AiCoPilotControllerV2::class, 'createClient'])->name('client.create');
    
    // Gestione meeting
    Route::post('/meeting/store', [AiCoPilotControllerV2::class, 'storeMeeting'])->name('meeting.store');
    
    // API per suggerimenti AI
    Route::post('/ai/get-insights', [AiCoPilotControllerV2::class, 'getInsights'])->name('ai.insights');
    Route::post('/ai/web-search', [AiCoPilotControllerV2::class, 'performWebSearch'])->name('ai.search');
    
    // Gestione report
    Route::get('/report/{meetingId}', [AiCoPilotControllerV2::class, 'getReport'])->name('report.get');
    Route::post('/report/generate', [AiCoPilotControllerV2::class, 'generateReport'])->name('report.generate');
    
    // Configurazione e status
    Route::get('/config', [AiCoPilotControllerV2::class, 'getConfig'])->name('config');
    Route::get('/status', [AiCoPilotControllerV2::class, 'getStatus'])->name('status');
});

// Route pubbliche (senza auth) per webhook e callback
Route::prefix('ai-copilot-v2/public')->name('ai-copilot-v2.public.')->group(function () {
    
    // Webhook per servizi esterni
    Route::post('/webhook/speech-callback', [AiCoPilotControllerV2::class, 'speechWebhook'])->name('webhook.speech');
    Route::post('/webhook/ai-callback', [AiCoPilotControllerV2::class, 'aiWebhook'])->name('webhook.ai');
    
    // Health check
    Route::get('/health', [AiCoPilotControllerV2::class, 'healthCheck'])->name('health');
});

// Route per testing (solo in ambiente non-produzione)
if (app()->environment(['local', 'testing', 'staging'])) {
    Route::prefix('ai-copilot-v2/test')->name('ai-copilot-v2.test.')->group(function () {
        
        // Test audio processing
        Route::post('/audio/test', [AiCoPilotControllerV2::class, 'testAudioProcessing'])->name('audio.test');
        
        // Test AI services
        Route::post('/ai/test', [AiCoPilotControllerV2::class, 'testAIServices'])->name('ai.test');
        
        // Test database
        Route::get('/db/test', [AiCoPilotControllerV2::class, 'testDatabase'])->name('db.test');
        
        // Debug info
        Route::get('/debug', [AiCoPilotControllerV2::class, 'getDebugInfo'])->name('debug');
    });
}

