// diagvip.js - Comando de diagnóstico
import fs from 'fs';

export const command = 'diagvip';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  
  // Verificar TODOS los archivos VIP posibles
  const archivos = [
    './vip.json',
    './bot/data/vip.json',
    './data/vip.json',
    './database/vip.json'
  ];
  
  let mensaje = '🔍 *DIAGNÓSTICO VIP*\n\n';
  
  for (const archivo of archivos) {
    mensaje += `📁 ${archivo}:\n`;
    
    if (fs.existsSync(archivo)) {
      try {
        const data = JSON.parse(fs.readFileSync(archivo, 'utf-8'));
        const size = JSON.stringify(data).length;
        const entries = Object.keys(data).length;
        mensaje += `   ✅ EXISTE | Tamaño: ${size}b | Usuarios: ${entries}\n`;
        
        // Mostrar algunos usuarios (máximo 3)
        let count = 0;
        for (const [user, info] of Object.entries(data)) {
          if (count < 3) {
            const expira = info.vipUntil ? new Date(info.vipUntil).toLocaleString() : 'N/A';
            mensaje += `   👤 ${user}: Nivel ${info.level || 1} | Expira: ${expira}\n`;
            count++;
          }
        }
        if (entries > 3) mensaje += `   ... y ${entries - 3} más\n`;
        
      } catch(e) {
        mensaje += `   ❌ ERROR: ${e.message}\n`;
      }
    } else {
      mensaje += `   ❌ NO EXISTE\n`;
    }
    mensaje += '\n';
  }
  
  // Verificar función normalizeToLid
  function normalizeToLid(jid) {
    if (!jid) return null;
    if (jid.includes('@lid')) return jid;
    if (jid.includes('@s.whatsapp.net')) {
      const numero = jid.split('@')[0];
      return `${numero}@lid`;
    }
    const numero = jid.split('@')[0];
    return `${numero}@lid`;
  }
  
  const userLid = normalizeToLid(remitente);
  mensaje += `👤 *Tu información:*\n`;
  mensaje += `• JID: ${remitente}\n`;
  mensaje += `• LID: ${userLid}\n`;
  
  // Buscar en el archivo principal vip.json
  if (fs.existsSync('./vip.json')) {
    try {
      const vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
      if (vipDB[userLid]) {
        const info = vipDB[userLid];
        const now = Date.now();
        const activo = info.vipUntil && now < info.vipUntil;
        const expira = info.vipUntil ? new Date(info.vipUntil).toLocaleString() : 'N/A';
        const restante = info.vipUntil ? Math.floor((info.vipUntil - now) / (1000 * 60 * 60 * 24)) + 'd' : 'N/A';
        
        mensaje += `\n🎯 *Tu VIP en ./vip.json:*\n`;
        mensaje += `• Nivel: ${info.level || 1}\n`;
        mensaje += `• Expira: ${expira}\n`;
        mensaje += `• Días restantes: ${restante}\n`;
        mensaje += `• Estado: ${activo ? '✅ ACTIVO' : '❌ INACTIVO'}\n`;
        mensaje += `• Compras: ${info.purchases || 0}\n`;
      } else {
        mensaje += `\n❌ No tienes VIP en ./vip.json\n`;
      }
    } catch(e) {
      mensaje += `\n⚠️ Error leyendo ./vip.json: ${e.message}\n`;
    }
  }
  
  await sock.sendMessage(from, { text: mensaje });
}
