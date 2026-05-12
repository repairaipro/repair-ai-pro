import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/db";
import { calculateETA, formatDistance, formatAccuracy } from "@/lib/locationService";

export interface ContractorLocation {
  latitude: number;
  longitude: number;
  accuracy: "high" | "medium" | "low";
  source: string;
  distanceFromLast: number;
  batteryLevel: number;
  speed: number | null;
  timestamp: Date;
}

interface UseContractorLocationReturn {
  location: ContractorLocation | null;
  eta: number | null; // minutes
  distance: string; // formatted
  accuracy: string; // formatted
  loading: boolean;
  error: string | null;
  isLive: boolean;
}

/**
 * Hook to listen to contractor's live location (for homeowner)
 * Subscribes to Firestore real-time updates
 * Auto-unsubscribes when component unmounts
 */
export function useContractorLocation(jobId: string): UseContractorLocationReturn {
  const [location, setLocation] = useState<ContractorLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    try {
      // Subscribe to live location updates
      const locationRef = collection(db, "jobs", jobId, "liveLocation");
      const q = query(locationRef, orderBy("timestamp", "desc"), limit(1));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            setLocation(null);
            setLoading(false);
            return;
          }

          const doc = snapshot.docs[0];
          const data = doc.data() as any;

          // Convert Firestore timestamp to Date
          const timestamp = data.timestamp instanceof Timestamp
            ? data.timestamp.toDate()
            : new Date(data.timestamp);

          const contractorLocation: ContractorLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            source: data.source,
            distanceFromLast: data.distanceFromLast || 0,
            batteryLevel: data.batteryLevel || 100,
            speed: data.speed || null,
            timestamp,
          };

          setLocation(contractorLocation);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error listening to location:", err.message);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [jobId]);

  // Calculate ETA and format distance
  let eta: number | null = null;
  let distance = "";
  let accuracy = "";

  if (location) {
    // Assume average speed of 30 mph in urban area
    eta = calculateETA(location.distanceFromLast, 30);
    distance = formatDistance(location.distanceFromLast);
    accuracy = formatAccuracy(location.accuracy);
  }

  // Location is "live" if updated within last 30 seconds
  const isLive =
    location ? new Date().getTime() - location.timestamp.getTime() < 30_000 : false;

  return {
    location,
    eta,
    distance,
    accuracy,
    loading,
    error,
    isLive,
  };
}
