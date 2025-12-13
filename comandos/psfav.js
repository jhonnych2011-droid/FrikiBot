// comandos/psfav.js
import fs from "fs";

export const command = "psfav";

const FAV_FILE = "./favoritos.json";
const INVENTARIO_FILE = "./inventario.json";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar JSON
function cargarArchivo(file, defecto = {}) {
  if (!fs.existsSync(file)) return defecto;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// Guardar JSON
function guardarArchivo(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const sender = fixID(msg.key.participant || msg.key.remoteJid);
  const from = msg.key.remoteJid;

  if (!args[0]) {
    return sock.sendMessage(from, { text: "❌ Usa: .psfav <nombre del personaje>" }, { quoted: msg });
  }

  const personaje = args.join(" ");

  // Cargar inventario
  const inventario = cargarArchivo(INVENTARIO_FILE);

  if (!inventario[sender] || !inventario[sender].includes(personaje)) {
    return sock.sendMessage(from, { text: "❌ No tienes ese personaje en tu inventario." }, { quoted: msg });
  }

  // Guardar favorito
  const favoritos = cargarArchivo(FAV_FILE);
  favoritos[sender] = personaje;
  guardarArchivo(FAV_FILE, favoritos);

  await sock.sendMessage(from, { text: `❤ Ahora tu personaje favorito es: ${personaje}` }, { quoted: msg });
}
