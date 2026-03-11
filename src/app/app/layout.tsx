export const runtime = "nodejs";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, verifyRideOnSessionCookie } from "@/lib/firebaseAdmin";
import RideOnFloatingDock from "@/components/app/RideOnFloatingDock";
import CustomerOnboardingTour from "@/components/app/CustomerOnboardingTour";
import type { NextRequest } from "next/server";

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

export default async function Layout({ children }: { children: ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") || "";
  const requestedPath = pathname || "/app/dashboard";
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
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
    decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2500,
      "[app/layout] verifyIdToken",
    );
  }

  const uid = (decoded?.uid as string | undefined) ?? undefined;
  let role = (decoded?.role ?? decoded?.claims?.role) as string | undefined;
  const isAdmin = decoded?.admin === true || decoded?.claims?.admin === true;

  if (isAdmin) {
    // Avoid redirect loop if already on /admin
    if (!pathname.startsWith("/admin")) {
      redirect("/admin");
    }
  }

  if (role === "driver") {
    redirect("/driver");
  }

  if (role === "partner" || role === "partner_applicant") {
    redirect("/partner");
  }

  if (!role) role = "customer";

  if (!uid) {
    redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
  }

  if (role !== "customer") {
    redirect(`/register/customer?next=${encodeURIComponent(requestedPath)}`);
  }

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <CustomerOnboardingTour />
      <div className="min-h-dvh pb-32">{children}</div>

      {/* Floating dock overlay (safe-area aware) */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-3"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        role="navigation"
        aria-label="Primary"
      >
        <div className="pointer-events-auto" data-tour="customer-floating-dock">
          <RideOnFloatingDock
            desktopClassName="bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all"
            mobileClassName=""
          />
        </div>
      </div>
    </div>
  );
}
