import fs from "fs";

export const command = "json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Verificar que se proporcionó un nombre de archivo
  if (args.length === 0) {
    return sock.sendMessage(
      from,
      {
        text:
          "❌ *Uso incorrecto*\n\n" +
          "📝 Uso: `.json <nombre>`\n\n" +
          "Ejemplos:\n" +
          "• `.json personajes`\n" +
          "• `.json inventario`\n" +
          "• `.json geosDB`"
      },
      { quoted: msg }
    );
  }

  const nombreArchivo = args[0];
  const rutaArchivo = `./${nombreArchivo}.json`;

  // Verificar si el archivo existe
  if (!fs.existsSync(rutaArchivo)) {
    return sock.sendMessage(
      from,
      {
        text:
          `❌ *Archivo no encontrado*\n\n` +
          `El archivo \`${nombreArchivo}.json\` no existe.\n\n` +
          `Verifica el nombre e intenta de nuevo.`
      },
      { quoted: msg }
    );
  }

  try {
    // Leer el archivo
    const contenido = fs.readFileSync(rutaArchivo, "utf8");
    
    // Intentar parsearlo para validar
    let estaValido = true;
    let errorMsg = "";
    
    try {
      JSON.parse(contenido);
    } catch (error) {
      estaValido = false;
      errorMsg = error.message;
    }

    // Preparar el mensaje
    const estadoJSON = estaValido 
      ? "✅ JSON válido" 
      : `⚠️ JSON inválido: ${errorMsg}`;

    const tamano = (contenido.length / 1024).toFixed(2);
    const lineas = contenido.split('\n').length;

    // Si el contenido es muy largo (más de 10KB), enviarlo como documento
    if (contenido.length > 10000) {
      // Crear archivo temporal
      const tempFile = `/data/data/com.termux/files/home/${nombreArchivo}_export.json`;
      fs.writeFileSync(tempFile, contenido);

      await sock.sendMessage(
        from,
        {
          document: fs.readFileSync(tempFile),
          fileName: `${nombreArchivo}.json`,
          mimetype: "application/json",
          caption:
            `📄 *${nombreArchivo}.json*\n\n` +
            `${estadoJSON}\n` +
            `📊 Tamaño: ${tamano} KB\n` +
            `📝 Líneas: ${lineas}\n\n` +
            `⚠️ Archivo muy grande, enviado como documento.`
        },
        { quoted: msg }
      );

      // Limpiar archivo temporal
      fs.unlinkSync(tempFile);
    } else {
      // Enviar como texto
      await sock.sendMessage(
        from,
        {
          text:
            `📄 *${nombreArchivo}.json*\n` +
            `${estadoJSON}\n` +
            `📊 Tamaño: ${tamano} KB | Líneas: ${lineas}\n\n` +
            `\`\`\`json\n${contenido}\n\`\`\``
        },
        { quoted: msg }
      );
    }

  } catch (error) {
    await sock.sendMessage(
      from,
      {
        text:
          `❌ *Error al leer el archivo*\n\n` +
          `${error.message}\n\n` +
          `Verifica los permisos del archivo.`
      },
      { quoted: msg }
    );
  }
}
