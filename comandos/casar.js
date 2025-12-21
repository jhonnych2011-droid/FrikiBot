import fs from 'fs';

const MATRIMONIOS_FILE = './matrimonios.json';
const PROPUESTAS_FILE = './propuestas.json';

export const command = 'casar';

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

function cargarMatrimonios() {
  if (!fs.existsSync(MATRIMONIOS_FILE)) {
    fs.writeFileSync(MATRIMONIOS_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(MATRIMONIOS_FILE, 'utf-8'));
}

function guardarMatrimonios(data) {
  fs.writeFileSync(MATRIMONIOS_FILE, JSON.stringify(data, null, 2));
}

function cargarPropuestas() {
  if (!fs.existsSync(PROPUESTAS_FILE)) {
    fs.writeFileSync(PROPUESTAS_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(PROPUESTAS_FILE, 'utf-8'));
}

function guardarPropuestas(data) {
  fs.writeFileSync(PROPUESTAS_FILE, JSON.stringify(data, null, 2));
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderLid = normalizeToLid(sender);
  
  const matrimonios = cargarMatrimonios();
  const propuestas = cargarPropuestas();
  
  const EXPIRATION_TIME = 24 * 60 * 60 * 1000;
  const now = Date.now();
  let propuestasLimpiadas = false;
  
  for (const key in propuestas) {
    if (now - propuestas[key].timestamp > EXPIRATION_TIME) {
      delete propuestas[key];
      propuestasLimpiadas = true;
    }
  }
  
  if (propuestasLimpiadas) {
    guardarPropuestas(propuestas);
  }
  
  if (matrimonios[senderLid]) {
    const parejaActual = matrimonios[senderLid].pareja;
    return await sock.sendMessage(from, {
      text: `❌ Ya estás casado/a con @${parejaActual.split('@')[0]}`,
      mentions: [parejaActual.replace('@lid', '@s.whatsapp.net')]
    }, { quoted: msg });
  }
  
  let propuestaEncontrada = null;
  let proposerLid = null;
  
  for (const [key, propuesta] of Object.entries(propuestas)) {
    if (propuesta.target === senderLid) {
      propuestaEncontrada = propuesta;
      proposerLid = key;
      break;
    }
  }
  
  if (!propuestaEncontrada) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes ninguna propuesta de matrimonio pendiente.'
    }, { quoted: msg });
  }
  
  if (matrimonios[proposerLid]) {
    delete propuestas[proposerLid];
    guardarPropuestas(propuestas);
    return await sock.sendMessage(from, {
      text: '❌ La persona que te propuso matrimonio ya se casó con alguien más.'
    }, { quoted: msg });
  }
  
  const fechaBoda = Date.now();
  
  matrimonios[senderLid] = {
    pareja: proposerLid,
    fecha: fechaBoda
  };
  
  matrimonios[proposerLid] = {
    pareja: senderLid,
    fecha: fechaBoda
  };
  
  guardarMatrimonios(matrimonios);
  
  delete propuestas[proposerLid];
  guardarPropuestas(propuestas);
  
  await sock.sendMessage(from, {
    text: `💒 *¡MATRIMONIO CONFIRMADO!* 💒\n\n` +
          `🎉 @${proposerLid.split('@')[0]} y @${senderLid.split('@')[0]} ahora están casados!\n\n` +
          `💝 Fecha: ${new Date(fechaBoda).toLocaleDateString()}\n\n` +
          `¡Felicidades a la feliz pareja! 🎊✨`,
    mentions: [
      proposerLid.replace('@lid', '@s.whatsapp.net'),
      senderLid.replace('@lid', '@s.whatsapp.net')
    ]
  }, { quoted: msg });
}
