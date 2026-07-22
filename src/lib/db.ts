import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

async function ensureUserDoc(user: UserCredential["user"]) {
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
}

/**
 * --- Google Sign-In Flow ---
 * Tries a popup first (no full-page navigation, faster). Browsers
 * increasingly block popups that aren't triggered perfectly synchronously
 * from the click (Safari, some Chrome configs, most mobile browsers) —
 * that surfaces as auth/popup-blocked, so we fall back to a full-page
 * redirect, which always works. Real errors are rethrown instead of
 * swallowed, so the caller can show the user what actually happened
 * instead of the button silently doing nothing.
 */
export async function signInWithGoogle(): Promise<UserCredential["user"] | null> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await ensureUserDoc(result.user);
    return result.user;
  } catch (error: any) {
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/operation-not-supported-in-this-environment") {
      // Redirect navigates away — nothing to return here. The page must
      // call completeGoogleRedirectSignIn() on load to pick up the result.
      await signInWithRedirect(auth, provider);
      return null;
    }
    console.error("Google sign-in failed:", error);
    throw error;
  }
}

/**
 * Call once on page load (e.g. the sign-in page) to complete a Google
 * sign-in that fell back to signInWithRedirect. Resolves to null (no-op)
 * if the user didn't just arrive from a redirect flow.
 */
export async function completeGoogleRedirectSignIn(): Promise<UserCredential["user"] | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;
  await ensureUserDoc(result.user);
  return result.user;
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
