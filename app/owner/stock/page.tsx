import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireRole(["owner"]);
  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center text-white font-black">◈</span>
          <h1 className="text-xl font-black text-[#1E293B] tracking-tight">Laporan Stock</h1>
          <span className="ml-auto text-xs font-bold bg-[#FEF3C7] text-[#92400E] px-3 py-1 rounded-full border border-[#FDE68A]">Coming Soon</span>
        </div>
        <p className="text-sm text-slate-500 font-medium">Stok bahan, penggunaan, batas minimum — placeholder.</p>
        <p className="text-xs text-slate-400 mt-2">Login sebagai <b>{user.namaLengkap}</b> ({user.role}) • Halaman ini placeholder agar menu tidak 404/403. Implementasi real akan menyusul.</p>
        <div className="mt-4 p-4 bg-[#F8FAFC] border border-dashed border-slate-200 rounded-xl text-center">
          <span className="text-2xl">🚧</span>
          <div className="font-bold text-slate-700 mt-1">Fitur dalam pengembangan</div>
          <div className="text-xs text-slate-400">Placeholder aman — tidak memicu 403 untuk role owner</div>
        </div>
      </div>
    </div>
  );
}
