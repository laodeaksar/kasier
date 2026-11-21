# TODO Tahap 3 — Kasier AR Shop

## Tahap 2 — Barang, stok masuk, dan akun kasir (selesai)

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
- [x] Route manifest mencantumkan `/barang`, `/barang-masuk`, dan `/akun`.
- [x] Pemeriksaan TypeScript dan build aplikasi berhasil pada pengerjaan Tahap 2.

Migrasi database Tahap 1 sudah dijalankan pada database kosong yang disediakan. Kredensial akun pemilik dan URL Better Auth belum tersedia untuk uji login.

## Tahap 3 — Kasir dan pemblokiran stok tidak cukup (selesai)

- [x] Halaman `/kasir` hanya dapat dipakai pengguna yang sudah login dengan peran kasir atau pemilik; halaman menyediakan pilihan barang dan jumlah.
- [x] Keranjang disimpan di TanStack Store, jumlah dapat diubah atau barang dihapus, dan total ditampilkan otomatis.
- [x] Kasir dapat memilih pembayaran **Lunas** atau **Utang**. Jika memilih Utang, form nama dan kontak pembeli wajib diisi dan disimpan bersama transaksi; pencatatan saldo utang penuh dan pembayaran utang tetap ditunda ke Tahap 4.
- [x] Server mengambil harga jual terkini dari database dan menghitung ulang subtotal tiap barang serta total; server tidak mempercayai harga atau total yang dikirim dari layar.
- [x] Subtotal tiap baris yang memiliki pecahan Rupiah dibulatkan ke Rupiah terdekat sebelum subtotal baris dijumlahkan menjadi total.
- [x] Simpan penjualan, item transaksi, dan pengurangan stok dalam satu transaksi database; kegagalan salah satu bagian membatalkan semuanya.
- [x] Jika stok suatu barang tidak cukup, tolak seluruh transaksi dan tampilkan pesan yang menyebut barang yang stoknya kurang; stok tidak boleh negatif.
- [x] Pengecekan stok harus aman untuk dua kasir yang menjual barang sama secara bersamaan; pembaruan stok dilakukan atomik di database dan baris barang ganda pada permintaan digabungkan sebelum pengecekan.
- [x] Salin harga jual yang berlaku saat transaksi ke setiap item transaksi supaya perubahan harga berikutnya tidak mengubah riwayat transaksi.
- [x] Jalur `/kasir` tercantum di route manifest dan navigasi aplikasi.
- [x] Belum ada pembuatan tabel/riwayat saldo utang, pembayaran utang, pembatalan penjualan, struk, laporan, atau fitur Tahap 4 dan seterusnya.

Typecheck, build, validasi manifest, dan uji unit pembulatan/schema berhasil. Transaksi database dan persaingan kasir belum diuji dengan menulis ke database bersama; logika Drizzle/PostgreSQL diperiksa dari kode.
