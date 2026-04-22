# Repair AI Pro — Project Handover

**Last Updated:** 2026-04-20  
**Current Phase:** 7 of 7+ (PWA complete, ready for push notifications)

---

## What This Project Does

**Repair AI Pro** is an AI-powered service marketplace (like Uber for any skilled trade):
- Homeowners post service requests (repairs, installations, consulting)
- Contractors browse & claim jobs
- Platform handles payments (Stripe escrow), notifications (in-app + email), disputes (admin resolution)
- Installable on mobile (PWA), works offline

Trades covered: Plumbing, Electrical, HVAC, Auto Mechanic, IT Support, Locksmith, Carpentry, Painting, Landscaping, Cleaning, Security, Roofing, Appliance Repair, HVAC, Phone Repair, and 18 more.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, Lucide icons
- **Backend:** Next.js API routes, Firebase (Firestore + Admin Auth)
- **Payments:** Stripe (manual capture escrow)
- **Email:** Resend (9 templates)
- **AI:** OpenAI GPT-4 (job analysis)
- **Other:** Google Places (contractor profile import), Cloudinary (images), PWA (offline + home screen badge)

---

## What's Built (Phases 1-7)

### Phase 1: Contractor Profile & Job Workflow ✅
- Profile saves: city, zipCode, serviceRadiusMiles, availability, trade, trades[]
- Matching algorithm: auto-invite contractors based on location + trade

### Phase 2: 33 Service Categories ✅
- Canonical list in `src/lib/constants.ts` (TRADES array)
- Used everywhere: job wizard, profiles, marketplace, AI prompts
- 5 verticals: Home, Automotive, Tech, Specialized, Other

### Phase 3: Dual Notifications ✅
- In-app: Firestore collection
- Email: Resend HTML templates
- 9 types: contractor_invited, job_accepted, job_started, job_completed, job_confirmed, new_message, review_received, dispute_opened, job_cancelled
- Fire-and-forget: `Promise.all([notif, email])` no blocking

### Phase 4: Stripe Payments (Escrow) ✅
- Creates PaymentIntent with `capture_method: "manual"`
- Funds held until job confirmed, then captured
- Cancellation triggers refund
- PaymentCard UI in chat sidebar

### Phase 5: Disputes & Cancellation ✅
- Homeowner/contractor can cancel/dispute
- 6 dispute categories: quality, communication, damage, payment_issue, schedule, other
- Admin resolves: contractor_fault (refund) | owner_fault (capture) | mutual (note) | invalid (restore)
- `/api/jobs/[jobId]/dispute` and `/api/jobs/[jobId]/cancel`

### Phase 6: Admin Dashboard ✅
- 5 pages: Overview (stats), Jobs (table), Disputes (resolution UI), Contractors (verify), Users (Firebase Auth)
- Real-time stats: total jobs, contractors, users, open disputes, revenue
- Role-based: ADMIN_UIDS env var or @repair-ai.admin email
- `/api/admin/stats`, `/api/admin/resolve-dispute`, `/api/admin/users`

### Phase 7: PWA ✅
- Service worker: offline caching, push notifications, network-first strategy
- Web manifest: makes app installable on iOS/Android/desktop
- Badge API: home screen icon shows unread count
- Automatically registers, zero setup needed
- Files: `/public/sw.js`, `/public/manifest.json`, `src/lib/pwa.ts`, `src/components/PWASetup.tsx`

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | TRADES array (33 categories) — single source of truth |
| `src/lib/notif.ts` | 9 notification types + email helpers |
| `src/lib/stripe.ts` | Stripe client (lazy init) |
| `src/lib/email.ts` | Resend email templates (9 types) |
| `src/lib/pwa.ts` | Service worker registration, badge, push setup |
| `src/app/layout.tsx` | Root layout + PWASetup component |
| `src/components/NotificationCenter.tsx` | In-app bell, badge sync to localStorage |
| `src/components/PWASetup.tsx` | Headless: registers SW, updates badge |
| `src/components/PaymentCard.tsx` | Stripe Elements form in chat sidebar |
| `src/components/DisputeCard.tsx` | Dispute/cancel UI, two-step form |
| `src/app/api/stripe/create-intent/route.ts` | Creates PaymentIntent (manual capture) |
| `src/app/api/stripe/webhook/route.ts` | Listens for Stripe events |
| `src/app/api/stripe/release/route.ts` | Captures held payment on job confirm |
| `src/app/api/jobs/[jobId]/dispute/route.ts` | Opens dispute, freezes payment |
| `src/app/api/jobs/[jobId]/cancel/route.ts` | Cancels job, refunds if needed |
| `src/app/api/admin/resolve-dispute/route.ts` | Admin resolution (4 options) |
| `src/app/api/admin/stats/route.ts` | Dashboard stats aggregation |
| `src/app/admin/page.tsx` | Admin overview dashboard |
| `src/app/admin/disputes/page.tsx` | Admin dispute resolution UI |
| `src/app/admin/jobs/page.tsx` | Admin jobs table |
| `src/app/admin/contractors/page.tsx` | Admin contractor verification |
| `src/app/admin/users/page.tsx` | Admin Firebase Auth users list |
| `public/manifest.json` | PWA app metadata, shortcuts, icons |
| `public/sw.js` | Service worker (offline, push, badge) |
| `/PWA_SETUP.md` | Detailed PWA setup + testing guide |

---

## Key Architecture Patterns

### Fire-and-Forget Notifications
```typescript
await Promise.all([
  createNotification(db, ...), // Firestore
  sendEmail(recipient, ...) // Resend
]); // No error blocking
```

### Firestore Transactions (Race Conditions)
Used in: payment capture, dispute resolution, cancellation to prevent race conditions.

### Role-Based Admin Access
```typescript
const isAdmin = ADMIN_UIDS.includes(uid) || email?.endsWith("@repair-ai.admin");
```
Set via: `ADMIN_UIDS` (comma-separated) and `NEXT_PUBLIC_ADMIN_UIDS` in `.env.local`

### Service Worker Strategy
- **Pages/Assets:** Network-first, cache fallback
- **API Calls:** Network-first, error gracefully if offline
- **Push Notifications:** Handled by service worker

---

## Environment Variables (Pending)

```bash
# Stripe (user needs to add)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin (user needs to add their Firebase UID)
ADMIN_UIDS=user-uid-here
NEXT_PUBLIC_ADMIN_UIDS=user-uid-here

# Already added (working)
NEXT_PUBLIC_FIREBASE_*=...
OPENAI_API_KEY=...
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_... (pending full setup)
```

---

## Known Pending Tasks

### 🎨 **Add App Icons** (PWA needs these)
Replace `/public/icon-svg.svg` with real PNG files:
- `icon-192x192.png`
- `icon-512x512.png`
- `icon-maskable-192x192.png` (Android adaptive)
- `icon-maskable-512x512.png`

Create in Figma/Canva or use [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)

### 💳 **Add Stripe Keys**
1. Get from [dashboard.stripe.com](https://dashboard.stripe.com)
2. Add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` to `.env.local`

### 👤 **Add Admin UID**
1. Get from [Firebase Console](https://console.firebase.google.com) → Authentication → Users
2. Copy your UID
3. Set in `.env.local`: `ADMIN_UIDS=your-uid-here` and `NEXT_PUBLIC_ADMIN_UIDS=your-uid-here`

---

## Next Steps (User's Explicit Requests)

1. **Push Notifications** → Use FCM for contractor urgency (badge + notification)
2. **SMS Notifications** → Twilio for faster response
3. **Onboarding Flow** → 3-step wizard for new users
4. **Stripe Connect** → Pay contractors directly from platform

---

## Testing Checklist

- [ ] Post a job (homeowner)
- [ ] Accept invitation (contractor)
- [ ] Make payment (homeowner)
- [ ] Start job (contractor)
- [ ] Complete job (contractor)
- [ ] Confirm job (homeowner)
- [ ] Leave review
- [ ] Check admin dashboard (overview, stats, disputes)
- [ ] Test PWA on mobile: "Add to Home Screen"
- [ ] Test offline: DevTools → Offline → pages load, APIs fail gracefully
- [ ] Check badge: NotificationCenter updates → home screen icon badge updates

---

## How to Use This in New Chats

**Option A (Recommended): Claude Projects**
1. Go to [claude.com](https://claude.com)
2. Create project "Repair AI Pro"
3. Upload your codebase folder
4. Each chat in that project has full context automatically

**Option B: Quick Paste**
In new chats, paste:
> *This is my Repair AI Pro project. I've completed phases 1-7 (contractor profiles, 33 categories, dual notifications, Stripe escrow, disputes, admin dashboard, PWA). Current state: [PASTE THIS HANDOVER.md]. Pending: Stripe keys, admin UID, app icons. Next: push notifications.*

Then ask your next question—I'll have full context from this handover.

---

## Quick Commands

```bash
# Run dev server
npm run dev

# Check Firebase setup
grep NEXT_PUBLIC_FIREBASE .env.local

# View notifications in Firestore
db.collection("notifications").where("recipientId", "==", userId).get()

# Test service worker
DevTools → Application → Service Workers

# Check admin access
User UID in ADMIN_UIDS or email ends with @repair-ai.admin
```

---

## Notes

- **Memory system** is at `C:\Users\ejerm\.claude\projects\C--Projects-Maintenance-Artificial-Intelligence-App-repair-ai-pro\memory\`
- **Last context session** saved phase 7 (PWA) completion
- **Critical constraint:** No destructive actions on shared code without explicit user approval
- **Architecture:** All notifications fire-and-forget (no blocking), Firestore transactions prevent races, service worker gracefully degrades offline

---

**Ready to continue? What's next?**
