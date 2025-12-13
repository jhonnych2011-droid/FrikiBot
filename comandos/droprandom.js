// comandos/droprandom.js
import fs from "fs";

export const command = "droprandom";

const DROP_FILE = "./droprandomps.json";
const PERSONAJES_FILE = "./personajes.json";

// Normaliza ID
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar personajes
function cargarPersonajes() {
  return fs.existsSync(PERSONAJES_FILE) ? JSON.parse(fs.readFileSync(PERSONAJES_FILE)) : {};
}

// Guardar drop
function guardarDrop(drop) {
  fs.writeFileSync(DROP_FILE, JSON.stringify(drop, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  const owners = fs.existsSync("./owners.json") ? JSON.parse(fs.readFileSync("./owners.json", "utf8")) : [];
  if (!owners.includes(sender))
    return sock.sendMessage(from, { text: "❌ Solo owners pueden crear drops." });

  if (!args.length) return sock.sendMessage(from, { text: "⚠️ Uso: .droprandom <geos:min-max> <personaje:Nombre,Probabilidad,...>" });

  const drop = { geos: null, personajes: [] };
  const personajesDB = cargarPersonajes();

  // Leer argumentos
  for (const arg of args) {
    if (arg.startsWith("geos:")) {
      const [min, max] = arg.replace("geos:", "").split("-").map(Number);
      if (isNaN(min) || isNaN(max) || min > max) return sock.sendMessage(from, { text: "❌ Formato de geos inválido." });
      drop.geos = { min, max };
    }

    if (arg.startsWith("personaje:")) {
      const [nombre, prob] = arg.replace("personaje:", "").split(",");
      if (!personajesDB[nombre]) return sock.sendMessage(from, { text: `❌ El personaje "${nombre}" no existe en personajes.json` });
      drop.personajes.push({ nombre, probabilidad: Number(prob) });
    }
  }

  // Guardar drop
  guardarDrop(drop);

  // Formatear mensaje de confirmación
  const personajesTexto = drop.personajes.length > 0
    ? drop.personajes.map(p => `${p.nombre} ${p.probabilidad}%`).join(", ")
    : "Ninguno";

  sock.sendMessage(from, { text: `✅ Drop creado:\nGeos: ${drop.geos ? drop.geos.min + "-" + drop.geos.max : "0"}\nPersonajes: ${personajesTexto}` });
}
