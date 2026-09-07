import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Form from "./Form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Input Order — Wahyu Laundry" };

export default async function Page() {
  await requireRole(["admin"]);

  const [masterHarga, masterJenis, masterTingkat] = await Promise.all([
    prisma.masterHarga.findMany({ orderBy: { layanan: "asc" } }),
    prisma.masterJenisPakaian.findMany({ orderBy: { nama: "asc" } }),
    prisma.masterTingkatKotor.findMany({ orderBy: { id: "asc" } }),
  ]);

  // Serialize Decimal to number for client
  const harga = masterHarga.map((m) => ({
    id: m.id,
    layanan: m.layanan,
    hargaPerKg: Number(m.hargaPerKg),
  }));
  const jenis = masterJenis.map((j) => ({
    id: j.id,
    nama: j.nama,
    deterjenType: j.deterjenType,
    deskripsi: j.deskripsi,
  }));
  const tingkat = masterTingkat.map((t) => ({
    id: t.id,
    level: t.level,
    tambahanDeterjen: Number(t.tambahanDeterjen),
    keterangan: t.keterangan,
    pemutih: t.pemutih,
    penghilangNoda: t.penghilangNoda,
    pelembut: t.pelembut,
  }));

  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      <div className="flex items-center gap-3">
        <a href="/admin/pesanan" className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">←</a>
        <h1 className="text-xl font-black text-[#1E293B] tracking-tight">Input Order</h1>
        <span className="text-xs font-bold bg-[#EFF6FF] text-[#2563EB] px-3 py-1 rounded-full border border-[#DBEAFE]">Admin</span>
      </div>
      <Form masterHarga={harga} masterJenis={jenis} masterTingkat={tingkat} />
    </div>
  );
}
