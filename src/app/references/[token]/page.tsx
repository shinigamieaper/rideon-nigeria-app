"use client";

import React from "react";
import { useParams } from "next/navigation";
import RevealOnScroll from "../../../../components/shared/RevealOnScroll";
import BlurText from "../../../../components/shared/BlurText";

type Status = "pending" | "submitted" | "expired";

export default function ReferenceResponsePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string | undefined;

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState<Status>("pending");
  const [referenceName, setReferenceName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [applicantName, setApplicantName] = React.useState("");

  const [recommend, setRecommend] = React.useState<boolean | null>(null);
  const [comments, setComments] = React.useState("");

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/reference-requests/${encodeURIComponent(token)}`,
      );
      const j = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(j?.error || "Failed to load reference request");

      const s = (j?.status as Status) || "pending";
      setStatus(s);
      setReferenceName(String(j?.referenceName || ""));
      setRelationship(String(j?.relationship || ""));
      setApplicantName(String(j?.applicantName || ""));

      if (j?.response) {
        setRecommend(!!j.response.recommend);
        setComments(String(j.response.comments || ""));
      }
    } catch (e: any) {
      setError(e?.message || "Unable to load reference request.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (recommend === null) {
      setError("Please select Yes or No.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(
        `/api/reference-requests/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recommend, comments }),
        },
      );
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to submit response");

      await load();
    } catch (e: any) {
      setError(e?.message || "Unable to submit response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[70vh] w-full items-center justify-center p-6">
      <RevealOnScroll
        as="div"
        className="w-full max-w-2xl rounded-2xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl p-8"
        style={{
          ["--tw-enter-scale" as any]: 0.98,
          ["--tw-enter-blur" as any]: "12px",
        }}
      >
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-center">
          <BlurText
            as="span"
            text="RideOn Reference Check"
            animateBy="words"
            direction="top"
            delay={80}
          />
        </h1>

        {loading ? (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 text-center">
            Loading…
          </p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-600 text-center">{error}</p>
        ) : status === "expired" ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              This reference request has expired.
            </p>
          </div>
        ) : status === "submitted" ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Thanks — your response has been submitted.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              You can close this page now.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 text-center">
              Hi {referenceName || "there"}, you were listed as a reference for{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {applicantName || "a candidate"}
              </span>
              {relationship ? <> ({relationship})</> : null}.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Would you recommend this person for a professional driver
                  role?
                </p>
                <div className="mt-3 flex items-center gap-6 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recommend"
                      checked={recommend === true}
                      onChange={() => setRecommend(true)}
                      className="h-4 w-4"
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recommend"
                      checked={recommend === false}
                      onChange={() => setRecommend(false)}
                      className="h-4 w-4"
                    />
                    No
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Comments (optional)
                </label>
                <textarea
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Any additional context you’d like to share (reliability, professionalism, etc.)"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-11 px-6 transition-all duration-300 ease-in-out hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#34A853" }}
              >
                <BlurText
                  as="span"
                  text={submitting ? "Submitting…" : "Submit Response"}
                  animateBy="words"
                  direction="top"
                  delay={40}
                />
              </button>
            </form>
          </>
        )}
      </RevealOnScroll>
    </main>
  );
}
