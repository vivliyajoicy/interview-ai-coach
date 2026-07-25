/* ==========================================================================
   AI INTERVIEW COACH - LEADERBOARD & PEER REVIEW CONTROLLER (js/leaderboard.js)
   ========================================================================== */

import { db, auth, collection, getDocs, doc, setDoc, updateDoc, increment, arrayUnion, query, orderBy } from './firebase.js';
import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('leaderboard-table-body');
    const podiumContainer = document.getElementById('podium-container');
    const reviewModal = document.getElementById('review-modal');

    let selectedStarRating = 5;

    loadCommunityLeaderboard();

    /**
     * Fetch & Render Live Community Rankings
     */
    async function loadCommunityLeaderboard() {
        try {
            if (!db) return;

            // Query live leaderboard collection
            const q = query(collection(db, "leaderboard"), orderBy("overallScore", "desc"));
            const querySnapshot = await getDocs(q);

            let candidates = [];

            if (!querySnapshot.empty) {
                querySnapshot.forEach((docSnap) => {
                    candidates.push({ id: docSnap.id, ...docSnap.data() });
                });
            } else {
                // If leaderboard collection has no records, check users collection
                const usersSnap = await getDocs(collection(db, "users"));
                if (!usersSnap.empty) {
                    usersSnap.forEach((userDoc) => {
                        const uData = userDoc.data();
                        candidates.push({
                            id: userDoc.id,
                            userId: userDoc.id,
                            name: uData.displayName || 'Candidate',
                            photo: uData.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (uData.displayName || 'Candidate'),
                            company: 'General Track',
                            category: 'Technical',
                            overallScore: uData.lastInterviewScore || 0,
                            technical: uData.lastInterviewScore || 0,
                            communication: uData.lastInterviewScore || 0,
                            likes: 0,
                            reviews: []
                        });
                    });
                }
            }

            if (candidates.length > 0) {
                renderPodium(candidates.slice(0, 3));
                renderTable(candidates);
            } else {
                renderEmptyState();
            }

            bindInteractiveEvents();

        } catch (err) {
            console.error("Leaderboard Sync Error:", err);
            renderEmptyState();
        }
    }

    /**
     * Render empty state when zero candidates exist in Firestore
     */
    function renderEmptyState() {
        if (podiumContainer) {
            podiumContainer.innerHTML = `
                <div class="podium-card glass rank-1" style="grid-column: 1 / -1; max-width: 500px; margin: 0 auto; text-align: center; padding: 2.5rem;">
                    <i class="fa-solid fa-trophy" style="font-size: 3rem; color: var(--cyan-glow); margin-bottom: 1rem;"></i>
                    <h3>Be the First on the Leaderboard!</h3>
                    <p class="text-muted" style="margin: 0.8rem 0 1.5rem 0;">No candidate simulation scores recorded yet. Complete your first mock interview practice session to claim #1 rank!</p>
                    <a href="dashboard.html" class="btn btn-primary btn-glow"><i class="fa-solid fa-rocket"></i> Start Practice Session</a>
                </div>
            `;
        }

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.8rem; display: block;"></i>
                        No candidate rankings found in database. Complete an interview to register your score.
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Render Top 3 Podium Cards
     */
    function renderPodium(top3) {
        if (!podiumContainer) return;

        const ranks = ['rank-1', 'rank-2', 'rank-3'];
        const crowns = ['fa-crown text-warn', 'fa-award text-secondary', 'fa-medal text-bronze'];
        const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];

        podiumContainer.innerHTML = top3.map((c, i) => {
            const avgStars = calculateAvgRating(c);
            return `
                <div class="podium-card glass ${ranks[i] || ''}">
                    <div class="podium-crown"><i class="fa-solid ${crowns[i] || 'fa-medal'}"></i></div>
                    <div class="podium-badge" style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">${medals[i] || ''}</div>
                    <img src="${c.photo || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + c.name}" class="podium-avatar" alt="${c.name}">
                    <h4>${c.name || 'Anonymous Candidate'}</h4>
                    <p class="text-muted" style="font-size:0.82rem;">${c.company || 'General Track'} • ${c.category || 'Technical'}</p>
                    <div class="podium-score-tag gradient-text">${c.overallScore || 0}% Score</div>
                    <div style="font-size: 0.85rem; color: #ffd700; margin-bottom: 0.5rem;">
                        ${avgStars > 0 ? `⭐ ${avgStars.toFixed(1)} / 5.0` : '⭐ No ratings yet'}
                    </div>
                    <button class="upvote-btn btn-sm glass" data-id="${c.id}">
                        <i class="fa-solid fa-thumbs-up text-glow"></i> <span class="vote-count">${c.likes || 0}</span> Upvotes
                    </button>
                </div>
            `;
        }).join('');
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

            const avgStars = calculateAvgRating(c);
            const ratingText = avgStars > 0 ? `⭐ ${avgStars.toFixed(1)}` : `⭐ Rate`;

            row.innerHTML = `
                <td class="rank-col"><strong>#${index + 1}</strong></td>
                <td class="candidate-col">
                    <div class="candidate-user-cell">
                        <img src="${c.photo || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + c.name}" class="candidate-avatar-mini" style="border: 1px solid var(--cyan-glow);" alt="Avatar">
                        <div>
                            <strong>${c.name || 'Anonymous Candidate'}</strong><br>
                            <small class="text-muted">${c.company || 'General Track'}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge glass">${c.category || 'Technical'}</span></td>
                <td><strong class="text-cyan" style="color: var(--cyan-glow); font-size: 1.1rem;">${c.overallScore || 0}%</strong></td>
                <td><small>${c.technical || 0}% / ${c.communication || 0}%</small></td>
                <td>
                    <button class="upvote-btn btn-sm glass" data-id="${c.id}">
                        <i class="fa-solid fa-thumbs-up"></i> <span class="vote-count">${c.likes || 0}</span>
                    </button>
                </td>
                <td>
                    <button class="review-btn btn-sm btn-secondary glass" data-id="${c.id}" data-name="${c.name || 'Candidate'}">
                        <i class="fa-solid fa-star" style="color: #ffd700;"></i> ${ratingText}
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * Helper to compute candidate's average user rating
     */
    function calculateAvgRating(candidate) {
        if (candidate.avgRating && typeof candidate.avgRating === 'number') {
            return candidate.avgRating;
        }
        if (candidate.reviews && Array.isArray(candidate.reviews) && candidate.reviews.length > 0) {
            const ratings = candidate.reviews.filter(r => r.rating).map(r => Number(r.rating));
            if (ratings.length > 0) {
                return ratings.reduce((a, b) => a + b, 0) / ratings.length;
            }
        }
        return 0;
    }

    /**
     * Bind Upvotes, Star Ratings, and Peer Review Modal Controls
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

        // Star Rating Selection inside Review Modal
        const starIcons = document.querySelectorAll('.star-rating-select i');
        starIcons.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating || 5);
                selectedStarRating = rating;

                starIcons.forEach((s, idx) => {
                    if (idx < rating) {
                        s.classList.remove('fa-regular');
                        s.classList.add('fa-solid');
                        s.style.color = '#ffd700';
                    } else {
                        s.classList.remove('fa-solid');
                        s.classList.add('fa-regular');
                        s.style.color = 'rgba(255, 255, 255, 0.3)';
                    }
                });
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

                    const candidateNameEl = document.getElementById('modal-candidate-name');
                    if (candidateNameEl) candidateNameEl.textContent = `Rate & Review Candidate: ${name}`;

                    // Reset star UI
                    selectedStarRating = 5;
                    starIcons.forEach(s => {
                        s.classList.remove('fa-regular');
                        s.classList.add('fa-solid');
                        s.style.color = '#ffd700';
                    });

                    const closeBtn = document.getElementById('close-modal-btn');
                    const submitBtn = document.getElementById('submit-review-btn');

                    if (closeBtn) {
                        closeBtn.onclick = () => {
                            reviewModal.classList.add('hidden');
                            reviewModal.style.display = 'none';
                        };
                    }

                    if (submitBtn) {
                        submitBtn.onclick = async () => {
                            const commentArea = document.getElementById('review-input-text');
                            const comment = commentArea ? commentArea.value.trim() : '';

                            const activeUser = auth.currentUser || JSON.parse(localStorage.getItem('intercoach_user') || '{}');
                            const reviewerName = activeUser.displayName || 'Anonymous Peer';

                            if (docId && db) {
                                try {
                                    const leaderboardRef = doc(db, "leaderboard", docId);
                                    await updateDoc(leaderboardRef, {
                                        reviews: arrayUnion({
                                            reviewer: reviewerName,
                                            rating: selectedStarRating,
                                            comment: comment || 'Rated performance.',
                                            timestamp: new Date().toISOString()
                                        })
                                    });
                                } catch(e) {
                                    console.error("Firestore Review Storage Error:", e);
                                }
                            }

                            if (commentArea) commentArea.value = '';
                            reviewModal.classList.add('hidden');
                            reviewModal.style.display = 'none';
                            if (typeof showToast === 'function') showToast(`Submitted ${selectedStarRating}⭐ rating for ${name}!`, "success");

                            // Reload standings to display updated rating
                            setTimeout(loadCommunityLeaderboard, 800);
                        };
                    }
                }
            });
        });
    }
});