import fs from "fs";
import { sendSafe } from "../bot.js";

export const command = "activar+18"; // ← Aquí el cambio

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sendSafe(sock, from, { text: "❌ Este comando solo funciona en grupos." });
  }

  // Obtener metadata del grupo
  const metadata = await sock.groupMetadata(from);
  const participantes = metadata.participants;

  const usuario = msg.key.participant || msg.key.remoteJid;

  const isAdmin = participantes.some(
    p => p.id === usuario && (p.admin === "admin" || p.admin === "superadmin")
  );

  if (!isAdmin) {
    return sendSafe(sock, from, { text: "❌ Solo los administradores pueden usar este comando." });
  }

  // Ya no se revisan args, porque el comando es exactamente .activar+18

  let datos = {};
  if (fs.existsSync("./+18grupos.json"))
    datos = JSON.parse(fs.readFileSync("./+18grupos.json", "utf8"));

  delete datos[from];
  fs.writeFileSync("./+18grupos.json", JSON.stringify(datos, null, 2));

  await sendSafe(sock, from, { text: "🔞 *Los comandos +18 han sido activados nuevamente.*" });
}
