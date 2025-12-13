export const command = "pfp";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Verifica que haya alguien etiquetado
  const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (!mencionados || mencionados.length === 0) {
    return sock.sendMessage(from, { 
      text: "❌ Debes etiquetar a alguien: ejemplo * .pfp @usuario *" 
    }, { quoted: msg });
  }

  const user = mencionados[0]; // Primer usuario etiquetado

  try {
    // Obtiene la URL de la foto de perfil
    const ppUrl = await sock.profilePictureUrl(user, "image").catch(() => null);

    if (!ppUrl) {
      return sock.sendMessage(from, { 
        text: "❌ No se pudo obtener la foto de perfil de ese usuario." 
      }, { quoted: msg });
    }

    // Envía la foto
    await sock.sendMessage(from, { 
      image: { url: ppUrl },
      caption: `🖼️ Foto de perfil de @${user.split("@")[0]}`,
      mentions: [user]
    }, { quoted: msg });

  } catch (e) {
    console.log(e);
    return sock.sendMessage(from, { 
      text: "❌ Ocurrió un error al obtener la foto de perfil." 
    }, { quoted: msg });
  }
}
