"use client";

// Browser-only Firebase surface: re-exports app/db, adds Google auth helpers
// and a GA4 `track` that stamps every event with app_name: "snapzule" so the
// shared analytics property can split behaviour by app.
//
// Login is intentionally lazy — the game plays fully anonymous; we only prompt
// Google sign-in at submit time (Phase 2).

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";
import { app, db } from "./app";

export { app, db };

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

/** Subscribe to auth changes. Returns the unsubscribe fn. */
export function onUser(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Analytics is browser-only and unsupported in some environments (SSR, certain
// privacy modes), so it's resolved lazily and `track` no-ops until ready.
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {
      /* analytics unavailable — fine, track() stays a no-op */
    });
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (analytics) logEvent(analytics, event, { app_name: "snapzule", ...params });
}
