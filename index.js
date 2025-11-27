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
    console.log('Browser mengakses endpoint');
    if (!latestQR) {
        return res.send('<h2>QR belum tersedia</h2><p>Tunggu, lalu refresh.</p><script>setTimeout(() => location.reload(), 3000);</script>');
    }
    QRCode.toDataURL(latestQR, (err, url) => {
        if (err) return res.send('Gagal membuat QR');
        res.send('<h2>Scan QR WhatsApp</h2><img src="' + url + '" style="max-width: 400px;" /><p>QR refresh otomatis</p><script>setTimeout(() => location.reload(), 20000);</script>');
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server web berjalan di http://localhost:3000');
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
