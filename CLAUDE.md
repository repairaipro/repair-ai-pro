# RepairAI Pro — Project Memory

This file is auto-loaded into every Claude Code conversation in this repo. Keep it current — it's how a brand-new conversation picks up where the last one left off, without you re-explaining the app.

**Update this file whenever a session ships something significant** (new feature, major fix, architectural decision, or a shift in priorities). Keep it dense — bullet facts, not narrative. Prune stale/completed items rather than letting the file grow forever; move deep historical detail out (git log has it) and keep only what's still decision-relevant.

## What this is

AI-powered home repair marketplace (Next.js App Router + Firebase + Stripe + OpenAI GPT-4o), serving Houston, TX. Homeowners describe a problem (text/photo/voice) → AI diagnoses it → get a smart cost estimate + parts list → post a job → contractors bid → escrowed payment via Stripe Connect.

**Stack**: Next.js 15 App Router, Firebase (Auth, Firestore, Storage, Admin SDK on server), Stripe + Stripe Connect, OpenAI GPT-4o (diagnosis, vision, parts, pricing), Tailwind, Framer Motion. Deployed on Vercel at `repair-ai-pro-eight.vercel.app`.

## Agreed strategy (do not re-litigate without the user)

Sequencing: **tool first → identity/social → AI-refereed marketplace → OS/fintech later.** One-city wedge (Houston). North-star metric: **time-to-first-bid** after a job is posted (tracked in `/admin/funnel`, target ≤15min median). Free `/diagnose` tool is the demand magnet; contractor profiles are the supply magnet; `/work` feed is the social layer on top.

## Current state (as of 2026-07-24)

Production build is green (`npx next build` exits 0, zero warnings). All 4 strategy layers are built: tools / identity+social / marketplace / financing.

**Core platform**: marketplace (post/bid/claim), homeowner + contractor dashboards, Stripe Connect payouts, milestone payments, $49 insurance reports, notifications (Email/Resend, Push/FCM, SMS/Twilio), quality scores, verified specializations, video consultations (Agora), PWA, 64 SEO landing pages (`/services/[trade]/[city]`), social layer (posts/likes/follows/feed), consumer financing, retention engine (seasonal maintenance suggestions).

**AI pipeline (`/jobs/new`), reworked this session — this is the most actively-developed area:**
- Diagnosis (`/api/ai-chat`): now returns ranked likely causes, "what a pro checks first", confidence, and a safety/urgency flag — not just a one-line summary.
- Smart Estimate (`/api/jobs/estimate`): labor/parts split, risk factors and additional-cost chips (previously computed server-side then silently dropped on the client), honest basis line (real comparables vs. AI-estimated).
- Parts-finder (`/api/parts-finder`): rewritten to tie every recommended part to the **confirmed diagnosis** + **uploaded photo** (GPT-4o vision) + **identifying details** (vehicle year/make/model, appliance brand/model — asked via `TradeQuestionnaire`). Trade-aware sourcing (automotive → AutoZone/O'Reilly/RockAuto, not Home Depot). Two-pass: generic parts right after diagnosis, refined to fitment-exact once the questionnaire is answered. Hard rule: never fabricate a vehicle/model that wasn't given.
- Fixed bugs found while verifying live: numeric `estimatedPrice` silently dropping all parts (now coerced), an unhelpful photo zeroing out the parts list (now falls back to text-only), JSON-array parsing → pinned `json_object` output.

**All ~100 auth'd API routes** now declare `export const dynamic = "force-dynamic"` (they read headers/url per-request; this silences build-time "Dynamic server usage" warnings with no runtime change).

## Gotchas (verified painful — don't rediscover these)

- **Never run `next build` while a dev server is live against the same `.next` dir** — corrupts the dev server's incremental cache (`Cannot find module './NNNN.js'` errors). Fix: stop dev server, `rm -rf .next/cache`, restart.
- **`@vercel/og` does not work in this local build environment** — the bundled font loader chokes on the path containing spaces (`Maintenance Artificial Intelligence App`). Don't re-introduce `next/og` locally expecting it to render; it's fine on Vercel.
- Repo mixes LF/CRLF; git warns on every commit touching those files — harmless, ignore it.
- Any new file under `src/app/api/**/route.ts` that reads `request.headers`/`request.url`/cookies needs `export const dynamic = "force-dynamic"` or the build logs a (harmless but noisy) warning.
- Firestore/Storage security rules and indexes are **not** deployed by `git push` — they need explicit `firebase deploy --only firestore:rules`, `firestore:indexes`, or `storage` after any rule/index change. Easy to forget and ship a feature that 403s in prod.
- `pricingEstimate.ts`, `qualityScore`, `specializations` libs are **server-only** (Firebase Admin SDK) — never import from a client component.
- Worktrees don't carry untracked files (like `.env.local`) — if a worktree build fails with an auth/invalid-api-key error, copy `.env.local` from the main repo root.

## Pending / user action needed

- Stripe webhook registration + keys, Agora video keys, Resend email key verification, Twilio SMS (optional) — see `.env.local`.
- `CRON_SECRET` env var for the win-back cron (`vercel.json` cron is wired, daily 14:00 UTC).
- Real-world spot check of the photo→parts vision path with an actual repair photo (verified working with a controlled synthetic test — a fridge label image whose model number, present only in the photo, correctly appeared in every recommended part).

## Next candidates (not yet started, no strong ordering commitment)

- Affiliate revenue on parts retailer links (AutoZone/O'Reilly/etc. links are currently plain search links, no tracking params — needs enrollment in each program first).
- Redis/Upstash rate limiting once traffic justifies it (currently in-memory, per-route+IP).
- Wire the funnel dashboard data into the admin overview page.
