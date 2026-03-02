import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
      "ops_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "").trim();
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "200", 10),
      500,
    );

    let query: FirebaseFirestore.Query = adminDb.collection("partners");
    if (status && status !== "all") query = query.where("status", "==", status);

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await query.orderBy("updatedAt", "desc").limit(limit).get();
    } catch (e) {
      console.warn(
        "[GET /api/admin/partners] Falling back to unordered query",
        e,
      );
      snap = await query.limit(limit).get();
    }

    const partners = snap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        userId: d?.userId || doc.id,
        status: d?.status || "approved",
        partnerType: d?.partnerType || "individual",
        businessName: d?.businessName || "",
        email: d?.email || "",
        phoneNumber: d?.phoneNumber || "",
        live: Boolean(d?.live),
        approvedVehicles:
          typeof d?.approvedVehicles === "number" ? d.approvedVehicles : 0,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
        suspendedAt: d?.suspendedAt?.toDate?.()?.toISOString?.() || null,
        suspensionReason: d?.suspensionReason || null,
      };
    });

    return NextResponse.json({ partners }, { status: 200 });
  } catch (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json(
      { error: "Failed to fetch partners." },
      { status: 500 },
    );
  }
}
