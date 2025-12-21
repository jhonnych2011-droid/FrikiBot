import fs from "fs";
export const command = "crear";

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

  if (!args.length) return sock.sendMessage(from, { text: "⚠️ Uso: .crear <nombre del club>" }, { quoted: msg });

  const clubs = cargarClubs();

  // Verificar si ya pertenece a un club
  for (let c in clubs) {
    if (clubs[c].miembros.includes(sender)) {
      return sock.sendMessage(from, { text: `❌ Ya perteneces al club *${c}*.` }, { quoted: msg });
    }
  }

  const nombre = args.join(" ");

  if (clubs[nombre]) return sock.sendMessage(from, { text: "⚠️ Ya existe un club con ese nombre." }, { quoted: msg });

  clubs[nombre] = {
    dueño: sender,
    miembros: [sender],
    geos: 0,
    lastMinar: 0,
    lastRobar: 0
  };

  guardarClubs(clubs);
  sock.sendMessage(from, { text: `✅ Club *${nombre}* creado con éxito.` });
}
