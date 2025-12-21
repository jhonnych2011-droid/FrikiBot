export const command = "ono";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  await sock.sendMessage(from, { text: "osi" }, { quoted: msg });
}
