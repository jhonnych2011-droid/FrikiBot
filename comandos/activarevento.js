import fs from "fs";

// Nombre del comando
export const command = "activarevento";

const EVENT_FILE = "./eventos.json";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // SOLO OWNERS
  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los *owners* pueden usar este comando." });
  }

  // Validación de argumentos
  if (args.length < 1) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .activarevento <nombre>" });
  }

  const nombre = args[0].toLowerCase();

  // Leer archivo
  let data = JSON.parse(fs.readFileSync(EVENT_FILE));

  if (!data[nombre]) {
    return sock.sendMessage(from, { text: "❌ Ese evento no existe." });
  }

  // Activar evento
  data[nombre].activo = true;

  // Guardar cambios
  fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2));

  // Mensaje final
  await sock.sendMessage(from, { text: `🎉 Evento *${nombre}* ACTIVADO.` });
}
