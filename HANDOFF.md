# RepairAI Pro — Handoff & Testing Plan (2026-08-08)

Start your next conversation by pointing Claude at this file plus `CLAUDE.md` (which auto-loads anyway). This file exists to (1) let you systematically test every feature and log what needs work, and (2) give a new chat the full picture without you re-explaining anything.

**How to use this**: Go through each row of the checklist below on the live app (`https://repair-ai-pro-eight.vercel.app` — not any `repair-ai-<random>-...vercel.app` link, those are throwaway deploy snapshots). For anything broken, confusing, or missing, jot a one-line note in the "Notes" column or just tell Claude directly. Bring this file (or a copy with your notes filled in) to the next session and say "here's my testing pass, let's fix these" — that's a clean, scoped way to start.

---

## Part 1 — Feature testing checklist

### Auth & account
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 1.1 | Email sign-up | Create account → lands on role chooser | |
| 1.2 | Google sign-in | Must use `repair-ai-pro-eight.vercel.app` — other deploy URLs aren't authorized for Google OAuth | |
| 1.3 | Sign out | Profile menu → Sign out | |
| 1.4 | Forgot password | `/auth/forgot-password` | |
| 1.5 | Role chooser | New account → "I need something fixed" vs "I'm a service pro" | |
| 1.6 | Profile menu | Click avatar top-right — dropdown with name/email/role badge/links | |
| 1.7 | Role badge accuracy | Confirm badge matches reality (Homeowner vs Contractor) | |

### Homeowner: AI diagnosis + job posting (`/jobs/new`) — most actively developed area
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 2.1 | Text-only diagnosis | Describe a problem, no photo, get AI diagnosis | |
| 2.2 | Photo diagnosis | Upload a real repair photo — does vision genuinely inform the diagnosis? | |
| 2.3 | Voice diagnosis | Record audio describing the issue | |
| 2.4 | Video diagnosis | Record video of the problem | |
| 2.5 | Diagnosis card content | Likely causes ranked, "what a pro checks first," confidence badge, safety flag when relevant | |
| 2.6 | Clarifying questions | One-at-a-time UI, skip works, answers reach the backend | |
| 2.7 | Trade auto-detect | Correct trade selected; manual override works | |
| 2.8 | Trade questionnaire | One question at a time, single/multi-select, yes/no, skip optional | |
| 2.9 | Smart Estimate | Price range, labor/parts split, risk factors, additional-cost chips, honest "comparables vs AI-estimated" basis | |
| 2.10 | Parts recommendations | Tied to diagnosis; refines after vehicle/brand details entered; retailer links (AutoZone for cars, not Home Depot) | |
| 2.11 | Job post submission | Full flow end to end, lands on job detail page | |

### Homeowner: marketplace & job management
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 3.1 | `/my-jobs` | See posted jobs, statuses | |
| 3.2 | Job detail page | Bids visible, can select a bid | |
| 3.3 | `/jobs` marketplace | Browse open jobs (as visitor and signed-in) | |
| 3.4 | `/contractor` directory | Browse/search contractors | |
| 3.5 | Chat | Message a contractor about a job | |
| 3.6 | `/history` | Past completed jobs | |
| 3.7 | `/home-health` | Seasonal maintenance suggestions | |
| 3.8 | Insurance report ($49) | Purchase flow | |
| 3.9 | Video consultation | Book/join | |
| 3.10 | Payment / escrow | `/pay/[invoiceId]`, milestone payments | |

### Contractor path
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 4.1 | Become a Pro | Dashboard tile or homepage CTA → `/onboarding/contractor` wizard (4 steps) | |
| 4.2 | `/contractor-profile` | Full edit form once you're a contractor: trade, service area, Google Business import, portfolio, insurance verification | |
| 4.3 | Dual-role toggle | Header Homeowner/Contractor switch appears only once you have both — flips nav, persists across reload | |
| 4.4 | `/contractor-inbox` | Job invitations, accept/decline | |
| 4.5 | Bidding | Submit a bid on an open job | |
| 4.6 | `/studio` | Contractor command center — money/pipeline/reputation | |
| 4.7 | `/studio/analytics`, `/studio/wrapped` | | |
| 4.8 | `/contractor/schedule` | Calendar, iCal sync | |
| 4.9 | `/contractor/pro` | Pro subscription plans | |
| 4.10 | Stripe Connect payout | Bank verification, receiving a payout | |
| 4.11 | Quality score / trust tier | Visible and sensible | |
| 4.12 | `/work` social feed | Post before/after photos, likes, follows, Discover/Following toggle | |

### Growth / SEO / retention surfaces
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 5.1 | `/diagnose` | Free no-signup AI tool, hands off to `/jobs/new` | |
| 5.2 | `/services/[trade]/[city]` | Spot-check a few of the 64 SEO pages | |
| 5.3 | `/financing` | Consumer financing option | |
| 5.4 | `/guarantee` | Trust page | |
| 5.5 | Referral | `/referral` flow | |
| 5.6 | Notifications | Email, push (FCM), SMS actually arrive | |
| 5.7 | PWA install | Add to home screen, offline shell | |

### Admin
| # | Flow | Steps | Notes |
|---|------|-------|-------|
| 6.1 | `/admin/funnel` | North-star metric: time-to-first-bid | |
| 6.2 | `/admin/contractors`, `/admin/users`, `/admin/jobs`, `/admin/payouts`, `/admin/disputes` | | |

---

## Part 2 — Known gaps / technical debt (from this session, not yet addressed)

- **Affiliate revenue**: parts-retailer links (AutoZone/O'Reilly/etc.) are plain search links, no tracking params — needs enrollment in each affiliate program first.
- **Rate limiting**: in-memory per-route+IP; fine for now, needs Redis/Upstash before real traffic.
- **Funnel dashboard**: not yet wired into the admin overview page.
- **`/dashboard/contractor`**: an orphaned route — not linked from anywhere reachable, may be dead code worth deleting or finishing.
- **Photo→parts vision path**: verified working with a controlled synthetic test (fridge label image); not yet spot-checked with a real customer-submitted repair photo in production.
- **Env/setup pending**: Stripe webhook registration, Agora video keys, Resend email key verification, Twilio SMS (optional), `CRON_SECRET`.

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
5. **Testing pass**: do you want to do Part 1 above solo and report back, or would you rather a subagent/session systematically click through it first and hand you a bug list?

---

*This file is a point-in-time snapshot (2026-08-08). Once acted on, it'll go stale — feel free to delete it or fold anything still-relevant into `CLAUDE.md` and remove this file.*
