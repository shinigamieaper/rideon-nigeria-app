"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { waitForUser } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import { useFeatureFlags } from "@/hooks";
import {
  Loader2,
  Phone,
  Mail,
  MessageCircle,
  Send,
  LifeBuoy,
  AlertCircle,
} from "lucide-react";

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: "full_time_driver_portal",
          channel: "in_app",
        }),
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

      router.replace(`/full-time-driver/messages/${convId}`);
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

  if (flagsLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
        <div className="h-6 w-44 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="h-28 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 animate-pulse" />
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 p-5 space-y-4 animate-pulse">
          <div className="h-10 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-32 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-11 w-40 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  const contactMethods = [
    {
      href: "tel:+2349000000000",
      icon: Phone,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      title: "Call Us",
      description: "+234 900 000 0000",
    },
    {
      href: "mailto:drivers@rideon.ng",
      icon: Mail,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      title: "Email Support",
      description: "drivers@rideon.ng",
    },
    {
      href: "https://wa.me/2349000000000",
      icon: MessageCircle,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      title: "WhatsApp",
      description: "Message us on WhatsApp",
      external: true,
    },
  ];

  if (!flags.supportChatEnabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Contact Support
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Live chat is currently unavailable. Please reach out using one of
            the methods below.
          </p>
        </div>

        {/* Header Banner */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 shadow-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-white/10" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                We're Here to Help
              </h2>
              <p className="text-sm text-white/80">
                Choose your preferred contact method
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            return (
              <motion.a
                key={method.href}
                href={method.href}
                target={method.external ? "_blank" : undefined}
                rel={method.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-md hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${method.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${method.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {method.title}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {method.description}
                  </p>
                </div>
              </motion.a>
            );
          })}
        </div>

        <motion.p
          className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Our driver support team is available Monday–Saturday, 8 AM – 8 PM WAT.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Contact Support
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Describe your issue and we'll open a support chat with you.
        </p>
      </div>

      {/* Header Banner */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              How Can We Help?
            </h2>
            <p className="text-sm text-white/80">
              Tell us about your issue and we'll get back to you
            </p>
          </div>
        </div>
      </motion.div>

      {error && (
        <StickyBanner className="z-50">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-4 py-3 text-sm shadow-lg border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            {error}
          </motion.div>
        </StickyBanner>
      )}

      <motion.form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6 space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Subject{" "}
            <span className="text-slate-400 dark:text-slate-500 font-normal">
              (optional)
            </span>
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/20 transition-all"
            placeholder="Brief summary of your issue"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/20 transition-all resize-none"
            placeholder="Tell us what happened or what you need help with..."
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:opacity-95 transition-all duration-200 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating chat...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Start Support Chat
              </>
            )}
          </button>
        </div>
      </motion.form>

      {/* Alternative contact methods */}
      <motion.div
        className="pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-3">
          Or reach us directly
        </p>
        <div className="flex items-center justify-center gap-3">
          {contactMethods.slice(0, 2).map((method) => {
            const Icon = method.icon;
            return (
              <a
                key={method.href}
                href={method.href}
                className={`flex items-center justify-center w-10 h-10 rounded-xl ${method.iconBg} hover:opacity-80 transition-opacity`}
                title={method.title}
              >
                <Icon className={`h-5 w-5 ${method.iconColor}`} />
              </a>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
