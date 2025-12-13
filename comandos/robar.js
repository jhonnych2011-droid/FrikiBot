export const command = "robar";

// ✅ Función para normalizar JID a LID
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

// ✅ Verificar si es owner
function isOwner(jid) {
  const ownersPath = './owners.json';
  
  try {
    const data = JSON.parse(fs.readFileSync(ownersPath, 'utf-8'));
    if (!Array.isArray(data)) return false;
    
    const owners = data.map(o => {
      if (o.includes('@s.whatsapp.net')) {
        return o.replace('@s.whatsapp.net', '@lid');
      }
      return o;
    });
    
    const userLid = normalizeToLid(jid);
    return owners.includes(userLid);
  } catch(e) {
    return false;
  }
}

// ✅ Verificar estado VIP
async function checkVIPStatus(userJid) {
  const vipPath = './vip.json';
  
  const userLid = normalizeToLid(userJid);
  if (!userLid) return { isVIP: false, level: 0 };
  
  try {
    const vipDB = JSON.parse(fs.readFileSync(vipPath, 'utf-8'));
    const userData = vipDB[userLid];
    
    if (!userData || !userData.vipUntil) {
      return { isVIP: false, level: 0 };
    }
    
    const now = Date.now();
    if (now < userData.vipUntil) {
      return { isVIP: true, level: userData.level || 1 };
    }
    
    return { isVIP: false, level: 0 };
  } catch(e) {
    return { isVIP: false, level: 0 };
  }
}

// ✅ OBTENER GEOS DE USUARIO (compatible con LID)
function getGeosFromUser(geosDB, userLid) {
  if (!userLid) return 0;
  
  const lid = normalizeToLid(userLid);
  
  if (!geosDB[lid]) {
    return 0;
  }
  
  if (typeof geosDB[lid] === 'object' && geosDB[lid] !== null) {
    return parseInt(geosDB[lid].geos) || 0;
  }
  
  return parseInt(geosDB[lid]) || 0;
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const robber = msg.key.participant || msg.key.remoteJid;
  
  // ✅ Normalizar robber a LID
  const robberLid = normalizeToLid(robber);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) {
    return sock.sendMessage(from, { 
      text: "❌ Debes mencionar a alguien: .robar @usuario" 
    }, { quoted: msg });
  }

  // ✅ Normalizar víctima a LID
  const mentionedLid = normalizeToLid(mentioned);

  if (mentionedLid === robberLid) {
    return sock.sendMessage(from, { 
      text: "❌ No te puedes robar a ti mismo." 
    }, { quoted: msg });
  }

  // 🛡️ USUARIO PROTEGIDO
  const PROTECTED_ID = "214461239546098@lid";
  if (mentionedLid === PROTECTED_ID) {
    return sock.sendMessage(from, {
      text: `🤣 Este usuario es el dueño del bot, no puedes robarle porque piensas con el dildo metido en el culo.`,
      mentions: [mentioned]
    }, { quoted: msg });
  }

  // ✅ Crear perfiles con LID si no existen
  if (!geosDB[robberLid]) {
    geosDB[robberLid] = { geos: 0, cooldownRobar: 0 };
  }
  if (!geosDB[mentionedLid]) {
    geosDB[mentionedLid] = { geos: 0, cooldownRobar: 0 };
  }

  // ✅ Normalizar estructura de geos
  if (typeof geosDB[robberLid] === 'number') {
    geosDB[robberLid] = { geos: geosDB[robberLid], cooldownRobar: 0 };
  }
  if (typeof geosDB[mentionedLid] === 'number') {
    geosDB[mentionedLid] = { geos: geosDB[mentionedLid], cooldownRobar: 0 };
  }

  const now = Date.now();

  // ⏳ COOLDOWN DE 8 MINUTOS
  const COOLDOWN = 8 * 60 * 1000;

  const restante = geosDB[robberLid].cooldownRobar
    ? COOLDOWN - (now - geosDB[robberLid].cooldownRobar)
    : 0;

  if (restante > 0) {
    const m = Math.floor(restante / 60000);
    const s = Math.floor((restante % 60000) / 1000);
    return sock.sendMessage(from, { 
      text: `⏳ Debes esperar *${m}m ${s}s* para volver a robar.` 
    }, { quoted: msg });
  }

  // 🔼 MÁXIMO ROBO 19,000 GEOS
  const MAX = 19000;

  const victimGeos = geosDB[mentionedLid].geos || 0;
  const robberGeos = geosDB[robberLid].geos || 0;

  if (victimGeos <= 0) {
    return sock.sendMessage(from, {
      text: `❌ @${mentioned.split("@")[0]} no tiene geos para robar.`,
      mentions: [mentioned]
    }, { quoted: msg });
  }

  // ✅ DETERMINAR PROBABILIDAD SEGÚN TIPO DE USUARIO
  let successRate = 0.5; // 50% para usuarios normales
  let userType = "Normal";

  // Verificar si es owner
  if (isOwner(robberLid)) {
    successRate = 0.99; // 99% para owners
    userType = "Owner";
  } else {
    // Verificar si es VIP
    const vipStatus = await checkVIPStatus(robberLid);
    if (vipStatus.isVIP) {
      successRate = 0.70; // 70% para VIPs
      userType = `VIP Nivel ${vipStatus.level}`;
    }
  }

  console.log(`🎲 [ROBAR] ${robberLid} (${userType}) intenta robar a ${mentionedLid}`);
  console.log(`🎯 [ROBAR] Probabilidad de éxito: ${(successRate * 100).toFixed(0)}%`);

  // 🎯 Calcular éxito del robo
  const success = Math.random() < successRate;

  if (success) {
    // ✅ ROBO EXITOSO
    const maxSteal = Math.min(MAX, victimGeos);
    const amount = Math.floor(Math.random() * maxSteal) + 1;

    geosDB[mentionedLid].geos -= amount;
    geosDB[robberLid].geos += amount;
    geosDB[robberLid].cooldownRobar = now;

    console.log(`✅ [ROBAR] Éxito: ${amount} GEOS robados`);

    return sock.sendMessage(from, {
      text: `💥 *Robo exitoso* ${userType !== "Normal" ? `(${userType})` : ""}\n\n` +
            `Robaste *${amount.toLocaleString()}* geos a @${mentioned.split("@")[0]}\n\n` +
            `Tu saldo: ${geosDB[robberLid].geos.toLocaleString()} GEOS`,
      mentions: [mentioned]
    }, { quoted: msg });
  }

  // ❌ ROBO FALLIDO: pierde geos
  let lose = 0;
  if (robberGeos > 0) {
    lose = Math.floor(Math.random() * Math.min(MAX, robberGeos)) + 1;
    geosDB[robberLid].geos -= lose;
    
    // Evitar saldos negativos
    if (geosDB[robberLid].geos < 0) {
      geosDB[robberLid].geos = 0;
    }
  }

  geosDB[robberLid].cooldownRobar = now;

  console.log(`❌ [ROBAR] Fallido: ${lose} GEOS perdidos`);

  return sock.sendMessage(from, {
    text: `❌ *Robo fallido* ${userType !== "Normal" ? `(${userType})` : ""}\n\n` +
          `Perdiste *${lose.toLocaleString()}* geos.\n\n` +
          `Tu saldo: ${geosDB[robberLid].geos.toLocaleString()} GEOS`
  }, { quoted: msg });
}

