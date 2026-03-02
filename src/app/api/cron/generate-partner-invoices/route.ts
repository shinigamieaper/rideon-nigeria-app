import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RentalUnit = "day" | "4h";

type Period = {
  id: string; // YYYY-MM
  start: Date;
  end: Date;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function computePeriod(params: { now: Date; month?: string | null }): Period {
  const month = String(params.month || "").trim();

  if (month) {
    const m = /^([0-9]{4})-([0-9]{2})$/.exec(month);
    if (m) {
      const year = Number(m[1]);
      const monthIndex = Number(m[2]) - 1;
      const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
      return { id: `${year}-${pad2(monthIndex + 1)}`, start, end };
    }
  }

  // Default: previous calendar month
  const now = params.now;
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return {
    id: `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}`,
    start,
    end,
  };
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function resolvePartnerBaseRates(vehicle: any): {
  day: number | null;
  block4h: number | null;
} {
  const baseDay = asNumber(vehicle?.partnerBaseDayRateNgn);
  const explicitBlock = asNumber(vehicle?.partnerBaseBlock4hRateNgn);
  const baseBlock =
    explicitBlock ?? (baseDay != null ? Math.round(baseDay * 0.5) : null);

  return {
    day: baseDay != null && baseDay > 0 ? Math.round(baseDay) : null,
    block4h: baseBlock != null && baseBlock > 0 ? Math.round(baseBlock) : null,
  };
}

function resolveBookingRentalUnit(booking: any): RentalUnit | null {
  const unit = String(
    booking?.rentalUnit || booking?.pricing?.rentalUnit || "",
  ).trim();
  if (unit === "day" || unit === "4h") return unit;
  return null;
}

function resolveBookingQuantity(booking: any): number {
  const q = asNumber(booking?.pricing?.quantity);
  if (q != null && q > 0) return Math.max(1, Math.floor(q));

  const unit = resolveBookingRentalUnit(booking);
  if (!unit) return 1;

  if (unit === "day") {
    const sd = String(booking?.startDate || "").trim();
    const ed = String(booking?.endDate || "").trim();
    if (sd && ed) {
      const a = new Date(sd + "T00:00:00");
      const b = new Date(ed + "T00:00:00");
      const diff =
        Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (Number.isFinite(diff) && diff > 0) return Math.max(1, diff);
    }
    return 1;
  }

  // 4h
  const explicitBlocks = asNumber(booking?.blocks);
  if (explicitBlocks != null && explicitBlocks > 0)
    return Math.max(1, Math.floor(explicitBlocks));

  const sd = String(booking?.startDate || "").trim();
  const st = String(booking?.startTime || "").trim();
  const et = String(booking?.endTime || "").trim();
  if (sd && st && et) {
    const start = new Date(`${sd}T${st}:00`);
    const end = new Date(`${sd}T${et}:00`);
    let hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    if (!Number.isFinite(hours) || hours <= 0) hours = 4;
    return Math.max(1, Math.ceil(hours / 4));
  }

  return 1;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim();
  const authHeader = String(req.headers.get("authorization") || "").trim();
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  const { searchParams } = new URL(req.url);
  const querySecret = String(searchParams.get("secret") || "").trim();

  const vercelCron = String(req.headers.get("x-vercel-cron") || "").trim();
  const isVercelCron =
    vercelCron === "1" || vercelCron.toLowerCase() === "true";

  if (secret) {
    return bearer === secret || querySecret === secret;
  }

  return process.env.NODE_ENV !== "production" || isVercelCron;
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url, token };
}

async function upstashCommand(cmd: unknown[]): Promise<any> {
  const cfg = getUpstashConfig();
  if (!cfg) throw new Error("Missing Upstash config");

  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      typeof json?.error === "string" ? json.error : "Upstash request failed";
    throw new Error(msg);
  }
  return json;
}

async function acquireCronLock(params: {
  key: string;
  ttlMs: number;
}): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  const cfg = getUpstashConfig();
  if (!cfg) {
    return { acquired: true, release: async () => {} };
  }

  const value = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const setRes = await upstashCommand([
    "SET",
    params.key,
    value,
    "NX",
    "PX",
    params.ttlMs,
  ]);
  const ok = String(setRes?.result || "") === "OK";
  if (!ok) {
    return { acquired: false, release: async () => {} };
  }

  const release = async () => {
    try {
      await upstashCommand([
        "EVAL",
        "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
        1,
        params.key,
        value,
      ]);
    } catch {
      // ignore
    }
  };

  return { acquired: true, release };
}

async function generate(req: NextRequest) {
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const force = url.searchParams.get("force") === "1";
  const dryRun = url.searchParams.get("dryRun") === "1";
  const includeEmpty = url.searchParams.get("includeEmpty") === "1";

  const period = computePeriod({ now: new Date(), month });

  const runStartedAt = new Date();

  const partnersSnap = await adminDb
    .collection("partner_applications")
    .where("status", "==", "approved")
    .get();

  let partnersScanned = 0;
  let invoicesCreated = 0;
  let invoicesUpdated = 0;
  let invoicesSkipped = 0;
  let errors = 0;

  for (const p of partnersSnap.docs) {
    partnersScanned += 1;
    const partnerId = p.id;

    try {
      const vehiclesSnap = await adminDb
        .collection("vehicles")
        .where("partnerId", "==", partnerId)
        .get();
      const vehicles = vehiclesSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      let bookingCount = 0;
      const vehicleCount = vehicles.length;
      let totalAmount = 0;
      let dayUnits = 0;
      let blockUnits = 0;
      let missingRateBookings = 0;
      let overrideBookings = 0;

      for (const v of vehicles) {
        const listingId = v.id;
        const rates = resolvePartnerBaseRates(v);

        let lastDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null =
          null;

        // Paginate bookings per vehicle
        for (;;) {
          let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
            adminDb
              .collection("bookings")
              .where("listingId", "==", listingId)
              .where("status", "==", "completed")
              .where("payment.status", "==", "succeeded")
              .where("completionTime", ">=", period.start)
              .where("completionTime", "<", period.end)
              .orderBy("completionTime", "asc")
              .limit(250);

          if (lastDoc) {
            q = q.startAfter(lastDoc);
          }

          const snap = await q.get();
          if (snap.empty) break;

          for (const b of snap.docs) {
            const bd = b.data() as any;

            const unit = resolveBookingRentalUnit(bd);
            if (!unit) continue;

            const quantity = resolveBookingQuantity(bd);

            const override = asNumber(bd?.settlement?.partnerPayoutOverrideNgn);
            if (override != null && override >= 0) {
              totalAmount += Math.round(override);
              bookingCount += 1;
              overrideBookings += 1;
              if (unit === "day") dayUnits += quantity;
              else blockUnits += quantity;
              continue;
            }

            const baseRate = unit === "day" ? rates.day : rates.block4h;
            if (baseRate == null) {
              missingRateBookings += 1;
              continue;
            }

            totalAmount += Math.round(baseRate * quantity);
            bookingCount += 1;
            if (unit === "day") dayUnits += quantity;
            else blockUnits += quantity;
          }

          lastDoc = snap.docs[snap.docs.length - 1];

          if (snap.size < 250) break;
        }
      }

      if (!includeEmpty && bookingCount === 0) {
        invoicesSkipped += 1;
        continue;
      }

      const invoiceRef = adminDb
        .collection("partner_applications")
        .doc(partnerId)
        .collection("invoices")
        .doc(period.id);

      const now = FieldValue.serverTimestamp();

      const payload: Record<string, unknown> = {
        amount: Math.round(totalAmount),
        currency: "NGN",
        status: "issued",
        periodStart: period.start,
        periodEnd: period.end,
        bookingCount,
        vehicleCount,
        units: {
          day: dayUnits,
          block4h: blockUnits,
        },
        missingRateBookings,
        overrideBookings,
        generatedFrom: "cron_generate_partner_invoices_v1",
        generatedAt: now,
        updatedAt: now,
      };

      if (dryRun) continue;

      const txResult = await adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(invoiceRef);
        if (existing.exists && !force) {
          return { wrote: false as const, existed: true as const };
        }

        if (existing.exists) {
          tx.set(invoiceRef, payload, { merge: true });
          return { wrote: true as const, existed: true as const };
        }

        tx.set(invoiceRef, { ...payload, createdAt: now }, { merge: true });
        return { wrote: true as const, existed: false as const };
      });

      if (!txResult.wrote) {
        invoicesSkipped += 1;
      } else if (txResult.existed) {
        invoicesUpdated += 1;
      } else {
        invoicesCreated += 1;
      }
    } catch (e) {
      errors += 1;
      console.error(
        "[cron/generate-partner-invoices] Failed for partner",
        partnerId,
        e,
      );
    }
  }

  return {
    ok: true,
    period: {
      id: period.id,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
    dryRun,
    force,
    partnersScanned,
    invoicesCreated,
    invoicesUpdated,
    invoicesSkipped,
    errors,
    runStartedAt: runStartedAt.toISOString(),
    runFinishedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lock = await acquireCronLock({
      key: "lock:cron:generate-partner-invoices",
      ttlMs: 15 * 60 * 1000,
    });
    if (!lock.acquired) {
      return NextResponse.json(
        { error: "Cron job already running." },
        { status: 409 },
      );
    }

    try {
      const result = await generate(req);
      return NextResponse.json(result, { status: 200 });
    } finally {
      await lock.release();
    }
  } catch (error) {
    console.error("[cron/generate-partner-invoices] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate partner invoices." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lock = await acquireCronLock({
      key: "lock:cron:generate-partner-invoices",
      ttlMs: 15 * 60 * 1000,
    });
    if (!lock.acquired) {
      return NextResponse.json(
        { error: "Cron job already running." },
        { status: 409 },
      );
    }

    try {
      const result = await generate(req);
      return NextResponse.json(result, { status: 200 });
    } finally {
      await lock.release();
    }
  } catch (error) {
    console.error("[cron/generate-partner-invoices] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate partner invoices." },
      { status: 500 },
    );
  }
}
