'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader, MapPin } from 'lucide-react';

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        Circle: new (options: any) => any;
        LatLngBounds: new () => any;
        Geocoder: new () => any;
        SymbolPath: { CIRCLE: string };
      };
    };
  }
}

interface ServiceAreaMapProps {
  zipCode?: string;
  radiusMiles: number;
  city?: string;
  state?: string;
  center?: { lat: number; lng: number };
  contractorName?: string;
}

export function ServiceAreaMap({
  zipCode,
  radiusMiles,
  city,
  state,
  center,
  contractorName = 'Contractor',
}: ServiceAreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [centerCoords, setCenterCoords] = useState(center);
  const [isLoading, setIsLoading] = useState(!center);

  useEffect(() => {
    if (center) {
      setCenterCoords(center);
      setIsLoading(false);
      return;
    }

    if (!zipCode || !window.google?.maps?.Geocoder) {
      setIsLoading(false);
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: zipCode }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setCenterCoords({ lat: loc.lat(), lng: loc.lng() });
      }
      setIsLoading(false);
    });
  }, [zipCode, center]);

  useEffect(() => {
    if (!containerRef.current || !centerCoords || !window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        zoom: 11,
        center: centerCoords,
        mapTypeControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });
    }

    mapRef.current.setCenter(centerCoords);

    // Add center marker
    new window.google.maps.Marker({
      position: centerCoords,
      map: mapRef.current,
      title: `${contractorName}'s Service Center`,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#6366f1',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });

    // Draw service area circle
    const radiusInMeters = radiusMiles * 1609.34;
    new window.google.maps.Circle({
      map: mapRef.current,
      center: centerCoords,
      radius: radiusInMeters,
      fillColor: '#6366f1',
      fillOpacity: 0.15,
      strokeColor: '#6366f1',
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });

    // Fit bounds to circle
    const bounds = new window.google.maps.LatLngBounds();
    for (let i = 0; i < 360; i += 10) {
      const radians = (i * Math.PI) / 180;
      const lat =
        centerCoords.lat +
        (radiusInMeters / 6371000) * Math.cos(radians) * (180 / Math.PI);
      const lng =
        centerCoords.lng +
        ((radiusInMeters / 6371000) * Math.sin(radians) * (180 / Math.PI)) /
          Math.cos((centerCoords.lat * Math.PI) / 180);
      bounds.extend({ lat, lng });
    }
    mapRef.current.fitBounds(bounds);
  }, [centerCoords, radiusMiles, contractorName]);

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="w-full h-80 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <Loader className="animate-spin" style={{ color: 'var(--color-text-4)' }} />
        </div>
      ) : centerCoords ? (
        <>
          <div ref={containerRef} className="w-full rounded-lg overflow-hidden"
            style={{ minHeight: '320px', border: '1px solid var(--color-border)' }} />
          <div className="mt-3 flex items-start gap-2 text-sm"
            style={{ color: 'var(--color-text-3)' }}>
            <MapPin size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Service radius: {radiusMiles} miles</p>
              {city && <p style={{ color: 'var(--color-text-4)' }}>{city}{state ? `, ${state}` : ''}</p>}
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-40 rounded-lg flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <MapPin className="mb-2" style={{ color: 'var(--color-text-4)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
            {zipCode ? 'Unable to load map' : 'Service area map unavailable'}
          </p>
        </div>
      )}
    </div>
  );
}
