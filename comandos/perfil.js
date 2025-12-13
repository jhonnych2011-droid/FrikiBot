import fs from 'fs';
const GEOS_FILE = './geos.json';
const USERS_FILE = './usuarios.json';
const FAV_FILE = './favoritos.json';
const VIP_FILE = './vip.json';
const MATRIMONIOS_FILE = './matrimonios.json';

export const command = 'perfil';

// Convertir a LID consistente
function fixID(jid) {
  if (!jid) return null;
  return jid.replace(/@.+$/, "@lid");
}

function checkVIPStatus(userJid) {
  const userLid = fixID(userJid);
  if (!userLid) return { isVIP: false, level: 0, expiry: null };
  
  let vipDB = {};
  if (fs.existsSync(VIP_FILE)) {
    try {
      vipDB = JSON.parse(fs.readFileSync(VIP_FILE, 'utf-8'));
    } catch(e) {
      return { isVIP: false, level: 0, expiry: null };
    }
  }
  
  const userData = vipDB[userLid];
  if (!userData || !userData.vipUntil) {
    return { isVIP: false, level: 0, expiry: null };
  }
  
  const now = Date.now();
  if (now < userData.vipUntil) {
    return { 
      isVIP: true, 
      level: userData.level || 1, 
      expiry: new Date(userData.vipUntil)
    };
  }
  return { isVIP: false, level: 0, expiry: null };
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderLid = fixID(sender);

  let geosData = {};
  let usuarios = {};
  let favoritos = {};
  let matrimonios = {};

  if (fs.existsSync(GEOS_FILE)) geosData = JSON.parse(fs.readFileSync(GEOS_FILE));
  if (fs.existsSync(USERS_FILE)) usuarios = JSON.parse(fs.readFileSync(USERS_FILE));
  if (fs.existsSync(FAV_FILE)) favoritos = JSON.parse(fs.readFileSync(FAV_FILE));
  if (fs.existsSync(MATRIMONIOS_FILE)) matrimonios = JSON.parse(fs.readFileSync(MATRIMONIOS_FILE));

  // Obtener nombre del usuario
  const nombre = usuarios[senderLid]?.nombre || 'Usuario';
  
  // Obtener geos
  let geos = 0;
  if (geosData[senderLid]) {
    if (typeof geosData[senderLid] === 'object' && geosData[senderLid] !== null) {
      geos = geosData[senderLid].geos || 0;
    } else {
      geos = geosData[senderLid] || 0;
    }
  }
  
  // Obtener favorito
  const fav = favoritos[senderLid] 
    ? `\n\n❤ Personaje Favorito: ${favoritos[senderLid]}` 
    : '';

  // Verificar VIP
  const vipStatus = checkVIPStatus(sender);
  const vipInfo = vipStatus.isVIP ? '\n\n⭐ Vip: ✅' : '\n\n⭐ Vip: ❌';

  // Verificar matrimonio
  let matrimonioInfo = '';
  let mentions = [];
  
  if (matrimonios[senderLid]) {
    const parejaLid = matrimonios[senderLid].pareja;
    
    // Obtener nombre de la pareja de usuarios.json
    const nombrePareja = usuarios[parejaLid]?.nombre || 'Usuario';
    
    // Convertir LID a formato de mención
    const parejaMention = parejaLid.replace('@lid', '@s.whatsapp.net');
    
    matrimonioInfo = `\n\n💍 Esposo/a: ${nombrePareja}`;
    mentions = [parejaMention];
  }

  const perfilMsg = `👤 *${nombre}* tiene:\n\n💎 *Geos:* ${geos}${fav}${vipInfo}${matrimonioInfo}`;

  await sock.sendMessage(from, { 
    text: perfilMsg,
    mentions: mentions
  }, { quoted: msg });
}
