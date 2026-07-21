/* ==========================================================================
   AI INTERVIEW COACH - FIREBASE CORE INITIALIZATION ENGINE (js/firebase.js)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Configuration Object
const firebaseConfig = {
    apiKey: "AIzaSyA8e7jlqSYqURVudAGTUb_YRKs-Pru-w6E",
    authDomain: "inter-coach.firebaseapp.com",
    projectId: "inter-coach",
    storageBucket: "inter-coach.firebasestorage.app",
    messagingSenderId: "1067589533708",
    appId: "1:1067589533708:web:05cbe3fffe2f648371ae29",
    measurementId: "G-75QPLJ4HNM"
};

// Initialize Firebase App Instance
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication & Google Provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Configure Google Auth Provider Scopes & Custom Parameters
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
    prompt: 'select_account'
});

// Export Auth Service Interfaces for Shared Modules
export { app, auth, provider };