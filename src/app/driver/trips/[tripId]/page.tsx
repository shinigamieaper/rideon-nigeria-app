import React from "react";
import DriverTripDetailClient from "@/components/driver/TripDetailClient";

interface PageProps {
  params: Promise<{ tripId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tripId } = await params;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DriverTripDetailClient bookingId={tripId} />
    </div>
  );
}
