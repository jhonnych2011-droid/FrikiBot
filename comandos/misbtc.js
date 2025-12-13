import { sendSafe } from '../bot.js';

export const command = 'misbtc';

export async function run(sock, msg, args, geosDB) {
  const user = msg.key.participant || msg.key.remoteJid;
  const userData = geosDB[user];

  if (!userData?.btc || Object.keys(userData.btc).length === 0) {
    return await sendSafe(sock, msg.key.remoteJid, { text: '⚠ No tienes monedas.' });
  }

  const lista = Object.entries(userData.btc)
    .map(([coin, cant]) => `• ${coin}: ${cant}`)
    .join('\n');

  await sendSafe(sock, msg.key.remoteJid, { text: `💰 Tus monedas:\n${lista}` });
}
