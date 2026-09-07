// Dashboard Group Layout — premium UI
// sidebar navy gradient #0F172A → #1E3A8A | navbar glass backdrop-blur | role badge | nav grouping Utama / Laporan / SDM + active state | Tailwind | --wl-primary #2563EB
// Tailwind classes used: bg-gradient-to-b from-[#0F172A] to-[#1E3A8A] backdrop-blur-xl bg-white/80 border-white/10
import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const u = user
    ? { namaLengkap: user.namaLengkap, username: user.username, role: user.role }
    : null;
  return <DashboardShell user={u}>{children}</DashboardShell>;
}
