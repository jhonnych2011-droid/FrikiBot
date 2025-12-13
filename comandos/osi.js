export const command = "osi";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  await sock.sendMessage(from, { text: "ono" }, { quoted: msg });
}
