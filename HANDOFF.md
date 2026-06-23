# RepairAI Pro — Full Session Handoff (2026-06-21)

Paste this entire file as your first message in a new chat to resume exactly where we left off.
The assistant that reads this should treat it as ground truth and pick up without re-asking anything.

---

## The app in one sentence

**RepairAI Pro** is an AI-powered home repair marketplace + contractor social network. Think "Uber for home repair" meets "Instagram for contractors." The goal is to become the operating system for the trades industry.

---

## Tech stack

- **Framework**: Next.js 14 App Router (TypeScript)
- **Auth + DB + Storage**: Firebase (Firestore, Firebase Auth, Firebase Storage)
- **Payments**: Stripe Connect (contractor onboarding + automatic payouts)
- **Notifications**: Firebase Cloud Messaging (push) + Twilio (SMS, optional)
- **Email**: Resend
- **AI**: OpenAI via internal API routes, rate-limited
- **Animations**: Framer Motion
- **Branch**: `claude/vigilant-fermi-6ce538`
- **Worktree**: `C:\Projects\Maintenance Artificial Intelligence App\repair-ai-pro\.claude\worktrees\vigilant-fermi-6ce538`
- **Main repo**: `C:\Projects\Maintenance Artificial Intelligence App\repair-ai-pro`

---

## The agreed strategic model (4-layer funnel)

This is the business strategy we're executing. Every feature decision maps to one of these layers:

### Layer 1 — Free AI tool (the hook)
`/diagnose` — no sign-up required. User describes the problem, AI identifies the trade, severity, price range, and financing option. This is the top-of-funnel acquisition engine. Zero friction. The recommendation was: **make the free tool so good they trust you before they ever create an account.**

### Layer 2 — Identity + social (retention)
Work feed (`/work`), post composer (`/work/post`), post permalinks (`/work/[postId]`), likes, comments, follows. Contractors build a public portfolio. Homeowners follow contractors they like. **The insight here: Instagram proved that if you give tradespeople a place to show their work, they become your marketing engine.** Every before/after post is an ad to their followers.

### Layer 3 — AI-refereed marketplace (monetization)
Job posting → AI auto-invite wave → contractor bids → escrow payment via Stripe. The marketplace is the core product. **Key differentiator: AI sets the fair-price range before bids come in — homeowners can't be gouged and contractors compete on quality, not just price.** North-star metric: median time-to-first-bid ≤ 15 minutes.

### Layer 4 — OS + fintech (lock-in)
Contractor Studio (`/studio`) is the full business operating system — earnings, leads, reputation, social audience, availability toggle, everything in one dashboard. Stripe Connect automatic payouts. Consumer financing (Wisetack/Affirm, currently "coming soon"). **The play here is that once a contractor runs their whole business through RepairAI, switching costs become prohibitive.**

### Geographic wedge
Start in **Houston, TX metro only**. 64 SEO landing pages already generated for 8 trades × 8 Houston-area cities. Dominate one market before expanding.

---

## What was built this session (full list)

### Social layer
- **Work feed** (`/work`) — public Instagram-style grid of contractor work posts
- **Post composer** (`/work/post`) — multi-photo (up to 4) + optional video (≤60MB), before/after toggle, trade tag, caption. Photos optional when video is set.
- **Post permalink** (`/work/[postId]`) — photo carousel with before/after slider, video player with autoplay/muted/loop, like toggle (Firestore transaction + denormalized count), comment thread, share metadata
- **Video support** — before/after video is first-class format (highest reach). Posts carry `video`, `poster`, `hasVideo` fields. Feed and permalink both render `<video>` with badge.
- **SocialExport panel** (on permalink, contractor-only) — pre-written caption with booking link + trade/city hashtags, copy button, download video/photo, one-tap share to Facebook / X / WhatsApp. Every finished job becomes ready-to-post local content.
- **Likes** — Firestore transaction to avoid double-counting, denormalized `likeCount` on post doc
- **Comments** — `GET /api/posts/[postId]/comments` (public list) + `POST` (auth, notifies post owner)
- **Follows** — `followers`/`following` subcollections, follow/unfollow toggle on contractor profiles
- **Following feed** — filtered work feed showing only followed contractors
- **Social notifications** — `post_liked`, `post_commented`, `contractor_followed` notification types

### Growth engine
- **`/diagnose`** — free AI diagnosis, no sign-up. Shows trade, severity, price band, financing teaser, share button. This is the primary acquisition tool.
- **Funnel tracker** (`src/lib/funnel.ts`) — server-only, writes `analyticsEvents` Firestore collection. Events: `diagnosis_run` → `job_posted` → `bid_submitted` → `claimed` → `completed` → `confirmed`
- **Admin funnel dashboard** (`/admin/funnel`) — north-star dashboard showing median time-to-first-bid with health verdict (≤15min = "Marketplace is ALIVE", 15–60min = "Warming Up", >60min = "Cold")
- **64 SEO landing pages** (`/services/[trade]/[city]`) — ISR, FAQPage + Service JSON-LD structured data, 8 trades × 8 Houston-metro cities
- **Embeddable contractor badge** (`/api/badge/[id]`) — SVG with contractor name, rating, VERIFIED chip. Contractors embed on their own websites. Viral backlink strategy.
- **Win-back cron** (`/api/cron/rebroadcast-stale`) — jobs triaged 48h+ with no claim get a second invite wave. Runs daily at 14:00 UTC via `vercel.json`. Protected by `CRON_SECRET` Bearer token.
- **BidPriceBand** (`src/components/BidPriceBand.tsx`) — visual chart on job detail showing contractor bids plotted against AI fair-price range (low/typical/high). Homeowners see at a glance if bids are fair.

### Trust surface
- **RepairAI Guarantee** (`/guarantee`) — custom shield SVG, 5 protection pillars, escrow explainer
- **TrustBar** (`src/components/TrustBar.tsx`) — compact + full variants. On homepage and `/diagnose`.
- **Consumer financing** (`src/lib/financing.ts`) — `getFinancingEstimate(total)` returns amortized monthly payment options (9.9% APR, 12/24/36/60 month terms, $500 minimum). Wired into `/pay/[invoiceId]` and `/diagnose`. `FinancingOption` component has `inline` and `card` variants.

### Contractor Studio (supply-side OS)
- **`/studio`** — unified contractor dashboard with: earnings (week/month/lifetime/pending payout), pipeline (new leads / active / awaiting confirm / completed this month), reputation (rating, reviews, quality score, verified specialties), social audience (followers, posts, likes, comments), action items (unread invites etc.), availability toggle, shareable profile link
- **`/api/contractors/os-summary`** — aggregates all the above in one server call using Admin SDK
- **Availability toggle** — live Firestore write, affects auto-invite ranking

### Seasonal maintenance
- **`/maintenance`** — homeowner retention engine. AI suggests seasonal maintenance tasks based on home type, age, location. Keeps homeowners coming back even when nothing is broken.

### Payments
- **Stripe Connect** — contractor bank verification + automatic payouts. Full flow: `/onboarding/contractor` → Stripe account creation → bank linking → `/api/stripe/payout` auto-releases on job confirm
- **PCI-compliant invoice payment** — `/pay/[invoiceId]` uses Stripe PaymentElement (not raw card fields)

### Hire flow
- **Hire-this-contractor** flow — from contractor profile, homeowner can initiate a job pre-assigned to that contractor
- **Fast-responder badge** — contractors who respond in <2h get a badge on their profile card

### Notifications
- **Firebase Cloud Messaging** — device push for all job events
- **Twilio SMS** (optional) — urgent marketplace events (env vars optional, gracefully degraded if empty)
- **In-app notification center** (`/notifications`) — real-time badge count, mark-as-read

### UI redesigns (user specifically requested these — called them "tacky")
All three are done and committed:

**Hero showcase** (`src/components/HeroShowcase.tsx`) — replaced the 3-box wireframe ("Snap a photo → AI diagnoses → Pro arrives") with a premium phone device frame mockup. Shows the actual product as a live chat conversation:
- Dark phone frame with notch pill, ambient purple glow behind it
- Homeowner sends: "Water's dripping from the pipe under my kitchen sink..."
- AI responds with a diagnosis result card (trade: Plumbing, severity badge, $140–$190 price range, financing option)
- Matched pro row appears at bottom (Mike R., 4.9★, "Plumbing · 0.8 mi")
- Floating accent chips: "Payment protected" (left) + "4.9 ★ · 2,400 reviews" (right)
- Framer Motion entry animation (`initial={{ opacity: 0, y: 30 }}`)
- **KNOWN QUIRK**: Screenshots catch it mid-animation at opacity 0 — looks black. Content IS there. Verified via DOM. Don't use screenshots to verify this component. Use DOM inspection.

**Chat** (`src/app/chat/[id]/page.tsx`) — full Messenger/Instagram-quality redesign:
- Gradient send button (indigo→purple), circular, glows with shadow when active, grays out when no text
- My bubbles: `linear-gradient(135deg, #6366f1, #8b5cf6)` with `boxShadow: 0 4px 16px -4px rgba(99,102,241,0.5)`, bottom-right corner radius = 6px for tail effect
- Their bubbles: surface card, border, bottom-left corner = 6px tail
- `chatPop` CSS keyframe animation on every new bubble (opacity 0 + translateY(6px) + scale(0.98) → normal in 0.22s)
- Avatar grouping — only shows avatar on first message in consecutive run
- Day dividers (Today / Yesterday / full date string)
- Blue CheckCheck icon for read receipts (color = brand when read, text-4 when sent)
- Blurred frosted-glass header: `backdrop-filter: blur(16px)`, `background: rgba(15,16,22,0.78)`
- Pill-shaped composer — attach icon lives inside the pill, not outside
- Edit/delete on hover (my messages only) — appears as floating action row above bubble
- Live presence dot (green circle on avatar)
- Job context bar in header showing trade, city, amount, status pill
- ContractorLiveMap embedded when status = "accepted"

**Marketplace cards** (`src/app/jobs/page.tsx`) — Airbnb-quality card grid:
- 160px image header with dark gradient overlay (`linear-gradient(to top, rgba(10,11,17,0.85), transparent 60%)`)
- Trade emoji (56px, drop-shadow filtered) when no photo — never blank
- Status pill (top-left, backdrop-blur): colored dot + label
- Emergency badge (top-right, red): ⚡ Emergency
- Trade + emoji title overlaid on photo (bottom-left)
- AI price estimate chip: green, TrendingUp icon, `Est. $X–$Y`
- Footer row: MapPin + city, Clock + time-ago, bid count + ArrowUpRight (changes to brand color on hover)
- Hover effect: `translateY(-3px)` + indigo border + `box-shadow: 0 18px 40px -16px rgba(99,102,241,0.35)`
- Spring stagger animation on grid load (Framer Motion `staggerChildren: 0.05`, spring `stiffness: 100, damping: 20`)

---

## Critical bugs fixed (don't undo any of these)

| Bug | What broke | Fix |
|-----|-----------|-----|
| Notification bell completely silent in production | No Firestore rule for `notifications/{uid}/items` → default-deny blocked ALL reads | Added precise rule in `firestore.rules` (users read/delete own; update only `read` field; create stays server-only `if false`) |
| Build broken | Route slug conflict `[contractorId]` vs `[id]` under `/api/contractors` | Consolidated to `[id]`, fixed all `params.contractorId` → `params.id` |
| Client SDK in API routes | `qualityScore.ts`, `specializations.ts`, `pricingEstimate.ts` used `@/lib/db` (client Firebase) in server routes | Migrated all to `adminDb` from `@/lib/firebaseAdmin` |
| PCI violation on invoice payment | Raw card form sending numbers to server | `/pay/[invoiceId]` → Stripe PaymentElement, server just verifies PaymentIntent status |
| All job notification links dead | Links used `/chat?job=ID` which redirected to `/my-jobs` dropping the ID | Changed to `/jobs/[jobId]` everywhere |
| Forgeable reviewer identity | `submit-review` took `reviewerId` from request body | Now reads UID from verified Firebase token only |
| Work photo uploads blocked | Storage default-deny had no rule for `work-photos` path | Added `jobs/{jobId}/work-photos` rule in `storage.rules` |
| `next/og` crashes locally | Project path has spaces ("Maintenance Artificial Intelligence App") → `fileURLToPath` throws ERR_INVALID_URL | Removed all `opengraph-image.tsx` routes. **Do NOT re-add locally.** They'd work on Vercel. |
| Social notification type error | `NotifType` union didn't include `"post_commented"` | Added to union in `src/lib/notif.ts` |
| `getPricingTrends` with empty zip | SEO pages need trade-wide query | Updated to support empty-zip fallback |

---

## Architecture rules — never violate

1. **ALL API routes must use Admin SDK**: `import { adminDb, adminAuth } from "@/lib/firebaseAdmin"` — NEVER `@/lib/db` inside any file under `src/app/api/`
2. **No `opengraph-image.tsx` routes locally** — path with spaces breaks `fileURLToPath`. Only add on Vercel deploy.
3. **Notifications are always server-written** — Firestore rule has `allow create: if false` for `notifications/{userId}/items`. Only server-side helpers in `src/lib/notif.ts` create notifications.
4. **Rate limiting on all AI endpoints** — `src/lib/rateLimit.ts` must be imported and called in every route under `/api/` that calls OpenAI
5. **Job links use `/jobs/[jobId]`** — never `/chat?job=` (that URL dies silently)

---

## Full file map

```
src/
  app/
    page.tsx                              — Homepage (HeroShowcase + features + testimonials)
    diagnose/page.tsx                     — Free AI diagnosis (no login, primary acquisition)
    jobs/page.tsx                         — Marketplace grid (redesigned Airbnb-style cards)
    jobs/new/page.tsx                     — Post a new job
    jobs/[jobId]/page.tsx                 — Job detail + bids + BidPriceBand + action buttons
    chat/[id]/page.tsx                    — 1:1 job chat (Messenger/IG redesign)
    work/page.tsx                         — Public work feed (following feed + all posts)
    work/post/page.tsx                    — Post composer (photos + video, before/after)
    work/[postId]/page.tsx                — Post permalink (carousel, likes, comments, SocialExport)
    studio/page.tsx                       — Contractor Studio OS dashboard
    contractor/page.tsx                   — Contractor directory
    contractor/[id]/page.tsx              — Contractor public profile + hire button
    pay/[invoiceId]/page.tsx              — Stripe PaymentElement checkout (PCI compliant)
    guarantee/page.tsx                    — Trust surface
    financing/page.tsx                    — Financing explainer (Wisetack "coming soon")
    maintenance/page.tsx                  — Seasonal maintenance suggestions
    maintenance/new/page.tsx              — Create maintenance plan
    my-jobs/page.tsx                      — Homeowner job history
    notifications/page.tsx                — Notification center
    history/page.tsx                      — Job history
    services/[trade]/[city]/page.tsx      — SEO landing pages (ISR, 64 pages)
    admin/funnel/page.tsx                 — North-star dashboard (time-to-first-bid)
    admin/page.tsx                        — Admin overview
    onboarding/contractor/page.tsx        — Contractor onboarding wizard
    onboarding/homeowner/page.tsx         — Homeowner onboarding wizard
    referral/page.tsx                     — Referral program

  components/
    HeroShowcase.tsx                      — Phone device mockup hero (redesigned)
    BidPriceBand.tsx                      — Bid chart vs AI fair-price band
    FinancingOption.tsx                   — Monthly payment display (inline + card variants)
    TrustBar.tsx                          — Trust bar (compact + full variants)
    ContractorLiveMap.tsx                 — Real-time contractor location on job map
    AnimatedSkeleton.tsx                  — GridSkeletonLoader, SkeletonCard etc.
    ScrollReveal.tsx                      — Scroll-triggered reveal animation
    EmptyArt.tsx                          — Illustrated empty states
    NotificationCenter.tsx                — Bell icon + badge + dropdown

  lib/
    firebaseAdmin.ts                      — Admin SDK ← USE THIS in all API routes
    db.ts                                 — Client SDK ← ONLY in client components
    auth.ts                               — useAuth() hook
    notif.ts                              — Notification helpers (server-only writes)
    funnel.ts                             — Funnel event tracker → analyticsEvents collection
    rateLimit.ts                          — In-memory per-route+IP rate limiter
    financing.ts                          — getFinancingEstimate(total) → monthly payment options
    seoServices.ts                        — 8 trades × 8 Houston cities data with FAQs + prices
    constants.ts                          — TRADES array, trade config

  api/
    posts/route.ts                        — Create post
    posts/[postId]/route.ts               — Get single post (optional auth → likedByMe)
    posts/[postId]/like/route.ts          — Toggle like (transaction)
    posts/[postId]/comments/route.ts      — GET list + POST new comment
    contractors/[id]/route.ts             — Get/update contractor
    contractors/os-summary/route.ts       — Contractor Studio aggregation
    badge/[id]/route.ts                   — SVG badge for embedding
    cron/rebroadcast-stale/route.ts       — Win-back cron (CRON_SECRET protected)
    cloudinary/sign/route.ts              — Signed upload for chat image attachments
    stripe/onboard-contractor/route.ts    — Stripe Connect account creation
    stripe/payout/route.ts                — Auto-release payment on job confirm
    track/route.ts                        — Funnel event ingestion
    ai/ (multiple routes)                 — All rate-limited OpenAI calls

firestore.rules                           — DEPLOYED (has the notification fix + all rules)
storage.rules                             — posts/{contractorId}, jobs/{jobId}/work-photos, contractors photos
vercel.json                               — Cron at 14:00 UTC daily for rebroadcast-stale
```

---

## Env vars needed in `.env.local`

```bash
# Firebase (already set up)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_SERVICE_ACCOUNT_KEY=...  # JSON stringified

# Stripe (PENDING — user needs to add)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend email (PENDING — user needs to add)
RESEND_API_KEY=re_...
RESEND_FROM=noreply@repairai.pro

# Cron protection (PENDING)
CRON_SECRET=any-random-string

# Admin panel access (PENDING)
ADMIN_UIDS=firebase-uid-1,firebase-uid-2

# Twilio SMS (optional, gracefully degraded if empty)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+1...

# Cloudinary (for chat image uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# OpenAI
OPENAI_API_KEY=...
```

---

## Deploy checklist (must do before production)

```bash
# From main repo root (not the worktree):
firebase deploy --only firestore:rules,firestore:indexes,storage

# Then set all the env vars above in Vercel dashboard or .env.local
```

---

## Pending / not yet built

### High priority
- **Wiretack/Affirm integration** — `src/lib/financing.ts` has the math, `src/components/FinancingOption.tsx` has the UI, `/financing` page exists. Just needs a real lender API key and redirect URL. Currently shows "coming soon."
- **Stripe Connect live keys** — full flow is built, just needs env vars set
- **Deploy Firebase rules** — blocking production notifications until deployed

### Medium priority
- **Verify all three UI redesigns render correctly in browser** — start dev server, check `/` (hero), `/jobs` (marketplace), `/chat/[any-id]` (chat). Use DOM inspection for HeroShowcase (screenshots show opacity-0 animation frame).
- **Admin funnel dashboard linked in admin nav** — `/admin/funnel` exists but isn't linked from `/admin`
- **More SEO content depth** — current 64 pages have basic copy. Longer, more specific content per city/trade would improve ranking.

### Nice to have
- **Re-add `opengraph-image.tsx` routes on Vercel** (not locally). The dynamic OG images for contractor profiles and work posts were built and then removed because the local path has spaces. They'd work fine in Vercel's environment.
- **Video thumbnails** — the `poster` field exists on posts but thumbnail generation (e.g. via Cloudinary video transforms) isn't wired up
- **Agora video consultation** — `agora-rtc-sdk-ng` and `agora-token` are installed (`b070a93`). The `/jobs/[jobId]/video/[consultId]` page scaffold exists. Not yet functional.

---

## Recommendations that were discussed and agreed on

These are the strategic insights from the session — context for WHY things were built the way they were:

**1. The social layer is the moat.** HomeAdvisor, Thumbtack, Angi all failed to build network effects because contractors were interchangeable commodities. If contractors build a public following on RepairAI, they can't leave — they'd abandon their audience. Every follow is a retention mechanism.

**2. Before/after video is the highest-performing social format.** A contractor posting a 30-second before/after video of a tile job gets more organic reach than any ad. The SocialExport panel makes this zero-friction — one tap exports a ready-to-post caption + video to Facebook/Instagram/WhatsApp. This is free marketing.

**3. The badge is a viral backlink engine.** When contractors embed `<img src="repairai.pro/api/badge/[id]">` on their own websites, every badge is an inbound link to RepairAI. It also builds legitimacy for the contractor ("Verified by RepairAI Pro").

**4. The win-back cron is load leveling.** Jobs that sit untouched for 48h get a second invite wave. This prevents the "dead job" problem that kills marketplace trust. Homeowners don't complain about no bids if a second wave always comes.

**5. Free diagnosis with no sign-up is the top-of-funnel.** The recommendation was to make `/diagnose` the primary CTA everywhere — homepage, Google ads, social posts. The AI delivers real value (price estimate + severity) before asking for anything. Trust is built before identity is captured.

**6. AI sets the fair price first, bids come second.** This is the key marketplace innovation. In every other marketplace, homeowners have no idea if a bid is fair. RepairAI shows the AI price band before bids arrive. Contractors who bid in range win. This reduces homeowner anxiety AND contractor race-to-bottom.

**7. Contractor Studio positions RepairAI as the OS, not just a lead gen tool.** Lead gen tools (Angi, Thumbtack) charge per lead. Contractors hate them. RepairAI's pitch is: "We're your entire business dashboard — leads, earnings, reputation, audience, availability. For free (or low subscription)." The switching cost becomes enormous.

**8. One city first.** Launch Houston, dominate it, then expand. The 64 SEO pages build organic authority for Houston-area searches before spending on ads.

---

## Git log (recent)

```
97cc273  feat: video posts + one-tap social export (distribution loop)
285f602  feat: Contractor Studio — supply-side operating system + Grow engine
f7c3188  feat: Contractor Studio — the business operating system
97cd9ea  redesign: hero mockup leads with AI flow, no fake photo
c3bf9d1  redesign: hero mockup — drop the fake photo, lead with the AI flow
0c027c0  redesign: premium hero mockup, Messenger-grade chat, polished marketplace cards
ceebad5  redesign: premium job marketplace cards
dbde1fd  redesign: premium chat — Messenger/IG-grade messaging UI
dfa484b  redesign: premium hero — real product mockup, not a wireframe
a1a4bcd  feat: social depth, trust surface, and visual craft
bd6964f  feat: visual craft — hero showcase graphic + illustrated empty states
602599d  feat: RepairAI Guarantee trust surface ("manufacture trust")
607c3ca  feat: rich share metadata for work post permalinks
f160bd0  feat: comments + shareable post permalinks (social depth)
cfc26d5  fix: notification bell blocked by Firestore default-deny + social icons
ca5a0be  feat: consumer financing surface (as low as $X/mo)
71840ed  feat: seasonal maintenance suggestions — homeowner retention engine
f557e9b  feat: close the social loop — following feed + social notifications
80af4be  feat: social layer — work posts, likes, follows
47929b3  feat: funnel dashboard + 64 trade-by-city SEO landing pages
975f89f  feat: growth engine — diagnose landing, work feed, price band, badge, funnel
6dfa199  fix: public contractor pages, SEO structured data, sign-in gates
dbb7676  feat: rate limiting, hire-flow, win-back automation, marketplace polish
1ccd9b0  fix: production build, security hardening, PCI-compliant payments, SEO
```

---

## CURRENT SESSION FOCUS: Social media for contractors

**The user explicitly said:** "I want to focus on the social media aspect for the contractors and etc."

This is the top priority. Everything below is a complete audit of the social layer — what exists, what's missing, and what to build next.

---

### What already exists in the social layer (complete feature inventory)

**Work feed (`/work/page.tsx`)**
- 3-column responsive grid, card-based posts
- Two tabs: Discover (default, all posts) + Following (signed-in only, only followed contractors)
- Each card: media carousel (video autoplay/loop or before/after photos), trade badge, "Verified job" badge (green checkmark for platform-completed jobs), contractor avatar + name + city + timestamp, caption (3-line clamp), like toggle (optimistic, real-time), comment count + link to permalink
- Trade filter dropdown
- Empty states with CTAs
- "Need work like this done?" CTA → `/diagnose` at bottom
- **THIN**: no infinite scroll (hard limit 50 posts), no trending sort, no hashtags, no location filter, no search

**Post composer (`/work/post/page.tsx`)**
- Multi-photo uploader: max 4 images, max 10 MB each, drag-and-drop grid with remove
- Before/after toggle (appears if 2+ photos, labels each photo BEFORE/AFTER)
- Video upload: optional, max 60 MB, tooltip says "gets the most reach"
- Caption (500 char limit)
- Trade selector (dropdown, defaults to contractor's primary trade)
- Firebase Storage upload with progress bar
- Auto-redirects to post permalink on success
- Sign-in wall for non-contractors
- **THIN**: no drafts/scheduling, no AI-generated caption suggestions, no geo-tagging, no in-app video trimming, no bulk gallery import

**Post permalink (`/work/[postId]/page.tsx`)**
- Photo carousel with before/after label overlay
- Video player: autoplay, muted, loop, full controls
- Like button (Firestore transaction, denormalized likeCount, real-time)
- Comment thread: newest first, max 100 loaded, not paginated
- Comment composer with enter-to-submit, sends POST request, notifies post owner
- Share button: native share sheet (mobile) or copy-link (desktop)
- Hire CTA: "Want work like this? Request a quote from {FirstName}" → `/jobs/new?contractor={id}`
- **SocialExport panel** (owner-only): pre-written caption with trade/city hashtags + booking link, copy button, download photo/video, one-tap share to Facebook / X / WhatsApp, tip for TikTok/Reels
- **THIN**: no reply threading (flat comments only), no @mentions, no comment editing/deleting, no reaction emoji variants (only ♥), no Instagram/Pinterest/LinkedIn/Threads in the export panel

**Contractor profile (`/contractor/[id]/page.tsx`)**
- Follow button (POST `/api/contractors/[id]/follow`) — toggles follow, sends notification to contractor
- followerCount shown on button when following
- 6 recent work posts grid with like-count overlay
- "Share new work" button (owner only)
- Quality score card, specializations, service area map
- Profile share button (copies URL to clipboard)
- Embeddable badge section (owner only) with HTML embed snippet
- **THIN**: no public follower/following list, no activity timeline, no "Stories" circles, no DM from profile, no availability calendar, only 6 posts shown (not paginated)

**Follow system (`/api/contractors/[id]/follow/route.ts`)**
- Data model: `contractors/{id}/followers/{uid}` + `users/{uid}/following/{id}` + `followerCount` counter
- Toggle follow/unfollow, no self-follow, returns `{ following, followerCount }`
- Fire-and-forget `notifyNewFollower` on new follow
- **THIN**: no follow limits, no "suggested follows," no mutual follow badge, no unfollow-all

**Like system (`/api/posts/[postId]/like/route.ts`)**
- Data model: `posts/{postId}/likes/{uid}` + denormalized `likeCount`
- Atomic Firestore transaction prevents double-counting
- Returns `{ liked, likeCount }`
- Sends `notifyPostLiked` (in-app only, no push — intentionally low-spam)
- **THIN**: no like list/modal, no reaction variants, no like-based feed ranking

**Comment system (`/api/posts/[postId]/comments/route.ts`)**
- `GET`: public, rate-limited (60/min), returns newest 100, hydrates author identity (contractor badge if applicable)
- `POST`: auth required, rate-limited (20/min), increments commentCount, notifies post owner
- **THIN**: no reply threading, no @mentions, no comment edit/delete, no moderation/reporting, no pagination past 100

**Social notifications (in-app)**
- `post_liked` — in-app only (intentionally quiet)
- `post_commented` — in-app, sent to post owner
- `contractor_followed` — in-app + light push

**SocialExport (one-tap distribution)**
- Auto-generates caption: trade + city hashtags, RepairAI booking link, "DM to book" language
- Download original photo or video
- Share to Facebook (sharer.php), X (intent/tweet), WhatsApp (wa.me)
- Tip: "download video then upload to TikTok/Reels for max reach"

---

### What's MISSING (prioritized gap analysis)

**Priority 1 — Creator analytics (most impactful for contractor retention)**
- Contractors can't see: profile views, post impressions, follower growth over time, engagement rate, which post performed best, how many "hire" CTAs were clicked from their posts
- Without this, contractors don't know if posting is worth it → they stop posting → feed dies
- Build: analytics dashboard in Contractor Studio showing per-post stats + aggregate trends

**Priority 2 — Trending / algorithmic feed (makes discovery feel alive)**
- Right now the feed is purely chronological. There's no way for a great post to get more reach.
- Build: a "Trending this week" sort option (score = likes + comments × recency weight), a "Top contractors in Houston" leaderboard, "Near me" filter for homeowners

**Priority 3 — Comment reply threading (deepens conversations)**
- Comments are flat — no one can reply to a specific comment. Conversations die.
- Build: thread-style replies (like Instagram comments), `parentCommentId` field on comment docs, nested display, reply notifications

**Priority 4 — Stories (ephemeral 24h posts)**
- "Today's job" posts that disappear after 24h. Shows as circles at top of feed.
- Instagram/Snapchat mechanic that drives daily contractor engagement
- Build: `stories` Firestore collection with TTL, story circles component at top of `/work` feed

**Priority 5 — Homeowner saved/bookmarked contractors**
- Homeowners find a great contractor, have no way to save them other than "follow" (which creates a social relationship they may not want)
- Build: a private "Saved pros" list (different from public follow), email digest of saved pros' new posts

**Priority 6 — Explore / discovery page**
- No way to browse by location, by top-rated, by most-posted
- Build: `/explore` page with top contractors by trade + city, trending posts, "New to the area" contractors

**Nice to have (deferred)**
- @mentions in comments
- Comment reactions (🔥 😮 👏 vs just ♥)
- Instagram / Threads / Pinterest / LinkedIn in SocialExport
- Share analytics (track which platform referrals come from)
- Hashtag / tag discovery (#plumbing, #beforeafter)
- Duets/stitches (react to another contractor's post)
- Contractor availability calendar on profile
- "Top contractor of the week" badge

---

### What to build next (the user said this is the focus)

**START HERE — Contractor Analytics Dashboard**
This is the single highest-leverage thing missing. It directly answers "is posting worth it?" If contractors don't see results, they stop. If they see followers growing and hire clicks coming in, they post every job.

What to build:
- Add an "Analytics" tab to the Contractor Studio (`/studio`)
- API: `/api/contractors/analytics` (Admin SDK) — aggregate:
  - Total post views (need to add a view counter: increment on each post permalink load)
  - Follower count + weekly growth delta
  - Total likes + comments this month
  - Top performing post (most liked)
  - Hire CTA clicks from posts (add a funnel event `hire_click_from_post`)
  - Profile views (add a view counter on `/api/public/contractors/[id]`)
- UI: stats cards (same design language as Studio), line chart for follower growth, post performance grid sorted by engagement

**THEN — Trending feed + comment threading** (in that order)

---

## SESSION 2026-06-22: Social media integration (committed to main)

User direction: **"social media aspect — creates a page for them that automatically rolls into Instagram or TikTok."**

### Built this session

**`/pro/[id]`** (`src/app/pro/[id]/page.tsx`) — Standalone link-in-bio page. No app header/nav. Contractors paste `/pro/[uid]` in their Instagram/TikTok bio. Shows avatar, trust badges, social icons, Book/Estimate CTAs, recent work grid, RepairAI footer. Server component.

**Instagram auto-post** — `/api/social/instagram/connect` (OAuth init) → `/api/social/instagram/callback` (saves long-lived token) → `/api/social/instagram/publish` (photo post or Reels, auto-caption with hashtags).

**TikTok auto-post** — `/api/social/tiktok/connect` → `/api/social/tiktok/callback` → `/api/social/tiktok/publish` (DIRECT_POST photos, URL-pull video).

**Social handles** — `/api/contractors/[id]/social-handles` GET/POST. Stores `socialHandles: { instagram, tiktok, facebook, youtube, website }`. Exposed in `publicContractor.ts` (handles only — OAuth tokens never exposed).

**Studio social section** — Connect buttons for Instagram + TikTok, editable @handles for all platforms, bio link = `/pro/[uid]` with copy + preview.

**Post composer cross-post** — If Instagram/TikTok connected, checkboxes appear before publish. Auto-posts to selected platforms on submit.

**Analytics dashboard** — `/studio/analytics` + `/api/contractors/analytics`. Shows: followers, posts, total likes/views, engagement rate, this-month MoM deltas, top 6 posts by engagement score, revenue last 30 days, social connection status, personalised growth tips.

**Post view tracking** — `/api/posts/[postId]/view` increments `viewCount` (rate-limited). Post permalink fires it on load.

### New env vars needed
```
META_APP_ID, META_APP_SECRET      # developers.facebook.com
TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET  # developers.tiktok.com
```
Callback URLs to register: `{APP_URL}/api/social/instagram/callback` and `/api/social/tiktok/callback`

### Latest commits
```
1ef852c  feat: contractor analytics dashboard + post view tracking
7e54e03  feat: social media integration — Instagram/TikTok auto-post + bio link page
```

---

## Where to pick up

Social layer is now the most complete part of the product. Next priorities:

**Social (remaining):**
1. **Trending / Explore feed** — sort by engagement score, "Top in Houston this week" section, near-me filter. Currently feed is purely chronological.
2. **Comment reply threading** — thread-style nested replies with @mentions. Flat comments kill conversation.
3. **Stories** — 24h ephemeral posts shown as circles at top of feed. Daily engagement driver.

**Production blockers (do before going live):**
1. `firebase deploy --only firestore:rules,firestore:indexes,storage` — notification bell broken in prod without this
2. Stripe live keys in `.env.local` + register webhook → real payments
3. `META_APP_ID` / `TIKTOK_CLIENT_KEY` env vars → Instagram/TikTok auto-post activation
4. Wisetack/Affirm API key → wire into `/financing` (currently "coming soon")
