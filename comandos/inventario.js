// comandos/inventario.js
import fs from "fs";

export const command = "inventario";

const inventarioFile = "./inventario.json";
const personajesFile = "./personajes.json";
const nombresPersonalizadosFile = "./nombres_personalizados.json";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar JSON
function cargarArchivo(file, defecto = {}) {
  if (!fs.existsSync(file)) return defecto;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  const inventario = cargarArchivo(inventarioFile);
  const personajes = cargarArchivo(personajesFile);
  const nombresPersonalizados = cargarArchivo(nombresPersonalizadosFile);

  if (!inventario[sender] || inventario[sender].length === 0) {
    return sock.sendMessage(
      from,
      { text: "❌ No tienes personajes en tu inventario." },
      { quoted: msg }
    );
  }

  let texto = "🎭 *Tus personajes:* \n\n";

  inventario[sender].forEach((nombreOriginal, i) => {
    const p = personajes[nombreOriginal];

    // 👉 nombre a mostrar (personalizado o normal)
    const nombreMostrar =
      nombresPersonalizados[sender]?.[nombreOriginal]?.nombrePersonalizado
        ? nombresPersonalizados[sender][nombreOriginal].nombrePersonalizado
        : nombreOriginal;

    if (p) {
      texto += `${i + 1}. ${nombreMostrar}\n`;
      texto += `💎 Precio: ${p.precio}\n`;
      texto += `⭐ Calidad: ${p.calidad}\n`;

      // Mostrar multiplicador si es mayor a 1
      if (p.multiplicador && p.multiplicador > 1) {
        texto += `⚡ Multiplicador: x${p.multiplicador}\n`;
      }

      texto += `\n`;
    } else {
      texto += `${i + 1}. ${nombreMostrar} (Información no disponible)\n\n`;
    }
  });

  sock.sendMessage(from, { text: texto }, { quoted: msg });
}
