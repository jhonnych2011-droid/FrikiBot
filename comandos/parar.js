export const command = "parar";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  global.autoEnabled = false;

  return sock.sendMessage(from, {
    text: "🛑 Mensajes automáticos detenidos."
  }, { quoted: msg });
}
