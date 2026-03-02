import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

export const runtime = "nodejs";

const ALLOWED_DOCUMENT_KEYS = new Set([
  "driversLicense",
  "governmentId",
  "lasdriCard",
]);

// POST /api/drivers/me/documents/presigned-url
export async function POST(req: Request) {
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

    const body = await req.json();
    const { documentKey, fileName } = body;

    if (!documentKey || !fileName) {
      return NextResponse.json(
        { error: "Missing documentKey or fileName." },
        { status: 400 },
      );
    }

    if (
      typeof documentKey !== "string" ||
      !ALLOWED_DOCUMENT_KEYS.has(documentKey)
    ) {
      return NextResponse.json(
        { error: "Invalid documentKey." },
        { status: 400 },
      );
    }

    // Configure Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudKey = process.env.CLOUDINARY_API_KEY;
    const cloudSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !cloudKey || !cloudSecret) {
      return NextResponse.json(
        {
          error: "File upload is not configured. Please contact support.",
        },
        { status: 500 },
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudKey,
      api_secret: cloudSecret,
      secure: true,
    });

    // Generate upload parameters
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `drivers/${uid}/documents`;
    const publicId = `${documentKey}-${timestamp}`;

    // Parameters to sign
    const paramsToSign = {
      timestamp,
      folder,
      public_id: publicId,
      resource_type: "auto",
      overwrite: true,
    };

    // Generate signature
    const signatureString = Object.entries(paramsToSign)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const signature = crypto
      .createHash("sha256")
      .update(signatureString + cloudSecret)
      .digest("hex");

    // Build upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    // Expected file URL after upload
    const fileUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${folder}/${publicId}`;

    return NextResponse.json(
      {
        uploadUrl,
        fileUrl,
        uploadParams: {
          ...paramsToSign,
          signature,
          api_key: cloudKey,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL." },
      { status: 500 },
    );
  }
}
