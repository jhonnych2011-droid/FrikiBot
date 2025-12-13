const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');

const fs = require('fs');
const path = require('path');
const P = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true, // cambia a false si no quieres ver el QR
        auth: state,
        logger: P({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexión cerrada. Reconectando:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado correctamente a WhatsApp!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

        // 🟢 Comandos básicos
        if (text.startsWith('.hola')) {
            await sock.sendMessage(from, { text: 'Hola, soy BotDrio XD' });
        }

        if (text.startsWith('.minar')) {
            const diamantes = Math.floor(Math.random() * 500) + 50;
            await sock.sendMessage(from, { text: `💎 Felicidades, minaste ${diamantes} diamantes!` });
        }
    });
}

startBot();
