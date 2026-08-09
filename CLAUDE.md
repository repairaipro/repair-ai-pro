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
