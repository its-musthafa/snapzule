# Snapzule — Firebase setup & deploy checklist

Everything here is **deferred to you** (full FB access). Nothing in the repo
talks to Firebase until the env is filled. Run this end-to-end once.

## 0. Shared project — DO NOT clobber siblings

Snapzule shares ONE Firebase project with other Outshorts apps. Two ways a deploy
can destroy sibling apps — both are guarded, **keep them**:

- **Functions pruning.** Always deploy scoped to our codebase:
  ```
  firebase deploy --only functions:snapzule
  ```
  `firebase.json` tags our functions with `"codebase": "snapzule"`, so this only
  reconciles `snapzule*` functions. **Never** run a bare `firebase deploy` or
  `firebase deploy --only functions` from here — that prunes other codebases.
- **Rules/indexes are project-global.** They are intentionally NOT in
  `firebase.json`, so our deploys never touch them. Merge the rules below into
  the project's master `firestore.rules` by hand (§4).

## 1. Env (web config — public)

Copy `.env.local.example` → `.env.local`, fill from Firebase console
(Project settings → Web app). Add the same `NEXT_PUBLIC_*` vars to Vercel.

## 2. Auth

- Enable **Google** sign-in provider.
- Authorized domains: add `localhost`, your Vercel preview + prod domains.

## 3. Deploy the function

```
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions:snapzule      # scoped — safe
```
Confirm region is `us-central1` (matches `FUNCTIONS_REGION` in
`src/lib/firebase/app.ts`). Blaze plan required (you're on it).

## 4. Firestore security rules — MERGE, don't replace

Paste these blocks into the project's master `firestore.rules`. **Fill the admin
UID first** (rule 5 — without this, any signed-in Google user could be admin).

```
// ---- Snapzule -----------------------------------------------------------
// Admin = explicit UID allow-list. REPLACE before deploying rules.
function snapzuleIsAdmin() {
  return request.auth != null
    && request.auth.uid in ['REPLACE_WITH_ADMIN_UID'];
}

// Public board + counters: readable by all, written ONLY by the Cloud Function
// (firebase-admin bypasses rules; clients are denied so scores can't be forged).
match /snapzule_daily/{date} {
  allow read: if true;
  allow write: if false;
}
match /snapzule_meta/{doc} {
  allow read: if true;
  allow write: if false;
}
// Shared cross-app counter — function-only.
match /analytics/{doc} {
  allow read: if true;
  allow write: if false;
}
// Per-user docs (future streaks etc.) — owner-only, private fields.
match /snapzule_users/{uid} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == uid;
}
// -------------------------------------------------------------------------
```

> ⚠️ If the master rules historically defined `isAdmin()` as "any authenticated
> user", that is now exploitable (Snapzule adds public Google login). Fix it to a
> UID allow-list before deploying.

## 5. Composite indexes

**None required.** The whole daily board is one embedded doc (`snapzule_daily/{date}.top`),
read by document id — no queries, no composite indexes.

## 6. Smoke test

1. `npm run dev`, play the **Daily Challenge**, solve, **Submit Score** → Google
   popup → returns a rank.
2. `/leaderboard` shows the entry + world counter (allow ~60s ISR).
3. Check `snapzule_meta/global` and `analytics/global` both incremented.
