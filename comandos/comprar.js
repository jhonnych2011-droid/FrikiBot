// comandos/comprar.js
export const command = "comprar";

const personajesFile = "./personajes.json";
const inventarioFile = "./inventario.json";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar y guardar JSON de inventario
import fs from "fs";

function cargarInventario() {
  if (!fs.existsSync(inventarioFile)) return {};
  return JSON.parse(fs.readFileSync(inventarioFile, "utf-8"));
}

function guardarInventario(data) {
  fs.writeFileSync(inventarioFile, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!args.length) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .comprar <nombre del personaje>" }, { quoted: msg });
  }

  const nombreBuscado = args.join(" ").toLowerCase();

  // Cargar personajes
  const personajes = JSON.parse(fs.readFileSync(personajesFile, "utf-8"));

  // Inicializar perfil si no existe
  if (!geosDB[sender]) geosDB[sender] = { geos: 0, lastMinar: 0, cooldownRobar: 0 };

  // Buscar personaje ignorando mayúsculas
  const personaje = Object.entries(personajes).find(([nombre]) => nombre.toLowerCase() === nombreBuscado);
  if (!personaje) {
    const lista = Object.keys(personajes).map(n => `• ${n}`).join("\n");
    return sock.sendMessage(from, { 
      text: `❌ Ese personaje no existe.\n\nPersonajes disponibles:\n${lista}` 
    }, { quoted: msg });
  }

  const [nombre, data] = personaje;

  // Verificar stock
  if (data.stock <= 0) {
    return sock.sendMessage(from, { text: `❌ No hay stock disponible de *${nombre}*.` }, { quoted: msg });
  }

  // Verificar geos
  if (geosDB[sender].geos < data.precio) {
    return sock.sendMessage(from, { text: `❌ No tienes suficientes geos para comprar *${nombre}*.` }, { quoted: msg });
  }

  // 📌 Cargar inventario
  const inventario = cargarInventario();
  if (!inventario[sender]) inventario[sender] = [];

  // ⚠️ Verificar límite por usuario
  if (data.limite !== null && data.limite !== undefined) {
    const cuantasTiene = inventario[sender].filter(p => p === nombre).length;

    if (cuantasTiene >= data.limite) {
      return sock.sendMessage(from, { 
        text: `⛔ Límite alcanzado.\nSolo puedes tener *${data.limite}* de *${nombre}*.` 
      }, { quoted: msg });
    }
  }

  // ⚡ Descontar geos
  geosDB[sender].geos -= data.precio;

  // Reducir stock global
  personajes[nombre].stock -= 1;
  fs.writeFileSync(personajesFile, JSON.stringify(personajes, null, 2));

  // Agregar al inventario
  inventario[sender].push(nombre);
  guardarInventario(inventario);

  return sock.sendMessage(from, { text: `🟢 Compraste *${nombre}* por ${data.precio} geos.` }, { quoted: msg });
}
