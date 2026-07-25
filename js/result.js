/* ==========================================================================
   AI INTERVIEW COACH - EVALUATION REPORT CONTROLLER (js/result.js)
   ========================================================================== */

import { exportToPDF, saveToHistory, showToast, STORAGE_KEYS } from './utils.js';
import { db, auth, collection, addDoc, doc, setDoc, serverTimestamp } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Read completed session data safely from localStorage (checking both possible keys)
    const rawSessionData = localStorage.getItem('CURRENT_SESSION') || localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    const sessionData = rawSessionData ? JSON.parse(rawSessionData) : null;

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

    // Generate score metrics payload based on real candidate responses
    const metrics = computeEvaluationMetrics(sessionData);

    // Apply metrics to view
    renderScoreCard(metrics);

    // Persist result payload into local history AND publish to live Firestore Leaderboard & Interviews
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
     * Compute REALISTIC analytics metrics based on session accuracy, depth, and duration
     */
    function computeEvaluationMetrics(session) {
        if (!session || !session.answers || session.answers.length === 0) {
            return {
                overall: 15,
                communication: 10,
                grammar: 20,
                confidence: 10,
                technical: 10,
                professionalism: 25,
                tier: "Needs Practice",
                strengths: ["Session initiated."],
                weaknesses: ["No answers were submitted or questions were skipped entirely."],
                suggestions: "Please complete all questions with detailed explanations to receive a full score."
            };
        }

        const answers = session.answers;
        const answerCount = answers.length;
        const totalWords = answers.join(" ").trim().split(/\s+/).filter(w => w.length > 0).length;
        const avgWordsPerAnswer = totalWords / answerCount;
        const companyTag = session.company || 'General';
        const durationSeconds = session.durationSeconds || 0;

        // --- 1. KEYWORD & TECHNICAL ACCURACY CHECK ---
        const techKeywords = [
            'design', 'system', 'database', 'sql', 'nosql', 'api', 'backend', 'scale', 
            'algorithm', 'cache', 'latency', 'memory', 'optimiz', 'code', 'function', 
            'class', 'object', 'thread', 'index', 'query', 'star', 'conflict', 'leader'
        ];
        
        let keywordHits = 0;
        answers.forEach(ans => {
            const lower = ans.toLowerCase();
            techKeywords.forEach(kw => {
                if (lower.includes(kw)) keywordHits++;
            });
        });

        // Calculate technical accuracy ratio (0.0 to 1.0)
        const accuracyFactor = Math.min(1.0, keywordHits / (answerCount * 2));

        // --- 2. PACING & FLUENCY (CONFIDENCE) CHECK ---
        // Answering too fast (<5s total) implies random clicking/typing. Optimal is ~30-90s per answer.
        const avgSecondsPerAnswer = durationSeconds / answerCount;
        let paitingMultiplier = 1.0;
        if (avgSecondsPerAnswer < 5) {
            paitingMultiplier = 0.4; // Heavily penalize rushed/fake answers
        } else if (avgSecondsPerAnswer < 15) {
            paitingMultiplier = 0.7;
        }

        // --- 3. STRICT SCORE COMPUTATION ---

        // A. Skipped / Very Short / Low-Effort Answers (< 10 words per answer average)
        if (avgWordsPerAnswer < 10) {
            return {
                overall: 25,
                communication: 25,
                grammar: 45,
                confidence: Math.round(20 * paitingMultiplier),
                technical: Math.round(15 * accuracyFactor) + 10,
                professionalism: 30,
                tier: "Needs Practice",
                strengths: ["Attempted the session track."],
                weaknesses: [
                    `Responses were too brief (averaged only ${Math.round(avgWordsPerAnswer)} words per answer).`,
                    "Failed to provide technical context, examples, or solution frameworks.",
                    "Skipped detailed explanations for key questions."
                ],
                suggestions: `To pass a ${companyTag} technical interview, avoid one-word or brief answers. Explain concepts clearly with relevant examples.`
            };
        }

        // B. Moderate / Partial Answers (10 to 30 words per answer average)
        if (avgWordsPerAnswer < 30) {
            const commScore = Math.min(70, Math.floor(avgWordsPerAnswer * 1.8) + 15);
            const techScore = Math.min(68, Math.floor(avgWordsPerAnswer * 1.5 + (accuracyFactor * 25)));
            const gramScore = 78;
            const confScore = Math.min(70, Math.floor((avgWordsPerAnswer * 1.2 + 20) * paitingMultiplier));
            const profScore = 72;
            const overall = Math.round((commScore + techScore + gramScore + confScore + profScore) / 5);

            return {
                overall,
                communication: commScore,
                grammar: gramScore,
                confidence: confScore,
                technical: techScore,
                professionalism: profScore,
                tier: overall >= 65 ? "Recommended Hire" : "Needs Practice",
                strengths: [
                    `Provided baseline responses for ${companyTag} track.`,
                    "Communicated main points with reasonable clarity."
                ],
                weaknesses: [
                    "Lacked deep technical trade-offs, architecture diagrams, or quantitative metrics.",
                    "Responses were brief for a senior technical evaluation."
                ],
                suggestions: `Elaborate more on technical design decisions, trade-offs, and metrics when interviewing for ${companyTag}.`
            };
        }

        // C. Detailed Technical Answers (30+ words average)
        const commScore = Math.min(95, Math.floor(avgWordsPerAnswer * 0.7) + 55);
        const techScore = Math.min(96, Math.floor((avgWordsPerAnswer * 0.6) + (accuracyFactor * 35) + 30));
        const gramScore = 90;
        const confScore = Math.min(92, Math.floor((avgWordsPerAnswer * 0.5 + 45) * paitingMultiplier));
        const profScore = 90;
        const overall = Math.round((commScore + techScore + gramScore + confScore + profScore) / 5);

        return {
            overall,
            communication: commScore,
            grammar: gramScore,
            confidence: confScore,
            technical: techScore,
            professionalism: profScore,
            tier: overall >= 80 ? "Strong Hire" : "Recommended Hire",
            strengths: [
                `Demonstrated good technical depth for ${companyTag}, averaging ${Math.round(avgWordsPerAnswer)} words per response.`,
                "Used relevant domain terminology and structured reasoning.",
                "Maintained steady pacing during responses."
            ],
            weaknesses: [
                "Include specific quantitative metrics (e.g. latency, throughput %, memory saved).",
                "Structure behavioral responses strictly using the STAR methodology."
            ],
            suggestions: `Solid performance! Continue practicing explaining trade-offs and quantitative outcomes for ${companyTag} interviews.`
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
     * Store result payload to local storage and publish to live Firestore leaderboard & interviews collections
     */
    async function persistEvaluationRecord(session, metrics) {
        const storedUser = JSON.parse(localStorage.getItem('intercoach_user') || localStorage.getItem(STORAGE_KEYS.USER || 'USER') || '{}');
        const activeUser = auth.currentUser || storedUser;
        const uid = activeUser.uid || storedUser.uid;
        const displayName = activeUser.displayName || storedUser.displayName || 'Candidate';
        const photoURL = activeUser.photoURL || storedUser.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + displayName;

        // Local Record
        const record = {
            id: session ? session.id : 'sess_' + Date.now(),
            company: session ? session.company : 'General',
            category: session ? session.category : 'Technical',
            difficulty: session ? session.difficulty : 'Medium',
            score: metrics.overall,
            date: new Date().toISOString()
        };
        saveToHistory(record);

        if (!db) return;

        // 1. Write to 'interviews' collection
        try {
            await addDoc(collection(db, "interviews"), {
                userId: uid || 'anon',
                userName: displayName,
                userPhoto: photoURL,
                company: session ? session.company : 'General',
                category: session ? session.category : 'Technical',
                difficulty: session ? session.difficulty : 'Medium',
                overallScore: metrics.overall,
                technical: metrics.technical,
                communication: metrics.communication,
                grammar: metrics.grammar,
                confidence: metrics.confidence,
                durationSeconds: session ? session.durationSeconds : 0,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString()
            });
            console.log("Successfully stored interview session record in Firestore!");
        } catch (err) {
            console.error("Firestore Interviews Storage Error:", err);
        }

        // 2. Write/Upsert to 'leaderboard' collection
        try {
            if (uid && uid !== 'anon') {
                const leaderboardRef = doc(db, "leaderboard", uid);
                await setDoc(leaderboardRef, {
                    id: uid,
                    userId: uid,
                    name: displayName,
                    photo: photoURL,
                    company: session ? session.company : 'General',
                    category: session ? session.category : 'Technical',
                    difficulty: session ? session.difficulty : 'Medium',
                    overallScore: metrics.overall,
                    technical: metrics.technical,
                    communication: metrics.communication,
                    timestamp: serverTimestamp(),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } else {
                await addDoc(collection(db, "leaderboard"), {
                    userId: 'anon',
                    name: displayName,
                    photo: photoURL,
                    company: session ? session.company : 'General',
                    category: session ? session.category : 'Technical',
                    difficulty: session ? session.difficulty : 'Medium',
                    overallScore: metrics.overall,
                    technical: metrics.technical,
                    communication: metrics.communication,
                    likes: 0,
                    reviews: [],
                    timestamp: serverTimestamp(),
                    createdAt: new Date().toISOString()
                });
            }
            console.log("Successfully published interview score to live community leaderboard!");
        } catch (err) {
            console.error("Firestore Leaderboard Sync Error:", err);
        }
    }
});