import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

// Maps Google Place types → our trade categories
const TYPE_TO_TRADE: Record<string, string> = {
  // Home trades
  plumber:                    "Plumbing",
  electrician:                "Electrical",
  roofing_contractor:         "Roofing",
  hvac_contractor:            "HVAC",
  general_contractor:         "General",
  carpenter:                  "Carpentry",
  painter:                    "Painting",
  handyman:                   "Handyman",
  appliance_repair_service:   "Appliance Repair",
  landscaper:                 "Landscaping",
  pest_control_service:       "Pest Control",
  flooring_store:             "Flooring",
  locksmith:                  "Locksmith",
  moving_company:             "Moving & Hauling",
  // Tech & Security
  electronics_store:          "IT & Tech Support",
  computer_store:             "IT & Tech Support",
  security_system:            "Security Systems",
  // Fallback
  home_goods_store:           "General",
  establishment:              "General",
};

function detectTrade(types: string[]): string {
  for (const t of types) {
    if (TYPE_TO_TRADE[t]) return TYPE_TO_TRADE[t];
  }
  return "";
}

export async function GET(req: Request) {
  const decoded = await verifyAuthToken(req).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("type", "establishment");
  url.searchParams.set("fields", "place_id,name,formatted_address,types,rating,user_ratings_total");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Google Places request failed" }, { status: 502 });
  }

  const data = await res.json();
  if (data.status === "REQUEST_DENIED") {
    return NextResponse.json({ error: "Google Places API key invalid or not enabled" }, { status: 503 });
  }

  // Return a clean, minimal list — never expose the raw API key or full response
  const results = (data.results ?? []).slice(0, 8).map((p: any) => ({
    placeId:        p.place_id,
    name:           p.name,
    address:        p.formatted_address,
    rating:         p.rating ?? null,
    reviewCount:    p.user_ratings_total ?? 0,
    detectedTrade:  detectTrade(p.types ?? []),
    types:          p.types ?? [],
  }));

  return NextResponse.json({ results });
}
