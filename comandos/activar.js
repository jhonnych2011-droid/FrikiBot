// comandos/activar.js
import fs from "fs";
import path from "path";

export const command = "activar";

const EVENT_FILE = path.join(process.cwd(), "eventos.json");

// Normalizar JID a @lid
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

  // 🔒 SOLO OWNERS
  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los *owners* pueden usar este comando." });
  }

  if (args.length < 2) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .activar <evento> <horas>" });
  }

  const evento = args[0].toLowerCase();
  const horas = parseFloat(args[1]);

  if (isNaN(horas) || horas <= 0) {
    return sock.sendMessage(from, { text: "⚠️ Tiempo inválido." });
  }

  // Cargar eventos
  let eventos = {};
  if (fs.existsSync(EVENT_FILE)) {
    eventos = JSON.parse(fs.readFileSync(EVENT_FILE, "utf8"));
  }

  // Activar evento
  const finaliza = Date.now() + horas * 60 * 60 * 1000;

  eventos[evento] = {
    activo: true,
    finaliza,
    comandos: eventos[evento]?.comandos || []
  };

  fs.writeFileSync(EVENT_FILE, JSON.stringify(eventos, null, 2));

  const fecha = new Date(finaliza).toLocaleString("es-ES");

  return sock.sendMessage(from, {
    text: `✅ Evento *${evento}* activado.\n⏳ Duración: *${horas} horas*\n🕒 Expira: ${fecha}`
  });
}
