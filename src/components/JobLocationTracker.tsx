'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Cloud, CloudRain, CloudSnow, X } from 'lucide-react';

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
  const watchId = useRef<number | null>(null);

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
    const R = 3959; // Earth's radius in miles
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Assume average speed of 30 mph for rough ETA
    const minutes = Math.round((distance / 30) * 60);
    if (minutes < 1) return 'Arriving now';
    return `${minutes} min away`;
  };

  // Update ETA when location changes
  useEffect(() => {
    if (contractorLocation && customerLocation) {
      setEta(calculateETA(contractorLocation, customerLocation));
    }
  }, [contractorLocation, customerLocation]);

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

                    {/* ETA label */}
                    {eta && (
                      <text
                        x="80"
                        y="200"
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        {eta}
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

          {/* Weather & Info Bar */}
          <div
            className="p-4 space-y-3"
            style={{ background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}
          >
            {/* Weather */}
            {weather && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {weather.main === 'Rain' && <CloudRain className="w-5 h-5" style={{ color: '#60a5fa' }} />}
                  {weather.main === 'Snow' && <CloudSnow className="w-5 h-5" style={{ color: '#f0f9ff' }} />}
                  {weather.main === 'Clear' && <Cloud className="w-5 h-5" style={{ color: '#fbbf24' }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {weather.temp}°F · {weather.description}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                      {weather.humidity}% humidity
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              {isContractor && customerAddress && (
                <button
                  onClick={() => {
                    // Parse address to get coordinates (simplified)
                    alert('Open customer address in Maps:\n' + customerAddress);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  📍 Customer Address
                </button>
              )}

              {!isContractor && contractorLocation && (
                <button
                  onClick={() =>
                    openInMaps(contractorLocation.lat, contractorLocation.lng, contractorName || 'Contractor')
                  }
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  🗺️ View in Maps
                </button>
              )}

              {userLocation && (
                <button
                  onClick={() => setUserLocation(null)}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Accuracy & Speed Info */}
            {userLocation && (
              <div className="text-xs space-y-1" style={{ color: 'var(--color-text-4)' }}>
                <p>📍 Accuracy: {userLocation.accuracy ? Math.round(userLocation.accuracy) : '?'} meters</p>
                {userLocation.speed && <p>🚗 Speed: {Math.round(userLocation.speed * 2.237)} mph</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
