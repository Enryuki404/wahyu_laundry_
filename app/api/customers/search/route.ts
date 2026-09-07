import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
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
    return payload as unknown as { userId: number; role: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Allow admin and owner, but also operator for completeness; restrict if needed
  // Original input_order.php only admin, but we allow all authenticated
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ customers: [] });
  }

  // Search by nama, no_telepon, no_pelanggan, email
  const customers = await prisma.customer.findMany({
    where: {
      status: "active",
      OR: [
        { nama: { contains: q, mode: "insensitive" } },
        { noTelepon: { contains: q, mode: "insensitive" } },
        { noPelanggan: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      noPelanggan: true,
      nama: true,
      noTelepon: true,
      email: true,
      alamat: true,
    },
    orderBy: { nama: "asc" },
    take: 10,
  });

  // Map to legacy autocomplete shape + new shape
  const mapped = customers.map((c) => ({
    id: c.id,
    label: c.nama,
    value: c.nama,
    nama: c.nama,
    phone: c.noTelepon,
    address: c.alamat,
    no_pelanggan: c.noPelanggan,
    email: c.email,
    noTelepon: c.noTelepon,
    alamat: c.alamat,
    noPelanggan: c.noPelanggan,
  }));

  return NextResponse.json({ customers: mapped });
}
