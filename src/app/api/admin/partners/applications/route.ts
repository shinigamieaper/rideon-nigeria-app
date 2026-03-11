import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

type KycStatus = "pending" | "passed" | "failed";

function getRequestBaseUrl(req: NextRequest): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";
  const base = String(raw).trim();
  if (base) return base.replace(/\/$/, "");
  try {
    const u = new URL(req.url);
    if (u.origin) return u.origin;
  } catch {}
  return "http://localhost:3000";
}

async function acquireEmailLock(lockId: string): Promise<boolean> {
  try {
    await adminDb.collection("email_locks").doc(lockId).create({
      status: "sending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (e: any) {
    const code = String(e?.code ?? "");
    const msg = String(e?.message ?? "").toLowerCase();
    if (
      code === "6" ||
      msg.includes("already exists") ||
      msg.includes("already-exists")
    ) {
      return false;
    }
    throw e;
  }
}

async function markEmailLock(
  lockId: string,
  args: { status: "sent" | "failed"; error?: string },
) {
  try {
    await adminDb
      .collection("email_locks")
      .doc(lockId)
      .set(
        {
          status: args.status,
          error: args.error || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (e) {
    console.warn(
      "[admin/partners/applications] Failed to update email lock",
      lockId,
      e,
    );
  }
}

async function resolvePartnerEmail(id: string, app: any): Promise<string> {
  const fromApp = typeof app?.email === "string" ? app.email.trim() : "";
  if (fromApp) return fromApp;

  try {
    const u = await adminAuth.getUser(id);
    const email = (u.email || "").trim();
    if (email) return email;
  } catch {}

  try {
    const snap = await adminDb.collection("users").doc(id).get();
    if (!snap.exists) return "";
    const data = snap.data() as any;
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    return email;
  } catch {
    return "";
  }
}

function getKycSummary(app: any) {
  const k = app?.kyc || {};
  const overallStatus = (k?.overallStatus as KycStatus) || "pending";
  const cac = (k?.cac?.status as KycStatus) || "pending";
  const individualId = (k?.individualId?.status as KycStatus) || "pending";
  const director = (k?.director?.status as KycStatus) || "pending";
  const lastRunAt = k?.lastRunAt?.toDate?.()?.toISOString?.() || null;
  return { overallStatus, cac, individualId, director, lastRunAt };
}

function canApprovePartner(
  app: any,
): { ok: true } | { ok: false; reason: string } {
  const partnerType = String(app?.partnerType || "individual");
  const kyc = app?.kyc || {};
  const cac = (kyc?.cac?.status as KycStatus) || "pending";
  if (cac !== "passed") {
    return { ok: false, reason: "CAC verification must pass before approval." };
  }

  if (partnerType === "individual") {
    const id = (kyc?.individualId?.status as KycStatus) || "pending";
    if (id !== "passed") {
      return {
        ok: false,
        reason: "Individual BVN/NIN verification must pass before approval.",
      };
    }
  }

  if (partnerType === "business") {
    const dir = (kyc?.director?.status as KycStatus) || "pending";
    if (dir !== "passed") {
      return {
        ok: false,
        reason: "Director verification must pass before approval.",
      };
    }
  }

  const overall = (kyc?.overallStatus as KycStatus) || "pending";
  if (overall !== "passed") {
    return { ok: false, reason: "Overall KYC must be passed before approval." };
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const snap = await adminDb
      .collection("partner_applications")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const applications = snap.docs.map((doc) => {
      const d = doc.data() as any;
      const kycSummary = getKycSummary(d);
      return {
        id: doc.id,
        status: d?.status || "pending_review",
        partnerType: d?.partnerType || "individual",
        businessName: d?.businessName || "",
        firstName: d?.firstName || "",
        lastName: d?.lastName || "",
        email: d?.email || "",
        phoneNumber: d?.phoneNumber || "",
        cacNumber: d?.cacNumber || "",
        kycSummary,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error("Error fetching partner applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner applications." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Use approve|reject." },
        { status: 400 },
      );
    }

    const appRef = adminDb.collection("partner_applications").doc(id);
    const userRef = adminDb.collection("users").doc(id);
    const partnerRef = adminDb.collection("partners").doc(id);

    const now = FieldValue.serverTimestamp();

    let appForAudit: any = null;
    await adminDb.runTransaction(async (tx) => {
      const [appSnap, partnerSnap] = await Promise.all([
        tx.get(appRef),
        tx.get(partnerRef),
      ]);

      if (!appSnap.exists) {
        throw new Error("Application not found");
      }

      const app = appSnap.data() as any;
      appForAudit = app;
      if (action === "approve") {
        const eligible = canApprovePartner(app);
        if (!eligible.ok) {
          throw new Error(eligible.reason);
        }
      }

      if (action === "approve") {
        tx.set(
          appRef,
          {
            status: "approved",
            updatedAt: now,
            approvedAt: now,
            approvedBy: caller!.uid,
          },
          { merge: true },
        );
        tx.set(userRef, { role: "partner", updatedAt: now }, { merge: true });

        const d = app;
        const partnerPayload: Record<string, unknown> = {
          userId: id,
          status: "approved",
          partnerType: d?.partnerType || "individual",
          businessName: d?.businessName || "",
          email: d?.email || "",
          phoneNumber: d?.phoneNumber || "",
          updatedAt: now,
        };

        if (!partnerSnap.exists) {
          partnerPayload.createdAt = now;
          partnerPayload.live = false;
          partnerPayload.approvedVehicles = 0;
        }

        tx.set(partnerRef, partnerPayload, { merge: true });
      } else {
        tx.set(
          appRef,
          {
            status: "rejected",
            updatedAt: now,
            rejectedAt: now,
            rejectedBy: caller!.uid,
            rejectedReason: reason || "",
          },
          { merge: true },
        );
        tx.set(
          userRef,
          { role: "partner_applicant", updatedAt: now },
          { merge: true },
        );
      }
    });

    if (action === "approve") {
      const recordForClaims = await adminAuth.getUser(id);
      const existingClaims = recordForClaims.customClaims || {};
      await adminAuth.setCustomUserClaims(id, {
        ...existingClaims,
        role: "partner",
      });
    } else {
      const recordForClaims = await adminAuth.getUser(id);
      const existingClaims = recordForClaims.customClaims || {};
      await adminAuth.setCustomUserClaims(id, {
        ...existingClaims,
        role: "partner_applicant",
      });
    }

    try {
      const displayName = (() => {
        if (appForAudit?.partnerType === "business")
          return String(appForAudit?.businessName || "").trim() || "Partner";
        const fn = String(appForAudit?.firstName || "").trim();
        const ln = String(appForAudit?.lastName || "").trim();
        const full = `${fn} ${ln}`.trim();
        return full || "Partner";
      })();

      try {
        const resend = getResendClient();
        const from = getEmailFrom();
        if (resend && from) {
          const to = await resolvePartnerEmail(id, appForAudit);
          if (to) {
            const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
            const nextPath =
              action === "approve" ? "/partner" : "/register/partner";
            const link = `${baseUrl}/login?next=${encodeURIComponent(nextPath)}`;

            const appSnapAfter = await appRef.get();
            const appAfter = appSnapAfter.exists
              ? (appSnapAfter.data() as any)
              : null;
            const eventAt =
              action === "approve"
                ? appAfter?.approvedAt
                : appAfter?.rejectedAt;
            const eventKey =
              eventAt?.toDate?.()?.toISOString?.() ||
              String(
                appAfter?.updatedAt?.toDate?.()?.toISOString?.() || "",
              ).trim() ||
              new Date().toISOString();
            const lockId = `partner:${id}:application:${action}:${eventKey}`;
            const gotLock = await acquireEmailLock(lockId);

            if (gotLock) {
              const subject =
                action === "approve"
                  ? "RideOn: Your partner application is approved"
                  : "RideOn: Update needed for your partner application";

              const reasonLine =
                action === "reject" && reason
                  ? `Reason: ${reason}`
                  : action === "reject"
                    ? ""
                    : "";

              const headline =
                action === "approve"
                  ? `Hi ${displayName}, your partner application has been approved.`
                  : `Hi ${displayName}, your partner application needs an update before it can be approved.`;

              const nextLine =
                action === "approve"
                  ? "You can now sign in and access the Partner Portal."
                  : "Please sign in, correct the requested details, and submit again.";

              const text = [
                headline,
                reasonLine,
                "",
                nextLine,
                "",
                "Open:",
                link,
              ]
                .filter(Boolean)
                .join("\n");

              const html = `
                <p><strong>${headline}</strong></p>
                ${reasonLine ? `<p>${reasonLine}</p>` : ""}
                <p>${nextLine}</p>
                <p><a href="${link}">Open RideOn</a></p>
              `;

              try {
                await resend.emails.send({
                  from,
                  to,
                  subject,
                  text,
                  html,
                });
                await markEmailLock(lockId, { status: "sent" });
              } catch (e: any) {
                await markEmailLock(lockId, {
                  status: "failed",
                  error: e instanceof Error ? e.message : String(e),
                });
                console.error(
                  "[admin/partners/applications] Failed sending partner email",
                  e,
                );
              }
            }
          }
        }
      } catch (e) {
        console.error(
          "[admin/partners/applications] Failed preparing partner email",
          e,
        );
      }

      await createAuditLog({
        actionType:
          action === "approve"
            ? "partner_application_approved"
            : "partner_application_rejected",
        actorId: caller!.uid,
        actorEmail: caller!.email || "admin",
        targetId: id,
        targetType: "partner_application",
        details:
          action === "approve"
            ? `Approved partner application: ${displayName}`
            : `Rejected partner application: ${displayName}`,
        metadata: action === "reject" ? { reason: reason || "" } : undefined,
      });
    } catch {
      // ignore audit log failure
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating partner application:", error);
    const message = (error as any)?.message;
    if (typeof message === "string" && message) {
      // Validation/gating failures
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update partner application." },
      { status: 500 },
    );
  }
}
