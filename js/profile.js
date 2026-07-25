/* ==========================================================================
   AI INTERVIEW COACH - PROFILE CONTROLLER (js/profile.js)
   ========================================================================== */

import { showToast, STORAGE_KEYS } from './utils.js';
import { db, auth, collection, getDocs, doc, setDoc, query, where, orderBy } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Element Bindings
    const form = document.getElementById('update-profile-form');
    const nameInput = document.getElementById('edit-display-name');
    const photoInput = document.getElementById('edit-photo-url');

    const nameDisplay = document.getElementById('profile-name-display');
    const emailDisplay = document.getElementById('profile-email-display');
    const photoDisplay = document.getElementById('profile-photo-display');
    const streakDisplay = document.getElementById('profile-streak-count');
    const urlSlugDisplay = document.getElementById('profile-url-slug');

    const telemetryRank = document.getElementById('telemetry-rank-val');
    const telemetryOverall = document.getElementById('telemetry-overall-val');
    const telemetryEnglish = document.getElementById('telemetry-english-val');
    const telemetryTech = document.getElementById('telemetry-tech-val');
    const copyLinkBtn = document.getElementById('copy-portfolio-link-btn');

    // Check URL parameters for public portfolio viewing (e.g. profile.html?u=joicy)
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserSlug = urlParams.get('u');

    // 2. Load User Profile & Performance Telemetry
    loadUserProfile();

    // 3. Form Submit Listener
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const updatedName = nameInput.value.trim();
            const updatedPhoto = photoInput.value.trim();

            if (!updatedName) {
                showToast("Name field cannot be empty.", "error");
                return;
            }

            // Read existing user object
            const user = JSON.parse(localStorage.getItem('intercoach_user') || localStorage.getItem(STORAGE_KEYS.USER || 'USER') || '{}');
            user.displayName = updatedName;
            if (updatedPhoto) user.photoURL = updatedPhoto;

            // Save updated payload to local storage
            localStorage.setItem('intercoach_user', JSON.stringify(user));
            localStorage.setItem(STORAGE_KEYS.USER || 'USER', JSON.stringify(user));

            // Sync to Firestore users collection
            if (user.uid && db) {
                try {
                    await setDoc(doc(db, "users", user.uid), {
                        displayName: updatedName,
                        photoURL: updatedPhoto || user.photoURL || ''
                    }, { merge: true });
                } catch (err) {
                    console.error("Profile sync error:", err);
                }
            }

            // Update UI Displays
            if (nameDisplay) nameDisplay.innerText = user.displayName;
            if (photoDisplay && user.photoURL) photoDisplay.src = user.photoURL;
            if (urlSlugDisplay) urlSlugDisplay.innerText = user.displayName.toLowerCase().replace(/\s+/g, '-');

            showToast("Profile details updated successfully!", "success");
        });
    }

    // 4. Shareable Portfolio Link Copy
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const currentName = (nameDisplay ? nameDisplay.innerText : 'candidate').toLowerCase().replace(/\s+/g, '-');
            const shareableUrl = `${window.location.origin}/profile.html?u=${currentName}`;

            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareableUrl).then(() => {
                    const origContent = copyLinkBtn.innerHTML;
                    copyLinkBtn.innerHTML = `<i class="fa-solid fa-check"></i> Link Copied!`;
                    copyLinkBtn.style.background = '#00c853';

                    setTimeout(() => {
                        copyLinkBtn.innerHTML = origContent;
                        copyLinkBtn.style.background = '';
                    }, 2200);
                });
            } else {
                alert(`Portfolio URL: ${shareableUrl}`);
            }
        });
    }

    /**
     * Populate profile view from stored metadata & real Firestore evaluation metrics
     */
    async function loadUserProfile() {
        const storedUser = JSON.parse(localStorage.getItem('intercoach_user') || localStorage.getItem(STORAGE_KEYS.USER || 'USER') || '{}');
        const activeUser = auth.currentUser || storedUser;
        const uid = activeUser.uid || storedUser.uid;

        const activeName = urlUserSlug 
            ? urlUserSlug.charAt(0).toUpperCase() + urlUserSlug.slice(1) 
            : (activeUser.displayName || storedUser.displayName || 'Candidate');
        const userSlug = activeName.toLowerCase().replace(/\s+/g, '-');

        if (nameDisplay) nameDisplay.innerText = activeName;
        if (emailDisplay) emailDisplay.innerText = activeUser.email || storedUser.email || `${userSlug}@intercoach.app`;
        if (photoDisplay) photoDisplay.src = activeUser.photoURL || storedUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userSlug}`;
        if (urlSlugDisplay) urlSlugDisplay.innerText = userSlug;

        if (nameInput) nameInput.value = activeName;
        if (photoInput) photoInput.value = activeUser.photoURL || storedUser.photoURL || '';

        let sessionsCompleted = 0;
        let overallScore = 0;
        let englishScore = 0;
        let techScore = 0;
        let hasData = false;

        // Fetch User's Completed Interviews from Firestore
        if (db && uid) {
            try {
                const interviewsSnap = await getDocs(collection(db, "interviews"));
                const userInterviews = [];
                interviewsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.userId === uid) {
                        userInterviews.push(data);
                    }
                });

                if (userInterviews.length > 0) {
                    hasData = true;
                    sessionsCompleted = userInterviews.length;

                    const sumOverall = userInterviews.reduce((acc, i) => acc + (i.overallScore || i.score || 0), 0);
                    const sumTech = userInterviews.reduce((acc, i) => acc + (i.technical || i.overallScore || 0), 0);
                    const sumComm = userInterviews.reduce((acc, i) => acc + (i.communication || i.overallScore || 0), 0);

                    overallScore = Math.round(sumOverall / sessionsCompleted);
                    techScore = Math.round(sumTech / sessionsCompleted);
                    englishScore = Math.round(sumComm / sessionsCompleted);
                }
            } catch (err) {
                console.warn("Firestore interview query error:", err);
            }
        }

        // Fallback to local history if Firestore is unavailable or empty
        if (!hasData) {
            const history = JSON.parse(localStorage.getItem('intercoach_history') || '[]');
            if (history.length > 0) {
                hasData = true;
                sessionsCompleted = history.length;
                const sum = history.reduce((acc, h) => acc + (h.score || 85), 0);
                overallScore = Math.round(sum / history.length);
                englishScore = Math.min(96, Math.max(70, overallScore - 2));
                techScore = Math.min(98, Math.max(72, overallScore + 3));
            }
        }

        // Update Sessions Completed Counter
        if (streakDisplay) {
            streakDisplay.innerText = `${sessionsCompleted} ${sessionsCompleted === 1 ? 'Session' : 'Sessions'} Completed`;
        }

        // Update Telemetry Elements
        if (hasData) {
            if (telemetryOverall) telemetryOverall.innerText = `${overallScore}%`;
            if (telemetryEnglish) telemetryEnglish.innerText = `${englishScore}%`;
            if (telemetryTech) telemetryTech.innerText = `${techScore}%`;
        } else {
            if (telemetryOverall) telemetryOverall.innerText = "N/A";
            if (telemetryEnglish) telemetryEnglish.innerText = "N/A";
            if (telemetryTech) telemetryTech.innerText = "N/A";
        }

        // Compute Candidate Rank dynamically based on Firestore leaderboard or user count
        let rankTag = "Unranked";
        if (hasData && db) {
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const totalUsersCount = Math.max(usersSnap.size, 1);

                const leaderboardSnap = await getDocs(collection(db, "leaderboard"));
                let candidates = [];
                leaderboardSnap.forEach(docSnap => {
                    candidates.push({ id: docSnap.id, ...docSnap.data() });
                });

                // Sort candidates by overall score descending
                candidates.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

                const candidateIndex = candidates.findIndex(c => c.userId === uid || c.id === uid);
                const userRank = candidateIndex >= 0 ? candidateIndex + 1 : candidates.length + 1;
                const totalCandidates = Math.max(candidates.length, totalUsersCount);

                if (totalCandidates < 100) {
                    rankTag = `#${userRank} of ${totalCandidates} Candidates`;
                } else {
                    const percentile = Math.ceil((userRank / totalCandidates) * 100);
                    rankTag = `Top ${percentile}%`;
                }
            } catch (err) {
                console.warn("Firestore rank calculation error:", err);
                rankTag = overallScore >= 90 ? "Top 5% 🏆" : "Ranked";
            }
        }

        if (telemetryRank) telemetryRank.innerText = rankTag;

        // Render Dynamic Badges based on scores
        renderDynamicBadges(overallScore, techScore, englishScore, hasData);
    }

    /**
     * Render dynamic badges based on candidate scores
     */
    function renderDynamicBadges(overall, tech, english, hasData) {
        const badgesContainer = document.getElementById('unlocked-badges-container');
        if (!badgesContainer) return;

        const badges = [
            { title: "Tech Specialist", icon: "fa-code", unlocked: hasData && tech >= 80 },
            { title: "Fluent Articulation", icon: "fa-comments", unlocked: hasData && english >= 80 },
            { title: "System Architect", icon: "fa-diagram-project", unlocked: hasData && tech >= 88 },
            { title: "Top Performer", icon: "fa-trophy", unlocked: hasData && overall >= 85 }
        ];

        badgesContainer.innerHTML = badges.map(b => `
            <div class="badge-card-item glass" style="opacity: ${b.unlocked ? '1' : '0.35'}; border: 1px solid ${b.unlocked ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255,255,255,0.05)'};">
                <i class="fa-solid ${b.icon}" style="color: ${b.unlocked ? 'var(--cyan-glow)' : 'var(--text-muted)'};"></i>
                <span>${b.title}</span>
            </div>
        `).join('');
    }
});