// comandos/frikisex.js
import fs from "fs";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export const command = "frikisex";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Verificar owner
  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });
  }

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });
  }

  try {
    const metadata = await sock.groupMetadata(from);

    // Verificar si el owner ya es admin
    const ownerIsAdmin = metadata.participants.some(
      p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
    );

    if (ownerIsAdmin) {
      return sock.sendMessage(from, { text: "😎 Ya eres admin en este grupo." });
    }

    // Promover al owner a admin
    await sock.groupParticipantsUpdate(from, [sender], "promote");

    return sock.sendMessage(from, {
      text: `✅ ¡Listo! Ahora @${sender.split("@")[0]} es admin en este grupo.`,
      mentions: [sender]
    });
  } catch (e) {
    console.error("Error en frikisex:", e);
    return sock.sendMessage(from, { text: `❌ No pude darte admin.\nError: ${e.message || "Desconocido"}` });
  }
}
