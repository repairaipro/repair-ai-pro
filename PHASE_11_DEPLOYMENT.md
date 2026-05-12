# Phase 11: Live Location Tracking - Deployment Guide

This document covers deploying Phase 11 (real-time contractor location tracking) to production.

## Overview

Phase 11 provides real-time location tracking for contractors with full privacy controls:
- Contractors can "Go Live" to share location while heading to jobs
- Homeowners see real-time map with ETA
- Location auto-deletes after 60 minutes
- Firestore security rules prevent unauthorized access
- Cloud Functions handle automatic cleanup

## Pre-Deployment Checklist

- [ ] Firestore rules reviewed and tested
- [ ] Cloud Functions configured in Firebase
- [ ] Environment variables set
- [ ] Google Maps API key configured
- [ ] Local testing completed
- [ ] Team reviewed privacy policy changes

## Deployment Steps

### Step 1: Deploy Firestore Security Rules

The security rules restrict location data access to prevent misuse:
- Only contractors can write their location during active jobs
- Only homeowners can read contractor location (during active job)
- Location documents auto-expire after TTL

**Command:**
```bash
firebase deploy --only firestore:rules
```

**What this does:**
- Enforces `liveLocation` subcollection security
- Prevents contractors from accessing other contractors' data
- Prevents homeowners from accessing other jobs' location data
- No deletion allowed (handled by Cloud Function)

**Verify:**
```bash
firebase rules:test firestore.rules
```

---

### Step 2: Deploy Cloud Functions

Cloud Functions handle automatic cleanup of expired location data (fulfilling the 60-min privacy promise).

**Prerequisites:**
- Firebase project has billing enabled (Cloud Functions require it)
- Node.js 18+ installed

**Deploy all functions:**
```bash
cd functions
npm install
firebase deploy --only functions
```

**Functions deployed:**

1. **cleanupLocationData** (Scheduled)
   - Runs every 10 minutes
   - Deletes location documents older than 60 minutes
   - Logs deletions for audit trail
   - Ensures privacy promise is kept

2. **monitorLocationData** (Scheduled)
   - Runs every hour
   - Logs statistics about stored location data
   - Helps identify orphaned data
   - Provides visibility into system health

3. **cleanupLocationDataManual** (HTTP)
   - Manual cleanup endpoint (admin only)
   - Useful for testing or emergency cleanup
   - Requires admin authentication

**Verify deployment:**
```bash
firebase functions:list
```

Expected output:
```
cleanupLocationData
monitorLocationData
cleanupLocationDataManual
```

---

### Step 3: Configure Cloud Scheduler

The scheduled functions require Cloud Scheduler to trigger them. Firebase deploys these automatically, but you can verify:

**Check scheduler jobs:**
```bash
gcloud scheduler jobs list --location=us-central1
```

**Expected jobs:**
- `firebase-schedule-cleanupLocationData`
- `firebase-schedule-monitorLocationData`

---

### Step 4: Verify Firestore Indexes

Some queries in the location system may require composite indexes. If deployments show errors about missing indexes, Firebase will provide a link to create them.

**To manually deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

---

### Step 5: Test End-to-End Locally

Before going live, test the complete flow:

**1. Start dev server:**
```bash
npm run dev
```

**2. As Contractor:**
- Navigate to Dashboard → Settings
- Toggle "Go Live for Dispatch"
- Grant location permission
- Verify permission is saved

**3. Create test job as homeowner:**
- Go to `/jobs/new`
- Create a test job

**4. Claim job as contractor:**
- Go to `/contractor-inbox`
- Accept the job

**5. Verify map appears:**
- Go to job chat `/chat/{jobId}`
- Should see live location map above messages
- Should show contractor's current location

**6. Verify location updates:**
- Move around (in browser dev tools, simulate location changes)
- Map should update in real-time
- ETA should recalculate

**7. Verify arrival:**
- Contractor location should reach destination
- Map should auto-hide
- Job status should change to "in_progress"

**8. Verify cleanup (next day):**
- After 60+ minutes, location should be deleted
- Check Firestore console → jobs → {jobId} → liveLocation
- Documents should be gone

---

## Production Checklist - Before Launch

### Security
- [ ] Firestore rules deployed and tested
- [ ] Only authenticated users can access
- [ ] Contractor cannot see other contractors' locations
- [ ] Homeowner cannot see other homeowners' contractors
- [ ] Location data auto-deletes (verified in Cloud Function logs)

### Performance
- [ ] Map loads within 2 seconds
- [ ] Location updates appear within 5 seconds
- [ ] No errors in browser console
- [ ] No Cloud Function errors in logs

### Privacy
- [ ] Privacy policy updated to mention location tracking
- [ ] Contractors understand "Go Live" is optional
- [ ] Battery warning displays at <20%
- [ ] Location permission request is clear
- [ ] Cleanup Cloud Function is running

### Monitoring
- [ ] Set up alerts for Cloud Function failures
- [ ] Monitor Firestore reads/writes (check quota)
- [ ] Watch for "liveLocation" documents growing unbounded
- [ ] Check cleanup logs regularly

---

## Monitoring After Deployment

### Cloud Function Logs

**View cleanup logs:**
```bash
firebase functions:log --limit 50
```

Look for:
- `✅ Cleanup complete: deleted X location documents` (success)
- `❌ Location cleanup failed` (errors)

**View system stats:**
```bash
firebase functions:log --limit 50 | grep "Location data stats"
```

Expected output:
```
📊 Location data stats:
  Total: 5
  Recent (<1h): 3
  Expiring (1-2h): 2
  Expired (>2h): 0
```

If "Expired" is > 0, cleanup may be failing.

### Firestore Monitoring

**Check storage usage:**
1. Firebase Console → Firestore → Storage
2. Look for growth in `jobs/{jobId}/liveLocation` collection
3. Should stay small (< 1KB per active job)

**Check document count:**
```bash
firebase firestore:delete --recursive --all-collections
# (Don't actually run this - just showing where to monitor)
```

Better: Use Firebase Console → Firestore → Indexes to see collection sizes

### User Metrics

Track in your analytics:
- How many contractors are using "Go Live"
- Average session duration
- Battery level of active contractors
- Homeowner engagement with map

---

## Troubleshooting

### Issue: Cloud Function errors

**Error:** `cleanupLocationData` fails with "quota exceeded"

**Solution:** 
- Split cleanup into smaller batches
- Increase time interval between runs
- Upgrade Firestore plan if needed

---

### Issue: Locations not auto-deleting

**Check:**
1. Verify Cloud Function is running:
   ```bash
   firebase functions:log --limit 20
   ```

2. Manually trigger cleanup:
   ```bash
   curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/cleanupLocationDataManual \
     -H "Authorization: Bearer YOUR-ADMIN-TOKEN"
   ```

3. Check Firestore console for old documents
   - Navigate to: `jobs/{jobId}/liveLocation`
   - Sort by timestamp
   - Should see no documents older than 60 minutes

---

### Issue: Slow map loading

**Check:**
1. Google Maps API key has sufficient quota
2. Check browser network tab:
   - `/api/contractors/location` should return < 100ms
   - Google Maps load < 1 second
   - Firestore query < 500ms

**Optimization:**
- Cache map initialization
- Reduce location update frequency if battery low
- Use Web Workers for distance calculations

---

### Issue: Battery drain complaints

**Check:**
1. Location update frequency (should be 5-60 sec based on conditions)
2. GPS vs WiFi usage (WiFi is more efficient)
3. Geolocation accuracy settings

**Optimization:**
- Increase update interval to 10 seconds
- Switch to WiFi triangulation when available
- Show battery warning at < 30% instead of 20%

---

## Rollback Plan

If there are critical issues:

### Option 1: Disable Location Tracking (Quick)
```bash
# Delete Go Live toggle from UI
# Cloud Functions will stop running automatically
# Existing location documents will still auto-delete
```

### Option 2: Disable Cloud Functions Only
```bash
firebase functions:delete cleanupLocationData --force
firebase functions:delete monitorLocationData --force
firebase functions:delete cleanupLocationDataManual --force
```

### Option 3: Revert Rules (Preserve Data)
```bash
# Revert firestore.rules to previous version
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

---

## Post-Deployment Tasks

1. **Notify contractors:**
   - Email: "New feature: Go Live for better job matches"
   - In-app: Banner on dashboard
   - Tutorial: Show how to toggle and what it means

2. **Monitor analytics:**
   - Track adoption (% of contractors using Go Live)
   - Track engagement (avg session duration)
   - Track issues (error rates, complaints)

3. **Update documentation:**
   - Privacy policy: Location tracking terms
   - FAQ: How location tracking works
   - Support: Common questions

4. **Set up alerts:**
   - Cloud Function failures
   - High error rates
   - Quota warnings

5. **Schedule reviews:**
   - Weekly: Check logs for issues
   - Monthly: Review analytics
   - Quarterly: Privacy audit

---

## Support Commands

### View all location data
```bash
firestore --project=YOUR-PROJECT export gs://YOUR-BUCKET/location-backup --collection-ids=liveLocation
```

### Delete specific job's location history
```bash
# Firebase console: jobs/{jobId}/liveLocation → select all → delete
```

### Check contractor's tracking status
```bash
# Firebase console: contractors/{contractorId} → check goLive field
```

### Test cleanup manually
```bash
curl -X POST https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/cleanupLocationDataManual \
  -H "Authorization: Bearer $(firebase auth:export token)"
```

---

## Questions?

Contact: [Your support email]
Docs: [Your docs link]
Status: [Your status page]
