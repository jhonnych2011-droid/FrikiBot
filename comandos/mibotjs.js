// comandos/mibotjs.js
import fs from "fs";
import path from "path";

export const command = "mibotjs";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Función recursiva para buscar archivos .js
function buscarArchivoJS(dir, nombreArchivo, resultados = []) {
  try {
    const archivos = fs.readdirSync(dir);
    
    for (const archivo of archivos) {
      const rutaCompleta = path.join(dir, archivo);
      const stat = fs.statSync(rutaCompleta);
      
      // Ignorar node_modules y carpetas ocultas
      if (stat.isDirectory()) {
        if (archivo !== "node_modules" && !archivo.startsWith(".")) {
          buscarArchivoJS(rutaCompleta, nombreArchivo, resultados);
        }
      } else if (stat.isFile()) {
        // Buscar por nombre exacto o con extensión
        const nombreSinExt = archivo.replace(/\.js$/, "");
        const busquedaSinExt = nombreArchivo.replace(/\.js$/, "");
        
        if (archivo === nombreArchivo || 
            nombreSinExt === busquedaSinExt || 
            archivo === `${nombreArchivo}.js`) {
          resultados.push(rutaCompleta);
        }
      }
    }
  } catch (e) {
    // Ignorar errores de permisos
  }
  
  return resultados;
}

// Almacenamiento temporal de búsquedas pendientes
const busquedasPendientes = new Map();

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // ==============================
  // Verificar owners
  // ==============================
  let owners = [];
  try {
    owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
  } catch (e) {
    return sock.sendMessage(from, { text: "❌ Error leyendo owners.json" });
  }

  if (!owners.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." });
  }

  // ==============================
  // Validar argumentos
  // ==============================
  if (!args || args.length === 0) {
    return sock.sendMessage(from, { 
      text: "⚠️ Uso: .mibotjs <nombre del archivo>\n\nEjemplo:\n.mibotjs bot\n.mibotjs bot.js\n.mibotjs mibot\n\nSi hay múltiples archivos, usa:\n.mibotjs <nombre> <número>" 
    });
  }

  // Verificar si hay una búsqueda pendiente y el usuario está seleccionando
  const busquedaKey = `${sender}_${from}`;
  const ultimaBusqueda = busquedasPendientes.get(busquedaKey);
  
  // Si el último argumento es un número y hay una búsqueda pendiente
  const ultimoArg = args[args.length - 1];
  if (ultimaBusqueda && /^\d+$/.test(ultimoArg)) {
    const numeroSeleccion = parseInt(ultimoArg);
    const nombreBuscado = args.slice(0, -1).join(" ");
    
    // Verificar que el nombre coincida con la búsqueda anterior
    if (nombreBuscado === ultimaBusqueda.nombreArchivo) {
      if (numeroSeleccion >= 1 && numeroSeleccion <= ultimaBusqueda.resultados.length) {
        const archivoSeleccionado = ultimaBusqueda.resultados[numeroSeleccion - 1];
        
        // Limpiar búsqueda pendiente
        busquedasPendientes.delete(busquedaKey);
        
        // Enviar el archivo seleccionado
        return await enviarArchivo(sock, from, archivoSeleccionado);
      } else {
        return sock.sendMessage(from, { 
          text: `❌ Número inválido. Selecciona entre 1 y ${ultimaBusqueda.resultados.length}` 
        });
      }
    }
  }

  const nombreArchivo = args.join(" ");
  
  await sock.sendMessage(from, { 
    text: `🔍 Buscando "${nombreArchivo}" en todo el proyecto...` 
  });

  // ==============================
  // Buscar archivo
  // ==============================
  const resultados = buscarArchivoJS("./", nombreArchivo);

  if (resultados.length === 0) {
    return sock.sendMessage(from, { 
      text: `❌ No se encontró ningún archivo con el nombre "${nombreArchivo}"\n\n💡 Asegúrate de escribir el nombre correctamente.` 
    });
  }

  // Si hay múltiples resultados, guardar y mostrar opciones
  if (resultados.length > 1) {
    // Guardar búsqueda con timeout de 5 minutos
    busquedasPendientes.set(busquedaKey, {
      nombreArchivo: nombreArchivo,
      resultados: resultados,
      timestamp: Date.now()
    });
    
    // Limpiar después de 5 minutos
    setTimeout(() => {
      const busqueda = busquedasPendientes.get(busquedaKey);
      if (busqueda && Date.now() - busqueda.timestamp >= 300000) {
        busquedasPendientes.delete(busquedaKey);
      }
    }, 300000);
    
    let mensaje = `📁 Se encontraron ${resultados.length} archivos:\n\n`;
    resultados.forEach((ruta, i) => {
      mensaje += `${i + 1}. ${ruta}\n`;
    });
    mensaje += `\n💡 Para seleccionar uno, usa:\n.mibotjs ${nombreArchivo} <número>\n\nEjemplo: .mibotjs ${nombreArchivo} 2`;
    
    return sock.sendMessage(from, { text: mensaje });
  }

  // Si solo hay un resultado, enviarlo directamente
  const archivoEnviar = resultados[0];
  return await enviarArchivo(sock, from, archivoEnviar);
}

// Función auxiliar para enviar archivos
async function enviarArchivo(sock, from, rutaArchivo) {
  try {
    const contenido = fs.readFileSync(rutaArchivo);
    const nombreFinal = path.basename(rutaArchivo);
    
    await sock.sendMessage(from, {
      document: contenido,
      fileName: nombreFinal,
      mimetype: "text/javascript",
      caption: `📄 Archivo: ${nombreFinal}\n📂 Ruta: ${rutaArchivo}\n📦 Tamaño: ${(contenido.length / 1024).toFixed(2)} KB`
    });

    await sock.sendMessage(from, { text: "✅ Archivo enviado correctamente." });
    
  } catch (e) {
    return sock.sendMessage(from, { 
      text: `❌ Error al enviar el archivo: ${e.message}` 
    });
  }
}
