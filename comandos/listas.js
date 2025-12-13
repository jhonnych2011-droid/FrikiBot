// comandos/lista.js
import fs from "fs";
import path from "path";

export const command = "lista";

const clubsFile = path.join("./data", "clubs.json");

function cargar(file, defecto) {
  if (!fs.existsSync(file)) return defecto;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sub = (args[0] || "").toLowerCase();

  if (sub !== "club") {
    return sock.sendMessage(from, { text: "❌ Uso: *.lista club*" }, { quoted: msg });
  }

  const clubs = cargar(clubsFile, {});
  const names = Object.keys(clubs);

  if (!names.length) {
    return sock.sendMessage(from, { text: "⚠️ No hay clubs creados aún." }, { quoted: msg });
  }

  // Construir lista
  let text = "📋 *Clubs creados:*\n\n";

  names.forEach((k, i) => {
    const c = clubs[k];

    const name = c.name || "Sin nombre";
    const members = Array.isArray(c.members) ? c.members.length : 0;
    const geos = c.geos || 0;

    text += `${i + 1}. ${name} — ${members} miembros — ${geos} geos\n`;
  });

  return sock.sendMessage(from, { text }, { quoted: msg });
}
