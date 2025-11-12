# 🔒 Keamanan & Privacy untuk Bot WhatsApp

## File/Folder yang WAJIB ada di `.gitignore`

Berikut adalah daftar file dan folder yang **TIDAK BOLEH** di-push ke GitHub karena berisi data sensitif:

### 1. **Session Data (WAJIB!)**
```
.wwebjs_auth/           # Session WhatsApp (whatsapp-web.js)
.wwebjs_cache/          # Cache browser Puppeteer
auth_info_baileys/      # Session WhatsApp (Baileys)
```
**Mengapa?** Berisi token autentikasi WhatsApp Anda. Jika bocor, orang lain bisa mengakses akun WhatsApp Anda!

### 2. **Dependencies**
```
node_modules/           # Library/package yang diinstall
```
**Mengapa?** Besar (ratusan MB), bisa di-install ulang dengan `npm install`.

### 3. **Environment Variables**
```
.env                    # File konfigurasi rahasia
.env.local
.env.production
```
**Mengapa?** Berisi API key, password database, secret key, dll.

### 4. **Logs**
```
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pm2/                   # PM2 logs
```
**Mengapa?** Bisa berisi informasi sensitif dari runtime.

### 5. **OS Files**
```
.DS_Store               # macOS
Thumbs.db               # Windows
Desktop.ini             # Windows
```
**Mengapa?** File sistem yang tidak diperlukan.

### 6. **IDE Files**
```
.vscode/                # VS Code settings
.idea/                  # JetBrains IDE
*.swp, *.swo, *~        # vim/emacs temp files
```
**Mengapa?** Konfigurasi editor pribadi.

### 7. **Backup Files**
```
*.bak
*.backup
index.baileys.js        # Backup dari migrasi
```
**Mengapa?** Tidak perlu di-share, bisa recovery dari git history.

### 8. **Cache**
```
.cache/
```
**Mengapa?** File temporary yang bisa di-generate ulang.

---

## ✅ Checklist Sebelum Push ke GitHub

- [ ] `.gitignore` sudah lengkap dan benar
- [ ] Jalankan: `git status` - pastikan tidak ada file `.wwebjs_auth/` atau `.env`
- [ ] Hapus file sensitif dari tracking: `git rm -r --cached .wwebjs_auth`
- [ ] **JANGAN** commit file `.env` atau session data
- [ ] **JANGAN** hardcode password/API key di kode

---

## 🚨 Apa yang Terjadi Jika Session Bocor?

Jika folder `.wwebjs_auth/` atau `auth_info_baileys/` bocor ke GitHub:
1. ❌ Orang lain bisa login sebagai Anda di WhatsApp
2. ❌ Bisa mengirim pesan atas nama Anda
3. ❌ Bisa membaca semua chat Anda
4. ❌ Akun WhatsApp Anda bisa di-banned

**Solusi jika sudah terlanjur:**
1. Hapus repository GitHub (jika sudah di-push)
2. Logout dari WhatsApp Web di HP Anda
3. Hapus folder session lokal
4. Login ulang dengan QR code baru

---

## 📝 Cara Menggunakan `.env` untuk Data Sensitif

Jika Anda punya API key atau password, simpan di file `.env`:

```env
# .env (JANGAN PUSH KE GITHUB!)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
DATABASE_PASSWORD=rahasia123
ADMIN_PHONE=628xxxxxxxxxx
```

Lalu load di kode dengan `dotenv`:
```bash
npm install dotenv
```

```javascript
require('dotenv').config();
const apiKey = process.env.OPENAI_API_KEY;
```

Buat template `.env.example` untuk dokumentasi (tanpa value asli):
```env
# .env.example (BOLEH DI-PUSH)
OPENAI_API_KEY=your_api_key_here
DATABASE_PASSWORD=your_password_here
ADMIN_PHONE=62xxx
```

---

## 🔐 Best Practices

1. ✅ **Selalu** cek `.gitignore` sebelum commit pertama
2. ✅ **Jangan** hardcode password/API key di kode
3. ✅ **Gunakan** environment variables (`.env`)
4. ✅ **Review** file yang akan di-commit dengan `git status`
5. ✅ **Hapus** session data dari tracking jika terlanjur ter-commit

---

## 📚 Referensi

- [GitHub .gitignore Templates](https://github.com/github/gitignore)
- [dotenv Documentation](https://www.npmjs.com/package/dotenv)
- [WhatsApp Web.js Security](https://wwebjs.dev/guide/authentication.html)
