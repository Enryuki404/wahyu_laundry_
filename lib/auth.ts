// lib/auth.ts — Real auth implementation (bcryptjs + jose JWT)
// Ported from PHP index.php + session.php + logout.php logic

import { z } from "zod";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

// ── ENV & Constants ───────────────────────────────────────────────────────
const JWT_COOKIE = "wl_token";
const JWT_EXPIRES_IN = "8h";
function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me-please-use-32chars-min!!"
  );
}
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

// ── Types ─────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").max(50),
  password: z.string().min(3, "Password minimal 3 karakter").max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type JWTPayload = {
  userId: number;
  username: string;
  role: string; // owner | admin | operator
  namaLengkap: string;
  iat?: number;
  exp?: number;
};

export type VerifyResult =
  | { ok: true; user: { id: number; username: string; role: string; namaLengkap: string } }
  | { ok: false; error: string };

// ── JWT helpers ───────────────────────────────────────────────────────────
export async function createToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const secret = getSecretKey();
  return await new jose.SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  // secure only in production, httpOnly always, sameSite lax, 8h
  cookieStore.set(JWT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours in seconds, mirrors PHP 30min session but longer for convenience
  });
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set(JWT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ── verifyCredentials ─────────────────────────────────────────────────────
// Query prisma.user findFirst where username + status Aktif, bcrypt.compare,
// create JWT payload {userId, username, role, nama_lengkap}, set cookie httpOnly
export async function verifyCredentials(
  username: string,
  password: string
): Promise<VerifyResult>;
export async function verifyCredentials(input: LoginInput): Promise<VerifyResult>;
export async function verifyCredentials(
  arg1: string | LoginInput,
  arg2?: string
): Promise<VerifyResult> {
  let username: string;
  let password: string;

  if (typeof arg1 === "object" && arg1 !== null) {
    username = arg1.username;
    password = arg1.password;
  } else {
    username = arg1 as string;
    password = arg2 as string;
  }

  const parsed = loginSchema.safeParse({ username, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  try {
    // findFirst where username + status Aktif (Prisma enum Aktif)
    const user = await prisma.user.findFirst({
      where: {
        username: username,
        status: "Aktif" as unknown as undefined, // Prisma UserStatus.Aktif
      },
      select: {
        id: true,
        username: true,
        password: true,
        namaLengkap: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return { ok: false, error: "Username atau password salah!" };
    }

    // PHP used password_verify with $2y$ hash; bcryptjs expects $2a$ -> normalize
    const hash = user.password.replace(/^\$2y\$/, "$2a$");
    const match = await bcrypt.compare(password, hash);
    if (!match) {
      return { ok: false, error: "Username atau password salah!" };
    }

    // Create JWT payload {userId, username, role, nama_lengkap}
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: user.id,
      username: user.username,
      role: user.role as string,
      namaLengkap: user.namaLengkap,
    };

    const token = await createToken(payload);
    setAuthCookie(token);

    return {
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role as string,
        namaLengkap: user.namaLengkap,
      },
    };
  } catch (e) {
    console.error("[verifyCredentials] error:", e);
    return { ok: false, error: "Terjadi kesalahan sistem. Coba lagi." };
  }
}

// ── getCurrentUser ────────────────────────────────────────────────────────
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(JWT_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}

// ── logout ────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  clearAuthCookie();
}

// ── requireRole ───────────────────────────────────────────────────────────
// Use in server components / server actions to protect pages
// If not logged in -> redirect /login
// If role not allowed -> redirect to correct home by role
export async function requireRole(allowedRoles: string[]): Promise<JWTPayload> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!allowedRoles.includes(user.role)) {
    // redirect to user's own dashboard
    const home =
      user.role === "owner"
        ? "/owner"
        : user.role === "admin"
          ? "/admin"
          : "/operator";
    redirect(home);
  }
  return user;
}

// ── helpers for middleware (edge) re-export ───────────────────────────────
export const AUTH_COOKIE_NAME = JWT_COOKIE;
export const JWT_SECRET_FALLBACK = "dev-secret-change-me-please-use-32chars-min!!";
