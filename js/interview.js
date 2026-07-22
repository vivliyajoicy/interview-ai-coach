/* ==========================================================================
   AI INTERVIEW COACH - INTERVIEW ENGINE WITH VOICE & LIVE TIMER (js/interview.js)
   ========================================================================== */

import { showToast, STORAGE_KEYS } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Retrieve Selected Parameters from LocalStorage
    const selectedCategory = localStorage.getItem('SELECTED_CATEGORY') || 'Technical';
    const selectedDifficulty = localStorage.getItem('SELECTED_DIFFICULTY') || 'Medium';
    const selectedCompany = localStorage.getItem('SELECTED_COMPANY') || 'General';

    // 2. Domain-Aware Question Sets Generator
    function getQuestionBank(company, category) {
        if (category === 'Behavioral') {
            return [
                `Welcome to your ${company} Behavioral Interview! Tell me about a time you faced a major conflict with a team member and how you resolved it.`,
                "Describe a situation where you had to manage competing high-priority deadlines under severe pressure.",
                "Tell me about a professional mistake you made in a past project and what you learned from it."
            ];
        }
        if (category === 'Aptitude') {
            return [
                "Welcome to your Aptitude Assessment! A train 150m long passes a pole in 15 seconds. What is the speed of the train in km/h?",
                "If 5 engineers complete a system module in 12 days, how many days will 10 engineers take working at the same pace?",
                "Solve this logic sequence: 2, 6, 12, 20, 30, ... What is the next number?"
            ];
        }
        if (category === 'Group Discuss') {
            return [
                "Welcome to Group Discussion! Should AI replace traditional entry-level software engineering roles?",
                "How can modern tech organizations balance rapid feature shipping with strict data privacy regulations?",
                "What is the long-term impact of remote work on engineering innovation and company culture?"
            ];
        }

        // Company-Specific Technical Tracks
        const companyBanks = {
            'Amazon': [
                "Welcome to your Amazon Interview! Tell me about a time you had to make a decision with incomplete data. How does this align with Amazon's 'Bias for Action'?",
                "How would you design the backend storage architecture for Amazon's Order Processing Service during peak Prime Day traffic?",
                "Give an example of a project where you delivered results despite major technical obstacles."
            ],
            'Google': [
                "Welcome to your Google Interview! How would you design a distributed rate-limiter to handle billions of API requests per minute?",
                "Explain how you would optimize memory efficiency in a large-scale graph processing algorithm.",
                "Describe a time you solved a complex engineering bottleneck under tight time constraints."
            ],
            'Microsoft': [
                "Welcome to your Microsoft Interview! How would you design Azure's Blob Storage system for high availability and fault tolerance?",
                "Walk me through how you implement and optimize a Thread Pool in C# or C++.",
                "Describe a situation where you had to refactor a legacy codebase for improved modularity."
            ],
            'Zoho': [
                "Welcome to your Zoho Interview! Write logic in pseudo-code to rotate a 2D matrix by 90 degrees in-place without extra memory allocation.",
                "Explain how Garbage Collection and Memory Management work under the hood in Java.",
                "How would you design a lightweight internal chat messaging engine for Zoho Cliq?"
            ],
            'TCS': [
                "Welcome to your TCS Technical Interview! Explain the fundamental differences between Method Overriding and Method Overloading with a code example.",
                "How do indexing and join algorithms work in SQL databases to optimize query speed?",
                "What are the core principles of Object-Oriented Programming (OOP) and how do you apply them?"
            ],
            'Infosys': [
                "Welcome to your Infosys Interview! What are the key stages of SDLC, and when would you choose Agile over Waterfall?",
                "Explain normalization in SQL databases with 1NF, 2NF, and 3NF examples.",
                "How do stack and queue data structures differ in memory management and execution order?"
            ]
        };

        return companyBanks[company] || [
            "Welcome to your Technical Mock Interview! Can you walk me through a challenging technical project you recently completed?",
            "How do you approach debugging a complex issue in a production environment?",
            "Explain the trade-offs between SQL and NoSQL databases."
        ];
    }

    // 3. UI Element Bindings (Matched to interview.html IDs)
    const ui = {
        topCategoryLabel: document.getElementById('session-display-category'),
        topDifficultyLabel: document.getElementById('session-display-difficulty'),
        currentQuestionText: document.getElementById('current-ai-question-text'),
        currentQIndex: document.getElementById('current-q-index'),
        totalQCount: document.getElementById('total-q-count'),
        progressFill: document.getElementById('session-progress-fill'),
        progressPercentLbl: document.getElementById('progress-percent-lbl'),
        answerInput: document.getElementById('answer-text-area'),
        submitBtn: document.getElementById('submit-answer-btn'),
        skipBtn: document.getElementById('skip-question-shortcut-btn'),
        micBtn: document.getElementById('toggle-mic-voice-btn'),
        micIcon: document.getElementById('mic-icon-state'),
        timerDisplay: document.getElementById('session-timer-clock'), // Line 68 in interview.html
        pauseBtn: document.getElementById('pause-session-btn'),
        terminateBtn: document.getElementById('terminate-session-btn'),
        modalOverlay: document.getElementById('session-modal-overlay'),
        modalPrimary: document.getElementById('modal-action-primary'),
        modalSecondary: document.getElementById('modal-action-secondary')
    };

    let currentQuestionIndex = 0;
    let userAnswers = [];
    let isListening = false;
    let recognition = null;

    // --- LIVE TIMER ENGINE ---
    let timerSeconds = 0;
    let timerInterval = null;
    let isPaused = false;

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPaused) {
                timerSeconds++;
                const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
                const secs = (timerSeconds % 60).toString().padStart(2, '0');
                if (ui.timerDisplay) {
                    ui.timerDisplay.textContent = `${mins}:${secs}`;
                }
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
    }

    // Start Timer immediately on DOM ready
    startTimer();

    // Set Top Header Pills
    if (ui.topCategoryLabel) {
        ui.topCategoryLabel.textContent = selectedCompany !== 'General' ? `${selectedCompany} (${selectedCategory})` : selectedCategory;
    }
    if (ui.topDifficultyLabel) {
        ui.topDifficultyLabel.textContent = selectedDifficulty;
    }

    // Load active questions
    const activeQuestions = getQuestionBank(selectedCompany, selectedCategory);
    if (ui.totalQCount) ui.totalQCount.textContent = activeQuestions.length;

    // --- Pause / Resume & Modal Management ---
    if (ui.pauseBtn) {
        ui.pauseBtn.addEventListener('click', () => {
            isPaused = true;
            if (ui.modalOverlay) ui.modalOverlay.classList.remove('hidden');
        });
    }

    if (ui.modalPrimary) {
        ui.modalPrimary.addEventListener('click', () => {
            isPaused = false;
            if (ui.modalOverlay) ui.modalOverlay.classList.add('hidden');
        });
    }

    if (ui.modalSecondary || ui.terminateBtn) {
        const exitHandler = () => {
            stopTimer();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            window.location.href = 'dashboard.html';
        };

        if (ui.modalSecondary) ui.modalSecondary.addEventListener('click', exitHandler);
        if (ui.terminateBtn) ui.terminateBtn.addEventListener('click', exitHandler);
    }

    // --- Voice Output (Text-To-Speech Engine) ---
    function speakQuestion(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 300);
        }
    }

    // --- Speech Recognition (Microphone Engine) ---
    function initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                if (ui.answerInput) {
                    ui.answerInput.value = transcript;
                }
            };

            recognition.onerror = (err) => {
                console.error("Mic error:", err);
                stopListening();
            };

            recognition.onend = () => {
                stopListening();
            };
        }
    }

    initSpeechRecognition();

    function startListening() {
        if (!recognition) {
            initSpeechRecognition();
        }

        if (recognition) {
            try {
                recognition.start();
                isListening = true;
                if (ui.micIcon) ui.micIcon.className = "fa-solid fa-microphone-slash text-danger";
                if (ui.micBtn) ui.micBtn.style.background = "rgba(255, 0, 85, 0.3)";
                if (typeof showToast === 'function') showToast("Microphone active... speak clearly.", "info");
            } catch (e) { 
                console.error(e);
            }
        } else {
            alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
        }
    }

    function stopListening() {
        if (recognition && isListening) {
            try { recognition.stop(); } catch(e) {}
        }
        isListening = false;
        if (ui.micIcon) ui.micIcon.className = "fa-solid fa-microphone";
        if (ui.micBtn) ui.micBtn.style.background = "";
    }

    if (ui.micBtn) {
        ui.micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isListening) {
                startListening();
            } else {
                stopListening();
            }
        });
    }

    // Render Question Function
    function renderQuestion(index) {
        if (index < activeQuestions.length) {
            const qText = activeQuestions[index];
            if (ui.currentQuestionText) ui.currentQuestionText.textContent = qText;
            if (ui.currentQIndex) ui.currentQIndex.textContent = index + 1;

            const percent = Math.round(((index + 1) / activeQuestions.length) * 100);
            if (ui.progressFill) ui.progressFill.style.width = `${percent}%`;
            if (ui.progressPercentLbl) ui.progressPercentLbl.textContent = `${percent}%`;

            if (ui.answerInput) ui.answerInput.value = '';

            // Speak out question
            speakQuestion(qText);
        } else {
            finishSession();
        }
    }

    // Load First Question
    renderQuestion(currentQuestionIndex);

    // Skip / Next Shortcut Action
    if (ui.skipBtn) {
        ui.skipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            stopListening();
            userAnswers.push("Skipped response.");
            currentQuestionIndex++;
            if (currentQuestionIndex < activeQuestions.length) {
                renderQuestion(currentQuestionIndex);
            } else {
                finishSession();
            }
        });
    }

    // Submit Action
    if (ui.submitBtn) {
        ui.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            stopListening();
            const responseText = ui.answerInput ? ui.answerInput.value.trim() : '';

            if (!responseText) {
                if (typeof showToast === 'function') {
                    showToast("Please provide or speak an answer before submitting.", "warning");
                } else {
                    alert("Please provide or speak an answer before submitting.");
                }
                return;
            }

            userAnswers.push(responseText);
            currentQuestionIndex++;

            if (currentQuestionIndex < activeQuestions.length) {
                renderQuestion(currentQuestionIndex);
            } else {
                finishSession();
            }
        });
    }

    function finishSession() {
        stopTimer();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        
        const sessionPayload = {
            id: 'sess_' + Date.now(),
            company: selectedCompany,
            category: selectedCategory,
            difficulty: selectedDifficulty,
            questions: activeQuestions,
            answers: userAnswers,
            durationSeconds: timerSeconds,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('CURRENT_SESSION', JSON.stringify(sessionPayload));
        if (typeof showToast === 'function') showToast("Simulation complete! Generating evaluation report...", "success");

        setTimeout(() => {
            window.location.href = 'result.html';
        }, 1000);
    }
});