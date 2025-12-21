import fs from "fs";
export const command = "unirclub";
const clubFile = "./clubs.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function cargarClubs() {
  if (!fs.existsSync(clubFile)) return {};
  return JSON.parse(fs.readFileSync(clubFile, "utf8"));
}

function guardarClubs(data) {
  fs.writeFileSync(clubFile, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!args.length) return sock.sendMessage(from, { text: "⚠️ Uso: .unirclub <nombre del club>" }, { quoted: msg });

  const clubs = cargarClubs();
  const nombre = args.join(" ");

  if (!clubs[nombre]) return sock.sendMessage(from, { text: "❌ No existe ese club." }, { quoted: msg });

  // Verificar si ya pertenece a otro club
  for (let c in clubs) {
    if (clubs[c].miembros.includes(sender)) {
      return sock.sendMessage(from, { text: `❌ Ya perteneces al club *${c}*.` }, { quoted: msg });
    }
  }

  clubs[nombre].miembros.push(sender);
  guardarClubs(clubs);

  sock.sendMessage(from, { text: `✅ Te has unido al club *${nombre}*.` });
}
