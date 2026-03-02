import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

function toIso(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object" && input && "toDate" in input) {
    const maybe = input as { toDate?: () => Date };
    try {
      return maybe.toDate?.()?.toISOString?.() || null;
    } catch {
      return null;
    }
  }
  return null;
}

type PartnerPayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  reference: string | null;
};

type PartnerInvoice = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  downloadUrl: string | null;
};

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req);
    if (ctx instanceof NextResponse) return ctx;

    const partnerId = ctx.partnerId;

    const appRef = adminDb.collection("partner_applications").doc(partnerId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const payoutsSnap = await appRef
      .collection("payouts")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const invoicesSnap = await appRef
      .collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const payouts: PartnerPayout[] = payoutsSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        amount: typeof d.amount === "number" ? d.amount : 0,
        currency: typeof d.currency === "string" ? d.currency : "NGN",
        status: typeof d.status === "string" ? d.status : "pending",
        createdAt: toIso(d.createdAt),
        periodStart: toIso(d.periodStart),
        periodEnd: toIso(d.periodEnd),
        reference: typeof d.reference === "string" ? d.reference : null,
      };
    });

    const invoices: PartnerInvoice[] = invoicesSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        amount: typeof d.amount === "number" ? d.amount : 0,
        currency: typeof d.currency === "string" ? d.currency : "NGN",
        status: typeof d.status === "string" ? d.status : "issued",
        createdAt: toIso(d.createdAt),
        periodStart: toIso(d.periodStart),
        periodEnd: toIso(d.periodEnd),
        downloadUrl: `/api/partner/invoices/${doc.id}/download`,
      };
    });

    return NextResponse.json(
      {
        payouts,
        invoices,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner billing:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing data." },
      { status: 500 },
    );
  }
}
