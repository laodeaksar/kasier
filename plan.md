# Rencana Tahap 1 — Kasier AR Shop

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
