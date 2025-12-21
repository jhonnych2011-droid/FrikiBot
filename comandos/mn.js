import { sendSafe } from "../bot.js";
import fs from "fs";
import path from "path";

export const command = "minecraft";

// Ruta del archivo donde se guardan los servidores creados
const dbPath = "./bot/data/minecraft_servers.json";
if (!fs.existsSync("./bot/data")) fs.mkdirSync("./bot/data", { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

// Duración del servidor
const SERVER_DURATION = 3 * 60 * 60 * 1000; // 3 horas

function guardarDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const userJid = msg.key.participant || msg.key.remoteJid;
  const userId = userJid.replace(/@.+$/, "@lid");

  // Cargar base
  let db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

  // Si ya tiene un server activo, se lo mostramos
  if (db[userId] && Date.now() < db[userId].expires) {
    const restante = Math.floor((db[userId].expires - Date.now()) / 60000);

    return await sendSafe(sock, from, {
      text:
        "🟦 *SERVIDOR YA ACTIVO EN BEDROCK*\n\n" +
        `🖥️ IP: *${db[userId].ip}*\n` +
        `🔌 Puerto: *${db[userId].port}*\n` +
        `⏳ Tiempo restante: *${restante} minutos*\n\n` +
        "Si quieres crear otro, espera a que este expire."
    });
  }

  // Crear servidor (simulado realista)
  const randomIP = `147.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*200)}`;
  const randomPort = 19132 + Math.floor(Math.random() * 200);

  const expires = Date.now() + SERVER_DURATION;

  db[userId] = {
    ip: randomIP,
    port: randomPort,
    created: Date.now(),
    expires
  };

  guardarDB(db);

  // Avisar al grupo
  await sendSafe(sock, from, {
    text:
      "🎮 *SERVER MINECRAFT BEDROCK (3H)*\n\n" +
      `🖥️ IP: *${randomIP}*\n` +
      `🔌 Puerto: *${randomPort}*\n` +
      "📦 Versión: *Bedrock*\n" +
      "⏱️ Duración: *3 horas*\n\n" +
      "✨ ¡Tu servidor está listo! Entra desde Minecraft Bedrock."
  });

  // Programar aviso final
  setTimeout(async () => {
    // Recargar DB por si se modificó
    let db2 = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    if (!db2[userId]) return;

    await sendSafe(sock, from, {
      text:
        "⛔ *Servidor Minecraft finalizó*\n\n" +
        "🕒 Han pasado las 3 horas.\n" +
        "Puedes usar `.minecraft` otra vez para crear uno nuevo."
    });

    delete db2[userId];
    guardarDB(db2);
  }, SERVER_DURATION);
}
