// comandos/unmute.js
import fs from "fs";
const file = './data/muteados.json';

function normalizarId(id) {
  return id?.replace(/@lid|@c\.us|@g\.us/, '@s.whatsapp.net');
}

function cargarMuteados() {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function guardarMuteados(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const command = "unmute";
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  if (!from.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ Solo en grupos." }, { quoted: msg });

  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);
  if (!owners.includes(sender)) return sock.sendMessage(from, { text: "❌ Solo Owners." }, { quoted: msg });

  const mention = normalizarId(msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]);
  if (!mention) return sock.sendMessage(from, { text: "⚠️ Menciona a un usuario para desmutear." }, { quoted: msg });

  const muteados = cargarMuteados();
  if (!muteados[from] || !muteados[from].includes(mention)) {
    return sock.sendMessage(from, { text: "⚠️ Usuario no está muteado." }, { quoted: msg });
  }

  muteados[from] = muteados[from].filter(u => u !== mention);
  if (muteados[from].length === 0) delete muteados[from];
  guardarMuteados(muteados);

  await sock.sendMessage(from, { text: "🔊 Usuario desmuteado.", mentions: [mention] });
}
