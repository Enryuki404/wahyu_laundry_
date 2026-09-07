"use client";

import { useEffect, useMemo, useState } from "react";

type MasterHarga = { id: number; layanan: string; hargaPerKg: number | string };
type MasterJenis = { id: number; nama: string; deterjenType: string; deskripsi: string | null };
type MasterTingkat = {
  id: number;
  level: string;
  tambahanDeterjen: number | string;
  keterangan: string | null;
  pemutih: string | null;
  penghilangNoda: string | null;
  pelembut: string | null;
};

type Props = {
  masterHarga: MasterHarga[];
  masterJenis: MasterJenis[];
  masterTingkat: MasterTingkat[];
};

type CustomerHit = {
  id: number;
  nama: string;
  noTelepon: string;
  alamat: string | null;
  noPelanggan: string;
  email: string | null;
};

function getSuffix(isExpress: boolean, isDelivery: boolean) {
  if (isExpress && isDelivery) return "X";
  if (isExpress) return "E";
  if (isDelivery) return "D";
  return "R";
}
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function formatIndo(dateStr: string) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}
function rupiah(n: number) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export default function InputOrderForm({ masterHarga, masterJenis, masterTingkat }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [selected, setSelected] = useState<CustomerHit | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [serviceType, setServiceType] = useState<"CC" | "ST" | "CS" | "">("");
  const [dirtLevelId, setDirtLevelId] = useState<number | "">("");
  const [clothingTypeId, setClothingTypeId] = useState<number | "">("");
  const [weight, setWeight] = useState<string>("");
  const [isExpress, setIsExpress] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [createdNo, setCreatedNo] = useState<string | null>(null);

  const [showKeypad, setShowKeypad] = useState(false);
  const [tempWeight, setTempWeight] = useState("");

  const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }), []);

  // Debounce search
  useEffect(() => {
    if (!q || q.length < 1) {
      setHits([]);
      return;
    }
    if (selected && q === selected.nama) return;
    const t = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
        const j = await res.json();
        setHits(j.customers ?? []);
        setShowDrop(true);
      } catch {
        setHits([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, selected]);

  const kodeLayanan = useMemo(() => {
    if (!serviceType) return "-";
    return `${serviceType}${getSuffix(isExpress, isDelivery)}`;
  }, [serviceType, isExpress, isDelivery]);

  const estDate = useMemo(() => {
    if (!serviceType) return "";
    let add = 0;
    if (isExpress) add = 1;
    else if (serviceType === "CS") add = 3;
    else add = 2;
    return addDays(todayStr, add);
  }, [serviceType, isExpress, todayStr]);

  const calc = useMemo(() => {
    if (!serviceType || !weight) return null;
    const w = parseFloat(weight);
    if (!w || w <= 0) return null;
    // ST doesn't require dirt/clothing, but if ST we still calculate
    if (serviceType !== "ST" && (!dirtLevelId || !clothingTypeId)) return null;

    const hargaRow = masterHarga.find((m) => m.layanan === kodeLayanan);
    if (!hargaRow) return { hargaPerKg: 0, biayaLayanan: 0, biayaTambahan: 0, total: 0, hargaRow: null as MasterHarga | null };

    const hargaPerKg = Number(hargaRow.hargaPerKg);
    const biayaLayanan = hargaPerKg * w;
    let biayaTambahan = 0;
    if (serviceType !== "ST") {
      const tingkat = masterTingkat.find((t) => t.id === Number(dirtLevelId));
      if (tingkat) {
        if (Number(tingkat.tambahanDeterjen) > 0) biayaTambahan += 500;
        if (tingkat.pemutih === "ya") biayaTambahan += 500;
        if (tingkat.penghilangNoda === "ya") biayaTambahan += 500;
      }
    }
    const total = Math.round(biayaLayanan + biayaTambahan);
    return { hargaPerKg, biayaLayanan: Math.round(biayaLayanan), biayaTambahan, total, hargaRow };
  }, [serviceType, weight, dirtLevelId, clothingTypeId, kodeLayanan, masterHarga, masterTingkat]);

  const chemicalsPreview = useMemo(() => {
    if (!serviceType || !weight) return [];
    const w = parseFloat(weight);
    if (!w || w <= 0) return [];
    if (serviceType === "ST") {
      return [
        { nama: "Pewangi", jumlah: (w * 0.06).toFixed(2), satuan: "L" },
        { nama: "Softener", jumlah: (w * 0.04).toFixed(2), satuan: "L" },
      ];
    }
    if (!dirtLevelId || !clothingTypeId) return [];
    const tingkat = masterTingkat.find((t) => t.id === Number(dirtLevelId));
    const jenis = masterJenis.find((j) => j.id === Number(clothingTypeId));
    if (!tingkat || !jenis) return [];
    const multiplier = 1 + Number(tingkat.tambahanDeterjen);
    const list: { nama: string; jumlah: string; satuan: string }[] = [];
    if (jenis.deterjenType === "bubuk") {
      list.push({ nama: "Deterjen Bubuk", jumlah: (w * 0.14 * multiplier).toFixed(3), satuan: "kg" });
    } else {
      list.push({ nama: "Deterjen Cair", jumlah: (w * 0.06 * multiplier).toFixed(3), satuan: "L" });
    }
    list.push({ nama: "Pewangi", jumlah: (w * 0.06).toFixed(3), satuan: "L" });
    list.push({ nama: "Softener", jumlah: (w * 0.04).toFixed(3), satuan: "L" });
    if (tingkat.penghilangNoda === "ya") {
      if (jenis.deterjenType === "bubuk") list.push({ nama: "Alkali", jumlah: (w * 0.03).toFixed(3), satuan: "L" });
      else list.push({ nama: "Emulsifier", jumlah: (w * 0.03).toFixed(3), satuan: "L" });
    }
    if (tingkat.pemutih === "ya") {
      if (jenis.deterjenType === "bubuk") {
        list.push({ nama: "Chloro Bleach", jumlah: (w * 0.02).toFixed(3), satuan: "L" });
        list.push({ nama: "Neutralizer", jumlah: (w * 0.02).toFixed(3), satuan: "L" });
      } else {
        list.push({ nama: "Oxygen Bleach", jumlah: (w * 0.02).toFixed(3), satuan: "L" });
      }
    }
    return list;
  }, [serviceType, weight, dirtLevelId, clothingTypeId, masterTingkat, masterJenis]);

  const canSubmit = useMemo(() => {
    if (!selected) return false;
    if (!serviceType) return false;
    const w = parseFloat(weight);
    if (!w || w <= 0) return false;
    if (serviceType !== "ST" && (!dirtLevelId || !clothingTypeId)) return false;
    if (!calc || calc.total === 0) return false;
    return true;
  }, [selected, serviceType, weight, dirtLevelId, clothingTypeId, calc]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setMsg({ type: "err", text: "Lengkapi data pelanggan, layanan, berat, dan spesifikasi terlebih dahulu." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const payload = {
        customerId: selected!.id,
        serviceType,
        weight: parseFloat(weight),
        isExpress,
        isDelivery,
        dirtLevelId: serviceType === "ST" ? null : Number(dirtLevelId),
        clothingTypeId: serviceType === "ST" ? null : Number(clothingTypeId),
        specialNotes: notes || null,
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        throw new Error(j.message || "Gagal menyimpan order");
      }
      setCreatedNo(j.data.noPesanan);
      setMsg({ type: "ok", text: `Order berhasil: ${j.data.noPesanan} — ${rupiah(j.data.cost)}` });
      // reset weight etc but keep customer? optionally clear
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({ type: "err", text: m });
    } finally {
      setSubmitting(false);
    }
  }

  const disabledSpec = serviceType === "ST";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Glass header preview like login */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#60A5FA]" />
        <div className="px-5 py-4 flex flex-wrap justify-between gap-3 items-center">
          <div>
            <div className="font-black text-[#1E293B] text-[1.05rem] tracking-tight flex items-center gap-2">🧾 Input Order Baru</div>
            <div className="text-sm text-[#94A3B8] font-medium">Pilih pelanggan, layanan, dan berat — preview biaya otomatis</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">Kode: {kodeLayanan}</span>
            <span className="px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-slate-200 text-slate-600">{formatIndo(todayStr)} → {estDate ? formatIndo(estDate) : "-"}</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${msg.type === "ok" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"}`}>
          {msg.text} {createdNo && msg.type === "ok" && <a href="/admin/pesanan" className="underline ml-2">Lihat Daftar Pesanan →</a>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer + Layanan + Spec */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Pelanggan */}
          <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-5">
            <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">👤 Data Pelanggan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1 relative">
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-1.5 block">Cari Pelanggan</label>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    if (selected && e.target.value !== selected.nama) setSelected(null);
                  }}
                  onFocus={() => q && hits.length > 0 && setShowDrop(true)}
                  placeholder="Ketik nama / no telepon / no pelanggan..."
                  className="w-full h-11 rounded-xl border-[1.6px] border-[#E2E8F0] bg-white px-4 text-[0.95rem] font-semibold text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.13)]"
                  autoComplete="off"
                />
                {loadingSearch && <div className="absolute right-3 top-[38px] text-xs text-[#2563EB] font-bold">⏳ Mencari...</div>}
                {showDrop && hits.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-[280px] overflow-auto">
                    {hits.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setSelected(h);
                          setQ(h.nama);
                          setHits([]);
                          setShowDrop(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#F0F7FF] border-b border-slate-50 last:border-0"
                      >
                        <div className="font-bold text-sm text-[#1E293B]">{h.nama}</div>
                        <div className="text-xs text-slate-500 flex gap-3">
                          <span>{h.noPelanggan}</span>
                          <span>{h.noTelepon}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selected && (
                  <div className="mt-2 text-xs font-semibold text-[#0EA5E9] bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg px-3 py-2">✓ Terpilih: {selected.nama} — {selected.noTelepon}</div>
                )}
              </div>
              <div>
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-1.5 block">No. Telepon</label>
                <input value={selected?.noTelepon ?? ""} readOnly placeholder="-" className="w-full h-11 rounded-xl border-[1.6px] border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm font-semibold text-slate-700" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-1.5 block">Alamat</label>
                <textarea value={selected?.alamat ?? ""} readOnly rows={2} placeholder="-" className="w-full rounded-xl border-[1.6px] border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-medium text-slate-700" />
              </div>
            </div>
          </div>

          {/* Layanan */}
          <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-5">
            <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">🧺 Layanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-2 block">Layanan Utama</label>
                <div className="space-y-2">
                  {[
                    { v: "CC", label: "Cuci (CC)", desc: "Cuci saja" },
                    { v: "ST", label: "Setrika (ST)", desc: "Setrika saja — tanpa dirt/jenis" },
                    { v: "CS", label: "Cuci + Setrika (CS)", desc: "Complete" },
                  ].map((o) => (
                    <label key={o.v} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${serviceType === o.v ? "bg-[#EFF6FF] border-[#2563EB] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
                      <input type="radio" name="serviceType" value={o.v} checked={serviceType === o.v} onChange={() => setServiceType(o.v as never)} className="w-4 h-4 accent-[#2563EB]" />
                      <div>
                        <div className="font-bold text-sm text-[#1E293B]">{o.label}</div>
                        <div className="text-xs text-slate-500">{o.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-2 block">Layanan Tambahan</label>
                <div className="space-y-3 mt-1">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={isExpress} onChange={(e) => setIsExpress(e.target.checked)} className="w-4 h-4 accent-[#2563EB]" />
                    <div>
                      <div className="font-bold text-sm text-[#1E293B]">Express</div>
                      <div className="text-xs text-slate-500">Selesai 1 hari (+ harga khusus)</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={isDelivery} onChange={(e) => setIsDelivery(e.target.checked)} className="w-4 h-4 accent-[#2563EB]" />
                    <div>
                      <div className="font-bold text-sm text-[#1E293B]">Delivery</div>
                      <div className="text-xs text-slate-500">Antar-jemput (+ harga khusus)</div>
                    </div>
                  </label>
                  <div className="text-xs font-semibold text-slate-400 bg-[#F8FAFC] rounded-lg px-3 py-2 border border-dashed border-slate-200">Kode akhir: <b className="text-[#2563EB]">{kodeLayanan}</b> • Estimasi: <b className="text-[#1E293B]">{estDate ? formatIndo(estDate) : "-"}</b></div>
                </div>
              </div>
            </div>
          </div>

          {/* Spesifikasi */}
          <div className={`bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-5 ${disabledSpec ? "opacity-60" : ""}`}>
            <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">✨ Spesifikasi Cucian {disabledSpec && <span className="ml-auto text-xs bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded-full">Nonaktif untuk ST</span>}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-2 block">Jenis Pakaian</label>
                <div className="max-h-[220px] overflow-auto pr-1 space-y-1">
                  {masterJenis.map((j) => (
                    <label key={j.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${clothingTypeId === j.id ? "bg-[#EFF6FF] border-[#2563EB]" : "border-slate-200 hover:bg-slate-50"} ${disabledSpec ? "pointer-events-none" : ""}`}>
                      <input type="radio" name="clothingType" disabled={disabledSpec} checked={clothingTypeId === j.id} onChange={() => setClothingTypeId(j.id)} className="w-4 h-4 accent-[#2563EB]" />
                      <div>
                        <div className="font-bold text-sm text-[#1E293B]">{j.nama}</div>
                        <div className="text-[11px] text-slate-500">Deterjen: {j.deterjenType}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-2 block">Level Kotor</label>
                <div className="max-h-[220px] overflow-auto pr-1 space-y-1">
                  {masterTingkat.map((t) => (
                    <label key={t.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${dirtLevelId === t.id ? "bg-[#EFF6FF] border-[#2563EB]" : "border-slate-200 hover:bg-slate-50"} ${disabledSpec ? "pointer-events-none" : ""}`}>
                      <input type="radio" name="dirtLevel" disabled={disabledSpec} checked={dirtLevelId === t.id} onChange={() => setDirtLevelId(t.id)} className="w-4 h-4 accent-[#2563EB]" />
                      <div>
                        <div className="font-bold text-sm text-[#1E293B]">{t.level}</div>
                        <div className="text-[11px] text-slate-500">+{Number(t.tambahanDeterjen)} deterjen • Pemutih {t.pemutih} • Noda {t.penghilangNoda}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Berat + Ringkasan */}
        <div className="space-y-6">
          <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-5">
            <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">⚖️ Berat Cucian</h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Contoh: 5.0"
                  className="w-full h-11 rounded-xl border-[1.6px] border-[#E2E8F0] bg-white px-4 pr-12 text-sm font-bold text-[#1E293B] outline-none focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.13)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KG</span>
              </div>
              <button type="button" onClick={() => { setTempWeight(weight); setShowKeypad(true); }} className="w-11 h-11 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#EFF6FF] hover:border-[#DBEAFE]">⌨️</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3, 5, 8, 10].map((v) => (
                <button key={v} type="button" onClick={() => setWeight(String(v))} className="py-2 rounded-full border border-slate-200 bg-white text-sm font-bold hover:bg-[#EFF6FF] hover:border-[#BFDBFE]">{v} kg</button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-1.5 block">Catatan Khusus (opsional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Contoh: Pakaian bayi, jangan pakai pewangi terlalu banyak..." className="w-full rounded-xl border-[1.6px] border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-[#2563EB]" />
            </div>
          </div>

          <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 p-5">
            <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">💰 Ringkasan Biaya</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 font-semibold">Harga /kg</span><span className="font-bold">{calc ? rupiah(calc.hargaPerKg) : "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-semibold">Biaya Layanan</span><span className="font-bold">{calc ? rupiah(calc.biayaLayanan) : "Rp 0"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-semibold">Biaya Tambahan</span><span className="font-bold">{calc ? rupiah(calc.biayaTambahan) : "Rp 0"}</span></div>
              <div className="flex justify-between pt-3 border-t border-slate-100 text-base"><span className="font-extrabold text-[#1E293B]">Total Biaya</span><span className="font-black text-[#2563EB]">{calc ? rupiah(calc.total) : "Rp 0"}</span></div>
              {!calc && <div className="text-xs text-amber-600 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">Lengkapi layanan, berat, dan spesifikasi untuk preview.</div>}
            </div>
            <div className="mt-5">
              <div className="text-[0.78rem] font-bold tracking-[0.06em] uppercase text-[#475569] mb-2">Perkiraan Bahan (preview)</div>
              {chemicalsPreview.length === 0 ? (
                <div className="text-xs text-slate-400">-</div>
              ) : (
                <ul className="space-y-1.5">
                  {chemicalsPreview.map((b) => (
                    <li key={b.nama} className="flex justify-between bg-[#F8FAFC] border border-slate-100 rounded-lg px-3 py-2 text-xs font-semibold">
                      <span className="text-slate-600">{b.nama}</span>
                      <span className="font-bold text-[#1E293B]">{b.jumlah} {b.satuan}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" disabled={!canSubmit || submitting} className={`mt-6 w-full h-12 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition ${canSubmit && !submitting ? "bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] hover:-translate-y-px" : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"}`}>
              {submitting ? "⏳ Menyimpan..." : "💾 Simpan Order"}
            </button>
            <div className="mt-3 text-[11px] text-slate-400 font-medium text-center">No. Pesanan akan auto-generate: WL-{serviceType || "??"}{getSuffix(isExpress, isDelivery)}dmY+rand • Masuk: {todayStr} • Estimasi: {estDate || "-"}</div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="wl-stat-card !p-4">
              <div className="wl-stat-icon primary">◈</div>
              <div className="wl-stat-content">
                <div className="wl-stat-label">Kode Layanan</div>
                <div className="wl-stat-number text-[1.05rem]">{kodeLayanan}</div>
                <div className="wl-stat-sub">{calc?.hargaRow ? `Rp ${Number(calc.hargaRow.hargaPerKg).toLocaleString("id-ID")}/kg` : "Pilih layanan"}</div>
              </div>
            </div>
            <div className="wl-stat-card !p-4">
              <div className="wl-stat-icon success">◐</div>
              <div className="wl-stat-content">
                <div className="wl-stat-label">Estimasi Selesai</div>
                <div className="wl-stat-number text-[1.05rem]">{estDate ? new Date(estDate).toLocaleDateString("id-ID") : "-"}</div>
                <div className="wl-stat-sub">{estDate ? formatIndo(estDate) : "Pilih layanan"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keypad Modal */}
      {showKeypad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={() => setShowKeypad(false)} aria-label="close" />
          <div className="relative bg-white rounded-[16px] shadow-2xl border border-slate-100 w-full max-w-[340px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="font-extrabold text-[#1E293B]">Input Berat</div>
              <button type="button" onClick={() => setShowKeypad(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">✕</button>
            </div>
            <div className="p-5">
              <input value={tempWeight} readOnly placeholder="0" className="w-full h-14 rounded-xl bg-[#F8FAFC] border border-slate-200 text-right px-4 text-2xl font-black text-[#1E293B]" />
              <div className="grid grid-cols-3 gap-2 mt-4">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "C"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === "C") setTempWeight("");
                      else if (k === ".") {
                        if (!tempWeight.includes(".")) setTempWeight((v) => v + ".");
                      } else setTempWeight((v) => v + k);
                    }}
                    className={`h-12 rounded-xl font-black text-lg border ${k === "C" ? "bg-[#FEE2E2] border-[#FECACA] text-[#DC2626]" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setWeight(tempWeight); setShowKeypad(false); }} className="mt-4 w-full h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white font-extrabold">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
