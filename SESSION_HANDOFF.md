# Session Handoff — RepairAI Pro
**Date:** 2026-05-09  
**Project:** `C:\Projects\Maintenance Artificial Intelligence App\repair-ai-pro`  
**Stack:** Next.js 14 App Router · Firebase Firestore · Stripe Connect · TypeScript (strict) · CSS variable design system

---

## Project Overview

A home repair marketplace app (competing with TaskRabbit/Angi) where:
- **Homeowners** post repair jobs, pay into escrow, confirm completion
- **Contractors** receive job invitations, submit bids, get paid via Stripe Connect
- **AI** detects trade type, estimates costs, writes insurance reports

**Critical design rule:** ALL styling must use CSS variables (`var(--color-bg)`, `var(--color-surface)`, `var(--color-brand)`, `var(--color-text)`, `var(--color-text-3)`, `var(--color-text-4)`, `var(--color-border)`, `var(--color-surface-2)`, `var(--color-success)`, `var(--color-error)`) — **never** hardcoded Tailwind color classes.

**Firestore notification path (CRITICAL):** Notifications are written and read at `notifications/{uid}/items/{docId}` (subcollection), NOT a flat `notifications` collection.

---

## What Was Completed This Session

### Part 1 — Build Fixes (All TypeScript errors resolved, build now passes clean with 93 pages)

| File | Fix |
|------|-----|
| `src/app/jobs/[jobId]/page.tsx` | Changed `import { InsuranceReportModal }` → `import InsuranceReportModal` (default export) |
| `src/app/ai/page.tsx` line 884 | Cast `e.currentTarget as HTMLButtonElement` (not `HTMLElement`) so `.disabled` property exists |
| `src/app/chat-premium/page.tsx` | Added `type ChatMessage` with explicit `status: 'read' \| 'sent' \| 'sending'` so `useState<ChatMessage[]>` works |
| `src/lib/logEvent.ts` | Added `"ai_diagnosis"` to `JobEventType` union (used in `UnifiedChatPage`) |
| `src/app/dashboard/page.tsx` | Changed `.then((token) =>` → `.then((token: string) =>` |
| `src/app/jobs/[jobId]/page.tsx` | Same `token: string` fix |
| `src/app/dashboard/contractor/page.tsx` | Same `token: string` fix |
| `tsconfig.json` | Changed `"ignoreDeprecations": "6.0"` → `"5.0"` (TS 5.9.2 doesn't support `"6.0"`) |
| `src/components/Header.client.tsx` | Removed `ringColor` from inline style (not a CSS property); replaced with `outline: '1px solid var(--color-border)'` |
| `src/app/onboarding/contractor/subscription-success/page.tsx` | Wrapped page in `<Suspense>` because `useSearchParams()` requires it in Next.js 14 |
| `src/app/onboarding/homeowner/subscription-success/page.tsx` | Same Suspense fix |

**Pattern used for Suspense fix:**
```tsx
// Extract content into separate function component, wrap in Suspense in default export
function PageContent() {
  const searchParams = useSearchParams(); // only here, inside Suspense
  // ...
}
export default function Page() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--color-bg)' }} />}>
      <PageContent />
    </Suspense>
  );
}
```

---

### Part 2 — New Features Shipped

#### 1. Real-time Job Chat — Complete Rewrite
**File:** `src/app/chat/[id]/page.tsx` (full rewrite of existing basic chat)

**What it does:**
- Real-time Firestore listener on `jobs/{jobId}/messages` subcollection ordered by `createdAt asc`
- Loads both participants (homeowner + contractor) by checking `homeowners/{uid}` then `contractors/{uid}` collections
- Shows participant name, avatar (initials fallback), role in header
- Job context bar with trade, location, price, live status badge
- Message bubbles: sent = brand color, received = surface with border
- Message grouping: avatar + sender name only shown for first message in a run; subsequent messages from same sender are compact
- Day dividers between messages from different days
- Hover edit/delete controls (edit mode banner replaces send bar)
- Image attachment via Cloudinary (`/api/cloudinary/sign` → upload → attach `mediaUrls[]` to message doc)
- Image preview with remove button before sending
- Auto-growing textarea (min 1 row, max 120px)
- Enter to send, Shift+Enter for newline
- Participant access check — shows message if not a job participant
- Full CSS variable styling, `100dvh` height, max-width 760px centered

**Firestore structure used:**
```
jobs/{jobId}/messages/{msgId}
  text: string
  senderId: string
  createdAt: Timestamp
  mediaUrls?: string[]
  edited?: boolean
```

---

#### 2. Contractor Earnings Page
**File:** `src/app/dashboard/contractor/earnings/page.tsx` (NEW)
**Route:** `/dashboard/contractor/earnings`
**API:** `GET /api/contractors/earnings` (already existed)

**What it shows:**
- 4 stat cards: Total Earned (green), Pending Payout (orange), Jobs Completed (indigo), Bid Win Rate (yellow)
- Platform fee info card: "12% fee · 88% your cut"
- Empty state if no earnings yet with link to job inbox
- Payout history list with filter tabs: All / Paid / Pending
- Each payout row: trade emoji, job description, date, amount (green=paid, orange=pending), status badge, link to job

**Linked from:** Contractor dashboard `Total Earned` stat card now links to `/dashboard/contractor/earnings` (was `/dashboard/contractor/settings`)

---

#### 3. Contractor Job Progress Actions
**File:** `src/app/jobs/[jobId]/page.tsx` (added to existing file)

**What was added:**
- `progressing` and `progressError` state variables
- `handleProgress(nextStatus: string)` async function — calls `POST /api/jobs/[jobId]/progress` with `{ nextStatus }`
- New action card rendered when `isContractor && ['accepted', 'in_progress'].includes(job.status)`:
  - `accepted` status → shows indigo card "Ready to start?" with **Start Job** button → calls `handleProgress('in_progress')`
  - `in_progress` status → shows green card "Job in progress" with **Mark Complete** button → calls `handleProgress('completed')`
  - Both cards also include a Message icon button linking to `/chat/${jobId}`

---

#### 4. Notifications Page
**File:** `src/app/notifications/page.tsx` (NEW)
**Route:** `/notifications`

**What it does:**
- Real-time Firestore listener on `notifications/{uid}/items` ordered by `createdAt desc`
- Filter tabs: All / Unread (with count)
- Each notification: colored icon (per type), title (bold if unread), body text, time ago, unread dot, chevron
- Click marks as read + navigates to `href` field, or falls back to `/chat/${jobId}` for messages, `/jobs/${jobId}` for job events
- Mark all read button (Firestore `writeBatch`)
- Empty states for both filter modes
- Skeleton loading state

**Notification type → icon mapping:**
```
new_bid → Trophy (yellow)
bid_selected → CheckCheck (green)
bid_declined → AlertTriangle (red)
job_started → Zap (indigo)
job_completed → BriefcaseBusiness (teal)
job_confirmed → DollarSign (green)
new_message → MessageSquare (blue)
new_review → Star (yellow)
invitation → Inbox (orange)
```

---

#### 5. NotificationCenter "View All" Link
**File:** `src/components/NotificationCenter.tsx`

Changed the footer from a plain "Close" button to:
- **"View all notifications →"** button (left, brand color) — navigates to `/notifications`
- **"Close"** button (right, muted)

---

#### 6. Chat URLs Updated Throughout
All chat links updated from old `?job=` query param format to `/chat/${jobId}` path format:

| File | Changed |
|------|---------|
| `src/app/jobs/[jobId]/page.tsx` | 3 occurrences: header button, confirm card, actions grid |
| `src/lib/notif.ts` | All 8 `href` and SMS body references (`/chat?job=${jobId}` → `/chat/${jobId}`) |

---

## Current Build State

```
✓ Compiled successfully
✓ Type checked — no errors
✓ 93 pages generated
```

The "Dynamic server usage" warnings during build (for API routes using `request.headers`) are **informational only** — all API routes are correctly marked as `ƒ (Dynamic)` server-rendered and work at runtime.

---

## Architecture Reference

### Key File Locations

| Purpose | Path |
|---------|------|
| Firestore client | `src/lib/db.ts` |
| Firebase Admin | `src/lib/firebaseAdmin.ts` |
| Auth hook | `src/lib/auth.ts` (exports `useAuth()`) |
| Notification writer | `src/lib/notif.ts` (server-side, Admin SDK) |
| Stripe lib | `src/lib/stripe.ts` |
| Job event logger | `src/lib/logEvent.ts` (exports `logJobEvent`, `JobEventType`) |
| Contractor profile type | `src/lib/contractorProfile.ts` |
| Homeowner subscription handler | `src/lib/homeownerSubscription.ts` |
| CSS variables | `src/app/globals.css` |
| Toast system | `src/components/ToastProvider.tsx` (wrap app, use `useToast()`) |
| Mobile bottom nav | `src/components/MobileBottomNav.tsx` |
| Notification center (header bell) | `src/components/NotificationCenter.tsx` |
| Notification toast watcher | `src/components/NotificationToastWatcher.tsx` |

### Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/jobs/[jobId]/bid` | POST | Submit contractor bid |
| `/api/jobs/[jobId]/bids` | GET | List bids for a job |
| `/api/jobs/[jobId]/select-bid` | POST | Homeowner selects winning bid |
| `/api/jobs/[jobId]/progress` | POST | Advance job status (accepted→in_progress→completed→confirmed) |
| `/api/jobs/[jobId]/confirm` | POST | Homeowner confirms job complete + releases payment |
| `/api/jobs/[jobId]/send-message` | POST | Send chat message (notifies other party) |
| `/api/stripe/connect/create-account` | POST | Create Stripe Connect Express account for contractor |
| `/api/stripe/connect/verify` | GET | Save Connect account ID after onboarding |
| `/api/stripe/connect/status` | GET | Check contractor's Connect verification status |
| `/api/stripe/release` | POST | Transfer contractor's 88% cut via Stripe |
| `/api/contractors/earnings` | GET | Contractor payout history |
| `/api/contractors/profile` | GET | Contractor profile + earnings summary |
| `/api/homeowner/subscribe` | POST | Create Stripe Checkout for homeowner Pro ($19/mo) |
| `/api/stripe/webhook` | POST | Handle Stripe events (payment, subscription, Connect) |
| `/api/referral/create` | GET | Get/create referral code |
| `/api/referral/redeem` | POST | Apply referral code |

### Firestore Collections

```
homeowners/{uid}
  name, email, stripeCustomerId, subscriptionPlan, subscriptionStatus, stripeSubscriptionId

contractors/{uid}
  name, trade, city, rating, stripeConnectAccountId, stripeConnectVerified, subscriptionPlan

jobs/{jobId}
  userId, claimedBy, description, trade, status, paymentAmountUsd, paymentIntentId,
  paymentStatus, payoutStatus, payoutAmount, payoutTransferId

jobs/{jobId}/messages/{msgId}
  text, senderId, createdAt, mediaUrls[], edited

jobs/{jobId}/bids/{contractorId}
  price, eta, message, status (pending|selected|declined), submittedAt

jobs/{jobId}/events/{eventId}
  type, actorId, meta, createdAt

notifications/{uid}/items/{notifId}
  type, title, body, read, createdAt, jobId, href, actorId, actorName

contractors/{contractorId}/invitations/{jobId}
  jobId, invitationStatus, invitedAt
```

### Job Status Lifecycle

```
triaged → (bidding) → accepted → in_progress → completed → confirmed
                                                         ↘ disputed
```

- `triaged` — job posted, AI analyzed, contractors being invited
- `accepted` — homeowner selected a bid
- `in_progress` — contractor tapped "Start Job"
- `completed` — contractor tapped "Mark Complete"
- `confirmed` — homeowner confirmed, payment released to contractor

### Platform Fee
- Platform takes **12%**; contractor receives **88%** of `paymentAmountUsd`
- Set in env: `STRIPE_PLATFORM_FEE_PERCENT=12`

---

## Pending / Next Priorities

### High Priority
1. **Contractor settings page improvements** (`/dashboard/contractor/settings`) — currently sparse; add bank account status, notification preferences, availability toggle
2. **Homeowner job list improvements** (`/my-jobs`) — add filter by trade, search, better empty states
3. **Admin dispute resolution UI** (`/admin/disputes`) — admins need to see both sides and release payment to correct party
4. **Push notification subscription flow** — `POST /api/push/subscribe` exists but needs UI to prompt users to enable browser notifications
5. **Job cancellation UI** — `POST /api/jobs/[jobId]/cancel` exists but no UI button on the job detail page for homeowners to cancel pending/open jobs

### Medium Priority
6. **Contractor profile page public view** (`/contractor/[id]`) — show reviews, rating, completed jobs, bid history
7. **Home Health Score detail page** (`/home-health`) — already has the score API, needs a richer breakdown view
8. **Search/filter for job inbox** — contractors can't search or filter their invitation inbox by trade, date, or amount
9. **Bid pack (credits) purchase flow** — `POST /api/bid-pack` exists, needs a UI on contractor settings/upgrade page
10. **Message read receipts** — currently using `CheckCheck` icon but not actually tracking read status in Firestore

### Low Priority / Polish
11. Deploy `firestore.indexes.json` — new indexes for bids collectionGroup and notifications need to be deployed to Firebase
12. Update `firestore.rules` — contractor update permissions for `stripeConnectAccountId` fields may need expanding
13. Replace `src/app/chat/page.tsx` (UnifiedChatPage) — currently 24.5kB, largely unused now that `/chat/[id]` exists; should redirect to `/my-jobs` or list active job threads

---

## Environment Variables Required

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=   # stringified JSON of service account

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_FEE_PERCENT=12

# OpenAI
OPENAI_API_KEY=

# Cloudinary (for image uploads in chat + job posting)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Resend (email notifications)
RESEND_API_KEY=
RESEND_FROM=

# Twilio (SMS notifications — optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## How to Run

```bash
cd "C:\Projects\Maintenance Artificial Intelligence App\repair-ai-pro"
npm run dev      # Development server at localhost:3000
npm run build    # Production build (should pass clean — 93 pages)
```
