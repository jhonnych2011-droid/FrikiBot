// comandos/cachar.js
import fs from "fs";

export const command = "cachar";

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
      return sock.sendMessage(from, { text: "❌ La tienes chiquita, solo los owners pueden cachar 😈." });

    // Obtener metadata del grupo
    let group;
    try {
      group = await sock.groupMetadata(from);
    } catch {
      return sock.sendMessage(from, { text: "⚠️ No soy admin o no tengo permisos." });
    }

    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const creator = group.owner || null;
    const admins = group.participants.filter(p => p.admin).map(p => p.id);

    // Obtener usuario objetivo
    let target;

    // Si mencionaron a alguien
    if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } 
    // O si escribieron el número manualmente
    else if (args[0]) {
      let num = args[0].replace(/\D/g, "");
      target = num + "@s.whatsapp.net";
    }

    if (!target)
      return sock.sendMessage(from, { text: "⚠️ Menciona a alguien o escribe un número." });

    // Normalizar ID
    target = normalizarId(target);

    // Reglas de protección
    if (target === botId)
      return sock.sendMessage(from, { text: "❌ No puedo cacharme a mí mismo 😹." });

    if (target === sender)
      return sock.sendMessage(from, { text: "❌ No puedes cacharte tú mismo we 😂." });

    if (owners.includes(target))
      return sock.sendMessage(from, { text: "❌ Ese es owner, no se puede cachar 😎." });

    if (creator === target)
      return sock.sendMessage(from, { text: "❌ Ese es el creador del grupo, no puedo." });

    if (admins.includes(target))
      return sock.sendMessage(from, { text: "❌ No puedo expulsar admins." });

    // Expulsión
    try {
      await sock.groupParticipantsUpdate(from, [target], "remove");
      await sock.sendMessage(from, { text: `🔥 Usuario cachado y eliminado: @${target.split("@")[0]}`, mentions: [target] });
    } catch (err) {
      console.log("ERROR AL CACHAR:", err);
      await sock.sendMessage(from, { text: "⚠️ No se pudo cachar a ese usuario." });
    }

  } catch (err) {
    console.log("ERROR CACHAR:", err);
    await sock.sendMessage(from, { text: "⚠️ Error inesperado." });
  }
}
