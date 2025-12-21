// comandos/off.js
import fs from "fs";
import { exec } from "child_process";

export const command = "off";

function normalizarId(id) {
  if (!id) return null;
  return id.replace(/(@.+)/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);

  if (!owners.includes(sender))
    return sock.sendMessage(from, { text: "❌ No eres Owner, este comando es prohibido." });

  await sock.sendMessage(from, { text: "🛑 Apagando el bot en PM2..." });

  exec("pm2 stop bot", (err) => {
    if (err) {
      console.log("Error apagando PM2:", err);
      return sock.sendMessage(from, { text: "⚠️ Error al apagar el bot." });
    }
    process.exit(0); // garantiza que el bot se cierre de verdad
  });
}
