import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = Number(
  process.env.UPLOAD_RATE_WINDOW_MS || 10 * 60 * 1000,
);
const RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT || 10);
const rateStore = new Map<string, number[]>();

const ALLOWED_KEYS = new Set([
  "driversLicenseUrl",
  "governmentIdUrl",
  "lasdriCardUrl",
  "policeReportUrl",
  "medicalReportUrl",
  "eyeTestUrl",
]);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const now = Date.now();
    const bucket = rateStore.get(uid) || [];
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const recent = bucket.filter((t) => t > cutoff);
    if (recent.length >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        { status: 429 },
      );
    }
    recent.push(now);
    rateStore.set(uid, recent);

    const form = await req.formData();
    const key = String(form.get("key") || "").trim();
    const v = form.get("file");

    if (!key || !ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: "Invalid key." }, { status: 400 });
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
    const ext = (v.name.split(".").pop() || "bin").toLowerCase();

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudKey = process.env.CLOUDINARY_API_KEY;
    const cloudSecret = process.env.CLOUDINARY_API_SECRET;

    const useCloudinary = Boolean(cloudName && cloudKey && cloudSecret);

    if (!useCloudinary) {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
        },
        { status: 500 },
      );
    }

    cloudinary.config({
      cloud_name: cloudName!,
      api_key: cloudKey!,
      api_secret: cloudSecret!,
      secure: true,
      timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000),
    });

    const folder = `full_time_driver_applications/${uid}`;
    const publicId = key;

    const result = await new Promise<any>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: "auto",
          type: "authenticated",
          overwrite: true,
          use_filename: false,
          unique_filename: false,
          context: { uid, key },
          timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000),
        },
        (err, result) => {
          if (err || !result?.public_id)
            return reject(err || new Error("Upload failed"));
          resolve(result);
        },
      );
      upload.end(buffer);
    });

    const descriptor = {
      provider: "cloudinary",
      ownerUid: uid,
      publicId: String(result?.public_id || ""),
      resourceType: String(result?.resource_type || "raw"),
      deliveryType: "authenticated",
      format: String(result?.format || ext || "bin"),
    };
    const encoded = Buffer.from(JSON.stringify(descriptor), "utf8").toString(
      "base64",
    );

    return NextResponse.json(
      { url: `/api/files/${encodeURIComponent(encoded)}` },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in uploads/full-time-driver-docs:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 },
    );
  }
}
