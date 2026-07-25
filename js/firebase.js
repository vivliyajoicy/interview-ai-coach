/* ==========================================================================
   AI INTERVIEW COACH - FIREBASE CORE INITIALIZATION ENGINE (js/firebase.js)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc,
    getDoc,
    updateDoc, 
    increment,
    arrayUnion, 
    query, 
    orderBy, 
    where, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA8e7jlqSYqURVudAGTUb_YRKs-Pru-w6E",
    authDomain: "inter-coach.firebaseapp.com",
    projectId: "inter-coach",
    storageBucket: "inter-coach.firebasestorage.app",
    messagingSenderId: "1067589533708",
    appId: "1:1067589533708:web:05cbe3fffe2f648371ae29",
    measurementId: "G-75QPLJ4HNM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({ prompt: 'select_account' });

export { 
    app, auth, db, provider, 
    collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, increment, arrayUnion, query, orderBy, where, serverTimestamp 
};