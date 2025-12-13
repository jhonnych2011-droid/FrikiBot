// comandos/nuke.js
import fs from "fs";

export const command = "nuke";

function normalizarId(id) {
  if (!id) return null;
  return id.replace(/(@.+)/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❌ Solo en grupos." });

    const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
    const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);

    if (!owners.includes(sender))
      return sock.sendMessage(from, { text: "❌ La tienes chiquita, debes tenerla como los Owners." });

    // Obtener data del grupo SIN RIESGO DE CRASH
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

    // LISTA SEGURA
    let expulsables = group.participants
      .map(p => p.id)
      .filter(id =>
        id !== botId &&        // No expulsar bot
        id !== sender &&       // No expulsar quien ejecuta
        !owners.includes(id) && // No expulsar owners configurados
        id !== creator &&       // No expulsar creador del grupo
        !admins.includes(id)    // No expulsar admins
      );

    if (expulsables.length === 0)
      return sock.sendMessage(from, { text: "⚠️ No hay usuarios expulsables." });

    await sock.sendMessage(from, { text: `🔥 Violada iniciada 🥵.\nMiembros a violar: ${expulsables.length}` });

    for (const user of expulsables) {
      try {
        await sock.groupParticipantsUpdate(from, [user], "remove");
        console.log("✓ Expulsado:", user);
      } catch (e) {
        console.log("✗ No se pudo expulsar:", user, e?.data || e);
      }

      // Delay fijo de 1.5 segundos entre cada expulsión
      await new Promise(res => setTimeout(res, 1500));
    }

    await sock.sendMessage(from, { text: "🔥 Te violaste a todos we 🗣️." });

  } catch (err) {
    console.log("ERROR NUKE:", err);
    await sock.sendMessage(from, { text: "⚠️ Error, pero sigo activo." });
  }
}
