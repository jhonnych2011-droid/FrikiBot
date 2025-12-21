import fs from "fs";

export const command = "vender";

const personajesFile = "./personajes.json";
const inventarioFile = "./inventario.json";
const geosFile = "./geos.json";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function cargarArchivo(file, defecto = {}) {
  if (!fs.existsSync(file)) return { ...defecto };
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ...defecto };
  }
}

function guardarArchivo(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Asegura que el usuario tenga perfil válido
function asegurarPerfil(geosDB, sender) {
  if (
    !geosDB[sender] ||
    typeof geosDB[sender] !== "object" ||
    isNaN(geosDB[sender].geos)
  ) {
    geosDB[sender] = { geos: 1000, lastMinar: 0 };
  }
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!args.length) {
    return sock.sendMessage(
      from,
      { text: "⚠️ Uso: .vender <nombre del personaje>" },
      { quoted: msg }
    );
  }

  const nombreBuscado = args.join(" ").toLowerCase();

  const personajes = cargarArchivo(personajesFile);
  const inventario = cargarArchivo(inventarioFile);
  const geosArchivo = cargarArchivo(geosFile);

  if (!inventario[sender]) inventario[sender] = [];

  asegurarPerfil(geosDB, sender);
  asegurarPerfil(geosArchivo, sender);

  if (inventario[sender].length === 0) {
    return sock.sendMessage(
      from,
      { text: "❌ No tienes personajes para vender." },
      { quoted: msg }
    );
  }

  const index = inventario[sender].findIndex(
    n => n.toLowerCase() === nombreBuscado
  );

  if (index === -1) {
    return sock.sendMessage(
      from,
      { text: "❌ No tienes ese personaje en tu inventario." },
      { quoted: msg }
    );
  }

  const personajeNombre = inventario[sender][index];

  if (!personajes[personajeNombre]) {
    return sock.sendMessage(
      from,
      { text: `❌ El personaje *${personajeNombre}* no existe.` },
      { quoted: msg }
    );
  }

  const precioOriginal = personajes[personajeNombre].precio;
  const ganancia = Math.floor(precioOriginal * 0.96);

  // 💰 Sumar geos
  geosDB[sender].geos += ganancia;
  geosArchivo[sender].geos += ganancia;

  guardarArchivo(geosFile, geosArchivo);

  // 🗑️ Eliminar personaje del inventario
  inventario[sender].splice(index, 1);
  guardarArchivo(inventarioFile, inventario);

  // 📦 Actualizar stock
  personajes[personajeNombre].stock =
    (personajes[personajeNombre].stock || 0) + 1;
  guardarArchivo(personajesFile, personajes);

  return sock.sendMessage(
    from,
    {
      text:
`💰 Vendiste *${personajeNombre}*
💎 Ganancia: *${ganancia} geos*
📦 Stock actual: ${personajes[personajeNombre].stock}`
    },
    { quoted: msg }
  );
}
