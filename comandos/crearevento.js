import fs from "fs";

export const command = "crearevento";

const EVENT_FILE = "./eventos.json";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (args.length < 1)
    return sock.sendMessage(from, { text: "Uso: .crearevento <nombre>" });

  const nombre = args[0].toLowerCase();

  let data = fs.existsSync(EVENT_FILE)
    ? JSON.parse(fs.readFileSync(EVENT_FILE))
    : {};

  if (data[nombre])
    return sock.sendMessage(from, { text: "⚠️ Ese evento ya existe." });

  data[nombre] = {
    activo: false,
    comandos: []
  };

  fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2));

  return sock.sendMessage(from, { text: `✔ Evento *${nombre}* creado.` });
}

