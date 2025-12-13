// comandos/comando.js
import fs from "fs";
import path from "path";

export const command = "comando";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." }, { quoted: msg });
  }

  if (!args.length) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .comando <nombre del comando>" }, { quoted: msg });
  }

  const nombreCmd = args[0].toLowerCase();
  const comandosDir = "./comandos";
  const archivoPath = path.join(comandosDir, `${nombreCmd}.js`);

  if (!fs.existsSync(archivoPath)) {
    return sock.sendMessage(from, { text: `❌ No se encontró el comando "${nombreCmd}".` }, { quoted: msg });
  }

  try {
    const buffer = fs.readFileSync(archivoPath);
    const nombreTxt = `${nombreCmd}.txt`;

    await sock.sendMessage(from, {
      document: buffer,
      mimetype: "text/plain",
      fileName: nombreTxt
    }, { quoted: msg });

  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: "❌ Error al enviar el archivo." }, { quoted: msg });
  }
}
