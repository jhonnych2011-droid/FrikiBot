// comandos/mute.js
import fs from "fs";
const file = './data/muteados.json';

// 🛡️ ID que NO PUEDE ser muteado
const ID_PROTEGIDO = "214461239546098@s.whatsapp.net";

function normalizarId(id) {
  return id?.replace(/@lid|@c\.us|@g\.us/, '@s.whatsapp.net');
}

function cargarMuteados() {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function guardarMuteados(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export const command = "mute";
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  if (!from.endsWith("@g.us")) 
    return sock.sendMessage(from, { text: "❌ Solo en grupos." }, { quoted: msg });

  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);
  if (!owners.includes(sender))
    return sock.sendMessage(from, { text: "❌ Solo Owners." }, { quoted: msg });

  const mention = normalizarId(
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  );

  if (!mention)
    return sock.sendMessage(from, { text: "⚠️ Menciona a un usuario para silenciarlo." }, { quoted: msg });

  // ❗ Si intentan mutear al creador
  if (mention === ID_PROTEGIDO) {
    return sock.sendMessage(
      from,
      { 
        text: "El es mi creador, no puede ser muteado, autista de mierda ❤",
        mentions: [mention]
      },
      { quoted: msg }
    );
  }

  const muteados = cargarMuteados();
  if (!muteados[from]) muteados[from] = [];

  if (!muteados[from].includes(mention)) {
    muteados[from].push(mention);
    guardarMuteados(muteados);
    await sock.sendMessage(from, { text: `🔇 Usuario muteado.`, mentions: [mention] });
  } else {
    await sock.sendMessage(from, { text: "⚠️ Ya estaba muteado." });
  }
}

export async function eliminarMuteados(sock, messages) {
  for (const msg of messages) {
    if (!msg.message || !msg.key.remoteJid.endsWith("@g.us")) continue;

    const from = msg.key.remoteJid;
    const sender = normalizarId(msg.key.participant || msg.key.remoteJid);

    // 🔰 No eliminar mensajes del ID protegido
    if (sender === ID_PROTEGIDO) continue;

    const muteados = cargarMuteados();
    if (muteados[from]?.includes(sender)) {
      try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
    }
  }
}
