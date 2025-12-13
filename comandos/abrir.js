// comandos/abrir.js
export const command = "abrir";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  try {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });
    }

    const metadata = await sock.groupMetadata(from);

    // Verificar si el usuario es admin
    const isAdmin = metadata.participants.some(
      (u) => u.id === sender && (u.admin === "admin" || u.admin === "superadmin")
    );

    if (!isAdmin) {
      return sock.sendMessage(from, { text: "❌ Solo un administrador puede usar este comando." });
    }

    // Verificar si el bot es admin
    const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const botAdmin = metadata.participants.some(
      (u) => u.id === botNumber && (u.admin === "admin" || u.admin === "superadmin")
    );

    if (!botAdmin) {
      return sock.sendMessage(from, { text: "❌ Necesito ser administrador para abrir el grupo." });
    }

    // Abrir el grupo
    await sock.groupSettingUpdate(from, "not_announcement");

    await sock.sendMessage(from, {
      text: "🔓 *Grupo abierto*\nTodos pueden enviar mensajes nuevamente."
    });

  } catch (e) {
    console.error(e);
    sock.sendMessage(from, { text: "❌ Error al abrir el grupo." });
  }
}
