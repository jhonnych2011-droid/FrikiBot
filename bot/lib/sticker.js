// lib/sticker.js
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { Sticker, createSticker, StickerTypes } from 'wa-sticker-formatter';

/**
 * Escribe los metadatos EXIF a una imagen .webp para usar como sticker personalizado.
 * @param {Buffer} imageBuffer - Imagen en formato WebP.
 * @param {Object} metadata - Metadatos del sticker.
 * @param {string} metadata.packname - Nombre del paquete del sticker.
 * @param {string} metadata.author - Autor del sticker.
 * @param {string} metadata.description - Descripción opcional.
 * @returns {Promise<Buffer>} Sticker con metadatos EXIF aplicados.
 */
export async function writeExifImg(imageBuffer, metadata = {}) {
  const { packname = 'BotDrio🗣️🔥', author = 'by Joporno', description = '' } = metadata;

  try {
    const sticker = new Sticker(imageBuffer, {
      pack: packname,
      author,
      type: StickerTypes.FULL,
      categories: ['🤖', '🔥'],
      id: Date.now().toString(),
      quality: 100,
      background: 'transparent'
    });

    const stickerBuffer = await sticker.toBuffer();
    return stickerBuffer;
  } catch (err) {
    console.error('❌ Error al escribir EXIF:', err);
    throw err;
  }
}

/**
 * Convierte un archivo multimedia en sticker WebP con metadatos.
 * @param {string} inputPath - Ruta del archivo de entrada.
 * @param {string} outputPath - Ruta de salida del sticker.
 * @param {boolean} isVideo - Si es video o imagen.
 * @param {Object} metadata - Datos del sticker.
 * @returns {Promise<Buffer>} Sticker WebP final.
 */
export async function createStickerFromMedia(inputPath, outputPath, isVideo, metadata = {}) {
  return new Promise((resolve, reject) => {
    const ffmpegCmd = isVideo
      ? `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba" -loop 0 -an -vsync 0 "${outputPath}"`
      : `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba" -loop 0 -an -vsync 0 "${outputPath}"`;

    exec(ffmpegCmd, async (err) => {
      if (err) {
        console.error('❌ Error en FFmpeg:', err);
        return reject(err);
      }

      try {
        const buffer = fs.readFileSync(outputPath);
        const finalSticker = await writeExifImg(buffer, metadata);
        resolve(finalSticker);
      } catch (error) {
        reject(error);
      } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    });
  });
}
