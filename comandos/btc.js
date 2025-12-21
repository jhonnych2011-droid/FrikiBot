import fs from "fs";

export const command = "btc";

const btcFile = "./btc.json";
const balancesFile = "./btcBalances.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function cargarBTC() {
  if (!fs.existsSync(btcFile)) fs.writeFileSync(btcFile, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(btcFile, "utf8"));
}

function cargarBalances() {
  if (!fs.existsSync(balancesFile)) fs.writeFileSync(balancesFile, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(balancesFile, "utf8"));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  const btc = cargarBTC();
  const balances = cargarBalances();
  if (!balances[sender]) balances[sender] = {};

  let texto = "💹 *Mercado de Criptomonedas*\n\n";

  for (const [nombre, data] of Object.entries(btc)) {
    const balance = balances[sender][nombre] || 0;
    texto += `🪙 *${nombre}*\n💰 Precio: ${data.precio} geos\n📊 Balance: ${balance}\n\n`;
  }

  sock.sendMessage(from, { text: texto }, { quoted: msg });
}
