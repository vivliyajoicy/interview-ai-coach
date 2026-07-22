/* ==========================================================================
   AI INTERVIEW COACH - LEADERBOARD & PEER REVIEW CONTROLLER (js/leaderboard.js)
   ========================================================================== */

import { db, collection, getDocs, doc, updateDoc, increment, arrayUnion, query, orderBy } from './firebase.js';
import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('leaderboard-table-body');
    const podiumContainer = document.getElementById('podium-container');
    const reviewModal = document.getElementById('review-modal');

    loadCommunityLeaderboard();

    /**
     * Fetch & Render Live Community Rankings
     */
    async function loadCommunityLeaderboard() {
        try {
            const q = query(collection(db, "leaderboard"), orderBy("overallScore", "desc"));
            const querySnapshot = await getDocs(q);

            let candidates = [];

            if (!querySnapshot.empty) {
                querySnapshot.forEach((docSnap) => {
                    candidates.push({ id: docSnap.id, ...docSnap.data() });
                });
            } else {
                // Default fallback records if Firebase collection is empty
                candidates = getFallbackCandidates();
            }

            renderPodium(candidates.slice(0, 3));
            renderTable(candidates);
            bindInteractiveEvents();

        } catch (err) {
            console.error("Leaderboard Sync Error:", err);
            const fallback = getFallbackCandidates();
            renderPodium(fallback.slice(0, 3));
            renderTable(fallback);
            bindInteractiveEvents();
        }
    }

    /**
     * Render Top 3 Podium Cards
     */
    function renderPodium(top3) {
        if (!podiumContainer) return;

        const ranks = ['podium-rank-1', 'podium-rank-2', 'podium-rank-3'];
        const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];

        podiumContainer.innerHTML = top3.map((c, i) => `
            <div class="podium-card glass ${ranks[i] || ''}">
                <div class="podium-badge">${medals[i] || ''}</div>
                <img src="${c.photo || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + c.name}" class="podium-avatar" alt="${c.name}">
                <h4>${c.name || 'Anonymous Candidate'}</h4>
                <p class="text-muted">${c.company || 'General Track'} • ${c.category || 'Technical'}</p>
                <div class="podium-score gradient-text">${c.overallScore}% Score</div>
                <button class="upvote-btn btn-sm glass" data-id="${c.id}" style="margin-top: 10px;">
                    <i class="fa-solid fa-thumbs-up text-glow"></i> <span class="vote-count">${c.likes || 0}</span>
                </button>
            </div>
        `).join('');
    }

    /**
     * Render Full Standings Table Body
     */
    function renderTable(candidates) {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        candidates.forEach((c, index) => {
            const row = document.createElement('tr');
            row.className = 'leaderboard-row glass';

            row.innerHTML = `
                <td class="rank-col"><strong>#${index + 1}</strong></td>
                <td class="candidate-col">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${c.photo || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + c.name}" style="width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--cyan-glow);" alt="Avatar">
                        <div>
                            <strong>${c.name || 'Anonymous Candidate'}</strong><br>
                            <small class="text-muted">${c.company || 'General Track'}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge glass">${c.category || 'Technical'}</span></td>
                <td><strong class="text-cyan" style="color: var(--cyan-glow); font-size: 1.1rem;">${c.overallScore}%</strong></td>
                <td><small>${c.technical || 88}% / ${c.communication || 84}%</small></td>
                <td>
                    <button class="upvote-btn btn-sm glass" data-id="${c.id}">
                        <i class="fa-solid fa-thumbs-up"></i> <span class="vote-count">${c.likes || 0}</span>
                    </button>
                </td>
                <td>
                    <button class="review-btn btn-sm btn-secondary glass" data-id="${c.id}" data-name="${c.name || 'Candidate'}">
                        <i class="fa-solid fa-star" style="color: #ffbd2e;"></i> Rate / Review
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * Bind Upvotes and Peer Review Modal Controls
     */
    function bindInteractiveEvents() {
        // Upvote Buttons
        document.querySelectorAll('.upvote-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const docId = btn.dataset.id;
                const countSpan = btn.querySelector('.vote-count');

                try {
                    if (docId && db) {
                        const leaderboardRef = doc(db, "leaderboard", docId);
                        await updateDoc(leaderboardRef, { likes: increment(1) });
                    }
                } catch (e) {
                    console.error("Upvote sync error:", e);
                }

                if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent || 0) + 1;
                }
                if (typeof showToast === 'function') showToast("Helpful vote submitted!", "success");
            });
        });

        // Peer Review Button Clicks
        document.querySelectorAll('.review-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.dataset.id;
                const name = btn.dataset.name;

                if (reviewModal) {
                    reviewModal.classList.remove('hidden');
                    reviewModal.style.display = 'flex';

                    // Insert candidate name into modal if title container exists
                    const modalTitle = reviewModal.querySelector('h3, h4');
                    if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-star text-warn"></i> Review ${name}`;

                    // Handle Close & Submit inside existing HTML modal
                    const closeBtn = reviewModal.querySelector('.close-modal-btn, #close-modal-btn, .btn-secondary');
                    const submitBtn = reviewModal.querySelector('.submit-review-btn, #submit-review-btn, .btn-primary');

                    if (closeBtn) {
                        closeBtn.onclick = () => {
                            reviewModal.classList.add('hidden');
                            reviewModal.style.display = 'none';
                        };
                    }

                    if (submitBtn) {
                        submitBtn.onclick = async () => {
                            const commentArea = reviewModal.querySelector('textarea');
                            const comment = commentArea ? commentArea.value.trim() : '';

                            if (docId && comment && db) {
                                try {
                                    const leaderboardRef = doc(db, "leaderboard", docId);
                                    await updateDoc(leaderboardRef, {
                                        reviews: arrayUnion({
                                            reviewer: "Logged In Candidate",
                                            comment: comment,
                                            timestamp: new Date().toISOString()
                                        })
                                    });
                                } catch(e) { console.error(e); }
                            }

                            if (commentArea) commentArea.value = '';
                            reviewModal.classList.add('hidden');
                            reviewModal.style.display = 'none';
                            if (typeof showToast === 'function') showToast("Peer feedback submitted successfully!", "success");
                        };
                    }
                }
            });
        });
    }

    /**
     * Fallback Candidates List
     */
    function getFallbackCandidates() {
        return [
            { id: '1', name: 'Pragnasheel B', company: 'Microsoft Track', category: 'Behavioral', overallScore: 94, technical: 92, communication: 96, likes: 18 },
            { id: '2', name: 'Joicy R', company: 'Amazon Track', category: 'Technical', overallScore: 91, technical: 94, communication: 88, likes: 14 },
            { id: '3', name: 'Rahul Sharma', company: 'Zoho Track', category: 'Aptitude', overallScore: 89, technical: 90, communication: 88, likes: 9 },
            { id: '4', name: 'Ananya Verma', company: 'Google Track', category: 'System Design', overallScore: 87, technical: 89, communication: 85, likes: 6 }
        ];
    }
});