import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveVehiclePricingSnapshot } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = (url.searchParams.get("city") || "").trim();
    const category = (url.searchParams.get("category") || "").trim();
    const seatsQ = (url.searchParams.get("seats") || "").trim();
    const minSeats = seatsQ ? Math.max(1, parseInt(seatsQ, 10)) : undefined;

    let query: FirebaseFirestore.Query = adminDb
      .collection("vehicles")
      .where("status", "==", "available");
    if (city) query = query.where("city", "==", city);
    if (category) query = query.where("category", "==", category);

    const snap = await query.limit(60).get();
    const out: any[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      if (d?.adminActive === false) return;
      if (minSeats && typeof d.seats === "number" && d.seats < minSeats) return;

      const pricing = resolveVehiclePricingSnapshot(d);
      out.push({
        id: doc.id,
        city: d.city || "",
        category: d.category || "",
        make: d.make || "",
        model: d.model || "",
        seats: d.seats || null,
        dayRateNgn: pricing.dayRateNgn,
        block4hRateNgn: pricing.block4hRateNgn,
        image:
          Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null,
        insured: Boolean(d.insured),
        status: d.status || "available",
      });
    });

    return NextResponse.json({ listings: out }, { status: 200 });
  } catch (error) {
    console.error("Error fetching catalog listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog listings." },
      { status: 500 },
    );
  }
}
