import fs from 'fs';
import { sendSafe } from '../bot.js';

export const command = 'shopbtc';

export async function run(sock, msg, args) {
  // Leer siempre el archivo actualizado
  const btcFile = './btc.json';
  const btc = fs.existsSync(btcFile) ? JSON.parse(fs.readFileSync(btcFile, 'utf8')) : {};

  if (Object.keys(btc).length === 0) 
    return await sendSafe(sock, msg.key.remoteJid, { text: '⚠ No hay monedas disponibles.' });

  const lista = Object.entries(btc)
    .map(([coin, info]) => `• ${coin}: ${info.precio} geos`)
    .join('\n');

  await sendSafe(sock, msg.key.remoteJid, { text: `💰 *Shop BTC - Precios actuales*\n\n${lista}` });
}
