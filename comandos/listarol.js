// comandos/listarol.js
import fs from "fs";

export const command = "listarol";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  const file = "./data/roles.json";
  if (!fs.existsSync(file)) return sock.sendMessage(from, { text: "⚠️ No hay roles agregados." }, { quoted: msg });

  const roles = JSON.parse(fs.readFileSync(file));

  let texto = "📜 *Roles disponibles:*\n\n";
  for (const r in roles) {
    texto += `• ${roles[r].nombre}\n`;
  }

  await sock.sendMessage(from, { text: texto }, { quoted: msg });
}
