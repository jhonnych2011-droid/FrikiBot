import fs from "fs";

export const command = "desactivarevento";

const EVENT_FILE = "./eventos.json";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (args.length < 1)
    return sock.sendMessage(from, { text: "Uso: .desactivarevento <nombre>" });

  const nombre = args[0].toLowerCase();

  let data = JSON.parse(fs.readFileSync(EVENT_FILE));

  if (!data[nombre])
    return sock.sendMessage(from, { text: "❌ Ese evento no existe." });

  data[nombre].activo = false;

  fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2));

  sock.sendMessage(from, { text: `🔒 Evento *${nombre}* DESACTIVADO.` });
}
