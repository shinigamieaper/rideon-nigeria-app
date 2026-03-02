import { NextResponse } from "next/server";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebaseAdmin";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

// Simple per-UID rate limiter (in-memory, best-effort)
const RATE_LIMIT_WINDOW_MS = Number(
  process.env.UPLOAD_RATE_WINDOW_MS || 10 * 60 * 1000,
); // 10 minutes
const RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT || 5); // 5 requests per window
const rateStore = new Map<string, number[]>();

const SINGLE_UPLOAD_ALLOWED_KEYS = new Set([
  "driversLicense",
  "governmentId",
  "lasdriCard",
]);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      throw new Error("Missing Authorization Bearer token.");
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const driverSnap = await adminDb.collection("drivers").doc(uid).get();
    if (driverSnap.exists) {
      const status = driverSnap.get("status");
      if (status && status !== "pending_review") {
        return NextResponse.json(
          { error: "Uploads are only allowed during registration." },
          { status: 403 },
        );
      }
    }

    // Rate limit check
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

    const singleKey = String(form.get("key") || "").trim();
    const singleFile = form.get("file");

    const toFile = (v: FormDataEntryValue | null, name: string): File => {
      if (!(v instanceof File) || v.size === 0) {
        throw new Error(`Missing or invalid ${name} file`);
      }
      return v;
    };

    const toOptionalFile = (v: FormDataEntryValue | null): File | null => {
      if (!v) return null;
      if (!(v instanceof File) || v.size === 0) return null;
      return v;
    };

    const isSingleUpload = Boolean(singleKey && singleFile);

    const driversLicense = isSingleUpload
      ? null
      : toFile(form.get("driversLicense"), "driversLicense");
    const governmentId = isSingleUpload
      ? null
      : toFile(form.get("governmentId"), "governmentId");
    const lasdriCard = isSingleUpload
      ? null
      : toOptionalFile(form.get("lasdriCard"));

    // Enforce a size limit to avoid long timeouts on slow networks (default 10MB per file)
    const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024);
    const tooBig = isSingleUpload
      ? (() => {
          const f = toFile(singleFile as any, singleKey || "file");
          return (f.size as number) > MAX_BYTES
            ? ([singleKey, f.size] as const)
            : null;
        })()
      : [
          ["driversLicense", driversLicense!.size],
          ["governmentId", governmentId!.size],
          ...(lasdriCard ? ([["lasdriCard", lasdriCard.size]] as const) : []),
        ].find(([, sz]) => (sz as number) > MAX_BYTES);
    if (tooBig) {
      const [name, sz] = tooBig as [string, number];
      return NextResponse.json(
        {
          error: `${name} is too large (${(sz / 1024 / 1024).toFixed(1)}MB). Max ${(MAX_BYTES / 1024 / 1024).toFixed(1)}MB per file.`,
        },
        { status: 413 },
      );
    }

    // Prefer Cloudinary if configured (works on free tier), else fallback to Firebase Storage
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudKey = process.env.CLOUDINARY_API_KEY;
    const cloudSecret = process.env.CLOUDINARY_API_SECRET;

    const useCloudinary = Boolean(cloudName && cloudKey && cloudSecret);

    if (useCloudinary) {
      cloudinary.config({
        cloud_name: cloudName!,
        api_key: cloudKey!,
        api_secret: cloudSecret!,
        secure: true,
        // Increase default timeout to better tolerate slow connections
        timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000), // 3 minutes
      });
    }

    if (!useCloudinary && !adminBucket) {
      throw new Error(
        "No upload backend configured. Either configure Firebase Storage (set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET and enable Storage) or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.local.",
      );
    }

    const save = async (file: File, key: string) => {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const contentType = file.type || "application/octet-stream";
      const buffer = Buffer.from(await file.arrayBuffer());

      if (useCloudinary) {
        const folder = `drivers/${uid}`;
        const publicId = `${key}-${Date.now()}`;
        try {
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
          const encoded = Buffer.from(
            JSON.stringify(descriptor),
            "utf8",
          ).toString("base64");
          return {
            id: encoded,
            url: `/api/files/${encodeURIComponent(encoded)}`,
          };
        } catch (e: any) {
          const name = e?.name || "";
          const http = e?.http_code || 0;
          const msg = String(e?.message || "");
          const looksLikeTimeout =
            name === "TimeoutError" || http === 499 || /timeout/i.test(msg);
          if (looksLikeTimeout && adminBucket) {
            console.warn(
              "[uploads] Cloudinary timeout, falling back to Firebase Storage for",
              key,
            );
            // Fall through to Storage path below
          } else {
            throw e;
          }
        }
      }

      {
        // Firebase Storage path
        const path = `drivers/${uid}/${key}-${Date.now()}.${ext}`;
        const gcsFile = adminBucket!.file(path);
        await gcsFile.save(buffer, {
          resumable: false,
          contentType,
          metadata: {
            metadata: { uid, key },
            cacheControl: "private, max-age=31536000, immutable",
          },
        });
        const base64Path = Buffer.from(path, "utf8").toString("base64");
        return {
          id: base64Path,
          url: `/api/files/${encodeURIComponent(base64Path)}`,
        };
      }
    };

    if (isSingleUpload) {
      if (!SINGLE_UPLOAD_ALLOWED_KEYS.has(singleKey)) {
        return NextResponse.json({ error: "Invalid key." }, { status: 400 });
      }

      const f = toFile(singleFile as any, singleKey);
      const normalizedKey =
        singleKey === "driversLicense"
          ? "drivers-license"
          : singleKey === "governmentId"
            ? "government-id"
            : "lasdri-card";

      const saved = await save(f, normalizedKey);
      return NextResponse.json({ url: saved.url }, { status: 201 });
    }

    const dl = await save(driversLicense!, "drivers-license");
    const gid = await save(governmentId!, "government-id");
    const lc = lasdriCard ? await save(lasdriCard, "lasdri-card") : null;

    return NextResponse.json(
      {
        driversLicenseUrl: dl.url,
        governmentIdUrl: gid.url,
        lasdriCardUrl: lc?.url || "",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in uploads/driver-docs:", error);
    return NextResponse.json(
      { error: "Failed to upload documents." },
      { status: 500 },
    );
  }
}
