import fs from "fs";
import fetch from "node-fetch";
import { bloquear18 } from "../filtro18.js";

export const command = "videox";

const DB_PATH = "./videox.json";

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
}

// Owners
const owners = JSON.parse(fs.readFileSync('./owners.json', 'utf8'))
  .map(j => j.replace(/@.+$/, "@s.whatsapp.net"));

function esOwner(jid) {
  return owners.includes(jid.replace(/@.+$/, "@s.whatsapp.net"));
}

// Convertir Streamable → MP4
async function streamableToMP4(url) {
  try {
    const match = url.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    const id = match[1];

    const api = `https://api.streamable.com/videos/${id}`;
    const res = await fetch(api);
    const json = await res.json();

    const mp4 = json?.files?.mp4?.url;
    if (!mp4) return null;

    return mp4.startsWith("http") ? mp4 : "https:" + mp4;
  } catch (e) {
    return null;
  }
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // ========= 🛑 FILTRO +18 BLOQUEO =========
  if (bloquear18(from, command)) {
    return sock.sendMessage(from, { text: "❌ Este comando está desactivado en este grupo." });
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH));

  // AGREGAR VIDEO (solo owners)
  if (args[0] === "add") {
    if (!esOwner(sender)) {
      return sock.sendMessage(from, { text: "❌ Solo los Owners pueden agregar videos." });
    }

    const url = args[1];
    if (!url) {
      return sock.sendMessage(from, { text: "❌ Debes poner un enlace.\nEjemplo: .videox add <url>" });
    }

    let finalURL = url;

    if (url.includes("streamable.com")) {
      const mp4 = await streamableToMP4(url);
      if (!mp4) {
        return sock.sendMessage(from, { text: "❌ No pude convertir el Streamable a mp4." });
      }
      finalURL = mp4;
    }

    if (!finalURL.includes(".mp4")) {
      return sock.sendMessage(from, { text: "❌ El link no es un mp4 válido." });
    }

    db.push(finalURL);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    return sock.sendMessage(from, { text: "✅ Video agregado correctamente." });
  }

  // ENVIAR VIDEO RANDOM
  if (db.length === 0) {
    return sock.sendMessage(from, { text: "❌ No hay videos agregados.\nUsa: .videox add <url>" });
  }

  const randomVideo = db[Math.floor(Math.random() * db.length)];

  try {
    await sock.sendMessage(from, {
      video: { url: randomVideo },
      caption: "🎬 Video enviado"
    });
  } catch (err) {
    await sock.sendMessage(from, { text: "❌ Error enviando el video." });
  }
}
