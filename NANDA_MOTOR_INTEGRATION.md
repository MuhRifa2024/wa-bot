# Integrasi WhatsApp Bot ke Website Nanda Motor

Panduan lengkap mengintegrasikan WhatsApp Bot E-commerce ke [nandamotor.github.io](https://github.com/NandaMotor/nandamotor.github.io)

---

## 🎯 Overview

Website Nanda Motor saat ini memiliki:
- ✅ Backend Node.js + Express (port 3000)
- ✅ Database MySQL dengan tabel `products`, `users`
- ✅ Admin panel untuk CRUD produk
- ✅ Frontend HTML/TailwindCSS
- ⚠️ WhatsApp button manual (hanya link ke wa.me)

**Yang akan ditambahkan:**
- 🤖 WhatsApp Bot otomatis (katalog, cart, checkout, order tracking)
- 💬 Two-way chat (customer ↔ admin via website)
- 🔄 Sync produk otomatis dari database MySQL
- 📦 Order management dari WhatsApp ke website

---

## 📁 Struktur File yang Dibutuhkan

```
nandamotor.github.io/
├── BackEnd/
│   ├── server.js (existing - akan dimodifikasi)
│   ├── whatsapp-bot.js (NEW - bot entry point)
│   └── routes/
│       └── whatsapp-routes.js (NEW - webhook routes)
├── FrontEnd/
│   ├── admin.html (existing - akan ditambahi chat panel)
│   ├── chat-admin.html (NEW - admin chat interface)
│   └── js/
│       ├── script.js (existing)
│       └── chat-admin.js (NEW - chat functions)
└── node_modules/ (tambahkan dependencies bot)
```

---

## 🔧 Step 1: Update Database Schema

Tambahkan table untuk chat dan orders di MySQL:

```sql
-- Table untuk WhatsApp chats
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    message TEXT NOT NULL,
    direction ENUM('incoming', 'outgoing') NOT NULL,
    timestamp DATETIME NOT NULL,
    `read` BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_read (`read`)
);

-- Table untuk orders dari WhatsApp
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address TEXT NOT NULL,
    items JSON NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);

-- Table untuk customers dari WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    addresses JSON,
    order_history JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
);
```

---

## 📦 Step 2: Install Dependencies WhatsApp Bot

Di folder `BackEnd/`, jalankan:

```bash
cd BackEnd
npm install whatsapp-web.js qrcode-terminal axios dotenv pm2 --save
```

**Update `BackEnd/package.json`:**

```json
{
  "name": "nanda-motor-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "bot": "node whatsapp-bot.js",
    "bot:pm2": "pm2 start whatsapp-bot.js --name nanda-wa-bot"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.41.0",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "whatsapp-web.js": "^1.23.0",
    "qrcode-terminal": "^0.12.0",
    "axios": "^1.6.2",
    "pm2": "^5.3.0"
  }
}
```

---

## 🤖 Step 3: Setup WhatsApp Bot

**Buat file `BackEnd/whatsapp-bot.js`:**

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

// Express untuk webhook
const app = express();
app.use(express.json());

// MySQL Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nanda_motor',
    waitForConnections: true,
    connectionLimit: 10
});

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'nanda-motor-bot' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// QR Code generation
client.on('qr', (qr) => {
    console.log('🔗 Scan QR Code untuk login WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Ready event
client.on('ready', () => {
    console.log('✅ WhatsApp Bot Nanda Motor siap!');
});

// Handle incoming messages
client.on('message', async (msg) => {
    const chatId = msg.from;
    const message = msg.body.trim();
    const customerPhone = chatId.replace('@c.us', '');

    // Save incoming message ke database
    await saveMessage(chatId, message, 'incoming', {
        messageId: msg.id.id,
        timestamp: msg.timestamp
    });

    // Parse command
    const command = message.toUpperCase();

    try {
        if (command === 'KATALOG' || command === 'PRODUK') {
            await handleCatalog(chatId);
        } else if (command.startsWith('BELI')) {
            await handleBuy(chatId, message);
        } else if (command === 'KERANJANG' || command === 'CART') {
            await handleCart(chatId);
        } else if (command === 'CHECKOUT') {
            await handleCheckout(chatId);
        } else if (command === 'HELP' || command === 'BANTUAN') {
            await handleHelp(chatId);
        } else {
            // Default reply
            await sendMessage(chatId, 'Ketik *HELP* untuk melihat menu.');
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await sendMessage(chatId, 'Maaf, terjadi kesalahan. Silakan coba lagi.');
    }
});

// === HANDLERS ===

async function handleCatalog(chatId) {
    try {
        // Ambil produk dari database MySQL
        const [products] = await db.query(`
            SELECT * FROM products 
            WHERE stok > 0 
            ORDER BY created_at DESC
        `);

        if (products.length === 0) {
            return await sendMessage(chatId, '📦 Maaf, produk sedang kosong.');
        }

        let katalog = '🛍️ *KATALOG NANDA MOTOR* 🛍️\n\n';
        
        products.forEach((p, idx) => {
            katalog += `${idx + 1}. *${p.nama_produk}*\n`;
            katalog += `   💰 Rp ${Number(p.harga).toLocaleString('id-ID')}\n`;
            katalog += `   📦 Stok: ${p.stok}\n`;
            katalog += `   🏷️ Kategori: ${p.kategori}\n`;
            if (p.gambar) {
                katalog += `   🖼️ ${p.gambar}\n`;
            }
            katalog += `   ID: ${p.id}\n\n`;
        });

        katalog += '💬 *Cara Order:*\n';
        katalog += 'BELI <ID> <JUMLAH>\n';
        katalog += 'Contoh: BELI 001 2\n\n';
        katalog += 'Ketik *KERANJANG* untuk lihat keranjang\n';
        katalog += 'Ketik *CHECKOUT* untuk proses order';

        await sendMessage(chatId, katalog);
    } catch (error) {
        console.error('Error handleCatalog:', error);
        throw error;
    }
}

async function handleBuy(chatId, message) {
    // Parse: BELI <ID> <QTY>
    const parts = message.split(' ');
    if (parts.length < 3) {
        return await sendMessage(chatId, '❌ Format salah!\nContoh: BELI 001 2');
    }

    const productId = parts[1];
    const quantity = parseInt(parts[2]);

    if (isNaN(quantity) || quantity <= 0) {
        return await sendMessage(chatId, '❌ Jumlah harus angka positif!');
    }

    try {
        // Cek produk
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        
        if (products.length === 0) {
            return await sendMessage(chatId, `❌ Produk ID ${productId} tidak ditemukan!`);
        }

        const product = products[0];

        if (product.stok < quantity) {
            return await sendMessage(chatId, `❌ Stok tidak cukup!\nStok tersedia: ${product.stok}`);
        }

        // Simpan ke cart (gunakan JSON di database atau file)
        await addToCart(chatId, productId, quantity, product);

        const reply = `✅ *Ditambahkan ke keranjang!*\n\n` +
                     `📦 ${product.nama_produk}\n` +
                     `💰 Rp ${Number(product.harga).toLocaleString('id-ID')} x ${quantity}\n` +
                     `💵 Subtotal: Rp ${(product.harga * quantity).toLocaleString('id-ID')}\n\n` +
                     `Ketik *KERANJANG* untuk lihat keranjang\n` +
                     `Ketik *CHECKOUT* untuk proses order`;

        await sendMessage(chatId, reply);
    } catch (error) {
        console.error('Error handleBuy:', error);
        throw error;
    }
}

async function handleCart(chatId) {
    try {
        const cart = await getCart(chatId);
        
        if (!cart || cart.items.length === 0) {
            return await sendMessage(chatId, '🛒 Keranjang kosong.\n\nKetik *KATALOG* untuk lihat produk.');
        }

        let message = '🛒 *KERANJANG BELANJA* 🛒\n\n';
        let total = 0;

        cart.items.forEach((item, idx) => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            message += `${idx + 1}. ${item.name}\n`;
            message += `   ${item.quantity} x Rp ${Number(item.price).toLocaleString('id-ID')}\n`;
            message += `   Subtotal: Rp ${subtotal.toLocaleString('id-ID')}\n\n`;
        });

        message += `💵 *TOTAL: Rp ${total.toLocaleString('id-ID')}*\n\n`;
        message += 'Ketik *CHECKOUT* untuk proses order';

        await sendMessage(chatId, message);
    } catch (error) {
        console.error('Error handleCart:', error);
        throw error;
    }
}

async function handleCheckout(chatId) {
    const cart = await getCart(chatId);
    
    if (!cart || cart.items.length === 0) {
        return await sendMessage(chatId, '🛒 Keranjang kosong!\n\nKetik *KATALOG* untuk mulai belanja.');
    }

    // Start checkout flow (multi-step)
    await sendMessage(chatId, 
        '📝 *CHECKOUT*\n\n' +
        'Silakan kirim nama lengkap Anda:'
    );

    // Set session state (implementasi session management)
    await setCheckoutState(chatId, 'waiting_name', cart);
}

async function handleHelp(chatId) {
    const help = `
🤖 *BOT NANDA MOTOR* 🤖

📋 *Menu Perintah:*

🛍️ *KATALOG* - Lihat semua produk
🛒 *BELI <ID> <JUMLAH>* - Tambah ke keranjang
   Contoh: BELI 001 2
📦 *KERANJANG* - Lihat isi keranjang
✅ *CHECKOUT* - Proses pesanan
❓ *HELP* - Lihat menu ini

💬 *Kontak Admin:*
📞 0853-1462-7451
🌐 nandamotor.id.biz.id

Selamat berbelanja! 🏍️
    `.trim();

    await sendMessage(chatId, help);
}

// === HELPER FUNCTIONS ===

async function sendMessage(chatId, message) {
    try {
        await client.sendMessage(chatId, message);
        
        // Save outgoing message
        await saveMessage(chatId, message, 'outgoing', { source: 'bot' });
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

async function saveMessage(chatId, message, direction, metadata = {}) {
    try {
        const messageId = metadata.messageId || `BOT-${Date.now()}`;
        const timestamp = new Date(metadata.timestamp || Date.now());

        await db.query(`
            INSERT INTO whatsapp_chats 
            (message_id, customer_id, message, direction, timestamp, metadata) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, chatId, message, direction, timestamp, JSON.stringify(metadata)]);
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

async function addToCart(chatId, productId, quantity, product) {
    // Implementasi cart (bisa pakai database atau file JSON)
    // Untuk simplicity, pakai database cart table
    
    await db.query(`
        INSERT INTO shopping_carts (customer_id, product_id, quantity, product_data, created_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `, [chatId, productId, quantity, JSON.stringify(product)]);
}

async function getCart(chatId) {
    const [rows] = await db.query(`
        SELECT * FROM shopping_carts WHERE customer_id = ?
    `, [chatId]);

    if (rows.length === 0) return null;

    const items = rows.map(row => {
        const product = JSON.parse(row.product_data);
        return {
            id: row.product_id,
            name: product.nama_produk,
            price: product.harga,
            quantity: row.quantity
        };
    });

    return { customerId: chatId, items };
}

async function setCheckoutState(chatId, state, data) {
    // Simpan state checkout (bisa pakai Redis atau database)
    // Untuk MVP, pakai database sessions table
}

// === WEBHOOK ENDPOINTS ===

// Endpoint untuk website kirim pesan ke WhatsApp
app.post('/webhook/send-message', async (req, res) => {
    const { customerId, message, metadata } = req.body;

    if (!customerId || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await client.sendMessage(customerId, message);
        await saveMessage(customerId, message, 'outgoing', { 
            source: 'website_admin',
            ...metadata 
        });

        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Endpoint untuk sync produk dari website
app.post('/webhook/sync-products', async (req, res) => {
    // Product sync sudah ada di database MySQL, tidak perlu sync
    res.json({ success: true, message: 'Products already in sync' });
});

// === START SERVER ===

const PORT = process.env.BOT_PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Bot API running on port ${PORT}`);
});

client.initialize();
```

---

## 🌐 Step 4: Update Backend Server.js

**Modifikasi `BackEnd/server.js` untuk menambahkan routes chat:**

```javascript
// Tambahkan di bagian atas (setelah require yang ada)
const axios = require('axios');
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

// === ROUTES UNTUK CHAT ADMIN ===

// Get all conversations
app.get('/api/whatsapp/conversations', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                customer_id,
                MAX(message) as last_message,
                MAX(timestamp) as last_message_time,
                (SELECT direction FROM whatsapp_chats wc2 
                 WHERE wc2.customer_id = wc.customer_id 
                 ORDER BY timestamp DESC LIMIT 1) as last_message_direction,
                SUM(CASE WHEN direction = 'incoming' AND \`read\` = FALSE THEN 1 ELSE 0 END) as unread_count,
                COUNT(*) as total_messages
            FROM whatsapp_chats wc
            GROUP BY customer_id
            ORDER BY last_message_time DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get chat history
app.get('/api/whatsapp/conversations/:customerId', async (req, res) => {
    const { customerId } = req.params;

    try {
        const [messages] = await db.query(`
            SELECT * FROM whatsapp_chats 
            WHERE customer_id = ? 
            ORDER BY timestamp ASC
        `, [customerId]);

        res.json({ customerId, messages });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Mark messages as read
app.post('/api/whatsapp/conversations/:customerId/read', async (req, res) => {
    const { customerId } = req.params;

    try {
        await db.query(`
            UPDATE whatsapp_chats 
            SET \`read\` = TRUE 
            WHERE customer_id = ? AND direction = 'incoming'
        `, [customerId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Send reply dari website admin
app.post('/api/whatsapp/send-reply', async (req, res) => {
    const { customerId, message } = req.body;

    if (!customerId || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Forward ke bot API
        const response = await axios.post(`${BOT_API_URL}/webhook/send-message`, {
            customerId,
            message,
            metadata: {
                admin_id: req.user?.id || 'admin',
                source: 'website'
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

// Get orders
app.get('/api/whatsapp/orders', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT * FROM orders 
            ORDER BY created_at DESC
        `);

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
```

---

## 🎨 Step 5: Create Admin Chat Panel

**Buat file `FrontEnd/chat-admin.html`:**

```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Chat Admin - Nanda Motor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
</head>
<body class="bg-gray-100">
    <div class="flex h-screen">
        <!-- Sidebar conversations -->
        <div class="w-1/3 bg-white border-r overflow-y-auto">
            <div class="p-4 border-b">
                <h2 class="text-xl font-bold">💬 WhatsApp Chats</h2>
            </div>
            <div id="conversations-list" class="divide-y"></div>
        </div>

        <!-- Chat window -->
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
                        class="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                        onclick="sendReply()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold"
                    >
                        <i class="fas fa-paper-plane"></i> Kirim
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/chat-admin.js"></script>
</body>
</html>
```

**Buat file `FrontEnd/js/chat-admin.js`:**

```javascript
let currentCustomerId = null;
const API_URL = 'http://localhost:3000';

// Load conversations
async function loadConversations() {
    try {
        const response = await fetch(`${API_URL}/api/whatsapp/conversations`);
        const conversations = await response.json();

        const container = document.getElementById('conversations-list');
        container.innerHTML = '';

        conversations.forEach(conv => {
            const div = document.createElement('div');
            div.className = 'p-4 hover:bg-gray-50 cursor-pointer ' + 
                           (currentCustomerId === conv.customer_id ? 'bg-blue-50' : '');
            
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="font-bold">${conv.customer_id.replace('@c.us', '')}</div>
                        <div class="text-sm text-gray-600 truncate">${conv.last_message}</div>
                    </div>
                    ${conv.unread_count > 0 ? `
                        <span class="bg-green-500 text-white text-xs rounded-full px-2 py-1">
                            ${conv.unread_count}
                        </span>
                    ` : ''}
                </div>
                <div class="text-xs text-gray-400 mt-1">
                    ${new Date(conv.last_message_time).toLocaleString('id-ID')}
                </div>
            `;

            div.onclick = () => loadChat(conv.customer_id);
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Load chat history
async function loadChat(customerId) {
    currentCustomerId = customerId;

    try {
        const response = await fetch(`${API_URL}/api/whatsapp/conversations/${customerId}`);
        const data = await response.json();

        document.getElementById('chat-customer-name').innerText = customerId.replace('@c.us', '');

        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        data.messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`;

            div.innerHTML = `
                <div class="${msg.direction === 'outgoing' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'} 
                            max-w-md px-4 py-2 rounded-lg shadow">
                    <p class="whitespace-pre-wrap">${msg.message}</p>
                    <p class="text-xs ${msg.direction === 'outgoing' ? 'text-blue-100' : 'text-gray-500'} mt-1">
                        ${new Date(msg.timestamp).toLocaleTimeString('id-ID')}
                    </p>
                </div>
            `;

            container.appendChild(div);
        });

        container.scrollTop = container.scrollHeight;

        // Mark as read
        await fetch(`${API_URL}/api/whatsapp/conversations/${customerId}/read`, {
            method: 'POST'
        });

        loadConversations(); // Refresh unread count
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

// Send reply
async function sendReply() {
    const input = document.getElementById('reply-input');
    const message = input.value.trim();

    if (!message || !currentCustomerId) return;

    try {
        await fetch(`${API_URL}/api/whatsapp/send-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: currentCustomerId,
                message
            })
        });

        input.value = '';
        
        setTimeout(() => loadChat(currentCustomerId), 500);
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Gagal mengirim pesan');
    }
}

// Enter key to send
document.getElementById('reply-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendReply();
    }
});

// Auto-refresh every 5 seconds
setInterval(loadConversations, 5000);
loadConversations();
```

---

## 🚀 Step 6: Deploy & Testing

### 1. **Jalankan MySQL Database**
```bash
mysql -u root -p
CREATE DATABASE IF NOT EXISTS nanda_motor;
USE nanda_motor;

# Jalankan SQL schema dari Step 1
```

### 2. **Setup Environment Variables**

Buat file `BackEnd/.env`:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nanda_motor

# JWT
SECRET_KEY=rahasia_nanda_motor_123

# Cloudinary (existing)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Bot
BOT_PORT=3001
BOT_API_URL=http://localhost:3001
```

### 3. **Jalankan Services**

```bash
# Terminal 1 - Backend API
cd BackEnd
npm start

# Terminal 2 - WhatsApp Bot
cd BackEnd
npm run bot

# Scan QR Code yang muncul dengan WhatsApp
```

### 4. **Test WhatsApp Bot**

Kirim pesan via WhatsApp ke nomor yang sudah discan:
```
HELP
KATALOG
BELI 001 2
KERANJANG
CHECKOUT
```

### 5. **Test Admin Panel**

Buka browser:
```
http://localhost:3000/FrontEnd/chat-admin.html
```

---

## 📋 Checklist Integrasi

- [ ] Database schema updated (3 tables baru)
- [ ] Dependencies installed (whatsapp-web.js, dll)
- [ ] whatsapp-bot.js created
- [ ] server.js updated (chat routes added)
- [ ] chat-admin.html created
- [ ] chat-admin.js created
- [ ] .env configured
- [ ] MySQL running
- [ ] Backend API running (port 3000)
- [ ] WhatsApp Bot running (port 3001)
- [ ] QR Code scanned
- [ ] Test KATALOG command ✅
- [ ] Test BELI command ✅
- [ ] Test CHECKOUT flow ✅
- [ ] Admin panel can see chats ✅
- [ ] Admin can reply via website ✅

---

## 🔄 Update Existing Admin Panel

**Tambahkan menu WhatsApp Chat di `FrontEnd/admin.html`:**

```html
<!-- Tambahkan di sidebar navigation -->
<nav class="flex-1 p-4 space-y-2">
    <a href="#" class="block py-2.5 px-4 rounded transition duration-200 bg-blue-600 hover:bg-blue-700">
        <i class="fas fa-tachometer-alt mr-2"></i> Dashboard
    </a>
    <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
        <i class="fas fa-box mr-2"></i> Manajemen Produk
    </a>
    
    <!-- NEW MENU -->
    <a href="chat-admin.html" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
        <i class="fas fa-comments mr-2"></i> WhatsApp Chat
        <span class="bg-green-500 text-white text-xs rounded-full px-2 py-1 ml-2" id="unread-badge">0</span>
    </a>
    
    <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
        <i class="fas fa-users mr-2"></i> Data Pengguna
    </a>
    <a href="#" class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
        <i class="fas fa-file-invoice-dollar mr-2"></i> Laporan Transaksi
    </a>
</nav>

<!-- Script untuk update badge unread count -->
<script>
    async function updateUnreadBadge() {
        try {
            const response = await fetch('http://localhost:3000/api/whatsapp/conversations');
            const conversations = await response.json();
            
            const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
            
            const badge = document.getElementById('unread-badge');
            if (badge) {
                badge.innerText = totalUnread;
                badge.style.display = totalUnread > 0 ? 'inline' : 'none';
            }
        } catch (error) {
            console.error('Error updating unread badge:', error);
        }
    }
    
    // Update every 10 seconds
    setInterval(updateUnreadBadge, 10000);
    updateUnreadBadge();
</script>
```

---

## 🌟 Fitur Tambahan (Optional)

### 1. **Notifikasi Real-time dengan Socket.IO**

Install:
```bash
npm install socket.io
```

Update bot untuk emit events saat ada pesan baru.

### 2. **Auto-reply Template**

Tambahkan quick reply buttons di admin panel.

### 3. **Order Tracking via WhatsApp**

Customer bisa track order dengan command:
```
STATUS <ORDER_ID>
```

### 4. **Broadcast Message**

Admin bisa broadcast promo ke semua customer.

---

## 🆘 Troubleshooting

**1. QR Code tidak muncul:**
```bash
# Clear auth folder
rm -rf BackEnd/.wwebjs_auth
npm run bot
```

**2. Database connection error:**
```bash
# Check MySQL running
mysql -u root -p
SHOW DATABASES;
```

**3. CORS error:**
```javascript
// Pastikan CORS sudah enabled di server.js
app.use(cors({
    origin: '*', // Atau specify domain
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

---

## 📞 Support

Jika ada masalah integrasi:
- Cek logs di terminal bot
- Cek logs di browser console (F12)
- Pastikan semua port tidak conflict (3000, 3001)

---

**Dokumentasi lengkap tersedia di:**
- [WEBSITE_INTEGRATION.md](WEBSITE_INTEGRATION.md) - General integration guide
- [API_INTEGRATION.md](API_INTEGRATION.md) - REST API reference
- [USER_GUIDE.md](USER_GUIDE.md) - Customer guide

Happy integrating! 🚀
