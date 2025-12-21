import fs from "fs";

// ───── Archivos ─────
const GEOS_FILE = "./geos.json";
const USERS_FILE = "./usuarios.json";
const FAV_FILE = "./favoritos.json";
const VIP_FILE = "./vip.json";
const MATRIMONIOS_FILE = "./matrimonios.json";
const PERFIL_FILE = "./perfiles.json";
const OWNERS_FILE = "./owners.json";

export const command = "perfil";

// ───── Utils ─────
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// ───── Owners (MISMO MÉTODO QUE .agregar) ─────
const owners = fs.existsSync(OWNERS_FILE)
  ? JSON.parse(fs.readFileSync(OWNERS_FILE, "utf8"))
  : [];

function esOwner(jid) {
  return owners.includes(fixID(jid));
}

// ───── VIP ─────
function esVIP(jid) {
  const lid = fixID(jid);
  if (!fs.existsSync(VIP_FILE)) return false;

  const vipDB = JSON.parse(fs.readFileSync(VIP_FILE));
  const data = vipDB[lid];
  return data?.vipUntil && Date.now() < data.vipUntil;
}

// ───── RUN ─────
export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const senderRaw = msg.key.participant || msg.key.remoteJid;
  const senderLid = fixID(senderRaw);

  // Cargar DBs
  const geosData = fs.existsSync(GEOS_FILE) ? JSON.parse(fs.readFileSync(GEOS_FILE)) : {};
  const usuarios = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};
  const favoritos = fs.existsSync(FAV_FILE) ? JSON.parse(fs.readFileSync(FAV_FILE)) : {};
  const matrimonios = fs.existsSync(MATRIMONIOS_FILE) ? JSON.parse(fs.readFileSync(MATRIMONIOS_FILE)) : {};
  const perfiles = fs.existsSync(PERFIL_FILE) ? JSON.parse(fs.readFileSync(PERFIL_FILE)) : {};

  // Datos básicos
  const nombre = usuarios[senderLid]?.nombre || "Usuario";

  const geos =
    typeof geosData[senderLid] === "object"
      ? geosData[senderLid]?.geos || 0
      : geosData[senderLid] || 0;

  const fav = favoritos[senderLid]
    ? `\n\n❤️ Personaje Favorito: ${favoritos[senderLid]}`
    : "";

  const vipInfo = esVIP(senderRaw) ? "\n\n⭐ Vip: ✅" : "\n\n⭐ Vip: ❌";

  // Matrimonio
  let matrimonioInfo = "";
  let mentions = [];

  if (matrimonios[senderLid]) {
    const parejaLid = matrimonios[senderLid].pareja;
    const nombrePareja = usuarios[parejaLid]?.nombre || "Usuario";
    const mention = parejaLid.replace("@lid", "@s.whatsapp.net");

    matrimonioInfo = `\n\n💍 Esposo/a: ${nombrePareja}`;
    mentions.push(mention);
  }

  // Owner centrado
  const ownerTag = esOwner(senderRaw)
    ? "       👑 OWNER 👑\n"
    : "";

  const texto =
    ownerTag +
    `👤 *${nombre}* tiene:\n\n💎 *Geos:* ${geos}` +
    fav +
    vipInfo +
    matrimonioInfo;

  // Envío
  if (perfiles[senderLid]) {
    await sock.sendMessage(
      from,
      {
        image: Buffer.from(perfiles[senderLid], "base64"),
        caption: texto,
        mentions
      },
      { quoted: msg }
    );
  } else {
    await sock.sendMessage(
      from,
      {
        text: texto,
        mentions
      },
      { quoted: msg }
    );
  }
}
