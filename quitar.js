import fs from "fs";

export const command = "quitar";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;

  // ================================
  // OBTENER OWNERS Y QUEDARSE SOLO CON NÚMEROS
  // ================================
  let owners = [];
  try {
    owners = JSON.parse(fs.readFileSync('./owners.json', 'utf8'))
      .map(o => o.replace(/[^0-9]/g, "")); // Solo números
  } catch {
    return sock.sendMessage(from, { text: "❌ No se pudo leer owners.json" }, { quoted: msg });
  }

  // ================================
  // ID del que envió el mensaje
  // ================================
  const sender = (msg.key.participant || msg.key.remoteJid).replace(/[^0-9]/g, "");

  if (!owners.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo los *owners* pueden usar este comando." }, { quoted: msg });
  }

  // ================================
  // PARÁMETROS
  // ================================
  const cantidad = parseInt(args[0]);
  const mencionado = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (!cantidad || cantidad <= 0) {
    return sock.sendMessage(from, { text: "❌ Usa: .quitar <cantidad> @usuario" }, { quoted: msg });
  }

  if (!mencionado) {
    return sock.sendMessage(from, { text: "❌ Debes mencionar a un usuario." }, { quoted: msg });
  }

  const userId = mencionado.replace(/[^0-9]/g, "");

  if (!geosDB[userId]) geosDB[userId] = 0;

  // ================================
  // QUITAR GEOS
  // ================================
  geosDB[userId] -= cantidad;
  if (geosDB[userId] < 0) geosDB[userId] = 0;

  // Guardar base
  fs.writeFileSync('./geos.json', JSON.stringify(geosDB, null, 2));

  // ================================
  // RESPUESTA
  // ================================
  await sock.sendMessage(from, {
    text: `✔️ Se le han quitado *${cantidad} geos* a @${userId}\n📉 Ahora tiene: *${geosDB[userId]} geos*`,
    mentions: [mencionado]
  }, { quoted: msg });
}
