export const command = "asignaradmin";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Verificar si está en un grupo
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, {
      text: "❌ Este comando solo sirve en grupos."
    });
  }

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (!mentions[0]) {
    return sock.sendMessage(from, {
      text: "⚠️ Usa: .asignaradmin @usuario"
    }, { quoted: msg });
  }

  const target = mentions[0];

  // Verificar metadata
  const metadata = await sock.groupMetadata(from);

  // Verificar si el bot es admin
  const botId = msg.key.id || sock.user.id;
  const botJid = sock.user.id;

  const botInfo = metadata.participants.find(p => p.id === botJid);

  if (!botInfo || !botInfo.admin) {
    return sock.sendMessage(from, {
      text: "❌ No puedo asignar admin porque NO soy administrador."
    });
  }

  try {
    await sock.groupParticipantsUpdate(from, [target], "promote");

    await sock.sendMessage(from, {
      text: `✅ @${target.split("@")[0]} ahora es *admin*. 🎉`,
      mentions: [target]
    });

  } catch (e) {
    await sock.sendMessage(from, {
      text: "❌ No se pudo asignar admin. Puede que el usuario ya sea admin o no tenga permisos."
    });
  }
}
