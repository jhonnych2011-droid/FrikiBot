export const command = 'crearimagen';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const prompt = args.join(' ');

  // 1. Validación: Si no hay prompt
  if (!prompt) {
    return await sock.sendMessage(from, { 
      text: '❌ *Uso incorrecto*\n\n📝 Ejemplo:\n.crearimagen un gato futurista con gafas de sol' 
    });
  }

  // 2. Mensaje de espera
  const waitMsg = await sock.sendMessage(from, { 
    text: '🎨 *Imaginando...*\n\n⏳ Creando tu imagen, espera un momento...' 
  });

  try {
    // 3. Generar la URL de la imagen
    // Usamos encodeURIComponent para que el texto sea válido en una URL
    // Añadimos un seed aleatorio para que siempre genere una imagen nueva aunque el texto sea igual
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=1024&height=1024&nologo=true`;

    // 4. Enviar la imagen
    // La librería (Baileys) descarga y envía automáticamente si le pasas la URL
    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: `🖌️ *Imagen generada con IA*\n\n📝 Pedido: _${prompt}_`
    }, { quoted: msg });

    // Opcional: Borrar el mensaje de "cargando" para limpiar el chat
    await sock.sendMessage(from, { delete: waitMsg.key });

  } catch (err) {
    console.error("Error en comando crearimagen:", err);
    
    await sock.sendMessage(from, {
      text: `❌ *Error al generar*\n\nNo se pudo crear la imagen. Intenta con otro texto.`,
      edit: waitMsg.key
    });
  }
}
