import fs from 'fs';

const vipPath = './vip.json';

function cargarVIP() {
  return fs.existsSync(vipPath) ? JSON.parse(fs.readFileSync(vipPath, 'utf-8')) : {};
}

function getOwners() {
  const ownersPath = './owners.json';
  if (!fs.existsSync(ownersPath)) return [];
  const data = JSON.parse(fs.readFileSync(ownersPath, 'utf-8'));
  return data.map(o => o.split("@")[0]);
}

function getPhoneNumber(jid) {
  if (!jid) return null;
  return jid.split('@')[0];
}

function isOwner(jid) {
  const owners = getOwners();
  const phone = getPhoneNumber(jid);
  return owners.includes(phone);
}

export const command = 'listvip';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;

  if (!isOwner(remitente)) return sock.sendMessage(from, { text: '❌ Solo owners.' });

  const vipDB = cargarVIP();
  const now = Date.now();

  let texto = `📊 *LISTA VIP*\n\n`;

  Object.keys(vipDB).forEach((num, i) => {
    const data = vipDB[num];
    if (data.vipUntil > now) {
      const restante = data.vipUntil - now;
      texto += `${i + 1}. @${num} | Nivel: ${data.level} | ⏰ ${Math.floor(restante/3600000)}h\n`;
    }
  });

  await sock.sendMessage(from, { text: texto });
}
