# E-Commerce WhatsApp Bot - User Guide

Panduan lengkap menggunakan WhatsApp Bot untuk berbelanja online.

## 🛍️ Cara Berbelanja

### 1. Mulai Percakapan

Kirim pesan "HALO" atau "HELP" untuk memulai.

Bot akan menyapa dan memberikan menu.

### 2. Lihat Katalog Produk

```
KATALOG
```

Bot akan menampilkan daftar produk yang tersedia dengan:
- Nama produk
- Harga
- Stok tersedia
- Kode produk (SKU)

### 3. Lihat Berdasarkan Kategori

```
KATEGORI
```

Lihat semua kategori yang tersedia, lalu:

```
KATEGORI Pakaian
```

Untuk melihat produk di kategori tertentu.

### 4. Cari Produk

```
CARI kaos
```

Bot akan mencari produk yang cocok dengan kata kunci.

### 5. Lihat Detail Produk

```
PRODUK TSH001
```

Ganti `TSH001` dengan kode produk yang ingin dilihat.

Bot akan menampilkan:
- Nama lengkap
- Deskripsi
- Harga
- Stok
- Variasi (ukuran, warna, dll)

### 6. Tambah ke Keranjang

```
BELI TSH001 2
```

Format: `BELI <kode_produk> <jumlah>`

Bot akan konfirmasi produk berhasil ditambahkan.

### 7. Lihat Keranjang

```
KERANJANG
```

Bot menampilkan:
- Daftar item di keranjang
- Jumlah dan subtotal per item
- Total harga

### 8. Hapus Item dari Keranjang

```
HAPUS 1
```

Hapus item nomor 1 dari keranjang.

Atau kosongkan semua:
```
KOSONGKAN
```

### 9. Checkout (Proses Pemesanan)

```
CHECKOUT
```

Bot akan memandu proses checkout:

**Langkah 1:** Masukkan nama Anda
```
John Doe
```

**Langkah 2:** Masukkan alamat pengiriman lengkap
```
Jl. Sudirman No. 123, Jakarta Pusat 10110
```

**Langkah 3:** Konfirmasi pesanan

Bot menampilkan ringkasan pesanan. Ketik `YA` untuk konfirmasi atau `BATAL` untuk membatalkan.

```
YA
```

Bot akan membuat pesanan dan memberikan **Order ID**.

### 10. Cek Status Pesanan

```
CEK ORD-ABC123
```

Ganti dengan Order ID Anda. Bot menampilkan:
- Detail pesanan
- Status pengiriman
- Status pembayaran
- Nomor resi (jika sudah dikirim)

### 11. Lihat Riwayat Pesanan

```
PESANAN
```

Bot menampilkan semua pesanan Anda.

---

## 📋 Daftar Perintah Lengkap

### Katalog & Produk
| Perintah | Keterangan | Contoh |
|----------|------------|---------|
| `KATALOG` | Lihat semua produk | `KATALOG` |
| `KATEGORI` | Lihat kategori | `KATEGORI` |
| `KATEGORI <nama>` | Produk per kategori | `KATEGORI Pakaian` |
| `PRODUK <kode>` | Detail produk | `PRODUK TSH001` |
| `CARI <keyword>` | Cari produk | `CARI kaos hitam` |

### Keranjang & Pemesanan
| Perintah | Keterangan | Contoh |
|----------|------------|---------|
| `BELI <kode> <jumlah>` | Tambah ke keranjang | `BELI TSH001 2` |
| `KERANJANG` | Lihat keranjang | `KERANJANG` |
| `HAPUS <nomor>` | Hapus item | `HAPUS 1` |
| `KOSONGKAN` | Kosongkan keranjang | `KOSONGKAN` |
| `CHECKOUT` | Proses pemesanan | `CHECKOUT` |

### Pesanan
| Perintah | Keterangan | Contoh |
|----------|------------|---------|
| `CEK <order-id>` | Cek status pesanan | `CEK ORD-ABC123` |
| `PESANAN` | Riwayat pesanan | `PESANAN` |

### Lainnya
| Perintah | Keterangan | Contoh |
|----------|------------|---------|
| `HELP` | Tampilkan menu | `HELP` |
| `INFO` | Informasi toko | `INFO` |

---

## 💡 Tips Berbelanja

1. **Periksa stok** sebelum checkout - lihat detail produk
2. **Simpan Order ID** untuk tracking pesanan
3. **Hubungi admin** jika ada masalah dengan pesanan
4. **Ketik HELP** kapanpun untuk melihat menu

---

## 💳 Pembayaran

Metode pembayaran yang tersedia:
- **Transfer Bank** (BCA, Mandiri, BNI, BRI)
- **E-Wallet** (OVO, GoPay, DANA, ShopeePay)
- **COD** (Cash on Delivery - area tertentu)

Detail pembayaran akan dikirimkan setelah checkout.

---

## 🚚 Pengiriman

Kurir yang tersedia:
- JNE
- J&T Express
- SiCepat
- Grab/Gojek (area tertentu)

Ongkos kirim dihitung berdasarkan alamat pengiriman.

---

## 📞 Customer Service

Jika ada pertanyaan atau masalah:
- Balas langsung di chat ini
- Email: support@yourdomain.com
- Jam operasional: 08:00 - 22:00 WIB

---

## ❓ FAQ

**Q: Apakah bisa ganti/batalkan pesanan?**
A: Hubungi CS segera setelah order dibuat. Pembatalan hanya bisa dilakukan sebelum pesanan diproses.

**Q: Berapa lama pengiriman?**
A: Tergantung kurir dan lokasi. Estimasi 2-5 hari kerja untuk Jabodetabek, 3-7 hari untuk luar pulau.

**Q: Bagaimana cara cek resi?**
A: Ketik `CEK <order-id>`. Nomor resi akan muncul setelah pesanan dikirim.

**Q: Apakah ada garansi?**
A: Ya, semua produk bergaransi sesuai ketentuan. Hubungi CS untuk klaim garansi.

**Q: Bisa minta warna/ukuran lain?**
A: Lihat variasi produk di detail produk. Jika tidak tersedia, hubungi CS untuk request.

---

**Selamat Berbelanja! 🛒**
