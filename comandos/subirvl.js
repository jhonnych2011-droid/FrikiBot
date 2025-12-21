import fs from "fs";
import { exec } from "child_process";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

export const command = "subirvl";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const quoted =
    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted)
    return sock.sendMessage(from, { text: "❌ Responde a un audio o video" });

  let porcentaje = args[0];
  if (!porcentaje)
    return sock.sendMessage(from, { text: "❌ Usa: .subirvl 150" });

  porcentaje = parseInt(porcentaje.replace("%", ""));
  if (isNaN(porcentaje))
    return sock.sendMessage(from, { text: "❌ Porcentaje inválido" });

  const isAudio = quoted.audioMessage;
  const isVideo = quoted.videoMessage;

  if (!isAudio && !isVideo)
    return sock.sendMessage(from, { text: "❌ No es audio ni video" });

  const mediaMsg = isVideo ? quoted.videoMessage : quoted.audioMessage;
  const tipo = isVideo ? "video" : "audio";

  // ⬇️ DESCARGA REAL
  const stream = await downloadContentFromMessage(mediaMsg, tipo);
  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  const input = isVideo ? "in.mp4" : "in.mp3";
  const output = isVideo ? "out.mp4" : "out.mp3";

  fs.writeFileSync(input, buffer);

  const volumen = porcentaje / 100;

  exec(
    `ffmpeg -y -i ${input} -filter:a "volume=${volumen}" ${output}`,
    async (err) => {
      if (err) {
        console.error(err);
        return sock.sendMessage(from, { text: "❌ Error al procesar" });
      }

      await sock.sendMessage(from, {
        [tipo]: fs.readFileSync(output),
        mimetype: isVideo ? "video/mp4" : "audio/mpeg",
      });

      fs.unlinkSync(input);
      fs.unlinkSync(output);
    }
  );
}
