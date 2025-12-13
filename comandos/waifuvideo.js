export const command = 'waifuvideo'; 

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const commandName = 'waifuvid';

  try {
    console.log(`[${commandName}] - 1. Iniciando comando para ${from}`);

    // --- 1. Obtener la URL del GIF/Video NSFW de la API ---
    const apiUrl = "https://api.waifu.pics/nsfw/blowjob";
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
        throw new Error(`Error con la API: ${apiResponse.statusText}`);
    }

    const data = await apiResponse.json();
    const videoUrl = data.url; 
    
    console.log(`[${commandName}] - 2. URL obtenida: ${videoUrl}`);

    if (!videoUrl) {
        throw new Error("No se encontró video/GIF en la respuesta de la API");
    }

    // --- 2. DESCARGAR el archivo multimedia en un Buffer ---
    console.log(`[${commandName}] - 3. Intentando descargar el archivo desde ${videoUrl}`);
    const mediaResponse = await fetch(videoUrl);

    if (!mediaResponse.ok) {
        console.error(`[${commandName}] - ERROR en descarga: ${mediaResponse.statusText}`);
        throw new Error(`Error al descargar el archivo: ${mediaResponse.statusText}`);
    }
    
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const mediaBuffer = Buffer.from(arrayBuffer);
    
    console.log(`[${commandName}] - 4. Archivo descargado. Tamaño del Buffer: ${mediaBuffer.length} bytes.`);

    // Determinar el tipo MIME
    const mimeType = mediaResponse.headers.get('content-type') || 'video/mp4';
    
    // --- 3. Enviar como VIDEO/GIF con parámetros forzados ---
    console.log(`[${commandName}] - 5. Enviando mensaje como VIDEO/GIF...`);
    
    // Usamos el objeto de video con el Buffer y forzamos el tipo MIME.
    await sock.sendMessage(from, {
      video: mediaBuffer, 
      caption: `🔞 *¡Video NSFW solicitado!* (Categoría: Blowjob)`,
      mimetype: 'video/mp4', // <--- IMPORTANTE: Forzar a video/mp4 (ya que WhatsApp trata los GIFs como MP4 en el envío)
      gifPlayback: true // Mantener la bandera GIF
    }, { quoted: msg });

    console.log(`[${commandName}] - 6. Mensaje enviado con éxito.`);

  } catch (err) {
    console.error(`[${commandName}] - ERROR CRÍTICO CAPTURADO:`, err.message, err);
    await sock.sendMessage(from, { text: "❌ Error al buscar o enviar el video/GIF. Inténtalo de nuevo." }, { quoted: msg });
  }
}

