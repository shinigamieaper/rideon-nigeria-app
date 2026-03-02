import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "rideon_session";

type PartnerTeamRole = "admin" | "manager" | "viewer";

function getRole(decoded: unknown): string | undefined {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const role = (d?.role ?? claims?.role) as string | undefined;
  return typeof role === "string" ? role : undefined;
}

function getPartnerTeamClaim(
  decoded: unknown,
): { partnerId?: string; role?: string } | null {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const raw = (d?.partnerTeam ?? claims?.partnerTeam) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    partnerId: typeof r.partnerId === "string" ? r.partnerId : undefined,
    role: typeof r.role === "string" ? r.role : undefined,
  };
}

function getPartnerTeamsClaim(
  decoded: unknown,
): Record<string, PartnerTeamRole> | null {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const raw = (d?.partnerTeams ?? claims?.partnerTeams) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, PartnerTeamRole> = {};
  for (const [k, v] of Object.entries(r)) {
    if (typeof k !== "string" || !k.trim()) continue;
    if (v === "admin" || v === "manager" || v === "viewer") {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

function isPartnerTeamRole(role: unknown): role is PartnerTeamRole {
  return role === "admin" || role === "manager" || role === "viewer";
}

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

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency || "NGN"} ${amount || 0}`;
  }
}

function formatPeriod(startIso: string | null, endIso: string | null) {
  if (!startIso && !endIso) return "—";
  try {
    const s = startIso ? new Date(startIso) : null;
    const e = endIso ? new Date(endIso) : null;
    if (s && e)
      return `${s.toLocaleDateString("en-NG")} – ${e.toLocaleDateString("en-NG")}`;
    if (s) return s.toLocaleDateString("en-NG");
    if (e) return e.toLocaleDateString("en-NG");
    return "—";
  } catch {
    return "—";
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await context.params;
    const id = String(invoiceId || "").trim();
    if (!id) {
      return NextResponse.json(
        { error: "Missing invoiceId." },
        { status: 400 },
      );
    }

    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value || "";
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyRideOnSessionCookie(sessionCookie);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = decoded.uid;

    const role = getRole(decoded);
    const team = getPartnerTeamClaim(decoded);
    const teams = getPartnerTeamsClaim(decoded);

    let partnerId = "";

    if (role === "partner" || role === "partner_applicant") {
      partnerId = uid;
    } else {
      const cookieRaw = req.cookies.get("rideon_partner_context")?.value || "";
      let cookiePartnerId = "";
      try {
        cookiePartnerId = decodeURIComponent(cookieRaw).trim();
      } catch {
        cookiePartnerId = String(cookieRaw || "").trim();
      }

      const candidates: string[] = [];
      const pushCandidate = (v: string | undefined) => {
        const s = String(v || "").trim();
        if (!s) return;
        if (candidates.includes(s)) return;
        candidates.push(s);
      };

      pushCandidate(cookiePartnerId);
      pushCandidate(team?.partnerId);
      if (teams) {
        for (const id0 of Object.keys(teams).sort()) pushCandidate(id0);
      }

      for (const candidateId of candidates) {
        const memberSnap = await adminDb
          .collection("partner_applications")
          .doc(candidateId)
          .collection("teamMembers")
          .doc(uid)
          .get();

        if (!memberSnap.exists) continue;
        const md = memberSnap.data() as Record<string, unknown>;
        if (md?.status === "removed") continue;

        const roleFromDoc = isPartnerTeamRole(md?.role)
          ? (md.role as PartnerTeamRole)
          : null;
        const roleFromSingleClaim =
          candidateId === team?.partnerId && isPartnerTeamRole(team?.role)
            ? team.role
            : null;
        const roleFromTeamsClaim =
          teams && teams[candidateId] ? teams[candidateId] : null;
        const effectiveRole =
          roleFromDoc || roleFromSingleClaim || roleFromTeamsClaim;
        if (!effectiveRole) continue;

        partnerId = candidateId;
        break;
      }
    }

    if (!partnerId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const appRef = adminDb.collection("partner_applications").doc(partnerId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const appData = appSnap.data() as Record<string, unknown>;
    const partnerStatus =
      typeof appData?.status === "string" ? appData.status : "";
    if (partnerStatus !== "approved") {
      return NextResponse.json(
        { error: "Partner is not approved." },
        { status: 403 },
      );
    }

    const invoiceSnap = await appRef.collection("invoices").doc(id).get();
    if (!invoiceSnap.exists) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    const inv = invoiceSnap.data() as Record<string, unknown>;

    const amount = typeof inv.amount === "number" ? inv.amount : 0;
    const currency = typeof inv.currency === "string" ? inv.currency : "NGN";
    const status = typeof inv.status === "string" ? inv.status : "issued";

    const issuedAtIso = toIso(inv.createdAt) || new Date().toISOString();
    const periodStartIso = toIso(inv.periodStart);
    const periodEndIso = toIso(inv.periodEnd);

    const businessName =
      typeof appData.businessName === "string" ? appData.businessName : "";

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const gray = rgb(0.35, 0.35, 0.35);

    let y = 742;

    page.drawText("RideOn Invoice", {
      x: 50,
      y,
      size: 18,
      font: fontBold,
      color: black,
    });

    y -= 26;

    page.drawText(`Invoice ID: ${id}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: black,
    });

    y -= 16;

    if (businessName) {
      page.drawText(`Partner: ${businessName}`, {
        x: 50,
        y,
        size: 10,
        font,
        color: black,
      });
      y -= 16;
    }

    page.drawText(
      `Issued: ${new Date(issuedAtIso).toLocaleDateString("en-NG")}`,
      {
        x: 50,
        y,
        size: 10,
        font,
        color: black,
      },
    );

    y -= 16;

    page.drawText(`Period: ${formatPeriod(periodStartIso, periodEndIso)}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: black,
    });

    y -= 26;

    page.drawText(`Amount: ${formatMoney(amount, currency)}`, {
      x: 50,
      y,
      size: 12,
      font: fontBold,
      color: black,
    });

    y -= 18;

    page.drawText(`Status: ${status}`, {
      x: 50,
      y,
      size: 10,
      font,
      color: black,
    });

    page.drawText(
      "This document is generated electronically and is valid without a signature.",
      {
        x: 50,
        y: 70,
        size: 8,
        font,
        color: gray,
      },
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF." },
      { status: 500 },
    );
  }
}
