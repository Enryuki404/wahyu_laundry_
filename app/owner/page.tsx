import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getWIBDayRange() {
  const jakartaDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const start = new Date(`${jakartaDateStr}T00:00:00+07:00`);
  const end = new Date(`${jakartaDateStr}T23:59:59.999+07:00`);
  return { jakartaDateStr, start, end };
}
function getWIBMonthRange() {
  const jakartaDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const year = Number(jakartaDateStr.slice(0, 4));
  const month = Number(jakartaDateStr.slice(5, 7));
  const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStart = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
  const monthEnd = new Date(nextMonthStart.getTime() - 1);
  // days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  return { year, month, monthStart, monthEnd, daysInMonth, jakartaDateStr };
}

export default async function OwnerPage() {
  const user = await requireRole(["owner"]);
  const monthLabel = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const { start: dayStart, end: dayEnd } = getWIBDayRange();
  const { year, month, monthStart, monthEnd, daysInMonth } = getWIBMonthRange();

  const [pendapatanAgg, orderHari, pelangganBaru, profitPendapatanAgg, profitPengeluaranAgg, usageAgg] =
    await Promise.all([
      prisma.cashFlow.aggregate({
        _sum: { jumlah: true },
        where: { jenis: "pendapatan", tanggal: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.order.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.customer.count({
        where: { memberSince: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.cashFlow.aggregate({
        _sum: { jumlah: true },
        where: { jenis: "pendapatan", tanggal: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.cashFlow.aggregate({
        _sum: { jumlah: true },
        where: { jenis: "pengeluaran", tanggal: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.logInventory.aggregate({
        _sum: { detergenBubuk: true, pewangi: true, softener: true },
        where: { tanggalMasuk: { gte: monthStart, lte: monthEnd } },
      }),
    ]);

  const pendapatanHari = Number(pendapatanAgg._sum.jumlah ?? 0);
  const profitPendapatan = Number(profitPendapatanAgg._sum.jumlah ?? 0);
  const profitPengeluaran = Number(profitPengeluaranAgg._sum.jumlah ?? 0);
  const profitBulan = profitPendapatan - profitPengeluaran;

  const totalDetBubuk = Number(usageAgg._sum.detergenBubuk ?? 0);
  const totalPewangi = Number(usageAgg._sum.pewangi ?? 0);
  const totalSoftener = Number(usageAgg._sum.softener ?? 0);
  const totalUsage = totalDetBubuk + totalPewangi + totalSoftener;

  // Fetch detailed rows for chart data injection (tanpa chart.js, hanya angka)
  const [cashFlowsMonth, logInventoriesMonth, customersMonth, cashFlowPendapatanPerDate] = await Promise.all([
    prisma.cashFlow.findMany({
      where: { tanggal: { gte: monthStart, lte: monthEnd } },
      select: { tanggal: true, jenis: true, jumlah: true },
      orderBy: { tanggal: "asc" },
    }),
    prisma.logInventory.findMany({
      where: { tanggalMasuk: { gte: monthStart, lte: monthEnd } },
      select: { tanggalMasuk: true, detergenBubuk: true, pewangi: true, softener: true },
    }),
    prisma.customer.findMany({
      where: { memberSince: { gte: monthStart, lte: monthEnd } },
      select: { memberSince: true },
    }),
    prisma.cashFlow.groupBy({
      by: ["tanggal"],
      where: { jenis: "pendapatan", tanggal: { gte: monthStart, lte: monthEnd } },
      _sum: { jumlah: true },
      orderBy: { tanggal: "asc" },
    }),
  ]);

  // Build per-day maps for usage
  function dateKeyWIB(d: Date): string {
    // convert Date to WIB date string YYYY-MM-DD
    const s = new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    return s;
  }

  const usageByDate: Record<string, { bubuk: number; pewangi: number; softener: number }> = {};
  for (const li of logInventoriesMonth) {
    if (!li.tanggalMasuk) continue;
    const k = dateKeyWIB(li.tanggalMasuk);
    if (!usageByDate[k]) usageByDate[k] = { bubuk: 0, pewangi: 0, softener: 0 };
    usageByDate[k].bubuk += Number(li.detergenBubuk ?? 0);
    usageByDate[k].pewangi += Number(li.pewangi ?? 0);
    usageByDate[k].softener += Number(li.softener ?? 0);
  }

  const incomeByDate: Record<string, number> = {};
  const expenseByDate: Record<string, number> = {};
  for (const cf of cashFlowsMonth) {
    const k = dateKeyWIB(cf.tanggal);
    const val = Number(cf.jumlah);
    if (cf.jenis === "pendapatan") incomeByDate[k] = (incomeByDate[k] ?? 0) + val;
    else expenseByDate[k] = (expenseByDate[k] ?? 0) + val;
  }

  const customerByDate: Record<string, number> = {};
  for (const c of customersMonth) {
    const k = dateKeyWIB(c.memberSince);
    customerByDate[k] = (customerByDate[k] ?? 0) + 1;
  }

  // Build ordered label arrays for current month 01..end
  const labels: string[] = [];
  const detBubukSeries: number[] = [];
  const pewangiSeries: number[] = [];
  const softenerSeries: number[] = [];
  const incomeSeries: number[] = [];
  const expenseSeries: number[] = [];
  const customerSeries: number[] = [];
  const pendapatanSeries: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const label = `${String(d).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
    labels.push(label);
    const u = usageByDate[dateStr];
    detBubukSeries.push(u ? Number(u.bubuk.toFixed(2)) : 0);
    pewangiSeries.push(u ? Number(u.pewangi.toFixed(2)) : 0);
    softenerSeries.push(u ? Number(u.softener.toFixed(2)) : 0);
    incomeSeries.push(incomeByDate[dateStr] ?? 0);
    expenseSeries.push(expenseByDate[dateStr] ?? 0);
    customerSeries.push(customerByDate[dateStr] ?? 0);
  }

  // pendapatan per date for incomeChart (grouped already)
  const pendapatanMap: Record<string, number> = {};
  for (const g of cashFlowPendapatanPerDate) {
    const k = dateKeyWIB(g.tanggal);
    pendapatanMap[k] = Number(g._sum.jumlah ?? 0);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    pendapatanSeries.push(pendapatanMap[dateStr] ?? 0);
  }

  const chartData = {
    labels,
    detBubuk: detBubukSeries,
    pewangi: pewangiSeries,
    softener: softenerSeries,
    income: incomeSeries,
    expense: expenseSeries,
    customers: customerSeries,
    pendapatan: pendapatanSeries,
  };

  const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6 animate-[wlIn_0.45s_ease]">
      {/* Intro */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 px-5 py-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="font-extrabold text-[#1E293B] text-[1.1rem] tracking-tight">Dashboard Owner 👑</div>
          <div className="text-sm text-slate-400 font-medium">Pantau performa bisnis Wahyu Laundry bulan {monthLabel} — halo, {user.namaLengkap}</div>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-bold bg-[#EFF6FF] border border-[#DBEAFE] text-[#1E40AF] px-3 py-2 rounded-full">
          <span className="w-2 h-2 bg-[#22C55E] rounded-full" /> Bulan Berjalan
        </span>
      </div>

      {/* 4 KPI real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wl-stat-card">
          <div className="wl-stat-icon primary">💰</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Pendapatan Hari Ini</div>
            <div className="wl-stat-number text-[1.15rem]">{fmtRp(pendapatanHari)}</div>
            <div className="wl-stat-sub">Cashflow masuk</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon success">🛒</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Order Hari Ini</div>
            <div className="wl-stat-number">{orderHari}</div>
            <div className="wl-stat-sub">Transaksi hari ini</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon warning">👥</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Pelanggan Baru Bulan Ini</div>
            <div className="wl-stat-number">{pelangganBaru}</div>
            <div className="wl-stat-sub">Member growth</div>
          </div>
        </div>
        <div className="wl-stat-card">
          <div className="wl-stat-icon danger">📈</div>
          <div className="wl-stat-content">
            <div className="wl-stat-label">Profit Bulan Ini</div>
            <div className="wl-stat-number text-[1.15rem]">{fmtRp(profitBulan)}</div>
            <div className="wl-stat-sub">Pendapatan − Pengeluaran</div>
          </div>
        </div>
      </div>

      {/* Penggunaan Bahan Bulan Ini */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-2 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
          <h3 className="font-extrabold text-[#1E293B] flex items-center gap-2">🧪 Penggunaan Bahan Bulan Ini</h3>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">Total: {totalUsage.toFixed(2)} kg digunakan</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="wl-stat-card !p-4">
              <div className="wl-stat-icon slate">▣</div>
              <div className="wl-stat-content">
                <div className="wl-stat-label">Detergen Bubuk</div>
                <div className="wl-stat-number text-[1.2rem]">{totalDetBubuk.toFixed(2)} <small>kg</small></div>
              </div>
            </div>
            <div className="wl-stat-card !p-4">
              <div className="wl-stat-icon success">✦</div>
              <div className="wl-stat-content">
                <div className="wl-stat-label">Pewangi</div>
                <div className="wl-stat-number text-[1.2rem]">{totalPewangi.toFixed(2)} <small>kg</small></div>
              </div>
            </div>
            <div className="wl-stat-card !p-4">
              <div className="wl-stat-icon info">💧</div>
              <div className="wl-stat-content">
                <div className="wl-stat-label">Softener</div>
                <div className="wl-stat-number text-[1.2rem]">{totalSoftener.toFixed(2)} <small>kg</small></div>
              </div>
            </div>
          </div>
          {/* Chart placeholder canvas styled — data injected via data attribute */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Penggunaan Harian — {monthLabel}</span>
              <span className="text-xs font-bold text-slate-400">canvas#usageChart</span>
            </div>
            <div
              className="h-[220px] rounded-xl bg-gradient-to-br from-white to-[#F1F5F9] border border-slate-200 border-dashed flex flex-col items-center justify-center gap-2 relative overflow-hidden"
              data-chart="usage"
              data-labels={JSON.stringify(labels)}
              data-det-bubuk={JSON.stringify(detBubukSeries)}
              data-pewangi={JSON.stringify(pewangiSeries)}
              data-softener={JSON.stringify(softenerSeries)}
            >
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(#2563EB 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="w-full px-6">
                <div className="flex items-end gap-1.5 h-28 justify-center">
                  {detBubukSeries.map((_, i) => {
                    const total = detBubukSeries[i] + pewangiSeries[i] + softenerSeries[i];
                    const max = Math.max(...detBubukSeries.map((v, idx) => v + pewangiSeries[idx] + softenerSeries[idx]), 1);
                    const h = max === 0 ? 0 : Math.round((total / max) * 100);
                    return <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-[#2563EB]/80 to-[#38BDF8]/60" style={{ height: `${Math.max(h, total > 0 ? 8 : 2)}%` }} />;
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                  <span>{labels[0] ?? "01"}</span><span>{labels[Math.floor(labels.length / 2)] ?? ""}</span><span>{labels[labels.length - 1] ?? ""}</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">Chart placeholder — data log_inventory bulan berjalan (ter-inject)</span>
              <span className="text-[10px] text-slate-300">Max harian: {Math.max(...detBubukSeries, ...pewangiSeries, ...softenerSeries).toFixed(2)} kg</span>
            </div>
            {/* raw props for future chart.js */}
            <pre className="hidden" data-testid="usage-props">{JSON.stringify(chartData)}</pre>
          </div>
        </div>
      </div>

      {/* 2 charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-extrabold text-[#1E293B] flex items-center gap-2">💰 Grafik Pendapatan Bulanan</h3></div>
          <div className="p-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3" data-chart="income" data-labels={JSON.stringify(labels)} data-pendapatan={JSON.stringify(pendapatanSeries)}>
              <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400">canvas#incomeChart</span>
              <div className="h-[220px] mt-2 rounded-xl bg-white border border-slate-200 flex flex-col justify-center p-4 overflow-hidden relative">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-100" />
                <svg viewBox="0 0 300 100" className="w-full h-32">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 60 C 30 45, 60 80, 90 50 S 150 20, 180 35 S 230 70, 260 40 S 290 55, 300 30 L 300 100 L 0 100 Z" fill="url(#g1)" />
                  <path d="M0 60 C 30 45, 60 80, 90 50 S 150 20, 180 35 S 230 70, 260 40 S 290 55, 300 30" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span></div>
              </div>
              <p className="text-center text-xs font-semibold text-slate-400 mt-2">Line chart — pendapatan per tanggal • total bulan: {fmtRp(profitPendapatan)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-extrabold text-[#1E293B] flex items-center gap-2">👥 Pertumbuhan Pelanggan</h3></div>
          <div className="p-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3" data-chart="customer" data-labels={JSON.stringify(labels)} data-customers={JSON.stringify(customerSeries)}>
              <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400">canvas#customerChart</span>
              <div className="h-[220px] mt-2 rounded-xl bg-white border border-slate-200 flex items-end justify-center gap-1 p-4 overflow-x-auto">
                {customerSeries.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[6px]">
                    <div className="w-full rounded-t-lg bg-[#0EA5E9]/20 border border-[#0EA5E9]/30" style={{ height: `${Math.max(h * 18, h > 0 ? 8 : 2)}px` }} />
                    {i % 4 === 0 && <span className="text-[9px] font-bold text-slate-400">{labels[i]}</span>}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs font-semibold text-slate-400 mt-2">Bar chart — pelanggan baru per tanggal • bulan ini: {pelangganBaru}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="bg-white rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,.06)] border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-extrabold text-[#1E293B] flex items-center gap-2">⇄ Cash Flow Bulanan</h3></div>
        <div className="p-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3" data-chart="cashflow" data-labels={JSON.stringify(labels)} data-income={JSON.stringify(incomeSeries)} data-expense={JSON.stringify(expenseSeries)}>
            <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400">canvas#cashFlowChart</span>
            <div className="h-[240px] mt-2 rounded-xl bg-white border border-slate-200 p-4 flex flex-col justify-center overflow-hidden">
              <div className="flex gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-[#2563EB]" /> Pendapatan</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><span className="w-3 h-3 rounded-full bg-[#EF4444]" /> Pengeluaran</span>
              </div>
              <svg viewBox="0 0 300 80" className="w-full h-36">
                <path d="M0 50 C 40 30, 80 60, 120 25 S 180 45, 220 20 S 260 35, 300 10" fill="none" stroke="#2563EB" strokeWidth="2" />
                <path d="M0 65 C 40 55, 80 70, 120 45 S 180 60, 220 40 S 260 55, 300 30" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
              <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span></div>
            </div>
            <p className="text-center text-xs font-semibold text-slate-400 mt-2">Line chart — income vs expense harian • profit: {fmtRp(profitBulan)}</p>
          </div>
        </div>
      </div>

      {/* Hidden props JSON for future chart.js without install */}
      <pre className="hidden" id="owner-chart-props" data-props={JSON.stringify(chartData)}>{JSON.stringify(chartData)}</pre>
    </div>
  );
}
