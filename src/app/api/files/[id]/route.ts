import { NextResponse, type NextRequest } from "next/server";
import {
  adminBucket,
  adminAuth,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

type CloudinaryFileDescriptor = {
  provider: "cloudinary";
  ownerUid?: string;
  publicId: string;
  resourceType?: string;
  deliveryType?: string;
  format?: string;
};

function parseCloudinaryDescriptor(
  decoded: string,
): CloudinaryFileDescriptor | null {
  if (!decoded || decoded[0] !== "{") return null;
  try {
    const obj = JSON.parse(decoded);
    if (!obj || typeof obj !== "object") return null;
    if ((obj as any).provider !== "cloudinary") return null;
    if (
      typeof (obj as any).publicId !== "string" ||
      !(obj as any).publicId.trim()
    )
      return null;
    return {
      provider: "cloudinary",
      ownerUid:
        typeof (obj as any).ownerUid === "string"
          ? String((obj as any).ownerUid)
          : undefined,
      publicId: String((obj as any).publicId),
      resourceType:
        typeof (obj as any).resourceType === "string"
          ? String((obj as any).resourceType)
          : undefined,
      deliveryType:
        typeof (obj as any).deliveryType === "string"
          ? String((obj as any).deliveryType)
          : undefined,
      format:
        typeof (obj as any).format === "string"
          ? String((obj as any).format)
          : undefined,
    };
  } catch {
    return null;
  }
}

function getOwnerUidFromCloudinaryPublicId(publicId: string): string | null {
  const pid = String(publicId || "");
  let m = pid.match(/^driver_docs\/([^/]+)\//);
  if (m?.[1]) return m[1];
  m = pid.match(/^full_time_driver_applications\/([^/]+)\//);
  if (m?.[1]) return m[1];
  m = pid.match(/^full-time-driver-applications\/([^/]+)\//);
  if (m?.[1]) return m[1];
  m = pid.match(/^drivers\/([^/]+)\//);
  if (m?.[1]) return m[1];
  m = pid.match(/^partners\/([^/]+)\//);
  if (m?.[1]) return m[1];
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing file id." }, { status: 400 });
    }

    const urlObj = new URL(req.url);
    const resolveOnly = urlObj.searchParams.get("resolve") === "1";
    const download = urlObj.searchParams.get("download") === "1";

    // Require auth and verify (Bearer token preferred, fallback to session cookie)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    let decoded: any | null = null;

    if (token) {
      try {
        decoded = await adminAuth.verifyIdToken(token);
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      const session = req.cookies.get("rideon_session")?.value || "";
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      decoded = await verifyRideOnSessionCookie(session);
      if (!decoded) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const requesterUid = decoded.uid;
    const isAdmin = Boolean(
      (decoded as any).admin === true ||
        (decoded as any)?.token?.admin === true,
    );

    let decodedId = "";
    try {
      decodedId = Buffer.from(decodeURIComponent(id), "base64").toString(
        "utf8",
      );
    } catch {
      decodedId = "";
    }

    const cld = parseCloudinaryDescriptor(decodedId);
    if (cld) {
      const inferredOwnerUid = getOwnerUidFromCloudinaryPublicId(cld.publicId);

      // Non-admin access must be tied to a verifiable owner-scoped publicId.
      // Do not trust `ownerUid` provided inside the descriptor.
      if (!isAdmin) {
        if (!inferredOwnerUid || inferredOwnerUid !== requesterUid) {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }
      }

      const ownerUid =
        inferredOwnerUid ??
        (typeof cld.ownerUid === "string" && cld.ownerUid.trim()
          ? cld.ownerUid.trim()
          : null);
      if (!ownerUid && !isAdmin) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const cloudKey = process.env.CLOUDINARY_API_KEY;
      const cloudSecret = process.env.CLOUDINARY_API_SECRET;
      if (!cloudName || !cloudKey || !cloudSecret) {
        return NextResponse.json(
          { error: "Cloudinary is not configured." },
          { status: 500 },
        );
      }

      cloudinary.config({
        cloud_name: cloudName,
        api_key: cloudKey,
        api_secret: cloudSecret,
        signature_algorithm: "sha256",
        secure: true,
        timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000),
      });

      const resourceType = cld.resourceType || "raw";
      let deliveryType = cld.deliveryType || "authenticated";
      if (
        deliveryType === "upload" &&
        (cld.publicId.startsWith("driver_docs/") ||
          cld.publicId.startsWith("full_time_driver_applications/") ||
          cld.publicId.startsWith("full-time-driver-applications/") ||
          cld.publicId.startsWith("drivers/"))
      ) {
        deliveryType = "authenticated";
      }

      const proxyBasePath = urlObj.pathname;
      const proxyUrl = `${proxyBasePath}${download ? "?download=1" : ""}`;

      const expiresAt =
        Math.floor(Date.now() / 1000) +
        Number(process.env.CLOUDINARY_SIGNED_URL_TTL_SECONDS || 300);

      if (resolveOnly) {
        const fmt = String(cld.format || "").toLowerCase();
        const isPdf = fmt === "pdf";
        const isImage =
          [
            "png",
            "jpg",
            "jpeg",
            "webp",
            "gif",
            "bmp",
            "svg",
            "tif",
            "tiff",
          ].includes(fmt) || false;

        const kind: "pdf" | "image" | "other" = isPdf
          ? "pdf"
          : isImage
            ? "image"
            : "other";

        const res = NextResponse.json(
          {
            url: proxyUrl,
            kind,
          },
          { status: 200 },
        );
        res.headers.set("Cache-Control", "private, no-store");
        return res;
      }

      const fmtRaw = String(cld.format || "")
        .trim()
        .toLowerCase();
      const fmt = fmtRaw || "bin";
      const privateDownloadUrlFn = (cloudinary as any)?.utils
        ?.private_download_url as
        | ((
            publicId: string,
            format: string,
            options?: Record<string, any>,
          ) => string)
        | undefined;

      if (!privateDownloadUrlFn) {
        return NextResponse.json(
          { error: "Cloudinary download helper is not available." },
          { status: 500 },
        );
      }

      const upstreamUrl = privateDownloadUrlFn(cld.publicId, fmt, {
        resource_type: resourceType,
        type: deliveryType,
        expires_at: expiresAt,
        attachment: download,
      });

      const range = req.headers.get("range");
      const upstreamRes = await fetch(upstreamUrl, {
        headers: range ? { range } : undefined,
        redirect: "follow",
      });

      if (!upstreamRes.ok || !upstreamRes.body) {
        const details = await upstreamRes.text().catch(() => "");
        console.error(
          "[api/files] Cloudinary upstream failed:",
          upstreamRes.status,
          details.slice(0, 500),
        );
        return NextResponse.json(
          { error: "Failed to fetch file." },
          { status: upstreamRes.status || 502 },
        );
      }

      const contentType =
        upstreamRes.headers.get("content-type") || "application/octet-stream";
      const contentLength = upstreamRes.headers.get("content-length");
      const contentRange = upstreamRes.headers.get("content-range");
      const acceptRanges = upstreamRes.headers.get("accept-ranges");

      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": download ? "attachment" : "inline",
      };
      if (contentLength) headers["Content-Length"] = contentLength;
      if (contentRange) headers["Content-Range"] = contentRange;
      if (acceptRanges) headers["Accept-Ranges"] = acceptRanges;

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers,
      });
    }

    const path = decodedId || Buffer.from(id, "base64").toString("utf8");

    if (!isAdmin) {
      const p = String(path || "").trim();
      const ok =
        p === `drivers/${requesterUid}` ||
        p.startsWith(`drivers/${requesterUid}/`) ||
        p === `full-time-driver-applications/${requesterUid}` ||
        p.startsWith(`full-time-driver-applications/${requesterUid}/`) ||
        p === `full_time_driver_applications/${requesterUid}` ||
        p.startsWith(`full_time_driver_applications/${requesterUid}/`);

      if (!ok) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    if (!adminBucket) {
      return NextResponse.json(
        {
          error:
            "File proxy is not configured. Enable Firebase Storage or use direct Cloudinary URLs.",
        },
        { status: 501 },
      );
    }
    // Enforce owner-based access for private driver/applicant paths unless admin
    const enforceOwner = (ownerUid: string | undefined) => {
      if (!ownerUid)
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      if (!isAdmin && ownerUid !== requesterUid) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      return null;
    };

    if (path.startsWith("drivers/")) {
      const parts = path.split("/");
      const ownerUid = parts[1];
      const res = enforceOwner(ownerUid);
      if (res) return res;
    }

    if (
      path.startsWith("full-time-driver-applications/") ||
      path.startsWith("full_time_driver_applications/")
    ) {
      const parts = path.split("/");
      const ownerUid = parts[1];
      const res = enforceOwner(ownerUid);
      if (res) return res;
    }
    const file = adminBucket.file(path);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    let contentType = "application/octet-stream";
    try {
      const [meta] = await file.getMetadata();
      contentType = meta.contentType || contentType;
    } catch {}

    if (resolveOnly) {
      const kind: "pdf" | "image" | "other" =
        contentType === "application/pdf"
          ? "pdf"
          : contentType.startsWith("image/")
            ? "image"
            : "other";
      const res = NextResponse.json(
        { url: urlObj.pathname, kind },
        { status: 200 },
      );
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }

    const nodeStream = file.createReadStream();
    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) =>
          controller.enqueue(new Uint8Array(chunk)),
        );
        nodeStream.on("error", (err) => controller.error(err));
        nodeStream.on("end", () => controller.close());
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": download ? "attachment" : "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error in files/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch file." },
      { status: 500 },
    );
  }
}
