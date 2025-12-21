import fs from 'fs';

const MATRIMONIOS_FILE = './matrimonios.json';

export const command = 'unmatrimonio';

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

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderLid = normalizeToLid(sender);
  
  const matrimonios = cargarMatrimonios();
  
  if (!matrimonios[senderLid]) {
    return await sock.sendMessage(from, {
      text: '❌ No estás casado/a actualmente.'
    }, { quoted: msg });
  }
  
  const parejaLid = matrimonios[senderLid].pareja;
  const fechaBoda = matrimonios[senderLid].fecha;
  const tiempoCasados = Date.now() - fechaBoda;
  const diasCasados = Math.floor(tiempoCasados / (1000 * 60 * 60 * 24));
  
  delete matrimonios[senderLid];
  delete matrimonios[parejaLid];
  
  guardarMatrimonios(matrimonios);
  
  await sock.sendMessage(from, {
    text: `💔 *MATRIMONIO DISUELTO* 💔\n\n` +
          `@${senderLid.split('@')[0]} y @${parejaLid.split('@')[0]} se han separado.\n\n` +
          `📅 Estuvieron casados por ${diasCasados} día${diasCasados !== 1 ? 's' : ''}.\n\n` +
          `Ambos ahora están solteros nuevamente.`,
    mentions: [
      senderLid.replace('@lid', '@s.whatsapp.net'),
      parejaLid.replace('@lid', '@s.whatsapp.net')
    ]
  }, { quoted: msg });
}
