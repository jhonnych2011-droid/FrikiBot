// comandos/botsock.js
export const command = "botsock";

export async function run(sock, msg) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🔍 *sock.user.id real:*\n${sock.user.id}`
    });
  } catch (err) {
    console.error(err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "❌ Error obteniendo el sock.user.id"
    });
  }
}
