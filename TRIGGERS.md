# 🤖 Sistem Trigger Dinamis - WhatsApp Bot

## Fitur Utama

✅ **Hot Reload** - Edit `triggers.json` tanpa restart bot  
✅ **3 Tipe Trigger** - Commands, Keywords, Patterns  
✅ **Dynamic Responses** - Support respons dinamis (waktu, dll)  
✅ **Multi-language** - Support trigger dalam bahasa apapun  
✅ **Easy to Maintain** - Tanpa edit code, cukup edit JSON  

---

## Cara Menambah Trigger Baru

### 1. **Command Trigger** (Exact Match)
Untuk perintah yang harus match persis (case-insensitive).

```json
{
  "trigger": ["/halo", "/hello"],
  "type": "exact",
  "response": "Halo! Apa kabar? 😊"
}
```

**Contoh penggunaan:**
- User: `/halo` → Bot: "Halo! Apa kabar? 😊"
- User: `/HELLO` → Bot: "Halo! Apa kabar? 😊"
- User: `halo` → Bot: (diam, tidak cocok)

---

### 2. **Keyword Trigger** (Contains Match)
Untuk kata kunci yang ada di dalam pesan.

```json
{
  "trigger": ["promo", "diskon", "sale"],
  "type": "contains",
  "response": "🎉 Promo spesial hari ini! Diskon 50%"
}
```

**Contoh penggunaan:**
- User: `ada promo?` → Bot: "🎉 Promo spesial..."
- User: `mau tanya diskon` → Bot: "🎉 Promo spesial..."
- User: `kapan sale?` → Bot: "🎉 Promo spesial..."

---

### 3. **Pattern Trigger** (Regex Match)
Untuk pola kompleks dengan regex.

```json
{
  "trigger": "^/nama\\s+(.+)$",
  "type": "regex",
  "handler": "custom"
}
```

---

## Dynamic Responses

### Time Response
```json
{
  "trigger": ["/waktu", "/time"],
  "type": "exact",
  "response": "dynamic:time"
}
```

Output: `⏰ Waktu sekarang: Rabu, 20 November 2025 20:30:45`

### Custom Handler
Untuk logic khusus, tambahkan di `index.js`:

```javascript
// Dalam loop pattern matching
if (pattern.handler === 'nama') {
    const nama = match[1];
    msg.reply(`Halo ${nama}! Senang berkenalan denganmu 👋`);
}
```

---

## Contoh Trigger Lengkap

### Trigger Customer Service
```json
{
  "keywords": [
    {
      "trigger": ["jam buka", "jam operasional", "buka jam berapa"],
      "type": "contains",
      "response": "🕐 Jam Operasional:\nSenin-Jumat: 08:00-17:00\nSabtu: 08:00-12:00\nMinggu: Tutup"
    },
    {
      "trigger": ["lokasi", "alamat", "dimana"],
      "type": "contains",
      "response": "📍 Alamat Kami:\nJl. Contoh No. 123, Jakarta\n\nMaps: https://maps.google.com/..."
    },
    {
      "trigger": ["kontak", "telepon", "whatsapp", "hubungi"],
      "type": "contains",
      "response": "📞 Hubungi Kami:\nTelepon: 021-1234567\nWhatsApp: 0812-3456-7890\nEmail: info@contoh.com"
    }
  ]
}
```

### Trigger E-commerce
```json
{
  "keywords": [
    {
      "trigger": ["cara order", "cara pesan", "gimana beli"],
      "type": "contains",
      "response": "🛒 Cara Order:\n1. Pilih produk\n2. Kirim kode produk\n3. Konfirmasi pembayaran\n4. Barang dikirim\n\nKetik /katalog untuk lihat produk"
    },
    {
      "trigger": ["ongkir", "ongkos kirim", "biaya kirim"],
      "type": "contains",
      "response": "🚚 Ongkos Kirim:\n- Jakarta: Gratis\n- Luar Jakarta: Rp 15.000\n- Luar Jawa: Mulai Rp 30.000"
    },
    {
      "trigger": ["pembayaran", "cara bayar", "payment"],
      "type": "contains",
      "response": "💳 Metode Pembayaran:\n- BCA: 1234567890\n- Mandiri: 0987654321\n- GoPay/OVO: 0812-3456-7890\n- COD (Jakarta only)"
    }
  ]
}
```

---

## Tips Optimasi

### ✅ DO:
- Gunakan **command** untuk perintah utama (`/help`, `/info`)
- Gunakan **keyword** untuk pertanyaan umum (`apa kabar`, `terima kasih`)
- Gunakan **pattern** hanya untuk logic kompleks
- Prioritas: Command → Keyword → Pattern
- Trigger lebih spesifik di atas, general di bawah

### ❌ DON'T:
- Jangan buat trigger yang terlalu umum (misal: "a", "i")
- Jangan gunakan regex jika bisa pakai exact/contains
- Jangan duplikat trigger yang sama
- Jangan lupa tambahkan emoji untuk UI lebih menarik

---

## Testing Trigger

```bash
# Restart bot (opsional, bot sudah auto-reload)
pm2 restart wa-bot

# Monitor logs real-time
pm2 logs wa-bot

# Test trigger yang sudah ditambahkan via WhatsApp
```

**Output log:**
```
✅ Triggers loaded: { commands: 5, keywords: 12, patterns: 2 }
📩 628xxx: /help
📩 628xxx: apa kabar
⚠️ Tidak ada trigger yang cocok
```

---

## Struktur `triggers.json`

```json
{
  "commands": [
    // Exact match commands (case-insensitive)
    { "trigger": ["/cmd"], "type": "exact", "response": "text" }
  ],
  "keywords": [
    // Contains match keywords
    { "trigger": ["kata"], "type": "contains", "response": "text" }
  ],
  "patterns": [
    // Regex patterns with custom handlers
    { "trigger": "regex", "type": "regex", "handler": "nama_handler" }
  ]
}
```

---

## Hot Reload

Bot akan **otomatis reload** setiap kali `triggers.json` diubah:

```bash
# Edit file
nano triggers.json

# Save file (Ctrl+O, Enter, Ctrl+X)
# Bot akan otomatis reload dalam 1-2 detik
```

**Log output:**
```
🔄 Triggers file changed, reloading...
✅ Triggers loaded: { commands: 6, keywords: 10, patterns: 2 }
```

**Tidak perlu restart PM2!** ⚡

---

## Command List (Default)

| Command | Deskripsi |
|---------|-----------|
| `/help` atau `/menu` | Tampilkan daftar command |
| `/info` | Informasi tentang bot |
| `/ping` | Cek status bot |
| `/waktu` atau `/time` | Tampilkan waktu sekarang |
| `/hitung <expr>` | Kalkulator matematika |
| `<angka>` | Auto-calculate (15+25) |

## Keyword List (Default)

| Keyword | Deskripsi |
|---------|-----------|
| siapa kamu, kamu siapa | Perkenalan bot |
| apa kabar | Sapaan |
| terima kasih, thanks | Ucapan terima kasih |
| halo, hai, hi | Sapaan umum |
| selamat pagi/siang/malam | Sapaan waktu |
| assalamualaikum | Sapaan islami |

---

## Troubleshooting

### Trigger tidak bekerja?
1. Cek format JSON di https://jsonlint.com/
2. Pastikan tidak ada typo di field `trigger`, `type`, `response`
3. Cek logs: `pm2 logs wa-bot`
4. Restart manual: `pm2 restart wa-bot`

### Bot tidak auto-reload?
- File watcher kadang tidak bekerja di Windows
- Solusi: restart manual `pm2 restart wa-bot`

### Trigger bentrok?
- Command diproses duluan, lalu keyword, terakhir pattern
- Pastikan trigger tidak overlap (contoh: jangan buat command `/help` dan keyword "help")

---

## Backup & Version Control

```bash
# Backup triggers
cp triggers.json triggers.backup.json

# Commit to git
git add triggers.json
git commit -m "Update triggers"
git push
```

---

**Happy Chatting!** 🤖💬
