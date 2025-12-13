export const command = "mispersonajes";

import fs from "fs";

const usuariosPath = "./usuarios.json";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const id = (msg.key.participant || msg.key.remoteJid).replace(/@.*$/, "");

  if (!fs.existsSync(usuariosPath)) {
    return sock.sendMessage(from, { text: "📭 No tienes personajes aún." });
  }

  const usuarios = JSON.parse(fs.readFileSync(usuariosPath));

  if (!usuarios[id] || !usuarios[id].personajes || usuarios[id].personajes.length === 0) {
    return sock.sendMessage(from, {
      text: "📭 No tienes personajes."
    });
  }

  const lista = usuarios[id].personajes;
  let texto = "🎒 *TUS PERSONAJES*\n\n";

  for (const pj of lista) {
    texto += `✨ *${pj.nombre}*\n`;
    texto += `🎨 Calidad: ${pj.calidad}\n`;
  }

  sock.sendMessage(from, { text: texto });
}
