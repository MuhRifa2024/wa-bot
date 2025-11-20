const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const QRCode = require('qrcode');
const math = require('mathjs');

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
        
        // Cek grup lebih cepat: cek format ID (grup = @g.us, personal = @c.us)
        if (msg.from.endsWith('@g.us')) {
            console.log('Pesan dari grup diabaikan');
            return;
        }
        
        const sender = msg.from;
        const pesan = msg.body;
        const pesanLower = pesan?.toLowerCase() || '';
        
        console.log('📩 ' + sender + ': ' + pesan);
        
        // ========================================
        // HANYA MERESPONS TRIGGER SPESIFIK
        // ========================================
        
        // 1. Command: /help atau /menu
        if (pesanLower === '/help' || pesanLower === '/menu') {
            msg.reply(
                '🤖 *Bot Commands:*\n\n' +
                '• /help atau /menu - Tampilkan menu ini\n' +
                '• /hitung <angka> - Kalkulator matematika\n' +
                '• /info - Informasi bot\n\n' +
                'Contoh: /hitung 15+25*2'
            );
            return;
        }
        
        // 2. Command: /info
        if (pesanLower === '/info') {
            msg.reply('🤖 Saya adalah WhatsApp Bot.\nKetik /help untuk melihat perintah.');
            return;
        }
        
        // 3. Command: /hitung <ekspresi>
        const hitungMatch = pesan?.match(/^\/hitung\s+(.+)$/i);
        if (hitungMatch) {
            let ekspresi = hitungMatch[1].replace(/=/g, '').trim();
            ekspresi = ekspresi.replace(/x/gi, '*');
            ekspresi = ekspresi.replace(/√(\d+)/g, 'sqrt($1)');
            ekspresi = ekspresi.replace(/(\d+)²/g, '($1)^2');
            
            try {
                const hasil = math.evaluate(ekspresi);
                msg.reply('📊 Hasil: ' + hasil);
            } catch (e) {
                msg.reply('❌ Format matematika tidak valid.');
            }
            return;
        }
        
        // 4. Deteksi ekspresi matematika murni
        if (/^[0-9+\-*/().\s=√²xX]+$/.test(pesan)) {
            let ekspresi = pesan.replace(/=/g, '').trim();
            ekspresi = ekspresi.replace(/x/gi, '*');
            ekspresi = ekspresi.replace(/√(\d+)/g, 'sqrt($1)');
            ekspresi = ekspresi.replace(/(\d+)²/g, '($1)^2');
            
            try {
                const hasil = math.evaluate(ekspresi);
                msg.reply('📊 Hasil: ' + hasil);
            } catch (e) {
                // Diam saja jika gagal parse
            }
            return;
        }
        
        // 5. Keyword: "siapa kamu"
        if (pesanLower.includes('siapa kamu') || pesanLower.includes('kamu siapa')) {
            msg.reply('🤖 Saya bot WhatsApp. Ketik /help untuk info.');
            return;
        }
        
        // 6. Keyword: "apa kabar"
        if (pesanLower.includes('apa kabar')) {
            msg.reply('Baik! 👍');
            return;
        }
        
        // Pesan lain: bot diam
        console.log('⚠️ Tidak ada trigger yang cocok');
        
    } catch (error) {
        console.error('❌ Error handling message:', error);
    }
});

console.log('Memulai WhatsApp Bot...');
client.initialize();
