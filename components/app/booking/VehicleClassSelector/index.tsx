"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

export interface VehicleClassOption {
  id: string;
  name: string;
  capacity: number;
  imageUrl?: string;
  price: number; // NGN
}

export interface VehicleClassSelectorProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onSelect'> {
  routeDetails?: {
    pickup?: { lat?: number; lng?: number } | null;
    dropoff?: { lat?: number; lng?: number } | null;
  } | null;
  selectedId?: string | null;
  onSelect: (option: VehicleClassOption) => void;
}

export default function VehicleClassSelector({ routeDetails, selectedId, onSelect, className, ...props }: VehicleClassSelectorProps) {
  const [options, setOptions] = React.useState<VehicleClassOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!routeDetails?.pickup?.lat || !routeDetails?.pickup?.lng || !routeDetails?.dropoff?.lat || !routeDetails?.dropoff?.lng) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/fares/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickup: routeDetails.pickup,
            dropoff: routeDetails.dropoff,
          })
        });
        if (!res.ok) throw new Error('Failed to fetch fares');
        const data = await res.json();
        setOptions(data.vehicleClasses as VehicleClassOption[]);
      } catch (e: any) {
        console.error(e);
        setError('Unable to load fixed fares.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [routeDetails?.pickup?.lat, routeDetails?.pickup?.lng, routeDetails?.dropoff?.lat, routeDetails?.dropoff?.lng]);

  return (
    <div className={className} {...props}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Select Vehicle Class</h3>
        {loading && <span className="text-xs text-slate-500">Loading…</span>}
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {options.map((o) => {
          const selected = o.id === selectedId;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o)}
              className={[
                'snap-start shrink-0 w-56 text-left rounded-2xl border transition-all duration-200',
                'bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-lg',
                selected ? 'border-[#00529B] ring-2 ring-[#00529B]/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
              ].join(' ')}
            >
              <div className="relative">
                {o.imageUrl ? (
                  <img src={o.imageUrl} alt={o.name} className="h-28 w-full object-cover rounded-t-2xl" />
                ) : (
                  <div className="h-28 w-full rounded-t-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" />
                )}
                {selected && (
                  <CheckCircle2 className="absolute top-2 right-2 h-6 w-6 text-[#00529B] drop-shadow" aria-hidden />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{o.name}</p>
                  <p className="text-[#00529B] font-bold">₦{o.price.toLocaleString()}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Up to {o.capacity} passengers</p>
              </div>
            </button>
          );
        })}
        {options.length === 0 && !loading && (
          <div className="text-sm text-slate-500">Enter pickup and drop-off to see fixed prices.</div>
        )}
      </div>
    </div>
  );
}
