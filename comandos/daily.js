import { getUser } from "../helpers.js";

export const command = "daily";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const id = msg.key.participant || msg.key.remoteJid;

  const user = getUser(geosDB, id);

  const cooldown = 24 * 60 * 60 * 1000; // 1 día
  const now = Date.now();

  if (now - user.lastDaily < cooldown) {
    return sock.sendMessage(from, {
      text: "⏳ Ya reclamaste tu daily hoy. Vuelve mañana."
    }, { quoted: msg });
  }

  const recompensa = Math.floor(Math.random() * (500 - 200 + 1)) + 200;

  user.geos += recompensa;
  user.lastDaily = now;

  return sock.sendMessage(from, {
    text: `📅 *Daily reclamado*\n💎 Obtienes *${recompensa} geos*.\n\nTotal: *${user.geos}*`
  }, { quoted: msg });
}
