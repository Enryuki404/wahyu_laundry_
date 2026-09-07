"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type UserLite = {
  namaLengkap: string;
  username: string;
  role: string;
} | null;

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { header: string; items: NavItem[] };

const ROLE_META: Record<string, { label: string; icon: string; color: string }> = {
  owner: { label: "Owner", icon: "👑", color: "#F59E0B" },
  admin: { label: "Admin", icon: "🛡️", color: "#2563EB" },
  operator: { label: "Operator", icon: "👕", color: "#0EA5E9" },
};

function getNavGroups(role: string): NavGroup[] {
  if (role === "owner") {
    return [
      { header: "Utama", items: [{ href: "/owner", label: "Dashboard", icon: "◈" }] },
      {
        header: "Laporan",
        items: [
          { href: "/owner/transaksi", label: "Transaksi", icon: "◎" },
          { href: "/owner/keuangan", label: "Keuangan", icon: "◎" },
          { href: "/owner/pelanggan", label: "Pertumbuhan Pelanggan", icon: "◎" },
          { href: "/owner/stock", label: "Stock", icon: "◎" },
        ],
      },
      {
        header: "SDM",
        items: [
          { href: "/owner/pegawai", label: "Data Pegawai", icon: "◎" },
          { href: "/owner/absensi", label: "Absensi", icon: "◎" },
          { href: "/owner/gaji", label: "Manajemen Gaji", icon: "◎" },
        ],
      },
      {
        header: "Setting",
        items: [{ href: "/owner/harga", label: "Harga Layanan", icon: "◎" }],
      },
    ];
  }
  if (role === "admin") {
    return [
      { header: "Utama", items: [{ href: "/admin", label: "Dashboard", icon: "◈" }] },
      {
        header: "Laporan",
        items: [
          { href: "/admin/pesanan", label: "Daftar Pesanan", icon: "◎" },
          { href: "/admin/pesanan/baru", label: "Input Order", icon: "＋" },
          { href: "/admin/pesanan-masuk", label: "Pesanan Masuk", icon: "◎" },
        ],
      },
      {
        header: "SDM",
        items: [
          { href: "/admin/pelanggan", label: "Daftar Pelanggan", icon: "◎" },
          { href: "/admin/pelanggan/baru", label: "Pendaftaran Pelanggan", icon: "◎" },
          { href: "/admin/stock", label: "Daftar Stock", icon: "◎" },
          { href: "/admin/history", label: "History Penggunaan", icon: "◎" },
        ],
      },
      {
        header: "Setting",
        items: [
          { href: "/admin/profile", label: "Profile", icon: "◎" },
          { href: "/admin/tingkat-kotor", label: "Tingkat Kotor", icon: "◎" },
        ],
      },
    ];
  }
  // operator
  return [
    {
      header: "Utama",
      items: [
        { href: "/operator", label: "Dashboard", icon: "◈" },
        { href: "/operator/riwayat", label: "Riwayat Update", icon: "◎" },
      ],
    },
    {
      header: "Laporan",
      items: [{ href: "/operator/produksi", label: "Produksi Harian", icon: "◎" }],
    },
    {
      header: "SDM",
      items: [{ href: "/operator/akun", label: "Setting Akun", icon: "◎" }],
    },
  ];
}

export default function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserLite;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = user?.role ?? "admin";
  const meta = ROLE_META[role] ?? ROLE_META.admin;
  const groups = getNavGroups(role);
  const today = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (pathname.startsWith(href + "/")) return true;
    return false;
  };

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
    } catch {}
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col overflow-hidden
          bg-gradient-to-b from-[#0F172A] to-[#1E3A8A] shadow-[4px_0_24px_rgba(15,23,42,.12)]
          transition-transform duration-300 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center text-white font-black text-sm shadow-lg">
            W
          </div>
          <div className="leading-none">
            <div className="text-white font-black tracking-tight text-[1.05rem]">Wahyu Laundry</div>
            <div className="text-[0.68rem] font-bold tracking-[0.14em] uppercase text-white/60">Laundry Management</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto lg:hidden w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.08] border border-white/10 px-3 py-3 backdrop-blur">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white text-sm">
              <span>{meta.icon}</span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-white font-extrabold text-sm truncate">{user?.namaLengkap ?? "Pengguna"}</div>
              <div className="text-white/60 text-[0.72rem] font-semibold tracking-wide">
                {meta.label} • Aktif
              </div>
            </div>
            <span className="w-2 h-2 bg-[#22C55E] rounded-full shadow-[0_0_0_4px_rgba(34,197,94,.25)]" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-thin">
          {groups.map((g) => (
            <div key={g.header}>
              <div className="px-3 mb-2 text-[0.68rem] font-extrabold tracking-[0.11em] uppercase text-white/45">
                {g.header}
              </div>
              <ul className="space-y-1">
                {g.items.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <li key={it.label}>
                      <Link
                        href={it.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 mx-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition
                          ${
                            active
                              ? "bg-[#2563EB] text-white shadow-[0_8px_16px_rgba(37,99,235,.35)]"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs
                            ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
                        >
                          {it.icon}
                        </span>
                        <span className="truncate">{it.label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/10">
          <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-3 flex items-center justify-between">
            <div className="text-xs font-bold text-white/80">© 2026 Wahyu Laundry</div>
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 lg:ml-[280px] min-w-0 flex flex-col">
        {/* Navbar glass */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 border-b border-slate-200/70">
          <div className="flex items-center gap-3 px-4 lg:px-6 h-[64px]">
            {/* Hamburger */}
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-[#2563EB] hover:border-[#DBEAFE] transition"
              aria-label="Open menu"
            >
              <span className="text-lg leading-none">☰</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="font-extrabold text-[#1E293B] tracking-tight">Wahyu Laundry</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-[#2563EB] capitalize">{role}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 ml-2 text-xs font-bold text-slate-400">
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              {today}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-2 text-xs font-bold text-slate-500 bg-[#EFF6FF] border border-[#DBEAFE] px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-[#22C55E] rounded-full" /> Sistem Aktif
              </span>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center text-white font-bold text-xs">
                    {(user?.namaLengkap ?? "U")[0]?.toUpperCase()}
                  </span>
                  <span className="hidden sm:block text-sm font-bold text-slate-700 max-w-[120px] truncate">
                    {user?.namaLengkap ?? "User"}
                  </span>
                  <span className="text-slate-400 text-xs">▾</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,.12)] p-2 z-50">
                    <div className="px-3 py-2 bg-[#F8FAFC] rounded-xl mb-1">
                      <div className="font-extrabold text-sm text-slate-800 truncate">{user?.username ?? "user"}</div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{role}</div>
                    </div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500">Halo, {user?.namaLengkap ?? "Pengguna"} 👋</div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                    >
                      <span>↪</span> Logout
                    </button>
                    {/* Fallback for no-JS: traditional form POST will now redirect via server Accept:text/html -> 302 /login */}
                    <form action="/api/auth/logout" method="post" className="mt-1">
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition flex items-center gap-2"
                      >
                        Logout (POST form)
                      </button>
                    </form>
                    <a
                      href="/api/auth/logout"
                      className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Logout (GET)
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 bg-[#F8FAFC]">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-100 bg-white px-4 lg:px-6 py-3 flex flex-wrap gap-2 justify-between items-center text-xs">
          <span className="font-bold text-slate-400">© 2023–2026 Wahyu Laundry • Premium UI Next.js</span>
          <span className="font-semibold text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full" /> Build pass • Tailwind
          </span>
        </footer>
      </div>
    </div>
  );
}
