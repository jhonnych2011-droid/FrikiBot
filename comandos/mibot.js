// comandos/mibot.js
import fs from "fs";
import archiver from "archiver";

export const command = "mibot";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // ==============================
  // Verificar owners
  // ==============================
  let owners = [];
  try {
    owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
  } catch (e) {
    return sock.sendMessage(from, { text: "❌ Error leyendo owners.json" });
  }

  if (!owners.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });
  }

  // ==============================
  // Asegurar que los JSON existan
  // ==============================
  const jsonFiles = ["geos.json", "vip.json", "owners.json", "drops.json"];
  jsonFiles.forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 2));
  });

  // ==============================
  // Aviso inicial
  // ==============================
  await sock.sendMessage(from, { text: "📦 Creando backup del bot, espera..." });

  const zipName = "mibot_backup.zip";
  const output = fs.createWriteStream(zipName);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", async () => {
    await sock.sendMessage(from, { text: "✅ Backup listo, enviando archivo..." });

    // Enviar archivo
    await sock.sendMessage(from, {
      document: fs.readFileSync(zipName),
      fileName: zipName,
      mimetype: "application/zip",
      caption: "📦 Backup del bot completo (sin node_modules) enviado."
    });

    fs.unlinkSync(zipName);
    await sock.sendMessage(from, { text: "🧹 Backup eliminado del servidor." });
  });

  archive.on("error", async (err) => {
    await sock.sendMessage(from, { text: "❌ Error creando ZIP: " + err.message });
  });

  archive.pipe(output);

  // ==============================
  // Incluir carpetas importantes
  // ==============================
  const carpetas = ["comandos", "bot", "bot/data"];
  carpetas.forEach(dir => {
    if (fs.existsSync(dir)) archive.directory(dir, dir.replace("./", ""));
  });

  // ==============================
  // Archivos raíz importantes
  // ==============================
  const archivos = ["bot.js", "package.json", "geos.json", "vip.json", "owners.json", "drops.json"];
  archivos.forEach(file => {
    if (fs.existsSync(file)) archive.file(file, { name: file });
  });

  await archive.finalize();
}
