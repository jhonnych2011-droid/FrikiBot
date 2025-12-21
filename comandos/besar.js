export const command = "besar";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });
  }

  // Detectar si mencionó a alguien
  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (!mention) {
    return sock.sendMessage(from, { text: "❌ Debes mencionar a alguien.\nEjemplo: .besar @usuario" });
  }

  // Crear el mensaje
  const texto = `@${author.split("@")[0]} besó bien riko riko a @${mention.split("@")[0]} 🔥`;

  // Enviar mensaje con menciones activas
  await sock.sendMessage(from, {
    text: texto,
    mentions: [author, mention]
  });
}
