// comandos/backupfull.js
import fs from "fs";
import archiver from "archiver";

export const command = "backupfull";

function normalizarId(id) {
  if (!id) return null;
  return id.replace(/(@.+)/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(normalizarId);

  // SOLO OWNERS
  if (!owners.includes(sender))
    return sock.sendMessage(from, { text: "❌ No eres Owner, no puedes usar este comando." });

  const zipPath = "./backup_total.zip";

  await sock.sendMessage(from, { text: "📦 Creando *backup TOTAL* del bot...\nEsto puede tardar un poco." });

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);

  // Agrega TODAS las carpetas principales
  const carpetas = [
    "./comandos",
    "./bot",
    "./node_modules",
    "./session",
  ];

  carpetas.forEach(dir => {
    if (fs.existsSync(dir)) archive.directory(dir, dir.replace("./", ""));
  });

  // Agregar archivos raíz importantes
  const archivos = fs.readdirSync("./");
  archivos.forEach(file => {
    if (fs.lstatSync(file).isFile()) {
      archive.file(file, { name: file });
    }
  });

  await archive.finalize();

  output.on("close", async () => {
    await sock.sendMessage(from, {
      document: fs.readFileSync(zipPath),
      fileName: "backup_total_bot.zip",
      mimetype: "application/zip"
    });

    fs.unlinkSync(zipPath); // Eliminamos el ZIP después de enviarlo
  });
}
