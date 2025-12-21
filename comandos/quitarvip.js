import fs from 'fs';

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
  
  // Si ya es LID
  if (jid.includes('@lid')) {
    return jid;
  }
  
  // Si es número normal
  if (jid.includes('@s.whatsapp.net')) {
    const numero = jid.split('@')[0];
    return `${numero}@lid`;
  }
  
  // Si es solo número
  if (/^\d+$/.test(jid)) {
    return `${jid}@lid`;
  }
  
  // Si es mención en grupo (puede venir sin @...)
  const numero = jid.split('@')[0];
  return `${numero}@lid`;
}

// ✅ FUNCIÓN PARA OBTENER OWNERS (compatible con LID)
function getOwners() {
  try {
    if (!fs.existsSync(ownersPath)) return [];
    const data = JSON.parse(fs.readFileSync(ownersPath, 'utf-8'));
    if (!Array.isArray(data)) return [];
    
    // Convertir owners a LID
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

// ✅ OBTENER NÚMERO DE TELEFONO DE LID
function getNumeroFromLid(lid) {
  if (!lid) return null;
  const match = lid.match(/^(\d+)@lid$/);
  return match ? match[1] : null;
}

// ✅ COMANDO QUITARVIP
export const command = 'quitarvip';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const remitenteLid = normalizeToLid(remitente);
  
  console.log(`🔍 [quitarvip] Comando ejecutado por: ${remitenteLid}`);

  // Verificar si es owner
  if (!isOwner(remitenteLid)) {
    console.log(`❌ [quitarvip] Usuario no es owner: ${remitenteLid}`);
    return sock.sendMessage(from, { text: '❌ Solo los propietarios pueden usar este comando.' });
  }

  // Obtener usuario mencionado
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) {
    return sock.sendMessage(from, { 
      text: '❌ Debes mencionar a un usuario.\n\n📝 *Uso:* `.quitarvip @usuario`\n\n📌 *Ejemplo:*\n• `.quitarvip @usuario`' 
    });
  }
  
  // Normalizar usuario mencionado a LID
  const userLid = normalizeToLid(mentioned);
  if (!userLid) {
    console.log(`❌ [quitarvip] No se pudo normalizar: ${mentioned}`);
    return sock.sendMessage(from, { 
      text: '❌ No se pudo identificar al usuario.\n\n⚠️ Verifica la mención e intenta nuevamente.' 
    });
  }
  
  console.log(`🔍 [quitarvip] Usuario LID: ${userLid}`);

  // Cargar base de datos VIP
  const vipDB = cargarVIP();
  
  // Verificar si el usuario tiene VIP
  if (!vipDB[userLid]) {
    return sock.sendMessage(from, { 
      text: `❌ El usuario no tiene VIP activo.\n\n👤 Usuario: ${getNumeroFromLid(userLid) || userLid}`,
      mentions: [mentioned]
    });
  }
  
  // Guardar datos antes de eliminar
  const userData = vipDB[userLid];
  const nivelAnterior = userData.level || 1;
  const nivelTexto = nivelAnterior === 2 ? 'Diamante 💎' : 'Oro 🌿';
  const expiracion = userData.vipUntil ? new Date(userData.vipUntil).toLocaleString() : 'N/A';
  
  // Eliminar VIP
  delete vipDB[userLid];
  guardarVIP(vipDB);
  
  console.log(`🗑️ [quitarvip] VIP eliminado para: ${userLid}`);
  
  // Formatear mensaje de respuesta
  const mensajeRespuesta = 
    `🗑️ *VIP ELIMINADO*\n\n` +
    `👤 *Usuario:* @${getNumeroFromLid(userLid) || userLid}\n` +
    `✨ *Nivel anterior:* ${nivelTexto}\n` +
    `📅 *Expiración anterior:* ${expiracion}\n` +
    `👑 *Eliminado por:* Owner\n\n` +
    `❌ El usuario ha perdido todos los privilegios VIP.`;

  // Enviar respuesta con mención
  await sock.sendMessage(from, {
    text: mensajeRespuesta,
    mentions: [mentioned]
  });

  // Notificar al usuario afectado
  try {
    const userNumero = getNumeroFromLid(userLid);
    if (userNumero) {
      const userJid = `${userNumero}@s.whatsapp.net`;
      const mensajeUsuario = 
        `⚠️ *VIP REMOVIDO*\n\n` +
        `Tu membresía VIP ha sido removida por un administrador.\n\n` +
        `✨ *Nivel:* ${nivelTexto}\n` +
        `👑 *Removido por:* Administrador\n\n` +
        `ℹ️ *Información:*\n` +
        `• Has perdido acceso a comandos VIP\n` +
        `• Puedes volver a comprar VIP usando \`.vip\` cuando lo desees`;
      
      await sock.sendMessage(userJid, { text: mensajeUsuario });
      console.log(`✅ [quitarvip] Notificación enviada a ${userLid}`);
    }
  } catch(error) {
    console.log(`⚠️ [quitarvip] No se pudo notificar al usuario ${userLid}:`, error.message);
  }

  // Log detallado
  console.log(`📋 [quitarvip] Resumen de eliminación:`);
  console.log(`   👤 Usuario: ${userLid}`);
  console.log(`   👑 Eliminado por: ${remitenteLid}`);
  console.log(`   ✨ Nivel anterior: ${nivelTexto}`);
  console.log(`   📅 Expiración anterior: ${expiracion}`);
}
