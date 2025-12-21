import axios from "axios";
import fs from "fs";
import path from "path";

export const command = "apk";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (!args[0]) {
    return sock.sendMessage(from, {
      text: "❌ Uso: .apk <link_mediafire>"
    });
  }

  const url = args[0];
  const filePath = path.join(process.cwd(), "temp.apk");

  try {
    await sock.sendMessage(from, { text: "⬇️ Descargando APK..." });

    const response = await axios({
      method: "GET",
      url,
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await sock.sendMessage(from, {
      document: fs.readFileSync(filePath),
      mimetype: "application/vnd.android.package-archive",
      fileName: "app.apk"
    });

    fs.unlinkSync(filePath);

  } catch (e) {
    console.error(e);
    await sock.sendMessage(from, {
      text: "❌ Error al descargar o enviar el APK."
    });
  }
}
