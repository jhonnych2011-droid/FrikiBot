import { getUser } from "../helpers.js";

export const command = "hourly";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const id = msg.key.participant || msg.key.remoteJid;

  const user = getUser(geosDB, id);

  const cooldown = 60 * 60 * 1000; // 1 hora
  const now = Date.now();

  if (now - user.lastHourly < cooldown) {
    const falta = cooldown - (now - user.lastHourly);
    const minutos = Math.floor(falta / 60000);
    return sock.sendMessage(from, {
      text: `⏳ Debes esperar *${minutos} minutos* para volver a reclamar el hourly.`
    }, { quoted: msg });
  }

  const recompensa = Math.floor(Math.random() * (400 - 100 + 1)) + 100;

  user.geos += recompensa;
  user.lastHourly = now;

  return sock.sendMessage(from, {
    text: `⏰ *Hourly reclamado*\n💎 Obtienes *${recompensa} geos*.\n\nTotal: *${user.geos}*`
  }, { quoted: msg });
}
