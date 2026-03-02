"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { waitForUser } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import { useFeatureFlags } from "@/hooks";
import { Loader2, Phone, Mail, MessageCircle } from "lucide-react";

export default function SupportPage() {
  const router = useRouter();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function createSupportConversation(initial?: string) {
    try {
      setSubmitting(true);
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/messages/contact-support", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to create support chat");

      const convId = j?.id as string;
      if (initial && convId) {
        const res2 = await fetch(`/api/messages/${convId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: initial }),
        });
        await res2.json().catch(() => ({}));
      }
      router.replace(`/driver/messages/${convId}`);
    } catch (e: any) {
      setError(e?.message || "Failed to contact support.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const initial = [subject, message].filter(Boolean).join("\n\n");
    createSupportConversation(initial || undefined);
  }

  // Show loading skeleton while flags are loading
  if (flagsLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <div className="h-6 w-44 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="mt-1 h-4 w-full max-w-md rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 space-y-4 animate-pulse">
          <div>
            <div className="h-4 w-36 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-2 h-10 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
          <div>
            <div className="h-4 w-20 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-2 h-32 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
          <div className="pt-2">
            <div className="h-11 w-40 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        </div>
      </div>
    );
  }

  // Show alternative contact methods when support chat is disabled
  if (!flags.supportChatEnabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Contact Support
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Live chat is currently unavailable. Please reach out using one of the
          methods below.
        </p>

        <div className="mt-5 space-y-4">
          {/* Phone */}
          <a
            href="tel:+2349000000000"
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Call Us
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                +234 900 000 0000
              </p>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:drivers@rideon.ng"
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Email Support
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                drivers@rideon.ng
              </p>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/2349000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                WhatsApp
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Message us on WhatsApp
              </p>
            </div>
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 text-center">
          Our driver support team is available Monday–Saturday, 8 AM – 8 PM WAT.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Contact Support
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Describe your issue and we'll open a support chat with you.
      </p>

      {error && (
        <StickyBanner className="z-50 mt-4">
          <div className="rounded-xl px-3 py-2 text-[13px] shadow border bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200">
            {error}
          </div>
        </StickyBanner>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 space-y-4"
      >
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Subject (optional)
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B] transition"
            placeholder="Brief summary"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B] transition"
            placeholder="Tell us what happened or what you need help with"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#00529B] text-white text-sm font-semibold hover:bg-[#003D7A] shadow-lg shadow-blue-900/20 transition-all duration-200 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating chat...
              </>
            ) : (
              "Start Support Chat"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
