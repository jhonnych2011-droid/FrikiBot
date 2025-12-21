// comandos/tiktok.js
export const command = "tiktok";

import fetch from "node-fetch";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const url = args[0];

  if (!url) {
    return sock.sendMessage(from, {
      text: "❌ Debes enviar un link de TikTok.\nEj: .tiktok https://www.tiktok.com/..."
    }, { quoted: msg });
  }

  try {
    const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    const data = await res.json();

    if (!data.data || !data.data.play) {
      console.log("DATA ERROR:", data);
      return sock.sendMessage(from, { text: "❌ No se pudo obtener el video." }, { quoted: msg });
    }

    const video = data.data.play; // sin marca de agua

    await sock.sendMessage(from, {
      video: { url: video },
      caption: "🎬 *Aquí tienes tu video tilin.*"
    }, { quoted: msg });

  } catch (e) {
    console.log("❌ ERROR:", e);
    return sock.sendMessage(from, {
      text: `❌ Error al descargar.\nDetalle: ${e.message}`
    }, { quoted: msg });
  }
}
