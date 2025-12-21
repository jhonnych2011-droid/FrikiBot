// comandos/vinculacion.js
import fs from 'fs';
import crypto from 'crypto';

export const command = 'vincular';

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Base de datos de códigos activos
const CODIGOS_PATH = './vinculacion_codigos.json';
const INTENTOS_PATH = './vinculacion_intentos.json';

// Inicializar base de datos si no existe
if (!fs.existsSync(CODIGOS_PATH)) {
  fs.writeFileSync(CODIGOS_PATH, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(INTENTOS_PATH)) {
  fs.writeFileSync(INTENTOS_PATH, JSON.stringify({}, null, 2));
}

// Función para generar código único de 8 dígitos
function generarCodigo() {
  // Generar 8 dígitos aleatorios
  const codigo = Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
  
  // Verificar que no exista (muy improbable pero por seguridad)
  let codigosDB = JSON.parse(fs.readFileSync(CODIGOS_PATH, 'utf8'));
  
  // Si por algún milagro existe, generar otro
  while (codigosDB[codigo]) {
    const nuevoCodigo = Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
    
    if (!codigosDB[nuevoCodigo]) {
      return nuevoCodigo;
    }
  }
  
  return codigo;
}

// Función para registrar intento
function registrarIntento(usuarioLid) {
  let intentosDB = JSON.parse(fs.readFileSync(INTENTOS_PATH, 'utf8'));
  
  if (!intentosDB[usuarioLid]) {
    intentosDB[usuarioLid] = {
      intentos: 0,
      ultimoIntento: 0,
      bloqueadoHasta: 0
    };
  }
  
  const ahora = Date.now();
  const datosUsuario = intentosDB[usuarioLid];
  
  // Resetear intentos después de 24 horas
  if (ahora - datosUsuario.ultimoIntento > 24 * 60 * 60 * 1000) {
    datosUsuario.intentos = 0;
  }
  
  datosUsuario.intentos++;
  datosUsuario.ultimoIntento = ahora;
  
  // Bloquear después de 5 intentos por 1 hora
  if (datosUsuario.intentos >= 5) {
    datosUsuario.bloqueadoHasta = ahora + (60 * 60 * 1000);
  }
  
  fs.writeFileSync(INTENTOS_PATH, JSON.stringify(intentosDB, null, 2));
  return datosUsuario;
}

// Función para verificar si está bloqueado
function estaBloqueado(usuarioLid) {
  const intentosDB = JSON.parse(fs.readFileSync(INTENTOS_PATH, 'utf8'));
  const datosUsuario = intentosDB[usuarioLid];
  
  if (!datosUsuario) return { bloqueado: false };
  
  const ahora = Date.now();
  
  if (datosUsuario.bloqueadoHasta && ahora < datosUsuario.bloqueadoHasta) {
    return {
      bloqueado: true,
      tiempoRestante: Math.ceil((datosUsuario.bloqueadoHasta - ahora) / (60 * 1000))
    };
  }
  
  return { bloqueado: false };
}

// Función para limpiar códigos expirados
function limpiarCodigosExpirados() {
  let codigosDB = JSON.parse(fs.readFileSync(CODIGOS_PATH, 'utf8'));
  const ahora = Date.now();
  let eliminados = 0;
  
  for (const [codigo, datos] of Object.entries(codigosDB)) {
    if (ahora > datos.expira) {
      delete codigosDB[codigo];
      eliminados++;
    }
  }
  
  if (eliminados > 0) {
    fs.writeFileSync(CODIGOS_PATH, JSON.stringify(codigosDB, null, 2));
  }
  
  return eliminados;
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderLid = fixID(sender);
  const esGrupo = from.endsWith('@g.us');
  
  // ==============================
  // VERIFICAR BLOQUEO
  // ==============================
  const bloqueo = estaBloqueado(senderLid);
  
  if (bloqueo.bloqueado) {
    return sock.sendMessage(from, {
      text: `⚠️ *CUENTA BLOQUEADA*\n\nHas excedido el límite de intentos.\n\n⏳ Tiempo restante: ${bloqueo.tiempoRestante} minutos\n\n📞 Contacta a un administrador para ayuda.`
    });
  }
  
  // ==============================
  // LIMPIAR CÓDIGOS EXPIRADOS
  // ==============================
  limpiarCodigosExpirados();
  
  // ==============================
  // SIN ARGUMENTOS: ENVIAR INSTUCCIONES
  // ==============================
  if (!args || args.length === 0) {
    const mensajeInstrucciones = 
      `✤ Vincula tu *cuenta* usando el *código.*\n\n` +
      `> ✥ Sigue las *instrucciones*\n\n` +
      `*›* Click en los *3 puntos*\n` +
      `*›* Toque *dispositivos vinculados*\n` +
      `*›* Vincular *nuevo dispositivo*\n` +
      `*›* Selecciona *Vincular con el número de teléfono*\n\n` +
      `ꕤ *\`Importante\`*\n` +
      `> ₊·( 🜸 ) ➭ Este *Código* solo funciona en el *número que lo solicito*\n\n` +
      `🔢 Para generar tu código de 8 dígitos, escribe:\n` +
      `.vincular generar\n\n` +
      `🔍 Para verificar un código, escribe:\n` +
      `.vincular verificar <código>`;
    
    return sock.sendMessage(from, { text: mensajeInstrucciones });
  }
  
  const accion = args[0].toLowerCase();
  
  // ==============================
  // GENERAR CÓDIGO
  // ==============================
  if (accion === 'generar' || accion === 'gen' || accion === 'crear') {
    // Registrar intento
    const datosUsuario = registrarIntento(senderLid);
    
    // Verificar límite de intentos
    if (datosUsuario.intentos >= 5) {
      return sock.sendMessage(from, {
        text: `⚠️ *LÍMITE ALCANZADO*\n\nHas solicitado ${datosUsuario.intentos} códigos en las últimas 24 horas.\n\n⏳ Espera 24 horas para solicitar otro código.\n\n📞 Contacta a un administrador si es urgente.`
      });
    }
    
    // Generar código
    const codigo = generarCodigo();
    const ahora = Date.now();
    const expiraEn = 5 * 60 * 1000; // 5 minutos
    
    // Guardar en base de datos
    let codigosDB = JSON.parse(fs.readFileSync(CODIGOS_PATH, 'utf8'));
    
    codigosDB[codigo] = {
      usuario: senderLid,
      creado: ahora,
      expira: ahora + expiraEn,
      usado: false,
      grupo: esGrupo ? from : null,
      nombreUsuario: msg.pushName || 'Usuario'
    };
    
    fs.writeFileSync(CODIGOS_PATH, JSON.stringify(codigosDB, null, 2));
    
    // Formatear código para mostrar
    const codigoFormateado = codigo.match(/.{1,2}/g).join(' ');
    
    const mensajeCodigo = 
      `✅ *CÓDIGO GENERADO*\n\n` +
      `🔢 *Tu código de 8 dígitos:*\n` +
      `\`\`\`${codigoFormateado}\`\`\`\n\n` +
      `⚠️ *INFORMACIÓN IMPORTANTE:*\n\n` +
      `• ⏳ *Expira en:* 5 minutos\n` +
      `• 📱 *Válido solo para:* ${msg.pushName || 'Tu número'}\n` +
      `• 🔒 *NO compartas* este código\n` +
      `• 🚫 *NO lo publiques* en grupos\n\n` +
      `📋 *PARA USAR EL CÓDIGO:*\n\n` +
      `1️⃣ Abre WhatsApp\n` +
      `2️⃣ Toca los 3 puntos (⋮)\n` +
      `3️⃣ Selecciona "Dispositivos vinculados"\n` +
      `4️⃣ Toca "Vincular nuevo dispositivo"\n` +
      `5️⃣ Selecciona "Vincular con número de teléfono"\n` +
      `6️⃣ Ingresa el código: *${codigo}*\n\n` +
      `ꕤ *\`Recordatorio\`*\n` +
      `> ₊·( 🜸 ) ➭ Este código *SOLO FUNCIONA* con tu número\n\n` +
      `🔄 *Verificar:* .vincular verificar ${codigo}`;
    
    // Si es grupo, enviar MD primero
    if (esGrupo) {
      await sock.sendMessage(from, {
        text: `📨 *CÓDIGO ENVIADO POR MD*\n\nHe enviado tu código de 8 dígitos por mensaje privado.\n\nRevisa tus mensajes directos.`
      });
      
      // Enviar código por MD
      await sock.sendMessage(sender, { text: mensajeCodigo });
    } else {
      // Enviar código directamente en privado
      await sock.sendMessage(from, { text: mensajeCodigo });
    }
    
    return;
  }
  
  // ==============================
  // VERIFICAR CÓDIGO
  // ==============================
  if (accion === 'verificar' || accion === 'ver' || accion === 'check') {
    if (args.length < 2) {
      return sock.sendMessage(from, {
        text: `❌ *USO INCORRECTO*\n\nPara verificar un código:\n.vincular verificar <código>\n\nEjemplo: .vincular verificar 12345678`
      });
    }
    
    const codigoIngresado = args[1].replace(/\s/g, ''); // Eliminar espacios
    
    // Verificar que sea un código válido (8 dígitos)
    if (!/^\d{8}$/.test(codigoIngresado)) {
      return sock.sendMessage(from, {
        text: `❌ *CÓDIGO INVÁLIDO*\n\nEl código debe tener exactamente 8 dígitos.\n\nEjemplo: 12345678`
      });
    }
    
    let codigosDB = JSON.parse(fs.readFileSync(CODIGOS_PATH, 'utf8'));
    const datosCodigo = codigosDB[codigoIngresado];
    const ahora = Date.now();
    
    // Verificar si el código existe
    if (!datosCodigo) {
      return sock.sendMessage(from, {
        text: `❌ *CÓDIGO NO ENCONTRADO*\n\nEste código no existe o ha expirado.\n\nSolicita un nuevo código con:\n.vincular generar`
      });
    }
    
    // Verificar si ha expirado
    if (ahora > datosCodigo.expira) {
      delete codigosDB[codigoIngresado];
      fs.writeFileSync(CODIGOS_PATH, JSON.stringify(codigosDB, null, 2));
      
      return sock.sendMessage(from, {
        text: `❌ *CÓDIGO EXPIRADO*\n\nEste código ha expirado después de 5 minutos.\n\nSolicita un nuevo código con:\n.vincular generar`
      });
    }
    
    // Verificar si ya fue usado
    if (datosCodigo.usado) {
      return sock.sendMessage(from, {
        text: `❌ *CÓDIGO YA USADO*\n\nEste código ya ha sido utilizado anteriormente.\n\nSolicita un nuevo código con:\n.vincular generar`
      });
    }
    
    // Verificar que sea el usuario correcto
    if (datosCodigo.usuario !== senderLid) {
      return sock.sendMessage(from, {
        text: `❌ *CÓDIGO NO CORRESPONDE*\n\nEste código fue generado para otro usuario.\n\nSolicita tu propio código con:\n.vincular generar`
      });
    }
    
    // ¡Código válido!
    // Marcar como usado
    codigosDB[codigoIngresado].usado = true;
    codigosDB[codigoIngresado].verificadoEn = ahora;
    fs.writeFileSync(CODIGOS_PATH, JSON.stringify(codigosDB, null, 2));
    
    // Calcular tiempo restante antes de expirar
    const segundosRestantes = Math.floor((datosCodigo.expira - ahora) / 1000);
    const minutos = Math.floor(segundosRestantes / 60);
    const segundos = segundosRestantes % 60;
    
    const mensajeVerificado = 
      `✅ *VINCULACIÓN EXITOSA*\n\n` +
      `✨ ¡Felicidades! Has vinculado tu cuenta correctamente.\n\n` +
      `📋 *DETALLES:*\n` +
      `• 🔢 Código: ${codigoIngresado}\n` +
      `• 👤 Usuario: ${datosCodigo.nombreUsuario}\n` +
      `• ⏳ Tiempo restante: ${minutos}m ${segundos}s\n` +
      `• 📅 Generado: ${new Date(datosCodigo.creado).toLocaleTimeString()}\n\n` +
      `🎉 *VINCULACIÓN COMPLETADA*\n\n` +
      `Tu cuenta de WhatsApp ahora está vinculada con éxito.\n\n` +
      `🔄 Para vincular otra cuenta, usa:\n.vincular generar`;
    
    await sock.sendMessage(from, { text: mensajeVerificado });
    
    // Si fue solicitado desde un grupo, también notificar en MD
    if (esGrupo && datosCodigo.grupo) {
      await sock.sendMessage(sender, {
        text: `✅ *VINCULACIÓN CONFIRMADA*\n\nHas verificado exitosamente tu código ${codigoIngresado}.\n\nTu cuenta está ahora vinculada.`
      });
    }
    
    return;
  }
  
  // ==============================
  // INFO: VER MI CÓDIGO
  // ==============================
  if (accion === 'info' || accion === 'mi' || accion === 'estado') {
    let codigosDB = JSON.parse(fs.readFileSync(CODIGOS_PATH, 'utf8'));
    const ahora = Date.now();
    
    // Buscar códigos activos del usuario
    const codigosUsuario = Object.entries(codigosDB)
      .filter(([codigo, datos]) => 
        datos.usuario === senderLid && 
        ahora < datos.expira && 
        !datos.usado
      )
      .map(([codigo, datos]) => ({ codigo, ...datos }));
    
    if (codigosUsuario.length === 0) {
      return sock.sendMessage(from, {
        text: `📭 *SIN CÓDIGOS ACTIVOS*\n\nNo tienes códigos de vinculación activos.\n\nPara generar uno:\n.vincular generar`
      });
    }
    
    let mensajeInfo = `📋 *TUS CÓDIGOS ACTIVOS*\n\n`;
    
    for (const codigoData of codigosUsuario) {
      const tiempoRestante = Math.floor((codigoData.expira - ahora) / 1000);
      const minutos = Math.floor(tiempoRestante / 60);
      const segundos = tiempoRestante % 60;
      const codigoFormateado = codigoData.codigo.match(/.{1,2}/g).join(' ');
      
      mensajeInfo += `🔢 Código: \`${codigoFormateado}\`\n`;
      mensajeInfo += `⏳ Expira en: ${minutos}m ${segundos}s\n`;
      mensajeInfo += `📅 Generado: ${new Date(codigoData.creado).toLocaleTimeString()}\n`;
      mensajeInfo += `🔄 Verificar: .vincular verificar ${codigoData.codigo}\n\n`;
    }
    
    await sock.sendMessage(from, { text: mensajeInfo });
    return;
  }
  
  // ==============================
  // AYUDA
  // ==============================
  if (accion === 'ayuda' || accion === 'help') {
    const mensajeAyuda = 
      `📘 *AYUDA - SISTEMA DE VINCULACIÓN*\n\n` +
      `🔧 *COMANDOS DISPONIBLES:*\n\n` +
      `• .vincular generar\n  Genera un código de 8 dígitos\n\n` +
      `• .vincular verificar <código>\n  Verifica y usa un código\n  Ej: .vincular verificar 12345678\n\n` +
      `• .vincular info\n  Muestra tus códigos activos\n\n` +
      `• .vincular ayuda\n  Muestra esta ayuda\n\n` +
      `📋 *REGLAS DEL SISTEMA:*\n` +
      `• ⏳ Los códigos expiran en 5 minutos\n` +
      `• 🔒 Máximo 5 códigos cada 24 horas\n` +
      `• 📱 Solo válidos para quien los solicita\n` +
      `• 🚫 NO compartas códigos\n\n` +
      `💡 *CONSEJO:*\nSolicita el código justo cuando vayas a vincular.`;
    
    return sock.sendMessage(from, { text: mensajeAyuda });
  }
  
  // ==============================
  // COMANDO DESCONOCIDO
  // ==============================
  return sock.sendMessage(from, {
    text: `❌ *COMANDO NO RECONOCIDO*\n\nComandos disponibles:\n• .vincular generar\n• .vincular verificar <código>\n• .vincular info\n• .vincular ayuda\n\nUsa .vincular sin argumentos para ver instrucciones.`
  });
}

// ============================================
// TAREA PERIÓDICA: LIMPIAR CÓDIGOS EXPIRADOS
// ============================================
setInterval(() => {
  try {
    const eliminados = limpiarCodigosExpirados();
    if (eliminados > 0) {
      console.log(`🧹 Códigos de vinculación expirados eliminados: ${eliminados}`);
    }
  } catch (e) {
    console.error('Error limpiando códigos:', e.message);
  }
}, 5 * 60 * 1000); // Cada 5 minutos

