import Link from "next/link";
import { ReservationDetailClient } from "@/components";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trimmedId = (id || "").trim();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/app/reservations" className="hover:underline">
            Back to Reservations
          </Link>
        </div>
        <ReservationDetailClient reservationId={trimmedId} />
      </div>
    </div>
  );
}
