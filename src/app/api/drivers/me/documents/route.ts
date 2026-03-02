import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

function normalizeCloudinaryDocUrl(url: any, ownerUid: string): any {
  if (typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed) return url;
  if (trimmed.startsWith("/api/files/")) return trimmed;

  if (
    trimmed.startsWith("https://res.cloudinary.com/") ||
    trimmed.startsWith("http://res.cloudinary.com/")
  ) {
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      const resourceType = ["image", "raw", "video"].includes(parts[1])
        ? parts[1]
        : "raw";
      const uploadIdx = parts.findIndex(
        (p) => p === "upload" || p === "authenticated",
      );
      if (uploadIdx === -1 || uploadIdx + 1 >= parts.length) return url;

      const deliveryType =
        parts[uploadIdx] === "authenticated" ? "authenticated" : "upload";
      const versionAndRest = parts.slice(uploadIdx + 1);
      const versionIdx = versionAndRest.findIndex((p) => /^v\d+$/.test(p));
      const withoutVersion =
        versionIdx >= 0 ? versionAndRest.slice(versionIdx + 1) : versionAndRest;
      const publicIdWithExt = withoutVersion.join("/");
      if (!publicIdWithExt) return url;

      const lastDot = publicIdWithExt.lastIndexOf(".");
      const publicId =
        lastDot > 0 ? publicIdWithExt.slice(0, lastDot) : publicIdWithExt;
      const ext = lastDot > 0 ? publicIdWithExt.slice(lastDot + 1) : "";

      const descriptor = {
        provider: "cloudinary",
        ownerUid,
        publicId,
        resourceType,
        deliveryType,
        ...(ext ? { format: ext } : {}),
      };
      const encoded = Buffer.from(JSON.stringify(descriptor), "utf8").toString(
        "base64",
      );
      return `/api/files/${encodeURIComponent(encoded)}`;
    } catch {
      return url;
    }
  }

  return url;
}

export const runtime = "nodejs";

// Fleet driver documents
const REQUIRED_DOCUMENTS = [
  { key: "driversLicense", name: "Driver's License" },
  { key: "governmentId", name: "Government ID" },
  { key: "lasdriCard", name: "LASDRI Card (optional)" },
];

// GET /api/drivers/me/documents
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    // Fetch minimal user + driver docs
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};

    const driverSnap = await adminDb.collection("drivers").doc(uid).get();
    if (!driverSnap.exists) {
      return NextResponse.json(
        { error: "Driver profile not found." },
        { status: 404 },
      );
    }

    const data = driverSnap.data() as any;

    const requiredDocs = REQUIRED_DOCUMENTS;

    const documents = requiredDocs.map((doc) => {
      const legacyKey =
        doc.key === "driversLicense"
          ? "driversLicenseUrl"
          : doc.key === "lasdriCard"
            ? "lasdriCardUrl"
            : undefined;

      const docData =
        data?.documents?.[doc.key] ??
        (legacyKey ? data?.documents?.[legacyKey] : undefined);
      const rawUrl = typeof docData === "string" ? docData : docData?.url;
      const docUrl = normalizeCloudinaryDocUrl(rawUrl, uid);
      const docStatus = docData?.status || (docUrl ? "pending" : "missing");
      const expiryDate = docData?.expiryDate;

      return {
        name: doc.name,
        key: doc.key,
        url: docUrl,
        status: docStatus,
        expiryDate: expiryDate,
      };
    });

    const track = (userData?.driverTrack as any) || "fleet";
    return NextResponse.json({ track, documents }, { status: 200 });
  } catch (error) {
    console.error("Error fetching driver documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents." },
      { status: 500 },
    );
  }
}
