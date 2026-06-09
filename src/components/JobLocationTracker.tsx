'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Cloud, CloudRain, CloudSnow, X, CheckCircle2, LogOut, AlertCircle } from 'lucide-react';

export type JobLocation = {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

type WeatherData = {
  main: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  description: string;
};

type TripStats = {
  distanceMiles: number;
  durationMinutes: number;
  avgSpeed: number;
  maxSpeed: number;
  arrivalTime?: number;
  departureTime?: number;
};

type Notification = {
  id: string;
  type: 'arrival' | 'departure' | 'info';
  message: string;
  timestamp: number;
};

type TripEvent = {
  id: string;
  type: 'arrival' | 'departure' | 'milestone';
  message: string;
  timestamp: number;
  distance?: number;
  duration?: number;
};

type Props = {
  jobId: string;
  isContractor: boolean;
  isActive: boolean;
  customerAddress?: string;
  contractorName?: string;
  contractorLocation?: JobLocation;
  customerLocation?: { lat: number; lng: number };
  onLocationUpdate?: (location: JobLocation) => void;
};

const GEOFENCE_RADIUS_MILES = 0.5; // Job location radius

export default function JobLocationTracker({
  jobId,
  isContractor,
  isActive,
  customerAddress,
  contractorName,
  contractorLocation,
  customerLocation,
  onLocationUpdate,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [userLocation, setUserLocation] = useState<JobLocation | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [eta, setEta] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<JobLocation[]>([]);
  const [tripStats, setTripStats] = useState<TripStats>({
    distanceMiles: 0,
    durationMinutes: 0,
    avgSpeed: 0,
    maxSpeed: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tripEvents, setTripEvents] = useState<TripEvent[]>([]);
  const [hasArrived, setHasArrived] = useState(false);
  const [arrivedTime, setArrivedTime] = useState<number | null>(null);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastNotificationTime = useRef<number>(0);

  // Calculate distance between two points
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Check if contractor is within geofence
  const isWithinGeofence = (currentLoc: JobLocation): boolean => {
    if (!customerLocation) return false;
    const distance = haversineDistance(
      currentLoc.lat,
      currentLoc.lng,
      customerLocation.lat,
      customerLocation.lng
    );
    return distance <= GEOFENCE_RADIUS_MILES;
  };

  // Add notification
  const addNotification = (type: Notification['type'], message: string) => {
    const now = Date.now();
    if (now - lastNotificationTime.current < 3000) return; // Debounce
    lastNotificationTime.current = now;

    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message, timestamp: now }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  // Calculate trip statistics
  const calculateTripStats = (history: JobLocation[]) => {
    if (history.length < 2) return;

    let totalDistance = 0;
    let maxSpeed = 0;

    for (let i = 1; i < history.length; i++) {
      const dist = haversineDistance(
        history[i - 1].lat,
        history[i - 1].lng,
        history[i].lat,
        history[i].lng
      );
      totalDistance += dist;

      if (history[i].speed) {
        maxSpeed = Math.max(maxSpeed, history[i].speed || 0);
      }
    }

    const durationMs = history[history.length - 1].timestamp - history[0].timestamp;
    const durationMinutes = durationMs / 1000 / 60;
    const avgSpeed = durationMinutes > 0 ? (totalDistance / durationMinutes) * 60 : 0;

    setTripStats({
      distanceMiles: totalDistance,
      durationMinutes,
      avgSpeed,
      maxSpeed,
      arrivalTime: arrivedTime ?? undefined,
    });
  };

  // Get weather data
  const fetchWeather = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code,temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit`
      );
      const data = await res.json();
      const current = data.current;

      // Convert WMO weather code to description
      const weatherMap: { [key: number]: string } = {
        0: 'Clear',
        1: 'Mostly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Heavy Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Slight Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        80: 'Slight Rain Showers',
        81: 'Moderate Rain Showers',
        82: 'Violent Rain Showers',
      };

      const description = weatherMap[current.weather_code] || 'Unknown';
      const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(current.weather_code);
      const isSnowing = [71, 73, 75].includes(current.weather_code);

      setWeather({
        main: isSnowing ? 'Snow' : isRaining ? 'Rain' : 'Clear',
        temp: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        description,
      });
    } catch (err) {
      console.error('Weather fetch failed:', err);
    }
  };

  // Start/stop location tracking
  const toggleLocationSharing = () => {
    if (!locationEnabled) {
      if (navigator.geolocation) {
        setLocationHistory([]);
        setHasArrived(false);
        setArrivedTime(null);
        setNotifications([]);

        watchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const loc: JobLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(),
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
            };

            setUserLocation(loc);
            fetchWeather(loc.lat, loc.lng);
            onLocationUpdate?.(loc);

            // Update location history and stats
            setLocationHistory(prev => [...prev, loc]);

            // Check geofence for arrival/departure
            if (isContractor && customerLocation) {
              const withinGeofence = isWithinGeofence(loc);
              if (withinGeofence && !hasArrived) {
                setHasArrived(true);
                setArrivedTime(loc.timestamp);
                addNotification('arrival', 'You arrived at job location');
                setTripEvents(prev => [...prev, {
                  id: Math.random().toString(36).substr(2, 9),
                  type: 'arrival',
                  message: 'Arrived at job location',
                  timestamp: loc.timestamp,
                }]);
              } else if (!withinGeofence && hasArrived) {
                setHasArrived(false);
                addNotification('departure', 'You left job location');
                setTripEvents(prev => [...prev, {
                  id: Math.random().toString(36).substr(2, 9),
                  type: 'departure',
                  message: 'Left job location',
                  timestamp: loc.timestamp,
                }]);
              }
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to access location. Please enable location services.');
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        setLocationEnabled(true);
      }
    } else {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setLocationEnabled(false);
    }
  };

  // Calculate ETA (rough estimate)
  const calculateETA = (from: JobLocation, to: { lat: number; lng: number }) => {
    const distance = haversineDistance(from.lat, from.lng, to.lat, to.lng);
    // Assume average speed of 30 mph for rough ETA
    const minutes = Math.round((distance / 30) * 60);
    if (minutes < 1) return 'Arriving now';
    return `${minutes} min away`;
  };

  // Update ETA and trip stats when location changes
  useEffect(() => {
    if (contractorLocation && customerLocation) {
      setEta(calculateETA(contractorLocation, customerLocation));
    }
    if (locationHistory.length > 0) {
      calculateTripStats(locationHistory);
    }
  }, [contractorLocation, customerLocation, locationHistory]);

  // Open in native maps
  const openInMaps = (lat: number, lng: number, label?: string) => {
    const mapsUrl = `https://maps.google.com/maps?q=${lat},${lng}`;
    const appleMapsUrl = `maps://maps.apple.com/?q=${label || ''}&ll=${lat},${lng}`;

    // Try to detect if Apple Maps should be used (iOS)
    if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
      window.location.href = appleMapsUrl;
    } else {
      window.open(mapsUrl, '_blank');
    }
  };

  if (!isActive) {
    return (
      <div className="card p-4 text-center" style={{ background: 'var(--color-surface-2)' }}>
        <p style={{ color: 'var(--color-text-4)' }} className="text-sm">
          Location tracking will be available once the job is assigned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle Location Sharing */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {isContractor ? 'Share Your Location' : 'Contractor Location'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
              {locationEnabled
                ? isContractor
                  ? 'Your location is being shared'
                  : 'Contractor location is being tracked'
                : isContractor
                  ? 'Enable to let customer track your arrival'
                  : 'Enable to see contractor'}
            </p>
          </div>
          <button
            onClick={toggleLocationSharing}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
            style={{
              background: locationEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
              color: locationEnabled ? '#34d399' : '#818cf8',
              border: locationEnabled ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {locationEnabled ? '✓ Active' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Map View */}
      {(locationEnabled || contractorLocation) && (
        <div
          className="card overflow-hidden"
          style={{ background: 'var(--color-surface)' }}
        >
          {/* Map Container */}
          <div
            ref={mapContainer}
            className="w-full h-80 bg-gradient-to-br from-blue-900 to-blue-800 relative"
          >
            {/* Placeholder Map - Shows contractor/customer locations */}
            {contractorLocation && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 400 320"
                  style={{ background: '#1e3a5f' }}
                >
                  {/* Background */}
                  <defs>
                    <radialGradient id="mapGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.1 }} />
                      <stop offset="100%" style={{ stopColor: '#1e40af', stopOpacity: 0 }} />
                    </radialGradient>
                  </defs>

                  {/* Grid background */}
                  <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="320" />
                    ))}
                    {Array.from({ length: 4 }).map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 80} x2="400" y2={i * 80} />
                    ))}
                  </g>

                  {/* Geofence zone around customer location */}
                  {customerLocation && (
                    <g>
                      <circle
                        cx="320"
                        cy="160"
                        r="40"
                        fill="rgba(34, 197, 94, 0.05)"
                        stroke="rgba(34, 197, 94, 0.3)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                      <text
                        x="320"
                        y="210"
                        textAnchor="middle"
                        fill="rgba(34, 197, 94, 0.6)"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        Job Zone
                      </text>
                    </g>
                  )}

                  {/* Route path (location history) */}
                  {locationHistory.length > 1 && (
                    <g>
                      <polyline
                        points={locationHistory
                          .slice(-10)
                          .map((_, i) => `${80 + i * 5},${160 - Math.sin(i) * 10}`)
                          .join(' ')}
                        fill="none"
                        stroke="rgba(99, 102, 241, 0.4)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* Customer location */}
                  {customerLocation && (
                    <g>
                      {/* Pulse effect */}
                      <circle
                        cx="320"
                        cy="160"
                        r="20"
                        fill="rgba(168, 85, 247, 0.2)"
                        style={{ animation: 'pulse 2s infinite' }}
                      />
                      {/* Location pin */}
                      <circle cx="320" cy="160" r="8" fill="#a855f7" />
                      <circle cx="320" cy="160" r="4" fill="#fff" />
                      <text
                        x="320"
                        y="130"
                        textAnchor="middle"
                        fill="#a855f7"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        Customer
                      </text>
                    </g>
                  )}

                  {/* Contractor location with car icon */}
                  <g>
                    {/* Direction indicator */}
                    <line
                      x1="80"
                      y1="160"
                      x2="80"
                      y2="100"
                      stroke="#34d399"
                      strokeWidth="2"
                      opacity="0.5"
                    />

                    {/* Car icon */}
                    <g transform={`translate(80, 160) rotate(${contractorLocation?.heading || 0})`}>
                      <rect x="-12" y="-8" width="24" height="16" fill="#34d399" rx="2" />
                      <circle cx="-8" cy="10" r="4" fill="#1f2937" />
                      <circle cx="8" cy="10" r="4" fill="#1f2937" />
                      <rect x="-10" y="-6" width="8" height="6" fill="#60a5fa" opacity="0.7" />
                    </g>

                    {/* Contractor label */}
                    <text
                      x="80"
                      y="125"
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      You
                    </text>

                    {/* ETA label */}
                    {eta && !hasArrived && (
                      <text
                        x="80"
                        y="200"
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize="13"
                        fontWeight="bold"
                      >
                        {eta}
                      </text>
                    )}

                    {/* Arrival indicator */}
                    {hasArrived && (
                      <text
                        x="80"
                        y="200"
                        textAnchor="middle"
                        fill="#22c55e"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        ✓ Arrived
                      </text>
                    )}
                  </g>

                  {/* Weather overlay if raining/snowing */}
                  {weather?.main === 'Rain' && (
                    <g opacity="0.3">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <line
                          key={`rain${i}`}
                          x1={Math.random() * 400}
                          y1={Math.random() * 320}
                          x2={Math.random() * 400}
                          y2={(Math.random() * 320) + 20}
                          stroke="#93c5fd"
                          strokeWidth="1"
                          style={{
                            animation: `rain${i % 3} 1s linear infinite`,
                          }}
                        />
                      ))}
                    </g>
                  )}

                  {weather?.main === 'Snow' && (
                    <g opacity="0.4">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <circle
                          key={`snow${i}`}
                          cx={Math.random() * 400}
                          cy={Math.random() * 320}
                          r="2"
                          fill="#f0f9ff"
                          style={{
                            animation: `snowfall${i % 3} 3s linear infinite`,
                          }}
                        />
                      ))}
                    </g>
                  )}
                </svg>

                {/* Animation styles */}
                <style>{`
                  @keyframes pulse {
                    0%, 100% { r: 20; opacity: 0.4; }
                    50% { r: 30; opacity: 0.1; }
                  }
                  @keyframes rain0 { to { transform: translateY(320px); } }
                  @keyframes rain1 { to { transform: translateY(300px); } }
                  @keyframes rain2 { to { transform: translateY(340px); } }
                  @keyframes snowfall0 { to { transform: translateY(320px) translateX(20px); } }
                  @keyframes snowfall1 { to { transform: translateY(320px) translateX(-20px); } }
                  @keyframes snowfall2 { to { transform: translateY(320px); } }
                `}</style>
              </div>
            )}
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="p-3 space-y-2">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className="px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-all"
                  style={{
                    background: notif.type === 'arrival'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : notif.type === 'departure'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                    color: notif.type === 'arrival'
                      ? '#22c55e'
                      : notif.type === 'departure'
                        ? '#ef4444'
                        : '#818cf8',
                  }}
                >
                  {notif.type === 'arrival' && <CheckCircle2 size={16} />}
                  {notif.type === 'departure' && <LogOut size={16} />}
                  {notif.type === 'info' && <AlertCircle size={16} />}
                  <span>{notif.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Address & Trip Info */}
          <div
            className="p-4 space-y-4"
            style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}
          >
            {/* Addresses */}
            <div className="space-y-2">
              {customerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} style={{ color: '#a855f7', marginTop: '2px', flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-4)' }}>
                      Job Location
                    </p>
                    <p className="text-sm font-medium break-words" style={{ color: 'var(--color-text)' }}>
                      {customerAddress}
                    </p>
                  </div>
                </div>
              )}

              {isContractor && customerAddress && (
                <button
                  onClick={() => {
                    alert('Open customer address in Maps:\n' + customerAddress);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  📍 Navigate to Customer Address
                </button>
              )}

              {!isContractor && contractorLocation && (
                <button
                  onClick={() =>
                    openInMaps(contractorLocation.lat, contractorLocation.lng, contractorName || 'Contractor')
                  }
                  className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  🗺️ Track Contractor Location
                </button>
              )}
            </div>

            {/* Trip Statistics */}
            {locationEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Distance</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {tripStats.distanceMiles.toFixed(1)} mi
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Duration</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {Math.round(tripStats.durationMinutes)} min
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Avg Speed</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {tripStats.avgSpeed.toFixed(0)} mph
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Max Speed</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {tripStats.maxSpeed.toFixed(0)} mph
                  </p>
                </div>
              </div>
            )}

            {/* Weather */}
            {weather && (
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                <div className="flex items-center gap-2">
                  {weather.main === 'Rain' && <CloudRain className="w-4 h-4" style={{ color: '#60a5fa' }} />}
                  {weather.main === 'Snow' && <CloudSnow className="w-4 h-4" style={{ color: '#f0f9ff' }} />}
                  {weather.main === 'Clear' && <Cloud className="w-4 h-4" style={{ color: '#fbbf24' }} />}
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {weather.temp}°F · {weather.description}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                      {weather.humidity}% humidity
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trip History Button */}
            {tripEvents.length > 0 && (
              <button
                onClick={() => setShowTripHistory(!showTripHistory)}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                {showTripHistory ? '▼ Hide' : '▶ Show'} Trip History ({tripEvents.length})
              </button>
            )}

            {/* Accuracy Info */}
            {userLocation && (
              <div className="text-xs space-y-1" style={{ color: 'var(--color-text-4)' }}>
                <p>📍 Accuracy: ±{userLocation.accuracy ? Math.round(userLocation.accuracy) : '?'} meters</p>
                {userLocation.speed && <p>🚗 Current Speed: {Math.round(userLocation.speed * 2.237)} mph</p>}
                {arrivedTime && (
                  <p>✓ Arrived: {new Date(arrivedTime).toLocaleTimeString()}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trip History Drawer */}
      {showTripHistory && tripEvents.length > 0 && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowTripHistory(false)}
        >
          <div
            className="w-full max-w-md max-h-96 rounded-2xl p-4 space-y-3 overflow-y-auto"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>
                Trip Timeline
              </h3>
              <button
                onClick={() => setShowTripHistory(false)}
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-4)' }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {tripEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-2 rounded-lg flex items-start gap-2"
                  style={{
                    background: 'var(--color-bg)',
                    borderLeft: event.type === 'arrival'
                      ? '3px solid #22c55e'
                      : event.type === 'departure'
                        ? '3px solid #ef4444'
                        : '3px solid #818cf8',
                  }}
                >
                  <span className="text-xl flex-shrink-0">
                    {event.type === 'arrival' ? '✓' : event.type === 'departure' ? '✕' : '•'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      {event.message}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                    {event.distance !== undefined && (
                      <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                        {event.distance.toFixed(1)} mi · {Math.round(event.duration || 0)} min
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
