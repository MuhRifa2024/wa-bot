const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const qrcode = require('qrcode-terminal')
const math = require('mathjs');
const fs = require('fs');
const path = require('path');
const express = require('express');
const QRCode = require('qrcode');

let latestQR = null;
let sock = null;
let isBotRunning = false;

// Express app for Cloud Functions
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', botRunning: isBotRunning });
});

// QR code endpoint
app.get('/qr', (req, res) => {
    if (!latestQR) {
        return res.status(404).json({ error: 'QR belum tersedia' });
    }

    QRCode.toDataURL(latestQR, (err, url) => {
        if (err) {
            return res.status(500).json({ error: 'Gagal membuat QR' });
        }
        res.json({ qr: url });
    });
});

// Start bot endpoint
app.post('/start', async (req, res) => {
    if (isBotRunning) {
        return res.status(400).json({ error: 'Bot sudah berjalan' });
    }

    try {
        await startBot();
        res.json({ message: 'Bot berhasil dimulai' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop bot endpoint
app.post('/stop', (req, res) => {
    if (!isBotRunning) {
        return res.status(400).json({ error: 'Bot tidak sedang berjalan' });
    }

    try {
        if (sock) {
            sock.end();
            sock = null;
        }
        isBotRunning = false;
        res.json({ message: 'Bot berhasil dihentikan' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'WA Bot API',
        endpoints: {
            health: '/health',
            qr: '/qr',
            start: '/start (POST)',
            stop: '/stop (POST)'
        },
        status: {
            botRunning: isBotRunning
        }
    });
});

async function startBot() {
    if (isBotRunning) return;

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')
    sock = makeWASocket({ auth: state })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            latestQR = qr;
            console.log('QR Code generated');
        }
        if (connection === 'close') {
            const isLoggedOut = (lastDisconnect.error = new Boom(lastDisconnect?.error))?.output?.statusCode === DisconnectReason.loggedOut;
            console.log('❌ Terputus. Reconnect?', !isLoggedOut);
            isBotRunning = false;

            if (!isLoggedOut) {
                setTimeout(() => startBot(), 5000);
            } else {
                const authPath = path.join(__dirname, 'auth_info_baileys');
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log('🗑️ Folder auth_info_baileys dihapus. Silakan scan QR ulang.');
                }
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ Bot terkoneksi ke WhatsApp')
            isBotRunning = true;
            latestQR = null;
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        await sock.readMessages([msg.key])
        const sender = msg.key.remoteJid
        if (!sender.endsWith('@s.whatsapp.net')) return

        let pesan =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.documentMessage?.caption ||
            msg.message?.buttonsResponseMessage?.selectedButtonId ||
            msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message?.templateButtonReplyMessage?.selectedId ||
            ""

        console.log(`📩 Pesan masuk dari ${sender}: ${pesan}`)

        if (pesan?.toLowerCase().includes("halo")) {
            await sock.sendMessage(sender, { text: "Hai juga 👋" })
        } else if (pesan?.toLowerCase().includes("siapa kamu")) {
            await sock.sendMessage(sender, { text: "I'm a king of the kingdom, the bot that rules the chat! 👑" })
        } else if (pesan?.toLowerCase().includes("saya ingin pesan")) {
            await sock.sendMessage(sender, { text: "pesan apa? pesan cinta?" })
        } else if (
            pesan?.toLowerCase().includes("masa gitu aja ga ngerti") ||
            pesan?.toLowerCase().includes("masa gitu aja gak ngerti sih?") ||
            pesan?.toLowerCase().includes("masa ga bisa") ||
            pesan?.toLowerCase().includes("masa gitu aja ga bisa")
        ) {
            await sock.sendMessage(sender, { text: "Ya maaf, namanya juga BOT, B O T. Yang punya keterbatasan, manusia aja belum tentu ngerti apa yang kamu maksud 🙄" })
        } else if (/^[0-9+\-*/().\s=√²]+$/.test(pesan)) {
            let ekspresi = pesan
                .replace(/=/g, '')
                .replace(/√([0-9]+)/g, 'sqrt($1)')
                .replace(/([0-9]+)²/g, '$1^2');
            try {
                const hasil = math.evaluate(ekspresi);
                await sock.sendMessage(sender, { text: `Hasil: ${hasil}` });
            } catch (e) {
                await sock.sendMessage(sender, { text: "Format matematika tidak dikenali." });
            }
        } else {
            if (/[a-zA-Z]/.test(pesan) && /^[0-9+\-*/().\s=√²a-zA-Z]+$/.test(pesan)) {
                await sock.sendMessage(sender, { text: "Format matematika tidak dikenali." });
            } else {
                await sock.sendMessage(sender, { text: "Maaf, saya hanya bisa menjawab sapaan, dan ekspresi matematika sederhana." });
            }
        }
    })
}

// Cloud Functions entry point
exports.main = app; 