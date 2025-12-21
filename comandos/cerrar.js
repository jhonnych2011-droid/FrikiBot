// comandos/cerrar.js
import fs from "fs";

export const command = "cerrar";

// Convierte cualquier @s.whatsapp.net -> @lid
function fixID(jid) {
  if (!jid) return "";
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  // ID del que ejecuta
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // ID del bot
  const botId = fixID(sock.user.id);

  try {
    // Obtener metadata
    const metadata = await sock.groupMetadata(from);

    // Lista real de admins
    const admins = metadata.participants
      .filter(p => p.admin)
      .map(p => fixID(p.id));

    // 1. Verificar si el bot es admin
    if (!admins.includes(botId)) {
      return sock.sendMessage(from, { text: "❌ *No soy administrador del grupo.*\nNo puedo cerrarlo." });
    }

    // 2. Verificar si el usuario que ejecuta es admin
    if (!admins.includes(sender)) {
      return sock.sendMessage(from, { text: "❌ *Este comando es solo para administradores.*" });
    }

    // 3. Cerrar el grupo
    await sock.groupSettingUpdate(from, "announcement");

    return sock.sendMessage(from, { text: "🔒 *El grupo ha sido cerrado.*\nSolo administradores pueden escribir." });

  } catch (e) {
    console.log("Error en cerrar:", e);
    return sock.sendMessage(from, { text: "❌ Ocurrió un error cerrando el grupo." });
  }
}
