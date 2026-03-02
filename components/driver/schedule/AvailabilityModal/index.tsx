"use client";

import * as React from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { Trash2, Plus } from "lucide-react";

export interface AvailabilityModalProps
  extends React.ComponentPropsWithoutRef<"div"> {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slots: Array<{ start: string; end: string }>) => void;
  selectedDate?: Date | null;
  initialSlots?: Array<{ start: string; end: string }>;
}

interface Slot {
  start: string; // HH:MM (24h)
  end: string; // HH:MM (24h)
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function AvailabilityModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  initialSlots,
  className,
  ...rest
}: AvailabilityModalProps) {
  const [slots, setSlots] = React.useState<Slot[]>([
    { start: "09:00", end: "17:00" },
  ]);

  React.useEffect(() => {
    if (!isOpen) return;
    // Prefill with provided slots for the date if available; fallback to default
    if (
      initialSlots &&
      Array.isArray(initialSlots) &&
      initialSlots.length > 0
    ) {
      setSlots(initialSlots.map((s) => ({ start: s.start, end: s.end })));
    } else {
      setSlots([{ start: "09:00", end: "17:00" }]);
    }
  }, [isOpen, selectedDate, initialSlots]);

  const addSlot = () =>
    setSlots((s) => [...s, { start: "09:00", end: "17:00" }]);
  const removeSlot = (idx: number) =>
    setSlots((s) => s.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, patch: Partial<Slot>) =>
    setSlots((s) => s.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)));

  const isValid = React.useMemo(() => {
    if (!slots.length) return false;
    // basic validation: each start < end, both present
    return slots.every((sl) => !!sl.start && !!sl.end && sl.start < sl.end);
  }, [slots]);

  const dateTitle = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  if (!isOpen) return null;

  return (
    <div className={className} {...rest}>
      <BottomSheet
        topReservePx={72}
        header={
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Set Availability for
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {dateTitle}
              </div>
            </div>
          </div>
        }
        snapPoints={[0.5, 0.75, 0.92]}
        initialSnap={0.75}
      >
        {/* Time Slot Manager */}
        <div className="space-y-3">
          {slots.map((slot, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Start
                  </label>
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => updateSlot(idx, { start: e.target.value })}
                    className="h-10 rounded-md border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-800/70 px-3 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    End
                  </label>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => updateSlot(idx, { end: e.target.value })}
                    className="h-10 rounded-md border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-800/70 px-3 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <button
                type="button"
                aria-label="Remove slot"
                onClick={() => removeSlot(idx)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={addSlot}
            className="w-full h-10 rounded-md text-sm font-semibold bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add another time slot
          </button>
        </div>

        {/* Footer actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={() => onSave(slots)}
            disabled={!isValid}
          >
            Save Availability
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
