import fs from 'fs';

export const command = "historialbtc";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (args.length < 1) 
    return sock.sendMessage(from, { text: 'Uso: .historialbtc <nombre moneda>' });

  const nombre = args[0];
  const btcHistoryFile = './btcHistory.json';
  const btcHistory = fs.existsSync(btcHistoryFile) ? JSON.parse(fs.readFileSync(btcHistoryFile, 'utf8')) : {};

  if (!btcHistory[nombre] || btcHistory[nombre].length === 0)
    return sock.sendMessage(from, { text: '⚠ No hay historial de esta moneda.' });

  // Tomar solo los últimos 5 precios
  const ultimosPrecios = btcHistory[nombre].slice(-5);

  let texto = `💹 Historial de ${nombre} (últimos 5 precios):\n`;

  ultimosPrecios.forEach((precio, i) => {
    let cambio = '';
    if (i === 0) cambio = '⏺️'; // Primer precio
    else if (precio > ultimosPrecios[i - 1]) cambio = '📈'; // Subió
    else if (precio < ultimosPrecios[i - 1]) cambio = '📉'; // Bajó
    else cambio = '➡️'; // Igual

    texto += `${i + 1}. ${precio} geos ${cambio}\n`;
  });

  await sock.sendMessage(from, { text: texto });
}
