import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

// Simple per-UID rate limiter (in-memory, best-effort)
const RATE_LIMIT_WINDOW_MS = Number(
  process.env.UPLOAD_RATE_WINDOW_MS || 10 * 60 * 1000,
); // 10 minutes
const RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT || 10); // 10 requests per window
const rateStore = new Map<string, number[]>();

const ALLOWED_KINDS = new Set(["partner_driver", "partner_vehicle"]);

export async function POST(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Rate limit check
    const now = Date.now();
    const bucket = rateStore.get(ctx.actorUid) || [];
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const recent = bucket.filter((t) => t > cutoff);
    if (recent.length >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        { status: 429 },
      );
    }
    recent.push(now);
    rateStore.set(ctx.actorUid, recent);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudKey = process.env.CLOUDINARY_API_KEY;
    const cloudSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !cloudKey || !cloudSecret) {
      return NextResponse.json(
        { error: "Upload backend is not configured." },
        { status: 500 },
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudKey,
      api_secret: cloudSecret,
      secure: true,
      timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000),
    });

    const form = await req.formData();
    const kind = String(form.get("kind") || "").trim();
    const key = String(form.get("key") || "").trim();
    const v = form.get("file");

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
    }
    if (!key) {
      return NextResponse.json({ error: "Missing key." }, { status: 400 });
    }
    if (!(v instanceof File) || v.size === 0) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
    if (v.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large (${(v.size / 1024 / 1024).toFixed(1)}MB). Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)}MB.`,
        },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await v.arrayBuffer());

    const folder = `partners/${ctx.partnerId}/${kind}`;
    const publicId = `${key}-${Date.now()}`;

    const secureUrl = await new Promise<string>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "auto",
          overwrite: true,
          use_filename: false,
          unique_filename: false,
          context: { uid: ctx.actorUid, partnerId: ctx.partnerId, kind, key },
          timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000),
        },
        (err, result) => {
          if (err || !result?.secure_url)
            return reject(err || new Error("Upload failed"));
          resolve(result.secure_url);
        },
      );
      upload.end(buffer);
    });

    return NextResponse.json({ url: secureUrl }, { status: 201 });
  } catch (error) {
    console.error("Error in partner/uploads:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 },
    );
  }
}
