export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveVehiclePricingSnapshot } from "@/lib/pricing";
import { requireAdmin } from "@/lib/adminRbac";

// GET /api/admin/catalog - List all catalog items with admin fields
export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const city = url.searchParams.get("city") || "";
    const status = url.searchParams.get("status") || "";
    const category = url.searchParams.get("category") || "";

    let query: FirebaseFirestore.Query = adminDb.collection("vehicles");

    if (city) query = query.where("city", "==", city);
    if (status) query = query.where("status", "==", status);
    if (category) query = query.where("category", "==", category);

    query = query.orderBy("createdAt", "desc").limit(100);

    const snap = await query.get();
    const listings: any[] = [];

    snap.forEach((doc) => {
      const d = doc.data();
      const pricing = resolveVehiclePricingSnapshot(d);
      listings.push({
        id: doc.id,
        city: d.city || "",
        category: d.category || "",
        make: d.make || "",
        model: d.model || "",
        partnerId: d.partnerId || null,
        adminActive: d.adminActive === false ? false : true,
        seats: d.seats || null,
        images: Array.isArray(d.images) ? d.images : [],
        // Customer pricing
        dayRateNgn: pricing.dayRateNgn || 0,
        block4hRateNgn: pricing.block4hRateNgn || 0,
        // Partner base + platform add-on config
        partnerBaseDayRateNgn: pricing.baseDayRateNgn || 0,
        partnerBaseBlock4hRateNgn: pricing.baseBlock4hRateNgn || 0,
        adminMarkupFixedNgn: pricing.markupFixedNgn || 0,
        // Status and metadata
        status: d.status || "available",
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
      });
    });

    return NextResponse.json({ listings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog." },
      { status: 500 },
    );
  }
}

// POST /api/admin/catalog - Create new catalog item
export async function POST(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    return NextResponse.json(
      {
        error:
          "Creating vehicles from Admin Catalog is disabled. Vehicles must come from partner submissions.",
      },
      { status: 403 },
    );
  } catch (error) {
    console.error("Error creating catalog item:", error);
    return NextResponse.json(
      { error: "Failed to create listing." },
      { status: 500 },
    );
  }
}
