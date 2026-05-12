import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";

interface LocationTrackerOptions {
  jobId?: string;
  onLocationUpdate?: (location: any) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: "gps" | "wifi" | "cellular" | "unknown";
  timestamp: number;
  batteryLevel: number;
  speed: number | null;
}

interface DeviceInfo {
  batteryLevel: number;
  charging: boolean;
}

/**
 * Hook to track contractor location in real-time
 * Handles:
 * - Permission requests
 * - Multi-source location (GPS fallback)
 * - Adaptive update frequency
 * - Battery optimization
 * - Auto-pause when battery low
 */
export function useLocationTracker(options: LocationTrackerOptions) {
  const { user } = useAuth();
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(100);

  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const nextUpdateIntervalRef = useRef<number>(5000); // Start with 5 sec

  // Get device battery level
  const getDeviceBattery = useCallback(async (): Promise<DeviceInfo> => {
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        return {
          batteryLevel: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      }
    } catch {
      // Battery API not available
    }

    // Fallback: try BatteryManager API
    try {
      const manager = await (navigator as any).getBattery?.();
      return {
        batteryLevel: manager ? Math.round(manager.level * 100) : 100,
        charging: manager?.charging || false,
      };
    } catch {
      return { batteryLevel: 100, charging: false };
    }
  }, []);

  // Send location to API
  const sendLocationToServer = useCallback(
    async (loc: LocationState) => {
      if (!user || !options.jobId || paused) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/contractors/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            source: loc.source,
            jobId: options.jobId,
            batteryLevel: loc.batteryLevel,
            speed: loc.speed,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("Location update rejected:", data.reason);
          return;
        }

        const data = await response.json();

        // Update next interval based on server response
        if (data.nextUpdateIntervalMs) {
          nextUpdateIntervalRef.current = data.nextUpdateIntervalMs;
        }

        // Check if arrived
        if (data.arrived) {
          console.log("✅ Contractor arrived - stopping location tracking");
          stopTracking();
        }

        options.onLocationUpdate?.(loc);
      } catch (err: any) {
        console.error("Failed to send location:", err.message);
        setError(err.message);
      }
    },
    [user, options, paused]
  );

  // Get geolocation from device
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    try {
      setTracking(true);
      setError(null);

      // Request high accuracy
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();

          // Get battery info
          const battery = await getDeviceBattery();
          setBatteryLevel(battery.batteryLevel);

          // Auto-pause if battery too low
          if (battery.batteryLevel < 15) {
            setPaused(true);
            console.warn("⚠️ Battery critically low (< 15%), location tracking paused");
            return;
          }

          const newLocation: LocationState = {
            latitude,
            longitude,
            accuracy,
            source: "gps",
            timestamp: now,
            batteryLevel: battery.batteryLevel,
            speed: position.coords.speed || null,
          };

          setLocation(newLocation);

          // Rate limit: don't send more frequently than interval allows
          const timeSinceLastUpdate = now - lastUpdateRef.current;
          if (timeSinceLastUpdate >= nextUpdateIntervalRef.current) {
            sendLocationToServer(newLocation);
            lastUpdateRef.current = now;
          }
        },
        (err) => {
          console.error("Geolocation error:", err.message);
          setError(err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      console.log("✅ Location tracking started");
    } catch (err: any) {
      setError(err.message);
      setTracking(false);
    }
  }, [getDeviceBattery, sendLocationToServer]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setTracking(false);
    console.log("⏹️ Location tracking stopped");
  }, []);

  const pauseTracking = useCallback(() => {
    setPaused(true);
    console.log("⏸️ Location tracking paused");
  }, []);

  const resumeTracking = useCallback(async () => {
    const battery = await getDeviceBattery();
    if (battery.batteryLevel < 15) {
      setError("Battery too low to resume tracking");
      return;
    }
    setPaused(false);
    console.log("▶️ Location tracking resumed");
  }, [getDeviceBattery]);

  // Start/stop based on enabled prop and job
  useEffect(() => {
    if (options.enabled && options.jobId && user && !tracking) {
      startTracking();
    }

    return () => {
      if (tracking) {
        stopTracking();
      }
    };
  }, [options.enabled, options.jobId, user, tracking, startTracking, stopTracking]);

  return {
    tracking,
    paused,
    location,
    error,
    batteryLevel,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
  };
}
