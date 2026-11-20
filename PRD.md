# PRD: Kasier — Aplikasi Stok Sembako AR Shop

> Dokumen ini adalah spesifikasi fungsional untuk AI Coding Builder (Cursor, Bolt, Lovable). Dokumen ini tidak berisi kode. Bagian bertanda `[...]` belum diputuskan: **jangan ditebak**, tanyakan ke Project Owner.

## 1. Ringkasan Produk
**Kasier** adalah aplikasi web untuk toko sembako **AR Shop**. Aplikasi membantu mencatat **barang masuk**, **transaksi kasir sederhana**, dan **utang pembeli**.

**Masalah utama:** pencatatan barang masuk dan utang pembeli sering terlupa.

Aplikasi dipakai di **HP dan komputer** (tampilan responsif).

## 2. Target Pengguna
| Peran | Jumlah | Keterangan |
|---|---|---|
| Kasir | 1 orang | Pengguna harian |
| Pemilik | [jumlah belum ditentukan] | Ikut memakai aplikasi, hak akses lebih luas |
| Customer | Umum | Hanya melihat katalog, **tanpa login** |

### Hak Akses
- **Kasir**: catat barang masuk, catat transaksi, catat utang, catat pembayaran utang, lihat stok.
- **Pemilik** (semua hak kasir, ditambah): tambah barang, ubah harga, batalkan transaksi dan utang, kelola akun.
- **Customer**: lihat katalog barang.

## 3. User Flow

### Kasir / Pemilik
1. Login (verifikasi identitas pengguna).
2. Masuk ke dashboard stok.
3. Pilih tugas:
   - **Barang masuk** → pilih barang → isi jumlah dan harga beli → simpan.
   - **Transaksi** → pilih barang dan jumlah → pilih lunas atau utang → simpan.
   - **Bayar utang** → pilih pembeli → isi nominal → simpan.

### Customer
1. Buka halaman katalog (tanpa login).
2. Lihat nama, harga jual, foto, dan status tersedia/habis.

## 4. Fitur

### Fitur MVP (wajib di rilis pertama)
1. **Catat barang masuk**: jumlah, harga beli, tanggal. Stok bertambah otomatis.
2. **Kasir sederhana**: pilih barang, total terhitung otomatis, stok berkurang. Jika stok tidak cukup, **transaksi diblokir** (bukan sekadar peringatan).
3. **Catat utang**: nama pembeli, **kontak pembeli**, nominal, dan pembayaran utang. Sisa utang terhitung otomatis.
4. **Daftar stok**: tabel stok terkini.
5. **Pembatalan transaksi** (hanya pemilik): transaksi **ditandai batal**, tidak dihapus, dan stok dikembalikan.
6. **Manajemen barang** (hanya pemilik): tambah barang, ubah harga, unggah foto (JPG/PNG/WebP, maks 1 MB).
7. **Katalog publik**: hanya barang yang dipilih pemilik yang tampil. Ada **batas jumlah akses (rate limit)** agar tidak disalahgunakan.
8. **Login dan hak akses** sesuai peran.

### Fitur Masa Depan (bukan prioritas awal)
- Grafik/laporan penjualan dan stok (usulan).
- [Fitur lain belum ditentukan]

## 5. Panduan Logika Aplikasi
- **Barang masuk disimpan**: tambah catatan barang masuk, lalu tambahkan jumlahnya ke stok barang.
- **Transaksi disimpan**: cek stok dulu. Jika kurang, tampilkan pesan dan jangan simpan. Jika cukup, simpan transaksi dan kurangi stok.
- **Transaksi berstatus utang**: otomatis membuat catatan utang atas nama pembeli.
- **Pembayaran utang disimpan**: kurangi sisa utang. Jika sisa 0, status utang menjadi lunas.
- **Transaksi dibatalkan**: ubah status menjadi "batal" (data tidak dihapus), kembalikan stok, sesuaikan utang terkait.
- **Katalog**: tampilkan hanya barang yang ditandai pemilik. Status "habis" muncul otomatis jika stok 0.
- **Hak akses**: setiap aksi diperiksa sesuai peran. Kasir tidak boleh mengubah harga atau membatalkan transaksi.

## 6. Tech-Stack (semua gratis dipakai)
- **Struktur proyek**: Turborepo (alat untuk mengelola beberapa bagian aplikasi dalam satu folder proyek / monorepo).
- **Tampilan web**: TanStack React Start, TanStack React Table (tabel), TanStack React Store (penyimpan data sementara di layar), Recharts (grafik), DaisyUI + Tailwind (gaya tampilan).
- **Formulir dan validasi input**: Formisch + Valibot.
- **Server dan database**: Hono (server API, yaitu penghubung antara tampilan dan database), Drizzle (alat akses database), PostgreSQL.
- **Login**: Better Auth.
- **Hosting dan database gratis**: misalnya Vercel dan Supabase. [Batas free tier perlu dicek sebelum dipilih]
- **Penyimpanan foto barang**: [belum ditentukan]

## 7. Hal yang Belum Ditentukan
- [Kategori dan satuan barang (kg/liter/pcs)]
- [Batas waktu jatuh tempo utang, jika ada]
- [Perkiraan jumlah barang dan transaksi per hari]
- [Bahasa tampilan aplikasi]
- [Metode pembayaran selain tunai dan utang]
- [Penyimpanan foto dan layanan hosting final]
