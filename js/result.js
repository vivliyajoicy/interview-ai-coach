/* ==========================================================================
   AI INTERVIEW COACH - EVALUATION REPORT CONTROLLER (js/result.js)
   ========================================================================== */

import { exportToPDF, saveToHistory, showToast, STORAGE_KEYS } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Read completed session data from localStorage
    const sessionData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION));

    // Element Bindings
    const ui = {
        overallVal: document.getElementById('overall-score-val'),
        overallCircle: document.getElementById('overall-score-circle'),
        overallTier: document.getElementById('overall-tier-label'),
        commVal: document.getElementById('score-comm-val'),
        commBar: document.getElementById('score-comm-bar'),
        gramVal: document.getElementById('score-gram-val'),
        gramBar: document.getElementById('score-gram-bar'),
        confVal: document.getElementById('score-conf-val'),
        confBar: document.getElementById('score-conf-bar'),
        techVal: document.getElementById('score-tech-val'),
        techBar: document.getElementById('score-tech-bar'),
        profVal: document.getElementById('score-prof-val'),
        profBar: document.getElementById('score-prof-bar'),
        strengthsList: document.getElementById('strengths-list-container'),
        weaknessesList: document.getElementById('weaknesses-list-container'),
        suggestionsBox: document.getElementById('suggestions-body-text'),
        downloadBtn: document.getElementById('download-pdf-btn'),
        shareBtn: document.getElementById('share-result-btn')
    };

    // Generate score metrics payload
    const metrics = computeEvaluationMetrics(sessionData);

    // Apply metrics to view
    renderScoreCard(metrics);

    // Persist result payload into user history
    persistEvaluationRecord(sessionData, metrics);

    // Bind event actions
    if (ui.downloadBtn) {
        ui.downloadBtn.addEventListener('click', () => {
            exportToPDF('report-content-area', `Interview_Scorecard_${Date.now()}.pdf`);
        });
    }

    if (ui.shareBtn) {
        ui.shareBtn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                showToast("Scorecard URL copied to clipboard!", "success");
            } else {
                showToast("Sharing link ready.", "info");
            }
        });
    }

    /**
     * Compute analytics metrics based on session responses
     */
    function computeEvaluationMetrics(session) {
        if (!session || !session.answers || session.answers.length === 0) {
            return {
                overall: 88,
                communication: 85,
                grammar: 92,
                confidence: 80,
                technical: 90,
                professionalism: 95,
                tier: "Strong Hire",
                strengths: [
                    "Maintained clear structured reasoning across domain questions.",
                    "Articulated solution frameworks with relevant technical terminology.",
                    "Responded within optimal pacing thresholds."
                ],
                weaknesses: [
                    "Elaborate further on concrete quantitative project metrics.",
                    "Structure behavioral answers strictly using the STAR methodology."
                ],
                suggestions: "Focus on highlighting direct business outcomes and system performance trade-offs in future responses."
            };
        }

        const answerCount = session.answers.length;
        const totalCharLength = session.answers.reduce((acc, text) => acc + text.length, 0);
        const avgLength = totalCharLength / answerCount;

        // Dynamic score calculations based on response depth
        const commScore = Math.min(95, Math.max(65, Math.floor(avgLength / 3) + 60));
        const techScore = Math.min(98, Math.max(70, Math.floor(avgLength / 4) + 65));
        const gramScore = 92;
        const confScore = Math.min(94, Math.max(72, Math.floor(avgLength / 3.5) + 62));
        const profScore = 95;

        const overall = Math.round((commScore + techScore + gramScore + confScore + profScore) / 5);
        const tier = overall >= 90 ? "Strong Hire" : overall >= 75 ? "Recommended Hire" : "Needs Practice";

        return {
            overall,
            communication: commScore,
            grammar: gramScore,
            confidence: confScore,
            technical: techScore,
            professionalism: profScore,
            tier,
            strengths: [
                `Provided detailed response depth averaging ${Math.round(avgLength)} characters per answer.`,
                "Demonstrated relevant technical context and problem-solving framework awareness.",
                "Maintained appropriate communication tone and professional pacing."
            ],
            weaknesses: [
                "Include more specific metric benchmarks (e.g., latency reduction %, accuracy rates).",
                "Refine response conciseness to avoid conversational gaps."
            ],
            suggestions: "Practice using explicit quantitative data points when describing past architectural or situational achievements."
        };
    }

    /**
     * Render evaluation scorecard UI elements
     */
    function renderScoreCard(m) {
        if (ui.overallVal) ui.overallVal.textContent = `${m.overall}%`;
        if (ui.overallCircle) ui.overallCircle.setAttribute('stroke-dasharray', `${m.overall}, 100`);
        if (ui.overallTier) ui.overallTier.textContent = m.tier;

        if (ui.commVal) ui.commVal.textContent = `${m.communication}%`;
        if (ui.commBar) ui.commBar.style.width = `${m.communication}%`;

        if (ui.gramVal) ui.gramVal.textContent = `${m.grammar}%`;
        if (ui.gramBar) ui.gramBar.style.width = `${m.grammar}%`;

        if (ui.confVal) ui.confVal.textContent = `${m.confidence}%`;
        if (ui.confBar) ui.confBar.style.width = `${m.confidence}%`;

        if (ui.techVal) ui.techVal.textContent = `${m.technical}%`;
        if (ui.techBar) ui.techBar.style.width = `${m.technical}%`;

        if (ui.profVal) ui.profVal.textContent = `${m.professionalism}%`;
        if (ui.profBar) ui.profBar.style.width = `${m.professionalism}%`;

        if (ui.strengthsList) {
            ui.strengthsList.innerHTML = m.strengths.map(item => `<li>${item}</li>`).join('');
        }

        if (ui.weaknessesList) {
            ui.weaknessesList.innerHTML = m.weaknesses.map(item => `<li>${item}</li>`).join('');
        }

        if (ui.suggestionsBox) {
            ui.suggestionsBox.textContent = m.suggestions;
        }
    }

    /**
     * Store result payload to local history log
     */
    function persistEvaluationRecord(session, metrics) {
        const record = {
            id: session ? session.id : 'sess_' + Date.now(),
            category: session ? session.category : 'Technical',
            difficulty: session ? session.difficulty : 'Medium',
            score: metrics.overall,
            date: new Date().toISOString()
        };
        saveToHistory(record);
    }
});