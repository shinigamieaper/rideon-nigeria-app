import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseExpiryMs(value: string | undefined): number | null {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n > 1_000_000_000_000 ? n : n * 1000;
  }

  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

const APP_EXPIRES_AT_MS = parseExpiryMs(process.env.APP_EXPIRES_AT);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-pathname",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const lockoutActive =
    APP_EXPIRES_AT_MS !== null && Date.now() >= APP_EXPIRES_AT_MS;
  if (lockoutActive) {
    const isAdminPath = pathname.startsWith("/admin");
    const isAdminApi = pathname.startsWith("/api/admin");
    const isServiceUnavailablePage = pathname === "/service-unavailable";
    const isLegacyExpiredPage = pathname === "/expired";

    const isAuthSessionApi = pathname === "/api/auth/session";
    const isPublicConfigApi = pathname.startsWith("/api/config/");
    const isAnalyticsApi = pathname === "/api/analytics/track";

    const isLogin = pathname === "/login";

    if (
      !isAdminPath &&
      !isAdminApi &&
      !isServiceUnavailablePage &&
      !isLegacyExpiredPage &&
      !isAuthSessionApi &&
      !isPublicConfigApi &&
      !isAnalyticsApi &&
      !isLogin
    ) {
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error:
              "Service is currently unavailable. Please contact the administrator.",
          }),
          {
            status: 403,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = "/service-unavailable";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/driver/recruitment")) {
    const url = request.nextUrl.clone();

    if (
      pathname === "/driver/recruitment" ||
      pathname === "/driver/recruitment/"
    ) {
      url.pathname = "/full-time-driver/application";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/driver/recruitment/apply")) {
      url.pathname = "/full-time-driver/application/apply";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/driver/recruitment/documents")) {
      url.pathname = "/full-time-driver/application/documents";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/driver/recruitment/status")) {
      url.pathname = "/full-time-driver/application/status";
      return NextResponse.redirect(url);
    }
  }

  // Check for session cookie on protected driver routes
  if (pathname.startsWith("/driver")) {
    const sessionCookie = request.cookies.get("rideon_session");

    // Log cookie presence for debugging
    if (!sessionCookie && pathname !== "/driver") {
      console.warn("[middleware] No session cookie for", pathname);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/driver/:path*",
    "/partner/:path*",
    "/full-time-driver/:path*",
    "/register/:path*",
    "/login",
    "/api/:path*",
  ],
};
