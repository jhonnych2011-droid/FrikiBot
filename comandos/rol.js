// comandos/rol.js
import fs from "fs";
import fetch from "node-fetch";

export const command = "rol";

const historialFile = "./data/rol_historial.json";

function cargarHistorial() {
  if (!fs.existsSync(historialFile)) fs.writeFileSync(historialFile, "{}");
  return JSON.parse(fs.readFileSync(historialFile, "utf8"));
}

function guardarHistorial(historial) {
  fs.writeFileSync(historialFile, JSON.stringify(historial, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const userId = msg.key.participant || from;

  const mensaje = args.join(" ");
  if (!mensaje)
    return sock.sendMessage(from, { text: "⚠️ Uso: .rol <mensaje>" }, { quoted: msg });

  // Verificar personaje elegido
  const eleccionesFile = "./data/elecciones_rol.json";
  if (!fs.existsSync(eleccionesFile))
    return sock.sendMessage(from, { text: "⚠️ No has elegido un rol." }, { quoted: msg });

  const elecciones = JSON.parse(fs.readFileSync(eleccionesFile));
  if (!elecciones[userId])
    return sock.sendMessage(from, { text: "❌ Primero usa: .elegirrol <nombre>" }, { quoted: msg });

  const personaje = elecciones[userId];

  // Cargar roles
  const roles = JSON.parse(fs.readFileSync("./data/roles.json"));
  const rolData = roles[personaje];

  // Cargar historial
  const historial = cargarHistorial();

  if (!historial[userId]) historial[userId] = [];

  // Agregar el mensaje del usuario al historial
  historial[userId].push({
    tipo: "user",
    texto: mensaje
  });

  // Convertir historial a texto plano para la API
  const historialTexto = historial[userId]
    .map(e =>
      e.tipo === "system"
        ? `SISTEMA: ${e.texto}`
        : e.tipo === "assistant"
        ? `${rolData.nombre}: ${e.texto}`
        : `Usuario: ${e.texto}`
    )
    .join("\n");

  // Mensaje de sistema: personalidad del personaje
  const system = `Actúa como el personaje ${rolData.nombre}. Responde exactamente como él respondería, con su tono, personalidad, emociones y forma de hablar. No parezcas una IA.`;

  // Llamada al API
  const apiKey = "d30666dac75e5532";
  const url = `https://loveapi-tools.miangel.dev/api/v1/chat?prompt=${encodeURIComponent(historialTexto)}&system=${encodeURIComponent(system)}&api_key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const reply = data.response || "⚠️ No obtuve respuesta del API.";

    // Guardar respuesta en historial
    historial[userId].push({
      tipo: "assistant",
      texto: reply
    });

    guardarHistorial(historial);

    // Enviar mensaje
    await sock.sendMessage(
      from,
      {
        image: { url: rolData.url },
        caption: `🗨️ *${rolData.nombre}:*\n${reply}`
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error("❌ Error en .rol:", err);
    sock.sendMessage(from, { text: "❌ Error procesando el rol." }, { quoted: msg });
  }
}
