"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  CheckCircle,
  Sparkles,
  Car,
  User,
} from "lucide-react";
import { Modal } from "@/components";
import { auth } from "@/lib/firebase";

export interface RateDriverModalProps
  extends React.ComponentPropsWithoutRef<"div"> {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  driverId?: string | null;
  /** Driver display name */
  driverName?: string;
  /** Driver profile image URL */
  driverImage?: string | null;
  /** Vehicle info for display */
  vehicleInfo?: { make?: string; model?: string; color?: string } | null;
  onSubmitted?: () => void;
}

const UP_COMPLIMENTS = [
  { label: "Professional", icon: "👔" },
  { label: "Safe Driving", icon: "🛡️" },
  { label: "On Time", icon: "⏰" },
  { label: "Clean Vehicle", icon: "✨" },
  { label: "Great Communication", icon: "💬" },
  { label: "Knows Routes", icon: "🗺️" },
  { label: "Courteous", icon: "🤝" },
  { label: "Helped with Luggage", icon: "🧳" },
];

const DOWN_REASONS = [
  { label: "Late arrival", icon: "⏱️" },
  { label: "Unsafe driving", icon: "⚠️" },
  { label: "Unprofessional behavior", icon: "😕" },
  { label: "Vehicle not clean", icon: "🚗" },
  { label: "Route issues", icon: "🗺️" },
  { label: "Communication issues", icon: "📵" },
  { label: "Other", icon: "📝" },
];

type ModalStep = "choice" | "details" | "success";

export default function RateDriverModal({
  isOpen,
  onClose,
  bookingId,
  driverId,
  driverName,
  driverImage,
  vehicleInfo,
  onSubmitted,
  className,
  ...rest
}: RateDriverModalProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<ModalStep>("choice");
  const [liked, setLiked] = React.useState<null | "up" | "down">(null);
  const [compliments, setCompliments] = React.useState<string[]>([]);
  const [comment, setComment] = React.useState("");
  const [issues, setIssues] = React.useState<string[]>([]);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow closing animation
      const timer = setTimeout(() => {
        setStep("choice");
        setLiked(null);
        setCompliments([]);
        setComment("");
        setIssues([]);
        setNote("");
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  function handleChoice(choice: "up" | "down") {
    setLiked(choice);
    setStep("details");
  }

  function toggleCompliment(c: string) {
    setCompliments((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function toggleIssue(r: string) {
    setIssues((prev) =>
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

      const body: Record<string, unknown> = {
        liked: liked === "up",
      };
      if (liked === "up") {
        body.compliments = compliments;
        if (comment.trim()) body.comment = comment.trim();
      } else if (liked === "down") {
        if (issues.length > 0) body.issues = issues;
        if (note.trim()) body.note = note.trim();
      }

      const res = await fetch(
        `/api/trips/${encodeURIComponent(bookingId)}/feedback`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to submit feedback.");

      setStep("success");
      onSubmitted?.();
    } catch (e: unknown) {
      const errMsg =
        e instanceof Error ? e.message : "Failed to submit feedback.";
      if (errMsg.toLowerCase().includes("not authenticated")) {
        router.replace("/login");
        return;
      }
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
  }

  const canSubmit = liked !== null && !submitting;
  const displayName = driverName || "Your Driver";
  const vehicleText = vehicleInfo
    ? `${vehicleInfo.color || ""} ${vehicleInfo.make || ""} ${vehicleInfo.model || ""}`.trim()
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "success" ? "" : "Rate Your Reservation"}
    >
      <div className={["min-h-[280px]", className || ""].join(" ")} {...rest}>
        {/* Step 1: Choice */}
        {step === "choice" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Driver info header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3">
                {driverImage ? (
                  <Image
                    src={driverImage}
                    alt={displayName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00529B] to-[#003d75] flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-slate-800">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {displayName}
              </h3>
              {vehicleText && (
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Car className="w-4 h-4" />
                  {vehicleText}
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-300 mt-3">
                How was your reservation?
              </p>
            </div>

            {/* Thumbs choice */}
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => handleChoice("up")}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-transparent bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg hover:border-emerald-400 hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
                  <ThumbsUp className="w-8 h-8 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Great!
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleChoice("down")}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-transparent bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg hover:border-red-400 hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg group-hover:from-red-400 group-hover:to-red-600 group-hover:shadow-red-500/30 transition-all">
                  <ThumbsDown className="w-8 h-8 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Not Great
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Back button and header */}
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
              <div className="flex items-center gap-2">
                {liked === "up" ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                    <ThumbsUp className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <ThumbsDown className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="font-medium text-slate-900 dark:text-white">
                  {liked === "up"
                    ? "What went well?"
                    : "What could be improved?"}
                </span>
              </div>
            </div>

            {/* Positive path */}
            {liked === "up" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {UP_COMPLIMENTS.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => toggleCompliment(c.label)}
                      className={[
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all duration-200",
                        compliments.includes(c.label)
                          ? "bg-[#00529B] text-white border-[#00529B] shadow-md scale-105"
                          : "bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:shadow hover:border-[#00529B]/50",
                      ].join(" ")}
                    >
                      <span>{c.icon}</span>
                      {c.label}
                      {compliments.includes(c.label) && (
                        <Check className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Share a testimonial{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Tell others about your experience..."
                    className="w-full rounded-xl border bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 p-3 shadow-inner placeholder:text-slate-400 focus:ring-2 focus:ring-[#00529B]/20 focus:border-[#00529B] transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This may appear on the driver&apos;s public profile.
                  </p>
                </div>
              </div>
            )}

            {/* Negative path */}
            {liked === "down" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DOWN_REASONS.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => toggleIssue(r.label)}
                      className={[
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all duration-200",
                        issues.includes(r.label)
                          ? "bg-red-600 text-white border-red-700 shadow-md scale-105"
                          : "bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:shadow hover:border-red-400/50",
                      ].join(" ")}
                    >
                      <span>{r.icon}</span>
                      {r.label}
                      {issues.includes(r.label) && (
                        <Check className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Add details{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Help us understand what happened..."
                    className="w-full rounded-xl border bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 p-3 shadow-inner placeholder:text-slate-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This feedback is private and helps us improve.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                disabled={submitting}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={[
                  "inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-lg transition-all duration-200",
                  liked === "up"
                    ? "bg-gradient-to-r from-[#00529B] to-[#003d75] hover:shadow-[#00529B]/30 disabled:opacity-60"
                    : "bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-500/30 disabled:opacity-60",
                  "disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center text-center py-6 animate-in zoom-in-95 fade-in duration-300">
            <div className="relative mb-4">
              <div
                className={[
                  "w-20 h-20 rounded-full flex items-center justify-center shadow-xl",
                  liked === "up"
                    ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                    : "bg-gradient-to-br from-slate-400 to-slate-500",
                ].join(" ")}
              >
                {liked === "up" ? (
                  <ThumbsUp className="w-10 h-10 text-white" />
                ) : (
                  <ThumbsDown className="w-10 h-10 text-white" />
                )}
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-400 animate-pulse" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {liked === "up"
                ? "Thanks for the love!"
                : "Thanks for your feedback"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-xs mb-6">
              {liked === "up"
                ? `Your feedback helps ${displayName} and other customers.`
                : "We'll use this to improve our service."}
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#00529B] px-6 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
