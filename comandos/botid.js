// comandos/botid2.js
export const command = "botid2";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  if (!from.endsWith("@g.us"))
    return sock.sendMessage(from, { text: "❌ Usa este comando en un grupo." });

  const metadata = await sock.groupMetadata(from);

  const botNumber = sock.user.id.split(":")[0].replace("@s.whatsapp.net", "").replace("@lid", "");

  const idsEncontrados = metadata.participants
    .filter(u => u.id.includes(botNumber))
    .map(u => u.id);

  if (idsEncontrados.length === 0) {
    return sock.sendMessage(from, { 
      text: `❌ No encontré coincidencias incluso por número.\n\n➡️ Mándame el *sock.user.id* real con este comando:\n\n.botsock` 
    });
  }

  sock.sendMessage(from, {
    text: `🆔 *IDs encontrados del bot:*\n${idsEncontrados.join("\n")}`
  });
}
