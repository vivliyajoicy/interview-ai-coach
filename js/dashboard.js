/* ==========================================================================
   AI INTERVIEW COACH - DASHBOARD CONTROLLER (js/dashboard.js)
   ========================================================================== */

import { logoutUser } from './auth.js';
import { db, auth, collection, getDocs } from './firebase.js';

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
    initCompanyTrackSelector();

    // 2. Interactive Selection handling for Domain Category Tiles
    categoryTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            categoryTiles.forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            const radio = tile.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            // Immediately save category selection
            const categoryValue = radio ? radio.value : tile.innerText.trim();
            localStorage.setItem('SELECTED_CATEGORY', categoryValue);
        });
    });

    // 3. Interactive Selection handling for Difficulty Buttons
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const radio = btn.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            // Immediately save difficulty selection
            const difficultyValue = radio ? radio.value : btn.innerText.trim();
            localStorage.setItem('SELECTED_DIFFICULTY', difficultyValue);
        });
    });

    // 4. Handle Starting a New Session
    if (setupForm) {
        setupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectedCategoryEl = document.querySelector('input[name="interview-category"]:checked');
            const selectedDifficultyEl = document.querySelector('input[name="interview-difficulty"]:checked');

            const category = selectedCategoryEl ? selectedCategoryEl.value : (localStorage.getItem('SELECTED_CATEGORY') || 'Technical');
            const difficulty = selectedDifficultyEl ? selectedDifficultyEl.value : (localStorage.getItem('SELECTED_DIFFICULTY') || 'Medium');
            const company = localStorage.getItem('SELECTED_COMPANY') || 'General';

            // Explicitly sync individual keys used by interview.js
            localStorage.setItem('SELECTED_CATEGORY', category);
            localStorage.setItem('SELECTED_DIFFICULTY', difficulty);

            // Create new session telemetry object
            const sessionData = {
                id: 'sess_' + Date.now(),
                category: category,
                difficulty: difficulty,
                company: company,
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
    async function loadUserDashboardStats() {
        const storedUser = JSON.parse(localStorage.getItem('intercoach_user') || '{}');
        const uid = (auth.currentUser ? auth.currentUser.uid : null) || storedUser.uid;
        const historyData = JSON.parse(localStorage.getItem('intercoach_history') || '[]');

        let realCount = historyData.length;
        let userRuns = historyData;

        if (db && uid) {
            try {
                const interviewsSnap = await getDocs(collection(db, "interviews"));
                const firestoreRuns = [];
                interviewsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.userId === uid) {
                        firestoreRuns.push({
                            category: data.category || 'Technical',
                            difficulty: data.difficulty || 'Medium',
                            score: data.overallScore || 0,
                            date: data.createdAt || new Date().toISOString()
                        });
                    }
                });

                if (firestoreRuns.length > 0) {
                    realCount = firestoreRuns.length;
                    userRuns = firestoreRuns;
                }
            } catch (err) {
                console.warn("Firestore dashboard stats fetch error:", err);
            }
        }

        if (totalInterviewsCount) {
            totalInterviewsCount.innerText = realCount;
        }

        if (recentRunsContainer && userRuns.length > 0) {
            recentRunsContainer.innerHTML = '';
            userRuns.slice(0, 5).forEach(run => {
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

/* ==========================================================================
   Company Track Selection Engine
   ========================================================================== */
function initCompanyTrackSelector() {
    const companyPills = document.querySelectorAll('.company-pill');
    const badgeText = document.getElementById('selected-company-badge');

    if (!localStorage.getItem('SELECTED_COMPANY')) {
        localStorage.setItem('SELECTED_COMPANY', 'General');
    }

    const currentSaved = localStorage.getItem('SELECTED_COMPANY');

    companyPills.forEach(pill => {
        if (pill.dataset.company === currentSaved) {
            pill.classList.add('active');
            if (badgeText) badgeText.textContent = `Active: ${currentSaved} Mode`;
        } else {
            pill.classList.remove('active');
        }

        pill.addEventListener('click', () => {
            companyPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const selectedCompany = pill.dataset.company;
            localStorage.setItem('SELECTED_COMPANY', selectedCompany);

            if (badgeText) {
                badgeText.textContent = `Active: ${selectedCompany} Mode`;
            }
        });
    });
}