// comandos/antiestados.js
import fs from 'fs';

const antiestadosPath = './antiestados.json';

// Inicializar archivo si no existe
if (!fs.existsSync(antiestadosPath)) {
  fs.writeFileSync(antiestadosPath, JSON.stringify({}, null, 2));
}

function cargarAntiestados() {
  try {
    return JSON.parse(fs.readFileSync(antiestadosPath, 'utf-8'));
  } catch(e) {
    return {};
  }
}

function guardarAntiestados(data) {
  fs.writeFileSync(antiestadosPath, JSON.stringify(data, null, 2));
}

// Función para detectar si es un estado/view once
function esEstado(msg) {
  // Verificar si es viewOnce (estados de WhatsApp)
  if (msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessageV2Extension) {
    return true;
  }
  
  // Verificar mensajes efímeros de tipo estado
  if (msg.message?.ephemeralMessage?.message?.viewOnceMessage) {
    return true;
  }
  
  // Verificar propiedad viewOnce en diferentes tipos de mensaje
  const imageMsg = msg.message?.imageMessage;
  const videoMsg = msg.message?.videoMessage;
  const extendedMsg = msg.message?.extendedTextMessage;
  const documentMsg = msg.message?.documentMessage;
  
  if (imageMsg?.viewOnce === true) {
    return true;
  }
  
  if (videoMsg?.viewOnce === true) {
    return true;
  }
  
  if (extendedMsg?.viewOnce === true) {
    return true;
  }
  
  if (documentMsg?.viewOnce === true) {
    return true;
  }
  
  // Verificar si el mensaje menciona un estado de grupo
  if (extendedMsg?.contextInfo?.isForwarded && 
      extendedMsg?.text?.toLowerCase().includes('mencionaste este grupo')) {
    return true;
  }
  
  // Verificar si es reenvío de estado
  if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessage) {
    return true;
  }
  
  return false;
}

// Exportar para usar en bot.js
export function verificarYEliminarEstado(sock, msg, sendSafe) {
  const from = msg.key.remoteJid;
  
  // Solo funciona en grupos
  if (!from.endsWith('@g.us')) return;
  
  const antiestadosDB = cargarAntiestados();
  
  // Verificar si antiestados está activado en este grupo
  if (!antiestadosDB[from]?.activo) return;
  
  // ✅ IGNORAR MENSAJES DEL BOT
  const remitente = msg.key.participant || msg.key.remoteJid;
  const botJid = sock.user?.id;
  if (botJid && remitente === botJid) return;
  
  // Detectar menciones de estado de grupo (más agresivo)
  const texto = msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text || '';
  
  // Detectar por texto específico de estados (actualizado con todas las variantes)
  const textoLower = texto.toLowerCase();
  const esMencionEstado = textoLower.includes('mencionaste este grupo') ||
                          textoLower.includes('mentioned this group') ||
                          textoLower.includes('mencionó este grupo') ||
                          textoLower.includes('se mencionó este grupo') ||
                          textoLower.includes('mentioned the group') ||
                          texto.includes('@') && texto.toLowerCase().includes('grupo');
  
  // Detectar por estructura de mensaje
  const tieneContextoEstado = msg.message?.extendedTextMessage?.contextInfo?.isForwarded === true;
  const tieneImagenPequeña = msg.message?.extendedTextMessage?.contextInfo?.thumbnailDirectPath;
  
  // Verificar si es un estado o mención de estado
  const esUnEstado = esEstado(msg) || esMencionEstado || (tieneContextoEstado && tieneImagenPequeña);
  
  if (esUnEstado) {
    const remitenteNum = remitente.split('@')[0];
    
    console.log(`🎯 [ANTIESTADOS] ¡ESTADO DETECTADO! Grupo: ${from.split('@')[0]}, Usuario: ${remitenteNum}`);
    
    (async () => {
      try {
        // Intentar eliminar el mensaje
        await sock.sendMessage(from, { 
          delete: msg.key 
        });
        
        console.log(`✅ [ANTIESTADOS] Estado eliminado exitosamente`);
        
        // Obtener lista de admins configurados
        const adminsAlerta = antiestadosDB[from]?.adminsAlerta || [];
        
        if (adminsAlerta.length > 0) {
          // Enviar alerta mencionando al infractor y a los admins
          await sendSafe(sock, from, {
            text: `⚠️ @${remitenteNum} ENVIÓ UN ESTADO ⚠️\n\n` +
                  `${adminsAlerta.map(admin => `@${admin.split('@')[0]}`).join(' ')}\n\n` +
                  `_Los estados no están permitidos en este grupo_`,
            mentions: [remitente, ...adminsAlerta]
          });
        } else {
          // Si no hay admins configurados, solo mostrar al infractor
          await sendSafe(sock, from, {
            text: `⚠️ @${remitenteNum} ENVIÓ UN ESTADO ⚠️\n\n` +
                  `_Los estados no están permitidos en este grupo_\n\n` +
                  `_Usa .antiestados admin @usuario para configurar alertas_`,
            mentions: [remitente]
          });
        }
        
        console.log(`🚫 [ANTIESTADOS] Estado eliminado y alerta enviada`);
      } catch(e) {
        console.error('❌ [ANTIESTADOS] Error eliminando estado:', e.message);
      }
    })();
  }
  // Ya no muestra nada si NO es un estado
}

// Comando principal
export const command = 'antiestados';

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, extras) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const { sendSafe } = extras;
  
  // Solo en grupos
  if (!from.endsWith('@g.us')) {
    return await sendSafe(sock, from, { 
      text: '❌ Este comando solo funciona en grupos.' 
    });
  }
  
  // Verificar si el usuario es admin
  try {
    const groupMeta = await sock.groupMetadata(from);
    const participant = groupMeta.participants.find(p => p.id === remitente);
    
    if (!participant || (participant.admin !== 'admin' && participant.admin !== 'superadmin')) {
      return await sendSafe(sock, from, { 
        text: '❌ Solo los administradores pueden usar este comando.' 
      });
    }
  } catch(e) {
    return await sendSafe(sock, from, { 
      text: '❌ Error verificando permisos.' 
    });
  }
  
  const subcomando = args[0]?.toLowerCase();
  const antiestadosDB = cargarAntiestados();
  
  if (!subcomando) {
    const estado = antiestadosDB[from]?.activo ? '✅ Activado' : '❌ Desactivado';
    const admins = antiestadosDB[from]?.adminsAlerta || [];
    const adminsTexto = admins.length > 0 
      ? admins.map(a => `@${a.split('@')[0]}`).join(', ')
      : 'Ninguno configurado';
    
    return await sendSafe(sock, from, {
      text: `🛡️ *SISTEMA ANTI-ESTADOS*\n\n` +
            `Estado: ${estado}\n` +
            `Admins alertados: ${adminsTexto}\n\n` +
            `*Comandos:*\n` +
            `• .antiestados activar\n` +
            `• .antiestados desactivar\n` +
            `• .antiestados admin @usuario (o "yo")\n` +
            `• .antiestados quitaradmin @usuario (o "yo")\n` +
            `• .antiestados veradmins\n` +
            `• .antiestados estado\n\n` +
            `_Los estados/view once serán eliminados automáticamente_`,
      mentions: admins
    });
  }
  
  switch(subcomando) {
    case 'activar':
    case 'on':
    case 'enable':
      if (!antiestadosDB[from]) antiestadosDB[from] = {};
      antiestadosDB[from].activo = true;
      antiestadosDB[from].activadoPor = remitente;
      antiestadosDB[from].fechaActivacion = Date.now();
      if (!antiestadosDB[from].adminsAlerta) antiestadosDB[from].adminsAlerta = [];
      guardarAntiestados(antiestadosDB);
      
      await sendSafe(sock, from, {
        text: `✅ *ANTI-ESTADOS ACTIVADO*\n\n` +
              `Los estados de WhatsApp serán eliminados automáticamente.\n\n` +
              `💡 _Usa .antiestados admin @usuario para configurar alertas_`
      });
      break;
      
    case 'desactivar':
    case 'off':
    case 'disable':
      if (antiestadosDB[from]) {
        antiestadosDB[from].activo = false;
        guardarAntiestados(antiestadosDB);
      }
      
      await sendSafe(sock, from, {
        text: `🔓 *ANTI-ESTADOS DESACTIVADO*\n\n` +
              `Los estados ya no serán eliminados.`
      });
      break;
      
    case 'admin':
    case 'añadiradmin':
    case 'addadmin':
      let usuarioAAgregar;
      
      if (args[1]?.toLowerCase() === 'yo') {
        usuarioAAgregar = remitente;
      } else {
        usuarioAAgregar = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      }
      
      if (!usuarioAAgregar) {
        return await sendSafe(sock, from, {
          text: `❌ Debes mencionar a un usuario o usar "yo".\n\n` +
                `*Uso:*\n` +
                `• .antiestados admin @usuario\n` +
                `• .antiestados admin yo`
        });
      }
      
      if (!antiestadosDB[from]) antiestadosDB[from] = { activo: false };
      if (!antiestadosDB[from].adminsAlerta) antiestadosDB[from].adminsAlerta = [];
      
      if (antiestadosDB[from].adminsAlerta.includes(usuarioAAgregar)) {
        return await sendSafe(sock, from, {
          text: `⚠️ @${usuarioAAgregar.split('@')[0]} ya está en la lista de alertas.`,
          mentions: [usuarioAAgregar]
        });
      }
      
      antiestadosDB[from].adminsAlerta.push(usuarioAAgregar);
      guardarAntiestados(antiestadosDB);
      
      await sendSafe(sock, from, {
        text: `✅ @${usuarioAAgregar.split('@')[0]} agregado a la lista de alertas anti-estados.\n\n` +
              `Total de admins: ${antiestadosDB[from].adminsAlerta.length}`,
        mentions: [usuarioAAgregar]
      });
      break;
      
    case 'quitaradmin':
    case 'removeadmin':
    case 'eliminaradmin':
      let usuarioAQuitar;
      
      if (args[1]?.toLowerCase() === 'yo') {
        usuarioAQuitar = remitente;
      } else {
        usuarioAQuitar = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      }
      
      if (!usuarioAQuitar) {
        return await sendSafe(sock, from, {
          text: `❌ Debes mencionar a un usuario o usar "yo".\n\n` +
                `*Uso:*\n` +
                `• .antiestados quitaradmin @usuario\n` +
                `• .antiestados quitaradmin yo`
        });
      }
      
      if (!antiestadosDB[from]?.adminsAlerta) {
        return await sendSafe(sock, from, {
          text: `⚠️ No hay admins configurados.`
        });
      }
      
      const index = antiestadosDB[from].adminsAlerta.indexOf(usuarioAQuitar);
      if (index === -1) {
        return await sendSafe(sock, from, {
          text: `⚠️ @${usuarioAQuitar.split('@')[0]} no está en la lista.`,
          mentions: [usuarioAQuitar]
        });
      }
      
      antiestadosDB[from].adminsAlerta.splice(index, 1);
      guardarAntiestados(antiestadosDB);
      
      await sendSafe(sock, from, {
        text: `✅ @${usuarioAQuitar.split('@')[0]} eliminado de alertas.\n\n` +
              `Admins restantes: ${antiestadosDB[from].adminsAlerta.length}`,
        mentions: [usuarioAQuitar]
      });
      break;
      
    case 'veradmins':
    case 'listaradmins':
    case 'admins':
      if (!antiestadosDB[from]?.adminsAlerta || antiestadosDB[from].adminsAlerta.length === 0) {
        return await sendSafe(sock, from, {
          text: `📋 *LISTA DE ADMINS ANTI-ESTADOS*\n\n` +
                `No hay admins configurados.\n\n` +
                `Usa .antiestados admin @usuario para agregar.`
        });
      }
      
      const listaAdmins = antiestadosDB[from].adminsAlerta
        .map((a, i) => `${i + 1}. @${a.split('@')[0]}`)
        .join('\n');
      
      await sendSafe(sock, from, {
        text: `📋 *LISTA DE ADMINS ANTI-ESTADOS*\n\n` +
              `${listaAdmins}\n\n` +
              `Total: ${antiestadosDB[from].adminsAlerta.length}`,
        mentions: antiestadosDB[from].adminsAlerta
      });
      break;
      
    case 'estado':
    case 'status':
      if (!antiestadosDB[from] || !antiestadosDB[from].activo) {
        await sendSafe(sock, from, {
          text: `📊 *ESTADO ANTI-ESTADOS*\n\n` +
                `Estado: ❌ Desactivado`
        });
      } else {
        const activadoPor = antiestadosDB[from].activadoPor?.split('@')[0] || 'Desconocido';
        const fecha = new Date(antiestadosDB[from].fechaActivacion).toLocaleString();
        const admins = antiestadosDB[from].adminsAlerta || [];
        const adminsTexto = admins.length > 0 
          ? admins.map(a => `@${a.split('@')[0]}`).join(', ')
          : 'Ninguno';
        
        await sendSafe(sock, from, {
          text: `📊 *ESTADO ANTI-ESTADOS*\n\n` +
                `Estado: ✅ Activado\n` +
                `Activado por: @${activadoPor}\n` +
                `Fecha: ${fecha}\n` +
                `Admins alertados: ${adminsTexto}`,
          mentions: [antiestadosDB[from].activadoPor, ...admins]
        });
      }
      break;
      
    default:
      await sendSafe(sock, from, {
        text: `❌ Subcomando inválido.\n\n` +
              `*Comandos disponibles:*\n` +
              `• .antiestados activar\n` +
              `• .antiestados desactivar\n` +
              `• .antiestados admin @usuario (o "yo")\n` +
              `• .antiestados quitaradmin @usuario (o "yo")\n` +
              `• .antiestados veradmins\n` +
              `• .antiestados estado`
      });
  }
}
