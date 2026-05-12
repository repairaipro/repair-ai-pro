/**
 * Location Service - Multi-source, robust, privacy-first
 *
 * Features:
 * - GPS primary, WiFi/cell fallback
 * - Outlier detection (catch GPS glitches)
 * - Accuracy assessment
 * - Adaptive update intervals (battery optimization)
 * - Graceful degradation
 */

export type LocationSource = "gps" | "wifi" | "cellular" | "address" | "unknown";
export type LocationAccuracy = "high" | "medium" | "low";

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number; // meters (±accuracy)
  source: LocationSource;
  timestamp: number; // milliseconds
  speed?: number; // m/s (contractor moving speed)
  heading?: number; // degrees (0-360)
}

export interface ValidatedLocation {
  latitude: number;
  longitude: number;
  accuracy: LocationAccuracy;
  source: LocationSource;
  distanceFromLast: number; // miles
  isValid: boolean;
  reason?: string; // if invalid
  timestamp: number;
}

/**
 * Validate incoming location against last known location
 * Catches GPS glitches (teleporting, impossible speeds)
 */
export function validateLocation(
  newLocation: LocationUpdate,
  lastLocation: LocationUpdate | null,
  maxReasonableSpeed: number = 70 // mph
): ValidatedLocation {
  const timestamp = Date.now();

  // First location always valid
  if (!lastLocation) {
    return {
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      accuracy: assessAccuracy(newLocation.accuracy, newLocation.source),
      source: newLocation.source,
      distanceFromLast: 0,
      isValid: true,
      timestamp,
    };
  }

  // Calculate distance and time delta
  const distance = haversineDistance(
    lastLocation.latitude,
    lastLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );

  const timeDeltaSec = (newLocation.timestamp - lastLocation.timestamp) / 1000;
  const timeDeltaHours = timeDeltaSec / 3600;

  // Check if movement is physically possible
  const maxReasonableDistance = maxReasonableSpeed * timeDeltaHours;

  if (distance > maxReasonableDistance && timeDeltaSec > 5) {
    // Outlier detected: too fast to be real
    console.warn(
      `⚠️ Location outlier rejected: ${distance.toFixed(2)}mi in ${timeDeltaSec}sec (requires ${(distance / timeDeltaHours).toFixed(0)}mph)`
    );

    return {
      latitude: lastLocation.latitude,
      longitude: lastLocation.longitude,
      accuracy: assessAccuracy(lastLocation.accuracy, lastLocation.source),
      source: lastLocation.source,
      distanceFromLast: 0,
      isValid: false,
      reason: `Impossible speed: ${(distance / timeDeltaHours).toFixed(0)}mph (max: ${maxReasonableSpeed}mph)`,
      timestamp,
    };
  }

  return {
    latitude: newLocation.latitude,
    longitude: newLocation.longitude,
    accuracy: assessAccuracy(newLocation.accuracy, newLocation.source),
    source: newLocation.source,
    distanceFromLast: distance,
    isValid: true,
    timestamp,
  };
}

/**
 * Assess location accuracy based on source and error margin
 */
function assessAccuracy(
  accuracyMeters: number,
  source: LocationSource
): LocationAccuracy {
  // GPS with good accuracy
  if (source === "gps" && accuracyMeters < 20) return "high";

  // GPS or WiFi with acceptable accuracy
  if (accuracyMeters < 50) return "high";
  if (accuracyMeters < 100) return "medium";

  // WiFi triangulation or cellular
  if (source === "wifi" && accuracyMeters < 100) return "medium";
  if (source === "cellular") return "low";

  return "low";
}

/**
 * Determine location update frequency based on conditions
 * Optimizes for battery life while maintaining accuracy
 */
export function getUpdateInterval(options: {
  jobState: "idle" | "live" | "heading" | "on_site" | "complete";
  batteryLevel: number; // 0-100
  signalStrength: "strong" | "medium" | "weak";
  locationAccuracy: LocationAccuracy;
}): number {
  // No updates when inactive
  if (options.jobState === "idle" || options.jobState === "complete") {
    return 0; // Stop tracking
  }

  // Live but not heading (waiting for job to be accepted)
  if (options.jobState === "live") {
    return 60_000; // 60 sec (low power, just for matching)
  }

  // Actively heading to job (homeowner watching)
  if (options.jobState === "heading") {
    // Battery critical
    if (options.batteryLevel < 15) {
      return 30_000; // 30 sec (save battery)
    }

    // Signal weak
    if (options.signalStrength === "weak") {
      return 20_000; // 20 sec (reduce data usage)
    }

    // Normal conditions
    return 5_000; // 5 sec (smooth tracking)
  }

  // On-site (stop sharing)
  if (options.jobState === "on_site") {
    return 0; // Stop tracking immediately
  }

  return 5_000; // Default
}

/**
 * Haversine formula: calculate distance between two lat/lon points
 * Returns distance in miles
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate ETA given distance and average speed
 * Returns minutes
 */
export function calculateETA(distanceMiles: number, avgSpeedMph: number = 30): number {
  if (avgSpeedMph <= 0) return 0;
  const hours = distanceMiles / avgSpeedMph;
  return Math.ceil(hours * 60);
}

/**
 * Determine if contractor has "arrived" at destination
 * Uses geofence (circle around destination address)
 */
export function hasArrived(
  contractorLat: number,
  contractorLon: number,
  destinationLat: number,
  destinationLon: number,
  geofenceRadiusMiles: number = 0.2 // ~300 feet
): boolean {
  const distance = haversineDistance(
    contractorLat,
    contractorLon,
    destinationLat,
    destinationLon
  );

  return distance <= geofenceRadiusMiles;
}

/**
 * Format location accuracy for UI display
 */
export function formatAccuracy(accuracy: LocationAccuracy): string {
  switch (accuracy) {
    case "high":
      return "Exact location (GPS)";
    case "medium":
      return "Approximate area (±50m)";
    case "low":
      return "General area (±200m)";
  }
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return "Arriving now";
  if (miles < 1) return `${(miles * 5280).toFixed(0)} feet`;
  return `${miles.toFixed(1)} miles`;
}
