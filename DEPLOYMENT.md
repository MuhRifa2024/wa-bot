# Deployment Guide: WhatsApp Bot ke Website Nanda Motor

Panduan deployment bot WhatsApp e-commerce yang sudah ada ini ke website Nanda Motor.

---

## 🎯 Konsep Deployment

Bot WhatsApp ini akan berjalan sebagai **microservice terpisah** yang terintegrasi dengan website Nanda Motor:

```
┌────────────────────────────┐
│  Website Nanda Motor       │
│  nandamotor.github.io      │
│  ├─ FrontEnd (GitHub Pages)│
│  └─ BackEnd (Node.js:3000) │
│     └─ MySQL Database      │
└─────────┬──────────────────┘
          │
          │ REST API
          │ Shared MySQL DB
          │
┌─────────▼──────────────────┐
│  WhatsApp Bot (wa-bot)     │
│  ├─ Bot Service (Port 5000)│
│  ├─ WhatsApp Client        │
│  └─ Connect to MySQL       │
└────────────────────────────┘
```

**Keuntungan:**
- ✅ Bot existing tidak perlu rewrite
- ✅ Bot bisa standalone atau integrated
- ✅ Data tersinkronisasi via MySQL
- ✅ Website bisa control bot via API

---

## 📋 Persiapan

### 1. Clone Repository Bot ke Server

```bash
# Di server yang sama dengan website Nanda Motor
cd /path/to/projects
git clone https://github.com/MuhRifa2024/wa-bot.git
cd wa-bot
```

### 2. Install Dependencies

```bash
npm install
```

Dependencies yang akan terinstall:
- `whatsapp-web.js` - WhatsApp client
- `express` - Web server
- `mysql2` - MySQL database
- `dotenv` - Environment variables
- `axios` - HTTP client
- `qrcode` - QR code generator

### 3. Setup Environment Variables

```bash
# Copy contoh .env
cp .env.example .env

# Edit .env
nano .env
```

**Konfigurasi untuk integrasi dengan Nanda Motor:**

```env
# Bot Settings
BOT_PORT=5000
BOT_NAME="Nanda Motor Bot"

# Database Mode - GUNAKAN MYSQL
DB_MODE=mysql

# MySQL Configuration - SAMA DENGAN WEBSITE
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=nanda_motor

# Website Integration
WEBSITE_API_URL=http://localhost:3000

# Optional
DEBUG=false
PRODUCT_SYNC_INTERVAL=30
```

---

## 🔧 Setup Database

Bot akan otomatis membuat table yang diperlukan saat pertama kali jalan:

- `whatsapp_chats` - Chat history
- `orders` - Orders dari WhatsApp
- `whatsapp_customers` - Customer data
- `shopping_carts` - Shopping carts
- `checkout_sessions` - Checkout state management

**Table `products` sudah ada di website, bot akan langsung pakai.**

---

## 🚀 Menjalankan Bot

### Mode 1: Standalone (Development)

```bash
# Jalankan bot langsung
npm start

# Atau dengan nodemon untuk auto-reload
npm run dev
```

Bot akan:
1. ✅ Connect ke MySQL database
2. ✅ Load products dari database
3. ✅ Tampilkan QR code untuk scan WhatsApp
4. ✅ Start API server di port 5000

**Scan QR code dengan WhatsApp** untuk login.

### Mode 2: Production dengan PM2

```bash
# Start dengan PM2
npm run pm2-start

# Check status
pm2 status

# View logs
pm2 logs wa-bot

# Stop bot
pm2 stop wa-bot

# Restart bot
pm2 restart wa-bot
```

---

## 🔗 Integrasi dengan Website Backend

### 1. Update Website Backend (server.js)

Tambahkan routes untuk komunikasi dengan bot:

```javascript
// File: BackEnd/server.js (website Nanda Motor)

const axios = require('axios');
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:5000';

// === WHATSAPP BOT INTEGRATION ===

// Get all WhatsApp conversations
app.get('/api/whatsapp/conversations', async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/api/conversations`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get chat history with specific customer
app.get('/api/whatsapp/conversations/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const response = await axios.get(`${BOT_API_URL}/api/conversations/${customerId}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Send reply to WhatsApp customer
app.post('/api/whatsapp/send-reply', async (req, res) => {
    try {
        const { customerId, message } = req.body;
        const response = await axios.post(`${BOT_API_URL}/webhook/send-message`, {
            customerId,
            message,
            metadata: {
                admin_id: req.user?.id || 'admin',
                source: 'website'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

// Mark conversation as read
app.post('/api/whatsapp/conversations/:customerId/read', async (req, res) => {
    try {
        const { customerId } = req.params;
        const response = await axios.post(`${BOT_API_URL}/api/conversations/${customerId}/read`);
        res.json(response.data);
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Get WhatsApp orders
app.get('/api/whatsapp/orders', async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API_URL}/api/orders`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Trigger product sync from website to bot
app.post('/api/whatsapp/sync-products', async (req, res) => {
    try {
        // Bot will auto-sync from MySQL, but this can trigger manual reload
        const response = await axios.post(`${BOT_API_URL}/webhook/reload-products`);
        res.json(response.data);
    } catch (error) {
        console.error('Error syncing products:', error);
        res.status(500).json({ error: 'Failed to sync products' });
    }
});
```

### 2. Update Website .env

```env
# Tambahkan di BackEnd/.env (website)
BOT_API_URL=http://localhost:5000
```

---

## 🎨 Menambahkan Admin Chat Panel di Website

### 1. Buat Halaman Chat Admin

**File: `FrontEnd/whatsapp-chat.html`**

```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Chat - Admin Nanda Motor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
</head>
<body class="bg-gray-100">
    <div class="flex h-screen">
        <!-- Conversations List -->
        <div class="w-1/3 bg-white border-r overflow-y-auto">
            <div class="p-4 bg-blue-600 text-white">
                <h2 class="text-xl font-bold"><i class="fas fa-comments"></i> WhatsApp Chats</h2>
            </div>
            <div id="conversations-list" class="divide-y"></div>
        </div>

        <!-- Chat Window -->
        <div class="flex-1 flex flex-col">
            <div class="p-4 bg-blue-600 text-white">
                <h3 id="chat-customer-name" class="text-lg font-bold">Pilih percakapan</h3>
            </div>

            <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50"></div>

            <div class="p-4 bg-white border-t">
                <div class="flex gap-2">
                    <input 
                        type="text" 
                        id="reply-input" 
                        placeholder="Ketik balasan..." 
                        class="flex-1 border rounded-lg px-4 py-2"
                    />
                    <button 
                        onclick="sendReply()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                        <i class="fas fa-paper-plane"></i> Kirim
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentCustomerId = null;
        const API_URL = 'http://localhost:3000';

        async function loadConversations() {
            try {
                const res = await fetch(`${API_URL}/api/whatsapp/conversations`);
                const data = await res.json();
                
                const container = document.getElementById('conversations-list');
                container.innerHTML = '';

                data.data.forEach(conv => {
                    const div = document.createElement('div');
                    div.className = 'p-4 hover:bg-gray-50 cursor-pointer';
                    div.innerHTML = `
                        <div class="font-bold">${conv.customerId.replace('@c.us', '')}</div>
                        <div class="text-sm text-gray-600 truncate">${conv.lastMessage}</div>
                        ${conv.unreadCount > 0 ? `<span class="bg-green-500 text-white text-xs px-2 py-1 rounded-full">${conv.unreadCount}</span>` : ''}
                    `;
                    div.onclick = () => loadChat(conv.customerId);
                    container.appendChild(div);
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadChat(customerId) {
            currentCustomerId = customerId;
            const res = await fetch(`${API_URL}/api/whatsapp/conversations/${customerId}`);
            const data = await res.json();
            
            document.getElementById('chat-customer-name').innerText = customerId.replace('@c.us', '');
            
            const container = document.getElementById('messages-container');
            container.innerHTML = '';

            data.data.messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = `flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`;
                div.innerHTML = `
                    <div class="${msg.direction === 'outgoing' ? 'bg-blue-500 text-white' : 'bg-white'} 
                                max-w-md px-4 py-2 rounded-lg shadow">
                        <p>${msg.message}</p>
                        <p class="text-xs mt-1 opacity-75">${new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                `;
                container.appendChild(div);
            });

            container.scrollTop = container.scrollHeight;
            await fetch(`${API_URL}/api/whatsapp/conversations/${customerId}/read`, { method: 'POST' });
        }

        async function sendReply() {
            const input = document.getElementById('reply-input');
            const message = input.value.trim();
            if (!message || !currentCustomerId) return;

            await fetch(`${API_URL}/api/whatsapp/send-reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: currentCustomerId, message })
            });

            input.value = '';
            setTimeout(() => loadChat(currentCustomerId), 500);
        }

        document.getElementById('reply-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendReply();
        });

        setInterval(loadConversations, 5000);
        loadConversations();
    </script>
</body>
</html>
```

### 2. Tambahkan Menu di Admin Panel

Edit `FrontEnd/admin.html`, tambahkan menu:

```html
<nav class="flex-1 p-4 space-y-2">
    <!-- Menu existing... -->
    
    <!-- NEW MENU -->
    <a href="whatsapp-chat.html" class="block py-2.5 px-4 rounded hover:bg-gray-700">
        <i class="fas fa-comments mr-2"></i> WhatsApp Chat
        <span id="wa-unread-badge" class="bg-green-500 text-white text-xs px-2 py-1 rounded-full ml-2">0</span>
    </a>
</nav>

<script>
    // Update unread count
    async function updateUnreadCount() {
        try {
            const res = await fetch('http://localhost:3000/api/whatsapp/conversations');
            const data = await res.json();
            const unread = data.data.reduce((sum, c) => sum + c.unreadCount, 0);
            document.getElementById('wa-unread-badge').innerText = unread;
        } catch (e) {}
    }
    setInterval(updateUnreadCount, 10000);
    updateUnreadCount();
</script>
```

---

## ✅ Testing

### 1. Test Bot Standalone

```bash
# Kirim pesan WhatsApp ke nomor bot:
HELP
KATALOG
BELI 001 2
KERANJANG
CHECKOUT
```

### 2. Test Website Integration

```bash
# Check conversations
curl http://localhost:5000/api/conversations

# Check products sync
curl http://localhost:5000/api/products
```

### 3. Test Admin Panel

Buka browser: `http://localhost:3000/FrontEnd/whatsapp-chat.html`

---

## 📊 Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs wa-bot

# Check MySQL connection
mysql -u root -p nanda_motor
SELECT COUNT(*) FROM whatsapp_chats;
SELECT COUNT(*) FROM orders;
```

---

## 🔄 Mode Operasi

Bot mendukung 2 mode:

### 1. **Standalone Mode** (DB_MODE=json)
- Pakai JSON files
- Cocok untuk testing
- Tidak terintegrasi dengan website

### 2. **Integrated Mode** (DB_MODE=mysql)
- Pakai MySQL database
- Data synchronized dengan website
- Admin bisa balas chat dari website
- Products auto-sync

**Switch mode dengan edit `.env`:**
```env
DB_MODE=mysql  # integrated
# atau
DB_MODE=json   # standalone
```

---

## 🚨 Troubleshooting

### Bot tidak connect ke MySQL:
```bash
# Check MySQL running
sudo systemctl status mysql

# Check credentials
mysql -u root -p -e "USE nanda_motor;"
```

### QR Code tidak muncul:
```bash
# Clear session
rm -rf .wwebjs_auth
npm start
```

### Port conflict:
```bash
# Check port usage
lsof -i :5000

# Change port di .env
BOT_PORT=5001
```

---

## 📦 Production Deployment

### 1. Setup Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/nandamotor

# Website backend
upstream website_backend {
    server localhost:3000;
}

# WhatsApp bot
upstream whatsapp_bot {
    server localhost:5000;
}

server {
    listen 80;
    server_name nandamotor.id.biz.id;

    # Website
    location / {
        proxy_pass http://website_backend;
    }

    # Bot API (internal only)
    location /bot-api/ {
        # Restrict access
        allow 127.0.0.1;
        deny all;
        
        proxy_pass http://whatsapp_bot/;
    }
}
```

### 2. Auto-start dengan PM2

```bash
# Save PM2 config
pm2 save

# Auto-start on boot
pm2 startup
```

### 3. Security

```env
# Gunakan webhook secret
WEBHOOK_SECRET=your_random_secret_key_here
```

---

## 📝 Summary

Bot ini **siap diintegrasikan** ke website Nanda Motor dengan:

✅ **Plug & Play** - Tidak perlu rewrite code bot  
✅ **Dual Mode** - Bisa standalone atau integrated  
✅ **MySQL Support** - Auto-sync dengan database website  
✅ **API Ready** - Website bisa control via REST API  
✅ **Admin Panel Ready** - Template UI sudah tersedia  
✅ **Production Ready** - PM2, monitoring, error handling  

**Next Steps:**
1. Clone repo bot
2. Setup .env (DB_MODE=mysql)
3. Run bot (npm start)
4. Scan QR code
5. Update website backend (tambah routes)
6. Buat admin chat panel
7. Test end-to-end

Bot dan website akan bekerja bersama dengan data tersinkronisasi! 🚀
