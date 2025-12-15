# 🤖 WhatsApp Bot Nanda Motor - E-commerce & Live Chat

Bot WhatsApp terintegrasi dengan website Nanda Motor untuk:
- 🛒 **E-commerce via WhatsApp** (Katalog produk, pemesanan, checkout)
- 💬 **Web Live Chat** (Customer website → WhatsApp admin)
- 📊 **MySQL Database** (Shared dengan website)
- 🔄 **Auto-Recovery** (QR code auto-generate saat session error)

---

## 📋 Table of Contents

- [Fitur](#-fitur)
- [Quick Start](#-quick-start)
- [Cara Menggunakan Bot](#-cara-menggunakan-bot)
- [Web Live Chat](#-web-live-chat)
- [Integrasi Website](#-integrasi-website)
- [Auto-Recovery](#-auto-recovery)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Fitur

### E-commerce WhatsApp
- 📦 **KATALOG** - Lihat semua produk dengan harga dan stok
- 🛍️ **BELI** - Tambah produk ke keranjang
- 🛒 **KERANJANG** - Lihat isi keranjang belanja
- ✅ **CHECKOUT** - Proses pemesanan multi-step
- 📍 **Status Pesanan** - Tracking otomatis

### Web Live Chat
- 💬 Customer chat dari website langsung muncul di WhatsApp admin
- 🔔 Notifikasi real-time ke admin WhatsApp
- 💾 Riwayat chat tersimpan di database
- 👨‍💼 Admin bisa reply via admin panel website

### Technical Features
- 🗄️ Dual Mode: **JSON** (standalone) atau **MySQL** (integrated)
- 🔄 Auto-restart saat session error/logout
- 🌐 Web interface untuk scan QR code
- 📡 REST API untuk integrasi website
- 🔐 Webhook dengan secret validation
- 📊 Session management & statistics

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v16+
- MySQL 5.7+ (untuk mode integrated)
- WhatsApp aktif di smartphone

### 2. Installation

```bash
# Clone repository
git clone https://github.com/MuhRifa2024/wa-bot.git
cd wa-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env sesuai kebutuhan
notepad .env
```

### 3. Konfigurasi `.env`

```env
# Mode: 'json' atau 'mysql'
DB_MODE=mysql

# Bot Settings
BOT_PORT=5000
ADMIN_WHATSAPP=6289637454341

# MySQL (jika DB_MODE=mysql)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=nanda_motor_db

# Webhook Security
WEBHOOK_SECRET=sLUB3cnOW5Vwj2yGlMPKRykryokyp0j0
```

### 4. Jalankan Bot

**Development Mode** (auto-restart):
```bash
npm run dev
```

**Production Mode**:
```bash
npm run pm2-start
```

### 5. Scan QR Code

1. Buka browser: **http://localhost:5000**
2. Scan QR code dengan WhatsApp
3. ✅ Bot siap digunakan!

---

## 📱 Cara Menggunakan Bot

### Perintah E-commerce

**1. KATALOG** - Lihat Produk
```
Customer: KATALOG
Bot: 📦 KATALOG PRODUK NANDA MOTOR
     1. Oli MPX 2 - Rp 55000 (Stock: 20)
     2. Ban Motor Merk X - Rp 150000 (Stock: 15)
```

**2. BELI** - Tambah ke Keranjang
```
Customer: BELI 1 2
Bot: ✅ Berhasil menambahkan:
     • Oli MPX 2 (2 pcs) - Rp 110000
```

**3. KERANJANG** - Lihat Isi
```
Customer: KERANJANG
Bot: 🛒 ISI KERANJANG
     1. Oli MPX 2 (2 pcs) - Rp 110000
     Total: Rp 110000
```

**4. CHECKOUT** - Proses Pesanan
```
Customer: CHECKOUT
Bot: 📋 Checkout - Step 1/4
     Silakan masukkan nama lengkap:

Customer: John Doe
Bot: 📋 Checkout - Step 2/4
     Silakan masukkan alamat pengiriman:
```

**5. HELP** - Panduan Lengkap
```
Customer: HELP
Bot: 📖 PANDUAN BOT NANDA MOTOR
     • KATALOG - Lihat produk
     • BELI [id] [qty] - Tambah ke keranjang
     ...
```

---

## 💬 Web Live Chat

### Cara Kerja

1. **Customer kirim pesan dari website** → Bot terima
2. **Bot forward ke WhatsApp admin** → Admin dapat notifikasi
3. **Admin reply via panel** → Customer terima di website

### Format Pesan ke Admin

```
🌐 LIVE CHAT WEBSITE
━━━━━━━━━━━━━━━━━━━━

👤 Nama: John Doe
📧 Email: john@email.com
📱 Phone: 08123456789
🆔 Session: web-chat-1734249600
🕒 Waktu: 15 Dec 2025, 10:30

💬 Pesan:
Halo, saya mau tanya harga oli untuk motor matic

━━━━━━━━━━━━━━━━━━━━
Reply via admin panel website untuk membalas customer
```

### Integrasi Widget di Website

Tambahkan di file HTML website:

```html
<!-- Live Chat Widget -->
<div id="chat-widget">
  <button id="chat-toggle">💬 Chat</button>
  <div id="chat-box" style="display:none;">
    <div id="chat-header">
      Chat Nanda Motor
      <button id="chat-close">×</button>
    </div>
    <div id="chat-messages"></div>
    <div id="chat-input">
      <input type="text" id="message-input" placeholder="Ketik pesan...">
      <button id="send-btn">Kirim</button>
    </div>
  </div>
</div>

<script>
const BOT_API = 'http://localhost:5000';
const sessionId = 'web-chat-' + Date.now();

document.getElementById('send-btn').onclick = async () => {
  const message = document.getElementById('message-input').value;
  
  await fetch(BOT_API + '/webhook/web-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message,
      customerName: 'Customer Name',
      customerEmail: 'email@example.com'
    })
  });
  
  document.getElementById('message-input').value = '';
};
</script>
```

---

## 🔗 Integrasi Website

### Backend Integration (server.js)

Tambahkan routes di backend website Nanda Motor:

```javascript
const axios = require('axios');
const BOT_API_URL = 'http://localhost:5000';

// Proxy WhatsApp Chat API
app.get('/api/whatsapp/chats', async (req, res) => {
  const response = await axios.get(`${BOT_API_URL}/api/chats`);
  res.json(response.data);
});

app.post('/api/whatsapp/send-message', async (req, res) => {
  const response = await axios.post(
    `${BOT_API_URL}/webhook/send-message`,
    req.body
  );
  res.json(response.data);
});

// Web Live Chat API
app.post('/api/web-chat/send', async (req, res) => {
  const response = await axios.post(
    `${BOT_API_URL}/webhook/web-chat`,
    req.body
  );
  res.json(response.data);
});

app.get('/api/web-chats', async (req, res) => {
  const response = await axios.get(`${BOT_API_URL}/api/web-chats`);
  res.json(response.data);
});
```

### Database Sharing

Bot dan website menggunakan database MySQL yang sama:

**Database:** `nanda_motor_db`

**Tables:**
- `whatsapp_chats` - Riwayat chat WhatsApp e-commerce
- `orders` - Data pesanan
- `whatsapp_customers` - Data customer
- `shopping_carts` - Keranjang belanja temporary
- `checkout_sessions` - Session checkout multi-step
- `web_chats` - Riwayat live chat dari website

---

## 🔄 Auto-Recovery

Bot dilengkapi auto-recovery untuk handle error dan disconnect:

### Skenario 1: Logout dari WhatsApp

```
⚠️  Bot terputus: LOGOUT
🔄 Mendeteksi logout, menghapus session untuk QR baru...
✅ Session folder dihapus
⏳ Restarting dalam 2 detik...
📱 QR CODE tersedia di browser: http://localhost:5000
```

### Skenario 2: Session Corrupt

```
❌ Autentikasi gagal: [error]
🔄 Menghapus session dan restart untuk generate QR baru...
✅ Session folder dihapus
✅ Cache folder dihapus
⏳ Restarting dalam 3 detik...
```

### Fitur Auto-Recovery
- ✅ Auto-delete session saat error
- ✅ Auto-restart dengan nodemon/PM2
- ✅ Generate QR code baru otomatis
- ✅ No manual intervention needed

**Tidak perlu lagi:**
```bash
# Tidak perlu manual lagi!
Remove-Item -Recurse -Force .wwebjs_auth
npm start
```

---

## 🚢 Deployment

### Production dengan PM2

**1. Install PM2 globally:**
```bash
npm install -g pm2
```

**2. Start bot:**
```bash
npm run pm2-start
```

**3. Monitoring:**
```bash
pm2 status        # Cek status
pm2 logs wa-bot   # Lihat logs
pm2 monit         # Real-time monitoring
```

**4. Auto-start on boot:**
```bash
pm2 startup
pm2 save
```

### Environment Variables Production

```env
# Production settings
DB_MODE=mysql
BOT_PORT=5000
NODE_ENV=production

# MySQL Production
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_USER=production_user
DB_PASSWORD=strong_password
DB_NAME=nanda_motor_db

# Security
WEBHOOK_SECRET=change-this-to-random-string

# Admin WhatsApp
ADMIN_WHATSAPP=6289637454341
```

### Deployment Checklist

- [ ] Update `.env` dengan credentials production
- [ ] Test koneksi MySQL production
- [ ] Configure firewall (allow port 5000)
- [ ] Setup reverse proxy (Nginx/Apache)
- [ ] Enable SSL/HTTPS
- [ ] Configure PM2 auto-restart
- [ ] Setup backup database
- [ ] Monitor logs dan performance

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### Products
```http
GET /api/products
```

#### WhatsApp Chats
```http
GET /api/chats
GET /api/chats/:customerId
POST /webhook/send-message
```

#### Orders
```http
GET /api/orders
GET /api/orders/:orderId
POST /webhook/update-order
```

#### Web Live Chat
```http
POST /webhook/web-chat
GET /api/web-chats
GET /api/web-chats/:sessionId
POST /api/web-chats/:sessionId/reply
POST /api/web-chats/:sessionId/read
GET /api/web-chats/stats/summary
```

#### Health Check
```http
GET /api/health
```

**Response Example:**
```json
{
  "status": "ok",
  "mode": "mysql",
  "whatsapp": "connected",
  "database": "connected",
  "uptime": 3600,
  "features": {
    "ecommerce": true,
    "webChat": true,
    "autoRecovery": true
  }
}
```

---

## 🛠️ Troubleshooting

### QR Code tidak muncul?

**Solusi:**
```bash
# Stop semua proses node
Stop-Process -Name node -Force

# Hapus session
Remove-Item -Recurse -Force .wwebjs_auth, .wwebjs_cache

# Start ulang
npm run dev
```

### Bot tidak konek MySQL?

**Check:**
1. MySQL service running: `mysql -u root -p`
2. Database exists: `SHOW DATABASES;`
3. User permissions: `GRANT ALL ON nanda_motor_db.* TO 'root'@'localhost';`
4. `.env` credentials benar

### Web chat tidak sampai ke admin?

**Check:**
1. `ADMIN_WHATSAPP` di `.env` benar (format: 6289637454341)
2. Bot sudah terkoneksi WhatsApp (scan QR)
3. Admin WhatsApp number aktif

### Auto-recovery tidak jalan?

**Check:**
1. Menggunakan `npm run dev` (nodemon) atau PM2
2. Bukan `npm start` (tidak auto-restart)

---

## 📚 Struktur Project

```
wa-bot/
├── index.js                 # Main entry point
├── package.json            # Dependencies & scripts
├── .env                    # Environment variables
├── .env.example            # Template environment
├── nodemon.json            # Nodemon config
├── ecosystem.config.js     # PM2 config
│
├── lib/
│   ├── database/
│   │   ├── DatabaseFactory.js    # DB mode switching
│   │   └── MySQLAdapter.js       # MySQL connection
│   │
│   ├── services/
│   │   ├── ProductServiceV2.js   # Product management
│   │   ├── OrderService.js       # Order processing
│   │   ├── CustomerService.js    # Customer data
│   │   ├── ChatService.js        # WhatsApp chat
│   │   └── WebChatService.js     # Web live chat
│   │
│   ├── handlers/
│   │   └── EcommerceHandlers.js  # Chat handlers
│   │
│   ├── models/
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Customer.js
│   │   └── Cart.js
│   │
│   └── utils/
│       ├── WebhookHandler.js     # API routes
│       └── MessageParser.js      # Parse commands
│
└── data/
    ├── products.json        # Products (JSON mode)
    ├── orders.json          # Orders (JSON mode)
    ├── customers.json       # Customers (JSON mode)
    └── chats.json          # Chats (JSON mode)
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 👨‍💻 Developer

**Nanda Motor Development Team**
- GitHub: [@MuhRifa2024](https://github.com/MuhRifa2024)
- Repository: [wa-bot](https://github.com/MuhRifa2024/wa-bot)

---

## 📞 Support

Need help? 
- 📧 Email: support@nandamotor.com
- 💬 WhatsApp: +62 896-3745-4341
- 🌐 Website: [nandamotor.github.io](https://nandamotor.github.io)

---

**Made with ❤️ for Nanda Motor**
