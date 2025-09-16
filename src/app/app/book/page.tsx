"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import BookingStep1_RouteSelection from '@/components/app/booking/BookingStep1_RouteSelection';
import BookingStep2_ScheduleDetails from '@/components/app/booking/BookingStep2_ScheduleDetails';
import BookingStep3_Confirmation from '@/components/app/booking/BookingStep3_Confirmation';
import BookingLoadingState from '@/components/app/booking/BookingLoadingState';
import BookingErrorState from '@/components/app/booking/BookingErrorState';
import type { LocationValue } from '@/components/app/booking/LocationInputFields';
import type { VehicleClassOption } from '@/components/app/booking/VehicleClassSelector';
import type { PaymentMethod } from '@/components/app/booking/PaymentMethodSelector';
import { auth } from '@/lib/firebase';

export default function Page() {
  const router = useRouter();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [pickup, setPickup] = React.useState<LocationValue | null>(null);
  const [dropoff, setDropoff] = React.useState<LocationValue | null>(null);
  const [vehicle, setVehicle] = React.useState<VehicleClassOption | null>(null);
  const [schedule, setSchedule] = React.useState<{ date: string; time: string }>({ date: '', time: '' });
  const [notes, setNotes] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorOpen, setErrorOpen] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<string | null>(null);

  // Map background: optional decorative route line when coords exist
  const hasCoords = Boolean(pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng);

  const handleBookingSubmit = React.useCallback(async () => {
    if (!pickup || !dropoff || !vehicle || !schedule?.date || !schedule?.time || !paymentMethod) return;

    const baseFare = vehicle.price;
    const taxes = Math.round(baseFare * 0.075);
    const fees = 200;
    const total = baseFare + taxes + fees;

    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup,
          dropoff,
          vehicle,
          schedule,
          notes,
          paymentMethodId: paymentMethod.id,
          fare: { base: baseFare, taxes, fees, total },
        }),
      });

      if (!res.ok) throw new Error('Booking request failed');

      setSnackbar('Success! Your trip is confirmed.');
      setTimeout(() => {
        router.push('/app/trips');
      }, 600);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setErrorOpen(true);
    }
  }, [pickup, dropoff, vehicle, schedule, notes, paymentMethod, router]);

  return (
    <div className="relative min-h-[100dvh] bg-background">
      {/* Background non-interactive map layer */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,82,155,0.12),transparent_40%),radial-gradient(circle_at_80%_40%,rgba(6,182,212,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(255,255,255,0.2))]" />
        {hasCoords && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <circle cx="20" cy="70" r="4" fill="rgba(6,182,212,0.6)" />
            <circle cx="80" cy="30" r="4" fill="rgba(0,82,155,0.7)" />
            <path d="M20,70 C40,40 60,60 80,30" stroke="#00a3ff" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
          </svg>
        )}
      </div>

      {/* Bottom overlay card */}
      <div className="fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Card className="rounded-b-2xl rounded-t-3xl p-5 sm:p-6 bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
            {step === 1 && (
              <BookingStep1_RouteSelection
                pickup={pickup}
                dropoff={dropoff}
                onPickupSelect={setPickup}
                onDropoffSelect={setDropoff}
                selectedVehicle={vehicle}
                onVehicleSelect={setVehicle}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <BookingStep2_ScheduleDetails
                schedule={schedule}
                notes={notes}
                onChange={(v) => {
                  if (v.schedule) setSchedule(v.schedule);
                  if (typeof v.notes === 'string') setNotes(v.notes);
                }}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && pickup && dropoff && vehicle && (
              <BookingStep3_Confirmation
                pickup={pickup}
                dropoff={dropoff}
                vehicle={vehicle}
                schedule={schedule}
                notes={notes}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onBack={() => setStep(2)}
                onConfirm={handleBookingSubmit}
              />
            )}
          </Card>
        </div>
      </div>

      {isLoading && <BookingLoadingState />}

      <BookingErrorState
        isOpen={errorOpen}
        onTryAgain={() => {
          setErrorOpen(false);
          handleBookingSubmit();
        }}
        onChangeMethod={() => {
          setErrorOpen(false);
          setStep(3);
        }}
        onClose={() => setErrorOpen(false)}
      />

      {snackbar && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-20 bg-emerald-600 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {snackbar}
        </div>
      )}
    </div>
  );
}
