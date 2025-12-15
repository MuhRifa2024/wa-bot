const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal'); // Not used: QR only shown in browser
const express = require('express');
const QRCode = require('qrcode');
const math = require('mathjs');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config(); // Load environment variables

// Import Database & Services
const DatabaseFactory = require('./lib/database/DatabaseFactory');
const ProductServiceV2 = require('./lib/services/ProductServiceV2');
const OrderService = require('./lib/services/OrderService');
const CustomerService = require('./lib/services/CustomerService');
const ChatService = require('./lib/services/ChatService');
const WebChatService = require('./lib/services/WebChatService');
const EcommerceHandlers = require('./lib/handlers/EcommerceHandlers');
const WebhookHandler = require('./lib/utils/WebhookHandler');
const MessageParser = require('./lib/utils/MessageParser');

// Initialize Database (if MySQL mode)
let dbAdapter = null;
let whatsappClient = null; // Store client reference

async function initializeDatabase() {
    const dbMode = DatabaseFactory.getMode();
    console.log(`🗄️  Database Mode: ${dbMode.toUpperCase()}`);
    
    if (DatabaseFactory.isMySQLMode()) {
        try {
            dbAdapter = await DatabaseFactory.createAdapter();
            console.log('✅ MySQL database connected');
        } catch (error) {
            console.error('❌ MySQL connection failed:', error.message);
            console.log('⚠️  Falling back to JSON mode');
            process.env.DB_MODE = 'json';
        }
    } else {
        console.log('📁 Using JSON file storage (standalone mode)');
    }
}

// Initialize services (will be set after DB init)
let productService;
let orderService;
let customerService;
let chatService;
let webChatService;
let ecommerceHandlers;
let webhookHandler;

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

// Load triggers on startup (if file exists)
if (fs.existsSync(triggersPath)) {
    loadTriggers();
    // Watch for trigger file changes (hot reload)
    fs.watch(triggersPath, (eventType) => {
        if (eventType === 'change') {
            console.log('🔄 Triggers file changed, reloading...');
            loadTriggers();
        }
    });
} else {
    console.log('ℹ️  triggers.json not found, using handlers only');
}

// Initialize all services
async function initializeServices() {
    console.log('🔄 Initializing services...');
    
    // Initialize database first
    await initializeDatabase();
    
    // Initialize ProductService (V2 with MySQL support)
    productService = new ProductServiceV2(dbAdapter);
    await productService.initialize();
    
    // Initialize other services
    orderService = new OrderService();
    await orderService.initialize();
    
    customerService = new CustomerService();
    await customerService.initialize();
    
    chatService = new ChatService();
    await chatService.initialize();
    
    // Initialize WebChatService (for live chat from website)
    webChatService = new WebChatService(dbAdapter, whatsappClient);
    await webChatService.initialize();
    
    // Initialize handlers with all services
    ecommerceHandlers = new EcommerceHandlers(productService, orderService, customerService);
    webhookHandler = new WebhookHandler(
        productService, 
        orderService, 
        customerService, 
        chatService,
        webChatService
    );
    
    console.log('✅ All services initialized');
    console.log(`📦 Products loaded: ${productService.getAllProducts().length}`);
    
    if (DatabaseFactory.isMySQLMode()) {
        console.log('🔗 Bot connected to MySQL database');
        console.log('🌐 Website integration: ACTIVE');
        console.log('💬 Web live chat: ENABLED');
    }
}

let latestQR = null;

const app = express();

// Middleware for JSON parsing
app.use(express.json());

// Setup webhook and API routes (after services initialized)
async function setupRoutes() {
    webhookHandler.setupRoutes(app);
    webhookHandler.setupAPI(app);
    console.log('✅ API routes configured');
}

app.get('/', (req, res) => {
        // Serve a lightweight page that subscribes to server-sent events (SSE)
        // Browser will open a single persistent connection and only update when server pushes a new QR
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`
                <html>
                <head>
                    <title>WhatsApp QR</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .connected { color: green; font-weight: bold; }
                        .waiting { color: orange; }
                        .qr-box { margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <h2>Status WhatsApp Bot</h2>
                    <div id="status" class="waiting">Menunggu status...</div>
                    <div id="qr-box" class="qr-box" style="display:none;">
                        <h3>Scan QR Code</h3>
                        <img id="qr" style="max-width:400px; display:block; margin-top:8px;" />
                    </div>
                    <script>
                        const status = document.getElementById('status');
                        const img = document.getElementById('qr');
                        const qrBox = document.getElementById('qr-box');
                        const ev = new EventSource('/events');
                        
                        ev.onopen = () => { 
                            status.innerText = 'Menghubungi server...'; 
                        };
                        
                        ev.onmessage = (e) => {
                            try {
                                const data = JSON.parse(e.data);
                                
                                if (data.type === 'authenticated') {
                                    status.className = 'connected';
                                    status.innerText = '✅ Bot sudah terhubung dengan WhatsApp!';
                                    qrBox.style.display = 'none';
                                } else if (data.type === 'qr') {
                                    status.className = 'waiting';
                                    status.innerText = '⏳ QR Code siap. Silakan scan dengan WhatsApp.';
                                    img.src = data.qr;
                                    qrBox.style.display = 'block';
                                } else if (data.type === 'ready') {
                                    status.className = 'connected';
                                    status.innerText = '✅ Bot aktif dan siap menerima pesan!';
                                    qrBox.style.display = 'none';
                                }
                            } catch (err) {
                                console.error('Failed to parse SSE data', err);
                            }
                        };
                        
                        ev.onerror = (err) => { 
                            status.className = 'waiting';
                            status.innerText = '⚠️ Koneksi terputus. Coba refresh halaman.'; 
                        };
                    </script>
                </body>
                </html>
        `);
});

// Server-Sent Events: maintain connected clients and push QR updates only when available
const sseClients = [];
let botIsAuthenticated = false;
let botIsReady = false;

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

        // Send current status immediately
        if (botIsReady) {
                res.write(`data: ${JSON.stringify({ type: 'ready' })}\n\n`);
        } else if (botIsAuthenticated) {
                res.write(`data: ${JSON.stringify({ type: 'authenticated' })}\n\n`);
        } else if (latestQR) {
                // If we already have a QR, send it immediately
                QRCode.toDataURL(latestQR, (err, url) => {
                        if (!err && url) {
                                res.write(`data: ${JSON.stringify({ type: 'qr', qr: url })}\n\n`);
                        }
                });
        }

        // Remove client on close
        req.on('close', () => {
                const idx = sseClients.indexOf(res);
                if (idx !== -1) sseClients.splice(idx, 1);
        });
});

const PORT = process.env.BOT_PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server web berjalan di http://localhost:${PORT}`);
    console.log(`📡 API Endpoint: http://localhost:${PORT}/api`);
    console.log(`🔗 Webhook: http://localhost:${PORT}/webhook`);
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
    console.log('📱 QR CODE tersedia di browser: http://localhost:' + (process.env.BOT_PORT || 5000));
    latestQR = qr;
    botIsAuthenticated = false;
    botIsReady = false;
    // qrcode.generate(qr, { small: true }); // Disabled: QR only shown in browser

    // Convert QR text to data URL image and push to SSE clients
    QRCode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Gagal membuat dataURL untuk QR:', err);
            return;
        }
        // Broadcast to all connected SSE clients
        const message = JSON.stringify({ type: 'qr', qr: url });
        for (const res of sseClients) {
            try {
                res.write(`data: ${message}\n\n`);
            } catch (e) {
                // ignore write errors; client cleanup will remove closed connections
            }
        }
    });
});

client.on('ready', async () => {
    console.log('✅ Bot terkoneksi ke WhatsApp dan siap!');
    whatsappClient = client; // Store reference
    botIsReady = true;
    
    // Update WebChatService with WhatsApp client
    if (webChatService) {
        webChatService.whatsappClient = client;
    }
    
    // Broadcast ready status to all SSE clients
    const message = JSON.stringify({ type: 'ready' });
    for (const res of sseClients) {
        try {
            res.write(`data: ${message}\n\n`);
        } catch (e) {
            // ignore
        }
    }
    
    // Start notification sender
    startNotificationSender();
});

client.on('authenticated', () => {
    console.log('✅ Autentikasi berhasil (session tersimpan)');
    botIsAuthenticated = true;
    
    // Broadcast authenticated status to all SSE clients
    const message = JSON.stringify({ type: 'authenticated' });
    for (const res of sseClients) {
        try {
            res.write(`data: ${message}\n\n`);
        } catch (e) {
            // ignore
        }
    }
});

client.on('auth_failure', async (msg) => {
    console.error('❌ Autentikasi gagal:', msg);
    console.log('🔄 Menghapus session dan restart untuk generate QR baru...');
    
    try {
        // Destroy client
        await client.destroy().catch(() => {});
        
        // Delete session folder
        const sessionPath = path.join(__dirname, '.wwebjs_auth');
        const cachePath = path.join(__dirname, '.wwebjs_cache');
        
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('✅ Session folder dihapus');
        }
        
        if (fs.existsSync(cachePath)) {
            fs.rmSync(cachePath, { recursive: true, force: true });
            console.log('✅ Cache folder dihapus');
        }
        
        // Restart in 3 seconds
        console.log('⏳ Restarting dalam 3 detik...');
        setTimeout(() => {
            process.exit(1); // Exit with error code, PM2/nodemon will restart
        }, 3000);
        
    } catch (error) {
        console.error('Error saat cleanup:', error);
        process.exit(1);
    }
});

client.on('disconnected', async (reason) => {
    console.log('⚠️  Bot terputus:', reason);
    
    // Auto-recovery untuk LOGOUT atau CONNECTION_LOST
    if (reason === 'LOGOUT' || reason === 'NAVIGATION') {
        console.log('🔄 Mendeteksi logout/navigation, menghapus session untuk QR baru...');
        
        try {
            // Delete session folder
            const sessionPath = path.join(__dirname, '.wwebjs_auth');
            const cachePath = path.join(__dirname, '.wwebjs_cache');
            
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log('✅ Session folder dihapus');
            }
            
            if (fs.existsSync(cachePath)) {
                fs.rmSync(cachePath, { recursive: true, force: true });
                console.log('✅ Cache folder dihapus');
            }
            
            // Restart in 2 seconds
            console.log('⏳ Restarting dalam 2 detik untuk generate QR baru...');
            setTimeout(() => {
                process.exit(1); // Exit, PM2/nodemon will auto restart
            }, 2000);
            
        } catch (error) {
            console.error('Error saat cleanup:', error);
            process.exit(1);
        }
    } else {
        // For other disconnect reasons, just try to reconnect
        console.log('🔄 Mencoba reconnect...');
        botIsReady = false;
        botIsAuthenticated = false;
    }
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

console.log('🚀 Memulai WhatsApp Bot...');
console.log('═══════════════════════════════════════');

// Initialize services first, then setup routes, then start client
initializeServices()
    .then(() => setupRoutes())
    .then(() => {
        console.log('✅ Bot initialization complete');
        console.log('═══════════════════════════════════════');
        client.initialize();
    })
    .catch(error => {
        console.error('❌ Failed to initialize:', error);
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
