# 🚀 Panduan Menjalankan Bot dengan PM2

## Apa itu PM2?

PM2 adalah **Process Manager** untuk Node.js yang memungkinkan bot berjalan di background (bahkan setelah terminal ditutup) dan auto-restart jika crash.

---

## 📋 Perintah Dasar PM2

### 1. Mulai Bot (Background)

```bash
pm2 start ecosystem.config.js
```

**atau langsung:**

```bash
pm2 start index.js --name wa-bot
```

✅ Bot akan berjalan di background
✅ Terminal bisa ditutup, bot tetap jalan
✅ Auto-restart jika crash

---

### 2. Lihat Status Bot

```bash
pm2 list
```

atau detail:

```bash
pm2 status
```

---

### 3. Lihat Log Real-time

```bash
pm2 logs wa-bot
```

**Filter hanya error:**

```bash
pm2 logs wa-bot --err
```

**Log 100 baris terakhir:**

```bash
pm2 logs wa-bot --lines 100
```

---

### 4. Stop Bot

```bash
pm2 stop wa-bot
```

---

### 5. Restart Bot

```bash
pm2 restart wa-bot
```

**Restart dengan delay 3 detik:**

```bash
pm2 restart wa-bot --update-env
```

---

### 6. Hapus Bot dari PM2

```bash
pm2 delete wa-bot
```

---

### 7. Monitoring (Dashboard)

```bash
pm2 monit
```

Menampilkan:
- CPU usage
- Memory usage
- Log real-time

**Keluar:** Tekan `Ctrl+C`

---

## 🔥 Auto-Start Saat Windows Booting

### Setup PM2 Startup (Windows)

1. **Generate startup script:**

```bash
pm2 startup
```

2. **Salin command yang muncul** (contoh output):

```
pm2 startup windows -u Admin --hp C:\Users\Admin
```

3. **Jalankan command tersebut**

4. **Save daftar app:**

```bash
pm2 save
```

✅ Sekarang bot akan auto-start setiap Windows restart!

---

## 🛠️ Troubleshooting

### Bot tidak muncul di `pm2 list`

```bash
pm2 list
```

Jika kosong, start lagi:

```bash
pm2 start index.js --name wa-bot
```

---

### Bot crash terus

Cek log error:

```bash
pm2 logs wa-bot --err --lines 50
```

---

### Ingin restart ulang dari nol

```bash
pm2 delete wa-bot
pm2 start index.js --name wa-bot
```

---

### Bot tidak auto-restart

Pastikan `autorestart: true` di `ecosystem.config.js`:

```javascript
autorestart: true
```

---

## 📊 Perbandingan: Normal vs PM2

| Fitur | `node index.js` | `pm2 start index.js` |
|-------|-----------------|----------------------|
| Berjalan di background | ❌ | ✅ |
| Terminal bisa ditutup | ❌ | ✅ |
| Auto-restart jika crash | ❌ | ✅ |
| Monitoring CPU/Memory | ❌ | ✅ |
| Log management | ❌ | ✅ |
| Auto-start saat booting | ❌ | ✅ |

---

## 🌐 Akses dari Terminal Lain (di Luar VS Code)

### Windows PowerShell

```powershell
cd C:\Users\Admin\wa-bot
pm2 start index.js --name wa-bot
```

### Command Prompt (CMD)

```cmd
cd C:\Users\Admin\wa-bot
pm2 start index.js --name wa-bot
```

### Git Bash

```bash
cd /c/Users/Admin/wa-bot
pm2 start index.js --name wa-bot
```

✅ PM2 global, bisa diakses dari terminal mana saja!

---

## 💡 Tips & Tricks

### 1. Restart bot setiap hari jam 3 pagi (cron)

```bash
pm2 start index.js --name wa-bot --cron-restart="0 3 * * *"
```

### 2. Limit memory usage (auto-restart jika melebihi)

```bash
pm2 start index.js --name wa-bot --max-memory-restart 500M
```

### 3. Watch mode (auto-restart saat file berubah)

```bash
pm2 start index.js --name wa-bot --watch
```

⚠️ **Jangan gunakan `--watch` di production** (bot akan restart terus saat file berubah)

---

## 📝 Command Cheat Sheet

```bash
# Start
pm2 start index.js --name wa-bot

# Stop
pm2 stop wa-bot

# Restart
pm2 restart wa-bot

# Delete
pm2 delete wa-bot

# Logs
pm2 logs wa-bot

# Status
pm2 list

# Monitoring
pm2 monit

# Save (untuk auto-startup)
pm2 save

# Info detail
pm2 info wa-bot
```

---

## 🔗 Resources

- [PM2 Official Docs](https://pm2.keymetrics.io/)
- [PM2 Cheat Sheet](https://devhints.io/pm2)
