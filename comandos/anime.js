import fetch from "node-fetch";

export const command = "anime";

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const query = args.join(" ");

    if (!query) {
        await sock.sendMessage(from, { text: "❌ Usa: .anime <nombre>" });
        return;
    }

    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`);
        const jikan = await res.json();

        if (!jikan.data || jikan.data.length === 0) {
            await sock.sendMessage(from, { text: "⚠️ No encontré ese anime." });
            return;
        }

        const anime = jikan.data[0];

        const epsRes = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/episodes`);
        const epsData = await epsRes.json();

        let txt = `🎬 *${anime.title}*\n\nSelecciona episodio:\n\n`;

        epsData.data.forEach(ep => {
            txt += `• Ep ${ep.mal_id} → .ep ${anime.title} ${ep.mal_id}\n`;
        });

        await sock.sendMessage(from, {
            image: { url: anime.images.jpg.image_url },
            caption: txt
        });

    } catch (e) {
        console.log(e);
        await sock.sendMessage(from, { text: "❌ Error al buscar anime." });
    }
}
