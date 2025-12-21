import fs from 'fs';
import path from 'path';
import yts from 'yt-search';
import { spawn } from 'child_process';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

export const command = 'musica';
export const aliases = ['song', 'audio'];

async function downloadThumbnail(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    return true;
  } catch (error) {
    console.error('Error descargando thumbnail:', error.message);
    return false;
  }
}

async function addMetadata(audioPath, metadata, thumbnailPath) {
  return new Promise((resolve, reject) => {
    const tempOutput = audioPath.replace('.mp3', '_final.mp3');
    
    const command = ffmpeg();
    
    // Input del audio
    command.input(audioPath);
    
    // Input de la imagen si existe
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      command.input(thumbnailPath);
      command.outputOptions([
        '-map', '0:a',
        '-map', '1:0',
        '-c:a', 'copy',
        '-c:v', 'mjpeg',
        '-disposition:v', 'attached_pic'
      ]);
    } else {
      command.outputOptions(['-c:a', 'copy']);
    }
    
    // Metadata
    command.outputOptions([
      '-metadata', `title=${metadata.title}`,
      '-metadata', `artist=${metadata.artist}`,
      '-metadata', `album=${metadata.album || 'YouTube'}`,
      '-id3v2_version', '3'
    ]);

    command
      .on('start', (cmd) => {
        console.log('FFmpeg comando:', cmd);
      })
      .on('end', () => {
        console.log('✅ Metadata agregada correctamente');
        // Reemplazar archivo original
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        fs.renameSync(tempOutput, audioPath);
        resolve();
      })
      .on('error', (err) => {
        console.error('❌ Error en FFmpeg:', err.message);
        // Si falla, continuar sin metadata
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        resolve(); // No rechazar para que continúe el proceso
      })
      .save(tempOutput);
  });
}

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { sendSafe }) {
  const from = msg.key.remoteJid;
  const query = args.join(' ');

  if (!query) {
    return sendSafe(sock, from, {
      text: '🎵 *Envía el nombre de la canción o URL*\n\nEjemplo:\n`.musica Despacito`\n`.musica https://youtu.be/xxx`'
    });
  }

  try {
    let youtubeUrl = query;
    let videoInfo;

    const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(query);

    // Buscar video
    if (!isUrl) {
      const searchRes = await yts(query);
      if (!searchRes.videos?.length) throw new Error('No se encontró la canción');
      videoInfo = searchRes.videos[0];
      youtubeUrl = videoInfo.url;
    } else {
      const searchRes = await yts({ videoId: youtubeUrl });
      videoInfo = searchRes;
    }

    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const timestamp = Date.now();
    const audioPath = path.join(tempDir, `audio_${timestamp}.mp3`);
    const thumbnailPath = path.join(tempDir, `thumb_${timestamp}.jpg`);

    // Descargar thumbnail primero
    const hasThumbnail = await downloadThumbnail(
      videoInfo.thumbnail || videoInfo.image,
      thumbnailPath
    );

    // Mensaje con imagen
    const infoMsg = `🎵 *${videoInfo.title}*
👤 ${videoInfo.author?.name || 'Desconocido'}
⏱️ ${videoInfo.timestamp}
© FrikiBot 🤓

📥 Descargando audio...`;

    if (hasThumbnail) {
      await sendSafe(sock, from, {
        image: fs.readFileSync(thumbnailPath),
        caption: infoMsg
      });
    } else {
      await sendSafe(sock, from, { text: infoMsg });
    }

    // Descargar audio con yt-dlp (sin metadata, la agregamos después)
    await new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio[ext=m4a]/bestaudio',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificate',
        '--no-embed-thumbnail', // No agregar thumbnail aquí
        '--no-embed-metadata',  // No agregar metadata aquí
        '-o', audioPath.replace('.mp3', '.%(ext)s'),
        youtubeUrl
      ]);

      let errorOutput = '';
      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytdlp.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp falló: ${errorOutput}`));
        }
      });
      ytdlp.on('error', reject);
    });

    // Verificar archivo de audio
    if (!fs.existsSync(audioPath)) {
      throw new Error('No se generó el archivo de audio');
    }

    const stats = fs.statSync(audioPath);
    console.log(`📊 Tamaño original: ${(stats.size/1024/1024).toFixed(2)}MB`);

    if (stats.size > 16*1024*1024) {
      fs.unlinkSync(audioPath);
      if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
      return sendSafe(sock, from, { 
        text: `⚠️ El audio es muy grande (${(stats.size/1024/1024).toFixed(1)}MB)\n💡 Límite de WhatsApp: 16MB` 
      });
    }

    // Agregar metadata y portada con FFmpeg
    console.log('🎨 Agregando metadata y portada...');
    await addMetadata(audioPath, {
      title: videoInfo.title,
      artist: videoInfo.author?.name || 'Desconocido',
      album: 'YouTube'
    }, hasThumbnail ? thumbnailPath : null);

    // Verificar tamaño final
    const finalStats = fs.statSync(audioPath);
    console.log(`📊 Tamaño final: ${(finalStats.size/1024/1024).toFixed(2)}MB`);

    // Enviar audio
    console.log('📤 Enviando audio con metadata...');
    await sendSafe(sock, from, {
      audio: fs.readFileSync(audioPath),
      mimetype: 'audio/mpeg',
      fileName: `${videoInfo.title}.mp3`,
      ptt: false
    });

    // Limpiar archivos temporales
    fs.unlinkSync(audioPath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    
    console.log('✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error en .musica:', error);
    return sendSafe(sock, from, { 
      text: `❌ *Error al descargar*\n\n${error.message}\n\n💡 *Intenta con:*\n• Otra canción\n• URL directa de YouTube\n• Verificar que el video exista` 
    });
  }
}
