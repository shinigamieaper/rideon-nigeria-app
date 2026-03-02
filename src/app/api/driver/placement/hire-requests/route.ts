export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

function toIso(input: any): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  if (input?.toDate) {
    try {
      return input.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (input instanceof Date) return input.toISOString();
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }

    const driverId = decoded.uid;

    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    let usedFallback = false;

    try {
      snap = await adminDb
        .collection("placement_hire_requests")
        .where("driverId", "==", driverId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    } catch (e: any) {
      const msg = String(e?.message || "");
      const code = (e && (e.code ?? e.status)) as unknown;
      if (msg.includes("requires an index") || code === 9) {
        usedFallback = true;
        snap = await adminDb
          .collection("placement_hire_requests")
          .where("driverId", "==", driverId)
          .limit(50)
          .get();
      } else {
        throw e;
      }
    }

    let requests = snap.docs.map((d) => {
      const v = d.data() as any;
      return {
        id: d.id,
        conversationId: String(v?.conversationId || ""),
        driverId: String(v?.driverId || ""),
        customerId: String(v?.customerId || ""),
        customerName: String(v?.customerName || "Client"),
        customerAvatarUrl:
          typeof v?.customerAvatarUrl === "string" ? v.customerAvatarUrl : null,
        status: String(v?.status || "requested"),
        notes: typeof v?.notes === "string" ? v.notes : undefined,
        createdAt: toIso(v?.createdAt),
        updatedAt: toIso(v?.updatedAt),
        respondedAt: toIso(v?.respondedAt),
      };
    });

    if (usedFallback) {
      requests = requests.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
    }

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/driver/placement/hire-requests] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hire requests." },
      { status: 500 },
    );
  }
}
