/**
 * Canonical service category list used across the entire app.
 * Any change here propagates to: job wizard, contractor profile,
 * marketplace filters, AI prompts, and contractor matching.
 */

export const TRADES = [
  // ── Home & Property ────────────────────────────────────────
  "Plumbing",
  "Electrical",
  "HVAC",
  "Carpentry",
  "Roofing",
  "Appliance Repair",
  "Handyman",
  "Painting",
  "Landscaping",
  "Flooring",
  "Cleaning",
  "Pest Control",
  "Pool & Spa",
  "Masonry",
  "Windows & Doors",
  "Pressure Washing",
  // ── Tech & Security ───────────────────────────────────────
  "IT & Tech Support",
  "Security Systems",
  "Smart Home",
  "Solar & Energy",
  // ── Specialized ───────────────────────────────────────────
  "Moving & Hauling",
  "Locksmith",
  "Welding & Fabrication",
  "Junk Removal",
  // ── General ───────────────────────────────────────────────
  "General",
] as const;

export type Trade = (typeof TRADES)[number];

/** Comma-separated list for AI prompts */
export const TRADES_FOR_PROMPT = TRADES.join(" / ");
