'use client';

import { useState } from 'react';
import { MapPin, Search, AlertCircle } from 'lucide-react';

export type LocationData = {
  address?: string;
  zipcode?: string;
  city?: string;
  state?: string;
  coordinates?: { lat: number; lng: number };
};

type Props = {
  value: LocationData;
  onChange: (location: LocationData) => void;
  required?: boolean;
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function LocationInput({ value, onChange, required }: Props) {
  const [inputMode, setInputMode] = useState<'zipcode' | 'city' | 'address'>('zipcode');
  const [zipcodeInput, setZipcodeInput] = useState(value.zipcode || '');
  const [cityInput, setCityInput] = useState(value.city || '');
  const [stateInput, setStateInput] = useState(value.state || 'TX');
  const [addressInput, setAddressInput] = useState(value.address || '');
  const [error, setError] = useState('');

  const handleZipcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const z = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipcodeInput(z);
    setError('');
    if (z.length === 5) {
      onChange({ ...value, zipcode: z, address: undefined, city: undefined, state: undefined });
    }
  };

  const handleCityStateChange = () => {
    if (!cityInput.trim() || !stateInput) {
      setError('Please enter city and select state');
      return;
    }
    setError('');
    onChange({
      ...value,
      city: cityInput.trim(),
      state: stateInput,
      zipcode: undefined,
      address: undefined,
    });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addr = e.target.value;
    setAddressInput(addr);
    setError('');
    if (addr.trim().length > 10) {
      onChange({ ...value, address: addr.trim(), zipcode: undefined, city: undefined, state: undefined });
    }
  };

  const hasLocation = value.zipcode || (value.city && value.state) || value.address;

  return (
    <div>
      <label className="label">
        Location <span style={{ color: required ? '#f87171' : 'var(--color-text-4)' }}>
          {required ? '*' : '(optional)'}
        </span>
      </label>

      <div className="space-y-3">
        {/* Mode selector */}
        <div className="flex gap-2">
          {(['zipcode', 'city', 'address'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setInputMode(mode);
                setError('');
              }}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                border: inputMode === mode ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid var(--color-border)',
                background: inputMode === mode ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-2)',
                color: inputMode === mode ? '#818cf8' : 'var(--color-text-3)',
              }}
            >
              {mode === 'zipcode' && <span>📮 Zipcode</span>}
              {mode === 'city' && <span>🏙️ City + State</span>}
              {mode === 'address' && <span>📍 Address</span>}
            </button>
          ))}
        </div>

        {/* Zipcode mode */}
        {inputMode === 'zipcode' && (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
              <input
                type="text"
                value={zipcodeInput}
                onChange={handleZipcodeChange}
                placeholder="e.g. 77002"
                maxLength={5}
                className="input pl-9 font-mono text-lg tracking-widest"
                style={{ letterSpacing: '4px' }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-4)' }}>
              Enter your 5-digit ZIP code for accurate matching
            </p>
            {zipcodeInput.length === 5 && (
              <p className="text-xs mt-1" style={{ color: '#34d399' }}>
                ✓ Zipcode accepted
              </p>
            )}
          </div>
        )}

        {/* City + State mode */}
        {inputMode === 'city' && (
          <div className="space-y-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="e.g. Houston"
              className="input"
            />
            <select
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              className="input"
            >
              {US_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCityStateChange}
              disabled={!cityInput.trim() || !stateInput}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: cityInput.trim() && stateInput ? 'rgba(99,102,241,0.2)' : 'var(--color-surface-2)',
                color: cityInput.trim() && stateInput ? '#818cf8' : 'var(--color-text-4)',
                border: '1px solid var(--color-border)',
                cursor: cityInput.trim() && stateInput ? 'pointer' : 'not-allowed',
                opacity: cityInput.trim() && stateInput ? 1 : 0.5,
              }}
            >
              Confirm Location
            </button>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              Note: Zipcode is more precise for contractor matching
            </p>
          </div>
        )}

        {/* Address mode */}
        {inputMode === 'address' && (
          <div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
              <input
                type="text"
                value={addressInput}
                onChange={handleAddressChange}
                placeholder="e.g. 123 Main St, Houston, TX 77002"
                className="input pl-9"
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-4)' }}>
              Enter your street address for precise contractor matching
            </p>
            {addressInput.trim().length > 10 && (
              <p className="text-xs mt-1" style={{ color: '#34d399' }}>
                ✓ Address accepted
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex gap-2" style={{ color: '#f87171' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Summary */}
        {hasLocation && (
          <div
            className="rounded-lg p-3 text-sm"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#34d399',
            }}
          >
            <strong>Location confirmed:</strong>{' '}
            {value.zipcode && `ZIP ${value.zipcode}`}
            {value.city && value.state && `${value.city}, ${value.state}`}
            {value.address && value.address}
          </div>
        )}
      </div>
    </div>
  );
}
