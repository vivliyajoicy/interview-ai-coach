/* ==========================================================================
   AI INTERVIEW COACH - UTILITY ENGINE & SHARED HELPERS (js/utils.js)
   ========================================================================== */

/**
 * Storage Keys Registry
 */
export const STORAGE_KEYS = {
    USER: 'intercoach_user',
    CURRENT_SESSION: 'intercoach_current_session',
    HISTORY: 'intercoach_history',
    SETTINGS: 'intercoach_settings'
};

/**
 * Format elapsed seconds into mm:ss display
 * @param {number} seconds 
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Show temporary glassmorphic toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success' | 'error' | 'info'
 */
export function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `glass toast-item toast-${type}`;
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 12px;
        color: #fff;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(12px);
        animation: slideIn 0.3s ease-out forwards;
    `;

    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Speech Synthesis Helper (Text to Speech for AI Questions)
 * @param {string} text - Text to read aloud
 */
export function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any active speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Save completed interview session to user history
 * @param {Object} sessionResult 
 */
export function saveToHistory(sessionResult) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    history.unshift(sessionResult);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

/**
 * Generate PDF report export wrapper
 * @param {string} elementId - ID of DOM element to capture
 * @param {string} filename - Name of exported PDF file
 */
export function exportToPDF(elementId, filename = 'Interview_Evaluation_Report.pdf') {
    const element = document.getElementById(elementId);
    if (!element || typeof html2pdf === 'undefined') {
        showToast('PDF Export engine unavailable', 'error');
        return;
    }

    const opt = {
        margin:       0.5,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, backgroundColor: '#0a0f1d' },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}