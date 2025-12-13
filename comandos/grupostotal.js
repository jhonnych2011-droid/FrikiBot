import fs from "fs";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));

// Verificar si es owner
function esOwner(jid) {
  const id = fixID(jid);
  return owners.includes(id);
}

export const command = "grupostotal";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Solo owners
  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ No tienes permisos para usar este comando." });
  }

  // Obtener todos los chats del bot
  const chats = await sock.groupFetchAllParticipating();
  const grupos = Object.keys(chats); // solo JID de grupos

  return sock.sendMessage(from, {
    text: `📊 Estoy en un total de *${grupos.length} grupos*.`
  });
}
