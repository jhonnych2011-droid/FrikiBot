export const command = 'hola';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  await sock.sendMessage(from, { text: '👋 Hola, bienvenido a FrikiBot 🗣️🔥' }, { quoted: msg });
}
