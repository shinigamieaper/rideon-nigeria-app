"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ScheduleControls,
  WeeklyCalendar,
  AvailabilityModal,
  AgendaBookingCard,
  StickyBanner,
} from "@/components";
import { auth, waitForUser } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Helpers
function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun,1=Mon,...
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeekFrom(start: Date) {
  const x = new Date(start);
  x.setDate(start.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatWeekRangeDisplay(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  const sMonth = start.toLocaleString(undefined, { month: "short" });
  const eMonth = end.toLocaleString(undefined, { month: "short" });
  return sameMonth
    ? `${sMonth} ${start.getDate()} - ${end.getDate()}`
    : `${sMonth} ${start.getDate()} - ${eMonth} ${end.getDate()}`;
}

async function getToken() {
  if (auth.currentUser) return auth.currentUser.getIdToken();
  const user = await waitForUser(15000);
  return user.getIdToken();
}

async function fetcherAvailability([key, start, end]: [
  string,
  string,
  string,
]) {
  const token = await getToken();
  const res = await fetch(
    `${key}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`Availability fetch failed (${res.status})`);
  return res.json();
}
async function fetcherBookings([key, start, end]: [string, string, string]) {
  const token = await getToken();
  const res = await fetch(
    `${key}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`Bookings fetch failed (${res.status})`);
  return res.json();
}

export default function DriverSchedulePage() {
  const router = useRouter();
  const [accessGranted, setAccessGranted] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<"week" | "agenda">(
    "week",
  );
  const [currentDate, setCurrentDate] = React.useState<Date>(() =>
    startOfWeekMonday(new Date()),
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDateForModal, setSelectedDateForModal] =
    React.useState<Date | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Access control: Verify driver is authenticated (placement track deprecated)
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login?next=/driver/schedule");
        return;
      }
      // All drivers can access schedule - placement track deprecated
      setAccessGranted(true);
    });
    return () => unsub();
  }, [router]);
  const weekStart = React.useMemo(
    () => startOfWeekMonday(currentDate),
    [currentDate],
  );
  const weekEnd = React.useMemo(() => endOfWeekFrom(weekStart), [weekStart]);
  const currentWeekDisplay = React.useMemo(
    () => formatWeekRangeDisplay(weekStart, weekEnd),
    [weekStart, weekEnd],
  );

  const start = ymd(weekStart);
  const end = ymd(weekEnd);

  const {
    data: availData,
    error: availError,
    isLoading: availLoading,
    mutate: mutateAvailability,
  } = useSWR(["/api/driver/availability", start, end], fetcherAvailability);
  const {
    data: bookingsData,
    error: bookingsError,
    isLoading: bookingsLoading,
  } = useSWR(["/api/driver/bookings", start, end], fetcherBookings);

  const bookings = (bookingsData?.bookings as any[]) || [];

  // Compute highlight sets for the weekly calendar
  const availabilityHighlights = React.useMemo(() => {
    const arr: Array<{
      date: string;
      slots: Array<{ start: string; end: string }>;
    }> = (availData?.availability as any[]) || [];
    return new Set(
      arr
        .filter((a) => Array.isArray(a.slots) && a.slots.length > 0)
        .map((a) => a.date),
    );
  }, [availData]);
  const bookingHighlights = React.useMemo(() => {
    return new Set(
      bookings
        .map((b) => {
          const dt = b?.scheduledPickupTime
            ? new Date(b.scheduledPickupTime)
            : null;
          return dt && !isNaN(dt.getTime()) ? ymd(dt) : null;
        })
        .filter(Boolean) as string[],
    );
  }, [bookings]);

  const onNextWeek = () =>
    setCurrentDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7),
    );
  const onPrevWeek = () =>
    setCurrentDate(
      (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7),
    );

  // Compute initial slots for the modal (must be before any conditional returns)
  const initialSlots = React.useMemo(() => {
    if (!selectedDateForModal) return undefined;
    const dateKey = ymd(selectedDateForModal);
    const arr: Array<{
      date: string;
      slots: Array<{ start: string; end: string }>;
    }> = (availData?.availability as any[]) || [];
    const hit = arr.find((a) => a.date === dateKey);
    return hit?.slots && Array.isArray(hit.slots) ? hit.slots : undefined;
  }, [selectedDateForModal, availData]);

  const handleDayClick = (date: Date) => {
    setSaveError(null);
    setSelectedDateForModal(date);
    setIsModalOpen(true);
  };

  const handleSaveAvailability = async (
    slots: Array<{ start: string; end: string }>,
  ) => {
    if (!selectedDateForModal) return;
    const token = await getToken();
    const res = await fetch("/api/driver/availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ date: ymd(selectedDateForModal), slots }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("Failed to save availability", msg);
      setSaveError("Failed to save availability. Please try again.");
      return;
    }
    await mutateAvailability();
    setIsModalOpen(false);
    setSaveError(null);
  };

  if (!accessGranted) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-24">
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Verifying access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Error/info banner */}
      {(saveError || availError || bookingsError) && (
        <StickyBanner className="top-2">
          <div className="max-w-4xl w-full">
            <div className="mx-auto rounded-xl border border-red-200/70 dark:border-red-800/60 bg-red-50/80 dark:bg-red-900/30 px-4 py-2 text-sm text-red-800 dark:text-red-200 shadow">
              {saveError ||
                (availError
                  ? "There was a problem loading your availability."
                  : null) ||
                (bookingsError
                  ? "There was a problem loading your bookings."
                  : null)}
            </div>
          </div>
        </StickyBanner>
      )}

      <ScheduleControls
        currentView={currentView}
        onViewChange={setCurrentView}
        currentWeekDisplay={currentWeekDisplay}
        onNextWeek={onNextWeek}
        onPrevWeek={onPrevWeek}
        className="mt-6"
      />

      {currentView === "week" ? (
        <div className="mt-6">
          <WeeklyCalendar
            weekStart={weekStart}
            onDayClick={handleDayClick}
            availabilityDates={availabilityHighlights}
            bookingDates={bookingHighlights}
            selectedDate={selectedDateForModal}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00529B]" />
              <span>Availability set</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Has booking</span>
            </div>
          </div>
          {(availLoading || bookingsLoading) && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-16 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
              <div className="h-16 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
              <div className="h-16 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
            </div>
          )}
          {(availError || bookingsError) && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 text-red-700 px-4 py-3">
              There was a problem loading your schedule. Please try again.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookingsLoading && (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 h-20 animate-pulse" />
          )}
          {!bookingsLoading && bookings.length === 0 && (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-6 text-sm text-slate-600 dark:text-slate-300">
              No bookings this week.
            </div>
          )}
          {bookings.map((b) => (
            <AgendaBookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}

      <AvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAvailability}
        selectedDate={selectedDateForModal}
        initialSlots={initialSlots}
      />
    </main>
  );
}
