// src/lib/storage.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from './db';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './db';

const storage = getStorage();

export async function uploadAttachment(jobId: string, file: File, type: 'image'|'video'|'file'|'audio') {
  const path = `jobs/${jobId}/attachments/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'jobs', jobId, 'attachments'), {
    name: file.name,
    url,
    size: file.size,
    type,
    uploadedBy: auth.currentUser?.uid || null,
    createdAt: serverTimestamp(),
  });

  return url;
}
