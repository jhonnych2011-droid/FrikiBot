export const command = 'comandosbtc';

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp) {
  const from = msg.key.remoteJid;

  const texto = `💰 *Comandos de BTC/Geos* 💰\n
1️⃣ .añadirbtc <moneda> <precio> - Agrega una nueva moneda al sistema BTC.
2️⃣ .alertabtc <moneda> <porcentaje> - Crear alerta para cuando la moneda suba/baje cierto %.
3️⃣ .verbtc <moneda> - Ver el precio actual de una moneda.
4️⃣ .historialbtc <moneda> - Ver el historial de los últimos 30 precios.
5️⃣ .comandosbtc - Mostrar esta lista de comandos.`;

  await sock.sendMessage(from, { text: texto });
}
