// comandos/ep.js
import fetch from "node-fetch";

export const command = "ep";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (!args[0]) {
    await sock.sendMessage(from, { text: "❗ Usa: .ep <anime>" });
    return;
  }

  const query = args.join(" ");
  const url = `https://anime-api-seven.vercel.app/search?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);

    if (!res.ok) throw new Error("Proxy no responde");

    const data = await res.json();

    if (!data || !data.episodes || data.episodes.length === 0) {
      await sock.sendMessage(from, { text: "❌ No encontré episodios." });
      return;
    }

    const ep = data.episodes[0]; // primer episodio disponible

    await sock.sendMessage(from, {
      video: { url: ep.video },
      caption: `📺 *${data.title}*\n🎬 Episodio: ${ep.number}`
    });

  } catch (e) {
    await sock.sendMessage(from, {
      text: "❌ Error al obtener el episodio.\nDetalles:\n" + e.message
    });
  }
}
