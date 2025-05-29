const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const qrcode = require('qrcode-terminal') // install dulu: npm install qrcode-terminal

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
            const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('❌ Terputus. Reconnect?', shouldReconnect)
            if (shouldReconnect) {
                startBot()
            }
        } else if (connection === 'open') {
            console.log('✅ Bot terkoneksi ke WhatsApp')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

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

        if (pesan?.toLowerCase().includes("halo")) {
            console.log("Bot akan membalas pesan halo...")
            await sock.sendMessage(sender, { text: "Hai juga dari bot 👋" })
        } else if (pesan?.toLocaleLowerCase().includes ("siapa kamu")) {
            await sock.sendMessage(sender, { text: "I'm a king of the kingdom, the bot that rules the chat! 👑" })
        }
    })
}
startBot()