export const command = "quitarcooldown";

import fs from "fs";
const clubsPath = "./clubs.json";
const ownersPath = "./owners.json";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // 🔐 Cargar owners
  let owners = {};
  if (fs.existsSync(ownersPath)) {
    owners = JSON.parse(fs.readFileSync(ownersPath, "utf-8"));
  }

  // Solo owners
  if (!owners[sender]) {
    return sock.sendMessage(from, { text: "❌ Solo los *owners* pueden usar este comando." });
  }

  // Nombre del club
  const nombre = args.join(" ").trim();
  if (!nombre) {
    return sock.sendMessage(from, { text: "⚠️ Usa: .quitarcooldown <nombre del club>" });
  }

  // Cargar clubs
  let clubs = {};
  if (fs.existsSync(clubsPath)) {
    clubs = JSON.parse(fs.readFileSync(clubsPath, "utf-8"));
  }

  // Validar club
  if (!clubs[nombre]) {
    return sock.sendMessage(from, { text: "❌ No existe ese club." });
  }

  // Quitar cooldown
  clubs[nombre].cooldownOff = true;

  // Guardar
  fs.writeFileSync(clubsPath, JSON.stringify(clubs, null, 2));

  return sock.sendMessage(from, { text: `🟢 Se quitó el cooldown del club *${nombre}*.\nAhora puede minar sin esperar.` });
}
