export const runtime = "nodejs";

import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import InterviewRequestsPanel from "@/components/driver/placement/InterviewRequestsPanel";
import HireRequestsPanel from "@/components/driver/placement/HireRequestsPanel";
import {
  Briefcase,
  CalendarClock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type TabKey = "chats" | "interviews" | "hire";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

async function getAuthedUid(): Promise<{ uid: string }> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  let decoded: any | null = null;

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
  }

  if (!decoded) {
    const h = await headers();
    const authHeader = h.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      redirect(`/login?next=${encodeURIComponent("/driver/placement")}`);
    }
    decoded = await adminAuth.verifyIdToken(token);
  }

  const role = (decoded?.role ?? decoded?.claims?.role) as string | undefined;
  if (role !== "driver") {
    redirect(
      `/register/driver?next=${encodeURIComponent("/driver/placement")}`,
    );
  }

  return { uid: decoded.uid as string };
}

export default async function DriverPlacementHubPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { uid } = await getAuthedUid();
  const sp = (await searchParams) || {};

  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: TabKey =
    rawTab === "interviews" || rawTab === "hire" || rawTab === "chats"
      ? rawTab
      : "chats";

  const [userSnap, driverSnap, appSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("drivers").doc(uid).get(),
    adminDb.collection("full_time_driver_applications").doc(uid).get(),
  ]);

  const userData = userSnap.exists ? (userSnap.data() as any) : {};
  const driverData = driverSnap.exists ? (driverSnap.data() as any) : {};
  const appData = appSnap.exists ? (appSnap.data() as any) : {};

  const firstName = String(userData?.firstName || "").trim() || "Driver";
  const lastName = String(userData?.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();

  const recruitmentProfile =
    driverData?.recruitmentProfile &&
    typeof driverData.recruitmentProfile === "object"
      ? driverData.recruitmentProfile
      : null;

  const profileImageUrl: string | null =
    typeof recruitmentProfile?.profileImageUrl === "string"
      ? recruitmentProfile.profileImageUrl
      : typeof appData?.profileImageUrl === "string"
        ? appData.profileImageUrl
        : typeof userData?.profileImageUrl === "string"
          ? userData.profileImageUrl
          : null;

  const preferredCity: string =
    String(recruitmentProfile?.preferredCity || "").trim() ||
    String(appData?.preferredCity || "").trim();

  const experienceYears: number = Number.isFinite(
    Number(recruitmentProfile?.experienceYears),
  )
    ? Number(recruitmentProfile.experienceYears)
    : Number.isFinite(Number(driverData?.experienceYears))
      ? Number(driverData.experienceYears)
      : Number.isFinite(Number(appData?.experienceYears))
        ? Number(appData.experienceYears)
        : 0;

  const languages: string[] = Array.isArray(recruitmentProfile?.languages)
    ? recruitmentProfile.languages
    : Array.isArray(appData?.languages)
      ? appData.languages
      : [];

  const familyFitTags: string[] = Array.isArray(
    recruitmentProfile?.familyFitTags,
  )
    ? recruitmentProfile.familyFitTags
    : Array.isArray(appData?.familyFitTags)
      ? appData.familyFitTags
      : [];

  const recruitmentVisible = driverData?.recruitmentVisible === true;
  const recruitmentPool = driverData?.recruitmentPool === true;

  type PlacementConversation = {
    id: string;
    otherParticipantName: string;
    otherParticipantAvatarUrl: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  };

  let placementConversations: PlacementConversation[] = [];

  try {
    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      snap = await adminDb
        .collection("conversations")
        .where("memberIds", "array-contains", uid)
        .orderBy("lastMessageAt", "desc")
        .limit(100)
        .get();
    } catch {
      snap = await adminDb
        .collection("conversations")
        .where("memberIds", "array-contains", uid)
        .limit(100)
        .get();
    }

    placementConversations = snap.docs
      .map((doc) => {
        const v = doc.data() as any;
        const context =
          v?.context && typeof v.context === "object" ? v.context : {};
        const isPlacement = context?.source === "placement_portfolio";
        if (!isPlacement) return null;

        const memberIds: string[] = Array.isArray(v?.memberIds)
          ? v.memberIds
          : [];
        const otherId =
          memberIds.find((m) => m !== uid && m !== "support") ||
          memberIds.find((m) => m !== uid) ||
          null;
        const profiles = (v?.participantProfiles || {}) as Record<
          string,
          { name?: string; avatarUrl?: string | null }
        >;
        const other = otherId ? profiles[otherId] || {} : {};

        const lastMessageAt =
          typeof v?.lastMessageAt === "string"
            ? v.lastMessageAt
            : v?.lastMessageAt?.toDate?.()?.toISOString?.() ||
              new Date().toISOString();

        const unreadCount =
          v?.unreadCounts &&
          typeof v.unreadCounts === "object" &&
          typeof v.unreadCounts[uid] === "number"
            ? Number(v.unreadCounts[uid] || 0)
            : 0;

        return {
          id: doc.id,
          otherParticipantName:
            typeof other?.name === "string" && other.name.trim()
              ? other.name
              : "Client",
          otherParticipantAvatarUrl:
            typeof other?.avatarUrl === "string" ? other.avatarUrl : null,
          lastMessage: typeof v?.lastMessage === "string" ? v.lastMessage : "",
          lastMessageAt,
          unreadCount,
        } as PlacementConversation;
      })
      .filter((x): x is PlacementConversation => Boolean(x));

    placementConversations.sort(
      (a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt),
    );
  } catch {
    placementConversations = [];
  }

  const tabs = [
    {
      key: "chats" as const,
      label: "Chats",
      shortLabel: "Chats",
      href: "/driver/placement?tab=chats",
      icon: MessageSquare,
    },
    {
      key: "interviews" as const,
      label: "Interview Requests",
      shortLabel: "Interviews",
      href: "/driver/placement?tab=interviews",
      icon: CalendarClock,
    },
    {
      key: "hire" as const,
      label: "Hire Requests",
      shortLabel: "Hire",
      href: "/driver/placement?tab=hire",
      icon: Briefcase,
    },
  ];

  const initials = `${(firstName[0] || "D").toUpperCase()}${(lastName[0] || "").toUpperCase()}`;

  return (
    <main className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
              Placement Hub
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage your full-time placement opportunities.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  recruitmentPool
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                )}
              >
                {recruitmentPool ? "Recruitment Pool" : "Not in Pool"}
              </span>
              <span
                className={cx(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  recruitmentVisible
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                )}
              >
                {recruitmentVisible ? "Profile Listed" : "Profile Hidden"}
              </span>
            </div>
          </div>

          <Link
            href="/driver"
            className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
          >
            Back
          </Link>
        </header>

        <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6">
          <div className="flex items-start gap-4">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={fullName}
                className="h-14 w-14 rounded-2xl object-cover border border-slate-200/60 dark:border-slate-800/60"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#00529B] to-[#0077E6] text-white flex items-center justify-center font-bold">
                {initials || "DR"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {fullName}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {preferredCity || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      {Number.isFinite(experienceYears)
                        ? `${experienceYears} yrs experience`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
                    <Sparkles className="h-4 w-4" />
                    Profile preview
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Languages
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {languages.length > 0 ? (
                      languages.slice(0, 8).map((l) => (
                        <span
                          key={l}
                          className="inline-flex items-center rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                        >
                          {l}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Family-fit
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {familyFitTags.length > 0 ? (
                      familyFitTags.slice(0, 8).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 px-3 py-1 text-xs text-blue-700 dark:text-blue-300"
                        >
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                </div>
              </div>

              {recruitmentPool && (
                <div className="mt-4">
                  <Link
                    href="/driver/placement/profile/edit"
                    className="inline-flex items-center justify-center rounded-xl bg-[#00529B] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Edit public profile
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <nav
          className="flex gap-1 p-1 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-sm"
          aria-label="Placement hub navigation"
        >
          {tabs.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={cx(
                  "min-w-0 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[#00529B] text-white shadow-md"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate sm:hidden">{t.shortLabel}</span>
                <span className="truncate hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7">
          {tab === "chats" ? (
            placementConversations.length > 0 ? (
              <div className="space-y-3">
                {placementConversations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/driver/messages/${c.id}`}
                    className="block rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 p-4 hover:bg-white/80 dark:hover:bg-slate-900/80 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {c.otherParticipantName}
                          </div>
                          {c.unreadCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-[#00529B] px-2 py-0.5 text-[11px] font-semibold text-white">
                              {c.unreadCount > 9 ? "9+" : c.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate">
                          {c.lastMessage || "No messages yet"}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(c.lastMessageAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <MessageSquare className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  No placement chats yet
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  When a client messages you from your portfolio, it will appear
                  here.
                </p>
                <div className="mt-4">
                  <Link
                    href="/driver/messages"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                  >
                    Open Messages
                  </Link>
                </div>
              </div>
            )
          ) : tab === "interviews" ? (
            <InterviewRequestsPanel />
          ) : (
            <HireRequestsPanel />
          )}
        </section>
      </div>
    </main>
  );
}
