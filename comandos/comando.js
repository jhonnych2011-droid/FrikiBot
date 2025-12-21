// comandos/comando.js
import fs from "fs";
import path from "path";

export const command = "comando";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden usar este comando." }, { quoted: msg });
  }

  if (!args.length) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .comando <nombre del comando>" }, { quoted: msg });
  }

  const nombreCmd = args[0].toLowerCase();
  const comandosDir = "./comandos";
  const archivoPath = path.join(comandosDir, `${nombreCmd}.js`);

  if (!fs.existsSync(archivoPath)) {
    return sock.sendMessage(from, { text: `❌ No se encontró el comando "${nombreCmd}".` }, { quoted: msg });
  }

  try {
    // Leer archivo como buffer binario
    const buffer = fs.readFileSync(archivoPath);
    const nombreArchivo = `${nombreCmd}_preservado.txt`;
    
    // OPCIÓN A: Enviar directamente como archivo
    await sock.sendMessage(from, {
      document: buffer,
      mimetype: "text/plain; charset=utf-8", // Especificar charset UTF-8
      fileName: nombreArchivo,
      caption: `📁 Comando: ${nombreCmd}\n✅ Emojis preservados`
    }, { quoted: msg });

  } catch (err) {
    console.error("Error:", err);
    
    // OPCIÓN B: Si falla, convertir a base64 y enviar como enlace
    try {
      const buffer = fs.readFileSync(archivoPath);
      const base64 = buffer.toString('base64');
      
      // Crear un archivo temporal
      const tempFile = `./temp_${nombreCmd}.txt`;
      fs.writeFileSync(tempFile, buffer);
      
      await sock.sendMessage(from, {
        document: fs.readFileSync(tempFile),
        mimetype: "text/plain",
        fileName: `${nombreCmd}_base64.txt`
      }, { quoted: msg });
      
      // Limpiar archivo temporal
      setTimeout(() => {
        try { fs.unlinkSync(tempFile); } catch {}
      }, 5000);
      
    } catch (error2) {
      await sock.sendMessage(from, { 
        text: "❌ Error crítico al procesar el archivo." 
      }, { quoted: msg });
    }
  }
}
