import fs from "fs";

export const command = "fixgeos";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  const path = "./geos.json";

  if (!fs.existsSync(path)) {
    return sock.sendMessage(from, { text: "❌ No existe geos.json" }, { quoted: msg });
  }

  let raw = fs.readFileSync(path, "utf8");

  // Intentar leer normalmente
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    // Si está roto → intentar reparar lo básico
    raw = raw.trim();

    // Si falta llave final, agregarla
    if (!raw.endsWith("}")) raw += "}";

    // Si falta llave inicial, agregarla
    if (!raw.startsWith("{")) raw = "{" + raw;

    try {
      data = JSON.parse(raw);
    } catch (err) {
      return sock.sendMessage(from, {
        text: "❌ No se pudo reparar automáticamente. Revisa el JSON manualmente."
      }, { quoted: msg });
    }
  }

  // Asegurar que cada usuario tenga los campos correctos
  let cambiado = false;

  for (const user in data) {
    const u = data[user];

    if (!u.geos) { u.geos = 0; cambiado = true; }
    if (!u.lastMinar) { u.lastMinar = 0; cambiado = true; }
    if (!u.cooldownRobar) { u.cooldownRobar = 0; cambiado = true; }
    if (!u.personajes) { u.personajes = []; cambiado = true; }
  }

  // Guardar archivo reparado
  fs.writeFileSync(path, JSON.stringify(data, null, 2));

  sock.sendMessage(from, {
    text:
      cambiado
        ? "🔧 *geos.json reparado con éxito*\nTodos los campos faltantes fueron añadidos."
        : "✔ geos.json ya estaba correcto. No se hicieron cambios."
  }, { quoted: msg });
}
