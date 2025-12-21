// comandos/ruleta.js
import fs from "fs";

export const command = "rusa";

function normalizarId(id) {
  if (!id) return null;
  return id.replace(/(@.+)/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❌ Solo se puede jugar en grupos." });

    const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
    const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);

    if (!owners.includes(sender))
      return sock.sendMessage(from, { text: "❌ Solo los Owners pueden iniciar la Ruleta Rusa." });

    // Obtener metadata del grupo de forma segura
    let group;
    try {
      group = await sock.groupMetadata(from);
    } catch {
      return sock.sendMessage(from, { text: "⚠️ No soy admin o no tengo permisos." });
    }

    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    const admins = group.participants
      .filter(p => p.admin)
      .map(p => p.id);

    const creator = group.owner || null;

    // Filtrar SOLO usuarios expulsables
    let expulsables = group.participants
      .map(p => p.id)
      .filter(id =>
        id !== botId &&
        id !== sender &&
        !owners.includes(id) &&
        id !== creator &&
        !admins.includes(id)
      );

    if (expulsables.length === 0)
      return sock.sendMessage(from, { text: "⚠️ No hay jugadores disponibles (todos son admins/owners/bot)." });

    // Elegir un usuario aleatorio
    const elegido = expulsables[Math.floor(Math.random() * expulsables.length)];

    await sock.sendMessage(from, {
      text: `🔫 *Ruleta Rusa Iniciada*\n\nGirando el tambor...\n\n🎲 Jugadores en riesgo: ${expulsables.length}`
    });

    // Pequeño suspenso jejeje
    await new Promise(res => setTimeout(res, 2500));

    try {
      await sock.groupParticipantsUpdate(from, [elegido], "remove");
      await sock.sendMessage(from, {
        text: `💥 *Bang!* \n\nEl usuario @${elegido.split("@")[0]} perdió la ruleta.`,
        mentions: [elegido]
      });
    } catch (err) {
      console.log("Error expulsando en ruleta:", err);
      return sock.sendMessage(from, { text: "⚠️ No pude expulsar al usuario, algo falló." });
    }

  } catch (err) {
    console.log("ERROR RULETA:", err);
    await sock.sendMessage(from, { text: "⚠️ Error inesperado, pero sigo vivo." });
  }
}
