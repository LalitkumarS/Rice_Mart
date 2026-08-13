// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// These values come from YOUR OWN Firebase project (Project Settings -> General
// -> Your apps -> SDK setup and configuration). They are safe to expose in the
// frontend bundle — Firebase's real protection is Security Rules + backend
// token verification, not keeping this object secret.
//
// IMPORTANT: this must be the SAME Firebase project as the service account
// used in backend/firebase-admin.js, or ID token verification on the backend
// will always fail with "invalid-id-token" / project mismatch errors.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
