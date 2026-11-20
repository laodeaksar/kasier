# ARCHITECTURE: Kasier untuk AR Shop

Dokumen ini menjelaskan rancangan teknis Kasier berdasarkan PRD. Dibuat untuk dibaca AI Coding Builder (Cursor, Bolt, Lovable) bersama PRD. Dokumen ini tidak berisi kode program; AI Builder yang menulis kodenya.

> **Aturan emas:** jika PRD dan dokumen ini berbeda, **PRD yang menang**. Bagian bertanda **[Perlu konfirmasi]** adalah usulan arsitektur yang belum diputuskan pemilik.

---

## 1. Tujuan dan Prinsip

Tujuan: mencatat barang masuk, transaksi kasir, utang pembeli, dan menampilkan katalog publik untuk AR Shop.

Prinsip rancangan:
1. **Sederhana dulu.** Satu aplikasi, satu database, satu tempat deploy. Tidak ada microservice.
2. **Server adalah penentu.** Semua aturan penting (cek stok, hak akses, hitung total) dijalankan di server, bukan di layar.
3. **Data uang dan stok harus konsisten.** Satu transaksi kasir berhasil seluruhnya atau gagal seluruhnya.
4. **Tanpa biaya (Rp0).** Hanya free tier.
5. **Fokus MVP.** Fitur masa depan tidak dibangun, tapi struktur dibuat agar mudah ditambah nanti.

---

## 2. Gambaran Sistem

```
 Customer (tanpa login) ──┐
                          ▼
 Kasir / Pemilik ──► Browser (HP / Desktop)
 (login)                  │
                          ▼
              TanStack React Start (Vercel)
              ├─ Halaman (UI): DaisyUI + Tailwind
              └─ Server: Hono API di /api/*
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
     Better Auth      Drizzle ORM     Supabase Storage
     (sesi, peran)         │          (foto barang)
          └───────────────►▼
                    PostgreSQL (Neon / Supabase)
```

Cara membaca: browser memanggil halaman dari TanStack Start. Data dibaca dan ditulis lewat API Hono di server yang sama. Hono memakai Better Auth untuk memeriksa siapa penggunanya, lalu Drizzle untuk bicara ke PostgreSQL. Foto disimpan di storage terpisah, dan database hanya menyimpan alamat (URL) foto.

---

## 3. Peran Tiap Teknologi

| Teknologi | Tugas di Kasier |
|---|---|
| TanStack React Start | Kerangka full-stack: routing halaman, render, dan hosting server di satu proyek |
| TanStack React Table | Tabel daftar barang, utang, riwayat transaksi |
| TanStack React Store | State di layar: keranjang kasir (barang yang sedang dipilih) |
| Formisch + Valibot | Form dan validasi. **Skema Valibot dipakai bersama** oleh form (layar) dan Hono (server) |
| Hono | API di server (`/api/*`), tempat semua aturan bisnis |
| Drizzle | Definisi tabel, migrasi, dan query ke PostgreSQL |
| PostgreSQL | Penyimpanan data permanen |
| Better Auth | Login, sesi, dan peran (kasir/pemilik) |
| DaisyUI + Tailwind | Tampilan responsif HP dan desktop |
| Recharts | **Belum dipasang.** Dipakai nanti untuk grafik laporan (fitur masa depan) |

---

## 4. Struktur Folder (Usulan)

```
kasier/
├─ ARCHITECTURE.md
├─ PRD.md
├─ .env.example              # daftar nama variabel, tanpa nilai rahasia
├─ drizzle/                  # file migrasi database
├─ src/
│  ├─ routes/                # halaman (TanStack Start)
│  │  ├─ index              # halaman utama kasir/pemilik
│  │  ├─ login
│  │  ├─ katalog            # PUBLIK, tanpa login
│  │  ├─ barang             # daftar & kelola barang
│  │  ├─ barang-masuk
│  │  ├─ kasir
│  │  ├─ utang
│  │  └─ akun               # kelola akun (pemilik)
│  ├─ server/
│  │  ├─ api/               # rute Hono per fitur (products, stock-ins, sales, debts, catalog, users, uploads)
│  │  ├─ middleware/        # cek login & peran
│  │  ├─ services/          # aturan bisnis (hitung total, cek stok, hitung sisa utang)
│  │  └─ auth               # konfigurasi Better Auth
│  ├─ db/
│  │  ├─ schema             # definisi tabel Drizzle
│  │  └─ client             # koneksi database
│  ├─ shared/
│  │  └─ validators         # skema Valibot (dipakai layar dan server)
│  ├─ stores/               # TanStack Store (keranjang kasir)
│  └─ components/           # komponen UI (DaisyUI)
```

Aturan folder: **route handler tipis**, aturan bisnis ada di `services/`. Halaman tidak boleh bicara langsung ke database.

---

## 5. Peran dan Hak Akses

| Aksi | Publik (customer) | Kasir | Pemilik |
|---|:-:|:-:|:-:|
| Lihat katalog | ✅ | ✅ | ✅ |
| Login | n/a | ✅ | ✅ |
| Lihat daftar barang dan stok | ❌ | ✅ | ✅ |
| Catat barang masuk | ❌ | ✅ | ✅ |
| Transaksi kasir | ❌ | ✅ | ✅ |
| Catat utang dan pembayaran utang | ❌ | ✅ | ✅ |
| Tambah barang baru | ❌ | ❌ | ✅ |
| Ubah harga beli/jual | ❌ | ❌ | ✅ |
| Unggah foto barang | ❌ | ❌ | ✅ |
| Atur "Tampilkan di katalog" | ❌ | ❌ | ✅ |
| Hapus/batalkan transaksi dan utang | ❌ | ❌ | ✅ |
| Kelola akun | ❌ | ❌ | ✅ |

Penerapan:
- Customer **tidak punya akun**. Katalog adalah satu-satunya jalur publik.
- Better Auth menyimpan **role** (`kasir` atau `pemilik`) pada setiap akun.
- **Akun kasir dibuat oleh pemilik.** Tidak ada pendaftaran mandiri. **[Perlu konfirmasi]**
- Setiap rute API selain katalog melewati middleware: (1) wajib login, (2) cek role sesuai tabel di atas. Menyembunyikan tombol di layar hanya untuk kenyamanan, bukan pengamanan.

---

## 6. Model Data (Database)

Aturan umum:
- **Uang** disimpan sebagai **bilangan bulat Rupiah** (tanpa desimal) agar tidak ada selisih pembulatan.
- **Jumlah stok** disimpan sebagai angka desimal (3 angka di belakang koma) karena sembako sering dijual per kg atau liter.
- Semua tabel punya `id`, `created_at`, dan `updated_at`.

### Tabel dari Better Auth
Better Auth mengelola tabel akun, sesi, dan verifikasi sendiri. Kasier menambahkan satu kolom **role** pada tabel pengguna.

### Tabel `products` (barang)
| Kolom | Keterangan |
|---|---|
| name | Nama barang |
| unit | Satuan (kg, liter, pcs, dll.) |
| buy_price | Harga beli (**rahasia, tidak boleh ke publik**) |
| sell_price | Harga jual |
| photo_url | Alamat foto (boleh kosong) |
| stock | Stok saat ini, **tidak boleh kurang dari 0** (dijaga juga oleh aturan database) |
| show_in_catalog | Tampil di katalog? Bawaan: **tidak** |

### Tabel `stock_ins` (barang masuk)
| Kolom | Keterangan |
|---|---|
| product_id | Barang yang masuk |
| quantity | Jumlah masuk |
| buy_price | Harga beli saat itu |
| received_date | Tanggal barang masuk |
| created_by | Pengguna yang mencatat |

### Tabel `sales` (transaksi kasir)
| Kolom | Keterangan |
|---|---|
| total | Total belanja (dihitung server) |
| payment_method | `lunas` atau `utang` |
| customer_id | Diisi jika `utang`, selain itu kosong |
| created_by | Pengguna yang mencatat |
| voided_at | Terisi jika dibatalkan pemilik |

### Tabel `sale_items` (isi transaksi)
| Kolom | Keterangan |
|---|---|
| sale_id, product_id | Penghubung |
| quantity | Jumlah dibeli |
| unit_price | **Harga jual saat transaksi** (disalin agar riwayat tidak berubah saat harga diubah) |

### Tabel `customers` (pembeli berutang)
| Kolom | Keterangan |
|---|---|
| name | Nama pembeli |
| contact | Kontak pembeli |

### Tabel `debts` (utang)
| Kolom | Keterangan |
|---|---|
| customer_id | Pemilik utang |
| sale_id | Transaksi asal utang |
| amount | Jumlah utang awal |

### Tabel `debt_payments` (pembayaran utang)
| Kolom | Keterangan |
|---|---|
| debt_id | Utang yang dibayar |
| amount | Jumlah dibayar |
| paid_at | Tanggal bayar |
| created_by | Pengguna yang mencatat |

### Hubungan antar tabel
- Satu `sale` punya banyak `sale_items`.
- Satu `sale` bermetode utang menghasilkan satu `debt` untuk satu `customer`.
- Satu `debt` punya banyak `debt_payments`.
- **Sisa utang tidak disimpan**, selalu dihitung: `amount` dikurangi jumlah semua `debt_payments`. Ini mencegah angka tidak sinkron.

---

## 7. Alur Penting (Aturan Bisnis di Server)

### 7.1 Barang Masuk
1. Validasi isian (skema Valibot).
2. Dalam **satu transaksi database**: simpan `stock_ins` lalu tambah `products.stock`.
3. Jika salah satu gagal, keduanya dibatalkan.

### 7.2 Transaksi Kasir
1. Layar mengirim daftar barang dan jumlah. **Total dari layar tidak dipercaya.**
2. Server mengambil harga jual terbaru dari database dan **menghitung total sendiri**.
3. Dalam **satu transaksi database**:
   - Kurangi stok tiap barang dengan pengecekan atomik (kurangi hanya jika stok cukup).
   - Jika ada barang yang stoknya tidak cukup: **batalkan seluruh transaksi** dan kembalikan pesan error ke layar. Stok tidak boleh minus.
   - Simpan `sales` dan `sale_items` (dengan harga jual saat itu).
   - Jika metode `utang`: buat atau pilih `customer` (nama dan kontak wajib), lalu buat `debt`.
4. Dua kasir yang menjual barang yang sama bersamaan tidak boleh membuat stok minus, karena pengecekan dilakukan di database.

### 7.3 Pembayaran Utang
1. Hitung sisa utang saat ini.
2. Jika jumlah bayar lebih besar dari sisa utang: **tolak**.
3. Simpan `debt_payments`. Sisa utang otomatis ikut berubah karena dihitung ulang.

### 7.4 Katalog Publik
1. Endpoint tanpa login.
2. Ambil hanya barang dengan `show_in_catalog` bernilai ya.
3. Kembalikan **hanya**: foto, nama, harga jual, dan status. Status = **Tersedia** jika stok lebih dari 0, selain itu **Habis**.
4. **Jumlah stok pasti dan harga beli tidak boleh ada di respons.** Gunakan bentuk data khusus untuk katalog (daftar kolom yang diizinkan), bukan mengirim seluruh baris barang lalu menyaringnya di layar.

### 7.5 Pembatalan Transaksi (khusus pemilik)
Keputusan pemilik:
- Transaksi diberi tanda `voided_at` (**tidak dihapus permanen**, supaya ada jejak).
- Stok barang dalam transaksi itu **dikembalikan**.

Usulan tambahan **[Perlu konfirmasi]**: jika transaksinya utang dan sudah ada pembayaran, pembatalan **ditolak** kecuali pembayaran dibatalkan lebih dulu.

---

## 8. Daftar API (Hono)

Semua di bawah `/api`. Format data: JSON. Semua input divalidasi dengan skema Valibot bersama.

| Rute | Fungsi | Siapa |
|---|---|---|
| GET `/catalog` | Daftar katalog publik | Publik |
| POST `/auth/*` | Login/logout (ditangani Better Auth) | Publik (login) |
| GET `/products` | Daftar barang lengkap | Kasir, Pemilik |
| POST `/products` | Tambah barang | Pemilik |
| PATCH `/products/:id` | Ubah harga, foto, tampil di katalog | Pemilik |
| POST `/stock-ins` | Catat barang masuk | Kasir, Pemilik |
| GET `/stock-ins` | Riwayat barang masuk | Kasir, Pemilik |
| POST `/sales` | Simpan transaksi kasir | Kasir, Pemilik |
| GET `/sales` | Riwayat transaksi | Kasir, Pemilik |
| POST `/sales/:id/void` | Batalkan transaksi | Pemilik |
| GET `/debts` | Daftar utang aktif | Kasir, Pemilik |
| POST `/debts/:id/payments` | Catat pembayaran utang | Kasir, Pemilik |
| DELETE `/debts/:id` | Hapus data utang | Pemilik |
| POST `/uploads/product-photo` | Unggah foto barang | Pemilik |
| GET/POST/PATCH `/users` | Kelola akun | Pemilik |

Format error: pesan singkat berbahasa Indonesia yang bisa langsung ditampilkan ke kasir (misalnya "Stok [nama barang] tidak cukup").

---

## 9. Arsitektur Frontend

- **Routing:** satu halaman per menu (lihat struktur folder). Halaman selain `katalog` dan `login` hanya bisa dibuka setelah login, dan menu menyesuaikan role.
- **Keranjang kasir:** disimpan di TanStack Store (hanya di layar). Baru dikirim ke server saat tombol Simpan ditekan.
- **Tabel:** TanStack Table untuk daftar barang, utang, dan riwayat.
- **Form:** Formisch dengan skema Valibot yang sama dengan server, sehingga aturan tidak ganda.
- **Responsif:** desain **mobile-first**. Kasir kemungkinan memakai HP, jadi tombol besar, tabel bisa digeser, dan alur kasir cepat. Di desktop tata letak melebar.
- **Katalog:** halaman ringan, kartu barang dengan foto, nama, harga, dan lencana Tersedia/Habis.

---

## 10. Penyimpanan Foto

- Foto disimpan di **Supabase Storage** (free tier). Database hanya menyimpan `photo_url`.
- Unggah hanya oleh pemilik, lewat server (server memeriksa peran).
- Jenis file yang diterima: **JPG, PNG, dan WebP**. Ukuran maksimum: **1 MB** per foto. Server menolak file di luar aturan ini dengan pesan yang jelas.
- Foto katalog bersifat publik (bisa dibuka siapa saja lewat alamatnya), jadi **jangan unggah foto yang tidak boleh dilihat publik**.

---

## 11. Keamanan dan Integritas Data

1. **Cek peran di server** untuk setiap rute selain katalog.
2. **Harga beli tidak pernah keluar** ke katalog atau ke peran yang tidak berhak.
3. **Total dan stok dihitung server**, bukan percaya kiriman dari layar.
4. **Transaksi database** untuk barang masuk, kasir, dan pembayaran utang.
5. **Aturan database** sebagai pengaman kedua: stok tidak boleh minus.
6. **Validasi input** di server dengan Valibot, walau layar sudah memvalidasi.
7. **Rahasia** (alamat database, kunci Auth, kunci Storage) hanya di *environment variable*, **tidak masuk repositori**. Sertakan `.env.example` berisi nama variabelnya saja.
8. Sesi login memakai cookie yang dikelola Better Auth. Katalog publik **dibatasi lajunya** (*rate limit*, yaitu jumlah permintaan per alamat pengunjung dalam waktu tertentu). Angka batasnya: [belum ditentukan, atur saat implementasi].
9. Pencatatan siapa yang membuat/mengubah data (`created_by`) untuk jejak audit sederhana.

---

## 12. Deployment (Rp0)

| Bagian | Layanan | Catatan |
|---|---|---|
| Aplikasi (UI + API) | Vercel (free tier) | Satu proyek untuk halaman dan Hono |
| Database | Neon atau Supabase (free tier) | Pilih salah satu |
| Foto | Supabase Storage (free tier) | |
| Migrasi database | Drizzle | Dijalankan saat deploy/rilis |

Environment minimal: alamat database, rahasia dan alamat dasar Better Auth, serta kunci akses Storage. Cek batas gratis di situs resmi masing-masing sebelum dipakai, karena bisa berubah.

---

## 13. Urutan Pembangunan (Selaras Prompt Pembuka)

1. **Tahap 1:** struktur proyek, koneksi database, skema tabel, login dua peran.
2. **Tahap 2:** daftar barang dan barang masuk.
3. **Tahap 3:** kasir dengan pemblokiran stok tidak cukup.
4. **Tahap 4:** utang dan pembayaran utang.
5. **Tahap 5:** foto barang, pengaturan katalog, dan katalog publik.

---

## 14. Di Luar Cakupan (Jangan Dibangun Dulu)

Cetak struk, laporan dan grafik (Recharts), peringatan stok menipis, pengingat WhatsApp, pemesanan oleh customer, customer melihat utangnya, banyak cabang, scan barcode.

Titik perluasan yang sudah disiapkan: tabel transaksi dan barang masuk menyimpan tanggal dan pencatat, sehingga laporan nanti cukup berupa query baru; peran bisa ditambah di Better Auth; katalog sudah punya endpoint terpisah sehingga pemesanan bisa ditambahkan tanpa mengubahnya.

---

## 15. Keputusan

**Sudah diputuskan pemilik:**
- Pembatalan transaksi: stok dikembalikan, transaksi ditandai batal (tidak dihapus).
- Foto barang: JPG/PNG/WebP, maksimum 1 MB.
- Katalog publik dibatasi lajunya (*rate limit*).

**Masih perlu dikonfirmasi:**
1. Akun kasir dibuat oleh pemilik (tanpa pendaftaran mandiri).
2. Pembatalan transaksi utang yang sudah ada pembayarannya: ditolak sampai pembayaran dibatalkan lebih dulu.
3. Angka batas *rate limit* katalog.
