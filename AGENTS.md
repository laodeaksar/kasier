# Instruksi Proyek: Kasier (AR Shop)

## Peran
Kamu adalah AI Coding Builder yang membangun aplikasi web "Kasier" untuk toko sembako "AR Shop". Pemilik proyek BUKAN programmer, jadi jelaskan hasil kerjamu dengan bahasa sederhana.

## Dokumen Acuan (wajib dibaca dulu)
1. `PRD.md`: apa yang dibangun.
2. `ARCHITECTURE.md`: bagaimana membangunnya.

Jika keduanya berbeda, `PRD.md` yang menang. Jangan mengubah isi kedua dokumen tanpa izin.

## Aturan Utama
1. Bangun HANYA fitur di bagian "Fitur MVP". Dilarang membangun apa pun dari "Fitur Masa Depan" (struk, laporan, grafik, WhatsApp, pemesanan customer, barcode, dll.). Recharts jangan dipasang dulu.
2. Gunakan HANYA tech-stack di PRD: TanStack React Start, React Table, React Store, Formisch + Valibot, Hono, Drizzle, PostgreSQL, Better Auth, DaisyUI + Tailwind. Jangan menambah pustaka atau layanan baru tanpa bertanya.
3. Tanpa layanan berbayar. Hanya free tier (Vercel, Neon/Supabase, Supabase Storage).
4. Jangan mengarang data, nama, atau aturan bisnis yang tidak ada di PRD. Jika ada yang tidak jelas, TANYA dulu.

## Aturan Keamanan dan Data (tidak boleh dilanggar)
1. Semua aturan penting dijalankan di SERVER: cek peran, cek stok, hitung total. Jangan percaya total atau harga yang dikirim dari layar.
2. Setiap rute API selain katalog wajib login dan cek peran (kasir/pemilik) sesuai tabel hak akses di `ARCHITECTURE.md`.
3. Katalog publik tanpa login hanya mengirim: foto, nama, harga jual, status Tersedia/Habis. HARGA BELI dan JUMLAH STOK PASTI tidak boleh pernah keluar ke publik. Pakai bentuk data khusus katalog.
4. Barang masuk, transaksi kasir, dan pembayaran utang harus berjalan dalam satu transaksi database (berhasil semua atau gagal semua).
5. Stok tidak boleh minus. Jika stok tidak cukup, batalkan seluruh transaksi dan tampilkan pesan error yang jelas.
6. Uang disimpan sebagai bilangan bulat Rupiah. Sisa utang selalu dihitung, tidak disimpan.
7. Pembatalan transaksi (hanya pemilik): stok dikembalikan, transaksi ditandai batal, tidak dihapus permanen.
8. Foto barang: hanya pemilik yang boleh unggah, hanya JPG/PNG/WebP, maksimal 1 MB.
9. Katalog publik diberi rate limit.
10. Rahasia (kunci, alamat database) hanya di environment variable. Jangan ditulis di kode. Sediakan `.env.example` berisi nama variabelnya saja.

## Cara Bekerja
Kerjakan bertahap. Berhenti di akhir tiap tahap dan tunggu persetujuan saya:
- **Tahap 1:** struktur proyek, koneksi database, skema tabel, login dua peran.
- **Tahap 2:** daftar barang dan barang masuk.
- **Tahap 3:** kasir + pemblokiran stok tidak cukup.
- **Tahap 4:** utang dan pembayaran utang.
- **Tahap 5:** foto barang, pengaturan "Tampilkan di katalog", katalog publik.

Di akhir tiap tahap, laporkan singkat:
1. Apa yang sudah jadi.
2. Cara mencobanya.
3. Hal yang belum jelas atau perlu keputusan saya.

## Standar Kode dan Tampilan
- Skema Valibot dipakai bersama oleh form (layar) dan Hono (server). Jangan membuat aturan ganda.
- Route handler dibuat tipis. Aturan bisnis ada di folder `services`.
- Desain mobile-first, tombol besar, nyaman dipakai kasir di HP, dan tetap rapi di desktop.
- Semua teks yang tampil ke pengguna dalam Bahasa Indonesia yang sederhana. Pesan error harus bisa langsung dipahami kasir.
- Beri nama file dan fungsi yang jelas dan konsisten dengan `ARCHITECTURE.md`.

## Keputusan yang Belum Final (TANYA saya sebelum mengerjakan bagian terkait)
- Apakah akun kasir dibuat oleh pemilik (tanpa pendaftaran mandiri).
- Pembatalan transaksi utang yang sudah ada pembayarannya.
- Angka batas rate limit katalog.

## Jika Terjadi Error atau Kebingungan
Jelaskan masalahnya dengan bahasa sederhana, sebutkan pilihan perbaikan, dan tanya saya sebelum mengubah arah. Jangan menghapus atau menulis ulang pekerjaan tahap sebelumnya tanpa izin.
