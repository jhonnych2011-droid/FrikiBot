// comandos/hd.js
import fs from "fs";
import { PNG } from "pngjs";

export const command = "hd";

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

// Mejora real: contraste suave + enfoque (sharpen)
function mejorarImagen(png) {
  const w = png.width;
  const h = png.height;
  const src = Buffer.from(png.data);
  const dst = png.data;

  // ---------- CONTRASTE SUAVE ----------
  const contrast = 1.12; // NO subir más
  const brightness = 4;

  for (let i = 0; i < dst.length; i += 4) {
    dst[i]     = clamp((dst[i]     - 128) * contrast + 128 + brightness);
    dst[i + 1] = clamp((dst[i + 1] - 128) * contrast + 128 + brightness);
    dst[i + 2] = clamp((dst[i + 2] - 128) * contrast + 128 + brightness);
  }

  // ---------- SHARPEN REAL ----------
  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;
      let k = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          r += src[idx]     * kernel[k];
          g += src[idx + 1] * kernel[k];
          b += src[idx + 2] * kernel[k];
          k++;
        }
      }

      const i = (y * w + x) * 4;
      dst[i]     = clamp(r);
      dst[i + 1] = clamp(g);
      dst[i + 2] = clamp(b);
    }
  }

  return png;
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted?.imageMessage)
    return sock.sendMessage(from, {
      text: "📸 Responde a una *imagen* con `.hd`"
    }, { quoted: msg });

  const buffer = await sock.downloadMediaMessage({
    message: quoted,
    key: msg.key
  });

  const png = PNG.sync.read(buffer);
  const mejorada = mejorarImagen(png);
  const output = PNG.sync.write(mejorada);

  await sock.sendMessage(from, {
    image: output,
    caption: "✨ HD aplicado (PNGJS)"
  }, { quoted: msg });
}
