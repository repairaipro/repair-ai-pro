# Session Handoff — RepairAI Pro

**Last updated:** 2026-07-05, end of session. Latest commit: `efda108` on `main`, pushed and **deployed live** at https://repair-ai-pro-eight.vercel.app.

**To resume in a new conversation, just say:** *"Read SESSION_HANDOFF.md and continue."*

---

## What to do first in a new session

1. Read this file.
2. Read [EXPERT_OPERATING_PROMPT.md](EXPERT_OPERATING_PROMPT.md) — that's the standing self-prompt (CEO/COO/staff-engineer/designer lenses + a 7-step audit→ship loop). Its "Current top-of-stack" section is the live priority list — check it, it may have been updated since this handoff was written.
3. Pick up at **"What's next"** below, or ask the user which they want.

---

## What happened this session (chronological, for context — don't redo any of this)

**Booking system (Phases 1-2):** contractors can now set working hours, block days on a native calendar, and import a Google/Outlook/Apple calendar via iCal feed (read-only, daily cron refresh). Homeowners book real appointment slots from a Calendly-style picker on the job page. Files: `src/lib/availability.ts` (the merge engine), `src/components/CalendarConnect.tsx`, `src/components/BookingSlotPicker.tsx`, `/contractor/schedule`.

**Real-time chat:** `JobChat.tsx` switched from 2-second polling to a Firestore `onSnapshot` listener. Also fixed a bug where sends never carried an auth token (silent 401s).

**Admin payouts dashboard:** `/admin/payouts` — the admin panel had no visibility into Stripe Connect money movement. Shows platform revenue, contractor payout status, flags stuck/failed transfers.

**Performance:** fixed an N+1 query pattern in the booking system (was doing 1 query per active job instead of 1 query total, via a new `contractorId` field denormalized onto appointment docs + a `collectionGroup` query — see `fetchContractorBusyBlocks()` in `src/lib/availability.ts`).

**Deployment:** discovered 12 commits were sitting local-only, unpushed — nothing built in prior sessions was actually live. Pushed everything, fixed a Vercel Hobby-plan cron rejection (hourly → daily for iCal sync), deployed. **This project deploys via `npx vercel --prod --yes` run manually from this repo — there is no GitHub-triggered auto-deploy configured.** Always push AND run that deploy command; pushing alone does nothing to production.

**Full UX/business review (6 rounds, the bulk of this session):** ran via `FABLE_REVIEW_BRIEF.md` (still at repo root, useful background but now historical) and `EXPERT_OPERATING_PROMPT.md`. Findings and fixes, all shipped to prod:

1. **Role-aware navigation** — header/mobile nav showed identical links to both marketplace sides. New `src/lib/useRole.ts` (`useIsContractor()` hook, checks `contractors/{uid}` doc existence, sessionStorage-cached) is now the single source of truth used by Header, MobileBottomNav, and the dashboard.
2. **7 orphaned pages deleted** — `/tradesmen`, `/pro/[id]`, `/chat-premium`, `/contractor-profile-premium`, `/jobs/create-premium`, `/analysis`, `/match` (all verified zero internal links before deletion, not guessed).
3. **Broken unread-message badge fixed** — was incrementing forever, never reset, duplicate listeners.
4. **Positioning corrected** — landing page said "Any job. Any trade... Uber for any skilled service"; now says "Snap it. Price it. Fixed today." / "AI-Powered Home Repair · Houston, TX", matching the actual one-city home-repair strategy.
5. **Fabricated stats removed** — "1,200+ Jobs Posted / 340+ Verified Pros / 4.9★" (on a pre-launch app with zero users) replaced with true product facts.
6. **Duplicate earnings pages consolidated** — `/contractor/earnings` now redirects to canonical `/dashboard/contractor/earnings`.
7. **Job page (`/jobs/[jobId]`) tabbed** — Overview / Messages / Payments / Photos, shown only once a contractor is assigned (via `inTab()` render guards — no component moves, minimal diff).
8. **Contractor supply funnel was circularly broken** — the biggest bug found all session. `/onboarding` used to auto-route by checking if a `contractors/{uid}` doc already existed, but that doc is only ever created BY contractor onboarding — so new pros had no way in. Fixed: `/onboarding` is now a two-sided role chooser, sign-in honors `?redirect=` (validated same-origin only), all "Join as a Pro" CTAs route through it.
9. **Homeowner onboarding ceremony deleted** — two nearly-empty optional steps (city/zip/phone) replaced with routing straight into `/jobs/new` (first job post IS the onboarding now).
10. **Diagnose→post funnel fixed** — `/jobs/new`'s sign-in wall was dropping the `?desc=` handoff from the free-diagnosis flow; the highest-intent moment in the whole app was landing users on an empty dashboard. Now the full URL (including the diagnosis text) survives the sign-in round-trip.

Every single change in this list was verified with a production build, a live preview check (console errors, actual route responses), committed with a why-focused message, pushed, deployed with `npx vercel --prod --yes`, and confirmed live in production via curl against `https://repair-ai-pro-eight.vercel.app`. Nothing here is theoretical — it's all shipped.

---

## What's next (in priority order per the operating loop)

1. **Funnel instrumentation** — `/admin/funnel` exists but needs real events wired through the actual user journey (land → diagnose → signup → post → match → pay) so drop-off is visible. Needs a quick decision from the founder on which events matter most; propose the list above as a starting point.
2. **Real testimonials** — 3 testimonials on the landing page are still sample/invented content. Either get real ones from early users or remove the section. This is the last known integrity gap on the site.
3. **Diagnose-photo handoff** — `/diagnose` → `/jobs/new` carries the text description via `?desc=` but NOT the photo the user uploaded. Minor, but worth a look.
4. **Stripe live-mode + webhook verification** — still unconfirmed, and only the founder can check it (Vercel treats `STRIPE_SECRET_KEY` as a write-only "sensitive" env var — not even Claude can read it back). Founder needs to check dashboard.stripe.com: is the key `sk_live_` or `sk_test_`? Is a webhook registered pointing at `/api/stripe/webhook`?
5. **No custom domain yet** — still on `repair-ai-pro-eight.vercel.app`. Founder doesn't have one yet; revisit if/when they buy one.

---

## Standing facts worth knowing

- **Business model:** two-sided home-repair marketplace, Houston-only wedge. Contractors pay subscription ($0/$79/$149) + 12% platform fee. Homeowners free.
- **Vercel plan:** Hobby — cron jobs are daily-max (already hit this limit once: hourly iCal sync had to become daily). No auto-deploy from GitHub; must run `npx vercel --prod --yes` manually after pushing.
- **Firebase project:** `repair-ai-pro`. Firestore rules/indexes are deployed live and current as of this session (`npx firebase deploy --only firestore`).
- **The founder is non-technical in places** — explain trade-offs plainly, act autonomously on reversible decisions, ask before anything hard-to-reverse (matches the standing safety rules).
