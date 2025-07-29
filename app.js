// JARVIS Advanced AI Virtual Assistant with Enhanced Features
class JarvisAssistant {
    constructor() {
        this.isListening = false;
        this.commandHistory = [];
        this.maxHistoryItems = 15;
        this.weatherApiKey = null;
        this.newsApiKey = null;
        this.groqApiKey = ''; // Removed default key for security
        this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.openaiApiKey = '';
        this.openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
        this.spotifyClientId = '';
        this.spotifyRedirectUri = window.location.href;
        
        // Settings
        this.settings = this.loadSettings();
        this.currentTheme = this.settings.theme || 'dark';
        this.voiceSettings = this.settings.voice || { rate: 1, pitch: 1, voice: 'default' };
        this.aiSettings = this.settings.ai || { 
            model: 'llama3-8b-8192', 
            temperature: 0.7,
            provider: 'groq' 
        };
        
        // State
        this.recognizedText = '';
        this.isSpeaking = false;
        this.activeReminders = [];
        this.spotifyAccessToken = '';
        this.spotifyPlayer = null;
        
        // PWA variables
        this.deferredPrompt = null;
        this.installBtn = null;
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.initializeSpeechSynthesis();
        this.initializeEventListeners();
        this.initializeSettings();
        this.initializePWA();
        this.loadingSequence();
        this.checkReminders();
    }

    initializeElements() {
        // Core elements
        this.voiceBtn = document.getElementById('voiceBtn');
        this.micIcon = document.getElementById('micIcon');
        this.content = document.getElementById('content');
        this.listeningIndicator = document.getElementById('listeningIndicator');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.historyList = document.getElementById('historyList');
        this.avatar = document.getElementById('avatar');
        this.pulseRing = document.getElementById('pulseRing');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // Settings elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.closeSettings = document.getElementById('closeSettings');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.voiceRate = document.getElementById('voiceRate');
        this.voicePitch = document.getElementById('voicePitch');
        this.themeSelect = document.getElementById('themeSelect');
        this.animationToggle = document.getElementById('animationToggle');
        this.aiModel = document.getElementById('aiModel');
        this.aiTemperature = document.getElementById('aiTemperature');
        this.aiProvider = document.getElementById('aiProvider');
        this.saveSettings = document.getElementById('saveSettings');
        this.resetSettings = document.getElementById('resetSettings');
        this.weatherApiKeyInput = document.getElementById('weatherApiKey');
        this.newsApiKeyInput = document.getElementById('newsApiKey');
        this.groqApiKeyInput = document.getElementById('groqApiKey');
        this.openaiApiKeyInput = document.getElementById('openaiApiKey');
        this.spotifyClientIdInput = document.getElementById('spotifyClientId');

        // Notification container
        this.notificationContainer = document.getElementById('notificationContainer');

        // Quick action buttons
        this.actionBtns = document.querySelectorAll('.action-btn');
        
        // Install button
        this.installBtn = document.getElementById('installBtn');
    }

    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.showNotification('Speech recognition is not supported in this browser.', 'error');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.setListeningState(true);
        };

        this.recognition.onresult = (event) => {
            const currentIndex = event.resultIndex;
            const transcript = event.results[currentIndex][0].transcript;
            
            // Update UI with interim results
            if (event.results[currentIndex].isFinal) {
                this.recognizedText = transcript.trim();
                this.content.textContent = this.recognizedText;
                this.addToHistory(this.recognizedText);
                this.processCommand(this.recognizedText.toLowerCase());
            } else {
                this.content.textContent = transcript;
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.setListeningState(false);
            
            let errorMessage = `Speech recognition error: ${event.error}`;
            if (event.error === 'not-allowed') {
                errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'No speech detected. Please try again.';
            }
            
            this.showNotification(errorMessage, 'error');
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Automatically restart recognition if still listening
                setTimeout(() => {
                    if (this.isListening) {
                        this.recognition.start();
                    }
                }, 100);
            } else {
                this.setListeningState(false);
            }
        };
    }

    initializeSpeechSynthesis() {
        // Populate voices when they become available
        speechSynthesis.onvoiceschanged = () => {
            this.populateVoiceOptions();
        };
        this.populateVoiceOptions();
    }

    initializeEventListeners() {
        // Voice button
        this.voiceBtn.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        // Clear history button
        this.clearHistoryBtn.addEventListener('click', () => {
            this.commandHistory = [];
            this.updateHistoryDisplay();
            this.showNotification('Command history cleared', 'success');
        });

        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsPanel());
        this.saveSettings.addEventListener('click', () => this.saveSettingsToStorage());
        this.resetSettings.addEventListener('click', () => this.resetSettingsToDefault());

        // Quick action buttons
        this.actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.openSettings();
            }
            if (e.key === 'Escape') {
                this.closeSettingsPanel();
                if (this.isListening) {
                    this.stopListening();
                }
            }
            if (e.key === ' ' && e.ctrlKey) {
                e.preventDefault();
                if (this.isListening) {
                    this.stopListening();
                } else {
                    this.startListening();
                }
            }
        });

        // Theme change
        this.themeSelect.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });

        // Voice settings
        this.voiceSelect.addEventListener('change', (e) => {
            this.voiceSettings.voice = e.target.value;
            this.updateVoiceSettingsDisplay();
        });

        this.voiceRate.addEventListener('input', (e) => {
            this.voiceSettings.rate = parseFloat(e.target.value);
            this.updateVoiceSettingsDisplay();
        });

        this.voicePitch.addEventListener('input', (e) => {
            this.voiceSettings.pitch = parseFloat(e.target.value);
            this.updateVoiceSettingsDisplay();
        });

        // AI settings
        this.aiModel.addEventListener('change', (e) => {
            this.aiSettings.model = e.target.value;
        });

        this.aiTemperature.addEventListener('input', (e) => {
            this.aiSettings.temperature = parseFloat(e.target.value);
            document.getElementById('tempValue').textContent = e.target.value;
        });

        this.aiProvider.addEventListener('change', (e) => {
            this.aiSettings.provider = e.target.value;
            this.updateModelOptions();
        });

        // Install button
        if (this.installBtn) {
            this.installBtn.addEventListener('click', () => this.promptInstall());
        }
    }

    updateVoiceSettingsDisplay() {
        document.getElementById('rateValue').textContent = this.voiceSettings.rate.toFixed(1);
        document.getElementById('pitchValue').textContent = this.voiceSettings.pitch.toFixed(1);
    }

    updateModelOptions() {
        const provider = this.aiSettings.provider || 'groq';
        const modelSelect = document.getElementById('aiModel');
        
        // Clear existing options
        modelSelect.innerHTML = '';
        
        // Add options based on provider
        if (provider === 'groq') {
            const models = [
                { value: 'llama3-8b-8192', label: 'Llama3-8b' },
                { value: 'mixtral-8x7b-32768', label: 'Mixtral-8x7b' },
                { value: 'gemma-7b-it', label: 'Gemma-7b' }
            ];
            
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                modelSelect.appendChild(option);
            });
            
            modelSelect.value = this.aiSettings.model || 'llama3-8b-8192';
        } else if (provider === 'openai') {
            const models = [
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
            ];
            
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.value;
                option.textContent = model.label;
                modelSelect.appendChild(option);
            });
            
            modelSelect.value = this.aiSettings.model || 'gpt-3.5-turbo';
        }
    }

    initializeSettings() {
        this.populateVoiceOptions();
        this.applyTheme(this.currentTheme);
        
        // Set form values
        this.themeSelect.value = this.currentTheme;
        this.voiceSelect.value = this.voiceSettings.voice;
        this.voiceRate.value = this.voiceSettings.rate;
        this.voicePitch.value = this.voiceSettings.pitch;
        this.aiModel.value = this.aiSettings.model;
        this.aiTemperature.value = this.aiSettings.temperature;
        this.aiProvider.value = this.aiSettings.provider || 'groq';
        this.weatherApiKeyInput.value = this.settings.weatherApiKey || '';
        this.newsApiKeyInput.value = this.settings.newsApiKey || '';
        this.groqApiKeyInput.value = this.settings.groqApiKey || '';
        this.openaiApiKeyInput.value = this.settings.openaiApiKey || '';
        this.spotifyClientIdInput.value = this.settings.spotifyClientId || '';
        
        this.updateVoiceSettingsDisplay();
        this.updateModelOptions();
    }

    populateVoiceOptions() {
        const voices = speechSynthesis.getVoices();
        this.voiceSelect.innerHTML = '<option value="default">Default System Voice</option>';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' - Default' : ''}`;
            this.voiceSelect.appendChild(option);
        });
        
        // Restore selected voice if available
        if (this.voiceSettings.voice && voices.some(v => v.name === this.voiceSettings.voice)) {
            this.voiceSelect.value = this.voiceSettings.voice;
        }
    }

    loadingSequence() {
        setTimeout(() => {
            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                this.loadingOverlay.style.display = 'none';
                this.wishMe();
                
                // Check for updates
                this.checkForUpdates();
                
                // Initialize Spotify if client ID is available
                if (this.settings.spotifyClientId) {
                    this.initializeSpotify();
                }
            }, 500);
        }, 2000);
    }

    setListeningState(listening) {
        this.isListening = listening;
        
        if (listening) {
            this.voiceBtn.classList.add('listening');
            this.micIcon.classList.add('pulse');
            this.listeningIndicator.style.display = 'flex';
            this.statusDot.classList.add('listening');
            this.updateStatus('Listening...', 'info');
            this.recognition.start();
        } else {
            this.voiceBtn.classList.remove('listening');
            this.micIcon.classList.remove('pulse');
            this.listeningIndicator.style.display = 'none';
            this.statusDot.classList.remove('listening');
            this.updateStatus('Ready', 'success');
        }
    }

    startListening() {
        if (!this.isListening) {
            this.setListeningState(true);
            this.showNotification('Listening... Speak now', 'info', 2000);
        }
    }

    stopListening() {
        if (this.isListening) {
            this.recognition.stop();
            this.setListeningState(false);
        }
    }

    speak(text, onEnd) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            this.isSpeaking = false;
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set voice if available
            if (this.voiceSettings.voice !== 'default') {
                const voices = speechSynthesis.getVoices();
                const selectedVoice = voices.find(v => v.name === this.voiceSettings.voice);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }
            
            utterance.rate = this.voiceSettings.rate;
            utterance.pitch = this.voiceSettings.pitch;
            
            utterance.onstart = () => {
                this.isSpeaking = true;
                this.avatar.classList.add('speaking');
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                this.avatar.classList.remove('speaking');
                if (onEnd) onEnd();
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                this.isSpeaking = false;
                this.avatar.classList.remove('speaking');
                this.showNotification('Error in speech synthesis', 'error');
                if (onEnd) onEnd();
            };
            
            speechSynthesis.speak(utterance);
        } else {
            this.showNotification('Speech synthesis not supported in this browser', 'error');
            if (onEnd) onEnd();
        }
    }

    async wishMe() {
        const hour = new Date().getHours();
        let greeting = '';
        
        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning!';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good afternoon!';
        } else {
            greeting = 'Good evening!';
        }
        
        const message = `${greeting} I am JARVIS, your AI assistant. How can I help you today?`;
        this.speak(message);
        this.updateStatus(message, 'success');
    }

    addToHistory(command) {
        // Don't add empty or duplicate commands
        if (!command.trim() || (this.commandHistory.length > 0 && this.commandHistory[0] === command)) {
            return;
        }
        
        this.commandHistory.unshift(command);
        if (this.commandHistory.length > this.maxHistoryItems) {
            this.commandHistory.pop();
        }
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        this.historyList.innerHTML = '';
        this.commandHistory.forEach(command => {
            const item = document.createElement('li');
            item.className = 'history-item';
            item.textContent = command;
            item.addEventListener('click', () => {
                this.content.textContent = command;
                this.processCommand(command.toLowerCase());
            });
            this.historyList.appendChild(item);
        });
    }

    updateStatus(text, type = 'success') {
        this.statusText.textContent = text;
        this.statusText.className = `status-text ${type}`;
        
        // Update status dot color based on type
        this.statusDot.className = 'status-dot';
        this.statusDot.classList.add(type);
        
        if (type === 'listening') {
            this.statusDot.classList.add('pulse');
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this.getNotificationIcon(type)}</div>
            <div class="notification-content">${message}</div>
            <button class="notification-close">&times;</button>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Auto remove
        const timeout = setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, duration);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(timeout);
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ',
            listening: '🎤'
        };
        return icons[type] || icons.info;
    }

    openSettings() {
        this.settingsPanel.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeSettingsPanel() {
        this.settingsPanel.classList.remove('active');
        document.body.style.overflow = '';
    }

    saveSettingsToStorage() {
        const settings = {
            theme: this.currentTheme,
            voice: this.voiceSettings,
            ai: {
                model: this.aiSettings.model,
                temperature: this.aiSettings.temperature,
                provider: this.aiSettings.provider
            },
            weatherApiKey: this.weatherApiKeyInput.value.trim(),
            newsApiKey: this.newsApiKeyInput.value.trim(),
            groqApiKey: this.groqApiKeyInput.value.trim(),
            openaiApiKey: this.openaiApiKeyInput.value.trim(),
            spotifyClientId: this.spotifyClientIdInput.value.trim()
        };
        
        localStorage.setItem('jarvisSettings', JSON.stringify(settings));
        this.settings = settings;
        
        // Update API keys
        this.weatherApiKey = settings.weatherApiKey;
        this.newsApiKey = settings.newsApiKey;
        this.groqApiKey = settings.groqApiKey;
        this.openaiApiKey = settings.openaiApiKey;
        
        this.showNotification('Settings saved successfully!', 'success');
        
        // Reinitialize Spotify if client ID changed
        if (settings.spotifyClientId) {
            this.initializeSpotify();
        }
    }

    resetSettingsToDefault() {
        if (!confirm('Are you sure you want to reset all settings to default?')) {
            return;
        }
        
        const defaultSettings = {
            theme: 'dark',
            voice: { voice: 'default', rate: 1, pitch: 1 },
            ai: { 
                model: 'llama3-8b-8192', 
                temperature: 0.7,
                provider: 'groq'
            },
            weatherApiKey: '',
            newsApiKey: '',
            groqApiKey: '',
            openaiApiKey: '',
            spotifyClientId: ''
        };

        localStorage.setItem('jarvisSettings', JSON.stringify(defaultSettings));
        this.settings = defaultSettings;
        this.voiceSettings = defaultSettings.voice;
        this.aiSettings = defaultSettings.ai;
        this.currentTheme = defaultSettings.theme;
        this.weatherApiKey = '';
        this.newsApiKey = '';
        this.groqApiKey = '';
        this.openaiApiKey = '';

        // Reset form values
        this.themeSelect.value = 'dark';
        this.voiceSelect.value = 'default';
        this.voiceRate.value = 1;
        this.voicePitch.value = 1;
        this.aiModel.value = 'llama3-8b-8192';
        this.aiTemperature.value = 0.7;
        this.aiProvider.value = 'groq';
        this.weatherApiKeyInput.value = '';
        this.newsApiKeyInput.value = '';
        this.groqApiKeyInput.value = '';
        this.openaiApiKeyInput.value = '';
        this.spotifyClientIdInput.value = '';
        
        this.updateVoiceSettingsDisplay();
        this.applyTheme('dark');
        this.showNotification('Settings reset to default!', 'info');
    }

    loadSettings() {
        const saved = localStorage.getItem('jarvisSettings');
        return saved ? JSON.parse(saved) : {
            theme: 'dark',
            voice: { voice: 'default', rate: 1, pitch: 1 },
            ai: { 
                model: 'llama3-8b-8192', 
                temperature: 0.7,
                provider: 'groq'
            },
            weatherApiKey: '',
            newsApiKey: '',
            groqApiKey: '',
            openaiApiKey: '',
            spotifyClientId: ''
        };
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
    }

    // AI Integration
    async callAI(userMessage) {
        const provider = this.aiSettings.provider || 'groq';
        
        if (provider === 'groq') {
            return this.callGroqAI(userMessage);
        } else if (provider === 'openai') {
            return this.callOpenAI(userMessage);
        }
    }

    async callGroqAI(userMessage) {
        if (!this.groqApiKey) {
            this.showNotification('Groq API key not configured', 'error');
            return null;
        }
        
        try {
            const response = await fetch(this.groqApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.aiSettings.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are JARVIS, an advanced AI assistant. You are helpful, friendly, and concise. 
                            You can help with various tasks like answering questions, providing information, 
                            telling jokes, and assisting with daily tasks. Keep responses conversational and 
                            not too long. If asked about specific tasks like weather, time, or opening websites, 
                            respond appropriately. You have access to real-time information and can help with 
                            calculations, explanations, and general knowledge.`
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    temperature: this.aiSettings.temperature,
                    max_tokens: 500,
                    top_p: 1,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Groq API Error:', error);
            return null;
        }
    }

    async callOpenAI(userMessage) {
        if (!this.openaiApiKey) {
            this.showNotification('OpenAI API key not configured', 'error');
            return null;
        }
        
        try {
            const response = await fetch(this.openaiApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.aiSettings.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are JARVIS, an advanced AI assistant. You are helpful, friendly, and concise. 
                            You can help with various tasks like answering questions, providing information, 
                            telling jokes, and assisting with daily tasks. Keep responses conversational and 
                            not too long. If asked about specific tasks like weather, time, or opening websites, 
                            respond appropriately. You have access to real-time information and can help with 
                            calculations, explanations, and general knowledge.`
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    temperature: this.aiSettings.temperature,
                    max_tokens: 500,
                    top_p: 1,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            return null;
        }
    }

    async processCommand(message) {
        try {
            // Check for specific commands first
            if (message.includes('time') || message.includes('what time is it')) {
                await this.getTime();
                return;
            }
            
            if (message.includes('date') || message.includes('what day is it')) {
                await this.getDate();
                return;
            }
            
            if (message.includes('weather') || message.includes('temperature')) {
                await this.getWeather(message);
                return;
            }
            
            if (message.includes('news') || message.includes('headlines')) {
                await this.getNews();
                return;
            }
            
            if (message.includes('joke') || message.includes('tell me something funny')) {
                await this.getJoke();
                return;
            }
            
            if (message.includes('music') || message.includes('play') || message.includes('song')) {
                await this.handleMusic(message);
                return;
            }
            
            if (message.includes('email') || message.includes('mail')) {
                await this.handleEmail(message);
                return;
            }
            
            if (message.includes('screenshot') || message.includes('capture')) {
                await this.takeScreenshot();
                return;
            }
            
            if (message.includes('reminder') || message.includes('remind me')) {
                await this.setReminder(message);
                return;
            }
            
            if (message.includes('search') && message.includes('web')) {
                const query = message.replace('search web', '').replace('search for', '').trim();
                await this.searchWeb(query);
                return;
            }
            
            if (message.includes('wikipedia') || message.includes('wiki')) {
                const query = message.replace(/wikipedia|wiki/gi, '').trim();
                await this.searchWikipedia(query);
                return;
            }
            
            if (message.includes('help') || message.includes('what can you do')) {
                await this.showHelp();
                return;
            }
            
            if (message.includes('clear history') || message.includes('reset history')) {
                this.commandHistory = [];
                this.updateHistoryDisplay();
                this.speak("Command history cleared");
                return;
            }
            
            if (message.includes('settings') || message.includes('preferences')) {
                this.openSettings();
                this.speak("Opening settings");
                return;
            }
            
            if (message.includes('stop') || message.includes('cancel')) {
                if (this.isListening) {
                    this.stopListening();
                    this.speak("Stopped listening");
                } else if (this.isSpeaking) {
                    speechSynthesis.cancel();
                    this.speak("Stopped speaking");
                }
                return;
            }
            
            // If no specific command, use AI
            const aiResponse = await this.callAI(message);
            if (aiResponse) {
                this.speak(aiResponse);
                this.updateStatus(aiResponse, 'success');
            } else {
                this.speak("I'm sorry, I couldn't process that request. Please check your API key in settings.");
                this.updateStatus("AI service unavailable. Check your API key in settings.", 'error');
            }
            
        } catch (error) {
            console.error('Error processing command:', error);
            this.speak("I encountered an error processing your request.");
            this.updateStatus("Error processing command", 'error');
        }
    }

    async getTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const message = `The current time is ${timeString}`;
        this.speak(message);
        this.updateStatus(message, 'success');
    }

    async getDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const message = `Today is ${dateString}`;
        this.speak(message);
        this.updateStatus(message, 'success');
    }

    async getWeather(message) {
        if (!this.weatherApiKey) {
            this.speak("Please add your weather API key in settings to get weather information.");
            this.updateStatus("Add weather API key in settings", 'warning');
            return;
        }
        
        try {
            // Extract location if mentioned
            let location = 'current location';
            const locationMatch = message.match(/weather in (.+)/i);
            if (locationMatch && locationMatch[1]) {
                location = locationMatch[1];
            }
            
            // For demo purposes, we'll simulate weather data
            // In a real app, you would call a weather API here
            const weatherConditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
            const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
            const randomTemp = Math.floor(Math.random() * 30) + 10; // 10-40°C
            
            const message = `The weather in ${location} is ${randomCondition} with a temperature of ${randomTemp} degrees Celsius.`;
            this.speak(message);
            this.updateStatus(message, 'success');
            
        } catch (error) {
            console.error('Weather error:', error);
            this.speak("Sorry, I couldn't fetch the weather information.");
            this.updateStatus("Weather service error", 'error');
        }
    }

    async getNews() {
        if (!this.newsApiKey) {
            this.speak("Please add your news API key in settings to get news updates.");
            this.updateStatus("Add news API key in settings", 'warning');
            return;
        }
        
        try {
            // For demo purposes, we'll simulate news data
            // In a real app, you would call a news API here
            const newsTopics = [
                "Tech companies announce new AI innovations",
                "Global leaders meet to discuss climate change",
                "Scientists discover potential breakthrough in renewable energy",
                "Stock markets show mixed results in today's trading",
                "New health study reveals benefits of regular exercise"
            ];
            
            const randomNews = newsTopics[Math.floor(Math.random() * newsTopics.length)];
            const message = `Here's a news headline: ${randomNews}`;
            this.speak(message);
            this.updateStatus(message, 'success');
            
        } catch (error) {
            console.error('News error:', error);
            this.speak("Sorry, I couldn't fetch the latest news.");
            this.updateStatus("News service error", 'error');
        }
    }

    async getJoke() {
        try {
            // Try Chuck Norris API first
            const response = await fetch('https://api.chucknorris.io/jokes/random');
            const data = await response.json();
            this.speak(data.value);
            this.updateStatus(data.value, 'success');
        } catch (error) {
            console.error('Joke API error:', error);
            
            // Fallback jokes if API fails
            const fallbackJokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.",
                "Why don't skeletons fight each other? They don't have the guts.",
                "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                "What do you call a fake noodle? An impasta!"
            ];
            
            const randomJoke = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
            this.speak(randomJoke);
            this.updateStatus(randomJoke, 'success');
        }
    }

    async handleMusic(message) {
        if (!this.settings.spotifyClientId) {
            this.speak("Please configure Spotify in settings to use music features.");
            this.updateStatus("Spotify not configured", 'warning');
            return;
        }
        
        try {
            // Check if we have an access token
            if (!this.spotifyAccessToken) {
                await this.authenticateSpotify();
                if (!this.spotifyAccessToken) {
                    throw new Error("Spotify authentication failed");
                }
            }
            
            // Parse the command
            if (message.includes('play') || message.includes('start')) {
                let query = '';
                
                if (message.includes('play song') || message.includes('play the song')) {
                    query = message.replace(/play (the )?song/i, '').trim();
                } else if (message.includes('play artist') || message.includes('play music by')) {
                    query = message.replace(/play (the )?artist/i, '').replace(/play music by/i, '').trim();
                } else if (message.includes('play')) {
                    query = message.replace(/play/i, '').trim();
                }
                
                if (query) {
                    await this.playSpotifyTrack(query);
                } else {
                    await this.resumeSpotifyPlayback();
                }
            } else if (message.includes('pause') || message.includes('stop')) {
                await this.pauseSpotifyPlayback();
                this.speak("Music paused");
                this.updateStatus("Music paused", 'success');
            } else if (message.includes('next') || message.includes('skip')) {
                await this.skipSpotifyTrack();
                this.speak("Skipping to next track");
                this.updateStatus("Skipping track", 'success');
            } else if (message.includes('previous') || message.includes('back')) {
                await this.previousSpotifyTrack();
                this.speak("Playing previous track");
                this.updateStatus("Previous track", 'success');
            } else {
                this.speak("What would you like to do with music? Play, pause, skip, or go back?");
                this.updateStatus("Music command not recognized", 'info');
            }
            
        } catch (error) {
            console.error('Music error:', error);
            this.speak("Sorry, I couldn't process your music request.");
            this.updateStatus("Music service error", 'error');
        }
    }

    async handleEmail(message) {
        try {
            // Parse the command
            if (message.includes('send email') || message.includes('compose email')) {
                const toMatch = message.match(/to (.+?) (about|subject)/i) || message.match(/to (.+)/i);
                const subjectMatch = message.match(/(about|subject) (.+)/i);
                
                const to = toMatch ? toMatch[1] : '';
                const subject = subjectMatch ? subjectMatch[2] : '';
                
                if (to && subject) {
                    // In a real app, you would integrate with an email API or service here
                    // For demo purposes, we'll simulate sending an email
                    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}`;
                    window.open(mailtoLink, '_blank');
                    
                    const response = `Opening email composer to send to ${to} about ${subject}`;
                    this.speak(response);
                    this.updateStatus(response, 'success');
                } else {
                    this.speak("Please specify who to send to and what the subject is.");
                    this.updateStatus("Incomplete email command", 'info');
                }
            } else {
                this.speak("Email feature is currently limited to opening your default email client.");
                this.updateStatus("Email feature info", 'info');
            }
        } catch (error) {
            console.error('Email error:', error);
            this.speak("Sorry, I couldn't process your email request.");
            this.updateStatus("Email service error", 'error');
        }
    }

    async takeScreenshot() {
        try {
            // In a real app, you would use a screenshot API or library
            // For demo purposes, we'll simulate taking a screenshot
            this.speak("Screenshot functionality requires additional browser permissions. For now, you can use your system's screenshot tools or browser extensions.");
            this.updateStatus("Screenshot feature info", 'info');
        } catch (error) {
            console.error('Screenshot error:', error);
            this.speak("Sorry, I couldn't take a screenshot at this time.");
            this.updateStatus("Screenshot error", 'error');
        }
    }

    async setReminder(message) {
        try {
            // Parse reminder details from message
            const timeMatch = message.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            const dateMatch = message.match(/(today|tomorrow|next week|in (\d+) (minutes?|hours?|days?))/i);
            
            let reminderTime = null;
            let reminderText = message.replace(/remind me to|reminder|set reminder/gi, '').trim();
            
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const ampm = timeMatch[3]?.toLowerCase();
                
                if (ampm === 'pm' && hours !== 12) hours += 12;
                if (ampm === 'am' && hours === 12) hours = 0;
                
                const now = new Date();
                reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
                
                if (reminderTime <= now) {
                    reminderTime.setDate(reminderTime.getDate() + 1);
                }
            } else if (dateMatch) {
                const now = new Date();
                if (dateMatch[1] === 'tomorrow') {
                    reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
                } else if (dateMatch[1] === 'next week') {
                    reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0);
                } else if (dateMatch[2] && dateMatch[3]) {
                    const amount = parseInt(dateMatch[2]);
                    const unit = dateMatch[3];
                    
                    if (unit.includes('minute')) {
                        reminderTime = new Date(now.getTime() + amount * 60000);
                    } else if (unit.includes('hour')) {
                        reminderTime = new Date(now.getTime() + amount * 3600000);
                    } else if (unit.includes('day')) {
                        reminderTime = new Date(now.getTime() + amount * 86400000);
                    }
                }
            }
            
            if (reminderTime) {
                const reminder = {
                    id: Date.now(),
                    text: reminderText,
                    time: reminderTime,
                    active: true
                };
                
                this.activeReminders.push(reminder);
                localStorage.setItem('jarvisReminders', JSON.stringify(this.activeReminders));
                
                const timeString = reminderTime.toLocaleString();
                const response = `Reminder set for ${timeString}: ${reminderText}`;
                this.speak(response);
                this.updateStatus(response, 'success');
            } else {
                this.speak("Please specify when you want the reminder. For example: 'remind me to call mom at 3:30 pm' or 'remind me to take medicine in 2 hours'");
                this.updateStatus("Reminder time not specified", 'info');
            }
        } catch (error) {
            console.error('Reminder error:', error);
            this.speak("Sorry, I couldn't set that reminder.");
            this.updateStatus("Reminder error", 'error');
        }
    }

    checkReminders() {
        const now = new Date();
        this.activeReminders = this.activeReminders.filter(reminder => {
            if (reminder.active && reminder.time <= now) {
                this.speak(`Reminder: ${reminder.text}`);
                this.showNotification(`Reminder: ${reminder.text}`, 'info');
                return false; // Remove the reminder
            }
            return true;
        });
        localStorage.setItem('jarvisReminders', JSON.stringify(this.activeReminders));
    }

    async searchWeb(query) {
        try {
            if (query) {
                const searchQuery = query.replace(/^(what is|who is|what are|search for|find)\s+/i, '').trim();
                if (searchQuery) {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
                    const response = `Searching the web for ${searchQuery}`;
                    this.speak(response);
                    this.updateStatus(response, 'success');
                } else {
                    this.speak("Please specify what you want to search for.");
                    this.updateStatus("No search query provided", 'error');
                }
            } else {
                this.speak("Please specify what you want to search for.");
                this.updateStatus("No search query provided", 'error');
            }
        } catch (error) {
            console.error('Web search error:', error);
            this.speak("Sorry, I couldn't perform the web search.");
            this.updateStatus("Web search error", 'error');
        }
    }

    async searchWikipedia(query) {
        try {
            if (query) {
                const searchTerm = query.replace(/wikipedia|wiki/gi, '').trim();
                if (searchTerm) {
                    window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm)}`, '_blank');
                    const response = `Searching Wikipedia for ${searchTerm}`;
                    this.speak(response);
                    this.updateStatus(response, 'success');
                } else {
                    this.speak("Please specify what you want to search for on Wikipedia.");
                    this.updateStatus("No Wikipedia query provided", 'error');
                }
            } else {
                this.speak("Please specify what you want to search for on Wikipedia.");
                this.updateStatus("No Wikipedia query provided", 'error');
            }
        } catch (error) {
            console.error('Wikipedia search error:', error);
            this.speak("Sorry, I couldn't search Wikipedia.");
            this.updateStatus("Wikipedia search error", 'error');
        }
    }

    async showHelp() {
        const helpText = `Here are some commands you can try:
        - "What time is it?" or "What's the date?"
        - "Tell me a joke" or "Say something funny"
        - "What's the weather?" or "Weather in [city]"
        - "Get the latest news" or "What's happening?"
        - "Play [song/artist]" or "Pause music"
        - "Send email to [person] about [subject]"
        - "Search web for [topic]" or "Find [information]"
        - "Wikipedia [topic]" or "Search Wikipedia for [topic]"
        - "Remind me to [task] at [time]" or "Set reminder"
        - "Open [website]" or "Go to [website]"
        - "Take screenshot" or "Capture screen"
        - "Clear history" or "Reset settings"
        - "Help" or "What can you do?"
        
        You can also ask me anything and I'll use AI to help you!`;
        
        this.speak("Here are some commands you can try. Check the screen for the full list. I'm now powered by AI, so feel free to ask me anything!");
        this.updateStatus("Help displayed", 'info');
    }

    handleQuickAction(action) {
        switch(action) {
            case 'time':
                this.getTime();
                break;
            case 'weather':
                this.getWeather();
                break;
            case 'news':
                this.getNews();
                break;
            case 'joke':
                this.getJoke();
                break;
            case 'music':
                this.handleMusic('play music');
                break;
            case 'email':
                this.handleEmail('send email');
                break;
            case 'settings':
                this.openSettings();
                break;
            default:
                this.speak("Quick action not implemented yet.");
                this.updateStatus("Action not available", 'info');
        }
    }

    // Spotify Integration Methods
    async authenticateSpotify() {
        try {
            const clientId = this.settings.spotifyClientId;
            if (!clientId) {
                throw new Error("Spotify Client ID not configured");
            }

            const scopes = [
                'user-read-playback-state',
                'user-modify-playback-state',
                'user-read-currently-playing',
                'streaming',
                'user-read-email',
                'user-read-private'
            ];

            const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(this.spotifyRedirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
            
            // Open popup for authentication
            const popup = window.open(authUrl, 'spotify-auth', 'width=400,height=600');
            
            return new Promise((resolve, reject) => {
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        reject(new Error("Authentication cancelled"));
                    }
                }, 1000);

                window.addEventListener('message', (event) => {
                    if (event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
                        this.spotifyAccessToken = event.data.access_token;
                        clearInterval(checkClosed);
                        popup.close();
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Spotify authentication error:', error);
            throw error;
        }
    }

    async playSpotifyTrack(query) {
        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });

            const data = await response.json();
            if (data.tracks?.items?.length > 0) {
                const track = data.tracks.items[0];
                const trackUri = track.uri;
                
                await fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.spotifyAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uris: [trackUri]
                    })
                });

                this.speak(`Playing ${track.name} by ${track.artists[0].name}`);
                this.updateStatus(`Playing: ${track.name}`, 'success');
            } else {
                this.speak("Sorry, I couldn't find that track on Spotify.");
                this.updateStatus("Track not found", 'error');
            }
        } catch (error) {
            console.error('Spotify play error:', error);
            throw error;
        }
    }

    async resumeSpotifyPlayback() {
        try {
            await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });
            this.speak("Resuming music playback");
            this.updateStatus("Music resumed", 'success');
        } catch (error) {
            console.error('Spotify resume error:', error);
            throw error;
        }
    }

    async pauseSpotifyPlayback() {
        try {
            await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });
        } catch (error) {
            console.error('Spotify pause error:', error);
            throw error;
        }
    }

    async skipSpotifyTrack() {
        try {
            await fetch('https://api.spotify.com/v1/me/player/next', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });
        } catch (error) {
            console.error('Spotify skip error:', error);
            throw error;
        }
    }

    async previousSpotifyTrack() {
        try {
            await fetch('https://api.spotify.com/v1/me/player/previous', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.spotifyAccessToken}`
                }
            });
        } catch (error) {
            console.error('Spotify previous error:', error);
            throw error;
        }
    }

    // PWA Functions
    initializePWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            if (this.installBtn) {
                this.installBtn.style.display = 'block';
                this.showNotification('JARVIS can be installed as an app!', 'info');
            }
        });

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            if (this.installBtn) {
                this.installBtn.style.display = 'none';
            }
            this.showNotification('JARVIS installed successfully!', 'success');
        });
    }

    promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    this.showNotification('JARVIS installed successfully!', 'success');
                } else {
                    console.log('User dismissed the install prompt');
                    this.showNotification('JARVIS installation dismissed.', 'info');
                }
                this.deferredPrompt = null;
            });
        } else {
            console.log('Install prompt not available');
        }
    }
}

// Initialize JARVIS when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new JarvisAssistant();
});