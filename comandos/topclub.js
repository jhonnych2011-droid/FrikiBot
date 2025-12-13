import fs from "fs";
export const command = "topclubs";
const clubFile = "./clubs.json";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  if (!fs.existsSync(clubFile)) return;

  const clubs = JSON.parse(fs.readFileSync(clubFile, "utf8"));

  const top = Object.entries(clubs)
    .sort((a, b) => (b[1].geos || 0) - (a[1].geos || 0))
    .slice(0, 10);

  if (!top.length) return sock.sendMessage(from, { text: "📭 No hay clubs aún." });

  let texto = "🏆 *Top Clubs por Geos:*\n\n";
  top.forEach(([nombre, data], i) => {
    texto += `${i + 1}. ${nombre} - 💰 ${data.geos || 0} geos\n`;
  });

  sock.sendMessage(from, { text: texto });
}
