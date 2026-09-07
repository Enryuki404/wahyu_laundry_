import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helpers to convert MySQL values → Postgres/Prisma
function toDate(s: string | null): Date | null {
  if (!s || s === '0000-00-00' || s === '0000-00-00 00:00:00') return null;
  // handle date or datetime strings
  // ensure ISO format
  if (s.includes(' ') && !s.includes('T')) {
    return new Date(s.replace(' ', 'T'));
  }
  return new Date(s);
}
function toDateRequired(s: string | null, fallback = '1970-01-01'): Date {
  const d = toDate(s);
  if (d) return d;
  return new Date(fallback);
}
function toTimeDate(t: string | null): Date | null {
  if (!t) return null;
  // Prisma @db.Time expects Date with time component; we use 1970-01-01
  return new Date(`1970-01-01T${t}.000Z`);
}
function toTimeDateRequired(t: string): Date {
  return new Date(`1970-01-01T${t}.000Z`);
}

async function main() {
  console.log('🌱 Starting Wahyu Laundry seed (MariaDB → Postgres Neon)');

  // Delete in reverse FK order
  console.log('🧹 Cleaning existing data...');
  await prisma.notificationLog.deleteMany();
  await prisma.logQc.deleteMany();
  await prisma.logOrder.deleteMany();
  await prisma.logInventory.deleteMany();
  await prisma.cashFlow.deleteMany();
  await prisma.gajiBulanan.deleteMany();
  await prisma.absensi.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.masterHarga.deleteMany();
  await prisma.masterTingkatKotor.deleteMany();
  await prisma.masterJenisPakaian.deleteMany();

  // 1. master_jenis_pakaian
  console.log('→ seeding master_jenis_pakaian...');
  await prisma.masterJenisPakaian.createMany({
    data: [
      { id: 1, nama: 'Pakaian Biasa', deterjenType: 'cair', deskripsi: 'Pakaian sehari-hari seperti kaos, kemeja, celana', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 2, nama: 'Pakaian Halus', deterjenType: 'cair', deskripsi: 'Pakaian berbahan halus seperti sutra, satin', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 3, nama: 'Pakaian Tebal', deterjenType: 'bubuk', deskripsi: 'Pakaian tebal seperti jaket, sweater, jeans', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 4, nama: 'Pakaian Putih', deterjenType: 'bubuk', deskripsi: 'Khusus pakaian berwarna putih', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 5, nama: 'Selimut/Bedcover', deterjenType: 'bubuk', deskripsi: 'Selimut, bedcover, sprei tebal', createdAt: toDateRequired('2024-12-21 02:56:54') },
    ],
  });

  // 2. master_tingkat_kotor
  console.log('→ seeding master_tingkat_kotor...');
  await prisma.masterTingkatKotor.createMany({
    data: [
      { id: 1, level: 'Ringan', tambahanDeterjen: 0.0, keterangan: 'Kotoran ringan, tidak ada noda', pemutih: 'tidak', penghilangNoda: 'tidak', pelembut: 'ya', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 2, level: 'Normal', tambahanDeterjen: 0.2, keterangan: 'Kotoran normal sehari-hari', pemutih: 'tidak', penghilangNoda: 'tidak', pelembut: 'ya', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 3, level: 'Berat', tambahanDeterjen: 0.5, keterangan: 'Kotoran berat, ada noda', pemutih: 'ya', penghilangNoda: 'ya', pelembut: 'ya', createdAt: toDateRequired('2024-12-21 02:56:54') },
      { id: 4, level: 'Sangat Berat', tambahanDeterjen: 1.0, keterangan: 'Sangat kotor dan bernoda', pemutih: 'ya', penghilangNoda: 'ya', pelembut: 'ya', createdAt: toDateRequired('2024-12-21 02:56:54') },
    ],
  });

  // 3. master_harga
  console.log('→ seeding master_harga...');
  await prisma.masterHarga.createMany({
    data: [
      { id: 1, layanan: 'CCR', hargaPerKg: 7000.0, deterjenPersen: 1.5, pemutihPersen: 0.8, penghilangNodaPersen: 0.5, pelembutPersen: 0.7, pewangiPersen: 0.6, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 2, layanan: 'STR', hargaPerKg: 5000.0, deterjenPersen: 0.0, pemutihPersen: 0.0, penghilangNodaPersen: 0.0, pelembutPersen: 0.0, pewangiPersen: 0.8, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 3, layanan: 'CSR', hargaPerKg: 10000.0, deterjenPersen: 2.0, pemutihPersen: 1.0, penghilangNodaPersen: 0.7, pelembutPersen: 0.8, pewangiPersen: 0.8, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 4, layanan: 'CCD', hargaPerKg: 12000.0, deterjenPersen: 1.7, pemutihPersen: 1.0, penghilangNodaPersen: 0.7, pelembutPersen: 0.9, pewangiPersen: 0.8, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 5, layanan: 'STD', hargaPerKg: 7000.0, deterjenPersen: 1.7, pemutihPersen: 1.0, penghilangNodaPersen: 0.7, pelembutPersen: 0.9, pewangiPersen: 0.8, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 6, layanan: 'CSD', hargaPerKg: 12000.0, deterjenPersen: 1.7, pemutihPersen: 1.0, penghilangNodaPersen: 0.7, pelembutPersen: 0.9, pewangiPersen: 0.8, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 7, layanan: 'CCE', hargaPerKg: 10000.0, deterjenPersen: 2.0, pemutihPersen: 1.3, penghilangNodaPersen: 1.0, pelembutPersen: 1.2, pewangiPersen: 1.0, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 8, layanan: 'STE', hargaPerKg: 8000.0, deterjenPersen: 2.0, pemutihPersen: 1.3, penghilangNodaPersen: 1.0, pelembutPersen: 1.2, pewangiPersen: 1.0, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 9, layanan: 'CSE', hargaPerKg: 15000.0, deterjenPersen: 2.0, pemutihPersen: 1.3, penghilangNodaPersen: 1.0, pelembutPersen: 1.2, pewangiPersen: 1.0, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 10, layanan: 'CCX', hargaPerKg: 12000.0, deterjenPersen: 2.2, pemutihPersen: 1.5, penghilangNodaPersen: 1.2, pelembutPersen: 1.4, pewangiPersen: 1.2, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 11, layanan: 'STX', hargaPerKg: 10000.0, deterjenPersen: 2.2, pemutihPersen: 1.5, penghilangNodaPersen: 1.2, pelembutPersen: 1.4, pewangiPersen: 1.2, createdAt: toDateRequired('2024-12-21 02:41:24') },
      { id: 12, layanan: 'CSX', hargaPerKg: 17000.0, deterjenPersen: 2.2, pemutihPersen: 1.5, penghilangNodaPersen: 1.2, pelembutPersen: 1.4, pewangiPersen: 1.2, createdAt: toDateRequired('2024-12-21 02:41:24') },
    ],
  });

  // 4. users (15 rows). Password already bcrypt hash - keep as is. No re-hash.
  console.log('→ seeding users (15 rows)...');
  await prisma.user.createMany({
    data: [
      { id: 1, username: 'dwiki628', password: '$2y$10$6BTWBfxT92TUlI7Gf7QLUOsPvGWuAqOk95cyNUt1lYS5alRE6cxkC', namaLengkap: 'Dwiki Kurniawan', role: 'operator', status: 'Aktif', tanggalBergabung: toDateRequired('2024-12-06'), gajiPokok: 1500000.0, alamat: 'Palur RT 4 RW 3', noTelepon: '081412354411', lastLogin: null, createdAt: toDateRequired('2024-12-06 03:18:44'), updatedAt: null, nik: '3313111041999001', noPegawai: 'WL-O-9746', jenisKelamin: 'L' },
      { id: 2, username: 'nazma769', password: '$2y$10$fJmW0GwqNBLnD2CDPTTKnujjvOEZf1QjjCCxuzYaAsz06oS9QcaES', namaLengkap: 'Nazma Fauziah', role: 'operator', status: 'Aktif', tanggalBergabung: toDateRequired('2024-12-06'), gajiPokok: 1500000.0, alamat: 'Jepara', noTelepon: '081412354444', lastLogin: null, createdAt: toDateRequired('2024-12-06 03:16:38'), updatedAt: toDate('2025-01-30 03:11:26'), nik: '3313111041998004', noPegawai: 'WL-A-2185', jenisKelamin: 'P' },
      { id: 3, username: 'gerald582', password: '$2y$10$38WSIhV4E5hbrL9/OcC3NuooiSgHXBgChhEzPd6Z1NuUHAzr1E6lC', namaLengkap: 'Gerald Bona', role: 'admin', status: 'Aktif', tanggalBergabung: toDateRequired('2024-12-06'), gajiPokok: 1600000.0, alamat: 'Majenang', noTelepon: '081412354411', lastLogin: null, createdAt: toDateRequired('2024-12-06 04:03:10'), updatedAt: null, nik: '3313111041984003', noPegawai: 'WL-A-1688', jenisKelamin: 'L' },
      { id: 13, username: 'agus_wahyu', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Agus Wahyu Ustinov', role: 'owner', status: 'Aktif', tanggalBergabung: toDateRequired('2024-01-01'), gajiPokok: 10000000.0, alamat: 'Jl. Raya Bogor No. 123, Jakarta Timur', noTelepon: '081234567890', lastLogin: toDate('2025-02-02 06:20:43'), createdAt: toDateRequired('2024-12-04 07:54:35'), updatedAt: toDate('2025-02-02 06:20:43'), nik: null, noPegawai: null, jenisKelamin: null },
      { id: 21, username: 'ahmad123', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Ahmad Fauzi', role: 'operator', status: 'Aktif', tanggalBergabung: toDateRequired('2024-01-15'), gajiPokok: 1500000.0, alamat: 'Jl. Mawar No. 1', noTelepon: '081234567890', lastLogin: null, createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: null, nik: '3271046504890001', noPegawai: 'WL-O-1234', jenisKelamin: 'L' },
      { id: 23, username: 'citra789', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Citra Dewi', role: 'operator', status: 'Cuti', tanggalBergabung: toDateRequired('2024-02-01'), gajiPokok: 1500000.0, alamat: 'Jl. Anggrek No. 3', noTelepon: '081234567892', lastLogin: null, createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: null, nik: '3271046504890003', noPegawai: 'WL-O-1236', jenisKelamin: 'P' },
      { id: 25, username: 'eka567', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Eka Putri', role: 'operator', status: 'NonAktif', tanggalBergabung: toDateRequired('2024-02-10'), gajiPokok: 1500000.0, alamat: 'Jl. Kenanga No. 5', noTelepon: '081234567894', lastLogin: null, createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: null, nik: '3271046504890005', noPegawai: 'WL-O-1238', jenisKelamin: 'P' },
      { id: 26, username: 'fajar890', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Fajar Ramadhan', role: 'admin', status: 'Aktif', tanggalBergabung: toDateRequired('2024-02-15'), gajiPokok: 1600000.0, alamat: 'Jl. Tulip No. 7', noTelepon: '081234567895', lastLogin: toDate('2025-02-05 04:08:31'), createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: toDate('2025-02-05 04:08:31'), nik: '3271046504890006', noPegawai: 'WL-A-1239', jenisKelamin: 'L' },
      { id: 27, username: 'gita345', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Gita Safitri', role: 'operator', status: 'Aktif', tanggalBergabung: toDateRequired('2024-02-20'), gajiPokok: 1500000.0, alamat: 'Jl. Kamboja No. 7', noTelepon: '081234567896', lastLogin: toDate('2025-01-30 08:55:30'), createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: toDate('2025-01-30 08:55:30'), nik: '3271046504890007', noPegawai: 'WL-O-1240', jenisKelamin: 'P' },
      { id: 28, username: 'hadi678', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Hadi Prasetyo', role: 'admin', status: 'Aktif', tanggalBergabung: toDateRequired('2024-02-25'), gajiPokok: 1600000.0, alamat: 'Jl. Teratai No. 8', noTelepon: '081234567897', lastLogin: null, createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: toDate('2025-01-30 03:10:05'), nik: '3271046504890008', noPegawai: 'WL-A-1241', jenisKelamin: 'L' },
      { id: 30, username: 'joko432', password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', namaLengkap: 'Joko Widodo', role: 'admin', status: 'Aktif', tanggalBergabung: toDateRequired('2024-03-05'), gajiPokok: 1600000.0, alamat: 'Jl. Flamboyan No. 10', noTelepon: '081234567899', lastLogin: toDate('2024-12-17 01:27:28'), createdAt: toDateRequired('2024-12-06 04:06:03'), updatedAt: toDate('2025-01-30 03:10:05'), nik: '3271046504890010', noPegawai: 'WL-A-1243', jenisKelamin: 'L' },
      { id: 37, username: 'ahmad345', password: '$2y$10$TL3ZKBVxXELoy/k2HAzQauI.tUyVzTW1ASAUa.gocwtBm2QpRl8s6', namaLengkap: 'Ahmad Fauzan Al Kairi', role: 'operator', status: 'Aktif', tanggalBergabung: toDateRequired('2024-12-13'), gajiPokok: 1500000.0, alamat: 'Palur Kulon, Palur, Kec. Mojolaban, Kabupaten Sukoharjo, Jawa Tengah 57554', noTelepon: '085951310655', lastLogin: null, createdAt: toDateRequired('2024-12-13 01:34:09'), updatedAt: toDate('2025-01-30 05:58:18'), nik: '3313111041998054', noPegawai: 'WL-O-6515', jenisKelamin: 'L' },
      { id: 51, username: 'fransisca278', password: '$2y$10$bhwTFfEDYJN8Ry2lIY41JO7hqwdb2AcJK7jxwqroyUVPutmPtBpOO', namaLengkap: 'Fransisca Amelia Praditasari ', role: 'admin', status: 'Aktif', tanggalBergabung: toDateRequired('2025-01-30'), gajiPokok: 1500000.0, alamat: 'Jl. Sidobejo ', noTelepon: '085951314456', lastLogin: null, createdAt: toDateRequired('2025-01-30 05:04:13'), updatedAt: toDate('2025-01-30 05:29:30'), nik: '3313111041999197', noPegawai: 'WL-A-3165', jenisKelamin: 'P' },
      { id: 53, username: 'john586', password: '$2y$10$9yA7mO74rXcOMRO29BpCLu4AzhHIw5Ex06kimqKMK1C8caWgyl/1C', namaLengkap: 'John Musten', role: 'operator', status: 'Aktif', tanggalBergabung: toDateRequired('2025-01-30'), gajiPokok: 1600000.0, alamat: 'Jl. Sidobejo ', noTelepon: '085951318995', lastLogin: null, createdAt: toDateRequired('2025-01-30 05:07:41'), updatedAt: null, nik: '3313111041999999', noPegawai: 'WL-O-9878', jenisKelamin: 'L' },
      { id: 54, username: 'heri.setiawan3365', password: '$2y$10$x4yNuDC6Jj7tytQgC4vKOOsVdXPJ2PWhm2N0PeMJ2Us6nOXUvRGeu', namaLengkap: 'Heri Setiawan', role: 'admin', status: 'Aktif', tanggalBergabung: toDateRequired('2025-01-30'), gajiPokok: 1500000.0, alamat: 'Jebres', noTelepon: '085712544112', lastLogin: null, createdAt: toDateRequired('2025-01-30 08:52:36'), updatedAt: null, nik: '3313111041998456', noPegawai: 'WL-A-7463', jenisKelamin: 'L' },
    ],
  });

  // Handle missing FK user 24 stub for absensi (user_id 24 originally not in dump list but referenced)
  // Create stub user id 24 to satisfy FK
  const missingUser24 = await prisma.user.findUnique({ where: { id: 24 } });
  if (!missingUser24) {
    console.log('→ creating stub user 24 for absensi FK...');
    await prisma.user.create({
      data: {
        id: 24,
        username: 'stub_user_24',
        password: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        namaLengkap: 'Stub User 24 (orphan absensi)',
        role: 'operator',
        status: 'Aktif',
        tanggalBergabung: toDateRequired('2024-12-01'),
        gajiPokok: 1500000.0,
        alamat: 'Stub address',
        noTelepon: '081234567800',
        nik: '3271046504890024',
        noPegawai: 'WL-S-024',
        jenisKelamin: 'L',
        createdAt: toDateRequired('2024-12-01 00:00:00'),
      },
    });
  }

  // 5. customers (9 rows)
  console.log('→ seeding customers (9 rows)...');
  await prisma.customer.createMany({
    data: [
      { id: 48, noPelanggan: 'WL-M84751', nama: 'Agus Wahyu Ustinov', noTelepon: '085951310666', email: 'awkwark.moment@gmail.com', alamat: 'Palur RT 1 RW 3 Ngringo Jaten Karanganyar ', memberSince: toDateRequired('2024-12-17'), points: 46, createdAt: toDateRequired('2024-12-17 05:47:07'), updatedAt: toDate('2024-12-20 15:09:35'), lastOrderDate: toDate('2024-12-17'), totalOrders: 4, totalSpent: 490000.0, status: 'active' },
      { id: 49, noPelanggan: 'WL-M32426', nama: 'Nazma Fauziah', noTelepon: '085951310665', email: 'nazma.fauziah@gmail.com', alamat: 'Bugel, Kec. Kedung, Kabupaten Jepara, Jawa Tengah 59463', memberSince: toDateRequired('2024-12-17'), points: 0, createdAt: toDateRequired('2024-12-17 06:37:48'), updatedAt: toDate('2024-12-17 06:40:50'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 50, noPelanggan: 'WL-M68265', nama: 'Dwiki Kurniawan', noTelepon: '085951310663', email: 'hokgbpp@gmail.com', alamat: 'Palur, RT 02 RW 03 Ngringo Jaten', memberSince: toDateRequired('2024-12-17'), points: 0, createdAt: toDateRequired('2024-12-17 06:42:27'), updatedAt: toDate('2024-12-17 06:53:07'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 51, noPelanggan: 'WL-M91070', nama: 'Fransisca Amelia Praditasari', noTelepon: '089617889558', email: 'fransiscamelia@mail.com', alamat: 'Kampungsewu RT 05 RW 03  Kec. Jebres, Kota Surakarta, Jawa Tengah 57129', memberSince: toDateRequired('2024-12-18'), points: 0, createdAt: toDateRequired('2024-12-18 14:22:05'), updatedAt: toDate('2024-12-20 15:03:10'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 52, noPelanggan: 'WL-M81710', nama: 'Ike Nova', noTelepon: '085951310677', email: 'ike.nova@gmail.com', alamat: 'MENDUNGSARI, RT.001/RW.003, Mendungsari, Bulurejo, Kec. Gondangrejo, Kabupaten Karanganyar, Jawa Tengah 57772', memberSince: toDateRequired('2025-01-03'), points: 0, createdAt: toDateRequired('2025-01-03 06:45:22'), updatedAt: toDate('2025-01-13 05:16:22'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 54, noPelanggan: 'WL-M10810', nama: 'Pandhega Widhi', noTelepon: '085714411255', email: 'dega.widhi@gmail.com', alamat: 'Perumahan Crisan', memberSince: toDateRequired('2025-01-14'), points: 0, createdAt: toDateRequired('2025-01-14 02:54:44'), updatedAt: toDate('2025-01-14 02:54:44'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 55, noPelanggan: 'WL-M89575', nama: 'Gerlad Bona', noTelepon: '081314477888', email: 'g.bona@gmail.com', alamat: 'Cilacap Adoh kono', memberSince: toDateRequired('2025-01-14'), points: 0, createdAt: toDateRequired('2025-01-14 03:03:51'), updatedAt: toDate('2025-01-14 03:03:51'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 56, noPelanggan: 'WL-M61778', nama: 'Afif Muslim', noTelepon: '085794411154', email: 'a.mus@gmail.com', alamat: 'Kraton', memberSince: toDateRequired('2025-01-14'), points: 0, createdAt: toDateRequired('2025-01-14 03:09:31'), updatedAt: toDate('2025-01-14 03:09:31'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
      { id: 57, noPelanggan: 'WL-M72437', nama: 'Safira de Aldira', noTelepon: '085794112255', email: 's.fira@gmail.com', alamat: 'Dworowati', memberSince: toDateRequired('2025-01-14'), points: 0, createdAt: toDateRequired('2025-01-14 03:10:30'), updatedAt: toDate('2025-01-14 03:10:30'), lastOrderDate: null, totalOrders: 0, totalSpent: 0.0, status: 'active' },
    ],
  });

  // 6. inventory (11 rows) - handle '0000-00-00' → NULL/fallback
  console.log('→ seeding inventory (11 rows, converting 0000-00-00 → fallback date)...');
  await prisma.inventory.createMany({
    data: [
      { id: 1, merk: 'Rinso', kategori: 'DetergenBubuk', jumlahStock: 25.99, satuan: 'kg', batasMinimum: 10.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-21'), tanggalPenggunaanTerakhir: toDate('2025-01-30'), status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2025-01-30 08:54:18') },
      { id: 2, merk: 'So Klin Liquid', kategori: 'DetergenCair', jumlahStock: 50.88, satuan: 'liter', batasMinimum: 20.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-20'), tanggalPenggunaanTerakhir: toDate('2025-01-03'), status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2025-01-03 03:54:26') },
      { id: 3, merk: 'Downy', kategori: 'Pewangi', jumlahStock: 94.55, satuan: 'sachet', batasMinimum: 30.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-20'), tanggalPenggunaanTerakhir: toDate('2025-01-30'), status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2025-01-30 08:54:18') },
      { id: 4, merk: 'Emulsifier Pro', kategori: 'Emulsifier', jumlahStock: 7.0, satuan: 'liter', batasMinimum: 2.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-21'), tanggalPenggunaanTerakhir: null, status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2024-12-20 17:32:40') },
      { id: 5, merk: 'Alkali Plus', kategori: 'Alkali', jumlahStock: 12.0, satuan: 'liter', batasMinimum: 3.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-21'), tanggalPenggunaanTerakhir: null, status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2024-12-21 00:47:47') },
      { id: 6, merk: 'Bayclin', kategori: 'ChloroBleach', jumlahStock: 11.0, satuan: 'liter', batasMinimum: 4.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-21'), tanggalPenggunaanTerakhir: null, status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2024-12-20 17:38:17') },
      { id: 7, merk: 'Vanish', kategori: 'OxygenBleach', jumlahStock: 16.0, satuan: 'liter', batasMinimum: 5.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-21'), tanggalPenggunaanTerakhir: null, status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2024-12-20 17:40:35') },
      { id: 8, merk: 'Neutral Pro', kategori: 'Neutralizer', jumlahStock: 32.0, satuan: 'liter', batasMinimum: 4.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: toDate('2024-12-21'), tanggalPenggunaanTerakhir: null, status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2024-12-20 17:40:46') },
      { id: 9, merk: 'Downy Premium', kategori: 'Softener', jumlahStock: 69.7, satuan: 'liter', batasMinimum: 25.0, tanggalAdd: toDateRequired('2024-12-20'), tanggalRestock: null, tanggalPenggunaanTerakhir: toDate('2025-01-30'), status: 'Tersedia', createdAt: toDateRequired('2024-12-20 16:02:37'), updatedAt: toDateRequired('2025-01-30 08:54:18') },
      // 0000-00-00 converted: originally '0000-00-00' → use created_at date as fallback (2024-12-21 for id11, 2025-01-03 for id12) per task spec convert to NULL, but Postgres requires date so we fallback
      { id: 11, merk: 'Daia', kategori: 'DetergenBubuk', jumlahStock: 0.97, satuan: 'kg', batasMinimum: 0.5, tanggalAdd: toDateRequired('2024-12-21', '2024-12-21'), tanggalRestock: toDate('2025-01-06'), tanggalPenggunaanTerakhir: toDate('2025-01-30'), status: 'Tersedia', createdAt: toDateRequired('2024-12-21 01:27:05'), updatedAt: toDateRequired('2025-01-30 08:54:18') },
      { id: 12, merk: 'Rinso Pewangi', kategori: 'Pewangi', jumlahStock: 26.32, satuan: 'sachet', batasMinimum: 1.0, tanggalAdd: toDateRequired('2025-01-03', '2025-01-03'), tanggalRestock: toDate('2025-01-21'), tanggalPenggunaanTerakhir: toDate('2025-01-30'), status: 'Tersedia', createdAt: toDateRequired('2025-01-03 02:45:20'), updatedAt: toDateRequired('2025-01-30 08:54:18') },
    ],
  });

  // 7. orders (21 rows) - must respect FK: customer, operator, dirt_level, clothing_type
  console.log('→ seeding orders (21 rows)...');
  await prisma.order.createMany({
    data: [
      { id: 82, noPesanan: 'WL-CSX250119507', serviceType: 'CS', dirtLevelId: 4, clothingTypeId: 3, weight: 5.0, cost: 86500.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 12:41:26'), updatedAt: toDate('2025-01-19 13:11:47'), discountApplied: 0.0, pointsUsed: 0, customerId: 56, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 20:11:47') },
      { id: 83, noPesanan: 'WL-STX250119164', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 8.0, cost: 80000.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 13:01:01'), updatedAt: toDate('2025-01-19 14:15:12'), discountApplied: 0.0, pointsUsed: 0, customerId: 48, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 21:15:12') },
      { id: 84, noPesanan: 'WL-CCE250119693', serviceType: 'CC', dirtLevelId: 1, clothingTypeId: 1, weight: 5.0, cost: 50000.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 13:20:00'), updatedAt: toDate('2025-01-19 14:00:31'), discountApplied: 0.0, pointsUsed: 0, customerId: 54, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 21:00:31') },
      { id: 85, noPesanan: 'WL-CCE250119509', serviceType: 'CC', dirtLevelId: 4, clothingTypeId: 3, weight: 1.0, cost: 11500.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 14:15:33'), updatedAt: toDate('2025-01-19 14:22:57'), discountApplied: 0.0, pointsUsed: 0, customerId: 50, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 21:22:57') },
      { id: 86, noPesanan: 'WL-STE250119080', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 5.0, cost: 40000.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 14:19:13'), updatedAt: toDate('2025-01-19 14:22:53'), discountApplied: 0.0, pointsUsed: 0, customerId: 52, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 21:22:53') },
      { id: 87, noPesanan: 'WL-STD250119146', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 5.0, cost: 35000.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-21'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 14:38:29'), updatedAt: toDate('2025-01-19 14:40:08'), discountApplied: 0.0, pointsUsed: 0, customerId: 55, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 21:40:08') },
      { id: 88, noPesanan: 'WL-CCX250119665', serviceType: 'CC', dirtLevelId: 1, clothingTypeId: 2, weight: 5.0, cost: 60000.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'completed', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-19 16:16:43'), updatedAt: toDate('2025-01-19 16:17:11'), discountApplied: 0.0, pointsUsed: 0, customerId: 51, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 23:17:11') },
      { id: 89, noPesanan: 'WL-STX250121405', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 5.0, cost: 50000.0, specialNotes: null, entryDate: toDateRequired('2025-01-20'), estimatedDate: toDateRequired('2025-01-21'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-20 17:29:09'), updatedAt: toDate('2025-01-20 17:35:49'), discountApplied: 0.0, pointsUsed: 0, customerId: 49, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-21 00:35:49') },
      { id: 90, noPesanan: 'WL-CSX250121301', serviceType: 'CS', dirtLevelId: 1, clothingTypeId: 4, weight: 8.0, cost: 136000.0, specialNotes: null, entryDate: toDateRequired('2025-01-20'), estimatedDate: toDateRequired('2025-01-21'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-20 17:36:43'), updatedAt: toDate('2025-01-20 17:37:50'), discountApplied: 0.0, pointsUsed: 0, customerId: 57, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-21 00:37:50') },
      { id: 91, noPesanan: 'WL-CSX250119508', serviceType: 'CS', dirtLevelId: 4, clothingTypeId: 3, weight: 5.0, cost: 86500.0, specialNotes: null, entryDate: toDateRequired('2025-01-19'), estimatedDate: toDateRequired('2025-01-20'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-19 12:41:26'), updatedAt: toDate('2025-01-19 13:11:47'), discountApplied: 0.0, pointsUsed: 0, customerId: 56, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-19 20:11:47') },
      { id: 92, noPesanan: 'WL-STX250121651', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 8.0, cost: 80000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-22'), status: 'pickup', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:34:11'), updatedAt: toDate('2025-01-30 08:55:08'), discountApplied: 0.0, pointsUsed: 0, customerId: 56, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-30 15:54:43') },
      { id: 93, noPesanan: 'WL-CCX250121902', serviceType: 'CC', dirtLevelId: 1, clothingTypeId: 2, weight: 9.0, cost: 108000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-22'), status: 'finishing', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:34:28'), updatedAt: toDate('2025-01-21 02:43:58'), discountApplied: 0.0, pointsUsed: 0, customerId: 48, isExpress: false, isDelivery: false, completedDate: null },
      { id: 94, noPesanan: 'WL-CCD250121836', serviceType: 'CC', dirtLevelId: 3, clothingTypeId: 3, weight: 5.0, cost: 46500.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-23'), status: 'processing', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:34:48'), updatedAt: toDate('2025-01-21 06:19:46'), discountApplied: 0.0, pointsUsed: 0, customerId: 50, isExpress: false, isDelivery: false, completedDate: null },
      { id: 95, noPesanan: 'WL-STE250121893', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 8.0, cost: 64000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-22'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:35:03'), updatedAt: toDate('2025-01-22 06:46:35'), discountApplied: 0.0, pointsUsed: 0, customerId: 51, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-22 13:46:35') },
      { id: 96, noPesanan: 'WL-CSD250121593', serviceType: 'CS', dirtLevelId: 1, clothingTypeId: 3, weight: 54.0, cost: 648000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-24'), status: 'processing', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:35:45'), updatedAt: toDate('2025-01-21 02:37:25'), discountApplied: 0.0, pointsUsed: 0, customerId: 55, isExpress: false, isDelivery: false, completedDate: null },
      { id: 97, noPesanan: 'WL-CSX250121327', serviceType: 'CS', dirtLevelId: 4, clothingTypeId: 2, weight: 4.0, cost: 69500.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-22'), status: 'completed', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:36:05'), updatedAt: toDate('2025-01-21 06:20:02'), discountApplied: 0.0, pointsUsed: 0, customerId: 52, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-21 13:20:02') },
      { id: 98, noPesanan: 'WL-CSD250121231', serviceType: 'CS', dirtLevelId: 1, clothingTypeId: 2, weight: 4.0, cost: 48000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-24'), status: 'finishing', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:36:28'), updatedAt: toDate('2025-01-21 02:37:53'), discountApplied: 0.0, pointsUsed: 0, customerId: 54, isExpress: false, isDelivery: false, completedDate: null },
      { id: 99, noPesanan: 'WL-CCX250121181', serviceType: 'CC', dirtLevelId: 1, clothingTypeId: 2, weight: 8.0, cost: 96000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-22'), status: 'processing', paymentStatus: 'unpaid', operatorId: 27, createdAt: toDateRequired('2025-01-21 02:36:49'), updatedAt: toDate('2025-01-21 02:37:18'), discountApplied: 0.0, pointsUsed: 0, customerId: 57, isExpress: false, isDelivery: false, completedDate: null },
      { id: 100, noPesanan: 'WL-CSX250121663', serviceType: 'CS', dirtLevelId: 1, clothingTypeId: 3, weight: 5.0, cost: 85000.0, specialNotes: null, entryDate: toDateRequired('2025-01-21'), estimatedDate: toDateRequired('2025-01-22'), status: 'pending', paymentStatus: 'unpaid', operatorId: 26, createdAt: toDateRequired('2025-01-21 06:19:22'), updatedAt: null, discountApplied: 0.0, pointsUsed: 0, customerId: 57, isExpress: false, isDelivery: false, completedDate: null },
      { id: 101, noPesanan: 'WL-STD250122017', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 8.0, cost: 56000.0, specialNotes: null, entryDate: toDateRequired('2025-01-22'), estimatedDate: toDateRequired('2025-01-24'), status: 'pending', paymentStatus: 'unpaid', operatorId: 26, createdAt: toDateRequired('2025-01-22 06:46:01'), updatedAt: null, discountApplied: 0.0, pointsUsed: 0, customerId: 55, isExpress: false, isDelivery: false, completedDate: null },
      { id: 102, noPesanan: 'WL-STX250130585', serviceType: 'ST', dirtLevelId: null, clothingTypeId: null, weight: 8.0, cost: 80000.0, specialNotes: null, entryDate: toDateRequired('2025-01-30'), estimatedDate: toDateRequired('2025-01-31'), status: 'done', paymentStatus: 'paid', operatorId: 27, createdAt: toDateRequired('2025-01-30 08:54:18'), updatedAt: toDate('2025-01-30 08:56:18'), discountApplied: 0.0, pointsUsed: 0, customerId: 49, isExpress: false, isDelivery: false, completedDate: toDate('2025-01-30 15:56:18') },
    ],
  });

  // 8. absensi (39 rows) - time handling: jamMasuk/jamKeluar as Time
  console.log('→ seeding absensi (39 rows)...');
  await prisma.absensi.createMany({
    data: [
      { id: 8, userId: 30, tanggal: toDateRequired('2024-12-06'), jamMasuk: toTimeDateRequired('13:35:32'), jamKeluar: toTimeDate('13:35:36'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2024-12-06 06:35:32') },
      { id: 9, userId: 30, tanggal: toDateRequired('2024-12-08'), jamMasuk: toTimeDateRequired('08:40:01'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2024-12-08 01:40:01') },
      { id: 10, userId: 30, tanggal: toDateRequired('2024-12-13'), jamMasuk: toTimeDateRequired('09:46:58'), jamKeluar: toTimeDate('09:49:05'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2024-12-13 02:46:58') },
      { id: 11, userId: 24, tanggal: toDateRequired('2024-12-13'), jamMasuk: toTimeDateRequired('09:54:00'), jamKeluar: toTimeDate('10:13:46'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2024-12-13 02:54:00') },
      { id: 12, userId: 26, tanggal: toDateRequired('2024-12-15'), jamMasuk: toTimeDateRequired('12:19:28'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2024-12-15 05:19:28') },
      { id: 13, userId: 26, tanggal: toDateRequired('2024-12-16'), jamMasuk: toTimeDateRequired('09:02:32'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2024-12-16 02:02:32') },
      { id: 15, userId: 26, tanggal: toDateRequired('2024-12-18'), jamMasuk: toTimeDateRequired('21:08:07'), jamKeluar: toTimeDate('21:09:54'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2024-12-18 14:08:07') },
      { id: 16, userId: 26, tanggal: toDateRequired('2024-12-20'), jamMasuk: toTimeDateRequired('20:28:32'), jamKeluar: toTimeDate('22:50:17'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2024-12-20 13:28:32') },
      { id: 17, userId: 26, tanggal: toDateRequired('2024-12-21'), jamMasuk: toTimeDateRequired('07:27:52'), jamKeluar: null, statusKehadiran: 'TepatWaktu', keterangan: null, createdAt: toDateRequired('2024-12-21 00:27:52') },
      { id: 18, userId: 26, tanggal: toDateRequired('2025-01-01'), jamMasuk: toTimeDateRequired('21:13:54'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-01 14:13:54') },
      { id: 19, userId: 26, tanggal: toDateRequired('2025-01-02'), jamMasuk: toTimeDateRequired('14:20:34'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-02 07:20:34') },
      { id: 20, userId: 26, tanggal: toDateRequired('2025-01-03'), jamMasuk: toTimeDateRequired('09:40:28'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-03 02:40:28') },
      { id: 21, userId: 26, tanggal: toDateRequired('2025-01-04'), jamMasuk: toTimeDateRequired('10:32:57'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-04 03:32:57') },
      { id: 22, userId: 26, tanggal: toDateRequired('2025-01-06'), jamMasuk: toTimeDateRequired('13:21:35'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-06 06:21:35') },
      { id: 23, userId: 26, tanggal: toDateRequired('2025-01-07'), jamMasuk: toTimeDateRequired('09:15:29'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-07 02:15:29') },
      { id: 24, userId: 27, tanggal: toDateRequired('2025-01-10'), jamMasuk: toTimeDateRequired('13:09:35'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-10 06:09:35') },
      { id: 25, userId: 26, tanggal: toDateRequired('2025-01-10'), jamMasuk: toTimeDateRequired('13:35:15'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-10 06:35:15') },
      { id: 26, userId: 26, tanggal: toDateRequired('2025-01-13'), jamMasuk: toTimeDateRequired('11:28:06'), jamKeluar: toTimeDate('15:41:49'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-13 04:28:06') },
      { id: 27, userId: 26, tanggal: toDateRequired('2025-01-14'), jamMasuk: toTimeDateRequired('10:59:28'), jamKeluar: toTimeDate('11:01:05'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-14 03:59:28') },
      { id: 28, userId: 27, tanggal: toDateRequired('2025-01-14'), jamMasuk: toTimeDateRequired('11:02:16'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-14 04:02:16') },
      { id: 29, userId: 27, tanggal: toDateRequired('2025-01-15'), jamMasuk: toTimeDateRequired('15:52:56'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-15 08:52:56') },
      { id: 30, userId: 27, tanggal: toDateRequired('2025-01-16'), jamMasuk: toTimeDateRequired('12:33:54'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-16 05:33:54') },
      { id: 31, userId: 27, tanggal: toDateRequired('2025-01-17'), jamMasuk: toTimeDateRequired('20:03:32'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-17 13:03:32') },
      { id: 32, userId: 26, tanggal: toDateRequired('2025-01-19'), jamMasuk: toTimeDateRequired('17:29:37'), jamKeluar: toTimeDate('18:30:09'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-19 10:29:37') },
      { id: 33, userId: 27, tanggal: toDateRequired('2025-01-19'), jamMasuk: toTimeDateRequired('18:30:14'), jamKeluar: toTimeDate('23:22:26'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-19 11:30:14') },
      { id: 34, userId: 26, tanggal: toDateRequired('2025-01-21'), jamMasuk: toTimeDateRequired('00:28:54'), jamKeluar: toTimeDate('00:31:30'), statusKehadiran: 'TepatWaktu', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-20 17:28:54') },
      { id: 35, userId: 27, tanggal: toDateRequired('2025-01-21'), jamMasuk: toTimeDateRequired('00:31:36'), jamKeluar: toTimeDate('00:35:32'), statusKehadiran: 'TepatWaktu', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-20 17:31:36') },
      { id: 36, userId: 26, tanggal: toDateRequired('2025-01-23'), jamMasuk: toTimeDateRequired('00:41:56'), jamKeluar: toTimeDate('15:13:13'), statusKehadiran: 'TepatWaktu', keterangan: 'Lembur', createdAt: toDateRequired('2025-01-22 17:41:56') },
      { id: 37, userId: 27, tanggal: toDateRequired('2025-01-23'), jamMasuk: toTimeDateRequired('15:13:16'), jamKeluar: toTimeDate('21:43:02'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-23 08:13:16') },
      { id: 38, userId: 26, tanggal: toDateRequired('2025-01-24'), jamMasuk: toTimeDateRequired('09:56:41'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-01-24 02:56:41') },
      { id: 39, userId: 27, tanggal: toDateRequired('2025-01-25'), jamMasuk: toTimeDateRequired('12:09:15'), jamKeluar: toTimeDate('13:26:11'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-25 05:09:15') },
      { id: 40, userId: 26, tanggal: toDateRequired('2025-01-27'), jamMasuk: toTimeDateRequired('00:04:41'), jamKeluar: toTimeDate('00:11:08'), statusKehadiran: 'TepatWaktu', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-26 17:04:41') },
      { id: 41, userId: 27, tanggal: toDateRequired('2025-01-27'), jamMasuk: toTimeDateRequired('00:15:44'), jamKeluar: toTimeDate('00:15:58'), statusKehadiran: 'TepatWaktu', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-26 17:15:44') },
      { id: 42, userId: 26, tanggal: toDateRequired('2025-01-29'), jamMasuk: toTimeDateRequired('20:17:00'), jamKeluar: toTimeDate('20:26:06'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-29 13:17:00') },
      { id: 43, userId: 26, tanggal: toDateRequired('2025-01-30'), jamMasuk: toTimeDateRequired('10:03:08'), jamKeluar: toTimeDate('13:28:43'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-30 03:03:08') },
      { id: 44, userId: 27, tanggal: toDateRequired('2025-01-30'), jamMasuk: toTimeDateRequired('15:54:25'), jamKeluar: toTimeDate('15:54:57'), statusKehadiran: 'Terlambat', keterangan: 'Pulang Awal', createdAt: toDateRequired('2025-01-30 08:54:25') },
      { id: 45, userId: 26, tanggal: toDateRequired('2025-02-02'), jamMasuk: toTimeDateRequired('01:01:46'), jamKeluar: toTimeDate('13:20:40'), statusKehadiran: 'TepatWaktu', keterangan: 'Lembur', createdAt: toDateRequired('2025-02-01 18:01:47') },
      { id: 46, userId: 26, tanggal: toDateRequired('2025-02-05'), jamMasuk: toTimeDateRequired('11:08:31'), jamKeluar: null, statusKehadiran: 'Terlambat', keterangan: null, createdAt: toDateRequired('2025-02-05 04:08:31') },
    ],
  });

  // 9. gaji_bulanan (2 rows)
  console.log('→ seeding gaji_bulanan (2 rows)...');
  await prisma.gajiBulanan.createMany({
    data: [
      { id: 8, userId: 27, bulan: 1, tahun: 2025, jumlahHadir: 5, jumlahTerlambat: 8, jumlahLembur: 0, gajiPokok: 1500000.0, uangMakan: 50000.0, transport: 50000.0, bonus: 0.0, potongan: -60000.0, totalGaji: 1660000.0, statusPembayaran: 'SudahDibayar', approvedBy: 'Agus Wahyu Ustinov', tanggalApprove: toDateRequired('2025-01-30'), tanggalPembayaran: toDate('2025-01-30 13:28:54'), createdAt: toDateRequired('2025-01-30 05:47:24') },
      { id: 9, userId: 26, bulan: 1, tahun: 2025, jumlahHadir: 7, jumlahTerlambat: 13, jumlahLembur: 1, gajiPokok: 1600000.0, uangMakan: 70000.0, transport: 70000.0, bonus: 10000.0, potongan: -75000.0, totalGaji: 1825000.0, statusPembayaran: 'SudahDibayar', approvedBy: 'Agus Wahyu Ustinov', tanggalApprove: toDateRequired('2025-01-30'), tanggalPembayaran: toDate('2025-01-30 13:07:07'), createdAt: toDateRequired('2025-01-30 05:54:02') },
    ],
  });

  // 10. log_inventory (21 rows)
  console.log('→ seeding log_inventory (21 rows)...');
  await prisma.logInventory.createMany({
    data: [
      { id: 96, noPesanan: 'WL-CSX250119507', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-19 12:41:26') },
      { id: 97, noPesanan: 'WL-STX250119164', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-19 13:01:01') },
      { id: 98, noPesanan: 'WL-CCE250119693', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-19 13:20:00') },
      { id: 99, noPesanan: 'WL-CCE250119509', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.030, detergenCair: null, pewangi: 0.030, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.020, createdAt: toDateRequired('2025-01-19 14:15:33') },
      { id: 100, noPesanan: 'WL-STE250119080', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-19 14:19:13') },
      { id: 101, noPesanan: 'WL-STD250119146', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-19 14:38:29') },
      { id: 102, noPesanan: 'WL-CCX250119665', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-19 16:16:43') },
      { id: 103, noPesanan: 'WL-STX250121405', tanggalMasuk: toDate('2025-01-20'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-20 17:29:09') },
      { id: 104, noPesanan: 'WL-CSX250121301', tanggalMasuk: toDate('2025-01-20'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-20 17:36:43') },
      { id: 105, noPesanan: 'WL-CSX250119508', tanggalMasuk: toDate('2025-01-19'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-20 17:59:31') },
      { id: 106, noPesanan: 'WL-STX250121651', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-21 02:34:11') },
      { id: 107, noPesanan: 'WL-CCX250121902', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.270, detergenCair: null, pewangi: 0.270, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.180, createdAt: toDateRequired('2025-01-21 02:34:28') },
      { id: 108, noPesanan: 'WL-CCD250121836', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-21 02:34:48') },
      { id: 109, noPesanan: 'WL-STE250121893', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-21 02:35:03') },
      { id: 110, noPesanan: 'WL-CSD250121593', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 1.620, detergenCair: null, pewangi: 1.620, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 1.080, createdAt: toDateRequired('2025-01-21 02:35:45') },
      { id: 111, noPesanan: 'WL-CSX250121327', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.120, detergenCair: null, pewangi: 0.120, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.080, createdAt: toDateRequired('2025-01-21 02:36:05') },
      { id: 112, noPesanan: 'WL-CSD250121231', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.120, detergenCair: null, pewangi: 0.120, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.080, createdAt: toDateRequired('2025-01-21 02:36:28') },
      { id: 113, noPesanan: 'WL-CCX250121181', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-21 02:36:49') },
      { id: 114, noPesanan: 'WL-CSX250121663', tanggalMasuk: toDate('2025-01-21'), detergenBubuk: 0.150, detergenCair: null, pewangi: 0.150, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.100, createdAt: toDateRequired('2025-01-21 06:19:22') },
      { id: 115, noPesanan: 'WL-STD250122017', tanggalMasuk: toDate('2025-01-22'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-22 06:46:01') },
      { id: 116, noPesanan: 'WL-STX250130585', tanggalMasuk: toDate('2025-01-30'), detergenBubuk: 0.240, detergenCair: null, pewangi: 0.240, emulsifier: null, alkali: null, chloroBleach: null, oxygenBleach: null, neutralizer: null, softener: 0.160, createdAt: toDateRequired('2025-01-30 08:54:18') },
    ],
  });

  // 11. log_order (17 rows)
  console.log('→ seeding log_order (17 rows)...');
  await prisma.logOrder.createMany({
    data: [
      { id: 11, noPesanan: 'WL-CSX250119507', operatorId: 27, washDate: toDate('2025-01-19 19:58:14'), finishingDate: toDate('2025-01-19 19:58:18'), qcDate: toDate('2025-01-19 19:59:26'), notes: 'Proses wash selesai pada: 2025-01-19 13:58:14\nProses finishing selesai pada: 2025-01-19 19:58:18\nProses qc selesai pada: 2025-01-19 19:58:21\nProses qc selesai pada: 2025-01-19 19:59:26\nPacking selesai pada: 2025-01-19 20:11:14' },
      { id: 12, noPesanan: 'WL-STX250119164', operatorId: 27, washDate: toDate('2025-01-19 20:12:16'), finishingDate: toDate('2025-01-19 20:12:21'), qcDate: toDate('2025-01-19 20:14:00'), notes: 'Mulai proses cuci pada: 2025-01-19 14:12:16\nProses finishing selesai pada: 2025-01-19 20:12:21\nProses qc selesai pada: 2025-01-19 20:14:00\nPacking selesai pada: 2025-01-19 20:14:14' },
      { id: 15, noPesanan: 'WL-CCE250119693', operatorId: 27, washDate: toDate('2025-01-19 20:30:08'), finishingDate: null, qcDate: toDate('2025-01-19 20:30:11'), notes: 'Proses wash selesai pada: 2025-01-19 14:30:08\nProses qc selesai pada: 2025-01-19 20:30:11' },
      { id: 16, noPesanan: 'WL-CCE250119509', operatorId: 27, washDate: toDate('2025-01-19 21:15:52'), finishingDate: null, qcDate: toDate('2025-01-19 21:15:57'), notes: 'Proses wash selesai pada: 2025-01-19 15:15:52\nProses qc selesai pada: 2025-01-19 21:15:57' },
      { id: 17, noPesanan: 'WL-STE250119080', operatorId: 27, washDate: null, finishingDate: toDate('2025-01-19 21:21:32'), qcDate: toDate('2025-01-19 21:22:16'), notes: 'Proses finishing selesai pada: 2025-01-19 15:21:32\nProses qc selesai pada: 2025-01-19 21:22:16' },
      { id: 18, noPesanan: 'WL-STD250119146', operatorId: 27, washDate: null, finishingDate: toDate('2025-01-19 21:38:45'), qcDate: toDate('2025-01-19 21:38:49'), notes: 'Proses finishing selesai pada: 2025-01-19 15:38:45\nProses qc selesai pada: 2025-01-19 21:38:49' },
      { id: 19, noPesanan: 'WL-CCX250119665', operatorId: 27, washDate: toDate('2025-01-19 23:17:01'), finishingDate: null, qcDate: toDate('2025-01-19 23:17:05'), notes: 'Proses wash selesai pada: 2025-01-19 17:17:01\nProses qc selesai pada: 2025-01-19 23:17:05' },
      { id: 20, noPesanan: 'WL-STX250121405', operatorId: 27, washDate: null, finishingDate: toDate('2025-01-21 00:35:18'), qcDate: toDate('2025-01-21 00:35:21'), notes: 'Proses finishing selesai pada: 2025-01-20 18:35:18\nProses qc selesai pada: 2025-01-21 00:35:21' },
      { id: 21, noPesanan: 'WL-CSX250121301', operatorId: 27, washDate: toDate('2025-01-21 00:37:03'), finishingDate: toDate('2025-01-21 00:37:05'), qcDate: toDate('2025-01-21 00:37:09'), notes: 'Proses wash selesai pada: 2025-01-20 18:37:03\nProses finishing selesai pada: 2025-01-21 00:37:05\nProses qc selesai pada: 2025-01-21 00:37:09' },
      { id: 22, noPesanan: 'WL-CSX250121327', operatorId: 27, washDate: toDate('2025-01-21 09:37:42'), finishingDate: toDate('2025-01-21 09:37:45'), qcDate: toDate('2025-01-21 09:37:47'), notes: 'Proses wash selesai pada: 2025-01-21 03:37:42\nProses finishing selesai pada: 2025-01-21 09:37:45\nProses qc selesai pada: 2025-01-21 09:37:47' },
      { id: 23, noPesanan: 'WL-CSD250121231', operatorId: 27, washDate: toDate('2025-01-21 09:37:50'), finishingDate: toDate('2025-01-21 09:37:52'), qcDate: toDate('2025-01-21 09:37:53'), notes: 'Proses wash selesai pada: 2025-01-21 03:37:50\nProses finishing selesai pada: 2025-01-21 09:37:52\nProses qc selesai pada: 2025-01-21 09:37:53' },
      { id: 24, noPesanan: 'WL-CCX250121902', operatorId: 27, washDate: toDate('2025-01-21 09:43:56'), finishingDate: null, qcDate: toDate('2025-01-21 09:43:58'), notes: 'Proses wash selesai pada: 2025-01-21 03:43:56\nProses qc selesai pada: 2025-01-21 09:43:58' },
      { id: 25, noPesanan: 'WL-STX250121651', operatorId: 27, washDate: null, finishingDate: toDate('2025-01-21 09:44:03'), qcDate: toDate('2025-01-21 09:44:05'), notes: 'Proses finishing selesai pada: 2025-01-21 03:44:03\nProses qc selesai pada: 2025-01-21 09:44:05' },
      { id: 26, noPesanan: 'WL-STE250121893', operatorId: 27, washDate: null, finishingDate: toDate('2025-01-21 13:20:06'), qcDate: toDate('2025-01-21 13:20:10'), notes: 'Proses finishing selesai pada: 2025-01-21 07:20:06\nProses qc selesai pada: 2025-01-21 13:20:10' },
      { id: 27, noPesanan: 'WL-CCD250121836', operatorId: 27, washDate: toDate('2025-01-21 13:20:18'), finishingDate: null, qcDate: null, notes: 'Proses wash selesai pada: 2025-01-21 07:20:18' },
      { id: 28, noPesanan: 'WL-CSD250121593', operatorId: 27, washDate: toDate('2025-01-21 13:20:22'), finishingDate: null, qcDate: null, notes: 'Proses wash selesai pada: 2025-01-21 07:20:22' },
      { id: 29, noPesanan: 'WL-STX250130585', operatorId: 27, washDate: null, finishingDate: toDate('2025-01-30 15:54:48'), qcDate: toDate('2025-01-30 15:54:50'), notes: 'Proses finishing selesai pada: 2025-01-30 09:54:48\nProses qc selesai pada: 2025-01-30 15:54:50' },
    ],
  });

  // 12. log_qc (13 rows)
  console.log('→ seeding log_qc (13 rows)...');
  await prisma.logQc.createMany({
    data: [
      { id: 2, noPesanan: 'WL-CSX250119507', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 13:11:12') },
      { id: 3, noPesanan: 'WL-STX250119164', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 13:14:06') },
      { id: 8, noPesanan: 'WL-CCE250119693', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 13:59:48') },
      { id: 9, noPesanan: 'WL-CCE250119509', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 14:16:01') },
      { id: 10, noPesanan: 'WL-STE250119080', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 14:22:29') },
      { id: 11, noPesanan: 'WL-STD250119146', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 14:39:40') },
      { id: 12, noPesanan: 'WL-CCX250119665', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-19 16:17:08') },
      { id: 13, noPesanan: 'WL-STX250121405', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-20 17:35:24') },
      { id: 14, noPesanan: 'WL-CSX250121301', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-20 17:37:12') },
      { id: 15, noPesanan: 'WL-CSX250121327', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-21 06:20:00') },
      { id: 16, noPesanan: 'WL-STE250121893', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-21 06:20:12') },
      { id: 17, noPesanan: 'WL-STX250121651', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-30 08:54:41') },
      { id: 18, noPesanan: 'WL-STX250130585', spray: 'done', nota: 'done', packing: 'done', createdAt: toDateRequired('2025-01-30 08:55:33') },
    ],
  });

  // 13. cash_flow (10 rows)
  console.log('→ seeding cash_flow (10 rows)...');
  await prisma.cashFlow.createMany({
    data: [
      { id: 6, tanggal: toDateRequired('2025-01-19'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 86500.0, keterangan: 'Pembayaran laundry WL-CSX250119507 - Afif Muslim', createdAt: toDateRequired('2025-01-19 13:11:47') },
      { id: 7, tanggal: toDateRequired('2025-01-19'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 50000.0, keterangan: 'Pembayaran laundry WL-CCE250119693 - Pandhega Widhi', createdAt: toDateRequired('2025-01-19 14:00:31') },
      { id: 8, tanggal: toDateRequired('2025-01-19'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 80000.0, keterangan: 'Pembayaran laundry WL-STX250119164 - Agus Wahyu Ustinov', createdAt: toDateRequired('2025-01-19 14:15:12') },
      { id: 9, tanggal: toDateRequired('2025-01-19'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 40000.0, keterangan: 'Pembayaran laundry WL-STE250119080 - Ike Nova', createdAt: toDateRequired('2025-01-19 14:22:53') },
      { id: 10, tanggal: toDateRequired('2025-01-19'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 11500.0, keterangan: 'Pembayaran laundry WL-CCE250119509 - Dwiki Kurniawan', createdAt: toDateRequired('2025-01-19 14:22:57') },
      { id: 11, tanggal: toDateRequired('2025-01-19'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 35000.0, keterangan: 'Pembayaran laundry WL-STD250119146 - Gerlad Bona', createdAt: toDateRequired('2025-01-19 14:40:08') },
      { id: 12, tanggal: toDateRequired('2025-01-21'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 50000.0, keterangan: 'Pembayaran laundry WL-STX250121405 - Nazma Fauziah', createdAt: toDateRequired('2025-01-20 17:35:49') },
      { id: 13, tanggal: toDateRequired('2025-01-21'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 136000.0, keterangan: 'Pembayaran laundry WL-CSX250121301 - Safira de Aldira', createdAt: toDateRequired('2025-01-20 17:37:50') },
      { id: 14, tanggal: toDateRequired('2025-01-22'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 64000.0, keterangan: 'Pembayaran laundry WL-STE250121893 - Fransisca Amelia Praditasari', createdAt: toDateRequired('2025-01-22 06:46:35') },
      { id: 15, tanggal: toDateRequired('2025-01-30'), jenis: 'pendapatan', kategori: 'Laundry', jumlah: 80000.0, keterangan: 'Pembayaran laundry WL-STX250130585 - Nazma Fauziah', createdAt: toDateRequired('2025-01-30 08:56:18') },
    ],
  });

  // 14. notification_logs (6 rows) - only insert where orderId exists, skip orphan 67,68
  console.log('→ seeding notification_logs (6 rows, skipping orphan 67,68 if not exist)...');
  const validNotificationLogs = [
    { id: 26, orderId: 67, lastCalled: toDateRequired('2025-01-19 11:29:48') },
    { id: 27, orderId: 68, lastCalled: toDateRequired('2025-01-19 12:28:40') },
    { id: 28, orderId: 82, lastCalled: toDateRequired('2025-01-19 14:11:39') },
    { id: 29, orderId: 83, lastCalled: toDateRequired('2025-01-19 15:15:00') },
    { id: 30, orderId: 87, lastCalled: toDateRequired('2025-01-19 15:39:58') },
    { id: 31, orderId: 102, lastCalled: toDateRequired('2025-01-30 09:55:59') },
  ];
  for (const n of validNotificationLogs) {
    const orderExists = await prisma.order.findUnique({ where: { id: n.orderId } });
    if (!orderExists) {
      console.warn(`⚠️  Skipping notification_logs id=${n.id} — orderId ${n.orderId} not found (orphan from dump)`);
      continue;
    }
    await prisma.notificationLog.create({ data: n });
  }

  // Reset sequences for Postgres (so autoincrement continues after max id)
  console.log('→ resetting Postgres sequences...');
  const seqTables = [
    { table: 'users', col: 'id' },
    { table: 'customers', col: 'id' },
    { table: 'orders', col: 'id' },
    { table: 'inventory', col: 'id' },
    { table: 'absensi', col: 'id' },
    { table: 'gaji_bulanan', col: 'id' },
    { table: 'cash_flow', col: 'id' },
    { table: 'log_inventory', col: 'id' },
    { table: 'log_order', col: 'id' },
    { table: 'log_qc', col: 'id' },
    { table: 'master_harga', col: 'id' },
    { table: 'master_jenis_pakaian', col: 'id' },
    { table: 'master_tingkat_kotor', col: 'id' },
    { table: 'notification_logs', col: 'id' },
  ];
  for (const { table, col } of seqTables) {
    try {
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"','${col}'), COALESCE((SELECT MAX("${col}") FROM "${table}"),0)+1, false);`);
    } catch (e) {
      console.warn(`Could not reset sequence for ${table}:`, (e as Error).message);
    }
  }

  // Verification counts
  console.log('\n✅ Seed completed. Verification counts:');
  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    inventory: await prisma.inventory.count(),
    absensi: await prisma.absensi.count(),
    gajiBulanan: await prisma.gajiBulanan.count(),
    cashFlow: await prisma.cashFlow.count(),
    logInventory: await prisma.logInventory.count(),
    logOrder: await prisma.logOrder.count(),
    logQc: await prisma.logQc.count(),
    masterHarga: await prisma.masterHarga.count(),
    masterJenisPakaian: await prisma.masterJenisPakaian.count(),
    masterTingkatKotor: await prisma.masterTingkatKotor.count(),
    notificationLogs: await prisma.notificationLog.count(),
  };
  console.table(counts);
  // Explicit required verification
  console.log(`\nRequired verification:`);
  console.log(`users: ${counts.users} (expected 16 incl. stub 24, original 15)`);
  console.log(`customers: ${counts.customers} (expected 9)`);
  console.log(`orders: ${counts.orders} (expected 21)`);
  console.log(`Note: absensi 39 rows incl. stub user; notification_logs 4 valid (2 orphans skipped)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
