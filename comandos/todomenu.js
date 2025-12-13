// comandos/todomenu.js
import fs from "fs";

export const command = "todomenu";

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
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden modificar el menú completo." }, { quoted: msg });
  }

  if (args.length === 0) {
    return sock.sendMessage(from, {
      text: "⚠️ Uso: .todomenu <nuevo texto del menú completo>\n\n⚠️ ADVERTENCIA: Esto reemplazará TODO el contenido del menú actual."
    }, { quoted: msg });
  }

  const nuevoMenu = args.join(" ");
  const menuPath = "./comandos/menu.js";

  // Leer el archivo actual
  let menuCode = fs.readFileSync(menuPath, "utf8");

  // Reemplazar solo el contenido de menuTexto, manteniendo la estructura del código
  const regex = /const menuTexto = `[\s\S]*?`;/;

  if (!regex.test(menuCode)) {
    return sock.sendMessage(from, { text: "❌ No se pudo encontrar la variable menuTexto en menu.js" }, { quoted: msg });
  }

  // Reemplazar el contenido del menú
  menuCode = menuCode.replace(regex, `const menuTexto = \`\n${nuevoMenu}\n\`;`);

  // Guardar el archivo modificado
  fs.writeFileSync(menuPath, menuCode, "utf8");

  return sock.sendMessage(from, {
    text: `✅ El menú ha sido completamente reemplazado.\n\n📝 Nuevo contenido (primeros 500 caracteres):\n\n${nuevoMenu.substring(0, 500)}${nuevoMenu.length > 500 ? "..." : ""}`
  }, { quoted: msg });
}
