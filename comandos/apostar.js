// comandos/apostar.js
import fs from "fs";
import path from "path";

export const command = "apostar";

const EVENT_FILE = path.join(process.cwd(), "eventos.json");
const cooldowns = {}; // Guardar últimos tiempos de apuesta por usuario y modo

function loadJSON(file, def = {}) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  // ⛔ Validar evento
  const eventos = loadJSON(EVENT_FILE);
  if (!eventos.apostar?.activo) {
    return sock.sendMessage(from, { text: "❌ Este comando pertenece a un evento aún no activo." });
  }

  // Solo grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });
  }

  // Inicializar perfil si no existe
  if (!geosDB[author]) geosDB[author] = { geos: 0 };

  if (args.length < 2) {
    return sock.sendMessage(from, { 
      text: "🎰 Uso: .apostar <cantidad|todo> <bajo|medio|alto>"
    });
  }

  let cantidad;
  let apostoTodo = false;
  
  if (args[0].toLowerCase() === "todo") {
    cantidad = geosDB[author].geos;
    apostoTodo = true;
  } else {
    cantidad = parseInt(args[0]);
    if (!cantidad || cantidad <= 0) {
      return sock.sendMessage(from, { text: "⚠️ Cantidad inválida." });
    }
  }

  if (geosDB[author].geos < cantidad) {
    return sock.sendMessage(from, { text: "❌ No tienes geos suficientes." });
  }

  const modo = args[1].toLowerCase();
  if (!["bajo", "medio", "alto"].includes(modo)) {
    return sock.sendMessage(from, { text: "⚠️ Usa bajo, medio o alto." });
  }

  // Cooldowns en ms
  const tiempos = { bajo: 1 * 60 * 1000, medio: 1 * 60 * 1000, alto: 1 * 60 * 1000 };
  const ahora = Date.now();
  if (!cooldowns[author]) cooldowns[author] = {};
  const ultimo = cooldowns[author][modo] || 0;
  const tiempoRestante = tiempos[modo] - (ahora - ultimo);

  if (tiempoRestante > 0) {
    const segs = Math.ceil(tiempoRestante / 1000);
    return sock.sendMessage(from, { text: `⏳ Debes esperar ${segs} segundos antes de apostar ${modo} nuevamente.` });
  }

  // ========================================
  // SISTEMA DE PROBABILIDADES MEJORADO
  // ========================================
  let multi, probGanar;
  
  // Si apostó TODO -> todas las probabilidades bajan a 21%
  if (apostoTodo) {
    probGanar = 0.21;
    if (modo === "bajo") multi = 1.5;
    else if (modo === "medio") multi = 2;
    else multi = 3;
  }
  // Si apostó ALTO con cantidad específica -> probabilidad sube a 25%
  else if (modo === "alto") {
    multi = 3;
    probGanar = 0.25;
  }
  // Probabilidades normales para bajo y medio con cantidad
  else if (modo === "bajo") {
    multi = 1.5;
    probGanar = 0.6;
  }
  else { // medio
    multi = 2;
    probGanar = 0.5;
  }

  const gana = Math.random() < probGanar;
  let resultadoTexto = `🎰 TRAGAMONEDAS (${modo.toUpperCase()})\n\n`;

  if (gana) {
    const ganancia = Math.floor(cantidad * multi);
    geosDB[author].geos += ganancia;
    resultadoTexto += `🎉 ¡Felicidades! Ganaste *${ganancia} geos*\n💰 Ahora tienes *${geosDB[author].geos} geos*`;
  } else {
    geosDB[author].geos -= cantidad;
    resultadoTexto += `❌ Perdiste *${cantidad} geos*\n💰 Ahora tienes *${geosDB[author].geos} geos*`;
  }

  cooldowns[author][modo] = ahora;
  await sock.sendMessage(from, { text: resultadoTexto });
}
