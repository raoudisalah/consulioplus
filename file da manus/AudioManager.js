/**
 * AudioManager - Gestione audio per AI Co-Pilota Pro v2.0
 * 
 * Gestisce registrazione audio, elaborazione in tempo reale
 * e integrazione con Speech-to-Text API
 */

export class AudioManager {
    constructor(options = {}) {
        this.options = {
            sampleRate: 16000,
            bufferSize: 4096,
            channels: 1,
            chunkDuration: 3000, // 3 secondi per chunk
            silenceThreshold: 0.01,
            silenceTimeout: 2000, // 2 secondi di silenzio
            ...options
        };
        
        // Stato audio
        this.isRecording = false;
        this.isPaused = false;
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.analyser = null;
        this.processor = null;
        
        // Buffer per chunk audio
        this.audioBuffer = [];
        this.chunkIndex = 0;
        this.lastChunkTime = 0;
        
        // Rilevamento silenzio
        this.silenceTimer = null;
        this.lastSoundTime = 0;
        
        // Callbacks
        this.onTranscription = null;
        this.onError = null;
        this.onVolumeChange = null;
        
        // State manager reference
        this.stateManager = options.stateManager;
        
        // Supporto browser
        this.isSupported = this.checkBrowserSupport();
    }
    
    /**
     * Inizializza AudioManager
     */
    async initialize() {
        try {
            if (!this.isSupported) {
                throw new Error('Browser non supporta Web Audio API o MediaRecorder');
            }
            
            // Richiedi permessi microfono
            await this.requestMicrophonePermission();
            
            // Setup audio context
            await this.setupAudioContext();
            
            console.log('AudioManager inizializzato', {
                sampleRate: this.options.sampleRate,
                bufferSize: this.options.bufferSize,
                supported: this.isSupported
            });
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.set('audio.supported', true);
                this.stateManager.set('audio.error', null);
            }
            
        } catch (error) {
            console.error('Errore inizializzazione AudioManager:', error);
            
            if (this.stateManager) {
                this.stateManager.set('audio.supported', false);
                this.stateManager.set('audio.error', error.message);
            }
            
            throw error;
        }
    }
    
    /**
     * Verifica supporto browser
     */
    checkBrowserSupport() {
        const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
        const hasMediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
        const hasMediaRecorder = 'MediaRecorder' in window;
        
        return hasWebAudio && hasMediaDevices && hasMediaRecorder;
    }
    
    /**
     * Richiede permessi microfono
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.options.sampleRate,
                    channelCount: this.options.channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Ferma stream temporaneo
            stream.getTracks().forEach(track => track.stop());
            
            console.log('Permessi microfono ottenuti');
            
        } catch (error) {
            console.error('Errore permessi microfono:', error);
            throw new Error('Permessi microfono richiesti per utilizzare il Co-Pilota AI');
        }
    }
    
    /**
     * Setup audio context
     */
    async setupAudioContext() {
        try {
            // Crea audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext({
                sampleRate: this.options.sampleRate
            });
            
            // Resume context se sospeso (policy browser)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log('Audio context creato', {
                sampleRate: this.audioContext.sampleRate,
                state: this.audioContext.state
            });
            
        } catch (error) {
            console.error('Errore setup audio context:', error);
            throw error;
        }
    }
    
    /**
     * Avvia registrazione
     */
    async startRecording() {
        try {
            if (this.isRecording) {
                console.warn('Registrazione già in corso');
                return;
            }
            
            // Ottieni stream microfono
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.options.sampleRate,
                    channelCount: this.options.channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Setup audio processing
            await this.setupAudioProcessing();
            
            // Setup MediaRecorder per backup
            this.setupMediaRecorder();
            
            // Avvia registrazione
            this.isRecording = true;
            this.isPaused = false;
            this.chunkIndex = 0;
            this.lastChunkTime = Date.now();
            
            // Avvia MediaRecorder
            this.mediaRecorder.start();
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.dispatch('AUDIO_START_RECORDING', {
                    context: this.audioContext,
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log('Registrazione audio avviata');
            
        } catch (error) {
            console.error('Errore avvio registrazione:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Setup audio processing con Web Audio API
     */
    async setupAudioProcessing() {
        try {
            // Crea source dal stream
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Crea analyser per volume monitoring
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connetti source -> analyser
            source.connect(this.analyser);
            
            // Setup processor per chunk processing
            if (this.audioContext.createScriptProcessor) {
                // Fallback per browser più vecchi
                this.processor = this.audioContext.createScriptProcessor(
                    this.options.bufferSize, 
                    this.options.channels, 
                    this.options.channels
                );
            } else {
                // Usa AudioWorklet se disponibile (più moderno)
                await this.setupAudioWorklet();
            }
            
            if (this.processor) {
                this.processor.onaudioprocess = (event) => {
                    this.processAudioData(event);
                };
                
                // Connetti analyser -> processor -> destination
                this.analyser.connect(this.processor);
                this.processor.connect(this.audioContext.destination);
            }
            
            // Avvia monitoring volume
            this.startVolumeMonitoring();
            
        } catch (error) {
            console.error('Errore setup audio processing:', error);
            throw error;
        }
    }
    
    /**
     * Setup AudioWorklet (più moderno)
     */
    async setupAudioWorklet() {
        try {
            // Carica worklet se disponibile
            if (this.audioContext.audioWorklet) {
                await this.audioContext.audioWorklet.addModule('/js/worklets/audio-processor.js');
                
                this.processor = new AudioWorkletNode(this.audioContext, 'audio-processor', {
                    processorOptions: {
                        bufferSize: this.options.bufferSize
                    }
                });
                
                this.processor.port.onmessage = (event) => {
                    this.handleWorkletMessage(event.data);
                };
            }
        } catch (error) {
            console.warn('AudioWorklet non disponibile, uso ScriptProcessor:', error);
        }
    }
    
    /**
     * Setup MediaRecorder per backup
     */
    setupMediaRecorder() {
        try {
            // Determina formato supportato
            const mimeType = this.getSupportedMimeType();
            
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.handleRecordedChunk(event.data);
                }
            };
            
            this.mediaRecorder.onerror = (error) => {
                console.error('Errore MediaRecorder:', error);
            };
            
        } catch (error) {
            console.error('Errore setup MediaRecorder:', error);
        }
    }
    
    /**
     * Ottiene MIME type supportato
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return 'audio/webm'; // Fallback
    }
    
    /**
     * Processa dati audio in tempo reale
     */
    processAudioData(event) {
        if (!this.isRecording || this.isPaused) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Aggiungi al buffer
        this.audioBuffer.push(...inputData);
        
        // Verifica se è tempo di inviare chunk
        const now = Date.now();
        if (now - this.lastChunkTime >= this.options.chunkDuration) {
            this.sendAudioChunk();
        }
        
        // Rileva silenzio
        this.detectSilence(inputData);
    }
    
    /**
     * Gestisce messaggi da AudioWorklet
     */
    handleWorkletMessage(data) {
        if (data.type === 'audioData') {
            this.audioBuffer.push(...data.audioData);
            
            const now = Date.now();
            if (now - this.lastChunkTime >= this.options.chunkDuration) {
                this.sendAudioChunk();
            }
        }
    }
    
    /**
     * Invia chunk audio per elaborazione
     */
    async sendAudioChunk() {
        if (this.audioBuffer.length === 0) return;
        
        try {
            // Converti buffer in formato appropriato
            const audioData = this.encodeAudioData(this.audioBuffer);
            
            // Invia al server per trascrizione
            await this.sendToServer(audioData, this.chunkIndex);
            
            // Reset buffer
            this.audioBuffer = [];
            this.chunkIndex++;
            this.lastChunkTime = Date.now();
            
        } catch (error) {
            console.error('Errore invio chunk audio:', error);
        }
    }
    
    /**
     * Codifica dati audio
     */
    encodeAudioData(buffer) {
        // Converti Float32Array in Int16Array (16-bit PCM)
        const int16Buffer = new Int16Array(buffer.length);
        
        for (let i = 0; i < buffer.length; i++) {
            // Clamp e converti a 16-bit
            const sample = Math.max(-1, Math.min(1, buffer[i]));
            int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        // Converti in base64 per invio
        const bytes = new Uint8Array(int16Buffer.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return btoa(binary);
    }
    
    /**
     * Invia dati al server
     */
    async sendToServer(audioData, chunkIndex) {
        try {
            const sessionId = this.stateManager?.get('session.id');
            
            if (!sessionId) {
                console.warn('Nessuna sessione attiva per invio audio');
                return;
            }
            
            const response = await fetch('/ai-copilot/process-audio-chunk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.csrfToken || document.querySelector('meta[name=\"csrf-token\"]')?.content
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    chunkIndex: chunkIndex,
                    audioData: audioData
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.transcript) {
                    // Notifica trascrizione
                    if (this.onTranscription) {
                        this.onTranscription(result.transcript, result.aiResponse);
                    }
                    
                    // Aggiorna stato
                    if (this.stateManager) {
                        this.stateManager.dispatch('ADD_MESSAGE', {
                            type: 'transcription',
                            content: result.transcript,
                            chunkIndex: chunkIndex
                        });
                        
                        if (result.aiResponse) {
                            this.stateManager.dispatch('ADD_SUGGESTION', result.aiResponse);
                        }
                    }
                }
            } else {
                console.error('Errore server elaborazione audio:', response.statusText);
            }
            
        } catch (error) {
            console.error('Errore invio audio al server:', error);
        }
    }
    
    /**
     * Gestisce chunk registrati da MediaRecorder
     */
    handleRecordedChunk(blob) {
        // Backup per chunk completi se necessario
        console.log('Chunk MediaRecorder ricevuto:', blob.size, 'bytes');
    }
    
    /**
     * Rileva silenzio
     */
    detectSilence(audioData) {
        // Calcola RMS (Root Mean Square) per rilevare volume
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sum / audioData.length);
        
        if (rms > this.options.silenceThreshold) {
            // C'è suono
            this.lastSoundTime = Date.now();
            
            // Cancella timer silenzio se attivo
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
        } else {
            // Silenzio rilevato
            if (!this.silenceTimer && this.lastSoundTime > 0) {
                this.silenceTimer = setTimeout(() => {
                    this.handleSilenceDetected();
                }, this.options.silenceTimeout);
            }
        }
    }
    
    /**
     * Gestisce silenzio prolungato
     */
    handleSilenceDetected() {
        console.log('Silenzio prolungato rilevato');
        
        // Invia chunk finale se presente
        if (this.audioBuffer.length > 0) {
            this.sendAudioChunk();
        }
        
        this.silenceTimer = null;
    }
    
    /**
     * Avvia monitoring volume
     */
    startVolumeMonitoring() {
        if (!this.analyser) return;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        const updateVolume = () => {
            if (!this.isRecording) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calcola volume medio
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volume = average / 255; // Normalizza 0-1
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.set('audio.level', volume);
            }
            
            // Callback volume
            if (this.onVolumeChange) {
                this.onVolumeChange(volume);
            }
            
            // Continua monitoring
            requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
    }
    
    /**
     * Ferma registrazione
     */
    async stopRecording() {
        try {
            if (!this.isRecording) {
                console.warn('Nessuna registrazione in corso');
                return;
            }
            
            this.isRecording = false;
            this.isPaused = false;
            
            // Invia chunk finale
            if (this.audioBuffer.length > 0) {
                await this.sendAudioChunk();
            }
            
            // Ferma MediaRecorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            
            // Disconnetti audio processing
            if (this.processor) {
                this.processor.disconnect();
            }
            
            if (this.analyser) {
                this.analyser.disconnect();
            }
            
            // Ferma stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            // Clear timers
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            
            // Aggiorna stato
            if (this.stateManager) {
                this.stateManager.dispatch('AUDIO_STOP_RECORDING', {
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log('Registrazione audio fermata');
            
        } catch (error) {
            console.error('Errore stop registrazione:', error);
            throw error;
        }
    }
    
    /**
     * Pausa registrazione
     */
    pauseRecording() {
        if (!this.isRecording || this.isPaused) return;
        
        this.isPaused = true;
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
        }
        
        if (this.stateManager) {
            this.stateManager.set('audio.paused', true);
        }
        
        console.log('Registrazione audio in pausa');
    }
    
    /**
     * Riprende registrazione
     */
    resumeRecording() {
        if (!this.isRecording || !this.isPaused) return;
        
        this.isPaused = false;
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
        }
        
        if (this.stateManager) {
            this.stateManager.set('audio.paused', false);
        }
        
        console.log('Registrazione audio ripresa');
    }
    
    /**
     * Cleanup risorse
     */
    cleanup() {
        // Ferma registrazione se attiva
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Chiudi audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        // Clear timers
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        
        // Reset stato
        this.isRecording = false;
        this.isPaused = false;
        this.audioBuffer = [];
        
        console.log('AudioManager cleanup completato');
    }
    
    /**
     * Ottiene info debug
     */
    getDebugInfo() {
        return {
            isSupported: this.isSupported,
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            bufferLength: this.audioBuffer.length,
            chunkIndex: this.chunkIndex,
            audioContextState: this.audioContext?.state,
            options: this.options
        };
    }
}

