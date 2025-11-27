const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const QRCode = require('qrcode');
const math = require('mathjs');
const fs = require('fs');
const path = require('path');

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

let latestQR = null;

const app = express();
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
        
        // ========================================
        // DYNAMIC TRIGGER SYSTEM
        // ========================================
        
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
        
        // Pesan lain: bot diam
        console.log('⚠️ Tidak ada trigger yang cocok');
        
    } catch (error) {
        console.error('❌ Error handling message:', error);
    }
});

console.log('Memulai WhatsApp Bot...');
client.initialize();
