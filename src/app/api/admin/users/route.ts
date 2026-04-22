import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const ADMIN_UIDS = (process.env.ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

async function isAdmin(req: Request): Promise<boolean> {
  try {
    const header  = req.headers.get("authorization") ?? "";
    const token   = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return false;
    const decoded = await adminAuth.verifyIdToken(token);
    return ADMIN_UIDS.includes(decoded.uid) || (decoded.email?.endsWith("@repair-ai.admin") ?? false);
  } catch { return false; }
}

export async function GET(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await adminAuth.listUsers(1000);
    const users = result.users.map((u) => ({
      uid:         u.uid,
      email:       u.email,
      displayName: u.displayName,
      creationTime: u.metadata.creationTime,
      lastSignIn:  u.metadata.lastSignInTime,
      disabled:    u.disabled,
    }));
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
