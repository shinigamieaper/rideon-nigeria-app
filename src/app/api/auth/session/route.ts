import { NextResponse } from "next/server";
import { adminAuth, RIDEON_ID_TOKEN_COOKIE_PREFIX } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "rideon_session";

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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken =
      typeof body?.idToken === "string" ? body.idToken.trim() : "";
    const remember = !!body?.remember;

    if (!idToken) {
      console.error("[POST /api/auth/session] Missing idToken");
      return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
    }

    // Firebase session cookies are backed by ID tokens which expire after 1 hour
    // Keep session cookies under 1 hour to avoid premature expiry
    // Client-side will refresh automatically every 50 minutes
    const expiresIn = 55 * 60 * 1000; // 55 minutes

    let sessionCookie = "";
    let lastError: any = null;

    try {
      sessionCookie = await withTimeout(
        adminAuth.createSessionCookie(idToken, { expiresIn }),
        2_500,
        "[POST /api/auth/session] createSessionCookie",
      );
    } catch (e: any) {
      lastError = e;
    }

    if (!sessionCookie) {
      console.warn(
        "[POST /api/auth/session] createSessionCookie failed; falling back to id_token cookie:",
        lastError?.code || lastError?.message || lastError,
      );
      sessionCookie = `${RIDEON_ID_TOKEN_COOKIE_PREFIX}${idToken}`;
    } else {
      console.log(
        "[POST /api/auth/session] Session cookie created, maxAge:",
        Math.floor(expiresIn / 1000),
        "seconds",
      );
    }

    const res = NextResponse.json({ success: true }, { status: 200 });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });
    return res;
  } catch (error: any) {
    console.error(
      "[POST /api/auth/session] Error creating session cookie:",
      error?.code || error?.message || error,
    );
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const res = NextResponse.json({ success: true }, { status: 200 });
    res.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    console.error("Error clearing session cookie:", error);
    return NextResponse.json(
      { error: "Failed to clear session." },
      { status: 500 },
    );
  }
}
