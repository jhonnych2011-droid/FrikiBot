import fs from "fs";
import { sendSafe } from "../bot.js";

export const command = 'desactivar+18';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // ┌──────────────────────────────────────────┐
  // │ 👑 VERIFICAR PERMISOS (OWNER O ADMIN)    │
  // └──────────────────────────────────────────┘
  
  let isOwner = false;
  let isAdmin = false;

  // Verificar si es owner
  if (fs.existsSync("./owners.json")) {
    const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
    const senderLid = sender.split("@")[0] + "@lid";
    isOwner = owners.includes(senderLid) || owners.includes(sender);
  }

  // Si es grupo, verificar si es admin
  if (from.endsWith("@g.us")) {
    try {
      const groupMetadata = await sock.groupMetadata(from);
      const participants = groupMetadata.participants;
      const participant = participants.find(p => p.id === sender);
      isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    } catch (err) {
      console.error("Error al verificar admin:", err);
    }
  }

  // Denegar si no es owner ni admin
  if (!isOwner && !isAdmin) {
    return sendSafe(sock, from, { 
      text: "❌ *ACCESO DENEGADO*\n\n" +
            "Solo owners del bot o administradores del grupo pueden activar/desactivar comandos +18." 
    });
  }

  // ┌──────────────────────────────────────────┐
  // │ 🔒 DESACTIVAR COMANDOS +18               │
  // └──────────────────────────────────────────┘

  try {
    // Leer o crear archivo de configuración
    let data = {};
    if (fs.existsSync("./+18grupos.json")) {
      data = JSON.parse(fs.readFileSync("./+18grupos.json", "utf8"));
    }

    // Desactivar +18 (true = desactivado, false = activado)
    data[from] = true;
    fs.writeFileSync("./+18grupos.json", JSON.stringify(data, null, 2));

    const role = isOwner ? "👑 Owner" : "🛡️ Admin";
    
    await sendSafe(sock, from, { 
      text: `🔒 *COMANDOS +18 DESACTIVADOS*\n\n` +
            `Desactivado por: ${role}\n\n` +
            `Los comandos para adultos han sido bloqueados en este chat.\n\n` +
            `✅ El chat ahora es más seguro para todos.\n\n` +
            `Para activar usa: \`.activar+18\``
    });

  } catch (err) {
    console.error("Error en desactivar+18:", err);
    await sendSafe(sock, from, { 
      text: "❌ Error al desactivar comandos +18. Intenta de nuevo." 
    });
  }
}
