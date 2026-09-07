import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function rupiah(n: number) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}
function formatTanggal(d: Date) {
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

export default async function Page() {
  const user = await requireRole(["admin"]);
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: { select: { nama: true, noTelepon: true, noPelanggan: true } },
      dirtLevel: { select: { level: true } },
      clothingType: { select: { nama: true } },
      masterHarga: { select: { layanan: true, hargaPerKg: true } },
    },
  });

  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center text-white font-black">◈</span>
          <h1 className="text-xl font-black text-[#1E293B] tracking-tight">Daftar Pesanan</h1>
          <span className="hidden sm:inline-flex ml-auto text-xs font-bold bg-[#EFF6FF] text-[#2563EB] px-3 py-1 rounded-full border border-[#DBEAFE]">
            {orders.length} pesanan • terbaru dulu
          </span>
          <Link
            href="/admin/pesanan/baru"
            className="ml-auto sm:ml-2 px-4 py-2 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white font-bold text-sm shadow-[0_8px_16px_rgba(37,99,235,.2)] hover:-translate-y-px transition flex items-center gap-2"
          >
            ＋ Input Order
          </Link>
        </div>
        <p className="text-sm text-slate-500 font-medium">
          Semua pesanan (orderBy createdAt desc). Klik baris untuk lihat detail.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Login sebagai <b>{user.namaLengkap}</b> ({user.role})
        </p>

        {orders.length === 0 ? (
          <div className="mt-6 p-10 bg-[#F8FAFC] border border-dashed border-slate-200 rounded-xl text-center">
            <div className="text-3xl">📭</div>
            <div className="font-bold text-slate-700 mt-2">Belum ada pesanan</div>
            <div className="text-xs text-slate-400 mt-1">Gunakan Input Order Baru untuk membuat pesanan pertama.</div>
            <Link href="/admin/pesanan/baru" className="inline-flex mt-4 px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-sm">
              ⤷ Ke Input Order Baru
            </Link>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto -mx-6">
            <div className="min-w-[900px] px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] tracking-[0.06em] uppercase font-bold text-[#475569] border-b border-slate-100">
                    <th className="text-left py-3 px-2">No Pesanan</th>
                    <th className="text-left py-3 px-2">Pelanggan</th>
                    <th className="text-left py-3 px-2">Layanan</th>
                    <th className="text-right py-3 px-2">Berat</th>
                    <th className="text-right py-3 px-2">Cost</th>
                    <th className="text-center py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Tanggal</th>
                    <th className="text-center py-3 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-slate-50 hover:bg-[#F8FAFC] transition"
                    >
                      <td className="py-3 px-2">
                        <Link href={`/admin/pesanan/${o.noPesanan}`} className="font-mono font-bold text-[#2563EB] hover:underline">
                          {o.noPesanan}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-medium">{o.serviceType}{o.isExpress ? " • Express" : ""}{o.isDelivery ? " • Delivery" : ""}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-bold text-[#1E293B]">{o.customer.nama}</div>
                        <div className="text-xs text-slate-500">{o.customer.noPelanggan} • {o.customer.noTelepon}</div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] text-xs font-bold">
                          {o.masterHarga?.layanan ?? o.serviceType}
                        </span>
                        {o.clothingType && <div className="text-[11px] text-slate-500 mt-1">{o.clothingType.nama}{o.dirtLevel ? ` • ${o.dirtLevel.level}` : ""}</div>}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-[#1E293B]">{Number(o.weight).toFixed(1)} kg</td>
                      <td className="py-3 px-2 text-right font-black text-[#0F172A]">{rupiah(Number(o.cost))}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border
                          ${o.status === "done" ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]" :
                            o.status === "pending" ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]" :
                            o.status === "processing" ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]" :
                            o.status === "completed" ? "bg-[#F0FDF4] text-[#065F46] border-[#A7F3D0]" :
                            "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {o.status}
                        </span>
                        <div className="text-[11px] text-slate-400">{o.paymentStatus}</div>
                      </td>
                      <td className="py-3 px-2 text-xs font-semibold text-slate-600">
                        <div>{formatTanggal(o.entryDate)}</div>
                        <div className="text-[11px] text-slate-400">est {formatTanggal(o.estimatedDate)}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Link href={`/admin/pesanan/${o.noPesanan}`} className="inline-flex px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] transition">
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/pesanan/baru" className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold text-sm">⤷ Input Order Baru</Link>
          <Link href="/admin" className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-600">← Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
