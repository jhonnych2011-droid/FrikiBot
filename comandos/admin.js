import { ownerNumber } from '../config.js';

export const command = 'admin';

const BOT_LID = '52377763717242@lid';

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
    
    // Verificar si el usuario es admin o owner
    const isAdmin = metadata.participants.some(
      p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    const isOwner = ownerNumber.includes(`+${senderNumber}`);

    if (!isAdmin && !isOwner) {
      await sock.sendMessage(from, { text: '❌ Solo los admins o el owner pueden usar este comando.' });
      return;
    }

    // Verificar si el BOT es admin
    const botIsAdmin = metadata.participants.some(
      p => p.id === BOT_LID && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ Necesito ser administrador del grupo para promover/degradar usuarios.' });
      return;
    }

    // Verificar acción
    const accion = args[0]?.toLowerCase();

    if (!accion) {
      await sock.sendMessage(from, { 
        text: '❌ *Uso del comando:*\n\n' +
              '👑 *DAR ADMIN:*\n' +
              '1️⃣ .admin poner (respondiendo mensaje)\n' +
              '2️⃣ .admin poner @usuario\n' +
              '3️⃣ .admin poner 985502540\n\n' +
              '👤 *QUITAR ADMIN:*\n' +
              '4️⃣ .admin quitar (respondiendo mensaje)\n' +
              '5️⃣ .admin quitar @usuario\n' +
              '6️⃣ .admin quitar 985502540' 
      });
      return;
    }

    // ============================================
    // SUBCOMANDO: PONER ADMIN
    // ============================================
    if (accion === 'poner' || accion === 'dar' || accion === 'add' || accion === 'promote') {
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
                '1️⃣ .admin poner (respondiendo mensaje)\n' +
                '2️⃣ .admin poner @usuario\n' +
                '3️⃣ .admin poner 985502540' 
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

      // Verificar si ya es admin
      if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
        await sock.sendMessage(from, { 
          text: `⚠️ @${targetJid.split('@')[0]} ya es administrador.`,
          mentions: [targetJid]
        });
        return;
      }

      // No promover al bot
      if (targetJid === BOT_LID) {
        await sock.sendMessage(from, { text: '😅 Yo ya soy admin.' });
        return;
      }

      // Esperar antes de promover
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        console.log(`👑 Promoviendo a admin: ${targetJid}`);
        
        await sock.groupParticipantsUpdate(from, [targetJid], 'promote');
        
        await sock.sendMessage(from, { 
          text: `👑 *ADMIN OTORGADO*\n\n` +
                `✅ @${targetJid.split('@')[0]} ahora es administrador del grupo.\n\n` +
                `👮 Promovido por: @${senderNumber}`,
          mentions: [targetJid, sender]
        });
        
        console.log('✅ Promoción exitosa');
        
      } catch(e) {
        console.error('Error al promover:', e);
        
        let errorMsg = '⚠️ No pude dar admin al usuario.\n\n';
        
        if (e.data === 500 || e.output?.statusCode === 500) {
          errorMsg += '🔧 *Posibles soluciones:*\n';
          errorMsg += '1. Espera 2-3 minutos e intenta de nuevo\n';
          errorMsg += '2. Verifica que el bot sea admin real\n';
          errorMsg += '3. Usa el método de responder mensaje';
        } else if (e.data === 403) {
          errorMsg += '❌ Sin permisos suficientes';
        } else {
          errorMsg += `*Error:* ${e.message || 'Desconocido'}`;
        }
        
        await sock.sendMessage(from, { text: errorMsg });
      }

      return;
    }

    // ============================================
    // SUBCOMANDO: QUITAR ADMIN
    // ============================================
    if (accion === 'quitar' || accion === 'remover' || accion === 'remove' || accion === 'demote') {
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
                '1️⃣ .admin quitar (respondiendo mensaje)\n' +
                '2️⃣ .admin quitar @usuario\n' +
                '3️⃣ .admin quitar 985502540' 
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

      // Verificar si NO es admin
      if (!targetParticipant.admin || targetParticipant.admin === null) {
        await sock.sendMessage(from, { 
          text: `⚠️ @${targetJid.split('@')[0]} no es administrador.`,
          mentions: [targetJid]
        });
        return;
      }

      // No degradar al bot
      if (targetJid === BOT_LID) {
        await sock.sendMessage(from, { text: '😅 No puedo quitarme el admin a mí mismo.' });
        return;
      }

      // Esperar antes de degradar
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        console.log(`👤 Quitando admin: ${targetJid}`);
        
        await sock.groupParticipantsUpdate(from, [targetJid], 'demote');
        
        await sock.sendMessage(from, { 
          text: `👤 *ADMIN REMOVIDO*\n\n` +
                `✅ @${targetJid.split('@')[0]} ya no es administrador del grupo.\n\n` +
                `👮 Degradado por: @${senderNumber}`,
          mentions: [targetJid, sender]
        });
        
        console.log('✅ Degradación exitosa');
        
      } catch(e) {
        console.error('Error al degradar:', e);
        
        let errorMsg = '⚠️ No pude quitar admin al usuario.\n\n';
        
        if (e.data === 500 || e.output?.statusCode === 500) {
          errorMsg += '🔧 *Posibles soluciones:*\n';
          errorMsg += '1. Espera 2-3 minutos e intenta de nuevo\n';
          errorMsg += '2. Verifica que el bot sea admin real\n';
          errorMsg += '3. Usa el método de responder mensaje';
        } else if (e.data === 403) {
          errorMsg += '❌ Sin permisos suficientes';
        } else {
          errorMsg += `*Error:* ${e.message || 'Desconocido'}`;
        }
        
        await sock.sendMessage(from, { text: errorMsg });
      }

      return;
    }

    // Comando no reconocido
    await sock.sendMessage(from, { 
      text: '❌ *Acción no reconocida.*\n\n' +
            '👑 .admin poner @usuario - Dar admin\n' +
            '👤 .admin quitar @usuario - Quitar admin'
    });

  } catch (e) {
    console.error('❌ Error en comando admin:', e);
    await sock.sendMessage(from, { text: `❌ Error: ${e.message || 'Desconocido'}` });
  }
}
