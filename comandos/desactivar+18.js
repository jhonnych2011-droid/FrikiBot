import fs from "fs";
import { sendSafe } from "../bot.js";

export const command = "desactivar"; // ⬅️ Cambio aquí

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sendSafe(sock, from, { text: "❌ Este comando solo funciona en grupos." });
  }

  // Obtener metadata del grupo
  const metadata = await sock.groupMetadata(from);
  const participantes = metadata.participants;

  const user = msg.key.participant || msg.key.remoteJid;

  const isAdmin = participantes.some(p =>
    p.id === user && (p.admin === "admin" || p.admin === "superadmin")
  );

  if (!isAdmin) {
    return sendSafe(sock, from, { text: "❌ Solo los administradores pueden usar este comando." });
  }

  // ⬅️ Verificación corregida
  if (!args[0] || args[0].toLowerCase() !== "+18") {
    return sendSafe(sock, from, { text: "Uso: .desactivar +18" });
  }

  let data = {};
  if (fs.existsSync("./+18grupos.json"))
    data = JSON.parse(fs.readFileSync("./+18grupos.json", "utf8"));

  data[from] = true;
  fs.writeFileSync("./+18grupos.json", JSON.stringify(data, null, 2));

  await sendSafe(sock, from, { text: "🔞 *Los comandos +18 han sido desactivados en este grupo.*" });
}
