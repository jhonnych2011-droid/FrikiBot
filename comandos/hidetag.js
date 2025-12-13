export const command = "hidetag";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo funciona en grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, {
      text: "❌ Este comando solo funciona en grupos."
    }, { quoted: msg });
  }

  // Obtener metadata del grupo
  const metadata = await sock.groupMetadata(from);
  const participantes = metadata.participants;

  // ID del que ejecutó el comando
  const user = msg.key.participant || msg.key.remoteJid;

  // Verificación admin
  const isAdmin = participantes.some(p =>
    p.id === user && (p.admin === "admin" || p.admin === "superadmin")
  );

  if (!isAdmin) {
    return sock.sendMessage(from, {
      text: "❌ Solo los administradores pueden usar este comando."
    }, { quoted: msg });
  }

  // Texto del mensaje
  const texto = args.join(" ");
  if (!texto) {
    return sock.sendMessage(from, {
      text: "❌ Usa: .hidetag {mensaje}"
    }, { quoted: msg });
  }

  try {
    const ids = participantes.map(p => p.id);

    // Enviar mensaje citando y mencionando
    await sock.sendMessage(from, {
      text: texto,
      mentions: ids
    }, { quoted: msg }); // 🔥 AQUÍ está la diferencia

  } catch (err) {
    console.error("❌ Error en hidetag:", err);
    await sock.sendMessage(from, {
      text: "❌ Ocurrió un error al ejecutar el comando."
    }, { quoted: msg });
  }
}
