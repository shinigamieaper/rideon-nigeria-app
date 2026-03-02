import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/driver/:path*"],
};
