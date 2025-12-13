// comandos/imgtiktok.js
export const command = "imgtiktok";

import fetch from "node-fetch";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const url = args[0];
  const numeroImagen = parseInt(args[1]);

  if (!url) {
    return sock.sendMessage(from, {
      text: "❌ Debes enviar un link de TikTok con imágenes.\nEj: .imgtiktok https://www.tiktok.com/... 1"
    }, { quoted: msg });
  }

  if (!numeroImagen || numeroImagen < 1) {
    return sock.sendMessage(from, {
      text: "❌ Debes especificar el número de imagen (empezando desde 1).\nEj: .imgtiktok <url> 3"
    }, { quoted: msg });
  }

  try {
    // Enviar mensaje de espera
    await sock.sendMessage(from, {
      text: "⏳ Descargando imagen de TikTok..."
    }, { quoted: msg });

    const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    const data = await res.json();

    if (!data.data) {
      console.log("DATA ERROR:", data);
      return sock.sendMessage(from, { 
        text: "❌ No se pudo obtener el contenido. Verifica que el link sea válido." 
      }, { quoted: msg });
    }

    // Verificar si tiene imágenes
    if (!data.data.images || data.data.images.length === 0) {
      return sock.sendMessage(from, { 
        text: "❌ Este TikTok no contiene imágenes. Usa .tiktok para descargar videos." 
      }, { quoted: msg });
    }

    const imagenes = data.data.images;
    const totalImagenes = imagenes.length;

    // Verificar que el número de imagen esté en el rango
    if (numeroImagen > totalImagenes) {
      return sock.sendMessage(from, { 
        text: `❌ Este TikTok solo tiene ${totalImagenes} imagen${totalImagenes > 1 ? 'es' : ''}.\nElige un número entre 1 y ${totalImagenes}.` 
      }, { quoted: msg });
    }

    // Obtener la imagen seleccionada (restar 1 porque el array empieza en 0)
    const imagenUrl = imagenes[numeroImagen - 1];

    // Enviar la imagen sin marca de agua
    await sock.sendMessage(from, {
      image: { url: imagenUrl },
      caption: `🖼️ *IMAGEN DE TIKTOK*\n\n📊 Imagen ${numeroImagen} de ${totalImagenes}`
    }, { quoted: msg });

  } catch (e) {
    console.log("❌ ERROR:", e);
    return sock.sendMessage(from, {
      text: `❌ Error al descargar la imagen.\nDetalle: ${e.message}`
    }, { quoted: msg });
  }
}
