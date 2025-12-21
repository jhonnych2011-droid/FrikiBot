export const command = "veradmin";

export async function run(sock, msg) {
  const gid = msg.key.remoteJid;

  if (!gid.endsWith("@g.us")) {
    return sock.sendMessage(gid, {
      text: "❌ Este comando solo funciona en grupos."
    });
  }

  const metadata = await sock.groupMetadata(gid);

  function normalize(id) {
    return id.replace("@lid", "@s.whatsapp.net");
  }

  const admins = metadata.participants.filter(p => p.admin);

  let menciones = [];
  let texto = "*Admins del Grupo:*\n\n";

  admins.forEach((p, i) => {
    const jid = normalize(p.id);
    menciones.push(jid);

    // Buscar nombre real del usuario
    const nombre =
      p.notify ||        // nombre principal
      p.verifiedName ||  // si tiene nombre verificado
      p.name ||          // nombre visible
      "Usuario";         // fallback

    const rol = p.admin === "superadmin" ? "superadmin" : "admin";

    texto += `${i + 1}. @⁨${nombre}⁩ (${rol})\n`;
  });

  await sock.sendMessage(gid, { text: texto, mentions: menciones });
}
