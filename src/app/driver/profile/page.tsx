import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import {
  IdCard,
  Briefcase,
  FileText,
  Shield,
  Bell,
  LifeBuoy,
  ArrowRightLeft,
} from "lucide-react";
import { ProfileMenuList } from "@/components";

export const runtime = "nodejs";

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
      redirect(`/login?next=${encodeURIComponent("/driver/profile")}`);
    }
    decoded = await adminAuth.verifyIdToken(token);
  }

  const role = (decoded?.role ?? decoded?.claims?.role) as string | undefined;
  if (role !== "driver") {
    redirect(`/register/driver?next=${encodeURIComponent("/driver/profile")}`);
  }

  return { uid: decoded.uid as string };
}

export default async function Page() {
  // Placement-specific items (Public Profile, Career Preferences) removed - rental service only
  const { uid } = await getAuthedUid();

  const driverSnap = await adminDb.collection("drivers").doc(uid).get();
  const driverData = driverSnap.exists ? (driverSnap.data() as any) || {} : {};
  const driverStatus = String(driverData?.status || "").trim();

  const fullTimeSnap = await adminDb
    .collection("full_time_driver_applications")
    .doc(uid)
    .get();
  const fullTimeStatus = fullTimeSnap.exists
    ? String((fullTimeSnap.data() as any)?.status || "").trim()
    : "";

  const isDualRoleApproved =
    driverStatus === "approved" && fullTimeStatus === "approved";

  const driverTrack = String(driverData?.driverTrack || "").trim();
  const isPlacementEligible =
    driverData?.recruitmentPool === true ||
    driverData?.placementOptIn === true ||
    driverTrack === "placement" ||
    driverTrack === "both";

  const items = [
    ...(isDualRoleApproved
      ? [
          {
            href: "/full-time-driver",
            title: "Switch to Full-Time Driver Portal",
            icon: <ArrowRightLeft className="h-5 w-5" />,
            description: "Open your full-time placement portal",
          },
        ]
      : []),
    ...(isPlacementEligible
      ? [
          {
            href: "/driver/placement",
            title: "Full-Time Placement Hub",
            icon: <Briefcase className="h-5 w-5" />,
            description:
              "View placement chats, interview requests, and hire requests",
          },
        ]
      : []),
    {
      href: "/driver/profile/personal",
      title: "Personal Profile",
      icon: <IdCard className="h-5 w-5" />,
      description: "Manage your basic information and contact details",
    },
    {
      href: "/driver/profile/documents",
      title: "Documents",
      icon: <FileText className="h-5 w-5" />,
      description: "Upload and manage required documents",
    },
    {
      href: "/driver/profile/settings",
      title: "Service Settings",
      icon: <Briefcase className="h-5 w-5" />,
      description: "Manage your service cities and vehicle info",
    },
    {
      href: "/driver/profile/notifications",
      title: "Notification Settings",
      icon: <Bell className="h-5 w-5" />,
      description: "Manage how you receive notifications",
    },
    {
      href: "/driver/profile/support",
      title: "Contact Support",
      icon: <LifeBuoy className="h-5 w-5" />,
      description: "Get help from our support team",
    },
    {
      href: "/driver/profile/account-settings",
      title: "Account Settings",
      icon: <Shield className="h-5 w-5" />,
      description: "Manage your account security and privacy",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Profile Settings
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Manage your professional profile, documents, and account settings.
      </p>

      <ProfileMenuList items={items} className="mt-5" />
    </div>
  );
}
