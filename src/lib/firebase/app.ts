// Neutral Firebase init — no auth, no analytics. Just the app + Firestore
// handle, safe to import anywhere (incl. server components). Auth and other
// browser-only pieces live in `client.ts`.
//
// The web config is PUBLIC by design (it identifies, it does not authorize).
// All values come from NEXT_PUBLIC_* env vars — see `.env.local.example`.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Guard against re-init across HMR / multiple imports.
export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);

// Region the snapzuleSubmitRun callable is deployed to. MUST match the region
// in functions/src/index.ts, or the client call 404s.
export const FUNCTIONS_REGION = "us-central1";
