import { NextResponse } from "next/server";
import { getResendClient, getSupportEmailFrom } from "@/lib/resendServer";

export const runtime = "nodejs";

interface SupportContactPayload {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const body = rawBody as Partial<SupportContactPayload>;

    const fullName = (body.fullName ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim();
    const subject = (body.subject ?? "").toString().trim();
    const message = (body.message ?? "").toString().trim();

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: "Full name, email, and message are required." },
        { status: 400 },
      );
    }

    const to = process.env.SUPPORT_EMAIL_TO;
    const resend = getResendClient();
    const from = getSupportEmailFrom();

    if (!resend || !from || !to) {
      console.error(
        "[support/contact] Missing RESEND or support email configuration",
      );
      return NextResponse.json(
        { error: "Support email is not configured." },
        { status: 500 },
      );
    }

    const safeSubject =
      subject || `New support message from ${fullName || email}`;
    const finalSubject = `[Support] ${safeSubject}`;

    const plainTextLines = [
      `New support message from ${fullName || "Unknown"}`,
      "",
      `Email: ${email || "N/A"}`,
      "",
      "Message:",
      message,
    ];

    const plainText = plainTextLines.join("\n");

    const htmlMessage = message
      ? message
          .split("\n")
          .map((line) => line.trim() || "<br />")
          .join("<br />")
      : "";

    const html = `
      <p>New support message from <strong>${fullName || "Unknown"}</strong></p>
      <p><strong>Email:</strong> ${email || "N/A"}</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <p><strong>Message:</strong></p>
      <p>${htmlMessage}</p>
    `;

    await resend.emails.send({
      from,
      to,
      subject: finalSubject,
      text: plainText,
      html,
      replyTo: email ? [email] : undefined,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error sending support contact email:", error);
    return NextResponse.json(
      { error: "Failed to send support email." },
      { status: 500 },
    );
  }
}
