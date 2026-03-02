import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import type {
  ConversationContext,
  ParticipantProfile,
} from "@/types/messaging";

export const runtime = "nodejs";

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

// POST /api/messages/contact-driver
// Body: { driverId?: string; reservationId?: string; bookingId?: string }
// Creates or finds a trip conversation between the current user (customer) and the driver.
export async function POST(req: Request) {
  try {
    // Check if in-app messaging is enabled via feature flag
    try {
      const flagsDoc = await withTimeout(
        adminDb.collection("config").doc("feature_flags").get(),
        2_500,
        "[contact-driver] feature flags",
      );
      const flagsData = flagsDoc.exists ? flagsDoc.data() : {};
      const inAppMessaging = flagsData?.inAppMessaging !== false; // Default to true

      if (!inAppMessaging) {
        return NextResponse.json(
          {
            error:
              "In-app messaging is currently disabled. Please call the driver directly.",
            code: "MESSAGING_DISABLED",
          },
          { status: 503 },
        );
      }
    } catch (flagError) {
      console.warn(
        "[contact-driver] Failed to check feature flag, allowing by default",
        flagError,
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[contact-driver] verifyIdToken",
    );
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}) as any);
    const driverIdRaw =
      typeof body?.driverId === "string" ? body.driverId.trim() : "";
    const reservationId =
      typeof body?.reservationId === "string" ? body.reservationId.trim() : "";
    const bookingId =
      typeof body?.bookingId === "string" ? body.bookingId.trim() : "";

    // If reservationId/bookingId is supplied, validate ownership and infer driverId when possible
    let targetDriverId = driverIdRaw;
    if (reservationId) {
      const snap = await withTimeout(
        adminDb.collection("bookings").doc(reservationId).get(),
        3_000,
        "[contact-driver] reservation doc",
      );
      if (!snap.exists) {
        return NextResponse.json(
          { error: "Reservation not found." },
          { status: 404 },
        );
      }
      const d = snap.data() as any;
      if ((d?.uid || "") !== uid) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      const assigned =
        typeof d?.driverId === "string" ? String(d.driverId) : "";
      if (assigned && targetDriverId && assigned !== targetDriverId) {
        return NextResponse.json(
          { error: "Driver mismatch with reservation." },
          { status: 400 },
        );
      }
      if (assigned && !targetDriverId) targetDriverId = assigned;
    }

    if (!reservationId && bookingId) {
      const snap = await withTimeout(
        adminDb.collection("bookings").doc(bookingId).get(),
        3_000,
        "[contact-driver] booking doc",
      );
      if (!snap.exists) {
        return NextResponse.json(
          { error: "Booking not found." },
          { status: 404 },
        );
      }
      const d = snap.data() as any;
      if ((d?.uid || "") !== uid) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      const assigned =
        typeof d?.driverId === "string" ? String(d.driverId) : "";
      if (assigned && targetDriverId && assigned !== targetDriverId) {
        return NextResponse.json(
          { error: "Driver mismatch with booking." },
          { status: 400 },
        );
      }
      if (assigned && !targetDriverId) targetDriverId = assigned;
    }

    if (!targetDriverId) {
      return NextResponse.json({ error: "Missing driverId." }, { status: 400 });
    }
    if (targetDriverId === uid) {
      return NextResponse.json(
        { error: "Cannot start a conversation with yourself." },
        { status: 400 },
      );
    }

    const isTripChat = Boolean(reservationId || bookingId);

    if (!isTripChat) {
      return NextResponse.json(
        { error: "Missing reservationId or bookingId." },
        { status: 400 },
      );
    }

    const [a, b] = [uid, targetDriverId].sort();
    const tripKey = reservationId || bookingId;
    const memberKey = `${a}|${b}|${tripKey}`;

    const existingSnap = await withTimeout(
      reservationId
        ? adminDb
            .collection("conversations")
            .where("type", "==", "trip")
            .where("context.reservationId", "==", reservationId)
            .limit(1)
            .get()
        : adminDb
            .collection("conversations")
            .where("type", "==", "trip")
            .where("context.bookingId", "==", bookingId)
            .limit(1)
            .get(),
      3_000,
      "[contact-driver] existing trip convo query",
    );

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      return NextResponse.json({ id: doc.id, created: false }, { status: 200 });
    }

    const fallbackSnap = await withTimeout(
      adminDb
        .collection("conversations")
        .where("memberKey", "==", memberKey)
        .limit(1)
        .get(),
      3_000,
      "[contact-driver] memberKey convo query",
    );

    if (!fallbackSnap.empty) {
      const doc = fallbackSnap.docs[0];
      return NextResponse.json({ id: doc.id, created: false }, { status: 200 });
    }

    // Fetch minimal participant profiles for display (best-effort)
    async function readUserProfile(
      userId: string,
      role: "customer" | "driver",
    ): Promise<ParticipantProfile> {
      try {
        const s = await withTimeout(
          adminDb.collection("users").doc(userId).get(),
          2_500,
          "[contact-driver] user profile",
        );
        if (!s.exists) return { role };
        const d = s.data() as Record<string, unknown>;
        const name = [d?.firstName, d?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        // Build profile without undefined values to satisfy Firestore restrictions
        const profile: ParticipantProfile = { role };
        if (name) {
          profile.name = name;
        }
        if (typeof d?.profileImageUrl === "string" && d.profileImageUrl) {
          profile.avatarUrl = d.profileImageUrl as string;
        }
        if (typeof d?.email === "string" && d.email) {
          profile.email = d.email as string;
        }
        return profile;
      } catch {
        return { role };
      }
    }

    const [meProfile, driverProfile] = await Promise.all([
      readUserProfile(uid, "customer"),
      readUserProfile(targetDriverId, "driver"),
    ]);

    const nowIso = new Date().toISOString();

    // Create conversation atomically
    const convRef = adminDb.collection("conversations").doc();

    // Build context with proper typing and without undefined values
    const context: ConversationContext = {
      customerId: uid,
      driverId: targetDriverId,
      channel: "in_app",
      source: "trip_chat",
      ...(reservationId ? { reservationId } : {}),
      ...(bookingId ? { bookingId } : {}),
    };

    await withTimeout(
      convRef.set({
        type: "trip",
        memberIds: [uid, targetDriverId],
        memberKey,
        participantProfiles: {
          [uid]: meProfile,
          [targetDriverId]: driverProfile,
        },
        createdBy: uid,
        // Support/ticket semantics (for trip chats, status is informational)
        status: "open",
        priority: "normal",
        tags: [],
        // Context
        context,
        // Last activity
        lastMessage: "",
        lastMessageAt: nowIso,
        lastMessageSenderId: uid,
        unreadCounts: {
          [uid]: 0,
          [targetDriverId]: 0,
        },
        // Timestamps
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
      3_000,
      "[contact-driver] create conversation",
    );

    return NextResponse.json(
      { id: convRef.id, created: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating/finding contact-driver conversation:", error);
    return NextResponse.json(
      { error: "Failed to create or find conversation." },
      { status: 500 },
    );
  }
}
