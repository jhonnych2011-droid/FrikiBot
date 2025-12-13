import fs from "fs";
import path from "path";

export const command = "atacar";

const BOSS_PATH = path.join(process.cwd(), "bossActive.json");
const EVENT_PATH = path.join(process.cwd(), "eventos.json");
const AGUIJON_PATH = path.join(process.cwd(), "aguijon.json");
const BOSS_HISTORY_PATH = path.join(process.cwd(), "bossHistory.json");
const BOSS_QUEUE_PATH = path.join(process.cwd(), "bossQueue.json");

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

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Función para obtener geos del usuario desde geosDB
function obtenerGeosUsuario(userId, geosDB) {
  if (!geosDB[userId]) {
    console.log(`⚠️ Usuario ${userId} no encontrado en geosDB, inicializando con 100 geos`);
    geosDB[userId] = { geos: 100 };
    return 100;
  }
  
  // Manejar diferentes estructuras de geosDB
  if (typeof geosDB[userId] === 'object' && geosDB[userId] !== null) {
    return geosDB[userId].geos || 0;
  }
  
  // Si es un número directamente
  if (typeof geosDB[userId] === 'number') {
    return geosDB[userId];
  }
  
  return 0;
}

// Función para restar geos
function restarGeosUsuario(userId, cantidad, geosDB) {
  const geosActuales = obtenerGeosUsuario(userId, geosDB);
  
  if (geosActuales < cantidad) {
    return false;
  }
  
  const nuevosGeos = geosActuales - cantidad;
  
  // Guardar en la estructura correcta
  if (typeof geosDB[userId] === 'object' && geosDB[userId] !== null) {
    geosDB[userId].geos = nuevosGeos;
  } else {
    geosDB[userId] = nuevosGeos;
  }
  
  return true;
}

// Función para agregar boss al historial
function agregarBossAlHistorial(boss) {
  const bossHistory = loadJSON(BOSS_HISTORY_PATH, []);
  
  bossHistory.push({
    id: boss.id || Date.now(),
    nombre: boss.nombre,
    vida: boss.maxVida,
    recompensa: boss.recompensa,
    fechaInicio: boss.fechaInicio || new Date().toISOString(),
    fechaFin: new Date().toISOString(),
    derrotado: true,
    participantes: boss.enemigos || {},
    totalAtacantes: Object.keys(boss.enemigos || {}).length,
    atacantesActivos: Object.values(boss.enemigos || {}).filter(info => info.ataques > 5).length
  });
  
  const historialLimitado = bossHistory.slice(-100);
  saveJSON(BOSS_HISTORY_PATH, historialLimitado);
  
  return historialLimitado;
}

// Función para activar siguiente boss de la cola
function activarSiguienteBoss() {
  const colaBosses = loadJSON(BOSS_QUEUE_PATH, []);
  
  if (colaBosses.length > 0) {
    const siguienteBoss = colaBosses.shift();
    siguienteBoss.activo = true;
    siguienteBoss.fechaInicio = new Date().toISOString();
    siguienteBoss.enemigos = {};
    saveJSON(BOSS_PATH, siguienteBoss);
    saveJSON(BOSS_QUEUE_PATH, colaBosses);
    return siguienteBoss;
  }
  
  return null;
}

// Función para distribuir recompensas
async function distribuirRecompensas(boss, sock, geosDB) {
  const participantes = Object.keys(boss.enemigos || {}).length;
  
  if (participantes === 0) return;
  
  // Filtrar solo a los que atacaron más de 5 veces
  const atacantesActivos = Object.entries(boss.enemigos || {})
    .filter(([_, info]) => info.ataques > 5);
  
  if (atacantesActivos.length === 0) return;
  
  const recompensaPorParticipante = Math.floor(boss.recompensa / atacantesActivos.length);
  
  for (const [userId, info] of atacantesActivos) {
    // Dar recompensa a los atacantes activos
    const geosActuales = obtenerGeosUsuario(userId, geosDB);
    const nuevosGeos = geosActuales + recompensaPorParticipante;
    
    // Guardar en estructura correcta
    if (typeof geosDB[userId] === 'object' && geosDB[userId] !== null) {
      geosDB[userId].geos = nuevosGeos;
    } else {
      geosDB[userId] = nuevosGeos;
    }
    
    // Notificar
    try {
      await sock.sendMessage(userId, {
        text: `🎉 *BOSS DERROTADO*\n\n` +
              `Has recibido: *${recompensaPorParticipante} geos*\n` +
              `🗡️ Boss: ${boss.nombre}\n` +
              `❤️ Tu daño: ${info.daño || 0}\n` +
              `⚔️ Tus ataques: ${info.ataques || 0}`
      });
    } catch (error) {
      console.log(`No se notificó a ${userId}`);
    }
  }
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  // Cargar datos
  const eventos = loadJSON(EVENT_PATH, {});
  if (!eventos.boss?.activo) {
    return sock.sendMessage(from, { text: "❌ El evento boss no está activo." });
  }

  let boss = loadJSON(BOSS_PATH, null);
  if (!boss || !boss.activo) {
    return sock.sendMessage(from, { text: "❌ No hay boss activo." });
  }

  // Verificar si el boss ya está muerto
  if (boss.vida <= 0) {
    return sock.sendMessage(from, { text: "❌ Este boss ya fue derrotado. Pronto aparecerá uno nuevo." });
  }

  // Cargar datos del aguijón
  let aguijonDB = loadJSON(AGUIJON_PATH, {});
  
  // Inicializar datos del usuario si no existen
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

  // Obtener geos del usuario DESDE geosDB
  const geosUsuario = obtenerGeosUsuario(sender, geosDB);

  // Configurar costos y cooldown
  const COSTO = boss.costoAtaque || 50;
  const COOLDOWN = 2 * 60 * 1000; // 2 minutos

  // Verificar cooldown (usando geosDB para almacenar cooldown)
  let cooldownInfo = geosDB[sender];
  if (!cooldownInfo || typeof cooldownInfo !== 'object') {
    cooldownInfo = { geos: geosUsuario, cooldownAtacar: 0 };
    geosDB[sender] = cooldownInfo;
  }
  
  const tiempoRestante = (cooldownInfo.cooldownAtacar || 0) - Date.now();
  if (tiempoRestante > 0) {
    const segs = Math.ceil(tiempoRestante / 1000);
    const mins = Math.floor(segs / 60);
    const segsRestantes = segs % 60;
    return sock.sendMessage(from, { 
      text: `⏳ Debes esperar ${mins}:${segsRestantes.toString().padStart(2, '0')} antes de atacar otra vez.` 
    });
  }

  // Verificar geos desde geosDB
  if (geosUsuario < COSTO) {
    return sock.sendMessage(from, { 
      text: `❌ No tienes suficientes geos.\n\n💰 Necesitas: ${COSTO}\n💳 Tienes: ${geosUsuario}` 
    });
  }

  // Inicializar enemigos si no existe
  if (!boss.enemigos) boss.enemigos = {};
  if (!boss.enemigos[sender]) {
    boss.enemigos[sender] = { daño: 0, ataques: 0 };
  }

  // CALCULAR DAÑO FIJO según nivel del aguijón
  const nivelesDaño = [15, 30, 60, 120]; // Nivel 1=15, Nivel 2=30, Nivel 3=60, Nivel 4=120
  const nivelActual = Math.min(Math.max(data.nivel || 1, 1), 4);
  
  // DAÑO BASE FIJO del nivel
  const dañoBase = nivelesDaño[nivelActual - 1];
  
  // SIN VARIACIÓN ALEATORIA - DAÑO EXACTO
  let daño = dañoBase;
  
  // Verificar crítico (20% chance) - CRÍTICO SÍ es aleatorio
  const esCritico = Math.random() < 0.2;
  const dañoFinal = esCritico ? Math.floor(daño * 1.5) : daño;

  // Aplicar daño al boss
  boss.vida -= dañoFinal;
  if (boss.vida < 0) boss.vida = 0;

  // Registrar ataque
  boss.enemigos[sender].daño += dañoFinal;
  boss.enemigos[sender].ataques += 1;

  // Actualizar golpes en aguijón
  data.golpes = boss.enemigos[sender].ataques;

  // RESTAR GEOS desde geosDB
  const restaExitosa = restarGeosUsuario(sender, COSTO, geosDB);
  if (!restaExitosa) {
    return sock.sendMessage(from, { 
      text: "❌ Error al procesar el pago de geos." 
    });
  }

  // Actualizar cooldown en geosDB
  if (typeof geosDB[sender] === 'object' && geosDB[sender] !== null) {
    geosDB[sender].cooldownAtacar = Date.now() + COOLDOWN;
  } else {
    // Si no es objeto, convertirlo
    geosDB[sender] = {
      geos: obtenerGeosUsuario(sender, geosDB),
      cooldownAtacar: Date.now() + COOLDOWN
    };
  }

  // Verificar si el boss muere
  const bossMurio = boss.vida === 0;
  
  if (bossMurio) {
    // Sumar un boss derrotado
    data.bosses += 1;
    data.golpes = 0;
    
    // Verificar si cuenta para mejora (10+ golpes)
    const golpesEnEsteBoss = boss.enemigos[sender].ataques;
    if (golpesEnEsteBoss >= 10) {
      data.bossesDerrotados10golpes = (data.bossesDerrotados10golpes || 0) + 1;
      console.log(`✅ ${sender} ahora tiene ${data.bossesDerrotados10golpes} bosses con 10+ golpes`);
    }
    
    // Guardar en historial
    agregarBossAlHistorial(boss);
    
    // Distribuir recompensas (pasa geosDB)
    await distribuirRecompensas(boss, sock, geosDB);
    
    // Activar siguiente boss de la cola
    const siguienteBoss = activarSiguienteBoss();
    
    if (siguienteBoss) {
      await sock.sendMessage(from, {
        text: `💀 *¡BOSS DERROTADO!*\n\n` +
              `🗡️ ${boss.nombre} ha caído\n` +
              `⚔️ Daño final: ${dañoFinal}${esCritico ? " 💥(CRÍTICO)" : ""}\n` +
              `💰 Gastaste: ${COSTO} geos\n` +
              `🎯 Golpes en este boss: ${golpesEnEsteBoss}\n` +
              `👑 Bosses derrotados total: ${data.bosses}\n` +
              `✅ Bosses con 10+ golpes: ${data.bossesDerrotados10golpes || 0}/3\n\n` +
              `⏳ *Nuevo boss activado automáticamente*`
      });
      
      setTimeout(async () => {
        await sock.sendMessage(from, {
          image: { url: siguienteBoss.img },
          caption: `🚨 *NUEVO BOSS*\n\n` +
                   `${siguienteBoss.nivel || "⭐"} *${siguienteBoss.nombre}*\n` +
                   `❤️ Vida: ${siguienteBoss.vida}\n` +
                   `💰 Recompensa: ${siguienteBoss.recompensa} geos\n` +
                   `⚔️ Costo/ataque: ${siguienteBoss.costoAtaque} geos\n\n` +
                   `⚔️ Usa *.atacar* para combatir`
        });
      }, 2000);
    } else {
      await sock.sendMessage(from, {
        text: `💀 *¡BOSS DERROTADO!*\n\n` +
              `🗡️ ${boss.nombre} ha caído\n` +
              `⚔️ Daño final: ${dañoFinal}${esCritico ? " 💥(CRÍTICO)" : ""}\n` +
              `💰 Gastaste: ${COSTO} geos\n` +
              `🎯 Golpes en este boss: ${golpesEnEsteBoss}\n` +
              `👑 Bosses derrotados total: ${data.bosses}\n` +
              `✅ Bosses con 10+ golpes: ${data.bossesDerrotados10golpes || 0}/3\n\n` +
              `📭 *No hay más bosses en cola*`
      });
    }
    
    // Actualizar eventos
    eventos.boss.activo = false;
    eventos.boss.finalizado = new Date().toISOString();
    saveJSON(EVENT_PATH, eventos);
  } else {
    // Boss aún con vida
    const golpesActuales = boss.enemigos[sender].ataques;
    const bossesCon10Golpes = data.bossesDerrotados10golpes || 0;
    const nuevosGeos = obtenerGeosUsuario(sender, geosDB);
    
    // Mostrar mensaje con DAÑO EXACTO
    await sock.sendMessage(from, {
      text: `${esCritico ? "💥 *ATAQUE CRÍTICO*" : "⚔️ *ATAQUE EXITOSO*"}\n\n` +
            `🗡️ Daño: ${dañoFinal}${esCritico ? " (CRÍTICO!)" : ""}\n` +
            `🔧 Nivel aguijón: ${nivelActual} (${dañoBase} daño base)\n` +
            `💰 Costo: ${COSTO} geos\n` +
            `💳 Tus geos: ${nuevosGeos}\n\n` +
            `📊 *ESTADÍSTICAS:*\n` +
            `❤️ Vida boss: ${boss.vida}/${boss.maxVida}\n` +
            `⚔️ Tus ataques: ${golpesActuales}\n` +
            `💀 Tu daño total: ${boss.enemigos[sender].daño}\n\n` +
            `📈 *PROGRESO MEJORA:*\n` +
            `✅ Bosses con 10+ golpes: ${bossesCon10Golpes}/3\n` +
            `🎯 Golpes en este boss: ${golpesActuales}/10\n` +
            `👑 Total bosses: ${data.bosses}\n\n` +
            `⏳ Cooldown: 2 minutos`
    });
  }

  // Guardar todos los cambios
  saveJSON(BOSS_PATH, boss);
  saveJSON(AGUIJON_PATH, aguijonDB);
  
  // geosDB se guarda automáticamente desde bot.js con guardarGeos()
}
