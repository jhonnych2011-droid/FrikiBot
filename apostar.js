// comandos/apostar.js
import fs from "fs";

export const command = "apostar";

// Ruta de eventos
const eventosPath = "./bot/data/eventos.json";

// Cargar la DB de eventos
function cargarEventos() {
  if (fs.existsSync(eventosPath)) {
    return JSON.parse(fs.readFileSync(eventosPath, "utf8"));
  }
  return {};
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });
  }

  // ===============================
  // 🔥 SISTEMA DE EVENTOS GLOBALES
  // ===============================
  const eventos = cargarEventos();

  // Si el evento NO existe
  if (eventos.apostar === undefined) {
    return sock.sendMessage(from, {
      text: "❌ Este comando pertenece a un evento aún no activo."
    });
  }

  // Si existe, pero NO está activo (tiempo 0)
  if (eventos.apostar === 0) {
    return sock.sendMessage(from, {
      text: "❌ Este comando pertenece a un evento aún no activo."
    });
  }

  // Si está activo, pero en cooldown
  if (eventos.apostar > 0) {
    return sock.sendMessage(from, {
      text: `⏳ Este evento está en cooldown.\nEspera *${eventos.apostar} segundos*.`
    });
  }

  // ===============================
  // 🟢 LÓGICA DEL COMANDO NORMAL
  // ===============================

  // Inicializar perfil si no existe
  if (!geosDB[author]) geosDB[author] = { geos: 0 };

  if (args.length < 2) {
    return sock.sendMessage(from, {
      text: "🎰 Uso: .apostar <cantidad|todo> <bajo|medio|alto>"
    }, { quoted: msg });
  }

  let cantidad;

  if (args[0].toLowerCase() === "todo") {
    cantidad = geosDB[author].geos;
  } else {
    cantidad = parseInt(args[0]);
    if (!cantidad || cantidad <= 0) {
      return sock.sendMessage(from, { text: "⚠️ Cantidad inválida." }, { quoted: msg });
    }
  }

  if (geosDB[author].geos < cantidad) {
    return sock.sendMessage(from, {
      text: "❌ No tienes geos suficientes."
    }, { quoted: msg });
  }

  const modo = args[1].toLowerCase();

  if (!["bajo", "medio", "alto"].includes(modo)) {
    return sock.sendMessage(from, { text: "⚠️ Usa bajo, medio o alto." }, { quoted: msg });
  }

  // Multiplicadores y probabilidades
  let multi = 1.5, probGanar = 0.6;

  if (modo === "medio") {
    multi = 2;
    probGanar = 0.5;
  } else if (modo === "alto") {
    multi = 3;
    probGanar = 0.2;
  }

  // Determinar si gana
  const gana = Math.random() < probGanar;
  let txt = `🎰 TRAGAMONEDAS (${modo.toUpperCase()})\n\n`;

  if (gana) {
    const ganancia = Math.floor(cantidad * multi);
    geosDB[author].geos += ganancia;
    txt += `🎉 Ganaste *${ganancia} geos*\n💰 Ahora tienes *${geosDB[author].geos} geos*`;
  } else {
    geosDB[author].geos -= cantidad;
    txt += `❌ Perdiste *${cantidad} geos*\n💰 Ahora tienes *${geosDB[author].geos} geos*`;
  }

  await sock.sendMessage(from, { text: txt }, { quoted: msg });
}
