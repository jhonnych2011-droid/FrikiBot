import fs from "fs";

export const command = "nvl_aguijon";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const users = JSON.parse(fs.readFileSync("./data/bossUsers.json"));
  const db = JSON.parse(fs.readFileSync("./data/users.json"));

  const nvl = db[sender].aguijon || 1;
  const bosses = users.bossesCompletados[sender] || 0;

  sock.sendMessage(from, {
    text:
`🗡 NIVEL DE AGUIJÓN
Nivel actual: ${nvl}
Bosses con +10 ataques: ${bosses}
Necesitas: ${nvl * 5} bosses para siguiente nivel`
  });
}
