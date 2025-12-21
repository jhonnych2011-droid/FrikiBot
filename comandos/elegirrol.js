// comandos/elegirrol.js
import fs from "fs";

export const command = "elegirrol";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const userId = msg.key.participant || from;

  if (!args[0]) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .elegirrol <nombre>" }, { quoted: msg });
  }

  const nombre = args[0].toLowerCase();

  const rolesFile = "./data/roles.json";
  if (!fs.existsSync(rolesFile)) return sock.sendMessage(from, { text: "⚠️ No hay roles agregados." }, { quoted: msg });

  const roles = JSON.parse(fs.readFileSync(rolesFile));

  if (!roles[nombre]) {
    return sock.sendMessage(from, { text: "❌ Ese rol no existe." }, { quoted: msg });
  }

  // Guardar elección por usuario
  const eleccionesFile = "./data/elecciones_rol.json";
  if (!fs.existsSync(eleccionesFile)) fs.writeFileSync(eleccionesFile, "{}");

  const elecciones = JSON.parse(fs.readFileSync(eleccionesFile));
  elecciones[userId] = nombre;
  fs.writeFileSync(eleccionesFile, JSON.stringify(elecciones, null, 2));

  await sock.sendMessage(
    from,
    {
      image: { url: roles[nombre].url },
      caption: `✅ Elegiste a *${roles[nombre].nombre}*`
    },
    { quoted: msg }
  );
}
