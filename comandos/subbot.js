// comandos/subbot.js
import fs from "fs";
import { exec } from "child_process";
import path from "path";

export const command = "subbot";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Almacenar procesos activos
const procesosActivos = new Map();

// Sistema de propiedad de sesiones
const sessionOwnersPath = './session_owners.json';
const mutedGroupsPath = './muted_groups.json';

function getSessionOwners() {
  if (!fs.existsSync(sessionOwnersPath)) {
    fs.writeFileSync(sessionOwnersPath, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(sessionOwnersPath, 'utf8'));
  } catch(e) {
    return {};
  }
}

function getMutedGroups() {
  if (!fs.existsSync(mutedGroupsPath)) {
    fs.writeFileSync(mutedGroupsPath, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(mutedGroupsPath, 'utf8'));
  } catch(e) {
    return {};
  }
}

function saveMutedGroups(data) {
  fs.writeFileSync(mutedGroupsPath, JSON.stringify(data, null, 2));
}

function muteGroupForSession(sessionNum, groupJid) {
  const muted = getMutedGroups();
  if (!muted[`session${sessionNum}`]) {
    muted[`session${sessionNum}`] = [];
  }
  if (!muted[`session${sessionNum}`].includes(groupJid)) {
    muted[`session${sessionNum}`].push(groupJid);
  }
  saveMutedGroups(muted);
}

function unmuteGroupForSession(sessionNum, groupJid) {
  const muted = getMutedGroups();
  if (muted[`session${sessionNum}`]) {
    muted[`session${sessionNum}`] = muted[`session${sessionNum}`].filter(g => g !== groupJid);
    if (muted[`session${sessionNum}`].length === 0) {
      delete muted[`session${sessionNum}`];
    }
  }
  saveMutedGroups(muted);
}

function isGroupMutedForSession(sessionNum, groupJid) {
  const muted = getMutedGroups();
  return muted[`session${sessionNum}`] && muted[`session${sessionNum}`].includes(groupJid);
}

function saveSessionOwners(data) {
  fs.writeFileSync(sessionOwnersPath, JSON.stringify(data, null, 2));
}

function isSessionOwner(sessionNum, userLid) {
  const owners = getSessionOwners();
  return owners[`session${sessionNum}`] === userLid;
}

function setSessionOwner(sessionNum, userLid) {
  const owners = getSessionOwners();
  owners[`session${sessionNum}`] = userLid;
  saveSessionOwners(owners);
}

function removeSessionOwner(sessionNum) {
  const owners = getSessionOwners();
  delete owners[`session${sessionNum}`];
  saveSessionOwners(owners);
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

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // ==============================
  // Validar argumentos
  // ==============================
  if (!args || args.length === 0) {
    const esOwner = isOwner(sender);
    
    let comandosDisponibles = `📱 *GESTIÓN DE SUB-BOTS*\n\n📋 *Comandos disponibles para ti:*\n\n`;

    comandosDisponibles += `▸ .subbot crear <número>\n`;
    comandosDisponibles += `  Crea una nueva sesión\n`;
    comandosDisponibles += `  Ejemplo: .subbot crear 1\n\n`;

    comandosDisponibles += `▸ .subbot iniciar <número>\n`;
    comandosDisponibles += `  Inicia tu sub-bot y envía QR aquí\n`;
    comandosDisponibles += `  Ejemplo: .subbot iniciar 1\n\n`;

    comandosDisponibles += `▸ .subbot detener <número>\n`;
    comandosDisponibles += `  Detiene TU sub-bot\n`;
    comandosDisponibles += `  Ejemplo: .subbot detener 1\n\n`;

    comandosDisponibles += `▸ .subbot lista\n`;
    comandosDisponibles += `  Muestra todas las sesiones\n\n`;

    comandosDisponibles += `▸ .subbot eliminar <número>\n`;
    comandosDisponibles += `  Elimina TU sesión (debe estar detenida)\n`;
    comandosDisponibles += `  Ejemplo: .subbot eliminar 1\n\n`;

    if (esOwner) {
      comandosDisponibles += `🔰 *Comandos adicionales (OWNERS):*\n\n`;

      comandosDisponibles += `▸ .subbot aqui <número>\n`;
      comandosDisponibles += `  Silencia el bot de esa sesión en ESTE grupo\n`;
      comandosDisponibles += `  (El sub-bot no responderá comandos aquí)\n\n`;

      comandosDisponibles += `▸ .subbot noaqui <número>\n`;
      comandosDisponibles += `  Reactiva el bot de esa sesión en este grupo\n\n`;

      comandosDisponibles += `▸ .subbot detener <número>\n`;
      comandosDisponibles += `  Detiene CUALQUIER sub-bot\n\n`;
      
      comandosDisponibles += `▸ .subbot reiniciar <número>\n`;
      comandosDisponibles += `  Reinicia cualquier sub-bot\n\n`;
      
      comandosDisponibles += `▸ .subbot limpiar <número>\n`;
      comandosDisponibles += `  Limpia cualquier sesión\n\n`;
      
      comandosDisponibles += `▸ .subbot estado\n`;
      comandosDisponibles += `  Muestra procesos activos\n\n`;

      comandosDisponibles += `▸ .subbot forzareliminar <número>\n`;
      comandosDisponibles += `  Elimina cualquier sesión (incluso activa)\n\n`;

      comandosDisponibles += `▸ .subbot kill\n`;
      comandosDisponibles += `  🔥 LIMPIEZA TOTAL (PELIGROSO)\n`;
      comandosDisponibles += `  Detiene todos los sub-bots y elimina:\n`;
      comandosDisponibles += `  • Todas las sesiones (session1, session2, etc.)\n`;
      comandosDisponibles += `  • Todos los backups (session_backup_*)\n`;
      comandosDisponibles += `  • Archivos QR temporales\n`;
      comandosDisponibles += `  • Configuraciones de propietarios\n\n`;
      comandosDisponibles += `  ⚠️ Esta acción NO SE PUEDE DESHACER\n\n`;
    }

    comandosDisponibles += `📷 *EL QR SE ENVIARÁ COMO IMAGEN A ESTE GRUPO*`;
    
    return sock.sendMessage(from, { text: comandosDisponibles });
  }

  const accion = args[0].toLowerCase();
  const numero = args[1];
  const esOwner = isOwner(sender);

  // ==============================
  // CREAR SESIÓN
  // ==============================
  if (accion === "crear") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot crear <número>\n\nEjemplo: .subbot crear 1" 
      });
    }

    const sessionFolder = `./session${numero}`;

    if (fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} ya existe.` 
      });
    }

    try {
      fs.mkdirSync(sessionFolder, { recursive: true });
      
      // Asignar propiedad de la sesión
      setSessionOwner(numero, sender);
      
      await sock.sendMessage(from, { 
        text: `✅ *SESIÓN ${numero} CREADA*\n\n📁 Carpeta: ${sessionFolder}\n👤 Propietario: Tú\n\n▸ Usa: .subbot iniciar ${numero}\n  Para generar el QR (se enviará como imagen aquí)` 
      });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error creando sesión: ${e.message}` 
      });
    }
    return;
  }

  // ==============================
  // INICIAR SUB-BOT
  // ==============================
  if (accion === "iniciar" || accion === "start") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot iniciar <número>\n\nEjemplo: .subbot iniciar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;

    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.\n\nUsa .subbot crear ${numero} primero.` 
      });
    }

    // Verificar propiedad (owners pueden iniciar cualquiera)
    if (!esOwner && !isSessionOwner(numero, sender)) {
      return sock.sendMessage(from, { 
        text: `❌ No eres el propietario de la sesión ${numero}.\n\nSolo puedes iniciar sesiones que hayas creado.` 
      });
    }

    const procesoKey = `session${numero}`;
    if (procesosActivos.has(procesoKey)) {
      return sock.sendMessage(from, { 
        text: `⚠️ El sub-bot ${numero} ya está en ejecución.` 
      });
    }

    await sock.sendMessage(from, { 
      text: `🔄 Iniciando sub-bot ${numero}...\n\n📷 El QR aparecerá como imagen aquí en 5-15 segundos.` 
    });

    try {
      const qrConfigPath = `./qr_config_session${numero}.json`;
      fs.writeFileSync(qrConfigPath, JSON.stringify({
        groupJid: from,
        timestamp: Date.now(),
        requestedBy: sender
      }, null, 2));

      const proceso = exec(`node bot.js --instance ${numero}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error en sub-bot ${numero}:`, error);
          procesosActivos.delete(procesoKey);
          sock.sendMessage(from, { 
            text: `❌ Sub-bot ${numero} detenido con error: ${error.message}` 
          }).catch(() => {});
        }
      });

      proceso.stdout.on('data', (data) => {
        console.log(`[SESSION${numero}] ${data}`);
      });

      proceso.stderr.on('data', (data) => {
        console.error(`[SESSION${numero}] ${data}`);
      });

      procesosActivos.set(procesoKey, proceso);

      let intentosVerificacion = 0;
      const maxIntentos = 30;
      
      const verificarQR = setInterval(async () => {
        intentosVerificacion++;
        
        const qrImagePath = `./qr_session${numero}.png`;
        
        if (fs.existsSync(qrImagePath)) {
          clearInterval(verificarQR);
          
          try {
            const qrBuffer = fs.readFileSync(qrImagePath);
            
            await sock.sendMessage(from, {
              image: qrBuffer,
              caption: `📷 *QR CODE - SESSION${numero}*\n\n` +
                      `⏳ Escanea este código QR para conectar el bot.\n\n` +
                      `⚠️ *IMPORTANTE*:\n` +
                      `• El QR expira en 60 segundos\n` +
                      `• No compartas este código\n` +
                      `• Escanea desde WhatsApp > Dispositivos vinculados\n\n` +
                      `🔄 Si expira, usa: .subbot iniciar ${numero}`
            });
            
            console.log(`✅ QR de SESSION${numero} enviado por el bot principal`);
            
            fs.unlinkSync(qrImagePath);
            if (fs.existsSync(qrConfigPath)) fs.unlinkSync(qrConfigPath);
            
          } catch (sendError) {
            console.log(`Error enviando QR: ${sendError.message}`);
            await sock.sendMessage(from, {
              text: `⚠️ Error enviando QR. Archivo guardado como: qr_session${numero}.png`
            });
          }
        }
        
        if (intentosVerificacion >= maxIntentos) {
          clearInterval(verificarQR);
          
          const tieneCredenciales = fs.existsSync(path.join(sessionFolder, "creds.json"));
          
          if (tieneCredenciales) {
            await sock.sendMessage(from, { 
              text: `✅ *SUB-BOT ${numero} CONECTADO*\n\n🔵 El bot ya estaba autenticado y se conectó automáticamente.\n\n▸ Usa: .subbot lista\n  Para verificar el estado` 
            });
          } else {
            await sock.sendMessage(from, { 
              text: `⚠️ *QR NO GENERADO EN 30 SEGUNDOS*\n\nPosibles causas:\n• El bot aún está iniciando\n• Ya está conectado\n• Hay un error en los logs\n\nIntenta de nuevo con:\n.subbot iniciar ${numero}` 
            });
          }
          
          if (fs.existsSync(qrConfigPath)) fs.unlinkSync(qrConfigPath);
        }
      }, 1000);

    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error iniciando sub-bot: ${e.message}` 
      });
    }
    return;
  }

  // ==============================
  // DETENER SUB-BOT (USUARIOS Y OWNERS)
  // ==============================
  if (accion === "detener" || accion === "stop") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot detener <número>\n\nEjemplo: .subbot detener 1" 
      });
    }

    const procesoKey = `session${numero}`;
    const proceso = procesosActivos.get(procesoKey);

    if (!proceso) {
      return sock.sendMessage(from, { 
        text: `⚠️ El sub-bot ${numero} no está en ejecución.` 
      });
    }

    // Verificar propiedad (owners pueden detener cualquiera)
    if (!esOwner && !isSessionOwner(numero, sender)) {
      return sock.sendMessage(from, { 
        text: `❌ No eres el propietario de la sesión ${numero}.\n\nSolo puedes detener sesiones que hayas creado.` 
      });
    }

    try {
      proceso.kill('SIGTERM');
      procesosActivos.delete(procesoKey);
      
      await sock.sendMessage(from, { 
        text: `✅ Sub-bot ${numero} detenido correctamente.` 
      });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error deteniendo sub-bot: ${e.message}` 
      });
    }
    return;
  }

  // ==============================
  // LISTAR SESIONES
  // ==============================
  if (accion === "lista" || accion === "list") {
    try {
      const carpetas = fs.readdirSync("./").filter(f => 
        fs.statSync(f).isDirectory() && f.startsWith("session") && f !== "session"
      );

      if (carpetas.length === 0) {
        return sock.sendMessage(from, { 
          text: "📋 No hay sesiones creadas.\n\nUsa .subbot crear <número> para crear una." 
        });
      }

      const sessionOwners = getSessionOwners();
      let mensaje = "📋 *SESIONES DISPONIBLES*\n\n";
      
      for (const carpeta of carpetas) {
        const numero = carpeta.replace("session", "");
        const tieneCredenciales = fs.existsSync(path.join(carpeta, "creds.json"));
        const estado = tieneCredenciales ? "✅ Configurada" : "⚠️ Sin configurar";
        const activo = procesosActivos.has(carpeta) ? "🔵 ACTIVO" : "⚫ INACTIVO";
        const propietario = sessionOwners[carpeta] || "Sin propietario";
        const esMia = sessionOwners[carpeta] === sender;
        
        mensaje += `▸ ${carpeta} ${esMia ? '(TUYA)' : ''}\n`;
        mensaje += `  ${estado} | ${activo}\n`;
        if (esOwner) {
          mensaje += `  👤 Propietario: ${propietario}\n`;
        }
        mensaje += `\n`;
      }

      await sock.sendMessage(from, { text: mensaje });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error listando sesiones: ${e.message}` 
      });
    }
    return;
  }

  // ==============================
  // ELIMINAR SESIÓN (CON PROTECCIÓN)
  // ==============================
  if (accion === "eliminar" || accion === "delete") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot eliminar <número>\n\nEjemplo: .subbot eliminar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    const procesoKey = `session${numero}`;

    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.` 
      });
    }

    // Verificar propiedad (owners pueden eliminar cualquiera con comando especial)
    if (!esOwner && !isSessionOwner(numero, sender)) {
      return sock.sendMessage(from, { 
        text: `❌ No eres el propietario de la sesión ${numero}.\n\nSolo puedes eliminar sesiones que hayas creado.` 
      });
    }

    // Verificar si está activo
    if (procesosActivos.has(procesoKey)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} está ACTIVA.\n\nUsa .subbot detener ${numero} primero.` 
      });
    }

    try {
      fs.rmSync(sessionFolder, { recursive: true, force: true });
      removeSessionOwner(numero);
      
      await sock.sendMessage(from, { 
        text: `✅ Sesión ${numero} eliminada correctamente.` 
      });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error eliminando sesión: ${e.message}` 
      });
    }
    return;
  }

// ==============================
  // KILL - ELIMINAR TODO (SOLO OWNERS)
  // ==============================
  if (accion === "kill" || accion === "killall") {
    if (!esOwner) {
      return sock.sendMessage(from, { 
        text: `❌ Este comando solo está disponible para owners.` 
      });
    }

    await sock.sendMessage(from, { 
      text: `⚠️ *LIMPIEZA TOTAL INICIADA*\n\n🔄 Deteniendo todos los sub-bots activos...\n🗑️ Eliminando sesiones y backups...\n\nEspera un momento...` 
    });

    let subbotsDetenidos = 0;
    let sesionesEliminadas = 0;
    let backupsEliminados = 0;
    let errores = 0;

    try {
      // 1. DETENER TODOS LOS SUB-BOTS ACTIVOS
      for (const [key, proceso] of procesosActivos.entries()) {
        try {
          proceso.kill('SIGTERM');
          procesosActivos.delete(key);
          subbotsDetenidos++;
          console.log(`✅ Detenido: ${key}`);
        } catch (e) {
          console.error(`❌ Error deteniendo ${key}:`, e.message);
          errores++;
        }
      }

      // 2. ELIMINAR TODAS LAS CARPETAS DE SESIONES
      const carpetas = fs.readdirSync("./").filter(f => {
        if (!fs.statSync(f).isDirectory()) return false;
        
        // Sesiones normales (session1, session2, etc.)
        if (f.startsWith("session") && f !== "session" && !f.includes("backup")) {
          return true;
        }
        
        // Backups de sesiones (session_backup_TIMESTAMP)
        if (f.startsWith("session_backup_") || f.startsWith("session") && f.includes("backup")) {
          return true;
        }
        
        // Carpeta "sessions" errónea
        if (f === "sessions") {
          return true;
        }
        
        return false;
      });

      for (const carpeta of carpetas) {
        try {
          if (carpeta.includes("backup") || carpeta === "sessions") {
            fs.rmSync(carpeta, { recursive: true, force: true });
            backupsEliminados++;
            console.log(`✅ Backup eliminado: ${carpeta}`);
          } else {
            const numero = carpeta.replace("session", "");
            fs.rmSync(carpeta, { recursive: true, force: true });
            removeSessionOwner(numero);
            sesionesEliminadas++;
            console.log(`✅ Sesión eliminada: ${carpeta}`);
          }
        } catch (e) {
          console.error(`❌ Error eliminando ${carpeta}:`, e.message);
          errores++;
        }
      }

      // 3. LIMPIAR ARCHIVOS QR TEMPORALES
      const archivosQR = fs.readdirSync("./").filter(f => 
        f.startsWith("qr_session") && f.endsWith(".png") ||
        f.startsWith("qr_config_session") && f.endsWith(".json")
      );

      for (const archivo of archivosQR) {
        try {
          fs.unlinkSync(archivo);
          console.log(`✅ QR eliminado: ${archivo}`);
        } catch (e) {
          console.error(`❌ Error eliminando ${archivo}:`, e.message);
        }
      }

      // 4. LIMPIAR ARCHIVOS JSON DE CONFIGURACIÓN
      try {
        if (fs.existsSync(sessionOwnersPath)) {
          fs.writeFileSync(sessionOwnersPath, JSON.stringify({}, null, 2));
          console.log(`✅ session_owners.json limpiado`);
        }
        
        if (fs.existsSync(mutedGroupsPath)) {
          fs.writeFileSync(mutedGroupsPath, JSON.stringify({}, null, 2));
          console.log(`✅ muted_groups.json limpiado`);
        }
      } catch (e) {
        console.error(`❌ Error limpiando JSONs:`, e.message);
      }

      // 5. LIMPIAR ARCHIVOS DE BACKUP JSON
      const backupJsons = fs.readdirSync("./").filter(f => 
        f.startsWith("session") && f.endsWith("_backup.json")
      );

      for (const backupJson of backupJsons) {
        try {
          fs.unlinkSync(backupJson);
          console.log(`✅ Backup JSON eliminado: ${backupJson}`);
        } catch (e) {
          console.error(`❌ Error eliminando ${backupJson}:`, e.message);
        }
      }

      // 6. MENSAJE FINAL
      let resumen = `✅ *LIMPIEZA COMPLETA*\n\n`;
      resumen += `🛑 Sub-bots detenidos: ${subbotsDetenidos}\n`;
      resumen += `📁 Sesiones eliminadas: ${sesionesEliminadas}\n`;
      resumen += `🗑️ Backups eliminados: ${backupsEliminados}\n`;
      
      if (errores > 0) {
        resumen += `\n⚠️ Errores encontrados: ${errores}`;
      }

      resumen += `\n\n🔄 Sistema limpio. Puedes crear nuevas sesiones con:\n.subbot crear <número>`;

      await sock.sendMessage(from, { text: resumen });

    } catch (e) {
      console.error('Error en kill:', e);
      return sock.sendMessage(from, { 
        text: `❌ Error durante la limpieza:\n${e.message}\n\nAlgunas sesiones pueden no haberse eliminado correctamente.` 
      });
    }
    return;
  }

  // ==============================
  // COMANDOS SOLO PARA OWNERS (DESPUÉS DE KILL)
  // ==============================
  if (!esOwner) {
    return sock.sendMessage(from, { 
      text: `❌ Comando no reconocido o no tienes permisos.\n\nTus comandos disponibles:\n• .subbot crear\n• .subbot iniciar\n• .subbot detener\n• .subbot lista\n• .subbot eliminar\n\nUsa .subbot para ver la ayuda completa.` 
    });
  }

  // ==============================
  // SILENCIAR BOT EN ESTE GRUPO (SOLO OWNERS)
  // ==============================
  if (accion === "aqui") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: `❌ Uso: .subbot aqui <número>\n\nEjemplo: .subbot aqui 1\n\n📍 Esto hará que el sub-bot ${numero} NO responda comandos en ESTE grupo.` 
      });
    }

    const sessionFolder = `./session${numero}`;
    
    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.` 
      });
    }

    // Verificar si ya está silenciado
    if (isGroupMutedForSession(numero, from)) {
      return sock.sendMessage(from, { 
        text: `⚠️ El sub-bot ${numero} ya está silenciado en este grupo.` 
      });
    }

    muteGroupForSession(numero, from);
    
    await sock.sendMessage(from, { 
      text: `🔇 *SUB-BOT ${numero} SILENCIADO*\n\n📍 El sub-bot de la sesión ${numero} NO responderá comandos en este grupo.\n\n▸ Para reactivarlo usa:\n  .subbot noaqui ${numero}` 
    });
    return;
  }

  // ==============================
  // REACTIVAR BOT EN ESTE GRUPO (SOLO OWNERS)
  // ==============================
  if (accion === "noaqui") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot noaqui <número>\n\nEjemplo: .subbot noaqui 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    
    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.` 
      });
    }

    // Verificar si está silenciado
    if (!isGroupMutedForSession(numero, from)) {
      return sock.sendMessage(from, { 
        text: `⚠️ El sub-bot ${numero} no está silenciado en este grupo.` 
      });
    }

    unmuteGroupForSession(numero, from);
    
    await sock.sendMessage(from, { 
      text: `🔊 *SUB-BOT ${numero} REACTIVADO*\n\n📍 El sub-bot de la sesión ${numero} volverá a responder comandos en este grupo.` 
    });
    return;
  }

  // ==============================
  // REINICIAR SUB-BOT (SOLO OWNERS)
  // ==============================
  if (accion === "reiniciar" || accion === "restart") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot reiniciar <número>\n\nEjemplo: .subbot reiniciar 1" 
      });
    }

    const procesoKey = `session${numero}`;
    const proceso = procesosActivos.get(procesoKey);

    await sock.sendMessage(from, { 
      text: `🔄 Reiniciando sub-bot ${numero}...` 
    });

    if (proceso) {
      try {
        proceso.kill('SIGTERM');
        procesosActivos.delete(procesoKey);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {}
    }

    args[0] = "iniciar";
    return run(sock, msg, args);
  }

  // ==============================
  // ESTADO DE PROCESOS (SOLO OWNERS)
  // ==============================
  if (accion === "estado" || accion === "status") {
    if (procesosActivos.size === 0) {
      return sock.sendMessage(from, { 
        text: "⚫ No hay sub-bots activos en este momento." 
      });
    }

    let mensaje = "🔵 *SUB-BOTS ACTIVOS*\n\n";
    const sessionOwners = getSessionOwners();
    
    for (const [key, proceso] of procesosActivos.entries()) {
      const numero = key.replace("session", "");
      const propietario = sessionOwners[key] || "Sin propietario";
      mensaje += `▸ Sub-bot ${numero}\n`;
      mensaje += `  PID: ${proceso.pid}\n`;
      mensaje += `  👤 Owner: ${propietario}\n\n`;
    }

    await sock.sendMessage(from, { text: mensaje });
    return;
  }

  // ==============================
  // LIMPIAR SESIÓN (SOLO OWNERS)
  // ==============================
  if (accion === "limpiar" || accion === "clean") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot limpiar <número>\n\nEjemplo: .subbot limpiar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    const procesoKey = `session${numero}`;

    if (procesosActivos.has(procesoKey)) {
      return sock.sendMessage(from, { 
        text: `⚠️ El sub-bot ${numero} está activo.\n\nUsa .subbot detener ${numero} primero.` 
      });
    }

    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.` 
      });
    }

    try {
      fs.rmSync(sessionFolder, { recursive: true, force: true });
      fs.mkdirSync(sessionFolder, { recursive: true });
      
      await sock.sendMessage(from, { 
        text: `✅ Sesión ${numero} limpiada.\n\n▸ Usa: .subbot iniciar ${numero}\n  Para generar un nuevo QR` 
      });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error limpiando sesión: ${e.message}` 
      });
    }
    return;
  }

  // ==============================
  // FORZAR ELIMINAR (SOLO OWNERS)
  // ==============================
  if (accion === "forzareliminar" || accion === "forcedelete") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot forzareliminar <número>\n\nEjemplo: .subbot forzareliminar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    const procesoKey = `session${numero}`;

    if (!fs.existsSync(sessionFolder)) {
      return sock.sendMessage(from, { 
        text: `⚠️ La sesión ${numero} no existe.` 
      });
    }

    // Detener si está activo
    const proceso = procesosActivos.get(procesoKey);
    if (proceso) {
      try {
        proceso.kill('SIGTERM');
        procesosActivos.delete(procesoKey);
      } catch (e) {}
    }

    try {
      fs.rmSync(sessionFolder, { recursive: true, force: true });
      removeSessionOwner(numero);
      
      await sock.sendMessage(from, { 
        text: `✅ Sesión ${numero} eliminada forzosamente.` 
      });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error eliminando sesión: ${e.message}` 
      });
    }
    return;
  }

  // Si el comando no existe
  await sock.sendMessage(from, { 
    text: `❌ Acción no reconocida: "${accion}"\n\nUsa .subbot para ver la ayuda.` 
  });
}
