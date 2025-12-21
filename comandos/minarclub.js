import fs from "fs";
export const command = "minarclub";
const clubFile = "./clubs.json";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  if (!fs.existsSync(clubFile)) return;

  const clubs = JSON.parse(fs.readFileSync(clubFile, "utf8"));
  let clubName = null;

  for (let c in clubs) if (clubs[c].miembros.includes(sender)) clubName = c;

  if (!clubName) return sock.sendMessage(from, { text: "❌ No perteneces a ningún club." });

  const now = Date.now();
  const cooldown = 60 * 60 * 1000; // 1h

  if (now - (clubs[clubName].lastMinar || 0) < cooldown) {
    const falta = Math.ceil((cooldown - (now - clubs[clubName].lastMinar)) / 60000);
    return sock.sendMessage(from, { text: `⏳ Debes esperar ${falta} min para minar el club.` });
  }

  const geos = Math.floor(Math.random() * 301) + 200; // 200 a 500
  clubs[clubName].geos += geos;
  clubs[clubName].lastMinar = now;
  fs.writeFileSync(clubFile, JSON.stringify(clubs, null, 2));

  sock.sendMessage(from, { text: `⛏️ El club *${clubName}* minó y obtuvo *${geos} geos*.` });
}
