import fs from "fs";

export const command = "quitaradv";

const FILE = "./advertencias.json";

function loadData() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");
  return JSON.parse(fs.readFileSync(FILE));
}

function saveData(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function normalize(id) {
  return id.replace(/@.+/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const target = mentions[0];

  if (!target) {
    await sock.sendMessage(from, { text: "Debes mencionar a alguien." });
    return;
  }

  const id = normalize(target);
  const data = loadData();

  if (!data[id] || data[id] <= 0) {
    await sock.sendMessage(from, { text: "Ese usuario no tiene advertencias." });
    return;
  }

  data[id]--;
  saveData(data);

  await sock.sendMessage(from, {
    text: `Felicidades manito @${id.split("@")[0]}, ya no tienes ${data[id]} advertencia`,
    mentions: [id]
  });
}
