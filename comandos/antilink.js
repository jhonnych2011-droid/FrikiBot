import fs from 'fs';
import { sendSafe } from '../bot.js'; // Asegúrate de que esta ruta sea correcta

const antilinkPath = './antilink.json';
const ownersPath = './owners.json'; // Necesario para la verificación local de Owner

// ===================================================
// UTILIDADES LOCALES DE PERMISOS
// ===================================================

function fixID(jid) {
  if (!jid) return '';
  return jid.replace(/@.+$/, "@lid");
}

function esOwner(jid) {
  try {
    const owners = JSON.parse(fs.readFileSync(ownersPath, "utf8"));
    return owners.includes(fixID(jid));
  } catch(e) {
    console.error("Error al verificar owner:", e);
    return false;
  }
}

// ===================================================
// UTILIDADES ANTILINK (Base de Datos)
// ===================================================

// Inicializar archivo si no existe
if (!fs.existsSync(antilinkPath)) {
  fs.writeFileSync(antilinkPath, JSON.stringify({}, null, 2));
}

function cargarAntilink() {
  try {
    return JSON.parse(fs.readFileSync(antilinkPath, 'utf-8'));
  } catch(e) {
    return {};
  }
}

function guardarAntilink(data) {
  fs.writeFileSync(antilinkPath, JSON.stringify(data, null, 2));
}

// Lista de links permitidos
const LINKS_PERMITIDOS = [
  'https://chat.whatsapp.com/FvmAr3qHTGMKE2C51J3ZEC',
  'https://whatsapp.com/channel/0029VbBKwI71XquRMXqfBD1R'
];

// FunciÃ³n para verificar si un link estÃ¡ permitido
function esLinkPermitido(link) {
  return LINKS_PERMITIDOS.some(permitido => link.includes(permitido));
}

// FunciÃ³n para detectar links
function detectarLinks(texto) {
  const regexLinks = [
    /https?:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+/gi,
    /https?:\/\/whatsapp\.com\/channel\/[a-zA-Z0-9]+/gi,
    /wa\.me\/[0-9]+/gi,
    /https?:\/\/[^\s]+/gi,
    /(?:^|\s)((?:www\.)?[a-zA-Z0-9-]+\.(?:com|net|org|edu|gov|mil|co|io|tv|me|info|biz|online|site|xyz|app|dev|tech|store|shop|blog|news|live|pro|club|top|link|mobi|name|wiki)[^\s]*)/gi,
    /(?:^|\s)(pornhub|xvideos|xnxx|redtube|youtu\.?be|youtube|facebook|instagram|twitter|tiktok|onlyfans|mediafire|mega\.nz|drive\.google)\.com/gi
  ];
  
  for (const regex of regexLinks) {
    const matches = texto.match(regex);
    if (matches) {
      for (const match of matches) {
        const linkLimpio = match.trim();
        if (!esLinkPermitido(linkLimpio)) {
          return { tieneLink: true, link: linkLimpio };
        }
      }
    }
  }
  
  return { tieneLink: false, link: null };
}

// ===================================================
// EXPORTADO PARA USAR EN bot.js (messageHandler)
// ===================================================

export function verificarYEliminarLink(sock, msg, sendSafe) {
  const from = msg.key.remoteJid;
  
  if (!from.endsWith('@g.us')) return;
  
  const antilinkDB = cargarAntilink();
  
  if (!antilinkDB[from]?.activo) return;
  
  const remitente = msg.key.participant || msg.key.remoteJid;
  const botJid = sock.user?.id;
  if (botJid && remitente === botJid) return;
  
  const texto = msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text || '';
  
  const { tieneLink, link } = detectarLinks(texto);
  
  if (tieneLink) {
    const remitenteNum = remitente.split('@')[0];
    
    (async () => {
      try {
        await sock.sendMessage(from, { 
          delete: msg.key 
        });
        
        const adminsAlerta = antilinkDB[from]?.adminsAlerta || [];
        
        if (adminsAlerta.length > 0) {
          await sendSafe(sock, from, {
            text: `⚠️ @${remitenteNum} ENVIÓ UN LINK ⚠️\n\n` +
                  `${adminsAlerta.map(admin => `@${admin.split('@')[0]}`).join(' ')}`,
            mentions: [remitente, ...adminsAlerta]
          });
        } else {
          await sendSafe(sock, from, {
            text: `⚠️ @${remitenteNum} ENVIÓ UN LINK ⚠️\n\n` +
                  `_Usa .antilink admin @usuario para configurar alertas_`,
            mentions: [remitente]
          });
        }
        
        console.log(`🚫 Link eliminado en ${from} por ${remitenteNum}: ${link}`);
      } catch(e) {
        console.error('Error eliminando link:', e);
      }
    })();
  }
}

// ===================================================
// COMANDO: .antilink
// ===================================================

export const command = 'antilink';
export const isOwner = true; // Marcamos para la verificación de Owner en bot.js (opcional)

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, extras) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const remitenteLid = fixID(remitente); // Usamos fixID local
  const { sendSafe } = extras;
  
  if (!from.endsWith('@g.us')) {
    return await sendSafe(sock, from, { 
      text: '❌ Este comando solo funciona en grupos.' 
    });
  }
  
  // 🔑 VERIFICACIÓN DE PERMISOS: Owner del Bot O Admin del Grupo
  let esAdmin = false;
  let ownerDelBot = esOwner(remitente); // Usamos esOwner local

  try {
    const groupMeta = await sock.groupMetadata(from);
    const participant = groupMeta.participants.find(p => p.id === remitente);
    
    if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
      esAdmin = true;
    }
  } catch(e) {
    console.error('Error obteniendo metadata para antilink:', e);
  }

  // Si no es Owner y tampoco es Admin del grupo, denegar acceso.
  if (!ownerDelBot && !esAdmin) {
    return await sendSafe(sock, from, { 
      text: '❌ Este comando solo puede ser usado por el *Owner del Bot* o un *Administrador del Grupo*.' 
    });
  }
  
  const subcomando = args[0]?.toLowerCase();
  const antilinkDB = cargarAntilink();
  
  if (!subcomando) {
    const estado = antilinkDB[from]?.activo ? '✅ Activado' : '❌ Desactivado';
    const admins = antilinkDB[from]?.adminsAlerta || [];
    const adminsTexto = admins.length > 0 
      ? admins.map(a => `@${a.split('@')[0]}`).join(', ')
      : 'Ninguno configurado';
    
    return await sendSafe(sock, from, {
      text: `🛡️ *SISTEMA ANTILINK*\n\n` +
            `Estado: ${estado}\n` +
            `Admins alertados: ${adminsTexto}\n\n` +
            `*Comandos:*\n` +
            `• .antilink activar\n` +
            `• .antilink desactivar\n` +
            `• .antilink admin @usuario (o "yo")\n` +
            `• .antilink quitaradmin @usuario (o "yo")\n` +
            `• .antilink veradmins\n` +
            `• .antilink estado\n\n` +
            `*Links permitidos:*\n` +
            LINKS_PERMITIDOS.map((l, i) => `${i + 1}. ${l}`).join('\n'),
      mentions: admins
    });
  }
  
  switch(subcomando) {
    case 'activar':
    case 'on':
    case 'enable':
      if (!antilinkDB[from]) antilinkDB[from] = {};
      antilinkDB[from].activo = true;
      antilinkDB[from].activadoPor = remitente;
      antilinkDB[from].fechaActivacion = Date.now();
      if (!antilinkDB[from].adminsAlerta) antilinkDB[from].adminsAlerta = [];
      guardarAntilink(antilinkDB);
      
      await sendSafe(sock, from, {
        text: `✅ *ANTILINK ACTIVADO*\n\n` +
              `Los links serán eliminados automáticamente.\n\n` +
              `*Excepciones (links permitidos):*\n` +
              LINKS_PERMITIDOS.map((l, i) => `${i + 1}. ${l}`).join('\n') +
              `\n\n💡 _Usa .antilink admin @usuario para configurar alertas_`
      });
      break;
      
    case 'desactivar':
    case 'off':
    case 'disable':
      if (antilinkDB[from]) {
        antilinkDB[from].activo = false;
        guardarAntilink(antilinkDB);
      }
      
      await sendSafe(sock, from, {
        text: `🔓 *ANTILINK DESACTIVADO*\n\n` +
              `Los links ya no serán eliminados.`
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
                `• .antilink admin @usuario\n` +
                `• .antilink admin yo`
        });
      }
      
      if (!antilinkDB[from]) antilinkDB[from] = { activo: false };
      if (!antilinkDB[from].adminsAlerta) antilinkDB[from].adminsAlerta = [];
      
      if (antilinkDB[from].adminsAlerta.includes(usuarioAAgregar)) {
        return await sendSafe(sock, from, {
          text: `⚠️ @${usuarioAAgregar.split('@')[0]} ya está en la lista de alertas.`,
          mentions: [usuarioAAgregar]
        });
      }
      
      antilinkDB[from].adminsAlerta.push(usuarioAAgregar);
      guardarAntilink(antilinkDB);
      
      await sendSafe(sock, from, {
        text: `✅ @${usuarioAAgregar.split('@')[0]} agregado a la lista de alertas antilink.\n\n` +
              `Total de admins: ${antilinkDB[from].adminsAlerta.length}`,
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
                `• .antilink quitaradmin @usuario\n` +
                `• .antilink quitaradmin yo`
        });
      }
      
      if (!antilinkDB[from]?.adminsAlerta) {
        return await sendSafe(sock, from, {
          text: `⚠️ No hay admins configurados.`
        });
      }
      
      const index = antilinkDB[from].adminsAlerta.indexOf(usuarioAQuitar);
      if (index === -1) {
        return await sendSafe(sock, from, {
          text: `⚠️ @${usuarioAQuitar.split('@')[0]} no está en la lista.`,
          mentions: [usuarioAQuitar]
        });
      }
      
      antilinkDB[from].adminsAlerta.splice(index, 1);
      guardarAntilink(antilinkDB);
      
      await sendSafe(sock, from, {
        text: `✅ @${usuarioAQuitar.split('@')[0]} eliminado de alertas.\n\n` +
              `Admins restantes: ${antilinkDB[from].adminsAlerta.length}`,
        mentions: [usuarioAQuitar]
      });
      break;
      
    case 'veradmins':
    case 'listaradmins':
    case 'admins':
      if (!antilinkDB[from]?.adminsAlerta || antilinkDB[from].adminsAlerta.length === 0) {
        return await sendSafe(sock, from, {
          text: `📋 *LISTA DE ADMINS ANTILINK*\n\n` +
                `No hay admins configurados.\n\n` +
                `Usa .antilink admin @usuario para agregar.`
        });
      }
      
      const listaAdmins = antilinkDB[from].adminsAlerta
        .map((a, i) => `${i + 1}. @${a.split('@')[0]}`)
        .join('\n');
      
      await sendSafe(sock, from, {
        text: `📋 *LISTA DE ADMINS ANTILINK*\n\n` +
              `${listaAdmins}\n\n` +
              `Total: ${antilinkDB[from].adminsAlerta.length}`,
        mentions: antilinkDB[from].adminsAlerta
      });
      break;
      
    case 'estado':
    case 'status':
      if (!antilinkDB[from] || !antilinkDB[from].activo) {
        await sendSafe(sock, from, {
          text: `📊 *ESTADO ANTILINK*\n\n` +
                `Estado: ❌ Desactivado`
        });
      } else {
        const activadoPor = antilinkDB[from].activadoPor?.split('@')[0] || 'Desconocido';
        const fecha = new Date(antilinkDB[from].fechaActivacion).toLocaleString();
        const admins = antilinkDB[from].adminsAlerta || [];
        const adminsTexto = admins.length > 0 
          ? admins.map(a => `@${a.split('@')[0]}`).join(', ')
          : 'Ninguno';
        
        await sendSafe(sock, from, {
          text: `📊 *ESTADO ANTILINK*\n\n` +
                `Estado: ✅ Activado\n` +
                `Activado por: @${activadoPor}\n` +
                `Fecha: ${fecha}\n` +
                `Admins alertados: ${adminsTexto}\n\n` +
                `*Links permitidos:*\n` +
                LINKS_PERMITIDOS.map((l, i) => `${i + 1}. ${l}`).join('\n'),
          mentions: [antilinkDB[from].activadoPor, ...admins]
        });
      }
      break;
      
    default:
      await sendSafe(sock, from, {
        text: `❌ Subcomando inválido.\n\n` +
              `*Comandos disponibles:*\n` +
              `• .antilink activar\n` +
              `• .antilink desactivar\n` +
              `• .antilink admin @usuario (o "yo")\n` +
              `• .antilink quitaradmin @usuario (o "yo")\n` +
              `• .antilink veradmins\n` +
              `• .antilink estado`
      });
  }
}
