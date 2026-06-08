/**
 * mapsIntegration.ts
 * Builds deep-link URLs that open Google Maps or Apple Maps with turn-by-turn
 * navigation to a destination.  Works on iOS, Android, and desktop.
 */

export interface LatLng { lat: number; lng: number }

/** Detect iOS (iPhone/iPad) at runtime */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Build a Google Maps directions URL.
 * Works on all platforms; opens the Maps app on Android.
 */
export function googleMapsUrl(destination: LatLng | string): string {
  const dest =
    typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

/**
 * Build an Apple Maps URL.
 * Uses the `maps://` scheme on iOS; falls back to `https://maps.apple.com` on web.
 */
export function appleMapsUrl(destination: LatLng | string): string {
  const dest =
    typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.lat},${destination.lng}`;
  const scheme = isIOS() ? 'maps://' : 'https://maps.apple.com/';
  return `${scheme}?daddr=${dest}&dirflg=d`;
}

/**
 * Returns the platform-appropriate directions URL.
 * - iOS  → Apple Maps (native app)
 * - Else → Google Maps
 */
export function directionsUrl(destination: LatLng | string): string {
  return isIOS() ? appleMapsUrl(destination) : googleMapsUrl(destination);
}

/**
 * Open directions in the native maps app (or browser tab).
 * Safe to call from any click handler.
 */
export function openDirections(destination: LatLng | string): void {
  window.open(directionsUrl(destination), '_blank', 'noopener,noreferrer');
}

/**
 * Returns a static Google Maps embed src for a preview thumbnail.
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.
 */
export function staticMapUrl(
  center: LatLng,
  zoom = 14,
  size = '400x200',
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { lat, lng } = center;
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=${zoom}&size=${size}` +
    `&markers=color:red|${lat},${lng}` +
    `&key=${apiKey}`
  );
}
