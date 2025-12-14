# Web Live Chat Integration

Panduan lengkap untuk mengintegrasikan **Live Chat Widget** di website customer Nanda Motor yang terhubung dengan WhatsApp admin.

---

## 🎯 Overview

Fitur ini memungkinkan customer **tanpa WhatsApp** untuk chat langsung dari website, dan admin menerima/reply via WhatsApp.

### Flow Komunikasi:

```
Customer Website → Live Chat Widget → Bot API → WhatsApp Admin
                                                      ↓
Customer Website ← Live Chat Widget ← Bot API ← Admin Reply
```

### Keuntungan:

- ✅ Customer tanpa WhatsApp bisa chat
- ✅ Admin tetap pakai WhatsApp (familiar)
- ✅ Chat history tersimpan di database
- ✅ Real-time notification untuk admin
- ✅ Mudah di-maintain

---

## 📊 Arsitektur

```
┌─────────────────────────────────────┐
│  Website Nanda Motor (Customer)     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Live Chat Widget             │  │
│  │  - Input message              │  │
│  │  - Display conversation       │  │
│  │  - Typing indicator           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │ HTTP POST
              │ /webhook/web-chat
              ↓
┌─────────────────────────────────────┐
│  WhatsApp Bot (Port 5000)           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  WebChatService               │  │
│  │  - Store message              │  │
│  │  - Forward to admin           │  │
│  └───────────────────────────────┘  │
│              ↓                      │
│  ┌───────────────────────────────┐  │
│  │  MySQL: web_chats table       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │ WhatsApp Message
              ↓
┌─────────────────────────────────────┐
│  Admin WhatsApp                     │
│                                     │
│  🌐 LIVE CHAT WEBSITE               │
│  ━━━━━━━━━━━━━━━━━━━━             │
│  👤 Nama: John Doe                  │
│  📧 Email: john@example.com         │
│  🆔 Session: abc123                 │
│  💬 Pesan: Harga motor X berapa?    │
│  ━━━━━━━━━━━━━━━━━━━━             │
│  Reply via admin panel website      │
└─────────────────────────────────────┘
```

---

## 🗄️ Database Schema

Table `web_chats` sudah otomatis dibuat saat bot start (jika `DB_MODE=mysql`).

```sql
CREATE TABLE IF NOT EXISTS web_chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    direction ENUM('incoming', 'outgoing') NOT NULL,
    admin_name VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    INDEX idx_session (session_id),
    INDEX idx_created (created_at),
    INDEX idx_read (is_read),
    INDEX idx_direction (direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔧 Setup Bot

### 1. Update `.env`

Tambahkan nomor WhatsApp admin:

```env
# Admin WhatsApp Number (untuk terima web live chat)
# Format: 628123456789 (tanpa + atau -)
ADMIN_WHATSAPP=628531462xxxx
```

### 2. Restart Bot

```bash
pm2 restart wa-bot

# Atau jika dev mode:
npm start
```

Bot akan auto-initialize `WebChatService` dan siap terima messages dari website.

---

## 🌐 Implementasi di Website

### 1. Live Chat Widget (Frontend)

Tambahkan widget di halaman customer website.

**File: `FrontEnd/chat-widget.html`**

```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Chat - Nanda Motor</title>
    <style>
        /* Chat Widget Button */
        .chat-widget-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: transform 0.3s;
        }

        .chat-widget-button:hover {
            transform: scale(1.1);
        }

        .chat-widget-button svg {
            width: 30px;
            height: 30px;
            fill: white;
        }

        /* Chat Badge (unread count) */
        .chat-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            font-size: 12px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 10px;
            display: none;
        }

        .chat-badge.show {
            display: block;
        }

        /* Chat Window */
        .chat-window {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 380px;
            height: 550px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: none;
            flex-direction: column;
            z-index: 1000;
            overflow: hidden;
        }

        .chat-window.show {
            display: flex;
        }

        /* Chat Header */
        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chat-header h3 {
            margin: 0;
            font-size: 18px;
        }

        .chat-header button {
            background: transparent;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
        }

        /* Chat Messages */
        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f9fafb;
        }

        .message {
            margin-bottom: 15px;
            display: flex;
            align-items: flex-start;
        }

        .message.incoming {
            flex-direction: row;
        }

        .message.outgoing {
            flex-direction: row-reverse;
        }

        .message-bubble {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
        }

        .message.incoming .message-bubble {
            background: white;
            color: #1f2937;
            border-bottom-left-radius: 4px;
        }

        .message.outgoing .message-bubble {
            background: #667eea;
            color: white;
            border-bottom-right-radius: 4px;
        }

        .message-time {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 4px;
        }

        /* Chat Form (Customer Info) */
        .chat-form {
            padding: 20px;
            background: white;
        }

        .chat-form input {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }

        .chat-form button {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 600;
        }

        .chat-form button:hover {
            background: #5a67d8;
        }

        /* Chat Input */
        .chat-input {
            padding: 15px;
            border-top: 1px solid #e5e7eb;
            background: white;
            display: flex;
            gap: 10px;
        }

        .chat-input input {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            font-size: 14px;
        }

        .chat-input button {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .chat-input button:hover {
            background: #5a67d8;
        }

        /* Typing Indicator */
        .typing-indicator {
            display: none;
            padding: 10px 20px;
            color: #6b7280;
            font-size: 13px;
            font-style: italic;
        }

        .typing-indicator.show {
            display: block;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
            .chat-window {
                width: 100%;
                height: 100%;
                bottom: 0;
                right: 0;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <!-- Chat Widget Button -->
    <div class="chat-widget-button" id="chatButton">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <span class="chat-badge" id="chatBadge">0</span>
    </div>

    <!-- Chat Window -->
    <div class="chat-window" id="chatWindow">
        <!-- Chat Header -->
        <div class="chat-header">
            <h3>💬 Live Chat</h3>
            <button id="closeChat">&times;</button>
        </div>

        <!-- Customer Info Form (shown first time) -->
        <div class="chat-form" id="chatForm">
            <h4 style="margin-top: 0;">Mulai Chat</h4>
            <input type="text" id="customerName" placeholder="Nama Anda" required>
            <input type="email" id="customerEmail" placeholder="Email Anda" required>
            <input type="tel" id="customerPhone" placeholder="No. HP (opsional)">
            <button id="startChat">Mulai Chat</button>
        </div>

        <!-- Chat Messages -->
        <div class="chat-messages" id="chatMessages" style="display: none;"></div>
        
        <!-- Typing Indicator -->
        <div class="typing-indicator" id="typingIndicator">Admin sedang mengetik...</div>

        <!-- Chat Input -->
        <div class="chat-input" id="chatInput" style="display: none;">
            <input type="text" id="messageInput" placeholder="Ketik pesan...">
            <button id="sendMessage">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
            </button>
        </div>
    </div>

    <script src="chat-widget.js"></script>
</body>
</html>
```

**File: `FrontEnd/chat-widget.js`**

```javascript
/**
 * Live Chat Widget JavaScript
 */

const BOT_API = 'http://localhost:5000'; // Sesuaikan dengan URL bot
const BACKEND_API = 'http://localhost:3000'; // Sesuaikan dengan URL backend

class ChatWidget {
    constructor() {
        this.sessionId = this.getOrCreateSessionId();
        this.customerInfo = this.loadCustomerInfo();
        this.messages = [];
        this.pollInterval = null;
        
        this.init();
    }

    init() {
        // Elements
        this.chatButton = document.getElementById('chatButton');
        this.chatWindow = document.getElementById('chatWindow');
        this.closeButton = document.getElementById('closeChat');
        this.chatForm = document.getElementById('chatForm');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendMessage');
        this.startChatButton = document.getElementById('startChat');
        this.badge = document.getElementById('chatBadge');

        // Event listeners
        this.chatButton.addEventListener('click', () => this.toggleChat());
        this.closeButton.addEventListener('click', () => this.closeChat());
        this.startChatButton.addEventListener('click', () => this.handleStartChat());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // If customer info exists, skip form
        if (this.customerInfo) {
            this.showChatInterface();
            this.loadMessages();
            this.startPolling();
        }
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('chat_session_id');
        if (!sessionId) {
            sessionId = `WEB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('chat_session_id', sessionId);
        }
        return sessionId;
    }

    loadCustomerInfo() {
        const info = localStorage.getItem('chat_customer_info');
        return info ? JSON.parse(info) : null;
    }

    saveCustomerInfo(info) {
        localStorage.setItem('chat_customer_info', JSON.stringify(info));
        this.customerInfo = info;
    }

    toggleChat() {
        this.chatWindow.classList.toggle('show');
        if (this.chatWindow.classList.contains('show')) {
            this.messageInput.focus();
            this.resetBadge();
        }
    }

    closeChat() {
        this.chatWindow.classList.remove('show');
    }

    handleStartChat() {
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        if (!name || !email) {
            alert('Nama dan email harus diisi');
            return;
        }

        this.saveCustomerInfo({ name, email, phone });
        this.showChatInterface();
        this.loadMessages();
        this.startPolling();
    }

    showChatInterface() {
        this.chatForm.style.display = 'none';
        this.chatMessages.style.display = 'block';
        this.chatInput.style.display = 'flex';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Clear input
        this.messageInput.value = '';

        // Add message to UI (optimistic)
        this.addMessageToUI({
            message,
            direction: 'outgoing',
            created_at: new Date().toISOString()
        });

        // Send to server
        try {
            const response = await fetch(`${BOT_API}/webhook/web-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    message: message,
                    customerName: this.customerInfo.name,
                    customerEmail: this.customerInfo.email,
                    customerPhone: this.customerInfo.phone
                })
            });

            const result = await response.json();
            if (!result.success) {
                console.error('Error sending message:', result.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Gagal mengirim pesan. Coba lagi.');
        }
    }

    async loadMessages() {
        try {
            const response = await fetch(`${BOT_API}/api/web-chats/${this.sessionId}`);
            const result = await response.json();

            if (result.success) {
                this.messages = result.data;
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        this.chatMessages.innerHTML = '';
        
        if (this.messages.length === 0) {
            this.chatMessages.innerHTML = `
                <div style="text-align: center; color: #6b7280; padding: 40px 20px;">
                    <p>👋 Halo! Ada yang bisa kami bantu?</p>
                </div>
            `;
            return;
        }

        this.messages.forEach(msg => this.addMessageToUI(msg));
        this.scrollToBottom();
    }

    addMessageToUI(msg) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.direction}`;

        const time = new Date(msg.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div class="message-bubble">
                ${this.escapeHtml(msg.message)}
                <div class="message-time">${time}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    startPolling() {
        // Poll for new messages every 3 seconds
        this.pollInterval = setInterval(() => {
            this.loadMessages();
        }, 3000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    resetBadge() {
        this.badge.textContent = '0';
        this.badge.classList.remove('show');
    }

    updateBadge(count) {
        if (count > 0) {
            this.badge.textContent = count;
            this.badge.classList.add('show');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize widget
const chatWidget = new ChatWidget();
```

### 2. Embed Widget ke Website

Tambahkan ke semua halaman customer (misal di `footer.html`):

```html
<!-- Live Chat Widget -->
<script src="/chat-widget.js"></script>
<style>
    /* Import dari chat-widget.html */
</style>
<div id="chat-widget-container"></div>
```

Atau gunakan iframe:

```html
<iframe src="/chat-widget.html" style="position: fixed; bottom: 0; right: 0; width: 400px; height: 600px; border: none; z-index: 9999;"></iframe>
```

---

## 🔐 Backend Integration (Website Backend)

### Update `server.js`

Tambahkan proxy routes untuk web chat:

```javascript
// Proxy untuk web chat API
app.get('/api/web-chats', async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API}/api/web-chats`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/web-chats/:sessionId', async (req, res) => {
    try {
        const response = await axios.get(`${BOT_API}/api/web-chats/${req.params.sessionId}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/web-chats/:sessionId/reply', async (req, res) => {
    try {
        const response = await axios.post(
            `${BOT_API}/api/web-chats/${req.params.sessionId}/reply`,
            req.body
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

---

## 💬 Admin Panel untuk Web Chat

Buat halaman admin untuk monitor dan reply web chat.

**File: `FrontEnd/admin/web-chat-panel.html`**

```html
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Web Live Chat - Admin Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
                <h1 class="text-2xl font-bold text-white">🌐 Web Live Chat</h1>
                <p class="text-purple-100">Monitor dan reply chat dari website</p>
            </div>

            <div class="grid grid-cols-12 divide-x h-screen">
                <!-- Sessions List -->
                <div class="col-span-4 overflow-y-auto">
                    <div class="p-4">
                        <input type="text" id="searchSessions" placeholder="Cari session..." 
                               class="w-full px-4 py-2 border rounded-lg mb-4">
                        <div id="sessionsList"></div>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div class="col-span-8 flex flex-col">
                    <div id="chatHeader" class="p-4 bg-gray-50 border-b">
                        <p class="text-gray-500">Pilih session untuk lihat chat</p>
                    </div>
                    
                    <div id="chatMessages" class="flex-1 p-4 overflow-y-auto bg-gray-50"></div>
                    
                    <div id="chatReply" class="p-4 border-t bg-white" style="display: none;">
                        <div class="flex gap-2">
                            <input type="text" id="replyInput" placeholder="Ketik balasan..." 
                                   class="flex-1 px-4 py-2 border rounded-lg">
                            <button id="sendReply" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                Kirim
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const BOT_API = 'http://localhost:5000';
        let currentSessionId = null;
        let sessions = [];

        // Load sessions
        async function loadSessions() {
            const response = await fetch(`${BOT_API}/api/web-chats`);
            const result = await response.json();
            sessions = result.data;
            renderSessions();
        }

        // Render sessions list
        function renderSessions() {
            const html = sessions.map(session => `
                <div class="p-4 border-b hover:bg-gray-50 cursor-pointer session-item" data-session="${session.session_id}">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold">${session.customer_name || 'Anonymous'}</h3>
                            <p class="text-sm text-gray-600">${session.customer_email || ''}</p>
                        </div>
                        ${session.unread_count > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">${session.unread_count}</span>` : ''}
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                        ${session.message_count} pesan • ${new Date(session.last_message_at).toLocaleString('id-ID')}
                    </p>
                </div>
            `).join('');
            
            document.getElementById('sessionsList').innerHTML = html;

            // Add click handlers
            document.querySelectorAll('.session-item').forEach(el => {
                el.addEventListener('click', () => {
                    loadSession(el.dataset.session);
                });
            });
        }

        // Load session messages
        async function loadSession(sessionId) {
            currentSessionId = sessionId;
            
            const response = await fetch(`${BOT_API}/api/web-chats/${sessionId}`);
            const result = await response.json();
            
            if (result.success) {
                renderMessages(result.data);
                document.getElementById('chatReply').style.display = 'flex';
                
                // Mark as read
                await fetch(`${BOT_API}/api/web-chats/${sessionId}/read`, { method: 'POST' });
            }
        }

        // Render messages
        function renderMessages(messages) {
            const html = messages.map(msg => `
                <div class="mb-4 ${msg.direction === 'outgoing' ? 'text-right' : 'text-left'}">
                    <div class="inline-block px-4 py-2 rounded-lg ${msg.direction === 'outgoing' ? 'bg-purple-600 text-white' : 'bg-white border'}">
                        ${msg.message}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${new Date(msg.created_at).toLocaleTimeString('id-ID')}
                    </div>
                </div>
            `).join('');
            
            document.getElementById('chatMessages').innerHTML = html;
            document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
        }

        // Send reply
        document.getElementById('sendReply').addEventListener('click', async () => {
            const message = document.getElementById('replyInput').value.trim();
            if (!message || !currentSessionId) return;

            const response = await fetch(`${BOT_API}/api/web-chats/${currentSessionId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, adminName: 'Admin' })
            });

            if (response.ok) {
                document.getElementById('replyInput').value = '';
                loadSession(currentSessionId);
            }
        });

        // Auto-refresh
        setInterval(loadSessions, 5000);
        loadSessions();
    </script>
</body>
</html>
```

---

## ✅ Testing

### 1. Test dari Customer Website

1. Buka halaman dengan live chat widget
2. Klik tombol chat
3. Isi nama dan email
4. Kirim pesan: "Halo, harga motor X berapa?"

### 2. Cek WhatsApp Admin

Admin akan terima notifikasi di WhatsApp:

```
🌐 LIVE CHAT WEBSITE
━━━━━━━━━━━━━━━━━━━━

👤 Nama: John Doe
📧 Email: john@example.com
🆔 Session: WEB_1234567890_abc123
🕒 Waktu: 14/12/2025, 10:30

💬 Pesan:
Halo, harga motor X berapa?

━━━━━━━━━━━━━━━━━━━━
Reply via admin panel website untuk membalas customer
```

### 3. Reply dari Admin Panel

1. Buka admin panel: `/admin/web-chat-panel.html`
2. Pilih session customer
3. Ketik balasan: "Harga motor X: Rp 25.000.000"
4. Kirim

### 4. Cek Widget Customer

Customer akan langsung terima balasan di widget chat.

---

## 📡 API Endpoints (Web Chat)

### Receive Message from Website

```bash
POST /webhook/web-chat
Content-Type: application/json

{
  "sessionId": "WEB_1234567890_abc123",
  "message": "Halo, harga motor X berapa?",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "081234567890"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "WEB_1234567890_xyz789",
    "timestamp": "2025-12-14T10:30:00.000Z",
    "forwardedToAdmin": true
  }
}
```

### Get All Sessions

```bash
GET /api/web-chats
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "session_id": "WEB_1234567890_abc123",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "last_message_at": "2025-12-14T10:30:00.000Z",
      "message_count": 5,
      "unread_count": 2
    }
  ]
}
```

### Get Session Messages

```bash
GET /api/web-chats/:sessionId
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "message_id": "WEB_1234567890_xyz789",
      "session_id": "WEB_1234567890_abc123",
      "message": "Halo, harga motor X berapa?",
      "direction": "incoming",
      "created_at": "2025-12-14T10:30:00.000Z",
      "is_read": false
    }
  ]
}
```

### Send Reply

```bash
POST /api/web-chats/:sessionId/reply
Content-Type: application/json

{
  "message": "Harga motor X: Rp 25.000.000",
  "adminName": "Admin Support"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "WEB_1234567891_def456",
    "timestamp": "2025-12-14T10:31:00.000Z"
  }
}
```

---

## 🎨 Customization

### Widget Styling

Edit CSS di `chat-widget.html` untuk sesuaikan dengan brand:

```css
/* Ubah gradient color */
.chat-widget-button {
    background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
}

/* Ubah accent color */
.message.outgoing .message-bubble {
    background: #FF6B35;
}
```

### Auto-Reply Message

Tambahkan welcome message otomatis saat customer buka chat pertama kali.

---

## 🔐 Security

### 1. Validasi Webhook Secret

```javascript
// Di bot WebhookHandler
app.post('/webhook/web-chat', (req, res, next) => {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
```

### 2. Rate Limiting

Batasi request untuk mencegah spam:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 10, // max 10 messages
    message: 'Terlalu banyak pesan, coba lagi nanti'
});

app.post('/webhook/web-chat', chatLimiter, async (req, res) => {
    // ...
});
```

---

## 📊 Monitoring

### Get Statistics

```bash
GET /api/web-chats/stats/summary
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_sessions": 45,
    "total_messages": 320,
    "total_unread": 12,
    "messages_today": 87
  }
}
```

---

## ❓ FAQ

### Q: Apakah customer harus punya WhatsApp?
**A:** Tidak. Customer chat dari website browser, admin reply via WhatsApp.

### Q: Bagaimana jika admin tidak online di WhatsApp?
**A:** Messages tetap tersimpan di database. Admin bisa reply nanti via admin panel.

### Q: Apakah bisa multi-admin?
**A:** Ya, semua admin dengan akses ke admin panel bisa reply.

### Q: Chat history tersimpan berapa lama?
**A:** Permanen di database MySQL. Bisa di-purge manual jika perlu.

---

## 🚀 Next Steps

1. ✅ Setup bot dengan `ADMIN_WHATSAPP`
2. ✅ Restart bot
3. ✅ Copy widget code ke website
4. ✅ Test end-to-end
5. ✅ Customize styling sesuai brand
6. ✅ Add admin panel ke menu website
7. ✅ Monitor dan reply customer chats

---

**🎉 Selesai! Web Live Chat sudah siap digunakan.**

Customer dapat chat dari website, dan admin terima/reply via WhatsApp atau admin panel! 🚀
