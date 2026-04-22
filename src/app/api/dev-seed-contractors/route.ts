import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";

export async function POST() {
  // Safety: dev only
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const sample = [
    { name: "Luis Auto Repair", trade: "Car Mechanic", city: "Houston", experience: 8, bio: "CV axles, boots, brakes, suspensions. Same-day service.", photoUrl: "" },
    { name: "Bayou Mechanic Co.", trade: "Car Mechanic", city: "Houston", experience: 12, bio: "Drivetrain + CV joint repairs. Honest pricing.", photoUrl: "" },
    { name: "Northside Auto Pros", trade: "Car Mechanic", city: "Houston", experience: 5, bio: "Fast diagnostics, fair labor, quality parts.", photoUrl: "" },
    { name: "Spring Auto Care", trade: "Car Mechanic", city: "Spring", experience: 10, bio: "Axle replacement, boot kits, alignment checks.", photoUrl: "" },
    { name: "H-Town Drivetrain", trade: "Car Mechanic", city: "Houston", experience: 15, bio: "CV axles, transmissions, performance-friendly repairs.", photoUrl: "" },
  ];

  const batch = adminDb.batch();
  const colRef = adminDb.collection("contractors");

  for (const c of sample) {
    const ref = colRef.doc();
    batch.set(ref, { ...c, createdAt: new Date(), portfolio: [] });
  }

  await batch.commit();
  return NextResponse.json({ ok: true, count: sample.length });
}
