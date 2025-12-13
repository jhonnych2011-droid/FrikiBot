// comandos/grupoids.js
export const command = "grupoids";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  if (!from.endsWith("@g.us"))
    return sock.sendMessage(from, { text: "❌ Usa este comando en un grupo." });

  const metadata = await sock.groupMetadata(from);

  const lista = metadata.participants
    .map(u => u.id)
    .join("\n");

  await sock.sendMessage(from, {
    text: `📍 *Lista de IDs del grupo:*\n\n${lista}`
  });
}
