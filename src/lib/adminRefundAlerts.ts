import { adminDb } from "@/lib/firebaseAdmin";
import { sendNotificationToAdminUser } from "@/lib/fcmAdmin";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export type RefundAlertAdminRole =
  | "super_admin"
  | "ops_admin"
  | "finance_admin";

function getBaseUrl(): string {
  const raw = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  return raw ? raw.replace(/\/$/, "") : "http://localhost:3000";
}

export async function sendRefundAttentionAdmins(args: {
  bookingId: string;
  title: string;
  message: string;
  roles?: RefundAlertAdminRole[];
}): Promise<void> {
  const roles =
    args.roles && args.roles.length > 0
      ? args.roles
      : ["super_admin", "ops_admin", "finance_admin"];

  const snap = await adminDb
    .collection("users")
    .where("isAdmin", "==", true)
    .limit(200)
    .get();

  const recipients = snap.docs
    .map((d) => {
      const data = d.data() as any;
      return {
        uid: d.id,
        role: String(data?.adminRole || "admin"),
        email: typeof data?.email === "string" ? data.email.trim() : "",
      };
    })
    .filter((u) => roles.includes(u.role as RefundAlertAdminRole));

  const reservationLinkPath = `/admin/reservations?open=${encodeURIComponent(args.bookingId)}`;

  await Promise.allSettled(
    recipients.map((r) =>
      sendNotificationToAdminUser(r.uid, {
        title: args.title,
        body: args.message,
        data: {
          type: "refund_attention",
          bookingId: args.bookingId,
        },
        clickAction: reservationLinkPath,
      }),
    ),
  );

  try {
    const resend = getResendClient();
    const from = getEmailFrom();
    const to = recipients.map((r) => r.email).filter(Boolean);
    if (!resend || !from || to.length === 0) return;

    const baseUrl = getBaseUrl();
    const link = `${baseUrl}${reservationLinkPath}`;

    const subject = `[Refund Alert] ${args.title}`;
    const text = [args.message, "", "Review:", link].join("\n");
    const html = `
      <p>${args.message}</p>
      <p>Review:</p>
      <p><a href="${link}">${link}</a></p>
    `;

    await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
  } catch (e) {
    console.error("[refund alerts] Failed sending admin emails:", e);
  }
}
