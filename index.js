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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    const sender = msg.from;
    const pesan = msg.body;
    
    // Cek apakah pesan dari bot sendiri
    if (msg.fromMe) return;
    
    // Cek apakah pesan dari grup (ID grup selalu berakhiran @g.us)
    const chat = await msg.getChat();
    if (chat.isGroup) {
        console.log('Pesan dari grup diabaikan: ' + chat.name);
        return;
    }
    
    console.log('Pesan masuk dari ' + sender + ': ' + pesan);
    
    // Cek pertanyaan spesifik DULUAN (sebelum sapaan)
    if (pesan?.toLowerCase().includes('siapa kamu') || pesan?.toLowerCase().includes('kamu siapa')) {
        await msg.reply('I am a king of the kingdom, the bot that rules the chat!');
    } else if (pesan?.toLowerCase().includes('apa kabar') || pesan?.toLowerCase().includes('kabar')) {
        await msg.reply('Baik, terima kasih! Bot selalu siap membantu 🤖');
    } else if (pesan?.toLowerCase().includes('saya ingin pesan')) {
        await msg.reply('pesan apa? pesan cinta?');
    } else if (pesan?.toLowerCase().includes('masa gitu aja ga ngerti') || pesan?.toLowerCase().includes('masa gitu aja gak ngerti sih?') || pesan?.toLowerCase().includes('masa ga bisa') || pesan?.toLowerCase().includes('masa gitu aja ga bisa')) {
        await msg.reply('Ya maaf, namanya juga BOT, B O T. Yang punya keterbatasan, manusia aja belum tentu ngerti apa yang kamu maksud');
    } else if (/^[0-9+\-*/().\s=√²xX]+$/.test(pesan)) {
        // Matematika: preprocessing untuk simbol khusus
        let ekspresi = pesan.replace(/=/g, '').trim();
        ekspresi = ekspresi.replace(/x/gi, '*');
        ekspresi = ekspresi.replace(/√(\d+)/g, 'sqrt($1)');
        ekspresi = ekspresi.replace(/(\d+)²/g, '($1)^2');
        
        try {
            const hasil = math.evaluate(ekspresi);
            await msg.reply('Hasil: ' + hasil);
        } catch (e) {
            await msg.reply('Format matematika tidak dikenali.');
        }
    } else if (pesan?.toLowerCase().includes('halo') || pesan?.toLowerCase().includes('hai') || pesan?.toLowerCase().includes('hi') || pesan?.toLowerCase() === 'p') {
        await msg.reply('Hai juga! 👋');
    } else {
        await msg.reply('Maaf, saya hanya bisa menjawab sapaan dan ekspresi matematika sederhana.');
    }
});

console.log('Memulai WhatsApp Bot...');
client.initialize();
