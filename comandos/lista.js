import fs from "fs";
export const command = "lista";
const clubFile = "./clubs.json";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  if (!fs.existsSync(clubFile)) return sock.sendMessage(from, { text: "📭 No hay clubs aún." });

  const clubs = JSON.parse(fs.readFileSync(clubFile, "utf8"));

  if (Object.keys(clubs).length === 0) return sock.sendMessage(from, { text: "📭 No hay clubs aún." });

  let texto = "📋 *Clubs existentes:*\n\n";
  for (let c in clubs) {
    texto += `🏷️ *${c}*\n👑 Dueño: ${clubs[c].dueño}\n👥 Miembros: ${clubs[c].miembros.length}\n💰 Geos: ${clubs[c].geos}\n\n`;
  }

  sock.sendMessage(from, { text: texto });
}
