/* ==========================================================================
   AI INTERVIEW COACH - DASHBOARD CONTROLLER (js/dashboard.js)
   ========================================================================== */

import { logoutUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const setupForm = document.getElementById('interview-setup-form');
    const categoryTiles = document.querySelectorAll('.category-tile');
    const difficultyBtns = document.querySelectorAll('.diff-btn');
    const continuePrevBtn = document.getElementById('continue-prev-btn');
    const recentRunsContainer = document.getElementById('recent-runs-log');
    const totalInterviewsCount = document.getElementById('stats-total-interviews');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // 1. Initialize Dashboard User & Telemetry Data
    loadUserDashboardStats();

    // 2. Interactive Selection handling for Domain Category Tiles
    categoryTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            categoryTiles.forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            const radio = tile.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // 3. Interactive Selection handling for Difficulty Buttons
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const radio = btn.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // 4. Handle Starting a New Session
    if (setupForm) {
        setupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectedCategoryEl = document.querySelector('input[name="interview-category"]:checked');
            const selectedDifficultyEl = document.querySelector('input[name="interview-difficulty"]:checked');

            const category = selectedCategoryEl ? selectedCategoryEl.value : 'Technical';
            const difficulty = selectedDifficultyEl ? selectedDifficultyEl.value : 'Medium';

            // Create new session telemetry object
            const sessionData = {
                id: 'sess_' + Date.now(),
                category: category,
                difficulty: difficulty,
                currentQuestionIndex: 0,
                totalQuestions: 5,
                answers: [],
                startTime: new Date().toISOString(),
                status: 'in-progress'
            };

            // Store active session into localStorage
            localStorage.setItem('intercoach_current_session', JSON.stringify(sessionData));

            // Launch simulation room
            window.location.href = 'interview.html';
        });
    }

    // 5. Handle Resuming Previous Incomplete Session
    if (continuePrevBtn) {
        const savedSession = localStorage.getItem('intercoach_current_session');
        if (!savedSession) {
            continuePrevBtn.style.opacity = '0.5';
            continuePrevBtn.title = 'No active session found to resume';
        }

        continuePrevBtn.addEventListener('click', () => {
            const session = localStorage.getItem('intercoach_current_session');
            if (session) {
                window.location.href = 'interview.html';
            } else {
                alert('No saved interview session found. Please start a new session!');
            }
        });
    }

    // 6. Dark/Light Theme Toggle Controller
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const icon = themeToggleBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
        });
    }

    /**
     * Loads historical interview logs and updates numerical stats
     */
    function loadUserDashboardStats() {
        const historyData = JSON.parse(localStorage.getItem('intercoach_history') || '[]');

        if (totalInterviewsCount) {
            totalInterviewsCount.innerText = historyData.length || 12; // Default fallback to match mock UI
        }

        if (recentRunsContainer && historyData.length > 0) {
            recentRunsContainer.innerHTML = '';
            historyData.slice(0, 5).forEach(run => {
                const row = document.createElement('div');
                row.className = 'log-item-row glass';
                const scoreRatingClass = run.score >= 80 ? 'rating-high' : 'rating-mid';
                const formattedDate = new Date(run.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                row.innerHTML = `
                    <div class="log-info-meta">
                        <strong>${run.category} (${run.difficulty})</strong>
                        <small>${formattedDate}</small>
                    </div>
                    <div class="log-score-badge ${scoreRatingClass}">${run.score}%</div>
                `;
                recentRunsContainer.appendChild(row);
            });
        }
    }
});