import fs from 'fs';

const PROPUESTAS_FILE = './propuestas.json';

export const command = 'cancelarpropuesta';

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
  
  if (!propuestas[senderLid]) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes ninguna propuesta de matrimonio activa para cancelar.'
    }, { quoted: msg });
  }
  
  const targetLid = propuestas[senderLid].target;
  
  delete propuestas[senderLid];
  guardarPropuestas(propuestas);
  
  await sock.sendMessage(from, {
    text: `🚫 *PROPUESTA CANCELADA* 🚫\n\n` +
          `@${senderLid.split('@')[0]} ha cancelado su propuesta de matrimonio a @${targetLid.split('@')[0]}.\n\n` +
          `Ya puedes hacer una nueva propuesta a otra persona.`,
    mentions: [
      senderLid.replace('@lid', '@s.whatsapp.net'),
      targetLid.replace('@lid', '@s.whatsapp.net')
    ]
  }, { quoted: msg });
}
