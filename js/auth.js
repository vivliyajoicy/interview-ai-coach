/* ==========================================================================
   AI INTERVIEW COACH - AUTHENTICATION CONTROLLER (js/auth.js)
   ========================================================================== */

import { auth, provider, db } from './firebase.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Saves or updates user document in Firestore "users" collection
 */
async function syncUserToFirestore(user) {
    if (!user || !db) return;
    try {
        const uid = user.uid || 'candidate_' + Date.now();
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
            uid: uid,
            displayName: user.displayName || 'Candidate User',
            email: user.email || `${uid}@intercoach.app`,
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
            lastLoginAt: serverTimestamp()
        }, { merge: true });
        console.log("Candidate synced to Firestore successfully!");
    } catch (err) {
        console.error("Firestore sync error:", err);
    }
}

function showLoadingOverlay(caption) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingCaption = document.getElementById('loading-caption-text');
    if (loadingCaption && caption) loadingCaption.innerText = caption;
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Handles Google Sign-In via Popup
 */
export async function loginWithGoogle() {
    try {
        // 1. Sign in via Popup (Avoids redirect 404 errors!)
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // 2. Write document to Firestore 'users' collection
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || "Candidate",
            email: user.email,
            photoURL: user.photoURL || "",
            lastLogin: serverTimestamp()
        }, { merge: true });

        console.log("User document written to Firestore!");
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Login Error:", error);
    }
}

/**
 * Handles Instant Candidate Demo Login (Fast, reliable access)
 */
export async function loginAsDemoCandidate() {
    showLoadingOverlay("Preparing Candidate Session...");
    try {
        const candidateId = 'cand_' + Math.floor(100000 + Math.random() * 900000);
        const userData = {
            uid: candidateId,
            displayName: 'Candidate User',
            email: `candidate_${candidateId.slice(-4)}@intercoach.app`,
            photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${candidateId}`
        };

        // Sync candidate into Firebase Firestore 'users' collection so active candidates count updates
        await syncUserToFirestore(userData);

        localStorage.setItem('intercoach_user', JSON.stringify(userData));

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 300);
    } catch (err) {
        console.error("Demo login error:", err);
        hideLoadingOverlay();
    }
}

/**
 * Handles user logout across pages
 */
export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
    localStorage.removeItem('intercoach_user');
    localStorage.removeItem('intercoach_current_session');
    window.location.href = 'index.html';
}

/**
 * Synchronizes DOM components with auth state
 * @param {Object|null} user - Firebase User object
 */
async function handleAuthStateUI(user) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const storedUser = JSON.parse(localStorage.getItem('intercoach_user') || 'null');

    const activeUser = user || storedUser;

    if (activeUser) {
        // User signed in
        const userData = {
            uid: activeUser.uid,
            displayName: activeUser.displayName || 'Candidate User',
            email: activeUser.email || 'candidate@intercoach.app',
            photoURL: activeUser.photoURL || 'https://via.placeholder.com/80'
        };
        localStorage.setItem('intercoach_user', JSON.stringify(userData));

        if (user) {
            await syncUserToFirestore(user);
        }

        // Update dashboard elements if present
        const dashboardUserName = document.getElementById('dashboard-user-name');
        const dashboardUserPhoto = document.getElementById('dashboard-user-photo');
        if (dashboardUserName) dashboardUserName.innerText = userData.displayName;
        if (dashboardUserPhoto) dashboardUserPhoto.src = userData.photoURL;

        // Update profile elements if present
        const profileName = document.getElementById('profile-name-display');
        const profileEmail = document.getElementById('profile-email-display');
        const profilePhoto = document.getElementById('profile-photo-display');
        if (profileName) profileName.innerText = userData.displayName;
        if (profileEmail) profileEmail.innerText = userData.email;
        if (profilePhoto) profilePhoto.src = userData.photoURL;

        // Redirect away from login page if already authenticated
        if (currentPage === 'login.html') {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Protect private routes
        const protectedPages = ['dashboard.html', 'interview.html', 'result.html', 'profile.html'];
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }

    if (currentPage === 'login.html') {
        hideLoadingOverlay();
    }
}

// Global Auth State Observer
onAuthStateChanged(auth, (user) => {
    handleAuthStateUI(user);
});

// Attach DOM Listener for Login Buttons
document.addEventListener('DOMContentLoaded', () => {
    hideLoadingOverlay();

    const googleLoginBtn = document.getElementById('googleLogin');
    const demoLoginBtn = document.getElementById('demoLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const cancelLoadingBtn = document.getElementById('cancel-loading-btn');

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', loginWithGoogle);
    }

    if (demoLoginBtn) {
        demoLoginBtn.addEventListener('click', loginAsDemoCandidate);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    if (cancelLoadingBtn) {
        cancelLoadingBtn.addEventListener('click', hideLoadingOverlay);
    }
});