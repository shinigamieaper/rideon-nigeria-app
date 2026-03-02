export const runtime = "nodejs";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, verifyRideOnSessionCookie } from "@/lib/firebaseAdmin";
import AdminLayoutClient from "./AdminLayoutClient";

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

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";
  let decoded: any | null = null;

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
  }

  if (!decoded) {
    const h = await headers();
    const authHeader = h.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      redirect(`/login?next=${encodeURIComponent("/admin")}`);
    }
    try {
      decoded = await withTimeout(
        adminAuth.verifyIdToken(token),
        2_500,
        "[admin/layout] verifyIdToken",
      );
    } catch {
      redirect(`/login?next=${encodeURIComponent("/admin")}`);
    }
  }

  // Verify admin claim
  const isAdmin = decoded?.admin === true || decoded?.claims?.admin === true;
  if (!isAdmin) {
    redirect("/app");
  }

  const adminRole =
    typeof decoded?.adminRole === "string"
      ? decoded.adminRole
      : typeof decoded?.role === "string"
        ? decoded.role
        : "admin";

  return (
    <AdminLayoutClient adminRole={adminRole as any}>
      {children}
    </AdminLayoutClient>
  );
}
