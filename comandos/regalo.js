import fs from "fs";

export const command = "regalo";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  const filePath = "./regalosGlobal.json";

  // Cargar drop
  let drop;
  try {
    drop = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return sock.sendMessage(from, { text: "🎁 No hay ningún regalo lanzado." });
  }

  // ============================
  // Drop activo?
  // ============================
  if (!drop.activo) {
    return sock.sendMessage(from, { text: "🎁 No hay ningún regalo lanzado." });
  }

  // ============================
  // Ya reclamó?
  // ============================
  if (drop.reclamadoPor.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Ya reclamaste este regalo." });
  }

  let mensaje = "🎁 *Regalo reclamado!*\n";
  let ganoAlgo = false;

  // ============================
  // GEOS (usando geosDB)
  // ============================
  if (drop.premios.geos) {
    const { cantidad, prob } = drop.premios.geos;

    if (Math.random() * 100 <= prob) {
      if (!geosDB[sender]) geosDB[sender] = { geos: 0 };

      geosDB[sender].geos += cantidad;

      mensaje += `💎 Ganaste *${cantidad} geos*!\n`;
      ganoAlgo = true;
    }
  }

  // ============================
  // PERSONAJE
  // ============================
  if (drop.premios.personaje) {
    const { nombre, prob } = drop.premios.personaje;

    if (Math.random() * 100 <= prob) {
      const inventario = JSON.parse(fs.readFileSync("./inventario.json", "utf8"));

      if (!inventario[sender]) inventario[sender] = [];

      if (!inventario[sender].includes(nombre)) {
        inventario[sender].push(nombre);
      }

      fs.writeFileSync("./inventario.json", JSON.stringify(inventario, null, 2));

      mensaje += `👤 Obtuviste el personaje *${nombre}*!\n`;
      ganoAlgo = true;
    }
  }

  // ============================
  // CARBÓN
  // ============================
  if (!ganoAlgo) {
    mensaje += "🔥 Te tocó carbón :c";
  }

  // ============================
  // Guardar reclamo
  // ============================
  drop.reclamadoPor.push(sender);
  fs.writeFileSync(filePath, JSON.stringify(drop, null, 2));

  // ============================
  // Enviar resultado
  // ============================
  return sock.sendMessage(from, { text: mensaje }, { quoted: msg });
}

