# RepairAI Pro — Project Memory

This file is auto-loaded into every Claude Code conversation in this repo. Keep it current — it's how a brand-new conversation picks up where the last one left off, without you re-explaining the app.

**Update this file whenever a session ships something significant** (new feature, major fix, architectural decision, or a shift in priorities). Keep it dense — bullet facts, not narrative. Prune stale/completed items rather than letting the file grow forever; move deep historical detail out (git log has it) and keep only what's still decision-relevant.

## What this is

AI-powered home repair marketplace (Next.js App Router + Firebase + Stripe + OpenAI GPT-4o), serving Houston, TX. Homeowners describe a problem (text/photo/voice) → AI diagnoses it → get a smart cost estimate + parts list → post a job → contractors bid → escrowed payment via Stripe Connect.

**Stack**: Next.js 15 App Router, Firebase (Auth, Firestore, Storage, Admin SDK on server), Stripe + Stripe Connect, OpenAI GPT-4o (diagnosis, vision, parts, pricing), Tailwind, Framer Motion. Deployed on Vercel at `repair-ai-pro-eight.vercel.app`.

## Agreed strategy (do not re-litigate without the user)

Sequencing: **tool first → identity/social → AI-refereed marketplace → OS/fintech later.** One-city wedge (Houston). North-star metric: **time-to-first-bid** after a job is posted (tracked in `/admin/funnel`, target ≤15min median). Free `/diagnose` tool is the demand magnet; contractor profiles are the supply magnet; `/work` feed is the social layer on top.

## Current state (as of 2026-08-09)

Production build is green (`npx next build` exits 0, zero warnings, `tsc --noEmit` clean). All 4 strategy layers are built: tools / identity+social / marketplace / financing.

**⭐ See `HANDOFF.md` (repo root) for a full feature-by-feature testing checklist and open strategic questions** — written 2026-08-08 for a systematic testing pass. First pass completed 2026-08-09 (see below); delete/fold it in once fully acted on.

**QA pass round 1 (2026-08-09)**: drove the app live end-to-end as two real accounts — signup → AI diagnosis → Smart Estimate → parts → job posting → contractor bidding → homeowner bid selection → job assigned. All of it worked. One real bug found and fixed: an **uncaught Firestore `permission-denied` console error** on job detail pages (any contractor viewing an open job before bidding/being selected triggered it) — the security rules were correct (non-participants shouldn't read reviews/attachments/messages), but `ReviewCard`, `JobTimeline`, `ChatAttachmentsBar`, and `chat/[id]`'s message listener were the only `onSnapshot()` calls in the codebase with no error callback, which is what makes Firestore log to console instead of failing silently. Fixed those + swept for and fixed 7 more instances of the same missing-callback pattern elsewhere (lower risk, same fix). **Convention going forward: every `onSnapshot()` call must pass an error callback**, even a no-op one — that's the established pattern everywhere else in this codebase.

**QA pass round 2 (2026-08-09)**: continued the live pass — chat, `/contractor-inbox`, bid history, `/work`, marketing pages. Found and fixed a real bug: **`/contractor-inbox/bids` showed "0 Total Bids" for every contractor**, even ones with real, won bids. Root cause: **there was no Firestore rule at all for the `bids` subcollection** (`jobs/{jobId}/bids/{bidId}`) — invisible until now because every other bid read (job detail page, select-bid) goes through server API routes on the Admin SDK, which bypasses rules entirely. `/contractor-inbox/bids` is the one page that reads bids via a direct client-side `collectionGroup('bids')` listener, and Firestore's default-deny silently rejected it (no console error either, since the listener already had a correct error callback from round 1's fix — it just looked like "no bids ever submitted").

Fixing it surfaced two non-obvious Firestore rules constraints worth remembering for any future collection-group read:
1. **A nested `match` block's rule cannot be used by Firestore's `list`-safety checker for a `collectionGroup()` query — even a fully permissive `allow read: if true`.** A rule nested inside `match /jobs/{jobId} { match /bids/{bidId} {...} } }` requires a concrete `jobId` binding that a query spanning every job can't provide, so Firestore denies the whole list regardless of how permissive the condition is. The read rule has to live in a **top-level `match /{path=**}/bids/{bidId}` block** instead. This doesn't affect writes (always target one concrete job) or `get()`-style single-document reads — only `list`/query operations.
2. **The rule must check the same FIELD the query filters on, not a document ID that happens to equal it.** `/contractor-inbox/bids` queries `where('contractorId', '==', uid)` — a rule written as `bidId == uid()` (the doc ID, which the API route happens to set to the same value) can't be statically verified against that field-based filter, so Firestore denies the list either way. The working rule checks `resource.data.contractorId == uid()`.

Verified against the real Firebase **client SDK** (not the Admin SDK, which bypasses rules and would hide this class of bug) — confirmed the exact query failing before the fix and succeeding after, then confirmed live in the browser. Deployed via `firebase deploy --only firestore:rules` (a rules-only change — no app code, ships independently of the Vercel deploy).

**QA pass round 3 (2026-08-09)**: continued through Studio sub-pages (analytics, wrapped — both fine), then found `/contractor/schedule` always redirected a real contractor back to `/contractor` — the whole scheduling/calendar feature was unreachable. Two distinct, real bugs stacked here:
1. **A missing API route.** The page's own "is this a contractor" gate, plus `CalendarConnect` and `WorkingHoursSettings` (both rendered on that same page), all called `GET /api/contractors/${uid}` with no subpath — a route that never existed (only nested subpaths like `[id]/availability`, `[id]/working-hours` do). Every call 404'd. Fixed by (a) switching the page's own gate to `useIsContractor()` instead of reinventing a broken check, and (b) adding the actually-missing `GET /api/contractors/[id]` route (signedIn-only, matches the existing `contractors/{id}` Firestore read rule) so the two settings widgets can hydrate a contractor's already-saved iCal feed/working hours instead of silently showing blank defaults every visit.
2. **A real race condition in `useIsContractor()` itself**, only exposed once something used it to gate a redirect (nothing had before). `user` in `AuthContext` starts as `undefined` before Firebase's `onAuthStateChanged` resolves, then becomes `null` (signed out) or the real user. The hook's `if (!user)` check treated `undefined` the same as `null`, setting `roleLoaded: true, isContractor: false` immediately on the very first render — before auth had actually resolved. On the render where `user` flips to the real object, the hook's own corrective update hasn't flushed yet, so anything gating a redirect on `roleLoaded`/`isContractor` in that same render sees the stale false reading and fires before the correction lands one render later. Fixed: only `user === null` sets `roleLoaded` immediately now; `user === undefined` correctly waits. **Any other page that ever adds a redirect-on-mount gated by this hook needs this fix already in place — it's now in `useRole.ts`, nothing more to do, but worth knowing why it was subtle enough to survive this long undetected** (every existing consumer before this only used it to hide/show a badge, where a one-frame flicker is invisible).

Verified both with a temporary debug render (printed `isContractor`/`roleLoaded`/`uid` directly on the page to see real values, since the redirect made it impossible to observe otherwise) before confirming the real fix live with a fresh navigation.

**Core platform**: marketplace (post/bid/claim), homeowner + contractor dashboards, Stripe Connect payouts, milestone payments, $49 insurance reports, notifications (Email/Resend, Push/FCM, SMS/Twilio), quality scores, verified specializations, video consultations (Agora), PWA, 64 SEO landing pages (`/services/[trade]/[city]`), social layer (posts/likes/follows/feed), consumer financing, retention engine (seasonal maintenance suggestions).

**AI pipeline (`/jobs/new`)** — diagnosis (`/api/ai-chat`): ranked likely causes, "what a pro checks first", confidence, safety/urgency flag. Smart Estimate (`/api/jobs/estimate`): labor/parts split, risk factors, additional-cost chips, honest basis (real comparables vs. AI-estimated). Parts-finder (`/api/parts-finder`): ties every part to the confirmed diagnosis + uploaded photo (GPT-4o vision) + identifying details (vehicle/appliance specifics), trade-aware retailer sourcing, two-pass refinement, never fabricates a vehicle/model that wasn't given.

**Dual-role identity system (2026-08-08)**: one account can be both homeowner and contractor (matches Uber driver/rider, Airbnb host/guest — not a bug to eliminate). Key pieces:
- `useIsContractor()` (`src/lib/useRole.ts`) — the CAPABILITY signal (does `contractors/{uid}` exist). This is the only source of truth for role; the legacy `users/{uid}.role` field is stuck at `"guest"` for every account and must never be used.
- `useActiveMode()` (same file) — the VIEW signal (which nav a dual-role account is currently browsing as), localStorage-persisted per-uid, with a live event so an already-mounted header updates instantly.
- Header shows a Homeowner/Contractor toggle **only once an account actually has both roles**.
- `ProfileMenu.client.tsx` — the account dropdown (avatar click). Shows role badge + "Switch to X view" once dual-role, or "Become a pro" if not yet a contractor.
- **Becoming a contractor requires `/onboarding/contractor`** (the 4-step wizard) — `/contractor-profile` (the raw edit form: Google Business import, portfolio, insurance upload) is gated behind already having a contractor identity, matching how Uber/Airbnb gate driver/host signup before showing profile-management tooling. Every homeowner-facing link that used to point at `/contractor-profile` (dashboard Quick Links, homepage CTAs) now points at the wizard instead.

**All ~100 auth'd API routes** declare `export const dynamic = "force-dynamic"` (they read headers/url per-request; silences build-time "Dynamic server usage" warnings with no runtime change).

## Gotchas (verified painful — don't rediscover these)

- **Never run `next build` while a dev server is live against the same `.next` dir** — corrupts the dev server's incremental cache (`Cannot find module './NNNN.js'` errors). Fix: stop dev server, `rm -rf .next/cache`, restart.
- **`@vercel/og` does not work in this local build environment** — the bundled font loader chokes on the path containing spaces (`Maintenance Artificial Intelligence App`). Don't re-introduce `next/og` locally expecting it to render; it's fine on Vercel.
- Repo mixes LF/CRLF; git warns on every commit touching those files — harmless, ignore it.
- Any new file under `src/app/api/**/route.ts` that reads `request.headers`/`request.url`/cookies needs `export const dynamic = "force-dynamic"` or the build logs a (harmless but noisy) warning.
- Firestore/Storage security rules and indexes are **not** deployed by `git push` — they need explicit `firebase deploy --only firestore:rules`, `firestore:indexes`, or `storage` after any rule/index change. Easy to forget and ship a feature that 403s in prod.
- `pricingEstimate.ts`, `qualityScore`, `specializations` libs are **server-only** (Firebase Admin SDK) — never import from a client component.
- Worktrees don't carry untracked files (like `.env.local`) — if a worktree build fails with an auth/invalid-api-key error, copy `.env.local` from the main repo root.
- **Vercel CLI is pinned to `vercel@57.0.0` for deploys** — v58.9.0 added a stricter Root Directory validation that fails this project with "must be a relative path not starting with `./`" even though nothing is misconfigured. Always deploy with `npx vercel@57.0.0 --prod --yes`, not bare `vercel`.
- **Always test/share `https://repair-ai-pro-eight.vercel.app`**, never a `repair-ai-<random>-repairaipro...vercel.app` link — every `vercel --prod` mints one of those as a disposable snapshot, and it's NOT in Firebase's Google-OAuth authorized domains (shows `auth/unauthorized-domain`). The Vercel dashboard's "Visit" button on an old/stale deployment row leads to one of these — go through the project Overview instead, or just type the stable URL.
- A long-lived browser tab's console-message history can accumulate across an entire session; a "persistent" error that survives a clean dev-server restart with cache cleared may just be stale buffer — verify with a **brand-new tab** and/or `next build`/`tsc --noEmit` before trusting it's real.
- **Any `collectionGroup()` read needs its security rule written as a top-level `match /{path=**}/collectionName/{id}` block, checking the field the query actually filters on** — a rule nested inside a parent match (e.g. under `jobs/{jobId}`) is invisible to Firestore's `list`-safety checker for a true collection-group query, no matter how permissive, and a rule keyed on document ID can't be matched against a field-based `where()` filter. See the `bids` rule in `firestore.rules` for the full writeup — this cost a long debugging session to pin down and will recur on the next collection-group query added anywhere in the app.

## Pending / user action needed

- Stripe webhook registration + keys, Agora video keys, Resend email key verification, Twilio SMS (optional) — see `.env.local`.
- `CRON_SECRET` env var for the win-back cron (`vercel.json` cron is wired, daily 14:00 UTC).
- Real-world spot check of the photo→parts vision path with an actual repair photo (verified working with a controlled synthetic test — a fridge label image whose model number, present only in the photo, correctly appeared in every recommended part).

## Next candidates (not yet started, no strong ordering commitment)

- Systematic feature-by-feature testing pass — see `HANDOFF.md`.
- Affiliate revenue on parts retailer links (AutoZone/O'Reilly/etc. links are currently plain search links, no tracking params — needs enrollment in each program first).
- Redis/Upstash rate limiting once traffic justifies it (currently in-memory, per-route+IP).
- Wire the funnel dashboard data into the admin overview page.
- `/dashboard/contractor` is an orphaned route (not linked from anywhere reachable) — decide whether to finish or delete it.
