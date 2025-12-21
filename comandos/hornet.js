import fs from "fs";
import { bloquear18 } from "../filtro18.js";

export const command = "hornet";

const DB_PATH = "./bot/data/hornet.json";
const OWNERS_PATH = "./owners.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function esOwner(jid) {
  const id = fixID(jid);
  if (!fs.existsSync(OWNERS_PATH)) return false;
  const owners = JSON.parse(fs.readFileSync(OWNERS_PATH, "utf8"));
  return owners.includes(id);
}

function cargarDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ imagenes: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function guardarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // ========= 🛑 FILTRO +18 BLOQUEO =========
  if (bloquear18(from, command)) {
    return sock.sendMessage(from, { text: "❌ Este comando está desactivado en este grupo." });
  }

  const sender = fixID(msg.key.participant || msg.key.remoteJid);
  let db = cargarDB();

  // ADD
  if (args[0] === "add") {
    if (!esOwner(sender)) {
      return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." }, { quoted: msg });
    }

    const url = args[1];

    if (!url || !url.startsWith("http")) {
      return sock.sendMessage(from, { text: "❌ Debes poner un link JPG/PNG válido." }, { quoted: msg });
    }

    db.imagenes.push(url);
    guardarDB(db);

    return sock.sendMessage(from, { text: "✅ Imagen añadida correctamente." }, { quoted: msg });
  }

  if (db.imagenes.length === 0) {
    return sock.sendMessage(from, { text: "⚠️ No hay imágenes en la lista.\nUsa: .hornet add <url>" }, { quoted: msg });
  }

  const random = db.imagenes[Math.floor(Math.random() * db.imagenes.length)];

  await sock.sendMessage(from, {
    image: { url: random },
    caption: "Pajero de mrd 😟"
  }, { quoted: msg });
}
