import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import { activeSubBots } from "../subbotsManager.js";

export const command = "subbot";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const subcmd = args[0];

  // ================= VINCULAR =================
  if (subcmd === "vincular") {

    if (activeSubBots.has(from)) {
      return sock.sendMessage(from, {
        text: "⚠️ Ya hay un sub-bot activo.\nUsa `.subbot detener`."
      });
    }

    const id = Date.now().toString();
    const authPath = path.join(process.cwd(), "subbots", id);
    fs.mkdirSync(authPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    let qrSent = false; // 🔐 CLAVE

    const subSock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    });

    activeSubBots.set(from, subSock);

    subSock.ev.on("creds.update", saveCreds);

    subSock.ev.on("connection.update", async (update) => {
      const { qr, connection } = update;

      // ✅ ENVIAR SOLO UN QR (EL BUENO)
      if (qr && !qrSent) {
        qrSent = true;

        const qrImg = await qrcode.toBuffer(qr);

        await sock.sendMessage(from, {
          image: qrImg,
          caption:
`🤖 *SUB-BOT*
Escanea ESTE QR (solo este funciona):

WhatsApp → Dispositivos vinculados`
        });
      }

      // ✅ VINCULADO
      if (connection === "open") {
        await sock.sendMessage(from, {
          text: "✅ Sub-bot vinculado correctamente."
        });
        activeSubBots.delete(from);
      }

      // ❌ CERRADO
      if (connection === "close") {
        activeSubBots.delete(from);
      }
    });
  }

  // ================= DETENER =================
  else if (subcmd === "detener") {
    const subSock = activeSubBots.get(from);

    if (!subSock) {
      return sock.sendMessage(from, {
        text: "❌ No hay ningún sub-bot en proceso."
      });
    }

    subSock.end();
    activeSubBots.delete(from);

    await sock.sendMessage(from, {
      text: "🛑 Vinculación cancelada correctamente."
    });
  }

  // ================= AYUDA =================
  else {
    await sock.sendMessage(from, {
      text:
`🤖 *SUB-BOT*
.subbot vincular
.subbot detener`
    });
  }
}
