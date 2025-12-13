export const command = "ping";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Tiempo inicial
  const start = Date.now();

  // Enviar mensaje temporal
  const sent = await sock.sendMessage(from, { text: "🏓 Pong..." }, { quoted: msg });

  // Calcular ping
  const ping = Date.now() - start;

  // Editar mensaje con el ping real
  await sock.sendMessage(from, {
    text: `🏓 *Pong!*  
⚡ *Latencia:* ${ping}ms`
  }, { quoted: msg, edit: sent.key });
}
