import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const COOKIE_NAME = "wl_token";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me-please-use-32chars-min!!";
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey());
    return payload as unknown as { userId: number; username: string; role: string; namaLengkap: string; exp?: number };
  } catch {
    return null;
  }
}

function roleHome(role: string): string {
  if (role === "owner") return "/owner";
  if (role === "admin") return "/admin";
  if (role === "operator") return "/operator";
  return "/login";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public assets & login itself — always allow
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff2?|ico)$/)
  ) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/operator") ||
    pathname.startsWith("/api");

  // /api/auth is allowed without check for login/logout endpoints except they still handle their own logic
  // But we still want to allow /api/auth/login if exists; our /api/auth/logout needs token.
  // For simplicity, let /api/auth/** pass through without redirect (return JSON 401 if needed)
  const isApiAuthPublic = pathname.startsWith("/api/auth");

  const token = req.cookies.get(COOKIE_NAME)?.value;

  // If protected and no token => redirect or 401
  if (isProtected) {
    // Allow public api/auth to handle its own auth (e.g., logout will check inside)
    // For /api with no token, return 401 JSON instead of redirect
    if (!token) {
      if (pathname.startsWith("/api")) {
        // Don't block /api/auth/logout? it will handle inside, but return 401 for other APIs
        if (isApiAuthPublic) {
          return NextResponse.next();
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      // invalid/expired => clear cookie and redirect to login
      if (pathname.startsWith("/api")) {
        if (isApiAuthPublic) return NextResponse.next();
        return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Sesi berakhir, silakan login kembali.");
      const res = NextResponse.redirect(url);
      res.cookies.set(COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return res;
    }

    const role = payload.role;

    // Role guard: owner only to /owner/* etc
    if (pathname.startsWith("/owner") && role !== "owner") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden - owner only" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/operator") && role !== "operator") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden - operator only" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }

    // API role guard similarly: if /api/admin etc (if you prefix APIs by role)
    // For now generic /api requires auth but not role-specific, except above.
    // Explicit: /api/orders & /api/customers/search allow for admin (jangan block) — all authenticated roles pass
    if (pathname.startsWith("/api/orders") || pathname.startsWith("/api/customers/search")) {
      if (["admin", "operator", "owner"].includes(role)) {
        // allow — no redirect, just continue to route handler which does its own role check
      }
      return NextResponse.next();
    }

    // Refresh: re-issue token with new exp (sliding 8h) and set cookie
    // Do not refresh on every request too aggressively? We'll refresh if token exp < 4h remaining.
    // Simple: always re-sign to keep session alive on activity.
    try {
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp ?? 0;
      const shouldRefresh = exp - now < 4 * 60 * 60; // <4h left
      if (shouldRefresh) {
        const newToken = await new jose.SignJWT({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          namaLengkap: payload.namaLengkap,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("8h")
          .sign(getSecretKey());
        const res = NextResponse.next();
        res.cookies.set(COOKIE_NAME, newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 8 * 60 * 60,
        });
        return res;
      }
    } catch {
      // ignore refresh error
    }

    return NextResponse.next();
  }

  // If user is already logged in and visits /login -> redirect to role home
  if (isLoginPage && token) {
    const payload = await verifyToken(token);
    if (payload) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome(payload.role);
      url.search = "";
      return NextResponse.redirect(url);
    } else {
      // invalid token on login page: clear and allow
      const res = NextResponse.next();
      res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  // Also redirect root "/" if logged in to role home? Keep "/" public; let page.tsx handle? We redirect via middleware optionally
  // We allow "/" to be public; no auto redirect to avoid loop.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/operator/:path*",
    "/api/:path*",
    "/login",
  ],
};
