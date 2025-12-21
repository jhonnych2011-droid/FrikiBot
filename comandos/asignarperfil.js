import fs from "fs";
import { Jimp } from "jimp";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

// ───── Archivos ─────
const PERFIL_FILE = "./perfiles.json";

export const command = "asignarperfil";

// ───── Utils ─────
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// ───── Descargar imagen ─────
async function descargarImagen(imageMessage) {
  const stream = await downloadContentFromMessage(imageMessage, "image");
  let buffer = Buffer.alloc(0);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
}

// ───── RUN ─────
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const senderRaw = msg.key.participant || msg.key.remoteJid;
  const senderLid = fixID(senderRaw);

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  const imageMessage =
    quoted?.imageMessage || msg.message?.imageMessage;

  if (!imageMessage) {
    return sock.sendMessage(from, {
      text: "📸 Responde a una imagen con:\n.asignarperfil"
    }, { quoted: msg });
  }

  let buffer;
  try {
    buffer = await descargarImagen(imageMessage);
  } catch {
    return sock.sendMessage(from, { text: "❌ No se pudo descargar la imagen." });
  }

  // Guardar perfil
  let perfiles = fs.existsSync(PERFIL_FILE)
    ? JSON.parse(fs.readFileSync(PERFIL_FILE))
    : {};

  perfiles[senderLid] = buffer.toString("base64");
  fs.writeFileSync(PERFIL_FILE, JSON.stringify(perfiles, null, 2));

  await sock.sendMessage(from, {
    text: "✅ Foto de perfil guardada correctamente."
  }, { quoted: msg });
}
