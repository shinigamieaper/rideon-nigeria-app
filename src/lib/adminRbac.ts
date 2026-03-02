import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth, verifyRideOnSessionCookie } from "@/lib/firebaseAdmin";

export type AdminRole =
  | "super_admin"
  | "admin"
  | "ops_admin"
  | "driver_admin"
  | "product_admin"
  | "finance_admin";

export interface AdminCaller {
  uid: string;
  email?: string;
  adminRole: AdminRole;
  claims: Record<string, unknown>;
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

function normalizeAdminRole(raw: unknown): AdminRole {
  const r = typeof raw === "string" ? raw.trim() : "";
  if (
    r === "super_admin" ||
    r === "admin" ||
    r === "ops_admin" ||
    r === "driver_admin" ||
    r === "product_admin" ||
    r === "finance_admin"
  ) {
    return r;
  }
  return "admin";
}

export async function getAdminCaller(
  req: Request,
): Promise<AdminCaller | null> {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  let decoded: any = null;

  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
  }

  if (!decoded && bearer) {
    try {
      decoded = await withTimeout(
        adminAuth.verifyIdToken(bearer),
        2_500,
        "[adminRbac] verifyIdToken",
      );
    } catch {
      decoded = null;
    }
  }

  if (!decoded || decoded.admin !== true) {
    return null;
  }

  const role = normalizeAdminRole(decoded.adminRole ?? decoded.role);
  const email = typeof decoded.email === "string" ? decoded.email : undefined;

  return {
    uid: decoded.uid,
    email,
    adminRole: role,
    claims: decoded as Record<string, unknown>,
  };
}

export async function requireAdmin(req: Request, roles?: AdminRole[]) {
  const caller = await getAdminCaller(req);
  if (!caller) {
    return {
      caller: null as AdminCaller | null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (roles && roles.length > 0 && !roles.includes(caller.adminRole)) {
    return {
      caller: null as AdminCaller | null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { caller, response: null as NextResponse | null };
}
