// index.js
import fs from 'fs';
import path from 'path';

export const command = 'index'; // comando que no se usa directamente, solo para carga

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners
const owners = JSON.parse(fs.readFileSync('./owners.json', 'utf8'));
function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // 🔒 VERIFICACIÓN DE OWNER
  if (!esOwner(sender)) {
    await sock.sendMessage(from, { text: "❌ Solo los *owners* pueden usar este comando." }, { quoted: msg });
    return;
  }

  const comandosDir = './comandos';

  // Listar todos los comandos .js
  const archivos = fs.readdirSync(comandosDir).filter(f => f.endsWith('.js'));

  // .total
  if (args[0] === 'total') {
    await sock.sendMessage(from, { text: `📂 Total de comandos: ${archivos.length}` }, { quoted: msg });
    return;
  }

  // .comandos <número>
  if (args[0] === 'comandos') {
    const num = parseInt(args[1], 10);
    if (!num || num < 1 || num > archivos.length) {
      await sock.sendMessage(from, { text: `❌ Número inválido. Usa entre 1 y ${archivos.length}` }, { quoted: msg });
      return;
    }

    const archivoSeleccionado = archivos[num - 1];
    const ruta = path.join(comandosDir, archivoSeleccionado);
    const codigo = fs.readFileSync(ruta, 'utf-8');

    await sock.sendMessage(from, { text: `\`\`\`${codigo}\`\`\`` }, { quoted: msg });
    return;
  }

  // Mensaje de ayuda si no se entiende
  await sock.sendMessage(from, {
    text: "📌 Usa:\n.total → ver total de comandos\n.comandos <número> → ver código completo"
  }, { quoted: msg });
}
