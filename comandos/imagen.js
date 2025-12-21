import fetch from "node-fetch"

export const command = "imagen"
export const desc = "Genera imágenes con Gemini"
export const category = "ia"
export const isVIP = false // pon true si quieres que sea VIP

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { sendSafe }) {
  const from = msg.key.remoteJid

  if (!args.length) {
    return sendSafe(sock, from, {
      text: "🖼️ *Generador de imágenes (Gemini)*\n\n" +
            "Uso:\n" +
            ".imagen un dragón cyberpunk volando sobre una ciudad"
    })
  }

  const prompt = args.join(" ")
  const API_KEY = process.env.GEMINI_API_KEY || "TU_API_KEY_AQUI"

  try {
    // Reacción mientras genera
    await sock.sendMessage(from, {
      react: { text: "🎨", key: msg.key }
    })

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate an image of: ${prompt}`
            }]
          }]
        })
      }
    )

    const json = await res.json()

    /*
      ⚠️ Gemini NO devuelve la imagen directa
      Devuelve descripción → usamos una imagen generada vía pollinations
    */

    const description =
      json?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!description) {
      return sendSafe(sock, from, { text: "❌ Gemini no devolvió resultado." })
    }

    // Generador de imagen (gratis)
    const imageUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(description)}`

    await sendSafe(sock, from, {
      image: { url: imageUrl },
      caption:
        "🎨 *Imagen generada*\n\n" +
        `🧠 Prompt:\n${prompt}\n\n` +
        "⚡ Powered by Gemini"
    })

  } catch (e) {
    console.error("Imagen Gemini error:", e)
    await sendSafe(sock, from, {
      text: "❌ Error al generar la imagen."
    })
  }
}
