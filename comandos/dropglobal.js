import fs from "fs";

export const command = "dropglobal";

const DROPS_FILE = "./groupDrops.json"; // Mismo archivo que .recibir
const PERSONAJES_FILE = "./personajes.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
function esOwner(jid) {
  return owners.includes(fixID(jid));
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

  if (!esOwner(sender)) return sock.sendMessage(from, { text: "❌ Solo owners pueden usar este comando." });
  if (args.length < 3) return sock.sendMessage(from, { text: "⚠️ Uso: .dropglobal <nombre o cantidad de geos> <maxPorPersona> <totalGlobal>" });

  const totalGlobal = parseInt(args[args.length - 1]);
  const maxPorPersona = parseInt(args[args.length - 2]);
  const nombre = args.slice(0, args.length - 2).join(" ").trim();

  if (!totalGlobal || !maxPorPersona) return sock.sendMessage(from, { text: "⚠️ Cantidades inválidas." });

  const personajes = loadJSON(PERSONAJES_FILE, {});
  let tipo;
  let valor; // valor real para geos

  // Detectar tipo automáticamente
  if (!isNaN(nombre)) {
    tipo = "geos";
    valor = parseInt(nombre);
  } else if (personajes[nombre]) {
    tipo = "personaje";
    valor = nombre;
  } else {
    return sock.sendMessage(from, { text: "❌ Nombre inválido. Debe ser un personaje existente o un número para geos." });
  }

  // Crear drop
  const drops = loadJSON(DROPS_FILE, []);
  const dropID = Date.now();

  drops.push({
    id: dropID,
    nombre: valor,
    tipo,
    totalGlobal,
    maxPorPersona,
    reclamados: {},
    grupo: "global" // marcamos como global
  });

  saveJSON(DROPS_FILE, drops);

  // Obtener todos los grupos donde está el bot
  const chats = await sock.groupFetchAllParticipating();
  const grupos = Object.keys(chats);

  let enviados = 0;
  for (const idGrupo of grupos) {
    try {
      await sock.sendMessage(idGrupo, {
        text: `🎁 ¡Nuevo drop global!  
${tipo === "geos" ? "💰 Geos" : "📛 Personaje"}: ${valor}  
Cantidad máxima por persona: ${maxPorPersona}  
Total disponible: ${totalGlobal}  

Usa el comando .recibir para reclamar tu parte`
      });
      enviados++;
    } catch (e) {
      console.log("Error enviando drop a", idGrupo, e);
    }
  }

  return sock.sendMessage(from, { text: `📢 Drop global creado y notificado en *${enviados} grupos*` });
}
