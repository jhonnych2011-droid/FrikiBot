// comandos/gif.js
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

export const command = 'gif';

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { sendSafe }) {
  const from = msg.key.remoteJid;

  try {
    // ─── 1️⃣ Verificar que el mensaje contenga video ───
    const videoMsg = msg.message?.videoMessage;
    if (!videoMsg) {
      return await sendSafe(sock, from, {
        text: '❌ *Error*\n\nDebes enviar un video junto con el comando `.gif`.\n📝 Uso: Envía un video y en el mismo mensaje escribe `.gif`'
      });
    }

    // ─── 2️⃣ Mensaje de procesamiento ───
    await sendSafe(sock, from, {
      text: '⏳ *Procesando video...*\nConvirtiendo a GIF, esto puede tardar unos segundos...'
    });

    // ─── 3️⃣ Descargar video ───
    const videoBuffer = await downloadMediaMessage({ videoMessage: videoMsg }, 'buffer');
    if (!videoBuffer) {
      return await sendSafe(sock, from, { text: '❌ No se pudo descargar el video.' });
    }

    // ─── 4️⃣ Guardar video temporalmente ───
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const timestamp = Date.now();
    const videoPath = path.join(tempDir, `video_${timestamp}.mp4`);
    const gifPath = path.join(tempDir, `gif_${timestamp}.mp4`);
    fs.writeFileSync(videoPath, videoBuffer);

    // ─── 5️⃣ Convertir a GIF con FFmpeg ───
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-t', '6', // máximo 6 segundos
        '-vf', 'scale=512:-1:flags=lanczos,fps=15', // ancho 512px, fps 15
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        gifPath
      ]);

      ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error('FFmpeg falló'))));
      ffmpeg.on('error', reject);
    });

    if (!fs.existsSync(gifPath)) throw new Error('No se pudo crear el GIF');

    const gifBuffer = fs.readFileSync(gifPath);

    // ─── 6️⃣ Enviar GIF ───
    await sendSafe(sock, from, {
      video: gifBuffer,
      gifPlayback: true,
      caption: '✅ *GIF Creado*\n🎬 Máximo 6 segundos\n📏 Optimizado para WhatsApp'
    });

    // ─── 7️⃣ Limpiar archivos temporales ───
    fs.unlinkSync(videoPath);
    fs.unlinkSync(gifPath);

  } catch (error) {
    console.error('Error en comando gif:', error);

    if (error.message.includes('ffmpeg')) {
      return await sendSafe(sock, from, {
        text: '❌ *FFmpeg no está instalado*\n\nPara usar este comando instala FFmpeg:\n🐧 Linux: `sudo apt install ffmpeg`\n🍎 Mac: `brew install ffmpeg`\n🪟 Windows: descárgalo desde ffmpeg.org'
      });
    }

    return await sendSafe(sock, from, {
      text: `❌ Ocurrió un error al procesar el video.\n\nDetalles: ${error.message}`
    });
  }
}
