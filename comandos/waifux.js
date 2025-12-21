import fs from "fs";
import { sendSafe } from "../bot.js";

export const command = 'waifux';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // ┌────────────────────────────────────────┐
  // │ 🔞 VERIFICACIÓN DE BLOQUEO +18         │
  // └────────────────────────────────────────┘
  
  // Solo aplicar bloqueo en grupos
  if (from.endsWith("@g.us")) {
    let data = {};
    if (fs.existsSync("./+18grupos.json")) {
      data = JSON.parse(fs.readFileSync("./+18grupos.json", "utf8"));
    }

    // Si el grupo tiene +18 desactivado (true), bloquear comando
    if (data[from] === true) {
      return sendSafe(sock, from, { 
        text: "🔞 *COMANDO BLOQUEADO*\n\n" +
              "Los comandos +18 están desactivados en este grupo.\n\n" +
              "Un administrador puede activarlos con:\n" +
              "`.activar +18`" 
      });
    }
  }

  // ┌────────────────────────────────────────┐
  // │ 🎯 LÓGICA DEL COMANDO WAIFUX           │
  // └────────────────────────────────────────┘

  try {
    // Usamos 'nsfw' para contenido +18
    // Categorías disponibles: 'waifu', 'neko', 'trap', 'blowjob'
    const response = await fetch("https://api.waifu.pics/nsfw/waifu");
    
    if (!response.ok) throw new Error("Error con la API");

    const data = await response.json();
    const imageUrl = data.url;

    if (!imageUrl) throw new Error("No se encontró imagen");

    // Enviamos la imagen
    await sock.sendMessage(from, {
      image: { url: imageUrl },
      caption: `🔞 *Waifu NSFW*\n\nCochino de mrd`,
      // viewOnce: true // Descomenta si quieres que sea de "ver una vez"
    }, { quoted: msg });

  } catch (err) {
    console.error("Error en waifux:", err);
    await sock.sendMessage(from, { 
      text: "❌ Error al buscar la imagen. Intenta de nuevo." 
    }, { quoted: msg });
  }
}
