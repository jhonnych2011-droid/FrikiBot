// foto.js
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const command = "foto";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (!quoted) {
    return sock.sendMessage(from, {
      text: "📸 Responde a una *foto de ver una vez* con .foto"
    }, { quoted: msg });
  }

  let imageMessage = null;

  // VIEW ONCE V1 / V2 / EXTENSION
  if (quoted.viewOnceMessage?.message?.imageMessage) {
    imageMessage = quoted.viewOnceMessage.message.imageMessage;
  } else if (quoted.viewOnceMessageV2?.message?.imageMessage) {
    imageMessage = quoted.viewOnceMessageV2.message.imageMessage;
  } else if (quoted.viewOnceMessageV2Extension?.message?.imageMessage) {
    imageMessage = quoted.viewOnceMessageV2Extension.message.imageMessage;
  } else if (quoted.imageMessage?.viewOnce) {
    imageMessage = quoted.imageMessage;
  }

  if (!imageMessage) {
    return sock.sendMessage(from, {
      text: "❌ Esa respuesta no es una foto de *ver una vez* válida."
    }, { quoted: msg });
  }

  if (!imageMessage.mediaKey) {
    return sock.sendMessage(from, {
      text: "⚠️ No se pudo recuperar la foto (mediaKey vacío)."
    }, { quoted: msg });
  }

  try {
    const buffer = await downloadMediaMessage(
      {
        message: {
          imageMessage: imageMessage
        }
      },
      "buffer",
      {},
      { logger: console }
    );

    const filePath = path.join(tmpdir(), `viewonce-${Date.now()}.jpg`);
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(from, {
      image: fs.readFileSync(filePath),
      caption: "📸 Foto recuperada 😈🔥"
    }, { quoted: msg });

    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("❌ Error en .foto:", err);
    await sock.sendMessage(from, {
      text: "❌ Error al recuperar la foto."
    }, { quoted: msg });
  }
}
