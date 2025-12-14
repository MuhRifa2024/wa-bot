const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const QRCode = require('qrcode');
const math = require('mathjs');
const fs = require('fs');
const path = require('path');

// Import E-commerce modules
const ProductService = require('./lib/services/ProductService');
const OrderService = require('./lib/services/OrderService');
const CustomerService = require('./lib/services/CustomerService');
const ChatService = require('./lib/services/ChatService');
const EcommerceHandlers = require('./lib/handlers/EcommerceHandlers');
const WebhookHandler = require('./lib/utils/WebhookHandler');
const MessageParser = require('./lib/utils/MessageParser');

// Initialize services
const productService = new ProductService();
const orderService = new OrderService();
const customerService = new CustomerService();
const chatService = new ChatService();

// Initialize handlers
const ecommerceHandlers = new EcommerceHandlers(productService, orderService, customerService);
const webhookHandler = new WebhookHandler(productService, orderService, customerService, chatService);

// Load dynamic triggers
const triggersPath = path.join(__dirname, 'triggers.json');
let triggers = { commands: [], keywords: [], patterns: [] };

function loadTriggers() {
    try {
        const data = fs.readFileSync(triggersPath, 'utf8');
        triggers = JSON.parse(data);
        console.log('✅ Triggers loaded:', {
            commands: triggers.commands?.length || 0,
            keywords: triggers.keywords?.length || 0,
            patterns: triggers.patterns?.length || 0
        });
    } catch (error) {
        console.error('❌ Error loading triggers:', error.message);
    }
}

// Load triggers on startup
loadTriggers();

// Watch for trigger file changes (hot reload)
fs.watch(triggersPath, (eventType) => {
    if (eventType === 'change') {
        console.log('🔄 Triggers file changed, reloading...');
        loadTriggers();
    }
});

// Initialize all services
async function initializeServices() {
    console.log('🔄 Initializing services...');
    await productService.initialize();
    await orderService.initialize();
    await customerService.initialize();
    await chatService.initialize();
    console.log('✅ All services initialized');
}

let latestQR = null;
let whatsappClient = null; // Store client reference for notifications

const app = express();

// Middleware for JSON parsing
app.use(express.json());

// Setup webhook and API routes
webhookHandler.setupRoutes(app);
webhookHandler.setupAPI(app);

app.get('/', (req, res) => {
        // Serve a lightweight page that subscribes to server-sent events (SSE)
        // Browser will open a single persistent connection and only update when server pushes a new QR
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`
                <html>
                <head><title>WhatsApp QR</title></head>
                <body>
                    <h2>Scan QR WhatsApp</h2>
                    <div id="status">Menunggu QR...</div>
                    <img id="qr" style="max-width:400px; display:block; margin-top:8px;" />
                    <script>
                        const status = document.getElementById('status');
                        const img = document.getElementById('qr');
                        const ev = new EventSource('/events');
                        ev.onopen = () => { status.innerText = 'Terhubung, menunggu QR...'; };
                        ev.onmessage = (e) => {
                            try {
                                const data = e.data;
                                if (!data) return;
                                img.src = data;
                                status.innerText = 'QR diterima. Scan dengan WhatsApp.';
                            } catch (err) {
                                console.error('Failed to parse SSE data', err);
                            }
                        };
                        ev.onerror = (err) => { status.innerText = 'Koneksi terputus. Coba refresh halaman.'; };
                    </script>
                </body>
                </html>
        `);
});

// Server-Sent Events: maintain connected clients and push QR updates only when available
const sseClients = [];
app.get('/events', (req, res) => {
        // Set SSE headers
        res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
        });
        res.write('\n');
        // Add to clients
        sseClients.push(res);

        // If we already have a QR, send it immediately
        if (latestQR) {
                QRCode.toDataURL(latestQR, (err, url) => {
                        if (!err && url) res.write(`data: ${url}\n\n`);
                });
        }

        // Remove client on close
        req.on('close', () => {
                const idx = sseClients.indexOf(res);
                if (idx !== -1) sseClients.splice(idx, 1);
        });
});

app.listen(5000, '0.0.0.0', () => {
    console.log('Server web berjalan di http://localhost:5000');
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('QR CODE DITERIMA!');
    latestQR = qr;
    qrcode.generate(qr, { small: true });

    // Convert QR text to data URL image and push to SSE clients
    QRCode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Gagal membuat dataURL untuk QR:', err);
            return;
        }
        // Broadcast to all connected SSE clients
        for (const res of sseClients) {
            try {
                res.write(`data: ${url}\n\n`);
            } catch (e) {
                // ignore write errors; client cleanup will remove closed connections
            }
        }
    });
});

client.on('ready', () => {
    console.log('Bot terkoneksi ke WhatsApp');
    whatsappClient = client; // Store reference
    
    // Start notification sender
    startNotificationSender();
});

client.on('authenticated', () => {
    console.log('Autentikasi berhasil');
});

client.on('auth_failure', (msg) => {
    console.error('Autentikasi gagal:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Bot terputus:', reason);
});

client.on('message', async (msg) => {
    try {
        // Cek apakah pesan dari bot sendiri
        if (msg.fromMe) return;
        
        // Cek grup lebih cepat: cek format ID
        if (msg.from.endsWith('@g.us')) {
            console.log('Pesan dari grup diabaikan');
            return;
        }
        
        const sender = msg.from;
        const pesan = msg.body;
        const pesanLower = pesan?.toLowerCase() || '';
        
        console.log('📩 ' + sender + ': ' + pesan);
        
        // Save incoming message to chat history
        await chatService.addMessage(sender, pesan, 'incoming', {
            messageId: msg.id.id,
            timestamp: msg.timestamp
        });
        
        // ========================================
        // E-COMMERCE COMMAND ROUTING
        // ========================================
        
        // Check if customer is in checkout flow
        const session = ecommerceHandlers.getSession(sender);
        if (session.state !== 'idle') {
            const handled = await ecommerceHandlers.handleCheckoutFlow(msg, pesan);
            if (handled) return;
        }
        
        // Parse command
        const parsed = MessageParser.parseCommand(pesan);
        
        if (parsed) {
            const { command, args } = parsed;
            
            // Route to appropriate handler
            switch (command) {
                case 'KATALOG':
                case 'CATALOG':
                    await ecommerceHandlers.handleCatalog(msg, args);
                    return;
                
                case 'KATEGORI':
                case 'CATEGORY':
                    if (args.length > 0) {
                        await ecommerceHandlers.handleCatalog(msg, args);
                    } else {
                        await ecommerceHandlers.handleCategories(msg);
                    }
                    return;
                
                case 'PRODUK':
                case 'PRODUCT':
                    if (args.length > 0) {
                        await ecommerceHandlers.handleProductDetail(msg, args[0]);
                    } else {
                        await msg.reply('💬 Ketik *PRODUK <kode>* untuk melihat detail produk\nContoh: PRODUK TSH001');
                    }
                    return;
                
                case 'CARI':
                case 'SEARCH':
                    if (args.length > 0) {
                        await ecommerceHandlers.handleSearch(msg, args.join(' '));
                    } else {
                        await msg.reply('💬 Ketik *CARI <kata kunci>* untuk mencari produk\nContoh: CARI kaos');
                    }
                    return;
                
                case 'BELI':
                case 'BUY':
                    if (args.length > 0) {
                        const buyData = MessageParser.parseBuyCommand(args);
                        await ecommerceHandlers.handleAddToCart(msg, buyData.sku, buyData.quantity);
                    } else {
                        await msg.reply('💬 Ketik *BELI <kode> <jumlah>* untuk menambah ke keranjang\nContoh: BELI TSH001 2');
                    }
                    return;
                
                case 'KERANJANG':
                case 'CART':
                    await ecommerceHandlers.handleViewCart(msg);
                    return;
                
                case 'HAPUS':
                case 'REMOVE':
                case 'DELETE':
                    if (args.length > 0) {
                        await ecommerceHandlers.handleRemoveFromCart(msg, args[0]);
                    } else {
                        await msg.reply('💬 Ketik *HAPUS <nomor>* untuk menghapus item dari keranjang\nContoh: HAPUS 1');
                    }
                    return;
                
                case 'KOSONGKAN':
                case 'CLEAR':
                    await ecommerceHandlers.handleClearCart(msg);
                    return;
                
                case 'CHECKOUT':
                case 'PESAN':
                case 'ORDER':
                    await ecommerceHandlers.handleCheckout(msg);
                    return;
                
                case 'CEK':
                case 'CHECK':
                case 'TRACK':
                    if (args.length > 0) {
                        const orderId = args[0].toUpperCase();
                        await ecommerceHandlers.handleOrderTracking(msg, orderId);
                    } else {
                        // Try to extract order ID from message
                        const orderId = MessageParser.parseOrderId(pesan);
                        if (orderId) {
                            await ecommerceHandlers.handleOrderTracking(msg, orderId);
                        } else {
                            await msg.reply('💬 Ketik *CEK <order-id>* untuk mengecek status pesanan\nContoh: CEK ORD-123ABC');
                        }
                    }
                    return;
                
                case 'PESANAN':
                case 'ORDERS':
                case 'RIWAYAT':
                case 'HISTORY':
                    await ecommerceHandlers.handleOrderHistory(msg);
                    return;
                
                case 'HELP':
                case 'MENU':
                    await ecommerceHandlers.handleHelp(msg);
                    return;
                
                case 'INFO':
                    await ecommerceHandlers.handleStoreInfo(msg);
                    return;
            }
        }
        
        // ========================================
        // FALLBACK: DYNAMIC TRIGGER SYSTEM
        // ========================================
        
        // Check for greetings
        if (MessageParser.isGreeting(pesan)) {
            await msg.reply('Halo! 👋 Selamat datang di toko kami.\n\n💬 Ketik *HELP* untuk melihat menu\n💬 Ketik *KATALOG* untuk mulai belanja');
            return;
        }
        
        // Check for thank you
        if (MessageParser.isThankYou(pesan)) {
            await msg.reply('Sama-sama! 😊 Terima kasih telah berbelanja dengan kami.');
            return;
        }
        
        // 1. Check exact commands (case-insensitive)
        for (const cmd of triggers.commands || []) {
            if (cmd.trigger.some(t => pesanLower === t.toLowerCase())) {
                let response = cmd.response;
                
                // Handle dynamic responses
                if (response === 'dynamic:time') {
                    const now = new Date();
                    response = `⏰ Waktu sekarang:\n${now.toLocaleString('id-ID', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })}`;
                }
                
                msg.reply(response);
                return;
            }
        }
        
        // 2. Check keywords (contains match)
        for (const kw of triggers.keywords || []) {
            if (kw.trigger.some(t => pesanLower.includes(t.toLowerCase()))) {
                msg.reply(kw.response);
                return;
            }
        }
        
        // 3. Check patterns (regex + handlers)
        for (const pattern of triggers.patterns || []) {
            const regex = new RegExp(pattern.trigger, 'i');
            const match = pesan?.match(regex);
            
            if (match) {
                // Handle calculator
                if (pattern.handler === 'calculate') {
                    let ekspresi = match[1] || pesan;
                    ekspresi = ekspresi.replace(/=/g, '').trim();
                    ekspresi = ekspresi.replace(/x/gi, '*');
                    ekspresi = ekspresi.replace(/√(\d+)/g, 'sqrt($1)');
                    ekspresi = ekspresi.replace(/(\d+)²/g, '($1)^2');
                    
                    try {
                        const hasil = math.evaluate(ekspresi);
                        msg.reply('📊 Hasil: ' + hasil);
                    } catch (e) {
                        // Silent fail untuk ekspresi matematika yang tidak valid
                        if (match[1]) {
                            msg.reply('❌ Format matematika tidak valid.');
                        }
                    }
                }
                return;
            }
        }
        
        // Default response: suggest help
        if (pesan.length > 5) { // Avoid responding to very short messages
            await msg.reply('Maaf, saya tidak mengerti perintah tersebut. 🤔\n\n💬 Ketik *HELP* untuk melihat menu yang tersedia.');
        }
        
    } catch (error) {
        console.error('❌ Error handling message:', error);
        try {
            await msg.reply('❌ Maaf, terjadi kesalahan. Silakan coba lagi.');
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
});

console.log('Memulai WhatsApp Bot...');

// Initialize services first, then start client
initializeServices().then(() => {
    client.initialize();
}).catch(error => {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
});

// Notification sender (sends queued notifications from webhook)
function startNotificationSender() {
    setInterval(async () => {
        if (!whatsappClient || !global.pendingNotifications) return;
        
        const notifications = global.pendingNotifications || [];
        global.pendingNotifications = [];
        
        for (const notif of notifications) {
            try {
                const chatId = notif.customerId.includes('@') 
                    ? notif.customerId 
                    : notif.customerId + '@c.us';
                
                await whatsappClient.sendMessage(chatId, notif.message);
                console.log(`✅ Notification sent to ${notif.customerId}`);
                
                // Save outgoing message to chat history
                await chatService.addMessage(notif.customerId, notif.message, 'outgoing', {
                    ...notif.metadata,
                    sentVia: 'notification'
                });
            } catch (error) {
                console.error(`❌ Failed to send notification to ${notif.customerId}:`, error);
            }
        }
    }, 5000); // Check every 5 seconds
}
