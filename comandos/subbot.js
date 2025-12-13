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

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // ==============================
  // Verificar owners
  // ==============================
  let owners = [];
  try {
    owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
  } catch (e) {
    return sock.sendMessage(from, { text: "❌ Error leyendo owners.json" });
  }

  if (!owners.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });
  }

  // ==============================
  // Validar argumentos
  // ==============================
  if (!args || args.length === 0) {
    return sock.sendMessage(from, { 
      text: `📱 *GESTIÓN DE SUB-BOTS*

🔹 *Comandos disponibles:*

▸ .subbot crear <número>
  Crea una nueva sesión
  Ejemplo: .subbot crear 1

▸ .subbot iniciar <número>
  Inicia un sub-bot y envía QR AQUÍ
  Ejemplo: .subbot iniciar 1

▸ .subbot detener <número>
  Detiene un sub-bot activo
  Ejemplo: .subbot detener 1

▸ .subbot lista
  Muestra todas las sesiones

▸ .subbot estado
  Muestra sub-bots activos

▸ .subbot eliminar <número>
  Elimina una sesión
  Ejemplo: .subbot eliminar 1

▸ .subbot limpiar <número>
  Limpia QR de una sesión
  Ejemplo: .subbot limpiar 1

▸ .subbot reiniciar <número>
  Reinicia un sub-bot
  Ejemplo: .subbot reiniciar 1

📱 *EL QR SE ENVIARÁ COMO IMAGEN A ESTE GRUPO*` 
    });
  }

  const accion = args[0].toLowerCase();
  const numero = args[1];

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
        text: `⚠️ La sesión ${numero} ya existe.\n\nUsa .subbot limpiar ${numero} si quieres recrearla.` 
      });
    }

    try {
      fs.mkdirSync(sessionFolder, { recursive: true });
      await sock.sendMessage(from, { 
        text: `✅ *SESIÓN ${numero} CREADA*\n\n📁 Carpeta: ${sessionFolder}\n\n▸ Usa: .subbot iniciar ${numero}\n  Para generar el QR (se enviará como imagen aquí)` 
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

    const procesoKey = `session${numero}`;
    if (procesosActivos.has(procesoKey)) {
      return sock.sendMessage(from, { 
        text: `⚠️ El sub-bot ${numero} ya está en ejecución.\n\nUsa .subbot reiniciar ${numero} si quieres reiniciarlo.` 
      });
    }

    await sock.sendMessage(from, { 
      text: `🔄 Iniciando sub-bot ${numero}...\n\n📱 El QR aparecerá como imagen aquí en unos segundos.` 
    });

    try {
      // Guardar configuración del grupo donde se ejecutó el comando
      const qrConfigPath = `./qr_config_session${numero}.json`;
      fs.writeFileSync(qrConfigPath, JSON.stringify({
        groupJid: from,
        timestamp: Date.now()
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

      // Notificar después de 5 segundos
      setTimeout(async () => {
        const tieneCredenciales = fs.existsSync(path.join(sessionFolder, "creds.json"));
        
        if (tieneCredenciales) {
          await sock.sendMessage(from, { 
            text: `✅ *SUB-BOT ${numero} CONECTADO*\n\n🟢 El bot ya estaba autenticado y se conectó automáticamente.\n\n▸ Usa: .subbot estado\n  Para verificar el estado` 
          });
        } else {
          await sock.sendMessage(from, { 
            text: `⏳ *SUB-BOT ${numero} INICIADO*\n\n📱 Esperando QR...\n\n⏰ El QR debería aparecer en 5-15 segundos como imagen.\n\nSi no aparece, puede que:\n• Ya esté conectado\n• Haya un error (revisa logs)\n• El proceso tarde en iniciar` 
          });
        }
      }, 5000);

    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error iniciando sub-bot: ${e.message}` 
      });
    }
    return;
  }

  // ==============================
  // DETENER SUB-BOT
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
  // REINICIAR SUB-BOT
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

    // Detener si está activo
    if (proceso) {
      try {
        proceso.kill('SIGTERM');
        procesosActivos.delete(procesoKey);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {}
    }

    // Reiniciar usando la lógica de iniciar
    args[0] = "iniciar";
    return run(sock, msg, args);
  }

  // ==============================
  // LISTAR SESIONES
  // ==============================
  if (accion === "lista" || accion === "list") {
    try {
      const carpetas = fs.readdirSync("./").filter(f => 
        fs.statSync(f).isDirectory() && f.startsWith("session")
      );

      if (carpetas.length === 0) {
        return sock.sendMessage(from, { 
          text: "📁 No hay sesiones creadas.\n\nUsa .subbot crear <número> para crear una." 
        });
      }

      let mensaje = "📁 *SESIONES DISPONIBLES*\n\n";
      
      for (const carpeta of carpetas) {
        const numero = carpeta.replace("session", "") || "Principal";
        const tieneCredenciales = fs.existsSync(path.join(carpeta, "creds.json"));
        const estado = tieneCredenciales ? "✅ Configurada" : "⚠️ Sin configurar";
        const activo = procesosActivos.has(carpeta) ? "🟢 ACTIVO" : "⚪ INACTIVO";
        
        mensaje += `▸ ${carpeta}\n`;
        mensaje += `  ${estado} | ${activo}\n\n`;
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
  // ESTADO DE PROCESOS
  // ==============================
  if (accion === "estado" || accion === "status") {
    if (procesosActivos.size === 0) {
      return sock.sendMessage(from, { 
        text: "⚪ No hay sub-bots activos en este momento." 
      });
    }

    let mensaje = "🟢 *SUB-BOTS ACTIVOS*\n\n";
    
    for (const [key, proceso] of procesosActivos.entries()) {
      const numero = key.replace("session", "");
      mensaje += `▸ Sub-bot ${numero}\n`;
      mensaje += `  PID: ${proceso.pid}\n\n`;
    }

    await sock.sendMessage(from, { text: mensaje });
    return;
  }

  // ==============================
  // ELIMINAR SESIÓN
  // ==============================
  if (accion === "eliminar" || accion === "delete") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot eliminar <número>\n\nEjemplo: .subbot eliminar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    const procesoKey = `session${numero}`;

    // Verificar si está activo
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
  // LIMPIAR SESIÓN (para generar nuevo QR)
  // ==============================
  if (accion === "limpiar" || accion === "clean") {
    if (!numero || isNaN(numero)) {
      return sock.sendMessage(from, { 
        text: "❌ Uso: .subbot limpiar <número>\n\nEjemplo: .subbot limpiar 1" 
      });
    }

    const sessionFolder = `./session${numero}`;
    const procesoKey = `session${numero}`;

    // Verificar si está activo
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
      // Eliminar y recrear la carpeta
      fs.rmSync(sessionFolder, { recursive: true, force: true });
      fs.mkdirSync(sessionFolder, { recursive: true });
      
      await sock.sendMessage(from, { 
        text: `✅ Sesión ${numero} limpiada.\n\n▸ Usa: .subbot iniciar ${numero}\n  Para generar un nuevo QR (se enviará como imagen aquí)` 
      });
    } catch (e) {
      return sock.sendMessage(from, { 
        text: `❌ Error limpiando sesión: ${e.message}` 
      });
    }
    return;
  }

  // Si la acción no es reconocida
  await sock.sendMessage(from, { 
    text: `❌ Acción no reconocida: "${accion}"\n\nUsa .subbot sin argumentos para ver la ayuda.` 
  });
}
