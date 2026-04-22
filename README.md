
# Repair AI Pro (Starter v2)

**Professional starter** for your tradesmen/home‑repair app:
- **Next.js (App Router) + Tailwind** (frontend)
- **Firebase Auth + Firestore** (users, jobs)
- **Cloudinary** (image/audio/video uploads, signed server route)
- **OpenAI (ChatGPT)** for AI diagnostics/chat
- **Job Wizard** (/jobs/new) and **Tradesman Console** (/tradesmen)

## 1) Prereqs
- Node 18+
- Accounts: Firebase, Cloudinary, OpenAI

## 2) Install
```bash
npm i
cp .env.local.example .env.local
# Fill .env.local with your keys
npm run dev
# open http://localhost:3000
```

## 3) Environment Variables
Duplicate `.env.local.example` → `.env.local`, then fill:

### Firebase
- Enable **Authentication** (Google + Email/Password)
- Enable **Firestore** (in Native mode)

### Cloudinary
- Dashboard → copy **cloud name**, **API key**, **API secret**

### OpenAI
- Create a key with access to chat models

## 4) Pages included
- `/auth/signin` → Google/email sign‑in
- `/upload` → Raw Cloudinary upload tester
- `/jobs/new` → Multi‑step wizard: describe → upload → **AI pre‑diagnosis** → submit (saves Firestore doc)
- `/dashboard` → User jobs (requires auth)
- `/tradesmen` → Open jobs list + Claim; My claimed jobs

## 5) Firestore Rules (Dev example)
> Tighten before production.

```
// Firestore Rules (simplified dev example)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobs/{jobId} {
      allow read: if true; // enable listing for demo
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        (request.resource.data.claimedBy == request.auth.uid && request.resource.data.status in ['claimed','scheduled','completed'])
      );
    }
  }
}
```

## 6) Deployment
- Push to GitHub
- Import to **Vercel**
- Add all env vars under Project → Settings → Environment Variables
- Redeploy

## 7) Next Upgrades
- **Profiles** (`users`, `tradesmen` with skills, license, service radius)
- **Quotes & scheduling** (quotes subcollection; ICS appointment; calendar sync later)
- **Realtime chat** (messages collection with jobId; notifications)
- **Stripe** (Checkout now; Connect for payouts later)
- **Moderation** (image scanning; abuse reporting)
- **Rate limits & validation** (edge middleware, zod on API routes)
```)

