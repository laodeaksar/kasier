# ARCHITECTURE: Kasier (AR Shop)

> Gambaran teknis tingkat tinggi untuk AI Coding Builder. Tidak berisi kode. Bagian `[...]` belum diputuskan: jangan ditebak. Rujukan fungsional ada di `PRD.md`.

## 1. Gambaran Umum
Aplikasi web satu toko (AR Shop) dengan tiga jenis pengguna: kasir, pemilik, dan customer (katalog publik tanpa login). Dipakai di HP dan komputer.

## 2. Tech-Stack
| Lapisan | Pilihan |
|---|---|
| Struktur proyek | Turborepo (monorepo: banyak bagian dalam satu folder proyek) |
| Web / tampilan | TanStack React Start, React Table, React Store, Recharts |
| Gaya tampilan | DaisyUI + Tailwind |
| Formulir + validasi | Formisch + Valibot |
| Server API | Hono |
| Akses database | Drizzle |
| Database | PostgreSQL |
| Login | Better Auth |
| Hosting | [belum ditentukan; contoh gratis: Vercel, Supabase] |
| Penyimpanan foto | [belum ditentukan] |

## 3. Struktur Monorepo (usulan)
- **apps/web**: aplikasi tampilan (halaman kasir, pemilik, katalog publik).
- **apps/api**: server Hono (aturan bisnis, pemeriksaan hak akses).
- **packages/db**: definisi tabel dan koneksi database (Drizzle).
- **packages/validation**: aturan validasi input (Valibot) yang dipakai bersama oleh web dan api.
- [Pembagian detail lain belum ditentukan]

Prinsip: aturan validasi dan bentuk data ditulis **sekali** di paket bersama, lalu dipakai web dan api.

## 4. Model Data (konsep)
- **Pengguna**: akun login, memiliki peran (kasir / pemilik).
- **Barang**: nama, harga jual, foto, stok saat ini, penanda tampil di katalog. [Kategori dan satuan belum ditentukan]
- **Barang masuk**: barang, jumlah, harga beli, tanggal, pencatat.
- **Transaksi**: tanggal, pencatat, status (selesai / batal), jenis bayar (lunas / utang), total.
- **Item transaksi**: transaksi, barang, jumlah, harga saat transaksi.
- **Pembeli**: nama, kontak.
- **Utang**: pembeli, transaksi asal, nominal, sisa, status (belum lunas / lunas).
- **Pembayaran utang**: utang, nominal, tanggal, pencatat.

Catatan: harga jual pada item transaksi disimpan saat transaksi terjadi agar riwayat tidak berubah ketika harga barang diubah nanti.

## 5. Alur Data Utama
1. **Barang masuk**: web kirim data → api validasi → simpan catatan + tambah stok dalam satu proses utuh (jika gagal, keduanya batal).
2. **Transaksi**: api cek stok semua item. Jika ada yang kurang, tolak seluruh transaksi. Jika cukup, simpan transaksi, kurangi stok, dan buat utang bila jenis bayar utang (satu proses utuh).
3. **Pembayaran utang**: simpan pembayaran, kurangi sisa utang, ubah status jika sisa 0.
4. **Pembatalan** (pemilik): ubah status menjadi batal, kembalikan stok, sesuaikan utang. Data **tidak dihapus**.
5. **Katalog publik**: api hanya mengirim barang bertanda tampil, dengan data terbatas (nama, harga jual, foto, tersedia/habis). Harga beli dan stok angka **tidak** dikirim.

## 6. Keamanan dan Hak Akses
- Hak akses diperiksa **di server (api)**, bukan hanya disembunyikan di tampilan.
- Peran: kasir, pemilik. Customer tidak punya akun; hanya mengakses katalog publik.
- Katalog publik diberi **rate limit** (batas jumlah permintaan). [Angka batas belum ditentukan]
- Unggah foto: JPG/PNG/WebP, maksimal 1 MB; tolak format lain.
- Harga beli hanya terlihat oleh peran yang berhak. [Peran yang boleh melihat harga beli belum ditentukan]

## 7. Hal yang Belum Ditentukan
- [Layanan hosting dan penyimpanan foto final]
- [Strategi backup database]
- [Angka rate limit]
- [Kategori dan satuan barang]
- [Aturan jatuh tempo utang]
