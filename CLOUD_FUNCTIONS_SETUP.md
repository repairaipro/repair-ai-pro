# Cloud Functions Setup Guide

This guide walks you through deploying Firebase Cloud Functions for push notifications.

## What's Included

Two Cloud Functions in `functions/notifyJobArrival.ts`:

1. **onLocationUpdate** — Triggers when contractor location is updated
   - Detects arrival/departure using geofence (0.5 mi radius)
   - Sends push notification to homeowner
   - Logs event to notificationHistory

2. **onJobStatusChange** — Triggers when job status changes
   - Notifies homeowner when contractor starts/completes work
   - Sends relevant push notifications

## Setup Steps

### 1. Initialize Firebase Functions (One-time)

If you haven't already initialized functions in your project:

```bash
cd /path/to/repair-ai-pro
firebase init functions
```

When prompted:
- **Language**: Choose TypeScript
- **Overwrite**: Say no to overwrite existing files

This creates the `functions/` directory with `src/` folder.

### 2. Copy the Cloud Function File

Copy `functions/notifyJobArrival.ts` → `functions/src/notifyJobArrival.ts`

### 3. Update functions/src/index.ts

Add these imports at the top:

```typescript
export { onLocationUpdate, onJobStatusChange } from "./notifyJobArrival";
```

### 4. Install Dependencies

The functions need these packages. Add to `functions/package.json`:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

Then install:

```bash
cd functions
npm install
cd ..
```

### 5. Update Firestore Rules (Already Done ✓)

The rules in `firestore.rules` already allow:
- Writing to `jobs/{jobId}/locationHistory` (contractors)
- Reading `notificationHistory` (participants)
- Writing `notificationHistory` (Cloud Functions only, via admin SDK)

### 6. Deploy Functions

```bash
firebase deploy --only functions
```

This will:
- Compile TypeScript
- Deploy both functions to your Firebase project
- Show you the function URLs and triggers

### 7. Add FCM Tokens to User Documents

For push notifications to work, you need to store device FCM tokens in user documents.

Add this to user signup/onboarding:

```typescript
import { getMessaging, getToken } from "firebase/messaging";

async function saveFCMToken(userId: string) {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
    }
  } catch (error) {
    console.log("FCM token save failed:", error);
  }
}
```

### 8. Get VAPID Key

From Firebase Console:
1. Go to **Project Settings** → **Cloud Messaging**
2. Copy the **Server API Key** → `FIREBASE_MESSAGING_SENDER_ID` (already in your `.env.local`)
3. Under **Web Push certificates**, click **Generate Key Pair** (if not present)
4. Copy the **Public Key** → `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local`

## Testing

After deployment:

1. **Contractor starts tracking** → Geolocation enabled
2. **Moves toward job location** → Location history saved
3. **Enters 0.5 mi radius** → Push notification sent to homeowner
4. **Notification appears** → In notifications panel (or notification center on mobile)
5. **Check Cloud Functions logs** → Firebase Console → Functions → Logs

## Debugging

### Functions Not Triggering?

- Check Cloud Functions logs: Firebase Console → Functions → Logs
- Verify `locationHistory` subcollection is being written
- Check user document has `fcmTokens` array with at least one token

### Push Notifications Not Showing?

- Verify VAPID key is set in `.env.local`
- Check browser notifications are enabled
- Verify `fcmTokens` array in user document is not empty
- Check Cloud Messaging tab in Firebase Console

### Quotas & Limits

Firebase Cloud Functions free tier includes:
- **Invocations**: 2M/month
- **Storage**: 5GB
- **Networking**: 1GB/month

For a typical contractor job (~100 location updates):
- ~100 function invocations per job
- ~10KB storage per job
- Well within free tier

## What Happens Next

When contractors update location:

1. Location saved to `jobs/{jobId}` (contractorLocation field)
2. Location history saved to `jobs/{jobId}/locationHistory/{doc}`
3. Cloud Function triggered automatically
4. Function calculates distance from job location
5. If entering/leaving geofence → Push notification sent to homeowner
6. Event logged to `jobs/{jobId}/notificationHistory`

Homeowner sees:
- Push notification badge
- "Contractor Arrived 📍" or "Contractor Departed 🚗"
- Can click to jump to active job details

## Customization

You can modify the Cloud Function to:
- Change geofence radius (currently 0.5 miles, line 19)
- Add SMS notifications (via Twilio)
- Send emails instead of/in addition to push
- Add custom analytics or logging
- Adjust notification messages/titles

Just redeploy after changes:

```bash
firebase deploy --only functions
```

## Questions?

If anything isn't working:
1. Check Cloud Functions logs for errors
2. Verify Firestore rules allow the operations
3. Ensure `.env.local` has all required Firebase keys
4. Test with `firebase emulators:start` locally first

## Next: Enable Web Push in Your App

Once functions are deployed, contractors will see push notifications when they enable location tracking and approach job locations. The entire flow is now automated!
