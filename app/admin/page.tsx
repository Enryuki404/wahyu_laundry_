import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getWIBRange() {
  const jakartaDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const start = new Date(`${jakartaDateStr}T00:00:00+07:00`);
  const end = new Date(`${jakartaDateStr}T23:59:59.999+07:00`);
  const todayId = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const short = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  return { jakartaDateStr, start, end, todayId, short };
}

const statusMap: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-[#DBEAFE] text-[#1D4ED8]", label: "Baru" },
  processing: { cls: "bg-[#FEF3C7] text-[#92400E]", label: "Proses" },
  finishing: { cls: "bg-[#FEF3C7] text-[#92400E]", label: "Finishing" },
  completed: { cls: "bg-[#CCFBF1] text-[#0F766E]", label: "Siap" },
  done: { cls: "bg-[#DCFCE7] text-[#15803D]", label: "Selesai" },
  pickup: { cls: "bg-[#F1F5F9] text-[#475569]", label: "Pickup" },
};

export default async function AdminPage() {
  const user = await requireRole(["admin"]);
  const { start, end, todayId, short } = getWIBRange();

  // Real queries — mirror pages/admin/dashboard.php
  const [pendingCount, processingCount, completedCount, inventories, materialsAgg, ordersToday] =
    await Promise.all([
      prisma.order.count({ where: { status: "pending", createdAt: { gte: start, lte: end } } }),
      prisma.order.count({ where: { status: "processing", createdAt: { gte: start, lte: end } } }),
      prisma.order.count({ where: { status: "completed", createdAt: { gte: start, lte: end } } }),
      prisma.inventory.findMany({ select: { jumlahStock: true, batasMinimum: true } }),
      prisma.logInventory.aggregate({
        _sum: { detergenBubuk: true, detergenCair: true, pewangi: true, softener: true },
        where: { tanggalMasuk: { gte: start, lte: end } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { nama: true } },
          clothingType: { select: { nama: true } },
          dirtLevel: { select: { level: true } },
        },
      }),
    ]);

  const lowStock = inventories.filter((i) => Number(i.jumlahStock) <= Number(i.batasMinimum)).length;

  const matBubuk = Number(materialsAgg._sum.detergenBubuk ?? 0);
  const matCair = Number(materialsAgg._sum.detergenCair ?? 0);
  const matPewangi = Number(materialsAgg._sum.pewangi ?? 0);
  const matSoft = Number(materialsAgg._sum.softener ?? 0);

  // total orders today for footer
  const totalToday = await prisma.order.count({ where: { createdAt: { gte: start, lte: end } } });

  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      {/* Welcome / Quick Actions */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-4 px-5 py-4">
          <div>
            <div className="font-extrabold text-[#1E293B] text-[1.05rem] tracking-tight">Halo, {user.namaLengkap} 👋</div>
            <div className="text-sm text-[#94A3B8] font-medium">Ringkasan operasional hari ini — {todayId}</div>
          </div>
          <div className="flex gap-2">
            <a href="#" className="px-4 py-2 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white font-bold text-sm shadow-[0_8px_16px_rgba(37,99,235,.2)] hover:-translate-y-px transition">＋ Pesanan Baru</a>
            <a href="#" className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">＋ Pelanggan Baru</a>
          </div>
        </div>
      </div>

      {/* 4 stat cards — wl-stat-card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wl-stat-card">
          <div className="wl-stat-icon primary">📥</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Pesanan Baru</div>
            <div className="wl-stat-number">{pendingCount}</div>
            <div className="wl-stat-sub">Belum diproses</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon warning">⏳</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Sedang Diproses</div>
            <div className="wl-stat-number">{processingCount}</div>
            <div className="wl-stat-sub">Dalam pengerjaan</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon success">✓</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Siap Diambil</div>
            <div className="wl-stat-number">{completedCount}</div>
            <div className="wl-stat-sub">Menunggu pengambilan</div>
          </div>
        </div>
        <div className="wl-stat-card" style={lowStock > 0 ? { borderColor: "#FECACA", background: "#FFFBEB" } : undefined}>
          <div className={`wl-stat-icon ${lowStock > 0 ? "danger" : "slate"}`}>⚠</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Stok Menipis</div>
            <div className="wl-stat-number">{lowStock} <small>item</small></div>
            <div className="wl-stat-sub">{lowStock > 0 ? "Perlu restock" : "Aman"}</div>
          </div>
          {lowStock > 0 && <span className="wl-stat-trend !bg-[#FEE2E2] !text-[#DC2626]">Perhatian</span>}
        </div>
      </div>

      {/* Penggunaan Bahan Hari Ini */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
          <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2">🧪 Penggunaan Bahan Hari Ini</h3>
          <span className="text-xs font-bold bg-[#EFF6FF] text-[#2563EB] px-3 py-1.5 rounded-full border border-[#DBEAFE]">📅 {short}</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="wl-stat-card !p-4">
            <div className="wl-stat-icon slate">▣</div>
            <div className="wl-stat-content">
              <div className="wl-stat-label">Deterjen Bubuk</div>
              <div className="wl-stat-number text-[1.15rem]">{matBubuk.toFixed(2)} <small>kg</small></div>
            </div>
          </div>
          <div className="wl-stat-card !p-4">
            <div className="wl-stat-icon info">💧</div>
            <div className="wl-stat-content">
              <div className="wl-stat-label">Deterjen Cair</div>
              <div className="wl-stat-number text-[1.15rem]">{matCair.toFixed(2)} <small>L</small></div>
            </div>
          </div>
          <div className="wl-stat-card !p-4">
            <div className="wl-stat-icon success">✦</div>
            <div className="wl-stat-content">
              <div className="wl-stat-label">Pewangi</div>
              <div className="wl-stat-number text-[1.15rem]">{matPewangi.toFixed(2)} <small>L</small></div>
            </div>
          </div>
          <div className="wl-stat-card !p-4">
            <div className="wl-stat-icon primary">☁</div>
            <div className="wl-stat-content">
              <div className="wl-stat-label">Softener</div>
              <div className="wl-stat-number text-[1.15rem]">{matSoft.toFixed(2)} <small>L</small></div>
            </div>
          </div>
        </div>
        {(matBubuk === 0 && matCair === 0 && matPewangi === 0 && matSoft === 0) && (
          <div className="px-5 pb-3 text-xs font-semibold text-slate-400">Belum ada penggunaan bahan hari ini</div>
        )}
      </div>

      {/* Daftar Pesanan Hari Ini */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2">📋 Daftar Pesanan Hari Ini</h3>
          <a href="#" className="text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition">Lihat Semua ›</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">No. Order</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Pelanggan</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Layanan</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Jenis</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Kotor</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Berat</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Status</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Total</th>
                <th className="px-4 py-3 text-[11px] font-extrabold tracking-widest uppercase text-slate-400">Estimasi</th>
              </tr>
            </thead>
            <tbody>
              {ordersToday.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 font-semibold">Belum ada pesanan hari ini</td>
                </tr>
              ) : (
                ordersToday.map((o) => {
                  const s = statusMap[o.status] ?? statusMap.pending;
                  const layananLengkap =
                    o.isExpress && o.isDelivery
                      ? `${o.serviceType} (Express + Delivery)`
                      : o.isExpress
                        ? `${o.serviceType} (Express)`
                        : o.isDelivery
                          ? `${o.serviceType} (Delivery)`
                          : o.serviceType;
                  return (
                    <tr key={o.noPesanan} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-extrabold text-[#2563EB] whitespace-nowrap">{o.noPesanan}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{o.customer?.nama ?? "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full">{layananLengkap}</span></td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{o.clothingType?.nama ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{o.dirtLevel?.level ?? "-"}</td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">{Number(o.weight).toFixed(1)} kg</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}>{s.label}</span></td>
                      <td className="px-4 py-3 font-extrabold whitespace-nowrap">Rp {Number(o.cost).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(o.estimatedDate).toLocaleDateString("id-ID")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-slate-100 text-xs font-semibold text-slate-400 flex justify-between">
          <span>Menampilkan {ordersToday.length} dari {totalToday} pesanan hari ini • Real dari Neon</span>
          <span className="hidden sm:inline">Halaman 1 • 10/baris</span>
        </div>
      </div>
    </div>
  );
}
