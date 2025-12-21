import axios from "axios";

export const command = "ai";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (args.length === 0) {
    await sock.sendMessage(from, {
      text: "⚠️ Uso: .ai <pregunta>\nEjemplo: .ai ¿Qué es la inteligencia artificial?"
    }, { quoted: msg });
    return;
  }

  const question = args.join(" ");

  try {
    await sock.sendMessage(from, {
      text: "🤖 Pensando..."
    }, { quoted: msg });

    // Llamar a la API de Claude
    const apiUrl = `https://api.soymaycol.icu/ai-claude?q=${encodeURIComponent(question)}&apikey=may-8f391d73`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (!data || !data.response) {
      await sock.sendMessage(from, {
        text: "❌ No se pudo obtener una respuesta de la IA."
      }, { quoted: msg });
      return;
    }

    const aiResponse = data.response;

    // Enviar la respuesta
    await sock.sendMessage(from, {
      text: `🤖 *Claude AI*\n\n${aiResponse}`
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error al consultar la IA:", err);
    await sock.sendMessage(from, {
      text: `❌ Error al consultar la IA: ${err.message}`
    }, { quoted: msg });
  }
}
