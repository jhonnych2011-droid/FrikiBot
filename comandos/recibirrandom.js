// comandos/recibirdrop.js
import fs from "fs";

export const command = "recibirdrop";

const DROP_FILE = "./droprandomps.json";
const GEOS_FILE = "./geos.json";
const INVENTARIO_FILE = "./inventario.json";
const PERSONAJES_FILE = "./personajes.json";
const USUARIOS_FILE = "./usuariosdrop.json";

// Normaliza ID de usuario
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Elegir personaje según probabilidad y stock
function elegirPersonaje(personajes) {
  const disponibles = personajes.filter(p => p.stock > 0);
  if (disponibles.length === 0) return null;

  const rand = Math.random() * 100;
  const posibles = disponibles.filter(p => rand < p.probabilidad);
  if (posibles.length === 0) return null;

  const elegido = posibles[Math.floor(Math.random() * posibles.length)];
  return elegido; // {nombre, probabilidad, stock,...}
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Cargar usuarios que ya reclamaron
  const usuarios = fs.existsSync(USUARIOS_FILE) ? JSON.parse(fs.readFileSync(USUARIOS_FILE)) : [];
  if (usuarios.includes(sender)) return sock.sendMessage(from, { text: "❌ Ya reclamaste tu drop." });

  // Cargar drop
  if (!fs.existsSync(DROP_FILE)) return sock.sendMessage(from, { text: "❌ No hay drops disponibles." });
  const drop = JSON.parse(fs.readFileSync(DROP_FILE));

  // Cargar geos
  const geosDB = fs.existsSync(GEOS_FILE) ? JSON.parse(fs.readFileSync(GEOS_FILE)) : {};
  if (!geosDB[sender]) geosDB[sender] = { geos: 0 };

  // Cargar inventario
  const inventario = fs.existsSync(INVENTARIO_FILE) ? JSON.parse(fs.readFileSync(INVENTARIO_FILE)) : {};
  if (!inventario[sender]) inventario[sender] = [];

  // Cargar personajes
  const personajesObj = fs.existsSync(PERSONAJES_FILE) ? JSON.parse(fs.readFileSync(PERSONAJES_FILE)) : {};
  const personajesList = Object.entries(personajesObj).map(([nombre, datos]) => ({ nombre, ...datos }));

  let mensaje = "";

  // Elegir al azar si toca Geos o Personaje
  const esGeos = Math.random() < 0.5; // 50% Geos / 50% Personaje

  if (esGeos && drop.geos) {
    const min = drop.geos.min;
    const max = drop.geos.max;
    const geosRandom = Math.floor(Math.random() * (max - min + 1)) + min;
    geosDB[sender].geos += geosRandom;
    mensaje = `🎁 ¡Ganaste Geos!\n💎 Cantidad: ${geosRandom}`;
  } else if (drop.personajes && drop.personajes.length > 0) {
    // Elegir personaje del drop
    const posibles = personajesList.filter(p => drop.personajes.find(d => d.nombre === p.nombre));
    const elegido = elegirPersonaje(posibles);
    if (elegido) {
      inventario[sender].push(elegido.nombre);
      personajesObj[elegido.nombre].stock -= 1;
      mensaje = `🎁 ¡Ganaste un Personaje!\n🧩 ${elegido.nombre}`;
      // Guardar personajes actualizados
      fs.writeFileSync(PERSONAJES_FILE, JSON.stringify(personajesObj, null, 2));
    } else {
      mensaje = "❌ No obtuviste personaje esta vez.";
    }
  } else {
    mensaje = "❌ No hay recompensas disponibles en este drop.";
  }

  // Guardar geos e inventario
  fs.writeFileSync(GEOS_FILE, JSON.stringify(geosDB, null, 2));
  fs.writeFileSync(INVENTARIO_FILE, JSON.stringify(inventario, null, 2));

  // Marcar usuario como reclamado
  usuarios.push(sender);
  fs.writeFileSync(USUARIOS_FILE, JSON.stringify(usuarios, null, 2));

  sock.sendMessage(from, { text: mensaje });
}
