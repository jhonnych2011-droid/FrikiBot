// foto.js
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const command = "foto";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  // Obtener quoted verdadero en grupos y privados
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (!quoted) {
    return sock.sendMessage(from, { text: "📸 Responde a una *foto de ver una vez* con .foto" });
  }

  // ----------------------------------------
  // DETECCIÓN REAL DE VIEW ONCE (TODOS LOS TIPOS)
  // ----------------------------------------
  let viewOnce = null;

  const containers = [
    quoted.viewOnceMessage,
    quoted.viewOnceMessageV2,
    quoted.viewOnceMessageV2Extension,
    quoted.message?.viewOnceMessage,
    quoted.message?.viewOnceMessageV2,
    quoted.message?.viewOnceMessageV2Extension
  ];

  for (const c of containers) {
    if (!c) continue;
    if (c.message?.imageMessage) {
      viewOnce = c.message.imageMessage;
      break;
    }
  }

  // Algunos grupos lo mandan así:
  if (!viewOnce && quoted.imageMessage && quoted.imageMessage.viewOnce) {
    viewOnce = quoted.imageMessage;
  }

  // Si aún no detecta
  if (!viewOnce) {
    return sock.sendMessage(from, { text: "📸 Esa respuesta NO es una foto de ver una vez (o viene en formato raro)." });
  }

  try {
    // Descargar sin perder calidad
    const buffer = await downloadMediaMessage(
      { message: { imageMessage: viewOnce } },
      "buffer",
      {},
      { logger: console }
    );

    // Guardar temporalmente
    const filePath = path.join(tmpdir(), `viewonce-${Date.now()}.jpg`);
    fs.writeFileSync(filePath, buffer);

    // Enviar foto normal
    await sock.sendMessage(
      from,
      {
        image: fs.readFileSync(filePath),
        caption: "🔓 Foto recuperada tilin 🗣️🔥",
      },
      { quoted: msg }
    );

    // Borrar
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("❌ Error en .foto:", err);
    return sock.sendMessage(from, { text: "❌ Hubo un error al recuperar la foto." });
  }
}
