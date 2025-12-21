import { downloadMediaMessage } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { exec } from "child_process";

export const command = "s";

async function createStickerFull(buffer) {
  const inputPath = path.join(tmpdir(), `input-${Date.now()}.png`);
  const outputPath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);
  fs.writeFileSync(inputPath, buffer);

  // Escala para que ocupe todo el sticker sin bordes negros, fuerza el tamaño 512x512
  const cmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,setsar=1" -y "${outputPath}"`;

  await new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });

  const resultBuffer = fs.readFileSync(outputPath);
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);

  return resultBuffer;
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const description = args.join(" ") || "Sticker creado con FrikiBot🤖";

  if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
    await sock.sendMessage(from, {
      text: "⚠️ Responde a una imagen o video con .s [texto opcional] para crear un sticker."
    }, { quoted: msg });
    return;
  }

  try {
    const buffer = await downloadMediaMessage(
      { key: { remoteJid: from, id: msg.key.id, fromMe: msg.key.fromMe }, message: quoted },
      "buffer",
      {},
      { logger: console }
    );

    const isVideo = !!quoted.videoMessage;

    if (isVideo) {
      // Videos animados (forzar 512x512 completo)
      const inputPath = path.join(tmpdir(), `input-${Date.now()}.mp4`);
      const outputPath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);
      fs.writeFileSync(inputPath, buffer);

      const ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512,format=rgba,fps=15" -loop 0 -preset default -an -vsync 0 "${outputPath}"`;
      await new Promise((resolve, reject) => exec(ffmpegCmd, (err) => (err ? reject(err) : resolve())));

      const stickerBuffer = fs.readFileSync(outputPath);
      await sock.sendMessage(from, { 
        sticker: stickerBuffer, 
        packname: "FrikiBot 🤖", 
        author: "By José" 
      }, { quoted: msg });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } else {
      // Imagen
      const stickerBuffer = await createStickerFull(buffer);
      await sock.sendMessage(from, { 
        sticker: stickerBuffer, 
        packname: "FrikiBot 🤖", 
        author: "By José" 
      }, { quoted: msg });
    }

  } catch (err) {
    console.error("⚠️ Error al crear el sticker:", err);
    await sock.sendMessage(from, { text: "⚠️ Error al procesar el sticker." }, { quoted: msg });
  }
}
