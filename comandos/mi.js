export const command = "mi";
import fs from "fs";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const file = "./bot/data/clubs.json";
  if (!fs.existsSync(file)) {
    return sock.sendMessage(from, { text: "❌ No hay clubes creados." });
  }

  const clubs = JSON.parse(fs.readFileSync(file));

  for (const nombre in clubs) {
    const c = clubs[nombre];

    // Asegurar que 'miembros' existe y es un array
    if (!Array.isArray(c.miembros)) c.miembros = [];

    if (c.miembros.includes(sender)) {
      return sock.sendMessage(from, {
        text: `*Tu club:* ${nombre}\n💎 Geos: ${c.geos}\n👥 Miembros: ${c.miembros.length}`,
      });
    }
  }

  return sock.sendMessage(from, { text: "❌ No perteneces a ningún club." });
}
