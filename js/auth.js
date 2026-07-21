/* ==========================================================================
   AI INTERVIEW COACH - AUTHENTICATION CONTROLLER (js/auth.js)
   ========================================================================== */

import { auth, provider } from './firebase.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * Handles Google Sign-In Popup workflow
 */
export async function loginWithGoogle() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const alertBox = document.getElementById('auth-alert');
    const alertText = document.getElementById('auth-alert-text');

    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    if (alertBox) alertBox.classList.add('hidden');

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Persist session user details to local storage for quick access
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'Candidate',
            email: user.email,
            photoURL: user.photoURL || 'https://via.placeholder.com/80'
        };
        localStorage.setItem('intercoach_user', JSON.stringify(userData));

        // Redirect to dashboard upon successful login
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error("Google Auth Error:", error);
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        if (alertBox && alertText) {
            alertText.innerText = error.message || "Failed to authenticate. Please try again.";
            alertBox.classList.remove('hidden');
        }
    }
}

/**
 * Handles user logout across pages
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem('intercoach_user');
        localStorage.removeItem('intercoach_current_session');
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

/**
 * Synchronizes DOM components with auth state
 * @param {Object|null} user - Firebase User object
 */
function handleAuthStateUI(user) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (user) {
        // User signed in
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'Candidate',
            email: user.email,
            photoURL: user.photoURL || 'https://via.placeholder.com/80'
        };
        localStorage.setItem('intercoach_user', JSON.stringify(userData));

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
        // User signed out
        localStorage.removeItem('intercoach_user');

        // Protect private routes
        const protectedPages = ['dashboard.html', 'interview.html', 'result.html', 'profile.html'];
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
}

// Global Auth State Observer
onAuthStateChanged(auth, (user) => {
    handleAuthStateUI(user);
});

// Attach DOM Listener for Login Button
document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLogin');
    const logoutBtn = document.getElementById('logoutBtn');

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', loginWithGoogle);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
});