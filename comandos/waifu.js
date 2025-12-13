export const command = 'waifu';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Mensaje de reacción o espera (opcional, es tan rápido que a veces no hace falta)
  // await sock.sendMessage(from, { react: { text: "❤️", key: msg.key } });

  try {
    // 1. Conectamos a la API especializada en waifus
    // Usamos el endpoint 'sfw' (safe) categoría 'waifu' para obtener chicas anime lindas
    const response = await fetch("https://api.waifu.pics/sfw/waifu");
    
    if (!response.ok) throw new Error("Error al conectar con la API de Waifus");

    const data = await response.json();
    
    // 2. Extraemos la URL de la imagen
    const imageUrl = data.url;

    if (!imageUrl) throw new Error("No se encontró imagen");

    // 3. Enviamos la imagen
    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: `Aqui esta tu waifu tilin. 👀`,
      // Opcional: Esto hace que el bot cite el mensaje original
    }, { quoted: msg });

  } catch (err) {
    console.error("Error en comando waifu:", err);
    
    await sock.sendMessage(from, {
      text: `💔 *Error:* No pude traer a la waifu en este momento. Intenta de nuevo.`,
    }, { quoted: msg });
  }
}

