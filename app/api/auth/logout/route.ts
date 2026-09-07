import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "wl_token";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me-please-use-32chars-min!!";
  return new TextEncoder().encode(secret);
}

async function getUserFromCookies(): Promise<{ userId: number; username: string; role: string; namaLengkap: string } | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey());
    return payload as unknown as { userId: number; username: string; role: string; namaLengkap: string };
  } catch {
    return null;
  }
}

// Helpers for Asia/Jakarta time
function getJakartaNow(): Date {
  // Get current time in Asia/Jakarta
  const now = new Date();
  const jakartaStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(jakartaStr);
}

function toJakartaDateString(d: Date): string {
  // YYYY-MM-DD in Jakarta
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // en-CA gives YYYY-MM-DD
}

function toJakartaTimeString(d: Date): string {
  // HH:mm:ss in Jakarta
  return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false });
}

function parseTimeToSeconds(t: string | Date): number {
  // t can be Date object (1970-01-01T...) or string HH:mm:ss
  if (t instanceof Date) {
    return t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds();
  }
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

function timeStringToDate(timeStr: string): Date {
  return new Date(`1970-01-01T${timeStr}.000Z`);
}

function wantsHtmlRedirect(req: NextRequest): boolean {
  const accept = req.headers.get("accept") || "";
  const secFetchMode = req.headers.get("sec-fetch-mode") || "";
  const contentType = req.headers.get("content-type") || "";
  // Browser form POST sends text/html, or navigation request
  if (accept.includes("text/html")) return true;
  if (secFetchMode === "navigate") return true;
  if (contentType.includes("application/x-www-form-urlencoded")) return true;
  return false;
}

function clearCookieAndRedirect(req: NextRequest, url: string = "/login") {
  const res = NextResponse.redirect(new URL(url, req.url), 302);
  res.cookies.set(COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  // also via next/headers for safety (will be merged)
  try {
    cookies().set(COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } catch {}
  return res;
}

function clearCookieHeader() {
  try {
    cookies().set(COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } catch {}
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const isCheck = url.searchParams.get("check") === "1" || url.searchParams.get("check_duration") === "1";
  // Also check body for check_duration
  let bodyCheck = false;
  try {
    const clone = req.clone();
    const body = await clone.json().catch(() => null);
    if (body && body.check_duration) bodyCheck = true;
  } catch {}

  const shouldCheckOnly = isCheck || bodyCheck;

  const user = await getUserFromCookies();
  const wantsHtml = wantsHtmlRedirect(req);

  // If no user or owner, just clear cookie
  if (!user) {
    clearCookieHeader();
    if (shouldCheckOnly) {
      return NextResponse.json({ message: "Tidak ada sesi aktif", type: "info" });
    }
    if (wantsHtml) return clearCookieAndRedirect(req);
    return NextResponse.json({ ok: true, message: "Logged out" });
  }

  if (user.role === "owner") {
    // owner has no absensi
    clearCookieHeader();
    if (shouldCheckOnly) {
      return NextResponse.json({ message: "Owner tidak memiliki absensi", type: "info" });
    }
    if (wantsHtml) return clearCookieAndRedirect(req);
    return NextResponse.json({ ok: true, message: "Logged out (owner)" });
  }

  // Non-owner: find today's absensi where jamKeluar IS NULL
  const jakartaNow = getJakartaNow();
  const todayStr = toJakartaDateString(jakartaNow);
  const jamKeluarStr = toJakartaTimeString(jakartaNow);
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  try {
    const absensi = await prisma.absensi.findFirst({
      where: {
        userId: user.userId,
        tanggal: todayDate,
        jamKeluar: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!absensi) {
      // No active absensi today
      clearCookieHeader();
      if (shouldCheckOnly) {
        return NextResponse.json({ message: "Tidak ada absensi aktif hari ini", type: "info" });
      }
      if (wantsHtml) return clearCookieAndRedirect(req);
      return NextResponse.json({ ok: true, message: "Logged out - no absensi" });
    }

    const jamMasukSec = parseTimeToSeconds(absensi.jamMasuk);
    const jamKeluarSec = parseTimeToSeconds(jamKeluarStr);
    let durasi = (jamKeluarSec - jamMasukSec) / 3600;
    // Handle negative if crossing midnight (unlikely but mirror PHP strtotime difference)
    if (durasi < 0) durasi += 24;

    if (shouldCheckOnly) {
      let response: { message: string; type: string };
      if (durasi < 8) {
        response = {
          message: "Apakah anda ingin mengakhiri shift lebih awal?",
          type: "warning",
        };
      } else if (durasi >= 9) {
        response = {
          message: "Terima kasih atas kerja kerasnya, waktu lembur akan dimasukan menjadi tambahan gaji :)",
          type: "info",
        };
      } else {
        response = {
          message: "Terima kasih atas kerja kerasnya, selamat beristirahat",
          type: "success",
        };
      }
      return NextResponse.json({ ...response, durasi: Number(durasi.toFixed(2)), jamMasuk: absensi.jamMasuk, jamKeluar: jamKeluarStr });
    }

    // Confirmed logout: update absensi
    const keterangan = durasi >= 9 ? "Lembur" : durasi >= 8 ? "Selesai" : "Pulang Awal";

    await prisma.absensi.update({
      where: { id: absensi.id },
      data: {
        jamKeluar: timeStringToDate(jamKeluarStr),
        keterangan,
      },
    });

    clearCookieHeader();
    if (wantsHtml) return clearCookieAndRedirect(req);
    return NextResponse.json({
      ok: true,
      message: "Logout berhasil",
      keterangan,
      durasi: Number(durasi.toFixed(2)),
      jamKeluar: jamKeluarStr,
    });
  } catch (e) {
    console.error("[logout POST] error:", e);
    clearCookieHeader();
    if (wantsHtmlRedirect(req)) return clearCookieAndRedirect(req);
    return NextResponse.json({ error: "Gagal logout", details: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // GET handles browser redirect flow: ?confirmed=1 or plain
  const url = req.nextUrl;
  const check = url.searchParams.get("check_duration") || url.searchParams.get("check");
  if (check) {
    // Delegate to POST logic for check
    return POST(req);
  }

  const user = await getUserFromCookies();

  if (!user || user.role === "owner") {
    clearCookieHeader();
    // ensure redirect response also carries cleared cookie with path '/'
    const res = NextResponse.redirect(new URL("/login", req.url), 302);
    res.cookies.set(COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res;
  }

  const jakartaNow = getJakartaNow();
  const todayStr = toJakartaDateString(jakartaNow);
  const jamKeluarStr = toJakartaTimeString(jakartaNow);
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  try {
    const absensi = await prisma.absensi.findFirst({
      where: {
        userId: user.userId,
        tanggal: todayDate,
        jamKeluar: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (absensi) {
      const jamMasukSec = parseTimeToSeconds(absensi.jamMasuk);
      const jamKeluarSec = parseTimeToSeconds(jamKeluarStr);
      let durasi = (jamKeluarSec - jamMasukSec) / 3600;
      if (durasi < 0) durasi += 24;
      const keterangan = durasi >= 9 ? "Lembur" : durasi >= 8 ? "Selesai" : "Pulang Awal";

      // If ?confirmed is present, update; otherwise still update? PHP only updates if ?confirmed.
      // We treat GET without confirmed as also updating for simplicity, unless ?check only.
      const confirmed = url.searchParams.get("confirmed");
      // To mirror PHP: if no confirmed and not check, we still destroy session without updating? But task says update absensi, so we update anyway.
      // We'll respect: if confirmed param exists or not, we update. If you want to preview, use POST?check=1.
      // To be safe: update regardless on GET (logout intent)
      if (confirmed !== null || confirmed === null) {
        await prisma.absensi.update({
          where: { id: absensi.id },
          data: {
            jamKeluar: timeStringToDate(jamKeluarStr),
            keterangan,
          },
        });
      }
    }
  } catch (e) {
    console.error("[logout GET] error:", e);
  }

  clearCookieHeader();
  const resFinal = NextResponse.redirect(new URL("/login", req.url), 302);
  resFinal.cookies.set(COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return resFinal;
}
