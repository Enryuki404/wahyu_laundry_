import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "wl_token";
function getSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me-please-use-32chars-min!!";
  return new TextEncoder().encode(secret);
}
async function requireAuth() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey());
    return payload as unknown as { userId: number; role: string; username: string; namaLengkap: string };
  } catch {
    return null;
  }
}

// Zod schema — ganti validasi PHP di OrderService/save_order
// FIX: use coerce.number untuk handle customerId string vs int & weight string dari JSON / FormData
// dirtLevelId null untuk ST tetap allowed (schema optional nullable)
const createOrderSchema = z
  .object({
    customerId: z.coerce.number().int().positive("customerId harus dipilih"),
    serviceType: z.enum(["CC", "ST", "CS"]),
    weight: z.coerce.number().positive("weight harus >0").max(100, "weight maksimal 100kg"),
    isExpress: z.boolean().optional().default(false),
    isDelivery: z.boolean().optional().default(false),
    dirtLevelId: z.coerce.number().int().positive().optional().nullable(),
    clothingTypeId: z.coerce.number().int().positive().optional().nullable(),
    specialNotes: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.serviceType !== "ST") {
      if (!data.dirtLevelId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "dirtLevel wajib untuk CC/CS", path: ["dirtLevelId"] });
      }
      if (!data.clothingTypeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "clothingType wajib untuk CC/CS", path: ["clothingTypeId"] });
      }
    }
  });

function getSuffix(isExpress: boolean, isDelivery: boolean): string {
  if (isExpress && isDelivery) return "X";
  if (isExpress) return "E";
  if (isDelivery) return "D";
  return "R";
}
function formatDmY(date: Date): string {
  // Jakarta time damy? Use Asia/Jakarta
  const jakartaStr = date.toLocaleDateString("en-GB", { timeZone: "Asia/Jakarta" }); // dd/mm/yyyy
  const [dd, mm, yyyy] = jakartaStr.split("/");
  return `${dd}${mm}${yyyy}`;
}
function generateNoPesanan(base: string, suffix: string): string {
  const date = formatDmY(new Date());
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `WL-${base}${suffix}${date}${rand}`;
}
function computeEstimatedDate(entryDate: Date, serviceType: string, isExpress: boolean): Date {
  // Jakarta-based but we just add days
  const d = new Date(entryDate);
  let addDays: number;
  if (isExpress) addDays = 1;
  else if (serviceType === "CS") addDays = 3;
  else addDays = 2; // CC and ST =2
  d.setDate(d.getDate() + addDays);
  return d;
}

function calculateChemicals(
  serviceType: string,
  weight: number,
  dirtData: { tambahanDeterjen: number; pemutih: string; penghilangNoda: string } | null,
  clothingType: string | null
) {
  const chemicals = {
    detergen_bubuk: 0,
    detergen_cair: 0,
    pewangi: Number((weight * 0.06).toFixed(3)),
    emulsifier: 0,
    alkali: 0,
    chloro_bleach: 0,
    oxygen_bleach: 0,
    neutralizer: 0,
    softener: Number((weight * 0.04).toFixed(3)),
  };
  if (serviceType === "ST") return chemicals;
  if (!dirtData || !clothingType) return chemicals;

  const multiplier = 1 + Number(dirtData.tambahanDeterjen);
  if (clothingType === "bubuk") {
    chemicals.detergen_bubuk = Number((weight * 0.14 * multiplier).toFixed(3));
  } else {
    chemicals.detergen_cair = Number((weight * 0.06 * multiplier).toFixed(3));
  }
  if (dirtData.penghilangNoda === "ya") {
    if (clothingType === "bubuk") chemicals.alkali = Number((weight * 0.03).toFixed(3));
    else chemicals.emulsifier = Number((weight * 0.03).toFixed(3));
  }
  if (dirtData.pemutih === "ya") {
    if (clothingType === "bubuk") {
      chemicals.chloro_bleach = Number((weight * 0.02).toFixed(3));
      chemicals.neutralizer = Number((weight * 0.02).toFixed(3));
    } else {
      chemicals.oxygen_bleach = Number((weight * 0.02).toFixed(3));
    }
  }
  return chemicals;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Optional list for debugging — return last 20 orders
  const orders = await prisma.order.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { nama: true, noTelepon: true } } },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(); // cek operatorId dari JWT (getCurrentUser equivalent)
  if (!auth) {
    return NextResponse.json({ ok: false, success: false, message: "Unauthorized" }, { status: 401 });
  }
  // only admin and operator should create; owner also allowed for flexibility — align with middleware allow admin
  if (auth.role !== "admin" && auth.role !== "operator" && auth.role !== "owner") {
    return NextResponse.json({ ok: false, success: false, message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, success: false, message: "Body JSON tidak valid" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ ok: false, success: false, message: msg, issues: parsed.error.issues }, { status: 400 });
  }

  const { customerId, serviceType, weight, isExpress, isDelivery, dirtLevelId, clothingTypeId, specialNotes } = parsed.data;

  // Validate customer exists — cek customerId exists (int vs string handled via coerce)
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return NextResponse.json({ ok: false, success: false, message: `Customer dengan ID ${customerId} tidak ditemukan` }, { status: 404 });
  }

  // Validate dirt level & clothing type if needed
  let dirtData: { tambahanDeterjen: number; pemutih: string; penghilangNoda: string } | null = null;
  let clothingDeterjenType: string | null = null;

  if (serviceType !== "ST") {
    const [dirt, clothing] = await Promise.all([
      prisma.masterTingkatKotor.findUnique({ where: { id: dirtLevelId! } }),
      prisma.masterJenisPakaian.findUnique({ where: { id: clothingTypeId! } }),
    ]);
    if (!dirt) return NextResponse.json({ ok: false, success: false, message: "dirtLevel tidak ditemukan" }, { status: 404 });
    if (!clothing) return NextResponse.json({ ok: false, success: false, message: "clothingType tidak ditemukan" }, { status: 404 });
    dirtData = {
      tambahanDeterjen: Number(dirt.tambahanDeterjen),
      pemutih: dirt.pemutih as string,
      penghilangNoda: dirt.penghilangNoda as string,
    };
    clothingDeterjenType = clothing.deterjenType;
  }

  // Determine kode layanan lengkap and fetch masterHarga
  const suffix = getSuffix(!!isExpress, !!isDelivery);
  const kodeLayanan = `${serviceType}${suffix}`; // e.g. CCR, STE, CSX

  const masterHarga = await prisma.masterHarga.findFirst({ where: { layanan: kodeLayanan } });
  if (!masterHarga) {
    return NextResponse.json({ ok: false, success: false, message: `Harga layanan ${kodeLayanan} tidak ditemukan` }, { status: 404 });
  }

  // Hitung cost — hargaPerKg * weight + tambahan flat 500 per kebutuhan
  const hargaPerKg = Number(masterHarga.hargaPerKg);
  const biayaLayanan = hargaPerKg * weight;
  let biayaTambahan = 0;
  if (serviceType !== "ST" && dirtData) {
    if (dirtData.tambahanDeterjen > 0) biayaTambahan += 500;
    if (dirtData.pemutih === "ya") biayaTambahan += 500;
    if (dirtData.penghilangNoda === "ya") biayaTambahan += 500;
  }
  const totalBiaya = Math.round(biayaLayanan + biayaTambahan);

  // Dates in Jakarta
  const entryDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
  const entryDate = new Date(`${entryDateStr}T00:00:00.000Z`);
  const estimatedDate = computeEstimatedDate(entryDate, serviceType, !!isExpress);
  // Generate unique noPesanan
  let noPesanan: string | null = null;
  for (let i = 0; i < 5; i++) {
    const candidate = generateNoPesanan(serviceType, suffix);
    const exists = await prisma.order.findUnique({ where: { noPesanan: candidate } });
    if (!exists) {
      noPesanan = candidate;
      break;
    }
  }
  if (!noPesanan) {
    return NextResponse.json({ ok: false, success: false, message: "Gagal generate nomor pesanan, coba lagi" }, { status: 500 });
  }

  const chemicals = calculateChemicals(serviceType, weight, dirtData, clothingDeterjenType);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          noPesanan,
          serviceType,
          masterHargaId: masterHarga.id,
          dirtLevelId: serviceType === "ST" ? null : dirtLevelId!,
          clothingTypeId: serviceType === "ST" ? null : clothingTypeId!,
          weight,
          cost: totalBiaya,
          specialNotes: specialNotes || null,
          entryDate,
          estimatedDate,
          status: "pending",
          paymentStatus: "unpaid",
          operatorId: auth.userId,
          customerId,
          isExpress: !!isExpress,
          isDelivery: !!isDelivery,
        },
      });

      // logInventory — ganti trigger after_order_insert
      await tx.logInventory.create({
        data: {
          noPesanan,
          tanggalMasuk: entryDate,
          detergenBubuk: chemicals.detergen_bubuk,
          detergenCair: chemicals.detergen_cair,
          pewangi: chemicals.pewangi,
          emulsifier: chemicals.emulsifier,
          alkali: chemicals.alkali,
          chloroBleach: chemicals.chloro_bleach,
          oxygenBleach: chemicals.oxygen_bleach,
          neutralizer: chemicals.neutralizer,
          softener: chemicals.softener,
        },
      });

      await tx.logOrder.create({
        data: {
          noPesanan,
          operatorId: auth.userId,
          notes: `Order dibuat oleh ${auth.namaLengkap} (${auth.username}) | Layanan ${kodeLayanan} | Berat ${weight}kg | Cost Rp ${totalBiaya.toLocaleString("id-ID")}`,
        },
      });

      // Update customer lastOrderDate/totalOrders/totalSpent secara opsional
      await tx.customer.update({
        where: { id: customerId },
        data: {
          lastOrderDate: entryDate,
          totalOrders: { increment: 1 },
          totalSpent: { increment: totalBiaya },
        },
      });

      return order;
    });

    return NextResponse.json(
      {
        ok: true,
        success: true,
        noPesanan,
        message: "Order berhasil disimpan",
        data: {
          noPesanan,
          kodeLayanan,
          cost: totalBiaya,
          biayaLayanan: Math.round(biayaLayanan),
          biayaTambahan,
          chemicals,
          entryDate,
          estimatedDate,
          order: result,
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    console.error("[POST /api/orders] txn error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, success: false, message: "Gagal menyimpan order: " + msg }, { status: 500 });
  }
}
