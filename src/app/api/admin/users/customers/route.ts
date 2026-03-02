import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

async function verifyAdmin(req: NextRequest) {
  return requireAdmin(req, ["super_admin", "admin", "ops_admin"]);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.response) return auth.response;

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    // Fetch customers
    const usersRef = adminDb.collection("users");
    let snapshot = await usersRef.where("role", "==", "customer").get();

    if (snapshot.empty) {
      snapshot = await usersRef.get();
    }

    // Build customer list with aggregated data
    const customersPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const userId = doc.id;

      const role = data.role as string | undefined;
      const isDriver = role === "driver" || !!data.driverTrack;
      const isAdmin = data.isAdmin === true;

      // Only include customers. When we fall back to usersRef.get() (e.g., legacy data),
      // prevent non-customer roles (including full_time_driver_applicant) from being
      // treated as customers.
      if (role && role !== "customer") {
        return null;
      }

      // Legacy protection: if role is missing but the user looks like a driver/admin, exclude.
      if (!role && (isDriver || isAdmin)) {
        return null;
      }

      // Get all bookings for this customer
      const bookingsSnapshot = await adminDb
        .collection("bookings")
        .where("customerId", "==", userId)
        .get();

      let totalSpend = 0;
      let completedTrips = 0;
      let lastBookingDate: string | null = null;

      bookingsSnapshot.docs.forEach((b) => {
        const bData = b.data();
        if (bData.status === "completed") {
          completedTrips++;
          totalSpend += bData.fareNgn || bData.totalAmount || 0;
        }
        const bDate = bData.createdAt?.toDate?.()?.toISOString();
        if (bDate && (!lastBookingDate || bDate > lastBookingDate)) {
          lastBookingDate = bDate;
        }
      });

      return {
        id: userId,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        homeCity: data.homeCity || "",
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        status: data.status || "active",
        flagged: data.flagged || false,
        flagReason: data.flagReason || "",
        profileImageUrl: data.profileImageUrl || "",
        totalBookings: bookingsSnapshot.size,
        completedTrips,
        totalSpend,
        lastBookingDate,
      };
    });

    let customers = (await Promise.all(customersPromises)).filter(
      Boolean,
    ) as any[];

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter((c) => {
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phoneNumber.includes(q)
        );
      });
    }

    // Apply status filter
    if (status === "flagged") {
      customers = customers.filter((c) => c.flagged);
    } else if (status !== "all") {
      customers = customers.filter((c) => c.status === status);
    }

    // Sort by creation date (newest first)
    customers.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Calculate counts
    const allCustomers = (await Promise.all(customersPromises)).filter(
      Boolean,
    ) as any[];
    const counts = {
      all: allCustomers.length,
      active: allCustomers.filter((c) => c.status === "active" && !c.flagged)
        .length,
      flagged: allCustomers.filter((c) => c.flagged).length,
      suspended: allCustomers.filter((c) => c.status === "suspended").length,
    };

    return NextResponse.json({ customers, counts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/users/customers
 * Update customer status or flag
 * Body: { id: string, action: 'suspend' | 'activate' | 'flag' | 'unflag', reason?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.response) return auth.response;
    const caller = auth.caller!;

    const body = await req.json().catch(() => ({}));
    const { id, action, reason } = body as {
      id?: string;
      action?: string;
      reason?: string;
    };

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Customer id is required" },
        { status: 400 },
      );
    }

    const validActions = ["suspend", "activate", "flag", "unflag"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Use: ${validActions.join(", ")}` },
        { status: 400 },
      );
    }

    const updates: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (action === "suspend") {
      updates.status = "suspended";
    } else if (action === "activate") {
      updates.status = "active";
    } else if (action === "flag") {
      updates.flagged = true;
      updates.flagReason = reason || "Flagged by admin";
      updates.flaggedAt = FieldValue.serverTimestamp();
      updates.flaggedBy = caller.uid;
    } else if (action === "unflag") {
      updates.flagged = false;
      updates.flagReason = "";
    }

    await adminDb.collection("users").doc(id).set(updates, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 },
    );
  }
}
