// drop.js
import fs from "fs";

export const command = "drop";

// Lista de owners (ejemplo, tu archivo owners.json)
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(o => o.split("@")[0]);

function esOwner(jid) {
  return owners.includes(jid.split("@")[0]);
}

export async function run(sock, msg, args, geosDB, dropsDB) {
  const from = msg.key.remoteJid;
  const jid = msg.key.participant || from;

  // Solo grupo
  if (!from.endsWith("@g.us"))
    return sock.sendMessage(from, { text: "❌ Solo en grupos." });

  // Solo owners
  if (!esOwner(jid))
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });

  if (!args[0])
    return sock.sendMessage(from, { text: "❌ Ingresa la cantidad a dropear." });

  const cantidad = parseInt(args[0].replace(/[^0-9]/g, ""));
  if (!cantidad || cantidad < 1)
    return sock.sendMessage(from, { text: "❌ Ingresa una cantidad válida." });

  dropsDB[from] = {
    cantidad,
    recogido: false
  };

  return sock.sendMessage(from, {
    text: `📦 *DROP DISPONIBLE*\nEl primero en escribir *reclamar* gana *${cantidad} geos*.`
  });
}
