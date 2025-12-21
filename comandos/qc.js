import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { exec } from "child_process";

export const command = "qc";

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  if (!args.length) {
    return sock.sendMessage(from, {
      text: "⚠️ Uso: .qc <mensaje>"
    }, { quoted: msg });
  }

  const texto = args.join(" ").slice(0, 80);
  const nombre = msg.pushName || "Usuario";

  const imgPath = path.join(tmpdir(), `qc-${Date.now()}.png`);
  const webpPath = path.join(tmpdir(), `qc-${Date.now()}.webp`);

  try {
    // 1️⃣ Crear imagen tipo quote
    const drawCmd = `
ffmpeg -f lavfi -i color=c=black:s=512x512:d=1 \
-vf "drawbox=x=30:y=40:w=452:h=180:color=white@0.08:t=fill,
drawtext=fontfile=/system/fonts/Roboto-Regular.ttf:
text='${nombre}':
fontcolor=white:fontsize=32:x=50:y=60,
drawtext=fontfile=/system/fonts/Roboto-Regular.ttf:
text='${texto.replace(/'/g, "\\'")}':
fontcolor=white:fontsize=26:x=50:y=110:line_spacing=8" \
-y "${imgPath}"
`;
    await execPromise(drawCmd);

    // 2️⃣ Convertir a sticker (MISMO estilo que tu .s)
    const stickerCmd = `
ffmpeg -i "${imgPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,setsar=1" \
-y "${webpPath}"
`;
    await execPromise(stickerCmd);

    const stickerBuffer = fs.readFileSync(webpPath);

    // 3️⃣ Enviar sticker
    await sock.sendMessage(from, {
      sticker: stickerBuffer,
      packname: "FrikiBot 🤓",
      author: "By José"
    }, { quoted: msg });

  } catch (e) {
    console.error("Error QC:", e);
    await sock.sendMessage(from, {
      text: "⚠️ Error al crear el QC"
    }, { quoted: msg });
  } finally {
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
  }
}
