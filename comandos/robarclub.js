import fs from "fs";
export const command = "robarclub";
const clubFile = "./clubs.json";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  if (!args.length) return sock.sendMessage(from, { text: "⚠️ Uso: .robarclub <club objetivo>" });

  if (!fs.existsSync(clubFile)) return;
  const clubs = JSON.parse(fs.readFileSync(clubFile, "utf8"));

  let clubName = null;
  for (let c in clubs) if (clubs[c].miembros.includes(sender)) clubName = c;

  if (!clubName) return sock.sendMessage(from, { text: "❌ No perteneces a ningún club." });

  const objetivo = args.join(" ");
  if (!clubs[objetivo]) return sock.sendMessage(from, { text: "❌ No existe el club objetivo." });

  const now = Date.now();
  const cooldown = 60 * 60 * 1000; // 1h
  if (now - (clubs[clubName].lastRobar || 0) < cooldown) {
    const falta = Math.ceil((cooldown - (now - clubs[clubName].lastRobar)) / 60000);
    return sock.sendMessage(from, { text: `⏳ Debes esperar ${falta} min para robar otro club.` });
  }

  const prob = Math.random();
  let resultado;
  if (prob <= 0.4) {
    resultado = `❌ Intento fallido. No robaste geos del club *${objetivo}*`;
  } else {
    const ganancia = Math.floor(Math.random() * 301) + 100; // 100 a 400
    clubs[clubName].geos += ganancia;
    resultado = `💰 Robaste *${ganancia} geos* del club *${objetivo}* con éxito!`;
  }

  clubs[clubName].lastRobar = now;
  fs.writeFileSync(clubFile, JSON.stringify(clubs, null, 2));

  sock.sendMessage(from, { text: resultado });
}
