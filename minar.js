import fs from 'fs';
const GEOS_FILE = './geos.json';

export const command = 'minar';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  let geosData = {};
  
  if (fs.existsSync(GEOS_FILE)) geosData = JSON.parse(fs.readFileSync(GEOS_FILE));
  if (!geosData[sender]) geosData[sender] = { geos: 0, cooldown: 0 };
  
  const now = Date.now();
  if (now - geosData[sender].cooldown < 2 * 60 * 1000) {
    const t = Math.ceil((2 * 60 * 1000 - (now - geosData[sender].cooldown)) / 1000);
    await sock.sendMessage(from, { text: `⏳ Espera ${t}s antes de volver a minar.` }, { quoted: msg });
    return;
  }

  const geosGanados = Math.floor(Math.random() * 200) + 1;
  geosData[sender].geos += geosGanados;
  geosData[sender].cooldown = now;
  
  fs.writeFileSync(GEOS_FILE, JSON.stringify(geosData, null, 2));
  await sock.sendMessage(from, { text: `⛏️ Has minado ${geosGanados} 💎Geos.` }, { quoted: msg });
}
