import fs from 'fs';

// ==========================
// CONSTANTES VIP
// ==========================
const VIP_COST = 62000;
const VIP_DURATION_MS = 24 * 60 * 60 * 1000;
const RENEWAL_TO_DIAMOND = 5;

// ==========================
// RUTAS DE ARCHIVOS
// ==========================
const vipPath = './vip.json';
const ownersPath = './owners.json';

// ==========================
// FUNCIONES AUXILIARES
// ==========================
function cargarVIP() {
  return fs.existsSync(vipPath) ? JSON.parse(fs.readFileSync(vipPath, 'utf-8')) : {};
}

function guardarVIP(data) {
  fs.writeFileSync(vipPath, JSON.stringify(data, null, 2));
}

// ✅ FUNCIÓN CORREGIDA: Normalizar a LID
function normalizeToLid(jid) {
  if (!jid) return null;
  
  if (jid.includes('@lid')) {
    return jid;
  }
  
  if (jid.includes('@s.whatsapp.net')) {
    const numero = jid.split('@')[0];
    return `${numero}@lid`;
  }
  
  if (/^\d+$/.test(jid)) {
    return `${jid}@lid`;
  }
  
  const numero = jid.split('@')[0];
  return `${numero}@lid`;
}

// ✅ FUNCIÓN PARA OBTENER OWNERS (compatible con LID)
function getOwners() {
  try {
    if (!fs.existsSync(ownersPath)) return [];
    const data = JSON.parse(fs.readFileSync(ownersPath, 'utf-8'));
    if (!Array.isArray(data)) return [];
    
    return data.map(o => {
      if (o.includes('@s.whatsapp.net')) {
        return o.replace('@s.whatsapp.net', '@lid');
      }
      return o;
    });
  } catch(e) {
    console.error('Error al leer propietarios:', e);
    return [];
  }
}

function isOwner(jid) {
  const owners = getOwners();
  const userLid = normalizeToLid(jid);
  return userLid && owners.includes(userLid);
}

// ✅ FUNCIÓN CORREGIDA PARA PARSAR TIEMPO
function parseTiempo(tiempo) {
  if (!tiempo) return null;
  
  const match = tiempo.match(/^(\d+)([dhms])$/i);
  if (!match) return null;
  
  const cantidad = parseInt(match[1]);
  const unidad = match[2].toLowerCase();
  
  const multiplicadores = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return cantidad * (multiplicadores[unidad] || 0);
}

// ✅ FUNCIÓN CORREGIDA PARA FORMATEAR TIEMPO
function formatearTiempo(ms) {
  if (ms <= 0) return '0s';
  
  const totalSegundos = Math.floor(ms / 1000);
  const dias = Math.floor(totalSegundos / (3600 * 24));
  const horas = Math.floor((totalSegundos % (3600 * 24)) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  
  const partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}m`);
  
  return partes.join(' ') || '0m';
}

// ✅ OBTENER NÚMERO DE TELEFONO DE LID
function getNumeroFromLid(lid) {
  if (!lid) return null;
  const match = lid.match(/^(\d+)@lid$/);
  return match ? match[1] : null;
}

// ✅ FUNCIÓN CRÍTICA: SUMAR TIEMPO VIP (IGUAL QUE CALENDARIO)
function sumarTiempoVIP(userLid, tiempoMs) {
  const vipDB = cargarVIP();
  const now = Date.now();
  
  console.log(`🔍 [sumarTiempoVIP] Usuario: ${userLid}`);
  console.log(`🔍 [sumarTiempoVIP] Tiempo a sumar: ${tiempoMs}ms (${formatearTiempo(tiempoMs)})`);
  
  // Obtener datos actuales
  const datosActuales = vipDB[userLid] || { 
    vipUntil: 0, 
    level: 1, 
    purchases: 0,
    grantedBy: []
  };
  
  console.log(`🔍 [sumarTiempoVIP] Tiempo actual: ${datosActuales.vipUntil}`);
  console.log(`🔍 [sumarTiempoVIP] Ahora: ${now}`);
  
  // Calcular nueva expiración
  let nuevaExpira;
  
  if (datosActuales.vipUntil && datosActuales.vipUntil > now) {
    // ✅✅✅ SUMAR al tiempo existente
    nuevaExpira = datosActuales.vipUntil + tiempoMs;
    console.log(`➕ [sumarTiempoVIP] Sumando a tiempo existente`);
    console.log(`   Actual: ${new Date(datosActuales.vipUntil).toLocaleString()}`);
    console.log(`   + ${formatearTiempo(tiempoMs)}`);
    console.log(`   = ${new Date(nuevaExpira).toLocaleString()}`);
  } else {
    // Empezar desde ahora
    nuevaExpira = now + tiempoMs;
    console.log(`🆕 [sumarTiempoVIP] Nuevo VIP desde ahora`);
    console.log(`   = ${new Date(nuevaExpira).toLocaleString()}`);
  }
  
  // Actualizar historial de granters
  const grantedBy = Array.isArray(datosActuales.grantedBy) ? datosActuales.grantedBy : [];
  
  // Guardar datos VIP actualizados
  vipDB[userLid] = {
    vipUntil: nuevaExpira,
    level: datosActuales.level || 1,
    purchases: datosActuales.purchases || 0,
    grantedBy: grantedBy,
    lastUpdated: now,
    grantedAt: datosActuales.grantedAt || now
  };
  
  guardarVIP(vipDB);
  
  return {
    success: true,
    nuevaExpira: nuevaExpira,
    tiempoAnterior: datosActuales.vipUntil,
    tiempoTotal: formatearTiempo(nuevaExpira - now),
    tiempoAgregado: formatearTiempo(tiempoMs)
  };
}

// ✅ COMANDO DARVIP CORREGIDO
export const command = 'darvip';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const remitenteLid = normalizeToLid(remitente);
  
  console.log(`🔍 [darvip] Comando ejecutado por: ${remitenteLid}`);
  console.log(`🔍 [darvip] Args recibidos: ${JSON.stringify(args)}`);

  // Verificar si es owner
  if (!isOwner(remitenteLid)) {
    console.log(`❌ [darvip] Usuario no es owner: ${remitenteLid}`);
    return sock.sendMessage(from, { text: '❌ Solo los propietarios pueden usar este comando.' });
  }

  // Obtener usuario mencionado
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) {
    return sock.sendMessage(from, { 
      text: '❌ Debes mencionar a un usuario.\n\n📝 Uso: `.darvip @usuario tiempo nivel`\n\n📌 Ejemplo: `.darvip @usuario 30d 1`' 
    });
  }

  console.log(`🔍 [darvip] Usuario mencionado: ${mentioned}`);

  // Obtener tiempo y nivel
  const tiempo = args[1];
  const nivel = args[2] ? parseInt(args[2]) : 1;

  if (!tiempo) {
    return sock.sendMessage(from, { 
      text: '❌ Debes especificar un tiempo.\n\n⏰ Ejemplo: `.darvip @usuario 30d 1`' 
    });
  }

  // Parsear tiempo
  const duracion = parseTiempo(tiempo);
  if (!duracion || duracion <= 0) {
    return sock.sendMessage(from, { 
      text: '❌ Tiempo inválido.\n\n✅ Formatos válidos: 30d, 7d, 24h, 60m, 30s' 
    });
  }

  // Validar nivel
  if (nivel !== 1 && nivel !== 2) {
    return sock.sendMessage(from, { 
      text: '❌ Nivel inválido.\n\n✨ Solo niveles 1 (Oro) o 2 (Diamante).' 
    });
  }

  // Normalizar usuario mencionado a LID
  const userLid = normalizeToLid(mentioned);
  if (!userLid) {
    console.log(`❌ [darvip] No se pudo normalizar: ${mentioned}`);
    return sock.sendMessage(from, { 
      text: '❌ No se pudo identificar al usuario.' 
    });
  }

  console.log(`✅ [darvip] Usuario LID: ${userLid}`);
  console.log(`📅 [darvip] Duración a añadir: ${formatearTiempo(duracion)}`);
  console.log(`✨ [darvip] Nivel: ${nivel}`);

  // Sumar tiempo VIP usando la MISMA función que calendario.js
  const resultado = sumarTiempoVIP(userLid, duracion);
  
  if (!resultado.success) {
    return sock.sendMessage(from, { 
      text: '❌ Error al agregar tiempo VIP.' 
    });
  }

  // Actualizar nivel si es diferente
  const vipDB = cargarVIP();
  if (vipDB[userLid]) {
    vipDB[userLid].level = nivel;
    guardarVIP(vipDB);
  }

  console.log(`✅ [darvip] VIP actualizado para ${userLid}`);
  console.log(`📅 [darvip] Nueva expiración: ${new Date(resultado.nuevaExpira).toLocaleString()}`);

  // Formatear mensaje
  const tiempoAgregado = formatearTiempo(duracion);
  const tiempoTotal = resultado.tiempoTotal;
  const expiracionFormateada = new Date(resultado.nuevaExpira).toLocaleString();
  const nivelTexto = nivel === 2 ? 'DIAMANTE 💎' : 'ORO 🌿';
  
  const mensajeRespuesta = 
    `✅ *VIP CONCEDIDO*\n\n` +
    `👤 Usuario: @${getNumeroFromLid(userLid) || userLid}\n` +
    `⏰ Tiempo añadido: ${tiempoAgregado}\n` +
    `⏱️ Tiempo total VIP: ${tiempoTotal}\n` +
    `✨ Nivel: ${nivelTexto}\n` +
    `📅 Expiración: ${expiracionFormateada}\n\n` +
    `✅ El tiempo se ha sumado correctamente al VIP existente.`;

  // Enviar respuesta
  await sock.sendMessage(from, {
    text: mensajeRespuesta,
    mentions: [mentioned]
  });

  // Notificar al usuario
  try {
    const userNumero = getNumeroFromLid(userLid);
    if (userNumero) {
      const userJid = `${userNumero}@s.whatsapp.net`;
      const mensajeUsuario = 
        `🎉 *¡RECIBISTE VIP!*\n\n` +
        `Te han concedido VIP ${nivel === 2 ? '💎' : '🌿'} Nivel ${nivel}\n\n` +
        `⏰ Tiempo añadido: ${tiempoAgregado}\n` +
        `⏱️ Tiempo total: ${tiempoTotal}\n` +
        `📅 Expira: ${expiracionFormateada}\n\n` +
        `Usa \`.estatusvip\` para ver tu tiempo restante.`;
      
      await sock.sendMessage(userJid, { text: mensajeUsuario });
      console.log(`✅ [darvip] Notificación enviada a ${userLid}`);
    }
  } catch (error) {
    console.log(`⚠️ [darvip] No se pudo notificar al usuario:`, error.message);
  }
}

// ✅ COMANDO PARA VER INFO DE VIP
export const command2 = 'infovip';

export async function run2(sock, msg, args) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const remitenteLid = normalizeToLid(remitente);
  
  if (!isOwner(remitenteLid)) return;

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const vipDB = cargarVIP();
  
  let userLid;
  if (mentioned) {
    userLid = normalizeToLid(mentioned);
  } else {
    userLid = remitenteLid;
  }
  
  if (!userLid) return sock.sendMessage(from, { text: '❌ Usuario no encontrado.' });
  
  const userData = vipDB[userLid];
  if (!userData) {
    return sock.sendMessage(from, { 
      text: `❌ ${getNumeroFromLid(userLid) || userLid} no tiene VIP.` 
    });
  }
  
  const now = Date.now();
  const isActive = userData.vipUntil && now < userData.vipUntil;
  const expiracion = userData.vipUntil ? new Date(userData.vipUntil).toLocaleString() : 'Nunca';
  const tiempoRestante = userData.vipUntil ? formatearTiempo(userData.vipUntil - now) : 'N/A';
  
  let mensaje = `📋 *INFORMACIÓN VIP*\n\n`;
  mensaje += `👤 Usuario: ${getNumeroFromLid(userLid) || userLid}\n`;
  mensaje += `✨ Nivel: ${userData.level || 1}\n`;
  mensaje += `📊 Estado: ${isActive ? '✅ ACTIVO' : '❌ INACTIVO'}\n`;
  mensaje += `⏰ Expira: ${expiracion}\n`;
  mensaje += `⏱️ Tiempo restante: ${tiempoRestante}\n`;
  mensaje += `🛒 Compras: ${userData.purchases || 0}\n`;
  
  if (userData.grantedBy && userData.grantedBy.length > 0) {
    mensaje += `👑 Otorgado por: ${userData.grantedBy.slice(0, 3).join(', ')}`;
    if (userData.grantedBy.length > 3) mensaje += ` y ${userData.grantedBy.length - 3} más`;
    mensaje += `\n`;
  }
  
  mensaje += `📅 Última actualización: ${new Date(userData.lastUpdated || now).toLocaleString()}`;
  
  await sock.sendMessage(from, { text: mensaje });
}
