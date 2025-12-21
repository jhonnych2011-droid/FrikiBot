// comandos/descripcionps.js
import fs from "fs";

export const command = "descripcionps";
export const isVIP = true;
export const requiredLevel = 1;

const inventarioFile = "./inventario.json";
const personajesFile = "./personajes.json";
const personalizacionesFile = "./personalizaciones.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function cargarArchivo(file, defecto = {}) {
  if (!fs.existsSync(file)) return defecto;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function guardarArchivo(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // 🔹 Unir todo el texto y separar por |
  const textoCompleto = args.join(" ");
  if (!textoCompleto.includes("|")) {
    return sock.sendMessage(
      from,
      { text: "⚠️ Uso correcto:\n.descripcionps <descripción> | <personaje>" },
      { quoted: msg }
    );
  }

  const [descripcionRaw, personajeRaw] = textoCompleto.split("|");

  const descripcion = descripcionRaw.trim();
  const nombrePersonaje = personajeRaw.trim();

  if (!descripcion || !nombrePersonaje) {
    return sock.sendMessage(
      from,
      { text: "❌ La descripción o el nombre del personaje están vacíos." },
      { quoted: msg }
    );
  }

  if (descripcion.length > 200) {
    return sock.sendMessage(
      from,
      { text: "❌ La descripción es demasiado larga (máx. 200 caracteres)." },
      { quoted: msg }
    );
  }

  const inventario = cargarArchivo(inventarioFile);
  const personajes = cargarArchivo(personajesFile);
  const personalizaciones = cargarArchivo(personalizacionesFile);

  // Verificar que el usuario tenga el personaje
  if (!inventario[sender] || !inventario[sender].includes(nombrePersonaje)) {
    return sock.sendMessage(
      from,
      { text: `❌ No tienes el personaje "${nombrePersonaje}" en tu inventario.` },
      { quoted: msg }
    );
  }

  // Verificar que el personaje exista
  if (!personajes[nombrePersonaje]) {
    return sock.sendMessage(
      from,
      { text: `❌ El personaje "${nombrePersonaje}" no existe en la base de datos.` },
      { quoted: msg }
    );
  }

  // Guardar descripción
  if (!personalizaciones[sender]) personalizaciones[sender] = {};
  if (!personalizaciones[sender][nombrePersonaje])
    personalizaciones[sender][nombrePersonaje] = {};

  personalizaciones[sender][nombrePersonaje].descripcion = descripcion;
  personalizaciones[sender][nombrePersonaje].timestamp = Date.now();

  guardarArchivo(personalizacionesFile, personalizaciones);

  await sock.sendMessage(
    from,
    {
      text:
        `✅ Descripción guardada correctamente\n\n` +
        `🎭 Personaje: *${nombrePersonaje}*\n` +
        `📝 "${descripcion}"`
    },
    { quoted: msg }
  );
}
