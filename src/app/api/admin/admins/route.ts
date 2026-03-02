export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string | null;
}

/**
 * GET /api/admin/admins
 * List all users with admin privileges
 */
export async function GET(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, ["super_admin"]);
    if (response) return response;

    // Query users collection for admin users
    const adminsSnapshot = await adminDb
      .collection("users")
      .where("isAdmin", "==", true)
      .limit(100)
      .get();

    const admins: AdminUser[] = [];

    for (const doc of adminsSnapshot.docs) {
      const data = doc.data();
      admins.push({
        uid: doc.id,
        email: data.email || "",
        displayName:
          `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Admin",
        role: data.adminRole || "admin",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      });
    }

    // Also check Firebase Auth custom claims for any admins not in users collection
    // This is a fallback - ideally all admins should be in users collection

    return NextResponse.json({ admins }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin users." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/admins
 * Add admin privileges to a user
 * Body: { email: string, role?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, ["super_admin"]);
    if (response) return response;

    const body = await req.json();
    const { email, role = "admin" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const validRoles = [
      "admin",
      "super_admin",
      "ops_admin",
      "driver_admin",
      "product_admin",
      "finance_admin",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 },
      );
    }

    // Find user by email in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "User not found with this email" },
          { status: 404 },
        );
      }
      throw err;
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      ...userRecord.customClaims,
      admin: true,
      adminRole: role,
    });

    // Update users collection
    await adminDb.collection("users").doc(userRecord.uid).set(
      {
        isAdmin: true,
        adminRole: role,
        adminGrantedAt: new Date(),
        adminGrantedBy: caller!.uid,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    // Create audit log
    await createAuditLog({
      actionType: "admin_added",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: userRecord.uid,
      targetType: "user",
      details: `Added admin privileges to ${email} with role: ${role}`,
      metadata: { role },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${email} is now an admin with role: ${role}`,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || email,
          role,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error adding admin:", error);
    return NextResponse.json(
      { error: "Failed to add admin." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/admins
 * Remove admin privileges from a user
 * Body: { uid: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, ["super_admin"]);
    if (response) return response;

    const body = await req.json();
    const { uid } = body;

    if (!uid || typeof uid !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Prevent self-removal
    if (uid === caller!.uid) {
      return NextResponse.json(
        { error: "You cannot remove your own admin privileges" },
        { status: 400 },
      );
    }

    // Get user record
    let userRecord;
    try {
      userRecord = await adminAuth.getUser(uid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      throw err;
    }

    // Remove admin claims
    const existingClaims = userRecord.customClaims || {};
    delete existingClaims.admin;
    delete existingClaims.adminRole;
    await adminAuth.setCustomUserClaims(uid, existingClaims);

    // Update users collection
    await adminDb.collection("users").doc(uid).set(
      {
        isAdmin: false,
        adminRole: null,
        adminRevokedAt: new Date(),
        adminRevokedBy: caller!.uid,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    // Create audit log
    await createAuditLog({
      actionType: "admin_removed",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: uid,
      targetType: "user",
      details: `Removed admin privileges from ${userRecord.email}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Admin privileges removed from ${userRecord.email}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error removing admin:", error);
    return NextResponse.json(
      { error: "Failed to remove admin." },
      { status: 500 },
    );
  }
}
