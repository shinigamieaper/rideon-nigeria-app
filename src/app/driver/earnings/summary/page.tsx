import * as React from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import {
  BalanceCard,
  EarningsDashboardClient,
  type Transaction,
} from "@/components";

export const runtime = "nodejs";

async function getAuthedUid(): Promise<{ uid: string }> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  let decoded: any | null = null;

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
    if (decoded) {
      console.log("[earnings/summary] Session cookie verified successfully");
    } else {
      console.error("[earnings/summary] Session cookie verification failed");
    }
  }

  if (!decoded) {
    const h = await headers();
    const requestedPath = h.get("x-pathname") || "/driver/earnings/summary";
    const authHeader = h.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      console.warn(
        "[earnings/summary] No session cookie and no Bearer token - redirecting to login",
      );
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
    try {
      decoded = await adminAuth.verifyIdToken(token);
      console.log("[earnings/summary] Bearer token verified successfully");
    } catch (err: any) {
      console.error(
        "[earnings/summary] Bearer token verification failed:",
        err?.code || err?.message || err,
      );
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
  }

  const role = (decoded?.role ?? decoded?.claims?.role) as string | undefined;
  if (role !== "driver") {
    const h = await headers();
    const requestedPath = h.get("x-pathname") || "/driver/earnings/summary";
    redirect(`/register/driver?next=${encodeURIComponent(requestedPath)}`);
  }

  return { uid: decoded.uid as string };
}

async function getDriverEarnings(uid: string) {
  try {
    // Fetch driver data
    const driverDoc = await adminDb.collection("drivers").doc(uid).get();
    if (!driverDoc.exists) {
      return null;
    }

    const driverData = driverDoc.data();

    // Fetch balance (from driver_balances collection or driver doc)
    const balanceDoc = await adminDb
      .collection("driver_balances")
      .doc(uid)
      .get();
    const balance = balanceDoc.exists
      ? balanceDoc.data()?.availableBalance || 0
      : 0;

    // Fetch transactions from bookings (completed trips)
    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .where("driverId", "==", uid)
      .where("status", "==", "completed")
      .orderBy("completionTime", "desc")
      .limit(100)
      .get();

    // Helper to normalize Firestore Timestamp | Date | string to ISO string
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

    const tripTransactions: Transaction[] = bookingsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const fareNgn = Number(data?.fareNgn || data?.fare || 0) || 0;
      const payoutNgn =
        Number(
          data?.driverPayoutNgn ||
            data?.driverPayout ||
            data?.pricing?.driverPayoutNgn ||
            0,
        ) || 0;
      return {
        id: doc.id,
        type: "trip" as const,
        amount:
          payoutNgn > 0 ? payoutNgn : Math.max(0, Math.round(fareNgn * 0.8)),
        description: `Rental: ${data.pickupAddress?.substring(0, 30)}... → ${data.dropoffAddress?.substring(0, 30)}...`,
        date: toIso(data.completionTime),
        status: "completed" as const,
      };
    });

    // Fetch other transactions (bonuses, adjustments, etc.)
    const otherTransactionsSnapshot = await adminDb
      .collection("driver_transactions")
      .where("driverId", "==", uid)
      .where("type", "in", ["bonus", "adjustment", "refund", "penalty"])
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const otherTransactions: Transaction[] = otherTransactionsSnapshot.docs.map(
      (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: "other" as const,
          amount: data.amount || 0,
          description: data.description || data.type || "Transaction",
          date: toIso(data.createdAt),
          status: data.status || "completed",
        };
      },
    );

    // Combine and sort all transactions by date
    const allTransactions = [...tripTransactions, ...otherTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      balance,
      transactions: allTransactions,
    };
  } catch (error) {
    console.error("Error fetching driver earnings:", error);
    return null;
  }
}

export default async function EarningsSummaryPage() {
  const { uid } = await getAuthedUid();
  const earningsData = await getDriverEarnings(uid);

  if (!earningsData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Unable to load earnings data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BalanceCard balance={earningsData.balance} />
      <EarningsDashboardClient transactions={earningsData.transactions} />
    </div>
  );
}
