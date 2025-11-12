# 🤖 WhatsApp Bot

Bot WhatsApp sederhana yang dapat menjawab sapaan dan melakukan perhitungan matematika menggunakan **whatsapp-web.js**.

## ✨ Fitur

- 🤖 Bot WhatsApp otomatis
- 🧮 Kalkulator matematika (mendukung +, -, *, /, √, ², x)
- 👋 Respons sapaan otomatis
- 📱 QR Code dinamis (terminal & browser)
- 🌐 Web server untuk scan QR
- 💾 Session tersimpan otomatis (tidak perlu scan QR berulang)

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v16+ 
- npm atau yarn
- Koneksi internet stabil

### Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/MuhRifa2024/wa-bot.git
   cd wa-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Jalankan bot:**
   ```bash
   node index.js
   ```

4. **Scan QR Code:**
   - **Di Terminal:** QR muncul otomatis (ASCII art)
   - **Di Browser:** Buka `http://localhost:3000`

5. **Bot siap digunakan!** 🎉

## 📱 Cara Menggunakan

### Scan QR Code

1. Jalankan bot dengan `node index.js`
2. Buka WhatsApp di HP Anda
3. Tap menu ⋮ → **Linked Devices** → **Link a Device**
4. Scan QR code yang muncul di terminal atau browser
5. Bot akan otomatis terkoneksi

### Perintah Bot

Bot akan merespons pesan berikut:

| Pesan | Respons |
|-------|---------|
| `halo`, `hai`, `hi`, `p` | `Hai juga` |
| `siapa kamu` | `I am a king of the kingdom, the bot that rules the chat!` |
| `saya ingin pesan` | `pesan apa? pesan cinta?` |
| `12+12` | `Hasil: 24` |
| `√25` | `Hasil: 5` |
| `5²+3²` | `Hasil: 34` |
| `12x2` | `Hasil: 24` |

## 🔧 Konfigurasi

### Port Server (Optional)

Jika ingin mengubah port server web (default: 3000), edit `index.js`:

```javascript
app.listen(3000, '0.0.0.0', () => {
    console.log('Server web berjalan di http://localhost:3000');
});
```

### Headless Browser (Optional)

Jika ingin melihat browser Puppeteer (untuk debug), ubah `headless: true` menjadi `headless: false`:

```javascript
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,  // Browser akan terlihat
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});
```

## 🛠️ Troubleshooting

### QR Code tidak muncul

1. Pastikan port 3000 tidak digunakan aplikasi lain
2. Nonaktifkan firewall/antivirus sementara
3. Coba gunakan hotspot HP sebagai koneksi internet
4. Tunggu 1-3 menit untuk Puppeteer selesai launch

### Bot terputus terus

1. Pastikan koneksi internet stabil
2. Jangan login WhatsApp Web di device lain dengan nomor yang sama
3. Jangan spam reconnect (tunggu beberapa menit antar percobaan)

### Session expired

1. Hapus folder `.wwebjs_auth`:
   ```bash
   rm -rf .wwebjs_auth
   ```
2. Jalankan ulang bot dan scan QR lagi

### Bot tidak membalas pesan

1. Pastikan bot sudah menampilkan "Bot terkoneksi ke WhatsApp"
2. Cek log terminal untuk error
3. Pastikan pesan tidak dari grup (bot hanya membalas chat pribadi)

## 📁 Struktur File

```
wa-bot/
├── index.js              # Main bot file (whatsapp-web.js)
├── index.baileys.js      # Backup (Baileys version)
├── package.json          # Dependencies
├── .gitignore            # Files to ignore
├── README.md             # This file
├── SECURITY.md           # Security guidelines
├── .wwebjs_auth/         # Session data (JANGAN PUSH!)
└── node_modules/         # Dependencies (JANGAN PUSH!)
```

## 🔒 Keamanan

**PENTING:** Jangan push file/folder berikut ke GitHub:
- `.wwebjs_auth/` - Berisi session WhatsApp Anda
- `.wwebjs_cache/` - Cache browser
- `.env` - Environment variables (jika ada)

Baca [`SECURITY.md`](SECURITY.md) untuk panduan lengkap.

## 🚀 Deploy ke Server/VPS

### Menggunakan PM2 (Recommended)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Jalankan bot dengan PM2:**
   ```bash
   pm2 start index.js --name wa-bot
   ```

3. **Auto-start saat server reboot:**
   ```bash
   pm2 startup
   pm2 save
   ```

4. **Monitoring:**
   ```bash
   pm2 list
   pm2 logs wa-bot
   pm2 monit
   ```

### Deploy ke Railway/Render (Free)

1. Push code ke GitHub
2. Hubungkan repository ke Railway/Render
3. Deploy otomatis akan berjalan
4. Akses web server untuk scan QR

**Catatan:** Beberapa platform free tier mungkin suspend app jika tidak ada aktivitas.

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 License

ISC

## 👤 Author

**MuhRifa2024**

- GitHub: [@MuhRifa2024](https://github.com/MuhRifa2024)

## 🙏 Credits

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API
- [mathjs](https://mathjs.org/) - Math library
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) - QR code generator
