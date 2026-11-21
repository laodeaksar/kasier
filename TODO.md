# TODO Tahap 2 — Kasier AR Shop

- [x] Daftar barang dapat dilihat oleh kasir dan pemilik setelah login.
- [x] Pemilik dapat menambah barang dengan nama, satuan, harga beli, dan harga jual.
- [x] Barang baru dimulai dengan stok 0 dan belum mengubah pengaturan katalog.
- [x] Pemilik dapat mengubah harga beli dan harga jual melalui server.
- [x] Kasir tidak dapat menambah barang atau mengubah harga karena role dicek di server.
- [x] Form produk memakai Formisch dan schema Valibot bersama dengan API.
- [x] Kasir dan pemilik dapat mencatat barang masuk dengan barang, jumlah, harga beli, dan tanggal.
- [x] Pencatatan barang masuk menyimpan riwayat dan menambah stok dalam satu transaksi database.
- [x] Riwayat barang masuk menampilkan barang, jumlah, harga beli, tanggal, dan pencatat.
- [x] Halaman Daftar Barang dan Barang Masuk responsif untuk HP dan desktop.
- [x] Daftar barang desktop menggunakan TanStack Table dan menampilkan nama, satuan, harga beli, harga jual, serta stok; layar kecil tetap memakai kartu yang mudah dibaca.
- [x] Halaman Kelola Akun khusus pemilik dapat membuat akun kasir melalui Better Auth; akun baru mendapat peran kasir.
- [x] API daftar dan pembuatan akun kasir memeriksa peran pemilik di server; pendaftaran umum tetap dinonaktifkan.
- [x] Route manifest mencantumkan `/barang` dan `/barang-masuk`.
- [x] Route manifest juga mencantumkan `/akun`.
- [x] `pnpm typecheck` dan `pnpm build` berhasil.

Migrasi database telah dijalankan pada database kosong yang diberikan dan tabel Tahap 1 tersedia. Akun pemilik belum dibuat dan proses login belum dapat dicoba karena `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_EMAIL`, `OWNER_PASSWORD`, dan `OWNER_NAME` tidak diberikan. Fitur kasir/penjualan, utang, foto, dan katalog tetap di luar tahap ini.
