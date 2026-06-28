import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;

/** --- Google Sign-In Flow --- */
export async function signInWithGoogle(): Promise<UserCredential["user"] | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Ensure Firestore user record exists on first sign-in
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        role: "guest",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        createdAt: new Date(),
      });
    }

    return user;
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return null;
  }
}

/** --- Sign-Out --- */
export async function signOutUser() {
  await firebaseSignOut(auth);
}

/** --- Email/Password Sign-In --- */
export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/** --- Email/Password Sign-Up --- */
export async function signUpWithEmail(email: string, password: string, name: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  await updateProfile(user, { displayName: name });

  // Create Firestore user record
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      role:        'guest',
      displayName: name,
      photoURL:    '',
      createdAt:   new Date(),
    });
  }
  return user;
}

/** --- Password Reset --- */
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}
