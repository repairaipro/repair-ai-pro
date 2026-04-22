import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

/**
 * Verifies Firebase ID token from cookies.
 * Throws if unauthenticated.
 */
export async function getAuthUid(): Promise<string> {
  const token = cookies().get("__session")?.value;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}
