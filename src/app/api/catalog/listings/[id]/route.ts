import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveVehiclePricingSnapshot } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = (rawId || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const doc = await adminDb.collection("vehicles").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const d = doc.data() as any;
    if (
      d?.adminActive === false ||
      String(d?.status || "available") !== "available"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const pricing = resolveVehiclePricingSnapshot(d);
    const out = {
      id: doc.id,
      partnerId: d.partnerId || "",
      city: d.city || "",
      category: d.category || "",
      make: d.make || "",
      model: d.model || "",
      seats: d.seats || null,
      images: Array.isArray(d.images) ? d.images : [],
      dayRateNgn: pricing.dayRateNgn,
      block4hRateNgn: pricing.block4hRateNgn,
      specs: typeof d.specs === "object" && d.specs ? d.specs : {},
      description: d.description || "",
      availabilityBasics:
        typeof d.availabilityBasics === "object" && d.availabilityBasics
          ? d.availabilityBasics
          : {},
      status: d.status || "available",
    };

    return NextResponse.json(out, { status: 200 });
  } catch (error) {
    console.error("Error fetching listing detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing detail." },
      { status: 500 },
    );
  }
}
