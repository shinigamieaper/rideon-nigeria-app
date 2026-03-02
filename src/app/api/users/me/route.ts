import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

let firestoreOutageUntil = 0;

function isFirestoreInOutage(): boolean {
  return Date.now() < firestoreOutageUntil;
}

function markFirestoreOutage(ms: number) {
  firestoreOutageUntil = Math.max(firestoreOutageUntil, Date.now() + ms);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try {
      decoded = await withTimeout(
        adminAuth.verifyIdToken(token),
        3_000,
        "[users/me] verifyIdToken",
      );
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = decoded.uid;

    // 1) Read Firestore users/{uid} (only fetch required fields)
    let fsData: any = {};
    if (!isFirestoreInOutage()) {
      try {
        const snap = await withTimeout(
          adminDb.collection("users").doc(uid).get(),
          3_000,
          "[users/me] users doc",
        );
        console.log("[users/me] uid=%s usersDoc.exists=%s", uid, snap.exists);
        if (snap.exists) fsData = snap.data() || {};
      } catch (e) {
        markFirestoreOutage(30_000);
        console.warn(
          "[users/me] Firestore read failed; will try auth fallback",
          e,
        );
      }
    }

    // 2) Read Auth record for email/displayName fallback
    let authRecord: any = {};
    try {
      authRecord = await withTimeout(
        adminAuth.getUser(uid),
        3_000,
        "[users/me] getUser",
      );
    } catch (e) {
      console.warn("[users/me] getUser fallback failed", e);
    }

    // Resolve fields with fallbacks
    const displayName = (authRecord.displayName || "").trim();
    const email =
      (fsData.email || authRecord.email || decoded.email || "")?.trim() || null;
    const firstName =
      (fsData.firstName || (displayName ? displayName.split(" ")[0] : null)) ??
      null;
    const lastName =
      (fsData.lastName ||
        (displayName
          ? displayName.split(" ").slice(1).join(" ") || null
          : null)) ??
      null;
    const phoneNumber =
      (
        fsData.phoneNumber ||
        authRecord.phoneNumber ||
        decoded.phone_number ||
        ""
      )?.trim() || null;
    const profileImageUrl =
      (fsData.profileImageUrl || authRecord.photoURL || null) ?? null;
    const avatarColor = (fsData.avatarColor || null) ?? null;
    const onboardingTours = (
      fsData.onboardingTours && typeof fsData.onboardingTours === "object"
        ? fsData.onboardingTours
        : {}
    ) as Record<string, { status?: string; updatedAt?: string }>;

    return NextResponse.json(
      {
        firstName,
        lastName,
        email,
        phoneNumber,
        profileImageUrl,
        avatarColor,
        onboardingTours,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching current user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try {
      decoded = await withTimeout(
        adminAuth.verifyIdToken(token),
        2500,
        "[users/me PUT] verifyIdToken",
      );
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const firstName =
      typeof body?.firstName === "string" ? body.firstName.trim() : undefined;
    const lastName =
      typeof body?.lastName === "string" ? body.lastName.trim() : undefined;
    const email =
      typeof body?.email === "string" ? body.email.trim() : undefined;
    const phoneNumber =
      typeof body?.phoneNumber === "string"
        ? body.phoneNumber.trim()
        : undefined;
    const profileImageUrl =
      typeof body?.profileImageUrl === "string"
        ? body.profileImageUrl.trim()
        : undefined;
    const avatarColor =
      typeof body?.avatarColor === "string"
        ? body.avatarColor.trim()
        : undefined;
    const defaultPaymentMethodId =
      typeof body?.defaultPaymentMethodId === "string"
        ? body.defaultPaymentMethodId.trim()
        : undefined;
    const rawOnboardingTours = body?.onboardingTours;

    const onboardingTours:
      | Record<string, { status: TourStatus; updatedAt: string }>
      | undefined =
      rawOnboardingTours && typeof rawOnboardingTours === "object"
        ? Object.fromEntries(
            Object.entries(rawOnboardingTours as Record<string, any>)
              .map(([k, v]) => {
                const status = v?.status;
                if (status !== "completed" && status !== "dismissed")
                  return null;
                return [
                  k,
                  {
                    status,
                    updatedAt: new Date().toISOString(),
                  },
                ] as const;
              })
              .filter(Boolean) as any,
          )
        : undefined;

    const update: Record<string, any> = {};
    if (typeof firstName !== "undefined") update.firstName = firstName;
    if (typeof lastName !== "undefined") update.lastName = lastName;
    if (typeof email !== "undefined") update.email = email;
    if (typeof phoneNumber !== "undefined") update.phoneNumber = phoneNumber;
    if (typeof profileImageUrl !== "undefined")
      update.profileImageUrl = profileImageUrl || null;
    if (typeof avatarColor !== "undefined")
      update.avatarColor = avatarColor || null;
    if (typeof defaultPaymentMethodId !== "undefined")
      update.defaultPaymentMethodId = defaultPaymentMethodId || null;
    if (typeof onboardingTours !== "undefined") {
      Object.entries(onboardingTours).forEach(([k, v]) => {
        update[`onboardingTours.${k}`] = v;
      });
    }
    update.updatedAt = new Date().toISOString();

    try {
      await withTimeout(
        adminDb.collection("users").doc(uid).set(update, { merge: true }),
        3000,
        "[users/me PUT] users set",
      );
    } catch (e) {
      markFirestoreOutage(30_000);
      throw e;
    }

    // Best-effort: update displayName if name provided (do not block on errors)
    if (firstName || lastName) {
      try {
        const displayName = [firstName, lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (displayName)
          await withTimeout(
            adminAuth.updateUser(uid, { displayName }),
            2500,
            "[users/me PUT] updateUser",
          );
      } catch (e) {
        console.warn("[users/me PUT] update displayName failed", e);
      }
    }

    return NextResponse.json(
      {
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        profileImageUrl: profileImageUrl ?? null,
        avatarColor: avatarColor ?? null,
        onboardingTours: onboardingTours ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}

type TourStatus = "completed" | "dismissed";
