// src/config.js
//
// Central place for values that change between local dev and a real
// deployment. Set these in a root .env file (see .env.example) — Create
// React App only exposes vars prefixed with REACT_APP_, and you must
// restart `npm start` after changing them.

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;
