import fs from 'fs';

export const command = 'alertabtc';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (args.length < 2) return await sock.sendMessage(from, { text: 'Uso: .alertabtc <moneda> <porcentaje>' });

  const moneda = args[0].toLowerCase();
  const porcentaje = parseFloat(args[1]);
  if (isNaN(porcentaje)) return await sock.sendMessage(from, { text: 'El porcentaje debe ser un número.' });

  const alertsFile = './btcAlerts.json';
  let alerts = fs.existsSync(alertsFile) ? JSON.parse(fs.readFileSync(alertsFile,'utf8')) : {};

  if (!alerts[sender]) alerts[sender] = [];
  alerts[sender].push({ moneda, porcentaje });

  fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
  await sock.sendMessage(from, { text: `✔ Alerta creada para ${moneda.toUpperCase()} al ${porcentaje}%` });
}
