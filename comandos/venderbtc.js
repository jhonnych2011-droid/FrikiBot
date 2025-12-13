import { sendSafe } from '../bot.js';
import fs from 'fs';

export const command = 'venderbtc';

export async function run(sock, msg, args, geosDB) {
  const user = msg.key.participant || msg.key.remoteJid;
  if (args.length < 2) return await sendSafe(sock, msg.key.remoteJid, { text: 'Uso: .venderbtc <moneda> <cantidad>' });

  const [coin, cantidadStr] = args;
  const cantidad = parseFloat(cantidadStr);
  const userData = geosDB[user];

  if (!userData?.btc?.[coin] || userData.btc[coin] < cantidad) return await sendSafe(sock, msg.key.remoteJid, { text: '⚠ No tienes suficiente de esa moneda.' });

  const btc = JSON.parse(fs.readFileSync('./btc.json', 'utf8'));
  const precio = btc[coin]?.precio || 0;

  userData.btc[coin] -= cantidad;
  userData.geos += precio * cantidad;

  await sendSafe(sock, msg.key.remoteJid, { text: `✔ Vendiste ${cantidad} ${coin} y recibiste ${precio * cantidad} geos.` });
}
