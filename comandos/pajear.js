export const command = "pajear";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Obtener el usuario mencionado
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentions[0]) {
    const quotedMsg = msg.key && msg.message ? msg : undefined;
    return sock.sendMessage(from, { text: "❌ Usa: .pajear @usuario" }, { quoted: quotedMsg });
  }

  const user2 = mentions[0];
  const quotedMsg = msg.key && msg.message ? msg : undefined; // mismo método que osi

  await sock.sendMessage(from, {
    text: `Te estás pajeando con ayuda de @${user2.split("@")[0]} y te viniste en su cara 😳🔥`,
    mentions: [user2],
    quoted: quotedMsg
  });
}
