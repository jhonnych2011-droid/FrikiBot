// comandos/video.js
import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import { spawn } from 'child_process';

export const command = 'video';
export const aliases = ['play','yt'];

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { sendSafe }) {
  const from = msg.key.remoteJid;
  const query = args.join(' ');

  if (!query) {
    return sendSafe(sock, from, {
      text: '🎬 Envía el nombre del video o URL\nEj: `.video Te Amo Helluva Boss`'
    });
  }

  // Reacción inmediata
  await sendSafe(sock, from, { react: { text: '🎬', key: msg.key } });

  try {
    let youtubeUrl = query;
    let videoInfo;

    const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(query);

    if (!isUrl) {
      const searchRes = await yts(query);
      if (!searchRes.videos?.length) throw new Error('No se encontró video');
      videoInfo = searchRes.videos[0];
      youtubeUrl = videoInfo.url;
    } else {
      const searchRes = await yts(youtubeUrl);
      if (!searchRes.videos?.length) throw new Error('No se encontró video');
      videoInfo = searchRes.videos[0];
    }

    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const timestamp = Date.now();
    const videoPath = path.join(tempDir, `video_${timestamp}.mp4`);

    // Descargar video
    await new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
        '--merge-output-format', 'mp4',
        '--no-warnings',
        '-o', videoPath,
        youtubeUrl
      ]);

      ytdlp.on('close', code => code === 0 ? resolve() : reject(new Error('yt-dlp falló')));
      ytdlp.on('error', reject);
    });

    // Verificar límite WhatsApp (100MB)
    const stats = fs.statSync(videoPath);
    if (stats.size > 100*1024*1024) {
      fs.unlinkSync(videoPath);
      return sendSafe(sock, from, { text: `⚠️ El video es demasiado grande (${(stats.size/1024/1024).toFixed(1)}MB)\nLímite WhatsApp: 100MB` });
    }

    // Caption personalizado
    const caption = 
`🎬 ${videoInfo.title}
👤 ${videoInfo.author.name}
⏱️ ${videoInfo.timestamp}
📦 ${(stats.size/1024/1024).toFixed(2)} MB
©FrikiBot`;

    // Enviar video
    await sendSafe(sock, from, {
      video: fs.readFileSync(videoPath),
      mimetype: 'video/mp4',
      caption
    });

    // Limpiar
    fs.unlinkSync(videoPath);

  } catch (error) {
    console.error('Error en .video:', error);
    return sendSafe(sock, from, { text: `❌ Error: ${error.message || 'No definido'}` });
  }
}
