# PRD: Kasier untuk AR Shop

*Dokumen spesifikasi fungsional untuk AI Coding Builder (Cursor, Bolt, Lovable). Tanpa kode program.*

## 1. Ringkasan Produk

**Kasier** adalah aplikasi web sederhana untuk **AR Shop** (toko sembako). Masalah utama: pemilik dan kasir sering lupa mencatat barang masuk dan utang pembeli. Aplikasi ini mencatat **barang masuk**, melayani **transaksi kasir**, mencatat **utang pembeli**, dan menyediakan **katalog barang** yang bisa dilihat pembeli.

## 2. Target Pengguna dan Hak Akses

- **Kasir (1 orang)** dan **pemilik toko**: harus login. Dipakai di HP dan desktop, jadi tampilan harus **responsif** (menyesuaikan ukuran layar).
- **Customer (pembeli):** tidak perlu akun dan tidak perlu login. Customer hanya membuka halaman katalog yang terbuka untuk umum.

**Kasir** boleh:
- Mencatat barang masuk, transaksi kasir, utang, dan pembayaran utang
- Melihat daftar barang dan stok

Kasir **tidak boleh** menambah barang baru, mengubah harga, menghapus transaksi atau utang, maupun mengelola akun.

**Pemilik** boleh semua hal di atas, ditambah:
- Menambah barang baru dan mengubah harga
- Mengunggah foto barang
- Memilih barang mana saja yang tampil di katalog
- Menghapus atau membatalkan transaksi dan utang
- Mengelola akun pengguna

**Customer** hanya boleh melihat katalog (hanya baca). Tidak ada akses ke stok detail, harga beli, transaksi, utang, atau akun.

**Catatan untuk AI Builder:** hak akses dicek di sisi server, bukan hanya dengan menyembunyikan tombol di layar.

## 3. User Flow

1. **Kasir/pemilik** login (masuk dengan akun).
2. Di halaman utama, pilih menu: **Barang Masuk**, **Kasir**, **Utang**, atau **Daftar Barang**.
3. **Barang Masuk:** pilih barang (atau tambah barang baru, khusus pemilik) → isi jumlah, harga beli, dan tanggal → simpan → stok bertambah otomatis.
4. **Kasir:** pilih barang dan jumlah → total muncul otomatis → pilih **Lunas** atau **Utang** → simpan → stok berkurang otomatis.
5. **Stok tidak cukup:** tampilkan pesan, **transaksi tidak bisa disimpan** sampai jumlah disesuaikan.
6. **Utang:** isi nama dan kontak pembeli. Saat pembeli membayar, catat pembayaran dan sisa utang diperbarui.
7. **Customer:** membuka alamat katalog → melihat daftar barang dengan foto, nama, harga jual, dan status tersedia/habis.

## 4. Fitur MVP (Wajib di Versi Pertama)

- Login kasir dan pemilik, dengan pembagian hak akses
- Daftar barang: nama, satuan (kg, liter, pcs), harga beli, harga jual, foto, stok
- Unggah foto barang (oleh pemilik)
- Catat barang masuk: tanggal, barang, jumlah, harga beli
- Kasir sederhana: total otomatis, stok berkurang otomatis
- Pemblokiran transaksi jika stok tidak cukup
- Catat utang: nama, **kontak**, jumlah, tanggal, riwayat pembayaran, sisa utang
- Daftar utang aktif
- **Pengaturan tampil di katalog:** setiap barang punya pilihan "Tampilkan di katalog" (ya/tidak), hanya bisa diubah oleh pemilik. Barang baru **tidak tampil** sampai pemilik mengaktifkannya.
- **Katalog publik:** halaman hanya-baca berisi foto, nama, harga jual, dan status tersedia/habis, tanpa login
- Tampilan nyaman di HP dan desktop

## 5. Fitur Masa Depan (Jangan Dikerjakan Dulu)

- Cetak struk atau nota
- Laporan penjualan, keuntungan, dan grafik (Recharts dipakai di sini)
- Peringatan stok menipis
- Pengingat utang lewat WhatsApp
- Customer memesan barang lewat aplikasi
- Customer melihat sisa utangnya sendiri
- Banyak cabang dan banyak kasir
- Scan barcode

## 6. Panduan Logika Aplikasi

- Saat **"Simpan"** di Barang Masuk ditekan, simpan ke tabel *barang masuk* dan **tambahkan** jumlahnya ke stok barang.
- Saat transaksi kasir disimpan, simpan ke tabel *transaksi* dan **kurangi** stok sesuai jumlah dibeli.
- Total belanja = harga jual × jumlah, dijumlahkan untuk semua barang.
- **Sebelum menyimpan transaksi**, cek stok. Jika jumlah beli lebih besar dari stok, tampilkan error dan **batalkan penyimpanan**. Stok tidak boleh minus.
- Jika cara bayar **Utang**, buat atau perbarui catatan utang atas nama pembeli beserta kontaknya.
- Sisa utang = total utang − total pembayaran. Pembayaran tidak boleh melebihi sisa utang.
- **Katalog:** ambil dari tabel barang **hanya barang yang ditandai "Tampilkan di katalog"**, dan hanya foto, nama, harga jual, dan status. Status = **Tersedia** jika stok lebih dari 0, **Habis** jika stok 0. Jumlah stok pasti dan **harga beli tidak boleh pernah dikirim ke layar customer**.
- Halaman katalog tidak butuh login. Semua halaman dan data lain wajib login dan dicek perannya.
- Semua data tersimpan permanen di database, bukan hanya di layar.

## 7. Tech-Stack

| Kebutuhan | Teknologi |
|---|---|
| Kerangka aplikasi web (full-stack) | TanStack React Start |
| Tabel data | TanStack React Table |
| Penyimpanan status di layar (*state*) | TanStack React Store |
| Grafik (fitur masa depan) | Recharts |
| Form dan validasi (*pengecekan isian*) | Formisch + Valibot |
| Server (*API*, penghubung layar dan data) | Hono |
| Pengelola database (*ORM*) | Drizzle |
| Database | PostgreSQL |
| Login dan peran (*Auth*, sistem masuk akun) | Better Auth |
| Tampilan | DaisyUI + Tailwind |

**Hosting gratis (Rp0):** database di free tier **Supabase** atau **Neon**, aplikasi di **Vercel** (free tier). Untuk menyimpan foto barang, bisa memakai **Supabase Storage** (tempat penyimpanan file) di free tier. Cek batas gratis di situs resmi masing-masing.

**Catatan untuk AI Builder:** kerjakan alur utama dulu (barang masuk → kasir → utang), lalu katalog. Jangan membuat fitur dari bagian "Fitur Masa Depan".

## 8. Keputusan Tambahan

- Pembatalan transaksi oleh pemilik: stok dikembalikan, transaksi ditandai batal (tidak dihapus permanen).
- Foto barang: hanya JPG, PNG, atau WebP, maksimum 1 MB.
- Katalog publik dibatasi lajunya (*rate limit*, yaitu batas jumlah permintaan per pengunjung dalam waktu tertentu).
