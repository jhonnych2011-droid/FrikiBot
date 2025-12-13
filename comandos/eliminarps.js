export const command = "eliminarpersonaje";

import fs from "fs";
const personajesPath = "./personajes.json";
const ownersPath = "./owners.json";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  let owners = {};
  if (fs.existsSync(ownersPath)) owners = JSON.parse(fs.readFileSync(ownersPath));

  if (!owners[sender]) {
    return sock.sendMessage(from, { text: "❌ Solo owners pueden eliminar personajes." });
  }

  const nombre = args.join(" ").trim();

  if (!nombre) {
    return sock.sendMessage(from, { text: "⚠️ Usa: .eliminarpersonaje <nombre>" });
  }

  const personajes = JSON.parse(fs.readFileSync(personajesPath));

  if (!personajes[nombre]) {
    return sock.sendMessage(from, { text: "❌ Ese personaje no existe." });
  }

  delete personajes[nombre];
  fs.writeFileSync(personajesPath, JSON.stringify(personajes, null, 2));

  sock.sendMessage(from, { text: `🗑️ Personaje *${nombre}* eliminado.` });
}
