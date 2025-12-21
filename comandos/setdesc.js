import { ownerNumber } from '../config.js';

export const command = 'setdesc'; // Comando: .setdesc o .cambiar descripción

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers) {
  const from = msg.key.remoteJid;

  // 1. Verificar si es un grupo
  if (!from.endsWith('@g.us')) {
    await sock.sendMessage(from, { text: '❌ Este comando solo puede usarse en grupos.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];

  try {
    // Obtener metadata del grupo
    const metadata = await sock.groupMetadata(from);
    
    // 2. Verificar si el usuario es admin o owner
    const isAdmin = metadata.participants.some(
      p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    const isOwner = ownerNumber.includes(`+${senderNumber}`);

    if (!isAdmin && !isOwner) {
      await sock.sendMessage(from, { text: '❌ Solo los admins o el owner pueden usar este comando.' });
      return;
    }

    // 3. Verificar si el BOT es admin
    const BOT_LID = '52377763717242@lid'; // El LID específico de tu bot
    const botIsAdmin = metadata.participants.some(
      p => p.id === BOT_LID && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ Necesito ser administrador del grupo para cambiar la descripción.' });
      return;
    }
    
    // 4. Obtener la nueva descripción
    const newDescription = args.join(' ');

    if (!newDescription) {
      await sock.sendMessage(from, { 
        text: '❌ *Uso del comando:*\n\n' +
              '.setdesc <nueva descripción>\n' +
              '_Ejemplo: .setdesc ¡Este es el grupo oficial de la comunidad!_' 
      });
      return;
    }
    
    // 5. Verificar límite de caracteres (opcional, el límite de WhatsApp es ~3000)
    if (newDescription.length > 3000) {
        await sock.sendMessage(from, { text: '❌ La descripción es demasiado larga. El límite es de 3000 caracteres.' });
        return;
    }
    
    // 6. Actualizar la descripción del grupo
    await sock.groupUpdateDescription(from, newDescription);
    
    await sock.sendMessage(from, { 
      text: `✅ **Descripción actualizada exitosamente.**\n\n*Nueva Descripción:*\n${newDescription}`
    });

    console.log(`✅ Descripción del grupo ${from} actualizada por ${senderNumber}.`);

  } catch (e) {
    console.error('❌ Error al cambiar la descripción:', e);
    
    let errorMsg = '⚠️ Ocurrió un error al intentar cambiar la descripción.\n\n';
    
    if (e.data === 403) {
      errorMsg += '❌ Error de permisos: Asegúrate de que el bot tenga el permiso para cambiar la descripción del grupo.';
    } else {
      errorMsg += `*Error:* ${e.message || 'Desconocido'}`;
    }
    
    await sock.sendMessage(from, { text: errorMsg });
  }
}

