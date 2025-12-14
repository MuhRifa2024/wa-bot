# WhatsApp Bot E-commerce - Integrasi Website Nanda Motor

Bot WhatsApp e-commerce lengkap yang **siap diintegrasikan** ke website [Nanda Motor](https://github.com/NandaMotor/nandamotor.github.io).

## 🎯 Highlight

- ✅ **Plug & Play** - Bot existing, tidak perlu code baru
- ✅ **Dual Mode** - Standalone (JSON) atau Integrated (MySQL)
- ✅ **Auto-Sync** - Products sync otomatis dengan database website
- ✅ **Two-Way Chat** - Chat customer di WA ↔️ website admin
- ✅ **Web Live Chat** - Chat customer di website → WA admin (NEW!)
- ✅ **Complete Flow** - Katalog → Cart → Checkout → Order Management
- ✅ **Production Ready** - PM2, error handling, monitoring

---

## 📊 Arsitektur Integrasi

```
┌─────────────────────────────────┐
│  Website Nanda Motor            │
│  nandamotor.id.biz.id           │
│  ┌──────────────────────────┐   │
│  │ Frontend (GitHub Pages)  │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ Backend (Node.js:3000)   │◄──┼── Admin Panel Chat
│  │ - REST API               │   │
│  │ - JWT Auth               │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ MySQL Database           │   │
│  │ - products               │◄──┼── Shared Database
│  │ - users                  │   │
│  │ - whatsapp_chats (new)   │   │
│  │ - orders (new)           │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
           │
           │ REST API
           │ MySQL Connection
           │
┌──────────▼──────────────────────┐
│  WhatsApp Bot (wa-bot)          │
│  Repository ini                 │
│  ┌──────────────────────────┐   │
│  │ Bot Service (Port 5000)  │   │
│  │ - WhatsApp Client        │   │
│  │ - E-commerce Handlers    │   │
│  │ - Multi-step Checkout    │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ REST API Endpoints       │   │
│  │ /api/conversations       │   │
│  │ /api/orders              │   │
│  │ /webhook/send-message    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 🚀 Quick Start

### Mode 1: Standalone (Testing)

Jalankan bot tanpa website, menggunakan JSON files:

```bash
# 1. Clone repository
git clone https://github.com/MuhRifa2024/wa-bot.git
cd wa-bot

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Set mode standalone
# Edit .env: DB_MODE=json

# 5. Run bot
npm start

# 6. Scan QR code dengan WhatsApp
```

**Test via WhatsApp:**
```
HELP      - Lihat menu
KATALOG   - Lihat produk
BELI 001 2 - Beli produk
KERANJANG - Lihat cart
CHECKOUT  - Proses order
```

### Mode 2: Integrated dengan Website

Integrasikan dengan website Nanda Motor:

```bash
# 1. Setup seperti di atas, tapi:
# Edit .env: DB_MODE=mysql

# 2. Configure MySQL connection
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nanda_motor

# 3. Run bot
npm start

# Bot akan:
# - Auto-create tables di MySQL
# - Load products dari database website
# - Sync data real-time
```

📖 **Panduan lengkap:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📁 Struktur Repository

```
wa-bot/
├── index.js                 # Main bot entry point
├── package.json             # Dependencies
├── .env.example             # Environment template
├── ecosystem.config.js      # PM2 configuration
│
├── lib/
│   ├── models/              # Data models
│   │   ├── Product.js
│   │   ├── Cart.js
│   │   ├── Order.js
│   │   └── Customer.js
│   │
│   ├── services/            # Business logic
│   │   ├── ProductService.js      # Original (JSON)
│   │   ├── ProductServiceV2.js    # New (MySQL support)
│   │   ├── OrderService.js
│   │   ├── CustomerService.js
│   │   └── ChatService.js
│   │
│   ├── handlers/            # Message handlers
│   │   └── EcommerceHandlers.js
│   │
│   ├── utils/               # Utilities
│   │   ├── WebhookHandler.js
│   │   └── MessageParser.js
│   │
│   └── database/            # NEW - Database adapters
│       ├── MySQLAdapter.js        # MySQL connection
│       └── DatabaseFactory.js     # Database factory
│
├── data/                    # JSON storage (standalone mode)
│   ├── products.json
│   ├── orders.json
│   ├── customers.json
│   └── chats.json
│
└── docs/                    # Documentation
    ├── README-INTEGRATION.md     # This file
    ├── DEPLOYMENT.md             # Deployment guide
    ├── API_INTEGRATION.md        # API documentation
    ├── WEBSITE_INTEGRATION.md    # Website integration
    ├── NANDA_MOTOR_INTEGRATION.md # Specific for Nanda Motor
    └── USER_GUIDE.md             # Customer guide
```

---

## 🔧 Konfigurasi

### Environment Variables

```env
# Bot Settings
BOT_PORT=5000                # Port untuk API server
BOT_NAME="Nanda Motor Bot"

# Database Mode
DB_MODE=json                 # 'json' atau 'mysql'

# MySQL (jika DB_MODE=mysql)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nanda_motor
DB_CONNECTION_LIMIT=10

# Website Integration
WEBSITE_API_URL=http://localhost:3000
WEBHOOK_SECRET=your_secret

# Optional
DEBUG=false
PRODUCT_SYNC_INTERVAL=30
```

### Switching Modes

**Standalone → Integrated:**
```bash
# Edit .env
DB_MODE=mysql

# Configure MySQL connection
DB_HOST=localhost
DB_NAME=nanda_motor
# ...

# Restart bot
pm2 restart wa-bot
```

**Integrated → Standalone:**
```bash
# Edit .env
DB_MODE=json

# Restart bot
pm2 restart wa-bot
```

---

## 📡 API Endpoints

Bot menyediakan REST API untuk website:

### Conversations

```bash
# Get all conversations
GET /api/conversations

# Get chat history
GET /api/conversations/:customerId

# Mark as read
POST /api/conversations/:customerId/read

# Search messages
GET /api/conversations/search/:query
```

### Orders

```bash
# Get all orders
GET /api/orders

# Get customer orders
GET /api/orders/customer/:customerId

# Update order status
PUT /api/orders/:orderId/status
```

### Products

```bash
# Get all products
GET /api/products

# Get product by ID
GET /api/products/:id

# Reload products (trigger sync)
POST /webhook/reload-products
```

### Webhooks

```bash
# Send message to WhatsApp
POST /webhook/send-message
Body: { customerId, message, metadata }

# Sync products from website
POST /webhook/products
Body: { products: [...] }
```

📖 **API Documentation:** [API_INTEGRATION.md](API_INTEGRATION.md)

---

## 🌐 Integrasi dengan Website

### 1. Update Website Backend

Tambahkan routes di `BackEnd/server.js`:

```javascript
const axios = require('axios');
const BOT_API = 'http://localhost:5000';

// Proxy ke bot API
app.get('/api/whatsapp/conversations', async (req, res) => {
    const response = await axios.get(`${BOT_API}/api/conversations`);
    res.json(response.data);
});

app.post('/api/whatsapp/send-reply', async (req, res) => {
    const response = await axios.post(`${BOT_API}/webhook/send-message`, req.body);
    res.json(response.data);
});
```

### 2. Buat Admin Chat Panel

Copy template dari dokumentasi atau lihat:
- [DEPLOYMENT.md](DEPLOYMENT.md#-menambahkan-admin-chat-panel-di-website)
- [NANDA_MOTOR_INTEGRATION.md](NANDA_MOTOR_INTEGRATION.md)

### 3. Update Admin Menu

Tambahkan menu WhatsApp Chat di admin panel dengan badge unread count.

📖 **Complete Guide:** [NANDA_MOTOR_INTEGRATION.md](NANDA_MOTOR_INTEGRATION.md)

---

## 🔄 Data Flow

### Products Sync

```
Website Admin Update Product
         ↓
    MySQL Database
         ↓
Bot Auto-Reload (every 30min atau manual)
         ↓
   Customer lihat via WhatsApp
```

### Chat Flow

**WhatsApp Chat (E-commerce):**
```
Customer → WhatsApp → Bot
                       ↓
               Save to MySQL
                       ↓
        Website Admin Panel (real-time)
                       ↓
               Admin Reply
                       ↓
               Bot → WhatsApp → Customer
```

**Web Live Chat (Customer Service):** ⭐ NEW!
```
Customer Website → Live Chat Widget → Bot API
                                        ↓
                               Save to MySQL
                                        ↓
                               WhatsApp Admin
                                        ↓
                    Admin Panel Website ← Reply
                            ↓
                   Customer Website Widget
```

📖 **Panduan lengkap:** [WEBCHAT_INTEGRATION.md](WEBCHAT_INTEGRATION.md)

### Order Flow

```
Customer CHECKOUT via WhatsApp
         ↓
    Bot create order
         ↓
   Save to MySQL (orders table)
         ↓
  Website Admin dapat notifikasi
         ↓
Admin update status di website
         ↓
Customer terima notifikasi di WhatsApp
```

---

## 🛠️ Development

### Run in Development Mode

```bash
# With auto-reload
npm run dev

# Or use nodemon
npx nodemon index.js
```

### Testing

```bash
# Test bot commands
# Kirim via WhatsApp:
HELP
KATALOG
BELI 001 2

# Test API
curl http://localhost:5000/api/products
curl http://localhost:5000/api/conversations
```

### Debugging

```bash
# Enable debug mode
# .env: DEBUG=true

# View logs
pm2 logs wa-bot

# Or console logs
npm start
```

---

## 🚀 Production Deployment

### With PM2

```bash
# Start bot
npm run pm2-start

# Monitor
pm2 monit

# View logs
pm2 logs wa-bot

# Restart
pm2 restart wa-bot

# Auto-start on boot
pm2 save
pm2 startup
```

### System Requirements

- **Node.js**: v16 atau lebih baru
- **MySQL**: v5.7+ atau v8.0+ (jika integrated mode)
- **RAM**: Minimal 512MB
- **Storage**: 1GB (untuk session WhatsApp)
- **Network**: Stable internet untuk WhatsApp connection

### Performance

- Mendukung **ribuan messages/day**
- Auto-reconnect jika WhatsApp terputus
- Connection pooling untuk MySQL
- Graceful shutdown handling

---

## 📚 Dokumentasi Lengkap

| Dokumen | Deskripsi |
|---------|-----------|
| [README.md](README.md) | Overview bot & quick start |
| **[README-INTEGRATION.md](README-INTEGRATION.md)** | **Dokumentasi utama integrasi (file ini)** |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Panduan deployment lengkap |
| [NANDA_MOTOR_INTEGRATION.md](NANDA_MOTOR_INTEGRATION.md) | Specific untuk Nanda Motor |
| [WEBCHAT_INTEGRATION.md](WEBCHAT_INTEGRATION.md) | **Web Live Chat integration (NEW!)** |
| [INTEGRATION-QUICK-START.md](INTEGRATION-QUICK-START.md) | Quick start 5 menit |
| [USER_GUIDE.md](USER_GUIDE.md) | Panduan customer |

---

## ❓ FAQ

### Q: Apakah bot ini bisa jalan tanpa website?
**A:** Ya, gunakan `DB_MODE=json` untuk standalone mode.

### Q: Bagaimana sync products dari website?
**A:** Bot auto-load dari MySQL database. Products di-manage dari website admin panel.

### Q: Bisa multi-admin reply chat?
**A:** Ya, semua admin bisa lihat dan reply dari website admin panel.

### Q: Bagaimana handle crash?
**A:** PM2 auto-restart bot jika crash. Session WhatsApp tetap tersimpan.

### Q: Apakah butuh server terpisah?
**A:** Tidak, bot bisa jalan di server yang sama dengan website (port berbeda).

### Q: Database apa yang digunakan?
**A:** MySQL (shared dengan website) atau JSON files (standalone).

### Q: Apa bedanya WhatsApp Chat dan Web Live Chat? ⭐ NEW!
**A:** 
- **WhatsApp Chat**: Customer belanja via WhatsApp (KATALOG, BELI, CHECKOUT)
- **Web Live Chat**: Customer chat dari website browser untuk customer service (pertanyaan, info)
- Keduanya bisa jalan bersamaan!

### Q: Apakah customer wajib punya WhatsApp untuk live chat?
**A:** Tidak. Web Live Chat tidak perlu WhatsApp. Customer chat dari browser, admin terima di WhatsApp.

---

## 🆘 Troubleshooting

### Bot tidak connect ke MySQL

```bash
# Check MySQL running
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1;"

# Check credentials di .env
DB_USER=root
DB_PASSWORD=correct_password
```

### QR Code tidak muncul

```bash
# Clear session
rm -rf .wwebjs_auth

# Restart bot
npm start
```

### Products tidak muncul

```bash
# Check database
mysql -u root -p nanda_motor
SELECT COUNT(*) FROM products;

# Reload products manually
curl -X POST http://localhost:5000/webhook/reload-products
```

### Port conflict

```bash
# Check port 5000
lsof -i :5000

# Change port di .env
BOT_PORT=5001
```

---

## 🔐 Security

- ✅ Webhook secret untuk protect endpoints
- ✅ JWT validation (dari website)
- ✅ SQL injection prevention (prepared statements)
- ✅ Rate limiting on API endpoints
- ✅ Input validation & sanitization

---

## 📝 Changelog

### v1.1.0 (Current) ⭐ NEW!
- ✅ **Web Live Chat** - Customer chat dari website → WhatsApp admin
- ✅ Live chat widget untuk customer website
- ✅ Admin panel untuk monitor web chats
- ✅ Dual chat system (WhatsApp + Web)
- ✅ Auto-forward to WhatsApp admin
- ✅ Real-time messaging

### v1.0.0
- ✅ E-commerce bot lengkap
- ✅ MySQL database support
- ✅ Dual mode (JSON/MySQL)
- ✅ Website integration ready
- ✅ Two-way chat system
- ✅ Multi-step checkout
- ✅ Order management
- ✅ PM2 production ready

---

## 🤝 Kontribusi

Repository ini khusus untuk integrasi dengan website Nanda Motor. 

Untuk pertanyaan atau issue:
1. Check dokumentasi lengkap
2. Review FAQ
3. Buka issue di GitHub

---

## 📞 Support

- **Website**: [nandamotor.id.biz.id](http://nandamotor.id.biz.id)
- **WhatsApp**: +62 853-1462-7451
- **Email**: nandasr.24@gmail.com

---

## 📄 License

MIT License - lihat [LICENSE](LICENSE) untuk detail.

---

**Built with ❤️ for Nanda Motor**

🚀 Ready to deploy? Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan lengkap!
