export const command = "papi";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  await sock.sendMessage(from, { text: "mami" }, { quoted: msg });
}
