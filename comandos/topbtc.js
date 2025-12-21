import fs from "fs";
export const command = "topbtc";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const btcFile = './btc.json';
  const balancesFile = './btcBalances.json';
  const usuariosFile = './usuarios_lid.json';

  if (!fs.existsSync(btcFile) || !fs.existsSync(balancesFile) || !fs.existsSync(usuariosFile)) {
    return sock.sendMessage(from, { text: "❌ Faltan archivos JSON." });
  }

  const btc = JSON.parse(fs.readFileSync(btcFile, 'utf8'));
  const balances = JSON.parse(fs.readFileSync(balancesFile, 'utf8'));
  const usuarios = JSON.parse(fs.readFileSync(usuariosFile, 'utf8'));

  const ranking = [];

  for (const user in balances) {
    let total = 0;
    for (const coin in balances[user]) {
      total += balances[user][coin] * (btc[coin]?.precio || 0);
    }
    if (total > 0) {
      ranking.push({ user, total });
    }
  }

  ranking.sort((a, b) => b.total - a.total);

  let texto = "🏆 Top Inversionistas:\n\n";
  ranking.slice(0, 10).forEach((r, i) => {
    const nombre = usuarios[r.user]?.nombre || r.user.replace(/@.+$/, "");
    texto += `${i+1}. ${nombre} → ${r.total.toFixed(2)} geos\n`;
  });

  sock.sendMessage(from, { text: texto }, { quoted: msg });
}
