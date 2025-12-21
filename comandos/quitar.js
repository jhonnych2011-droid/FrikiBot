export const command = "quitar";

import fs from "fs";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  // ===============================
  // 🔐 SOLO OWNERS
  // ===============================
  const ownersRaw = JSON.parse(fs.readFileSync('./owners.json', 'utf8'));

  // Convertir owners a solo números (sin @s.whatsapp.net ni @lid)
  const owners = ownersRaw.map(id => id.replace(/@.*/, ""));

  // Extraer número limpio del autor
  const authorClean = author.replace(/@.*/, "");

  if (!owners.includes(authorClean)) {
    return sock.sendMessage(from, { text: "❌ Solo los *owners* pueden usar este comando." }, { quoted: msg });
  }

  // ===============================
  // 🧩 Validación de argumentos
  // ===============================
  if (args.length < 2 || !msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .quitar <cantidad> @usuario" }, { quoted: msg });
  }

  const cantidad = parseInt(args[0]);
  if (isNaN(cantidad) || cantidad <= 0) {
    return sock.sendMessage(from, { text: "⚠️ Cantidad inválida." }, { quoted: msg });
  }

  // Usuario mencionado
  const objetivo = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

  // Crear perfil si no existe
  if (!geosDB[objetivo]) geosDB[objetivo] = { geos: 0 };

  // ===============================
  // 🔥 RESTAR GEOS
  // ===============================
  const geosActuales = geosDB[objetivo].geos;

  if (cantidad >= geosActuales) {
    geosDB[objetivo].geos = 0;
  } else {
    geosDB[objetivo].geos -= cantidad;
  }

  // ===============================
  // 💾 Guardar cambios
  // ===============================
  fs.writeFileSync('./geos.json', JSON.stringify(geosDB, null, 2));

  // ===============================
  // 📢 Respuesta
  // ===============================
  const nuevo = geosDB[objetivo].geos;

  await sock.sendMessage(from, {
    text: `➖ Se quitaron *${cantidad} geos*\n👤 Usuario: @${objetivo.replace(/@.*/, "")}\n💰 Nuevo total: *${nuevo} geos*`,
    mentions: [objetivo]
  }, { quoted: msg });
}
