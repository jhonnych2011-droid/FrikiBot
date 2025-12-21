import fs from "fs";
import path from "path";

export const command = "aguijon";

const AGUIJON_PATH = path.join(process.cwd(), "aguijon.json");
const BOSS_PATH = path.join(process.cwd(), "bossActive.json");
const EVENT_PATH = path.join(process.cwd(), "eventos.json");

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function loadJSON(path, def = {}) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify(def, null, 2));
    return def;
  }
  
  try {
    const content = fs.readFileSync(path, "utf8").trim();
    if (!content || content === "null") {
      return def;
    }
    return JSON.parse(content);
  } catch (error) {
    return def;
  }
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  // Cargar datos
  const eventos = loadJSON(EVENT_PATH, {});
  if (!eventos.boss?.activo) {
    return sock.sendMessage(from, { text: "❌ El evento boss no está activo." });
  }

  const aguijonDB = loadJSON(AGUIJON_PATH, {});
  const boss = loadJSON(BOSS_PATH, {});
  
  // Inicializar si no existe
  if (!aguijonDB[sender]) {
    aguijonDB[sender] = { 
      nivel: 1, 
      golpes: 0, 
      geo: 0, 
      bosses: 0,
      bossesDerrotados10golpes: 0
    };
  }

  const data = aguijonDB[sender];
  
  // Obtener golpes en boss actual
  const golpesEnBossActual = boss.enemigos?.[sender]?.ataques || 0;
  const golpesRequeridos = 10;
  const golpesRestantes = Math.max(0, golpesRequeridos - golpesEnBossActual);
  
  // NIVELES DE DAÑO FIJOS
  const nivelesDaño = [15, 30, 60, 120]; // Nivel 1=15, Nivel 2=30, Nivel 3=60, Nivel 4=120
  const dañoActual = nivelesDaño[(data.nivel || 1) - 1] || 15;
  
  // Información de mejora
  const puedeMejorar = (data.bossesDerrotados10golpes || 0) >= 3;
  const siguienteNivel = (data.nivel || 1) < 4 ? (data.nivel || 1) + 1 : 4;
  const costosMejora = [0, 15000, 30000, 60000]; // Costo para subir al siguiente nivel
  const costoMejora = costosMejora[data.nivel || 1] || 0;
  
  let mensaje = `🗡️ *Aguijón de ${sender}*\n`;
  mensaje += `🏆 Nivel: ${data.nivel || 1}\n`;
  mensaje += `⚔️ Daño FIJO: ${dañoActual}\n`;
  mensaje += `💥 Golpes en boss actual: ${golpesEnBossActual}\n`;
  mensaje += `🎯 Golpes restantes para contar: ${golpesRestantes}\n`;
  mensaje += `👹 Bosses completados: ${data.bosses || 0}\n`;
  mensaje += `✅ Bosses con 10+ golpes: ${data.bossesDerrotados10golpes || 0}/3\n`;
  mensaje += `🐼 Boss actual: ${boss.nombre || "Ninguno"}\n\n`;
  
  // Información de mejora
  if ((data.nivel || 1) >= 4) {
    mensaje += `🎉 *¡NIVEL MÁXIMO ALCANZADO!*\n`;
    mensaje += `No puedes mejorar más.\n`;
  } else {
    const dañoSiguienteNivel = nivelesDaño[siguienteNivel - 1];
    mensaje += `📊 *PROGRESO PARA NIVEL ${siguienteNivel}:*\n`;
    mensaje += `⚔️ Nuevo daño: ${dañoSiguienteNivel}\n`;
    
    if ((data.bossesDerrotados10golpes || 0) >= 3) {
      mensaje += `✅ Bosses con 10+ golpes: COMPLETADO\n`;
      mensaje += `💰 Costo necesario: ${costoMejora} geos\n`;
      mensaje += `🔧 Usa *.mejorar* para subir de nivel\n`;
    } else {
      const faltanBosses = 3 - (data.bossesDerrotados10golpes || 0);
      mensaje += `❌ Te faltan: ${faltanBosses} boss${faltanBosses !== 1 ? 'es' : ''} con 10+ golpes\n`;
      mensaje += `🎯 Consejo: Ataca hasta dar 10 golpes en cada boss\n`;
    }
  }
  
  // Mostrar golpes en boss actual si aplica
  if (golpesEnBossActual > 0 && golpesEnBossActual < 10) {
    mensaje += `\n🎯 *En este boss llevas:* ${golpesEnBossActual}/10 golpes\n`;
    mensaje += `Ataca ${10 - golpesEnBossActual} veces más para que cuente`;
  } else if (golpesEnBossActual >= 10) {
    mensaje += `\n✅ *Este boss ya cuenta* (${golpesEnBossActual}/10 golpes)\n`;
    mensaje += `¡Derrótalo para sumarlo a tu progreso!`;
  }

  return sock.sendMessage(from, { text: mensaje });
}
