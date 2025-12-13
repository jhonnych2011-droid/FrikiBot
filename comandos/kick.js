import { ownerNumber } from '../config.js';

export const command = 'kick';

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers) {
  const from = msg.key.remoteJid;

  if (!from.endsWith('@g.us')) {
    await sock.sendMessage(from, { text: '❌ Este comando solo puede usarse en grupos.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];

  try {
    // Obtener metadata del grupo
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

    // Verificar si el BOT es admin (usando el LID correcto)
    const BOT_LID = '52377763717242@lid'; // El LID específico de tu bot
    const botIsAdmin = metadata.participants.some(
      p => p.id === BOT_LID && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ Necesito ser administrador del grupo para expulsar usuarios.' });
      return;
    }

    // Identificar al usuario a expulsar
    let targetJid;
    let targetParticipant;

    // Método 1: Mensaje citado (RECOMENDADO)
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
      
      // Agregar código de país si falta
      if (!numero.startsWith('593') && numero.length === 9) {
        numero = '593' + numero;
      }
      
      // Intentar encontrar el participante con este número
      targetParticipant = metadata.participants.find(p => {
        const pNum = p.id.split('@')[0];
        return pNum === numero || pNum.endsWith(numero);
      });
      
      if (targetParticipant) {
        targetJid = targetParticipant.id;
      } else {
        // Intentar ambos formatos
        const jidFormats = [
          `${numero}@s.whatsapp.net`,
          `${numero}@lid`
        ];
        
        for (const format of jidFormats) {
          if (metadata.participants.some(p => p.id === format)) {
            targetJid = format;
            break;
          }
        }
        
        if (!targetJid) {
          await sock.sendMessage(from, { 
            text: `❌ No encontré al usuario con número ${numero} en el grupo.\n\n💡 *Métodos recomendados:*\n1️⃣ Responde al mensaje del usuario\n2️⃣ Menciona al usuario: .kick @usuario` 
          });
          return;
        }
      }
    } else {
      await sock.sendMessage(from, { 
        text: '❌ *Uso del comando:*\n\n' +
              '1️⃣ Responde al mensaje: (responder) .kick\n' +
              '2️⃣ Menciona: .kick @usuario\n' +
              '3️⃣ Por número: .kick 985502540' 
      });
      return;
    }

    // Verificar que el usuario existe en el grupo
    if (!targetParticipant) {
      targetParticipant = metadata.participants.find(p => p.id === targetJid);
    }

    if (!targetParticipant) {
      await sock.sendMessage(from, { 
        text: `❌ Ese usuario no está en el grupo.\n\n*JID:* ${targetJid}` 
      });
      return;
    }

    // No expulsar admins
    if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
      await sock.sendMessage(from, { text: '⚠️ No puedo expulsar a un administrador.' });
      return;
    }

    // No expulsarse a sí mismo
    if (targetJid === BOT_LID) {
      await sock.sendMessage(from, { text: '😅 No puedo expulsarme a mí mismo.' });
      return;
    }

    // Esperar antes de expulsar (evitar rate limit)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Intentar expulsar
    console.log(`🔄 Expulsando: ${targetJid} del grupo: ${from}`);
    
    await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
    
    await sock.sendMessage(from, { 
      text: `✅ Usuario expulsado exitosamente`, 
      mentions: [targetJid] 
    });
    
    console.log('✅ Expulsión exitosa');

  } catch (e) {
    console.error('❌ Error al expulsar:', e);
    
    let errorMsg = '⚠️ No pude expulsar al usuario.\n\n';
    
    if (e.data === 500 || e.output?.statusCode === 500) {
      errorMsg += '🔧 *Soluciones:*\n';
      errorMsg += '1. Espera 2-3 minutos e intenta de nuevo\n';
      errorMsg += '2. Reinicia el bot\n';
      errorMsg += '3. Verifica que el bot tenga admin real\n';
      errorMsg += '4. Usa el método de responder mensaje';
    } else if (e.data === 403) {
      errorMsg += '❌ Sin permisos suficientes';
    } else {
      errorMsg += `*Error:* ${e.message || 'Desconocido'}`;
    }
    
    await sock.sendMessage(from, { text: errorMsg });
  }
}
