import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

export const onMessageCreate = onDocumentCreated(
  "jobs/{jobId}/messages/{messageId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const message = snap.data();
    const { jobId } = event.params;

    await db
      .collection("jobs")
      .doc(jobId)
      .collection("events")
      .add({
        type: "message",
        senderId: message.senderId,
        createdAt: message.createdAt || new Date(),
      });
  }
);