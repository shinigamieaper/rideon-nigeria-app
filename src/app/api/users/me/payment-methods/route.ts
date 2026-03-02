import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/users/me/payment-methods
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Fetch default id from users doc
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const defaultId =
      (userDoc.exists && (userDoc.data() as any)?.defaultPaymentMethodId) ||
      null;

    // List cards from subcollection users/{uid}/payment_methods
    const snap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("payment_methods")
      .orderBy("createdAt", "desc")
      .get();

    const methods = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        brand: data.brand || "Card",
        last4: data.last4 || "0000",
        expMonth: data.expMonth || null,
        expYear: data.expYear || null,
        isDefault: defaultId ? d.id === defaultId : false,
        createdAt: data.createdAt || null,
      };
    });

    return NextResponse.json({ methods }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods." },
      { status: 500 },
    );
  }
}

// POST /api/users/me/payment-methods
// Body: { mock?: true } OR { authorization: { reference: string } }
export async function POST(req: Request) {
  try {
    const isDev = process.env.NODE_ENV !== "production";

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));

    let brand = "Card";
    let last4 = "0000";
    let expMonth: number | null = null;
    let expYear: number | null = null;
    let meta: any = {};

    if (body?.mock) {
      if (!isDev) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      // Dev helper: generate a fake card
      const now = new Date();
      brand = "VISA";
      last4 = String(Math.floor(1000 + Math.random() * 9000));
      expMonth = (now.getMonth() + 1) % 12 || 12;
      expYear = now.getFullYear() + 2;
      meta = { mock: true };
    } else if (body?.authorization?.reference) {
      const ref = String(body.authorization.reference);
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) {
        return NextResponse.json(
          { error: "PAYSTACK_SECRET_KEY not configured on server." },
          { status: 400 },
        );
      }

      // Resolve email for cross-check
      let userEmail: string | undefined =
        typeof (decoded as any)?.email === "string"
          ? (decoded as any).email
          : undefined;
      if (!userEmail) {
        try {
          const u = await adminAuth.getUser(uid);
          userEmail = u.email ?? undefined;
        } catch {
          // ignore
        }
      }

      if (!userEmail) {
        return NextResponse.json(
          { error: "User email is required." },
          { status: 400 },
        );
      }

      try {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
          {
            headers: { Authorization: `Bearer ${secret}` },
            cache: "no-store",
          },
        );
        const j = await verifyRes.json();
        if (!verifyRes.ok || !j?.data) {
          throw new Error(j?.message || "Paystack verify failed");
        }

        const status = String(j?.data?.status || "").toLowerCase();
        if (status !== "success") {
          return NextResponse.json(
            { error: "Payment not successful." },
            { status: 400 },
          );
        }

        const paystackEmailRaw = j?.data?.customer?.email;
        const paystackEmail =
          typeof paystackEmailRaw === "string"
            ? paystackEmailRaw.trim().toLowerCase()
            : "";
        if (!paystackEmail) {
          return NextResponse.json(
            { error: "Unable to verify payment owner." },
            { status: 400 },
          );
        }

        if (paystackEmail !== String(userEmail).trim().toLowerCase()) {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        // Optional: metadata UID match if present
        const metaUid =
          typeof j?.data?.metadata?.uid === "string"
            ? j.data.metadata.uid.trim()
            : "";
        if (metaUid && metaUid !== uid) {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const auth = j.data.authorization || {};
        brand = auth.card_type || j.data.channel || "Card";
        last4 = auth.last4 || "0000";
        expMonth = Number(auth.exp_month) || null;
        expYear = Number(auth.exp_year) || null;
        meta = {
          authorizationCode: auth.authorization_code || null,
          bin: auth.bin || null,
          signature: j.data.signature || null,
          reference: ref,
        };
      } catch (e) {
        console.error("Paystack verify error", e);
        return NextResponse.json(
          { error: "Unable to verify card with Paystack." },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const doc = {
      brand,
      last4,
      expMonth,
      expYear,
      createdAt: new Date().toISOString(),
      meta,
    } as const;

    const refAdd = await adminDb
      .collection("users")
      .doc(uid)
      .collection("payment_methods")
      .add(doc as any);

    return NextResponse.json({ id: refAdd.id }, { status: 201 });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json(
      { error: "Failed to add payment method." },
      { status: 500 },
    );
  }
}
