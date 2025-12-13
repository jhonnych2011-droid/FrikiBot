// comandos/asignarcomando.js
import fs from "fs";

export const command = "asignarcomando";

const EVENT_FILE = "./eventos.json";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (args.length < 2) {
    return sock.sendMessage(from, { 
      text: "Uso: .asignarcomando <evento> <comando>" 
    });
  }

  const evento = args[0].toLowerCase();
  const cmd = args[1].toLowerCase();

  // Cargar eventos.json
  let data = fs.existsSync(EVENT_FILE)
    ? JSON.parse(fs.readFileSync(EVENT_FILE, "utf8"))
    : {};

  // Verificar existencia del evento
  if (!data[evento]) {
    return sock.sendMessage(from, { text: "❌ Ese evento no existe." });
  }

  // Asegurar estructura
  if (!Array.isArray(data[evento].comandos)) {
    data[evento].comandos = [];
  }

  // Evitar duplicados
  if (data[evento].comandos.includes(cmd)) {
    return sock.sendMessage(from, { 
      text: `⚠️ El comando *${cmd}* ya está asignado al evento *${evento}*.` 
    });
  }

  // Agregar comando al evento
  data[evento].comandos.push(cmd);

  // Guardar archivo
  fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2));

  return sock.sendMessage(from, { 
    text: `✔ El comando *${cmd}* ha sido añadido al evento *${evento}*.` 
  });
}
