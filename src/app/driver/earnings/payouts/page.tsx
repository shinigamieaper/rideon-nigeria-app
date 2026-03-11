import * as React from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { PayoutListItem, DashboardEmptyState } from "@/components";

export const runtime = "nodejs";

async function getAuthedUid(): Promise<{ uid: string }> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  let decoded: any | null = null;

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
    if (decoded) {
      console.log("[earnings/payouts] Session cookie verified successfully");
    } else {
      console.error("[earnings/payouts] Session cookie verification failed");
    }
  }

  if (!decoded) {
    const h = await headers();
    const requestedPath = h.get("x-pathname") || "/driver/earnings/payouts";
    const authHeader = h.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      console.warn(
        "[earnings/payouts] No session cookie and no Bearer token - redirecting to login",
      );
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
    try {
      decoded = await adminAuth.verifyIdToken(token);
      console.log("[earnings/payouts] Bearer token verified successfully");
    } catch (err: any) {
      console.error(
        "[earnings/payouts] Bearer token verification failed:",
        err?.code || err?.message || err,
      );
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
  }

  const role = (decoded?.role ?? decoded?.claims?.role) as string | undefined;
  if (role !== "driver") {
    const h = await headers();
    const requestedPath = h.get("x-pathname") || "/driver/earnings/payouts";
    redirect(`/register/driver?next=${encodeURIComponent(requestedPath)}`);
  }

  return { uid: decoded.uid as string };
}

async function getDriverPayouts(uid: string) {
  try {
    const payoutsSnapshot = await adminDb
      .collection("driver_payouts")
      .where("driverId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    function toIso(input: any): string {
      if (typeof input === "string") return input;
      if (input?.toDate) {
        try {
          return input.toDate().toISOString();
        } catch {
          return new Date().toISOString();
        }
      }
      if (input instanceof Date) return input.toISOString();
      return new Date().toISOString();
    }

    return payoutsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount || 0,
        date: toIso(data.createdAt),
        bankName: data.bankName || "Bank",
        accountNumber: data.accountNumberLast4 || "****",
        status: data.status || "pending",
        reference: data.paystackReference || undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching driver payouts:", error);
    return [];
  }
}

export default async function PayoutsPage() {
  const { uid } = await getAuthedUid();
  const payouts = await getDriverPayouts(uid);

  if (payouts.length === 0) {
    return (
      <DashboardEmptyState
        title="No Payouts Yet"
        description="Your payout history will appear here once you request a withdrawal."
        actionLabel="Go to Summary"
        actionHref="/driver/earnings/summary"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          Payout History
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          All withdrawals to your bank account
        </p>
      </div>

      {payouts.map((payout) => (
        <PayoutListItem key={payout.id} payout={payout} />
      ))}
    </div>
  );
}
