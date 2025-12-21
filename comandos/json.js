import fs from "fs";

export const command = "json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json para verificar permisos
const ownersPath = "./owners.json";
let owners = [];
try {
  owners = JSON.parse(fs.readFileSync(ownersPath, "utf8"));
} catch (e) {
  owners = [];
}

function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (args.length === 0) {
    return sock.sendMessage(
      from,
      {
        text: "❌ *Uso incorrecto*\n\n" +
              "📝 Uso: `.json <nombre>`\n\n" +
              "Ejemplos:\n" +
              "• `.json personajes`\n" +
              "• `.json inventario`\n" +
              "• `.json geos`"
      },
      { quoted: msg }
    );
  }

  const nombreArchivo = args[0];

  // Lista de archivos permitidos (seguridad)
  const archivosPermitidos = [
    "geos", "drops", "owners", "banlist", "config", 
    "vip", "impuesto", "comandos", "alerta",
    "personajes", "inventario", "usuarios", "stats"
  ];

  // Verificar permisos
  if (!esOwner(sender)) {
    const archivosPublicos = ["geos", "drops", "vip", "stats"];
    if (!archivosPublicos.includes(nombreArchivo)) {
      return sock.sendMessage(
        from,
        {
          text: "❌ *Acceso denegado*\n\n" +
                "Solo los owners pueden ver este archivo JSON.\n" +
                "Archivos públicos disponibles: geos, drops, vip, stats"
        },
        { quoted: msg }
      );
    }
  }

  // Buscar archivo con diferentes extensiones
  const extensiones = ['.json', '.txt'];
  let rutaArchivo = null;

  for (const ext of extensiones) {
    const rutaLocal = `./${nombreArchivo}${ext}`;
    const rutaData = `./bot/data/${nombreArchivo}${ext}`;

    if (fs.existsSync(rutaLocal)) {
      rutaArchivo = rutaLocal;
      break;
    } else if (fs.existsSync(rutaData)) {
      rutaArchivo = rutaData;
      break;
    }
  }

  if (!rutaArchivo) {
    return sock.sendMessage(
      from,
      {
        text: `❌ *Archivo no encontrado*\n\n` +
              `El archivo \`${nombreArchivo}.json\` o \`${nombreArchivo}.txt\` no existe.\n\n` +
              `Archivos disponibles:\n` +
              `${archivosPermitidos.map(a => `• ${a}`).join('\n')}`
      },
      { quoted: msg }
    );
  }

  try {
    const buffer = fs.readFileSync(rutaArchivo);
    const extension = rutaArchivo.split('.').pop().toLowerCase();

    // Para archivos TXT: siempre enviar como documento
    if (extension === 'txt') {
      const nombreDocumento = `${nombreArchivo}_${Date.now()}.txt`;
      await sock.sendMessage(
        from,
        {
          document: buffer,
          fileName: nombreDocumento,
          mimetype: "text/plain; charset=utf-8",
          caption: `📄 *${nombreArchivo}.txt*\n📦 Enviado como documento`
        },
        { quoted: msg }
      );
      return;
    }

    // Para JSON
    const contenido = buffer.toString("utf8");
    let esJSONValido = true;
    let errorValidacion = "";

    try {
      JSON.parse(contenido);
    } catch (error) {
      esJSONValido = false;
      errorValidacion = error.message;
    }

    const tamanoKB = (buffer.length / 1024).toFixed(2);
    const lineas = contenido.split('\n').length;
    const caracteres = contenido.length;

    const infoArchivo = 
      `📄 *${nombreArchivo}.json*\n` +
      `${esJSONValido ? '✅ JSON válido' : '⚠️ JSON inválido'}\n` +
      `📊 Tamaño: ${tamanoKB} KB\n` +
      `📝 Líneas: ${lineas} | Caracteres: ${caracteres}\n\n`;

    if (!esJSONValido) {
      return await sock.sendMessage(
        from,
        { text: infoArchivo + `❌ Error de sintaxis:\n\`\`\`\n${errorValidacion}\n\`\`\`` },
        { quoted: msg }
      );
    }

    // Enviar JSON según tamaño
    if (buffer.length > 5000) { // >5 KB, enviar como documento completo
      const nombreDocumento = `${nombreArchivo}_${Date.now()}.json`;
      await sock.sendMessage(
        from,
        {
          document: buffer,
          fileName: nombreDocumento,
          mimetype: "application/json; charset=utf-8",
          caption: infoArchivo + "📦 Enviado como documento (completo)"
        },
        { quoted: msg }
      );
    } else {
      // JSON pequeño, enviar como texto
      const jsonData = JSON.parse(contenido);
      const jsonFormateado = JSON.stringify(jsonData, null, 2);
      await sock.sendMessage(
        from,
        {
          text: infoArchivo + `\`\`\`json\n${jsonFormateado}\n\`\`\``
        },
        { quoted: msg }
      );
    }

  } catch (error) {
    console.error("Error en comando json:", error);

    try {
      const contenido = fs.readFileSync(rutaArchivo, "utf8");
      await sock.sendMessage(
        from,
        {
          text: `📄 *${nombreArchivo}*\n\n⚠️ No se pudo procesar como JSON\n\n📝 Contenido crudo:\n\`\`\`\n${contenido.substring(0, 1000)}\n\`\`\``
        },
        { quoted: msg }
      );
    } catch (error2) {
      await sock.sendMessage(
        from,
        {
          text: `❌ *Error crítico*\n\nNo se pudo leer el archivo:\n${error.message}\n\nVerifica permisos y que el archivo exista.`
        },
        { quoted: msg }
      );
    }
  }
}
