import fs from "fs";
import path from "path";

export const command = "total";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  const comandosPath = path.join(process.cwd(), "comandos");

  if (!fs.existsSync(comandosPath)) {
    return sock.sendMessage(from, { text: "❌ No encontré la carpeta de comandos." });
  }

  // Leer todos los archivos .js
  const archivos = fs.readdirSync(comandosPath).filter(a => a.endsWith(".js"));

  const total = archivos.length;

  await sock.sendMessage(from, { text: `Comandos totales: ${total}` });
}
