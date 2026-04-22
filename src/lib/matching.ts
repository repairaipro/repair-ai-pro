// ─── Types ────────────────────────────────────────────────────────────────────

export type JobLocationInput = {
  zone?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
};

export type ContractorLike = {
  id?: string;
  role?: string;
  trade?: string;
  trades?: string[];
  availability?: "available" | "busy" | "offline";
  serviceZones?: string[];
  city?: string;
  zipCode?: string;
  serviceRadiusMiles?: number;
  reputationScore?: number;
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  invitationAcceptCount?: number;
  invitationDeclineCount?: number;
  boostActive?: boolean;
  boostLevel?: number;
  location?: {
    lat?: number;
    lng?: number;
  };
};

// ─── Trust / Reputation ───────────────────────────────────────────────────────

export function getAcceptanceRate(contractor: ContractorLike) {
  const accepted = contractor.invitationAcceptCount || 0;
  const declined = contractor.invitationDeclineCount || 0;
  const total = accepted + declined;
  if (total <= 0) return 0;
  return accepted / total;
}

export function getTrustScore(contractor: ContractorLike) {
  const rating = contractor.rating || 0;
  const reviewCount = contractor.reviewCount || 0;
  const jobsCompleted = contractor.jobsCompleted || 0;
  const acceptanceRate = getAcceptanceRate(contractor);

  let trust = 0;
  trust += rating * 12;
  trust += Math.min(reviewCount, 100) * 0.35;
  trust += Math.min(jobsCompleted, 100) * 0.75;
  trust += acceptanceRate * 25;

  if (reviewCount < 3 && jobsCompleted < 3) {
    trust -= 15;
  }

  return Math.max(0, Math.round(trust));
}

export function getTrustTier(trustScore: number) {
  if (trustScore >= 105) {
    return { key: "high", label: "Highly Reliable", shortLabel: "High Trust" };
  }
  if (trustScore >= 70) {
    return { key: "medium", label: "Reliable", shortLabel: "Trusted" };
  }
  if (trustScore >= 40) {
    return { key: "developing", label: "Developing Reputation", shortLabel: "Developing" };
  }
  return { key: "low", label: "Needs More History", shortLabel: "Limited History" };
}

// ─── Location Helpers ─────────────────────────────────────────────────────────

export function slugifyZone(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function tradeMatches(contractor: ContractorLike, trade?: string | null) {
  if (!trade) return true;
  const normalized = trade.trim().toLowerCase();
  if (contractor.trade?.toLowerCase() === normalized) return true;
  if (Array.isArray(contractor.trades)) {
    return contractor.trades.some((t) => t?.toLowerCase() === normalized);
  }
  return false;
}

export function zoneMatches(contractor: ContractorLike, job: JobLocationInput) {
  if (!job.zone || !Array.isArray(contractor.serviceZones)) return false;
  const zone = slugifyZone(job.zone);
  return contractor.serviceZones.map(slugifyZone).includes(zone);
}

export function zipMatches(contractor: ContractorLike, job: JobLocationInput) {
  if (!job.zipCode || !contractor.zipCode) return false;
  return contractor.zipCode.trim() === job.zipCode.trim();
}

export function cityMatches(contractor: ContractorLike, job: JobLocationInput) {
  if (!job.city || !contractor.city) return false;
  return contractor.city.trim().toLowerCase() === job.city.trim().toLowerCase();
}

export function radiusMatches(contractor: ContractorLike, job: JobLocationInput) {
  const lat1 = job.lat;
  const lng1 = job.lng;
  const lat2 = contractor.location?.lat;
  const lng2 = contractor.location?.lng;

  if (
    typeof lat1 !== "number" ||
    typeof lng1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lng2 !== "number"
  ) {
    return { matched: false, distanceMiles: null as number | null };
  }

  const distanceMiles = getDistanceMiles(lat1, lng1, lat2, lng2);
  const radius = contractor.serviceRadiusMiles ?? 15;
  return { matched: distanceMiles <= radius, distanceMiles };
}

// ─── Match Scoring ────────────────────────────────────────────────────────────

export type MatchResult = {
  matched: boolean;
  score: number;
  reason: string;
  distanceMiles: number | null;
};

export function scoreContractorMatch(
  contractor: ContractorLike,
  job: {
    trade?: string | null;
    location?: JobLocationInput | null;
  }
): MatchResult {
  // Docs fetched from the `contractors` collection are implicitly contractors,
  // but API payloads may include a `role` field — honour it when present.
  if (contractor.role != null && contractor.role !== "contractor") {
    return { matched: false, score: 0, reason: "not_contractor", distanceMiles: null };
  }

  if (contractor.availability === "offline") {
    return { matched: false, score: 0, reason: "offline", distanceMiles: null };
  }

  if (!tradeMatches(contractor, job.trade)) {
    return { matched: false, score: 0, reason: "trade_mismatch", distanceMiles: null };
  }

  const location = job.location ?? {};
  const zoneHit = zoneMatches(contractor, location);
  const zipHit = zipMatches(contractor, location);
  const cityHit = cityMatches(contractor, location);
  const radius = radiusMatches(contractor, location);

  const matched = zoneHit || zipHit || cityHit || radius.matched;

  if (!matched) {
    return { matched: false, score: 0, reason: "location_mismatch", distanceMiles: radius.distanceMiles };
  }

  let score = 0;

  if (contractor.availability === "available") score += 40;
  else if (contractor.availability === "busy") score += 10;

  if (zoneHit) score += 35;
  else if (zipHit) score += 25;
  else if (cityHit) score += 12;
  else if (radius.matched) score += 20;

  const rep = typeof contractor.reputationScore === "number" ? contractor.reputationScore : 0;
  const completed = typeof contractor.jobsCompleted === "number" ? contractor.jobsCompleted : 0;
  score += Math.min(rep, 25);
  score += Math.min(completed * 0.5, 10);

  if (typeof radius.distanceMiles === "number") {
    if (radius.distanceMiles <= 5) score += 20;
    else if (radius.distanceMiles <= 10) score += 12;
    else if (radius.distanceMiles <= 20) score += 6;
  }

  if (contractor.boostActive) {
    const level = contractor.boostLevel || 1;
    score += Math.min(level, 3) * 15;
  }

  return {
    matched: true,
    score: Math.round(score),
    reason: zoneHit ? "zone" : zipHit ? "zip" : cityHit ? "city" : "radius",
    distanceMiles: radius.distanceMiles,
  };
}
