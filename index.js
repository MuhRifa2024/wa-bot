const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const qrcode = require('qrcode-terminal') // install dulu: npm install qrcode-terminal
const math = require('mathjs');
const fs = require('fs');
const path = require('path');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')
    const sock = makeWASocket({ auth: state })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'close') {
            const isLoggedOut = (lastDisconnect.error = new Boom(lastDisconnect?.error))?.output?.statusCode === DisconnectReason.loggedOut;
            console.log('❌ Terputus. Reconnect?', !isLoggedOut);
            if (!isLoggedOut) {
                startBot();
            } else {
                // Hapus folder auth_info_baileys jika session expired/logged out
                const authPath = path.join(__dirname, 'auth_info_baileys');
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log('🗑️ Folder auth_info_baileys dihapus. Silakan scan QR ulang.');
                }
                // Jalankan ulang bot agar QR muncul lagi
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot terkoneksi ke WhatsApp')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return
        // tandai pesan sudah dibaca
        await sock.readMessages([msg.key])
        const sender = msg.key.remoteJid
        if (!sender.endsWith('@s.whatsapp.net')) return
        // Ambil isi pesan dari berbagai tipe pesan teks
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

        // Logika penanganan pesan:

        // 1. Prioritaskan sapaan dan perintah spesifik terlebih dahulu
        if (pesan?.toLowerCase().includes("halo")) {
            console.log("Bot akan membalas pesan halo...")
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
        }
        // 2. Kemudian, coba sebagai ekspresi matematika
        // Gunakan regex yang *hanya* mengizinkan angka dan operator matematika dasar,
        // tanpa huruf, agar "halo" tidak masuk ke sini.
        else if (/^[0-9+\-*/().\s=√²]+$/.test(pesan)) { // Regex ini HANYA angka dan operator
            let ekspresi = pesan
                .replace(/=/g, '') // Hilangkan tanda '='
                .replace(/√([0-9]+)/g, 'sqrt($1)') // Ganti '√25' jadi 'sqrt(25)'
                .replace(/([0-9]+)²/g, '$1^2'); // Ganti '25²' jadi '25^2'
            try {
                const hasil = math.evaluate(ekspresi);
                await sock.sendMessage(sender, { text: `Hasil: ${hasil}` });
            } catch (e) {
                // Ini akan menangkap error jika ekspresi numerik tidak valid (misal: "2++3")
                await sock.sendMessage(sender, { text: "Format matematika tidak dikenali." });
            }
        }
        // 3. Terakhir, jika tidak cocok dengan semua di atas, berikan pesan default
        else {
            // Kita tambahkan pengecekan tambahan untuk variabel matematika (misal: "12x*2")
            // Ini akan memastikan pesan seperti "12x*2" tetap menghasilkan "Format matematika tidak dikenali."
            if (/[a-zA-Z]/.test(pesan) && /^[0-9+\-*/().\s=√²a-zA-Z]+$/.test(pesan)) {
                await sock.sendMessage(sender, { text: "Format matematika tidak dikenali." });
            } else {
                await sock.sendMessage(sender, { text: "Maaf, saya hanya bisa menjawab sapaan, dan ekspresi matematika sederhana." });
            }
        }
    })
}

startBot()