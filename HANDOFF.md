# RepairAI Pro — Handoff & Testing Plan (2026-08-08, updated 2026-08-09)

Start your next conversation by pointing Claude at this file plus `CLAUDE.md` (which auto-loads anyway). This file exists to (1) let you systematically test every feature and log what needs work, and (2) give a new chat the full picture without you re-explaining anything.

**How to use this**: Go through each row of the checklist below on the live app (`https://repair-ai-pro-eight.vercel.app` — not any `repair-ai-<random>-...vercel.app` link, those are throwaway deploy snapshots). For anything broken, confusing, or missing, jot a one-line note in the "Notes" column or just tell Claude directly. Bring this file (or a copy with your notes filled in) to the next session and say "here's my testing pass, let's fix these" — that's a clean, scoped way to start.

**Round 1 status (2026-08-09)**: an automated pass already drove the rows marked ✅ below live, end to end, with two real accounts (a homeowner posting a job through the full AI pipeline, and a contractor bidding and getting selected). One real bug was found and fixed (uncaught Firestore permission errors on job pages — see `CLAUDE.md`). Rows marked ⬜ still need a human pass — most need real payment methods, phone numbers, or device permissions an automated session can't provide.

---

## Part 1 — Feature testing checklist

### Auth & account
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 1.1 | Email sign-up | Create account → lands on role chooser | ✅ verified |
| 1.2 | Google sign-in | Must use `repair-ai-pro-eight.vercel.app` — other deploy URLs aren't authorized for Google OAuth | ⬜ needs a real Google account |
| 1.3 | Sign out | Profile menu → Sign out | ✅ verified |
| 1.4 | Forgot password | `/auth/forgot-password` | ⬜ needs real email inbox |
| 1.5 | Role chooser | New account → "I need something fixed" vs "I'm a service pro" | ✅ verified |
| 1.6 | Profile menu | Click avatar top-right — dropdown with name/email/role badge/links | ✅ verified |
| 1.7 | Role badge accuracy | Confirm badge matches reality (Homeowner vs Contractor) | ✅ verified |

### Homeowner: AI diagnosis + job posting (`/jobs/new`) — most actively developed area
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 2.1 | Text-only diagnosis | Describe a problem, no photo, get AI diagnosis | ✅ verified |
| 2.2 | Photo diagnosis | Upload a real repair photo — does vision genuinely inform the diagnosis? | ⬜ only synthetic-image tested so far — needs a real repair photo |
| 2.3 | Voice diagnosis | Record audio describing the issue | ⬜ needs mic access, not automatable |
| 2.4 | Video diagnosis | Record video of the problem | ⬜ needs camera access, not automatable |
| 2.5 | Diagnosis card content | Likely causes ranked, "what a pro checks first," confidence badge, safety flag when relevant | ✅ verified |
| 2.6 | Clarifying questions | One-at-a-time UI, skip works, answers reach the backend | ✅ verified — answers correctly appear in the posted job description |
| 2.7 | Trade auto-detect | Correct trade selected; manual override works | ✅ verified |
| 2.8 | Trade questionnaire | One question at a time, single/multi-select, yes/no, skip optional | ✅ verified |
| 2.9 | Smart Estimate | Price range, labor/parts split, risk factors, additional-cost chips, honest "comparables vs AI-estimated" basis | ✅ verified |
| 2.10 | Parts recommendations | Tied to diagnosis; refines after vehicle/brand details entered; retailer links (AutoZone for cars, not Home Depot) | ✅ verified (plumbing case; retailers correctly Home Depot/Lowe's/SupplyHouse) |
| 2.11 | Job post submission | Full flow end to end, lands on job detail page | ✅ verified |

### Homeowner: marketplace & job management
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 3.1 | `/my-jobs` | See posted jobs, statuses | ✅ verified |
| 3.2 | Job detail page | Bids visible, can select a bid | ✅ verified — bid selection correctly flips job to "Contractor Assigned" |
| 3.3 | `/jobs` marketplace | Browse open jobs (as visitor and signed-in) | ✅ verified |
| 3.4 | `/contractor` directory | Browse/search contractors, view a profile | ✅ verified |
| 3.5 | Chat | Message a contractor about a job | ⬜ not yet driven |
| 3.6 | `/history` | Past completed jobs | ✅ verified |
| 3.7 | `/home-health` | Seasonal maintenance suggestions | ✅ verified |
| 3.8 | Insurance report ($49) | Purchase flow | ⬜ needs a real card, not automatable |
| 3.9 | Video consultation | Book/join | ⬜ needs Agora keys/device |
| 3.10 | Payment / escrow | `/pay/[invoiceId]`, milestone payments | ⬜ needs a real card, not automatable |

### Contractor path
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 4.1 | Become a Pro | Dashboard tile or homepage CTA → `/onboarding/contractor` wizard (4 steps) | ✅ verified |
| 4.2 | `/contractor-profile` | Full edit form once you're a contractor: trade, service area, Google Business import, portfolio, insurance verification | ✅ verified (gate + form both) |
| 4.3 | Dual-role toggle | Header Homeowner/Contractor switch appears only once you have both — flips nav, persists across reload | ✅ verified |
| 4.4 | `/contractor-inbox` | Job invitations, accept/decline | ⬜ page loads, invitation flow not driven |
| 4.5 | Bidding | Submit a bid on an open job | ✅ verified — includes the AI fair-price comparison ("Above market" etc.) |
| 4.6 | `/studio` | Contractor command center — money/pipeline/reputation | ✅ verified loads correctly and reflects assigned jobs |
| 4.7 | `/studio/analytics`, `/studio/wrapped` | | ⬜ not yet driven |
| 4.8 | `/contractor/schedule` | Calendar, iCal sync | ⬜ not yet driven |
| 4.9 | `/contractor/pro` | Pro subscription plans | ⬜ not yet driven |
| 4.10 | Stripe Connect payout | Bank verification, receiving a payout | ⬜ needs real Stripe test flow |
| 4.11 | Quality score / trust tier | Visible and sensible | ⬜ not yet driven |
| 4.12 | `/work` social feed | Post before/after photos, likes, follows, Discover/Following toggle | ⬜ not yet driven |

### Growth / SEO / retention surfaces
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 5.1 | `/diagnose` | Free no-signup AI tool, hands off to `/jobs/new` | ✅ verified |
| 5.2 | `/services/[trade]/[city]` | Spot-check a few of the 64 SEO pages | ✅ verified (1 of 64 spot-checked) |
| 5.3 | `/financing` | Consumer financing option | ⬜ not yet driven |
| 5.4 | `/guarantee` | Trust page | ⬜ not yet driven |
| 5.5 | Referral | `/referral` flow | ⬜ not yet driven |
| 5.6 | Notifications | Email, push (FCM), SMS actually arrive | ⬜ needs real email/phone/device |
| 5.7 | PWA install | Add to home screen, offline shell | ⬜ needs a real device |

### Admin
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 6.1 | `/admin/funnel` | North-star metric: time-to-first-bid | ⬜ needs real admin credentials (correctly gated — confirmed the auth redirect works) |
| 6.2 | `/admin/contractors`, `/admin/users`, `/admin/jobs`, `/admin/payouts`, `/admin/disputes` | | ⬜ same — needs real admin credentials |

---

## Part 2 — Known gaps / technical debt

**Fixed 2026-08-09**: uncaught Firestore permission-denied console errors from `onSnapshot()` calls missing error callbacks (11 files) — see `CLAUDE.md` "QA pass round 1."

**Still open:**
- **Affiliate revenue**: parts-retailer links (AutoZone/O'Reilly/etc.) are plain search links, no tracking params — needs enrollment in each affiliate program first.
- **Rate limiting**: in-memory per-route+IP; fine for now, needs Redis/Upstash before real traffic.
- **Funnel dashboard**: not yet wired into the admin overview page.
- **`/dashboard/contractor`**: an orphaned route — not linked from anywhere reachable, may be dead code worth deleting or finishing.
- **Photo→parts vision path**: verified working with a controlled synthetic test (fridge label image); not yet spot-checked with a real customer-submitted repair photo in production.
- **Env/setup pending**: Stripe webhook registration, Agora video keys, Resend email key verification, Twilio SMS (optional), `CRON_SECRET`.
- **Minor**: `/api/jobs/[jobId]/product-recommendations` returns HTTP 404 for "no recommendations yet" instead of a 200 with an empty result — functionally harmless (silently handled), but a debatable API design worth a quick cleanup someday.
- **Minor**: several job-detail API routes (`video-consultation`, `product-recommendations`, `completion/comparison`) return 403 for a contractor who's browsing/bidding but not yet selected — very likely intentional access control, but worth a deliberate look since it's silent rather than a friendly empty state.

## Part 3 — Architecture decisions made this session (don't re-litigate without reason)

- **Dual-role accounts are intentional**, not a bug — one account can be both homeowner and contractor, matching Uber driver/rider and Airbnb host/guest. A header toggle appears only once someone actually has both roles.
- **Becoming a contractor requires the deliberate `/onboarding/contractor` wizard** — `/contractor-profile` (the raw edit form) is gated behind already having a contractor identity, never a casual entry point.
- **`useIsContractor()`** (capability: does `contractors/{uid}` exist) is the source of truth for role — not the legacy `users/{uid}.role` field, which is stuck at `"guest"` for every account and shouldn't be used for anything.
- **Always deploy/test against `repair-ai-pro-eight.vercel.app`** — every `vercel --prod` also mints a disposable `repair-ai-<random>-...vercel.app` URL; those aren't in Firebase's Google-OAuth authorized domains and will show `auth/unauthorized-domain`.
- **Vercel CLI is pinned to `vercel@57.0.0`** for deploys — v58.9.0 introduced a Root Directory validation regression that breaks `vercel --prod` on this project. Use `npx vercel@57.0.0 --prod --yes`.

## Part 4 — Open strategic questions for you to decide next session

Bring answers to these (or say "you decide") and the next session can move faster:

1. **Priority for next session**: keep testing/polishing the AI + Quote pipeline, or shift to growth/supply-side (getting real contractors live), or something else entirely?
2. **Affiliate programs**: worth pursuing now, or premature before there's real parts-click volume?
3. **The orphaned `/dashboard/contractor` route**: finish it, or delete it?
4. **North-star metric tracking**: is `/admin/funnel` (time-to-first-bid) something you check regularly, or does it need to surface somewhere more visible?
5. ~~**Testing pass**: do you want to do Part 1 above solo and report back, or would you rather a subagent/session systematically click through it first and hand you a bug list?~~ **Done for the ✅ rows above (2026-08-09)** — the ⬜ rows are what's left, mostly things that need real payment methods, phone numbers, or device permissions a session can't provide itself.

---

*This file is a point-in-time snapshot (2026-08-08, updated 2026-08-09). Once fully acted on, it'll go stale — feel free to delete it or fold anything still-relevant into `CLAUDE.md` and remove this file.*
