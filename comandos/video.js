import { exec } from "child_process";
import fs from "fs";

export const command = "video";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const url = args[0];

  if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
    return sock.sendMessage(from, { text: "❌ Debes enviar un enlace válido de YouTube." }, { quoted: msg });
  }

  const filePath = `./tempvideo_${Date.now()}.mp4`;

  // Descargar con yt-dlp
  exec(`yt-dlp -f mp4 -o "${filePath}" "${url}"`, async (err) => {
    if (err) return sock.sendMessage(from, { text: "❌ Error al descargar el video." }, { quoted: msg });

    // Leer info del título
    exec(`yt-dlp --get-title "${url}"`, async (err2, stdout) => {
      const title = err2 ? "Video" : stdout.trim();

      // Enviar video
      await sock.sendMessage(from, {
        video: fs.readFileSync(filePath),
        caption: `🎬 ${title}`
      }, { quoted: msg });

      // Borrar temporal
      fs.unlinkSync(filePath);
    });
  });
}
