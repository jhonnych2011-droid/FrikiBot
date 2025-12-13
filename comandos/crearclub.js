// comandos/crear.js
import fs from "fs";
import path from "path";

const clubsPath = "./clubs.json";

function cargarClubs() {
  if (!fs.existsSync(clubsPath)) fs.writeFileSync(clubsPath, "{}");
  return JSON.parse(fs.readFileSync(clubsPath, "utf8"));
}

function guardarClubs(data) {
  fs.writeFileSync(clubsPath, JSON.stringify(data, null, 2));
}

export const command = "crear";
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const nombre = args.join(" ").trim();

  if (!nombre)
    return sock.sendMessage(from, { text: "⚠️ Escribe un nombre para el club.\nEj: *.crear Los Titanes*" });

  const clubs = cargarClubs();

  // Verificar si ya pertenece a un club
  const yaTieneClub = Object.values(clubs).find(c => c.miembros?.includes(sender));
  if (yaTieneClub)
    return sock.sendMessage(from, { text: "⚠️ Ya estás en un club, no puedes crear otro." });

  // Verificar si ya existe ese club
  if (clubs[nombre])
    return sock.sendMessage(from, { text: "⚠️ Ya existe un club con ese nombre." });

  // Crear el nuevo club
  clubs[nombre] = {
    nombre,
    creador: sender,
    geos: 0,
    miembros: [sender]
  };

  guardarClubs(clubs);

  await sock.sendMessage(from, { text: `✅ Club *${nombre}* creado con éxito.` });
}
