import fetch from "node-fetch"

export const command = "pinterest"
export const desc = "Busca imágenes reales de Pinterest"
export const category = "busqueda"
export const isVIP = false

// Tu API key de soymaycol.icu
const API_KEY = "may-8f391d73"

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { sendSafe }) {
  const from = msg.key.remoteJid

  if (!args.length) {
    return sendSafe(sock, from, {
      text: "📌 Uso:\n.pinterest <texto>\nEjemplo:\n.pinterest gato kawaii"
    })
  }

  const query = args.join(" ")

  try {
    await sock.sendMessage(from, {
      react: { text: "🔎", key: msg.key }
    })

    // Construir la URL de la API (buscando por texto)
    const apiUrl = `https://api.soymaycol.icu/pinterest?query=${encodeURIComponent(query)}&apikey=${API_KEY}`

    const res = await fetch(apiUrl)
    const json = await res.json()

    if (!json || !json.result || !json.result.length) {
      return sendSafe(sock, from, {
        text: "❌ No se encontraron imágenes."
      })
    }

    // La primera imagen de la lista
    const imageUrl = json.result[0]

    await sendSafe(sock, from, {
      image: { url: imageUrl },
      caption: `📌 *Pinterest* — ${query}`
    })

  } catch (e) {
    console.error("Pinterest API error:", e)
    await sendSafe(sock, from, {
      text: "❌ Error al buscar la imagen."
    })
  }
}
