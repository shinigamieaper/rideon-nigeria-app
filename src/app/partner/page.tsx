"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Car,
  Users,
  Users2,
  Settings2,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { usePartnerTeam } from "@/hooks";

export default function PartnerPortalHomePage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [approvedVehicles, setApprovedVehicles] = React.useState<number>(0);
  const [live, setLive] = React.useState<boolean>(false);
  const { isTeamMember } = usePartnerTeam();

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }

        let token = await user.getIdToken();

        const fetchMe = async (t: string) =>
          fetch("/api/partner/me", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
          });

        let res = await fetchMe(token);
        if (res.status === 403) {
          token = await user.getIdToken(true);
          res = await fetchMe(token);
        }

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load partner profile");
        }

        const j = await res.json();
        const s = typeof j?.status === "string" ? j.status : null;

        if (mounted) {
          setStatus(s);
          setApprovedVehicles(
            typeof j?.approvedVehicles === "number" ? j.approvedVehicles : 0,
          );
          setLive(typeof j?.live === "boolean" ? j.live : false);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : null;
        setErr(message || "Something went wrong.");
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="space-y-8">
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        data-tour="partner-overview-header"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your fleet, drivers, and reservation assignments.
          </p>
        </div>

        <Link
          href={isTeamMember ? "/partner/team" : "/partner/settings"}
          className="inline-flex items-center justify-center rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
        >
          {isTeamMember ? "Team" : "Partner info"}
        </Link>
      </div>

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading partner status…</p>
          </div>
        ) : err ? (
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">
                Couldn’t load your partner profile
              </p>
              <p className="text-sm">{err}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Account status
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {status || "unknown"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Approved vehicles
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {approvedVehicles}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Live in catalog
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {live ? "Yes" : "No"}
              </p>
              {!live ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  You’ll go live after at least 1 vehicle is approved.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        data-tour="partner-overview-shortcuts"
      >
        <Link
          href="/partner/reservations"
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Reservations
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                View upcoming reservations and assign vehicles and drivers.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/partner/team"
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-600/10 dark:bg-slate-500/10 flex items-center justify-center">
              <Users2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Team
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Invite colleagues and manage access.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/partner/billing"
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Billing
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                View invoices and payout history.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/partner/vehicles"
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-cyan-600/10 dark:bg-cyan-500/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-cyan-700 dark:text-cyan-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Vehicles
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Submit vehicles for approval and manage documents.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/partner/drivers"
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-600/10 dark:bg-slate-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Drivers
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Add partner drivers and upload verification documents.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/partner/settings"
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-600/10 dark:bg-slate-500/10 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                Settings
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Business details and payout preferences.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
