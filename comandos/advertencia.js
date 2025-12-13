import fs from "fs";

export const command = "advertencia";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo funciona en grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." }, { quoted: msg });
  }

  const sender = msg.key.participant || msg.key.remoteJid;

  // Obtener metadata completa del grupo
  const metadata = await sock.groupMetadata(from);
  const participantes = metadata.participants;

  // Obtener lista de admins
  const admins = participantes
    .filter(p => p.admin === "admin" || p.admin === "superadmin")
    .map(p => p.id);

  // Obtener ID REAL DEL BOT (corregido)
  let botId = sock.user.id.replace(/:\d+/, ""); // limpia :n
  if (botId.endsWith("@lid")) botId = botId.replace("@lid", "@s.whatsapp.net");

  // Verificar si BOT es admin
  const botEsAdmin = admins.includes(botId);
  if (!botEsAdmin) {
    return sock.sendMessage(from, { text: "❌ *Debo ser administrador para advertir o expulsar.*" }, { quoted: msg });
  }

  // Verificar si el USUARIO que ejecuta es admin
  const senderEsAdmin = admins.includes(sender);
  if (!senderEsAdmin) {
    return sock.sendMessage(from, { text: "❌ *Solo los administradores pueden usar este comando.*" }, { quoted: msg });
  }

  // Obtener el usuario mencionado
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return sock.sendMessage(from, { text: "❌ *Debes mencionar a alguien para advertir.*" }, { quoted: msg });
  }

  const objetivo = mentions[0];

  // Enviar advertencia con hidetag estilo
  await sock.sendMessage(from, {
    text: `⚠️ *ADVERTENCIA*\n\nEl usuario ha sido advertido.`,
    mentions: [objetivo]
  }, { quoted: msg });
}
