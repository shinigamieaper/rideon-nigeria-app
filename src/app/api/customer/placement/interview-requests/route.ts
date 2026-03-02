export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import type {
  ConversationContext,
  ParticipantProfile,
} from "@/types/messaging";

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function parseAccessExpiresAt(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof (raw as any)?.toDate === "function") {
    try {
      return (raw as any).toDate();
    } catch {
      return null;
    }
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function safeNotes(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  return s.slice(0, 1200);
}

function toIso(input: any): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  if (input?.toDate) {
    try {
      return input.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (input instanceof Date) return input.toISOString();
  return undefined;
}

function requestStatusRank(status: string): number {
  const s = String(status || "").trim();
  if (s === "accepted" || s === "scheduled" || s === "admin_approved") return 3;
  if (s === "requested") return 2;
  if (s === "declined" || s === "cancelled") return 1;
  return 0;
}

function requestSortTs(r: {
  respondedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}): number {
  const ts = r.respondedAt || r.updatedAt || r.createdAt || "";
  const n = Date.parse(ts);
  return Number.isFinite(n) ? n : 0;
}

async function getCustomerUid(req: Request): Promise<string | null> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    const decoded = await verifyRideOnSessionCookie(session);
    if (decoded?.uid) return decoded.uid;
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    let usedFallback = false;

    try {
      snap = await adminDb
        .collection("placement_interview_requests")
        .where("customerId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    } catch (e: any) {
      const msg = String(e?.message || "");
      const code = (e && (e.code ?? e.status)) as unknown;
      if (msg.includes("requires an index") || code === 9) {
        usedFallback = true;
        snap = await adminDb
          .collection("placement_interview_requests")
          .where("customerId", "==", uid)
          .limit(50)
          .get();
      } else {
        throw e;
      }
    }

    const base = snap.docs.map((d) => {
      const v = d.data() as any;
      return {
        id: d.id,
        conversationId: String(v?.conversationId || ""),
        driverId: String(v?.driverId || ""),
        status: String(v?.status || "requested"),
        interviewType: String(v?.interviewType || "google_meet_video"),
        notes: typeof v?.notes === "string" ? v.notes : undefined,
        createdAt: toIso(v?.createdAt),
        updatedAt: toIso(v?.updatedAt),
        respondedAt: toIso(v?.respondedAt),
      };
    });

    if (usedFallback) {
      base.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
    }

    // Dedupe: keep a single best request per driver.
    // This prevents the UI from showing both an old 'requested' and a newer 'accepted' for the same driver.
    const byDriverId = new Map<string, (typeof base)[number]>();
    for (const r of base) {
      const key = typeof r.driverId === "string" ? r.driverId : "";
      if (!key) continue;
      const prev = byDriverId.get(key);
      if (!prev) {
        byDriverId.set(key, r);
        continue;
      }
      const rankPrev = requestStatusRank(prev.status);
      const rankNext = requestStatusRank(r.status);
      const tsPrev = requestSortTs(prev);
      const tsNext = requestSortTs(r);
      if (rankNext > rankPrev || (rankNext === rankPrev && tsNext > tsPrev)) {
        byDriverId.set(key, r);
      }
    }
    const dedupedBase = Array.from(byDriverId.values()).sort(
      (a, b) => requestSortTs(b) - requestSortTs(a),
    );

    const driverIds = Array.from(
      new Set(
        dedupedBase
          .map((r) => r.driverId)
          .filter((x) => typeof x === "string" && x.trim().length > 0),
      ),
    );

    const driverRefs = driverIds.map((id) =>
      adminDb.collection("users").doc(id),
    );
    const driverSnaps = driverRefs.length
      ? await adminDb.getAll(...driverRefs)
      : [];
    const driverById = new Map<string, any>();
    for (const s of driverSnaps) {
      if (!s.exists) continue;
      driverById.set(s.id, s.data() as any);
    }

    const requests = dedupedBase.map((r) => {
      const u = driverById.get(r.driverId) || {};
      const firstName =
        typeof u?.firstName === "string" ? u.firstName.trim() : "";
      const lastName = typeof u?.lastName === "string" ? u.lastName.trim() : "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();
      const avatarUrl =
        typeof u?.profileImageUrl === "string"
          ? String(u.profileImageUrl).trim()
          : "";
      return {
        ...r,
        driverName: name || "Driver",
        driverAvatarUrl: avatarUrl || null,
      };
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error(
      "[GET /api/customer/placement/interview-requests] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch interview requests." },
      { status: 500 },
    );
  }
}

async function readUserProfile(
  userId: string,
  role: "customer" | "driver",
): Promise<ParticipantProfile> {
  try {
    const s = await adminDb.collection("users").doc(userId).get();
    if (!s.exists) return { role };
    const d = s.data() as Record<string, unknown>;
    const firstName =
      typeof (d as any)?.firstName === "string"
        ? String((d as any).firstName).trim()
        : "";
    const lastName =
      typeof (d as any)?.lastName === "string"
        ? String((d as any).lastName).trim()
        : "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();

    const profile: ParticipantProfile = { role };
    if (name) profile.name = name;
    const avatar =
      typeof (d as any)?.profileImageUrl === "string"
        ? String((d as any).profileImageUrl).trim()
        : "";
    if (avatar) profile.avatarUrl = avatar;
    const email =
      typeof (d as any)?.email === "string"
        ? String((d as any).email).trim()
        : "";
    if (email) profile.email = email;
    const phone =
      typeof (d as any)?.phoneNumber === "string"
        ? String((d as any).phoneNumber).trim()
        : "";
    if (phone) profile.phone = phone;
    return profile;
  } catch {
    return { role };
  }
}

async function findOrCreatePlacementConversation(args: {
  customerId: string;
  driverId: string;
}): Promise<{ conversationId: string; created: boolean }> {
  const { customerId, driverId } = args;

  const [a, b] = [customerId, driverId].sort();
  const memberKey = `${a}|${b}|placement`;

  const existingSnap = await adminDb
    .collection("conversations")
    .where("memberKey", "==", memberKey)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return { conversationId: existingSnap.docs[0].id, created: false };
  }

  const [customerProfile, driverProfile] = await Promise.all([
    readUserProfile(customerId, "customer"),
    readUserProfile(driverId, "driver"),
  ]);

  const nowIso = new Date().toISOString();
  const convRef = adminDb.collection("conversations").doc();

  const context: ConversationContext = {
    customerId,
    driverId,
    channel: "in_app",
    source: "placement_portfolio",
  };

  await convRef.set({
    type: "general",
    memberIds: [customerId, driverId],
    memberKey,
    participantProfiles: {
      [customerId]: customerProfile,
      [driverId]: driverProfile,
    },
    createdBy: customerId,
    status: "open",
    priority: "normal",
    tags: [],
    context,
    lastMessage: "",
    lastMessageAt: nowIso,
    lastMessageSenderId: customerId,
    unreadCounts: {
      [customerId]: 0,
      [driverId]: 0,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return { conversationId: convRef.id, created: true };
}

export async function POST(req: Request) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const driverId =
      typeof (body as any)?.driverId === "string"
        ? String((body as any).driverId).trim()
        : "";
    const interviewTypeRaw =
      typeof (body as any)?.interviewType === "string"
        ? String((body as any).interviewType).trim()
        : "";
    const interviewType =
      interviewTypeRaw === "google_meet_audio" ||
      interviewTypeRaw === "google_meet_video" ||
      interviewTypeRaw === "in_person"
        ? interviewTypeRaw
        : "google_meet_video";
    const notes = safeNotes((body as any)?.notes);

    if (!driverId) {
      return NextResponse.json(
        { error: "driverId is required." },
        { status: 400 },
      );
    }

    const [driverSnap, customerSnap] = await Promise.all([
      adminDb.collection("drivers").doc(driverId).get(),
      adminDb.collection("users").doc(uid).get(),
    ]);

    if (!driverSnap.exists) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    const driverData = driverSnap.data() as any;
    if (String(driverData?.status || "") !== "approved") {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    const pool = driverData?.recruitmentPool === true;
    const visible = driverData?.recruitmentVisible === true;
    const placementStatus = String(driverData?.placementStatus || "available");
    const available = pool && visible && placementStatus !== "on_contract";

    if (!available) {
      return NextResponse.json(
        { error: "This driver is currently unavailable." },
        { status: 400 },
      );
    }

    const customerData = customerSnap.exists
      ? (customerSnap.data() as any)
      : {};
    const placementAccess =
      customerData?.placementAccess &&
      typeof customerData.placementAccess === "object"
        ? customerData.placementAccess
        : {};
    const expiresAt = parseAccessExpiresAt(placementAccess?.accessExpiresAt);
    const hasAccess = Boolean(expiresAt && expiresAt.getTime() > Date.now());

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You need active access to request an interview." },
        { status: 403 },
      );
    }

    let existingRequestId: string | null = null;
    let existingConversationId: string | null = null;
    let existingStatus: string | null = null;
    let existingTs = 0;

    try {
      const qs = await adminDb
        .collection("placement_interview_requests")
        .where("customerId", "==", uid)
        .where("driverId", "==", driverId)
        .limit(10)
        .get();
      for (const d of qs.docs) {
        const v = d.data() as any;
        const status = String(v?.status || "").trim() || "requested";
        if (status === "declined" || status === "cancelled") continue;
        const ts = requestSortTs({
          respondedAt: toIso(v?.respondedAt),
          updatedAt: toIso(v?.updatedAt),
          createdAt: toIso(v?.createdAt),
        });
        const rank = requestStatusRank(status);
        const prevRank = existingStatus
          ? requestStatusRank(existingStatus)
          : -1;
        if (
          !existingRequestId ||
          rank > prevRank ||
          (rank === prevRank && ts > existingTs)
        ) {
          existingRequestId = d.id;
          existingConversationId =
            typeof v?.conversationId === "string" ? v.conversationId : null;
          existingStatus = status;
          existingTs = ts;
        }
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      const code = (e && (e.code ?? e.status)) as unknown;
      if (msg.includes("requires an index") || code === 9) {
        const qs = await adminDb
          .collection("placement_interview_requests")
          .where("customerId", "==", uid)
          .limit(50)
          .get();
        for (const d of qs.docs) {
          const v = d.data() as any;
          if (String(v?.driverId || "") !== driverId) continue;
          const status = String(v?.status || "").trim() || "requested";
          if (status === "declined" || status === "cancelled") continue;
          const ts = requestSortTs({
            respondedAt: toIso(v?.respondedAt),
            updatedAt: toIso(v?.updatedAt),
            createdAt: toIso(v?.createdAt),
          });
          const rank = requestStatusRank(status);
          const prevRank = existingStatus
            ? requestStatusRank(existingStatus)
            : -1;
          if (
            !existingRequestId ||
            rank > prevRank ||
            (rank === prevRank && ts > existingTs)
          ) {
            existingRequestId = d.id;
            existingConversationId =
              typeof v?.conversationId === "string" ? v.conversationId : null;
            existingStatus = status;
            existingTs = ts;
          }
        }
      } else {
        throw e;
      }
    }

    if (existingRequestId && existingConversationId) {
      return NextResponse.json(
        {
          success: true,
          created: false,
          requestId: existingRequestId,
          conversationId: existingConversationId,
        },
        { status: 200 },
      );
    }

    const customerName =
      [
        String(customerData?.firstName || "").trim(),
        String(customerData?.lastName || "").trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Customer";
    const customerAvatarUrl =
      typeof customerData?.profileImageUrl === "string"
        ? customerData.profileImageUrl.trim()
        : "";

    const { conversationId } = await findOrCreatePlacementConversation({
      customerId: uid,
      driverId,
    });

    try {
      const convRef = adminDb.collection("conversations").doc(conversationId);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(convRef);
        if (!snap.exists) return;
        const existing = snap.data() as any;
        const ctx =
          existing?.context && typeof existing.context === "object"
            ? existing.context
            : {};
        const prev =
          typeof ctx?.placementContactStatus === "string"
            ? String(ctx.placementContactStatus)
            : "";
        if (!prev) {
          tx.update(convRef, {
            "context.placementContactStatus": "requested",
            updatedAt: new Date().toISOString(),
          });
        }
      });
    } catch (e) {
      console.warn(
        "[POST /api/customer/placement/interview-requests] Failed to set placementContactStatus on conversation",
        e,
      );
    }

    const requestRef = adminDb.collection("placement_interview_requests").doc();

    const payload: Record<string, unknown> = {
      conversationId,
      driverId,
      customerId: uid,
      customerName,
      customerAvatarUrl: customerAvatarUrl || null,
      status: "requested",
      interviewType,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (notes) payload.notes = notes;

    await requestRef.set(payload, { merge: true });

    try {
      await adminDb
        .collection("users")
        .doc(driverId)
        .collection("notifications")
        .add({
          type: "placement_interview_request_new",
          title: "New interview request",
          message: `${customerName} requested an interview.`,
          unread: true,
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.warn(
        "[POST /api/customer/placement/interview-requests] failed to notify driver",
        e,
      );
    }

    return NextResponse.json(
      {
        success: true,
        created: true,
        requestId: requestRef.id,
        conversationId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[POST /api/customer/placement/interview-requests] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to request interview." },
      { status: 500 },
    );
  }
}
