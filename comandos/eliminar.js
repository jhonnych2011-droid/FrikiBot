// comandos/eliminar.js
import fs from "fs";

export const command = "eliminar";

const PERSONAJES_FILE = "./personajes.json";
const OWNERS_FILE = "./owners.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function esOwner(jid) {
  if (!fs.existsSync(OWNERS_FILE)) return false;
  const owners = JSON.parse(fs.readFileSync(OWNERS_FILE, "utf8"));
  return owners.includes(fixID(jid));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });
  }

  if (!args.length) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .eliminar <nombre del personaje>" });
  }

  const nombre = args.join(" ").trim(); // Para nombres con espacios

  if (!fs.existsSync(PERSONAJES_FILE)) {
    return sock.sendMessage(from, { text: "⚠️ No hay personajes registrados." });
  }

  let personajes = JSON.parse(fs.readFileSync(PERSONAJES_FILE, "utf8"));

  if (!personajes[nombre]) {
    return sock.sendMessage(from, { text: `❌ El personaje "${nombre}" no existe.` });
  }

  delete personajes[nombre];

  fs.writeFileSync(PERSONAJES_FILE, JSON.stringify(personajes, null, 2));

  await sock.sendMessage(from, { text: `✅ Personaje "${nombre}" eliminado correctamente.` });
}
