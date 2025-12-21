import { getUser } from "../helpers.js";

export const command = "monthly";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const id = msg.key.participant || msg.key.remoteJid;

  const user = getUser(geosDB, id);

  const cooldown = 30 * 24 * 60 * 60 * 1000; // 30 días
  const now = Date.now();

  if (now - user.lastMonthly < cooldown) {
    const falta = cooldown - (now - user.lastMonthly);
    const dias = Math.floor(falta / (24 * 60 * 60 * 1000));
    return sock.sendMessage(from, {
      text: `📅 Debes esperar *${dias} días* para volver a reclamar el monthly.`
    }, { quoted: msg });
  }

  const recompensa = Math.floor(Math.random() * (1100 - 700 + 1)) + 700;

  user.geos += recompensa;
  user.lastMonthly = now;

  return sock.sendMessage(from, {
    text:
      `📅 *Monthly reclamado*\n` +
      `💎 Obtienes *${recompensa} geos*.\n\n` +
      `Total: *${user.geos} geos*`
  }, { quoted: msg });
}
