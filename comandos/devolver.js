import fs from "fs";

const DB_PATH = "./tratos.json";

// Crear base si no existe
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
}

// ==============================
// EXPORT PRINCIPAL DEL COMANDO
// ==============================
export const command = "devolver";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });
  }

  // Cargar tratos
  const tratos = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  // Ver si tiene trato activo
  const trato = tratos[author];
  if (!trato) {
    return sock.sendMessage(from, { text: "❌ No tienes tratos activos." }, { quoted: msg });
  }

  // Ver si tiene suficientes geos
  if (!geosDB[author]) geosDB[author] = { geos: 0 };

  const costo = trato.costo;
  const tiene = geosDB[author].geos;

  if (tiene < costo) {
    return sock.sendMessage(from, {
      text: `❌ No tienes suficientes geos.\nNecesitas *${costo}* geos.\nTú tienes: *${tiene}*`
    }, { quoted: msg });
  }

  // Quitar geos
  geosDB[author].geos -= costo;

  // Eliminar trato
  delete tratos[author];
  fs.writeFileSync(DB_PATH, JSON.stringify(tratos, null, 2));

  await sock.sendMessage(from, {
    text: `🔄 Has devuelto tu trato.\n💎 Se te descontaron *${costo} geos*.\nAhora tienes *${geosDB[author].geos} geos*.`
  }, { quoted: msg });
}

// ===============================================
// FUNCIÓN AUTOMÁTICA PARA EL BOT.JS
// ===============================================
export function revisarDeudas(geosDB) {
  const tratos = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  let cambios = false;

  const ahora = Date.now();

  for (const user in tratos) {
    const data = tratos[user];

    if (ahora >= data.limite) {
      // Tiempo vencido
      let quitar = data.costo;

      if (!geosDB[user]) geosDB[user] = { geos: 0 };

      // Si no tiene geos → castigo doble
      if (geosDB[user].geos <= 0) {
        quitar *= 2;
      }

      geosDB[user].geos -= quitar;

      // Eliminar trato
      delete tratos[user];
      cambios = true;
    }
  }

  if (cambios) {
    fs.writeFileSync(DB_PATH, JSON.stringify(tratos, null, 2));
  }
}
