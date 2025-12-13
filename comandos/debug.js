export const command = "debugid";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  const metadata = await sock.groupMetadata(from);

  const botId = sock.user.id;

  await sock.sendMessage(from, {
    text:
      "🛠 *DEBUG ID COMPLETO*\n\n" +
      "📌 ID del bot (sock.user.id):\n" +
      botId +
      "\n\n" +
      "📌 Participantes detectados:\n" +
      metadata.participants.map(p => `• ${p.id} → ${p.admin}`).join("\n")
  });
}
