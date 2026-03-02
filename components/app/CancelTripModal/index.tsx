"use client";

import * as React from "react";
import { Modal } from "@/components";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export interface CancelTripModalProps
  extends React.ComponentPropsWithoutRef<"div"> {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onCancelled?: () => void;
}

const CANCEL_REASONS = [
  "Change of plans",
  "Driver is late",
  "Incorrect pickup location",
  "Found alternative",
  "Emergency",
  "Price too high",
  "Safety concerns",
  "Other",
];

export default function CancelTripModal({
  isOpen,
  onClose,
  bookingId,
  onCancelled,
  className,
  ...rest
}: CancelTripModalProps) {
  const router = useRouter();
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setReasons([]);
      setNote("");
      setError(null);
    }
  }, [isOpen]);

  function toggleReason(r: string) {
    setReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const token = await user.getIdToken();

      const res = await fetch(
        `/api/trips/${encodeURIComponent(bookingId)}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reasons, note: note.trim() || undefined }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to cancel reservation");

      onClose();
      onCancelled?.();
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.toLowerCase().includes("not authenticated")) {
        router.replace("/login");
        return;
      }
      setError(msg || "Failed to cancel reservation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Reservation">
      <div className={["space-y-4", className || ""].join(" ")} {...rest}>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Please tell us why you're cancelling. This helps us improve.
        </p>
        <div className="flex flex-wrap gap-2">
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleReason(r)}
              className={[
                "px-3 py-1 rounded-full text-sm border transition-all",
                reasons.includes(r)
                  ? "bg-red-600 text-white border-red-700"
                  : "bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:shadow",
              ].join(" ")}
            >
              {r}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Additional details (optional)
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 p-3 shadow-inner"
            placeholder="Share any context."
          />
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-4 text-sm font-medium text-slate-800 dark:text-slate-200"
            disabled={submitting}
          >
            No, keep reservation
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#ef4444] px-4 text-sm font-semibold text-white shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? "Cancelling..." : "Yes, cancel"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
