import fs from "fs";

const GEOS_PATH = "./geos.json";
const TRATOS_PATH = "./tratos.json";

// ================================
// Cargar BD
// ================================
function loadDB(path) {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function saveDB(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// ================================
// Función para cobrar deudas vencidas
// ================================
export function revisarDeudas() {
  let geos = loadDB(GEOS_PATH);
  let tratos = loadDB(TRATOS_PATH);

  const ahora = Date.now();

  for (const user in tratos) {
    const trato = tratos[user];

    if (!trato || !trato.expira) continue;

    if (ahora >= trato.expira) {
      // Deuda vencida → COBRO DOBLE
      const deudaTotal = trato.cantidad * 2;

      if (!geos[user]) geos[user] = 0;

      geos[user] -= deudaTotal;

      console.log(
        `⏰ Deuda vencida de ${user}: -${deudaTotal} GEOS (cobro doble)`
      );

      // eliminar el trato
      delete tratos[user];
    }
  }

  saveDB(GEOS_PATH, geos);
  saveDB(TRATOS_PATH, tratos);
}


// ================================
// COMANDO .devolver
// ================================
export const command = "devolver";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  const cantidad = parseInt(args[0]);
  const overload = args[1];

  if (!cantidad || !overload) {
    return sock.sendMessage(from, { text: "Uso: .devolver <cantidad> <overload>" });
  }

  let geos = loadDB(GEOS_PATH);
  let tratos = loadDB(TRATOS_PATH);

  const authorID = author.split("@")[0];
  const overloadID = overload.replace("@", "").trim();

  if (!tratos[authorID]) {
    return sock.sendMessage(from, { text: "❌ No tienes ningún trato activo." });
  }

  const trato = tratos[authorID];

  // Cálculo del 15% extra
  const totalAPagar = Math.floor(cantidad + cantidad * 0.15);

  if (!geos[authorID] || geos[authorID] < totalAPagar) {
    return sock.sendMessage(from, { text: "❌ No tienes geos suficientes para pagar esa cantidad." });
  }

  // Paga la deuda
  geos[authorID] -= totalAPagar;

  // Se le suma al que prestó
  if (!geos[overloadID]) geos[overloadID] = 0;
  geos[overloadID] += cantidad;

  // Eliminar trato
  delete tratos[authorID];

  saveDB(GEOS_PATH, geos);
  saveDB(TRATOS_PATH, tratos);

  return sock.sendMessage(
    from,
    {
      text: `💰 @${authorID} devolvió *${cantidad}* GEOS (+15% interés = ${totalAPagar}) a @${overloadID}`,
      mentions: [
        `${authorID}@s.whatsapp.net`,
        `${overloadID}@s.whatsapp.net`,
      ],
    }
  );
}
