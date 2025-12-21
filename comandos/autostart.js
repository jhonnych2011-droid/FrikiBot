// comandos/autostart.js
import fs from "fs";

export const command = "autostart";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function getOwners() {
  try {
    const data = JSON.parse(fs.readFileSync('./owners.json', 'utf-8'));
    if (!Array.isArray(data)) return [];
    return data.map(o => {
      if (o.includes('@s.whatsapp.net')) {
        return o.replace('@s.whatsapp.net', '@lid');
      }
      return o;
    });
  } catch(e) {
    return [];
  }
}

function isOwner(jid) {
  const owners = getOwners();
  return owners.includes(jid);
}

const autostartPath = './autostart_subbots.json';

function getAutostart() {
  if (!fs.existsSync(autostartPath)) {
    const defaultConfig = { enabled: true, sessions: [] };
    fs.writeFileSync(autostartPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(autostartPath, 'utf8'));
  } catch(e) {
    return { enabled: true, sessions: [] };
  }
}

function saveAutostart(config) {
  fs.writeFileSync(autostartPath, JSON.stringify(config, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!isOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });
  }

  if (!args || args.length === 0) {
    return sock.sendMessage(from, { 
      text: `🚀 *GESTIÓN DE AUTO-INICIO*

▸ .autostart activar
  Activa el auto-inicio de sub-bots

▸ .autostart desactivar
  Desactiva el auto-inicio

▸ .autostart agregar <número>
  Agrega una sesión al auto-inicio
  Ejemplo: .autostart agregar 1

▸ .autostart quitar <número>
  Quita una sesión del auto-inicio
  Ejemplo: .autostart quitar 1

▸ .autostart lista
  Muestra sesiones con auto-inicio

▸ .autostart estado
  Muestra si está activado/desactivado` 
    });
  }

  const accion = args[0].toLowerCase();
  const numero = args[1];
  const config = getAutostart();

  // ==============================
  // ACTIVAR AUTO-INICIO
  // ==============================
  if (accion === "activar" || accion === "enable") {
    config.enabled = true;
    saveAutostart(config);
    return sock.sendMessage(from, { 
      text: `✅ *AUTO-INICIO ACTIVADO*\n\nLos sub-bots configurados se iniciarán automáticamente cuando se reinicie el bot principal.` 
    });
  }

  // ==============================
  // DESACTIVAR AUTO-INICIO
  // ==============================
  if (accion === "desactivar" || accion === "disable") {
    config.enabled = false;
    saveAutostart(config);
    return sock.sendMessage(from, { 
      text: `⚠️ *AUTO-INICIO DESACTIVADO*\n\nLos sub-bots NO se iniciarán automáticamente.` 
    });
  }

  // ==============================
  // AGREGAR SESIÓN
  // ==============================
  if (accion === "agregar" || accion === "add") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .autostart agregar <número>\n\nEjemplo: .autostart agregar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.\n\nCrea la sesión primero con .subbot crear ${numero}` 
      });
    }

    if (config.sessions.includes(parseInt(numero))) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} ya está en el auto-inicio.` 
      });
    }

    config.sessions.push(parseInt(numero));
    config.sessions.sort((a, b) => a - b);
    saveAutostart(config);

    return sock.sendMessage(from, { 
      text: `✅ Sesión ${numero} agregada al auto-inicio.\n\nSe iniciará automáticamente cuando reinicies el bot.` 
    });
  }

  // ==============================
  // QUITAR SESIÓN
  // ==============================
  if (accion === "quitar" || accion === "remove") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .autostart quitar <número>\n\nEjemplo: .autostart quitar 1" 
      });
    }

    const index = config.sessions.indexOf(parseInt(numero));
    if (index === -1) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no está en el auto-inicio.` 
      });
    }

    config.sessions.splice(index, 1);
    saveAutostart(config);

    return sock.sendMessage(from, { 
      text: `✅ Sesión ${numero} quitada del auto-inicio.` 
    });
  }

  // ==============================
  // LISTA DE SESIONES
  // ==============================
  if (accion === "lista" || accion === "list") {
    if (config.sessions.length === 0) {
      return sock.sendMessage(from, { 
        text: `📋 *AUTO-INICIO: ${config.enabled ? '✅ ACTIVADO' : '⚠️ DESACTIVADO'}*\n\nNo hay sesiones configuradas.\n\nUsa .autostart agregar <número> para agregar.` 
      });
    }

    let mensaje = `📋 *AUTO-INICIO: ${config.enabled ? '✅ ACTIVADO' : '⚠️ DESACTIVADO'}*\n\n`;
    mensaje += `Sesiones configuradas:\n\n`;

    for (const sessionNum of config.sessions) {
      const sessionFolder = `./session${sessionNum}`;
      const existe = fs.existsSync(sessionFolder);
      const tieneCredenciales = existe && fs.existsSync(`${sessionFolder}/creds.json`);
      
      mensaje += `▸ Session ${sessionNum}\n`;
      mensaje += `  ${existe ? '✅' : '❌'} ${existe ? (tieneCredenciales ? 'Configurada' : 'Sin configurar') : 'No existe'}\n\n`;
    }

    return sock.sendMessage(from, { text: mensaje });
  }

  // ==============================
  // ESTADO
  // ==============================
  if (accion === "estado" || accion === "status") {
    const mensaje = `📊 *ESTADO DE AUTO-INICIO*\n\n` +
                   `Estado: ${config.enabled ? '✅ ACTIVADO' : '⚠️ DESACTIVADO'}\n` +
                   `Sesiones configuradas: ${config.sessions.length}\n\n` +
                   `${config.sessions.length > 0 ? 'Sesiones: ' + config.sessions.join(', ') : 'No hay sesiones configuradas'}`;
    
    return sock.sendMessage(from, { text: mensaje });
  }

  await sock.sendMessage(from, { 
    text: `❌ Acción no reconocida: "${accion}"\n\nUsa .autostart para ver la ayuda.` 
  });
}
