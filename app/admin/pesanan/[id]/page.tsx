import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function rupiah(n: number) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}
function formatTanggal(d: Date | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return String(d);
  }
}
function formatJam(d: Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID");
}

export default async function DetailPage({ params }: { params: { id: string } }) {
  await requireRole(["admin"]);
  const raw = decodeURIComponent(params.id);

  // Support both numeric id and noPesanan string
  const isNumeric = /^\d+$/.test(raw);
  const order = await prisma.order.findFirst({
    where: isNumeric ? { id: Number(raw) } : { noPesanan: raw },
    include: {
      customer: true,
      dirtLevel: true,
      clothingType: true,
      masterHarga: true,
      operator: { select: { id: true, username: true, namaLengkap: true, role: true } },
      logInventories: true,
      logOrders: { include: { operator: { select: { username: true, namaLengkap: true } } }, orderBy: { id: "asc" } },
      logQcs: true,
    },
  });

  if (!order) {
    return notFound();
  }

  // Also try find logInventory by noPesanan if relation via logInventories empty (fallback)
  let inventories = order.logInventories;
  if (inventories.length === 0) {
    inventories = await prisma.logInventory.findMany({ where: { noPesanan: order.noPesanan }, orderBy: { id: "asc" } });
  }

  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      <div className="flex items-center gap-3">
        <Link href="/admin/pesanan" className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">←</Link>
        <h1 className="text-xl font-black text-[#1E293B] tracking-tight">Detail Pesanan</h1>
        <span className="ml-2 text-xs font-mono font-bold bg-[#EFF6FF] text-[#2563EB] px-3 py-1 rounded-full border border-[#DBEAFE]">{order.noPesanan}</span>
        <Link href="/admin/pesanan" className="ml-auto px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50">← Kembali ke Daftar</Link>
      </div>

      {/* Header order */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#60A5FA]" />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${order.status === "done" ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]" : order.status === "pending" ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]" : "bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]"}`}>{order.status.toUpperCase()}</span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${order.paymentStatus === "paid" ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]" : "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"}`}>{order.paymentStatus}</span>
              <span className="px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-slate-200 text-xs font-bold text-slate-600">{order.serviceType} • {order.masterHarga?.layanan ?? "-"}</span>
              {order.isExpress && <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-xs font-bold">Express</span>}
              {order.isDelivery && <span className="px-2.5 py-1 rounded-full bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-bold">Delivery</span>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4">
                <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569]">No Pesanan</div>
                <div className="font-mono font-black text-[#1E293B] text-base mt-1">{order.noPesanan}</div>
                <div className="text-xs text-slate-500 mt-1">Service: {order.serviceType} • MasterHarga: {order.masterHarga?.layanan ?? "-"} @ {order.masterHarga ? rupiah(Number(order.masterHarga.hargaPerKg)) + "/kg" : "-"}</div>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4">
                <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569]">Berat & Biaya</div>
                <div className="font-black text-[#2563EB] text-lg mt-1">{Number(order.weight).toFixed(1)} kg • {rupiah(Number(order.cost))}</div>
                <div className="text-xs text-slate-500 mt-1">Masuk: {formatTanggal(order.entryDate)} • Estimasi: {formatTanggal(order.estimatedDate)}</div>
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4">
                <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569]">Spesifikasi</div>
                <div className="font-bold text-[#1E293B] mt-1">{order.clothingType?.nama ?? "— (ST / tanpa jenis)"}</div>
                <div className="text-xs text-slate-500">Level: {order.dirtLevel?.level ?? "—"} • Deterjen: {order.clothingType?.deterjenType ?? "-"}</div>
                {order.dirtLevel && <div className="text-xs text-slate-400 mt-1">Tambahan deterjen: {Number(order.dirtLevel.tambahanDeterjen)} • Pemutih: {order.dirtLevel.pemutih} • Noda: {order.dirtLevel.penghilangNoda}</div>}
              </div>
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4">
                <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569]">Operator</div>
                <div className="font-bold text-[#1E293B] mt-1">{order.operator?.namaLengkap ?? `#${order.operatorId}`} <span className="text-xs font-normal text-slate-500">({order.operator?.username ?? "-"})</span></div>
                <div className="text-xs text-slate-500 mt-1">Created: {formatJam(order.createdAt)} • Updated: {order.updatedAt ? formatJam(order.updatedAt) : "-"}</div>
              </div>
            </div>

            {order.specialNotes && (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
                <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#92400E]">Catatan Khusus</div>
                <div className="text-sm font-medium text-[#78350F] mt-1">{order.specialNotes}</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569] border-b border-slate-100 pb-2 mb-3">📇 Pelanggan</div>
              <div className="font-black text-[#1E293B]">{order.customer.nama}</div>
              <div className="text-xs font-mono bg-[#F8FAFC] border border-slate-200 rounded-lg px-2 py-1 mt-1 inline-block">{order.customer.noPelanggan}</div>
              <div className="text-sm font-semibold text-slate-600 mt-2">📞 {order.customer.noTelepon}</div>
              {order.customer.email && <div className="text-xs text-slate-500">{order.customer.email}</div>}
              {order.customer.alamat && <div className="text-sm text-slate-600 mt-2 bg-[#F8FAFC] border border-slate-100 rounded-lg p-3">{order.customer.alamat}</div>}
              <div className="text-xs text-slate-400 mt-2">Member since {formatTanggal(order.customer.memberSince)} • {order.customer.totalOrders ?? 0} orders • {order.customer.totalSpent ? rupiah(Number(order.customer.totalSpent)) : "Rp 0"}</div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569] border-b border-slate-100 pb-2 mb-3">🧴 Log Inventory (chemicals)</div>
              {inventories.length === 0 ? (
                <div className="text-xs text-slate-400">Tidak ada log inventory untuk pesanan ini.</div>
              ) : (
                <div className="space-y-2">
                  {inventories.map((inv) => (
                    <div key={inv.id} className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 text-xs">
                      <div className="font-bold text-slate-700 mb-1">Tgl Masuk: {inv.tanggalMasuk ? formatTanggal(inv.tanggalMasuk) : "-"}</div>
                      <div className="grid grid-cols-2 gap-1.5 font-semibold">
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Bubuk</span><b>{Number(inv.detergenBubuk ?? 0).toFixed(3)} kg</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Cair</span><b>{Number(inv.detergenCair ?? 0).toFixed(3)} L</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Pewangi</span><b>{Number(inv.pewangi ?? 0).toFixed(3)} L</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Softener</span><b>{Number(inv.softener ?? 0).toFixed(3)} L</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Emulsifier</span><b>{Number(inv.emulsifier ?? 0).toFixed(3)}</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Alkali</span><b>{Number(inv.alkali ?? 0).toFixed(3)}</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Chloro</span><b>{Number(inv.chloroBleach ?? 0).toFixed(3)}</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100"><span className="text-slate-500">Oxygen</span><b>{Number(inv.oxygenBleach ?? 0).toFixed(3)}</b></span>
                        <span className="flex justify-between bg-white rounded-lg px-2 py-1 border border-slate-100 col-span-2"><span className="text-slate-500">Neutralizer</span><b>{Number(inv.neutralizer ?? 0).toFixed(3)}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {order.logOrders.length > 0 && (
          <div className="border-t border-slate-100 p-6">
            <div className="text-xs font-bold tracking-[0.06em] uppercase text-[#475569] mb-3">📝 Log Order Timeline</div>
            <div className="space-y-2">
              {order.logOrders.map((l) => (
                <div key={l.id} className="flex gap-3 p-3 bg-[#F8FAFC] border border-slate-100 rounded-xl text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-2 shrink-0" />
                  <div>
                    <div className="font-semibold text-[#1E293B]">{l.notes ?? "-"}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Operator: {l.operator?.namaLengkap ?? l.operatorId} • Wash: {l.washDate ? formatJam(l.washDate) : "-"} • Finishing: {l.finishingDate ? formatJam(l.finishingDate) : "-"} • QC: {l.qcDate ? formatJam(l.qcDate) : "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 p-4 bg-[#F8FAFC] flex flex-wrap gap-2">
          <Link href="/admin/pesanan" className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50">← Kembali</Link>
          <Link href="/admin/pesanan/baru" className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-sm hover:bg-[#1D4ED8]">＋ Input Order Baru</Link>
          <span className="ml-auto text-xs text-slate-400 font-medium self-center">ID: {order.id} • {order.noPesanan}</span>
        </div>
      </div>
    </div>
  );
}
