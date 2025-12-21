import fs from 'fs';
import { sendSafe } from '../bot.js';

export const command = "añadirbtc";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (args.length < 3) 
    return await sendSafe(sock, from, { text: 'Uso: .añadirbtc <nombre> <precio> <% de subir/bajar>' });

  const nombre = args[0];
  const precio = parseFloat(args[1]);
  const variacion = parseFloat(args[2]);

  if (isNaN(precio) || isNaN(variacion)) 
    return await sendSafe(sock, from, { text: 'Precio o % inválido' });

  const btcFile = './btc.json';
  const btcHistoryFile = './btcHistory.json';

  let btc = fs.existsSync(btcFile) ? JSON.parse(fs.readFileSync(btcFile, 'utf8')) : {};
  let btcHistory = fs.existsSync(btcHistoryFile) ? JSON.parse(fs.readFileSync(btcHistoryFile, 'utf8')) : {};

  // Si ya existe, no sobreescribimos, solo actualizamos precio y variación
  if (!btc[nombre]) {
    btc[nombre] = { precio, variacion };
  } else {
    btc[nombre].precio = precio;
    btc[nombre].variacion = variacion;
  }

  // Inicializar historial si no existe y añadir el precio
  if (!btcHistory[nombre]) btcHistory[nombre] = [];
  btcHistory[nombre].push(precio);

  fs.writeFileSync(btcFile, JSON.stringify(btc, null, 2));
  fs.writeFileSync(btcHistoryFile, JSON.stringify(btcHistory, null, 2));

  await sendSafe(sock, from, { text: `✔ Moneda ${nombre} añadida/actualizada con precio inicial ${precio} geos` });
}
