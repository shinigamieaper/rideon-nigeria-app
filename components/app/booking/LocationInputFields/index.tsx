"use client";

import * as React from "react";
import { MapPin, Navigation } from "lucide-react";
import Input from "@/components/ui/Input";

export interface LocationValue {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface LocationInputFieldsProps extends React.ComponentPropsWithoutRef<'div'> {
  pickup: LocationValue | null;
  dropoff: LocationValue | null;
  onPickupChange?: (text: string) => void;
  onDropoffChange?: (text: string) => void;
  onPickupSelect: (loc: LocationValue) => void;
  onDropoffSelect: (loc: LocationValue) => void;
}

// Dynamically load Google Maps Places script if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is provided
function useGooglePlaces() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return; // gracefully degrade when key absent

    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      setReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places]');
    if (existing) {
      existing.addEventListener('load', () => setReady(true));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    script.async = true;
    script.dataset.googlePlaces = 'true';
    script.addEventListener('load', () => setReady(true));
    document.body.appendChild(script);
  }, []);

  return ready;
}

interface Suggestion {
  description: string;
  place_id: string;
}

export default function LocationInputFields({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onPickupSelect,
  onDropoffSelect,
  className,
  ...props
}: LocationInputFieldsProps) {
  const ready = useGooglePlaces();
  const [pickupText, setPickupText] = React.useState(pickup?.address ?? "");
  const [dropoffText, setDropoffText] = React.useState(dropoff?.address ?? "");
  const [pickupSugs, setPickupSugs] = React.useState<Suggestion[]>([]);
  const [dropoffSugs, setDropoffSugs] = React.useState<Suggestion[]>([]);
  const [active, setActive] = React.useState<'pickup' | 'dropoff' | null>(null);

  React.useEffect(() => setPickupText(pickup?.address ?? ""), [pickup?.address]);
  React.useEffect(() => setDropoffText(dropoff?.address ?? ""), [dropoff?.address]);

  // Debounced query to Google Places AutocompleteService
  React.useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      if (!ready || !pickupText || active !== 'pickup') return;
      const google = (window as any).google;
      if (!google?.maps?.places) return;
      const svc = new google.maps.places.AutocompleteService();
      svc.getPlacePredictions({ input: pickupText }, (preds: any[] | null) => {
        setPickupSugs((preds ?? []).map((p) => ({ description: p.description, place_id: p.place_id })));
      });
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [pickupText, ready, active]);

  React.useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      if (!ready || !dropoffText || active !== 'dropoff') return;
      const google = (window as any).google;
      if (!google?.maps?.places) return;
      const svc = new google.maps.places.AutocompleteService();
      svc.getPlacePredictions({ input: dropoffText }, (preds: any[] | null) => {
        setDropoffSugs((preds ?? []).map((p) => ({ description: p.description, place_id: p.place_id })));
      });
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [dropoffText, ready, active]);

  const resolvePlace = React.useCallback(async (placeId: string, fallback: string) => {
    const google = (window as any).google;
    if (google?.maps?.places) {
      return new Promise<LocationValue>((resolve) => {
        const dummy = document.createElement('div');
        const svc = new google.maps.places.PlacesService(dummy);
        svc.getDetails({ placeId }, (place: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            const loc = place.geometry?.location;
            resolve({ address: place.formatted_address || fallback, lat: loc?.lat?.(), lng: loc?.lng?.(), placeId });
          } else {
            resolve({ address: fallback, placeId });
          }
        });
      });
    }
    return { address: fallback, placeId } as LocationValue;
  }, []);

  const handlePickupSelect = async (s: Suggestion) => {
    const loc = await resolvePlace(s.place_id, s.description);
    setPickupText(loc.address);
    setPickupSugs([]);
    onPickupSelect(loc);
  };

  const handleDropoffSelect = async (s: Suggestion) => {
    const loc = await resolvePlace(s.place_id, s.description);
    setDropoffText(loc.address);
    setDropoffSugs([]);
    onDropoffSelect(loc);
  };

  return (
    <div className={className} {...props}>
      {/* Pickup */}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Pickup Location</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          value={pickupText}
          onChange={(e) => {
            setPickupText(e.target.value);
            onPickupChange?.(e.target.value);
          }}
          onFocus={() => setActive('pickup')}
          onBlur={() => setTimeout(() => setActive(null), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && pickupText.trim()) {
              e.preventDefault();
              onPickupSelect({ address: pickupText.trim() });
              setPickupSugs([]);
            }
          }}
          placeholder="Enter pickup address"
          className="pl-10"
        />
        {active === 'pickup' && pickupSugs.length > 0 && (
          <ul className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-56 overflow-auto">
            {pickupSugs.map((s) => (
              <li
                key={s.place_id}
                className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePickupSelect(s)}
              >
                {s.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dropoff */}
      <label className="block mt-4 text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Drop-off Location</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Navigation className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          value={dropoffText}
          onChange={(e) => {
            setDropoffText(e.target.value);
            onDropoffChange?.(e.target.value);
          }}
          onFocus={() => setActive('dropoff')}
          onBlur={() => setTimeout(() => setActive(null), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && dropoffText.trim()) {
              e.preventDefault();
              onDropoffSelect({ address: dropoffText.trim() });
              setDropoffSugs([]);
            }
          }}
          placeholder="Enter drop-off address"
          className="pl-10"
        />
        {active === 'dropoff' && dropoffSugs.length > 0 && (
          <ul className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-56 overflow-auto">
            {dropoffSugs.map((s) => (
              <li
                key={s.place_id}
                className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleDropoffSelect(s)}
              >
                {s.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
