import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const u = user ? { namaLengkap: user.namaLengkap, username: user.username, role: user.role } : null;
  return <DashboardShell user={u}>{children}</DashboardShell>;
}
