// comandos/añadirmenu.js
import fs from "fs";

export const command = "añadirmenu";

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
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden modificar el menú." }, { quoted: msg });
  }

  if (args.length < 2) {
    return sock.sendMessage(from, {
      text: `⚠️ Uso: .añadirmenu <categoría> <texto>\n\nCategorías disponibles:\n- RPG\n- APUESTA\n- CLUBS\n- RECOMPENSAS\n- UTILES\n- PERSONAJES\n- AUDIO\n- OWNERS`
    }, { quoted: msg });
  }

  const categoria = args[0].toUpperCase();
  const textoNuevo = args.slice(1).join(" ");

  // Mapeo de categorías a sus emojis y nombre completo
  const categorias = {
    "RPG": "🎮MENÚ RPG:",
    "APUESTA": "🎰Apuesta:",
    "CLUBS": "🏰Clubs:",
    "RECOMPENSAS": "📆Recompensas Mensuales:",
    "UTILES": "🔧Útiles:",
    "PERSONAJES": "👤personajes:",
    "AUDIO": "🎧Audio y Video:",
    "OWNERS": "👨🏿‍💻Owners:"
  };

  if (!categorias[categoria]) {
    return sock.sendMessage(from, {
      text: `❌ Categoría inválida. Usa una de estas:\n${Object.keys(categorias).join(", ")}`
    }, { quoted: msg });
  }

  const menuPath = "./comandos/menu.js";
  let menuCode = fs.readFileSync(menuPath, "utf8");

  // Buscar la categoría en el código
  const categoriaCompleta = categorias[categoria];
  const regex = new RegExp(`(${categoriaCompleta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n\\n[🎮🎰🏰📆🔧👤🎧👨🏿‍💻]|\\n\`|$)`);

  if (!regex.test(menuCode)) {
    return sock.sendMessage(from, { text: `❌ No se encontró la categoría "${categoria}" en el menú.` }, { quoted: msg });
  }

  // Añadir el nuevo texto al final de esa categoría
  menuCode = menuCode.replace(regex, (match) => {
    return match.trimEnd() + `\n\n${textoNuevo}`;
  });

  // Guardar el archivo modificado
  fs.writeFileSync(menuPath, menuCode, "utf8");

  return sock.sendMessage(from, {
    text: `✅ Texto añadido exitosamente a la categoría *${categoria}*:\n\n${textoNuevo}`
  }, { quoted: msg });
}
