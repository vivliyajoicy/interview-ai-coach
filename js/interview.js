/* ==========================================================================
   AI INTERVIEW COACH - LIVE SIMULATION CORE (js/interview.js)
   ========================================================================== */

import { formatTime, showToast, speakText, STORAGE_KEYS } from './utils.js';

// Configuration Defaults
const GEMINI_API_KEY = "";
const DEFAULT_QUESTIONS = 5;

// Global Session State
let sessionState = {
    timerInterval: null,
    elapsedSeconds: 0,
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    isRecording: false,
    recognitionInstance: null,
    status: 'initializing' // 'initializing' | 'active' | 'paused' | 'completed'
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validate Active Session Context
    const activeSessionData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION));
    if (!activeSessionData) {
        window.location.href = 'dashboard.html';
        return;
    }

    // 2. DOM Node Bindings
    const ui = {
        categoryDisplay: document.getElementById('session-display-category'),
        difficultyDisplay: document.getElementById('session-display-difficulty'),
        timerDisplay: document.getElementById('session-timer-clock'),
        currentIndexDisplay: document.getElementById('current-q-index'),
        totalIndexDisplay: document.getElementById('total-q-count'),
        progressBarFill: document.getElementById('session-progress-fill'),
        progressLabel: document.getElementById('progress-percent-lbl'),
        chatViewport: document.getElementById('chat-stream-viewport'),
        answerInput: document.getElementById('answer-text-area'),
        submitBtn: document.getElementById('submit-answer-btn'),
        micBtn: document.getElementById('toggle-mic-voice-btn'),
        micIcon: document.getElementById('mic-icon-state'),
        waveformPanel: document.getElementById('audio-waveform-panel'),
        pauseBtn: document.getElementById('pause-session-btn'),
        terminateBtn: document.getElementById('terminate-session-btn'),
        modalOverlay: document.getElementById('session-modal-overlay'),
        modalResume: document.getElementById('modal-action-primary'),
        modalDiscard: document.getElementById('modal-action-secondary')
    };

    // 3. Setup Initial UI Bindings from LocalStorage
    ui.categoryDisplay.innerText = activeSessionData.category || "Technical";
    ui.difficultyDisplay.innerText = activeSessionData.difficulty || "Medium";
    ui.totalIndexDisplay.innerText = activeSessionData.totalQuestions || DEFAULT_QUESTIONS;
    sessionState.questions = activeSessionData.questions || [];
    sessionState.answers = activeSessionData.answers || [];
    sessionState.currentQuestionIndex = activeSessionData.currentQuestionIndex || 0;

    // 4. Initialize Core Engine
    initializeSimulationEngine();

    /**
     * Engine Bootloader Pipeline
     */
    async function initializeSimulationEngine() {
        startTimer();
        
        if (sessionState.questions.length === 0) {
            appendAIPacket("Initializing neural matrix... connecting to HR evaluation parameters...");
            await fetchAIQuestions(activeSessionData.category, activeSessionData.difficulty);
        } else {
            renderHistoricalChatState();
            askCurrentQuestion();
        }

        setupSpeechRecognition();
        bindControlListeners();
    }

    /**
     * Fetches Scenario Questions using Gemini API
     */
    async function fetchAIQuestions(domain, difficulty) {
        // If no key is set or still default, use backup matrix
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
            sessionState.questions = [
                `Can you walk me through a recent ${domain} scenario where you faced a significant challenge?`,
                `Explain a core concept related to ${domain} at a ${difficulty} difficulty level.`,
                `How do you handle high-pressure deadlines when working on ${domain} tasks?`,
                `Describe a time you received constructive criticism regarding your ${domain} performance.`,
                `Where do you see your technical mastery in ${domain} evolving over the next two years?`
            ];
            activeSessionData.questions = sessionState.questions;
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(activeSessionData));
            askCurrentQuestion();
            return;
        }

        try {
            const promptText = `Generate 5 realistic interview questions for a candidate practicing for a ${domain} interview at a ${difficulty} difficulty level. Return ONLY a plain JSON array of 5 strings, like: ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            const data = await response.json();
            const rawText = data.candidates[0].content.parts[0].text;
            
            // Clean markdown formatting if returned
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            sessionState.questions = JSON.parse(cleanJson);

            activeSessionData.questions = sessionState.questions;
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(activeSessionData));
            askCurrentQuestion();

        } catch (error) {
            console.error("Gemini API Error:", error);
            showToast("Gemini API connection error. Loading backup question matrix.", "error");
            
            // Fallback questions if API quota/network fails
            sessionState.questions = [
                `Can you walk me through a recent ${domain} scenario where you faced a significant challenge?`,
                `Explain a core concept related to ${domain} at a ${difficulty} difficulty level.`,
                `How do you handle high-pressure deadlines when working on ${domain} tasks?`,
                `Describe a time you received constructive criticism regarding your ${domain} performance.`,
                `Where do you see your technical mastery in ${domain} evolving over the next two years?`
            ];
            activeSessionData.questions = sessionState.questions;
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(activeSessionData));
            askCurrentQuestion();
        }
    }
    /**
     * Executes the Current Question Block
     */
    function askCurrentQuestion() {
        const questionText = sessionState.questions[sessionState.currentQuestionIndex];
        
        // Update UI
        ui.currentIndexDisplay.innerText = sessionState.currentQuestionIndex + 1;
        updateProgressBar();
        
        // Push AI Packet to UI
        appendAIPacket(questionText);
        
        // Speak AI Output
        speakText(questionText);
        sessionState.status = 'active';
    }

    /**
     * Renders Chat Packets
     */
    function appendAIPacket(text) {
        const packet = document.createElement('div');
        packet.className = 'msg-packet packet-ai';
        packet.innerHTML = `
            <div class="packet-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="packet-bubble glass sliding-in-left"><p>${text}</p></div>
        `;
        ui.chatViewport.appendChild(packet);
        scrollToBottom();
    }

    function appendUserPacket(text) {
        const packet = document.createElement('div');
        packet.className = 'msg-packet packet-user';
        packet.innerHTML = `
            <div class="packet-avatar user-avatar-icon"><i class="fa-solid fa-user-tie"></i></div>
            <div class="packet-bubble glass user-bubble-color"><p>${text}</p></div>
        `;
        ui.chatViewport.appendChild(packet);
        scrollToBottom();
    }

    function renderHistoricalChatState() {
        ui.chatViewport.innerHTML = '';
        for (let i = 0; i < sessionState.currentQuestionIndex; i++) {
            if (sessionState.questions[i]) appendAIPacket(sessionState.questions[i]);
            if (sessionState.answers[i]) appendUserPacket(sessionState.answers[i]);
        }
    }

    /**
     * Telemetry & Progress
     */
    function startTimer() {
        sessionState.timerInterval = setInterval(() => {
            if (sessionState.status === 'active') {
                sessionState.elapsedSeconds++;
                ui.timerDisplay.innerText = formatTime(sessionState.elapsedSeconds);
            }
        }, 1000);
    }

    function updateProgressBar() {
        const total = activeSessionData.totalQuestions || DEFAULT_QUESTIONS;
        const current = sessionState.currentQuestionIndex;
        const percentage = Math.round((current / total) * 100);
        
        ui.progressBarFill.style.width = `${percentage}%`;
        ui.progressLabel.innerText = `${percentage}%`;
    }

    function scrollToBottom() {
        ui.chatViewport.scrollTop = ui.chatViewport.scrollHeight;
    }

    /**
     * Speech Recognition Engine (Web Speech API)
     */
    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            ui.micBtn.disabled = true;
            ui.micBtn.title = "Voice recognition not supported in this browser.";
            return;
        }

        sessionState.recognitionInstance = new SpeechRecognition();
        sessionState.recognitionInstance.continuous = true;
        sessionState.recognitionInstance.interimResults = true;

        sessionState.recognitionInstance.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                ui.answerInput.value += (ui.answerInput.value ? ' ' : '') + finalTranscript;
            }
        };

        sessionState.recognitionInstance.onerror = (event) => {
            console.error("Mic error", event.error);
            stopRecording();
        };

        sessionState.recognitionInstance.onend = () => {
            if (sessionState.isRecording) {
                sessionState.recognitionInstance.start(); // Keep alive if active
            }
        };
    }

    function toggleRecording() {
        if (!sessionState.recognitionInstance) return;

        if (sessionState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        sessionState.isRecording = true;
        sessionState.recognitionInstance.start();
        ui.micBtn.classList.add('mic-recording-active');
        ui.micIcon.classList.replace('fa-microphone', 'fa-microphone-lines');
        ui.waveformPanel.classList.remove('hidden');
        showToast("Listening... Speak your answer clearly.");
    }

    function stopRecording() {
        sessionState.isRecording = false;
        sessionState.recognitionInstance.stop();
        ui.micBtn.classList.remove('mic-recording-active');
        ui.micIcon.classList.replace('fa-microphone-lines', 'fa-microphone');
        ui.waveformPanel.classList.add('hidden');
    }

    /**
     * Interaction Handlers
     */
    function handleSubmission() {
        const answer = ui.answerInput.value.trim();
        if (!answer) {
            showToast("Please provide a response before submitting.", "error");
            return;
        }

        if (sessionState.isRecording) stopRecording();

        // Save Answer
        sessionState.answers.push(answer);
        activeSessionData.answers = sessionState.answers;
        activeSessionData.currentQuestionIndex = sessionState.currentQuestionIndex + 1;
        
        appendUserPacket(answer);
        ui.answerInput.value = '';

        if (activeSessionData.currentQuestionIndex >= (activeSessionData.totalQuestions || DEFAULT_QUESTIONS)) {
            finishSimulation();
        } else {
            sessionState.currentQuestionIndex++;
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(activeSessionData));
            setTimeout(askCurrentQuestion, 1000);
        }
    }

    function finishSimulation() {
        sessionState.status = 'completed';
        clearInterval(sessionState.timerInterval);
        activeSessionData.status = 'completed';
        activeSessionData.endTime = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(activeSessionData));
        
        showToast("Simulation Complete! Generating Performance Matrix...", "success");
        setTimeout(() => {
            window.location.href = 'result.html';
        }, 1500);
    }

    function bindControlListeners() {
        ui.submitBtn.addEventListener('click', handleSubmission);
        
        ui.answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmission();
            }
        });

        ui.micBtn.addEventListener('click', toggleRecording);

        ui.pauseBtn.addEventListener('click', () => {
            sessionState.status = 'paused';
            ui.modalOverlay.classList.remove('hidden');
            if (sessionState.isRecording) stopRecording();
        });

        ui.modalResume.addEventListener('click', () => {
            sessionState.status = 'active';
            ui.modalOverlay.classList.add('hidden');
        });

        ui.terminateBtn.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
            window.location.href = 'dashboard.html';
        });

        ui.modalDiscard.addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
            window.location.href = 'dashboard.html';
        });
    }
});