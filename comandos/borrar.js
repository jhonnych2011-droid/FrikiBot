import fs from "fs";
export const command = "borrar";
const clubFile = "./clubs.json";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  if (!fs.existsSync(clubFile)) return;
  const clubs = JSON.parse(fs.readFileSync(clubFile, "utf8"));

  let clubName = null;
  for (let c in clubs) if (clubs[c].dueño === sender) clubName = c;

  if (!clubName) return sock.sendMessage(from, { text: "❌ No eres dueño de ningún club." });

  delete clubs[clubName];
  fs.writeFileSync(clubFile, JSON.stringify(clubs, null, 2));

  sock.sendMessage(from, { text: `🗑️ Club *${clubName}* eliminado con éxito.` });
}
