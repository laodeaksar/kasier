# Kasier — AR Shop

Kasier adalah aplikasi web sederhana untuk toko sembako AR Shop. Tahap 1 menyiapkan login, role, database, dan schema. Tahap 2 sekarang menyediakan daftar barang, tambah barang, ubah harga oleh pemilik, serta pencatatan barang masuk yang menambah stok secara otomatis.

Fitur kasir/penjualan, utang, foto, dan katalog publik belum dibuat karena dikerjakan pada tahap berikutnya setelah persetujuan.

## Menyiapkan database Neon

Buat project PostgreSQL di Neon pada free tier, lalu salin connection string PostgreSQL dari Neon. Connection string biasanya sudah berisi `sslmode=require`.

Di folder proyek, salin `env.template` menjadi `.env`, lalu ganti placeholder dengan nilai Anda. File `.env.example` tetap berisi nama variabel saja sesuai aturan proyek.

```text
DATABASE_URL=isi_connection_string_dari_Neon
BETTER_AUTH_SECRET=isi_string_acak_minimal_32_karakter
BETTER_AUTH_URL=http://localhost:3000
OWNER_EMAIL=email_pemilik
OWNER_PASSWORD=password_minimal_8_karakter
OWNER_NAME=Nama Pemilik
```

Untuk Preview HTTPS atau deployment, `BETTER_AUTH_URL` harus diisi dengan alamat HTTPS aplikasi yang digunakan. Jangan memasukkan file `.env` ke Git atau membagikan isinya.

## Menjalankan aplikasi

Setelah `.env` terisi, jalankan perintah berikut dari folder proyek:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Perintah `db:migrate` membuat tabel. Perintah `db:seed` membuat akun pemilik pertama. Seed aman dijalankan ulang: jika email sudah ada, password dan data akun tidak ditimpa.

Buka `http://localhost:3000/login`, lalu masuk memakai `OWNER_EMAIL` dan `OWNER_PASSWORD`.

## Mencoba Tahap 2

1. Buka menu **Daftar Barang**.
2. Sebagai pemilik, isi nama barang, satuan, harga beli, dan harga jual, lalu tekan **Simpan Barang**.
3. Buka menu **Barang Masuk**, pilih barang, isi jumlah, harga beli saat datang, dan tanggal, lalu tekan **Simpan Barang Masuk**.
4. Kembali ke **Daftar Barang**. Stok barang akan bertambah otomatis.
5. Sebagai pemilik, gunakan tombol **Ubah harga** untuk memperbarui harga. Akun kasir hanya dapat melihat barang dan mencatat barang masuk.
6. Sebagai pemilik, buka **Kelola Akun**, isi nama, email, dan kata sandi awal untuk membuat akun kasir. Akun yang dibuat otomatis berperan sebagai kasir.

Setiap pencatatan barang masuk disimpan dalam satu transaksi database: catatan barang masuk dan penambahan stok berhasil bersama-sama atau dibatalkan bersama-sama.

## Menjalankan build produksi dengan Nitro

Jalankan build, lalu start server Node.js dari hasil build:

```bash
pnpm build
pnpm start
```

## Pemeriksaan teknis

```bash
pnpm typecheck
pnpm build
curl http://localhost:3000/api/health
```

Endpoint health hanya untuk memastikan server hidup dan tidak berisi data toko.
