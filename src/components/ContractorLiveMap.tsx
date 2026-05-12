'use client';

import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation, Battery, Wifi, Signal, AlertCircle } from 'lucide-react';
import { useContractorLocation } from '@/hooks/useContractorLocation';

interface ContractorLiveMapProps {
  jobId: string;
  destinationLat?: number;
  destinationLng?: number;
  contractorName?: string;
}

/**
 * Live map showing contractor's real-time location
 * Features:
 * - Contractor pin with live indicator
 * - Destination pin (home location)
 * - ETA display
 * - Signal strength indicator
 * - Battery level
 * - Auto-refresh as location updates
 */
export function ContractorLiveMap({
  jobId,
  destinationLat,
  destinationLng,
  contractorName = "Contractor",
}: ContractorLiveMapProps) {
  const { location, eta, distance, accuracy, loading, error, isLive } =
    useContractorLocation(jobId);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const contractorMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  // Initialize Google Map
  useEffect(() => {
    if (
      !mapContainerRef.current ||
      !location ||
      typeof window === 'undefined'
    ) {
      return;
    }

    // Load Google Maps if not already loaded
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCd9xUCRglVct05MQHzCEAZamrTS-79zzM'}`;
      script.async = true;
      script.onload = () => initializeMap();
      document.head.appendChild(script);
      return;
    }

    initializeMap();
  }, [location]);

  const initializeMap = () => {
    if (!mapContainerRef.current || !location) return;

    const google = (window as any).google ?? {};
    if (!google) return;

    // Initialize map centered on contractor
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        zoom: 14,
        center: { lat: location.latitude, lng: location.longitude },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    } else {
      mapRef.current.setCenter({
        lat: location.latitude,
        lng: location.longitude,
      });
    }

    // Update contractor marker
    if (contractorMarkerRef.current) {
      contractorMarkerRef.current.setPosition({
        lat: location.latitude,
        lng: location.longitude,
      });
    } else {
      contractorMarkerRef.current = new google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: mapRef.current,
        title: contractorName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#1e40af',
          strokeWeight: 2,
        },
      });
    }

    // Add destination marker if provided
    if (destinationLat && destinationLng) {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setPosition({
          lat: destinationLat,
          lng: destinationLng,
        });
      } else {
        destinationMarkerRef.current = new google.maps.Marker({
          position: { lat: destinationLat, lng: destinationLng },
          map: mapRef.current,
          title: 'Destination',
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#047857',
            strokeWeight: 2,
          },
        });
      }

      // Fit both markers in view
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: location.latitude, lng: location.longitude });
      bounds.extend({ lat: destinationLat, lng: destinationLng });
      mapRef.current.fitBounds(bounds, 100);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-lg overflow-hidden border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: 'var(--color-text-4)' }}>Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg overflow-hidden border p-4"
        style={{
          background: 'rgba(239,68,68,0.08)',
          borderColor: 'rgba(239,68,68,0.3)',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div
        className="rounded-lg overflow-hidden border p-6"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          textAlign: 'center',
        }}
      >
        <MapPin size={32} style={{ color: 'var(--color-text-4)', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--color-text-3)', fontSize: '14px' }}>
          Waiting for contractor location...
        </p>
      </div>
    );
  }

  // Get signal strength from accuracy
  const signalStrength =
    location.accuracy === 'high' ? 'strong' : location.accuracy === 'medium' ? 'medium' : 'weak';
  const signalIcon =
    signalStrength === 'strong'
      ? '▓▓▓'
      : signalStrength === 'medium'
        ? '▓▓░'
        : '▓░░';

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height: '320px', width: '100%' }} />

      {/* Info Bar */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--color-border)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '12px',
        }}
      >
        {/* Live Indicator */}
        <div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-4)', marginBottom: '4px' }}>
            STATUS
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isLive ? '#10b981' : '#9ca3af',
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              {isLive ? 'Live' : 'Updated'}
            </span>
          </div>
        </div>

        {/* Distance & ETA */}
        <div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-4)', marginBottom: '4px' }}>
            ETA
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={14} style={{ color: 'var(--color-brand)' }} />
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              {eta} min
            </span>
          </div>
        </div>

        {/* Battery */}
        <div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-4)', marginBottom: '4px' }}>
            BATTERY
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Battery
              size={14}
              style={{
                color:
                  location.batteryLevel > 50
                    ? '#10b981'
                    : location.batteryLevel > 20
                      ? '#f59e0b'
                      : '#ef4444',
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              {location.batteryLevel}%
            </span>
          </div>
        </div>

        {/* Signal Strength */}
        <div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-4)', marginBottom: '4px' }}>
            SIGNAL
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wifi size={14} style={{ color: 'var(--color-brand)' }} />
            <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              {signalStrength === 'strong' ? 'Strong' : signalStrength === 'medium' ? 'Medium' : 'Weak'}
            </span>
          </div>
        </div>
      </div>

      {/* Distance & Accuracy Footer */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--color-surface-2)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}
      >
        <span style={{ color: 'var(--color-text-3)' }}>📍 {distance}</span>
        <span style={{ color: 'var(--color-text-4)' }}>Accuracy: {accuracy}</span>
      </div>
    </div>
  );
}
