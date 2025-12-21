import axios from "axios";

export const command = "waifu";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  try {
    const { data } = await axios.get(
      "https://api.waifu.pics/sfw/waifu"
    );

    if (!data?.url) throw new Error("Sin imagen");

    await sock.sendMessage(from, {
      image: { url: data.url },
      caption: "✨ Aquí está tu waifu ✨"
    }, { quoted: msg });

  } catch (err) {
    console.error("Error waifu:", err);
    await sock.sendMessage(from, {
      text: "💔 Error: No pude traer a la waifu."
    }, { quoted: msg });
  }
}
