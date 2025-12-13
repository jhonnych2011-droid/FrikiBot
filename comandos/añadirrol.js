// comandos/añadirrol.js
import fs from "fs";

export const command = "añadirrol";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  // Verificar owners.json
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
  if (!owners.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo owners pueden usar este comando." }, { quoted: msg });
  }

  if (args.length < 2) {
    return sock.sendMessage(from, { text: "⚠️ Uso correcto:\n.añadirrol <nombre> <urlImagen>" }, { quoted: msg });
  }

  const nombre = args[0].toLowerCase();
  const url = args[1];

  if (!url.endsWith(".jpg") && !url.endsWith(".png")) {
    return sock.sendMessage(from, { text: "⚠️ La imagen debe ser .jpg o .png" }, { quoted: msg });
  }

  const file = "./data/roles.json";

  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  const roles = JSON.parse(fs.readFileSync(file));

  roles[nombre] = { nombre, url };

  fs.writeFileSync(file, JSON.stringify(roles, null, 2));

  return sock.sendMessage(from, { text: `✅ Rol *${nombre}* agregado correctamente.` }, { quoted: msg });
}
