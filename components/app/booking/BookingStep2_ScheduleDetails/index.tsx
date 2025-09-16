"use client";

import * as React from "react";
import Button from "@/components/ui/Button";

export interface ScheduleValue {
  date: string; // yyyy-mm-dd
  time: string; // HH:MM
}

export interface BookingStep2ScheduleDetailsProps extends Omit<React.ComponentPropsWithoutRef<'section'>, 'onChange'> {
  schedule: ScheduleValue;
  notes: string;
  onChange: (value: { schedule?: ScheduleValue; notes?: string }) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function BookingStep2_ScheduleDetails({ schedule, notes, onChange, onBack, onNext, className, ...props }: BookingStep2ScheduleDetailsProps) {
  const [nowDate, setNowDate] = React.useState<string>('');
  const [nowTime, setNowTime] = React.useState<string>('');

  React.useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    setNowDate(`${yyyy}-${mm}-${dd}`);
    setNowTime(`${hh}:${mi}`);
  }, []);

  // computed readable display
  const readable = React.useMemo(() => {
    if (!schedule?.date || !schedule?.time) return 'Not set';
    const dt = new Date(`${schedule.date}T${schedule.time}:00`);
    return dt.toLocaleString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [schedule]);

  const isValid = React.useMemo(() => {
    if (!schedule?.date || !schedule?.time) return false;
    const dt = new Date(`${schedule.date}T${schedule.time}:00`);
    return dt.getTime() > Date.now();
  }, [schedule]);

  return (
    <section className={className} {...props}>
      {/* Progress */}
      <p className="text-xs text-slate-500">Step 2 of 3: <span className="font-medium text-slate-800 dark:text-slate-200">Schedule & Details</span></p>

      <div className="mt-3 space-y-2">
        <p className="text-sm text-slate-700 dark:text-slate-200">Selected: <span className="font-medium">{readable}</span></p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Date</label>
            <input
              type="date"
              value={schedule.date}
              min={nowDate}
              onChange={(e) => onChange({ schedule: { ...schedule, date: e.target.value } })}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00529B]/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Time</label>
            <input
              type="time"
              value={schedule.time}
              min={schedule.date === nowDate ? nowTime : undefined}
              onChange={(e) => onChange({ schedule: { ...schedule, time: e.target.value } })}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00529B]/40"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Notes for Driver (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="e.g., 'Use the second gate' or 'Call upon arrival'"
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00529B]/40"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" onClick={onBack}>Back</Button>
        <Button className="w-full" disabled={!isValid} onClick={onNext}>Next: Confirm & Pay</Button>
      </div>
    </section>
  );
}
