# Rencana Kasier AR Shop

## Tujuan
Menyiapkan fondasi aplikasi Kasier tanpa membangun fitur Tahap 2–5: struktur proyek TanStack React Start, koneksi PostgreSQL Neon melalui Drizzle, skema data inti, autentikasi Better Auth dengan peran `kasir` dan `pemilik`, serta seed akun pemilik awal.

## Keputusan yang sudah dikonfirmasi
- Akun kasir dibuat oleh pemilik; tidak ada pendaftaran mandiri untuk kasir.
- PostgreSQL menggunakan Neon free tier.
- Akun pemilik awal dibuat melalui seed.
- Belum mengerjakan barang masuk, transaksi, utang, foto, atau katalog publik.

## Struktur utama
- `src/routes`: route halaman TanStack Start; tahap ini hanya halaman login dan halaman utama terlindungi.
- `src/server/api`: Hono API untuk autentikasi dan endpoint status.
- `src/server/auth`: konfigurasi Better Auth dan pemeriksaan peran.
- `src/db`: koneksi PostgreSQL dan schema Drizzle.
- `src/shared/validators`: schema Valibot yang dapat dipakai bersama layar/server.
- `src/stores`: fondasi TanStack Store untuk state layar tahap berikutnya.
- `src/components`: komponen tampilan DaisyUI/Tailwind.
- `drizzle`: migrasi database.

## Alur teknis
Browser memakai route TanStack Start. API Hono menerima permintaan autentikasi, Better Auth mengelola sesi cookie `webdev_app_session`, dan Drizzle menyimpan akun/sesi serta tabel domain MVP. Seed memakai email dan password dari environment agar tidak ada rahasia di repositori.

## Batasan
Tidak memasang Recharts, layanan berbayar, database terkelola Manus, storage, atau fitur masa depan. Neon tetap menjadi database eksternal melalui `DATABASE_URL`.

## Tahap 2 — Barang, stok masuk, dan akun kasir

### Cakupan dan keputusan
- Gunakan hanya stack yang sudah ada di PRD dan dependency repo; tidak menambah paket atau layanan.
- Daftar barang tetap memakai API `/api/products`; tabel desktop dirender dengan TanStack Table yang sudah terkunci di package manifest, sedangkan tampilan kartu mobile tetap dipertahankan.
- Hak membuat barang dan mengubah harga tetap diperiksa oleh Hono di server untuk peran pemilik.
- Pemilik dapat membuat akun kasir dari halaman `/akun`. Rute daftar dan pembuatan akun memeriksa peran pemilik di server, validasi bersama memakai Valibot, dan Better Auth menyimpan password dalam bentuk hash. Pendaftaran publik tetap dimatikan.
- Barang masuk memakai layanan Tahap 2 yang sudah ada: riwayat dan penambahan stok terjadi dalam satu transaksi database.

### Struktur yang dipakai
- `src/routes/akun.tsx`: halaman terlindungi khusus pemilik untuk membuat dan melihat akun kasir.
- `src/components/ProductsTable.tsx`: tabel desktop berbasis TanStack Table; kartu barang mobile tetap di `src/routes/barang.tsx`.
- `src/server/api/app.ts` dan `src/server/services/users.ts`: endpoint tipis serta layanan daftar/pembuatan akun.
- `src/shared/validators/users.ts`: validasi Valibot bersama di sisi server dan form.

### Batas tahap
Tidak membangun penjualan/kasir, utang, pembayaran utang, foto barang, katalog publik, laporan, grafik, atau fitur masa depan. Tidak mengubah ulang skema dan data Tahap 1 selain menjalankan migrasi yang telah diizinkan pada database kosong.


## Tahap 3 — Penjualan kasir dan stok atomik

### Cakupan dan keputusan
- Halaman `/kasir` tersedia bagi pengguna login berperan `kasir` atau `pemilik`; keranjang menggunakan TanStack Store yang sudah ada.
- Skema Valibot bersama memvalidasi item, jumlah, metode pembayaran, serta nama/kontak ketika metode `utang` dipilih.
- Browser hanya mengirim product ID, quantity, metode bayar, dan data pembeli bila perlu. Server membaca harga aktif, membulatkan setiap subtotal baris ke Rupiah terdekat, lalu menjumlahkan total.
- Penjualan, item dengan snapshot `unit_price`, pembeli (untuk `utang`), dan pengurangan stok disimpan dalam satu transaksi PostgreSQL. Tahap ini tidak membuat atau memperbarui saldo utang ataupun pembayaran; itu tetap menjadi Tahap 4.
- Stok dikurangi dengan conditional update atomik `stock >= quantity` di database; product ID yang berulang diagregasi dan baris barang diproses dengan urutan deterministik. Jika satu pembaruan gagal, transaksi dibatalkan seluruhnya.
- Gunakan tabel `sales`, `sale_items`, `customers` dan tipe pembayaran yang sudah ada pada schema/migrasi. Tidak menambah pustaka, layanan, atau perubahan skema jika tidak diperlukan.

### Struktur yang dipakai
- `src/routes/kasir.tsx`: halaman transaksi kasir mobile-first.
- `src/stores/cart.ts`: state keranjang TanStack Store dan helper perubahan jumlah/item.
- `src/shared/validators/sales.ts`: validasi payload penjualan bersama di browser dan server.
- `src/server/api/app.ts`: endpoint `POST /api/sales`, dilindungi untuk kasir/pemilik.
- `src/server/services/sales.ts`: pengambilan harga aktif, hitung total, simpan sale/item/pembeli dan pengurangan stok secara atomik.
- `public/manus-routes.json`, route tree, `AppShell` dan dashboard disinkronkan dengan `/kasir`.

### Batas tahap
Belum membangun daftar utang, saldo utang, pembayaran, riwayat atau pembatalan transaksi, struk, laporan, katalog, foto, maupun fitur masa depan.
