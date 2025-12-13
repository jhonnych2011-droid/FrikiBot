// comando: backup
import fs from "fs";
import path from "path";
import archiver from "archiver";

export const command = "backup";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Cargar owners.json
  let owners = [];
  if (fs.existsSync("./owners.json")) {
    owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
  }

  if (!owners.includes(sender)) {
    return await sock.sendMessage(from, { text: "❌ Solo el owner puede usar este comando." });
  }

  const zipName = "backup_bot.zip";
  const output = fs.createWriteStream(zipName);

  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", async () => {
    await sock.sendMessage(from, {
      document: fs.readFileSync(zipName),
      fileName: zipName,
      mimetype: "application/zip",
      caption: "📦 Backup completo del bot ✓"
    });

    fs.unlinkSync(zipName); // borrar archivo después
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  // 🔥 Agrega TODO el bot excepto node_modules (porque pesa)
  archive.glob("**/*", {
    ignore: ["node_modules/**", zipName]
  });

  archive.finalize();
}
