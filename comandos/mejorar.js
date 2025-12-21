import fs from "fs";
import path from "path";

export const command = "mejorar";

const AGUIJON_PATH = path.join(process.cwd(), "aguijon.json");
const USERS_PATH = path.join(process.cwd(), "usuarios.json");

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

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  // Cargar datos
  const usuarios = loadJSON(USERS_PATH, {});
  let aguijonDB = loadJSON(AGUIJON_PATH, {});
  
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
  const user = usuarios[sender] || { geos: 0 };
  
  // Configuración
  const niveles = {
    1: { dañoBase: 15, costo: 15000 },
    2: { dañoBase: 30, costo: 30000 },
    3: { dañoBase: 60, costo: 60000 },
    4: { dañoBase: 120, costo: 0 }
  };
  
  // Verificar nivel máximo
  if (data.nivel >= 4) {
    return sock.sendMessage(from, { 
      text: `🎉 ¡Ya tienes el nivel máximo!\n\n` +
            `🏆 Nivel 4 - Daño: 120\n` +
            `✅ Bosses con 10+ golpes: ${data.bossesDerrotados10golpes}\n` +
            `👹 Bosses totales: ${data.bosses}`
    });
  }
  
  const siguienteNivel = data.nivel + 1;
  const requisitos = niveles[siguienteNivel];
  
  // VERIFICAR REQUISITOS
  // 1. Bosses con 10+ golpes
  if (data.bossesDerrotados10golpes < 3) {
    const faltan = 3 - data.bossesDerrotados10golpes;
    return sock.sendMessage(from, { 
      text: `❌ *Faltan bosses completados*\n\n` +
            `🔧 Para mejorar a nivel ${siguienteNivel} necesitas:\n` +
            `👑 3 bosses derrotados con 10+ golpes\n\n` +
            `📊 *Tu progreso:*\n` +
            `✅ Bosses con 10+ golpes: ${data.bossesDerrotados10golpes}/3\n` +
            `👹 Bosses totales: ${data.bosses}\n` +
            `🎯 Te faltan: ${faltan} boss${faltan !== 1 ? 'es' : ''}\n\n` +
            `💡 Ataca 10 veces en un boss y derrótalo para que cuente.`
    });
  }
  
  // 2. Geos necesarios
  if (user.geos < requisitos.costo) {
    return sock.sendMessage(from, { 
      text: `❌ *Geos insuficientes*\n\n` +
            `💰 Necesitas: ${requisitos.costo} geos\n` +
            `💳 Tienes: ${user.geos || 0} geos\n\n` +
            `✅ *Requisitos cumplidos:*\n` +
            `👑 ${data.bossesDerrotados10golpes}/3 bosses con 10+ golpes\n\n` +
            `💡 Derrota más bosses para ganar geos.`
    });
  }
  
  // CONFIRMAR MEJORA
  await sock.sendMessage(from, {
    text: `⚠️ *¿CONFIRMAR MEJORA?*\n\n` +
          `🔧 Nivel ${data.nivel} → ${siguienteNivel}\n\n` +
          `📊 *Requisitos cumplidos:*\n` +
          `✅ ${data.bossesDerrotados10golpes} bosses con 10+ golpes\n\n` +
          `💰 *Costo:* ${requisitos.costo} geos\n` +
          `⚔️ *Nuevo daño:* ${requisitos.dañoBase}\n` +
          `💳 *Tus geos:* ${user.geos}\n\n` +
          `✍️ Responde *SI* para confirmar`
  });
  
  try {
    // Esperar confirmación
    const confirmacion = await sock.ev.waitFor("messages.upsert", {
      timeout: 30000,
      filter: m => {
        const message = m.messages[0];
        return message?.key?.remoteJid === from &&
               message?.key?.participant === sender &&
               message?.message?.conversation?.toLowerCase() === "si";
      }
    });
    
    // PROCESAR MEJORA
    user.geos -= requisitos.costo;
    data.nivel = siguienteNivel;
    data.bossesDerrotados10golpes = 0; // REINICIAR CONTADOR
    data.dañoBase = requisitos.dañoBase;
    
    // Guardar cambios
    usuarios[sender] = user;
    aguijonDB[sender] = data;
    
    saveJSON(USERS_PATH, usuarios);
    saveJSON(AGUIJON_PATH, aguijonDB);
    
    await sock.sendMessage(from, {
      text: `🎉 *¡MEJORA EXITOSA!*\n\n` +
            `🔧 Agujón nivel ${siguienteNivel}\n` +
            `⚔️ Daño base: ${requisitos.dañoBase}\n` +
            `💰 Costo: ${requisitos.costo} geos\n` +
            `💳 Geos restantes: ${user.geos}\n\n` +
            `📊 *Progreso reiniciado:*\n` +
            `👑 Bosses con 10+ golpes: 0/3\n\n` +
            `💪 *Para el próximo nivel necesitarás:*\n` +
            `• 3 bosses con 10+ golpes\n` +
            `• ${niveles[siguienteNivel + 1]?.costo || 'N/A'} geos\n\n` +
            `¡Sigue mejorando!`
    });
    
  } catch (error) {
    await sock.sendMessage(from, {
      text: `⏰ *Mejora cancelada*\n\n` +
            `No se recibió confirmación.\n` +
            `Usa *.mejorar* nuevamente cuando quieras.`
    });
  }
}
