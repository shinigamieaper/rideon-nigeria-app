import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";
import {
  canManageTeam,
  resolvePartnerPortalContext,
} from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

type PartnerTeamRole = "admin" | "manager" | "viewer";

function getRequestBaseUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    if (u.origin) return u.origin;
  } catch {
    // ignore
  }

  const origin = (req.headers.get("origin") || "").trim();
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // ignore
    }
  }

  const forwardedHost = (req.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = (forwardedHost || req.headers.get("host") || "").trim();
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const proto = forwardedProto || "https";

  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req);
    if (ctx instanceof NextResponse) return ctx;

    if (!canManageTeam(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const appSnap = await adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId)
      .get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const email = emailRaw.toLowerCase();
    const role = typeof body?.role === "string" ? body.role.trim() : "viewer";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    const inviteRole: PartnerTeamRole =
      role === "admin" || role === "manager" || role === "viewer"
        ? role
        : "viewer";

    const inviteId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId)
      .collection("teamInvites")
      .doc(inviteId)
      .set({
        email,
        role: inviteRole,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: ctx.actorUid,
      });

    const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
    const inviteUrl = `${baseUrl}/join/partner?partnerId=${encodeURIComponent(
      ctx.partnerId,
    )}&inviteId=${encodeURIComponent(inviteId)}`;

    let emailSent = false;
    try {
      const resend = getResendClient();
      const from = getEmailFrom();
      if (resend && from) {
        const subject = "You’ve been invited to join a RideOn Partner team";
        const text = [
          `You’ve been invited to join a RideOn Partner team as ${inviteRole}.`,
          "",
          "Open this link to accept the invite:",
          inviteUrl,
          "",
          "If you did not expect this invite, you can ignore this email.",
        ].join("\n");
        const html = `
          <p>You’ve been invited to join a RideOn Partner team as <strong>${inviteRole}</strong>.</p>
          <p>
            Click the link below to accept the invite:
          </p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          <p>If you did not expect this invite, you can ignore this email.</p>
        `;

        await resend.emails.send({
          from,
          to: email,
          subject,
          text,
          html,
        });
        emailSent = true;
      }
    } catch (e) {
      console.error("Error sending partner team invite email:", e);
      emailSent = false;
    }

    return NextResponse.json(
      {
        inviteId,
        partnerId: ctx.partnerId,
        role: inviteRole,
        inviteUrl,
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating team invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite." },
      { status: 500 },
    );
  }
}
