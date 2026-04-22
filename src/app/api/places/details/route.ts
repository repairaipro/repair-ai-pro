import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebaseAdmin";

export type PlaceDetails = {
  placeId: string;
  name: string;
  phone: string;
  city: string;
  zipCode: string;
  fullAddress: string;
  website: string;
  rating: number | null;
  reviewCount: number;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
};

function extractCity(components: any[]): string {
  const locality = components.find((c: any) => c.types.includes("locality"));
  if (locality) return locality.long_name;
  const sublocality = components.find((c: any) => c.types.includes("sublocality"));
  if (sublocality) return sublocality.long_name;
  return "";
}

function extractZip(components: any[]): string {
  const zip = components.find((c: any) => c.types.includes("postal_code"));
  return zip?.short_name ?? "";
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
  const placeId = searchParams.get("placeId")?.trim();
  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
  }

  const fields = [
    "place_id",
    "name",
    "formatted_phone_number",
    "formatted_address",
    "address_components",
    "website",
    "rating",
    "user_ratings_total",
    "photos",
    "geometry",
  ].join(",");

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", fields);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Google Places details request failed" }, { status: 502 });
  }

  const data = await res.json();
  const p = data.result;
  if (!p) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  // Build a Cloudinary-proxied photo URL if available
  let photoUrl: string | null = null;
  if (p.photos?.[0]?.photo_reference) {
    const photoRef = p.photos[0].photo_reference;
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`;
  }

  const components: any[] = p.address_components ?? [];
  const details: PlaceDetails = {
    placeId,
    name:        p.name ?? "",
    phone:       p.formatted_phone_number ?? "",
    city:        extractCity(components),
    zipCode:     extractZip(components),
    fullAddress: p.formatted_address ?? "",
    website:     p.website ?? "",
    rating:      p.rating ?? null,
    reviewCount: p.user_ratings_total ?? 0,
    photoUrl,
    lat:         p.geometry?.location?.lat ?? null,
    lng:         p.geometry?.location?.lng ?? null,
  };

  return NextResponse.json({ details });
}
