import { ownerNumber } from '../config.js';

export const command = 'grupo';

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

    // Verificar si el BOT es admin
    const botIsAdmin = metadata.participants.some(
      p => p.id === BOT_LID && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!botIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ Necesito ser administrador del grupo para cambiar su configuración.' });
      return;
    }

    // Verificar acción
    const accion = args[0]?.toLowerCase();

    if (!accion) {
      await sock.sendMessage(from, { 
        text: '❌ *Uso del comando:*\n\n' +
              '🔒 .grupo cerrar - Solo admins pueden enviar mensajes\n' +
              '🔓 .grupo abrir - Todos pueden enviar mensajes\n\n' +
              '💡 *Ejemplos:*\n' +
              '• .grupo cerrar\n' +
              '• .grupo abrir'
      });
      return;
    }

    // Cerrar grupo (solo admins pueden enviar mensajes)
    if (accion === 'cerrar' || accion === 'close' || accion === 'lock') {
      console.log(`🔒 Cerrando grupo: ${from}`);
      
      await sock.groupSettingUpdate(from, 'announcement');
      
      await sock.sendMessage(from, { 
        text: '🔒 *GRUPO CERRADO*\n\n' +
              '✅ Solo los administradores pueden enviar mensajes ahora.\n\n' +
              '💡 Para abrir el grupo usa: .grupo abrir'
      });
      
      console.log('✅ Grupo cerrado exitosamente');
      return;
    }

    // Abrir grupo (todos pueden enviar mensajes)
    if (accion === 'abrir' || accion === 'open' || accion === 'unlock') {
      console.log(`🔓 Abriendo grupo: ${from}`);
      
      await sock.groupSettingUpdate(from, 'not_announcement');
      
      await sock.sendMessage(from, { 
        text: '🔓 *GRUPO ABIERTO*\n\n' +
              '✅ Todos los miembros pueden enviar mensajes ahora.\n\n' +
              '💡 Para cerrar el grupo usa: .grupo cerrar'
      });
      
      console.log('✅ Grupo abierto exitosamente');
      return;
    }

    // Comando no reconocido
    await sock.sendMessage(from, { 
      text: '❌ *Acción no reconocida.*\n\n' +
            '🔒 .grupo cerrar - Cerrar grupo\n' +
            '🔓 .grupo abrir - Abrir grupo'
    });

  } catch (e) {
    console.error('❌ Error en comando grupo:', e);
    
    let errorMsg = '⚠️ No pude cambiar la configuración del grupo.\n\n';
    
    if (e.data === 500 || e.output?.statusCode === 500) {
      errorMsg += '🔧 *Posibles soluciones:*\n';
      errorMsg += '1. Espera unos segundos e intenta de nuevo\n';
      errorMsg += '2. Reinicia el bot\n';
      errorMsg += '3. Verifica que el bot sea admin real';
    } else if (e.data === 403 || e.output?.statusCode === 403) {
      errorMsg += '❌ Sin permisos suficientes. El bot necesita ser admin.';
    } else {
      errorMsg += `*Error:* ${e.message || 'Desconocido'}`;
    }
    
    await sock.sendMessage(from, { text: errorMsg });
  }
}
