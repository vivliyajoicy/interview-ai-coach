/* ==========================================================================
   AI INTERVIEW COACH - PROFILE CONTROLLER (js/profile.js)
   ========================================================================== */

import { showToast, STORAGE_KEYS } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Element Bindings
    const form = document.getElementById('update-profile-form');
    const nameInput = document.getElementById('edit-display-name');
    const photoInput = document.getElementById('edit-photo-url');
    const roleInput = document.getElementById('edit-target-role');

    const nameDisplay = document.getElementById('profile-name-display');
    const emailDisplay = document.getElementById('profile-email-display');
    const photoDisplay = document.getElementById('profile-photo-display');
    const streakDisplay = document.getElementById('profile-streak-count');

    // Load initial user data
    loadUserProfile();

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const updatedName = nameInput.value.trim();
            const updatedPhoto = photoInput.value.trim();

            if (!updatedName) {
                showToast("Name field cannot be empty.", "error");
                return;
            }

            // Read existing user object
            const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
            user.displayName = updatedName;
            if (updatedPhoto) user.photoURL = updatedPhoto;

            // Save updated payload to storage
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

            // Update UI
            if (nameDisplay) nameDisplay.innerText = user.displayName;
            if (photoDisplay && user.photoURL) photoDisplay.src = user.photoURL;

            showToast("Profile details updated successfully!", "success");
        });
    }

    /**
     * Populate profile view from stored metadata and session logs
     */
    function loadUserProfile() {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
        const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');

        if (nameDisplay) nameDisplay.innerText = user.displayName || 'Candidate';
        if (emailDisplay) emailDisplay.innerText = user.email || 'candidate@example.com';
        if (photoDisplay && user.photoURL) photoDisplay.src = user.photoURL;

        if (nameInput) nameInput.value = user.displayName || '';
        if (photoInput) photoInput.value = user.photoURL || '';

        if (streakDisplay) {
            const count = history.length;
            streakDisplay.innerText = `${count} ${count === 1 ? 'Session' : 'Sessions'} Completed`;
        }
    }
});