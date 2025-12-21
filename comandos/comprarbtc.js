import fs from 'fs';
import { sendSafe } from '../bot.js';

export const command = 'comprarbtc';

export async function run(sock, msg, args, geosDB) {
  const user = msg.key.participant || msg.key.remoteJid;
  if (args.length < 1) 
    return await sendSafe(sock, msg.key.remoteJid, { text: 'Uso: .comprarbtc <moneda>' });

  const coin = args[0];

  // Leer siempre el archivo actualizado
  const btcFile = './btc.json';
  const btc = fs.existsSync(btcFile) ? JSON.parse(fs.readFileSync(btcFile, 'utf8')) : {};

  if (!btc[coin]) 
    return await sendSafe(sock, msg.key.remoteJid, { text: '⚠ Esa moneda no existe.' });

  // Inicializar usuario si no existe
  if (!geosDB[user]) geosDB[user] = { geos: 0, btc: {} };
  if (!geosDB[user].btc) geosDB[user].btc = {};

  const userGeos = geosDB[user].geos;
  const price = btc[coin].precio;

  if (userGeos < price) 
    return await sendSafe(sock, msg.key.remoteJid, { text: `⚠ No tienes suficientes geos. Precio: ${price}` });

  // Restar geos y agregar la moneda
  geosDB[user].geos -= price;
  geosDB[user].btc[coin] = (geosDB[user].btc[coin] || 0) + 1;

  await sendSafe(sock, msg.key.remoteJid, { text: `✔ Compraste 1 ${coin} por ${price} geos.` });
}
