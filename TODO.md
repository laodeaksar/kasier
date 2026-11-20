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
- [x] Route manifest mencantumkan `/barang` dan `/barang-masuk`.
- [x] `pnpm typecheck` dan `pnpm build` berhasil.

Sebelum mencoba alur penuh, isi `.env` dengan `DATABASE_URL` Neon, jalankan migrasi, lalu jalankan seed akun pemilik. Fitur kasir/penjualan, utang, foto, dan katalog dikerjakan pada tahap berikutnya setelah persetujuan pemilik.
