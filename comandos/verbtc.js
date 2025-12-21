import fs from 'fs';

export const command = 'verbtc';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  if (!args[0]) return await sock.sendMessage(from, { text: 'Uso: .verbtc <moneda>' });

  const moneda = args[0].toLowerCase();
  const btcFile = './btc.json';
  const btc = fs.existsSync(btcFile) ? JSON.parse(fs.readFileSync(btcFile,'utf8')) : {};

  if (!btc[moneda]) return await sock.sendMessage(from, { text: 'Moneda no encontrada.' });

  await sock.sendMessage(from, { text: `💰 ${moneda.toUpperCase()}: ${btc[moneda].precio} geos` });
}
