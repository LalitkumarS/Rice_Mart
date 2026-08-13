// backend/firebase-admin.js
//
// Loads Firebase Admin credentials from environment variables instead of a
// committed JSON key file, so nobody accidentally ships (or depends on
// someone else's) service-account secrets.
//
// Setup (see SETUP.md):
//   1. Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
//   2. Copy the values into backend/.env as FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
//      FIREBASE_PRIVATE_KEY (keep the JSON file itself OUT of the repo).
const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// .env files can't hold real newlines in a value, so the private key is stored
// with literal "\n" sequences and unescaped here.
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "FATAL ERROR: Firebase Admin credentials are missing.\n" +
    "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend/.env.\n" +
    "See SETUP.md for how to generate these from your own Firebase project."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

module.exports = admin;
