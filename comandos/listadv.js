import fs from "fs";

export const command = "listadv";

const FILE = "./advertencias.json";

function loadData() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");
  return JSON.parse(fs.readFileSync(FILE));
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const data = loadData();

  if (Object.keys(data).length === 0) {
    await sock.sendMessage(from, { text: "Nadie tiene advertencias aún." });
    return;
  }

  let texto = "📋 *Lista de advertencias:*\n\n";

  for (const id in data) {
    texto += `@${id.split("@")[0]} → ${data[id]} Advertencias\n`;
  }

  await sock.sendMessage(from, {
    text: texto,
    mentions: Object.keys(data)
  });
}
