"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { waitForUser } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import { useFeatureFlags } from "@/hooks";
import { Phone, Mail, MessageCircle } from "lucide-react";

export default function SupportPage() {
  const router = useRouter();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function createSupportConversation(initial?: string) {
    try {
      setLoading(true);
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
      router.replace(`/app/messages/${convId}`);
    } catch (e: any) {
      setError(e?.message || "Failed to contact support.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setLoading(false);
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
        <div className="mt-2 h-4 w-72 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 space-y-4">
          <div className="h-10 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="h-32 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="h-11 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
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
            href="mailto:support@rideon.ng"
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
                support@rideon.ng
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
          Our support team is available Monday–Saturday, 8 AM – 8 PM WAT.
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
        Describe your issue and we will open a support chat with you.
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Subject (optional)
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-10 rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-transparent px-3 text-sm"
            placeholder="Brief summary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full min-h-[120px] rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-transparent px-3 py-2 text-sm"
            placeholder="Tell us what happened"
          />
        </div>
        <div className="mt-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-[#00529B] text-white text-sm font-semibold shadow-lg shadow-blue-900/30 transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Creating chat…" : "Start Support Chat"}
          </button>
        </div>
      </form>
    </div>
  );
}
