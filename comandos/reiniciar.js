// comandos/reiniciar.js
import fs from "fs";
import { exec } from "child_process";

export const command = "reiniciar";

function normalizarId(id) {
  if (!id) return null;
  return id.replace(/(@.+)/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);

  if (!owners.includes(sender))
    return sock.sendMessage(from, { text: "❌ No eres Owner, no toques mis sistemas." });

  await sock.sendMessage(from, { text: "♻️ Reiniciando bot desde PM2..." });

  exec("pm2 restart bot", (err) => {
    if (err) {
      console.log("Error reiniciando PM2:", err);
      return sock.sendMessage(from, { text: "⚠️ Error al reiniciar el bot." });
    }
  });
}
