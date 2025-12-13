import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from "fs";

export const command = "ver";

export async function run(sock, msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted) return sock.sendMessage(msg.key.remoteJid, { text: "Responde al video con .ver" });

  let media = null;

  // Detectar si es video viewOnce
  if (quoted.viewOnceMessageV2?.message?.videoMessage) {
    media = quoted.viewOnceMessageV2.message.videoMessage;

  } else if (quoted.videoMessage) {
    media = quoted.videoMessage;

  } else {
    return sock.sendMessage(msg.key.remoteJid, { text: "Eso no es un video." });
  }

  try {
    const stream = await downloadContentFromMessage(media, "video");

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    await sock.sendMessage(msg.key.remoteJid, {
      video: buffer,
      caption: "🔓 Video recuperado"
    });

  } catch (e) {
    await sock.sendMessage(msg.key.remoteJid, { text: "Error al obtener el video." });
  }
}
