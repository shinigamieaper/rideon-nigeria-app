import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

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

function normalizeAnyDocumentUrls(
  input: any,
  ownerUid: string,
  depth = 0,
): any {
  if (depth > 6) return input;
  if (typeof input === "string")
    return normalizeCloudinaryDocUrl(input, ownerUid);
  if (!input || typeof input !== "object") return input;
  if (input instanceof Date) return input;

  if (Array.isArray(input)) {
    return input.map((v) => normalizeAnyDocumentUrls(v, ownerUid, depth + 1));
  }

  const out: Record<string, any> = { ...input };
  for (const [k, v] of Object.entries(out)) {
    if (k === "payload") continue;
    out[k] = normalizeAnyDocumentUrls(v, ownerUid, depth + 1);
  }
  return out;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const { id: rawId } = await context.params;
    const id = String(rawId || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const snap = await adminDb.collection("partner_applications").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const d = snap.data() as any;
    const normalized = normalizeAnyDocumentUrls(d, id);
    return NextResponse.json(
      {
        id: snap.id,
        ...normalized,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner application detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner application." },
      { status: 500 },
    );
  }
}
