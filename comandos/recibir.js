import fs from "fs";

export const command = "recibir";

const DROPS_FILE = "./groupDrops.json"; // Mismo archivo que .dropglobal
const GEOS_FILE = "./geos.json";
const INVENTARIO_FILE = "./inventario.json";
const PERSONAJES_FILE = "./personajes.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function loadJSON(file, defaultValue = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Cargar todos los drops
  let allDrops = loadJSON(DROPS_FILE, []);

  // Filtrar drops de este grupo con stock
  let drops = allDrops.filter(d => d.grupo === from && d.totalGlobal > 0);

  if (drops.length === 0) {
    return sock.sendMessage(from, { text: "❌ No hay drops disponibles en este grupo." });
  }

  // ====== Tomar solo el último drop del grupo ======
  let drop = drops[drops.length - 1];

  if (!drop.reclamados) drop.reclamados = {};
  if (!drop.reclamados[sender]) drop.reclamados[sender] = 0;

  // Limitar por persona
  if (drop.reclamados[sender] >= drop.maxPorPersona) {
    return sock.sendMessage(from, { text: `❌ Ya reclamaste el máximo de este drop (${drop.maxPorPersona}).` });
  }

  drop.reclamados[sender] += 1;
  drop.totalGlobal -= 1;

  // ====== Dar geos ======
  if (drop.tipo === "geos") {
    const geosDB = loadJSON(GEOS_FILE, {});
    if (!geosDB[sender]) geosDB[sender] = { geos: 0 };
    geosDB[sender].geos += parseInt(drop.nombre);
    saveJSON(GEOS_FILE, geosDB);

    await sock.sendMessage(from, {
      text: `💰 ¡Recibiste ${drop.nombre} geos!\n💎 Total actual: ${geosDB[sender].geos} geos`
    });
  } 
  // ====== Dar personaje ======
  else if (drop.tipo === "personaje") {
    const personajes = loadJSON(PERSONAJES_FILE, {});
    if (!personajes[drop.nombre]) return sock.sendMessage(from, { text: `❌ El personaje "${drop.nombre}" no existe.` });

    if (personajes[drop.nombre].stock <= 0) {
      return sock.sendMessage(from, { text: `❌ El personaje "${drop.nombre}" ya no tiene stock.` });
    }

    personajes[drop.nombre].stock -= 1;
    saveJSON(PERSONAJES_FILE, personajes);

    // Guardar en inventario
    const inventario = loadJSON(INVENTARIO_FILE, {});
    if (!inventario[sender]) inventario[sender] = [];
    inventario[sender].push(drop.nombre);
    saveJSON(INVENTARIO_FILE, inventario);

    await sock.sendMessage(from, {
      text: `🎁 ¡Recibiste el personaje: ${drop.nombre}! 🎉`
    });
  }

  // ====== Guardar cambios del drop ======
  const index = allDrops.findIndex(d => d.id === drop.id);
  if (index !== -1) allDrops[index] = drop;
  saveJSON(DROPS_FILE, allDrops);
}
