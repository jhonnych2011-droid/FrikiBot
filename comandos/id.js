export const command = "id";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const sender = msg.key.participant || msg.key.remoteJid;

  let target;

  if (mentions.length > 0) {
    target = mentions[0];
  } else {
    target = sender;
  }

  // Convierte el JID en LID
  const lid = target.replace(/@.+$/, "@lid");

  await sock.sendMessage(from, {
    text: `🆔 ID de ${mentions.length > 0 ? "el usuario mencionado" : "tú"}:\n${lid}`
  }, { quoted: msg });
}
