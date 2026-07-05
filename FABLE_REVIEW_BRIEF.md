# RepairAI Pro — Full UX/Usability/Design Review Brief

**Purpose of this document:** onboard a fresh review session (Fable 5) with everything needed to critique this app's usability, dashboards, workflows, and design end-to-end — without re-deriving context from scratch. This is a review brief, not a technical handoff — it's optimized for "look at this with expert eyes and tell me what's wrong," not "continue coding this feature."

**Last updated:** 2026-07-05 — reflects the state of `main` as of commit `fb947d6`, deployed live at `https://repair-ai-pro-eight.vercel.app`.

---

## 1. What this app is

RepairAI Pro is a two-sided marketplace connecting homeowners with independent home-repair contractors (plumbing, electrical, HVAC, handyman, etc.), differentiated by:

- **AI diagnosis** — homeowner describes/photographs a problem, AI identifies the trade and estimates a realistic price range before any human is involved
- **Instant Book** — for jobs under $500, the top-ranked available contractor gets a 15-minute exclusive window to accept at a pre-set price (Uber-style), falling back to normal bidding if no one accepts
- **Contractor-as-creator** — contractors run a "Studio" with a social feed (before/after work posts, trending algorithm, follower counts), an AI business advisor, and a "Wrapped"-style annual stats card, positioning the app as much as a growth tool for contractors as a lead source
- **Milestone escrow payments** via Stripe Connect, with photo-verified work and homeowner confirmation gating fund release

**Business model:** contractors pay a subscription (Starter free / Pro $79mo / Elite $149mo) for AI tools + a 12% platform fee on completed jobs. Homeowners use it free.

**Target contractor persona spans a wide technical-skill range** — this matters a lot for the UX review: some contractors are solo operators with minimal tech comfort, others run multi-crew businesses with existing calendar/CRM systems. Several features (see §4) were deliberately built with tiered complexity to serve both ends without alienating either.

---

## 2. What to actually review — the ask

The founder wants an expert pass on:
1. **Usability** — is anything confusing, buried, or requires too many steps?
2. **Dashboards** — admin panel, contractor Studio, homeowner dashboard — are they showing the right information prominently?
3. **Workflows** — job posting → matching → booking → payment → completion. Where does friction live?
4. **Design/visual** — consistency, hierarchy, whether it feels premium or feels like a prototype
5. **Information architecture** — see the "known issue" flagged in §6 about duplicate/parallel routes; this is probably the single highest-value thing to fix
6. **General product expertise** — anything a strong marketplace-product person would flag that hasn't been considered

This is pre-launch. No real users yet. Brutal honesty is more valuable than polish-affirming feedback.

---

## 3. How to explore it

- **Live production URL:** https://repair-ai-pro-eight.vercel.app (real deployed build, not localhost)
- **Local dev:** `npm run dev` from the repo root, or use the preview tools if running inside Claude Code
- **Design system reference:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — color tokens, component library, spacing/typography scale
- **Full route inventory:** see §5 below — walk through the homeowner flow and the contractor flow separately, they're genuinely different products stitched into one app

---

## 4. Feature inventory (what's been built, grouped by area)

### Homeowner-facing
- AI photo/text diagnosis with cost estimation (`/diagnose`)
- Job posting (`/jobs/new`) with Instant Book toggle for sub-$500 jobs
- Job detail page (`/jobs/[jobId]`) — the single most feature-dense page in the app: status timeline, bids, chat, milestone payments, work photo uploads, before/after comparison, dispute filing, video consultation, appointment booking. **Worth checking whether this page has become overloaded.**
- Contractor browsing (`/contractor`, `/contractor/[id]`)
- Booking a specific appointment slot with a contractor once assigned (Calendly-style picker, built this session)
- In-app real-time chat per job
- Financing pre-qualification (`/financing`) — Wisetack lead-capture flow
- Home maintenance plans (`/maintenance`)

### Contractor-facing
- **Studio** (`/studio`) — the contractor's home base: social post feed, AI business advisor chat, analytics, subscription upsell
- **Scheduling** (`/contractor/schedule`) — three layered systems built this session:
  1. Native day-block calendar (available/busy/blocked toggle)
  2. Working hours + job duration + buffer time + auto-accept-bookings settings
  3. iCal feed import (paste a Google/Outlook/Apple calendar link, busy times sync in automatically, no OAuth)
- Contractor inbox for job invitations and bids (`/contractor-inbox`)
- Earnings dashboard (`/contractor/earnings`, `/dashboard/contractor/earnings`) — **note the apparent duplication, see §6**
- "Contractor Wrapped" — Spotify-Wrapped-style annual stats share card (`/studio/wrapped`)
- Pro subscription tiers (`/contractor/pro`)
- Onboarding flow (`/onboarding/contractor`) including Stripe Connect setup

### Admin (`/admin/*`)
- Overview — platform-wide stats, job status breakdown
- Funnel — conversion tracking
- Jobs, Disputes, Contractors, Users — management tables
- **Payouts** (built this session) — platform revenue, contractor transfer status, flags stuck/failed payouts

### Cross-cutting infrastructure (less relevant to UX review, noted for completeness)
- Email/password + Google auth, legal pages (terms/privacy/contact/unsubscribe), PWA install, cookie consent banner, help widget, cron jobs (weekly digest email, stale-job rebroadcast, calendar sync)

---

## 5. Full route inventory (current, generated from the actual codebase)

```
/                              Landing page
/about /contact /terms /privacy /unsubscribe    Legal/info
/auth/signin /auth/forgot-password              Auth

--- Homeowner ---
/diagnose /estimate /analysis                   AI diagnosis (3 similar routes — check overlap)
/jobs /jobs/new /jobs/create-premium            Job posting (2 "new job" routes — check overlap)
/jobs/[jobId]                                   Job detail (very feature-dense, see §4)
/jobs/[jobId]/video/[consultId]                 Video consultation
/dashboard /dashboard/contractor                Dashboards
/history /invoices /my-jobs /notifications      Account views
/maintenance /maintenance/new /maintenance/[planId]   Maintenance plans
/financing /guarantee /referral
/match                                          ?  (worth checking what this is)
/services /services/[trade]/[city]              SEO landing pages
/contractor /contractor/[id]                    Browse/view contractors
/contractor/[id]/reviews/new
/pro/[id]                                       ? (possible dupe of /contractor/[id])
/tradesmen                                      ? (possible dupe of /contractor)
/upload

--- Contractor ---
/contractor-profile /contractor-profile-premium  (2 routes — check overlap)
/contractor-inbox /contractor-inbox/bids
/contractor/schedule /contractor/pro /contractor/profile /contractor/earnings
/dashboard/contractor/jobs /dashboard/contractor/earnings /dashboard/contractor/settings
/studio /studio/analytics /studio/wrapped
/onboarding /onboarding/contractor(+subpages) /onboarding/homeowner(+subpages)

--- Chat ---
/chat /chat-premium /chat/[id]                  (2 top-level chat routes — check overlap)
/ai /ai-assistant                               (2 routes — check overlap)

--- Admin ---
/admin /admin/funnel /admin/jobs /admin/disputes /admin/payouts /admin/contractors /admin/users

--- Social/work feed ---
/work /work/[postId] /work/post
```

---

## 6. Known issues I'd flag myself (honest self-assessment, not comprehensive)

1. **Parallel/duplicate routes — verified by checking actual internal links, not guessed.** I grepped the codebase for references to each suspicious route:
   - **Confirmed orphaned (zero internal links anywhere in the app)** — these pages exist and presumably build/render, but nothing in the app actually navigates to them: `/tradesmen`, `/pro/[id]`, `/chat-premium`, `/contractor-profile-premium`, `/jobs/create-premium`. These are almost certainly abandoned mid-redesign and are strong candidates for deletion — dead weight in the sitemap that could confuse a reviewer or SEO crawler with no upside.
   - **Still referenced, needs a closer look:** `/ai-assistant` (1 internal reference), `/match` (4 internal references) — these aren't orphaned, but worth confirming they're not redundant with `/ai` or `/diagnose` respectively before assuming they're both needed.
   - **`/analysis` is also confirmed orphaned** (zero internal links) — add it to the deletion candidates above. `/diagnose` (1 reference) and `/estimate` (2 references) are both actually linked, so this looks like two live, separate flows rather than a leftover — worth confirming they're intentionally distinct rather than redundant.
   - **`/contractor/earnings` and `/dashboard/contractor/earnings`** are each referenced once — both are live, linked from different places. Worth checking whether they show the same information (in which case one should redirect to the other) or genuinely different views.

   **This is probably the single most valuable thing for a UX reviewer to resolve** — delete the confirmed-orphaned pages, then decide on a canonical version of each remaining overlapping pair and redirect or merge the rest.

2. **`/jobs/[jobId]` is very feature-dense.** Status timeline, bids list, milestone setup, work photos, before/after, chat, appointment booking, dispute filing, video consult all live on one page with conditional rendering by job status. It works, but it's the page most likely to feel overwhelming to a first-time user. Worth checking whether progressive disclosure (tabs, accordions) would help.

3. **Contractor scheduling has three layered systems** (day-blocks, working hours, iCal import) that were deliberately built to serve different contractor tech-comfort levels — but that's also three things to explain on one settings page. Worth checking if the page (`/contractor/schedule`) does a good job of making it obvious which one a given contractor actually needs, or if it reads as "three separate calendar systems, pick one" confusion.

4. **No custom domain yet** — still on `repair-ai-pro-eight.vercel.app`. Not a UX issue per se, but affects how "real" the app feels during a review.

5. **Stripe live/test mode unconfirmed** — being verified separately, not urgent for a UX pass since it doesn't change any screen.

---

## 7. What NOT to worry about in this review

- Backend correctness, security, Firestore query performance — already audited separately this session
- Legal/compliance content — already reviewed
- Whether cron jobs/email deliverability work — infrastructure, not UX

Stay focused on: does a homeowner or contractor actually understand what to do at each step, does the visual design support that, and is anything genuinely broken or confusing from a first-time-user perspective.
