// comandos/chatgpt.js
import fs from "fs";
import fetch from "node-fetch";

export const command = "chatgpt";

// Archivo para guardar historial
const historialFile = "./data/chatgpt_historial.json";

// Cargar historial desde archivo
function cargarHistorial() {
  if (!fs.existsSync(historialFile)) fs.writeFileSync(historialFile, "{}");
  return JSON.parse(fs.readFileSync(historialFile, "utf8"));
}

// Guardar historial en archivo
function guardarHistorial(historial) {
  fs.writeFileSync(historialFile, JSON.stringify(historial, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const userId = msg.key.participant || from;
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

  if (!text.startsWith(".chatgpt")) return;

  const pregunta = text.replace(".chatgpt", "").trim();
  if (!pregunta) {
    return sock.sendMessage(from, { text: "⚠️ Debes escribir algo para preguntar a ChatGPT." }, { quoted: msg });
  }

  // Cargar historial
  const historial = cargarHistorial();
  if (!historial[userId]) historial[userId] = [];
  
  // Añadir la pregunta al historial
  historial[userId].push({ role: "user", content: pregunta });

  const apiKey = "d30666dac75e5532";
  const system = "Actúa como un asistente amigable y responde concisamente";

  const url = `https://loveapi-tools.miangel.dev/api/v1/chat?prompt=${encodeURIComponent(JSON.stringify(historial[userId]))}&system=${encodeURIComponent(system)}&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const reply = data.response || "⚠️ No obtuve respuesta del API.";

    // Añadir la respuesta al historial
    historial[userId].push({ role: "assistant", content: reply });

    // Guardar historial
    guardarHistorial(historial);

    // Enviar respuesta
    await sock.sendMessage(from, { text: reply }, { quoted: msg });
  } catch (err) {
    console.error("❌ Error en .chatgpt:", err);
    await sock.sendMessage(from, { text: "❌ Ocurrió un error al comunicarse con ChatGPT." }, { quoted: msg });
  }
}
