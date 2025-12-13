import fs from "fs";
import yts from "yt-search";
import { exec } from "child_process";

export const command = "musica";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const text = args.join(" ");

  if (!text)
    return sock.sendMessage(from, { 
      text: "⚠️ Escribe el nombre o link de la canción.\nEj: *.musica despacito*" 
    }, { quoted: msg });

  // Detectar si es URL de YouTube
  const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(text);

  let video = null;

  if (isUrl) {
    // Si es URL → buscar info
    const search = await yts({ videoId: text.split("v=")[1] || text.split("/").pop() });
    if (!search)
      return sock.sendMessage(from, { text: "❌ No se pudo obtener información del video." }, { quoted: msg });

    video = search;
  } else {
    // Si es nombre → búsqueda normal
    const { videos } = await yts(text);
    if (!videos || videos.length === 0)
      return sock.sendMessage(from, { text: "❌ No se encontró ningún resultado." }, { quoted: msg });

    video = videos[0];
  }

  const audioPath = `./temp/${Date.now()}.mp3`;

  // Enviar miniatura
  await sock.sendMessage(from, {
    image: { url: video.thumbnail },
    caption: `🎵 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.timestamp}\n\n⏬ Descargando audio...`,
  }, { quoted: msg });

  // Descargar con yt-dlp
  exec(`yt-dlp -x --audio-format mp3 -o "${audioPath}" "${video.url}"`, async (error) => {
    if (error) {
      console.error("Error al descargar con yt-dlp:", error);
      return sock.sendMessage(from, { text: "❌ Error al descargar la música." }, { quoted: msg });
    }

    try {
      const audio = fs.readFileSync(audioPath);

      await sock.sendMessage(from, {
        audio,
        mimetype: "audio/mpeg",
        fileName: `${video.title}.mp3`,
      }, { quoted: msg });

      fs.unlinkSync(audioPath);
    } catch (e) {
      console.error("Error al enviar audio:", e);
      sock.sendMessage(from, { text: "⚠️ Hubo un problema al enviar el audio." }, { quoted: msg });
    }
  });
}
