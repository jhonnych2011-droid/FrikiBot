import fs from "fs";
import path from "path";

export const command = "frikibot";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;

  // ================= OBTENER EL AUTOR =================
  let authorJid = msg.key.participant || msg.key.remoteJid;
  let authorId = (authorJid.match(/\d+/g) || []).join(""); // solo números

  // ================= CARGAR OWNERS =================
  const ownersPath = path.join(process.cwd(), "owners.json");
  if (!fs.existsSync(ownersPath)) {
    return sock.sendMessage(from, { text: "❌ No encontré el archivo owners.json." });
  }

  const ownersData = JSON.parse(fs.readFileSync(ownersPath, "utf-8"));
  const OWNERS = (ownersData || []).map(o => (o.match(/\d+/g) || []).join(""));

  // ================= VERIFICAR OWNER =================
  if (!OWNERS.includes(authorId)) {
    return sock.sendMessage(from, { text: "❌ Este comando es solo para *owners*." });
  }

  // ================= LEER BOT.JS =================
  const botPath = path.join(process.cwd(), "bot.js");
  if (!fs.existsSync(botPath)) {
    return sock.sendMessage(from, { text: "❌ No encontré el archivo bot.js." });
  }

  // ================= ENVIAR COMO ARCHIVO =================
  await sock.sendMessage(from, {
    document: fs.readFileSync(botPath),
    fileName: "bot.txt",
    mimetype: "text/plain"
  });
}
