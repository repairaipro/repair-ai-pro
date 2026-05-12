import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Cleanup expired location data
 *
 * Runs every 10 minutes to delete location documents older than 60 minutes.
 *
 * This fulfills our privacy promise:
 * "Your location is automatically deleted 60 minutes after the job."
 *
 * Triggered by Cloud Scheduler (cron job)
 */
export const cleanupLocationData = functions.pubsub
  .schedule('*/10 * * * *') // Every 10 minutes
  .timeZone('UTC')
  .onRun(async (context: any) => {
    const now = new Date();
    const expiryTime = new Date(now.getTime() - 60 * 60 * 1000); // 60 minutes ago

    let deletedCount = 0;
    let errorCount = 0;

    try {
      // Find all jobs with live location data
      const jobsSnapshot = await db.collectionGroup('liveLocation')
        .where('timestamp', '<', expiryTime)
        .limit(100) // Process in batches to avoid timeout
        .get();

      if (jobsSnapshot.empty) {
        console.log('✅ No expired location data to cleanup');
        return;
      }

      // Delete in batch
      const batch = db.batch();

      jobsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();

      console.log(`✅ Cleanup complete: deleted ${deletedCount} location documents`);

      // Log cleanup action for audit trail
      await db.collection('_systemLogs').add({
        action: 'location_cleanup',
        deletedCount,
        expiryTime,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: true,
      });
    } catch (error: any) {
      console.error('❌ Location cleanup failed:', error.message);
      errorCount++;

      // Log error for investigation
      await db.collection('_systemLogs').add({
        action: 'location_cleanup_error',
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: false,
      });
    }

    return {
      deletedCount,
      errorCount,
      timestamp: now.toISOString(),
    };
  });

/**
 * Cleanup location data on demand
 *
 * HTTP function for manual cleanup if needed
 * POST /cleanupLocationDataManual
 *
 * Admin only
 */
export const cleanupLocationDataManual = functions.https.onRequest(
  async (req, res) => {
    // Verify admin
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;

      // Check if user is admin
      const adminUids = process.env.ADMIN_UIDS?.split(',') || [];
      if (!adminUids.includes(uid)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Run cleanup
      const now = new Date();
      const expiryTime = new Date(now.getTime() - 60 * 60 * 1000);

      const jobsSnapshot = await db.collectionGroup('liveLocation')
        .where('timestamp', '<', expiryTime)
        .get();

      const batch = db.batch();
      let deletedCount = 0;

      jobsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();

      res.json({
        success: true,
        message: `Deleted ${deletedCount} expired location documents`,
        deletedCount,
        timestamp: now.toISOString(),
      });
    } catch (error: any) {
      console.error('Manual cleanup error:', error.message);
      res.status(500).json({
        error: 'Cleanup failed',
        message: error.message,
      });
    }
  }
);

/**
 * Monitor location data storage
 *
 * Runs hourly to log stats about location data:
 * - Total documents stored
 * - Age distribution
 * - Any orphaned data
 */
export const monitorLocationData = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .timeZone('UTC')
  .onRun(async (context: any) => {
    try {
      const allLocations = await db.collectionGroup('liveLocation').get();

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      let recent = 0;
      let expiring = 0;
      let expired = 0;

      allLocations.docs.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);

        if (timestamp > oneHourAgo) {
          recent++;
        } else if (timestamp > twoHoursAgo) {
          expiring++;
        } else {
          expired++;
        }
      });

      console.log(`📊 Location data stats:
        Total: ${allLocations.size}
        Recent (<1h): ${recent}
        Expiring (1-2h): ${expiring}
        Expired (>2h): ${expired}`);

      // Log stats
      await db.collection('_systemLogs').add({
        action: 'location_monitoring',
        stats: {
          total: allLocations.size,
          recent,
          expiring,
          expired,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      console.error('❌ Location monitoring failed:', error.message);
    }
  });
