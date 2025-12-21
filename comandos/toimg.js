import { downloadMediaMessage } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { exec } from "child_process";

export const command = "toimg";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted || !quoted.stickerMessage) {
    return sock.sendMessage(from, {
      text: "❌ Responde a un *sticker* con .toimg"
    }, { quoted: msg });
  }

  try {
    // Descargar el sticker original SIN recomprimir
    const buffer = await downloadMediaMessage(
      { key: msg.key, message: quoted },
      "buffer",
      {},
      { logger: console }
    );

    const inputPath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);
    const outputPath = path.join(tmpdir(), `imagen-${Date.now()}.png`);

    fs.writeFileSync(inputPath, buffer);

    // Convertir SIN perder calidad (PNG mantiene todo)
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vcodec png -y "${outputPath}"`;

    exec(ffmpegCmd, async (err) => {
      if (err) {
        console.error(err);
        return sock.sendMessage(from, { text: "❌ Error al convertir el sticker." }, { quoted: msg });
      }

      const img = fs.readFileSync(outputPath);

      await sock.sendMessage(from, {
        image: img,
        caption: "Aqui esta tu imagen tilin"
      }, { quoted: msg });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });

  } catch (error) {
    console.error(error);
    return sock.sendMessage(from, { text: "❌ No pude procesar el sticker." }, { quoted: msg });
  }
}
