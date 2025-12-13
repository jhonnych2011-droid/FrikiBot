import fs from 'fs';

const PROPUESTAS_FILE = './propuestas.json';

export const command = 'rechazar';

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
      text: '❌ No tienes ninguna propuesta de matrimonio pendiente para rechazar.'
    }, { quoted: msg });
  }
  
  delete propuestas[proposerLid];
  guardarPropuestas(propuestas);
  
  await sock.sendMessage(from, {
    text: `💔 *PROPUESTA RECHAZADA* 💔\n\n` +
          `@${senderLid.split('@')[0]} ha rechazado la propuesta de matrimonio de @${proposerLid.split('@')[0]}.\n\n` +
          `😢 Mejor suerte la próxima vez...`,
    mentions: [
      senderLid.replace('@lid', '@s.whatsapp.net'),
      proposerLid.replace('@lid', '@s.whatsapp.net')
    ]
  }, { quoted: msg });
}
