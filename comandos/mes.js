// comandos/mes.js
import fs from "fs";

export const command = "mes";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/@.+$/, "@lid");

  const geosPath = "./bot/data/geos.json";
  if (!fs.existsSync(geosPath)) {
    return sock.sendMessage(from, { text: "⚠️ No existe geos.json." }, { quoted: msg });
  }

  const geosDB = JSON.parse(fs.readFileSync(geosPath));

  if (!geosDB[sender]) {
    geosDB[sender] = {
      geos: 0,
      hourlyCooldown: 0,
      dailyCooldown: 0,
      weeklyCooldown: 0,
      monthlyCooldown: 0
    };
    fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2));
  }

  const user = geosDB[sender];
  const now = Date.now();

  // Funcion para formatear tiempo restante
  const format = (ms) => {
    if (ms <= 0) return "✔️ Disponible";

    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);

    return `${h}h ${m}m ${s}s`;
  };

  const texto = `
⏳ *Tiempos de cooldown disponibles*

🕐 *Hourly:* ${format(user.hourlyCooldown - now)}
📅 *Daily:* ${format(user.dailyCooldown - now)}
📆 *Weekly:* ${format(user.weeklyCooldown - now)}
📆 *Monthly:* ${format(user.monthlyCooldown - now)}
`;

  sock.sendMessage(from, { text: texto }, { quoted: msg });
}
