import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getWIBRange() {
  const jakartaDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const start = new Date(`${jakartaDateStr}T00:00:00+07:00`);
  const end = new Date(`${jakartaDateStr}T23:59:59.999+07:00`);
  const short = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  return { jakartaDateStr, start, end, short };
}

function categorize(order: { noPesanan: string; serviceType: string; isExpress: boolean | null; isDelivery: boolean | null }) {
  // Prefer isExpress/isDelivery flags (real schema)
  if (order.isExpress && order.isDelivery) return "super";
  if (order.isExpress) return "express";
  if (order.isDelivery) return "delivery";
  // Fallback parsing noPesanan/serviceType suffix — mirror PHP LIKE '%R%','%E%','%D%','%X%'
  const s = (order.noPesanan || "").toUpperCase();
  const svc = (order.serviceType || "").toUpperCase();
  const combined = `${s} ${svc}`;
  // X = super (highest priority), E = express, D = delivery, else reguler
  if (combined.includes("X")) return "super";
  if (combined.includes("E")) return "express";
  if (combined.includes("D")) return "delivery";
  if (combined.includes("R")) return "reguler";
  // Default by suffix letter of layanan code if present: e.g., CCR->R, CCE->E etc
  // Already handled via includes, so fallback to reguler
  return "reguler";
}

export default async function OperatorPage() {
  const user = await requireRole(["operator"]);
  const { start, end, short } = getWIBRange();

  // Fetch counts and lists in parallel where possible
  const [pendingRaw, statusPending, statusProcessing, statusFinishing] = await Promise.all([
    prisma.order.findMany({
      where: { status: "pending", createdAt: { gte: start, lte: end } },
      select: { noPesanan: true, serviceType: true, isExpress: true, isDelivery: true },
    }),
    prisma.order.count({ where: { status: "pending", createdAt: { gte: start, lte: end } } }),
    prisma.order.count({ where: { status: "processing", createdAt: { gte: start, lte: end } } }),
    prisma.order.count({ where: { status: "finishing", createdAt: { gte: start, lte: end } } }),
  ]);

  // Group by service_type suffix
  let reguler = 0, express = 0, delivery = 0, superExp = 0;
  for (const o of pendingRaw) {
    const cat = categorize(o);
    if (cat === "reguler") reguler++;
    else if (cat === "express") express++;
    else if (cat === "delivery") delivery++;
    else if (cat === "super") superExp++;
  }

  const [pendingList, processingList, qcList] = await Promise.all([
    prisma.order.findMany({
      where: { status: "pending", createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { nama: true } } },
      take: 20,
    }),
    prisma.order.findMany({
      where: { status: "processing", createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { nama: true } } },
      take: 20,
    }),
    prisma.order.findMany({
      where: { status: "finishing", createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { nama: true } }, logQcs: true },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      {/* Welcome */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 px-5 py-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="font-extrabold text-[#1E293B]">Halo, {user.namaLengkap} 👋</div>
          <div className="text-sm text-slate-400 font-medium">Panel produksi — kelola cucian hari ini dengan cepat • {short}</div>
        </div>
        <span className="text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] px-3 py-1.5 rounded-full">Operator • {short}</span>
      </div>

      {/* 4 kotak Reguler/Express/Delivery/Super — real counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wl-stat-card">
          <div className="wl-stat-icon success">◐</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Reguler</div>
            <div className="wl-stat-number">{reguler}</div>
            <div className="wl-stat-sub">Hari ini • Pending</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon info">⚡</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Express</div>
            <div className="wl-stat-number">{express}</div>
            <div className="wl-stat-sub">Kilau cepat</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon warning">🚚</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Delivery</div>
            <div className="wl-stat-number">{delivery}</div>
            <div className="wl-stat-sub">Antar-jemput</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon danger">🚀</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Delivery Express</div>
            <div className="wl-stat-number">{superExp}</div>
            <div className="wl-stat-sub">Prioritas tinggi</div>
          </div>
        </div>
      </div>

      {/* 3 card pending/processing/QC — real lists */}
      <div className="space-y-5">
        {/* Pending */}
        <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 flex justify-between items-center border-b" style={{ background: "linear-gradient(135deg,#F8FAFC,#F1F5F9)" }}>
            <h3 className="font-extrabold text-[#334155] flex items-center gap-2">⏳ Pesanan Pending Hari Ini <span className="bg-[#E2E8F0] text-[#334155] px-2 py-0.5 rounded-full text-xs font-extrabold">{statusPending}</span></h3>
            <span className="text-xs font-bold text-slate-400">↻ Auto 30s • Real</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70">
                <tr className="text-left text-[11px] font-extrabold tracking-widest uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2.5">No. Pesanan</th>
                  <th className="px-4 py-2.5">Pelanggan</th>
                  <th className="px-4 py-2.5">Layanan</th>
                  <th className="px-4 py-2.5">Berat</th>
                  <th className="px-4 py-2.5">Jam Masuk</th>
                  <th className="px-4 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold">Tidak ada pesanan pending hari ini</td>
                  </tr>
                ) : (
                  pendingList.map((r) => (
                    <tr key={r.noPesanan} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-extrabold text-[#2563EB]">{r.noPesanan}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{r.customer?.nama ?? "-"}</td>
                      <td className="px-4 py-3"><span className="bg-slate-100 px-2 py-1 rounded-full text-xs font-bold">{r.serviceType}</span></td>
                      <td className="px-4 py-3 font-bold">{Number(r.weight).toFixed(1)} kg</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</td>
                      <td className="px-4 py-3"><button className="px-3 py-1.5 rounded-full bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition">Proses →</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processing */}
        <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 flex justify-between items-center border-b" style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
            <h3 className="font-extrabold text-[#1D4ED8] flex items-center gap-2">⚙ Pesanan Dalam Proses <span className="bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded-full text-xs font-extrabold">{statusProcessing}</span></h3>
            <span className="text-xs font-bold text-[#60A5FA]">Sedang dicuci</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50/50">
                <tr className="text-left text-[11px] font-extrabold tracking-widest uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2.5">No. Pesanan</th>
                  <th className="px-4 py-2.5">Pelanggan</th>
                  <th className="px-4 py-2.5">Layanan</th>
                  <th className="px-4 py-2.5">Berat</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {processingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold">Tidak ada pesanan dalam proses</td>
                  </tr>
                ) : (
                  processingList.map((r) => (
                    <tr key={r.noPesanan} className="border-b border-slate-50 hover:bg-blue-50/30">
                      <td className="px-4 py-3 font-extrabold text-[#2563EB]">{r.noPesanan}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{r.customer?.nama ?? "-"}</td>
                      <td className="px-4 py-3"><span className="bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-1 rounded-full text-xs font-bold text-[#1D4ED8]">{r.serviceType}</span></td>
                      <td className="px-4 py-3 font-bold">{Number(r.weight).toFixed(1)} kg</td>
                      <td className="px-4 py-3"><span className="bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full text-xs font-bold">Processing</span></td>
                      <td className="px-4 py-3"><button className="px-3 py-1.5 rounded-full bg-[#0EA5E9] text-white text-xs font-bold hover:bg-[#0284C7] transition">Selesai</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* QC */}
        <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 flex justify-between items-center border-b" style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}>
            <h3 className="font-extrabold text-[#92400E] flex items-center gap-2">✓ Menunggu Quality Control <span className="bg-[#FDE68A] text-[#92400E] px-2 py-0.5 rounded-full text-xs font-extrabold">{statusFinishing}</span></h3>
            <span className="text-xs font-bold text-amber-700">Cek spray • nota • packing</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50/50">
                <tr className="text-left text-[11px] font-extrabold tracking-widest uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2.5">No. Pesanan</th>
                  <th className="px-4 py-2.5">Pelanggan</th>
                  <th className="px-4 py-2.5">Berat</th>
                  <th className="px-4 py-2.5">QC</th>
                  <th className="px-4 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {qcList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 font-semibold">Tidak ada pesanan menunggu QC</td>
                  </tr>
                ) : (
                  qcList.map((r) => {
                    const qc = r.logQcs?.[0];
                    const sprayDone = qc?.spray === "done";
                    const notaDone = qc?.nota === "done";
                    const packingDone = qc?.packing === "done";
                    return (
                      <tr key={r.noPesanan} className="border-b border-slate-50 hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-extrabold text-[#2563EB]">{r.noPesanan}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{r.customer?.nama ?? "-"}</td>
                        <td className="px-4 py-3 font-bold">{Number(r.weight).toFixed(1)} kg</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${sprayDone ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-100 border-slate-200"}`}>{sprayDone ? "✓" : "◯"}</span>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${notaDone ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-100 border-slate-200"}`}>{notaDone ? "✓" : "◯"}</span>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${packingDone ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-100 border-slate-200"}`}>{packingDone ? "✓" : "◯"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><button className="px-3 py-1.5 rounded-full bg-[#F59E0B] text-white text-xs font-bold hover:bg-[#D97706] transition">QC Pass</button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-[#FFFBEB] border-t border-amber-100 text-xs font-semibold text-amber-700 flex items-center gap-2">
            <span>💡</span> Centang spray, nota, packing sebelum menyelesaikan QC — auto refresh 30s seperti PHP.
          </div>
        </div>
      </div>
    </div>
  );
}
