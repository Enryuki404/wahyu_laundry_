import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginSchema, verifyCredentials } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Masuk — Wahyu Laundry",
  description: "Sistem Manajemen Laundry — Masuk untuk melanjutkan",
};

// ── Helpers for WIB / Jakarta ─────────────────────────────────────────────
function getJakartaNow(): Date {
  const now = new Date();
  const jakartaStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(jakartaStr);
}
function toJakartaDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
function toJakartaTimeString(d: Date): string {
  return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false });
}
function timeStringToDate(timeStr: string): Date {
  return new Date(`1970-01-01T${timeStr}.000Z`);
}

// Server Action — real login with verifyCredentials + absensi + redirect by role
async function loginAction(formData: FormData) {
  "use server";

  const raw = {
    username: String(formData.get("username") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Input tidak valid";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }

  const { username, password } = parsed.data;

  // verifyCredentials does: findFirst username+Aktif, bcrypt.compare, create JWT + set cookie
  const result = await verifyCredentials(username, password);

  if (!result.ok) {
    redirect(`/login?error=${encodeURIComponent(result.error)}`);
  }

  const user = result.user; // { id, username, role, namaLengkap }

  // ── Absensi: jika bukan owner, catat absensi hari ini ─────────────────
  if (user.role !== "owner") {
    try {
      const jakartaNow = getJakartaNow();
      const todayStr = toJakartaDateString(jakartaNow); // YYYY-MM-DD Jakarta
      const jamMasukStr = toJakartaTimeString(jakartaNow); // HH:mm:ss Jakarta
      const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

      // Cek apakah sudah absen hari ini
      const existing = await prisma.absensi.findFirst({
        where: {
          userId: user.id,
          tanggal: todayDate,
        },
      });

      if (!existing) {
        // Tentukan status kehadiran mirip PHP:
        // <=08:00 Tepat Waktu, <=08:30 Hampir Terlambat, else Terlambat
        let status: "TepatWaktu" | "HampirTerlambat" | "Terlambat";
        if (jamMasukStr <= "08:00:00") {
          status = "TepatWaktu";
        } else if (jamMasukStr <= "08:30:00") {
          status = "HampirTerlambat";
        } else {
          status = "Terlambat";
        }

        await prisma.absensi.create({
          data: {
            userId: user.id,
            tanggal: todayDate,
            jamMasuk: timeStringToDate(jamMasukStr),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            statusKehadiran: status as any,
          },
        });
      }
    } catch (e) {
      console.error("[loginAction absensi] error:", e);
      // don't block login on absensi failure — continue
    }
  }

  // Update lastLogin
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
  } catch (e) {
    console.error("[loginAction lastLogin] error:", e);
  }

  // Redirect berdasarkan role: /admin /owner /operator
  switch (user.role) {
    case "owner":
      redirect("/owner");
    case "admin":
      redirect("/admin");
    case "operator":
      redirect("/operator");
    default:
      redirect("/");
  }
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string };
}) {
  const error = searchParams?.error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] via-[#E0F2FE] to-[#DBEAFE]">
      {/* Background blobs — port dari index.php */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[140px] -left-[140px] w-[520px] h-[520px] rounded-full blur-[40px] opacity-[0.18] bg-gradient-to-br from-[#2563EB] to-[#38BDF8]" />
        <div className="absolute -bottom-[220px] -right-[180px] w-[680px] h-[680px] rounded-full blur-[40px] opacity-[0.22] bg-gradient-to-br from-[#93C5FD] to-[#60A5FA]" />
        <div className="absolute top-[40%] left-[55%] w-[360px] h-[360px] rounded-full blur-[60px] opacity-55 bg-white" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_10%_10%,#DBEAFE_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_90%_90%,#BFDBFE_0%,transparent_60%)]" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[440px] relative bg-white/90 backdrop-blur-[16px] backdrop-saturate-150 border border-white/70 rounded-[22px] shadow-[0_20px_60px_rgba(37,99,235,0.14),0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden animate-[wlIn_0.55s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="h-1 w-full bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#60A5FA]" />

        <div className="px-7 pt-7 pb-6">
          {/* Brand */}
          <div className="flex flex-col items-center text-center gap-2.5 mb-1.5">
            <div className="w-[78px] h-[78px] rounded-full p-[3px] bg-gradient-to-br from-[#2563EB] to-[#38BDF8] shadow-[0_10px_24px_rgba(37,99,235,0.22)]">
              <div className="w-full h-full rounded-full border-[3px] border-white bg-white flex items-center justify-center text-[#2563EB] font-black text-xl">
                W
              </div>
            </div>
            <div className="leading-none mt-1">
              <div className="text-[1.75rem] font-black tracking-[-0.03em] text-[#1E3A8A]">Wahyu</div>
              <div className="text-[1.05rem] font-light tracking-[0.14em] uppercase text-[#2563EB] mt-0.5">Laundry</div>
            </div>
            <div className="text-[0.82rem] font-semibold text-[#94A3B8] tracking-[0.01em] mt-1">
              Sistem Manajemen Laundry — Masuk untuk melanjutkan
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent my-5" />

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] px-3 py-2.5 text-[0.85rem] font-semibold flex gap-2.5 items-start mb-4"
            >
              <span className="mt-0.5 text-[#EF4444]">⚠</span>
              <div>{decodeURIComponent(error)}</div>
            </div>
          )}

          {/* Form — server action real */}
          <form action={loginAction} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="username" className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-1.5 block">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs">
                  @
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Masukkan username"
                  required
                  autoFocus
                  className="w-full h-12 rounded-xl border-[1.6px] border-[#E2E8F0] bg-white pl-11 pr-4 text-[0.95rem] font-semibold text-[#1E293B] placeholder:text-[#94A3B8] placeholder:font-medium outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.13)] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-xs">
                  🔒
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Masukkan password"
                  required
                  className="w-full h-12 rounded-xl border-[1.6px] border-[#E2E8F0] bg-white pl-11 pr-11 text-[0.95rem] font-semibold text-[#1E293B] placeholder:text-[#94A3B8] placeholder:font-medium outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.13)] transition"
                />
                <button
                  type="button"
                  id="togglePass"
                  aria-label="Lihat password"
                  className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-[#F8FAFC] w-8 h-8 rounded-[9px] text-[#64748B] flex items-center justify-center cursor-pointer hover:bg-[#EFF6FF] hover:text-[#2563EB] transition"
                >
                  <span id="toggleIcon" className="text-[0.8rem]">👁</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white font-extrabold text-[0.95rem] tracking-[0.01em] flex items-center justify-center gap-2 shadow-[0_10px_22px_rgba(37,99,235,0.22)] hover:shadow-[0_14px_26px_rgba(37,99,235,0.28)] hover:-translate-y-px active:translate-y-0 transition"
            >
              <span>Masuk</span>
              <span className="text-[0.85rem] opacity-90">→</span>
            </button>

            <div className="text-center text-[0.78rem] text-[#94A3B8] font-semibold mt-3">
              Butuh bantuan? <a href="#" className="text-[#2563EB] font-extrabold hover:underline">Hubungi Owner</a>
            </div>
            <div className="text-center text-[0.70rem] text-[#94A3B8] mt-2">
              Demo: <span className="font-mono font-bold text-[#475569]">agus_wahyu / password</span> (owner), <span className="font-mono font-bold text-[#475569]">fajar890 / password</span> (admin), <span className="font-mono font-bold text-[#475569]">gita345 / password</span> (operator)
            </div>
          </form>
        </div>

        <div className="px-7 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center flex-wrap gap-2">
          <div className="text-[0.76rem] font-bold text-[#94A3B8] tracking-[0.02em]">© 2023–2026 Wahyu Laundry</div>
          <div className="text-[0.72rem] font-semibold text-[#64748B] flex gap-2.5 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_0_4px_rgba(34,197,94,0.15)] inline-block" />
            Sistem Aktif • Aman & Terpercaya
          </div>
        </div>
      </div>

      {/* Toggle password script — vanilla JS agar tetap server component */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var btn=document.getElementById('togglePass');
              var inp=document.getElementById('password');
              var icon=document.getElementById('toggleIcon');
              if(btn && inp){
                btn.addEventListener('click', function(){
                  var isText = inp.type === 'text';
                  inp.type = isText ? 'password' : 'text';
                  if(icon) icon.textContent = isText ? '👁' : '🙈';
                  inp.focus();
                });
              }
            })();
          `,
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes wlIn{from{opacity:0; transform:translateY(10px) scale(0.98)} to{opacity:1; transform:none}}`,
        }}
      />
    </div>
  );
}
