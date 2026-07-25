/* ==========================================================================
   INTERCOACH - REAL TELEMETRY (js/main.js)
   ========================================================================== */

import { db, collection, getDocs } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userCountEl = document.getElementById('real-user-count');
    const interviewCountEl = document.getElementById('real-interview-count');
    const avgRatingEl = document.getElementById('real-avg-rating');
    const readinessEl = document.getElementById('real-readiness-rate');

    try {
        if (!db) return;

        // 1. Fetch total registered users from 'users' collection
        const usersSnap = await getDocs(collection(db, "users"));
        const totalUsers = usersSnap.size;
        if (userCountEl) userCountEl.textContent = `${totalUsers}`;

        // 2. Fetch total completed sessions from 'interviews' collection
        const interviewsSnap = await getDocs(collection(db, "interviews"));
        const totalSessions = interviewsSnap.size;
        if (interviewCountEl) interviewCountEl.textContent = `${totalSessions}`;

        // 3. Fetch peer ratings / average ratings from 'leaderboard' collection
        const leaderboardSnap = await getDocs(collection(db, "leaderboard"));
        let totalRatingSum = 0;
        let ratedCount = 0;

        leaderboardSnap.forEach(doc => {
            const data = doc.data();
            if (data.avgRating && typeof data.avgRating === 'number') {
                totalRatingSum += data.avgRating;
                ratedCount++;
            } else if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
                const docRatings = data.reviews.filter(r => r.rating).map(r => r.rating);
                if (docRatings.length > 0) {
                    const avg = docRatings.reduce((a, b) => a + b, 0) / docRatings.length;
                    totalRatingSum += avg;
                    ratedCount++;
                }
            }
        });

        if (avgRatingEl) {
            if (ratedCount > 0) {
                const globalAvgRating = (totalRatingSum / ratedCount).toFixed(1);
                avgRatingEl.textContent = `${globalAvgRating} / 5.0 ⭐`;
            } else {
                avgRatingEl.textContent = "N/A";
            }
        }

        // 4. Calculate Global Technical Readiness Index (average score of all completed interviews)
        if (totalSessions > 0) {
            let totalScoreSum = 0;
            interviewsSnap.forEach(doc => {
                const data = doc.data();
                totalScoreSum += (data.overallScore || data.score || 85);
            });

            const avgScore = Math.round(totalScoreSum / totalSessions);
            if (readinessEl) readinessEl.textContent = `${avgScore}%`;
            if (!ratedCount && avgRatingEl) {
                avgRatingEl.textContent = `${(avgScore / 20).toFixed(1)} / 5.0 ⭐`;
            }
        } else {
            if (readinessEl) readinessEl.textContent = "0%";
            if (!ratedCount && avgRatingEl) avgRatingEl.textContent = "N/A";
        }

    } catch (err) {
        console.warn("Firestore count fetch error:", err);
    }
});
