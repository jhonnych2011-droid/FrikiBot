import fs from 'fs';

const MATRIMONIOS_FILE = './matrimonios.json';
const PROPUESTAS_FILE = './propuestas.json';

export const command = 'matrimonio';

function normalizeToLid(jid) {
  if (!jid) return null;
  if (jid.includes('@lid')) return jid;
  if (jid.includes('@s.whatsapp.net')) {
    const numero = jid.split('@')[0];
    return `${numero}@lid`;
  }
  if (/^\d+$/.test(jid)) return `${jid}@lid`;
  const numero = jid.split('@')[0];
  return `${numero}@lid`;
}

function lidToNumberJid(lid) {
  if (!lid) return null;
  const numero = lid.split('@')[0];
  return `${numero}@s.whatsapp.net`;
}

function cargarMatrimonios() {
  if (!fs.existsSync(MATRIMONIOS_FILE)) {
    fs.writeFileSync(MATRIMONIOS_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(MATRIMONIOS_FILE, 'utf-8'));
}

function guardarMatrimonios(data) {
  fs.writeFileSync(MATRIMONIOS_FILE, JSON.stringify(data, null, 2));
}

function cargarPropuestas() {
  if (!fs.existsSync(PROPUESTAS_FILE)) {
    fs.writeFileSync(PROPUESTAS_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(PROPUESTAS_FILE, 'utf-8'));
}

function guardarPropuestas(data) {
  fs.writeFileSync(PROPUESTAS_FILE, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderLid = normalizeToLid(sender);
  const isGroup = from.endsWith('@g.us');
  
  let targetLid = null;
  let mentionedJid = null;
  
  // Obtener el usuario objetivo de diferentes maneras
  if (isGroup) {
    // En grupo: por mención
    mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mentionedJid) {
      targetLid = normalizeToLid(mentionedJid);
    }
  } else {
    // En chat privado: por número como argumento
    if (args.length === 0) {
      return await sock.sendMessage(from, {
        text: '❌ Debes especificar un número de teléfono.\n\n' +
              '📝 Uso en privado: .matrimonio 521234567890\n\n' +
              '📌 Nota: Solo funciona con usuarios que tengan cuenta en WhatsApp.'
      }, { quoted: msg });
    }
    
    let numero = args[0].trim();
    
    // Limpiar el número
    if (numero.startsWith('+')) numero = numero.substring(1);
    if (numero.startsWith('521')) {
      // Mantener código de México
    } else if (numero.startsWith('52') && numero.length === 12) {
      numero = '52' + numero.substring(2);
    } else if (numero.length === 10) {
      numero = '521' + numero;
    }
    
    // Validar número
    if (!/^\d+$/.test(numero) || numero.length < 11) {
      return await sock.sendMessage(from, {
        text: '❌ Número inválido.\n\n' +
              '📝 Ejemplos válidos:\n' +
              '• 521234567890\n' +
              '• +521234567890\n' +
              '• 1234567890 (si eres de México)\n\n' +
              '📌 Debe ser un número de WhatsApp válido.'
      }, { quoted: msg });
    }
    
    mentionedJid = `${numero}@s.whatsapp.net`;
    targetLid = normalizeToLid(mentionedJid);
  }
  
  if (!targetLid) {
    return await sock.sendMessage(from, {
      text: '❌ Debes mencionar a alguien para proponerle matrimonio.\n\n' +
            '📝 Uso en grupo: .matrimonio @usuario\n' +
            '📝 Uso en privado: .matrimonio 521234567890'
    }, { quoted: msg });
  }
  
  if (senderLid === targetLid) {
    return await sock.sendMessage(from, {
      text: '❌ No puedes casarte contigo mismo.'
    }, { quoted: msg });
  }
  
  const matrimonios = cargarMatrimonios();
  const propuestas = cargarPropuestas();
  
  // Verificar si ya está casado
  if (matrimonios[senderLid]) {
    const parejaActual = matrimonios[senderLid].pareja;
    const parejaJid = lidToNumberJid(parejaActual);
    
    if (isGroup && parejaJid) {
      return await sock.sendMessage(from, {
        text: `❌ Ya estás casado/a con @${parejaActual.split('@')[0]}`,
        mentions: [parejaJid]
      }, { quoted: msg });
    } else {
      return await sock.sendMessage(from, {
        text: `❌ Ya estás casado/a con ${parejaActual.split('@')[0]}`
      }, { quoted: msg });
    }
  }
  
  // Verificar si el objetivo ya está casado
  if (matrimonios[targetLid]) {
    if (isGroup && mentionedJid) {
      return await sock.sendMessage(from, {
        text: `❌ @${targetLid.split('@')[0]} ya está casado/a.`,
        mentions: [mentionedJid]
      }, { quoted: msg });
    } else {
      return await sock.sendMessage(from, {
        text: `❌ ${targetLid.split('@')[0]} ya está casado/a.`
      }, { quoted: msg });
    }
  }
  
  // Limpiar propuestas expiradas
  const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas
  const now = Date.now();
  let propuestasLimpiadas = false;
  
  for (const key in propuestas) {
    if (now - propuestas[key].timestamp > EXPIRATION_TIME) {
      delete propuestas[key];
      propuestasLimpiadas = true;
    }
  }
  
  if (propuestasLimpiadas) {
    guardarPropuestas(propuestas);
  }
  
  // Verificar si ya tiene una propuesta pendiente
  if (propuestas[senderLid]) {
    const tiempoTranscurrido = now - propuestas[senderLid].timestamp;
    const horasTranscurridas = Math.floor(tiempoTranscurrido / (1000 * 60 * 60));
    
    return await sock.sendMessage(from, {
      text: `❌ Ya tienes una propuesta pendiente desde hace ${horasTranscurridas}h.\n\n` +
            `Usa .cancelarpropuesta para cancelarla y poder hacer una nueva.`
    }, { quoted: msg });
  }
  
  // Crear la propuesta
  propuestas[senderLid] = {
    proposer: senderLid,
    target: targetLid,
    timestamp: Date.now(),
    chatType: isGroup ? 'group' : 'private',
    groupId: isGroup ? from : null,
    proposerJid: sender,
    targetJid: mentionedJid || lidToNumberJid(targetLid)
  };
  
  guardarPropuestas(propuestas);
  
  // Responder en el chat donde se hizo la propuesta
  if (isGroup) {
    await sock.sendMessage(from, {
      text: `💍 *PROPUESTA DE MATRIMONIO* 💍\n\n` +
            `@${senderLid.split('@')[0]} le ha propuesto matrimonio a @${targetLid.split('@')[0]}!\n\n` +
            `💖 @${targetLid.split('@')[0]}, escribe .casar para aceptar la propuesta.\n` +
            `🕐 La propuesta expira en 24 horas.`,
      mentions: [
        senderLid.replace('@lid', '@s.whatsapp.net'),
        mentionedJid
      ]
    }, { quoted: msg });
  } else {
    await sock.sendMessage(from, {
      text: `💍 *PROPUESTA DE MATRIMONIO ENVIADA* 💍\n\n` +
            `Le has propuesto matrimonio a ${targetLid.split('@')[0]}.\n\n` +
            `📩 Se ha enviado una notificación a esa persona.\n` +
            `💖 Si acepta, debe escribir .casar para confirmar.\n` +
            `🕐 La propuesta expira en 24 horas.\n\n` +
            `⚠️ Nota: Solo funcionará si la persona tiene cuenta en WhatsApp.`
    }, { quoted: msg });
    
    // Intentar notificar al objetivo (si es posible)
    try {
      const targetJid = mentionedJid || lidToNumberJid(targetLid);
      await sock.sendMessage(targetJid, {
        text: `💍 *¡TIENES UNA PROPUESTA DE MATRIMONIO!* 💍\n\n` +
              `${senderLid.split('@')[0]} te ha propuesto matrimonio.\n\n` +
              `💖 Para aceptar, escribe .casar\n` +
              `❌ Para rechazar, ignora este mensaje\n` +
              `🕐 Tienes 24 horas para responder.`
      });
    } catch (error) {
      console.log('No se pudo notificar al usuario objetivo:', error.message);
    }
  }
}
