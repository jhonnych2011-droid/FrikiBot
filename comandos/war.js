import { ownerNumber } from '../config.js';
import fs from 'fs';

export const command = 'warn';

const warnsPath = './warns.json';
const BOT_LID = '52377763717242@lid';

// Inicializar archivo de warns si no existe
if (!fs.existsSync(warnsPath)) {
  fs.writeFileSync(warnsPath, JSON.stringify({}, null, 2));
}

// Cargar warns
function cargarWarns() {
  try {
    return JSON.parse(fs.readFileSync(warnsPath, 'utf-8'));
  } catch(e) {
    return {};
  }
}

// Guardar warns
function guardarWarns(data) {
  fs.writeFileSync(warnsPath, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo en grupos
  if (!from.endsWith('@g.us')) {
    await sock.sendMessage(from, { text: '❌ Este comando solo puede usarse en grupos.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];

  try {
    const metadata = await sock.groupMetadata(from);
    
    // Verificar si el usuario es admin
    const isAdmin = metadata.participants.some(
      p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    const isOwner = ownerNumber.includes(`+${senderNumber}`);

    if (!isAdmin && !isOwner) {
      await sock.sendMessage(from, { text: '❌ Solo los admins o el owner pueden usar este comando.' });
      return;
    }

    // ============================================
    // SUBCOMANDO: UNWARN (Quitar advertencia)
    // ============================================
    if (args[0]?.toLowerCase() === 'unwarn' || args[0]?.toLowerCase() === 'quitar') {
      // Identificar al usuario
      let targetJid;
      let targetParticipant;

      // Método 1: Mensaje citado
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      }
      // Método 2: Menciones
      else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }
      // Método 3: Número manual
      else if (args[1]) {
        let numero = args[1].replace(/[^0-9]/g, '');
        
        if (!numero.startsWith('593') && numero.length === 9) {
          numero = '593' + numero;
        }
        
        targetParticipant = metadata.participants.find(p => {
          const pNum = p.id.split('@')[0];
          return pNum === numero || pNum.endsWith(numero);
        });
        
        if (targetParticipant) {
          targetJid = targetParticipant.id;
        } else {
          const jidFormats = [`${numero}@s.whatsapp.net`, `${numero}@lid`];
          
          for (const format of jidFormats) {
            if (metadata.participants.some(p => p.id === format)) {
              targetJid = format;
              break;
            }
          }
        }
      }

      if (!targetJid) {
        await sock.sendMessage(from, { 
          text: '❌ *Uso:*\n\n' +
                '1️⃣ .warn unwarn (respondiendo mensaje)\n' +
                '2️⃣ .warn unwarn @usuario\n' +
                '3️⃣ .warn unwarn 985502540' 
        });
        return;
      }

      // Cargar warns
      const warns = cargarWarns();
      
      if (!warns[from] || !warns[from][targetJid] || warns[from][targetJid].count === 0) {
        await sock.sendMessage(from, { 
          text: `❌ Este usuario no tiene advertencias.`,
          mentions: [targetJid]
        });
        return;
      }

      // Quitar 1 warn
      warns[from][targetJid].count -= 1;
      
      if (warns[from][targetJid].count <= 0) {
        delete warns[from][targetJid];
      } else if (warns[from][targetJid].razones && warns[from][targetJid].razones.length > 0) {
        warns[from][targetJid].razones.pop();
      }

      guardarWarns(warns);

      const warnsRestantes = warns[from][targetJid]?.count || 0;

      await sock.sendMessage(from, { 
        text: `✅ *ADVERTENCIA ELIMINADA*\n\n` +
              `👤 Usuario: @${targetJid.split('@')[0]}\n` +
              `⚠️ Warns actuales: ${warnsRestantes}/3\n` +
              `👮 Admin: @${senderNumber}\n\n` +
              `${warnsRestantes === 0 ? '✨ Usuario sin advertencias' : `💡 Le quedan ${warnsRestantes} advertencia(s)`}`,
        mentions: [targetJid, sender]
      });

      return;
    }

    // ============================================
    // SUBCOMANDO: LISTA
    // ============================================
    if (args[0]?.toLowerCase() === 'lista' || args[0]?.toLowerCase() === 'list') {
      const warns = cargarWarns();
      const warnsGrupo = warns[from] || {};
      
      if (Object.keys(warnsGrupo).length === 0) {
        await sock.sendMessage(from, { text: '📋 *LISTA DE WARNS*\n\n✅ No hay usuarios con advertencias en este grupo.' });
        return;
      }

      // Construir lista de menciones
      const mentionsList = [];
      let mensaje = '📋 *LISTA DE WARNS DEL GRUPO*\n\n';
      let contador = 1;

      for (const [userJid, data] of Object.entries(warnsGrupo)) {
        const count = data.count || 0;
        const emoji = count >= 3 ? '🔴' : count >= 2 ? '🟡' : '🟢';
        
        // Agregar usuario a la lista de menciones
        mentionsList.push(userJid);
        
        mensaje += `${contador}. ${emoji} @${userJid.split('@')[0]}\n`;
        mensaje += `   └─ Warns: ${count}/3\n`;
        
        if (data.razones && data.razones.length > 0) {
          const ultimaRazon = data.razones[data.razones.length - 1];
          mensaje += `   └─ Última: ${ultimaRazon.razon}\n`;
        }
        
        mensaje += '\n';
        contador++;
      }

      mensaje += '━━━━━━━━━━━━━━━\n';
      mensaje += '🟢 = 1 warn\n';
      mensaje += '🟡 = 2 warns\n';
      mensaje += '🔴 = 3 warns (expulsado)\n\n';
      mensaje += '💡 Usa: .warn unwarn @usuario';

      // Enviar con menciones
      await sock.sendMessage(from, { 
        text: mensaje, 
        mentions: mentionsList 
      });
      
      return;
    }

    // ============================================
    // COMANDO PRINCIPAL: ADVERTIR
    // ============================================

    // Verificar que el bot sea admin
    const botIsAdmin = metadata.participants.some(
      p => p.id === BOT_LID && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ Necesito ser administrador del grupo para advertir/expulsar usuarios.' });
      return;
    }

    // Identificar al usuario a advertir
    let targetJid;
    let targetParticipant;

    // Método 1: Mensaje citado
    if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      targetJid = msg.message.extendedTextMessage.contextInfo.participant;
    }
    // Método 2: Menciones
    else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
      targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Método 3: Número manual
    else if (args[0]) {
      let numero = args[0].replace(/[^0-9]/g, '');
      
      if (!numero.startsWith('593') && numero.length === 9) {
        numero = '593' + numero;
      }
      
      targetParticipant = metadata.participants.find(p => {
        const pNum = p.id.split('@')[0];
        return pNum === numero || pNum.endsWith(numero);
      });
      
      if (targetParticipant) {
        targetJid = targetParticipant.id;
      } else {
        const jidFormats = [`${numero}@s.whatsapp.net`, `${numero}@lid`];
        
        for (const format of jidFormats) {
          if (metadata.participants.some(p => p.id === format)) {
            targetJid = format;
            break;
          }
        }
        
        if (!targetJid) {
          await sock.sendMessage(from, { 
            text: `❌ No encontré al usuario.\n\n💡 *Uso:*\n` +
                  `1️⃣ .warn (respondiendo mensaje)\n` +
                  `2️⃣ .warn @usuario [razón]\n` +
                  `3️⃣ .warn lista\n` +
                  `4️⃣ .warn unwarn @usuario` 
          });
          return;
        }
      }
    } else {
      await sock.sendMessage(from, { 
        text: '❌ *Uso del comando:*\n\n' +
              '⚠️ *ADVERTIR:*\n' +
              '1️⃣ .warn (respondiendo mensaje) [razón]\n' +
              '2️⃣ .warn @usuario [razón]\n' +
              '3️⃣ .warn 985502540 [razón]\n\n' +
              '📋 *VER LISTA:*\n' +
              '4️⃣ .warn lista\n\n' +
              '✅ *QUITAR WARN:*\n' +
              '5️⃣ .warn unwarn @usuario\n' +
              '6️⃣ .warn unwarn (respondiendo mensaje)' 
      });
      return;
    }

    // Verificar que el usuario existe
    if (!targetParticipant) {
      targetParticipant = metadata.participants.find(p => p.id === targetJid);
    }

    if (!targetParticipant) {
      await sock.sendMessage(from, { text: `❌ Ese usuario no está en el grupo.` });
      return;
    }

    // No advertir admins
    if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
      await sock.sendMessage(from, { text: '⚠️ No puedo advertir a un administrador.' });
      return;
    }

    // No advertirse a sí mismo
    if (targetJid === BOT_LID) {
      await sock.sendMessage(from, { text: '😅 No puedo advertirme a mí mismo.' });
      return;
    }

    // Obtener razón (si existe)
    const razonIndex = args[0] && !args[0].toLowerCase().includes('lista') && !args[0].toLowerCase().includes('unwarn') ? 1 : 0;
    const razon = args.slice(razonIndex).join(' ') || 'Sin razón especificada';

    // Cargar warns
    const warns = cargarWarns();
    
    if (!warns[from]) warns[from] = {};
    if (!warns[from][targetJid]) {
      warns[from][targetJid] = {
        count: 0,
        razones: []
      };
    }

    // Incrementar warns
    warns[from][targetJid].count += 1;
    warns[from][targetJid].razones.push({
      razon,
      fecha: new Date().toISOString(),
      admin: senderNumber
    });

    const warnCount = warns[from][targetJid].count;

    // Guardar warns
    guardarWarns(warns);

    // Si llega a 3 warns, expulsar
    if (warnCount >= 3) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
        
        // Limpiar warns del usuario
        delete warns[from][targetJid];
        guardarWarns(warns);
        
        await sock.sendMessage(from, { 
          text: `🚨 *USUARIO EXPULSADO*\n\n` +
                `👤 Usuario: @${targetJid.split('@')[0]}\n` +
                `⚠️ Warns acumulados: 3/3\n` +
                `📝 Última razón: ${razon}\n\n` +
                `El usuario ha sido expulsado del grupo por acumular 3 advertencias.`,
          mentions: [targetJid]
        });
        
        console.log(`✅ Usuario ${targetJid} expulsado por 3 warns`);
        
      } catch(e) {
        console.error('Error al expulsar:', e);
        await sock.sendMessage(from, { 
          text: `⚠️ El usuario tiene 3 warns pero no pude expulsarlo.\n\nError: ${e.message || 'Desconocido'}` 
        });
      }
      
      return;
    }

    // Advertencia normal (1 o 2 warns)
    const emoji = warnCount === 2 ? '🟡' : '🟢';
    
    await sock.sendMessage(from, { 
      text: `${emoji} *ADVERTENCIA ${warnCount}/3*\n\n` +
            `👤 Usuario: @${targetJid.split('@')[0]}\n` +
            `📝 Razón: ${razon}\n` +
            `👮 Admin: @${senderNumber}\n\n` +
            `⚠️ Advertencias: ${warnCount}/3\n` +
            `${warnCount === 2 ? '🚨 Próxima advertencia = EXPULSIÓN' : '💡 2 advertencias más = expulsión'}`,
      mentions: [targetJid, sender]
    });

  } catch (e) {
    console.error('❌ Error en warn:', e);
    await sock.sendMessage(from, { text: `❌ Error: ${e.message || 'Desconocido'}` });
  }
}
