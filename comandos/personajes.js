// comandos/personajes.js
import fs from "fs";

export const command = "personajes";

const personajesPath = "./personajes.json";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  // Crear archivo si no existe
  if (!fs.existsSync(personajesPath)) {
    fs.writeFileSync(personajesPath, JSON.stringify({}, null, 2));
  }

  let personajes;
  try {
    personajes = JSON.parse(fs.readFileSync(personajesPath, "utf8"));
  } catch (e) {
    personajes = {};
    fs.writeFileSync(personajesPath, JSON.stringify({}, null, 2));
  }

  const disponibles = Object.entries(personajes).filter(([_, data]) => data.stock > 0);

  if (disponibles.length === 0) {
    return sock.sendMessage(from, { text: "📭 No hay personajes disponibles en este momento." });
  }

  let texto = "🎭 *PERSONAJES DISPONIBLES*\n\n";

  for (const [nombre, data] of disponibles) {
    texto += `👤 *${nombre}*\n`;
    texto += `💎 Precio: ${data.precio}\n`;
    texto += `📦 Stock: ${data.stock}\n`;
    texto += `⭐ Calidad: ${data.calidad}\n`;

    if (data.multiplicador && data.multiplicador > 1) {
      texto += `⚡ Multiplicador: x${data.multiplicador}\n`;
    }

    // 🔥 NUEVO: Mostrar límite por persona si existe
    if (data.limite !== null && data.limite !== undefined) {
      texto += `🔒 Límite por persona: ${data.limite}\n`;
    }

    texto += "\n";
  }

  await sock.sendMessage(from, { text: texto });
}
