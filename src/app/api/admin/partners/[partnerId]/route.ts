import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

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
      "[admin/partners/[partnerId]] Failed to update email lock",
      lockId,
      e,
    );
  }
}

async function resolvePartnerEmail(id: string, partner: any): Promise<string> {
  const fromPartner =
    typeof partner?.email === "string" ? partner.email.trim() : "";
  if (fromPartner) return fromPartner;

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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ partnerId: string }> },
) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    const { partnerId } = await context.params;
    const id = (partnerId || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (action !== "suspend" && action !== "reinstate") {
      return NextResponse.json(
        { error: "Invalid action. Use suspend|reinstate." },
        { status: 400 },
      );
    }

    const partnerRef = adminDb.collection("partners").doc(id);
    const snap = await partnerRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partnerForEmail = snap.data() as any;

    const now = FieldValue.serverTimestamp();
    const nowDate = new Date();

    if (action === "suspend") {
      await partnerRef.set(
        {
          status: "suspended",
          suspendedAt: now,
          suspendedBy: caller!.uid,
          suspensionReason: reason || "Suspended by admin",
          updatedAt: now,
        },
        { merge: true },
      );

      const vSnap = await adminDb
        .collection("vehicles")
        .where("partnerId", "==", id)
        .where("status", "==", "available")
        .limit(500)
        .get();

      if (!vSnap.empty) {
        const batch = adminDb.batch();
        vSnap.docs.forEach((v) => {
          batch.set(
            v.ref,
            {
              status: "unavailable",
              partnerSuspensionActive: true,
              partnerSuspensionPrevStatus: "available",
              partnerSuspendedAt: now,
              partnerSuspendedBy: caller!.uid,
              updatedAt: now,
            },
            { merge: true },
          );
        });
        await batch.commit();
      }

      let bookingsUpdated = 0;
      try {
        const partnerVehiclesSnap = await adminDb
          .collection("vehicles")
          .where("partnerId", "==", id)
          .limit(500)
          .get();

        const listingIds = partnerVehiclesSnap.docs
          .map((d) => d.id)
          .filter(Boolean);

        const isEligibleBooking = (booking: any): boolean => {
          const paymentStatus = String(booking?.payment?.status || "");
          const isPaid = paymentStatus === "succeeded";
          if (!isPaid) return false;

          const status = String(booking?.status || "");
          if (
            [
              "completed",
              "cancelled_by_customer",
              "cancelled_by_driver",
              "cancelled_by_admin",
            ].includes(status)
          )
            return false;
          if (status === "needs_reassignment") return false;

          const sched: Date | null = (() => {
            try {
              const t =
                booking?.scheduledPickupTime?.toDate?.() ??
                booking?.scheduledPickupTime ??
                null;
              if (t) {
                const dt = new Date(t);
                if (!isNaN(dt.getTime())) return dt;
              }
            } catch {}
            if (booking?.startDate) {
              const [y, m, dd] = String(booking.startDate)
                .split("-")
                .map((n: string) => parseInt(n, 10));
              const [hh, mm] = String(booking.startTime || "00:00")
                .split(":")
                .map((n: string) => parseInt(n, 10));
              const dt = new Date(
                y || 1970,
                (m || 1) - 1,
                dd || 1,
                hh || 0,
                mm || 0,
              );
              return isNaN(dt.getTime()) ? null : dt;
            }
            return null;
          })();

          const isFuture = sched ? sched.getTime() >= nowDate.getTime() : true;
          return isFuture;
        };

        const chunks: string[][] = [];
        for (let i = 0; i < listingIds.length; i += 10) {
          chunks.push(listingIds.slice(i, i + 10));
        }

        const toUpdate: FirebaseFirestore.DocumentReference[] = [];

        for (const chunk of chunks) {
          if (chunk.length === 0) continue;
          const bookingsSnap = await adminDb
            .collection("bookings")
            .where("listingId", "in", chunk)
            .limit(500)
            .get();

          bookingsSnap.forEach((doc) => {
            const d = doc.data() as any;
            if (isEligibleBooking(d)) {
              toUpdate.push(doc.ref);
            }
          });
        }

        for (let i = 0; i < toUpdate.length; i += 450) {
          const slice = toUpdate.slice(i, i + 450);
          const batch = adminDb.batch();
          slice.forEach((ref) => {
            batch.set(
              ref,
              {
                status: "needs_reassignment",
                needsReassignmentAt: now,
                needsReassignmentReason: reason || "Partner suspended",
                needsReassignmentSource: "partner_suspension",
                needsReassignmentPartnerId: id,
                needsReassignmentBy: caller!.uid,
                updatedAt: now,
              },
              { merge: true },
            );
          });
          await batch.commit();
          bookingsUpdated += slice.length;
        }
      } catch (e) {
        console.warn(
          "[Partner suspend] Failed to cascade bookings to needs_reassignment",
          e,
        );
      }

      await createAuditLog({
        actionType: "partner_suspended",
        actorId: caller!.uid,
        actorEmail: caller!.email || "admin",
        targetId: id,
        targetType: "partner",
        details: `Suspended partner ${id}`,
        metadata: reason ? { reason } : undefined,
      });

      await createAuditLog({
        actionType: "reservation_needs_reassignment",
        actorId: caller!.uid,
        actorEmail: caller!.email || "admin",
        targetId: id,
        targetType: "partner",
        details: `Marked reservations as needs_reassignment for suspended partner ${id}`,
        metadata: {
          reason: reason || "Partner suspended",
          vehiclesUpdated: vSnap.size,
          bookingsUpdated,
        },
      });

      try {
        const resend = getResendClient();
        const from = getEmailFrom();
        if (resend && from) {
          const to = await resolvePartnerEmail(id, partnerForEmail);
          if (to) {
            const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
            const link = `${baseUrl}/login?next=${encodeURIComponent("/partner")}`;

            const partnerAfterSnap = await partnerRef.get();
            const partnerAfter = partnerAfterSnap.exists
              ? (partnerAfterSnap.data() as any)
              : null;
            const suspendedAtIso =
              partnerAfter?.suspendedAt?.toDate?.()?.toISOString?.() ||
              new Date().toISOString();

            const lockId = `partner:${id}:status:suspended:${suspendedAtIso}`;
            const gotLock = await acquireEmailLock(lockId);
            if (gotLock) {
              const displayName =
                String(partnerForEmail?.businessName || "").trim() || "Partner";
              const subject = "RideOn: Your partner account has been suspended";
              const reasonLine = reason ? `Reason: ${reason}` : "";
              const nextLine =
                "If you believe this is a mistake, please reply to this email or contact support.";
              const text = [
                `Hi ${displayName}, your partner account has been suspended.`,
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
                <p><strong>Hi ${displayName}, your partner account has been suspended.</strong></p>
                ${reasonLine ? `<p>${reasonLine}</p>` : ""}
                <p>${nextLine}</p>
                <p><a href="${link}">Open RideOn</a></p>
              `;

              try {
                await resend.emails.send({ from, to, subject, text, html });
                await markEmailLock(lockId, { status: "sent" });
              } catch (e: any) {
                await markEmailLock(lockId, {
                  status: "failed",
                  error: e instanceof Error ? e.message : String(e),
                });
                console.error(
                  "[admin/partners/[partnerId]] Failed sending suspend email",
                  e,
                );
              }
            }
          }
        }
      } catch (e) {
        console.error(
          "[admin/partners/[partnerId]] Failed preparing suspend email",
          e,
        );
      }

      return NextResponse.json(
        {
          success: true,
          partner: { id, status: "suspended" },
          vehiclesUpdated: vSnap.size,
          bookingsUpdated,
        },
        { status: 200 },
      );
    }

    // reinstate
    await partnerRef.set(
      {
        status: "approved",
        reinstatedAt: now,
        reinstatedBy: caller!.uid,
        updatedAt: now,
      },
      { merge: true },
    );

    const vSnap = await adminDb
      .collection("vehicles")
      .where("partnerId", "==", id)
      .where("partnerSuspensionActive", "==", true)
      .limit(500)
      .get();

    if (!vSnap.empty) {
      const batch = adminDb.batch();
      vSnap.docs.forEach((v) => {
        const d = v.data() as any;
        const prev =
          typeof d?.partnerSuspensionPrevStatus === "string"
            ? d.partnerSuspensionPrevStatus
            : "available";
        batch.set(
          v.ref,
          {
            status: prev,
            partnerSuspensionActive: false,
            partnerSuspensionPrevStatus: FieldValue.delete(),
            partnerSuspendedAt: FieldValue.delete(),
            partnerSuspendedBy: FieldValue.delete(),
            updatedAt: now,
          },
          { merge: true },
        );
      });
      await batch.commit();
    }

    await createAuditLog({
      actionType: "partner_reinstated",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: id,
      targetType: "partner",
      details: `Reinstated partner ${id}`,
    });

    try {
      const resend = getResendClient();
      const from = getEmailFrom();
      if (resend && from) {
        const to = await resolvePartnerEmail(id, partnerForEmail);
        if (to) {
          const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
          const link = `${baseUrl}/login?next=${encodeURIComponent("/partner")}`;

          const partnerAfterSnap = await partnerRef.get();
          const partnerAfter = partnerAfterSnap.exists
            ? (partnerAfterSnap.data() as any)
            : null;
          const reinstatedAtIso =
            partnerAfter?.reinstatedAt?.toDate?.()?.toISOString?.() ||
            new Date().toISOString();

          const lockId = `partner:${id}:status:reinstated:${reinstatedAtIso}`;
          const gotLock = await acquireEmailLock(lockId);
          if (gotLock) {
            const displayName =
              String(partnerForEmail?.businessName || "").trim() || "Partner";
            const subject = "RideOn: Your partner account has been reinstated";
            const nextLine =
              "You can now sign in and continue using the Partner Portal.";
            const text = [
              `Hi ${displayName}, your partner account has been reinstated.`,
              "",
              nextLine,
              "",
              "Open:",
              link,
            ]
              .filter(Boolean)
              .join("\n");
            const html = `
              <p><strong>Hi ${displayName}, your partner account has been reinstated.</strong></p>
              <p>${nextLine}</p>
              <p><a href="${link}">Open RideOn</a></p>
            `;

            try {
              await resend.emails.send({ from, to, subject, text, html });
              await markEmailLock(lockId, { status: "sent" });
            } catch (e: any) {
              await markEmailLock(lockId, {
                status: "failed",
                error: e instanceof Error ? e.message : String(e),
              });
              console.error(
                "[admin/partners/[partnerId]] Failed sending reinstate email",
                e,
              );
            }
          }
        }
      }
    } catch (e) {
      console.error(
        "[admin/partners/[partnerId]] Failed preparing reinstate email",
        e,
      );
    }

    return NextResponse.json(
      {
        success: true,
        partner: { id, status: "approved" },
        vehiclesUpdated: vSnap.size,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating partner:", error);
    return NextResponse.json(
      { error: "Failed to update partner." },
      { status: 500 },
    );
  }
}
