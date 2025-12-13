import { getUser } from "../helpers.js";

export const command = "weekly";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const id = msg.key.participant || msg.key.remoteJid;

  const user = getUser(geosDB, id);

  const cooldown = 7 * 24 * 60 * 60 * 1000; // 1 semana
  const now = Date.now();

  if (now - user.lastWeekly < cooldown) {
    return sock.sendMessage(from, {
      text: "⏳ Ya reclamaste tu weekly. Vuelve la próxima semana."
    }, { quoted: msg });
  }

  const recompensa = Math.floor(Math.random() * (600 - 300 + 1)) + 300;

  user.geos += recompensa;
  user.lastWeekly = now;

  return sock.sendMessage(from, {
    text: `📆 *Weekly reclamado*\n💎 Obtienes *${recompensa} geos*.\n\nTotal: *${user.geos}*`
  }, { quoted: msg });
}
