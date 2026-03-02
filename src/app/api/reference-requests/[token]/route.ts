import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

type ReferenceRequestStatus = "pending" | "submitted" | "expired";

function isExpired(expiresAt: any): boolean {
  try {
    const dt = expiresAt?.toDate?.();
    if (dt instanceof Date) return dt.getTime() < Date.now();
  } catch {
    // ignore
  }
  return false;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token: rawToken } = await context.params;
    const token = String(rawToken || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    const ref = adminDb.collection("reference_requests").doc(token);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Reference request not found." },
        { status: 404 },
      );
    }

    const d = snap.data() as any;

    const expired = isExpired(d?.expiresAt);
    const status: ReferenceRequestStatus = expired
      ? "expired"
      : (d?.status as ReferenceRequestStatus) || "pending";

    return NextResponse.json(
      {
        status,
        referenceName: d?.reference?.name || "",
        relationship: d?.reference?.relationship || "",
        applicantName: d?.applicantName || "",
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        expiresAt: d?.expiresAt?.toDate?.()?.toISOString?.() || null,
        submittedAt: d?.submittedAt?.toDate?.()?.toISOString?.() || null,
        response: d?.response
          ? {
              recommend: !!d.response.recommend,
              comments:
                typeof d.response.comments === "string"
                  ? d.response.comments
                  : "",
            }
          : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching reference request:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference request." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token: rawToken } = await context.params;
    const token = String(rawToken || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const recommend = body?.recommend;
    const comments =
      typeof body?.comments === "string" ? body.comments.trim() : "";

    if (typeof recommend !== "boolean") {
      return NextResponse.json(
        { error: "Invalid recommend value." },
        { status: 400 },
      );
    }

    const requestRef = adminDb.collection("reference_requests").doc(token);

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(requestRef);
      if (!snap.exists) {
        return {
          ok: false as const,
          status: 404 as const,
          error: "Reference request not found.",
        };
      }

      const d = snap.data() as any;
      const expired = isExpired(d?.expiresAt);
      if (expired) {
        tx.set(
          requestRef,
          { status: "expired", updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
        return {
          ok: false as const,
          status: 410 as const,
          error: "This reference request has expired.",
        };
      }

      if (d?.status === "submitted") {
        return { ok: true as const, already: true as const };
      }

      tx.set(
        requestRef,
        {
          status: "submitted",
          submittedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          response: {
            recommend,
            comments,
          },
        },
        { merge: true },
      );

      const applicantUid = String(d?.applicantUid || "").trim();
      const flow = String(d?.flow || "").trim();
      const applicantCollection =
        flow === "full_time"
          ? "full_time_driver_applications"
          : flow === "on_demand"
            ? "drivers"
            : "";

      if (applicantUid && applicantCollection) {
        const applicantRef = adminDb
          .collection(applicantCollection)
          .doc(applicantUid);

        // Best-effort counter update without overwriting referencesSummary.required
        tx.update(applicantRef, {
          "referencesSummary.completed": FieldValue.increment(1),
          referencesUpdatedAt: FieldValue.serverTimestamp(),
        });
      }

      return { ok: true as const, already: false as const };
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { success: true, alreadySubmitted: result.already },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error submitting reference:", error);
    return NextResponse.json(
      { error: "Failed to submit reference." },
      { status: 500 },
    );
  }
}
