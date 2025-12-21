import { exec } from "child_process";
import fs from "fs";

export const command = "ig";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const url = args[0];

  if (!url || !url.includes("instagram.com")) {
    return sock.sendMessage(from, { 
      text: "❌ Debes enviar un enlace válido de Instagram." 
    }, { quoted: msg });
  }

  await sock.sendMessage(from, { 
    text: "⏳ Descargando video de Instagram..." 
  }, { quoted: msg });

  const filePath = `./tempig_${Date.now()}.mp4`;

  // Descargar con yt-dlp (funciona también con Instagram)
  exec(`yt-dlp -f mp4 -o "${filePath}" "${url}"`, async (err) => {
    if (err) {
      return sock.sendMessage(from, { 
        text: "❌ Error al descargar el video. Verifica que el enlace sea correcto y el contenido sea público." 
      }, { quoted: msg });
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return sock.sendMessage(from, { 
        text: "❌ No se pudo descargar el video." 
      }, { quoted: msg });
    }

    // Obtener información del post
    exec(`yt-dlp --get-title "${url}"`, async (err2, stdout) => {
      const title = err2 ? "Video de Instagram" : stdout.trim();

      try {
        // Enviar video
        await sock.sendMessage(from, {
          video: fs.readFileSync(filePath),
          caption: `📸 ${title}\n\n_Descargado desde Instagram_`
        }, { quoted: msg });

        // Borrar archivo temporal
        fs.unlinkSync(filePath);
      } catch (sendErr) {
        fs.unlinkSync(filePath);
        return sock.sendMessage(from, { 
          text: "❌ Error al enviar el video." 
        }, { quoted: msg });
      }
    });
  });
}
