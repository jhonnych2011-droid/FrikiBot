import fs from "fs";
export const command = "grafica";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  if (!args[0]) return sock.sendMessage(from, { text: "⚠️ Usa: .grafica <moneda>" }, { quoted: msg });

  const coin = args[0].toUpperCase();
  const historyFile = './btcHistory.json';
  if (!fs.existsSync(historyFile)) return sock.sendMessage(from, { text: "❌ No hay historial de precios.", quoted: msg });

  const btcHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  if (!btcHistory[coin]) return sock.sendMessage(from, { text: "❌ Esa moneda no existe.", quoted: msg });

  const precios = btcHistory[coin];
  const max = Math.max(...precios);
  const min = Math.min(...precios);

  let grafica = `📊 Historial de ${coin} (últimos ${precios.length} precios):\n\n`;

  for (const p of precios) {
    const barLength = Math.round(((p - min) / (max - min || 1)) * 20);
    grafica += "█".repeat(barLength) + ` ${p}\n`;
  }

  sock.sendMessage(from, { text: grafica }, { quoted: msg });
}
