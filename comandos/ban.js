export const command = "ban";
import fs from "fs";

const file = "./bot/data/banlist.json";

// 🛡️ ID del creador protegido (normalizado)
const ID_PROTEGIDO = "214461239546098@s.whatsapp.net";

// Normalizar IDs
function normalizarId(id) {
  return id?.replace(/@lid|@c\.us|@g\.us/, "@s.whatsapp.net");
}

// Cargar y guardar baneados
function cargarBaneados() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function guardarBaneados(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);

  // Usuario mencionado (ID crudo)
  const mentionRaw = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentionRaw)
    return sock.sendMessage(from, {
      text: "⚠️ Menciona a alguien para banearlo.\nEjemplo: *.ban @usuario*"
    });

  // Normalizado SOLO para comparar con ID protegido
  const mentionNorm = normalizarId(mentionRaw);

  // Owners
  let owners = [];
  if (fs.existsSync("./owners.json"))
    owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);

  if (!owners.includes(sender))
    return sock.sendMessage(from, {
      text: "❌ Solo los Owners pueden usar este comando."
    });

  // ✋ Proteger al creador
  if (mentionNorm === ID_PROTEGIDO) {
    return sock.sendMessage(
      from,
      {
        text: "El es mi creador, no puede ser baneado, autista de mierda ❤",
        mentions: [mentionRaw]
      },
      { quoted: msg }
    );
  }

  // BANEO REAL — usando el ID CRUDO
  const baneados = cargarBaneados();

  if (baneados[mentionRaw]) {
    delete baneados[mentionRaw];
    guardarBaneados(baneados);
    sock.sendMessage(from, {
      text: `✅ El usuario fue *desbaneado*.`,
      mentions: [mentionRaw]
    });
  } else {
    baneados[mentionRaw] = true;
    guardarBaneados(baneados);
    sock.sendMessage(from, {
      text: `🚫 El usuario fue *baneado*.`,
      mentions: [mentionRaw]
    });
  }
}
