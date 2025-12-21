import fs from "fs";
export const command = "cambiar";
const clubFile = "./clubs.json";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  if (!args.length) return sock.sendMessage(from, { text: "⚠️ Uso: .ccambiar <nuevo nombre>" });

  if (!fs.existsSync(clubFile)) return;
  const clubs = JSON.parse(fs.readFileSync(clubFile, "utf8"));

  let clubName = null;
  for (let c in clubs) if (clubs[c].dueño === sender) clubName = c;

  if (!clubName) return sock.sendMessage(from, { text: "❌ No eres dueño de ningún club." });

  const costo = 1000;
  if (!geosDB[clubName]) geosDB[clubName] = { geos: 0 }; // inicializar geos del club
  if (geosDB[clubName].geos < costo) return sock.sendMessage(from, { text: `❌ Necesitas ${costo} geos del club para cambiar el nombre.` });

  const nuevoNombre = args.join(" ");
  if (clubs[nuevoNombre]) return sock.sendMessage(from, { text: "❌ Ya existe un club con ese nombre." });

  clubs[nuevoNombre] = { ...clubs[clubName] };
  delete clubs[clubName];
  fs.writeFileSync(clubFile, JSON.stringify(clubs, null, 2));

  geosDB[nuevoNombre] = { geos: geosDB[clubName].geos };
  delete geosDB[clubName];

  sock.sendMessage(from, { text: `✅ El club ha cambiado su nombre a *${nuevoNombre}*.` });
}
